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

import {readR1cs}  from "r1csfile";
import { stringifyBigIntsWithField } from "./misc.js";


export default async function r1csExportJson(r1csFileName, logger) {

    const cir = await readR1cs(r1csFileName, true, true, true, logger);
    const Fr=cir.curve.Fr;
    delete cir.curve;
    delete cir.F;

    return stringifyBigIntsWithField(Fr, cir);
}
