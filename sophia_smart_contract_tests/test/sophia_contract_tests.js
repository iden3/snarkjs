import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { utils } = require('@aeternity/aeproject');

import path from "path";
import fs from "fs";
import { assert } from "chai";
import { buildBls12381 } from "ffjavascript";
import * as snarkjs from "snarkjs";

describe('SophiaContracts', () => {
    let aeSdk;
    let contract;

    const ptauFilename = path.join("./input", "pot11_bls12381_final.ptau");

    // Load template(s)
    const templates = {};
    templates.groth16 = fs.readFileSync(path.join("../templates", "verifier_groth16.aes.ejs"), "utf8");

    let verifierContract;
    let curve;

    before(async () => {
        aeSdk = utils.getSdk();

        // create a snapshot of the blockchain state
        await utils.createSnapshot(aeSdk);

        await utils.awaitKeyBlocks(aeSdk, 1);

        // create folder for contracts
        await fs.promises.mkdir("contracts", {recursive: true});

        // initialize curve
        curve = await buildBls12381();
    });

    // after each test roll back to initial state
    afterEach(async () => {
        await utils.rollbackSnapshot(aeSdk);
        await curve.terminate();
    });

    it("Groth16 smart contract with 2 inputs", async () => {
        const res = await groth16Verify(path.join("./input", "circuit2.r1cs"), path.join("./input", "witness2.wtns"));
        assert.equal(res.decodedResult, true);
    });

    it("Groth16 smart contract 3 inputs", async () => {
        const res = await groth16Verify(path.join("./input", "circuit3.r1cs"), path.join("./input", "witness3.wtns"));
        assert.equal(res.decodedResult, true);
    });

    async function groth16Verify(r1csFilename, wtnsFilename) {
        const sophiaVerifierFilename = path.join("contracts", "groth16.aes");

        const zkeyFilename = { type: "mem" };

        await snarkjs.zKey.newZKey(r1csFilename, ptauFilename, zkeyFilename);
        const { proof: proof, publicSignals: publicInputs } = await snarkjs.groth16.prove(zkeyFilename, wtnsFilename);

        const theProof = {a: [proof.pi_a[0], proof.pi_a[1]],
                          b: [[proof.pi_b[0][0], proof.pi_b[0][1]], [proof.pi_b[1][0], proof.pi_b[1][1]]],
                          c: [proof.pi_c[0], proof.pi_c[1]]};


        // Generate groth16 verifier solidity file from groth16 template + zkey
        const verifierCode = await snarkjs.zKey.exportSophiaVerifier(zkeyFilename, templates);
        fs.writeFileSync(sophiaVerifierFilename, verifierCode, "utf-8");

        // a filesystem object must be passed to the compiler if the contract uses custom includes
        const fileSystem = utils.getFilesystem(sophiaVerifierFilename);

        // initialize the contract instance
        const sourceCode = utils.getContractContent(sophiaVerifierFilename);
        contract = await aeSdk.initializeContract({ sourceCode, fileSystem });

        await contract.$deploy([]);

        return await contract.verify(publicInputs, theProof);
    }
});
