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

import ejs from "ejs";
import exportVerificationKey from "./zkey_export_verificationkey.js";
import { utils } from "ffjavascript";

const { unstringifyBigInts, leInt2Buff } = utils;

/**
 * Convert a G1 point to Rust byte array format.
 * Each coordinate: BigInt -> 32 bytes little-endian -> reverse bytes
 * Result: 64 bytes total (x: 32, y: 32)
 */
function convertG1Point(point) {
    const x = Array.from(leInt2Buff(point[0], 32)).reverse();
    const y = Array.from(leInt2Buff(point[1], 32)).reverse();
    return [...x, ...y];
}

/**
 * Convert a G2 point to Rust byte array format.
 * Each coordinate pair: concatenate both elements (64 bytes), reverse all, then split back.
 * Result: 128 bytes total (x: 64, y: 64)
 */
function convertG2Point(point) {
    // point[0] = [x0, x1], point[1] = [y0, y1]
    const x0 = Array.from(leInt2Buff(point[0][0], 32));
    const x1 = Array.from(leInt2Buff(point[0][1], 32));
    const xCombined = [...x0, ...x1].reverse();

    const y0 = Array.from(leInt2Buff(point[1][0], 32));
    const y1 = Array.from(leInt2Buff(point[1][1], 32));
    const yCombined = [...y0, ...y1].reverse();

    return [...xCombined, ...yCombined];
}

/**
 * Convert verification key to Rust-compatible byte arrays.
 */
function convertVkToRustFormat(vk) {
    const vkData = unstringifyBigInts(vk);

    return {
        protocol: vkData.protocol,
        curve: vkData.curve,
        nr_pubinputs: vkData.IC.length,
        vk_alpha_g1: convertG1Point(vkData.vk_alpha_1),
        vk_beta_g2: convertG2Point(vkData.vk_beta_2),
        vk_gamma_g2: convertG2Point(vkData.vk_gamma_2),
        vk_delta_g2: convertG2Point(vkData.vk_delta_2),
        vk_ic: vkData.IC.map(ic => convertG1Point(ic))
    };
}

export default async function groth16ExportRustVerifier(zkeyName, template, logger) {
    const verificationKey = await exportVerificationKey(zkeyName, logger);

    if (verificationKey.protocol !== "groth16") {
        throw new Error("Only groth16 protocol is supported for Rust verifier export");
    }

    const rustVk = convertVkToRustFormat(verificationKey);

    return ejs.render(template, rustVk);
}
