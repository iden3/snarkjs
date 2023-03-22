import { expect } from "chai";

import { getCurveFromName } from "../src/curves.js";
import path from "path";
import hardhat from "hardhat";
const { ethers, run } = hardhat;

import * as zkey from "../src/zkey.js";

import * as snarkjs from "../main.js";

import fs from "fs";

describe("Smart contracts test suite", function () {
    this.timeout(1000000000);

    const ptauFilename = path.join("test", "plonk_circuit", "powersOfTau15_final.ptau");

    // Load templates
    const templates = {};
    templates.groth16 = fs.readFileSync(path.join("templates", "verifier_groth16.sol.ejs"), "utf8");
    templates.plonk = fs.readFileSync(path.join("templates", "verifier_plonk.sol.ejs"), "utf8");
    templates.fflonk = fs.readFileSync(path.join("templates", "verifier_fflonk.sol.ejs"), "utf8");

    let verifierContract;
    let curve;

    before(async () => {
        curve = await getCurveFromName("bn128");
    });

    after(async () => {
        await curve.terminate();
    });

    it("Groth16 smart contract", async () => {
        const solidityVerifierFilename = path.join("test", "smart_contracts", "contracts", "groth16.sol");

        const r1csFilename = path.join("test", "groth16", "circuit.r1cs");
        const wtnsFilename = path.join("test", "groth16", "witness.wtns");
        const zkeyFilename = { type: "mem" };

        await snarkjs.zKey.newZKey(r1csFilename, ptauFilename, zkeyFilename);
        const { proof: proof, publicSignals: publicInputs } = await snarkjs.groth16.prove(zkeyFilename, wtnsFilename);

        const proofA = [proof.pi_a[0], proof.pi_a[1]];
        const proofB = [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]];
        const proofC = [proof.pi_c[0], proof.pi_c[1]];

        // Generate groth16 verifier solidity file from groth16 template + zkey
        const verifierCode = await zkey.exportSolidityVerifier(zkeyFilename, templates);
        fs.writeFileSync(solidityVerifierFilename, verifierCode, "utf-8");

        // Compile the groth16 verifier smart contract
        await run("compile");

        // Deploy mock groth16 verifier
        const VerifierFactory = await ethers.getContractFactory("Verifier");
        verifierContract = await VerifierFactory.deploy();

        // Verifiy the proof in the smart contract
        expect(await verifierContract.verifyProof(proofA, proofB, proofC, publicInputs)).to.be.equal(true);
    });

    it("plonk smart contract", async () => {
        const solidityVerifierFilename = path.join("test", "smart_contracts", "contracts", "plonk.sol");

        const r1csFilename = path.join("test", "plonk_circuit", "circuit.r1cs");
        const wtnsFilename = path.join("test", "plonk_circuit", "witness.wtns");
        const zkeyFilename = { type: "mem" };

        await snarkjs.plonk.setup(r1csFilename, ptauFilename, zkeyFilename);
        const { proof: proofJson, publicSignals: publicInputs } = await snarkjs.plonk.prove(zkeyFilename, wtnsFilename);

        // Generate plonk verifier solidity file from plonk template + zkey
        const verifierCode = await zkey.exportSolidityVerifier(zkeyFilename, templates);
        fs.writeFileSync(solidityVerifierFilename, verifierCode, "utf-8");

        // Compile the plonk verifier smart contract
        await run("compile");

        // Deploy mock plonk verifier
        const VerifierFactory = await ethers.getContractFactory("PlonkVerifier");
        verifierContract = await VerifierFactory.deploy();

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
        const solidityVerifierFilename = path.join("test", "smart_contracts", "contracts", "fflonk.sol");

        const r1csFilename = path.join("test", "fflonk", "circuit.r1cs");
        const wtnsFilename = path.join("test", "fflonk", "witness.wtns");
        const zkeyFilename = { type: "mem" };

        await snarkjs.fflonk.fflonkSetupCmd(r1csFilename, ptauFilename, zkeyFilename);
        const { proof: proofJson, publicSignals: publicInputs } = await snarkjs.fflonk.fflonkProveCmd(zkeyFilename, wtnsFilename);

        // Generate fflonk verifier solidity file from fflonk template + zkey
        const verifierCode = await zkey.exportSolidityVerifier(zkeyFilename, templates);
        fs.writeFileSync(solidityVerifierFilename, verifierCode, "utf-8");

        // Compile the fflonk verifier smart contract
        await run("compile");

        // Deploy mock fflonk verifier
        const VerifierFactory = await ethers.getContractFactory("FflonkVerifier");
        verifierContract = await VerifierFactory.deploy();

        // Verifiy the proof in the smart contract
        const { evaluations, polynomials } = proofJson;

        const proof = 
            [
                ethers.utils.hexZeroPad(ethers.BigNumber.from(polynomials.f1[0]).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(polynomials.f1[1]).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(polynomials.f2[0]).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(polynomials.f2[1]).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(polynomials.W[0]).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(polynomials.W[1]).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(polynomials.Wp[0]).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(polynomials.Wp[1]).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(evaluations.QL).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(evaluations.QR).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(evaluations.QM).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(evaluations.QO).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(evaluations.QC).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(evaluations.Sigma1).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(evaluations.Sigma2).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(evaluations.Sigma3).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(evaluations.A).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(evaluations.B).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(evaluations.C).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(evaluations.Z).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(evaluations.Zw).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(evaluations.T1w).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(evaluations.T2w).toHexString(), 32),
                ethers.utils.hexZeroPad(ethers.BigNumber.from(evaluations.inv).toHexString(), 32),
            ];

        expect(await verifierContract.verifyProof(proof, publicInputs)).to.be.equal(true);
    });
});