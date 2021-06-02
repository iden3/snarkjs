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

import { Scalar } from "ffjavascript";
import { readR1cs }  from "r1csfile";

const bls12381r = Scalar.e("73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001", 16);
const bn128r = Scalar.e("21888242871839275222246405745257275088548364400416034343698204186575808495617");

export default async function r1csInfo(r1csName, logger) {

    const cir = await readR1cs(r1csName);

    if (Scalar.eq(cir.prime, bn128r)) {
        if (logger) logger.info("Curve: bn-128");
    } else if (Scalar.eq(cir.prime, bls12381r)) {
        if (logger) logger.info("Curve: bls12-381");
    } else {
        if (logger) logger.info(`Unknown Curve. Prime: ${Scalar.toString(cir.prime)}`);
    }
    if (logger) logger.info(`# of Wires: ${cir.nVars}`);
    if (logger) logger.info(`# of Constraints: ${cir.nConstraints}`);
    if (logger) logger.info(`# of Private Inputs: ${cir.nPrvInputs}`);
    if (logger) logger.info(`# of Public Inputs: ${cir.nPubInputs}`);
    if (logger) logger.info(`# of Labels: ${cir.nLabels}`);
    if (logger) logger.info(`# of Outputs: ${cir.nOutputs}`);

    return cir;
}
