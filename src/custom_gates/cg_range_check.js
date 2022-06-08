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

export const RANGE_CHECK_ID = 9;
export const RANGE_CHECK_NAME = "RANGECHECK";
const ZK_RANGE_CHECK_Q_SECTION = 4096;
const ZK_RANGE_CHECK_T_POLYNOMIAL_SECTION = 4097;

export const C = 1 << 2;
export const N = 1 << 4;
export const MAX_RANGE = C * (N - 1);

class RangeCheckCG extends CustomGate {
    constructor(options) {
        super(RANGE_CHECK_ID, RANGE_CHECK_NAME, options.parameters);
        return this;
    }

    numZKeySections() {
        return 2;
    }

    get qSectionId() {
        return ZK_RANGE_CHECK_Q_SECTION;
    }

    get preprocessedInputSectionId() {
        return ZK_RANGE_CHECK_T_POLYNOMIAL_SECTION;
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
        //t = polynomial with t_i = c * (i - 1)
        let t = new Array(N);

        for (let i = 0; i < N; i++) {
            if (i % 10000 === 0) {
                console.log("Creating preprocessed polynomials for range check");
            }
            t[i] = Fr.e(C * i);
        }

        return {t: t};
    }

    async readZKeyPreprocessedInput(fd, sections, Fr) {
        let buffer = await binFileUtils.readSection(fd, sections, this.preprocessedInputSectionId);

        let tArr = Array(N);
        for (let i = 0; i < N; i++) {
            const offset = i * Fr.n8;
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

    computeProof(preInput, witnesses, Fr) {
        let proof = {id: RANGE_CHECK_ID};

        round0();
        round2();

        return proof;

        function round0() {
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
        }

        function round2() {
            // proof.gamma = Fr.random();
            // proof.Z = new BigBuffer(N * Fr.n8);
            // let currentZ = Fr.one;
            // proof.Z.set(currentZ, 0);
            //
            // for (let i = 1; i < N; i++) {
            //     let num = Fr.mul(Fr.add(proof.gamma, proof.f[i - 1]), Fr.add(proof.gamma, proof.t[i - 1]));
            //     let den = Fr.inv(Fr.mul(Fr.add(proof.gamma, proof.h1[i - 1]), Fr.add(proof.gamma, proof.h2[i - 1])));
            //     let mul = Fr.mul(num, den);
            //     currentZ = Fr.mul(currentZ, mul);
            //     proof.Z.set(currentZ, i * Fr.n8);
            // }

            //TODO remove this lines & uncomment the previous
            proof.gamma = Fr.random();
            proof.Z = new Array(N);
            let currentZ = Fr.one;
            proof.Z[0] = currentZ;

            for (let i = 1; i < N; i++) {
                let num = Fr.mul(Fr.add(proof.gamma, proof.f[i - 1]), Fr.add(proof.gamma, proof.t[i - 1]));
                let den = Fr.mul(Fr.add(proof.gamma, proof.h1[i - 1]), Fr.add(proof.gamma, proof.h2[i - 1]));
                currentZ = Fr.mul(currentZ, Fr.div(num, den));
                proof.Z[i] = currentZ;
            }
        }
    }

    verifyProof(proof, Fr) {
        //Check (a) L1(x)(Z(x) − 1) = 0
        let Z1 = proof.Z[0];
        if (!Fr.eq(Fr.sub(Z1, Fr.one), Fr.zero)) {
            return false;
        }

        //Check (b) Z(x)(γ + f(x))(γ + t(x)) = Z(gx)(γ + h1(x))(γ + h2(x)).
        for (let i = 0; i < (N - 1); i++) {
            let leftSide = proof.Z[i];
            //let leftSide = proof.Z.slice(i * Fr.n8, i * Fr.n8 + Fr.n8);
            leftSide = Fr.mul(leftSide, Fr.add(proof.gamma, Fr.e(proof.f[i])));
            leftSide = Fr.mul(leftSide, Fr.add(proof.gamma, Fr.e(proof.t[i])));

            let rightSide = proof.Z[i + 1];
            //let rightSide = proof.Z.slice((i + 1) * Fr.n8, (i + 1) * Fr.n8 + Fr.n8);
            rightSide = Fr.mul(rightSide, Fr.add(proof.gamma, Fr.e(proof.h1[i])));
            rightSide = Fr.mul(rightSide, Fr.add(proof.gamma, Fr.e(proof.h2[i])));

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

    proofFromJson(jsonProof, curve) {
        const res = {};

        // res.f = curve.G1.fromObject(jsonProof.f);
        // res.t = curve.G1.fromObject(jsonProof.t);
        // res.h1 = curve.G1.fromObject(jsonProof.h1);
        // res.h2 = curve.G1.fromObject(jsonProof.h2);
        // res.gamma = curve.Fr.fromObject(jsonProof.gamma);
        // res.Z = jsonProof.Z;

        res.f = Array(jsonProof.f.length);
        res.t = Array(jsonProof.t.length);
        res.h1 = Array(jsonProof.h1.length);
        res.h2 = Array(jsonProof.h2.length);
        for (let i = 0; i < jsonProof.f.length; i++) {
            res.f[i] = curve.Fr.fromObject(jsonProof.f[i]);
            res.t[i] = curve.Fr.fromObject(jsonProof.t[i]);
            res.h1[i] = curve.Fr.fromObject(jsonProof.h1[i]);
            res.h2[i] = curve.Fr.fromObject(jsonProof.h2[i]);
        }

        res.gamma = curve.Fr.fromObject(jsonProof.gamma);

        res.Z = Array(jsonProof.Z.length);
        for (let i = 0; i < jsonProof.Z.length; i++) {
            res.Z[i] = curve.Fr.fromObject(jsonProof.Z[i]);
        }

        return res;
    }
}


export default RangeCheckCG;