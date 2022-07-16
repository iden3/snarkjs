/*
    Copyright 2022 Polygon Hermez https://hermez.io

    This file is part of snarkJS.

    snarkJS is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    snarkJS is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with snarkJS. If not, see <https://www.gnu.org/licenses/>.
*/

import {Keccak256Transcript} from "../Keccak256Transcript.js";
import {MAX_RANGE, N} from "./range_check_gate.js";

class RangeCheckVerifier {
    constructor(gate) {
        this.gate = gate;
    }

    async verifyProof(proof, vk_verifier, curve, logger) {
        const Fr = curve.Fr;
        const G1 = curve.G1;

        // 1. Validate that the commitments belong to G_1
        if (!this.commitmentsBelongToG1(proof, curve)) {
            logger.error("range_check: Proof is not well constructed");
            return false;
        }

        // 2. Validate that the openings belong to F

        // 3. Compute challenges as in the prover's algorithm
        const challenges = this.computeChallenges(proof, curve, logger);

        // 4. Compute the zero polynomial evaluation Z_H(xi) = xi^n - 1
        challenges.zh = Fr.sub(challenges.xin, Fr.one);

        // 5. Compute the lagrange polynomial evaluation L_1(xi)
        const lagrange = this.computeLagrangeEvaluations(challenges, curve, logger);

        // 6. Compute t(x)
        const t = this.computeR0(proof, challenges, lagrange, curve);
        if (logger) {
            logger.debug("range_check r0: " + Fr.toString(t, 16));
        }

        // 7. Compute the first part of the batched polynomial commitment
        const D = this.computeD(proof, challenges, lagrange, curve);
        if (logger) {
            logger.debug("range_check D: " + G1.toString(G1.toAffine(D), 16));
        }

        // 8. Compute the full batched polynomial commitment
        const F = this.computeF(proof, challenges, D, curve);
        if (logger) {
            logger.debug("range_check F: " + G1.toString(G1.toAffine(F), 16));
        }

        // 9. Compute the group-encoded batch evaluation [E]_1
        const E = this.computeE(proof, challenges, t, curve);
        if (logger) {
            logger.debug("range_check E: " + G1.toString(G1.toAffine(E), 16));
        }

        // 10. Batch validate all evaluations
        const res = await this.isValidPairing(proof, challenges, vk_verifier, E, F, curve);

        if (logger) {
            if (res) {
                logger.info("Range check: OK!");
            } else {
                logger.warn("Range check: Invalid Proof");
            }
        }

        return res;
    }

    commitmentsBelongToG1(proof, curve) {
        const G1 = curve.G1;

        return G1.isValid(proof.F)
            && G1.isValid(proof.Table)
            && G1.isValid(proof.H1)
            && G1.isValid(proof.H2)
            && G1.isValid(proof.Z)
            && G1.isValid(proof.T)
            && G1.isValid(proof.Wxi)
            && G1.isValid(proof.Wxiw);
    }

    computeChallenges(proof, curve, logger) {
        const Fr = curve.Fr;

        const challenges = {};
        const transcript = new Keccak256Transcript(curve);

        transcript.appendPolCommitment(proof.F);
        transcript.appendPolCommitment(proof.H1);
        transcript.appendPolCommitment(proof.H2);

        challenges.gamma = transcript.getChallenge();

        transcript.reset();
        transcript.appendPolCommitment(proof.Z);

        challenges.alpha = transcript.getChallenge();
        challenges.alpha2 = Fr.mul(challenges.alpha, challenges.alpha);
        challenges.alpha3 = Fr.mul(challenges.alpha2, challenges.alpha);
        challenges.alpha4 = Fr.mul(challenges.alpha3, challenges.alpha);
        challenges.alpha5 = Fr.mul(challenges.alpha4, challenges.alpha);

        transcript.reset();
        transcript.appendPolCommitment(proof.T);

        challenges.xi = transcript.getChallenge();
        challenges.xin = challenges.xi;
        for (let i = 0; i < this.gate.cirPower; i++) {
            challenges.xin = Fr.square(challenges.xin);
        }

        transcript.reset();
        transcript.appendScalar(proof.eval_f);
        transcript.appendScalar(proof.eval_table);
        transcript.appendScalar(proof.eval_h1);
        transcript.appendScalar(proof.eval_h2);
        transcript.appendScalar(proof.eval_zw);

        // 1. Get opening challenge v ∈ Zp.
        challenges.v = [];
        challenges.v[0] = transcript.getChallenge();
        if (logger) logger.debug("v: " + Fr.toString(challenges.v[0]));

        for (let i = 1; i < 4; i++) {
            challenges.v[i] = Fr.mul(challenges.v[i - 1], challenges.v[0]);
        }

        transcript.reset();
        transcript.appendPolCommitment(proof.Wxi);
        transcript.appendPolCommitment(proof.Wxiw);

        challenges.u = transcript.getChallenge();

        if (logger) {
            logger.debug("gamma: " + Fr.toString(challenges.gamma, 16));
            logger.debug("alpha: " + Fr.toString(challenges.alpha, 16));
            logger.debug("xi: " + Fr.toString(challenges.xi, 16));
            logger.debug("v1: " + Fr.toString(challenges.v[0], 16));
        }

        return challenges;
    }

    computeLagrangeEvaluations(challenges, curve, logger) {
        const Fr = curve.Fr;

        const domainSize_F = Fr.e(this.gate.domainSize);
        let omega = Fr.one;

        const lagrangeEvaluations = [];
        for (let i = 0; i < this.gate.domainSize; i++) {
            //numerator: omega * (xi^n - 1)
            const num = Fr.mul(omega, challenges.zh);

            //denominator: n * (xi - omega)
            const den = Fr.mul(domainSize_F, Fr.sub(challenges.xi, omega));

            lagrangeEvaluations[i] = Fr.div(num, den);
            omega = Fr.mul(omega, Fr.w[this.gate.cirPower]);
        }

        if (logger) {
            logger.debug("Lagrange Evaluations: ");
            for (let i = 0; i < lagrangeEvaluations.length; i++) {
                logger.debug(`L${i}(xi)=` + Fr.toString(lagrangeEvaluations[i], 16));
            }
        }

        return lagrangeEvaluations;
    }

    computeR0(proof, challenges, lagrange, curve) {
        const Fr = curve.Fr;

        // IDENTITY A
        let elA = lagrange[0];

        // IDENTITY B
        let elB = Fr.add(proof.eval_h1, challenges.gamma);
        elB = Fr.mul(elB, challenges.gamma);
        elB = Fr.mul(elB, proof.eval_zw);
        elB = Fr.mul(elB, challenges.alpha);

        // IDENTITY D
        let elD = Fr.mul(lagrange[N - 1], Fr.e(MAX_RANGE));
        elD = Fr.mul(elD, challenges.alpha3);

        let res = proof.eval_r;
        res = Fr.sub(res, elA);
        res = Fr.sub(res, elB);
        res = Fr.sub(res, elD);

        const t = Fr.div(res, challenges.zh);

        return t;
    }

    computeD(proof, challenges, lagrange, curve) {
        const Fr = curve.Fr;
        const G1 = curve.G1;

        // IDENTITY A
        let elA = lagrange[0];

        elA = Fr.mul(elA, challenges.v[0]);
        const identityA = G1.timesFr(proof.Z, elA);

        // IDENTITY B
        const elB00 = Fr.add(challenges.gamma, proof.eval_f);
        const elB01 = Fr.add(challenges.gamma, proof.eval_table);
        let elB0 = Fr.mul(elB00, elB01);
        elB0 = Fr.mul(elB0, challenges.alpha);
        elB0 = Fr.mul(elB0, challenges.v[0]);
        elB0 = Fr.add(elB0, challenges.u);
        const identityB0 = G1.timesFr(proof.Z, elB0);

        let elB1 = Fr.add(challenges.gamma, proof.eval_h1);
        elB1 = Fr.mul(elB1, proof.eval_zw);
        elB1 = Fr.mul(elB1, challenges.alpha);
        elB1 = Fr.mul(elB1, challenges.v[0]);
        const identityB1 = G1.timesFr(proof.H2, elB1);

        const identityB = G1.sub(identityB0, identityB1);

        // IDENTITY C
        let elC = lagrange[0];
        elC = Fr.mul(elC, challenges.alpha2);
        elC = Fr.mul(elC, challenges.v[0]);
        const identityC = G1.timesFr(proof.H1, elC);

        // IDENTITY D
        let elD = lagrange[N - 1];
        elD = Fr.mul(elD, challenges.alpha3);
        elD = Fr.mul(elD, challenges.v[0]);
        const identityD = G1.timesFr(proof.H2, elD);

        // IDENTITY E
        let elE = challenges.alpha4;
        elE = Fr.mul(elE, challenges.v[0]);
        let identityE = G1.timesFr(proof.P1, elE);

        // IDENTITY F
        let omegaN = Fr.one;
        for (let i = 0; i < N - 1; i++) {
            omegaN = Fr.mul(omegaN, Fr.w[this.gate.cirPower + 2]);
        }
        let elF = Fr.sub(challenges.xi, omegaN);
        elF = Fr.mul(elF, challenges.alpha5);
        elF = Fr.mul(elF, challenges.v[0]);
        const identityF = G1.timesFr(proof.P2, elF);

        let res = identityA;
        res = G1.add(res, identityB);
        res = G1.add(res, identityC);
        res = G1.add(res, identityD);
        res = G1.add(res, identityE);
        res = G1.add(res, identityF);

        return res;
    }

    computeF(proof, challenges, D, curve) {
        const G1 = curve.G1;

        let res = proof.T;
        // let res = G1.add(proof.T1, G1.timesFr(proof.T2, challenges.xin));
        // res = G1.add(res, G1.timesFr(proof.T3, Fr.square(challenges.xin)));
        res = G1.add(res, D);
        res = G1.add(res, G1.timesFr(proof.F, challenges.v[1]));
        res = G1.add(res, G1.timesFr(proof.Table, challenges.v[2]));
        res = G1.add(res, G1.timesFr(proof.H1, challenges.v[3]));

        return res;
    }

    computeE(proof, challenges, t, curve) {
        const Fr = curve.Fr;
        const G1 = curve.G1;

        let s = t;
        s = Fr.add(s, Fr.mul(challenges.v[0], proof.eval_r));
        s = Fr.add(s, Fr.mul(challenges.v[1], proof.eval_f));
        s = Fr.add(s, Fr.mul(challenges.v[2], proof.eval_table));
        s = Fr.add(s, Fr.mul(challenges.v[3], proof.eval_h1));
        s = Fr.add(s, Fr.mul(challenges.u, proof.eval_zw));

        const res = G1.timesFr(G1.one, s);

        return res;
    }

    async isValidPairing(proof, challenges, vk_verifier, E, F, curve) {
        const G1 = curve.G1;
        const Fr = curve.Fr;

        let A1 = proof.Wxi;
        A1 = G1.add(A1, G1.timesFr(proof.Wxiw, challenges.u));

        let A2 = vk_verifier.X_2;


        let B1 = G1.timesFr(proof.Wxi, challenges.xi);
        const s = Fr.mul(Fr.mul(challenges.u, challenges.xi), Fr.w[this.gate.cirPower]);
        B1 = G1.add(B1, G1.timesFr(proof.Wxiw, s));
        B1 = G1.add(B1, F);
        B1 = G1.sub(B1, E);

        let B2 = curve.G2.one;

        const paired = await curve.pairingEq(curve.G1.neg(A1), A2, B1, B2);

        return paired;
    }

    fromObjectProof(proof, curve) {
        let res = {};
        res.F = curve.G1.fromObject(proof.F);
        res.Table = curve.G1.fromObject(proof.Table);
        res.H1 = curve.G1.fromObject(proof.H1);
        res.H2 = curve.G1.fromObject(proof.H2);
        res.P1 = curve.G1.fromObject(proof.P1);
        res.P2 = curve.G1.fromObject(proof.P2);
        res.Z = curve.G1.fromObject(proof.Z);
        res.T = curve.G1.fromObject(proof.T);
        // res.T1 = curve.G1.fromObject(proof.T1);
        // res.T2 = curve.G1.fromObject(proof.T2);
        // res.T3 = curve.G1.fromObject(proof.T3);
        res.Wxi = curve.G1.fromObject(proof.Wxi);
        res.Wxiw = curve.G1.fromObject(proof.Wxiw);

        res.eval_h1 = curve.Fr.fromObject(proof.eval_h1);
        res.eval_h2 = curve.Fr.fromObject(proof.eval_h2);
        res.eval_f = curve.Fr.fromObject(proof.eval_f);
        res.eval_zw = curve.Fr.fromObject(proof.eval_zw);
        res.eval_r = curve.Fr.fromObject(proof.eval_r);
        res.eval_table = curve.Fr.fromObject(proof.eval_table);

        return res;
    }
}

export default RangeCheckVerifier;