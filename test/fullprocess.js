import * as snarkjs from "../main.js";
import { getCurveFromName } from "../src/curves.js";
import assert from "assert";
import path from "path";

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

});
