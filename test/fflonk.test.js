import * as fflonk from "../src/fflonk.js";
import zkeyExportVerificationKey from "../src/zkey_export_verificationkey.js";
import { getCurveFromName } from "../src/curves.js";
import path from "path";
import bfj from "bfj";
import assert from "assert";

import { utils } from "ffjavascript";
const { stringifyBigInts } = utils;


describe("Fflonk test suite", function () {
    const publicInputsFilename = path.join("test", "fflonk", "public.json");
    const proofFilename = path.join("test", "fflonk", "proof.json");
    const r1csFilename = path.join("test", "fflonk", "circuit.r1cs");
    const ptauFilename = path.join("test", "plonk_circuit", "powersOfTau15_final.ptau");
    const zkeyFilename = path.join("test", "fflonk", "circuit.zkey");
    const wtnsFilename = path.join("test", "fflonk", "witness.wtns");
    const vkeyFilename = path.join("test", "fflonk", "circuit_vk.json");

    this.timeout(1000000000);

    let curve;

    before(async () => {
        curve = await getCurveFromName("bn128");
    });

    after(async () => {
        await curve.terminate();
    });

    it("fflonk full prove", async () => {
        // fflonk setup
        await fflonk.setup(r1csFilename, ptauFilename, zkeyFilename);

        // flonk prove
        const {proof, publicSignals} = await fflonk.prove(zkeyFilename, wtnsFilename);

        // export verification key
        const vKey = await zkeyExportVerificationKey(zkeyFilename);
        await bfj.write(vkeyFilename, stringifyBigInts(vKey), { space: 1 });

        // Verify the proof
        const isValid = await fflonk.verify(vKey, publicSignals, proof);

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
});