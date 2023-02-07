/*
    Copyright 2022 iden3 association.

    This file is part of snarkjs.

    snarkjs is a free software: you can redistribute it and/or
    modify it under the terms of the GNU General Public License as published by the
    Free Software Foundation, either version 3 of the License, or (at your option)
    any later version.

    snarkjs is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
    more details.

    You should have received a copy of the GNU General Public License along with
    snarkjs. If not, see <https://www.gnu.org/licenses/>.
*/

const LINEAR_COMBINATION_NULLABLE = 0;
const LINEAR_COMBINATION_CONSTANT = 1;
const LINEAR_COMBINATION_VARIABLE = 2;

export class r1csConstraintProcessor {
    constructor(Fr, fnGetConstantConstraint, fnGetAdditionConstraint, fnGetMultiplicationConstraint, logger) {
        this.Fr = Fr;
        this.logger = logger;
        this.fnGetAdditionConstraint = fnGetAdditionConstraint;
        this.fnGetMultiplicationConstraint = fnGetMultiplicationConstraint;
    }

    processR1csConstraint(settings, lcA, lcB, lcC) {
        this.normalizeLinearCombination(lcA);
        this.normalizeLinearCombination(lcB);
        this.normalizeLinearCombination(lcC);

        const lctA = this.getLinearCombinationType(lcA);
        const lctB = this.getLinearCombinationType(lcB);

        if ((lctA === LINEAR_COMBINATION_NULLABLE) || (lctB === LINEAR_COMBINATION_NULLABLE)) {
            return this.processR1csAdditionConstraint(settings, lcC);
        } else if (lctA === LINEAR_COMBINATION_CONSTANT) {
            const lcCC = this.joinLinearCombinations(lcB, lcC, lcA[0]);
            return this.processR1csAdditionConstraint(settings, lcCC);
        } else if (lctB === LINEAR_COMBINATION_CONSTANT) {
            const lcCC = this.joinLinearCombinations(lcA, lcC, lcB[0]);
            return this.processR1csAdditionConstraint(settings, lcCC);
        } else {
            return this.processR1csMultiplicationConstraint(settings, lcA, lcB, lcC);
        }
    }

    getLinearCombinationType(linCom) {
        // let k = this.Fr.zero;
        //
        // const signalIds = Object.keys(linCom);
        // for (let i = 0; i < signalIds.length; i++) {
        //     if (signalIds[i] === "0") {
        //         k = this.Fr.add(k, linCom[signalIds[i]]);
        //     } else {
        //         return LINEAR_COMBINATION_VARIABLE;
        //     }
        // }
        //
        // if (!this.Fr.eq(k, this.Fr.zero)) return LINEAR_COMBINATION_CONSTANT;
        //
        // return LINEAR_COMBINATION_NULLABLE;

        let k = this.Fr.zero;
        let n = 0;
        const ss = Object.keys(linCom);
        for (let i = 0; i < ss.length; i++) {
            if (linCom[ss[i]] == 0n) {
                delete linCom[ss[i]];
            } else if (ss[i] == 0) {
                k = this.Fr.add(k, linCom[ss[i]]);
            } else {
                n++;
            }
        }
        if (n > 0) return LINEAR_COMBINATION_VARIABLE;
        if (!this.Fr.isZero(k)) return LINEAR_COMBINATION_CONSTANT;
        return LINEAR_COMBINATION_NULLABLE;
    }

    normalizeLinearCombination(linCom) {
        const signalIds = Object.keys(linCom);
        for (let i = 0; i < signalIds.length; i++) {
            if (this.Fr.isZero(linCom[signalIds[i]])) delete linCom[signalIds[i]];
        }

        return linCom;
    }

    joinLinearCombinations(linCom1, linCom2, k) {
        const res = {};

        // for (let s in linCom1) {
        //     const val = this.Fr.mul(k, linCom1[s]);
        //     res[s] = !(s in res) ? val : this.Fr.add(val, res[s]);
        // }
        //
        // for (let s in linCom2) {
        //     const val = this.Fr.mul(k, linCom2[s]);
        //     res[s] = !(s in res) ? val : this.Fr.add(val, res[s]);
        // }

        for (let s in linCom1) {
            if (typeof res[s] == "undefined") {
                res[s] = this.Fr.mul(k, linCom1[s]);
            } else {
                res[s] = this.Fr.add(res[s], this.Fr.mul(k, linCom1[s]));
            }
        }

        for (let s in linCom2) {
            if (typeof res[s] == "undefined") {
                res[s] = linCom2[s];
            } else {
                res[s] = this.Fr.add(res[s], linCom2[s]);
            }
        }

        return this.normalizeLinearCombination(res);
    }

    reduceCoefs(settings, constraintsArr, additionsArr, linCom, maxC) {
        const res = {
            k: this.Fr.zero,
            signals: [],
            coefs: []
        };
        const cs = [];

        for (let signalId in linCom) {
            if (signalId == 0) {
                res.k = this.Fr.add(res.k, linCom[signalId]);
            } else if (linCom[signalId] != 0n) {
                cs.push([Number(signalId), linCom[signalId]]);
            }
        }

        while (cs.length > maxC) {
            const c1 = cs.shift();
            const c2 = cs.shift();
            const so = settings.nVars++;

            const constraints = this.fnGetAdditionConstraint(
                c1[0], c2[0], so,
                this.Fr.neg(c1[1]), this.Fr.neg(c2[1]), this.Fr.zero, this.Fr.one, this.Fr.zero);

            constraintsArr.push(constraints);
            additionsArr.push([c1[0], c2[0], c1[1], c2[1]]);

            cs.push([so, this.Fr.one]);
        }

        for (let i = 0; i < cs.length; i++) {
            res.signals[i] = cs[i][0];
            res.coefs[i] = cs[i][1];
        }

        while (res.coefs.length < maxC) {
            res.signals.push(0);
            res.coefs.push(this.Fr.zero);
        }

        return res;
    }

    processR1csAdditionConstraint(settings, linCom) {
        const constraintsArr = [];
        const additionsArr = [];

        const C = this.reduceCoefs(settings, constraintsArr, additionsArr, linCom, 3);

        const constraints = this.fnGetAdditionConstraint(
            C.signals[0], C.signals[1], C.signals[2],
            C.coefs[0], C.coefs[1], this.Fr.zero, C.coefs[2], C.k);

        constraintsArr.push(constraints);

        return [constraintsArr, additionsArr];
    }

    processR1csMultiplicationConstraint(settings, lcA, lcB, lcC) {
        const constraintsArr = [];
        const additionsArr = [];

        const A = this.reduceCoefs(settings, constraintsArr, additionsArr, lcA, 1);
        const B = this.reduceCoefs(settings, constraintsArr, additionsArr, lcB, 1);
        const C = this.reduceCoefs(settings, constraintsArr, additionsArr, lcC, 1);

        const constraints = this.fnGetMultiplicationConstraint(
            A.signals[0], B.signals[0], C.signals[0],
            this.Fr.mul(A.coefs[0], B.k),
            this.Fr.mul(A.k, B.coefs[0]),
            this.Fr.mul(A.coefs[0], B.coefs[0]),
            this.Fr.neg(C.coefs[0]),
            this.Fr.sub(this.Fr.mul(A.k, B.k), C.k));

        constraintsArr.push(constraints);

        return [constraintsArr, additionsArr];
    }
}