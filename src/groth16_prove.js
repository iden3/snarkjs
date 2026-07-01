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

    options = options || {};

    // MSM batching mode, threaded to every multiexp below:
    //   "auto"     (default) use the batch-affine MSM module only for
    //              cache-friendly chunk sizes (where it is measurably faster);
    //   "enabled"  always use it (best for small/medium circuits);
    //   "disabled" never use it (plain in-module multiexp; lowest memory).
    const msmBatching = options.msmBatching || "auto";
    if (msmBatching !== "auto" && msmBatching !== "enabled" && msmBatching !== "disabled") {
        throw new Error(`groth16Prove: invalid msmBatching "${msmBatching}" (expected "auto", "enabled" or "disabled")`);
    }
    const msmOpts = { batch: msmBatching };

    const power = log2(zkey.domainSize);

    if (logger) logger.debug("Reading Wtns");
    const buffWitness = await binFileUtils.readSection(fdWtns, sectionsWtns, 2);

    // Reader for a zkey section that returns an arbitrary sub-range directly from
    // disk, used to feed multiExp bases to the workers in chunks instead of
    // reading the whole (potentially hundreds of MB) section into one buffer and
    // slicing it. Bounds the bases resident in RAM to a few in-flight chunks.
    const mkSectionReader = (idSection) => {
        const start = sectionsZKey[idSection][0].p;
        const size = sectionsZKey[idSection][0].size;
        return async (off, len) => {
            if (off + len > size) throw new Error(`groth16Prove: read out of range of section ${idSection}`);
            const buff = new Uint8Array(len);
            await fdZKey.readToBuffer(buff, 0, len, start + off);
            return buff;
        };
    };

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

            if (options.buildABC === "js") {
                [buffA_T, buffB_T, buffC_T] = await buildABC1(curve, zkey, buffWitness, buffCoeffs, logger);
            } else if (options.buildABC === "wasm") {
                [buffA_T, buffB_T, buffC_T] = await buildABC(curve, zkey, buffWitness, buffCoeffs, logger);
            } else if (options.buildABC === "wasm1") {
                // wasm1 is exactly single-chunk streaming: one task, one full-witness
                // pass, all coeffs at once (kept as an explicit escape hatch).
                [buffA_T, buffB_T, buffC_T] = await buildABCStream(curve, zkey, buffWitness, buffCoeffs, logger, 1, 1);
            } else if (options.buildABC === "stream") {
                const p = pickStreamParams(curve, zkey, buffCoeffs, options);
                [buffA_T, buffB_T, buffC_T] = await buildABCStream(curve, zkey, buffWitness, buffCoeffs, logger, p.nChunks, p.maxInFlight);
            } else {
                // Default: streaming single-pass build (low, bounded worker memory +
                // tunable parallelism) whenever the witness fits one pass -- which it
                // does for all normal circuits. Only when the witness alone is too big
                // for a worker do we fall back to multi-threaded buildABC (which splits
                // the witness across passes and merges).
                const WASM_SAFE_LIMIT = 3 * 1024 * 1024 * 1024;
                const witnessBytes = buffWitness.byteLength;
                if (witnessBytes + 256 * 1024 * 1024 < WASM_SAFE_LIMIT) {
                    const p = pickStreamParams(curve, zkey, buffCoeffs, options);
                    if (logger) logger.debug(`buildABC: stream nChunks=${p.nChunks} maxInFlight=${p.maxInFlight}`);
                    [buffA_T, buffB_T, buffC_T] = await buildABCStream(curve, zkey, buffWitness, buffCoeffs, logger, p.nChunks, p.maxInFlight);
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
        // The IFFT input (buffX_T) is dropped immediately, and the FFT input
        // (buffXodd) goes out of scope right after -- so both can be consumed
        // (consume=true), skipping ffjavascript's defensive full-input copy.
        await Promise.all([
            (async function () {
                let buffA = await Fr.ifft(buffA_T, "", "", logger, "IFFT_A", true);
                buffA_T = null;
                const buffAodd = await Fr.batchApplyKey(buffA, Fr.e(1), inc);
                buffAodd_T = await Fr.fft(buffAodd, "", "", logger, "FFT_A", true);
            })(),
            (async function () {
                let buffB = await Fr.ifft(buffB_T, "", "", logger, "IFFT_B", true);
                buffB_T = null;
                const buffBodd = await Fr.batchApplyKey(buffB, Fr.e(1), inc);
                buffBodd_T = await Fr.fft(buffBodd, "", "", logger, "FFT_B", true);
            })(),
            (async function () {
                let buffC = await Fr.ifft(buffC_T, "", "", logger, "IFFT_C", true);
                buffC_T = null;
                const buffCodd = await Fr.batchApplyKey(buffC, Fr.e(1), inc);
                buffCodd_T = await Fr.fft(buffCodd, "", "", logger, "FFT_C", true);
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
        console.time("Calculate PiA");
        proof.pi_a = await curve.G1.multiExpAffineChunked(mkSectionReader(5), sectionsZKey[5][0].size, buffWitness, logger, "multiexp A", msmOpts);
        console.timeEnd("Calculate PiA");
    }

    let piaPromise = calcPiA();
    //await piaPromise;

    let pib1;

    async function calcPiB1() {
        if (logger) logger.debug("Reading B1 Points");
        console.time("Calculate PiB1");
        pib1 = await curve.G1.multiExpAffineChunked(mkSectionReader(6), sectionsZKey[6][0].size, buffWitness, logger, "multiexp B1", msmOpts);
        console.timeEnd("Calculate PiB1");
    }

    let pib1Promise = calcPiB1();
    //await pib1Promise;

    async function calcPiB() {
        if (logger) logger.debug("Reading B2 Points");
        console.time("Calculate PiB");
        proof.pi_b = await curve.G2.multiExpAffineChunked(mkSectionReader(7), sectionsZKey[7][0].size, buffWitness, logger, "multiexp B2", msmOpts);
        console.timeEnd("Calculate PiB");
    }

    let pibPromise = calcPiB();
    //await pibPromise;

    let picPromise = (async function (){
        if (logger) logger.debug("Reading C Points");
        console.time("Calculate PiC");
        proof.pi_c = await curve.G1.multiExpAffineChunked(mkSectionReader(8), sectionsZKey[8][0].size, buffWitness.slice((zkey.nPublic+1)*curve.Fr.n8), logger, "multiexp C", msmOpts);
        console.timeEnd("Calculate PiC");
    })();
    //await picPromise;

    resHPromise = (async function (){
        if (logger) logger.debug("Reading H Points");
        await abcPromise;
        console.time("resHPromise");
        resH = await curve.G1.multiExpAffineChunked(mkSectionReader(9), sectionsZKey[9][0].size, buffPodd_T, logger, "multiexp H", msmOpts);
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


// Adaptive parameters for buildABCStream, scaled to circuit size and a worker-memory
// budget. Key fact from profiling: each concurrently-active worker grows its WASM
// memory and never shrinks, so the memory buildABC leaves behind for the rest of the
// prove is ~ maxInFlight × perWorker, where perWorker = witness + (coeffs+3·domain)/nChunks.
//   - nChunks shrinks perWorker (and gives the pool chunks to load-balance);
//   - maxInFlight is then chosen to keep that persistent floor under floorBudget,
//     using as much parallelism (speed) as the budget allows (capped by concurrency).
// Small circuits get nChunks≈concurrency and high parallelism (memory is a non-issue);
// large ones get more chunks and a parallelism bounded by floorBudget.
function pickStreamParams(curve, zkey, coeffs, options) {
    options = options || {};
    const n8 = curve.Fr.n8;
    const concurrency = curve.tm.concurrency || 1;
    const witnessBytes = zkey.nVars * n8;
    const variableBytes = coeffs.byteLength + 3 * zkey.domainSize * n8;

    // Persistent worker memory buildABC may leave behind (default 256 MB; override
    // via options.buildABCFloorBudget — raise it for more parallelism/speed, lower it
    // for a smaller peak). Because each busy worker's WASM memory never shrinks, this
    // directly bounds the floor the rest of the prove inherits.
    const floorBudget = options.buildABCFloorBudget || (256 * 1024 * 1024);

    // Size each chunk so a worker holds ~2× witness (chunk variable part ≈ witness),
    // then derive parallelism from the floor budget / per-worker, and finally bump the
    // chunk count to a few per BUSY worker for load balance (NOT full concurrency --
    // that would re-copy the witness once per chunk for nothing at low parallelism).
    const targetPerChunk = Math.max(witnessBytes, 16 * 1024 * 1024);
    let nChunks = Math.max(1, Math.ceil(variableBytes / targetPerChunk));
    const perWorker = witnessBytes + Math.ceil(variableBytes / nChunks);
    let maxInFlight = Math.max(1, Math.min(concurrency, Math.floor(floorBudget / perWorker)));
    nChunks = Math.min(256, Math.max(nChunks, maxInFlight * 3));
    maxInFlight = Math.min(maxInFlight, nChunks);

    if (options.buildABCnChunks) nChunks = options.buildABCnChunks;
    if (options.buildABCmaxInFlight) maxInFlight = options.buildABCmaxInFlight;
    return { nChunks, maxInFlight };
}

// Streaming buildABC. Does a SINGLE full-witness pass (so each disjoint output
// range is computed completely -> no batchAdd/joinABC merge), and with nChunks=1
// it is exactly the old single-task "wasm1" build (which now routes here).
// It splits the domain into `nChunks` output ranges processed with bounded
// concurrency. Each in-flight task holds only the witness + one coeff chunk + one
// output chunk, so the worker high-water is ~witness + chunk instead of the whole
// coeffs (357MB) + all outputs in one worker. Requires the witness to be loaded
// per task (one full-witness pass); caller falls back to buildABC if it doesn't fit.
async function buildABCStream(curve, zkey, witness, coeffs, logger, nChunks, maxInFlight) {
    console.time("buildABCStream");
    const n8 = curve.Fr.n8;
    const sCoef = 4 * 3 + zkey.n8r;
    const nVars = zkey.nVars;
    const domainSize = zkey.domainSize;

    let getUint32;
    if (coeffs instanceof BigBuffer) {
        const coeffsDV = [];
        const PAGE_LEN = coeffs.buffers[0].length;
        for (let i = 0; i < coeffs.buffers.length; i++) coeffsDV.push(new DataView(coeffs.buffers[i].buffer));
        getUint32 = (pos) => coeffsDV[Math.floor(pos / PAGE_LEN)].getUint32(pos % PAGE_LEN, true);
    } else {
        const coeffsDV = new DataView(coeffs.buffer, coeffs.byteOffset, coeffs.byteLength);
        getUint32 = (pos) => coeffsDV.getUint32(pos, true);
    }
    function getCutPoint(v) {
        let m = 0, n = getUint32(0);
        while (m < n) {
            const k = Math.floor((n + m) / 2);
            const va = getUint32(4 + k * sCoef + 4);
            if (va > v) n = k - 1; else if (va < v) m = k + 1; else n = k;
        }
        return 4 + m * sCoef;
    }

    const elementsPerChunk = Math.floor((domainSize - 1) / nChunks) + 1;
    const cutPoints = [];
    for (let i = 0; i < nChunks; i++) cutPoints.push(getCutPoint(i * elementsPerChunk));
    cutPoints.push(coeffs.byteLength);

    // Return a flat Uint8Array when the domain fits under BigBuffer's 1 GiB page,
    // so the downstream IFFT can consume it in place (skip its defensive copy).
    // Larger domains stay paged BigBuffers (the IFFT flattens those as before).
    const outBytes = domainSize * n8;
    const mkOut = () => (outBytes < (1 << 30)) ? new Uint8Array(outBytes) : new BigBuffer(outBytes);
    const outBuffA = mkOut();
    const outBuffB = mkOut();
    const outBuffC = mkOut();

    const inFlight = new Set();
    const tasks = [];
    for (let i = 0; i < nChunks; i++) {
        const outOffset = i * elementsPerChunk;
        const n = Math.min(elementsPerChunk, domainSize - outOffset);
        if (n <= 0) break;
        const cpA = cutPoints[i], cpB = cutPoints[i + 1];
        while (inFlight.size >= maxInFlight) await Promise.race(inFlight);
        if (logger) logger.debug(`buildABCStream: ${i}/${nChunks}`);
        const op = (async () => {
            const coeffChunk = coeffs.slice(cpA, cpB);
            const witnessCopy = witness.slice(0, nVars * n8); // full witness, single pass -> no merge
            const task = [
                {cmd: "ALLOCSET", var: 0, buff: coeffChunk},
                {cmd: "ALLOCSET", var: 1, buff: witnessCopy},
                {cmd: "ALLOC", var: 2, len: n * n8},
                {cmd: "ALLOC", var: 3, len: n * n8},
                {cmd: "ALLOC", var: 4, len: n * n8},
                {cmd: "CALL", fnName: "qap_buildABC", params: [
                    {var: 0}, {val: (cpB - cpA) / sCoef}, {var: 1},
                    {var: 2}, {var: 3}, {var: 4},
                    {val: outOffset}, {val: n}, {val: 0}, {val: nVars},
                ]},
                {cmd: "GET", out: 0, var: 2, len: n * n8},
                {cmd: "GET", out: 1, var: 3, len: n * n8},
                {cmd: "GET", out: 2, var: 4, len: n * n8},
            ];
            const r = await curve.tm.queueAction(task, [coeffChunk.buffer, witnessCopy.buffer]);
            outBuffA.set(r[0], outOffset * n8);
            outBuffB.set(r[1], outOffset * n8);
            outBuffC.set(r[2], outOffset * n8);
        })();
        const slot = op.finally(() => inFlight.delete(slot));
        inFlight.add(slot);
        tasks.push(slot);
    }
    await Promise.all(tasks);
    console.timeEnd("buildABCStream");
    return [outBuffA, outBuffB, outBuffC];
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
