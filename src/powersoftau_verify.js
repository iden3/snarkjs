const Blake2b = require("blake2b-wasm");
const utils = require("./powersoftau_utils");
const keyPair = require("./keypair");
const assert = require("assert");
const crypto = require("crypto");
const buildTaskManager = require("./taskmanager");
const binFileUtils = require("./binfileutils");
const ChaCha = require("ffjavascript").ChaCha;

function sameRatio(curve, g1s, g1sx, g2s, g2sx) {
    if (curve.G1.isZero(g1s)) return false;
    if (curve.G1.isZero(g1sx)) return false;
    if (curve.G2.isZero(g2s)) return false;
    if (curve.G2.isZero(g2sx)) return false;
    return curve.F12.eq(curve.pairing(g1s, g2sx), curve.pairing(g1sx, g2s));
}

function verifyContribution(curve, cur, prev) {

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

    cur.key.tau.g2_sp = keyPair.getG2sp(0, prev.nextChallange, cur.key.tau.g1_s, cur.key.tau.g1_sx);
    cur.key.alpha.g2_sp = keyPair.getG2sp(1, prev.nextChallange, cur.key.alpha.g1_s, cur.key.alpha.g1_sx);
    cur.key.beta.g2_sp = keyPair.getG2sp(2, prev.nextChallange, cur.key.beta.g1_s, cur.key.beta.g1_sx);

    if (!sameRatio(curve, cur.key.tau.g1_s, cur.key.tau.g1_sx, cur.key.tau.g2_sp, cur.key.tau.g2_spx)) {
        console.log("INVALID key (tau) in challange #"+cur.id);
        return false;
    }

    if (!sameRatio(curve, cur.key.alpha.g1_s, cur.key.alpha.g1_sx, cur.key.alpha.g2_sp, cur.key.alpha.g2_spx)) {
        console.log("INVALID key (alpha) in challange #"+cur.id);
        return false;
    }

    if (!sameRatio(curve, cur.key.beta.g1_s, cur.key.beta.g1_sx, cur.key.beta.g2_sp, cur.key.beta.g2_spx)) {
        console.log("INVALID key (beta) in challange #"+cur.id);
        return false;
    }

    if (!sameRatio(curve, prev.tauG1, cur.tauG1, cur.key.tau.g2_sp, cur.key.tau.g2_spx)) {
        console.log("INVALID tau*G1. challange #"+cur.id+" It does not follow the previous contribution");
        return false;
    }

    if (!sameRatio(curve,  cur.key.tau.g1_s, cur.key.tau.g1_sx, prev.tauG2, cur.tauG2,)) {
        console.log("INVALID tau*G2. challange #"+cur.id+" It does not follow the previous contribution");
        return false;
    }

    if (!sameRatio(curve, prev.alphaG1, cur.alphaG1, cur.key.alpha.g2_sp, cur.key.alpha.g2_spx)) {
        console.log("INVALID alpha*G1. challange #"+cur.id+" It does not follow the previous contribution");
        return false;
    }

    if (!sameRatio(curve, prev.betaG1, cur.betaG1, cur.key.beta.g2_sp, cur.key.beta.g2_spx)) {
        console.log("INVALID beta*G1. challange #"+cur.id+" It does not follow the previous contribution");
        return false;
    }

    if (!sameRatio(curve,  cur.key.beta.g1_s, cur.key.beta.g1_sx, prev.betaG2, cur.betaG2,)) {
        console.log("INVALID beta*G2. challange #"+cur.id+"It does not follow the previous contribution");
        return false;
    }

    return true;
}

async function verify(tauFilename, verbose) {
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
    const res = verifyContribution(curve, curContr,prevContr, verbose);
    if (!res) return false;


    const nextContributionHasher = Blake2b(64);
    nextContributionHasher.update(curContr.responseHash);
    const key = curContr.key;

    // Verify powers and compute nextChallangeHash

    // await test();

    // Verify Section tau*G1
    if (verbose) console.log("Verifying powers in tau*G1 section");
    const rTau1 = await processSection(2, "G1", "tauG1", (1 << power)*2-1, [0, 1]);
    if (!sameRatio(curve, rTau1.R1, rTau1.R2, curve.G2.g, curContr.tauG2)) {
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
    if (!sameRatio(curve, curve.G1.g, curContr.tauG1, rTau2.R1, rTau2.R2)) {
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
    if (!sameRatio(curve, rAlphaTauG1.R1, rAlphaTauG1.R2, curve.G2.g, curContr.tauG2)) {
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
    if (!sameRatio(curve, rBetaTauG1.R1, rBetaTauG1.R2, curve.G2.g, curContr.tauG2)) {
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
    if (!utils.hashIsEqual(nextContributionHash,curContr.nextChallange)) {
        console.log("Hash of the values does not match the next challange of the last contributor in the contributions section");
        return false;
    }

    if (verbose) {
        console.log("Next challange hash: ");
        console.log(utils.formatHash(nextContributionHash));
    }

    // Verify Previous contributions

    printContribution(curContr, prevContr);
    for (let i = contrs.length-2; i>=0; i--) {
        const curContr = contrs[i];
        const prevContr =  (curContr>0) ? contrs[i-1] : initialContribution;
        verifyContribution(curve, curContr, prevContr);
        printContribution(curContr, prevContr);
    }
    console.log("-----------------------------------------------------");

    if ((!sections[12]) || (!sections[13]) || (!sections[14]) || (!sections[15])) {
        console.log("this file does not contain phase2 precalculated values. Please run: ");
        console.log("   snarkjs \"powersoftau preparephase2\" to prepare this file to be used in the phase2 ceremony." );
    } else {
        let res;
        res = await verifyLagrangeEvaluations("G1", 1 << power, 2, 12, "tauG1");
        if (!res) return false;
        res = await verifyLagrangeEvaluations("G2", 1 << power, 3, 13, "tauG2");
        if (!res) return false;
        res = await verifyLagrangeEvaluations("G1", 1 << power, 4, 14, "alphaTauG1");
        if (!res) return false;
        res = await verifyLagrangeEvaluations("G1", 1 << power, 5, 15, "betaTauG1");
        if (!res) return false;
    }

    await fd.close();

    return true;

    function printContribution(curContr, prevContr) {
        console.log("-----------------------------------------------------");
        console.log(`Contribution #${curContr.id}: ${curContr.name ||""}`);
        console.log("\tBased on challange");
        console.log(utils.formatHash(prevContr.nextChallange));

        const buffV  = new Uint8Array(curve.G1.F.n8*2*6+curve.G2.F.n8*2*3);
        utils.toPtauPubKeyRpr(buffV, 0, curve, key, false);

        const responseHasher = Blake2b(64);
        responseHasher.setPartialHash(curContr.partialHash);
        responseHasher.update(buffV);
        const responseHash = responseHasher.digest();

        console.log("\tResponse Hash");
        console.log(utils.formatHash(responseHash));

        console.log("\tNext Challange");
        console.log(utils.formatHash(curContr.nextChallange));
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

        G.toRprBE(buffUv, 0, P);
        nextContributionHasher.update(buffUv);

        return P;
    }

    async function processSection(idSection, gName, sectionName, nPoints, singularPointIds) {
        const MAX_CHUNK_SIZE = 1024;
        const G = curve[gName];
        const sG = G.F.n8*2;
        const buffUv = new Uint8Array(G.F.n8*2);

        const singularPoints = [];

        if (!sections[idSection])  assert(false, `File has no ${sectionName} section`);
        if (sections[idSection].length>1) assert(false, `File has more than one ${sectionName} section`);
        fd.pos = sections[idSection][0].p;

        const seed= new Array(8);
        for (let i=0; i<8; i++) {
            seed[i] = crypto.randomBytes(4).readUInt32BE(0, true);
        }

        const taskManager = await buildTaskManager(verifyThread, {
            ffjavascript: "ffjavascript"
        },{
            curve: curve.name,
            seed: seed
        });

        let R1 = G.zero;
        let R2 = G.zero;

        for (let i=0; i<nPoints; i += MAX_CHUNK_SIZE) {
            if ((verbose)&&i) console.log(`${sectionName}:  ` + i);
            const n = Math.min(nPoints - i, MAX_CHUNK_SIZE);
            const buff = await fd.read(n*sG);
            await taskManager.addTask({
                cmd: "MUL",
                G: gName,
                n: n,
                TotalPoints: nPoints,
                buff: buff.slice(),
                offset: i
            }, async function(r) {
                R1 = G.add(R1, r.R1);
                R2 = G.add(R2, r.R2);
            });
            for (let j=i; j<i+n; j++) {
                const P = G.fromRprLEM(buff, (j-i)*sG);
                G.toRprBE(buffUv, 0, P);
                nextContributionHasher.update(buffUv);
                if (singularPointIds.indexOf(j)>=0) singularPoints.push(P);
            }
        }

        if (fd.pos != sections[idSection][0].p + sections[idSection][0].size) assert(false, `Invalid ${sectionName} section size`);

        await taskManager.finish();
        return {
            R1: R1,
            R2: R2,
            singularPoints: singularPoints
        };
    }

    async function verifyLagrangeEvaluations(gName, nPoints, tauSection, lagrangeSection, sectionName) {

        if (verbose) console.log(`Verifying phase2 calculated values ${sectionName}...`);

        const n8r = curve.Fr.n8;
        let buff_r = new Uint8Array(nPoints * n8r);
        let buffG;
        const G = curve[gName];
        const sG = G.F.n8*2;

        const seed= new Array(8);
        for (let i=0; i<8; i++) {
            seed[i] = crypto.randomBytes(4).readUInt32BE(0, true);
        }

        const rng = new ChaCha(seed);

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


function verifyThread(ctx, task) {
    const pow = 16;
    const NSet = 1<<pow;
    if (task.cmd == "INIT") {
        ctx.assert = ctx.modules.assert;
        if (task.curve == "bn128") {
            ctx.curve = ctx.modules.ffjavascript.bn128;
        } else {
            ctx.assert(false, "curve not defined");
        }
        ctx.rndPerm = buildRndPerm(task.seed);
        return {};
    } else if (task.cmd == "MUL") {
        const G = ctx.curve[task.G];
        const sG = G.F.n8*2;
        const acc1 = new Array(NSet);
        const acc2 = new Array(NSet);
        for (let i=0; i<NSet; i++) {
            acc1[i] = G.zero;
            acc2[i] = G.zero;
        }
        for (let i=0; i<task.n; i++) {
            const P = G.fromRprLEM(task.buff, i*sG);
            if (task.offset+i < task.TotalPoints-1) {
                const r = ctx.rndPerm(task.offset + i);
                acc1[r] = G.add(acc1[r], P);
            }
            if (task.offset+i > 0) {
                const r = ctx.rndPerm(task.offset + i-1);
                acc2[r] = G.add(acc2[r], P);
            }
        }
        reduceExp(G, acc1, pow);
        reduceExp(G, acc2, pow);
        return {
            R1: acc1[0],
            R2: acc2[0]
        };
    } else {
        ctx.assert(false, "Op not implemented");
    }

    function reduceExp(G, accs, p) {
        if (p==1) return;
        const half = 1 << (p-1);

        for (let i=0; i<half-1; i++) {
            accs[i] = G.add(accs[i], accs[half+i]);
            accs[half-1] = G.add(accs[half-1], accs[half+i]);
        }
        reduceExp(G, accs, p-1);
        for (let i=0; i<p-1;i++) accs[half-1] = G.double(accs[half-1]);
        accs[0] = G.add(accs[0], accs[half-1] );
    }

    function buildRndPerm(aSeed) {
        const seed = aSeed;

        const nPages = 2;

        const pageId = new Array(nPages);
        const pages = new Array(nPages);
        for (let i=0; i<nPages; i++) {
            pageId[i] = -1;
            pages[i] = new Array(16);
        }
        let nextLoad = 0;

        function loadPage(p) {
            seed[0] = p;
            const c = nextLoad;
            nextLoad = (nextLoad+1) % nPages;
            const rng = new ctx.modules.ffjavascript.ChaCha(seed);
            for (let i=0; i<16; i++) {
                pages[c][i] = rng.nextU32();
            }
            pageId[c] = p;
            return c;
        }

        return function(n) {
            const page = n>>4;
            let idx = pageId.indexOf(page);
            if (idx < 0) idx = loadPage(page);
            return pages[idx][n & 0xF] % (NSet-1);
        };

    }

}


module.exports = verify;
