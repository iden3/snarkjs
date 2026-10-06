import * as snarkjs from "../main.js";
import { getCurveFromName } from "../src/curves.js";
import { compressG1, compressG2, compressG1Hex, compressG2Hex } from "../src/point_compress.js";
import { Keccak256Transcript } from "../src/Keccak256Transcript.js";
import { Keccak256CompressedTranscript } from "../src/Keccak256CompressedTranscript.js";
import { Scalar } from "ffjavascript";
import { keccak_256 } from "@noble/hashes/sha3";
import assert from "assert";
import path from "path";

// Tests for the keccak256-compressed Fiat-Shamir transcript variant required for
// Cardano/Plutus on-chain verification (CIP-0381 + CIP-0101).  The compressed
// transcript uses the same Keccak-256 hash as the default but serialises G1
// commitments as 48-byte ZCash-format compressed points rather than 96-byte
// uncompressed points.  The ZCash encoding is bls12381-only (its flags need 3
// free high bits in the base field; bn128 leaves only 2), so on bn128 the
// compressed transcript must be rejected while the default transcript keeps
// working unchanged.  The transcript itself is exercised at the unit level on
// bls12381, where no circuit/ptau fixtures exist (circom wasm is curve-bound);
// end-to-end bls12381 coverage lives in cardano-scaling/snarkjs-circom-aiken.

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

    it("plonk prove with keccak256-compressed transcript rejects bn128", async () => {
        await assert.rejects(
            snarkjs.plonk.prove(zkeyMem, wtnsMem, null, { transcript: "keccak256-compressed" }),
            /only supports bls12381/
        );
    });

    it("plonk prove with default transcript", async () => {
        const res = await snarkjs.plonk.prove(zkeyMem, wtnsMem);
        proofDefault = res.proof;
        publicSignalsDefault = res.publicSignals;
        assert(proofDefault, "proof should be generated");
    });

    it("plonk verify with keccak256-compressed transcript rejects bn128", async () => {
        await assert.rejects(
            snarkjs.plonk.verify(vKey, publicSignalsDefault, proofDefault, null, { transcript: "keccak256-compressed" }),
            /only supports bls12381/
        );
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
    let fflonkProofDefault;
    let fflonkPublicDefault;

    it("fflonk setup (shared fixture)", async () => {
        await snarkjs.fflonk.setup(fflonkR1cs, ptauFilename, fflonkZkey);
        fflonkVKey = await snarkjs.zKey.exportVerificationKey(fflonkZkey);
    });

    it("fflonk setup keeps the historical bn128 w3 constant", async () => {
        // Deployed verifiers hardcode w3, so it must never change for a curve.
        assert.strictEqual(
            String(fflonkVKey.w3),
            "21888242871839275217838484774961031246154997185409878258781734729429964517155"
        );
    });

    it("fflonk prove with keccak256-compressed transcript rejects bn128", async () => {
        await assert.rejects(
            snarkjs.fflonk.prove(fflonkZkey, fflonkWtns, null, { transcript: "keccak256-compressed" }),
            /only supports bls12381/
        );
    });

    it("fflonk prove and verify with default transcript — should pass", async () => {
        const res = await snarkjs.fflonk.prove(fflonkZkey, fflonkWtns);
        fflonkProofDefault = res.proof;
        fflonkPublicDefault = res.publicSignals;
        const isValid = await snarkjs.fflonk.verify(fflonkVKey, fflonkPublicDefault, fflonkProofDefault);
        assert.strictEqual(isValid, true, "fflonk default-transcript proof should verify");
    });

    it("fflonk verify with keccak256-compressed transcript rejects bn128", async () => {
        await assert.rejects(
            snarkjs.fflonk.verify(fflonkVKey, fflonkPublicDefault, fflonkProofDefault, null, { transcript: "keccak256-compressed" }),
            /only supports bls12381/
        );
    });

    // ── Transcript option validation ───────────────────────────────────────
    // A mistyped transcript name must error out instead of silently falling
    // back to the default transcript and producing an incompatible proof.

    it("prove rejects an unknown transcript type", async () => {
        await assert.rejects(
            snarkjs.plonk.prove(zkeyMem, wtnsMem, null, { transcript: "keccak256compressed" }),
            /Unknown transcript type/
        );
    });

    it("verify rejects an unknown transcript type", async () => {
        await assert.rejects(
            snarkjs.plonk.verify(vKey, publicSignalsDefault, proofDefault, null, { transcript: true }),
            /Unknown transcript type/
        );
    });

    // ── Cardano export guards ──────────────────────────────────────────────
    // The ZCash compressed encoding is bls12381-only; other curves must be
    // rejected instead of producing silently corrupted points.

    it("export cardano proof rejects non-bls12381 proofs", async () => {
        await assert.rejects(
            snarkjs.exportCardanoProof(proofDefault),
            /only bls12381/
        );
    });

    it("export cardano verification key rejects non-bls12381 zkeys", async () => {
        await assert.rejects(
            snarkjs.zKey.exportCardanoVerificationKey(zkeyMem),
            /only bls12381/
        );
    });

    it("compressed transcript constructor rejects bn128", () => {
        assert.throws(
            () => new Keccak256CompressedTranscript(curve),
            /only supports bls12381/
        );
    });

    // Even if a future caller forgets the curve guard, the low-level helper
    // must refuse to overwrite x-coordinate bits with flags.
    it("compressG1 refuses a base field without free flag bits", () => {
        assert.throws(
            () => compressG1(curve.G1, curve.G1.g),
            /3 free high bits/
        );
    });

    it("compressG2 refuses a base field without free flag bits", () => {
        assert.throws(
            () => compressG2(curve.G2, curve.G2.g),
            /3 free high bits/
        );
    });
});

// Unit tests for the compressed transcript on its target curve. There are no
// bls12381 circuit fixtures (circom wasm is curve-bound), so the transcript is
// pinned directly: same inputs must hash differently under the two variants,
// and the compressed variant must hash exactly compressG1(point) || be(scalar).

describe("Compressed transcript on bls12381", function () {
    this.timeout(1000000000);

    let curve;

    before(async () => {
        curve = await getCurveFromName("bls12381");
    });

    after(async () => {
        await curve.terminate();
    });

    it("produces a different challenge than the default transcript", () => {
        const defaultTranscript = new Keccak256Transcript(curve);
        const compressedTranscript = new Keccak256CompressedTranscript(curve);
        const scalar = curve.Fr.e(12345n);

        for (const transcript of [defaultTranscript, compressedTranscript]) {
            transcript.addPolCommitment(curve.G1.g);
            transcript.addScalar(scalar);
        }

        assert(
            !curve.Fr.eq(defaultTranscript.getChallenge(), compressedTranscript.getChallenge()),
            "transcript variants must not produce the same challenge"
        );
    });

    it("hashes exactly the compressed-point-then-scalar byte layout", () => {
        const { G1, Fr } = curve;
        const scalar = Fr.e(12345n);

        const transcript = new Keccak256CompressedTranscript(curve);
        transcript.addPolCommitment(G1.g);
        transcript.addScalar(scalar);

        const expectedBuff = new Uint8Array(G1.F.n8 + Fr.n8);
        expectedBuff.set(compressG1(G1, G1.g), 0);
        Fr.toRprBE(expectedBuff, G1.F.n8, scalar);
        const expected = Fr.e(Scalar.fromRprBE(keccak_256(expectedBuff)));

        assert(curve.Fr.eq(transcript.getChallenge(), expected));
    });
});

// The ZCash/IETF compressed encoding is what a Cardano on-chain verifier
// deserialises, so the byte layout (flag bits, big-endian x, Fq2 c1-before-c0
// order, sign convention) must match the spec exactly. The generator
// encodings below are the official test vectors from
// draft-irtf-cfrg-pairing-friendly-curves, pinning all of it in one
// assertion per group.

describe("ZCash point compression vectors (bls12381)", function () {
    this.timeout(1000000000);

    // draft-irtf-cfrg-pairing-friendly-curves, BLS12-381 generators
    const G1_GENERATOR_COMPRESSED =
        "97f1d3a73197d7942695638c4fa9ac0fc3688c4f9774b905a14e3a3f171bac586c55e83ff97a1aeffb3af00adb22c6bb";
    const G2_GENERATOR_COMPRESSED =
        "93e02b6052719f607dacd3a088274f65596bd0d09920b61ab5da61bbdc7f5049334cf11213945d57e5ac7d055d042b7e" +
        "024aa2b2f08f0a91260805272dc51051c6e47ad4fa403b02b4510b647ae3d1770bac0326a805bbefd48056c8c121bdb8";

    let curve;

    before(async () => {
        curve = await getCurveFromName("bls12381");
    });

    after(async () => {
        await curve.terminate();
    });

    it("compresses the G1 generator to the IETF test vector", () => {
        assert.strictEqual(compressG1Hex(curve.G1, curve.G1.g), G1_GENERATOR_COMPRESSED);
    });

    it("compresses the G2 generator to the IETF test vector", () => {
        assert.strictEqual(compressG2Hex(curve.G2, curve.G2.g), G2_GENERATOR_COMPRESSED);
    });

    it("encodes the G1 point at infinity as 0xc0 followed by zeros", () => {
        const buff = compressG1(curve.G1, curve.G1.zero);
        assert.strictEqual(buff.length, 48);
        assert.strictEqual(buff[0], 0b11000000);
        assert(buff.slice(1).every((b) => 0 === b));
    });

    it("encodes the G2 point at infinity as 0xc0 followed by zeros", () => {
        const buff = compressG2(curve.G2, curve.G2.zero);
        assert.strictEqual(buff.length, 96);
        assert.strictEqual(buff[0], 0b11000000);
        assert(buff.slice(1).every((b) => 0 === b));
    });

    it("negating a G1 point flips exactly the sign bit", () => {
        const g = compressG1(curve.G1, curve.G1.g);
        const negG = compressG1(curve.G1, curve.G1.neg(curve.G1.g));
        assert.strictEqual(negG[0], g[0] ^ 0b00100000);
        assert.deepStrictEqual(negG.slice(1), g.slice(1));
    });

    it("negating a G2 point flips exactly the sign bit", () => {
        const g = compressG2(curve.G2, curve.G2.g);
        const negG = compressG2(curve.G2, curve.G2.neg(curve.G2.g));
        assert.strictEqual(negG[0], g[0] ^ 0b00100000);
        assert.deepStrictEqual(negG.slice(1), g.slice(1));
    });

    // exportCardanoProof compresses points without validating the proof, so a
    // synthetic generator-point "proof" pins the output format: protocol and
    // curve are retained (like the VK export) and points come out as the IETF
    // vectors above.
    it("exports a self-describing groth16 cardano proof", async () => {
        const proof = {
            protocol: "groth16",
            curve: "bls12381",
            pi_a: curve.G1.toObject(curve.G1.toAffine(curve.G1.g)),
            pi_b: curve.G2.toObject(curve.G2.toAffine(curve.G2.g)),
            pi_c: curve.G1.toObject(curve.G1.toAffine(curve.G1.g)),
        };

        const cardanoProof = await snarkjs.exportCardanoProof(proof);

        assert.strictEqual(cardanoProof.protocol, "groth16");
        assert.strictEqual(cardanoProof.curve, "bls12381");
        assert.strictEqual(cardanoProof.pi_a, G1_GENERATOR_COMPRESSED);
        assert.strictEqual(cardanoProof.pi_b, G2_GENERATOR_COMPRESSED);
        assert.strictEqual(cardanoProof.pi_c, G1_GENERATOR_COMPRESSED);
    });
});
