import * as snarkjs from "../main.js";

// Vitest browser tests are served from project root via Vite dev server,
// so browser paths need a leading slash; Node tests use CWD-relative paths.
const isBrowser = typeof window !== "undefined";
const p = (rel) => (isBrowser ? `/${rel}` : rel);

const r1cs = p("test/groth16/circuit.r1cs");
const wasm = p("test/groth16/circuit.wasm");

describe("Groth16", function () {
    let curve;
    const ptau_0 = { type: "mem" };
    const ptau_1 = { type: "mem" };
    const ptau_beacon = { type: "mem" };
    const ptau_final = { type: "mem" };
    const zkey_0 = { type: "mem" };
    const zkey_1 = { type: "mem" };
    const zkey_final = { type: "mem" };
    const wtns = { type: "mem" };
    let vKey;
    let proof;
    let publicSignals;

    beforeAll(async () => {
        curve = await snarkjs.curves.getCurveFromName("bn128");
        await snarkjs.powersOfTau.newAccumulator(curve, 11, ptau_0);
        await snarkjs.powersOfTau.contribute(ptau_0, ptau_1, "C1", "Entropy1");
        await snarkjs.powersOfTau.beacon(
            ptau_1,
            ptau_beacon,
            "B3",
            "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20",
            10
        );
        await snarkjs.powersOfTau.preparePhase2(ptau_beacon, ptau_final);
    }, 300_000);

    afterAll(async () => {
        await curve.terminate();
    });

    it("zkey new", async () => {
        await snarkjs.zKey.newZKey(r1cs, ptau_final, zkey_0);
    });

    it("zkey contribute", async () => {
        await snarkjs.zKey.contribute(zkey_0, zkey_1, "p2_C1", "pa_Entropy1");
    });

    it("zkey beacon", async () => {
        await snarkjs.zKey.beacon(
            zkey_1,
            zkey_final,
            "B3",
            "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20",
            10
        );
    });

    it("zkey verify from r1cs", async () => {
        const res = await snarkjs.zKey.verifyFromR1cs(r1cs, ptau_final, zkey_final);
        expect(res).toBe(true);
    });

    it("zkey verify from init", async () => {
        const res = await snarkjs.zKey.verifyFromInit(zkey_0, ptau_final, zkey_final);
        expect(res).toBe(true);
    });

    it("zkey export verification key", async () => {
        vKey = await snarkjs.zKey.exportVerificationKey(zkey_final);
        expect(vKey).toBeTruthy();
    });

    it("witness calculate", async () => {
        await snarkjs.wtns.calculate({ a: 11, b: 2 }, wasm, wtns);
    });

    it("witness check", async () => {
        await snarkjs.wtns.check(r1cs, wtns);
    });

    it("groth16 prove", async () => {
        const res = await snarkjs.groth16.prove(zkey_final, wtns);
        proof = res.proof;
        publicSignals = res.publicSignals;
        expect(proof).toBeTruthy();
        expect(publicSignals).toBeTruthy();
    });

    it("groth16 verify", async () => {
        const res = await snarkjs.groth16.verify(vKey, publicSignals, proof);
        expect(res).toBe(true);
    });

    // Browser-only: prove from an http(s) zkey with options.persistentCache.
    // The first proof populates the IndexedDB block cache; the second one
    // must touch the network only for the open probe.
    it.runIf(isBrowser)("groth16 prove from URL: persistentCache warm start", async () => {
        const realFetch = globalThis.fetch;
        const data = zkey_final.data;
        const url = "https://pc.example/circuit_final.zkey";
        const counter = { count: 0 };
        globalThis.fetch = (u, opts) => {
            if (typeof u !== "string" || u.indexOf("https://pc.example/") !== 0) return realFetch(u, opts);
            counter.count++;
            const range = opts && opts.headers && opts.headers["Range"];
            const m = /bytes=(\d+)-(\d+)/.exec(range || "");
            const from = m ? parseInt(m[1]) : 0;
            const to = m ? Math.min(parseInt(m[2]), data.length - 1) : data.length - 1;
            return Promise.resolve(new Response(data.slice(from, to + 1), {
                status: 206,
                headers: {
                    "Content-Range": `bytes ${from}-${to}/${data.length}`,
                    "ETag": "\"zkey-pc-v1\"",
                },
            }));
        };
        try {
            const pc = { dbName: "snarkjs-test-pc" };
            await new Promise((res) => {
                const req = indexedDB.deleteDatabase(pc.dbName);
                req.onsuccess = req.onerror = req.onblocked = () => res();
            });

            const r1 = await snarkjs.groth16.prove(url, wtns, null, { persistentCache: pc });
            expect(await snarkjs.groth16.verify(vKey, r1.publicSignals, r1.proof)).toBe(true);
            const cold = counter.count;
            expect(cold).toBeGreaterThan(1);

            const r2 = await snarkjs.groth16.prove(url, wtns, null, { persistentCache: pc });
            expect(await snarkjs.groth16.verify(vKey, r2.publicSignals, r2.proof)).toBe(true);
            expect(counter.count - cold).toBe(1); // the open probe, nothing else
        } finally {
            globalThis.fetch = realFetch;
        }
    }, 300_000);
});
