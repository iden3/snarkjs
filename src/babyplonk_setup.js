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
import {
    readBinFile,
    createBinFile,
    writeBigInt,
    startWriteSection,
    endWriteSection,
} from "@iden3/binfileutils";
import {log2} from "./misc.js";
import {Scalar, BigBuffer} from "ffjavascript";
import BigArray from "./bigarray.js";
import {
    BP_HEADER_ZKEY_SECTION,
    BP_ADDITIONS_ZKEY_SECTION,
    BP_A_MAP_ZKEY_SECTION,
    BP_B_MAP_ZKEY_SECTION,
    BP_Q1_ZKEY_SECTION,
    BP_Q2_ZKEY_SECTION,
    BP_LAGRANGE_ZKEY_SECTION,
    BP_PTAU_ZKEY_SECTION,
    BP_SIGMA_ZKEY_SECTION,
    BP_T_POL_DEG_MIN,
    BP_ZKEY_NSECTIONS,
} from "./babyplonk.js";
import {BABY_PLONK_PROTOCOL_ID, HEADER_ZKEY_SECTION} from "./zkey.js";
import {
    getBPlonkAdditionConstraint,
    getBPlonkConstantConstraint,
    getBPlonkMultiplicationConstraint
} from "./babyplonk_equation.js";


export default async function babyPlonkSetup(r1csFilename, ptauFilename, zkeyFilename, logger) {
    if (logger) logger.info("Baby Plonk setup started");

    if (globalThis.gc) globalThis.gc();

    if (logger) logger.info("Reading PTau file");
    const {fd: fdPTau, sections: pTauSections} = await readBinFile(ptauFilename, "ptau", 1, 1 << 22, 1 << 24);
    if (!pTauSections[12]) {
        throw new Error("Powers of tau is not prepared.");
    }

    if (logger) logger.info("Getting curve from PTau settings");
    const {curve, power} = await utils.readPTauHeader(fdPTau, pTauSections);

    if (logger) logger.info("Reading r1cs file");
    const {fd: fdR1cs, sections: sectionsR1cs} = await readBinFile(r1csFilename, "r1cs", 1, 1 << 22, 1 << 24);
    const r1cs = await readR1csFd(fdR1cs, sectionsR1cs, {loadConstraints: true, loadCustomGates: true});

    if (r1cs.prime !== curve.r) {
        throw new Error("r1cs curve does not match powers of tau ceremony curve");
    }

    const G1 = curve.G1;
    const Fr = curve.Fr;

    const sG1 = curve.G1.F.n8 * 2;
    const sG2 = curve.G2.F.n8 * 2;
    const sFr = curve.Fr.n8;

    const plonkConstraints = new BigArray();
    const plonkAdditions = new BigArray();

    let nVars = r1cs.nVars;
    const nPublic = r1cs.nOutputs + r1cs.nPubInputs;

    if (logger) logger.info("Processing Baby Plonk constraints");
    await processConstraints(curve.Fr, r1cs, logger);
    if (globalThis.gc) globalThis.gc();

    // Number of baby Plonk equations in the constraint system
    const nConstraints = plonkConstraints.length;

    // As the t polinomal is n+5 whe need at least a power of 4
    //TODO review if 3 is ok and then extract the value to a constant 
    const cirPower = Math.max(BP_T_POL_DEG_MIN, log2(nConstraints - 1) + 1);
    if (cirPower > power) {
        throw new Error(`circuit too big for this power of tau ceremony. ${nConstraints} > 2**${power}`);
    }

    const domainSize = 2 ** cirPower;

    if (logger) {
        logger.info(`Selected curve: ${curve.name}`);
        logger.info(`Circuit power:  ${cirPower}`);
        logger.info(`Domain size:    ${domainSize}`);
        logger.info(`Number of constraints: ${nConstraints}`);
    }

    const pTauPoints = new BigBuffer(domainSize * sG1);
    const offset = pTauSections[12][0].p + ((2 ** (cirPower)) - 1) * sG1;
    await fdPTau.readToBuffer(pTauPoints, 0, domainSize * sG1, offset);

    const k1 = getK1();

    const vk = {};

    if (logger) logger.info("Writing the zkey file");
    const fdZKey = await createBinFile(zkeyFilename, "zkey", 1, BP_ZKEY_NSECTIONS, 1 << 22, 1 << 24);

    if (logger) logger.info(`Writing Section ${HEADER_ZKEY_SECTION}: Zkey Header`);
    await writeZkeyHeader();

    if (logger) logger.info(`Writing Section ${BP_ADDITIONS_ZKEY_SECTION}: Additions`);
    await writeAdditions();
    if (globalThis.gc) globalThis.gc();

    if (logger) logger.info(`Writing Section ${BP_A_MAP_ZKEY_SECTION}: A Map`);
    await writeWitnessMap(BP_A_MAP_ZKEY_SECTION, 0, "A map");
    if (globalThis.gc) globalThis.gc();

    if (logger) logger.info(`Writing Section ${BP_B_MAP_ZKEY_SECTION}: B Map`);
    await writeWitnessMap(BP_B_MAP_ZKEY_SECTION, 1, "B map");
    if (globalThis.gc) globalThis.gc();

    if (logger) logger.info(`Writing Section ${BP_Q1_ZKEY_SECTION}. Q1 Map`);
    await writeQMap(BP_Q1_ZKEY_SECTION, 2, "Q1");
    if (globalThis.gc) globalThis.gc();

    if (logger) logger.info(`Writing Section ${BP_Q2_ZKEY_SECTION}. Q2 Map`);
    await writeQMap(BP_Q2_ZKEY_SECTION, 3, "Q2");
    if (globalThis.gc) globalThis.gc();

    if (logger) logger.info(`Writing Section ${BP_SIGMA_ZKEY_SECTION}. Sigma1+Sigma2`);
    await writeSigma();
    if (globalThis.gc) globalThis.gc();

    if (logger) logger.info(`Writing Section ${BP_LAGRANGE_ZKEY_SECTION}. Lagrange Polynomials`);
    await writeLagrangePolynomials();
    if (globalThis.gc) globalThis.gc();

    if (logger) logger.info(`Writing Section ${BP_PTAU_ZKEY_SECTION}. Powers of Tau`);
    await writePtau();
    if (globalThis.gc) globalThis.gc();

    if (logger) logger.info(`Writing Section ${BP_HEADER_ZKEY_SECTION}. Baby Plonk Header`);
    await writeBabyPlonkHeader();

    if (logger) logger.info("Writing the zkey finished");

    await fdZKey.close();
    await fdR1cs.close();
    await fdPTau.close();

    if (logger) logger.info("Baby Plonk setup finished");

    return 0;

    async function processConstraints(Fr, r1cs, logger) {
        // Add public inputs and outputs
        for (let i = 0; i < nPublic; i++) {
            plonkConstraints.push(...getBPlonkConstantConstraint(i + 1, Fr));
        }

        // Add all constraints from r1cs file
        for (let i = 0; i < r1cs.constraints.length; i++) {
            if ((logger) && (i % 10000 === 0)) {
                logger.debug(`processing constraints... ${i}/${r1cs.nConstraints}`);
            }
            processR1csConstraint(...r1cs.constraints[i]);
        }

        return 0;

        function processR1csConstraint(lcA, lcB, lcC) {
            const lctA = getLinearCombinationType(lcA);
            const lctB = getLinearCombinationType(lcB);

            if ((lctA === "0") || (lctB === "0")) {
                normalize(lcC);
                addConstraintSum(lcC);
            } else if (lctA === "k") {
                const lcCC = join(lcB, lcA[0], lcC);
                addConstraintSum(lcCC);
            } else if (lctB === "k") {
                const lcCC = join(lcA, lcB[0], lcC);
                addConstraintSum(lcCC);
            } else {
                addConstraintMul(lcA, lcB, lcC);
            }
        }

        function getLinearCombinationType(lc) {
            let k = Fr.zero;
            let n = 0;
            const ss = Object.keys(lc);
            for (let i = 0; i < ss.length; i++) {
                if (lc[ss[i]] === 0n) {
                    delete lc[ss[i]];
                } else if (ss[i] === "0") {
                    k = Fr.add(k, lc[ss[i]]);
                } else {
                    n++;
                }
            }
            if (n > 0) return n.toString();
            if (Fr.eq(k, Fr.zero)) return "k";
            return "0";
        }

        function normalize(linearComb) {
            const ss = Object.keys(linearComb);
            for (let i = 0; i < ss.length; i++) {
                if (linearComb[ss[i]] === 0n) delete linearComb[ss[i]];
            }
        }

        function join(linearComb1, k, linearComb2) {
            const res = {};

            for (let s in linearComb1) {
                const val = Fr.mul(k, linearComb1[s]);
                res[s] = res[s] === undefined ? val : Fr.add(val, res[s]);
            }

            for (let s in linearComb2) {
                const val = Fr.mul(k, linearComb2[s]);
                res[s] = res[s] === undefined ? val : Fr.add(val, res[s]);
            }

            normalize(res);
            return res;
        }

        function reduceCoefs(linearComb, maxC) {
            const res = {
                k: Fr.zero,
                s: [],
                coefs: []
            };
            const cs = [];

            for (let s in linearComb) {
                if (s === "0") {
                    res.k = Fr.add(res.k, linearComb[s]);
                } else if (linearComb[s] !== 0n) {
                    cs.push([Number(s), linearComb[s]]);
                }
            }
            while (cs.length > maxC) {
                const c1 = cs.shift();
                const c2 = cs.shift();
                const so = nVars++;

                const constraints = getBPlonkAdditionConstraint(c1[0], c2[0], so, c1[1], c2[1], Fr.one, Fr.zero, Fr);
                // const constraints = [
                //     [c1[0], c2[0], c1[1], c2[1], Fr.zero],
                //     [Fr.zero, so, Fr.zero, Fr.zero, Fr.zero]
                // ];

                plonkConstraints.push(...constraints);

                plonkAdditions.push([c1[0], c2[0], c1[1], c2[1]]);

                cs.push([so, Fr.one]);
            }
            for (let i = 0; i < cs.length; i++) {
                res.s[i] = cs[i][0];
                res.coefs[i] = cs[i][1];
            }
            while (res.coefs.length < maxC) {
                res.s.push(0);
                res.coefs.push(Fr.zero);
            }
            return res;
        }

        function addConstraintSum(lc) {
            const C = reduceCoefs(lc, 3);

            const constraints = getBPlonkAdditionConstraint(C.s[0], C.s[1], C.s[2], C.coefs[0], C.coefs[1], C.coefs[2], C.k, Fr);
            plonkConstraints.push(...constraints);
        }

        function addConstraintMul(lcA, lcB, lcC) {
            const A = reduceCoefs(lcA, 1);
            const B = reduceCoefs(lcB, 1);
            const C = reduceCoefs(lcC, 1);

            // let a = A.s[0];
            // let b = B.s[0];
            // let q1 = Fr.div(Fr.mul(A.coefs[0], B.k), C.coefs[0]);
            // let q2 = Fr.div(Fr.mul(A.k, B.coefs[0]), C.coefs[0]);
            // let qk = Fr.sub(Fr.mul(A.k, B.k), C.k);
            //
            // plonkConstraints.push([a, b, q1, q2, qk]);
            //
            // a = Fr.zero;
            // b = C.s[0];
            // q1 = Fr.div(Fr.mul(A.coefs[0], B.coefs[0]), C.coefs[0]);
            // q2 = Fr.zero;
            // qk = Fr.zero;
            //
            // plonkConstraints.push([a, b, q1, q2, qk]);

            const constraints = getBPlonkMultiplicationConstraint(
                A.s[0], B.s[0], C.s[0],
                Fr.mul(A.coefs[0], B.k),
                Fr.mul(A.k, B.coefs[0]),
                Fr.mul(A.coefs[0], B.coefs[0]),
                C.coefs[2],
                Fr.sub(Fr.mul(A.k, B.k), C.k),
                Fr);

            plonkConstraints.push(...constraints);
        }
    }

    async function writeZkeyHeader() {
        await startWriteSection(fdZKey, HEADER_ZKEY_SECTION);
        await fdZKey.writeULE32(BABY_PLONK_PROTOCOL_ID);
        await endWriteSection(fdZKey);
    }

    //TODO check
    async function writeAdditions() {
        await startWriteSection(fdZKey, BP_ADDITIONS_ZKEY_SECTION);
        const buffOut = new Uint8Array((2 * 4 + 2 * sFr));
        const buffOutV = new DataView(buffOut.buffer);
        for (let i = 0; i < plonkAdditions.length; i++) {
            const addition = plonkAdditions[i];
            let o = 0;
            buffOutV.setUint32(o, addition[0], true);
            o += 4;
            buffOutV.setUint32(o, addition[1], true);
            o += 4;

            // The value is storen in  Montgomery. stored = v*R
            // so when montgomery multiplicated by the witness  it result = v*R*w/R = v*w

            buffOut.set(addition[2], o);
            o += sFr;
            buffOut.set(addition[3], o);
            o += sFr;
            await fdZKey.write(buffOut);
            if ((logger) && (i % 1000000 === 0)) logger.debug(`writing Additions: ${i}/${plonkAdditions.length}`);
        }
        await endWriteSection(fdZKey);
    }

    async function writeWitnessMap(sectionNum, posConstraint, name) {
        await startWriteSection(fdZKey, sectionNum);

        for (let i = 0; i < plonkConstraints.length; i++) {
            await fdZKey.writeULE32(plonkConstraints[i][posConstraint]);

            if ((logger) && (i % 1000000 === 0)) {
                logger.debug(`writing ${name}: ${i}/${plonkConstraints.length}`);
            }
        }

        await endWriteSection(fdZKey);
    }

    async function writeQMap(sectionNum, posConstraint, name) {
        let Q = new BigBuffer(domainSize * sFr);

        for (let i = 0; i < plonkConstraints.length; i++) {
            Q.set(plonkConstraints[i][posConstraint], i * sFr);
            if ((logger) && (i % 1000000 === 0)) {
                logger.debug(`writing ${name}: ${i}/${plonkConstraints.length}`);
            }
        }

        await startWriteSection(fdZKey, sectionNum);
        await writeP4(Q);
        await endWriteSection(fdZKey);

        Q = await Fr.batchFromMontgomery(Q);
        vk[name] = await curve.G1.multiExpAffine(pTauPoints, Q, logger, "multiexp " + name);
    }

    async function writeSigma() {
        const sigma = new BigBuffer(sFr * domainSize * 3);
        const lastSeen = new BigArray(nVars);
        const firstPos = new BigArray(nVars);

        let w = Fr.one;
        for (let i = 0; i < domainSize; i++) {
            if (i < plonkConstraints.length) {
                buildSigma(plonkConstraints[i][0], i);
                buildSigma(plonkConstraints[i][1], domainSize + i);
            } else {
                buildSigma(0, i);
                buildSigma(0, domainSize + i);
            }
            w = Fr.mul(w, Fr.w[cirPower]);

            if ((logger) && (i % 1000000 === 0)) {
                logger.debug(`writing sigma phase1: ${i}/${plonkConstraints.length}`);
            }
        }

        for (let i = 0; i < nVars; i++) {
            if (typeof firstPos[i] !== "undefined") {
                sigma.set(lastSeen[i], firstPos[i] * sFr);
            } else {
                // throw new Error("Variable not used");
                console.log("Variable not used");
            }
            if ((logger) && (i % 1000000 === 0)) logger.debug(`writing sigma phase2: ${i}/${nVars}`);
        }

        if (globalThis.gc) globalThis.gc();

        await startWriteSection(fdZKey, BP_SIGMA_ZKEY_SECTION);

        for (let i = 0; i < 2; i++) {
            let S = sigma.slice(domainSize * sFr * i, domainSize * sFr * (i + 1));
            await writeP4(S);
            if (globalThis.gc) globalThis.gc();

            S = await Fr.batchFromMontgomery(S);
            vk["S" + (i + 1)] = await curve.G1.multiExpAffine(pTauPoints, S, logger, "multiexp S" + (i + 1));
            if (globalThis.gc) globalThis.gc();
        }

        await endWriteSection(fdZKey);

        function buildSigma(s, p) {
            if (typeof lastSeen[s] === "undefined") {
                firstPos[s] = p;
            } else {
                sigma.set(lastSeen[s], p * sFr);
            }
            let v;
            if (p < domainSize) {
                v = w;
            } else {
                v = Fr.mul(w, k1);
            }

            lastSeen[s] = v;
        }
    }

    async function writeLagrangePolynomials() {
        await startWriteSection(fdZKey, BP_LAGRANGE_ZKEY_SECTION);

        const l = Math.max(nPublic, 1);
        for (let i = 0; i < l; i++) {
            let buff = new BigBuffer(domainSize * sFr);
            buff.set(Fr.one, i * sFr);

            if (logger) {
                logger.debug(`writing Lagrange polynomials ${i}/${l}`);
            }

            await writeP4(buff);
        }
        await endWriteSection(fdZKey);
    }

    async function writePtau() {
        await startWriteSection(fdZKey, BP_PTAU_ZKEY_SECTION);

        //TODO check size of Buffer!!
        const buffOut = new BigBuffer((domainSize + 6) * sG1);
        await fdPTau.readToBuffer(buffOut, 0, (domainSize + 6) * sG1, pTauSections[2][0].p);

        if (logger) {
            logger.debug("writing ptau");
        }

        await fdZKey.write(buffOut);
        await endWriteSection(fdZKey);
    }

    async function writeBabyPlonkHeader() {
        await startWriteSection(fdZKey, BP_HEADER_ZKEY_SECTION);

        const primeQ = curve.q;
        const n8q = (Math.floor((Scalar.bitLength(primeQ) - 1) / 64) + 1) * 8;
        await fdZKey.writeULE32(n8q);
        await writeBigInt(fdZKey, primeQ, n8q);

        const primeR = curve.r;
        const n8r = (Math.floor((Scalar.bitLength(primeR) - 1) / 64) + 1) * 8;
        await fdZKey.writeULE32(n8r);
        await writeBigInt(fdZKey, primeR, n8r);

        // Total number of r1cs vars
        await fdZKey.writeULE32(nVars);
        // Total number of r1cs public vars = outputs + public inputs
        await fdZKey.writeULE32(nPublic);
        await fdZKey.writeULE32(domainSize);
        await fdZKey.writeULE32(plonkAdditions.length);
        await fdZKey.writeULE32(plonkConstraints.length);

        await fdZKey.write(k1);

        await fdZKey.write(G1.toAffine(vk.Q1));
        await fdZKey.write(G1.toAffine(vk.Q2));

        await fdZKey.write(G1.toAffine(vk.S1));
        await fdZKey.write(G1.toAffine(vk.S2));

        let bX_2;
        bX_2 = await fdPTau.read(sG2, pTauSections[3][0].p + sG2);
        await fdZKey.write(bX_2);

        await endWriteSection(fdZKey);
    }

    async function writeP4(buff) {
        const q = await Fr.ifft(buff);
        const q4 = new BigBuffer(domainSize * sFr * 4);
        q4.set(q, 0);
        const Q4 = await Fr.fft(q4);
        await fdZKey.write(q);
        await fdZKey.write(Q4);
    }

    function getK1() {
        let k1 = Fr.two;
        while (isIncluded(k1, [], cirPower)) Fr.add(k1, Fr.one);
        return k1;

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
}


