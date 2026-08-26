import * as snarkjs from "../main.js";
import { getCurveFromName } from "../src/curves.js";
import assert from "assert";
import path from "path";
import http from "http";

// End-to-end: groth16.prove with the zkey addressed by URL. With a
// range-capable server (any CDN) the prover streams the zkey chunk-by-chunk
// through fastfile's http backend -- the point sections are never resident as
// a whole -- and with a range-less server it falls back to buffering the full
// body, matching the historical browser behavior. Both must yield a proof
// that verifies.
//
// Both ptau and zkey get an entropy contribution: an uncontributed setup
// (tau = 1) makes many corruptions self-cancel, so a transport bug could
// otherwise still produce a "valid" proof.
describe("Groth16 proving from a zkey served over HTTP", function () {

    let curve;
    const ptau_0 = {type: "mem"};
    const ptau_1 = {type: "mem"};
    const ptau_final = {type: "mem"};
    const zkey_0 = {type: "mem"};
    const zkey_final = {type: "mem"};
    const wtns = {type: "mem"};
    let vKey;

    // Minimal static file server; withRanges=false ignores Range headers.
    function serve(data, withRanges) {
        const log = { requests: [], maxResponse: 0 };
        const server = http.createServer((req, res) => {
            log.requests.push({ range: req.headers.range || null });
            const m = withRanges && req.headers.range ?
                /^bytes=(\d+)-(\d+)$/.exec(req.headers.range) : null;
            let body;
            if (m) {
                const start = parseInt(m[1]);
                const end = Math.min(parseInt(m[2]), data.length - 1);
                body = Buffer.from(data.slice(start, end + 1));
                res.writeHead(206, {
                    "Content-Range": `bytes ${start}-${end}/${data.length}`,
                    "Content-Length": body.length,
                    "ETag": "\"zkey-v1\"",
                    "Accept-Ranges": "bytes",
                });
            } else {
                body = Buffer.from(data);
                res.writeHead(200, { "Content-Length": body.length });
            }
            log.maxResponse = Math.max(log.maxResponse, body.length);
            res.end(body);
        });
        return new Promise((resolve) => {
            server.listen(0, "127.0.0.1", () => resolve({
                url: `http://127.0.0.1:${server.address().port}/circuit_final.zkey`,
                log,
                close: () => new Promise((r) => server.close(r)),
            }));
        });
    }

    beforeAll(async () => {
        curve = await getCurveFromName("bn128");
        await snarkjs.powersOfTau.newAccumulator(curve, 10, ptau_0);
        await snarkjs.powersOfTau.contribute(ptau_0, ptau_1, "C1", "http e2e entropy 1");
        await snarkjs.powersOfTau.preparePhase2(ptau_1, ptau_final);
        await snarkjs.zKey.newZKey(path.join("test", "groth16", "circuit.r1cs"), ptau_final, zkey_0);
        await snarkjs.zKey.contribute(zkey_0, zkey_final, "p2_C1", "http e2e entropy 2");
        vKey = await snarkjs.zKey.exportVerificationKey(zkey_final);
        await snarkjs.wtns.calculate({a: 11, b: 2}, path.join("test", "groth16", "circuit.wasm"), wtns);
    });

    afterAll(async () => {
        await curve.terminate();
    });

    it("streams the zkey via Range requests and the proof verifies", async () => {
        const srv = await serve(zkey_final.data, true);
        try {
            const { proof, publicSignals } = await snarkjs.groth16.prove(srv.url, wtns);
            assert(await snarkjs.groth16.verify(vKey, publicSignals, proof));
            assert(srv.log.requests.length > 1, "expected chunked access, got a single request");
            for (const r of srv.log.requests) {
                assert.ok(r.range, "expected only Range requests, saw a full GET");
            }
            // Streaming means no response body ever carries the whole zkey:
            // header reads come as (<= 64 KiB) cache pages, section reads as
            // per-chunk ranges. This fixture's zkey (~465 KiB) is comfortably
            // above the page cap, so a whole-file response would only mean the
            // http backend regressed to buffering.
            assert(srv.log.maxResponse < zkey_final.data.length,
                "a single response carried the whole zkey");
        } finally {
            await srv.close();
        }
    });

    it("falls back to full buffering when the server lacks Range support", async () => {
        const srv = await serve(zkey_final.data, false);
        try {
            const { proof, publicSignals } = await snarkjs.groth16.prove(srv.url, wtns);
            assert(await snarkjs.groth16.verify(vKey, publicSignals, proof));
            assert.strictEqual(srv.log.requests.length, 1);
        } finally {
            await srv.close();
        }
    });
});
