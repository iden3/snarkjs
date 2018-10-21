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

const crypto = require("crypto");

const bigInt = require("./bigint");
const fUtils = require("./futils.js");

class ZqField {
    constructor(q) {
        this.q = q;
        this.zero = bigInt.zero;
        this.one = bigInt.one;
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
            res = res.shl(8).add(bigInt(crypto.randomBytes(1)[0]));
            n = n.shr(8);
        }
        return res;
    }
}


module.exports = ZqField;
