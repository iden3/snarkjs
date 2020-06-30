const Blake2b = require("blake2b-wasm");
const utils = require("./powersoftau_utils");
const keyPair = require("./keypair");
const assert = require("assert");
const crypto = require("crypto");
const binFileUtils = require("./binfileutils");
const ChaCha = require("ffjavascript").ChaCha;
const misc = require("./misc");
const sameRatio = misc.sameRatio;

async function verifyContribution(curve, cur, prev) {
    let sr;
    if (cur.type == 1) {    // Verify the beacon.
        const beaconKey = utils.keyFromBeacon(curve, prev.nextChallange, cur.beaconHash, cur.numIterationsExp);

        if (!curve.G1.eq(cur.key.tau.g1_s, beaconKey.tau.g1_s)) {
            console.log(`BEACON key (tauG1_s) is not generated correctly in challange #${cur.id}  ${cur.name || ""}` );
            return false;
        }
        if (!curve.G1.eq(cur.key.tau.g1_sx, beaconKey.tau.g1_sx)) {
            console.log(`BEACON key (tauG1_sx) is not generated correctly in challange #${cur.id}  ${cur.name || ""}` );
            return false;
        }
        if (!curve.G2.eq(cur.key.tau.g2_spx, beaconKey.tau.g2_spx)) {
            console.log(`BEACON key (tauG2_spx) is not generated correctly in challange #${cur.id}  ${cur.name || ""}` );
            return false;
        }

        if (!curve.G1.eq(cur.key.alpha.g1_s, beaconKey.alpha.g1_s)) {
            console.log(`BEACON key (alphaG1_s) is not generated correctly in challange #${cur.id}  ${cur.name || ""}` );
            return false;
        }
        if (!curve.G1.eq(cur.key.alpha.g1_sx, beaconKey.alpha.g1_sx)) {
            console.log(`BEACON key (alphaG1_sx) is not generated correctly in challange #${cur.id}  ${cur.name || ""}` );
            return false;
        }
        if (!curve.G2.eq(cur.key.alpha.g2_spx, beaconKey.alpha.g2_spx)) {
            console.log(`BEACON key (alphaG2_spx) is not generated correctly in challange #${cur.id}  ${cur.name || ""}` );
            return false;
        }

        if (!curve.G1.eq(cur.key.beta.g1_s, beaconKey.beta.g1_s)) {
            console.log(`BEACON key (betaG1_s) is not generated correctly in challange #${cur.id}  ${cur.name || ""}` );
            return false;
        }
        if (!curve.G1.eq(cur.key.beta.g1_sx, beaconKey.beta.g1_sx)) {
            console.log(`BEACON key (betaG1_sx) is not generated correctly in challange #${cur.id}  ${cur.name || ""}` );
            return false;
        }
        if (!curve.G2.eq(cur.key.beta.g2_spx, beaconKey.beta.g2_spx)) {
            console.log(`BEACON key (betaG2_spx) is not generated correctly in challange #${cur.id}  ${cur.name || ""}` );
            return false;
        }
    }

    cur.key.tau.g2_sp = curve.G2.toAffine(keyPair.getG2sp(curve, 0, prev.nextChallange, cur.key.tau.g1_s, cur.key.tau.g1_sx));
    cur.key.alpha.g2_sp = curve.G2.toAffine(keyPair.getG2sp(curve, 1, prev.nextChallange, cur.key.alpha.g1_s, cur.key.alpha.g1_sx));
    cur.key.beta.g2_sp = curve.G2.toAffine(keyPair.getG2sp(curve, 2, prev.nextChallange, cur.key.beta.g1_s, cur.key.beta.g1_sx));

    sr = await sameRatio(curve, cur.key.tau.g1_s, cur.key.tau.g1_sx, cur.key.tau.g2_sp, cur.key.tau.g2_spx);
    if (sr !== true) {
        console.log("INVALID key (tau) in challange #"+cur.id);
        return false;
    }

    sr = await sameRatio(curve, cur.key.alpha.g1_s, cur.key.alpha.g1_sx, cur.key.alpha.g2_sp, cur.key.alpha.g2_spx);
    if (sr !== true) {
        console.log("INVALID key (alpha) in challange #"+cur.id);
        return false;
    }

    sr = await sameRatio(curve, cur.key.beta.g1_s, cur.key.beta.g1_sx, cur.key.beta.g2_sp, cur.key.beta.g2_spx);
    if (sr !== true) {
        console.log("INVALID key (beta) in challange #"+cur.id);
        return false;
    }

    sr = await sameRatio(curve, prev.tauG1, cur.tauG1, cur.key.tau.g2_sp, cur.key.tau.g2_spx);
    if (sr !== true) {
        console.log("INVALID tau*G1. challange #"+cur.id+" It does not follow the previous contribution");
        return false;
    }

    sr = await sameRatio(curve,  cur.key.tau.g1_s, cur.key.tau.g1_sx, prev.tauG2, cur.tauG2);
    if (sr !== true) {
        console.log("INVALID tau*G2. challange #"+cur.id+" It does not follow the previous contribution");
        return false;
    }

    sr = await sameRatio(curve, prev.alphaG1, cur.alphaG1, cur.key.alpha.g2_sp, cur.key.alpha.g2_spx);
    if (sr !== true) {
        console.log("INVALID alpha*G1. challange #"+cur.id+" It does not follow the previous contribution");
        return false;
    }

    sr = await sameRatio(curve, prev.betaG1, cur.betaG1, cur.key.beta.g2_sp, cur.key.beta.g2_spx);
    if (sr !== true) {
        console.log("INVALID beta*G1. challange #"+cur.id+" It does not follow the previous contribution");
        return false;
    }

    sr = await sameRatio(curve,  cur.key.beta.g1_s, cur.key.beta.g1_sx, prev.betaG2, cur.betaG2);
    if (sr !== true) {
        console.log("INVALID beta*G2. challange #"+cur.id+"It does not follow the previous contribution");
        return false;
    }

    return true;
}

async function verify(tauFilename, verbose) {
    let sr;
    await Blake2b.ready();

    const {fd, sections} = await binFileUtils.readBinFile(tauFilename, "ptau", 1);
    const {curve, power, ceremonyPower} = await utils.readPTauHeader(fd, sections);
    const contrs = await utils.readContributions(fd, curve, sections);

    if (verbose) console.log("power: 2**" + power);
    // Verify Last contribution

    if (verbose) console.log("Computing initial contribution hash");
    const initialContribution = {
        tauG1: curve.G1.g,
        tauG2: curve.G2.g,
        alphaG1: curve.G1.g,
        betaG1: curve.G1.g,
        betaG2: curve.G2.g,
        nextChallange: utils.calculateFirstChallangeHash(curve, ceremonyPower, verbose),
        responseHash: Blake2b(64).digest()
    };

    if (contrs.length == 0) {
        console.log("This file has no contribution! It cannot be used in production");
        return false;
    }

    let prevContr;
    if (contrs.length>1) {
        prevContr = contrs[contrs.length-2];
    } else {
        prevContr = initialContribution;
    }
    const curContr = contrs[contrs.length-1];
    if (verbose) console.log("Validating contribution #"+contrs[contrs.length-1].id);
    const res = await verifyContribution(curve, curContr,prevContr, verbose);
    if (!res) return false;


    const nextContributionHasher = Blake2b(64);
    nextContributionHasher.update(curContr.responseHash);

    // Verify powers and compute nextChallangeHash

    // await test();

    // Verify Section tau*G1
    if (verbose) console.log("Verifying powers in tau*G1 section");
    const rTau1 = await processSection(2, "G1", "tauG1", (1 << power)*2-1, [0, 1]);
    sr = await sameRatio(curve, rTau1.R1, rTau1.R2, curve.G2.g, curContr.tauG2);
    if (sr !== true) {
        console.log("tauG1 section. Powers do not match");
        return false;
    }
    if (!curve.G1.eq(curve.G1.g, rTau1.singularPoints[0])) {
        console.log("First element of tau*G1 section must be the generator");
        return false;
    }
    if (!curve.G1.eq(curContr.tauG1, rTau1.singularPoints[1])) {
        console.log("Second element of tau*G1 section does not match the one in the contribution section");
        return false;
    }

    // await test();

    // Verify Section tau*G2
    if (verbose) console.log("Verifying powers in tau*G2 section");
    const rTau2 = await processSection(3, "G2", "tauG2", 1 << power, [0, 1]);
    sr = await sameRatio(curve, curve.G1.g, curContr.tauG1, rTau2.R1, rTau2.R2);
    if (sr !== true) {
        console.log("tauG2 section. Powers do not match");
        return false;
    }
    if (!curve.G2.eq(curve.G2.g, rTau2.singularPoints[0])) {
        console.log("First element of tau*G2 section must be the generator");
        return false;
    }
    if (!curve.G2.eq(curContr.tauG2, rTau2.singularPoints[1])) {
        console.log("Second element of tau*G2 section does not match the one in the contribution section");
        return false;
    }

    // Verify Section alpha*tau*G1
    if (verbose) console.log("Verifying powers in alpha*tau*G1 section");
    const rAlphaTauG1 = await processSection(4, "G1", "alphatauG1", 1 << power, [0]);
    sr = await sameRatio(curve, rAlphaTauG1.R1, rAlphaTauG1.R2, curve.G2.g, curContr.tauG2);
    if (sr !== true) {
        console.log("alphaTauG1 section. Powers do not match");
        return false;
    }
    if (!curve.G1.eq(curContr.alphaG1, rAlphaTauG1.singularPoints[0])) {
        console.log("First element of alpha*tau*G1 section (alpha*G1) does not match the one in the contribution section");
        return false;
    }

    // Verify Section beta*tau*G1
    if (verbose) console.log("Verifying powers in beta*tau*G1 section");
    const rBetaTauG1 = await processSection(5, "G1", "betatauG1", 1 << power, [0]);
    sr = await sameRatio(curve, rBetaTauG1.R1, rBetaTauG1.R2, curve.G2.g, curContr.tauG2);
    if (sr !== true) {
        console.log("betaTauG1 section. Powers do not match");
        return false;
    }
    if (!curve.G1.eq(curContr.betaG1, rBetaTauG1.singularPoints[0])) {
        console.log("First element of beta*tau*G1 section (beta*G1) does not match the one in the contribution section");
        return false;
    }

    //Verify Beta G2
    const betaG2 = await processSectionBetaG2();
    if (!curve.G2.eq(curContr.betaG2, betaG2)) {
        console.log("betaG2 element in betaG2 section does not match the one in the contribution section");
        return false;
    }


    const nextContributionHash = nextContributionHasher.digest();

    // Check the nextChallangeHash
    if (!misc.hashIsEqual(nextContributionHash,curContr.nextChallange)) {
        console.log("Hash of the values does not match the next challange of the last contributor in the contributions section");
        return false;
    }

    if (verbose) {
        console.log("Next challange hash: ");
        console.log(misc.formatHash(nextContributionHash));
    }

    // Verify Previous contributions

    printContribution(curContr, prevContr);
    for (let i = contrs.length-2; i>=0; i--) {
        const curContr = contrs[i];
        const prevContr =  (i>0) ? contrs[i-1] : initialContribution;
        const res = await verifyContribution(curve, curContr, prevContr);
        if (!res) return false;
        printContribution(curContr, prevContr);
    }
    console.log("-----------------------------------------------------");

    if ((!sections[12]) || (!sections[13]) || (!sections[14]) || (!sections[15])) {
        console.log("this file does not contain phase2 precalculated values. Please run: ");
        console.log("   snarkjs \"powersoftau preparephase2\" to prepare this file to be used in the phase2 ceremony." );
    } else {
        let res;
        res = await verifyLagrangeEvaluations("G1", 2, 12, "tauG1");
        if (!res) return false;
        res = await verifyLagrangeEvaluations("G2", 3, 13, "tauG2");
        if (!res) return false;
        res = await verifyLagrangeEvaluations("G1", 4, 14, "alphaTauG1");
        if (!res) return false;
        res = await verifyLagrangeEvaluations("G1", 5, 15, "betaTauG1");
        if (!res) return false;
    }

    await fd.close();

    return true;

    function printContribution(curContr, prevContr) {
        console.log("-----------------------------------------------------");
        console.log(`Contribution #${curContr.id}: ${curContr.name ||""}`);

        console.log("\tNext Challange");
        console.log(misc.formatHash(curContr.nextChallange));

        const buffV  = new Uint8Array(curve.G1.F.n8*2*6+curve.G2.F.n8*2*3);
        utils.toPtauPubKeyRpr(buffV, 0, curve, curContr.key, false);

        const responseHasher = Blake2b(64);
        responseHasher.setPartialHash(curContr.partialHash);
        responseHasher.update(buffV);
        const responseHash = responseHasher.digest();

        console.log("\tResponse Hash");
        console.log(misc.formatHash(responseHash));

        console.log("\tBased on challange");
        console.log(misc.formatHash(prevContr.nextChallange));

        if (curContr.type == 1) {
            console.log(`Beacon generator: ${misc.byteArray2hex(curContr.beaconHash)}`);
            console.log(`Beacon iterations Exp: ${curContr.numIterationsExp}`);
        }

    }

    async function processSectionBetaG2() {
        const G = curve.G2;
        const sG = G.F.n8*2;
        const buffUv = new Uint8Array(sG);

        if (!sections[6])  assert(false, "File has no BetaG2 section");
        if (sections[6].length>1) assert(false, "File has more than one GetaG2 section");
        fd.pos = sections[6][0].p;

        const buff = await fd.read(sG);
        const P = G.fromRprLEM(buff);

        G.toRprUncompressed(buffUv, 0, P);
        nextContributionHasher.update(buffUv);

        return P;
    }

    async function processSection(idSection, groupName, sectionName, nPoints, singularPointIndexes) {
        const MAX_CHUNK_SIZE = 1<<16;
        const G = curve[groupName];
        const sG = G.F.n8*2;
        await binFileUtils.startReadUniqueSection(fd, sections, idSection);

        const singularPoints = [];

        let R1 = G.zero;
        let R2 = G.zero;

        let lastBase = G.zero;

        for (let i=0; i<nPoints; i += MAX_CHUNK_SIZE) {
            if ((verbose)&&i) console.log(`${sectionName}:  ` + i);
            const n = Math.min(nPoints - i, MAX_CHUNK_SIZE);
            const bases = await fd.read(n*sG);

            const basesU = await G.batchLEMtoU(bases);
            nextContributionHasher.update(basesU);

            const scalars = new Uint8Array(4*(n-1));
            crypto.randomFillSync(scalars);


            if (i>0) {
                const firstBase = G.fromRprLEM(bases, 0);
                const r = crypto.randomBytes(4).readUInt32BE(0, true);

                R1 = G.add(R1, G.timesScalar(lastBase, r));
                R2 = G.add(R2, G.timesScalar(firstBase, r));
            }

            const r1 = await G.multiExpAffine(bases.slice(0, (n-1)*sG), scalars);
            const r2 = await G.multiExpAffine(bases.slice(sG), scalars);

            R1 = G.add(R1, r1);
            R2 = G.add(R2, r2);

            lastBase = G.fromRprLEM( bases, (n-1)*sG);

            for (let j=0; j<singularPointIndexes.length; j++) {
                const sp = singularPointIndexes[j];
                if ((sp >=i) && (sp < i+n)) {
                    const P = G.fromRprLEM(bases, (sp-i)*sG);
                    singularPoints.push(P);
                }
            }

        }
        await binFileUtils.endReadSection(fd);

        return {
            R1: R1,
            R2: R2,
            singularPoints: singularPoints
        };

    }

    async function verifyLagrangeEvaluations(gName, tauSection, lagrangeSection, sectionName) {

        if (verbose) console.log(`Verifying phase2 calculated values ${sectionName}...`);
        const G = curve[gName];
        const sG = G.F.n8*2;

        const seed= new Array(8);
        for (let i=0; i<8; i++) {
            seed[i] = crypto.randomBytes(4).readUInt32BE(0, true);
        }

        const rng = new ChaCha(seed);


        for (let p=0; p<= power; p ++) {
            const res = await verifyPower(p);
            if (!res) return false;
        }

        return true;

        async function verifyPower(p) {
            if (verbose) console.log(`Power ${p}...`);
            const n8r = curve.Fr.n8;
            const nPoints = 1<<p;
            let buff_r = new Uint8Array(nPoints * n8r);
            let buffG;

            for (let i=0; i<nPoints; i++) {
                const e = curve.Fr.fromRng(rng);
                curve.Fr.toRprLE(buff_r, i*n8r, e);
            }

            await binFileUtils.startReadUniqueSection(fd, sections, tauSection);
            buffG = await fd.read(nPoints*sG);
            await binFileUtils.endReadSection(fd, true);

            const resTau = await G.multiExpAffine(buffG, buff_r);

            buff_r = await curve.Fr.batchToMontgomery(buff_r);
            buff_r = await curve.Fr.fft(buff_r);
            buff_r = await curve.Fr.batchFromMontgomery(buff_r);

            await binFileUtils.startReadUniqueSection(fd, sections, lagrangeSection);
            fd.pos += sG*((1 << p)-1);
            buffG = await fd.read(nPoints*sG);
            await binFileUtils.endReadSection(fd, true);

            const resLagrange = await G.multiExpAffine(buffG, buff_r);

            if (!G.eq(resTau, resLagrange)) {
                console.log("Phase2 caclutation does not match with powers of tau");
                return false;
            }

            return true;
        }
    }
}

module.exports = verify;
