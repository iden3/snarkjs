/*
    Copyright 2021 0kims association.

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

/* Implementation of this paper: https://eprint.iacr.org/2019/953.pdf */
import * as curves from "./curves.js";
import {  utils }   from "ffjavascript";
const {unstringifyBigInts} = utils;
import { Keccak256Transcript } from "./Keccak256Transcript.js";



export default async function plonkVerify(_vk_verifier, _publicSignals, _proof, logger) {
    let vk_verifier = unstringifyBigInts(_vk_verifier);
    _proof = unstringifyBigInts(_proof);
    let publicSignals = unstringifyBigInts(_publicSignals);

    const curve = await curves.getCurveFromName(vk_verifier.curve);

    const Fr = curve.Fr;
    const G1 = curve.G1;

    if (logger) logger.info("PLONK VERIFIER STARTED");

    let proof = fromObjectProof(curve,_proof);
    vk_verifier = fromObjectVk(curve, vk_verifier);

    if (!isWellConstructed(curve, proof)) {
        logger.error("Proof is not well constructed");
        return false;
    }

    if (publicSignals.length != vk_verifier.nPublic) {
        logger.error("Invalid number of public inputs");
        return false;
    }
    const challenges = calculatechallenges(curve, proof, publicSignals, vk_verifier);
    
    if (logger) {
        logger.debug("beta: " + Fr.toString(challenges.beta, 16));    
        logger.debug("gamma: " + Fr.toString(challenges.gamma, 16));    
        logger.debug("alpha: " + Fr.toString(challenges.alpha, 16));    
        logger.debug("xi: " + Fr.toString(challenges.xi, 16));
        for(let i=1;i<6;i++) {
            if (logger) logger.debug("v: " + Fr.toString(challenges.v[i], 16));
        }
        logger.debug("u: " + Fr.toString(challenges.u, 16));    
    }
    const L = calculateLagrangeEvaluations(curve, challenges, vk_verifier);
    if (logger) {
        for (let i=1; i<L.length; i++) {
            logger.debug(`L${i}(xi)=` + Fr.toString(L[i], 16));
        }
    }
    
    if (publicSignals.length != vk_verifier.nPublic) {
        logger.error("Number of public signals does not match with vk");
        return false;
    }

    const pi = calculatePI(curve, publicSignals, L);
    if (logger) {
        logger.debug("PI(xi): " + Fr.toString(pi, 16));
    }
    
    const r0 = calculateR0(curve, proof, challenges, pi, L[1]);
    if (logger) {
        logger.debug("r0: " + Fr.toString(r0, 16));
    }

    const D = calculateD(curve, proof, challenges, vk_verifier, L[1]);
    if (logger) {
        logger.debug("D: " + G1.toString(G1.toAffine(D), 16));
    }

    const F = calculateF(curve, proof, challenges, vk_verifier, D);
    if (logger) {
        logger.debug("F: " + G1.toString(G1.toAffine(F), 16));
    }

    const E = calculateE(curve, proof, challenges, r0);
    if (logger) {
        logger.debug("E: " + G1.toString(G1.toAffine(E), 16));
    }

    const res = await isValidPairing(curve, proof, challenges, vk_verifier, E, F);

    if (logger) {
        if (res) {
            logger.info("OK!");
        } else {
            logger.warn("Invalid Proof");
        }
    }

    return res;
}


function fromObjectProof(curve, proof) {
    const G1 = curve.G1;
    const Fr = curve.Fr;
    const res = {};
    res.A = G1.fromObject(proof.A);
    res.B = G1.fromObject(proof.B);
    res.C = G1.fromObject(proof.C);
    res.Z = G1.fromObject(proof.Z);
    res.T1 = G1.fromObject(proof.T1);
    res.T2 = G1.fromObject(proof.T2);
    res.T3 = G1.fromObject(proof.T3);
    res.eval_a = Fr.fromObject(proof.eval_a);
    res.eval_b = Fr.fromObject(proof.eval_b);
    res.eval_c = Fr.fromObject(proof.eval_c);
    res.eval_zw = Fr.fromObject(proof.eval_zw);
    res.eval_s1 = Fr.fromObject(proof.eval_s1);
    res.eval_s2 = Fr.fromObject(proof.eval_s2);
    res.Wxi = G1.fromObject(proof.Wxi);
    res.Wxiw = G1.fromObject(proof.Wxiw);
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

function isWellConstructed(curve, proof) {
    const G1 = curve.G1;
    if (!G1.isValid(proof.A)) return false;
    if (!G1.isValid(proof.B)) return false;
    if (!G1.isValid(proof.C)) return false;
    if (!G1.isValid(proof.Z)) return false;
    if (!G1.isValid(proof.T1)) return false;
    if (!G1.isValid(proof.T2)) return false;
    if (!G1.isValid(proof.T3)) return false;
    if (!G1.isValid(proof.Wxi)) return false;
    if (!G1.isValid(proof.Wxiw)) return false;
    return true;
}

function calculatechallenges(curve, proof, publicSignals, vk) {
    const Fr = curve.Fr;
    const res = {};
    const transcript = new Keccak256Transcript(curve);

    // Challenge round 2: beta and gamma
    transcript.addPolCommitment(vk.Qm);
    transcript.addPolCommitment(vk.Ql);
    transcript.addPolCommitment(vk.Qr);
    transcript.addPolCommitment(vk.Qo);
    transcript.addPolCommitment(vk.Qc);
    transcript.addPolCommitment(vk.S1);
    transcript.addPolCommitment(vk.S2);
    transcript.addPolCommitment(vk.S3);

    for (let i = 0; i < publicSignals.length; i++) {
        transcript.addScalar(Fr.e(publicSignals[i]));
    }

    transcript.addPolCommitment(proof.A);
    transcript.addPolCommitment(proof.B);
    transcript.addPolCommitment(proof.C);

    res.beta = transcript.getChallenge();

    transcript.reset();
    transcript.addScalar(res.beta);
    res.gamma = transcript.getChallenge();

    // Challenge round 3: alpha
    transcript.reset();
    transcript.addScalar(res.beta);
    transcript.addScalar(res.gamma);
    transcript.addPolCommitment(proof.Z);
    res.alpha = transcript.getChallenge();

    // Challenge round 4: xi
    transcript.reset();
    transcript.addScalar(res.alpha);
    transcript.addPolCommitment(proof.T1);
    transcript.addPolCommitment(proof.T2);
    transcript.addPolCommitment(proof.T3);
    res.xi = transcript.getChallenge();
    
    // Challenge round 5: v
    transcript.reset();
    transcript.addScalar(res.xi);
    transcript.addScalar(proof.eval_a);
    transcript.addScalar(proof.eval_b);
    transcript.addScalar(proof.eval_c);
    transcript.addScalar(proof.eval_s1);
    transcript.addScalar(proof.eval_s2);
    transcript.addScalar(proof.eval_zw);
    res.v = [];
    res.v[1] = transcript.getChallenge();

    for (let i=2; i<6; i++ ) res.v[i] = Fr.mul(res.v[i-1], res.v[1]);

    // Challenge: u
    transcript.reset();
    transcript.addPolCommitment(proof.Wxi);
    transcript.addPolCommitment(proof.Wxiw);
    res.u = transcript.getChallenge();

    return res;
}

function calculateLagrangeEvaluations(curve, challenges, vk) {
    const Fr = curve.Fr;

    let xin = challenges.xi;
    let domainSize = 1;
    for (let i=0; i<vk.power; i++) {
        xin = Fr.square(xin);
        domainSize *= 2;
    }
    challenges.xin = xin;

    challenges.zh = Fr.sub(xin, Fr.one);

    const L = [];

    const n = Fr.e(domainSize);
    let w = Fr.one;
    for (let i=1; i<=Math.max(1, vk.nPublic); i++) {
        L[i] = Fr.div(Fr.mul(w, challenges.zh), Fr.mul(n, Fr.sub(challenges.xi, w)));
        w = Fr.mul(w, Fr.w[vk.power]);
    }

    return L;
}

function calculatePI(curve, publicSignals, L) {
    const Fr = curve.Fr;

    let pi = Fr.zero;
    for (let i=0; i<publicSignals.length; i++) {        
        const w = Fr.e(publicSignals[i]);
        pi = Fr.sub(pi, Fr.mul(w, L[i+1]));
    }
    return pi;
}

function calculateR0(curve, proof, challenges, pi, l1) {
    const Fr = curve.Fr;

    const e1 = pi;

    const e2 = Fr.mul(l1, Fr.square(challenges.alpha));

    let e3a = Fr.add(proof.eval_a, Fr.mul(challenges.beta, proof.eval_s1));
    e3a = Fr.add(e3a, challenges.gamma);

    let e3b = Fr.add(proof.eval_b, Fr.mul(challenges.beta, proof.eval_s2));
    e3b = Fr.add(e3b, challenges.gamma);

    let e3c = Fr.add(proof.eval_c, challenges.gamma);

    let e3 = Fr.mul(Fr.mul(e3a, e3b), e3c);
    e3 = Fr.mul(e3, proof.eval_zw);
    e3 = Fr.mul(e3, challenges.alpha);

    const r0 = Fr.sub(Fr.sub(e1, e2), e3);

    return r0;
}

function calculateD(curve, proof, challenges, vk, l1) {
    const G1 = curve.G1;
    const Fr = curve.Fr;
    
    let d1 = G1.timesFr(vk.Qm, Fr.mul(proof.eval_a, proof.eval_b));
    d1 = G1.add(d1, G1.timesFr(vk.Ql, proof.eval_a));
    d1 = G1.add(d1, G1.timesFr(vk.Qr, proof.eval_b));
    d1 = G1.add(d1, G1.timesFr(vk.Qo, proof.eval_c));
    d1 = G1.add(d1, vk.Qc);

    const betaxi = Fr.mul(challenges.beta, challenges.xi);

    const d2a1 = Fr.add(Fr.add(proof.eval_a, betaxi), challenges.gamma);
    const d2a2 = Fr.add(Fr.add(proof.eval_b, Fr.mul(betaxi, vk.k1)), challenges.gamma);
    const d2a3 = Fr.add(Fr.add(proof.eval_c, Fr.mul(betaxi, vk.k2)), challenges.gamma);

    const d2a = Fr.mul(Fr.mul(Fr.mul(d2a1, d2a2), d2a3), challenges.alpha);

    const d2b = Fr.mul(l1, Fr.square(challenges.alpha));

    const d2 = G1.timesFr(proof.Z, Fr.add(Fr.add(d2a, d2b), challenges.u));

    const d3a = Fr.add(Fr.add(proof.eval_a, Fr.mul(challenges.beta, proof.eval_s1)), challenges.gamma);
    const d3b = Fr.add(Fr.add(proof.eval_b, Fr.mul(challenges.beta, proof.eval_s2)), challenges.gamma);
    const d3c = Fr.mul(Fr.mul(challenges.alpha, challenges.beta), proof.eval_zw);

    const d3 = G1.timesFr(vk.S3, Fr.mul(Fr.mul(d3a, d3b), d3c));
    
    const d4low = proof.T1;
    const d4mid = G1.timesFr(proof.T2, challenges.xin);
    const d4high = G1.timesFr(proof.T3, Fr.square(challenges.xin));
    let d4 = G1.add(d4low, G1.add(d4mid, d4high));
    d4 = G1.timesFr(d4, challenges.zh);

    const d = G1.sub(G1.sub(G1.add(d1, d2), d3), d4);

    return d;
}

function calculateF(curve, proof, challenges, vk, D) {
    const G1 = curve.G1;

    let res = G1.add(D, G1.timesFr(proof.A, challenges.v[1]));
    res = G1.add(res, G1.timesFr(proof.B, challenges.v[2]));
    res = G1.add(res, G1.timesFr(proof.C, challenges.v[3]));
    res = G1.add(res, G1.timesFr(vk.S1, challenges.v[4]));
    res = G1.add(res, G1.timesFr(vk.S2, challenges.v[5]));

    return res;
}

function calculateE(curve, proof, challenges, r0) {
    const G1 = curve.G1;
    const Fr = curve.Fr;

    let e = Fr.add(Fr.neg(r0), Fr.mul(challenges.v[1], proof.eval_a));
    e = Fr.add(e, Fr.mul(challenges.v[2], proof.eval_b));
    e = Fr.add(e, Fr.mul(challenges.v[3], proof.eval_c));
    e = Fr.add(e, Fr.mul(challenges.v[4], proof.eval_s1));
    e = Fr.add(e, Fr.mul(challenges.v[5], proof.eval_s2));
    e = Fr.add(e, Fr.mul(challenges.u, proof.eval_zw));

    const res = G1.timesFr(G1.one, e);

    return res;
}

async function isValidPairing(curve, proof, challenges, vk, E, F) {
    const G1 = curve.G1;
    const Fr = curve.Fr;

    let A1 = proof.Wxi;
    A1 = G1.add(A1, G1.timesFr(proof.Wxiw, challenges.u));

    let B1 = G1.timesFr(proof.Wxi, challenges.xi);
    const s = Fr.mul(Fr.mul(challenges.u, challenges.xi), Fr.w[vk.power]);
    B1 = G1.add(B1, G1.timesFr(proof.Wxiw, s));
    B1 = G1.add(B1, F);
    B1 = G1.sub(B1, E);

    const res = await curve.pairingEq(
        G1.neg(A1) , vk.X_2,
        B1 , curve.G2.one
    );

    return res;
}
