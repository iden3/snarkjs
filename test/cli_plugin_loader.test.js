import { loadPlugins, getPlugin, formatPluginList } from "../src/cli_plugin_loader.js";
import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";

// Config-file plugin resolution (CLI-only layer). SNARKJS_CONFIG points each
// case at a throwaway config so the tests are independent of process.cwd().

const REPO = path.join(path.dirname(new URL(import.meta.url).pathname), "..");

function withConfig(content) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "snarkjs-plugin-test-"));
    const p = path.join(dir, "snarkjs.config.mjs");
    fs.writeFileSync(p, content);
    process.env.SNARKJS_CONFIG = p;
    return { dir, path: p };
}

function writeLocalPlugin(dir, name, body) {
    const p = path.join(dir, `${name}.mjs`);
    fs.writeFileSync(p, body);
    return p;
}

const MINIMAL_PLUGIN = (name) => `export default {
    name: ${JSON.stringify(name)}, apiVersion: 1,
    calldata: { supports: [{ protocol: "groth16", curve: "bn128" }], generate: async () => "x" },
};`;

describe("CLI plugin loader", function () {
    afterEach(() => { delete process.env.SNARKJS_CONFIG; });

    it("with no config, built-ins are available and the list says so", async () => {
        process.env.SNARKJS_CONFIG = ""; // falsy -> cwd probe; run from repo root (no config there)
        delete process.env.SNARKJS_CONFIG;
        const cwd = process.cwd();
        process.chdir(os.tmpdir());
        try {
            const loaded = await loadPlugins();
            assert.deepStrictEqual([...loaded.byName.keys()], ["solidity"]);
            assert.strictEqual(loaded.configPath, null);
            assert.ok(formatPluginList(loaded).includes("(no snarkjs.config.mjs found"));
            assert.ok(formatPluginList(loaded).includes("verifier: groth16/bn128, plonk/bn128, fflonk/bn128"));
        } finally {
            process.chdir(cwd);
        }
    });

    it("loads relative-path plugins from the config and lists their source", async () => {
        const cfg = withConfig("export default { plugins: [\"./extra.mjs\"] };");
        writeLocalPlugin(cfg.dir, "extra", MINIMAL_PLUGIN("extra"));
        const loaded = await loadPlugins();
        assert.deepStrictEqual([...loaded.byName.keys()], ["solidity", "extra"]);
        assert.ok(formatPluginList(loaded).includes("extra  (./extra.mjs)"));
        assert.strictEqual(getPlugin(loaded, "extra").name, "extra");
    });

    it("loads the in-tree json example plugin through a config", async () => {
        const jsonPluginPath = path.join(REPO, "examples", "plugins", "json", "index.js");
        withConfig(`export default { plugins: [${JSON.stringify(jsonPluginPath)}] };`);
        const loaded = await loadPlugins();
        const json = getPlugin(loaded, "json");
        assert.strictEqual(json.calldata.formats[0], "pretty");
    });

    it("rejects a config plugin whose name collides with a built-in", async () => {
        const cfg = withConfig("export default { plugins: [\"./fake.mjs\"] };");
        writeLocalPlugin(cfg.dir, "fake", MINIMAL_PLUGIN("solidity"));
        await assert.rejects(loadPlugins(), /reserved by a built-in plugin/);
    });

    it("rejects duplicate names between config plugins", async () => {
        const cfg = withConfig("export default { plugins: [\"./a.mjs\", \"./b.mjs\"] };");
        writeLocalPlugin(cfg.dir, "a", MINIMAL_PLUGIN("twin"));
        writeLocalPlugin(cfg.dir, "b", MINIMAL_PLUGIN("twin"));
        await assert.rejects(loadPlugins(), /Duplicate plugin name "twin"/);
    });

    it("unknown plugin names produce a helpful error", async () => {
        const cfg = withConfig("export default { plugins: [\"./extra.mjs\"] };");
        writeLocalPlugin(cfg.dir, "extra", MINIMAL_PLUGIN("extra"));
        const loaded = await loadPlugins();
        assert.throws(() => getPlugin(loaded, "nope"),
            /Unknown plugin "nope"\. Available plugins: solidity, extra\./);
    });

    it("an unresolvable specifier names the config file in the error", async () => {
        withConfig("export default { plugins: [\"totally-not-installed-pkg\"] };");
        await assert.rejects(loadPlugins(), /Cannot load plugin "totally-not-installed-pkg" \(from .*snarkjs\.config\.mjs\)/);
    });
});
