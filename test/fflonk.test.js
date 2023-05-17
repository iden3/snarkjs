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
    });
});