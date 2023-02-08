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

import ejs from "ejs";
import {getCurveFromName} from "./curves.js";
import {utils} from "ffjavascript";

const {unstringifyBigInts, stringifyBigInts} = utils;

export default async function fflonkExportSolidityVerifier(vk, templates, logger) {
    if (logger) logger.info("FFLONK EXPORT SOLIDITY VERIFIER STARTED");

    const curve = await getCurveFromName(vk.curve);

    // Precompute w3_2, w4_2 and w4_3
    let w3 = fromVkey(vk.w3);
    vk.w3_2 = toVkey(curve.Fr.square(w3));

    let w4 = fromVkey(vk.w4);
    vk.w4_2 = toVkey(curve.Fr.square(w4));
    vk.w4_3 = toVkey(curve.Fr.mul(curve.Fr.square(w4), w4));

    let w8 = fromVkey(vk.w8);
    let acc = curve.Fr.one;

    for (let i = 1; i < 8; i++) {
        acc = curve.Fr.mul(acc, w8);
        vk["w8_" + i] = toVkey(acc);
    }

    let template = templates[vk.protocol];

    if (logger) logger.info("FFLONK EXPORT SOLIDITY VERIFIER FINISHED");

    return ejs.render(template, vk);

    function fromVkey(str) {
        const val = unstringifyBigInts(str);
        return curve.Fr.fromObject(val);
    }

    function toVkey(val) {
        const str = curve.Fr.toObject(val);
        return stringifyBigInts(str);
    }
}

