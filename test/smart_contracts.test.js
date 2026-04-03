import * as snarkjs from "../main.js";
import { buildBn128 } from "ffjavascript";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { zeroPadValue, toBeHex } from "ethers";
import { tasks, network, artifacts } from "hardhat";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const TEST_DIR = path.join(ROOT, "test");
const CONTRACTS_DIR = path.join(ROOT, "contracts");

const PTAU = path.join(TEST_DIR, "plonk_circuit", "powersOfTau15_final.ptau");

// BN128 curve order — used to construct aliased (out-of-range) public inputs
const BN128_ORDER = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

// Encode an array of field elements as 32-byte big-endian hex strings (ethers v6)
function encodeFields(fields) {
    return fields.map((f) => zeroPadValue(toBeHex(BigInt(f)), 32));
}

// --------------------------------------------------------------------------
// Verifier helpers: generate Solidity verifier, compile, deploy, and verify
// --------------------------------------------------------------------------

async function groth16Verify(r1csFilename, wtnsFilename) {
    const zkeyFilename = { type: "mem" };
    await snarkjs.zKey.newZKey(r1csFilename, PTAU, zkeyFilename);

    const { proof, publicSignals } = await snarkjs.groth16.prove(zkeyFilename, wtnsFilename);

    const templates = loadTemplates();
    fs.writeFileSync(
        path.join(CONTRACTS_DIR, "Groth16Verifier.sol"),
        await snarkjs.zKey.exportSolidityVerifier(zkeyFilename, templates),
        "utf-8"
    );

    await tasks.getTask("compile").run();
    await artifacts.clearCache();
    const { ethers } = await network.connect();
    const verifier = await (await ethers.getContractFactory("Groth16Verifier")).deploy();

    return verifier.verifyProof(
        [proof.pi_a[0], proof.pi_a[1]],
        [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]],
        [proof.pi_c[0], proof.pi_c[1]],
        publicSignals
    );
}

async function groth16VerifyAliased(r1csFilename, wtnsFilename) {
    const zkeyFilename = { type: "mem" };
    await snarkjs.zKey.newZKey(r1csFilename, PTAU, zkeyFilename);

    const { proof, publicSignals } = await snarkjs.groth16.prove(zkeyFilename, wtnsFilename);

    const templates = loadTemplates();
    fs.writeFileSync(
        path.join(CONTRACTS_DIR, "Groth16Verifier.sol"),
        await snarkjs.zKey.exportSolidityVerifier(zkeyFilename, templates),
        "utf-8"
    );

    await tasks.getTask("compile").run();
    await artifacts.clearCache();
    const { ethers } = await network.connect();
    const verifier = await (await ethers.getContractFactory("Groth16Verifier")).deploy();

    // Shift the second public signal by the curve order — verifier must reject this
    const aliasedSignals = [...publicSignals];
    aliasedSignals[1] = BigInt(publicSignals[1]) + BN128_ORDER;

    return verifier.verifyProof(
        [proof.pi_a[0], proof.pi_a[1]],
        [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]],
        [proof.pi_c[0], proof.pi_c[1]],
        aliasedSignals
    );
}

async function plonkVerify(r1csFilename, wtnsFilename) {
    const zkeyFilename = { type: "mem" };
    await snarkjs.plonk.setup(r1csFilename, PTAU, zkeyFilename);

    const { proof: p, publicSignals } = await snarkjs.plonk.prove(zkeyFilename, wtnsFilename);

    const templates = loadTemplates();
    fs.writeFileSync(
        path.join(CONTRACTS_DIR, "PlonkVerifier.sol"),
        await snarkjs.zKey.exportSolidityVerifier(zkeyFilename, templates),
        "utf-8"
    );

    await tasks.getTask("compile").run();
    await artifacts.clearCache();
    const { ethers } = await network.connect();
    const verifier = await (await ethers.getContractFactory("PlonkVerifier")).deploy();

    const proof = encodeFields([
        p.A[0], p.A[1],
        p.B[0], p.B[1],
        p.C[0], p.C[1],
        p.Z[0], p.Z[1],
        p.T1[0], p.T1[1],
        p.T2[0], p.T2[1],
        p.T3[0], p.T3[1],
        p.Wxi[0], p.Wxi[1],
        p.Wxiw[0], p.Wxiw[1],
        p.eval_a, p.eval_b, p.eval_c,
        p.eval_s1, p.eval_s2, p.eval_zw,
    ]);

    return verifier.verifyProof(proof, publicSignals);
}

async function fflonkVerify(r1csFilename, wtnsFilename) {
    const zkeyFilename = { type: "mem" };
    await snarkjs.fflonk.setup(r1csFilename, PTAU, zkeyFilename);

    const { proof: p, publicSignals } = await snarkjs.fflonk.prove(zkeyFilename, wtnsFilename);

    const templates = loadTemplates();
    fs.writeFileSync(
        path.join(CONTRACTS_DIR, "FflonkVerifier.sol"),
        await snarkjs.zKey.exportSolidityVerifier(zkeyFilename, templates),
        "utf-8"
    );

    await tasks.getTask("compile").run();
    await artifacts.clearCache();
    const { ethers } = await network.connect();
    const verifier = await (await ethers.getContractFactory("FflonkVerifier")).deploy();

    const { evaluations: e, polynomials: poly } = p;
    const proof = encodeFields([
        poly.C1[0], poly.C1[1],
        poly.C2[0], poly.C2[1],
        poly.W1[0], poly.W1[1],
        poly.W2[0], poly.W2[1],
        e.ql, e.qr, e.qm, e.qo, e.qc,
        e.s1, e.s2, e.s3,
        e.a, e.b, e.c,
        e.z, e.zw, e.t1w, e.t2w, e.inv,
    ]);

    return verifier.verifyProof(proof, publicSignals);
}

function loadTemplates() {
    const TMPL = path.join(ROOT, "templates");
    return {
        groth16: fs.readFileSync(path.join(TMPL, "verifier_groth16.sol.ejs"), "utf8"),
        plonk: fs.readFileSync(path.join(TMPL, "verifier_plonk.sol.ejs"), "utf8"),
        fflonk: fs.readFileSync(path.join(TMPL, "verifier_fflonk.sol.ejs"), "utf8"),
    };
}

// --------------------------------------------------------------------------
// Test suite
// --------------------------------------------------------------------------

describe("Smart contract verifiers", () => {
    let curve;

    beforeAll(async () => {
        await fs.promises.mkdir(CONTRACTS_DIR, { recursive: true });
        curve = await buildBn128();
    });

    afterAll(async () => {
        await curve.terminate();
    });

    // ------------------------------------------------------------------
    // Groth16
    // ------------------------------------------------------------------
    describe("Groth16", () => {
        it.each([
            ["1 input", "groth16/circuit.r1cs", "groth16/witness.wtns"],
            ["3 inputs", "circuit2/circuit.r1cs", "circuit2/witness.wtns"],
        ])("verifies proof — %s", async (_, r1csRel, wtnsRel) => {
            const result = await groth16Verify(
                path.join(TEST_DIR, r1csRel),
                path.join(TEST_DIR, wtnsRel)
            );
            expect(result).toBe(true);
        });

        it("rejects aliased public input (field wrap-around)", async () => {
            const result = await groth16VerifyAliased(
                path.join(TEST_DIR, "groth16/circuit.r1cs"),
                path.join(TEST_DIR, "groth16/witness.wtns")
            );
            expect(result).toBe(false);
        });
    });

    // ------------------------------------------------------------------
    // PLONK
    // ------------------------------------------------------------------
    describe("PLONK", () => {
        it.each([
            ["1 input", "plonk_circuit/circuit.r1cs", "plonk_circuit/witness.wtns"],
            ["3 inputs", "circuit2/circuit.r1cs", "circuit2/witness.wtns"],
        ])("verifies proof — %s", async (_, r1csRel, wtnsRel) => {
            const result = await plonkVerify(
                path.join(TEST_DIR, r1csRel),
                path.join(TEST_DIR, wtnsRel)
            );
            expect(result).toBe(true);
        });
    });

    // ------------------------------------------------------------------
    // FFlonk
    // ------------------------------------------------------------------
    describe("FFlonk", () => {
        it.each([
            ["1 input", "fflonk/circuit.r1cs", "fflonk/witness.wtns"],
            ["3 inputs", "circuit2/circuit.r1cs", "circuit2/witness.wtns"],
        ])("verifies proof — %s", async (_, r1csRel, wtnsRel) => {
            const result = await fflonkVerify(
                path.join(TEST_DIR, r1csRel),
                path.join(TEST_DIR, wtnsRel)
            );
            expect(result).toBe(true);
        });
    });
});
