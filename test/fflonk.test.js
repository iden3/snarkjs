import { expect } from "chai";

import * as fflonk from "../src/cmds/fflonk_cmds.js";
import zkeyExportVerificationKey from "../src/zkey_export_verificationkey.js";
import { getCurveFromName } from "../src/curves.js";
import path from "path";
import { utils } from "ffjavascript";
import bfj from "bfj";
import assert from "assert";
import hardhat from "hardhat";
const { ethers, run } = hardhat;

const { stringifyBigInts } = utils;
import * as zkey from "../src/zkey.js";

import fs from "fs";

describe("Fflonk test suite", function () {
    let verifierContract;

    const publicInputsFilename = path.join("test", "fflonk", "public.json");
    const proofFilename = path.join("test", "fflonk", "proof.json");
    const r1csFilename = path.join("test", "fflonk", "circuit.r1cs");
    const ptauFilename = path.join("test", "plonk_circuit", "powersOfTau15_final.ptau");
    const zkeyFilename = path.join("test", "fflonk", "circuit.zkey");
    const wtnsFilename = path.join("test", "fflonk", "witness.wtns");
    const vkeyFilename = path.join("test", "fflonk", "circuit_vk.json");
    const solidityVerifierFilename = path.join("test", "smart_contracts", "contracts", "fflonk.sol");

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
        await fflonk.fflonkSetupCmd(r1csFilename, ptauFilename, zkeyFilename);

        // flonk prove
        await fflonk.fflonkProveCmd(zkeyFilename, wtnsFilename, publicInputsFilename, proofFilename);

        // export verification key
        const vKey = await zkeyExportVerificationKey(zkeyFilename);
        await bfj.write(vkeyFilename, stringifyBigInts(vKey), { space: 1 });

        // Verify the proof
        const isValid = await fflonk.fflonkVerifyCmd(vkeyFilename, publicInputsFilename, proofFilename);

        assert(isValid);
    });

    it("fflonk smart contract", async () => {
        // Check node version to avoid an error in node < 14
        // due to coallesce operator is used inside hardhat library but is not supported in node 13 or lower
        if(process.version.substring(1,3) >= 14) {
            // Load fflonk template
            const templates = {};
            templates.fflonk = await fs.promises.readFile(path.join("templates", "verifier_fflonk.sol.ejs"), "utf8");

            // Generate fflonk verifier solidity file from fflonk template + zkey
            const verifierCode = await zkey.exportSolidityVerifier(zkeyFilename, templates);
            fs.writeFileSync(solidityVerifierFilename, verifierCode, "utf-8");

            // Compile the fflonk verifier smart contract
            await run("compile");

            // Deploy mock fflonk verifier
            const VerifierFactory = await ethers.getContractFactory("FflonkVerifier");
            verifierContract = await VerifierFactory.deploy();

            // Read last test generated fflonk proof & public inputs
            const proofJson = JSON.parse(await fs.promises.readFile(proofFilename, "utf8"));
            const publicInputs = JSON.parse(await fs.promises.readFile(publicInputsFilename, "utf8"));

            // Verifiy the proof in the smart contract
            const proof = generateSolidityInputs(proofJson);
            expect(await verifierContract.verifyProof(proof, publicInputs)).to.be.equal(true);
        } else {
            console.log("Skipping fflonk smart contract test, node version < 14");
        }
    });
});

function generateSolidityInputs(proofJson) {
    const { evaluations, polynomials } = proofJson;

    const arrayStrings = Array(24).fill("bytes32");

    const proof = ethers.utils.defaultAbiCoder.encode(
        arrayStrings,
        [
            ethers.utils.hexZeroPad(ethers.BigNumber.from(polynomials.C1[0]).toHexString(), 32),
            ethers.utils.hexZeroPad(ethers.BigNumber.from(polynomials.C1[1]).toHexString(), 32),
            ethers.utils.hexZeroPad(ethers.BigNumber.from(polynomials.C2[0]).toHexString(), 32),
            ethers.utils.hexZeroPad(ethers.BigNumber.from(polynomials.C2[1]).toHexString(), 32),
            ethers.utils.hexZeroPad(ethers.BigNumber.from(polynomials.W1[0]).toHexString(), 32),
            ethers.utils.hexZeroPad(ethers.BigNumber.from(polynomials.W1[1]).toHexString(), 32),
            ethers.utils.hexZeroPad(ethers.BigNumber.from(polynomials.W2[0]).toHexString(), 32),
            ethers.utils.hexZeroPad(ethers.BigNumber.from(polynomials.W2[1]).toHexString(), 32),
            ethers.utils.hexZeroPad(ethers.BigNumber.from(evaluations.ql).toHexString(), 32),
            ethers.utils.hexZeroPad(ethers.BigNumber.from(evaluations.qr).toHexString(), 32),
            ethers.utils.hexZeroPad(ethers.BigNumber.from(evaluations.qm).toHexString(), 32),
            ethers.utils.hexZeroPad(ethers.BigNumber.from(evaluations.qo).toHexString(), 32),
            ethers.utils.hexZeroPad(ethers.BigNumber.from(evaluations.qc).toHexString(), 32),
            ethers.utils.hexZeroPad(ethers.BigNumber.from(evaluations.s1).toHexString(), 32),
            ethers.utils.hexZeroPad(ethers.BigNumber.from(evaluations.s2).toHexString(), 32),
            ethers.utils.hexZeroPad(ethers.BigNumber.from(evaluations.s3).toHexString(), 32),
            ethers.utils.hexZeroPad(ethers.BigNumber.from(evaluations.a).toHexString(), 32),
            ethers.utils.hexZeroPad(ethers.BigNumber.from(evaluations.b).toHexString(), 32),
            ethers.utils.hexZeroPad(ethers.BigNumber.from(evaluations.c).toHexString(), 32),
            ethers.utils.hexZeroPad(ethers.BigNumber.from(evaluations.z).toHexString(), 32),
            ethers.utils.hexZeroPad(ethers.BigNumber.from(evaluations.zw).toHexString(), 32),
            ethers.utils.hexZeroPad(ethers.BigNumber.from(evaluations.t1w).toHexString(), 32),
            ethers.utils.hexZeroPad(ethers.BigNumber.from(evaluations.t2w).toHexString(), 32),
            ethers.utils.hexZeroPad(ethers.BigNumber.from(evaluations.inv).toHexString(), 32),
        ],
    );

    return proof;
}