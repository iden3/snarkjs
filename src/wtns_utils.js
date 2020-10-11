import { Scalar } from "ffjavascript";

import * as binFileUtils from "@iden3/binfileutils";


export async function write(fd, witness, prime) {

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


}

export async function writeBin(fd, witnessBin, prime) {

    await binFileUtils.startWriteSection(fd, 1);
    const n8 = (Math.floor( (Scalar.bitLength(prime) - 1) / 64) +1)*8;
    await fd.writeULE32(n8);
    await binFileUtils.writeBigInt(fd, prime, n8);
    if (witnessBin.byteLength % n8 != 0) {
        throw new Error("Invalid witness length");
    }
    await fd.writeULE32(witnessBin.byteLength / n8);
    await binFileUtils.endWriteSection(fd);


    await binFileUtils.startWriteSection(fd, 2);
    await fd.write(witnessBin);
    await binFileUtils.endWriteSection(fd);

}

export async function readHeader(fd, sections) {

    await binFileUtils.startReadUniqueSection(fd, sections, 1);
    const n8 = await fd.readULE32();
    const q = await binFileUtils.readBigInt(fd, n8);
    const nWitness = await fd.readULE32();
    await binFileUtils.endReadSection(fd);

    return {n8, q, nWitness};

}

export async function read(fileName) {

    const {fd, sections} = await binFileUtils.readBinFile(fileName, "wtns", 2);

    const {n8, nWitness} = await readHeader(fd, sections);

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

