import * as snarkjs from "../main.js";
import { getCurveFromName } from "../src/curves.js";
import assert from "assert";
import fs from "fs";
import path from "path";
import url from "url";

// Concurrency and memory-retention checks on groth16.verify, which runs
// entirely on the shared cached curve: concurrent verifies must not corrupt
// the main-thread wasm scratch (the sync-op regions are await-free and thus
// atomic), error paths must not wedge shared state, and repeated verifies
// must not grow the curve's bump allocator or the process RSS.

const FIX = path.join(path.dirname(url.fileURLToPath(import.meta.url)), "verify_fixtures");
const readJson = (n) => JSON.parse(fs.readFileSync(path.join(FIX, n), "utf8"));

describe("groth16 verify: concurrency and memory retention", function () {
    let vkey, proof, publicSignals, badProof, badSignals;

    beforeAll(async () => {
        vkey = await snarkjs.zKey.exportVerificationKey(path.join(FIX, "groth16.zkey"));
        proof = readJson("groth16.proof.json");
        publicSignals = readJson("groth16.public.json");
        badProof = JSON.parse(JSON.stringify(proof));
        // corrupt pi_a.x: still a decimal string, almost surely off-curve
        badProof.pi_a[0] = (BigInt(badProof.pi_a[0]) ^ 0xffn).toString();
        badSignals = ["21888242871839275222246405745257275088548364400416034343698204186575808495617"]; // == r, out of field
    });

    it("32 concurrent verifies on the shared curve all succeed", async () => {
        const results = await Promise.all(
            Array.from({ length: 32 }, () => snarkjs.groth16.verify(vkey, publicSignals, proof)));
        assert(results.every((r) => r === true));
    });

    it("interleaved valid/invalid verifies stay correct (no wedged shared state)", async () => {
        const jobs = [];
        for (let i = 0; i < 12; i++) {
            jobs.push(snarkjs.groth16.verify(vkey, publicSignals, proof).then((r) => ({ i, kind: "ok", r })));
            jobs.push(snarkjs.groth16.verify(vkey, publicSignals, badProof).then((r) => ({ i, kind: "badproof", r })));
            jobs.push(snarkjs.groth16.verify(vkey, badSignals, proof).then((r) => ({ i, kind: "badpub", r })));
        }
        for (const j of await Promise.all(jobs)) {
            assert.strictEqual(j.r, j.kind === "ok", `${j.kind} #${j.i} returned ${j.r}`);
        }
        // and a clean verify still works after all the failures
        assert.strictEqual(await snarkjs.groth16.verify(vkey, publicSignals, proof), true);
    });

    it("repeated verifies do not grow the wasm bump allocator or RSS", async () => {
        const curve = await getCurveFromName("bn128");
        for (let i = 0; i < 10; i++) await snarkjs.groth16.verify(vkey, publicSignals, proof); // warmup
        const pFree = curve.tm.u32[0];
        if (globalThis.gc) globalThis.gc();
        const baseRss = process.memoryUsage().rss;
        for (let i = 0; i < 200; i++) {
            await snarkjs.groth16.verify(vkey, publicSignals, proof);
            assert.strictEqual(curve.tm.u32[0], pFree, `wasm bump allocator drifted at verify ${i}`);
        }
        if (globalThis.gc) globalThis.gc();
        await new Promise((r) => setTimeout(r, 100));
        const grownMB = (process.memoryUsage().rss - baseRss) / 1048576;
        assert(grownMB < 40, `RSS grew ${grownMB.toFixed(1)}MB over 200 verifies`);
    });
});
