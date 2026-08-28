/*
    Copyright 2021 0KIMS association.

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

// Legacy entry point, kept for back-compat (fflonk.exportSolidityVerifier(vk,
// templates, logger) takes a vk object, unlike the zkey-taking groth16/plonk
// path). Routes through the built-in solidity export plugin; the vk
// augmentation (w3_2, w4_2, w4_3, w8_1..7) now lives in the plugin. Output is
// byte-identical.
import exportVerifier from "./zkey_export_verifier.js";
import solidityPlugin from "./plugins/solidity/index.js";

export default async function fflonkExportSolidityVerifier(vk, templates, logger) {
    return exportVerifier(vk, solidityPlugin, { templates }, { logger });
}
