import { expect } from "chai";

import { getCurveFromName } from "../src/curves.js";
import path from "path";
import hardhat from "hardhat";
const { ethers, run } = hardhat;

import * as zkey from "../src/zkey.js";

import fs from "fs";

describe("Smart contracts test suite", function () {
    this.timeout(1000000000);

    let verifierContract;
    let curve;

    before(async () => {
        curve = await getCurveFromName("bn128");
    });

    after(async () => {
        await curve.terminate();
    });

    it("Groth16 smart contract", async () => {
        const publicInputsFilename = path.join("test", "groth16", "public.json");
        const proofFilename = path.join("test", "groth16", "proof.json");
        const zkeyFilename = path.join("test", "groth16", "circuit.zkey");
        const solidityVerifierFilename = path.join("test", "smart_contracts", "contracts", "groth16.sol");

        // Load Groth16 template
        const templates = {};
        templates.groth16 = fs.readFileSync(path.join("templates", "verifier_groth16.sol.ejs"), "utf8");

        // Generate groth16 verifier solidity file from groth16 template + zkey
        const verifierCode = await zkey.exportSolidityVerifier(zkeyFilename, templates);
        fs.writeFileSync(solidityVerifierFilename, verifierCode, "utf-8");

        // Compile the groth16 verifier smart contract
        await run("compile");

        // Deploy mock groth16 verifier
        const VerifierFactory = await ethers.getContractFactory("Verifier");
        verifierContract = await VerifierFactory.deploy();

        // Read last test generated groth16 proof & public inputs
        const proofJson = JSON.parse(fs.readFileSync(proofFilename, "utf8"));
        const publicInputs = JSON.parse(fs.readFileSync(publicInputsFilename, "utf8"));

        const proofA = [proofJson.pi_a[0], proofJson.pi_a[1]];
        const proofB = [
            [proofJson.pi_b[0][1], proofJson.pi_b[0][0]],
            [proofJson.pi_b[1][1], proofJson.pi_b[1][0]],
        ];
        const proofC = [proofJson.pi_c[0], proofJson.pi_c[1]];

        // Verifiy the proof in the smart contract
        expect(await verifierContract.verifyProof(proofA, proofB, proofC, publicInputs)).to.be.equal(true);
    });

    it("plonk smart contract", async () => {
        const publicInputsFilename = path.join("test", "plonk_circuit", "public.json");
        const proofFilename = path.join("test", "plonk_circuit", "proof.json");
        const zkeyFilename = path.join("test", "plonk_circuit", "circuit.zkey");
        const solidityVerifierFilename = path.join("test", "smart_contracts", "contracts", "plonk.sol");

        // Load plonk template
        const templates = {};
        templates.plonk = await fs.promises.readFile(path.join("templates", "verifier_plonk.sol.ejs"), "utf8");

        // Generate plonk verifier solidity file from plonk template + zkey
        const verifierCode = await zkey.exportSolidityVerifier(zkeyFilename, templates);
        fs.writeFileSync(solidityVerifierFilename, verifierCode, "utf-8");

        // Compile the plonk verifier smart contract
        await run("compile");

        // Deploy mock plonk verifier
        const VerifierFactory = await ethers.getContractFactory("PlonkVerifier");
        verifierContract = await VerifierFactory.deploy();

        // Read last test generated plonk proof & public inputs
        const proofJson = JSON.parse(await fs.promises.readFile(proofFilename, "utf8"));
        const publicInputs = JSON.parse(await fs.promises.readFile(publicInputsFilename, "utf8"));

        // Verifiy the proof in the smart contract
        const arrayStrings = Array(25).fill("bytes32");
        const proof = ethers.utils.defaultAbiCoder.encode(
            arrayStrings,
            [
                ethers.utils.hexZeroPad(ethers.BigNumber.from(proofJson.A[0]).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(proofJson.A[1]).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(proofJson.B[0]).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(proofJson.B[1]).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(proofJson.C[0]).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(proofJson.C[1]).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(proofJson.Z[0]).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(proofJson.Z[1]).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(proofJson.T1[0]).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(proofJson.T1[1]).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(proofJson.T2[0]).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(proofJson.T2[1]).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(proofJson.T3[0]).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(proofJson.T3[1]).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(proofJson.Wxi[0]).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(proofJson.Wxi[1]).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(proofJson.Wxiw[0]).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(proofJson.Wxiw[1]).toHexString(), 32),

                ethers.utils.hexZeroPad(ethers.BigNumber.from(proofJson.eval_a).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(proofJson.eval_b).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(proofJson.eval_c).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(proofJson.eval_s1).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(proofJson.eval_s2).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(proofJson.eval_zw).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(proofJson.eval_r).toHexString(), 32),
            ],
        );

        expect(await verifierContract.verifyProof(proof, publicInputs)).to.be.equal(true);
    });

    it("fflonk smart contract", async () => {
        const publicInputsFilename = path.join("test", "fflonk", "public.json");
        const proofFilename = path.join("test", "fflonk", "proof.json");
        const zkeyFilename = path.join("test", "fflonk", "circuit.zkey");
        const solidityVerifierFilename = path.join("test", "smart_contracts", "contracts", "fflonk.sol");

        // Load fflonk template
        const templates = {};
        templates.fflonk = fs.readFileSync(path.join("templates", "verifier_fflonk.sol.ejs"), "utf8");

        // Generate fflonk verifier solidity file from fflonk template + zkey
        const verifierCode = await zkey.exportSolidityVerifier(zkeyFilename, templates);
        fs.writeFileSync(solidityVerifierFilename, verifierCode, "utf-8");

        // Compile the fflonk verifier smart contract
        await run("compile");

        // Deploy mock fflonk verifier
        const VerifierFactory = await ethers.getContractFactory("FflonkVerifier");
        verifierContract = await VerifierFactory.deploy();

        // Read last test generated fflonk proof & public inputs
        const proofJson = JSON.parse(fs.readFileSync(proofFilename, "utf8"));
        const publicInputs = JSON.parse(fs.readFileSync(publicInputsFilename, "utf8"));

        // Verifiy the proof in the smart contract
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

        expect(await verifierContract.verifyProof(proof, publicInputs)).to.be.equal(true);
    });
});