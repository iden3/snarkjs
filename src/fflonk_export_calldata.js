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
    nstr = `"0x${nstr}"`;
    return nstr;
}

export default async function fflonkExportCallData(_pub, _proof, logger) {
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

    const proofBuff = new Uint8Array(G1.F.n8 * 2 * 4 + Fr.n8 * 16);

    G1.toRprUncompressed(proofBuff, 0, G1.e(proof.polynomials.C1));
    G1.toRprUncompressed(proofBuff, G1.F.n8 * 2, G1.e(proof.polynomials.C2));
    G1.toRprUncompressed(proofBuff, G1.F.n8 * 4, G1.e(proof.polynomials.W1));
    G1.toRprUncompressed(proofBuff, G1.F.n8 * 6, G1.e(proof.polynomials.W2));
    Fr.toRprBE(proofBuff, G1.F.n8 * 8, Fr.e(proof.evaluations.ql));
    Fr.toRprBE(proofBuff, G1.F.n8 * 8 + Fr.n8, Fr.e(proof.evaluations.qr));
    Fr.toRprBE(proofBuff, G1.F.n8 * 8 + Fr.n8 * 2, Fr.e(proof.evaluations.qm));
    Fr.toRprBE(proofBuff, G1.F.n8 * 8 + Fr.n8 * 3, Fr.e(proof.evaluations.qo));
    Fr.toRprBE(proofBuff, G1.F.n8 * 8 + Fr.n8 * 4, Fr.e(proof.evaluations.qc));
    Fr.toRprBE(proofBuff, G1.F.n8 * 8 + Fr.n8 * 5, Fr.e(proof.evaluations.s1));
    Fr.toRprBE(proofBuff, G1.F.n8 * 8 + Fr.n8 * 6, Fr.e(proof.evaluations.s2));
    Fr.toRprBE(proofBuff, G1.F.n8 * 8 + Fr.n8 * 7, Fr.e(proof.evaluations.s3));
    Fr.toRprBE(proofBuff, G1.F.n8 * 8 + Fr.n8 * 8, Fr.e(proof.evaluations.a));
    Fr.toRprBE(proofBuff, G1.F.n8 * 8 + Fr.n8 * 9, Fr.e(proof.evaluations.b));
    Fr.toRprBE(proofBuff, G1.F.n8 * 8 + Fr.n8 * 10, Fr.e(proof.evaluations.c));
    Fr.toRprBE(proofBuff, G1.F.n8 * 8 + Fr.n8 * 11, Fr.e(proof.evaluations.z));
    Fr.toRprBE(proofBuff, G1.F.n8 * 8 + Fr.n8 * 12, Fr.e(proof.evaluations.zw));
    Fr.toRprBE(proofBuff, G1.F.n8 * 8 + Fr.n8 * 13, Fr.e(proof.evaluations.t1w));
    Fr.toRprBE(proofBuff, G1.F.n8 * 8 + Fr.n8 * 14, Fr.e(proof.evaluations.t2w));
    Fr.toRprBE(proofBuff, G1.F.n8 * 8 + Fr.n8 * 15, Fr.e(proof.evaluations.inv));

    const proofHex = Array.from(proofBuff).map(i2hex).join("");

    return `0x${proofHex},[${inputs}]`;
}
