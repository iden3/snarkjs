export class Polynomial {
    constructor(coefficients = [], evaluations = [], Fr) {
        this.coef = coefficients;
        this.eval = evaluations;
        this.Fr = Fr;
    }

    get degree() {
        if (0 === this.coef.length) {
            return 0;
        }

        for (let i = this.coef.length - 1; i > 0; i--) {
            if (this.Fr.eq(this.Fr.zero, this.coef[i])) {
                return i;
            }
        }

        return 0;
    }
}
