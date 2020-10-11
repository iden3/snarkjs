// Format of the outpu
//     Hash of the last contribution  64Bytes
//     2^N * 2 -1  TauG1 points (uncompressed)
//     2^N  TauG2 Points (uncompressed)
//     2^N  AlphaTauG1 Points (uncompressed)
//     2^N  BetaTauG1 Points (uncompressed)
//     BetaG2 (uncompressed)

import * as fastFile from "fastfile";
import Blake2b from "blake2b-wasm";
import * as utils from "./powersoftau_utils.js";
import * as binFileUtils from "@iden3/binfileutils";
import * as misc from "./misc.js";

export default async function exportChallenge(pTauFilename, challengeFilename, logger) {
    await Blake2b.ready();
    const {fd: fdFrom, sections} = await binFileUtils.readBinFile(pTauFilename, "ptau", 1);

    const {curve, power} = await utils.readPTauHeader(fdFrom, sections);

    const contributions = await utils.readContributions(fdFrom, curve, sections);
    let lastResponseHash, curChallengeHash;
    if (contributions.length == 0) {
        lastResponseHash = Blake2b(64).digest();
        curChallengeHash = utils.calculateFirstChallengeHash(curve, power);
    } else {
        lastResponseHash = contributions[contributions.length-1].responseHash;
        curChallengeHash = contributions[contributions.length-1].nextChallenge;
    }

    if (logger) logger.info(misc.formatHash(lastResponseHash, "Last Response Hash: "));

    if (logger) logger.info(misc.formatHash(curChallengeHash, "New Challenge Hash: "));


    const fdTo = await fastFile.createOverride(challengeFilename);

    const toHash = Blake2b(64);
    await fdTo.write(lastResponseHash);
    toHash.update(lastResponseHash);

    await exportSection(2, "G1", (2 ** power) * 2 -1, "tauG1");
    await exportSection(3, "G2", (2 ** power)       , "tauG2");
    await exportSection(4, "G1", (2 ** power)       , "alphaTauG1");
    await exportSection(5, "G1", (2 ** power)       , "betaTauG1");
    await exportSection(6, "G2", 1                  , "betaG2");

    await fdFrom.close();
    await fdTo.close();

    const calcCurChallengeHash = toHash.digest();

    if (!misc.hashIsEqual (curChallengeHash, calcCurChallengeHash)) {
        if (logger) logger.info(misc.formatHash(calcCurChallengeHash, "Calc Curret Challenge Hash: "));

        if (logger) logger.error("PTau file is corrupted. Calculated new challenge hash does not match with the eclared one");
        throw new Error("PTau file is corrupted. Calculated new challenge hash does not match with the eclared one");
    }

    return curChallengeHash;

    async function exportSection(sectionId, groupName, nPoints, sectionName) {
        const G = curve[groupName];
        const sG = G.F.n8*2;
        const nPointsChunk = Math.floor((1<<24)/sG);

        await binFileUtils.startReadUniqueSection(fdFrom, sections, sectionId);
        for (let i=0; i< nPoints; i+= nPointsChunk) {
            if (logger) logger.debug(`Exporting ${sectionName}: ${i}/${nPoints}`);
            const n = Math.min(nPoints-i, nPointsChunk);
            let buff;
            buff = await fdFrom.read(n*sG);
            buff = await G.batchLEMtoU(buff);
            await fdTo.write(buff);
            toHash.update(buff);
        }
        await binFileUtils.endReadSection(fdFrom);
    }


}

