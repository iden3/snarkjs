import jsonPlugin from "../examples/plugins/json/index.js";
import exportVerifier from "../src/zkey_export_verifier.js";
import exportCalldata from "../src/export_calldata.js";
import { validatePlugin } from "../src/plugins/plugin_api.js";
import assert from "assert";
import fs from "fs";
import path from "path";
import url from "url";

// The in-tree example plugin: proves the interface end-to-end without
// touching fs/ejs (works browser-side too) and round-trips artifacts.

const FIX = path.join(path.dirname(url.fileURLToPath(import.meta.url)), "plugin_fixtures");
const readJson = (n) => JSON.parse(fs.readFileSync(path.join(FIX, n), "utf8"));

describe("json example plugin", function () {

    it("is a valid plugin declaring all protocols on both curves", () => {
        validatePlugin(jsonPlugin);
        assert.strictEqual(jsonPlugin.verifier.supports.length, 6);
    });

    it("verifier export round-trips the verification key", async () => {
        const out = await exportVerifier(path.join(FIX, "groth16.zkey"), jsonPlugin, {});
        const vk = JSON.parse(out);
        assert.strictEqual(vk.protocol, "groth16");
        assert.strictEqual(vk.curve, "bn128");
        assert.ok(Array.isArray(vk.IC));
    });

    it("calldata export honors formats and round-trips proof + signals", async () => {
        const proof = readJson("plonk.proof.json");
        const pub = readJson("plonk.public.json");
        const pretty = await exportCalldata(proof, pub, jsonPlugin, {});
        const compact = await exportCalldata(proof, pub, jsonPlugin, { format: "compact" });
        assert.ok(pretty.includes("\n") && !compact.includes("\n"));
        assert.deepStrictEqual(JSON.parse(compact), { proof, publicSignals: pub });
        assert.deepStrictEqual(JSON.parse(pretty), JSON.parse(compact));
    });
});
