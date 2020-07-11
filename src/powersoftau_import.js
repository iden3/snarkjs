import * as fastFile from "fastfile";
import Blake2b from "blake2b-wasm";
import * as utils from "./powersoftau_utils.js";
import * as binFileUtils from "./binfileutils.js";
import * as misc from "./misc.js";

export default async function importResponse(oldPtauFilename, contributionFilename, newPTauFilename, name, importPoints, logger) {

    await Blake2b.ready();

    const {fd: fdOld, sections} = await binFileUtils.readBinFile(oldPtauFilename, "ptau", 1);
    const {curve, power} = await utils.readPTauHeader(fdOld, sections);
    const contributions = await utils.readContributions(fdOld, curve, sections);
    const currentContribution = {};

    if (name) currentContribution.name = name;

    const sG1 = curve.F1.n8*2;
    const scG1 = curve.F1.n8; // Compresed size
    const sG2 = curve.F2.n8*2;
    const scG2 = curve.F2.n8; // Compresed size

    const fdResponse = await fastFile.readExisting(contributionFilename);

    if  (fdResponse.totalSize !=
        64 +                            // Old Hash
        ((1<<power)*2-1)*scG1 +
        (1<<power)*scG2 +
        (1<<power)*scG1 +
        (1<<power)*scG1 +
        scG2 +
        sG1*6 + sG2*3)
        throw new Error("Size of the contribution is invalid");

    let lastChallangeHash;

    if (contributions.length>0) {
        lastChallangeHash = contributions[contributions.length-1].nextChallange;
    } else {
        lastChallangeHash = utils.calculateFirstChallangeHash(curve, power, logger);
    }

    const fdNew = await binFileUtils.createBinFile(newPTauFilename, "ptau", 1, 7);
    await utils.writePTauHeader(fdNew, curve, power);

    const contributionPreviousHash = await fdResponse.read(64);

    if(!misc.hashIsEqual(contributionPreviousHash,lastChallangeHash))
        throw new Error("Wrong contribution. this contribution is not based on the previus hash");

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

    if (logger) logger.info(misc.formatHash(hashResponse, "Contribution Response Hash imported: "));

    const nextChallangeHasher = new Blake2b(64);
    nextChallangeHasher.update(hashResponse);

    await hashSection(fdNew, "G1", 2, (1 << power) * 2 -1, "tauG1", logger);
    await hashSection(fdNew, "G2", 3, (1 << power)       , "tauG2", logger);
    await hashSection(fdNew, "G1", 4, (1 << power)       , "alphaTauG1", logger);
    await hashSection(fdNew, "G1", 5, (1 << power)       , "betaTauG1", logger);
    await hashSection(fdNew, "G2", 6, 1                  , "betaG2", logger);

    currentContribution.nextChallange = nextChallangeHasher.digest();

    if (logger) logger.info(misc.formatHash(currentContribution.nextChallange, "Next Challange Hash: "));

    contributions.push(currentContribution);

    await utils.writeContributions(fdNew, curve, contributions);

    await fdResponse.close();
    await fdNew.close();
    await fdOld.close();

    return currentContribution.nextChallange;

    async function processSection(fdFrom, fdTo, groupName, sectionId, nPoints, singularPointIndexes, sectionName) {

        const G = curve[groupName];
        const scG = G.F.n8;
        const sG = G.F.n8*2;

        const singularPoints = [];

        await binFileUtils.startWriteSection(fdTo, sectionId);
        const nPointsChunk = Math.floor((1<<24)/sG);

        startSections[sectionId] = fdTo.pos;

        for (let i=0; i< nPoints; i += nPointsChunk) {
            if (logger) logger.debug(`Importing ${sectionName}: ${i}/${nPoints}`);
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


    async function hashSection(fdTo, groupName, sectionId, nPoints, sectionName, logger) {

        const G = curve[groupName];
        const sG = G.F.n8*2;
        const nPointsChunk = Math.floor((1<<24)/sG);

        const oldPos = fdTo.pos;
        fdTo.pos = startSections[sectionId];

        for (let i=0; i< nPoints; i += nPointsChunk) {
            if (logger) logger.debug(`Hashing ${sectionName}: ${i}/${nPoints}`);
            const n = Math.min(nPoints-i, nPointsChunk);

            const buffLEM = await fdTo.read(n * sG);

            const buffU = await G.batchLEMtoU(buffLEM);

            nextChallangeHasher.update(buffU);
        }

        fdTo.pos = oldPos;
    }

}

