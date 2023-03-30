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
import { getCurveFromName } from "ffjavascript";
import { exportSolidityShPlonkVerifier } from "shplonkjs";
import { lcm } from "shplonkjs/src/utils.js";

export default async function fflonkExportSolidityVerifier(vk, templates, logger) {
    if (logger) logger.info("FFLONK EXPORT SOLIDITY VERIFIER STARTED");

    let template = templates[vk.protocol];


    const powerW = lcm(Object.keys(vk).filter(k => k.match(/^w\d+$/)).map(wi => wi.slice(1)));

    vk.powerW = powerW;
    
    const verificationCode = ejs.render(template, {vk});

    const curve = await getCurveFromName(vk.curve);

    const verificationShPlonkCode = await exportSolidityShPlonkVerifier(vk, curve, {logger, nonCommittedPols: ["T0", "T1", "T2"], extendLoops: true, xiSeed: true});

    if (logger) logger.info("FFLONK EXPORT SOLIDITY VERIFIER FINISHED");

    return verificationCode + "\n" + verificationShPlonkCode.substring(verificationShPlonkCode.indexOf("contract ShPlonkVerifier"));
}

