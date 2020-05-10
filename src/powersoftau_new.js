/*
Header
    n8
    prime
    power
    nContributions
tauG1
    [(1<<power)*2-1] G1
tauG2
    [1<<power] G2
alfaTauG1
    [1<<power] G1
betaTauG1
    [1<<power] G1
betaG2
    [1] G2
contributions
    [NContributions]
    tauG1
    tauG2
    alphaTauG1
    betaTauG1
    betaG2
    partialHash
        state
    tau_g1s
    tau_g1sx
    tau_g2spx
    alfa_g1s
    alfa_g1sx
    alfa_g1spx
    beta_g1s
    beta_g1sx
    beta_g1spx
 */

const fastFile = require("fastfile");
const Scalar = require("ffjavascript").Scalar;


async function newAccumulator(curve, power, fileName, verbose) {

    const fd = await fastFile.createOverride(fileName);

    await fd.write(Buffer.from("ptau"), 0); // Magic "r1cs"

    await fd.writeULE32(1); // Version
    await fd.writeULE32(7); // Number of Sections

    // Write the header
    ///////////
    await fd.writeULE32(1); // Header type
    const pHeaderSize = fd.pos;
    await fd.writeULE64(0); // Temporally set to 0 length

    const primeQ = curve.q;

    await fd.writeULE32(curve.F1.n64*8);
    await fd.write(Scalar.toRprLE(primeQ, curve.F1.n64*8));
    await fd.writeULE32(power);                    // power
    await fd.writeULE32(0);                       // Total number of public contributions

    const headerSize = fd.pos - pHeaderSize - 8;


    // Write tauG1
    ///////////
    await fd.writeULE32(2); // tauG1
    const pTauG1 = fd.pos;
    await fd.writeULE64(0); // Temporally set to 0 length
    const nTauG1 = (1 << power) * 2 -1;
    for (let i=0; i< nTauG1; i++) {
        await fd.write(curve.G1.toRprLEM(curve.G1.g));
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
        await fd.write(curve.G2.toRprLEM(curve.G2.g));
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
        await fd.write(curve.G1.toRprLEM(curve.G1.g));
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
        await fd.write(curve.G1.toRprLEM(curve.G1.g));
        if ((verbose)&&((i%100000) == 0)&&i) console.log("betaTauG1: " + i);
    }
    const betaTauG1Size  = fd.pos - pBetaTauG1 -8;

    // Write betaG2
    ///////////
    await fd.writeULE32(6); // betaG2
    const pBetaG2 = fd.pos;
    await fd.writeULE64(0); // Temporally set to 0 length
    await fd.write(curve.G2.toRprLEM(curve.G2.g));
    const betaG2Size  = fd.pos - pBetaG2 -8;

    // Contributions
    ///////////
    await fd.writeULE32(7); // betaG2
    const pContributions = fd.pos;
    await fd.writeULE64(0); // Temporally set to 0 length
    const contributionsSize  = fd.pos - pContributions -8;

    // Write sizes
    await fd.writeULE64(headerSize, pHeaderSize);
    await fd.writeULE64(tauG1Size, pTauG1);
    await fd.writeULE64(tauG2Size, pTauG2);
    await fd.writeULE64(alfaTauG1Size, pAlfaTauG1);
    await fd.writeULE64(betaTauG1Size, pBetaTauG1);
    await fd.writeULE64(betaG2Size, pBetaG2);
    await fd.writeULE64(contributionsSize, pContributions);

    await fd.close();
}

module.exports = newAccumulator;
