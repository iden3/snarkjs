// Format of the outpu
//     Hash of the last contribution  64Bytes
//     2^N * 2 -1  TauG1 points (uncompressed)
//     2^N  TauG2 Points (uncompressed)
//     2^N  AlphaTauG1 Points (uncompressed)
//     2^N  BetaTauG1 Points (uncompressed)
//     BetaG2 (uncompressed)

const fastFile = require("fastfile");
const Scalar = require("ffjavascript").Scalar;
const assert = require("assert");
const bn128 = require("ffjavascript").bn128;
const blake2b = require("blake2b");
const ptauUtils = require("./powersoftau_utils");


async function exportChallange(pTauFilename, challangeFilename, verbose) {

    const sections = ptauUtils.
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

module.exports = exportChallange;
