/*
    Copyright 2021 0kims association.

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

/* Implementation of this paper: https://eprint.iacr.org/2019/953.pdf */

import {readR1cs} from "r1csfile";
import * as utils from "./powersoftau_utils.js";
import {
    readBinFile,
    createBinFile,
    readSection,
    writeBigInt,
    startWriteSection,
    endWriteSection,
} from "@iden3/binfileutils";
import {log2} from "./misc.js";
import {Scalar, BigBuffer} from "ffjavascript";
import Blake2b from "blake2b-wasm";
import BigArray from "./bigarray.js";
import {
    writeZKeyCustomGatesListSection, writeZKeyCustomGatesUsesSection
} from "./zkey_utils.js";
import FactoryCG from "./custom_gates/cg_factory.js";
import {expTau} from "./utils.js";


export default async function plonkSetup(r1csName, ptauName, zkeyName, logger) {

    forceGarbageCollection();

    await Blake2b.ready();

    const {fd: fdPTau, sections: sectionsPTau} = await readBinFile(ptauName, "ptau", 1, 1 << 22, 1 << 24);
    const {curve, power} = await utils.readPTauHeader(fdPTau, sectionsPTau);
    const {fd: fdR1cs, sections: sectionsR1cs} = await readBinFile(r1csName, "r1cs", 1, 1 << 22, 1 << 24);

    const r1cs = await readR1cs(r1csName, {
        loadConstraints: true,
        loadMap: false,
        loadCustomGates: true,
        singleThread: false
    });

    let customGates;
    if (r1cs.useCustomGates) {
        customGates = {};
        customGates.gates = [];
        for (let i = 0; i < r1cs.customGates.length; i++) {
            customGates.gates.push(FactoryCG.createFromName(r1cs.customGates[i].templateName, {parameters: r1cs.customGates[i].parameters}));
        }
    }

    const sG1 = curve.G1.F.n8 * 2;
    const G1 = curve.G1;
    const sG2 = curve.G2.F.n8 * 2;
    const Fr = curve.Fr;
    const n8r = curve.Fr.n8;

    if (logger) logger.info("Reading r1cs");
    let sR1cs = await readSection(fdR1cs, sectionsR1cs, 2);

    const plonkConstraints = new BigArray();
    const plonkAdditions = new BigArray();
    let plonkNVars = r1cs.nVars;

    const nPublic = r1cs.nOutputs + r1cs.nPubInputs;

    let nSections = r1cs.useCustomGates ? 16 : 14;
    if (r1cs.useCustomGates) {
        nSections += customGates.gates.length * 3;
    }

    await processConstraints();
    forceGarbageCollection();

    const fdZKey = await createBinFile(zkeyName, "zkey", 1, nSections, 1 << 22, 1 << 24);

    if (r1cs.prime != curve.r) {
        if (logger) logger.error("r1cs curve does not match powers of tau ceremony curve");
        return -1;
    }

    let cirPower = log2(plonkConstraints.length - 1) + 1;
    if (cirPower < 3) cirPower = 3;   // As the t polinomal is n+5 whe need at least a power of 4
    const domainSize = 2 ** cirPower;

    let domainSizeExt = domainSize;
    let cirPowerExt = cirPower;
    if (r1cs.useCustomGates) {
        for (let i = 0; i < customGates.gates.length; i++) {
            domainSizeExt = Math.max(domainSizeExt, customGates.gates[i].domainSize);
            cirPowerExt = log2(domainSizeExt) + 1;
        }
    }

    if (logger) logger.info("Plonk constraints: " + plonkConstraints.length);
    if (cirPowerExt > power) {
        if (logger) logger.error(`circuit too big for this power of tau ceremony. ${plonkConstraints.length} > 2**${cirPowerExt}`);
        return -1;
    }

    if (!sectionsPTau[12]) {
        if (logger) logger.error("Powers of tau is not prepared.");
        return -1;
    }


    const LPoints = new BigBuffer(domainSizeExt * sG1);
    const o = sectionsPTau[12][0].p + ((2 ** (cirPower)) - 1) * sG1;
    await fdPTau.readToBuffer(LPoints, 0, domainSizeExt * sG1, o);

    const [k1, k2] = getK1K2();

    const vk = {};


    await writeAdditions(3, "Additions");
    forceGarbageCollection();
    await writeWitnessMap(4, 0, "Amap");
    forceGarbageCollection();
    await writeWitnessMap(5, 1, "Bmap");
    forceGarbageCollection();
    await writeWitnessMap(6, 2, "Cmap");
    forceGarbageCollection();
    await writeQMap(7, 3, "Qm");
    forceGarbageCollection();
    await writeQMap(8, 4, "Ql");
    forceGarbageCollection();
    await writeQMap(9, 5, "Qr");
    forceGarbageCollection();
    await writeQMap(10, 6, "Qo");
    forceGarbageCollection();
    await writeQMap(11, 7, "Qc");
    forceGarbageCollection();

    if (r1cs.useCustomGates) {
        if (logger) logger.debug("writing Custom gates list section");
        await writeZKeyCustomGatesListSection(fdZKey, customGates.gates);
        if (logger) logger.debug("writing Custom gates uses section");
        await writeZKeyCustomGatesUsesSection(fdZKey, r1cs.customGatesUses);

        vk.customGates = Array(customGates.gates.length);
        for (let i = 0; i < customGates.gates.length; i++) {
            vk.customGates[i] = {};

            if (logger) logger.debug("writing custom gates Q map section");
            await writeZKeyCustomGateQMap(i);
            forceGarbageCollection();

            if (logger) logger.debug("writing custom gates preprocessed input section");
            await writeZKeyCustomGatesPreprocessedInput(i);
            forceGarbageCollection();
        }
    }

    await writeSigma(12, "sigma");
    forceGarbageCollection();
    await writeLs(13, "lagrange polynomials");
    forceGarbageCollection();


    // Write PTau points
    ////////////

    await startWriteSection(fdZKey, 14);
    const buffOut = new BigBuffer((domainSizeExt * 4 + 6) * sG1);
    await fdPTau.readToBuffer(buffOut, 0, (domainSizeExt * 4 + 6) * sG1, sectionsPTau[2][0].p);
    await fdZKey.write(buffOut);
    await endWriteSection(fdZKey);
    forceGarbageCollection();


    await writeHeaders();

    await fdZKey.close();
    await fdR1cs.close();
    await fdPTau.close();

    if (logger) logger.info("Plonk setup Finished");

    return;

    async function processConstraints() {

        let r1csPos = 0;
        const qcgZero = r1cs.useCustomGates ? Array(customGates.length).fill(curve.Fr.zero) : [];

        function r1cs_readULE32() {
            const buff = sR1cs.slice(r1csPos, r1csPos + 4);
            r1csPos += 4;
            const buffV = new DataView(buff.buffer);
            return buffV.getUint32(0, true);
        }

        function r1cs_readCoef() {
            const res = Fr.fromRprLE(sR1cs.slice(r1csPos, r1csPos + curve.Fr.n8));
            r1csPos += curve.Fr.n8;
            return res;
        }

        function r1cs_readCoefs() {
            const coefs = [];
            const res = {
                k: curve.Fr.zero
            };
            const nA = r1cs_readULE32();
            for (let i = 0; i < nA; i++) {
                const s = r1cs_readULE32();
                const coefp = r1cs_readCoef();

                if (s == 0) {
                    res.k = coefp;
                } else {
                    coefs.push([s, coefp]);
                }
            }

            const resCoef = reduceCoef(coefs);
            res.s = resCoef[0];
            res.coef = resCoef[1];
            return res;
        }

        function reduceCoef(coefs) {
            if (coefs.length == 0) {
                return [0, curve.Fr.zero];
            }
            if (coefs.length == 1) {
                return coefs[0];
            }
            const arr1 = coefs.slice(0, coefs.length >> 1);
            const arr2 = coefs.slice(coefs.length >> 1);
            const coef1 = reduceCoef(arr1);
            const coef2 = reduceCoef(arr2);

            const sl = coef1[0];
            const sr = coef2[0];
            const so = plonkNVars++;
            const qm = curve.Fr.zero;
            const ql = Fr.neg(coef1[1]);
            const qr = Fr.neg(coef2[1]);
            const qo = curve.Fr.one;
            const qc = curve.Fr.zero;

            plonkConstraints.push([sl, sr, so, qm, ql, qr, qo, qc, ...qcgZero]);

            plonkAdditions.push([sl, sr, coef1[1], coef2[1]]);

            return [so, curve.Fr.one];
        }

        for (let s = 1; s <= nPublic; s++) {
            const sl = s;
            const sr = 0;
            const so = 0;
            const qm = curve.Fr.zero;
            const ql = curve.Fr.one;
            const qr = curve.Fr.zero;
            const qo = curve.Fr.zero;
            const qc = curve.Fr.zero;

            plonkConstraints.push([sl, sr, so, qm, ql, qr, qo, qc, ...qcgZero]);
        }

        for (let c = 0; c < r1cs.nConstraints; c++) {
            if ((logger) && (c % 10000 == 0)) logger.debug(`processing constraints: ${c}/${r1cs.nConstraints}`);
            const A = r1cs_readCoefs();
            const B = r1cs_readCoefs();
            const C = r1cs_readCoefs();

            const sl = A.s;
            const sr = B.s;
            const so = C.s;
            const qm = curve.Fr.mul(A.coef, B.coef);
            const ql = curve.Fr.mul(A.coef, B.k);
            const qr = curve.Fr.mul(A.k, B.coef);
            const qo = curve.Fr.neg(C.coef);
            const qc = curve.Fr.sub(curve.Fr.mul(A.k, B.k), C.k);

            plonkConstraints.push([sl, sr, so, qm, ql, qr, qo, qc, ...qcgZero]);
        }

        if (r1cs.useCustomGates) {
            for (let i = 0; i < r1cs.customGatesUses.length; i++) {
                const gate = customGates.gates[r1cs.customGatesUses[i].id];
                let constraints = gate.plonkConstraints(r1cs.customGatesUses[i].signals, curve.Fr);

                constraints.forEach(ctr => {
                    let qcgArr = Array(r1cs.customGates.length);
                    for (let i = 0; i < r1cs.customGates.length; i++) {
                        qcgArr[i] = r1cs.customGatesUses[i].id === i ? ctr.qk : curve.Fr.zero;
                    }
                    plonkConstraints.push([ctr.sl, ctr.sr, ctr.so, ctr.qm, ctr.ql, ctr.qr, ctr.qo, ctr.qc, ...qcgArr]);
                });
            }
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
        let Q = new BigBuffer(domainSize * n8r);
        for (let i = 0; i < plonkConstraints.length; i++) {
            Q.set(plonkConstraints[i][posConstraint], i * n8r);
            if ((logger) && (i % 1000000 == 0)) logger.debug(`writing ${name}: ${i}/${plonkConstraints.length}`);
        }
        await startWriteSection(fdZKey, sectionNum);
        await writeP4(Q);
        await endWriteSection(fdZKey);

        vk[name] = await expTau(Q, LPoints, curve, logger, "multiexp " + name);
    }

    async function writeZKeyCustomGateQMap(idx) {
        if (logger) logger.debug(`writing ${customGates.gates[idx].name} Q map`);

        const name = customGates.gates[idx].name;
        const posConstraint = 8 + idx;

        let Q = new BigBuffer(domainSize * n8r);
        for (let i = 0; i < plonkConstraints.length; i++) {
            Q.set(plonkConstraints[i][posConstraint], i * n8r);
            if ((logger) && (i % 1000000 === 0)) logger.debug(`writing ${name}: ${i}/${plonkConstraints.length}`);
        }

        const sectionNum = customGates.gates[idx].qSectionId;
        await startWriteSection(fdZKey, sectionNum);
        await writeP4(Q);
        await endWriteSection(fdZKey);

        vk.customGates[idx].Qk = await expTau(Q, LPoints, curve, logger, "multiexp " + name);
    }

    async function writeP4(buff) {
        const q = await Fr.ifft(buff);
        const q4 = new BigBuffer(domainSize * n8r * 4);
        q4.set(q, 0);
        const Q4 = await Fr.fft(q4);
        await fdZKey.write(q);
        await fdZKey.write(Q4);
    }

    async function writeP4_2(buff) {
        const q = await Fr.ifft(buff);
        const q4 = new BigBuffer(buff.byteLength * 4);
        q4.set(q, 0);
        const Q4 = await Fr.fft(q4);
        await fdZKey.write(q);
        await fdZKey.write(Q4);
    }

    async function writeZKeyCustomGatesPreprocessedInput(idx) {
        const name = customGates.gates[idx].name;
        const preInput = customGates.gates[idx].preprocessedInput(curve.Fr);

        await startWriteSection(fdZKey, customGates.gates[idx].preprocessedSectionId);

        vk.customGates[idx].preInput = {};
        vk.customGates[idx].preInput.data = preInput.data;

        const keys = customGates.gates[idx].preprocessedInputKeys;

        //Write polynomials
        for (let i = 0; i < keys.polynomials.length; i++) {
            const polynomial = preInput.polynomials[keys.polynomials[i]];
            let buffer = new BigBuffer(polynomial.length * n8r);

            for (let i = 0; i < polynomial.length; i++) {
                buffer.set(polynomial[i], i * n8r);
                if ((logger) && (0 === i % 1000000)) logger.debug(`writing preprocessed input for ${name}: ${i}/${polynomial.length}`);
            }
            await writeP4_2(buffer);

            const mExp = await expTau(buffer, LPoints, curve, logger, "multiexp " + name);

            vk.customGates[idx].preInput[keys.polynomials[i]] = curve.G1.toAffine(mExp);
            forceGarbageCollection();
        }
        await endWriteSection(fdZKey);
    }

    async function writeAdditions(sectionNum, name) {
        await startWriteSection(fdZKey, sectionNum);
        const buffOut = new Uint8Array((2 * 4 + 2 * n8r));
        const buffOutV = new DataView(buffOut.buffer);
        for (let i = 0; i < plonkAdditions.length; i++) {
            const addition = plonkAdditions[i];
            let o = 0;
            buffOutV.setUint32(o, addition[0], true);
            o += 4;
            buffOutV.setUint32(o, addition[1], true);
            o += 4;
            // The value is stored in  Montgomery. stored = v*R
            // so when montgomery multiplicated by the witness  it result = v*R*w/R = v*w
            buffOut.set(addition[2], o);
            o += n8r;
            buffOut.set(addition[3], o);
            o += n8r;
            await fdZKey.write(buffOut);
            if ((logger) && (i % 1000000 == 0)) logger.debug(`writing ${name}: ${i}/${plonkAdditions.length}`);
        }
        await endWriteSection(fdZKey);
    }

    async function writeSigma(sectionNum, name) {
        const sigma = new BigBuffer(n8r * domainSize * 3);
        const firstPos = new BigArray(plonkNVars);
        const lastPos = new BigArray(plonkNVars);

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
            if ((logger) && (i % 1000000 === 0)) logger.debug(`writing ${name} phase1: ${i}/${plonkConstraints.length}`);
        }

        for (let s = 0; s < plonkNVars; s++) {
            if (typeof firstPos[s] !== "undefined") {
                sigma.set(lastPos[s], firstPos[s] * n8r);
            } else {
                // throw new Error("Variable not used");
                console.log("Variable not used");
            }
            if ((logger) && (s % 1000000 == 0)) logger.debug(`writing ${name} phase2: ${s}/${plonkNVars}`);
        }
        forceGarbageCollection();

        await startWriteSection(fdZKey, sectionNum);

        let S1 = sigma.slice(0, domainSize * n8r);
        await writeP4(S1);
        forceGarbageCollection();

        let S2 = sigma.slice(domainSize * n8r, domainSize * n8r * 2);
        await writeP4(S2);
        forceGarbageCollection();

        let S3 = sigma.slice(domainSize * n8r * 2, domainSize * n8r * 3);
        await writeP4(S3);
        forceGarbageCollection();

        await endWriteSection(fdZKey);

        vk.S1 = await expTau(S1, LPoints, curve, logger, "multiexp S1");
        forceGarbageCollection();
        vk.S2 = await expTau(S2, LPoints, curve, logger, "multiexp S2");
        forceGarbageCollection();
        vk.S3 = await expTau(S3, LPoints, curve, logger, "multiexp S3");
        forceGarbageCollection();

        function buildSigma(s, p) {
            if (typeof lastPos[s] === "undefined") {
                firstPos[s] = p;
            } else {
                sigma.set(lastPos[s], p * n8r);
            }
            let v;
            if (p < domainSize) {
                v = w;
            } else if (p < 2 * domainSize) {
                v = Fr.mul(w, k1);
            } else {
                v = Fr.mul(w, k2);
            }
            lastPos[s] = v;
        }
    }

    async function writeLs(sectionNum, name) {
        await startWriteSection(fdZKey, sectionNum);
        const l = Math.max(nPublic, 1);
        for (let i = 0; i < l; i++) {
            let buff = new BigBuffer(domainSize * n8r);
            buff.set(Fr.one, i * n8r);
            await writeP4(buff);
            if (logger) logger.debug(`writing ${name} ${i}/${l}`);
        }
        await endWriteSection(fdZKey);
    }

    async function writeHeaders() {

        // Write the header
        ///////////
        await startWriteSection(fdZKey, 1);
        await fdZKey.writeULE32(2); // Plonk
        await endWriteSection(fdZKey);

        // Write the Plonk header section
        ///////////

        await startWriteSection(fdZKey, 2);
        const primeQ = curve.q;
        const n8q = (Math.floor((Scalar.bitLength(primeQ) - 1) / 64) + 1) * 8;

        const primeR = curve.r;
        const n8r = (Math.floor((Scalar.bitLength(primeR) - 1) / 64) + 1) * 8;

        await fdZKey.writeULE32(n8q);
        await writeBigInt(fdZKey, primeQ, n8q);
        await fdZKey.writeULE32(n8r);
        await writeBigInt(fdZKey, primeR, n8r);
        await fdZKey.writeULE32(plonkNVars);                // Total number of vars
        await fdZKey.writeULE32(nPublic);                   // Total number of public vars (not including ONE)
        await fdZKey.writeULE32(domainSize);                // domainSize
        await fdZKey.writeULE32(plonkAdditions.length);     // # of rows in plonk additions table
        await fdZKey.writeULE32(plonkConstraints.length);   // # of rows in plonk constraints table

        await fdZKey.write(k1);                             //k1
        await fdZKey.write(k2);                             //k2

        await fdZKey.write(G1.toAffine(vk.Qm));             //Qm
        await fdZKey.write(G1.toAffine(vk.Ql));             //Ql
        await fdZKey.write(G1.toAffine(vk.Qr));             //Qr
        await fdZKey.write(G1.toAffine(vk.Qo));             //Qo
        await fdZKey.write(G1.toAffine(vk.Qc));             //Qc

        await fdZKey.write(G1.toAffine(vk.S1));             //Sigma 1
        await fdZKey.write(G1.toAffine(vk.S2));             //Sigma 2
        await fdZKey.write(G1.toAffine(vk.S3));             //Sigma 3

        let bX_2;
        bX_2 = await fdPTau.read(sG2, sectionsPTau[3][0].p + sG2);
        await fdZKey.write(bX_2);

        await endWriteSection(fdZKey);

        if (r1cs.useCustomGates) {

            for (let i = 0; i < customGates.gates.length; i++) {
                const name = customGates.gates[i].name;
                const keys = customGates.gates[i].preprocessedInputKeys;

                if (logger) logger.debug(`writing custom gate ${name} header section`);

                await startWriteSection(fdZKey, customGates.gates[i].headerSectionId);
                await fdZKey.write(G1.toAffine(vk.customGates[i].Qk));

                for (let j = 0; j < keys.data.length; j++) {
                    await fdZKey.writeULE32(vk.customGates[i].preInput.data[keys.data[j]]);
                }

                for (let j = 0; j < keys.polynomials.length; j++) {
                    await fdZKey.write(vk.customGates[i].preInput[keys.polynomials[j]]);
                }

                await endWriteSection(fdZKey);
            }
        }
    }

    function getK1K2() {
        let k1 = Fr.two;
        while (isIncluded(k1, [], cirPower)) Fr.add(k1, Fr.one);
        let k2 = Fr.add(k1, Fr.one);
        while (isIncluded(k2, [k1], cirPower)) Fr.add(k2, Fr.one);
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

    function forceGarbageCollection() {
        if (globalThis.gc) {
            globalThis.gc();
        }
    }
}


