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

/* global BigInt */
const bigInt = require("big-integer");

let wBigInt;

if (typeof(BigInt) != "undefined") {
    wBigInt  = BigInt;
    wBigInt.one = wBigInt(1);
    wBigInt.zero = wBigInt(0);

    // Affine
    wBigInt.genAffine = (q) => {
        const nq = -q;
        return (a) => {
            let aux = a;
            if (aux < 0) {
                if (aux <= nq) {
                    aux = aux % q;
                }
                if (aux < wBigInt.zero) {
                    aux = aux + q;
                }
            } else {
                if (aux >= q) {
                    aux = aux % q;
                }
            }
            return aux.valueOf();
        };
    };


    // Inverse
    wBigInt.genInverse = (q) => {
        return (a) => {
            let t = wBigInt.zero;
            let r = q;
            let newt = wBigInt.one;
            let newr = wBigInt.affine(a, q);
            while (newr!=wBigInt.zero) {
                let q = r/newr;
                [t, newt] = [newt, t-q*newt];
                [r, newr] = [newr, r-q*newr];
            }
            if (t<wBigInt.zero) t += q;
            return t;
        };
    };


    // Add
    wBigInt.genAdd = (q) => {
        if (q) {
            return (a,b) => (a+b) % q;
        } else {
            return (a,b) => a+b;
        }
    };

    // Sub
    wBigInt.genSub = (q) => {
        if (q) {
            return (a,b) => (a-b) % q;
        } else {
            return (a,b) => a-b;
        }
    };


    // Neg
    wBigInt.genNeg = (q) => {
        if (q) {
            return (a) => (-a) % q;
        } else {
            return (a) => -a;
        }
    };

    // Mul
    wBigInt.genMul = (q) => {
        if (q) {
            return (a,b) => (a*b) % q;
        } else {
            return (a,b) => a*b;
        }
    };

    // Shr
    wBigInt.genShr = () => {
        return (a,b) => a >> wBigInt(b);
    };

    // Shl
    wBigInt.genShl = (q) => {
        if (q) {
            return (a,b) => (a << wBigInt(b)) % q;
        } else {
            return (a,b) => a << wBigInt(b);
        }
    };

    // Equals
    wBigInt.genEquals = (q) => {
        if (q) {
            return (a,b) => (a.affine(q) == b.affine(q));
        } else {
            return (a,b) => a == b;
        }
    };

    // Square
    wBigInt.genSquare = (q) => {
        if (q) {
            return (a) => (a*a) %q;
        } else {
            return (a) => a*a;
        }
    };


    // Double
    wBigInt.genDouble = (q) => {
        if (q) {
            return (a) => (a+a) %q;
        } else {
            return (a) => a+a;
        }
    };

    // IsZero
    wBigInt.genIsZero = (q) => {
        if (q) {
            return (a) => (a.affine(q) == wBigInt.zero);
        } else {
            return (a) =>  a == wBigInt.zero;
        }
    };


    // Other minor functions
    wBigInt.prototype.isOdd = function() {
        return (this & wBigInt.one) == wBigInt(1);
    };

    wBigInt.prototype.isNegative = function() {
        return this < wBigInt.zero;
    };

    wBigInt.prototype.and = function(m) {
        return this & m;
    };

    wBigInt.prototype.div = function(c) {
        return this / c;
    };

    wBigInt.prototype.mod = function(c) {
        return this % c;
    };

    wBigInt.prototype.pow = function(c) {
        return this ** c;
    };

    wBigInt.prototype.abs = function() {
        return (this > wBigInt.zero) ? this : -this;
    };

    wBigInt.prototype.modPow = function(e, m) {
        let acc = wBigInt.one;
        let exp = this;
        let rem = e;
        while (rem) {
            if (rem & wBigInt.one) {
                acc = (acc * exp) %m;
            }
            exp = (exp * exp) % m;
            rem = rem >> wBigInt.one;
        }
        return acc;
    };

    wBigInt.prototype.greaterOrEquals = function(b) {
        return this >= b;
    };

    wBigInt.prototype.greater = function(b) {
        return this > b;
    };
    wBigInt.prototype.gt = wBigInt.prototype.greater;

    wBigInt.prototype.lesserOrEquals = function(b) {
        return this <= b;
    };

    wBigInt.prototype.lesser = function(b) {
        return this < b;
    };
    wBigInt.prototype.lt = wBigInt.prototype.lesser;

    wBigInt.prototype.equals = function(b) {
        return this == b;
    };
    wBigInt.prototype.eq = wBigInt.prototype.equals;

    wBigInt.prototype.neq = function(b) {
        return this != b;
    };

    wBigInt.prototype.toJSNumber = function() {
        return Number(this);
    };


} else {

    var oldProto = bigInt.prototype;
    wBigInt = function(a) {
        if ((typeof a == "string") && (a.slice(0,2) == "0x")) {
            return bigInt(a.slice(2), 16);
        } else {
            return bigInt(a);
        }
    };
    wBigInt.one = bigInt.one;
    wBigInt.zero = bigInt.zero;
    wBigInt.prototype = oldProto;

    wBigInt.prototype.div = function(c) {
        return this.divide(c);
    };

    // Affine
    wBigInt.genAffine = (q) => {
        const nq = wBigInt.zero.minus(q);
        return (a) => {
            let aux = a;
            if (aux.isNegative()) {
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
    };


    // Inverse
    wBigInt.genInverse = (q) => {
        return (a) => a.affine(q).modInv(q);
    };

    // Add
    wBigInt.genAdd = (q) => {
        if (q) {
            return (a,b) => {
                const r = a.add(b);
                return r.greaterOrEquals(q) ? r.minus(q) : r;
            };
        } else {
            return (a,b) => a.add(b);
        }
    };

    // Sub
    wBigInt.genSub = (q) => {
        if (q) {
            return (a,b) => a.greaterOrEquals(b) ? a.minus(b) : a.minus(b).add(q);
        } else {
            return (a,b) => a.minus(b);
        }
    };

    wBigInt.genNeg = (q) => {
        if (q) {
            return (a) => a.isZero() ? a : q.minus(a);
        } else {
            return (a) => wBigInt.zero.minus(a);
        }
    };

    // Mul
    wBigInt.genMul = (q) => {
        if (q) {
            return (a,b) => a.times(b).mod(q);
        } else {
            return (a,b) => a.times(b);
        }
    };

    // Shr
    wBigInt.genShr = () => {
        return (a,b) => a.shiftRight(wBigInt(b).value);
    };

    // Shr
    wBigInt.genShl = (q) => {
        if (q) {
            return (a,b) => a.shiftLeft(wBigInt(b).value).mod(q);
        } else {
            return (a,b) => a.shiftLeft(wBigInt(b).value);
        }
    };

    // Square
    wBigInt.genSquare = (q) => {
        if (q) {
            return (a) => a.square().mod(q);
        } else {
            return (a) => a.square();
        }
    };

    // Double
    wBigInt.genDouble = (q) => {
        if (q) {
            return (a) => a.add(a).mod(q);
        } else {
            return (a) => a.add(a);
        }
    };

    // Equals
    wBigInt.genEquals = (q) => {
        if (q) {
            return (a,b) => a.affine(q).equals(b.affine(q));
        } else {
            return (a,b) => a.equals(b);
        }
    };

    // IsZero
    wBigInt.genIsZero = (q) => {
        if (q) {
            return (a) => (a.affine(q).isZero());
        } else {
            return (a) =>  a.isZero();
        }
    };
}



wBigInt.affine = function(a, q) {
    return wBigInt.genAffine(q)(a);
};

wBigInt.prototype.affine = function (q) {
    return wBigInt.affine(this, q);
};

wBigInt.inverse = function(a, q) {
    return wBigInt.genInverse(q)(a);
};

wBigInt.prototype.inverse = function (q) {
    return wBigInt.genInverse(q)(this);
};

wBigInt.add = function(a, b, q) {
    return wBigInt.genAdd(q)(a,b);
};

wBigInt.prototype.add = function (a, q) {
    return wBigInt.genAdd(q)(this, a);
};

wBigInt.sub = function(a, b, q) {
    return wBigInt.genSub(q)(a,b);
};

wBigInt.prototype.sub = function (a, q) {
    return wBigInt.genSub(q)(this, a);
};

wBigInt.neg = function(a, q) {
    return wBigInt.genNeg(q)(a);
};

wBigInt.prototype.neg = function (q) {
    return wBigInt.genNeg(q)(this);
};

wBigInt.mul = function(a, b, q) {
    return wBigInt.genMul(q)(a,b);
};

wBigInt.prototype.mul = function (a, q) {
    return wBigInt.genMul(q)(this, a);
};

wBigInt.shr = function(a, b, q) {
    return wBigInt.genShr(q)(a,b);
};

wBigInt.prototype.shr = function (a, q) {
    return wBigInt.genShr(q)(this, a);
};

wBigInt.shl = function(a, b, q) {
    return wBigInt.genShl(q)(a,b);
};

wBigInt.prototype.shl = function (a, q) {
    return wBigInt.genShl(q)(this, a);
};

wBigInt.equals = function(a, b, q) {
    return wBigInt.genEquals(q)(a,b);
};

wBigInt.prototype.equals = function (a, q) {
    return wBigInt.genEquals(q)(this, a);
};

wBigInt.square = function(a, q) {
    return wBigInt.genSquare(q)(a);
};

wBigInt.prototype.square = function (q) {
    return wBigInt.genSquare(q)(this);
};

wBigInt.double = function(a, q) {
    return wBigInt.genDouble(q)(a);
};

wBigInt.prototype.double = function (q) {
    return wBigInt.genDouble(q)(this);
};

wBigInt.isZero = function(a, q) {
    return wBigInt.genIsZero(q)(a);
};

wBigInt.prototype.isZero = function (q) {
    return wBigInt.genIsZero(q)(this);
};

wBigInt.leBuff2int = function(buff) {
    let res = wBigInt.zero;
    for (let i=0; i<buff.length; i++) {
        const n = wBigInt(buff[i]);
        res = res.add(n.shl(i*8));
    }
    return res;
};

wBigInt.leInt2Buff = function(n, len) {
    let r = n;
    let o =0;
    const buff = Buffer.alloc(len);
    while ((r.greater(wBigInt.zero))&&(o<buff.length)) {
        let c = Number(r.and(wBigInt("255")));
        buff[o] = c;
        o++;
        r = r.shr(8);
    }
    if (r.greater(wBigInt.zero)) throw new Error("Number does not feed in buffer");
    return buff;
};

wBigInt.prototype.leInt2Buff = function (len) {
    return wBigInt.leInt2Buff(this,len);
};


wBigInt.beBuff2int = function(buff) {
    let res = wBigInt.zero;
    for (let i=0; i<buff.length; i++) {
        const n = wBigInt(buff[buff.length - i - 1]);
        res = res.add(n.shl(i*8));
    }
    return res;
};

wBigInt.beInt2Buff = function(n, len) {
    let r = n;
    let o =len-1;
    const buff = Buffer.alloc(len);
    while ((r.greater(wBigInt.zero))&&(o>=0)) {
        let c = Number(r.and(wBigInt("255")));
        buff[o] = c;
        o--;
        r = r.shr(8);
    }
    if (r.greater(wBigInt.zero)) throw new Error("Number does not feed in buffer");
    return buff;
};

wBigInt.prototype.beInt2Buff = function (len) {
    return wBigInt.beInt2Buff(this,len);
};

module.exports = wBigInt;

