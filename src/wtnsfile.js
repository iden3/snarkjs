const Scalar = require("ffjavascript").Scalar;
const assert = require("assert");
const binFileUtils = require("./binfileutils");


async function writeWtns(fileName, witness, prime) {

    const fd = await binFileUtils.createOverride(fileName,"wtns", 2, 2);

    await binFileUtils.startWriteSection(fd, 1);
    const n8 = (Math.floor( (Scalar.bitLength(prime) - 1) / 64) +1)*8;
    await fd.writeULE32(n8);
    await binFileUtils.writeBigInt(fd, prime, n8);
    await fd.writeULE32(witness.length);
    await binFileUtils.endWriteSection(fd);

    await binFileUtils.startWriteSection(fd, 2);
    for (let i=0; i<witness.length; i++) {
        await binFileUtils.writeBigInt(fd, witness[i], n8);
    }
    await binFileUtils.endWriteSection(fd, 2);

    await fd.close();

}

async function writeWtnsBin(fileName, witnessBin, prime) {

    witnessBin = Buffer.from(witnessBin);

    const fd = await binFileUtils.createBinFile(fileName, "wtns", 2, 2);

    await binFileUtils.startWriteSection(fd, 1);
    const n8 = (Math.floor( (Scalar.bitLength(prime) - 1) / 64) +1)*8;
    await fd.writeULE32(n8);
    await binFileUtils.writeBigInt(fd, prime, n8);
    assert(witnessBin.length % n8 == 0);
    await fd.writeULE32(witnessBin.byteLength / n8);
    await binFileUtils.endWriteSection(fd);


    await binFileUtils.startWriteSection(fd, 2);
    await fd.write(witnessBin);
    await binFileUtils.endWriteSection(fd);

    await fd.close();
}

async function readWtnsHeader(fd, sections) {

    await binFileUtils.startReadUniqueSection(fd, sections, 1);
    const n8 = await fd.readULE32();
    const q = await binFileUtils.readBigInt(fd, n8);
    const nWitness = await fd.readULE32();
    await binFileUtils.endReadSection(fd);

    return {n8, q, nWitness};

}

async function readWtns(fileName) {

    const {fd, sections} = await binFileUtils.readBinFile(fileName, "wtns", 2);

    const {n8, nWitness} = await readWtnsHeader(fd, sections);

    await binFileUtils.startReadUniqueSection(fd, sections, 2);
    const res = [];
    for (let i=0; i<nWitness; i++) {
        const v = await binFileUtils.readBigInt(fd, n8);
        res.push(v);
    }
    await binFileUtils.endReadSection(fd);

    await fd.close();

    return res;
}

module.exports.read = readWtns;
module.exports.readHeader = readWtnsHeader;
module.exports.writeBin = writeWtnsBin;
module.exports.write = writeWtns;
