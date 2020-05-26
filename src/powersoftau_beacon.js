const Blake2b = require("blake2b-wasm");
const utils = require("./powersoftau_utils");
const applyKey = require("./mpc_applykey");

function hex2ByteArray(s) {
    return new Uint8Array(s.match(/[\da-f]{2}/gi).map(function (h) {
        return parseInt(h, 16);
    }));
}

async function beacon(oldPtauFilename, newPTauFilename, name, numIterationsExp, beaconHashStr, verbose) {
    const beaconHash = hex2ByteArray(beaconHashStr);
    if (   (beaconHash.byteLength == 0)
        || (beaconHash.byteLength*2 !=beaconHashStr.length))
    {
        console.log("Invalid Beacon Hash. (It must be a valid hexadecimal sequence)");
        return false;
    }
    if (beaconHash.length>=256) {
        console.log("Maximum lenght of beacon hash is 255 bytes");
        return false;
    }

    numIterationsExp = parseInt(numIterationsExp);
    if ((numIterationsExp<10)||(numIterationsExp>63)) {
        console.log("Invalid numIterationsExp. (Must be between 10 and 63)");
        return false;
    }

    await Blake2b.ready();

    const {fd: fdOld, sections} = await utils.readBinFile(oldPtauFilename, "ptau", 1);
    const {curve, power} = await utils.readPTauHeader(fdOld, sections);
    const contributions = await utils.readContributions(fdOld, curve, sections);
    const currentContribution = {
        name: name,
        type: 1, // Beacon
        numIterationsExp: numIterationsExp,
        beaconHash: beaconHash
    };

    let lastChallangeHash;

    if (contributions.length>0) {
        lastChallangeHash = contributions[contributions.length-1].nextChallange;
    } else {
        lastChallangeHash = utils.calculateFirstChallangeHash(curve, power);
    }

    currentContribution.key = utils.keyFromBeacon(curve, lastChallangeHash, beaconHash, numIterationsExp);

    const fdNew = await utils.createBinFile(newPTauFilename, "ptau", 1, 7);
    await utils.writePTauHeader(fdNew, curve, power);

    const newChallangeHasher = new Blake2b(64);
    newChallangeHasher.update(lastChallangeHash);

    const responseHasher = new Blake2b(64);
    responseHasher.update(lastChallangeHash);

    currentContribution.tauG1 = (await applyKey({
        fdFrom: fdOld,
        sections,
        curve,
        fdTo: fdNew,
        sectionId: 2,
        NPoints: (1 << power) * 2 -1,
        G: "G1",
        first: curve.Fr.one,
        inc: currentContribution.key.tau.prvKey,
        newChallangeHasher,
        responseHasher,
        returnPoints: [1],
        sectionName: "tauG1",
        verbose
    }))[0];

    currentContribution.tauG2 = (await applyKey({
        fdFrom: fdOld,
        sections,
        curve,
        fdTo: fdNew,
        sectionId: 3,
        NPoints: 1 << power,
        G: "G2",
        first: curve.Fr.one,
        inc: currentContribution.key.tau.prvKey,
        newChallangeHasher,
        responseHasher,
        returnPoints: [1],
        sectionName: "tauG2",
        verbose
    }))[0];

    currentContribution.alphaG1 = (await applyKey({
        fdFrom: fdOld,
        sections,
        curve,
        fdTo: fdNew,
        sectionId: 4,
        NPoints: 1 << power,
        G: "G1",
        first: currentContribution.key.alpha.prvKey,
        inc: currentContribution.key.tau.prvKey,
        newChallangeHasher,
        responseHasher,
        returnPoints: [0],
        sectionName: "alphaTauG1",
        verbose
    }))[0];

    currentContribution.betaG1 = (await applyKey({
        fdFrom: fdOld,
        sections,
        curve,
        fdTo: fdNew,
        sectionId: 5,
        NPoints: 1 << power,
        G: "G1",
        first: currentContribution.key.beta.prvKey,
        inc: currentContribution.key.tau.prvKey,
        newChallangeHasher,
        responseHasher,
        returnPoints: [0],
        sectionName: "betaTauG1",
        verbose
    }))[0];

    currentContribution.betaG2 = (await applyKey({
        fdFrom: fdOld,
        sections,
        curve,
        fdTo: fdNew,
        sectionId: 6,
        NPoints: 1,
        G: "G2",
        first: currentContribution.key.beta.prvKey,
        inc: currentContribution.key.tau.prvKey,
        newChallangeHasher,
        responseHasher,
        returnPoints: [0],
        sectionName: "betaG2",
        verbose
    }))[0];

    currentContribution.nextChallange = newChallangeHasher.digest();
    currentContribution.partialHash = responseHasher.getPartialHash();

    const buffKey = new Uint8Array(curve.F1.n8*2*6+curve.F2.n8*2*3);

    utils.toPtauPubKeyRpr(buffKey, 0, curve, currentContribution.key, false);

    responseHasher.update(new Uint8Array(buffKey));
    const hashResponse = responseHasher.digest();

    console.log("Contribution Response Hash imported: ");
    console.log(utils.formatHash(hashResponse));

    contributions.push(currentContribution);

    await utils.writeContributions(fdNew, curve, contributions);

    await fdOld.close();
    await fdNew.close();
}

module.exports = beacon;
