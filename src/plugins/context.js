// Builds the `ctx` object injected into export-plugin generate() calls, so
// plugins never bundle their own ffjavascript/ejs copies (the duplication
// that sank upstream PR #410's companion package).
import { getCurveFromName } from "../curves.js";
import { utils as ffUtils } from "ffjavascript";
import renderEjs from "./render_ejs.js";

const { unstringifyBigInts, stringifyBigInts, leInt2Buff, leBuff2int } = ffUtils;

// 0x-prefixed, zero-padded 256-bit hex. The historical Solidity calldata
// builders each carried a private variant (the groth16 one adds quotes);
// this is the canonical unquoted form.
export function p256(n) {
    let nstr = BigInt(n).toString(16);
    while (nstr.length < 64) nstr = "0" + nstr;
    return "0x" + nstr;
}

/* c8 ignore next 4 -- reached only from browser bundles, where the ejs leaf is stubbed */
function renderUnavailable() {
    throw new Error("ctx.render (ejs) is unavailable in browser bundles; " +
        "generate strings directly or run this plugin under Node");
}

export function buildPluginContext(logger) {
    return {
        logger,
        getCurveFromName,
        render: renderEjs || renderUnavailable,
        utils: { unstringifyBigInts, stringifyBigInts, leInt2Buff, leBuff2int, p256 },
    };
}
