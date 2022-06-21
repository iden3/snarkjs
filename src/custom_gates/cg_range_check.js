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

import CustomGate from "./cg_base.js";
import Multiset from "../plookup/multiset.js";
import * as binFileUtils from "@iden3/binfileutils";
import {BigBuffer, Scalar} from "ffjavascript";
import {to4T, expTau, evalPol, getP4, divPol1} from "../utils.js";
import {log2} from "../misc.js";

export const RANGE_CHECK_ID = 9;
export const RANGE_CHECK_NAME = "RANGECHECK";
const ZK_RANGE_CHECK_HEADER_SECTION = 4096;
const ZK_RANGE_CHECK_Q_SECTION = 4097;
const ZK_RANGE_CHECK_T_POLYNOMIAL_SECTION = 4098;

export const C = 1 << 6;
export const N = 4;//1 << 7;
export const MAX_RANGE = C * (N - 1);

class RangeCheckCG extends CustomGate {
    constructor(options) {
        super(RANGE_CHECK_ID, RANGE_CHECK_NAME, options.parameters);
        return this;
    }


    get headerSectionId() {
        return ZK_RANGE_CHECK_HEADER_SECTION;
    }

    get qSectionId() {
        return ZK_RANGE_CHECK_Q_SECTION;
    }

    get preprocessedInputSectionId() {
        return ZK_RANGE_CHECK_T_POLYNOMIAL_SECTION;
    }

    get domainSize() {
        return N;
    }

    get cirPower() {
        return log2(N);
    }

    plonkConstraints(signals, Fr) {
        //signals[0] = lower_bound
        //signals[1] = upper_bound
        //signals[2] = to_check
        return [
            { //x - lowerbound >= 0
                sl: signals[2], sr: signals[0], so: 0,
                ql: Fr.one, qr: Fr.neg(Fr.one),
                qo: Fr.zero, qm: Fr.zero, qc: Fr.zero,
                qk: Fr.one
            },
            { //upperbound - x >= 0
                sl: signals[2], sr: signals[1], so: 0,
                ql: Fr.neg(Fr.one), qr: Fr.one,
                qo: Fr.zero, qm: Fr.zero, qc: Fr.zero,
                qk: Fr.neg(Fr.one)
            }
        ];
    }

    plonkFactor(a, b, c, Fr) {
        return Fr.add(Fr.neg(a), b);
    }

    getPreprocessedInput(Fr) {
        let res = {};
        //t = polynomial with t_i = c * (i - 1)
        let t = new Array(N);

        for (let i = 0; i < N; i++) {
            if (i % 10000 === 0) {
                console.log("Creating preprocessed polynomials for range check");
            }
            t[i] = Fr.e(C * i);
        }

        res.polynomials = {t: t};
        return res;
    }

    get preprocessedInputKeys() {
        return {
            polynomials: ["t"]
        };
    }

    async readZKeyPreprocessedInput(fd, sections, Fr) {
        let buffer = await binFileUtils.readSection(fd, sections, this.preprocessedInputSectionId, N * Fr.n8);

        let tArr = Array(N);
        for (let i = 0; i < N; i++) {
            const offset = i * Fr.n8 * 4;
            tArr[i] = buffer.slice(offset, offset + Fr.n8);
        }

        return {t: tArr};
    }

    computeWitness(witness, Fr) {
        return [
            Fr.sub(witness[2], witness[0]),
            Fr.sub(witness[1], witness[2])
        ];
    }

    async computeProof(preInput, witnesses, Fr, keccak256, curve, logger, PTau) {
        let self = this;
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

            // bufferF = await Fr.batchToMontgomery(bufferF);
            // bufferT = await Fr.batchToMontgomery(bufferT);
            // bufferH1 = await Fr.batchToMontgomery(bufferH1);
            // bufferH2 = await Fr.batchToMontgomery(bufferH2);

            [polF, F_4] = await to4T(bufferF, [challenges.b[1], challenges.b[0]], Fr);
            [polH1, H1_4] = await to4T(bufferH1, [challenges.b[4], challenges.b[3], challenges.b[2]], Fr);
            [polH2, H2_4] = await to4T(bufferH2, [challenges.b[7], challenges.b[6], challenges.b[5]], Fr);

            proof.F = await expTau(polF, PTau, curve, logger, "range_check multiexp f(x)");
            proof.H1 = await expTau(polH1, PTau, curve, logger, "range_check multiexp h1(x)");
            proof.H2 = await expTau(polH2, PTau, curve, logger, "range_check multiexp h2(x)");
        }

        async function round2() {
            const transcript1 = new Uint8Array(/*witnesses.length * Fr.n8 +*/ curve.G1.F.n8 * 2 * 3);
            //TODO add "public inputs" of this custom gate
            // for (let i = 0; i < witnesses.length; i++) {
            //     Fr.toRprBE(transcript1, i * Fr.n8, Fr.e(witnesses[i]));
            // }
            curve.G1.toRprUncompressed(transcript1, /*witnesses.length * Fr.n8*/0, proof.F);
            curve.G1.toRprUncompressed(transcript1, /*witnesses.length * Fr.n8 +*/ curve.G1.F.n8 * 2, proof.H1);
            curve.G1.toRprUncompressed(transcript1, /*witnesses.length * Fr.n8 +*/ curve.G1.F.n8 * 4, proof.H2);

            const v = Scalar.fromRprBE(new Uint8Array(keccak256.arrayBuffer(transcript1)));
            challenges.gamma = curve.Fr.e(v);

            if (logger) logger.debug("range_check gamma: " + Fr.toString(challenges.gamma));

            bufferZ = new BigBuffer(N * Fr.n8);

            let currentZ = Fr.one;
            bufferZ.set(currentZ, 0);

            for (let i = 1; i < N; i++) {
                const i_n8 = i * Fr.n8;
                let f_i = bufferF.slice(i_n8, i_n8 + Fr.n8);
                let t_i = bufferT.slice(i_n8, i_n8 + Fr.n8);
                let h1_i = bufferH1.slice(i_n8, i_n8 + Fr.n8);
                let h2_i = bufferH2.slice(i_n8, i_n8 + Fr.n8);

                let num = Fr.mul(Fr.add(challenges.gamma, f_i), Fr.add(challenges.gamma, t_i));
                let den = Fr.mul(Fr.add(challenges.gamma, h1_i), Fr.add(challenges.gamma, h2_i));
                let div = Fr.div(num, den);
                currentZ = Fr.mul(currentZ, div);

                bufferZ.set(currentZ, i_n8);
            }

            [polZ, Z_4] = await to4T(bufferZ, /*[challenges.b[10], challenges.b[9], challenges.b[8]]*/[], Fr);

            proof.Z = await expTau(polZ, PTau, curve, logger, "range_check multiexp Z(x)");
        }

        async function round3() {
            const transcript3 = new Uint8Array(curve.G1.F.n8 * 2);
            curve.G1.toRprUncompressed(transcript3, 0, proof.Z);

            const v = Scalar.fromRprBE(new Uint8Array(keccak256.arrayBuffer(transcript3)));
            challenges.alpha = curve.Fr.e(v);

            if (logger) logger.debug("range_check alpha: " + Fr.toString(challenges.alpha));

            const T = new BigBuffer(N * 4 * Fr.n8);
            const Tz = new BigBuffer(N * 4 * Fr.n8);

            let w = Fr.one;
            let w2 = Fr.square(w);

            //Compute Lagrange polynomial L_1 evaluations ()
            let buff = new BigBuffer(N * Fr.n8);
            buff.set(Fr.one, 0);
            let {Q4: lagrange1} = (await getP4(buff, N, Fr));
            if (logger) logger.debug("computing lagrange pols");


            for (let i = 0; i < N * 4; i++) {
                if ((i % 4096 === 0) && (logger)) logger.debug(`range_check calculating t ${i}/${N * 4}`);

                const i_n8 = i * Fr.n8;

                const z = Z_4.slice(i_n8, i_n8 + Fr.n8);
                const zp = Fr.one; //Fr.add(Fr.add(Fr.mul(challenges.b[8], w2), Fr.mul(challenges.b[9], w)), challenges.b[10]);

                //alpha^2*(z(X)-1)
                let e4 = Fr.sub(z, Fr.one);
                e4 = Fr.mul(e4, lagrange1.slice(i_n8, i_n8 + Fr.n8));
                e4 = Fr.mul(e4, Fr.square(challenges.alpha));

                let e4z = Fr.mul(zp, lagrange1.slice(i_n8, i_n8 + Fr.n8));
                e4z = Fr.mul(e4z, Fr.square(challenges.alpha));

                T.set(e4, i_n8);
                Tz.set(e4z, i_n8);

                w = Fr.mul(w, Fr.w[self.cirPower + 2]);
                w2 = Fr.square(w);
            }

            if (logger) logger.debug("range_check ifft T");
            let t = await Fr.ifft(T);

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
            const tz = await Fr.ifft(Tz);
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

            //polT = t.slice(0, (N * 3 + 6) * Fr.n8);
            polT = t.slice(0, (N * 3) * Fr.n8);

            proof.T1 = await expTau(t.slice(0, N * Fr.n8), PTau, curve, logger, "range_check multiexp T");
            proof.T2 = await expTau(t.slice(N * Fr.n8, N * Fr.n8 * 2), PTau, curve, logger, "range_check multiexp T");
            //proof.T3 = await expTau(t.slice(N * Fr.n8 * 2, (N * 3 + 6) * Fr.n8), PTau, curve, logger, "range_check multiexp T");
            proof.T3 = await expTau(t.slice(N * Fr.n8 * 2, (N * 3) * Fr.n8), PTau, curve, logger, "range_check multiexp T");
        }

        async function round4() {
            const transcript4 = new Uint8Array(curve.G1.F.n8 * 2 * 3);
            curve.G1.toRprUncompressed(transcript4, 0, proof.T1);
            curve.G1.toRprUncompressed(transcript4, curve.G1.F.n8 * 2, proof.T2);
            curve.G1.toRprUncompressed(transcript4, curve.G1.F.n8 * 4, proof.T3);

            const v = Scalar.fromRprBE(new Uint8Array(keccak256.arrayBuffer(transcript4)));
            challenges.xi = curve.Fr.e(v);

            if (logger) logger.debug("range_check xi: " + Fr.toString(challenges.xi));

            proof.eval_h1 = evalPol(polH1, challenges.xi, Fr);
            proof.eval_h2 = evalPol(polH2, challenges.xi, Fr);
            proof.eval_f = evalPol(polF, challenges.xi, Fr);
            proof.eval_t = evalPol(polT, challenges.xi, Fr);
            proof.eval_zw = evalPol(polZ, Fr.mul(challenges.xi, Fr.w[self.cirPower]), Fr);

            challenges.xim = challenges.xi;
            for (let i = 0; i < self.cirPower; i++) {
                challenges.xim = Fr.square(challenges.xim);
            }
            const eval_l1 = Fr.div(
                Fr.sub(challenges.xim, Fr.one),
                Fr.mul(Fr.sub(challenges.xi, Fr.one), Fr.e(self.domainSize))
            );

            const e4 = Fr.mul(eval_l1, Fr.square(challenges.alpha));

            const coefz = e4;

            polR = new BigBuffer((N/* + 3*/) * Fr.n8);

            for (let i = 0; i < N/* + 3*/; i++) {
                const i_n8 = i * Fr.n8;

                let v = Fr.mul(coefz, polZ.slice(i_n8, i_n8 + Fr.n8));

                polR.set(v, i_n8);
            }

            proof.eval_r = evalPol(polR, challenges.xi, Fr);
        }

        async function round5() {
            const transcript5 = new Uint8Array(Fr.n8 * 6);
            Fr.toRprBE(transcript5, 0, proof.eval_h1);
            Fr.toRprBE(transcript5, Fr.n8, proof.eval_h2);
            Fr.toRprBE(transcript5, Fr.n8 * 2, proof.eval_f);
            Fr.toRprBE(transcript5, Fr.n8 * 3, proof.eval_t);
            Fr.toRprBE(transcript5, Fr.n8 * 4, proof.eval_zw);
            Fr.toRprBE(transcript5, Fr.n8 * 5, proof.eval_r);

            challenges.v = [];
            const v = Scalar.fromRprBE(new Uint8Array(keccak256.arrayBuffer(transcript5)));
            challenges.v[0] = curve.Fr.e(v);

            if (logger) logger.debug("v: " + Fr.toString(challenges.v[0]));

            for (let i = 1; i < 6; i++) challenges.v[i] = Fr.mul(challenges.v[i - 1], challenges.v[0]);

            let pol_wxi = new BigBuffer((N/* + 6*/) * Fr.n8);

            const xi2m = Fr.square(challenges.xim);

            for (let i = 0; i < N/* + 6*/; i++) {
                const i_n8 = i * Fr.n8;

                let w = Fr.zero;
                w = Fr.mul(xi2m, polT.slice((N * 2 + i) * Fr.n8, (N * 2 + i + 1) * Fr.n8));

                if (i < N + 3) {
                    //TODO descomentar... w = Fr.add(w, Fr.mul(challenges.v[0], polR.slice(i_n8, i_n8 + Fr.n8)));
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
            let pol_wxiw = new BigBuffer((N ) * Fr.n8);
            for (let i = 0; i < N ; i++) {
                const i_n8 = i * Fr.n8;

                const w = polZ.slice(i_n8, i_n8 + Fr.n8);

                pol_wxiw.set(w, i_n8);
            }
            w0 = pol_wxiw.slice(0, Fr.n8);
            w0 = Fr.sub(w0, proof.eval_zw);
            pol_wxiw.set(w0, 0);

            pol_wxiw = divPol1(pol_wxiw, Fr.mul(challenges.xi, Fr.w[self.cirPower]), Fr);

            proof.Wxiw = await expTau(pol_wxiw, PTau, curve, logger, "range_check multiexp Wxiw");
        }
    }

    async verifyProof(proof, vk_verifier, curve, keccak256, logger) {
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
        const challenges = this.computeChallenges(proof, curve, keccak256, logger);

        //5. Compute the zero polynomial evaluation Z_H(xi) = xi^n - 1
        challenges.zh = Fr.sub(challenges.xin, Fr.one);

        //6. Compute the lagrange polynomial evaluation L_1(xi)
        const lagrangeOne = this.computeLagrangeEvaluations(curve, challenges, logger);

        //7. Compute the public input polynomial evaluation

        //8. Compute the public table commitment

        //9. Compute r'(x)
        const rPrime = this.computeRPrime(proof, challenges, lagrangeOne[0], curve);
        if (logger) {
            logger.debug("t: " + Fr.toString(rPrime, 16));
        }

        //10. Compute the first part of the batched polynomial commitment
        const D = this.computeD(proof, vk_verifier, challenges, lagrangeOne[0], curve);
        if (logger) {
            logger.debug("D: " + G1.toString(G1.toAffine(D), 16));
        }

        //11. Compute the full batched polynomial commitment
        const F = this.computeF(proof, vk_verifier, challenges, D, curve);
        if (logger) {
            logger.debug("F: " + G1.toString(G1.toAffine(F), 16));
        }

        //12. Compute the group-encoded batch evaluation [E]_1
        const E = this.computeE(proof, vk_verifier, challenges, rPrime, curve);
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
        if (!curve.G1.isValid(proof.T1)) return false;
        if (!curve.G1.isValid(proof.T2)) return false;
        if (!curve.G1.isValid(proof.T3)) return false;
        if (!curve.G1.isValid(proof.Wxi)) return false;
        if (!curve.G1.isValid(proof.Wxiw)) return false;

        return true;
    }

    computeChallenges(proof, curve, keccak256, logger) {
        const res = {};

        //TODO add "public inputs" of this custom gate
        const transcript1 = new Uint8Array(/*witnesses.length * Fr.n8 +*/ curve.G1.F.n8 * 2 * 3);
        /*for (let i = 0; i < witnesses.length; i++) {
            Fr.toRprBE(transcript1, i * Fr.n8, Fr.e(witnesses[i]));
        }*/
        curve.G1.toRprUncompressed(transcript1, /*witnesses.length * curve.Fr.n8*/0, proof.F);
        curve.G1.toRprUncompressed(transcript1, /*witnesses.length * curve.Fr.n8 +*/ curve.G1.F.n8 * 2, proof.H1);
        curve.G1.toRprUncompressed(transcript1, /*witnesses.length * curve.Fr.n8 +*/ curve.G1.F.n8 * 4, proof.H2);

        let v = Scalar.fromRprBE(new Uint8Array(keccak256.arrayBuffer(transcript1)));
        res.gamma = curve.Fr.e(v);


        const transcript3 = new Uint8Array(curve.G1.F.n8 * 2);
        curve.G1.toRprUncompressed(transcript3, 0, proof.Z);

        v = Scalar.fromRprBE(new Uint8Array(keccak256.arrayBuffer(transcript3)));
        res.alpha = curve.Fr.e(v);

        const transcript4 = new Uint8Array(curve.G1.F.n8 * 2 * 3);
        curve.G1.toRprUncompressed(transcript4, 0, proof.T1);
        curve.G1.toRprUncompressed(transcript4, curve.G1.F.n8 * 2, proof.T2);
        curve.G1.toRprUncompressed(transcript4, curve.G1.F.n8 * 4, proof.T3);

        v = Scalar.fromRprBE(new Uint8Array(keccak256.arrayBuffer(transcript4)));
        res.xi = curve.Fr.e(v);
        res.xin = res.xi;
        for (let i = 0; i < this.cirPower; i++) {
            res.xin = curve.Fr.square(res.xin);
        }

        const transcript5 = new Uint8Array(curve.Fr.n8 * 6);
        curve.Fr.toRprBE(transcript5, 0, proof.eval_h1);
        curve.Fr.toRprBE(transcript5, curve.Fr.n8, proof.eval_h2);
        curve.Fr.toRprBE(transcript5, curve.Fr.n8 * 2, proof.eval_f);
        curve.Fr.toRprBE(transcript5, curve.Fr.n8 * 3, proof.eval_t);
        curve.Fr.toRprBE(transcript5, curve.Fr.n8 * 4, proof.eval_zw);
        curve.Fr.toRprBE(transcript5, curve.Fr.n8 * 5, proof.eval_r);

        res.v = [];
        v = Scalar.fromRprBE(new Uint8Array(keccak256.arrayBuffer(transcript5)));
        res.v[0] = curve.Fr.e(v);

        for (let i = 1; i < 6; i++) res.v[i] = curve.Fr.mul(res.v[i - 1], res.v[0]);

        const transcript6 = new Uint8Array(curve.G1.F.n8 * 2 * 2);
        curve.G1.toRprUncompressed(transcript6, 0, proof.Wxi);
        curve.G1.toRprUncompressed(transcript6, curve.G1.F.n8 * 2, proof.Wxiw);

        v = Scalar.fromRprBE(new Uint8Array(keccak256.arrayBuffer(transcript5)));
        res.u = curve.Fr.e(v);

        //TODO remove when unified isValidPairing on plonk_verify
        if (logger) {
            logger.debug("gamma: " + curve.Fr.toString(res.gamma, 16));
            logger.debug("alpha: " + curve.Fr.toString(res.alpha, 16));
            logger.debug("xi: " + curve.Fr.toString(res.xi, 16));
            logger.debug("v1: " + curve.Fr.toString(res.v[0], 16));
            logger.debug("v6: " + curve.Fr.toString(res.v[5], 16));
        }

        return res;
    }

    getResultPolP(x, Fr) {
        let element = Fr.sub(x, Fr.e(C));
        return (Fr.isNegative(element) || Fr.isZero(element)) ? Fr.zero : Fr.one;

        // let res = Fr.one;
        // for (let i = 0; i <= C; i++) {
        //     console.log(i)
        //     res = Fr.mul(res, Fr.sub(x, Fr.e(i)));
        // }
        // return res;
    }

    computeLagrangeEvaluations(curve, challenges, logger) {
        const domainSize_F = curve.Fr.e(this.domainSize);
        let omega = curve.Fr.one;

        const L = [];
        for (let i = 0; i < this.domainSize; i++) {
            //numerator: omega * (xi^n - 1)
            const num = curve.Fr.mul(omega, challenges.zh);

            //denominator: n * (xi - omega)
            const den = curve.Fr.mul(domainSize_F, curve.Fr.sub(challenges.xi, omega));

            L[i] = curve.Fr.div(num, den);
            omega = curve.Fr.mul(omega, curve.Fr.w[this.cirPower]);
        }

        if (logger) {
            logger.debug("Lagrange Evaluations: ");
            for (let i = 0; i < L.length; i++) {
                logger.debug(`L${i}(xi)=` + curve.Fr.toString(L[i], 16));
            }
        }

        return L;
    }

    computeRPrime(proof, challenges, lagrange1, curve) {
        const r = proof.eval_r;

        const r_0 = curve.Fr.mul(lagrange1, curve.Fr.square(challenges.alpha));

        let rPrime = curve.Fr.sub(r, r_0);
        rPrime = curve.Fr.div(rPrime, challenges.zh); //TODO Why?

        return rPrime;
    }

    computeD(proof, vk_verifier, challenges, lagrange_one_xi, curve) {
        let s6d = curve.Fr.mul(curve.Fr.mul(lagrange_one_xi, curve.Fr.square(challenges.alpha)), challenges.v[0]);

        //s6d = curve.Fr.add(s6d, challenges.u); //TODO Falta v^2 ??
        let res = curve.G1.timesFr(proof.Z, s6d);

        return res;
    }

    computeF(proof, vk_verifier, challenges, D, curve) {
        return D;
        let res = curve.G1.add(proof.T1, curve.G1.timesFr(proof.T2, challenges.xin));
        res = curve.G1.add(res, curve.G1.timesFr(proof.T3, curve.Fr.square(challenges.xin)));
        res = curve.G1.add(res, D);

        return res;
    }

    computeE(proof, vk_verifier, challenges, rPrime, curve) {
        let s = curve.Fr.neg(rPrime);

        s = curve.Fr.add(s, curve.Fr.mul(challenges.v[0], proof.eval_r));
//        s = curve.Fr.add(s, curve.Fr.mul(challenges.u, proof.eval_zw));

        const res = curve.G1.timesFr(curve.G1.one, s);

        return res;
    }

    async isValidPairing(curve, proof, challenges, vk_verifier, E, F) {
        const G1 = curve.G1;
        const Fr = curve.Fr;

        let A1 = proof.Wxi;
        A1 = G1.add(A1, proof.Wxiw);//G1.timesFr(proof.Wxiw, challenges.u));

        let B1 = G1.timesFr(proof.Wxi, challenges.xi);
        const s = Fr.mul(/*Fr.mul(challenges.u,*/ challenges.xi/*)*/, Fr.w[this.cirPower]);
        B1 = G1.add(B1, G1.timesFr(proof.Wxiw, s));
        B1 = G1.add(B1, F);
        B1 = G1.sub(B1, E);

        const res = await curve.pairingEq(
            G1.neg(A1), vk_verifier.X_2,
            B1, curve.G2.one
        );

        return res;

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

    fromObjectProof(proof, curve) {
        let res = {};
        res.F = curve.G1.fromObject(proof.F);
        res.H1 = curve.G1.fromObject(proof.H1);
        res.H2 = curve.G1.fromObject(proof.H2);
        res.Z = curve.G1.fromObject(proof.Z);
        res.T1 = curve.G1.fromObject(proof.T1);
        res.T2 = curve.G1.fromObject(proof.T2);
        res.T3 = curve.G1.fromObject(proof.T3);
        res.Wxi = curve.G1.fromObject(proof.Wxi);
        res.Wxiw = curve.G1.fromObject(proof.Wxiw);

        res.eval_h1 = curve.Fr.fromObject(proof.eval_h1);
        res.eval_h2 = curve.Fr.fromObject(proof.eval_h2);
        res.eval_f = curve.Fr.fromObject(proof.eval_f);
        res.eval_t = curve.Fr.fromObject(proof.eval_t);
        res.eval_zw = curve.Fr.fromObject(proof.eval_zw);
        res.eval_r = curve.Fr.fromObject(proof.eval_r);

        return res;
    }
}

export default RangeCheckCG;