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
    BP_A_MAP_ZKEY_SECTION,
    BP_ADDITIONS_ZKEY_SECTION,
    BP_B_MAP_ZKEY_SECTION, BP_HEADER_ZKEY_SECTION,
    BP_LAGRANGE_ZKEY_SECTION, BP_PTAU_ZKEY_SECTION,
    BP_Q1_ZKEY_SECTION,
    BP_Q2_ZKEY_SECTION,
    BP_SIGMA_ZKEY_SECTION,
    BP_T_POL_DEG_MIN,
    ZKEY_BP_NSECTIONS,
} from "./babyplonk.js";
import {BABY_PLONK_PROTOCOL_ID, HEADER_ZKEY_SECTION} from "./zkey.js";


export default async function babyPlonkSetup(r1csFilename, ptauFilename, pkeyFilename, vkeyFilename, logger) {

    if (globalThis.gc) globalThis.gc();

    const {fd: fdPTau, sections: sectionsPTau} = await readBinFile(ptauFilename, "ptau", 1, 1 << 22, 1 << 24);
    if (!sectionsPTau[12]) {
        throw new Error("Powers of tau is not prepared.");
    }

    const {curve, power} = await utils.readPTauHeader(fdPTau, sectionsPTau);
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

    if (logger) logger.info("Reading r1cs file");

    const plonkConstraints = new BigArray();
    const plonkAdditions = new BigArray();
    
    let nVars = r1cs.nVars;
    const nPublic = r1cs.nOutputs + r1cs.nPubInputs;

    await processConstraints(curve.Fr, r1cs, logger);

    if (globalThis.gc) globalThis.gc();

    const fdZKey = await createBinFile(pkeyFilename, "zkey", 1, ZKEY_BP_NSECTIONS, 1 << 22, 1 << 24);

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
        logger.info(`circuit power: ${nConstraints}`);
        logger.info(`domain size: ${nConstraints}`);
        logger.info(`#baby Plonk constraints: ${nConstraints}`);
    }

    const pTauPoints = new BigBuffer(domainSize * sG1);
    const offset = sectionsPTau[12][0].p + ((2 ** (cirPower)) - 1) * sG1;
    await fdPTau.readToBuffer(pTauPoints, 0, domainSize * sG1, offset);

    const k1 = getK1();

    const vk = {};

    await writeZkeyHeader();

    await writeAdditions();
    if (globalThis.gc) globalThis.gc();
    
    await writeWitnessMap(BP_A_MAP_ZKEY_SECTION, 0, "Amap");
    if (globalThis.gc) globalThis.gc();

    await writeWitnessMap(BP_B_MAP_ZKEY_SECTION, 1, "Bmap");
    if (globalThis.gc) globalThis.gc();

    await writeQMap(BP_Q1_ZKEY_SECTION, 2, "Q1");
    if (globalThis.gc) globalThis.gc();

    await writeQMap(BP_Q2_ZKEY_SECTION, 3, "Q2");
    if (globalThis.gc) globalThis.gc();

    await writeSigma();
    if (globalThis.gc) globalThis.gc();

    await writeLs();
    if (globalThis.gc) globalThis.gc();

    await writePtau();
    if (globalThis.gc) globalThis.gc();

    await writeBabyPlonkHeader();

    await fdZKey.close();
    await fdR1cs.close();
    await fdPTau.close();

    if (logger) logger.info("Baby Plonk setup Finished");

    return 0;

    async function processConstraints(Fr, r1cs, logger) {

        function normalize(linearComb) {
            const ss = Object.keys(linearComb);
            for (let i = 0; i < ss.length; i++) {
                if (linearComb[ss[i]] == 0n) delete linearComb[ss[i]];
            }
        }

        function join(linearComb1, k, linearComb2) {
            const res = {};

            for (let s in linearComb1) {
                if (typeof res[s] == "undefined") {
                    res[s] = Fr.mul(k, linearComb1[s]);
                } else {
                    res[s] = Fr.add(res[s], Fr.mul(k, linearComb1[s]));
                }
            }

            for (let s in linearComb2) {
                if (typeof res[s] == "undefined") {
                    res[s] = linearComb2[s];
                } else {
                    res[s] = Fr.add(res[s], linearComb2[s]);
                }
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
                if (s == 0) {
                    res.k = Fr.add(res.k, linearComb[s]);
                } else if (linearComb[s] != 0n) {
                    cs.push([Number(s), linearComb[s]]);
                }
            }
            while (cs.length > maxC) {
                const c1 = cs.shift();
                const c2 = cs.shift();

                const sl = c1[0];
                const sr = c2[0];
                const so = nVars++;
                const qm = Fr.zero;
                const ql = Fr.neg(c1[1]);
                const qr = Fr.neg(c2[1]);
                const qo = Fr.one;
                const qc = Fr.zero;

                plonkConstraints.push([sl, sr, so, qm, ql, qr, qo, qc]);

                plonkAdditions.push([sl, sr, c1[1], c2[1]]);

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
            const sl = C.s[0];
            const sr = C.s[1];
            const so = C.s[2];
            const qm = Fr.zero;
            const ql = C.coefs[0];
            const qr = C.coefs[1];
            const qo = C.coefs[2];
            const qc = C.k;
            plonkConstraints.push([sl, sr, so, qm, ql, qr, qo, qc]);
        }

        function addConstraintMul(lcA, lcB, lcC) {
            const A = reduceCoefs(lcA, 1);
            const B = reduceCoefs(lcB, 1);
            const C = reduceCoefs(lcC, 1);


            const sl = A.s[0];
            const sr = B.s[0];
            const so = C.s[0];
            const qm = Fr.mul(A.coefs[0], B.coefs[0]);
            const ql = Fr.mul(A.coefs[0], B.k);
            const qr = Fr.mul(A.k, B.coefs[0]);
            const qo = Fr.neg(C.coefs[0]);
            const qc = Fr.sub(Fr.mul(A.k, B.k), C.k);
            plonkConstraints.push([sl, sr, so, qm, ql, qr, qo, qc]);
        }

        function getLinearCombinationType(lc) {
            let k = Fr.zero;
            let n = 0;
            const ss = Object.keys(lc);
            for (let i = 0; i < ss.length; i++) {
                if (lc[ss[i]] == 0n) {
                    delete lc[ss[i]];
                } else if (ss[i] == 0) {
                    k = Fr.add(k, lc[ss[i]]);
                } else {
                    n++;
                }
            }
            if (n > 0) return n.toString();
            if (k != Fr.zero) return "k";
            return "0";
        }

        function process(lcA, lcB, lcC) {
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

        for (let s = 1; s <= nPublic; s++) {
            const sl = s;
            const sr = 0;
            const so = 0;
            const qm = Fr.zero;
            const ql = Fr.one;
            const qr = Fr.zero;
            const qo = Fr.zero;
            const qc = Fr.zero;

            plonkConstraints.push([sl, sr, so, qm, ql, qr, qo, qc]);
        }

        for (let c = 0; c < r1cs.constraints.length; c++) {
            if ((logger) && (c % 10000 === 0)) logger.debug(`processing constraints: ${c}/${r1cs.nConstraints}`);
            process(...r1cs.constraints[c]);
        }
    }

    async function writeWitnessMap(sectionNum, posConstraint, name) {
        await startWriteSection(fdZKey, sectionNum);
        for (let i = 0; i < plonkConstraints.length; i++) {
            await fdZKey.writeULE32(plonkConstraints[i][posConstraint]);
            if ((logger) && (i % 1000000 == 0)) logger.debug(`writing ${name}: ${i}/${plonkConstraints.length}`);
        }
        await endWriteSection(fdZKey);
    }

    async function writeQMap(sectionNum, posConstraint, name) {
        let Q = new BigBuffer(domainSize * sFr);
        for (let i = 0; i < plonkConstraints.length; i++) {
            Q.set(plonkConstraints[i][posConstraint], i * sFr);
            if ((logger) && (i % 1000000 == 0)) logger.debug(`writing ${name}: ${i}/${plonkConstraints.length}`);
        }
        await startWriteSection(fdZKey, sectionNum);
        await writeP4(Q);
        await endWriteSection(fdZKey);
        Q = await Fr.batchFromMontgomery(Q);
        vk[name] = await curve.G1.multiExpAffine(pTauPoints, Q, logger, "multiexp " + name);
    }

    async function writeP4(buff) {
        const q = await Fr.ifft(buff);
        const q4 = new BigBuffer(domainSize * sFr * 4);
        q4.set(q, 0);
        const Q4 = await Fr.fft(q4);
        await fdZKey.write(q);
        await fdZKey.write(Q4);
    }

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

    async function writeSigma() {
        const sigma = new BigBuffer(sFr * domainSize * 3);
        const lastAparence = new BigArray(nVars);
        const firstPos = new BigArray(nVars);
        let w = Fr.one;
        for (let i = 0; i < domainSize; i++) {
            if (i < plonkConstraints.length) {
                buildSigma(plonkConstraints[i][0], i);
                buildSigma(plonkConstraints[i][1], domainSize + i);
                buildSigma(plonkConstraints[i][2], domainSize * 2 + i);
            } else {
                buildSigma(0, i);
                buildSigma(0, domainSize + i);
                buildSigma(0, domainSize * 2 + i);
            }
            w = Fr.mul(w, Fr.w[cirPower]);
            if ((logger) && (i % 1000000 === 0)) logger.debug(`writing sigma phase1: ${i}/${plonkConstraints.length}`);
        }
        for (let s = 0; s < nVars; s++) {
            if (typeof firstPos[s] !== "undefined") {
                sigma.set(lastAparence[s], firstPos[s] * sFr);
            } else {
                // throw new Error("Variable not used");
                console.log("Variable not used");
            }
            if ((logger) && (s % 1000000 === 0)) logger.debug(`writing sigma phase2: ${s}/${nVars}`);
        }

        if (globalThis.gc) {
            globalThis.gc();
        }
        await startWriteSection(fdZKey, BP_SIGMA_ZKEY_SECTION);
        let S1 = sigma.slice(0, domainSize * sFr);
        await writeP4(S1);
        if (globalThis.gc) {
            globalThis.gc();
        }
        let S2 = sigma.slice(domainSize * sFr, domainSize * sFr * 2);
        await writeP4(S2);
        if (globalThis.gc) {
            globalThis.gc();
        }
        let S3 = sigma.slice(domainSize * sFr * 2, domainSize * sFr * 3);
        await writeP4(S3);
        if (globalThis.gc) {
            globalThis.gc();
        }
        await endWriteSection(fdZKey);

        S1 = await Fr.batchFromMontgomery(S1);
        S2 = await Fr.batchFromMontgomery(S2);
        S3 = await Fr.batchFromMontgomery(S3);

        vk.S1 = await curve.G1.multiExpAffine(pTauPoints, S1, logger, "multiexp S1");
        if (globalThis.gc) {
            globalThis.gc();
        }
        vk.S2 = await curve.G1.multiExpAffine(pTauPoints, S2, logger, "multiexp S2");
        if (globalThis.gc) {
            globalThis.gc();
        }
        vk.S3 = await curve.G1.multiExpAffine(pTauPoints, S3, logger, "multiexp S3");
        if (globalThis.gc) {
            globalThis.gc();
        }

        function buildSigma(s, p) {
            if (typeof lastAparence[s] === "undefined") {
                firstPos[s] = p;
            } else {
                sigma.set(lastAparence[s], p * sFr);
            }
            let v;
            if (p < domainSize) {
                v = w;
            } else {
                v = Fr.mul(w, k1);
            }

            lastAparence[s] = v;
        }
    }

    async function writeLs() {
        await startWriteSection(fdZKey, BP_LAGRANGE_ZKEY_SECTION);
        const l = Math.max(nPublic, 1);
        for (let i = 0; i < l; i++) {
            let buff = new BigBuffer(domainSize * sFr);
            buff.set(Fr.one, i * sFr);
            await writeP4(buff);
            if (logger) logger.debug(`writing Lagrange polynomials ${i}/${l}`);
        }
        await endWriteSection(fdZKey);
    }

    async function writePtau() {
        await startWriteSection(fdZKey, BP_PTAU_ZKEY_SECTION);
        const buffOut = new BigBuffer((domainSize + 6) * sG1);
        await fdPTau.readToBuffer(buffOut, 0, (domainSize + 6) * sG1, sectionsPTau[2][0].p);
        if (logger) logger.debug("writing ptau");
        await fdZKey.write(buffOut);
        await endWriteSection(fdZKey);
    }

    async function writeZkeyHeader() {
        await startWriteSection(fdZKey, HEADER_ZKEY_SECTION);
        await fdZKey.writeULE32(BABY_PLONK_PROTOCOL_ID);
        await endWriteSection(fdZKey);
    }
    
    async function writeBabyPlonkHeader() {
        await startWriteSection(fdZKey, BP_HEADER_ZKEY_SECTION);

        const primeQ = curve.q;
        const n8q = (Math.floor((Scalar.bitLength(primeQ) - 1) / 64) + 1) * 8;

        const primeR = curve.r;
        const n8r = (Math.floor((Scalar.bitLength(primeR) - 1) / 64) + 1) * 8;

        await fdZKey.writeULE32(n8q);
        await writeBigInt(fdZKey, primeQ, n8q);

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
        bX_2 = await fdPTau.read(sG2, sectionsPTau[3][0].p + sG2);
        await fdZKey.write(bX_2);

        await endWriteSection(fdZKey);
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


