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

import {utils} from "ffjavascript";
const {unstringifyBigInts} = utils;


function p256(n) {
    let nstr = n.toString(16);
    while (nstr.length < 64) nstr = "0" + nstr;
    nstr = `0x${nstr}`;
    return nstr;
}

export default async function fflonkExportCallData(_pub, _proof, logger) {
    const proof = unstringifyBigInts(_proof);
    const pub = unstringifyBigInts(_pub);

    let inputs = "";
    for (let i = 0; i < pub.length; i++) {
        if (inputs !== "") inputs = inputs + ",";
        inputs = inputs + p256(pub[i]);
    }

    const proofCommits = [p256(proof.polynomials.W[0]),p256(proof.polynomials.W[1]), p256(proof.polynomials.Wp[0]), p256(proof.polynomials.Wp[1])];
    for(let i = 0; i < Object.keys(proof.polynomials).length; ++i) {
        const key = Object.keys(proof.polynomials)[i];
        if(key.startsWith("f")) {
            proofCommits.push(p256(proof.polynomials[key][0]));
            proofCommits.push(p256(proof.polynomials[key][1]));
        }
    }

    for(let i = 0; i < Object.keys(proof.evaluations).length; ++i) {
        const key = Object.keys(proof.evaluations)[i];
        proofCommits.push(p256(proof.evaluations[key]));
    }

    return `[${proofCommits.join(",")}], [${inputs}]`;
}
