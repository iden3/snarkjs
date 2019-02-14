/*
    Copyright 2018 0kims association.

    This file is part of snarkjs.

    snarkjs is a free software: you can redistribute it and/or
    modify it under the terms of the GNU General Public License as published by the
    Free Software Foundation, either version 3 of the License, or (at your option)
    any later version.

    snarkjs is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
    more details.

    You should have received a copy of the GNU General Public License along with
    snarkjs. If not, see <https://www.gnu.org/licenses/>.
*/

const bigInt = require("./bigint");
const fUtils = require("./futils.js");

function getRandomByte() {
    if (typeof window !== "undefined") { // Browser
        if (typeof window.crypto !== "undefined") { // Supported
            let array = new Uint8Array(1);
            window.crypto.getRandomValues(array);
            return array[0];
        }
        else { // fallback
            return Math.floor(Math.random() * 256);
        }
    }
    else { // NodeJS
        return module.require("crypto").randomBytes(1)[0];
    }
}

class ZqField {
    constructor(q) {
        this.q = bigInt(q);
        this.zero = bigInt.zero;
        this.one = bigInt.one;
        this.minusone = this.q.sub(this.one);
        this.add = bigInt.genAdd();
        this.double = bigInt.genDouble();
        this.sub = bigInt.genSub();
        this.neg = bigInt.genNeg();
        this.mul = bigInt.genMul(q);
        this.inverse = bigInt.genInverse(q);
        this.square = bigInt.genSquare(q);
        this.equals = bigInt.genEquals(q);
        this.affine = bigInt.genAffine(q);
        this.isZero = bigInt.genIsZero(q);
        this.two = this.add(this.one, this.one);
        this.twoinv = this.inverse(this.two);

        const e = this.minusone.shr(this.one);
        this.nqr = this.two;
        let r = this.exp(this.nqr, e);
        while (!r.equals(this.minusone)) {
            this.nqr = this.nqr.add(this.one);
            r = this.exp(this.nqr, e);
        }

        this.s = this.zero;
        this.t = this.minusone;

        while (!this.t.isOdd()) {
            this.s = this.s.add(this.one);
            this.t = this.t.shr(this.one);
        }

        this.nqr_to_t = this.exp(this.nqr, this.t);
    }

    copy(a) {
        return bigInt(a);
    }

    div(a, b) {
        return this.mul(a, this.inverse(b));
    }

    mulScalar(base, e) {
        return this.mul(base, bigInt(e));
    }

    exp(base, e) {
        return fUtils.exp(this, base, e);
    }

    toString(a) {
        const ca = this.affine(a);
        return `"0x${ca.toString(16)}"`;
    }

    random() {
        let res = bigInt(0);
        let n = bigInt(this.q);
        while (!n.isZero()) {
            res = res.shl(8).add(bigInt(getRandomByte()));
            n = n.shr(8);
        }
        return res;
    }

    sqrt(n) {

        n = this.affine(n);

        if (n.equals(this.zero)) return this.zero;

        // Test that have solution
        const res = this.exp(n, this.minusone.shr(this.one));
        if (!res.equals(this.one)) return null;

        let m = parseInt(this.s);
        let c = this.nqr_to_t;
        let t = this.exp(n, this.t);
        let r = this.exp(n, this.add(this.t, this.one).shr(this.one) );

        while (!t.equals(this.one)) {
            let sq = this.square(t);
            let i = 1;
            while (!sq.equals(this.one)) {
                i++;
                sq = this.square(sq);
            }

            // b = c ^ m-i-1
            let b = c;
            for (let j=0; j< m-i-1; j ++) b = this.square(b);

            m = i;
            c = this.square(b);
            t = this.mul(t, c);
            r = this.mul(r, b);
        }

        if (r.greater(this.q.shr(this.one))) {
            r = this.neg(r);
        }

        return r;
    }

}


module.exports = ZqField;
