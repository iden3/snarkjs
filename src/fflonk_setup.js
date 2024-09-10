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
    ZKEY_FF_HEADER_SECTION,
    ZKEY_FF_ADDITIONS_SECTION,
    ZKEY_FF_A_MAP_SECTION,
    ZKEY_FF_B_MAP_SECTION,
    ZKEY_FF_C_MAP_SECTION,
    ZKEY_FF_QL_SECTION,
    ZKEY_FF_QR_SECTION,
    ZKEY_FF_QM_SECTION,
    ZKEY_FF_QO_SECTION,
    ZKEY_FF_QC_SECTION,
    ZKEY_FF_SIGMA1_SECTION,
    ZKEY_FF_SIGMA2_SECTION,
    ZKEY_FF_SIGMA3_SECTION,
    ZKEY_FF_LAGRANGE_SECTION,
    ZKEY_FF_PTAU_SECTION,
    FF_T_POL_DEG_MIN,
    ZKEY_FF_NSECTIONS,
    ZKEY_FF_C0_SECTION,
} from "./fflonk_constants.js";
import {FFLONK_PROTOCOL_ID, HEADER_ZKEY_SECTION} from "./zkey_constants.js";
import {
    getFFlonkAdditionConstraint,
    getFFlonkConstantConstraint,
    getFFlonkMultiplicationConstraint
} from "./plonk_equation.js";
import {r1csConstraintProcessor} from "./r1cs_constraint_processor.js";
import {Polynomial} from "./polynomial/polynomial.js";
import * as binFileUtils from "@iden3/binfileutils";
import {Evaluations} from "./polynomial/evaluations.js";
import {CPolynomial} from "./polynomial/cpolynomial.js";


export default async function fflonkSetup(r1csFilename, ptauFilename, zkeyFilename, logger) {
    if (logger) logger.info("FFLONK SETUP STARTED");

    if (globalThis.gc) globalThis.gc();

    // Read PTau file
    if (logger) logger.info("> Reading PTau file");
    const {fd: fdPTau, sections: pTauSections} = await readBinFile(ptauFilename, "ptau", 1, 1 << 22, 1 << 24);
    if (!pTauSections[12]) {
        throw new Error("Powers of Tau is not well prepared. Section 12 missing.");
    }

    // Get curve defined in PTau
    if (logger) logger.info("> Getting curve from PTau settings");
    const {curve} = await utils.readPTauHeader(fdPTau, pTauSections);

    // Read r1cs file
    if (logger) logger.info("> Reading r1cs file");
    const {fd: fdR1cs, sections: sectionsR1cs} = await readBinFile(r1csFilename, "r1cs", 1, 1 << 22, 1 << 24);
    const r1cs = await readR1csFd(fdR1cs, sectionsR1cs, {loadConstraints: false, loadCustomGates: true});

    // Potential error checks
    if (r1cs.prime !== curve.r) {
        throw new Error("r1cs curve does not match powers of tau ceremony curve");
    }

    // Initializations
    const Fr = curve.Fr;

    const sFr = curve.Fr.n8;
    const sG1 = curve.G1.F.n8 * 2;
    const sG2 = curve.G2.F.n8 * 2;

    let polynomials = {};
    let evaluations = {};
    let PTau;

    let settings = {
        nVars: r1cs.nVars,
        nPublic: r1cs.nOutputs + r1cs.nPubInputs
    };

    const plonkConstraints = new BigArray();
    let plonkAdditions = new BigArray();

    // Process constraints inside r1cs
    if (logger) logger.info("> Processing FFlonk constraints");
    await computeFFConstraints(curve.Fr, r1cs, logger);
    if (globalThis.gc) globalThis.gc();

    // As the t polynomial is n+5 we need at least a power of 4
    //TODO check!!!!
    // NOTE : plonkConstraints + 2 = #constraints + blinding coefficients for each wire polynomial
    settings.cirPower = Math.max(FF_T_POL_DEG_MIN, log2((plonkConstraints.length + 2) - 1) + 1);
    settings.domainSize = 2 ** settings.cirPower;

    if (pTauSections[2][0].size < (settings.domainSize * 9 + 18) * sG1) {
        throw new Error("Powers of Tau is not big enough for this circuit size. Section 2 too small.");
    }
    if (pTauSections[3][0].size < sG2) {
        throw new Error("Powers of Tau is not well prepared. Section 3 too small.");
    }

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
    if (logger) logger.info("> computing k1 and k2");
    const [k1, k2] = computeK1K2();

    // Compute omega 3 (w3) and omega 4 (w4) to be used in the prover and the verifier
    // w3^3 = 1 and  w4^4 = 1
    if (logger) logger.info("> computing w3");
    const w3 = computeW3();
    if (logger) logger.info("> computing w4");
    const w4 = computeW4();
    if (logger) logger.info("> computing w8");
    const w8 = computeW8();
    if (logger) logger.info("> computing wr");
    const wr = getOmegaCubicRoot(settings.cirPower, curve.Fr);

    // Write output zkey file
    await writeZkeyFile();

    await fdR1cs.close();
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

        const bR1cs = await binFileUtils.readSection(fdR1cs, sectionsR1cs, 2);
        let bR1csPos = 0;
        for (let i = 0; i < r1cs.nConstraints; i++) {
            if ((logger) && (i !== 0) && (i % 500000 === 0)) {
                logger.info(`    processing r1cs constraints ${i}/${r1cs.nConstraints}`);
            }
            const [constraints, additions] = r1csProcessor.processR1csConstraint(settings, ...readConstraint());

            plonkConstraints.push(...constraints);
            plonkAdditions.push(...additions);
        }

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

        return 0;
    }

    async function writeZkeyFile() {
        if (logger) logger.info("> Writing the zkey file");
        const fdZKey = await createBinFile(zkeyFilename, "zkey", 1, ZKEY_FF_NSECTIONS, 1 << 22, 1 << 24);

        if (logger) logger.info(`··· Writing Section ${HEADER_ZKEY_SECTION}. Zkey Header`);
        await writeZkeyHeader(fdZKey);

        if (logger) logger.info(`··· Writing Section ${ZKEY_FF_ADDITIONS_SECTION}. Additions`);
        await writeAdditions(fdZKey);
        if (globalThis.gc) globalThis.gc();

        if (logger) logger.info(`··· Writing Section ${ZKEY_FF_A_MAP_SECTION}. A Map`);
        await writeWitnessMap(fdZKey, ZKEY_FF_A_MAP_SECTION, 0, "A map");
        if (globalThis.gc) globalThis.gc();

        if (logger) logger.info(`··· Writing Section ${ZKEY_FF_B_MAP_SECTION}. B Map`);
        await writeWitnessMap(fdZKey, ZKEY_FF_B_MAP_SECTION, 1, "B map");
        if (globalThis.gc) globalThis.gc();

        if (logger) logger.info(`··· Writing Section ${ZKEY_FF_C_MAP_SECTION}. C Map`);
        await writeWitnessMap(fdZKey, ZKEY_FF_C_MAP_SECTION, 2, "C map");
        if (globalThis.gc) globalThis.gc();

        if (logger) logger.info(`··· Writing Section ${ZKEY_FF_QL_SECTION}. QL`);
        await writeQMap(fdZKey, ZKEY_FF_QL_SECTION, 3, "QL");
        if (globalThis.gc) globalThis.gc();

        if (logger) logger.info(`··· Writing Section ${ZKEY_FF_QR_SECTION}. QR`);
        await writeQMap(fdZKey, ZKEY_FF_QR_SECTION, 4, "QR");
        if (globalThis.gc) globalThis.gc();

        if (logger) logger.info(`··· Writing Section ${ZKEY_FF_QM_SECTION}. QM`);
        await writeQMap(fdZKey, ZKEY_FF_QM_SECTION, 5, "QM");
        if (globalThis.gc) globalThis.gc();

        if (logger) logger.info(`··· Writing Section ${ZKEY_FF_QO_SECTION}. QO`);
        await writeQMap(fdZKey, ZKEY_FF_QO_SECTION, 6, "QO");
        if (globalThis.gc) globalThis.gc();

        if (logger) logger.info(`··· Writing Section ${ZKEY_FF_QC_SECTION}. QC`);
        await writeQMap(fdZKey, ZKEY_FF_QC_SECTION, 7, "QC");
        if (globalThis.gc) globalThis.gc();

        if (logger) logger.info(`··· Writing Sections ${ZKEY_FF_SIGMA1_SECTION},${ZKEY_FF_SIGMA2_SECTION},${ZKEY_FF_SIGMA3_SECTION}. Sigma1, Sigma2 & Sigma 3`);
        await writeSigma(fdZKey);
        if (globalThis.gc) globalThis.gc();

        if (logger) logger.info(`··· Writing Section ${ZKEY_FF_LAGRANGE_SECTION}. Lagrange Polynomials`);
        await writeLagrangePolynomials(fdZKey);
        if (globalThis.gc) globalThis.gc();

        if (logger) logger.info(`··· Writing Section ${ZKEY_FF_PTAU_SECTION}. Powers of Tau`);
        await writePtau(fdZKey);
        if (globalThis.gc) globalThis.gc();

        if (logger) logger.info(`··· Writing Section ${ZKEY_FF_C0_SECTION}. C0`);
        await writeC0(fdZKey);
        if (globalThis.gc) globalThis.gc();

        if (logger) logger.info(`··· Writing Section ${ZKEY_FF_HEADER_SECTION}. FFlonk Header`);
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
        await startWriteSection(fdZKey, ZKEY_FF_ADDITIONS_SECTION);

        // Written values are 2 * 32 bit integers (2 * 4 bytes) + 2 field size values ( 2 * sFr bytes)
        const buffOut = new Uint8Array(8 + 2 * sFr);
        const buffOutV = new DataView(buffOut.buffer);

        for (let i = 0; i < plonkAdditions.length; i++) {
            if ((logger) && (i !== 0) && (i % 500000 === 0)) logger.info(`      writing Additions: ${i}/${plonkAdditions.length}`);

            const addition = plonkAdditions[i];

            buffOutV.setUint32(0, addition[0], true);
            buffOutV.setUint32(4, addition[1], true);
            buffOut.set(addition[2], 8);
            buffOut.set(addition[3], 8 + sFr);

            await fdZKey.write(buffOut);
        }
        await endWriteSection(fdZKey);
    }

    async function writeWitnessMap(fdZKey, sectionNum, posConstraint, name) {
        await startWriteSection(fdZKey, sectionNum);
        for (let i = 0; i < plonkConstraints.length; i++) {
            if (logger && (i !== 0) && (i % 500000 === 0)) {
                logger.info(`      writing witness ${name}: ${i}/${plonkConstraints.length}`);
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
            if ((logger) && (i !== 0) && (i % 500000 === 0)) {
                logger.info(`      writing ${name}: ${i}/${plonkConstraints.length}`);
            }
        }

        polynomials[name] = await Polynomial.fromEvaluations(Q, curve, logger);
        evaluations[name] = await Evaluations.fromPolynomial(polynomials[name], 4, curve, logger);

        // Write Q coefficients and evaluations
        await startWriteSection(fdZKey, sectionNum);
        await fdZKey.write(polynomials[name].coef);
        await fdZKey.write(evaluations[name].eval);
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
            } else if (i < settings.domainSize - 2) {
                buildSigma(0, i);
                buildSigma(0, settings.domainSize + i);
                buildSigma(0, settings.domainSize * 2 + i);
            } else {
                sigma.set(w, i * sFr);
                sigma.set(Fr.mul(w, k1), (settings.domainSize + i) * sFr);
                sigma.set(Fr.mul(w, k2), (settings.domainSize * 2 + i) * sFr);
            }

            w = Fr.mul(w, Fr.w[settings.cirPower]);

            if ((logger) && (i !== 0) && (i % 500000 === 0)) {
                logger.info(`      writing sigma phase1: ${i}/${plonkConstraints.length}`);
            }
        }

        for (let i = 0; i < settings.nVars; i++) {
            if (typeof firstPos[i] !== "undefined") {
                sigma.set(lastSeen[i], firstPos[i] * sFr);
            } else {
                // throw new Error("Variable not used");
                console.log("Variable not used");
            }
            if ((logger) && (i !== 0) && (i % 500000 === 0)) logger.info(`      writing sigma phase2: ${i}/${settings.nVars}`);
        }

        if (globalThis.gc) globalThis.gc();

        // Write sigma coefficients and evaluations
        for (let i = 0; i < 3; i++) {
            const sectionId = 0 === i ? ZKEY_FF_SIGMA1_SECTION : 1 === i ? ZKEY_FF_SIGMA2_SECTION : ZKEY_FF_SIGMA3_SECTION;

            let name = "S" + (i + 1);
            polynomials[name] = await Polynomial.fromEvaluations(sigma.slice(settings.domainSize * sFr * i, settings.domainSize * sFr * (i + 1)), curve, logger);
            evaluations[name] = await Evaluations.fromPolynomial(polynomials[name], 4, curve, logger);
            await startWriteSection(fdZKey, sectionId);
            await fdZKey.write(polynomials[name].coef);
            await fdZKey.write(evaluations[name].eval);
            await endWriteSection(fdZKey);

            if (globalThis.gc) globalThis.gc();
        }

        return 0;

        function buildSigma(signalId, idx) {
            if (typeof lastSeen[signalId] === "undefined") {
                firstPos[signalId] = idx;
            } else {
                sigma.set(lastSeen[signalId], idx * sFr);
            }
            let v;
            if (idx < settings.domainSize) {
                v = w;
            } else if (idx < 2 * settings.domainSize) {
                v = Fr.mul(w, k1);
            } else {
                v = Fr.mul(w, k2);
            }

            lastSeen[signalId] = v;
        }
    }

    async function writeLagrangePolynomials(fdZKey) {
        await startWriteSection(fdZKey, ZKEY_FF_LAGRANGE_SECTION);

        const l = Math.max(settings.nPublic, 1);
        for (let i = 0; i < l; i++) {
            let buff = new BigBuffer(settings.domainSize * sFr);
            buff.set(Fr.one, i * sFr);

            await writeP4(fdZKey, buff);
        }
        await endWriteSection(fdZKey);
    }

    async function writePtau(fdZKey) {
        await startWriteSection(fdZKey, ZKEY_FF_PTAU_SECTION);

        // domainSize * 9 + 18 = maximum SRS length needed, specifically to commit C2
        PTau = new BigBuffer((settings.domainSize * 9 + 18) * sG1);
        await fdPTau.readToBuffer(PTau, 0, (settings.domainSize * 9 + 18) * sG1, pTauSections[2][0].p);

        await fdZKey.write(PTau);
        await endWriteSection(fdZKey);
    }

    async function writeC0(fdZKey) {
        // C0(X) := QL(X^8) + X · QR(X^8) + X^2 · QO(X^8) + X^3 · QM(X^8) + X^4 · QC(X^8)
        //            + X^5 · SIGMA1(X^8) + X^6 · SIGMA2(X^8) + X^7 · SIGMA3(X^8)
        let C0 = new CPolynomial(8, curve, logger);
        C0.addPolynomial(0, polynomials.QL);
        C0.addPolynomial(1, polynomials.QR);
        C0.addPolynomial(2, polynomials.QO);
        C0.addPolynomial(3, polynomials.QM);
        C0.addPolynomial(4, polynomials.QC);
        C0.addPolynomial(5, polynomials.S1);
        C0.addPolynomial(6, polynomials.S2);
        C0.addPolynomial(7, polynomials.S3);

        polynomials.C0 = C0.getPolynomial();

        // Check degree
        if (polynomials.C0.degree() >= 8 * settings.domainSize) {
            throw new Error("C0 Polynomial is not well calculated");
        }

        await startWriteSection(fdZKey, ZKEY_FF_C0_SECTION);
        await fdZKey.write(polynomials.C0.coef);
        await endWriteSection(fdZKey);
    }

    async function writeFFlonkHeader(fdZKey) {
        await startWriteSection(fdZKey, ZKEY_FF_HEADER_SECTION);

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
        await fdZKey.write(w8);
        await fdZKey.write(wr);

        let bX_2;
        bX_2 = await fdPTau.read(sG2, pTauSections[3][0].p + sG2);
        await fdZKey.write(bX_2);

        let commitC0 = await polynomials.C0.multiExponentiation(PTau, "C0");
        await fdZKey.write(commitC0);

        await endWriteSection(fdZKey);
    }

    async function writeP4(fdZKey, buff) {
        const [coefficients, evaluations4] = await Polynomial.to4T(buff, settings.domainSize, [], Fr);
        await fdZKey.write(coefficients);
        await fdZKey.write(evaluations4);

        return [coefficients, evaluations4];
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

    function computeW8() {
        return Fr.w[3];
    }

    function getOmegaCubicRoot(power, Fr) {
        // Hardcorded 3th-root of Fr.w[28]
        const firstRoot = Fr.e(467799165886069610036046866799264026481344299079011762026774533774345988080n);

        return Fr.exp(firstRoot, 2 ** (28 - power));
    }
}


