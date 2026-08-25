import {
    getRandomBytes, sha256digest, bitReverse, log2, formatHash, hashIsEqual,
    cloneHasher, askEntropy, getRandomRng, rngFromBeaconParams,
    hex2ByteArray, byteArray2hex, readUInt32BE, stringifyBigIntsWithField,
    sameRatio,
} from "../src/misc.js";
import { getCurveFromName } from "../src/curves.js";
import { blake2b } from "@noble/hashes/blake2.js";
import nodeCrypto from "crypto";
import readline from "readline";
import assert from "assert";

describe("misc", function () {
    this.timeout(60000);

    describe("getRandomBytes", () => {
        it("returns a Uint8Array of the requested length", () => {
            for (const n of [0, 1, 31, 32, 1024]) {
                const bytes = getRandomBytes(n);
                assert(bytes instanceof Uint8Array);
                assert.strictEqual(bytes.length, n);
            }
        });

        it("fills requests larger than the 64 KiB Web Crypto per-call cap end to end", () => {
            // Regression guard: the Web Crypto backend fills in 65536-byte
            // windows (getRandomValues throws above that); a broken window
            // loop would leave the tail all-zero. On Node randomFillSync has
            // no cap, but the length and filled-tail contract is the same.
            const n = 3 * 65536 + 123;
            const bytes = getRandomBytes(n);
            assert.strictEqual(bytes.length, n);
            const tail = bytes.subarray(2 * 65536);
            assert(tail.some((b) => b !== 0), "tail beyond the first windows was left unfilled");
        });

        it("returns different bytes on every call", () => {
            const a = getRandomBytes(32);
            const b = getRandomBytes(32);
            assert.notDeepStrictEqual(Array.from(a), Array.from(b));
        });

        it("uses the windowed Web Crypto path when randomFillSync is unavailable", function () {
            // Force the browser branch by hiding Node's randomFillSync.
            const original = nodeCrypto.randomFillSync;
            if (!original || !globalThis.crypto || !globalThis.crypto.getRandomValues) this.skip();
            try {
                nodeCrypto.randomFillSync = undefined;
            } catch {
                this.skip();
            }
            try {
                const n = 2 * 65536 + 7;
                const bytes = getRandomBytes(n);
                assert.strictEqual(bytes.length, n);
                assert(bytes.subarray(65536).some((b) => b !== 0), "second window unfilled");
                assert(bytes.subarray(2 * 65536).some((b) => b !== 0), "final partial window unfilled");
            } finally {
                nodeCrypto.randomFillSync = original;
            }
        });

        it("throws when no secure random source exists", function () {
            // globalThis.crypto is an accessor property; it can only be
            // masked via defineProperty, and only if configurable.
            const originalFill = nodeCrypto.randomFillSync;
            const webDesc = Object.getOwnPropertyDescriptor(globalThis, "crypto");
            if (webDesc && !webDesc.configurable) this.skip();
            try {
                nodeCrypto.randomFillSync = undefined;
                Object.defineProperty(globalThis, "crypto", { value: undefined, configurable: true });
            } catch {
                nodeCrypto.randomFillSync = originalFill;
                if (webDesc) Object.defineProperty(globalThis, "crypto", webDesc);
                this.skip();
            }
            try {
                assert.throws(() => getRandomBytes(8), /No secure random source/);
            } finally {
                nodeCrypto.randomFillSync = originalFill;
                if (webDesc) Object.defineProperty(globalThis, "crypto", webDesc);
            }
        });
    });

    describe("sha256digest", () => {
        const toHex = (u8) => Array.from(u8, (b) => b.toString(16).padStart(2, "0")).join("");
        const ABC_SHA256 = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

        it("matches the SHA-256 test vector for 'abc'", async () => {
            const digest = await sha256digest(new TextEncoder().encode("abc"));
            assert(digest instanceof Uint8Array);
            assert.strictEqual(toHex(digest), ABC_SHA256);
        });

        it("hashes a subarray view by its offset and length, not its whole backing buffer", async () => {
            // Regression guard: the Web Crypto branch used to digest
            // data.buffer, silently hashing the entire backing ArrayBuffer
            // when handed a subarray view.
            const backing = new Uint8Array(64).fill(0xAA);
            backing.set([0x61, 0x62, 0x63], 30); // "abc"
            const view = backing.subarray(30, 33);

            const fromView = await sha256digest(view);
            const fromCopy = await sha256digest(Uint8Array.from(view));
            assert.strictEqual(toHex(fromView), toHex(fromCopy));
            assert.strictEqual(toHex(fromView), ABC_SHA256);
        });

        it("uses the Web Crypto path when createHash is unavailable, respecting views", async function () {
            const original = nodeCrypto.createHash;
            if (!original || !globalThis.crypto || !globalThis.crypto.subtle) this.skip();
            try {
                nodeCrypto.createHash = undefined;
            } catch {
                this.skip();
            }
            try {
                const backing = new Uint8Array(64).fill(0xAA);
                backing.set([0x61, 0x62, 0x63], 30);
                const digest = await sha256digest(backing.subarray(30, 33));
                assert.strictEqual(toHex(digest), ABC_SHA256);
            } finally {
                nodeCrypto.createHash = original;
            }
        });
    });

    describe("bit utilities", () => {
        it("bitReverse reverses the low `bits` bits", () => {
            assert.strictEqual(bitReverse(0b001, 3), 0b100);
            assert.strictEqual(bitReverse(0b011, 3), 0b110);
            assert.strictEqual(bitReverse(0b0001, 4), 0b1000);
            assert.strictEqual(bitReverse(1, 32), 0x80000000 >>> 0);
            // involution: reversing twice restores the value
            for (const v of [0, 1, 5, 1234567]) {
                assert.strictEqual(bitReverse(bitReverse(v, 24), 24), v);
            }
        });

        it("log2 returns the floor base-2 logarithm", () => {
            assert.strictEqual(log2(1), 0);
            assert.strictEqual(log2(2), 1);
            assert.strictEqual(log2(255), 7);
            assert.strictEqual(log2(256), 8);
            assert.strictEqual(log2(1 << 20), 20);
        });

        it("readUInt32BE reads big-endian 32-bit words", () => {
            const data = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0xFF, 0x00, 0x00, 0x01]);
            assert.strictEqual(readUInt32BE(data, 0), 0x01020304);
            assert.strictEqual(readUInt32BE(data, 4), 0xFF000001);
        });
    });

    describe("hash helpers", () => {
        it("formatHash renders a 64-byte hash as hex lines", () => {
            const h = new Uint8Array(64);
            for (let i = 0; i < 64; i++) h[i] = i;
            const s = formatHash(h, "Contribution Hash:");
            assert(s.includes("Contribution Hash:"));
            assert(s.toLowerCase().includes("00010203"));
        });

        it("hashIsEqual compares byte-wise", () => {
            const a = Uint8Array.from([1, 2, 3]);
            assert(hashIsEqual(a, Uint8Array.from([1, 2, 3])));
            assert(!hashIsEqual(a, Uint8Array.from([1, 2, 4])));
            assert(!hashIsEqual(a, Uint8Array.from([1, 2])));
        });

        it("cloneHasher forks the hash state", () => {
            const h = blake2b.create(64);
            h.update(new TextEncoder().encode("common prefix "));
            const fork = cloneHasher(h);
            h.update(new TextEncoder().encode("a"));
            fork.update(new TextEncoder().encode("a"));
            assert(hashIsEqual(h.digest(), fork.digest()));
        });
    });

    describe("entropy and RNG", () => {
        it("askEntropy uses window.prompt when a DOM window exists", async () => {
            const hadWindow = "window" in globalThis;
            const savedWindow = globalThis.window;
            globalThis.window = { prompt: () => "prompted entropy" };
            try {
                assert.strictEqual(askEntropy(), "prompted entropy");
            } finally {
                if (hadWindow) globalThis.window = savedWindow;
                else delete globalThis.window;
            }
        });

        it("getRandomRng derives a working ChaCha rng from entropy", async () => {
            const rng = await getRandomRng("unit test entropy");
            const v1 = rng.nextU32();
            const v2 = rng.nextU32();
            assert(Number.isInteger(v1) && Number.isInteger(v2));
        });

        it("rngFromBeaconParams derives a deterministic rng from the beacon hash", async () => {
            const beaconHash = new Uint8Array(32).fill(7);
            const rngA = await rngFromBeaconParams(beaconHash, 2);
            const rngB = await rngFromBeaconParams(beaconHash, 2);
            assert.strictEqual(rngA.nextU32(), rngB.nextU32());

            const rngC = await rngFromBeaconParams(beaconHash, 3);
            const rngA2 = await rngFromBeaconParams(beaconHash, 2);
            assert.notStrictEqual(rngC.nextU32(), rngA2.nextU32());
        });
    });

    describe("hex helpers", () => {
        it("hex2ByteArray and byteArray2hex round-trip, with or without 0x", () => {
            assert.deepEqual(hex2ByteArray("0x0102ff"), Uint8Array.from([1, 2, 255]));
            assert.deepEqual(hex2ByteArray("0102ff"), Uint8Array.from([1, 2, 255]));
            const bytes = Uint8Array.from([0, 15, 16, 255]);
            assert.strictEqual(byteArray2hex(bytes), "000f10ff");
            assert.deepEqual(hex2ByteArray(byteArray2hex(bytes)), bytes);
            // Passing an already-decoded array returns it unchanged
            assert.strictEqual(hex2ByteArray(bytes), bytes);
        });
    });

    describe("sameRatio", () => {
        let curve;
        before(async () => { curve = await getCurveFromName("bn128"); });
        after(async () => { await curve.terminate(); });

        it("rejects a zero point in any of the four slots", async () => {
            const { G1, G2, Fr } = curve;
            const s = Fr.random();
            const g1 = G1.g, g1x = G1.timesFr(G1.g, s);
            const g2 = G2.g, g2x = G2.timesFr(G2.g, s);

            assert(await sameRatio(curve, g1, g1x, g2, g2x) === true);
            assert(await sameRatio(curve, G1.zero, g1x, g2, g2x) === false);
            assert(await sameRatio(curve, g1, G1.zero, g2, g2x) === false);
            assert(await sameRatio(curve, g1, g1x, G2.zero, g2x) === false);
            assert(await sameRatio(curve, g1, g1x, g2, G2.zero) === false);
        });
    });

    describe("interactive entropy (stubbed readline)", () => {
        it("askEntropy falls back to readline when no window exists, and getRandomRng loops until entropy arrives", async () => {
            const original = readline.createInterface;
            try {
                readline.createInterface = () => ({
                    question: (q, cb) => cb("stubbed terminal entropy"),
                    close() {},
                });
            } catch {
                this.skip();
            }
            try {
                const answer = await askEntropy();
                assert.strictEqual(answer, "stubbed terminal entropy");

                // getRandomRng with no entropy asks until it gets some
                const rng = await getRandomRng(undefined);
                assert(Number.isInteger(rng.nextU32()));
            } finally {
                readline.createInterface = original;
            }
        });
    });

    describe("stringifyBigIntsWithField", () => {
        let curve;
        before(async () => { curve = await getCurveFromName("bn128"); });
        after(async () => { await curve.terminate(); });

        it("stringifies field elements, bigints, arrays and nested objects", () => {
            const Fr = curve.Fr;
            const o = {
                fe: Fr.e(123),
                n: 42n,
                num: 7,
                arr: [Fr.e(1), 99n],
                nested: { deep: Fr.e(5) },
            };
            const s = stringifyBigIntsWithField(Fr, o);
            assert.strictEqual(s.fe, "123");
            assert.strictEqual(s.n, "42");
            assert.strictEqual(s.arr[0], "1");
            assert.strictEqual(s.arr[1], "99");
            assert.strictEqual(s.nested.deep, "5");
        });
    });
});
