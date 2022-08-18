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

import {MAX_RANGE, DOMAIN_SIZE, CIRCUIT_POWER, C} from "./range_check_gate.js";
import {BigBuffer} from "ffjavascript";
import {expTau} from "../utils.js";
import Multiset from "../plookup/multiset.js";
import {Keccak256Transcript} from "../Keccak256Transcript.js";
import {Polynomial} from "../polynomial/polynomial.js";
import {Evaluations} from "../polynomial/evaluations.js";
import {Proof} from "../proof.js";
import {mul2, mul3} from "../polynomial/mul_z.js";


class RangeCheckProver {
    async computeProof(preInput, witnesses, curve, logger, PTau) {
        const self = this;
        const Fr = curve.Fr;

        let polynomials = {};
        let evaluations = {};
        let buffers = {};

        let challenges = {};

        let proof = new Proof(curve, logger);

        await round1(); // Build polynomials h1(x) & h2(x)
        await round2(); // Build polynomial Z

        Object.keys(buffers).forEach(k => delete buffers[k]);

        await round3(); // Build polynomial t(x) that encodes the checks to be performed by the verifier
        await round4(); // Opening evaluations.js
        await round5(); // Linearization polynomial

        return proof;

        async function round1() {
            // 1. Generate random blinding scalars b_1, b_2, ..., b_{(c-2) + 11} ∈ F.
            challenges.b = [];
            for (let i = 0; i < (C - 2) + 11; i++) {
                challenges.b[i] = Fr.random();
            }

            const length = Math.max(preInput.t.length, witnesses.length);

            // 2. Compute the query polynomial f(X) ∈ F_{<n}[X] and the lookup polynomial t(X) ∈ F_{<n}[X]:
            let f = new Multiset(0, Fr);
            f.fromArray(witnesses);
            f.pad(length, f.lastElement());

            let t = new Multiset(0, Fr);
            t.fromArray(preInput.t);
            t.pad(length, t.lastElement());

            // 3. Let s ∈ F^{2n} be the vector that is (f, t) sorted by t.
            let s = t.sortedVersion(f);

            // We represent s by the vectors h_1, h_2 ∈ F^n
            let {h1, h2} = s.halvesAlternating();

            buffers.F = f.toBigBuffer();
            buffers.lookupTable = t.toBigBuffer();
            buffers.H1 = h1.toBigBuffer();
            buffers.H2 = h2.toBigBuffer();

            // buffers.F = await Fr.batchToMontgomery(buffers.F);
            // buffers.lookupTable = await Fr.batchToMontgomery(buffers.lookupTable);
            // buffers.H1 = await Fr.batchToMontgomery(buffers.H1);
            // buffers.H2 = await Fr.batchToMontgomery(buffers.H2);

            polynomials.F = await Polynomial.fromBuffer(buffers.F, Fr, logger);
            polynomials.LookupTable = await Polynomial.fromBuffer(buffers.lookupTable, Fr, logger);
            polynomials.H1 = await Polynomial.fromBuffer(buffers.H1, Fr, logger);
            polynomials.H2 = await Polynomial.fromBuffer(buffers.H2, Fr, logger);

            evaluations.F = await Evaluations.fromPolynomial(polynomials.F, Fr, logger);
            evaluations.lookupTable = await Evaluations.fromPolynomial(polynomials.LookupTable, Fr, logger);
            evaluations.H1 = await Evaluations.fromPolynomial(polynomials.H1, Fr, logger);
            evaluations.H2 = await Evaluations.fromPolynomial(polynomials.H2, Fr, logger);

            // blind f(X) adding (b_1X+b_2)Z_H(X), becomes F_{<n+2}[X]
            polynomials.F.blindCoefficients([challenges.b[0], challenges.b[1]]);
            // blind h_1(X) adding (b_3X^2+b_4X+b_5)Z_H(X), becomes F_{<n+3}[X]
            polynomials.H1.blindCoefficients([challenges.b[2], challenges.b[3], challenges.b[4]]);
            // blind h_2(X) adding (b_6X+b_7)Z_H(X), becomes F_{<n+2}[X]
            polynomials.H2.blindCoefficients([challenges.b[5], challenges.b[6]]);

            if (polynomials.F.degree() >= DOMAIN_SIZE + 2) {
                throw new Error("range_check: F Polynomial is not well calculated");
            }
            if (polynomials.LookupTable.degree() >= DOMAIN_SIZE) {
                throw new Error("range_check: LookupTable Polynomial is not well calculated");
            }
            if (polynomials.H1.degree() >= DOMAIN_SIZE + 3) {
                throw new Error("range_check: H1 Polynomial is not well calculated");
            }
            if (polynomials.H2.degree() >= DOMAIN_SIZE + 2) {
                throw new Error("range_check: H2 Polynomial is not well calculated");
            }

            // 5. The first output of the prover is ([f(x)]_1, [h_1(x)]_1, [h_2(x)]_1)
            // TODO remove lookup table from the proof and use it from the verification key
            proof.addPolynomial("F", await multiExpPolynomial("F", polynomials.F));
            proof.addPolynomial("LookupTable", await multiExpPolynomial("LookupTable", polynomials.LookupTable));
            proof.addPolynomial("H1", await multiExpPolynomial("H1", polynomials.H1));
            proof.addPolynomial("H2", await multiExpPolynomial("H2", polynomials.H2));
        }

        async function round2() {
            // 1. Compute the permutation challenge gamma ∈ F_p:
            const transcript = new Keccak256Transcript(curve);
            transcript.appendPolCommitment(proof.polynomials.F);
            transcript.appendPolCommitment(proof.polynomials.H1);
            transcript.appendPolCommitment(proof.polynomials.H2);

            challenges.gamma = transcript.getChallenge();
            if (logger) logger.debug("range_check gamma: " + Fr.toString(challenges.gamma));

            // 2. Compute the permutation polynomial z(X) ∈ F_{<n}[X]
            buffers.Z = new BigBuffer(DOMAIN_SIZE * Fr.n8);

            let numArr = new BigBuffer(DOMAIN_SIZE * Fr.n8);
            let denArr = new BigBuffer(DOMAIN_SIZE * Fr.n8);
            numArr.set(Fr.one, 0);
            denArr.set(Fr.one, 0);

            for (let i = 0; i < DOMAIN_SIZE; i++) {
                const i_n8 = i * Fr.n8;
                const f_i = Fr.add(buffers.F.slice(i_n8, i_n8 + Fr.n8), challenges.gamma);
                const t_i = Fr.add(buffers.lookupTable.slice(i_n8, i_n8 + Fr.n8), challenges.gamma);
                const h1_i = Fr.add(buffers.H1.slice(i_n8, i_n8 + Fr.n8), challenges.gamma);
                const h2_i = Fr.add(buffers.H2.slice(i_n8, i_n8 + Fr.n8), challenges.gamma);

                const num = Fr.mul(f_i, t_i);
                const den = Fr.mul(h1_i, h2_i);

                numArr.set(Fr.mul(numArr.slice(i_n8, i_n8 + Fr.n8), num), ((i + 1) % DOMAIN_SIZE) * Fr.n8);
                denArr.set(Fr.mul(denArr.slice(i_n8, i_n8 + Fr.n8), den), ((i + 1) % DOMAIN_SIZE) * Fr.n8);
            }

            denArr = await Fr.batchInverse(denArr);
            for (let i = 0; i < DOMAIN_SIZE; i++) {
                const i_n8 = i * Fr.n8;

                buffers.Z.set(Fr.mul(numArr.slice(i_n8, i_n8 + Fr.n8), denArr.slice(i_n8, i_n8 + Fr.n8)), i_n8);
            }

            if (!Fr.eq(buffers.Z.slice(0, Fr.n8), Fr.one)) {
                throw new Error("range_check Z polynomial error");
            }

            polynomials.Z = await Polynomial.fromBuffer(buffers.Z, Fr, logger);
            evaluations.Z = await Evaluations.fromPolynomial(polynomials.Z, Fr, logger);

            // blind z(X) adding (b_8X^2+b_9X+b_10)Z_H(X), becomes F_{<n+3}[X]
            polynomials.Z.blindCoefficients([challenges.b[7], challenges.b[8], challenges.b[9]]);

            if (polynomials.Z.degree() >= DOMAIN_SIZE + 3) {
                throw new Error("range_check: Z Polynomial is not well calculated");
            }

            // 3. The second output of the prover is ([z(x)]_1)
            proof.addPolynomial("Z", await multiExpPolynomial("Z", polynomials.Z));
        }

        async function round3() {
            // 1. Compute the quotient challenge alpha ∈ F_p
            const transcript = new Keccak256Transcript(curve);
            transcript.appendPolCommitment(proof.polynomials.Z);

            challenges.alpha = transcript.getChallenge();
            challenges.alpha2 = Fr.mul(challenges.alpha, challenges.alpha);
            challenges.alpha3 = Fr.mul(challenges.alpha2, challenges.alpha);
            challenges.alpha4 = Fr.mul(challenges.alpha3, challenges.alpha);
            challenges.alpha5 = Fr.mul(challenges.alpha4, challenges.alpha);

            if (logger) logger.debug("range_check alpha: " + Fr.toString(challenges.alpha));

            // 2. Compute the quotient polynomial q(X) ∈ F[X]
            const buffQ = new BigBuffer(DOMAIN_SIZE * 4 * Fr.n8);
            const buffQz = new BigBuffer(DOMAIN_SIZE * 4 * Fr.n8);

            // Compute Lagrange polynomial L_1 evaluations
            let buffLagrange1 = new BigBuffer(DOMAIN_SIZE * Fr.n8);
            buffLagrange1.set(Fr.one, 0);
            if (logger) logger.debug("computing lagrange 1");
            let polLagrange1 = await Polynomial.fromBuffer(buffLagrange1, Fr, logger);
            let lagrange1 = await Evaluations.fromPolynomial(polLagrange1, Fr, logger);

            // Compute Lagrange polynomial L_N evaluations
            let buffLagrangeN = new BigBuffer(DOMAIN_SIZE * Fr.n8);
            buffLagrangeN.set(Fr.one, (DOMAIN_SIZE - 1) * Fr.n8);
            if (logger) logger.debug("computing lagrange N");
            let polLagrangeN = await Polynomial.fromBuffer(buffLagrangeN, Fr, logger);
            let lagrangeN = await Evaluations.fromPolynomial(polLagrangeN, Fr, logger);

            if (logger) logger.debug("computing omega^n");
            let omegaN = Fr.one;
            for (let i = 1; i < DOMAIN_SIZE; i++) {
                omegaN = Fr.mul(omegaN, Fr.w[CIRCUIT_POWER]);
            }

            let omega = Fr.one;
            for (let i = 0; i < DOMAIN_SIZE * 4; i++) {
                if ((i % 4096 === 0) && (logger)) logger.debug(`range_check calculating t ${i}/${DOMAIN_SIZE * 4}`);

                const i_n8 = i * Fr.n8;
                const omega2 = Fr.square(omega);
                const omegaW = Fr.mul(omega, Fr.w[CIRCUIT_POWER]);
                const omegaW2 = Fr.square(omegaW);

                const z_i = evaluations.Z.eval.slice(i_n8, i_n8 + Fr.n8);
                const z_wi = evaluations.Z.eval.slice(((i + DOMAIN_SIZE * 4 + 4) % (DOMAIN_SIZE * 4)) * Fr.n8, ((i + DOMAIN_SIZE * 4 + 4) % (DOMAIN_SIZE * 4)) * Fr.n8 + Fr.n8);
                const f_i = evaluations.F.eval.slice(i_n8, i_n8 + Fr.n8);
                const lt_i = evaluations.lookupTable.eval.slice(i_n8, i_n8 + Fr.n8);
                const h1_i = evaluations.H1.eval.slice(i_n8, i_n8 + Fr.n8);
                const h1_wi = evaluations.H1.eval.slice(((i + DOMAIN_SIZE * 4 + 4) % (DOMAIN_SIZE * 4)) * Fr.n8, ((i + DOMAIN_SIZE * 4 + 4) % (DOMAIN_SIZE * 4)) * Fr.n8 + Fr.n8);
                const h2_i = evaluations.H2.eval.slice(i_n8, i_n8 + Fr.n8);
                const lagrange1_i = lagrange1.eval.slice(i_n8, i_n8 + Fr.n8);
                const lagrangeN_i = lagrangeN.eval.slice(i_n8, i_n8 + Fr.n8);

                const fp_i = Fr.add(challenges.b[0], Fr.mul(challenges.b[1], omega));
                const tp_i = Fr.zero;
                const h1p_i = Fr.add(Fr.add(challenges.b[2], Fr.mul(challenges.b[3], omega)), Fr.mul(challenges.b[4], omega2));
                const h1Wp_i = Fr.add(Fr.add(challenges.b[2], Fr.mul(challenges.b[3], omegaW)), Fr.mul(challenges.b[4], omegaW2));
                const h2p_i = Fr.add(challenges.b[5], Fr.mul(challenges.b[6], omega));
                const zp_i = Fr.add(Fr.add(challenges.b[7], Fr.mul(challenges.b[8], omega)), Fr.mul(challenges.b[9], omega2));
                const zWp_i = Fr.add(Fr.add(challenges.b[7], Fr.mul(challenges.b[8], omegaW)), Fr.mul(challenges.b[9], omegaW2));

                // IDENTITY A) Z(x)(γ + f(x))(γ + t(x)) = Z(xω)(γ + h1(x))(γ + h2(x))
                const a0z = z_i;
                const a0f = Fr.add(challenges.gamma, f_i);
                const a0t = Fr.add(challenges.gamma, lt_i);
                const [a0, a0p] = mul3(a0z, a0f, a0t, zp_i, fp_i, tp_i, i % 4, Fr);

                const a1zw = z_wi;
                const a1h1 = Fr.add(challenges.gamma, h1_i);
                const a1h2 = Fr.add(challenges.gamma, h2_i);
                const [a1, a1p] = mul3(a1zw, a1h1, a1h2, zWp_i, h1p_i, h2p_i, i % 4, Fr);

                let identityA = Fr.sub(a0, a1);
                let identityAz = Fr.sub(a0p, a1p);

                // IDENTITY B) L_1(x)(Z(x)-1) = 0
                let identityB = Fr.mul(Fr.sub(z_i, Fr.one), lagrange1_i);
                let identityBz = Fr.mul(zp_i, lagrange1_i);

                // IDENTITY C) L1(x)h1(x) = 0
                let identityC = Fr.mul(h1_i, lagrange1_i);
                let identityCz = Fr.mul(h1p_i, lagrange1_i);

                // IDENTITY D) Ln(x)h2(x) = c(n − 1)
                let identityD = Fr.mul(Fr.sub(h2_i, Fr.e(MAX_RANGE)), lagrangeN_i);
                let identityDz = Fr.mul(h2p_i, lagrangeN_i);

                // IDENTITY E) P(h2(x) − h1(x)) = 0
                let [identityE, identityEz] = self.getResultPolP(Fr.sub(h2_i, h1_i), Fr.sub(h2p_i, h1p_i), i % 4, Fr);

                // IDENTITY F) (x−ω^n)P(h1(xω)−h2(x))=0
                const identityF0 = Fr.sub(omega, omegaN);
                // const identityF1 = self.getResultPolP(Fr.sub(h1_wi, h2_i), Fr);
                const [identityF1, identityF1z] = self.getResultPolP(Fr.sub(h1_wi, h2_i), Fr.sub(h1Wp_i, h2p_i), i % 4, Fr);
                let identityF = Fr.mul(identityF0, identityF1);
                let identityFz = Fr.mul(identityF0, identityF1z);

                //Apply alpha random factor
                identityB = Fr.mul(identityB, challenges.alpha);
                identityC = Fr.mul(identityC, challenges.alpha2);
                identityD = Fr.mul(identityD, challenges.alpha3);
                identityE = Fr.mul(identityE, challenges.alpha4);
                identityF = Fr.mul(identityF, challenges.alpha5);

                identityBz = Fr.mul(identityBz, challenges.alpha);
                identityCz = Fr.mul(identityCz, challenges.alpha2);
                identityDz = Fr.mul(identityDz, challenges.alpha3);
                identityEz = Fr.mul(identityEz, challenges.alpha4);
                identityFz = Fr.mul(identityFz, challenges.alpha5);

                let identities = identityA;
                identities = Fr.add(identities, identityB);
                identities = Fr.add(identities, identityC);
                identities = Fr.add(identities, identityD);
                identities = Fr.add(identities, identityE);
                identities = Fr.add(identities, identityF);

                let identitiesZ = identityAz;
                identitiesZ = Fr.add(identitiesZ, identityBz);
                identitiesZ = Fr.add(identitiesZ, identityCz);
                identitiesZ = Fr.add(identitiesZ, identityDz);
                identitiesZ = Fr.add(identitiesZ, identityEz);
                identitiesZ = Fr.add(identitiesZ, identityFz);

                buffQ.set(identities, i_n8);
                buffQz.set(identitiesZ, i_n8);

                omega = Fr.mul(omega, Fr.w[CIRCUIT_POWER + 2]);
            }

            if (logger) logger.debug("range_check ifft Q");
            polynomials.Q = await Polynomial.fromBuffer(buffQ, Fr, logger);
            polynomials.Q = await polynomials.Q.divZh();

            if (logger) logger.debug("range_check ifft Tz");
            const polTz = await Polynomial.fromBuffer(buffQz, Fr, logger);

            polynomials.Q.add(polTz);

            if (polynomials.Q.degree() > C * (DOMAIN_SIZE + 2) + 3) {
                throw new Error("range_check T Polynomial is not well calculated");
            }

            // 3. Split q(X) into c-1 polynomials  q_1'(X), ..., q_{c-1}'(X)
            // of degree lower than n+3 and another polynomial q'_c(X) of degree at most n+4
            polynomials.splitQ = polynomials.Q.split(2, DOMAIN_SIZE + 3, [challenges.b[10]]);

            // 4. The third output of the prover is ([q_1(x)]_1, ..., [q_{c-1}(x)]_1, [q_c(x)]_1)
            proof.addPolynomial("Q1", await multiExpPolynomial("Q1", polynomials.splitQ[0]));
            proof.addPolynomial("Q2", await multiExpPolynomial("Q2", polynomials.splitQ[1]));
        }

        async function round4() {
            // 1. Compute the evaluation challenge xi ∈ F_p
            const transcript = new Keccak256Transcript(curve);
            transcript.appendPolCommitment(proof.polynomials.Q1);
            transcript.appendPolCommitment(proof.polynomials.Q2);

            challenges.xi = transcript.getChallenge();
            if (logger) logger.debug("Range check prover xi: " + Fr.toString(challenges.xi));

            // 2. Compute the opening evaluations
            proof.addEvaluation("f", polynomials.F.evaluate(challenges.xi));
            proof.addEvaluation("lookupTable", polynomials.LookupTable.evaluate(challenges.xi));
            proof.addEvaluation("h1", polynomials.H1.evaluate(challenges.xi));
            proof.addEvaluation("h2", polynomials.H2.evaluate(challenges.xi));

            const xiw = Fr.mul(challenges.xi, Fr.w[CIRCUIT_POWER]);
            proof.addEvaluation("zw", polynomials.Z.evaluate(xiw, Fr));
            proof.addEvaluation("h1w", polynomials.H1.evaluate(xiw, Fr));
            // The fourth output of the prover is (f(xi), t(xi), h_1(xi), h_2(xi), z(xiω), h_1(xiω))
        }

        async function round5() {
            // 1. Compute the opening challenges v, vp ∈ F_p
            const transcript = new Keccak256Transcript(curve);
            transcript.appendScalar(proof.evaluations.f);
            transcript.appendScalar(proof.evaluations.lookupTable);
            transcript.appendScalar(proof.evaluations.h1);
            transcript.appendScalar(proof.evaluations.h2);
            transcript.appendScalar(proof.evaluations.zw);
            transcript.appendScalar(proof.evaluations.h1w);

            challenges.v = [];
            challenges.v[0] = transcript.getChallenge();
            if (logger) logger.debug("v: " + Fr.toString(challenges.v[0]));

            for (let i = 1; i < 5; i++) {
                challenges.v[i] = Fr.mul(challenges.v[i - 1], challenges.v[0]);
            }

            transcript.reset();
            transcript.appendScalar(challenges.v[0]);
            challenges.vp = transcript.getChallenge();

            // 2. Compute the linearisation polynomial r(x) ∈ F_{<n+5}[X]
            challenges.xin = challenges.xi;
            for (let i = 0; i < CIRCUIT_POWER; i++) {
                challenges.xin = Fr.square(challenges.xin);
            }

            const evalL1 = Fr.div(
                Fr.sub(challenges.xin, Fr.one),
                Fr.mul(Fr.sub(challenges.xi, Fr.one), Fr.e(DOMAIN_SIZE))
            );

            let omegaN = Fr.one;
            for (let i = 1; i < DOMAIN_SIZE; i++) {
                omegaN = Fr.mul(omegaN, Fr.w[CIRCUIT_POWER]);
            }

            // Prepare z constant coefficients for identity B
            const a0f = Fr.add(challenges.gamma, proof.evaluations.f);
            const a0t = Fr.add(challenges.gamma, proof.evaluations.lookupTable);
            const coefficientsAZ = Fr.mul(a0f, a0t);

            let coefficientsR = new BigBuffer((DOMAIN_SIZE + 3) * Fr.n8);
            // NOTE: DOMAIN_SIZE + 3 === number of coefficients of polynomial Z which is the only  polynomial involved in R(X)
            for (let i = 0; i < DOMAIN_SIZE + 3; i++) {
                const i_n8 = i * Fr.n8;

                let identityAValue, identityBValue;

                //IDENTITY A) z(X)(γ + f(xi))(γ + t(xi))
                identityAValue = Fr.mul(coefficientsAZ, polynomials.Z.coef.slice(i_n8, i_n8 + Fr.n8));

                //IDENTITY B) αL_1(xi)z(x)
                identityBValue = Fr.mul(evalL1, polynomials.Z.coef.slice(i_n8, i_n8 + Fr.n8));
                identityBValue = Fr.mul(identityBValue, challenges.alpha);

                let identityValues = Fr.add(identityAValue, identityBValue);

                coefficientsR.set(identityValues, i_n8);
            }

            polynomials.R = new Polynomial(coefficientsR, Fr, logger);

            if (polynomials.R.degree() >= DOMAIN_SIZE + 5) {
                throw new Error("range_check R Polynomial is not well calculated");
            }

            const eval_r = polynomials.R.evaluate(challenges.xi);

            // Compute xi^{n+3} to add to the split polynomial
            let xinAdd3 = challenges.xin;
            for (let i = 0; i < 3; i++) {
                xinAdd3 = Fr.mul(xinAdd3, challenges.xi);
            }

            polynomials.splitQ[1].mulScalar(xinAdd3);

            // 3.1 Compute the opening proof polynomials W_xi(X) ∈ F_{<n+4}[X]
            polynomials.Wxi = new Polynomial(polynomials.splitQ[1].coef.slice(), Fr, logger);
            polynomials.Wxi.add(polynomials.splitQ[0]);

            polynomials.Wxi.add(polynomials.R, challenges.v[0]);
            polynomials.Wxi.add(polynomials.F, challenges.v[1]);
            polynomials.Wxi.add(polynomials.LookupTable, challenges.v[2]);
            polynomials.Wxi.add(polynomials.H1, challenges.v[3]);
            polynomials.Wxi.add(polynomials.H2, challenges.v[4]);

            const evaluation_q = polynomials.Q.evaluate(challenges.xi);

            polynomials.Wxi.subScalar(evaluation_q);
            polynomials.Wxi.subScalar(Fr.mul(challenges.v[0], eval_r));
            polynomials.Wxi.subScalar(Fr.mul(challenges.v[1], proof.evaluations.f));
            polynomials.Wxi.subScalar(Fr.mul(challenges.v[2], proof.evaluations.lookupTable));
            polynomials.Wxi.subScalar(Fr.mul(challenges.v[3], proof.evaluations.h1));
            polynomials.Wxi.subScalar(Fr.mul(challenges.v[4], proof.evaluations.h2));

            polynomials.Wxi.divByXValue(challenges.xi);

            if (polynomials.Wxi.degree() >= DOMAIN_SIZE + 4) {
                throw new Error("range_check Wxi Polynomial is not well calculated");
            }

            // 3.2 Compute the opening proof polynomials W_xiω(X) ∈ F_{<n+2}[X]
            polynomials.Wxiw = new Polynomial(polynomials.Z.coef.slice(), Fr, logger);
            polynomials.Wxiw.add(polynomials.H1, challenges.vp);

            polynomials.Wxiw.subScalar(proof.evaluations.zw);
            polynomials.Wxiw.subScalar(Fr.mul(challenges.vp, proof.evaluations.h1w));

            polynomials.Wxiw.divByXValue(Fr.mul(challenges.xi, Fr.w[CIRCUIT_POWER]));

            proof.addEvaluation("r", eval_r);

            if (polynomials.Wxiw.degree() >= DOMAIN_SIZE + 2) {
                throw new Error("range_check Wxiw Polynomial is not well calculated");
            }

            // 4. The fifth output of the prover is ([W_xi(x)]_1, [W_xiω(x)]_1)
            proof.addPolynomial("Wxi", await multiExpPolynomial("Wxi", polynomials.Wxi));
            proof.addPolynomial("Wxiw", await multiExpPolynomial("Wxiw", polynomials.Wxiw));
        }

        async function multiExpPolynomial(key, polynomial) {
            return await expTau(polynomial.coef, PTau, curve, logger, `proof: multiexp ${key}`);
        }

    }

    getResultPolP(val, valp, p, Fr) {
        let res = val;
        let resp = valp;

        for (let i = 1; i <= C; i++) {
            [res, resp] = mul2(res, Fr.sub(val, Fr.e(i)), resp, valp, p, Fr);
        }
        return [res, resp];
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

export default RangeCheckProver;