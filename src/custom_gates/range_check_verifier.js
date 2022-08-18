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
import * as Domain from "domain";

class RangeCheckVerifier {
    async verifyProof(proof, vk_verifier, curve, logger) {
        const Fr = curve.Fr;
        const G1 = curve.G1;

        // 1. Validate that [f(x)]_1, [h_1(x)]_1, [h_2(x)]_1, [z(x)]_1,
        // [q_1(x)]_1, ..., [q_c(x)]_1, [W_xi(x)]_1, [W_xiω(x)]_1 ∈ G_1
        if (!this.commitmentsBelongToG1(proof, curve)) {
            logger.error("range_check: Proof is not well constructed");
            return false;
        }

        // TODO
        // 2. Validate that f(xi), t(xi), h_1(xi), h_2(xi), z(xiω), h_1(xiω) ∈ F

        // TODO
        // 3. Validate that (t_i)_{i ∈ [n]} ∈ F^{n}

        // 4. Compute the challenges γ, α, xi, v, vp and multipoint evaluation challenge u ∈ F
        // as in prover description, from the common preprocessed inputs and elements of π
        const challenges = this.computeChallenges(proof, curve, logger);

        // 5. Compute the zero polynomial evaluation Z_H(xi) = xi^n - 1
        challenges.zh = Fr.sub(challenges.xiN, Fr.one);

        // 6. Compute the lagrange polynomial evaluation L_1(xi), L_N(xi)
        const [lagrange1, lagrangeN] = this.computeLagrangeEvaluations(challenges, curve, logger);

        // 7. To save a verifier scalar multiplication, we split r(X) into its constant and non-constant terms.
        // Compute r(X)'s constant term where r'(X) := r(X) - r_0
        const r0 = this.computeR0(proof, challenges, lagrange1, lagrangeN, curve);
        if (logger) {
            logger.debug("range_check r0: " + Fr.toString(r0, 16));
        }

        // 7. Compute the first part of the batched polynomial commitment [D]_1:= [r'(x)] +  u[z(x)]_1
        const D = this.computeD(proof, challenges, lagrange1, curve);
        if (logger) {
            logger.debug("range_check D: " + G1.toString(G1.toAffine(D), 16));
        }

        // 8. Compute the full batched polynomial commitment [F]_1
        const F = this.computeF(proof, challenges, D, curve);
        if (logger) {
            logger.debug("range_check F: " + G1.toString(G1.toAffine(F), 16));
        }

        // 9. Compute the group-encoded batch evaluation [E]_1
        const E = this.computeE(proof, challenges, r0, curve);
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

        Object.keys(proof.polynomials).forEach(key => {
            if (!G1.isValid(proof.polynomials[key])) return false;
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
        transcript.appendPolCommitment(proof.polynomials.Q1);
        transcript.appendPolCommitment(proof.polynomials.Q2);

        challenges.xi = transcript.getChallenge();
        challenges.xiN = challenges.xi;
        for (let i = 0; i < CIRCUIT_POWER; i++) {
            challenges.xiN = Fr.square(challenges.xiN);

        }

        transcript.reset();
        transcript.appendScalar(proof.evaluations.f);
        transcript.appendScalar(proof.evaluations.lookupTable);
        transcript.appendScalar(proof.evaluations.h1);
        transcript.appendScalar(proof.evaluations.h2);
        transcript.appendScalar(proof.evaluations.zw);
        transcript.appendScalar(proof.evaluations.h1w);

        // 1. Get opening challenge v ∈ Zp.
        challenges.v = [];
        challenges.v[0] = transcript.getChallenge();
        if (logger) logger.debug("v: " + Fr.toString(challenges.v[0]));

        for (let i = 1; i < 5; i++) {
            challenges.v[i] = Fr.mul(challenges.v[i - 1], challenges.v[0]);
        }

        transcript.reset();
        transcript.appendScalar(challenges.v[0]);
        challenges.vp = transcript.getChallenge();

        // Compute multipoint evaluation challenge u ∈ F
        transcript.reset();
        transcript.appendPolCommitment(proof.polynomials.Wxi);
        transcript.appendPolCommitment(proof.polynomials.Wxiw);

        challenges.u = transcript.getChallenge();

        challenges.omegaN = Fr.one;
        for (let i = 1; i < DOMAIN_SIZE; i++) {
            challenges.omegaN = Fr.mul(challenges.omegaN, Fr.w[CIRCUIT_POWER]);
        }

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

        // Lagrange 1 : ω (xi^n - 1) / n (xi - ω)
        let num = Fr.mul(Fr.one, challenges.zh);
        let den = Fr.mul(domainSize_F, Fr.sub(challenges.xi, Fr.one));
        const lagrange1 = Fr.div(num, den);

        // Lagrange N : ω^n * (xi^n - 1) / n * (xi - ω^n)
        num = Fr.mul(challenges.omegaN, challenges.zh);
        den = Fr.mul(domainSize_F, Fr.sub(challenges.xi, challenges.omegaN));
        const lagrangeN = Fr.div(num, den);

        if (logger) {
            logger.debug("Lagrange Evaluations: ");
            logger.debug("L1(xi)=" + Fr.toString(lagrange1, 16));
            logger.debug("LN(xi)=" + Fr.toString(lagrangeN, 16));
        }

        return [lagrange1, lagrangeN];
    }

    computeR0(proof, challenges, lagrange1, lagrangeN, curve) {
        const Fr = curve.Fr;

        // IDENTITY A  -z(xiω)(γ + h1(xi))(γ + h2(xi))
        let elA0 = Fr.add(proof.evaluations.h1, challenges.gamma);
        let elA1 = Fr.add(proof.evaluations.h2, challenges.gamma);
        let elA = Fr.mul(elA0, elA1);
        elA = Fr.mul(elA, proof.evaluations.zw);

        // IDENTITY B  -αL_1(xi)
        let elB = Fr.mul(lagrange1, challenges.alpha);

        // IDENTITY C   α^2h_1(xi)L_1(xi)
        let elC = Fr.mul(lagrange1, proof.evaluations.h1);
        elC = Fr.mul(elC, challenges.alpha2);

        // IDENTITY D   α^3(h_2(xi) - c(n-1))L_n(xi)
        let elD = Fr.sub(proof.evaluations.h2, Fr.e(MAX_RANGE));
        elD = Fr.mul(lagrangeN, elD);
        elD = Fr.mul(elD, challenges.alpha3);

        // IDENTITY E   α^4P(h_2(xi) - h1(xi))
        let elE = Fr.sub(proof.evaluations.h2, proof.evaluations.h1);
        elE = this.getResultPolP(elE, Fr);
        elE = Fr.mul(elE, challenges.alpha4);

        // IDENTITY F   α^5(xi - ω^n)P(h_1(xiω) - h2(xi))
        let elF0 = Fr.sub(challenges.xi, challenges.omegaN);
        let elF1 = this.getResultPolP(Fr.sub(proof.evaluations.h1w, proof.evaluations.h2), Fr);
        let elF = Fr.mul(elF0, elF1);
        elF = Fr.mul(elF, challenges.alpha5);

        let res = proof.evaluations.r;
        res = Fr.sub(res, elA);
        res = Fr.sub(res, elB);
        res = Fr.add(res, elC);
        res = Fr.add(res, elD);
        res = Fr.add(res, elE);
        res = Fr.add(res, elF);

        res = Fr.div(res, challenges.zh);

        return res;
    }

    computeD(proof, challenges, lagrange1, curve) {
        const Fr = curve.Fr;
        const G1 = curve.G1;

        // IDENTITY A  ((γ + f(xi))(γ + t(xi)) + u)[z(x)]_1
        let elA0 = Fr.add(challenges.gamma, proof.evaluations.f);
        let elA1 = Fr.add(challenges.gamma, proof.evaluations.lookupTable);
        let elA = Fr.mul(elA0, elA1);
        elA = Fr.mul(elA, challenges.v[0]);
        elA = Fr.add(elA, challenges.u);
        const identityA = G1.timesFr(proof.polynomials.Z, elA);

        // IDENTITY B  αL_1(xi)[z(x)]_1
        let elB = lagrange1;
        elB = Fr.mul(elB, challenges.v[0]);
        elB = Fr.mul(elB, challenges.alpha);
        const identityB = G1.timesFr(proof.polynomials.Z, elB);

        return G1.add(identityA, identityB);
    }

    computeF(proof, challenges, D, curve) {
        const Fr = curve.Fr;
        const G1 = curve.G1;

        // [F]_1 := [D]_1 + v · [f(x)]_1 + v^2 ·[t(x)]_1 + v^3 · [h_1(x)]_1 + v^4 · [h_2(x)]_1 + u · v' ·[h_1(x)]_1
        let res = proof.polynomials.Q1;

        // Compute xi^{n+3} to add to the split polynomial
        let xinAdd3 = challenges.xiN;
        for (let i = 0; i < 3; i++) {
            xinAdd3 = Fr.mul(xinAdd3, challenges.xi);
        }
        res = G1.add(res, G1.timesFr(proof.polynomials.Q2, xinAdd3));

        res = G1.add(res, D);
        res = G1.add(res, G1.timesFr(proof.polynomials.F, challenges.v[1]));
        res = G1.add(res, G1.timesFr(proof.polynomials.LookupTable, challenges.v[2]));
        res = G1.add(res, G1.timesFr(proof.polynomials.H1, challenges.v[3]));
        res = G1.add(res, G1.timesFr(proof.polynomials.H2, challenges.v[4]));
        res = G1.add(res, G1.timesFr(proof.polynomials.H1, Fr.mul(challenges.vp, challenges.u)));

        return res;
    }

    computeE(proof, challenges, t, curve) {
        const Fr = curve.Fr;
        const G1 = curve.G1;

        //[E]_1 := [-r_0 + v · f(xi) + v^2 · t(xi) + v^3 · h_1(xi) + v^4 · h_2(xi) + u · (z(xiω) + v'h_1(xiω)) ]_1
        let res = t;
        res = Fr.add(res, Fr.mul(challenges.v[0], proof.evaluations.r));
        res = Fr.add(res, Fr.mul(challenges.v[1], proof.evaluations.f));
        res = Fr.add(res, Fr.mul(challenges.v[2], proof.evaluations.lookupTable));
        res = Fr.add(res, Fr.mul(challenges.v[3], proof.evaluations.h1));
        res = Fr.add(res, Fr.mul(challenges.v[4], proof.evaluations.h2));

        const partial = Fr.add(proof.evaluations.zw, Fr.mul(challenges.vp, proof.evaluations.h1w));
        res = Fr.add(res, Fr.mul(challenges.u, partial));

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