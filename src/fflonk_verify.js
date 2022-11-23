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

import {Scalar} from "ffjavascript";
import * as curves from "./curves.js";
import {utils} from "ffjavascript";

const {unstringifyBigInts} = utils;
import jsSha3 from "js-sha3";
import {Proof} from "./proof.js";
import {Keccak256Transcript} from "./Keccak256Transcript.js";
//import {BP_ADDITIONS_ZKEY_SECTION} from "./fflonk.js";

const {keccak256} = jsSha3;


export default async function fflonkVerify(_vk_verifier, _publicSignals, _proof, logger) {
    const curve = await curves.getCurveFromName(vk.curve);

    const Fr = curve.Fr;
    const G1 = curve.G1;

    const vk = fromObjectVk(curve, unstringifyBigInts(_vk_verifier));

    const proof = new Proof(curve, logger);
    proof.fromObjectProof(unstringifyBigInts(_proof));

    const publicSignals = unstringifyBigInts(_publicSignals);

    if (publicSignals.length !== vk.nPublic) {
        logger.error("Number of public signals does not match with vk");
        return false;
    }

    // TODO have we to check verifier processed input?? In theory we can trust, but...
    // STEP 1 - Validate that all polynomial commitments ∈ G_1
    if (!commitmentsBelongToG1(curve, proof)) {
        logger.error("Proof is not well constructed");
        return false;
    }

    // TODO
    // STEP 2 - Validate that all evaluations ∈ F
    // TODO How to do it?

    // TODO
    // STEP 3 - Validate that w_i ∈ F for i ∈ [l]

    // STEP 4 - Compute the challenges beta, gamma, xi, alpha and y ∈ F
    // as in prover description, from the common preprocessed inputs, public inputs and elements of π_SNARK
    if (logger) logger.info("Computing challenges");
    const challenges = computeChallenges(curve, proof, vk, publicSignals, logger);

    // STEP 5 - Compute the zero polynomial evaluation Z_H(xi) = xi^n - 1
    challenges.zh = Fr.sub(challenges.xiN, Fr.one);

    // STEP 6 - Compute the lagrange polynomial evaluation L_1(xi)
    if (logger) logger.info("Computing Lagrange evaluations");
    const lagrange1 = computeLagrange1Evaluation(curve, challenges, vk, logger);

    // STEP 7 - Compute public input evaluation PI(xi)
    if (logger) logger.info("Computing polynomial identities PI(X)");
    const pi = calculatePI(curve, publicSignals, lagrange1);

    // STEP 8 - Compute polynomial r1 ∈ F_{<4}[X]
    if (logger) logger.info("Computing r1");
    const r1 = computeR1(proof, challenges, pi, lagrange1[1], curve);

    // STEP 9 - Compute polynomial r2 ∈ F_{<6}[X]
    if (logger) logger.info("Computing r2");
    const r2 = computeR2(proof, challenges, lagrange1[1], curve);

    if (logger) logger.info("Computing F");
    const F = computeF(curve, proof, challenges, vk);

    if (logger) logger.info("Computing E");
    const E = computeE(curve, proof, challenges, vk);

    if (logger) logger.info("Computing J");
    const J = computeJ(curve, proof, challenges, vk, r1, r2);

    const res = await isValidPairing(curve, proof, challenges, vk, F, E, J);

    if (logger) {
        if (res) {
            logger.info("Valid proof");
        } else {
            logger.warn("Invalid Proof");
        }
    }

    return res;

}

function fromObjectVk(curve, vk) {
    const G1 = curve.G1;
    const G2 = curve.G2;
    const Fr = curve.Fr;
    const res = vk;
    res.Qm = G1.fromObject(vk.Qm);
    res.Ql = G1.fromObject(vk.Ql);
    res.Qr = G1.fromObject(vk.Qr);
    res.Qo = G1.fromObject(vk.Qo);
    res.Qc = G1.fromObject(vk.Qc);
    res.S1 = G1.fromObject(vk.S1);
    res.S2 = G1.fromObject(vk.S2);
    res.S3 = G1.fromObject(vk.S3);
    res.k1 = Fr.fromObject(vk.k1);
    res.k2 = Fr.fromObject(vk.k2);
    res.X_2 = G2.fromObject(vk.X_2);

    return res;
}

function commitmentsBelongToG1(curve, proof) {
    const G1 = curve.G1;
    return G1.isValid(proof.polynomials.C1)
        && G1.isValid(proof.polynomials.C2)
        && G1.isValid(proof.polynomials.W1)
        && G1.isValid(proof.polynomials.W2);
}

function computeChallenges(curve, proof, vk, publicSignals, logger) {
    const Fr = curve.Fr;

    const challenges = {};
    const transcript = new Keccak256Transcript(curve);
    for (let i = 0; i < publicSignals.length; i++) {
        transcript.addScalar(Fr.e(publicSignals[i]));
    }
    transcript.addPolCommitment(proof.polynomials.A);
    transcript.addPolCommitment(proof.polynomials.B);
    transcript.addPolCommitment(proof.polynomials.C);
    transcript.addPolCommitment(proof.polynomials.C1);
    challenges.beta = transcript.getChallenge();

    transcript.reset();
    transcript.addScalar(challenges.beta);
    challenges.gamma = transcript.getChallenge();

    transcript.reset();
    transcript.addPolCommitment(proof.polynomials.C2);
    challenges.xi = transcript.getChallenge();
    challenges.xiN = challenges.xi;
    vk.domainSize = 1;
    for (let i = 0; i < vk.power; i++) {
        challenges.xiN = Fr.square(challenges.xiN);
        vk.domainSize *= 2;
    }

    transcript.reset();
    transcript.addScalar(proof.evaluations.ql);
    transcript.addScalar(proof.evaluations.qr);
    transcript.addScalar(proof.evaluations.qm);
    transcript.addScalar(proof.evaluations.qo);
    transcript.addScalar(proof.evaluations.qc);
    transcript.addScalar(proof.evaluations.s1);
    transcript.addScalar(proof.evaluations.s2);
    transcript.addScalar(proof.evaluations.s3);
    transcript.addScalar(proof.evaluations.a);
    transcript.addScalar(proof.evaluations.b);
    transcript.addScalar(proof.evaluations.c);
    transcript.addScalar(proof.evaluations.z);
    transcript.addScalar(proof.evaluations.zw);
    transcript.addScalar(proof.evaluations.t1w);
    transcript.addScalar(proof.evaluations.t2w);
    challenges.alpha = transcript.getChallenge();

    transcript.reset();
    transcript.addPolCommitment(proof.polynomials.W1);
    challenges.y = transcript.getChallenge();

    if (logger) {
        logger.debug("beta: " + Fr.toString(challenges.beta, 16));
        logger.debug("gamma: " + Fr.toString(challenges.gamma, 16));
        logger.debug("xi: " + Fr.toString(challenges.xi, 16));
        logger.debug("alpha: " + Fr.toString(challenges.alpha, 16));
        logger.debug("y: " + Fr.toString(challenges.y, 16));
    }

    return challenges;
}

function computeLagrange1Evaluation(curve, challenges, vk, logger) {
    const Fr = curve.Fr;

    // Lagrange 1 : ω (xi^n - 1) / n (xi - ω)
    let num = Fr.mul(Fr.one, challenges.zh);
    let den = Fr.mul(vk.domainSize, Fr.sub(challenges.xi, Fr.one));
    const lagrange1 = Fr.div(num, den);

    if (logger) {
        logger.debug("Lagrange Evaluations: ");
        logger.debug("L1(xi)=" + Fr.toString(lagrange1, 16));
    }

    return lagrange1;
}

function calculatePI(curve, publicSignals, lagrange1) {
    const Fr = curve.Fr;

    let pi = Fr.zero;
    for (let i = 0; i < publicSignals.length; i++) {
        const w = Fr.e(publicSignals[i]);
        pi = Fr.sub(pi, Fr.mul(w, lagrange1[i + 1]));
    }
    return pi;
}

function computeR1(proof, challenges, pi, lagrange1, curve) {
    const Fr = curve.Fr;
    let r1;
    return r1;
}

function computeR2(proof, challenges, lagrange1, curve) {
    const Fr = curve.Fr;
    let r2;
    return r2;
}

function computeF(curve, proof, challenges, vk, D) {
    const G1 = curve.G1;
    const Fr = curve.Fr;

    let res = proof.T1;

    res = G1.add(res, G1.timesFr(proof.T2, challenges.xin));
    res = G1.add(res, G1.timesFr(proof.T3, Fr.square(challenges.xin)));
    res = G1.add(res, D);
    res = G1.add(res, G1.timesFr(proof.A, challenges.v[2]));
    res = G1.add(res, G1.timesFr(proof.B, challenges.v[3]));
    res = G1.add(res, G1.timesFr(proof.C, challenges.v[4]));
    res = G1.add(res, G1.timesFr(vk.S1, challenges.v[5]));
    res = G1.add(res, G1.timesFr(vk.S2, challenges.v[6]));

    return res;
}


function computeE(curve, proof, challenges, vk, t) {
    const G1 = curve.G1;
    const Fr = curve.Fr;

    let s = t;

    s = Fr.add(s, Fr.mul(challenges.v[1], proof.eval_r));
    s = Fr.add(s, Fr.mul(challenges.v[2], proof.eval_a));
    s = Fr.add(s, Fr.mul(challenges.v[3], proof.eval_b));
    s = Fr.add(s, Fr.mul(challenges.v[4], proof.eval_c));
    s = Fr.add(s, Fr.mul(challenges.v[5], proof.eval_s1));
    s = Fr.add(s, Fr.mul(challenges.v[6], proof.eval_s2));
    s = Fr.add(s, Fr.mul(challenges.u, proof.eval_zw));

    const res = G1.timesFr(G1.one, s);

    return res;
}

function computeJ(curve, proof, challenges, vk, t) {
    const G1 = curve.G1;
    const Fr = curve.Fr;

    let s = t;

    s = Fr.add(s, Fr.mul(challenges.v[1], proof.eval_r));
    s = Fr.add(s, Fr.mul(challenges.v[2], proof.eval_a));
    s = Fr.add(s, Fr.mul(challenges.v[3], proof.eval_b));
    s = Fr.add(s, Fr.mul(challenges.v[4], proof.eval_c));
    s = Fr.add(s, Fr.mul(challenges.v[5], proof.eval_s1));
    s = Fr.add(s, Fr.mul(challenges.v[6], proof.eval_s2));
    s = Fr.add(s, Fr.mul(challenges.u, proof.eval_zw));

    const res = G1.timesFr(G1.one, s);

    return res;
}

async function isValidPairing(curve, proof, challenges, vk, F, E, J) {
    const G1 = curve.G1;

    let A1 = G1.timesFr(proof.polynomials.W2, challenges.y);
    A1 = G1.add(G1.sub(G1.sub(F, E), J), A1);

    const A2 = curve.G2.one;
    const B1 = proof.polynomials.W2;
    const B2 = curve.G2.one;

    return await curve.pairingEq(A1, A2, B1, B2);

}
