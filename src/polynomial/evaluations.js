import {BigBuffer} from "ffjavascript";

export class Evaluations {
    constructor(evaluations = [], Fr, logger) {
        this.eval = evaluations;
        this.Fr = Fr;
        this.logger = logger;
    }

    static async fromPolynomial(polynomial, Fr, logger) {
        const coefficients4 = new BigBuffer(polynomial.length * 4 * Fr.n8);
        coefficients4.set(polynomial.coef, 0);

        const evaluations = await Fr.fft(coefficients4);

        return new Evaluations(evaluations, Fr, logger);
    }

    get length() {
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