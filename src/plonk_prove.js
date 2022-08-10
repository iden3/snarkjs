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

/* Implementation of this paper: https://eprint.iacr.org/2019/953.pdf section 8.4 */

import * as binFileUtils from "@iden3/binfileutils";
import * as zkeyUtils from "./zkey_utils.js";
import * as wtnsUtils from "./wtns_utils.js";
import { getCurveFromQ as getCurve } from "./curves.js";
import { Scalar, utils, BigBuffer } from "ffjavascript";
const {stringifyBigInts} = utils;
import jsSha3 from "js-sha3";
const { keccak256 } = jsSha3;

export default async function plonk16Prove(zkeyFileName, witnessFileName, logger) {
    const {fd: fdWtns, sections: sectionsWtns} = await binFileUtils.readBinFile(witnessFileName, "wtns", 2, 1<<25, 1<<23);

    const wtns = await wtnsUtils.readHeader(fdWtns, sectionsWtns);

    const {fd: fdZKey, sections: sectionsZKey} = await binFileUtils.readBinFile(zkeyFileName, "zkey", 2, 1<<25, 1<<23);

    const zkey = await zkeyUtils.readHeader(fdZKey, sectionsZKey);
    if (zkey.protocol != "plonk") {
        throw new Error("zkey file is not plonk");
    }

    if (!Scalar.eq(zkey.r,  wtns.q)) {
        throw new Error("Curve of the witness does not match the curve of the proving key");
    }

    if (wtns.nWitness != zkey.nVars -zkey.nAdditions) {
        throw new Error(`Invalid witness length. Circuit: ${zkey.nVars}, witness: ${wtns.nWitness}, ${zkey.nAdditions}`);
    }

    const curve = zkey.curve;
    const Fr = curve.Fr;
    const G1 = curve.G1;
    const n8r = curve.Fr.n8;

    if (logger) logger.debug("Reading Wtns");
    const buffWitness = await binFileUtils.readSection(fdWtns, sectionsWtns, 2);
    // First element in plonk is not used and can be any value. (But always the same).
    // We set it to zero to go faster in the exponentiations.
    buffWitness.set(Fr.zero, 0);
    const buffInternalWitness = new BigBuffer(n8r*zkey.nAdditions);

    await calculateAdditions();

    let A,B,C,Z;
    let A4, B4, C4, Z4;
    let pol_a,pol_b,pol_c, pol_z, pol_t, pol_r;
    let proof = {};

    const sigmaBuff = new BigBuffer(zkey.domainSize*n8r*4*3);
    let o = sectionsZKey[12][0].p + zkey.domainSize*n8r;
    await fdZKey.readToBuffer(sigmaBuff, 0 , zkey.domainSize*n8r*4, o);
    o += zkey.domainSize*n8r*5;
    await fdZKey.readToBuffer(sigmaBuff, zkey.domainSize*n8r*4 , zkey.domainSize*n8r*4, o);
    o += zkey.domainSize*n8r*5;
    await fdZKey.readToBuffer(sigmaBuff, zkey.domainSize*n8r*8 , zkey.domainSize*n8r*4, o);

    const pol_s1 = new BigBuffer(zkey.domainSize*n8r);
    await fdZKey.readToBuffer(pol_s1, 0 , zkey.domainSize*n8r, sectionsZKey[12][0].p);

    const pol_s2 = new BigBuffer(zkey.domainSize*n8r);
    await fdZKey.readToBuffer(pol_s2, 0 , zkey.domainSize*n8r, sectionsZKey[12][0].p + 5*zkey.domainSize*n8r);

    const PTau = await binFileUtils.readSection(fdZKey, sectionsZKey, 14);


    const ch = {};

    await round1();
    await round2();
    await round3();
    await round4();
    await round5();


    ///////////////////////
    // Final adjustments //
    ///////////////////////

    proof.protocol = "plonk";
    proof.curve = curve.name;

    await fdZKey.close();
    await fdWtns.close();

    let publicSignals = [];

    for (let i=1; i<= zkey.nPublic; i++) {
        const pub = buffWitness.slice(i*Fr.n8, i*Fr.n8+Fr.n8);
        publicSignals.push(Scalar.fromRprLE(pub));
    }

    proof.A = G1.toObject(proof.A);
    proof.B = G1.toObject(proof.B);
    proof.C = G1.toObject(proof.C);
    proof.Z = G1.toObject(proof.Z);

    proof.T1 = G1.toObject(proof.T1);
    proof.T2 = G1.toObject(proof.T2);
    proof.T3 = G1.toObject(proof.T3);

    proof.eval_a = Fr.toObject(proof.eval_a);
    proof.eval_b = Fr.toObject(proof.eval_b);
    proof.eval_c = Fr.toObject(proof.eval_c);
    proof.eval_s1 = Fr.toObject(proof.eval_s1);
    proof.eval_s2 = Fr.toObject(proof.eval_s2);
    proof.eval_zw = Fr.toObject(proof.eval_zw);
    proof.eval_t = Fr.toObject(proof.eval_t);
    proof.eval_r = Fr.toObject(proof.eval_r);

    proof.Wxi = G1.toObject(proof.Wxi);
    proof.Wxiw = G1.toObject(proof.Wxiw);

    delete proof.eval_t;

    proof = stringifyBigInts(proof);
    publicSignals = stringifyBigInts(publicSignals);

    return {proof, publicSignals};

    async function calculateAdditions() {
        const additionsBuff = await binFileUtils.readSection(fdZKey, sectionsZKey, 3);

        const sSum = 8+curve.Fr.n8*2;

        for (let i=0; i<zkey.nAdditions; i++) {
            const ai= readUInt32(additionsBuff, i*sSum);
            const bi= readUInt32(additionsBuff, i*sSum+4);
            const ac= additionsBuff.slice(i*sSum+8, i*sSum+8+n8r);
            const bc= additionsBuff.slice(i*sSum+8+n8r, i*sSum+8+n8r*2);
            const aw= getWitness(ai);
            const bw= getWitness(bi);

            const r = curve.Fr.add(
                curve.Fr.mul(ac, aw),
                curve.Fr.mul(bc, bw)
            );
            buffInternalWitness.set(r, n8r*i);
        }

    }

    async function buildABC() {
        let A = new BigBuffer(zkey.domainSize * n8r);
        let B = new BigBuffer(zkey.domainSize * n8r);
        let C = new BigBuffer(zkey.domainSize * n8r);

        const aMap = await binFileUtils.readSection(fdZKey, sectionsZKey, 4);
        const bMap = await binFileUtils.readSection(fdZKey, sectionsZKey, 5);
        const cMap = await binFileUtils.readSection(fdZKey, sectionsZKey, 6);

        for (let i=0; i<zkey.nConstrains; i++) {
            const iA = readUInt32(aMap, i*4);
            A.set(getWitness(iA), i*n8r);
            const iB = readUInt32(bMap, i*4);
            B.set(getWitness(iB), i*n8r);
            const iC = readUInt32(cMap, i*4);
            C.set(getWitness(iC), i*n8r);
        }

        A = await Fr.batchToMontgomery(A);
        B = await Fr.batchToMontgomery(B);
        C = await Fr.batchToMontgomery(C);

        return [A,B,C];
    }

    function readUInt32(b, o) {
        const buff = b.slice(o, o+4);
        const buffV = new DataView(buff.buffer, buff.byteOffset, buff.byteLength);
        return buffV.getUint32(0, true);
    }

    function getWitness(idx) {
        if (idx < zkey.nVars-zkey.nAdditions) {
            return buffWitness.slice(idx*n8r, idx*n8r+n8r);
        } else if (idx < zkey.nVars) {
            return buffInternalWitness.slice((idx - (zkey.nVars-zkey.nAdditions))*n8r, (idx-(zkey.nVars-zkey.nAdditions))*n8r + n8r);
        } else {
            return curve.Fr.zero;
        }
    }

    async function round1() {
        ch.b = [];
        for (let i=1; i<=11; i++) {
            ch.b[i] = curve.Fr.random();
        }
    
        [A, B, C] = await buildABC();

        [pol_a, A4] = await to4T(A, [ch.b[2], ch.b[1]]);
        [pol_b, B4] = await to4T(B, [ch.b[4], ch.b[3]]);
        [pol_c, C4] = await to4T(C, [ch.b[6], ch.b[5]]);

                
        proof.A = await expTau(pol_a, "multiexp A");
        proof.B = await expTau(pol_b, "multiexp B");
        proof.C = await expTau(pol_c, "multiexp C");
    }

    async function round2() {

        const transcript1 = new Uint8Array(zkey.nPublic*n8r + G1.F.n8*2*3);
        for (let i=0; i<zkey.nPublic; i++) {
            Fr.toRprBE(transcript1, i*n8r, A.slice((i)*n8r, (i+1)*n8r));
        }
        G1.toRprUncompressed(transcript1, zkey.nPublic*n8r + 0, proof.A);
        G1.toRprUncompressed(transcript1, zkey.nPublic*n8r + G1.F.n8*2, proof.B);
        G1.toRprUncompressed(transcript1, zkey.nPublic*n8r + G1.F.n8*4, proof.C);

        ch.beta = hashToFr(transcript1);
        if (logger) logger.debug("beta: " + Fr.toString(ch.beta));
    
        const transcript2 = new Uint8Array(n8r);
        Fr.toRprBE(transcript2, 0, ch.beta);
        ch.gamma = hashToFr(transcript2);
        if (logger) logger.debug("gamma: " + Fr.toString(ch.gamma));
    
        let numArr = new BigBuffer(Fr.n8*zkey.domainSize);
        let denArr = new BigBuffer(Fr.n8*zkey.domainSize);

        numArr.set(Fr.one, 0);
        denArr.set(Fr.one, 0);

        let w = Fr.one;
        for (let i=0; i<zkey.domainSize; i++) {
            let n1 = A.slice(i*n8r, (i+1)*n8r);
            n1 = Fr.add( n1, Fr.mul(ch.beta, w) );
            n1 = Fr.add( n1, ch.gamma );

            let n2 = B.slice(i*n8r, (i+1)*n8r);
            n2 = Fr.add( n2, Fr.mul(zkey.k1, Fr.mul(ch.beta, w) ));
            n2 = Fr.add( n2, ch.gamma );

            let n3 = C.slice(i*n8r, (i+1)*n8r);
            n3 = Fr.add( n3, Fr.mul(zkey.k2, Fr.mul(ch.beta, w) ));
            n3 = Fr.add( n3, ch.gamma );

            const num = Fr.mul(n1, Fr.mul(n2, n3));

            let d1 = A.slice(i*n8r, (i+1)*n8r);
            d1 = Fr.add(d1, Fr.mul( sigmaBuff.slice(i*n8r*4, i*n8r*4 + n8r) , ch.beta));
            d1 = Fr.add(d1, ch.gamma);

            let d2 = B.slice(i*n8r, (i+1)*n8r);
            d2 = Fr.add(d2, Fr.mul( sigmaBuff.slice((zkey.domainSize + i)*4*n8r, (zkey.domainSize + i)*4*n8r+n8r) , ch.beta));
            d2 = Fr.add(d2, ch.gamma);

            let d3 = C.slice(i*n8r, (i+1)*n8r);
            d3 = Fr.add(d3, Fr.mul( sigmaBuff.slice((zkey.domainSize*2 + i)*4*n8r, (zkey.domainSize*2 + i)*4*n8r + n8r) , ch.beta));
            d3 = Fr.add(d3, ch.gamma);

            const den = Fr.mul(d1, Fr.mul(d2, d3));

            numArr.set(  
                Fr.mul( 
                    numArr.slice(i*n8r,(i+1)*n8r) , 
                    num
                ),
                ((i+1)%zkey.domainSize)*n8r
            );

            denArr.set(  
                Fr.mul( 
                    denArr.slice(i*n8r,(i+1)*n8r) , 
                    den
                ),
                ((i+1)%zkey.domainSize)*n8r
            );

            w = Fr.mul(w, Fr.w[zkey.power]);
        }

        denArr = await Fr.batchInverse(denArr);

        // TODO: Do it in assembly and in parallel
        for (let i=0; i<zkey.domainSize; i++) {
            numArr.set(   Fr.mul( numArr.slice(i*n8r, (i+1)*n8r), denArr.slice(i*n8r, (i+1)*n8r) )      ,i*n8r);
        }

        if (!Fr.eq(numArr.slice(0, n8r), Fr.one)) {
            throw new Error("Copy constraints does not match");
        }

        Z = numArr;

        [pol_z, Z4] = await to4T(Z, [ch.b[9], ch.b[8], ch.b[7]]);

        proof.Z = await expTau( pol_z, "multiexp Z");
    }

    async function round3() {

        /*
        async function checkDegree(P) {
            const p = await curve.Fr.ifft(P);
            let deg = (P.byteLength/n8r)-1;
            while ((deg>0)&&(Fr.isZero(p.slice(deg*n8r, deg*n8r+n8r)))) deg--;
            return deg;
        }

        function printPol(P) {
            const n=(P.byteLength/n8r);
            console.log("[");
            for (let i=0; i<n; i++) {
                console.log(Fr.toString(P.slice(i*n8r, i*n8r+n8r)));
            }
            console.log("]");
        }
        */

        if (logger) logger.debug("phse3: Reading QM4");    
        const QM4 = new BigBuffer(zkey.domainSize*4*n8r);
        await fdZKey.readToBuffer(QM4, 0 , zkey.domainSize*n8r*4, sectionsZKey[7][0].p + zkey.domainSize*n8r);

        if (logger) logger.debug("phse3: Reading QL4");    
        const QL4 = new BigBuffer(zkey.domainSize*4*n8r);
        await fdZKey.readToBuffer(QL4, 0 , zkey.domainSize*n8r*4, sectionsZKey[8][0].p + zkey.domainSize*n8r);

        if (logger) logger.debug("phse3: Reading QR4");    
        const QR4 = new BigBuffer(zkey.domainSize*4*n8r);
        await fdZKey.readToBuffer(QR4, 0 , zkey.domainSize*n8r*4, sectionsZKey[9][0].p + zkey.domainSize*n8r);

        if (logger) logger.debug("phse3: Reading QO4");    
        const QO4 = new BigBuffer(zkey.domainSize*4*n8r);
        await fdZKey.readToBuffer(QO4, 0 , zkey.domainSize*n8r*4, sectionsZKey[10][0].p + zkey.domainSize*n8r);

        if (logger) logger.debug("phse3: Reading QC4");    
        const QC4 = new BigBuffer(zkey.domainSize*4*n8r);
        await fdZKey.readToBuffer(QC4, 0 , zkey.domainSize*n8r*4, sectionsZKey[11][0].p + zkey.domainSize*n8r);

        const lPols = await binFileUtils.readSection(fdZKey, sectionsZKey, 13);

        const transcript3 = new Uint8Array(G1.F.n8*2);
        G1.toRprUncompressed(transcript3, 0, proof.Z);

        ch.alpha = hashToFr(transcript3);

        if (logger) logger.debug("alpha: " + Fr.toString(ch.alpha));    


        const Z1 = [
            Fr.zero,
            Fr.add(Fr.e(-1), Fr.w[2]),
            Fr.e(-2),
            Fr.sub(Fr.e(-1), Fr.w[2]),
        ];

        const Z2 = [
            Fr.zero,
            Fr.add(Fr.zero, Fr.mul(Fr.e(-2), Fr.w[2])),
            Fr.e(4),
            Fr.sub(Fr.zero, Fr.mul(Fr.e(-2), Fr.w[2])),
        ];

        const Z3 = [
            Fr.zero,
            Fr.add(Fr.e(2), Fr.mul(Fr.e(2), Fr.w[2])),
            Fr.e(-8),
            Fr.sub(Fr.e(2), Fr.mul(Fr.e(2), Fr.w[2])),
        ];

        const T = new BigBuffer(zkey.domainSize*4*n8r);
        const Tz = new BigBuffer(zkey.domainSize*4*n8r);

        let w = Fr.one;
        for (let i=0; i<zkey.domainSize*4; i++) {
            if ((i%4096 == 0)&&(logger)) logger.debug(`calculating t ${i}/${zkey.domainSize*4}`);

            const a = A4.slice(i*n8r, i*n8r+n8r);
            const b = B4.slice(i*n8r, i*n8r+n8r);
            const c = C4.slice(i*n8r, i*n8r+n8r);
            const z = Z4.slice(i*n8r, i*n8r+n8r);
            const zw = Z4.slice(((i+zkey.domainSize*4+4)%(zkey.domainSize*4)) *n8r, ((i+zkey.domainSize*4+4)%(zkey.domainSize*4)) *n8r +n8r);
            const qm = QM4.slice(i*n8r, i*n8r+n8r);
            const ql = QL4.slice(i*n8r, i*n8r+n8r);
            const qr = QR4.slice(i*n8r, i*n8r+n8r);
            const qo = QO4.slice(i*n8r, i*n8r+n8r);
            const qc = QC4.slice(i*n8r, i*n8r+n8r);
            const s1 = sigmaBuff.slice(i*n8r, i*n8r+n8r);
            const s2 = sigmaBuff.slice((i+zkey.domainSize*4)*n8r, (i+zkey.domainSize*4)*n8r+n8r);
            const s3 = sigmaBuff.slice((i+zkey.domainSize*8)*n8r, (i+zkey.domainSize*8)*n8r+n8r);
            const ap = Fr.add(ch.b[2], Fr.mul(ch.b[1], w));
            const bp = Fr.add(ch.b[4], Fr.mul(ch.b[3], w));
            const cp = Fr.add(ch.b[6], Fr.mul(ch.b[5], w));
            const w2 = Fr.square(w);
            const zp = Fr.add(Fr.add(Fr.mul(ch.b[7], w2), Fr.mul(ch.b[8], w)), ch.b[9]);
            const wW = Fr.mul(w, Fr.w[zkey.power]);
            const wW2 = Fr.square(wW);
            const zWp = Fr.add(Fr.add(Fr.mul(ch.b[7], wW2), Fr.mul(ch.b[8], wW)), ch.b[9]);

            let pl = Fr.zero;
            for (let j=0; j<zkey.nPublic; j++) {
                pl = Fr.sub(pl, Fr.mul( 
                    lPols.slice( (j*5*zkey.domainSize+ zkey.domainSize+ i)*n8r, (j*5*zkey.domainSize+ zkey.domainSize + i+1)*n8r),
                    A.slice(j*n8r, (j+1)*n8r)
                ));
            }

            let [e1, e1z] = mul2(a, b, ap, bp, i%4);
            e1 = Fr.mul(e1, qm);
            e1z = Fr.mul(e1z, qm);

            e1 = Fr.add(e1, Fr.mul(a, ql));
            e1z = Fr.add(e1z, Fr.mul(ap, ql));

            e1 = Fr.add(e1, Fr.mul(b, qr));
            e1z = Fr.add(e1z, Fr.mul(bp, qr));

            e1 = Fr.add(e1, Fr.mul(c, qo));
            e1z = Fr.add(e1z, Fr.mul(cp, qo));

            e1 = Fr.add(e1, pl);
            e1 = Fr.add(e1, qc);

            const betaw = Fr.mul(ch.beta, w);
            let e2a =a;
            e2a = Fr.add(e2a, betaw);
            e2a = Fr.add(e2a, ch.gamma);

            let e2b =b;
            e2b = Fr.add(e2b, Fr.mul(betaw, zkey.k1));
            e2b = Fr.add(e2b, ch.gamma);

            let e2c =c;
            e2c = Fr.add(e2c, Fr.mul(betaw, zkey.k2));
            e2c = Fr.add(e2c, ch.gamma);

            let e2d = z;

            let [e2, e2z] = mul4(e2a, e2b, e2c, e2d, ap, bp, cp, zp, i%4);
            e2 = Fr.mul(e2, ch.alpha);
            e2z = Fr.mul(e2z, ch.alpha);

            let e3a = a;
            e3a = Fr.add(e3a, Fr.mul(ch.beta, s1));
            e3a = Fr.add(e3a, ch.gamma);

            let e3b = b;
            e3b = Fr.add(e3b, Fr.mul(ch.beta,s2));
            e3b = Fr.add(e3b, ch.gamma);

            let e3c = c;
            e3c = Fr.add(e3c, Fr.mul(ch.beta,s3));
            e3c = Fr.add(e3c, ch.gamma);

            let e3d = zw;
            let [e3, e3z] = mul4(e3a, e3b, e3c, e3d, ap, bp, cp, zWp, i%4);

            e3 = Fr.mul(e3, ch.alpha);
            e3z = Fr.mul(e3z, ch.alpha);

            let e4 = Fr.sub(z, Fr.one);
            e4 = Fr.mul(e4, lPols.slice( (zkey.domainSize + i)*n8r, (zkey.domainSize+i+1)*n8r));
            e4 = Fr.mul(e4, Fr.mul(ch.alpha, ch.alpha));

            let e4z = Fr.mul(zp, lPols.slice( (zkey.domainSize + i)*n8r, (zkey.domainSize+i+1)*n8r));
            e4z = Fr.mul(e4z, Fr.mul(ch.alpha, ch.alpha));

            let e = Fr.add(Fr.sub(Fr.add(e1, e2), e3), e4);
            let ez = Fr.add(Fr.sub(Fr.add(e1z, e2z), e3z), e4z);

            T.set(e, i*n8r);
            Tz.set(ez, i*n8r);

            w = Fr.mul(w, Fr.w[zkey.power+2]);
        }

        if (logger) logger.debug("ifft T");    
        let t = await Fr.ifft(T);

        if (logger) logger.debug("dividing T/Z");    
        for (let i=0; i<zkey.domainSize; i++) {
            t.set(Fr.neg(t.slice(i*n8r, i*n8r+n8r)), i*n8r);
        }

        for (let i=zkey.domainSize; i<zkey.domainSize*4; i++) {
            const a = Fr.sub(
                t.slice((i-zkey.domainSize)*n8r, (i-zkey.domainSize)*n8r + n8r),
                t.slice(i*n8r, i*n8r+n8r)
            );
            t.set(a, i*n8r);
            if (i > (zkey.domainSize*3 -4) ) {
                if (!Fr.isZero(a)) {
                    throw new Error("T Polynomial is not divisible");
                }
            }
        }

        if (logger) logger.debug("ifft Tz");    
        const tz = await Fr.ifft(Tz);
        for (let i=0; i<zkey.domainSize*4; i++) {
            const a = tz.slice(i*n8r, (i+1)*n8r);
            if (i > (zkey.domainSize*3 +5) ) {
                if (!Fr.isZero(a)) {
                    throw new Error("Tz Polynomial is not well calculated");
                }
            } else {
                t.set(  
                    Fr.add(
                        t.slice(i*n8r, (i+1)*n8r),
                        a
                    ),
                    i*n8r
                );
            }
        }

        pol_t = t.slice(0, (zkey.domainSize * 3 + 6) * n8r);

        // t(x) has degree 3n + 5, we are going to split t(x) into three smaller polynomials:
        // t'_low and t'_mid  with a degree < n and t'_high with a degree n+5
        // such that t(x) = t'_low(X) + X^n t'_mid(X) + X^{2n} t'_hi(X)
        // To randomize the parts we use blinding scalars b_10 and b_11 in a way that doesn't change t(X):
        // t_low(X) = t'_low(X) + b_10 X^n
        // t_mid(X) = t'_mid(X) - b_10 + b_11 X^n
        // t_high(X) = t'_high(X) - b_11
        // such that
        // t(X) = t_low(X) + X^n t_mid(X) + X^2n t_high(X)

        // compute t_low(X)
        let polTLow = new BigBuffer((zkey.domainSize + 1) * n8r);
        polTLow.set(t.slice(0, zkey.domainSize * n8r), 0);
        // Add blinding scalar b_10 as a new coefficient n
        polTLow.set(ch.b[10], zkey.domainSize * n8r);

        // compute t_mid(X)
        let polTMid = new BigBuffer((zkey.domainSize + 1) * n8r);
        polTMid.set(t.slice(zkey.domainSize * n8r, zkey.domainSize * 2 * n8r), 0);
        // Subtract blinding scalar b_10 to the lowest coefficient of t_mid
        const lowestMid = Fr.sub(polTMid.slice(0, n8r), ch.b[10]);
        polTMid.set(lowestMid, 0);
        // Add blinding scalar b_11 as a new coefficient n
        polTMid.set(ch.b[11], zkey.domainSize * n8r);

        // compute t_high(X)
        let polTHigh = new BigBuffer((zkey.domainSize + 6) * n8r);
        polTHigh.set(t.slice(zkey.domainSize * 2 * n8r, (zkey.domainSize * 3 + 6) * n8r), 0);
        //Subtract blinding scalar b_11 to the lowest coefficient of t_high
        const lowestHigh = Fr.sub(polTHigh.slice(0, n8r), ch.b[11]);
        polTHigh.set(lowestHigh, 0);

        proof.T1 = await expTau(polTLow, "multiexp T1");
        proof.T2 = await expTau(polTMid, "multiexp T2");
        proof.T3 = await expTau(polTHigh, "multiexp T3");

        function mul2(a,b, ap, bp,  p) {
            let r, rz;

            
            const a_b = Fr.mul(a,b);
            const a_bp = Fr.mul(a,bp);
            const ap_b = Fr.mul(ap,b);
            const ap_bp = Fr.mul(ap,bp);

            r = a_b;

            let a0 = Fr.add(a_bp, ap_b);

            let a1 = ap_bp;

            rz = a0;
            if (p) {
                rz = Fr.add(rz, Fr.mul(Z1[p], a1));
            }

            return [r, rz];
        }

        function mul4(a,b,c,d, ap, bp, cp, dp, p) {
            let r, rz;

            
            const a_b = Fr.mul(a,b);
            const a_bp = Fr.mul(a,bp);
            const ap_b = Fr.mul(ap,b);
            const ap_bp = Fr.mul(ap,bp);

            const c_d = Fr.mul(c,d);
            const c_dp = Fr.mul(c,dp);
            const cp_d = Fr.mul(cp,d);
            const cp_dp = Fr.mul(cp,dp);

            r = Fr.mul(a_b, c_d);

            let a0 = Fr.mul(ap_b, c_d);
            a0 = Fr.add(a0, Fr.mul(a_bp, c_d));
            a0 = Fr.add(a0, Fr.mul(a_b, cp_d));
            a0 = Fr.add(a0, Fr.mul(a_b, c_dp));

            let a1 = Fr.mul(ap_bp, c_d);
            a1 = Fr.add(a1, Fr.mul(ap_b, cp_d));
            a1 = Fr.add(a1, Fr.mul(ap_b, c_dp));
            a1 = Fr.add(a1, Fr.mul(a_bp, cp_d));
            a1 = Fr.add(a1, Fr.mul(a_bp, c_dp));
            a1 = Fr.add(a1, Fr.mul(a_b, cp_dp));

            let a2 = Fr.mul(a_bp, cp_dp);
            a2 = Fr.add(a2, Fr.mul(ap_b, cp_dp));
            a2 = Fr.add(a2, Fr.mul(ap_bp, c_dp));
            a2 = Fr.add(a2, Fr.mul(ap_bp, cp_d));

            let a3 = Fr.mul(ap_bp, cp_dp);

            rz = a0;
            if (p) {
                rz = Fr.add(rz, Fr.mul(Z1[p], a1));
                rz = Fr.add(rz, Fr.mul(Z2[p], a2));
                rz = Fr.add(rz, Fr.mul(Z3[p], a3));
            }

            return [r, rz];
        }
    }

    async function round4() {
        const pol_qm = new BigBuffer(zkey.domainSize*n8r);
        await fdZKey.readToBuffer(pol_qm, 0 , zkey.domainSize*n8r, sectionsZKey[7][0].p);

        const pol_ql = new BigBuffer(zkey.domainSize*n8r);
        await fdZKey.readToBuffer(pol_ql, 0 , zkey.domainSize*n8r, sectionsZKey[8][0].p);

        const pol_qr = new BigBuffer(zkey.domainSize*n8r);
        await fdZKey.readToBuffer(pol_qr, 0 , zkey.domainSize*n8r, sectionsZKey[9][0].p);

        const pol_qo = new BigBuffer(zkey.domainSize*n8r);
        await fdZKey.readToBuffer(pol_qo, 0 , zkey.domainSize*n8r, sectionsZKey[10][0].p);

        const pol_qc = new BigBuffer(zkey.domainSize*n8r);
        await fdZKey.readToBuffer(pol_qc, 0 , zkey.domainSize*n8r, sectionsZKey[11][0].p);

        const pol_s3 = new BigBuffer(zkey.domainSize*n8r);
        await fdZKey.readToBuffer(pol_s3, 0 , zkey.domainSize*n8r, sectionsZKey[12][0].p + 10*zkey.domainSize*n8r);

        const transcript4 = new Uint8Array(G1.F.n8*2*3);
        G1.toRprUncompressed(transcript4, 0, proof.T1);
        G1.toRprUncompressed(transcript4, G1.F.n8*2, proof.T2);
        G1.toRprUncompressed(transcript4, G1.F.n8*4, proof.T3);
        ch.xi = hashToFr(transcript4);

        if (logger) logger.debug("xi: " + Fr.toString(ch.xi));    

        proof.eval_a = evalPol(pol_a, ch.xi);
        proof.eval_b = evalPol(pol_b, ch.xi);
        proof.eval_c = evalPol(pol_c, ch.xi);
        proof.eval_s1 = evalPol(pol_s1, ch.xi);
        proof.eval_s2 = evalPol(pol_s2, ch.xi);
        proof.eval_t = evalPol(pol_t, ch.xi);
        proof.eval_zw = evalPol(pol_z, Fr.mul(ch.xi, Fr.w[zkey.power]));

        const coef_ab = Fr.mul(proof.eval_a, proof.eval_b);
        
        let e2a = proof.eval_a;
        const betaxi = Fr.mul(ch.beta, ch.xi);
        e2a = Fr.add( e2a, betaxi);
        e2a = Fr.add( e2a, ch.gamma);

        let e2b = proof.eval_b;
        e2b = Fr.add( e2b, Fr.mul(betaxi, zkey.k1));
        e2b = Fr.add( e2b, ch.gamma);

        let e2c = proof.eval_c;
        e2c = Fr.add( e2c, Fr.mul(betaxi, zkey.k2));
        e2c = Fr.add( e2c, ch.gamma);

        const e2 = Fr.mul(Fr.mul(Fr.mul(e2a, e2b), e2c), ch.alpha);

        let e3a = proof.eval_a;
        e3a = Fr.add( e3a, Fr.mul(ch.beta, proof.eval_s1));
        e3a = Fr.add( e3a, ch.gamma);

        let e3b = proof.eval_b;
        e3b = Fr.add( e3b, Fr.mul(ch.beta, proof.eval_s2));
        e3b = Fr.add( e3b, ch.gamma);

        let e3 = Fr.mul(e3a, e3b);
        e3 = Fr.mul(e3, ch.beta);
        e3 = Fr.mul(e3, proof.eval_zw);
        e3 = Fr.mul(e3, ch.alpha);

        ch.xim= ch.xi;
        for (let i=0; i<zkey.power; i++) ch.xim = Fr.mul(ch.xim, ch.xim);
        const eval_l1 = Fr.div(
            Fr.sub(ch.xim, Fr.one),
            Fr.mul(Fr.sub(ch.xi, Fr.one), Fr.e(zkey.domainSize))
        );

        const e4 = Fr.mul(eval_l1, Fr.mul(ch.alpha, ch.alpha));

        const coefs3 = e3;
        const coefz = Fr.add(e2, e4);

        pol_r = new BigBuffer((zkey.domainSize+3)*n8r);

        for (let i = 0; i<zkey.domainSize+3; i++) {
            let v = Fr.mul(coefz, pol_z.slice(i*n8r,(i+1)*n8r));
            if (i<zkey.domainSize) {
                v = Fr.add(v, Fr.mul(coef_ab, pol_qm.slice(i*n8r,(i+1)*n8r)));
                v = Fr.add(v, Fr.mul(proof.eval_a, pol_ql.slice(i*n8r,(i+1)*n8r)));
                v = Fr.add(v, Fr.mul(proof.eval_b, pol_qr.slice(i*n8r,(i+1)*n8r)));
                v = Fr.add(v, Fr.mul(proof.eval_c, pol_qo.slice(i*n8r,(i+1)*n8r)));
                v = Fr.add(v, pol_qc.slice(i*n8r,(i+1)*n8r));
                v = Fr.sub(v, Fr.mul(coefs3, pol_s3.slice(i*n8r,(i+1)*n8r)));
            }
            pol_r.set(v, i*n8r);
        }

        proof.eval_r = evalPol(pol_r, ch.xi);
    }

    async function round5() {
        const transcript5 = new Uint8Array(n8r*7);
        Fr.toRprBE(transcript5, 0, proof.eval_a);
        Fr.toRprBE(transcript5, n8r, proof.eval_b);
        Fr.toRprBE(transcript5, n8r*2, proof.eval_c);
        Fr.toRprBE(transcript5, n8r*3, proof.eval_s1);
        Fr.toRprBE(transcript5, n8r*4, proof.eval_s2);
        Fr.toRprBE(transcript5, n8r*5, proof.eval_zw);
        Fr.toRprBE(transcript5, n8r*6, proof.eval_r);
        ch.v = [];
        ch.v[1] = hashToFr(transcript5);
        if (logger) logger.debug("v: " + Fr.toString(ch.v[1]));    

        for (let i=2; i<=6; i++ ) ch.v[i] = Fr.mul(ch.v[i-1], ch.v[1]);
        
        let pol_wxi = new BigBuffer((zkey.domainSize+6)*n8r);

        const xi2m = Fr.mul(ch.xim, ch.xim);

        for (let i = 0; i < zkey.domainSize + 6; i++) {
            let w = Fr.zero;

            const polTHigh = pol_t.slice((zkey.domainSize * 2 + i) * n8r, (zkey.domainSize * 2 + i + 1) * n8r);
            w = Fr.add(w, Fr.mul(xi2m, polTHigh));

            if (i < zkey.domainSize + 3) {
                w = Fr.add(w, Fr.mul(ch.v[1], pol_r.slice(i * n8r, (i + 1) * n8r)));
            }

            if (i < zkey.domainSize + 2) {
                w = Fr.add(w, Fr.mul(ch.v[2], pol_a.slice(i * n8r, (i + 1) * n8r)));
                w = Fr.add(w, Fr.mul(ch.v[3], pol_b.slice(i * n8r, (i + 1) * n8r)));
                w = Fr.add(w, Fr.mul(ch.v[4], pol_c.slice(i * n8r, (i + 1) * n8r)));
            }

            if (i < zkey.domainSize) {
                const polTLow = pol_t.slice(i * n8r, (i + 1) * n8r);
                w = Fr.add(w, polTLow);

                const polTMid = pol_t.slice((zkey.domainSize + i) * n8r, (zkey.domainSize + i + 1) * n8r);
                w = Fr.add(w, Fr.mul(ch.xim, polTMid));

                w = Fr.add(w, Fr.mul(ch.v[5], pol_s1.slice(i * n8r, (i + 1) * n8r)));
                w = Fr.add(w, Fr.mul(ch.v[6], pol_s2.slice(i * n8r, (i + 1) * n8r)));
            }

            // b_10 and b_11 blinding scalars were applied on round 3 to randomize the polynomials t_low, t_mid, t_high
            // Subtract blinding scalar b_10 and b_11 to the lowest coefficient
            if (i === 0) {
                w = Fr.sub(w, Fr.mul(xi2m, ch.b[11]));
                w = Fr.sub(w, Fr.mul(ch.xim, ch.b[10]));
            }

            // Add blinding scalars b_10 and b_11 to the coefficient n
            if (i === zkey.domainSize) {
                w = Fr.add(w, ch.b[10]);
                w = Fr.add(w, Fr.mul(ch.xim, ch.b[11]));
            }

            pol_wxi.set(w, i * n8r);
        }

        let w0 = pol_wxi.slice(0, n8r);
        w0 = Fr.sub(w0, proof.eval_t);
        w0 = Fr.sub(w0, Fr.mul(ch.v[1], proof.eval_r));
        w0 = Fr.sub(w0, Fr.mul(ch.v[2], proof.eval_a));
        w0 = Fr.sub(w0, Fr.mul(ch.v[3], proof.eval_b));
        w0 = Fr.sub(w0, Fr.mul(ch.v[4], proof.eval_c));
        w0 = Fr.sub(w0, Fr.mul(ch.v[5], proof.eval_s1));
        w0 = Fr.sub(w0, Fr.mul(ch.v[6], proof.eval_s2));
        pol_wxi.set(w0, 0);

        pol_wxi= divPol1(pol_wxi, ch.xi);

        proof.Wxi = await expTau(pol_wxi, "multiexp Wxi");

        let pol_wxiw = new BigBuffer((zkey.domainSize+3)*n8r);
        for (let i=0; i<zkey.domainSize+3; i++) {
            const w = pol_z.slice(i*n8r, (i+1)*n8r);
            pol_wxiw.set(w, i*n8r);
        }
        w0 = pol_wxiw.slice(0, n8r);
        w0 = Fr.sub(w0, proof.eval_zw);
        pol_wxiw.set(w0, 0);

        pol_wxiw= divPol1(pol_wxiw, Fr.mul(ch.xi, Fr.w[zkey.power]));
        proof.Wxiw = await expTau(pol_wxiw, "multiexp Wxiw");
    }

    function hashToFr(transcript) {
        const v = Scalar.fromRprBE(new Uint8Array(keccak256.arrayBuffer(transcript)));
        return Fr.e(v);
    }


    function evalPol(P, x) {
        const n = P.byteLength / n8r;
        if (n == 0) return Fr.zero;
        let res = P.slice((n-1)*n8r, n*n8r);
        for (let i=n-2; i>=0; i--) {
            res = Fr.add(Fr.mul(res, x), P.slice(i*n8r, (i+1)*n8r));
        }
        return res;
    }

    function divPol1(P, d) {
        const n = P.byteLength/n8r;
        const res = new BigBuffer(n*n8r);
        res.set(Fr.zero, (n-1) *n8r);
        res.set(P.slice((n-1)*n8r, n*n8r), (n-2)*n8r);
        for (let i=n-3; i>=0; i--) {
            res.set(
                Fr.add(
                    P.slice((i+1)*n8r, (i+2)*n8r), 
                    Fr.mul(
                        d, 
                        res.slice((i+1)*n8r, (i+2)*n8r)
                    )
                ),
                i*n8r
            );
        }
        if (!Fr.eq(
            P.slice(0, n8r),
            Fr.mul(
                Fr.neg(d),
                res.slice(0, n8r)
            )
        )) {
            throw new Error("Polinomial does not divide");
        }
        return res;
    }

    async function expTau(b, name) {
        const n = b.byteLength/n8r;
        const PTauN = PTau.slice(0, n*curve.G1.F.n8*2);
        const bm = await curve.Fr.batchFromMontgomery(b);
        let res = await curve.G1.multiExpAffine(PTauN, bm, logger, name);
        res = curve.G1.toAffine(res);
        return res;
    }


    async function to4T(A, pz) {
        pz = pz || []; 
        let a = await Fr.ifft(A);
        const a4 = new BigBuffer(n8r*zkey.domainSize*4);
        a4.set(a, 0);

        const a1 = new BigBuffer(n8r*(zkey.domainSize + pz.length));
        a1.set(a, 0);
        for (let i= 0; i<pz.length; i++) {
            a1.set(
                Fr.add(
                    a1.slice((zkey.domainSize+i)*n8r, (zkey.domainSize+i+1)*n8r),
                    pz[i]
                ),
                (zkey.domainSize+i)*n8r
            );
            a1.set(
                Fr.sub(
                    a1.slice(i*n8r, (i+1)*n8r),
                    pz[i]
                ),
                i*n8r
            );
        }
        const A4 = await Fr.fft(a4);
        return [a1, A4];
    }


}




