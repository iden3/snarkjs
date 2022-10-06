import {BigBuffer} from "ffjavascript";

export class Polynomial {
    constructor(coefficients = new Uint8Array(0), Fr, logger) {
        this.coef = coefficients;
        this.Fr = Fr;
        this.logger = logger;
    }

    static async fromBuffer(buffer, Fr, logger) {
        let coefficients = await Fr.ifft(buffer);

        return new Polynomial(coefficients, Fr, logger);
    }

    blindCoefficients(blindingFactors) {
        blindingFactors = blindingFactors || [];

        const blindedCoefficients = new BigBuffer((this.length + blindingFactors.length) * this.Fr.n8);
        blindedCoefficients.set(this.coef, 0);
        for (let i = 0; i < blindingFactors.length; i++) {
            blindedCoefficients.set(
                this.Fr.add(
                    blindedCoefficients.slice((this.length + i) * this.Fr.n8, (this.length + i + 1) * this.Fr.n8),
                    blindingFactors[i]
                ),
                (this.length + i) * this.Fr.n8
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
        if (index > this.degree()) {
            return this.Fr.zero;
        }

        const i_n8 = index * this.Fr.n8;
        return this.coef.slice(i_n8, i_n8 + this.Fr.n8);
    }

    static async to4T(buffer, domainSize, blindingFactors, Fr, logger) {
        blindingFactors = blindingFactors || [];
        let coefs = await Fr.ifft(buffer);

        const blindedCoefs = new BigBuffer((domainSize + blindingFactors.length) * Fr.n8);
        blindedCoefs.set(coefs, 0);
        for (let i = 0; i < blindingFactors.length; i++) {
            blindedCoefs.set(
                Fr.add(
                    blindedCoefs.slice((domainSize + i) * Fr.n8, (domainSize + i + 1) * Fr.n8),
                    blindingFactors[i]
                ),
                (domainSize + i) * Fr.n8
            );
            blindedCoefs.set(
                Fr.sub(
                    blindedCoefs.slice(i * Fr.n8, (i + 1) * Fr.n8),
                    blindingFactors[i]
                ),
                i * Fr.n8
            );
        }

        return new Polynomial(blindedCoefs, Fr, logger);
    }

    get length() {
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
        for (let i = this.length - 1; i > 0; i--) {
            const i_n8 = i * this.Fr.n8;
            if (!this.Fr.eq(this.Fr.zero, this.coef.slice(i_n8, i_n8 + this.Fr.n8))) {
                return i;
            }
        }

        return 0;
    }

    evaluate(point) {
        let res = this.Fr.zero;

        for (let i = this.length; i > 0; i--) {
            let i_n8 = (i - 1) * this.Fr.n8;
            const currentCoefficient = this.coef.slice(i_n8, i_n8 + this.Fr.n8);
            res = this.Fr.add(currentCoefficient, this.Fr.mul(res, point));
        }

        return res;
    }

    add(polynomial, blindingValue) {
        let srcPol, dstPol;

        if ((polynomial.degree() + 1) > this.length) {
            srcPol = polynomial;
            dstPol = this;
        } else {
            dstPol = polynomial;
            srcPol = this;
        }

        const thisDegree = srcPol.degree();
        const polyDegree = dstPol.degree();
        for (let i = 0; i < srcPol.length; i++) {
            const i_n8 = i * this.Fr.n8;

            const a = i <= thisDegree ? srcPol.coef.slice(i_n8, i_n8 + this.Fr.n8) : this.Fr.zero;
            let b = i < polyDegree ? dstPol.coef.slice(i_n8, i_n8 + this.Fr.n8) : this.Fr.zero;
            if (blindingValue !== undefined) {
                b = this.Fr.mul(b, blindingValue);
            }
            srcPol.coef.set(this.Fr.add(a, b), i_n8);
        }

        this.coef = srcPol.coef;
    }

    sub(polynomial, blindingValue) {
        // Due to performance reasons currently we only accept to add polynomials with equal or smaller size
        if (polynomial.length > this.length) {
            throw new Error("Add a greater size polynomial is not allowed");
        }

        for (let i = 0; i < this.length; i++) {
            const i_n8 = i * this.Fr.n8;

            const a = i < this.degree() ? this.coef.slice(i_n8, i_n8 + this.Fr.n8) : this.Fr.zero;
            let b = i < polynomial.degree() ? polynomial.coef.slice(i_n8, i_n8 + this.Fr.n8) : this.Fr.zero;
            if (blindingValue !== undefined) {
                b = this.Fr.mul(b, blindingValue);
            }
            this.coef.set(this.Fr.sub(a, b), i_n8);
        }
    }

    mulScalar(value) {
        for (let i = 0; i < this.length; i++) {
            const i_n8 = i * this.Fr.n8;

            this.coef.set(this.Fr.mul(this.coef.slice(i_n8, i_n8 + this.Fr.n8), value), i_n8);
        }
    }

    addScalar(value) {
        const currentValue = 0 === this.length ? this.Fr.zero : this.coef.slice(0, this.Fr.n8);
        this.coef.set(this.Fr.add(currentValue, value), 0);
    }

    subScalar(value) {
        const currentValue = 0 === this.length ? this.Fr.zero : this.coef.slice(0, this.Fr.n8);
        this.coef.set(this.Fr.sub(currentValue, value), 0);
    }

    // Divide polynomial by X - value
    divByXValue(value) {
        const coefs = new BigBuffer(this.length * this.Fr.n8);

        coefs.set(this.Fr.zero, (this.length - 1) * this.Fr.n8);
        coefs.set(this.coef.slice((this.length - 1) * this.Fr.n8, this.length * this.Fr.n8), (this.length - 2) * this.Fr.n8);
        for (let i = this.length - 3; i >= 0; i--) {
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
        const domainSize = this.coef.byteLength / this.Fr.n8;
        const coefs = new BigBuffer(domainSize * 4 * this.Fr.n8);

        if (this.logger) this.logger.debug("dividing T/Z_H");
        for (let i = 0; i < domainSize; i++) {
            const i_n8 = i * this.Fr.n8;
            coefs.set(this.Fr.neg(this.coef.slice(i_n8, i_n8 + this.Fr.n8)), i_n8);
        }

        for (let i = domainSize; i < domainSize * 4; i++) {
            const i_n8 = i * this.Fr.n8;

            const a = this.Fr.sub(
                coefs.slice((i - domainSize) * this.Fr.n8, (i - domainSize) * this.Fr.n8 + this.Fr.n8),
                this.coef.slice(i_n8, i_n8 + this.Fr.n8)
            );
            coefs.set(a, i_n8);
            if (i > (domainSize * 3 - 4)) {
                if (!this.Fr.isZero(a)) {
                    //throw new Error("range_check T Polynomial is not divisible");
                }
            }
        }

        return new Polynomial(coefs, this.Fr);
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

            res[i] = new Polynomial(new BigBuffer(byteLength), this.Fr, this.logger);
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
            const newCoefs = new BigBuffer((deg + 1) * this.Fr.n8);
            newCoefs.set(this.coef.slice(0, (deg + 1) * this.Fr.n8), 0);
            this.coef = newCoefs;
        }
    }

    async expTau(PTau, curve, logger, name) {
        const n = this.coef.byteLength / curve.Fr.n8;
        const PTauN = PTau.slice(0, n * curve.G1.F.n8 * 2);
        const bm = await curve.Fr.batchFromMontgomery(this.coef);
        let res = await curve.G1.multiExpAffine(PTauN, bm, logger, name);
        res = curve.G1.toAffine(res);
        return res;
    }
}