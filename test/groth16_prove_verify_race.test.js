import * as snarkjs from "../main.js";
import { getCurveFromName } from "../src/curves.js";
import assert from "assert";
import fs from "fs";
import path from "path";
import url from "url";

// Mixed prove+verify concurrency on the shared cached curve. Provers and
// verifiers interleave worker tasks (MSM/FFT chunks vs miller loops) in one
// ThreadManager queue and share the main-thread wasm scratch; this exercises
// that interleaving hard and checks every result individually plus the
// allocator invariant afterwards. Proving is randomized, so every proof is
// distinct -- cross-verifying each proof against its own run also catches
// any cross-contamination between concurrent provers.

const FIX = path.join(path.dirname(url.fileURLToPath(import.meta.url)), "verify_fixtures");
const readJson = (n) => JSON.parse(fs.readFileSync(path.join(FIX, n), "utf8"));

describe("groth16 prove+verify concurrency on the shared curve", function () {
    let vkey, refProof, refSignals, wtns;
    const zkeyPath = path.join(FIX, "groth16.zkey");

    beforeAll(async () => {
        vkey = await snarkjs.zKey.exportVerificationKey(zkeyPath);
        refProof = readJson("groth16.proof.json");
        refSignals = readJson("groth16.public.json");
        wtns = { type: "mem" };
        await snarkjs.wtns.calculate(
            JSON.parse(fs.readFileSync("test/groth16/input.json", "utf8")),
            path.join("test", "groth16", "circuit.wasm"), wtns);
    });

    it("8 provers and 24 verifiers running concurrently all succeed", async () => {
        const curve = await getCurveFromName("bn128");
        const pFree = curve.tm.u32[0];

        const jobs = [];
        for (let i = 0; i < 8; i++) {
            jobs.push(snarkjs.groth16.prove(zkeyPath, wtns).then(async ({ proof, publicSignals }) => {
                // each fresh proof must verify (distinct randomness per prover)
                const ok = await snarkjs.groth16.verify(vkey, publicSignals, proof);
                return { kind: "prove+verify", ok };
            }));
        }
        for (let i = 0; i < 24; i++) {
            jobs.push(snarkjs.groth16.verify(vkey, refSignals, refProof)
                .then((ok) => ({ kind: "verify", ok })));
        }
        const results = await Promise.all(jobs);
        for (const r of results) assert.strictEqual(r.ok, true, `${r.kind} failed`);

        // shared wasm scratch untouched by the storm
        assert.strictEqual(curve.tm.u32[0], pFree, "wasm bump allocator drifted");
    });

    it("interleaved prove / verify / failing-verify rounds stay individually correct", async () => {
        const badProof = JSON.parse(JSON.stringify(refProof));
        badProof.pi_a[0] = (BigInt(badProof.pi_a[0]) ^ 0xffn).toString();

        for (let round = 0; round < 3; round++) {
            const [fresh, okRef, okBad] = await Promise.all([
                snarkjs.groth16.prove(zkeyPath, wtns),
                snarkjs.groth16.verify(vkey, refSignals, refProof),
                snarkjs.groth16.verify(vkey, refSignals, badProof),
            ]);
            assert.strictEqual(okRef, true, `round ${round}: ref verify`);
            assert.strictEqual(okBad, false, `round ${round}: bad verify`);
            assert.strictEqual(
                await snarkjs.groth16.verify(vkey, fresh.publicSignals, fresh.proof), true,
                `round ${round}: fresh proof verify`);
            // two concurrent provers must produce independently valid,
            // distinct proofs (randomized r,s -- identical pi_a would mean
            // shared PRNG/scratch contamination)
            const [p1, p2] = await Promise.all([
                snarkjs.groth16.prove(zkeyPath, wtns),
                snarkjs.groth16.prove(zkeyPath, wtns),
            ]);
            assert.notStrictEqual(p1.proof.pi_a[0], p2.proof.pi_a[0], `round ${round}: proofs share randomness`);
            assert.strictEqual(await snarkjs.groth16.verify(vkey, p1.publicSignals, p1.proof), true);
            assert.strictEqual(await snarkjs.groth16.verify(vkey, p2.publicSignals, p2.proof), true);
        }
    });
});
