import * as snarkjs from "../main.js";
import { getCurveFromName } from "../src/curves.js";
import assert from "assert";
import path from "path";

// Regression test for getCutPoint's broken bisection in buildABCStream
// (src/groth16_prove.js).
//
// The old three-way search (`va > v => n = k - 1`) mishandled a chunk
// boundary `v` with no coefficient record exactly at c == v: the returned
// cut point was one coefficient too low, so that coefficient landed in
// neither adjacent chunk (the prior chunk's range ends before it; the next
// chunk's qap_buildABC filters it out by c-range). The dropped term
// corrupted the QAP A/B/C evaluations -> H -> pi_c, producing a proof that
// fails to verify.
//
// Trigger: section 4 of the zkey only holds records for A-side (m=0) and
// B-side (m=1) terms -- C-side terms produce no records. A constraint whose
// A and B are BOTH empty (the `0*0 = C` form circom emits for purely linear
// constraints such as `l <== a + b` when optimization is off) therefore has
// NO records at its row index, leaving a gap in the otherwise-sorted
// c-sequence. Circuits compiled with `circom --O0` hit this with default
// prove options.
//
// The fixture (test/buildabc_gap/gap.circom, compiled with circom --O0)
// alternates multiplicative rows with purely-linear rows, so half its 17
// constraint rows are missing from section 4:
//   c-values: 0,0,2,2,4,4,6,6,8,8,10,10,12,12,14,14,17,18
//
// The ptau MUST have at least one real contribution: with a fresh
// untouched accumulator (tau = 1) the pairing check degenerates and even a
// corrupted proof "verifies", masking the bug.
describe("buildABCStream cut points on a gapped coefficient array", function () {

    const r1csFile = path.join("test", "buildabc_gap", "gap.r1cs");
    const wasmFile = path.join("test", "buildabc_gap", "gap.wasm");

    let curve;
    const ptau_0 = {type: "mem"};
    const ptau_1 = {type: "mem"};
    const ptau_final = {type: "mem"};
    const zkey = {type: "mem"};
    const wtns = {type: "mem"};
    let vKey;

    beforeAll(async () => {
        curve = await getCurveFromName("bn128");
        await snarkjs.powersOfTau.newAccumulator(curve, 8, ptau_0);
        await snarkjs.powersOfTau.contribute(ptau_0, ptau_1, "C1", "buildabc gap test entropy");
        await snarkjs.powersOfTau.preparePhase2(ptau_1, ptau_final);
        await snarkjs.zKey.newZKey(r1csFile, ptau_final, zkey);
        vKey = await snarkjs.zKey.exportVerificationKey(zkey);
        await snarkjs.wtns.calculate({a: 3, b: 5}, wasmFile, wtns);
    });

    afterAll(async () => {
        await curve.terminate();
    });

    it("baseline: buildABC=js produces a verifying proof", async () => {
        const res = await snarkjs.groth16.prove(zkey, wtns, undefined, {buildABC: "js"});
        assert(await snarkjs.groth16.verify(vKey, res.publicSignals, res.proof) === true);

        // Harness sanity: a tampered public signal must NOT verify, proving
        // the ptau contribution above gave the pairing check real teeth.
        const bad = [...res.publicSignals];
        bad[0] = (BigInt(bad[0]) + 1n).toString();
        assert(await snarkjs.groth16.verify(vKey, bad, res.proof) === false);
    });

    it("default (streamed) prove verifies despite gapped coefficient rows", async () => {
        const res = await snarkjs.groth16.prove(zkey, wtns);
        assert(await snarkjs.groth16.verify(vKey, res.publicSignals, res.proof) === true);
    });

    it("streamed prove verifies with chunk boundaries forced onto missing rows", async () => {
        // domainSize = 32; nChunks = 32 puts a cut point at every row index,
        // including every gap (rows 1,3,...,15,16). Pre-fix, each mis-bisected
        // boundary dropped a coefficient and the proof failed to verify.
        for (const nChunks of [4, 32]) {
            const res = await snarkjs.groth16.prove(zkey, wtns, undefined, {
                buildABC: "stream",
                buildABCnChunks: nChunks,
                buildABCmaxInFlight: 2,
            });
            const ok = await snarkjs.groth16.verify(vKey, res.publicSignals, res.proof);
            assert(ok === true, `proof with nChunks=${nChunks} failed to verify`);
        }
    });
});
