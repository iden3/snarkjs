/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

    snarkJS is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    snarkJS is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with snarkJS. If not, see <https://www.gnu.org/licenses/>.
*/

// Export-plugin contract (verifiers & calldata for arbitrary blockchains,
// languages, protocols and curves).
//
// A plugin is a plain (ideally frozen) object -- no classes, no registration,
// no global state, so it stays SES-lockdown-safe and tree-shakeable:
//
//     export default Object.freeze({
//         name: "rust-solana",           // CLI id, [a-z0-9-]+
//         apiVersion: 1,                 // plugin API major version targeted
//         description: "…",
//         verifier: {                    // optional capability
//             supports: [{ protocol: "groth16", curve: "bn128" }],
//             defaultOutput: "verifier.rs",  // file; trailing "/" means directory
//             // -> string | { files: { "relative/path": string | Uint8Array } }
//             async generate(vk, params, ctx) {},
//         },
//         calldata: {                    // optional capability
//             supports: [{ protocol: "groth16", curve: "bn128" }],
//             formats: ["rust-const"],   // optional; params.format selects, [0] is default
//             async generate(proof, publicSignals, params, ctx) {},
//         },
//         cli: {                         // optional, CLI-only help sugar
//             verifierUsage: "[circuit_final.zkey] [verifier.rs]",
//             calldataUsage: "[public.json] [proof.json]",
//             help: "…extra flags…",
//         },
//     });
//
// `params` is a plain object (from the CLI: `{ _: [extra positionals],
// format, ...passthroughFlags }`). `ctx` is injected by the dispatchers (see
// context.js): logger, getCurveFromName, a lazy EJS `render`, and common
// byte/bigint utils -- plugins never need to bundle ffjavascript or ejs.
// EJS is a convenience, not a requirement: any engine (a plugin's own
// dependency) or plain string building works, since the contract is only
// the generate() return value.

export const PLUGIN_API_VERSION = 1;

const NAME_RE = /^[a-z0-9][a-z0-9-]*$/;

// Curve names as they appear in artifacts vary (bn128/bn254/BN254, alt_bn128,
// bls12381/bls12-381). Normalize both sides before comparing.
export function normalizeCurveName(name) {
    const n = String(name).toLowerCase().replace(/[_-]/g, "");
    if (n === "bn254" || n === "altbn128" || n === "bn128") return "bn128";
    if (n === "bls12381") return "bls12381";
    return n;
}

function checkCapability(plugin, kind) {
    const cap = plugin[kind];
    if (!cap) return;
    if (!Array.isArray(cap.supports) || cap.supports.length === 0) {
        throw new Error(`Plugin "${plugin.name}": ${kind}.supports must be a non-empty array of {protocol, curve}`);
    }
    for (const s of cap.supports) {
        if (!s || typeof s.protocol !== "string" || typeof s.curve !== "string") {
            throw new Error(`Plugin "${plugin.name}": every ${kind}.supports entry needs string protocol and curve`);
        }
    }
    if (typeof cap.generate !== "function") {
        throw new Error(`Plugin "${plugin.name}": ${kind}.generate must be a function`);
    }
    if (cap.formats !== undefined &&
        (!Array.isArray(cap.formats) || cap.formats.some((f) => typeof f !== "string"))) {
        throw new Error(`Plugin "${plugin.name}": ${kind}.formats must be an array of strings`);
    }
}

// Structural validation with actionable messages. Returns the plugin.
export function validatePlugin(plugin) {
    if (!plugin || typeof plugin !== "object") {
        throw new Error("Not a snarkjs export plugin: expected an object (the plugin module's default export)");
    }
    if (typeof plugin.name !== "string" || !NAME_RE.test(plugin.name)) {
        throw new Error(`Not a snarkjs export plugin: "name" must match ${NAME_RE} (got ${JSON.stringify(plugin.name)})`);
    }
    if (plugin.apiVersion !== PLUGIN_API_VERSION) {
        throw new Error(`Plugin "${plugin.name}" targets plugin API v${plugin.apiVersion}; ` +
            `this snarkjs supports v${PLUGIN_API_VERSION}. Upgrade snarkjs or the plugin.`);
    }
    if (!plugin.verifier && !plugin.calldata) {
        throw new Error(`Plugin "${plugin.name}" declares neither a verifier nor a calldata capability`);
    }
    checkCapability(plugin, "verifier");
    checkCapability(plugin, "calldata");
    return plugin;
}

export function supportsCell(cap, protocol, curve) {
    const c = normalizeCurveName(curve);
    return cap.supports.some((s) => s.protocol === protocol && normalizeCurveName(s.curve) === c);
}

function formatSupports(cap) {
    return cap.supports.map((s) => `${s.protocol}/${normalizeCurveName(s.curve)}`).join(", ");
}

// Throws with a helpful message when the plugin cannot serve
// (kind, protocol, curve). `others` (optional array of plugins) lets the CLI
// suggest alternatives that do support the requested cell.
export function assertSupports(plugin, kind, protocol, curve, others) {
    const cap = plugin[kind];
    const what = kind === "verifier" ? "a verifier" : "calldata";
    if (!cap) {
        throw new Error(`Plugin "${plugin.name}" does not provide ${what} capability`);
    }
    if (supportsCell(cap, protocol, curve)) return;
    let msg = `Plugin "${plugin.name}" cannot export ${what} for ${protocol} on curve ${normalizeCurveName(curve)}.\n` +
        `"${plugin.name}" supports: ${formatSupports(cap)}.`;
    if (Array.isArray(others)) {
        const alt = others
            .filter((p) => p !== plugin && p[kind] && supportsCell(p[kind], protocol, curve))
            .map((p) => p.name);
        if (alt.length) msg += `\nPlugins that support ${protocol}/${normalizeCurveName(curve)}: ${alt.join(", ")}.`;
    }
    throw new Error(msg);
}

// Normalize a generate() result to { files }. A bare string (or Uint8Array)
// becomes { files: { "": artifact } } -- "" meaning "the single default
// artifact" (the CLI writes it to the output path / stdout).
export function normalizeResult(res, plugin, kind) {
    if (typeof res === "string" || res instanceof Uint8Array) {
        return { files: { "": res } };
    }
    if (res && typeof res === "object" && res.files && typeof res.files === "object") {
        for (const [p, content] of Object.entries(res.files)) {
            if (typeof content !== "string" && !(content instanceof Uint8Array)) {
                throw new Error(`Plugin "${plugin.name}": ${kind} file "${p}" must be a string or Uint8Array`);
            }
        }
        return res;
    }
    throw new Error(`Plugin "${plugin.name}": ${kind}.generate must return a string or { files: {…} }`);
}
