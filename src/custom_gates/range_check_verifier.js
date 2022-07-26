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
import {MAX_RANGE, DOMAIN_SIZE, CIRCUIT_POWER, C} from "./range_check_gate.js";

class RangeCheckVerifier {
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

        // 10. Batch validate all evaluations.js
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

        Object.keys(proof.polynomials).forEach(key => {
            if(!G1.isValid(proof.polynomials[key])) return false;
        });

        return true;
    }

    computeChallenges(proof, curve, logger) {
        const Fr = curve.Fr;

        const challenges = {};
        const transcript = new Keccak256Transcript(curve);

        transcript.appendPolCommitment(proof.polynomials.F);
        transcript.appendPolCommitment(proof.polynomials.H1);
        transcript.appendPolCommitment(proof.polynomials.H2);

        challenges.gamma = transcript.getChallenge();

        transcript.reset();
        transcript.appendPolCommitment(proof.polynomials.Z);

        challenges.alpha = transcript.getChallenge();
        challenges.alpha2 = Fr.mul(challenges.alpha, challenges.alpha);
        challenges.alpha3 = Fr.mul(challenges.alpha2, challenges.alpha);
        challenges.alpha4 = Fr.mul(challenges.alpha3, challenges.alpha);
        challenges.alpha5 = Fr.mul(challenges.alpha4, challenges.alpha);

        transcript.reset();
        transcript.appendPolCommitment(proof.polynomials.T1);
        transcript.appendPolCommitment(proof.polynomials.T2);
        transcript.appendPolCommitment(proof.polynomials.T3);

        challenges.xi = Fr.one;//transcript.getChallenge();
        challenges.xin = challenges.xi;
        for (let i = 0; i < CIRCUIT_POWER; i++) {
            challenges.xin = Fr.square(challenges.xin);
        }

        transcript.reset();
        transcript.appendScalar(proof.evaluations.f);
        transcript.appendScalar(proof.evaluations.table);
        transcript.appendScalar(proof.evaluations.h1);
        transcript.appendScalar(proof.evaluations.zw);

        // 1. Get opening challenge v ∈ Zp.
        challenges.v = [];
        challenges.v[0] = transcript.getChallenge();
        if (logger) logger.debug("v: " + Fr.toString(challenges.v[0]));

        for (let i = 1; i < 6; i++) {
            challenges.v[i] = Fr.mul(challenges.v[i - 1], challenges.v[0]);
        }

        transcript.reset();
        transcript.appendPolCommitment(proof.polynomials.Wxi);
        transcript.appendPolCommitment(proof.polynomials.Wxiw);

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

        const domainSize_F = Fr.e(DOMAIN_SIZE);
        let omega = Fr.one;

        const lagrangeEvaluations = [];
        for (let i = 0; i < DOMAIN_SIZE; i++) {
            //numerator: omega * (xi^n - 1)
            const num = Fr.mul(omega, challenges.zh);

            //denominator: n * (xi - omega)
            const den = Fr.mul(domainSize_F, Fr.sub(challenges.xi, omega));

            lagrangeEvaluations[i] = Fr.div(num, den);
            omega = Fr.mul(omega, Fr.w[CIRCUIT_POWER]);
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
        let elB = Fr.add(proof.evaluations.h1, challenges.gamma);
        elB = Fr.mul(elB, challenges.gamma);
        elB = Fr.mul(elB, proof.evaluations.zw);
        elB = Fr.mul(elB, challenges.alpha);

        // IDENTITY D
        let elD = Fr.mul(lagrange[DOMAIN_SIZE - 1], Fr.e(MAX_RANGE));
        elD = Fr.mul(elD, challenges.alpha3);

        // IDENTITY F
        let omegaN = Fr.one;
        for (let i = 1; i < DOMAIN_SIZE; i++) {
            omegaN = Fr.mul(omegaN, Fr.w[CIRCUIT_POWER]);
        }
        let elF = Fr.sub(challenges.xi, omegaN);
        elF = Fr.mul(elF, this.getResultPolP(Fr.sub(proof.evaluations.h1w, proof.evaluations.h2), Fr));
        elF = Fr.mul(elF, challenges.alpha5);
        elF = Fr.mul(elF, challenges.v[0]);

        let res = proof.evaluations.r;
        res = Fr.sub(res, elA);
        res = Fr.sub(res, elB);
        res = Fr.sub(res, elD);
        res = Fr.add(res, elF);

        res = Fr.div(res, challenges.zh);

        return res;
    }

    computeD(proof, challenges, lagrange, curve) {
        const Fr = curve.Fr;
        const G1 = curve.G1;

        // IDENTITY A
        let elA = lagrange[0];

        elA = Fr.mul(elA, challenges.v[0]);
        const identityA = G1.timesFr(proof.polynomials.Z, elA);

        // IDENTITY B
        let elB0 = Fr.mul(Fr.add(challenges.gamma, proof.evaluations.f), Fr.add(challenges.gamma, proof.evaluations.table));
        elB0 = Fr.mul(elB0, challenges.alpha);
        elB0 = Fr.mul(elB0, challenges.v[0]);
        elB0 = Fr.add(elB0, challenges.u);
        elB0 = G1.timesFr(proof.polynomials.Z, elB0);

        let elB1 = Fr.add(challenges.gamma, proof.evaluations.h1);
        elB1 = Fr.mul(elB1, proof.evaluations.zw);
        elB1 = Fr.mul(elB1, challenges.alpha);
        elB1 = Fr.mul(elB1, challenges.v[0]);
        elB1 = G1.timesFr(proof.polynomials.H2, elB1);
        const identityB = G1.sub(elB0, elB1);

        // IDENTITY C
        let elC = lagrange[0];
        elC = Fr.mul(elC, challenges.alpha2);
        elC = Fr.mul(elC, challenges.v[0]);
        const identityC = G1.timesFr(proof.polynomials.H1, elC);

        // IDENTITY D
        let elD = lagrange[DOMAIN_SIZE - 1];
        elD = Fr.mul(elD, challenges.alpha3);
        elD = Fr.mul(elD, challenges.v[0]);
        const identityD = G1.timesFr(proof.polynomials.H2, elD);

        // IDENTITY E
        let elE = challenges.alpha4;
        elE = Fr.mul(elE, challenges.v[0]);
        const identityE = G1.timesFr(proof.polynomials.P1, elE);

        // IDENTITY F
        // let omegaN = Fr.one;
        // for (let i = 1; i < DOMAIN_SIZE; i++) {
        //     omegaN = Fr.mul(omegaN, Fr.w[CIRCUIT_POWER]);
        // }
        // let elF = Fr.sub(challenges.xi, omegaN);
        // elF = Fr.mul(elF, challenges.alpha5);
        // elF = Fr.mul(elF, challenges.v[0]);
        // const identityF = G1.timesFr(proof.polynomials.P2, elF);

        let res = identityA;
        res = G1.add(res, identityB);
        res = G1.add(res, identityC);
        res = G1.add(res, identityD);
        res = G1.add(res, identityE);
        // res = G1.add(res, identityF);

        return res;
    }

    computeF(proof, challenges, D, curve) {
        const Fr = curve.Fr;
        const G1 = curve.G1;

        let res = proof.polynomials.T1;
        res = G1.add(res, G1.timesFr(proof.polynomials.T2, challenges.xin));
        res = G1.add(res, G1.timesFr(proof.polynomials.T3, Fr.square(challenges.xin)));

        res = G1.add(res, D);
        res = G1.add(res, G1.timesFr(proof.polynomials.F, challenges.v[1]));
        res = G1.add(res, G1.timesFr(proof.polynomials.Table, challenges.v[2]));
        res = G1.add(res, G1.timesFr(proof.polynomials.H1, challenges.v[3]));
        res = G1.add(res, G1.timesFr(proof.polynomials.H2, challenges.v[4]));

        return res;
    }

    computeE(proof, challenges, t, curve) {
        const Fr = curve.Fr;
        const G1 = curve.G1;

        let res = t;
        res = Fr.add(res, Fr.mul(challenges.v[0], proof.evaluations.r));
        res = Fr.add(res, Fr.mul(challenges.v[1], proof.evaluations.f));
        res = Fr.add(res, Fr.mul(challenges.v[2], proof.evaluations.table));
        res = Fr.add(res, Fr.mul(challenges.v[3], proof.evaluations.h1));
        res = Fr.add(res, Fr.mul(challenges.u, proof.evaluations.zw));
        res = Fr.add(res, Fr.mul(Fr.one, proof.evaluations.h1w));

        res = G1.timesFr(G1.one, res);

        return res;
    }

    async isValidPairing(proof, challenges, vk_verifier, E, F, curve) {
        const G1 = curve.G1;
        const Fr = curve.Fr;

        let A1 = proof.polynomials.Wxi;
        A1 = G1.add(A1, G1.timesFr(proof.polynomials.Wxiw, challenges.u));

        let A2 = vk_verifier.X_2;


        let B1 = G1.timesFr(proof.polynomials.Wxi, challenges.xi);
        const s = Fr.mul(Fr.mul(challenges.u, challenges.xi), Fr.w[CIRCUIT_POWER]);
        B1 = G1.add(B1, G1.timesFr(proof.polynomials.Wxiw, s));
        B1 = G1.add(B1, F);
        B1 = G1.sub(B1, E);

        let B2 = curve.G2.one;

        return await curve.pairingEq(curve.G1.neg(A1), A2, B1, B2);
    }

    getResultPolP(x, Fr) {
        let res = Fr.one;

        for (let i = 0; i <= C; i++) {
            res = Fr.mul(res, Fr.sub(x, Fr.e(i)));
        }
        return res;
    }
}

export default RangeCheckVerifier;