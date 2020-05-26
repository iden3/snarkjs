const assert = require("assert");
const fastFile = require("fastfile");
const Blake2b = require("blake2b-wasm");
const fs = require("fs");
const utils = require("./powersoftau_utils");
const binFileUtils = require("./binfileutils");

async function importResponse(oldPtauFilename, contributionFilename, newPTauFilename, name, importPoints, verbose) {

    await Blake2b.ready();

    const {fd: fdOld, sections} = await binFileUtils.readBinFile(oldPtauFilename, "ptau", 1);
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

    const fdNew = await binFileUtils.createBinFile(newPTauFilename, "ptau", 1, 7);
    await utils.writePTauHeader(fdNew, curve, power);

    const fdResponse = await fastFile.readExisting(contributionFilename);
    const contributionPreviousHash = await fdResponse.read(64);

    assert(utils.hashIsEqual(contributionPreviousHash,lastChallangeHash),
        "Wrong contribution. this contribution is not based on the previus hash");

    const hasherResponse = new Blake2b(64);
    hasherResponse.update(contributionPreviousHash);

    const startSections = [];
    let res;
    res = await processSection(fdResponse, fdNew, "G1", 2, (1 << power) * 2 -1, [1], "tauG1");
    currentContribution.tauG1 = res[0];
    res = await processSection(fdResponse, fdNew, "G2", 3, (1 << power)       , [1], "tauG2");
    currentContribution.tauG2 = res[0];
    res = await processSection(fdResponse, fdNew, "G1", 4, (1 << power)       , [0], "alphaG1");
    currentContribution.alphaG1 = res[0];
    res = await processSection(fdResponse, fdNew, "G1", 5, (1 << power)       , [0], "betaG1");
    currentContribution.betaG1 = res[0];
    res = await processSection(fdResponse, fdNew, "G2", 6, 1                  , [0], "betaG2");
    currentContribution.betaG2 = res[0];

    currentContribution.partialHash = hasherResponse.getPartialHash();


    const buffKey = await fdResponse.read(curve.F1.n8*2*6+curve.F2.n8*2*3);

    currentContribution.key = utils.fromPtauPubKeyRpr(buffKey, 0, curve, false);

    hasherResponse.update(new Uint8Array(buffKey));
    const hashResponse = hasherResponse.digest();

    console.log("Contribution Response Hash imported: ");
    console.log(utils.formatHash(hashResponse));

    const nextChallangeHasher = new Blake2b(64);
    nextChallangeHasher.update(hashResponse);

    await hashSection(fdNew, "G1", 2, (1 << power) * 2 -1, "tauG1");
    await hashSection(fdNew, "G2", 3, (1 << power)       , "tauG2");
    await hashSection(fdNew, "G1", 4, (1 << power)       , "alphaTauG1");
    await hashSection(fdNew, "G1", 5, (1 << power)       , "betaTauG1");
    await hashSection(fdNew, "G2", 6, 1                  , "betaG2");

    currentContribution.nextChallange = nextChallangeHasher.digest();

    console.log("Next Challange Hash: ");
    console.log(utils.formatHash(currentContribution.nextChallange));

    contributions.push(currentContribution);

    await utils.writeContributions(fdNew, curve, contributions);

    await fdResponse.close();
    await fdNew.close();
    await fdOld.close();

    async function processSection(fdFrom, fdTo, groupName, sectionId, nPoints, singularPointIndexes, sectionName) {

        const G = curve[groupName];
        const scG = G.F.n8;
        const sG = G.F.n8*2;

        const singularPoints = [];

        await binFileUtils.startWriteSection(fdTo, sectionId);
        const nPointsChunk = Math.floor((1<<27)/sG);

        startSections[sectionId] = fdTo.pos;

        for (let i=0; i< nPoints; i += nPointsChunk) {
            if ((verbose)&&i) console.log(`Importing ${sectionName}: ` + i);
            const n = Math.min(nPoints-i, nPointsChunk);

            const buffC = await fdFrom.read(n * scG);
            hasherResponse.update(buffC);

            const buffLEM = await G.batchCtoLEM(buffC);

            await fdTo.write(buffLEM);
            for (let j=0; j<singularPointIndexes.length; j++) {
                const sp = singularPointIndexes[j];
                if ((sp >=i) && (sp < i+n)) {
                    const P = G.fromRprLEM(buffLEM, (sp-i)*sG);
                    singularPoints.push(P);
                }
            }
        }

        await binFileUtils.endWriteSection(fdTo);

        return singularPoints;
    }


    async function hashSection(fdTo, groupName, sectionId, nPoints, sectionName) {

        const G = curve[groupName];
        const sG = G.F.n8*2;
        const nPointsChunk = Math.floor((1<<27)/sG);

        const oldPos = fdTo.pos;
        fdTo.pos = startSections[sectionId];

        for (let i=0; i< nPoints; i += nPointsChunk) {
            if ((verbose)&&i) console.log(`Hashing ${sectionName}: ` + i);
            const n = Math.min(nPoints-i, nPointsChunk);

            const buffLEM = await fdTo.read(n * sG);

            const buffU = await G.batchLEMtoU(buffLEM);

            nextChallangeHasher.update(buffU);
        }

        fdTo.pos = oldPos;
    }

}

module.exports = importResponse;
