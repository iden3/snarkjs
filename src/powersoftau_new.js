/*
Header(1)
    n8
    prime
    power
tauG1(2)
    {(1<<power)*2-1} [
        G1, tau*G1, tau^2 * G1, ....
    ]
tauG2(3)
    {1<<power}[
        G2, tau*G2, tau^2 * G2, ...
    ]
alphaTauG1(4)
    {1<<power}[
        alpha*G1, alpha*tau*G1, alpha*tau^2*G1,....
    ]
betaTauG1(5)
    {1<<power} []
        beta*G1, beta*tau*G1, beta*tau^2*G1, ....
    ]
betaG2(6)
    {1}[
        beta*G2
    ]
contributions(7)
    NContributions
    {NContributions}[
        tau*G1
        tau*G2
        alpha*G1
        beta*G1
        beta*G2
        pubKey
            tau_g1s
            tau_g1sx
            tau_g2spx
            alpha_g1s
            alpha_g1sx
            alpha_g1spx
            beta_g1s
            beta_g1sx
            beta_g1spx
        partialHash (216 bytes) See https://github.com/mafintosh/blake2b-wasm/blob/23bee06945806309977af802bc374727542617c7/blake2b.wat#L9
        hashNewChallange
    ]
 */

const ptauUtils = require("./powersoftau_utils");
const binFileUtils = require("./binfileutils");
const utils = require("./powersoftau_utils");
const Blake2b = require("blake2b-wasm");
const misc = require("./misc");

async function newAccumulator(curve, power, fileName, verbose) {

    await Blake2b.ready();

    const fd = await binFileUtils.createBinFile(fileName, "ptau", 1, 7);

    await ptauUtils.writePTauHeader(fd, curve, power, 0);

    const buffG1 = curve.G1.oneAffine;
    const buffG2 = curve.G2.oneAffine;

    // Write tauG1
    ///////////
    await binFileUtils.startWriteSection(fd, 2);
    const nTauG1 = (1 << power) * 2 -1;
    for (let i=0; i< nTauG1; i++) {
        await fd.write(buffG1);
        if ((verbose)&&((i%100000) == 0)&&i) console.log("tauG1: " + i);
    }
    await binFileUtils.endWriteSection(fd);

    // Write tauG2
    ///////////
    await binFileUtils.startWriteSection(fd, 3);
    const nTauG2 = (1 << power);
    for (let i=0; i< nTauG2; i++) {
        await fd.write(buffG2);
        if ((verbose)&&((i%100000) == 0)&&i) console.log("tauG2: " + i);
    }
    await binFileUtils.endWriteSection(fd);

    // Write alphaTauG1
    ///////////
    await binFileUtils.startWriteSection(fd, 4);
    const nAlfaTauG1 = (1 << power);
    for (let i=0; i< nAlfaTauG1; i++) {
        await fd.write(buffG1);
        if ((verbose)&&((i%100000) == 0)&&i) console.log("alphaTauG1: " + i);
    }
    await binFileUtils.endWriteSection(fd);

    // Write betaTauG1
    ///////////
    await binFileUtils.startWriteSection(fd, 5);
    const nBetaTauG1 = (1 << power);
    for (let i=0; i< nBetaTauG1; i++) {
        await fd.write(buffG1);
        if ((verbose)&&((i%100000) == 0)&&i) console.log("betaTauG1: " + i);
    }
    await binFileUtils.endWriteSection(fd);

    // Write betaG2
    ///////////
    await binFileUtils.startWriteSection(fd, 6);
    await fd.write(buffG2);
    await binFileUtils.endWriteSection(fd);

    // Contributions
    ///////////
    await binFileUtils.startWriteSection(fd, 7);
    await fd.writeULE32(0); // 0 Contributions
    await binFileUtils.endWriteSection(fd);

    await fd.close();

    const firstChallangeHash = utils.calculateFirstChallangeHash(curve, power, verbose);

    console.log("Blank Contribution Hash:");
    console.log(misc.formatHash(Blake2b(64).digest()));

    console.log("First Contribution Hash:");
    console.log(misc.formatHash(firstChallangeHash));

}

module.exports = newAccumulator;
