const binFileUtils = require("./binfileutils");
const zkeyUtils = require("./zkey_utils");
const getCurve = require("./curves").getCurveFromQ;
const {stringifyBigInts} = require("ffjavascript").utils;
const fs = require("fs");

module.exports  = async function zkeyExportVerificationKey(zkeyName, verificationKeyName) {

    const {fd, sections} = await binFileUtils.readBinFile(zkeyName, "zkey", 2);
    const zkey = await zkeyUtils.readHeader(fd, sections, "groth16");

    const curve = await getCurve(zkey.q);
    const sG1 = curve.G1.F.n8*2;

    const alphaBeta = await curve.pairing( zkey.vk_alpha_1 , zkey.vk_beta_2 );

    const vKey = {
        protocol: zkey.protocol,
        curve: curve.name,
        nPublic: zkey.nPublic,

        vk_alpha_1: curve.G1.toObject(zkey.vk_alpha_1),

        vk_beta_2: curve.G2.toObject(zkey.vk_beta_2),
        vk_gamma_2:  curve.G2.toObject(zkey.vk_gamma_2),
        vk_delta_2:  curve.G2.toObject(zkey.vk_delta_2),

        vk_alphabeta_12: curve.Gt.toObject(alphaBeta)
    };

    // Read IC Section
    ///////////
    await binFileUtils.startReadUniqueSection(fd, sections, 3);
    vKey.IC = [];
    for (let i=0; i<= zkey.nPublic; i++) {
        const buff = await fd.read(sG1);
        const P = curve.G1.toObject(buff);
        vKey.IC.push(P);
    }
    await binFileUtils.endReadSection(fd);

    await fs.promises.writeFile(verificationKeyName, JSON.stringify(stringifyBigInts(vKey), null, 1), "utf-8");
};
