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

import { getCurveFromName } from "./curves.js";
import {  utils }   from "ffjavascript";
const { unstringifyBigInts} = utils;

function i2hex(i) {
    return ("0" + i.toString(16)).slice(-2);
}

function p256(n) {
    let nstr = n.toString(16);
    while (nstr.length < 64) nstr = "0"+nstr;
    nstr = `"0x${nstr}"`;
    return nstr;
}

export default async function plonkExportSolidityCallData(_proof, _pub) {
    const proof = unstringifyBigInts(_proof);
    const pub = unstringifyBigInts(_pub);

    const curve = await getCurveFromName(proof.curve);
    const G1 = curve.G1;
    const Fr = curve.Fr;

    let inputs = "";
    for (let i=0; i<pub.length; i++) {
        if (inputs != "") inputs = inputs + ",";
        inputs = inputs + p256(pub[i]);
    }

    const proofBuff = new Uint8Array(G1.F.n8*2*9 + Fr.n8*7);
    G1.toRprUncompressed(proofBuff, 0, G1.e(proof.A));
    G1.toRprUncompressed(proofBuff, G1.F.n8*2, G1.e(proof.B));
    G1.toRprUncompressed(proofBuff, G1.F.n8*4, G1.e(proof.C));
    G1.toRprUncompressed(proofBuff, G1.F.n8*6, G1.e(proof.Z));
    G1.toRprUncompressed(proofBuff, G1.F.n8*8, G1.e(proof.T1));
    G1.toRprUncompressed(proofBuff, G1.F.n8*10, G1.e(proof.T2));
    G1.toRprUncompressed(proofBuff, G1.F.n8*12, G1.e(proof.T3));
    G1.toRprUncompressed(proofBuff, G1.F.n8*14, G1.e(proof.Wxi));
    G1.toRprUncompressed(proofBuff, G1.F.n8*16, G1.e(proof.Wxiw));
    Fr.toRprBE(proofBuff, G1.F.n8*18 , Fr.e(proof.eval_a));
    Fr.toRprBE(proofBuff, G1.F.n8*18 + Fr.n8, Fr.e(proof.eval_b));
    Fr.toRprBE(proofBuff, G1.F.n8*18 + Fr.n8*2, Fr.e(proof.eval_c));
    Fr.toRprBE(proofBuff, G1.F.n8*18 + Fr.n8*3, Fr.e(proof.eval_s1));
    Fr.toRprBE(proofBuff, G1.F.n8*18 + Fr.n8*4, Fr.e(proof.eval_s2));
    Fr.toRprBE(proofBuff, G1.F.n8*18 + Fr.n8*5, Fr.e(proof.eval_zw));
    Fr.toRprBE(proofBuff, G1.F.n8*18 + Fr.n8*6, Fr.e(proof.eval_r));

    const proofHex = Array.from(proofBuff).map(i2hex).join("");

    const S="0x"+proofHex+",["+inputs+"]";

    return S;
}
