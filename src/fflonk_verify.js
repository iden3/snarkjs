/*
    Copyright 2022 iden3 association.

    This file is part of snarkjs.

    snarkjs is a free software: you can redistribute it and/or
    modify it under the terms of the GNU General Public License as published by the
    Free Software Foundation, either version 3 of the License, or (at your option)
    any later version.

    snarkjs is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
    more details.

    You should have received a copy of the GNU General Public License along with
    snarkjs. If not, see <https://www.gnu.org/licenses/>.
*/

import * as curves from "./curves.js";
import { BigBuffer, utils } from "ffjavascript";
import { Proof } from "./proof.js";
import { Keccak256Transcript } from "./Keccak256Transcript.js";
import { verifyOpenings } from "shplonkjs";
import { lcm } from "shplonkjs/src/utils.js";

const { unstringifyBigInts } = utils;

export default async function fflonkVerify(_vk_verifier, _publicSignals, _proof, logger) {
    if (logger) logger.info("FFLONK VERIFIER STARTED");

    _vk_verifier = unstringifyBigInts(_vk_verifier);
    _proof = unstringifyBigInts(_proof);

    const curve = await curves.getCurveFromName(_vk_verifier.curve);

    const vk = fromObjectVk(curve, _vk_verifier);

    const proof = new Proof(curve, logger);
    proof.fromObjectProof(_proof);

    const publicSignals = unstringifyBigInts(_publicSignals);

    if (publicSignals.length !== vk.nPublic) {
        logger.error("Number of public signals does not match with vk");
        return false;
    }

    const Fr = curve.Fr;

    if (logger) {
        logger.info("----------------------------");
        logger.info("  FFLONK VERIFY SETTINGS");
        logger.info(`  Curve:         ${curve.name}`);
        logger.info(`  Circuit power: ${vk.power}`);
        logger.info(`  Domain size:   ${2 ** vk.power}`);
        logger.info(`  Public vars:   ${vk.nPublic}`);
        logger.info("----------------------------");
    }

    const commits = proof.polynomials;
    const fs = Object.keys(vk).filter(k => k.match(/^f\d/));    
    for(let i = 0; i < fs.length; ++i) {
        commits[fs[i]] = vk[fs[i]];
    }

    const evaluations = proof.evaluations;

    // STEP 1 - Validate that all polynomial commitments ∈ G_1
    if (logger) logger.info("> Checking commitments belong to G1");
    if (!commitmentsBelongToG1(curve, commits)) {
        if(logger) logger.error("Proof is not well constructed");
        return false;
    }

    // TODO
    // STEP 2 - Validate that all evaluations ∈ F

    // TODO
    // STEP 3 - Validate that w_i ∈ F for i ∈ [l]

    // STEP 4 - Compute the challenges: beta, gamma, xi
    // as in prover description, from the common preprocessed inputs, public inputs and elements of π_SNARK
    if (logger) logger.info("> Computing challenges");
    const { challenges } = computeChallenges(curve, commits, vk, publicSignals, logger);

    // STEP 5 - Compute the zero polynomial evaluation Z_H(xi) = xi^n - 1
    if (logger) logger.info("> Computing Zero polynomial evaluation Z_H(xi)");
    challenges.zh = Fr.sub(challenges.xiN, Fr.one);
    challenges.invzh = Fr.inv(challenges.zh);

    // STEP 6 - Compute the lagrange polynomial evaluation L_1(xi)
    if (logger) logger.info("> Computing Lagrange evaluations");
    const lagrangeEvals = await computeLagrangeEvaluations(curve, challenges, vk);

    // STEP 7 - Compute public input evaluation PI(xi)
    if (logger) logger.info("> Computing polynomial identities PI(X)");
    const pi = calculatePI(curve, publicSignals, lagrangeEvals);

    // STEP 8 - Compute polynomial T0(xi)
    if (logger) logger.info("> Computing t0(xi)");
    const t0 = computeT0(proof, challenges, pi, curve, logger);
    evaluations.T0 = t0;

    // STEP 9 - Compute polynomial T1(xi)
    if (logger) logger.info("> Computing t1(xi)");
    const t1 = computeT1(proof, challenges, lagrangeEvals[1], curve, logger);
    evaluations.T1 = t1;

    // STEP 9 - Compute polynomial T2(xi)
    if (logger) logger.info("> Computing t2(xi)");
    const t2 = computeT2(proof, challenges, vk, curve, logger);
    evaluations.T2 = t2;

    if (logger) logger.info("> Verifying openings");
    const res = verifyOpenings(vk, commits, evaluations, curve, {logger, xiSeed: challenges.xiSeed, nonCommittedPols:["T0", "T1", "T2"]});

    if (logger) {
        if (res) {
            logger.info("PROOF VERIFIED SUCCESSFULLY");
        } else {
            logger.warn("Invalid Proof");
        }
    }

    if (logger) logger.info("FFLONK VERIFIER FINISHED");

    return res;

}

function fromObjectVk(curve, vk) {
    const res = vk;
    res.k1 = curve.Fr.fromObject(vk.k1);
    res.k2 = curve.Fr.fromObject(vk.k2);
    res.w = curve.Fr.fromObject(vk.w);
    const ws = Object.keys(vk).filter(k => k.match(/^w\d/));    
    for(let i = 0; i < ws.length; ++i) {
        res[ws[i]] = curve.Fr.fromObject(vk[ws[i]]);
    }
    res.X_2 = curve.G2.fromObject(vk.X_2);
    const fs = Object.keys(vk).filter(k => k.match(/^f\d/));  
    for(let i = 0; i < fs.length; ++i) {
        res[fs[i]] = curve.G1.fromObject(vk[fs[i]]);
    }
    return res;
}

function commitmentsBelongToG1(curve, commits) {
    const G1 = curve.G1;
    for(let i = 0; i < Object.keys(commits).length; ++i) {
        const key = Object.keys(commits)[i];
        if(!G1.isValid(commits[key])) return false;
    }
    return true;
}

function computeChallenges(curve, commits, vk, publicSignals, logger) {
    const Fr = curve.Fr;

    const challenges = {};
    const transcript = new Keccak256Transcript(curve);

    // Add stage 0 commits to the transcript
    const commitsStage0 = vk.f.filter(fi => fi.stages[0].stage === 0);
    for(let i = 0; i < commitsStage0.length; ++i) {
        transcript.addPolCommitment(commits[`f${commitsStage0[i].index}`]);
    }

    for (let i = 0; i < publicSignals.length; i++) {
        transcript.addScalar(Fr.e(publicSignals[i]));
    }
    const commitsStage1 = vk.f.filter(fi => fi.stages[0].stage === 1);
    for(let i = 0; i < commitsStage1.length; ++i) {
        transcript.addPolCommitment(commits[`f${commitsStage1[i].index}`]);
    }

    challenges.beta = transcript.getChallenge();
    transcript.reset();

    transcript.addScalar(challenges.beta);
    challenges.gamma = transcript.getChallenge();

    transcript.reset();
    transcript.addScalar(challenges.gamma);
    const commitsStage2 = vk.f.filter(fi => fi.stages[0].stage === 2);
    for(let i = 0; i < commitsStage2.length; ++i) {
        transcript.addPolCommitment(commits[`f${commitsStage2[i].index}`]);
    }
    const xiSeed = transcript.getChallenge();
    challenges.xiSeed = xiSeed;
       
    const powerW = lcm(Object.keys(vk).filter(k => k.match(/^w\d$/)).map(wi => wi.slice(1)));

    // Compute xi = xi_seeder^powerW
    challenges.xi = Fr.one;
    for(let i = 0; i < powerW; ++i) {
        challenges.xi = Fr.mul(challenges.xi, xiSeed);
    }
   
    challenges.xiN = challenges.xi;
    vk.domainSize = 1;
    for (let i = 0; i < vk.power; i++) {
        challenges.xiN = Fr.square(challenges.xiN);
        vk.domainSize *= 2;
    }

    if (logger) {
        logger.info("··· challenges.beta:  " + Fr.toString(challenges.beta));
        logger.info("··· challenges.gamma: " + Fr.toString(challenges.gamma));
        logger.info("··· challenges.xi:    " + Fr.toString(challenges.xi));
    }

    return { challenges: challenges };
}

async function computeLagrangeEvaluations(curve, challenges, vk) {
    const Fr = curve.Fr;

    const size = Math.max(1, vk.nPublic);
    const numArr = new BigBuffer(size * Fr.n8);
    let denArr = new BigBuffer(size * Fr.n8);

    let w = Fr.one;
    for (let i = 0; i < size; i++) {
        const i_sFr = i * Fr.n8;
        numArr.set(Fr.mul(w, challenges.zh), i_sFr);
        denArr.set(Fr.mul(Fr.e(vk.domainSize), Fr.sub(challenges.xi, w)), i_sFr);
        w = Fr.mul(w, vk.w);
    }

    denArr = await Fr.batchInverse(denArr);

    let L = [];
    for (let i = 0; i < size; i++) {
        const i_sFr = i * Fr.n8;
        L[i + 1] = Fr.mul(numArr.slice(i_sFr, i_sFr + Fr.n8), denArr.slice(i_sFr, i_sFr + Fr.n8));
    }
    return L;
}

function calculatePI(curve, publicSignals, lagrangeEvals) {
    const Fr = curve.Fr;

    let pi = Fr.zero;
    for (let i = 0; i < publicSignals.length; i++) {
        const w = Fr.e(publicSignals[i]);
        pi = Fr.sub(pi, Fr.mul(w, lagrangeEvals[i + 1]));
    }
    return pi;
}

function computeT0(proof, challenges, pi, curve, logger) {
    const Fr = curve.Fr;
    
    // T0(xi) = [ qL·a + qR·b + qM·a·b + qO·c + qC + PI(xi) ] / Z_H(xi)

    // Compute T0(xi)
    if (logger) logger.info("··· Computing T0(xi)");
    let t0 = Fr.mul(proof.evaluations.QL, proof.evaluations.A);
    t0 = Fr.add(t0, Fr.mul(proof.evaluations.QR, proof.evaluations.B));
    t0 = Fr.add(t0, Fr.mul(proof.evaluations.QM, Fr.mul(proof.evaluations.A, proof.evaluations.B)));
    t0 = Fr.add(t0, Fr.mul(proof.evaluations.QO, proof.evaluations.C));
    t0 = Fr.add(t0, proof.evaluations.QC);
    t0 = Fr.add(t0, pi);
    t0 = Fr.mul(t0, challenges.invzh);
    return t0;

}

function computeT1(proof, challenges, lagrange1, curve, logger) {
    const Fr = curve.Fr;
    // T1(xi) = [ L_1(xi)(z-1)] / Z_H(xi) 

    // Compute T1(xi)
    if (logger) logger.info("··· Computing T1(xi)");
    let t1 = Fr.sub(proof.evaluations.Z, Fr.one);
    t1 = Fr.mul(t1, lagrange1);
    t1 = Fr.mul(t1, challenges.invzh);

    return t1;
}

function computeT2(proof, challenges, vk, curve, logger) {
    const Fr = curve.Fr;
    // T2(xi) = [  (a + beta·xi + gamma)(b + beta·xi·k1 + gamma)(c + beta·xi·k2 + gamma)z
    //               - (a + beta·sigma1 + gamma)(b + beta·sigma2 + gamma)(c + beta·sigma3 + gamma)zω  ] / Z_H(xi)

    // Compute T2(xi)
    if (logger) logger.info("··· Computing T2(xi)");
    const betaxi = Fr.mul(challenges.beta, challenges.xi);
    const t211 = Fr.add(proof.evaluations.A, Fr.add(betaxi, challenges.gamma));
    const t212 = Fr.add(proof.evaluations.B, Fr.add(Fr.mul(betaxi, vk.k1), challenges.gamma));
    const t213 = Fr.add(proof.evaluations.C, Fr.add(Fr.mul(betaxi, vk.k2), challenges.gamma));
    const t21 = Fr.mul(t211, Fr.mul(t212, Fr.mul(t213, proof.evaluations.Z)));

    const t221 = Fr.add(proof.evaluations.A, Fr.add(Fr.mul(challenges.beta, proof.evaluations.Sigma1), challenges.gamma));
    const t222 = Fr.add(proof.evaluations.B, Fr.add(Fr.mul(challenges.beta, proof.evaluations.Sigma2), challenges.gamma));
    const t223 = Fr.add(proof.evaluations.C, Fr.add(Fr.mul(challenges.beta, proof.evaluations.Sigma3), challenges.gamma));
    const t22 = Fr.mul(t221, Fr.mul(t222, Fr.mul(t223, proof.evaluations.Zw)));

    let t2 = Fr.sub(t21, t22);
    t2 = Fr.mul(t2, challenges.invzh);

    return t2;
}
