import BigArray from "../src/bigarray.js";
import assert from "assert";

// BigArray pages its storage in 0x40000-element subarrays behind a Proxy;
// exercise indexing across page boundaries, push, slice and getKeys.
const PAGE = 0x40000;

describe("BigArray", function () {
    it("indexes reads and writes across page boundaries", () => {
        const a = new BigArray();
        a[0] = "first";
        a[PAGE - 1] = "end of page 0";
        a[PAGE] = "start of page 1";
        a[2 * PAGE + 5] = "page 2";

        assert.strictEqual(a[0], "first");
        assert.strictEqual(a[PAGE - 1], "end of page 0");
        assert.strictEqual(a[PAGE], "start of page 1");
        assert.strictEqual(a[2 * PAGE + 5], "page 2");
        assert.strictEqual(a.length, 2 * PAGE + 6);
        assert.strictEqual(a[12345], undefined);
    });

    it("push appends and slice crosses pages", () => {
        const a = new BigArray();
        for (let i = 0; i < 10; i++) a.push(i * i);
        assert.strictEqual(a.length, 10);
        assert.deepStrictEqual(a.slice(2, 5), [4, 9, 16]);

        // slice across a page boundary
        const b = new BigArray();
        b[PAGE - 2] = "a"; b[PAGE - 1] = "b"; b[PAGE] = "c";
        assert.deepStrictEqual(b.slice(PAGE - 2, PAGE + 1), ["a", "b", "c"]);
    });

    it("getKeys lists only the defined sparse indices", () => {
        const a = new BigArray();
        a[3] = "x";
        a[PAGE + 7] = "y";
        const keys = a.getKeys();
        const list = [];
        for (let i = 0; i < keys.length; i++) list.push(keys[i]);
        assert.deepStrictEqual(list, [3, PAGE + 7]);
    });

    it("preallocates pages for an initial size", () => {
        const a = new BigArray(PAGE + 10);
        assert.strictEqual(a.length, PAGE + 10);
        a[PAGE + 9] = 1;
        assert.strictEqual(a[PAGE + 9], 1);
    });
});
