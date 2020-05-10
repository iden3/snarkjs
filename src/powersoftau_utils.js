const fastFile = require("fastfile");
const assert = require("assert");

async function readBinFile(fileName, type, maxVersion) {

    const fd = await fastFile.readExisting(fileName);

    const b = await fd.read(4);

    if (b.toString() != type) assert(false, fileName + ": Invalid File format");

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

    return sections;
}

function writeBinFile(fileName, type, version, nSections) {

}

function writePTauHeader(fd, curve, power, nContributions) {

}

function readPTauHeader(fd) {

}
