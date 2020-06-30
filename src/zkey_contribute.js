
const binFileUtils = require("./binfileutils");
const zkeyUtils = require("./zkey_utils");
const getCurve = require("./curves").getCurveFromQ;
const misc = require("./misc");
const Blake2b = require("blake2b-wasm");
const utils = require("./zkey_utils");
const hashToG2 = require("./keypair").hashToG2;
const {applyKeyToSection} = require("./mpc_applykey");

module.exports  = async function phase2contribute(zkeyNameOld, zkeyNameNew, name, entropy, verbose) {
    await Blake2b.ready();

    const {fd: fdOld, sections: sections} = await binFileUtils.readBinFile(zkeyNameOld, "zkey", 2);
    const zkey = await zkeyUtils.readHeader(fdOld, sections, "groth16");

    const curve = getCurve(zkey.q);
    await curve.loadEngine();

    const mpcParams = await zkeyUtils.readMPCParams(fdOld, curve, sections);

    const fdNew = await binFileUtils.createBinFile(zkeyNameNew, "zkey", 1, 10);


    const rng = await misc.getRandomRng(entropy);

    const transcriptHasher = Blake2b(64);
    transcriptHasher.update(mpcParams.csHash);
    for (let i=0; i<mpcParams.contributions.length; i++) {
        utils.hashPubKey(transcriptHasher, curve, mpcParams.contributions[i]);
    }

    const curContribution = {};
    curContribution.delta = {};
    curContribution.delta.prvKey = curve.Fr.fromRng(rng);
    curContribution.delta.g1_s = curve.G1.toAffine(curve.G1.fromRng(rng));
    curContribution.delta.g1_sx = curve.G1.toAffine(curve.G1.timesScalar(curContribution.delta.g1_s, curContribution.delta.prvKey));
    utils.hashG1(transcriptHasher, curve, curContribution.delta.g1_s);
    utils.hashG1(transcriptHasher, curve, curContribution.delta.g1_sx);
    curContribution.transcript = transcriptHasher.digest();
    curContribution.delta.g2_sp = hashToG2(curve, curContribution.transcript);
    curContribution.delta.g2_spx = curve.G2.toAffine(curve.G2.timesScalar(curContribution.delta.g2_sp, curContribution.delta.prvKey));

    zkey.vk_delta_1 = curve.G1.timesScalar(zkey.vk_delta_1, curContribution.delta.prvKey);
    zkey.vk_delta_2 = curve.G2.timesScalar(zkey.vk_delta_2, curContribution.delta.prvKey);

    curContribution.deltaAfter = zkey.vk_delta_1;

    curContribution.type = 0;
    if (name) curContribution.name = name;

    mpcParams.contributions.push(curContribution);

    await zkeyUtils.writeHeader(fdNew, zkey);

    // IC
    await binFileUtils.copySection(fdOld, sections, fdNew, 3);

    // Coeffs (Keep original)
    await binFileUtils.copySection(fdOld, sections, fdNew, 4);

    // A Section
    await binFileUtils.copySection(fdOld, sections, fdNew, 5);

    // B1 Section
    await binFileUtils.copySection(fdOld, sections, fdNew, 6);

    // B2 Section
    await binFileUtils.copySection(fdOld, sections, fdNew, 7);

    const invDelta = curve.Fr.inv(curContribution.delta.prvKey);
    await applyKeyToSection(fdOld, sections, fdNew, 8, curve, "G1", invDelta, curve.Fr.e(1), "L Section", verbose);
    await applyKeyToSection(fdOld, sections, fdNew, 9, curve, "G1", invDelta, curve.Fr.e(1), "H Section", verbose);

    await zkeyUtils.writeMPCParams(fdNew, curve, mpcParams);

    await fdOld.close();
    await fdNew.close();

    const contributionHasher = Blake2b(64);
    utils.hashPubKey(contributionHasher, curve, curContribution);

    const contribuionHash = contributionHasher.digest();

    console.log("Contribution Hash: ");
    console.log(misc.formatHash(contribuionHash));

    return true;
};
