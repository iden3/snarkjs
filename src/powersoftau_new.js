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
alfaTauG1(4)
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
            alfa_g1s
            alfa_g1sx
            alfa_g1spx
            beta_g1s
            beta_g1sx
            beta_g1spx
        partialHash (216 bytes) See https://github.com/mafintosh/blake2b-wasm/blob/23bee06945806309977af802bc374727542617c7/blake2b.wat#L9
        hashNewChallange
    ]
 */

const ptauUtils = require("./powersoftau_utils");
const binFileUtils = require("./binfileutils");


async function newAccumulator(curve, power, fileName, verbose) {


    const fd = await binFileUtils.createBinFile(fileName, "ptau", 1, 7);

    await ptauUtils.writePTauHeader(fd, curve, power, 0);

    const buffG1 = new Uint8Array(curve.G1.F.n8*2);
    const buffG2 = new Uint8Array(curve.G2.F.n8*2);
    curve.G1.toRprLEM(buffG1, 0, curve.G1.g);
    curve.G2.toRprLEM(buffG2, 0, curve.G2.g);

    // Write tauG1
    ///////////
    await fd.writeULE32(2); // tauG1
    const pTauG1 = fd.pos;
    await fd.writeULE64(0); // Temporally set to 0 length
    const nTauG1 = (1 << power) * 2 -1;
    for (let i=0; i< nTauG1; i++) {
        await fd.write(buffG1);
        if ((verbose)&&((i%100000) == 0)&&i) console.log("tauG1: " + i);
    }
    const tauG1Size  = fd.pos - pTauG1 -8;

    // Write tauG2
    ///////////
    await fd.writeULE32(3); // tauG2
    const pTauG2 = fd.pos;
    await fd.writeULE64(0); // Temporally set to 0 length
    const nTauG2 = (1 << power);
    for (let i=0; i< nTauG2; i++) {
        await fd.write(buffG2);
        if ((verbose)&&((i%100000) == 0)&&i) console.log("tauG2: " + i);
    }
    const tauG2Size  = fd.pos - pTauG2 -8;

    // Write alfaTauG1
    ///////////
    await fd.writeULE32(4); // alfaTauG1
    const pAlfaTauG1 = fd.pos;
    await fd.writeULE64(0); // Temporally set to 0 length
    const nAlfaTauG1 = (1 << power);
    for (let i=0; i< nAlfaTauG1; i++) {
        await fd.write(buffG1);
        if ((verbose)&&((i%100000) == 0)&&i) console.log("alfaTauG1: " + i);
    }
    const alfaTauG1Size  = fd.pos - pAlfaTauG1 -8;

    // Write betaTauG1
    ///////////
    await fd.writeULE32(5); // betaTauG1
    const pBetaTauG1 = fd.pos;
    await fd.writeULE64(0); // Temporally set to 0 length
    const nBetaTauG1 = (1 << power);
    for (let i=0; i< nBetaTauG1; i++) {
        await fd.write(buffG1);
        if ((verbose)&&((i%100000) == 0)&&i) console.log("betaTauG1: " + i);
    }
    const betaTauG1Size  = fd.pos - pBetaTauG1 -8;

    // Write betaG2
    ///////////
    await fd.writeULE32(6); // betaG2
    const pBetaG2 = fd.pos;
    await fd.writeULE64(0); // Temporally set to 0 length
    await fd.write(buffG2);
    const betaG2Size  = fd.pos - pBetaG2 -8;

    // Contributions
    ///////////
    await fd.writeULE32(7); // Contributions
    const pContributions = fd.pos;
    await fd.writeULE64(4); // Temporally set to 4 length
    await fd.writeULE32(0); // 0 Contributions
    const contributionsSize  = fd.pos - pContributions -8;

    // Write sizes
    await fd.writeULE64(tauG1Size, pTauG1);
    await fd.writeULE64(tauG2Size, pTauG2);
    await fd.writeULE64(alfaTauG1Size, pAlfaTauG1);
    await fd.writeULE64(betaTauG1Size, pBetaTauG1);
    await fd.writeULE64(betaG2Size, pBetaG2);
    await fd.writeULE64(contributionsSize, pContributions);

    await fd.close();
}

module.exports = newAccumulator;
