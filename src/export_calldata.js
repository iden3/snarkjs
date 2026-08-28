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

import { validatePlugin, assertSupports, normalizeResult } from "./plugins/plugin_api.js";
import { buildPluginContext } from "./plugins/context.js";

// Export proof calldata through an export plugin. Plugins always receive
// (proof, publicSignals) in that order -- the historical fflonk (pub, proof)
// flip is normalized away here. Browser-safe as long as the plugin is.
//
// params.format selects among plugin.calldata.formats (first is the default).
// Returns the plugin's result as-is: a string, or { files: {…} }.
export default async function exportCalldata(proof, publicSignals, plugin, params, options) {
    const opts = options || {};
    validatePlugin(plugin);
    if (!proof || typeof proof.protocol !== "string") {
        throw new Error("exportCalldata: proof.protocol is missing -- pass the parsed proof.json object");
    }
    assertSupports(plugin, "calldata", proof.protocol, proof.curve, opts.plugins);
    const p = params || {};
    const formats = plugin.calldata.formats;
    if (p.format && Array.isArray(formats) && !formats.includes(p.format)) {
        throw new Error(`Plugin "${plugin.name}" has no calldata format "${p.format}". ` +
            `Available formats: ${formats.join(", ")}.`);
    }
    const ctx = buildPluginContext(opts.logger);
    const res = await plugin.calldata.generate(proof, publicSignals, p, ctx);
    normalizeResult(res, plugin, "calldata");
    return res;
}
