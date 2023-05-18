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
    constructor(coefficients, curve, logger) {
        this.coef = coefficients;
        this.curve = curve;
        this.Fr = curve.Fr;
        this.G1 = curve.G1;
        this.logger = logger;
    }

    static async fromEvaluations(buffer, curve, logger) {
        let coefficients = await curve.Fr.ifft(buffer);

        return new Polynomial(coefficients, curve, logger);
    }

    static fromCoefficientsArray(array, curve, logger) {
        const Fr = curve.Fr;
        let buff = array.length > 2 << 14 ?
            new BigBuffer(array.length * Fr.n8) : new Uint8Array(array.length * Fr.n8);
        for (let i = 0; i < array.length; i++) buff.set(array[i], i * Fr.n8);

        return new Polynomial(buff, curve, logger);
    }

    static fromPolynomial(polynomial, curve, logger) {
        let length = polynomial.length();
        let Fr = curve.Fr;

        let buff = length > 2 << 14 ?
            new BigBuffer(length * Fr.n8) : new Uint8Array(length * Fr.n8);
        buff.set(polynomial.coef.slice(), 0);

        return new Polynomial(buff, curve, logger);
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

        if (i_n8 + this.Fr.n8 > this.coef.byteLength) return this.Fr.zero;

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

        for (let i = this.degree() + 1; i > 0; i--) {
            let i_n8 = i * this.Fr.n8;
            const currentCoefficient = this.coef.slice(i_n8 - this.Fr.n8, i_n8);
            res = this.Fr.add(currentCoefficient, this.Fr.mul(res, point));
        }

        return res;
    }

    fastEvaluate(point) {
        const Fr = this.Fr;
        let nThreads = 3;

        let nCoefs = this.degree() + 1;
        let coefsThread = parseInt(nCoefs / nThreads);
        let residualCoefs = nCoefs - coefsThread * nThreads;

        let res = [];
        let xN = [];

        xN[0] = Fr.one;

        for (let i = 0; i < nThreads; i++) {
            res[i] = Fr.zero;

            let nCoefs = i === (nThreads - 1) ? coefsThread + residualCoefs : coefsThread;
            for (let j = nCoefs; j > 0; j--) {
                res[i] = Fr.add(this.getCoef((i * coefsThread) + j - 1), Fr.mul(res[i], point));

                if (i === 0) xN[0] = Fr.mul(xN[0], point);
            }
        }

        for (let i = 1; i < nThreads; i++) {
            res[0] = Fr.add(res[0], Fr.mul(xN[i - 1], res[i]));
            xN[i] = Fr.mul(xN[i - 1], xN[0]);
        }

        return res[0];
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
        let pol = new Polynomial(buff, this.curve, this.logger);

        // Step 0: Set current coefficients to the new buffer shifted one position
        pol.coef.set(this.coef.slice(0, (length - 1) * Fr.n8), 32);

        // Step 1: multiply each coefficient by (-value)
        this.mulScalar(Fr.neg(value));

        // Step 2: Add current polynomial to destination polynomial
        pol.add(this);

        // Swap buffers
        this.coef = pol.coef;
    }

    // Multiply current polynomial by the polynomial (X^n + value)
    byXNSubValue(n, value) {
        const Fr = this.Fr;
        const resize = !(this.length() - n - 1 >= this.degree());

        const length = resize ? this.length() + n : this.length();
        const buff = length > 2 << 14 ? new BigBuffer(length * Fr.n8) : new Uint8Array(length * Fr.n8);
        let pol = new Polynomial(buff, this.curve, this.logger);

        // Step 0: Set current coefficients to the new buffer shifted one position
        pol.coef.set(this.coef.slice(0, (this.degree() + 1) * 32, ), n * 32);

        // Step 1: multiply each coefficient by (- value)
        this.mulScalar(value);

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

        let polR = new Polynomial(this.coef, this.curve, this.logger);

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

    // Division by a Polynomial of the form (x^m - beta)
    divByMonic(m, beta) {
        const Fr = this.Fr;

        let d = this.degree();

        let buffer = this.length() > 2 << 14 ?
            new BigBuffer(this.length() * Fr.n8) : new Uint8Array(this.length() * Fr.n8);
        let quotient = new Polynomial(buffer, this.curve, this.logger);

        let bArr = [];

        // Add the m leading coefficients of this to quotient
        for (let i = 0; i < m; i++) {
            quotient.setCoef((d - i) - m, this.getCoef(d - i));
            bArr[i] = this.getCoef(d - i);
        }

        let nThreads = m;

        let j = 0;
        for (let k = 0; k < nThreads; k++) {
            for (let i = d - 2 * m - k; i >= 0; i = i - nThreads) {
                if (i < 0) break;
                let idx = k;
                bArr[idx] = Fr.add(this.getCoef(i + m), Fr.mul(bArr[idx], beta));

                quotient.setCoef(i, bArr[idx]);
                j = (j + 1) % m;
            }
        }

        this.coef = quotient.coef;
    }

    divByVanishing(n, beta) {
        if (this.degree() < n) {
            throw new Error("divByVanishing polynomial divisor must be of degree lower than the dividend polynomial");
        }

        const Fr = this.Fr;

        let polR = new Polynomial(this.coef, this.curve, this.logger);

        this.coef = this.length() > 2 << 14 ?
            new BigBuffer(this.length() * Fr.n8) : new Uint8Array(this.length() * Fr.n8);

        for (let i = this.length() - 1; i >= n; i--) {
            let leadingCoef = polR.getCoef(i);
            if (Fr.eq(Fr.zero, leadingCoef)) continue;

            polR.setCoef(i, Fr.zero);
            polR.setCoef(i - n, Fr.add(polR.getCoef(i - n), Fr.mul(beta, leadingCoef)));
            this.setCoef(i - n, Fr.add(this.getCoef(i - n), leadingCoef));
        }

        return polR;
    }

    divByVanishing2(m, beta) {
        if (this.degree() < m) {
            throw new Error("divByVanishing polynomial divisor must be of degree lower than the dividend polynomial");
        }

        const Fr = this.Fr;

        let polR = new Polynomial(this.coef, this.curve, this.logger);

        this.coef = this.length() > 2 << 14 ?
            new BigBuffer(this.length() * Fr.n8) : new Uint8Array(this.length() * Fr.n8);

        let nThreads = 3;
        let nTotal = this.length() - m;
        let nElementsChunk = Math.floor(nTotal / nThreads);
        let nElementsLast = nTotal - (nThreads - 1) * nElementsChunk;

        console.log(nTotal);
        console.log(nElementsChunk + "  " + nElementsLast);
        for (let k = 0; k < nThreads; k++) {
            console.log("> Thread " + k);
            for (let i = (k === 0 ? nElementsLast : nElementsChunk); i > 0; i--) {
                let idxDst = i - 1;
                if (k !== 0) idxDst += (k - 1) * nElementsChunk + nElementsLast;
                let idxSrc = idxDst + m;

                let leadingCoef = polR.getCoef(idxSrc);
                if (Fr.eq(Fr.zero, leadingCoef)) continue;

                polR.setCoef(idxSrc, Fr.zero);
                polR.setCoef(idxDst, Fr.add(polR.getCoef(idxDst), Fr.mul(beta, leadingCoef)));
                this.setCoef(idxDst, Fr.add(this.getCoef(idxDst), leadingCoef));
                console.log(idxDst + " <-- " + idxSrc);
            }
        }

        this.print();
        return polR;
    }

    fastDivByVanishing(data) {
        const Fr = this.Fr;

        for (let i = 0; i < data.length; i++) {

            let m = data[i][0];
            let beta = data[i][1];

            if (this.degree() < m) {
                throw new Error("divByVanishing polynomial divisor must be of degree lower than the dividend polynomial");
            }

            let nThreads = 5;
            let nElements = this.length() - m;
            let nElementsBucket = Math.floor(nElements / nThreads / m);
            let nElementsChunk = nElementsBucket * m;
            let nElementsLast = nElements - nThreads * nElementsChunk;

            //In C++ implementation this buffer will be allocated only once outside the loop
            let polTmp = new Polynomial(this.length() > 2 << 14 ?
                new BigBuffer(this.length() * Fr.n8) : new Uint8Array(this.length() * Fr.n8), this.curve, this.logger);

            let ptr = this.coef;
            this.coef = polTmp.coef;
            polTmp.coef = ptr;

            // STEP 1: Setejar els m valors del següent bucket al chunk actual, PARALEL·LITZAR
            for (let k = 0; k < nThreads; k++) {
                let idx0 = (k + 1) * nElementsChunk + nElementsLast;
                for (let i = 0; i < m; i++) {
                    this.setCoef(idx0 + i - m, polTmp.getCoef(idx0 + i));
                }

                for (let i = 0; i < nElementsChunk - m; i++) {
                    let offset = idx0 - i - 1;
                    let val = Fr.add(polTmp.getCoef(offset), Fr.mul(beta, this.getCoef(offset)));
                    this.setCoef(offset - m, val);
                }
            }

            //STEP 2: Setejar els valors del elements last NO PARAL·LELITZAR
            let idx0 = nElementsLast;
            let pending = nElementsLast;
            for (let i = 0; i < m && pending; i++) {
                this.setCoef(idx0 - i - 1, polTmp.getCoef(idx0 + m - i - 1));
                pending--;
            }

            for (let i = 0; i < pending; i++) {
                let offset = idx0 - i - 1;
                let val = Fr.add(polTmp.getCoef(offset), Fr.mul(beta, this.getCoef(offset)));
                this.setCoef(offset - m, val);
            }

            //Step 3: calcular acumulats NO  PARALEL·LITZAR

            let acc = [];
            let betaPow = Fr.one;
            for (let i = 0; i < nElementsBucket; i++) {
                betaPow = Fr.mul(betaPow, beta);
            }
            let currentBeta = Fr.one;

            for (let k = nThreads; k > 0; k--) {
                let idThread = k - 1;
                let idx0 = idThread * nElementsChunk + nElementsLast;
                acc[idThread] = [];

                for (let i = 0; i < m; i++) {
                    acc[idThread][i] = this.getCoef(idx0 + i);

                    if (k !== nThreads) {
                        acc[idThread][i] = Fr.add(acc[idThread][i], Fr.mul(betaPow, acc[idThread + 1][i]));
                    }
                }
                currentBeta = Fr.mul(currentBeta, betaPow);
            }

            //STEP 4 recalcular  PARALEL·LITZAR
            for (let k = 0; k < nThreads; k++) {

                let idx0 = k * nElementsChunk + nElementsLast;
                let currentBeta = beta; //Quan hopassem a C++ i ho paralelitzem aquesta variable ha de ser privada
                let currentM = m - 1;

                let limit = k === 0 ? nElementsLast : nElementsChunk;
                for (let i = 0; i < limit; i++) {
                    let offset = idx0 - i - 1;
                    let val = Fr.add(this.getCoef(offset), Fr.mul(currentBeta, acc[k][currentM]));

                    this.setCoef(offset, val);

                    // To avoid modular operations in each loop...
                    if (currentM === 0) {
                        currentM = m - 1;
                        currentBeta = Fr.mul(currentBeta, beta);
                    } else {
                        currentM--;
                    }
                }
            }
        }
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
            throw new Error("Polynomial does not divide");
        }

        this.coef = coefs;
    }

    divZh(domainSize, extensions = 4) {
        for (let i = 0; i < domainSize; i++) {
            const i_n8 = i * this.Fr.n8;
            this.coef.set(this.Fr.neg(this.coef.slice(i_n8, i_n8 + this.Fr.n8)), i_n8);
        }

        const upperBound = this.coef.byteLength / this.Fr.n8;
        for (let i = domainSize; i < upperBound; i++) {
            const i_n8 = i * this.Fr.n8;

            const a = this.Fr.sub(
                this.coef.slice((i - domainSize) * this.Fr.n8, (i - domainSize) * this.Fr.n8 + this.Fr.n8),
                this.coef.slice(i_n8, i_n8 + this.Fr.n8)
            );
            this.coef.set(a, i_n8);
            if (i > (domainSize * (extensions-1) - extensions)) {
                if (!this.Fr.isZero(a)) {
                    throw new Error("Polynomial is not divisible");
                }
            }
        }

        return this;
    }

    divByZerofier(n, beta) {
        let Fr = this.Fr;
        const invBeta = Fr.inv(beta);
        const invBetaNeg = Fr.neg(invBeta);

        let isOne = Fr.eq(Fr.one, invBetaNeg);
        let isNegOne = Fr.eq(Fr.negone, invBetaNeg);

        if (!isOne) {
            for (let i = 0; i < n; i++) {
                const i_n8 = i * this.Fr.n8;
                let element;

                // If invBetaNeg === -1 we'll save a multiplication changing it by a neg function call
                if (isNegOne) {
                    element = Fr.neg(this.coef.slice(i_n8, i_n8 + this.Fr.n8));
                } else {
                    element = Fr.mul(invBetaNeg, this.coef.slice(i_n8, i_n8 + this.Fr.n8));
                }

                this.coef.set(element, i_n8);
            }
        }

        isOne = Fr.eq(Fr.one, invBeta);
        isNegOne = Fr.eq(Fr.negone, invBeta);

        for (let i = n; i < this.length(); i++) {
            const i_n8 = i * this.Fr.n8;
            const i_prev_n8 = (i - n) * this.Fr.n8;

            let element = this.Fr.sub(
                this.coef.slice(i_prev_n8, i_prev_n8 + this.Fr.n8),
                this.coef.slice(i_n8, i_n8 + this.Fr.n8)
            );

            // If invBeta === 1 we'll not do anything
            if(!isOne) {
                // If invBeta === -1 we'll save a multiplication changing it by a neg function call
                if(isNegOne) {
                    element = Fr.neg(element);
                } else {
                    element = Fr.mul(invBeta, element);
                }
            }

            this.coef.set(element, i_n8);

            // Check if polynomial is divisible by checking if n high coefficients are zero
            if (i > this.length() - n - 1) {
                if (!this.Fr.isZero(element)) {
                    throw new Error("Polynomial is not divisible");
                }
            }
        }

        return this;
    }

// function divideByVanishing(f, n, p) {
//     // polynomial division f(X) / (X^n - 1) with remainder
//     // very cheap, 0 multiplications
//     // strategy:
//     // start with q(X) = 0, r(X) = f(X)
//     // then start changing q, r while preserving the identity:
//     // f(X) = q(X) * (X^n - 1) + r(X)
//     // in every step, move highest-degree term of r into the product
//     // => r eventually has degree < n and we're done
//     let q = Array(f.length).fill(0n);
//     let r = [...f];
//     for (let i = f.length - 1; i >= n; i--) {
//         let leadingCoeff = r[i];
//         if (leadingCoeff === 0n) continue;
//         r[i] = 0n;
//         r[i - n] = mod(r[i - n] + leadingCoeff, p);
//         q[i - n] = mod(q[i - n] + leadingCoeff, p);
//     }
//     return [q, r];
// }

    byX() {
        const coefs = (this.length() + 1) > 2 << 14 ?
            new BigBuffer(this.coef.byteLength + this.Fr.n8) : new Uint8Array(this.coef.byteLength + this.Fr.n8);
        coefs.set(this.Fr.zero, 0);
        coefs.set(this.coef, this.Fr.n8);

        this.coef = coefs;
    }

// Compute a new polynomial f(x^n) from f(x)
// f(x)   = a_0 + a_1·x + a_2·x^2 + ... + a_j·x^j
// f(x^n) = a_0 + a_1·x^n + a_2·x^2n + ... + a_j·x^jn
    static
    async expX(polynomial, n, truncate = false) {
        const Fr = polynomial.Fr;

        if (n < 1) {
            // n == 0 not allowed because it has no sense, but if it's necessary we have to return
            // a zero degree polynomial with a constant coefficient equals to the sum of all the original coefficients
            throw new Error("Compute a new polynomial to a zero or negative number is not allowed");
        } else if (1 === n) {
            return await Polynomial.fromEvaluations(polynomial.coef, curve, polynomial.logger);
        }

        // length is the length of non-constant coefficients
        // if truncate === true, the highest zero coefficients (if exist) will be removed
        const length = truncate ? polynomial.degree() : (polynomial.length() - 1);
        const bufferDst = (length * n + 1) > 2 << 14 ?
            new BigBuffer((length * n + 1) * Fr.n8) : new Uint8Array((length * n + 1) * Fr.n8);

        // Copy constant coefficient as is because is not related to x
        bufferDst.set(polynomial.getCoef(0), 0);

        for (let i = 1; i <= length; i++) {
            const i_sFr = i * Fr.n8;

            const coef = polynomial.getCoef(i);
            bufferDst.set(coef, i_sFr * n);
        }

        return new Polynomial(bufferDst, polynomial.curve, polynomial.logger);
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
                res[i] = new Polynomial(new Uint8Array(this.Fr.n8), this.curve, this.logger);
            }
        }

        numPols = Math.min(numPols, numRealPols);
        for (let i = 0; i < numPols; i++) {
            const isLast = (numPols - 1) === i;
            const byteLength = isLast ? this.coef.byteLength - ((numPols - 1) * chunkByteLength) : chunkByteLength + this.Fr.n8;

            let buff = (byteLength / this.Fr.n8) > 2 << 14 ? new BigBuffer(byteLength) : new Uint8Array(byteLength);
            res[i] = new Polynomial(buff, this.curve, this.logger);

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

    static lagrangePolynomialInterpolation(xArr, yArr, curve) {
        const Fr = curve.Fr;
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
                    let buff = (xArr.length) > 2 << 14 ?
                        new BigBuffer((xArr.length) * Fr.n8) : new Uint8Array((xArr.length) * Fr.n8);
                    polynomial = new Polynomial(buff, curve);
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

    static zerofierPolynomial(xArr, curve) {
        const Fr = curve.Fr;
        let buff = (xArr.length + 1) > 2 << 14 ?
            new BigBuffer((xArr.length + 1) * Fr.n8) : new Uint8Array((xArr.length + 1) * Fr.n8);
        let polynomial = new Polynomial(buff, curve);

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

    async multiExponentiation(PTau, name) {
        const n = this.coef.byteLength / this.Fr.n8;
        const PTauN = PTau.slice(0, n * this.G1.F.n8 * 2);
        const bm = await this.Fr.batchFromMontgomery(this.coef);
        let res = await this.G1.multiExpAffine(PTauN, bm, this.logger, name);
        res = this.G1.toAffine(res);
        return res;
    }
}