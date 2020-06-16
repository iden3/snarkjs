
const buildTaskManager = require("./taskmanager");
const binFileUtils = require("./binfileutils");

/*
    This function creates a new section in the fdTo file with id idSection.
    It multiplies the pooints in fdFrom by first, first*inc, first*inc^2, ....
    nPoint Times.
    It also updates the newChallangeHasher with the new points
*/

async function applyKeyToSection(fdOld, sections, fdNew, idSection, curve, groupName, first, inc, sectionName, verbose) {
    const MAX_CHUNK_SIZE = 1 << 16;
    const G = curve[groupName];
    const sG = G.F.n8*2;
    const nPoints = sections[idSection][0].size / sG;

    await binFileUtils.startReadUniqueSection(fdOld, sections,idSection );
    await binFileUtils.startWriteSection(fdNew, idSection);

    let t = first;
    for (let i=0; i<nPoints; i += MAX_CHUNK_SIZE) {
        if (verbose) console.log(`Applying key: ${sectionName}: ${i}/${nPoints}`);
        const n= Math.min(nPoints - i, MAX_CHUNK_SIZE);
        let buff;
        buff = await fdOld.read(n*sG);
        buff = await G.batchApplyKey(buff, t, inc);
        await fdNew.write(buff);
        t = curve.Fr.mul(t, curve.Fr.pow(inc, n));
    }

    await binFileUtils.endWriteSection(fdNew);
    await binFileUtils.endReadSection(fdOld);


}

async function applyKeyToBinFile(fdOld, fdNew, curve, groupName, nPoints, first, inc, sectionName, verbose) {

}


module.exports.applyKeyToBinFile = applyKeyToBinFile;
module.exports.applyKeyToSection = applyKeyToSection;
