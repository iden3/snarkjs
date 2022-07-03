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
        const t = this.computeT(proof, challenges, lagrange[0], curve);
        if (logger) {
            logger.debug("t: " + Fr.toString(t, 16));
        }

        //10. Compute the first part of the batched polynomial commitment
        const D = this.computeD(proof, vk_verifier, challenges, lagrange[0], curve);
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
        if (!curve.G1.isValid(proof.F)) return false;
        if (!curve.G1.isValid(proof.H1)) return false;
        if (!curve.G1.isValid(proof.H2)) return false;
        if (!curve.G1.isValid(proof.Z)) return false;
        if (!curve.G1.isValid(proof.T)) return false;
        // if (!curve.G1.isValid(proof.T1)) return false;
        // if (!curve.G1.isValid(proof.T2)) return false;
        // if (!curve.G1.isValid(proof.T3)) return false;
        if (!curve.G1.isValid(proof.Wxi)) return false;
        //if (!curve.G1.isValid(proof.Wxiw)) return false;

        return true;
    }

    computeChallenges(proof, curve, logger) {
        const res = {};
        const transcript = new Keccak256Transcript(curve);

        // for (let i=0; i<publicSignals.length; i++) {
        //     transcript.appendScalar(curve.Fr.e(publicSignals[i]));
        // }
        transcript.appendPolCommitment(proof.F);
        transcript.appendPolCommitment(proof.H1);
        transcript.appendPolCommitment(proof.H2);

        res.gamma = transcript.getChallenge();

        transcript.reset();
        transcript.appendPolCommitment(proof.Z);

        res.alpha = transcript.getChallenge();

        transcript.reset();
        transcript.appendPolCommitment(proof.T);
        // transcript.appendPolCommitment(proof.T1);
        // transcript.appendPolCommitment(proof.T2);
        // transcript.appendPolCommitment(proof.T3);

        res.xi = transcript.getChallenge();
        res.xin = res.xi;
        for (let i = 0; i < this.gate.cirPower; i++) {
            res.xin = curve.Fr.square(res.xin);
        }

        transcript.reset();
        transcript.appendScalar(proof.eval_h1);
        transcript.appendScalar(proof.eval_h2);
        transcript.appendScalar(proof.eval_f);
        transcript.appendScalar(proof.eval_t);
        transcript.appendScalar(proof.eval_zw);
        transcript.appendScalar(proof.eval_r);

        //TODO uncomment, commented only for testing purposes
        // res.v = [];
        // res.v[1] = transcript.getChallenge();
        // for (let i=2; i<=6; i++ ) res.v[i] = curve.Fr.mul(res.v[i-1], res.v[1]);

        transcript.reset();
        transcript.appendPolCommitment(proof.Wxi);
        transcript.appendPolCommitment(proof.Wxiw);

        //TODO uncomment, commented only for testing purposes
        // res.u = transcript.getChallenge();

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

    computeT(proof, challenges, lagrange1, curve) {
        let num = proof.eval_r;

        num = curve.Fr.sub(num, curve.Fr.mul(lagrange1, curve.Fr.square(challenges.alpha)));

        const t = curve.Fr.div(num, challenges.zh);

        return t;
    }

    computeD(proof, vk_verifier, challenges, lagrange_one, curve) {
        //Identity a
        let elA = curve.Fr.mul(lagrange_one, curve.Fr.square(challenges.alpha));
        const identityA = curve.G1.timesFr(proof.Z, elA);

        //Identity c
        let elC = lagrange_one;
        const identityC = curve.G1.timesFr(proof.H1, elC);

        // let res = curve.G1.add(identityA, identityC);
        let res = identityA;
        return res;
    }

    computeF(proof, vk_verifier, challenges, D, curve) {
        let res = proof.T;
        // let res = curve.G1.add(proof.T1, curve.G1.timesFr(proof.T2, challenges.xin));
        // res = curve.G1.add(res, curve.G1.timesFr(proof.T3, curve.Fr.square(challenges.xin)));
        res = curve.G1.add(res, D);

        return res;
    }

    computeE(proof, vk_verifier, challenges, t, curve) {
        let s = t;
        s = curve.Fr.add(s, proof.eval_r);

        //TODO uncomment, commented only for testing purposes
        // s = curve.Fr.add(s, curve.Fr.mul(challenges.v[0], proof.eval_r));
        //s = curve.Fr.add(s, proof.eval_r);
        // s = curve.Fr.add(s, proof.eval_zw);
        // s = curve.Fr.add(s, curve.Fr.mul(challenges.u, proof.eval_zw));

        const res = curve.G1.timesFr(curve.G1.one, s);

        return res;
    }

    async isValidPairing(curve, proof, challenges, vk_verifier, E, F) {
        const G1 = curve.G1;
        const Fr = curve.Fr;

        let A1 = proof.Wxi;
        let A2 = vk_verifier.X_2;

        //TODO uncomment, commented only for testing purposes
        //A1 = G1.add(A1, proof.Wxiw);//G1.timesFr(proof.Wxiw, challenges.u));

        let B1 = G1.timesFr(proof.Wxi, challenges.xi);
        // const s = Fr.mul(/*Fr.mul(challenges.u,*/ challenges.xi/*)*/, Fr.w[this.gate.cirPower]);
        // B1 = G1.add(B1, G1.timesFr(proof.Wxiw, s));
        B1 = G1.add(B1, F);
        B1 = G1.sub(B1, E);

        let B2 = curve.G2.one;

        const paired = await curve.pairingEq(curve.G1.neg(A1), A2, B1, B2);

        return paired;

    }

    fromObjectProof(proof, curve) {
        let res = {};
        res.F = curve.G1.fromObject(proof.F);
        res.H1 = curve.G1.fromObject(proof.H1);
        res.H2 = curve.G1.fromObject(proof.H2);
        res.Z = curve.G1.fromObject(proof.Z);
        res.T = curve.G1.fromObject(proof.T);
        // res.T1 = curve.G1.fromObject(proof.T1);
        // res.T2 = curve.G1.fromObject(proof.T2);
        // res.T3 = curve.G1.fromObject(proof.T3);
        res.Wxi = curve.G1.fromObject(proof.Wxi);
        //res.Wxiw = curve.G1.fromObject(proof.Wxiw);

        res.eval_h1 = curve.Fr.fromObject(proof.eval_h1);
        res.eval_h2 = curve.Fr.fromObject(proof.eval_h2);
        res.eval_f = curve.Fr.fromObject(proof.eval_f);
        res.eval_t = curve.Fr.fromObject(proof.eval_t);
        res.eval_zw = curve.Fr.fromObject(proof.eval_zw);
        res.eval_r = curve.Fr.fromObject(proof.eval_r);

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