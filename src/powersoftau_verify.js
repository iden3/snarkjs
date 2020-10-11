import Blake2b from "blake2b-wasm";
import * as utils from "./powersoftau_utils.js";
import * as keyPair from "./keypair.js";
import crypto from "crypto";
import * as binFileUtils from "@iden3/binfileutils";
import { ChaCha, BigBuffer } from "ffjavascript";
import * as misc from "./misc.js";
const sameRatio = misc.sameRatio;

async function verifyContribution(curve, cur, prev, logger) {
    let sr;
    if (cur.type == 1) {    // Verify the beacon.
        const beaconKey = utils.keyFromBeacon(curve, prev.nextChallenge, cur.beaconHash, cur.numIterationsExp);

        if (!curve.G1.eq(cur.key.tau.g1_s, beaconKey.tau.g1_s)) {
            if (logger) logger.error(`BEACON key (tauG1_s) is not generated correctly in challenge #${cur.id}  ${cur.name || ""}` );
            return false;
        }
        if (!curve.G1.eq(cur.key.tau.g1_sx, beaconKey.tau.g1_sx)) {
            if (logger) logger.error(`BEACON key (tauG1_sx) is not generated correctly in challenge #${cur.id}  ${cur.name || ""}` );
            return false;
        }
        if (!curve.G2.eq(cur.key.tau.g2_spx, beaconKey.tau.g2_spx)) {
            if (logger) logger.error(`BEACON key (tauG2_spx) is not generated correctly in challenge #${cur.id}  ${cur.name || ""}` );
            return false;
        }

        if (!curve.G1.eq(cur.key.alpha.g1_s, beaconKey.alpha.g1_s)) {
            if (logger) logger.error(`BEACON key (alphaG1_s) is not generated correctly in challenge #${cur.id}  ${cur.name || ""}` );
            return false;
        }
        if (!curve.G1.eq(cur.key.alpha.g1_sx, beaconKey.alpha.g1_sx)) {
            if (logger) logger.error(`BEACON key (alphaG1_sx) is not generated correctly in challenge #${cur.id}  ${cur.name || ""}` );
            return false;
        }
        if (!curve.G2.eq(cur.key.alpha.g2_spx, beaconKey.alpha.g2_spx)) {
            if (logger) logger.error(`BEACON key (alphaG2_spx) is not generated correctly in challenge #${cur.id}  ${cur.name || ""}` );
            return false;
        }

        if (!curve.G1.eq(cur.key.beta.g1_s, beaconKey.beta.g1_s)) {
            if (logger) logger.error(`BEACON key (betaG1_s) is not generated correctly in challenge #${cur.id}  ${cur.name || ""}` );
            return false;
        }
        if (!curve.G1.eq(cur.key.beta.g1_sx, beaconKey.beta.g1_sx)) {
            if (logger) logger.error(`BEACON key (betaG1_sx) is not generated correctly in challenge #${cur.id}  ${cur.name || ""}` );
            return false;
        }
        if (!curve.G2.eq(cur.key.beta.g2_spx, beaconKey.beta.g2_spx)) {
            if (logger) logger.error(`BEACON key (betaG2_spx) is not generated correctly in challenge #${cur.id}  ${cur.name || ""}` );
            return false;
        }
    }

    cur.key.tau.g2_sp = curve.G2.toAffine(keyPair.getG2sp(curve, 0, prev.nextChallenge, cur.key.tau.g1_s, cur.key.tau.g1_sx));
    cur.key.alpha.g2_sp = curve.G2.toAffine(keyPair.getG2sp(curve, 1, prev.nextChallenge, cur.key.alpha.g1_s, cur.key.alpha.g1_sx));
    cur.key.beta.g2_sp = curve.G2.toAffine(keyPair.getG2sp(curve, 2, prev.nextChallenge, cur.key.beta.g1_s, cur.key.beta.g1_sx));

    sr = await sameRatio(curve, cur.key.tau.g1_s, cur.key.tau.g1_sx, cur.key.tau.g2_sp, cur.key.tau.g2_spx);
    if (sr !== true) {
        if (logger) logger.error("INVALID key (tau) in challenge #"+cur.id);
        return false;
    }

    sr = await sameRatio(curve, cur.key.alpha.g1_s, cur.key.alpha.g1_sx, cur.key.alpha.g2_sp, cur.key.alpha.g2_spx);
    if (sr !== true) {
        if (logger) logger.error("INVALID key (alpha) in challenge #"+cur.id);
        return false;
    }

    sr = await sameRatio(curve, cur.key.beta.g1_s, cur.key.beta.g1_sx, cur.key.beta.g2_sp, cur.key.beta.g2_spx);
    if (sr !== true) {
        if (logger) logger.error("INVALID key (beta) in challenge #"+cur.id);
        return false;
    }

    sr = await sameRatio(curve, prev.tauG1, cur.tauG1, cur.key.tau.g2_sp, cur.key.tau.g2_spx);
    if (sr !== true) {
        if (logger) logger.error("INVALID tau*G1. challenge #"+cur.id+" It does not follow the previous contribution");
        return false;
    }

    sr = await sameRatio(curve,  cur.key.tau.g1_s, cur.key.tau.g1_sx, prev.tauG2, cur.tauG2);
    if (sr !== true) {
        if (logger) logger.error("INVALID tau*G2. challenge #"+cur.id+" It does not follow the previous contribution");
        return false;
    }

    sr = await sameRatio(curve, prev.alphaG1, cur.alphaG1, cur.key.alpha.g2_sp, cur.key.alpha.g2_spx);
    if (sr !== true) {
        if (logger) logger.error("INVALID alpha*G1. challenge #"+cur.id+" It does not follow the previous contribution");
        return false;
    }

    sr = await sameRatio(curve, prev.betaG1, cur.betaG1, cur.key.beta.g2_sp, cur.key.beta.g2_spx);
    if (sr !== true) {
        if (logger) logger.error("INVALID beta*G1. challenge #"+cur.id+" It does not follow the previous contribution");
        return false;
    }

    sr = await sameRatio(curve,  cur.key.beta.g1_s, cur.key.beta.g1_sx, prev.betaG2, cur.betaG2);
    if (sr !== true) {
        if (logger) logger.error("INVALID beta*G2. challenge #"+cur.id+"It does not follow the previous contribution");
        return false;
    }

    if (logger) logger.info("Powers Of tau file OK!");
    return true;
}

export default async function verify(tauFilename, logger) {
    let sr;
    await Blake2b.ready();

    const {fd, sections} = await binFileUtils.readBinFile(tauFilename, "ptau", 1);
    const {curve, power, ceremonyPower} = await utils.readPTauHeader(fd, sections);
    const contrs = await utils.readContributions(fd, curve, sections);

    if (logger) logger.debug("power: 2**" + power);
    // Verify Last contribution

    if (logger) logger.debug("Computing initial contribution hash");
    const initialContribution = {
        tauG1: curve.G1.g,
        tauG2: curve.G2.g,
        alphaG1: curve.G1.g,
        betaG1: curve.G1.g,
        betaG2: curve.G2.g,
        nextChallenge: utils.calculateFirstChallengeHash(curve, ceremonyPower, logger),
        responseHash: Blake2b(64).digest()
    };

    if (contrs.length == 0) {
        if (logger) logger.error("This file has no contribution! It cannot be used in production");
        return false;
    }

    let prevContr;
    if (contrs.length>1) {
        prevContr = contrs[contrs.length-2];
    } else {
        prevContr = initialContribution;
    }
    const curContr = contrs[contrs.length-1];
    if (logger) logger.debug("Validating contribution #"+contrs[contrs.length-1].id);
    const res = await verifyContribution(curve, curContr, prevContr, logger);
    if (!res) return false;


    const nextContributionHasher = Blake2b(64);
    nextContributionHasher.update(curContr.responseHash);

    // Verify powers and compute nextChallengeHash

    // await test();

    // Verify Section tau*G1
    if (logger) logger.debug("Verifying powers in tau*G1 section");
    const rTau1 = await processSection(2, "G1", "tauG1", (2 ** power)*2-1, [0, 1], logger);
    sr = await sameRatio(curve, rTau1.R1, rTau1.R2, curve.G2.g, curContr.tauG2);
    if (sr !== true) {
        if (logger) logger.error("tauG1 section. Powers do not match");
        return false;
    }
    if (!curve.G1.eq(curve.G1.g, rTau1.singularPoints[0])) {
        if (logger) logger.error("First element of tau*G1 section must be the generator");
        return false;
    }
    if (!curve.G1.eq(curContr.tauG1, rTau1.singularPoints[1])) {
        if (logger) logger.error("Second element of tau*G1 section does not match the one in the contribution section");
        return false;
    }

    // await test();

    // Verify Section tau*G2
    if (logger) logger.debug("Verifying powers in tau*G2 section");
    const rTau2 = await processSection(3, "G2", "tauG2", 2 ** power, [0, 1],  logger);
    sr = await sameRatio(curve, curve.G1.g, curContr.tauG1, rTau2.R1, rTau2.R2);
    if (sr !== true) {
        if (logger) logger.error("tauG2 section. Powers do not match");
        return false;
    }
    if (!curve.G2.eq(curve.G2.g, rTau2.singularPoints[0])) {
        if (logger) logger.error("First element of tau*G2 section must be the generator");
        return false;
    }
    if (!curve.G2.eq(curContr.tauG2, rTau2.singularPoints[1])) {
        if (logger) logger.error("Second element of tau*G2 section does not match the one in the contribution section");
        return false;
    }

    // Verify Section alpha*tau*G1
    if (logger) logger.debug("Verifying powers in alpha*tau*G1 section");
    const rAlphaTauG1 = await processSection(4, "G1", "alphatauG1", 2 ** power, [0], logger);
    sr = await sameRatio(curve, rAlphaTauG1.R1, rAlphaTauG1.R2, curve.G2.g, curContr.tauG2);
    if (sr !== true) {
        if (logger) logger.error("alphaTauG1 section. Powers do not match");
        return false;
    }
    if (!curve.G1.eq(curContr.alphaG1, rAlphaTauG1.singularPoints[0])) {
        if (logger) logger.error("First element of alpha*tau*G1 section (alpha*G1) does not match the one in the contribution section");
        return false;
    }

    // Verify Section beta*tau*G1
    if (logger) logger.debug("Verifying powers in beta*tau*G1 section");
    const rBetaTauG1 = await processSection(5, "G1", "betatauG1", 2 ** power, [0], logger);
    sr = await sameRatio(curve, rBetaTauG1.R1, rBetaTauG1.R2, curve.G2.g, curContr.tauG2);
    if (sr !== true) {
        if (logger) logger.error("betaTauG1 section. Powers do not match");
        return false;
    }
    if (!curve.G1.eq(curContr.betaG1, rBetaTauG1.singularPoints[0])) {
        if (logger) logger.error("First element of beta*tau*G1 section (beta*G1) does not match the one in the contribution section");
        return false;
    }

    //Verify Beta G2
    const betaG2 = await processSectionBetaG2(logger);
    if (!curve.G2.eq(curContr.betaG2, betaG2)) {
        if (logger) logger.error("betaG2 element in betaG2 section does not match the one in the contribution section");
        return false;
    }


    const nextContributionHash = nextContributionHasher.digest();

    // Check the nextChallengeHash
    if (power == ceremonyPower) {
        if (!misc.hashIsEqual(nextContributionHash,curContr.nextChallenge)) {
            if (logger) logger.error("Hash of the values does not match the next challenge of the last contributor in the contributions section");
            return false;
        }
    }

    if (logger) logger.info(misc.formatHash(nextContributionHash, "Next challenge hash: "));

    // Verify Previous contributions

    printContribution(curContr, prevContr);
    for (let i = contrs.length-2; i>=0; i--) {
        const curContr = contrs[i];
        const prevContr =  (i>0) ? contrs[i-1] : initialContribution;
        const res = await verifyContribution(curve, curContr, prevContr, logger);
        if (!res) return false;
        printContribution(curContr, prevContr, logger);
    }
    if (logger) logger.info("-----------------------------------------------------");

    if ((!sections[12]) || (!sections[13]) || (!sections[14]) || (!sections[15])) {
        if (logger) logger.warn(
            "this file does not contain phase2 precalculated values. Please run: \n" +
            "   snarkjs \"powersoftau preparephase2\" to prepare this file to be used in the phase2 ceremony."
        );
    } else {
        let res;
        res = await verifyLagrangeEvaluations("G1", 2, 12, "tauG1", logger);
        if (!res) return false;
        res = await verifyLagrangeEvaluations("G2", 3, 13, "tauG2", logger);
        if (!res) return false;
        res = await verifyLagrangeEvaluations("G1", 4, 14, "alphaTauG1", logger);
        if (!res) return false;
        res = await verifyLagrangeEvaluations("G1", 5, 15, "betaTauG1", logger);
        if (!res) return false;
    }

    await fd.close();

    if (logger) logger.info("Powers of Tau Ok!");

    return true;

    function printContribution(curContr, prevContr) {
        if (!logger) return;
        logger.info("-----------------------------------------------------");
        logger.info(`Contribution #${curContr.id}: ${curContr.name ||""}`);

        logger.info(misc.formatHash(curContr.nextChallenge, "Next Challenge: "));

        const buffV  = new Uint8Array(curve.G1.F.n8*2*6+curve.G2.F.n8*2*3);
        utils.toPtauPubKeyRpr(buffV, 0, curve, curContr.key, false);

        const responseHasher = Blake2b(64);
        responseHasher.setPartialHash(curContr.partialHash);
        responseHasher.update(buffV);
        const responseHash = responseHasher.digest();

        logger.info(misc.formatHash(responseHash, "Response Hash:"));

        logger.info(misc.formatHash(prevContr.nextChallenge, "Response Hash:"));

        if (curContr.type == 1) {
            logger.info(`Beacon generator: ${misc.byteArray2hex(curContr.beaconHash)}`);
            logger.info(`Beacon iterations Exp: ${curContr.numIterationsExp}`);
        }

    }

    async function processSectionBetaG2(logger) {
        const G = curve.G2;
        const sG = G.F.n8*2;
        const buffUv = new Uint8Array(sG);

        if (!sections[6])  {
            logger.error("File has no BetaG2 section");
            throw new Error("File has no BetaG2 section");
        }
        if (sections[6].length>1) {
            logger.error("File has no BetaG2 section");
            throw new Error("File has more than one GetaG2 section");
        }
        fd.pos = sections[6][0].p;

        const buff = await fd.read(sG);
        const P = G.fromRprLEM(buff);

        G.toRprUncompressed(buffUv, 0, P);
        nextContributionHasher.update(buffUv);

        return P;
    }

    async function processSection(idSection, groupName, sectionName, nPoints, singularPointIndexes, logger) {
        const MAX_CHUNK_SIZE = 1<<16;
        const G = curve[groupName];
        const sG = G.F.n8*2;
        await binFileUtils.startReadUniqueSection(fd, sections, idSection);

        const singularPoints = [];

        let R1 = G.zero;
        let R2 = G.zero;

        let lastBase = G.zero;

        for (let i=0; i<nPoints; i += MAX_CHUNK_SIZE) {
            if (logger) logger.debug(`points relations: ${sectionName}: ${i}/${nPoints} `);
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

    async function verifyLagrangeEvaluations(gName, tauSection, lagrangeSection, sectionName, logger) {

        if (logger) logger.debug(`Verifying phase2 calculated values ${sectionName}...`);
        const G = curve[gName];
        const sG = G.F.n8*2;

        const seed= new Array(8);
        for (let i=0; i<8; i++) {
            seed[i] = crypto.randomBytes(4).readUInt32BE(0, true);
        }

        for (let p=0; p<= power; p ++) {
            const res = await verifyPower(p);
            if (!res) return false;
        }

        if (tauSection == 2) {
            const res = await verifyPower(power+1);
            if (!res) return false;
        }

        return true;

        async function verifyPower(p) {
            if (logger) logger.debug(`Power ${p}...`);
            const n8r = curve.Fr.n8;
            const nPoints = 2 ** p;
            let buff_r = new Uint32Array(nPoints);
            let buffG;

            let rng = new ChaCha(seed);

            if (logger) logger.debug(`Creating random numbers Powers${p}...`);
            for (let i=0; i<nPoints; i++) {
                if ((p == power+1)&&(i == nPoints-1)) {
                    buff_r[i] = 0;
                } else {
                    buff_r[i] = rng.nextU32();
                }
            }

            buff_r = new Uint8Array(buff_r.buffer, buff_r.byteOffset, buff_r.byteLength);

            if (logger) logger.debug(`reading points Powers${p}...`);
            await binFileUtils.startReadUniqueSection(fd, sections, tauSection);
            buffG = new BigBuffer(nPoints*sG);
            if (p == power+1) {
                await fd.readToBuffer(buffG, 0, (nPoints-1)*sG);
                buffG.set(curve.G1.zeroAffine, (nPoints-1)*sG);
            } else {
                await fd.readToBuffer(buffG, 0, nPoints*sG);
            }
            await binFileUtils.endReadSection(fd, true);

            const resTau = await G.multiExpAffine(buffG, buff_r, logger, sectionName + "_" + p);

            buff_r = new BigBuffer(nPoints * n8r);

            rng = new ChaCha(seed);

            const buff4 = new Uint8Array(4);
            const buff4V = new DataView(buff4.buffer);

            if (logger) logger.debug(`Creating random numbers Powers${p}...`);
            for (let i=0; i<nPoints; i++) {
                if ((i != nPoints-1) || (p != power+1)) {
                    buff4V.setUint32(0, rng.nextU32(), true);
                    buff_r.set(buff4, i*n8r);
                }
            }

            if (logger) logger.debug(`batchToMontgomery ${p}...`);
            buff_r = await curve.Fr.batchToMontgomery(buff_r);
            if (logger) logger.debug(`fft ${p}...`);
            buff_r = await curve.Fr.fft(buff_r);
            if (logger) logger.debug(`batchFromMontgomery ${p}...`);
            buff_r = await curve.Fr.batchFromMontgomery(buff_r);

            if (logger) logger.debug(`reading points Lagrange${p}...`);
            await binFileUtils.startReadUniqueSection(fd, sections, lagrangeSection);
            fd.pos += sG*((2 ** p)-1);
            await fd.readToBuffer(buffG, 0, nPoints*sG);
            await binFileUtils.endReadSection(fd, true);

            const resLagrange = await G.multiExpAffine(buffG, buff_r, logger, sectionName + "_" + p + "_transformed");

            if (!G.eq(resTau, resLagrange)) {
                if (logger) logger.error("Phase2 caclutation does not match with powers of tau");
                return false;
            }

            return true;
        }
    }
}
