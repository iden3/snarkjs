import { sha256digest } from "../src/misc.js";
import { Keccak256Transcript } from "../src/Keccak256Transcript.js";
import { getCurveFromName } from "../src/curves.js";
import { blake2b } from "@noble/hashes/blake2.js";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { Scalar } from "ffjavascript";
import assert from "assert";

// Test vectors from industry standards for every hash primitive snarkjs
// relies on, exercised through the exact import paths the sources use:
//  - SHA-256: FIPS 180-4 / NIST CAVP vectors (misc.sha256digest)
//  - BLAKE2b-512: RFC 7693 appendix A (ceremony contribution hashing)
//  - Keccak-256: the pre-NIST Keccak used by Ethereum; classic vectors
//    (Fiat-Shamir transcript for PLONK/FFLONK)
// plus a byte-exact mirror of the Keccak256Transcript challenge derivation.

const toHex = (u8) => Array.from(u8, (b) => b.toString(16).padStart(2, "0")).join("");
const ascii = (s) => new TextEncoder().encode(s);

describe("FIPS 180-4 SHA-256 vectors (misc.sha256digest)", function () {
    const VECTORS = [
        ["", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
        ["abc", "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"],
        // FIPS 180-4 two-block message
        ["abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq",
            "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1"],
    ];

    for (const [msg, digest] of VECTORS) {
        it(`SHA-256("${msg.slice(0, 20)}${msg.length > 20 ? "…" : ""}") matches`, async () => {
            assert.strictEqual(toHex(await sha256digest(ascii(msg))), digest);
        });
    }
});

describe("RFC 7693 BLAKE2b-512 vectors (ceremony hashing primitive)", function () {
    it("BLAKE2b-512(\"abc\") matches RFC 7693 appendix A", () => {
        // the exact call shape used by the ptau/zkey ceremony code
        const h = blake2b.create({ dkLen: 64 });
        h.update(ascii("abc"));
        assert.strictEqual(toHex(h.digest()),
            "ba80a53f981c4d0d6a2797b69f12f6e94c212f14685ac4b74b12bb6fdbffa2d1" +
            "7d87c5392aab792dc252d5de4533cc9518d38aa8dbf1925ab92386edd4009923");
    });

    it("BLAKE2b-512 of the empty string matches the reference value", () => {
        const h = blake2b.create({ dkLen: 64 });
        assert.strictEqual(toHex(h.digest()),
            "786a02f742015903c6c6fd852552d272912f4740e15847618a86e217f71f5419" +
            "d25e1031afee585313896444934eb04b903a685b1448b755d56f701afe9be2ce");
    });
});

describe("Keccak-256 vectors (Fiat-Shamir transcript primitive)", function () {
    it("keccak256 of the empty string and \"abc\" match the classic values", () => {
        assert.strictEqual(toHex(keccak_256(new Uint8Array(0))),
            "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470");
        assert.strictEqual(toHex(keccak_256(ascii("abc"))),
            "4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45");
    });
});

describe("Keccak256Transcript challenge derivation", function () {
    this.timeout(120000);

    let curve;
    before(async () => { curve = await getCurveFromName("bn128"); });
    after(async () => { await curve.terminate(); });

    it("challenge equals keccak256(uncompressed points ‖ BE scalars) reduced into Fr", () => {
        const { Fr, G1 } = curve;
        const transcript = new Keccak256Transcript(curve);

        const s1 = Fr.e(12345);
        const P = G1.timesFr(G1.g, Fr.e(777));
        const s2 = Fr.e(67890);

        transcript.addScalar(s1);
        transcript.addPolCommitment(P);
        transcript.addScalar(s2);
        const challenge = transcript.getChallenge();

        // independent byte-exact mirror of the serialization
        const buffer = new Uint8Array(2 * Fr.n8 + G1.F.n8 * 2);
        Fr.toRprBE(buffer, 0, s1);
        G1.toRprUncompressed(buffer, Fr.n8, P);
        Fr.toRprBE(buffer, Fr.n8 + G1.F.n8 * 2, s2);
        const expected = Fr.e(Scalar.fromRprBE(keccak_256(buffer)));

        assert(Fr.eq(challenge, expected));

        // and the transcript is order-sensitive
        const t2 = new Keccak256Transcript(curve);
        t2.addScalar(s2);
        t2.addPolCommitment(P);
        t2.addScalar(s1);
        assert(!Fr.eq(t2.getChallenge(), challenge));
    });
});
