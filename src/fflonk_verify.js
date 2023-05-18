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
import { Scalar } from "ffjavascript";

const { unstringifyBigInts } = utils;

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
    if (!commitmentsBelongToG1(curve, proof, vk)) {
        if (logger) logger.error("Proof commitments are not valid");
        return false;
    }

    // STEP 2 - Validate that all evaluations ∈ F
    if (logger) logger.info("> Checking evaluations belong to F");
    if (!evaluationsAreValid(curve, proof)) {
        if (logger) logger.error("Proof evaluations are not valid.");
        return false;
    }

    // STEP 3 - Validate that w_i ∈ F for i ∈ [l]
    if (logger) logger.info("> Checking public inputs belong to F");
    if (!publicInputsAreValid(curve, publicSignals)) {
        if (logger) logger.error("Public inputs are not valid.");
        return false;
    }

    // STEP 4 - Compute the challenges: beta, gamma, xi, alpha and y ∈ F
    // as in prover description, from the common preprocessed inputs, public inputs and elements of π_SNARK
    if (logger) logger.info("> Computing challenges");
    const { challenges, roots } = computeChallenges(curve, proof, vk, publicSignals, logger);

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

    // STEP 8 - Compute polynomial r0 ∈ F_{<4}[X]
    if (logger) logger.info("> Computing r0(y)");
    const r0 = computeR0(proof, challenges, roots, curve, logger);

    // STEP 9 - Compute polynomial r1 ∈ F_{<4}[X]
    if (logger) logger.info("> Computing r1(y)");
    const r1 = computeR1(proof, challenges, roots, pi, curve, logger);

    // STEP 9 - Compute polynomial r2 ∈ F_{<6}[X]
    if (logger) logger.info("> Computing r2(y)");
    const r2 = computeR2(proof, challenges, roots, lagrangeEvals[1], vk, curve, logger);

    if (logger) logger.info("> Computing F");
    const F = computeF(curve, proof, vk, challenges, roots);

    if (logger) logger.info("> Computing E");
    const E = computeE(curve, proof, challenges, vk, r0, r1, r2);

    if (logger) logger.info("> Computing J");
    const J = computeJ(curve, proof, challenges);

    if (logger) logger.info("> Validate all evaluations with a pairing");
    const res = await isValidPairing(curve, proof, challenges, vk, F, E, J);

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
    // res.wW = curve.Fr.fromObject(vk.wW);
    res.w3 = curve.Fr.fromObject(vk.w3);
    res.w4 = curve.Fr.fromObject(vk.w4);
    res.w8 = curve.Fr.fromObject(vk.w8);
    res.wr = curve.Fr.fromObject(vk.wr);
    res.X_2 = curve.G2.fromObject(vk.X_2);
    res.C0 = curve.G1.fromObject(vk.C0);
    return res;
}

function commitmentsBelongToG1(curve, proof, vk) {
    const G1 = curve.G1;
    return G1.isValid(proof.polynomials.C1)
        && G1.isValid(proof.polynomials.C2)
        && G1.isValid(proof.polynomials.W1)
        && G1.isValid(proof.polynomials.W2)
        && G1.isValid(vk.C0);
}

function checkValueBelongToField(curve, value) {
    return Scalar.lt(value, curve.r);
}

function checkEvaluationIsValid(curve, evaluation) {
    return checkValueBelongToField(curve, Scalar.fromRprLE(evaluation));
}

function evaluationsAreValid(curve, proof) {
    return checkEvaluationIsValid(curve, proof.evaluations.ql)
        && checkEvaluationIsValid(curve, proof.evaluations.qr)
        && checkEvaluationIsValid(curve, proof.evaluations.qm)
        && checkEvaluationIsValid(curve, proof.evaluations.qo)
        && checkEvaluationIsValid(curve, proof.evaluations.qc)
        && checkEvaluationIsValid(curve, proof.evaluations.s1)
        && checkEvaluationIsValid(curve, proof.evaluations.s2)
        && checkEvaluationIsValid(curve, proof.evaluations.s3)
        && checkEvaluationIsValid(curve, proof.evaluations.a)
        && checkEvaluationIsValid(curve, proof.evaluations.b)
        && checkEvaluationIsValid(curve, proof.evaluations.c)
        && checkEvaluationIsValid(curve, proof.evaluations.z)
        && checkEvaluationIsValid(curve, proof.evaluations.zw)
        && checkEvaluationIsValid(curve, proof.evaluations.t1w)
        && checkEvaluationIsValid(curve, proof.evaluations.t2w);
}

function publicInputsAreValid(curve, publicInputs) {
    for(let i = 0; i < publicInputs.length; i++) {
        if(!checkValueBelongToField(curve, publicInputs[i])) {
            return false;
        }
    }
    return true;
}

function computeChallenges(curve, proof, vk, publicSignals, logger) {
    const Fr = curve.Fr;

    const challenges = {};
    const roots = {};
    const transcript = new Keccak256Transcript(curve);

    // Add C0 to the transcript
    transcript.addPolCommitment(vk.C0);

    for (let i = 0; i < publicSignals.length; i++) {
        transcript.addScalar(Fr.e(publicSignals[i]));
    }

    transcript.addPolCommitment(proof.polynomials.C1);
    challenges.beta = transcript.getChallenge();
    transcript.reset();

    transcript.addScalar(challenges.beta);
    challenges.gamma = transcript.getChallenge();

    transcript.reset();
    transcript.addScalar(challenges.gamma);
    transcript.addPolCommitment(proof.polynomials.C2);
    const xiSeed = transcript.getChallenge();
    const xiSeed2 = Fr.square(xiSeed);

    let w8 = [];
    w8[1] = vk.w8;
    w8[2] = Fr.square(vk.w8);
    w8[3] = Fr.mul(w8[2], vk.w8);
    w8[4] = Fr.mul(w8[3], vk.w8);
    w8[5] = Fr.mul(w8[4], vk.w8);
    w8[6] = Fr.mul(w8[5], vk.w8);
    w8[7] = Fr.mul(w8[6], vk.w8);
    let w4 = [];
    w4[1] = vk.w4;
    w4[2] = Fr.square(vk.w4);
    w4[3] = Fr.mul(w4[2], vk.w4);
    let w3 = [];
    w3[1] = vk.w3;
    w3[2] = Fr.square(vk.w3);

    // const w4_2 = Fr.square(vk.w4);
    // const w4_3 = Fr.mul(w4_2, vk.w4);
    // const w3_2 = Fr.square(vk.w3);

    // Compute h0 = xiSeeder^3
    roots.S0 = {};
    roots.S0.h0w8 = [];
    roots.S0.h0w8[0] = Fr.mul(xiSeed2, xiSeed);
    for (let i = 1; i < 8; i++) {
        roots.S0.h0w8[i] = Fr.mul(roots.S0.h0w8[0], w8[i]);
    }

    // Compute h1 = xi_seeder^6
    roots.S1 = {};
    roots.S1.h1w4 = [];
    roots.S1.h1w4[0] = Fr.square(roots.S0.h0w8[0]);
    for (let i = 1; i < 4; i++) {
        roots.S1.h1w4[i] = Fr.mul(roots.S1.h1w4[0], w4[i]);
    }

    // Compute h2 = xi_seeder^8
    roots.S2 = {};
    roots.S2.h2w3 = [];
    roots.S2.h2w3[0] = Fr.mul(roots.S1.h1w4[0], xiSeed2);
    roots.S2.h2w3[1] = Fr.mul(roots.S2.h2w3[0], w3[1]);
    roots.S2.h2w3[2] = Fr.mul(roots.S2.h2w3[0], w3[2]);

    roots.S2.h3w3 = [];
    // Multiply h3 by third-root-omega to obtain h_3^3 = xiω
    // So, h3 = xi_seeder^8 ω^{1/3}
    roots.S2.h3w3[0] = Fr.mul(roots.S2.h2w3[0], vk.wr);
    roots.S2.h3w3[1] = Fr.mul(roots.S2.h3w3[0], w3[1]);
    roots.S2.h3w3[2] = Fr.mul(roots.S2.h3w3[0], w3[2]);

    // Compute xi = xi_seeder^12
    challenges.xi = Fr.mul(Fr.square(roots.S2.h2w3[0]), roots.S2.h2w3[0]);
    challenges.xiw = Fr.mul(challenges.xi, Fr.w[vk.power]);

    challenges.xiN = challenges.xi;
    vk.domainSize = 1;
    for (let i = 0; i < vk.power; i++) {
        challenges.xiN = Fr.square(challenges.xiN);
        vk.domainSize *= 2;
    }

    transcript.reset();
    transcript.addScalar(xiSeed);
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
    transcript.addScalar(challenges.alpha);
    transcript.addPolCommitment(proof.polynomials.W1);
    challenges.y = transcript.getChallenge();

    if (logger) {
        logger.info("··· challenges.beta:  " + Fr.toString(challenges.beta));
        logger.info("··· challenges.gamma: " + Fr.toString(challenges.gamma));
        logger.info("··· challenges.xi:    " + Fr.toString(challenges.xi));
        logger.info("··· challenges.alpha: " + Fr.toString(challenges.alpha));
        logger.info("··· challenges.y:     " + Fr.toString(challenges.y));
    }

    return { challenges: challenges, roots: roots };
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

function computeR0(proof, challenges, roots, curve, logger) {
    const Fr = curve.Fr;

    const Li = computeLagrangeLiSi(roots.S0.h0w8, challenges.y, challenges.xi, curve);

    // r0(y) = ∑_1^8 C_0(h_0 ω_8^{i-1}) L_i(y). To this end we need to compute

    // Compute the 8 C0 values
    if (logger) logger.info("··· Computing r0(y)");

    let res = Fr.zero;
    for (let i = 0; i < 8; i++) {
        let coefValues = [];
        coefValues[1] = roots.S0.h0w8[i];
        for (let j = 2; j < 8; j++) {
            coefValues[j] = Fr.mul(coefValues[j - 1], roots.S0.h0w8[i]);
        }

        let c0 = Fr.add(proof.evaluations.ql, Fr.mul(proof.evaluations.qr, coefValues[1]));
        c0 = Fr.add(c0, Fr.mul(proof.evaluations.qo, coefValues[2]));
        c0 = Fr.add(c0, Fr.mul(proof.evaluations.qm, coefValues[3]));
        c0 = Fr.add(c0, Fr.mul(proof.evaluations.qc, coefValues[4]));
        c0 = Fr.add(c0, Fr.mul(proof.evaluations.s1, coefValues[5]));
        c0 = Fr.add(c0, Fr.mul(proof.evaluations.s2, coefValues[6]));
        c0 = Fr.add(c0, Fr.mul(proof.evaluations.s3, coefValues[7]));

        res = Fr.add(res, Fr.mul(c0, Li[i]));
    }

    return res;
}

function computeR1(proof, challenges, roots, pi, curve, logger) {
    const Fr = curve.Fr;

    const Li = computeLagrangeLiSi(roots.S1.h1w4, challenges.y, challenges.xi, curve);

    // r1(y) = ∑_1^4 C_1(h_1 ω_4^{i-1}) L_i(y). To this end we need to compute
    // Z1 = {C1(h_1}, C1(h_1 ω_4), C1(h_1 ω_4^2), C1(h_1 ω_4^3)}
    // where C_1(h_1 ω_4^{i-1}) = eval.a + h_1 ω_4^i eval.b + (h_1 ω_4^i)^2 eval.c + (h_1 ω_4^i)^3 T0(xi),
    // where T0(xi) = [ qL·a + qR·b + qM·a·b + qO·c + qC + PI(xi) ] / Z_H(xi)

    // Compute T0(xi)
    if (logger) logger.info("··· Computing T0(xi)");
    let t0 = Fr.mul(proof.evaluations.ql, proof.evaluations.a);
    t0 = Fr.add(t0, Fr.mul(proof.evaluations.qr, proof.evaluations.b));
    t0 = Fr.add(t0, Fr.mul(proof.evaluations.qm, Fr.mul(proof.evaluations.a, proof.evaluations.b)));
    t0 = Fr.add(t0, Fr.mul(proof.evaluations.qo, proof.evaluations.c));
    t0 = Fr.add(t0, proof.evaluations.qc);
    t0 = Fr.add(t0, pi);
    t0 = Fr.mul(t0, challenges.invzh);

    // Compute the 4 C1 values
    if (logger) logger.info("··· Computing C1(h_1ω_4^i) values");

    let res = Fr.zero;
    for (let i = 0; i < 4; i++) {
        let c1 = proof.evaluations.a;
        c1 = Fr.add(c1, Fr.mul(roots.S1.h1w4[i], proof.evaluations.b));
        const h1w4Squared = Fr.square(roots.S1.h1w4[i]);
        c1 = Fr.add(c1, Fr.mul(h1w4Squared, proof.evaluations.c));
        c1 = Fr.add(c1, Fr.mul(Fr.mul(h1w4Squared, roots.S1.h1w4[i]), t0));

        res = Fr.add(res, Fr.mul(c1, Li[i]));
    }

    return res;
}

function computeR2(proof, challenges, roots, lagrange1, vk, curve, logger) {
    const Fr = curve.Fr;

    const LiS2 = computeLagrangeLiS2([roots.S2.h2w3, roots.S2.h3w3], challenges.y, challenges.xi, challenges.xiw, curve);

    // r2(y) = ∑_1^3 C_2(h_2 ω_3^{i-1}) L_i(y) + ∑_1^3 C_2(h_3 ω_3^{i-1}) L_{i+3}(y). To this end we need to compute
    // Z2 = {[C2(h_2}, C2(h_2 ω_3), C2(h_2 ω_3^2)], [C2(h_3}, C2(h_3 ω_3), C2(h_3 ω_3^2)]}
    // where C_2(h_2 ω_3^{i-1}) = eval.z + h_2 ω_2^i T1(xi) + (h_2 ω_3^i)^2 T2(xi),
    // where C_2(h_3 ω_3^{i-1}) = eval.z + h_3 ω_2^i T1(xi) + (h_3 ω_3^i)^2 T2(xi),
    // where T1(xi) = [ L_1(xi)(z-1)] / Z_H(xi)
    // and T2(xi) = [  (a + beta·xi + gamma)(b + beta·xi·k1 + gamma)(c + beta·xi·k2 + gamma)z
    //               - (a + beta·sigma1 + gamma)(b + beta·sigma2 + gamma)(c + beta·sigma3 + gamma)zω  ] / Z_H(xi)

    // Compute T1(xi)
    if (logger) logger.info("··· Computing T1(xi)");
    let t1 = Fr.sub(proof.evaluations.z, Fr.one);
    t1 = Fr.mul(t1, lagrange1);
    t1 = Fr.mul(t1, challenges.invzh);

    // Compute T2(xi)
    if (logger) logger.info("··· Computing T2(xi)");
    const betaxi = Fr.mul(challenges.beta, challenges.xi);
    const t211 = Fr.add(proof.evaluations.a, Fr.add(betaxi, challenges.gamma));
    const t212 = Fr.add(proof.evaluations.b, Fr.add(Fr.mul(betaxi, vk.k1), challenges.gamma));
    const t213 = Fr.add(proof.evaluations.c, Fr.add(Fr.mul(betaxi, vk.k2), challenges.gamma));
    const t21 = Fr.mul(t211, Fr.mul(t212, Fr.mul(t213, proof.evaluations.z)));

    const t221 = Fr.add(proof.evaluations.a, Fr.add(Fr.mul(challenges.beta, proof.evaluations.s1), challenges.gamma));
    const t222 = Fr.add(proof.evaluations.b, Fr.add(Fr.mul(challenges.beta, proof.evaluations.s2), challenges.gamma));
    const t223 = Fr.add(proof.evaluations.c, Fr.add(Fr.mul(challenges.beta, proof.evaluations.s3), challenges.gamma));
    const t22 = Fr.mul(t221, Fr.mul(t222, Fr.mul(t223, proof.evaluations.zw)));

    let t2 = Fr.sub(t21, t22);
    t2 = Fr.mul(t2, challenges.invzh);

    // Compute the 6 C2 values
    if (logger) logger.info("··· Computing C2(h_2ω_3^i) values");
    let res = Fr.zero;
    for (let i = 0; i < 3; i++) {
        let c2 = Fr.add(proof.evaluations.z, Fr.mul(roots.S2.h2w3[i], t1));
        c2 = Fr.add(c2, Fr.mul(Fr.square(roots.S2.h2w3[i]), t2));

        res = Fr.add(res, Fr.mul(c2, LiS2[i]));
    }

    if (logger) logger.info("··· Computing C2(h_3ω_3^i) values");
    for (let i = 0; i < 3; i++) {
        let c2 = Fr.add(proof.evaluations.zw, Fr.mul(roots.S2.h3w3[i], proof.evaluations.t1w));
        c2 = Fr.add(c2, Fr.mul(Fr.square(roots.S2.h3w3[i]), proof.evaluations.t2w));

        res = Fr.add(res, Fr.mul(c2, LiS2[i + 3]));
    }

    return res;
}

function computeF(curve, proof, vk, challenges, roots) {
    const G1 = curve.G1;
    const Fr = curve.Fr;

    let mulH0 = Fr.sub(challenges.y, roots.S0.h0w8[0]);
    for (let i = 1; i < 8; i++) {
        mulH0 = Fr.mul(mulH0, Fr.sub(challenges.y, roots.S0.h0w8[i]));
    }

    challenges.temp = mulH0;

    let mulH1 = Fr.sub(challenges.y, roots.S1.h1w4[0]);
    for (let i = 1; i < 4; i++) {
        mulH1 = Fr.mul(mulH1, Fr.sub(challenges.y, roots.S1.h1w4[i]));
    }

    let mulH2 = Fr.sub(challenges.y, roots.S2.h2w3[0]);
    for (let i = 1; i < 3; i++) {
        mulH2 = Fr.mul(mulH2, Fr.sub(challenges.y, roots.S2.h2w3[i]));
    }
    for (let i = 0; i < 3; i++) {
        mulH2 = Fr.mul(mulH2, Fr.sub(challenges.y, roots.S2.h3w3[i]));
    }

    challenges.quotient1 = Fr.mul(challenges.alpha, Fr.div(mulH0, mulH1));
    challenges.quotient2 = Fr.mul(Fr.square(challenges.alpha), Fr.div(mulH0, mulH2));

    let F2 = G1.timesFr(proof.polynomials.C1, challenges.quotient1);
    let F3 = G1.timesFr(proof.polynomials.C2, challenges.quotient2);

    return G1.add(vk.C0, G1.add(F2, F3));
}

function computeE(curve, proof, challenges, vk, r0, r1, r2) {
    const G1 = curve.G1;
    const Fr = curve.Fr;

    let E2 = Fr.mul(r1, challenges.quotient1);
    let E3 = Fr.mul(r2, challenges.quotient2);

    return G1.timesFr(G1.one, Fr.add(r0, Fr.add(E2, E3)));
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

    return await curve.pairingEq(G1.neg(A1), A2, B1, B2);
}


export function computeLagrangeLiSi(roots, x, xi, curve) {
    const Fr = curve.Fr;
    const len = roots.length;

    const num = Fr.sub(Fr.exp(x, len), xi);
    const den1 = Fr.mul(Fr.e(len), Fr.exp(roots[0], len - 2));

    const Li = [];
    for (let i = 0; i < len; i++) {
        const den2 = roots[((len - 1) * i) % len];
        const den3 = Fr.sub(x, roots[i]);

        Li[i] = Fr.div(num, Fr.mul(Fr.mul(den1, den2), den3));
    }

    return Li;
}

export function computeLagrangeLiS2(roots, value, xi0, xi1, curve) {
    const Fr = curve.Fr;

    const Li = [];

    const len = roots[0].length;
    const n = len * roots.length;

    const num1 = Fr.exp(value, n);
    const num2 = Fr.mul(Fr.add(xi0, xi1), Fr.exp(value, len));
    const num3 = Fr.mul(xi0, xi1);
    const num = Fr.add(Fr.sub(num1, num2), num3);

    let den1 = Fr.mul(Fr.mul(Fr.e(len), roots[0][0]), Fr.sub(xi0, xi1));
    for (let i = 0; i < len; i++) {
        const den2 = roots[0][(len - 1) * i % len];
        const den3 = Fr.sub(value, roots[0][i]);

        const den = Fr.mul(den1,Fr.mul(den2, den3));

        Li[i] = Fr.div(num, den);
    }

    den1 = Fr.mul(Fr.mul(Fr.e(len), roots[1][0]), Fr.sub(xi1, xi0));
    for (let i = 0; i < len; i++) {
        const den2 = roots[1][(len - 1) * i % len];
        const den3 = Fr.sub(value, roots[1][i]);

        const den = Fr.mul(den1,Fr.mul(den2, den3));

        Li[i + len] = Fr.div(num, den);
    }

    return Li;
}
