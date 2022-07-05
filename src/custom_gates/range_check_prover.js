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

import {C, MAX_RANGE, N, RANGE_CHECK_ID} from "./range_check_gate.js";
import Multiset from "../plookup/multiset.js";
import {BigBuffer} from "ffjavascript";
import {to4T, expTau, evalPol, getP4, divPol1} from "../utils.js";
import {Keccak256Transcript} from "../Keccak256Transcript.js";

class RangeCheckProver {
    constructor(gate) {
        this.gate = gate;
    }

    async computeProof(preInput, witnesses, curve, logger, PTau) {
        const self = this;
        const Fr = curve.Fr;

        let proof = {id: RANGE_CHECK_ID};

        let bufferF, polF, F_4;
        let bufferH1, polH1, H1_4;
        let bufferH2, polH2, H2_4;
        let bufferT;
        let bufferZ, polZ, Z_4;
        let polT;
        let polR;

        //Add randomness...
        let challenges = {};

        await round1(); //Build polynomials h1(x) & h2(x)
        await round2(); //Build polynomial Z
        await round3(); //Build polynomial t(x) that encodes the checks to be performed by the verifier
        await round4(); //Opening evaluations
        await round5(); //Linearization polynomial

        return proof;

        async function round1() {
            challenges.b = [];
            for (let i = 0; i < 11; i++) {
                challenges.b[i] = curve.Fr.random();
            }

            const length = Math.max(preInput.t.length, witnesses.length);

            //Compute the query vector
            let f = new Multiset(0, Fr);
            f.fromArray(witnesses);
            f.pad(length, f.lastElement());

            let t = new Multiset(0, Fr);
            t.fromArray(preInput.t);
            t.pad(length, t.lastElement());

            //We already have the table vector in t
            //Create s = (f,t) sorted in t
            let s = t.sortedVersion(f);

            let {h1, h2} = s.halvesAlternating();

            bufferF = f.toBigBuffer();
            bufferT = t.toBigBuffer();
            bufferH1 = h1.toBigBuffer();
            bufferH2 = h2.toBigBuffer();

            // bufferF = await Fr.batchToMontgomery(bufferF);
            // bufferT = await Fr.batchToMontgomery(bufferT);
            // bufferH1 = await Fr.batchToMontgomery(bufferH1);
            // bufferH2 = await Fr.batchToMontgomery(bufferH2);

            [polF, F_4] = await to4T(bufferF, []/*[challenges.b[1], challenges.b[0]]*/, Fr);
            [polH1, H1_4] = await to4T(bufferH1, []/*[challenges.b[4], challenges.b[3], challenges.b[2]]*/, Fr);
            [polH2, H2_4] = await to4T(bufferH2, []/*[challenges.b[7], challenges.b[6], challenges.b[5]]*/, Fr);

            proof.F = await expTau(polF, PTau, curve, logger, "range_check multiexp f(x)");
            proof.H1 = await expTau(polH1, PTau, curve, logger, "range_check multiexp h1(x)");
            proof.H2 = await expTau(polH2, PTau, curve, logger, "range_check multiexp h2(x)");
        }

        async function round2() {
            const transcript = new Keccak256Transcript(curve);
            transcript.appendPolCommitment(proof.F);
            transcript.appendPolCommitment(proof.H1);
            transcript.appendPolCommitment(proof.H2);

            challenges.gamma = transcript.getChallenge();
            if (logger) logger.debug("range_check gamma: " + Fr.toString(challenges.gamma));

            bufferZ = new BigBuffer(N * Fr.n8);

            let currentZ = Fr.one;
            bufferZ.set(currentZ, 0);

            for (let i = 0; i < (N - 1); i++) {
                const i_n8 = i * Fr.n8;
                let f_i = bufferF.slice(i_n8, i_n8 + Fr.n8);
                let t_i = bufferT.slice(i_n8, i_n8 + Fr.n8);
                let h1_i = bufferH1.slice(i_n8, i_n8 + Fr.n8);
                let h2_i = bufferH2.slice(i_n8, i_n8 + Fr.n8);

                let num = Fr.mul(Fr.add(challenges.gamma, f_i), Fr.add(challenges.gamma, t_i));
                let den = Fr.mul(Fr.add(challenges.gamma, h1_i), Fr.add(challenges.gamma, h2_i));
                let div = Fr.div(num, den);
                currentZ = Fr.mul(currentZ, div);

                bufferZ.set(currentZ, i_n8 + Fr.n8);
            }

            [polZ, Z_4] = await to4T(bufferZ, []/*[challenges.b[10], challenges.b[9], challenges.b[8]]*/, Fr);

            proof.Z = await expTau(polZ, PTau, curve, logger, "range_check multiexp Z(x)");
        }

        async function round3() {
            const transcript = new Keccak256Transcript(curve);
            transcript.appendPolCommitment(proof.Z);

            challenges.alpha = transcript.getChallenge();
            if (logger) logger.debug("range_check alpha: " + Fr.toString(challenges.alpha));

            const bufferT = new BigBuffer(N * 4 * Fr.n8);
            const bufferTz = new BigBuffer(N * 4 * Fr.n8);

            //Compute Lagrange polynomial L_1 evaluations ()
            let lagrange1Buffer = new BigBuffer(N * Fr.n8);
            lagrange1Buffer.set(Fr.one, 0);
            let {Q4: lagrange1} = (await getP4(lagrange1Buffer, N, Fr));
            if (logger) logger.debug("computing lagrange 1");

            //Compute Lagrange polynomial L_N evaluations ()
            let lagrangeNBuffer = new BigBuffer(N * Fr.n8);
            lagrangeNBuffer.set(Fr.one, (N - 1) * Fr.n8);
            let {Q4: lagrangeN} = (await getP4(lagrangeNBuffer, N, Fr));
            if (logger) logger.debug("computing lagrange N");

            //let omega = Fr.one;
            for (let i = 0; i < N * 4; i++) {
                if ((i % 4096 === 0) && (logger)) logger.debug(`range_check calculating t ${i}/${N * 4}`);

                const i_n8 = i * Fr.n8;

                //const omega2 = Fr.square(omega);
                const z = Z_4.slice(i_n8, i_n8 + Fr.n8);
                const h1 = H1_4.slice(i_n8, i_n8 + Fr.n8);
                const h2 = H2_4.slice(i_n8, i_n8 + Fr.n8);

                const zp = Fr.zero;//Fr.add(Fr.add(Fr.mul(challenges.b[8], w2), Fr.mul(challenges.b[9], w)), challenges.b[10]);
                const h1p = Fr.zero;//Fr.add(ch.b[2], Fr.mul(ch.b[1], w));
                const h2p = Fr.zero;//Fr.add(ch.b[4], Fr.mul(ch.b[3], w));

                let identityA, identityAz;
                let identityB, identityBz;
                let identityC, identityCz;
                let identityD, identityDz;
                let identityE, identityEz;
                let identityF, identityFz;

                // IDENTITY A) L_1(x)(Z(x)-1) = 0
                identityA = Fr.mul(Fr.sub(z, Fr.one), lagrange1.slice(i_n8, i_n8 + Fr.n8));
                identityAz = Fr.mul(zp, lagrange1.slice(i_n8, i_n8 + Fr.n8));

                // IDENTITY B) Z(x)(γ + f(x))(γ + t(x)) = Z(xω)(γ + h1(x))(γ + h2(x))
                identityB = Fr.zero;
                identityBz = Fr.zero;

                // IDENTITY C) L1(x)h1(x) = 0
                identityC = Fr.mul(h1, lagrange1.slice(i_n8, i_n8 + Fr.n8));
                identityCz = Fr.mul(h1p, lagrange1.slice(i_n8, i_n8 + Fr.n8));

                // IDENTITY D) Ln(x)h2(x) = c(n − 1)
                identityD = Fr.mul(Fr.sub(h2, Fr.e(MAX_RANGE)), lagrangeN.slice(i_n8, i_n8 + Fr.n8));
                identityDz = Fr.mul(h2p, lagrangeN.slice(i_n8, i_n8 + Fr.n8));
                // identityDz = Fr.sub(identityDz, Fr.e(MAX_RANGE));

                // IDENTITY E) P(h2(x) − h1(x)) = 0
                // identityE = self.getResultPolP(Fr.sub(h2, h1), Fr);
                // identityEz = self.getResultPolP(Fr.sub(h2p, h1p), Fr);

                // IDENTITY F) (x−ω^n)P(h1(xω)−h2(x))=0
                identityF = Fr.zero;
                identityFz = Fr.zero;


                //Apply alpha random factor
                identityA = Fr.mul(identityA, Fr.square(challenges.alpha));
                identityAz = Fr.mul(identityAz, Fr.square(challenges.alpha));
                // identityB = Fr.mul(identityA, Fr.square(challenges.alpha));
                // identityBz = Fr.mul(identityAz, Fr.square(challenges.alpha));
                // identityC = Fr.mul(identityC, Fr.square(challenges.alpha));
                // identityCz = Fr.mul(identityCz, Fr.square(challenges.alpha));
                // identityD = Fr.mul(identityA, Fr.square(challenges.alpha));
                // identityDz = Fr.mul(identityAz, Fr.square(challenges.alpha));
                // identityE = Fr.mul(identityC, Fr.square(challenges.alpha));
                // identityEz = Fr.mul(identityCz, Fr.square(challenges.alpha));
                // identityF = Fr.mul(identityA, Fr.square(challenges.alpha));
                // identityFz = Fr.mul(identityAz, Fr.square(challenges.alpha));

                let identities = identityA;
                identities = Fr.add(identities, identityB);
                identities = Fr.add(identities, identityC);
                identities = Fr.add(identities, identityD);
                // identities = Fr.add(identities, identityE);
                identities = Fr.add(identities, identityF);


                let identitiesZ = identityAz;
                identitiesZ = Fr.add(identitiesZ, identityBz);
                identitiesZ = Fr.add(identitiesZ, identityCz);
                identitiesZ = Fr.add(identitiesZ, identityDz);
                // identitiesZ = Fr.add(identitiesZ, identityEz);
                identitiesZ = Fr.add(identitiesZ, identityFz);

                bufferT.set(identities, i_n8);
                bufferTz.set(identitiesZ, i_n8);

                //omega = Fr.mul(omega, Fr.w[self.gate.cirPower]);
            }

            if (logger) logger.debug("range_check ifft T");
            let polTifft = await Fr.ifft(bufferT);

            if (logger) logger.debug("dividing T/Z_H");
            for (let i = 0; i < N; i++) {
                const i_n8 = i * Fr.n8;
                polTifft.set(Fr.neg(polTifft.slice(i_n8, i_n8 + Fr.n8)), i_n8);
            }

            for (let i = N; i < N * 4; i++) {
                const i_n8 = i * Fr.n8;

                const a = Fr.sub(
                    polTifft.slice((i - N) * Fr.n8, (i - N) * Fr.n8 + Fr.n8),
                    polTifft.slice(i_n8, i_n8 + Fr.n8)
                );
                polTifft.set(a, i_n8);
                if (i > (N * 3 - 4)) {
                    if (!Fr.isZero(a)) {
                        throw new Error("range_check T Polynomial is not divisible");
                    }
                }
            }

            if (logger) logger.debug("range_check ifft Tz");
            const polTzifft = await Fr.ifft(bufferTz);
            for (let i = 0; i < N * 4; i++) {
                const i_n8 = i * Fr.n8;

                const a = polTzifft.slice(i_n8, i_n8 + Fr.n8);
                if (i > (N * 3 + 5)) {
                    if (!Fr.isZero(a)) {
                        throw new Error("range_check Tz Polynomial is not well calculated");
                    }
                } else {
                    polTifft.set(Fr.add(polTifft.slice(i_n8, i_n8 + Fr.n8), a), i_n8);
                }
            }

            polT = polTifft.slice(0, (N * 3 + 6) * Fr.n8);

            proof.T = await expTau(polT, PTau, curve, logger, "range_check multiexp T");
            // proof.T1 = await expTau(t.slice(0, N * Fr.n8), PTau, curve, logger, "range_check multiexp T");
            // proof.T2 = await expTau(t.slice(N * Fr.n8, N * Fr.n8 * 2), PTau, curve, logger, "range_check multiexp T");
            // proof.T3 = await expTau(t.slice(N * Fr.n8 * 2, (N * 3 + 6) * Fr.n8), PTau, curve, logger, "range_check multiexp T");
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
            proof.eval_h1 = evalPol(polH1, challenges.xi, Fr);
            proof.eval_h2 = evalPol(polH2, challenges.xi, Fr);
            proof.eval_f = evalPol(polF, challenges.xi, Fr);
            proof.eval_t = evalPol(polT, challenges.xi, Fr);
            proof.eval_zw = evalPol(polZ, Fr.mul(challenges.xi, Fr.w[self.gate.cirPower]), Fr);
        }

        async function round5() {
            // 1. Get opening challenge v ∈ Zp.
            const transcript = new Keccak256Transcript(curve);
            transcript.appendScalar(proof.eval_h1);
            transcript.appendScalar(proof.eval_h2);
            transcript.appendScalar(proof.eval_f);
            transcript.appendScalar(proof.eval_t);
            transcript.appendScalar(proof.eval_zw);

            //challenges.v = [];
            //challenges.v[0] = transcript.getChallenge();
            //if (logger) logger.debug("v: " + Fr.toString(challenges.v[0]));

            //for (let i = 1; i < 6; i++) challenges.v[i] = Fr.mul(challenges.v[i - 1], challenges.v[0]);

            // 2. Compute linearization polynomial r(x)
            challenges.xim = challenges.xi;
            for (let i = 0; i < self.gate.cirPower; i++) {
                challenges.xim = Fr.square(challenges.xim);
            }

            const evalL1 = Fr.div(
                Fr.sub(challenges.xim, Fr.one),
                Fr.mul(Fr.sub(challenges.xi, Fr.one), Fr.e(self.gate.domainSize))
            );

            let omegaN = Fr.one;
            for (let i = 0; i < N-1; i++) {
                omegaN = curve.Fr.mul(omegaN, curve.Fr.w[self.gate.cirPower]);
            }
            const evalLN = Fr.div(
                Fr.mul(omegaN, Fr.sub(challenges.xim, Fr.one)),
                Fr.mul(Fr.e(N), Fr.sub(challenges.xi, omegaN))
            );

            polR = new BigBuffer(N * Fr.n8);

            for (let i = 0; i < N; i++) {
                const i_n8 = i * Fr.n8;

                //IDENTITY A) L_1(xi)(Z(x)-1) = 0
                //let identityAValue = Fr.mul(Fr.mul(evalL1, Fr.square(challenges.alpha)), polZ.slice(i_n8, i_n8 + Fr.n8));
                let identityAValue = Fr.mul(evalL1, polZ.slice(i_n8, i_n8 + Fr.n8));

                //IDENTITY B) Z(x)(γ + f(x))(γ + t(x)) = Z(gx)(γ + h1(x))(γ + h2(x))
                let identityBValue = Fr.zero;

                //IDENTITY C) L1(x)h1(x) = 0
                let identityCValue = Fr.mul(evalL1, polH1.slice(i_n8, i_n8 + Fr.n8));

                //IDENTITY D) Ln(xi)h2(x) = c(n − 1)
                let identityDValue = Fr.mul(evalLN, polH2.slice(i_n8, i_n8 + Fr.n8));

                //IDENTITY E) P(h2(x) − h1(x)) = 0
                let identityEValue = Fr.zero;

                //IDENTITY F) (x−gn)P(h1(gx)−h2(x))=0
                let identityFValue = Fr.zero;

                identityAValue = Fr.mul(identityAValue, Fr.square(challenges.alpha));


                let identityValues = identityAValue;
                identityValues = Fr.add(identityValues, identityBValue);
                identityValues = Fr.add(identityValues, identityCValue);
                identityValues = Fr.add(identityValues, identityDValue);
                identityValues = Fr.add(identityValues, identityEValue);
                identityValues = Fr.add(identityValues, identityFValue);

                polR.set(identityValues, i_n8);
            }

            proof.eval_r = evalPol(polR, challenges.xi, Fr);

            let polWxi = new BigBuffer(N * Fr.n8);

            const xi2m = Fr.square(challenges.xim);

            for (let i = 0; i < N; i++) {
                const i_n8 = i * Fr.n8;

                let w = Fr.zero;
                w = Fr.add(w, polT.slice(i_n8, i_n8 + Fr.n8));
                w = Fr.add(w, polR.slice(i_n8, i_n8 + Fr.n8));

                polWxi.set(w, i_n8);
            }

            let w0 = polWxi.slice(0, Fr.n8);
            w0 = Fr.sub(w0, proof.eval_t);
            w0 = Fr.sub(w0, proof.eval_r); //TODO descomentar Fr.mul(challenges.v[0], proof.eval_r));
            polWxi.set(w0, 0);

            polWxi = divPol1(polWxi, challenges.xi, Fr);

            proof.Wxi = await expTau(polWxi, PTau, curve, logger, "range_check multiexp Wxi");

            //W_{xiomega}(x) = (z(x)-eval(z_omega)) / (x-xiomega)
            // let pol_wxiw = new BigBuffer((N) * Fr.n8);
            // for (let i = 0; i < N; i++) {
            //     const i_n8 = i * Fr.n8;
            //
            //     const w = polZ.slice(i_n8, i_n8 + Fr.n8);
            //
            //     pol_wxiw.set(w, i_n8);
            // }
            // w0 = pol_wxiw.slice(0, Fr.n8);
            // w0 = Fr.sub(w0, proof.eval_zw);
            // pol_wxiw.set(w0, 0);
            //
            // pol_wxiw = divPol1(pol_wxiw, Fr.mul(challenges.xi, Fr.w[self.gate.cirPower]), Fr);
            //
            // proof.Wxiw = await expTau(pol_wxiw, PTau, curve, logger, "range_check multiexp Wxiw");
        }
    }

    toObjectProof(proof, curve) {
        let res = {};
        res.F = curve.G1.toObject(proof.F);
        res.H1 = curve.G1.toObject(proof.H1);
        res.H2 = curve.G1.toObject(proof.H2);
        res.Z = curve.G1.toObject(proof.Z);
        res.T = curve.G1.toObject(proof.T);
        // res.T1 = curve.G1.toObject(proof.T1);
        // res.T2 = curve.G1.toObject(proof.T2);
        // res.T3 = curve.G1.toObject(proof.T3);
        res.Wxi = curve.G1.toObject(proof.Wxi);
        //res.Wxiw = curve.G1.toObject(proof.Wxiw);

        res.eval_h1 = curve.Fr.toObject(proof.eval_h1);
        res.eval_h2 = curve.Fr.toObject(proof.eval_h2);
        res.eval_f = curve.Fr.toObject(proof.eval_f);
        res.eval_t = curve.Fr.toObject(proof.eval_t);
        res.eval_zw = curve.Fr.toObject(proof.eval_zw);
        res.eval_r = curve.Fr.toObject(proof.eval_r);

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