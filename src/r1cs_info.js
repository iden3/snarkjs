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

import { Scalar } from "ffjavascript";
import { readR1cs, readR1csFd } from "r1csfile";

import {
    getFFlonkAdditionConstraint,
    getFFlonkConstantConstraint,
    getFFlonkMultiplicationConstraint
} from "./plonk_equation.js";
import { r1csConstraintProcessor } from "./r1cs_constraint_processor.js";
import * as binFileUtils from "@iden3/binfileutils";

import { readBinFile } from "@iden3/binfileutils";

const bls12381r = Scalar.e("73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001", 16);
const bn128r = Scalar.e("21888242871839275222246405745257275088548364400416034343698204186575808495617");


export default async function r1csInfo(r1csName, checkAdditions, logger) {
    const cir = await readR1cs(r1csName, false);

    let nConstraints, nAdditions;
    if (checkAdditions) {
        ({ nConstraints, nAdditions } = await countConstraints(cir.F, r1csName, logger));
    }

    let curve;
    if (Scalar.eq(cir.prime, bn128r)) {
        curve = "Curve: bn-128";
    } else if (Scalar.eq(cir.prime, bls12381r)) {
        curve = "Curve: bls12-381";
    } else {
        curve = `Unknown. Prime: ${Scalar.toString(cir.prime)}`;
    }

    if (logger) {
        logger.info("----------------------------");
        logger.info("  R1CS INFO");

        logger.info(`  Curve: ${curve}`);
        logger.info(`  # of Wires: ${cir.nVars}`);
        logger.info(`  # of Constraints: ${cir.nConstraints}`);
        if (checkAdditions) logger.info(`# of Additions: ${nAdditions}`);
        logger.info(`  # of Private Inputs: ${cir.nPrvInputs}`);
        logger.info(`  # of Public Inputs: ${cir.nPubInputs}`);
        logger.info(`  # of Labels: ${cir.nLabels}`);
        logger.info(`  # of Outputs: ${cir.nOutputs}`);

        logger.info("----------------------------");
    }

    return cir;
}

async function countConstraints(Fr, r1csFilename, logger) {
    const { fd: fdR1cs, sections: sectionsR1cs } = await readBinFile(r1csFilename, "r1cs", 1, 1 << 22, 1 << 24);
    const r1cs = await readR1csFd(fdR1cs, sectionsR1cs, { loadConstraints: false, loadCustomGates: true });

    // Add all constraints from r1cs file
    const r1csProcessor = new r1csConstraintProcessor(Fr, getFFlonkConstantConstraint, getFFlonkAdditionConstraint, getFFlonkMultiplicationConstraint, logger);

    const bR1cs = await binFileUtils.readSection(fdR1cs, sectionsR1cs, 2);
    let bR1csPos = 0;
    let settings = {
        nVars: 0
    };

    let nConstraints = 0;
    let nAdditions = 0;

    for (let i = 0; i < r1cs.nConstraints; i++) {
        if (i !== 0 && i % 100000 === 0) {
            if (logger) logger.info(`Processed ${i}/${r1cs.nConstraints} constraints`);
        }
        const [constraints, additions] = r1csProcessor.processR1csConstraint(settings, ...readConstraint());
        nConstraints += constraints.length;
        nAdditions += additions.length;
    }

    await fdR1cs.close();

    return { nConstraints, nAdditions };

    function readConstraint() {
        const c = [];
        c[0] = readLC();
        c[1] = readLC();
        c[2] = readLC();
        return c;
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
}

