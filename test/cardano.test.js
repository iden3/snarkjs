import * as snarkjs from "../main.js";
import { getCurveFromName } from "../src/curves.js";
import assert from "assert";
import path from "path";

// Tests for the keccak256-compressed Fiat-Shamir transcript variant required for
// Cardano/Plutus on-chain verification (CIP-0381 + CIP-0101).  The compressed
// transcript uses the same Keccak-256 hash as the default but serialises G1
// commitments as 48-byte ZCash-format compressed points rather than 96-byte
// uncompressed points.  A proof generated with one transcript mode must NOT
// verify under the other, confirming the modes are cryptographically distinct.

describe("Cardano transcript tests", function () {
    this.timeout(1000000000);

    let curve;

    // Reuse the existing plonk_circuit fixtures — no new binaries needed.
    const r1csFilename = path.join("test", "plonk_circuit", "circuit.r1cs");
    const ptauFilename = path.join("test", "plonk_circuit", "powersOfTau15_final.ptau");
    const wasmFilename = path.join("test", "plonk_circuit", "circuit.wasm");
    const inputFilename = path.join("test", "plonk_circuit", "input.json");

    const zkeyMem = { type: "mem" };
    const wtnsMem = { type: "mem" };
    let vKey;
    let proofCompressed;
    let publicSignalsCompressed;
    let proofDefault;
    let publicSignalsDefault;

    before(async () => {
        curve = await getCurveFromName("bn128");
    });

    after(async () => {
        await curve.terminate();
    });

    // ── PLONK ──────────────────────────────────────────────────────────────

    it("plonk setup (shared fixture)", async () => {
        await snarkjs.plonk.setup(r1csFilename, ptauFilename, zkeyMem);
        vKey = await snarkjs.zKey.exportVerificationKey(zkeyMem);
    });

    it("plonk witness", async () => {
        const input = JSON.parse(
            (await import("fs")).readFileSync(inputFilename, "utf8")
        );
        await snarkjs.wtns.calculate(input, wasmFilename, wtnsMem);
    });

    it("plonk prove with keccak256-compressed transcript", async () => {
        const res = await snarkjs.plonk.prove(
            zkeyMem,
            wtnsMem,
            null,
            { transcript: "keccak256-compressed" }
        );
        proofCompressed = res.proof;
        publicSignalsCompressed = res.publicSignals;
        assert(proofCompressed, "proof should be generated");
    });

    it("plonk verify with keccak256-compressed transcript — should pass", async () => {
        const isValid = await snarkjs.plonk.verify(
            vKey,
            publicSignalsCompressed,
            proofCompressed,
            null,
            { transcript: "keccak256-compressed" }
        );
        assert.strictEqual(isValid, true, "compressed-transcript proof should verify with matching transcript");
    });

    it("plonk verify compressed-transcript proof with default transcript — should fail", async () => {
        const isValid = await snarkjs.plonk.verify(
            vKey,
            publicSignalsCompressed,
            proofCompressed
        );
        assert.strictEqual(isValid, false, "compressed-transcript proof should NOT verify with default transcript");
    });

    it("plonk prove with default transcript", async () => {
        const res = await snarkjs.plonk.prove(zkeyMem, wtnsMem);
        proofDefault = res.proof;
        publicSignalsDefault = res.publicSignals;
        assert(proofDefault, "proof should be generated");
    });

    it("plonk verify default-transcript proof with keccak256-compressed transcript — should fail", async () => {
        const isValid = await snarkjs.plonk.verify(
            vKey,
            publicSignalsDefault,
            proofDefault,
            null,
            { transcript: "keccak256-compressed" }
        );
        assert.strictEqual(isValid, false, "default-transcript proof should NOT verify with compressed transcript");
    });

    it("plonk verify default-transcript proof with default transcript — should pass", async () => {
        const isValid = await snarkjs.plonk.verify(
            vKey,
            publicSignalsDefault,
            proofDefault
        );
        assert.strictEqual(isValid, true, "default-transcript proof should verify with default transcript");
    });

    // ── FFLONK ─────────────────────────────────────────────────────────────

    const fflonkR1cs = path.join("test", "fflonk", "circuit.r1cs");
    const fflonkWtns = path.join("test", "fflonk", "witness.wtns");
    const fflonkZkey = { type: "mem" };
    let fflonkVKey;
    let fflonkProofCompressed;
    let fflonkPublicCompressed;

    it("fflonk setup (shared fixture)", async () => {
        await snarkjs.fflonk.setup(fflonkR1cs, ptauFilename, fflonkZkey);
        fflonkVKey = await snarkjs.zKey.exportVerificationKey(fflonkZkey);
    });

    it("fflonk prove with keccak256-compressed transcript", async () => {
        const res = await snarkjs.fflonk.prove(
            fflonkZkey,
            fflonkWtns,
            null,
            { transcript: "keccak256-compressed" }
        );
        fflonkProofCompressed = res.proof;
        fflonkPublicCompressed = res.publicSignals;
        assert(fflonkProofCompressed, "fflonk proof should be generated");
    });

    it("fflonk verify with keccak256-compressed transcript — should pass", async () => {
        const isValid = await snarkjs.fflonk.verify(
            fflonkVKey,
            fflonkPublicCompressed,
            fflonkProofCompressed,
            null,
            { transcript: "keccak256-compressed" }
        );
        assert.strictEqual(isValid, true, "fflonk compressed-transcript proof should verify");
    });

    it("fflonk verify compressed-transcript proof with default transcript — should fail", async () => {
        const isValid = await snarkjs.fflonk.verify(
            fflonkVKey,
            fflonkPublicCompressed,
            fflonkProofCompressed
        );
        assert.strictEqual(isValid, false, "fflonk compressed-transcript proof should NOT verify with default transcript");
    });
});
