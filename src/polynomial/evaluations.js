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

import {BigBuffer} from "ffjavascript";

export class Evaluations {
    constructor(evaluations = [], Fr, logger) {
        this.eval = evaluations;
        this.Fr = Fr;
        this.logger = logger;
    }

    static async fromPolynomial(polynomial, Fr, logger) {
        const coefficients4 = new BigBuffer(polynomial.length() * 4 * Fr.n8);
        coefficients4.set(polynomial.coef, 0);

        const evaluations = await Fr.fft(coefficients4);

        return new Evaluations(evaluations, Fr, logger);
    }

    getEvaluation(i) {
        return this.eval.slice(i, i + this.Fr.n8);
    }

    length() {
        let length = this.eval.byteLength / this.Fr.n8;
        if (length !== Math.floor(this.eval.byteLength / this.Fr.n8)) {
            throw new Error("Polynomial coefficients buffer has incorrect size");
        }
        if (0 === length) {
            this.logger.warn("Polynomial has length zero");
        }
        return length;
    }
}