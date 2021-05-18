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
        throw new Error("zkey file is not groth16");
    }

    if (!Scalar.eq(zkey.r,  wtns.q)) {
        throw new Error("Curve of the witness does not match the curve of the proving key");
    }

    if (wtns.nWitness != zkey.nVars -zkey.nAdditions) {
        throw new Error(`Invalid witness length. Circuit: ${zkey.nVars}, witness: ${wtns.nWitness}, ${zkey.nAdditions}`);
    }

    const curve = await getCurve(zkey.q);
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
    let pol_a,pol_b,pol_c, pol_z, pol_t, pol_r;
    let proof = {};
    if (logger) logger.debug("Reading L Points");
    const lagrangeBases = await binFileUtils.readSection(fdZKey, sectionsZKey, 14);

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

    const PTau = await binFileUtils.readSection(fdZKey, sectionsZKey, 15);


    let alpha, beta, gamma, xi;
    let xim;
    const b=[];

    await round1();
    await round2();
    await round3();
    await round4();
    await round5();


    ///////////////////////
    // Final adjustments //
    ///////////////////////

    proof.protocol = "plonk";

    await fdZKey.close();
    await fdWtns.close();

    let publicSignals = [];

    for (let i=1; i<= zkey.nPublic; i++) {
        const pub = buffWitness.slice(i*Fr.n8, i*Fr.n8+Fr.n8);
        publicSignals.push(Scalar.fromRprLE(pub));
    }

    proof.A = G1.toObject(G1.toAffine(proof.A));
    proof.B = G1.toObject(G1.toAffine(proof.B));
    proof.C = G1.toObject(G1.toAffine(proof.C));
    proof.Z = G1.toObject(G1.toAffine(proof.Z));

    proof.T1 = G1.toObject(G1.toAffine(proof.T1));
    proof.T2 = G1.toObject(G1.toAffine(proof.T2));
    proof.T3 = G1.toObject(G1.toAffine(proof.T3));

    proof.eval_a = Fr.toObject(proof.eval_a);
    proof.eval_b = Fr.toObject(proof.eval_b);
    proof.eval_c = Fr.toObject(proof.eval_c);
    proof.eval_s1 = Fr.toObject(proof.eval_s1);
    proof.eval_s2 = Fr.toObject(proof.eval_s2);
    proof.eval_zw = Fr.toObject(proof.eval_zw);
    proof.eval_t = Fr.toObject(proof.eval_t);
    proof.eval_r = Fr.toObject(proof.eval_r);

    proof.Wxi = G1.toObject(G1.toAffine(proof.Wxi));
    proof.Wxiw = G1.toObject(G1.toAffine(proof.Wxiw));

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
        const A = new BigBuffer(zkey.domainSize * n8r);
        const B = new BigBuffer(zkey.domainSize * n8r);
        const C = new BigBuffer(zkey.domainSize * n8r);

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
        for (let i=1; i<=9; i++) {
            b[i] = curve.Fr.random();
            b[i] = curve.Fr.e(i);
            // b[i] = curve.Fr.zero;
        }

        [A, B, C] = await buildABC();
                
        proof.A = await curve.G1.multiExpAffine(lagrangeBases, A, logger, "multiexp A");
        proof.B = await curve.G1.multiExpAffine(lagrangeBases, B, logger, "multiexp B");
        proof.C = await curve.G1.multiExpAffine(lagrangeBases, C, logger, "multiexp C");

        proof.A = G1.add(proof.A, G1.timesFr(zkey.XtoMplus1, b[1]));
        proof.A = G1.sub(proof.A, G1.timesFr(zkey.X, b[1]));
        proof.A = G1.add(proof.A, G1.timesFr(zkey.XtoM, b[2]));
        proof.A = G1.sub(proof.A, G1.timesFr(G1.one, b[2]));

        proof.B = G1.add(proof.B, G1.timesFr(zkey.XtoMplus1, b[3]));
        proof.B = G1.sub(proof.B, G1.timesFr(zkey.X, b[3]));
        proof.B = G1.add(proof.B, G1.timesFr(zkey.XtoM, b[4]));
        proof.B = G1.sub(proof.B, G1.timesFr(G1.one, b[4]));

        proof.C = G1.add(proof.C, G1.timesFr(zkey.XtoMplus1, b[5]));
        proof.C = G1.sub(proof.C, G1.timesFr(zkey.X, b[5]));
        proof.C = G1.add(proof.C, G1.timesFr(zkey.XtoM, b[6]));
        proof.C = G1.sub(proof.C, G1.timesFr(G1.one, b[6]));
    }

    async function round2() {

        const transcript1 = new Uint8Array(G1.F.n8*2*3);
        G1.toRprUncompressed(transcript1, 0, proof.A);
        G1.toRprUncompressed(transcript1, G1.F.n8*2, proof.B);
        G1.toRprUncompressed(transcript1, G1.F.n8*4, proof.C);

        beta = hashToFr(transcript1);
        if (logger) logger.debug("beta: " + Fr.toString(beta));
    
        const transcript2 = new Uint8Array(n8r);
        Fr.toRprBE(transcript2, 0, beta);
        gamma = hashToFr(transcript2);
        if (logger) logger.debug("gamma: " + Fr.toString(gamma));
    
        A = await Fr.batchToMontgomery(A);
        B = await Fr.batchToMontgomery(B);
        C = await Fr.batchToMontgomery(C);

        let numArr = new BigBuffer(Fr.n8*zkey.domainSize);
        let denArr = new BigBuffer(Fr.n8*zkey.domainSize);

        numArr.set(Fr.one, 0);
        denArr.set(Fr.one, 0);

        let w = Fr.one;
        for (let i=0; i<zkey.domainSize; i++) {
            let n1 = A.slice(i*n8r, (i+1)*n8r);
            n1 = Fr.add( n1, Fr.mul(beta, w) );
            n1 = Fr.add( n1, gamma );

            let n2 = B.slice(i*n8r, (i+1)*n8r);
            n2 = Fr.add( n2, Fr.mul(zkey.k1, Fr.mul(beta, w) ));
            n2 = Fr.add( n2, gamma );

            let n3 = C.slice(i*n8r, (i+1)*n8r);
            n3 = Fr.add( n3, Fr.mul(zkey.k2, Fr.mul(beta, w) ));
            n3 = Fr.add( n3, gamma );

            const num = Fr.mul(n1, Fr.mul(n2, n3));

            let d1 = A.slice(i*n8r, (i+1)*n8r);
            d1 = Fr.add(d1, Fr.mul( sigmaBuff.slice(i*n8r*4, i*n8r*4 + n8r) , beta));
            d1 = Fr.add(d1, gamma);

            let d2 = B.slice(i*n8r, (i+1)*n8r);
            d2 = Fr.add(d2, Fr.mul( sigmaBuff.slice((zkey.domainSize + i)*4*n8r, (zkey.domainSize + i)*4*n8r+n8r) , beta));
            d2 = Fr.add(d2, gamma);

            let d3 = C.slice(i*n8r, (i+1)*n8r);
            d3 = Fr.add(d3, Fr.mul( sigmaBuff.slice((zkey.domainSize*2 + i)*4*n8r, (zkey.domainSize*2 + i)*4*n8r + n8r) , beta));
            d3 = Fr.add(d3, gamma);

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

        Z = numArr.slice(0, zkey.domainSize*n8r);
        numArr = await Fr.batchFromMontgomery(numArr);

        proof.Z = await curve.G1.multiExpAffine(lagrangeBases, numArr, logger, "multiexp Z");
        
        proof.Z = G1.add(proof.Z, G1.timesFr(zkey.XtoMplus2, b[7]));
        proof.Z = G1.sub(proof.Z, G1.timesFr(zkey.Xto2, b[7]));
        proof.Z = G1.add(proof.Z, G1.timesFr(zkey.XtoMplus1, b[8]));
        proof.Z = G1.sub(proof.Z, G1.timesFr(zkey.X, b[8]));
        proof.Z = G1.add(proof.Z, G1.timesFr(zkey.XtoM, b[9]));
        proof.Z = G1.sub(proof.Z, G1.timesFr(G1.one, b[9]));
    }

    async function round3() {

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

        const QM4 = new BigBuffer(zkey.domainSize*4*n8r);
        await fdZKey.readToBuffer(QM4, 0 , zkey.domainSize*n8r*4, sectionsZKey[7][0].p + zkey.domainSize*n8r);

        const QL4 = new BigBuffer(zkey.domainSize*4*n8r);
        await fdZKey.readToBuffer(QL4, 0 , zkey.domainSize*n8r*4, sectionsZKey[8][0].p + zkey.domainSize*n8r);

        const QR4 = new BigBuffer(zkey.domainSize*4*n8r);
        await fdZKey.readToBuffer(QR4, 0 , zkey.domainSize*n8r*4, sectionsZKey[9][0].p + zkey.domainSize*n8r);

        const QO4 = new BigBuffer(zkey.domainSize*4*n8r);
        await fdZKey.readToBuffer(QO4, 0 , zkey.domainSize*n8r*4, sectionsZKey[10][0].p + zkey.domainSize*n8r);

        const QC4 = new BigBuffer(zkey.domainSize*4*n8r);
        await fdZKey.readToBuffer(QC4, 0 , zkey.domainSize*n8r*4, sectionsZKey[11][0].p + zkey.domainSize*n8r);

        const lPols = await binFileUtils.readSection(fdZKey, sectionsZKey, 13);

        const transcript3 = new Uint8Array(G1.F.n8*2);
        G1.toRprUncompressed(transcript3, 0, proof.Z);

        alpha = hashToFr(transcript3);

        if (logger) logger.debug("alpha: " + Fr.toString(alpha));    

        let A4; [pol_a, A4] = await to4T(A);
        let B4; [pol_b, B4] = await to4T(B);
        let C4; [pol_c, C4] = await to4T(C);
        let Z4; [pol_z, Z4] = await to4T(Z);

        /*
        const Zw = new BigBuffer(zkey.domainSize*4*n8r);
        for (let i=0; i<zkey.domainSize*4; i++) {
            Zw.set(
                Z4.slice(((i+zkey.domainSize*4+4)%(zkey.domainSize*4)) *n8r, ((i+zkey.domainSize*4+4)%(zkey.domainSize*4)) *n8r +n8r),
                i*n8r
            );
        }

        const degZw = await checkDegree(Zw);
        printPol(Zw);
        console.log("degZw: " + degZw);
        */
        const T = new BigBuffer(zkey.domainSize*4*n8r);

        let w = Fr.one;
        for (let i=0; i<zkey.domainSize*4; i++) {
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

            let pl = Fr.zero;
            for (let j=0; j<zkey.nPublic; j++) {
                pl = Fr.sub(pl, Fr.mul( 
                    lPols.slice( (j*5*zkey.domainSize+ zkey.domainSize+ i)*n8r, (j*5*zkey.domainSize+ zkey.domainSize + i+1)*n8r),
                    A.slice(j*n8r, (j+1)*n8r)
                ));
            }

            let e1 = Fr.mul(Fr.mul(a, b), qm);
            e1 = Fr.add(e1, Fr.mul(a, ql));
            e1 = Fr.add(e1, Fr.mul(b, qr));
            e1 = Fr.add(e1, Fr.mul(c, qo));
            e1 = Fr.add(e1, pl);
            e1 = Fr.add(e1, qc);

            const betaw = Fr.mul(beta, w);
            let e2a =a;
            e2a = Fr.add(e2a, betaw);
            e2a = Fr.add(e2a, gamma);

            let e2b =b;
            e2b = Fr.add(e2b, Fr.mul(betaw, zkey.k1));
            e2b = Fr.add(e2b, gamma);

            let e2c =c;
            e2c = Fr.add(e2c, Fr.mul(betaw, zkey.k2));
            e2c = Fr.add(e2c, gamma);

            let e2 = Fr.mul(Fr.mul(e2a, e2b), e2c);
            e2 = Fr.mul(e2, z);
            e2 = Fr.mul(e2, alpha);

            let e3a = a;
            e3a = Fr.add(e3a, Fr.mul(beta, s1));
            e3a = Fr.add(e3a, gamma);

            let e3b = b;
            e3b = Fr.add(e3b, Fr.mul(beta,s2));
            e3b = Fr.add(e3b, gamma);

            let e3c = c;
            e3c = Fr.add(e3c, Fr.mul(beta,s3));
            e3c = Fr.add(e3c, gamma);

            let e3 = Fr.mul(Fr.mul(e3a, e3b), e3c);
            e3 = Fr.mul(e3, zw);
            e3 = Fr.mul(e3, alpha);

            let e4 = Fr.sub(z, Fr.one);
            e4 = Fr.mul(e4, lPols.slice( (zkey.domainSize + i)*n8r, (zkey.domainSize+i+1)*n8r));
            e4 = Fr.mul(e4, Fr.mul(alpha, alpha));

            let e = Fr.add(Fr.sub(Fr.add(e1, e2), e3), e4);

            T.set(e, i*n8r);

            w = Fr.mul(w, Fr.w[zkey.power+2]);
        }

        printPol(T);

        let t = await Fr.ifft(T);

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

        pol_t = t.slice(0, (zkey.domainSize*3)*n8r);

        t = await Fr.batchFromMontgomery(t);

        proof.T1 = await curve.G1.multiExpAffine(PTau, t.slice(0, zkey.domainSize*n8r), logger, "multiexp T1");
        proof.T2 = await curve.G1.multiExpAffine(PTau, t.slice(zkey.domainSize*n8r, zkey.domainSize*2*n8r), logger, "multiexp T2");
        proof.T3 = await curve.G1.multiExpAffine(PTau, t.slice(zkey.domainSize*2*n8r, (zkey.domainSize*3)*n8r), logger, "multiexp T3");


        async function to4T(A) {
            const a = await Fr.ifft(A);
            const a4 = new BigBuffer(n8r*zkey.domainSize*4);
            a4.set(a, 0);
            const A4 = await Fr.fft(a4);
            return [a, A4];
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
        xi = hashToFr(transcript4);

        if (logger) logger.debug("xi: " + Fr.toString(xi));    

        proof.eval_a = evalPol(pol_a, xi);
        proof.eval_b = evalPol(pol_b, xi);
        proof.eval_c = evalPol(pol_c, xi);
        proof.eval_s1 = evalPol(pol_s1, xi);
        proof.eval_s2 = evalPol(pol_s2, xi);
        proof.eval_t = evalPol(pol_t, xi);
        proof.eval_zw = evalPol(pol_z, Fr.mul(xi, Fr.w[zkey.power]));

        const coef_ab = Fr.mul(proof.eval_a, proof.eval_b);
        
        let e2a = proof.eval_a;
        const betaxi = Fr.mul(beta, xi);
        e2a = Fr.add( e2a, betaxi);
        e2a = Fr.add( e2a, gamma);

        let e2b = proof.eval_b;
        e2b = Fr.add( e2b, Fr.mul(betaxi, zkey.k1));
        e2b = Fr.add( e2b, gamma);

        let e2c = proof.eval_c;
        e2c = Fr.add( e2c, Fr.mul(betaxi, zkey.k2));
        e2c = Fr.add( e2c, gamma);

        const e2 = Fr.mul(Fr.mul(Fr.mul(e2a, e2b), e2c), alpha);

        let e3a = proof.eval_a;
        e3a = Fr.add( e3a, Fr.mul(beta, proof.eval_s1));
        e3a = Fr.add( e3a, gamma);

        let e3b = proof.eval_b;
        e3b = Fr.add( e3b, Fr.mul(beta, proof.eval_s2));
        e3b = Fr.add( e3b, gamma);

        let e3 = Fr.mul(e3a, e3b);
        e3 = Fr.mul(e3, beta);
        e3 = Fr.mul(e3, proof.eval_zw);
        e3 = Fr.mul(e3, alpha);

        xim= xi;
        for (let i=0; i<zkey.power; i++) xim = Fr.mul(xim, xim);
        const eval_l1 = Fr.div(
            Fr.sub(xim, Fr.one),
            Fr.mul(Fr.sub(xi, Fr.one), Fr.e(zkey.domainSize))
        );

        const e4 = Fr.mul(eval_l1, Fr.mul(alpha, alpha));

        const coefs3 = e3;
        const coefz = Fr.add(e2, e4);

        pol_r = new BigBuffer(zkey.domainSize*n8r);

        for (let i = 0; i<zkey.domainSize; i++) {
            let v = Fr.mul(coef_ab, pol_qm.slice(i*n8r,(i+1)*n8r));
            v = Fr.add(v, Fr.mul(proof.eval_a, pol_ql.slice(i*n8r,(i+1)*n8r)));
            v = Fr.add(v, Fr.mul(proof.eval_b, pol_qr.slice(i*n8r,(i+1)*n8r)));
            v = Fr.add(v, Fr.mul(proof.eval_c, pol_qo.slice(i*n8r,(i+1)*n8r)));
            v = Fr.add(v, pol_qc.slice(i*n8r,(i+1)*n8r));
            v = Fr.add(v, Fr.mul(coefz, pol_z.slice(i*n8r,(i+1)*n8r)));
            v = Fr.sub(v, Fr.mul(coefs3, pol_s3.slice(i*n8r,(i+1)*n8r)));
            pol_r.set(v, i*n8r);
        }

        proof.eval_r = evalPol(pol_r, xi);
    }

    async function round5() {
        const transcript5 = new Uint8Array(n8r*8);
        Fr.toRprBE(transcript5, 0, proof.eval_a);
        Fr.toRprBE(transcript5, n8r, proof.eval_b);
        Fr.toRprBE(transcript5, n8r*2, proof.eval_c);
        Fr.toRprBE(transcript5, n8r*3, proof.eval_s1);
        Fr.toRprBE(transcript5, n8r*4, proof.eval_s2);
        Fr.toRprBE(transcript5, n8r*5, proof.eval_zw);
        Fr.toRprBE(transcript5, n8r*6, proof.eval_t);
        Fr.toRprBE(transcript5, n8r*7, proof.eval_r);
        const v = [];
        v[1] = hashToFr(transcript5);
        if (logger) logger.debug("v: " + Fr.toString(v[1]));    

        for (let i=2; i<=6; i++ ) v[i] = Fr.mul(v[i-1], v[1]);

        // TODO DELETE
        // v[1] = Fr.zero;
        // v[2] = Fr.zero;
        // v[3] = Fr.zero; 
        // v[4] = Fr.zero; 
        // v[5] = Fr.zero; 
        // v[6] = Fr.zero; 

        let pol_wxi = new BigBuffer(zkey.domainSize*n8r);

        const xi2m = Fr.mul(xim, xim);

        for (let i=0; i<zkey.domainSize; i++) {
            let w = Fr.zero;
            w = Fr.add(w, pol_t.slice(i*n8r, (i+1)*n8r));
            w = Fr.add(w, Fr.mul(xim,  pol_t.slice( (zkey.domainSize+i)*n8r, (zkey.domainSize+i+1)*n8r )));
            w = Fr.add(w, Fr.mul(xi2m,  pol_t.slice( (zkey.domainSize*2+i)*n8r, (zkey.domainSize*2+i+1)*n8r )));

            w = Fr.add(w, Fr.mul(v[1],  pol_r.slice(i*n8r, (i+1)*n8r)));
            w = Fr.add(w, Fr.mul(v[2],  pol_a.slice(i*n8r, (i+1)*n8r)));
            w = Fr.add(w, Fr.mul(v[3],  pol_b.slice(i*n8r, (i+1)*n8r)));
            w = Fr.add(w, Fr.mul(v[4],  pol_c.slice(i*n8r, (i+1)*n8r)));
            w = Fr.add(w, Fr.mul(v[5],  pol_s1.slice(i*n8r, (i+1)*n8r)));
            w = Fr.add(w, Fr.mul(v[6],  pol_s2.slice(i*n8r, (i+1)*n8r)));
            
            pol_wxi.set(w, i*n8r);
        }
        let w0 = pol_wxi.slice(0, n8r);
        w0 = Fr.sub(w0, proof.eval_t);
        w0 = Fr.sub(w0, Fr.mul(v[1], proof.eval_r));
        w0 = Fr.sub(w0, Fr.mul(v[2], proof.eval_a));
        w0 = Fr.sub(w0, Fr.mul(v[3], proof.eval_b));
        w0 = Fr.sub(w0, Fr.mul(v[4], proof.eval_c));
        w0 = Fr.sub(w0, Fr.mul(v[5], proof.eval_s1));
        w0 = Fr.sub(w0, Fr.mul(v[6], proof.eval_s2));
        pol_wxi.set(w0, 0);

        pol_wxi= divPol1(pol_wxi, xi);
        pol_wxi = await Fr.batchFromMontgomery(pol_wxi);
        proof.Wxi = await curve.G1.multiExpAffine(PTau, pol_wxi, logger, "multiexp Wxi");

        let pol_wxiw = new BigBuffer(zkey.domainSize*n8r);
        for (let i=0; i<zkey.domainSize; i++) {
            const w = pol_z.slice(i*n8r, (i+1)*n8r);
            pol_wxiw.set(w, i*n8r);
        }
        w0 = pol_wxiw.slice(0, n8r);
        w0 = Fr.sub(w0, proof.eval_zw);
        pol_wxiw.set(w0, 0);


        pol_wxiw= divPol1(pol_wxiw, Fr.mul(xi, Fr.w[zkey.power]));
        pol_wxiw = await Fr.batchFromMontgomery(pol_wxiw);
        proof.Wxiw = await curve.G1.multiExpAffine(PTau, pol_wxiw, logger, "multiexp Wxiw");

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
}




