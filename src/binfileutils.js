const Scalar = require("ffjavascript").Scalar;
const fastFile = require("fastfile");
const assert = require("assert");

async function readBinFile(fileName, type, maxVersion) {

    const fd = await fastFile.readExisting(fileName);

    const b = await fd.read(4);
    let readedType = "";
    for (let i=0; i<4; i++) readedType += String.fromCharCode(b[i]);

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
    await fd.write(buff, 0); // Magic "r1cs"

    await fd.writeULE32(version); // Version
    await fd.writeULE32(nSections); // Number of Sections

    return fd;
}

async function startWriteSection(fd, idSection) {
    assert(typeof fd.writingSection === "undefined", "Already writing a section");
    await fd.writeULE32(idSection); // Header type
    fd.writingSection = {
        pSectionSize: fd.pos
    };
    await fd.writeULE64(0); // Temporally set to 0 length
}

async function endWriteSection(fd) {
    assert(typeof fd.writingSection != "undefined", "Not writing a section");

    const sectionSize = fd.pos - fd.writingSection.pSectionSize - 8;
    const oldPos = fd.pos;
    fd.pos = fd.writingSection.pSectionSize;
    fd.writeULE64(sectionSize);
    fd.pos = oldPos;
    delete fd.writingSection;
}

async function startReadUniqueSection(fd, sections, idSection) {
    assert(typeof fd.readingSection === "undefined", "Already reading a section");
    if (!sections[idSection])  assert(false, fd.fileName + ": Missing section "+ idSection );
    if (sections[idSection].length>1) assert(false, fd.fileName +": Section Duplicated " +idSection);

    fd.pos = sections[idSection][0].p;

    fd.readingSection = sections[idSection][0];
}

async function endReadSection(fd, noCheck) {
    assert(typeof fd.readingSection != "undefined", "Not reading a section");
    if (!noCheck) {
        assert.equal(fd.pos-fd.readingSection.p, fd.readingSection.size);
    }
    delete fd.readingSection;
}

async function writeBigInt(fd, n, n8, pos) {
    const buff = new Uint8Array(n8);
    Scalar.toRprLE(buff, 0, n, n8);
    await fd.write(buff, pos);
}

async function readBigInt(fd, n8, pos) {
    const buff = await fd.read(n8, pos);
    return Scalar.fromRprLE(buff, 0, n8);
}

async function copySection(fdFrom, sections, fdTo, sectionId) {
    const chunkSize = fdFrom.pageSize;
    await startReadUniqueSection(fdFrom, sections, sectionId);
    await startWriteSection(fdTo, sectionId);
    for (let p=0; p<sections[sectionId][0].size; p+=chunkSize) {
        const l = Math.min(sections[sectionId][0].size -p, chunkSize);
        const buff = await fdFrom.read(l);
        await fdTo.write(buff);
    }
    await endWriteSection(fdTo);
    await endReadSection(fdFrom);

}

async function readFullSection(fd, sections, idSection) {
    await startReadUniqueSection(fd, sections, idSection);
    const res = await fd.read(fd.readingSection.size);
    await endReadSection(fd);
    return res;
}



module.exports.readBinFile = readBinFile;
module.exports.createBinFile = createBinFile;
module.exports.writeBigInt = writeBigInt;
module.exports.readBigInt = readBigInt;
module.exports.startWriteSection = startWriteSection;
module.exports.endWriteSection = endWriteSection;
module.exports.startReadUniqueSection = startReadUniqueSection;
module.exports.endReadSection = endReadSection;
module.exports.copySection = copySection;
module.exports.readFullSection = readFullSection;
