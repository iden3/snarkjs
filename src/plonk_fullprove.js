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

import plonk_prove from "./plonk_prove.js";
import wtns_calculate from "./wtns_calculate.js";
import {utils} from 'ffjavascript';
const {unstringifyBigInts} = utils;

export default async function plonkFullProve(_input, wasmFile, zkeyFileName, logger) {
    const input = unstringifyBigInts(_input);

    const wtns= {
        type: "mem"
    };
    await wtns_calculate(input, wasmFile, wtns);
    return await plonk_prove(zkeyFileName, wtns, logger);
}
