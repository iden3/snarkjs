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
import {utils} from "ffjavascript";

const {unstringifyBigInts} = utils;
import {Proof} from "./proof.js";
import {Keccak256Transcript} from "./Keccak256Transcript.js";

export default async function fflonkVerify(_vk_verifier, _publicSignals, _proof, logger) {
    _vk_verifier = unstringifyBigInts(_vk_verifier);
    const curve = await curves.getCurveFromName(_vk_verifier.curve);

    const vk = fromObjectVk(curve, _vk_verifier);

    const Fr = curve.Fr;

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
    challenges.invzh = Fr.inv(challenges.zh);

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
    const r2 = computeR2(proof, challenges, lagrange1[1], vk, curve);

    if (logger) logger.info("Computing F");
    const F = computeF(curve, proof, challenges);

    if (logger) logger.info("Computing E");
    const E = computeE(curve, proof, challenges, vk, r1, r2);

    if (logger) logger.info("Computing J");
    const J = computeJ(curve, proof, challenges);

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
    const res = vk;
    res.k1 = curve.Fr.fromObject(vk.k1);
    res.k2 = curve.Fr.fromObject(vk.k2);
    res.QL = curve.G1.fromObject(vk.QL);
    res.QR = curve.G1.fromObject(vk.QR);
    res.QM = curve.G1.fromObject(vk.QM);
    res.QO = curve.G1.fromObject(vk.QO);
    res.QC = curve.G1.fromObject(vk.QC);
    res.S1 = curve.G1.fromObject(vk.S1);
    res.S2 = curve.G1.fromObject(vk.S2);
    res.S3 = curve.G1.fromObject(vk.S3);
    res.X_2 = curve.G2.fromObject(vk.X_2);
    res.w = curve.Fr.fromObject(vk.w);

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
    challenges.xiSeed = transcript.getChallenge();
    challenges.xiSeed2 = Fr.square(challenges.xiSeed);
    challenges.h1 = Fr.mul(challenges.xiSeed2, challenges.xiSeed);
    challenges.h2 = Fr.square(challenges.xiSeed2);
    challenges.h3 = Fr.mul(challenges.h2, challenges.xiSeed2);
    challenges.xi = Fr.square(challenges.h3);
    // TODO can I get w from vkey wright?
    challenges.h3 = Fr.mul(challenges.h3, vk.w);
    let w3 = Fr.w[vk.power + settings.stepOmega3]; // TODO check and define settings.stepOmega3 NOTE: copy from the prover
    let w3_2 = Fr.mul(w3, w3);
    let w4 = Fr.w[vk.power + settings.stepOmega4]; // TODO check and define settings.stepOmega4 NOTE: copy from the prover
    let w4_2 = Fr.mul(w4, w4);
    let w4_3 = Fr.mul(w4_2, w4);

    challenges.h1w4 = Fr.mul(challenges.h1, w4);
    challenges.h1w4_2 = Fr.mul(challenges.h1, w4_2);
    challenges.h1w4_3 = Fr.mul(challenges.h1, w4_3);
    challenges.h2w3 = Fr.mul(challenges.h2, w3);
    challenges.h2w3_2 = Fr.mul(challenges.h2, w3_2);
    challenges.h3w3 = Fr.mul(challenges.h3, w3);
    challenges.h3w3_2 = Fr.mul(challenges.h3, w3_2);

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

    // T0(xi) = [ qL·a + qR·b + qM·a·b + qO·c + qC + PI(xi) ] / Z_H(xi)
    let T0 = Fr.mul(proof.evaluations.ql, proof.evaluations.a);
    T0 = Fr.add(T0, Fr.mul(proof.evaluations.qr, proof.evaluations.b));
    T0 = Fr.add(T0, Fr.mul(proof.evaluations.qo, proof.evaluations.c));
    T0 = Fr.add(T0, Fr.mul(proof.evaluations.qm, Fr.mul(proof.evaluations.a, proof.evaluations.b)));
    T0 = Fr.add(T0, proof.evaluations.qc);
    T0 = Fr.add(T0, pi);
    T0 = Fr.mul(T0, challenges.invzh);

    // TODO computes r1(y)
    const r1 = Fr.zero;

    return r1;
}

function computeR2(proof, challenges, lagrange1, vk, curve) {
    const Fr = curve.Fr;

    // T1(xi) = [ L_1(xi)(z-1)] / Z_H(xi)
    let T1 = Fr.sub(proof.evaluations.z, Fr.one);
    T1 = Fr.mul(T1, lagrange1);
    T1 = Fr.mul(T1, challenges.invzh);

    // T2(xi) = [  (a + beta·xi + gamma)(b + beta·xi·k1 + gamma)(c + beta·xi·k2 + gamma)z
    //           - (a + beta·sigma1 + gamma)(b + beta·sigma2 + gamma)(c + beta·sigma3 + gamma)zω  ] / Z_H(xi)
    const betaxi = Fr.mul(challenges.beta, challenges.xi);
    const T211 = Fr.add(proof.evaluations.a, Fr.add(betaxi, challenges.gamma));
    const T212 = Fr.add(proof.evaluations.b, Fr.add(Fr.mul(betaxi, vk.k1), challenges.gamma));
    const T213 = Fr.add(proof.evaluations.c, Fr.add(Fr.mul(betaxi, vk.k2), challenges.gamma));
    const T21 = Fr.mul(T211, Fr.mul(T212, Fr.mul(T213, proof.evaluations.z)));

    const T221 = Fr.add(proof.evaluations.a, Fr.add(Fr.mul(challenges.beta, proof.evaluations.s1), challenges.gamma));
    const T222 = Fr.add(proof.evaluations.b, Fr.add(Fr.mul(challenges.beta, proof.evaluations.s2), challenges.gamma));
    const T223 = Fr.add(proof.evaluations.c, Fr.add(Fr.mul(challenges.beta, proof.evaluations.s3), challenges.gamma));
    const T22 = Fr.mul(T221, Fr.mul(T222, Fr.mul(T223, proof.evaluations.zw)));

    const T2 = Fr.sub(T21, T22);
    T2 = Fr.mul(T2, challenges.invzh);

    // TODO computes r2(y)
    const r2 = Fr.zero;

    return r2;
}

function computeF(curve, proof, challenges) {
    const G1 = curve.G1;
    const Fr = curve.Fr;

    let num = Fr.sub(challenges.y, challenges.h1);
    num = Fr.mul(num, Fr.sub(challenges.y, challenges.h1w4));
    num = Fr.mul(num, Fr.sub(challenges.y, challenges.h1w4_2));
    num = Fr.mul(num, Fr.sub(challenges.y, challenges.h1w4_3));

    challenges.temp = num;

    let den = Fr.sub(challenges.y, challenges.h2);
    den = Fr.mul(den, Fr.sub(challenges.y, challenges.h2w3));
    den = Fr.mul(den, Fr.sub(challenges.y, challenges.h2w3_2));
    den = Fr.mul(den, Fr.sub(challenges.y, challenges.h3));
    den = Fr.mul(den, Fr.sub(challenges.y, challenges.h3w3));
    den = Fr.mul(den, Fr.sub(challenges.y, challenges.h3w3_2));

    challenges.quotient = Fr.mul(challenges.alpha, Fr.mul(num, Fr.inv(den)));

    return G1.add(proof.polynomials.C1, G1.timesFr(proof.polynomials.C2, challenges.quotient));
}


function computeE(curve, proof, challenges, vk, r1, r2) {
    const G1 = curve.G1;
    const Fr = curve.Fr;

    let E1 = Fr.add(r1, Fr.mul(challenges.quotient, r2));

    return G1.timesFr(G1.one, E1);
}

function computeJ(curve, proof, challenges) {
    const G1 = curve.G1;

    return G1.timesFr(proof.polynomials.W1, challenges.temp);
}

async function isValidPairing(curve, proof, challenges, vk, F, E, J) {
    const G1 = curve.G1;

    let A1 = G1.timesFr(proof.polynomials.W2, challenges.y);
    A1 = G1.add(G1.sub(G1.sub(F, E), J), A1);

    const A2 = curve.G2.one;
    const B1 = proof.polynomials.W2;
    const B2 = vk.X_2;

    return await curve.pairingEq(A1, A2, B1, B2);

}