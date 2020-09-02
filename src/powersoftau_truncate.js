
import * as binFileUtils from "./binfileutils.js";
import * as utils from "./powersoftau_utils.js";

export default async function truncate(ptauFilename, template, logger) {

    const {fd: fdOld, sections} = await binFileUtils.readBinFile(ptauFilename, "ptau", 1);
    const {curve, power, ceremonyPower} = await utils.readPTauHeader(fdOld, sections);

    const sG1 = curve.G1.F.n8*2;
    const sG2 = curve.G2.F.n8*2;

    for (let p=1; p<power; p++) {
        await generateTruncate(p);
    }

    await fdOld.close();

    return true;

    async function generateTruncate(p) {

        let sP = p.toString();
        while (sP.length<2) sP = "0" + sP;

        if (logger) logger.debug("Writing Power: "+sP);

        const fdNew = await binFileUtils.createBinFile(template + sP + ".ptau", "ptau", 1, 11);
        await utils.writePTauHeader(fdNew, curve, p, ceremonyPower);

        await binFileUtils.copySection(fdOld, sections, fdNew, 2, ((1<<p)*2-1) * sG1 ); // tagG1
        await binFileUtils.copySection(fdOld, sections, fdNew, 3, (1<<p) * sG2); // tauG2
        await binFileUtils.copySection(fdOld, sections, fdNew, 4, (1<<p) * sG1); // alfaTauG1
        await binFileUtils.copySection(fdOld, sections, fdNew, 5, (1<<p) * sG1); // betaTauG1
        await binFileUtils.copySection(fdOld, sections, fdNew, 6,  sG2); // betaTauG2
        await binFileUtils.copySection(fdOld, sections, fdNew, 7); // contributions
        await binFileUtils.copySection(fdOld, sections, fdNew, 12, ((1<<p)*2 -1) * sG1); // L_tauG1
        await binFileUtils.copySection(fdOld, sections, fdNew, 13, ((1<<p)*2 -1) * sG2); // L_tauG2
        await binFileUtils.copySection(fdOld, sections, fdNew, 14, ((1<<p)*2 -1) * sG1); // L_alfaTauG1
        await binFileUtils.copySection(fdOld, sections, fdNew, 15, ((1<<p)*2 -1) * sG1); // L_betaTauG1

        await fdNew.close();
    }


}
