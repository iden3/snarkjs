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

import {getCurveFromName} from "./curves.js";
import {utils} from "ffjavascript";

const {unstringifyBigInts} = utils;

function i2hex(i) {
    return ("0" + i.toString(16)).slice(-2);
}

function p256(n) {
    let nstr = n.toString(16);
    while (nstr.length < 64) nstr = "0" + nstr;
    nstr = `0x${nstr}`;
    return nstr;
}

export default async function fflonkExportCallData(_pub, _proof) {
    const proof = unstringifyBigInts(_proof);
    const pub = unstringifyBigInts(_pub);

    const curve = await getCurveFromName(proof.curve);
    const G1 = curve.G1;
    const Fr = curve.Fr;

    let inputs = "";
    for (let i = 0; i < pub.length; i++) {
        if (inputs !== "") inputs = inputs + ",";
        inputs = inputs + p256(pub[i]);
    }

    return `[${p256(proof.polynomials.C1[0])}, ${p256(proof.polynomials.C1[1])},` +
    `${p256(proof.polynomials.C2[0])},${p256(proof.polynomials.C2[1])},` +
    `${p256(proof.polynomials.W1[0])},${p256(proof.polynomials.W1[1])},` +
    `${p256(proof.polynomials.W2[0])},${p256(proof.polynomials.W2[1])},` +
    `${p256(proof.evaluations.ql)},${p256(proof.evaluations.qr)},${p256(proof.evaluations.qm)},` +
    `${p256(proof.evaluations.qo)},${p256(proof.evaluations.qc)},${p256(proof.evaluations.s1)},` +
    `${p256(proof.evaluations.s2)},${p256(proof.evaluations.s3)},${p256(proof.evaluations.a)},` +
    `${p256(proof.evaluations.b)},${p256(proof.evaluations.c)},${p256(proof.evaluations.z)},` +
    `${p256(proof.evaluations.zw)},${p256(proof.evaluations.t1w)},${p256(proof.evaluations.t2w)},` +
    `${p256(proof.evaluations.inv)}],` +
    `[${inputs}]`;
}
