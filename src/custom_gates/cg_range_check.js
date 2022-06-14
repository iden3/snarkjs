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
import {to4T, expTau, evalPol} from "../utils.js";
import {log2} from "../misc.js";

export const RANGE_CHECK_ID = 9;
export const RANGE_CHECK_NAME = "RANGECHECK";
const ZK_RANGE_CHECK_HEADER_SECTION = 4096;
const ZK_RANGE_CHECK_Q_SECTION = 4097;
const ZK_RANGE_CHECK_T_POLYNOMIAL_SECTION = 4098;

export const C = 1 << 4;
export const N = 1 << 7;
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
        proof.ext = {};

        let bufferF, polF, F_4;
        let bufferH1, polH1, H1_4;
        let bufferH2, polH2, H2_4;
        let bufferZ, polZ, Z_4;

        let challenges = {};

        await round1(); //Build polynomials h1(x) & h2(x)
        await round2();
        await round3();
        await round4();
        await round5();

        return proof;

        async function round1() {
            const length = Math.max(preInput.t.length, witnesses.length);

            //Compute the query vector
            let f = new Multiset(0, Fr);
            f.fromArray(witnesses);
            f.pad(length, f.lastElement());

            let t = new Multiset(0, Fr);
            t.fromArray(preInput.t);
            t.pad(length, t.lastElement());

            //We already have the table vector in t
            //Crate s = (f,t) sorted in t
            let s = t.sortedVersion(f);

            let {h1, h2} = s.halvesAlternating();

            proof.f = f.toArray();
            proof.t = preInput.t;
            proof.h1 = h1.toArray();
            proof.h2 = h2.toArray();


            bufferF = new BigBuffer(N * Fr.n8);
            bufferH1 = new BigBuffer(N * Fr.n8);
            bufferH2 = new BigBuffer(N * Fr.n8);
            for (let i = 0; i < N; i++) {
                bufferF.set(proof.f[i], i * Fr.n8);
                bufferH1.set(proof.h1[i], i * Fr.n8);
                bufferH2.set(proof.h2[i], i * Fr.n8);
            }

            //Add randomness...
            challenges.b = [];
            for (let i = 0; i < 9; i++) {
                challenges.b[i] = curve.Fr.random();
            }

            [polF, F_4] = await to4T(bufferF, [challenges.b[0], challenges.b[1], challenges.b[2]], Fr);
            proof.ext.F = await expTau(polF, PTau, curve, logger, "multiexp F(x)");
            [polH1, H1_4] = await to4T(bufferH1, [challenges.b[3], challenges.b[4], challenges.b[5]], Fr);
            proof.ext.H1 = await expTau(polH1, PTau, curve, logger, "multiexp H1(x)");
            [polH2, H2_4] = await to4T(bufferH2, [challenges.b[6], challenges.b[7], challenges.b[8]], Fr);
            proof.ext.H2 = await expTau(polH2, PTau, curve, logger, "multiexp H2(x)");
        }

        async function round2() {
            challenges.gamma = self.computePermutationChallenge(proof, curve, keccak256);

            proof.Z = new Array(N);
            bufferZ = new BigBuffer(N * Fr.n8);

            let currentZ = Fr.one;
            proof.Z[0] = currentZ;
            bufferZ.set(Fr.one, 0);

            for (let i = 1; i < N; i++) {
                let num = Fr.mul(Fr.add(challenges.gamma, proof.f[i - 1]), Fr.add(challenges.gamma, proof.t[i - 1]));
                let den = Fr.mul(Fr.add(challenges.gamma, proof.h1[i - 1]), Fr.add(challenges.gamma, proof.h2[i - 1]));
                currentZ = Fr.mul(currentZ, Fr.div(num, den));
                proof.Z[i] = currentZ;
                bufferZ.set(currentZ, i * Fr.n8);
            }

            [polZ, Z_4] = await to4T(bufferZ, [], Fr);
            proof.ext.Z = await expTau(polZ, PTau, curve, logger, "multiexp Z(x)");
        }

        async function round3() {
            const transcript3 = new Uint8Array(curve.G1.F.n8 * 2);
            curve.G1.toRprUncompressed(transcript3, 0, proof.Z);

            const v = Scalar.fromRprBE(new Uint8Array(keccak256.arrayBuffer(transcript3)));
            challenges.alpha = curve.Fr.e(v);


        }

        async function round4() {

        }

        async function round5() {

        }
    }

    verifyProof(proof, curve, keccak256) {
        const Fr = curve.Fr;
        const G1 = curve.G1;
        const gamma = this.computePermutationChallenge(proof, curve, keccak256);

        //Check (a) L1(x)(Z(x) − 1) = 0
        let Z1 = proof.Z[0];
        if (!Fr.eq(Fr.sub(Z1, Fr.one), Fr.zero)) {
            return false;
        }

        //Check (b) Z(x)(γ + f(x))(γ + t(x)) = Z(gx)(γ + h1(x))(γ + h2(x)).
        for (let i = 0; i < (N - 1); i++) {
            let leftSide = proof.Z[i];
            //let leftSide = proof.Z.slice(i * Fr.n8, i * Fr.n8 + Fr.n8);
            leftSide = Fr.mul(leftSide, Fr.add(gamma, Fr.e(proof.f[i])));
            leftSide = Fr.mul(leftSide, Fr.add(gamma, Fr.e(proof.t[i])));

            let rightSide = proof.Z[i + 1];
            //let rightSide = proof.Z.slice((i + 1) * Fr.n8, (i + 1) * Fr.n8 + Fr.n8);
            rightSide = Fr.mul(rightSide, Fr.add(gamma, Fr.e(proof.h1[i])));
            rightSide = Fr.mul(rightSide, Fr.add(gamma, Fr.e(proof.h2[i])));

            if (!Fr.eq(leftSide, rightSide)) {
                return false;
            }
        }

        //Check (c) L_1(x)(h_1(x)) = 0
        if (!Fr.eq(proof.h1[0], Fr.zero)) {
            return false;
        }

        //Check (d) Ln(x)h2(x) = c(n − 1)
        if (!Fr.eq(proof.h2[proof.h2.length - 1], Fr.e(MAX_RANGE))) {
            return false;
        }

        //Check (e) P(h2(x) − h1(x)) = 0
        for (let i = 0; i < N; i++) {
            if (!Fr.eq(this.getResultPolP(Fr.sub(proof.h2[i], proof.h1[i]), Fr), Fr.zero)) {
                return false;
            }
        }

        //Check (f) (x − gn)P(h1(gx) − h2(x)) = 0
        for (let i = 0; i < (N - 1); i++) {
            let x = proof.Z.slice(i * Fr.n8, i * Fr.n8 + Fr.n8);
            let gn = proof.Z.slice((N - 1) * Fr.n8, (N - 1) * Fr.n8 + Fr.n8);
            let mul1 = Fr.sub(x, gn);

            let mul2 = this.getResultPolP(Fr.sub(proof.h1[i + 1], proof.h2[i]), Fr);

            if (!Fr.eq(Fr.mul(mul1, mul2), Fr.zero)) {
                return false;
            }
        }

        ///////////////////////////////////
        console.log("Comprovant extensions...");

        let xi = gamma;
        const lagrangePols = this.calculateLagrangeEvaluations(xi, Fr);

        //EXT (a) L1(x)(Z(x) − 1) = 0
        let a = G1.sub(proof.ext.Z, G1.one);
        a = G1.timesFr(a, lagrangePols[0]);
        if (!G1.eq(a, G1.zero)) {
//            return false;
        }

        let a2 = Fr.sub(proof.ext.eval_zxi, Fr.one);
        a2 = Fr.mul(lagrangePols[0], a2);
        if (!Fr.eq(a2, Fr.zero)) {
//            return false;
        }


        // //EXT
        // const c = G1.timesFr(proof.ext.h1, lagrangePols[0]);
        // if (!G1.eq(c, G1.zero)) {
        //     return false;
        // }

        return true;
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

    calculateLagrangeEvaluations(xi, Fr) {
        let cirPower = log2(this.domainSize) + 1;

        let xin = xi;
        let domainSize = 1;
        for (let i = 0; i < cirPower; i++) {
            xin = Fr.square(xin);
            domainSize *= 2;
        }

        let zh = Fr.sub(xin, Fr.one);
        const L = [];

        const n = Fr.e(domainSize);
        let w = Fr.one;

        for (let i = 0; i < Math.max(1, this.domainSize); i++) {
            L[i] = Fr.div(Fr.mul(w, zh), Fr.mul(n, Fr.sub(xi, w)));
            w = Fr.mul(w, Fr.w[cirPower]);
        }

        return L;
    }

    toObjectProof(proof, curve) {
        let res = {};
        res.f = proof.f;
        res.t = proof.t;
        res.h1 = proof.h1;
        res.h2 = proof.h2;
        res.Z = proof.Z;

        res.ext = {};
        res.ext.F = curve.G1.toObject(proof.ext.F);
        res.ext.H1 = curve.G1.toObject(proof.ext.H1);
        res.ext.H2 = curve.G1.toObject(proof.ext.H2);
        res.ext.Z = curve.G1.toObject(proof.ext.Z);

        return res;
    }

    fromObjectProof(proof, curve) {
        let res = {};
        res.f = Array(proof.f.length);
        res.t = Array(proof.f.length);
        res.h1 = Array(proof.f.length);
        res.h2 = Array(proof.f.length);
        res.Z = Array(proof.f.length);
        for (let i = 0; i < proof.f.length; i++) {
            res.f[i] = curve.Fr.fromMontgomery(curve.Fr.fromObject(proof.f[i]));
            res.t[i] = curve.Fr.fromMontgomery(curve.Fr.fromObject(proof.t[i]));
            res.h1[i] = curve.Fr.fromMontgomery(curve.Fr.fromObject(proof.h1[i]));
            res.h2[i] = curve.Fr.fromMontgomery(curve.Fr.fromObject(proof.h2[i]));
            res.Z[i] = curve.Fr.fromMontgomery(curve.Fr.fromObject(proof.Z[i]));
        }

        res.ext = {};
        res.ext.F = curve.G1.fromObject(proof.ext.F);
        res.ext.H1 = curve.G1.fromObject(proof.ext.H1);
        res.ext.H2 = curve.G1.fromObject(proof.ext.H2);
        res.ext.Z = curve.G1.fromObject(proof.ext.Z);
        return res;
    }

    computePermutationChallenge(proof, curve, keccak256) {
        // const transcript = new Uint8Array(h1.length * Fr.n8 + h2.length * Fr.n8);
        // for (let i = 0; i < h1.length; i++) {
        //     transcript.set(h1[i], i * Fr.n8);
        // }
        // for (let i = 0; i < h2.length; i++) {
        //     transcript.set(h2[i], i * Fr.n8);
        // }
        //
        // const v = Scalar.fromRprLE(new Uint8Array(keccak256.arrayBuffer(transcript)));
        // return Fr.e(v);


        const transcript1 = new Uint8Array(curve.G1.F.n8 * 2 * 3);
        curve.G1.toRprUncompressed(transcript1, 0, proof.ext.F);
        curve.G1.toRprUncompressed(transcript1, curve.G1.F.n8 * 2, proof.ext.H1);
        curve.G1.toRprUncompressed(transcript1, curve.G1.F.n8 * 4, proof.ext.H2);

        const v = Scalar.fromRprBE(new Uint8Array(keccak256.arrayBuffer(transcript1)));
        return curve.Fr.e(v);
    }

    computeEvaluationChallenge(gamma) {
        //TODO
        let xi = gamma;
        return xi;
    }
}

export default RangeCheckCG;