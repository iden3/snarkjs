const Scalar = require("ffjavascript").Scalar;
const fastFile = require("fastfile");
const assert = require("assert");

module.exports.write = async function writeZKey(fileName, witness, prime) {

    const fd = await fastFile.createOverride(fileName);

    await fd.write(Buffer.from("wtns"), 0); // Magic "r1cs"

    let p = 4;
    await writeU32(1); // Version

    const n8 = (Math.floor( (Scalar.bitLength(prime) - 1) / 64) +1)*8;

    await writeU32(n8);
    await writeBigInt(prime);

    await writeU32(witness.length);

    for (let i=0; i<witness.length; i++) {
        await writeBigInt(witness[i]);
    }

    await fd.close();


    async function writeU32(v, pos) {
        let o = (typeof pos == "undefined") ? p : pos;

        const b = Buffer.allocUnsafe(4);
        b.writeInt32LE(v);

        await fd.write(b, o);

        if (typeof(pos) == "undefined") p += 4;
    }


    async function writeBigInt(n, pos) {

        let o = (typeof pos == "undefined") ? p : pos;

        const s = n.toString(16);
        const b = Buffer.from(s.padStart(n8*2, "0"), "hex");
        const buff = Buffer.allocUnsafe(b.length);
        for (let i=0; i<b.length; i++) buff[i] = b[b.length-1-i];

        await fd.write(buff, o);

        if (typeof(pos) == "undefined") p += n8;
    }
};

module.exports.writeBin = async function writeZKey(fileName, witnessBin, prime) {

    witnessBin = Buffer.from(witnessBin);

    const fd = await fastFile.createOverride(fileName);

    await fd.write(Buffer.from("wtns"), 0); // Magic "r1cs"

    let p = 4;
    await writeU32(1); // Version

    const n8 = (Math.floor( (Scalar.bitLength(prime) - 1) / 64) +1)*8;

    await writeU32(n8);
    await writeBigInt(prime);

    assert(witnessBin.length % n8 == 0);

    await writeU32(witnessBin.length / n8);

    await fd.write(witnessBin, p);

    await fd.close();


    async function writeU32(v, pos) {
        let o = (typeof pos == "undefined") ? p : pos;

        const b = Buffer.allocUnsafe(4);
        b.writeInt32LE(v);

        await fd.write(b, o);

        if (typeof(pos) == "undefined") p += 4;
    }

    async function writeBigInt(n, pos) {

        let o = (typeof pos == "undefined") ? p : pos;

        const s = n.toString(16);
        const b = Buffer.from(s.padStart(n8*2, "0"), "hex");
        const buff = Buffer.allocUnsafe(b.length);
        for (let i=0; i<b.length; i++) buff[i] = b[b.length-1-i];

        await fd.write(buff, o);

        if (typeof(pos) == "undefined") p += n8;
    }
};




module.exports.read = async function writeZKey(fileName) {

    const res = [];
    const fd = await fastFile.readExisting(fileName);

    const b = await fd.read(0, 4);

    if (b.toString() != "wtns") assert(false, "Invalid File format");

    let p=4;

    let v = await readU32();

    if (v>1) assert(false, "Version not supported");

    const n8 = await readU32();
    await readBigInt();

    const nWitness = await readU32();

    for (let i=0; i<nWitness; i++) {
        const v = await readBigInt();
        res.push(v);
    }

    return res;


    async function readU32() {
        const b = await fd.read(p, 4);

        p+=4;

        return b.readUInt32LE(0);
    }

    async function readBigInt() {
        const buff = await fd.read(p, n8);
        assert(buff.length == n8);
        const buffR = Buffer.allocUnsafe(n8);
        for (let i=0; i<n8; i++) buffR[i] = buff[n8-1-i];

        p += n8;

        return Scalar.fromString(buffR.toString("hex"), 16);
    }
};
