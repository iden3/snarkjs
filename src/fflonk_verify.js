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
import {Proof} from "./proof.js";
import {Keccak256Transcript} from "./Keccak256Transcript.js";
import {Polynomial} from "./polynomial/polynomial.js";

const {unstringifyBigInts} = utils;

export default async function fflonkVerify(_vk_verifier, _publicSignals, _proof, logger) {
    if (logger) logger.info("FFLONK VERIFIER STARTED");

    _vk_verifier = unstringifyBigInts(_vk_verifier);
    _proof = unstringifyBigInts(_proof);

    const curve = await curves.getCurveFromName(_vk_verifier.curve);

    const vk = fromObjectVk(curve, _vk_verifier);

    // TODO ??? Compute wr^3 and check if it matches with w

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

    // STEP 1 - Validate that all polynomial commitments ∈ G_1
    if (logger) logger.info("> Checking commitments belong to G1");
    if (!commitmentsBelongToG1(curve, proof)) {
        logger.error("Proof is not well constructed");
        return false;
    }

    // TODO
    // STEP 2 - Validate that all evaluations ∈ F

    // TODO
    // STEP 3 - Validate that w_i ∈ F for i ∈ [l]

    // STEP 4 - Compute the challenges: beta, gamma, xi, alpha and y ∈ F
    // as in prover description, from the common preprocessed inputs, public inputs and elements of π_SNARK
    if (logger) logger.info("> Computing challenges");
    const {challenges, roots} = computeChallenges(curve, proof, vk, publicSignals, logger);

    // STEP 5 - Compute the zero polynomial evaluation Z_H(xi) = xi^n - 1
    if (logger) logger.info("> Computing Zero polynomial evaluation Z_H(xi)");
    challenges.zh = Fr.sub(challenges.xiN, Fr.one);
    challenges.invzh = Fr.inv(challenges.zh);

    // STEP 6 - Compute the lagrange polynomial evaluation L_1(xi)
    if (logger) logger.info("> Computing Lagrange evaluations");
    const lagrangeEvals = computeLagrangeEvaluations(curve, challenges, vk);

    // STEP 7 - Compute public input evaluation PI(xi)
    if (logger) logger.info("> Computing polynomial identities PI(X)");
    const pi = calculatePI(curve, publicSignals, lagrangeEvals);

    // STEP 8 - Compute polynomial r1 ∈ F_{<4}[X]
    if (logger) logger.info("> Computing r1(y)");
    const r1 = computeR1(proof, challenges, roots, pi, curve, logger);

    // STEP 9 - Compute polynomial r2 ∈ F_{<6}[X]
    if (logger) logger.info("> Computing r2(y)");
    const r2 = computeR2(proof, challenges, roots, lagrangeEvals[1], vk, curve, logger);

    if (logger) logger.info("> Computing F");
    const F = computeF(curve, proof, challenges, roots);

    if (logger) logger.info("> Computing E");
    const E = computeE(curve, proof, challenges, vk, r1, r2);

    if (logger) logger.info("> Computing J");
    const J = computeJ(curve, proof, challenges);

    if (logger) logger.info("> Validate all evaluations with a pairing");
    const res = await isValidPairing(curve, proof, challenges, vk, F, E, J);

    if (logger) {
        if (res) {
            logger.info("Proof verified successfully");
        } else {
            logger.warn("Invalid Proof");
        }
    }

    if (logger) logger.info("FFLONK VERIFIER FINISHED");
//debug(challenges, roots, vk, r1, r2, Fr);
    return res;

}

function fromObjectVk(curve, vk) {
    const res = vk;
    res.k1 = curve.Fr.fromObject(vk.k1);
    res.k2 = curve.Fr.fromObject(vk.k2);
    res.w = curve.Fr.fromObject(vk.w);
    // res.wW = curve.Fr.fromObject(vk.wW);
    res.w3 = curve.Fr.fromObject(vk.w3);
    res.w4 = curve.Fr.fromObject(vk.w4);
    res.wr = curve.Fr.fromObject(vk.wr);
    res.X_2 = curve.G2.fromObject(vk.X_2);

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
    const roots = {};
    const transcript = new Keccak256Transcript(curve);
    for (let i = 0; i < publicSignals.length; i++) {
        transcript.addScalar(Fr.e(publicSignals[i]));
    }
    transcript.addPolCommitment(proof.polynomials.C1);
    challenges.beta = transcript.getChallenge();

    transcript.reset();
    transcript.addScalar(challenges.beta);
    challenges.gamma = transcript.getChallenge();

    transcript.reset();
    transcript.addPolCommitment(proof.polynomials.C2);
    const xiSeed = transcript.getChallenge();
    const xiSeed2 = Fr.square(xiSeed);

    const w3_2 = Fr.square(vk.w3);
    const w4_2 = Fr.square(vk.w4);
    const w4_3 = Fr.mul(w4_2, vk.w4);

    // Compute h1 = xi_seeder^3
    roots.S1 = {};
    roots.S1.h1w4 = [];
    roots.S1.h1w4[0] = Fr.mul(xiSeed2, xiSeed);
    roots.S1.h1w4[1] = Fr.mul(roots.S1.h1w4[0], vk.w4);
    roots.S1.h1w4[2] = Fr.mul(roots.S1.h1w4[0], w4_2);
    roots.S1.h1w4[3] = Fr.mul(roots.S1.h1w4[0], w4_3);

    // Compute h2 = xi_seeder^4
    roots.S2 = {};
    roots.S2.h2w3 = [];
    roots.S2.h2w3[0] = Fr.square(xiSeed2);
    roots.S2.h2w3[1] = Fr.mul(roots.S2.h2w3[0], vk.w3);
    roots.S2.h2w3[2] = Fr.mul(roots.S2.h2w3[0], w3_2);

    // Compute xi = xi_seeder^12
    challenges.xi = Fr.mul(Fr.square(roots.S2.h2w3[0]), roots.S2.h2w3[0]);

    // Compute h3 = xi_seeder^6
    roots.S2.h3w3 = [];
    // Multiply h3 by omega to obtain h_3^2 = xiω
    roots.S2.h3w3[0] = Fr.mul(roots.S2.h2w3[0], vk.wr);
    roots.S2.h3w3[1] = Fr.mul(roots.S2.h3w3[0], vk.w3);
    roots.S2.h3w3[2] = Fr.mul(roots.S2.h3w3[0], w3_2);

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
        logger.info("··· challenges.beta:  " + Fr.toString(challenges.beta));
        logger.info("··· challenges.gamma: " + Fr.toString(challenges.gamma));
        logger.info("··· challenges.xi:    " + Fr.toString(challenges.xi));
        logger.info("··· challenges.alpha: " + Fr.toString(challenges.alpha));
        logger.info("··· challenges.y:     " + Fr.toString(challenges.y));
    }

    return {challenges: challenges, roots: roots};
}

function computeLagrangeEvaluations(curve, challenges, vk) {
    const Fr = curve.Fr;

    const L = [];

    const n = Fr.e(vk.domainSize);
    let w = Fr.one;
    for (let i = 1; i <= Math.max(1, vk.nPublic); i++) {
        L[i] = Fr.div(Fr.mul(w, challenges.zh), Fr.mul(n, Fr.sub(challenges.xi, w)));
        w = Fr.mul(w, vk.w);
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

function computeR1(proof, challenges, roots, pi, curve, logger) {
    const Fr = curve.Fr;

    // r1(y) = ∑_1^4 C_1(h_1 ω_4^{i-1}) L_i(y). To this end we need to compute
    // Z1 = {C1(h_1}, C1(h_1 ω_4), C1(h_1 ω_4^2), C1(h_1 ω_4^3)}
    // where C_1(h_1 ω_4^{i-1}) = eval.a + h_1 ω_4^i eval.b + (h_1 ω_4^i)^2 eval.c + (h_1 ω_4^i)^3 T0(xi),
    // where T0(xi) = [ qL·a + qR·b + qM·a·b + qO·c + qC + PI(xi) ] / Z_H(xi)

    // Compute T0(xi)
    if (logger) logger.info("··· Computing T0(xi)");
    let T0 = Fr.mul(proof.evaluations.ql, proof.evaluations.a);
    T0 = Fr.add(T0, Fr.mul(proof.evaluations.qr, proof.evaluations.b));
    T0 = Fr.add(T0, Fr.mul(proof.evaluations.qm, Fr.mul(proof.evaluations.a, proof.evaluations.b)));
    T0 = Fr.add(T0, Fr.mul(proof.evaluations.qo, proof.evaluations.c));
    T0 = Fr.add(T0, proof.evaluations.qc);
    T0 = Fr.add(T0, pi);
    T0 = Fr.mul(T0, challenges.invzh);

    // Compute the 4 C1 values
    if (logger) logger.info("··· Computing C1(h_1ω_4^i) values");
    let c1Values = [];
    for (let i = 0; i < 4; i++) {
        c1Values[i] = proof.evaluations.a;
        c1Values[i] = Fr.add(c1Values[i], Fr.mul(roots.S1.h1w4[i], proof.evaluations.b));
        const h1w4Squared = Fr.square(roots.S1.h1w4[i]);
        c1Values[i] = Fr.add(c1Values[i], Fr.mul(h1w4Squared, proof.evaluations.c));
        c1Values[i] = Fr.add(c1Values[i], Fr.mul(Fr.mul(h1w4Squared, roots.S1.h1w4[i]), T0));
    }

    // Interpolate a polynomial with the points computed previously
    const R1 = Polynomial.lagrangeInterpolationFrom4Points(
        [roots.S1.h1w4[0], roots.S1.h1w4[1], roots.S1.h1w4[2], roots.S1.h1w4[3]],
        c1Values, Fr);

    // Check the degree of r1(X) < 4
    if (R1.degree() > 3) {
        throw new Error("R1 Polynomial is not well calculated");
    }

    // Evaluate the polynomial in challenges.y
    if (logger) logger.info("··· Computing evaluation r1(y)");
    return R1.evaluate(challenges.y);
}

function computeR2(proof, challenges, roots, lagrange1, vk, curve, logger) {
    const Fr = curve.Fr;

    // r2(y) = ∑_1^3 C_2(h_2 ω_3^{i-1}) L_i(y) + ∑_1^3 C_2(h_3 ω_3^{i-1}) L_{i+3}(y). To this end we need to compute
    // Z2 = {[C2(h_2}, C2(h_2 ω_3), C2(h_2 ω_3^2)], [C2(h_3}, C2(h_3 ω_3), C2(h_3 ω_3^2)]}
    // where C_2(h_2 ω_3^{i-1}) = eval.z + h_2 ω_2^i T1(xi) + (h_2 ω_3^i)^2 T2(xi),
    // where C_2(h_3 ω_3^{i-1}) = eval.z + h_3 ω_2^i T1(xi) + (h_3 ω_3^i)^2 T2(xi),
    // where T1(xi) = [ L_1(xi)(z-1)] / Z_H(xi)
    // and T2(xi) = [  (a + beta·xi + gamma)(b + beta·xi·k1 + gamma)(c + beta·xi·k2 + gamma)z
    //               - (a + beta·sigma1 + gamma)(b + beta·sigma2 + gamma)(c + beta·sigma3 + gamma)zω  ] / Z_H(xi)

    // Compute T1(xi)
    if (logger) logger.info("··· Computing T1(xi)");
    let T1 = Fr.sub(proof.evaluations.z, Fr.one);
    T1 = Fr.mul(T1, lagrange1);
    T1 = Fr.mul(T1, challenges.invzh);

    // Compute T2(xi)
    if (logger) logger.info("··· Computing T2(xi)");
    const betaxi = Fr.mul(challenges.beta, challenges.xi);
    const T211 = Fr.add(proof.evaluations.a, Fr.add(betaxi, challenges.gamma));
    const T212 = Fr.add(proof.evaluations.b, Fr.add(Fr.mul(betaxi, vk.k1), challenges.gamma));
    const T213 = Fr.add(proof.evaluations.c, Fr.add(Fr.mul(betaxi, vk.k2), challenges.gamma));
    const T21 = Fr.mul(T211, Fr.mul(T212, Fr.mul(T213, proof.evaluations.z)));

    const T221 = Fr.add(proof.evaluations.a, Fr.add(Fr.mul(challenges.beta, proof.evaluations.s1), challenges.gamma));
    const T222 = Fr.add(proof.evaluations.b, Fr.add(Fr.mul(challenges.beta, proof.evaluations.s2), challenges.gamma));
    const T223 = Fr.add(proof.evaluations.c, Fr.add(Fr.mul(challenges.beta, proof.evaluations.s3), challenges.gamma));
    const T22 = Fr.mul(T221, Fr.mul(T222, Fr.mul(T223, proof.evaluations.zw)));

    let T2 = Fr.sub(T21, T22);
    T2 = Fr.mul(T2, challenges.invzh);

    // Compute the 6 C2 values
    if (logger) logger.info("··· Computing C2(h_2ω_3^i) values");
    let c2Values = [];
    for (let i = 0; i < 3; i++) {
        c2Values[i] = Fr.add(proof.evaluations.z, Fr.mul(roots.S2.h2w3[i], T1));
        c2Values[i] = Fr.add(c2Values[i], Fr.mul(Fr.square(roots.S2.h2w3[i]), T2));
    }

    if (logger) logger.info("··· Computing C2(h_3ω_3^i) values");
    for (let i = 0; i < 3; i++) {
        c2Values[i + 3] = Fr.add(proof.evaluations.zw, Fr.mul(roots.S2.h3w3[i], proof.evaluations.t1w));
        c2Values[i + 3] = Fr.add(c2Values[i + 3], Fr.mul(Fr.square(roots.S2.h3w3[i]), proof.evaluations.t2w));
    }

    // Interpolate a polynomial with the points computed previously
    if (logger) logger.info("··· Computing r2(xi)");
    const R2 = Polynomial.lagrangeInterpolationFrom6Points(
        [roots.S2.h2w3[0], roots.S2.h2w3[1], roots.S2.h2w3[2],
            roots.S2.h3w3[0], roots.S2.h3w3[1], roots.S2.h3w3[2]],
        c2Values, Fr);

    // Check the degree of r1(X) < 4
    if (R2.degree() > 5) {
        throw new Error("R2 Polynomial is not well calculated");
    }

    // Evaluate the polynomial in challenges.y
    if (logger) logger.info("··· Computing evaluation r2(y)");
    return R2.evaluate(challenges.y);
}

function computeF(curve, proof, challenges, roots) {
    const G1 = curve.G1;
    const Fr = curve.Fr;

    let num = Fr.sub(challenges.y, roots.S1.h1w4[0]);
    num = Fr.mul(num, Fr.sub(challenges.y, roots.S1.h1w4[1]));
    num = Fr.mul(num, Fr.sub(challenges.y, roots.S1.h1w4[2]));
    num = Fr.mul(num, Fr.sub(challenges.y, roots.S1.h1w4[3]));

    challenges.temp = num;

    let den = Fr.sub(challenges.y, roots.S2.h2w3[0]);
    den = Fr.mul(den, Fr.sub(challenges.y, roots.S2.h2w3[1]));
    den = Fr.mul(den, Fr.sub(challenges.y, roots.S2.h2w3[2]));
    den = Fr.mul(den, Fr.sub(challenges.y, roots.S2.h3w3[0]));
    den = Fr.mul(den, Fr.sub(challenges.y, roots.S2.h3w3[1]));
    den = Fr.mul(den, Fr.sub(challenges.y, roots.S2.h3w3[2]));

    challenges.quotient = Fr.mul(challenges.alpha, Fr.div(num, den));

    return G1.add(proof.polynomials.C1, G1.timesFr(proof.polynomials.C2, challenges.quotient));
}

function computeE(curve, proof, challenges, vk, r1, r2) {
    const G1 = curve.G1;
    const Fr = curve.Fr;

    let val = Fr.add(r1, Fr.mul(challenges.quotient, r2));

    return G1.timesFr(G1.one, val);
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

function debug(challenges, roots, vk, r1, r2, Fr) {
    // Print all challenges
    console.log("Beta:    " + Fr.toString(challenges.beta));
    console.log("Gamma:   " + Fr.toString(challenges.gamma));
    console.log("Xi:      " + Fr.toString(challenges.xi));
    console.log("Alpha:   " + Fr.toString(challenges.alpha));
    console.log("Y:       " + Fr.toString(challenges.y));
    console.log("");

    // Print all roots
    console.log("h1w4[0]: " + Fr.toString(roots.S1.h1w4[0]));
    console.log("h1w4[1]: " + Fr.toString(roots.S1.h1w4[1]));
    console.log("h1w4[2]: " + Fr.toString(roots.S1.h1w4[2]));
    console.log("h1w4[3]: " + Fr.toString(roots.S1.h1w4[3]));
    console.log("h2w3[0]: " + Fr.toString(roots.S2.h2w3[0]));
    console.log("h2w3[1]: " + Fr.toString(roots.S2.h2w3[1]));
    console.log("h2w3[2]: " + Fr.toString(roots.S2.h2w3[2]));
    console.log("h3w3[0]: " + Fr.toString(roots.S2.h3w3[0]));
    console.log("h3w3[1]: " + Fr.toString(roots.S2.h3w3[1]));
    console.log("h3w3[2]: " + Fr.toString(roots.S2.h3w3[2]));
    console.log("Check if h_1^4 = xi  ... " + Fr.eq(challenges.xi, Fr.square(Fr.square(roots.S1.h1w4[0]))));
    console.log("Check if h_2^3 = xi  ... " + Fr.eq(challenges.xi, Fr.mul(Fr.square(roots.S2.h2w3[0]), roots.S2.h2w3[0])));
    console.log("Check if h_3^3 = xiw ... " + Fr.eq(Fr.mul(challenges.xi, vk.w), Fr.mul(Fr.square(roots.S2.h3w3[0]), roots.S2.h3w3[0])));
    console.log("");
    console.log("r1: " + Fr.toString(r1));
    console.log("r2: " + Fr.toString(r2));
}