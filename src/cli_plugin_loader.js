// CLI-only plugin resolution (imported exclusively from cli.js -- never part
// of library/browser builds). Built-in plugins need zero configuration;
// third-party ones are declared in a config file in the working directory:
//
//     // snarkjs.config.mjs
//     export default {
//         plugins: [
//             "snarkjs-plugin-rust-solana",   // npm package (resolved from YOUR project)
//             "./tools/my-plugin.mjs",        // or a local module
//         ],
//     };
//
// SNARKJS_CONFIG=<path> overrides the config location (useful for scripts).
// The library API never reads config files: code passes plugin objects
// explicitly to zKey.exportVerifier / zKey.exportCalldata.
import path from "path";
import fs from "fs";
import { createRequire } from "module";
import { pathToFileURL } from "url";
import { validatePlugin, normalizeCurveName } from "./plugins/plugin_api.js";

const BUILTIN_LOADERS = {
    solidity: () => import("./plugins/solidity/index.js"),
};

const CONFIG_NAMES = ["snarkjs.config.mjs", "snarkjs.config.js"];

function findConfig() {
    if (process.env.SNARKJS_CONFIG) {
        const p = path.resolve(process.env.SNARKJS_CONFIG);
        if (!fs.existsSync(p)) throw new Error(`SNARKJS_CONFIG points to a missing file: ${p}`);
        return p;
    }
    for (const name of CONFIG_NAMES) {
        const p = path.resolve(process.cwd(), name);
        if (fs.existsSync(p)) return p;
    }
    return null;
}

async function importPluginModule(spec, configPath) {
    const configDir = path.dirname(configPath);
    let target;
    if (spec.startsWith(".") || path.isAbsolute(spec)) {
        target = pathToFileURL(path.resolve(configDir, spec)).href;
    } else {
        // bare package specifier: resolve from the USER's project (anchored
        // at the config file), not from wherever snarkjs itself lives --
        // this keeps resolution correct from the bundled build/cli.cjs too
        const req = createRequire(pathToFileURL(configPath));
        target = pathToFileURL(req.resolve(spec)).href;
    }
    return import(target);
}

// Loads built-ins plus config-declared plugins.
// Returns { byName: Map(name -> {plugin, source}), configPath }.
export async function loadPlugins() {
    const byName = new Map();
    for (const [name, load] of Object.entries(BUILTIN_LOADERS)) {
        const plugin = validatePlugin((await load()).default);
        byName.set(name, { plugin, source: "built-in" });
    }

    const configPath = findConfig();
    if (configPath) {
        let cfg;
        try {
            cfg = (await import(pathToFileURL(configPath).href)).default;
        } catch (err) {
            throw new Error(`Cannot load config ${configPath}: ${err.message}`, { cause: err });
        }
        const specs = (cfg && cfg.plugins) || [];
        if (!Array.isArray(specs)) throw new Error(`${configPath}: "plugins" must be an array of module specifiers`);
        for (const spec of specs) {
            let mod;
            try {
                mod = await importPluginModule(spec, configPath);
            } catch (err) {
                throw new Error(`Cannot load plugin "${spec}" (from ${configPath}): ${err.message}`, { cause: err });
            }
            const plugin = validatePlugin(mod.default !== undefined ? mod.default : mod.plugin);
            const existing = byName.get(plugin.name);
            if (existing) {
                // no shadowing, ever: names are the unit of selection
                if (existing.source === "built-in") {
                    throw new Error(`Plugin name "${plugin.name}" (from "${spec}") is reserved by a built-in plugin -- rename the plugin in ${configPath}`);
                }
                throw new Error(`Duplicate plugin name "${plugin.name}" in ${configPath} ("${spec}" and "${existing.source}")`);
            }
            byName.set(plugin.name, { plugin, source: spec });
        }
    }
    return { byName, configPath };
}

export function getPlugin(loaded, name) {
    const entry = loaded.byName.get(name);
    if (!entry) {
        const available = [...loaded.byName.keys()].join(", ");
        throw new Error(`Unknown plugin "${name}". Available plugins: ${available}.` +
            (loaded.configPath ? "" : " Third-party plugins are configured in snarkjs.config.mjs."));
    }
    return entry.plugin;
}

export function allPlugins(loaded) {
    return [...loaded.byName.values()].map((e) => e.plugin);
}

function capabilityLine(cap) {
    return cap.supports.map((s) => `${s.protocol}/${normalizeCurveName(s.curve)}`).join(", ");
}

export function formatPluginList(loaded) {
    const lines = [];
    for (const [name, { plugin, source }] of loaded.byName) {
        lines.push(`${name}  (${source})${plugin.description ? "  -- " + plugin.description : ""}`);
        if (plugin.verifier) lines.push(`    verifier: ${capabilityLine(plugin.verifier)}`);
        if (plugin.calldata) {
            const formats = plugin.calldata.formats ? `  formats: ${plugin.calldata.formats.join(", ")}` : "";
            lines.push(`    calldata: ${capabilityLine(plugin.calldata)}${formats}`);
        }
    }
    if (!loaded.configPath) lines.push("(no snarkjs.config.mjs found in the working directory)");
    return lines.join("\n");
}
