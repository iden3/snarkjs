const assert = require("assert");
const fastFile = require("fastfile");
const Blake2b = require("blake2b-wasm");
const fs = require("fs");
const utils = require("./powersoftau_utils");

async function importResponse(oldPtauFilename, contributionFilename, newPTauFilename, name, importPoints, verbose) {

    await Blake2b.ready();

    const {fd: fdOld, sections} = await utils.readBinFile(oldPtauFilename, "ptau", 1);
    const {curve, power} = await utils.readPTauHeader(fdOld, sections);
    const contributions = await utils.readContributions(fdOld, curve, sections);
    const currentContribution = {};

    const sG1 = curve.F1.n8*2;
    const scG1 = curve.F1.n8; // Compresed size
    const sG2 = curve.F2.n8*2;
    const scG2 = curve.F2.n8; // Compresed size

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

    let lastChallangeHash;

    if (contributions.length>0) {
        lastChallangeHash = contributions[contributions.length-1].nextChallange;
    } else {
        lastChallangeHash = utils.calculateFirstChallangeHash(curve, power);
    }

    const fdNew = await utils.createBinFile(newPTauFilename, "ptau", 1, 7);
    await utils.writePTauHeader(fdNew, curve, power);

    const fdResponse = await fastFile.readExisting(contributionFilename);
    const contributionPreviousHash = await fdResponse.read(64);

    assert(utils.hashIsEqual(contributionPreviousHash,lastChallangeHash),
        "Wrong contribution. this contribution is not based on the previus hash");

    const hasherResponse = new Blake2b(64);
    hasherResponse.update(new Uint8Array(contributionPreviousHash));

    const hasherNewChallange = new Blake2b(64);
    hasherNewChallange.update(lastChallangeHash);

    await processSection(fdResponse, fdNew, 2, (1 << power) * 2 -1, "G1", "tauG1", 1);
    await processSection(fdResponse, fdNew, 3, (1 << power)       , "G2", "tauG2", 1);
    await processSection(fdResponse, fdNew, 4, (1 << power)       , "G1", "alphaG1", 0);
    await processSection(fdResponse, fdNew, 5, (1 << power)       , "G1", "betaG1", 0);
    await processSection(fdResponse, fdNew, 6, 1                  , "G2", "betaG2", 0);

    currentContribution.nextChallange = hasherNewChallange.digest();
    currentContribution.partialHash = hasherResponse.getPartialHash();


    const buffKey = await fdResponse.read(curve.F1.n8*2*6+curve.F2.n8*2*3);

    currentContribution.key = utils.fromPtauPubKeyRpr(buffKey, 0, curve, false);

    hasherResponse.update(new Uint8Array(buffKey));
    const hashResponse = hasherResponse.digest();

    if (verbose) {
        console.log("Contribution Response Hash imported: ");
        console.log(utils.formatHash(hashResponse));
    }

    contributions.push(currentContribution);

    await utils.writeContributions(fdNew, curve, contributions);

    await fdResponse.close();
    await fdNew.close();
    await fdOld.close();

    async function processSection(fdFrom, fdTo, sectionId, n, G, name, contributionId) {

        const buffU = new ArrayBuffer(curve[G].F.n8*2);
        const buffUv = new Uint8Array(buffU);
        const scG = curve[G].F.n8;

        await fdTo.writeULE32(sectionId); // tauG1
        const pSection = fdTo.pos;
        await fdTo.writeULE64(0); // Temporally set to 0 length
        for (let i=0; i< n; i++) {
            const buffC = await fdFrom.read(scG);
            hasherResponse.update(new Uint8Array(buffC));
            const P = curve[G].fromRprCompressed(buffC);
            if (i==contributionId) currentContribution[name] = P;
            curve[G].toRprBE(buffU, 0, P);
            hasherNewChallange.update(buffUv);
            curve[G].toRprLEM(buffU, 0, P);
            await fdTo.write(buffU);
            if ((verbose)&&((i%100000) == 0)&&i) console.log(name +": " + i);
        }
        const sSize  = fdTo.pos - pSection -8;
        const lastPos = fdTo.pos;
        await fdTo.writeULE64(sSize, pSection);
        fdTo.pos = lastPos;
    }
}

module.exports = importResponse;
