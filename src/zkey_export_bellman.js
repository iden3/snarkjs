
const binFileUtils = require("./binfileutils");
const zkeyUtils = require("./zkey_utils");
const fastFile = require("fastfile");
const getCurve = require("./curves").getCurveFromQ;

module.exports  = async function phase2exportMPCParams(zkeyName, mpcparamsName, verbose) {

    const {fd: fdZKey, sections: sectionsZKey} = await binFileUtils.readBinFile(zkeyName, "zkey", 2);
    const zkey = await zkeyUtils.readHeader(fdZKey, sectionsZKey, "groth16");

    const curve = getCurve(zkey.q);
    await curve.loadEngine();
    const sG1 = curve.G1.F.n8*2;
    const sG2 = curve.G2.F.n8*2;

    const mpcParams = await zkeyUtils.readMPCParams(fdZKey, sectionsZKey);

    const fdMPCParams = await fastFile.createOverride(mpcparamsName);

    /////////////////////
    // Verification Key Section
    /////////////////////
    await writeG1(zkey.vk_alpha_1);
    await writeG1(zkey.vk_beta_1);
    await writeG2(zkey.vk_beta_2);
    await writeG2(zkey.vk_gamma_2);
    await writeG1(zkey.vk_delta_1);
    await writeG2(zkey.vk_delta_2);

    // IC
    let buffBasesIC;
    buffBasesIC = await binFileUtils.readFullSection(fdZKey, sectionsZKey, 3);
    buffBasesIC = await curve.G1.batchLEMtoU(buffBasesIC);

    await writePointArray("G1", buffBasesIC);

    /////////////////////
    // h Section
    /////////////////////
    const buffBasesH_Lodd = await binFileUtils.readFullSection(fdZKey, sectionsZKey, 9);

    let buffBasesH_Tau;
    buffBasesH_Tau = await curve.G1.fft(buffBasesH_Lodd, "affine", "jacobian", verbose ? console.log : undefined);
    buffBasesH_Tau = await curve.G1.batchApplyKey(buffBasesH_Tau, curve.Fr.neg(curve.Fr.e(2)), curve.PFr.w[zkey.power+1], "jacobian", "affine", verbose ? console.log : undefined);

    // Remove last element.  (The degree of H will be allways m-2)
    buffBasesH_Tau = buffBasesH_Tau.slice(0, buffBasesH_Tau.byteLength - sG1);
    buffBasesH_Tau = await curve.G1.batchLEMtoU(buffBasesH_Tau);
    await writePointArray("G1", buffBasesH_Tau);

    /////////////////////
    // C section  (l section in some notations)
    /////////////////////
    let buffBasesC;
    buffBasesC = await binFileUtils.readFullSection(fdZKey, sectionsZKey, 8);
    buffBasesC = await curve.G1.batchLEMtoU(buffBasesC);
    await writePointArray("G1", buffBasesC);

    /////////////////////
    // A Section (C section)
    /////////////////////
    let buffBasesA;
    buffBasesA = await binFileUtils.readFullSection(fdZKey, sectionsZKey, 5);
    buffBasesA = await curve.G1.batchLEMtoU(buffBasesA);
    await writePointArray("G1", buffBasesA);

    /////////////////////
    // B1 Section
    /////////////////////
    let buffBasesB1;
    buffBasesB1 = await binFileUtils.readFullSection(fdZKey, sectionsZKey, 6);
    buffBasesB1 = await curve.G1.batchLEMtoU(buffBasesB1);
    await writePointArray("G1", buffBasesB1);

    /////////////////////
    // B2 Section
    /////////////////////
    let buffBasesB2;
    buffBasesB2 = await binFileUtils.readFullSection(fdZKey, sectionsZKey, 7);
    buffBasesB2 = await curve.G2.batchLEMtoU(buffBasesB2);
    await writePointArray("G2", buffBasesB2);

    await fdMPCParams.write(mpcParams.csHash);
    await writeU32(mpcParams.contributions.length);

    for (let i=0; i<mpcParams.contributions.length; i++) {
        const c = mpcParams.contributions[i];
        await writeG1(c.deltaAfter);
        await writeG1(c.delta.g1_s);
        await writeG1(c.delta.g1_sx);
        await writeG1(c.delta.g2_spx);
        await fdMPCParams.write(c.transcript);
    }

    await fdZKey.close();
    await fdMPCParams.close();

    async function writeG1(P) {
        const buff = new Uint8Array(sG1);
        curve.G1.toRprBE(buff, 0, P);
        await fdMPCParams.write(buff);
    }

    async function writeG2(P) {
        const buff = new Uint8Array(sG2);
        curve.G2.toRprBE(buff, 0, P);
        await fdMPCParams.write(buff);
    }

    async function writePointArray(groupName, buff) {
        let sG;
        if (groupName == "G1") {
            sG = sG1;
        } else {
            sG = sG2;
        }

        const buffSize = new Uint8Array(4);
        const buffSizeV = new DataView(buffSize.buffer, buffSize.byteOffset, buffSize.byteLength);
        buffSizeV.setUint32(0, buff.byteLength / sG, false);

        await fdMPCParams.write(buffSize);
        await fdMPCParams.write(buff);
    }

    async function writeU32(n) {
        const buffSize = new Uint8Array(4);
        const buffSizeV = new DataView(buffSize.buffer, buffSize.byteOffset, buffSize.byteLength);
        buffSizeV.setUint32(0, n, false);

        await fdMPCParams.write(buffSize);
    }



};
