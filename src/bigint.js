/* global BigInt */
const bigInt = require("big-integer");

let wBigInt;

console.log("XXX");

if (typeof(BigInt) != "undefined") {
    wBigInt  = BigInt;

    // Affine
    wBigInt.genAffine = (q) => {
        const nq = -q;
        return (a) => {
            let aux = a;
            if (aux < 0) {
                if (aux <= nq) {
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
            return (a) =>  a != 0;
        }
    };


    // Other minor functions
    wBigInt.prototype.isOdd = function() {
        return (this & wBigInt.one) == 1;
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


} else {

    wBigInt = bigInt;

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
    return wBigInt.genInverse(this, q);
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

wBigInt.equals = function(a, b, q) {
    return wBigInt.genEquals(q)(a,b);
};

wBigInt.prototype.equals = function (a, q) {
    return wBigInt.genEquals(q)(this, a);
};

wBigInt.square = function(a, q) {
    return wBigInt.genSquare(q)(a);
};

wBigInt.prototype.square = function (a, q) {
    return wBigInt.genSquare(q)(a);
};

wBigInt.double = function(a, q) {
    return wBigInt.genDouble(q)(a);
};

wBigInt.prototype.double = function (a, q) {
    return wBigInt.genDouble(q)(a);
};

wBigInt.isZero = function(a, q) {
    return wBigInt.genIsZero(q)(a);
};

wBigInt.prototype.isZero = function (a, q) {
    return wBigInt.genIsZero(q)(a);
};

wBigInt.one = wBigInt(1);
wBigInt.zero = wBigInt(0);

module.exports = wBigInt;

