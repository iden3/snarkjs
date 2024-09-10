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

import {readR1csFd} from "r1csfile";
import * as utils from "./powersoftau_utils.js";
import {
    readBinFile,
    createBinFile,
    readSection,
    writeBigInt,
    startWriteSection,
    endWriteSection,
} from "@iden3/binfileutils";
import { log2  } from "./misc.js";
import { Scalar, BigBuffer } from "ffjavascript";
import Blake2b from "blake2b-wasm";
import BigArray from "./bigarray.js";


export default async function plonkSetup(r1csName, ptauName, zkeyName, logger) {

    if (globalThis.gc) {globalThis.gc();}

    await Blake2b.ready();

    const {fd: fdPTau, sections: sectionsPTau} = await readBinFile(ptauName, "ptau", 1, 1<<22, 1<<24);
    const {curve, power} = await utils.readPTauHeader(fdPTau, sectionsPTau);
    const {fd: fdR1cs, sections: sectionsR1cs} = await readBinFile(r1csName, "r1cs", 1, 1<<22, 1<<24);

    const r1cs = await readR1csFd(fdR1cs, sectionsR1cs, {loadConstraints: true, loadCustomGates: true});

    const sG1 = curve.G1.F.n8*2;
    const G1 = curve.G1;
    const sG2 = curve.G2.F.n8*2;
    const Fr = curve.Fr;
    const n8r = curve.Fr.n8;

    if (logger) logger.info("Reading r1cs");
    let sR1cs = await readSection(fdR1cs, sectionsR1cs, 2);

    const plonkConstraints = new BigArray();
    const plonkAdditions = new BigArray();
    let plonkNVars = r1cs.nVars;

    const nPublic = r1cs.nOutputs + r1cs.nPubInputs;

    await processConstraints(curve.Fr, r1cs, logger);

    if (globalThis.gc) {globalThis.gc();}

    const fdZKey = await createBinFile(zkeyName, "zkey", 1, 14, 1<<22, 1<<24);


    if (r1cs.prime != curve.r) {
        if (logger) logger.error("r1cs curve does not match powers of tau ceremony curve");
        return -1;
    }

    let cirPower = log2(plonkConstraints.length -1) +1;
    if (cirPower < 3) cirPower = 3;   // As the t polynomial is n+5 we need at least a power of 4
    const domainSize = 2 ** cirPower;

    if (logger) logger.info("Plonk constraints: " + plonkConstraints.length);
    if (cirPower > power) {
        if (logger) logger.error(`circuit too big for this power of tau ceremony. ${plonkConstraints.length} > 2**${power}`);
        return -1;
    }

    if (!sectionsPTau[12]) {
        if (logger) logger.error("Powers of tau is not prepared.");
        return -1;
    }


    const LPoints = new BigBuffer(domainSize*sG1);
    const o = sectionsPTau[12][0].p + ((2 ** (cirPower)) -1)*sG1;
    await fdPTau.readToBuffer(LPoints, 0, domainSize*sG1, o);

    const [k1, k2] = getK1K2();

    const vk = {};


    await writeAdditions(3, "Additions");
    if (globalThis.gc) {globalThis.gc();}
    await writeWitnessMap(4, 0, "Amap");
    if (globalThis.gc) {globalThis.gc();}
    await writeWitnessMap(5, 1, "Bmap");
    if (globalThis.gc) {globalThis.gc();}
    await writeWitnessMap(6, 2, "Cmap");
    if (globalThis.gc) {globalThis.gc();}
    await writeQMap(7, 3, "Qm");
    if (globalThis.gc) {globalThis.gc();}
    await writeQMap(8, 4, "Ql");
    if (globalThis.gc) {globalThis.gc();}
    await writeQMap(9, 5, "Qr");
    if (globalThis.gc) {globalThis.gc();}
    await writeQMap(10, 6, "Qo");
    if (globalThis.gc) {globalThis.gc();}
    await writeQMap(11, 7, "Qc");
    if (globalThis.gc) {globalThis.gc();}
    await writeSigma(12, "sigma");
    if (globalThis.gc) {globalThis.gc();}
    await writeLs(13, "lagrange polynomials");
    if (globalThis.gc) {globalThis.gc();}

    // Write PTau points
    ////////////

    await startWriteSection(fdZKey, 14);
    const buffOut = new BigBuffer((domainSize+6)*sG1);
    await fdPTau.readToBuffer(buffOut, 0, (domainSize+6)*sG1, sectionsPTau[2][0].p);
    await fdZKey.write(buffOut);
    await endWriteSection(fdZKey);
    if (globalThis.gc) {globalThis.gc();}


    await writeHeaders();

    await fdZKey.close();
    await fdR1cs.close();
    await fdPTau.close();

    if (logger) logger.info("Setup Finished");

    return ;

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
                    cs.push([Number(s), linearComb[s]])
                }
            }
            while (cs.length > maxC) {
                const c1 = cs.shift();
                const c2 = cs.shift();

                const sl = c1[0];
                const sr = c2[0];
                const so = plonkNVars++;
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
        for (let i=0; i<plonkConstraints.length; i++) {
            await fdZKey.writeULE32(plonkConstraints[i][posConstraint]);
            if ((logger)&&(i%1000000 == 0)) logger.debug(`writing ${name}: ${i}/${plonkConstraints.length}`);
        }
        await endWriteSection(fdZKey);
    }

    async function writeQMap(sectionNum, posConstraint, name) {
        let Q = new BigBuffer(domainSize*n8r);
        for (let i=0; i<plonkConstraints.length; i++) {
            Q.set(plonkConstraints[i][posConstraint], i*n8r);
            if ((logger)&&(i%1000000 == 0)) logger.debug(`writing ${name}: ${i}/${plonkConstraints.length}`);
        }
        await startWriteSection(fdZKey, sectionNum);
        await writeP4(Q);
        await endWriteSection(fdZKey);
        Q = await Fr.batchFromMontgomery(Q);
        vk[name]= await curve.G1.multiExpAffine(LPoints, Q, logger, "multiexp "+name);
    }

    async function writeP4(buff) {
        const q = await Fr.ifft(buff);
        const q4 = new BigBuffer(domainSize*n8r*4);
        q4.set(q, 0);
        const Q4 = await Fr.fft(q4);
        await fdZKey.write(q);
        await fdZKey.write(Q4);
    }

    async function writeAdditions(sectionNum, name) {
        await startWriteSection(fdZKey, sectionNum);
        const buffOut = new Uint8Array((2*4+2*n8r));
        const buffOutV = new DataView(buffOut.buffer);
        for (let i=0; i<plonkAdditions.length; i++) {
            const addition=plonkAdditions[i];
            let o=0;
            buffOutV.setUint32(o, addition[0], true); o+=4;
            buffOutV.setUint32(o, addition[1], true); o+=4;
            // The value is stored in Montgomery. stored = v*R
            // so when montgomery multiplied by the witness, it's result = v*R*w/R = v*w
            buffOut.set(addition[2], o); o+= n8r;
            buffOut.set(addition[3], o); o+= n8r;
            await fdZKey.write(buffOut);
            if ((logger)&&(i%1000000 == 0)) logger.debug(`writing ${name}: ${i}/${plonkAdditions.length}`);
        }
        await endWriteSection(fdZKey);
    }

    async function writeSigma(sectionNum, name) {
        const sigma = new BigBuffer(n8r*domainSize*3);
        const lastAparence =  new BigArray(plonkNVars);
        const firstPos = new BigArray(plonkNVars);
        let w = Fr.one;
        for (let i=0; i<domainSize;i++) {
            if (i<plonkConstraints.length) {
                buildSigma(plonkConstraints[i][0], i);
                buildSigma(plonkConstraints[i][1], domainSize + i);
                buildSigma(plonkConstraints[i][2], domainSize*2 + i);
            } else {
                buildSigma(0, i);
                buildSigma(0, domainSize + i);
                buildSigma(0, domainSize*2 + i);
            }
            w = Fr.mul(w, Fr.w[cirPower]);
            if ((logger)&&(i%1000000 == 0)) logger.debug(`writing ${name} phase1: ${i}/${plonkConstraints.length}`);
        }
        for (let s=0; s<plonkNVars; s++) {
            if (typeof firstPos[s] !== "undefined") {
                sigma.set(lastAparence[s], firstPos[s]*n8r);
            } else {
                // throw new Error("Variable not used");
                console.log("Variable not used");
            }
            if ((logger)&&(s%1000000 == 0)) logger.debug(`writing ${name} phase2: ${s}/${plonkNVars}`);
        }

        if (globalThis.gc) {globalThis.gc();}
        await startWriteSection(fdZKey, sectionNum);
        let S1 = sigma.slice(0, domainSize*n8r);
        await writeP4(S1);
        if (globalThis.gc) {globalThis.gc();}
        let S2 = sigma.slice(domainSize*n8r, domainSize*n8r*2);
        await writeP4(S2);
        if (globalThis.gc) {globalThis.gc();}
        let S3 = sigma.slice(domainSize*n8r*2, domainSize*n8r*3);
        await writeP4(S3);
        if (globalThis.gc) {globalThis.gc();}
        await endWriteSection(fdZKey);

        S1 = await Fr.batchFromMontgomery(S1);
        S2 = await Fr.batchFromMontgomery(S2);
        S3 = await Fr.batchFromMontgomery(S3);

        vk.S1= await curve.G1.multiExpAffine(LPoints, S1, logger, "multiexp S1");
        if (globalThis.gc) {globalThis.gc();}
        vk.S2= await curve.G1.multiExpAffine(LPoints, S2, logger, "multiexp S2");
        if (globalThis.gc) {globalThis.gc();}
        vk.S3= await curve.G1.multiExpAffine(LPoints, S3, logger, "multiexp S3");
        if (globalThis.gc) {globalThis.gc();}

        function buildSigma(s, p) {
            if (typeof lastAparence[s] === "undefined") {
                firstPos[s] = p;
            } else {
                sigma.set(lastAparence[s], p*n8r);
            }
            let v;
            if (p<domainSize) {
                v = w;
            } else if (p<2*domainSize) {
                v = Fr.mul(w, k1);
            } else {
                v = Fr.mul(w, k2);
            }
            lastAparence[s]=v;
        }
    }

    async function writeLs(sectionNum, name) {
        await startWriteSection(fdZKey, sectionNum);
        const l=Math.max(nPublic, 1);
        for (let i=0; i<l; i++) {
            let buff = new BigBuffer(domainSize*n8r);
            buff.set(Fr.one, i*n8r);
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
        const n8q = (Math.floor( (Scalar.bitLength(primeQ) - 1) / 64) +1)*8;

        const primeR = curve.r;
        const n8r = (Math.floor( (Scalar.bitLength(primeR) - 1) / 64) +1)*8;

        await fdZKey.writeULE32(n8q);
        await writeBigInt(fdZKey, primeQ, n8q);
        await fdZKey.writeULE32(n8r);
        await writeBigInt(fdZKey, primeR, n8r);
        await fdZKey.writeULE32(plonkNVars);                         // Total number of bars
        await fdZKey.writeULE32(nPublic);                       // Total number of public vars (not including ONE)
        await fdZKey.writeULE32(domainSize);                  // domainSize
        await fdZKey.writeULE32(plonkAdditions.length);                  // domainSize
        await fdZKey.writeULE32(plonkConstraints.length); 

        await fdZKey.write(k1);
        await fdZKey.write(k2);

        await fdZKey.write(G1.toAffine(vk.Qm));
        await fdZKey.write(G1.toAffine(vk.Ql));
        await fdZKey.write(G1.toAffine(vk.Qr));
        await fdZKey.write(G1.toAffine(vk.Qo));
        await fdZKey.write(G1.toAffine(vk.Qc));

        await fdZKey.write(G1.toAffine(vk.S1));
        await fdZKey.write(G1.toAffine(vk.S2));
        await fdZKey.write(G1.toAffine(vk.S3));

        let bX_2;
        bX_2 = await fdPTau.read(sG2, sectionsPTau[3][0].p + sG2);
        await fdZKey.write(bX_2);

        await endWriteSection(fdZKey);
    }

    function getK1K2() {
        let k1 = Fr.two;
        while (isIncluded(k1, [], cirPower)) Fr.add(k1, Fr.one);
        let k2 = Fr.add(k1, Fr.one);
        while (isIncluded(k2, [k1], cirPower)) Fr.add(k2, Fr.one);
        return [k1, k2];


        function isIncluded(k, kArr, pow) {
            const domainSize= 2**pow;
            let w = Fr.one;
            for (let i=0; i<domainSize; i++) {
                if (Fr.eq(k, w)) return true;
                for (let j=0; j<kArr.length; j++) {
                    if (Fr.eq(k, Fr.mul(kArr[j], w))) return true;
                }
                w = Fr.mul(w, Fr.w[pow]);
            }
            return false;
        }
    }
}


