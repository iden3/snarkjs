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

export class Polynomial {
    constructor(coefficients, Fr, logger) {
        this.coef = coefficients;
        this.Fr = Fr;
        this.logger = logger;
    }

    static async fromEvaluations(buffer, Fr, logger) {
        let coefficients = await Fr.ifft(buffer);

        return new Polynomial(coefficients, Fr, logger);
    }

    static fromCoefficientsArray(array, Fr, logger) {
        let buff = array.length > 2 << 14 ?
            new BigBuffer(array.length * Fr.n8) : new Uint8Array(array.length * Fr.n8);
        for (let i = 0; i < array.length; i++) buff.set(array[i], i * Fr.n8);

        return new Polynomial(buff, Fr, logger);
    }

    isEqual(polynomial) {
        const degree = this.degree();
        if (degree !== polynomial.degree()) return false;

        for (let i = 0; i < degree + 1; i++) {
            if (!this.Fr.eq(this.getCoef(i), polynomial.getCoef(i))) return false;
        }

        return true;
    }

    blindCoefficients(blindingFactors) {
        blindingFactors = blindingFactors || [];

        const blindedCoefficients = (this.length() + blindingFactors.length) > 2 << 14 ?
            new BigBuffer((this.length() + blindingFactors.length) * this.Fr.n8) :
            new Uint8Array((this.length() + blindingFactors.length) * this.Fr.n8);

        blindedCoefficients.set(this.coef, 0);
        for (let i = 0; i < blindingFactors.length; i++) {
            blindedCoefficients.set(
                this.Fr.add(
                    blindedCoefficients.slice((this.length() + i) * this.Fr.n8, (this.length() + i + 1) * this.Fr.n8),
                    blindingFactors[i]
                ),
                (this.length() + i) * this.Fr.n8
            );
            blindedCoefficients.set(
                this.Fr.sub(
                    blindedCoefficients.slice(i * this.Fr.n8, (i + 1) * this.Fr.n8),
                    blindingFactors[i]
                ),
                i * this.Fr.n8
            );
        }
        this.coef = blindedCoefficients;
    }

    getCoef(index) {
        const i_n8 = index * this.Fr.n8;

        if (i_n8 + this.Fr.n8 > this.coef.length) return this.Fr.zero;

        return this.coef.slice(i_n8, i_n8 + this.Fr.n8);
    }

    setCoef(index, value) {
        if (index > (this.length() - 1)) {
            throw new Error("Coef index is not available");
        }

        this.coef.set(value, index * this.Fr.n8);
    }

    static async to4T(buffer, domainSize, blindingFactors, Fr) {
        blindingFactors = blindingFactors || [];
        let a = await Fr.ifft(buffer);

        const a4 = (domainSize * 4) > 2 << 14 ?
            new BigBuffer(domainSize * 4 * Fr.n8) : new Uint8Array(domainSize * 4 * Fr.n8);
        a4.set(a, 0);

        const A4 = await Fr.fft(a4);

        if (blindingFactors.length === 0) {
            return [a, A4];
        }

        const a1 = domainSize + blindingFactors.length > 2 << 14 ?
            new BigBuffer((domainSize + blindingFactors.length) * Fr.n8) :
            new Uint8Array((domainSize + blindingFactors.length) * Fr.n8);

        a1.set(a, 0);
        for (let i = 0; i < blindingFactors.length; i++) {
            a1.set(
                Fr.add(
                    a1.slice((domainSize + i) * Fr.n8, (domainSize + i + 1) * Fr.n8),
                    blindingFactors[i]
                ),
                (domainSize + i) * Fr.n8
            );
            a1.set(
                Fr.sub(
                    a1.slice(i * Fr.n8, (i + 1) * Fr.n8),
                    blindingFactors[i]
                ),
                i * Fr.n8
            );
        }

        return [a1, A4];
    }

    length() {
        let length = this.coef.byteLength / this.Fr.n8;
        if (length !== Math.floor(this.coef.byteLength / this.Fr.n8)) {
            throw new Error("Polynomial coefficients buffer has incorrect size");
        }
        if (0 === length) {
            if (this.logger) {
                this.logger.warn("Polynomial has length zero");
            }
        }
        return length;
    }

    degree() {
        for (let i = this.length() - 1; i > 0; i--) {
            const i_n8 = i * this.Fr.n8;
            if (!this.Fr.eq(this.Fr.zero, this.coef.slice(i_n8, i_n8 + this.Fr.n8))) {
                return i;
            }
        }

        return 0;
    }

    evaluate(point) {
        let res = this.Fr.zero;

        for (let i = this.length(); i > 0; i--) {
            let i_n8 = (i - 1) * this.Fr.n8;
            const currentCoefficient = this.coef.slice(i_n8, i_n8 + this.Fr.n8);
            res = this.Fr.add(currentCoefficient, this.Fr.mul(res, point));
        }

        return res;
    }

    add(polynomial, blindingValue) {
        let other = false;

        if (polynomial.length() > this.length()) {
            other = true;
        }

        const thisLength = this.length();
        const polyLength = polynomial.length();
        for (let i = 0; i < Math.max(thisLength, polyLength); i++) {
            const i_n8 = i * this.Fr.n8;

            const a = i < thisLength ? this.coef.slice(i_n8, i_n8 + this.Fr.n8) : this.Fr.zero;
            let b = i < polyLength ? polynomial.coef.slice(i_n8, i_n8 + this.Fr.n8) : this.Fr.zero;

            if (blindingValue !== undefined) {
                b = this.Fr.mul(b, blindingValue);
            }
            if (other) {
                polynomial.coef.set(this.Fr.add(a, b), i_n8);
            } else {
                this.coef.set(this.Fr.add(a, b), i_n8);
            }
        }
        if (other) {
            delete this.coef;
            this.coef = polynomial.coef;
        }
    }

    sub(polynomial, blindingValue) {
        let other = false;

        if (polynomial.length() > this.length()) {
            other = true;
        }

        const thisLength = this.length();
        const polyLength = polynomial.length();
        for (let i = 0; i < Math.max(thisLength, polyLength); i++) {
            const i_n8 = i * this.Fr.n8;

            const a = i < thisLength ? this.coef.slice(i_n8, i_n8 + this.Fr.n8) : this.Fr.zero;
            let b = i < polyLength ? polynomial.coef.slice(i_n8, i_n8 + this.Fr.n8) : this.Fr.zero;

            if (blindingValue !== undefined) {
                b = this.Fr.mul(b, blindingValue);
            }
            if (other) {
                polynomial.coef.set(this.Fr.sub(a, b), i_n8);
            } else {
                this.coef.set(this.Fr.sub(a, b), i_n8);
            }
        }
        if (other) {
            delete this.coef;
            this.coef = polynomial.coef;
        }
    }

    mulScalar(value) {
        for (let i = 0; i < this.length(); i++) {
            const i_n8 = i * this.Fr.n8;

            this.coef.set(this.Fr.mul(this.coef.slice(i_n8, i_n8 + this.Fr.n8), value), i_n8);
        }
    }

    addScalar(value) {
        const currentValue = 0 === this.length() ? this.Fr.zero : this.coef.slice(0, this.Fr.n8);
        this.coef.set(this.Fr.add(currentValue, value), 0);
    }

    subScalar(value) {
        const currentValue = 0 === this.length() ? this.Fr.zero : this.coef.slice(0, this.Fr.n8);
        this.coef.set(this.Fr.sub(currentValue, value), 0);
    }

    // Multiply current polynomial by the polynomial (X - value)
    byXSubValue(value) {
        const Fr = this.Fr;
        const resize = !Fr.eq(Fr.zero, this.getCoef(this.length() - 1));

        const length = resize ? this.length() + 1 : this.length();
        const buff = length > 2 << 14 ? new BigBuffer(length * Fr.n8) : new Uint8Array(length * Fr.n8);
        let pol = new Polynomial(buff, this.Fr, this.logger);

        // Step 0: Set current coefficients to the new buffer shifted one position
        pol.coef.set(this.coef.slice(0, (length - 1) * Fr.n8), 32);

        // Step 1: multiply each coefficient by (-value)
        this.mulScalar(Fr.neg(value));

        // Step 2: Add current polynomial to destination polynomial
        pol.add(this);

        // Swap buffers
        this.coef = pol.coef;
    }

    // Euclidean division
    divBy(polynomial) {
        const Fr = this.Fr;
        const degreeA = this.degree();
        const degreeB = polynomial.degree();

        let polR = new Polynomial(this.coef, Fr, this.logger);

        this.coef = this.length() > 2 << 14 ?
            new BigBuffer(this.length() * Fr.n8) : new Uint8Array(this.length() * Fr.n8);

        for (let i = degreeA - degreeB; i >= 0; i--) {
            this.setCoef(i, Fr.div(polR.getCoef(i + degreeB), polynomial.getCoef(degreeB)));
            for (let j = 0; j <= degreeB; j++) {
                polR.setCoef(i + j, Fr.sub(polR.getCoef(i + j), Fr.mul(this.getCoef(i), polynomial.getCoef(j))));
            }
        }

        return polR;
    }

    // Divide polynomial by X - value
    divByXSubValue(value) {
        const coefs = this.length() > 2 << 14 ?
            new BigBuffer(this.length() * this.Fr.n8) : new Uint8Array(this.length() * this.Fr.n8);

        coefs.set(this.Fr.zero, (this.length() - 1) * this.Fr.n8);
        coefs.set(this.coef.slice((this.length() - 1) * this.Fr.n8, this.length() * this.Fr.n8), (this.length() - 2) * this.Fr.n8);
        for (let i = this.length() - 3; i >= 0; i--) {
            let i_n8 = i * this.Fr.n8;
            coefs.set(
                this.Fr.add(
                    this.coef.slice(i_n8 + this.Fr.n8, i_n8 + 2 * this.Fr.n8),
                    this.Fr.mul(value, coefs.slice(i_n8 + this.Fr.n8, i_n8 + 2 * this.Fr.n8))
                ),
                i * this.Fr.n8
            );
        }
        if (!this.Fr.eq(
            this.coef.slice(0, this.Fr.n8),
            this.Fr.mul(this.Fr.neg(value), coefs.slice(0, this.Fr.n8))
        )) {
            // throw new Error("Polynomial does not divide");
        }

        this.coef = coefs;
    }

    async divZh() {
        let domainSize = this.coef.length / 4 / this.Fr.n8;

        for (let i = 0; i < domainSize; i++) {
            const i_n8 = i * this.Fr.n8;
            this.coef.set(this.Fr.neg(this.coef.slice(i_n8, i_n8 + this.Fr.n8)), i_n8);
        }

        for (let i = domainSize; i < domainSize * 4; i++) {
            const i_n8 = i * this.Fr.n8;

            const a = this.Fr.sub(
                this.coef.slice((i - domainSize) * this.Fr.n8, (i - domainSize) * this.Fr.n8 + this.Fr.n8),
                this.coef.slice(i_n8, i_n8 + this.Fr.n8)
            );
            this.coef.set(a, i_n8);
            if (i > (domainSize * 3 - 4)) {
                if (!this.Fr.isZero(a)) {
                    //throw new Error("Polynomial is not divisible");
                }
            }
        }

        return this;
    }

    byX() {
        const coefs = (this.length() + 1) > 2 << 14 ?
            new BigBuffer(this.coef.length + this.Fr.n8) : new Uint8Array(this.coef.length + this.Fr.n8);
        coefs.set(this.Fr.zero, 0);
        coefs.set(this.coef, this.Fr.n8);

        this.coef = coefs;
    }

    // Compute a new polynomial f(x^n) from f(x)
    // f(x)   = a_0 + a_1·x + a_2·x^2 + ... + a_j·x^j
    // f(x^n) = a_0 + a_1·x^n + a_2·x^2n + ... + a_j·x^jn
    static async expX(polynomial, n, truncate = false) {
        const Fr = polynomial.Fr;

        if (n < 1) {
            // n == 0 not allowed because it has no sens, but if it's necessary we have to return
            // a zero degree polynomial with a constant coefficient equals to the sum of all the original coefficients
            throw new Error("Compute a new polynomial to a zero or negative number is not allowed");
        } else if (1 === n) {
            return await Polynomial.fromEvaluations(polynomial.coef, Fr, polynomial.logger);
        }

        // length is the length of non-constant coefficients
        // if truncate === true, the highest zero coefficients (if exist) will be removed
        const length = truncate ? polynomial.degree() : (polynomial.length() - 1);
        const bufferDst = (length * n + 1) > 2 << 14 ?
            new BigBuffer((length * n + 1) * Fr.n8) : new Uint8Array((length * n + 1) * Fr.n8);

        // Copy constant coefficient as is because is not related to x
        bufferDst.set(polynomial.coef.slice(0, Fr.n8), 0);

        for (let i = 1; i <= length; i++) {
            const i_sFr = i * Fr.n8;

            const coef = polynomial.coef.slice(i_sFr, i_sFr + Fr.n8);
            bufferDst.set(coef, i_sFr * n);
        }

        return new Polynomial(bufferDst, Fr, polynomial.logger);
    }

    split(numPols, degPols, blindingFactors) {
        if (numPols < 1) {
            throw new Error(`Polynomials can't be split in ${numPols} parts`);
        } else if (1 === numPols) {
            return [this];
        }

        //blinding factors can be void or must have a length of numPols - 1
        if (0 !== blindingFactors.length && blindingFactors.length < numPols - 1) {
            throw new Error(`Blinding factors length must be ${numPols - 1}`);
        }

        const chunkByteLength = (degPols + 1) * this.Fr.n8;
        let res = [];

        // Check polynomial can be split in numChunks parts of chunkSize bytes...
        const numRealPols = Math.ceil((this.degree() + 1) * this.Fr.n8 / chunkByteLength);
        if (numRealPols < numPols) {
            //throw new Error(`Polynomial is short to be split in ${numPols} parts of ${degPols} coefficients each.`);
            for (let i = numRealPols; i < numPols; i++) {
                res[i] = new Polynomial(new Uint8Array(this.Fr.n8), this.Fr, this.logger);
            }
        }

        numPols = Math.min(numPols, numRealPols);
        for (let i = 0; i < numPols; i++) {
            const isLast = (numPols - 1) === i;
            const byteLength = isLast ? this.coef.byteLength - ((numPols - 1) * chunkByteLength) : chunkByteLength + this.Fr.n8;

            let buff = (byteLength / this.Fr.n8) > 2 << 14 ? new BigBuffer(byteLength) : new Uint8Array(byteLength);
            res[i] = new Polynomial(buff, this.Fr, this.logger);

            const fr = i * chunkByteLength;
            const to = isLast ? this.coef.byteLength : (i + 1) * chunkByteLength;
            res[i].coef.set(this.coef.slice(fr, to), 0);

            // Add a blinding factor as higher degree
            if (!isLast) {
                res[i].coef.set(blindingFactors[i], chunkByteLength);
            }

            // Sub blinding factor to the lowest degree
            if (0 !== i) {
                const lowestDegree = this.Fr.sub(res[i].coef.slice(0, this.Fr.n8), blindingFactors[i - 1]);
                res[i].coef.set(lowestDegree, 0);
            }

            if (isLast) {
                res[i].truncate();
            }
        }

        return res;

        // // compute t_low(X)
        // let polTLow = new BigBuffer((chunkSize + 1) * n8r);
        // polTLow.set(t.slice(0, zkey.domainSize * n8r), 0);
        // // Add blinding scalar b_10 as a new coefficient n
        // polTLow.set(ch.b[10], zkey.domainSize * n8r);
        //
        // // compute t_mid(X)
        // let polTMid = new BigBuffer((zkey.domainSize + 1) * n8r);
        // polTMid.set(t.slice(zkey.domainSize * n8r, zkey.domainSize * 2 * n8r), 0);
        // // Subtract blinding scalar b_10 to the lowest coefficient of t_mid
        // const lowestMid = Fr.sub(polTMid.slice(0, n8r), ch.b[10]);
        // polTMid.set(lowestMid, 0);
        // // Add blinding scalar b_11 as a new coefficient n
        // polTMid.set(ch.b[11], zkey.domainSize * n8r);
        //
        // // compute t_high(X)
        // let polTHigh = new BigBuffer((zkey.domainSize + 6) * n8r);
        // polTHigh.set(t.slice(zkey.domainSize * 2 * n8r, (zkey.domainSize * 3 + 6) * n8r), 0);
        // //Subtract blinding scalar b_11 to the lowest coefficient of t_high
        // const lowestHigh = Fr.sub(polTHigh.slice(0, n8r), ch.b[11]);
        // polTHigh.set(lowestHigh, 0);
        //
        // proof.T1 = await expTau(polTLow, "multiexp T1");
        // proof.T2 = await expTau(polTMid, "multiexp T2");
        // proof.T3 = await expTau(polTHigh, "multiexp T3");
    }

    // split2(degPols, blindingFactors) {
    //     let currentDegree = this.degree();
    //     const numFilledPols = Math.ceil((currentDegree + 1) / (degPols + 1));
    //
    //     //blinding factors can be void or must have a length of numPols - 1
    //     if (0 !== blindingFactors.length && blindingFactors.length < numFilledPols - 1) {
    //         throw new Error(`Blinding factors length must be ${numFilledPols - 1}`);
    //     }
    //
    //     const chunkByteLength = (degPols + 1) * this.Fr.n8;
    //
    //     // Check polynomial can be split in numChunks parts of chunkSize bytes...
    //     if (this.coef.byteLength / chunkByteLength <= numFilledPols - 1) {
    //         throw new Error(`Polynomial is short to be split in ${numFilledPols} parts of ${degPols} coefficients each.`);
    //     }
    //
    //     let res = [];
    //     for (let i = 0; i < numFilledPols; i++) {
    //         const isLast = (numFilledPols - 1) === i;
    //         const byteLength = isLast ? (currentDegree + 1) * this.Fr.n8 - ((numFilledPols - 1) * chunkByteLength) : chunkByteLength + this.Fr.n8;
    //
    //         res[i] = new Polynomial(new BigBuffer(byteLength), this.Fr, this.logger);
    //         const fr = i * chunkByteLength;
    //         const to = isLast ? (currentDegree + 1) * this.Fr.n8 : (i + 1) * chunkByteLength;
    //         res[i].coef.set(this.coef.slice(fr, to), 0);
    //
    //         // Add a blinding factor as higher degree
    //         if (!isLast) {
    //             res[i].coef.set(blindingFactors[i], chunkByteLength);
    //         }
    //
    //         // Sub blinding factor to the lowest degree
    //         if (0 !== i) {
    //             const lowestDegree = this.Fr.sub(res[i].coef.slice(0, this.Fr.n8), blindingFactors[i - 1]);
    //             res[i].coef.set(lowestDegree, 0);
    //         }
    //     }
    //
    //     return res;
    // }

    // merge(pols, overlap = true) {
    //     let length = 0;
    //     for (let i = 0; i < pols.length; i++) {
    //         length += pols[i].length();
    //     }
    //
    //     if (overlap) {
    //         length -= pols.length - 1;
    //     }
    //
    //     let res = new Polynomial(new BigBuffer(length * this.Fr.n8));
    //     for (let i = 0; i < pols.length; i++) {
    //         const byteLength = pols[i].coef.byteLength;
    //         if (0 === i) {
    //             res.coef.set(pols[i].coef, 0);
    //         } else {
    //
    //         }
    //     }
    //
    //     return res;
    // }

    truncate() {
        const deg = this.degree();
        if (deg + 1 < this.coef.byteLength / this.Fr.n8) {
            const newCoefs = (deg + 1) > 2 << 14 ?
                new BigBuffer((deg + 1) * this.Fr.n8) : new Uint8Array((deg + 1) * this.Fr.n8);

            newCoefs.set(this.coef.slice(0, (deg + 1) * this.Fr.n8), 0);
            this.coef = newCoefs;
        }
    }

    static lagrangeInterpolationFrom4Points(xArr, yArr, Fr) {
        if (xArr.length !== 4 || yArr.length !== 4) {
            throw new Error("Lagrange Interpolation 4 needs 4 x's and 4 y's");
        }

        return Lagrange4Optimized(xArr, yArr);

        // let pol = Lagrange4(yArr[0], xArr[0], xArr[1], xArr[2], xArr[3]);
        // pol.add(Lagrange4(yArr[1], xArr[1], xArr[2], xArr[3], xArr[0]));
        // pol.add(Lagrange4(yArr[2], xArr[2], xArr[3], xArr[0], xArr[1]));
        // pol.add(Lagrange4(yArr[3], xArr[3], xArr[0], xArr[1], xArr[2]));
        //
        // return pol;
        //
        function Lagrange4Optimized(xArr, yArr) {
            // First step
            const x0_2 = Fr.square(xArr[0]);
            const x1_2 = Fr.square(xArr[1]);
            const x2_2 = Fr.square(xArr[2]);
            const x3_2 = Fr.square(xArr[3]);

            const x01 = Fr.mul(xArr[0], xArr[1]);
            const x02 = Fr.mul(xArr[0], xArr[2]);
            const x03 = Fr.mul(xArr[0], xArr[3]);
            const x12 = Fr.mul(xArr[1], xArr[2]);
            const x13 = Fr.mul(xArr[1], xArr[3]);
            const x23 = Fr.mul(xArr[2], xArr[3]);

            let res = [];
            res[0] = lagrange4i(yArr[0], xArr[0], x0_2, xArr[1], xArr[2], xArr[3], x12, x13, x23);
            res[1] = lagrange4i(yArr[1], xArr[1], x1_2, xArr[2], xArr[3], xArr[0], x23, x02, x03);
            res[2] = lagrange4i(yArr[2], xArr[2], x2_2, xArr[3], xArr[0], xArr[1], x03, x13, x01);
            res[3] = lagrange4i(yArr[3], xArr[3], x3_2, xArr[0], xArr[1], xArr[2], x01, x02, x12);

            let buff = new Uint8Array(4 * Fr.n8);
            for (let i = 0; i < 4; i++) {
                if (i === 0) {
                    buff.set(res[i][0], 0);
                    buff.set(res[i][1], 32);
                    buff.set(res[i][2], 64);
                    buff.set(res[i][3], 96);
                } else {
                    buff.set(Fr.add(buff.slice(0, 32), res[i][0]), 0);
                    buff.set(Fr.add(buff.slice(32, 64), res[i][1]), 32);
                    buff.set(Fr.add(buff.slice(64, 96), res[i][2]), 64);
                    buff.set(Fr.add(buff.slice(96, 128), res[i][3]), 96);
                }
            }

            return new Polynomial(buff, Fr);

            function lagrange4i(y, a, a2, b, c, d, bc, bd, cd) {
                // x^2
                let coef2 = Fr.neg(Fr.add(b, Fr.add(c, d)));

                // x^1
                let coef1 = Fr.add(bc, bd);
                coef1 = Fr.add(coef1, cd);

                // x^0
                let coef0 = Fr.neg(Fr.mul(b, cd));

                let den = Fr.mul(a2, a);
                den = Fr.add(den, Fr.mul(coef2, a2));
                den = Fr.add(den, Fr.mul(coef1, a));
                den = Fr.add(den, coef0);
                den = Fr.inv(den);
                den = Fr.mul(den, y);

                return [Fr.mul(den, coef0), Fr.mul(den, coef1), Fr.mul(den, coef2), den];
            }
        }

        function Lagrange4(y, a, b, c, d) {
            const a2 = Fr.square(a);

            const bc = Fr.mul(b, c);
            const bd = Fr.mul(b, d);
            const cd = Fr.mul(c, d);

            // x^2
            let x2 = Fr.neg(Fr.add(b, Fr.add(c, d)));

            // x^1
            let x1 = Fr.add(bc, bd);
            x1 = Fr.add(x1, cd);

            // x^0
            let x0 = Fr.neg(Fr.mul(b, cd));

            let den = Fr.mul(a2, a);
            den = Fr.add(den, Fr.mul(x2, a2));
            den = Fr.add(den, Fr.mul(x1, a));
            den = Fr.add(den, x0);
            den = Fr.inv(den);
            den = Fr.mul(den, y);

            let buff = new Uint8Array(4 * Fr.n8);
            buff.set(Fr.mul(den, x0), 0);
            buff.set(Fr.mul(den, x1), 32);
            buff.set(Fr.mul(den, x2), 64);
            buff.set(den, 96);

            return new Polynomial(buff, Fr);
        }
    }

    static lagrangeInterpolationFrom6Points(xArr, yArr, Fr) {
        if (xArr.length !== 6 || yArr.length !== 6) {
            throw new Error("Lagrange Interpolation 6 needs 6 x's and 6 y's");
        }

        return Lagrange6Optimized(xArr, yArr);

        // let pol = Lagrange6(yArr[0], xArr[0], xArr[1], xArr[2], xArr[3], xArr[4], xArr[5]);
        // pol.add(Lagrange6(yArr[1], xArr[1], xArr[2], xArr[3], xArr[4], xArr[5], xArr[0]));
        // pol.add(Lagrange6(yArr[2], xArr[2], xArr[3], xArr[4], xArr[5], xArr[0], xArr[1]));
        // pol.add(Lagrange6(yArr[3], xArr[3], xArr[4], xArr[5], xArr[0], xArr[1], xArr[2]));
        // pol.add(Lagrange6(yArr[4], xArr[4], xArr[5], xArr[0], xArr[1], xArr[2], xArr[3]));
        // pol.add(Lagrange6(yArr[5], xArr[5], xArr[0], xArr[1], xArr[2], xArr[3], xArr[4]));
        //
        // return pol;

        function Lagrange6(y, a, b, c, d, e, f) {
            const a2 = Fr.square(a);
            const a3 = Fr.mul(a2, a);
            const a4 = Fr.square(a2);

            const bc = Fr.mul(b, c);
            const bd = Fr.mul(b, d);
            const be = Fr.mul(b, e);
            const bf = Fr.mul(b, f);
            const cd = Fr.mul(c, d);
            const ce = Fr.mul(c, e);
            const cf = Fr.mul(c, f);
            const de = Fr.mul(d, e);
            const df = Fr.mul(d, f);
            const ef = Fr.mul(e, f);

            // x^4
            let x4 = Fr.neg(Fr.add(f, Fr.add(e, Fr.add(d, Fr.add(c, b)))));

            // x^3
            let x3 = Fr.add(bf, cf);
            x3 = Fr.add(x3, df);
            x3 = Fr.add(x3, ef);
            x3 = Fr.add(x3, be);
            x3 = Fr.add(x3, ce);
            x3 = Fr.add(x3, de);
            x3 = Fr.add(x3, bd);
            x3 = Fr.add(x3, cd);
            x3 = Fr.add(x3, bc);

            // x^2
            let x2 = Fr.mul(b, cd);
            x2 = Fr.add(x2, Fr.mul(b, ce));
            x2 = Fr.add(x2, Fr.mul(b, cf));
            x2 = Fr.add(x2, Fr.mul(b, de));
            x2 = Fr.add(x2, Fr.mul(b, df));
            x2 = Fr.add(x2, Fr.mul(b, ef));
            x2 = Fr.add(x2, Fr.mul(c, de));
            x2 = Fr.add(x2, Fr.mul(c, df));
            x2 = Fr.add(x2, Fr.mul(c, ef));
            x2 = Fr.add(x2, Fr.mul(d, ef));
            x2 = Fr.neg(x2);

            let x1 = Fr.mul(bc, de);
            x1 = Fr.add(x1, Fr.mul(bc, df));
            x1 = Fr.add(x1, Fr.mul(bc, ef));
            x1 = Fr.add(x1, Fr.mul(bd, ef));
            x1 = Fr.add(x1, Fr.mul(cd, ef));

            let x0 = Fr.neg(Fr.mul(b, Fr.mul(cd, ef)));

            let den = Fr.mul(a4, a);
            den = Fr.add(den, Fr.mul(x4, a4));
            den = Fr.add(den, Fr.mul(x3, a3));
            den = Fr.add(den, Fr.mul(x2, a2));
            den = Fr.add(den, Fr.mul(x1, a));
            den = Fr.add(den, x0);
            den = Fr.inv(den);
            den = Fr.mul(den, y);

            let buff = new Uint8Array(6 * Fr.n8);
            buff.set(Fr.mul(den, x0), 0);
            buff.set(Fr.mul(den, x1), 32);
            buff.set(Fr.mul(den, x2), 64);
            buff.set(Fr.mul(den, x3), 96);
            buff.set(Fr.mul(den, x4), 128);
            buff.set(den, 160);

            return new Polynomial(buff, Fr);
        }

        function Lagrange6Optimized(xArr, yArr) {
            // First step
            const x0_2 = Fr.square(xArr[0]);
            const x1_2 = Fr.square(xArr[1]);
            const x2_2 = Fr.square(xArr[2]);
            const x3_2 = Fr.square(xArr[3]);
            const x4_2 = Fr.square(xArr[4]);
            const x5_2 = Fr.square(xArr[5]);

            const x0_3 = Fr.mul(x0_2, xArr[0]);
            const x1_3 = Fr.mul(x1_2, xArr[1]);
            const x2_3 = Fr.mul(x2_2, xArr[2]);
            const x3_3 = Fr.mul(x3_2, xArr[3]);
            const x4_3 = Fr.mul(x4_2, xArr[4]);
            const x5_3 = Fr.mul(x5_2, xArr[5]);

            const x0_4 = Fr.square(x0_2);
            const x1_4 = Fr.square(x1_2);
            const x2_4 = Fr.square(x2_2);
            const x3_4 = Fr.square(x3_2);
            const x4_4 = Fr.square(x4_2);
            const x5_4 = Fr.square(x5_2);

            const x01 = Fr.mul(xArr[0], xArr[1]);
            const x02 = Fr.mul(xArr[0], xArr[2]);
            const x03 = Fr.mul(xArr[0], xArr[3]);
            const x04 = Fr.mul(xArr[0], xArr[4]);
            const x05 = Fr.mul(xArr[0], xArr[5]);
            const x12 = Fr.mul(xArr[1], xArr[2]);
            const x13 = Fr.mul(xArr[1], xArr[3]);
            const x14 = Fr.mul(xArr[1], xArr[4]);
            const x15 = Fr.mul(xArr[1], xArr[5]);
            const x23 = Fr.mul(xArr[2], xArr[3]);
            const x24 = Fr.mul(xArr[2], xArr[4]);
            const x25 = Fr.mul(xArr[2], xArr[5]);
            const x34 = Fr.mul(xArr[3], xArr[4]);
            const x35 = Fr.mul(xArr[3], xArr[5]);
            const x45 = Fr.mul(xArr[4], xArr[5]);

            let res = [];
            res[0] = lagrange6i(yArr[0], xArr[0], x0_2, x0_3, x0_4, xArr[1], xArr[2], xArr[3], xArr[4], xArr[5],
                x12, x13, x14, x15, x23, x24, x25, x34, x35, x45);
            res[1] = lagrange6i(yArr[1], xArr[1], x1_2, x1_3, x1_4, xArr[2], xArr[3], xArr[4], xArr[5], xArr[0],
                x23, x24, x25, x02, x34, x35, x03, x45, x04, x05);
            res[2] = lagrange6i(yArr[2], xArr[2], x2_2, x2_3, x2_4, xArr[3], xArr[4], xArr[5], xArr[0], xArr[1],
                x34, x35, x03, x13, x45, x04, x14, x05, x15, x01);
            res[3] = lagrange6i(yArr[3], xArr[3], x3_2, x3_3, x3_4, xArr[4], xArr[5], xArr[0], xArr[1], xArr[2],
                x45, x04, x14, x24, x05, x15, x25, x01, x02, x12);
            res[4] = lagrange6i(yArr[4], xArr[4], x4_2, x4_3, x4_4, xArr[5], xArr[0], xArr[1], xArr[2], xArr[3],
                x05, x15, x25, x35, x01, x02, x03, x12, x13, x23);
            res[5] = lagrange6i(yArr[5], xArr[5], x5_2, x5_3, x5_4, xArr[0], xArr[1], xArr[2], xArr[3], xArr[4],
                x01, x02, x03, x04, x12, x13, x14, x23, x24, x34);

            let buff = new Uint8Array(6 * Fr.n8);
            for (let i = 0; i < 6; i++) {
                if (i === 0) {
                    buff.set(res[i][0], 0);
                    buff.set(res[i][1], 32);
                    buff.set(res[i][2], 64);
                    buff.set(res[i][3], 96);
                    buff.set(res[i][4], 128);
                    buff.set(res[i][5], 160);
                } else {
                    buff.set(Fr.add(buff.slice(0, 32), res[i][0]), 0);
                    buff.set(Fr.add(buff.slice(32, 64), res[i][1]), 32);
                    buff.set(Fr.add(buff.slice(64, 96), res[i][2]), 64);
                    buff.set(Fr.add(buff.slice(96, 128), res[i][3]), 96);
                    buff.set(Fr.add(buff.slice(128, 160), res[i][4]), 128);
                    buff.set(Fr.add(buff.slice(160, 192), res[i][5]), 160);
                }
            }

            return new Polynomial(buff, Fr);

            function lagrange6i(y, a, a2, a3, a4, b, c, d, e, f, bc, bd, be, bf, cd, ce, cf, de, df, ef) {
                // x^4
                let coef4 = Fr.neg(Fr.add(f, Fr.add(e, Fr.add(d, Fr.add(c, b)))));

                // x^3
                let coef3 = Fr.add(bf, cf);
                coef3 = Fr.add(coef3, df);
                coef3 = Fr.add(coef3, ef);
                coef3 = Fr.add(coef3, be);
                coef3 = Fr.add(coef3, ce);
                coef3 = Fr.add(coef3, de);
                coef3 = Fr.add(coef3, bd);
                coef3 = Fr.add(coef3, cd);
                coef3 = Fr.add(coef3, bc);

                // x^2
                let coef2 = Fr.mul(b, cd);
                coef2 = Fr.add(coef2, Fr.mul(b, ce));
                coef2 = Fr.add(coef2, Fr.mul(b, cf));
                coef2 = Fr.add(coef2, Fr.mul(b, de));
                coef2 = Fr.add(coef2, Fr.mul(b, df));
                coef2 = Fr.add(coef2, Fr.mul(b, ef));
                coef2 = Fr.add(coef2, Fr.mul(c, de));
                coef2 = Fr.add(coef2, Fr.mul(c, df));
                coef2 = Fr.add(coef2, Fr.mul(c, ef));
                coef2 = Fr.add(coef2, Fr.mul(d, ef));
                coef2 = Fr.neg(coef2);

                let coef1 = Fr.mul(bc, de);
                coef1 = Fr.add(coef1, Fr.mul(bc, df));
                coef1 = Fr.add(coef1, Fr.mul(bc, ef));
                coef1 = Fr.add(coef1, Fr.mul(bd, ef));
                coef1 = Fr.add(coef1, Fr.mul(cd, ef));

                let coef0 = Fr.neg(Fr.mul(b, Fr.mul(cd, ef)));

                let den = Fr.mul(a4, a);
                den = Fr.add(den, Fr.mul(coef4, a4));
                den = Fr.add(den, Fr.mul(coef3, a3));
                den = Fr.add(den, Fr.mul(coef2, a2));
                den = Fr.add(den, Fr.mul(coef1, a));
                den = Fr.add(den, coef0);
                den = Fr.inv(den);
                den = Fr.mul(den, y);

                return [Fr.mul(den, coef0), Fr.mul(den, coef1), Fr.mul(den, coef2), Fr.mul(den, coef3), Fr.mul(den, coef4), den];
            }
        }
    }

    static lagrangeInterpolationGeneric(xArr, yArr, Fr) {
        let polynomial = computeLagrangePolynomial(0);
        for (let i = 1; i < xArr.length; i++) {
            polynomial.add(computeLagrangePolynomial(i));
        }

        return polynomial;

        function computeLagrangePolynomial(i) {
            let polynomial;

            for (let j = 0; j < xArr.length; j++) {
                if (j === i) continue;

                if (polynomial === undefined) {
                    let buff = (xArr.length + 1) > 2 << 14 ?
                        new BigBuffer((xArr.length + 1) * Fr.n8) : new Uint8Array((xArr.length + 1) * Fr.n8);
                    polynomial = new Polynomial(buff, Fr);
                    polynomial.setCoef(0, Fr.neg(xArr[j]));
                    polynomial.setCoef(1, Fr.one);
                } else {
                    polynomial.byXSubValue(xArr[j]);
                }
            }

            let denominator = polynomial.evaluate(xArr[i]);
            denominator = Fr.inv(denominator);
            const mulFactor = Fr.mul(yArr[i], denominator);

            polynomial.mulScalar(mulFactor);

            return polynomial;
        }
    }

    static zerofierPolynomial(xArr, Fr) {
        let buff = (xArr.length + 1) > 2 << 14 ?
            new BigBuffer((xArr.length + 1) * Fr.n8) : new Uint8Array((xArr.length + 1) * Fr.n8);
        let polynomial = new Polynomial(buff, Fr);

        // Build a zerofier polynomial with the following form:
        // zerofier(X) = (X-xArr[0])(X-xArr[1])...(X-xArr[n])
        polynomial.setCoef(0, Fr.neg(xArr[0]));
        polynomial.setCoef(1, Fr.one);

        for (let i = 1; i < xArr.length; i++) {
            polynomial.byXSubValue(xArr[i]);
        }

        return polynomial;
    }

    print() {
        const Fr = this.Fr;
        let res = "";
        for (let i = this.degree(); i >= 0; i--) {
            const coef = this.getCoef(i);
            if (!Fr.eq(Fr.zero, coef)) {
                if (Fr.isNegative(coef)) {
                    res += " - ";
                } else if (i !== this.degree()) {
                    res += " + ";
                }
                res += Fr.toString(coef);
                if (i > 0) {
                    res += i > 1 ? "x^" + i : "x";
                }
            }
        }
        console.log(res);
    }
}