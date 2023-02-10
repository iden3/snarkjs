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

import fflonkProve from "../fflonk_prove.js";
import wtns_calculate from "../wtns_calculate.js";
import {utils} from "ffjavascript";
const {unstringifyBigInts, stringifyBigInts} = utils;
import fs from "fs";
import bfj from "bfj";


export async function fflonkFullProveCmd(zkeyFilename, witnessInputsFilename, wasmFilename, publicInputsFilename, proofFilename, logger) {
    let input = JSON.parse(await fs.promises.readFile(witnessInputsFilename, "utf8"));
    input = unstringifyBigInts(input);

    const wtns= {type: "mem"};

    // Compute the witness
    await wtns_calculate(input, wasmFilename, wtns);

    // Compute the proof
    const {proof, publicSignals} = await fflonkProve(zkeyFilename, wtns, logger);

    // Write the proof and the publig signals in each file
    await bfj.write(proofFilename, stringifyBigInts(proof), {space: 1});
    await bfj.write(publicInputsFilename, stringifyBigInts(publicSignals), {space: 1});

    return 0;
}