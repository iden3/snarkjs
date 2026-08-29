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
    let fdWtns, fdZKey;
    try {
        const openWtns = await binFileUtils.readBinFile(witnessFileName, "wtns", 2, 1<<25, 1<<23);
        fdWtns = openWtns.fd;
        // For an IndexedDB-cached http zkey (browser warm start), pass a
        // fastfile descriptor: {type: "http", url, persistentCache: true|{...}}
        const openZKey = await binFileUtils.readBinFile(zkeyFileName, "zkey", 2, 1<<25, 1<<23);
        fdZKey = openZKey.fd;
        return await _groth16Prove(fdZKey, openZKey.sections, fdWtns, openWtns.sections, logger, options);
    } finally {
        // Close on EVERY path -- any throw between open and the end of the
        // prove (header validation, section reads, a failing phase) used to
        // leak both fds because only the success path closed them. On the
        // error path, phases may still have reads in flight; closing makes
        // those fail fast ("Reading a closing file") and their rejections
        // are observed by the no-op catch attached at phase creation.
        // Promise.resolve() wrapping: mem-backed fds return undefined from
        // close().
        if (fdZKey) await Promise.resolve(fdZKey.close()).catch(() => {});
        if (fdWtns) await Promise.resolve(fdWtns.close()).catch(() => {});
    }
}

async function _groth16Prove(fdZKey, sectionsZKey, fdWtns, sectionsWtns, logger, options) {

    const wtns = await wtnsUtils.readHeader(fdWtns, sectionsWtns);

    const zkey = await zkeyUtils.readHeader(fdZKey, sectionsZKey, undefined, options);

    if (zkey.protocol !== "groth16") {
        throw new Error("zkey file is not groth16");
    }

    if (!Scalar.eq(zkey.r,  wtns.q)) {
        throw new Error("Curve of the witness does not match the curve of the proving key");
    }

    if (wtns.nWitness !== zkey.nVars) {
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
    // msmGlv / msmGls: "auto" (default -- use the G1/G2 endomorphism MSM paths
    // where the curve supports them; the wasm still gates internally on chunk
    // sizes) or "disabled" (generic batch accumulation). A/B and debugging
    // aids, like msmBatching.
    const msmGlv = options.msmGlv || "auto";
    const msmGls = options.msmGls || "auto";
    for (const [name, v] of [["msmGlv", msmGlv], ["msmGls", msmGls]]) {
        if (v !== "auto" && v !== "disabled") {
            throw new Error(`groth16Prove: invalid ${name} "${v}" (expected "auto" or "disabled")`);
        }
    }
    const msmOpts = { batch: msmBatching, glv: msmGlv, gls: msmGls };

    // buildABC: "stream" (default -- bounded worker memory, tunable
    // parallelism via buildABCnChunks/buildABCmaxInFlight) or "js" (plain JS,
    // no worker memory footprint, slower).
    if (options.buildABC !== undefined && options.buildABC !== "js" && options.buildABC !== "stream") {
        throw new Error(`groth16Prove: invalid buildABC "${options.buildABC}" (expected "js" or "stream")`);
    }

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
            // coverage: defensive edge guard not reachable with valid inputs
            /* c8 ignore start */
            if (off + len > size) throw new Error(`groth16Prove: read out of range of section ${idSection}`);
            /* c8 ignore stop */
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
            const buffCoeffs = await binFileUtils.readSection(fdZKey, sectionsZKey, 4);

            if (logger) logger.debug("Building ABC");

            if (options.buildABC === "js") {
                [buffA_T, buffB_T, buffC_T] = await buildABC1(curve, zkey, buffWitness, buffCoeffs, logger);
            } else {
                // Default: streaming build (bounded worker memory, tunable
                // parallelism). The per-chunk witness gather keeps the witness
                // out of WASM entirely, so there is no witness size limit.
                const p = pickStreamParams(curve, zkey, buffCoeffs, options);
                if (logger) logger.debug(`buildABC: stream nChunks=${p.nChunks} maxInFlight=${p.maxInFlight}`);
                [buffA_T, buffB_T, buffC_T] = await buildABCStream(curve, zkey, buffWitness, buffCoeffs, logger, p.nChunks, p.maxInFlight);
            }
        })();


        // coverage: BigBuffer path requires sections beyond the 1 GiB threshold or a 2^28 domain
        /* c8 ignore start */
        const inc = power === Fr.s ? curve.Fr.shift : curve.Fr.w[power+1];
        /* c8 ignore stop */

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
    })();
    //await abcPromise;

    let proof = {};

    async function calcPiA(){
        if (logger) logger.debug("Reading A Points");
        proof.pi_a = await curve.G1.multiExpAffineChunked(mkSectionReader(5), sectionsZKey[5][0].size, buffWitness, logger, "multiexp A", msmOpts);
    }

    let piaPromise = calcPiA();
    //await piaPromise;

    let pib1;

    async function calcPiB1() {
        if (logger) logger.debug("Reading B1 Points");
        pib1 = await curve.G1.multiExpAffineChunked(mkSectionReader(6), sectionsZKey[6][0].size, buffWitness, logger, "multiexp B1", msmOpts);
    }

    let pib1Promise = calcPiB1();
    //await pib1Promise;

    async function calcPiB() {
        if (logger) logger.debug("Reading B2 Points");
        proof.pi_b = await curve.G2.multiExpAffineChunked(mkSectionReader(7), sectionsZKey[7][0].size, buffWitness, logger, "multiexp B2", msmOpts);
    }

    let pibPromise = calcPiB();
    //await pibPromise;

    let picPromise = (async function (){
        if (logger) logger.debug("Reading C Points");
        proof.pi_c = await curve.G1.multiExpAffineChunked(mkSectionReader(8), sectionsZKey[8][0].size, buffWitness.slice((zkey.nPublic+1)*curve.Fr.n8), logger, "multiexp C", msmOpts);
    })();
    //await picPromise;

    resHPromise = (async function (){
        if (logger) logger.debug("Reading H Points");
        await abcPromise;
        resH = await curve.G1.multiExpAffineChunked(mkSectionReader(9), sectionsZKey[9][0].size, buffPodd_T, logger, "multiexp H", msmOpts);
    })();
    //await resHPromise;


    // Mark every concurrent phase as observed the moment it exists: an early
    // rejection (e.g. a truncated zkey failing one section read) would
    // otherwise fire Node's unhandledRejection while we are still awaiting a
    // slower sibling below -- before any catch could attach handlers. The
    // no-op catch is a separate branch: the awaits below still throw, and a
    // straggler phase failing after groth16Prove's finally has closed the
    // fds rejects into this handler instead of crashing the process.
    for (const p of [abcPromise, piaPromise, pib1Promise, pibPromise, picPromise, resHPromise]) {
        p.catch(() => {});
    }

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

    proof = stringifyBigInts(proof);
    publicSignals = stringifyBigInts(publicSignals);

    return {proof, publicSignals};
}


async function buildABC1(curve, zkey, witness, coeffs, logger) {
    const n8 = curve.Fr.n8;
    const sCoef = 4*3 + zkey.n8r;
    const nCoef = (coeffs.byteLength-4) / sCoef;

    const outBuffA = new BigBuffer(zkey.domainSize * n8);
    const outBuffB = new BigBuffer(zkey.domainSize * n8);
    const outBuffC = new BigBuffer(zkey.domainSize * n8);

    const outBuf = [ outBuffA, outBuffB ];
    for (let i=0; i<nCoef; i++) {
        // coverage: progress logging fires only for circuits beyond test-fixture size
        /* c8 ignore start */
        if ((logger)&&(i%1000000 == 0)) logger.debug(`QAP AB: ${i}/${nCoef}`);
        /* c8 ignore stop */

        let buffCoefV, coef;
        if (coeffs.buffer) {
            // if we have direct access to array buffer, then we can create zero-copy views
            const coeffOffset = 4 + i * sCoef;
            buffCoefV = new DataView(coeffs.buffer, coeffs.byteOffset + coeffOffset, sCoef);
            coef = new Uint8Array(coeffs.buffer, coeffs.byteOffset + coeffOffset + 12, n8);
        } else {
            // coverage: BigBuffer coeffs require a >1 GiB section
            /* c8 ignore start */
            const buffCoef = coeffs.slice(4+i*sCoef, 4+i*sCoef+sCoef);
            buffCoefV = new DataView(buffCoef.buffer);
            coef = buffCoef.slice(12, 12+n8);
            /* c8 ignore stop */
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

    }

    for (let i=0; i<zkey.domainSize; i++) {
        // coverage: progress logging fires only for circuits beyond test-fixture size
        /* c8 ignore start */
        if ((logger)&&(i%1000000 == 0)) logger.debug(`QAP C: ${i}/${zkey.domainSize}`);
        /* c8 ignore stop */
        outBuffC.set(
            curve.Fr.mul(
                outBuffA.slice(i*n8, i*n8+n8),
                outBuffB.slice(i*n8, i*n8+n8),
            ),
            i*n8
        );
    }


    return [outBuffA, outBuffB, outBuffC];

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
    // coverage: defaulted-parameter fallbacks; internal callers always pass values
    /* c8 ignore next 2 */
    options = options || {};
    const n8 = curve.Fr.n8;
    /* c8 ignore next */
    const concurrency = curve.tm.concurrency || 1;
    // Per-task bytes: coeff chunk + gathered witness values (n8 per coefficient)
    // + 3 output chunks. The witness itself stays JS-side (gathered per chunk).
    const nCoefs = (coeffs.byteLength - 4) / (12 + n8);
    const variableBytes = coeffs.byteLength + nCoefs * n8 + 3 * zkey.domainSize * n8;

    // Persistent worker memory buildABC may leave behind (default 256 MB; override
    // via options.buildABCFloorBudget — raise it for more parallelism/speed, lower it
    // for a smaller peak). Because each busy worker's WASM memory never shrinks, this
    // directly bounds the floor the rest of the prove inherits.
    const floorBudget = options.buildABCFloorBudget || (256 * 1024 * 1024);

    const targetPerChunk = 32 * 1024 * 1024;
    let nChunks = Math.max(1, Math.ceil(variableBytes / targetPerChunk));
    const perWorker = Math.ceil(variableBytes / nChunks);
    let maxInFlight = Math.max(1, Math.min(concurrency, Math.floor(floorBudget / perWorker)));
    nChunks = Math.min(256, Math.max(nChunks, maxInFlight * 3));
    maxInFlight = Math.min(maxInFlight, nChunks);

    if (options.buildABCnChunks) nChunks = options.buildABCnChunks;
    if (options.buildABCmaxInFlight) maxInFlight = options.buildABCmaxInFlight;
    return { nChunks, maxInFlight };
}

// Streaming buildABC: the domain is split into `nChunks` disjoint output ranges
// processed with bounded concurrency. The witness values each chunk references
// are gathered JS-side into a compact per-coefficient buffer (s-indices remapped
// to sequential positions), so a task holds only its coeff chunk + gathered
// values + output chunk -- the witness itself never enters WASM and its size is
// unbounded.
async function buildABCStream(curve, zkey, witness, coeffs, logger, nChunks, maxInFlight) {
    const n8 = curve.Fr.n8;
    const sCoef = 4 * 3 + zkey.n8r;
    const domainSize = zkey.domainSize;

    let getUint32;
    // coverage: BigBuffer path requires sections beyond the 1 GiB threshold or a 2^28 domain
    /* c8 ignore start */
    if (coeffs instanceof BigBuffer) {
        const coeffsDV = [];
        const PAGE_LEN = coeffs.buffers[0].length;
        for (let i = 0; i < coeffs.buffers.length; i++) coeffsDV.push(new DataView(coeffs.buffers[i].buffer));
        getUint32 = (pos) => coeffsDV[Math.floor(pos / PAGE_LEN)].getUint32(pos % PAGE_LEN, true);
    } else {
        const coeffsDV = new DataView(coeffs.buffer, coeffs.byteOffset, coeffs.byteLength);
        getUint32 = (pos) => coeffsDV.getUint32(pos, true);
    }
    /* c8 ignore stop */
    function getCutPoint(v) {
        // lower_bound: first coefficient whose c-field is >= v.
        // The coeffs are sorted by c-field, so this is a binary search.
        let m = 0, n = getUint32(0);
        while (m < n) {
            const k = Math.floor((n + m) / 2);
            const va = getUint32(4 + k * sCoef + 4);
            if (va < v) m = k + 1; else n = k;
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
    // coverage: BigBuffer path requires sections beyond the 1 GiB threshold or a 2^28 domain
    /* c8 ignore start */
    const mkOut = () => (outBytes < (1 << 30)) ? new Uint8Array(outBytes) : new BigBuffer(outBytes);
    /* c8 ignore stop */
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
        // Wait in case we have already max allowed chunks "in flight"
        while (inFlight.size >= maxInFlight) await Promise.race(inFlight);
        if (logger) logger.debug(`buildABCStream: ${i}/${nChunks}`);
        const op = (async () => {
            // Gather the witness values this chunk references into a compact
            // buffer (one entry per coefficient, in coefficient order) and
            // rewrite each coefficient's s-index to its sequential position.
            // The witness itself never enters WASM, so its size is unbounded
            // (it can stay a BigBuffer) and each task ships only what it uses
            // -- typically much less than a full witness copy per task.
            const coeffChunk = coeffs.slice(cpA, cpB);
            const nCoefChunk = (cpB - cpA) / sCoef;
            const gathered = new Uint8Array(nCoefChunk * n8);
            // Hot loop (one iteration per coefficient): use typed-array lane
            // copies instead of set(subarray) -- per-element memcpy dispatch
            // dominated the profile otherwise. Uint32 lanes on purpose: the
            // data is integer bit patterns, and Float64 lanes may legally
            // canonicalize NaN-patterned lanes, silently corrupting them.
            // The s-field offsets are 4-byte aligned (sCoef and the +8
            // offset are multiples of 4).
            const chunkU32 = new Uint32Array(coeffChunk.buffer, coeffChunk.byteOffset, coeffChunk.byteLength >> 2);
            const sStep = sCoef >> 2;
            const laneFast = !!witness.buffer && ((witness.byteOffset & 3) === 0) && (n8 === 32);
            if (laneFast) {
                const wU32 = new Uint32Array(witness.buffer, witness.byteOffset, witness.byteLength >> 2);
                const gU32 = new Uint32Array(gathered.buffer);
                for (let j = 0; j < nCoefChunk; j++) {
                    const si = chunkU32[j * sStep + 2];
                    const so = si << 3, go = j << 3;
                    gU32[go] = wU32[so]; gU32[go + 1] = wU32[so + 1];
                    gU32[go + 2] = wU32[so + 2]; gU32[go + 3] = wU32[so + 3];
                    gU32[go + 4] = wU32[so + 4]; gU32[go + 5] = wU32[so + 5];
                    gU32[go + 6] = wU32[so + 6]; gU32[go + 7] = wU32[so + 7];
                    chunkU32[j * sStep + 2] = j;
                }
            } else {
                // coverage: non-lane-fast gather needs a BigBuffer witness (>1 GiB) or n8 != 32
                /* c8 ignore start */
                const witnessIsView = !!witness.buffer;
                for (let j = 0; j < nCoefChunk; j++) {
                    const s = chunkU32[j * sStep + 2];
                    if (witnessIsView) gathered.set(witness.subarray(s * n8, (s + 1) * n8), j * n8);
                    else gathered.set(witness.slice(s * n8, (s + 1) * n8), j * n8);
                    chunkU32[j * sStep + 2] = j;
                }
                /* c8 ignore stop */
            }
            const task = [
                {cmd: "ALLOCSET", var: 0, buff: coeffChunk},
                {cmd: "ALLOCSET", var: 1, buff: gathered},
                {cmd: "ALLOC", var: 2, len: n * n8},
                {cmd: "ALLOC", var: 3, len: n * n8},
                {cmd: "ALLOC", var: 4, len: n * n8},
                {cmd: "CALL", fnName: "qap_buildABC", params: [
                    {var: 0}, {val: nCoefChunk}, {var: 1},
                    {var: 2}, {var: 3}, {var: 4},
                    {val: outOffset}, {val: n}, {val: 0}, {val: nCoefChunk},
                ]},
                {cmd: "GET", out: 0, var: 2, len: n * n8},
                {cmd: "GET", out: 1, var: 3, len: n * n8},
                {cmd: "GET", out: 2, var: 4, len: n * n8},
            ];
            const r = await curve.tm.queueAction(task, [coeffChunk.buffer, gathered.buffer]);
            outBuffA.set(r[0], outOffset * n8);
            outBuffB.set(r[1], outOffset * n8);
            outBuffC.set(r[2], outOffset * n8);
        })();
        const slot = op.finally(() => inFlight.delete(slot));
        inFlight.add(slot);
        tasks.push(slot);
    }
    await Promise.all(tasks);
    return [outBuffA, outBuffB, outBuffC];
}

async function joinABC(curve, zkey, a, b, c, logger) {
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
    // coverage: BigBuffer path requires sections beyond the 1 GiB threshold or a 2^28 domain
    /* c8 ignore start */
    if (a instanceof BigBuffer) {
        outBuff = new BigBuffer(a.byteLength);
    } else {
        outBuff = new Uint8Array(a.byteLength);
    }
    /* c8 ignore stop */

    let p=0;
    for (let i=0; i<result.length; i++) {
        outBuff.set(result[i][0], p);
        p += result[i][0].byteLength;
    }

    return outBuff;
}
