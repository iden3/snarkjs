


class F12Field {
    constructor(p) {
        this.p = n;
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
        // TODO
        throw new Error("Not Implementted");
    }

    neg(a) {
        // TODO
        throw new Error("Not Implementted");
    }

    mul(a, b) {
        // TODO
        throw new Error("Not Implementted");
    }

    inverse(a, b) {
        // TODO
        throw new Error("Not Implementted");
    }

    div(a, b) {
        // TODO
        throw new Error("Not Implementted");
    }

    isZero(a) {
        // TODO
        throw new Error("Not Implementted");
    }

    mul_by_024(a, ell0, ellVW, ellVV) {
        // TODO
        throw new Error("Not Implementted");
    }

}

module.exports = F2Field;
