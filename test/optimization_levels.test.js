import * as snarkjs from "../main.js";
import { getCurveFromName } from "../src/curves.js";
import assert from "assert";
import path from "path";

// Groth16 over the SAME circuit compiled at every circom optimization level.
// The three fixtures (test/optimization_levels/gap_O{0,1,2}.{r1cs,wasm}, from
// gap.circom with circom 2.2.3) give three different R1CS shapes:
//   --O0 keeps every purely-linear constraint. Linear rows compile to the
//        `0*0 = C` form -- no A/B records in zkey section 4 -- leaving gaps
//        in the otherwise-sorted c-sequence the streamed prover bisects.
//   --O1 (circom's default) only substitutes redundant signal equalities;
//        this circuit has none, so its linear rows (and the gaps) survive too.
//   --O2 eliminates all linear constraints: a dense, gap-free c-sequence.
// The getCutPoint bisection bug in buildABCStream (src/groth16_prove.js)
// dropped a coefficient at gapped chunk boundaries, so proofs over -O0
// circuits failed to verify while the same circuit at -O2 worked. Every
// level must therefore survive the default (streamed) prover, agree with the
// js prover, and verify with chunk boundaries forced onto every row.
describe("Groth16 across circom optimization levels (-O0/-O1/-O2)", function () {

    const levels = ["O0", "O1", "O2"];
    const fixture = (lvl, ext) => path.join("test", "optimization_levels", `gap_${lvl}.${ext}`);

    let curve;
    const ptau_0 = {type: "mem"};
    const ptau_1 = {type: "mem"};
    const ptau_final = {type: "mem"};
    const perLevel = {};

    beforeAll(async () => {
        curve = await getCurveFromName("bn128");
        // The ptau MUST have a real contribution: with a fresh untouched
        // accumulator (tau = 1) many corruptions self-cancel and even a
        // broken proof "verifies", masking exactly the class of bug this
        // suite exists to catch.
        await snarkjs.powersOfTau.newAccumulator(curve, 8, ptau_0);
        await snarkjs.powersOfTau.contribute(ptau_0, ptau_1, "C1", "optimization levels entropy");
        await snarkjs.powersOfTau.preparePhase2(ptau_1, ptau_final);
    });

    afterAll(async () => {
        await curve.terminate();
    });

    it("fixture sanity: -O0 keeps the linear constraints, -O2 drops them", async () => {
        // gap.circom = 8 multiplicative + 9 purely-linear rows. If a
        // recompiled fixture ever stops showing this split, the -O0 lane no
        // longer exercises the gapped shape and the suite loses its point.
        const infoO0 = await snarkjs.r1cs.info(fixture("O0", "r1cs"));
        const infoO1 = await snarkjs.r1cs.info(fixture("O1", "r1cs"));
        const infoO2 = await snarkjs.r1cs.info(fixture("O2", "r1cs"));
        assert.strictEqual(infoO0.nConstraints, 17);
        assert.strictEqual(infoO1.nConstraints, 17);
        assert.strictEqual(infoO2.nConstraints, 8);
    });

    for (const lvl of levels) {
        describe(`-${lvl}`, function () {
            it("groth16 setup + witness", async () => {
                const zkey = {type: "mem"};
                await snarkjs.zKey.newZKey(fixture(lvl, "r1cs"), ptau_final, zkey);
                const vKey = await snarkjs.zKey.exportVerificationKey(zkey);

                const wtns = {type: "mem"};
                await snarkjs.wtns.calculate({a: 3, b: 5}, fixture(lvl, "wasm"), wtns);
                assert(await snarkjs.wtns.check(fixture(lvl, "r1cs"), wtns) === true);

                perLevel[lvl] = {zkey, vKey, wtns};
            });

            it("proves and verifies with the default (streamed) prover", async () => {
                const {zkey, vKey, wtns} = perLevel[lvl];
                const res = await snarkjs.groth16.prove(zkey, wtns);
                assert(await snarkjs.groth16.verify(vKey, res.publicSignals, res.proof) === true);

                // Harness teeth: a tampered public signal must NOT verify.
                const bad = [...res.publicSignals];
                bad[0] = (BigInt(bad[0]) + 1n).toString();
                assert(await snarkjs.groth16.verify(vKey, bad, res.proof) === false);

                perLevel[lvl].publicSignals = res.publicSignals;
            });

            it("the js (non-streamed) prover agrees", async () => {
                const {zkey, vKey, wtns, publicSignals} = perLevel[lvl];
                const res = await snarkjs.groth16.prove(zkey, wtns, undefined, {buildABC: "js"});
                assert(await snarkjs.groth16.verify(vKey, res.publicSignals, res.proof) === true);
                assert.deepStrictEqual(res.publicSignals, publicSignals);
            });

            it("verifies with chunk boundaries forced onto every constraint row", async () => {
                // nChunks >= domainSize puts a cut point at every row index,
                // including every gap row -- the exact -O0 failure trigger.
                const {zkey, vKey, wtns} = perLevel[lvl];
                const res = await snarkjs.groth16.prove(zkey, wtns, undefined, {
                    buildABC: "stream",
                    buildABCnChunks: 32,
                    buildABCmaxInFlight: 2,
                });
                assert(await snarkjs.groth16.verify(vKey, res.publicSignals, res.proof) === true);
            });
        });
    }

    // In its own describe so mocha runs it AFTER the per-level describes
    // above (top-level its run before nested describes).
    describe("cross-level consistency", function () {
        it("all optimization levels compute the same public output", () => {
            assert.deepStrictEqual(perLevel.O1.publicSignals, perLevel.O0.publicSignals);
            assert.deepStrictEqual(perLevel.O2.publicSignals, perLevel.O0.publicSignals);
        });
    });
});
