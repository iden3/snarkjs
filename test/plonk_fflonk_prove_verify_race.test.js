import * as snarkjs from "../main.js";
import { getCurveFromName } from "../src/curves.js";
import assert from "assert";
import fs from "fs";
import path from "path";
import url from "url";

// Mixed-protocol prove+verify concurrency on the shared cached curve.
// PLONK and FFLONK add surfaces groth16 does not have: the Keccak256
// Fiat-Shamir transcript (a per-call local -- verified), the Polynomial/
// Evaluations machinery, and verifiers that derive challenges from vk data
// (they deep-copy inputs via unstringifyBigInts, so the vk.domainSize
// mutation in fflonk_verify hits a private copy -- verified). This suite
// enforces those arguments empirically, including cross-protocol
// interleaving of all three provers/verifiers in one ThreadManager queue.

const FIX = path.join(path.dirname(url.fileURLToPath(import.meta.url)), "verify_fixtures");

describe("plonk+fflonk prove/verify concurrency on the shared curve", function () {
    const plonkZkey = path.join("test", "plonk_circuit", "circuit.zkey");
    const fflonkZkey = path.join("test", "fflonk", "circuit.zkey");
    const fflonkWtns = path.join("test", "fflonk", "witness.wtns");
    let plonkVk, fflonkVk, plonkWtns;
    let plonkRef, fflonkRef;
    let g16Vk, g16Proof, g16Signals;

    beforeAll(async () => {
        plonkVk = await snarkjs.zKey.exportVerificationKey(plonkZkey);
        fflonkVk = await snarkjs.zKey.exportVerificationKey(fflonkZkey);
        plonkWtns = { type: "mem" };
        await snarkjs.wtns.calculate(
            JSON.parse(fs.readFileSync(path.join("test", "plonk_circuit", "input.json"), "utf8")),
            path.join("test", "plonk_circuit", "circuit.wasm"), plonkWtns);
        plonkRef = await snarkjs.plonk.prove(plonkZkey, plonkWtns);
        fflonkRef = await snarkjs.fflonk.prove(fflonkZkey, fflonkWtns);
        g16Vk = await snarkjs.zKey.exportVerificationKey(path.join(FIX, "groth16.zkey"));
        g16Proof = JSON.parse(fs.readFileSync(path.join(FIX, "groth16.proof.json"), "utf8"));
        g16Signals = JSON.parse(fs.readFileSync(path.join(FIX, "groth16.public.json"), "utf8"));
    });

    it("cross-protocol storm: provers and verifiers of all three schemes interleave correctly", async () => {
        const curve = await getCurveFromName("bn128");
        const pFree = curve.tm.u32[0];

        const jobs = [];
        for (let i = 0; i < 2; i++) {
            jobs.push(snarkjs.plonk.prove(plonkZkey, plonkWtns).then(async (p) => ({
                kind: "plonk prove+verify",
                ok: await snarkjs.plonk.verify(plonkVk, p.publicSignals, p.proof),
            })));
            jobs.push(snarkjs.fflonk.prove(fflonkZkey, fflonkWtns).then(async (p) => ({
                kind: "fflonk prove+verify",
                ok: await snarkjs.fflonk.verify(fflonkVk, p.publicSignals, p.proof),
            })));
        }
        for (let i = 0; i < 8; i++) {
            jobs.push(snarkjs.plonk.verify(plonkVk, plonkRef.publicSignals, plonkRef.proof)
                .then((ok) => ({ kind: "plonk verify", ok })));
            jobs.push(snarkjs.fflonk.verify(fflonkVk, fflonkRef.publicSignals, fflonkRef.proof)
                .then((ok) => ({ kind: "fflonk verify", ok })));
        }
        for (let i = 0; i < 4; i++) {
            jobs.push(snarkjs.groth16.verify(g16Vk, g16Signals, g16Proof)
                .then((ok) => ({ kind: "groth16 verify", ok })));
        }
        const results = await Promise.all(jobs);
        for (const r of results) assert.strictEqual(r.ok, true, `${r.kind} failed`);
        assert.strictEqual(curve.tm.u32[0], pFree, "wasm bump allocator drifted");
    });

    it("concurrent same-protocol provers produce distinct valid proofs; shared vk objects survive concurrent verifies", async () => {
        // shared vk OBJECTS across concurrent verifies: verifiers must not
        // mutate caller state (they deep-copy) -- run many in parallel on the
        // same object and re-check a serial verify afterwards
        const [p1, p2] = await Promise.all([
            snarkjs.plonk.prove(plonkZkey, plonkWtns),
            snarkjs.plonk.prove(plonkZkey, plonkWtns),
        ]);
        assert.notStrictEqual(p1.proof.A[0], p2.proof.A[0], "plonk proofs share blinding randomness");
        const [f1, f2] = await Promise.all([
            snarkjs.fflonk.prove(fflonkZkey, fflonkWtns),
            snarkjs.fflonk.prove(fflonkZkey, fflonkWtns),
        ]);
        assert.notStrictEqual(JSON.stringify(f1.proof.polynomials.C1), JSON.stringify(f2.proof.polynomials.C1),
            "fflonk proofs share blinding randomness");

        const vkSnapshot = JSON.stringify(fflonkVk);
        const oks = await Promise.all(Array.from({ length: 10 }, () =>
            snarkjs.fflonk.verify(fflonkVk, fflonkRef.publicSignals, fflonkRef.proof)));
        assert(oks.every((r) => r === true));
        assert.strictEqual(JSON.stringify(fflonkVk), vkSnapshot, "fflonk verify mutated the caller's vk object");

        // corrupt proofs stay individually false amid valid concurrent traffic
        const badPlonk = JSON.parse(JSON.stringify(plonkRef.proof));
        badPlonk.A[0] = (BigInt(badPlonk.A[0]) ^ 0xffn).toString();
        const badFflonk = JSON.parse(JSON.stringify(fflonkRef.proof));
        badFflonk.polynomials.C1[0] = (BigInt(badFflonk.polynomials.C1[0]) ^ 0xffn).toString();
        const [okP, badP, okF, badF] = await Promise.all([
            snarkjs.plonk.verify(plonkVk, plonkRef.publicSignals, plonkRef.proof),
            snarkjs.plonk.verify(plonkVk, plonkRef.publicSignals, badPlonk),
            snarkjs.fflonk.verify(fflonkVk, fflonkRef.publicSignals, fflonkRef.proof),
            snarkjs.fflonk.verify(fflonkVk, fflonkRef.publicSignals, badFflonk),
        ]);
        assert.strictEqual(okP, true);
        assert.strictEqual(badP, false);
        assert.strictEqual(okF, true);
        assert.strictEqual(badF, false);
    });
});
