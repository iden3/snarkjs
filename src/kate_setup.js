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
import {expTau} from "./polynomial/evaluations.js";
import {utils as ffjavascriptUtils} from "ffjavascript";

const {stringifyBigInts} = ffjavascriptUtils;
import {readBinFile} from "@iden3/binfileutils";
import {readPTauHeader} from "./powersoftau_utils.js";
import {log2} from "./misc.js";
import {Polynomial} from "./polynomial/polynomial.js";

export default async function kateSetup(pilFile, pilConfigFile, cnstPolsFile, ptauFile, logger) {
    logger.info("Starting kate setup");

    const {fd: fdPTau, sections: sectionsPTau} = await readBinFile(ptauFile, "ptau", 1, 1 << 22, 1 << 24);
    if (!sectionsPTau[12]) {
        if (logger) logger.error("Powers of tau is not prepared.");
        return -1;
    }

    const {curve, ptauPower} = await readPTauHeader(fdPTau, sectionsPTau);
    const F = new F1Field("0xFFFFFFFF00000001");

    // PIL compile
    const pil = await compile(F, pilFile, null, pilConfigFile);

    //Find the max PIL polynomial degree
    let maxPilPolDeg = 0;
    for (const polRef in pil.references) {
        maxPilPolDeg = Math.max(maxPilPolDeg, pil.references[polRef].polDeg);
    }

    const pilPower = log2(maxPilPolDeg - 1) + 1;
    const domainSize = 2 ** pilPower;

    if (pilPower > ptauPower) {
        if (logger) logger.error(`PIL polynomials degree is too big for this powers of Tau, 2**${pilPower} > 2**${ptauPower}`);
        return -1;
    }

    const sG1 = curve.G1.F.n8 * 2;
    const sG2 = curve.G2.F.n8 * 2;

    const pTau = new BigBuffer(domainSize * sG1);
    const o = sectionsPTau[12][0].p + ((2 ** (pilPower)) - 1) * sG1;
    await fdPTau.readToBuffer(pTau, 0, domainSize * sG1, o);

    let preprocessed = {
        protocol: "kate",
        curve: "bn128",
        power: pilPower,
        w: curve.Fr.toObject(curve.Fr.w[pilPower]),
        X_2: curve.G2.toObject(await fdPTau.read(sG2, sectionsPTau[3][0].p + sG2)),
        polynomials: {},
    };

    // Load preprocessed polynomials
    const cnstPols = newConstantPolsArray(pil);
    await cnstPols.loadFromFile(cnstPolsFile);

    for (let i = 0; i < cnstPols.$$nPols; i++) {
        const cnstPol = cnstPols.$$defArray[i];
        const cnstPolBuffer = cnstPols.$$array[i];

        if (logger) {
            logger.info(`Preparing ${cnstPol.name} polynomial`);
        }

        // Get the polynomial coefficient
        let polCoefs = await F.ifft(cnstPolBuffer);

        // Convert from one filed to another (bigger), TODO check if a new constraint is needed
        let polCoefsBuff = new BigBuffer(polCoefs.length * curve.Fr.n8);
        for (let i = 0; i < polCoefs.length; i++) {
            polCoefsBuff.set(curve.Fr.e(polCoefs[i]), i * curve.Fr.n8);
        }

        const domainSize = cnstPolBuffer.length;
        let pol4T = await Polynomial.to4T(polCoefsBuff, domainSize, [], curve.Fr);
        pol4T = await pol4T.divZh(domainSize);

        // Calculates the commitment
        const polCommitment = await expTau(pol4T.coef, pTau, curve, logger);

        // Add the commitment to the preprocessed polynomials
        preprocessed.polynomials[cnstPols.$$defArray[i].name] = curve.G1.toObject(polCommitment);
    }

    fdPTau.close();

    logger.info("Kate setup finished");

    return stringifyBigInts(preprocessed);
}