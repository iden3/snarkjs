
const assert = require("assert");
const fastFile = require("fastfile");
const Scalar = require("Scalar");
const bn128 = require("ffjavascript").bn128;
const Blake2 = require("blake2");
const fs = require("fs");


async function importResponse(oldPtauFilename, contributionFilename, newPotFilename, verbose) {
    const fdOld = await fastFile.readExisting(oldPtauFilename);

    const b = await fdOld.read(4);

    if (b.toString() != "ptau") assert(false, "Old ptau file: invalid format.");

    let v = await fdOld.readULE32();

    if (v>1) assert(false, "Old ptau file: Version not supported");

    const nSections = await fdOld.readULE32();

    // Scan sections
    let sections = [];
    for (let i=0; i<nSections; i++) {
        let ht = await fdOld.readULE32();
        let hl = await fdOld.readULE64();
        if (typeof sections[ht] == "undefined") sections[ht] = [];
        sections[ht].push({
            p: fdOld.pos,
            size: hl
        });
        fdOld.pos += hl;
    }

    if (!sections[1])  assert(false, "Old ptau file: File has no  header");
    if (sections[1].length>1) assert(false, "Old ptau file: File has more than one header");

    fdOld.pos = sections[1][0].p;
    const n8 = await fdOld.readULE32();
    const qBuff = await fdOld.read(n8);
    const q = Scalar.fromRprLE(qBuff);
    let curve;
    if (Scalar.eq(q, bn128.q)) {
        curve = bn128;
    } else {
        assert(false, "Old ptau file: Curve not supported");
    }
    assert(curve.F1.n64*8 == n8, "Old ptau file: Invalid size");

    const power = await fdOld.readULE32();
    const nContributions = await fdOld.readULE32();
    const sG1 = curve.F1.n64*8*2;
    const scG1 = curve.F1.n64*8; // Compresed size
    const sG2 = curve.F2.n64*8*2;
    const scG2 = curve.F2.n64*8; // Compresed size


    let stats = await fs.promises.stat(contributionFilename);
    assert.equal(stats.size,
        64 +                            // Old Hash
        ((1<<power)*2-1)*scG1 +
        (1<<power)*scG2 +
        (1<<power)*scG1 +
        (1<<power)*scG1 +
        scG2 +
        sG1*6 + sG2*3,
        "Size of the contribution is invalid"
    );

    const fdNew = await fastFile.createOverride(newPotFilename);

    await fdNew.write(Buffer.from("ptau"), 0); // Magic "r1cs"

    await fd.writeULE32(1); // Version
    await fd.writeULE32(7); // Number of Sections

    // Write the header
    ///////////
    await fd.writeULE32(1); // Header type
    const pHeaderSize = fd.pos;
    await fd.writeULE64(0); // Temporally set to 0 length

    const primeQ = curve.q;

    await fd.writeULE32(curve.F1.n64*8);
    await fd.write(Scalar.toRprLE(primeQ, curve.F1.n64*8));
    await fd.writeULE32(power);                    // power
    await fd.writeULE32(0);                       // Total number of public contributions

    const headerSize = fd.pos - pHeaderSize - 8;




    const fdResponse = await fastFile.readExisting(contributionFilename);
    const hasherResponse = new Blake2(64);
    const contributionPreviousHash = await fdResponse.read(64);
    hasherResponse.update(contributionPreviousHash);




}

module.exports = importResponse;
