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

import {C, MAX_RANGE, DOMAIN_SIZE, CIRCUIT_POWER} from "./range_check_gate.js";
import {BigBuffer} from "ffjavascript";
import {expTau} from "../utils.js";
import Multiset from "../plookup/multiset.js";
import {Keccak256Transcript} from "../Keccak256Transcript.js";
import {Polynomial} from "../polynomial/polynomial.js";
import {Evaluations} from "../polynomial/evaluations.js";
import {Proof} from "../proof.js";
import {mul3} from "../polynomial/mul_z.js";


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
            challenges.b = [];
            for (let i = 0; i < 16; i++) {
                challenges.b[i] = Fr.random();
            }

            const length = Math.max(preInput.t.length, witnesses.length);

            // Prepare query vector
            let f = new Multiset(0, Fr);
            f.fromArray(witnesses);
            f.pad(length, f.lastElement());

            // Prepare table multiset
            let table = new Multiset(0, Fr);
            table.fromArray(preInput.t);
            table.pad(length, table.lastElement());

            //We already have the table vector in t
            //Create s = (f,t) sorted in t
            let s = table.sortedVersion(f);

            let {h1, h2} = s.halvesAlternating();

            buffers.F = f.toBigBuffer();
            buffers.Table = table.toBigBuffer();
            buffers.H1 = h1.toBigBuffer();
            buffers.H2 = h2.toBigBuffer();

            // buffers.F = await Fr.batchToMontgomery(buffers.F);
            // buffers.Table = await Fr.batchToMontgomery(buffers.Table);
            // buffers.H1 = await Fr.batchToMontgomery(buffers.H1);
            // buffers.H2 = await Fr.batchToMontgomery(buffers.H2);

            polynomials.F = await Polynomial.fromBuffer(buffers.F, Fr, logger);
            polynomials.Table = await Polynomial.fromBuffer(buffers.Table, Fr, logger);
            polynomials.H1 = await Polynomial.fromBuffer(buffers.H1, Fr, logger);
            polynomials.H2 = await Polynomial.fromBuffer(buffers.H2, Fr, logger);

            evaluations.F = await Evaluations.fromPolynomial(polynomials.F, Fr, logger);
            evaluations.Table = await Evaluations.fromPolynomial(polynomials.Table, Fr, logger);
            evaluations.H1 = await Evaluations.fromPolynomial(polynomials.H1, Fr, logger);
            evaluations.H2 = await Evaluations.fromPolynomial(polynomials.H2, Fr, logger);

            polynomials.F.blindCoefficients([challenges.b[0], challenges.b[1]]);
            // polynomials.Table.blindCoefficients([challenges.b[2], challenges.b[3]]);
            polynomials.H1.blindCoefficients([challenges.b[2], challenges.b[3], challenges.b[4]]);
            polynomials.H2.blindCoefficients([challenges.b[5], challenges.b[6]]);

            let buffP1 = new BigBuffer(DOMAIN_SIZE * Fr.n8);
            let buffP2 = new BigBuffer(DOMAIN_SIZE * Fr.n8);

            for (let i = 0; i < DOMAIN_SIZE; i++) {
                const i_n8 = i * Fr.n8;
                const h1_i = Fr.add(buffers.H1.slice(i_n8, i_n8 + Fr.n8), challenges.gamma);
                const h2_i = Fr.add(buffers.H2.slice(i_n8, i_n8 + Fr.n8), challenges.gamma);

                const item_p1 = self.getResultPolP(Fr.sub(h2_i, h1_i), Fr);
                buffP1.set(item_p1, i_n8);
            }

            polynomials.P1 = await Polynomial.fromBuffer(buffP1, Fr, logger);
            // polynomials.P2 = await Polynomial.fromBuffer(buffP2, Fr, logger);

            evaluations.P1 = await Evaluations.fromPolynomial(polynomials.P1, Fr, logger);
            // evaluations.P2 = await Evaluations.fromPolynomial(polynomials.P2, Fr, logger);

            // polynomials.P1.blindCoefficients([challenges.b[8], challenges.b[9]]);
            // polynomials.P2.blindCoefficients([]);

            proof.addPolynomial("F", await multiExpPolynomial("F", polynomials.F));
            proof.addPolynomial("Table", await multiExpPolynomial("Table", polynomials.Table));
            proof.addPolynomial("H1", await multiExpPolynomial("H1", polynomials.H1));
            proof.addPolynomial("H2", await multiExpPolynomial("H2", polynomials.H2));
            proof.addPolynomial("P1", await multiExpPolynomial("P1", polynomials.P1));
            // proof.addPolynomial("P2", await multiExpPolynomial("P2", polynomials.P2));
        }

        async function round2() {
            const transcript = new Keccak256Transcript(curve);
            transcript.appendPolCommitment(proof.polynomials.F);
            transcript.appendPolCommitment(proof.polynomials.H1);
            transcript.appendPolCommitment(proof.polynomials.H2);

            challenges.gamma = transcript.getChallenge();
            if (logger) logger.debug("range_check gamma: " + Fr.toString(challenges.gamma));

            buffers.Z = new BigBuffer(DOMAIN_SIZE * Fr.n8);

            let numArr = new BigBuffer(DOMAIN_SIZE * Fr.n8);
            let denArr = new BigBuffer(DOMAIN_SIZE * Fr.n8);
            numArr.set(Fr.one, 0);
            denArr.set(Fr.one, 0);

            for (let i = 0; i < DOMAIN_SIZE; i++) {
                const i_n8 = i * Fr.n8;
                const f_i = Fr.add(buffers.F.slice(i_n8, i_n8 + Fr.n8), challenges.gamma);
                const t_i = Fr.add(buffers.Table.slice(i_n8, i_n8 + Fr.n8), challenges.gamma);
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

            polynomials.Z.blindCoefficients([challenges.b[7], challenges.b[8], challenges.b[9]]);

            proof.addPolynomial("Z", await multiExpPolynomial("Z", polynomials.Z));
        }

        async function round3() {
            const transcript = new Keccak256Transcript(curve);
            transcript.appendPolCommitment(proof.polynomials.Z);

            challenges.alpha = transcript.getChallenge();
            challenges.alpha2 = Fr.mul(challenges.alpha, challenges.alpha);
            challenges.alpha3 = Fr.mul(challenges.alpha2, challenges.alpha);
            challenges.alpha4 = Fr.mul(challenges.alpha3, challenges.alpha);
            challenges.alpha5 = Fr.mul(challenges.alpha4, challenges.alpha);

            if (logger) logger.debug("range_check alpha: " + Fr.toString(challenges.alpha));

            const buffT = new BigBuffer(DOMAIN_SIZE * 4 * Fr.n8);
            const buffTz = new BigBuffer(DOMAIN_SIZE * 4 * Fr.n8);

            //Compute Lagrange polynomial L_1 evaluations
            let buffLagrange1 = new BigBuffer(DOMAIN_SIZE * Fr.n8);
            buffLagrange1.set(Fr.one, 0);
            let polLagrange1 = await Polynomial.fromBuffer(buffLagrange1, Fr, logger);
            let lagrange1 = await Evaluations.fromPolynomial(polLagrange1, Fr, logger);
            if (logger) logger.debug("computing lagrange 1");

            //Compute Lagrange polynomial L_N evaluations
            let buffLagrangeN = new BigBuffer(DOMAIN_SIZE * Fr.n8);
            buffLagrangeN.set(Fr.one, (DOMAIN_SIZE - 1) * Fr.n8);
            let polLagrangeN = await Polynomial.fromBuffer(buffLagrangeN, Fr, logger);
            let lagrangeN = await Evaluations.fromPolynomial(polLagrangeN, Fr, logger);
            if (logger) logger.debug("computing lagrange N");

            let omegaN = Fr.one;
            for (let i = 0; i < DOMAIN_SIZE - 1; i++) {
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
                const zw_i = evaluations.Z.eval.slice(((i + DOMAIN_SIZE * 4 + 4) % (DOMAIN_SIZE * 4)) * Fr.n8, ((i + DOMAIN_SIZE * 4 + 4) % (DOMAIN_SIZE * 4)) * Fr.n8 + Fr.n8);
                const f_i = evaluations.F.eval.slice(i_n8, i_n8 + Fr.n8);
                const lt_i = evaluations.Table.eval.slice(i_n8, i_n8 + Fr.n8);
                const h1_i = evaluations.H1.eval.slice(i_n8, i_n8 + Fr.n8);
                const h1w_i = evaluations.H1.eval.slice(((i + DOMAIN_SIZE * 4 + 4) % (DOMAIN_SIZE * 4)) * Fr.n8, ((i + DOMAIN_SIZE * 4 + 4) % (DOMAIN_SIZE * 4)) * Fr.n8 + Fr.n8);
                const h2_i = evaluations.H2.eval.slice(i_n8, i_n8 + Fr.n8);
                const p1_i = evaluations.P1.eval.slice(i_n8, i_n8 + Fr.n8);
                // const p2_i = evaluations.P2.eval.slice(i_n8, i_n8 + Fr.n8);
                const lagrange1_i = lagrange1.eval.slice(i_n8, i_n8 + Fr.n8);
                const lagrangeN_i = lagrangeN.eval.slice(i_n8, i_n8 + Fr.n8);

                const fp_i = Fr.add(challenges.b[0], Fr.mul(challenges.b[1], omega));
                const tp_i = Fr.zero;
                const h1p_i = Fr.add(Fr.add(challenges.b[2], Fr.mul(challenges.b[3], omega)), Fr.mul(challenges.b[4], omega2));
                const h2p_i = Fr.add(challenges.b[5], Fr.mul(challenges.b[6], omega));
                const p1p_i = Fr.zero;//Fr.add(challenges.b[8], Fr.mul(challenges.b[9], omega));
                const p2p_i = Fr.add(challenges.b[10], Fr.mul(challenges.b[11], omega));
                const zp_i = Fr.add(Fr.add(challenges.b[7], Fr.mul(challenges.b[8], omega)), Fr.mul(challenges.b[9], omega2));
                const zWp_i = Fr.add(Fr.add(challenges.b[7], Fr.mul(challenges.b[8], omegaW)), Fr.mul(challenges.b[9], omegaW2));

                let identityA, identityAz;
                let identityB, identityBz;
                let identityC, identityCz;
                let identityD, identityDz;
                let identityE, identityEz;
                let identityF, identityFz;

                // IDENTITY A) L_1(x)(Z(x)-1) = 0
                identityA = Fr.mul(Fr.sub(z_i, Fr.one), lagrange1_i);
                identityAz = Fr.mul(zp_i, lagrange1_i);

                // IDENTITY B) Z(x)(γ + f(x))(γ + t(x)) = Z(xω)(γ + h1(x))(γ + h2(x))
                const b0z = z_i;
                const b0f = Fr.add(challenges.gamma, f_i);
                const b0t = Fr.add(challenges.gamma, lt_i);
                const [b0, b0p] = mul3(b0z, b0f, b0t, zp_i, fp_i, tp_i, i % 4, Fr);

                const b1zw = zw_i;
                const b1h1 = Fr.add(challenges.gamma, h1_i);
                const b1h2 = Fr.add(challenges.gamma, h2_i);
                const [b1, b1p] = mul3(b1zw, b1h1, b1h2, zWp_i, h1p_i, h2p_i, i % 4, Fr);

                identityB = Fr.sub(b0, b1);
                identityBz = Fr.sub(b0p, b1p);

                // IDENTITY C) L1(x)h1(x) = 0
                identityC = Fr.mul(h1_i, lagrange1_i);
                identityCz = Fr.mul(h1p_i, lagrange1_i);

                // IDENTITY D) Ln(x)h2(x) = c(n − 1)
                identityD = Fr.mul(Fr.sub(h2_i, Fr.e(MAX_RANGE)), lagrangeN_i);
                identityDz = Fr.mul(h2p_i, lagrangeN_i);

                // IDENTITY E) P(h2(x) − h1(x)) = 0
                identityE = p1_i;
                identityEz = p1p_i;

                // IDENTITY F) (x−ω^n)P(h1(xω)−h2(x))=0
                // identityF = Fr.mul(Fr.sub(omega, omegaN), self.getResultPolP(Fr.sub(h1w_i, h2_i), Fr));
                // identityFz = p2p_i;

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
                // identities = Fr.add(identities, identityE);
                // identities = Fr.add(identities, identityF);

                let identitiesZ = identityAz;
                identitiesZ = Fr.add(identitiesZ, identityBz);
                identitiesZ = Fr.add(identitiesZ, identityCz);
                identitiesZ = Fr.add(identitiesZ, identityDz);
                // identitiesZ = Fr.add(identitiesZ, identityEz);
                // identitiesZ = Fr.add(identitiesZ, identityFz);

                buffT.set(identities, i_n8);
                buffTz.set(identitiesZ, i_n8);

                omega = Fr.mul(omega, Fr.w[CIRCUIT_POWER + 2]);
            }

            if (logger) logger.debug("range_check ifft T");
            polynomials.T = await Polynomial.fromBuffer(buffT, Fr, logger);
            polynomials.T = await polynomials.T.divZh();

            if (logger) logger.debug("range_check ifft Tz");
            const polTz = await Polynomial.fromBuffer(buffTz, Fr, logger);

            if (polTz.degree() > (DOMAIN_SIZE * 3 + 5)) {
                throw new Error("range_check Tz Polynomial is not well calculated");
            }

            polynomials.T.add(polTz);

            polynomials.splitT = polynomials.T.split(3, DOMAIN_SIZE, [challenges.b[14], challenges.b[15]]);

            proof.addPolynomial("T1", await multiExpPolynomial("T1", polynomials.splitT[0]));
            proof.addPolynomial("T2", await multiExpPolynomial("T2", polynomials.splitT[1]));
            proof.addPolynomial("T3", await multiExpPolynomial("T3", polynomials.splitT[2]));
        }

        async function round4() {
            // 1. Get evaluation challenge xi ∈ Zp
            const transcript = new Keccak256Transcript(curve);
            transcript.appendPolCommitment(proof.polynomials.T1);
            transcript.appendPolCommitment(proof.polynomials.T2);
            transcript.appendPolCommitment(proof.polynomials.T3);

            challenges.xi = transcript.getChallenge();
            if (logger) logger.debug("Range check prover xi: " + Fr.toString(challenges.xi));

            // 2. Compute & output opening evaluations.js
            proof.addEvaluation("f", polynomials.F.evaluate(challenges.xi));
            proof.addEvaluation("table", polynomials.Table.evaluate(challenges.xi));
            proof.addEvaluation("h1", polynomials.H1.evaluate(challenges.xi));
            // proof.addEvaluation("h2", polynomials.H2.evaluate(challenges.xi));
            // proof.addEvaluation("p1", polynomials.P1.evaluate(Fr.sub(proof.evaluations.h2, proof.evaluations.h1)));
            proof.addEvaluation("zw", polynomials.Z.evaluate(Fr.mul(challenges.xi, Fr.w[CIRCUIT_POWER]), Fr));
            // proof.addEvaluation("h1w", polynomials.H1.evaluate(Fr.mul(challenges.xi, Fr.w[CIRCUIT_POWER]), Fr));
        }

        async function round5() {
            const transcript = new Keccak256Transcript(curve);
            transcript.appendScalar(proof.evaluations.f);
            transcript.appendScalar(proof.evaluations.table);
            transcript.appendScalar(proof.evaluations.h1);
            transcript.appendScalar(proof.evaluations.h2);
            transcript.appendScalar(proof.evaluations.zw);

            // 1. Get opening challenge v ∈ Zp.
            challenges.v = [];
            challenges.v[0] = transcript.getChallenge();
            if (logger) logger.debug("v: " + Fr.toString(challenges.v[0]));

            for (let i = 1; i < 6; i++) {
                challenges.v[i] = Fr.mul(challenges.v[i - 1], challenges.v[0]);
            }

            // 2. Compute linearization polynomial r(x)
            challenges.xim = challenges.xi;
            for (let i = 0; i < CIRCUIT_POWER; i++) {
                challenges.xim = Fr.square(challenges.xim);
            }

            const evalL1 = Fr.div(
                Fr.sub(challenges.xim, Fr.one),
                Fr.mul(Fr.sub(challenges.xi, Fr.one), Fr.e(DOMAIN_SIZE))
            );

            let omegaN = Fr.one;
            for (let i = 1; i < DOMAIN_SIZE; i++) {
                omegaN = Fr.mul(omegaN, Fr.w[CIRCUIT_POWER]);
            }
            const evalLN = Fr.div(
                Fr.mul(omegaN, Fr.sub(challenges.xim, Fr.one)),
                Fr.mul(Fr.sub(challenges.xi, omegaN), Fr.e(DOMAIN_SIZE))
            );

            // Prepare z constant coefficients for identity B
            const b0f = Fr.add(challenges.gamma, proof.evaluations.f);
            const b0t = Fr.add(challenges.gamma, proof.evaluations.table);
            let coefficientsBZ = Fr.mul(b0f, b0t);
            coefficientsBZ = Fr.mul(coefficientsBZ, challenges.alpha);

            // Prepare zw constant coefficients for identity B
            let b1h1 = Fr.add(challenges.gamma, proof.evaluations.h1);
            b1h1 = Fr.mul(b1h1, proof.evaluations.zw);
            let coefficientsBH2 = Fr.mul(b1h1, challenges.alpha);

            let coefficientsR = new BigBuffer((DOMAIN_SIZE + 3) * Fr.n8);
            for (let i = 0; i < DOMAIN_SIZE + 3; i++) {
                const i_n8 = i * Fr.n8;

                let identityAValue, identityBValue, identityCValue, identityDValue;

                //IDENTITY A) L_1(xi)(Z(x)-1) = 0
                identityAValue = Fr.mul(evalL1, polynomials.Z.coef.slice(i_n8, i_n8 + Fr.n8));

                //IDENTITY B) Z(x)(γ + f(x))(γ + t(x)) = Z(gx)(γ + h1(x))(γ + h2(x))
                const identityB0Value = Fr.mul(coefficientsBZ, polynomials.Z.coef.slice(i_n8, i_n8 + Fr.n8));
                const identityB1Value = (i < DOMAIN_SIZE + 2) ? Fr.mul(coefficientsBH2, polynomials.H2.coef.slice(i_n8, i_n8 + Fr.n8)) : Fr.zero;
                identityBValue = Fr.sub(identityB0Value, identityB1Value);

                //IDENTITY C) L1(x)h1(x) = 0
                identityCValue = Fr.mul(evalL1, polynomials.H1.coef.slice(i_n8, i_n8 + Fr.n8));

                if (i < DOMAIN_SIZE + 2) {
                    //IDENTITY D) Ln(xi)h2(x) = c(n − 1)
                    identityDValue = Fr.mul(evalLN, polynomials.H2.coef.slice(i_n8, i_n8 + Fr.n8));
                }

                //IDENTITY E) P(h2(x) − h1(x)) = 0
                // let identityEValue = polynomials.P1.coef.slice(i_n8, i_n8 + Fr.n8);

                //IDENTITY F) (x−gn)P(h1(gx)−h2(x))=0
                // let identityFValue;
                // if (i < DOMAIN_SIZE) {
                //     identityFValue = Fr.sub(challenges.xi, omegaN);
                //     identityFValue = Fr.mul(identityFValue, polynomials.P2.coef.slice(i_n8, i_n8 + Fr.n8));
                // }

                // Apply alpha challenge
                // Alpha on identityBValue was applied when computing coefficientsZ and coefficientsZw
                // This was done to perform the multiplication only one time
                identityCValue = Fr.mul(identityCValue, challenges.alpha2);
                if (i < DOMAIN_SIZE + 2) {
                    identityDValue = Fr.mul(identityDValue, challenges.alpha3);
                }
                // identityEValue = Fr.mul(identityEValue, challenges.alpha4);
                // identityFValue = Fr.mul(identityFValue, challenges.alpha5);

                let identityValues = Fr.zero;
                identityValues = Fr.add(identityValues, identityAValue);
                identityValues = Fr.add(identityValues, identityBValue);

                identityValues = Fr.add(identityValues, identityCValue);

                if (i < DOMAIN_SIZE + 2) {
                    identityValues = Fr.add(identityValues, identityDValue);
                }
                // identityValues = Fr.add(identityValues, identityEValue);
                // identityValues = Fr.add(identityValues, identityFValue);

                coefficientsR.set(identityValues, i_n8);
            }

            polynomials.R = new Polynomial(coefficientsR, Fr, logger);
            // polynomials.R.addScalar(Fr.mul(proof.evaluations.p1, challenges.alpha4));

            const eval_r = polynomials.R.evaluate(challenges.xi);

            polynomials.splitT[2].mulScalar(Fr.square(challenges.xim));
            polynomials.splitT[1].mulScalar(challenges.xim);

            let polWxi = new Polynomial(polynomials.splitT[2].coef.slice(), Fr, logger);
            polWxi.add(polynomials.splitT[1]);
            polWxi.add(polynomials.splitT[0]);

            polWxi.add(polynomials.R, challenges.v[0]);
            polWxi.add(polynomials.F, challenges.v[1]);
            polWxi.add(polynomials.Table, challenges.v[2]);
            polWxi.add(polynomials.H1, challenges.v[3]);
            // polWxi.add(polynomials.P1, challenges.v[4]);
            // polWxi.add(polynomials.H2, challenges.v[5]);

            const evaluation_t = polynomials.T.evaluate(challenges.xi);

            polWxi.subScalar(evaluation_t);
            polWxi.subScalar(Fr.mul(challenges.v[0], eval_r));
            polWxi.subScalar(Fr.mul(challenges.v[1], proof.evaluations.f));
            polWxi.subScalar(Fr.mul(challenges.v[2], proof.evaluations.table));
            polWxi.subScalar(Fr.mul(challenges.v[3], proof.evaluations.h1));
            // polWxi.subScalar(Fr.mul(challenges.v[4], proof.evaluations.p1));
            // polWxi.subScalar(Fr.mul(challenges.v[5], proof.evaluations.h2));

            polWxi.divByXValue(challenges.xi);

            // Compute opening proof polynomial W_{xp}
            // let polWxip = new Polynomial(polynomials.P1.coef.slice(), Fr, logger);
            // polWxip.subScalar(proof.evaluations.p1);
            // polWxip.divByXValue(Fr.sub(proof.evaluations.h2, proof.evaluations.h1));

            // Compute opening proof polynomial W_{xiω}
            let polWxiw = new Polynomial(polynomials.Z.coef.slice(), Fr, logger);
            // polWxi.add(polynomials.H1);

            polWxiw.subScalar(proof.evaluations.zw);
            // polWxiw.subScalar(Fr.mul(Fr.one, proof.evaluations.h1w));

            polWxiw.divByXValue(Fr.mul(challenges.xi, Fr.w[CIRCUIT_POWER]));

            proof.addEvaluation("r", eval_r);

            // Commit polynomials W_xi and W_{xiω}
            proof.addPolynomial("Wxi", await multiExpPolynomial("Wxi", polWxi));
            proof.addPolynomial("Wxiw", await multiExpPolynomial("Wxiw", polWxiw));
            // proof.addPolynomial("Wxip", await multiExpPolynomial("Wxip", polWxip));
        }

        async function multiExpPolynomial(key, polynomial) {
            return await expTau(polynomial.coef, PTau, curve, logger, `proof: multiexp ${key}`);
        }

    }

    getResultPolP(x, Fr) {
        let res = Fr.one;

        for (let i = 0; i <= C; i++) {
            res = Fr.mul(res, Fr.sub(x, Fr.e(i)));
        }
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

export default RangeCheckProver;