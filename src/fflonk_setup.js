/*
    Copyright 2022 iden3 association.

    This file is part of snarkjs.

    snarkjs is a free software: you can redistribute it and/or
    modify it under the terms of the GNU General Public License as published by the
    Free Software Foundation, either version 3 of the License, or (at your option)
    any later version.

    snarkjs is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
    more details.

    You should have received a copy of the GNU General Public License along with
    snarkjs. If not, see <https://www.gnu.org/licenses/>.
*/

import {readR1csFd} from "r1csfile";
import * as utils from "./powersoftau_utils.js";
import {createBinFile, endWriteSection, readBinFile, startWriteSection, writeBigInt,} from "@iden3/binfileutils";
import {log2} from "./misc.js";
import {BigBuffer, Scalar} from "ffjavascript";
import BigArray from "./bigarray.js";
import {
    FF_HEADER_ZKEY_SECTION,
    FF_ADDITIONS_ZKEY_SECTION,
    FF_A_MAP_ZKEY_SECTION,
    FF_B_MAP_ZKEY_SECTION,
    FF_C_MAP_ZKEY_SECTION,
    FF_QL_ZKEY_SECTION,
    FF_QR_ZKEY_SECTION,
    FF_QM_ZKEY_SECTION,
    FF_QO_ZKEY_SECTION,
    FF_QC_ZKEY_SECTION,
    FF_SIGMA1_ZKEY_SECTION,
    FF_SIGMA2_ZKEY_SECTION,
    FF_SIGMA3_ZKEY_SECTION,
    FF_LAGRANGE_ZKEY_SECTION,
    FF_PTAU_ZKEY_SECTION,
    FF_T_POL_DEG_MIN,
    FF_ZKEY_NSECTIONS,
} from "./fflonk.js";
import {FFLONK_PROTOCOL_ID, HEADER_ZKEY_SECTION} from "./zkey.js";
import {
    getFFlonkAdditionConstraint,
    getFFlonkConstantConstraint,
    getFFlonkMultiplicationConstraint
} from "./plonk_equation.js";
import {r1csConstraintProcessor} from "./r1cs_constraint_processor.js";
import {Polynomial} from "./polynomial/polynomial.js";


export default async function fflonkSetup(r1csFilename, ptauFilename, zkeyFilename, logger) {
    if (logger) logger.info("FFLONK SETUP STARTED");

    if (globalThis.gc) globalThis.gc();

    // Read PTau file
    if (logger) logger.info("> Reading PTau file");
    const {fd: fdPTau, sections: pTauSections} = await readBinFile(ptauFilename, "ptau", 1, 1 << 22, 1 << 24);
    if (!pTauSections[12]) {
        throw new Error("Powers of tau is not prepared.");
    }

    // Get curve defined in PTau
    if (logger) logger.info("> Getting curve from PTau settings");
    const {curve, curvePower} = await utils.readPTauHeader(fdPTau, pTauSections);

    // Read r1cs file
    if (logger) logger.info("> Reading r1cs file");
    const {fd: fdR1cs, sections: sectionsR1cs} = await readBinFile(r1csFilename, "r1cs", 1, 1 << 22, 1 << 24);
    const r1cs = await readR1csFd(fdR1cs, sectionsR1cs, {loadConstraints: true, loadCustomGates: true});
    await fdR1cs.close();

    // Potential error checks
    if (r1cs.prime !== curve.r) {
        throw new Error("r1cs curve does not match powers of tau ceremony curve");
    }

    // Initializations
    const Fr = curve.Fr;

    const sFr = curve.Fr.n8;
    const sG1 = curve.G1.F.n8 * 2;
    const sG2 = curve.G2.F.n8 * 2;

    let settings = {
        nVars: r1cs.nVars,
        nPublic: r1cs.nOutputs + r1cs.nPubInputs
    };

    const plonkConstraints = new BigArray();
    const plonkAdditions = new BigArray();

    // Process constraints inside r1cs
    if (logger) logger.info("> Processing FFlonk constraints");
    await computeFFConstraints(curve.Fr, r1cs, logger);
    if (globalThis.gc) globalThis.gc();

    // As the t polynomial is n+5 whe need at least a power of 4
    //TODO review if 3 is ok and then extract the value to a constant
    settings.cirPower = Math.max(FF_T_POL_DEG_MIN, log2(plonkConstraints.length - 1) + 1);
    if (settings.cirPower > curvePower) {
        throw new Error(`circuit too big for this power of tau ceremony. ${plonkConstraints.length} > 2**${curvePower}`);
    }

    settings.domainSize = 2 ** settings.cirPower;

    if (logger) {
        logger.info("----------------------------");
        logger.info("  FFLONK SETUP SETTINGS");
        logger.info(`  Curve:         ${curve.name}`);
        logger.info(`  Circuit power: ${settings.cirPower}`);
        logger.info(`  Domain size:   ${settings.domainSize}`);
        logger.info(`  Vars:          ${settings.nVars}`);
        logger.info(`  Public vars:   ${settings.nPublic}`);
        logger.info(`  Constraints:   ${plonkConstraints.length}`);
        logger.info(`  Additions:     ${plonkAdditions.length}`);
        logger.info("----------------------------");
    }

    // Compute k1 and k2 to be used in the permutation checks
    const [k1, k2] = computeK1K2();

    // Compute omega 3 (w3) and omega 4 (w4) to be used in the prover and the verifier
    // w3^3 = 1 and  w4^4 = 1
    const w3 = computeW3();
    const w4 = computeW4();
    const wr = getOmegaCubicRoot(settings.cirPower, curve.Fr);

    // Write output zkey file
    await writeZkeyFile();

    await fdPTau.close();

    if (logger) logger.info("FFLONK SETUP FINISHED");

    return 0;

    async function computeFFConstraints(Fr, r1cs, logger) {
        // Add public inputs and outputs
        for (let i = 0; i < settings.nPublic; i++) {
            plonkConstraints.push(getFFlonkConstantConstraint(i + 1, Fr));
        }

        // Add all constraints from r1cs file
        const r1csProcessor = new r1csConstraintProcessor(Fr, getFFlonkConstantConstraint, getFFlonkAdditionConstraint, getFFlonkMultiplicationConstraint, logger);

        for (let i = 0; i < r1cs.constraints.length; i++) {
            if ((logger) && (i !== 0) && (i % 10000 === 0)) {
                logger.info(`...processing r1cs constraints... ${i}/${r1cs.nConstraints}`);
            }
            const [constraints, additions] = r1csProcessor.processR1csConstraint(settings, ...r1cs.constraints[i]);

            plonkConstraints.push(...constraints);
            plonkAdditions.push(...additions);
        }
        return 0;
    }

    async function writeZkeyFile() {
        if (logger) logger.info("> Writing the zkey file");
        const fdZKey = await createBinFile(zkeyFilename, "zkey", 1, FF_ZKEY_NSECTIONS, 1 << 22, 1 << 24);

        if (logger) logger.info(`···· Writing Section ${HEADER_ZKEY_SECTION}. Zkey Header`);
        await writeZkeyHeader(fdZKey);

        if (logger) logger.info(`···· Writing Section ${FF_ADDITIONS_ZKEY_SECTION}. Additions`);
        await writeAdditions(fdZKey);
        if (globalThis.gc) globalThis.gc();

        if (logger) logger.info(`···· Writing Section ${FF_A_MAP_ZKEY_SECTION}. A Map`);
        await writeWitnessMap(fdZKey, FF_A_MAP_ZKEY_SECTION, 0, "A map");
        if (globalThis.gc) globalThis.gc();

        if (logger) logger.info(`···· Writing Section ${FF_B_MAP_ZKEY_SECTION}. B Map`);
        await writeWitnessMap(fdZKey, FF_B_MAP_ZKEY_SECTION, 1, "B map");
        if (globalThis.gc) globalThis.gc();

        if (logger) logger.info(`···· Writing Section ${FF_C_MAP_ZKEY_SECTION}. C Map`);
        await writeWitnessMap(fdZKey, FF_C_MAP_ZKEY_SECTION, 2, "C map");
        if (globalThis.gc) globalThis.gc();

        if (logger) logger.info(`···· Writing Section ${FF_QL_ZKEY_SECTION}. QL`);
        await writeQMap(fdZKey, FF_QL_ZKEY_SECTION, 3, "QL");
        if (globalThis.gc) globalThis.gc();

        if (logger) logger.info(`···· Writing Section ${FF_QR_ZKEY_SECTION}. QR`);
        await writeQMap(fdZKey, FF_QR_ZKEY_SECTION, 4, "QR");
        if (globalThis.gc) globalThis.gc();

        if (logger) logger.info(`···· Writing Section ${FF_QM_ZKEY_SECTION}. QM`);
        await writeQMap(fdZKey, FF_QM_ZKEY_SECTION, 5, "QM");
        if (globalThis.gc) globalThis.gc();

        if (logger) logger.info(`···· Writing Section ${FF_QO_ZKEY_SECTION}. QO`);
        await writeQMap(fdZKey, FF_QO_ZKEY_SECTION, 6, "QO");
        if (globalThis.gc) globalThis.gc();

        if (logger) logger.info(`···· Writing Section ${FF_QC_ZKEY_SECTION}. QC`);
        await writeQMap(fdZKey, FF_QC_ZKEY_SECTION, 7, "QC");
        if (globalThis.gc) globalThis.gc();

        if (logger) logger.info(`···· Writing Sections ${FF_SIGMA1_ZKEY_SECTION},${FF_SIGMA2_ZKEY_SECTION},${FF_SIGMA3_ZKEY_SECTION}. Sigma1, Sigma2 & Sigma 3`);
        await writeSigma(fdZKey);
        if (globalThis.gc) globalThis.gc();

        if (logger) logger.info(`···· Writing Section ${FF_LAGRANGE_ZKEY_SECTION}. Lagrange Polynomials`);
        await writeLagrangePolynomials(fdZKey);
        if (globalThis.gc) globalThis.gc();

        if (logger) logger.info(`···· Writing Section ${FF_PTAU_ZKEY_SECTION}. Powers of Tau`);
        await writePtau(fdZKey);
        if (globalThis.gc) globalThis.gc();

        if (logger) logger.info(`···· Writing Section ${FF_HEADER_ZKEY_SECTION}. FFlonk Header`);
        await writeFFlonkHeader(fdZKey);
        if (globalThis.gc) globalThis.gc();

        if (logger) logger.info("> Writing the zkey file finished");

        await fdZKey.close();
    }

    async function writeZkeyHeader(fdZKey) {
        await startWriteSection(fdZKey, HEADER_ZKEY_SECTION);
        await fdZKey.writeULE32(FFLONK_PROTOCOL_ID);
        await endWriteSection(fdZKey);
    }

    async function writeAdditions(fdZKey) {
        await startWriteSection(fdZKey, FF_ADDITIONS_ZKEY_SECTION);

        // Written values are 2 * 32 bit integers (2 * 4 bytes) + 2 field size values ( 2 * sFr bytes)
        const buffOut = new Uint8Array(8 + 2 * sFr);
        const buffOutV = new DataView(buffOut.buffer);

        for (let i = 0; i < plonkAdditions.length; i++) {
            const addition = plonkAdditions[i];

            buffOutV.setUint32(0, addition[0], true);
            buffOutV.setUint32(4, addition[1], true);

            // The value is storen in  Montgomery. stored = v*R
            // so when montgomery multiplicated by the witness  it result = v*R*w/R = v*w

            buffOut.set(addition[2], 8);
            buffOut.set(addition[3], 8 + sFr);

            await fdZKey.write(buffOut);
            if ((logger) && (i !== 0) && (i % 1000000 === 0)) logger.info(`writing Additions: ${i}/${plonkAdditions.length}`);
        }
        await endWriteSection(fdZKey);
    }

    async function writeWitnessMap(fdZKey, sectionNum, posConstraint, name) {
        await startWriteSection(fdZKey, sectionNum);
        for (let i = 0; i < plonkConstraints.length; i++) {
            if (logger && (i !== 0) && (i % 1000000 === 0)) {
                logger.info(`writing witness ${name}: ${i}/${plonkConstraints.length}`);
            }

            await fdZKey.writeULE32(plonkConstraints[i][posConstraint]);
        }
        await endWriteSection(fdZKey);
    }

    async function writeQMap(fdZKey, sectionNum, posConstraint, name) {
        // Compute Q from q evaluations
        let Q = new BigBuffer(settings.domainSize * sFr);

        for (let i = 0; i < plonkConstraints.length; i++) {
            Q.set(plonkConstraints[i][posConstraint], i * sFr);
            if ((logger) && (i !== 0) && (i % 1000000 === 0)) {
                logger.info(`writing ${name}: ${i}/${plonkConstraints.length}`);
            }
        }

        // Write Q coefficients and evaluations
        await startWriteSection(fdZKey, sectionNum);
        await writeP4(fdZKey, Q);
        await endWriteSection(fdZKey);
    }

    async function writeSigma(fdZKey) {
        // Compute sigma
        const sigma = new BigBuffer(sFr * settings.domainSize * 3);
        const lastSeen = new BigArray(settings.nVars);
        const firstPos = new BigArray(settings.nVars);

        let w = Fr.one;
        for (let i = 0; i < settings.domainSize; i++) {
            if (i < plonkConstraints.length) {
                buildSigma(plonkConstraints[i][0], i);
                buildSigma(plonkConstraints[i][1], settings.domainSize + i);
                buildSigma(plonkConstraints[i][2], settings.domainSize * 2 + i);
            } else {
                buildSigma(0, i);
                buildSigma(0, settings.domainSize + i);
                buildSigma(0, settings.domainSize * 2 + i);
            }
            w = Fr.mul(w, Fr.w[settings.cirPower]);

            if ((logger) && (i !== 0) && (i % 1000000 === 0)) {
                logger.info(`writing sigma phase1: ${i}/${plonkConstraints.length}`);
            }
        }

        for (let i = 0; i < settings.nVars; i++) {
            if (typeof firstPos[i] !== "undefined") {
                sigma.set(lastSeen[i], firstPos[i] * sFr);
            } else {
                // throw new Error("Variable not used");
                console.log("Variable not used");
            }
            if ((logger) && (i !== 0) && (i % 1000000 === 0)) logger.info(`writing sigma phase2: ${i}/${settings.nVars}`);
        }

        if (globalThis.gc) globalThis.gc();

        // Write sigma coefficients and evaluations
        for (let i = 0; i < 3; i++) {
            const sectionId = 0 === i ? FF_SIGMA1_ZKEY_SECTION : 1 === i ? FF_SIGMA2_ZKEY_SECTION : FF_SIGMA3_ZKEY_SECTION;

            await startWriteSection(fdZKey, sectionId);
            let S = sigma.slice(settings.domainSize * sFr * i, settings.domainSize * sFr * (i + 1));
            await writeP4(fdZKey, S);
            await endWriteSection(fdZKey);

            if (globalThis.gc) globalThis.gc();
        }

        return 0;

        function buildSigma(s, p) {
            if (typeof lastSeen[s] === "undefined") {
                firstPos[s] = p;
            } else {
                sigma.set(lastSeen[s], p * sFr);
            }
            let v;
            if (p < settings.domainSize) {
                v = w;
            } else if (p < 2 * settings.domainSize) {
                v = Fr.mul(w, k1);
            } else {
                v = Fr.mul(w, k2);
            }

            lastSeen[s] = v;
        }
    }

    async function writeLagrangePolynomials(fdZKey) {
        await startWriteSection(fdZKey, FF_LAGRANGE_ZKEY_SECTION);

        const l = Math.max(settings.nPublic, 1);
        for (let i = 0; i < l; i++) {
            let buff = new BigBuffer(settings.domainSize * sFr);
            buff.set(Fr.one, i * sFr);

            await writeP4(fdZKey, buff);
        }
        await endWriteSection(fdZKey);
    }

    async function writePtau(fdZKey) {
        await startWriteSection(fdZKey, FF_PTAU_ZKEY_SECTION);

        //TODO check size of Buffer to write!!
        const buffOut = new BigBuffer((settings.domainSize * 2) * sG1);
        await fdPTau.readToBuffer(buffOut, 0, (settings.domainSize * 2) * sG1, pTauSections[2][0].p);

        await fdZKey.write(buffOut);
        await endWriteSection(fdZKey);
    }

    async function writeFFlonkHeader(fdZKey) {
        await startWriteSection(fdZKey, FF_HEADER_ZKEY_SECTION);

        const primeQ = curve.q;
        const n8q = (Math.floor((Scalar.bitLength(primeQ) - 1) / 64) + 1) * 8;
        await fdZKey.writeULE32(n8q);
        await writeBigInt(fdZKey, primeQ, n8q);

        const primeR = curve.r;
        const n8r = (Math.floor((Scalar.bitLength(primeR) - 1) / 64) + 1) * 8;
        await fdZKey.writeULE32(n8r);
        await writeBigInt(fdZKey, primeR, n8r);

        // Total number of r1cs vars
        await fdZKey.writeULE32(settings.nVars);
        // Total number of r1cs public vars = outputs + public inputs
        await fdZKey.writeULE32(settings.nPublic);
        await fdZKey.writeULE32(settings.domainSize);
        await fdZKey.writeULE32(plonkAdditions.length);
        await fdZKey.writeULE32(plonkConstraints.length);

        await fdZKey.write(k1);
        await fdZKey.write(k2);

        await fdZKey.write(w3);
        await fdZKey.write(w4);
        await fdZKey.write(wr);

        let bX_2;
        bX_2 = await fdPTau.read(sG2, pTauSections[3][0].p + sG2);
        await fdZKey.write(bX_2);

        await endWriteSection(fdZKey);
    }

    async function writeP4(fdZKey, buff) {
        const [coefficients, evaluations4] = await Polynomial.to4T(buff, settings.domainSize, [], Fr);

        await fdZKey.write(coefficients);
        await fdZKey.write(evaluations4);
    }

    function computeK1K2() {
        let k1 = Fr.two;
        while (isIncluded(k1, [], settings.cirPower)) Fr.add(k1, Fr.one);
        let k2 = Fr.add(k1, Fr.one);
        while (isIncluded(k2, [k1], settings.cirPower)) Fr.add(k2, Fr.one);
        return [k1, k2];

        function isIncluded(k, kArr, pow) {
            const domainSize = 2 ** pow;
            let w = Fr.one;
            for (let i = 0; i < domainSize; i++) {
                if (Fr.eq(k, w)) return true;
                for (let j = 0; j < kArr.length; j++) {
                    if (Fr.eq(k, Fr.mul(kArr[j], w))) return true;
                }
                w = Fr.mul(w, Fr.w[pow]);
            }
            return false;
        }
    }

    function computeW3() {
        let generator = Fr.e(31624);

        // Exponent is order(r - 1) / 3
        let orderRsub1 = 3648040478639879203707734290876212514758060733402672390616367364429301415936n;
        let exponent = Scalar.div(orderRsub1, Scalar.e(3));

        return Fr.exp(generator, exponent);
    }

    function computeW4() {
        return Fr.w[2];
    }

    function getOmegaCubicRoot(power, Fr) {
        // Hardcorded 3th-root of Fr.w[28]
        const firstRoot = Fr.e(467799165886069610036046866799264026481344299079011762026774533774345988080n);

        return Fr.exp(firstRoot, 2 ** (28 - power));
    }

}


