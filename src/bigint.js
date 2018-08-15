/* global BigInt */
const bigInt = require("big-integer");

if (typeof(BigInt) != "undefined") {
    const wBigInt  = BigInt;

    wBigInt.prototype.affine = function (q) {
        let aux = this;
        if (aux < 0) {
            if (aux <= -q) {
                aux = aux % q;
            }
            if (aux.isNegative()) {
                aux = aux.add(q);
            }
        } else {
            if (aux >= q) {
                aux = aux % q;
            }
        }
        return aux;
    };

    wBigInt.prototype.modInv = function (q) {
        let t = wBigInt.zero;
        let r = q;
        let newt = wBigInt.one;
        let newr = this.affine(q);
        while (newr!=wBigInt.zero) {
            let q = r/newr;
            [t, newt] = [newt, t-q*newt];
            [r, newr] = [newr, r-q*newr];
        }
        if (t<wBigInt.zero) t += q;
        return t;
    };

    wBigInt.prototype.add = function(b) {
        return this+b;
    };

    wBigInt.prototype.minus = function(b) {
        return this-b;
    };

    wBigInt.prototype.times = function(b) {
        return this*b;
    };

    wBigInt.prototype.mod = function(q) {
        return this%q;
    };

    wBigInt.prototype.square = function() {
        return this*this;
    };

    wBigInt.prototype.double = function() {
        return this+this;
    };

    wBigInt.prototype.isOdd = function() {
        return (this & wBigInt.one) == 1;
    };

    wBigInt.prototype.isZero = function() {
        return (this == wBigInt.zero);
    };

    wBigInt.prototype.isNegative = function() {
        return this < wBigInt.zero;
    };

    wBigInt.prototype.shiftRight = function(f) {
        return this >> wBigInt(f);
    };

    wBigInt.prototype.greaterOrEquals = function(b) {
        return this >= b;
    };

    wBigInt.prototype.lesserOrEquals = function(b) {
        return this <= b;
    };

    wBigInt.prototype.equals = function(b) {
/*        console.log("..");
        console.log(this);
        console.log(b);
        console.log(this == b);
        console.log(".."); */
        return this.valueOf() == b.valueOf();
    };

    wBigInt.prototype.mulMod = function(q, b) {
        return this * b % q;
    };

    wBigInt.one = BigInt(1);
    wBigInt.zero = BigInt(0);

    module.exports = wBigInt;
} else {

    bigInt.prototype.mulMod = function(q, b) {
        return this.times(b).mod(q);
    };

    bigInt.prototype.affine = function (q) {
        let aux = this;
        if (aux.isNegative()) {
            const nq = bigInt.zero.minus(q);
            if (aux.lesserOrEquals(nq)) {
                aux = aux.mod(q);
            }
            if (aux.isNegative()) {
                aux = aux.add(q);
            }
        } else {
            if (aux.greaterOrEquals(q)) {
                aux = aux.mod(q);
            }
        }
        return aux;
    };

    module.exports = bigInt;
}
