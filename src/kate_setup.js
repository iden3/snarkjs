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
import {log2} from "./misc.js";

export default async function kateSetup(pilFile, pilConfigFile, cnstPolsFile, ptauFile, vkOutputFile, logger) {
    logger.info("Starting kate setup");

    const {fd: fdPTau, sections: sectionsPTau} = await readBinFile(ptauFile, "ptau", 1, 1 << 22, 1 << 24);
    if (!sectionsPTau[12]) {
        if (logger) logger.error("Powers of tau is not prepared.");
        return -1;
    }

    const {curve, ptauPower} = await readPTauHeader(fdPTau, sectionsPTau);

    const F = new F1Field("0xFFFFFFFF00000001");

    const pil = await compile(F, pilFile, null, pilConfigFile);

    //Find the max polDeg
    let maxPolDeg = 0;
    for (const polRef in pil.references) {
        maxPolDeg = Math.max(maxPolDeg, pil.references[polRef].polDeg);
    }

    const pilPower = log2(maxPolDeg - 1) + 1;
    const domainSize = 2 ** pilPower;

    if (pilPower > ptauPower) {
        if (logger) logger.error(`PIL polygons degree is too big for this powers of Tau, 2**${pilPower} > 2**${ptauPower}`);
        return -1;
    }

    const sG1 = curve.G1.F.n8*2;
    //    const G1 = curve.G1;
    //    const sG2 = curve.G2.F.n8*2;
    //    const Fr = curve.Fr;

    const pTau = new BigBuffer(domainSize * sG1);
    const o = sectionsPTau[12][0].p + ((2 ** (pilPower)) - 1) * sG1;
    await fdPTau.readToBuffer(pTau, 0, domainSize * sG1, o);

    // Load preprocessed polynomials
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
        const polynomial = await Polynomial.fromBuffer(cnstPolBuffer, curve.Fr, logger);
        //polynomial.blindCoefficients([challenges.b[0], challenges.b[1]]);

        vKey.pols[cnstPols.$$defArray[i].name] = await multiExpPolynomial(polynomial, pTau, curve, logger);
    }

    vKey = stringifyBigInts(vKey);
    console.log(vKey);

    logger.info("Kate setup finished");

    return 0;

}

async function multiExpPolynomial(polynomial, ptau, curve, logger) {
    return await expTau(polynomial.coef, ptau, curve, logger);
}