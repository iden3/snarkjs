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

import Multiset from "../plookup/multiset.js";
import {BigBuffer} from "ffjavascript";
import {expTau, evalPol, getP4, divPol1, computePolynomial} from "../utils.js";
import {Keccak256Transcript} from "../Keccak256Transcript.js";
import {C, MAX_RANGE, DOMAIN_SIZE, CIRCUIT_POWER} from "./range_check_gate.js";
import {Polynomial} from "../polynomial.js";
import {Proof} from "../proof.js";


class RangeCheckProver {
    async computeProof(preInput, witnesses, curve, logger, PTau) {
        const self = this;
        const Fr = curve.Fr;

        let polynomials = {};
        let buffers = {};

        let challenges = {};

        let proof = new Proof(curve, logger);

        await round1(); // Build polynomials h1(x) & h2(x)
        await round2(); // Build polynomial Z

        Object.keys(buffers).forEach(k => delete buffers[k]);

        await round3(); // Build polynomial t(x) that encodes the checks to be performed by the verifier
        await round4(); // Opening evaluations
        await round5(); // Linearization polynomial

        return proof;

        async function round1() {
            challenges.b = [];
            for (let i = 0; i < 11; i++) {
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

            // bufferF = await Fr.batchToMontgomery(bufferF);
            // bufferTable = await Fr.batchToMontgomery(bufferTable);
            // bufferH1 = await Fr.batchToMontgomery(bufferH1);
            // bufferH2 = await Fr.batchToMontgomery(bufferH2);

            polynomials.F = await computePolynomial(buffers.F, []/*[challenges.b[1], challenges.b[0]]*/, Fr);
            polynomials.Table = await computePolynomial(buffers.Table, []/*[challenges.b[1], challenges.b[0]]*/, Fr);
            polynomials.H1 = await computePolynomial(buffers.H1, []/*[challenges.b[4], challenges.b[3], challenges.b[2]]*/, Fr);
            polynomials.H2 = await computePolynomial(buffers.H2, []/*[challenges.b[7], challenges.b[6], challenges.b[5]]*/, Fr);

            let buffP1 = new BigBuffer(buffers.H1.byteLength);
            let buffP2 = new BigBuffer(buffers.H1.byteLength);

            //TODO, potser caldira fer-ho a partir de h1_4 i h2_4
            for (let i = 0; i < h1.vec.length; i++) {
                const item_h1w = h1.getElementAt((i + 1) % h1.vec.length);
                const item_h1 = h1.getElementAt(i);
                const item_h2 = h2.getElementAt(i);

                const item_p1 = self.getResultPolP(Fr.sub(item_h2, item_h1), Fr);
                buffP1.set(item_p1, i * Fr.n8);

                const item_p2 = self.getResultPolP(Fr.sub(item_h1w, item_h2), Fr);
                buffP2.set(item_p2, i * Fr.n8);
            }

            polynomials.P1 = await computePolynomial(buffP1, []/*[challenges.b[7], challenges.b[6], challenges.b[5]]*/, Fr);
            polynomials.P2 = await computePolynomial(buffP1, []/*[challenges.b[7], challenges.b[6], challenges.b[5]]*/, Fr);

            proof.addPolynomial("F", await computepolynomialMultiExp("F", polynomials.F.coef));
            proof.addPolynomial("Table", await computepolynomialMultiExp("Table", polynomials.Table.coef));
            proof.addPolynomial("H1", await computepolynomialMultiExp("H1", polynomials.H1.coef));
            proof.addPolynomial("H2", await computepolynomialMultiExp("H2", polynomials.H2.coef));
            proof.addPolynomial("P1", await computepolynomialMultiExp("P1", polynomials.P1.coef));
            proof.addPolynomial("P2", await computepolynomialMultiExp("P2", polynomials.P2.coef));
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

            polynomials.Z = await computePolynomial(buffers.Z, []/*[challenges.b[10], challenges.b[9], challenges.b[8]]*/, Fr);

            proof.addPolynomial("Z", await computepolynomialMultiExp("Z", polynomials.Z.coef));
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

            //Compute Lagrange polynomial L_1 evaluations ()
            let buffLagrange1 = new BigBuffer(DOMAIN_SIZE * Fr.n8);
            buffLagrange1.set(Fr.one, 0);
            let {Q4: lagrange1} = (await getP4(buffLagrange1, DOMAIN_SIZE, Fr));
            if (logger) logger.debug("computing lagrange 1");

            //Compute Lagrange polynomial L_N evaluations ()
            let buffLagrangeN = new BigBuffer(DOMAIN_SIZE * Fr.n8);
            buffLagrangeN.set(Fr.one, (DOMAIN_SIZE - 1) * Fr.n8);
            let {Q4: lagrangeN} = (await getP4(buffLagrangeN, DOMAIN_SIZE, Fr));
            if (logger) logger.debug("computing lagrange N");

            let omegaN = Fr.one;
            for (let i = 0; i < DOMAIN_SIZE - 1; i++) {
                omegaN = Fr.mul(omegaN, Fr.w[CIRCUIT_POWER + 2]);
            }

            let omega = Fr.one;
            for (let i = 0; i < DOMAIN_SIZE * 4; i++) {
                if ((i % 4096 === 0) && (logger)) logger.debug(`range_check calculating t ${i}/${DOMAIN_SIZE * 4}`);

                const i_n8 = i * Fr.n8;

                //const omega2 = Fr.square(omega);
                const z_i = polynomials.Z.eval.slice(i_n8, i_n8 + Fr.n8);
                const zw_i = polynomials.Z.eval.slice(((i + DOMAIN_SIZE * 4 + 4) % (DOMAIN_SIZE * 4)) * Fr.n8, ((i + DOMAIN_SIZE * 4 + 4) % (DOMAIN_SIZE * 4)) * Fr.n8 + Fr.n8);
                const f_i = polynomials.F.eval.slice(i_n8, i_n8 + Fr.n8);
                const lt_i = polynomials.Table.eval.slice(i_n8, i_n8 + Fr.n8);
                const h1_i = polynomials.H1.eval.slice(i_n8, i_n8 + Fr.n8);
                const h2_i = polynomials.H2.eval.slice(i_n8, i_n8 + Fr.n8);
                const p1_i = polynomials.P1.eval.slice(i_n8, i_n8 + Fr.n8);
                const p2_i = polynomials.P2.eval.slice(i_n8, i_n8 + Fr.n8);

                const zp_i = Fr.zero;//Fr.add(Fr.add(Fr.mul(challenges.b[8], w2), Fr.mul(challenges.b[9], w)), challenges.b[10]);
                const zWp_i = Fr.zero;//Fr.add(Fr.add(Fr.mul(ch.b[7], wW2), Fr.mul(ch.b[8], wW)), ch.b[9]);
                const fp_i = Fr.zero;//Fr.add(Fr.add(Fr.mul(challenges.b[8], w2), Fr.mul(challenges.b[9], w)), challenges.b[10]);
                const tp_i = Fr.zero;//Fr.add(Fr.add(Fr.mul(challenges.b[8], w2), Fr.mul(challenges.b[9], w)), challenges.b[10]);
                const h1p_i = Fr.zero;//Fr.add(ch.b[2], Fr.mul(ch.b[1], w));
                const h2p_i = Fr.zero;//Fr.add(ch.b[4], Fr.mul(ch.b[3], w));
                const p1p_i = Fr.zero;//Fr.add(ch.b[4], Fr.mul(ch.b[3], w));
                const p2p_i = Fr.zero;//Fr.add(ch.b[4], Fr.mul(ch.b[3], w));

                let identityA, identityAz;
                let identityB, identityBz;
                let identityC, identityCz;
                let identityD, identityDz;
                let identityE, identityEz;
                let identityF, identityFz;

                // IDENTITY A) L_1(x)(Z(x)-1) = 0
                identityA = Fr.mul(Fr.sub(z_i, Fr.one), lagrange1.slice(i_n8, i_n8 + Fr.n8));
                identityAz = Fr.mul(zp_i, lagrange1.slice(i_n8, i_n8 + Fr.n8));

                // IDENTITY B) Z(x)(γ + f(x))(γ + t(x)) = Z(xω)(γ + h1(x))(γ + h2(x))
                const b0z = z_i;
                const b0f = Fr.add(challenges.gamma, f_i);
                const b0t = Fr.add(challenges.gamma, lt_i);
                const [b0, b0p] = self.mul3(b0z, b0f, b0t, zp_i, fp_i, tp_i, i % 4, Fr);

                const b1zw = zw_i;
                const b1h1 = Fr.add(challenges.gamma, h1_i);
                const b1h2 = Fr.add(challenges.gamma, h2_i);
                const [b1, b1p] = self.mul3(b1zw, b1h1, b1h2, zWp_i, h1p_i, h2p_i, i % 4, Fr);

                identityB = Fr.sub(b0, b1);
                identityBz = Fr.sub(b0p, b1p);

                // IDENTITY C) L1(x)h1(x) = 0
                identityC = Fr.mul(h1_i, lagrange1.slice(i_n8, i_n8 + Fr.n8));
                identityCz = Fr.mul(h1p_i, lagrange1.slice(i_n8, i_n8 + Fr.n8));

                // IDENTITY D) Ln(x)h2(x) = c(n − 1)
                identityD = Fr.mul(Fr.sub(h2_i, Fr.e(MAX_RANGE)), lagrangeN.slice(i_n8, i_n8 + Fr.n8));
                identityDz = Fr.mul(h2p_i, lagrangeN.slice(i_n8, i_n8 + Fr.n8));
                // identityDz = Fr.sub(identityDz, Fr.e(MAX_RANGE));

                // IDENTITY E) P(h2(x) − h1(x)) = 0
                identityE = p1_i;
                identityEz = p1p_i;

                // IDENTITY F) (x−ω^n)P(h1(xω)−h2(x))=0
                identityF = Fr.mul(Fr.sub(omega, omegaN), p2_i);
                identityFz = Fr.mul(Fr.sub(omega, omegaN), p2p_i);

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

                buffT.set(identities, i_n8);
                buffTz.set(identitiesZ, i_n8);

                omega = Fr.mul(omega, Fr.w[CIRCUIT_POWER + 2]);
            }

            if (logger) logger.debug("range_check ifft T");
            let polTifft = await Fr.ifft(buffT);

            if (logger) logger.debug("dividing T/Z_H");
            for (let i = 0; i < DOMAIN_SIZE; i++) {
                const i_n8 = i * Fr.n8;
                polTifft.set(Fr.neg(polTifft.slice(i_n8, i_n8 + Fr.n8)), i_n8);
            }

            for (let i = DOMAIN_SIZE; i < DOMAIN_SIZE * 4; i++) {
                const i_n8 = i * Fr.n8;

                const a = Fr.sub(
                    polTifft.slice((i - DOMAIN_SIZE) * Fr.n8, (i - DOMAIN_SIZE) * Fr.n8 + Fr.n8),
                    polTifft.slice(i_n8, i_n8 + Fr.n8)
                );
                polTifft.set(a, i_n8);
                if (i > (DOMAIN_SIZE * 3 - 4)) {
                    if (!Fr.isZero(a)) {
                        throw new Error("range_check T Polynomial is not divisible");
                    }
                }
            }

            // Add Zh polygon...to document
            if (logger) logger.debug("range_check ifft Tz");
            const polTzifft = await Fr.ifft(buffTz);
            for (let i = 0; i < DOMAIN_SIZE * 4; i++) {
                const i_n8 = i * Fr.n8;

                const a = polTzifft.slice(i_n8, i_n8 + Fr.n8);
                if (i > (DOMAIN_SIZE * 3 + 5)) {
                    if (!Fr.isZero(a)) {
                        throw new Error("range_check Tz Polynomial is not well calculated");
                    }
                } else {
                    polTifft.set(Fr.add(polTifft.slice(i_n8, i_n8 + Fr.n8), a), i_n8);
                }
            }

            polynomials.T = new Polynomial([], [], Fr);
            polynomials.T.coef = polTifft.slice(0, (DOMAIN_SIZE * 3 + 6) * Fr.n8);

            proof.addPolynomial("T", await computepolynomialMultiExp("T", polynomials.T.coef));
            // proof.T = await expTau(polynomials.T.coef, PTau, curve, logger, "range_check multiexp T");
            // proof.T1 = await expTau(t.slice(0, DOMAIN_SIZE * Fr.n8), PTau, curve, logger, "range_check multiexp T");
            // proof.T2 = await expTau(t.slice(DOMAIN_SIZE * Fr.n8, DOMAIN_SIZE * Fr.n8 * 2), PTau, curve, logger, "range_check multiexp T");
            // proof.T3 = await expTau(t.slice(DOMAIN_SIZE * Fr.n8 * 2, (DOMAIN_SIZE * 3 + 6) * Fr.n8), PTau, curve, logger, "range_check multiexp T");
        }

        async function round4() {
            // 1. Get evaluation challenge xi ∈ Zp
            const transcript = new Keccak256Transcript(curve);
            transcript.appendPolCommitment(proof.polynomials.T);
            // transcript.appendPolCommitment(proof.T1);
            // transcript.appendPolCommitment(proof.T2);
            // transcript.appendPolCommitment(proof.T3);

            challenges.xi = transcript.getChallenge();
            if (logger) logger.debug("Range check prover xi: " + Fr.toString(challenges.xi));

            // 2. Compute & output opening evaluations
            proof.addEvaluation("f", evalPol(polynomials.F.coef, challenges.xi, Fr));
            proof.addEvaluation("table", evalPol(polynomials.Table.coef, challenges.xi, Fr));
            proof.addEvaluation("h1", evalPol(polynomials.H1.coef, challenges.xi, Fr));
            proof.addEvaluation("h2", evalPol(polynomials.H2.coef, challenges.xi, Fr));
            proof.addEvaluation("t", evalPol(polynomials.T.coef, challenges.xi, Fr));
            proof.addEvaluation("zw", evalPol(polynomials.Z.coef, Fr.mul(challenges.xi, Fr.w[CIRCUIT_POWER]), Fr));
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

            for (let i = 1; i < 4; i++) {
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
            for (let i = 0; i < DOMAIN_SIZE - 1; i++) {
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

            polynomials.R = new Polynomial([], [], Fr);
            polynomials.R.coef = new BigBuffer(DOMAIN_SIZE * Fr.n8);
            for (let i = 0; i < DOMAIN_SIZE; i++) {
                const i_n8 = i * Fr.n8;

                //IDENTITY A) L_1(xi)(Z(x)-1) = 0
                let identityAValue = Fr.mul(evalL1, polynomials.Z.coef.slice(i_n8, i_n8 + Fr.n8));

                //IDENTITY B) Z(x)(γ + f(x))(γ + t(x)) = Z(gx)(γ + h1(x))(γ + h2(x))
                const identityB0Value = Fr.mul(coefficientsBZ, polynomials.Z.coef.slice(i_n8, i_n8 + Fr.n8));
                const identityB1Value = Fr.mul(coefficientsBH2, polynomials.H2.coef.slice(i_n8, i_n8 + Fr.n8));
                const identityBValue = Fr.sub(identityB0Value, identityB1Value);

                //IDENTITY C) L1(x)h1(x) = 0
                let identityCValue = Fr.mul(evalL1, polynomials.H1.coef.slice(i_n8, i_n8 + Fr.n8));

                //IDENTITY D) Ln(xi)h2(x) = c(n − 1)
                let identityDValue = Fr.mul(evalLN, polynomials.H2.coef.slice(i_n8, i_n8 + Fr.n8));

                //IDENTITY E) P(h2(x) − h1(x)) = 0
                let identityEValue = polynomials.P1.coef.slice(i_n8, i_n8 + Fr.n8);

                //IDENTITY F) (x−gn)P(h1(gx)−h2(x))=0
                let identityFValue = Fr.sub(challenges.xi - omegaN);
                identityFValue = Fr.mul(identityFValue, polynomials.P2.coef.slice(i_n8, i_n8 + Fr.n8));

                //Apply alpha challenge
                // Alpha on identityBValue was applied when computing coefficientsZ and coefficientsZw
                // This was done to perform the multiplication only one time
                identityCValue = Fr.mul(identityCValue, challenges.alpha2);
                identityDValue = Fr.mul(identityDValue, challenges.alpha3);
                identityEValue = Fr.mul(identityEValue, challenges.alpha4);
                identityFValue = Fr.mul(identityFValue, challenges.alpha5);

                let identityValues = identityAValue;
                identityValues = Fr.add(identityValues, identityBValue);
                identityValues = Fr.add(identityValues, identityCValue);
                identityValues = Fr.add(identityValues, identityDValue);
                identityValues = Fr.add(identityValues, identityEValue);
                identityValues = Fr.add(identityValues, identityFValue);

                polynomials.R.coef.set(identityValues, i_n8);
            }

            proof.addEvaluation("r", evalPol(polynomials.R.coef, challenges.xi, Fr));

            let polWxi = new BigBuffer((DOMAIN_SIZE + 3) * Fr.n8);

            for (let i = 0; i < DOMAIN_SIZE + 3; i++) {
                const i_n8 = i * Fr.n8;

                let w = Fr.zero;
                w = Fr.add(w, polynomials.T.coef.slice(i_n8, i_n8 + Fr.n8));
                if (i < DOMAIN_SIZE) {
                    w = Fr.add(w, Fr.mul(challenges.v[0], polynomials.R.coef.slice(i_n8, i_n8 + Fr.n8)));
                    w = Fr.add(w, Fr.mul(challenges.v[1], polynomials.F.coef.slice(i_n8, i_n8 + Fr.n8)));
                    w = Fr.add(w, Fr.mul(challenges.v[2], polynomials.Table.coef.slice(i_n8, i_n8 + Fr.n8)));
                    w = Fr.add(w, Fr.mul(challenges.v[3], polynomials.H1.coef.slice(i_n8, i_n8 + Fr.n8)));
                }

                polWxi.set(w, i_n8);
            }

            let w0 = polWxi.slice(0, Fr.n8);
            w0 = Fr.sub(w0, proof.evaluations.t);
            w0 = Fr.sub(w0, Fr.mul(challenges.v[0], proof.evaluations.r));
            w0 = Fr.sub(w0, Fr.mul(challenges.v[1], proof.evaluations.f));
            w0 = Fr.sub(w0, Fr.mul(challenges.v[2], proof.evaluations.table));
            w0 = Fr.sub(w0, Fr.mul(challenges.v[3], proof.evaluations.h1));

            polWxi.set(w0, 0);

            polWxi = divPol1(polWxi, challenges.xi, Fr);

            proof.addPolynomial("Wxi", await computepolynomialMultiExp("Wxi", polWxi));

            let polWxiw = new BigBuffer((DOMAIN_SIZE + 3) * Fr.n8);
            for (let i = 0; i < DOMAIN_SIZE + 3; i++) {
                const i_n8 = i * Fr.n8;
                const w = polynomials.Z.coef.slice(i_n8, i_n8 + Fr.n8);

                polWxiw.set(w, i_n8);
            }

            let w1 = polWxiw.slice(0, Fr.n8);
            w1 = Fr.sub(w1, proof.evaluations.zw);
            polWxiw.set(w1, 0);

            polWxiw = divPol1(polWxiw, Fr.mul(challenges.xi, Fr.w[CIRCUIT_POWER]), Fr);

            proof.addPolynomial("Wxiw", await computepolynomialMultiExp("Wxiw", polWxiw));
        }

        async function computepolynomialMultiExp(key, polynomial) {
            return await expTau(polynomial, PTau, curve, logger, `proof: multiexp ${key}`);
        }

    }

    mul2(a, b, ap, bp, p, Fr) {
        const Z1 = [
            Fr.zero,
            Fr.add(Fr.e(-1), Fr.w[2]),
            Fr.e(-2),
            Fr.sub(Fr.e(-1), Fr.w[2]),
        ];

        let r, rz;


        const a_b = Fr.mul(a, b);
        const a_bp = Fr.mul(a, bp);
        const ap_b = Fr.mul(ap, b);
        const ap_bp = Fr.mul(ap, bp);

        r = a_b;

        let a0 = Fr.add(a_bp, ap_b);

        let a1 = ap_bp;

        rz = a0;
        if (p) {
            rz = Fr.add(rz, Fr.mul(Z1[p], a1));
        }

        return [r, rz];
    }

    mul3(a, b, c, ap, bp, cp, p, Fr) {
        const Z1 = [
            Fr.zero,
            Fr.add(Fr.e(-1), Fr.w[2]),
            Fr.e(-2),
            Fr.sub(Fr.e(-1), Fr.w[2]),
        ];

        const Z2 = [
            Fr.zero,
            Fr.add(Fr.zero, Fr.mul(Fr.e(-2), Fr.w[2])),
            Fr.e(4),
            Fr.sub(Fr.zero, Fr.mul(Fr.e(-2), Fr.w[2])),
        ];

        let r, rz;

        const a_b = Fr.mul(a, b);
        const a_bp = Fr.mul(a, bp);
        const ap_b = Fr.mul(ap, b);
        const ap_bp = Fr.mul(ap, bp);

        r = Fr.mul(a_b, c);

        let a0 = Fr.mul(ap_b, c);
        a0 = Fr.add(a0, Fr.mul(a_bp, c));
        a0 = Fr.add(a0, Fr.mul(a_b, cp));

        let a1 = Fr.mul(ap_bp, c);
        a1 = Fr.add(a1, Fr.mul(a_bp, cp));
        a1 = Fr.add(a1, Fr.mul(ap_b, cp));

        let a2 = Fr.mul(ap_bp, cp);

        rz = a0;
        if (p) {
            rz = Fr.add(rz, Fr.mul(Z1[p], a1));
            rz = Fr.add(rz, Fr.mul(Z2[p], a2));
        }

        return [r, rz];
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