import * as fflonk from "../src/cmds/fflonk_cmds.js";
import zkeyExportVerificationKey from "../src/zkey_export_verificationkey.js";
import {getCurveFromName} from "../src/curves.js";
import path from "path";
import {utils} from "ffjavascript";
import bfj from "bfj";
import assert from "assert";

const {stringifyBigInts} = utils;


describe("Fflonk test suite", function () {
    this.timeout(1000000000);

    let curve;

    before(async () => {
        curve = await getCurveFromName("bn128");
    });

    after(async () => {
        await curve.terminate();
    });

    it("fflonk full prove", async () => {
        const r1csFilename = path.join("test", "fflonk", "circuit.r1cs");
        const ptauFilename = path.join("test", "plonk_circuit", "powersOfTau15_final.ptau");
        const zkeyFilename = path.join("test", "fflonk", "circuit.zkey");
        const wtnsFilename = path.join("test", "fflonk", "witness.wtns");
        const publicInputsFilename = path.join("test", "fflonk", "public.json");
        const proofFilename = path.join("test", "fflonk", "proof.json");
        const vkeyFilename = path.join("test", "fflonk", "circuit_vk.json");

        // fflonk setup
        await fflonk.fflonkSetupCmd(r1csFilename, ptauFilename, zkeyFilename);

        // flonk prove
        await fflonk.fflonkProveCmd(zkeyFilename, wtnsFilename, publicInputsFilename, proofFilename);

        // export verification key
        const vKey = await zkeyExportVerificationKey(zkeyFilename);
        await bfj.write(vkeyFilename, stringifyBigInts(vKey), {space: 1});

        // Verify the proof
        const isValid = await fflonk.fflonkVerifyCmd(vkeyFilename, publicInputsFilename, proofFilename);
        assert(isValid);
    });
});
