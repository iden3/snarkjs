const fs = require("fs");
const assert = require("assert");
const bigInt = require("big-integer");

module.exports.loadR1cs = loadR1cs;
module.exports.loadR1csSynch = loadR1csSync;

async function loadR1cs(fileName) {
    const res = {};
    const fd = await fs.promises.open(fileName, "r");

    const b = Buffer.allocUnsafe(4);
    await fd.read(b, 0, 4, 0);
    if (b.toString() != "r1cs") assert(false, "Invalid File format");

    let p=4;

    let v = await readU32();

    if (v>1) assert(false, "Version not supported");

    const nSections = await readU32();

    let pHeader;
    let pConstraints;
    let headerSize;
    let constraintsSize;
    let pMap;
    let mapSize;
    for (let i=0; i<nSections; i++) {
        let ht = await readU32();
        let hl = await readDouble64();
        if (ht == 1) {
            if (typeof pHeader != "undefined") assert(false, "File has two headder sections");
            pHeader = p;
            headerSize = hl;
        } else if (ht==2) {
            if (typeof pConstraints != "undefined") assert(false, "File has two constraints sections");
            pConstraints = p;
            constraintsSize = hl;
        } else if (ht==3) {
            pMap = p;
            mapSize = hl;
        }
        p += hl;
    }

    if (typeof pHeader == "undefined") assert(false, "File has two header");

    // Read Header
    p = pHeader;
    const fieldDefSize = await readU32();
    const pFieldDef = p;

    const defType = await readU32();
    if (defType != 1) if (typeof pConstraints != "undefined") assert(false, "Field type not supported");

    res.prime = await readBigInt();

    if ( p != pFieldDef + fieldDefSize) assert("Invalid fieldDef size");

    const bigIntFormat = await readU32();
    if (bigIntFormat != 0) assert(false, "BigInt format not supported");

    const idSize = await readU32();
    if (idSize != 4) assert(false, "idSize not supported. Mus be 4");

    res.nVars = await readU32();
    res.nOutputs = await readU32();
    res.nPubInputs = await readU32();
    res.nPrvIns = await readU32();
    res.nLabels = await readU32();
    res.nConstraints = await readU32();

    if (p != pHeader + headerSize) assert(false, "Invalid header section size");

    // Read Constraints
    p = pConstraints;

    res.constraints = [];
    for (let i=0; i<res.nConstraints; i++) {
        const c = await readConstraint();
        res.constraints.push(c);
    }
    if (p != pConstraints + constraintsSize) assert(false, "Invalid constraints size");

    await fd.close();

    return res;

    async function readU32() {
        const b = Buffer.allocUnsafe(4);
        await fd.read(b, 0, 4, p);
        p+=4;

        return b.readInt32LE(0);
    }

    async function readDouble64() {
        const b = Buffer.allocUnsafe(8);
        await fd.read(b, 0, 8, p);

        p+=8;

        return b.readDoubleLE(0);
    }

    async function readBigInt() {
        const bl = Buffer.allocUnsafe(1);
        await fd.read(bl, 0, 1, p);
        p++;

        const l = bl[0];
        const b = Buffer.allocUnsafe(l);
        await fd.read(b, 0, l, p);
        p += l;

        const arr = Uint8Array.from(b);

        const arrr = new Array(arr.length);
        for (let i=0; i<arr.length; i++) {
            arrr[i] = arr[arr.length-1-i];
        }

        const n = bigInt.fromArray(arrr, 256);

        return n.toString();
    }

    async function readConstraint() {
        const c = [];
        c.push(await readLC());
        c.push(await readLC());
        c.push(await readLC());
        return c;
    }

    async function readLC() {
        const lc= {};
        const nIdx = await readU32();
        for (let i=0; i<nIdx; i++) {
            const idx = await readU32();
            const val = await readBigInt();
            lc[idx] = val;
        }
        return lc;
    }
}

async function loadR1cs(fileName) {
    const res = {};
    const fd = fs.openSync(fileName, "r");

    const b = Buffer.allocUnsafe(4);
    fs.readSync(fd, b, 0, 4, 0);
    if (b.toString() != "r1cs") assert(false, "Invalid File format");

    let p=4;

    let v = readU32();

    if (v>1) assert(false, "Version not supported");

    const nSections = readU32();

    let pHeader;
    let pConstraints;
    let headerSize;
    let constraintsSize;
    for (let i=0; i<nSections; i++) {
        let ht = readU32();
        let hl = readU64();
        if (ht == 1) {
            if (typeof pHeader != "undefined") assert(false, "File has two headder sections");
            pHeader = p;
            headerSize = hl;
        } else if (ht==2) {
            if (typeof pConstraints != "undefined") assert(false, "File has two constraints sections");
            pConstraints = p;
            constraintsSize = hl;
        }
        p += hl;
    }

    if (typeof pHeader == "undefined") assert(false, "File has no header");

    // Read Header
    p = pHeader;

    const n8 = await readU32();
    res.prime = await readBigInt();

    res.nWires = await readU32();
    res.nPubOuts = await readU32();
    res.nPubIns = await readU32();
    res.nPrvIns = await readU32();
    res.nLabels = await readU64();
    res.nConstraints = await readU32();


    const fieldDefSize = readU32();
    const pFieldDef = p;

    const defType = readU32();
    if (defType != 1) if (typeof pConstraints != "undefined") assert(false, "Field type not supported");

    res.prime = readBigInt();

    if ( p != pFieldDef + fieldDefSize) assert("Invalid fieldDef size");

    const bigIntFormat = readU32();
    if (bigIntFormat != 0) assert(false, "BigInt format not supported");

    const idSize = readU32();
    if (idSize != 4) assert(false, "idSize not supported. Mus be 4");

    res.nVars = readU32();
    res.nOutputs = readU32();
    res.nPubInputs = readU32();
    res.nPrvIns = readU32();
    res.nLabels = readU32();
    res.nConstraints = readU32();

    if (p != pHeader + headerSize) assert(false, "Invalid header section size");

    // Read Constraints
    p = pConstraints;

    res.constraints = [];
    for (let i=0; i<res.nConstraints; i++) {
        const c = readConstraint();
        res.constraints.push(c);
    }
    if (p != pConstraints + constraintsSize) assert(false, "Invalid constraints size");

    fs.closeSync(fd);

    return res;

    function readU32() {
        const b = Buffer.allocUnsafe(4);
        fs.readSync(fd, b, 0, 4, p);
        p+=4;

        return b.readInt32LE(0);
    }

    function readDouble64() {
        const b = Buffer.allocUnsafe(8);
        fs.readSync(fd, b, 0, 8, p);
        p+=8;

        return b.readDoubleLE(0);
    }

    function readBigInt() {
        const bl = Buffer.allocUnsafe(1);
        fs.readSync(fd, bl, 0, 1, p);
        p++;

        const l = bl[0];
        const b = Buffer.allocUnsafe(l);
        fs.readSync(fd,b, 0, l, p);
        p += l;

        const arr = Uint8Array.from(b);

        const arrr = new Array(arr.length);
        for (let i=0; i<arr.length; i++) {
            arrr[i] = arr[arr.length-1-i];
        }

        const n = bigInt.fromArray(arrr, 256);

        return n.toString();
    }

    function readConstraint() {
        const c = [];
        c.push(readLC());
        c.push(readLC());
        c.push(readLC());
        return c;
    }

    function readLC() {
        const lc= {};
        const nIdx = readU32();
        for (let i=0; i<nIdx; i++) {
            const idx = readU32();
            const val = readBigInt();
            lc[idx] = val;
        }
        return lc;
    }
}
