import * as binFileUtils from "@iden3/binfileutils";
import * as zkeyUtils from "./zkey_utils.js";
import * as wtnsUtils from "./wtns_utils.js";
import { getCurveFromQ as getCurve } from "./curves.js";
import { log2 } from "./misc.js";
import { Scalar, utils } from "ffjavascript";
const {stringifyBigInts} = utils;

export default async function groth16Prove(zkeyFileName, witnessFileName, logger) {
    const {fd: fdWtns, sections: sectionsWtns} = await binFileUtils.readBinFile(witnessFileName, "wtns", 2);

    const wtns = await wtnsUtils.readHeader(fdWtns, sectionsWtns);

    const {fd: fdZKey, sections: sectionsZKey} = await binFileUtils.readBinFile(zkeyFileName, "zkey", 2);

    const zkey = await zkeyUtils.readHeader(fdZKey, sectionsZKey, "groth16");

    if (!Scalar.eq(zkey.r,  wtns.q)) {
        throw new Error("Curve of the witness does not match the curve of the proving key");
    }

    if (wtns.nWitness != zkey.nVars) {
        throw new Error(`Invalid witness length. Circuit: ${zkey.nVars}, witness: ${wtns.nWitness}`);
    }

    const curve = await getCurve(zkey.q);
    const Fr = curve.Fr;
    const G1 = curve.G1;
    const G2 = curve.G2;

    const power = log2(zkey.domainSize);

    const buffWitness = await binFileUtils.readFullSection(fdWtns, sectionsWtns, 2);
    const buffCoeffs = await binFileUtils.readFullSection(fdZKey, sectionsZKey, 4);
    const buffBasesA = await binFileUtils.readFullSection(fdZKey, sectionsZKey, 5);
    const buffBasesB1 = await binFileUtils.readFullSection(fdZKey, sectionsZKey, 6);
    const buffBasesB2 = await binFileUtils.readFullSection(fdZKey, sectionsZKey, 7);
    const buffBasesC = await binFileUtils.readFullSection(fdZKey, sectionsZKey, 8);
    const buffBasesH = await binFileUtils.readFullSection(fdZKey, sectionsZKey, 9);

    const [buffA_T, buffB_T, buffC_T] = await buldABC(curve, zkey, buffWitness, buffCoeffs);

    const inc = power == Fr.s ? curve.Fr.shift : curve.Fr.w[power+1];

    const buffA = await Fr.ifft(buffA_T, "", "", logger, "FFT_A");
    const buffAodd = await Fr.batchApplyKey(buffA, Fr.e(1), inc);
    const buffAodd_T = await Fr.fft(buffAodd, "", "", logger, "IFFT_A");

    const buffB = await Fr.ifft(buffB_T, "", "", logger, "FFT_B");
    const buffBodd = await Fr.batchApplyKey(buffB, Fr.e(1), inc);
    const buffBodd_T = await Fr.fft(buffBodd, "", "", logger, "IFFT_B");

    const buffC = await Fr.ifft(buffC_T, "", "", logger, "FFT_C");
    const buffCodd = await Fr.batchApplyKey(buffC, Fr.e(1), inc);
    const buffCodd_T = await Fr.fft(buffCodd, "", "", logger, "IFFT_C");

    const buffPodd_T = await joinABC(curve, zkey, buffAodd_T, buffBodd_T, buffCodd_T);

    let proof = {};

    proof.pi_a = await curve.G1.multiExpAffine(buffBasesA, buffWitness);
    let pib1 = await curve.G1.multiExpAffine(buffBasesB1, buffWitness);
    proof.pi_b = await curve.G2.multiExpAffine(buffBasesB2, buffWitness);
    proof.pi_c = await curve.G1.multiExpAffine(buffBasesC, buffWitness.slice((zkey.nPublic+1)*curve.Fr.n8));
    const resH = await curve.G1.multiExpAffine(buffBasesH, buffPodd_T);

    const r = curve.Fr.random();
    const s = curve.Fr.random();

    proof.pi_a  = G1.add( proof.pi_a, zkey.vk_alpha_1 );
    proof.pi_a  = G1.add( proof.pi_a, G1.timesFr( zkey.vk_delta_1, r ));

    proof.pi_b  = G2.add( proof.pi_b, zkey.vk_beta_2 );
    proof.pi_b  = G2.add( proof.pi_b, G2.timesFr( zkey.vk_delta_2, s ));

    pib1 = G1.add( pib1, zkey.vk_beta_1 );
    pib1 = G1.add( pib1, G1.timesFr( zkey.vk_delta_1, s ));

    proof.pi_c = G1.add(proof.pi_c, resH);


    proof.pi_c  = G1.add( proof.pi_c, G1.timesFr( proof.pi_a, s ));
    proof.pi_c  = G1.add( proof.pi_c, G1.timesFr( pib1, r ));
    proof.pi_c  = G1.add( proof.pi_c, G1.timesFr( zkey.vk_delta_1, Fr.neg(Fr.mul(r,s) )));


    let publicSignals = [];

    for (let i=1; i<= zkey.nPublic; i++) {
        const b = buffWitness.slice(i*Fr.n8, i*Fr.n8+Fr.n8);
        publicSignals.push(Scalar.fromRprLE(b));
    }

    proof.pi_a = G1.toObject(G1.toAffine(proof.pi_a));
    proof.pi_b = G2.toObject(G2.toAffine(proof.pi_b));
    proof.pi_c = G1.toObject(G1.toAffine(proof.pi_c));

    proof.protocol = "groth16";

    await fdZKey.close();
    await fdWtns.close();

    proof = stringifyBigInts(proof);
    publicSignals = stringifyBigInts(publicSignals);

    return {proof, publicSignals};
}


async function buldABC(curve, zkey, witness, coeffs) {
    const concurrency = curve.tm.concurrency;
    const sCoef = 4*3 + zkey.n8r;

    const elementsPerChunk = Math.floor(zkey.domainSize/concurrency);
    const coeffsDV = new DataView(coeffs.buffer, coeffs.byteOffset, coeffs.byteLength);
    const promises = [];

    const cutPoints = [];
    for (let i=0; i<concurrency; i++) {
        cutPoints.push( getCutPoint( Math.floor(i*elementsPerChunk) ));
    }
    cutPoints.push(coeffs.byteLength);

    for (let i=0; i<concurrency; i++) {
        let n;
        if (i< concurrency-1) {
            n = elementsPerChunk;
        } else {
            n = zkey.domainSize - i*elementsPerChunk;
        }
        if (n==0) continue;

        const task = [];

        task.push({cmd: "ALLOCSET", var: 0, buff: coeffs.slice(cutPoints[i], cutPoints[i+1])});
        task.push({cmd: "ALLOCSET", var: 1, buff: witness.slice()});
        task.push({cmd: "ALLOC", var: 2, len: n*curve.Fr.n8});
        task.push({cmd: "ALLOC", var: 3, len: n*curve.Fr.n8});
        task.push({cmd: "ALLOC", var: 4, len: n*curve.Fr.n8});
        task.push({cmd: "CALL", fnName: "qap_buildABC", params:[
            {var: 0},
            {val: (cutPoints[i+1] - cutPoints[i])/sCoef},
            {var: 1},
            {var: 2},
            {var: 3},
            {var: 4},
            {val: i*elementsPerChunk},
            {val: n}
        ]});
        task.push({cmd: "GET", out: 0, var: 2, len: n*curve.Fr.n8});
        task.push({cmd: "GET", out: 1, var: 3, len: n*curve.Fr.n8});
        task.push({cmd: "GET", out: 2, var: 4, len: n*curve.Fr.n8});
        promises.push(curve.tm.queueAction(task));
    }

    const result = await Promise.all(promises);

    const outBuffA = new Uint8Array(zkey.domainSize * curve.Fr.n8);
    const outBuffB = new Uint8Array(zkey.domainSize * curve.Fr.n8);
    const outBuffC = new Uint8Array(zkey.domainSize * curve.Fr.n8);
    let p=0;
    for (let i=0; i<result.length; i++) {
        outBuffA.set(result[i][0], p);
        outBuffB.set(result[i][1], p);
        outBuffC.set(result[i][2], p);
        p += result[i][0].byteLength;
    }

    return [outBuffA, outBuffB, outBuffC];

    function getCutPoint(v) {
        let m = 0;
        let n = coeffsDV.getUint32(0, true);
        while (m < n) {
            var k = (n + m) >> 1;
            const va = coeffsDV.getUint32(4 + k*sCoef + 4, true);
            if (va > v) {
                n = k - 1;
            } else if (va < v) {
                m = k + 1;
            } else {
                n = k;
            }
        }
        return 4 + m*sCoef;
    }
}


async function joinABC(curve, zkey, a, b, c) {
    const concurrency = curve.tm.concurrency;

    const n8 = curve.Fr.n8;
    const nElements = Math.floor(a.byteLength / curve.Fr.n8);
    const elementsPerChunk = Math.floor(nElements/concurrency);

    const promises = [];

    for (let i=0; i<concurrency; i++) {
        let n;
        if (i< concurrency-1) {
            n = elementsPerChunk;
        } else {
            n = nElements - i*elementsPerChunk;
        }
        if (n==0) continue;

        const task = [];

        const aChunk = a.slice(i*elementsPerChunk*n8, (i*elementsPerChunk + n)*n8 );
        const bChunk = b.slice(i*elementsPerChunk*n8, (i*elementsPerChunk + n)*n8 );
        const cChunk = c.slice(i*elementsPerChunk*n8, (i*elementsPerChunk + n)*n8 );

        task.push({cmd: "ALLOCSET", var: 0, buff: aChunk});
        task.push({cmd: "ALLOCSET", var: 1, buff: bChunk});
        task.push({cmd: "ALLOCSET", var: 2, buff: cChunk});
        task.push({cmd: "ALLOC", var: 3, len: n*n8});
        task.push({cmd: "CALL", fnName: "qap_joinABC", params:[
            {var: 0},
            {var: 1},
            {var: 2},
            {val: n},
            {var: 3},
        ]});
        task.push({cmd: "CALL", fnName: "frm_batchFromMontgomery", params:[
            {var: 3},
            {val: n},
            {var: 3}
        ]});
        task.push({cmd: "GET", out: 0, var: 3, len: n*n8});
        promises.push(curve.tm.queueAction(task));
    }

    const result = await Promise.all(promises);

    const outBuff = new Uint8Array(a.byteLength);
    let p=0;
    for (let i=0; i<result.length; i++) {
        outBuff.set(result[i][0], p);
        p += result[i][0].byteLength;
    }

    return outBuff;
}

