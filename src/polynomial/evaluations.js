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
}