const fUtils = require("./futils.js");

class RatField {
    constructor(F) {
        this.F = F;
        this.zero = [F.zero, F.one];
        this.one = [F.one, F.one];
        this.two = [F.two, F.one];
        this.twoinv = [F.one, F.two];
        this.q = F.q;
    }

    add(a,b) {
        return [
            this.F.add(
                this.F.mul(a[0], b[1]),
                this.F.mul(a[1], b[0])),
            this.F.mul(a[1], b[1])];
    }

    double(a) {
        return [this.F.add(a[0], a[0]), a[1]];
    }

    sub(a,b) {
        return [
            this.F.sub(
                this.F.mul(a[0], b[1]),
                this.F.mul(a[1], b[0])),
            this.F.mul(a[1], b[1])];
    }

    neg(a) {
        return [this.F.neg(a[0]), a[1]];
    }

    mul(a,b) {
        return [
            this.F.mul(a[0], b[0]),
            this.F.mul(a[1], b[1]),
        ];
    }

    copy(a) {
        return [a[0], a[1]];
    }

    div(a, b) {
        return [
            this.F.mul(a[0], b[1]),
            this.F.mul(a[1], b[0]),
        ];
    }

    inverse(a) {
        return [a[1], a[0]];
    }

    square(a) {
        return [
            this.F.square(a[0]),
            this.F.square(a[1])
        ];
    }

    mulScalar(base, e) {
        return [this.F.mulScalar(base[0], e) , base[1]];
    }

    exp(base, e) {
        return fUtils.exp(this, base, e);
    }

    equals(a, b) {
        return this.F.equals(
            this.F.mul(a[0], b[1]),
            this.F.mul(a[1], b[0])
        );
    }

    isZero(a) {
        return this.F.isZero(a[0]);
    }

    affine(a) {
        return [this.F.div(a[0], a[1]), this.F.one];
    }

    toString(a) {
        const ca = this.affine(a);
        return `"0x${ca[0].toString(16)}"`;
    }

    random() {
        return [this.F.random(), this.F.one];
    }

    fromF(a) {
        return [a, this.F.one];
    }

    toF(a) {
        return this.affine(a)[0];
    }
}


module.exports = RatField;
