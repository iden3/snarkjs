/*
    Copyright 2022 iden3

    This file is part of snarkjs

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

import {BigBuffer, F1Field} from "ffjavascript";
import {newConstantPolsArray, compile} from "pilcom";
import {Polynomial} from "./polynomial/polynomial.js";
import {expTau} from "./polynomial/evaluations.js";
import {utils as ffjavascriptUtils} from "ffjavascript";

const {stringifyBigInts} = ffjavascriptUtils;
import {readBinFile} from "@iden3/binfileutils";
import {readPTauHeader} from "./powersoftau_utils.js";

export default async function kateSetup(pilFile, pilConfigFile, cnstPolsFile, ptauFile, vkOutputFile, logger) {
    logger.info("Starting kate setup");

    //Get ptau data
    const {fd: fdPTau, sections: sectionsPTau} = await readBinFile(ptauFile, "ptau", 1, 1 << 22, 1 << 24);
    const {curve, power} = await readPTauHeader(fdPTau, sectionsPTau);

    // let cirPower = log2(plonkConstraints.length -1) +1;
    // if (cirPower < 3) cirPower = 3;   // As the t polinomal is n+5 whe need at least a power of 4
    // const domainSize = 2 ** cirPower;
    //
    // if (logger) logger.info("Plonk constraints: " + plonkConstraints.length);
    // if (cirPower > power) {
    //     if (logger) logger.error(`circuit too big for this power of tau ceremony. ${plonkConstraints.length} > 2**${power}`);
    //     return -1;
    // }
    //
    // if (!sectionsPTau[12]) {
    //     if (logger) logger.error("Powers of tau is not prepared.");
    //     return -1;
    // }
    //
    //
    // const ptau = new BigBuffer(domainSize*sG1);
    // const o = sectionsPTau[12][0].p + ((2 ** (cirPower)) -1)*sG1;
    // await fdPTau.readToBuffer(LPoints, 0, domainSize*sG1, o);


    const F = new F1Field("0xFFFFFFFF00000001");

    const pil = await compile(F, pilFile, null, pilConfigFile);

    //Find the max polDeg
    // const maxDeg = Math.max(....map(o => o.y))

    const cnstPols = newConstantPolsArray(pil);
    await cnstPols.loadFromFile(cnstPolsFile);

    let vKey = {
        protocol: "kate",
    };

    vKey.pols = {};
    for (let i = 0; i < cnstPols.$$nPols; i++) {
        const cnstPol = cnstPols.$$defArray[i];
        const cnstPolBuffer = cnstPols.$$array[i];

        if (logger) {
            logger.info(`Preparing ${cnstPol.name} polynomial`);
        }

        //Calculates the commitment
        const polynomial = await Polynomial.fromBuffer(cnstPolBuffer, F, logger);
        //polynomial.blindCoefficients([challenges.b[0], challenges.b[1]]);

        vKey.pols[cnstPols.$$defArray[i].name] = 22;//await multiExpPolynomial(polynomial, ptau, curve, logger); TODO
    }

    vKey = stringifyBigInts(vKey);
    console.log(vKey);

    logger.info("Kate setup finished");

    return 0;

}

async function multiExpPolynomial(polynomial, ptau, curve, logger) {
    return await expTau(polynomial.coef, ptau, curve, logger);
}