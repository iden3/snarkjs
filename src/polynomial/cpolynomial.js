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

// CPolynomial is a Combined Polynomial of the type :
// CPolynomial(X) := P_0(X^n) + X·P_1(X^n) + ... + X^{n-1}·P_{n-1}(X^n)
// We can use this class to avoid the allocation of a big memory buffer
// for the coefficients because in some cases a big number of the coefficients are zero

import {BigBuffer} from "ffjavascript";
import {log2} from "../misc.js";
import {Polynomial} from "./polynomial.js";

export class CPolynomial {
    constructor(n, curve, logger) {
        this.n = n;
        this.polynomials = Array(n).fill(undefined);
        this.curve = curve;
        this.Fr = curve.Fr;
        this.G1 = curve.G1;
        this.logger = logger;
    }

    addPolynomial(position, polynomial) {
        if (position > this.n - 1) {
            throw new Error("CPolynomial:addPolynomial, cannot add a polynomial to a position greater than n-1");
        }

        this.polynomials[position] = polynomial;
    }

    degree() {
        let degrees = this.polynomials.map(
            (polynomial, index) => polynomial === undefined ? 0 : polynomial.degree() * this.n + index);
        return Math.max(...degrees);
    }

    getPolynomial() {
        let degrees = this.polynomials.map(polynomial => polynomial === undefined ? 0 : polynomial.degree());
        const maxDegree = this.degree();
        const lengthBuffer = 2 ** (log2(maxDegree - 1) + 1);
        const sFr = this.Fr.n8;

        let polynomial = new Polynomial(new BigBuffer(lengthBuffer * sFr), this.curve, this.logger);

        for (let i = 0; i < maxDegree; i++) {
            const i_n8 = i * sFr;
            const i_sFr = i_n8 * this.n;

            for (let j = 0; j < this.n; j++) {
                if (this.polynomials[j] !== undefined) {
                    if (i <= degrees[j]) polynomial.coef.set(this.polynomials[j].coef.slice(i_n8, i_n8 + sFr), i_sFr + j * sFr);
                }
            }
        }

        return polynomial;
    }

    async multiExponentiation(PTau, name) {
        let polynomial = this.getPolynomial();
        const n = polynomial.coef.byteLength / this.Fr.n8;
        const PTauN = PTau.slice(0, n * this.G1.F.n8 * 2);
        const bm = await this.Fr.batchFromMontgomery(polynomial.coef);
        let res = await this.G1.multiExpAffine(PTauN, bm, this.logger, name);
        res = this.G1.toAffine(res);
        return res;
    }
}