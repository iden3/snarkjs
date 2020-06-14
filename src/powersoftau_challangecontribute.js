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
const Blake2b = require("blake2b-wasm");
const readline = require("readline");
const crypto = require("crypto");
const ChaCha = require("ffjavascript").ChaCha;
const fs = require("fs");
const utils = require("./powersoftau_utils");
const misc = require("./misc");

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


async function challangeContribute(curve, challangeFilename, responesFileName, entropy, verbose) {
    await Blake2b.ready();

    let stats = await fs.promises.stat(challangeFilename);

    const sG1 = curve.F1.n64*8*2;
    const sG2 = curve.F2.n64*8*2;
    const domainSize = (stats.size + sG1 - 64 - sG2) / (4*sG1 + sG2);
    let e = domainSize;
    let power = 0;
    while (e>1) {
        e = e /2;
        power += 1;
    }

    assert(1<<power == domainSize, "Invalid file size");
    console.log("Power to tau size: "+power);

    const fdFrom = await fastFile.readExisting(challangeFilename);

    const fdTo = await fastFile.createOverride(responesFileName);

    while (!entropy) {
        entropy = await askEntropy();
    }

    // Calculate the hash
    console.log("Hashing challange");
    const challangeHasher = Blake2b(64);
    for (let i=0; i<stats.size; i+= fdFrom.pageSize) {
        const s = Math.min(stats.size - i, fdFrom.pageSize);
        const buff = await fdFrom.read(s);
        challangeHasher.update(buff);
    }

    const claimedHash = await fdFrom.read(64, 0);
    console.log("Claimed Previus Challange Hash: ");
    console.log(misc.formatHash(claimedHash));

    const challangeHash = challangeHasher.digest();
    console.log("Current Challange Hash: ");
    console.log(misc.formatHash(challangeHash));

    const hasher = Blake2b(64);

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

    const responseHasher = Blake2b(64);

    await fdTo.write(challangeHash);
    responseHasher.update(challangeHash);


    await contributeSection("G1", (1<<power)*2-1, curve.Fr.one, key.tau.prvKey, "tauG1" );
    await contributeSection("G2", (1<<power)    , curve.Fr.one, key.tau.prvKey, "tauG2" );
    await contributeSection("G1", (1<<power)    , key.alpha.prvKey, key.tau.prvKey, "alphaTauG1" );
    await contributeSection("G1", (1<<power)    , key.beta.prvKey, key.tau.prvKey, "betaTauG1" );
    await contributeSection("G2", 1             , key.beta.prvKey, key.tau.prvKey, "betaG2" );

    // Write and hash key
    const buffKey = new Uint8Array(curve.F1.n8*2*6+curve.F2.n8*2*3);
    utils.toPtauPubKeyRpr(buffKey, 0, curve, key, false);
    await fdTo.write(buffKey);
    responseHasher.update(buffKey);
    const responseHash = responseHasher.digest();
    console.log("Contribution Response Hash: ");
    console.log(misc.formatHash(responseHash));

    await fdTo.close();
    await fdFrom.close();

    async function contributeSection(groupName, nPoints, first, inc, sectionName) {

        const G = curve[groupName];
        const sG = G.F.n8*2;
        const chunkSize = Math.floor((1<<20) / sG);   // 128Mb chunks
        let t = first;
        for (let i=0 ; i<nPoints ; i+= chunkSize) {
            if ((verbose)&&i) console.log(`${sectionName}: ` + i);
            const n= Math.min(nPoints-i, chunkSize );
            const buffInU = await fdFrom.read(n * sG);
            const buffInLEM = await G.batchUtoLEM(buffInU);
            const buffOutLEM = await G.batchApplyKey(buffInLEM, t, inc);
            const buffOutC = await G.batchLEMtoC(buffOutLEM);

            responseHasher.update(buffOutC);
            await fdTo.write(buffOutC);
            t = curve.Fr.mul(t, curve.Fr.pow(inc, n));
        }
    }
}

module.exports = challangeContribute;
