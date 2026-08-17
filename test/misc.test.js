import { getRandomBytes, sha256digest } from "../src/misc.js";
import assert from "assert";

describe("misc", function () {

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
    });

    describe("sha256digest", () => {
        const toHex = (u8) => Array.from(u8, (b) => b.toString(16).padStart(2, "0")).join("");

        it("matches the SHA-256 test vector for 'abc'", async () => {
            const digest = await sha256digest(new TextEncoder().encode("abc"));
            assert(digest instanceof Uint8Array);
            assert.strictEqual(
                toHex(digest),
                "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
            );
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
            assert.strictEqual(
                toHex(fromView),
                "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
            );
        });
    });
});
