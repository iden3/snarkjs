/*
    Copyright 2018 0KIMS association.

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

import * as binFileUtils from "@iden3/binfileutils";
import * as wtnsUtils from "./wtns_utils.js";
import { readR1csFd } from "r1csfile";
import { Scalar } from "ffjavascript";
import * as curves from "./curves.js";

export default async function wtnsCheck(r1csFilename, wtnsFilename, logger) {

    if (logger) logger.info("WITNESS CHECKING STARTED");

    // Read r1cs file
    if (logger) logger.info("> Reading r1cs file");
    const {
        fd: fdR1cs,
        sections: sectionsR1cs
    } = await binFileUtils.readBinFile(r1csFilename, "r1cs", 1, 1 << 22, 1 << 24);
    const r1cs = await readR1csFd(fdR1cs, sectionsR1cs, { loadConstraints: false, loadCustomGates: false });

    // Read witness file
    if (logger) logger.info("> Reading witness file");
    const {
        fd: fdWtns,
        sections: wtnsSections
    } = await binFileUtils.readBinFile(wtnsFilename, "wtns", 2, 1 << 22, 1 << 24);
    const wtnsHeader = await wtnsUtils.readHeader(fdWtns, wtnsSections);

    if (!Scalar.eq(r1cs.prime, wtnsHeader.q)) {
        throw new Error("Curve of the witness does not match the curve of the proving key");
    }

    const buffWitness = await binFileUtils.readSection(fdWtns, wtnsSections, 2);
    await fdWtns.close();

    const curve = await curves.getCurveFromR(r1cs.prime);
    const Fr = curve.Fr;
    const sFr = Fr.n8;

    const bR1cs = await binFileUtils.readSection(fdR1cs, sectionsR1cs, 2);

    if (logger) {
        logger.info("----------------------------");
        logger.info("  WITNESS CHECK");
        logger.info(`  Curve:          ${r1cs.curve.name}`);
        logger.info(`  Vars (wires):   ${r1cs.nVars}`);
        logger.info(`  Outputs:        ${r1cs.nOutputs}`);
        logger.info(`  Public Inputs:  ${r1cs.nPubInputs}`);
        logger.info(`  Private Inputs: ${r1cs.nPrvInputs}`);
        logger.info(`  Labels:         ${r1cs.nLabels}`);
        logger.info(`  Constraints:    ${r1cs.nConstraints}`);
        logger.info(`  Custom Gates:   ${r1cs.useCustomGates}`);
        logger.info("----------------------------");
    }

    if (logger) logger.info("> Checking witness correctness");

    let bR1csPos = 0;
    let res = true;
    for (let i = 0; i < r1cs.nConstraints; i++) {
        if ((logger) && (i !== 0) && (i % 500000 === 0)) {
            logger.info(`··· processing r1cs constraints ${i}/${r1cs.nConstraints}`);
        }

        //Read the three linear combinations of the constraint where A * B - C = 0
        const lcA = readLC();
        const lcB = readLC();
        const lcC = readLC();

        // Evaluate the linear combinations
        const evalA = EvaluateLinearCombination(lcA);
        const evalB = EvaluateLinearCombination(lcB);
        const evalC = EvaluateLinearCombination(lcC);

        // Check that A * B - C == 0
        if (!Fr.eq(Fr.sub(Fr.mul(evalA, evalB), evalC), Fr.zero)) {
            logger.warn("··· aborting checking process at constraint " + i);
            res = false;
            break;
        }
    }

    fdR1cs.close();

    if (logger) {
        if (res) {
            logger.info("WITNESS IS CORRECT");
            logger.info("WITNESS CHECKING FINISHED SUCCESSFULLY");
        } else {
            logger.warn("WITNESS IS NOT CORRECT");
            logger.warn("WITNESS CHECKING FINISHED UNSUCCESSFULLY");
        }
    }

    return res;

    function EvaluateLinearCombination(lc) {
        let res = Fr.zero;

        const keys = Object.keys(lc);
        keys.forEach((signalId) => {
            const signalValue = getWitnessValue(signalId);
            const signalFactor = lc[signalId];

            res = Fr.add(res, Fr.mul(signalValue, signalFactor));
        });

        return res;
    }

    function readLC() {
        const lc = {};

        const buffUL32 = bR1cs.slice(bR1csPos, bR1csPos + 4);
        bR1csPos += 4;
        const buffUL32V = new DataView(buffUL32.buffer);
        const nIdx = buffUL32V.getUint32(0, true);

        const buff = bR1cs.slice(bR1csPos, bR1csPos + (4 + r1cs.n8) * nIdx);
        bR1csPos += (4 + r1cs.n8) * nIdx;
        const buffV = new DataView(buff.buffer);
        for (let i = 0; i < nIdx; i++) {
            const idx = buffV.getUint32(i * (4 + r1cs.n8), true);
            const val = r1cs.F.fromRprLE(buff, i * (4 + r1cs.n8) + 4);
            lc[idx] = val;
        }
        return lc;
    }

    function getWitnessValue(signalId) {
        return Fr.fromRprLE(buffWitness.slice(signalId * sFr, signalId * sFr + sFr));
    }
}