
const r1csFile = require("r1csfile");
const utils = require("./powersoftau_utils");
const binFileUtils = require("./binfileutils");
const assert = require("assert");
const {log2} = require("./misc");
const Scalar = require("ffjavascript").Scalar;
const Blake2b = require("blake2b-wasm");
const misc = require("./misc");


module.exports  = async function phase2new(r1csName, ptauName, zkeyName, verbose) {
    await Blake2b.ready();
    const csHasher = Blake2b(64);

    const {fd: fdR1cs, sections: sectionsR1cs} = await binFileUtils.readBinFile(r1csName, "r1cs", 1);
    const r1cs = await r1csFile.loadHeader(fdR1cs, sectionsR1cs);

    const {fd: fdPTau, sections: sectionsPTau} = await binFileUtils.readBinFile(ptauName, "ptau", 1);
    const {curve, power} = await utils.readPTauHeader(fdPTau, sectionsPTau);

    const fdZKey = await binFileUtils.createBinFile(zkeyName, "zkey", 1, 10);

    const sG1 = curve.G1.F.n8*2;
    const sG2 = curve.G2.F.n8*2;

    if (r1cs.prime != curve.r) {
        console.log("r1cs curve does not match powers of tau ceremony curve");
        return -1;
    }

    const cirPower = log2(r1cs.nConstraints + r1cs.nPubInputs + r1cs.nOutputs +1 -1) +1;

    if (cirPower > power) {
        console.log(`circuit too big for this power of tau ceremony. ${r1cs.nConstraints} > 2**${power}`);
        return -1;
    }

    if (!sectionsPTau[12]) {
        console.log("Powers of tau is not prepared.");
        return -1;
    }

    const nPublic = r1cs.nOutputs + r1cs.nPubInputs;
    const domainSize = 1 << cirPower;

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


    const A = new Array(r1cs.nVars);
    const B1 = new Array(r1cs.nVars);
    const B2 = new Array(r1cs.nVars);
    const C = new Array(r1cs.nVars- nPublic -1);
    const IC = new Array(nPublic+1);

    const lTauG1 = sectionsPTau[12][0].p + ((1 << cirPower) -1)*sG1;
    const lTauG2 = sectionsPTau[13][0].p + ((1 << cirPower) -1)*sG2;
    const lAlphaTauG1 = sectionsPTau[14][0].p + ((1 << cirPower) -1)*sG1;
    const lBetaTauG1 = sectionsPTau[15][0].p + ((1 << cirPower) -1)*sG1;

    await binFileUtils.startWriteSection(fdZKey, 4);
    await binFileUtils.startReadUniqueSection(fdR1cs, sectionsR1cs, 2);

    const pNCoefs =  fdZKey.pos;
    let nCoefs = 0;
    fdZKey.pos += 4;
    for (let c=0; c<r1cs.nConstraints; c++) {
        if (verbose && (c%1000 == 0) && (c >0)) console.log(`${c}/${r1cs.nConstraints}`);
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
            await fdZKey.writeULE32(0);
            await fdZKey.writeULE32(c);
            await fdZKey.writeULE32(s);
            await writeFr2(coef);
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
            await fdZKey.writeULE32(1);
            await fdZKey.writeULE32(c);
            await fdZKey.writeULE32(s);
            await writeFr2(coef);
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
        await fdZKey.writeULE32(0);
        await fdZKey.writeULE32(r1cs.nConstraints + s);
        await fdZKey.writeULE32(s);
        await writeFr2(bOne);
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
    const o = sectionsPTau[12][0].p + ((1 << (cirPower+1)) -1)*sG1;
    for (let i=0; i< domainSize; i++) {
        const buff = await fdPTau.read(sG1, o + (i*2+1)*sG1 );
        await fdZKey.write(buff);
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

    console.log("Circuit hash: ");
    console.log(misc.formatHash(csHash));


    await fdZKey.close();
    await fdPTau.close();
    await fdR1cs.close();

    return 0;

    async function writeFr2(buff) {
        const n = curve.Fr.fromRprLE(buff, 0);
        const nR2 = curve.Fr.mul(n, R2r);
        const buff2 = new Uint8Array(curve.Fr.n8);
        curve.Fr.toRprLE(buff2, 0, nR2);
        await fdZKey.write(buff2);
    }


    async function composeAndWritePoints(idSection, groupName, arr, sectionName) {
        const CHUNK_SIZE= 1<<18;

        hashU32(arr.length);
        await binFileUtils.startWriteSection(fdZKey, idSection);

        for (let i=0; i<arr.length; i+= CHUNK_SIZE) {
            if (verbose)  console.log(`${sectionName}: ${i}/${arr.length}`);
            const n = Math.min(arr.length -i, CHUNK_SIZE);
            const subArr = arr.slice(i, i + n);
            await composeAndWritePointsChunk(groupName, subArr);
        }
        await binFileUtils.endWriteSection(fdZKey);
    }

    async function composeAndWritePointsChunk(groupName, arr) {
        const concurrency= curve.tm.concurrency;
        const nElementsPerThread = Math.floor(arr.length / concurrency);
        const opPromises = [];
        const G = curve[groupName];
        for (let i=0; i<concurrency; i++) {
            let n;
            if (i< concurrency-1) {
                n = nElementsPerThread;
            } else {
                n = arr.length - i*nElementsPerThread;
            }
            if (n==0) continue;

            const subArr = arr.slice(i*nElementsPerThread, i*nElementsPerThread + n);
            opPromises.push(composeAndWritePointsThread(groupName, subArr));
        }

        const result = await Promise.all(opPromises);

        for (let i=0; i<result.length; i++) {
            await fdZKey.write(result[i][0]);
            const buff = await G.batchLEMtoU(result[i][0]);
            csHasher.update(buff);
        }
    }

    async function composeAndWritePointsThread(groupName, arr) {
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
            assert(false);
        }
        let acc =0;
        for (let i=0; i<arr.length; i++) acc += arr[i] ? arr[i].length : 0;
        const bBases = new Uint8Array(acc*sGin);
        const bScalars = new Uint8Array(acc*curve.Fr.n8);
        let pB =0;
        let pS =0;
        for (let i=0; i<arr.length; i++) {
            if (!arr[i]) continue;
            for (let j=0; j<arr[i].length; j++) {
                const bBase = await fdPTau.read(sGin, arr[i][j][0]);
                bBases.set(bBase, pB);
                pB += sGin;
                bScalars.set(arr[i][j][1], pS);
                pS += curve.Fr.n8;
            }
        }
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
    }


    async function hashHPoints() {
        const CHUNK_SIZE = 1<<16;

        hashU32(domainSize-1);

        for (let i=0; i<domainSize-1; i+= CHUNK_SIZE) {
            if (verbose)  console.log(`HashingHPoints: ${i}/${domainSize}`);
            const n = Math.min(domainSize-1, CHUNK_SIZE);
            await hashHPointsChunk(i*CHUNK_SIZE, n);
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

};


