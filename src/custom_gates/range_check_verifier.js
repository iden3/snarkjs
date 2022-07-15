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

        //1. Validate that the commitments belong to G_1
        if (!this.commitmentsBelongToG1(proof, curve)) {
            logger.error("Proof is not well constructed");
            return false;
        }

        //2. Validate that the openings belong to F

        //3. Validate that (w_i)_{i€[l]} € F^l

        //4. Compute challenges as in the prover's algorithm
        const challenges = this.computeChallenges(proof, curve, logger);

        //5. Compute the zero polynomial evaluation Z_H(xi) = xi^n - 1
        challenges.zh = Fr.sub(challenges.xin, Fr.one);

        //6. Compute the lagrange polynomial evaluation L_1(xi)
        const lagrange = this.computeLagrangeEvaluations(curve, challenges, logger);

        //7. Compute the public input polynomial evaluation

        //8. Compute the public table commitment

        //9. Compute t(x)
        const t = this.computeT(proof, challenges, lagrange, curve);
        if (logger) {
            logger.debug("t: " + Fr.toString(t, 16));
        }

        //10. Compute the first part of the batched polynomial commitment
        const D = this.computeD(proof, vk_verifier, challenges, lagrange, curve);
        if (logger) {
            logger.debug("D: " + G1.toString(G1.toAffine(D), 16));
        }

        //11. Compute the full batched polynomial commitment
        const F = this.computeF(proof, vk_verifier, challenges, D, curve);
        if (logger) {
            logger.debug("F: " + G1.toString(G1.toAffine(F), 16));
        }

        //12. Compute the group-encoded batch evaluation [E]_1
        const E = this.computeE(proof, vk_verifier, challenges, t, curve);
        if (logger) {
            logger.debug("E: " + G1.toString(G1.toAffine(E), 16));
        }

        //13. Batch validate all evaluations
        const res = await this.isValidPairing(curve, proof, challenges, vk_verifier, E, F);

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
        return curve.G1.isValid(proof.F)
            && curve.G1.isValid(proof.Table)
            && curve.G1.isValid(proof.H1)
            && curve.G1.isValid(proof.H2)
            && curve.G1.isValid(proof.Z)
            && curve.G1.isValid(proof.T)
            && curve.G1.isValid(proof.Wxi)
            && curve.G1.isValid(proof.Wxiw);
    }

    computeChallenges(proof, curve, logger) {
        const res = {};
        const transcript = new Keccak256Transcript(curve);

        transcript.appendPolCommitment(proof.F);
        transcript.appendPolCommitment(proof.H1);
        transcript.appendPolCommitment(proof.H2);

        res.gamma = transcript.getChallenge();

        transcript.reset();
        transcript.appendPolCommitment(proof.Z);

        res.alpha = transcript.getChallenge();
        res.alpha2 = curve.Fr.mul(res.alpha, res.alpha);
        res.alpha3 = curve.Fr.mul(res.alpha2, res.alpha);
        res.alpha4 = curve.Fr.mul(res.alpha3, res.alpha);
        res.alpha5 = curve.Fr.mul(res.alpha4, res.alpha);

        transcript.reset();
        transcript.appendPolCommitment(proof.T);

        res.xi = transcript.getChallenge();
        res.xin = res.xi;
        for (let i = 0; i < this.gate.cirPower; i++) {
            res.xin = curve.Fr.square(res.xin);
        }

        transcript.reset();
        transcript.appendScalar(proof.eval_h1);
        transcript.appendScalar(proof.eval_h2);
        transcript.appendScalar(proof.eval_f);
        transcript.appendScalar(proof.eval_zw);

        // res.v = [];
        // res.v[0] = transcript.getChallenge();
        // for (let i = 2; i <= 6; i++) {
        //     res.v[i] = curve.Fr.mul(res.v[i - 1], res.v[0]);
        // }

        transcript.reset();
        transcript.appendPolCommitment(proof.Wxi);
        transcript.appendPolCommitment(proof.Wxiw);

        //TODO uncomment, commented only for testing purposes
        res.u = transcript.getChallenge();

        if (logger) {
            logger.debug("gamma: " + curve.Fr.toString(res.gamma, 16));
            logger.debug("alpha: " + curve.Fr.toString(res.alpha, 16));
            logger.debug("xi: " + curve.Fr.toString(res.xi, 16));
            //TODO uncomment, commented only for testing purposes
            // logger.debug("v1: " + curve.Fr.toString(res.v[0], 16));
            // logger.debug("v6: " + curve.Fr.toString(res.v[5], 16));
        }

        return res;
    }

    computeLagrangeEvaluations(curve, challenges, logger) {
        const domainSize_F = curve.Fr.e(this.gate.domainSize);
        let omega = curve.Fr.one;

        const L = [];
        for (let i = 0; i < this.gate.domainSize; i++) {
            //numerator: omega * (xi^n - 1)
            const num = curve.Fr.mul(omega, challenges.zh);

            //denominator: n * (xi - omega)
            const den = curve.Fr.mul(domainSize_F, curve.Fr.sub(challenges.xi, omega));

            L[i] = curve.Fr.div(num, den);
            omega = curve.Fr.mul(omega, curve.Fr.w[this.gate.cirPower]);
        }

        if (logger) {
            logger.debug("Lagrange Evaluations: ");
            for (let i = 0; i < L.length; i++) {
                logger.debug(`L${i}(xi)=` + curve.Fr.toString(L[i], 16));
            }
        }

        return L;
    }

    computeT(proof, challenges, lagrange, curve) {
        // IDENTITY A
        let elA = lagrange[0];

        // IDENTITY B
        let elB = curve.Fr.add(proof.eval_h1, challenges.gamma);
        elB = curve.Fr.mul(elB, challenges.gamma);
        elB = curve.Fr.mul(elB, proof.eval_zw);
        elB = curve.Fr.mul(elB, challenges.alpha);

        // IDENTITY D
        let elD = curve.Fr.mul(lagrange[N - 1], curve.Fr.e(MAX_RANGE));
        elD = curve.Fr.mul(elD, challenges.alpha3);

        let res = proof.eval_r;
        res = curve.Fr.sub(res, elA);
        res = curve.Fr.sub(res, elB);
        res = curve.Fr.sub(res, elD);

        const t = curve.Fr.div(res, challenges.zh);

        return t;
    }

    computeD(proof, vk_verifier, challenges, lagrange, curve) {
        // IDENTITY A
        let elA = lagrange[0];
        const identityA = curve.G1.timesFr(proof.Z, elA);

        // IDENTITY B
        const elB00 = curve.Fr.add(challenges.gamma, proof.eval_f);
        const elB01 = curve.Fr.add(challenges.gamma, proof.eval_table);
        let elB0 = curve.Fr.mul(elB00, elB01);
        elB0 = curve.Fr.mul(elB0, challenges.alpha);
        elB0 = curve.Fr.add(elB0, challenges.u);
        const identityB0 = curve.G1.timesFr(proof.Z, elB0);

        let elB1 = curve.Fr.add(challenges.gamma, proof.eval_h1);
        elB1 = curve.Fr.mul(elB1, proof.eval_zw);
        elB1 = curve.Fr.mul(elB1, challenges.alpha);
        const identityB1 = curve.G1.timesFr(proof.H2, elB1);

        const identityB = curve.G1.sub(identityB0, identityB1);

        // IDENTITY C
        let elC = lagrange[0];
        elC = curve.Fr.mul(elC, challenges.alpha2);
        const identityC = curve.G1.timesFr(proof.H1, elC);

        // IDENTITY D
        let elD = lagrange[N - 1];
        elD = curve.Fr.mul(elD, challenges.alpha3);
        const identityD = curve.G1.timesFr(proof.H2, elD);

        // IDENTITY E
        let identityE = curve.G1.timesFr(proof.P1, challenges.alpha4);

        // IDENTITY F
        let omegaN = curve.Fr.one;
        for (let i = 0; i < N - 1; i++) {
            omegaN = curve.Fr.mul(omegaN, curve.Fr.w[this.gate.cirPower + 2]);
        }
        let elF = curve.Fr.sub(challenges.xi, omegaN);
        elF = curve.Fr.mul(elF, challenges.alpha5);
        const identityF = curve.G1.timesFr(proof.P2, elF);

        let res = identityA;
        res = curve.G1.add(res, identityB);
        res = curve.G1.add(res, identityC);
        res = curve.G1.add(res, identityD);
        res = curve.G1.add(res, identityE);
        res = curve.G1.add(res, identityF);

        return res;
    }

    computeF(proof, vk_verifier, challenges, D, curve) {
        let res = proof.T;
        // let res = curve.G1.add(proof.T1, curve.G1.timesFr(proof.T2, challenges.xin));
        // res = curve.G1.add(res, curve.G1.timesFr(proof.T3, curve.Fr.square(challenges.xin)));
        res = curve.G1.add(res, D);
        res = curve.G1.add(res, proof.F);
        res = curve.G1.add(res, proof.Table);
        res = curve.G1.add(res, proof.H1);

        return res;
    }

    computeE(proof, vk_verifier, challenges, t, curve) {
        let s = t;

        s = curve.Fr.add(s, proof.eval_r);
        //TODO uncomment, commented only for testing purposes
        // s = curve.Fr.add(s, curve.Fr.mul(challenges.v[0], proof.eval_r));
        s = curve.Fr.add(s, proof.eval_f);
        s = curve.Fr.add(s, proof.eval_table);
        s = curve.Fr.add(s, proof.eval_h1);
        s = curve.Fr.add(s, curve.Fr.mul(challenges.u, proof.eval_zw));

        const res = curve.G1.timesFr(curve.G1.one, s);

        return res;
    }

    async isValidPairing(curve, proof, challenges, vk_verifier, E, F) {
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

    toDebugArray(buffer, Fr) {
        const length = buffer.byteLength / Fr.n8;
        let res = [];
        for (let i = 0; i < length; i++) {
            res.push(Fr.toString(buffer.slice(i * Fr.n8, (i + 1) * Fr.n8)));
        }

        return res;
    }
}

export default RangeCheckVerifier;