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

import exportVerificationKey from "./zkey_export_verificationkey.js";
import { validatePlugin, assertSupports, normalizeResult } from "./plugins/plugin_api.js";
import { buildPluginContext } from "./plugins/context.js";

// Export a verifier through an export plugin.
//
//   zkeyOrVk : a zkey source (filename / fastfile descriptor) or an already
//              exported verification-key object (anything with a string
//              .protocol) -- normalizes the historical asymmetry where the
//              fflonk exporter took a vk and the others took a zkey.
//   plugin   : a plugin OBJECT (import it and pass it -- there is no registry
//              in the library API).
//   params   : plain object handed to the plugin (CLI puts positionals in
//              params._ and passthrough flags alongside).
//   options  : { logger, plugins } -- `plugins` (optional array) only enriches
//              capability-mismatch errors with alternatives.
//
// Returns the plugin's result as-is: a string, or { files: {relPath: content} }.
export default async function exportVerifier(zkeyOrVk, plugin, params, options) {
    const opts = options || {};
    validatePlugin(plugin);
    const vk = (zkeyOrVk && typeof zkeyOrVk === "object" && typeof zkeyOrVk.protocol === "string")
        ? zkeyOrVk
        : await exportVerificationKey(zkeyOrVk, opts.logger);
    assertSupports(plugin, "verifier", vk.protocol, vk.curve, opts.plugins);
    const ctx = buildPluginContext(opts.logger);
    const res = await plugin.verifier.generate(vk, params || {}, ctx);
    normalizeResult(res, plugin, "verifier"); // shape check; callers get the raw result
    return res;
}
