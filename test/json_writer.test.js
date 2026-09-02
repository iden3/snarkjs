import { writeJsonFile } from "../src/json_writer.js";
import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";

// The writer's contract is byte-identity with JSON.stringify(value, null,
// space) -- the CLI's exported JSONs (proofs, vkeys, r1cs, ptau) must not
// change by a byte when it replaces bfj.

describe("streaming json writer", function () {
    let dir;
    beforeAll(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), "jsonw-")); });
    afterAll(() => { fs.rmSync(dir, { recursive: true, force: true }); });

    async function roundTrip(value, space = 1) {
        const f = path.join(dir, "out.json");
        await writeJsonFile(f, value, space);
        return fs.readFileSync(f, "utf8");
    }

    const cases = {
        "nested proof-like object": {
            pi_a: ["123456789012345678901234567890", "987", "1"],
            pi_b: [["1", "2"], ["3", "4"], ["1", "0"]],
            protocol: "groth16", curve: "bn128",
        },
        "empty containers": { a: [], o: {}, n: null, arr: [[], {}, [[]]] },
        "primitives at top level": 42,
        "string escaping": { "key\"with\\quotes": "line\nbreak\ttab  unicode \u{1F600} ¡ñ" },
        "numbers": [0, -0, 1.5, 1e100, 1e-7, NaN, Infinity, -Infinity],
        "big flat array": Array.from({ length: 100000 }, (_, i) => String(i)),
        "deep-ish structure": { a: { b: { c: { d: [{ e: [1, { f: "g" }] }] } } } },
    };

    for (const [name, value] of Object.entries(cases)) {
        it(`matches JSON.stringify byte-for-byte: ${name}`, async () => {
            assert.strictEqual(await roundTrip(value), JSON.stringify(value, null, 1));
        });
    }

    it("skips undefined object values and nullifies undefined array slots, like JSON.stringify", async () => {
        const v = { keep: 1, drop: undefined, fn: () => {}, arr: [1, undefined, () => {}, 2] };
        assert.strictEqual(await roundTrip(v), JSON.stringify(v, null, 1));
    });

    it("honors toJSON", async () => {
        const v = { d: { toJSON: () => "converted" }, arr: [{ toJSON: () => 7 }] };
        assert.strictEqual(await roundTrip(v), JSON.stringify(v, null, 1));
    });

    it("supports other space values", async () => {
        const v = { a: [1, 2], b: { c: 3 } };
        for (const space of [0, 2, 4]) {
            assert.strictEqual(await roundTrip(v, space), JSON.stringify(v, null, space));
        }
    });
});
