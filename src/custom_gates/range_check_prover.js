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

import {N, RANGE_CHECK_ID} from "./range_check_gate.js";
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
        await round3(); //Build polynomial t(x)  that encodes the checks to be performed by the verifier
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

            //TODO uncomment, only for testing purposes
            // bufferF = await Fr.batchToMontgomery(bufferF);
            // bufferT = await Fr.batchToMontgomery(bufferT);
            // bufferH1 = await Fr.batchToMontgomery(bufferH1);
            // bufferH2 = await Fr.batchToMontgomery(bufferH2);

            //TODO uncomment, only for testing purposes
            [polF, F_4] = await to4T(bufferF, [/*challenges.b[1], challenges.b[0]*/], Fr);
            [polH1, H1_4] = await to4T(bufferH1, [/*challenges.b[4], challenges.b[3], challenges.b[2]*/], Fr);
            [polH2, H2_4] = await to4T(bufferH2, [/*challenges.b[7], challenges.b[6], challenges.b[5]*/], Fr);

            proof.F = await expTau(polF, PTau, curve, logger, "range_check multiexp f(x)");
            proof.H1 = await expTau(polH1, PTau, curve, logger, "range_check multiexp h1(x)");
            proof.H2 = await expTau(polH2, PTau, curve, logger, "range_check multiexp h2(x)");
        }

        async function round2() {
            const transcript = new Keccak256Transcript(curve);
            //TODO add "public inputs" of this custom gate
            // for (let i = 0; i < witnesses.length; i++) {
            //     transcript.appendScalar(Fr.e(witnesses[i]));
            // }
            transcript.appendPolCommitment(proof.F);
            transcript.appendPolCommitment(proof.H1);
            transcript.appendPolCommitment(proof.H2);

            challenges.gamma = transcript.getChallenge();
            //TODO uncomment, only for testing purposes
            challenges.gamma = Fr.one;
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

            //TODO must be bufferZ = await Fr.batchToMontgomery(bufferF); ???????

            [polZ, Z_4] = await to4T(bufferZ, [/*challenges.b[10], challenges.b[9], challenges.b[8]*/], Fr);

            proof.Z = await expTau(polZ, PTau, curve, logger, "range_check multiexp Z(x)");
        }

        async function round3() {
            const transcript = new Keccak256Transcript(curve);
            transcript.appendPolCommitment(proof.Z);

            challenges.alpha = transcript.getChallenge();
            if (logger) logger.debug("range_check alpha: " + Fr.toString(challenges.alpha));

            const bufferT = new BigBuffer(N * 4 * Fr.n8);
            const bufferTz = new BigBuffer(N * 4 * Fr.n8);

            let w = Fr.one;
            let w2 = Fr.square(w);

            //Compute Lagrange polynomial L_1 evaluations ()
            let lagrange1Buffer = new BigBuffer(N * Fr.n8);
            lagrange1Buffer.set(Fr.one, 0);
            let {Q4: lagrange1} = (await getP4(lagrange1Buffer, N, Fr));
            if (logger) logger.debug("computing lagrange pols");

            for (let i = 0; i < N * 4; i++) {
                if ((i % 4096 === 0) && (logger)) logger.debug(`range_check calculating t ${i}/${N * 4}`);

                const i_n8 = i * Fr.n8;

                const z = Z_4.slice(i_n8, i_n8 + Fr.n8);
                const zp = Fr.one; //Fr.add(Fr.add(Fr.mul(challenges.b[8], w2), Fr.mul(challenges.b[9], w)), challenges.b[10]);

                //alpha^2*(z(X)-1)
                let e4 = Fr.sub(z, Fr.one);
                e4 = Fr.mul(e4, lagrange1.slice(i_n8, i_n8 + Fr.n8));
                //e4 = Fr.mul(e4, Fr.square(challenges.alpha));

                let e4z = Fr.mul(zp, lagrange1.slice(i_n8, i_n8 + Fr.n8));
                //e4z = Fr.mul(e4z, Fr.square(challenges.alpha));

                bufferT.set(e4, i_n8);
                bufferTz.set(e4z, i_n8);

                //TODO w must be Fr.w[self.gate.cirPower+2] ???
                w = Fr.mul(w, Fr.w[self.gate.cirPower + 2]);
                w2 = Fr.square(w);
            }

            if (logger) logger.debug("range_check ifft T");
            let t = await Fr.ifft(bufferT);

            if (logger) logger.debug("dividing T/Z");
            for (let i = 0; i < N; i++) {
                const i_n8 = i * Fr.n8;
                t.set(Fr.neg(t.slice(i_n8, i_n8 + Fr.n8)), i_n8);
            }

            for (let i = N; i < N * 4; i++) {
                const i_n8 = i * Fr.n8;

                const a = Fr.sub(
                    t.slice((i - N) * Fr.n8, (i - N) * Fr.n8 + Fr.n8),
                    t.slice(i_n8, i_n8 + Fr.n8)
                );
                t.set(a, i_n8);
                if (i > (N * 3 - 4)) {
                    if (!Fr.isZero(a)) {
                        throw new Error("range_check T Polynomial is not divisible");
                    }
                }
            }

            if (logger) logger.debug("range_check ifft Tz");
            const tz = await Fr.ifft(bufferTz);
            for (let i = 0; i < N * 4; i++) {
                const i_n8 = i * Fr.n8;

                const a = tz.slice(i_n8, i_n8 + Fr.n8);
                if (i > (N * 3 + 5)) {
                    if (!Fr.isZero(a)) {
                        throw new Error("range_check Tz Polynomial is not well calculated");
                    }
                } else {
                    t.set(Fr.add(t.slice(i_n8, i_n8 + Fr.n8), a), i_n8);
                }
            }

            polT = t.slice(0, (N * 3 + 6) * Fr.n8);

            proof.T1 = await expTau(t.slice(0, N * Fr.n8), PTau, curve, logger, "range_check multiexp T");
            proof.T2 = await expTau(t.slice(N * Fr.n8, N * Fr.n8 * 2), PTau, curve, logger, "range_check multiexp T");
            proof.T3 = await expTau(t.slice(N * Fr.n8 * 2, (N * 3 + 6) * Fr.n8), PTau, curve, logger, "range_check multiexp T");
        }

        async function round4() {
            const transcript = new Keccak256Transcript(curve);
            transcript.appendPolCommitment(proof.T1);
            transcript.appendPolCommitment(proof.T2);
            transcript.appendPolCommitment(proof.T3);

            challenges.xi = transcript.getChallenge();
            if (logger) logger.debug("range_check xi: " + Fr.toString(challenges.xi));

            proof.eval_h1 = evalPol(polH1, challenges.xi, Fr);
            proof.eval_h2 = evalPol(polH2, challenges.xi, Fr);
            proof.eval_f = evalPol(polF, challenges.xi, Fr);
            proof.eval_t = evalPol(polT, challenges.xi, Fr);
            proof.eval_zw = evalPol(polZ, Fr.mul(challenges.xi, Fr.w[self.gate.cirPower]), Fr);

            challenges.xim = challenges.xi;
            for (let i = 0; i < self.gate.cirPower; i++) {
                challenges.xim = Fr.square(challenges.xim);
            }
            const eval_l1 = Fr.div(
                Fr.sub(challenges.xim, Fr.one),
                Fr.mul(Fr.sub(challenges.xi, Fr.one), Fr.e(self.gate.domainSize))
            );

            //const e4 = Fr.mul(eval_l1, Fr.square(challenges.alpha));
            const e4 = Fr.mul(eval_l1, Fr.one);

            const coefz = e4;

            polR = new BigBuffer((N + 3) * Fr.n8);

            for (let i = 0; i < N + 3; i++) {
                const i_n8 = i * Fr.n8;

                let v = Fr.mul(coefz, polZ.slice(i_n8, i_n8 + Fr.n8));

                polR.set(v, i_n8);
            }

            proof.eval_r = evalPol(polR, challenges.xi, Fr);
        }

        async function round5() {
            const transcript = new Keccak256Transcript(curve);
            transcript.appendScalar(proof.eval_h1);
            transcript.appendScalar(proof.eval_h2);
            transcript.appendScalar(proof.eval_f);
            transcript.appendScalar(proof.eval_t);
            transcript.appendScalar(proof.eval_zw);
            transcript.appendScalar(proof.eval_r);

            //challenges.v = [];
            //challenges.v[0] = transcript.getChallenge();
            //if (logger) logger.debug("v: " + Fr.toString(challenges.v[0]));

            //for (let i = 1; i < 6; i++) challenges.v[i] = Fr.mul(challenges.v[i - 1], challenges.v[0]);

            let pol_wxi = new BigBuffer((N + 6) * Fr.n8);

            const xi2m = Fr.square(challenges.xim);

            for (let i = 0; i < N + 6; i++) {
                const i_n8 = i * Fr.n8;

                let w = Fr.zero;
                w = Fr.mul(xi2m, polT.slice((N * 2 + i) * Fr.n8, (N * 2 + i + 1) * Fr.n8));

                if (i < N + 3) {
                    // w = Fr.add(w, Fr.mul(challenges.v[0], polR.slice(i_n8, i_n8 + Fr.n8)));
                    w = Fr.add(w, polR.slice(i_n8, i_n8 + Fr.n8));
                }

                if (i < N) {
                    w = Fr.add(w, polT.slice(i_n8, i_n8 + Fr.n8));
                    w = Fr.add(w, Fr.mul(challenges.xim, polT.slice((N + i) * Fr.n8, (N + i + 1) * Fr.n8)));
                }

                pol_wxi.set(w, i_n8);
            }

            let w0 = pol_wxi.slice(0, Fr.n8);
            w0 = Fr.sub(w0, proof.eval_t);
            w0 = Fr.sub(w0, proof.eval_r); //TODO descomentar Fr.mul(challenges.v[0], proof.eval_r));
            pol_wxi.set(w0, 0);

            pol_wxi = divPol1(pol_wxi, challenges.xi, Fr);

            proof.Wxi = await expTau(pol_wxi, PTau, curve, logger, "range_check multiexp Wxi");

            //W_{xiomega}(x) = (z(x)-eval(z_omega)) / (x-xiomega)
            let pol_wxiw = new BigBuffer((N) * Fr.n8);
            for (let i = 0; i < N; i++) {
                const i_n8 = i * Fr.n8;

                const w = polZ.slice(i_n8, i_n8 + Fr.n8);

                pol_wxiw.set(w, i_n8);
            }
            w0 = pol_wxiw.slice(0, Fr.n8);
            w0 = Fr.sub(w0, proof.eval_zw);
            pol_wxiw.set(w0, 0);

            pol_wxiw = divPol1(pol_wxiw, Fr.mul(challenges.xi, Fr.w[self.gate.cirPower]), Fr);

            proof.Wxiw = await expTau(pol_wxiw, PTau, curve, logger, "range_check multiexp Wxiw");
        }
    }

    toObjectProof(proof, curve) {
        let res = {};
        res.F = curve.G1.toObject(proof.F);
        res.H1 = curve.G1.toObject(proof.H1);
        res.H2 = curve.G1.toObject(proof.H2);
        res.Z = curve.G1.toObject(proof.Z);
        res.T1 = curve.G1.toObject(proof.T1);
        res.T2 = curve.G1.toObject(proof.T2);
        res.T3 = curve.G1.toObject(proof.T3);
        res.Wxi = curve.G1.toObject(proof.Wxi);
        res.Wxiw = curve.G1.toObject(proof.Wxiw);

        res.eval_h1 = curve.Fr.toObject(proof.eval_h1);
        res.eval_h2 = curve.Fr.toObject(proof.eval_h2);
        res.eval_f = curve.Fr.toObject(proof.eval_f);
        res.eval_t = curve.Fr.toObject(proof.eval_t);
        res.eval_zw = curve.Fr.toObject(proof.eval_zw);
        res.eval_r = curve.Fr.toObject(proof.eval_r);

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