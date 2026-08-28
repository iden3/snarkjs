import exportVerifier from "../src/zkey_export_verifier.js";
import exportCalldata from "../src/export_calldata.js";
import solidityPlugin from "../src/plugins/solidity/index.js";
import { validatePlugin, assertSupports, normalizeResult, normalizeCurveName, PLUGIN_API_VERSION } from "../src/plugins/plugin_api.js";
import assert from "assert";
import path from "path";
import url from "url";

// Plugin dispatch and contract-validation unit tests (no golden files here;
// byte-compat lives in export_plugins_compat.test.js).

const FIX = path.join(path.dirname(url.fileURLToPath(import.meta.url)), "plugin_fixtures");

const okPlugin = (over = {}) => ({
    name: "test-plugin",
    apiVersion: PLUGIN_API_VERSION,
    verifier: {
        supports: [{ protocol: "groth16", curve: "bn128" }],
        defaultOutput: "out.txt",
        generate: async (vk) => `protocol=${vk.protocol}`,
    },
    calldata: {
        supports: [{ protocol: "groth16", curve: "bn128" }],
        formats: ["a", "b"],
        generate: async (proof, pub, params) => ({ files: { "call.txt": `${pub.length}:${params.format || "a"}` } }),
    },
    ...over,
});

describe("export plugins: dispatch and validation", function () {

    it("accepts a vk object directly and a zkey filename", async () => {
        const viaVk = await exportVerifier({ protocol: "groth16", curve: "bn128" }, okPlugin(), {});
        assert.strictEqual(viaVk, "protocol=groth16");
        const viaZkey = await exportVerifier(path.join(FIX, "groth16.zkey"), okPlugin(), {});
        assert.strictEqual(viaZkey, "protocol=groth16");
    });

    it("normalizes curve aliases (bn254/alt_bn128/bls12-381)", () => {
        assert.strictEqual(normalizeCurveName("BN254"), "bn128");
        assert.strictEqual(normalizeCurveName("alt_bn128"), "bn128");
        assert.strictEqual(normalizeCurveName("bls12-381"), "bls12381");
        assert.strictEqual(normalizeCurveName("BLS12_381"), "bls12381");
    });

    it("rejects unsupported protocol/curve with an actionable message", async () => {
        await assert.rejects(
            exportVerifier({ protocol: "plonk", curve: "bn128" }, okPlugin(), {}),
            (e) => e.message.includes("cannot export a verifier for plonk on curve bn128")
                && e.message.includes("supports: groth16/bn128"));
        await assert.rejects(
            exportVerifier({ protocol: "groth16", curve: "bls12381" }, okPlugin(), {}),
            /cannot export a verifier for groth16 on curve bls12381/);
    });

    it("suggests alternative plugins that support the requested cell", () => {
        const bls = okPlugin({ name: "solidity-bls" });
        bls.verifier.supports = [{ protocol: "groth16", curve: "bls12-381" }];
        assert.throws(
            () => assertSupports(okPlugin(), "verifier", "groth16", "bls12381", [okPlugin(), bls]),
            /Plugins that support groth16\/bls12381: solidity-bls/);
    });

    it("rejects a wrong apiVersion with an upgrade hint", async () => {
        await assert.rejects(
            exportVerifier({ protocol: "groth16", curve: "bn128" }, okPlugin({ apiVersion: 99 }), {}),
            /targets plugin API v99.*supports v1/s);
    });

    it("rejects malformed plugins with specific messages", () => {
        assert.throws(() => validatePlugin(null), /expected an object/);
        assert.throws(() => validatePlugin({ name: "Bad Name!", apiVersion: 1 }), /"name" must match/);
        assert.throws(() => validatePlugin({ name: "x", apiVersion: 1 }), /neither a verifier nor a calldata/);
        assert.throws(() => validatePlugin({ name: "x", apiVersion: 1, verifier: { supports: [], generate: () => "" } }),
            /supports must be a non-empty array/);
        assert.throws(() => validatePlugin({ name: "x", apiVersion: 1, verifier: { supports: [{ protocol: "groth16", curve: "bn128" }] } }),
            /generate must be a function/);
    });

    it("calldata: passes (proof, publicSignals) in that order and honors formats", async () => {
        const proof = { protocol: "groth16", curve: "bn128" };
        const res = await exportCalldata(proof, ["1", "2"], okPlugin(), { format: "b" });
        assert.deepStrictEqual(res, { files: { "call.txt": "2:b" } });
        await assert.rejects(
            exportCalldata(proof, [], okPlugin(), { format: "nope" }),
            /no calldata format "nope".*Available formats: a, b/s);
        await assert.rejects(exportCalldata({}, [], okPlugin(), {}), /proof\.protocol is missing/);
    });

    it("normalizeResult wraps strings and validates files maps", () => {
        assert.deepStrictEqual(normalizeResult("x", { name: "p" }, "verifier"), { files: { "": "x" } });
        const u8 = new Uint8Array([1]);
        assert.deepStrictEqual(normalizeResult(u8, { name: "p" }, "verifier"), { files: { "": u8 } });
        assert.throws(() => normalizeResult(42, { name: "p" }, "verifier"), /must return a string or \{ files/);
        assert.throws(() => normalizeResult({ files: { a: 42 } }, { name: "p" }, "verifier"), /must be a string or Uint8Array/);
    });

    it("the built-in solidity plugin validates and declares 3 protocols on bn128", () => {
        validatePlugin(solidityPlugin);
        assert.strictEqual(solidityPlugin.name, "solidity");
        assert.strictEqual(solidityPlugin.verifier.supports.length, 3);
        assert.strictEqual(solidityPlugin.calldata.supports.length, 3);
    });
});
