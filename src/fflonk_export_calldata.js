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
import { getOrderedEvals } from "shplonkjs";
import * as curves from "./curves.js";
const {unstringifyBigInts} = utils;


function p256(n) {
    let nstr = n.toString(16);
    while (nstr.length < 64) nstr = "0" + nstr;
    nstr = `0x${nstr}`;
    return nstr;
}

export default async function fflonkExportCallData(_pub, _proof, _vk_verifier, logger) {
    const proof = unstringifyBigInts(_proof);
    const pub = unstringifyBigInts(_pub);

    _vk_verifier = unstringifyBigInts(_vk_verifier);
    const curve = await curves.getCurveFromName(_vk_verifier.curve);

    const vk = fromObjectVk(curve, _vk_verifier);

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

    const orderedEvals = getOrderedEvals(vk.f, proof.evaluations);
    for(let i = 0; i < orderedEvals.length; ++i) {
        if(orderedEvals[i].evaluation >= 0n) {
            proofCommits.push(p256(orderedEvals[i].evaluation));
        }
    }

    proofCommits.push(p256(proof.evaluations["inv"]));
    proofCommits.push(p256(proof.evaluations["invPublics"]));

    return `[${proofCommits.join(",")}], [${inputs}]`;
}

function fromObjectVk(curve, vk) {
    const res = vk;
    res.k1 = curve.Fr.fromObject(vk.k1);
    res.k2 = curve.Fr.fromObject(vk.k2);
    res.w = curve.Fr.fromObject(vk.w);
    const ws = Object.keys(vk).filter(k => k.match(/^w\d/));    
    for(let i = 0; i < ws.length; ++i) {
        res[ws[i]] = curve.Fr.fromObject(vk[ws[i]]);
    }
    res.X_2 = curve.G2.fromObject(vk.X_2);
    const fs = Object.keys(vk).filter(k => k.match(/^f\d/));  
    for(let i = 0; i < fs.length; ++i) {
        res[fs[i]] = curve.G1.fromObject(vk[fs[i]]);
    }
    return res;
}
