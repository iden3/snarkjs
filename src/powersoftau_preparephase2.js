const binFileUtils = require("./binfileutils");
const utils = require("./powersoftau_utils");

async function preparePhase2(oldPtauFilename, newPTauFilename, verbose) {

    const {fd: fdOld, sections} = await binFileUtils.readBinFile(oldPtauFilename, "ptau", 1);
    const {curve, power} = await utils.readPTauHeader(fdOld, sections);

    const fdNew = await binFileUtils.createBinFile(newPTauFilename, "ptau", 1, 11);
    await utils.writePTauHeader(fdNew, curve, power);

    await binFileUtils.copySection(fdOld, sections, fdNew, 2);
    await binFileUtils.copySection(fdOld, sections, fdNew, 3);
    await binFileUtils.copySection(fdOld, sections, fdNew, 4);
    await binFileUtils.copySection(fdOld, sections, fdNew, 5);
    await binFileUtils.copySection(fdOld, sections, fdNew, 6);
    await binFileUtils.copySection(fdOld, sections, fdNew, 7);

    await processSection(2, 12, "G1",  (1<<power) , "tauG1" );
    await processSection(3, 13, "G2",  (1<<power) , "tauG2" );
    await processSection(4, 14, "G1",  (1<<power) , "alphaTauG1" );
    await processSection(5, 15, "G1",  (1<<power) , "betaTauG1" );

    await fdOld.close();
    await fdNew.close();

    return;

    async function processSection(oldSectionId, newSectionId, Gstr, NPoints, sectionName) {

        if (verbose) console.log("Starting section: "+sectionName);
        const G = curve[Gstr];
        const sG = G.F.n8*2;

        let buff;
        await binFileUtils.startReadUniqueSection(fdOld, sections, oldSectionId);
        buff = await fdOld.read(sG*NPoints);
        await binFileUtils.endReadSection(fdOld, true);

        buff = await G.ifft(buff, verbose ? console.log : null);

        await binFileUtils.startWriteSection(fdNew, newSectionId);
        await fdNew.write(buff);
        await binFileUtils.endWriteSection(fdNew);
    }
}

module.exports = preparePhase2;
