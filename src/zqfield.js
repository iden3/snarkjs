const bigInt = require("./bigint");
const fUtils = require("./futils.js");

class ZqField {
    constructor(q) {
        this.q = q;
        this.nq = bigInt.zero.minus(q);
        this.zero = bigInt.zero;
        this.one = bigInt.one;
    }

    copy(a) {
        return bigInt(a);
    }

    add(a, b) {
        return a.add(b);
    }

    double(a) {
        return this.add(a,a);
    }

    sub(a, b) {
        return a.minus(b);
    }

    neg(a) {
        return bigInt.zero.minus(a);
    }

    mul(a, b) {
        return a.mulMod(this.q, b);
    }

    inverse(a) {
        return a.modInv(this.q);
    }

    div(a, b) {
        return this.mul(a, this.inverse(b));
    }

    square(a) {
        return a.square().mod(this.q);
    }

    isZero(a) {
        return a.isZero();
    }

    equals(a, b) {
        return this.affine(a).equals(this.affine(b));
    }

    affine(a) {
        return a.affine(this.q);
    }

    mulEscalar(base, e) {
        return fUtils.mulEscalar(this, base, e);
    }

    exp(base, e) {
        return fUtils.exp(this, base, e);
    }

    toString(a) {
        const ca = this.affine(a);
        return `"0x${ca.toString(16)}"`;
    }
}


module.exports = ZqField;
