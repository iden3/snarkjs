const fastFile = require("fastfile");
const assert = require("assert");
const Scalar = require("ffjavascript").Scalar;
const bn128 = require("ffjavascript").bn128;
const Blake2b = require("blake2b-wasm");
const ChaCha = require("ffjavascript").ChaCha;
const keyPair = require("./keypair");
const crypto = require("crypto");

async function readBinFile(fileName, type, maxVersion) {

    const fd = await fastFile.readExisting(fileName);

    const b = await fd.read(4);
    const bv = new Uint8Array(b);
    let readedType = "";
    for (let i=0; i<4; i++) readedType += String.fromCharCode(bv[i]);

    if (readedType != type) assert(false, fileName + ": Invalid File format");

    let v = await fd.readULE32();

    if (v>maxVersion) assert(false, "Version not supported");

    const nSections = await fd.readULE32();

    // Scan sections
    let sections = [];
    for (let i=0; i<nSections; i++) {
        let ht = await fd.readULE32();
        let hl = await fd.readULE64();
        if (typeof sections[ht] == "undefined") sections[ht] = [];
        sections[ht].push({
            p: fd.pos,
            size: hl
        });
        fd.pos += hl;
    }

    return {fd, sections};
}

async function createBinFile(fileName, type, version, nSections) {

    const fd = await fastFile.createOverride(fileName);

    const buff = new Uint8Array(4);
    for (let i=0; i<4; i++) buff[i] = type.charCodeAt(i);
    await fd.write(buff.buffer, 0); // Magic "r1cs"

    await fd.writeULE32(version); // Version
    await fd.writeULE32(nSections); // Number of Sections

    return fd;
}

async function writePTauHeader(fd, curve, power) {
    // Write the header
    ///////////
    await fd.writeULE32(1); // Header type
    const pHeaderSize = fd.pos;
    await fd.writeULE64(0); // Temporally set to 0 length

    await fd.writeULE32(curve.F1.n64*8);

    const buff = new ArrayBuffer(curve.F1.n8);
    Scalar.toRprLE(buff, 0, curve.q, curve.F1.n8);
    await fd.write(buff);
    await fd.writeULE32(power);                    // power

    const headerSize = fd.pos - pHeaderSize - 8;

    const oldPos = fd.pos;

    fd.writeULE64(headerSize, pHeaderSize);

    fd.pos = oldPos;
}

async function readPTauHeader(fd, sections) {
    if (!sections[1])  assert(false, fd.fileName + ": File has no  header");
    if (sections[1].length>1) assert(false, fd.fileName +": File has more than one header");

    fd.pos = sections[1][0].p;
    const n8 = await fd.readULE32();
    const buff = await fd.read(n8);
    const q = Scalar.fromRprLE(buff);
    let curve;
    if (Scalar.eq(q, bn128.q)) {
        curve = bn128;
    } else {
        assert(false, fd.fileName +": Curve not supported");
    }
    assert(curve.F1.n64*8 == n8, fd.fileName +": Invalid size");

    const power = await fd.readULE32();

    assert.equal(fd.pos-sections[1][0].p, sections[1][0].size);

    return {curve, power};
}


async function readPtauPubKey(fd, curve, montgomery) {

    const buff = await fd.read(curve.F1.n8*2*6 + curve.F2.n8*2*3);

    return fromPtauPubKeyRpr(buff, 0, curve, montgomery);
}

function fromPtauPubKeyRpr(buff, pos, curve, montgomery) {

    const key = {
        tau: {},
        alpha: {},
        beta: {}
    };

    key.tau.g1_s = readG1();
    key.tau.g1_sx = readG1();
    key.alpha.g1_s = readG1();
    key.alpha.g1_sx = readG1();
    key.beta.g1_s = readG1();
    key.beta.g1_sx = readG1();
    key.tau.g2_spx = readG2();
    key.alpha.g2_spx = readG2();
    key.beta.g2_spx = readG2();

    return key;

    function readG1() {
        let p;
        if (montgomery) {
            p = curve.G1.fromRprLEM( buff, pos );
        } else {
            p = curve.G1.fromRprBE( buff, pos );
        }
        pos += curve.G1.F.n8*2;
        return p;
    }

    function readG2() {
        let p;
        if (montgomery) {
            p = curve.G2.fromRprLEM( buff, pos );
        } else {
            p = curve.G2.fromRprBE( buff, pos );
        }
        pos += curve.G2.F.n8*2;
        return p;
    }
}

function toPtauPubKeyRpr(buff, pos, curve, key, montgomery) {

    writeG1(key.tau.g1_s);
    writeG1(key.tau.g1_sx);
    writeG1(key.alpha.g1_s);
    writeG1(key.alpha.g1_sx);
    writeG1(key.beta.g1_s);
    writeG1(key.beta.g1_sx);
    writeG2(key.tau.g2_spx);
    writeG2(key.alpha.g2_spx);
    writeG2(key.beta.g2_spx);

    async function writeG1(p) {
        if (montgomery) {
            curve.G1.toRprLEM(buff, pos, p);
        } else {
            curve.G1.toRprBE(buff, pos, p);
        }
        pos += curve.F1.n8*2;
    }

    async function writeG2(p) {
        if (montgomery) {
            curve.G2.toRprLEM(buff, pos, p);
        } else {
            curve.G2.toRprBE(buff, pos, p);
        }
        pos += curve.F2.n8*2;
    }

    return buff;
}

async function writePtauPubKey(fd, curve, key, montgomery) {
    const buff = new ArrayBuffer(curve.F1.n8*2*6 + curve.F2.n8*2*3);
    toPtauPubKeyRpr(buff, 0, curve, key, montgomery);
    await fd.write(buff);
}

async function readContribution(fd, curve) {
    const c = {};

    c.tauG1 = await readG1();
    c.tauG2 = await readG2();
    c.alphaG1 = await readG1();
    c.betaG1 = await readG1();
    c.betaG2 = await readG2();
    c.key = await readPtauPubKey(fd, curve, true);
    c.partialHash = new Uint8Array(await fd.read(216));
    c.nextChallange = new Uint8Array(await fd.read(64));
    c.type = await fd.readULE32();

    const paramLength = await fd.readULE32();
    const curPos = fd.pos;
    let lastType =0;
    while (fd.pos-curPos < paramLength) {
        const buffType = await readDV(1);
        if (buffType[0]<= lastType) throw new Error("Parameters in the contribution must be sorted");
        lastType = buffType[0];
        if (buffType[0]==1) {     // Name
            const buffLen = await readDV(1);
            const buffStr = await readDV(buffLen[0]);
            c.name = new TextDecoder().decode(buffStr);
        } else if (buffType[0]==2) {
            const buffExp = await readDV(1);
            c.numIterationsExp = buffExp[0];
        } else if (buffType[0]==3) {
            const buffLen = await readDV(1);
            c.beaconHash = await readDV(buffLen[0]);
        } else {
            throw new Error("Parameter not recognized");
        }
    }
    if (fd.pos != curPos + paramLength) {
        throw new Error("Parametes do not match");
    }

    return c;

    async function readG1() {
        const pBuff = await fd.read(curve.F1.n8*2);
        return curve.G1.fromRprLEM( pBuff );
    }

    async function readG2() {
        const pBuff = await fd.read(curve.F2.n8*2);
        return curve.G2.fromRprLEM( pBuff );
    }

    async function readDV(n) {
        const b = await fd.read(n);
        return new Uint8Array(b);
    }
}

async function readContributions(fd, curve, sections) {
    if (!sections[7])  assert(false, fd.fileName + ": File has no  contributions");
    if (sections[7][0].length>1) assert(false, fd.fileName +": File has more than one contributions section");

    fd.pos = sections[7][0].p;
    const nContributions = await fd.readULE32();
    const contributions = [];
    for (let i=0; i<nContributions; i++) {
        const c = await readContribution(fd, curve);
        c.id = i+1;
        contributions.push(c);
    }

    assert.equal(fd.pos-sections[7][0].p, sections[7][0].size);

    return contributions;
}

async function writeContribution(fd, curve, contribution) {

    const buffG1 = new ArrayBuffer(curve.F1.n8*2);
    const buffG2 = new ArrayBuffer(curve.F2.n8*2);
    await writeG1(contribution.tauG1);
    await writeG2(contribution.tauG2);
    await writeG1(contribution.alphaG1);
    await writeG1(contribution.betaG1);
    await writeG2(contribution.betaG2);
    await writePtauPubKey(fd, curve, contribution.key, true);
    await fd.write(contribution.partialHash);
    await fd.write(contribution.nextChallange);
    await fd.writeULE32(contribution.type || 0);

    const params = [];
    if (contribution.name) {
        params.push(1);      // Param Name
        const nameData = new TextEncoder("utf-8").encode(contribution.name.substring(0,64));
        params.push(nameData.byteLength);
        for (let i=0; i<nameData.byteLength; i++) params.push(nameData[i]);
    }
    if (contribution.type == 1) {
        params.push(2);      // Param numIterationsExp
        params.push(contribution.numIterationsExp);

        params.push(3);      // Beacon Hash
        params.push(contribution.beaconHash.byteLength);
        for (let i=0; i<contribution.beaconHash.byteLength; i++) params.push(contribution.beaconHash[i]);
    }
    if (params.length>0) {
        const paramsBuff = new Uint8Array(params);
        await fd.writeULE32(paramsBuff.byteLength);
        await fd.write(paramsBuff);
    } else {
        await fd.writeULE32(0);
    }


    async function writeG1(p) {
        curve.G1.toRprLEM(buffG1, 0, p);
        await fd.write(buffG1);
    }

    async function writeG2(p) {
        curve.G2.toRprLEM(buffG2, 0, p);
        await fd.write(buffG2);
    }

}

async function writeContributions(fd, curve, contributions) {

    await fd.writeULE32(7); // Header type
    const pContributionsSize = fd.pos;
    await fd.writeULE64(0); // Temporally set to 0 length

    await fd.writeULE32(contributions.length);
    for (let i=0; i< contributions.length; i++) {
        await writeContribution(fd, curve, contributions[i]);
    }
    const contributionsSize = fd.pos - pContributionsSize - 8;

    const oldPos = fd.pos;

    fd.writeULE64(contributionsSize, pContributionsSize);
    fd.pos = oldPos;
}


function formatHash(b) {
    const a = new DataView(b.buffer);
    let S = "";
    for (let i=0; i<4; i++) {
        if (i>0) S += "\n";
        S += "\t\t";
        for (let j=0; j<4; j++) {
            if (j>0) S += " ";
            S += a.getUint32(i*16+j*4).toString(16).padStart(8, "0");
        }
    }
    return S;
}

function hashIsEqual(h1, h2) {
    if (h1.byteLength != h2.byteLength) return false;
    var dv1 = new Int8Array(h1);
    var dv2 = new Int8Array(h2);
    for (var i = 0 ; i != h1.byteLength ; i++)
    {
        if (dv1[i] != dv2[i]) return false;
    }
    return true;
}

function calculateFirstChallangeHash(curve, power) {
    const hasher = new Blake2b(64);

    const buffG1 = new ArrayBuffer(curve.G1.F.n8*2);
    const vG1 = new Uint8Array(buffG1);
    const buffG2 = new ArrayBuffer(curve.G2.F.n8*2);
    const vG2 = new Uint8Array(buffG2);
    curve.G1.toRprBE(buffG1, 0, curve.G1.g);
    curve.G2.toRprBE(buffG2, 0, curve.G2.g);

    const blankHasher = new Blake2b(64);
    hasher.update(blankHasher.digest());

    let n;
    n=(1 << power)*2 -1;
    for (let i=0; i<n; i++) hasher.update(vG1);
    n= 1 << power;
    for (let i=0; i<n; i++) hasher.update(vG2);
    for (let i=0; i<n; i++) hasher.update(vG1);
    for (let i=0; i<n; i++) hasher.update(vG1);
    hasher.update(vG2);

    return hasher.digest();
}


function keyFromBeacon(curve, challangeHash, beaconHash, numIterationsExp) {
    let nIterationsInner;
    let nIterationsOuter;
    if (numIterationsExp<32) {
        nIterationsInner = (1 << numIterationsExp) >>> 0;
        nIterationsOuter = 1;
    } else {
        nIterationsInner = 0x100000000;
        nIterationsOuter = (1 << (numIterationsExp-32)) >>> 0;
    }

    let curHash = beaconHash;
    for (let i=0; i<nIterationsOuter; i++) {
        for (let j=0; j<nIterationsInner; j++) {
            curHash = crypto.createHash("sha256").update(curHash).digest();
        }
    }

    const curHashV = new DataView(curHash.buffer);
    const seed = [];
    for (let i=0; i<8; i++) {
        seed[i] = curHashV.getUint32(i*4, false);
    }

    const rng = new ChaCha(seed);

    const key = keyPair.createPTauKey(curve, challangeHash, rng);

    return key;
}

module.exports.readBinFile = readBinFile;
module.exports.createBinFile = createBinFile;
module.exports.readPTauHeader = readPTauHeader;
module.exports.writePTauHeader = writePTauHeader;
module.exports.readPtauPubKey = readPtauPubKey;
module.exports.writePtauPubKey = writePtauPubKey;
module.exports.formatHash = formatHash;
module.exports.readContributions = readContributions;
module.exports.writeContributions = writeContributions;
module.exports.hashIsEqual = hashIsEqual;
module.exports.calculateFirstChallangeHash = calculateFirstChallangeHash;
module.exports.toPtauPubKeyRpr = toPtauPubKeyRpr;
module.exports.fromPtauPubKeyRpr = fromPtauPubKeyRpr;
module.exports.keyFromBeacon = keyFromBeacon;

