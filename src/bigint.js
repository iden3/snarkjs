/* global BigInt */
const bigInt = require("big-integer");

if (typeof(BigInt) != "undefined") {
    const wBigInt  = BigInt;
    wBigInt.prototype.modInv = function (q) {
        let t = wBigInt.zero;
        let r = q;
        let newt = wBigInt.one;
        let newr = this;
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
        return this == b;
    };

    wBigInt.one = BigInt(1);
    wBigInt.zero = BigInt(0);

    module.exports = wBigInt;
} else {
    module.exports = bigInt;
}
