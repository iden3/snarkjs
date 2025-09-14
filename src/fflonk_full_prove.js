/*
    This file is part of snarkjs.

    snarkjs is a free software: you can redistribute it and/or
    modify it under the terms of the GNU General Public License as published by the
    Free Software Foundation, either version 3 of the License, or (at your option)
    any later version.

    snarkjs is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
    more details.

    You should have received a copy of the GNU General Public License along with
    snarkjs. If not, see <https://www.gnu.org/licenses/>.
*/

import fflonkProve from "./fflonk_prove.js";
import wtns_calculate from "./wtns_calculate.js";
import {utils} from "ffjavascript";
const {unstringifyBigInts} = utils;

export default async function fflonkFullProve(_input, wasmFilename, zkeyFilename, logger, wtnsCalcOptions, proverOptions) {
    const input = unstringifyBigInts(_input);

    const wtns= {type: "mem"};

    // Compute the witness
    await wtns_calculate(input, wasmFilename, wtns, wtnsCalcOptions);

    // Compute the proof
    return await fflonkProve(zkeyFilename, wtns, logger, proverOptions);
}