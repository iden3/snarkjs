/*
Header
    n8
    prime
    power
    nContributions
tauG1
    [(1<<power)*2-1] G1
tauG2
    [1<<power] G2
alfaTauG1
    [1<<power] G1
betaTauG1
    [1<<power] G1
betaG2
    [1] G2
contributions
    [NContributions]
    tauG1
    tauG2
    alphaTauG1
    betaTauG1
    betaG2
    partialHash
        state
    tau_g1s
    tau_g1sx
    tau_g2spx
    alfa_g1s
    alfa_g1sx
    alfa_g1spx
    beta_g1s
    beta_g1sx
    beta_g1spx
 */

const fastFile = require("fastfile");
const Scalar = require("ffjavascript").Scalar;
const assert = require("assert");
const bn128 = require("ffjavascript").bn128;
const blake2b = require("blake2b");
const readline = require("readline");
const crypto = require("crypto");
const ChaCha = require("ffjavascript").ChaCha;
const fs = require("fs");


const buildTaskManager = require("./taskmanager");
const keyPair = require("./keypair");


async function newAccumulator(curve, power, fileName, verbose) {

    const fd = await fastFile.createOverride(fileName);

    await fd.write(Buffer.from("ptau"), 0); // Magic "r1cs"

    await fd.writeULE32(1); // Version
    await fd.writeULE32(7); // Number of Sections

    // Write the header
    ///////////
    await fd.writeULE32(1); // Header type
    const pHeaderSize = fd.pos;
    await fd.writeULE64(0); // Temporally set to 0 length

    const primeQ = curve.q;

    await fd.writeULE32(curve.F1.n64*8);
    await fd.write(Scalar.toRprLE(primeQ, curve.F1.n64*8));
    await fd.writeULE32(power);                    // power
    await fd.writeULE32(0);                       // Total number of public contributions

    const headerSize = fd.pos - pHeaderSize - 8;


    // Write tauG1
    ///////////
    await fd.writeULE32(2); // tauG1
    const pTauG1 = fd.pos;
    await fd.writeULE64(0); // Temporally set to 0 length
    const nTauG1 = (1 << power) * 2 -1;
    for (let i=0; i< nTauG1; i++) {
        await fd.write(curve.G1.toRprLEM(curve.G1.g));
        if ((verbose)&&((i%100000) == 0)&&i) console.log("tauG1: " + i);
    }
    const tauG1Size  = fd.pos - pTauG1 -8;

    // Write tauG2
    ///////////
    await fd.writeULE32(3); // tauG2
    const pTauG2 = fd.pos;
    await fd.writeULE64(0); // Temporally set to 0 length
    const nTauG2 = (1 << power);
    for (let i=0; i< nTauG2; i++) {
        await fd.write(curve.G2.toRprLEM(curve.G2.g));
        if ((verbose)&&((i%100000) == 0)&&i) console.log("tauG2: " + i);
    }
    const tauG2Size  = fd.pos - pTauG2 -8;

    // Write alfaTauG1
    ///////////
    await fd.writeULE32(4); // alfaTauG1
    const pAlfaTauG1 = fd.pos;
    await fd.writeULE64(0); // Temporally set to 0 length
    const nAlfaTauG1 = (1 << power);
    for (let i=0; i< nAlfaTauG1; i++) {
        await fd.write(curve.G1.toRprLEM(curve.G1.g));
        if ((verbose)&&((i%100000) == 0)&&i) console.log("alfaTauG1: " + i);
    }
    const alfaTauG1Size  = fd.pos - pAlfaTauG1 -8;

    // Write betaTauG1
    ///////////
    await fd.writeULE32(5); // betaTauG1
    const pBetaTauG1 = fd.pos;
    await fd.writeULE64(0); // Temporally set to 0 length
    const nBetaTauG1 = (1 << power);
    for (let i=0; i< nBetaTauG1; i++) {
        await fd.write(curve.G1.toRprLEM(curve.G1.g));
        if ((verbose)&&((i%100000) == 0)&&i) console.log("betaTauG1: " + i);
    }
    const betaTauG1Size  = fd.pos - pBetaTauG1 -8;

    // Write betaG2
    ///////////
    await fd.writeULE32(6); // betaG2
    const pBetaG2 = fd.pos;
    await fd.writeULE64(0); // Temporally set to 0 length
    await fd.write(curve.G2.toRprLEM(curve.G2.g));
    const betaG2Size  = fd.pos - pBetaG2 -8;

    // Contributions
    ///////////
    await fd.writeULE32(7); // betaG2
    const pContributions = fd.pos;
    await fd.writeULE64(0); // Temporally set to 0 length
    const contributionsSize  = fd.pos - pContributions -8;

    // Write sizes
    await fd.writeULE64(headerSize, pHeaderSize);
    await fd.writeULE64(tauG1Size, pTauG1);
    await fd.writeULE64(tauG2Size, pTauG2);
    await fd.writeULE64(alfaTauG1Size, pAlfaTauG1);
    await fd.writeULE64(betaTauG1Size, pBetaTauG1);
    await fd.writeULE64(betaG2Size, pBetaG2);
    await fd.writeULE64(contributionsSize, pContributions);

    await fd.close();
}

async function exportChallange(pTauFilename, challangeFilename, verbose) {

    const fdFrom = await fastFile.readExisting(pTauFilename);

    const b = await fdFrom.read(4);

    if (b.toString() != "ptau") assert(false, "Invalid File format");

    let v = await fdFrom.readULE32();

    if (v>1) assert(false, "Version not supported");

    const nSections = await fdFrom.readULE32();

    // Scan sections
    let sections = [];
    for (let i=0; i<nSections; i++) {
        let ht = await fdFrom.readULE32();
        let hl = await fdFrom.readULE64();
        if (typeof sections[ht] == "undefined") sections[ht] = [];
        sections[ht].push({
            p: fdFrom.pos,
            size: hl
        });
        fdFrom.pos += hl;
    }

    if (!sections[1])  assert(false, "File has no  header");
    if (sections[1].length>1) assert(false, "File has more than one header");

    fdFrom.pos = sections[1][0].p;
    const n8 = await fdFrom.readULE32();
    const qBuff = await fdFrom.read(n8);
    const q = Scalar.fromRprLE(qBuff);
    let curve;
    if (Scalar.eq(q, bn128.q)) {
        curve = bn128;
    } else {
        assert(false, "Curve not supported");
    }
    assert(curve.F1.n64*8 == n8, "Invalid size");

    const power = await fdFrom.readULE32();
    const nContributions = await fdFrom.readULE32();

    let challangeHash;
    if (nContributions == 0) {
        challangeHash = Buffer.from(blake2b(64).digest());
    } else {
        assert(false, "Not implemented");
    }

    const fdTo = await fastFile.createOverride(challangeFilename);

    const toHash = blake2b(64);
    fdTo.write(challangeHash);
    toHash.update(challangeHash);

    // Process tauG1
    if (!sections[2])  assert(false, "File has no tauG1 section");
    if (sections[2].length>1) assert(false, "File has more than one tauG1 section");
    fdFrom.pos = sections[2][0].p;
    const nTauG1 = (1 << power) * 2 -1;
    for (let i=0; i< nTauG1; i++) {
        const p = await readG1();
        await writeG1(p);
        if ((verbose)&&((i%100000) == 0)&&i) console.log("tauG1: " + i);
    }
    if (fdFrom.pos != sections[2][0].p + sections[2][0].size) assert(false, "Invalid tauG1 section size");

    // Process tauG2
    if (!sections[3])  assert(false, "File has no tauG2 section");
    if (sections[3].length>1) assert(false, "File has more than one tauG2 section");
    fdFrom.pos = sections[3][0].p;
    const nTauG2 = 1 << power ;
    for (let i=0; i< nTauG2; i++) {
        const p = await readG2();
        await writeG2(p);
        if ((verbose)&&((i%100000) == 0)&&i) console.log("tauG2: " + i);
    }
    if (fdFrom.pos != sections[3][0].p + sections[3][0].size) assert(false, "Invalid tauG2 section size");

    // Process alphaTauG1
    if (!sections[4])  assert(false, "File has no alphaTauG1 section");
    if (sections[4].length>1) assert(false, "File has more than one alphaTauG1 section");
    fdFrom.pos = sections[4][0].p;
    const nAlphaTauG1 = 1 << power ;
    for (let i=0; i< nAlphaTauG1; i++) {
        const p = await readG1();
        await writeG1(p);
        if ((verbose)&&((i%100000) == 0)&&i) console.log("alphaTauG1: " + i);
    }
    if (fdFrom.pos != sections[4][0].p + sections[4][0].size) assert(false, "Invalid alphaTauG1 section size");

    // Process betaTauG1
    if (!sections[5])  assert(false, "File has no betaTauG1 section");
    if (sections[5].length>1) assert(false, "File has more than one betaTauG1 section");
    fdFrom.pos = sections[5][0].p;
    const nBetaTauG1 = 1 << power ;
    for (let i=0; i< nBetaTauG1; i++) {
        const p = await readG1();
        await writeG1(p);
        if ((verbose)&&((i%100000) == 0)&&i) console.log("betaTauG1: " + i);
    }
    if (fdFrom.pos != sections[5][0].p + sections[5][0].size) assert(false, "Invalid betaTauG1 section size");

    // Process betaG2
    if (!sections[6])  assert(false, "File has no betaG2 section");
    if (sections[6].length>1) assert(false, "File has more than one betaG2 section");
    fdFrom.pos = sections[6][0].p;
    const betaG2 = await readG2();
    await writeG2(betaG2);
    if (fdFrom.pos != sections[6][0].p + sections[6][0].size) assert(false, "Invalid betaG2 section size");

    await fdFrom.close();
    await fdTo.close();

    const newChallangeHash = toHash.digest("hex");

    console.log("Challange Hash: " +newChallangeHash);

    async function readG1() {
        const pBuff = await fdFrom.read(curve.F1.n64*8*2);
        return curve.G1.fromRprLEM( pBuff );
    }

    async function readG2() {
        const pBuff = await fdFrom.read(curve.F1.n64*8*2*2);
        return curve.G2.fromRprLEM( pBuff );
    }

    async function writeG1(p) {
        const rpr = curve.G1.toRprBE(p);
        await fdTo.write(rpr);
        toHash.update(rpr);
    }

    async function writeG2(p) {
        const rpr = curve.G2.toRprBE(p);
        await fdTo.write(rpr);
        toHash.update(rpr);
    }

}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askEntropy() {
    return new Promise((resolve, reject) => {
        rl.question("Enter a random text. (Entropy): ", (input) => resolve(input) );
    });
}


async function contribute(curve, challangeFilename, responesFileName, entropy, verbose) {
    const MAX_CHUNK_SIZE = 1024;

    let stats = await fs.promises.stat(challangeFilename);

    const sG1 = curve.F1.n64*8*2;
    const scG1 = curve.F1.n64*8; // Compresed size
    const sG2 = curve.F2.n64*8*2;
    const scG2 = curve.F2.n64*8; // Compresed size
    const domainSize = (stats.size + sG1 - 64 - sG2) / (4*sG1 + sG2);
    let e = domainSize;
    let power = 0;
    while (e>1) {
        e = e /2;
        power += 1;
    }

    assert(1<<power == domainSize, "Invalid file size");

    const fdFrom = await fastFile.readExisting(challangeFilename);

    const fdTo = await fastFile.createOverride(responesFileName);
    let writePointer = 0;

    while (!entropy) {
        entropy = await askEntropy();
    }

    // Calculate the hash
    console.log("Hashing challange");
    const challangeHasher = blake2b(64);
    for (let i=0; i<stats.size; i+= fdFrom.pageSize) {
        const s = Math.min(stats.size - i, fdFrom.pageSize);
        const buff = await fdFrom.read(s);
        challangeHasher.update(buff);
    }

    const challangeHash = Buffer.from(challangeHasher.digest());
    console.log("Challange Hash: " + challangeHash.toString("hex"));

    const claimedHash = await fdFrom.read(64, 0);
    console.log("Claimed Hash: " + claimedHash.toString("hex"));

    const hasher = blake2b(64);

    hasher.update(crypto.randomBytes(64));
    hasher.update(entropy);

    const hash = Buffer.from(hasher.digest());

    const seed = [];
    for (let i=0;i<8;i++) {
        seed[i] = hash.readUInt32BE(i*4);
    }

    // const rng = new ChaCha(seed);
    const rng = new ChaCha();


    const kTau = keyPair.create(curve, 0, challangeHash, rng);
    const kAlpha = keyPair.create(curve, 1, challangeHash, rng);
    const kBeta = keyPair.create(curve, 2, challangeHash, rng);

    if (verbose) {
        console.log("kTau.g1_s_x: " + kTau.g1_s[0].toString(16));
        console.log("kTau.g1_s_y: " + kTau.g1_s[1].toString(16));
        console.log("kTau.g1_sx_x: " + kTau.g1_sx[0].toString(16));
        console.log("kTau.g1_sx_y: " + kTau.g1_sx[1].toString(16));
        console.log("kTau.g2_sp_x_c0: " + kTau.g2_sp[0][0].toString(16));
        console.log("kTau.g2_sp_x_c1: " + kTau.g2_sp[0][1].toString(16));
        console.log("kTau.g2_sp_y_c0: " + kTau.g2_sp[1][0].toString(16));
        console.log("kTau.g2_sp_y_c1: " + kTau.g2_sp[1][1].toString(16));
        console.log("kTau.g2_spx_x_c0: " + kTau.g2_spx[0][0].toString(16));
        console.log("kTau.g2_spx_x_c1: " + kTau.g2_spx[0][1].toString(16));
        console.log("kTau.g2_spx_y_c0: " + kTau.g2_spx[1][0].toString(16));
        console.log("kTau.g2_spx_y_c1: " + kTau.g2_spx[1][1].toString(16));
    }


    await fdTo.write(challangeHash);
    writePointer += 64;

    const taskManager = await buildTaskManager(contributeThread, {
        ffjavascript: "ffjavascript"
    },{
        curve: curve.name
    });

    // TauG1
    let t = curve.Fr.e(1);
    for (let i=0; i<domainSize*2-1; i += MAX_CHUNK_SIZE) {
        if ((verbose)&&i) console.log("TauG1: " + i);
        const n = Math.min(domainSize*2-1 - i, MAX_CHUNK_SIZE);
        const buff = await fdFrom.read(n*sG1);
        await taskManager.addTask({
            cmd: "MULG1",
            first: t,
            inc: kTau.prvKey.toString(),
            buff: buff,
            n: n,
            writePos: writePointer
        }, async function(r) {
            return await fdTo.write(r.buff, r.writePos);
        });
        t = curve.Fr.mul(t, curve.Fr.pow(kTau.prvKey, n));
        writePointer += n*scG1;
    }

    // TauG2
    t = curve.Fr.e(1);
    for (let i=0; i<domainSize; i += MAX_CHUNK_SIZE) {
        if ((verbose)&&i) console.log("TauG2: " + i);
        const n = Math.min(domainSize - i, MAX_CHUNK_SIZE);
        const buff = await fdFrom.read(n*sG2);
        await taskManager.addTask({
            cmd: "MULG2",
            first: t,
            inc: kTau.prvKey.toString(),
            buff: buff,
            n: n,
            writePos: writePointer
        }, async function(r) {
            return await fdTo.write(r.buff, r.writePos);
        });
        t = curve.Fr.mul(t, curve.Fr.pow(kTau.prvKey, n));
        writePointer += n*scG2;
    }

    // AlphaTauG1
    t = curve.Fr.e(kAlpha.prvKey);
    for (let i=0; i<domainSize; i += MAX_CHUNK_SIZE) {
        if ((verbose)&&i) console.log("AlfaTauG1: " + i);
        const n = Math.min(domainSize - i, MAX_CHUNK_SIZE);
        const buff = await fdFrom.read(n*sG1);
        await taskManager.addTask({
            cmd: "MULG1",
            first: t,
            inc: kTau.prvKey.toString(),
            buff: buff,
            n: n,
            writePos: writePointer
        }, async function(r) {
            return await fdTo.write(r.buff, r.writePos);
        });
        t = curve.Fr.mul(t, curve.Fr.pow(kTau.prvKey, n));
        writePointer += n*scG1;
    }

    // BetaTauG1
    t = curve.Fr.e(kBeta.prvKey);
    for (let i=0; i<domainSize; i += MAX_CHUNK_SIZE) {
        if ((verbose)&&i) console.log("BetaTauG1: " + i);
        const n = Math.min(domainSize - i, MAX_CHUNK_SIZE);
        const buff = await fdFrom.read(n*sG1);
        await taskManager.addTask({
            cmd: "MULG1",
            first: t,
            inc: kTau.prvKey.toString(),
            buff: buff,
            n: n,
            writePos: writePointer
        }, async function(r) {
            return await fdTo.write(r.buff, r.writePos);
        });
        t = curve.Fr.mul(t, curve.Fr.pow(kTau.prvKey, n));
        writePointer += n*scG1;
    }

    // BetaG2
    const buffOldBeta = await fdFrom.read(sG2);
    const oldBeta = curve.G2.fromRprBE(buffOldBeta);
    const newBeta = curve.G2.mulScalar(oldBeta, kBeta.prvKey);
    const buffNewBeta = curve.G2.toRprCompressed(newBeta);
    await fdTo.write(buffNewBeta, writePointer);
    writePointer += scG2;

    //Write Key

    await fdTo.write(curve.G1.toRprBE(kTau.g1_s), writePointer);
    writePointer += sG1;
    await fdTo.write(curve.G1.toRprBE(kTau.g1_sx), writePointer);
    writePointer += sG1;
    await fdTo.write(curve.G1.toRprBE(kAlpha.g1_s), writePointer);
    writePointer += sG1;
    await fdTo.write(curve.G1.toRprBE(kAlpha.g1_sx), writePointer);
    writePointer += sG1;
    await fdTo.write(curve.G1.toRprBE(kBeta.g1_s), writePointer);
    writePointer += sG1;
    await fdTo.write(curve.G1.toRprBE(kBeta.g1_sx), writePointer);
    writePointer += sG1;
    await fdTo.write(curve.G2.toRprBE(kTau.g2_spx), writePointer);
    writePointer += sG2;
    await fdTo.write(curve.G2.toRprBE(kAlpha.g2_spx), writePointer);
    writePointer += sG2;
    await fdTo.write(curve.G2.toRprBE(kBeta.g2_spx), writePointer);
    writePointer += sG2;

    await taskManager.finish();

    await fdTo.close();
    await fdFrom.close();

}

function contributeThread(ctx, task) {
    if (task.cmd == "INIT") {
        ctx.assert = ctx.modules.assert;
        if (task.curve == "bn128") {
            ctx.curve = ctx.modules.ffjavascript.bn128;
        } else {
            ctx.assert(false, "curve not defined");
        }
        return {};
    } else if (task.cmd == "MULG1") {
//        console.log("StartMULG1 "+ ctx.processId);
        const sG1 = ctx.curve.F1.n64*8*2;
        const scG1 = ctx.curve.F1.n64*8; // Compresed size
        const buffDest = Buffer.allocUnsafe(scG1*task.n);
        let t = ctx.curve.Fr.e(task.first);
        let inc = ctx.curve.Fr.e(task.inc);
        for (let i=0; i<task.n; i++) {
            const slice = task.buff.slice(i*sG1, (i+1)*sG1);
            const b = Buffer.from(slice);
            const P = ctx.curve.G1.fromRprBE(b);
            const R = ctx.curve.G1.mulScalar(P, t);
            const bR = ctx.curve.G1.toRprCompressed(R);
            bR.copy(buffDest, i*scG1);
            t = ctx.curve.Fr.mul(t, inc);
        }
//        console.log("EndMulG1 "+ ctx.processId);
        return {
            buff: buffDest,
            writePos: task.writePos
        };
    } else if (task.cmd == "MULG2") {
//        console.log("StartMULG2 "+ ctx.processId);
        const sG2 = ctx.curve.F2.n64*8*2;
        const scG2 = ctx.curve.F2.n64*8; // Compresed size
        const buffDest = Buffer.allocUnsafe(scG2*task.n);
        let t = ctx.curve.Fr.e(task.first);
        let inc = ctx.curve.Fr.e(task.inc);
        for (let i=0; i<task.n; i++) {
            const slice = task.buff.slice(i*sG2, (i+1)*sG2);
            const b = Buffer.from(slice);
            const P = ctx.curve.G2.fromRprBE(b);
            const R = ctx.curve.G2.mulScalar(P, t);
            const bR = ctx.curve.G2.toRprCompressed(R);
            bR.copy(buffDest, i*scG2);
            t = ctx.curve.Fr.mul(t, inc);
        }
//        console.log("EndMulG2 "+ ctx.processId);
        return {
            buff: buffDest,
            writePos: task.writePos
        };
    } else {
        ctx.assert(false, "Op not implemented");
    }

}


module.exports.newAccumulator = newAccumulator;
module.exports.exportChallange = exportChallange;
module.exports.contribute = contribute;
