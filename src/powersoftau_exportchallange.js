// Format of the outpu
//     Hash of the last contribution  64Bytes
//     2^N * 2 -1  TauG1 points (uncompressed)
//     2^N  TauG2 Points (uncompressed)
//     2^N  AlphaTauG1 Points (uncompressed)
//     2^N  BetaTauG1 Points (uncompressed)
//     BetaG2 (uncompressed)

const fastFile = require("fastfile");
const Blake2b = require("blake2b-wasm");
const utils = require("./powersoftau_utils");
const binFileUtils = require("./binfileutils");
const misc = require("./misc");

async function exportChallange(pTauFilename, challangeFilename, verbose) {
    await Blake2b.ready();
    const {fd: fdFrom, sections} = await binFileUtils.readBinFile(pTauFilename, "ptau", 1);

    const {curve, power} = await utils.readPTauHeader(fdFrom, sections);

    const contributions = await utils.readContributions(fdFrom, curve, sections);
    let lastResponseHash, curChallangeHash;
    if (contributions.length == 0) {
        lastResponseHash = Blake2b(64).digest();
        curChallangeHash = utils.calculateFirstChallangeHash(curve, power);
    } else {
        lastResponseHash = contributions[contributions.length-1].responseHash;
        curChallangeHash = contributions[contributions.length-1].nextChallange;
    }

    console.log("Last Response Hash: ");
    console.log(misc.formatHash(lastResponseHash));

    console.log("New Challange Hash: ");
    console.log(misc.formatHash(curChallangeHash));


    const fdTo = await fastFile.createOverride(challangeFilename);

    const toHash = Blake2b(64);
    await fdTo.write(lastResponseHash);
    toHash.update(lastResponseHash);

    await exportSection(2, "G1", (1 << power) * 2 -1, "tauG1");
    await exportSection(3, "G2", (1 << power)       , "tauG2");
    await exportSection(4, "G1", (1 << power)       , "alphaTauG1");
    await exportSection(5, "G1", (1 << power)       , "betaTauG1");
    await exportSection(6, "G2", 1                  , "betaG2");

    await fdFrom.close();
    await fdTo.close();

    const calcCurChallangeHash = toHash.digest();

    if (!misc.hashIsEqual (curChallangeHash, calcCurChallangeHash)) {
        console.log("Calc Curret Challange Hash: ");
        console.log(misc.formatHash(calcCurChallangeHash));

        throw new Error("PTau file is corrupted. Calculated new challange hash does not match with the eclared one");
    }

    async function exportSection(sectionId, groupName, nPoints, sectionName) {
        const G = curve[groupName];
        const sG = G.F.n8*2;
        const nPointsChunk = Math.floor((1<<24)/sG);

        await binFileUtils.startReadUniqueSection(fdFrom, sections, sectionId);
        for (let i=0; i< nPoints; i+= nPointsChunk) {
            if ((verbose)&&i) console.log(`${sectionName}: ` + i);
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

module.exports = exportChallange;
