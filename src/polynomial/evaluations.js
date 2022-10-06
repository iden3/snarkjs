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


//TODO remove from here when polynomial.expTau checked
export async function expTau(polynomial, PTau, curve, logger, name) {
    const n = polynomial.byteLength / curve.Fr.n8;
    const PTauN = PTau.slice(0, n * curve.G1.F.n8 * 2);
    const bm = await curve.Fr.batchFromMontgomery(polynomial);
    let res = await curve.G1.multiExpAffine(PTauN, bm, logger, name);
    res = curve.G1.toAffine(res);
    return res;
}