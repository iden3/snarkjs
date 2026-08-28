// Node-only leaf (stubbed in browser bundles via vite.config.js
// nodeOnlyFiles): Solidity verifier generation for groth16/plonk/fflonk on
// bn128. This is the canonical implementation; the legacy
// zkey_export_solidityverifier / fflonk_export_solidity_verifier entry
// points are shims over it.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

// Template resolution has to work from two layouts: the source tree
// (src/plugins/solidity/ -> ../../../templates) and the bundled builds
// (build/main.cjs, build/cli.cjs -> ../templates). Same dual-path dance the
// CLI has always done.
const TEMPLATE_DIR_CANDIDATES = [
    path.join(moduleDir, "..", "..", "..", "templates"),
    path.join(moduleDir, "..", "templates"),
    path.join(moduleDir, "templates"),
];

async function loadDefaultTemplates() {
    for (const dir of TEMPLATE_DIR_CANDIDATES) {
        try {
            await fs.promises.access(path.join(dir, "verifier_groth16.sol.ejs"));
        } catch (e) {
            continue;
        }
        const [groth16, plonk, fflonk] = await Promise.all([
            fs.promises.readFile(path.join(dir, "verifier_groth16.sol.ejs"), "utf8"),
            fs.promises.readFile(path.join(dir, "verifier_plonk.sol.ejs"), "utf8"),
            fs.promises.readFile(path.join(dir, "verifier_fflonk.sol.ejs"), "utf8"),
        ]);
        return { groth16, plonk, fflonk };
    }
    /* c8 ignore next 2 -- only reachable from a broken installation */
    throw new Error("solidity plugin: cannot locate the templates/ directory");
}

// Moved verbatim from fflonk_export_solidity_verifier.js: the fflonk template
// needs precomputed powers of the roots of unity. Mutates the vk, matching
// the historical behavior.
async function augmentFflonkVk(vk, ctx) {
    if (ctx.logger) ctx.logger.info("FFLONK EXPORT SOLIDITY VERIFIER STARTED");
    const curve = await ctx.getCurveFromName(vk.curve);
    const { unstringifyBigInts, stringifyBigInts } = ctx.utils;

    const fromVkey = (str) => curve.Fr.fromObject(unstringifyBigInts(str));
    const toVkey = (val) => stringifyBigInts(curve.Fr.toObject(val));

    const w3 = fromVkey(vk.w3);
    vk.w3_2 = toVkey(curve.Fr.square(w3));

    const w4 = fromVkey(vk.w4);
    vk.w4_2 = toVkey(curve.Fr.square(w4));
    vk.w4_3 = toVkey(curve.Fr.mul(curve.Fr.square(w4), w4));

    const w8 = fromVkey(vk.w8);
    let acc = curve.Fr.one;
    for (let i = 1; i < 8; i++) {
        acc = curve.Fr.mul(acc, w8);
        vk["w8_" + i] = toVkey(acc);
    }
    if (ctx.logger) ctx.logger.info("FFLONK EXPORT SOLIDITY VERIFIER FINISHED");
}

export default async function generateSolidityVerifier(vk, params, ctx) {
    const templates = (params && params.templates) || await loadDefaultTemplates();
    const template = templates[vk.protocol];
    if (!template) {
        throw new Error(`solidity plugin: no template provided for protocol "${vk.protocol}"`);
    }
    if (vk.protocol === "fflonk") await augmentFflonkVk(vk, ctx);
    return ctx.render(template, vk);
}
