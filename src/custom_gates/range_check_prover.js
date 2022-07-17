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
import {to4T, expTau, evalPol, getP4, divPol1} from "../utils.js";
import {Keccak256Transcript} from "../Keccak256Transcript.js";
import {C, MAX_RANGE, DOMAIN_SIZE, CIRCUIT_POWER, RANGE_CHECK_ID} from "./range_check_gate.js";


class RangeCheckProver {
    async computeProof(preInput, witnesses, curve, logger, PTau) {
        const self = this;
        const Fr = curve.Fr;

        let proof = {id: RANGE_CHECK_ID};

        let bufferF, polF, F_4;
        let bufferTable, polTable, Table_4;
        let bufferH1, polH1, H1_4;
        let bufferH2, polH2, H2_4;
        let polP1, P1_4;
        let polP2, P2_4;

        let bufferZ, polZ, Z_4;
        let polT;
        let polR;

        let challenges = {};

        await round1(); // Build polynomials h1(x) & h2(x)
        await round2(); // Build polynomial Z
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

            bufferF = f.toBigBuffer();
            bufferTable = table.toBigBuffer();
            bufferH1 = h1.toBigBuffer();
            bufferH2 = h2.toBigBuffer();

            // bufferF = await Fr.batchToMontgomery(bufferF);
            // bufferTable = await Fr.batchToMontgomery(bufferTable);
            // bufferH1 = await Fr.batchToMontgomery(bufferH1);
            // bufferH2 = await Fr.batchToMontgomery(bufferH2);

            [polF, F_4] = await to4T(bufferF, []/*[challenges.b[1], challenges.b[0]]*/, Fr);
            [polTable, Table_4] = await to4T(bufferTable, []/*[challenges.b[1], challenges.b[0]]*/, Fr);
            [polH1, H1_4] = await to4T(bufferH1, []/*[challenges.b[4], challenges.b[3], challenges.b[2]]*/, Fr);
            [polH2, H2_4] = await to4T(bufferH2, []/*[challenges.b[7], challenges.b[6], challenges.b[5]]*/, Fr);

            proof.F = await expTau(polF, PTau, curve, logger, "range_check multiexp f(x)");
            //TODO remove next line
            proof.Table = await expTau(polTable, PTau, curve, logger, "range_check multiexp h1(x)");
            proof.H1 = await expTau(polH1, PTau, curve, logger, "range_check multiexp h1(x)");
            proof.H2 = await expTau(polH2, PTau, curve, logger, "range_check multiexp h2(x)");

            let bufferP1 = new BigBuffer(bufferH1.byteLength);
            let bufferP2 = new BigBuffer(bufferH1.byteLength);
            for (let i = 0; i < h1.vec.length; i++) {
                const item_h1w = h1.getElementAt((i + 1) % h1.vec.length);
                const item_h1 = h1.getElementAt(i);
                const item_h2 = h2.getElementAt(i);

                const item_p1 = self.getResultPolP(Fr.sub(item_h2, item_h1), Fr);
                bufferP1.set(item_p1, i * Fr.n8);

                const item_p2 = self.getResultPolP(Fr.sub(item_h1w, item_h2), Fr);
                bufferP2.set(item_p2, i * Fr.n8);
            }

            [polP1, P1_4] = await to4T(bufferP1, []/*[challenges.b[7], challenges.b[6], challenges.b[5]]*/, Fr);
            [polP2, P2_4] = await to4T(bufferP1, []/*[challenges.b[7], challenges.b[6], challenges.b[5]]*/, Fr);

            proof.P1 = await expTau(polP1, PTau, curve, logger, "range_check multiexp P(x)");
            proof.P2 = await expTau(polP2, PTau, curve, logger, "range_check multiexp P(x)");
        }

        async function round2() {
            const transcript = new Keccak256Transcript(curve);
            transcript.appendPolCommitment(proof.F);
            transcript.appendPolCommitment(proof.H1);
            transcript.appendPolCommitment(proof.H2);

            challenges.gamma = transcript.getChallenge();
            if (logger) logger.debug("range_check gamma: " + Fr.toString(challenges.gamma));

            bufferZ = new BigBuffer(DOMAIN_SIZE * Fr.n8);
            let numArr = new BigBuffer(DOMAIN_SIZE * Fr.n8);
            let denArr = new BigBuffer(DOMAIN_SIZE * Fr.n8);
            numArr.set(Fr.one, 0);
            denArr.set(Fr.one, 0);

            for (let i = 0; i < DOMAIN_SIZE; i++) {
                const i_n8 = i * Fr.n8;
                const f_i = Fr.add(bufferF.slice(i_n8, i_n8 + Fr.n8), challenges.gamma);
                const t_i = Fr.add(bufferTable.slice(i_n8, i_n8 + Fr.n8), challenges.gamma);
                const h1_i = Fr.add(bufferH1.slice(i_n8, i_n8 + Fr.n8), challenges.gamma);
                const h2_i = Fr.add(bufferH2.slice(i_n8, i_n8 + Fr.n8), challenges.gamma);

                const num = Fr.mul(f_i, t_i);
                const den = Fr.mul(h1_i, h2_i);

                numArr.set(Fr.mul(numArr.slice(i_n8, i_n8 + Fr.n8), num), ((i + 1) % DOMAIN_SIZE) * Fr.n8);
                denArr.set(Fr.mul(denArr.slice(i_n8, i_n8 + Fr.n8), den), ((i + 1) % DOMAIN_SIZE) * Fr.n8);
            }

            denArr = await Fr.batchInverse(denArr);
            for (let i = 0; i < DOMAIN_SIZE; i++) {
                const i_n8 = i * Fr.n8;

                bufferZ.set(Fr.mul(numArr.slice(i_n8, i_n8 + Fr.n8), denArr.slice(i_n8, i_n8 + Fr.n8)), i_n8);
            }

            if (!Fr.eq(bufferZ.slice(0, Fr.n8), Fr.one)) {
                throw new Error("range_check Z polynomial error");
            }

            [polZ, Z_4] = await to4T(bufferZ, []/*[challenges.b[10], challenges.b[9], challenges.b[8]]*/, Fr);

            proof.Z = await expTau(polZ, PTau, curve, logger, "range_check multiexp Z(x)");
        }

        async function round3() {
            const transcript = new Keccak256Transcript(curve);
            transcript.appendPolCommitment(proof.Z);

            challenges.alpha = transcript.getChallenge();
            challenges.alpha2 = Fr.mul(challenges.alpha, challenges.alpha);
            challenges.alpha3 = Fr.mul(challenges.alpha2, challenges.alpha);
            challenges.alpha4 = Fr.mul(challenges.alpha3, challenges.alpha);
            challenges.alpha5 = Fr.mul(challenges.alpha4, challenges.alpha);

            if (logger) logger.debug("range_check alpha: " + Fr.toString(challenges.alpha));

            const bufferT = new BigBuffer(DOMAIN_SIZE * 4 * Fr.n8);
            const bufferTz = new BigBuffer(DOMAIN_SIZE * 4 * Fr.n8);

            //Compute Lagrange polynomial L_1 evaluations ()
            let lagrange1Buffer = new BigBuffer(DOMAIN_SIZE * Fr.n8);
            lagrange1Buffer.set(Fr.one, 0);
            let {Q4: lagrange1} = (await getP4(lagrange1Buffer, DOMAIN_SIZE, Fr));
            if (logger) logger.debug("computing lagrange 1");

            //Compute Lagrange polynomial L_N evaluations ()
            let lagrangeNBuffer = new BigBuffer(DOMAIN_SIZE * Fr.n8);
            lagrangeNBuffer.set(Fr.one, (DOMAIN_SIZE - 1) * Fr.n8);
            let {Q4: lagrangeN} = (await getP4(lagrangeNBuffer, DOMAIN_SIZE, Fr));
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
                const z_i = Z_4.slice(i_n8, i_n8 + Fr.n8);
                const zw_i = Z_4.slice(((i + DOMAIN_SIZE * 4 + 4) % (DOMAIN_SIZE * 4)) * Fr.n8, ((i + DOMAIN_SIZE * 4 + 4) % (DOMAIN_SIZE * 4)) * Fr.n8 + Fr.n8);
                const f_i = F_4.slice(i_n8, i_n8 + Fr.n8);
                const lt_i = Table_4.slice(i_n8, i_n8 + Fr.n8);
                const h1_i = H1_4.slice(i_n8, i_n8 + Fr.n8);
                const h2_i = H2_4.slice(i_n8, i_n8 + Fr.n8);
                const p1_i = P1_4.slice(i_n8, i_n8 + Fr.n8);
                const p2_i = P2_4.slice(i_n8, i_n8 + Fr.n8);

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

                bufferT.set(identities, i_n8);
                bufferTz.set(identitiesZ, i_n8);

                omega = Fr.mul(omega, Fr.w[CIRCUIT_POWER + 2]);
            }

            if (logger) logger.debug("range_check ifft T");
            let polTifft = await Fr.ifft(bufferT);

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
            const polTzifft = await Fr.ifft(bufferTz);
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

            polT = polTifft.slice(0, (DOMAIN_SIZE * 3 + 6) * Fr.n8);

            proof.T = await expTau(polT, PTau, curve, logger, "range_check multiexp T");
            // proof.T1 = await expTau(t.slice(0, DOMAIN_SIZE * Fr.n8), PTau, curve, logger, "range_check multiexp T");
            // proof.T2 = await expTau(t.slice(DOMAIN_SIZE * Fr.n8, DOMAIN_SIZE * Fr.n8 * 2), PTau, curve, logger, "range_check multiexp T");
            // proof.T3 = await expTau(t.slice(DOMAIN_SIZE * Fr.n8 * 2, (DOMAIN_SIZE * 3 + 6) * Fr.n8), PTau, curve, logger, "range_check multiexp T");
        }

        async function round4() {
            // 1. Get evaluation challenge xi ∈ Zp
            const transcript = new Keccak256Transcript(curve);
            transcript.appendPolCommitment(proof.T);
            // transcript.appendPolCommitment(proof.T1);
            // transcript.appendPolCommitment(proof.T2);
            // transcript.appendPolCommitment(proof.T3);

            challenges.xi = transcript.getChallenge();
            if (logger) logger.debug("Range check prover xi: " + Fr.toString(challenges.xi));

            // 2. Compute & output opening evaluations
            proof.eval_f = evalPol(polF, challenges.xi, Fr);
            proof.eval_table = evalPol(polTable, challenges.xi, Fr);
            proof.eval_h1 = evalPol(polH1, challenges.xi, Fr);
            proof.eval_h2 = evalPol(polH2, challenges.xi, Fr);
            proof.eval_t = evalPol(polT, challenges.xi, Fr);
            proof.eval_zw = evalPol(polZ, Fr.mul(challenges.xi, Fr.w[CIRCUIT_POWER]), Fr);
        }

        async function round5() {
            const transcript = new Keccak256Transcript(curve);
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
            const b0f = Fr.add(challenges.gamma, proof.eval_f);
            const b0t = Fr.add(challenges.gamma, proof.eval_table);
            let coefficientsBZ = Fr.mul(b0f, b0t);
            coefficientsBZ = Fr.mul(coefficientsBZ, challenges.alpha);

            // Prepare zw constant coefficients for identity B
            let b1h1 = Fr.add(challenges.gamma, proof.eval_h1);
            b1h1 = Fr.mul(b1h1, proof.eval_zw);
            let coefficientsBH2 = Fr.mul(b1h1, challenges.alpha);

            polR = new BigBuffer(DOMAIN_SIZE * Fr.n8);
            for (let i = 0; i < DOMAIN_SIZE; i++) {
                const i_n8 = i * Fr.n8;

                //IDENTITY A) L_1(xi)(Z(x)-1) = 0
                let identityAValue = Fr.mul(evalL1, polZ.slice(i_n8, i_n8 + Fr.n8));

                //IDENTITY B) Z(x)(γ + f(x))(γ + t(x)) = Z(gx)(γ + h1(x))(γ + h2(x))
                const identityB0Value = Fr.mul(coefficientsBZ, polZ.slice(i_n8, i_n8 + Fr.n8));
                const identityB1Value = Fr.mul(coefficientsBH2, polH2.slice(i_n8, i_n8 + Fr.n8));
                const identityBValue = Fr.sub(identityB0Value, identityB1Value);

                //IDENTITY C) L1(x)h1(x) = 0
                let identityCValue = Fr.mul(evalL1, polH1.slice(i_n8, i_n8 + Fr.n8));

                //IDENTITY D) Ln(xi)h2(x) = c(n − 1)
                let identityDValue = Fr.mul(evalLN, polH2.slice(i_n8, i_n8 + Fr.n8));

                //IDENTITY E) P(h2(x) − h1(x)) = 0
                let identityEValue = polP1.slice(i_n8, i_n8 + Fr.n8);

                //IDENTITY F) (x−gn)P(h1(gx)−h2(x))=0
                let identityFValue = Fr.sub(challenges.xi - omegaN);
                identityFValue = Fr.mul(identityFValue, polP2.slice(i_n8, i_n8 + Fr.n8));

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

                polR.set(identityValues, i_n8);
            }

            proof.eval_r = evalPol(polR, challenges.xi, Fr);

            let polWxi = new BigBuffer((DOMAIN_SIZE + 3) * Fr.n8);

            for (let i = 0; i < DOMAIN_SIZE + 3; i++) {
                const i_n8 = i * Fr.n8;

                let w = Fr.zero;
                w = Fr.add(w, polT.slice(i_n8, i_n8 + Fr.n8));
                if (i < DOMAIN_SIZE) {
                    w = Fr.add(w, Fr.mul(challenges.v[0], polR.slice(i_n8, i_n8 + Fr.n8)));
                    w = Fr.add(w, Fr.mul(challenges.v[1], polF.slice(i_n8, i_n8 + Fr.n8)));
                    w = Fr.add(w, Fr.mul(challenges.v[2], polTable.slice(i_n8, i_n8 + Fr.n8)));
                    w = Fr.add(w, Fr.mul(challenges.v[3], polH1.slice(i_n8, i_n8 + Fr.n8)));
                }

                polWxi.set(w, i_n8);
            }

            let w0 = polWxi.slice(0, Fr.n8);
            w0 = Fr.sub(w0, proof.eval_t);
            w0 = Fr.sub(w0, Fr.mul(challenges.v[0], proof.eval_r));
            w0 = Fr.sub(w0, Fr.mul(challenges.v[1], proof.eval_f));
            w0 = Fr.sub(w0, Fr.mul(challenges.v[2], proof.eval_table));
            w0 = Fr.sub(w0, Fr.mul(challenges.v[3], proof.eval_h1));

            polWxi.set(w0, 0);

            polWxi = divPol1(polWxi, challenges.xi, Fr);

            proof.Wxi = await expTau(polWxi, PTau, curve, logger, "range_check multiexp Wxi");

            let polWxiw = new BigBuffer((DOMAIN_SIZE + 3) * Fr.n8);
            for (let i = 0; i < DOMAIN_SIZE + 3; i++) {
                const i_n8 = i * Fr.n8;
                const w = polZ.slice(i_n8, i_n8 + Fr.n8);

                polWxiw.set(w, i_n8);
            }

            let w1 = polWxiw.slice(0, Fr.n8);
            w1 = Fr.sub(w1, proof.eval_zw);
            polWxiw.set(w1, 0);

            polWxiw = divPol1(polWxiw, Fr.mul(challenges.xi, Fr.w[CIRCUIT_POWER]), Fr);

            proof.Wxiw = await expTau(polWxiw, PTau, curve, logger, "range_check multiexp Wxiw");
        }
    }

    toObjectProof(proof, curve) {
        let res = {};
        res.F = curve.G1.toObject(proof.F);
        //TODO remove folowing line
        res.Table = curve.G1.toObject(proof.Table);
        res.H1 = curve.G1.toObject(proof.H1);
        res.H2 = curve.G1.toObject(proof.H2);
        res.P1 = curve.G1.toObject(proof.P1);
        res.P2 = curve.G1.toObject(proof.P2);
        res.Z = curve.G1.toObject(proof.Z);
        res.T = curve.G1.toObject(proof.T);
        // res.T1 = curve.G1.toObject(proof.T1);
        // res.T2 = curve.G1.toObject(proof.T2);
        // res.T3 = curve.G1.toObject(proof.T3);
        res.Wxi = curve.G1.toObject(proof.Wxi);
        res.Wxiw = curve.G1.toObject(proof.Wxiw);

        res.eval_h1 = curve.Fr.toObject(proof.eval_h1);
        res.eval_h2 = curve.Fr.toObject(proof.eval_h2);
        res.eval_f = curve.Fr.toObject(proof.eval_f);
        res.eval_zw = curve.Fr.toObject(proof.eval_zw);
        res.eval_r = curve.Fr.toObject(proof.eval_r);
        res.eval_table = curve.Fr.toObject(proof.eval_table);

        return res;
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