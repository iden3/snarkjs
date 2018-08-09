/*
    This library do operations on polinomials where their coefficients are in field F

    The polynomial P(x) = p0 + p1 * x + p2 * x^2 + p3 * x^3, ...
    is represented by the array [ p0, p1, p2, p3, ...  ]
 */

class PolField {
    constructor (F) {
        this.F = F;
    }

    _reduce(a) {
        let i = a.length-1;
        while ((i>=0) && (this.F.isZero(a[i]))  ) i--;
        return (i < a.length-1) ? a.slice(0, i+1) : a;
    }

    add(a, b) {
        const maxGrade = Math.max(a.length, b.length);
        const res = new Array(maxGrade);
        for (let i=0; i<maxGrade; i++) {
            res[i] = this.F.add(a[i], b[i]);
        }
        return this._reduce(res);
    }

    sub(a, b) {
        throw new Error("Not Implementted");
    }

    mul(a, b) {
        throw new Error("Not Implementted");
    }

    div(a, b) {
        throw new Error("Not Implementted");
    }

    lagrange(points) {
        throw new Error("Not Implementted");
    }
}


module.exports = PolField;
