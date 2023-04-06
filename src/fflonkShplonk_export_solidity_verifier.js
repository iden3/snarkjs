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

import ejs from "ejs";
import { getCurveFromName, utils } from "ffjavascript";
import { exportSolidityShPlonkVerifier, getOrderedEvals,lcm } from "shplonkjs";


export default async function fflonkShPlonkExportSolidityVerifier(vk, templates, logger) {
    if (logger) logger.info("FFLONK EXPORT SOLIDITY VERIFIER STARTED");

    let template = templates[vk.protocol+"ShPlonk"];

    const curve = await getCurveFromName(vk.curve);

    //Precompute omegas
    const omegas = Object.keys(vk).filter(k => k.match(/^w\d+/));
    const ws = {};
    for(let i = 0; i < omegas.length; ++i) {
        if(omegas[i].includes("_")) {
            ws[omegas[i]] = vk[omegas[i]];
            continue;
        }
        let acc = curve.Fr.one;
        let pow = Number(omegas[i].slice(1));
        for(let j = 1; j < Number(omegas[i].slice(1)); ++j) {
            acc = curve.Fr.mul(acc, curve.Fr.e(vk[omegas[i]]));
            ws[`w${pow}_${j}`] = toVkey(acc);
        }
    }

    let orderedEvals = getOrderedEvals(vk.f);

    orderedEvals = orderedEvals.filter(e => !["T0", "T1", "T2"].includes(e.name));

    orderedEvals.push({name: "inv"});
    orderedEvals.push({name: "invPublics"});

    orderedEvals = orderedEvals.map(e => e.name);
    const powerW = lcm(Object.keys(vk).filter(k => k.match(/^w\d+$/)).map(wi => wi.slice(1)));

    vk.powerW = powerW;
    
    const verificationCode = ejs.render(template, {vk, orderedEvals, ws, nonCommittedPols: ["T0", "T1", "T2"]});

    const verificationShPlonkCode = await exportSolidityShPlonkVerifier(vk, curve, {logger, nonCommittedPols: ["T0", "T1", "T2"], extendLoops: true, xiSeed: true});

    if (logger) logger.info("FFLONK EXPORT SOLIDITY VERIFIER FINISHED");

    const verifierCode1 = verificationCode.slice(0, verificationCode.indexOf("function verifyProof"));
    const verifierCode2 = verificationCode.slice(verificationCode.indexOf("function verifyProof"));
    
    let verifierCommitmentShPlonk = verificationShPlonkCode.slice(verificationShPlonkCode.indexOf("function verifyCommitments"), verificationShPlonkCode.lastIndexOf("}") - 1);
    verifierCommitmentShPlonk = verifierCommitmentShPlonk.replace("public view", "internal view");

    return verifierCode1 + "    " + verifierCommitmentShPlonk + "\n\n    " + verifierCode2;

    function toVkey(val) {
        const str = curve.Fr.toObject(val);
        return utils.stringifyBigInts(str);
    }
}

