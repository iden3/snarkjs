// Format of the output
//      Hash of the last contribution  64 Bytes
//      2^N*2-1 TauG1 Points (compressed)
//      2^N TauG2 Points (compressed)
//      2^N AlphaTauG1 Points (compressed)
//      2^N BetaTauG1 Points (compressed)
//      Public Key
//          BetaG2 (compressed)
//          G1*s (compressed)
//          G1*s*tau (compressed)
//          G1*t (compressed)
//          G1*t*alpha (compressed)
//          G1*u (compressed)
//          G1*u*beta (compressed)
//          G2*sp*tau (compressed)
//          G2*tp*alpha (compressed)
//          G2*up*beta (compressed)

const fastFile = require("fastfile");
const assert = require("assert");
const blake2b = require("blake2b-wasm");
const readline = require("readline");
const crypto = require("crypto");
const ChaCha = require("ffjavascript").ChaCha;
const fs = require("fs");
const utils = require("./powersoftau_utils");


const buildTaskManager = require("./taskmanager");
const keyPair = require("./keypair");


const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askEntropy() {
    return new Promise((resolve) => {
        rl.question("Enter a random text. (Entropy): ", (input) => resolve(input) );
    });
}


async function contribute(curve, challangeFilename, responesFileName, entropy, verbose) {
    await blake2b.ready();

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
        challangeHasher.update(new Uint8Array(buff));
    }

    const challangeHash = challangeHasher.digest();
    console.log("Challange Hash: ");
    console.log(utils.formatHash(challangeHash));

    const claimedHash = new Uint8Array( await fdFrom.read(64, 0));
    console.log("Claimed Hash: ");
    console.log(utils.formatHash(claimedHash));

    const hasher = blake2b(64);

    hasher.update(crypto.randomBytes(64));


    const enc = new TextEncoder(); // always utf-8
    hasher.update(enc.encode(entropy));

    const hash = Buffer.from(hasher.digest());

    const seed = [];
    for (let i=0;i<8;i++) {
        seed[i] = hash.readUInt32BE(i*4);
    }

    const rng = new ChaCha(seed);

    const key = keyPair.createPTauKey(curve, challangeHash, rng);

    if (verbose) {
        ["tau", "alpha", "beta"].forEach( (k) => {
            console.log(k, ".g1_s_x: " + key[k].g1_s[0].toString(16));
            console.log(k, ".g1_s_y: " + key[k].g1_s[1].toString(16));
            console.log(k, ".g1_sx_x: " + key[k].g1_sx[0].toString(16));
            console.log(k, ".g1_sx_y: " + key[k].g1_sx[1].toString(16));
            console.log(k, ".g2_sp_x_c0: " + key[k].g2_sp[0][0].toString(16));
            console.log(k, ".g2_sp_x_c1: " + key[k].g2_sp[0][1].toString(16));
            console.log(k, ".g2_sp_y_c0: " + key[k].g2_sp[1][0].toString(16));
            console.log(k, ".g2_sp_y_c1: " + key[k].g2_sp[1][1].toString(16));
            console.log(k, ".g2_spx_x_c0: " + key[k].g2_spx[0][0].toString(16));
            console.log(k, ".g2_spx_x_c1: " + key[k].g2_spx[0][1].toString(16));
            console.log(k, ".g2_spx_y_c0: " + key[k].g2_spx[1][0].toString(16));
            console.log(k, ".g2_spx_y_c1: " + key[k].g2_spx[1][1].toString(16));
            console.log("");
        });
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
            inc: key.tau.prvKey.toString(),
            buff: buff,
            n: n,
            writePos: writePointer
        }, async function(r) {
            return await fdTo.write(r.buff, r.writePos);
        });
        t = curve.Fr.mul(t, curve.Fr.pow(key.tau.prvKey, n));
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
            inc: key.tau.prvKey.toString(),
            buff: buff,
            n: n,
            writePos: writePointer
        }, async function(r) {
            return await fdTo.write(r.buff, r.writePos);
        });
        t = curve.Fr.mul(t, curve.Fr.pow(key.tau.prvKey, n));
        writePointer += n*scG2;
    }

    // AlphaTauG1
    t = curve.Fr.e(key.alpha.prvKey);
    for (let i=0; i<domainSize; i += MAX_CHUNK_SIZE) {
        if ((verbose)&&i) console.log("AlfaTauG1: " + i);
        const n = Math.min(domainSize - i, MAX_CHUNK_SIZE);
        const buff = await fdFrom.read(n*sG1);
        await taskManager.addTask({
            cmd: "MULG1",
            first: t,
            inc: key.tau.prvKey.toString(),
            buff: buff,
            n: n,
            writePos: writePointer
        }, async function(r) {
            return await fdTo.write(r.buff, r.writePos);
        });
        t = curve.Fr.mul(t, curve.Fr.pow(key.tau.prvKey, n));
        writePointer += n*scG1;
    }

    // BetaTauG1
    t = curve.Fr.e(key.beta.prvKey);
    for (let i=0; i<domainSize; i += MAX_CHUNK_SIZE) {
        if ((verbose)&&i) console.log("BetaTauG1: " + i);
        const n = Math.min(domainSize - i, MAX_CHUNK_SIZE);
        const buff = await fdFrom.read(n*sG1);
        await taskManager.addTask({
            cmd: "MULG1",
            first: t,
            inc: key.tau.prvKey.toString(),
            buff: buff,
            n: n,
            writePos: writePointer
        }, async function(r) {
            return await fdTo.write(r.buff, r.writePos);
        });
        t = curve.Fr.mul(t, curve.Fr.pow(key.tau.prvKey, n));
        writePointer += n*scG1;
    }

    // BetaG2
    const buffOldBeta = await fdFrom.read(sG2);
    const oldBeta = curve.G2.fromRprBE(buffOldBeta);
    const newBeta = curve.G2.mulScalar(oldBeta, key.beta.prvKey);
    const buffNewBeta = new ArrayBuffer(curve.F2.n8*2);
    curve.G2.toRprCompressed(buffNewBeta, 0, newBeta);
    await fdTo.write(buffNewBeta, writePointer);
    writePointer += scG2;

    await taskManager.finish();

    //Write Key
    fdTo.pos = writePointer;
    await utils.writePtauPubKey(fdTo, curve, key);


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
        const sG1 = ctx.curve.F1.n64*8*2;
        const scG1 = ctx.curve.F1.n64*8; // Compresed size
        const buffDest = new ArrayBuffer(scG1*task.n);
        let t = ctx.curve.Fr.e(task.first);
        let inc = ctx.curve.Fr.e(task.inc);
        for (let i=0; i<task.n; i++) {
            const P = ctx.curve.G1.fromRprBE(task.buff, i*sG1);
            const R = ctx.curve.G1.mulScalar(P, t);
            ctx.curve.G1.toRprCompressed(buffDest, i*scG1, R);
            t = ctx.curve.Fr.mul(t, inc);
        }
        return {
            buff: buffDest,
            writePos: task.writePos
        };
    } else if (task.cmd == "MULG2") {
        const sG2 = ctx.curve.F2.n64*8*2;
        const scG2 = ctx.curve.F2.n64*8; // Compresed size
        const buffDest = new ArrayBuffer(scG2*task.n);
        let t = ctx.curve.Fr.e(task.first);
        let inc = ctx.curve.Fr.e(task.inc);
        for (let i=0; i<task.n; i++) {
            const P = ctx.curve.G2.fromRprBE(task.buff, i*sG2);
            const R = ctx.curve.G2.mulScalar(P, t);
            ctx.curve.G2.toRprCompressed(buffDest, i*scG2, R);
            t = ctx.curve.Fr.mul(t, inc);
        }
        return {
            buff: buffDest,
            writePos: task.writePos
        };
    } else {
        ctx.assert(false, "Op not implemented");
    }

}

module.exports = contribute;
