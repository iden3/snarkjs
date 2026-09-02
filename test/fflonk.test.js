import * as fflonk from "../src/fflonk.js";
import zkeyExportVerificationKey from "../src/zkey_export_verificationkey.js";
import zkeyExportSolidityVerifier from "../src/zkey_export_solidityverifier.js";
import { getCurveFromName } from "../src/curves.js";
import path from "path";
import fs from "fs";
import { writeJsonFile } from "../src/json_writer.js";
import assert from "assert";

import { utils } from "ffjavascript";
const { stringifyBigInts } = utils;


describe("Fflonk test suite", function () {
    const _publicInputsFilename = path.join("test", "fflonk", "public.json");
    const _proofFilename = path.join("test", "fflonk", "proof.json");
    const r1csFilename = path.join("test", "fflonk", "circuit.r1cs");
    const ptauFilename = path.join("test", "plonk_circuit", "powersOfTau15_final.ptau");
    const zkeyFilename = path.join("test", "fflonk", "circuit.zkey");
    const wtnsFilename = path.join("test", "fflonk", "witness.wtns");
    const vkeyFilename = path.join("test", "fflonk", "circuit_vk.json");



    let curve;

    beforeAll(async () => {
        curve = await getCurveFromName("bn128");
    });

    afterAll(async () => {
        await curve.terminate();
    });

    // Collecting logger: silences output while covering the logger-guarded
    // info/debug lines in setup, prove and verify.
    const logLines = [];
    const logger = {
        info: (...a) => logLines.push(a.join(" ")),
        debug: (...a) => logLines.push(a.join(" ")),
        warn: (...a) => logLines.push(a.join(" ")),
        error: (...a) => logLines.push(a.join(" ")),
        log: (...a) => logLines.push(a.join(" ")),
    };

    let vKey;
    let proof;
    let publicSignals;

    it("fflonk full prove", async () => {
        // fflonk setup
        await fflonk.setup(r1csFilename, ptauFilename, zkeyFilename, logger);

        // flonk prove
        ({proof, publicSignals} = await fflonk.prove(zkeyFilename, wtnsFilename, logger));

        // export verification key
        vKey = await zkeyExportVerificationKey(zkeyFilename);
        await writeJsonFile(vkeyFilename, stringifyBigInts(vKey));

        // Verify the proof
        const isValid = await fflonk.verify(vKey, publicSignals, proof, logger);

        assert(isValid);

        // Tamper with the sole public signal: verify must reject, not throw.
        // (Regression test: fflonkVerify used to call logger.error() unguarded
        // when the public-signal count didn't match, throwing a TypeError
        // when no logger was passed -- exactly how this test calls verify.)
        const tamperedPublicSignals = [...publicSignals];
        tamperedPublicSignals[0] = (BigInt(publicSignals[0]) + 1n).toString();
        const isValidTampered = await fflonk.verify(vKey, tamperedPublicSignals, proof);
        assert(!isValidTampered);

        // Wrong number of public signals must also be rejected, not throw.
        const isValidWrongCount = await fflonk.verify(vKey, [...publicSignals, "1"], proof);
        assert(!isValidWrongCount);
    });

    it("fflonk fullProve computes the witness and a valid proof in one call", async () => {
        // test/fflonk/circuit.wasm is stale (it no longer matches
        // circuit.r1cs), so fullProve runs on the plonk_circuit fixture,
        // whose r1cs and (circom v1) wasm are consistent.
        const r1cs = path.join("test", "plonk_circuit", "circuit.r1cs");
        const wasm = path.join("test", "plonk_circuit", "circuit.wasm");
        const zkeyMem = {type: "mem"};
        await fflonk.setup(r1cs, ptauFilename, zkeyMem, logger);
        const fullVKey = await zkeyExportVerificationKey(zkeyMem);

        const res = await fflonk.fullProve({a: 1, b: 2}, wasm, zkeyMem, logger);
        assert(await fflonk.verify(fullVKey, res.publicSignals, res.proof) === true);
    });

    it("fflonk verify rejects out-of-field evaluations and public inputs (with logger)", async () => {
        const r = curve.r.toString();

        const badEval = JSON.parse(JSON.stringify(proof));
        badEval.evaluations.a = r; // >= field modulus
        assert(await fflonk.verify(vKey, publicSignals, badEval, logger) === false);

        assert(await fflonk.verify(vKey, [r], proof, logger) === false);

        // Wrong public-signal count, with the logger attached
        assert(await fflonk.verify(vKey, [...publicSignals, "1"], proof, logger) === false);

        // Off-curve polynomial commitment
        const badCommitment = JSON.parse(JSON.stringify(proof));
        badCommitment.polynomials.C1 = [
            (BigInt(badCommitment.polynomials.C1[0]) + 1n).toString(),
            badCommitment.polynomials.C1[1],
            badCommitment.polynomials.C1[2],
        ];
        assert(await fflonk.verify(vKey, publicSignals, badCommitment, logger) === false);
    });

    it("fflonk handles a circuit with purely-linear (-O0) constraints", async () => {
        // gap.r1cs keeps 0*0=C rows: exercises the nullable/constant paths of
        // the fflonk constraint processor.
        const snarkjs = await import("../main.js");
        const zkeyGap = {type: "mem"};
        await fflonk.setup(path.join("test", "buildabc_gap", "gap.r1cs"), ptauFilename, zkeyGap, logger);
        const vKeyGap = await zkeyExportVerificationKey(zkeyGap);
        const wtnsGap = {type: "mem"};
        await snarkjs.wtns.calculate({a: 3, b: 5}, path.join("test", "buildabc_gap", "gap.wasm"), wtnsGap);
        const res = await fflonk.prove(zkeyGap, wtnsGap, logger);
        assert(await fflonk.verify(vKeyGap, res.publicSignals, res.proof) === true);
    });

    it("fflonk prove rejects a witness from the wrong curve", async () => {
        const binFileUtils = await import("@iden3/binfileutils");
        const wtnsUtils = await import("../src/wtns_utils.js");
        const { Scalar } = await import("ffjavascript");
        const bls12381r = Scalar.e("73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001", 16);

        const blsWtns = {type: "mem"};
        const fd = await binFileUtils.createBinFile(blsWtns, "wtns", 2, 2);
        await wtnsUtils.write(fd, [1n, 2n, 3n], bls12381r);
        await fd.close();

        await assert.rejects(fflonk.prove(zkeyFilename, blsWtns), /witness does not match/);
    });

    it("fflonk prove rejects a non-fflonk zkey and a wrong-length witness", async () => {
        // A plonk zkey must be rejected by the protocol guard
        await assert.rejects(
            fflonk.prove(path.join("test", "plonk_circuit", "circuit.zkey"), wtnsFilename),
            /not fflonk/);

        // A witness for a different circuit fails the length check
        await assert.rejects(
            fflonk.prove(zkeyFilename, path.join("test", "plonk_circuit", "witness.wtns")),
            /Invalid witness length/);
    });

    it("fflonk setup rejects an unprepared, wrong-curve or too-small ptau", async () => {
        const snarkjs = await import("../main.js");

        // Unprepared: no Lagrange sections
        const raw = {type: "mem"};
        await snarkjs.powersOfTau.newAccumulator(curve, 3, raw);
        await assert.rejects(fflonk.setup(r1csFilename, raw, {type: "mem"}, logger), /not well prepared/);

        // Prepared but far too small for the fflonk domain blow-up
        const tiny = {type: "mem"};
        await snarkjs.powersOfTau.preparePhase2(raw, tiny);
        await assert.rejects(fflonk.setup(r1csFilename, tiny, {type: "mem"}, logger));

        // Wrong curve
        const blsCurve = await (await import("../src/curves.js")).getCurveFromName("bls12381");
        try {
            const blsPtau = {type: "mem"};
            await snarkjs.powersOfTau.newAccumulator(blsCurve, 3, blsPtau);
            const blsPrepared = {type: "mem"};
            await snarkjs.powersOfTau.preparePhase2(blsPtau, blsPrepared);
            await assert.rejects(fflonk.setup(r1csFilename, blsPrepared, {type: "mem"}, logger), /does not match/);
        } finally {
            await blsCurve.terminate();
        }
    });

    it("fflonk Solidity calldata export is well-formed", async () => {
        const callData = await fflonk.exportSolidityCallData(publicSignals, proof);
        assert(typeof callData === "string");
        assert(callData.includes("0x"));
    });

    it("fflonk Solidity verifier export renders the contract", async () => {
        const templates = {
            fflonk: fs.readFileSync(path.join("templates", "verifier_fflonk.sol.ejs"), "utf8"),
        };
        // Route through the generic zkey exporter to also cover its
        // protocol dispatch into the fflonk-specific exporter.
        const verifierCode = await zkeyExportSolidityVerifier(zkeyFilename, templates, logger);
        assert(verifierCode.includes("contract"));
        assert(verifierCode.includes("pragma solidity"));
    });
});