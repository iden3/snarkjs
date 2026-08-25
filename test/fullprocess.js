import * as snarkjs from "../main.js";
import { getCurveFromName } from "../src/curves.js";
import loadSyms from "../src/loadsyms.js";
import * as wtnsUtils from "../src/wtns_utils.js";
import { readR1cs } from "r1csfile";
import * as binFileUtils from "@iden3/binfileutils";
import { Scalar } from "ffjavascript";
import assert from "assert";
import path from "path";
import fs from "fs";

describe("Full process", function ()  {
    this.timeout(1000000000);

    let curve;
    const ptau_0 = {type: "mem"};
    const ptau_1 = {type: "mem"};
    const ptau_2 = {type: "mem"};
    const ptau_beacon = {type: "mem"};
    const ptau_final = {type: "mem"};
    const ptau_challenge2 = {type: "mem"};
    const ptau_response2 = {type: "mem"};
    const zkey_0 = {type: "mem"};
    const zkey_1 = {type: "mem"};
    const zkey_2 = {type: "mem"};
    const zkey_final = {type: "mem"};
    const zkey_plonk = {type: "mem"};
    const bellman_1 = {type: "mem"};
    const bellman_2 = {type: "mem"};
    let vKey;
    let vKeyGroth16;
    const wtns = {type: "mem"};
    let proof;
    let publicSignals;
    let publicSignalsWithAlias;

    before( async () => {
        curve = await getCurveFromName("bn128");
        // curve.Fr.s = 10;
    });
    after( async () => {
        await curve.terminate();
        // console.log(process._getActiveHandles());
        // console.log(process._getActiveRequests());
    });

    it ("powersoftau new", async () => {
        await snarkjs.powersOfTau.newAccumulator(curve, 11, ptau_0);
    });

    it ("powersoftau contribute ", async () => {
        await snarkjs.powersOfTau.contribute(ptau_0, ptau_1, "C1", "Entropy1");
    });

    it ("powersoftau export challenge", async () => {
        await snarkjs.powersOfTau.exportChallenge(ptau_1, ptau_challenge2);
    });

    it ("powersoftau challenge contribute", async () => {
        await snarkjs.powersOfTau.challengeContribute(curve, ptau_challenge2, ptau_response2, "Entropy2");
    });

    it ("powersoftau import response", async () => {
        await snarkjs.powersOfTau.importResponse(ptau_1, ptau_response2, ptau_2, "C2", true);
    });

    it ("powersoftau beacon", async () => {
        await snarkjs.powersOfTau.beacon(ptau_2, ptau_beacon, "B3", "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20", 10);
    });

    it ("powersoftau prepare phase2", async () => {
        await snarkjs.powersOfTau.preparePhase2(ptau_beacon, ptau_final);
    });

    it ("powersoftau verify", async () => {
        const res = await snarkjs.powersOfTau.verify(ptau_final);
        assert(res);
    });

    it ("groth16 setup", async () => {
        await snarkjs.zKey.newZKey(path.join("test", "groth16", "circuit.r1cs"), ptau_final, zkey_0);
    });

    it ("zkey contribute ", async () => {
        await snarkjs.zKey.contribute(zkey_0, zkey_1, "p2_C1", "pa_Entropy1");
    });

    it ("zkey export bellman", async () => {
        await snarkjs.zKey.exportBellman(zkey_1, bellman_1);
    });

    it ("zkey bellman contribute", async () => {
        await snarkjs.zKey.bellmanContribute(curve, bellman_1, bellman_2, "pa_Entropy2");
    });

    it ("zkey import bellman", async () => {
        await snarkjs.zKey.importBellman(zkey_1, bellman_2, zkey_2, "C2");
    });

    it ("zkey beacon", async () => {
        await snarkjs.zKey.beacon(zkey_2, zkey_final, "B3", "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20", 10);
    });

    it ("zkey verify r1cs", async () => {
        const res = await snarkjs.zKey.verifyFromR1cs(path.join("test", "groth16", "circuit.r1cs"), ptau_final, zkey_final);
        assert(res);
    });

    it ("zkey verify init", async () => {
        const res = await snarkjs.zKey.verifyFromInit(zkey_0, ptau_final, zkey_final);
        assert(res);
    });

    it ("zkey export verificationkey", async () => {
        vKey = await snarkjs.zKey.exportVerificationKey(zkey_final);
        vKeyGroth16 = vKey; // keep a handle: the plonk section reassigns vKey
    });

    it ("witness calculate", async () => {
        await snarkjs.wtns.calculate({a: 11, b:2}, path.join("test", "groth16", "circuit.wasm"), wtns);
    });

    it ("checks witness complies with r1cs", async () => {
        await snarkjs.wtns.check(path.join("test", "groth16", "circuit.r1cs"), wtns);
    });

    it ("checks witness check rejects a witness that violates the r1cs (does not throw)", async () => {
        // Regression test: wtnsCheck used to call logger.warn() unguarded on a
        // constraint failure, throwing a TypeError instead of returning false
        // when no logger was passed (exactly how this test calls it).
        // Corrupt the last byte of the witness data -- section 2 (the witness
        // values) is written last, so this flips a signal value and breaks
        // at least one A*B-C=0 constraint.
        const corruptWtns = {type: "mem", data: Uint8Array.from(wtns.data)};
        corruptWtns.data[corruptWtns.data.length - 1] ^= 0xFF;

        const res = await snarkjs.wtns.check(path.join("test", "groth16", "circuit.r1cs"), corruptWtns);
        assert(res == false);
    });

    it ("groth16 proof", async () => {
        const res = await snarkjs.groth16.prove(zkey_final, wtns);
        proof = res.proof;
        publicSignals = res.publicSignals;
        publicSignalsWithAlias = [...res.publicSignals];
        publicSignalsWithAlias[1] = BigInt(res.publicSignals[1]) + 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
    });

    it ("groth16 verify", async () => {
        const res = await snarkjs.groth16.verify(vKey, publicSignals, proof);
        assert(res == true);

        const res2 = await snarkjs.groth16.verify(vKey, publicSignalsWithAlias, proof);
        assert(res2 == false);
    });

    it ("groth16 proof singleThreaded", async () => {
        const res = await snarkjs.groth16.prove(zkey_final, wtns, undefined, {singleThread: true});
        proof = res.proof;
        publicSignals = res.publicSignals;
        publicSignalsWithAlias = [...res.publicSignals];
        publicSignalsWithAlias[1] = BigInt(res.publicSignals[1]) + 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
    });

    it ("groth16 verify (proof singleThreaded)", async () => {
        const res = await snarkjs.groth16.verify(vKey, publicSignals, proof);
        assert(res == true);

        const res2 = await snarkjs.groth16.verify(vKey, publicSignalsWithAlias, proof);
        assert(res2 == false);
    });

    // msmBatching/msmGlv/msmGls select the batch-affine MSM module and its
    // GLV (G1) / GLS (G2) endomorphism paths inside ffjavascript's multiexp
    // (see src/groth16_prove.js options -> msmOpts). Every combination must
    // still produce a proof that verifies -- these options change which MSM
    // codepath computes the same pi_a/pi_b/pi_c/H points, not the math.
    const msmOptionCombos = [
        {msmBatching: "disabled"},
        {msmBatching: "enabled"},
        {msmBatching: "enabled", msmGlv: "disabled"},
        {msmBatching: "enabled", msmGls: "disabled"},
        {msmBatching: "enabled", msmGlv: "disabled", msmGls: "disabled"},
    ];

    for (const options of msmOptionCombos) {
        const label = Object.entries(options).map(([k, v]) => `${k}=${v}`).join(", ");

        it (`groth16 proof + verify (${label})`, async () => {
            const res = await snarkjs.groth16.prove(zkey_final, wtns, undefined, options);
            const ok = await snarkjs.groth16.verify(vKey, res.publicSignals, res.proof);
            assert(ok == true);
        });
    }

    it ("groth16 proof rejects an invalid msmBatching option", async () => {
        let threw = false;
        try {
            await snarkjs.groth16.prove(zkey_final, wtns, undefined, {msmBatching: "bogus"});
        } catch (err) {
            threw = true;
            assert(err.message.includes("msmBatching"));
        }
        assert(threw, "should throw on an invalid msmBatching value");
    });

    it ("groth16 proof rejects an invalid msmGlv option", async () => {
        let threw = false;
        try {
            await snarkjs.groth16.prove(zkey_final, wtns, undefined, {msmGlv: "bogus"});
        } catch (err) {
            threw = true;
            assert(err.message.includes("msmGlv"));
        }
        assert(threw, "should throw on an invalid msmGlv value");
    });

    // buildABC selects the QAP coefficient-build strategy (src/groth16_prove.js).
    // "js" and "stream" are the only supported values; "wasm"/"wasm1" were
    // retired multi/single-threaded WASM variants. Both live options must
    // still produce a verifying proof, and a retired or nonsense value must
    // be rejected rather than silently falling through to the default.
    for (const buildABC of ["js", "stream"]) {
        it (`groth16 proof + verify (buildABC=${buildABC})`, async () => {
            const res = await snarkjs.groth16.prove(zkey_final, wtns, undefined, {buildABC});
            const ok = await snarkjs.groth16.verify(vKey, res.publicSignals, res.proof);
            assert(ok == true);
        });
    }

    // The stream tuning knobs (see pickStreamParams in src/groth16_prove.js):
    // buildABCFloorBudget bounds the persistent worker memory, clamping
    // maxInFlight down to 1 at the extreme; explicit nChunks/maxInFlight
    // overrides bypass the heuristic entirely. Degenerate values must still
    // produce a verifying proof, just more slowly.
    const streamTuningCombos = [
        {buildABC: "stream", buildABCFloorBudget: 1},                    // clamps maxInFlight to 1
        {buildABC: "stream", buildABCnChunks: 1, buildABCmaxInFlight: 1}, // single serial chunk
        {buildABC: "stream", buildABCnChunks: 7, buildABCmaxInFlight: 3}, // non-divisor chunk count
    ];

    for (const options of streamTuningCombos) {
        const label = Object.entries(options).map(([k, v]) => `${k}=${v}`).join(", ");

        it (`groth16 proof + verify (${label})`, async () => {
            const res = await snarkjs.groth16.prove(zkey_final, wtns, undefined, options);
            const ok = await snarkjs.groth16.verify(vKey, res.publicSignals, res.proof);
            assert(ok == true);
        });
    }

    it ("groth16 proof with memoryLogging emits memory lines and still verifies", async () => {
        // memoryLogging starts a periodic memUsage timer (Node only) which
        // must be cleared in groth16Prove's finally -- a leaked interval
        // would keep the process (and this test run) alive forever. The
        // finally also logs one final memUsage line, so at least one "Heap:"
        // line must appear even if the prove finishes before the first tick.
        const lines = [];
        const logger = {
            info: (...args) => lines.push(args.join(" ")),
            debug: () => {},
            warn: () => {},
            error: () => {},
        };

        const res = await snarkjs.groth16.prove(zkey_final, wtns, logger, {memoryLogging: 50});
        const ok = await snarkjs.groth16.verify(vKey, res.publicSignals, res.proof);
        assert(ok == true);
        assert(lines.some((l) => l.includes("Heap:")), "expected at least one memory-usage log line");

        // memoryLogging: true selects the default 1s interval
        const res2 = await snarkjs.groth16.prove(zkey_final, wtns, logger, {memoryLogging: true});
        assert(await snarkjs.groth16.verify(vKey, res2.publicSignals, res2.proof) == true);
    });

    for (const buildABC of ["wasm", "wasm1", "bogus"]) {
        it (`groth16 proof rejects a retired/invalid buildABC option (${buildABC})`, async () => {
            let threw = false;
            try {
                await snarkjs.groth16.prove(zkey_final, wtns, undefined, {buildABC});
            } catch (err) {
                threw = true;
                assert(err.message.includes("buildABC"));
            }
            assert(threw, `should throw on buildABC="${buildABC}" instead of silently using the default`);
        });
    }

    // Regression: fds used to close only on groth16Prove's success path;
    // any failing await (header validation, section reads, one of the six
    // concurrent phases) leaked both Node fds. groth16Prove now owns the
    // open/close lifecycle in its try/finally, with a straggler drain on the
    // error path so no phase promise is left unobserved.
    it ("groth16 proof failure paths do not leak or hang (early throw + mid-phase throw)", async () => {
        // Early throw: corrupt the wtns header's nWitness field.
        // wtns layout: 4 magic + 4 version + 4 nSections + 4 sec1 id + 8 sec1 size
        // + 4 n8 + 32 prime + 4 nWitness -- flip nWitness's low byte.
        const badWtns = {type: "mem", data: Uint8Array.from(wtns.data)};
        badWtns.data[4 + 4 + 4 + 4 + 8 + 4 + 32] ^= 0xFF;
        let threw = false;
        try { await snarkjs.groth16.prove(zkey_final, badWtns); } catch { threw = true; }
        assert(threw, "corrupted witness header should reject");

        // Mid-phase throw: truncate a copy of the zkey so a section read
        // fails inside one of the six concurrent prove phases.
        const zkeyData = zkey_final.data;
        const badZkey = {type: "mem", data: zkeyData.slice(0, Math.floor(zkeyData.byteLength * 0.6))};
        threw = false;
        try { await snarkjs.groth16.prove(badZkey, wtns); } catch { threw = true; }
        assert(threw, "truncated zkey should reject, not hang");

        // The prover must still work afterwards (no wedged shared state).
        const res = await snarkjs.groth16.prove(zkey_final, wtns);
        const ok = await snarkjs.groth16.verify(vKey, res.publicSignals, res.proof);
        assert(ok == true);
    });

    it ("plonk setup", async () => {
        await snarkjs.plonk.setup(path.join("test", "circuit", "circuit.r1cs"), ptau_final, zkey_plonk);
    });

    it ("zkey export verificationkey", async () => {
        vKey = await snarkjs.zKey.exportVerificationKey(zkey_plonk);
    });

    it ("plonk proof", async () => {
        const res = await snarkjs.plonk.prove(zkey_plonk, wtns);
        proof = res.proof;
        publicSignals = res.publicSignals;
    });


    it ("plonk verify", async () => {
        const res = await snarkjs.plonk.verify(vKey, publicSignals, proof);
        assert(res == true);
    });

    it ("plonk verify rejects a proof with a malformed (off-curve) commitment, without throwing", async () => {
        // Regression test: plonkVerify's isWellConstructed() check used to
        // call logger.error() unguarded, throwing a TypeError instead of
        // returning false when no logger was passed (exactly how this test
        // calls verify). Corrupting proof.A off-curve exercises exactly that
        // path -- G1.isValid(proof.A) fails and isWellConstructed() returns
        // false before anything else in the proof is even looked at.
        const tamperedProof = JSON.parse(JSON.stringify(proof));
        // proof.A is [x, y, z] in projective coordinates as decimal strings;
        // incrementing x by 1 (keeping y, z) takes the point off the curve.
        tamperedProof.A = [(BigInt(tamperedProof.A[0]) + 1n).toString(), tamperedProof.A[1], tamperedProof.A[2]];

        const res = await snarkjs.plonk.verify(vKey, publicSignals, tamperedProof);
        assert(res == false);
    });

    it ("plonk verify rejects a wrong number of public signals, without throwing", async () => {
        // Both public-signal-count checks in plonkVerify log through a
        // guarded logger; called without one (as here) they must return
        // false, not throw.
        const res = await snarkjs.plonk.verify(vKey, [...publicSignals, "1"], proof);
        assert(res == false);

        const res2 = await snarkjs.plonk.verify(vKey, [], proof);
        assert(res2 == false);
    });

    // ---- verifier rejection paths, with logging enabled ----------------
    // A collecting logger both silences output and covers the logger-guarded
    // error/debug lines the silent tests skip.
    const logLines = [];
    const logger = {
        info: (...a) => logLines.push(a.join(" ")),
        debug: (...a) => logLines.push(a.join(" ")),
        warn: (...a) => logLines.push(a.join(" ")),
        error: (...a) => logLines.push(a.join(" ")),
        log: (...a) => logLines.push(a.join(" ")),
    };

    it ("plonk verify rejects an out-of-field evaluation and public input (with logger)", async () => {
        const r = curve.r.toString();

        const badEval = JSON.parse(JSON.stringify(proof));
        badEval.eval_a = r; // >= field modulus: evaluationsAreValid must fail
        assert(await snarkjs.plonk.verify(vKey, publicSignals, badEval, logger) == false);

        // public input >= field modulus: publicInputsAreValid must fail
        assert(await snarkjs.plonk.verify(vKey, [r], proof, logger) == false);

        // and a wrong (but well-formed) public signal fails the pairing, logged
        const wrongPub = [(BigInt(publicSignals[0]) + 1n).toString()];
        assert(await snarkjs.plonk.verify(vKey, wrongPub, proof, logger) == false);
    });

    it ("plonk setup reports unprepared and too-small ptau files (with logger)", async () => {
        // ptau_2 has contributions but was never prepared (no section 12)
        const zkeyBad = {type: "mem"};
        const res = await snarkjs.plonk.setup(path.join("test", "plonk_circuit", "circuit.r1cs"), ptau_2, zkeyBad, logger);
        assert(res === -1);

        // A prepared ceremony that is too small for the circuit
        // (Multiplier(1000) needs cirPower ~11, far above power 3)
        const tiny_0 = {type: "mem"};
        const tiny_final = {type: "mem"};
        await snarkjs.powersOfTau.newAccumulator(curve, 3, tiny_0);
        await snarkjs.powersOfTau.preparePhase2(tiny_0, tiny_final);
        const res2 = await snarkjs.plonk.setup(path.join("test", "groth16", "circuit.r1cs"), tiny_final, {type: "mem"}, logger);
        assert(res2 === -1);
    });

    it ("plonk setup reports an r1cs/ptau curve mismatch (with logger)", async () => {
        const blsCurve = await getCurveFromName("bls12381");
        try {
            const blsPtau = {type: "mem"};
            await snarkjs.powersOfTau.newAccumulator(blsCurve, 3, blsPtau);
            const res = await snarkjs.plonk.setup(path.join("test", "plonk_circuit", "circuit.r1cs"), blsPtau, {type: "mem"}, logger);
            assert(res === -1);
        } finally {
            await blsCurve.terminate();
        }
    });

    it ("zkey verify rejects a corrupted zkey (with logger)", async () => {
        const corrupt = {type: "mem", data: Uint8Array.from(zkey_final.data)};
        corrupt.data[Math.floor(corrupt.data.length / 2)] ^= 0xFF;

        let res;
        try {
            res = await snarkjs.zKey.verifyFromR1cs(path.join("test", "groth16", "circuit.r1cs"), ptau_final, corrupt, logger);
        } catch (err) {
            res = false; // an unparsable point rejecting is also a rejection
        }
        assert(res !== true);
    });

    it ("zkey verify prints the contribution chain (with logger)", async () => {
        const res = await snarkjs.zKey.verifyFromR1cs(
            path.join("test", "groth16", "circuit.r1cs"), ptau_final, zkey_final, logger);
        assert(res === true);

        const res2 = await snarkjs.zKey.verifyFromInit(zkey_0, ptau_final, zkey_final, logger);
        assert(res2 === true);
    });

    it ("wtns check logs the witness summary (with logger)", async () => {
        const res = await snarkjs.wtns.check(path.join("test", "groth16", "circuit.r1cs"), wtns, logger);
        assert(res === true);
    });

    it ("zkey beacon rejects malformed beacon parameters", async () => {
        const goodHash = "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20";
        assert(await snarkjs.zKey.beacon(zkey_2, {type: "mem"}, "B", goodHash, 5, logger) === false);
        assert(await snarkjs.zKey.beacon(zkey_2, {type: "mem"}, "B", "0102f", 10, logger) === false);
    });

    it ("groth16 proof rejects an invalid msmGls option", async () => {
        let threw = false;
        try {
            await snarkjs.groth16.prove(zkey_final, wtns, undefined, {msmGls: "bogus"});
        } catch (err) {
            threw = true;
            assert(err.message.includes("msmGls"));
        }
        assert(threw, "should throw on an invalid msmGls value");
    });

    it ("each prover rejects a zkey of the wrong protocol", async () => {
        await assert.rejects(snarkjs.groth16.prove(zkey_plonk, wtns), /not groth16/);
        await assert.rejects(snarkjs.plonk.prove(zkey_final, wtns), /not plonk|not a plonk/i);
        await assert.rejects(snarkjs.fflonk.prove(zkey_final, wtns), /not fflonk/);
    });

    it ("provers and wtns check reject a witness from the wrong curve or of the wrong length", async () => {
        // Craft a syntactically valid wtns with the bls12-381 prime
        const bls12381r = Scalar.e("73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001", 16);
        const blsWtns = {type: "mem"};
        let fd = await binFileUtils.createBinFile(blsWtns, "wtns", 2, 2);
        await wtnsUtils.write(fd, [1n, 2n, 3n], bls12381r);
        await fd.close();

        await assert.rejects(snarkjs.groth16.prove(zkey_final, blsWtns), /witness does not match/);
        await assert.rejects(snarkjs.plonk.prove(zkey_plonk, blsWtns), /witness does not match/);
        await assert.rejects(snarkjs.wtns.check(path.join("test", "groth16", "circuit.r1cs"), blsWtns, logger), /witness does not match/);

        // Right curve, wrong witness count
        const shortWtns = {type: "mem"};
        fd = await binFileUtils.createBinFile(shortWtns, "wtns", 2, 2);
        await wtnsUtils.write(fd, [1n, 2n, 3n], curve.r);
        await fd.close();

        await assert.rejects(snarkjs.groth16.prove(zkey_final, shortWtns), /Invalid witness length/);
        await assert.rejects(snarkjs.plonk.prove(zkey_plonk, shortWtns), /Invalid witness length/);
    });

    it ("groth16 setup rejects a too-small or wrong-curve ptau", async () => {
        const tiny_0 = {type: "mem"};
        const tiny_final = {type: "mem"};
        await snarkjs.powersOfTau.newAccumulator(curve, 3, tiny_0);
        await snarkjs.powersOfTau.preparePhase2(tiny_0, tiny_final);
        let rejected = false;
        try {
            rejected = (await snarkjs.zKey.newZKey(path.join("test", "groth16", "circuit.r1cs"), tiny_final, {type: "mem"}, logger)) === -1;
        } catch (err) {
            rejected = true;
        }
        assert(rejected, "too-small ptau must be rejected");

        const blsCurve = await getCurveFromName("bls12381");
        try {
            const blsPtau = {type: "mem"};
            await snarkjs.powersOfTau.newAccumulator(blsCurve, 3, blsPtau);
            const blsPrepared = {type: "mem"};
            await snarkjs.powersOfTau.preparePhase2(blsPtau, blsPrepared);
            let rejected2 = false;
            try {
                rejected2 = (await snarkjs.zKey.newZKey(path.join("test", "groth16", "circuit.r1cs"), blsPrepared, {type: "mem"}, logger)) === -1;
            } catch (err) {
                rejected2 = true;
            }
            assert(rejected2, "wrong-curve ptau must be rejected");
        } finally {
            await blsCurve.terminate();
        }
    });

    it ("zkey import bellman logs a successful import (with logger)", async () => {
        const imported = {type: "mem"};
        const res = await snarkjs.zKey.importBellman(zkey_2, bellman_2, imported, "logged import", logger);
        assert(res !== false);
        assert(imported.data.byteLength > 0);
    });

    it ("zkey import bellman carries beacon metadata through a re-export round-trip", async () => {
        // zkey_final contains a beacon contribution; exporting and re-importing
        // exercises the type==1 and name-copy branches of the import.
        const reExported = {type: "mem"};
        await snarkjs.zKey.exportBellman(zkey_final, reExported, logger);
        const reImported = {type: "mem"};
        const res = await snarkjs.zKey.importBellman(zkey_final, reExported, reImported, "", logger);
        assert(res !== false);
    });

    it ("zkey import bellman rejects a non-groth16 zkey", async () => {
        let rejected = false;
        try {
            rejected = (await snarkjs.zKey.importBellman(zkey_plonk, bellman_2, {type: "mem"}, "x", logger)) === false;
        } catch (err) {
            rejected = true;
        }
        assert(rejected);
    });

    it ("groth16 setup rejects an unprepared ptau", async () => {
        let rejected = false;
        try {
            rejected = (await snarkjs.zKey.newZKey(path.join("test", "groth16", "circuit.r1cs"), ptau_2, {type: "mem"}, logger)) === -1;
        } catch (err) {
            rejected = true;
        }
        assert(rejected, "unprepared ptau (no section 12) must be rejected");
    });

    it ("zkey import bellman rejects a response with fewer contributions", async () => {
        // bellman_1 predates zkey_2's second contribution
        const res = await snarkjs.zKey.importBellman(zkey_2, bellman_1, {type: "mem"}, "stale", logger);
        assert(res === false);
    });

    it ("a tampered bellman response is rejected at import or at verification", async () => {
        // importBellman defers point validation to zkey verification: a
        // tampered response either fails the import's structural checks or
        // produces a zkey that verifyFromR1cs rejects.
        const badBellman = {type: "mem", data: Uint8Array.from(bellman_2.data)};
        // The import re-derives most sections from the previous zkey and only
        // consumes the tail of the response (contributions incl. the delta
        // pubkey), so corrupt there -- a flipped byte at the head of the file
        // sits in bytes the import never reads.
        badBellman.data[badBellman.data.length - 100] ^= 0xFF;
        let rejected = false;
        const imported = {type: "mem"};
        try {
            const res = await snarkjs.zKey.importBellman(zkey_2, badBellman, imported, "tampered", logger);
            if (res === false) {
                rejected = true;
            } else {
                rejected = (await snarkjs.zKey.verifyFromR1cs(
                    path.join("test", "groth16", "circuit.r1cs"), ptau_final, imported, logger)) !== true;
            }
        } catch (err) {
            rejected = true;
        }
        assert(rejected, "tampered bellman response escaped both import and verification");
    });

    it ("zkey verify prints nameless contributions (with logger)", async () => {
        const namelessZkey = {type: "mem"};
        await snarkjs.zKey.contribute(zkey_final, namelessZkey, "", "nameless zkey entropy");
        const res = await snarkjs.zKey.verifyFromR1cs(
            path.join("test", "groth16", "circuit.r1cs"), ptau_final, namelessZkey, logger);
        assert(res === true);
    });

    it ("groth16 prove rejects a zkey with an unknown protocol id", async () => {
        const {fd, sections} = await binFileUtils.readBinFile(
            {type: "mem", data: Uint8Array.from(zkey_final.data)}, "zkey", 2);
        await fd.close();
        const corrupt = {type: "mem", data: Uint8Array.from(zkey_final.data)};
        corrupt.data[sections[1][0].p] = 0x77; // protocol id: not groth16/plonk/fflonk
        await assert.rejects(snarkjs.groth16.prove(corrupt, wtns), /Protocol not supported|not groth16/);
    });

    it ("plonk handles a circuit with purely-linear (-O0) constraints", async () => {
        // gap.r1cs keeps 0*0=C rows: the setup's constraint normalization
        // takes the nullable/join paths that multiplicative rows never hit.
        const zkeyGap = {type: "mem"};
        const res = await snarkjs.plonk.setup(path.join("test", "buildabc_gap", "gap.r1cs"), ptau_final, zkeyGap, logger);
        assert(res !== -1);
        const vKeyGap = await snarkjs.zKey.exportVerificationKey(zkeyGap);
        const wtnsGap = {type: "mem"};
        await snarkjs.wtns.calculate({a: 3, b: 5}, path.join("test", "buildabc_gap", "gap.wasm"), wtnsGap);
        const {proof: proofGap, publicSignals: pubGap} = await snarkjs.plonk.prove(zkeyGap, wtnsGap, logger);
        assert(await snarkjs.plonk.verify(vKeyGap, pubGap, proofGap) === true);
    });

    it ("plonk setup + prove + verify on a tiny circuit (with logger)", async () => {
        // TestPlonk has ~5 constraints: exercises the cirPower < 3 clamp and
        // the small-domain paths, with full logging.
        const zkeyTiny = {type: "mem"};
        const res = await snarkjs.plonk.setup(path.join("test", "plonk_circuit", "circuit.r1cs"), ptau_final, zkeyTiny, logger);
        assert(res !== -1);

        const vKeyTiny = await snarkjs.zKey.exportVerificationKey(zkeyTiny, logger);
        const {proof: tinyProof, publicSignals: tinyPub} = await snarkjs.plonk.prove(
            zkeyTiny, path.join("test", "plonk_circuit", "witness.wtns"), logger);
        assert(await snarkjs.plonk.verify(vKeyTiny, tinyPub, tinyProof, logger) === true);
    });

    it ("plonk verify rejects each malformed commitment point and evaluation", async () => {
        // Every commitment has its own isWellConstructed branch; every
        // evaluation its own evaluationsAreValid branch.
        for (const point of ["B", "C", "Z", "T1", "T2", "T3", "Wxi", "Wxiw"]) {
            const bad = JSON.parse(JSON.stringify(proof));
            bad[point] = [(BigInt(bad[point][0]) + 1n).toString(), bad[point][1], bad[point][2]];
            assert(await snarkjs.plonk.verify(vKey, publicSignals, bad, logger) == false, `off-curve ${point} accepted`);
        }
        const r = curve.r.toString();
        for (const evalName of ["eval_b", "eval_c", "eval_s1", "eval_s2", "eval_zw"]) {
            const bad = JSON.parse(JSON.stringify(proof));
            bad[evalName] = r;
            assert(await snarkjs.plonk.verify(vKey, publicSignals, bad, logger) == false, `out-of-field ${evalName} accepted`);
        }
    });

    it ("zkey verify rejects a zkey built for a different circuit", async () => {
        const res = await snarkjs.zKey.verifyFromR1cs(
            path.join("test", "buildabc_gap", "gap.r1cs"), ptau_final, zkey_final, logger);
        assert(res !== true);
    });

    it ("zkey verify rejects a non-groth16 zkey", async () => {
        let rejected = false;
        try {
            rejected = (await snarkjs.zKey.verifyFromInit(zkey_plonk, ptau_final, zkey_final, logger)) !== true;
        } catch (err) {
            rejected = true;
        }
        assert(rejected);

        // ... and as the candidate zkey too
        let rejected2 = false;
        try {
            rejected2 = (await snarkjs.zKey.verifyFromR1cs(
                path.join("test", "plonk_circuit", "circuit.r1cs"), ptau_final, zkey_plonk, logger)) !== true;
        } catch (err) {
            rejected2 = true;
        }
        assert(rejected2);
    });

    it ("zkey import bellman rejects a response for a different circuit", async () => {
        // bellman_1 was exported from zkey_final (Multiplier(1000)); importing
        // it on top of a zkey for the gap circuit must fail the consistency
        // checks.
        const gapZkey = {type: "mem"};
        await snarkjs.zKey.newZKey(path.join("test", "buildabc_gap", "gap.r1cs"), ptau_final, gapZkey, logger);
        let rejected = false;
        try {
            rejected = (await snarkjs.zKey.importBellman(gapZkey, bellman_2, {type: "mem"}, "bad import", logger)) !== true;
        } catch (err) {
            rejected = true;
        }
        assert(rejected);
    });

    it ("zkey contribute logs its contribution hash (with logger)", async () => {
        const zkeyC = {type: "mem"};
        await snarkjs.zKey.contribute(zkey_final, zkeyC, "LoggedContrib", "logged contribution entropy", logger);
        const res = await snarkjs.zKey.verifyFromR1cs(
            path.join("test", "groth16", "circuit.r1cs"), ptau_final, zkeyC, logger);
        assert(res === true);
    });

    it ("r1cs info logs the header counts (with logger)", async () => {
        const before = logLines.length;
        const cir = await snarkjs.r1cs.info(path.join("test", "groth16", "circuit.r1cs"), logger);
        assert(cir.nConstraints > 0);
        assert(logLines.length > before);
    });

    it ("groth16 verify logs its result (with logger)", async () => {
        const res = await snarkjs.groth16.prove(zkey_final, wtns);
        assert(await snarkjs.groth16.verify(vKeyGroth16, res.publicSignals, res.proof, logger) == true);
        const bad = [...res.publicSignals];
        bad[0] = (BigInt(bad[0]) + 1n).toString();
        assert(await snarkjs.groth16.verify(vKeyGroth16, bad, res.proof, logger) == false);
        assert(logLines.length > 0);
    });

    // ---- fullProve wrappers ---------------------------------------------

    it ("groth16 fullProve computes the witness and a valid proof in one call", async () => {
        const {proof, publicSignals} = await snarkjs.groth16.fullProve(
            {a: 11, b: 2}, path.join("test", "groth16", "circuit.wasm"), zkey_final, logger);
        assert(await snarkjs.groth16.verify(vKeyGroth16, publicSignals, proof) == true);
    });

    it ("plonk fullProve computes the witness and a valid proof in one call", async () => {
        const {proof, publicSignals} = await snarkjs.plonk.fullProve(
            {a: 11, b: 2}, path.join("test", "groth16", "circuit.wasm"), zkey_plonk, logger);
        assert(await snarkjs.plonk.verify(vKey, publicSignals, proof) == true);
    });

    // ---- CLI-facing exporters --------------------------------------------

    it ("groth16 and plonk Solidity calldata exports are well-formed", async () => {
        const g16 = await snarkjs.groth16.prove(zkey_final, wtns);
        const g16CallData = await snarkjs.groth16.exportSolidityCallData(g16.proof, g16.publicSignals);
        assert(typeof g16CallData === "string");
        assert(g16CallData.includes("0x"));
        // groth16 calldata: [a(2)],[b(2x2)],[c(2)],[publics]
        assert.strictEqual((g16CallData.match(/0x/g) || []).length, 8 + g16.publicSignals.length);

        const plonkCallData = await snarkjs.plonk.exportSolidityCallData(proof, publicSignals);
        assert(typeof plonkCallData === "string");
        assert(plonkCallData.includes("0x"));
    });

    it ("exports Solidity verifier contracts for groth16 and plonk zkeys", async () => {
        const templates = {
            groth16: fs.readFileSync(path.join("templates", "verifier_groth16.sol.ejs"), "utf8"),
            plonk: fs.readFileSync(path.join("templates", "verifier_plonk.sol.ejs"), "utf8"),
        };

        const g16Verifier = await snarkjs.zKey.exportSolidityVerifier(zkey_final, templates, logger);
        assert(g16Verifier.includes("contract"));
        assert(g16Verifier.includes("pragma solidity"));

        const plonkVerifier = await snarkjs.zKey.exportSolidityVerifier(zkey_plonk, templates, logger);
        assert(plonkVerifier.includes("contract"));
    });

    it ("zkey exportJson returns the full groth16 proving key structure", async () => {
        const json = await snarkjs.zKey.exportJson(zkey_final);
        assert.strictEqual(json.protocol, "groth16");
        assert(Array.isArray(json.A));
        assert(Array.isArray(json.IC));
        assert(json.IC.length > 0);
    });

    it ("r1cs print and exportJson walk every constraint", async () => {
        const r1csPath = path.join("test", "groth16", "circuit.r1cs");
        const cir = await readR1cs(r1csPath, true, true);
        const syms = await loadSyms(path.join("test", "groth16", "circuit.sym"));
        const before = logLines.length;
        await snarkjs.r1cs.print(cir, syms, logger);
        assert(logLines.length - before >= cir.constraints.length);

        const json = await snarkjs.r1cs.exportJson(r1csPath, logger);
        assert.strictEqual(json.nConstraints, cir.nConstraints);
        assert(Array.isArray(json.constraints));
    });

    it ("wtns exportJson returns the witness values", async () => {
        const w = await snarkjs.wtns.exportJson(wtns);
        assert(w.length > 1);
        assert.strictEqual(w[0].toString(), "1"); // signal ONE
    });

    it ("wtns debug logs signal assignments (set/get/trigger)", async () => {
        // The set/get/trigger hooks only exist in the old (circom v1) wasm
        // witness calculator, so this uses the plonk_circuit fixture.
        const wtnsDebug = {type: "mem"};
        const before = logLines.length;
        await snarkjs.wtns.debug(
            {a: 1, b: 2},
            path.join("test", "plonk_circuit", "circuit.wasm"),
            wtnsDebug,
            path.join("test", "plonk_circuit", "circuit.sym"),
            {set: true, get: true, trigger: true},
            logger
        );
        assert(wtnsDebug.data.byteLength > 0);
        assert(logLines.length > before, "debug run should log signal activity");

        // Each option loads the sym table on demand -- exercise them separately
        await snarkjs.wtns.debug({a: 1, b: 2}, path.join("test", "plonk_circuit", "circuit.wasm"),
            {type: "mem"}, path.join("test", "plonk_circuit", "circuit.sym"), {get: true}, logger);
        await snarkjs.wtns.debug({a: 1, b: 2}, path.join("test", "plonk_circuit", "circuit.wasm"),
            {type: "mem"}, path.join("test", "plonk_circuit", "circuit.sym"), {trigger: true}, logger);
    });

});
