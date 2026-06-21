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

import * as binFileUtils from "@iden3/binfileutils";
import * as zkeyUtils from "./zkey_utils.js";
import * as wtnsUtils from "./wtns_utils.js";
import { log2 } from "./misc.js";
import { Scalar, utils, BigBuffer } from "ffjavascript";
const {stringifyBigInts} = utils;

export default async function groth16Prove(zkeyFileName, witnessFileName, logger, options) {

    if (logger) monitorMemoryUsage(logger, 50);
    const {fd: fdWtns, sections: sectionsWtns} = await binFileUtils.readBinFile(witnessFileName, "wtns", 2, 1<<25, 1<<23);

    const wtns = await wtnsUtils.readHeader(fdWtns, sectionsWtns);

    const {fd: fdZKey, sections: sectionsZKey} = await binFileUtils.readBinFile(zkeyFileName, "zkey", 2, 1<<25, 1<<23);

    const zkey = await zkeyUtils.readHeader(fdZKey, sectionsZKey, undefined, options);

    if (zkey.protocol != "groth16") {
        throw new Error("zkey file is not groth16");
    }

    if (!Scalar.eq(zkey.r,  wtns.q)) {
        throw new Error("Curve of the witness does not match the curve of the proving key");
    }

    if (wtns.nWitness != zkey.nVars) {
        throw new Error(`Invalid witness length. Circuit: ${zkey.nVars}, witness: ${wtns.nWitness}`);
    }

    const curve = zkey.curve;
    const Fr = curve.Fr;
    const G1 = curve.G1;
    const G2 = curve.G2;

    const power = log2(zkey.domainSize);

    if (logger) logger.debug("Reading Wtns");
    const buffWitness = await binFileUtils.readSection(fdWtns, sectionsWtns, 2);

    let resH;
    let resHPromise;
    let buffPodd_T;

    let abcPromise = (async function (){
        let buffA_T, buffB_T, buffC_T;

        await (async function (){
            if (logger) logger.debug("Reading Coeffs");
            console.time("buildABC_outer");
            const buffCoeffs = await binFileUtils.readSection(fdZKey, sectionsZKey, 4);

            if (logger) logger.debug("Building ABC");

            options = options || {};

            if (options.buildABC === "js") {
                [buffA_T, buffB_T, buffC_T] = await buildABC1(curve, zkey, buffWitness, buffCoeffs, logger);
            } else if (options.buildABC === "wasm") {
                [buffA_T, buffB_T, buffC_T] = await buildABC(curve, zkey, buffWitness, buffCoeffs, logger);
            } else if (options.buildABC === "wasm1") {
                [buffA_T, buffB_T, buffC_T] = await buildABCWASM1(curve, zkey, buffWitness, buffCoeffs, logger);
            } else {
                // buildABCWASM1 is single-threaded but single-pass (faster when it fits).
                // It loads ALL coefficients + witness into one worker's WASM memory, so it
                // is only safe when that total fits within the WASM 32-bit address space (~3 GB).
                // buildABC (multi-threaded) handles any size safely via sequential outer batches.
                const witnessCopyCost = buffWitness.byteLength * curve.tm.concurrency;
                const wasm1MemCost = buffCoeffs.byteLength + buffWitness.byteLength
                    + 3 * zkey.domainSize * curve.Fr.n8;
                const WASM_SAFE_LIMIT = 3 * 1024 * 1024 * 1024;
                if (witnessCopyCost > 512 * 1024 * 1024 && wasm1MemCost < WASM_SAFE_LIMIT) {
                    if (logger) logger.debug(`buildABC: witness*concurrency=${Math.round(witnessCopyCost/1024/1024)}MB, wasm1 mem=${Math.round(wasm1MemCost/1024/1024)}MB, using single-threaded WASM`);
                    [buffA_T, buffB_T, buffC_T] = await buildABCWASM1(curve, zkey, buffWitness, buffCoeffs, logger);
                } else {
                    [buffA_T, buffB_T, buffC_T] = await buildABC(curve, zkey, buffWitness, buffCoeffs, logger);
                }
            }
            console.timeEnd("buildABC_outer");
        })();

        console.time("abcPromise");

        // Do not call gc() here. gc() is a stop-the-world pause that blocks the
        // Node.js event loop. If the pause exceeds the worker idle-termination
        // timeout (1s), a worker closes its port while the main thread is blocked,
        // and the next task dispatched to it is silently dropped → hang. The
        // coefficients buffer goes out of scope at the end of the inner IIFE above
        // and is reclaimed by V8's incremental GC automatically.

        const inc = power === Fr.s ? curve.Fr.shift : curve.Fr.w[power+1];

        let buffAodd_T, buffBodd_T, buffCodd_T;
        await Promise.all([
            (async function () {
                let buffA = await Fr.ifft(buffA_T, "", "", logger, "IFFT_A");
                buffA_T = null;
                const buffAodd = await Fr.batchApplyKey(buffA, Fr.e(1), inc);
                buffAodd_T = await Fr.fft(buffAodd, "", "", logger, "FFT_A");
            })(),
            (async function () {
                let buffB = await Fr.ifft(buffB_T, "", "", logger, "IFFT_B");
                buffB_T = null;
                const buffBodd = await Fr.batchApplyKey(buffB, Fr.e(1), inc);
                buffBodd_T = await Fr.fft(buffBodd, "", "", logger, "FFT_B");
            })(),
            (async function () {
                let buffC = await Fr.ifft(buffC_T, "", "", logger, "IFFT_C");
                buffC_T = null;
                const buffCodd = await Fr.batchApplyKey(buffC, Fr.e(1), inc);
                buffCodd_T = await Fr.fft(buffCodd, "", "", logger, "FFT_C");
            })(),
        ]);

        if (logger) logger.debug("Join ABC");
        buffPodd_T = await joinABC(curve, zkey, buffAodd_T, buffBodd_T, buffCodd_T, logger);
        if (logger) logger.debug("Join ABC finished");
        buffAodd_T = null;
        buffBodd_T = null;
        buffCodd_T = null;

        if (globalThis.gc) {globalThis.gc();}
        console.timeEnd("abcPromise");
    })();
    //await abcPromise;

    let proof = {};

    async function calcPiA(){
        if (logger) logger.debug("Reading A Points");
        const buffBasesA = await binFileUtils.readSection(fdZKey, sectionsZKey, 5);
        console.time("Calculate PiA");
        proof.pi_a = await curve.G1.multiExpAffine(buffBasesA, buffWitness, logger, "multiexp A");
        console.timeEnd("Calculate PiA");
    }

    let piaPromise = calcPiA();
    //await piaPromise;

    let pib1;

    async function calcPiB1() {
        if (logger) logger.debug("Reading B1 Points");
        const buffBasesB1 = await binFileUtils.readSection(fdZKey, sectionsZKey, 6);
        console.time("Calculate PiB1");
        pib1 = await curve.G1.multiExpAffine(buffBasesB1, buffWitness, logger, "multiexp B1");
        console.timeEnd("Calculate PiB1");
    }

    let pib1Promise = calcPiB1();
    //await pib1Promise;

    async function calcPiB() {
        if (logger) logger.debug("Reading B2 Points");
        const buffBasesB2 = await binFileUtils.readSection(fdZKey, sectionsZKey, 7);
        console.time("Calculate PiB");
        proof.pi_b = await curve.G2.multiExpAffine(buffBasesB2, buffWitness, logger, "multiexp B2");
        console.timeEnd("Calculate PiB");
    }

    let pibPromise = calcPiB();
    //await pibPromise;

    let picPromise = (async function (){
        if (logger) logger.debug("Reading C Points");
        const buffBasesC = await binFileUtils.readSection(fdZKey, sectionsZKey, 8);
        console.time("Calculate PiC");
        proof.pi_c = await curve.G1.multiExpAffine(buffBasesC, buffWitness.slice((zkey.nPublic+1)*curve.Fr.n8), logger, "multiexp C");
        console.timeEnd("Calculate PiC");
    })();
    //await picPromise;

    resHPromise = (async function (){
        if (logger) logger.debug("Reading H Points");
        await abcPromise;
        console.time("resHPromise");
        const buffBasesH = await binFileUtils.readSection(fdZKey, sectionsZKey, 9);
        resH = await curve.G1.multiExpAffine(buffBasesH, buffPodd_T, logger, "multiexp H");
        console.timeEnd("resHPromise");
    })();
    //await resHPromise;


    const r = curve.Fr.random();
    const s = curve.Fr.random();

    await piaPromise;
    proof.pi_a  = G1.add( proof.pi_a, zkey.vk_alpha_1 );
    proof.pi_a  = G1.add( proof.pi_a, G1.timesFr( zkey.vk_delta_1, r ));

    await pibPromise;
    proof.pi_b  = G2.add( proof.pi_b, zkey.vk_beta_2 );
    proof.pi_b  = G2.add( proof.pi_b, G2.timesFr( zkey.vk_delta_2, s ));

    await pib1Promise;
    pib1 = G1.add( pib1, zkey.vk_beta_1 );
    pib1 = G1.add( pib1, G1.timesFr( zkey.vk_delta_1, s ));

    await Promise.all([picPromise, resHPromise]);
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
    proof.curve = curve.name;

    await fdZKey.close();
    await fdWtns.close();

    proof = stringifyBigInts(proof);
    publicSignals = stringifyBigInts(publicSignals);

    return {proof, publicSignals};
}


async function buildABC1(curve, zkey, witness, coeffs, logger) {
    console.time("buildABC1");
    const n8 = curve.Fr.n8;
    const sCoef = 4*3 + zkey.n8r;
    const nCoef = (coeffs.byteLength-4) / sCoef;

    const outBuffA = new BigBuffer(zkey.domainSize * n8);
    const outBuffB = new BigBuffer(zkey.domainSize * n8);
    const outBuffC = new BigBuffer(zkey.domainSize * n8);

    const outBuf = [ outBuffA, outBuffB ];
    for (let i=0; i<nCoef; i++) {
        if ((logger)&&(i%1000000 == 0)) logger.debug(`QAP AB: ${i}/${nCoef}`);

        let buffCoefV, coef;
        if (coeffs.buffer) {
            // if we have direct access to array buffer, then we can create zero-copy views
            const coeffOffset = 4 + i * sCoef;
            buffCoefV = new DataView(coeffs.buffer, coeffs.byteOffset + coeffOffset, sCoef);
            coef = new Uint8Array(coeffs.buffer, coeffs.byteOffset + coeffOffset + 12, n8);
        } else {
            // coeffs is a BigBuffer and we need to copy the slice
            const buffCoef = coeffs.slice(4+i*sCoef, 4+i*sCoef+sCoef);
            buffCoefV = new DataView(buffCoef.buffer);
            coef = buffCoef.slice(12, 12+n8);
        }
        const m = buffCoefV.getUint32(0, true);
        const c = buffCoefV.getUint32(4, true);
        const s = buffCoefV.getUint32(8, true);

        outBuf[m].set(
            curve.Fr.add(
                outBuf[m].slice(c*n8, c*n8+n8),
                curve.Fr.mul(coef, witness.slice(s*n8, s*n8+n8))
            ),
            c*n8
        );

        if (i%1000000 == 0 && logger) memUsage(logger);
    }

    for (let i=0; i<zkey.domainSize; i++) {
        if ((logger)&&(i%1000000 == 0)) logger.debug(`QAP C: ${i}/${zkey.domainSize}`);
        outBuffC.set(
            curve.Fr.mul(
                outBuffA.slice(i*n8, i*n8+n8),
                outBuffB.slice(i*n8, i*n8+n8),
            ),
            i*n8
        );
    }

    console.timeEnd("buildABC1");

    return [outBuffA, outBuffB, outBuffC];

}


async function buildABC(curve, zkey, witness, coeffs, logger) {
    console.time("buildABC");
    let concurrency = curve.tm.concurrency;
    const sCoef = 4*3 + zkey.n8r;

    let getUint32;

    if (coeffs instanceof BigBuffer) {
        const coeffsDV = [];
        const PAGE_LEN = coeffs.buffers[0].length;
        for (let i=0; i< coeffs.buffers.length; i++) {
            coeffsDV.push(new DataView(coeffs.buffers[i].buffer));
        }
        getUint32 = function (pos) {
            return coeffsDV[Math.floor(pos/PAGE_LEN)].getUint32(pos % PAGE_LEN, true);
        };
    } else {
        const coeffsDV = new DataView(coeffs.buffer, coeffs.byteOffset, coeffs.byteLength);
        getUint32 = function (pos) {
            return coeffsDV.getUint32(pos, true);
        };
    }

    let elementsPerChunk = Math.floor(zkey.domainSize/concurrency);
    while (elementsPerChunk > 2**16) {
        concurrency*=2;
        elementsPerChunk = Math.floor(zkey.domainSize/concurrency);
    }


    const cutPoints = [];
    for (let i=0; i<concurrency; i++) {
        cutPoints.push( getCutPoint( Math.floor(i*elementsPerChunk) ));
    }
    cutPoints.push(coeffs.byteLength);

    // Bound the witness slice per pass so that concurrency workers each holding a copy
    // doesn't exhaust RAM: keep total witness across workers under 512 MB.
    const safeChunkElems = Math.floor(512 * 1024 * 1024 / curve.Fr.n8 / concurrency);
    const chunkSize = Math.min(2**26, Math.max(safeChunkElems, 1));

    // Process one witness slice at a time and accumulate results incrementally.
    // This keeps intermediate result memory at O(concurrency × elementsPerChunk × 3)
    // regardless of how many outer passes are needed, avoiding OOM for large witnesses.
    let accumulated = null;

    for (let s=0 ; s<zkey.nVars ; s+= chunkSize) {
        if (logger) logger.debug(`QAP ${s}: ${s}/${zkey.nVars}`);
        const ns= Math.min(zkey.nVars-s, chunkSize );

        const batchPromises = [];
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
            task.push({cmd: "ALLOCSET", var: 1, buff: witness.slice(s*curve.Fr.n8, (s+ns)*curve.Fr.n8)});
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
                {val: n},
                {val: s},
                {val: ns}
            ]});
            task.push({cmd: "GET", out: 0, var: 2, len: n*curve.Fr.n8});
            task.push({cmd: "GET", out: 1, var: 3, len: n*curve.Fr.n8});
            task.push({cmd: "GET", out: 2, var: 4, len: n*curve.Fr.n8});
            batchPromises.push(curve.tm.queueAction(task));
        }

        const batchResult = await Promise.all(batchPromises);

        if (accumulated === null) {
            accumulated = batchResult;
        } else {
            // Add batchResult into accumulated using WASM, domain chunk by domain chunk.
            const mergePromises = [];
            for (let i=0; i<batchResult.length; i++) {
                const chunkLen = accumulated[i][0].byteLength;
                const task = [];
                task.push({cmd: "ALLOC", var: 0, len: chunkLen});
                task.push({cmd: "ALLOC", var: 1, len: chunkLen});
                for (let m=0; m<3; m++) {
                    task.push({cmd: "SET", var: 0, buff: accumulated[i][m]});
                    task.push({cmd: "SET", var: 1, buff: batchResult[i][m]});
                    task.push({cmd: "CALL", fnName: "qap_batchAdd", params:[
                        {var: 0},
                        {var: 1},
                        {val: chunkLen / curve.Fr.n8},
                        {var: 0}
                    ]});
                    task.push({cmd: "GET", out: m, var: 0, len: chunkLen});
                }
                mergePromises.push(curve.tm.queueAction(task));
            }
            accumulated = await Promise.all(mergePromises);
        }
    }

    // qap_buildABC derives C = A*B pointwise (not from independent C coefficients),
    // so batchAdd-merging C across witness passes gives Σ(A_i*B_i) ≠ (ΣA_i)*(ΣB_i).
    // Use qap_joinABC(pA, pB, pC=0, n, pP) → pP = A_total * B_total to recompute C.
    const recomputePromises = [];
    for (let i = 0; i < accumulated.length; i++) {
        const n = accumulated[i][0].byteLength / curve.Fr.n8;
        const zeroBuffer = new Uint8Array(n * curve.Fr.n8);
        const task = [];
        task.push({cmd: "ALLOCSET", var: 0, buff: accumulated[i][0]});
        task.push({cmd: "ALLOCSET", var: 1, buff: accumulated[i][1]});
        task.push({cmd: "ALLOCSET", var: 2, buff: zeroBuffer});
        task.push({cmd: "ALLOC",    var: 3, len: n * curve.Fr.n8});
        task.push({cmd: "CALL", fnName: "qap_joinABC", params: [
            {var: 0}, {var: 1}, {var: 2}, {val: n}, {var: 3}
        ]});
        task.push({cmd: "GET", out: 0, var: 3, len: n * curve.Fr.n8});
        recomputePromises.push(curve.tm.queueAction(task));
    }
    const recomputeResult = await Promise.all(recomputePromises);
    for (let i = 0; i < accumulated.length; i++) {
        accumulated[i][2] = recomputeResult[i][0];
    }

    const result = accumulated;

    const outBuffA = new BigBuffer(zkey.domainSize * curve.Fr.n8);
    const outBuffB = new BigBuffer(zkey.domainSize * curve.Fr.n8);
    const outBuffC = new BigBuffer(zkey.domainSize * curve.Fr.n8);
    let p=0;
    for (let i=0; i<result.length; i++) {
        outBuffA.set(result[i][0], p);
        outBuffB.set(result[i][1], p);
        outBuffC.set(result[i][2], p);
        p += result[i][0].byteLength;
    }

    console.timeEnd("buildABC");

    return [outBuffA, outBuffB, outBuffC];

    function getCutPoint(v) {
        let m = 0;
        let n = getUint32(0);
        while (m < n) {
            var k = Math.floor((n + m) / 2);
            const va = getUint32(4 + k*sCoef + 4);
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


// buildABCWASM1 is single-threaded implementation of buildABS using wasm
// It has much better memory usage than multithreaded wasm implementation.
// It's much faster than pure js one, but uses much more memory.
async function buildABCWASM1(curve, zkey, witness, coeffs, logger) {
    console.time("buildABCWASM1");
    const concurrency = 1;//curve.tm.concurrency;
    const sCoef = 4 * 3 + zkey.n8r;

    let getUint32;

    if (coeffs instanceof BigBuffer) {
        const coeffsDV = [];
        const PAGE_LEN = coeffs.buffers[0].length;
        for (let i = 0; i < coeffs.buffers.length; i++) {
            coeffsDV.push(new DataView(coeffs.buffers[i].buffer));
        }
        getUint32 = function (pos) {
            return coeffsDV[Math.floor(pos / PAGE_LEN)].getUint32(pos % PAGE_LEN, true);
        };
    } else {
        const coeffsDV = new DataView(coeffs.buffer, coeffs.byteOffset, coeffs.byteLength);
        getUint32 = function (pos) {
            return coeffsDV.getUint32(pos, true);
        };
    }

    const elementsPerChunk = Math.floor((zkey.domainSize - 1) / concurrency) + 1;
    const promises = [];

    const cutPoints = [];
    for (let i = 0; i < concurrency; i++) {
        cutPoints.push(getCutPoint(Math.floor(i * elementsPerChunk)));
    }
    cutPoints.push(coeffs.byteLength);

    const chunkSize = elementsPerChunk;

    for (let s = 0; s < zkey.nVars; s += chunkSize) {
        if (logger) logger.debug(`QAP: ${s}/${zkey.nVars}`);
        const ns = Math.min(zkey.nVars - s, chunkSize);
        for (let i = 0; i < concurrency; i++) {
            let n;
            if (i < concurrency - 1) {
                n = elementsPerChunk;
            } else {
                n = zkey.domainSize - i * elementsPerChunk;
            }
            if (n === 0) continue;

            const task = [];

            const coeffsBuff = coeffs.slice(cutPoints[i], cutPoints[i + 1]);
            const witnessBuff = witness.slice(s * curve.Fr.n8, (s + ns) * curve.Fr.n8);

            task.push({cmd: "ALLOCSET", var: 0, buff: coeffsBuff});
            task.push({cmd: "ALLOCSET", var: 1, buff: witnessBuff});
            task.push({cmd: "ALLOC", var: 2, len: n * curve.Fr.n8});
            task.push({cmd: "ALLOC", var: 3, len: n * curve.Fr.n8});
            task.push({cmd: "ALLOC", var: 4, len: n * curve.Fr.n8});
            task.push({
                cmd: "CALL", fnName: "qap_buildABC", params: [
                    {var: 0},
                    {val: (cutPoints[i + 1] - cutPoints[i]) / sCoef},
                    {var: 1},
                    {var: 2},
                    {var: 3},
                    {var: 4},
                    {val: i * elementsPerChunk},
                    {val: n},
                    {val: s},
                    {val: ns}
                ]
            });
            task.push({cmd: "GET", out: 0, var: 2, len: n * curve.Fr.n8});
            task.push({cmd: "GET", out: 1, var: 3, len: n * curve.Fr.n8});
            task.push({cmd: "GET", out: 2, var: 4, len: n * curve.Fr.n8});
            //task.push({cmd: "TERMINATE"}); // to free memory immediately
            //promises.push(curve.tm.queueAction(task));
            promises.push(curve.tm.queueAction(task, [coeffsBuff.buffer, witnessBuff.buffer]));
        }
    }

    let result = await Promise.all(promises);

    const nGroups = result.length / concurrency;

    let result2;
    if (nGroups > 1) {
        const promises2 = [];
        for (let i = 0; i < concurrency; i++) {
            const task = [];
            task.push({cmd: "ALLOC", var: 0, len: result[i][0].byteLength});
            task.push({cmd: "ALLOC", var: 1, len: result[i][0].byteLength});
            for (let m = 0; m < 3; m++) {
                task.push({cmd: "SET", var: 0, buff: result[i][m]});
                for (let s = 1; s < nGroups; s++) {
                    task.push({cmd: "SET", var: 1, buff: result[s * concurrency + i][m]});
                    task.push({
                        cmd: "CALL", fnName: "qap_batchAdd", params: [
                            {var: 0},
                            {var: 1},
                            {val: result[i][m].length / curve.Fr.n8},
                            {var: 0}
                        ]
                    });
                }
                task.push({cmd: "GET", out: m, var: 0, len: result[i][m].length});
            }
            promises2.push(curve.tm.queueAction(task));
        }
        result2 = await Promise.all(promises2);
        result = result2;
    }

    const outBuffA = new BigBuffer(zkey.domainSize * curve.Fr.n8);
    const outBuffB = new BigBuffer(zkey.domainSize * curve.Fr.n8);
    const outBuffC = new BigBuffer(zkey.domainSize * curve.Fr.n8);
    let p = 0;
    for (let i = 0; i < result.length; i++) {
        outBuffA.set(result[i][0], p);
        outBuffB.set(result[i][1], p);
        outBuffC.set(result[i][2], p);
        p += result[i][0].byteLength;
    }

    console.timeEnd("buildABCWASM1");

    return [outBuffA, outBuffB, outBuffC];

    function getCutPoint(v) {
        let m = 0;
        let n = getUint32(0);
        while (m < n) {
            let k = Math.floor((n + m) / 2);
            const va = getUint32(4 + k * sCoef + 4);
            if (va > v) {
                n = k - 1;
            } else if (va < v) {
                m = k + 1;
            } else {
                n = k;
            }
        }
        return 4 + m * sCoef;
    }
}


async function joinABC(curve, zkey, a, b, c, logger) {
    console.time("joinABC");
    const MAX_CHUNK_SIZE = 1 << 16;

    const n8 = curve.Fr.n8;
    const nElements = Math.floor(a.byteLength / curve.Fr.n8);

    const promises = [];

    for (let i=0; i<nElements; i += MAX_CHUNK_SIZE) {
        if (logger) logger.debug(`JoinABC: ${i}/${nElements}`);
        const n= Math.min(nElements - i, MAX_CHUNK_SIZE);

        const task = [];

        const aChunk = a.slice(i*n8, (i + n)*n8 );
        const bChunk = b.slice(i*n8, (i + n)*n8 );
        const cChunk = c.slice(i*n8, (i + n)*n8 );

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
        promises.push(curve.tm.queueAction(task, [aChunk.buffer, bChunk.buffer, cChunk.buffer]) );
    }

    const result = await Promise.all(promises);

    let outBuff;
    if (a instanceof BigBuffer) {
        outBuff = new BigBuffer(a.byteLength);
    } else {
        outBuff = new Uint8Array(a.byteLength);
    }

    let p=0;
    for (let i=0; i<result.length; i++) {
        outBuff.set(result[i][0], p);
        p += result[i][0].byteLength;
    }

    console.timeEnd("joinABC");
    return outBuff;
}

function memUsage(logger) {
    if (!logger) return;
    const used = process.memoryUsage();
    logger.debug(
        "         ",
        "\x1b[0m Heap:\x1b[32m", `${Math.round(used.heapUsed / 1024 / 1024 * 100) / 100} MB`.padEnd(12),
        "\x1b[0m / \x1b[32m", `${Math.round(used.heapTotal / 1024 / 1024 * 100) / 100} MB`.padEnd(12),
        "\x1b[0m RSS:\x1b[32m", `${Math.round(used.rss / 1024 / 1024 * 100) / 100} MB`.padEnd(12),
        "\x1b[0m External:\x1b[32m", `${Math.round(used.external / 1024 / 1024 * 100) / 100} MB`.padEnd(12),
        "\x1b[0m ArrBuffers:\x1b[32m", `${Math.round(used.arrayBuffers / 1024 / 1024 * 100) / 100} MB`.padEnd(12),
        "\x1b[0m"
    );
}

function monitorMemoryUsage(logger, interval = 5000) {
    return setInterval(() => {
        memUsage(logger);
    }, interval);
}
