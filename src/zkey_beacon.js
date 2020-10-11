import * as binFileUtils from "@iden3/binfileutils";
import * as zkeyUtils from "./zkey_utils.js";
import { getCurveFromQ as getCurve } from "./curves.js";
import * as misc from "./misc.js";
import Blake2b from "blake2b-wasm";
import * as utils from "./zkey_utils.js";
import { hashToG2 as hashToG2 } from "./keypair.js";
import { applyKeyToSection } from "./mpc_applykey.js";


export default async function beacon(zkeyNameOld, zkeyNameNew, name, beaconHashStr, numIterationsExp, logger) {
    await Blake2b.ready();

    const beaconHash = misc.hex2ByteArray(beaconHashStr);
    if (   (beaconHash.byteLength == 0)
        || (beaconHash.byteLength*2 !=beaconHashStr.length))
    {
        if (logger) logger.error("Invalid Beacon Hash. (It must be a valid hexadecimal sequence)");
        return false;
    }
    if (beaconHash.length>=256) {
        if (logger) logger.error("Maximum lenght of beacon hash is 255 bytes");
        return false;
    }

    numIterationsExp = parseInt(numIterationsExp);
    if ((numIterationsExp<10)||(numIterationsExp>63)) {
        if (logger) logger.error("Invalid numIterationsExp. (Must be between 10 and 63)");
        return false;
    }


    const {fd: fdOld, sections: sections} = await binFileUtils.readBinFile(zkeyNameOld, "zkey", 2);
    const zkey = await zkeyUtils.readHeader(fdOld, sections, "groth16");

    const curve = await getCurve(zkey.q);

    const mpcParams = await zkeyUtils.readMPCParams(fdOld, curve, sections);

    const fdNew = await binFileUtils.createBinFile(zkeyNameNew, "zkey", 1, 10);

    const rng = await misc.rngFromBeaconParams(beaconHash, numIterationsExp);

    const transcriptHasher = Blake2b(64);
    transcriptHasher.update(mpcParams.csHash);
    for (let i=0; i<mpcParams.contributions.length; i++) {
        utils.hashPubKey(transcriptHasher, curve, mpcParams.contributions[i]);
    }

    const curContribution = {};
    curContribution.delta = {};
    curContribution.delta.prvKey = curve.Fr.fromRng(rng);
    curContribution.delta.g1_s = curve.G1.toAffine(curve.G1.fromRng(rng));
    curContribution.delta.g1_sx = curve.G1.toAffine(curve.G1.timesFr(curContribution.delta.g1_s, curContribution.delta.prvKey));
    utils.hashG1(transcriptHasher, curve, curContribution.delta.g1_s);
    utils.hashG1(transcriptHasher, curve, curContribution.delta.g1_sx);
    curContribution.transcript = transcriptHasher.digest();
    curContribution.delta.g2_sp = hashToG2(curve, curContribution.transcript);
    curContribution.delta.g2_spx = curve.G2.toAffine(curve.G2.timesFr(curContribution.delta.g2_sp, curContribution.delta.prvKey));

    zkey.vk_delta_1 = curve.G1.timesFr(zkey.vk_delta_1, curContribution.delta.prvKey);
    zkey.vk_delta_2 = curve.G2.timesFr(zkey.vk_delta_2, curContribution.delta.prvKey);

    curContribution.deltaAfter = zkey.vk_delta_1;

    curContribution.type = 1;
    curContribution.numIterationsExp = numIterationsExp;
    curContribution.beaconHash = beaconHash;

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
    await applyKeyToSection(fdOld, sections, fdNew, 8, curve, "G1", invDelta, curve.Fr.e(1), "L Section", logger);
    await applyKeyToSection(fdOld, sections, fdNew, 9, curve, "G1", invDelta, curve.Fr.e(1), "H Section", logger);

    await zkeyUtils.writeMPCParams(fdNew, curve, mpcParams);

    await fdOld.close();
    await fdNew.close();

    const contributionHasher = Blake2b(64);
    utils.hashPubKey(contributionHasher, curve, curContribution);

    const contribuionHash = contributionHasher.digest();

    if (logger) logger.info(misc.formatHash(contribuionHash, "Contribution Hash: "));

    return contribuionHash;
}
