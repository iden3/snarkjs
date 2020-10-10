
import {readR1csHeader} from "r1csfile";
import * as utils from "./powersoftau_utils.js";
import * as binFileUtils from "./binfileutils.js";
import { log2, formatHash } from "./misc.js";
import { Scalar, BigBuffer } from "ffjavascript";
import Blake2b from "blake2b-wasm";
import BigArray from "./bigarray.js";


export default async function newZKey(r1csName, ptauName, zkeyName, logger) {
    await Blake2b.ready();
    const csHasher = Blake2b(64);

    const {fd: fdR1cs, sections: sectionsR1cs} = await binFileUtils.readBinFile(r1csName, "r1cs", 1, 1<<22, 1<<24);
    const r1cs = await readR1csHeader(fdR1cs, sectionsR1cs, false);

    const {fd: fdPTau, sections: sectionsPTau} = await binFileUtils.readBinFile(ptauName, "ptau", 1);
    const {curve, power} = await utils.readPTauHeader(fdPTau, sectionsPTau);

    const fdZKey = await binFileUtils.createBinFile(zkeyName, "zkey", 1, 10, 1<<22, 1<<24);

    const sG1 = curve.G1.F.n8*2;
    const sG2 = curve.G2.F.n8*2;

    if (r1cs.prime != curve.r) {
        if (logger) logger.error("r1cs curve does not match powers of tau ceremony curve");
        return -1;
    }

    const cirPower = log2(r1cs.nConstraints + r1cs.nPubInputs + r1cs.nOutputs +1 -1) +1;

    if (cirPower > power) {
        if (logger) logger.error(`circuit too big for this power of tau ceremony. ${r1cs.nConstraints}*2 > 2**${power}`);
        return -1;
    }

    if (!sectionsPTau[12]) {
        if (logger) logger.error("Powers of tau is not prepared.");
        return -1;
    }

    const nPublic = r1cs.nOutputs + r1cs.nPubInputs;
    const domainSize = 2 ** cirPower;

    // Write the header
    ///////////
    await binFileUtils.startWriteSection(fdZKey, 1);
    await fdZKey.writeULE32(1); // Groth
    await binFileUtils.endWriteSection(fdZKey);

    // Write the Groth header section
    ///////////

    await binFileUtils.startWriteSection(fdZKey, 2);
    const primeQ = curve.q;
    const n8q = (Math.floor( (Scalar.bitLength(primeQ) - 1) / 64) +1)*8;

    const primeR = curve.r;
    const n8r = (Math.floor( (Scalar.bitLength(primeR) - 1) / 64) +1)*8;
    const Rr = Scalar.mod(Scalar.shl(1, n8r*8), primeR);
    const R2r = curve.Fr.e(Scalar.mod(Scalar.mul(Rr,Rr), primeR));

    await fdZKey.writeULE32(n8q);
    await binFileUtils.writeBigInt(fdZKey, primeQ, n8q);
    await fdZKey.writeULE32(n8r);
    await binFileUtils.writeBigInt(fdZKey, primeR, n8r);
    await fdZKey.writeULE32(r1cs.nVars);                         // Total number of bars
    await fdZKey.writeULE32(nPublic);                       // Total number of public vars (not including ONE)
    await fdZKey.writeULE32(domainSize);                  // domainSize

    let bAlpha1;
    bAlpha1 = await fdPTau.read(sG1, sectionsPTau[4][0].p);
    await fdZKey.write(bAlpha1);
    bAlpha1 = await curve.G1.batchLEMtoU(bAlpha1);
    csHasher.update(bAlpha1);

    let bBeta1;
    bBeta1 = await fdPTau.read(sG1, sectionsPTau[5][0].p);
    await fdZKey.write(bBeta1);
    bBeta1 = await curve.G1.batchLEMtoU(bBeta1);
    csHasher.update(bBeta1);

    let bBeta2;
    bBeta2 = await fdPTau.read(sG2, sectionsPTau[6][0].p);
    await fdZKey.write(bBeta2);
    bBeta2 = await curve.G2.batchLEMtoU(bBeta2);
    csHasher.update(bBeta2);

    const bg1 = new Uint8Array(sG1);
    curve.G1.toRprLEM(bg1, 0, curve.G1.g);
    const bg2 = new Uint8Array(sG2);
    curve.G2.toRprLEM(bg2, 0, curve.G2.g);
    const bg1U = new Uint8Array(sG1);
    curve.G1.toRprUncompressed(bg1U, 0, curve.G1.g);
    const bg2U = new Uint8Array(sG2);
    curve.G2.toRprUncompressed(bg2U, 0, curve.G2.g);

    await fdZKey.write(bg2);        // gamma2
    await fdZKey.write(bg1);        // delta1
    await fdZKey.write(bg2);        // delta2
    csHasher.update(bg2U);      // gamma2
    csHasher.update(bg1U);      // delta1
    csHasher.update(bg2U);      // delta2
    await binFileUtils.endWriteSection(fdZKey);


    const A = new BigArray(r1cs.nVars);
    const B1 = new BigArray(r1cs.nVars);
    const B2 = new BigArray(r1cs.nVars);
    const C = new BigArray(r1cs.nVars- nPublic -1);
    const IC = new Array(nPublic+1);

    const buffCoeff = new Uint8Array(12 + curve.Fr.n8);
    const buffCoeffV = new DataView(buffCoeff.buffer);

    const lTauG1 = sectionsPTau[12][0].p + ((2 ** cirPower) -1)*sG1;
    const lTauG2 = sectionsPTau[13][0].p + ((2 ** cirPower) -1)*sG2;
    const lAlphaTauG1 = sectionsPTau[14][0].p + ((2 ** cirPower) -1)*sG1;
    const lBetaTauG1 = sectionsPTau[15][0].p + ((2 ** cirPower) -1)*sG1;

    await binFileUtils.startWriteSection(fdZKey, 4);
    await binFileUtils.startReadUniqueSection(fdR1cs, sectionsR1cs, 2);

    const pNCoefs =  fdZKey.pos;
    let nCoefs = 0;
    fdZKey.pos += 4;
    for (let c=0; c<r1cs.nConstraints; c++) {
        if ((logger)&&(c%10000 == 0)) logger.debug(`processing constraints: ${c}/${r1cs.nConstraints}`);
        const nA = await fdR1cs.readULE32();
        for (let i=0; i<nA; i++) {
            const s = await fdR1cs.readULE32();
            const coef = await fdR1cs.read(r1cs.n8);

            const l1 = lTauG1 + sG1*c;
            const l2 = lBetaTauG1 + sG1*c;
            if (typeof A[s] === "undefined") A[s] = [];
            A[s].push([l1, coef]);

            if (s <= nPublic) {
                if (typeof IC[s] === "undefined") IC[s] = [];
                IC[s].push([l2, coef]);
            } else {
                if (typeof C[s- nPublic -1] === "undefined") C[s- nPublic -1] = [];
                C[s - nPublic -1].push([l2, coef]);
            }
            await writeCoef(0, c, s, coef);
            nCoefs ++;
        }

        const nB = await fdR1cs.readULE32();
        for (let i=0; i<nB; i++) {
            const s = await fdR1cs.readULE32();
            const coef = await fdR1cs.read(r1cs.n8);

            const l1 = lTauG1 + sG1*c;
            const l2 = lTauG2 + sG2*c;
            const l3 = lAlphaTauG1 + sG1*c;
            if (typeof B1[s] === "undefined") B1[s] = [];
            B1[s].push([l1, coef]);
            if (typeof B2[s] === "undefined") B2[s] = [];
            B2[s].push([l2, coef]);

            if (s <= nPublic) {
                if (typeof IC[s] === "undefined") IC[s] = [];
                IC[s].push([l3, coef]);
            } else {
                if (typeof C[s- nPublic -1] === "undefined") C[s- nPublic -1] = [];
                C[s- nPublic -1].push([l3, coef]);
            }

            await writeCoef(1, c, s, coef);
            nCoefs ++;
        }

        const nC = await fdR1cs.readULE32();
        for (let i=0; i<nC; i++) {
            const s = await fdR1cs.readULE32();
            const coef = await fdR1cs.read(r1cs.n8);

            const l1 = lTauG1 + sG1*c;
            if (s <= nPublic) {
                if (typeof IC[s] === "undefined") IC[s] = [];
                IC[s].push([l1, coef]);
            } else {
                if (typeof C[s- nPublic -1] === "undefined") C[s- nPublic -1] = [];
                C[s- nPublic -1].push([l1, coef]);
            }
        }
    }

    const bOne = new Uint8Array(curve.Fr.n8);
    curve.Fr.toRprLE(bOne, 0, curve.Fr.e(1));
    for (let s = 0; s <= nPublic ; s++) {
        const l1 = lTauG1 + sG1*(r1cs.nConstraints + s);
        const l2 = lBetaTauG1 + sG1*(r1cs.nConstraints + s);
        if (typeof A[s] === "undefined") A[s] = [];
        A[s].push([l1, bOne]);
        if (typeof IC[s] === "undefined") IC[s] = [];
        IC[s].push([l2, bOne]);
        await writeCoef(0, r1cs.nConstraints + s, s, bOne);
        nCoefs ++;
    }

    const oldPos = fdZKey.pos;
    await fdZKey.writeULE32(nCoefs, pNCoefs);
    fdZKey.pos = oldPos;

    await binFileUtils.endWriteSection(fdZKey);
    await binFileUtils.endReadSection(fdR1cs);

/*
    zKey.hExps = new Array(zKey.domainSize-1);
    for (let i=0; i< zKey.domainSize; i++) {
        const t1 = await readEvaluation("tauG1", i);
        const t2 = await readEvaluation("tauG1", i+zKey.domainSize);
        zKey.hExps[i] = curve.G1.sub(t2, t1);
    }
*/

    await composeAndWritePoints(3, "G1", IC, "IC");

    // Write Hs
    await binFileUtils.startWriteSection(fdZKey, 9);
    const o = sectionsPTau[12][0].p + ((2 ** (cirPower+1)) -1)*sG1;

    if (cirPower < curve.Fr.s) {
        for (let i=0; i< domainSize; i++) {
            const buff = await fdPTau.read(sG1, o + (i*2+1)*sG1 );
            await fdZKey.write(buff);
        }
    } else if (cirPower == curve.Fr.s) {
        const buff = new BigBuffer(domainSize * sG1);
        await fdPTau.readToBuffer(buff, 0, domainSize*sG1, o + domainSize*sG1);
        await fdZKey.write(buff);
    } else {
        if (logger) logger.error("Circuit too big");
        throw new Error("Circuit too big for this curve");
    }
    await binFileUtils.endWriteSection(fdZKey);
    await hashHPoints();

    await composeAndWritePoints(8, "G1", C, "C");
    await composeAndWritePoints(5, "G1", A, "A");
    await composeAndWritePoints(6, "G1", B1, "B1");
    await composeAndWritePoints(7, "G2", B2, "B2");

    const csHash = csHasher.digest();
    // Contributions section
    await binFileUtils.startWriteSection(fdZKey, 10);
    await fdZKey.write(csHash);
    await fdZKey.writeULE32(0);
    await binFileUtils.endWriteSection(fdZKey);

    if (logger) logger.info(formatHash(csHash, "Circuit hash: "));


    await fdZKey.close();
    await fdPTau.close();
    await fdR1cs.close();

    return csHash;

    async function writeCoef(a, c, s, coef) {
        const n = curve.Fr.fromRprLE(coef, 0);
        const nR2 = curve.Fr.mul(n, R2r);
        buffCoeffV.setUint32(0, a, true);
        buffCoeffV.setUint32(4, c, true);
        buffCoeffV.setUint32(8, s, true);
        curve.Fr.toRprLE(buffCoeff, 12, nR2);
        await fdZKey.write(buffCoeff);
    }

    async function composeAndWritePoints(idSection, groupName, arr, sectionName) {
        const CHUNK_SIZE= 1<<13;
        const G = curve[groupName];

        hashU32(arr.length);
        await binFileUtils.startWriteSection(fdZKey, idSection);

        let opPromises = [];

        let i=0;
        while (i<arr.length) {

            let t=0;
            while ((i<arr.length)&&(t<curve.tm.concurrency)) {
                if (logger)  logger.debug(`Writing points start ${sectionName}: ${i}/${arr.length}`);
                let n = 1;
                let nP = (arr[i] ? arr[i].length : 0);
                while ((i + n < arr.length) && (nP + (arr[i+n] ? arr[i+n].length : 0) < CHUNK_SIZE)) {
                    nP += (arr[i+n] ? arr[i+n].length : 0);
                    n ++;
                }
                const subArr = arr.slice(i, i + n);
                const _i = i;
                opPromises.push(composeAndWritePointsThread(groupName, subArr, logger, sectionName).then( (r) => {
                    if (logger)  logger.debug(`Writing points end ${sectionName}: ${_i}/${arr.length}`);
                    return r;
                }));
                i += n;
                t++;
            }

            const result = await Promise.all(opPromises);

            for (let k=0; k<result.length; k++) {
                await fdZKey.write(result[k][0]);
                const buff = await G.batchLEMtoU(result[k][0]);
                csHasher.update(buff);
            }
            opPromises = [];

        }
        await binFileUtils.endWriteSection(fdZKey);

    }

    async function composeAndWritePointsThread(groupName, arr, logger, sectionName) {
        const G = curve[groupName];
        const sGin = G.F.n8*2;
        const sGmid = G.F.n8*3;
        const sGout = G.F.n8*2;
        let fnExp, fnMultiExp, fnBatchToAffine, fnZero;
        if (groupName == "G1") {
            fnExp = "g1m_timesScalarAffine";
            fnMultiExp = "g1m_multiexpAffine";
            fnBatchToAffine = "g1m_batchToAffine";
            fnZero = "g1m_zero";
        } else if (groupName == "G2") {
            fnExp = "g2m_timesScalarAffine";
            fnMultiExp = "g2m_multiexpAffine";
            fnBatchToAffine = "g2m_batchToAffine";
            fnZero = "g2m_zero";
        } else {
            throw new Error("Invalid group");
        }
        let acc =0;
        for (let i=0; i<arr.length; i++) acc += arr[i] ? arr[i].length : 0;
        let bBases, bScalars;
        if (acc> 2<<14) {
            bBases = new BigBuffer(acc*sGin);
            bScalars = new BigBuffer(acc*curve.Fr.n8);
        } else {
            bBases = new Uint8Array(acc*sGin);
            bScalars = new Uint8Array(acc*curve.Fr.n8);
        }
        let pB =0;
        let pS =0;

        let readOps = [];
        let scalars = [];
        let offset = 0;
        for (let i=0; i<arr.length; i++) {
            if (!arr[i]) continue;
            for (let j=0; j<arr[i].length; j++) {
                if (readOps.length > 2<<14) {
                    logger.debug(`${sectionName}: Long MExp Load ${j}/${arr[i].length}`);

                    const points = await Promise.all(readOps);
                    for (let k=0; k<points.length; k++) {
                        bBases.set(points[k], (offset+k)*sGin);
                        bScalars.set(scalars[k], (offset+k)*curve.Fr.n8);
                    }
                    offset += readOps.length;
                    readOps = [];
                    scalars = [];
                }
                scalars.push(arr[i][j][1]);
                readOps.push(fdPTau.read(sGin, arr[i][j][0]));
            }
        }

        const points = await Promise.all(readOps);
        for (let i=0; i<points.length; i++) {
            bBases.set(points[i], (offset+i)*sGin);
            bScalars.set(scalars[i], (offset+i)*curve.Fr.n8);
        }

        if (arr.length>1) {
            const task = [];
            task.push({cmd: "ALLOCSET", var: 0, buff: bBases});
            task.push({cmd: "ALLOCSET", var: 1, buff: bScalars});
            task.push({cmd: "ALLOC", var: 2, len: arr.length*sGmid});
            pB = 0;
            pS = 0;
            let pD =0;
            for (let i=0; i<arr.length; i++) {
                if (!arr[i]) {
                    task.push({cmd: "CALL", fnName: fnZero, params: [
                        {var: 2, offset: pD}
                    ]});
                    pD += sGmid;
                    continue;
                }
                if (arr[i].length == 1) {
                    task.push({cmd: "CALL", fnName: fnExp, params: [
                        {var: 0, offset: pB},
                        {var: 1, offset: pS},
                        {val: curve.Fr.n8},
                        {var: 2, offset: pD}
                    ]});
                } else {
                    task.push({cmd: "CALL", fnName: fnMultiExp, params: [
                        {var: 0, offset: pB},
                        {var: 1, offset: pS},
                        {val: curve.Fr.n8},
                        {val: arr[i].length},
                        {var: 2, offset: pD}
                    ]});
                }
                pB += sGin*arr[i].length;
                pS += curve.Fr.n8*arr[i].length;
                pD += sGmid;
            }
            task.push({cmd: "CALL", fnName: fnBatchToAffine, params: [
                {var: 2},
                {val: arr.length},
                {var: 2},
            ]});
            task.push({cmd: "GET", out: 0, var: 2, len: arr.length*sGout});

            const res = await curve.tm.queueAction(task);
            return res;
        } else {
            let res = await G.multiExpAffine(bBases, bScalars, logger, sectionName);
            res = [ G.toAffine(res) ];
            return res;
        }
    }


    async function hashHPoints() {
        const CHUNK_SIZE = 1<<14;

        hashU32(domainSize-1);

        for (let i=0; i<domainSize-1; i+= CHUNK_SIZE) {
            if (logger)  logger.debug(`HashingHPoints: ${i}/${domainSize}`);
            const n = Math.min(domainSize-1, CHUNK_SIZE);
            await hashHPointsChunk(i, n);
        }
    }

    async function hashHPointsChunk(offset, nPoints) {
        const buff1 = await fdPTau.read(nPoints *sG1, sectionsPTau[2][0].p + (offset + domainSize)*sG1);
        const buff2 = await fdPTau.read(nPoints *sG1, sectionsPTau[2][0].p + offset*sG1);
        const concurrency= curve.tm.concurrency;
        const nPointsPerThread = Math.floor(nPoints / concurrency);
        const opPromises = [];
        for (let i=0; i<concurrency; i++) {
            let n;
            if (i< concurrency-1) {
                n = nPointsPerThread;
            } else {
                n = nPoints - i*nPointsPerThread;
            }
            if (n==0) continue;

            const subBuff1 = buff1.slice(i*nPointsPerThread*sG1, (i*nPointsPerThread+n)*sG1);
            const subBuff2 = buff2.slice(i*nPointsPerThread*sG1, (i*nPointsPerThread+n)*sG1);
            opPromises.push(hashHPointsThread(subBuff1, subBuff2));
        }


        const result = await Promise.all(opPromises);

        for (let i=0; i<result.length; i++) {
            csHasher.update(result[i][0]);
        }
    }

    async function hashHPointsThread(buff1, buff2) {
        const nPoints = buff1.byteLength/sG1;
        const sGmid = curve.G1.F.n8*3;
        const task = [];
        task.push({cmd: "ALLOCSET", var: 0, buff: buff1});
        task.push({cmd: "ALLOCSET", var: 1, buff: buff2});
        task.push({cmd: "ALLOC", var: 2, len: nPoints*sGmid});
        for (let i=0; i<nPoints; i++) {
            task.push({
                cmd: "CALL",
                fnName: "g1m_subAffine",
                params: [
                    {var: 0, offset: i*sG1},
                    {var: 1, offset: i*sG1},
                    {var: 2, offset: i*sGmid},
                ]
            });
        }
        task.push({cmd: "CALL", fnName: "g1m_batchToAffine", params: [
            {var: 2},
            {val: nPoints},
            {var: 2},
        ]});
        task.push({cmd: "CALL", fnName: "g1m_batchLEMtoU", params: [
            {var: 2},
            {val: nPoints},
            {var: 2},
        ]});
        task.push({cmd: "GET", out: 0, var: 2, len: nPoints*sG1});

        const res = await curve.tm.queueAction(task);

        return res;
    }

    function hashU32(n) {
        const buff = new Uint8Array(4);
        const buffV = new DataView(buff.buffer, buff.byteOffset, buff.byteLength);
        buffV.setUint32(0, n, false);
        csHasher.update(buff);
    }

}


