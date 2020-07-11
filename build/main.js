'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var crypto = _interopDefault(require('crypto'));
var os = _interopDefault(require('os'));
var NodeWorker_mod = _interopDefault(require('worker_threads'));
var fs = _interopDefault(require('fs'));
var readline = _interopDefault(require('readline'));

/* global BigInt */
const hexLen = [ 0, 1, 2, 2, 3, 3, 3, 3, 4 ,4 ,4 ,4 ,4 ,4 ,4 ,4];

function fromString(s, radix) {
    if ((!radix)||(radix==10)) {
        return BigInt(s);
    } else if (radix==16) {
        if (s.slice(0,2) == "0x") {
            return BigInt(s);
        } else {
            return BigInt("0x"+s);
        }
    }
}

const e = fromString;

function fromArray(a, radix) {
    let acc =0n;
    radix = BigInt(radix);
    for (let i=0; i<a.length; i++) {
        acc = acc*radix + BigInt(a[i]);
    }
    return acc;
}

function bitLength(a) {
    const aS =a.toString(16);
    return (aS.length-1)*4 +hexLen[parseInt(aS[0], 16)];
}

function isNegative(a) {
    return BigInt(a) < 0n;
}

function isZero(a) {
    return !a;
}

function shiftLeft(a, n) {
    return BigInt(a) << BigInt(n);
}

function shiftRight(a, n) {
    return BigInt(a) >> BigInt(n);
}

const shl = shiftLeft;
const shr = shiftRight;

function isOdd(a) {
    return (BigInt(a) & 1n) == 1n;
}


function naf(n) {
    let E = BigInt(n);
    const res = [];
    while (E) {
        if (E & 1n) {
            const z = 2 - Number(E % 4n);
            res.push( z );
            E = E - BigInt(z);
        } else {
            res.push( 0 );
        }
        E = E >> 1n;
    }
    return res;
}


function bits(n) {
    let E = BigInt(n);
    const res = [];
    while (E) {
        if (E & 1n) {
            res.push(1);
        } else {
            res.push( 0 );
        }
        E = E >> 1n;
    }
    return res;
}

function toNumber(s) {
    if (s>BigInt(Number.MAX_SAFE_INTEGER )) {
        throw new Error("Number too big");
    }
    return Number(s);
}

function toArray(s, radix) {
    const res = [];
    let rem = BigInt(s);
    radix = BigInt(radix);
    while (rem) {
        res.unshift( Number(rem % radix));
        rem = rem / radix;
    }
    return res;
}


function add(a, b) {
    return BigInt(a) + BigInt(b);
}

function sub(a, b) {
    return BigInt(a) - BigInt(b);
}

function neg(a) {
    return -BigInt(a);
}

function mul(a, b) {
    return BigInt(a) * BigInt(b);
}

function square(a) {
    return BigInt(a) * BigInt(a);
}

function pow(a, b) {
    return BigInt(a) ** BigInt(b);
}

function exp(a, b) {
    return BigInt(a) ** BigInt(b);
}

function abs(a) {
    return BigInt(a) >= 0 ? BigInt(a) : -BigInt(a);
}

function div(a, b) {
    return BigInt(a) / BigInt(b);
}

function mod(a, b) {
    return BigInt(a) % BigInt(b);
}

function eq(a, b) {
    return BigInt(a) == BigInt(b);
}

function neq(a, b) {
    return BigInt(a) != BigInt(b);
}

function lt(a, b) {
    return BigInt(a) < BigInt(b);
}

function gt(a, b) {
    return BigInt(a) > BigInt(b);
}

function leq(a, b) {
    return BigInt(a) <= BigInt(b);
}

function geq(a, b) {
    return BigInt(a) >= BigInt(b);
}

function band(a, b) {
    return BigInt(a) & BigInt(b);
}

function bor(a, b) {
    return BigInt(a) | BigInt(b);
}

function bxor(a, b) {
    return BigInt(a) ^ BigInt(b);
}

function land(a, b) {
    return BigInt(a) && BigInt(b);
}

function lor(a, b) {
    return BigInt(a) || BigInt(b);
}

function lnot(a) {
    return !BigInt(a);
}

var Scalar_native = /*#__PURE__*/Object.freeze({
    __proto__: null,
    fromString: fromString,
    e: e,
    fromArray: fromArray,
    bitLength: bitLength,
    isNegative: isNegative,
    isZero: isZero,
    shiftLeft: shiftLeft,
    shiftRight: shiftRight,
    shl: shl,
    shr: shr,
    isOdd: isOdd,
    naf: naf,
    bits: bits,
    toNumber: toNumber,
    toArray: toArray,
    add: add,
    sub: sub,
    neg: neg,
    mul: mul,
    square: square,
    pow: pow,
    exp: exp,
    abs: abs,
    div: div,
    mod: mod,
    eq: eq,
    neq: neq,
    lt: lt,
    gt: gt,
    leq: leq,
    geq: geq,
    band: band,
    bor: bor,
    bxor: bxor,
    land: land,
    lor: lor,
    lnot: lnot
});

function commonjsRequire () {
	throw new Error('Dynamic requires are not currently supported by rollup-plugin-commonjs');
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var BigInteger = createCommonjsModule(function (module) {
var bigInt = (function (undefined$1) {

    var BASE = 1e7,
        LOG_BASE = 7,
        MAX_INT = 9007199254740992,
        MAX_INT_ARR = smallToArray(MAX_INT),
        DEFAULT_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

    var supportsNativeBigInt = typeof BigInt === "function";

    function Integer(v, radix, alphabet, caseSensitive) {
        if (typeof v === "undefined") return Integer[0];
        if (typeof radix !== "undefined") return +radix === 10 && !alphabet ? parseValue(v) : parseBase(v, radix, alphabet, caseSensitive);
        return parseValue(v);
    }

    function BigInteger(value, sign) {
        this.value = value;
        this.sign = sign;
        this.isSmall = false;
    }
    BigInteger.prototype = Object.create(Integer.prototype);

    function SmallInteger(value) {
        this.value = value;
        this.sign = value < 0;
        this.isSmall = true;
    }
    SmallInteger.prototype = Object.create(Integer.prototype);

    function NativeBigInt(value) {
        this.value = value;
    }
    NativeBigInt.prototype = Object.create(Integer.prototype);

    function isPrecise(n) {
        return -MAX_INT < n && n < MAX_INT;
    }

    function smallToArray(n) { // For performance reasons doesn't reference BASE, need to change this function if BASE changes
        if (n < 1e7)
            return [n];
        if (n < 1e14)
            return [n % 1e7, Math.floor(n / 1e7)];
        return [n % 1e7, Math.floor(n / 1e7) % 1e7, Math.floor(n / 1e14)];
    }

    function arrayToSmall(arr) { // If BASE changes this function may need to change
        trim(arr);
        var length = arr.length;
        if (length < 4 && compareAbs(arr, MAX_INT_ARR) < 0) {
            switch (length) {
                case 0: return 0;
                case 1: return arr[0];
                case 2: return arr[0] + arr[1] * BASE;
                default: return arr[0] + (arr[1] + arr[2] * BASE) * BASE;
            }
        }
        return arr;
    }

    function trim(v) {
        var i = v.length;
        while (v[--i] === 0);
        v.length = i + 1;
    }

    function createArray(length) { // function shamelessly stolen from Yaffle's library https://github.com/Yaffle/BigInteger
        var x = new Array(length);
        var i = -1;
        while (++i < length) {
            x[i] = 0;
        }
        return x;
    }

    function truncate(n) {
        if (n > 0) return Math.floor(n);
        return Math.ceil(n);
    }

    function add(a, b) { // assumes a and b are arrays with a.length >= b.length
        var l_a = a.length,
            l_b = b.length,
            r = new Array(l_a),
            carry = 0,
            base = BASE,
            sum, i;
        for (i = 0; i < l_b; i++) {
            sum = a[i] + b[i] + carry;
            carry = sum >= base ? 1 : 0;
            r[i] = sum - carry * base;
        }
        while (i < l_a) {
            sum = a[i] + carry;
            carry = sum === base ? 1 : 0;
            r[i++] = sum - carry * base;
        }
        if (carry > 0) r.push(carry);
        return r;
    }

    function addAny(a, b) {
        if (a.length >= b.length) return add(a, b);
        return add(b, a);
    }

    function addSmall(a, carry) { // assumes a is array, carry is number with 0 <= carry < MAX_INT
        var l = a.length,
            r = new Array(l),
            base = BASE,
            sum, i;
        for (i = 0; i < l; i++) {
            sum = a[i] - base + carry;
            carry = Math.floor(sum / base);
            r[i] = sum - carry * base;
            carry += 1;
        }
        while (carry > 0) {
            r[i++] = carry % base;
            carry = Math.floor(carry / base);
        }
        return r;
    }

    BigInteger.prototype.add = function (v) {
        var n = parseValue(v);
        if (this.sign !== n.sign) {
            return this.subtract(n.negate());
        }
        var a = this.value, b = n.value;
        if (n.isSmall) {
            return new BigInteger(addSmall(a, Math.abs(b)), this.sign);
        }
        return new BigInteger(addAny(a, b), this.sign);
    };
    BigInteger.prototype.plus = BigInteger.prototype.add;

    SmallInteger.prototype.add = function (v) {
        var n = parseValue(v);
        var a = this.value;
        if (a < 0 !== n.sign) {
            return this.subtract(n.negate());
        }
        var b = n.value;
        if (n.isSmall) {
            if (isPrecise(a + b)) return new SmallInteger(a + b);
            b = smallToArray(Math.abs(b));
        }
        return new BigInteger(addSmall(b, Math.abs(a)), a < 0);
    };
    SmallInteger.prototype.plus = SmallInteger.prototype.add;

    NativeBigInt.prototype.add = function (v) {
        return new NativeBigInt(this.value + parseValue(v).value);
    };
    NativeBigInt.prototype.plus = NativeBigInt.prototype.add;

    function subtract(a, b) { // assumes a and b are arrays with a >= b
        var a_l = a.length,
            b_l = b.length,
            r = new Array(a_l),
            borrow = 0,
            base = BASE,
            i, difference;
        for (i = 0; i < b_l; i++) {
            difference = a[i] - borrow - b[i];
            if (difference < 0) {
                difference += base;
                borrow = 1;
            } else borrow = 0;
            r[i] = difference;
        }
        for (i = b_l; i < a_l; i++) {
            difference = a[i] - borrow;
            if (difference < 0) difference += base;
            else {
                r[i++] = difference;
                break;
            }
            r[i] = difference;
        }
        for (; i < a_l; i++) {
            r[i] = a[i];
        }
        trim(r);
        return r;
    }

    function subtractAny(a, b, sign) {
        var value;
        if (compareAbs(a, b) >= 0) {
            value = subtract(a, b);
        } else {
            value = subtract(b, a);
            sign = !sign;
        }
        value = arrayToSmall(value);
        if (typeof value === "number") {
            if (sign) value = -value;
            return new SmallInteger(value);
        }
        return new BigInteger(value, sign);
    }

    function subtractSmall(a, b, sign) { // assumes a is array, b is number with 0 <= b < MAX_INT
        var l = a.length,
            r = new Array(l),
            carry = -b,
            base = BASE,
            i, difference;
        for (i = 0; i < l; i++) {
            difference = a[i] + carry;
            carry = Math.floor(difference / base);
            difference %= base;
            r[i] = difference < 0 ? difference + base : difference;
        }
        r = arrayToSmall(r);
        if (typeof r === "number") {
            if (sign) r = -r;
            return new SmallInteger(r);
        } return new BigInteger(r, sign);
    }

    BigInteger.prototype.subtract = function (v) {
        var n = parseValue(v);
        if (this.sign !== n.sign) {
            return this.add(n.negate());
        }
        var a = this.value, b = n.value;
        if (n.isSmall)
            return subtractSmall(a, Math.abs(b), this.sign);
        return subtractAny(a, b, this.sign);
    };
    BigInteger.prototype.minus = BigInteger.prototype.subtract;

    SmallInteger.prototype.subtract = function (v) {
        var n = parseValue(v);
        var a = this.value;
        if (a < 0 !== n.sign) {
            return this.add(n.negate());
        }
        var b = n.value;
        if (n.isSmall) {
            return new SmallInteger(a - b);
        }
        return subtractSmall(b, Math.abs(a), a >= 0);
    };
    SmallInteger.prototype.minus = SmallInteger.prototype.subtract;

    NativeBigInt.prototype.subtract = function (v) {
        return new NativeBigInt(this.value - parseValue(v).value);
    };
    NativeBigInt.prototype.minus = NativeBigInt.prototype.subtract;

    BigInteger.prototype.negate = function () {
        return new BigInteger(this.value, !this.sign);
    };
    SmallInteger.prototype.negate = function () {
        var sign = this.sign;
        var small = new SmallInteger(-this.value);
        small.sign = !sign;
        return small;
    };
    NativeBigInt.prototype.negate = function () {
        return new NativeBigInt(-this.value);
    };

    BigInteger.prototype.abs = function () {
        return new BigInteger(this.value, false);
    };
    SmallInteger.prototype.abs = function () {
        return new SmallInteger(Math.abs(this.value));
    };
    NativeBigInt.prototype.abs = function () {
        return new NativeBigInt(this.value >= 0 ? this.value : -this.value);
    };


    function multiplyLong(a, b) {
        var a_l = a.length,
            b_l = b.length,
            l = a_l + b_l,
            r = createArray(l),
            base = BASE,
            product, carry, i, a_i, b_j;
        for (i = 0; i < a_l; ++i) {
            a_i = a[i];
            for (var j = 0; j < b_l; ++j) {
                b_j = b[j];
                product = a_i * b_j + r[i + j];
                carry = Math.floor(product / base);
                r[i + j] = product - carry * base;
                r[i + j + 1] += carry;
            }
        }
        trim(r);
        return r;
    }

    function multiplySmall(a, b) { // assumes a is array, b is number with |b| < BASE
        var l = a.length,
            r = new Array(l),
            base = BASE,
            carry = 0,
            product, i;
        for (i = 0; i < l; i++) {
            product = a[i] * b + carry;
            carry = Math.floor(product / base);
            r[i] = product - carry * base;
        }
        while (carry > 0) {
            r[i++] = carry % base;
            carry = Math.floor(carry / base);
        }
        return r;
    }

    function shiftLeft(x, n) {
        var r = [];
        while (n-- > 0) r.push(0);
        return r.concat(x);
    }

    function multiplyKaratsuba(x, y) {
        var n = Math.max(x.length, y.length);

        if (n <= 30) return multiplyLong(x, y);
        n = Math.ceil(n / 2);

        var b = x.slice(n),
            a = x.slice(0, n),
            d = y.slice(n),
            c = y.slice(0, n);

        var ac = multiplyKaratsuba(a, c),
            bd = multiplyKaratsuba(b, d),
            abcd = multiplyKaratsuba(addAny(a, b), addAny(c, d));

        var product = addAny(addAny(ac, shiftLeft(subtract(subtract(abcd, ac), bd), n)), shiftLeft(bd, 2 * n));
        trim(product);
        return product;
    }

    // The following function is derived from a surface fit of a graph plotting the performance difference
    // between long multiplication and karatsuba multiplication versus the lengths of the two arrays.
    function useKaratsuba(l1, l2) {
        return -0.012 * l1 - 0.012 * l2 + 0.000015 * l1 * l2 > 0;
    }

    BigInteger.prototype.multiply = function (v) {
        var n = parseValue(v),
            a = this.value, b = n.value,
            sign = this.sign !== n.sign,
            abs;
        if (n.isSmall) {
            if (b === 0) return Integer[0];
            if (b === 1) return this;
            if (b === -1) return this.negate();
            abs = Math.abs(b);
            if (abs < BASE) {
                return new BigInteger(multiplySmall(a, abs), sign);
            }
            b = smallToArray(abs);
        }
        if (useKaratsuba(a.length, b.length)) // Karatsuba is only faster for certain array sizes
            return new BigInteger(multiplyKaratsuba(a, b), sign);
        return new BigInteger(multiplyLong(a, b), sign);
    };

    BigInteger.prototype.times = BigInteger.prototype.multiply;

    function multiplySmallAndArray(a, b, sign) { // a >= 0
        if (a < BASE) {
            return new BigInteger(multiplySmall(b, a), sign);
        }
        return new BigInteger(multiplyLong(b, smallToArray(a)), sign);
    }
    SmallInteger.prototype._multiplyBySmall = function (a) {
        if (isPrecise(a.value * this.value)) {
            return new SmallInteger(a.value * this.value);
        }
        return multiplySmallAndArray(Math.abs(a.value), smallToArray(Math.abs(this.value)), this.sign !== a.sign);
    };
    BigInteger.prototype._multiplyBySmall = function (a) {
        if (a.value === 0) return Integer[0];
        if (a.value === 1) return this;
        if (a.value === -1) return this.negate();
        return multiplySmallAndArray(Math.abs(a.value), this.value, this.sign !== a.sign);
    };
    SmallInteger.prototype.multiply = function (v) {
        return parseValue(v)._multiplyBySmall(this);
    };
    SmallInteger.prototype.times = SmallInteger.prototype.multiply;

    NativeBigInt.prototype.multiply = function (v) {
        return new NativeBigInt(this.value * parseValue(v).value);
    };
    NativeBigInt.prototype.times = NativeBigInt.prototype.multiply;

    function square(a) {
        //console.assert(2 * BASE * BASE < MAX_INT);
        var l = a.length,
            r = createArray(l + l),
            base = BASE,
            product, carry, i, a_i, a_j;
        for (i = 0; i < l; i++) {
            a_i = a[i];
            carry = 0 - a_i * a_i;
            for (var j = i; j < l; j++) {
                a_j = a[j];
                product = 2 * (a_i * a_j) + r[i + j] + carry;
                carry = Math.floor(product / base);
                r[i + j] = product - carry * base;
            }
            r[i + l] = carry;
        }
        trim(r);
        return r;
    }

    BigInteger.prototype.square = function () {
        return new BigInteger(square(this.value), false);
    };

    SmallInteger.prototype.square = function () {
        var value = this.value * this.value;
        if (isPrecise(value)) return new SmallInteger(value);
        return new BigInteger(square(smallToArray(Math.abs(this.value))), false);
    };

    NativeBigInt.prototype.square = function (v) {
        return new NativeBigInt(this.value * this.value);
    };

    function divMod1(a, b) { // Left over from previous version. Performs faster than divMod2 on smaller input sizes.
        var a_l = a.length,
            b_l = b.length,
            base = BASE,
            result = createArray(b.length),
            divisorMostSignificantDigit = b[b_l - 1],
            // normalization
            lambda = Math.ceil(base / (2 * divisorMostSignificantDigit)),
            remainder = multiplySmall(a, lambda),
            divisor = multiplySmall(b, lambda),
            quotientDigit, shift, carry, borrow, i, l, q;
        if (remainder.length <= a_l) remainder.push(0);
        divisor.push(0);
        divisorMostSignificantDigit = divisor[b_l - 1];
        for (shift = a_l - b_l; shift >= 0; shift--) {
            quotientDigit = base - 1;
            if (remainder[shift + b_l] !== divisorMostSignificantDigit) {
                quotientDigit = Math.floor((remainder[shift + b_l] * base + remainder[shift + b_l - 1]) / divisorMostSignificantDigit);
            }
            // quotientDigit <= base - 1
            carry = 0;
            borrow = 0;
            l = divisor.length;
            for (i = 0; i < l; i++) {
                carry += quotientDigit * divisor[i];
                q = Math.floor(carry / base);
                borrow += remainder[shift + i] - (carry - q * base);
                carry = q;
                if (borrow < 0) {
                    remainder[shift + i] = borrow + base;
                    borrow = -1;
                } else {
                    remainder[shift + i] = borrow;
                    borrow = 0;
                }
            }
            while (borrow !== 0) {
                quotientDigit -= 1;
                carry = 0;
                for (i = 0; i < l; i++) {
                    carry += remainder[shift + i] - base + divisor[i];
                    if (carry < 0) {
                        remainder[shift + i] = carry + base;
                        carry = 0;
                    } else {
                        remainder[shift + i] = carry;
                        carry = 1;
                    }
                }
                borrow += carry;
            }
            result[shift] = quotientDigit;
        }
        // denormalization
        remainder = divModSmall(remainder, lambda)[0];
        return [arrayToSmall(result), arrayToSmall(remainder)];
    }

    function divMod2(a, b) { // Implementation idea shamelessly stolen from Silent Matt's library http://silentmatt.com/biginteger/
        // Performs faster than divMod1 on larger input sizes.
        var a_l = a.length,
            b_l = b.length,
            result = [],
            part = [],
            base = BASE,
            guess, xlen, highx, highy, check;
        while (a_l) {
            part.unshift(a[--a_l]);
            trim(part);
            if (compareAbs(part, b) < 0) {
                result.push(0);
                continue;
            }
            xlen = part.length;
            highx = part[xlen - 1] * base + part[xlen - 2];
            highy = b[b_l - 1] * base + b[b_l - 2];
            if (xlen > b_l) {
                highx = (highx + 1) * base;
            }
            guess = Math.ceil(highx / highy);
            do {
                check = multiplySmall(b, guess);
                if (compareAbs(check, part) <= 0) break;
                guess--;
            } while (guess);
            result.push(guess);
            part = subtract(part, check);
        }
        result.reverse();
        return [arrayToSmall(result), arrayToSmall(part)];
    }

    function divModSmall(value, lambda) {
        var length = value.length,
            quotient = createArray(length),
            base = BASE,
            i, q, remainder, divisor;
        remainder = 0;
        for (i = length - 1; i >= 0; --i) {
            divisor = remainder * base + value[i];
            q = truncate(divisor / lambda);
            remainder = divisor - q * lambda;
            quotient[i] = q | 0;
        }
        return [quotient, remainder | 0];
    }

    function divModAny(self, v) {
        var value, n = parseValue(v);
        if (supportsNativeBigInt) {
            return [new NativeBigInt(self.value / n.value), new NativeBigInt(self.value % n.value)];
        }
        var a = self.value, b = n.value;
        var quotient;
        if (b === 0) throw new Error("Cannot divide by zero");
        if (self.isSmall) {
            if (n.isSmall) {
                return [new SmallInteger(truncate(a / b)), new SmallInteger(a % b)];
            }
            return [Integer[0], self];
        }
        if (n.isSmall) {
            if (b === 1) return [self, Integer[0]];
            if (b == -1) return [self.negate(), Integer[0]];
            var abs = Math.abs(b);
            if (abs < BASE) {
                value = divModSmall(a, abs);
                quotient = arrayToSmall(value[0]);
                var remainder = value[1];
                if (self.sign) remainder = -remainder;
                if (typeof quotient === "number") {
                    if (self.sign !== n.sign) quotient = -quotient;
                    return [new SmallInteger(quotient), new SmallInteger(remainder)];
                }
                return [new BigInteger(quotient, self.sign !== n.sign), new SmallInteger(remainder)];
            }
            b = smallToArray(abs);
        }
        var comparison = compareAbs(a, b);
        if (comparison === -1) return [Integer[0], self];
        if (comparison === 0) return [Integer[self.sign === n.sign ? 1 : -1], Integer[0]];

        // divMod1 is faster on smaller input sizes
        if (a.length + b.length <= 200)
            value = divMod1(a, b);
        else value = divMod2(a, b);

        quotient = value[0];
        var qSign = self.sign !== n.sign,
            mod = value[1],
            mSign = self.sign;
        if (typeof quotient === "number") {
            if (qSign) quotient = -quotient;
            quotient = new SmallInteger(quotient);
        } else quotient = new BigInteger(quotient, qSign);
        if (typeof mod === "number") {
            if (mSign) mod = -mod;
            mod = new SmallInteger(mod);
        } else mod = new BigInteger(mod, mSign);
        return [quotient, mod];
    }

    BigInteger.prototype.divmod = function (v) {
        var result = divModAny(this, v);
        return {
            quotient: result[0],
            remainder: result[1]
        };
    };
    NativeBigInt.prototype.divmod = SmallInteger.prototype.divmod = BigInteger.prototype.divmod;


    BigInteger.prototype.divide = function (v) {
        return divModAny(this, v)[0];
    };
    NativeBigInt.prototype.over = NativeBigInt.prototype.divide = function (v) {
        return new NativeBigInt(this.value / parseValue(v).value);
    };
    SmallInteger.prototype.over = SmallInteger.prototype.divide = BigInteger.prototype.over = BigInteger.prototype.divide;

    BigInteger.prototype.mod = function (v) {
        return divModAny(this, v)[1];
    };
    NativeBigInt.prototype.mod = NativeBigInt.prototype.remainder = function (v) {
        return new NativeBigInt(this.value % parseValue(v).value);
    };
    SmallInteger.prototype.remainder = SmallInteger.prototype.mod = BigInteger.prototype.remainder = BigInteger.prototype.mod;

    BigInteger.prototype.pow = function (v) {
        var n = parseValue(v),
            a = this.value,
            b = n.value,
            value, x, y;
        if (b === 0) return Integer[1];
        if (a === 0) return Integer[0];
        if (a === 1) return Integer[1];
        if (a === -1) return n.isEven() ? Integer[1] : Integer[-1];
        if (n.sign) {
            return Integer[0];
        }
        if (!n.isSmall) throw new Error("The exponent " + n.toString() + " is too large.");
        if (this.isSmall) {
            if (isPrecise(value = Math.pow(a, b)))
                return new SmallInteger(truncate(value));
        }
        x = this;
        y = Integer[1];
        while (true) {
            if (b & 1 === 1) {
                y = y.times(x);
                --b;
            }
            if (b === 0) break;
            b /= 2;
            x = x.square();
        }
        return y;
    };
    SmallInteger.prototype.pow = BigInteger.prototype.pow;

    NativeBigInt.prototype.pow = function (v) {
        var n = parseValue(v);
        var a = this.value, b = n.value;
        var _0 = BigInt(0), _1 = BigInt(1), _2 = BigInt(2);
        if (b === _0) return Integer[1];
        if (a === _0) return Integer[0];
        if (a === _1) return Integer[1];
        if (a === BigInt(-1)) return n.isEven() ? Integer[1] : Integer[-1];
        if (n.isNegative()) return new NativeBigInt(_0);
        var x = this;
        var y = Integer[1];
        while (true) {
            if ((b & _1) === _1) {
                y = y.times(x);
                --b;
            }
            if (b === _0) break;
            b /= _2;
            x = x.square();
        }
        return y;
    };

    BigInteger.prototype.modPow = function (exp, mod) {
        exp = parseValue(exp);
        mod = parseValue(mod);
        if (mod.isZero()) throw new Error("Cannot take modPow with modulus 0");
        var r = Integer[1],
            base = this.mod(mod);
        if (exp.isNegative()) {
            exp = exp.multiply(Integer[-1]);
            base = base.modInv(mod);
        }
        while (exp.isPositive()) {
            if (base.isZero()) return Integer[0];
            if (exp.isOdd()) r = r.multiply(base).mod(mod);
            exp = exp.divide(2);
            base = base.square().mod(mod);
        }
        return r;
    };
    NativeBigInt.prototype.modPow = SmallInteger.prototype.modPow = BigInteger.prototype.modPow;

    function compareAbs(a, b) {
        if (a.length !== b.length) {
            return a.length > b.length ? 1 : -1;
        }
        for (var i = a.length - 1; i >= 0; i--) {
            if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
        }
        return 0;
    }

    BigInteger.prototype.compareAbs = function (v) {
        var n = parseValue(v),
            a = this.value,
            b = n.value;
        if (n.isSmall) return 1;
        return compareAbs(a, b);
    };
    SmallInteger.prototype.compareAbs = function (v) {
        var n = parseValue(v),
            a = Math.abs(this.value),
            b = n.value;
        if (n.isSmall) {
            b = Math.abs(b);
            return a === b ? 0 : a > b ? 1 : -1;
        }
        return -1;
    };
    NativeBigInt.prototype.compareAbs = function (v) {
        var a = this.value;
        var b = parseValue(v).value;
        a = a >= 0 ? a : -a;
        b = b >= 0 ? b : -b;
        return a === b ? 0 : a > b ? 1 : -1;
    };

    BigInteger.prototype.compare = function (v) {
        // See discussion about comparison with Infinity:
        // https://github.com/peterolson/BigInteger.js/issues/61
        if (v === Infinity) {
            return -1;
        }
        if (v === -Infinity) {
            return 1;
        }

        var n = parseValue(v),
            a = this.value,
            b = n.value;
        if (this.sign !== n.sign) {
            return n.sign ? 1 : -1;
        }
        if (n.isSmall) {
            return this.sign ? -1 : 1;
        }
        return compareAbs(a, b) * (this.sign ? -1 : 1);
    };
    BigInteger.prototype.compareTo = BigInteger.prototype.compare;

    SmallInteger.prototype.compare = function (v) {
        if (v === Infinity) {
            return -1;
        }
        if (v === -Infinity) {
            return 1;
        }

        var n = parseValue(v),
            a = this.value,
            b = n.value;
        if (n.isSmall) {
            return a == b ? 0 : a > b ? 1 : -1;
        }
        if (a < 0 !== n.sign) {
            return a < 0 ? -1 : 1;
        }
        return a < 0 ? 1 : -1;
    };
    SmallInteger.prototype.compareTo = SmallInteger.prototype.compare;

    NativeBigInt.prototype.compare = function (v) {
        if (v === Infinity) {
            return -1;
        }
        if (v === -Infinity) {
            return 1;
        }
        var a = this.value;
        var b = parseValue(v).value;
        return a === b ? 0 : a > b ? 1 : -1;
    };
    NativeBigInt.prototype.compareTo = NativeBigInt.prototype.compare;

    BigInteger.prototype.equals = function (v) {
        return this.compare(v) === 0;
    };
    NativeBigInt.prototype.eq = NativeBigInt.prototype.equals = SmallInteger.prototype.eq = SmallInteger.prototype.equals = BigInteger.prototype.eq = BigInteger.prototype.equals;

    BigInteger.prototype.notEquals = function (v) {
        return this.compare(v) !== 0;
    };
    NativeBigInt.prototype.neq = NativeBigInt.prototype.notEquals = SmallInteger.prototype.neq = SmallInteger.prototype.notEquals = BigInteger.prototype.neq = BigInteger.prototype.notEquals;

    BigInteger.prototype.greater = function (v) {
        return this.compare(v) > 0;
    };
    NativeBigInt.prototype.gt = NativeBigInt.prototype.greater = SmallInteger.prototype.gt = SmallInteger.prototype.greater = BigInteger.prototype.gt = BigInteger.prototype.greater;

    BigInteger.prototype.lesser = function (v) {
        return this.compare(v) < 0;
    };
    NativeBigInt.prototype.lt = NativeBigInt.prototype.lesser = SmallInteger.prototype.lt = SmallInteger.prototype.lesser = BigInteger.prototype.lt = BigInteger.prototype.lesser;

    BigInteger.prototype.greaterOrEquals = function (v) {
        return this.compare(v) >= 0;
    };
    NativeBigInt.prototype.geq = NativeBigInt.prototype.greaterOrEquals = SmallInteger.prototype.geq = SmallInteger.prototype.greaterOrEquals = BigInteger.prototype.geq = BigInteger.prototype.greaterOrEquals;

    BigInteger.prototype.lesserOrEquals = function (v) {
        return this.compare(v) <= 0;
    };
    NativeBigInt.prototype.leq = NativeBigInt.prototype.lesserOrEquals = SmallInteger.prototype.leq = SmallInteger.prototype.lesserOrEquals = BigInteger.prototype.leq = BigInteger.prototype.lesserOrEquals;

    BigInteger.prototype.isEven = function () {
        return (this.value[0] & 1) === 0;
    };
    SmallInteger.prototype.isEven = function () {
        return (this.value & 1) === 0;
    };
    NativeBigInt.prototype.isEven = function () {
        return (this.value & BigInt(1)) === BigInt(0);
    };

    BigInteger.prototype.isOdd = function () {
        return (this.value[0] & 1) === 1;
    };
    SmallInteger.prototype.isOdd = function () {
        return (this.value & 1) === 1;
    };
    NativeBigInt.prototype.isOdd = function () {
        return (this.value & BigInt(1)) === BigInt(1);
    };

    BigInteger.prototype.isPositive = function () {
        return !this.sign;
    };
    SmallInteger.prototype.isPositive = function () {
        return this.value > 0;
    };
    NativeBigInt.prototype.isPositive = SmallInteger.prototype.isPositive;

    BigInteger.prototype.isNegative = function () {
        return this.sign;
    };
    SmallInteger.prototype.isNegative = function () {
        return this.value < 0;
    };
    NativeBigInt.prototype.isNegative = SmallInteger.prototype.isNegative;

    BigInteger.prototype.isUnit = function () {
        return false;
    };
    SmallInteger.prototype.isUnit = function () {
        return Math.abs(this.value) === 1;
    };
    NativeBigInt.prototype.isUnit = function () {
        return this.abs().value === BigInt(1);
    };

    BigInteger.prototype.isZero = function () {
        return false;
    };
    SmallInteger.prototype.isZero = function () {
        return this.value === 0;
    };
    NativeBigInt.prototype.isZero = function () {
        return this.value === BigInt(0);
    };

    BigInteger.prototype.isDivisibleBy = function (v) {
        var n = parseValue(v);
        if (n.isZero()) return false;
        if (n.isUnit()) return true;
        if (n.compareAbs(2) === 0) return this.isEven();
        return this.mod(n).isZero();
    };
    NativeBigInt.prototype.isDivisibleBy = SmallInteger.prototype.isDivisibleBy = BigInteger.prototype.isDivisibleBy;

    function isBasicPrime(v) {
        var n = v.abs();
        if (n.isUnit()) return false;
        if (n.equals(2) || n.equals(3) || n.equals(5)) return true;
        if (n.isEven() || n.isDivisibleBy(3) || n.isDivisibleBy(5)) return false;
        if (n.lesser(49)) return true;
        // we don't know if it's prime: let the other functions figure it out
    }

    function millerRabinTest(n, a) {
        var nPrev = n.prev(),
            b = nPrev,
            r = 0,
            d, i, x;
        while (b.isEven()) b = b.divide(2), r++;
        next: for (i = 0; i < a.length; i++) {
            if (n.lesser(a[i])) continue;
            x = bigInt(a[i]).modPow(b, n);
            if (x.isUnit() || x.equals(nPrev)) continue;
            for (d = r - 1; d != 0; d--) {
                x = x.square().mod(n);
                if (x.isUnit()) return false;
                if (x.equals(nPrev)) continue next;
            }
            return false;
        }
        return true;
    }

    // Set "strict" to true to force GRH-supported lower bound of 2*log(N)^2
    BigInteger.prototype.isPrime = function (strict) {
        var isPrime = isBasicPrime(this);
        if (isPrime !== undefined$1) return isPrime;
        var n = this.abs();
        var bits = n.bitLength();
        if (bits <= 64)
            return millerRabinTest(n, [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37]);
        var logN = Math.log(2) * bits.toJSNumber();
        var t = Math.ceil((strict === true) ? (2 * Math.pow(logN, 2)) : logN);
        for (var a = [], i = 0; i < t; i++) {
            a.push(bigInt(i + 2));
        }
        return millerRabinTest(n, a);
    };
    NativeBigInt.prototype.isPrime = SmallInteger.prototype.isPrime = BigInteger.prototype.isPrime;

    BigInteger.prototype.isProbablePrime = function (iterations, rng) {
        var isPrime = isBasicPrime(this);
        if (isPrime !== undefined$1) return isPrime;
        var n = this.abs();
        var t = iterations === undefined$1 ? 5 : iterations;
        for (var a = [], i = 0; i < t; i++) {
            a.push(bigInt.randBetween(2, n.minus(2), rng));
        }
        return millerRabinTest(n, a);
    };
    NativeBigInt.prototype.isProbablePrime = SmallInteger.prototype.isProbablePrime = BigInteger.prototype.isProbablePrime;

    BigInteger.prototype.modInv = function (n) {
        var t = bigInt.zero, newT = bigInt.one, r = parseValue(n), newR = this.abs(), q, lastT, lastR;
        while (!newR.isZero()) {
            q = r.divide(newR);
            lastT = t;
            lastR = r;
            t = newT;
            r = newR;
            newT = lastT.subtract(q.multiply(newT));
            newR = lastR.subtract(q.multiply(newR));
        }
        if (!r.isUnit()) throw new Error(this.toString() + " and " + n.toString() + " are not co-prime");
        if (t.compare(0) === -1) {
            t = t.add(n);
        }
        if (this.isNegative()) {
            return t.negate();
        }
        return t;
    };

    NativeBigInt.prototype.modInv = SmallInteger.prototype.modInv = BigInteger.prototype.modInv;

    BigInteger.prototype.next = function () {
        var value = this.value;
        if (this.sign) {
            return subtractSmall(value, 1, this.sign);
        }
        return new BigInteger(addSmall(value, 1), this.sign);
    };
    SmallInteger.prototype.next = function () {
        var value = this.value;
        if (value + 1 < MAX_INT) return new SmallInteger(value + 1);
        return new BigInteger(MAX_INT_ARR, false);
    };
    NativeBigInt.prototype.next = function () {
        return new NativeBigInt(this.value + BigInt(1));
    };

    BigInteger.prototype.prev = function () {
        var value = this.value;
        if (this.sign) {
            return new BigInteger(addSmall(value, 1), true);
        }
        return subtractSmall(value, 1, this.sign);
    };
    SmallInteger.prototype.prev = function () {
        var value = this.value;
        if (value - 1 > -MAX_INT) return new SmallInteger(value - 1);
        return new BigInteger(MAX_INT_ARR, true);
    };
    NativeBigInt.prototype.prev = function () {
        return new NativeBigInt(this.value - BigInt(1));
    };

    var powersOfTwo = [1];
    while (2 * powersOfTwo[powersOfTwo.length - 1] <= BASE) powersOfTwo.push(2 * powersOfTwo[powersOfTwo.length - 1]);
    var powers2Length = powersOfTwo.length, highestPower2 = powersOfTwo[powers2Length - 1];

    function shift_isSmall(n) {
        return Math.abs(n) <= BASE;
    }

    BigInteger.prototype.shiftLeft = function (v) {
        var n = parseValue(v).toJSNumber();
        if (!shift_isSmall(n)) {
            throw new Error(String(n) + " is too large for shifting.");
        }
        if (n < 0) return this.shiftRight(-n);
        var result = this;
        if (result.isZero()) return result;
        while (n >= powers2Length) {
            result = result.multiply(highestPower2);
            n -= powers2Length - 1;
        }
        return result.multiply(powersOfTwo[n]);
    };
    NativeBigInt.prototype.shiftLeft = SmallInteger.prototype.shiftLeft = BigInteger.prototype.shiftLeft;

    BigInteger.prototype.shiftRight = function (v) {
        var remQuo;
        var n = parseValue(v).toJSNumber();
        if (!shift_isSmall(n)) {
            throw new Error(String(n) + " is too large for shifting.");
        }
        if (n < 0) return this.shiftLeft(-n);
        var result = this;
        while (n >= powers2Length) {
            if (result.isZero() || (result.isNegative() && result.isUnit())) return result;
            remQuo = divModAny(result, highestPower2);
            result = remQuo[1].isNegative() ? remQuo[0].prev() : remQuo[0];
            n -= powers2Length - 1;
        }
        remQuo = divModAny(result, powersOfTwo[n]);
        return remQuo[1].isNegative() ? remQuo[0].prev() : remQuo[0];
    };
    NativeBigInt.prototype.shiftRight = SmallInteger.prototype.shiftRight = BigInteger.prototype.shiftRight;

    function bitwise(x, y, fn) {
        y = parseValue(y);
        var xSign = x.isNegative(), ySign = y.isNegative();
        var xRem = xSign ? x.not() : x,
            yRem = ySign ? y.not() : y;
        var xDigit = 0, yDigit = 0;
        var xDivMod = null, yDivMod = null;
        var result = [];
        while (!xRem.isZero() || !yRem.isZero()) {
            xDivMod = divModAny(xRem, highestPower2);
            xDigit = xDivMod[1].toJSNumber();
            if (xSign) {
                xDigit = highestPower2 - 1 - xDigit; // two's complement for negative numbers
            }

            yDivMod = divModAny(yRem, highestPower2);
            yDigit = yDivMod[1].toJSNumber();
            if (ySign) {
                yDigit = highestPower2 - 1 - yDigit; // two's complement for negative numbers
            }

            xRem = xDivMod[0];
            yRem = yDivMod[0];
            result.push(fn(xDigit, yDigit));
        }
        var sum = fn(xSign ? 1 : 0, ySign ? 1 : 0) !== 0 ? bigInt(-1) : bigInt(0);
        for (var i = result.length - 1; i >= 0; i -= 1) {
            sum = sum.multiply(highestPower2).add(bigInt(result[i]));
        }
        return sum;
    }

    BigInteger.prototype.not = function () {
        return this.negate().prev();
    };
    NativeBigInt.prototype.not = SmallInteger.prototype.not = BigInteger.prototype.not;

    BigInteger.prototype.and = function (n) {
        return bitwise(this, n, function (a, b) { return a & b; });
    };
    NativeBigInt.prototype.and = SmallInteger.prototype.and = BigInteger.prototype.and;

    BigInteger.prototype.or = function (n) {
        return bitwise(this, n, function (a, b) { return a | b; });
    };
    NativeBigInt.prototype.or = SmallInteger.prototype.or = BigInteger.prototype.or;

    BigInteger.prototype.xor = function (n) {
        return bitwise(this, n, function (a, b) { return a ^ b; });
    };
    NativeBigInt.prototype.xor = SmallInteger.prototype.xor = BigInteger.prototype.xor;

    var LOBMASK_I = 1 << 30, LOBMASK_BI = (BASE & -BASE) * (BASE & -BASE) | LOBMASK_I;
    function roughLOB(n) { // get lowestOneBit (rough)
        // SmallInteger: return Min(lowestOneBit(n), 1 << 30)
        // BigInteger: return Min(lowestOneBit(n), 1 << 14) [BASE=1e7]
        var v = n.value,
            x = typeof v === "number" ? v | LOBMASK_I :
                typeof v === "bigint" ? v | BigInt(LOBMASK_I) :
                    v[0] + v[1] * BASE | LOBMASK_BI;
        return x & -x;
    }

    function integerLogarithm(value, base) {
        if (base.compareTo(value) <= 0) {
            var tmp = integerLogarithm(value, base.square(base));
            var p = tmp.p;
            var e = tmp.e;
            var t = p.multiply(base);
            return t.compareTo(value) <= 0 ? { p: t, e: e * 2 + 1 } : { p: p, e: e * 2 };
        }
        return { p: bigInt(1), e: 0 };
    }

    BigInteger.prototype.bitLength = function () {
        var n = this;
        if (n.compareTo(bigInt(0)) < 0) {
            n = n.negate().subtract(bigInt(1));
        }
        if (n.compareTo(bigInt(0)) === 0) {
            return bigInt(0);
        }
        return bigInt(integerLogarithm(n, bigInt(2)).e).add(bigInt(1));
    };
    NativeBigInt.prototype.bitLength = SmallInteger.prototype.bitLength = BigInteger.prototype.bitLength;

    function max(a, b) {
        a = parseValue(a);
        b = parseValue(b);
        return a.greater(b) ? a : b;
    }
    function min(a, b) {
        a = parseValue(a);
        b = parseValue(b);
        return a.lesser(b) ? a : b;
    }
    function gcd(a, b) {
        a = parseValue(a).abs();
        b = parseValue(b).abs();
        if (a.equals(b)) return a;
        if (a.isZero()) return b;
        if (b.isZero()) return a;
        var c = Integer[1], d, t;
        while (a.isEven() && b.isEven()) {
            d = min(roughLOB(a), roughLOB(b));
            a = a.divide(d);
            b = b.divide(d);
            c = c.multiply(d);
        }
        while (a.isEven()) {
            a = a.divide(roughLOB(a));
        }
        do {
            while (b.isEven()) {
                b = b.divide(roughLOB(b));
            }
            if (a.greater(b)) {
                t = b; b = a; a = t;
            }
            b = b.subtract(a);
        } while (!b.isZero());
        return c.isUnit() ? a : a.multiply(c);
    }
    function lcm(a, b) {
        a = parseValue(a).abs();
        b = parseValue(b).abs();
        return a.divide(gcd(a, b)).multiply(b);
    }
    function randBetween(a, b, rng) {
        a = parseValue(a);
        b = parseValue(b);
        var usedRNG = rng || Math.random;
        var low = min(a, b), high = max(a, b);
        var range = high.subtract(low).add(1);
        if (range.isSmall) return low.add(Math.floor(usedRNG() * range));
        var digits = toBase(range, BASE).value;
        var result = [], restricted = true;
        for (var i = 0; i < digits.length; i++) {
            var top = restricted ? digits[i] : BASE;
            var digit = truncate(usedRNG() * top);
            result.push(digit);
            if (digit < top) restricted = false;
        }
        return low.add(Integer.fromArray(result, BASE, false));
    }

    var parseBase = function (text, base, alphabet, caseSensitive) {
        alphabet = alphabet || DEFAULT_ALPHABET;
        text = String(text);
        if (!caseSensitive) {
            text = text.toLowerCase();
            alphabet = alphabet.toLowerCase();
        }
        var length = text.length;
        var i;
        var absBase = Math.abs(base);
        var alphabetValues = {};
        for (i = 0; i < alphabet.length; i++) {
            alphabetValues[alphabet[i]] = i;
        }
        for (i = 0; i < length; i++) {
            var c = text[i];
            if (c === "-") continue;
            if (c in alphabetValues) {
                if (alphabetValues[c] >= absBase) {
                    if (c === "1" && absBase === 1) continue;
                    throw new Error(c + " is not a valid digit in base " + base + ".");
                }
            }
        }
        base = parseValue(base);
        var digits = [];
        var isNegative = text[0] === "-";
        for (i = isNegative ? 1 : 0; i < text.length; i++) {
            var c = text[i];
            if (c in alphabetValues) digits.push(parseValue(alphabetValues[c]));
            else if (c === "<") {
                var start = i;
                do { i++; } while (text[i] !== ">" && i < text.length);
                digits.push(parseValue(text.slice(start + 1, i)));
            }
            else throw new Error(c + " is not a valid character");
        }
        return parseBaseFromArray(digits, base, isNegative);
    };

    function parseBaseFromArray(digits, base, isNegative) {
        var val = Integer[0], pow = Integer[1], i;
        for (i = digits.length - 1; i >= 0; i--) {
            val = val.add(digits[i].times(pow));
            pow = pow.times(base);
        }
        return isNegative ? val.negate() : val;
    }

    function stringify(digit, alphabet) {
        alphabet = alphabet || DEFAULT_ALPHABET;
        if (digit < alphabet.length) {
            return alphabet[digit];
        }
        return "<" + digit + ">";
    }

    function toBase(n, base) {
        base = bigInt(base);
        if (base.isZero()) {
            if (n.isZero()) return { value: [0], isNegative: false };
            throw new Error("Cannot convert nonzero numbers to base 0.");
        }
        if (base.equals(-1)) {
            if (n.isZero()) return { value: [0], isNegative: false };
            if (n.isNegative())
                return {
                    value: [].concat.apply([], Array.apply(null, Array(-n.toJSNumber()))
                        .map(Array.prototype.valueOf, [1, 0])
                    ),
                    isNegative: false
                };

            var arr = Array.apply(null, Array(n.toJSNumber() - 1))
                .map(Array.prototype.valueOf, [0, 1]);
            arr.unshift([1]);
            return {
                value: [].concat.apply([], arr),
                isNegative: false
            };
        }

        var neg = false;
        if (n.isNegative() && base.isPositive()) {
            neg = true;
            n = n.abs();
        }
        if (base.isUnit()) {
            if (n.isZero()) return { value: [0], isNegative: false };

            return {
                value: Array.apply(null, Array(n.toJSNumber()))
                    .map(Number.prototype.valueOf, 1),
                isNegative: neg
            };
        }
        var out = [];
        var left = n, divmod;
        while (left.isNegative() || left.compareAbs(base) >= 0) {
            divmod = left.divmod(base);
            left = divmod.quotient;
            var digit = divmod.remainder;
            if (digit.isNegative()) {
                digit = base.minus(digit).abs();
                left = left.next();
            }
            out.push(digit.toJSNumber());
        }
        out.push(left.toJSNumber());
        return { value: out.reverse(), isNegative: neg };
    }

    function toBaseString(n, base, alphabet) {
        var arr = toBase(n, base);
        return (arr.isNegative ? "-" : "") + arr.value.map(function (x) {
            return stringify(x, alphabet);
        }).join('');
    }

    BigInteger.prototype.toArray = function (radix) {
        return toBase(this, radix);
    };

    SmallInteger.prototype.toArray = function (radix) {
        return toBase(this, radix);
    };

    NativeBigInt.prototype.toArray = function (radix) {
        return toBase(this, radix);
    };

    BigInteger.prototype.toString = function (radix, alphabet) {
        if (radix === undefined$1) radix = 10;
        if (radix !== 10) return toBaseString(this, radix, alphabet);
        var v = this.value, l = v.length, str = String(v[--l]), zeros = "0000000", digit;
        while (--l >= 0) {
            digit = String(v[l]);
            str += zeros.slice(digit.length) + digit;
        }
        var sign = this.sign ? "-" : "";
        return sign + str;
    };

    SmallInteger.prototype.toString = function (radix, alphabet) {
        if (radix === undefined$1) radix = 10;
        if (radix != 10) return toBaseString(this, radix, alphabet);
        return String(this.value);
    };

    NativeBigInt.prototype.toString = SmallInteger.prototype.toString;

    NativeBigInt.prototype.toJSON = BigInteger.prototype.toJSON = SmallInteger.prototype.toJSON = function () { return this.toString(); };

    BigInteger.prototype.valueOf = function () {
        return parseInt(this.toString(), 10);
    };
    BigInteger.prototype.toJSNumber = BigInteger.prototype.valueOf;

    SmallInteger.prototype.valueOf = function () {
        return this.value;
    };
    SmallInteger.prototype.toJSNumber = SmallInteger.prototype.valueOf;
    NativeBigInt.prototype.valueOf = NativeBigInt.prototype.toJSNumber = function () {
        return parseInt(this.toString(), 10);
    };

    function parseStringValue(v) {
        if (isPrecise(+v)) {
            var x = +v;
            if (x === truncate(x))
                return supportsNativeBigInt ? new NativeBigInt(BigInt(x)) : new SmallInteger(x);
            throw new Error("Invalid integer: " + v);
        }
        var sign = v[0] === "-";
        if (sign) v = v.slice(1);
        var split = v.split(/e/i);
        if (split.length > 2) throw new Error("Invalid integer: " + split.join("e"));
        if (split.length === 2) {
            var exp = split[1];
            if (exp[0] === "+") exp = exp.slice(1);
            exp = +exp;
            if (exp !== truncate(exp) || !isPrecise(exp)) throw new Error("Invalid integer: " + exp + " is not a valid exponent.");
            var text = split[0];
            var decimalPlace = text.indexOf(".");
            if (decimalPlace >= 0) {
                exp -= text.length - decimalPlace - 1;
                text = text.slice(0, decimalPlace) + text.slice(decimalPlace + 1);
            }
            if (exp < 0) throw new Error("Cannot include negative exponent part for integers");
            text += (new Array(exp + 1)).join("0");
            v = text;
        }
        var isValid = /^([0-9][0-9]*)$/.test(v);
        if (!isValid) throw new Error("Invalid integer: " + v);
        if (supportsNativeBigInt) {
            return new NativeBigInt(BigInt(sign ? "-" + v : v));
        }
        var r = [], max = v.length, l = LOG_BASE, min = max - l;
        while (max > 0) {
            r.push(+v.slice(min, max));
            min -= l;
            if (min < 0) min = 0;
            max -= l;
        }
        trim(r);
        return new BigInteger(r, sign);
    }

    function parseNumberValue(v) {
        if (supportsNativeBigInt) {
            return new NativeBigInt(BigInt(v));
        }
        if (isPrecise(v)) {
            if (v !== truncate(v)) throw new Error(v + " is not an integer.");
            return new SmallInteger(v);
        }
        return parseStringValue(v.toString());
    }

    function parseValue(v) {
        if (typeof v === "number") {
            return parseNumberValue(v);
        }
        if (typeof v === "string") {
            return parseStringValue(v);
        }
        if (typeof v === "bigint") {
            return new NativeBigInt(v);
        }
        return v;
    }
    // Pre-define numbers in range [-999,999]
    for (var i = 0; i < 1000; i++) {
        Integer[i] = parseValue(i);
        if (i > 0) Integer[-i] = parseValue(-i);
    }
    // Backwards compatibility
    Integer.one = Integer[1];
    Integer.zero = Integer[0];
    Integer.minusOne = Integer[-1];
    Integer.max = max;
    Integer.min = min;
    Integer.gcd = gcd;
    Integer.lcm = lcm;
    Integer.isInstance = function (x) { return x instanceof BigInteger || x instanceof SmallInteger || x instanceof NativeBigInt; };
    Integer.randBetween = randBetween;

    Integer.fromArray = function (digits, base, isNegative) {
        return parseBaseFromArray(digits.map(parseValue), parseValue(base || 10), isNegative);
    };

    return Integer;
})();

// Node.js check
if ( module.hasOwnProperty("exports")) {
    module.exports = bigInt;
}
});

function fromString$1(s, radix) {
    if (typeof s == "string") {
        if (s.slice(0,2) == "0x") {
            return BigInteger(s.slice(2), 16);
        } else {
            return BigInteger(s,radix);
        }
    } else {
        return BigInteger(s, radix);
    }
}

const e$1 = fromString$1;

function fromArray$1(a, radix) {
    return BigInteger.fromArray(a, radix);
}

function bitLength$1(a) {
    return BigInteger(a).bitLength();
}

function isNegative$1(a) {
    return BigInteger(a).isNegative();
}

function isZero$1(a) {
    return BigInteger(a).isZero();
}

function shiftLeft$1(a, n) {
    return BigInteger(a).shiftLeft(n);
}

function shiftRight$1(a, n) {
    return BigInteger(a).shiftRight(n);
}

const shl$1 = shiftLeft$1;
const shr$1 = shiftRight$1;

function isOdd$1(a) {
    return BigInteger(a).isOdd();
}


function naf$1(n) {
    let E = BigInteger(n);
    const res = [];
    while (E.gt(BigInteger.zero)) {
        if (E.isOdd()) {
            const z = 2 - E.mod(4).toJSNumber();
            res.push( z );
            E = E.minus(z);
        } else {
            res.push( 0 );
        }
        E = E.shiftRight(1);
    }
    return res;
}

function bits$1(n) {
    let E = BigInteger(n);
    const res = [];
    while (E.gt(BigInteger.zero)) {
        if (E.isOdd()) {
            res.push(1);
        } else {
            res.push( 0 );
        }
        E = E.shiftRight(1);
    }
    return res;
}

function toNumber$1(s) {
    if (!s.lt(BigInteger("9007199254740992", 10))) {
        throw new Error("Number too big");
    }
    return s.toJSNumber();
}

function toArray$1(s, radix) {
    return BigInteger(s).toArray(radix);
}

function add$1(a, b) {
    return BigInteger(a).add(BigInteger(b));
}

function sub$1(a, b) {
    return BigInteger(a).minus(BigInteger(b));
}

function neg$1(a) {
    return BigInteger.zero.minus(BigInteger(a));
}

function mul$1(a, b) {
    return BigInteger(a).times(BigInteger(b));
}

function square$1(a) {
    return BigInteger(a).square();
}

function pow$1(a, b) {
    return BigInteger(a).pow(BigInteger(b));
}

function exp$1(a, b) {
    return BigInteger(a).pow(BigInteger(b));
}

function abs$1(a) {
    return BigInteger(a).abs();
}

function div$1(a, b) {
    return BigInteger(a).divide(BigInteger(b));
}

function mod$1(a, b) {
    return BigInteger(a).mod(BigInteger(b));
}

function eq$1(a, b) {
    return BigInteger(a).eq(BigInteger(b));
}

function neq$1(a, b) {
    return BigInteger(a).neq(BigInteger(b));
}

function lt$1(a, b) {
    return BigInteger(a).lt(BigInteger(b));
}

function gt$1(a, b) {
    return BigInteger(a).gt(BigInteger(b));
}

function leq$1(a, b) {
    return BigInteger(a).leq(BigInteger(b));
}

function geq$1(a, b) {
    return BigInteger(a).geq(BigInteger(b));
}

function band$1(a, b) {
    return BigInteger(a).and(BigInteger(b));
}

function bor$1(a, b) {
    return BigInteger(a).or(BigInteger(b));
}

function bxor$1(a, b) {
    return BigInteger(a).xor(BigInteger(b));
}

function land$1(a, b) {
    return (!BigInteger(a).isZero()) && (!BigInteger(b).isZero());
}

function lor$1(a, b) {
    return (!BigInteger(a).isZero()) || (!BigInteger(b).isZero());
}

function lnot$1(a) {
    return BigInteger(a).isZero();
}

var Scalar_bigint = /*#__PURE__*/Object.freeze({
    __proto__: null,
    fromString: fromString$1,
    e: e$1,
    fromArray: fromArray$1,
    bitLength: bitLength$1,
    isNegative: isNegative$1,
    isZero: isZero$1,
    shiftLeft: shiftLeft$1,
    shiftRight: shiftRight$1,
    shl: shl$1,
    shr: shr$1,
    isOdd: isOdd$1,
    naf: naf$1,
    bits: bits$1,
    toNumber: toNumber$1,
    toArray: toArray$1,
    add: add$1,
    sub: sub$1,
    neg: neg$1,
    mul: mul$1,
    square: square$1,
    pow: pow$1,
    exp: exp$1,
    abs: abs$1,
    div: div$1,
    mod: mod$1,
    eq: eq$1,
    neq: neq$1,
    lt: lt$1,
    gt: gt$1,
    leq: leq$1,
    geq: geq$1,
    band: band$1,
    bor: bor$1,
    bxor: bxor$1,
    land: land$1,
    lor: lor$1,
    lnot: lnot$1
});

const supportsNativeBigInt = typeof BigInt === "function";

let Scalar = {};
if (supportsNativeBigInt) {
    Object.assign(Scalar, Scalar_native);
} else {
    Object.assign(Scalar, Scalar_bigint);
}


// Returns a buffer with Little Endian Representation
Scalar.toRprLE = function rprBE(buff, o, e, n8) {
    const s = "0000000" + e.toString(16);
    const v = new Uint32Array(buff.buffer, o, n8/4);
    const l = (((s.length-7)*4 - 1) >> 5)+1;    // Number of 32bit words;
    for (let i=0; i<l; i++) v[i] = parseInt(s.substring(s.length-8*i-8, s.length-8*i), 16);
    for (let i=l; i<v.length; i++) v[i] = 0;
    for (let i=v.length*4; i<n8; i++) buff[i] = Scalar.toNumber(Scalar.band(Scalar.shiftRight(e, i*8), 0xFF));
};

// Returns a buffer with Big Endian Representation
Scalar.toRprBE = function rprLEM(buff, o, e, n8) {
    const s = "0000000" + e.toString(16);
    const v = new DataView(buff.buffer, o, n8);
    const l = (((s.length-7)*4 - 1) >> 5)+1;    // Number of 32bit words;
    for (let i=0; i<l; i++) v.setUint32(n8-i*4 -4, parseInt(s.substring(s.length-8*i-8, s.length-8*i), 16), false);
    for (let i=0; i<n8/4-l; i++) v[i] = 0;
};

// Pases a buffer with Little Endian Representation
Scalar.fromRprLE = function rprLEM(buff, o, n8) {
    n8 = n8 || buff.byteLength;
    const v = new Uint32Array(buff.buffer, o, n8/4);
    const a = new Array(n8/4);
    v.forEach( (ch,i) => a[a.length-i-1] = ch.toString(16).padStart(8,"0") );
    return Scalar.fromString(a.join(""), 16);
};

// Pases a buffer with Big Endian Representation
Scalar.fromRprBE = function rprLEM(buff, o, n8) {
    n8 = n8 || buff.byteLength;
    const v = new DataView(buff.buffer, o, n8);
    const a = new Array(n8/4);
    for (let i=0; i<n8/4; i++) {
        a[i] = v.getUint32(i*4, false).toString(16).padStart(8, "0");
    }
    return Scalar.fromString(a.join(""), 16);
};

Scalar.toString = function toString(a, radix) {
    return a.toString(radix);
};

Scalar.toLEBuff = function toLEBuff(a) {
    const buff = new Uint8Array(Math.floor((Scalar.bitLength(a) - 1) / 8) +1);
    Scalar.toRprLE(buff, 0, a, buff.byteLength);
    return buff;
};


Scalar.zero = Scalar.e(0);
Scalar.one = Scalar.e(1);

let {
    toRprLE,
    toRprBE,
    fromRprLE,
    fromRprBE,
    toString,
    toLEBuff,
    zero,
    one,
    fromString: fromString$2,
    e: e$2,
    fromArray: fromArray$2,
    bitLength: bitLength$2,
    isNegative: isNegative$2,
    isZero: isZero$2,
    shiftLeft: shiftLeft$2,
    shiftRight: shiftRight$2,
    shl: shl$2,
    shr: shr$2,
    isOdd: isOdd$2,
    naf: naf$2,
    bits: bits$2,
    toNumber: toNumber$2,
    toArray: toArray$2,
    add: add$2,
    sub: sub$2,
    neg: neg$2,
    mul: mul$2,
    square: square$2,
    pow: pow$2,
    exp: exp$2,
    abs: abs$2,
    div: div$2,
    mod: mod$2,
    eq: eq$2,
    neq: neq$2,
    lt: lt$2,
    gt: gt$2,
    leq: leq$2,
    geq: geq$2,
    band: band$2,
    bor: bor$2,
    bxor: bxor$2,
    land: land$2,
    lor: lor$2,
    lnot: lnot$2,
} = Scalar;

var _Scalar = /*#__PURE__*/Object.freeze({
    __proto__: null,
    toRprLE: toRprLE,
    toRprBE: toRprBE,
    fromRprLE: fromRprLE,
    fromRprBE: fromRprBE,
    toString: toString,
    toLEBuff: toLEBuff,
    zero: zero,
    one: one,
    fromString: fromString$2,
    e: e$2,
    fromArray: fromArray$2,
    bitLength: bitLength$2,
    isNegative: isNegative$2,
    isZero: isZero$2,
    shiftLeft: shiftLeft$2,
    shiftRight: shiftRight$2,
    shl: shl$2,
    shr: shr$2,
    isOdd: isOdd$2,
    naf: naf$2,
    bits: bits$2,
    toNumber: toNumber$2,
    toArray: toArray$2,
    add: add$2,
    sub: sub$2,
    neg: neg$2,
    mul: mul$2,
    square: square$2,
    pow: pow$2,
    exp: exp$2,
    abs: abs$2,
    div: div$2,
    mod: mod$2,
    eq: eq$2,
    neq: neq$2,
    lt: lt$2,
    gt: gt$2,
    leq: leq$2,
    geq: geq$2,
    band: band$2,
    bor: bor$2,
    bxor: bxor$2,
    land: land$2,
    lor: lor$2,
    lnot: lnot$2
});

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

/*
    This library does operations on polynomials with coefficients in a field F.

    A polynomial P(x) = p0 + p1 * x + p2 * x^2 + ... + pn * x^n  is represented
    by the array [ p0, p1, p2, ... , pn ].
 */

class PolField {
    constructor (F) {
        this.F = F;

        let rem = F.sqrt_t;
        let s = F.sqrt_s;

        const five = this.F.add(this.F.add(this.F.two, this.F.two), this.F.one);

        this.w = new Array(s+1);
        this.wi = new Array(s+1);
        this.w[s] = this.F.pow(five, rem);
        this.wi[s] = this.F.inv(this.w[s]);

        let n=s-1;
        while (n>=0) {
            this.w[n] = this.F.square(this.w[n+1]);
            this.wi[n] = this.F.square(this.wi[n+1]);
            n--;
        }


        this.roots = [];
/*        for (let i=0; i<16; i++) {
            let r = this.F.one;
            n = 1 << i;
            const rootsi = new Array(n);
            for (let j=0; j<n; j++) {
                rootsi[j] = r;
                r = this.F.mul(r, this.w[i]);
            }

            this.roots.push(rootsi);
        }
    */
        this._setRoots(15);
    }

    _setRoots(n) {
        for (let i=n; (i>=0) && (!this.roots[i]); i--) {
            let r = this.F.one;
            const nroots = 1 << i;
            const rootsi = new Array(nroots);
            for (let j=0; j<nroots; j++) {
                rootsi[j] = r;
                r = this.F.mul(r, this.w[i]);
            }
            this.roots[i] = rootsi;
        }
    }

    add(a, b) {
        const m = Math.max(a.length, b.length);
        const res = new Array(m);
        for (let i=0; i<m; i++) {
            res[i] = this.F.add(a[i] || this.F.zero, b[i] || this.F.zero);
        }
        return this.reduce(res);
    }

    double(a) {
        return this.add(a,a);
    }

    sub(a, b) {
        const m = Math.max(a.length, b.length);
        const res = new Array(m);
        for (let i=0; i<m; i++) {
            res[i] = this.F.sub(a[i] || this.F.zero, b[i] || this.F.zero);
        }
        return this.reduce(res);
    }

    mulScalar(p, b) {
        if (this.F.eq(b, this.F.zero)) return [];
        if (this.F.eq(b, this.F.one)) return p;
        const res = new Array(p.length);
        for (let i=0; i<p.length; i++) {
            res[i] = this.F.mul(p[i], b);
        }
        return res;
    }



    mul(a, b) {
        if (a.length == 0) return [];
        if (b.length == 0) return [];
        if (a.length == 1) return this.mulScalar(b, a[0]);
        if (b.length == 1) return this.mulScalar(a, b[0]);

        if (b.length > a.length) {
            [b, a] = [a, b];
        }

        if ((b.length <= 2) || (b.length < log2(a.length))) {
            return this.mulNormal(a,b);
        } else {
            return this.mulFFT(a,b);
        }
    }

    mulNormal(a, b) {
        let res = [];
        for (let i=0; i<b.length; i++) {
            res = this.add(res, this.scaleX(this.mulScalar(a, b[i]), i) );
        }
        return res;
    }

    mulFFT(a,b) {
        const longestN = Math.max(a.length, b.length);
        const bitsResult = log2(longestN-1)+2;
        this._setRoots(bitsResult);

        const m = 1 << bitsResult;
        const ea = this.extend(a,m);
        const eb = this.extend(b,m);

        const ta = __fft(this, ea, bitsResult, 0, 1);
        const tb = __fft(this, eb, bitsResult, 0, 1);

        const tres = new Array(m);

        for (let i=0; i<m; i++) {
            tres[i] = this.F.mul(ta[i], tb[i]);
        }

        const res = __fft(this, tres, bitsResult, 0, 1);

        const twoinvm = this.F.inv( this.F.mulScalar(this.F.one, m) );
        const resn = new Array(m);
        for (let i=0; i<m; i++) {
            resn[i] = this.F.mul(res[(m-i)%m], twoinvm);
        }

        return this.reduce(resn);
    }



    square(a) {
        return this.mul(a,a);
    }

    scaleX(p, n) {
        if (n==0) {
            return p;
        } else if (n>0) {
            const z = new Array(n).fill(this.F.zero);
            return z.concat(p);
        } else {
            if (-n >= p.length) return [];
            return p.slice(-n);
        }
    }

    eval2(p, x) {
        let v = this.F.zero;
        let ix = this.F.one;
        for (let i=0; i<p.length; i++) {
            v = this.F.add(v, this.F.mul(p[i], ix));
            ix = this.F.mul(ix, x);
        }
        return v;
    }

    eval(p,x) {
        const F = this.F;
        if (p.length == 0) return F.zero;
        const m = this._next2Power(p.length);
        const ep = this.extend(p, m);

        return _eval(ep, x, 0, 1, m);

        function _eval(p, x, offset, step, n) {
            if (n==1) return p[offset];
            const newX = F.square(x);
            const res= F.add(
                _eval(p, newX, offset, step << 1, n >> 1),
                F.mul(
                    x,
                    _eval(p, newX, offset+step , step << 1, n >> 1)));
            return res;
        }
    }

    lagrange(points) {
        let roots = [this.F.one];
        for (let i=0; i<points.length; i++) {
            roots = this.mul(roots, [this.F.neg(points[i][0]), this.F.one]);
        }

        let sum = [];
        for (let i=0; i<points.length; i++) {
            let mpol = this.ruffini(roots, points[i][0]);
            const factor =
                this.F.mul(
                    this.F.inv(this.eval(mpol, points[i][0])),
                    points[i][1]);
            mpol = this.mulScalar(mpol, factor);
            sum = this.add(sum, mpol);
        }
        return sum;
    }


    fft(p) {
        if (p.length <= 1) return p;
        const bits = log2(p.length-1)+1;
        this._setRoots(bits);

        const m = 1 << bits;
        const ep = this.extend(p, m);
        const res = __fft(this, ep, bits, 0, 1);
        return res;
    }

    fft2(p) {
        if (p.length <= 1) return p;
        const bits = log2(p.length-1)+1;
        this._setRoots(bits);

        const m = 1 << bits;
        const ep = this.extend(p, m);
        __bitReverse(ep, bits);
        const res = __fft2(this, ep, bits);
        return res;
    }


    ifft(p) {

        if (p.length <= 1) return p;
        const bits = log2(p.length-1)+1;
        this._setRoots(bits);
        const m = 1 << bits;
        const ep = this.extend(p, m);
        const res =  __fft(this, ep, bits, 0, 1);

        const twoinvm = this.F.inv( this.F.mulScalar(this.F.one, m) );
        const resn = new Array(m);
        for (let i=0; i<m; i++) {
            resn[i] = this.F.mul(res[(m-i)%m], twoinvm);
        }

        return resn;

    }


    ifft2(p) {

        if (p.length <= 1) return p;
        const bits = log2(p.length-1)+1;
        this._setRoots(bits);
        const m = 1 << bits;
        const ep = this.extend(p, m);
        __bitReverse(ep, bits);
        const res =  __fft2(this, ep, bits);

        const twoinvm = this.F.inv( this.F.mulScalar(this.F.one, m) );
        const resn = new Array(m);
        for (let i=0; i<m; i++) {
            resn[i] = this.F.mul(res[(m-i)%m], twoinvm);
        }

        return resn;

    }

    _fft(pall, bits, offset, step) {

        const n = 1 << bits;
        if (n==1) {
            return [ pall[offset] ];
        }

        const ndiv2 = n >> 1;
        const p1 = this._fft(pall, bits-1, offset, step*2);
        const p2 = this._fft(pall, bits-1, offset+step, step*2);

        const out = new Array(n);

        let m= this.F.one;
        for (let i=0; i<ndiv2; i++) {
            out[i] = this.F.add(p1[i], this.F.mul(m, p2[i]));
            out[i+ndiv2] = this.F.sub(p1[i], this.F.mul(m, p2[i]));
            m = this.F.mul(m, this.w[bits]);
        }

        return out;
    }

    extend(p, e) {
        if (e == p.length) return p;
        const z = new Array(e-p.length).fill(this.F.zero);

        return p.concat(z);
    }

    reduce(p) {
        if (p.length == 0) return p;
        if (! this.F.eq(p[p.length-1], this.F.zero) ) return p;
        let i=p.length-1;
        while( i>0 && this.F.eq(p[i], this.F.zero) ) i--;
        return p.slice(0, i+1);
    }

    eq(a, b) {
        const pa = this.reduce(a);
        const pb = this.reduce(b);

        if (pa.length != pb.length) return false;
        for (let i=0; i<pb.length; i++) {
            if (!this.F.eq(pa[i], pb[i])) return false;
        }

        return true;
    }

    ruffini(p, r) {
        const res = new Array(p.length-1);
        res[res.length-1] = p[p.length-1];
        for (let i = res.length-2; i>=0; i--) {
            res[i] = this.F.add(this.F.mul(res[i+1], r), p[i+1]);
        }
        return res;
    }

    _next2Power(v) {
        v--;
        v |= v >> 1;
        v |= v >> 2;
        v |= v >> 4;
        v |= v >> 8;
        v |= v >> 16;
        v++;
        return v;
    }

    toString(p) {
        const ap = this.normalize(p);
        let S = "";
        for (let i=ap.length-1; i>=0; i--) {
            if (!this.F.eq(p[i], this.F.zero)) {
                if (S!="") S += " + ";
                S = S + p[i].toString(10);
                if (i>0) {
                    S = S + "x";
                    if (i>1) {
                        S = S + "^" +i;
                    }
                }
            }
        }
        return S;
    }

    normalize(p) {
        const res  = new Array(p.length);
        for (let i=0; i<p.length; i++) {
            res[i] = this.F.normalize(p[i]);
        }
        return res;
    }


    _reciprocal(p, bits) {
        const k = 1 << bits;
        if (k==1) {
            return [ this.F.inv(p[0]) ];
        }
        const np = this.scaleX(p, -k/2);
        const q = this._reciprocal(np, bits-1);
        const a = this.scaleX(this.double(q), 3*k/2-2);
        const b = this.mul( this.square(q), p);

        return this.scaleX(this.sub(a,b),   -(k-2));
    }

    // divides x^m / v
    _div2(m, v) {
        const kbits = log2(v.length-1)+1;
        const k = 1 << kbits;

        const scaleV = k - v.length;

        // rec = x^(k - 2) / v* x^scaleV =>
        // rec = x^(k-2-scaleV)/ v
        //
        // res = x^m/v = x^(m + (2*k-2 - scaleV) - (2*k-2 - scaleV)) /v =>
        // res = rec * x^(m - (2*k-2 - scaleV)) =>
        // res = rec * x^(m - 2*k + 2 + scaleV)

        const rec = this._reciprocal(this.scaleX(v, scaleV), kbits);
        const res = this.scaleX(rec, m - 2*k + 2 + scaleV);

        return res;
    }

    div(_u, _v) {
        if (_u.length < _v.length) return [];
        const kbits = log2(_v.length-1)+1;
        const k = 1 << kbits;

        const u = this.scaleX(_u, k-_v.length);
        const v = this.scaleX(_v, k-_v.length);

        const n = v.length-1;
        let m = u.length-1;

        const s = this._reciprocal(v, kbits);
        let t;
        if (m>2*n) {
            t = this.sub(this.scaleX([this.F.one], 2*n), this.mul(s, v));
        }

        let q = [];
        let rem = u;
        let us, ut;
        let finish = false;

        while (!finish) {
            us = this.mul(rem, s);
            q = this.add(q, this.scaleX(us, -2*n));

            if ( m > 2*n ) {
                ut = this.mul(rem, t);
                rem = this.scaleX(ut, -2*n);
                m = rem.length-1;
            } else {
                finish = true;
            }
        }

        return q;
    }


    // returns the ith nth-root of one
    oneRoot(n, i) {
        let nbits = log2(n-1)+1;
        let res = this.F.one;
        let r = i;

        if(i>=n) {
            throw new Error("Given 'i' should be lower than 'n'");
        }
        else if (1<<nbits !== n) {
            throw new Error(`Internal errlr: ${n} should equal ${1<<nbits}`);
        }

        while (r>0) {
            if (r & 1 == 1) {
                res = this.F.mul(res, this.w[nbits]);
            }
            r = r >> 1;
            nbits --;
        }
        return res;
    }

    computeVanishingPolinomial(bits, t) {
        const m = 1 << bits;
        return this.F.sub(this.F.pow(t, m), this.F.one);
    }

    evaluateLagrangePolynomials(bits, t) {
        const m= 1 << bits;
        const tm = this.F.pow(t, m);
        const u= new Array(m).fill(this.F.zero);
        this._setRoots(bits);
        const omega = this.w[bits];

        if (this.F.eq(tm, this.F.one)) {
            for (let i = 0; i < m; i++) {
                if (this.F.eq(this.roots[bits][0],t)) { // i.e., t equals omega^i
                    u[i] = this.F.one;
                    return u;
                }
            }
        }

        const z = this.F.sub(tm, this.F.one);
        //        let l = this.F.mul(z,  this.F.pow(this.F.twoinv, m));
        let l = this.F.mul(z,  this.F.inv(this.F.e(m)));
        for (let i = 0; i < m; i++) {
            u[i] = this.F.mul(l, this.F.inv(this.F.sub(t,this.roots[bits][i])));
            l = this.F.mul(l, omega);
        }

        return u;
    }

    log2(V) {
        return log2(V);
    }
}

function log2( V )
{
    return( ( ( V & 0xFFFF0000 ) !== 0 ? ( V &= 0xFFFF0000, 16 ) : 0 ) | ( ( V & 0xFF00FF00 ) !== 0 ? ( V &= 0xFF00FF00, 8 ) : 0 ) | ( ( V & 0xF0F0F0F0 ) !== 0 ? ( V &= 0xF0F0F0F0, 4 ) : 0 ) | ( ( V & 0xCCCCCCCC ) !== 0 ? ( V &= 0xCCCCCCCC, 2 ) : 0 ) | ( ( V & 0xAAAAAAAA ) !== 0 ) );
}


function __fft(PF, pall, bits, offset, step) {

    const n = 1 << bits;
    if (n==1) {
        return [ pall[offset] ];
    } else if (n==2) {
        return [
            PF.F.add(pall[offset], pall[offset + step]),
            PF.F.sub(pall[offset], pall[offset + step])];
    }

    const ndiv2 = n >> 1;
    const p1 = __fft(PF, pall, bits-1, offset, step*2);
    const p2 = __fft(PF, pall, bits-1, offset+step, step*2);

    const out = new Array(n);

    for (let i=0; i<ndiv2; i++) {
        out[i] = PF.F.add(p1[i], PF.F.mul(PF.roots[bits][i], p2[i]));
        out[i+ndiv2] = PF.F.sub(p1[i], PF.F.mul(PF.roots[bits][i], p2[i]));
    }

    return out;
}


function __fft2(PF, pall, bits) {

    const n = 1 << bits;
    if (n==1) {
        return [ pall[0] ];
    }

    const ndiv2 = n >> 1;
    const p1 = __fft2(PF, pall.slice(0, ndiv2), bits-1);
    const p2 = __fft2(PF, pall.slice(ndiv2), bits-1);

    const out = new Array(n);

    for (let i=0; i<ndiv2; i++) {
        out[i] = PF.F.add(p1[i], PF.F.mul(PF.roots[bits][i], p2[i]));
        out[i+ndiv2] = PF.F.sub(p1[i], PF.F.mul(PF.roots[bits][i], p2[i]));
    }

    return out;
}

const _revTable = [];
for (let i=0; i<256; i++) {
    _revTable[i] = _revSlow(i, 8);
}

function _revSlow(idx, bits) {
    let res =0;
    let a = idx;
    for (let i=0; i<bits; i++) {
        res <<= 1;
        res = res | (a &1);
        a >>=1;
    }
    return res;
}

function rev(idx, bits) {
    return (
        _revTable[idx >>> 24] |
        (_revTable[(idx >>> 16) & 0xFF] << 8) |
        (_revTable[(idx >>> 8) & 0xFF] << 16) |
        (_revTable[idx & 0xFF] << 24)
    ) >>> (32-bits);
}

function __bitReverse(p, bits) {
    for (let k=0; k<p.length; k++) {
        const r = rev(k, bits);
        if (r>k) {
            const tmp= p[k];
            p[k] = p[r];
            p[r] = tmp;
        }
    }

}

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


function mulScalar(F, base, e) {
    let res;

    if (isZero$2(e)) return F.zero;

    const n = naf$2(e);

    if (n[n.length-1] == 1) {
        res = base;
    } else if (n[n.length-1] == -1) {
        res = F.neg(base);
    } else {
        throw new Error("invlaud NAF");
    }

    for (let i=n.length-2; i>=0; i--) {

        res = F.double(res);

        if (n[i] == 1) {
            res = F.add(res, base);
        } else if (n[i] == -1) {
            res = F.sub(res, base);
        }
    }

    return res;
}


/*
exports.mulScalar = (F, base, e) =>{
    let res = F.zero;
    let rem = bigInt(e);
    let exp = base;

    while (! rem.eq(bigInt.zero)) {
        if (rem.and(bigInt.one).eq(bigInt.one)) {
            res = F.add(res, exp);
        }
        exp = F.double(exp);
        rem = rem.shiftRight(1);
    }

    return res;
};
*/


function exp$3(F, base, e) {

    if (isZero$2(e)) return F.one;

    const n = bits$2(e);

    if (n.legth==0) return F.one;

    let res = base;

    for (let i=n.length-2; i>=0; i--) {

        res = F.square(res);

        if (n[i]) {
            res = F.mul(res, base);
        }
    }

    return res;
}

// Check here: https://eprint.iacr.org/2012/685.pdf

function buildSqrt (F) {
    if ((F.m % 2) == 1) {
        if (eq$2(mod$2(F.p, 4), 1 )) {
            if (eq$2(mod$2(F.p, 8), 1 )) {
                if (eq$2(mod$2(F.p, 16), 1 )) {
                    // alg7_muller(F);
                    alg5_tonelliShanks(F);
                } else if (eq$2(mod$2(F.p, 16), 9 )) {
                    alg4_kong(F);
                } else {
                    throw new Error("Field withot sqrt");
                }
            } else if (eq$2(mod$2(F.p, 8), 5 )) {
                alg3_atkin(F);
            } else {
                throw new Error("Field withot sqrt");
            }
        } else if (eq$2(mod$2(F.p, 4), 3 )) {
            alg2_shanks(F);
        }
    } else {
        const pm2mod4 = mod$2(pow$2(F.p, F.m/2), 4);
        if (pm2mod4 == 1) {
            alg10_adj(F);
        } else if (pm2mod4 == 3) {
            alg9_adj(F);
        } else {
            alg8_complex(F);
        }

    }
}


function alg5_tonelliShanks(F) {
    F.sqrt_q = pow$2(F.p, F.m);

    F.sqrt_s = 0;
    F.sqrt_t = sub$2(F.sqrt_q, 1);

    while (!isOdd$2(F.sqrt_t)) {
        F.sqrt_s = F.sqrt_s + 1;
        F.sqrt_t = div$2(F.sqrt_t, 2);
    }

    let c0 = F.one;

    while (F.eq(c0, F.one)) {
        const c = F.random();
        F.sqrt_z = F.pow(c, F.sqrt_t);
        c0 = F.pow(F.sqrt_z, 1 << (F.sqrt_s-1) );
    }

    F.sqrt_tm1d2 = div$2(sub$2(F.sqrt_t, 1),2);

    F.sqrt = function(a) {
        const F=this;
        if (F.isZero(a)) return F.zero;
        let w = F.pow(a, F.sqrt_tm1d2);
        const a0 = F.pow( F.mul(F.square(w), a), 1 << (F.sqrt_s-1) );
        if (F.eq(a0, F.negone)) return null;

        let v = F.sqrt_s;
        let x = F.mul(a, w);
        let b = F.mul(x, w);
        let z = F.sqrt_z;
        while (!F.eq(b, F.one)) {
            let b2k = F.square(b);
            let k=1;
            while (!F.eq(b2k, F.one)) {
                b2k = F.square(b2k);
                k++;
            }

            w = z;
            for (let i=0; i<v-k-1; i++) {
                w = F.square(w);
            }
            z = F.square(w);
            b = F.mul(b, z);
            x = F.mul(x, w);
            v = k;
        }
        return F.geq(x, F.zero) ? x : F.neg(x);
    };
}

function alg4_kong(F) {
    F.sqrt = function() {
        throw new Error("Sqrt alg 4 not implemented");
    };
}

function alg3_atkin(F) {
    F.sqrt = function() {
        throw new Error("Sqrt alg 3 not implemented");
    };
}

function alg2_shanks(F) {

    F.sqrt_q = pow$2(F.p, F.m);
    F.sqrt_e1 = div$2( sub$2(F.sqrt_q, 3) , 4);

    F.sqrt = function(a) {
        if (this.isZero(a)) return this.zero;

        // Test that have solution
        const a1 = this.pow(a, this.sqrt_e1);

        const a0 = this.mul(this.square(a1), a);

        if ( this.eq(a0, this.negone) ) return null;

        const x = this.mul(a1, a);

        return F.geq(x, F.zero) ? x : F.neg(x);
    };
}

function alg10_adj(F) {
    F.sqrt = function() {
        throw new Error("Sqrt alg 10 not implemented");
    };
}

function alg9_adj(F) {
    F.sqrt_q = pow$2(F.p, F.m/2);
    F.sqrt_e34 = div$2( sub$2(F.sqrt_q, 3) , 4);
    F.sqrt_e12 = div$2( sub$2(F.sqrt_q, 1) , 2);

    F.frobenius = function(n, x) {
        if ((n%2) == 1) {
            return F.conjugate(x);
        } else {
            return x;
        }
    };

    F.sqrt = function(a) {
        const F = this;
        const a1 = F.pow(a, F.sqrt_e34);
        const alfa = F.mul(F.square(a1), a);
        const a0 = F.mul(F.frobenius(1, alfa), alfa);
        if (F.eq(a0, F.negone)) return null;
        const x0 = F.mul(a1, a);
        let x;
        if (F.eq(alfa, F.negone)) {
            x = F.mul(x0, [F.F.zero, F.F.one]);
        } else {
            const b = F.pow(F.add(F.one, alfa), F.sqrt_e12);
            x = F.mul(b, x0);
        }
        return F.geq(x, F.zero) ? x : F.neg(x);
    };
}


function alg8_complex(F) {
    F.sqrt = function() {
        throw new Error("Sqrt alg 8 not implemented");
    };
}

function quarterRound(st, a, b, c, d) {

    st[a] = (st[a] + st[b]) >>> 0;
    st[d] = (st[d] ^ st[a]) >>> 0;
    st[d] = ((st[d] << 16) | ((st[d]>>>16) & 0xFFFF)) >>> 0;

    st[c] = (st[c] + st[d]) >>> 0;
    st[b] = (st[b] ^ st[c]) >>> 0;
    st[b] = ((st[b] << 12) | ((st[b]>>>20) & 0xFFF)) >>> 0;

    st[a] = (st[a] + st[b]) >>> 0;
    st[d] = (st[d] ^ st[a]) >>> 0;
    st[d] = ((st[d] << 8) | ((st[d]>>>24) & 0xFF)) >>> 0;

    st[c] = (st[c] + st[d]) >>> 0;
    st[b] = (st[b] ^ st[c]) >>> 0;
    st[b] = ((st[b] << 7) | ((st[b]>>>25) & 0x7F)) >>> 0;
}

function doubleRound(st) {
    quarterRound(st, 0, 4, 8,12);
    quarterRound(st, 1, 5, 9,13);
    quarterRound(st, 2, 6,10,14);
    quarterRound(st, 3, 7,11,15);

    quarterRound(st, 0, 5,10,15);
    quarterRound(st, 1, 6,11,12);
    quarterRound(st, 2, 7, 8,13);
    quarterRound(st, 3, 4, 9,14);
}

class ChaCha {

    constructor(seed) {
        seed = seed || [0,0,0,0,0,0,0,0];
        this.state = [
            0x61707865,
            0x3320646E,
            0x79622D32,
            0x6B206574,
            seed[0],
            seed[1],
            seed[2],
            seed[3],
            seed[4],
            seed[5],
            seed[6],
            seed[7],
            0,
            0,
            0,
            0
        ];
        this.idx = 16;
        this.buff = new Array(16);
    }

    nextU32() {
        if (this.idx == 16) this.update();
        return this.buff[this.idx++];
    }

    nextU64() {
        return add$2(mul$2(this.nextU32(), 0x100000000), this.nextU32());
    }

    nextBool() {
        return (this.nextU32() & 1) == 1;
    }

    update() {
        // Copy the state
        for (let i=0; i<16; i++) this.buff[i] = this.state[i];

        // Apply the rounds
        for (let i=0; i<10; i++) doubleRound(this.buff);

        // Add to the initial
        for (let i=0; i<16; i++) this.buff[i] = (this.buff[i] + this.state[i]) >>> 0;

        this.idx = 0;

        this.state[12] = (this.state[12] + 1) >>> 0;
        if (this.state[12] != 0) return;
        this.state[13] = (this.state[13] + 1) >>> 0;
        if (this.state[13] != 0) return;
        this.state[14] = (this.state[14] + 1) >>> 0;
        if (this.state[14] != 0) return;
        this.state[15] = (this.state[15] + 1) >>> 0;
    }
}

/* global window */

function getRandomBytes(n) {
    let array = new Uint8Array(n);
    if (typeof window !== "undefined") { // Browser
        if (typeof window.crypto !== "undefined") { // Supported
            window.crypto.getRandomValues(array);
        } else { // fallback
            for (let i=0; i<n; i++) {
                array[i] = (Math.random()*4294967296)>>>0;
            }
        }
    }
    else { // NodeJS
        crypto.randomFillSync(array);
    }
    return array;
}

function getRandomSeed() {
    const arr = getRandomBytes(32);
    const arrV = new Uint32Array(arr.buffer);
    const seed = [];
    for (let i=0; i<8; i++) {
        seed.push(arrV[i]);
    }
    return seed;
}

let threadRng = null;

function getThreadRng() {
    if (threadRng) return threadRng;
    threadRng = new ChaCha(getRandomSeed());
    return threadRng;
}

/* global BigInt */

class ZqField {
    constructor(p) {
        this.type="F1";
        this.one = 1n;
        this.zero = 0n;
        this.p = BigInt(p);
        this.m = 1;
        this.negone = this.p-1n;
        this.two = 2n;
        this.half = this.p >> 1n;
        this.bitLength = bitLength$2(this.p);
        this.mask = (1n << BigInt(this.bitLength)) - 1n;

        this.n64 = Math.floor((this.bitLength - 1) / 64)+1;
        this.n32 = this.n64*2;
        this.n8 = this.n64*8;
        this.R = this.e(1n << BigInt(this.n64*64));
        this.Ri = this.inv(this.R);

        const e = this.negone >> 1n;
        this.nqr = this.two;
        let r = this.pow(this.nqr, e);
        while (!this.eq(r, this.negone)) {
            this.nqr = this.nqr + 1n;
            r = this.pow(this.nqr, e);
        }


        this.s = 0;
        this.t = this.negone;

        while ((this.t & 1n) == 0n) {
            this.s = this.s + 1;
            this.t = this.t >> 1n;
        }

        this.nqr_to_t = this.pow(this.nqr, this.t);

        buildSqrt(this);
    }

    e(a,b) {
        let res;
        if (!b) {
            res = BigInt(a);
        } else if (b==16) {
            res = BigInt("0x"+a);
        }
        if (res < 0) {
            let nres = -res;
            if (nres >= this.p) nres = nres % this.p;
            return this.p - nres;
        } else {
            return (res>= this.p) ? res%this.p : res;
        }

    }

    add(a, b) {
        const res = a + b;
        return res >= this.p ? res-this.p : res;
    }

    sub(a, b) {
        return (a >= b) ? a-b : this.p-b+a;
    }

    neg(a) {
        return a ? this.p-a : a;
    }

    mul(a, b) {
        return (a*b)%this.p;
    }

    mulScalar(base, s) {
        return (base * this.e(s)) % this.p;
    }

    square(a) {
        return (a*a) % this.p;
    }

    eq(a, b) {
        return a==b;
    }

    neq(a, b) {
        return a!=b;
    }

    lt(a, b) {
        const aa = (a > this.half) ? a - this.p : a;
        const bb = (b > this.half) ? b - this.p : b;
        return aa < bb;
    }

    gt(a, b) {
        const aa = (a > this.half) ? a - this.p : a;
        const bb = (b > this.half) ? b - this.p : b;
        return aa > bb;
    }

    leq(a, b) {
        const aa = (a > this.half) ? a - this.p : a;
        const bb = (b > this.half) ? b - this.p : b;
        return aa <= bb;
    }

    geq(a, b) {
        const aa = (a > this.half) ? a - this.p : a;
        const bb = (b > this.half) ? b - this.p : b;
        return aa >= bb;
    }

    div(a, b) {
        return this.mul(a, this.inv(b));
    }

    idiv(a, b) {
        if (!b) throw new Error("Division by zero");
        return a / b;
    }

    inv(a) {
        if (!a) throw new Error("Division by zero");

        let t = 0n;
        let r = this.p;
        let newt = 1n;
        let newr = a % this.p;
        while (newr) {
            let q = r/newr;
            [t, newt] = [newt, t-q*newt];
            [r, newr] = [newr, r-q*newr];
        }
        if (t<0n) t += this.p;
        return t;
    }

    mod(a, b) {
        return a % b;
    }

    pow(b, e) {
        return exp$3(this, b, e);
    }

    exp(b, e) {
        return exp$3(this, b, e);
    }

    band(a, b) {
        const res =  ((a & b) & this.mask);
        return res >= this.p ? res-this.p : res;
    }

    bor(a, b) {
        const res =  ((a | b) & this.mask);
        return res >= this.p ? res-this.p : res;
    }

    bxor(a, b) {
        const res =  ((a ^ b) & this.mask);
        return res >= this.p ? res-this.p : res;
    }

    bnot(a) {
        const res = a ^ this.mask;
        return res >= this.p ? res-this.p : res;
    }

    shl(a, b) {
        if (Number(b) < this.bitLength) {
            const res = (a << b) & this.mask;
            return res >= this.p ? res-this.p : res;
        } else {
            const nb = this.p - b;
            if (Number(nb) < this.bitLength) {
                return a >> nb;
            } else {
                return 0n;
            }
        }
    }

    shr(a, b) {
        if (Number(b) < this.bitLength) {
            return a >> b;
        } else {
            const nb = this.p - b;
            if (Number(nb) < this.bitLength) {
                const res = (a << nb) & this.mask;
                return res >= this.p ? res-this.p : res;
            } else {
                return 0;
            }
        }
    }

    land(a, b) {
        return (a && b) ? 1n : 0n;
    }

    lor(a, b) {
        return (a || b) ? 1n : 0n;
    }

    lnot(a) {
        return (a) ? 0n : 1n;
    }

    sqrt_old(n) {

        if (n == 0n) return this.zero;

        // Test that have solution
        const res = this.pow(n, this.negone >> this.one);
        if ( res != 1n ) return null;

        let m = this.s;
        let c = this.nqr_to_t;
        let t = this.pow(n, this.t);
        let r = this.pow(n, this.add(this.t, this.one) >> 1n );

        while ( t != 1n ) {
            let sq = this.square(t);
            let i = 1;
            while (sq != 1n ) {
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

        if (r > (this.p >> 1n)) {
            r = this.neg(r);
        }

        return r;
    }

    normalize(a, b) {
        a = BigInt(a,b);
        if (a < 0) {
            let na = -a;
            if (na >= this.p) na = na % this.p;
            return this.p - na;
        } else {
            return (a>= this.p) ? a%this.p : a;
        }
    }

    random() {
        const nBytes = (this.bitLength*2 / 8);
        let res =0n;
        for (let i=0; i<nBytes; i++) {
            res = (res << 8n) + BigInt(getRandomBytes(1)[0]);
        }
        return res % this.p;
    }

    toString(a, base) {
        let vs;
        if (a > this.half) {
            const v = this.p-a;
            vs = "-"+v.toString(base);
        } else {
            vs = a.toString(base);
        }
        return vs;
    }

    isZero(a) {
        return a == 0n;
    }

    fromRng(rng) {
        let v;
        do {
            v=0n;
            for (let i=0; i<this.n64; i++) {
                v += rng.nextU64() << BigInt(64 *i);
            }
            v &= this.mask;
        } while (v >= this.p);
        v = (v * this.Ri) % this.p;   // Convert from montgomery
        return v;
    }

}

class ZqField$1 {
    constructor(p) {
        this.type="F1";
        this.one = BigInteger.one;
        this.zero = BigInteger.zero;
        this.p = BigInteger(p);
        this.m = 1;
        this.negone = this.p.minus(BigInteger.one);
        this.two = BigInteger(2);
        this.half = this.p.shiftRight(1);
        this.bitLength = this.p.bitLength();
        this.mask = BigInteger.one.shiftLeft(this.bitLength).minus(BigInteger.one);

        this.n64 = Math.floor((this.bitLength - 1) / 64)+1;
        this.n32 = this.n64*2;
        this.n8 = this.n64*8;
        this.R = BigInteger.one.shiftLeft(this.n64*64);
        this.Ri = this.inv(this.R);

        const e = this.negone.shiftRight(this.one);
        this.nqr = this.two;
        let r = this.pow(this.nqr, e);
        while (!r.equals(this.negone)) {
            this.nqr = this.nqr.add(this.one);
            r = this.pow(this.nqr, e);
        }

        this.s = this.zero;
        this.t = this.negone;

        while (!this.t.isOdd()) {
            this.s = this.s.add(this.one);
            this.t = this.t.shiftRight(this.one);
        }

        this.nqr_to_t = this.pow(this.nqr, this.t);

        buildSqrt(this);
    }

    e(a,b) {

        const res = BigInteger(a,b);

        return this.normalize(res);

    }

    add(a, b) {
        let res = a.add(b);
        if (res.geq(this.p)) {
            res = res.minus(this.p);
        }
        return res;
    }

    sub(a, b) {
        if (a.geq(b)) {
            return a.minus(b);
        } else {
            return this.p.minus(b.minus(a));
        }
    }

    neg(a) {
        if (a.isZero()) return a;
        return this.p.minus(a);
    }

    mul(a, b) {
        return a.times(b).mod(this.p);
    }

    mulScalar(base, s) {
        return base.times(BigInteger(s)).mod(this.p);
    }

    square(a) {
        return a.square().mod(this.p);
    }

    eq(a, b) {
        return a.eq(b);
    }

    neq(a, b) {
        return a.neq(b);
    }

    lt(a, b) {
        const aa = a.gt(this.half) ? a.minus(this.p) : a;
        const bb = b.gt(this.half) ? b.minus(this.p) : b;
        return aa.lt(bb);
    }

    gt(a, b) {
        const aa = a.gt(this.half) ? a.minus(this.p) : a;
        const bb = b.gt(this.half) ? b.minus(this.p) : b;
        return aa.gt(bb);
    }

    leq(a, b) {
        const aa = a.gt(this.half) ? a.minus(this.p) : a;
        const bb = b.gt(this.half) ? b.minus(this.p) : b;
        return aa.leq(bb);
    }

    geq(a, b) {
        const aa = a.gt(this.half) ? a.minus(this.p) : a;
        const bb = b.gt(this.half) ? b.minus(this.p) : b;
        return aa.geq(bb);
    }

    div(a, b) {
        if (b.isZero()) throw new Error("Division by zero");
        return a.times(b.modInv(this.p)).mod(this.p);
    }

    idiv(a, b) {
        if (b.isZero()) throw new Error("Division by zero");
        return a.divide(b);
    }

    inv(a) {
        if (a.isZero()) throw new Error("Division by zero");
        return a.modInv(this.p);
    }

    mod(a, b) {
        return a.mod(b);
    }

    pow(a, b) {
        return a.modPow(b, this.p);
    }

    exp(a, b) {
        return a.modPow(b, this.p);
    }

    band(a, b) {
        return a.and(b).and(this.mask).mod(this.p);
    }

    bor(a, b) {
        return a.or(b).and(this.mask).mod(this.p);
    }

    bxor(a, b) {
        return a.xor(b).and(this.mask).mod(this.p);
    }

    bnot(a) {
        return a.xor(this.mask).mod(this.p);
    }

    shl(a, b) {
        if (b.lt(this.bitLength)) {
            return a.shiftLeft(b).and(this.mask).mod(this.p);
        } else {
            const nb = this.p.minus(b);
            if (nb.lt(this.bitLength)) {
                return this.shr(a, nb);
            } else {
                return BigInteger.zero;
            }
        }
    }

    shr(a, b) {
        if (b.lt(this.bitLength)) {
            return a.shiftRight(b);
        } else {
            const nb = this.p.minus(b);
            if (nb.lt(this.bitLength)) {
                return this.shl(a, nb);
            } else {
                return BigInteger.zero;
            }
        }
    }

    land(a, b) {
        return (a.isZero() || b.isZero()) ? BigInteger.zero : BigInteger.one;
    }

    lor(a, b) {
        return (a.isZero() && b.isZero()) ? BigInteger.zero : BigInteger.one;
    }

    lnot(a) {
        return a.isZero() ? BigInteger.one : BigInteger.zero;
    }

    sqrt_old(n) {

        if (n.equals(this.zero)) return this.zero;

        // Test that have solution
        const res = this.pow(n, this.negone.shiftRight(this.one));
        if (!res.equals(this.one)) return null;

        let m = parseInt(this.s);
        let c = this.nqr_to_t;
        let t = this.pow(n, this.t);
        let r = this.pow(n, this.add(this.t, this.one).shiftRight(this.one) );

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

        if (r.greater(this.p.shiftRight(this.one))) {
            r = this.neg(r);
        }

        return r;
    }

    normalize(a) {
        a = BigInteger(a);
        if (a.isNegative()) {
            return this.p.minus(a.abs().mod(this.p));
        } else {
            return a.mod(this.p);
        }
    }

    random() {
        let res = BigInteger(0);
        let n = BigInteger(this.p.square());
        while (!n.isZero()) {
            res = res.shiftLeft(8).add(BigInteger(getRandomBytes(1)[0]));
            n = n.shiftRight(8);
        }
        return res.mod(this.p);
    }

    toString(a, base) {
        let vs;
        if (!a.lesserOrEquals(this.p.shiftRight(BigInteger(1)))) {
            const v = this.p.minus(a);
            vs = "-"+v.toString(base);
        } else {
            vs = a.toString(base);
        }

        return vs;
    }

    isZero(a) {
        return a.isZero();
    }

    fromRng(rng) {
        let v;
        do {
            v = BigInteger(0);
            for (let i=0; i<this.n64; i++) {
                v = v.add(v, rng.nextU64().shiftLeft(64*i));
            }
            v = v.and(this.mask);
        } while (v.geq(this.p));
        v = v.times(this.Ri).mod(this.q);
        return v;
    }


}

const supportsNativeBigInt$1 = typeof BigInt === "function";
let _F1Field;
if (supportsNativeBigInt$1) {
    _F1Field = ZqField;
} else {
    _F1Field = ZqField$1;
}

class F1Field extends _F1Field {

    // Returns a buffer with Little Endian Representation
    toRprLE(buff, o, e) {
        toRprLE(buff, o, e, this.n64*8);
    }

    // Returns a buffer with Big Endian Representation
    toRprBE(buff, o, e) {
        toRprBE(buff, o, e, this.n64*8);
    }

    // Returns a buffer with Big Endian Montgomery Representation
    toRprBEM(buff, o, e) {
        return this.toRprBE(buff, o, this.mul(this.R, e));
    }

    toRprLEM(buff, o, e) {
        return this.toRprLE(buff, o, this.mul(this.R, e));
    }


    // Pases a buffer with Little Endian Representation
    fromRprLE(buff, o) {
        return fromRprLE(buff, o, this.n8);
    }

    // Pases a buffer with Big Endian Representation
    fromRprBE(buff, o) {
        return fromRprBE(buff, o, this.n8);
    }

    fromRprLEM(buff, o) {
        return this.mul(this.fromRprLE(buff, o), this.Ri);
    }

    fromRprBEM(buff, o) {
        return this.mul(this.fromRprBE(buff, o), this.Ri);
    }

}

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

class F2Field {
    constructor(F, nonResidue) {
        this.type="F2";
        this.F = F;
        this.zero = [this.F.zero, this.F.zero];
        this.one = [this.F.one, this.F.zero];
        this.negone = this.neg(this.one);
        this.nonResidue = nonResidue;
        this.m = F.m*2;
        this.p = F.p;
        this.n64 = F.n64*2;
        this.n32 = this.n64*2;
        this.n8 = this.n64*8;

        buildSqrt(this);
    }

    _mulByNonResidue(a) {
        return this.F.mul(this.nonResidue, a);
    }

    copy(a) {
        return [this.F.copy(a[0]), this.F.copy(a[1])];
    }

    add(a, b) {
        return [
            this.F.add(a[0], b[0]),
            this.F.add(a[1], b[1])
        ];
    }

    double(a) {
        return this.add(a,a);
    }

    sub(a, b) {
        return [
            this.F.sub(a[0], b[0]),
            this.F.sub(a[1], b[1])
        ];
    }

    neg(a) {
        return this.sub(this.zero, a);
    }

    conjugate(a) {
        return [
            a[0],
            this.F.neg(a[1])
        ];
    }

    mul(a, b) {
        const aA = this.F.mul(a[0] , b[0]);
        const bB = this.F.mul(a[1] , b[1]);

        return [
            this.F.add( aA , this._mulByNonResidue(bB)),
            this.F.sub(
                this.F.mul(
                    this.F.add(a[0], a[1]),
                    this.F.add(b[0], b[1])),
                this.F.add(aA, bB))];
    }

    inv(a) {
        const t0 = this.F.square(a[0]);
        const t1 = this.F.square(a[1]);
        const t2 = this.F.sub(t0, this._mulByNonResidue(t1));
        const t3 = this.F.inv(t2);
        return [
            this.F.mul(a[0], t3),
            this.F.neg(this.F.mul( a[1], t3)) ];
    }

    div(a, b) {
        return this.mul(a, this.inv(b));
    }

    square(a) {
        const ab = this.F.mul(a[0] , a[1]);

        /*
        [
            (a + b) * (a + non_residue * b) - ab - non_residue * ab,
            ab + ab
        ];
        */

        return [
            this.F.sub(
                this.F.mul(
                    this.F.add(a[0], a[1]) ,
                    this.F.add(
                        a[0] ,
                        this._mulByNonResidue(a[1]))),
                this.F.add(
                    ab,
                    this._mulByNonResidue(ab))),
            this.F.add(ab, ab)
        ];
    }

    isZero(a) {
        return this.F.isZero(a[0]) && this.F.isZero(a[1]);
    }

    eq(a, b) {
        return this.F.eq(a[0], b[0]) && this.F.eq(a[1], b[1]);
    }

    mulScalar(base, e) {
        return mulScalar(this, base, e);
    }

    pow(base, e) {
        return exp$3(this, base, e);
    }

    exp(base, e) {
        return exp$3(this, base, e);
    }

    toString(a) {
        return `[ ${this.F.toString(a[0])} , ${this.F.toString(a[1])} ]`;
    }

    fromRng(rng) {
        const c0 = this.F.fromRng(rng);
        const c1 = this.F.fromRng(rng);
        return [c0, c1];
    }

    gt(a, b) {
        if (this.F.gt(a[0], b[0])) return true;
        if (this.F.gt(b[0], a[0])) return false;
        if (this.F.gt(a[1], b[1])) return true;
        return false;
    }

    geq(a, b) {
        return this.gt(a, b) || this.eq(a, b);
    }

    lt(a, b) {
        return !this.geq(a,b);
    }

    leq(a, b) {
        return !this.gt(a,b);
    }

    neq(a, b) {
        return !this.eq(a,b);
    }

    random() {
        return [this.F.random(), this.F.random()];
    }


    toRprLE(buff, o, e) {
        this.F.toRprLE(buff, o, e[0]);
        this.F.toRprLE(buff, o+this.F.n8, e[1]);
    }

    toRprBE(buff, o, e) {
        this.F.toRprBE(buff, o, e[1]);
        this.F.toRprBE(buff, o+this.F.n8, e[0]);
    }

    toRprLEM(buff, o, e) {
        this.F.toRprLEM(buff, o, e[0]);
        this.F.toRprLEM(buff, o+this.F.n8, e[1]);
    }


    toRprBEM(buff, o, e) {
        this.F.toRprBEM(buff, o, e[1]);
        this.F.toRprBEM(buff, o+this.F.n8, e[0]);
    }

    fromRprLE(buff, o) {
        o = o || 0;
        const c0 = this.F.fromRprLE(buff, o);
        const c1 = this.F.fromRprLE(buff, o+this.F.n8);
        return [c0, c1];
    }

    fromRprBE(buff, o) {
        o = o || 0;
        const c1 = this.F.fromRprBE(buff, o);
        const c0 = this.F.fromRprBE(buff, o+this.F.n8);
        return [c0, c1];
    }

    fromRprLEM(buff, o) {
        o = o || 0;
        const c0 = this.F.fromRprLEM(buff, o);
        const c1 = this.F.fromRprLEM(buff, o+this.F.n8);
        return [c0, c1];
    }

    fromRprBEM(buff, o) {
        o = o || 0;
        const c1 = this.F.fromRprBEM(buff, o);
        const c0 = this.F.fromRprBEM(buff, o+this.F.n8);
        return [c0, c1];
    }

}

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

class F3Field {
    constructor(F, nonResidue) {
        this.type="F3";
        this.F = F;
        this.zero = [this.F.zero, this.F.zero, this.F.zero];
        this.one = [this.F.one, this.F.zero, this.F.zero];
        this.negone = this.neg(this.one);
        this.nonResidue = nonResidue;
        this.m = F.m*3;
        this.p = F.p;
        this.n64 = F.n64*3;
        this.n32 = this.n64*2;
        this.n8 = this.n64*8;
    }

    _mulByNonResidue(a) {
        return this.F.mul(this.nonResidue, a);
    }

    copy(a) {
        return [this.F.copy(a[0]), this.F.copy(a[1]), this.F.copy(a[2])];
    }

    add(a, b) {
        return [
            this.F.add(a[0], b[0]),
            this.F.add(a[1], b[1]),
            this.F.add(a[2], b[2])
        ];
    }

    double(a) {
        return this.add(a,a);
    }

    sub(a, b) {
        return [
            this.F.sub(a[0], b[0]),
            this.F.sub(a[1], b[1]),
            this.F.sub(a[2], b[2])
        ];
    }

    neg(a) {
        return this.sub(this.zero, a);
    }

    mul(a, b) {

        const aA = this.F.mul(a[0] , b[0]);
        const bB = this.F.mul(a[1] , b[1]);
        const cC = this.F.mul(a[2] , b[2]);

        return [
            this.F.add(
                aA,
                this._mulByNonResidue(
                    this.F.sub(
                        this.F.mul(
                            this.F.add(a[1], a[2]),
                            this.F.add(b[1], b[2])),
                        this.F.add(bB, cC)))),    // aA + non_residue*((b+c)*(B+C)-bB-cC),

            this.F.add(
                this.F.sub(
                    this.F.mul(
                        this.F.add(a[0], a[1]),
                        this.F.add(b[0], b[1])),
                    this.F.add(aA, bB)),
                this._mulByNonResidue( cC)),   // (a+b)*(A+B)-aA-bB+non_residue*cC

            this.F.add(
                this.F.sub(
                    this.F.mul(
                        this.F.add(a[0], a[2]),
                        this.F.add(b[0], b[2])),
                    this.F.add(aA, cC)),
                bB)];                           // (a+c)*(A+C)-aA+bB-cC)
    }

    inv(a) {
        const t0 = this.F.square(a[0]);             // t0 = a^2 ;
        const t1 = this.F.square(a[1]);             // t1 = b^2 ;
        const t2 = this.F.square(a[2]);             // t2 = c^2;
        const t3 = this.F.mul(a[0],a[1]);           // t3 = ab
        const t4 = this.F.mul(a[0],a[2]);           // t4 = ac
        const t5 = this.F.mul(a[1],a[2]);           // t5 = bc;
        // c0 = t0 - non_residue * t5;
        const c0 = this.F.sub(t0, this._mulByNonResidue(t5));
        // c1 = non_residue * t2 - t3;
        const c1 = this.F.sub(this._mulByNonResidue(t2), t3);
        const c2 = this.F.sub(t1, t4);              // c2 = t1-t4

        // t6 = (a * c0 + non_residue * (c * c1 + b * c2)).inv();
        const t6 =
            this.F.inv(
                this.F.add(
                    this.F.mul(a[0], c0),
                    this._mulByNonResidue(
                        this.F.add(
                            this.F.mul(a[2], c1),
                            this.F.mul(a[1], c2)))));

        return [
            this.F.mul(t6, c0),         // t6*c0
            this.F.mul(t6, c1),         // t6*c1
            this.F.mul(t6, c2)];        // t6*c2
    }

    div(a, b) {
        return this.mul(a, this.inv(b));
    }

    square(a) {
        const s0 = this.F.square(a[0]);                   // s0 = a^2
        const ab = this.F.mul(a[0], a[1]);                // ab = a*b
        const s1 = this.F.add(ab, ab);                    // s1 = 2ab;
        const s2 = this.F.square(
            this.F.add(this.F.sub(a[0],a[1]), a[2]));     // s2 = (a - b + c)^2;
        const bc = this.F.mul(a[1],a[2]);                 // bc = b*c
        const s3 = this.F.add(bc, bc);                    // s3 = 2*bc
        const s4 = this.F.square(a[2]);                   // s4 = c^2


        return [
            this.F.add(
                s0,
                this._mulByNonResidue(s3)),           // s0 + non_residue * s3,
            this.F.add(
                s1,
                this._mulByNonResidue(s4)),           // s1 + non_residue * s4,
            this.F.sub(
                this.F.add( this.F.add(s1, s2) , s3 ),
                this.F.add(s0, s4))];                      // s1 + s2 + s3 - s0 - s4
    }

    isZero(a) {
        return this.F.isZero(a[0]) && this.F.isZero(a[1]) && this.F.isZero(a[2]);
    }

    eq(a, b) {
        return this.F.eq(a[0], b[0]) && this.F.eq(a[1], b[1]) && this.F.eq(a[2], b[2]);
    }

    affine(a) {
        return [this.F.affine(a[0]), this.F.affine(a[1]), this.F.affine(a[2])];
    }

    mulScalar(base, e) {
        return mulScalar(this, base, e);
    }

    pow(base, e) {
        return exp$3(this, base, e);
    }

    exp(base, e) {
        return exp$3(this, base, e);
    }

    toString(a) {
        return `[ ${this.F.toString(a[0])} , ${this.F.toString(a[1])}, ${this.F.toString(a[2])} ]`;
    }

    fromRng(rng) {
        const c0 = this.F.fromRng(rng);
        const c1 = this.F.fromRng(rng);
        const c2 = this.F.fromRng(rng);
        return [c0, c1, c2];
    }

    gt(a, b) {
        if (this.F.gt(a[0], b[0])) return true;
        if (this.F.gt(b[0], a[0])) return false;
        if (this.F.gt(a[1], b[1])) return true;
        if (this.F.gt(b[1], a[1])) return false;
        if (this.F.gt(a[2], b[2])) return true;
        return false;
    }


    geq(a, b) {
        return this.gt(a, b) || this.eq(a, b);
    }

    lt(a, b) {
        return !this.geq(a,b);
    }

    leq(a, b) {
        return !this.gt(a,b);
    }

    neq(a, b) {
        return !this.eq(a,b);
    }

    random() {
        return [this.F.random(), this.F.random(), this.F.random()];
    }


    toRprLE(buff, o, e) {
        this.F.toRprLE(buff, o, e[0]);
        this.F.toRprLE(buff, o+this.F.n8, e[1]);
        this.F.toRprLE(buff, o+this.F.n8*2, e[2]);
    }

    toRprBE(buff, o, e) {
        this.F.toRprBE(buff, o, e[2]);
        this.F.toRprBE(buff, o+this.F.n8, e[1]);
        this.F.toRprBE(buff, o+this.F.n8*2, e[0]);
    }

    toRprLEM(buff, o, e) {
        this.F.toRprLEM(buff, o, e[0]);
        this.F.toRprLEM(buff, o+this.F.n8, e[1]);
        this.F.toRprLEM(buff, o+this.F.n8*2, e[2]);
    }


    toRprBEM(buff, o, e) {
        this.F.toRprBEM(buff, o, e[2]);
        this.F.toRprBEM(buff, o+this.F.n8, e[1]);
        this.F.toRprBEM(buff, o+this.F.n8*2, e[0]);
    }

    fromRprLE(buff, o) {
        o = o || 0;
        const c0 = this.F.fromRprLE(buff, o);
        const c1 = this.F.fromRprLE(buff, o+this.n8);
        const c2 = this.F.fromRprLE(buff, o+this.n8*2);
        return [c0, c1, c2];
    }

    fromRprBE(buff, o) {
        o = o || 0;
        const c2 = this.F.fromRprBE(buff, o);
        const c1 = this.F.fromRprBE(buff, o+this.n8);
        const c0 = this.F.fromRprBE(buff, o+this.n8*2);
        return [c0, c1, c2];
    }

    fromRprLEM(buff, o) {
        o = o || 0;
        const c0 = this.F.fromRprLEM(buff, o);
        const c1 = this.F.fromRprLEM(buff, o+this.n8);
        const c2 = this.F.fromRprLEM(buff, o+this.n8*2);
        return [c0, c1, c2];
    }

    fromRprBEM(buff, o) {
        o = o || 0;
        const c2 = this.F.fromRprBEM(buff, o);
        const c1 = this.F.fromRprBEM(buff, o+this.n8);
        const c0 = this.F.fromRprBEM(buff, o+this.n8*2);
        return [c0, c1, c2];
    }

}

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


function isGreatest(F, a) {
    if (Array.isArray(a)) {
        for (let i=a.length-1; i>=0; i--) {
            if (!F.F.isZero(a[i])) {
                return isGreatest(F.F, a[i]);
            }
        }
        return 0;
    } else {
        const na = F.neg(a);
        return gt$2(a, na);
    }
}


class EC {

    constructor(F, g) {
        this.F = F;
        this.g = g;
        if (this.g.length == 2) this.g[2] = this.F.one;
        this.zero = [this.F.zero, this.F.one, this.F.zero];
    }

    add(p1, p2) {

        const F = this.F;

        if (this.eq(p1, this.zero)) return p2;
        if (this.eq(p2, this.zero)) return p1;

        const res = new Array(3);

        const Z1Z1 = F.square( p1[2] );
        const Z2Z2 = F.square( p2[2] );

        const U1 = F.mul( p1[0] , Z2Z2 );     // U1 = X1  * Z2Z2
        const U2 = F.mul( p2[0] , Z1Z1 );     // U2 = X2  * Z1Z1

        const Z1_cubed = F.mul( p1[2] , Z1Z1);
        const Z2_cubed = F.mul( p2[2] , Z2Z2);

        const S1 = F.mul( p1[1] , Z2_cubed);  // S1 = Y1 * Z2 * Z2Z2
        const S2 = F.mul( p2[1] , Z1_cubed);  // S2 = Y2 * Z1 * Z1Z1

        if (F.eq(U1,U2) && F.eq(S1,S2)) {
            return this.double(p1);
        }

        const H = F.sub( U2 , U1 );                    // H = U2-U1

        const S2_minus_S1 = F.sub( S2 , S1 );

        const I = F.square( F.add(H,H) );         // I = (2 * H)^2
        const J = F.mul( H , I );                      // J = H * I

        const r = F.add( S2_minus_S1 , S2_minus_S1 );  // r = 2 * (S2-S1)
        const V = F.mul( U1 , I );                     // V = U1 * I

        res[0] =
            F.sub(
                F.sub( F.square(r) , J ),
                F.add( V , V ));                       // X3 = r^2 - J - 2 * V

        const S1_J = F.mul( S1 , J );

        res[1] =
            F.sub(
                F.mul( r , F.sub(V,res[0])),
                F.add( S1_J,S1_J ));                   // Y3 = r * (V-X3)-2 S1 J

        res[2] =
            F.mul(
                H,
                F.sub(
                    F.square( F.add(p1[2],p2[2]) ),
                    F.add( Z1Z1 , Z2Z2 )));            // Z3 = ((Z1+Z2)^2-Z1Z1-Z2Z2) * H

        return res;
    }

    neg(p) {
        return [p[0], this.F.neg(p[1]), p[2]];
    }

    sub(a, b) {
        return this.add(a, this.neg(b));
    }

    double(p) {
        const F = this.F;

        const res = new Array(3);

        if (this.eq(p, this.zero)) return p;

        const A = F.square( p[0] );                    // A = X1^2
        const B = F.square( p[1] );                    // B = Y1^2
        const C = F.square( B );                       // C = B^2

        let D =
            F.sub(
                F.square( F.add(p[0] , B )),
                F.add( A , C));
        D = F.add(D,D);                    // D = 2 * ((X1 + B)^2 - A - C)

        const E = F.add( F.add(A,A), A);          // E = 3 * A
        const FF =F.square( E );                       // F = E^2

        res[0] = F.sub( FF , F.add(D,D) );         // X3 = F - 2 D

        let eightC = F.add( C , C );
        eightC = F.add( eightC , eightC );
        eightC = F.add( eightC , eightC );

        res[1] =
            F.sub(
                F.mul(
                    E,
                    F.sub( D, res[0] )),
                eightC);                                    // Y3 = E * (D - X3) - 8 * C

        const Y1Z1 = F.mul( p[1] , p[2] );
        res[2] = F.add( Y1Z1 , Y1Z1 );                 // Z3 = 2 * Y1 * Z1

        return res;
    }

    timesScalar(base, e) {
        return mulScalar(this, base, e);
    }

    mulScalar(base, e) {
        return mulScalar(this, base, e);
    }

    affine(p) {
        const F = this.F;
        if (this.isZero(p)) {
            return this.zero;
        } else if (F.eq(p[2], F.one)) {
            return p;
        } else {
            const Z_inv = F.inv(p[2]);
            const Z2_inv = F.square(Z_inv);
            const Z3_inv = F.mul(Z2_inv, Z_inv);

            const res = new Array(3);
            res[0] = F.mul(p[0],Z2_inv);
            res[1] = F.mul(p[1],Z3_inv);
            res[2] = F.one;

            return res;
        }
    }

    multiAffine(arr) {
        const keys = Object.keys(arr);
        const F = this.F;
        const accMul = new Array(keys.length+1);
        accMul[0] = F.one;
        for (let i = 0; i< keys.length; i++) {
            if (F.eq(arr[keys[i]][2], F.zero)) {
                accMul[i+1] = accMul[i];
            } else {
                accMul[i+1] = F.mul(accMul[i], arr[keys[i]][2]);
            }
        }

        accMul[keys.length] = F.inv(accMul[keys.length]);

        for (let i = keys.length-1; i>=0; i--) {
            if (F.eq(arr[keys[i]][2], F.zero)) {
                accMul[i] = accMul[i+1];
                arr[keys[i]] = this.zero;
            } else {
                const Z_inv = F.mul(accMul[i], accMul[i+1]);
                accMul[i] = F.mul(arr[keys[i]][2], accMul[i+1]);

                const Z2_inv = F.square(Z_inv);
                const Z3_inv = F.mul(Z2_inv, Z_inv);

                arr[keys[i]][0] = F.mul(arr[keys[i]][0],Z2_inv);
                arr[keys[i]][1] = F.mul(arr[keys[i]][1],Z3_inv);
                arr[keys[i]][2] = F.one;
            }
        }

    }

    eq(p1, p2) {
        const F = this.F;

        if (this.F.eq(p1[2], this.F.zero)) return this.F.eq(p2[2], this.F.zero);
        if (this.F.eq(p2[2], this.F.zero)) return false;

        const Z1Z1 = F.square( p1[2] );
        const Z2Z2 = F.square( p2[2] );

        const U1 = F.mul( p1[0] , Z2Z2 );
        const U2 = F.mul( p2[0] , Z1Z1 );

        const Z1_cubed = F.mul( p1[2] , Z1Z1);
        const Z2_cubed = F.mul( p2[2] , Z2Z2);

        const S1 = F.mul( p1[1] , Z2_cubed);
        const S2 = F.mul( p2[1] , Z1_cubed);

        return (F.eq(U1,U2) && F.eq(S1,S2));
    }

    isZero(p) {
        return this.F.isZero(p[2]);
    }

    toString(p) {
        const cp = this.affine(p);
        return `[ ${this.F.toString(cp[0])} , ${this.F.toString(cp[1])} ]`;
    }

    fromRng(rng) {
        const F = this.F;
        let P = [];
        let greatest;
        do {
            P[0] = F.fromRng(rng);
            greatest = rng.nextBool();
            const x3b = F.add(F.mul(F.square(P[0]), P[0]), this.b);
            P[1] = F.sqrt(x3b);
        } while ((P[1] == null)||(F.isZero[P]));

        const s = isGreatest(F, P[1]);
        if (greatest ^ s) P[1] = F.neg(P[1]);
        P[2] = F.one;

        if (this.cofactor) {
            P = this.mulScalar(P, this.cofactor);
        }

        P = this.affine(P);

        return P;

    }

    toRprLE(buff, o, p) {
        p = this.affine(p);
        if (this.isZero(p)) {
            const BuffV = new Uint8Array(buff, o, this.F.n8*2);
            BuffV.fill(0);
            return;
        }
        this.F.toRprLE(buff, o, p[0]);
        this.F.toRprLE(buff, o+this.F.n8, p[1]);
    }

    toRprBE(buff, o, p) {
        p = this.affine(p);
        if (this.isZero(p)) {
            const BuffV = new Uint8Array(buff, o, this.F.n8*2);
            BuffV.fill(0);
            return;
        }
        this.F.toRprBE(buff, o, p[0]);
        this.F.toRprBE(buff, o+this.F.n8, p[1]);
    }

    toRprLEM(buff, o, p) {
        p = this.affine(p);
        if (this.isZero(p)) {
            const BuffV = new Uint8Array(buff, o, this.F.n8*2);
            BuffV.fill(0);
            return;
        }
        this.F.toRprLEM(buff, o, p[0]);
        this.F.toRprLEM(buff, o+this.F.n8, p[1]);
    }

    toRprLEJM(buff, o, p) {
        p = this.affine(p);
        if (this.isZero(p)) {
            const BuffV = new Uint8Array(buff, o, this.F.n8*2);
            BuffV.fill(0);
            return;
        }
        this.F.toRprLEM(buff, o, p[0]);
        this.F.toRprLEM(buff, o+this.F.n8, p[1]);
        this.F.toRprLEM(buff, o+2*this.F.n8, p[2]);
    }


    toRprBEM(buff, o, p) {
        p = this.affine(p);
        if (this.isZero(p)) {
            const BuffV = new Uint8Array(buff, o, this.F.n8*2);
            BuffV.fill(0);
            return;
        }
        this.F.toRprBEM(buff, o, p[0]);
        this.F.toRprBEM(buff, o+this.F.n8, p[1]);
    }

    fromRprLE(buff, o) {
        o = o || 0;
        const x = this.F.fromRprLE(buff, o);
        const y = this.F.fromRprLE(buff, o+this.F.n8);
        if (this.F.isZero(x) && this.F.isZero(y)) {
            return this.zero;
        }
        return [x, y, this.F.one];
    }

    fromRprBE(buff, o) {
        o = o || 0;
        const x = this.F.fromRprBE(buff, o);
        const y = this.F.fromRprBE(buff, o+this.F.n8);
        if (this.F.isZero(x) && this.F.isZero(y)) {
            return this.zero;
        }
        return [x, y, this.F.one];
    }

    fromRprLEM(buff, o) {
        o = o || 0;
        const x = this.F.fromRprLEM(buff, o);
        const y = this.F.fromRprLEM(buff, o+this.F.n8);
        if (this.F.isZero(x) && this.F.isZero(y)) {
            return this.zero;
        }
        return [x, y, this.F.one];
    }

    fromRprLEJM(buff, o) {
        o = o || 0;
        const x = this.F.fromRprLEM(buff, o);
        const y = this.F.fromRprLEM(buff, o+this.F.n8);
        const z = this.F.fromRprLEM(buff, o+this.F.n8*2);
        if (this.F.isZero(x) && this.F.isZero(y)) {
            return this.zero;
        }
        return [x, y, z];
    }

    fromRprBEM(buff, o) {
        o = o || 0;
        const x = this.F.fromRprBEM(buff, o);
        const y = this.F.fromRprBEM(buff, o+this.F.n8);
        if (this.F.isZero(x) && this.F.isZero(y)) {
            return this.zero;
        }
        return [x, y, this.F.one];
    }

    fromRprCompressed(buff, o) {
        const F = this.F;
        const v = new Uint8Array(buff.buffer, o, F.n8);
        if (v[0] & 0x40) return this.zero;
        const P = new Array(3);

        const greatest = ((v[0] & 0x80) != 0);
        v[0] = v[0] & 0x7F;
        P[0] = F.fromRprBE(buff, o);
        if (greatest) v[0] = v[0] | 0x80;  // set back again the old value

        const x3b = F.add(F.mul(F.square(P[0]), P[0]), this.b);
        P[1] = F.sqrt(x3b);

        if (P[1] === null) {
            throw new Error("Invalid Point!");
        }

        const s = isGreatest(F, P[1]);
        if (greatest ^ s) P[1] = F.neg(P[1]);
        P[2] = F.one;

        return P;
    }

    toRprCompressed(buff, o, p) {
        p = this.affine(p);
        const v = new Uint8Array(buff.buffer, o, this.F.n8);
        if (this.isZero(p)) {
            v.fill(0);
            v[0] = 0x40;
            return;
        }
        this.F.toRprBE(buff, o, p[0]);

        if (isGreatest(this.F, p[1])) {
            v[0] = v[0] | 0x80;
        }
    }


    fromRprUncompressed(buff, o) {
        if (buff[0] & 0x40) return this.zero;

        return this.fromRprBE(buff, o);
    }

    toRprUncompressed(buff, o, p) {
        this.toRprBE(buff, o, p);

        if (this.isZero(p)) {
            buff[o] = buff[o] | 0x40;
        }
    }


}

var code = "AGFzbQEAAAABiQERYAJ/fwBgAX8AYAF/AX9gAn9/AX9gA39/fwF/YAN/f38AYAN/fn8AYAJ/fgBgBH9/f38AYAV/f39/fwBgBH9/f38Bf2AHf39/f39/fwBgCH9/f39/f39/AGAFf39/f38Bf2AHf39/f39/fwF/YAl/f39/f39/f38Bf2ALf39/f39/f39/f38BfwIQAQNlbnYGbWVtb3J5AgDoBwOrAqkCAAECAQMDBAQFAAAGBwgFAgUFAAAFAAAAAAICAAEFCAkFBQgAAgIFBQAABQAAAAACAgABBQgJBQUIAAIFAAACAgIBAQAAAAMDAwAABQUFAAAFBQUAAAAAAAUABQAAAAAFBQUFBQoACwkKAAsJCAgDAAgIAgAACQUFAAgMCQICAQEABQUABQUAAAAAAwAIAgIJCAACAgIBAQAAAAMDAwAABQUFAAAFBQUAAAAAAAUABQAAAAAFBQUFBQoACwkKAAsJCAgFAwAICAIAAAkFBQUDAAgIAgAACQUFBQUJCQkJCQACAgEBAAUABQUAAgAAAwAIAgkIAAICAQEABQUABQUAAAAAAwAIAgIJCAACBQAAAAAICAUAAAAAAAAAAAAAAAAAAAAABA0ODxAFB70imgIIaW50X2NvcHkAAAhpbnRfemVybwABB2ludF9vbmUAAwppbnRfaXNaZXJvAAIGaW50X2VxAAQHaW50X2d0ZQAFB2ludF9hZGQABgdpbnRfc3ViAAcHaW50X211bAAICmludF9zcXVhcmUACQ1pbnRfc3F1YXJlT2xkAAoHaW50X2RpdgANDmludF9pbnZlcnNlTW9kAA4IZjFtX2NvcHkAAAhmMW1femVybwABCmYxbV9pc1plcm8AAgZmMW1fZXEABAdmMW1fYWRkABAHZjFtX3N1YgARB2YxbV9uZWcAEg5mMW1faXNOZWdhdGl2ZQAZCWYxbV9pc09uZQAPCGYxbV9zaWduABoLZjFtX21SZWR1Y3QAEwdmMW1fbXVsABQKZjFtX3NxdWFyZQAVDWYxbV9zcXVhcmVPbGQAFhJmMW1fZnJvbU1vbnRnb21lcnkAGBBmMW1fdG9Nb250Z29tZXJ5ABcLZjFtX2ludmVyc2UAGwdmMW1fb25lABwIZjFtX2xvYWQAHQ9mMW1fdGltZXNTY2FsYXIAHgdmMW1fZXhwACIQZjFtX2JhdGNoSW52ZXJzZQAfCGYxbV9zcXJ0ACMMZjFtX2lzU3F1YXJlACQVZjFtX2JhdGNoVG9Nb250Z29tZXJ5ACAXZjFtX2JhdGNoRnJvbU1vbnRnb21lcnkAIQhmcm1fY29weQAACGZybV96ZXJvAAEKZnJtX2lzWmVybwACBmZybV9lcQAEB2ZybV9hZGQAJgdmcm1fc3ViACcHZnJtX25lZwAoDmZybV9pc05lZ2F0aXZlAC8JZnJtX2lzT25lACUIZnJtX3NpZ24AMAtmcm1fbVJlZHVjdAApB2ZybV9tdWwAKgpmcm1fc3F1YXJlACsNZnJtX3NxdWFyZU9sZAAsEmZybV9mcm9tTW9udGdvbWVyeQAuEGZybV90b01vbnRnb21lcnkALQtmcm1faW52ZXJzZQAxB2ZybV9vbmUAMghmcm1fbG9hZAAzD2ZybV90aW1lc1NjYWxhcgA0B2ZybV9leHAAOBBmcm1fYmF0Y2hJbnZlcnNlADUIZnJtX3NxcnQAOQxmcm1faXNTcXVhcmUAOhVmcm1fYmF0Y2hUb01vbnRnb21lcnkANhdmcm1fYmF0Y2hGcm9tTW9udGdvbWVyeQA3BmZyX2FkZAAmBmZyX3N1YgAnBmZyX25lZwAoBmZyX211bAA7CWZyX3NxdWFyZQA8CmZyX2ludmVyc2UAPQ1mcl9pc05lZ2F0aXZlAD4HZnJfY29weQAAB2ZyX3plcm8AAQZmcl9vbmUAMglmcl9pc1plcm8AAgVmcl9lcQAEDGcxbV9tdWx0aWV4cABnEmcxbV9tdWx0aWV4cF9jaHVuawBmEmcxbV9tdWx0aWV4cEFmZmluZQBrGGcxbV9tdWx0aWV4cEFmZmluZV9jaHVuawBqCmcxbV9pc1plcm8AQBBnMW1faXNaZXJvQWZmaW5lAD8GZzFtX2VxAEgLZzFtX2VxTWl4ZWQARwxnMW1fZXFBZmZpbmUARghnMW1fY29weQBEDmcxbV9jb3B5QWZmaW5lAEMIZzFtX3plcm8AQg5nMW1femVyb0FmZmluZQBBCmcxbV9kb3VibGUAShBnMW1fZG91YmxlQWZmaW5lAEkHZzFtX2FkZABNDGcxbV9hZGRNaXhlZABMDWcxbV9hZGRBZmZpbmUASwdnMW1fbmVnAE8NZzFtX25lZ0FmZmluZQBOB2cxbV9zdWIAUgxnMW1fc3ViTWl4ZWQAUQ1nMW1fc3ViQWZmaW5lAFASZzFtX2Zyb21Nb250Z29tZXJ5AFQYZzFtX2Zyb21Nb250Z29tZXJ5QWZmaW5lAFMQZzFtX3RvTW9udGdvbWVyeQBWFmcxbV90b01vbnRnb21lcnlBZmZpbmUAVQ9nMW1fdGltZXNTY2FsYXIAbBVnMW1fdGltZXNTY2FsYXJBZmZpbmUAbQ1nMW1fbm9ybWFsaXplAFkKZzFtX0xFTXRvVQBbCmcxbV9MRU10b0MAXApnMW1fVXRvTEVNAF0KZzFtX0N0b0xFTQBeD2cxbV9iYXRjaExFTXRvVQBfD2cxbV9iYXRjaExFTXRvQwBgD2cxbV9iYXRjaFV0b0xFTQBhD2cxbV9iYXRjaEN0b0xFTQBiDGcxbV90b0FmZmluZQBXDmcxbV90b0phY29iaWFuAEURZzFtX2JhdGNoVG9BZmZpbmUAWBNnMW1fYmF0Y2hUb0phY29iaWFuAGMHZnJtX2ZmdABzCGZybV9pZmZ0AHQKZnJtX3Jhd2ZmdABxC2ZybV9mZnRKb2luAHUKZnJtX2ZmdE1peAB2DGZybV9mZnRGaW5hbAB3CHBvbF96ZXJvAHgPcG9sX2NvbnN0cnVjdExDAHkMcWFwX2J1aWxkQUJDAHoLcWFwX2pvaW5BQkMAewpmMm1faXNaZXJvAHwJZjJtX2lzT25lAH0IZjJtX3plcm8AfgdmMm1fb25lAH8IZjJtX2NvcHkAgAEHZjJtX211bACBAQhmMm1fbXVsMQCCAQpmMm1fc3F1YXJlAIMBB2YybV9hZGQAhAEHZjJtX3N1YgCFAQdmMm1fbmVnAIYBCGYybV9zaWduAI0BDWYybV9jb25qdWdhdGUAhwESZjJtX2Zyb21Nb250Z29tZXJ5AIkBEGYybV90b01vbnRnb21lcnkAiAEGZjJtX2VxAIoBC2YybV9pbnZlcnNlAIsBB2YybV9leHAAkAEPZjJtX3RpbWVzU2NhbGFyAIwBEGYybV9iYXRjaEludmVyc2UAjwEIZjJtX3NxcnQAkQEMZjJtX2lzU3F1YXJlAJIBDmYybV9pc05lZ2F0aXZlAI4BDGcybV9tdWx0aWV4cAC7ARJnMm1fbXVsdGlleHBfY2h1bmsAugESZzJtX211bHRpZXhwQWZmaW5lAL8BGGcybV9tdWx0aWV4cEFmZmluZV9jaHVuawC+AQpnMm1faXNaZXJvAJQBEGcybV9pc1plcm9BZmZpbmUAkwEGZzJtX2VxAJwBC2cybV9lcU1peGVkAJsBDGcybV9lcUFmZmluZQCaAQhnMm1fY29weQCYAQ5nMm1fY29weUFmZmluZQCXAQhnMm1femVybwCWAQ5nMm1femVyb0FmZmluZQCVAQpnMm1fZG91YmxlAJ4BEGcybV9kb3VibGVBZmZpbmUAnQEHZzJtX2FkZAChAQxnMm1fYWRkTWl4ZWQAoAENZzJtX2FkZEFmZmluZQCfAQdnMm1fbmVnAKMBDWcybV9uZWdBZmZpbmUAogEHZzJtX3N1YgCmAQxnMm1fc3ViTWl4ZWQApQENZzJtX3N1YkFmZmluZQCkARJnMm1fZnJvbU1vbnRnb21lcnkAqAEYZzJtX2Zyb21Nb250Z29tZXJ5QWZmaW5lAKcBEGcybV90b01vbnRnb21lcnkAqgEWZzJtX3RvTW9udGdvbWVyeUFmZmluZQCpAQ9nMm1fdGltZXNTY2FsYXIAwAEVZzJtX3RpbWVzU2NhbGFyQWZmaW5lAMEBDWcybV9ub3JtYWxpemUArQEKZzJtX0xFTXRvVQCvAQpnMm1fTEVNdG9DALABCmcybV9VdG9MRU0AsQEKZzJtX0N0b0xFTQCyAQ9nMm1fYmF0Y2hMRU10b1UAswEPZzJtX2JhdGNoTEVNdG9DALQBD2cybV9iYXRjaFV0b0xFTQC1AQ9nMm1fYmF0Y2hDdG9MRU0AtgEMZzJtX3RvQWZmaW5lAKsBDmcybV90b0phY29iaWFuAJkBEWcybV9iYXRjaFRvQWZmaW5lAKwBE2cybV9iYXRjaFRvSmFjb2JpYW4AtwELZzFtX3RpbWVzRnIAwgEHZzFtX2ZmdADIAQhnMW1faWZmdADJAQpnMW1fcmF3ZmZ0AMYBC2cxbV9mZnRKb2luAMoBCmcxbV9mZnRNaXgAywEMZzFtX2ZmdEZpbmFsAMwBC2cybV90aW1lc0ZyAM0BB2cybV9mZnQA0wEIZzJtX2lmZnQA1AEKZzJtX3Jhd2ZmdADRAQtnMm1fZmZ0Sm9pbgDVAQpnMm1fZmZ0TWl4ANYBDGcybV9mZnRGaW5hbADXARFnMW1fdGltZXNGckFmZmluZQDYARFnMm1fdGltZXNGckFmZmluZQDZARFmcm1fYmF0Y2hBcHBseUtleQDaARFnMW1fYmF0Y2hBcHBseUtleQDbARZnMW1fYmF0Y2hBcHBseUtleU1peGVkANwBEWcybV9iYXRjaEFwcGx5S2V5AN0BFmcybV9iYXRjaEFwcGx5S2V5TWl4ZWQA3gEKZjZtX2lzWmVybwDgAQlmNm1faXNPbmUA4QEIZjZtX3plcm8A4gEHZjZtX29uZQDjAQhmNm1fY29weQDkAQdmNm1fbXVsAOUBCmY2bV9zcXVhcmUA5gEHZjZtX2FkZADnAQdmNm1fc3ViAOgBB2Y2bV9uZWcA6QEIZjZtX3NpZ24A6gESZjZtX2Zyb21Nb250Z29tZXJ5AOwBEGY2bV90b01vbnRnb21lcnkA6wEGZjZtX2VxAO0BC2Y2bV9pbnZlcnNlAO4BB2Y2bV9leHAA8gEPZjZtX3RpbWVzU2NhbGFyAO8BEGY2bV9iYXRjaEludmVyc2UA8QEOZjZtX2lzTmVnYXRpdmUA8AEKZnRtX2lzWmVybwD0AQlmdG1faXNPbmUA9QEIZnRtX3plcm8A9gEHZnRtX29uZQD3AQhmdG1fY29weQD4AQdmdG1fbXVsAPkBCGZ0bV9tdWwxAPoBCmZ0bV9zcXVhcmUA+wEHZnRtX2FkZAD8AQdmdG1fc3ViAP0BB2Z0bV9uZWcA/gEIZnRtX3NpZ24AhQINZnRtX2Nvbmp1Z2F0ZQD/ARJmdG1fZnJvbU1vbnRnb21lcnkAgQIQZnRtX3RvTW9udGdvbWVyeQCAAgZmdG1fZXEAggILZnRtX2ludmVyc2UAgwIHZnRtX2V4cACIAg9mdG1fdGltZXNTY2FsYXIAhAIQZnRtX2JhdGNoSW52ZXJzZQCHAghmdG1fc3FydACJAgxmdG1faXNTcXVhcmUAigIOZnRtX2lzTmVnYXRpdmUAhgIUYm4xMjhfX2Zyb2Jlbml1c01hcDAAkwIUYm4xMjhfX2Zyb2Jlbml1c01hcDEAlAIUYm4xMjhfX2Zyb2Jlbml1c01hcDIAlQIUYm4xMjhfX2Zyb2Jlbml1c01hcDMAlgIUYm4xMjhfX2Zyb2Jlbml1c01hcDQAlwIUYm4xMjhfX2Zyb2Jlbml1c01hcDUAmAIUYm4xMjhfX2Zyb2Jlbml1c01hcDYAmQIUYm4xMjhfX2Zyb2Jlbml1c01hcDcAmgIUYm4xMjhfX2Zyb2Jlbml1c01hcDgAmwIUYm4xMjhfX2Zyb2Jlbml1c01hcDkAnAIQYm4xMjhfcGFpcmluZ0VxMQCjAhBibjEyOF9wYWlyaW5nRXEyAKQCEGJuMTI4X3BhaXJpbmdFcTMApQIQYm4xMjhfcGFpcmluZ0VxNACmAhBibjEyOF9wYWlyaW5nRXE1AKcCDWJuMTI4X3BhaXJpbmcAqAIPYm4xMjhfcHJlcGFyZUcxAI0CD2JuMTI4X3ByZXBhcmVHMgCPAhBibjEyOF9taWxsZXJMb29wAJICGWJuMTI4X2ZpbmFsRXhwb25lbnRpYXRpb24AogIcYm4xMjhfZmluYWxFeHBvbmVudGlhdGlvbk9sZACdAg9ibjEyOF9fbXVsQnkwMjQAkAISYm4xMjhfX211bEJ5MDI0T2xkAJECF2JuMTI4X19jeWNsb3RvbWljU3F1YXJlAJ8CF2JuMTI4X19jeWNsb3RvbWljRXhwX3cwAKACCoXOA6kCKgAgASAAKQMANwMAIAEgACkDCDcDCCABIAApAxA3AxAgASAAKQMYNwMYCx4AIABCADcDACAAQgA3AwggAEIANwMQIABCADcDGAszACAAKQMYUARAIAApAxBQBEAgACkDCFAEQCAAKQMAUA8FQQAPCwVBAA8LBUEADwtBAA8LHgAgAEIBNwMAIABCADcDCCAAQgA3AxAgAEIANwMYC0cAIAApAxggASkDGFEEQCAAKQMQIAEpAxBRBEAgACkDCCABKQMIUQRAIAApAwAgASkDAFEPBUEADwsFQQAPCwVBAA8LQQAPC30AIAApAxggASkDGFQEQEEADwUgACkDGCABKQMYVgRAQQEPBSAAKQMQIAEpAxBUBEBBAA8FIAApAxAgASkDEFYEQEEBDwUgACkDCCABKQMIVARAQQAPBSAAKQMIIAEpAwhWBEBBAQ8FIAApAwAgASkDAFoPCwsLCwsLQQAPC9QBAQF+IAA1AgAgATUCAHwhAyACIAM+AgAgADUCBCABNQIEfCADQiCIfCEDIAIgAz4CBCAANQIIIAE1Agh8IANCIIh8IQMgAiADPgIIIAA1AgwgATUCDHwgA0IgiHwhAyACIAM+AgwgADUCECABNQIQfCADQiCIfCEDIAIgAz4CECAANQIUIAE1AhR8IANCIIh8IQMgAiADPgIUIAA1AhggATUCGHwgA0IgiHwhAyACIAM+AhggADUCHCABNQIcfCADQiCIfCEDIAIgAz4CHCADQiCIpwuMAgEBfiAANQIAIAE1AgB9IQMgAiADQv////8Pgz4CACAANQIEIAE1AgR9IANCIId8IQMgAiADQv////8Pgz4CBCAANQIIIAE1Agh9IANCIId8IQMgAiADQv////8Pgz4CCCAANQIMIAE1Agx9IANCIId8IQMgAiADQv////8Pgz4CDCAANQIQIAE1AhB9IANCIId8IQMgAiADQv////8Pgz4CECAANQIUIAE1AhR9IANCIId8IQMgAiADQv////8Pgz4CFCAANQIYIAE1Ahh9IANCIId8IQMgAiADQv////8Pgz4CGCAANQIcIAE1Ahx9IANCIId8IQMgAiADQv////8Pgz4CHCADQiCHpwuPEBIBfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4gA0L/////D4MgADUCACIFIAE1AgAiBn58IQMgBCADQiCIfCEEIAIgAz4CACAEQiCIIQMgBEL/////D4MgBSABNQIEIgh+fCEEIAMgBEIgiHwhAyAEQv////8PgyAANQIEIgcgBn58IQQgAyAEQiCIfCEDIAIgBD4CBCADQiCIIQQgA0L/////D4MgBSABNQIIIgp+fCEDIAQgA0IgiHwhBCADQv////8PgyAHIAh+fCEDIAQgA0IgiHwhBCADQv////8PgyAANQIIIgkgBn58IQMgBCADQiCIfCEEIAIgAz4CCCAEQiCIIQMgBEL/////D4MgBSABNQIMIgx+fCEEIAMgBEIgiHwhAyAEQv////8PgyAHIAp+fCEEIAMgBEIgiHwhAyAEQv////8PgyAJIAh+fCEEIAMgBEIgiHwhAyAEQv////8PgyAANQIMIgsgBn58IQQgAyAEQiCIfCEDIAIgBD4CDCADQiCIIQQgA0L/////D4MgBSABNQIQIg5+fCEDIAQgA0IgiHwhBCADQv////8PgyAHIAx+fCEDIAQgA0IgiHwhBCADQv////8PgyAJIAp+fCEDIAQgA0IgiHwhBCADQv////8PgyALIAh+fCEDIAQgA0IgiHwhBCADQv////8PgyAANQIQIg0gBn58IQMgBCADQiCIfCEEIAIgAz4CECAEQiCIIQMgBEL/////D4MgBSABNQIUIhB+fCEEIAMgBEIgiHwhAyAEQv////8PgyAHIA5+fCEEIAMgBEIgiHwhAyAEQv////8PgyAJIAx+fCEEIAMgBEIgiHwhAyAEQv////8PgyALIAp+fCEEIAMgBEIgiHwhAyAEQv////8PgyANIAh+fCEEIAMgBEIgiHwhAyAEQv////8PgyAANQIUIg8gBn58IQQgAyAEQiCIfCEDIAIgBD4CFCADQiCIIQQgA0L/////D4MgBSABNQIYIhJ+fCEDIAQgA0IgiHwhBCADQv////8PgyAHIBB+fCEDIAQgA0IgiHwhBCADQv////8PgyAJIA5+fCEDIAQgA0IgiHwhBCADQv////8PgyALIAx+fCEDIAQgA0IgiHwhBCADQv////8PgyANIAp+fCEDIAQgA0IgiHwhBCADQv////8PgyAPIAh+fCEDIAQgA0IgiHwhBCADQv////8PgyAANQIYIhEgBn58IQMgBCADQiCIfCEEIAIgAz4CGCAEQiCIIQMgBEL/////D4MgBSABNQIcIhR+fCEEIAMgBEIgiHwhAyAEQv////8PgyAHIBJ+fCEEIAMgBEIgiHwhAyAEQv////8PgyAJIBB+fCEEIAMgBEIgiHwhAyAEQv////8PgyALIA5+fCEEIAMgBEIgiHwhAyAEQv////8PgyANIAx+fCEEIAMgBEIgiHwhAyAEQv////8PgyAPIAp+fCEEIAMgBEIgiHwhAyAEQv////8PgyARIAh+fCEEIAMgBEIgiHwhAyAEQv////8PgyAANQIcIhMgBn58IQQgAyAEQiCIfCEDIAIgBD4CHCADQiCIIQQgA0L/////D4MgByAUfnwhAyAEIANCIIh8IQQgA0L/////D4MgCSASfnwhAyAEIANCIIh8IQQgA0L/////D4MgCyAQfnwhAyAEIANCIIh8IQQgA0L/////D4MgDSAOfnwhAyAEIANCIIh8IQQgA0L/////D4MgDyAMfnwhAyAEIANCIIh8IQQgA0L/////D4MgESAKfnwhAyAEIANCIIh8IQQgA0L/////D4MgEyAIfnwhAyAEIANCIIh8IQQgAiADPgIgIARCIIghAyAEQv////8PgyAJIBR+fCEEIAMgBEIgiHwhAyAEQv////8PgyALIBJ+fCEEIAMgBEIgiHwhAyAEQv////8PgyANIBB+fCEEIAMgBEIgiHwhAyAEQv////8PgyAPIA5+fCEEIAMgBEIgiHwhAyAEQv////8PgyARIAx+fCEEIAMgBEIgiHwhAyAEQv////8PgyATIAp+fCEEIAMgBEIgiHwhAyACIAQ+AiQgA0IgiCEEIANC/////w+DIAsgFH58IQMgBCADQiCIfCEEIANC/////w+DIA0gEn58IQMgBCADQiCIfCEEIANC/////w+DIA8gEH58IQMgBCADQiCIfCEEIANC/////w+DIBEgDn58IQMgBCADQiCIfCEEIANC/////w+DIBMgDH58IQMgBCADQiCIfCEEIAIgAz4CKCAEQiCIIQMgBEL/////D4MgDSAUfnwhBCADIARCIIh8IQMgBEL/////D4MgDyASfnwhBCADIARCIIh8IQMgBEL/////D4MgESAQfnwhBCADIARCIIh8IQMgBEL/////D4MgEyAOfnwhBCADIARCIIh8IQMgAiAEPgIsIANCIIghBCADQv////8PgyAPIBR+fCEDIAQgA0IgiHwhBCADQv////8PgyARIBJ+fCEDIAQgA0IgiHwhBCADQv////8PgyATIBB+fCEDIAQgA0IgiHwhBCACIAM+AjAgBEIgiCEDIARC/////w+DIBEgFH58IQQgAyAEQiCIfCEDIARC/////w+DIBMgEn58IQQgAyAEQiCIfCEDIAIgBD4CNCADQiCIIQQgA0L/////D4MgEyAUfnwhAyAEIANCIIh8IQQgAiADPgI4IARCIIghAyACIAQ+AjwLjBIMAX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+QgAhAkIAIQMgAkL/////D4NCAYYhAiADQgGGIAJCIIh8IQMgAkL/////D4MgADUCACIGIAZ+fCECIAMgAkIgiHwhAyABIAI+AgAgAyEEIARCIIghBUIAIQJCACEDIAJC/////w+DIAYgADUCBCIHfnwhAiADIAJCIIh8IQMgAkL/////D4NCAYYhAiADQgGGIAJCIIh8IQMgAkL/////D4MgBEL/////D4N8IQIgAyACQiCIfCAFfCEDIAEgAj4CBCADIQQgBEIgiCEFQgAhAkIAIQMgAkL/////D4MgBiAANQIIIgh+fCECIAMgAkIgiHwhAyACQv////8Pg0IBhiECIANCAYYgAkIgiHwhAyACQv////8PgyAHIAd+fCECIAMgAkIgiHwhAyACQv////8PgyAEQv////8Pg3whAiADIAJCIIh8IAV8IQMgASACPgIIIAMhBCAEQiCIIQVCACECQgAhAyACQv////8PgyAGIAA1AgwiCX58IQIgAyACQiCIfCEDIAJC/////w+DIAcgCH58IQIgAyACQiCIfCEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIARC/////w+DfCECIAMgAkIgiHwgBXwhAyABIAI+AgwgAyEEIARCIIghBUIAIQJCACEDIAJC/////w+DIAYgADUCECIKfnwhAiADIAJCIIh8IQMgAkL/////D4MgByAJfnwhAiADIAJCIIh8IQMgAkL/////D4NCAYYhAiADQgGGIAJCIIh8IQMgAkL/////D4MgCCAIfnwhAiADIAJCIIh8IQMgAkL/////D4MgBEL/////D4N8IQIgAyACQiCIfCAFfCEDIAEgAj4CECADIQQgBEIgiCEFQgAhAkIAIQMgAkL/////D4MgBiAANQIUIgt+fCECIAMgAkIgiHwhAyACQv////8PgyAHIAp+fCECIAMgAkIgiHwhAyACQv////8PgyAIIAl+fCECIAMgAkIgiHwhAyACQv////8Pg0IBhiECIANCAYYgAkIgiHwhAyACQv////8PgyAEQv////8Pg3whAiADIAJCIIh8IAV8IQMgASACPgIUIAMhBCAEQiCIIQVCACECQgAhAyACQv////8PgyAGIAA1AhgiDH58IQIgAyACQiCIfCEDIAJC/////w+DIAcgC358IQIgAyACQiCIfCEDIAJC/////w+DIAggCn58IQIgAyACQiCIfCEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIAkgCX58IQIgAyACQiCIfCEDIAJC/////w+DIARC/////w+DfCECIAMgAkIgiHwgBXwhAyABIAI+AhggAyEEIARCIIghBUIAIQJCACEDIAJC/////w+DIAYgADUCHCINfnwhAiADIAJCIIh8IQMgAkL/////D4MgByAMfnwhAiADIAJCIIh8IQMgAkL/////D4MgCCALfnwhAiADIAJCIIh8IQMgAkL/////D4MgCSAKfnwhAiADIAJCIIh8IQMgAkL/////D4NCAYYhAiADQgGGIAJCIIh8IQMgAkL/////D4MgBEL/////D4N8IQIgAyACQiCIfCAFfCEDIAEgAj4CHCADIQQgBEIgiCEFQgAhAkIAIQMgAkL/////D4MgByANfnwhAiADIAJCIIh8IQMgAkL/////D4MgCCAMfnwhAiADIAJCIIh8IQMgAkL/////D4MgCSALfnwhAiADIAJCIIh8IQMgAkL/////D4NCAYYhAiADQgGGIAJCIIh8IQMgAkL/////D4MgCiAKfnwhAiADIAJCIIh8IQMgAkL/////D4MgBEL/////D4N8IQIgAyACQiCIfCAFfCEDIAEgAj4CICADIQQgBEIgiCEFQgAhAkIAIQMgAkL/////D4MgCCANfnwhAiADIAJCIIh8IQMgAkL/////D4MgCSAMfnwhAiADIAJCIIh8IQMgAkL/////D4MgCiALfnwhAiADIAJCIIh8IQMgAkL/////D4NCAYYhAiADQgGGIAJCIIh8IQMgAkL/////D4MgBEL/////D4N8IQIgAyACQiCIfCAFfCEDIAEgAj4CJCADIQQgBEIgiCEFQgAhAkIAIQMgAkL/////D4MgCSANfnwhAiADIAJCIIh8IQMgAkL/////D4MgCiAMfnwhAiADIAJCIIh8IQMgAkL/////D4NCAYYhAiADQgGGIAJCIIh8IQMgAkL/////D4MgCyALfnwhAiADIAJCIIh8IQMgAkL/////D4MgBEL/////D4N8IQIgAyACQiCIfCAFfCEDIAEgAj4CKCADIQQgBEIgiCEFQgAhAkIAIQMgAkL/////D4MgCiANfnwhAiADIAJCIIh8IQMgAkL/////D4MgCyAMfnwhAiADIAJCIIh8IQMgAkL/////D4NCAYYhAiADQgGGIAJCIIh8IQMgAkL/////D4MgBEL/////D4N8IQIgAyACQiCIfCAFfCEDIAEgAj4CLCADIQQgBEIgiCEFQgAhAkIAIQMgAkL/////D4MgCyANfnwhAiADIAJCIIh8IQMgAkL/////D4NCAYYhAiADQgGGIAJCIIh8IQMgAkL/////D4MgDCAMfnwhAiADIAJCIIh8IQMgAkL/////D4MgBEL/////D4N8IQIgAyACQiCIfCAFfCEDIAEgAj4CMCADIQQgBEIgiCEFQgAhAkIAIQMgAkL/////D4MgDCANfnwh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IQQgAyAEQiCIfCEDIARC/////w+DIAA1AgQiCiAHfnwhBCADIARCIIh8IQMgBEL/////D4NBADUCjAQiDSAIfnwhBCADIARCIIh8IQMgBEL/////D4MgBX5C/////w+DIQwgBEL/////D4MgCSAMfnwhBCADIARCIIh8IQMgA0IgiCEEIANC/////w+DIAYgATUCCCIPfnwhAyAEIANCIIh8IQQgA0L/////D4MgCiALfnwhAyAEIANCIIh8IQQgA0L/////D4MgADUCCCIOIAd+fCEDIAQgA0IgiHwhBCADQv////8PgyANIAx+fCEDIAQgA0IgiHwhBCADQv////8Pg0EANQKQBCIRIAh+fCEDIAQgA0IgiHwhBCADQv////8PgyAFfkL/////D4MhECADQv////8PgyAJIBB+fCEDIAQgA0IgiHwhBCAEQiCIIQMgBEL/////D4MgBiABNQIMIhN+fCEEIAMgBEIgiHwhAyAEQv////8PgyAKIA9+fCEEIAMgBEIgiHwhAyAEQv////8PgyAOIAt+fCEEIAMgBEIgiHwhAyAEQv////8PgyAANQIMIhIgB358IQQgAyAEQiCIfCEDIARC/////w+DIA0gEH58IQQgAyAEQiCIfCEDIARC/////w+DIBEgDH58IQQgAyAEQiCIfCEDIARC/////w+DQQA1ApQEIhUgCH58IQQgAyAEQiCIfCEDIARC/////w+DIAV+Qv////8PgyEUIARC/////w+DIAkgFH58IQQgAyAEQiCIfCEDIANCIIghBCADQv////8PgyAGIAE1AhAiF358IQMgBCADQiCIfCEEIANC/////w+DIAogE358IQMgBCADQiCIfCEEIANC/////w+DIA4gD358IQMgBCADQiCIfCEEIANC/////w+DIBIgC358IQMgBCADQiCIfCEEIANC/////w+DIAA1AhAiFiAHfnwhAyAEIANCIIh8IQQgA0L/////D4MgDSAUfnwhAyAEIANCIIh8IQQgA0L/////D4MgESAQfnwhAyAEIANCIIh8IQQgA0L/////D4MgFSAMfnwhAyAEIANCIIh8IQQgA0L/////D4NBADUCmAQiGSAIfnwhAyAEIANCIIh8IQQgA0L/////D4MgBX5C/////w+DIRggA0L/////D4MgCSAYfnwhAyAEIANCIIh8IQQgBEIgiCEDIARC/////w+DIAYgATUCFCIbfnwhBCADIARCIIh8IQMgBEL/////D4MgCiAXfnwhBCADIARCIIh8IQMgBEL/////D4MgDiATfnwhBCADIARCIIh8IQMgBEL/////D4MgEiAPfnwhBCADIARCIIh8IQMgBEL/////D4MgFiALfnwhBCADIARCIIh8IQMgBEL/////D4MgADUCFCIaIAd+fCEEIAMgBEIgiHwhAyAEQv////8PgyANIBh+fCEEIAMgBEIgiHwhAyAEQv////8PgyARIBR+fCEEIAMgBEIgiHwhAyAEQv////8PgyAVIBB+fCEEIAMgBEIgiHwhAyAEQv////8PgyAZIAx+fCEEIAMgBEIgiHwhAyAEQv////8Pg0EANQKcBCIdIAh+fCEEIAMgBEIgiHwhAyAEQv////8PgyAFfkL/////D4MhHCAEQv////8PgyAJIBx+fCEEIAMgBEIgiHwhAyADQiCIIQQgA0L/////D4MgBiABNQIYIh9+fCEDIAQgA0IgiHwhBCADQv////8PgyAKIBt+fCEDIAQgA0IgiHwhBCADQv////8PgyAOIBd+fCEDIAQgA0IgiHwhBCADQv////8PgyASIBN+fCEDIAQgA0IgiHwhBCADQv////8PgyAWIA9+fCEDIAQgA0IgiHwhBCADQv////8PgyAaIAt+fCEDIAQgA0IgiHwhBCADQv////8PgyAANQIYIh4gB358IQMgBCADQiCIfCEEIANC/////w+DIA0gHH58IQMgBCADQiCIfCEEIANC/////w+DIBEgGH58IQMgBCADQiCIfCEEIANC/////w+DIBUgFH58IQMgBCADQiCIfCEEIANC/////w+DIBkgEH58IQMgBCADQiCIfCEEIANC/////w+DIB0gDH58IQMgBCADQiCIfCEEIANC/////w+DQQA1AqAEIiEgCH58IQMgBCADQiCIfCEEIANC/////w+DIAV+Qv////8PgyEgIANC/////w+DIAkgIH58IQMgBCADQiCIfCEEIARCIIghAyAEQv////8PgyAGIAE1AhwiI358IQQgAyAEQiCIfCEDIARC/////w+DIAogH358IQQgAyAEQiCIfCEDIARC/////w+DIA4gG358IQQgAyAEQiCIfCEDIARC/////w+DIBIgF358IQQgAyAEQiCIfCEDIARC/////w+DIBYgE358IQQgAyAEQiCIfCEDIARC/////w+DIBogD358IQQgAyAEQiCIfCEDIARC/////w+DIB4gC358IQQgAyAEQiCIfCEDIARC/////w+DIAA1AhwiIiAHfnwhBCADIARCIIh8IQMgBEL/////D4MgDSAgfnwhBCADIARCIIh8IQMgBEL/////D4MgESAcfnwhBCADIARCIIh8IQMgBEL/////D4MgFSAYfnwhBCADIARCIIh8IQMgBEL/////D4MgGSAUfnwhBCADIARCIIh8IQMgBEL/////D4MgHSAQfnwhBCADIARCIIh8IQMgBEL/////D4MgISAMfnwhBCADIARCIIh8IQMgBEL/////D4NBADUCpAQiJSAIfnwhBCADIARCIIh8IQMgBEL/////D4MgBX5C/////w+DISQgBEL/////D4MgCSAkfnwhBCADIARCIIh8IQMgA0IgiCEEIANC/////w+DIAogI358IQMgBCADQiCIfCEEIANC/////w+DIA4gH358IQMgBCADQiCIfCEEIANC/////w+DIBIgG358IQMgBCADQiCIfCEEIANC/////w+DIBYgF358IQMgBCADQiCIfCEEIANC/////w+DIBogE358IQMgBCADQiCIfCEEIANC/////w+DIB4gD358IQMgBCADQiCIfCEEIANC/////w+DICIgC358IQMgBCADQiCIfCEEIANC/////w+DIA0gJH58IQMgBCADQiCIfCEEIANC/////w+DIBEgIH58IQMgBCADQiCIfCEEIANC/////w+DIBUgHH58IQMgBCADQiCIfCEEIANC/////w+DIBkgGH58IQMgBCADQiCIfCEEIANC/////w+DIB0gFH58IQMgBCADQiCIfCEEIANC/////w+DICEgEH58IQMgBCADQiCIfCEEIANC/////w+DICUgDH58IQMgBCADQiCIfCEEIAIgAz4CACAEQiCIIQMgBEL/////D4MgDiAjfnwhBCADIARCIIh8IQMgBEL/////D4MgEiAffnwhBCADIARCIIh8IQMgBEL/////D4MgFiAbfnwhBCADIARCIIh8IQMgBEL/////D4MgGiAXfnwhBCADIARCIIh8IQMgBEL/////D4MgHiATfnwhBCADIARCIIh8IQMgBEL/////D4MgIiAPfnwhBCADIARCIIh8IQMgBEL/////D4MgESAkfnwhBCADIARCIIh8IQMgBEL/////D4MgFSAgfnwhBCADIARCIIh8IQMgBEL/////D4MgGSAcfnwhBCADIARCIIh8IQMgBEL/////D4MgHSAYfnwhBCADIARCIIh8IQMgBEL/////D4MgISAUfnwhBCADIARCIIh8IQMgBEL/////D4MgJSAQfnwhBCADIARCIIh8IQMgAiAEPgIEIANCIIghBCADQv////8PgyASICN+fCEDIAQgA0IgiHwhBCADQv////8PgyAWIB9+fCEDIAQgA0IgiHwhBCADQv////8PgyAaIBt+fCEDIAQgA0IgiHwhBCADQv////8PgyAeIBd+fCEDIAQgA0IgiHwhBCADQv////8PgyAiIBN+fCEDIAQgA0IgiHwhBCADQv////8PgyAVICR+fCEDIAQgA0IgiHwhBCADQv////8PgyAZICB+fCEDIAQgA0IgiHwhBCADQv////8PgyAdIBx+fCEDIAQgA0IgiHwhBCADQv////8PgyAhIBh+fCEDIAQgA0IgiHwhBCADQv////8PgyAlIBR+fCEDIAQgA0IgiHwhBCACIAM+AgggBEIgiCEDIARC/////w+DIBYgI358IQQgAyAEQiCIfCEDIARC/////w+DIBogH358IQQgAyAEQiCIfCEDIARC/////w+DIB4gG358IQQgAyAEQiCIfCEDIARC/////w+DICIgF358IQQgAyAEQiCIfCEDIARC/////w+DIBkgJH58IQQgAyAEQiCIfCEDIARC/////w+DIB0gIH58IQQgAyAEQiCIfCEDIARC/////w+DICEgHH58IQQgAyAEQiCIfCEDIARC/////w+DICUgGH58IQQgAyAEQiCIfCEDIAIgBD4CDCADQiCIIQQgA0L/////D4MgGiAjfnwhAyAEIANCIIh8IQQgA0L/////D4MgHiAffnwhAyAEIANCIIh8IQQgA0L/////D4MgIiAbfnwhAyAEIANCIIh8IQQgA0L/////D4MgHSAkfnwhAyAEIANCIIh8IQQgA0L/////D4MgISAgfnwhAyAEIANCIIh8IQQgA0L/////D4MgJSAcfnwhAyAEIANCIIh8IQQgAiADPgIQIARCIIghAyAEQv////8PgyAeICN+fCEEIAMgBEIgiHwhAyAEQv////8PgyAiIB9+fCEEIAMgBEIgiHwhAyAEQv////8PgyAhICR+fCEEIAMgBEIgiHwhAyAEQv////8PgyAlICB+fCEEIAMgBEIgiHwhAyACIAQ+AhQgA0IgiCEEIANC/////w+DICIgI358IQMgBCADQiCIfCEEIANC/////w+DICUgJH58IQMgBCADQiCIfCEEIAIgAz4CGCAEQiCIIQMgAiAEPgIcIAOnBEAgAkGIBCACEAcaBSACQYgEEAUEQCACQYgEIAIQBxoLCwu7IR0BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+QonHmaQOIQZCACECQgAhAyACQv////8Pg0IBhiECIANCAYYgAkIgiHwhAyACQv////8PgyAANQIAIgcgB358IQIgAyACQiCIfCEDIAJC/////w+DIAZ+Qv////8PgyEIIAJC/////w+DQQA1AogEIgkgCH58IQIgAyACQiCIfCEDIAMhBCAEQiCIIQVCACECQgAhAyACQv////8PgyAHIAA1AgQiCn58IQIgAyACQiCIfCEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIARC/////w+DfCECIAMgAkIgiHwgBXwhAyACQv////8Pg0EANQKMBCIMIAh+fCECIAMgAkIgiHwhAyACQv////8PgyAGfkL/////D4MhCyACQv////8PgyAJIAt+fCECIAMgAkIgiHwhAyADIQQgBEIgiCEFQgAhAkIAIQMgAkL/////D4MgByAANQIIIg1+fCECIAMgAkIgiHwhAyACQv////8Pg0IBhiECIANCAYYgAkIgiHwhAyACQv////8PgyAKIAp+fCECIAMgAkIgiHwhAyACQv////8PgyAEQv////8Pg3whAiADIAJCIIh8IAV8IQMgAkL/////D4MgDCALfnwhAiADIAJCIIh8IQMgAkL/////D4NBADUCkAQiDyAIfnwhAiADIAJCIIh8IQMgAkL/////D4MgBn5C/////w+DIQ4gAkL/////D4MgCSAOfnwhAiADIAJCIIh8IQMgAyEEIARCIIghBUIAIQJCACEDIAJC/////w+DIAcgADUCDCIQfnwhAiADIAJCIIh8IQMgAkL/////D4MgCiANfnwhAiADIAJCIIh8IQMgAkL/////D4NCAYYhAiADQgGGIAJCIIh8IQMgAkL/////D4MgBEL/////D4N8IQIgAyACQiCIfCAFfCEDIAJC/////w+DIAwgDn58IQIgAyACQiCIfCEDIAJC/////w+DIA8gC358IQIgAyACQiCIfCEDIAJC/////w+DQQA1ApQEIhIgCH58IQIgAyACQiCIfCEDIAJC/////w+DIAZ+Qv////8PgyERIAJC/////w+DIAkgEX58IQIgAyACQiCIfCEDIAMhBCAEQiCIIQVCACECQgAhAyACQv////8PgyAHIAA1AhAiE358IQIgAyACQiCIfCEDIAJC/////w+DIAogEH58IQIgAyACQiCIfCEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIA0gDX58IQIgAyACQiCIfCEDIAJC/////w+DIARC/////w+DfCECIAMgAkIgiHwgBXwhAyACQv////8PgyAMIBF+fCECIAMgAkIgiHwhAyACQv////8PgyAPIA5+fCECIAMgAkIgiHwhAyACQv////8PgyASIAt+fCECIAMgAkIgiHwhAyACQv////8Pg0EANQKYBCIVIAh+fCECIAMgAkIgiHwhAyACQv////8PgyAGfkL/////D4MhFCACQv////8PgyAJIBR+fCECIAMgAkIgiHwhAyADIQQgBEIgiCEFQgAhAkIAIQMgAkL/////D4MgByAANQIUIhZ+fCECIAMgAkIgiHwhAyACQv////8PgyAKIBN+fCECIAMgAkIgiHwhAyACQv////8PgyANIBB+fCECIAMgAkIgiHwhAyACQv////8Pg0IBhiECIANCAYYgAkIgiHwhAyACQv////8PgyAEQv////8Pg3whAiADIAJCIIh8IAV8IQMgAkL/////D4MgDCAUfnwhAiADIAJCIIh8IQMgAkL/////D4MgDyARfnwhAiADIAJCIIh8IQMgAkL/////D4MgEiAOfnwhAiADIAJCIIh8IQMgAkL/////D4MgFSALfnwhAiADIAJCIIh8IQMgAkL/////D4NBADUCnAQiGCAIfnwhAiADIAJCIIh8IQMgAkL/////D4MgBn5C/////w+DIRcgAkL/////D4MgCSAXfnwhAiADIAJCIIh8IQMgAyEEIARCIIghBUIAIQJCACEDIAJC/////w+DIAcgADUCGCIZfnwhAiADIAJCIIh8IQMgAkL/////D4MgCiAWfnwhAiADIAJCIIh8IQMgAkL/////D4MgDSATfnwhAiADIAJCIIh8IQMgAkL/////D4NCAYYhAiADQgGGIAJCIIh8IQMgAkL/////D4MgECAQfnwhAiADIAJCIIh8IQMgAkL/////D4MgBEL/////D4N8IQIgAyACQiCIfCAFfCEDIAJC/////w+DIAwgF358IQIgAyACQiCIfCEDIAJC/////w+DIA8gFH58IQIgAyACQiCIfCEDIAJC/////w+DIBIgEX58IQIgAyACQiCIfCEDIAJC/////w+DIBUgDn58IQIgAyACQiCIfCEDIAJC/////w+DIBggC358IQIgAyACQiCIfCEDIAJC/////w+DQQA1AqAEIhsgCH58IQIgAyACQiCIfCEDIAJC/////w+DIAZ+Qv////8PgyEaIAJC/////w+DIAkgGn58IQIgAyACQiCIfCEDIAMhBCAEQiCIIQVCACECQgAhAyACQv////8PgyAHIAA1AhwiHH58IQIgAyACQiCIfCEDIAJC/////w+DIAogGX58IQIgAyACQiCIfCEDIAJC/////w+DIA0gFn58IQIgAyACQiCIfCEDIAJC/////w+DIBAgE358IQIgAyACQiCIfCEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIARC/////w+DfCECIAMgAkIgiHwgBXwhAyACQv////8PgyAMIBp+fCECIAMgAkIgiHwhAyACQv////8PgyAPIBd+fCECIAMgAkIgiHwhAyACQv////8PgyASIBR+fCECIAMgAkIgiHwhAyACQv////8PgyAVIBF+fCECIAMgAkIgiHwhAyACQv////8PgyAYIA5+fCECIAMgAkIgiHwhAyACQv////8PgyAbIAt+fCECIAMgAkIgiHwhAyACQv////8Pg0EANQKkBCIeIAh+fCECIAMgAkIgiHwhAyACQv////8PgyAGfkL/////D4MhHSACQv////8PgyAJIB1+fCECIAMgAkIgiHwhAyADIQQgBEIgiCEFQgAhAkIAIQMgAkL/////D4MgCiAcfnwhAiADIAJCIIh8IQMgAkL/////D4MgDSAZfnwhAiADIAJCIIh8IQMgAkL/////D4MgECAWfnwhAiADIAJCIIh8IQMgAkL/////D4NCAYYhAiADQgGGIAJCIIh8IQMgAkL/////D4MgEyATfnwhAiADIAJCIIh8IQMgAkL/////D4MgBEL/////D4N8IQIgAyACQiCIfCAFfCEDIAJC/////w+DIAwgHX58IQIgAyACQiCIfCEDIAJC/////w+DIA8gGn58IQIgAyACQiCIfCEDIAJC/////w+DIBIgF358IQIgAyACQiCIfCEDIAJC/////w+DIBUgFH58IQIgAyACQiCIfCEDIAJC/////w+DIBggEX58IQIgAyACQiCIfCEDIAJC/////w+DIBsgDn58IQIgAyACQiCIfCEDIAJC/////w+DIB4gC358IQIgAyACQiCIfCEDIAEgAj4CACADIQQgBEIgiCEFQgAhAkIAIQMgAkL/////D4MgDSAcfnwhAiADIAJCIIh8IQMgAkL/////D4MgECAZfnwhAiADIAJCIIh8IQMgAkL/////D4MgEyAWfnwhAiADIAJCIIh8IQMgAkL/////D4NCAYYhAiADQgGGIAJCIIh8IQMgAkL/////D4MgBEL/////D4N8IQIgAyACQiCIfCAFfCEDIAJC/////w+DIA8gHX58IQIgAyACQiCIfCEDIAJC/////w+DIBIgGn58IQIgAyACQiCIfCEDIAJC/////w+DIBUgF358IQIgAyACQiCIfCEDIAJC/////w+DIBggFH58IQIgAyACQiCIfCEDIAJC/////w+DIBsgEX58IQIgAyACQiCIfCEDIAJC/////w+DIB4gDn58IQIgAyACQiCIfCEDIAEgAj4CBCADIQQgBEIgiCEFQgAhAkIAIQMgAkL/////D4MgECAcfnwhAiADIAJCIIh8IQMgAkL/////D4MgEyAZfnwhAiADIAJCIIh8IQMgAkL/////D4NCAYYhAiADQgGGIAJCIIh8IQMgAkL/////D4MgFiAWfnwhAiADIAJCIIh8IQMgAkL/////D4MgBEL/////D4N8IQIgAyACQiCIfCAFfCEDIAJC/////w+DIBIgHX58IQIgAyACQiCIfCEDIAJC/////w+DIBUgGn58IQIgAyACQiCIfCEDIAJC/////w+DIBggF358IQIgAyACQiCIfCEDIAJC/////w+DIBsgFH58IQIgAyACQiCIfCEDIAJC/////w+DIB4gEX58IQIgAyACQiCIfCEDIAEgAj4CCCADIQQgBEIgiCEFQgAhAkIAIQMgAkL/////D4MgEyAcfnwhAiADIAJCIIh8IQMgAkL/////D4MgFiAZfnwhAiADIAJCIIh8IQMgAkL/////D4NCAYYhAiADQgGGIAJCIIh8IQMgAkL/////D4MgBEL/////D4N8IQIgAyACQiCIfCAFfCEDIAJC/////w+DIBUgHX58IQIgAyACQiCIfCEDIAJC/////w+DIBggGn58IQIgAyACQiCIfCEDIAJC/////w+DIBsgF358IQIgAyACQiCIfCEDIAJC/////w+DIB4gFH58IQIgAyACQiCIfCEDIAEgAj4CDCADIQQgBEIgiCEFQgAhAkIAIQMgAkL/////D4MgFiAcfnwhAiADIAJCIIh8IQMgAkL/////D4NCAYYhAiADQgGGIAJCIIh8IQMgAkL/////D4MgGSAZfnwhAiADIAJCIIh8IQMgAkL/////D4MgBEL/////D4N8IQIgAyACQiCIfCAFfCEDIAJC/////w+DIBggHX58IQIgAyACQiCIfCEDIAJC/////w+DIBsgGn58IQIgAyACQiCIfCEDIAJC/////w+DIB4gF358IQIgAyACQiCIfCEDIAEgAj4CECADIQQgBEIgiCEFQgAhAkIAIQMgAkL/////D4MgGSAcfnwhAiADIAJCIIh8IQMgAkL/////D4NCAYYhAiADQgGGIAJCIIh8IQMgAkL/////D4MgBEL/////D4N8IQIgAyACQiCIfCAFfCEDIAJC/////w+DIBsgHX58IQIgAyACQiCIfCEDIAJC/////w+DIB4gGn58IQIgAyACQiCIfCEDIAEgAj4CFCADIQQgBEIgiCEFQgAhAkIAIQMgAkL/////D4NCAYYhAiADQgGGIAJCIIh8IQMgAkL/////D4MgHCAcfnwhAiADIAJCIIh8IQMgAkL/////D4MgBEL/////D4N8IQIgAyACQiCIfCAFfCEDIAJC/////w+DIB4gHX58IQIgAyACQiCIfCEDIAEgAj4CGCADIQQgBEIgiCEFIAEgBD4CHCAFpwRAIAFBiAQgARAHGgUgAUGI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QcgONQIIIAR+fCEDIAAgAz4CDCAANQIQIANCIIh8QcgONQIMIAR+fCEDIAAgAz4CECAANQIUIANCIIh8QcgONQIQIAR+fCEDIAAgAz4CFCAANQIYIANCIIh8QcgONQIUIAR+fCEDIAAgAz4CGCAANQIcIANCIIh8QcgONQIYIAR+fCEDIAAgAz4CHCAANQIgIANCIIh8QcgONQIcIAR+fCEDIAAgAz4CIEGoESADQiCIPgIEQgAhAyAANQIIIAJ+Qv////8PgyEEIAA1AgggA0IgiHxByA41AgAgBH58IQMgACADPgIIIAA1AgwgA0IgiHxByA41AgQgBH58IQMgACADPgIMIAA1AhAgA0IgiHxByA41AgggBH58IQMgACADPgIQIAA1AhQgA0IgiHxByA41AgwgBH58IQMgACADPgIUIAA1AhggA0IgiHxByA41AhAgBH58IQMgACADPgIYIAA1AhwgA0IgiHxByA41AhQgBH58IQMgACADPgIcIAA1AiAgA0IgiHxByA41AhggBH58IQMgACADPgIgIAA1AiQgA0IgiHxByA41AhwgBH58IQMgACADPgIkQagRIANCIIg+AghCACEDIAA1AgwgAn5C/////w+DIQQgADUCDCADQiCIfEHIDjUCACAEfnwhAyAAIAM+AgwgADUCECADQiCIfEHIDjUCBCAEfnwhAyAAIAM+AhAgADUCFCADQiCIfEHIDjUCCCAEfnwhAyAAIAM+AhQgADUCGCADQiCIfEHIDjUCDCAEfnwhAyAAIAM+AhggADUCHCADQiCIfEHIDjUCECAEfnwhAyAAIAM+AhwgADUCICADQiCIfEHIDjUCFCAEfnwhAyAAIAM+AiAgADUCJCADQiCIfEHIDjUCGCAEfnwhAyAAIAM+AiQgADUCKCADQiCIfEHIDjUCHCAEfnwhAyAAIAM+AihBqBEgA0IgiD4CDEIAIQMgADUCECACfkL/////D4MhBCAANQIQIANCIIh8QcgONQIAIAR+fCEDIAAgAz4CECAANQIUIANCIIh8QcgONQIEIAR+fCEDIAAgAz4CFCAANQIYIANCIIh8QcgONQIIIAR+fCEDIAAgAz4CGCAANQIcIANCIIh8QcgONQIMIAR+fCEDIAAgAz4CHCAANQIgIANCIIh8QcgONQIQIAR+fCEDIAAgAz4CICAANQIkIANCIIh8QcgONQIUIAR+fCEDIAAgAz4CJCAANQIoIANCIIh8QcgONQIYIAR+fCEDIAAgAz4CKCAANQIsIANCIIh8QcgONQIcIAR+fCEDIAAgAz4CLEGoESADQiCIPgIQQgAhAyAANQIUIAJ+Qv////8PgyEEIAA1AhQgA0IgiHxByA41AgAgBH58IQMgACADPgIUIAA1AhggA0IgiHxByA41AgQgBH58IQMgACADPgIYIAA1AhwgA0IgiHxByA41AgggBH58IQMgACADPgIcIAA1AiAgA0IgiHxByA41AgwgBH58IQMgACADPgIgIAA1AiQgA0IgiHxByA41AhAgBH58IQMgACADPgIkIAA1AiggA0IgiHxByA41AhQgBH58IQMgACADPgIoIAA1AiwgA0IgiHxByA41AhggBH58IQMgACADPgIsIAA1AjAgA0IgiHxByA41AhwgBH58IQMgACADPgIwQagRIANCIIg+AhRCACEDIAA1AhggAn5C/////w+DIQQgADUCGCADQiCIfEHIDjUCACAEfnwhAyAAIAM+AhggADUCHCADQiCIfEHIDjUCBCAEfnwhAyAAIAM+AhwgADUCICADQiCIfEHIDjUCCCAEfnwhAyAAIAM+AiAgADUCJCADQiCIfEHIDjUCDCAEfnwhAyAAIAM+AiQgADUCKCADQiCIfEHIDjUCECAEfnwhAyAAIAM+AiggADUCLCADQiCIfEHIDjUCFCAEfnwhAyAAIAM+AiwgADUCMCADQiCIfEHIDjUCGCAEfnwhAyAAIAM+AjAgADUCNCADQiCIfEHIDjUCHCAEfnwhAyAAIAM+AjRBqBEgA0IgiD4CGEIAIQMgADUCHCACfkL/////D4MhBCAANQIcIANCIIh8QcgONQIAIAR+fCEDIAAgAz4CHCAANQIgIANCIIh8QcgONQIEIAR+fCEDIAAgAz4CICAANQIkIANCIIh8QcgONQIIIAR+fCEDIAAgAz4CJCAANQIoIANCIIh8QcgONQIMIAR+fCEDIAAgAz4CKCAANQIsIANCIIh8QcgONQIQIAR+fCEDIAAgAz4CLCAANQIwIANCIIh8QcgONQIUIAR+fCEDIAAgAz4CMCAANQI0IANCIIh8QcgONQIYIAR+fCEDIAAgAz4CNCAANQI4IANCIIh8QcgONQIcIAR+fCEDIAAgAz4COEGoESADQiCIPgIcQagRIABBIGogARAmC74fIwF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX5C/////w4hBSADQv////8PgyAANQIAIgYgATUCACIHfnwhAyAEIANCIIh8IQQgA0L/////D4MgBX5C/////w+DIQggA0L/////D4NBADUCyA4iCSAIfnwhAyAEIANCIIh8IQQgBEIgiCEDIARC/////w+DIAYgATUCBCILfnwhBCADIARCIIh8IQMgBEL/////D4MgADUCBCIKIAd+fCEEIAMgBEIgiHwhAyAEQv////8Pg0EANQLMDiINIAh+fCEEIAMgBEIgiHwhAyAEQv////8PgyAFfkL/////D4MhDCAEQv////8PgyAJIAx+fCEEIAMgBEIgiHwhAyADQiCIIQQgA0L/////D4MgBiABNQIIIg9+fCEDIAQgA0IgiHwhBCADQv////8PgyAKIAt+fCEDIAQgA0IgiHwhBCADQv////8PgyAANQIIIg4gB358IQMgBCADQiCIfCEEIANC/////w+DIA0gDH58IQMgBCADQiCIfCEEIANC/////w+DQQA1AtAOIhEgCH58IQMgBCADQiCIfCEEIANC/////w+DIAV+Qv////8PgyEQIANC/////w+DIAkgEH58IQMgBCADQiCIfCEEIARCIIghAyAEQv////8PgyAGIAE1AgwiE358IQQgAyAEQiCIfCEDIARC/////w+DIAogD358IQQgAyAEQiCIfCEDIARC/////w+DIA4gC358IQQgAyAEQiCIfCEDIARC/////w+DIAA1AgwiEiAHfnwhBCADIARCIIh8IQMgBEL/////D4MgDSAQfnwhBCADIARCIIh8IQMgBEL/////D4MgESAMfnwhBCADIARCIIh8IQMgBEL/////D4NBADUC1A4iFSAIfnwhBCADIARCIIh8IQMgBEL/////D4MgBX5C/////w+DIRQgBEL/////D4MgCSAUfnwhBCADIARCIIh8IQMgA0IgiCEEIANC/////w+DIAYgATUCECIXfnwhAyAEIANCIIh8IQQgA0L/////D4MgCiATfnwhAyAEIANCIIh8IQQgA0L/////D4MgDiAPfnwhAyAEIANCIIh8IQQgA0L/////D4MgEiALfnwhAyAEIANCIIh8IQQgA0L/////D4MgADUCECIWIAd+fCEDIAQgA0IgiHwhBCADQv////8PgyANIBR+fCEDIAQgA0IgiHwhBCADQv////8PgyARIBB+fCEDIAQgA0IgiHwhBCADQv////8PgyAVIAx+fCEDIAQgA0IgiHwhBCADQv////8Pg0EANQLYDiIZIAh+fCEDIAQgA0IgiHwhBCADQv////8PgyAFfkL/////D4MhGCADQv////8PgyAJIBh+fCEDIAQgA0IgiHwhBCAEQiCIIQMgBEL/////D4MgBiABNQIUIht+fCEEIAMgBEIgiHwhAyAEQv////8PgyAKIBd+fCEEIAMgBEIgiHwhAyAEQv////8PgyAOIBN+fCEEIAMgBEIgiHwhAyAEQv////8PgyASIA9+fCEEIAMgBEIgiHwhAyAEQv////8PgyAWIAt+fCEEIAMgBEIgiHwhAyAEQv////8PgyAANQIUIhogB358IQQgAyAEQiCIfCEDIARC/////w+DIA0gGH58IQQgAyAEQiCIfCEDIARC/////w+DIBEgFH58IQQgAyAEQiCIfCEDIARC/////w+DIBUgEH58IQQgAyAEQiCIfCEDIARC/////w+DIBkgDH58IQQgAyAEQiCIfCEDIARC/////w+DQQA1AtwOIh0gCH58IQQgAyAEQiCIfCEDIARC/////w+DIAV+Qv////8PgyEcIARC/////w+DIAkgHH58IQQgAyAEQiCIfCEDIANCIIghBCADQv////8PgyAGIAE1AhgiH358IQMgBCADQiCIfCEEIANC/////w+DIAogG358IQMgBCADQiCIfCEEIANC/////w+DIA4gF358IQMgBCADQiCIfCEEIANC/////w+DIBIgE358IQMgBCADQiCIfCEEIANC/////w+DIBYgD358IQMgBCADQiCIfCEEIANC/////w+DIBogC358IQMgBCADQiCIfCEEIANC/////w+DIAA1AhgiHiAHfnwhAyAEIANCIIh8IQQgA0L/////D4MgDSAcfnwhAyAEIANCIIh8IQQgA0L/////D4MgESAYfnwhAyAEIANCIIh8IQQgA0L/////D4MgFSAUfnwhAyAEIANCIIh8IQQgA0L/////D4MgGSAQfnwhAyAEIANCIIh8IQQgA0L/////D4MgHSAMfnwhAyAEIANCIIh8IQQgA0L/////D4NBADUC4A4iISAIfnwhAyAEIANCIIh8IQQgA0L/////D4MgBX5C/////w+DISAgA0L/////D4MgCSAgfnwhAyAEIANCIIh8IQQgBEIgiCEDIARC/////w+DIAYgATUCHCIjfnwhBCADIARCIIh8IQMgBEL/////D4MgCiAffnwhBCADIARCIIh8IQMgBEL/////D4MgDiAbfnwhBCADIARCIIh8IQMgBEL/////D4MgEiAXfnwhBCADIARCIIh8IQMgBEL/////D4MgFiATfnwhBCADIARCIIh8IQMgBEL/////D4MgGiAPfnwhBCADIARCIIh8IQMgBEL/////D4MgHiALfnwhBCADIARCIIh8IQMgBEL/////D4MgADUCHCIiIAd+fCEEIAMgBEIgiHwhAyAEQv////8PgyANICB+fCEEIAMgBEIgiHwhAyAEQv////8PgyARIBx+fCEEIAMgBEIgiHwhAyAEQv////8PgyAVIBh+fCEEIAMgBEIgiHwhAyAEQv////8PgyAZIBR+fCEEIAMgBEIgiHwhAyAEQv////8PgyAdIBB+fCEEIAMgBEIgiHwhAyAEQv////8PgyAhIAx+fCEEIAMgBEIgiHwhAyAEQv////8Pg0EANQLkDiIlIAh+fCEEIAMgBEIgiHwhAyAEQv////8PgyAFfkL/////D4MhJCAEQv////8PgyAJICR+fCEEIAMgBEIgiHwhAyADQiCIIQQgA0L/////D4MgCiAjfnwhAyAEIANCIIh8IQQgA0L/////D4MgDiAffnwhAyAEIANCIIh8IQQgA0L/////D4MgEiAbfnwhAyAEIANCIIh8IQQgA0L/////D4MgFiAXfnwhAyAEIANCIIh8IQQgA0L/////D4MgGiATfnwhAyAEIANCIIh8IQQgA0L/////D4MgHiAPfnwhAyAEIANCIIh8IQQgA0L/////D4MgIiALfnwhAyAEIANCIIh8IQQgA0L/////D4MgDSAkfnwhAyAEIANCIIh8IQQgA0L/////D4MgESAgfnwhAyAEIANCIIh8IQQgA0L/////D4MgFSAcfnwhAyAEIANCIIh8IQQgA0L/////D4MgGSAYfnwhAyAEIANCIIh8IQQgA0L/////D4MgHSAUfnwhAyAEIANCIIh8IQQgA0L/////D4MgISAQfnwhAyAEIANCIIh8IQQgA0L/////D4MgJSAMfnwhAyAEIANCIIh8IQQgAiADPgIAIARCIIghAyAEQv////8PgyAOICN+fCEEIAMgBEIgiHwhAyAEQv////8PgyASIB9+fCEEIAMgBEIgiHwhAyAEQv////8PgyAWIBt+fCEEIAMgBEIgiHwhAyAEQv////8PgyAaIBd+fCEEIAMgBEIgiHwhAyAEQv////8PgyAeIBN+fCEEIAMgBEIgiHwhAyAEQv////8PgyAiIA9+fCEEIAMgBEIgiHwhAyAEQv////8PgyARICR+fCEEIAMgBEIgiHwhAyAEQv////8PgyAVICB+fCEEIAMgBEIgiHwhAyAEQv////8PgyAZIBx+fCEEIAMgBEIgiHwhAyAEQv////8PgyAdIBh+fCEEIAMgBEIgiHwhAyAEQv////8PgyAhIBR+fCEEIAMgBEIgiHwhAyAEQv////8PgyAlIBB+fCEEIAMgBEIgiHwhAyACIAQ+AgQgA0IgiCEEIANC/////w+DIBIgI358IQMgBCADQiCIfCEEIANC/////w+DIBYgH358IQMgBCADQiCIfCEEIANC/////w+DIBogG358IQMgBCADQiCIfCEEIANC/////w+DIB4gF358IQMgBCADQiCIfCEEIANC/////w+DICIgE358IQMgBCADQiCIfCEEIANC/////w+DIBUgJH58IQMgBCADQiCIfCEEIANC/////w+DIBkgIH58IQMgBCADQiCIfCEEIANC/////w+DIB0gHH58IQMgBCADQiCIfCEEIANC/////w+DICEgGH58IQMgBCADQiCIfCEEIANC/////w+DICUgFH58IQMgBCADQiCIfCEEIAIgAz4CCCAEQiCIIQMgBEL/////D4MgFiAjfnwhBCADIARCIIh8IQMgBEL/////D4MgGiAffnwhBCADIARCIIh8IQMgBEL/////D4MgHiAbfnwhBCADIARCIIh8IQMgBEL/////D4MgIiAXfnwhBCADIARCIIh8IQMgBEL/////D4MgGSAkfnwhBCADIARCIIh8IQMgBEL/////D4MgHSAgfnwhBCADIARCIIh8IQMgBEL/////D4MgISAcfnwhBCADIARCIIh8IQMgBEL/////D4MgJSAYfnwhBCADIARCIIh8IQMgAiAEPgIMIANCIIghBCADQv////8PgyAaICN+fCEDIAQgA0IgiHwhBCADQv////8PgyAeIB9+fCEDIAQgA0IgiHwhBCADQv////8PgyAiIBt+fCEDIAQgA0IgiHwhBCADQv////8PgyAdICR+fCEDIAQgA0IgiHwhBCADQv////8PgyAhICB+fCEDIAQgA0IgiHwhBCADQv////8PgyAlIBx+fCEDIAQgA0IgiHwhBCACIAM+AhAgBEIgiCEDIARC/////w+DIB4gI358IQQgAyAEQiCIfCEDIARC/////w+DICIgH358IQQgAyAEQiCIfCEDIARC/////w+DICEgJH58IQQgAyAEQiCIfCEDIARC/////w+DICUgIH58IQQgAyAEQiCIfCEDIAIgBD4CFCADQiCIIQQgA0L/////D4MgIiAjfnwhAyAEIANCIIh8IQQgA0L/////D4MgJSAkfnwhAyAEIANCIIh8IQQgAiADPgIYIARCIIghAyACIAQ+AhwgA6cEQCACQcgOIAIQBxoFIAJByA4QBQRAIAJByA4gAhAHGgsLC7shHQF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX5C/////w4hBkIAIQJCACEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIAA1AgAiByAHfnwhAiADIAJCIIh8IQMgAkL/////D4MgBn5C/////w+DIQggAkL/////D4NBADUCyA4iCSAIfnwhAiADIAJCIIh8IQMgAyEEIARCIIghBUIAIQJCACEDIAJC/////w+DIAcgADUCBCIKfnwhAiADIAJCIIh8IQMgAkL/////D4NCAYYhAiADQgGGIAJCIIh8IQMgAkL/////D4MgBEL/////D4N8IQIgAyACQiCIfCAFfCEDIAJC/////w+DQQA1AswOIgwgCH58IQIgAyACQiCIfCEDIAJC/////w+DIAZ+Qv////8PgyELIAJC/////w+DIAkgC358IQIgAyACQiCIfCEDIAMhBCAEQiCIIQVCACECQgAhAyACQv////8PgyAHIAA1AggiDX58IQIgAyACQiCIfCEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIAogCn58IQIgAyACQiCIfCEDIAJC/////w+DIARC/////w+DfCECIAMgAkIgiHwgBXwhAyACQv////8PgyAMIAt+fCECIAMgAkIgiHwhAyACQv////8Pg0EANQLQDiIPIAh+fCECIAMgAkIgiHwhAyACQv////8PgyAGfkL/////D4MhDiACQv////8PgyAJIA5+fCECIAMgAkIgiHwhAyADIQQgBEIgiCEFQgAhAkIAIQMgAkL/////D4MgByAANQIMIhB+fCECIAMgAkIgiHwhAyACQv////8PgyAKIA1+fCECIAMgAkIgiHwhAyACQv////8Pg0IBhiECIANCAYYgAkIgiHwhAyACQv////8PgyAEQv////8Pg3whAiADIAJCIIh8IAV8IQMgAkL/////D4MgDCAOfnwhAiADIAJCIIh8IQMgAkL/////D4MgDyALfnwhAiADIAJCIIh8IQMgAkL/////D4NBADUC1A4iEiAIfnwhAiADIAJCIIh8IQMgAkL/////D4MgBn5C/////w+DIREgAkL/////D4MgCSARfnwhAiADIAJCIIh8IQMgAyEEIARCIIghBUIAIQJCACEDIAJC/////w+DIAcgADUCECITfnwhAiADIAJCIIh8IQMgAkL/////D4MgCiAQfnwhAiADIAJCIIh8IQMgAkL/////D4NCAYYhAiADQgGGIAJCIIh8IQMgAkL/////D4MgDSANfnwhAiADIAJCIIh8IQMgAkL/////D4MgBEL/////D4N8IQIgAyACQiCIfCAFfCEDIAJC/////w+DIAwgEX58IQIgAyACQiCIfCEDIAJC/////w+DIA8gDn58IQIgAyACQiCIfCEDIAJC/////w+DIBIgC358IQIgAyACQiCIfCEDIAJC/////w+DQQA1AtgOIhUgCH58IQIgAyACQiCIfCEDIAJC/////w+DIAZ+Qv////8PgyEUIAJC/////w+DIAkgFH58IQIgAyACQiCIfCEDIAMhBCAEQiCIIQVCACECQgAhAyACQv////8PgyAHIAA1AhQiFn58IQIgAyACQiCIfCEDIAJC/////w+DIAogE358IQIgAyACQiCIfCEDIAJC/////w+DIA0gEH58IQIgAyACQiCIfCEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIARC/////w+DfCECIAMgAkIgiHwgBXwhAyACQv////8PgyAMIBR+fCECIAMgAkIgiHwhAyACQv////8PgyAPIBF+fCECIAMgAkIgiHwhAyACQv////8PgyASIA5+fCECIAMgAkIgiHwhAyACQv////8PgyAVIAt+fCECIAMgAkIgiHwhAyACQv////8Pg0EANQLcDiIYIAh+fCECIAMgAkIgiHwhAyACQv////8PgyAGfkL/////D4MhFyACQv////8PgyAJIBd+fCECIAMgAkIgiHwhAyADIQQgBEIgiCEFQgAhAkIAIQMgAkL/////D4MgByAANQIYIhl+fCECIAMgAkIgiHwhAyACQv////8PgyAKIBZ+fCECIAMgAkIgiHwhAyACQv////8PgyANIBN+fCECIAMgAkIgiHwhAyACQv////8Pg0IBhiECIANCAYYgAkIgiHwhAyACQv////8PgyAQIBB+fCECIAMgAkIgiHwhAyACQv////8PgyAEQv////8Pg3whAiADIAJCIIh8IAV8IQMgAkL/////D4MgDCAXfnwhAiADIAJCIIh8IQMgAkL/////D4MgDyAUfnwhAiADIAJCIIh8IQMgAkL/////D4MgEiARfnwhAiADIAJCIIh8IQMgAkL/////D4MgFSAOfnwhAiADIAJCIIh8IQMgAkL/////D4MgGCALfnwhAiADIAJCIIh8IQMgAkL/////D4NBADUC4A4iGyAIfnwhAiADIAJCIIh8IQMgAkL/////D4MgBn5C/////w+DIRogAkL/////D4MgCSAafnwhAiADIAJCIIh8IQMgAyEEIARCIIghBUIAIQJCACEDIAJC/////w+DIAcgADUCHCIcfnwhAiADIAJCIIh8IQMgAkL/////D4MgCiAZfnwhAiADIAJCIIh8IQMgAkL/////D4MgDSAWfnwhAiADIAJCIIh8IQMgAkL/////D4MgECATfnwhAiADIAJCIIh8IQMgAkL/////D4NCAYYhAiADQgGGIAJCIIh8IQMgAkL/////D4MgBEL/////D4N8IQIgAyACQiCIfCAFfCEDIAJC/////w+DIAwgGn58IQIgAyACQiCIfCEDIAJC/////w+DIA8gF358IQIgAyACQiCIfCEDIAJC/////w+DIBIgFH58IQIgAyACQiCIfCEDIAJC/////w+DIBUgEX58IQIgAyACQiCIfCEDIAJC/////w+DIBggDn58IQIgAyACQiCIfCEDIAJC/////w+DIBsgC358IQIgAyACQiCIfCEDIAJC/////w+DQQA1AuQOIh4gCH58IQIgAyACQiCIfCEDIAJC/////w+DIAZ+Qv////8PgyEdIAJC/////w+DIAkgHX58IQIgAyACQiCIfCEDIAMhBCAEQiCIIQVCACECQgAhAyACQv////8PgyAKIBx+fCECIAMgAkIgiHwhAyACQv////8PgyANIBl+fCECIAMgAkIgiHwhAyACQv////8PgyAQIBZ+fCECIAMgAkIgiHwhAyACQv////8Pg0IBhiECIANCAYYgAkIgiHwhAyACQv////8PgyATIBN+fCECIAMgAkIgiHwhAyACQv////8PgyAEQv////8Pg3whAiADIAJCIIh8IAV8IQMgAkL/////D4MgDCAdfnwhAiADIAJCIIh8IQMgAkL/////D4MgDyAafnwhAiADIAJCIIh8IQMgAkL/////D4MgEiAXfnwhAiADIAJCIIh8IQMgAkL/////D4MgFSAUfnwhAiADIAJCIIh8IQMgAkL/////D4MgGCARfnwhAiADIAJCIIh8IQMgAkL/////D4MgGyAOfnwhAiADIAJCIIh8IQMgAkL/////D4MgHiALfnwhAiADIAJCIIh8IQMgASACPgIAIAMhBCAEQiCIIQVCACECQgAhAyACQv////8PgyANIBx+fCECIAMgAkIgiHwhAyACQv////8PgyAQIBl+fCECIAMgAkIgiHwhAyACQv////8PgyATIBZ+fCECIAMgAkIgiHwhAyACQv////8Pg0IBhiECIANCAYYgAkIgiHwhAyACQv////8PgyAEQv////8Pg3whAiADIAJCIIh8IAV8IQMgAkL/////D4MgDyAdfnwhAiADIAJCIIh8IQMgAkL/////D4MgEiAafnwhAiADIAJCIIh8IQMgAkL/////D4MgFSAXfnwhAiADIAJCIIh8IQMgAkL/////D4MgGCAUfnwhAiADIAJCIIh8IQMgAkL/////D4MgGyARfnwhAiADIAJCIIh8IQMgAkL/////D4MgHiAOfnwhAiADIAJCIIh8IQMgASACPgIEIAMhBCAEQiCIIQVCACECQgAhAyACQv////8PgyAQIBx+fCECIAMgAkIgiHwhAyACQv////8PgyATIBl+fCECIAMgAkIgiHwhAyACQv////8Pg0IBhiECIANCAYYgAkIgiHwhAyACQv////8PgyAWIBZ+fCECIAMgAkIgiHwhAyACQv////8PgyAEQv////8Pg3whAiADIAJCIIh8IAV8IQMgAkL/////D4MgEiAdfnwhAiADIAJCIIh8IQMgAkL/////D4MgFSAafnwhAiADIAJCIIh8IQMgAkL/////D4MgGCAXfnwhAiADIAJCIIh8IQMgAkL/////D4MgGyAUfnwhAiADIAJCIIh8IQMgAkL/////D4MgHiARfnwhAiADIAJCIIh8IQMgASACPgIIIAMhBCAEQiCIIQVCACECQgAhAyACQv////8PgyATIBx+fCECIAMgAkIgiHwhAyACQv////8PgyAWIBl+fCECIAMgAkIgiHwhAyACQv////8Pg0IBhiECIANCAYYgAkIgiHwhAyACQv////8PgyAEQv////8Pg3whAiADIAJCIIh8IAV8IQMgAkL/////D4MgFSAdfnwhAiADIAJCIIh8IQMgAkL/////D4MgGCAafnwhAiADIAJCIIh8IQMgAkL/////D4MgGyAXfnwhAiADIAJCIIh8IQMgAkL/////D4MgHiAUfnwhAiADIAJCIIh8IQMgASACPgIMIAMhBCAEQiCIIQVCACECQgAhAyACQv////8PgyAWIBx+fCECIAMgAkIgiHwhAyACQv////8Pg0IBhiECIANCAYYgAkIgiHwhAyACQv////8PgyAZIBl+fCECIAMgAkIgiHwhAyACQv////8PgyAEQv////8Pg3whAiADIAJCIIh8IAV8IQMgAkL/////D4MgGCAdfnwhAiADIAJCIIh8IQMgAkL/////D4MgGyAafnwhAiADIAJCIIh8IQMgAkL/////D4MgHiAXfnwhAiADIAJCIIh8IQMgASACPgIQIAMhBCAEQiCIIQVCACECQgAhAyACQv////8PgyAZIBx+fCECIAMgAkIgiHwhAyACQv////8Pg0IBhiECIANCAYYgAkIgiHwhAyACQv////8PgyAEQv////8Pg3whAiADIAJCIIh8IAV8IQMgAkL/////D4MgGyAdfnwh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NwMgIAEgACkDKDcDKCABIAApAzA3AzAgASAAKQM4NwM4IAEgACkDQDcDQCABIAApA0g3A0ggASAAKQNQNwNQIAEgACkDWDcDWAscACABQcAAahAcIABBIGogAUEgahAAIAAgARAACxgBAX8gACABEAQgAEEgaiABQSBqEARxDwt1AQF/IABBwABqIQIgABBABEAgARA/DwsgARA/BEBBAA8LIAIQDwRAIAAgARBGDwsgAkHIGRAVIAFByBlB6BkQFCACQcgZQYgaEBQgAUEgakGIGkGoGhAUIABB6BkQBARAIABBIGpBqBoQBARAQQEPCwtBAA8LtAECAX8BfyAAQcAAaiECIAFBwABqIQMgABBABEAgARBADwsgARBABEBBAA8LIAIQDwRAIAEgABBHDwsgAxAPBEAgACABEEcPCyACQcgaEBUgA0HoGhAVIABB6BpBiBsQFCABQcgaQagbEBQgAkHIGkHIGxAUIANB6BpB6BsQFCAAQSBqQegbQYgcEBQgAUEgakHIG0GoHBAUQYgbQagbEAQEQEGIHEGoHBAEBEBBAQ8LC0EADwvoAQAgABA/BEAgACABEEUPCyAAQcgcEBUgAEEgakHoHBAVQegcQYgdEBUgAEHoHEGoHRAQQagdQagdEBVBqB1ByBxBqB0QEUGoHUGIHUGoHRARQagdQagdQagdEBBByBxByBxByB0QEEHIHUHIHEHIHRAQIABBIGogAEEgaiABQcAAahAQQcgdIAEQFSABQagdIAEQESABQagdIAEQEUGIHUGIHUHoHRAQQegdQegdQegdEBBB6B1B6B1B6B0QEEGoHSABIAFBIGoQESABQSBqQcgdIAFBIGoQFCABQSBqQegdIAFBIGoQEQuJAgAgABBABEAgACABEEQPCyAAQcAAahAPBEAgACABEEkPDwsgAEGIHhAVIABBIGpBqB4QFUGoHkHIHhAVIABBqB5B6B4QEEHoHkHoHhAVQegeQYgeQegeEBFB6B5ByB5B6B4QEUHoHkHoHkHoHhAQQYgeQYgeQYgfEBBBiB9BiB5BiB8QEEGIH0GoHxAVIABBIGogAEHAAGpByB8QFEHoHkHoHiABEBBBqB8gASABEBFByB5ByB5B6B8QEEHoH0HoH0HoHxAQQegfQegfQegfEBBB6B4gASABQSBqEBEgAUEgakGIHyABQSBqEBQg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BEAgABAZDwsgAEEgahAZDwuLAgQBfwF/AX8Bf0EAKAIAIQVBACAFIAJBAWpBwABsajYCACAFEH8gACEGIAVBwABqIQVBACEIAkADQCAIIAJGDQEgBhB8BEAgBUHAAGsgBRCAAQUgBiAFQcAAayAFEIEBCyAGIAFqIQYgBUHAAGohBSAIQQFqIQgMAAsLIAYgAWshBiAFQcAAayEFIAMgAkEBayAEbGohByAFIAUQiwECQANAIAhFDQEgBhB8BEAgBSAFQcAAaxCAASAHEH4FIAVBwABrQejKABCAASAFIAYgBUHAAGsQgQEgBUHoygAgBxCBAQsgBiABayEGIAcgBGshByAFQcAAayEFIAhBAWshCAwACwtBACAFNgIAC8wCAgF/AX8gAkUEQCADEH8PCyAAQajLABCAASADEH8gAiEEAkADQCAEQQFrIQQgASAEai0AACEFIAMgAxCDASAFQYABTwRAIAVBgAFrIQUgA0GoywAgAxCBAQsgAyADEIMBIAVBwABPBEAgBUHAAGshBSADQajLACADEIEBCyADIAMQgwEgBUEgTwRAIAVBIGshBSADQajLACADEIEBCyADIAMQgwEgBUEQTwRAIAVBEGshBSADQajLACADEIEBCyADIAMQgwEgBUEITwRAIAVBCGshBSADQajLACADEIEBCyADIAMQgwEgBUEETwRAIAVBBGshBSADQajLACADEIEBCyADIAMQgwEgBUECTwRAIAVBAmshBSADQajLACADEIEBCyADIAMQgwEgBUEBTwRAIAVBAWshBSADQajLACADEIEBCyAERQ0BDAALCwvLAQBB6M0AEH9B6M0AQejNABCGASAAQejLAEEgQajMABCQAUGozABB6MwAEIMBIABB6MwAQejMABCBAUHozABBqM0AEIcBQajNAEHozABBqM0AEIEBQajNAEHozQAQigEEQAALQajMACAAQajOABCBAUHozABB6M0AEIoBBEBB6M0AEAFBiM4AEBxB6M0AQajOACABEIEBBUHozgAQf0HozgBB6MwAQejOABCEAUHozgBBiMwAQSBB6M4AEJABQejOAEGozgAgARCBAQsLaABBiNEAEH9BiNEAQYjRABCGASAAQajPAEEgQcjPABCQAUHIzwBBiNAAEIMBIABBiNAAQYjQABCBAUGI0ABByNAAEIcBQcjQAEGI0ABByNAAEIEBQcjQAEGI0QAQigEEQEEADwtBAQ8LDwAgABB8IABBwABqEHxxCwoAIABBgAFqEHwLDgAgABB+IABBwABqEH4LFgAgABB+IABBwABqEH8gAEGAAWoQfguiAQAgASAAKQMANwMAIAEgACkDCDcDCCABIAApAxA3AxAgASAAKQMYNwMYIAEgACkDIDcDICABIAApAyg3AyggASAAKQMwNwMwIAEgACkDODcDOCABIAApA0A3A0AgASAAKQNINwNIIAEgACkDUDcDUCABIAApA1g3A1ggASAAKQNgNwNgIAEgACkDaDcDaCABIAApA3A3A3AgASAAKQN4NwN4C4ICACABIAApAwA3AwAgASAAKQMINwMIIAEgACkDEDcDECABIAApAxg3AxggASAAKQMgNwMgIAEgACkDKDcDKCABIAApAzA3AzAgASAAKQM4NwM4IAEgACkDQDcDQCABIAApA0g3A0ggASAAKQNQNwNQIAEgACkDWDcDWCABIAApA2A3A2AgASAAKQNoNwNoIAEgACkDcDcDcCABIAApA3g3A3ggASAAKQOAATcDgAEgASAAKQOIATcDiAEgASAAKQOQATcDkAEgASAAKQOYATcDmAEgASAAKQOgATcDoAEgASAAKQOoATcDqAEgASAAKQOwATcDsAEgASAAKQO4ATcDuAELIAAgAUGAAWoQfyAAQcAAaiABQcAAahCAASAAIAEQgAELHAEBfyAAIAEQigEgAEHAAGogAUHAAGoQigFxDwuKAQEBfyAAQYABaiECIAAQlAEEQCABEJMBDwsgARCTAQRAQQAPCyACEH0EQCAAIAEQmgEPCyACQYjSABCDASABQYjSAEHI0gAQgQEgAkGI0gBBiNMAEIEBIAFBwABqQYjTAEHI0wAQgQEgAEHI0gAQigEEQCAAQcAAakHI0wAQigEEQEEBDwsLQQAPC9cBAgF/AX8gAEGAAWohAiABQYABaiEDIAAQlAEEQCABEJQBDwsgARCUAQRAQQAPCyACEH0EQCABIAAQmwEPCyADEH0EQCAAIAEQmwEPCyACQYjUABCDASADQcjUABCDASAAQcjUAEGI1QAQgQEgAUGI1ABByNUAEIEBIAJBiNQAQYjWABCBASADQcjUAEHI1gAQgQEgAEHAAGpByNYAQYjXABCBASABQcAAakGI1gBByNcAEIEBQYjVAEHI1QAQigEEQEGI1wBByNcAEIoBBEBBAQ8LC0EADwusAgAgABCTAQRAIAAgARCZAQ8LIABBiNgAEIMBIABBwABqQcjYABCDAUHI2ABBiNkAEIMBIABByNgAQcjZABCEAUHI2QBByNkAEIMBQcjZAEGI2ABByNkAEIUBQcjZAEGI2QBByNkAEIUBQcjZAEHI2QBByNkAEIQBQYjYAEGI2ABBiNoAEIQBQYjaAEGI2ABBiNoAEIQBIABBwABqIABBwABqIAFBgAFqEIQBQYjaACABEIMBIAFByNkAIAEQhQEgAUHI2QAgARCFAUGI2QBBiNkAQcjaABCEAUHI2gBByNoAQcjaABCEAUHI2gBByNoAQcjaABCEAUHI2QAgASABQcAAahCFASABQcAAakGI2gAgAUHAAGoQgQEgAUHAAGpByNoAIAFBwABqEIUBC9MCACAAEJQBBEAgACABEJgBDwsgAEGAAWoQfQRAIAAgARCdAQ8PCyAAQYjbABCDASAAQcAAakHI2wAQgwFByNsAQYjcABCDASAAQcjbAEHI3AAQhAFByNwAQcjcABCDAUHI3ABBiNsAQcjcABCFAUHI3ABBiNwAQcjcABCFAUHI3ABByNwAQcjcABCEAUGI2wBBiNsAQYjdABCEAUGI3QBBiNsAQYjdABCEAUGI3QBByN0AEIMBIABBwABqIABBgAFqQYjeABCBAUHI3ABByNwAIAEQhAFByN0AIAEgARCFAUGI3ABBiNwAQcjeABCEAUHI3gBByN4AQcjeABCEAUHI3gBByN4AQcjeABCEAUHI3AAgASABQcAAahCFASABQcAAakGI3QAgAUHAAGoQgQEgAUHAAGpByN4AIAFBwABqEIUBQYjeAEGI3gAgAUGAAWoQhAEL6gIBAX8gAEGAAWohAyAAEJMBBEAgASACEJcBIAJBgAFqEH8PCyABEJMBBEAgACACEJcBIAJBgAFqEH8PCyAAIAEQigEEQCAAQcAAaiABQcAAahCKAQRAIAEgAhCdAQ8LCyABIABBiN8AEIUBIAFBwABqIABBwABqQYjgABCFAUGI3wBByN8AEIMBQcjfAEHI3wBByOAAEIQBQcjgAEHI4ABByOAAEIQBQYjfAEHI4ABBiOEAEIEBQYjgAEGI4ABByOEAEIQBIABByOAAQcjiABCBAUHI4QBBiOIAEIMBQcjiAEHI4gBBiOMAEIQBQYjiAEGI4QAgAhCFASACQYjjACACEIUBIABBwABqQYjhAEHI4wAQgQFByOMAQcjjAEHI4wAQhAFByOIAIAIgAkHAAGoQhQEgAkHAAGpByOEAIAJBwABqEIEBIAJBwABqQcjjACACQcAAahCFAUGI3wBBiN8AIAJBgAFqEIQBC9oDAQF/IABBgAFqIQMgABCUAQRAIAEgAhCXASACQYABahB/DwsgARCTAQRAIAAgAhCYAQ8LIAMQfQRAIAAgASACEJ8BDwsgA0GI5AAQgwEgAUGI5ABByOQAEIEBIANBiOQAQYjlABCBASABQcAAakGI5QBByOUAEIEBIABByOQAEIoBBEAgAEHAAGpByOUAEIoBBEAgASACEJ0BDwsLQcjkACAAQYjmABCFAUHI5QAgAEHAAGpBiOcAEIUBQYjmAEHI5gAQgwFByOYAQcjmAEHI5wAQhAFByOcAQcjnAEHI5wAQhAFBiOYAQcjnAEGI6AAQgQFBiOcAQYjnAEHI6AAQhAEgAEHI5wBByOkAEIEBQcjoAEGI6QAQgwFByOkAQcjpAEGI6gAQhAFBiOkAQYjoACACEIUBIAJBiOoAIAIQhQEgAEHAAGpBiOgAQcjqABCBAUHI6gBByOoAQcjqABCEAUHI6QAgAiACQcAAahCFASACQcAAakHI6AAgAkHAAGoQgQEgAkHAAGpByOoAIAJBwABqEIUBIANBiOYAIAJBgAFqEIQBIAJBgAFqIAJBgAFqEIMBIAJBgAFqQYjkACACQYABahCFASACQYABakHI5gAgAkGAAWoQhQELowQCAX8BfyAAQYABaiEDIAFBgAFqIQQgABCUAQRAIAEgAhCYAQ8LIAEQlAEEQCAAIAIQmAEPCyADEH0EQCABIAAgAhCgAQ8LIAQQfQRAIAAgASACEKABDwsgA0GI6wAQgwEgBEHI6wAQgwEgAEHI6wBBiOwAEIEBIAFBiOsAQcjsABCBASADQYjrAEGI7QAQgQEgBEHI6wBByO0AEIEBIABBwABqQcjtAEGI7gAQgQEgAUHAAGpBiO0AQcjuABCBAUGI7ABByOwAEIoBBEBBiO4AQcjuABCKAQRAIAAgAhCeAQ8LC0HI7ABBiOwAQYjvABCFAUHI7gBBiO4AQcjvABCFAUGI7wBBiO8AQYjwABCEAUGI8ABBiPAAEIMBQYjvAEGI8ABByPAAEIEBQcjvAEHI7wBBiPEAEIQBQYjsAEGI8ABBiPIAEIEBQYjxAEHI8QAQgwFBiPIAQYjyAEHI8gAQhAFByPEAQcjwACACEIUBIAJByPIAIAIQhQFBiO4AQcjwAEGI8wAQgQFBiPMAQYjzAEGI8wAQhAFBiPIAIAIgAkHAAGoQhQEgAkHAAGpBiPEAIAJBwABqEIEBIAJBwABqQYjzACACQcAAahCFASADIAQgAkGAAWoQhAEgAkGAAWogAkGAAWoQgwEgAkGAAWpBiOsAIAJBgAFqEIUBIAJBgAFqQcjrACACQYABahCFASACQYABakGI7wAgAkGAAWoQgQELGAAgACABEIABIABBwABqIAFBwABqEIYBCycAIAAgARCAASAAQcAAaiABQcAAahCGASAAQYABaiABQYABahCAAQsWACABQcjzABCiASAAQcjzACACEJ8BCxYAIAFBiPUAEKIBIABBiPUAIAIQoAELFgAgAUHI9gAQowEgAEHI9gAgAhChAQsYACAAIAEQiQEgAEHAAGogAUHAAGoQiQELJwAgACABEIkBIABBwABqIAFBwABqEIkBIABBgAFqIAFBgAFqEIkBCxgAIAAgARCIASAAQcAAaiABQcAAahCIAQsnACAAIAEQiAEgAEHAAGogAUHAAGoQiAEgAEGAAWogAUGAAWoQiAELXAAgABCUAQRAIAEQfiABQcAAahB+BSAAQYABakGI+AAQiwFBiPgAQcj4ABCDAUGI+ABByPgAQYj5ABCBASAAQcj4ACABEIEBIABBwABqQYj5ACABQcAAahCBAQsLuwEFAX8BfwF/AX8Bf0EAKAIAIQNBACADIAFBwABsajYCACAAQYABakHAASABIANBwAAQjwEgACEEIAMhBSACIQZBACEHAkADQCAHIAFGDQEgBRB8BEAgBhB+IAZBwABqEH4FIAUgBEHAAGpByPkAEIEBIAUgBRCDASAFIAQgBhCBASAFQcj5ACAGQcAAahCBAQsgBEHAAWohBCAGQYABaiEGIAVBwABqIQUgB0EBaiEHDAALC0EAIAM2AgALXQAgABCUAQRAIAEQlgEFIABBgAFqQYj6ABCLAUGI+gBByPoAEIMBQYj6AEHI+gBBiPsAEIEBIABByPoAIAEQgQEgAEHAAGpBiPsAIAFBwABqEIEBIAFBgAFqEH8LCzsCAX8BfyACIAFqQQFrIQMgACEEAkADQCADIAJIDQEgAyAELQAAOgAAIANBAWshAyAEQQFqIQQMAAsLCz0AIAAQkwEEQCABEJUBIAFBwAA6AAAPCyAAQcj7ABCnAUHI+wBBwAAgARCuAUGI/ABBwAAgAUHAAGoQrgELSQAgABCUAQRAIAEQfiABQcAAOgAADwsgAEHI/AAQiQFByPwAQcAAIAEQrgEgAEHAAGoQjQFBf0YEQCABIAEtAABBgAFyOgAACws5ACAALQAAQcAAcQRAIAEQlQEPCyAAQcAAQYj9ABCuASAAQcAAakHAAEHI/QAQrgFBiP0AIAEQqQEL2QECAX8BfyAALQAAIQIgAkHAAHEEQCABEJUBDwsgAkGAAXEhAyAAQcj+ABCAAUHI/gAgAkE/cToAAEHI/gBBwABBiP4AEK4BQYj+ACABEIgBIAFByP4AEIMBIAFByP4AQcj+ABCBAUHI/gBByNEAQcj+ABCEAUHI/gBByP4AEJEBQcj+AEGI/gAQhgFByP4AEI0BQX9GBEAgAwRAQcj+ACABQcAAahCAAQVByP4AIAFBwABqEIYBCwUgAwRAQcj+ACABQcAAahCGAQVByP4AIAFBwABqEIABCwsLQQMBfwF/AX8gACEEIAIhBUEAIQMCQANAIAMgAUYNASAEIAUQrwEgBEGAAWohBCAFQYABaiEFIANBAWohAwwACwsLQQMBfwF/AX8gACEEIAIhBUEAIQMCQANAIAMgAUYNASAEIAUQsAEgBEGAAWohBCAFQcAAaiEFIANBAWohAwwACwsLQQMBfwF/AX8gACEEIAIhBUEAIQMCQANAIAMgAUYNASAEIAUQsQEgBEGAAWohBCAFQYABaiEFIANBAWohAwwACwsLVQMBfwF/AX8gACABQQFrQcAAbGohBCACIAFBAWtBgAFsaiEFQQAhAwJAA0AgAyABRg0BIAQgBRCyASAEQcAAayEEIAVBgAFrIQUgA0EBaiEDDAALCwtVAwF/AX8BfyAAIAFBAWtBgAFsaiEEIAIgAUEBa0HAAWxqIQVBACEDAkADQCADIAFGDQEgBCAFEJkBIARBgAFrIQQgBUHAAWshBSADQQFqIQMMAAsLC0ECAX8BfyABQQhsIAJrIQQgAyAESgRAQQEgBHRBAWshBQVBASADdEEBayEFCyAAIAJBA3ZqKAAAIAJBB3F2IAVxC5oBBAF/AX8BfwF/IAFBAUYEQA8LQQEgAUEBa3QhAiAAIQMgACACQcABbGohBCAEQcABayEFAkADQCADIAVGDQEgAyAEIAMQoQEgBSAEIAUQoQEgA0HAAWohAyAEQcABaiEEDAALCyAAIAFBAWsQuQEgAUEBayEBAkADQCABRQ0BIAUgBRCeASABQQFrIQEMAAsLIAAgBSAAEKEBC9IBCgF/AX8BfwF/AX8BfwF/AX8BfwF/IANFBEAgBhCWAQ8LQQEgBXQhDUEAKAIAIQ5BACAOIA1BwAFsajYCAEEAIQwCQANAIAwgDUYNASAOIAxBwAFsahCWASAMQQFqIQwMAAsLIAAhCiABIQggASADIAJsaiEJAkADQCAIIAlGDQEgCCACIAQgBRC4ASEPIA8EQCAOIA9BAWtBwAFsaiEQIBAgCiAQEKEBCyAIIAJqIQggCkHAAWohCgwACwsgDiAFELkBIA4gBhCYAUEAIA42AgALqAEMAX8BfwF/AX8BfwF/AX8BfwF/AX8BfwF/IAQQlgEgA0UEQA8LIANnLQDIgAEhBSACQQN0QQFrIAVuQQFqIQYgBkEBayAFbCEKAkADQCAKQQBIDQEgBBCUAUUEQEEAIQwCQANAIAwgBUYNASAEIAQQngEgDEEBaiEMDAALCwsgACABIAIgAyAKIAVBiP8AELoBIARBiP8AIAQQoQEgCiAFayEKDAALCwtBAgF/AX8gAUEIbCACayEEIAMgBEoEQEEBIAR0QQFrIQUFQQEgA3RBAWshBQsgACACQQN2aigAACACQQdxdiAFcQuaAQQBfwF/AX8BfyABQQFGBEAPC0EBIAFBAWt0IQIgACEDIAAgAkHAAWxqIQQgBEHAAWshBQJAA0AgAyAFRg0BIAMgBCADEKEBIAUgBCAFEKEBIANBwAFqIQMgBEHAAWohBAwACwsgACABQQFrEL0BIAFBAWshAQJAA0AgAUUNASAFIAUQngEgAUEBayEBDAALCyAAIAUgABChAQvSAQoBfwF/AX8BfwF/AX8BfwF/AX8BfyADRQRAIAYQlgEPC0EBIAV0IQ1BACgCACEOQQAgDiANQcABbGo2AgBBACEMAkADQCAMIA1GDQEgDiAMQcABbGoQlgEgDEEBaiEMDAALCyAAIQogASEIIAEgAyACbGohCQJAA0AgCCAJRg0BIAggAiAEIAUQvAEhDyAPBEAgDiAPQQFrQcABbGohECAQIAogEBCgAQsgCCACaiEIIApBgAFqIQoMAAsLIA4gBRC9ASAOIAYQmAFBACAONgIAC6gBDAF/AX8BfwF/AX8BfwF/AX8BfwF/AX8BfyAEEJYBIANFBEAPCyADZy0AqIIBIQUgAkEDdEEBayAFbkEBaiEGIAZBAWsgBWwhCgJAA0AgCkEASA0BIAQQlAFFBEBBACEMAkADQCAMIAVGDQEgBCAEEJ4BIAxBAWohDAwACwsLIAAgASACIAMgCiAFQeiAARC+ASAEQeiAASAEEKEBIAogBWshCgwACwsLtAQHAX8BfwF/AX8BfwF/AX8gAkUEQCADEJYBDwsgAkEDdCEFQQAoAgAhBCAEIQpBACAEQSBqIAVqQXhxNgIAQQEhBiABQQBBA3ZBfHFqKAIAQQBBH3F2QQFxIQdBACEJAkADQCAGIAVGDQEgASAGQQN2QXxxaigCACAGQR9xdkEBcSEIIAcEQCAIBEAgCQRAQQAhB0EBIQkgCkEBOgAAIApBAWohCgVBACEHQQEhCSAKQf8BOgAAIApBAWohCgsFIAkEQEEAIQdBASEJIApB/wE6AAAgCkEBaiEKBUEAIQdBACEJIApBAToAACAKQQFqIQoLCwUgCARAIAkEQEEAIQdBASEJIApBADoAACAKQQFqIQoFQQEhB0EAIQkgCkEAOgAAIApBAWohCgsFIAkEQEEBIQdBACEJIApBADoAACAKQQFqIQoFQQAhB0EAIQkgCkEAOgAAIApBAWohCgsLCyAGQQFqIQYMAAsLIAcEQCAJBEAgCkH/AToAACAKQQFqIQogCkEAOgAAIApBAWohCiAKQQE6AAAgCkEBaiEKBSAKQQE6AAAgCkEBaiEKCwUgCQRAIApBADoAACAKQQFqIQogCkEBOgAAIApBAWohCgsLIApBAWshCiAAQciCARCYASADEJYBAkADQCADIAMQngEgCi0AACEIIAgEQCAIQQFGBEAgA0HIggEgAxChAQUgA0HIggEgAxCmAQsLIAQgCkYNASAKQQFrIQoMAAsLQQAgBDYCAAu0BAcBfwF/AX8BfwF/AX8BfyACRQRAIAMQlgEPCyACQQN0IQVBACgCACEEIAQhCkEAIARBIGogBWpBeHE2AgBBASEGIAFBAEEDdkF8cWooAgBBAEEfcXZBAXEhB0EAIQkCQANAIAYgBUYNASABIAZBA3ZBfHFqKAIAIAZBH3F2QQFxIQggBwRAIAgEQCAJBEBBACEHQQEhCSAKQQE6AAAgCkEBaiEKBUEAIQdBASEJIApB/wE6AAAgCkEBaiEKCwUgCQRAQQAhB0EBIQkgCkH/AToAACAKQQFqIQoFQQAhB0EAIQkgCkEBOgAAIApBAWohCgsLBSAIBEAgCQRAQQAhB0EBIQkgCkEAOgAAIApBAWohCgVBASEHQQAhCSAKQQA6AAAgCkEBaiEKCwUgCQRAQQEhB0EAIQkgCkEAOgAAIApBAWohCgVBACEHQQAhCSAKQQA6AAAgCkEBaiEKCwsLIAZBAWohBgwACwsgBwRAIAkEQCAKQf8BOgAAIApBAWohCiAKQQA6AAAgCkEBaiEKIApBAToAACAKQQFqIQoFIApBAToAACAKQQFqIQoLBSAJBEAgCkEAOgAAIApBAWohCiAKQQE6AAAgCkEBaiEKCwsgCkEBayEKIABBiIQBEJcBIAMQlgECQANAIAMgAxCeASAKLQAAIQggCARAIAhBAUYEQCADQYiEASADEKABBSADQYiEASADEKUBCwsgBCAKRg0BIApBAWshCgwACwtBACAENgIACxYAIAFBiIUBEC4gAEGIhQFBICACEGwLRgAgAEH/AXEtAOiTAUEYdCAAQQh2Qf8BcS0A6JMBQRB0aiAAQRB2Qf8BcS0A6JMBQQh0IABBGHZB/wFxLQDokwFqaiABdwtqBQF/AX8BfwF/AX9BASABdCECQQAhAwJAA0AgAyACRg0BIAAgA0HgAGxqIQUgAyABEMMBIQQgACAEQeAAbGohBiADIARJBEAgBUHolQEQRCAGIAUQREHolQEgBhBECyADQQFqIQMMAAsLC+MBBwF/AX8BfwF/AX8BfwF/IAJFIAMQJXEEQA8LQQEgAXQhBCAEQQFrIQhBASEHIARBAXYhBQJAA0AgByAFRg0BIAAgB0HgAGxqIQkgACAEIAdrQeAAbGohCiACBEAgAxAlBEAgCUHIlgEQRCAKIAkQREHIlgEgChBEBSAJQciWARBEIAogAyAJEMIBQciWASADIAoQwgELBSADECUEQAUgCSADIAkQwgEgCiADIAoQwgELCyAHQQFqIQcMAAsLIAMQJQRABSAAIAMgABDCASAAIAVB4ABsaiEKIAogAyAKEMIBCwvtAQkBfwF/AX8BfwF/AX8BfwF/AX8gACABEMQBQQEgAXQhCUEBIQQCQANAIAQgAUsNAUEBIAR0IQdBqIUBIARBIGxqIQpBACEFAkADQCAFIAlPDQFBqJcBEDIgB0EBdiEIQQAhBgJAA0AgBiAITw0BIAAgBSAGakHgAGxqIQsgCyAIQeAAbGohDCAMQaiXAUHIlwEQwgEgC0GomAEQREGomAFByJcBIAsQTUGomAFByJcBIAwQUkGolwEgCkGolwEQKiAGQQFqIQYMAAsLIAUgB2ohBQwACwsgBEEBaiEEDAALCyAAIAEgAiADEMUBC0MCAX8BfyAAQQF2IQJBACEBAkADQCACRQ0BIAJBAXYhAiABQQFqIQEMAAsLIABBASABdEcEQAALIAFBHEsEQAALIAELHgEBfyABEMcBIQJBiJkBEDIgACACQQBBiJkBEMYBCyQCAX8BfyABEMcBIQJByIwBIAJBIGxqIQMgACACQQEgAxDGAQt5AwF/AX8BfyADQaiZARAAQQAhBwJAA0AgByACRg0BIAAgB0HgAGxqIQUgASAHQeAAbGohBiAGQaiZAUHImQEQwgEgBUGomgEQREGomgFByJkBIAUQTUGomgFByJkBIAYQUkGomQEgBEGomQEQKiAHQQFqIQcMAAsLC8gBCQF/AX8BfwF/AX8BfwF/AX8Bf0EBIAJ0IQQgBEEBdiEFIAEgAnYhAyAFQeAAbCEGQaiFASACQSBsaiELQQAhCQJAA0AgCSADRg0BQYibARAyQQAhCgJAA0AgCiAFRg0BIAAgCSAEbCAKakHgAGxqIQcgByAGaiEIIAhBiJsBQaibARDCASAHQYicARBEQYicAUGomwEgBxBNQYicAUGomwEgCBBSQYibASALQYibARAqIApBAWohCgwACwsgCUEBaiEJDAALCwuCAQQBfwF/AX8BfyABQQF2IQYgAUEBRgRAIAAgBkHgAGxqIAIgACAGQeAAbGoQwgELQQAhBQJAA0AgBSAGRg0BIAAgBUHgAGxqIQMgACABQQFrIAVrQeAAbGohBCAEIAJB6JwBEMIBIAMgAiAEEMIBQeicASADEEQgBUEBaiEFDAALCwsXACABQcidARAuIABByJ0BQSAgAhDAAQtGACAAQf8BcS0AqKwBQRh0IABBCHZB/wFxLQCorAFBEHRqIABBEHZB/wFxLQCorAFBCHQgAEEYdkH/AXEtAKisAWpqIAF3C20FAX8BfwF/AX8Bf0EBIAF0IQJBACEDAkADQCADIAJGDQEgACADQcABbGohBSADIAEQzgEhBCAAIARBwAFsaiEGIAMgBEkEQCAFQaiuARCYASAGIAUQmAFBqK4BIAYQmAELIANBAWohAwwACwsL5wEHAX8BfwF/AX8BfwF/AX8gAkUgAxAlcQRADwtBASABdCEEIARBAWshCEEBIQcgBEEBdiEFAkADQCAHIAVGDQEgACAHQcABbGohCSAAIAQgB2tBwAFsaiEKIAIEQCADECUEQCAJQeivARCYASAKIAkQmAFB6K8BIAoQmAEFIAlB6K8BEJgBIAogAyAJEM0BQeivASADIAoQzQELBSADECUEQAUgCSADIAkQzQEgCiADIAoQzQELCyAHQQFqIQcMAAsLIAMQJQRABSAAIAMgABDNASAAIAVBwAFsaiEKIAogAyAKEM0BCwvwAQkBfwF/AX8BfwF/AX8BfwF/AX8gACABEM8BQQEgAXQhCUEBIQQCQANAIAQgAUsNAUEBIAR0IQdB6J0BIARBIGxqIQpBACEFAkADQCAFIAlPDQFBqLEBEDIgB0EBdiEIQQAhBgJAA0AgBiAITw0BIAAgBSAGakHAAWxqIQsgCyAIQcABbGohDCAMQaixAUHIsQEQzQEgC0GIswEQmAFBiLMBQcixASALEKEBQYizAUHIsQEgDBCmAUGosQEgCkGosQEQKiAGQQFqIQYMAAsLIAUgB2ohBQwACwsgBEEBaiEEDAALCyAAIAEgAiADENABC0MCAX8BfyAAQQF2IQJBACEBAkADQCACRQ0BIAJBAXYhAiABQQFqIQEMAAsLIABBASABdEcEQAALIAFBHEsEQAALIAELHgEBfyABENIBIQJByLQBEDIgACACQQBByLQBENEBCyQCAX8BfyABENIBIQJBiKUBIAJBIGxqIQMgACACQQEgAxDRAQt8AwF/AX8BfyADQei0ARAAQQAhBwJAA0AgByACRg0BIAAgB0HAAWxqIQUgASAHQcABbGohBiAGQei0AUGItQEQzQEgBUHItgEQmAFByLYBQYi1ASAFEKEBQci2AUGItQEgBhCmAUHotAEgBEHotAEQKiAHQQFqIQcMAAsLC8sBCQF/AX8BfwF/AX8BfwF/AX8Bf0EBIAJ0IQQgBEEBdiEFIAEgAnYhAyAFQcABbCEGQeidASACQSBsaiELQQAhCQJAA0AgCSADRg0BQYi4ARAyQQAhCgJAA0AgCiAFRg0BIAAgCSAEbCAKakHAAWxqIQcgByAGaiEIIAhBiLgBQai4ARDNASAHQei5ARCYAUHouQFBqLgBIAcQoQFB6LkBQai4ASAIEKYBQYi4ASALQYi4ARAqIApBAWohCgwACwsgCUEBaiEJDAALCwuDAQQBfwF/AX8BfyABQQF2IQYgAUEBRgRAIAAgBkHAAWxqIAIgACAGQcABbGoQzQELQQAhBQJAA0AgBSAGRg0BIAAgBUHAAWxqIQMgACABQQFrIAVrQcABbGohBCAEIAJBqLsBEM0BIAMgAiAEEM0BQai7ASADEJgBIAVBAWohBQwACwsLFgAgAUHovAEQLiAAQei8AUEgIAIQbQsXACABQYi9ARAuIABBiL0BQSAgAhDBAQtYBAF/AX8BfwF/IAAhByAEIQggAkGovQEQAEEAIQYCQANAIAYgAUYNASAHQai9ASAIECogB0EgaiEHIAhBIGohCEGovQEgA0GovQEQKiAGQQFqIQYMAAsLC1sEAX8BfwF/AX8gACEHIAQhCCACQci9ARAAQQAhBgJAA0AgBiABRg0BIAdByL0BIAgQwgEgB0HgAGohByAIQeAAaiEIQci9ASADQci9ARAqIAZBAWohBgwACwsLWwQBfwF/AX8BfyAAIQcgBCEIIAJB6L0BEABBACEGAkADQCAGIAFGDQEgB0HovQEgCBDYASAHQcAAaiEHIAhB4ABqIQhB6L0BIANB6L0BECogBkEBaiEGDAALCwtbBAF/AX8BfwF/IAAhByAEIQggAkGIvgEQAEEAIQYCQANAIAYgAUYNASAHQYi+ASAIEM0BIAdBwAFqIQcgCEHAAWohCEGIvgEgA0GIvgEQKiAGQQFqIQYMAAsLC1sEAX8BfwF/AX8gACEHIAQhCCACQai+ARAAQQAhBgJAA0AgBiABRg0BIAdBqL4BIAgQ2QEgB0GAAWohByAIQcABaiEIQai+ASADQai+ARAqIAZBAWohBgwACwsLDQBBiMYBIAAgARCBAQsYACAAEHwgAEHAAGoQfHEgAEGAAWoQfHELGQAgABB9IABBwABqEHxxIABBgAFqEHxxDwsWACAAEH4gAEHAAGoQfiAAQYABahB+CxYAIAAQfyAAQcAAahB+IABBgAFqEH4LJwAgACABEIABIABBwABqIAFBwABqEIABIABBgAFqIAFBgAFqEIABC+UCACAAIAFByMcBEIEBIABBwABqIAFBwABqQYjIARCBASAAQYABaiABQYABakHIyAEQgQEgACAAQcAAakGIyQEQhAEgASABQcAAakHIyQEQhAEgACAAQYABakGIygEQhAEgASABQYABakHIygEQhAEgAEHAAGogAEGAAWpBiMsBEIQBIAFBwABqIAFBgAFqQcjLARCEAUHIxwFBiMgBQYjMARCEAUHIxwFByMgBQcjMARCEAUGIyAFByMgBQYjNARCEAUGIywFByMsBIAIQgQEgAkGIzQEgAhCFASACIAIQ3wFByMcBIAIgAhCEAUGIyQFByMkBIAJBwABqEIEBIAJBwABqQYjMASACQcAAahCFAUHIyAFByM0BEN8BIAJBwABqQcjNASACQcAAahCEAUGIygFByMoBIAJBgAFqEIEBIAJBgAFqQcjMASACQYABahCFASACQYABakGIyAEgAkGAAWoQhAELgQIAIABBiM4BEIMBIAAgAEHAAGpByM4BEIEBQcjOAUHIzgFBiM8BEIQBIAAgAEHAAGpByM8BEIUBQcjPASAAQYABakHIzwEQhAFByM8BQcjPARCDASAAQcAAaiAAQYABakGI0AEQgQFBiNABQYjQAUHI0AEQhAEgAEGAAWpBiNEBEIMBQcjQASABEN8BQYjOASABIAEQhAFBiNEBIAFBwABqEN8BQYjPASABQcAAaiABQcAAahCEAUGIzgFBiNEBIAFBgAFqEIQBQcjQASABQYABaiABQYABahCFAUHIzwEgAUGAAWogAUGAAWoQhAFBiM8BIAFBgAFqIAFBgAFqEIQBCzUAIAAgASACEIQBIABBwABqIAFBwABqIAJBwABqEIQBIABBgAFqIAFBgAFqIAJBgAFqEIQBCzUAIAAgASACEIUBIABBwABqIAFBwABqIAJBwABqEIUBIABBgAFqIAFBgAFqIAJBgAFqEIUBCycAIAAgARCGASAAQcAAaiABQcAAahCGASAAQYABaiABQYABahCGAQswAQF/IABBgAFqEI0BIQEgAQRAIAEPCyAAQcAAahCNASEBIAEEQCABDwsgABCNAQ8LJwAgACABEIgBIABBwABqIAFBwABqEIgBIABBgAFqIAFBgAFqEIgBCycAIAAgARCJASAAQcAAaiABQcAAahCJASAAQYABaiABQYABahCJAQspACAAIAEQigEgAEHAAGogAUHAAGoQigFxIABBgAFqIAFBgAFqEIoBcQurAgAgAEHI0QEQgwEgAEHAAGpBiNIBEIMBIABBgAFqQcjSARCDASAAIABBwABqQYjTARCBASAAIABBgAFqQcjTARCBASAAQcAAaiAAQYABakGI1AEQgQFBiNQBQcjUARDfAUHI0QFByNQBQcjUARCFAUHI0gFBiNUBEN8BQYjVAUGI0wFBiNUBEIUBQYjSAUHI0wFByNUBEIUBIABBgAFqQYjVAUGI1gEQgQEgAEHAAGpByNUBQcjWARCBAUGI1gFByNYBQYjWARCEAUGI1gFBiNYBEN8BIABByNQBQcjWARCBAUHI1gFBiNYBQYjWARCEAUGI1gFBiNYBEIsBQYjWAUHI1AEgARCBAUGI1gFBiNUBIAFBwABqEIEBQYjWAUHI1QEgAUGAAWoQgQELMwAgACABIAIgAxCMASAAQcAAaiABIAIgA0HAAGoQjAEgAEGAAWogASACIANBgAFqEIwBCzMAIABBgAFqEHwEQCAAQcAAahB8BEAgABCOAQ8FIABBwABqEI4BDwsLIABBgAFqEI4BDwuPAgQBfwF/AX8Bf0EAKAIAIQVBACAFIAJBAWpBwAFsajYCACAFEOMBIAAhBiAFQcABaiEFQQAhCAJAA0AgCCACRg0BIAYQ4AEEQCAFQcABayAFEOQBBSAGIAVBwAFrIAUQ5QELIAYgAWohBiAFQcABaiEFIAhBAWohCAwACwsgBiABayEGIAVBwAFrIQUgAyACQQFrIARsaiEHIAUgBRDuAQJAA0AgCEUNASAGEOABBEAgBSAFQcABaxDkASAHEOIBBSAFQcABa0GI1wEQ5AEgBSAGIAVBwAFrEOUBIAVBiNcBIAcQ5QELIAYgAWshBiAHIARrIQcgBUHAAWshBSAIQQFrIQgMAAsLQQAgBTYCAAvOAgIBfwF/IAJFBEAgAxDjAQ8LIABByNgBEOQBIAMQ4wEgAiEEAkADQCAEQQFrIQQgASAEai0AACEFIAMgAxDmASAFQYABTwRAIAVBgAFrIQUgA0HI2AEgAxDlAQsgAyADEOYBIAVBwABPBEAgBUHAAGshBSADQcjYASADEOUBCyADIAMQ5gEgBUEgTwRAIAVBIGshBSADQcjYASADEOUBCyADIAMQ5gEgBUEQTwRAIAVBEGshBSADQcjYASADEOUBCyADIAMQ5gEgBUEITwRAIAVBCGshBSADQcjYASADEOUBCyADIAMQ5gEgBUEETwRAIAVBBGshBSADQcjYASADEOUBCyADIAMQ5gEgBUECTwRAIAVBAmshBSADQcjYASADEOUBCyADIAMQ5gEgBUEBTwRAIAVBAWshBSADQcjYASADEOUBCyAERQ0BDAALCwsrAEGIxgEgAEGAAWogARCBASAAIAFBwABqEIABIABBwABqIAFBgAFqEIABCxEAIAAQ4AEgAEHAAWoQ4AFxCxIAIAAQ4QEgAEHAAWoQ4AFxDwsQACAAEOIBIABBwAFqEOIBCxAAIAAQ4wEgAEHAAWoQ4gELGAAgACABEOQBIABBwAFqIAFBwAFqEOQBC4UBACAAIAFBiNoBEOUBIABBwAFqIAFBwAFqQcjbARDlASAAIABBwAFqQYjdARDnASABIAFBwAFqQcjeARDnAUGI3QFByN4BQYjdARDlAUHI2wEgAhDzAUGI2gEgAiACEOcBQYjaAUHI2wEgAkHAAWoQ5wFBiN0BIAJBwAFqIAJBwAFqEOgBCxwAIAAgASACEOUBIABBwAFqIAEgAkHAAWoQ5QELfQAgACAAQcABakGI4AEQ5QEgACAAQcABakHI4QEQ5wEgAEHAAWpBiOMBEPMBIABBiOMBQYjjARDnAUGI4AFByOQBEPMBQcjkAUGI4AFByOQBEOcBQcjhAUGI4wEgARDlASABQcjkASABEOgBQYjgAUGI4AEgAUHAAWoQ5wELIAAgACABIAIQ5wEgAEHAAWogAUHAAWogAkHAAWoQ5wELIAAgACABIAIQ6AEgAEHAAWogAUHAAWogAkHAAWoQ6AELGAAgACABEOkBIABBwAFqIAFBwAFqEOkBCxgAIAAgARDkASAAQcABaiABQcABahDpAQsYACAAIAEQ6wEgAEHAAWogAUHAAWoQ6wELGAAgACABEOwBIABBwAFqIAFBwAFqEOwBCxkAIAAgARDtASAAQcABaiABQcABahDtAXELagAgAEGI5gEQ5gEgAEHAAWpByOcBEOYBQcjnAUGI6QEQ8wFBiOYBQYjpAUGI6QEQ6AFBiOkBQcjqARDuASAAQcjqASABEOUBIABBwAFqQcjqASABQcABahDlASABQcABaiABQcABahDpAQsgACAAIAEgAiADEO8BIABBwAFqIAEgAiADQcABahDvAQsdAQF/IABBwAFqEOoBIQEgAQRAIAEPCyAAEOoBDwseACAAQcABahDgAQRAIAAQ8AEPCyAAQcABahDwAQ8LjwIEAX8BfwF/AX9BACgCACEFQQAgBSACQQFqQYADbGo2AgAgBRD3ASAAIQYgBUGAA2ohBUEAIQgCQANAIAggAkYNASAGEPQBBEAgBUGAA2sgBRD4AQUgBiAFQYADayAFEPkBCyAGIAFqIQYgBUGAA2ohBSAIQQFqIQgMAAsLIAYgAWshBiAFQYADayEFIAMgAkEBayAEbGohByAFIAUQgwICQANAIAhFDQEgBhD0AQRAIAUgBUGAA2sQ+AEgBxD2AQUgBUGAA2tBiOwBEPgBIAUgBiAFQYADaxD5ASAFQYjsASAHEPkBCyAGIAFrIQYgByAEayEHIAVBgANrIQUgCEEBayEIDAALC0EAIAU2AgALzgICAX8BfyACRQRAIAMQ9wEPCyAAQYjvARD4ASADEPcBIAIhBAJAA0AgBEEBayEEIAEgBGotAAAhBSADIAMQ+wEgBUGAAU8EQCAFQYABayEFIANBiO8BIAMQ+QELIAMgAxD7ASAFQcAATwRAIAVBwABrIQUgA0GI7wEgAxD5AQsgAyADEPsBIAVBIE8EQCAFQSBrIQUgA0GI7wEgAxD5AQsgAyADEPsBIAVBEE8EQCAFQRBrIQUgA0GI7wEgAxD5AQsgAyADEPsBIAVBCE8EQCAFQQhrIQUgA0GI7wEgAxD5AQsgAyADEPsBIAVBBE8EQCAFQQRrIQUgA0GI7wEgAxD5AQsgAyADEPsBIAVBAk8EQCAFQQJrIQUgA0GI7wEgAxD5AQsgAyADEPsBIAVBAU8EQCAFQQFrIQUgA0GI7wEgAxD5AQsgBEUNAQwACwsL0QEAQYj+ARD3AUGI/gFBiP4BEP4BIABBiPIBQcABQYj1ARCIAkGI9QFBiPgBEPsBIABBiPgBQYj4ARD5AUGI+AFBiPsBEP8BQYj7AUGI+AFBiPsBEPkBQYj7AUGI/gEQggIEQAALQYj1ASAAQYiBAhD5AUGI+AFBiP4BEIICBEBBiP4BEOIBQcj/ARDjAUGI/gFBiIECIAEQ+QEFQYiEAhD3AUGIhAJBiPgBQYiEAhD8AUGIhAJByPMBQcABQYiEAhCIAkGIhAJBiIECIAEQ+QELC2oAQciRAhD3AUHIkQJByJECEP4BIABBiIcCQcABQciIAhCIAkHIiAJByIsCEPsBIABByIsCQciLAhD5AUHIiwJByI4CEP8BQciOAkHIiwJByI4CEPkBQciOAkHIkQIQggIEQEEADwtBAQ8L4wIAIAAgAUGAAWogAkHAAGoQgQEgASACQcAAaiACQcAAahCFASAAQcAAaiABQYABakGQsQMQgQEgAUHAAGpBkLEDQZCxAxCFASACQcAAakHQsQMQgwFBkLEDQZCyAxCDASACQcAAakHQsQNB0LIDEIEBIAFB0LEDQZCzAxCBAUGQswNBkLMDQZC0AxCEASABQYABakGQsgNB0LMDEIEBQdCyA0HQswNB0LMDEIQBQdCzA0GQtANB0LMDEIUBIAJBwABqQdCzAyABEIEBQdCyAyABQcAAaiABQcAAahCBAUGQswNB0LMDQZC0AxCFAUGQsQNBkLQDQZC0AxCBAUGQtAMgAUHAAGogAUHAAGoQhQEgAUGAAWpB0LIDIAFBgAFqEIEBIAJBwABqIABBwABqQZC0AxCBAUGQsQMgACACEIEBIAJBkLQDIAIQhQEgAkGIxgEgAhCBAUGQsQMgAkGAAWoQhgELqwMAIABBwABqQcjGAUHQtAMQgQEgAEHQtANB0LQDEIEBIABBwABqQZC1AxCDASAAQYABakHQtQMQgwFB0LUDQdC1A0GQtgMQhAFBkLYDQdC1A0GQtgMQhAFBiMcBQZC2A0HQtgMQgQFB0LYDQdC2A0GQtwMQhAFB0LYDQZC3A0GQtwMQhAFBkLUDQZC3A0HQtwMQhAFB0LcDQcjGAUHQtwMQgQFBkLUDQdC1A0GQugMQhAEgAEHAAGogAEGAAWpBkLgDEIQBQZC4A0GQuAMQgwFBkLgDQZC6A0GQuAMQhQFB0LYDQZC1A0HQuAMQhQEgAEGQuQMQgwFB0LYDQdC5AxCDAUGQtQNBkLcDQZC6AxCFAUHQtANBkLoDIAAQgQFB0LkDQdC5A0GQugMQhAFB0LkDQZC6A0GQugMQhAFB0LcDIABBwABqEIMBIABBwABqQZC6AyAAQcAAahCFAUGQtQNBkLgDIABBgAFqEIEBQYjGAUHQuAMgARCBAUGQuAMgAUHAAGoQhgFBkLkDQZC5AyABQYABahCEAUGQuQMgAUGAAWogAUGAAWoQhAELCAAgACABEFkLRQAgACABEIcBQdC6AyABIAEQgQEgAEHAAGogAUHAAGoQhwFBkLsDIAFBwABqIAFBwABqEIEBIABBgAFqIAFBgAFqEIcBC8wBAgF/AX8gACABQQBqEK0BIAFBAGpB0LsDEIABIAFBwABqQZC8AxCAAUHQvAMQfyABQcABaiECQT8hAwJAA0BB0LsDIAIQjAIgAkHAAWohAiADLADIlAIEQCABQQBqQdC7AyACEIsCIAJBwAFqIQILIANFDQEgA0EBayEDDAALCyABQQBqQZC9AxCOAkGQvQNB0L4DEI4CQZC/A0GQvwMQhgFBkL0DQdC7AyACEIsCIAJBwAFqIQJB0L4DQdC7AyACEIsCIAJBwAFqIQILsAUAIAMgAEGQwwMQgQEgA0GAAWogAkHQwwMQgQEgA0GAAmogAUGQxAMQgQEgAyADQYACakGQwQMQhAEgAyADQYABakHQwAMQhAEgA0HAAGogA0HAAWpB0MEDEIQBQdDBAyADQcACakHQwQMQhAEgA0HAAGogAkHQxAMQgQFB0MQDQZDEA0GQwgMQhAFBiMYBQZDCA0HQwgMQgQFB0MIDQZDDAyADEIQBIANBwAJqIAFBkMIDEIEBQdDEA0GQwgNB0MQDEIQBQZDCA0HQwwNBkMIDEIQBQYjGAUGQwgNB0MIDEIEBIANBwABqIABBkMIDEIEBQdDEA0GQwgNB0MQDEIQBQdDCA0GQwgMgA0HAAGoQhAEgACACQZDAAxCEAUHQwANBkMADQZDCAxCBAUGQwwNB0MMDQZDFAxCEAUGQwgNBkMUDQZDCAxCFASADQcABaiABQdDCAxCBAUHQxANB0MIDQdDEAxCEASADQYABaiADQYACakGQwAMQhAFBkMIDQdDCAyADQYABahCEASACIAFB0MADEIQBQdDAA0GQwANBkMIDEIEBQdDDA0GQxANBkMUDEIQBQZDCA0GQxQNBkMIDEIUBQYjGAUGQwgNB0MIDEIEBIANBwAFqIABBkMIDEIEBQdDEA0GQwgNB0MQDEIQBQdDCA0GQwgMgA0HAAWoQhAEgA0HAAmogAkGQwgMQgQFB0MQDQZDCA0HQxAMQhAFBiMYBQZDCA0HQwgMQgQEgACABQZDAAxCEAUGQwQNBkMADQZDCAxCBAUGQwwNBkMQDQZDFAxCEAUGQwgNBkMUDQZDCAxCFAUHQwgNBkMIDIANBgAJqEIQBIAAgAkGQwAMQhAFBkMADIAFBkMADEIQBQdDBA0GQwANBkMIDEIEBQZDCA0HQxAMgA0HAAmoQhQELOgAgAEHQxQMQgAFBkMYDEH4gAkHQxgMQgAFBkMcDEH4gAUHQxwMQgAFBkMgDEH5B0MUDIAMgAxD5AQucAgIBfwF/IAIQ9wEgAUHAAWohA0E/IQQCQANAIAIgAhD7ASADQcAAaiAAQSBqQdDIAxCCASADQYABaiAAQZDJAxCCASADQdDIA0GQyQMgAhCQAiADQcABaiEDIAQsAMiUAgRAIANBwABqIABBIGpB0MgDEIIBIANBgAFqIABBkMkDEIIBIANB0MgDQZDJAyACEJACIANBwAFqIQMLIARFDQEgBEEBayEEDAALCyADQcAAaiAAQSBqQdDIAxCCASADQYABaiAAQZDJAxCCASADQdDIA0GQyQMgAhCQAiADQcABaiEDIANBwABqIABBIGpB0MgDEIIBIANBgAFqIABBkMkDEIIBIANB0MgDQZDJAyACEJACIANBwAFqIQMLbAAgAEHQyQMgARCBASAAQcAAakGQygMgAUHAAGoQgQEgAEGAAWpB0MoDIAFBgAFqEIEBIABBwAFqQZDLAyABQcABahCBASAAQYACakHQywMgAUGAAmoQgQEgAEHAAmpBkMwDIAFBwAJqEIEBC4oCACAAIAEQACAAQSBqIAFBIGoQEiABQdDMAyABEIEBIABBwABqIAFBwABqEAAgAEHgAGogAUHgAGoQEiABQcAAakGQzQMgAUHAAGoQgQEgAEGAAWogAUGAAWoQACAAQaABaiABQaABahASIAFBgAFqQdDNAyABQYABahCBASAAQcABaiABQcABahAAIABB4AFqIAFB4AFqEBIgAUHAAWpBkM4DIAFBwAFqEIEBIABBgAJqIAFBgAJqEAAgAEGgAmogAUGgAmoQEiABQYACakHQzgMgAUGAAmoQgQEgAEHAAmogAUHAAmoQACAAQeACaiABQeACahASIAFBwAJqQZDPAyABQcACahCBAQtsACAAQdDPAyABEIEBIABBwABqQZDQAyABQcAAahCBASAAQYABakHQ0AMgAUGAAWoQgQEgAEHAAWpBkNEDIAFBwAFqEIEBIABBgAJqQdDRAyABQYACahCBASAAQcACakGQ0gMgAUHAAmoQgQELigIAIAAgARAAIABBIGogAUEgahASIAFB0NIDIAEQgQEgAEHAAGogAUHAAGoQACAAQeAAaiABQeAAahASIAFBwABqQZDTAyABQcAAahCBASAAQYABaiABQYABahAAIABBoAFqIAFBoAFqEBIgAUGAAWpB0NMDIAFBgAFqEIEBIABBwAFqIAFBwAFqEAAgAEHgAWogAUHgAWoQEiABQcABakGQ1AMgAUHAAWoQgQEgAEGAAmogAUGAAmoQACAAQaACaiABQaACahASIAFBgAJqQdDUAyABQYACahCBASAAQcACaiABQcACahAAIABB4AJqIAFB4AJqEBIgAUHAAmpBkNUDIAFBwAJqEIEBC2wAIABB0NUDIAEQgQEgAEHAAGpBkNYDIAFBwABqEIEBIABBgAFqQdDWAyABQYABahCBASAAQcABakGQ1wMgAUHAAWoQgQEgAEGAAmpB0NcDIAFBgAJqEIEBIABBwAJqQZDYAyABQcACahCBAQuKAgAgACABEAAgAEEgaiABQSBqEBIgAUHQ2AMgARCBASAAQcAAaiABQcAAahAAIABB4ABqIAFB4ABqEBIgAUHAAGpBkNkDIAFBwABqEIEBIABBgAFqIAFBgAFqEAAgAEGgAWogAUGgAWoQEiABQYABakHQ2QMgAUGAAWoQgQEgAEHAAWogAUHAAWoQACAAQeABaiABQeABahASIAFBwAFqQZDaAyABQcABahCBASAAQYACaiABQYACahAAIABBoAJqIAFBoAJqEBIgAUGAAmpB0NoDIAFBgAJqEIEBIABBwAJqIAFBwAJqEAAgAEHgAmogAUHgAmoQEiABQcACakGQ2wMgAUHAAmoQgQELbAAgAEHQ2wMgARCBASAAQcAAakGQ3AMgAUHAAGoQgQEgAEGAAWpB0NwDIAFBgAFqEIEBIABBwAFqQZDdAyABQcABahCBASAAQYACakHQ3QMgAUGAAmoQgQEgAEHAAmpBkN4DIAFBwAJqEIEBC4oCACAAIAEQACAAQSBqIAFBIGoQEiABQdDeAyABEIEBIABBwABqIAFBwABqEAAgAEHgAGogAUHgAGoQEiABQcAA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";
            var pq = 520;
            var pr = 1864;
            var pG1gen = 24392;
            var pG1zero = 24488;
            var pG1b = 3240;
            var pG2gen = 24584;
            var pG2zero = 24776;
            var pG2b = 10440;
            var pOneT = 24968;
            var prePSize = 192;
            var preQSize = 19776;
            var n8q = 32;
            var n8r = 32;
            var q = "21888242871839275222246405745257275088696311157297823662689037894645226208583";
            var r = "21888242871839275222246405745257275088548364400416034343698204186575808495617";

var bn128_wasm = {
	code: code,
	pq: pq,
	pr: pr,
	pG1gen: pG1gen,
	pG1zero: pG1zero,
	pG1b: pG1b,
	pG2gen: pG2gen,
	pG2zero: pG2zero,
	pG2b: pG2b,
	pOneT: pOneT,
	prePSize: prePSize,
	preQSize: preQSize,
	n8q: n8q,
	n8r: n8r,
	q: q,
	r: r
};

var code$1 = "AGFzbQEAAAABiQERYAJ/fwBgAX8AYAF/AX9gAn9/AX9gA39/fwF/YAN/f38AYAN/fn8AYAJ/fgBgBH9/f38AYAV/f39/fwBgBH9/f38Bf2AHf39/f39/fwBgCH9/f39/f39/AGAFf39/f38Bf2AHf39/f39/fwF/YAl/f39/f39/f38Bf2ALf39/f39/f39/f38BfwIQAQNlbnYGbWVtb3J5AgDoBwO5ArcCAAECAQMDBAQFAAAGBwgFAgUFAAAFAAAAAAICAAEFCAkFBQgAAgABAgEDAwQEBQAABgcIBQIFBQAABQAAAAACAgABBQgJBQUIAAIFAAACAgIBAQAAAAMDAwAABQUFAAAFBQUAAAAAAAUABQAAAAAFBQUFBQoACwkKAAsJCAgDAAgIAgAACQUFAAgMCQICAQEABQUABQUAAAAAAwAIAgIJCAACAgIBAQAAAAMDAwAABQUFAAAFBQUAAAAAAAUABQAAAAAFBQUFBQoACwkKAAsJCAgFAwAICAIAAAkFBQUDAAgIAgAACQUFBQUJCQkJCQACAgEBAAUABQUAAgAAAwAIAgkIAAICAQEABQUABQUAAAAAAwAIAgIJCAACBQgJBQAAAAAAAAAAAAAFAAAABQAAAAAEDQ4PEAUHviSoAglpbnRxX2NvcHkAAAlpbnRxX3plcm8AAQhpbnRxX29uZQADC2ludHFfaXNaZXJvAAIHaW50cV9lcQAECGludHFfZ3RlAAUIaW50cV9hZGQABghpbnRxX3N1YgAHCGludHFfbXVsAAgLaW50cV9zcXVhcmUACQ5pbnRxX3NxdWFyZU9sZAAKCGludHFfZGl2AA0PaW50cV9pbnZlcnNlTW9kAA4IZjFtX2NvcHkAAAhmMW1femVybwABCmYxbV9pc1plcm8AAgZmMW1fZXEABAdmMW1fYWRkABAHZjFtX3N1YgARB2YxbV9uZWcAEg5mMW1faXNOZWdhdGl2ZQAZCWYxbV9pc09uZQAPCGYxbV9zaWduABoLZjFtX21SZWR1Y3QAEwdmMW1fbXVsABQKZjFtX3NxdWFyZQAVDWYxbV9zcXVhcmVPbGQAFhJmMW1fZnJvbU1vbnRnb21lcnkAGBBmMW1fdG9Nb250Z29tZXJ5ABcLZjFtX2ludmVyc2UAGwdmMW1fb25lABwIZjFtX2xvYWQAHQ9mMW1fdGltZXNTY2FsYXIAHgdmMW1fZXhwACIQZjFtX2JhdGNoSW52ZXJzZQAfCGYxbV9zcXJ0ACMMZjFtX2lzU3F1YXJlACQVZjFtX2JhdGNoVG9Nb250Z29tZXJ5ACAXZjFtX2JhdGNoRnJvbU1vbnRnb21lcnkAIQlpbnRyX2NvcHkAJQlpbnRyX3plcm8AJghpbnRyX29uZQAoC2ludHJfaXNaZXJvACcHaW50cl9lcQApCGludHJfZ3RlACoIaW50cl9hZGQAKwhpbnRyX3N1YgAsCGludHJfbXVsAC0LaW50cl9zcXVhcmUALg5pbnRyX3NxdWFyZU9sZAAvCGludHJfZGl2ADIPaW50cl9pbnZlcnNlTW9kADMIZnJtX2NvcHkAJQhmcm1femVybwAmCmZybV9pc1plcm8AJwZmcm1fZXEAKQdmcm1fYWRkADUHZnJtX3N1YgA2B2ZybV9uZWcANw5mcm1faXNOZWdhdGl2ZQA+CWZybV9pc09uZQA0CGZybV9zaWduAD8LZnJtX21SZWR1Y3QAOAdmcm1fbXVsADkKZnJtX3NxdWFyZQA6DWZybV9zcXVhcmVPbGQAOxJmcm1fZnJvbU1vbnRnb21lcnkAPRBmcm1fdG9Nb250Z29tZXJ5ADwLZnJtX2ludmVyc2UAQAdmcm1fb25lAEEIZnJtX2xvYWQAQg9mcm1fdGltZXNTY2FsYXIAQwdmcm1fZXhwAEcQZnJtX2JhdGNoSW52ZXJzZQBECGZybV9zcXJ0AEgMZnJtX2lzU3F1YXJlAEkVZnJtX2JhdGNoVG9Nb250Z29tZXJ5AEUXZnJtX2JhdGNoRnJvbU1vbnRnb21lcnkARgZmcl9hZGQANQZmcl9zdWIANgZmcl9uZWcANwZmcl9tdWwASglmcl9zcXVhcmUASwpmcl9pbnZlcnNlAEwNZnJfaXNOZWdhdGl2ZQBNB2ZyX2NvcHkAJQdmcl96ZXJvACYGZnJfb25lAEEJZnJfaXNaZXJvACcFZnJfZXEAKQxnMW1fbXVsdGlleHAAdhJnMW1fbXVsdGlleHBfY2h1bmsAdRJnMW1fbXVsdGlleHBBZmZpbmUAehhnMW1fbXVsdGlleHBBZmZpbmVfY2h1bmsAeQpnMW1faXNaZXJvAE8QZzFtX2lzWmVyb0FmZmluZQBOBmcxbV9lcQBXC2cxbV9lcU1peGVkAFYMZzFtX2VxQWZmaW5lAFUIZzFtX2NvcHkAUw5nMW1fY29weUFmZmluZQBSCGcxbV96ZXJvAFEOZzFtX3plcm9BZmZpbmUAUApnMW1fZG91YmxlAFkQZzFtX2RvdWJsZUFmZmluZQBYB2cxbV9hZGQAXAxnMW1fYWRkTWl4ZWQAWw1nMW1fYWRkQWZmaW5lAFoHZzFtX25lZwBeDWcxbV9uZWdBZmZpbmUAXQdnMW1fc3ViAGEMZzFtX3N1Yk1peGVkAGANZzFtX3N1YkFmZmluZQBfEmcxbV9mcm9tTW9udGdvbWVyeQBjGGcxbV9mcm9tTW9udGdvbWVyeUFmZmluZQBiEGcxbV90b01vbnRnb21lcnkAZRZnMW1fdG9Nb250Z29tZXJ5QWZmaW5lAGQPZzFtX3RpbWVzU2NhbGFyAHsVZzFtX3RpbWVzU2NhbGFyQWZmaW5lAHwNZzFtX25vcm1hbGl6ZQBoCmcxbV9MRU10b1UAagpnMW1fTEVNdG9DAGsKZzFtX1V0b0xFTQBsCmcxbV9DdG9MRU0AbQ9nMW1fYmF0Y2hMRU10b1UAbg9nMW1fYmF0Y2hMRU10b0MAbw9nMW1fYmF0Y2hVdG9MRU0AcA9nMW1fYmF0Y2hDdG9MRU0AcQxnMW1fdG9BZmZpbmUAZg5nMW1fdG9KYWNvYmlhbgBUEWcxbV9iYXRjaFRvQWZmaW5lAGcTZzFtX2JhdGNoVG9KYWNvYmlhbgByB2ZybV9mZnQAggEIZnJtX2lmZnQAgwEKZnJtX3Jhd2ZmdACAAQtmcm1fZmZ0Sm9pbgCEAQpmcm1fZmZ0TWl4AIUBDGZybV9mZnRGaW5hbACGAQhwb2xfemVybwCHAQ9wb2xfY29uc3RydWN0TEMAiAEMcWFwX2J1aWxkQUJDAIkBC3FhcF9qb2luQUJDAIoBCmYybV9pc1plcm8AiwEJZjJtX2lzT25lAIwBCGYybV96ZXJvAI0BB2YybV9vbmUAjgEIZjJtX2NvcHkAjwEHZjJtX211bACQAQhmMm1fbXVsMQCRAQpmMm1fc3F1YXJlAJIBB2YybV9hZGQAkwEHZjJtX3N1YgCUAQdmMm1fbmVnAJUBCGYybV9zaWduAJwBDWYybV9jb25qdWdhdGUAlgESZjJtX2Zyb21Nb250Z29tZXJ5AJgBEGYybV90b01vbnRnb21lcnkAlwEGZjJtX2VxAJkBC2YybV9pbnZlcnNlAJoBB2YybV9leHAAnwEPZjJtX3RpbWVzU2NhbGFyAJsBEGYybV9iYXRjaEludmVyc2UAngEIZjJtX3NxcnQAoAEMZjJtX2lzU3F1YXJlAKEBDmYybV9pc05lZ2F0aXZlAJ0BDGcybV9tdWx0aWV4cADKARJnMm1fbXVsdGlleHBfY2h1bmsAyQESZzJtX211bHRpZXhwQWZmaW5lAM4BGGcybV9tdWx0aWV4cEFmZmluZV9jaHVuawDNAQpnMm1faXNaZXJvAKMBEGcybV9pc1plcm9BZmZpbmUAogEGZzJtX2VxAKsBC2cybV9lcU1peGVkAKoBDGcybV9lcUFmZmluZQCpAQhnMm1fY29weQCnAQ5nMm1fY29weUFmZmluZQCmAQhnMm1femVybwClAQ5nMm1femVyb0FmZmluZQCkAQpnMm1fZG91YmxlAK0BEGcybV9kb3VibGVBZmZpbmUArAEHZzJtX2FkZACwAQxnMm1fYWRkTWl4ZWQArwENZzJtX2FkZEFmZmluZQCuAQdnMm1fbmVnALIBDWcybV9uZWdBZmZpbmUAsQEHZzJtX3N1YgC1AQxnMm1fc3ViTWl4ZWQAtAENZzJtX3N1YkFmZmluZQCzARJnMm1fZnJvbU1vbnRnb21lcnkAtwEYZzJtX2Zyb21Nb250Z29tZXJ5QWZmaW5lALYBEGcybV90b01vbnRnb21lcnkAuQEWZzJtX3RvTW9udGdvbWVyeUFmZmluZQC4AQ9nMm1fdGltZXNTY2FsYXIAzwEVZzJtX3RpbWVzU2NhbGFyQWZmaW5lANABDWcybV9ub3JtYWxpemUAvAEKZzJtX0xFTXRvVQC+AQpnMm1fTEVNdG9DAL8BCmcybV9VdG9MRU0AwAEKZzJtX0N0b0xFTQDBAQ9nMm1fYmF0Y2hMRU10b1UAwgEPZzJtX2JhdGNoTEVNdG9DAMMBD2cybV9iYXRjaFV0b0xFTQDEAQ9nMm1fYmF0Y2hDdG9MRU0AxQEMZzJtX3RvQWZmaW5lALoBDmcybV90b0phY29iaWFuAKgBEWcybV9iYXRjaFRvQWZmaW5lALsBE2cybV9iYXRjaFRvSmFjb2JpYW4AxgELZzFtX3RpbWVzRnIA0QEHZzFtX2ZmdADXAQhnMW1faWZmdADYAQpnMW1fcmF3ZmZ0ANUBC2cxbV9mZnRKb2luANkBCmcxbV9mZnRNaXgA2gEMZzFtX2ZmdEZpbmFsANsBC2cybV90aW1lc0ZyANwBB2cybV9mZnQA4gEIZzJtX2lmZnQA4wEKZzJtX3Jhd2ZmdADgAQtnMm1fZmZ0Sm9pbgDkAQpnMm1fZmZ0TWl4AOUBDGcybV9mZnRGaW5hbADmARFnMW1fdGltZXNGckFmZmluZQDnARFnMm1fdGltZXNGckFmZmluZQDoARFmcm1fYmF0Y2hBcHBseUtleQDpARFnMW1fYmF0Y2hBcHBseUtleQDqARZnMW1fYmF0Y2hBcHBseUtleU1peGVkAOsBEWcybV9iYXRjaEFwcGx5S2V5AOwBFmcybV9iYXRjaEFwcGx5S2V5TWl4ZWQA7QEKZjZtX2lzWmVybwDvAQlmNm1faXNPbmUA8AEIZjZtX3plcm8A8QEHZjZtX29uZQDyAQhmNm1fY29weQDzAQdmNm1fbXVsAPQBCmY2bV9zcXVhcmUA9QEHZjZtX2FkZAD2AQdmNm1fc3ViAPcBB2Y2bV9uZWcA+AEIZjZtX3NpZ24A+QESZjZtX2Zyb21Nb250Z29tZXJ5APsBEGY2bV90b01vbnRnb21lcnkA+gEGZjZtX2VxAPwBC2Y2bV9pbnZlcnNlAP0BB2Y2bV9leHAAgQIPZjZtX3RpbWVzU2NhbGFyAP4BEGY2bV9iYXRjaEludmVyc2UAgAIOZjZtX2lzTmVnYXRpdmUA/wEKZnRtX2lzWmVybwCDAglmdG1faXNPbmUAhAIIZnRtX3plcm8AhQIHZnRtX29uZQCGAghmdG1fY29weQCHAgdmdG1fbXVsAIgCCGZ0bV9tdWwxAIkCCmZ0bV9zcXVhcmUAigIHZnRtX2FkZACLAgdmdG1fc3ViAIwCB2Z0bV9uZWcAjQIIZnRtX3NpZ24AlAINZnRtX2Nvbmp1Z2F0ZQCOAhJmdG1fZnJvbU1vbnRnb21lcnkAkAIQZnRtX3RvTW9udGdvbWVyeQCPAgZmdG1fZXEAkQILZnRtX2ludmVyc2UAkgIHZnRtX2V4cACXAg9mdG1fdGltZXNTY2FsYXIAkwIQZnRtX2JhdGNoSW52ZXJzZQCWAghmdG1fc3FydACYAgxmdG1faXNTcXVhcmUAmQIOZnRtX2lzTmVnYXRpdmUAlQIXYmxzMTIzODFfX2Zyb2Jlbml1c01hcDAAngIXYmxzMTIzODFfX2Zyb2Jlbml1c01hcDEAnwIXYmxzMTIzODFfX2Zyb2Jlbml1c01hcDIAoAIXYmxzMTIzODFfX2Zyb2Jlbml1c01hcDMAoQIXYmxzMTIzODFfX2Zyb2Jlbml1c01hcDQAogIXYmxzMTIzODFfX2Zyb2Jlbml1c01hcDUAowIXYmxzMTIzODFfX2Zyb2Jlbml1c01hcDYApAIXYmxzMTIzODFfX2Zyb2Jlbml1c01hcDcApQIXYmxzMTIzODFfX2Zyb2Jlbml1c01hcDgApgIXYmxzMTIzODFfX2Zyb2Jlbml1c01hcDkApwITYmxzMTIzODFfcGFpcmluZ0VxMQCxAhNibHMxMjM4MV9wYWlyaW5nRXEyALICE2JsczEyMzgxX3BhaXJpbmdFcTMAswITYmxzMTIzODFfcGFpcmluZ0VxNAC0AhNibHMxMjM4MV9wYWlyaW5nRXE1ALUCEGJsczEyMzgxX3BhaXJpbmcAtgISYmxzMTIzODFfcHJlcGFyZUcxAKoCEmJsczEyMzgxX3ByZXBhcmVHMgCrAhNibHMxMjM4MV9taWxsZXJMb29wAKwCHGJsczEyMzgxX2ZpbmFsRXhwb25lbnRpYXRpb24AsAIfYmxzMTIzODFfZmluYWxFeHBvbmVudGlhdGlvbk9sZACtAhpibHMxMjM4MV9fY3ljbG90b21pY1NxdWFyZQCuAhpibHMxMjM4MV9fY3ljbG90b21pY0V4cF93MACvAghmNm1fbXVsMQCaAglmNm1fbXVsMDEAmwIKZnRtX211bDAxNACcAgrq/AS3Aj4AIAEgACkDADcDACABIAApAwg3AwggASAAKQMQNwMQIAEgACkDGDcDGCABIAApAyA3AyAgASAAKQMoNwMoCywAIABCADcDACAAQgA3AwggAEIANwMQIABCADcDGCAAQgA3AyAgAEIANwMoC00AIAApAyhQBEAgACkDIFAEQCAAKQMYUARAIAApAxBQBEAgACkDCFAEQCAAKQMAUA8FQQAPCwVBAA8LBUEADwsFQQAPCwVBAA8LQQAPCywAIABCATcDACAAQgA3AwggAEIANwMQIABCADcDGCAAQgA3AyAgAEIANwMoC2sAIAApAyggASkDKFEEQCAAKQMgIAEpAyBRBEAgACkDGCABKQMYUQRAIAApAxAgASkDEFEEQCAAKQMIIAEpAwhRBEAgACkDACABKQMAUQ8FQQAPCwVBAA8LBUEADwsFQQAPCwVBAA8LQQAPC8UBACAAKQMoIAEpAyhUBEBBAA8FIAApAyggASkDKFYEQEEBDwUgACkDICABKQMgVARAQQAPBSAAKQMgIAEpAyBWBEBBAQ8FIAApAxggASkDGFQEQEEADwUgACkDGCABKQMYVgRAQQEPBSAAKQMQIAEpAxBUBEBBAA8FIAApAxAgASkDEFYEQEEBDwUgACkDCCABKQMIVARAQQAPBSAAKQMIIAEpAwhWBEBBAQ8FIAApAwAgASkDAFoPCwsLCwsLCwsLC0EADwu8AgEBfiAANQIAIAE1AgB8IQMgAiADPgIAIAA1AgQgATUCBHwgA0IgiHwhAyACIAM+AgQgADUCCCABNQIIfCADQiCIfCEDIAIgAz4CCCAANQIMIAE1Agx8IANCIIh8IQMgAiADPgIMIAA1AhAgATUCEHwgA0IgiHwhAyACIAM+AhAgADUCFCABNQIUfCADQiCIfCEDIAIgAz4CFCAANQIYIAE1Ahh8IANCIIh8IQMgAiADPgIYIAA1AhwgATUCHHwgA0IgiHwhAyACIAM+AhwgADUCICABNQIgfCADQiCIfCEDIAIgAz4CICAANQIkIAE1AiR8IANCIIh8IQMgAiADPgIkIAA1AiggATUCKHwgA0IgiHwhAyACIAM+AiggADUCLCABNQIsfCADQiCIfCEDIAIgAz4CLCADQiCIpwuQAwEBfiAANQIAIAE1AgB9IQMgAiADQv////8Pgz4CACAANQIEIAE1AgR9IANCIId8IQMgAiADQv////8Pgz4CBCAANQIIIAE1Agh9IANCIId8IQMgAiADQv////8Pgz4CCCAANQIMIAE1Agx9IANCIId8IQMgAiADQv////8Pgz4CDCAANQIQIAE1AhB9IANCIId8IQMgAiADQv////8Pgz4CECAANQIUIAE1AhR9IANCIId8IQMgAiADQv////8Pgz4CFCAANQIYIAE1Ahh9IANCIId8IQMgAiADQv////8Pgz4CGCAANQIcIAE1Ahx9IANCIId8IQMgAiADQv////8Pgz4CHCAANQIgIAE1AiB9IANCIId8IQMgAiADQv////8Pgz4CICAANQIkIAE1AiR9IANCIId8IQMgAiADQv////8Pgz4CJCAANQIoIAE1Aih9IANCIId8IQMgAiADQv////8Pgz4CKCAANQIsIAE1Aix9IANCIId8IQMgAiADQv////8Pgz4CLCADQiCHpwunIhoBfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+IANC/////w+DIAA1AgAiBSABNQIAIgZ+fCEDIAQgA0IgiHwhBCACIAM+AgAgBEIgiCEDIARC/////w+DIAUgATUCBCIIfnwhBCADIARCIIh8IQMgBEL/////D4MgADUCBCIHIAZ+fCEEIAMgBEIgiHwhAyACIAQ+AgQgA0IgiCEEIANC/////w+DIAUgATUCCCIKfnwhAyAEIANCIIh8IQQgA0L/////D4MgByAIfnwhAyAEIANCIIh8IQQgA0L/////D4MgADUCCCIJIAZ+fCEDIAQgA0IgiHwhBCACIAM+AgggBEIgiCEDIARC/////w+DIAUgATUCDCIMfnwhBCADIARCIIh8IQMgBEL/////D4MgByAKfnwhBCADIARCIIh8IQMgBEL/////D4MgCSAIfnwhBCADIARCIIh8IQMgBEL/////D4MgADUCDCILIAZ+fCEEIAMgBEIgiHwhAyACIAQ+AgwgA0IgiCEEIANC/////w+DIAUgATUCECIOfnwhAyAEIANCIIh8IQQgA0L/////D4MgByAMfnwhAyAEIANCIIh8IQQgA0L/////D4MgCSAKfnwhAyAEIANCIIh8IQQgA0L/////D4MgCyAIfnwhAyAEIANCIIh8IQQgA0L/////D4MgADUCECINIAZ+fCEDIAQgA0IgiHwhBCACIAM+AhAgBEIgiCEDIARC/////w+DIAUgATUCFCIQfnwhBCADIARCIIh8IQMgBEL/////D4MgByAOfnwhBCADIARCIIh8IQMgBEL/////D4MgCSAMfnwhBCADIARCIIh8IQMgBEL/////D4MgCyAKfnwhBCADIARCIIh8IQMgBEL/////D4MgDSAIfnwhBCADIARCIIh8IQMgBEL/////D4MgADUCFCIPIAZ+fCEEIAMgBEIgiHwhAyACIAQ+AhQgA0IgiCEEIANC/////w+DIAUgATUCGCISfnwhAyAEIANCIIh8IQQgA0L/////D4MgByAQfnwhAyAEIANCIIh8IQQgA0L/////D4MgCSAOfnwhAyAEIANCIIh8IQQgA0L/////D4MgCyAMfnwhAyAEIANCIIh8IQQgA0L/////D4MgDSAKfnwhAyAEIANCIIh8IQQgA0L/////D4MgDyAIfnwhAyAEIANCIIh8IQQgA0L/////D4MgADUCGCIRIAZ+fCEDIAQgA0IgiHwhBCACIAM+AhggBEIgiCEDIARC/////w+DIAUgATUCHCIUfnwhBCADIARCIIh8IQMgBEL/////D4MgByASfnwhBCADIARCIIh8IQMgBEL/////D4MgCSAQfnwhBCADIARCIIh8IQMgBEL/////D4MgCyAOfnwhBCADIARCIIh8IQMgBEL/////D4MgDSAMfnwhBCADIARCIIh8IQMgBEL/////D4MgDyAKfnwhBCADIARCIIh8IQMgBEL/////D4MgESAIfnwhBCADIARCIIh8IQMgBEL/////D4MgADUCHCITIAZ+fCEEIAMgBEIgiHwhAyACIAQ+AhwgA0IgiCEEIANC/////w+DIAUgATUCICIWfnwhAyAEIANCIIh8IQQgA0L/////D4MgByAUfnwhAyAEIANCIIh8IQQgA0L/////D4MgCSASfnwhAyAEIANCIIh8IQQgA0L/////D4MgCyAQfnwhAyAEIANCIIh8IQQgA0L/////D4MgDSAOfnwhAyAEIANCIIh8IQQgA0L/////D4MgDyAMfnwhAyAEIANCIIh8IQQgA0L/////D4MgESAKfnwhAyAEIANCIIh8IQQgA0L/////D4MgEyAIfnwhAyAEIANCIIh8IQQgA0L/////D4MgADUCICIVIAZ+fCEDIAQgA0IgiHwhBCACIAM+AiAgBEIgiCEDIARC/////w+DIAUgATUCJCIYfnwhBCADIARCIIh8IQMgBEL/////D4MgByAWfnwhBCADIARCIIh8IQMgBEL/////D4MgCSAUfnwhBCADIARCIIh8IQMgBEL/////D4MgCyASfnwhBCADIARCIIh8IQMgBEL/////D4MgDSAQfnwhBCADIARCIIh8IQMgBEL/////D4MgDyAOfnwhBCADIARCIIh8IQMgBEL/////D4MgESAMfnwhBCADIARCIIh8IQMgBEL/////D4MgEyAKfnwhBCADIARCIIh8IQMgBEL/////D4MgFSAIfnwhBCADIARCIIh8IQMgBEL/////D4MgADUCJCIXIAZ+fCEEIAMgBEIgiHwhAyACIAQ+AiQgA0IgiCEEIANC/////w+DIAUgATUCKCIafnwhAyAEIANCIIh8IQQgA0L/////D4MgByAYfnwhAyAEIANCIIh8IQQgA0L/////D4MgCSAWfnwhAyAEIANCIIh8IQQgA0L/////D4MgCyAUfnwhAyAEIANCIIh8IQQgA0L/////D4MgDSASfnwhAyAEIANCIIh8IQQgA0L/////D4MgDyAQfnwhAyAEIANCIIh8IQQgA0L/////D4MgESAOfnwhAyAEIANCIIh8IQQgA0L/////D4MgEyAMfnwhAyAEIANCIIh8IQQgA0L/////D4MgFSAKfnwhAyAEIANCIIh8IQQgA0L/////D4MgFyAIfnwhAyAEIANCIIh8IQQgA0L/////D4MgADUCKCIZIAZ+fCEDIAQgA0IgiHwhBCACIAM+AiggBEIgiCEDIARC/////w+DIAUgATUCLCIcfnwhBCADIARCIIh8IQMgBEL/////D4MgByAafnwhBCADIARCIIh8IQMgBEL/////D4MgCSAYfnwhBCADIARCIIh8IQMgBEL/////D4MgCyAWfnwhBCADIARCIIh8IQMgBEL/////D4MgDSAUfnwhBCADIARCIIh8IQMgBEL/////D4MgDyASfnwhBCADIARCIIh8IQMgBEL/////D4MgESAQfnwhBCADIARCIIh8IQMgBEL/////D4MgEyAOfnwhBCADIARCIIh8IQMgBEL/////D4MgFSAMfnwhBCADIARCIIh8IQMgBEL/////D4MgFyAKfnwhBCADIARCIIh8IQMgBEL/////D4MgGSAIfnwhBCADIARCIIh8IQMgBEL/////D4MgADUCLCIbIAZ+fCEEIAMgBEIgiHwhAyACIAQ+AiwgA0IgiCEEIANC/////w+DIAcgHH58IQMgBCADQiCIfCEEIANC/////w+DIAkgGn58IQMgBCADQiCIfCEEIANC/////w+DIAsgGH58IQMgBCADQiCIfCEEIANC/////w+DIA0gFn58IQMgBCADQiCIfCEEIANC/////w+DIA8gFH58IQMgBCADQiCIfCEEIANC/////w+DIBEgEn58IQMgBCADQiCIfCEEIANC/////w+DIBMgEH58IQMgBCADQiCIfCEEIANC/////w+DIBUgDn58IQMgBCADQiCIfCEEIANC/////w+DIBcgDH58IQMgBCADQiCIfCEEIANC/////w+DIBkgCn58IQMgBCADQiCIfCEEIANC/////w+DIBsgCH58IQMgBCADQiCIfCEEIAIgAz4CMCAEQiCIIQMgBEL/////D4MgCSAcfnwhBCADIARCIIh8IQMgBEL/////D4MgCyAafnwhBCADIARCIIh8IQMgBEL/////D4MgDSAYfnwhBCADIARCIIh8IQMgBEL/////D4MgDyAWfnwhBCADIARCIIh8IQMgBEL/////D4MgESAUfnwhBCADIARCIIh8IQMgBEL/////D4MgEyASfnwhBCADIARCIIh8IQMgBEL/////D4MgFSAQfnwhBCADIARCIIh8IQMgBEL/////D4MgFyAOfnwhBCADIARCIIh8IQMgBEL/////D4MgGSAMfnwhBCADIARCIIh8IQMgBEL/////D4MgGyAKfnwhBCADIARCIIh8IQMgAiAEPgI0IANCIIghBCADQv////8PgyALIBx+fCEDIAQgA0IgiHwhBCADQv////8PgyANIBp+fCEDIAQgA0IgiHwhBCADQv////8PgyAPIBh+fCEDIAQgA0IgiHwhBCADQv////8PgyARIBZ+fCEDIAQgA0IgiHwhBCADQv////8PgyATIBR+fCEDIAQgA0IgiHwhBCADQv////8PgyAVIBJ+fCEDIAQgA0IgiHwhBCADQv////8PgyAXIBB+fCEDIAQgA0IgiHwhBCADQv////8PgyAZIA5+fCEDIAQgA0IgiHwhBCADQv////8PgyAbIAx+fCEDIAQgA0IgiHwhBCACIAM+AjggBEIgiCEDIARC/////w+DIA0gHH58IQQgAyAEQiCIfCEDIARC/////w+DIA8gGn58IQQgAyAEQiCIfCEDIARC/////w+DIBEgGH58IQQgAyAEQiCIfCEDIARC/////w+DIBMgFn58IQQgAyAEQiCIfCEDIARC/////w+DIBUgFH58IQQgAyAEQiCIfCEDIARC/////w+DIBcgEn58IQQgAyAEQiCIfCEDIARC/////w+DIBkgEH58IQQgAyAEQiCIfCEDIARC/////w+DIBsgDn58IQQgAyAEQiCIfCEDIAIgBD4CPCADQiCIIQQgA0L/////D4MgDyAcfnwhAyAEIANCIIh8IQQgA0L/////D4MgESAafnwhAyAEIANCIIh8IQQgA0L/////D4MgEyAYfnwhAyAEIANCIIh8IQQgA0L/////D4MgFSAWfnwhAyAEIANCIIh8IQQgA0L/////D4MgFyAUfnwhAyAEIANCIIh8IQQgA0L/////D4MgGSASfnwhAyAEIANCIIh8IQQgA0L/////D4MgGyAQfnwhAyAEIANCIIh8IQQgAiADPgJAIARCIIghAyAEQv////8PgyARIBx+fCEEIAMgBEIgiHwhAyAEQv////8PgyATIBp+fCEEIAMgBEIgiHwhAyAEQv////8PgyAVIBh+fCEEIAMgBEIgiHwhAyAEQv////8PgyAXIBZ+fCEEIAMgBEIgiHwhAyAEQv////8PgyAZIBR+fCEEIAMgBEIgiHwhAyAEQv////8PgyAbIBJ+fCEEIAMgBEIgiHwhAyACIAQ+AkQgA0IgiCEEIANC/////w+DIBMgHH58IQMgBCADQiCIfCEEIANC/////w+DIBUgGn58IQMgBCADQiCIfCEEIANC/////w+DIBcgGH58IQMgBCADQiCIfCEEIANC/////w+DIBkgFn58IQMgBCADQiCIfCEEIANC/////w+DIBsgFH58IQMgBCADQiCIfCEEIAIgAz4CSCAEQiCIIQMgBEL/////D4MgFSAcfnwhBCADIARCIIh8IQMgBEL/////D4MgFyAafnwhBCADIARCIIh8IQMgBEL/////D4MgGSAYfnwhBCADIARCIIh8IQMgBEL/////D4MgGyAWfnwhBCADIARCIIh8IQMgAiAEPgJMIANCIIghBCADQv////8PgyAXIBx+fCEDIAQgA0IgiHwhBCADQv////8PgyAZIBp+fCEDIAQgA0IgiHwhBCADQv////8PgyAbIBh+fCEDIAQgA0IgiHwhBCACIAM+AlAgBEIgiCEDIARC/////w+DIBkgHH58IQQgAyAEQiCIfCEDIARC/////w+DIBsgGn58IQQgAyAEQiCIfCEDIAIgBD4CVCADQiCIIQQgA0L/////D4MgGyAcfnwhAyAEIANCIIh8IQQgAiADPgJYIARCIIghAyACIAQ+AlwLziAQAX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX5CACECQgAhAyACQv////8Pg0IBhiECIANCAYYgAkIgiHwhAyACQv////8PgyAANQIAIgYgBn58IQIgAyACQiCIfCEDIAEgAj4CACADIQQgBEIgiCEFQgAhAkIAIQMgAkL/////D4MgBiAANQIEIgd+fCECIAMgAkIgiHwhAyACQv////8Pg0IBhiECIANCAYYgAkIgiHwhAyACQv////8PgyAEQv////8Pg3whAiADIAJCIIh8IAV8IQMgASACPgIEIAMhBCAEQiCIIQVCACECQgAhAyACQv////8PgyAGIAA1AggiCH58IQIgAyACQiCIfCEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIAcgB358IQIgAyACQiCIfCEDIAJC/////w+DIARC/////w+DfCECIAMgAkIgiHwgBXwhAyABIAI+AgggAyEEIARCIIghBUIAIQJCACEDIAJC/////w+DIAYgADUCDCIJfnwhAiADIAJCIIh8IQMgAkL/////D4MgByAIfnwhAiADIAJCIIh8IQMgAkL/////D4NCAYYhAiADQgGGIAJCIIh8IQMgAkL/////D4MgBEL/////D4N8IQIgAyACQiCIfCAFfCEDIAEgAj4CDCADIQQgBEIgiCEFQgAhAkIAIQMgAkL/////D4MgBiAANQIQIgp+fCECIAMgAkIgiHwhAyACQv////8PgyAHIAl+fCECIAMgAkIgiHwhAyACQv////8Pg0IBhiECIANCAYYgAkIgiHwhAyACQv////8PgyAIIAh+fCECIAMgAkIgiHwhAyACQv////8PgyAEQv////8Pg3whAiADIAJCIIh8IAV8IQMgASACPgIQIAMhBCAEQiCIIQVCACECQgAhAyACQv////8PgyAGIAA1AhQiC358IQIgAyACQiCIfCEDIAJC/////w+DIAcgCn58IQIgAyACQiCIfCEDIAJC/////w+DIAggCX58IQIgAyACQiCIfCEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIARC/////w+DfCECIAMgAkIgiHwgBXwhAyABIAI+AhQgAyEEIARCIIghBUIAIQJCACEDIAJC/////w+DIAYgADUCGCIMfnwhAiADIAJCIIh8IQMgAkL/////D4MgByALfnwhAiADIAJCIIh8IQMgAkL/////D4MgCCAKfnwhAiADIAJCIIh8IQMgAkL/////D4NCAYYhAiADQgGGIAJCIIh8IQMgAkL/////D4MgCSAJfnwhAiADIAJCIIh8IQMgAkL/////D4MgBEL/////D4N8IQIgAyACQiCIfCAFfCEDIAEgAj4CGCADIQQgBEIgiCEFQgAhAkIAIQMgAkL/////D4MgBiAANQIcIg1+fCECIAMgAkIgiHwhAyACQv////8PgyAHIAx+fCECIAMgAkIgiHwhAyACQv////8PgyAIIAt+fCECIAMgAkIgiHwhAyACQv////8PgyAJIAp+fCECIAMgAkIgiHwhAyACQv////8Pg0IBhiECIANCAYYgAkIgiHwhAyACQv////8PgyAEQv////8Pg3whAiADIAJCIIh8IAV8IQMgASACPgIcIAMhBCAEQiCIIQVCACECQgAhAyACQv////8PgyAGIAA1AiAiDn58IQIgAyACQiCIfCEDIAJC/////w+DIAcgDX58IQIgAyACQiCIfCEDIAJC/////w+DIAggDH58IQIgAyACQiCIfCEDIAJC/////w+DIAkgC358IQIgAyACQiCIfCEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIAogCn58IQIgAyACQiCIfCEDIAJC/////w+DIARC/////w+DfCECIAMgAkIgiHwgBXwhAyABIAI+AiAgAyEEIARCIIghBUIAIQJCACEDIAJC/////w+DIAYgADUCJCIPfnwhAiADIAJCIIh8IQMgAkL/////D4MgByAOfnwhAiADIAJCIIh8IQMgAkL/////D4MgCCANfnwhAiADIAJCIIh8IQMgAkL/////D4MgCSAMfnwhAiADIAJCIIh8IQMgAkL/////D4MgCiALfnwhAiADIAJCIIh8IQMgAkL/////D4NCAYYhAiADQgGGIAJCIIh8IQMgAkL/////D4MgBEL/////D4N8IQIgAyACQiCIfCAFfCEDIAEgAj4CJCADIQQgBEIgiCEFQgAhAkIAIQMgAkL/////D4MgBiAANQIoIhB+fCECIAMgAkIgiHwhAyACQv////8PgyAHIA9+fCECIAMgAkIgiHwhAyACQv////8PgyAIIA5+fCECIAMgAkIgiHwhAyACQv////8PgyAJIA1+fCECIAMgAkIgiHwhAyACQv////8PgyAKIAx+fCECIAMgAkIgiHwhAyACQv////8Pg0IBhiECIANCAYYgAkIgiHwhAyACQv////8PgyALIAt+fCECIAMgAkIgiHwhAyACQv////8PgyAEQv////8Pg3whAiADIAJCIIh8IAV8IQMgASACPgIoIAMhBCAEQiCIIQVCACECQgAhAyACQv////8PgyAGIAA1AiwiEX58IQIgAyACQiCIfCEDIAJC/////w+DIAcgEH58IQIgAyACQiCIfCEDIAJC/////w+DIAggD358IQIgAyACQiCIfCEDIAJC/////w+DIAkgDn58IQIgAyACQiCIfCEDIAJC/////w+DIAogDX58IQIgAyACQiCIfCEDIAJC/////w+DIAsgDH58IQIgAyACQiCIfCEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIARC/////w+DfCECIAMgAkIgiHwgBXwhAyABIAI+AiwgAyEEIARCIIghBUIAIQJCACEDIAJC/////w+DIAcgEX58IQIgAyACQiCIfCEDIAJC/////w+DIAggEH58IQIgAyACQiCIfCEDIAJC/////w+DIAkgD358IQIgAyACQiCIfCEDIAJC/////w+DIAogDn58IQIgAyACQiCIfCEDIAJC/////w+DIAsgDX58IQIgAyACQiCIfCEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIAwgDH58IQIgAyACQiCIfCEDIAJC/////w+DIARC/////w+DfCECIAMgAkIgiHwgBXwhAyABIAI+AjAgAyEEIARCIIghBUIAIQJCACEDIAJC/////w+DIAggEX58IQIgAyACQiCIfCEDIAJC/////w+DIAkgEH58IQIgAyACQiCIfCEDIAJC/////w+DIAogD358IQIgAyACQiCIfCEDIAJC/////w+DIAsgDn58IQIgAyACQiCIfCEDIAJC/////w+DIAwgDX58IQIgAyACQiCIfCEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIARC/////w+DfCECIAMgAkIgiHwgBXwhAyABIAI+AjQgAyEEIARCIIghBUIAIQJCACEDIAJC/////w+DIAkgEX58IQIgAyACQiCIfCEDIAJC/////w+DIAogEH58IQIgAyACQiCIfCEDIAJC/////w+DIAsgD358IQIgAyACQiCIfCEDIAJC/////w+DIAwgDn58IQIgAyACQiCIfCEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIA0gDX58IQIgAyACQiCIfCEDIAJC/////w+DIARC/////w+DfCECIAMgAkIgiHwgBXwhAyABIAI+AjggAyEEIARCIIghBUIAIQJCACEDIAJC/////w+DIAogEX58IQIgAyACQiCIfCEDIAJC/////w+DIAsgEH58IQIgAyACQiCIfCEDIAJC/////w+DIAwgD358IQIgAyACQiCIfCEDIAJC/////w+DIA0gDn58IQIgAyACQiCIfCEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIARC/////w+DfCECIAMgAkIgiHwgBXwhAyABIAI+AjwgAyEEIARCIIghBUIAIQJCACEDIAJC/////w+DIAsgEX58IQIgAyACQiCIfCEDIAJC/////w+DIAwgEH58IQIgAyACQiCIfCEDIAJC/////w+DIA0gD358IQIgAyACQiCIfCEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIA4gDn58IQIgAyACQiCIfCEDIAJC/////w+DIARC/////w+DfCECIAMgAkIgiHwgBXwhAyABIAI+AkAgAyEEIARCIIghBUIAIQJCACEDIAJC/////w+DIAwgEX58IQIgAyACQiCIfCEDIAJC/////w+DIA0gEH58IQIgAyACQiCIfCEDIAJC/////w+DIA4gD358IQIgAyACQiCIfCEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIARC/////w+DfCECIAMgAkIgiHwgBXwhAyABIAI+AkQgAyEEIARCIIghBUIAIQJCACEDIAJC/////w+DIA0gEX58IQIgAyACQiCIfCEDIAJC/////w+DIA4gEH58IQIgAyACQiCIfCEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIA8gD358IQIgAyACQiCIfCEDIAJC/////w+DIARC/////w+DfCECIAMgAkIgiHwgBXwhAyABIAI+AkggAyEEIARCIIghBUIAIQJCACEDIAJC/////w+DIA4gEX58IQIgAyACQiCIfCEDIAJC/////w+DIA8gEH58IQIgAyACQiCIfCEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIARC/////w+DfCECIAMgAkIgiHwgBXwhAyABIAI+AkwgAyEEIARCIIghBUIAIQJCACEDIAJC/////w+DIA8gEX58IQIgAyACQiCIfCEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIBAgEH58IQIgAyACQiCIfCEDIAJC/////w+DIARC/////w+DfCECIAMgAkIgiHwgBXwhAyABIAI+AlAgAyEEIARCIIghBUIAIQJCACEDIAJC/////w+DIBAgEX58IQIgAyACQiCIfCEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIARC/////w+DfCECIAMgAkIgiHwgBXwhAyABIAI+AlQgAyEEIARCIIghBUIAIQJCACEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIBEgEX58IQIgAyACQiCIfCEDIAJC/////w+DIARC/////w+DfCECIAMgAkIgiHwgBXwhAyABIAI+AlggAyEEIARCIIghBSABIAQ+AlwLCgAgACAAIAEQCAuSAgEBfiAANQAAIAF+IQMgAiADPgAAIAA1AAQgAX4gA0IgiHwhAyACIAM+AAQgADUACCABfiADQiCIfCEDIAIgAz4ACCAANQAMIAF+IANCIIh8IQMgAiADPgAMIAA1ABAgAX4gA0IgiHwhAyACIAM+ABAgADUAFCABfiADQiCIfCEDIAIgAz4AFCAANQAYIAF+IANCIIh8IQMgAiADPgAYIAA1ABwgAX4gA0IgiHwhAyACIAM+ABwgADUAICABfiADQiCIfCEDIAIgAz4AICAANQAkIAF+IANCIIh8IQMgAiADPgAkIAA1ACggAX4gA0IgiHwhAyACIAM+ACggADUALCABfiADQiCIfCEDIAIgAz4ALAtOAgF+AX8gACEDIAM1AAAgAXwhAiADIAI+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IAR+fCEDIAAgAz4CUCAANQJUIANCIIh8QfgFNQIoIAR+fCEDIAAgAz4CVCAANQJYIANCIIh8QfgFNQIsIAR+fCEDIAAgAz4CWEGICiADQiCIPgIsQYgKIABBMGogARAQC6ZDMwF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfkL9//P/DyEFIANC/////w+DIAA1AgAiBiABNQIAIgd+fCEDIAQgA0IgiHwhBCADQv////8PgyAFfkL/////D4MhCCADQv////8Pg0EANQL4BSIJIAh+fCEDIAQgA0IgiHwhBCAEQiCIIQMgBEL/////D4MgBiABNQIEIgt+fCEEIAMgBEIgiHwhAyAEQv////8PgyAANQIEIgogB358IQQgAyAEQiCIfCEDIARC/////w+DQQA1AvwFIg0gCH58IQQgAyAEQiCIfCEDIARC/////w+DIAV+Qv////8PgyEMIARC/////w+DIAkgDH58IQQgAyAEQiCIfCEDIANCIIghBCADQv////8PgyAGIAE1AggiD358IQMgBCADQiCIfCEEIANC/////w+DIAogC358IQMgBCADQiCIfCEEIANC/////w+DIAA1AggiDiAHfnwhAyAEIANCIIh8IQQgA0L/////D4MgDSAMfnwhAyAEIANCIIh8IQQgA0L/////D4NBADUCgAYiESAIfnwhAyAEIANCIIh8IQQgA0L/////D4MgBX5C/////w+DIRAgA0L/////D4MgCSAQfnwhAyAEIANCIIh8IQQgBEIgiCEDIARC/////w+DIAYgATUCDCITfnwhBCADIARCIIh8IQMgBEL/////D4MgCiAPfnwhBCADIARCIIh8IQMgBEL/////D4MgDiALfnwhBCADIARCIIh8IQMgBEL/////D4MgADUCDCISIAd+fCEEIAMgBEIgiHwhAyAEQv////8PgyANIBB+fCEEIAMgBEIgiHwhAyAEQv////8PgyARIAx+fCEEIAMgBEIgiHwhAyAEQv////8Pg0EANQKEBiIVIAh+fCEEIAMgBEIgiHwhAyAEQv////8PgyAFfkL/////D4MhFCAEQv////8PgyAJIBR+fCEEIAMgBEIgiHwhAyADQiCIIQQgA0L/////D4MgBiABNQIQIhd+fCEDIAQgA0IgiHwhBCADQv////8PgyAKIBN+fCEDIAQgA0IgiHwhBCADQv////8PgyAOIA9+fCEDIAQgA0IgiHwhBCADQv////8PgyASIAt+fCEDIAQgA0IgiHwhBCADQv////8PgyAANQIQIhYgB358IQMgBCADQiCIfCEEIANC/////w+DIA0gFH58IQMgBCADQiCIfCEEIANC/////w+DIBEgEH58IQMgBCADQiCIfCEEIANC/////w+DIBUgDH58IQMgBCADQiCIfCEEIANC/////w+DQQA1AogGIhkgCH58IQMgBCADQiCIfCEEIANC/////w+DIAV+Qv////8PgyEYIANC/////w+DIAkgGH58IQMgBCADQiCIfCEEIARCIIghAyAEQv////8PgyAGIAE1AhQiG358IQQgAyAEQiCIfCEDIARC/////w+DIAogF358IQQgAyAEQiCIfCEDIARC/////w+DIA4gE358IQQgAyAEQiCIfCEDIARC/////w+DIBIgD358IQQgAyAEQiCIfCEDIARC/////w+DIBYgC358IQQgAyAEQiCIfCEDIARC/////w+DIAA1AhQiGiAHfnwhBCADIARCIIh8IQMgBEL/////D4MgDSAYfnwhBCADIARCIIh8IQMgBEL/////D4MgESAUfnwhBCADIARCIIh8IQMgBEL/////D4MgFSAQfnwhBCADIARCIIh8IQMgBEL/////D4MgGSAMfnwhBCADIARCIIh8IQMgBEL/////D4NBADUCjAYiHSAIfnwhBCADIARCIIh8IQMgBEL/////D4MgBX5C/////w+DIRwgBEL/////D4MgCSAcfnwhBCADIARCIIh8IQMgA0IgiCEEIANC/////w+DIAYgATUCGCIffnwhAyAEIANCIIh8IQQgA0L/////D4MgCiAbfnwhAyAEIANCIIh8IQQgA0L/////D4MgDiAXfnwhAyAEIANCIIh8IQQgA0L/////D4MgEiATfnwhAyAEIANCIIh8IQQgA0L/////D4MgFiAPfnwhAyAEIANCIIh8IQQgA0L/////D4MgGiALfnwhAyAEIANCIIh8IQQgA0L/////D4MgADUCGCIeIAd+fCEDIAQgA0IgiHwhBCADQv////8PgyANIBx+fCEDIAQgA0IgiHwhBCADQv////8PgyARIBh+fCEDIAQgA0IgiHwhBCADQv////8PgyAVIBR+fCEDIAQgA0IgiHwhBCADQv////8PgyAZIBB+fCEDIAQgA0IgiHwhBCADQv////8PgyAdIAx+fCEDIAQgA0IgiHwhBCADQv////8Pg0EANQKQBiIhIAh+fCEDIAQgA0IgiHwhBCADQv////8PgyAFfkL/////D4MhICADQv////8PgyAJICB+fCEDIAQgA0IgiHwhBCAEQiCIIQMgBEL/////D4MgBiABNQIcIiN+fCEEIAMgBEIgiHwhAyAEQv////8PgyAKIB9+fCEEIAMgBEIgiHwhAyAEQv////8PgyAOIBt+fCEEIAMgBEIgiHwhAyAEQv////8PgyASIBd+fCEEIAMgBEIgiHwhAyAEQv////8PgyAWIBN+fCEEIAMgBEIgiHwhAyAEQv////8PgyAaIA9+fCEEIAMgBEIgiHwhAyAEQv////8PgyAeIAt+fCEEIAMgBEIgiHwhAyAEQv////8PgyAANQIcIiIgB358IQQgAyAEQiCIfCEDIARC/////w+DIA0gIH58IQQgAyAEQiCIfCEDIARC/////w+DIBEgHH58IQQgAyAEQiCIfCEDIARC/////w+DIBUgGH58IQQgAyAEQiCIfCEDIARC/////w+DIBkgFH58IQQgAyAEQiCIfCEDIARC/////w+DIB0gEH58IQQgAyAEQiCIfCEDIARC/////w+DICEgDH58IQQgAyAEQiCIfCEDIARC/////w+DQQA1ApQGIiUgCH58IQQgAyAEQiCIfCEDIARC/////w+DIAV+Qv////8PgyEkIARC/////w+DIAkgJH58IQQgAyAEQiCIfCEDIANCIIghBCADQv////8PgyAGIAE1AiAiJ358IQMgBCADQiCIfCEEIANC/////w+DIAogI358IQMgBCADQiCIfCEEIANC/////w+DIA4gH358IQMgBCADQiCIfCEEIANC/////w+DIBIgG358IQMgBCADQiCIfCEEIANC/////w+DIBYgF358IQMgBCADQiCIfCEEIANC/////w+DIBogE358IQMgBCADQiCIfCEEIANC/////w+DIB4gD358IQMgBCADQiCIfCEEIANC/////w+DICIgC358IQMgBCADQiCIfCEEIANC/////w+DIAA1AiAiJiAHfnwhAyAEIANCIIh8IQQgA0L/////D4MgDSAkfnwhAyAEIANCIIh8IQQgA0L/////D4MgESAgfnwhAyAEIANCIIh8IQQgA0L/////D4MgFSAcfnwhAyAEIANCIIh8IQQgA0L/////D4MgGSAYfnwhAyAEIANCIIh8IQQgA0L/////D4MgHSAUfnwhAyAEIANCIIh8IQQgA0L/////D4MgISAQfnwhAyAEIANCIIh8IQQgA0L/////D4MgJSAMfnwhAyAEIANCIIh8IQQgA0L/////D4NBADUCmAYiKSAIfnwhAyAEIANCIIh8IQQgA0L/////D4MgBX5C/////w+DISggA0L/////D4MgCSAofnwhAyAEIANCIIh8IQQgBEIgiCEDIARC/////w+DIAYgATUCJCIrfnwhBCADIARCIIh8IQMgBEL/////D4MgCiAnfnwhBCADIARCIIh8IQMgBEL/////D4MgDiAjfnwhBCADIARCIIh8IQMgBEL/////D4MgEiAffnwhBCADIARCIIh8IQMgBEL/////D4MgFiAbfnwhBCADIARCIIh8IQMgBEL/////D4MgGiAXfnwhBCADIARCIIh8IQMgBEL/////D4MgHiATfnwhBCADIARCIIh8IQMgBEL/////D4MgIiAPfnwhBCADIARCIIh8IQMgBEL/////D4MgJiALfnwhBCADIARCIIh8IQMgBEL/////D4MgADUCJCIqIAd+fCEEIAMgBEIgiHwhAyAEQv////8PgyANICh+fCEEIAMgBEIgiHwhAyAEQv////8PgyARICR+fCEEIAMgBEIgiHwhAyAEQv////8PgyAVICB+fCEEIAMgBEIgiHwhAyAEQv////8PgyAZIBx+fCEEIAMgBEIgiHwhAyAEQv////8PgyAdIBh+fCEEIAMgBEIgiHwhAyAEQv////8PgyAhIBR+fCEEIAMgBEIgiHwhAyAEQv////8PgyAlIBB+fCEEIAMgBEIgiHwhAyAEQv////8PgyApIAx+fCEEIAMgBEIgiHwhAyAEQv////8Pg0EANQKcBiItIAh+fCEEIAMgBEIgiHwhAyAEQv////8PgyAFfkL/////D4MhLCAEQv////8PgyAJICx+fCEEIAMgBEIgiHwhAyADQiCIIQQgA0L/////D4MgBiABNQIoIi9+fCEDIAQgA0IgiHwhBCADQv////8PgyAKICt+fCEDIAQgA0IgiHwhBCADQv////8PgyAOICd+fCEDIAQgA0IgiHwhBCADQv////8PgyASICN+fCEDIAQgA0IgiHwhBCADQv////8PgyAWIB9+fCEDIAQgA0IgiHwhBCADQv////8PgyAaIBt+fCEDIAQgA0IgiHwhBCADQv////8PgyAeIBd+fCEDIAQgA0IgiHwhBCADQv////8PgyAiIBN+fCEDIAQgA0IgiHwhBCADQv////8PgyAmIA9+fCEDIAQgA0IgiHwhBCADQv////8PgyAqIAt+fCEDIAQgA0IgiHwhBCADQv////8PgyAANQIoIi4gB358IQMgBCADQiCIfCEEIANC/////w+DIA0gLH58IQMgBCADQiCIfCEEIANC/////w+DIBEgKH58IQMgBCADQiCIfCEEIANC/////w+DIBUgJH58IQMgBCADQiCIfCEEIANC/////w+DIBkgIH58IQMgBCADQiCIfCEEIANC/////w+DIB0gHH58IQMgBCADQiCIfCEEIANC/////w+DICEgGH58IQMgBCADQiCIfCEEIANC/////w+DICUgFH58IQMgBCADQiCIfCEEIANC/////w+DICkgEH58IQMgBCADQiCIfCEEIANC/////w+DIC0gDH58IQMgBCADQiCIfCEEIANC/////w+DQQA1AqAGIjEgCH58IQMgBCADQiCIfCEEIANC/////w+DIAV+Qv////8PgyEwIANC/////w+DIAkgMH58IQMgBCADQiCIfCEEIARCIIghAyAEQv////8PgyAGIAE1AiwiM358IQQgAyAEQiCIfCEDIARC/////w+DIAogL358IQQgAyAEQiCIfCEDIARC/////w+DIA4gK358IQQgAyAEQiCIfCEDIARC/////w+DIBIgJ358IQQgAyAEQiCIfCEDIARC/////w+DIBYgI358IQQgAyAEQiCIfCEDIARC/////w+DIBogH358IQQgAyAEQiCIfCEDIARC/////w+DIB4gG358IQQgAyAEQiCIfCEDIARC/////w+DICIgF358IQQgAyAEQiCIfCEDIARC/////w+DICYgE358IQQgAyAEQiCIfCEDIARC/////w+DICogD358IQQgAyAEQiCIfCEDIARC/////w+DIC4gC358IQQgAyAEQiCIfCEDIARC/////w+DIAA1AiwiMiAHfnwhBCADIARCIIh8IQMgBEL/////D4MgDSAwfnwhBCADIARCIIh8IQMgBEL/////D4MgESAsfnwhBCADIARCIIh8IQMgBEL/////D4MgFSAofnwhBCADIARCIIh8IQMgBEL/////D4MgGSAkfnwhBCADIARCIIh8IQMgBEL/////D4MgHSAgfnwhBCADIARCIIh8IQMgBEL/////D4MgISAcfnwhBCADIARCIIh8IQMgBEL/////D4MgJSAYfnwhBCADIARCIIh8IQMgBEL/////D4MgKSAUfnwhBCADIARCIIh8IQMgBEL/////D4MgLSAQfnwhBCADIARCIIh8IQMgBEL/////D4MgMSAMfnwhBCADIARCIIh8IQMgBEL/////D4NBADUCpAYiNSAIfnwhBCADIARCIIh8IQMgBEL/////D4MgBX5C/////w+DITQgBEL/////D4MgCSA0fnwhBCADIARCIIh8IQMgA0IgiCEEIANC/////w+DIAogM358IQMgBCADQiCIfCEEIANC/////w+DIA4gL358IQMgBCADQiCIfCEEIANC/////w+DIBIgK358IQMgBCADQiCIfCEEIANC/////w+DIBYgJ358IQMgBCADQiCIfCEEIANC/////w+DIBogI358IQMgBCADQiCIfCEEIANC/////w+DIB4gH358IQMgBCADQiCIfCEEIANC/////w+DICIgG358IQMgBCADQiCIfCEEIANC/////w+DICYgF358IQMgBCADQiCIfCEEIANC/////w+DICogE358IQMgBCADQiCIfCEEIANC/////w+DIC4gD358IQMgBCADQiCIfCEEIANC/////w+DIDIgC358IQMgBCADQiCIfCEEIANC/////w+DIA0gNH58IQMgBCADQiCIfCEEIANC/////w+DIBEgMH58IQMgBCADQiCIfCEEIANC/////w+DIBUgLH58IQMgBCADQiCIfCEEIANC/////w+DIBkgKH58IQMgBCADQiCIfCEEIANC/////w+DIB0gJH58IQMgBCADQiCIfCEEIANC/////w+DICEgIH58IQMgBCADQiCIfCEEIANC/////w+DICUgHH58IQMgBCADQiCIfCEEIANC/////w+DICkgGH58IQMgBCADQiCIfCEEIANC/////w+DIC0gFH58IQMgBCADQiCIfCEEIANC/////w+DIDEgEH58IQMgBCADQiCIfCEEIANC/////w+DIDUgDH58IQMgBCADQiCIfCEEIAIgAz4CACAEQiCIIQMgBEL/////D4MgDiAzfnwhBCADIARCIIh8IQMgBEL/////D4MgEiAvfnwhBCADIARCIIh8IQMgBEL/////D4MgFiArfnwhBCADIARCIIh8IQMgBEL/////D4MgGiAnfnwhBCADIARCIIh8IQMgBEL/////D4MgHiAjfnwhBCADIARCIIh8IQMgBEL/////D4MgIiAffnwhBCADIARCIIh8IQMgBEL/////D4MgJiAbfnwhBCADIARCIIh8IQMgBEL/////D4MgKiAXfnwhBCADIARCIIh8IQMgBEL/////D4MgLiATfnwhBCADIARCIIh8IQMgBEL/////D4MgMiAPfnwhBCADIARCIIh8IQMgBEL/////D4MgESA0fnwhBCADIARCIIh8IQMgBEL/////D4MgFSAwfnwhBCADIARCIIh8IQMgBEL/////D4MgGSAsfnwhBCADIARCIIh8IQMgBEL/////D4MgHSAofnwhBCADIARCIIh8IQMgBEL/////D4MgISAkfnwhBCADIARCIIh8IQMgBEL/////D4MgJSAgfnwhBCADIARCIIh8IQMgBEL/////D4MgKSAcfnwhBCADIARCIIh8IQMgBEL/////D4MgLSAYfnwhBCADIARCIIh8IQMgBEL/////D4MgMSAUfnwhBCADIARCIIh8IQMgBEL/////D4MgNSAQfnwhBCADIARCIIh8IQMgAiAEPgIEIANCIIghBCADQv////8PgyASIDN+fCEDIAQgA0IgiHwhBCADQv////8PgyAWIC9+fCEDIAQgA0IgiHwhBCADQv////8PgyAaICt+fCEDIAQgA0IgiHwhBCADQv////8PgyAeICd+fCEDIAQgA0IgiHwhBCADQv////8PgyAiICN+fCEDIAQgA0IgiHwhBCADQv////8PgyAmIB9+fCEDIAQgA0IgiHwhBCADQv////8PgyAqIBt+fCEDIAQgA0IgiHwhBCADQv////8PgyAuIBd+fCEDIAQgA0IgiHwhBCADQv////8PgyAyIBN+fCEDIAQgA0IgiHwhBCADQv////8PgyAVIDR+fCEDIAQgA0IgiHwhBCADQv////8PgyAZIDB+fCEDIAQgA0IgiHwhBCADQv////8PgyAdICx+fCEDIAQgA0IgiHwhBCADQv////8PgyAhICh+fCEDIAQgA0IgiHwhBCADQv////8PgyAlICR+fCEDIAQgA0IgiHwhBCADQv////8PgyApICB+fCEDIAQgA0IgiHwhBCADQv////8PgyAtIBx+fCEDIAQgA0IgiHwhBCADQv////8PgyAxIBh+fCEDIAQgA0IgiHwhBCADQv////8PgyA1IBR+fCEDIAQgA0IgiHwhBCACIAM+AgggBEIgiCEDIARC/////w+DIBYgM358IQQgAyAEQiCIfCEDIARC/////w+DIBogL358IQQgAyAEQiCIfCEDIARC/////w+DIB4gK358IQQgAyAEQiCIfCEDIARC/////w+DICIgJ358IQQgAyAEQiCIfCEDIARC/////w+DICYgI358IQQgAyAEQiCIfCEDIARC/////w+DICogH358IQQgAyAEQiCIfCEDIARC/////w+DIC4gG358IQQgAyAEQiCIfCEDIARC/////w+DIDIgF358IQQgAyAEQiCIfCEDIARC/////w+DIBkgNH58IQQgAyAEQiCIfCEDIARC/////w+DIB0gMH58IQQgAyAEQiCIfCEDIARC/////w+DICEgLH58IQQgAyAEQiCIfCEDIARC/////w+DICUgKH58IQQgAyAEQiCIfCEDIARC/////w+DICkgJH58IQQgAyAEQiCIfCEDIARC/////w+DIC0gIH58IQQgAyAEQiCIfCEDIARC/////w+DIDEgHH58IQQgAyAEQiCIfCEDIARC/////w+DIDUgGH58IQQgAyAEQiCIfCEDIAIgBD4CDCADQiCIIQQgA0L/////D4MgGiAzfnwhAyAEIANCIIh8IQQgA0L/////D4MgHiAvfnwhAyAEIANCIIh8IQQgA0L/////D4MgIiArfnwhAyAEIANCIIh8IQQgA0L/////D4MgJiAnfnwhAyAEIANCIIh8IQQgA0L/////D4MgKiAjfnwhAyAEIANCIIh8IQQgA0L/////D4MgLiAffnwhAyAEIANCIIh8IQQgA0L/////D4MgMiAbfnwhAyAEIANCIIh8IQQgA0L/////D4MgHSA0fnwhAyAEIANCIIh8IQQgA0L/////D4MgISAwfnwhAyAEIANCIIh8IQQgA0L/////D4MgJSAsfnwhAyAEIANCIIh8IQQgA0L/////D4MgKSAofnwhAyAEIANCIIh8IQQgA0L/////D4MgLSAkfnwhAyAEIANCIIh8IQQgA0L/////D4MgMSAgfnwhAyAEIANCIIh8IQQgA0L/////D4MgNSAcfnwhAyAEIANCIIh8IQQgAiADPgIQIARCIIghAyAEQv////8PgyAeIDN+fCEEIAMgBEIgiHwhAyAEQv////8PgyAiIC9+fCEEIAMgBEIgiHwhAyAEQv////8PgyAmICt+fCEEIAMgBEIgiHwhAyAEQv////8PgyAqICd+fCEEIAMgBEIgiHwhAyAEQv////8PgyAuICN+fCEEIAMgBEIgiHwhAyAEQv////8PgyAyIB9+fCEEIAMgBEIgiHwhAyAEQv////8PgyAhIDR+fCEEIAMgBEIgiHwhAyAEQv////8PgyAlIDB+fCEEIAMgBEIgiHwhAyAEQv////8PgyApICx+fCEEIAMgBEIgiHwhAyAEQv////8PgyAtICh+fCEEIAMgBEIgiHwhAyAEQv////8PgyAxICR+fCEEIAMgBEIgiHwhAyAEQv////8PgyA1ICB+fCEEIAMgBEIgiHwhAyACIAQ+AhQgA0IgiCEEIANC/////w+DICIgM358IQMgBCADQiCIfCEEIANC/////w+DICYgL358IQMgBCADQiCIfCEEIANC/////w+DICogK358IQMgBCADQiCIfCEEIANC/////w+DIC4gJ358IQMgBCADQiCIfCEEIANC/////w+DIDIgI358IQMgBCADQiCIfCEEIANC/////w+DICUgNH58IQMgBCADQiCIfCEEIANC/////w+DICkgMH58IQMgBCADQiCIfCEEIANC/////w+DIC0gLH58IQMgBCADQiCIfCEEIANC/////w+DIDEgKH58IQMgBCADQiCIfCEEIANC/////w+DIDUgJH58IQMgBCADQiCIfCEEIAIgAz4CGCAEQiCIIQMgBEL/////D4MgJiAzfnwhBCADIARCIIh8IQMgBEL/////D4MgKiAvfnwhBCADIARCIIh8IQMgBEL/////D4MgLiArfnwhBCADIARCIIh8IQMgBEL/////D4MgMiAnfnwhBCADIARCIIh8IQMgBEL/////D4MgKSA0fnwhBCADIARCIIh8IQMgBEL/////D4MgLSAwfnwhBCADIARCIIh8IQMgBEL/////D4MgMSAsfnwhBCADIARCIIh8IQMgBEL/////D4MgNSAofnwhBCADIARCIIh8IQMgAiAEPgIcIANCIIghBCADQv////8PgyAqIDN+fCEDIAQgA0IgiHwhBCADQv////8PgyAuIC9+fCEDIAQgA0IgiHwhBCADQv////8PgyAyICt+fCEDIAQgA0IgiHwhBCADQv////8PgyAtIDR+fCEDIAQgA0IgiHwhBCADQv////8PgyAxIDB+fCEDIAQgA0IgiHwhBCADQv////8PgyA1ICx+fCEDIAQgA0IgiHwhBCACIAM+AiAgBEIgiCEDIARC/////w+DIC4gM358IQQgAyAEQiCIfCEDIARC/////w+DIDIgL358IQQgAyAEQiCIfCEDIARC/////w+DIDEgNH58IQQgAyAEQiCIfCEDIARC/////w+DIDUgMH58IQQgAyAEQiCIfCEDIAIgBD4CJCADQiCIIQQgA0L/////D4MgMiAzfnwhAyAEIANCIIh8IQQgA0L/////D4MgNSA0fnwhAyAEIANCIIh8IQQgAiADPgIoIARCIIghAyACIAQ+AiwgA6cEQCACQfgFIAIQBxoFIAJB+AUQBQRAIAJB+AUgAhAHGgsLC81BKQF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX5C/f/z/w8hBkIAIQJCACEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIAA1AgAiByAHfnwhAiADIAJCIIh8IQMgAkL/////D4MgBn5C/////w+DIQggAkL/////D4NBADUC+AUiCSAIfnwhAiADIAJCIIh8IQMgAyEEIARCIIghBUIAIQJCACEDIAJC/////w+DIAcgADUCBCIKfnwhAiADIAJCIIh8IQMgAkL/////D4NCAYYhAiADQgGGIAJCIIh8IQMgAkL/////D4MgBEL/////D4N8IQIgAyACQiCIfCAFfCEDIAJC/////w+DQQA1AvwFIgwgCH58IQIgAyACQiCIfCEDIAJC/////w+DIAZ+Qv////8PgyELIAJC/////w+DIAkgC358IQIgAyACQiCIfCEDIAMhBCAEQiCIIQVCACECQgAhAyACQv////8PgyAHIAA1AggiDX58IQIgAyACQiCIfCEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIAogCn58IQIgAyACQiCIfCEDIAJC/////w+DIARC/////w+DfCECIAMgAkIgiHwgBXwhAyACQv////8PgyAMIAt+fCECIAMgAkIgiHwhAyACQv////8Pg0EANQKABiIPIAh+fCECIAMgAkIgiHwhAyACQv////8PgyAGfkL/////D4MhDiACQv////8PgyAJIA5+fCECIAMgAkIgiHwhAyADIQQgBEIgiCEFQgAhAkIAIQMgAkL/////D4MgByAANQIMIhB+fCECIAMgAkIgiHwhAyACQv////8PgyAKIA1+fCECIAMgAkIgiHwhAyACQv////8Pg0IBhiECIANCAYYgAkIgiHwhAyACQv////8PgyAEQv////8Pg3whAiADIAJCIIh8IAV8IQMgAkL/////D4MgDCAOfnwhAiADIAJCIIh8IQMgAkL/////D4MgDyALfnwhAiADIAJCIIh8IQMgAkL/////D4NBADUChAYiEiAIfnwhAiADIAJCIIh8IQMgAkL/////D4MgBn5C/////w+DIREgAkL/////D4MgCSARfnwhAiADIAJCIIh8IQMgAyEEIARCIIghBUIAIQJCACEDIAJC/////w+DIAcgADUCECITfnwhAiADIAJCIIh8IQMgAkL/////D4MgCiAQfnwhAiADIAJCIIh8IQMgAkL/////D4NCAYYhAiADQgGGIAJCIIh8IQMgAkL/////D4MgDSANfnwhAiADIAJCIIh8IQMgAkL/////D4MgBEL/////D4N8IQIgAyACQiCIfCAFfCEDIAJC/////w+DIAwgEX58IQIgAyACQiCIfCEDIAJC/////w+DIA8gDn58IQIgAyACQiCIfCEDIAJC/////w+DIBIgC358IQIgAyACQiCIfCEDIAJC/////w+DQQA1AogGIhUgCH58IQIgAyACQiCIfCEDIAJC/////w+DIAZ+Qv////8PgyEUIAJC/////w+DIAkgFH58IQIgAyACQiCIfCEDIAMhBCAEQiCIIQVCACECQgAhAyACQv////8PgyAHIAA1AhQiFn58IQIgAyACQiCIfCEDIAJC/////w+DIAogE358IQIgAyACQiCIfCEDIAJC/////w+DIA0gEH58IQIgAyACQiCIfCEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIARC/////w+DfCECIAMgAkIgiHwgBXwhAyACQv////8PgyAMIBR+fCECIAMgAkIgiHwhAyACQv////8PgyAPIBF+fCECIAMgAkIgiHwhAyACQv////8PgyASIA5+fCECIAMgAkIgiHwhAyACQv////8PgyAVIAt+fCECIAMgAkIgiHwhAyACQv////8Pg0EANQKMBiIYIAh+fCECIAMgAkIgiHwhAyACQv////8PgyAGfkL/////D4MhFyACQv////8PgyAJIBd+fCECIAMgAkIgiHwhAyADIQQgBEIgiCEFQgAhAkIAIQMgAkL/////D4MgByAANQIYIhl+fCECIAMgAkIgiHwhAyACQv////8PgyAKIBZ+fCECIAMgAkIgiHwhAyACQv////8PgyANIBN+fCECIAMgAkIgiHwhAyACQv////8Pg0IBhiECIANCAYYgAkIgiHwhAyACQv////8PgyAQIBB+fCECIAMgAkIgiHwhAyACQv////8PgyAEQv////8Pg3whAiADIAJCIIh8IAV8IQMgAkL/////D4MgDCAXfnwhAiADIAJCIIh8IQMgAkL/////D4MgDyAUfnwhAiADIAJCIIh8IQMgAkL/////D4MgEiARfnwhAiADIAJCIIh8IQMgAkL/////D4MgFSAOfnwhAiADIAJCIIh8IQMgAkL/////D4MgGCALfnwhAiADIAJCIIh8IQMgAkL/////D4NBADUCkAYiGyAIfnwhAiADIAJCIIh8IQMgAkL/////D4MgBn5C/////w+DIRogAkL/////D4MgCSAafnwhAiADIAJCIIh8IQMgAyEEIARCIIghBUIAIQJCACEDIAJC/////w+DIAcgADUCHCIcfnwhAiADIAJCIIh8IQMgAkL/////D4MgCiAZfnwhAiADIAJCIIh8IQMgAkL/////D4MgDSAWfnwhAiADIAJCIIh8IQMgAkL/////D4MgECATfnwhAiADIAJCIIh8IQMgAkL/////D4NCAYYhAiADQgGGIAJCIIh8IQMgAkL/////D4MgBEL/////D4N8IQIgAyACQiCIfCAFfCEDIAJC/////w+DIAwgGn58IQIgAyACQiCIfCEDIAJC/////w+DIA8gF358IQIgAyACQiCIfCEDIAJC/////w+DIBIgFH58IQIgAyACQiCIfCEDIAJC/////w+DIBUgEX58IQIgAyACQiCIfCEDIAJC/////w+DIBggDn58IQIgAyACQiCIfCEDIAJC/////w+DIBsgC358IQIgAyACQiCIfCEDIAJC/////w+DQQA1ApQGIh4gCH58IQIgAyACQiCIfCEDIAJC/////w+DIAZ+Qv////8PgyEdIAJC/////w+DIAkgHX58IQIgAyACQiCIfCEDIAMhBCAEQiCIIQVCACECQgAhAyACQv////8PgyAHIAA1AiAiH358IQIgAyACQiCIfCEDIAJC/////w+DIAogHH58IQIgAyACQiCIfCEDIAJC/////w+DIA0gGX58IQIgAyACQiCIfCEDIAJC/////w+DIBAgFn58IQIgAyACQiCIfCEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIBMgE358IQIgAyACQiCIfCEDIAJC/////w+DIARC/////w+DfCECIAMgAkIgiHwgBXwhAyACQv////8PgyAMIB1+fCECIAMgAkIgiHwhAyACQv////8PgyAPIBp+fCECIAMgAkIgiHwhAyACQv////8PgyASIBd+fCECIAMgAkIgiHwhAyACQv////8PgyAVIBR+fCECIAMgAkIgiHwhAyACQv////8PgyAYIBF+fCECIAMgAkIgiHwhAyACQv////8PgyAbIA5+fCECIAMgAkIgiHwhAyACQv////8PgyAeIAt+fCECIAMgAkIgiHwhAyACQv////8Pg0EANQKYBiIhIAh+fCECIAMgAkIgiHwhAyACQv////8PgyAGfkL/////D4MhICACQv////8PgyAJICB+fCECIAMgAkIgiHwhAyADIQQgBEIgiCEFQgAhAkIAIQMgAkL/////D4MgByAANQIkIiJ+fCECIAMgAkIgiHwhAyACQv////8PgyAKIB9+fCECIAMgAkIgiHwhAyACQv////8PgyANIBx+fCECIAMgAkIgiHwhAyACQv////8PgyAQIBl+fCECIAMgAkIgiHwhAyACQv////8PgyATIBZ+fCECIAMgAkIgiHwhAyACQv////8Pg0IBhiECIANCAYYgAkIgiHwhAyACQv////8PgyAEQv////8Pg3whAiADIAJCIIh8IAV8IQMgAkL/////D4MgDCAgfnwhAiADIAJCIIh8IQMgAkL/////D4MgDyAdfnwhAiADIAJCIIh8IQMgAkL/////D4MgEiAafnwhAiADIAJCIIh8IQMgAkL/////D4MgFSAXfnwhAiADIAJCIIh8IQMgAkL/////D4MgGCAUfnwhAiADIAJCIIh8IQMgAkL/////D4MgGyARfnwhAiADIAJCIIh8IQMgAkL/////D4MgHiAOfnwhAiADIAJCIIh8IQMgAkL/////D4MgISALfnwhAiADIAJCIIh8IQMgAkL/////D4NBADUCnAYiJCAIfnwhAiADIAJCIIh8IQMgAkL/////D4MgBn5C/////w+DISMgAkL/////D4MgCSAjfnwhAiADIAJCIIh8IQMgAyEEIARCIIghBUIAIQJCACEDIAJC/////w+DIAcgADUCKCIlfnwhAiADIAJCIIh8IQMgAkL/////D4MgCiAifnwhAiADIAJCIIh8IQMgAkL/////D4MgDSAffnwhAiADIAJCIIh8IQMgAkL/////D4MgECAcfnwhAiADIAJCIIh8IQMgAkL/////D4MgEyAZfnwhAiADIAJCIIh8IQMgAkL/////D4NCAYYhAiADQgGGIAJCIIh8IQMgAkL/////D4MgFiAWfnwhAiADIAJCIIh8IQMgAkL/////D4MgBEL/////D4N8IQIgAyACQiCIfCAFfCEDIAJC/////w+DIAwgI358IQIgAyACQiCIfCEDIAJC/////w+DIA8gIH58IQIgAyACQiCIfCEDIAJC/////w+DIBIgHX58IQIgAyACQiCIfCEDIAJC/////w+DIBUgGn58IQIgAyACQiCIfCEDIAJC/////w+DIBggF358IQIgAyACQiCIfCEDIAJC/////w+DIBsgFH58IQIgAyACQiCIfCEDIAJC/////w+DIB4gEX58IQIgAyACQiCIfCEDIAJC/////w+DICEgDn58IQIgAyACQiCIfCEDIAJC/////w+DICQgC358IQIgAyACQiCIfCEDIAJC/////w+DQQA1AqAGIicgCH58IQIgAyACQiCIfCEDIAJC/////w+DIAZ+Qv////8PgyEmIAJC/////w+DIAkgJn58IQIgAyACQiCIfCEDIAMhBCAEQiCIIQVCACECQgAhAyACQv////8PgyAHIAA1AiwiKH58IQIgAyACQiCIfCEDIAJC/////w+DIAogJX58IQIgAyACQiCIfCEDIAJC/////w+DIA0gIn58IQIgAyACQiCIfCEDIAJC/////w+DIBAgH358IQIgAyACQiCIfCEDIAJC/////w+DIBMgHH58IQIgAyACQiCIfCEDIAJC/////w+DIBYgGX58IQIgAyACQiCIfCEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIARC/////w+DfCECIAMgAkIgiHwgBXwhAyACQv////8PgyAMICZ+fCECIAMgAkIgiHwhAyACQv////8PgyAPICN+fCECIAMgAkIgiHwhAyACQv////8PgyASICB+fCECIAMgAkIgiHwhAyACQv////8PgyAVIB1+fCECIAMgAkIgiHwhAyACQv////8PgyAYIBp+fCECIAMgAkIgiHwhAyACQv////8PgyAbIBd+fCECIAMgAkIgiHwhAyACQv////8PgyAeIBR+fCECIAMgAkIgiHwhAyACQv////8PgyAhIBF+fCECIAMgAkIgiHwhAyACQv////8PgyAkIA5+fCECIAMgAkIgiHwhAyACQv////8PgyAnIAt+fCECIAMgAkIgiHwhAyACQv////8Pg0EANQKkBiIqIAh+fCECIAMgAkIgiHwhAyACQv////8PgyAGfkL/////D4MhKSACQv////8PgyAJICl+fCECIAMgAkIgiHwhAyADIQQgBEIgiCEFQgAhAkIAIQMgAkL/////D4MgCiAofnwhAiADIAJCIIh8IQMgAkL/////D4MgDSAlfnwhAiADIAJCIIh8IQMgAkL/////D4MgECAifnwhAiADIAJCIIh8IQMgAkL/////D4MgEyAffnwhAiADIAJCIIh8IQMgAkL/////D4MgFiAcfnwhAiADIAJCIIh8IQMgAkL/////D4NCAYYhAiADQgGGIAJCIIh8IQMgAkL/////D4MgGSAZfnwhAiADIAJCIIh8IQMgAkL/////D4MgBEL/////D4N8IQIgAyACQiCIfCAFfCEDIAJC/////w+DIAwgKX58IQIgAyACQiCIfCEDIAJC/////w+DIA8gJn58IQIgAyACQiCIfCEDIAJC/////w+DIBIgI358IQIgAyACQiCIfCEDIAJC/////w+DIBUgIH58IQIgAyACQiCIfCEDIAJC/////w+DIBggHX58IQIgAyACQiCIfCEDIAJC/////w+DIBsgGn58IQIgAyACQiCIfCEDIAJC/////w+DIB4gF358IQIgAyACQiCIfCEDIAJC/////w+DICEgFH58IQIgAyACQiCIfCEDIAJC/////w+DICQgEX58IQIgAyACQiCIfCEDIAJC/////w+DICcgDn58IQIgAyACQiCIfCEDIAJC/////w+DICogC358IQIgAyACQiCIfCEDIAEgAj4CACADIQQgBEIgiCEFQgAhAkIAIQMgAkL/////D4MgDSAofnwhAiADIAJCIIh8IQMgAkL/////D4MgECAlfnwhAiADIAJCIIh8IQMgAkL/////D4MgEyAifnwhAiADIAJCIIh8IQMgAkL/////D4MgFiAffnwhAiADIAJCIIh8IQMgAkL/////D4MgGSAcfnwhAiADIAJCIIh8IQMgAkL/////D4NCAYYhAiADQgGGIAJCIIh8IQMgAkL/////D4MgBEL/////D4N8IQIgAyACQiCIfCAFfCEDIAJC/////w+DIA8gKX58IQIgAyACQiCIfCEDIAJC/////w+DIBIgJn58IQIgAyACQiCIfCEDIAJC/////w+DIBUgI358IQIgAyACQiCIfCEDIAJC/////w+DIBggIH58IQIgAyACQiCIfCEDIAJC/////w+DIBsgHX58IQIgAyACQiCIfCEDIAJC/////w+DIB4gGn58IQIgAyACQiCIfCEDIAJC/////w+DICEgF358IQIgAyACQiCIfCEDIAJC/////w+DICQgFH58IQIgAyACQiCIfCEDIAJC/////w+DICcgEX58IQIgAyACQiCIfCEDIAJC/////w+DICogDn58IQIgAyACQiCIfCEDIAEgAj4CBCADIQQgBEIgiCEFQgAhAkIAIQMgAkL/////D4MgECAofnwhAiADIAJCIIh8IQMgAkL/////D4MgEyAlfnwhAiADIAJCIIh8IQMgAkL/////D4MgFiAifnwhAiADIAJCIIh8IQMgAkL/////D4MgGSAffnwhAiADIAJCIIh8IQMgAkL/////D4NCAYYhAiADQgGGIAJCIIh8IQMgAkL/////D4MgHCAcfnwhAiADIAJCIIh8IQMgAkL/////D4MgBEL/////D4N8IQIgAyACQiCIfCAFfCEDIAJC/////w+DIBIgKX58IQIgAyACQiCIfCEDIAJC/////w+DIBUgJn58IQIgAyACQiCIfCEDIAJC/////w+DIBggI358IQIgAyACQiCIfCEDIAJC/////w+DIBsgIH58IQIgAyACQiCIfCEDIAJC/////w+DIB4gHX58IQIgAyACQiCIfCEDIAJC/////w+DICEgGn58IQIgAyACQiCIfCEDIAJC/////w+DICQgF358IQIgAyACQiCIfCEDIAJC/////w+DICcgFH58IQIgAyACQiCIfCEDIAJC/////w+DICogEX58IQIgAyACQiCIfCEDIAEgAj4CCCADIQQgBEIgiCEFQgAhAkIAIQMgAkL/////D4MgEyAofnwhAiADIAJCIIh8IQMgAkL/////D4MgFiAlfnwhAiADIAJCIIh8IQMgAkL/////D4MgGSAifnwhAiADIAJCIIh8IQMgAkL/////D4MgHCAffnwhAiADIAJCIIh8IQMgAkL/////D4NCAYYhAiADQgGGIAJCIIh8IQMgAkL/////D4MgBEL/////D4N8IQIgAyACQiCIfCAFfCEDIAJC/////w+DIBUgKX58IQIgAyACQiCIfCEDIAJC/////w+DIBggJn58IQIgAyACQiCIfCEDIAJC/////w+DIBsgI358IQIgAyACQiCIfCEDIAJC/////w+DIB4gIH58IQIgAyACQiCIfCEDIAJC/////w+DICEgHX58IQIgAyACQiCIfCEDIAJC/////w+DICQgGn58IQIgAyACQiCIfCEDIAJC/////w+DICcgF358IQIgAyACQiCIfCEDIAJC/////w+DICogFH58IQIgAyACQiCIfCEDIAEgAj4CDCADIQQgBEIgiCEFQgAhAkIAIQMgAkL/////D4MgFiAofnwhAiADIAJCIIh8IQMgAkL/////D4MgGSAlfnwhAiADIAJCIIh8IQMgAkL/////D4MgHCAifnwhAiADIAJCIIh8IQMgAkL/////D4NCAYYhAiADQgGGIAJCIIh8IQMgAkL/////D4MgHyAffnwhAiADIAJCIIh8IQMgAkL/////D4MgBEL/////D4N8IQIgAyACQiCIfCAFfCEDIAJC/////w+DIBggKX58IQIgAyACQiCIfCEDIAJC/////w+DIBsgJn58IQIgAyACQiCIfCEDIAJC/////w+DIB4gI358IQIgAyACQiCIfCEDIAJC/////w+DICEgIH58IQIgAyACQiCIfCEDIAJC/////w+DICQgHX58IQIgAyACQiCIfCEDIAJC/////w+DICcgGn58IQIgAyACQiCIfCEDIAJC/////w+DICogF358IQIgAyACQiCIfCEDIAEgAj4CECADIQQgBEIgiCEFQgAhAkIAIQMgAkL/////D4MgGSAofnwhAiADIAJCIIh8IQMgAkL/////D4MgHCAlfnwhAiADIAJCIIh8IQMgAkL/////D4MgHyAifnwhAiADIAJCIIh8IQMgAkL/////D4NCAYYhAiADQgGGIAJCIIh8IQMgAkL/////D4MgBEL/////D4N8IQIgAyACQiCIfCAFfCEDIAJC/////w+DIBsgKX58IQIgAyACQiCIfCEDIAJC/////w+DIB4gJn58IQIgAyACQiCIfCEDIAJC/////w+DICEgI358IQIgAyACQiCIfCEDIAJC/////w+DICQgIH58IQIgAyACQiCIfCEDIAJC/////w+DICcgHX58IQIgAyACQiCIfCEDIAJC/////w+DICogGn58IQIgAyACQiCIfCEDIAEgAj4CFCADIQQgBEIgiCEFQgAhAkIAIQMgAkL/////D4MgHCAofnwhAiADIAJCIIh8IQMgAkL/////D4MgHyAlfnwhAiADIAJCIIh8IQMgAkL/////D4NCAYYhAiADQgGGIAJCIIh8IQMgAkL/////D4MgIiAifnwhAiADIAJCIIh8IQMgAkL/////D4MgBEL/////D4N8IQIgAyACQiCIfCAFfCEDIAJC/////w+DIB4gKX58IQIgAyACQiCIfCEDIAJC/////w+DICEgJn58IQIgAyACQiCIfCEDIAJC/////w+DICQgI358IQIgAyACQiCIfCEDIAJC/////w+DICcgIH58IQIgAyACQiCIfCEDIAJC/////w+DICogHX58IQIgAyACQiCIfCEDIAEgAj4CGCADIQQgBEIgiCEFQgAhAkIAIQMgAkL/////D4MgHyAofnwhAiADIAJCIIh8IQMgAkL/////D4MgIiAlfnwhAiADIAJCIIh8IQMgAkL/////D4NCAYYhAiADQgGGIAJCIIh8IQMgAkL/////D4MgBEL/////D4N8IQIgAyACQiCIfCAFfCEDIAJC/////w+DICEgKX58IQIgAyACQiCIfCEDIAJC/////w+DICQgJn58IQIgAyACQiCIfCEDIAJC/////w+DICcgI358IQIgAyACQiCIfCEDIAJC/////w+DICogIH58IQIgAyACQiCIfCEDIAEgAj4CHCADIQQgBEIgiCEFQgAhAkIAIQMgAkL/////D4MgIiAofnwhAiADIAJCIIh8IQMgAkL/////D4NCAYYhAiADQgGGIAJCIIh8IQMgAkL/////D4MgJSAlfnwhAiADIAJCIIh8IQMgAkL/////D4MgBEL/////D4N8IQIgAyACQiCIfCAFfCEDIAJC/////w+DICQgKX58IQIgAyACQiCIfCEDIAJC/////w+DICcgJn58IQIgAyACQiCIfCEDIAJC/////w+DICogI358IQIgAyACQiCIfCEDIAEgAj4CICADIQQgBEIgiCEFQgAhAkIAIQMgAkL/////D4MgJSAofnwhAiADIAJCIIh8IQMgAkL/////D4NCAYYhAiADQgGGIAJCIIh8IQMgAkL/////D4MgBEL/////D4N8IQIgAyACQiCIfCAFfCEDIAJC/////w+DICcgKX58IQIgAyACQiCIfCEDIAJC/////w+DICogJn58IQIgAyACQiCIfCEDIAEgAj4CJCADIQQgBEIgiCEFQgAhAkIAIQMgAkL/////D4NCAYYhAiADQgGGIAJCIIh8IQMgAkL/////D4MgKCAofnwhAiADIAJCIIh8IQMgAkL/////D4MgBEL/////D4N8IQIgAyACQiCIfCAFfCEDIAJC/////w+DICogKX58IQIgAyACQiCIfCEDIAEgAj4CKCADIQQgBEIgiCEFIAEgBD4CLCAFpwRAIAFB+AUgARAHGgUgAUH4BRAFBEAg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IAM+AhAgADUCFCABNQIUfCADQiCIfCEDIAIgAz4CFCAANQIYIAE1Ahh8IANCIIh8IQMgAiADPgIYIAA1AhwgATUCHHwgA0IgiHwhAyACIAM+AhwgA0IgiKcLjAIBAX4gADUCACABNQIAfSEDIAIgA0L/////D4M+AgAgADUCBCABNQIEfSADQiCHfCEDIAIgA0L/////D4M+AgQgADUCCCABNQIIfSADQiCHfCEDIAIgA0L/////D4M+AgggADUCDCABNQIMfSADQiCHfCEDIAIgA0L/////D4M+AgwgADUCECABNQIQfSADQiCHfCEDIAIgA0L/////D4M+AhAgADUCFCABNQIUfSADQiCHfCEDIAIgA0L/////D4M+AhQgADUCGCABNQIYfSADQiCHfCEDIAIgA0L/////D4M+AhggADUCHCABNQIcfSADQiCHfCEDIAIgA0L/////D4M+AhwgA0Igh6cLjxASAX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+IANC/////w+DIAA1AgAiBSABNQIAIgZ+fCEDIAQgA0IgiHwhBCACIAM+AgAgBEIgiCEDIARC/////w+DIAUgATUCBCIIfnwhBCADIARCIIh8IQMgBEL/////D4MgADUCBCIHIAZ+fCEEIAMgBEIgiHwhAyACIAQ+AgQgA0IgiCEEIANC/////w+DIAUgATUCCCIKfnwhAyAEIANCIIh8IQQgA0L/////D4MgByAIfnwhAyAEIANCIIh8IQQgA0L/////D4MgADUCCCIJIAZ+fCEDIAQgA0IgiHwhBCACIAM+AgggBEIgiCEDIARC/////w+DIAUgATUCDCIMfnwhBCADIARCIIh8IQMgBEL/////D4MgByAKfnwhBCADIARCIIh8IQMgBEL/////D4MgCSAIfnwhBCADIARCIIh8IQMgBEL/////D4MgADUCDCILIAZ+fCEEIAMgBEIgiHwhAyACIAQ+AgwgA0IgiCEEIANC/////w+DIAUgATUCECIOfnwhAyAEIANCIIh8IQQgA0L/////D4MgByAMfnwhAyAEIANCIIh8IQQgA0L/////D4MgCSAKfnwhAyAEIANCIIh8IQQgA0L/////D4MgCyAIfnwhAyAEIANCIIh8IQQgA0L/////D4MgADUCECINIAZ+fCEDIAQgA0IgiHwhBCACIAM+AhAgBEIgiCEDIARC/////w+DIAUgATUCFCIQfnwhBCADIARCIIh8IQMgBEL/////D4MgByAOfnwhBCADIARCIIh8IQMgBEL/////D4MgCSAMfnwhBCADIARCIIh8IQMgBEL/////D4MgCyAKfnwhBCADIARCIIh8IQMgBEL/////D4MgDSAIfnwhBCADIARCIIh8IQMgBEL/////D4MgADUCFCIPIAZ+fCEEIAMgBEIgiHwhAyACIAQ+AhQgA0IgiCEEIANC/////w+DIAUgATUCGCISfnwhAyAEIANCIIh8IQQgA0L/////D4MgByAQfnwhAyAEIANCIIh8IQQgA0L/////D4MgCSAOfnwhAyAEIANCIIh8IQQgA0L/////D4MgCyAMfnwhAyAEIANCIIh8IQQgA0L/////D4MgDSAKfnwhAyAEIANCIIh8IQQgA0L/////D4MgDyAIfnwhAyAEIANCIIh8IQQgA0L/////D4MgADUCGCIRIAZ+fCEDIAQgA0IgiHwhBCACIAM+AhggBEIgiCEDIARC/////w+DIAUgATUCHCIUfnwhBCADIARCIIh8IQMgBEL/////D4MgByASfnwhBCADIARCIIh8IQMgBEL/////D4MgCSAQfnwhBCADIARCIIh8IQMgBEL/////D4MgCyAOfnwhBCADIARCIIh8IQMgBEL/////D4MgDSAMfnwhBCADIARCIIh8IQMgBEL/////D4MgDyAKfnwhBCADIARCIIh8IQMgBEL/////D4MgESAIfnwhBCADIARCIIh8IQMgBEL/////D4MgADUCHCITIAZ+fCEEIAMgBEIgiHwhAyACIAQ+AhwgA0IgiCEEIANC/////w+DIAcgFH58IQMgBCADQiCIfCEEIANC/////w+DIAkgEn58IQMgBCADQiCIfCEEIANC/////w+DIAsgEH58IQMgBCADQiCIfCEEIANC/////w+DIA0gDn58IQMgBCADQiCIfCEEIANC/////w+DIA8gDH58IQMgBCADQiCIfCEEIANC/////w+DIBEgCn58IQMgBCADQiCIfCEEIANC/////w+DIBMgCH58IQMgBCADQiCIfCEEIAIgAz4CICAEQiCIIQMgBEL/////D4MgCSAUfnwhBCADIARCIIh8IQMgBEL/////D4MgCyASfnwhBCADIARCIIh8IQMgBEL/////D4MgDSAQfnwhBCADIARCIIh8IQMgBEL/////D4MgDyAOfnwhBCADIARCIIh8IQMgBEL/////D4MgESAMfnwhBCADIARCIIh8IQMgBEL/////D4MgEyAKfnwhBCADIARCIIh8IQMgAiAEPgIkIANCIIghBCADQv////8PgyALIBR+fCEDIAQgA0IgiHwhBCADQv////8PgyANIBJ+fCEDIAQgA0IgiHwhBCADQv////8PgyAPIBB+fCEDIAQgA0IgiHwhBCADQv////8PgyARIA5+fCEDIAQgA0IgiHwhBCADQv////8PgyATIAx+fCEDIAQgA0IgiHwhBCACIAM+AiggBEIgiCEDIARC/////w+DIA0gFH58IQQgAyAEQiCIfCEDIARC/////w+DIA8gEn58IQQgAyAEQiCIfCEDIARC/////w+DIBEgEH58IQQgAyAEQiCIfCEDIARC/////w+DIBMgDn58IQQgAyAEQiCIfCEDIAIgBD4CLCADQiCIIQQgA0L/////D4MgDyAUfnwhAyAEIANCIIh8IQQgA0L/////D4MgESASfnwhAyAEIANCIIh8IQQgA0L/////D4MgEyAQfnwhAyAEIANCIIh8IQQgAiADPgIwIARCIIghAyAEQv////8PgyARIBR+fCEEIAMgBEIgiHwhAyAEQv////8PgyATIBJ+fCEEIAMgBEIgiHwhAyACIAQ+AjQgA0IgiCEEIANC/////w+DIBMgFH58IQMgBCADQiCIfCEEIAIgAz4COCAEQiCIIQMgAiAEPgI8C4wSDAF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfkIAIQJCACEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIAA1AgAiBiAGfnwhAiADIAJCIIh8IQMgASACPgIAIAMhBCAEQiCIIQVCACECQgAhAyACQv////8PgyAGIAA1AgQiB358IQIgAyACQiCIfCEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIARC/////w+DfCECIAMgAkIgiHwgBXwhAyABIAI+AgQgAyEEIARCIIghBUIAIQJCACEDIAJC/////w+DIAYgADUCCCIIfnwhAiADIAJCIIh8IQMgAkL/////D4NCAYYhAiADQgGGIAJCIIh8IQMgAkL/////D4MgByAHfnwhAiADIAJCIIh8IQMgAkL/////D4MgBEL/////D4N8IQIgAyACQiCIfCAFfCEDIAEgAj4CCCADIQQgBEIgiCEFQgAhAkIAIQMgAkL/////D4MgBiAANQIMIgl+fCECIAMgAkIgiHwhAyACQv////8PgyAHIAh+fCECIAMgAkIgiHwhAyACQv////8Pg0IBhiECIANCAYYgAkIgiHwhAyACQv////8PgyAEQv////8Pg3whAiADIAJCIIh8IAV8IQMgASACPgIMIAMhBCAEQiCIIQVCACECQgAhAyACQv////8PgyAGIAA1AhAiCn58IQIgAyACQiCIfCEDIAJC/////w+DIAcgCX58IQIgAyACQiCIfCEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIAggCH58IQIgAyACQiCIfCEDIAJC/////w+DIARC/////w+DfCECIAMgAkIgiHwgBXwhAyABIAI+AhAgAyEEIARCIIghBUIAIQJCACEDIAJC/////w+DIAYgADUCFCILfnwhAiADIAJCIIh8IQMgAkL/////D4MgByAKfnwhAiADIAJCIIh8IQMgAkL/////D4MgCCAJfnwhAiADIAJCIIh8IQMgAkL/////D4NCAYYhAiADQgGGIAJCIIh8IQMgAkL/////D4MgBEL/////D4N8IQIgAyACQiCIfCAFfCEDIAEgAj4CFCADIQQgBEIgiCEFQgAhAkIAIQMgAkL/////D4MgBiAANQIYIgx+fCECIAMgAkIgiHwhAyACQv////8PgyAHIAt+fCECIAMgAkIgiHwhAyACQv////8PgyAIIAp+fCECIAMgAkIgiHwhAyACQv////8Pg0IBhiECIANCAYYgAkIgiHwhAyACQv////8PgyAJIAl+fCECIAMgAkIgiHwhAyACQv////8PgyAEQv////8Pg3whAiADIAJCIIh8IAV8IQMgASACPgIYIAMhBCAEQiCIIQVCACECQgAhAyACQv////8PgyAGIAA1AhwiDX58IQIgAyACQiCIfCEDIAJC/////w+DIAcgDH58IQIgAyACQiCIfCEDIAJC/////w+DIAggC358IQIgAyACQiCIfCEDIAJC/////w+DIAkgCn58IQIgAyACQiCIfCEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIARC/////w+DfCECIAMgAkIgiHwgBXwhAyABIAI+AhwgAyEEIARCIIghBUIAIQJCACEDIAJC/////w+DIAcgDX58IQIgAyACQiCIfCEDIAJC/////w+DIAggDH58IQIgAyACQiCIfCEDIAJC/////w+DIAkgC358IQIgAyACQiCIfCEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIAogCn58IQIgAyACQiCIfCEDIAJC/////w+DIARC/////w+DfCECIAMgAkIgiHwgBXwhAyABIAI+AiAgAyEEIARCIIghBUIAIQJCACEDIAJC/////w+DIAggDX58IQIgAyACQiCIfCEDIAJC/////w+DIAkgDH58IQIgAyACQiCIfCEDIAJC/////w+DIAogC358IQIgAyACQiCIfCEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIARC/////w+DfCECIAMgAkIgiHwgBXwhAyABIAI+AiQgAyEEIARCIIghBUIAIQJCACEDIAJC/////w+DIAkgDX58IQIgAyACQiCIfCEDIAJC/////w+DIAogDH58IQIgAyACQiCIfCEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIAsgC358IQIgAyACQiCIfCEDIAJC/////w+DIARC/////w+DfCECIAMgAkIgiHwgBXwhAyABIAI+AiggAyEEIARCIIghBUIAIQJCACEDIAJC/////w+DIAogDX58IQIgAyACQiCIfCEDIAJC/////w+DIAsgDH58IQIgAyACQiCIfCEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIARC/////w+DfCECIAMgAkIgiHwgBXwhAyABIAI+AiwgAyEEIARCIIghBUIAIQJCACEDIAJC/////w+DIAsgDX58IQIgAyACQiCIfCEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIAwgDH58IQIgAyACQiCIfCEDIAJC/////w+DIARC/////w+DfCECIAMgAkIgiHwgBXwhAyABIAI+AjAgAyEE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iHwhBCAEQiCIIQMgBEL/////D4MgBiABNQIEIgt+fCEEIAMgBEIgiHwhAyAEQv////8PgyAANQIEIgogB358IQQgAyAEQiCIfCEDIARC/////w+DQQA1ArwcIg0gCH58IQQgAyAEQiCIfCEDIARC/////w+DIAV+Qv////8PgyEMIARC/////w+DIAkgDH58IQQgAyAEQiCIfCEDIANCIIghBCADQv////8PgyAGIAE1AggiD358IQMgBCADQiCIfCEEIANC/////w+DIAogC358IQMgBCADQiCIfCEEIANC/////w+DIAA1AggiDiAHfnwhAyAEIANCIIh8IQQgA0L/////D4MgDSAMfnwhAyAEIANCIIh8IQQgA0L/////D4NBADUCwBwiESAIfnwhAyAEIANCIIh8IQQgA0L/////D4MgBX5C/////w+DIRAgA0L/////D4MgCSAQfnwhAyAEIANCIIh8IQQgBEIgiCEDIARC/////w+DIAYgATUCDCITfnwhBCADIARCIIh8IQMgBEL/////D4MgCiAPfnwhBCADIARCIIh8IQMgBEL/////D4MgDiALfnwhBCADIARCIIh8IQMgBEL/////D4MgADUCDCISIAd+fCEEIAMgBEIgiHwhAyAEQv////8PgyANIBB+fCEEIAMgBEIgiHwhAyAEQv////8PgyARIAx+fCEEIAMgBEIgiHwhAyAEQv////8Pg0EANQLEHCIVIAh+fCEEIAMgBEIgiHwhAyAEQv////8PgyAFfkL/////D4MhFCAEQv////8PgyAJIBR+fCEEIAMgBEIgiHwhAyADQiCIIQQgA0L/////D4MgBiABNQIQIhd+fCEDIAQgA0IgiHwhBCADQv////8PgyAKIBN+fCEDIAQgA0IgiHwhBCADQv////8PgyAOIA9+fCEDIAQgA0IgiHwhBCADQv////8PgyASIAt+fCEDIAQgA0IgiHwhBCADQv////8PgyAANQIQIhYgB358IQMgBCADQiCIfCEEIANC/////w+DIA0gFH58IQMgBCADQiCIfCEEIANC/////w+DIBEgEH58IQMgBCADQiCIfCEEIANC/////w+DIBUgDH58IQMgBCADQiCIfCEEIANC/////w+DQQA1AsgcIhkgCH58IQMgBCADQiCIfCEEIANC/////w+DIAV+Qv////8PgyEYIANC/////w+DIAkgGH58IQMgBCADQiCIfCEEIARCIIghAyAEQv////8PgyAGIAE1AhQiG358IQQgAyAEQiCIfCEDIARC/////w+DIAogF358IQQgAyAEQiCIfCEDIARC/////w+DIA4gE358IQQgAyAEQiCIfCEDIARC/////w+DIBIgD358IQQgAyAEQiCIfCEDIARC/////w+DIBYgC358IQQgAyAEQiCIfCEDIARC/////w+DIAA1AhQiGiAHfnwhBCADIARCIIh8IQMgBEL/////D4MgDSAYfnwhBCADIARCIIh8IQMgBEL/////D4MgESAUfnwhBCADIARCIIh8IQMgBEL/////D4MgFSAQfnwhBCADIARCIIh8IQMgBEL/////D4MgGSAMfnwhBCADIARCIIh8IQMgBEL/////D4NBADUCzBwiHSAIfnwhBCADIARCIIh8IQMgBEL/////D4MgBX5C/////w+DIRwgBEL/////D4MgCSAcfnwhBCADIARCIIh8IQMgA0IgiCEEIANC/////w+DIAYgATUCGCIffnwhAyAEIANCIIh8IQQgA0L/////D4MgCiAbfnwhAyAEIANCIIh8IQQgA0L/////D4MgDiAXfnwhAyAEIANCIIh8IQQgA0L/////D4MgEiATfnwhAyAEIANCIIh8IQQgA0L/////D4MgFiAPfnwhAyAEIANCIIh8IQQgA0L/////D4MgGiALfnwhAyAEIANCIIh8IQQgA0L/////D4MgADUCGCIeIAd+fCEDIAQgA0IgiHwhBCADQv////8PgyANIBx+fCEDIAQgA0IgiHwhBCADQv////8PgyARIBh+fCEDIAQgA0IgiHwhBCADQv////8PgyAVIBR+fCEDIAQgA0IgiHwhBCADQv////8PgyAZIBB+fCEDIAQgA0IgiHwhBCADQv////8PgyAdIAx+fCEDIAQgA0IgiHwhBCADQv////8Pg0EANQLQHCIhIAh+fCEDIAQgA0IgiHwhBCADQv////8PgyAFfkL/////D4MhICADQv////8PgyAJICB+fCEDIAQgA0IgiHwhBCAEQiCIIQMgBEL/////D4MgBiABNQIcIiN+fCEEIAMgBEIgiHwhAyAEQv////8PgyAKIB9+fCEEIAMgBEIgiHwhAyAEQv////8PgyAOIBt+fCEEIAMgBEIgiHwhAyAEQv////8PgyASIBd+fCEEIAMgBEIgiHwhAyAEQv////8PgyAWIBN+fCEEIAMgBEIgiHwhAyAEQv////8PgyAaIA9+fCEEIAMgBEIgiHwhAyAEQv////8PgyAeIAt+fCEEIAMgBEIgiHwhAyAEQv////8PgyAANQIcIiIgB358IQQgAyAEQiCIfCEDIARC/////w+DIA0gIH58IQQgAyAEQiCIfCEDIARC/////w+DIBEgHH58IQQgAyAEQiCIfCEDIARC/////w+DIBUgGH58IQQgAyAEQiCIfCEDIARC/////w+DIBkgFH58IQQgAyAEQiCIfCEDIARC/////w+DIB0gEH58IQQgAyAEQiCIfCEDIARC/////w+DICEgDH58IQQgAyAEQiCIfCEDIARC/////w+DQQA1AtQcIiUgCH58IQQgAyAEQiCIfCEDIARC/////w+DIAV+Qv////8PgyEkIARC/////w+DIAkgJH58IQQgAyAEQiCIfCEDIANCIIghBCADQv////8PgyAKICN+fCEDIAQgA0IgiHwhBCADQv////8PgyAOIB9+fCEDIAQgA0IgiHwhBCADQv////8PgyASIBt+fCEDIAQgA0IgiHwhBCADQv////8PgyAWIBd+fCEDIAQgA0IgiHwhBCADQv////8PgyAaIBN+fCEDIAQgA0IgiHwhBCADQv////8PgyAeIA9+fCEDIAQgA0IgiHwhBCADQv////8PgyAiIAt+fCEDIAQgA0IgiHwhBCADQv////8PgyANICR+fCEDIAQgA0IgiHwhBCADQv////8PgyARICB+fCEDIAQgA0IgiHwhBCADQv////8PgyAVIBx+fCEDIAQgA0IgiHwhBCADQv////8PgyAZIBh+fCEDIAQgA0IgiHwhBCADQv////8PgyAdIBR+fCEDIAQgA0IgiHwhBCADQv////8PgyAhIBB+fCEDIAQgA0IgiHwhBCADQv////8PgyAlIAx+fCEDIAQgA0IgiHwhBCACIAM+AgAgBEIgiCEDIARC/////w+DIA4gI358IQQgAyAEQiCIfCEDIARC/////w+DIBIgH358IQQgAyAEQiCIfCEDIARC/////w+DIBYgG358IQQgAyAEQiCIfCEDIARC/////w+DIBogF358IQQgAyAEQiCIfCEDIARC/////w+DIB4gE358IQQgAyAEQiCIfCEDIARC/////w+DICIgD358IQQgAyAEQiCIfCEDIARC/////w+DIBEgJH58IQQgAyAEQiCIfCEDIARC/////w+DIBUgIH58IQQgAyAEQiCIfCEDIARC/////w+DIBkgHH58IQQgAyAEQiCIfCEDIARC/////w+DIB0gGH58IQQgAyAEQiCIfCEDIARC/////w+DICEgFH58IQQgAyAEQiCIfCEDIARC/////w+DICUgEH58IQQgAyAEQiCIfCEDIAIgBD4CBCADQiCIIQQgA0L/////D4MgEiAjfnwhAyAEIANCIIh8IQQgA0L/////D4MgFiAffnwhAyAEIANCIIh8IQQgA0L/////D4MgGiAbfnwhAyAEIANCIIh8IQQgA0L/////D4MgHiAXfnwhAyAEIANCIIh8IQQgA0L/////D4MgIiATfnwhAyAEIANCIIh8IQQgA0L/////D4MgFSAkfnwhAyAEIANCIIh8IQQgA0L/////D4MgGSAgfnwhAyAEIANCIIh8IQQgA0L/////D4MgHSAcfnwhAyAEIANCIIh8IQQgA0L/////D4MgISAYfnwhAyAEIANCIIh8IQQgA0L/////D4MgJSAUfnwhAyAEIANCIIh8IQQgAiADPgIIIARCIIghAyAEQv////8PgyAWICN+fCEEIAMgBEIgiHwhAyAEQv////8PgyAaIB9+fCEEIAMgBEIgiHwhAyAEQv////8PgyAeIBt+fCEEIAMgBEIgiHwhAyAEQv////8PgyAiIBd+fCEEIAMgBEIgiHwhAyAEQv////8PgyAZICR+fCEEIAMgBEIgiHwhAyAEQv////8PgyAdICB+fCEEIAMgBEIgiHwhAyAEQv////8PgyAhIBx+fCEEIAMgBEIgiHwhAyAEQv////8PgyAlIBh+fCEEIAMgBEIgiHwhAyACIAQ+AgwgA0IgiCEEIANC/////w+DIBogI358IQMgBCADQiCIfCEEIANC/////w+DIB4gH358IQMgBCADQiCIfCEEIANC/////w+DICIgG358IQMgBCADQiCIfCEEIANC/////w+DIB0gJH58IQMgBCADQiCIfCEEIANC/////w+DICEgIH58IQMgBCADQiCIfCEEIANC/////w+DICUgHH58IQMgBCADQiCIfCEEIAIgAz4CECAEQiCIIQMgBEL/////D4MgHiAjfnwhBCADIARCIIh8IQMgBEL/////D4MgIiAffnwhBCADIARCIIh8IQMgBEL/////D4MgISAkfnwhBCADIARCIIh8IQMgBEL/////D4MgJSAgfnwhBCADIARCIIh8IQMgAiAEPgIUIANCIIghBCADQv////8PgyAiICN+fCEDIAQgA0IgiHwhBCADQv////8PgyAlICR+fCEDIAQgA0IgiHwhBCACIAM+AhggBEIgiCEDIAIgBD4CHCADpwRAIAJBuBwgAhAsGgUgAkG4HBAqBEAgAkG4HCACECwaCwsLuyEdAX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfgF+AX4BfkL/////DyEGQgAhAkIAIQMgAkL/////D4NCAYYhAiADQgGGIAJCIIh8IQMgAkL/////D4MgADUCACIHIAd+fCECIAMgAkIgiHwhAyACQv////8PgyAGfkL/////D4MhCCACQv////8Pg0EANQK4HCIJIAh+fCECIAMgAkIgiHwhAyADIQQgBEIgiCEFQgAhAkIAIQMgAkL/////D4MgByAANQIEIgp+fCECIAMgAkIgiHwhAyACQv////8Pg0IBhiECIANCAYYgAkIgiHwhAyACQv////8PgyAEQv////8Pg3whAiADIAJCIIh8IAV8IQMgAkL/////D4NBADUCvBwiDCAIfnwhAiADIAJCIIh8IQMgAkL/////D4MgBn5C/////w+DIQsgAkL/////D4MgCSALfnwhAiADIAJCIIh8IQMgAyEEIARCIIghBUIAIQJCACEDIAJC/////w+DIAcgADUCCCINfnwhAiADIAJCIIh8IQMgAkL/////D4NCAYYhAiADQgGGIAJCIIh8IQMgAkL/////D4MgCiAKfnwhAiADIAJCIIh8IQMgAkL/////D4MgBEL/////D4N8IQIgAyACQiCIfCAFfCEDIAJC/////w+DIAwgC358IQIgAyACQiCIfCEDIAJC/////w+DQQA1AsAcIg8gCH58IQIgAyACQiCIfCEDIAJC/////w+DIAZ+Qv////8PgyEOIAJC/////w+DIAkgDn58IQIgAyACQiCIfCEDIAMhBCAEQiCIIQVCACECQgAhAyACQv////8PgyAHIAA1AgwiEH58IQIgAyACQiCIfCEDIAJC/////w+DIAogDX58IQIgAyACQiCIfCEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIARC/////w+DfCECIAMgAkIgiHwgBXwhAyACQv////8PgyAMIA5+fCECIAMgAkIgiHwhAyACQv////8PgyAPIAt+fCECIAMgAkIgiHwhAyACQv////8Pg0EANQLEHCISIAh+fCECIAMgAkIgiHwhAyACQv////8PgyAGfkL/////D4MhESACQv////8PgyAJIBF+fCECIAMgAkIgiHwhAyADIQQgBEIgiCEFQgAhAkIAIQMgAkL/////D4MgByAANQIQIhN+fCECIAMgAkIgiHwhAyACQv////8PgyAKIBB+fCECIAMgAkIgiHwhAyACQv////8Pg0IBhiECIANCAYYgAkIgiHwhAyACQv////8PgyANIA1+fCECIAMgAkIgiHwhAyACQv////8PgyAEQv////8Pg3whAiADIAJCIIh8IAV8IQMgAkL/////D4MgDCARfnwhAiADIAJCIIh8IQMgAkL/////D4MgDyAOfnwhAiADIAJCIIh8IQMgAkL/////D4MgEiALfnwhAiADIAJCIIh8IQMgAkL/////D4NBADUCyBwiFSAIfnwhAiADIAJCIIh8IQMgAkL/////D4MgBn5C/////w+DIRQgAkL/////D4MgCSAUfnwhAiADIAJCIIh8IQMgAyEEIARCIIghBUIAIQJCACEDIAJC/////w+DIAcgADUCFCIWfnwhAiADIAJCIIh8IQMgAkL/////D4MgCiATfnwhAiADIAJCIIh8IQMgAkL/////D4MgDSAQfnwhAiADIAJCIIh8IQMgAkL/////D4NCAYYhAiADQgGGIAJCIIh8IQMgAkL/////D4MgBEL/////D4N8IQIgAyACQiCIfCAFfCEDIAJC/////w+DIAwgFH58IQIgAyACQiCIfCEDIAJC/////w+DIA8gEX58IQIgAyACQiCIfCEDIAJC/////w+DIBIgDn58IQIgAyACQiCIfCEDIAJC/////w+DIBUgC358IQIgAyACQiCIfCEDIAJC/////w+DQQA1AswcIhggCH58IQIgAyACQiCIfCEDIAJC/////w+DIAZ+Qv////8PgyEXIAJC/////w+DIAkgF358IQIgAyACQiCIfCEDIAMhBCAEQiCIIQVCACECQgAhAyACQv////8PgyAHIAA1AhgiGX58IQIgAyACQiCIfCEDIAJC/////w+DIAogFn58IQIgAyACQiCIfCEDIAJC/////w+DIA0gE358IQIgAyACQiCIfCEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIBAgEH58IQIgAyACQiCIfCEDIAJC/////w+DIARC/////w+DfCECIAMgAkIgiHwgBXwhAyACQv////8PgyAMIBd+fCECIAMgAkIgiHwhAyACQv////8PgyAPIBR+fCECIAMgAkIgiHwhAyACQv////8PgyASIBF+fCECIAMgAkIgiHwhAyACQv////8PgyAVIA5+fCECIAMgAkIgiHwhAyACQv////8PgyAYIAt+fCECIAMgAkIgiHwhAyACQv////8Pg0EANQLQHCIbIAh+fCECIAMgAkIgiHwhAyACQv////8PgyAGfkL/////D4MhGiACQv////8PgyAJIBp+fCECIAMgAkIgiHwhAyADIQQgBEIgiCEFQgAhAkIAIQMgAkL/////D4MgByAANQIcIhx+fCECIAMgAkIgiHwhAyACQv////8PgyAKIBl+fCECIAMgAkIgiHwhAyACQv////8PgyANIBZ+fCECIAMgAkIgiHwhAyACQv////8PgyAQIBN+fCECIAMgAkIgiHwhAyACQv////8Pg0IBhiECIANCAYYgAkIgiHwhAyACQv////8PgyAEQv////8Pg3whAiADIAJCIIh8IAV8IQMgAkL/////D4MgDCAafnwhAiADIAJCIIh8IQMgAkL/////D4MgDyAXfnwhAiADIAJCIIh8IQMgAkL/////D4MgEiAUfnwhAiADIAJCIIh8IQMgAkL/////D4MgFSARfnwhAiADIAJCIIh8IQMgAkL/////D4MgGCAOfnwhAiADIAJCIIh8IQMgAkL/////D4MgGyALfnwhAiADIAJCIIh8IQMgAkL/////D4NBADUC1BwiHiAIfnwhAiADIAJCIIh8IQMgAkL/////D4MgBn5C/////w+DIR0gAkL/////D4MgCSAdfnwhAiADIAJCIIh8IQMgAyEEIARCIIghBUIAIQJCACEDIAJC/////w+DIAogHH58IQIgAyACQiCIfCEDIAJC/////w+DIA0gGX58IQIgAyACQiCIfCEDIAJC/////w+DIBAgFn58IQIgAyACQiCIfCEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIBMgE358IQIgAyACQiCIfCEDIAJC/////w+DIARC/////w+DfCECIAMgAkIgiHwgBXwhAyACQv////8PgyAMIB1+fCECIAMgAkIgiHwhAyACQv////8PgyAPIBp+fCECIAMgAkIgiHwhAyACQv////8PgyASIBd+fCECIAMgAkIgiHwhAyACQv////8PgyAVIBR+fCECIAMgAkIgiHwhAyACQv////8PgyAYIBF+fCECIAMgAkIgiHwhAyACQv////8PgyAbIA5+fCECIAMgAkIgiHwhAyACQv////8PgyAeIAt+fCECIAMgAkIgiHwhAyABIAI+AgAgAyEEIARCIIghBUIAIQJCACEDIAJC/////w+DIA0gHH58IQIgAyACQiCIfCEDIAJC/////w+DIBAgGX58IQIgAyACQiCIfCEDIAJC/////w+DIBMgFn58IQIgAyACQiCIfCEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIARC/////w+DfCECIAMgAkIgiHwgBXwhAyACQv////8PgyAPIB1+fCECIAMgAkIgiHwhAyACQv////8PgyASIBp+fCECIAMgAkIgiHwhAyACQv////8PgyAVIBd+fCECIAMgAkIgiHwhAyACQv////8PgyAYIBR+fCECIAMgAkIgiHwhAyACQv////8PgyAbIBF+fCECIAMgAkIgiHwhAyACQv////8PgyAeIA5+fCECIAMgAkIgiHwhAyABIAI+AgQgAyEEIARCIIghBUIAIQJCACEDIAJC/////w+DIBAgHH58IQIgAyACQiCIfCEDIAJC/////w+DIBMgGX58IQIgAyACQiCIfCEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIBYgFn58IQIgAyACQiCIfCEDIAJC/////w+DIARC/////w+DfCECIAMgAkIgiHwgBXwhAyACQv////8PgyASIB1+fCECIAMgAkIgiHwhAyACQv////8PgyAVIBp+fCECIAMgAkIgiHwhAyACQv////8PgyAYIBd+fCECIAMgAkIgiHwhAyACQv////8PgyAbIBR+fCECIAMgAkIgiHwhAyACQv////8PgyAeIBF+fCECIAMgAkIgiHwhAyABIAI+AgggAyEEIARCIIghBUIAIQJCACEDIAJC/////w+DIBMgHH58IQIgAyACQiCIfCEDIAJC/////w+DIBYgGX58IQIgAyACQiCIfCEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIARC/////w+DfCECIAMgAkIgiHwgBXwhAyACQv////8PgyAVIB1+fCECIAMgAkIgiHwhAyACQv////8PgyAYIBp+fCECIAMgAkIgiHwhAyACQv////8PgyAbIBd+fCECIAMgAkIgiHwhAyACQv////8PgyAeIBR+fCECIAMgAkIgiHwhAyABIAI+AgwgAyEEIARCIIghBUIAIQJCACEDIAJC/////w+DIBYgHH58IQIgAyACQiCIfCEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIBkgGX58IQIgAyACQiCIfCEDIAJC/////w+DIARC/////w+DfCECIAMgAkIgiHwgBXwhAyACQv////8PgyAYIB1+fCECIAMgAkIgiHwhAyACQv////8PgyAbIBp+fCECIAMgAkIgiHwhAyACQv////8PgyAeIBd+fCECIAMgAkIgiHwhAyABIAI+AhAgAyEEIARCIIghBUIAIQJCACEDIAJC/////w+DIBkgHH58IQIgAyACQiCIfCEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIARC/////w+DfCECIAMgAkIgiHwgBXwhAyACQv////8PgyAbIB1+fCECIAMgAkIgiHwhAyACQv////8PgyAeIBp+fCECIAMgAkIgiHwhAyABIAI+AhQgAyEEIARCIIghBUIAIQJCACEDIAJC/////w+DQgGGIQIgA0IBhiACQiCIfCEDIAJC/////w+DIBwgHH58IQIgAyACQiCIfCEDIAJC/////w+DIARC/////w+DfCECIAMgAkIgiHwgBXwhAyACQv////8PgyAeIB1+fCECIAMgAkIgiHwhAyABIAI+AhggAyEEIARCIIghBSABIAQ+AhwgBacEQCABQbgcIAEQLBoFIAFBuBwQKgRAIAFBuBwgARAsGgsLCwoAIAAgACABEDkLCwAgAEH4HCABEDkLFQAgAEGYIxAlQbgjECZBmCMgARA4CxEAIABB2CMQPUHYI0H4HRAqCyQAIAAQJwRAQQAPCyAAQfgjED1B+CNB+B0QKgRAQX8PC0EBDwsXACAAIAEQPSABQbgcIAEQMyABIAEQPAsJAEGYHSAAECULywEEAX8BfwF/AX8gAhAmQSAhBSAAIQMCQANAIAUgAUsNASAFQSBGBEBBmCQQQQVBmCRB+BxBmCQQOQsgA0GYJEG4JBA5IAJBuCQgAhA1IANBIGohAyAFQSBqIQUMAAsLIAFBIHAhBCAERQRADwtBuCQQJkEAIQYCQANAIAYgBEYNASAGIAMtAAA6ALgkIANBAWohAyAGQQFqIQYMAAsLIAVBIEYEQEGYJBBBBUGYJEH4HEGYJBA5C0G4JEGYJEG4JBA5IAJBuCQgAhA1CxwAIAEgAkHYJBBCQdgkQdgkEDwgAEHYJCADEDkL+AEEAX8BfwF/AX9BACgCACEFQQAgBSACQQFqQSBsajYCACAFEEEgACEGIAVBIGohBUEAIQgCQANAIAggAkYNASAGECcEQCAFQSBrIAUQJQUgBiAFQSBrIAUQOQsgBiABaiEGIAVBIGohBSAIQQFqIQgMAAsLIAYgAWshBiAFQSBrIQUgAyACQQFrIARsaiEHIAUgBRBAAkADQCAIRQ0BIAYQJwRAIAUgBUEgaxAlIAcQJgUgBUEga0H4JBAlIAUgBiAFQSBrEDkgBUH4JCAHEDkLIAYgAWshBiAHIARrIQcgBUEgayEFIAhBAWshCAwACwtBACAFNgIACz4DAX8BfwF/IAAhBCACIQVBACEDAkADQCADIAFGDQEgBCAFEDwgBEEgaiEEIAVBIGohBSADQQFqIQMMAAsLCz4DAX8BfwF/IAAhBCACIQVBACEDAkADQCADIAFGDQEgBCAFED0gBEEgaiEEIAVBIGohBSADQQFqIQMMAAsLC7ICAgF/AX8gAkUEQCADEEEPCyAAQZglECUgAxBBIAIhBAJAA0AgBEEBayEEIAEgBGotAAAhBSADIAMQOiAFQYABTwRAIAVBgAFrIQUgA0GYJSADEDkLIAMgAxA6IAVBwABPBEAgBUHAAGshBSADQZglIAMQOQsgAyADEDogBUEgTwRAIAVBIGshBSADQZglIAMQOQsgAyADEDogBUEQTwRAIAVBEGshBSADQZglIAMQOQsgAyADEDogBUEITwRAIAVBCGshBSADQZglIAMQOQsgAyADEDogBUEETwRAIAVBBGshBSADQZglIAMQOQsgAyADEDogBUECTwRAIAVBAmshBSADQZglIAMQOQsgAyADEDogBUEBTwRAIAVBAWshBSADQZglIAMQOQsgBEUNAQwACwsL3gEDAX8BfwF/IAAQJwRAIAEQJg8LQSAhAkHYHkG4JRAlIABBuB5BIEHYJRBHIABB+B5BIEH4JRBHAkADQEHYJUGYHRApDQFB2CVBmCYQOkEBIQMCQANAQZgmQZgdECkNAUGYJkGYJhA6IANBAWohAwwACwtBuCVBuCYQJSACIANrQQFrIQQCQANAIARFDQFBuCZBuCYQOiAEQQFrIQQMAAsLIAMhAkG4JkG4JRA6QdglQbglQdglEDlB+CVBuCZB+CUQOQwACwtB+CUQPgRAQfglIAEQNwVB+CUgARAlCwsgACAAECcEQEEBDwsgAEHYHUEgQdgmEEdB2CZBmB0QKQsVACAAIAFB+CYQOUH4JkH4HCACEDkLCgAgACAAIAEQSgsLACAAQbgcIAEQMwsJACAAQfgdECoLDgAgABACIABBMGoQAnELCgAgAEHgAGoQAgsNACAAEAEgAEEwahABCxUAIAAQASAAQTBqEBwgAEHgAGoQAQt6ACABIAApAwA3AwAgASAAKQMINwMIIAEgACkDEDcDECABIAApAxg3AxggASAAKQMgNwMgIAEgACkDKDcDKCABIAApAzA3AzAgASAAKQM4NwM4IAEgACkDQDcDQCABIAApA0g3A0ggASAAKQNQNwNQIAEgACkDWDcDWAu6AQAgASAAKQMANwMAIAEgACkDCDcDCCABIAApAxA3AxAgASAAKQMYNwMYIAEgACkDIDcDICABIAApAyg3AyggASAAKQMwNwMwIAEgACkDODcDOCABIAApA0A3A0AgASAAKQNINwNIIAEgACkDUDcDUCABIAApA1g3A1ggASAAKQNgNwNgIAEgACkDaDcDaCABIAApA3A3A3AgASAAKQN4NwN4IAEgACkDgAE3A4ABIAEgACkDiAE3A4gBCxwAIAFB4ABqEBwgAEEw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EJABQcjxAEGo8gAQmQEEQEEADwtBAQ8LEQAgABCLASAAQeAAahCLAXELCwAgAEHAAWoQiwELEAAgABCNASAAQeAAahCNAQsZACAAEI0BIABB4ABqEI4BIABBwAFqEI0BC4ICACABIAApAwA3AwAgASAAKQMINwMIIAEgACkDEDcDECABIAApAxg3AxggASAAKQMgNwMgIAEgACkDKDcDKCABIAApAzA3AzAgASAAKQM4NwM4IAEgACkDQDcDQCABIAApA0g3A0ggASAAKQNQNwNQIAEgACkDWDcDWCABIAApA2A3A2AgASAAKQNoNwNoIAEgACkDcDcDcCABIAApA3g3A3ggASAAKQOAATcDgAEgASAAKQOIATcDiAEgASAAKQOQATcDkAEgASAAKQOYATcDmAEgASAAKQOgATcDoAEgASAAKQOoATcDqAEgASAAKQOwATcDsAEgASAAKQO4ATcDuAELkgMAIAEgACkDADcDACABIAApAwg3AwggASAAKQMQNwMQIAEgACkDGDcDGCABIAApAyA3AyAgASAAKQMoNwMoIAEgACkDMDcDMCABIAApAzg3AzggASAAKQNANwNAIAEgACkDSDcDSCABIAApA1A3A1AgASAAKQNYNwNYIAEgACkDYDcDYCABIAApA2g3A2ggASAAKQNwNwNwIAEgACkDeDcDeCABIAApA4ABNwOAASABIAApA4gBNwOIASABIAApA5ABNwOQASABIAApA5gBNwOYASABIAApA6ABNwOgASABIAApA6gBNwOoASABIAApA7ABNwOwASABIAApA7gBNwO4ASABIAApA8ABNwPAASABIAApA8gBNwPIASABIAApA9ABNwPQASABIAApA9gBNwPYASABIAApA+ABNwPgASABIAApA+gBNwPoASABIAApA/ABNwPwASABIAApA/gBNwP4ASABIAApA4ACNwOAAiABIAApA4gCNwOIAiABIAApA5ACNwOQAiABIAApA5gCNwOYAgshACABQcABahCOASAAQeAAaiABQeAAahCPASAAIAEQjwELHAEBfyAAIAEQmQEgAEHgAGogAUHgAGoQmQFxDwuLAQEBfyAAQcABaiECIAAQowEEQCABEKIBDwsgARCiAQRAQQAPCyACEIwBBEAgACABEKkBDwsgAkHo8wAQkgEgAUHo8wBByPQAEJAB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BEAgASACEKcBDwsgARCjAQRAIAAgAhCnAQ8LIAMQjAEEQCABIAAgAhCvAQ8LIAQQjAEEQCAAIAEgAhCvAQ8LIANBqJkBEJIBIARBiJoBEJIBIABBiJoBQeiaARCQASABQaiZAUHImwEQkAEgA0GomQFBqJwBEJABIARBiJoBQYidARCQASAAQeAAakGInQFB6J0BEJABIAFB4ABqQaicAUHIngEQkAFB6JoBQcibARCZAQRAQeidAUHIngEQmQEEQCAAIAIQrQEPCwtByJsBQeiaAUGonwEQlAFByJ4BQeidAUGIoAEQlAFBqJ8BQaifAUHooAEQkwFB6KABQeigARCSAUGonwFB6KABQcihARCQAUGIoAFBiKABQaiiARCTAUHomgFB6KABQeijARCQAUGoogFBiKMBEJIBQeijAUHoowFByKQBEJMBQYijAUHIoQEgAhCUASACQcikASACEJQBQeidAUHIoQFBqKUBEJABQailAUGopQFBqKUBEJMBQeijASACIAJB4ABqEJQBIAJB4ABqQaiiASACQeAAahCQASACQeAAakGopQEgAkHgAGoQlAEgAyAEIAJBwAFqEJMBIAJBwAFqIAJBwAFqEJIBIAJBwAFqQaiZASACQcABahCUASACQcABakGImgEgAkHAAWoQlAEgAkHAAWpBqJ8BIAJBwAFqEJABCxgAIAAgARCPASAAQeAAaiABQeAAahCVAQsnACAAIAEQjwEgAEHgAGogAUHgAGoQlQEgAEHAAWogAUHAAWoQjwELFgAgAUGIpgEQsQEgAEGIpgEgAhCuAQsWACABQaioARCxASAAQaioASACEK8BCxYAIAFByKoBELIBIABByKoBIAIQsAELGAAgACABEJgBIABB4ABqIAFB4ABqEJgBCycAIAAgARCYASAAQeAAaiABQeAAahCYASAAQcABaiABQcABahCYAQsYACAAIAEQlwEgAEHgAGogAUHgAGoQlwELJwAgACABEJcBIABB4ABqIAFB4ABqEJcBIABBwAFqIAFBwAFqEJcBC14AIAAQowEEQCABEI0BIAFB4ABqEI0BBSAAQcABakHorAEQmgFB6KwBQcitARCSAUHorAFByK0BQaiuARCQASAAQcitASABEJABIABB4ABqQaiuASABQeAAahCQAQsLvgEFAX8BfwF/AX8Bf0EAKAIA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aiAAIARBoAJqEPYBIARBoAJqIAFBqJMDIARBoAJqEJsCIARBoAJqQeiOAyAEQaACahD3ASAEQaACakGIkQMgBEGgAmoQ9wFBiJEDIAQQ8wEgBCAEEIICIARB6I4DIAQQ9gELUAAgASAAQTBqQYiUAxAUIAFBMGogAEEwakG4lAMQFCABQeAAaiAAQeiUAxAUIAFBkAFqIABBmJUDEBQgAiABQcABakHolANBiJQDIAIQnAILbAAgAEHItwQgARCQASAAQeAAakGouAQgAUHgAGoQkAEgAEHAAWpBiLkEIAFBwAFqEJABIABBoAJqQei5BCABQaACahCQASAAQYADakHIugQgAUGAA2oQkAEgAEHgA2pBqLsEIAFB4ANqEJABC4oCACAAIAEQACAAQTBqIAFBMGoQEiABQYi8BCABEJABIABB4ABqIAFB4ABqEAAgAEGQAWogAUGQAWoQEiABQeAAakHovAQgAUHgAGoQkAEgAEHAAWogAUHAAWoQACAAQfABaiABQfABahASIAFBwAFqQci9BCABQcABahCQASAAQaACaiABQaACahAAIABB0AJqIAFB0AJqEBIgAUGgAmpBqL4EIAFBoAJqEJABIABBgANqIAFBgANqEAAgAEGwA2ogAUGwA2oQEiABQYADakGIvwQgAUGAA2oQkAEgAEHgA2ogAUHgA2oQACAAQZAEaiABQZAEahASIAFB4ANqQei/BCABQeADahCQAQtsACAAQcjABCABEJABIABB4ABqQajBBCABQeAAahCQASAAQcABakGIwgQgAUHAAWoQkAEgAEGgAmpB6MIEIAFBoAJqEJABIABBgANqQcjDBCABQYADahCQASAAQeADakGoxAQgAUHgA2oQkAELigIAIAAgARAAIABBMGogAUEwahASIAFBiMUEIAEQkAEgAEHgAGogAUHgAGoQACAAQZABaiABQZABahASIAFB4ABqQejFBCABQeAAahCQASAAQcABaiABQcABahAAIABB8AFqIAFB8AFqEBIgAUHAAWpByMYEIAFBwAFqEJABIABBoAJqIAFBoAJqEAAgAEHQAmogAUHQAmoQEiABQaACakGoxwQgAUGgAmoQkAEgAEGAA2ogAUGAA2oQACAAQbADaiABQbADahASIAFBgANqQYjIBCABQYADahCQASAAQeADaiABQeADahAAIABBkARqIAFBkARqEBIgAUHgA2pB6MgEIAFB4ANqEJABC2wAIABByMkEIAEQkAEgAEHgAGpBqMoEIAFB4ABqEJABIABBwAFqQYjLBCABQcABahCQASAAQaACakHoywQgAUGgAmoQkAEgAEGAA2pByMwEIAFBgANqEJABIABB4ANqQajNBCABQeADahCQAQuKAgAgACABEAAgAEEwaiABQTBqEBIgAUGIzgQgARCQASAAQeAAaiABQeAAahAAIABBkAFqIAFBkAFqEBIgAUHgAGpB6M4EIAFB4ABqEJABIABBwAFqIAFBwAFqEAAgAEHwAWogAUHwAWoQEiABQcABakHIzwQgAUHAAWoQkAEgAEGgAmogAUGgAmoQACAAQdACaiABQdACahASIAFBoAJqQajQBCABQaACahCQASAAQYADaiABQYADahAAIABBsANqIAFBsANqEBIgAUGAA2pBiNEEIAFBgANqEJABIABB4ANqIAFB4ANqEAAgAEGQBGogAUGQBGoQEiABQeADakHo0QQgAUHgA2oQkAELbAAgAEHI0gQgARCQASAAQeAAakGo0wQgAUHgAGoQkAEgAEHAAWpBiNQEIAFBwAFqEJABIABBoAJqQejUBCABQaACahCQASAAQYADakHI1QQgAUGAA2oQkAEgAEHgA2pBqNYEIAFB4ANqEJABC4oCACAAIAEQACAAQTBqIAFBMGoQEiABQYjXBCABEJABIABB4ABqIAFB4ABqEAAgAEGQAWogAUGQAWoQEiABQeAAakHo1wQgAUHgAGoQkAEgAEHAAWogAUHAAWoQACAAQfABaiABQfABahASIAFBwAFqQcjYBCABQcABahCQASAAQaACaiABQaACahAAIABB0AJqIAFB0AJqEBIgAUGgAmpBqNkEIAFBoAJqEJABIABBgANqIAFBgANqEAAgAEGwA2ogAUGwA2oQEiABQYADakGI2gQgAUGAA2oQkAEgAEHgA2ogAUHgA2oQACAAQZAEaiABQZAEahASIAFB4ANqQejaBCABQeADahCQAQtsACAAQcjbBCABEJABIABB4ABqQajcBCABQeAAahCQASAAQcABakGI3QQgAUHAAWoQkAEgAEGgAmpB6N0EIAFBoAJqEJABIABBgANqQcjeBCABQYADahCQASAAQeADakGo3wQgAUHgA2oQkAELigIAIAAgARAAIABBMGogAUEwahASIAFBiOAEIAEQkAEgAEHgAGogAUHgAGoQACAAQZABaiABQZABahASIAFB4ABqQejgBCABQeAAahCQASAAQcABaiABQcABahAAIABB8AFqIAFB8AFqEBIgAUHAAWpByOEEIAFBwAFqEJABIABBoAJqIAFBoAJqEAAgAEHQAmogAUHQAmoQEiABQaACakGo4gQgAUGgAmoQkAEgAEGAA2ogAUGAA2oQACAAQbADaiABQbADahASIAFBgANqQYjjBCABQYADahCQASAAQeADaiABQeADahAAIABBkARqIAFBkARqEBIgAUHgA2pB6OMEIAFB4ANqEJABC9gEACAAQcABakHI5AQQkgEgAUHgAGpBqOUEEJIBQcjkBCABQejmBBCQASABQeAAaiAAQcABaiACQeAAahCTASACQeAAaiACQeAAahCSASACQeAAakGo5QQgAkHgAGoQlAEgAkHgAGpByOQEIAJB4ABqEJQBIAJB4ABqQcjkBCACQeAAahCQAUHo5gQgAEHI5wQQlAFByOcEQajoBBCSAUGo6ARBqOgEQYjpBBCTAUGI6QRBiOkEQYjpBBCTAUGI6QRByOcEQejpBBCQASACQeAAaiAAQeAAakHI6gQQlAFByOoEIABB4ABqQcjqBBCUAUHI6gQgASACQcABahCQAUGI6QQgAEGo6wQQkAFByOoEIAAQkgEgAEHo6QQgABCUASAAQajrBCAAEJQBIABBqOsEIAAQlAEgAEHAAWpByOcEIABBwAFqEJMBIABBwAFqIABBwAFqEJIBIABBwAFqQcjkBCAAQcABahCUASAAQcABakGo6AQgAEHAAWoQlAEgAUHgAGogAEHAAWogAhCTAUGo6wQgAEGI7AQQlAFBiOwEQcjqBEGI7AQQkAEgAEHgAGpB6OkEQejmBBCQAUHo5gRB6OYEQejmBBCTAUGI7ARB6OYEIABB4ABqEJQBIAIgAhCSASACQajlBCACEJQBIABBwAFqQYjmBBCSASACQYjmBCACEJQBIAJBwAFqIAJBwAFqIAJBwAFqEJMBIAJBwAFqIAIgAkHAAWoQlAEgAEHAAWogAEHAAWogAhCTAUHI6gRByOoEEJUBQcjqBEHI6gQgAkHgAGoQkwELsgQAIAAgARCSASAAQeAAakHI7QQQkgFByO0EQajuBBCSAUHI7QQgACABQeAAahCTASABQeAAaiABQeAAahCSASABQeAAaiABIAFB4ABqEJQBIAFB4ABqQajuBCABQeAAahCUASABQeAAaiABQeAAaiABQeAAahCTASABIAFBiO8EEJMBQYjvBCABQYjvBBCTASAAQYjvBCABQcABahCTAUGI7wRB6O8EEJIBIABBwAFqQejsBBCSAUHo7wQgAUHgAGogABCUASAAIAFB4ABqIAAQlAEgAEHAAWogAEHgAGogAEHAAWoQkwEgAEHAAWogAEHAAWoQkgEgAEHAAWpByO0EIABBwAFqEJQBIABBwAFqQejsBCAAQcABahCUASABQeAAaiAAIABB4ABqEJQBIABB4ABqQYjvBCAAQeAAahCQAUGo7gRBqO4EQajuBBCTAUGo7gRBqO4EQajuBBCTAUGo7gRBqO4EQajuBBCTASAAQeAAakGo7gQgAEHgAGoQlAFBiO8EQejsBCABQeAAahCQASABQeAAaiABQeAAaiABQeAAahCTASABQeAAaiABQeAAahCVASABQcABaiABQcABahCSASABQcABaiABIAFBwAFqEJQBIAFBwAFqQejvBCABQcABahCUAUHI7QRByO0EQcjtBBCTAUHI7QRByO0EQcjtBBCTASABQcABakHI7QQgAUHAAWoQlAEgAEHAAWpB6OwEIAEQkAEgASABIAEQkwELCAAgACABEGgLbQIBfwF/IAAgARC8ASABEKMBBEAPCyABQcjwBBCnASABQaACaiECQT4hAwJAA0BByPAEIAIQqQIgAkGgAmohAiADLADoiQMEQEHI8AQgASACEKgCIAJBoAJqIQILIANFDQEgA0EBayEDDAALCwuAAQIBfwF/IAIQhgIgABBPBEAPCyABEE8EQA8LIAFBoAJqIQNBPiEEAkADQCAAIAMgAhCdAiADQaACaiEDIAQsAOiJAwRAIAAgAyACEJ0CIANBoAJqIQMLIAIgAhCKAiAEQQFGDQEgBEEBayEEDAALCyAAIAMgAhCdAiACIAIQjgILEAAgAEHo8gRBoAQgARCXAgvsBQAgACAAQYADakHI+wQQkAEgAEGAA2pBiPcEEO4BIABBiPcEQYj3BBCTASAAIABBgANqQaj8BBCTAUGo/ARBiPcEQYj3BBCQAUHI+wRBqPwEEO4BQcj7BEGo/ARBqPwEEJMBQYj3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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAA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GP////8AAAAAAaQBAP1bQqz6J1729yfGzLeCYtasWBIMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAA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";
            var pq$1 = 760;
            var pr$1 = 3640;
            var pG1gen$1 = 33752;
            var pG1zero$1 = 33896;
            var pG1b$1 = 5016;
            var pG2gen$1 = 34040;
            var pG2zero$1 = 34328;
            var pG2b$1 = 14728;
            var pOneT$1 = 34616;
            var prePSize$1 = 288;
            var preQSize$1 = 20448;
            var n8q$1 = 48;
            var n8r$1 = 32;
            var q$1 = "4002409555221667393417789825735904156556882819939007885332058136124031650490837864442687629129015664037894272559787";
            var r$1 = "52435875175126190479447740508185965837690552500527637822603658699938581184513";

var bls12381_wasm = {
	code: code$1,
	pq: pq$1,
	pr: pr$1,
	pG1gen: pG1gen$1,
	pG1zero: pG1zero$1,
	pG1b: pG1b$1,
	pG2gen: pG2gen$1,
	pG2zero: pG2zero$1,
	pG2b: pG2b$1,
	pOneT: pOneT$1,
	prePSize: prePSize$1,
	preQSize: preQSize$1,
	n8q: n8q$1,
	n8r: n8r$1,
	q: q$1,
	r: r$1
};

/*
    Copyright 2019 0KIMS association.

    This file is part of wasmsnark (Web Assembly zkSnark Prover).

    wasmsnark is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmsnark is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmsnark. If not, see <https://www.gnu.org/licenses/>.
*/

// module.exports.buildF1 = require("./src/f1.js");
// module.exports.buildBn128 = require("./src/bn128.js");
// module.exports.buildMnt6753 = require("./src/mnt6753.js");

var bn128_wasm$1 = bn128_wasm;
var bls12381_wasm$1 = bls12381_wasm;
// module.exports.mnt6753_wasm = require("./build/mnt6753_wasm.js");

var wasmcurves = {
	bn128_wasm: bn128_wasm$1,
	bls12381_wasm: bls12381_wasm$1
};

/* global BigInt */

function stringifyBigInts(o) {
    if ((typeof(o) == "bigint") || o.eq !== undefined)  {
        return o.toString(10);
    } else if (Array.isArray(o)) {
        return o.map(stringifyBigInts);
    } else if (typeof o == "object") {
        const res = {};
        const keys = Object.keys(o);
        keys.forEach( (k) => {
            res[k] = stringifyBigInts(o[k]);
        });
        return res;
    } else {
        return o;
    }
}

function unstringifyBigInts(o) {
    if ((typeof(o) == "string") && (/^[0-9]+$/.test(o) ))  {
        return BigInt(o);
    } else if (Array.isArray(o)) {
        return o.map(unstringifyBigInts);
    } else if (typeof o == "object") {
        if (o===null) return null;
        const res = {};
        const keys = Object.keys(o);
        keys.forEach( (k) => {
            res[k] = unstringifyBigInts(o[k]);
        });
        return res;
    } else {
        return o;
    }
}

function beBuff2int(buff) {
    let res = 0n;
    let i = buff.length;
    let offset = 0;
    const buffV = new DataView(buff.buffer);
    while (i>0) {
        if (i >= 4) {
            i -= 4;
            res += BigInt(buffV.getUint32(i)) << BigInt(offset*8);
            offset += 4;
        } else if (i >= 2) {
            i -= 2;
            res += BigInt(buffV.getUint16(i)) << BigInt(offset*8);
            offset += 2;
        } else {
            i -= 1;
            res += BigInt(buffV.getUint8(i)) << BigInt(offset*8);
            offset += 1;
        }
    }
    return res;
}

function beInt2Buff(n, len) {
    let r = n;
    const buff = new Uint8Array(len);
    const buffV = new DataView(buff.buffer);
    let o = len;
    while (o > 0) {
        if (o-4 >= 0) {
            o -= 4;
            buffV.setUint32(o, Number(r & 0xFFFFFFFFn));
            r = r >> 32n;
        } else if (o-2 >= 0) {
            o -= 2;
            buffV.setUint16(o, Number(r & 0xFFFFn));
            r = r >> 16n;
        } else {
            o -= 1;
            buffV.setUint8(o, Number(r & 0xFFn));
            r = r >> 8n;
        }
    }
    if (r) {
        throw new Error("Number does not fit in this length");
    }
    return buff;
}


function leBuff2int(buff) {
    let res = 0n;
    let i = 0;
    const buffV = new DataView(buff.buffer);
    while (i<buff.length) {
        if (i + 4 <= buff.length) {
            res += BigInt(buffV.getUint32(i, true)) << BigInt( i*8);
            i += 4;
        } else if (i + 4 <= buff.length) {
            res += BigInt(buffV.getUint16(i, true)) << BigInt( i*8);
            i += 2;
        } else {
            res += BigInt(buffV.getUint8(i, true)) << BigInt( i*8);
            i += 1;
        }
    }
    return res;
}

function leInt2Buff(n, len) {
    let r = n;
    if (typeof len === "undefined") {
        len = Math.floor((bitLength$2(n) - 1) / 8) +1;
        if (len==0) len = 1;
    }
    const buff = new Uint8Array(len);
    const buffV = new DataView(buff.buffer);
    let o = 0;
    while (o < len) {
        if (o+4 <= len) {
            buffV.setUint32(o, Number(r & 0xFFFFFFFFn), true );
            o += 4;
            r = r >> 32n;
        } else if (o+2 <= len) {
            buff.setUint16(Number(o, r & 0xFFFFn), true );
            o += 2;
            r = r >> 16n;
        } else {
            buff.setUint8(Number(o, r & 0xFFn), true );
            o += 1;
            r = r >> 8n;
        }
    }
    if (r) {
        throw new Error("Number does not fit in this length");
    }
    return buff;
}

var utils_native = /*#__PURE__*/Object.freeze({
    __proto__: null,
    stringifyBigInts: stringifyBigInts,
    unstringifyBigInts: unstringifyBigInts,
    beBuff2int: beBuff2int,
    beInt2Buff: beInt2Buff,
    leBuff2int: leBuff2int,
    leInt2Buff: leInt2Buff
});

function stringifyBigInts$1(o) {
    if ((typeof(o) == "bigint") || o.eq !== undefined)  {
        return o.toString(10);
    } else if (Array.isArray(o)) {
        return o.map(stringifyBigInts$1);
    } else if (typeof o == "object") {
        const res = {};
        const keys = Object.keys(o);
        keys.forEach( (k) => {
            res[k] = stringifyBigInts$1(o[k]);
        });
        return res;
    } else {
        return o;
    }
}

function unstringifyBigInts$1(o) {
    if ((typeof(o) == "string") && (/^[0-9]+$/.test(o) ))  {
        return BigInteger(o);
    } else if (Array.isArray(o)) {
        return o.map(unstringifyBigInts$1);
    } else if (typeof o == "object") {
        const res = {};
        const keys = Object.keys(o);
        keys.forEach( (k) => {
            res[k] = unstringifyBigInts$1(o[k]);
        });
        return res;
    } else {
        return o;
    }
}

function beBuff2int$1(buff) {
    let res = BigInteger.zero;
    for (let i=0; i<buff.length; i++) {
        const n = BigInteger(buff[buff.length - i - 1]);
        res = res.add(n.shiftLeft(i*8));
    }
    return res;
}

function beInt2Buff$1(n, len) {
    let r = n;
    let o =len-1;
    const buff = new Uint8Array(len);
    while ((r.gt(BigInteger.zero))&&(o>=0)) {
        let c = Number(r.and(BigInteger("255")));
        buff[o] = c;
        o--;
        r = r.shiftRight(8);
    }
    if (!r.eq(BigInteger.zero)) {
        throw new Error("Number does not fit in this length");
    }
    return buff;
}


function leBuff2int$1 (buff) {
    let res = BigInteger.zero;
    for (let i=0; i<buff.length; i++) {
        const n = BigInteger(buff[i]);
        res = res.add(n.shiftLeft(i*8));
    }
    return res;
}

function leInt2Buff$1(n, len) {
    let r = n;
    let o =0;
    const buff = new Uint8Array(len);
    while ((r.gt(BigInteger.zero))&&(o<buff.length)) {
        let c = Number(r.and(BigInteger(255)));
        buff[o] = c;
        o++;
        r = r.shiftRight(8);
    }
    if (!r.eq(BigInteger.zero)) {
        throw new Error("Number does not fit in this length");
    }
    return buff;
}

var utils_bigint = /*#__PURE__*/Object.freeze({
    __proto__: null,
    stringifyBigInts: stringifyBigInts$1,
    unstringifyBigInts: unstringifyBigInts$1,
    beBuff2int: beBuff2int$1,
    beInt2Buff: beInt2Buff$1,
    leBuff2int: leBuff2int$1,
    leInt2Buff: leInt2Buff$1
});

let utils = {};

const supportsNativeBigInt$2 = typeof BigInt === "function";
if (supportsNativeBigInt$2) {
    Object.assign(utils, utils_native);
} else {
    Object.assign(utils, utils_bigint);
}


const _revTable$1 = [];
for (let i=0; i<256; i++) {
    _revTable$1[i] = _revSlow$1(i, 8);
}

function _revSlow$1(idx, bits) {
    let res =0;
    let a = idx;
    for (let i=0; i<bits; i++) {
        res <<= 1;
        res = res | (a &1);
        a >>=1;
    }
    return res;
}

utils.bitReverse = function bitReverse(idx, bits) {
    return (
        _revTable$1[idx >>> 24] |
        (_revTable$1[(idx >>> 16) & 0xFF] << 8) |
        (_revTable$1[(idx >>> 8) & 0xFF] << 16) |
        (_revTable$1[idx & 0xFF] << 24)
    ) >>> (32-bits);
};


utils.log2 = function log2( V )
{
    return( ( ( V & 0xFFFF0000 ) !== 0 ? ( V &= 0xFFFF0000, 16 ) : 0 ) | ( ( V & 0xFF00FF00 ) !== 0 ? ( V &= 0xFF00FF00, 8 ) : 0 ) | ( ( V & 0xF0F0F0F0 ) !== 0 ? ( V &= 0xF0F0F0F0, 4 ) : 0 ) | ( ( V & 0xCCCCCCCC ) !== 0 ? ( V &= 0xCCCCCCCC, 2 ) : 0 ) | ( ( V & 0xAAAAAAAA ) !== 0 ) );
};

utils.buffReverseBits = function buffReverseBits(buff, eSize) {
    const n = buff.byteLength /eSize;
    const bits = utils.log2(n);
    if (n != (1 << bits)) {
        throw new Error("Invalid number of pointers");
    }
    for (let i=0; i<n; i++) {
        const r = utils.bitReverse(i,bits);
        if (i>r) {
            const tmp = buff.slice(i*eSize, (i+1)*eSize);
            buff.set( buff.slice(r*eSize, (r+1)*eSize), i*eSize);
            buff.set(tmp, r*eSize);
        }
    }
};

let {
    bitReverse,
    log2: log2$1,
    buffReverseBits,
    stringifyBigInts: stringifyBigInts$2,
    unstringifyBigInts: unstringifyBigInts$2,
    beBuff2int: beBuff2int$2,
    beInt2Buff: beInt2Buff$2,
    leBuff2int: leBuff2int$2,
    leInt2Buff: leInt2Buff$2,
} = utils;

var _utils = /*#__PURE__*/Object.freeze({
    __proto__: null,
    bitReverse: bitReverse,
    log2: log2$1,
    buffReverseBits: buffReverseBits,
    stringifyBigInts: stringifyBigInts$2,
    unstringifyBigInts: unstringifyBigInts$2,
    beBuff2int: beBuff2int$2,
    beInt2Buff: beInt2Buff$2,
    leBuff2int: leBuff2int$2,
    leInt2Buff: leInt2Buff$2
});

function buildBatchConvert(tm, fnName, sIn, sOut) {
    return async function batchConvert(buffIn) {
        const nPoints = Math.floor(buffIn.byteLength / sIn);
        if ( nPoints * sIn !== buffIn.byteLength) {
            throw new Error("Invalid buffer size");
        }
        const pointsPerChunk = Math.floor(nPoints/tm.concurrency);
        const opPromises = [];
        for (let i=0; i<tm.concurrency; i++) {
            let n;
            if (i< tm.concurrency-1) {
                n = pointsPerChunk;
            } else {
                n = nPoints - i*pointsPerChunk;
            }
            if (n==0) continue;

            const buffChunk = buffIn.slice(i*pointsPerChunk*sIn, i*pointsPerChunk*sIn + n*sIn);
            const task = [
                {cmd: "ALLOCSET", var: 0, buff:buffChunk},
                {cmd: "ALLOC", var: 1, len:sOut * n},
                {cmd: "CALL", fnName: fnName, params: [
                    {var: 0},
                    {val: n},
                    {var: 1}
                ]},
                {cmd: "GET", out: 0, var: 1, len:sOut * n},
            ];
            opPromises.push(
                tm.queueAction(task)
            );
        }

        const result = await Promise.all(opPromises);

        const fullBuffOut = new Uint8Array(nPoints*sOut);
        let p =0;
        for (let i=0; i<result.length; i++) {
            fullBuffOut.set(result[i][0], p);
            p+=result[i][0].byteLength;
        }

        return fullBuffOut;
    };
}

class WasmField1 {

    constructor(tm, prefix, n8, p) {
        this.tm = tm;
        this.prefix = prefix;

        this.p = p;
        this.n8 = n8;
        this.type = "F1";
        this.m = 1;

        this.half = shiftRight$2(p, one);
        this.bitLength = bitLength$2(p);
        this.mask = sub$2(shiftLeft$2(one, this.bitLength), one);

        this.pOp1 = tm.alloc(n8);
        this.pOp2 = tm.alloc(n8);
        this.pOp3 = tm.alloc(n8);
        this.tm.instance.exports[prefix + "_zero"](this.pOp1);
        this.zero = this.tm.getBuff(this.pOp1, this.n8);
        this.tm.instance.exports[prefix + "_one"](this.pOp1);
        this.one = this.tm.getBuff(this.pOp1, this.n8);

        this.negone = this.neg(this.one);
        this.two = this.add(this.one, this.one);

        this.n64 = Math.floor(n8/8);
        this.n32 = Math.floor(n8/4);

        if(this.n64*8 != this.n8) {
            throw new Error("n8 must be a multiple of 8");
        }

        this.half = shiftRight$2(this.p, one);
        this.nqr = this.two;
        let r = this.exp(this.nqr, this.half);
        while (!this.eq(r, this.negone)) {
            this.nqr = this.add(this.nqr, this.one);
            r = this.exp(this.nqr, this.half);
        }


        this.s = 0;
        let t = sub$2(this.p, one);

        while ( !isOdd$2(t) ) {
            this.s = this.s + 1;
            t = shiftRight$2(t, one);
        }

        this.w = [];
        this.w[this.s] = this.exp(this.nqr, t);

        for (let i= this.s-1; i>=0; i--) {
            this.w[i] = this.square(this.w[i+1]);
        }

        if (!this.eq(this.w[0], this.one)) {
            throw new Error("Error calculating roots of unity");
        }

        this.batchToMontgomery = buildBatchConvert(tm, prefix + "_batchToMontgomery", this.n8, this.n8);
        this.batchFromMontgomery = buildBatchConvert(tm, prefix + "_batchFromMontgomery", this.n8, this.n8);
    }


    op2(opName, a, b) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp2, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.n8);
    }

    op2Bool(opName, a, b) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        return !!this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp2);
    }

    op1(opName, a) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.n8);
    }

    op1Bool(opName, a) {
        this.tm.setBuff(this.pOp1, a);
        return !!this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp3);
    }

    add(a,b) {
        return this.op2("_add", a, b);
    }


    eq(a,b) {
        return this.op2Bool("_eq", a, b);
    }

    isZero(a) {
        return this.op1Bool("_isZero", a);
    }

    sub(a,b) {
        return this.op2("_sub", a, b);
    }

    neg(a) {
        return this.op1("_neg", a);
    }

    inv(a) {
        return this.op1("_inverse", a);
    }

    toMontgomery(a) {
        return this.op1("_toMontgomery", a);
    }

    fromMontgomery(a) {
        return this.op1("_fromMontgomery", a);
    }

    mul(a,b) {
        return this.op2("_mul", a, b);
    }

    div(a, b) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        this.tm.instance.exports[this.prefix + "_inverse"](this.pOp2, this.pOp2);
        this.tm.instance.exports[this.prefix + "_mul"](this.pOp1, this.pOp2, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.n8);
    }

    square(a) {
        return this.op1("_square", a);
    }

    isSquare(a) {
        return this.op1Bool("_isSquare", a);
    }

    sqrt(a) {
        return this.op1("_sqrt", a);
    }

    exp(a, b) {
        if (!(b instanceof Uint8Array)) {
            b = toLEBuff(e$2(b));
        }
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        this.tm.instance.exports[this.prefix + "_exp"](this.pOp1, this.pOp2, b.byteLength, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.n8);
    }

    isNegative(a) {
        return this.op1Bool("_isNegative", a);
    }

    e(a, b) {
        if (a instanceof Uint8Array) return a;
        let ra = e$2(a, b);
        if (isNegative$2(ra)) {
            ra = neg$2(ra);
            if (gt$2(ra, this.p)) {
                ra = mod$2(ra, this.p);
            }
            ra = sub$2(this.p, ra);
        } else {
            if (gt$2(ra, this.p)) {
                ra = mod$2(ra, this.p);
            }
        }
        const buff = leInt2Buff$2(ra, this.n8);
        return this.toMontgomery(buff);
    }

    toString(a, radix) {
        const an = this.fromMontgomery(a);
        const s = fromRprLE(an, 0);
        return toString(s, radix);
    }

    fromRng(rng) {
        let v;
        const buff = new Uint8Array(this.n8);
        do {
            v = zero;
            for (let i=0; i<this.n64; i++) {
                v = add$2(v,  shiftLeft$2(rng.nextU64(), 64*i));
            }
            v = band$2(v, this.mask);
        } while (geq$2(v, this.p));
        toRprLE(buff, 0, v, this.n8);
        return buff;
    }

    random() {
        return this.fromRng(getThreadRng());
    }

    toObject(a) {
        const an = this.fromMontgomery(a);
        return fromRprLE(an, 0);
    }

    fromObject(a) {
        const buff = new Uint8Array(this.n8);
        toRprLE(buff, 0, a, this.n8);
        return this.toMontgomery(buff);
    }

    toRprLE(buff, offset, a) {
        buff.set(this.fromMontgomery(a), offset);
    }

    fromRprLE(buff, offset) {
        const res = buff.slice(offset, offset + this.n8);
        return this.toMontgomery(res);
    }


}

class WasmField2 {

    constructor(tm, prefix, F) {
        this.tm = tm;
        this.prefix = prefix;

        this.F = F;
        this.type = "F2";
        this.m = F.m * 2;
        this.n8 = this.F.n8*2;
        this.n32 = this.F.n32*2;
        this.n64 = this.F.n64*2;

        this.pOp1 = tm.alloc(F.n8*2);
        this.pOp2 = tm.alloc(F.n8*2);
        this.pOp3 = tm.alloc(F.n8*2);
        this.tm.instance.exports[prefix + "_zero"](this.pOp1);
        this.zero = tm.getBuff(this.pOp1, this.n8);
        this.tm.instance.exports[prefix + "_one"](this.pOp1);
        this.one = tm.getBuff(this.pOp1, this.n8);

        this.negone = this.neg(this.one);
        this.two = this.add(this.one, this.one);

    }

    op2(opName, a, b) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp2, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.n8);
    }

    op2Bool(opName, a, b) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        return !!this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp2);
    }

    op1(opName, a) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.n8);
    }

    op1Bool(opName, a) {
        this.tm.setBuff(this.pOp1, a);
        return !!this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp3);
    }

    add(a,b) {
        return this.op2("_add", a, b);
    }

    eq(a,b) {
        return this.op2Bool("_eq", a, b);
    }

    isZero(a) {
        return this.op1Bool("_isZero", a);
    }

    sub(a,b) {
        return this.op2("_sub", a, b);
    }

    neg(a) {
        return this.op1("_neg", a);
    }

    inv(a) {
        return this.op1("_inverse", a);
    }

    isNegative(a) {
        return this.op1Bool("_isNegative", a);
    }

    toMontgomery(a) {
        return this.op1("_toMontgomery", a);
    }

    fromMontgomery(a) {
        return this.op1("_fromMontgomery", a);
    }

    mul(a,b) {
        return this.op2("_mul", a, b);
    }

    div(a, b) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        this.tm.instance.exports[this.prefix + "_inverse"](this.pOp2, this.pOp2);
        this.tm.instance.exports[this.prefix + "_mul"](this.pOp1, this.pOp2, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.n8);
    }

    square(a) {
        return this.op1("_square", a);
    }

    isSquare(a) {
        return this.op1Bool("_isSquare", a);
    }

    sqrt(a) {
        return this.op1("_sqrt", a);
    }

    exp(a, b) {
        if (!(b instanceof Uint8Array)) {
            b = toLEBuff(e$2(b));
        }
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        this.tm.instance.exports[this.prefix + "_exp"](this.pOp1, this.pOp2, b.byteLength, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.n8);
    }

    e(a, b) {
        if (a instanceof Uint8Array) return a;
        if ((Array.isArray(a)) && (a.length == 2)) {
            const c1 = this.F.e(a[0], b);
            const c2 = this.F.e(a[1], b);
            const res = new Uint8Array(this.F.n8*2);
            res.set(c1);
            res.set(c2, this.F.n8*2);
            return res;
        } else {
            throw new Error("invalid F2");
        }
    }

    toString(a, radix) {
        const s1 = this.F.toString(a.slice(0, this.F.n8), radix);
        const s2 = this.F.toString(a.slice(this.F.n8), radix);
        return `[${s1}, ${s2}]`;
    }

    fromRng(rng) {
        const c1 = this.F.fromRng(rng);
        const c2 = this.F.fromRng(rng);
        const res = new Uint8Array(this.F.n8*2);
        res.set(c1);
        res.set(c2, this.F.n8);
        return res;
    }

    random() {
        return this.fromRng(getThreadRng());
    }

    toObject(a) {
        const c1 = this.F.toObject(a.slice(0, this.F.n8));
        const c2 = this.F.toObject(a.slice(this.F.n8, this.F.n8*2));
        return [c1, c2];
    }

    fromObject(a) {
        const buff = new Uint8Array(this.F.n8*2);
        const b1 = this.F.fromObject(a[0]);
        const b2 = this.F.fromObject(a[1]);
        buff.set(b1);
        buff.set(b2, this.F.n8);
        return buff;
    }

}

class WasmField3 {

    constructor(tm, prefix, F) {
        this.tm = tm;
        this.prefix = prefix;

        this.F = F;
        this.type = "F3";
        this.m = F.m * 3;
        this.n8 = this.F.n8*3;
        this.n32 = this.F.n32*3;
        this.n64 = this.F.n64*3;

        this.pOp1 = tm.alloc(F.n8*3);
        this.pOp2 = tm.alloc(F.n8*3);
        this.pOp3 = tm.alloc(F.n8*3);
        this.tm.instance.exports[prefix + "_zero"](this.pOp1);
        this.zero = tm.getBuff(this.pOp1, this.n8);
        this.tm.instance.exports[prefix + "_one"](this.pOp1);
        this.one = tm.getBuff(this.pOp1, this.n8);

        this.negone = this.neg(this.one);
        this.two = this.add(this.one, this.one);

    }

    op2(opName, a, b) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp2, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.n8);
    }

    op2Bool(opName, a, b) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        return !!this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp2);
    }

    op1(opName, a) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.n8);
    }

    op1Bool(opName, a) {
        this.tm.setBuff(this.pOp1, a);
        return !!this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp3);
    }


    eq(a,b) {
        return this.op2Bool("_eq", a, b);
    }

    isZero(a) {
        return this.op1Bool("_isZero", a);
    }

    add(a,b) {
        return this.op2("_add", a, b);
    }

    sub(a,b) {
        return this.op2("_sub", a, b);
    }

    neg(a) {
        return this.op1("_neg", a);
    }

    inv(a) {
        return this.op1("_inverse", a);
    }

    isNegative(a) {
        return this.op1Bool("_isNegative", a);
    }

    toMontgomery(a) {
        return this.op1("_toMontgomery", a);
    }

    fromMontgomery(a) {
        return this.op1("_fromMontgomery", a);
    }

    mul(a,b) {
        return this.op2("_mul", a, b);
    }

    div(a, b) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        this.tm.instance.exports[this.prefix + "_inverse"](this.pOp2, this.pOp2);
        this.tm.instance.exports[this.prefix + "_mul"](this.pOp1, this.pOp2, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.n8);
    }

    square(a) {
        return this.op1("_square", a);
    }

    isSquare(a) {
        return this.op1Bool("_isSquare", a);
    }

    sqrt(a) {
        return this.op1("_sqrt", a);
    }

    exp(a, b) {
        if (!(b instanceof Uint8Array)) {
            b = toLEBuff(e$2(b));
        }
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        this.tm.instance.exports[this.prefix + "_exp"](this.pOp1, this.pOp2, b.byteLength, this.pOp3);
        return this.getBuff(this.pOp3, this.n8);
    }

    e(a, b) {
        if (a instanceof Uint8Array) return a;
        if ((Array.isArray(a)) && (a.length == 3)) {
            const c1 = this.F.e(a[0], b);
            const c2 = this.F.e(a[1], b);
            const c3 = this.F.e(a[2], b);
            const res = new Uint8Array(this.F.n8*3);
            res.set(c1);
            res.set(c2, this.F.n8);
            res.set(c3, this.F.n8*2);
            return res;
        } else {
            throw new Error("invalid F3");
        }
    }

    toString(a, radix) {
        const s1 = this.F.toString(a.slice(0, this.F.n8), radix);
        const s2 = this.F.toString(a.slice(this.F.n8, this.F.n8*2), radix);
        const s3 = this.F.toString(a.slice(this.F.n8*2), radix);
        return `[${s1}, ${s2}, ${s3}]`;
    }

    fromRng(rng) {
        const c1 = this.F.fromRng(rng);
        const c2 = this.F.fromRng(rng);
        const c3 = this.F.fromRng(rng);
        const res = new Uint8Array(this.F.n8*3);
        res.set(c1);
        res.set(c2, this.F.n8);
        res.set(c3, this.F.n8*2);
        return res;
    }

    random() {
        return this.fromRng(getThreadRng());
    }

    toObject(a) {
        const c1 = this.F.toObject(a.slice(0, this.F.n8));
        const c2 = this.F.toObject(a.slice(this.F.n8, this.F.n8*2));
        const c3 = this.F.toObject(a.slice(this.F.n8*2, this.F.n8*3));
        return [c1, c2, c3];
    }

    fromObject(a) {
        const buff = new Uint8Array(this.F.n8*3);
        const b1 = this.F.fromObject(a[0]);
        const b2 = this.F.fromObject(a[1]);
        const b3 = this.F.fromObject(a[2]);
        buff.set(b1);
        buff.set(b2, this.F.n8);
        buff.set(b3, this.F.n8*2);
        return buff;
    }

}

class WasmCurve {

    constructor(tm, prefix, F, pGen, pGb, cofactor) {
        this.tm = tm;
        this.prefix = prefix;
        this.F = F;

        this.pOp1 = tm.alloc(F.n8*3);
        this.pOp2 = tm.alloc(F.n8*3);
        this.pOp3 = tm.alloc(F.n8*3);
        this.tm.instance.exports[prefix + "_zero"](this.pOp1);
        this.zero = this.tm.getBuff(this.pOp1, F.n8*3);
        this.tm.instance.exports[prefix + "_zeroAffine"](this.pOp1);
        this.zeroAffine = this.tm.getBuff(this.pOp1, F.n8*2);
        this.one = this.tm.getBuff(pGen, F.n8*3);
        this.g = this.one;
        this.oneAffine = this.tm.getBuff(pGen, F.n8*2);
        this.gAffine = this.oneAffine;
        this.b = this.tm.getBuff(pGb, F.n8);

        if (cofactor) {
            this.cofactor = toLEBuff(cofactor);
        }

        this.negone = this.neg(this.one);
        this.two = this.add(this.one, this.one);

        this.batchLEMtoC = buildBatchConvert(tm, prefix + "_batchLEMtoC", F.n8*2, F.n8);
        this.batchLEMtoU = buildBatchConvert(tm, prefix + "_batchLEMtoU", F.n8*2, F.n8*2);
        this.batchCtoLEM = buildBatchConvert(tm, prefix + "_batchCtoLEM", F.n8, F.n8*2);
        this.batchUtoLEM = buildBatchConvert(tm, prefix + "_batchUtoLEM", F.n8*2, F.n8*2);
        this.batchToJacobian = buildBatchConvert(tm, prefix + "_batchToJacobian", F.n8*2, F.n8*3);
        this.batchToAffine = buildBatchConvert(tm, prefix + "_batchToAffine", F.n8*3, F.n8*2);
    }

    op2(opName, a, b) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp2, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.F.n8*3);
    }

    op2bool(opName, a, b) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        return !!this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp2, this.pOp3);
    }

    op1(opName, a) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.F.n8*3);
    }

    op1Affine(opName, a) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.F.n8*2);
    }

    op1Bool(opName, a) {
        this.tm.setBuff(this.pOp1, a);
        return !!this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp3);
    }

    add(a,b) {
        if (a.byteLength == this.F.n8*3) {
            if (b.byteLength == this.F.n8*3) {
                return this.op2("_add", a, b);
            } else if (b.byteLength == this.F.n8*2) {
                return this.op2("_addMixed", a, b);
            } else {
                throw new Error("invalid point size");
            }
        } else if (a.byteLength == this.F.n8*2) {
            if (b.byteLength == this.F.n8*3) {
                return this.op2("_addMixed", b, a);
            } else if (b.byteLength == this.F.n8*2) {
                return this.op2("_addAffine", a, b);
            } else {
                throw new Error("invalid point size");
            }
        } else {
            throw new Error("invalid point size");
        }
    }

    sub(a,b) {
        if (a.byteLength == this.F.n8*3) {
            if (b.byteLength == this.F.n8*3) {
                return this.op2("_sub", a, b);
            } else if (b.byteLength == this.F.n8*2) {
                return this.op2("_subMixed", a, b);
            } else {
                throw new Error("invalid point size");
            }
        } else if (a.byteLength == this.F.n8*2) {
            if (b.byteLength == this.F.n8*3) {
                return this.op2("_subMixed", b, a);
            } else if (b.byteLength == this.F.n8*2) {
                return this.op2("_subAffine", a, b);
            } else {
                throw new Error("invalid point size");
            }
        } else {
            throw new Error("invalid point size");
        }
    }

    neg(a) {
        if (a.byteLength == this.F.n8*3) {
            return this.op1("_neg", a);
        } else if (a.byteLength == this.F.n8*2) {
            return this.op1Affine("_negAffine", a);
        } else {
            throw new Error("invalid point size");
        }
    }

    double(a) {
        if (a.byteLength == this.F.n8*3) {
            return this.op1("_double", a);
        } else if (a.byteLength == this.F.n8*2) {
            return this.op1("_doubleAffine", a);
        } else {
            throw new Error("invalid point size");
        }
    }

    isZero(a) {
        if (a.byteLength == this.F.n8*3) {
            return this.op1Bool("_isZero", a);
        } else if (a.byteLength == this.F.n8*2) {
            return this.op1Bool("_isZeroAffine", a);
        } else {
            throw new Error("invalid point size");
        }
    }

    timesScalar(a, s) {
        if (!(s instanceof Uint8Array)) {
            s = toLEBuff(e$2(s));
        }
        let fnName;
        if (a.byteLength == this.F.n8*3) {
            fnName = this.prefix + "_timesScalar";
        } else if (a.byteLength == this.F.n8*2) {
            fnName = this.prefix + "_timesScalarAffine";
        } else {
            throw new Error("invalid point size");
        }
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, s);
        this.tm.instance.exports[fnName](this.pOp1, this.pOp2, s.byteLength, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.F.n8*3);
    }

    timesFr(a, s) {
        let fnName;
        if (a.byteLength == this.F.n8*3) {
            fnName = this.prefix + "_timesFr";
        } else if (a.byteLength == this.F.n8*2) {
            fnName = this.prefix + "_timesFrAffine";
        } else {
            throw new Error("invalid point size");
        }
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, s);
        this.tm.instance.exports[fnName](this.pOp1, this.pOp2, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.F.n8*3);
    }

    eq(a,b) {
        if (a.byteLength == this.F.n8*3) {
            if (b.byteLength == this.F.n8*3) {
                return this.op2bool("_eq", a, b);
            } else if (b.byteLength == this.F.n8*2) {
                return this.op2bool("_eqMixed", a, b);
            } else {
                throw new Error("invalid point size");
            }
        } else if (a.byteLength == this.F.n8*2) {
            if (b.byteLength == this.F.n8*3) {
                return this.op2bool("_eqMixed", b, a);
            } else if (b.byteLength == this.F.n8*2) {
                return this.op2bool("_eqAffine", a, b);
            } else {
                throw new Error("invalid point size");
            }
        } else {
            throw new Error("invalid point size");
        }
    }

    toAffine(a) {
        if (a.byteLength == this.F.n8*3) {
            return this.op1Affine("_toAffine", a);
        } else if (a.byteLength == this.F.n8*2) {
            return a;
        } else {
            throw new Error("invalid point size");
        }
    }

    toJacobian(a) {
        if (a.byteLength == this.F.n8*3) {
            return a;
        } else if (a.byteLength == this.F.n8*2) {
            return this.op1("_toJacobian", a);
        } else {
            throw new Error("invalid point size");
        }
    }

    toRprUncompressed(arr, offset, a) {
        this.tm.setBuff(this.pOp1, a);
        if (a.byteLength == this.F.n8*3) {
            this.tm.instance.exports[this.prefix + "_toAffine"](this.pOp1, this.pOp1);
        } else if (a.byteLength != this.F.n8*2) {
            throw new Error("invalid point size");
        }
        this.tm.instance.exports[this.prefix + "_LEMtoU"](this.pOp1, this.pOp1);
        const res = this.tm.getBuff(this.pOp1, this.F.n8*2);
        arr.set(res, offset);
    }

    fromRprUncompressed(arr, offset) {
        const buff = arr.slice(offset, offset + this.F.n8*2);
        this.tm.setBuff(this.pOp1, buff);
        this.tm.instance.exports[this.prefix + "_UtoLEM"](this.pOp1, this.pOp1);
        return this.tm.getBuff(this.pOp1, this.F.n8*2);
    }

    toRprCompressed(arr, offset, a) {
        this.tm.setBuff(this.pOp1, a);
        if (a.byteLength == this.F.n8*3) {
            this.tm.instance.exports[this.prefix + "_toAffine"](this.pOp1, this.pOp1);
        } else if (a.byteLength != this.F.n8*2) {
            throw new Error("invalid point size");
        }
        this.tm.instance.exports[this.prefix + "_LEMtoC"](this.pOp1, this.pOp1);
        const res = this.tm.getBuff(this.pOp1, this.F.n8);
        arr.set(res, offset);
    }

    fromRprCompressed(arr, offset) {
        const buff = arr.slice(offset, offset + this.F.n8);
        this.tm.setBuff(this.pOp1, buff);
        this.tm.instance.exports[this.prefix + "_CtoLEM"](this.pOp1, this.pOp2);
        return this.tm.getBuff(this.pOp2, this.F.n8*2);
    }

    toUncompressed(a) {
        const buff = new Uint8Array(this.F.n8*2);
        this.toRprUncompressed(buff, 0, a);
        return buff;
    }

    toRprLEM(arr, offset, a) {
        if (a.byteLength == this.F.n8*2) {
            arr.set(a, offset);
            return;
        } else if (a.byteLength == this.F.n8*3) {
            this.tm.setBuff(this.pOp1, a);
            this.tm.instance.exports[this.prefix + "_toAffine"](this.pOp1, this.pOp1);
            const res = this.tm.getBuff(this.pOp1, this.F.n8*2);
            arr.set(res, offset);
        } else {
            throw new Error("invalid point size");
        }
    }

    fromRprLEM(arr, offset) {
        offset = offset || 0;
        return arr.slice(offset, offset+this.F.n8*2);
    }

    toString(a, radix) {
        if (a.byteLength == this.F.n8*3) {
            const x = this.F.toString(a.slice(0, this.F.n8), radix);
            const y = this.F.toString(a.slice(this.F.n8, this.F.n8*2), radix);
            const z = this.F.toString(a.slice(this.F.n8*2), radix);
            return `[ ${x}, ${y}, ${z} ]`;
        } else if (a.byteLength == this.F.n8*2) {
            const x = this.F.toString(a.slice(0, this.F.n8), radix);
            const y = this.F.toString(a.slice(this.F.n8), radix);
            return `[ ${x}, ${y} ]`;
        } else {
            throw new Error("invalid point size");
        }
    }


    fromRng(rng) {
        const F = this.F;
        let P = [];
        let greatest;
        let x3b;
        do {
            P[0] = F.fromRng(rng);
            greatest = rng.nextBool();
            x3b = F.add(F.mul(F.square(P[0]), P[0]), this.b);
        } while (!F.isSquare(x3b));

        P[1] = F.sqrt(x3b);

        const s = F.isNegative(P[1]);
        if (greatest ^ s) P[1] = F.neg(P[1]);

        let Pbuff = new Uint8Array(this.F.n8*2);
        Pbuff.set(P[0]);
        Pbuff.set(P[1], this.F.n8);

        if (this.cofactor) {
            Pbuff = this.timesScalar(Pbuff, this.cofactor);
        }

        return Pbuff;
    }



    toObject(a) {
        if (this.isZero(a)) {
            return [
                this.F.toObject(this.F.zero),
                this.F.toObject(this.F.one),
                this.F.toObject(this.F.zero),
            ];
        }
        const x = this.F.toObject(a.slice(0, this.F.n8));
        const y = this.F.toObject(a.slice(this.F.n8, this.F.n8*2));
        let z;
        if (a.byteLength == this.F.n8*3) {
            z = this.F.toObject(a.slice(this.F.n8*2, this.F.n8*3));
        } else {
            z = this.F.toObject(this.F.one);
        }
        return [x, y, z];
    }

    fromObject(a) {
        const x = this.F.fromObject(a[0]);
        const y = this.F.fromObject(a[1]);
        let z;
        if (a.length==3) {
            z = this.F.fromObject(a[2]);
        } else {
            z = this.F.one;
        }
        if (this.F.isZero(z, this.F.one)) {
            return this.zeroAffine;
        } else if (this.F.eq(z, this.F.one)) {
            const buff = new Uint8Array(this.F.n8*2);
            buff.set(x);
            buff.set(y, this.F.n8);
            return buff;
        } else {
            const buff = new Uint8Array(this.F.n8*3);
            buff.set(x);
            buff.set(y, this.F.n8);
            buff.set(z, this.F.n8*2);
            return buff;
        }
    }

    e(a) {
        if (a instanceof Uint8Array) return a;
        return this.fromObject(a);
    }

}

/* global WebAssembly */

function thread(self) {
    let instance;
    let memory;
    let u32;
    let u8;

    if (self) {
        self.onmessage = function(e) {
            let data;
            if (e.data) {
                data = e.data;
            } else {
                data = e;
            }

            if (data[0].cmd == "INIT") {
                init(data[0]).then(function() {
                    self.postMessage(data.result);
                });
            } else if (data[0].cmd == "TERMINATE") {
                process.exit();
            } else {
                const res = runTask(data);
                self.postMessage(res);
            }
        };
    }

    async function init(data) {
        const code = new Uint8Array(data.code);
        const wasmModule = await WebAssembly.compile(code);
        memory = new WebAssembly.Memory({initial:data.init});
        u32 = new Uint32Array(memory.buffer);
        u8 = new Uint8Array(memory.buffer);

        instance = await WebAssembly.instantiate(wasmModule, {
            env: {
                "memory": memory
            }
        });
    }



    function alloc(length) {
        while (u32[0] & 3) u32[0]++;  // Return always aligned pointers
        const res = u32[0];
        u32[0] += length;
        while (u32[0] > memory.buffer.byteLength) {
            memory.grow(100);
        }
        return res;
    }

    function allocBuffer(buffer) {
        const p = alloc(buffer.byteLength);
        setBuffer(p, buffer);
        return p;
    }

    function getBuffer(pointer, length) {
        return new Uint8Array(u8.buffer, u8.byteOffset + pointer, length);
    }

    function setBuffer(pointer, buffer) {
        u8.set(new Uint8Array(buffer), pointer);
    }

    function runTask(task) {
        if (task[0].cmd == "INIT") {
            return init(task[0]);
        }
        const ctx = {
            vars: [],
            out: []
        };
        const oldAlloc = u32[0];
        for (let i=0; i<task.length; i++) {
            switch (task[i].cmd) {
            case "ALLOCSET":
                ctx.vars[task[i].var] = allocBuffer(task[i].buff);
                break;
            case "ALLOC":
                ctx.vars[task[i].var] = alloc(task[i].len);
                break;
            case "SET":
                setBuffer(ctx.vars[task[i].var], task[i].buff);
                break;
            case "CALL": {
                const params = [];
                for (let j=0; j<task[i].params.length; j++) {
                    const p = task[i].params[j];
                    if (typeof p.var !== "undefined") {
                        params.push(ctx.vars[p.var] + (p.offset || 0));
                    } else if (typeof p.val != "undefined") {
                        params.push(p.val);
                    }
                }
                instance.exports[task[i].fnName](...params);
                break;
            }
            case "GET":
                ctx.out[task[i].out] = getBuffer(ctx.vars[task[i].var], task[i].len).slice();
                break;
            default:
                throw new Error("Invalid cmd");
            }
        }
        u32[0] = oldAlloc;
        return ctx.out;
    }


    return runTask;
}

/* global window, navigator, Blob, Worker, WebAssembly */
/*
    Copyright 2019 0KIMS association.

    This file is part of wasmsnark (Web Assembly zkSnark Prover).

    wasmsnark is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmsnark is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmsnark. If not, see <https://www.gnu.org/licenses/>.
*/

const MEM_SIZE = 4096;  // Memory size in 64K Pakes (256Mb)
const inBrowser = (typeof window !== "undefined");
let NodeWorker;
if (!inBrowser) {
    NodeWorker = NodeWorker_mod.Worker;
}

class Deferred {
    constructor() {
        this.promise = new Promise((resolve, reject)=> {
            this.reject = reject;
            this.resolve = resolve;
        });
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function base64ToArrayBuffer(base64) {
    if (process.browser) {
        var binary_string = window.atob(base64);
        var len = binary_string.length;
        var bytes = new Uint8Array(len);
        for (var i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes;
    } else {
        return new Uint8Array(Buffer.from(base64, "base64"));
    }
}




async function buildThreadManager(wasm, singleThread) {
    const tm = new ThreadManager();

    tm.memory = new WebAssembly.Memory({initial:MEM_SIZE});
    tm.u8 = new Uint8Array(tm.memory.buffer);
    tm.u32 = new Uint32Array(tm.memory.buffer);

    const wasmModule = await WebAssembly.compile(base64ToArrayBuffer(wasm.code));

    tm.instance = await WebAssembly.instantiate(wasmModule, {
        env: {
            "memory": tm.memory
        }
    });

    tm.singleThread = singleThread;
    tm.initalPFree = tm.u32[0];   // Save the Pointer to free space.
    tm.pq = wasm.pq;
    tm.pr = wasm.pr;
    tm.pG1gen = wasm.pG1gen;
    tm.pG1zero = wasm.pG1zero;
    tm.pG2gen = wasm.pG2gen;
    tm.pG2zero = wasm.pG2zero;
    tm.pOneT = wasm.pOneT;

    //    tm.pTmp0 = tm.alloc(curve.G2.F.n8*3);
    //    tm.pTmp1 = tm.alloc(curve.G2.F.n8*3);


    if (singleThread) {
        tm.code = base64ToArrayBuffer(wasm.code);
        tm.taskManager = thread();
        await tm.taskManager([{
            cmd: "INIT",
            init: MEM_SIZE,
            code: tm.code.slice()
        }]);
        tm.concurrency  = 1;
    } else {
        tm.workers = [];
        tm.pendingDeferreds = [];
        tm.working = [];

        let concurrency;

        if ((typeof(navigator) === "object") && navigator.hardwareConcurrency) {
            concurrency = navigator.hardwareConcurrency;
        } else {
            concurrency = os.cpus().length;
        }
        tm.concurrency = concurrency;

        for (let i = 0; i<concurrency; i++) {

            if (inBrowser) {
                const blob = new Blob(["(", thread.toString(), ")(self);"], { type: "text/javascript" });
                const url = URL.createObjectURL(blob);

                tm.workers[i] = new Worker(url);

                tm.workers[i].onmessage = getOnMsg(i);

            } else {
                tm.workers[i] = new NodeWorker("(" + thread.toString()+ ")(require('worker_threads').parentPort);", {eval: true});

                tm.workers[i].on("message", getOnMsg(i));
            }

            tm.working[i]=false;
        }

        const initPromises = [];
        for (let i=0; i<tm.workers.length;i++) {
            const copyCode = base64ToArrayBuffer(wasm.code).slice();
            initPromises.push(tm.postAction(i, [{
                cmd: "INIT",
                init: MEM_SIZE,
                code: copyCode
            }], [copyCode.buffer]));
        }

        await Promise.all(initPromises);

    }
    return tm;

    function getOnMsg(i) {
        return function(e) {
            let data;
            if ((e)&&(e.data)) {
                data = e.data;
            } else {
                data = e;
            }

            tm.working[i]=false;
            tm.pendingDeferreds[i].resolve(data);
            tm.processWorks();
        };
    }

}

class ThreadManager {
    constructor() {
        this.actionQueue = [];
        this.oldPFree = 0;
    }

    startSyncOp() {
        if (this.oldPFree != 0) throw new Error("Sync operation in progress");
        this.oldPFree = this.u32[0];
    }

    endSyncOp() {
        if (this.oldPFree == 0) throw new Error("No sync operation in progress");
        this.u32[0] = this.oldPFree;
        this.oldPFree = 0;
    }

    postAction(workerId, e, transfers, _deferred) {
        if (this.working[workerId]) {
            throw new Error("Posting a job t a working worker");
        }
        this.working[workerId] = true;

        this.pendingDeferreds[workerId] = _deferred ? _deferred : new Deferred();
        this.workers[workerId].postMessage(e, transfers);

        return this.pendingDeferreds[workerId].promise;
    }

    processWorks() {
        for (let i=0; (i<this.workers.length)&&(this.actionQueue.length > 0); i++) {
            if (this.working[i] == false) {
                const work = this.actionQueue.shift();
                this.postAction(i, work.data, work.transfers, work.deferred);
            }
        }
    }

    queueAction(actionData, transfers) {
        const d = new Deferred();

        if (this.singleThread) {
            const res = this.taskManager(actionData);
            d.resolve(res);
        } else {
            this.actionQueue.push({
                data: actionData,
                transfers: transfers,
                deferred: d
            });
            this.processWorks();
        }
        return d.promise;
    }

    resetMemory() {
        this.u32[0] = this.initalPFree;
    }

    allocBuff(buff) {
        const pointer = this.alloc(buff.byteLength);
        this.setBuff(pointer, buff);
        return pointer;
    }

    getBuff(pointer, length) {
        return this.u8.slice(pointer, pointer+ length);
    }

    setBuff(pointer, buffer) {
        this.u8.set(new Uint8Array(buffer), pointer);
    }

    alloc(length) {
        while (this.u32[0] & 3) this.u32[0]++;  // Return always aligned pointers
        const res = this.u32[0];
        this.u32[0] += length;
        return res;
    }

    async terminate() {
        for (let i=0; i<this.workers.length; i++) {
            this.workers[i].postMessage([{cmd: "TERMINATE"}]);
        }
        await sleep(200);
    }

}

function buildBatchApplyKey(curve, groupName) {
    const G = curve[groupName];
    const Fr = curve.Fr;
    const tm = curve.tm;

    curve[groupName].batchApplyKey = async function(buff, first, inc, inType, outType) {
        inType = inType || "affine";
        outType = outType || "affine";
        let fnName, fnAffine;
        let sGin, sGmid, sGout;
        if (groupName == "G1") {
            if (inType == "jacobian") {
                sGin = G.F.n8*3;
                fnName = "g1m_batchApplyKey";
            } else {
                sGin = G.F.n8*2;
                fnName = "g1m_batchApplyKeyMixed";
            }
            sGmid = G.F.n8*3;
            if (outType == "jacobian") {
                sGout = G.F.n8*3;
            } else {
                fnAffine = "g1m_batchToAffine";
                sGout = G.F.n8*2;
            }
        } else if (groupName == "G2") {
            if (inType == "jacobian") {
                sGin = G.F.n8*3;
                fnName = "g2m_batchApplyKey";
            } else {
                sGin = G.F.n8*2;
                fnName = "g2m_batchApplyKeyMixed";
            }
            sGmid = G.F.n8*3;
            if (outType == "jacobian") {
                sGout = G.F.n8*3;
            } else {
                fnAffine = "g2m_batchToAffine";
                sGout = G.F.n8*2;
            }
        } else if (groupName == "Fr") {
            fnName = "frm_batchApplyKey";
            sGin = G.n8;
            sGmid = G.n8;
            sGout = G.n8;
        } else {
            throw new Error("Invalid group: " + groupName);
        }
        const nPoints = Math.floor(buff.byteLength / sGin);
        const pointsPerChunk = Math.floor(nPoints/tm.concurrency);
        const opPromises = [];
        inc = Fr.e(inc);
        let t = Fr.e(first);
        for (let i=0; i<tm.concurrency; i++) {
            let n;
            if (i< tm.concurrency-1) {
                n = pointsPerChunk;
            } else {
                n = nPoints - i*pointsPerChunk;
            }
            if (n==0) continue;

            const task = [];

            task.push({
                cmd: "ALLOCSET",
                var: 0,
                buff: buff.slice(i*pointsPerChunk*sGin, i*pointsPerChunk*sGin + n*sGin)
            });
            task.push({cmd: "ALLOCSET", var: 1, buff: t});
            task.push({cmd: "ALLOCSET", var: 2, buff: inc});
            task.push({cmd: "ALLOC", var: 3, len: n*Math.max(sGmid, sGout)});
            task.push({
                cmd: "CALL",
                fnName: fnName,
                params: [
                    {var: 0},
                    {val: n},
                    {var: 1},
                    {var: 2},
                    {var:3}
                ]
            });
            if (fnAffine) {
                task.push({
                    cmd: "CALL",
                    fnName: fnAffine,
                    params: [
                        {var: 3},
                        {val: n},
                        {var: 3},
                    ]
                });
            }
            task.push({cmd: "GET", out: 0, var: 3, len: n*sGout});

            opPromises.push(tm.queueAction(task));
            t = Fr.mul(t, Fr.exp(inc, n));
        }

        const result = await Promise.all(opPromises);

        const outBuff = new Uint8Array(nPoints*sGout);
        let p=0;
        for (let i=0; i<result.length; i++) {
            outBuff.set(result[i][0], p);
            p += result[i][0].byteLength;
        }

        return outBuff;
    };
}

function buildPairing(curve) {
    const tm = curve.tm;
    curve.pairing = function pairing(a, b) {

        tm.startSyncOp();
        const pA = tm.allocBuff(curve.G1.toJacobian(a));
        const pB = tm.allocBuff(curve.G2.toJacobian(b));
        const pRes = tm.alloc(curve.Gt.n8);
        tm.instance.exports[curve.name + "_pairing"](pA, pB, pRes);

        const res = tm.getBuff(pRes, curve.Gt.n8);

        tm.endSyncOp();
        return res;
    };

    curve.pairingEq = async function pairingEq() {
        let  buffCt;
        let nEqs;
        if ((arguments.length % 2) == 1) {
            buffCt = arguments[arguments.length-1];
            nEqs = (arguments.length -1) /2;
        } else {
            buffCt = curve.Gt.one;
            nEqs = arguments.length /2;
        }

        const opPromises = [];
        for (let i=0; i<nEqs; i++) {

            const task = [];

            const g1Buff = curve.G1.toJacobian(arguments[i*2]);
            task.push({cmd: "ALLOCSET", var: 0, buff: g1Buff});
            task.push({cmd: "ALLOC", var: 1, len: curve.prePSize});

            const g2Buff = curve.G2.toJacobian(arguments[i*2 +1]);
            task.push({cmd: "ALLOCSET", var: 2, buff: g2Buff});
            task.push({cmd: "ALLOC", var: 3, len: curve.preQSize});

            task.push({cmd: "ALLOC", var: 4, len: curve.Gt.n8});

            task.push({cmd: "CALL", fnName: curve.name + "_prepareG1", params: [
                {var: 0},
                {var: 1}
            ]});

            task.push({cmd: "CALL", fnName: curve.name + "_prepareG2", params: [
                {var: 2},
                {var: 3}
            ]});

            task.push({cmd: "CALL", fnName: curve.name + "_millerLoop", params: [
                {var: 1},
                {var: 3},
                {var: 4}
            ]});

            task.push({cmd: "GET", out: 0, var: 4, len: curve.Gt.n8});

            opPromises.push(
                tm.queueAction(task)
            );
        }


        const result = await Promise.all(opPromises);

        tm.startSyncOp();
        const pRes = tm.alloc(curve.Gt.n8);
        tm.instance.exports.ftm_one(pRes);

        for (let i=0; i<result.length; i++) {
            const pMR = tm.allocBuff(result[i][0]);
            tm.instance.exports.ftm_mul(pRes, pMR, pRes);
        }
        tm.instance.exports[curve.name + "_finalExponentiation"](pRes, pRes);

        const pCt = tm.allocBuff(buffCt);

        const r = !!tm.instance.exports.ftm_eq(pRes, pCt);

        tm.endSyncOp();

        return r;
    };

    curve.prepareG1 = function(p) {
        this.tm.startSyncOp();
        const pP = this.tm.allocBuff(p);
        const pPrepP = this.tm.alloc(this.prePSize);
        this.tm.instance.exports[this.name + "_prepareG1"](pP, pPrepP);
        const res = this.tm.getBuff(pPrepP, this.prePSize);
        this.tm.endSyncOp();
        return res;
    };

    curve.prepareG2 = function(q) {
        this.tm.startSyncOp();
        const pQ = this.tm.allocBuff(q);
        const pPrepQ = this.tm.alloc(this.preQSize);
        this.tm.instance.exports[this.name + "_prepareG2"](pQ, pPrepQ);
        const res = this.tm.getBuff(pPrepQ, this.preQSize);
        this.tm.endSyncOp();
        return res;
    };

    curve.millerLoop = function(preP, preQ) {
        this.tm.startSyncOp();
        const pPreP = this.tm.allocBuff(preP);
        const pPreQ = this.tm.allocBuff(preQ);
        const pRes = this.tm.alloc(this.Gt.n8);
        this.tm.instance.exports[this.name + "_millerLoop"](pPreP, pPreQ, pRes);
        const res = this.tm.getBuff(pRes, this.Gt.n8);
        this.tm.endSyncOp();
        return res;
    };

    curve.finalExponentiation = function(a) {
        this.tm.startSyncOp();
        const pA = this.tm.allocBuff(a);
        const pRes = this.tm.alloc(this.Gt.n8);
        this.tm.instance.exports[this.name + "_finalExponentiation"](pA, pRes);
        const res = this.tm.getBuff(pRes, this.Gt.n8);
        this.tm.endSyncOp();
        return res;
    };

}

const pTSizes = [
    1 ,  1,  1,  1,    2,  3,  4,  5,
    6 ,  7,  7,  8,    9, 10, 11, 12,
    13, 13, 14, 15,   16, 16, 17, 17,
    17, 17, 17, 17,   17, 17, 17, 17
];

function buildMultiexp(curve, groupName) {
    const G = curve[groupName];
    async function _multiExp(buffBases, buffScalars, inType) {
        inType = inType || "affine";

        let sGIn;
        let fnName;
        if (groupName == "G1") {
            if (inType == "affine") {
                fnName = "g1m_multiexpAffine_chunk";
                sGIn = G.F.n8*2;
            } else {
                fnName = "g1m_multiexp_chunk";
                sGIn = G.F.n8*3;
            }
        } else if (groupName == "G2") {
            if (inType == "affine") {
                fnName = "g2m_multiexpAffine_chunk";
                sGIn = G.F.n8*2;
            } else {
                fnName = "g2m_multiexp_chunk";
                sGIn = G.F.n8*3;
            }
        } else {
            throw new Error("Invalid group");
        }
        const nPoints = Math.floor(buffBases.byteLength / sGIn);
        const sScalar = Math.floor(buffScalars.byteLength / nPoints);
        if( sScalar * nPoints != buffScalars.byteLength) {
            throw new Error("Scalar size does not match");
        }

        const bitChunkSize = pTSizes[log2$1(nPoints)];
        const nChunks = Math.floor((sScalar*8 - 1) / bitChunkSize) +1;

        const opPromises = [];
        for (let i=0; i<nChunks; i++) {
            const task = [
                {cmd: "ALLOCSET", var: 0, buff: buffBases},
                {cmd: "ALLOCSET", var: 1, buff: buffScalars},
                {cmd: "ALLOC", var: 2, len: G.F.n8*3},
                {cmd: "CALL", fnName: fnName, params: [
                    {var: 0},
                    {var: 1},
                    {val: sScalar},
                    {val: nPoints},
                    {val: i*bitChunkSize},
                    {val: Math.min(sScalar*8 - i*bitChunkSize, bitChunkSize)},
                    {var: 2}
                ]},
                {cmd: "GET", out: 0, var: 2, len: G.F.n8*3}
            ];
            opPromises.push(
                G.tm.queueAction(task)
            );
        }

        const result = await Promise.all(opPromises);

        let res = G.zero;
        for (let i=result.length-1; i>=0; i--) {
            if (!G.isZero(res)) {
                for (let j=0; j<bitChunkSize; j++) res = G.double(res);
            }
            res = G.add(res, result[i][0]);
        }

        return res;
    }

    G.multiExp = async function multiExpAffine(buffBases, buffScalars) {
        return await _multiExp(buffBases, buffScalars, "jacobian");
    };
    G.multiExpAffine = async function multiExpAffine(buffBases, buffScalars) {
        return await _multiExp(buffBases, buffScalars, "affine");
    };
}

function buildFFT(curve, groupName) {
    const G = curve[groupName];
    const Fr = curve.Fr;
    const tm = G.tm;
    async function _fft(buff, inverse, inType, outType, logger) {

        inType = inType || "affine";
        outType = outType || "affine";
        const MAX_BITS_THREAD = 12;

        let sIn, sMid, sOut, fnIn2Mid, fnMid2Out, fnName, fnFFTMix, fnFFTJoin, fnFFTFinal;
        if (groupName == "G1") {
            if (inType == "affine") {
                sIn = G.F.n8*2;
                fnIn2Mid = "g1m_batchToJacobian";
            } else {
                sIn = G.F.n8*3;
            }
            sMid = G.F.n8*3;
            if (inverse) {
                fnName = "g1m_ifft";
                fnFFTFinal = "g1m_fftFinal";
            } else {
                fnName = "g1m_fft";
            }
            fnFFTJoin = "g1m_fftJoin";
            fnFFTMix = "g1m_fftMix";

            if (outType == "affine") {
                sOut = G.F.n8*2;
                fnMid2Out = "g1m_batchToAffine";
            } else {
                sOut = G.F.n8*3;
            }

        } else if (groupName == "G2") {
            if (inType == "affine") {
                sIn = G.F.n8*2;
                fnIn2Mid = "g2m_batchToJacobian";
            } else {
                sIn = G.F.n8*3;
            }
            sMid = G.F.n8*3;
            if (inverse) {
                fnName = "g2m_ifft";
                fnFFTFinal = "g2m_fftFinal";
            } else {
                fnName = "g2m_fft";
            }
            fnFFTJoin = "g2m_fftJoin";
            fnFFTMix = "g2m_fftMix";
            if (outType == "affine") {
                sOut = G.F.n8*2;
                fnMid2Out = "g2m_batchToAffine";
            } else {
                sOut = G.F.n8*3;
            }
        } else if (groupName == "Fr") {
            sIn = G.n8;
            sMid = G.n8;
            sOut = G.n8;
            if (inverse) {
                fnName = "frm_ifft";
                fnFFTFinal = "frm_fftFinal";
            } else {
                fnName = "frm_fft";
            }
            fnFFTMix = "frm_fftMix";
            fnFFTJoin = "frm_fftJoin";
        }


        let returnArray = false;
        if (Array.isArray(buff)) {
            buff = curve.array2buffer(buff, sIn);
            returnArray = true;
        }

        const nPoints = buff.byteLength / sIn;
        const bits = log2$1(nPoints);

        if  ((1 << bits) != nPoints) {
            throw new Error("fft must be multiple of 2" );
        }

        let inv;
        if (inverse) {
            inv = Fr.inv(Fr.e(nPoints));
        }



        let buffOut;
        if (nPoints <= (1 << MAX_BITS_THREAD)) {
            const task = [];
            task.push({cmd: "ALLOC", var: 0, len: sMid*nPoints});
            task.push({cmd: "SET", var: 0, buff: buff});
            if (fnIn2Mid) {
                task.push({cmd: "CALL", fnName:fnIn2Mid, params: [{var:0}, {val: nPoints}, {var: 0}]});
            }
            task.push({cmd: "CALL", fnName:fnName, params: [{var:0}, {val: nPoints}]});
            if (fnMid2Out) {
                task.push({cmd: "CALL", fnName:fnMid2Out, params: [{var:0}, {val: nPoints}, {var: 0}]});
            }
            task.push({cmd: "GET", out: 0, var: 0, len: sOut*nPoints});

            const res = await tm.queueAction(task);
            buffOut = res[0];
        } else {

            buffReverseBits(buff, sIn);

            let chunks;
            const pointsInChunk = 1 << MAX_BITS_THREAD;
            const chunkSize = pointsInChunk * sIn;
            const nChunks = nPoints / pointsInChunk;

            const promises = [];
            for (let i = 0; i< nChunks; i++) {
                const task = [];
                task.push({cmd: "ALLOC", var: 0, len: sMid*pointsInChunk});
                const buffChunk = buff.slice( (pointsInChunk * i)*sIn, (pointsInChunk * (i+1))*sIn);
                task.push({cmd: "SET", var: 0, buff: buffChunk});
                if (fnIn2Mid) {
                    task.push({cmd: "CALL", fnName:fnIn2Mid, params: [{var:0}, {val: pointsInChunk}, {var: 0}]});
                }
                for (let j=1; j<=MAX_BITS_THREAD;j++) {
                    task.push({cmd: "CALL", fnName:fnFFTMix, params: [{var:0}, {val: pointsInChunk}, {val: j}]});
                }
                task.push({cmd: "GET", out:0, var: 0, len: sMid*pointsInChunk});
                promises.push(tm.queueAction(task).then( (r) => {
                    if (logger) logger.debug(`fft: ${i}/${nChunks}`);
                    return r;
                }));
            }

            chunks = await Promise.all(promises);
            for (let i = 0; i< nChunks; i++) chunks[i] = chunks[i][0];

            for (let i = MAX_BITS_THREAD+1;   i<=bits; i++) {
                if (logger) logger.debug(`fft join ${i}/${bits}`);
                const nGroups = 1 << (bits - i);
                const nChunksPerGroup = nChunks / nGroups;
                const opPromises = [];
                for (let j=0; j<nGroups; j++) {
                    for (let k=0; k <nChunksPerGroup/2; k++) {
                        const first = Fr.exp( Fr.w[i], k*pointsInChunk);
                        const inc = Fr.w[i];
                        const o1 = j*nChunksPerGroup + k;
                        const o2 = j*nChunksPerGroup + k + nChunksPerGroup/2;

                        const task = [];
                        task.push({cmd: "ALLOCSET", var: 0, buff: chunks[o1]});
                        task.push({cmd: "ALLOCSET", var: 1, buff: chunks[o2]});
                        task.push({cmd: "ALLOCSET", var: 2, buff: first});
                        task.push({cmd: "ALLOCSET", var: 3, buff: inc});
                        task.push({cmd: "CALL", fnName: fnFFTJoin,  params:[
                            {var: 0},
                            {var: 1},
                            {val: pointsInChunk},
                            {var: 2},
                            {var: 3}
                        ]});
                        if (i==bits) {
                            if (fnFFTFinal) {
                                task.push({cmd: "ALLOCSET", var: 4, buff: inv});
                                task.push({cmd: "CALL", fnName: fnFFTFinal,  params:[
                                    {var: 0},
                                    {val: pointsInChunk},
                                    {var: 4},
                                ]});
                                task.push({cmd: "CALL", fnName: fnFFTFinal,  params:[
                                    {var: 1},
                                    {val: pointsInChunk},
                                    {var: 4},
                                ]});
                            }
                            if (fnMid2Out) {
                                task.push({cmd: "CALL", fnName:fnMid2Out, params: [{var:0}, {val: pointsInChunk}, {var: 0}]});
                                task.push({cmd: "CALL", fnName:fnMid2Out, params: [{var:1}, {val: pointsInChunk}, {var: 1}]});
                            }
                            task.push({cmd: "GET", out: 0, var: 0, len: pointsInChunk*sOut});
                            task.push({cmd: "GET", out: 1, var: 1, len: pointsInChunk*sOut});
                        } else {
                            task.push({cmd: "GET", out: 0, var: 0, len: pointsInChunk*sMid});
                            task.push({cmd: "GET", out: 1, var: 1, len: pointsInChunk*sMid});
                        }
                        opPromises.push(tm.queueAction(task));
                    }
                }

                const res = await Promise.all(opPromises);
                for (let j=0; j<nGroups; j++) {
                    for (let k=0; k <nChunksPerGroup/2; k++) {
                        const o1 = j*nChunksPerGroup + k;
                        const o2 = j*nChunksPerGroup + k + nChunksPerGroup/2;
                        const resChunk = res.shift();
                        chunks[o1] = resChunk[0];
                        chunks[o2] = resChunk[1];
                    }
                }
            }

            buffOut = new Uint8Array(nPoints * sOut);
            if (inverse) {
                buffOut.set(chunks[0].slice((pointsInChunk-1)*sOut));
                let p= sOut;
                for (let i=nChunks-1; i>0; i--) {
                    buffOut.set(chunks[i], p);
                    p += chunkSize;
                    delete chunks[i];  // Liberate mem
                }
                buffOut.set(chunks[0].slice(0, (pointsInChunk-1)*sOut), p);
                delete chunks[nChunks-1];
            } else {
                for (let i=0; i<nChunks; i++) {
                    buffOut.set(chunks[i], pointsInChunk*sOut*i);
                    delete chunks[i];
                }
                return buffOut;
            }
        }

        if (returnArray) {
            return curve.buffer2array(buffOut, sOut);
        } else {
            return buffOut;
        }
    }

    G.fft = async function(buff, inType, outType, logger) {
        return await _fft(buff, false, inType, outType, logger);
    };

    G.ifft = async function(buff, inType, outType, logger) {
        return await _fft(buff, true, inType, outType, logger);
    };

    G.fftMix = async function fftMix(buff) {
        const sG = G.F.n8*3;
        let fnName, fnFFTJoin;
        if (groupName == "G1") {
            fnName = "g1m_fftMix";
            fnFFTJoin = "g1m_fftJoin";
        } else if (groupName == "G2") {
            fnName = "g2m_fftMix";
            fnFFTJoin = "g2m_fftJoin";
        } else if (groupName == "Fr") {
            fnName = "frm_fftMix";
            fnFFTJoin = "frm_fftJoin";
        } else {
            throw new Error("Invalid group");
        }

        const nPoints = Math.floor(buff.byteLength / sG);
        const power = log2$1(nPoints);

        let nChunks = 1 << log2$1(tm.concurrency);

        if (nPoints <= nChunks*2) nChunks = 1;

        const pointsPerChunk = nPoints / nChunks;

        const powerChunk = log2$1(pointsPerChunk);

        const opPromises = [];
        for (let i=0; i<nChunks; i++) {
            const task = [];
            const b = buff.slice((i* pointsPerChunk)*sG, ((i+1)* pointsPerChunk)*sG);
            task.push({cmd: "ALLOCSET", var: 0, buff: b});
            for (let j=1; j<=powerChunk; j++) {
                task.push({cmd: "CALL", fnName: fnName, params: [
                    {var: 0},
                    {val: pointsPerChunk},
                    {val: j}
                ]});
            }
            task.push({cmd: "GET", out: 0, var: 0, len: pointsPerChunk*sG});
            opPromises.push(
                tm.queueAction(task)
            );
        }

        const result = await Promise.all(opPromises);

        const chunks = [];
        for (let i=0; i<result.length; i++) chunks[i] = result[i][0];


        for (let i = powerChunk+1; i<=power; i++) {
            const nGroups = 1 << (power - i);
            const nChunksPerGroup = nChunks / nGroups;
            const opPromises = [];
            for (let j=0; j<nGroups; j++) {
                for (let k=0; k <nChunksPerGroup/2; k++) {
                    const first = Fr.exp( Fr.w[i], k*pointsPerChunk);
                    const inc = Fr.w[i];
                    const o1 = j*nChunksPerGroup + k;
                    const o2 = j*nChunksPerGroup + k + nChunksPerGroup/2;

                    const task = [];
                    task.push({cmd: "ALLOCSET", var: 0, buff: chunks[o1]});
                    task.push({cmd: "ALLOCSET", var: 1, buff: chunks[o2]});
                    task.push({cmd: "ALLOCSET", var: 2, buff: first});
                    task.push({cmd: "ALLOCSET", var: 3, buff: inc});
                    task.push({cmd: "CALL", fnName: fnFFTJoin,  params:[
                        {var: 0},
                        {var: 1},
                        {val: pointsPerChunk},
                        {var: 2},
                        {var: 3}
                    ]});
                    task.push({cmd: "GET", out: 0, var: 0, len: pointsPerChunk*sG});
                    task.push({cmd: "GET", out: 1, var: 1, len: pointsPerChunk*sG});
                    opPromises.push(tm.queueAction(task));
                }
            }

            const res = await Promise.all(opPromises);
            for (let j=0; j<nGroups; j++) {
                for (let k=0; k <nChunksPerGroup/2; k++) {
                    const o1 = j*nChunksPerGroup + k;
                    const o2 = j*nChunksPerGroup + k + nChunksPerGroup/2;
                    const resChunk = res.shift();
                    chunks[o1] = resChunk[0];
                    chunks[o2] = resChunk[1];
                }
            }
        }


        const fullBuffOut = new Uint8Array(nPoints*sG);
        let p =0;
        for (let i=0; i<nChunks; i++) {
            fullBuffOut.set(chunks[i], p);
            p+=chunks[i].byteLength;
        }

        return fullBuffOut;
    };

    G.fftJoin = async function fftJoin(buff1, buff2, first, inc) {
        const sG = G.F.n8*3;
        let fnName;
        if (groupName == "G1") {
            fnName = "g1m_fftJoin";
        } else if (groupName == "G2") {
            fnName = "g2m_fftJoin";
        } else {
            throw new Error("Invalid group");
        }

        if (buff1.byteLength != buff2.byteLength) {
            throw new Error("Invalid buffer size");
        }
        const nPoints = Math.floor(buff1.byteLength / sG);
        if (nPoints != 1 << log2$1(nPoints)) {
            throw new Error("Invalid number of points");
        }

        let nChunks = 1 << log2$1(tm.concurrency);
        if (nPoints <= nChunks*2) nChunks = 1;

        const pointsPerChunk = nPoints / nChunks;


        const opPromises = [];
        for (let i=0; i<nChunks; i++) {
            const task = [];

            const firstChunk = Fr.mul(first, Fr.exp(inc, i*pointsPerChunk));
            const b1 = buff1.slice((i* pointsPerChunk)*sG, ((i+1)* pointsPerChunk)*sG);
            const b2 = buff2.slice((i* pointsPerChunk)*sG, ((i+1)* pointsPerChunk)*sG);
            task.push({cmd: "ALLOCSET", var: 0, buff: b1});
            task.push({cmd: "ALLOCSET", var: 1, buff: b2});
            task.push({cmd: "ALLOCSET", var: 2, buff: firstChunk});
            task.push({cmd: "ALLOCSET", var: 3, buff: inc});
            task.push({cmd: "CALL", fnName: fnName, params: [
                {var: 0},
                {var: 1},
                {val: pointsPerChunk},
                {var: 2},
                {var: 3}
            ]});
            task.push({cmd: "GET", out: 0, var: 0, len: pointsPerChunk*sG});
            task.push({cmd: "GET", out: 1, var: 1, len: pointsPerChunk*sG});
            opPromises.push(
                tm.queueAction(task)
            );

        }


        const result = await Promise.all(opPromises);

        const fullBuffOut1 = new Uint8Array(nPoints*sG);
        const fullBuffOut2 = new Uint8Array(nPoints*sG);
        let p =0;
        for (let i=0; i<result.length; i++) {
            fullBuffOut1.set(result[i][0], p);
            fullBuffOut2.set(result[i][1], p);
            p+=result[i][0].byteLength;
        }

        return [fullBuffOut1, fullBuffOut2];
    };

    G.fftFinal =  async function fftFinal(buff, factor) {
        const sG = G.F.n8*3;
        const sGout = G.F.n8*2;
        let fnName, fnToAffine;
        if (groupName == "G1") {
            fnName = "g1m_fftFinal";
            fnToAffine = "g1m_batchToAffine";
        } else if (groupName == "G2") {
            fnName = "g2m_fftFinal";
            fnToAffine = "g2m_batchToAffine";
        } else {
            throw new Error("Invalid group");
        }

        const nPoints = Math.floor(buff.byteLength / sG);
        if (nPoints != 1 << log2$1(nPoints)) {
            throw new Error("Invalid number of points");
        }

        const pointsPerChunk = Math.floor(nPoints / tm.concurrency);

        const opPromises = [];
        for (let i=0; i<tm.concurrency; i++) {
            let n;
            if (i< tm.concurrency-1) {
                n = pointsPerChunk;
            } else {
                n = nPoints - i*pointsPerChunk;
            }
            if (n==0) continue;
            const task = [];
            const b = buff.slice((i* pointsPerChunk)*sG, (i*pointsPerChunk+n)*sG);
            task.push({cmd: "ALLOCSET", var: 0, buff: b});
            task.push({cmd: "ALLOCSET", var: 1, buff: factor});
            task.push({cmd: "CALL", fnName: fnName, params: [
                {var: 0},
                {val: n},
                {var: 1},
            ]});
            task.push({cmd: "CALL", fnName: fnToAffine, params: [
                {var: 0},
                {val: n},
                {var: 0},
            ]});
            task.push({cmd: "GET", out: 0, var: 0, len: n*sGout});
            opPromises.push(
                tm.queueAction(task)
            );

        }

        const result = await Promise.all(opPromises);

        const fullBuffOut = new Uint8Array(nPoints*sGout);
        let p =0;
        for (let i=result.length-1; i>=0; i--) {
            fullBuffOut.set(result[i][0], p);
            p+=result[i][0].byteLength;
        }

        return fullBuffOut;
    };
}

async function buildEngine(params) {

    const tm = await buildThreadManager(params.wasm, params.singleThread);


    const curve = {};

    curve.q = e$2(params.wasm.q);
    curve.r = e$2(params.wasm.r);
    curve.name = params.name;
    curve.tm = tm;
    curve.prePSize = params.wasm.prePSize;
    curve.preQSize = params.wasm.preQSize;
    curve.Fr = new WasmField1(tm, "frm", params.n8r, params.r);
    curve.F1 = new WasmField1(tm, "f1m", params.n8q, params.q);
    curve.F2 = new WasmField2(tm, "f2m", curve.F1);
    curve.G1 = new WasmCurve(tm, "g1m", curve.F1, params.wasm.pG1gen, params.wasm.pG1b, params.cofactorG1);
    curve.G2 = new WasmCurve(tm, "g2m", curve.F2, params.wasm.pG2gen, params.wasm.pG2b, params.cofactorG2);
    curve.F6 = new WasmField3(tm, "f6m", curve.F2);
    curve.F12 = new WasmField2(tm, "ftm", curve.F6);

    curve.Gt = curve.F12;

    buildBatchApplyKey(curve, "G1");
    buildBatchApplyKey(curve, "G2");
    buildBatchApplyKey(curve, "Fr");

    buildMultiexp(curve, "G1");
    buildMultiexp(curve, "G2");

    buildFFT(curve, "G1");
    buildFFT(curve, "G2");
    buildFFT(curve, "Fr");

    buildPairing(curve);

    curve.array2buffer = function(arr, sG) {
        const buff = new Uint8Array(sG*arr.length);

        for (let i=0; i<arr.length; i++) {
            buff.set(arr[i], i*sG);
        }

        return buff;
    };

    curve.buffer2array = function(buff , sG) {
        const n= buff.length / sG;
        const arr = new Array(n);
        for (let i=0; i<n; i++) {
            arr[i] = buff.slice(i*sG, i*sG+sG);
        }
        return arr;
    };

    return curve;
}

let curve;

async function buildBn128() {

    if (curve) return curve;
    const params = {
        name: "bn128",
        wasm: wasmcurves.bn128_wasm,
        q: e$2("21888242871839275222246405745257275088696311157297823662689037894645226208583"),
        r: e$2("21888242871839275222246405745257275088548364400416034343698204186575808495617"),
        n8q: 32,
        n8r: 32,
        cofactorG2: e$2("30644e72e131a029b85045b68181585e06ceecda572a2489345f2299c0f9fa8d", 16),
        singleThread: false
    };

    curve = await buildEngine(params);
    curve.terminate = async function() {
        curve = null;
        await this.tm.terminate();
    };

    return curve;
}

let curve$1;

async function buildBls12381() {

    if (curve$1) return curve$1;
    const params = {
        name: "bls12381",
        wasm: wasmcurves.bls12381_wasm,
        q: e$2("1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaab", 16),
        r: e$2("73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001", 16),
        n8q: 48,
        n8r: 32,
        cofactorG1: e$2("0x396c8c005555e1568c00aaab0000aaab", 16),
        cofactorG2: e$2("0x5d543a95414e7f1091d50792876a202cd91de4547085abaa68a205b2e5a7ddfa628f1cb4d9e82ef21537e293a6691ae1616ec6e786f0c70cf1c38e31c7238e5", 16),
        singleThread: false
    };

    curve$1 = await buildEngine(params);

    curve$1.terminate = async function() {
        curve$1 = null;
        await this.tm.terminate();
    };
    return curve$1;
}

const Scalar$1=_Scalar;
const utils$1 = _utils;

var main = /*#__PURE__*/Object.freeze({
    __proto__: null,
    Scalar: Scalar$1,
    utils: utils$1,
    PolField: PolField,
    F1Field: F1Field,
    F2Field: F2Field,
    F3Field: F3Field,
    ZqField: F1Field,
    EC: EC,
    buildBn128: buildBn128,
    buildBls12381: buildBls12381,
    ChaCha: ChaCha
});

async function open(fileName, openFlags, cacheSize) {
    cacheSize = cacheSize || 4096*64;
    if (["w+", "wx+", "r", "ax+", "a+"].indexOf(openFlags) <0)
        throw new Error("Invalid open option");
    const fd =await fs.promises.open(fileName, openFlags);

    const stats = await fd.stat();

    return  new FastFile(fd, stats, cacheSize, fileName);
}

class FastFile {

    constructor(fd, stats, cacheSize, fileName) {
        this.fileName = fileName;
        this.fd = fd;
        this.pos = 0;
        this.pageBits = 8;
        this.pageSize = (1 << this.pageBits);
        while (this.pageSize < stats.blksize*4) {
            this.pageBits ++;
            this.pageSize *= 2;
        }
        this.totalSize = stats.size;
        this.totalPages = Math.floor((stats.size -1) / this.pageSize)+1;
        this.maxPagesLoaded = Math.floor( cacheSize / this.pageSize)+1;
        this.pages = {};
        this.pendingLoads = [];
        this.writing = false;
        this.reading = false;
    }

    _loadPage(p) {
        const self = this;
        return new Promise((resolve, reject)=> {
            self.pendingLoads.push({
                page: p,
                resolve: resolve,
                reject: reject
            });
            setImmediate(self._triggerLoad.bind(self));
        });
    }


    _triggerLoad() {
        const self = this;
        processPendingLoads();
        if (self.pendingLoads.length == 0) return;
        if (Object.keys(self.pages).length >= self.maxPagesLoaded) {
            const dp = getDeletablePage();
            if (dp<0) {  // // No sizes available
//                setTimeout(self._triggerLoad.bind(self), 10000);
                return;
            }
            delete self.pages[dp];
        }
        const load = self.pendingLoads.shift();
        if (load.page>=self.totalPages) {
            self.pages[load.page] = {
                dirty: false,
                buff: new Uint8Array(self.pageSize),
                pendingOps: 1,
                size: 0
            };
            load.resolve();
            setImmediate(self._triggerLoad.bind(self));
            return;
        }
        if (self.reading) {
            self.pendingLoads.unshift(load);
            return;  // Only one read at a time.
        }

        self.reading = true;
        const page = {
            dirty: false,
            buff: new Uint8Array(self.pageSize),
            pendingOps: 1,
            size: 0
        };
        self.fd.read(page.buff, 0, self.pageSize, load.page*self.pageSize).then((res)=> {
            page.size = res.bytesRead;
            self.pages[load.page] = page;
            self.reading = false;
            load.resolve();
            setImmediate(self._triggerLoad.bind(self));
        }, (err) => {
            load.reject(err);
        });

        function processPendingLoads() {
            const newPendingLoads = [];
            for (let i=0; i<self.pendingLoads.length; i++) {
                const load = self.pendingLoads[i];
                if (typeof self.pages[load.page] != "undefined") {
                    self.pages[load.page].pendingOps ++;
                    load.resolve();
                } else {
                    newPendingLoads.push(load);
                }
            }
            self.pendingLoads = newPendingLoads;
        }

        function getDeletablePage() {
            for (let p in self.pages) {
                const page = self.pages[p];
                if ((page.dirty == false)&&(page.pendingOps==0)) return p;
            }
            return -1;
        }
    }

    _triggerWrite() {
        const self = this;
        if (self.writing) return;
        const p = self._getDirtyPage();
        if (p<0) {
            if (self.pendingClose) self.pendingClose();
            return;
        }
        self.writing=true;
        self.pages[p].dirty = false;
        self.fd.write(self.pages[p].buff, 0, self.pages[p].size, p*self.pageSize).then(() => {
            self.writing = false;
            setImmediate(self._triggerWrite.bind(self));
            setImmediate(self._triggerLoad.bind(self));
        }, (err) => {
            console.log("ERROR Writing: "+err);
            self.error = err;
            self._tryClose();
        });

    }

    _getDirtyPage() {
        for (let p in this.pages) {
            if (this.pages[p].dirty) return p;
        }
        return -1;
    }

    async write(buff, pos) {
        if (buff.byteLength == 0) return;
        const self = this;
        if (buff.byteLength > self.pageSize*self.maxPagesLoaded*0.8) {
            const cacheSize = Math.floor(buff.byteLength * 1.1);
            this.maxPagesLoaded = Math.floor( cacheSize / self.pageSize)+1;
        }
        if (typeof pos == "undefined") pos = self.pos;
        self.pos = pos+buff.byteLength;
        if (self.totalSize < pos + buff.byteLength) self.totalSize = pos + buff.byteLength;
        if (self.pendingClose)
            throw new Error("Writing a closing file");
        const firstPage = Math.floor(pos / self.pageSize);
        const lastPage = Math.floor((pos+buff.byteLength-1) / self.pageSize);

        for (let i=firstPage; i<=lastPage; i++) await self._loadPage(i);

        let p = firstPage;
        let o = pos % self.pageSize;
        let r = buff.byteLength;
        while (r>0) {
            const l = (o+r > self.pageSize) ? (self.pageSize -o) : r;
            const srcView = new Uint8Array(buff.buffer, buff.byteLength - r, l);
            const dstView = new Uint8Array(self.pages[p].buff.buffer, o, l);
            dstView.set(srcView);
            self.pages[p].dirty = true;
            self.pages[p].pendingOps --;
            self.pages[p].size = Math.max(o+l, self.pages[p].size);
            if (p>=self.totalPages) {
                self.totalPages = p+1;
            }
            r = r-l;
            p ++;
            o = 0;
        }
        setImmediate(self._triggerWrite.bind(self));
    }

    async read(len, pos) {
        if (len == 0) {
            return new Uint8Array(0);
        }
        const self = this;
        if (len > self.pageSize*self.maxPagesLoaded*0.8) {
            const cacheSize = Math.floor(len * 1.1);
            this.maxPagesLoaded = Math.floor( cacheSize / self.pageSize)+1;
        }
        if (typeof pos == "undefined") pos = self.pos;
        self.pos = pos+len;
        if (self.pendingClose)
            throw new Error("Reading a closing file");
        const firstPage = Math.floor(pos / self.pageSize);
        const lastPage = Math.floor((pos+len-1) / self.pageSize);

        for (let i=firstPage; i<=lastPage; i++) await self._loadPage(i);

        let buff = new Uint8Array(len);
        let dstView = new Uint8Array(buff);
        let p = firstPage;
        let o = pos % self.pageSize;
        // Remaining bytes to read
        let r = pos + len > self.totalSize ? len - (pos + len - self.totalSize): len;
        while (r>0) {
            // bytes to copy from this page
            const l = (o+r > self.pageSize) ? (self.pageSize -o) : r;
            const srcView = new Uint8Array(self.pages[p].buff.buffer, o, l);
            buff.set(srcView, dstView.byteLength-r);
            self.pages[p].pendingOps --;
            r = r-l;
            p ++;
            o = 0;
        }
        setImmediate(self._triggerLoad.bind(self));
        return buff;
    }

    _tryClose() {
        const self = this;
        if (!self.pendingClose) return;
        if (self.error) {
            self.pendingCloseReject(self.error);
        }
        const p = self._getDirtyPage();
        if ((p>=0) || (self.writing) || (self.reading) || (self.pendingLoads.length>0)) return;
        self.pendingClose();
    }

    close() {
        const self = this;
        if (self.pendingClose)
            throw new Error("Closing the file twice");
        return new Promise((resolve, reject) => {
            self.pendingClose = resolve;
            self.pendingCloseReject = reject;
            self._tryClose();
        }).then(()=> {
            self.fd.close();
        }, (err) => {
            self.fd.close();
            throw (err);
        });
    }

    async discard() {
        const self = this;
        await self.close();
        await fs.promises.unlink(this.fileName);
    }

    async writeULE32(v, pos) {
        const self = this;

        const b = Uint32Array.of(v);

        await self.write(new Uint8Array(b.buffer), pos);
    }

    async writeUBE32(v, pos) {
        const self = this;

        const buff = new Uint8Array(4);
        const buffV = new DataView(buff.buffer);
        buffV.setUint32(0, v, false);

        await self.write(buff, pos);
    }


    async writeULE64(v, pos) {
        const self = this;

        const b = Uint32Array.of(v & 0xFFFFFFFF, Math.floor(v / 0x100000000));

        await self.write(new Uint8Array(b.buffer), pos);
    }

    async readULE32(pos) {
        const self = this;
        const b = await self.read(4, pos);

        const view = new Uint32Array(b.buffer);

        return view[0];
    }

    async readUBE32(pos) {
        const self = this;
        const b = await self.read(4, pos);

        const view = new DataView(b.buffer);

        return view.getUint32(0, false);
    }

    async readULE64(pos) {
        const self = this;
        const b = await self.read(8, pos);

        const view = new Uint32Array(b.buffer);

        return view[1] * 0x100000000 + view[0];
    }

}

function createNew(o) {
    const initialSize = o.initialSize || 1<<20;
    const fd = new MemFile();
    fd.o = o;
    fd.o.data = new Uint8Array(initialSize);
    fd.allocSize = initialSize;
    fd.totalSize = 0;
    fd.readOnly = false;
    fd.pos = 0;
    return fd;
}

function readExisting(o) {
    const fd = new MemFile();
    fd.o = o;
    fd.allocSize = o.data.byteLength;
    fd.totalSize = o.data.byteLength;
    fd.readOnly = true;
    fd.pos = 0;
    return fd;
}

class MemFile {

    constructor() {
        this.pageSize = 1 << 14;  // for compatibility
    }

    _resizeIfNeeded(newLen) {
        if (newLen > this.allocSize) {
            const newAllocSize = Math.max(
                this.allocSize + (1 << 20),
                Math.floor(this.allocSize * 1.1),
                newLen
            );
            const newData = new Uint8Array(newAllocSize);
            newData.set(this.o.data);
            this.o.data = newData;
            this.allocSize = newAllocSize;
        }
    }

    async write(buff, pos) {
        const self =this;
        if (typeof pos == "undefined") pos = self.pos;
        if (this.readOnly) throw new Error("Writing a read only file");

        this._resizeIfNeeded(pos + buff.byteLength);

        this.o.data.set(buff, pos);

        if (pos + buff.byteLength > this.totalSize) this.totalSize = pos + buff.byteLength;

        this.pos = pos + buff.byteLength;
    }

    async read(len, pos) {
        const self = this;
        if (typeof pos == "undefined") pos = self.pos;
        if (this.readOnly) {
            if (pos + len > this.totalSize) throw new Error("Reading out of bounds");
        }
        this._resizeIfNeeded(pos + len);

        const buff = this.o.data.slice(pos, pos+len);
        this.pos = pos + len;
        return buff;
    }

    close() {
        if (this.o.data.byteLength != this.totalSize) {
            this.o.data = this.o.data.slice(0, this.totalSize);
        }
    }

    async discard() {
    }

    async writeULE32(v, pos) {
        const self = this;

        const b = Uint32Array.of(v);

        await self.write(new Uint8Array(b.buffer), pos);
    }

    async writeUBE32(v, pos) {
        const self = this;

        const buff = new Uint8Array(4);
        const buffV = new DataView(buff.buffer);
        buffV.setUint32(0, v, false);

        await self.write(buff, pos);
    }


    async writeULE64(v, pos) {
        const self = this;

        const b = Uint32Array.of(v & 0xFFFFFFFF, Math.floor(v / 0x100000000));

        await self.write(new Uint8Array(b.buffer), pos);
    }

    async readULE32(pos) {
        const self = this;
        const b = await self.read(4, pos);

        const view = new Uint32Array(b.buffer);

        return view[0];
    }

    async readUBE32(pos) {
        const self = this;
        const b = await self.read(4, pos);

        const view = new DataView(b.buffer);

        return view.getUint32(0, false);
    }

    async readULE64(pos) {
        const self = this;
        const b = await self.read(8, pos);

        const view = new Uint32Array(b.buffer);

        return view[1] * 0x100000000 + view[0];
    }

}

async function createOverride(o, b) {
    if (typeof o === "string") {
        o = {
            type: "file",
            fileName: o,
            cacheSize: b
        };
    }
    if (o.type == "file") {
        return await open(o.fileName, "w+", o.cacheSize);
    } else if (o.type == "mem") {
        return createNew(o);
    } else {
        throw new Error("Invalid FastFile type: "+o.type);
    }
}

function readExisting$1(o, b) {
    if (o instanceof Uint8Array) {
        o = {
            type: "mem",
            data: o
        };
    }
    if (typeof o === "string") {
        o = {
            type: "file",
            fileName: o,
            cacheSize: b
        };
    }
    if (o.type == "file") {
        return open(o.fileName, "r", o.cacheSize);
    } else if (o.type == "mem") {
        return readExisting(o);
    } else {
        throw new Error("Invalid FastFile type: "+o.type);
    }
}

async function readBinFile(fileName, type, maxVersion) {

    const fd = await readExisting$1(fileName);

    const b = await fd.read(4);
    let readedType = "";
    for (let i=0; i<4; i++) readedType += String.fromCharCode(b[i]);

    if (readedType != type) throw new Error(fileName + ": Invalid File format");

    let v = await fd.readULE32();

    if (v>maxVersion) throw new Error("Version not supported");

    const nSections = await fd.readULE32();

    // Scan sections
    let sections = [];
    for (let i=0; i<nSections; i++) {
        let ht = await fd.readULE32();
        let hl = await fd.readULE64();
        if (typeof sections[ht] == "undefined") sections[ht] = [];
        sections[ht].push({
            p: fd.pos,
            size: hl
        });
        fd.pos += hl;
    }

    return {fd, sections};
}

async function createBinFile(fileName, type, version, nSections) {

    const fd = await createOverride(fileName);

    const buff = new Uint8Array(4);
    for (let i=0; i<4; i++) buff[i] = type.charCodeAt(i);
    await fd.write(buff, 0); // Magic "r1cs"

    await fd.writeULE32(version); // Version
    await fd.writeULE32(nSections); // Number of Sections

    return fd;
}

async function startWriteSection(fd, idSection) {
    if (typeof fd.writingSection !== "undefined") throw new Error("Already writing a section");
    await fd.writeULE32(idSection); // Header type
    fd.writingSection = {
        pSectionSize: fd.pos
    };
    await fd.writeULE64(0); // Temporally set to 0 length
}

async function endWriteSection(fd) {
    if (typeof fd.writingSection === "undefined") throw new Error("Not writing a section");

    const sectionSize = fd.pos - fd.writingSection.pSectionSize - 8;
    const oldPos = fd.pos;
    fd.pos = fd.writingSection.pSectionSize;
    fd.writeULE64(sectionSize);
    fd.pos = oldPos;
    delete fd.writingSection;
}

async function startReadUniqueSection(fd, sections, idSection) {
    if (typeof fd.readingSection !== "undefined") throw new Error("Already reading a section");
    if (!sections[idSection])  throw new Error(fd.fileName + ": Missing section "+ idSection );
    if (sections[idSection].length>1) throw new Error(fd.fileName +": Section Duplicated " +idSection);

    fd.pos = sections[idSection][0].p;

    fd.readingSection = sections[idSection][0];
}

async function endReadSection(fd, noCheck) {
    if (typeof fd.readingSection === "undefined") throw new Error("Not reading a section");
    if (!noCheck) {
        if (fd.pos-fd.readingSection.p !=  fd.readingSection.size) throw new Error("Invalid section size reading");
    }
    delete fd.readingSection;
}

async function writeBigInt(fd, n, n8, pos) {
    const buff = new Uint8Array(n8);
    Scalar$1.toRprLE(buff, 0, n, n8);
    await fd.write(buff, pos);
}

async function readBigInt(fd, n8, pos) {
    const buff = await fd.read(n8, pos);
    return Scalar$1.fromRprLE(buff, 0, n8);
}

async function copySection(fdFrom, sections, fdTo, sectionId) {
    const chunkSize = fdFrom.pageSize;
    await startReadUniqueSection(fdFrom, sections, sectionId);
    await startWriteSection(fdTo, sectionId);
    for (let p=0; p<sections[sectionId][0].size; p+=chunkSize) {
        const l = Math.min(sections[sectionId][0].size -p, chunkSize);
        const buff = await fdFrom.read(l);
        await fdTo.write(buff);
    }
    await endWriteSection(fdTo);
    await endReadSection(fdFrom);

}

async function readFullSection(fd, sections, idSection) {
    await startReadUniqueSection(fd, sections, idSection);
    const res = await fd.read(fd.readingSection.size);
    await endReadSection(fd);
    return res;
}

async function sectionIsEqual(fd1, sections1, fd2, sections2, idSection) {
    const MAX_BUFF_SIZE = fd1.pageSize * 16;
    await startReadUniqueSection(fd1, sections1, idSection);
    await startReadUniqueSection(fd2, sections2, idSection);
    if (sections1[idSection][0].size != sections2[idSection][0].size) return false;
    const totalBytes=sections1[idSection][0].size;
    for (let i=0; i<totalBytes; i+= MAX_BUFF_SIZE) {
        const n = Math.min(totalBytes-i, MAX_BUFF_SIZE);
        const buff1 = await fd1.read(n);
        const buff2 = await fd2.read(n);
        for (i=0; i<n; i++) if (buff1[i] != buff2[i]) return false;
    }
    await endReadSection(fd1);
    await endReadSection(fd2);
    return true;
}

const bls12381r = Scalar$1.e("73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001", 16);
const bn128r = Scalar$1.e("21888242871839275222246405745257275088548364400416034343698204186575808495617");

const bls12381q = Scalar$1.e("1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaab", 16);
const bn128q = Scalar$1.e("21888242871839275222246405745257275088696311157297823662689037894645226208583");

async function getCurveFromQ(q) {
    let curve;
    if (Scalar$1.eq(q, bn128q)) {
        curve = await buildBn128();
    } else if (Scalar$1.eq(q, bls12381q)) {
        curve = await buildBls12381();
    } else {
        throw new Error(`Curve not supported: ${Scalar$1.toString(q)}`);
    }
    return curve;
}
async function getCurveFromName(name) {
    let curve;
    const normName = normalizeName(name);
    if (["BN128", "BN254", "ALTBN128"].indexOf(normName) >= 0) {
        curve = await buildBn128();
    } else if (["BLS12381"].indexOf(normName) >= 0) {
        curve = await buildBls12381();
    } else {
        throw new Error(`Curve not supported: ${name}`);
    }
    return curve;

    function normalizeName(n) {
        return n.toUpperCase().match(/[A-Za-z0-9]+/g).join("");
    }

}

assert.notEqual = notEqual;
assert.notOk = notOk;
assert.equal = equal;
assert.ok = assert;

var nanoassert = assert;

function equal (a, b, m) {
  assert(a == b, m); // eslint-disable-line eqeqeq
}

function notEqual (a, b, m) {
  assert(a != b, m); // eslint-disable-line eqeqeq
}

function notOk (t, m) {
  assert(!t, m);
}

function assert (t, m) {
  if (!t) throw new Error(m || 'AssertionError')
}

var blake2b = loadWebAssembly;

loadWebAssembly.supported = typeof WebAssembly !== 'undefined';

function loadWebAssembly (opts) {
  if (!loadWebAssembly.supported) return null

  var imp = opts && opts.imports;
  var wasm = toUint8Array('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');
  var ready = null;

  var mod = {
    buffer: wasm,
    memory: null,
    exports: null,
    realloc: realloc,
    onload: onload
  };

  onload(function () {});

  return mod

  function realloc (size) {
    mod.exports.memory.grow(Math.max(0, Math.ceil(Math.abs(size - mod.memory.length) / 65536)));
    mod.memory = new Uint8Array(mod.exports.memory.buffer);
  }

  function onload (cb) {
    if (mod.exports) return cb()

    if (ready) {
      ready.then(cb.bind(null, null)).catch(cb);
      return
    }

    try {
      if (opts && opts.async) throw new Error('async')
      setup({instance: new WebAssembly.Instance(new WebAssembly.Module(wasm), imp)});
    } catch (err) {
      ready = WebAssembly.instantiate(wasm, imp).then(setup);
    }

    onload(cb);
  }

  function setup (w) {
    mod.exports = w.instance.exports;
    mod.memory = mod.exports.memory && mod.exports.memory.buffer && new Uint8Array(mod.exports.memory.buffer);
  }
}

function toUint8Array (s) {
  if (typeof atob === 'function') return new Uint8Array(atob(s).split('').map(charCodeAt))
  return (commonjsRequire().Buffer).from(s, 'base64')
}

function charCodeAt (c) {
  return c.charCodeAt(0)
}

var blake2bWasm = createCommonjsModule(function (module) {
var wasm = blake2b();

var head = 64;
var freeList = [];

module.exports = Blake2b;
var BYTES_MIN = module.exports.BYTES_MIN = 16;
var BYTES_MAX = module.exports.BYTES_MAX = 64;
var BYTES = module.exports.BYTES = 32;
var KEYBYTES_MIN = module.exports.KEYBYTES_MIN = 16;
var KEYBYTES_MAX = module.exports.KEYBYTES_MAX = 64;
var KEYBYTES = module.exports.KEYBYTES = 32;
var SALTBYTES = module.exports.SALTBYTES = 16;
var PERSONALBYTES = module.exports.PERSONALBYTES = 16;

function Blake2b (digestLength, key, salt, personal, noAssert) {
  if (!(this instanceof Blake2b)) return new Blake2b(digestLength, key, salt, personal, noAssert)
  if (!(wasm && wasm.exports)) throw new Error('WASM not loaded. Wait for Blake2b.ready(cb)')
  if (!digestLength) digestLength = 32;

  if (noAssert !== true) {
    nanoassert(digestLength >= BYTES_MIN, 'digestLength must be at least ' + BYTES_MIN + ', was given ' + digestLength);
    nanoassert(digestLength <= BYTES_MAX, 'digestLength must be at most ' + BYTES_MAX + ', was given ' + digestLength);
    if (key != null) {
      nanoassert(key instanceof Uint8Array, 'key must be Uint8Array or Buffer');
      nanoassert(key.length >= KEYBYTES_MIN, 'key must be at least ' + KEYBYTES_MIN + ', was given ' + key.length);
      nanoassert(key.length <= KEYBYTES_MAX, 'key must be at least ' + KEYBYTES_MAX + ', was given ' + key.length);
    }
    if (salt != null) {
      nanoassert(salt instanceof Uint8Array, 'salt must be Uint8Array or Buffer');
      nanoassert(salt.length === SALTBYTES, 'salt must be exactly ' + SALTBYTES + ', was given ' + salt.length);
    }
    if (personal != null) {
      nanoassert(personal instanceof Uint8Array, 'personal must be Uint8Array or Buffer');
      nanoassert(personal.length === PERSONALBYTES, 'personal must be exactly ' + PERSONALBYTES + ', was given ' + personal.length);
    }
  }

  if (!freeList.length) {
    freeList.push(head);
    head += 216;
  }

  this.digestLength = digestLength;
  this.finalized = false;
  this.pointer = freeList.pop();

  wasm.memory.fill(0, 0, 64);
  wasm.memory[0] = this.digestLength;
  wasm.memory[1] = key ? key.length : 0;
  wasm.memory[2] = 1; // fanout
  wasm.memory[3] = 1; // depth

  if (salt) wasm.memory.set(salt, 32);
  if (personal) wasm.memory.set(personal, 48);

  if (this.pointer + 216 > wasm.memory.length) wasm.realloc(this.pointer + 216); // we need 216 bytes for the state
  wasm.exports.blake2b_init(this.pointer, this.digestLength);

  if (key) {
    this.update(key);
    wasm.memory.fill(0, head, head + key.length); // whiteout key
    wasm.memory[this.pointer + 200] = 128;
  }
}


Blake2b.prototype.update = function (input) {
  nanoassert(this.finalized === false, 'Hash instance finalized');
  nanoassert(input instanceof Uint8Array, 'input must be Uint8Array or Buffer');

  if (head + input.length > wasm.memory.length) wasm.realloc(head + input.length);
  wasm.memory.set(input, head);
  wasm.exports.blake2b_update(this.pointer, head, head + input.length);
  return this
};

Blake2b.prototype.getPartialHash = function () {
  return wasm.memory.slice(this.pointer, this.pointer+216);
};

Blake2b.prototype.setPartialHash = function (ph) {
  wasm.memory.set(ph, this.pointer);
};


Blake2b.prototype.digest = function (enc) {
  nanoassert(this.finalized === false, 'Hash instance finalized');
  this.finalized = true;

  freeList.push(this.pointer);
  wasm.exports.blake2b_final(this.pointer);

  if (!enc || enc === 'binary') {
    return wasm.memory.slice(this.pointer + 128, this.pointer + 128 + this.digestLength)
  }

  if (enc === 'hex') {
    return hexSlice(wasm.memory, this.pointer + 128, this.digestLength)
  }

  nanoassert(enc instanceof Uint8Array && enc.length >= this.digestLength, 'input must be Uint8Array or Buffer');
  for (var i = 0; i < this.digestLength; i++) {
    enc[i] = wasm.memory[this.pointer + 128 + i];
  }

  return enc
};

// libsodium compat
Blake2b.prototype.final = Blake2b.prototype.digest;

Blake2b.WASM = wasm && wasm.buffer;
Blake2b.SUPPORTED = typeof WebAssembly !== 'undefined';

Blake2b.ready = function (cb) {
  if (!cb) cb = noop;
  if (!wasm) return cb(new Error('WebAssembly not supported'))

  // backwards compat, can be removed in a new major
  var p = new Promise(function (reject, resolve) {
    wasm.onload(function (err) {
      if (err) resolve();
      else reject();
      cb(err);
    });
  });

  return p
};

Blake2b.prototype.ready = Blake2b.ready;

function noop () {}

function hexSlice (buf, start, len) {
  var str = '';
  for (var i = 0; i < len; i++) str += toHex(buf[start + i]);
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}
});
var blake2bWasm_1 = blake2bWasm.BYTES_MIN;
var blake2bWasm_2 = blake2bWasm.BYTES_MAX;
var blake2bWasm_3 = blake2bWasm.BYTES;
var blake2bWasm_4 = blake2bWasm.KEYBYTES_MIN;
var blake2bWasm_5 = blake2bWasm.KEYBYTES_MAX;
var blake2bWasm_6 = blake2bWasm.KEYBYTES;
var blake2bWasm_7 = blake2bWasm.SALTBYTES;
var blake2bWasm_8 = blake2bWasm.PERSONALBYTES;

/* global window */

const _revTable$2 = [];
for (let i=0; i<256; i++) {
    _revTable$2[i] = _revSlow$2(i, 8);
}

function _revSlow$2(idx, bits) {
    let res =0;
    let a = idx;
    for (let i=0; i<bits; i++) {
        res <<= 1;
        res = res | (a &1);
        a >>=1;
    }
    return res;
}

function bitReverse$1(idx, bits) {
    return (
        _revTable$2[idx >>> 24] |
        (_revTable$2[(idx >>> 16) & 0xFF] << 8) |
        (_revTable$2[(idx >>> 8) & 0xFF] << 16) |
        (_revTable$2[idx & 0xFF] << 24)
    ) >>> (32-bits);
}


function log2$2( V )
{
    return( ( ( V & 0xFFFF0000 ) !== 0 ? ( V &= 0xFFFF0000, 16 ) : 0 ) | ( ( V & 0xFF00FF00 ) !== 0 ? ( V &= 0xFF00FF00, 8 ) : 0 ) | ( ( V & 0xF0F0F0F0 ) !== 0 ? ( V &= 0xF0F0F0F0, 4 ) : 0 ) | ( ( V & 0xCCCCCCCC ) !== 0 ? ( V &= 0xCCCCCCCC, 2 ) : 0 ) | ( ( V & 0xAAAAAAAA ) !== 0 ) );
}


function formatHash(b, title) {
    const a = new DataView(b.buffer, b.byteOffset, b.byteLength);
    let S = "";
    for (let i=0; i<4; i++) {
        if (i>0) S += "\n";
        S += "\t\t";
        for (let j=0; j<4; j++) {
            if (j>0) S += " ";
            S += a.getUint32(i*16+j*4).toString(16).padStart(8, "0");
        }
    }
    if (title) S = title + "\n" + S;
    return S;
}

function hashIsEqual(h1, h2) {
    if (h1.byteLength != h2.byteLength) return false;
    var dv1 = new Int8Array(h1);
    var dv2 = new Int8Array(h2);
    for (var i = 0 ; i != h1.byteLength ; i++)
    {
        if (dv1[i] != dv2[i]) return false;
    }
    return true;
}

function cloneHasher(h) {
    const ph = h.getPartialHash();
    const res = blake2bWasm(64);
    res.setPartialHash(ph);
    return res;
}

async function sameRatio(curve, g1s, g1sx, g2s, g2sx) {
    if (curve.G1.isZero(g1s)) return false;
    if (curve.G1.isZero(g1sx)) return false;
    if (curve.G2.isZero(g2s)) return false;
    if (curve.G2.isZero(g2sx)) return false;
    // return curve.F12.eq(curve.pairing(g1s, g2sx), curve.pairing(g1sx, g2s));
    const res = await curve.pairingEq(g1s, g2sx, curve.G1.neg(g1sx), g2s);
    return res;
}


function askEntropy() {
    if (process.browser) {
        return window.prompt("Enter a random text. (Entropy): ", "");
    } else {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve) => {
            rl.question("Enter a random text. (Entropy): ", (input) => resolve(input) );
        });
    }
}

async function getRandomRng(entropy) {
    // Generate a random Rng
    while (!entropy) {
        entropy = await askEntropy();
    }
    const hasher = blake2bWasm(64);
    hasher.update(crypto.randomBytes(64));
    const enc = new TextEncoder(); // always utf-8
    hasher.update(enc.encode(entropy));
    const hash = Buffer.from(hasher.digest());

    const seed = [];
    for (let i=0;i<8;i++) {
        seed[i] = hash.readUInt32BE(i*4);
    }
    const rng = new ChaCha(seed);
    return rng;
}

function rngFromBeaconParams(beaconHash, numIterationsExp) {
    let nIterationsInner;
    let nIterationsOuter;
    if (numIterationsExp<32) {
        nIterationsInner = (1 << numIterationsExp) >>> 0;
        nIterationsOuter = 1;
    } else {
        nIterationsInner = 0x100000000;
        nIterationsOuter = (1 << (numIterationsExp-32)) >>> 0;
    }

    let curHash = beaconHash;
    for (let i=0; i<nIterationsOuter; i++) {
        for (let j=0; j<nIterationsInner; j++) {
            curHash = crypto.createHash("sha256").update(curHash).digest();
        }
    }

    const curHashV = new DataView(curHash.buffer, curHash.byteOffset, curHash.byteLength);
    const seed = [];
    for (let i=0; i<8; i++) {
        seed[i] = curHashV.getUint32(i*4, false);
    }

    const rng = new ChaCha(seed);

    return rng;
}

function hex2ByteArray(s) {
    if (s instanceof Uint8Array) return s;
    if (s.slice(0,2) == "0x") s= s.slice(2);
    return new Uint8Array(s.match(/[\da-f]{2}/gi).map(function (h) {
        return parseInt(h, 16);
    }));
}

function byteArray2hex(byteArray) {
    return Array.prototype.map.call(byteArray, function(byte) {
        return ("0" + (byte & 0xFF).toString(16)).slice(-2);
    }).join("");
}

async function writeHeader(fd, zkey) {

    // Write the header
    ///////////
    await startWriteSection(fd, 1);
    await fd.writeULE32(1); // Groth
    await endWriteSection(fd);

    // Write the Groth header section
    ///////////

    const curve = await getCurveFromQ(zkey.q);

    await startWriteSection(fd, 2);
    const primeQ = curve.q;
    const n8q = (Math.floor( (Scalar$1.bitLength(primeQ) - 1) / 64) +1)*8;

    const primeR = curve.r;
    const n8r = (Math.floor( (Scalar$1.bitLength(primeR) - 1) / 64) +1)*8;

    await fd.writeULE32(n8q);
    await writeBigInt(fd, primeQ, n8q);
    await fd.writeULE32(n8r);
    await writeBigInt(fd, primeR, n8r);
    await fd.writeULE32(zkey.nVars);                         // Total number of bars
    await fd.writeULE32(zkey.nPublic);                       // Total number of public vars (not including ONE)
    await fd.writeULE32(zkey.domainSize);                  // domainSize
    await writeG1(fd, curve, zkey.vk_alpha_1);
    await writeG1(fd, curve, zkey.vk_beta_1);
    await writeG2(fd, curve, zkey.vk_beta_2);
    await writeG2(fd, curve, zkey.vk_gamma_2);
    await writeG1(fd, curve, zkey.vk_delta_1);
    await writeG2(fd, curve, zkey.vk_delta_2);

    await endWriteSection(fd);


}

async function writeG1(fd, curve, p) {
    const buff = new Uint8Array(curve.G1.F.n8*2);
    curve.G1.toRprLEM(buff, 0, p);
    await fd.write(buff);
}

async function writeG2(fd, curve, p) {
    const buff = new Uint8Array(curve.G2.F.n8*2);
    curve.G2.toRprLEM(buff, 0, p);
    await fd.write(buff);
}

async function readG1(fd, curve) {
    const buff = await fd.read(curve.G1.F.n8*2);
    return curve.G1.fromRprLEM(buff, 0);
}

async function readG2(fd, curve) {
    const buff = await fd.read(curve.G2.F.n8*2);
    return curve.G2.fromRprLEM(buff, 0);
}



async function readHeader(fd, sections, protocol) {
    if (protocol != "groth16") throw new Error("Protocol not supported: "+protocol);

    const zkey = {};

    // Read Header
    /////////////////////
    await startReadUniqueSection(fd, sections, 1);
    const protocolId = await fd.readULE32();
    if (protocolId != 1) throw new Error("File is not groth");
    zkey.protocol = "groth16";
    await endReadSection(fd);

    // Read Groth Header
    /////////////////////
    await startReadUniqueSection(fd, sections, 2);
    const n8q = await fd.readULE32();
    zkey.n8q = n8q;
    zkey.q = await readBigInt(fd, n8q);

    const n8r = await fd.readULE32();
    zkey.n8r = n8r;
    zkey.r = await readBigInt(fd, n8r);

    let curve = await getCurveFromQ(zkey.q);

    zkey.nVars = await fd.readULE32();
    zkey.nPublic = await fd.readULE32();
    zkey.domainSize = await fd.readULE32();
    zkey.power = log2$2(zkey.domainSize);
    zkey.vk_alpha_1 = await readG1(fd, curve);
    zkey.vk_beta_1 = await readG1(fd, curve);
    zkey.vk_beta_2 = await readG2(fd, curve);
    zkey.vk_gamma_2 = await readG2(fd, curve);
    zkey.vk_delta_1 = await readG1(fd, curve);
    zkey.vk_delta_2 = await readG2(fd, curve);
    await endReadSection(fd);

    return zkey;

}

async function readZKey(fileName) {
    const {fd, sections} = await readBinFile(fileName, "zkey", 1);

    const zkey = await readHeader(fd, sections, "groth16");

    const Fr = new F1Field(zkey.r);
    const Rr = Scalar$1.mod(Scalar$1.shl(1, zkey.n8r*8), zkey.r);
    const Rri = Fr.inv(Rr);
    const Rri2 = Fr.mul(Rri, Rri);

    let curve = getCurveFromQ(zkey.q);

    // Read IC Section
    ///////////
    await startReadUniqueSection(fd, sections, 3);
    zkey.IC = [];
    for (let i=0; i<= zkey.nPublic; i++) {
        const P = await readG1(fd, curve);
        zkey.IC.push(P);
    }
    await endReadSection(fd);


    // Read Coefs
    ///////////
    await startReadUniqueSection(fd, sections, 4);
    const nCCoefs = await fd.readULE32();
    zkey.ccoefs = [];
    for (let i=0; i<nCCoefs; i++) {
        const m = await fd.readULE32();
        const c = await fd.readULE32();
        const s = await fd.readULE32();
        const v = await readFr2();
        zkey.ccoefs.push({
            matrix: m,
            constraint: c,
            signal: s,
            value: v
        });
    }
    await endReadSection(fd);

    // Read A points
    ///////////
    await startReadUniqueSection(fd, sections, 5);
    zkey.A = [];
    for (let i=0; i<zkey.nVars; i++) {
        const A = await readG1(fd, curve);
        zkey.A[i] = A;
    }
    await endReadSection(fd);


    // Read B1
    ///////////
    await startReadUniqueSection(fd, sections, 6);
    zkey.B1 = [];
    for (let i=0; i<zkey.nVars; i++) {
        const B1 = await readG1(fd, curve);

        zkey.B1[i] = B1;
    }
    await endReadSection(fd);


    // Read B2 points
    ///////////
    await startReadUniqueSection(fd, sections, 7);
    zkey.B2 = [];
    for (let i=0; i<zkey.nVars; i++) {
        const B2 = await readG2(fd, curve);
        zkey.B2[i] = B2;
    }
    await endReadSection(fd);


    // Read C points
    ///////////
    await startReadUniqueSection(fd, sections, 8);
    zkey.C = [];
    for (let i=zkey.nPublic+1; i<zkey.nVars; i++) {
        const C = await readG1(fd, curve);

        zkey.C[i] = C;
    }
    await endReadSection(fd);


    // Read H points
    ///////////
    await startReadUniqueSection(fd, sections, 9);
    zkey.hExps = [];
    for (let i=0; i<zkey.domainSize; i++) {
        const H = await readG1(fd, curve);
        zkey.hExps.push(H);
    }
    await endReadSection(fd);

    await fd.close();

    return zkey;

    async function readFr2() {
        const n = await readBigInt(fd, zkey.n8r);
        return Fr.mul(n, Rri2);
    }

}


async function readContribution(fd, curve) {
    const c = {delta:{}};
    c.deltaAfter = await readG1(fd, curve);
    c.delta.g1_s = await readG1(fd, curve);
    c.delta.g1_sx = await readG1(fd, curve);
    c.delta.g2_spx = await readG2(fd, curve);
    c.transcript = await fd.read(64);
    c.type = await fd.readULE32();

    const paramLength = await fd.readULE32();
    const curPos = fd.pos;
    let lastType =0;
    while (fd.pos-curPos < paramLength) {
        const buffType = await fd.read(1);
        if (buffType[0]<= lastType) throw new Error("Parameters in the contribution must be sorted");
        lastType = buffType[0];
        if (buffType[0]==1) {     // Name
            const buffLen = await fd.read(1);
            const buffStr = await fd.read(buffLen[0]);
            c.name = new TextDecoder().decode(buffStr);
        } else if (buffType[0]==2) {
            const buffExp = await fd.read(1);
            c.numIterationsExp = buffExp[0];
        } else if (buffType[0]==3) {
            const buffLen = await fd.read(1);
            c.beaconHash = await fd.read(buffLen[0]);
        } else {
            throw new Error("Parameter not recognized");
        }
    }
    if (fd.pos != curPos + paramLength) {
        throw new Error("Parametes do not match");
    }

    return c;
}


async function readMPCParams(fd, curve, sections) {
    await startReadUniqueSection(fd, sections, 10);
    const res = { contributions: []};
    res.csHash = await fd.read(64);
    const n = await fd.readULE32();
    for (let i=0; i<n; i++) {
        const c = await readContribution(fd, curve);
        res.contributions.push(c);
    }
    await endReadSection(fd);

    return res;
}

async function writeContribution(fd, curve, c) {
    await writeG1(fd, curve, c.deltaAfter);
    await writeG1(fd, curve, c.delta.g1_s);
    await writeG1(fd, curve, c.delta.g1_sx);
    await writeG2(fd, curve, c.delta.g2_spx);
    await fd.write(c.transcript);
    await fd.writeULE32(c.type || 0);

    const params = [];
    if (c.name) {
        params.push(1);      // Param Name
        const nameData = new TextEncoder("utf-8").encode(c.name.substring(0,64));
        params.push(nameData.byteLength);
        for (let i=0; i<nameData.byteLength; i++) params.push(nameData[i]);
    }
    if (c.type == 1) {
        params.push(2);      // Param numIterationsExp
        params.push(c.numIterationsExp);

        params.push(3);      // Beacon Hash
        params.push(c.beaconHash.byteLength);
        for (let i=0; i<c.beaconHash.byteLength; i++) params.push(c.beaconHash[i]);
    }
    if (params.length>0) {
        const paramsBuff = new Uint8Array(params);
        await fd.writeULE32(paramsBuff.byteLength);
        await fd.write(paramsBuff);
    } else {
        await fd.writeULE32(0);
    }

}

async function writeMPCParams(fd, curve, mpcParams) {
    await startWriteSection(fd, 10);
    await fd.write(mpcParams.csHash);
    await fd.writeULE32(mpcParams.contributions.length);
    for (let i=0; i<mpcParams.contributions.length; i++) {
        await writeContribution(fd, curve,mpcParams.contributions[i]);
    }
    await endWriteSection(fd);
}

function hashG1(hasher, curve, p) {
    const buff = new Uint8Array(curve.G1.F.n8*2);
    curve.G1.toRprUncompressed(buff, 0, p);
    hasher.update(buff);
}

function hashG2(hasher,curve, p) {
    const buff = new Uint8Array(curve.G2.F.n8*2);
    curve.G2.toRprUncompressed(buff, 0, p);
    hasher.update(buff);
}

function hashPubKey(hasher, curve, c) {
    hashG1(hasher, curve, c.deltaAfter);
    hashG1(hasher, curve, c.delta.g1_s);
    hashG1(hasher, curve, c.delta.g1_sx);
    hashG2(hasher, curve, c.delta.g2_spx);
    hasher.update(c.transcript);
}

async function write(fd, witness, prime) {

    await startWriteSection(fd, 1);
    const n8 = (Math.floor( (Scalar$1.bitLength(prime) - 1) / 64) +1)*8;
    await fd.writeULE32(n8);
    await writeBigInt(fd, prime, n8);
    await fd.writeULE32(witness.length);
    await endWriteSection(fd);

    await startWriteSection(fd, 2);
    for (let i=0; i<witness.length; i++) {
        await writeBigInt(fd, witness[i], n8);
    }
    await endWriteSection(fd);


}

async function writeBin(fd, witnessBin, prime) {

    await startWriteSection(fd, 1);
    const n8 = (Math.floor( (Scalar$1.bitLength(prime) - 1) / 64) +1)*8;
    await fd.writeULE32(n8);
    await writeBigInt(fd, prime, n8);
    if (witnessBin.byteLength % n8 != 0) {
        throw new Error("Invalid witness length");
    }
    await fd.writeULE32(witnessBin.byteLength / n8);
    await endWriteSection(fd);


    await startWriteSection(fd, 2);
    await fd.write(witnessBin);
    await endWriteSection(fd);

}

async function readHeader$1(fd, sections) {

    await startReadUniqueSection(fd, sections, 1);
    const n8 = await fd.readULE32();
    const q = await readBigInt(fd, n8);
    const nWitness = await fd.readULE32();
    await endReadSection(fd);

    return {n8, q, nWitness};

}

async function read(fileName) {

    const {fd, sections} = await readBinFile(fileName, "wtns", 2);

    const {n8, nWitness} = await readHeader$1(fd, sections);

    await startReadUniqueSection(fd, sections, 2);
    const res = [];
    for (let i=0; i<nWitness; i++) {
        const v = await readBigInt(fd, n8);
        res.push(v);
    }
    await endReadSection(fd);

    await fd.close();

    return res;
}

const {stringifyBigInts: stringifyBigInts$3} = utils$1;

async function groth16ProofFromInput(zkeyFileName, witnessFileName, logger) {
    const {fd: fdWtns, sections: sectionsWtns} = await readBinFile(witnessFileName, "wtns", 2);

    const wtns = await readHeader$1(fdWtns, sectionsWtns);

    const {fd: fdZKey, sections: sectionsZKey} = await readBinFile(zkeyFileName, "zkey", 2);

    const zkey = await readHeader(fdZKey, sectionsZKey, "groth16");

    if (!Scalar$1.eq(zkey.r,  wtns.q)) {
        throw new Error("Curve of the witness does not match the curve of the proving key");
    }

    if (wtns.nWitness != zkey.nVars) {
        throw new Error(`Invalid witness length. Circuit: ${zkey.nVars}, witness: ${wtns.nWitness}`);
    }

    const curve = await getCurveFromQ(zkey.q);
    const Fr = curve.Fr;
    const G1 = curve.G1;
    const G2 = curve.G2;

    const power = log2$2(zkey.domainSize);

    const buffWitness = await readFullSection(fdWtns, sectionsWtns, 2);
    const buffCoeffs = await readFullSection(fdZKey, sectionsZKey, 4);
    const buffBasesA = await readFullSection(fdZKey, sectionsZKey, 5);
    const buffBasesB1 = await readFullSection(fdZKey, sectionsZKey, 6);
    const buffBasesB2 = await readFullSection(fdZKey, sectionsZKey, 7);
    const buffBasesC = await readFullSection(fdZKey, sectionsZKey, 8);
    const buffBasesH = await readFullSection(fdZKey, sectionsZKey, 9);

    const [buffA_T, buffB_T, buffC_T] = await buldABC(curve, zkey, buffWitness, buffCoeffs);

    const buffA = await Fr.ifft(buffA_T);
    const buffAodd = await Fr.batchApplyKey(buffA, Fr.e(1), curve.Fr.w[power+1]);
    const buffAodd_T = await Fr.fft(buffAodd);

    const buffB = await Fr.ifft(buffB_T);
    const buffBodd = await Fr.batchApplyKey(buffB, Fr.e(1), curve.Fr.w[power+1]);
    const buffBodd_T = await Fr.fft(buffBodd);

    const buffC = await Fr.ifft(buffC_T);
    const buffCodd = await Fr.batchApplyKey(buffC, Fr.e(1), curve.Fr.w[power+1]);
    const buffCodd_T = await Fr.fft(buffCodd);

    const buffPodd_T = await joinABC(curve, zkey, buffAodd_T, buffBodd_T, buffCodd_T);

    let proof = {};

    proof.pi_a = await curve.G1.multiExpAffine(buffBasesA, buffWitness);
    let pib1 = await curve.G1.multiExpAffine(buffBasesB1, buffWitness);
    proof.pi_b = await curve.G2.multiExpAffine(buffBasesB2, buffWitness);
    proof.pi_c = await curve.G1.multiExpAffine(buffBasesC, buffWitness.slice((zkey.nPublic+1)*curve.Fr.n8));
    const resH = await curve.G1.multiExpAffine(buffBasesH, buffPodd_T);

    const r = curve.Fr.random();
    const s = curve.Fr.random();

    proof.pi_a  = G1.add( proof.pi_a, zkey.vk_alpha_1 );
    proof.pi_a  = G1.add( proof.pi_a, G1.timesFr( zkey.vk_delta_1, r ));

    proof.pi_b  = G2.add( proof.pi_b, zkey.vk_beta_2 );
    proof.pi_b  = G2.add( proof.pi_b, G2.timesFr( zkey.vk_delta_2, s ));

    pib1 = G1.add( pib1, zkey.vk_beta_1 );
    pib1 = G1.add( pib1, G1.timesFr( zkey.vk_delta_1, s ));

    proof.pi_c = G1.add(proof.pi_c, resH);


    proof.pi_c  = G1.add( proof.pi_c, G1.timesFr( proof.pi_a, s ));
    proof.pi_c  = G1.add( proof.pi_c, G1.timesFr( pib1, r ));
    proof.pi_c  = G1.add( proof.pi_c, G1.timesFr( zkey.vk_delta_1, Fr.neg(Fr.mul(r,s) )));


    let publicSignals = [];

    for (let i=1; i<= zkey.nPublic; i++) {
        const b = buffWitness.slice(i*Fr.n8, i*Fr.n8+Fr.n8);
        publicSignals.push(Scalar$1.fromRprLE(b));
    }

    proof.pi_a = G1.toObject(G1.toAffine(proof.pi_a));
    proof.pi_b = G2.toObject(G2.toAffine(proof.pi_b));
    proof.pi_c = G1.toObject(G1.toAffine(proof.pi_c));

    proof.protocol = "groth16";

    await fdZKey.close();
    await fdWtns.close();

    proof = stringifyBigInts$3(proof);
    publicSignals = stringifyBigInts$3(publicSignals);


    return {proof, publicSignals};
}


async function buldABC(curve, zkey, witness, coeffs) {
    const concurrency = curve.tm.concurrency;
    const sCoef = 4*3 + zkey.n8r;

    const elementsPerChunk = Math.floor(zkey.domainSize/concurrency);
    const coeffsDV = new DataView(coeffs.buffer, coeffs.byteOffset, coeffs.byteLength);
    const promises = [];

    const cutPoints = [];
    for (let i=0; i<concurrency; i++) {
        cutPoints.push( getCutPoint( Math.floor(i*zkey.domainSize /concurrency) ));
    }
    cutPoints.push(coeffs.byteLength);

    for (let i=0; i<concurrency; i++) {
        let n;
        if (i< concurrency-1) {
            n = elementsPerChunk;
        } else {
            n = zkey.domainSize - i*elementsPerChunk;
        }
        if (n==0) continue;

        const task = [];

        task.push({cmd: "ALLOCSET", var: 0, buff: coeffs.slice(cutPoints[i], cutPoints[i+1])});
        task.push({cmd: "ALLOCSET", var: 1, buff: witness.slice()});
        task.push({cmd: "ALLOC", var: 2, len: n*curve.Fr.n8});
        task.push({cmd: "ALLOC", var: 3, len: n*curve.Fr.n8});
        task.push({cmd: "ALLOC", var: 4, len: n*curve.Fr.n8});
        task.push({cmd: "CALL", fnName: "qap_buildABC", params:[
            {var: 0},
            {val: (cutPoints[i+1] - cutPoints[i])/sCoef},
            {var: 1},
            {var: 2},
            {var: 3},
            {var: 4},
            {val: i*elementsPerChunk},
            {val: n}
        ]});
        task.push({cmd: "GET", out: 0, var: 2, len: n*curve.Fr.n8});
        task.push({cmd: "GET", out: 1, var: 3, len: n*curve.Fr.n8});
        task.push({cmd: "GET", out: 2, var: 4, len: n*curve.Fr.n8});
        promises.push(curve.tm.queueAction(task));
    }

    const result = await Promise.all(promises);

    const outBuffA = new Uint8Array(zkey.domainSize * curve.Fr.n8);
    const outBuffB = new Uint8Array(zkey.domainSize * curve.Fr.n8);
    const outBuffC = new Uint8Array(zkey.domainSize * curve.Fr.n8);
    let p=0;
    for (let i=0; i<result.length; i++) {
        outBuffA.set(result[i][0], p);
        outBuffB.set(result[i][1], p);
        outBuffC.set(result[i][2], p);
        p += result[i][0].byteLength;
    }

    return [outBuffA, outBuffB, outBuffC];

    function getCutPoint(v) {
        let m = 0;
        let n = coeffsDV.getUint32(0, true);
        while (m < n) {
            var k = (n + m) >> 1;
            const va = coeffsDV.getUint32(4 + k*sCoef + 4, true);
            if (va > v) {
                n = k - 1;
            } else if (va < v) {
                m = k + 1;
            } else {
                n = k;
            }
        }
        return 4 + m*sCoef;
    }
}


async function joinABC(curve, zkey, a, b, c) {
    const concurrency = curve.tm.concurrency;

    const n8 = curve.Fr.n8;
    const nElements = Math.floor(a.byteLength / curve.Fr.n8);
    const elementsPerChunk = Math.floor(nElements/concurrency);

    const promises = [];

    for (let i=0; i<concurrency; i++) {
        let n;
        if (i< concurrency-1) {
            n = elementsPerChunk;
        } else {
            n = nElements - i*elementsPerChunk;
        }
        if (n==0) continue;

        const task = [];

        const aChunk = a.slice(i*elementsPerChunk*n8, (i*elementsPerChunk + n)*n8 );
        const bChunk = b.slice(i*elementsPerChunk*n8, (i*elementsPerChunk + n)*n8 );
        const cChunk = c.slice(i*elementsPerChunk*n8, (i*elementsPerChunk + n)*n8 );

        task.push({cmd: "ALLOCSET", var: 0, buff: aChunk});
        task.push({cmd: "ALLOCSET", var: 1, buff: bChunk});
        task.push({cmd: "ALLOCSET", var: 2, buff: cChunk});
        task.push({cmd: "ALLOC", var: 3, len: n*n8});
        task.push({cmd: "CALL", fnName: "qap_joinABC", params:[
            {var: 0},
            {var: 1},
            {var: 2},
            {val: n},
            {var: 3},
        ]});
        task.push({cmd: "CALL", fnName: "frm_batchFromMontgomery", params:[
            {var: 3},
            {val: n},
            {var: 3}
        ]});
        task.push({cmd: "GET", out: 0, var: 3, len: n*n8});
        promises.push(curve.tm.queueAction(task));
    }

    const result = await Promise.all(promises);

    const outBuff = new Uint8Array(a.byteLength);
    let p=0;
    for (let i=0; i<result.length; i++) {
        outBuff.set(result[i][0], p);
        p += result[i][0].byteLength;
    }

    return outBuff;
}

var fnvPlus = createCommonjsModule(function (module) {
/**
 * FNV-1a Hash implementation (32, 64, 128, 256, 512, and 1024 bit)
 * @author Travis Webb <me@traviswebb.com>
 * @see http://tools.ietf.org/html/draft-eastlake-fnv-06
 */
var fnvplus = (function(){
	var i, hl = [], hl16 = ['0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f'],
		version = '1a',
		useUTF8 = false,
		_hash32, _hash52, _hash64, _hash128, _hash256, _hash512, _hash1024,
		referenceSeed = 'chongo <Landon Curt Noll> /\\../\\',
		defaultKeyspace = 52,
		fnvConstants = {
			32: {offset: 0},
			64: {offset: [0,0,0,0]},
			128: {offset: [0,0,0,0,0,0,0,0]},
			256: {offset: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},
			512: {offset: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},
			1024: {offset: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}};

	for(i=0; i < 256; i++){
		hl[i] = ((i >> 4) & 15).toString(16) + (i & 15).toString(16);
	}

	function hexToBase(hex, base){
		var alphabet = '0123456789abcdefghijklmnopqrstuvwxyz',
			digits = [0], carry, i, j, string = '';

		for(i = 0; i < hex.length; i+=2){
			carry = parseInt(hex.substr(i,2),16);
			for(j = 0; j < digits.length; j++){
				carry += digits[j] << 8;
				digits[j] = carry % base;
				carry = (carry / base) | 0;
			}
			while (carry > 0) {
				digits.push(carry % base);
				carry = (carry / base) | 0;
			}
		}

		for (i = digits.length - 1; i >= 0; --i){
			string += alphabet[digits[i]];
		}

		return string;
	}

	function hashValHex(value, keyspace) {
		return {
			bits: keyspace,
			value: value,
			dec: function(){return hexToBase(value, 10);},
			hex: function(){return value;},
			str: function(){return hexToBase(value, 36);}
		};
	}

	function hashValInt32(value, keyspace) {
		return {
			bits: keyspace,
			value: value,
			dec: function(){return value.toString();},
			hex: function(){return hl[value>>>24]+ hl[(value>>>16)&255]+hl[(value>>>8)&255]+hl[value&255];},
			str: function(){return value.toString(36);}
		};
	}

	function hashValInt52(value, keyspace) {
		return {
			bits: keyspace,
			value: value,
			dec: function(){return value.toString();},
			hex: function(){return ('0000000000000000'+value.toString(16)).substr(-13);},
			str: function(){return value.toString(36);}
		};
	}

	function hash(message, keyspace) {
		var str = (typeof message === 'object') ? JSON.stringify(message) : message;

		switch(keyspace || defaultKeyspace){
			case 32:
				return _hash32(str);
			case 64:
				return _hash64(str);
			case 128:
				return _hash128(str);
			case 256:
				return _hash256(str);
			case 512:
				return _hash512(str);
			case 1024:
				return _hash1024(str);
			default:
				return _hash52(str);
		}
	}

	function setKeyspace(keyspace) {
		if (keyspace === 52 || fnvConstants[keyspace]) {
			defaultKeyspace = keyspace;
		} else {
			throw new Error('Supported FNV keyspacs: 32, 52, 64, 128, 256, 512, and 1024 bit');
		}
	}

	function setVersion(_version) {
		if (_version === '1a' ) {
			version = _version;
			_hash32   = useUTF8 ? _hash32_1a_utf   : _hash32_1a;
			_hash52   = useUTF8 ? _hash52_1a_utf   : _hash52_1a;
			_hash64   = useUTF8 ? _hash64_1a_utf   : _hash64_1a;
			_hash128  = useUTF8 ? _hash128_1a_utf  : _hash128_1a;
			_hash256  = useUTF8 ? _hash256_1a_utf  : _hash256_1a;
			_hash512  = useUTF8 ? _hash512_1a_utf  : _hash512_1a;
			_hash1024 = useUTF8 ? _hash1024_1a_utf : _hash1024_1a;
		} else if (_version === '1') {
			version = _version;
			_hash32   = useUTF8 ? _hash32_1_utf   : _hash32_1;
			_hash52   = useUTF8 ? _hash52_1_utf   : _hash52_1;
			_hash64   = useUTF8 ? _hash64_1_utf   : _hash64_1;
			_hash128  = useUTF8 ? _hash128_1_utf  : _hash128_1;
			_hash256  = useUTF8 ? _hash256_1_utf  : _hash256_1;
			_hash512  = useUTF8 ? _hash512_1_utf  : _hash512_1;
			_hash1024 = useUTF8 ? _hash1024_1_utf : _hash1024_1;
		} else {
			throw new Error('Supported FNV versions: 1, 1a');
		}
	}

	function setUTF8(utf8) {
		if (utf8) {
			useUTF8 = true;
			_hash32   = version == '1a' ? _hash32_1a_utf   : _hash32_1_utf;
			_hash52   = version == '1a' ? _hash52_1a_utf   : _hash52_1_utf;
			_hash64   = version == '1a' ? _hash64_1a_utf   : _hash64_1_utf;
			_hash128  = version == '1a' ? _hash128_1a_utf  : _hash128_1_utf;
			_hash256  = version == '1a' ? _hash256_1a_utf  : _hash256_1_utf;
			_hash512  = version == '1a' ? _hash512_1a_utf  : _hash512_1_utf;
			_hash1024 = version == '1a' ? _hash1024_1a_utf : _hash1024_1_utf;
		} else {
			useUTF8 = false;
			_hash32   = version == '1a' ? _hash32_1a   : _hash32_1;
			_hash52   = version == '1a' ? _hash52_1a   : _hash52_1;
			_hash64   = version == '1a' ? _hash64_1a   : _hash64_1;
			_hash128  = version == '1a' ? _hash128_1a  : _hash128_1;
			_hash256  = version == '1a' ? _hash256_1a  : _hash256_1;
			_hash512  = version == '1a' ? _hash512_1a  : _hash512_1;
			_hash1024 = version == '1a' ? _hash1024_1a : _hash1024_1;
		}
	}

	function seed(seed) {
		var oldVersion = version, res, i;

		seed = (seed || seed === 0) ? seed : referenceSeed;

		if (seed === referenceSeed) setVersion('1');

		for (var keysize in fnvConstants) {
			fnvConstants[keysize].offset = [];
			for(i = 0; i < keysize / 16; i++){
				fnvConstants[keysize].offset[i]	= 0;
			}
			res = hash(seed, parseInt(keysize, 10)).hex();
			for(i = 0; i < keysize / 16; i++){
				fnvConstants[keysize].offset[i]	= parseInt(res.substr(i*4,4), 16);
			}
		}

		setVersion(oldVersion);
	}

	/**
	 * Implementation without library overhead.
	 */

	function _hash32_1a_fast(str) {
		var i, l = str.length-3, t0=0,v0=0x9dc5,t1=0,v1=0x811c;

		for (i = 0; i < l;) {
			v0^=str.charCodeAt(i++);
			t0=v0*403;t1=v1*403;
			t1+=v0<<8;
			v1=(t1+(t0>>>16))&65535;v0=t0&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*403;t1=v1*403;
			t1+=v0<<8;
			v1=(t1+(t0>>>16))&65535;v0=t0&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*403;t1=v1*403;
			t1+=v0<<8;
			v1=(t1+(t0>>>16))&65535;v0=t0&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*403;t1=v1*403;
			t1+=v0<<8;
			v1=(t1+(t0>>>16))&65535;v0=t0&65535;
		}

		while(i<l+3){
			v0^=str.charCodeAt(i++);
			t0=v0*403;t1=v1*403;
			t1+=v0<<8;
			v1=(t1+(t0>>>16))&65535;v0=t0&65535;
		}


		return ((v1<<16)>>>0)+v0;
	}

	function _hash32_1a_fast_hex(str) {
		var i, l = str.length-3, t0=0,v0=0x9dc5,t1=0,v1=0x811c;

		for (i = 0; i < l;) {
			v0^=str.charCodeAt(i++);
			t0=v0*403;t1=v1*403;
			t1+=v0<<8;
			v1=(t1+(t0>>>16))&65535;v0=t0&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*403;t1=v1*403;
			t1+=v0<<8;
			v1=(t1+(t0>>>16))&65535;v0=t0&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*403;t1=v1*403;
			t1+=v0<<8;
			v1=(t1+(t0>>>16))&65535;v0=t0&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*403;t1=v1*403;
			t1+=v0<<8;
			v1=(t1+(t0>>>16))&65535;v0=t0&65535;
		}

		while(i<l+3){
			v0^=str.charCodeAt(i++);
			t0=v0*403;t1=v1*403;
			t1+=v0<<8;
			v1=(t1+(t0>>>16))&65535;v0=t0&65535;
		}


		return hl[(v1>>>8)&255]+hl[v1&255]+hl[(v0>>>8)&255]+hl[v0&255];
	}

	function _hash52_1a_fast(str){
		var i,l=str.length-3,t0=0,v0=0x2325,t1=0,v1=0x8422,t2=0,v2=0x9ce4,t3=0,v3=0xcbf2;

		for (i = 0; i < l;) {
			v0^=str.charCodeAt(i++);
			t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
			t2+=v0<<8;t3+=v1<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
			t2+=v0<<8;t3+=v1<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
			t2+=v0<<8;t3+=v1<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
			t2+=v0<<8;t3+=v1<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
		}

		while(i<l+3){
			v0^=str.charCodeAt(i++);
			t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
			t2+=v0<<8;t3+=v1<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
		}

		return (v3&15) * 281474976710656 + v2 * 4294967296 + v1 * 65536 + (v0^(v3>>4));
	}

	function _hash52_1a_fast_hex(str){
		var i,l=str.length-3,t0=0,v0=0x2325,t1=0,v1=0x8422,t2=0,v2=0x9ce4,t3=0,v3=0xcbf2;

		for (i = 0; i < l;) {
			v0^=str.charCodeAt(i++);
			t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
			t2+=v0<<8;t3+=v1<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
			t2+=v0<<8;t3+=v1<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
			t2+=v0<<8;t3+=v1<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
			t2+=v0<<8;t3+=v1<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
		}

		while(i<l+3){
			v0^=str.charCodeAt(i++);
			t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
			t2+=v0<<8;t3+=v1<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
		}

		return hl16[v3&15]+hl[v2>>8]+hl[v2&255]+hl[v1>>8]+hl[v1&255]+hl[(v0>>8)^(v3>>12)]+hl[(v0^(v3>>4))&255];
	}

	function _hash64_1a_fast(str){
		var i,l=str.length-3,t0=0,v0=0x2325,t1=0,v1=0x8422,t2=0,v2=0x9ce4,t3=0,v3=0xcbf2;

		for (i = 0; i < l;) {
			v0^=str.charCodeAt(i++);
			t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
			t2+=v0<<8;t3+=v1<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
			t2+=v0<<8;t3+=v1<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
			t2+=v0<<8;t3+=v1<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
			t2+=v0<<8;t3+=v1<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
		}

		while(i<l+3){
			v0^=str.charCodeAt(i++);
			t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
			t2+=v0<<8;t3+=v1<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
		}

		return hl[v3>>8]+hl[v3&255]+hl[v2>>8]+hl[v2&255]+hl[v1>>8]+hl[v1&255]+hl[v0>>8]+hl[v0&255];
	}

	function _hash32_1a_fast_utf(str) {
		var c,i,l=str.length,t0=0,v0=0x9dc5,t1=0,v1=0x811c;

		for (i = 0; i < l; i++) {
			c = str.charCodeAt(i);
			if(c < 128){
				v0^=c;
			}else if(c < 2048){
				v0^=(c>>6)|192;
				t0=v0*403;t1=v1*403;
				t1+=v0<<8;
				v1=(t1+(t0>>>16))&65535;v0=t0&65535;
				v0^=(c&63)|128;
			}else if(((c&64512)==55296)&&(i+1)<l&&((str.charCodeAt(i+1)&64512)==56320)){
				c=65536+((c&1023)<<10)+(str.charCodeAt(++i)&1023);
				v0^=(c>>18)|240;
				t0=v0*403;t1=v1*403;
				t1+=v0<<8;
				v1=(t1+(t0>>>16))&65535;v0=t0&65535;
				v0^=((c>>12)&63)|128;
				t0=v0*403;t1=v1*403;
				t1+=v0<<8;
				v1=(t1+(t0>>>16))&65535;v0=t0&65535;
				v0^=((c>>6)&63)|128;
				t0=v0*403;t1=v1*403;
				t1+=v0<<8;
				v1=(t1+(t0>>>16))&65535;v0=t0&65535;
				v0^=(c&63)|128;
			}else {
				v0^=(c>>12)|224;
				t0=v0*403;t1=v1*403;
				t1+=v0<<8;
				v1=(t1+(t0>>>16))&65535;v0=t0&65535;
				v0^=((c>>6)&63)|128;
				t0=v0*403;t1=v1*403;
				t1+=v0<<8;
				v1=(t1+(t0>>>16))&65535;v0=t0&65535;
				v0^=(c&63)|128;
			}
			t0=v0*403;t1=v1*403;
			t1+=v0<<8;
			v1=(t1+(t0>>>16))&65535;v0=t0&65535;
		}

		return ((v1<<16)>>>0)+v0;
	}

	function _hash32_1a_fast_hex_utf(str) {
		var c,i,l=str.length,t0=0,v0=0x9dc5,t1=0,v1=0x811c;

		for (i = 0; i < l; i++) {
			c = str.charCodeAt(i);
			if(c < 128){
				v0^=c;
			}else if(c < 2048){
				v0^=(c>>6)|192;
				t0=v0*403;t1=v1*403;
				t1+=v0<<8;
				v1=(t1+(t0>>>16))&65535;v0=t0&65535;
				v0^=(c&63)|128;
			}else if(((c&64512)==55296)&&(i+1)<l&&((str.charCodeAt(i+1)&64512)==56320)){
				c=65536+((c&1023)<<10)+(str.charCodeAt(++i)&1023);
				v0^=(c>>18)|240;
				t0=v0*403;t1=v1*403;
				t1+=v0<<8;
				v1=(t1+(t0>>>16))&65535;v0=t0&65535;
				v0^=((c>>12)&63)|128;
				t0=v0*403;t1=v1*403;
				t1+=v0<<8;
				v1=(t1+(t0>>>16))&65535;v0=t0&65535;
				v0^=((c>>6)&63)|128;
				t0=v0*403;t1=v1*403;
				t1+=v0<<8;
				v1=(t1+(t0>>>16))&65535;v0=t0&65535;
				v0^=(c&63)|128;
			}else {
				v0^=(c>>12)|224;
				t0=v0*403;t1=v1*403;
				t1+=v0<<8;
				v1=(t1+(t0>>>16))&65535;v0=t0&65535;
				v0^=((c>>6)&63)|128;
				t0=v0*403;t1=v1*403;
				t1+=v0<<8;
				v1=(t1+(t0>>>16))&65535;v0=t0&65535;
				v0^=(c&63)|128;
			}
			t0=v0*403;t1=v1*403;
			t1+=v0<<8;
			v1=(t1+(t0>>>16))&65535;v0=t0&65535;
		}


		return hl[(v1>>>8)&255]+hl[v1&255]+hl[(v0>>>8)&255]+hl[v0&255];
	}

	function _hash52_1a_fast_utf(str){
		var c,i,l=str.length,t0=0,v0=0x2325,t1=0,v1=0x8422,t2=0,v2=0x9ce4,t3=0,v3=0xcbf2;

		for (i = 0; i < l; i++) {
			c = str.charCodeAt(i);
			if(c < 128){
				v0^=c;
			}else if(c < 2048){
				v0^=(c>>6)|192;
				t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
				t2+=v0<<8;t3+=v1<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
				v0^=(c&63)|128;
			}else if(((c&64512)==55296)&&(i+1)<l&&((str.charCodeAt(i+1)&64512)==56320)){
				c=65536+((c&1023)<<10)+(str.charCodeAt(++i)&1023);
				v0^=(c>>18)|240;
				t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
				t2+=v0<<8;t3+=v1<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
				v0^=((c>>12)&63)|128;
				t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
				t2+=v0<<8;t3+=v1<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
				v0^=((c>>6)&63)|128;
				t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
				t2+=v0<<8;t3+=v1<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
				v0^=(c&63)|128;
			}else {
				v0^=(c>>12)|224;
				t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
				t2+=v0<<8;t3+=v1<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
				v0^=((c>>6)&63)|128;
				t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
				t2+=v0<<8;t3+=v1<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
				v0^=(c&63)|128;
			}
			t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
			t2+=v0<<8;t3+=v1<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
		}

		return (v3&15) * 281474976710656 + v2 * 4294967296 + v1 * 65536 + (v0^(v3>>4));
	}

	function _hash52_1a_fast_hex_utf (str){
		var c,i,l=str.length,t0=0,v0=0x2325,t1=0,v1=0x8422,t2=0,v2=0x9ce4,t3=0,v3=0xcbf2;

		for (i = 0; i < l; i++) {
			c = str.charCodeAt(i);
			if(c < 128){
				v0^=c;
			}else if(c < 2048){
				v0^=(c>>6)|192;
				t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
				t2+=v0<<8;t3+=v1<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
				v0^=(c&63)|128;
			}else if(((c&64512)==55296)&&(i+1)<l&&((str.charCodeAt(i+1)&64512)==56320)){
				c=65536+((c&1023)<<10)+(str.charCodeAt(++i)&1023);
				v0^=(c>>18)|240;
				t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
				t2+=v0<<8;t3+=v1<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
				v0^=((c>>12)&63)|128;
				t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
				t2+=v0<<8;t3+=v1<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
				v0^=((c>>6)&63)|128;
				t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
				t2+=v0<<8;t3+=v1<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
				v0^=(c&63)|128;
			}else {
				v0^=(c>>12)|224;
				t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
				t2+=v0<<8;t3+=v1<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
				v0^=((c>>6)&63)|128;
				t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
				t2+=v0<<8;t3+=v1<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
				v0^=(c&63)|128;
			}
			t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
			t2+=v0<<8;t3+=v1<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
		}

		return hl16[v3&15]+hl[v2>>8]+hl[v2&255]+hl[v1>>8]+hl[v1&255]+hl[(v0>>8)^(v3>>12)]+hl[(v0^(v3>>4))&255];
	}

	function _hash64_1a_fast_utf(str){
		var c,i,l=str.length,t0=0,v0=0x2325,t1=0,v1=0x8422,t2=0,v2=0x9ce4,t3=0,v3=0xcbf2;

		for (i = 0; i < l; i++) {
			c = str.charCodeAt(i);
			if(c < 128){
				v0^=c;
			}else if(c < 2048){
				v0^=(c>>6)|192;
				t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
				t2+=v0<<8;t3+=v1<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
				v0^=(c&63)|128;
			}else if(((c&64512)==55296)&&(i+1)<l&&((str.charCodeAt(i+1)&64512)==56320)){
				c=65536+((c&1023)<<10)+(str.charCodeAt(++i)&1023);
				v0^=(c>>18)|240;
				t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
				t2+=v0<<8;t3+=v1<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
				v0^=((c>>12)&63)|128;
				t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
				t2+=v0<<8;t3+=v1<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
				v0^=((c>>6)&63)|128;
				t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
				t2+=v0<<8;t3+=v1<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
				v0^=(c&63)|128;
			}else {
				v0^=(c>>12)|224;
				t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
				t2+=v0<<8;t3+=v1<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
				v0^=((c>>6)&63)|128;
				t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
				t2+=v0<<8;t3+=v1<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
				v0^=(c&63)|128;
			}
			t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
			t2+=v0<<8;t3+=v1<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
		}

		return hl[v3>>8]+hl[v3&255]+hl[v2>>8]+hl[v2&255]+hl[v1>>8]+hl[v1&255]+hl[v0>>8]+hl[v0&255];
	}
	/**
	 * Regular functions. This versions are accessible through API
	 */

	function _hash32_1a(str){
		var i,l=str.length-3,s=fnvConstants[32].offset,t0=0,v0=s[1]|0,t1=0,v1=s[0]|0;

		for (i = 0; i < l;) {
			v0^=str.charCodeAt(i++);
			t0=v0*403;t1=v1*403;
			t1+=v0<<8;
			v1=(t1+(t0>>>16))&65535;v0=t0&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*403;t1=v1*403;
			t1+=v0<<8;
			v1=(t1+(t0>>>16))&65535;v0=t0&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*403;t1=v1*403;
			t1+=v0<<8;
			v1=(t1+(t0>>>16))&65535;v0=t0&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*403;t1=v1*403;
			t1+=v0<<8;
			v1=(t1+(t0>>>16))&65535;v0=t0&65535;
		}

		while(i<l+3){
			v0^=str.charCodeAt(i++);
			t0=v0*403;t1=v1*403;
			t1+=v0<<8;
			v1=(t1+(t0>>>16))&65535;v0=t0&65535;
		}

		return hashValInt32(((v1<<16)>>>0)+v0,32);
	}

	function _hash32_1(str){
		var i,l=str.length-3,s=fnvConstants[32].offset,t0=0,v0=s[1]|0,t1=0,v1=s[0]|0;

		for (i = 0; i < l;) {
			t0=v0*403;t1=v1*403;
			t1+=v0<<8;
			v1=(t1+(t0>>>16))&65535;v0=t0&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*403;t1=v1*403;
			t1+=v0<<8;
			v1=(t1+(t0>>>16))&65535;v0=t0&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*403;t1=v1*403;
			t1+=v0<<8;
			v1=(t1+(t0>>>16))&65535;v0=t0&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*403;t1=v1*403;
			t1+=v0<<8;
			v1=(t1+(t0>>>16))&65535;v0=t0&65535;
			v0^=str.charCodeAt(i++);
		}

		while(i<l+3){
			t0=v0*403;t1=v1*403;
			t1+=v0<<8;
			v1=(t1+(t0>>>16))&65535;v0=t0&65535;
			v0^=str.charCodeAt(i++);
		}

		return hashValInt32(((v1<<16)>>>0)+v0,32);
	}

	function _hash32_1a_utf(str){
		var c,i,l=str.length,s=fnvConstants[32].offset,t0=0,v0=s[1]|0,t1=0,v1=s[0]|0;

		for (i = 0; i < l; i++) {
			c = str.charCodeAt(i);
			if(c < 128){
				v0^=c;
			}else if(c < 2048){
				v0^=(c>>6)|192;
				t0=v0*403;t1=v1*403;
				t1+=v0<<8;
				v1=(t1+(t0>>>16))&65535;v0=t0&65535;
				v0^=(c&63)|128;
			}else if(((c&64512)==55296)&&(i+1)<l&&((str.charCodeAt(i+1)&64512)==56320)){
				c=65536+((c&1023)<<10)+(str.charCodeAt(++i)&1023);
				v0^=(c>>18)|240;
				t0=v0*403;t1=v1*403;
				t1+=v0<<8;
				v1=(t1+(t0>>>16))&65535;v0=t0&65535;
				v0^=((c>>12)&63)|128;
				t0=v0*403;t1=v1*403;
				t1+=v0<<8;
				v1=(t1+(t0>>>16))&65535;v0=t0&65535;
				v0^=((c>>6)&63)|128;
				t0=v0*403;t1=v1*403;
				t1+=v0<<8;
				v1=(t1+(t0>>>16))&65535;v0=t0&65535;
				v0^=(c&63)|128;
			}else {
				v0^=(c>>12)|224;
				t0=v0*403;t1=v1*403;
				t1+=v0<<8;
				v1=(t1+(t0>>>16))&65535;v0=t0&65535;
				v0^=((c>>6)&63)|128;
				t0=v0*403;t1=v1*403;
				t1+=v0<<8;
				v1=(t1+(t0>>>16))&65535;v0=t0&65535;
				v0^=(c&63)|128;
			}
			t0=v0*403;t1=v1*403;
			t1+=v0<<8;
			v1=(t1+(t0>>>16))&65535;v0=t0&65535;
		}

		return hashValInt32(((v1<<16)>>>0)+v0,32);
	}

	function _hash32_1_utf(str){
		var c,i,l=str.length,s=fnvConstants[32].offset,t0=0,v0=s[1]|0,t1=0,v1=s[0]|0;

		for (i = 0; i < l; i++) {
			c = str.charCodeAt(i);
			t0=v0*403;t1=v1*403;
			t1+=v0<<8;
			v1=(t1+(t0>>>16))&65535;v0=t0&65535;
			if(c < 128){
				v0^=c;
			}else if(c < 2048){
				v0^=(c>>6)|192;
				t0=v0*403;t1=v1*403;
				t1+=v0<<8;
				v1=(t1+(t0>>>16))&65535;v0=t0&65535;
				v0^=(c&63)|128;
			}else if(((c&64512)==55296)&&(i+1)<l&&((str.charCodeAt(i+1)&64512)==56320)){
				c=65536+((c&1023)<<10)+(str.charCodeAt(++i)&1023);
				v0^=(c>>18)|240;
				t0=v0*403;t1=v1*403;
				t1+=v0<<8;
				v1=(t1+(t0>>>16))&65535;v0=t0&65535;
				v0^=((c>>12)&63)|128;
				t0=v0*403;t1=v1*403;
				t1+=v0<<8;
				v1=(t1+(t0>>>16))&65535;v0=t0&65535;
				v0^=((c>>6)&63)|128;
				t0=v0*403;t1=v1*403;
				t1+=v0<<8;
				v1=(t1+(t0>>>16))&65535;v0=t0&65535;
				v0^=(c&63)|128;
			}else {
				v0^=(c>>12)|224;
				t0=v0*403;t1=v1*403;
				t1+=v0<<8;
				v1=(t1+(t0>>>16))&65535;v0=t0&65535;
				v0^=((c>>6)&63)|128;
				t0=v0*403;t1=v1*403;
				t1+=v0<<8;
				v1=(t1+(t0>>>16))&65535;v0=t0&65535;
				v0^=(c&63)|128;
			}
		}

		return hashValInt32(((v1<<16)>>>0)+v0,32);
	}

	_hash32 = _hash32_1a;

	function _hash52_1a(str){
		var i,l=str.length-3,s=fnvConstants[64].offset,t0=0,v0=s[3]|0,t1=0,v1=s[2]|0,t2=0,v2=s[1]|0,t3=0,v3=s[0]|0;

		for (i = 0; i < l;) {
			v0^=str.charCodeAt(i++);
			t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
			t2+=v0<<8;t3+=v1<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
			t2+=v0<<8;t3+=v1<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
			t2+=v0<<8;t3+=v1<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
			t2+=v0<<8;t3+=v1<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
		}

		while(i<l+3){
			v0^=str.charCodeAt(i++);
			t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
			t2+=v0<<8;t3+=v1<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
		}

		return hashValInt52((v3&15)*281474976710656+v2*4294967296+v1*65536+(v0^(v3>>4)),52);
	}

	function _hash52_1(str){
		var i,l=str.length-3,s=fnvConstants[64].offset,t0=0,v0=s[3]|0,t1=0,v1=s[2]|0,t2=0,v2=s[1]|0,t3=0,v3=s[0]|0;

		for (i = 0; i < l;) {
			t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
			t2+=v0<<8;t3+=v1<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
			t2+=v0<<8;t3+=v1<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
			t2+=v0<<8;t3+=v1<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
			t2+=v0<<8;t3+=v1<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
			v0^=str.charCodeAt(i++);
		}

		while(i<l+3){
			t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
			t2+=v0<<8;t3+=v1<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
			v0^=str.charCodeAt(i++);
		}

		return hashValInt52((v3&15)*281474976710656+v2*4294967296+v1*65536+(v0^(v3>>4)),52);
	}

	function _hash52_1a_utf(str){
		var c,i,l=str.length,s=fnvConstants[64].offset,t0=0,v0=s[3]|0,t1=0,v1=s[2]|0,t2=0,v2=s[1]|0,t3=0,v3=s[0]|0;

		for (i = 0; i < l; i++) {
			c = str.charCodeAt(i);
			if(c < 128){
				v0^=c;
			}else if(c < 2048){
				v0^=(c>>6)|192;
				t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
				t2+=v0<<8;t3+=v1<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
				v0^=(c&63)|128;
			}else if(((c&64512)==55296)&&(i+1)<l&&((str.charCodeAt(i+1)&64512)==56320)){
				c=65536+((c&1023)<<10)+(str.charCodeAt(++i)&1023);
				v0^=(c>>18)|240;
				t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
				t2+=v0<<8;t3+=v1<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
				v0^=((c>>12)&63)|128;
				t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
				t2+=v0<<8;t3+=v1<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
				v0^=((c>>6)&63)|128;
				t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
				t2+=v0<<8;t3+=v1<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
				v0^=(c&63)|128;
			}else {
				v0^=(c>>12)|224;
				t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
				t2+=v0<<8;t3+=v1<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
				v0^=((c>>6)&63)|128;
				t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
				t2+=v0<<8;t3+=v1<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
				v0^=(c&63)|128;
			}
			t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
			t2+=v0<<8;t3+=v1<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
		}

		return hashValInt52((v3&15)*281474976710656+v2*4294967296+v1*65536+(v0^(v3>>4)),52);
	}

	function _hash52_1_utf(str){
		var c,i,l=str.length,s=fnvConstants[64].offset,t0=0,v0=s[3]|0,t1=0,v1=s[2]|0,t2=0,v2=s[1]|0,t3=0,v3=s[0]|0;

		for (i = 0; i < l; i++) {
			c = str.charCodeAt(i);
			t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
			t2+=v0<<8;t3+=v1<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
			if(c < 128){
				v0^=c;
			}else if(c < 2048){
				v0^=(c>>6)|192;
				t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
				t2+=v0<<8;t3+=v1<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
				v0^=(c&63)|128;
			}else if(((c&64512)==55296)&&(i+1)<l&&((str.charCodeAt(i+1)&64512)==56320)){
				c=65536+((c&1023)<<10)+(str.charCodeAt(++i)&1023);
				v0^=(c>>18)|240;
				t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
				t2+=v0<<8;t3+=v1<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
				v0^=((c>>12)&63)|128;
				t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
				t2+=v0<<8;t3+=v1<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
				v0^=((c>>6)&63)|128;
				t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
				t2+=v0<<8;t3+=v1<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
				v0^=(c&63)|128;
			}else {
				v0^=(c>>12)|224;
				t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
				t2+=v0<<8;t3+=v1<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
				v0^=((c>>6)&63)|128;
				t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
				t2+=v0<<8;t3+=v1<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
				v0^=(c&63)|128;
			}
		}

		return hashValInt52((v3&15)*281474976710656+v2*4294967296+v1*65536+(v0^(v3>>4)),52);
	}

	_hash52 = _hash52_1a;

	function _hash64_1a(str){
		var i,l=str.length-3,s=fnvConstants[64].offset,t0=0,v0=s[3]|0,t1=0,v1=s[2]|0,t2=0,v2=s[1]|0,t3=0,v3=s[0]|0;

		for (i = 0; i < l;) {
			v0^=str.charCodeAt(i++);
			t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
			t2+=v0<<8;t3+=v1<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
			t2+=v0<<8;t3+=v1<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
			t2+=v0<<8;t3+=v1<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
			t2+=v0<<8;t3+=v1<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
		}

		while(i<l+3){
			v0^=str.charCodeAt(i++);
			t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
			t2+=v0<<8;t3+=v1<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
		}

		return hashValHex(hl[v3>>8]+hl[v3&255]+hl[v2>>8]+hl[v2&255]+hl[v1>>8]+hl[v1&255]+hl[v0>>8]+hl[v0&255],64);
	}

	function _hash64_1(str){
		var i,l=str.length-3,s=fnvConstants[64].offset,t0=0,v0=s[3]|0,t1=0,v1=s[2]|0,t2=0,v2=s[1]|0,t3=0,v3=s[0]|0;

		for (i = 0; i < l;) {
			t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
			t2+=v0<<8;t3+=v1<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
			t2+=v0<<8;t3+=v1<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
			t2+=v0<<8;t3+=v1<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
			t2+=v0<<8;t3+=v1<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
			v0^=str.charCodeAt(i++);
		}

		while(i<l+3){
			t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
			t2+=v0<<8;t3+=v1<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
			v0^=str.charCodeAt(i++);
		}

		return hashValHex(hl[v3>>8]+hl[v3&255]+hl[v2>>8]+hl[v2&255]+hl[v1>>8]+hl[v1&255]+hl[v0>>8]+hl[v0&255],64);
	}

	function _hash64_1a_utf(str){
		var c,i,l=str.length,s=fnvConstants[64].offset,t0=0,v0=s[3]|0,t1=0,v1=s[2]|0,t2=0,v2=s[1]|0,t3=0,v3=s[0]|0;

		for (i = 0; i < l; i++) {
			c = str.charCodeAt(i);
			if(c < 128){
				v0^=c;
			}else if(c < 2048){
				v0^=(c>>6)|192;
				t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
				t2+=v0<<8;t3+=v1<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
				v0^=(c&63)|128;
			}else if(((c&64512)==55296)&&(i+1)<l&&((str.charCodeAt(i+1)&64512)==56320)){
				c=65536+((c&1023)<<10)+(str.charCodeAt(++i)&1023);
				v0^=(c>>18)|240;
				t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
				t2+=v0<<8;t3+=v1<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
				v0^=((c>>12)&63)|128;
				t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
				t2+=v0<<8;t3+=v1<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
				v0^=((c>>6)&63)|128;
				t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
				t2+=v0<<8;t3+=v1<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
				v0^=(c&63)|128;
			}else {
				v0^=(c>>12)|224;
				t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
				t2+=v0<<8;t3+=v1<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
				v0^=((c>>6)&63)|128;
				t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
				t2+=v0<<8;t3+=v1<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
				v0^=(c&63)|128;
			}
			t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
			t2+=v0<<8;t3+=v1<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
		}

		return hashValHex(hl[v3>>8]+hl[v3&255]+hl[v2>>8]+hl[v2&255]+hl[v1>>8]+hl[v1&255]+hl[v0>>8]+hl[v0&255],64);
	}

	function _hash64_1_utf(str){
		var c,i,l=str.length,s=fnvConstants[64].offset,t0=0,v0=s[3]|0,t1=0,v1=s[2]|0,t2=0,v2=s[1]|0,t3=0,v3=s[0]|0;

		for (i = 0; i < l; i++) {
			c = str.charCodeAt(i);
			t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
			t2+=v0<<8;t3+=v1<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
			if(c < 128){
				v0^=c;
			}else if(c < 2048){
				v0^=(c>>6)|192;
				t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
				t2+=v0<<8;t3+=v1<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
				v0^=(c&63)|128;
			}else if(((c&64512)==55296)&&(i+1)<l&&((str.charCodeAt(i+1)&64512)==56320)){
				c=65536+((c&1023)<<10)+(str.charCodeAt(++i)&1023);
				v0^=(c>>18)|240;
				t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
				t2+=v0<<8;t3+=v1<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
				v0^=((c>>12)&63)|128;
				t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
				t2+=v0<<8;t3+=v1<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
				v0^=((c>>6)&63)|128;
				t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
				t2+=v0<<8;t3+=v1<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
				v0^=(c&63)|128;
			}else {
				v0^=(c>>12)|224;
				t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
				t2+=v0<<8;t3+=v1<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
				v0^=((c>>6)&63)|128;
				t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
				t2+=v0<<8;t3+=v1<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
				v0^=(c&63)|128;
			}
		}

		return hashValHex(hl[v3>>8]+hl[v3&255]+hl[v2>>8]+hl[v2&255]+hl[v1>>8]+hl[v1&255]+hl[v0>>8]+hl[v0&255],64);
	}

	_hash64 = _hash64_1a;

	function _hash128_1a(str){
		var i,l=str.length-3,s=fnvConstants[128].offset,t0=0,v0=s[7]|0,t1=0,v1=s[6]|0,t2=0,v2=s[5]|0,t3=0,v3=s[4]|0,t4=0,v4=s[3]|0,t5=0,v5=s[2]|0,t6=0,v6=s[1]|0,t7=0,v7=s[0]|0;

		for (i = 0; i < l;) {
			v0^=str.charCodeAt(i++);
			t0=v0*315;t1=v1*315;t2=v2*315;t3=v3*315;t4=v4*315;t5=v5*315;t6=v6*315;t7=v7*315;
			t5+=v0<<8;t6+=v1<<8;t7+=v2<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;v7=(t7+(t6>>>16))&65535;v6=t6&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*315;t1=v1*315;t2=v2*315;t3=v3*315;t4=v4*315;t5=v5*315;t6=v6*315;t7=v7*315;
			t5+=v0<<8;t6+=v1<<8;t7+=v2<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;v7=(t7+(t6>>>16))&65535;v6=t6&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*315;t1=v1*315;t2=v2*315;t3=v3*315;t4=v4*315;t5=v5*315;t6=v6*315;t7=v7*315;
			t5+=v0<<8;t6+=v1<<8;t7+=v2<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;v7=(t7+(t6>>>16))&65535;v6=t6&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*315;t1=v1*315;t2=v2*315;t3=v3*315;t4=v4*315;t5=v5*315;t6=v6*315;t7=v7*315;
			t5+=v0<<8;t6+=v1<<8;t7+=v2<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;v7=(t7+(t6>>>16))&65535;v6=t6&65535;
		}

		while(i<l+3){
			v0^=str.charCodeAt(i++);
			t0=v0*315;t1=v1*315;t2=v2*315;t3=v3*315;t4=v4*315;t5=v5*315;t6=v6*315;t7=v7*315;
			t5+=v0<<8;t6+=v1<<8;t7+=v2<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;v7=(t7+(t6>>>16))&65535;v6=t6&65535;
		}

		return hashValHex(hl[v7>>8]+hl[v7&255]+hl[v6>>8]+hl[v6&255]+hl[v5>>8]+hl[v5&255]+hl[v4>>8]+hl[v4&255]+hl[v3>>8]+hl[v3&255]+hl[v2>>8]+hl[v2&255]+hl[v1>>8]+hl[v1&255]+hl[v0>>8]+hl[v0&255],128);
	}

	function _hash128_1(str){
		var i,l=str.length-3,s=fnvConstants[128].offset,t0=0,v0=s[7]|0,t1=0,v1=s[6]|0,t2=0,v2=s[5]|0,t3=0,v3=s[4]|0,t4=0,v4=s[3]|0,t5=0,v5=s[2]|0,t6=0,v6=s[1]|0,t7=0,v7=s[0]|0;

		for (i = 0; i < l;) {
			t0=v0*315;t1=v1*315;t2=v2*315;t3=v3*315;t4=v4*315;t5=v5*315;t6=v6*315;t7=v7*315;
			t5+=v0<<8;t6+=v1<<8;t7+=v2<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;v7=(t7+(t6>>>16))&65535;v6=t6&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*315;t1=v1*315;t2=v2*315;t3=v3*315;t4=v4*315;t5=v5*315;t6=v6*315;t7=v7*315;
			t5+=v0<<8;t6+=v1<<8;t7+=v2<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;v7=(t7+(t6>>>16))&65535;v6=t6&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*315;t1=v1*315;t2=v2*315;t3=v3*315;t4=v4*315;t5=v5*315;t6=v6*315;t7=v7*315;
			t5+=v0<<8;t6+=v1<<8;t7+=v2<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;v7=(t7+(t6>>>16))&65535;v6=t6&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*315;t1=v1*315;t2=v2*315;t3=v3*315;t4=v4*315;t5=v5*315;t6=v6*315;t7=v7*315;
			t5+=v0<<8;t6+=v1<<8;t7+=v2<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;v7=(t7+(t6>>>16))&65535;v6=t6&65535;
			v0^=str.charCodeAt(i++);
		}

		while(i<l+3){
			t0=v0*315;t1=v1*315;t2=v2*315;t3=v3*315;t4=v4*315;t5=v5*315;t6=v6*315;t7=v7*315;
			t5+=v0<<8;t6+=v1<<8;t7+=v2<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;v7=(t7+(t6>>>16))&65535;v6=t6&65535;
			v0^=str.charCodeAt(i++);
		}

		return hashValHex(hl[v7>>8]+hl[v7&255]+hl[v6>>8]+hl[v6&255]+hl[v5>>8]+hl[v5&255]+hl[v4>>8]+hl[v4&255]+hl[v3>>8]+hl[v3&255]+hl[v2>>8]+hl[v2&255]+hl[v1>>8]+hl[v1&255]+hl[v0>>8]+hl[v0&255],128);
	}

	function _hash128_1a_utf(str){
		var c,i,l=str.length,s=fnvConstants[128].offset,t0=0,v0=s[7]|0,t1=0,v1=s[6]|0,t2=0,v2=s[5]|0,t3=0,v3=s[4]|0,t4=0,v4=s[3]|0,t5=0,v5=s[2]|0,t6=0,v6=s[1]|0,t7=0,v7=s[0]|0;

		for (i = 0; i < l; i++) {
			c = str.charCodeAt(i);
			if(c < 128){
				v0^=c;
			}else if(c < 2048){
				v0^=(c>>6)|192;
				t0=v0*315;t1=v1*315;t2=v2*315;t3=v3*315;t4=v4*315;t5=v5*315;t6=v6*315;t7=v7*315;
				t5+=v0<<8;t6+=v1<<8;t7+=v2<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;v7=(t7+(t6>>>16))&65535;v6=t6&65535;
				v0^=(c&63)|128;
			}else if(((c&64512)==55296)&&(i+1)<l&&((str.charCodeAt(i+1)&64512)==56320)){
				c=65536+((c&1023)<<10)+(str.charCodeAt(++i)&1023);
				v0^=(c>>18)|240;
				t0=v0*315;t1=v1*315;t2=v2*315;t3=v3*315;t4=v4*315;t5=v5*315;t6=v6*315;t7=v7*315;
				t5+=v0<<8;t6+=v1<<8;t7+=v2<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;v7=(t7+(t6>>>16))&65535;v6=t6&65535;
				v0^=((c>>12)&63)|128;
				t0=v0*315;t1=v1*315;t2=v2*315;t3=v3*315;t4=v4*315;t5=v5*315;t6=v6*315;t7=v7*315;
				t5+=v0<<8;t6+=v1<<8;t7+=v2<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;v7=(t7+(t6>>>16))&65535;v6=t6&65535;
				v0^=((c>>6)&63)|128;
				t0=v0*315;t1=v1*315;t2=v2*315;t3=v3*315;t4=v4*315;t5=v5*315;t6=v6*315;t7=v7*315;
				t5+=v0<<8;t6+=v1<<8;t7+=v2<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;v7=(t7+(t6>>>16))&65535;v6=t6&65535;
				v0^=(c&63)|128;
			}else {
				v0^=(c>>12)|224;
				t0=v0*315;t1=v1*315;t2=v2*315;t3=v3*315;t4=v4*315;t5=v5*315;t6=v6*315;t7=v7*315;
				t5+=v0<<8;t6+=v1<<8;t7+=v2<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;v7=(t7+(t6>>>16))&65535;v6=t6&65535;
				v0^=((c>>6)&63)|128;
				t0=v0*315;t1=v1*315;t2=v2*315;t3=v3*315;t4=v4*315;t5=v5*315;t6=v6*315;t7=v7*315;
				t5+=v0<<8;t6+=v1<<8;t7+=v2<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;v7=(t7+(t6>>>16))&65535;v6=t6&65535;
				v0^=(c&63)|128;
			}
			t0=v0*315;t1=v1*315;t2=v2*315;t3=v3*315;t4=v4*315;t5=v5*315;t6=v6*315;t7=v7*315;
			t5+=v0<<8;t6+=v1<<8;t7+=v2<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;v7=(t7+(t6>>>16))&65535;v6=t6&65535;
		}

		return hashValHex(hl[v7>>8]+hl[v7&255]+hl[v6>>8]+hl[v6&255]+hl[v5>>8]+hl[v5&255]+hl[v4>>8]+hl[v4&255]+hl[v3>>8]+hl[v3&255]+hl[v2>>8]+hl[v2&255]+hl[v1>>8]+hl[v1&255]+hl[v0>>8]+hl[v0&255],128);
	}

	function _hash128_1_utf(str){
		var c,i,l=str.length,s=fnvConstants[128].offset,t0=0,v0=s[7]|0,t1=0,v1=s[6]|0,t2=0,v2=s[5]|0,t3=0,v3=s[4]|0,t4=0,v4=s[3]|0,t5=0,v5=s[2]|0,t6=0,v6=s[1]|0,t7=0,v7=s[0]|0;

		for (i = 0; i < l; i++) {
			c = str.charCodeAt(i);
			t0=v0*315;t1=v1*315;t2=v2*315;t3=v3*315;t4=v4*315;t5=v5*315;t6=v6*315;t7=v7*315;
			t5+=v0<<8;t6+=v1<<8;t7+=v2<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;v7=(t7+(t6>>>16))&65535;v6=t6&65535;
			if(c < 128){
				v0^=c;
			}else if(c < 2048){
				v0^=(c>>6)|192;
				t0=v0*315;t1=v1*315;t2=v2*315;t3=v3*315;t4=v4*315;t5=v5*315;t6=v6*315;t7=v7*315;
				t5+=v0<<8;t6+=v1<<8;t7+=v2<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;v7=(t7+(t6>>>16))&65535;v6=t6&65535;
				v0^=(c&63)|128;
			}else if(((c&64512)==55296)&&(i+1)<l&&((str.charCodeAt(i+1)&64512)==56320)){
				c=65536+((c&1023)<<10)+(str.charCodeAt(++i)&1023);
				v0^=(c>>18)|240;
				t0=v0*315;t1=v1*315;t2=v2*315;t3=v3*315;t4=v4*315;t5=v5*315;t6=v6*315;t7=v7*315;
				t5+=v0<<8;t6+=v1<<8;t7+=v2<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;v7=(t7+(t6>>>16))&65535;v6=t6&65535;
				v0^=((c>>12)&63)|128;
				t0=v0*315;t1=v1*315;t2=v2*315;t3=v3*315;t4=v4*315;t5=v5*315;t6=v6*315;t7=v7*315;
				t5+=v0<<8;t6+=v1<<8;t7+=v2<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;v7=(t7+(t6>>>16))&65535;v6=t6&65535;
				v0^=((c>>6)&63)|128;
				t0=v0*315;t1=v1*315;t2=v2*315;t3=v3*315;t4=v4*315;t5=v5*315;t6=v6*315;t7=v7*315;
				t5+=v0<<8;t6+=v1<<8;t7+=v2<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;v7=(t7+(t6>>>16))&65535;v6=t6&65535;
				v0^=(c&63)|128;
			}else {
				v0^=(c>>12)|224;
				t0=v0*315;t1=v1*315;t2=v2*315;t3=v3*315;t4=v4*315;t5=v5*315;t6=v6*315;t7=v7*315;
				t5+=v0<<8;t6+=v1<<8;t7+=v2<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;v7=(t7+(t6>>>16))&65535;v6=t6&65535;
				v0^=((c>>6)&63)|128;
				t0=v0*315;t1=v1*315;t2=v2*315;t3=v3*315;t4=v4*315;t5=v5*315;t6=v6*315;t7=v7*315;
				t5+=v0<<8;t6+=v1<<8;t7+=v2<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;v7=(t7+(t6>>>16))&65535;v6=t6&65535;
				v0^=(c&63)|128;
			}
		}

		return hashValHex(hl[v7>>8]+hl[v7&255]+hl[v6>>8]+hl[v6&255]+hl[v5>>8]+hl[v5&255]+hl[v4>>8]+hl[v4&255]+hl[v3>>8]+hl[v3&255]+hl[v2>>8]+hl[v2&255]+hl[v1>>8]+hl[v1&255]+hl[v0>>8]+hl[v0&255],128);
	}

	_hash128 = _hash128_1a;

	function _hash256_1a(str){
		var i,l=str.length-3,s=fnvConstants[256].offset,t0=0,v0=s[15]|0,t1=0,v1=s[14]|0,t2=0,v2=s[13]|0,t3=0,v3=s[12]|0,t4=0,v4=s[11]|0,t5=0,v5=s[10]|0,t6=0,v6=s[9]|0,t7=0,v7=s[8]|0,t8=0,v8=s[7]|0,t9=0,v9=s[6]|0,t10=0,v10=s[5]|0,t11=0,v11=s[4]|0,t12=0,v12=s[3]|0,t13=0,v13=s[2]|0,t14=0,v14=s[1]|0,t15=0,v15=s[0]|0;

		for (i = 0; i < l;) {
			v0^=str.charCodeAt(i++);
			t0=v0*355;t1=v1*355;t2=v2*355;t3=v3*355;t4=v4*355;t5=v5*355;t6=v6*355;t7=v7*355;t8=v8*355;t9=v9*355;t10=v10*355;t11=v11*355;t12=v12*355;t13=v13*355;t14=v14*355;t15=v15*355;
			t10+=v0<<8;t11+=v1<<8;t12+=v2<<8;t13+=v3<<8;t14+=v4<<8;t15+=v5<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;v15=(t15+(t14>>>16))&65535;v14=t14&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*355;t1=v1*355;t2=v2*355;t3=v3*355;t4=v4*355;t5=v5*355;t6=v6*355;t7=v7*355;t8=v8*355;t9=v9*355;t10=v10*355;t11=v11*355;t12=v12*355;t13=v13*355;t14=v14*355;t15=v15*355;
			t10+=v0<<8;t11+=v1<<8;t12+=v2<<8;t13+=v3<<8;t14+=v4<<8;t15+=v5<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;v15=(t15+(t14>>>16))&65535;v14=t14&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*355;t1=v1*355;t2=v2*355;t3=v3*355;t4=v4*355;t5=v5*355;t6=v6*355;t7=v7*355;t8=v8*355;t9=v9*355;t10=v10*355;t11=v11*355;t12=v12*355;t13=v13*355;t14=v14*355;t15=v15*355;
			t10+=v0<<8;t11+=v1<<8;t12+=v2<<8;t13+=v3<<8;t14+=v4<<8;t15+=v5<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;v15=(t15+(t14>>>16))&65535;v14=t14&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*355;t1=v1*355;t2=v2*355;t3=v3*355;t4=v4*355;t5=v5*355;t6=v6*355;t7=v7*355;t8=v8*355;t9=v9*355;t10=v10*355;t11=v11*355;t12=v12*355;t13=v13*355;t14=v14*355;t15=v15*355;
			t10+=v0<<8;t11+=v1<<8;t12+=v2<<8;t13+=v3<<8;t14+=v4<<8;t15+=v5<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;v15=(t15+(t14>>>16))&65535;v14=t14&65535;
		}

		while(i<l+3){
			v0^=str.charCodeAt(i++);
			t0=v0*355;t1=v1*355;t2=v2*355;t3=v3*355;t4=v4*355;t5=v5*355;t6=v6*355;t7=v7*355;t8=v8*355;t9=v9*355;t10=v10*355;t11=v11*355;t12=v12*355;t13=v13*355;t14=v14*355;t15=v15*355;
			t10+=v0<<8;t11+=v1<<8;t12+=v2<<8;t13+=v3<<8;t14+=v4<<8;t15+=v5<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;v15=(t15+(t14>>>16))&65535;v14=t14&65535;
		}

		return hashValHex(hl[v15>>8]+hl[v15&255]+hl[v14>>8]+hl[v14&255]+hl[v13>>8]+hl[v13&255]+hl[v12>>8]+hl[v12&255]+hl[v11>>8]+hl[v11&255]+hl[v10>>8]+hl[v10&255]+hl[v9>>8]+hl[v9&255]+hl[v8>>8]+hl[v8&255]+hl[v7>>8]+hl[v7&255]+hl[v6>>8]+hl[v6&255]+hl[v5>>8]+hl[v5&255]+hl[v4>>8]+hl[v4&255]+hl[v3>>8]+hl[v3&255]+hl[v2>>8]+hl[v2&255]+hl[v1>>8]+hl[v1&255]+hl[v0>>8]+hl[v0&255],256);
	}

	function _hash256_1(str){
		var i,l=str.length-3,s=fnvConstants[256].offset,t0=0,v0=s[15]|0,t1=0,v1=s[14]|0,t2=0,v2=s[13]|0,t3=0,v3=s[12]|0,t4=0,v4=s[11]|0,t5=0,v5=s[10]|0,t6=0,v6=s[9]|0,t7=0,v7=s[8]|0,t8=0,v8=s[7]|0,t9=0,v9=s[6]|0,t10=0,v10=s[5]|0,t11=0,v11=s[4]|0,t12=0,v12=s[3]|0,t13=0,v13=s[2]|0,t14=0,v14=s[1]|0,t15=0,v15=s[0]|0;

		for (i = 0; i < l;) {
			t0=v0*355;t1=v1*355;t2=v2*355;t3=v3*355;t4=v4*355;t5=v5*355;t6=v6*355;t7=v7*355;t8=v8*355;t9=v9*355;t10=v10*355;t11=v11*355;t12=v12*355;t13=v13*355;t14=v14*355;t15=v15*355;
			t10+=v0<<8;t11+=v1<<8;t12+=v2<<8;t13+=v3<<8;t14+=v4<<8;t15+=v5<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;v15=(t15+(t14>>>16))&65535;v14=t14&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*355;t1=v1*355;t2=v2*355;t3=v3*355;t4=v4*355;t5=v5*355;t6=v6*355;t7=v7*355;t8=v8*355;t9=v9*355;t10=v10*355;t11=v11*355;t12=v12*355;t13=v13*355;t14=v14*355;t15=v15*355;
			t10+=v0<<8;t11+=v1<<8;t12+=v2<<8;t13+=v3<<8;t14+=v4<<8;t15+=v5<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;v15=(t15+(t14>>>16))&65535;v14=t14&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*355;t1=v1*355;t2=v2*355;t3=v3*355;t4=v4*355;t5=v5*355;t6=v6*355;t7=v7*355;t8=v8*355;t9=v9*355;t10=v10*355;t11=v11*355;t12=v12*355;t13=v13*355;t14=v14*355;t15=v15*355;
			t10+=v0<<8;t11+=v1<<8;t12+=v2<<8;t13+=v3<<8;t14+=v4<<8;t15+=v5<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;v15=(t15+(t14>>>16))&65535;v14=t14&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*355;t1=v1*355;t2=v2*355;t3=v3*355;t4=v4*355;t5=v5*355;t6=v6*355;t7=v7*355;t8=v8*355;t9=v9*355;t10=v10*355;t11=v11*355;t12=v12*355;t13=v13*355;t14=v14*355;t15=v15*355;
			t10+=v0<<8;t11+=v1<<8;t12+=v2<<8;t13+=v3<<8;t14+=v4<<8;t15+=v5<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;v15=(t15+(t14>>>16))&65535;v14=t14&65535;
			v0^=str.charCodeAt(i++);
		}

		while(i<l+3){
			t0=v0*355;t1=v1*355;t2=v2*355;t3=v3*355;t4=v4*355;t5=v5*355;t6=v6*355;t7=v7*355;t8=v8*355;t9=v9*355;t10=v10*355;t11=v11*355;t12=v12*355;t13=v13*355;t14=v14*355;t15=v15*355;
			t10+=v0<<8;t11+=v1<<8;t12+=v2<<8;t13+=v3<<8;t14+=v4<<8;t15+=v5<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;v15=(t15+(t14>>>16))&65535;v14=t14&65535;
			v0^=str.charCodeAt(i++);
		}

		return hashValHex(hl[v15>>8]+hl[v15&255]+hl[v14>>8]+hl[v14&255]+hl[v13>>8]+hl[v13&255]+hl[v12>>8]+hl[v12&255]+hl[v11>>8]+hl[v11&255]+hl[v10>>8]+hl[v10&255]+hl[v9>>8]+hl[v9&255]+hl[v8>>8]+hl[v8&255]+hl[v7>>8]+hl[v7&255]+hl[v6>>8]+hl[v6&255]+hl[v5>>8]+hl[v5&255]+hl[v4>>8]+hl[v4&255]+hl[v3>>8]+hl[v3&255]+hl[v2>>8]+hl[v2&255]+hl[v1>>8]+hl[v1&255]+hl[v0>>8]+hl[v0&255],256);
	}

	function _hash256_1a_utf(str){
		var c,i,l=str.length,s=fnvConstants[256].offset,t0=0,v0=s[15]|0,t1=0,v1=s[14]|0,t2=0,v2=s[13]|0,t3=0,v3=s[12]|0,t4=0,v4=s[11]|0,t5=0,v5=s[10]|0,t6=0,v6=s[9]|0,t7=0,v7=s[8]|0,t8=0,v8=s[7]|0,t9=0,v9=s[6]|0,t10=0,v10=s[5]|0,t11=0,v11=s[4]|0,t12=0,v12=s[3]|0,t13=0,v13=s[2]|0,t14=0,v14=s[1]|0,t15=0,v15=s[0]|0;

		for (i = 0; i < l; i++) {
			c = str.charCodeAt(i);
			if(c < 128){
				v0^=c;
			}else if(c < 2048){
				v0^=(c>>6)|192;
				t0=v0*355;t1=v1*355;t2=v2*355;t3=v3*355;t4=v4*355;t5=v5*355;t6=v6*355;t7=v7*355;t8=v8*355;t9=v9*355;t10=v10*355;t11=v11*355;t12=v12*355;t13=v13*355;t14=v14*355;t15=v15*355;
				t10+=v0<<8;t11+=v1<<8;t12+=v2<<8;t13+=v3<<8;t14+=v4<<8;t15+=v5<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;v15=(t15+(t14>>>16))&65535;v14=t14&65535;
				v0^=(c&63)|128;
			}else if(((c&64512)==55296)&&(i+1)<l&&((str.charCodeAt(i+1)&64512)==56320)){
				c=65536+((c&1023)<<10)+(str.charCodeAt(++i)&1023);
				v0^=(c>>18)|240;
				t0=v0*355;t1=v1*355;t2=v2*355;t3=v3*355;t4=v4*355;t5=v5*355;t6=v6*355;t7=v7*355;t8=v8*355;t9=v9*355;t10=v10*355;t11=v11*355;t12=v12*355;t13=v13*355;t14=v14*355;t15=v15*355;
				t10+=v0<<8;t11+=v1<<8;t12+=v2<<8;t13+=v3<<8;t14+=v4<<8;t15+=v5<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;v15=(t15+(t14>>>16))&65535;v14=t14&65535;
				v0^=((c>>12)&63)|128;
				t0=v0*355;t1=v1*355;t2=v2*355;t3=v3*355;t4=v4*355;t5=v5*355;t6=v6*355;t7=v7*355;t8=v8*355;t9=v9*355;t10=v10*355;t11=v11*355;t12=v12*355;t13=v13*355;t14=v14*355;t15=v15*355;
				t10+=v0<<8;t11+=v1<<8;t12+=v2<<8;t13+=v3<<8;t14+=v4<<8;t15+=v5<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;v15=(t15+(t14>>>16))&65535;v14=t14&65535;
				v0^=((c>>6)&63)|128;
				t0=v0*355;t1=v1*355;t2=v2*355;t3=v3*355;t4=v4*355;t5=v5*355;t6=v6*355;t7=v7*355;t8=v8*355;t9=v9*355;t10=v10*355;t11=v11*355;t12=v12*355;t13=v13*355;t14=v14*355;t15=v15*355;
				t10+=v0<<8;t11+=v1<<8;t12+=v2<<8;t13+=v3<<8;t14+=v4<<8;t15+=v5<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;v15=(t15+(t14>>>16))&65535;v14=t14&65535;
				v0^=(c&63)|128;
			}else {
				v0^=(c>>12)|224;
				t0=v0*355;t1=v1*355;t2=v2*355;t3=v3*355;t4=v4*355;t5=v5*355;t6=v6*355;t7=v7*355;t8=v8*355;t9=v9*355;t10=v10*355;t11=v11*355;t12=v12*355;t13=v13*355;t14=v14*355;t15=v15*355;
				t10+=v0<<8;t11+=v1<<8;t12+=v2<<8;t13+=v3<<8;t14+=v4<<8;t15+=v5<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;v15=(t15+(t14>>>16))&65535;v14=t14&65535;
				v0^=((c>>6)&63)|128;
				t0=v0*355;t1=v1*355;t2=v2*355;t3=v3*355;t4=v4*355;t5=v5*355;t6=v6*355;t7=v7*355;t8=v8*355;t9=v9*355;t10=v10*355;t11=v11*355;t12=v12*355;t13=v13*355;t14=v14*355;t15=v15*355;
				t10+=v0<<8;t11+=v1<<8;t12+=v2<<8;t13+=v3<<8;t14+=v4<<8;t15+=v5<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;v15=(t15+(t14>>>16))&65535;v14=t14&65535;
				v0^=(c&63)|128;
			}
			t0=v0*355;t1=v1*355;t2=v2*355;t3=v3*355;t4=v4*355;t5=v5*355;t6=v6*355;t7=v7*355;t8=v8*355;t9=v9*355;t10=v10*355;t11=v11*355;t12=v12*355;t13=v13*355;t14=v14*355;t15=v15*355;
			t10+=v0<<8;t11+=v1<<8;t12+=v2<<8;t13+=v3<<8;t14+=v4<<8;t15+=v5<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;v15=(t15+(t14>>>16))&65535;v14=t14&65535;
		}

		return hashValHex(hl[v15>>8]+hl[v15&255]+hl[v14>>8]+hl[v14&255]+hl[v13>>8]+hl[v13&255]+hl[v12>>8]+hl[v12&255]+hl[v11>>8]+hl[v11&255]+hl[v10>>8]+hl[v10&255]+hl[v9>>8]+hl[v9&255]+hl[v8>>8]+hl[v8&255]+hl[v7>>8]+hl[v7&255]+hl[v6>>8]+hl[v6&255]+hl[v5>>8]+hl[v5&255]+hl[v4>>8]+hl[v4&255]+hl[v3>>8]+hl[v3&255]+hl[v2>>8]+hl[v2&255]+hl[v1>>8]+hl[v1&255]+hl[v0>>8]+hl[v0&255],256);
	}

	function _hash256_1_utf(str){
		var c,i,l=str.length,s=fnvConstants[256].offset,t0=0,v0=s[15]|0,t1=0,v1=s[14]|0,t2=0,v2=s[13]|0,t3=0,v3=s[12]|0,t4=0,v4=s[11]|0,t5=0,v5=s[10]|0,t6=0,v6=s[9]|0,t7=0,v7=s[8]|0,t8=0,v8=s[7]|0,t9=0,v9=s[6]|0,t10=0,v10=s[5]|0,t11=0,v11=s[4]|0,t12=0,v12=s[3]|0,t13=0,v13=s[2]|0,t14=0,v14=s[1]|0,t15=0,v15=s[0]|0;

		for (i = 0; i < l; i++) {
			c = str.charCodeAt(i);
			t0=v0*355;t1=v1*355;t2=v2*355;t3=v3*355;t4=v4*355;t5=v5*355;t6=v6*355;t7=v7*355;t8=v8*355;t9=v9*355;t10=v10*355;t11=v11*355;t12=v12*355;t13=v13*355;t14=v14*355;t15=v15*355;
			t10+=v0<<8;t11+=v1<<8;t12+=v2<<8;t13+=v3<<8;t14+=v4<<8;t15+=v5<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;v15=(t15+(t14>>>16))&65535;v14=t14&65535;
			if(c < 128){
				v0^=c;
			}else if(c < 2048){
				v0^=(c>>6)|192;
				t0=v0*355;t1=v1*355;t2=v2*355;t3=v3*355;t4=v4*355;t5=v5*355;t6=v6*355;t7=v7*355;t8=v8*355;t9=v9*355;t10=v10*355;t11=v11*355;t12=v12*355;t13=v13*355;t14=v14*355;t15=v15*355;
				t10+=v0<<8;t11+=v1<<8;t12+=v2<<8;t13+=v3<<8;t14+=v4<<8;t15+=v5<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;v15=(t15+(t14>>>16))&65535;v14=t14&65535;
				v0^=(c&63)|128;
			}else if(((c&64512)==55296)&&(i+1)<l&&((str.charCodeAt(i+1)&64512)==56320)){
				c=65536+((c&1023)<<10)+(str.charCodeAt(++i)&1023);
				v0^=(c>>18)|240;
				t0=v0*355;t1=v1*355;t2=v2*355;t3=v3*355;t4=v4*355;t5=v5*355;t6=v6*355;t7=v7*355;t8=v8*355;t9=v9*355;t10=v10*355;t11=v11*355;t12=v12*355;t13=v13*355;t14=v14*355;t15=v15*355;
				t10+=v0<<8;t11+=v1<<8;t12+=v2<<8;t13+=v3<<8;t14+=v4<<8;t15+=v5<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;v15=(t15+(t14>>>16))&65535;v14=t14&65535;
				v0^=((c>>12)&63)|128;
				t0=v0*355;t1=v1*355;t2=v2*355;t3=v3*355;t4=v4*355;t5=v5*355;t6=v6*355;t7=v7*355;t8=v8*355;t9=v9*355;t10=v10*355;t11=v11*355;t12=v12*355;t13=v13*355;t14=v14*355;t15=v15*355;
				t10+=v0<<8;t11+=v1<<8;t12+=v2<<8;t13+=v3<<8;t14+=v4<<8;t15+=v5<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;v15=(t15+(t14>>>16))&65535;v14=t14&65535;
				v0^=((c>>6)&63)|128;
				t0=v0*355;t1=v1*355;t2=v2*355;t3=v3*355;t4=v4*355;t5=v5*355;t6=v6*355;t7=v7*355;t8=v8*355;t9=v9*355;t10=v10*355;t11=v11*355;t12=v12*355;t13=v13*355;t14=v14*355;t15=v15*355;
				t10+=v0<<8;t11+=v1<<8;t12+=v2<<8;t13+=v3<<8;t14+=v4<<8;t15+=v5<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;v15=(t15+(t14>>>16))&65535;v14=t14&65535;
				v0^=(c&63)|128;
			}else {
				v0^=(c>>12)|224;
				t0=v0*355;t1=v1*355;t2=v2*355;t3=v3*355;t4=v4*355;t5=v5*355;t6=v6*355;t7=v7*355;t8=v8*355;t9=v9*355;t10=v10*355;t11=v11*355;t12=v12*355;t13=v13*355;t14=v14*355;t15=v15*355;
				t10+=v0<<8;t11+=v1<<8;t12+=v2<<8;t13+=v3<<8;t14+=v4<<8;t15+=v5<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;v15=(t15+(t14>>>16))&65535;v14=t14&65535;
				v0^=((c>>6)&63)|128;
				t0=v0*355;t1=v1*355;t2=v2*355;t3=v3*355;t4=v4*355;t5=v5*355;t6=v6*355;t7=v7*355;t8=v8*355;t9=v9*355;t10=v10*355;t11=v11*355;t12=v12*355;t13=v13*355;t14=v14*355;t15=v15*355;
				t10+=v0<<8;t11+=v1<<8;t12+=v2<<8;t13+=v3<<8;t14+=v4<<8;t15+=v5<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;v15=(t15+(t14>>>16))&65535;v14=t14&65535;
				v0^=(c&63)|128;
			}
		}

		return hashValHex(hl[v15>>8]+hl[v15&255]+hl[v14>>8]+hl[v14&255]+hl[v13>>8]+hl[v13&255]+hl[v12>>8]+hl[v12&255]+hl[v11>>8]+hl[v11&255]+hl[v10>>8]+hl[v10&255]+hl[v9>>8]+hl[v9&255]+hl[v8>>8]+hl[v8&255]+hl[v7>>8]+hl[v7&255]+hl[v6>>8]+hl[v6&255]+hl[v5>>8]+hl[v5&255]+hl[v4>>8]+hl[v4&255]+hl[v3>>8]+hl[v3&255]+hl[v2>>8]+hl[v2&255]+hl[v1>>8]+hl[v1&255]+hl[v0>>8]+hl[v0&255],256);
	}

	_hash256 = _hash256_1a;

	function _hash512_1a(str){
		var i,l=str.length-3,s=fnvConstants[512].offset,t0=0,v0=s[31]|0,t1=0,v1=s[30]|0,t2=0,v2=s[29]|0,t3=0,v3=s[28]|0,t4=0,v4=s[27]|0,t5=0,v5=s[26]|0,t6=0,v6=s[25]|0,t7=0,v7=s[24]|0,t8=0,v8=s[23]|0,t9=0,v9=s[22]|0,t10=0,v10=s[21]|0,t11=0,v11=s[20]|0,t12=0,v12=s[19]|0,t13=0,v13=s[18]|0,t14=0,v14=s[17]|0,t15=0,v15=s[16]|0,t16=0,v16=s[15]|0,t17=0,v17=s[14]|0,t18=0,v18=s[13]|0,t19=0,v19=s[12]|0,t20=0,v20=s[11]|0,t21=0,v21=s[10]|0,t22=0,v22=s[9]|0,t23=0,v23=s[8]|0,t24=0,v24=s[7]|0,t25=0,v25=s[6]|0,t26=0,v26=s[5]|0,t27=0,v27=s[4]|0,t28=0,v28=s[3]|0,t29=0,v29=s[2]|0,t30=0,v30=s[1]|0,t31=0,v31=s[0]|0;

		for (i = 0; i < l;) {
			v0^=str.charCodeAt(i++);
			t0=v0*343;t1=v1*343;t2=v2*343;t3=v3*343;t4=v4*343;t5=v5*343;t6=v6*343;t7=v7*343;t8=v8*343;t9=v9*343;t10=v10*343;t11=v11*343;t12=v12*343;t13=v13*343;t14=v14*343;t15=v15*343;t16=v16*343;t17=v17*343;t18=v18*343;t19=v19*343;t20=v20*343;t21=v21*343;t22=v22*343;t23=v23*343;t24=v24*343;t25=v25*343;t26=v26*343;t27=v27*343;t28=v28*343;t29=v29*343;t30=v30*343;t31=v31*343;
			t21+=v0<<8;t22+=v1<<8;t23+=v2<<8;t24+=v3<<8;t25+=v4<<8;t26+=v5<<8;t27+=v6<<8;t28+=v7<<8;t29+=v8<<8;t30+=v9<<8;t31+=v10<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;v31=(t31+(t30>>>16))&65535;v30=t30&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*343;t1=v1*343;t2=v2*343;t3=v3*343;t4=v4*343;t5=v5*343;t6=v6*343;t7=v7*343;t8=v8*343;t9=v9*343;t10=v10*343;t11=v11*343;t12=v12*343;t13=v13*343;t14=v14*343;t15=v15*343;t16=v16*343;t17=v17*343;t18=v18*343;t19=v19*343;t20=v20*343;t21=v21*343;t22=v22*343;t23=v23*343;t24=v24*343;t25=v25*343;t26=v26*343;t27=v27*343;t28=v28*343;t29=v29*343;t30=v30*343;t31=v31*343;
			t21+=v0<<8;t22+=v1<<8;t23+=v2<<8;t24+=v3<<8;t25+=v4<<8;t26+=v5<<8;t27+=v6<<8;t28+=v7<<8;t29+=v8<<8;t30+=v9<<8;t31+=v10<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;v31=(t31+(t30>>>16))&65535;v30=t30&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*343;t1=v1*343;t2=v2*343;t3=v3*343;t4=v4*343;t5=v5*343;t6=v6*343;t7=v7*343;t8=v8*343;t9=v9*343;t10=v10*343;t11=v11*343;t12=v12*343;t13=v13*343;t14=v14*343;t15=v15*343;t16=v16*343;t17=v17*343;t18=v18*343;t19=v19*343;t20=v20*343;t21=v21*343;t22=v22*343;t23=v23*343;t24=v24*343;t25=v25*343;t26=v26*343;t27=v27*343;t28=v28*343;t29=v29*343;t30=v30*343;t31=v31*343;
			t21+=v0<<8;t22+=v1<<8;t23+=v2<<8;t24+=v3<<8;t25+=v4<<8;t26+=v5<<8;t27+=v6<<8;t28+=v7<<8;t29+=v8<<8;t30+=v9<<8;t31+=v10<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;v31=(t31+(t30>>>16))&65535;v30=t30&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*343;t1=v1*343;t2=v2*343;t3=v3*343;t4=v4*343;t5=v5*343;t6=v6*343;t7=v7*343;t8=v8*343;t9=v9*343;t10=v10*343;t11=v11*343;t12=v12*343;t13=v13*343;t14=v14*343;t15=v15*343;t16=v16*343;t17=v17*343;t18=v18*343;t19=v19*343;t20=v20*343;t21=v21*343;t22=v22*343;t23=v23*343;t24=v24*343;t25=v25*343;t26=v26*343;t27=v27*343;t28=v28*343;t29=v29*343;t30=v30*343;t31=v31*343;
			t21+=v0<<8;t22+=v1<<8;t23+=v2<<8;t24+=v3<<8;t25+=v4<<8;t26+=v5<<8;t27+=v6<<8;t28+=v7<<8;t29+=v8<<8;t30+=v9<<8;t31+=v10<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;v31=(t31+(t30>>>16))&65535;v30=t30&65535;
		}

		while(i<l+3){
			v0^=str.charCodeAt(i++);
			t0=v0*343;t1=v1*343;t2=v2*343;t3=v3*343;t4=v4*343;t5=v5*343;t6=v6*343;t7=v7*343;t8=v8*343;t9=v9*343;t10=v10*343;t11=v11*343;t12=v12*343;t13=v13*343;t14=v14*343;t15=v15*343;t16=v16*343;t17=v17*343;t18=v18*343;t19=v19*343;t20=v20*343;t21=v21*343;t22=v22*343;t23=v23*343;t24=v24*343;t25=v25*343;t26=v26*343;t27=v27*343;t28=v28*343;t29=v29*343;t30=v30*343;t31=v31*343;
			t21+=v0<<8;t22+=v1<<8;t23+=v2<<8;t24+=v3<<8;t25+=v4<<8;t26+=v5<<8;t27+=v6<<8;t28+=v7<<8;t29+=v8<<8;t30+=v9<<8;t31+=v10<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;v31=(t31+(t30>>>16))&65535;v30=t30&65535;
		}

		return hashValHex(hl[v31>>8]+hl[v31&255]+hl[v30>>8]+hl[v30&255]+hl[v29>>8]+hl[v29&255]+hl[v28>>8]+hl[v28&255]+hl[v27>>8]+hl[v27&255]+hl[v26>>8]+hl[v26&255]+hl[v25>>8]+hl[v25&255]+hl[v24>>8]+hl[v24&255]+hl[v23>>8]+hl[v23&255]+hl[v22>>8]+hl[v22&255]+hl[v21>>8]+hl[v21&255]+hl[v20>>8]+hl[v20&255]+hl[v19>>8]+hl[v19&255]+hl[v18>>8]+hl[v18&255]+hl[v17>>8]+hl[v17&255]+hl[v16>>8]+hl[v16&255]+hl[v15>>8]+hl[v15&255]+hl[v14>>8]+hl[v14&255]+hl[v13>>8]+hl[v13&255]+hl[v12>>8]+hl[v12&255]+hl[v11>>8]+hl[v11&255]+hl[v10>>8]+hl[v10&255]+hl[v9>>8]+hl[v9&255]+hl[v8>>8]+hl[v8&255]+hl[v7>>8]+hl[v7&255]+hl[v6>>8]+hl[v6&255]+hl[v5>>8]+hl[v5&255]+hl[v4>>8]+hl[v4&255]+hl[v3>>8]+hl[v3&255]+hl[v2>>8]+hl[v2&255]+hl[v1>>8]+hl[v1&255]+hl[v0>>8]+hl[v0&255],512);
	}

	function _hash512_1(str){
		var i,l=str.length-3,s=fnvConstants[512].offset,t0=0,v0=s[31]|0,t1=0,v1=s[30]|0,t2=0,v2=s[29]|0,t3=0,v3=s[28]|0,t4=0,v4=s[27]|0,t5=0,v5=s[26]|0,t6=0,v6=s[25]|0,t7=0,v7=s[24]|0,t8=0,v8=s[23]|0,t9=0,v9=s[22]|0,t10=0,v10=s[21]|0,t11=0,v11=s[20]|0,t12=0,v12=s[19]|0,t13=0,v13=s[18]|0,t14=0,v14=s[17]|0,t15=0,v15=s[16]|0,t16=0,v16=s[15]|0,t17=0,v17=s[14]|0,t18=0,v18=s[13]|0,t19=0,v19=s[12]|0,t20=0,v20=s[11]|0,t21=0,v21=s[10]|0,t22=0,v22=s[9]|0,t23=0,v23=s[8]|0,t24=0,v24=s[7]|0,t25=0,v25=s[6]|0,t26=0,v26=s[5]|0,t27=0,v27=s[4]|0,t28=0,v28=s[3]|0,t29=0,v29=s[2]|0,t30=0,v30=s[1]|0,t31=0,v31=s[0]|0;

		for (i = 0; i < l;) {
			t0=v0*343;t1=v1*343;t2=v2*343;t3=v3*343;t4=v4*343;t5=v5*343;t6=v6*343;t7=v7*343;t8=v8*343;t9=v9*343;t10=v10*343;t11=v11*343;t12=v12*343;t13=v13*343;t14=v14*343;t15=v15*343;t16=v16*343;t17=v17*343;t18=v18*343;t19=v19*343;t20=v20*343;t21=v21*343;t22=v22*343;t23=v23*343;t24=v24*343;t25=v25*343;t26=v26*343;t27=v27*343;t28=v28*343;t29=v29*343;t30=v30*343;t31=v31*343;
			t21+=v0<<8;t22+=v1<<8;t23+=v2<<8;t24+=v3<<8;t25+=v4<<8;t26+=v5<<8;t27+=v6<<8;t28+=v7<<8;t29+=v8<<8;t30+=v9<<8;t31+=v10<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;v31=(t31+(t30>>>16))&65535;v30=t30&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*343;t1=v1*343;t2=v2*343;t3=v3*343;t4=v4*343;t5=v5*343;t6=v6*343;t7=v7*343;t8=v8*343;t9=v9*343;t10=v10*343;t11=v11*343;t12=v12*343;t13=v13*343;t14=v14*343;t15=v15*343;t16=v16*343;t17=v17*343;t18=v18*343;t19=v19*343;t20=v20*343;t21=v21*343;t22=v22*343;t23=v23*343;t24=v24*343;t25=v25*343;t26=v26*343;t27=v27*343;t28=v28*343;t29=v29*343;t30=v30*343;t31=v31*343;
			t21+=v0<<8;t22+=v1<<8;t23+=v2<<8;t24+=v3<<8;t25+=v4<<8;t26+=v5<<8;t27+=v6<<8;t28+=v7<<8;t29+=v8<<8;t30+=v9<<8;t31+=v10<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;v31=(t31+(t30>>>16))&65535;v30=t30&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*343;t1=v1*343;t2=v2*343;t3=v3*343;t4=v4*343;t5=v5*343;t6=v6*343;t7=v7*343;t8=v8*343;t9=v9*343;t10=v10*343;t11=v11*343;t12=v12*343;t13=v13*343;t14=v14*343;t15=v15*343;t16=v16*343;t17=v17*343;t18=v18*343;t19=v19*343;t20=v20*343;t21=v21*343;t22=v22*343;t23=v23*343;t24=v24*343;t25=v25*343;t26=v26*343;t27=v27*343;t28=v28*343;t29=v29*343;t30=v30*343;t31=v31*343;
			t21+=v0<<8;t22+=v1<<8;t23+=v2<<8;t24+=v3<<8;t25+=v4<<8;t26+=v5<<8;t27+=v6<<8;t28+=v7<<8;t29+=v8<<8;t30+=v9<<8;t31+=v10<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;v31=(t31+(t30>>>16))&65535;v30=t30&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*343;t1=v1*343;t2=v2*343;t3=v3*343;t4=v4*343;t5=v5*343;t6=v6*343;t7=v7*343;t8=v8*343;t9=v9*343;t10=v10*343;t11=v11*343;t12=v12*343;t13=v13*343;t14=v14*343;t15=v15*343;t16=v16*343;t17=v17*343;t18=v18*343;t19=v19*343;t20=v20*343;t21=v21*343;t22=v22*343;t23=v23*343;t24=v24*343;t25=v25*343;t26=v26*343;t27=v27*343;t28=v28*343;t29=v29*343;t30=v30*343;t31=v31*343;
			t21+=v0<<8;t22+=v1<<8;t23+=v2<<8;t24+=v3<<8;t25+=v4<<8;t26+=v5<<8;t27+=v6<<8;t28+=v7<<8;t29+=v8<<8;t30+=v9<<8;t31+=v10<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;v31=(t31+(t30>>>16))&65535;v30=t30&65535;
			v0^=str.charCodeAt(i++);
		}

		while(i<l+3){
			t0=v0*343;t1=v1*343;t2=v2*343;t3=v3*343;t4=v4*343;t5=v5*343;t6=v6*343;t7=v7*343;t8=v8*343;t9=v9*343;t10=v10*343;t11=v11*343;t12=v12*343;t13=v13*343;t14=v14*343;t15=v15*343;t16=v16*343;t17=v17*343;t18=v18*343;t19=v19*343;t20=v20*343;t21=v21*343;t22=v22*343;t23=v23*343;t24=v24*343;t25=v25*343;t26=v26*343;t27=v27*343;t28=v28*343;t29=v29*343;t30=v30*343;t31=v31*343;
			t21+=v0<<8;t22+=v1<<8;t23+=v2<<8;t24+=v3<<8;t25+=v4<<8;t26+=v5<<8;t27+=v6<<8;t28+=v7<<8;t29+=v8<<8;t30+=v9<<8;t31+=v10<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;v31=(t31+(t30>>>16))&65535;v30=t30&65535;
			v0^=str.charCodeAt(i++);
		}

		return hashValHex(hl[v31>>8]+hl[v31&255]+hl[v30>>8]+hl[v30&255]+hl[v29>>8]+hl[v29&255]+hl[v28>>8]+hl[v28&255]+hl[v27>>8]+hl[v27&255]+hl[v26>>8]+hl[v26&255]+hl[v25>>8]+hl[v25&255]+hl[v24>>8]+hl[v24&255]+hl[v23>>8]+hl[v23&255]+hl[v22>>8]+hl[v22&255]+hl[v21>>8]+hl[v21&255]+hl[v20>>8]+hl[v20&255]+hl[v19>>8]+hl[v19&255]+hl[v18>>8]+hl[v18&255]+hl[v17>>8]+hl[v17&255]+hl[v16>>8]+hl[v16&255]+hl[v15>>8]+hl[v15&255]+hl[v14>>8]+hl[v14&255]+hl[v13>>8]+hl[v13&255]+hl[v12>>8]+hl[v12&255]+hl[v11>>8]+hl[v11&255]+hl[v10>>8]+hl[v10&255]+hl[v9>>8]+hl[v9&255]+hl[v8>>8]+hl[v8&255]+hl[v7>>8]+hl[v7&255]+hl[v6>>8]+hl[v6&255]+hl[v5>>8]+hl[v5&255]+hl[v4>>8]+hl[v4&255]+hl[v3>>8]+hl[v3&255]+hl[v2>>8]+hl[v2&255]+hl[v1>>8]+hl[v1&255]+hl[v0>>8]+hl[v0&255],512);
	}

	function _hash512_1a_utf(str){
		var c,i,l=str.length,s=fnvConstants[512].offset,t0=0,v0=s[31]|0,t1=0,v1=s[30]|0,t2=0,v2=s[29]|0,t3=0,v3=s[28]|0,t4=0,v4=s[27]|0,t5=0,v5=s[26]|0,t6=0,v6=s[25]|0,t7=0,v7=s[24]|0,t8=0,v8=s[23]|0,t9=0,v9=s[22]|0,t10=0,v10=s[21]|0,t11=0,v11=s[20]|0,t12=0,v12=s[19]|0,t13=0,v13=s[18]|0,t14=0,v14=s[17]|0,t15=0,v15=s[16]|0,t16=0,v16=s[15]|0,t17=0,v17=s[14]|0,t18=0,v18=s[13]|0,t19=0,v19=s[12]|0,t20=0,v20=s[11]|0,t21=0,v21=s[10]|0,t22=0,v22=s[9]|0,t23=0,v23=s[8]|0,t24=0,v24=s[7]|0,t25=0,v25=s[6]|0,t26=0,v26=s[5]|0,t27=0,v27=s[4]|0,t28=0,v28=s[3]|0,t29=0,v29=s[2]|0,t30=0,v30=s[1]|0,t31=0,v31=s[0]|0;

		for (i = 0; i < l; i++) {
			c = str.charCodeAt(i);
			if(c < 128){
				v0^=c;
			}else if(c < 2048){
				v0^=(c>>6)|192;
				t0=v0*343;t1=v1*343;t2=v2*343;t3=v3*343;t4=v4*343;t5=v5*343;t6=v6*343;t7=v7*343;t8=v8*343;t9=v9*343;t10=v10*343;t11=v11*343;t12=v12*343;t13=v13*343;t14=v14*343;t15=v15*343;t16=v16*343;t17=v17*343;t18=v18*343;t19=v19*343;t20=v20*343;t21=v21*343;t22=v22*343;t23=v23*343;t24=v24*343;t25=v25*343;t26=v26*343;t27=v27*343;t28=v28*343;t29=v29*343;t30=v30*343;t31=v31*343;
				t21+=v0<<8;t22+=v1<<8;t23+=v2<<8;t24+=v3<<8;t25+=v4<<8;t26+=v5<<8;t27+=v6<<8;t28+=v7<<8;t29+=v8<<8;t30+=v9<<8;t31+=v10<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;v31=(t31+(t30>>>16))&65535;v30=t30&65535;
				v0^=(c&63)|128;
			}else if(((c&64512)==55296)&&(i+1)<l&&((str.charCodeAt(i+1)&64512)==56320)){
				c=65536+((c&1023)<<10)+(str.charCodeAt(++i)&1023);
				v0^=(c>>18)|240;
				t0=v0*343;t1=v1*343;t2=v2*343;t3=v3*343;t4=v4*343;t5=v5*343;t6=v6*343;t7=v7*343;t8=v8*343;t9=v9*343;t10=v10*343;t11=v11*343;t12=v12*343;t13=v13*343;t14=v14*343;t15=v15*343;t16=v16*343;t17=v17*343;t18=v18*343;t19=v19*343;t20=v20*343;t21=v21*343;t22=v22*343;t23=v23*343;t24=v24*343;t25=v25*343;t26=v26*343;t27=v27*343;t28=v28*343;t29=v29*343;t30=v30*343;t31=v31*343;
				t21+=v0<<8;t22+=v1<<8;t23+=v2<<8;t24+=v3<<8;t25+=v4<<8;t26+=v5<<8;t27+=v6<<8;t28+=v7<<8;t29+=v8<<8;t30+=v9<<8;t31+=v10<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;v31=(t31+(t30>>>16))&65535;v30=t30&65535;
				v0^=((c>>12)&63)|128;
				t0=v0*343;t1=v1*343;t2=v2*343;t3=v3*343;t4=v4*343;t5=v5*343;t6=v6*343;t7=v7*343;t8=v8*343;t9=v9*343;t10=v10*343;t11=v11*343;t12=v12*343;t13=v13*343;t14=v14*343;t15=v15*343;t16=v16*343;t17=v17*343;t18=v18*343;t19=v19*343;t20=v20*343;t21=v21*343;t22=v22*343;t23=v23*343;t24=v24*343;t25=v25*343;t26=v26*343;t27=v27*343;t28=v28*343;t29=v29*343;t30=v30*343;t31=v31*343;
				t21+=v0<<8;t22+=v1<<8;t23+=v2<<8;t24+=v3<<8;t25+=v4<<8;t26+=v5<<8;t27+=v6<<8;t28+=v7<<8;t29+=v8<<8;t30+=v9<<8;t31+=v10<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;v31=(t31+(t30>>>16))&65535;v30=t30&65535;
				v0^=((c>>6)&63)|128;
				t0=v0*343;t1=v1*343;t2=v2*343;t3=v3*343;t4=v4*343;t5=v5*343;t6=v6*343;t7=v7*343;t8=v8*343;t9=v9*343;t10=v10*343;t11=v11*343;t12=v12*343;t13=v13*343;t14=v14*343;t15=v15*343;t16=v16*343;t17=v17*343;t18=v18*343;t19=v19*343;t20=v20*343;t21=v21*343;t22=v22*343;t23=v23*343;t24=v24*343;t25=v25*343;t26=v26*343;t27=v27*343;t28=v28*343;t29=v29*343;t30=v30*343;t31=v31*343;
				t21+=v0<<8;t22+=v1<<8;t23+=v2<<8;t24+=v3<<8;t25+=v4<<8;t26+=v5<<8;t27+=v6<<8;t28+=v7<<8;t29+=v8<<8;t30+=v9<<8;t31+=v10<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;v31=(t31+(t30>>>16))&65535;v30=t30&65535;
				v0^=(c&63)|128;
			}else {
				v0^=(c>>12)|224;
				t0=v0*343;t1=v1*343;t2=v2*343;t3=v3*343;t4=v4*343;t5=v5*343;t6=v6*343;t7=v7*343;t8=v8*343;t9=v9*343;t10=v10*343;t11=v11*343;t12=v12*343;t13=v13*343;t14=v14*343;t15=v15*343;t16=v16*343;t17=v17*343;t18=v18*343;t19=v19*343;t20=v20*343;t21=v21*343;t22=v22*343;t23=v23*343;t24=v24*343;t25=v25*343;t26=v26*343;t27=v27*343;t28=v28*343;t29=v29*343;t30=v30*343;t31=v31*343;
				t21+=v0<<8;t22+=v1<<8;t23+=v2<<8;t24+=v3<<8;t25+=v4<<8;t26+=v5<<8;t27+=v6<<8;t28+=v7<<8;t29+=v8<<8;t30+=v9<<8;t31+=v10<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;v31=(t31+(t30>>>16))&65535;v30=t30&65535;
				v0^=((c>>6)&63)|128;
				t0=v0*343;t1=v1*343;t2=v2*343;t3=v3*343;t4=v4*343;t5=v5*343;t6=v6*343;t7=v7*343;t8=v8*343;t9=v9*343;t10=v10*343;t11=v11*343;t12=v12*343;t13=v13*343;t14=v14*343;t15=v15*343;t16=v16*343;t17=v17*343;t18=v18*343;t19=v19*343;t20=v20*343;t21=v21*343;t22=v22*343;t23=v23*343;t24=v24*343;t25=v25*343;t26=v26*343;t27=v27*343;t28=v28*343;t29=v29*343;t30=v30*343;t31=v31*343;
				t21+=v0<<8;t22+=v1<<8;t23+=v2<<8;t24+=v3<<8;t25+=v4<<8;t26+=v5<<8;t27+=v6<<8;t28+=v7<<8;t29+=v8<<8;t30+=v9<<8;t31+=v10<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;v31=(t31+(t30>>>16))&65535;v30=t30&65535;
				v0^=(c&63)|128;
			}
			t0=v0*343;t1=v1*343;t2=v2*343;t3=v3*343;t4=v4*343;t5=v5*343;t6=v6*343;t7=v7*343;t8=v8*343;t9=v9*343;t10=v10*343;t11=v11*343;t12=v12*343;t13=v13*343;t14=v14*343;t15=v15*343;t16=v16*343;t17=v17*343;t18=v18*343;t19=v19*343;t20=v20*343;t21=v21*343;t22=v22*343;t23=v23*343;t24=v24*343;t25=v25*343;t26=v26*343;t27=v27*343;t28=v28*343;t29=v29*343;t30=v30*343;t31=v31*343;
			t21+=v0<<8;t22+=v1<<8;t23+=v2<<8;t24+=v3<<8;t25+=v4<<8;t26+=v5<<8;t27+=v6<<8;t28+=v7<<8;t29+=v8<<8;t30+=v9<<8;t31+=v10<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;v31=(t31+(t30>>>16))&65535;v30=t30&65535;
		}

		return hashValHex(hl[v31>>8]+hl[v31&255]+hl[v30>>8]+hl[v30&255]+hl[v29>>8]+hl[v29&255]+hl[v28>>8]+hl[v28&255]+hl[v27>>8]+hl[v27&255]+hl[v26>>8]+hl[v26&255]+hl[v25>>8]+hl[v25&255]+hl[v24>>8]+hl[v24&255]+hl[v23>>8]+hl[v23&255]+hl[v22>>8]+hl[v22&255]+hl[v21>>8]+hl[v21&255]+hl[v20>>8]+hl[v20&255]+hl[v19>>8]+hl[v19&255]+hl[v18>>8]+hl[v18&255]+hl[v17>>8]+hl[v17&255]+hl[v16>>8]+hl[v16&255]+hl[v15>>8]+hl[v15&255]+hl[v14>>8]+hl[v14&255]+hl[v13>>8]+hl[v13&255]+hl[v12>>8]+hl[v12&255]+hl[v11>>8]+hl[v11&255]+hl[v10>>8]+hl[v10&255]+hl[v9>>8]+hl[v9&255]+hl[v8>>8]+hl[v8&255]+hl[v7>>8]+hl[v7&255]+hl[v6>>8]+hl[v6&255]+hl[v5>>8]+hl[v5&255]+hl[v4>>8]+hl[v4&255]+hl[v3>>8]+hl[v3&255]+hl[v2>>8]+hl[v2&255]+hl[v1>>8]+hl[v1&255]+hl[v0>>8]+hl[v0&255],512);
	}

	function _hash512_1_utf(str){
		var c,i,l=str.length,s=fnvConstants[512].offset,t0=0,v0=s[31]|0,t1=0,v1=s[30]|0,t2=0,v2=s[29]|0,t3=0,v3=s[28]|0,t4=0,v4=s[27]|0,t5=0,v5=s[26]|0,t6=0,v6=s[25]|0,t7=0,v7=s[24]|0,t8=0,v8=s[23]|0,t9=0,v9=s[22]|0,t10=0,v10=s[21]|0,t11=0,v11=s[20]|0,t12=0,v12=s[19]|0,t13=0,v13=s[18]|0,t14=0,v14=s[17]|0,t15=0,v15=s[16]|0,t16=0,v16=s[15]|0,t17=0,v17=s[14]|0,t18=0,v18=s[13]|0,t19=0,v19=s[12]|0,t20=0,v20=s[11]|0,t21=0,v21=s[10]|0,t22=0,v22=s[9]|0,t23=0,v23=s[8]|0,t24=0,v24=s[7]|0,t25=0,v25=s[6]|0,t26=0,v26=s[5]|0,t27=0,v27=s[4]|0,t28=0,v28=s[3]|0,t29=0,v29=s[2]|0,t30=0,v30=s[1]|0,t31=0,v31=s[0]|0;

		for (i = 0; i < l; i++) {
			c = str.charCodeAt(i);
			t0=v0*343;t1=v1*343;t2=v2*343;t3=v3*343;t4=v4*343;t5=v5*343;t6=v6*343;t7=v7*343;t8=v8*343;t9=v9*343;t10=v10*343;t11=v11*343;t12=v12*343;t13=v13*343;t14=v14*343;t15=v15*343;t16=v16*343;t17=v17*343;t18=v18*343;t19=v19*343;t20=v20*343;t21=v21*343;t22=v22*343;t23=v23*343;t24=v24*343;t25=v25*343;t26=v26*343;t27=v27*343;t28=v28*343;t29=v29*343;t30=v30*343;t31=v31*343;
			t21+=v0<<8;t22+=v1<<8;t23+=v2<<8;t24+=v3<<8;t25+=v4<<8;t26+=v5<<8;t27+=v6<<8;t28+=v7<<8;t29+=v8<<8;t30+=v9<<8;t31+=v10<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;v31=(t31+(t30>>>16))&65535;v30=t30&65535;
			if(c < 128){
				v0^=c;
			}else if(c < 2048){
				v0^=(c>>6)|192;
				t0=v0*343;t1=v1*343;t2=v2*343;t3=v3*343;t4=v4*343;t5=v5*343;t6=v6*343;t7=v7*343;t8=v8*343;t9=v9*343;t10=v10*343;t11=v11*343;t12=v12*343;t13=v13*343;t14=v14*343;t15=v15*343;t16=v16*343;t17=v17*343;t18=v18*343;t19=v19*343;t20=v20*343;t21=v21*343;t22=v22*343;t23=v23*343;t24=v24*343;t25=v25*343;t26=v26*343;t27=v27*343;t28=v28*343;t29=v29*343;t30=v30*343;t31=v31*343;
				t21+=v0<<8;t22+=v1<<8;t23+=v2<<8;t24+=v3<<8;t25+=v4<<8;t26+=v5<<8;t27+=v6<<8;t28+=v7<<8;t29+=v8<<8;t30+=v9<<8;t31+=v10<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;v31=(t31+(t30>>>16))&65535;v30=t30&65535;
				v0^=(c&63)|128;
			}else if(((c&64512)==55296)&&(i+1)<l&&((str.charCodeAt(i+1)&64512)==56320)){
				c=65536+((c&1023)<<10)+(str.charCodeAt(++i)&1023);
				v0^=(c>>18)|240;
				t0=v0*343;t1=v1*343;t2=v2*343;t3=v3*343;t4=v4*343;t5=v5*343;t6=v6*343;t7=v7*343;t8=v8*343;t9=v9*343;t10=v10*343;t11=v11*343;t12=v12*343;t13=v13*343;t14=v14*343;t15=v15*343;t16=v16*343;t17=v17*343;t18=v18*343;t19=v19*343;t20=v20*343;t21=v21*343;t22=v22*343;t23=v23*343;t24=v24*343;t25=v25*343;t26=v26*343;t27=v27*343;t28=v28*343;t29=v29*343;t30=v30*343;t31=v31*343;
				t21+=v0<<8;t22+=v1<<8;t23+=v2<<8;t24+=v3<<8;t25+=v4<<8;t26+=v5<<8;t27+=v6<<8;t28+=v7<<8;t29+=v8<<8;t30+=v9<<8;t31+=v10<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;v31=(t31+(t30>>>16))&65535;v30=t30&65535;
				v0^=((c>>12)&63)|128;
				t0=v0*343;t1=v1*343;t2=v2*343;t3=v3*343;t4=v4*343;t5=v5*343;t6=v6*343;t7=v7*343;t8=v8*343;t9=v9*343;t10=v10*343;t11=v11*343;t12=v12*343;t13=v13*343;t14=v14*343;t15=v15*343;t16=v16*343;t17=v17*343;t18=v18*343;t19=v19*343;t20=v20*343;t21=v21*343;t22=v22*343;t23=v23*343;t24=v24*343;t25=v25*343;t26=v26*343;t27=v27*343;t28=v28*343;t29=v29*343;t30=v30*343;t31=v31*343;
				t21+=v0<<8;t22+=v1<<8;t23+=v2<<8;t24+=v3<<8;t25+=v4<<8;t26+=v5<<8;t27+=v6<<8;t28+=v7<<8;t29+=v8<<8;t30+=v9<<8;t31+=v10<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;v31=(t31+(t30>>>16))&65535;v30=t30&65535;
				v0^=((c>>6)&63)|128;
				t0=v0*343;t1=v1*343;t2=v2*343;t3=v3*343;t4=v4*343;t5=v5*343;t6=v6*343;t7=v7*343;t8=v8*343;t9=v9*343;t10=v10*343;t11=v11*343;t12=v12*343;t13=v13*343;t14=v14*343;t15=v15*343;t16=v16*343;t17=v17*343;t18=v18*343;t19=v19*343;t20=v20*343;t21=v21*343;t22=v22*343;t23=v23*343;t24=v24*343;t25=v25*343;t26=v26*343;t27=v27*343;t28=v28*343;t29=v29*343;t30=v30*343;t31=v31*343;
				t21+=v0<<8;t22+=v1<<8;t23+=v2<<8;t24+=v3<<8;t25+=v4<<8;t26+=v5<<8;t27+=v6<<8;t28+=v7<<8;t29+=v8<<8;t30+=v9<<8;t31+=v10<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;v31=(t31+(t30>>>16))&65535;v30=t30&65535;
				v0^=(c&63)|128;
			}else {
				v0^=(c>>12)|224;
				t0=v0*343;t1=v1*343;t2=v2*343;t3=v3*343;t4=v4*343;t5=v5*343;t6=v6*343;t7=v7*343;t8=v8*343;t9=v9*343;t10=v10*343;t11=v11*343;t12=v12*343;t13=v13*343;t14=v14*343;t15=v15*343;t16=v16*343;t17=v17*343;t18=v18*343;t19=v19*343;t20=v20*343;t21=v21*343;t22=v22*343;t23=v23*343;t24=v24*343;t25=v25*343;t26=v26*343;t27=v27*343;t28=v28*343;t29=v29*343;t30=v30*343;t31=v31*343;
				t21+=v0<<8;t22+=v1<<8;t23+=v2<<8;t24+=v3<<8;t25+=v4<<8;t26+=v5<<8;t27+=v6<<8;t28+=v7<<8;t29+=v8<<8;t30+=v9<<8;t31+=v10<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;v31=(t31+(t30>>>16))&65535;v30=t30&65535;
				v0^=((c>>6)&63)|128;
				t0=v0*343;t1=v1*343;t2=v2*343;t3=v3*343;t4=v4*343;t5=v5*343;t6=v6*343;t7=v7*343;t8=v8*343;t9=v9*343;t10=v10*343;t11=v11*343;t12=v12*343;t13=v13*343;t14=v14*343;t15=v15*343;t16=v16*343;t17=v17*343;t18=v18*343;t19=v19*343;t20=v20*343;t21=v21*343;t22=v22*343;t23=v23*343;t24=v24*343;t25=v25*343;t26=v26*343;t27=v27*343;t28=v28*343;t29=v29*343;t30=v30*343;t31=v31*343;
				t21+=v0<<8;t22+=v1<<8;t23+=v2<<8;t24+=v3<<8;t25+=v4<<8;t26+=v5<<8;t27+=v6<<8;t28+=v7<<8;t29+=v8<<8;t30+=v9<<8;t31+=v10<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;v31=(t31+(t30>>>16))&65535;v30=t30&65535;
				v0^=(c&63)|128;
			}
		}

		return hashValHex(hl[v31>>8]+hl[v31&255]+hl[v30>>8]+hl[v30&255]+hl[v29>>8]+hl[v29&255]+hl[v28>>8]+hl[v28&255]+hl[v27>>8]+hl[v27&255]+hl[v26>>8]+hl[v26&255]+hl[v25>>8]+hl[v25&255]+hl[v24>>8]+hl[v24&255]+hl[v23>>8]+hl[v23&255]+hl[v22>>8]+hl[v22&255]+hl[v21>>8]+hl[v21&255]+hl[v20>>8]+hl[v20&255]+hl[v19>>8]+hl[v19&255]+hl[v18>>8]+hl[v18&255]+hl[v17>>8]+hl[v17&255]+hl[v16>>8]+hl[v16&255]+hl[v15>>8]+hl[v15&255]+hl[v14>>8]+hl[v14&255]+hl[v13>>8]+hl[v13&255]+hl[v12>>8]+hl[v12&255]+hl[v11>>8]+hl[v11&255]+hl[v10>>8]+hl[v10&255]+hl[v9>>8]+hl[v9&255]+hl[v8>>8]+hl[v8&255]+hl[v7>>8]+hl[v7&255]+hl[v6>>8]+hl[v6&255]+hl[v5>>8]+hl[v5&255]+hl[v4>>8]+hl[v4&255]+hl[v3>>8]+hl[v3&255]+hl[v2>>8]+hl[v2&255]+hl[v1>>8]+hl[v1&255]+hl[v0>>8]+hl[v0&255],512);
	}

	_hash512 = _hash512_1a;

	function _hash1024_1a(str){
		var i,l=str.length-3,s=fnvConstants[1024].offset,t0=0,v0=s[63]|0,t1=0,v1=s[62]|0,t2=0,v2=s[61]|0,t3=0,v3=s[60]|0,t4=0,v4=s[59]|0,t5=0,v5=s[58]|0,t6=0,v6=s[57]|0,t7=0,v7=s[56]|0,t8=0,v8=s[55]|0,t9=0,v9=s[54]|0,t10=0,v10=s[53]|0,t11=0,v11=s[52]|0,t12=0,v12=s[51]|0,t13=0,v13=s[50]|0,t14=0,v14=s[49]|0,t15=0,v15=s[48]|0,t16=0,v16=s[47]|0,t17=0,v17=s[46]|0,t18=0,v18=s[45]|0,t19=0,v19=s[44]|0,t20=0,v20=s[43]|0,t21=0,v21=s[42]|0,t22=0,v22=s[41]|0,t23=0,v23=s[40]|0,t24=0,v24=s[39]|0,t25=0,v25=s[38]|0,t26=0,v26=s[37]|0,t27=0,v27=s[36]|0,t28=0,v28=s[35]|0,t29=0,v29=s[34]|0,t30=0,v30=s[33]|0,t31=0,v31=s[32]|0,t32=0,v32=s[31]|0,t33=0,v33=s[30]|0,t34=0,v34=s[29]|0,t35=0,v35=s[28]|0,t36=0,v36=s[27]|0,t37=0,v37=s[26]|0,t38=0,v38=s[25]|0,t39=0,v39=s[24]|0,t40=0,v40=s[23]|0,t41=0,v41=s[22]|0,t42=0,v42=s[21]|0,t43=0,v43=s[20]|0,t44=0,v44=s[19]|0,t45=0,v45=s[18]|0,t46=0,v46=s[17]|0,t47=0,v47=s[16]|0,t48=0,v48=s[15]|0,t49=0,v49=s[14]|0,t50=0,v50=s[13]|0,t51=0,v51=s[12]|0,t52=0,v52=s[11]|0,t53=0,v53=s[10]|0,t54=0,v54=s[9]|0,t55=0,v55=s[8]|0,t56=0,v56=s[7]|0,t57=0,v57=s[6]|0,t58=0,v58=s[5]|0,t59=0,v59=s[4]|0,t60=0,v60=s[3]|0,t61=0,v61=s[2]|0,t62=0,v62=s[1]|0,t63=0,v63=s[0]|0;

		for (i = 0; i < l;) {
			v0^=str.charCodeAt(i++);
			t0=v0*397;t1=v1*397;t2=v2*397;t3=v3*397;t4=v4*397;t5=v5*397;t6=v6*397;t7=v7*397;t8=v8*397;t9=v9*397;t10=v10*397;t11=v11*397;t12=v12*397;t13=v13*397;t14=v14*397;t15=v15*397;t16=v16*397;t17=v17*397;t18=v18*397;t19=v19*397;t20=v20*397;t21=v21*397;t22=v22*397;t23=v23*397;t24=v24*397;t25=v25*397;t26=v26*397;t27=v27*397;t28=v28*397;t29=v29*397;t30=v30*397;t31=v31*397;t32=v32*397;t33=v33*397;t34=v34*397;t35=v35*397;t36=v36*397;t37=v37*397;t38=v38*397;t39=v39*397;t40=v40*397;t41=v41*397;t42=v42*397;t43=v43*397;t44=v44*397;t45=v45*397;t46=v46*397;t47=v47*397;t48=v48*397;t49=v49*397;t50=v50*397;t51=v51*397;t52=v52*397;t53=v53*397;t54=v54*397;t55=v55*397;t56=v56*397;t57=v57*397;t58=v58*397;t59=v59*397;t60=v60*397;t61=v61*397;t62=v62*397;t63=v63*397;
			t42+=v0<<8;t43+=v1<<8;t44+=v2<<8;t45+=v3<<8;t46+=v4<<8;t47+=v5<<8;t48+=v6<<8;t49+=v7<<8;t50+=v8<<8;t51+=v9<<8;t52+=v10<<8;t53+=v11<<8;t54+=v12<<8;t55+=v13<<8;t56+=v14<<8;t57+=v15<<8;t58+=v16<<8;t59+=v17<<8;t60+=v18<<8;t61+=v19<<8;t62+=v20<<8;t63+=v21<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;t31+=t30>>>16;v30=t30&65535;t32+=t31>>>16;v31=t31&65535;t33+=t32>>>16;v32=t32&65535;t34+=t33>>>16;v33=t33&65535;t35+=t34>>>16;v34=t34&65535;t36+=t35>>>16;v35=t35&65535;t37+=t36>>>16;v36=t36&65535;t38+=t37>>>16;v37=t37&65535;t39+=t38>>>16;v38=t38&65535;t40+=t39>>>16;v39=t39&65535;t41+=t40>>>16;v40=t40&65535;t42+=t41>>>16;v41=t41&65535;t43+=t42>>>16;v42=t42&65535;t44+=t43>>>16;v43=t43&65535;t45+=t44>>>16;v44=t44&65535;t46+=t45>>>16;v45=t45&65535;t47+=t46>>>16;v46=t46&65535;t48+=t47>>>16;v47=t47&65535;t49+=t48>>>16;v48=t48&65535;t50+=t49>>>16;v49=t49&65535;t51+=t50>>>16;v50=t50&65535;t52+=t51>>>16;v51=t51&65535;t53+=t52>>>16;v52=t52&65535;t54+=t53>>>16;v53=t53&65535;t55+=t54>>>16;v54=t54&65535;t56+=t55>>>16;v55=t55&65535;t57+=t56>>>16;v56=t56&65535;t58+=t57>>>16;v57=t57&65535;t59+=t58>>>16;v58=t58&65535;t60+=t59>>>16;v59=t59&65535;t61+=t60>>>16;v60=t60&65535;t62+=t61>>>16;v61=t61&65535;v63=(t63+(t62>>>16))&65535;v62=t62&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*397;t1=v1*397;t2=v2*397;t3=v3*397;t4=v4*397;t5=v5*397;t6=v6*397;t7=v7*397;t8=v8*397;t9=v9*397;t10=v10*397;t11=v11*397;t12=v12*397;t13=v13*397;t14=v14*397;t15=v15*397;t16=v16*397;t17=v17*397;t18=v18*397;t19=v19*397;t20=v20*397;t21=v21*397;t22=v22*397;t23=v23*397;t24=v24*397;t25=v25*397;t26=v26*397;t27=v27*397;t28=v28*397;t29=v29*397;t30=v30*397;t31=v31*397;t32=v32*397;t33=v33*397;t34=v34*397;t35=v35*397;t36=v36*397;t37=v37*397;t38=v38*397;t39=v39*397;t40=v40*397;t41=v41*397;t42=v42*397;t43=v43*397;t44=v44*397;t45=v45*397;t46=v46*397;t47=v47*397;t48=v48*397;t49=v49*397;t50=v50*397;t51=v51*397;t52=v52*397;t53=v53*397;t54=v54*397;t55=v55*397;t56=v56*397;t57=v57*397;t58=v58*397;t59=v59*397;t60=v60*397;t61=v61*397;t62=v62*397;t63=v63*397;
			t42+=v0<<8;t43+=v1<<8;t44+=v2<<8;t45+=v3<<8;t46+=v4<<8;t47+=v5<<8;t48+=v6<<8;t49+=v7<<8;t50+=v8<<8;t51+=v9<<8;t52+=v10<<8;t53+=v11<<8;t54+=v12<<8;t55+=v13<<8;t56+=v14<<8;t57+=v15<<8;t58+=v16<<8;t59+=v17<<8;t60+=v18<<8;t61+=v19<<8;t62+=v20<<8;t63+=v21<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;t31+=t30>>>16;v30=t30&65535;t32+=t31>>>16;v31=t31&65535;t33+=t32>>>16;v32=t32&65535;t34+=t33>>>16;v33=t33&65535;t35+=t34>>>16;v34=t34&65535;t36+=t35>>>16;v35=t35&65535;t37+=t36>>>16;v36=t36&65535;t38+=t37>>>16;v37=t37&65535;t39+=t38>>>16;v38=t38&65535;t40+=t39>>>16;v39=t39&65535;t41+=t40>>>16;v40=t40&65535;t42+=t41>>>16;v41=t41&65535;t43+=t42>>>16;v42=t42&65535;t44+=t43>>>16;v43=t43&65535;t45+=t44>>>16;v44=t44&65535;t46+=t45>>>16;v45=t45&65535;t47+=t46>>>16;v46=t46&65535;t48+=t47>>>16;v47=t47&65535;t49+=t48>>>16;v48=t48&65535;t50+=t49>>>16;v49=t49&65535;t51+=t50>>>16;v50=t50&65535;t52+=t51>>>16;v51=t51&65535;t53+=t52>>>16;v52=t52&65535;t54+=t53>>>16;v53=t53&65535;t55+=t54>>>16;v54=t54&65535;t56+=t55>>>16;v55=t55&65535;t57+=t56>>>16;v56=t56&65535;t58+=t57>>>16;v57=t57&65535;t59+=t58>>>16;v58=t58&65535;t60+=t59>>>16;v59=t59&65535;t61+=t60>>>16;v60=t60&65535;t62+=t61>>>16;v61=t61&65535;v63=(t63+(t62>>>16))&65535;v62=t62&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*397;t1=v1*397;t2=v2*397;t3=v3*397;t4=v4*397;t5=v5*397;t6=v6*397;t7=v7*397;t8=v8*397;t9=v9*397;t10=v10*397;t11=v11*397;t12=v12*397;t13=v13*397;t14=v14*397;t15=v15*397;t16=v16*397;t17=v17*397;t18=v18*397;t19=v19*397;t20=v20*397;t21=v21*397;t22=v22*397;t23=v23*397;t24=v24*397;t25=v25*397;t26=v26*397;t27=v27*397;t28=v28*397;t29=v29*397;t30=v30*397;t31=v31*397;t32=v32*397;t33=v33*397;t34=v34*397;t35=v35*397;t36=v36*397;t37=v37*397;t38=v38*397;t39=v39*397;t40=v40*397;t41=v41*397;t42=v42*397;t43=v43*397;t44=v44*397;t45=v45*397;t46=v46*397;t47=v47*397;t48=v48*397;t49=v49*397;t50=v50*397;t51=v51*397;t52=v52*397;t53=v53*397;t54=v54*397;t55=v55*397;t56=v56*397;t57=v57*397;t58=v58*397;t59=v59*397;t60=v60*397;t61=v61*397;t62=v62*397;t63=v63*397;
			t42+=v0<<8;t43+=v1<<8;t44+=v2<<8;t45+=v3<<8;t46+=v4<<8;t47+=v5<<8;t48+=v6<<8;t49+=v7<<8;t50+=v8<<8;t51+=v9<<8;t52+=v10<<8;t53+=v11<<8;t54+=v12<<8;t55+=v13<<8;t56+=v14<<8;t57+=v15<<8;t58+=v16<<8;t59+=v17<<8;t60+=v18<<8;t61+=v19<<8;t62+=v20<<8;t63+=v21<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;t31+=t30>>>16;v30=t30&65535;t32+=t31>>>16;v31=t31&65535;t33+=t32>>>16;v32=t32&65535;t34+=t33>>>16;v33=t33&65535;t35+=t34>>>16;v34=t34&65535;t36+=t35>>>16;v35=t35&65535;t37+=t36>>>16;v36=t36&65535;t38+=t37>>>16;v37=t37&65535;t39+=t38>>>16;v38=t38&65535;t40+=t39>>>16;v39=t39&65535;t41+=t40>>>16;v40=t40&65535;t42+=t41>>>16;v41=t41&65535;t43+=t42>>>16;v42=t42&65535;t44+=t43>>>16;v43=t43&65535;t45+=t44>>>16;v44=t44&65535;t46+=t45>>>16;v45=t45&65535;t47+=t46>>>16;v46=t46&65535;t48+=t47>>>16;v47=t47&65535;t49+=t48>>>16;v48=t48&65535;t50+=t49>>>16;v49=t49&65535;t51+=t50>>>16;v50=t50&65535;t52+=t51>>>16;v51=t51&65535;t53+=t52>>>16;v52=t52&65535;t54+=t53>>>16;v53=t53&65535;t55+=t54>>>16;v54=t54&65535;t56+=t55>>>16;v55=t55&65535;t57+=t56>>>16;v56=t56&65535;t58+=t57>>>16;v57=t57&65535;t59+=t58>>>16;v58=t58&65535;t60+=t59>>>16;v59=t59&65535;t61+=t60>>>16;v60=t60&65535;t62+=t61>>>16;v61=t61&65535;v63=(t63+(t62>>>16))&65535;v62=t62&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*397;t1=v1*397;t2=v2*397;t3=v3*397;t4=v4*397;t5=v5*397;t6=v6*397;t7=v7*397;t8=v8*397;t9=v9*397;t10=v10*397;t11=v11*397;t12=v12*397;t13=v13*397;t14=v14*397;t15=v15*397;t16=v16*397;t17=v17*397;t18=v18*397;t19=v19*397;t20=v20*397;t21=v21*397;t22=v22*397;t23=v23*397;t24=v24*397;t25=v25*397;t26=v26*397;t27=v27*397;t28=v28*397;t29=v29*397;t30=v30*397;t31=v31*397;t32=v32*397;t33=v33*397;t34=v34*397;t35=v35*397;t36=v36*397;t37=v37*397;t38=v38*397;t39=v39*397;t40=v40*397;t41=v41*397;t42=v42*397;t43=v43*397;t44=v44*397;t45=v45*397;t46=v46*397;t47=v47*397;t48=v48*397;t49=v49*397;t50=v50*397;t51=v51*397;t52=v52*397;t53=v53*397;t54=v54*397;t55=v55*397;t56=v56*397;t57=v57*397;t58=v58*397;t59=v59*397;t60=v60*397;t61=v61*397;t62=v62*397;t63=v63*397;
			t42+=v0<<8;t43+=v1<<8;t44+=v2<<8;t45+=v3<<8;t46+=v4<<8;t47+=v5<<8;t48+=v6<<8;t49+=v7<<8;t50+=v8<<8;t51+=v9<<8;t52+=v10<<8;t53+=v11<<8;t54+=v12<<8;t55+=v13<<8;t56+=v14<<8;t57+=v15<<8;t58+=v16<<8;t59+=v17<<8;t60+=v18<<8;t61+=v19<<8;t62+=v20<<8;t63+=v21<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;t31+=t30>>>16;v30=t30&65535;t32+=t31>>>16;v31=t31&65535;t33+=t32>>>16;v32=t32&65535;t34+=t33>>>16;v33=t33&65535;t35+=t34>>>16;v34=t34&65535;t36+=t35>>>16;v35=t35&65535;t37+=t36>>>16;v36=t36&65535;t38+=t37>>>16;v37=t37&65535;t39+=t38>>>16;v38=t38&65535;t40+=t39>>>16;v39=t39&65535;t41+=t40>>>16;v40=t40&65535;t42+=t41>>>16;v41=t41&65535;t43+=t42>>>16;v42=t42&65535;t44+=t43>>>16;v43=t43&65535;t45+=t44>>>16;v44=t44&65535;t46+=t45>>>16;v45=t45&65535;t47+=t46>>>16;v46=t46&65535;t48+=t47>>>16;v47=t47&65535;t49+=t48>>>16;v48=t48&65535;t50+=t49>>>16;v49=t49&65535;t51+=t50>>>16;v50=t50&65535;t52+=t51>>>16;v51=t51&65535;t53+=t52>>>16;v52=t52&65535;t54+=t53>>>16;v53=t53&65535;t55+=t54>>>16;v54=t54&65535;t56+=t55>>>16;v55=t55&65535;t57+=t56>>>16;v56=t56&65535;t58+=t57>>>16;v57=t57&65535;t59+=t58>>>16;v58=t58&65535;t60+=t59>>>16;v59=t59&65535;t61+=t60>>>16;v60=t60&65535;t62+=t61>>>16;v61=t61&65535;v63=(t63+(t62>>>16))&65535;v62=t62&65535;
		}

		while(i<l+3){
			v0^=str.charCodeAt(i++);
			t0=v0*397;t1=v1*397;t2=v2*397;t3=v3*397;t4=v4*397;t5=v5*397;t6=v6*397;t7=v7*397;t8=v8*397;t9=v9*397;t10=v10*397;t11=v11*397;t12=v12*397;t13=v13*397;t14=v14*397;t15=v15*397;t16=v16*397;t17=v17*397;t18=v18*397;t19=v19*397;t20=v20*397;t21=v21*397;t22=v22*397;t23=v23*397;t24=v24*397;t25=v25*397;t26=v26*397;t27=v27*397;t28=v28*397;t29=v29*397;t30=v30*397;t31=v31*397;t32=v32*397;t33=v33*397;t34=v34*397;t35=v35*397;t36=v36*397;t37=v37*397;t38=v38*397;t39=v39*397;t40=v40*397;t41=v41*397;t42=v42*397;t43=v43*397;t44=v44*397;t45=v45*397;t46=v46*397;t47=v47*397;t48=v48*397;t49=v49*397;t50=v50*397;t51=v51*397;t52=v52*397;t53=v53*397;t54=v54*397;t55=v55*397;t56=v56*397;t57=v57*397;t58=v58*397;t59=v59*397;t60=v60*397;t61=v61*397;t62=v62*397;t63=v63*397;
			t42+=v0<<8;t43+=v1<<8;t44+=v2<<8;t45+=v3<<8;t46+=v4<<8;t47+=v5<<8;t48+=v6<<8;t49+=v7<<8;t50+=v8<<8;t51+=v9<<8;t52+=v10<<8;t53+=v11<<8;t54+=v12<<8;t55+=v13<<8;t56+=v14<<8;t57+=v15<<8;t58+=v16<<8;t59+=v17<<8;t60+=v18<<8;t61+=v19<<8;t62+=v20<<8;t63+=v21<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;t31+=t30>>>16;v30=t30&65535;t32+=t31>>>16;v31=t31&65535;t33+=t32>>>16;v32=t32&65535;t34+=t33>>>16;v33=t33&65535;t35+=t34>>>16;v34=t34&65535;t36+=t35>>>16;v35=t35&65535;t37+=t36>>>16;v36=t36&65535;t38+=t37>>>16;v37=t37&65535;t39+=t38>>>16;v38=t38&65535;t40+=t39>>>16;v39=t39&65535;t41+=t40>>>16;v40=t40&65535;t42+=t41>>>16;v41=t41&65535;t43+=t42>>>16;v42=t42&65535;t44+=t43>>>16;v43=t43&65535;t45+=t44>>>16;v44=t44&65535;t46+=t45>>>16;v45=t45&65535;t47+=t46>>>16;v46=t46&65535;t48+=t47>>>16;v47=t47&65535;t49+=t48>>>16;v48=t48&65535;t50+=t49>>>16;v49=t49&65535;t51+=t50>>>16;v50=t50&65535;t52+=t51>>>16;v51=t51&65535;t53+=t52>>>16;v52=t52&65535;t54+=t53>>>16;v53=t53&65535;t55+=t54>>>16;v54=t54&65535;t56+=t55>>>16;v55=t55&65535;t57+=t56>>>16;v56=t56&65535;t58+=t57>>>16;v57=t57&65535;t59+=t58>>>16;v58=t58&65535;t60+=t59>>>16;v59=t59&65535;t61+=t60>>>16;v60=t60&65535;t62+=t61>>>16;v61=t61&65535;v63=(t63+(t62>>>16))&65535;v62=t62&65535;
		}

		return hashValHex(hl[v63>>8]+hl[v63&255]+hl[v62>>8]+hl[v62&255]+hl[v61>>8]+hl[v61&255]+hl[v60>>8]+hl[v60&255]+hl[v59>>8]+hl[v59&255]+hl[v58>>8]+hl[v58&255]+hl[v57>>8]+hl[v57&255]+hl[v56>>8]+hl[v56&255]+hl[v55>>8]+hl[v55&255]+hl[v54>>8]+hl[v54&255]+hl[v53>>8]+hl[v53&255]+hl[v52>>8]+hl[v52&255]+hl[v51>>8]+hl[v51&255]+hl[v50>>8]+hl[v50&255]+hl[v49>>8]+hl[v49&255]+hl[v48>>8]+hl[v48&255]+hl[v47>>8]+hl[v47&255]+hl[v46>>8]+hl[v46&255]+hl[v45>>8]+hl[v45&255]+hl[v44>>8]+hl[v44&255]+hl[v43>>8]+hl[v43&255]+hl[v42>>8]+hl[v42&255]+hl[v41>>8]+hl[v41&255]+hl[v40>>8]+hl[v40&255]+hl[v39>>8]+hl[v39&255]+hl[v38>>8]+hl[v38&255]+hl[v37>>8]+hl[v37&255]+hl[v36>>8]+hl[v36&255]+hl[v35>>8]+hl[v35&255]+hl[v34>>8]+hl[v34&255]+hl[v33>>8]+hl[v33&255]+hl[v32>>8]+hl[v32&255]+hl[v31>>8]+hl[v31&255]+hl[v30>>8]+hl[v30&255]+hl[v29>>8]+hl[v29&255]+hl[v28>>8]+hl[v28&255]+hl[v27>>8]+hl[v27&255]+hl[v26>>8]+hl[v26&255]+hl[v25>>8]+hl[v25&255]+hl[v24>>8]+hl[v24&255]+hl[v23>>8]+hl[v23&255]+hl[v22>>8]+hl[v22&255]+hl[v21>>8]+hl[v21&255]+hl[v20>>8]+hl[v20&255]+hl[v19>>8]+hl[v19&255]+hl[v18>>8]+hl[v18&255]+hl[v17>>8]+hl[v17&255]+hl[v16>>8]+hl[v16&255]+hl[v15>>8]+hl[v15&255]+hl[v14>>8]+hl[v14&255]+hl[v13>>8]+hl[v13&255]+hl[v12>>8]+hl[v12&255]+hl[v11>>8]+hl[v11&255]+hl[v10>>8]+hl[v10&255]+hl[v9>>8]+hl[v9&255]+hl[v8>>8]+hl[v8&255]+hl[v7>>8]+hl[v7&255]+hl[v6>>8]+hl[v6&255]+hl[v5>>8]+hl[v5&255]+hl[v4>>8]+hl[v4&255]+hl[v3>>8]+hl[v3&255]+hl[v2>>8]+hl[v2&255]+hl[v1>>8]+hl[v1&255]+hl[v0>>8]+hl[v0&255],1024);
	}

	function _hash1024_1(str){
		var i,l=str.length-3,s=fnvConstants[1024].offset,t0=0,v0=s[63]|0,t1=0,v1=s[62]|0,t2=0,v2=s[61]|0,t3=0,v3=s[60]|0,t4=0,v4=s[59]|0,t5=0,v5=s[58]|0,t6=0,v6=s[57]|0,t7=0,v7=s[56]|0,t8=0,v8=s[55]|0,t9=0,v9=s[54]|0,t10=0,v10=s[53]|0,t11=0,v11=s[52]|0,t12=0,v12=s[51]|0,t13=0,v13=s[50]|0,t14=0,v14=s[49]|0,t15=0,v15=s[48]|0,t16=0,v16=s[47]|0,t17=0,v17=s[46]|0,t18=0,v18=s[45]|0,t19=0,v19=s[44]|0,t20=0,v20=s[43]|0,t21=0,v21=s[42]|0,t22=0,v22=s[41]|0,t23=0,v23=s[40]|0,t24=0,v24=s[39]|0,t25=0,v25=s[38]|0,t26=0,v26=s[37]|0,t27=0,v27=s[36]|0,t28=0,v28=s[35]|0,t29=0,v29=s[34]|0,t30=0,v30=s[33]|0,t31=0,v31=s[32]|0,t32=0,v32=s[31]|0,t33=0,v33=s[30]|0,t34=0,v34=s[29]|0,t35=0,v35=s[28]|0,t36=0,v36=s[27]|0,t37=0,v37=s[26]|0,t38=0,v38=s[25]|0,t39=0,v39=s[24]|0,t40=0,v40=s[23]|0,t41=0,v41=s[22]|0,t42=0,v42=s[21]|0,t43=0,v43=s[20]|0,t44=0,v44=s[19]|0,t45=0,v45=s[18]|0,t46=0,v46=s[17]|0,t47=0,v47=s[16]|0,t48=0,v48=s[15]|0,t49=0,v49=s[14]|0,t50=0,v50=s[13]|0,t51=0,v51=s[12]|0,t52=0,v52=s[11]|0,t53=0,v53=s[10]|0,t54=0,v54=s[9]|0,t55=0,v55=s[8]|0,t56=0,v56=s[7]|0,t57=0,v57=s[6]|0,t58=0,v58=s[5]|0,t59=0,v59=s[4]|0,t60=0,v60=s[3]|0,t61=0,v61=s[2]|0,t62=0,v62=s[1]|0,t63=0,v63=s[0]|0;

		for (i = 0; i < l;) {
			t0=v0*397;t1=v1*397;t2=v2*397;t3=v3*397;t4=v4*397;t5=v5*397;t6=v6*397;t7=v7*397;t8=v8*397;t9=v9*397;t10=v10*397;t11=v11*397;t12=v12*397;t13=v13*397;t14=v14*397;t15=v15*397;t16=v16*397;t17=v17*397;t18=v18*397;t19=v19*397;t20=v20*397;t21=v21*397;t22=v22*397;t23=v23*397;t24=v24*397;t25=v25*397;t26=v26*397;t27=v27*397;t28=v28*397;t29=v29*397;t30=v30*397;t31=v31*397;t32=v32*397;t33=v33*397;t34=v34*397;t35=v35*397;t36=v36*397;t37=v37*397;t38=v38*397;t39=v39*397;t40=v40*397;t41=v41*397;t42=v42*397;t43=v43*397;t44=v44*397;t45=v45*397;t46=v46*397;t47=v47*397;t48=v48*397;t49=v49*397;t50=v50*397;t51=v51*397;t52=v52*397;t53=v53*397;t54=v54*397;t55=v55*397;t56=v56*397;t57=v57*397;t58=v58*397;t59=v59*397;t60=v60*397;t61=v61*397;t62=v62*397;t63=v63*397;
			t42+=v0<<8;t43+=v1<<8;t44+=v2<<8;t45+=v3<<8;t46+=v4<<8;t47+=v5<<8;t48+=v6<<8;t49+=v7<<8;t50+=v8<<8;t51+=v9<<8;t52+=v10<<8;t53+=v11<<8;t54+=v12<<8;t55+=v13<<8;t56+=v14<<8;t57+=v15<<8;t58+=v16<<8;t59+=v17<<8;t60+=v18<<8;t61+=v19<<8;t62+=v20<<8;t63+=v21<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;t31+=t30>>>16;v30=t30&65535;t32+=t31>>>16;v31=t31&65535;t33+=t32>>>16;v32=t32&65535;t34+=t33>>>16;v33=t33&65535;t35+=t34>>>16;v34=t34&65535;t36+=t35>>>16;v35=t35&65535;t37+=t36>>>16;v36=t36&65535;t38+=t37>>>16;v37=t37&65535;t39+=t38>>>16;v38=t38&65535;t40+=t39>>>16;v39=t39&65535;t41+=t40>>>16;v40=t40&65535;t42+=t41>>>16;v41=t41&65535;t43+=t42>>>16;v42=t42&65535;t44+=t43>>>16;v43=t43&65535;t45+=t44>>>16;v44=t44&65535;t46+=t45>>>16;v45=t45&65535;t47+=t46>>>16;v46=t46&65535;t48+=t47>>>16;v47=t47&65535;t49+=t48>>>16;v48=t48&65535;t50+=t49>>>16;v49=t49&65535;t51+=t50>>>16;v50=t50&65535;t52+=t51>>>16;v51=t51&65535;t53+=t52>>>16;v52=t52&65535;t54+=t53>>>16;v53=t53&65535;t55+=t54>>>16;v54=t54&65535;t56+=t55>>>16;v55=t55&65535;t57+=t56>>>16;v56=t56&65535;t58+=t57>>>16;v57=t57&65535;t59+=t58>>>16;v58=t58&65535;t60+=t59>>>16;v59=t59&65535;t61+=t60>>>16;v60=t60&65535;t62+=t61>>>16;v61=t61&65535;v63=(t63+(t62>>>16))&65535;v62=t62&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*397;t1=v1*397;t2=v2*397;t3=v3*397;t4=v4*397;t5=v5*397;t6=v6*397;t7=v7*397;t8=v8*397;t9=v9*397;t10=v10*397;t11=v11*397;t12=v12*397;t13=v13*397;t14=v14*397;t15=v15*397;t16=v16*397;t17=v17*397;t18=v18*397;t19=v19*397;t20=v20*397;t21=v21*397;t22=v22*397;t23=v23*397;t24=v24*397;t25=v25*397;t26=v26*397;t27=v27*397;t28=v28*397;t29=v29*397;t30=v30*397;t31=v31*397;t32=v32*397;t33=v33*397;t34=v34*397;t35=v35*397;t36=v36*397;t37=v37*397;t38=v38*397;t39=v39*397;t40=v40*397;t41=v41*397;t42=v42*397;t43=v43*397;t44=v44*397;t45=v45*397;t46=v46*397;t47=v47*397;t48=v48*397;t49=v49*397;t50=v50*397;t51=v51*397;t52=v52*397;t53=v53*397;t54=v54*397;t55=v55*397;t56=v56*397;t57=v57*397;t58=v58*397;t59=v59*397;t60=v60*397;t61=v61*397;t62=v62*397;t63=v63*397;
			t42+=v0<<8;t43+=v1<<8;t44+=v2<<8;t45+=v3<<8;t46+=v4<<8;t47+=v5<<8;t48+=v6<<8;t49+=v7<<8;t50+=v8<<8;t51+=v9<<8;t52+=v10<<8;t53+=v11<<8;t54+=v12<<8;t55+=v13<<8;t56+=v14<<8;t57+=v15<<8;t58+=v16<<8;t59+=v17<<8;t60+=v18<<8;t61+=v19<<8;t62+=v20<<8;t63+=v21<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;t31+=t30>>>16;v30=t30&65535;t32+=t31>>>16;v31=t31&65535;t33+=t32>>>16;v32=t32&65535;t34+=t33>>>16;v33=t33&65535;t35+=t34>>>16;v34=t34&65535;t36+=t35>>>16;v35=t35&65535;t37+=t36>>>16;v36=t36&65535;t38+=t37>>>16;v37=t37&65535;t39+=t38>>>16;v38=t38&65535;t40+=t39>>>16;v39=t39&65535;t41+=t40>>>16;v40=t40&65535;t42+=t41>>>16;v41=t41&65535;t43+=t42>>>16;v42=t42&65535;t44+=t43>>>16;v43=t43&65535;t45+=t44>>>16;v44=t44&65535;t46+=t45>>>16;v45=t45&65535;t47+=t46>>>16;v46=t46&65535;t48+=t47>>>16;v47=t47&65535;t49+=t48>>>16;v48=t48&65535;t50+=t49>>>16;v49=t49&65535;t51+=t50>>>16;v50=t50&65535;t52+=t51>>>16;v51=t51&65535;t53+=t52>>>16;v52=t52&65535;t54+=t53>>>16;v53=t53&65535;t55+=t54>>>16;v54=t54&65535;t56+=t55>>>16;v55=t55&65535;t57+=t56>>>16;v56=t56&65535;t58+=t57>>>16;v57=t57&65535;t59+=t58>>>16;v58=t58&65535;t60+=t59>>>16;v59=t59&65535;t61+=t60>>>16;v60=t60&65535;t62+=t61>>>16;v61=t61&65535;v63=(t63+(t62>>>16))&65535;v62=t62&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*397;t1=v1*397;t2=v2*397;t3=v3*397;t4=v4*397;t5=v5*397;t6=v6*397;t7=v7*397;t8=v8*397;t9=v9*397;t10=v10*397;t11=v11*397;t12=v12*397;t13=v13*397;t14=v14*397;t15=v15*397;t16=v16*397;t17=v17*397;t18=v18*397;t19=v19*397;t20=v20*397;t21=v21*397;t22=v22*397;t23=v23*397;t24=v24*397;t25=v25*397;t26=v26*397;t27=v27*397;t28=v28*397;t29=v29*397;t30=v30*397;t31=v31*397;t32=v32*397;t33=v33*397;t34=v34*397;t35=v35*397;t36=v36*397;t37=v37*397;t38=v38*397;t39=v39*397;t40=v40*397;t41=v41*397;t42=v42*397;t43=v43*397;t44=v44*397;t45=v45*397;t46=v46*397;t47=v47*397;t48=v48*397;t49=v49*397;t50=v50*397;t51=v51*397;t52=v52*397;t53=v53*397;t54=v54*397;t55=v55*397;t56=v56*397;t57=v57*397;t58=v58*397;t59=v59*397;t60=v60*397;t61=v61*397;t62=v62*397;t63=v63*397;
			t42+=v0<<8;t43+=v1<<8;t44+=v2<<8;t45+=v3<<8;t46+=v4<<8;t47+=v5<<8;t48+=v6<<8;t49+=v7<<8;t50+=v8<<8;t51+=v9<<8;t52+=v10<<8;t53+=v11<<8;t54+=v12<<8;t55+=v13<<8;t56+=v14<<8;t57+=v15<<8;t58+=v16<<8;t59+=v17<<8;t60+=v18<<8;t61+=v19<<8;t62+=v20<<8;t63+=v21<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;t31+=t30>>>16;v30=t30&65535;t32+=t31>>>16;v31=t31&65535;t33+=t32>>>16;v32=t32&65535;t34+=t33>>>16;v33=t33&65535;t35+=t34>>>16;v34=t34&65535;t36+=t35>>>16;v35=t35&65535;t37+=t36>>>16;v36=t36&65535;t38+=t37>>>16;v37=t37&65535;t39+=t38>>>16;v38=t38&65535;t40+=t39>>>16;v39=t39&65535;t41+=t40>>>16;v40=t40&65535;t42+=t41>>>16;v41=t41&65535;t43+=t42>>>16;v42=t42&65535;t44+=t43>>>16;v43=t43&65535;t45+=t44>>>16;v44=t44&65535;t46+=t45>>>16;v45=t45&65535;t47+=t46>>>16;v46=t46&65535;t48+=t47>>>16;v47=t47&65535;t49+=t48>>>16;v48=t48&65535;t50+=t49>>>16;v49=t49&65535;t51+=t50>>>16;v50=t50&65535;t52+=t51>>>16;v51=t51&65535;t53+=t52>>>16;v52=t52&65535;t54+=t53>>>16;v53=t53&65535;t55+=t54>>>16;v54=t54&65535;t56+=t55>>>16;v55=t55&65535;t57+=t56>>>16;v56=t56&65535;t58+=t57>>>16;v57=t57&65535;t59+=t58>>>16;v58=t58&65535;t60+=t59>>>16;v59=t59&65535;t61+=t60>>>16;v60=t60&65535;t62+=t61>>>16;v61=t61&65535;v63=(t63+(t62>>>16))&65535;v62=t62&65535;
			v0^=str.charCodeAt(i++);
			t0=v0*397;t1=v1*397;t2=v2*397;t3=v3*397;t4=v4*397;t5=v5*397;t6=v6*397;t7=v7*397;t8=v8*397;t9=v9*397;t10=v10*397;t11=v11*397;t12=v12*397;t13=v13*397;t14=v14*397;t15=v15*397;t16=v16*397;t17=v17*397;t18=v18*397;t19=v19*397;t20=v20*397;t21=v21*397;t22=v22*397;t23=v23*397;t24=v24*397;t25=v25*397;t26=v26*397;t27=v27*397;t28=v28*397;t29=v29*397;t30=v30*397;t31=v31*397;t32=v32*397;t33=v33*397;t34=v34*397;t35=v35*397;t36=v36*397;t37=v37*397;t38=v38*397;t39=v39*397;t40=v40*397;t41=v41*397;t42=v42*397;t43=v43*397;t44=v44*397;t45=v45*397;t46=v46*397;t47=v47*397;t48=v48*397;t49=v49*397;t50=v50*397;t51=v51*397;t52=v52*397;t53=v53*397;t54=v54*397;t55=v55*397;t56=v56*397;t57=v57*397;t58=v58*397;t59=v59*397;t60=v60*397;t61=v61*397;t62=v62*397;t63=v63*397;
			t42+=v0<<8;t43+=v1<<8;t44+=v2<<8;t45+=v3<<8;t46+=v4<<8;t47+=v5<<8;t48+=v6<<8;t49+=v7<<8;t50+=v8<<8;t51+=v9<<8;t52+=v10<<8;t53+=v11<<8;t54+=v12<<8;t55+=v13<<8;t56+=v14<<8;t57+=v15<<8;t58+=v16<<8;t59+=v17<<8;t60+=v18<<8;t61+=v19<<8;t62+=v20<<8;t63+=v21<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;t31+=t30>>>16;v30=t30&65535;t32+=t31>>>16;v31=t31&65535;t33+=t32>>>16;v32=t32&65535;t34+=t33>>>16;v33=t33&65535;t35+=t34>>>16;v34=t34&65535;t36+=t35>>>16;v35=t35&65535;t37+=t36>>>16;v36=t36&65535;t38+=t37>>>16;v37=t37&65535;t39+=t38>>>16;v38=t38&65535;t40+=t39>>>16;v39=t39&65535;t41+=t40>>>16;v40=t40&65535;t42+=t41>>>16;v41=t41&65535;t43+=t42>>>16;v42=t42&65535;t44+=t43>>>16;v43=t43&65535;t45+=t44>>>16;v44=t44&65535;t46+=t45>>>16;v45=t45&65535;t47+=t46>>>16;v46=t46&65535;t48+=t47>>>16;v47=t47&65535;t49+=t48>>>16;v48=t48&65535;t50+=t49>>>16;v49=t49&65535;t51+=t50>>>16;v50=t50&65535;t52+=t51>>>16;v51=t51&65535;t53+=t52>>>16;v52=t52&65535;t54+=t53>>>16;v53=t53&65535;t55+=t54>>>16;v54=t54&65535;t56+=t55>>>16;v55=t55&65535;t57+=t56>>>16;v56=t56&65535;t58+=t57>>>16;v57=t57&65535;t59+=t58>>>16;v58=t58&65535;t60+=t59>>>16;v59=t59&65535;t61+=t60>>>16;v60=t60&65535;t62+=t61>>>16;v61=t61&65535;v63=(t63+(t62>>>16))&65535;v62=t62&65535;
			v0^=str.charCodeAt(i++);
		}

		while(i<l+3){
			t0=v0*397;t1=v1*397;t2=v2*397;t3=v3*397;t4=v4*397;t5=v5*397;t6=v6*397;t7=v7*397;t8=v8*397;t9=v9*397;t10=v10*397;t11=v11*397;t12=v12*397;t13=v13*397;t14=v14*397;t15=v15*397;t16=v16*397;t17=v17*397;t18=v18*397;t19=v19*397;t20=v20*397;t21=v21*397;t22=v22*397;t23=v23*397;t24=v24*397;t25=v25*397;t26=v26*397;t27=v27*397;t28=v28*397;t29=v29*397;t30=v30*397;t31=v31*397;t32=v32*397;t33=v33*397;t34=v34*397;t35=v35*397;t36=v36*397;t37=v37*397;t38=v38*397;t39=v39*397;t40=v40*397;t41=v41*397;t42=v42*397;t43=v43*397;t44=v44*397;t45=v45*397;t46=v46*397;t47=v47*397;t48=v48*397;t49=v49*397;t50=v50*397;t51=v51*397;t52=v52*397;t53=v53*397;t54=v54*397;t55=v55*397;t56=v56*397;t57=v57*397;t58=v58*397;t59=v59*397;t60=v60*397;t61=v61*397;t62=v62*397;t63=v63*397;
			t42+=v0<<8;t43+=v1<<8;t44+=v2<<8;t45+=v3<<8;t46+=v4<<8;t47+=v5<<8;t48+=v6<<8;t49+=v7<<8;t50+=v8<<8;t51+=v9<<8;t52+=v10<<8;t53+=v11<<8;t54+=v12<<8;t55+=v13<<8;t56+=v14<<8;t57+=v15<<8;t58+=v16<<8;t59+=v17<<8;t60+=v18<<8;t61+=v19<<8;t62+=v20<<8;t63+=v21<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;t31+=t30>>>16;v30=t30&65535;t32+=t31>>>16;v31=t31&65535;t33+=t32>>>16;v32=t32&65535;t34+=t33>>>16;v33=t33&65535;t35+=t34>>>16;v34=t34&65535;t36+=t35>>>16;v35=t35&65535;t37+=t36>>>16;v36=t36&65535;t38+=t37>>>16;v37=t37&65535;t39+=t38>>>16;v38=t38&65535;t40+=t39>>>16;v39=t39&65535;t41+=t40>>>16;v40=t40&65535;t42+=t41>>>16;v41=t41&65535;t43+=t42>>>16;v42=t42&65535;t44+=t43>>>16;v43=t43&65535;t45+=t44>>>16;v44=t44&65535;t46+=t45>>>16;v45=t45&65535;t47+=t46>>>16;v46=t46&65535;t48+=t47>>>16;v47=t47&65535;t49+=t48>>>16;v48=t48&65535;t50+=t49>>>16;v49=t49&65535;t51+=t50>>>16;v50=t50&65535;t52+=t51>>>16;v51=t51&65535;t53+=t52>>>16;v52=t52&65535;t54+=t53>>>16;v53=t53&65535;t55+=t54>>>16;v54=t54&65535;t56+=t55>>>16;v55=t55&65535;t57+=t56>>>16;v56=t56&65535;t58+=t57>>>16;v57=t57&65535;t59+=t58>>>16;v58=t58&65535;t60+=t59>>>16;v59=t59&65535;t61+=t60>>>16;v60=t60&65535;t62+=t61>>>16;v61=t61&65535;v63=(t63+(t62>>>16))&65535;v62=t62&65535;
			v0^=str.charCodeAt(i++);
		}

		return hashValHex(hl[v63>>8]+hl[v63&255]+hl[v62>>8]+hl[v62&255]+hl[v61>>8]+hl[v61&255]+hl[v60>>8]+hl[v60&255]+hl[v59>>8]+hl[v59&255]+hl[v58>>8]+hl[v58&255]+hl[v57>>8]+hl[v57&255]+hl[v56>>8]+hl[v56&255]+hl[v55>>8]+hl[v55&255]+hl[v54>>8]+hl[v54&255]+hl[v53>>8]+hl[v53&255]+hl[v52>>8]+hl[v52&255]+hl[v51>>8]+hl[v51&255]+hl[v50>>8]+hl[v50&255]+hl[v49>>8]+hl[v49&255]+hl[v48>>8]+hl[v48&255]+hl[v47>>8]+hl[v47&255]+hl[v46>>8]+hl[v46&255]+hl[v45>>8]+hl[v45&255]+hl[v44>>8]+hl[v44&255]+hl[v43>>8]+hl[v43&255]+hl[v42>>8]+hl[v42&255]+hl[v41>>8]+hl[v41&255]+hl[v40>>8]+hl[v40&255]+hl[v39>>8]+hl[v39&255]+hl[v38>>8]+hl[v38&255]+hl[v37>>8]+hl[v37&255]+hl[v36>>8]+hl[v36&255]+hl[v35>>8]+hl[v35&255]+hl[v34>>8]+hl[v34&255]+hl[v33>>8]+hl[v33&255]+hl[v32>>8]+hl[v32&255]+hl[v31>>8]+hl[v31&255]+hl[v30>>8]+hl[v30&255]+hl[v29>>8]+hl[v29&255]+hl[v28>>8]+hl[v28&255]+hl[v27>>8]+hl[v27&255]+hl[v26>>8]+hl[v26&255]+hl[v25>>8]+hl[v25&255]+hl[v24>>8]+hl[v24&255]+hl[v23>>8]+hl[v23&255]+hl[v22>>8]+hl[v22&255]+hl[v21>>8]+hl[v21&255]+hl[v20>>8]+hl[v20&255]+hl[v19>>8]+hl[v19&255]+hl[v18>>8]+hl[v18&255]+hl[v17>>8]+hl[v17&255]+hl[v16>>8]+hl[v16&255]+hl[v15>>8]+hl[v15&255]+hl[v14>>8]+hl[v14&255]+hl[v13>>8]+hl[v13&255]+hl[v12>>8]+hl[v12&255]+hl[v11>>8]+hl[v11&255]+hl[v10>>8]+hl[v10&255]+hl[v9>>8]+hl[v9&255]+hl[v8>>8]+hl[v8&255]+hl[v7>>8]+hl[v7&255]+hl[v6>>8]+hl[v6&255]+hl[v5>>8]+hl[v5&255]+hl[v4>>8]+hl[v4&255]+hl[v3>>8]+hl[v3&255]+hl[v2>>8]+hl[v2&255]+hl[v1>>8]+hl[v1&255]+hl[v0>>8]+hl[v0&255],1024);
	}

	function _hash1024_1a_utf(str){
		var c,i,l=str.length,s=fnvConstants[1024].offset,t0=0,v0=s[63]|0,t1=0,v1=s[62]|0,t2=0,v2=s[61]|0,t3=0,v3=s[60]|0,t4=0,v4=s[59]|0,t5=0,v5=s[58]|0,t6=0,v6=s[57]|0,t7=0,v7=s[56]|0,t8=0,v8=s[55]|0,t9=0,v9=s[54]|0,t10=0,v10=s[53]|0,t11=0,v11=s[52]|0,t12=0,v12=s[51]|0,t13=0,v13=s[50]|0,t14=0,v14=s[49]|0,t15=0,v15=s[48]|0,t16=0,v16=s[47]|0,t17=0,v17=s[46]|0,t18=0,v18=s[45]|0,t19=0,v19=s[44]|0,t20=0,v20=s[43]|0,t21=0,v21=s[42]|0,t22=0,v22=s[41]|0,t23=0,v23=s[40]|0,t24=0,v24=s[39]|0,t25=0,v25=s[38]|0,t26=0,v26=s[37]|0,t27=0,v27=s[36]|0,t28=0,v28=s[35]|0,t29=0,v29=s[34]|0,t30=0,v30=s[33]|0,t31=0,v31=s[32]|0,t32=0,v32=s[31]|0,t33=0,v33=s[30]|0,t34=0,v34=s[29]|0,t35=0,v35=s[28]|0,t36=0,v36=s[27]|0,t37=0,v37=s[26]|0,t38=0,v38=s[25]|0,t39=0,v39=s[24]|0,t40=0,v40=s[23]|0,t41=0,v41=s[22]|0,t42=0,v42=s[21]|0,t43=0,v43=s[20]|0,t44=0,v44=s[19]|0,t45=0,v45=s[18]|0,t46=0,v46=s[17]|0,t47=0,v47=s[16]|0,t48=0,v48=s[15]|0,t49=0,v49=s[14]|0,t50=0,v50=s[13]|0,t51=0,v51=s[12]|0,t52=0,v52=s[11]|0,t53=0,v53=s[10]|0,t54=0,v54=s[9]|0,t55=0,v55=s[8]|0,t56=0,v56=s[7]|0,t57=0,v57=s[6]|0,t58=0,v58=s[5]|0,t59=0,v59=s[4]|0,t60=0,v60=s[3]|0,t61=0,v61=s[2]|0,t62=0,v62=s[1]|0,t63=0,v63=s[0]|0;

		for (i = 0; i < l; i++) {
			c = str.charCodeAt(i);
			if(c < 128){
				v0^=c;
			}else if(c < 2048){
				v0^=(c>>6)|192;
				t0=v0*397;t1=v1*397;t2=v2*397;t3=v3*397;t4=v4*397;t5=v5*397;t6=v6*397;t7=v7*397;t8=v8*397;t9=v9*397;t10=v10*397;t11=v11*397;t12=v12*397;t13=v13*397;t14=v14*397;t15=v15*397;t16=v16*397;t17=v17*397;t18=v18*397;t19=v19*397;t20=v20*397;t21=v21*397;t22=v22*397;t23=v23*397;t24=v24*397;t25=v25*397;t26=v26*397;t27=v27*397;t28=v28*397;t29=v29*397;t30=v30*397;t31=v31*397;t32=v32*397;t33=v33*397;t34=v34*397;t35=v35*397;t36=v36*397;t37=v37*397;t38=v38*397;t39=v39*397;t40=v40*397;t41=v41*397;t42=v42*397;t43=v43*397;t44=v44*397;t45=v45*397;t46=v46*397;t47=v47*397;t48=v48*397;t49=v49*397;t50=v50*397;t51=v51*397;t52=v52*397;t53=v53*397;t54=v54*397;t55=v55*397;t56=v56*397;t57=v57*397;t58=v58*397;t59=v59*397;t60=v60*397;t61=v61*397;t62=v62*397;t63=v63*397;
				t42+=v0<<8;t43+=v1<<8;t44+=v2<<8;t45+=v3<<8;t46+=v4<<8;t47+=v5<<8;t48+=v6<<8;t49+=v7<<8;t50+=v8<<8;t51+=v9<<8;t52+=v10<<8;t53+=v11<<8;t54+=v12<<8;t55+=v13<<8;t56+=v14<<8;t57+=v15<<8;t58+=v16<<8;t59+=v17<<8;t60+=v18<<8;t61+=v19<<8;t62+=v20<<8;t63+=v21<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;t31+=t30>>>16;v30=t30&65535;t32+=t31>>>16;v31=t31&65535;t33+=t32>>>16;v32=t32&65535;t34+=t33>>>16;v33=t33&65535;t35+=t34>>>16;v34=t34&65535;t36+=t35>>>16;v35=t35&65535;t37+=t36>>>16;v36=t36&65535;t38+=t37>>>16;v37=t37&65535;t39+=t38>>>16;v38=t38&65535;t40+=t39>>>16;v39=t39&65535;t41+=t40>>>16;v40=t40&65535;t42+=t41>>>16;v41=t41&65535;t43+=t42>>>16;v42=t42&65535;t44+=t43>>>16;v43=t43&65535;t45+=t44>>>16;v44=t44&65535;t46+=t45>>>16;v45=t45&65535;t47+=t46>>>16;v46=t46&65535;t48+=t47>>>16;v47=t47&65535;t49+=t48>>>16;v48=t48&65535;t50+=t49>>>16;v49=t49&65535;t51+=t50>>>16;v50=t50&65535;t52+=t51>>>16;v51=t51&65535;t53+=t52>>>16;v52=t52&65535;t54+=t53>>>16;v53=t53&65535;t55+=t54>>>16;v54=t54&65535;t56+=t55>>>16;v55=t55&65535;t57+=t56>>>16;v56=t56&65535;t58+=t57>>>16;v57=t57&65535;t59+=t58>>>16;v58=t58&65535;t60+=t59>>>16;v59=t59&65535;t61+=t60>>>16;v60=t60&65535;t62+=t61>>>16;v61=t61&65535;v63=(t63+(t62>>>16))&65535;v62=t62&65535;
				v0^=(c&63)|128;
			}else if(((c&64512)==55296)&&(i+1)<l&&((str.charCodeAt(i+1)&64512)==56320)){
				c=65536+((c&1023)<<10)+(str.charCodeAt(++i)&1023);
				v0^=(c>>18)|240;
				t0=v0*397;t1=v1*397;t2=v2*397;t3=v3*397;t4=v4*397;t5=v5*397;t6=v6*397;t7=v7*397;t8=v8*397;t9=v9*397;t10=v10*397;t11=v11*397;t12=v12*397;t13=v13*397;t14=v14*397;t15=v15*397;t16=v16*397;t17=v17*397;t18=v18*397;t19=v19*397;t20=v20*397;t21=v21*397;t22=v22*397;t23=v23*397;t24=v24*397;t25=v25*397;t26=v26*397;t27=v27*397;t28=v28*397;t29=v29*397;t30=v30*397;t31=v31*397;t32=v32*397;t33=v33*397;t34=v34*397;t35=v35*397;t36=v36*397;t37=v37*397;t38=v38*397;t39=v39*397;t40=v40*397;t41=v41*397;t42=v42*397;t43=v43*397;t44=v44*397;t45=v45*397;t46=v46*397;t47=v47*397;t48=v48*397;t49=v49*397;t50=v50*397;t51=v51*397;t52=v52*397;t53=v53*397;t54=v54*397;t55=v55*397;t56=v56*397;t57=v57*397;t58=v58*397;t59=v59*397;t60=v60*397;t61=v61*397;t62=v62*397;t63=v63*397;
				t42+=v0<<8;t43+=v1<<8;t44+=v2<<8;t45+=v3<<8;t46+=v4<<8;t47+=v5<<8;t48+=v6<<8;t49+=v7<<8;t50+=v8<<8;t51+=v9<<8;t52+=v10<<8;t53+=v11<<8;t54+=v12<<8;t55+=v13<<8;t56+=v14<<8;t57+=v15<<8;t58+=v16<<8;t59+=v17<<8;t60+=v18<<8;t61+=v19<<8;t62+=v20<<8;t63+=v21<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;t31+=t30>>>16;v30=t30&65535;t32+=t31>>>16;v31=t31&65535;t33+=t32>>>16;v32=t32&65535;t34+=t33>>>16;v33=t33&65535;t35+=t34>>>16;v34=t34&65535;t36+=t35>>>16;v35=t35&65535;t37+=t36>>>16;v36=t36&65535;t38+=t37>>>16;v37=t37&65535;t39+=t38>>>16;v38=t38&65535;t40+=t39>>>16;v39=t39&65535;t41+=t40>>>16;v40=t40&65535;t42+=t41>>>16;v41=t41&65535;t43+=t42>>>16;v42=t42&65535;t44+=t43>>>16;v43=t43&65535;t45+=t44>>>16;v44=t44&65535;t46+=t45>>>16;v45=t45&65535;t47+=t46>>>16;v46=t46&65535;t48+=t47>>>16;v47=t47&65535;t49+=t48>>>16;v48=t48&65535;t50+=t49>>>16;v49=t49&65535;t51+=t50>>>16;v50=t50&65535;t52+=t51>>>16;v51=t51&65535;t53+=t52>>>16;v52=t52&65535;t54+=t53>>>16;v53=t53&65535;t55+=t54>>>16;v54=t54&65535;t56+=t55>>>16;v55=t55&65535;t57+=t56>>>16;v56=t56&65535;t58+=t57>>>16;v57=t57&65535;t59+=t58>>>16;v58=t58&65535;t60+=t59>>>16;v59=t59&65535;t61+=t60>>>16;v60=t60&65535;t62+=t61>>>16;v61=t61&65535;v63=(t63+(t62>>>16))&65535;v62=t62&65535;
				v0^=((c>>12)&63)|128;
				t0=v0*397;t1=v1*397;t2=v2*397;t3=v3*397;t4=v4*397;t5=v5*397;t6=v6*397;t7=v7*397;t8=v8*397;t9=v9*397;t10=v10*397;t11=v11*397;t12=v12*397;t13=v13*397;t14=v14*397;t15=v15*397;t16=v16*397;t17=v17*397;t18=v18*397;t19=v19*397;t20=v20*397;t21=v21*397;t22=v22*397;t23=v23*397;t24=v24*397;t25=v25*397;t26=v26*397;t27=v27*397;t28=v28*397;t29=v29*397;t30=v30*397;t31=v31*397;t32=v32*397;t33=v33*397;t34=v34*397;t35=v35*397;t36=v36*397;t37=v37*397;t38=v38*397;t39=v39*397;t40=v40*397;t41=v41*397;t42=v42*397;t43=v43*397;t44=v44*397;t45=v45*397;t46=v46*397;t47=v47*397;t48=v48*397;t49=v49*397;t50=v50*397;t51=v51*397;t52=v52*397;t53=v53*397;t54=v54*397;t55=v55*397;t56=v56*397;t57=v57*397;t58=v58*397;t59=v59*397;t60=v60*397;t61=v61*397;t62=v62*397;t63=v63*397;
				t42+=v0<<8;t43+=v1<<8;t44+=v2<<8;t45+=v3<<8;t46+=v4<<8;t47+=v5<<8;t48+=v6<<8;t49+=v7<<8;t50+=v8<<8;t51+=v9<<8;t52+=v10<<8;t53+=v11<<8;t54+=v12<<8;t55+=v13<<8;t56+=v14<<8;t57+=v15<<8;t58+=v16<<8;t59+=v17<<8;t60+=v18<<8;t61+=v19<<8;t62+=v20<<8;t63+=v21<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;t31+=t30>>>16;v30=t30&65535;t32+=t31>>>16;v31=t31&65535;t33+=t32>>>16;v32=t32&65535;t34+=t33>>>16;v33=t33&65535;t35+=t34>>>16;v34=t34&65535;t36+=t35>>>16;v35=t35&65535;t37+=t36>>>16;v36=t36&65535;t38+=t37>>>16;v37=t37&65535;t39+=t38>>>16;v38=t38&65535;t40+=t39>>>16;v39=t39&65535;t41+=t40>>>16;v40=t40&65535;t42+=t41>>>16;v41=t41&65535;t43+=t42>>>16;v42=t42&65535;t44+=t43>>>16;v43=t43&65535;t45+=t44>>>16;v44=t44&65535;t46+=t45>>>16;v45=t45&65535;t47+=t46>>>16;v46=t46&65535;t48+=t47>>>16;v47=t47&65535;t49+=t48>>>16;v48=t48&65535;t50+=t49>>>16;v49=t49&65535;t51+=t50>>>16;v50=t50&65535;t52+=t51>>>16;v51=t51&65535;t53+=t52>>>16;v52=t52&65535;t54+=t53>>>16;v53=t53&65535;t55+=t54>>>16;v54=t54&65535;t56+=t55>>>16;v55=t55&65535;t57+=t56>>>16;v56=t56&65535;t58+=t57>>>16;v57=t57&65535;t59+=t58>>>16;v58=t58&65535;t60+=t59>>>16;v59=t59&65535;t61+=t60>>>16;v60=t60&65535;t62+=t61>>>16;v61=t61&65535;v63=(t63+(t62>>>16))&65535;v62=t62&65535;
				v0^=((c>>6)&63)|128;
				t0=v0*397;t1=v1*397;t2=v2*397;t3=v3*397;t4=v4*397;t5=v5*397;t6=v6*397;t7=v7*397;t8=v8*397;t9=v9*397;t10=v10*397;t11=v11*397;t12=v12*397;t13=v13*397;t14=v14*397;t15=v15*397;t16=v16*397;t17=v17*397;t18=v18*397;t19=v19*397;t20=v20*397;t21=v21*397;t22=v22*397;t23=v23*397;t24=v24*397;t25=v25*397;t26=v26*397;t27=v27*397;t28=v28*397;t29=v29*397;t30=v30*397;t31=v31*397;t32=v32*397;t33=v33*397;t34=v34*397;t35=v35*397;t36=v36*397;t37=v37*397;t38=v38*397;t39=v39*397;t40=v40*397;t41=v41*397;t42=v42*397;t43=v43*397;t44=v44*397;t45=v45*397;t46=v46*397;t47=v47*397;t48=v48*397;t49=v49*397;t50=v50*397;t51=v51*397;t52=v52*397;t53=v53*397;t54=v54*397;t55=v55*397;t56=v56*397;t57=v57*397;t58=v58*397;t59=v59*397;t60=v60*397;t61=v61*397;t62=v62*397;t63=v63*397;
				t42+=v0<<8;t43+=v1<<8;t44+=v2<<8;t45+=v3<<8;t46+=v4<<8;t47+=v5<<8;t48+=v6<<8;t49+=v7<<8;t50+=v8<<8;t51+=v9<<8;t52+=v10<<8;t53+=v11<<8;t54+=v12<<8;t55+=v13<<8;t56+=v14<<8;t57+=v15<<8;t58+=v16<<8;t59+=v17<<8;t60+=v18<<8;t61+=v19<<8;t62+=v20<<8;t63+=v21<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;t31+=t30>>>16;v30=t30&65535;t32+=t31>>>16;v31=t31&65535;t33+=t32>>>16;v32=t32&65535;t34+=t33>>>16;v33=t33&65535;t35+=t34>>>16;v34=t34&65535;t36+=t35>>>16;v35=t35&65535;t37+=t36>>>16;v36=t36&65535;t38+=t37>>>16;v37=t37&65535;t39+=t38>>>16;v38=t38&65535;t40+=t39>>>16;v39=t39&65535;t41+=t40>>>16;v40=t40&65535;t42+=t41>>>16;v41=t41&65535;t43+=t42>>>16;v42=t42&65535;t44+=t43>>>16;v43=t43&65535;t45+=t44>>>16;v44=t44&65535;t46+=t45>>>16;v45=t45&65535;t47+=t46>>>16;v46=t46&65535;t48+=t47>>>16;v47=t47&65535;t49+=t48>>>16;v48=t48&65535;t50+=t49>>>16;v49=t49&65535;t51+=t50>>>16;v50=t50&65535;t52+=t51>>>16;v51=t51&65535;t53+=t52>>>16;v52=t52&65535;t54+=t53>>>16;v53=t53&65535;t55+=t54>>>16;v54=t54&65535;t56+=t55>>>16;v55=t55&65535;t57+=t56>>>16;v56=t56&65535;t58+=t57>>>16;v57=t57&65535;t59+=t58>>>16;v58=t58&65535;t60+=t59>>>16;v59=t59&65535;t61+=t60>>>16;v60=t60&65535;t62+=t61>>>16;v61=t61&65535;v63=(t63+(t62>>>16))&65535;v62=t62&65535;
				v0^=(c&63)|128;
			}else {
				v0^=(c>>12)|224;
				t0=v0*397;t1=v1*397;t2=v2*397;t3=v3*397;t4=v4*397;t5=v5*397;t6=v6*397;t7=v7*397;t8=v8*397;t9=v9*397;t10=v10*397;t11=v11*397;t12=v12*397;t13=v13*397;t14=v14*397;t15=v15*397;t16=v16*397;t17=v17*397;t18=v18*397;t19=v19*397;t20=v20*397;t21=v21*397;t22=v22*397;t23=v23*397;t24=v24*397;t25=v25*397;t26=v26*397;t27=v27*397;t28=v28*397;t29=v29*397;t30=v30*397;t31=v31*397;t32=v32*397;t33=v33*397;t34=v34*397;t35=v35*397;t36=v36*397;t37=v37*397;t38=v38*397;t39=v39*397;t40=v40*397;t41=v41*397;t42=v42*397;t43=v43*397;t44=v44*397;t45=v45*397;t46=v46*397;t47=v47*397;t48=v48*397;t49=v49*397;t50=v50*397;t51=v51*397;t52=v52*397;t53=v53*397;t54=v54*397;t55=v55*397;t56=v56*397;t57=v57*397;t58=v58*397;t59=v59*397;t60=v60*397;t61=v61*397;t62=v62*397;t63=v63*397;
				t42+=v0<<8;t43+=v1<<8;t44+=v2<<8;t45+=v3<<8;t46+=v4<<8;t47+=v5<<8;t48+=v6<<8;t49+=v7<<8;t50+=v8<<8;t51+=v9<<8;t52+=v10<<8;t53+=v11<<8;t54+=v12<<8;t55+=v13<<8;t56+=v14<<8;t57+=v15<<8;t58+=v16<<8;t59+=v17<<8;t60+=v18<<8;t61+=v19<<8;t62+=v20<<8;t63+=v21<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;t31+=t30>>>16;v30=t30&65535;t32+=t31>>>16;v31=t31&65535;t33+=t32>>>16;v32=t32&65535;t34+=t33>>>16;v33=t33&65535;t35+=t34>>>16;v34=t34&65535;t36+=t35>>>16;v35=t35&65535;t37+=t36>>>16;v36=t36&65535;t38+=t37>>>16;v37=t37&65535;t39+=t38>>>16;v38=t38&65535;t40+=t39>>>16;v39=t39&65535;t41+=t40>>>16;v40=t40&65535;t42+=t41>>>16;v41=t41&65535;t43+=t42>>>16;v42=t42&65535;t44+=t43>>>16;v43=t43&65535;t45+=t44>>>16;v44=t44&65535;t46+=t45>>>16;v45=t45&65535;t47+=t46>>>16;v46=t46&65535;t48+=t47>>>16;v47=t47&65535;t49+=t48>>>16;v48=t48&65535;t50+=t49>>>16;v49=t49&65535;t51+=t50>>>16;v50=t50&65535;t52+=t51>>>16;v51=t51&65535;t53+=t52>>>16;v52=t52&65535;t54+=t53>>>16;v53=t53&65535;t55+=t54>>>16;v54=t54&65535;t56+=t55>>>16;v55=t55&65535;t57+=t56>>>16;v56=t56&65535;t58+=t57>>>16;v57=t57&65535;t59+=t58>>>16;v58=t58&65535;t60+=t59>>>16;v59=t59&65535;t61+=t60>>>16;v60=t60&65535;t62+=t61>>>16;v61=t61&65535;v63=(t63+(t62>>>16))&65535;v62=t62&65535;
				v0^=((c>>6)&63)|128;
				t0=v0*397;t1=v1*397;t2=v2*397;t3=v3*397;t4=v4*397;t5=v5*397;t6=v6*397;t7=v7*397;t8=v8*397;t9=v9*397;t10=v10*397;t11=v11*397;t12=v12*397;t13=v13*397;t14=v14*397;t15=v15*397;t16=v16*397;t17=v17*397;t18=v18*397;t19=v19*397;t20=v20*397;t21=v21*397;t22=v22*397;t23=v23*397;t24=v24*397;t25=v25*397;t26=v26*397;t27=v27*397;t28=v28*397;t29=v29*397;t30=v30*397;t31=v31*397;t32=v32*397;t33=v33*397;t34=v34*397;t35=v35*397;t36=v36*397;t37=v37*397;t38=v38*397;t39=v39*397;t40=v40*397;t41=v41*397;t42=v42*397;t43=v43*397;t44=v44*397;t45=v45*397;t46=v46*397;t47=v47*397;t48=v48*397;t49=v49*397;t50=v50*397;t51=v51*397;t52=v52*397;t53=v53*397;t54=v54*397;t55=v55*397;t56=v56*397;t57=v57*397;t58=v58*397;t59=v59*397;t60=v60*397;t61=v61*397;t62=v62*397;t63=v63*397;
				t42+=v0<<8;t43+=v1<<8;t44+=v2<<8;t45+=v3<<8;t46+=v4<<8;t47+=v5<<8;t48+=v6<<8;t49+=v7<<8;t50+=v8<<8;t51+=v9<<8;t52+=v10<<8;t53+=v11<<8;t54+=v12<<8;t55+=v13<<8;t56+=v14<<8;t57+=v15<<8;t58+=v16<<8;t59+=v17<<8;t60+=v18<<8;t61+=v19<<8;t62+=v20<<8;t63+=v21<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;t31+=t30>>>16;v30=t30&65535;t32+=t31>>>16;v31=t31&65535;t33+=t32>>>16;v32=t32&65535;t34+=t33>>>16;v33=t33&65535;t35+=t34>>>16;v34=t34&65535;t36+=t35>>>16;v35=t35&65535;t37+=t36>>>16;v36=t36&65535;t38+=t37>>>16;v37=t37&65535;t39+=t38>>>16;v38=t38&65535;t40+=t39>>>16;v39=t39&65535;t41+=t40>>>16;v40=t40&65535;t42+=t41>>>16;v41=t41&65535;t43+=t42>>>16;v42=t42&65535;t44+=t43>>>16;v43=t43&65535;t45+=t44>>>16;v44=t44&65535;t46+=t45>>>16;v45=t45&65535;t47+=t46>>>16;v46=t46&65535;t48+=t47>>>16;v47=t47&65535;t49+=t48>>>16;v48=t48&65535;t50+=t49>>>16;v49=t49&65535;t51+=t50>>>16;v50=t50&65535;t52+=t51>>>16;v51=t51&65535;t53+=t52>>>16;v52=t52&65535;t54+=t53>>>16;v53=t53&65535;t55+=t54>>>16;v54=t54&65535;t56+=t55>>>16;v55=t55&65535;t57+=t56>>>16;v56=t56&65535;t58+=t57>>>16;v57=t57&65535;t59+=t58>>>16;v58=t58&65535;t60+=t59>>>16;v59=t59&65535;t61+=t60>>>16;v60=t60&65535;t62+=t61>>>16;v61=t61&65535;v63=(t63+(t62>>>16))&65535;v62=t62&65535;
				v0^=(c&63)|128;
			}
			t0=v0*397;t1=v1*397;t2=v2*397;t3=v3*397;t4=v4*397;t5=v5*397;t6=v6*397;t7=v7*397;t8=v8*397;t9=v9*397;t10=v10*397;t11=v11*397;t12=v12*397;t13=v13*397;t14=v14*397;t15=v15*397;t16=v16*397;t17=v17*397;t18=v18*397;t19=v19*397;t20=v20*397;t21=v21*397;t22=v22*397;t23=v23*397;t24=v24*397;t25=v25*397;t26=v26*397;t27=v27*397;t28=v28*397;t29=v29*397;t30=v30*397;t31=v31*397;t32=v32*397;t33=v33*397;t34=v34*397;t35=v35*397;t36=v36*397;t37=v37*397;t38=v38*397;t39=v39*397;t40=v40*397;t41=v41*397;t42=v42*397;t43=v43*397;t44=v44*397;t45=v45*397;t46=v46*397;t47=v47*397;t48=v48*397;t49=v49*397;t50=v50*397;t51=v51*397;t52=v52*397;t53=v53*397;t54=v54*397;t55=v55*397;t56=v56*397;t57=v57*397;t58=v58*397;t59=v59*397;t60=v60*397;t61=v61*397;t62=v62*397;t63=v63*397;
			t42+=v0<<8;t43+=v1<<8;t44+=v2<<8;t45+=v3<<8;t46+=v4<<8;t47+=v5<<8;t48+=v6<<8;t49+=v7<<8;t50+=v8<<8;t51+=v9<<8;t52+=v10<<8;t53+=v11<<8;t54+=v12<<8;t55+=v13<<8;t56+=v14<<8;t57+=v15<<8;t58+=v16<<8;t59+=v17<<8;t60+=v18<<8;t61+=v19<<8;t62+=v20<<8;t63+=v21<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;t31+=t30>>>16;v30=t30&65535;t32+=t31>>>16;v31=t31&65535;t33+=t32>>>16;v32=t32&65535;t34+=t33>>>16;v33=t33&65535;t35+=t34>>>16;v34=t34&65535;t36+=t35>>>16;v35=t35&65535;t37+=t36>>>16;v36=t36&65535;t38+=t37>>>16;v37=t37&65535;t39+=t38>>>16;v38=t38&65535;t40+=t39>>>16;v39=t39&65535;t41+=t40>>>16;v40=t40&65535;t42+=t41>>>16;v41=t41&65535;t43+=t42>>>16;v42=t42&65535;t44+=t43>>>16;v43=t43&65535;t45+=t44>>>16;v44=t44&65535;t46+=t45>>>16;v45=t45&65535;t47+=t46>>>16;v46=t46&65535;t48+=t47>>>16;v47=t47&65535;t49+=t48>>>16;v48=t48&65535;t50+=t49>>>16;v49=t49&65535;t51+=t50>>>16;v50=t50&65535;t52+=t51>>>16;v51=t51&65535;t53+=t52>>>16;v52=t52&65535;t54+=t53>>>16;v53=t53&65535;t55+=t54>>>16;v54=t54&65535;t56+=t55>>>16;v55=t55&65535;t57+=t56>>>16;v56=t56&65535;t58+=t57>>>16;v57=t57&65535;t59+=t58>>>16;v58=t58&65535;t60+=t59>>>16;v59=t59&65535;t61+=t60>>>16;v60=t60&65535;t62+=t61>>>16;v61=t61&65535;v63=(t63+(t62>>>16))&65535;v62=t62&65535;
		}

		return hashValHex(hl[v63>>8]+hl[v63&255]+hl[v62>>8]+hl[v62&255]+hl[v61>>8]+hl[v61&255]+hl[v60>>8]+hl[v60&255]+hl[v59>>8]+hl[v59&255]+hl[v58>>8]+hl[v58&255]+hl[v57>>8]+hl[v57&255]+hl[v56>>8]+hl[v56&255]+hl[v55>>8]+hl[v55&255]+hl[v54>>8]+hl[v54&255]+hl[v53>>8]+hl[v53&255]+hl[v52>>8]+hl[v52&255]+hl[v51>>8]+hl[v51&255]+hl[v50>>8]+hl[v50&255]+hl[v49>>8]+hl[v49&255]+hl[v48>>8]+hl[v48&255]+hl[v47>>8]+hl[v47&255]+hl[v46>>8]+hl[v46&255]+hl[v45>>8]+hl[v45&255]+hl[v44>>8]+hl[v44&255]+hl[v43>>8]+hl[v43&255]+hl[v42>>8]+hl[v42&255]+hl[v41>>8]+hl[v41&255]+hl[v40>>8]+hl[v40&255]+hl[v39>>8]+hl[v39&255]+hl[v38>>8]+hl[v38&255]+hl[v37>>8]+hl[v37&255]+hl[v36>>8]+hl[v36&255]+hl[v35>>8]+hl[v35&255]+hl[v34>>8]+hl[v34&255]+hl[v33>>8]+hl[v33&255]+hl[v32>>8]+hl[v32&255]+hl[v31>>8]+hl[v31&255]+hl[v30>>8]+hl[v30&255]+hl[v29>>8]+hl[v29&255]+hl[v28>>8]+hl[v28&255]+hl[v27>>8]+hl[v27&255]+hl[v26>>8]+hl[v26&255]+hl[v25>>8]+hl[v25&255]+hl[v24>>8]+hl[v24&255]+hl[v23>>8]+hl[v23&255]+hl[v22>>8]+hl[v22&255]+hl[v21>>8]+hl[v21&255]+hl[v20>>8]+hl[v20&255]+hl[v19>>8]+hl[v19&255]+hl[v18>>8]+hl[v18&255]+hl[v17>>8]+hl[v17&255]+hl[v16>>8]+hl[v16&255]+hl[v15>>8]+hl[v15&255]+hl[v14>>8]+hl[v14&255]+hl[v13>>8]+hl[v13&255]+hl[v12>>8]+hl[v12&255]+hl[v11>>8]+hl[v11&255]+hl[v10>>8]+hl[v10&255]+hl[v9>>8]+hl[v9&255]+hl[v8>>8]+hl[v8&255]+hl[v7>>8]+hl[v7&255]+hl[v6>>8]+hl[v6&255]+hl[v5>>8]+hl[v5&255]+hl[v4>>8]+hl[v4&255]+hl[v3>>8]+hl[v3&255]+hl[v2>>8]+hl[v2&255]+hl[v1>>8]+hl[v1&255]+hl[v0>>8]+hl[v0&255],1024);
	}

	function _hash1024_1_utf(str){
		var c,i,l=str.length,s=fnvConstants[1024].offset,t0=0,v0=s[63]|0,t1=0,v1=s[62]|0,t2=0,v2=s[61]|0,t3=0,v3=s[60]|0,t4=0,v4=s[59]|0,t5=0,v5=s[58]|0,t6=0,v6=s[57]|0,t7=0,v7=s[56]|0,t8=0,v8=s[55]|0,t9=0,v9=s[54]|0,t10=0,v10=s[53]|0,t11=0,v11=s[52]|0,t12=0,v12=s[51]|0,t13=0,v13=s[50]|0,t14=0,v14=s[49]|0,t15=0,v15=s[48]|0,t16=0,v16=s[47]|0,t17=0,v17=s[46]|0,t18=0,v18=s[45]|0,t19=0,v19=s[44]|0,t20=0,v20=s[43]|0,t21=0,v21=s[42]|0,t22=0,v22=s[41]|0,t23=0,v23=s[40]|0,t24=0,v24=s[39]|0,t25=0,v25=s[38]|0,t26=0,v26=s[37]|0,t27=0,v27=s[36]|0,t28=0,v28=s[35]|0,t29=0,v29=s[34]|0,t30=0,v30=s[33]|0,t31=0,v31=s[32]|0,t32=0,v32=s[31]|0,t33=0,v33=s[30]|0,t34=0,v34=s[29]|0,t35=0,v35=s[28]|0,t36=0,v36=s[27]|0,t37=0,v37=s[26]|0,t38=0,v38=s[25]|0,t39=0,v39=s[24]|0,t40=0,v40=s[23]|0,t41=0,v41=s[22]|0,t42=0,v42=s[21]|0,t43=0,v43=s[20]|0,t44=0,v44=s[19]|0,t45=0,v45=s[18]|0,t46=0,v46=s[17]|0,t47=0,v47=s[16]|0,t48=0,v48=s[15]|0,t49=0,v49=s[14]|0,t50=0,v50=s[13]|0,t51=0,v51=s[12]|0,t52=0,v52=s[11]|0,t53=0,v53=s[10]|0,t54=0,v54=s[9]|0,t55=0,v55=s[8]|0,t56=0,v56=s[7]|0,t57=0,v57=s[6]|0,t58=0,v58=s[5]|0,t59=0,v59=s[4]|0,t60=0,v60=s[3]|0,t61=0,v61=s[2]|0,t62=0,v62=s[1]|0,t63=0,v63=s[0]|0;

		for (i = 0; i < l; i++) {
			c = str.charCodeAt(i);
			t0=v0*397;t1=v1*397;t2=v2*397;t3=v3*397;t4=v4*397;t5=v5*397;t6=v6*397;t7=v7*397;t8=v8*397;t9=v9*397;t10=v10*397;t11=v11*397;t12=v12*397;t13=v13*397;t14=v14*397;t15=v15*397;t16=v16*397;t17=v17*397;t18=v18*397;t19=v19*397;t20=v20*397;t21=v21*397;t22=v22*397;t23=v23*397;t24=v24*397;t25=v25*397;t26=v26*397;t27=v27*397;t28=v28*397;t29=v29*397;t30=v30*397;t31=v31*397;t32=v32*397;t33=v33*397;t34=v34*397;t35=v35*397;t36=v36*397;t37=v37*397;t38=v38*397;t39=v39*397;t40=v40*397;t41=v41*397;t42=v42*397;t43=v43*397;t44=v44*397;t45=v45*397;t46=v46*397;t47=v47*397;t48=v48*397;t49=v49*397;t50=v50*397;t51=v51*397;t52=v52*397;t53=v53*397;t54=v54*397;t55=v55*397;t56=v56*397;t57=v57*397;t58=v58*397;t59=v59*397;t60=v60*397;t61=v61*397;t62=v62*397;t63=v63*397;
			t42+=v0<<8;t43+=v1<<8;t44+=v2<<8;t45+=v3<<8;t46+=v4<<8;t47+=v5<<8;t48+=v6<<8;t49+=v7<<8;t50+=v8<<8;t51+=v9<<8;t52+=v10<<8;t53+=v11<<8;t54+=v12<<8;t55+=v13<<8;t56+=v14<<8;t57+=v15<<8;t58+=v16<<8;t59+=v17<<8;t60+=v18<<8;t61+=v19<<8;t62+=v20<<8;t63+=v21<<8;
			t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;t31+=t30>>>16;v30=t30&65535;t32+=t31>>>16;v31=t31&65535;t33+=t32>>>16;v32=t32&65535;t34+=t33>>>16;v33=t33&65535;t35+=t34>>>16;v34=t34&65535;t36+=t35>>>16;v35=t35&65535;t37+=t36>>>16;v36=t36&65535;t38+=t37>>>16;v37=t37&65535;t39+=t38>>>16;v38=t38&65535;t40+=t39>>>16;v39=t39&65535;t41+=t40>>>16;v40=t40&65535;t42+=t41>>>16;v41=t41&65535;t43+=t42>>>16;v42=t42&65535;t44+=t43>>>16;v43=t43&65535;t45+=t44>>>16;v44=t44&65535;t46+=t45>>>16;v45=t45&65535;t47+=t46>>>16;v46=t46&65535;t48+=t47>>>16;v47=t47&65535;t49+=t48>>>16;v48=t48&65535;t50+=t49>>>16;v49=t49&65535;t51+=t50>>>16;v50=t50&65535;t52+=t51>>>16;v51=t51&65535;t53+=t52>>>16;v52=t52&65535;t54+=t53>>>16;v53=t53&65535;t55+=t54>>>16;v54=t54&65535;t56+=t55>>>16;v55=t55&65535;t57+=t56>>>16;v56=t56&65535;t58+=t57>>>16;v57=t57&65535;t59+=t58>>>16;v58=t58&65535;t60+=t59>>>16;v59=t59&65535;t61+=t60>>>16;v60=t60&65535;t62+=t61>>>16;v61=t61&65535;v63=(t63+(t62>>>16))&65535;v62=t62&65535;
			if(c < 128){
				v0^=c;
			}else if(c < 2048){
				v0^=(c>>6)|192;
				t0=v0*397;t1=v1*397;t2=v2*397;t3=v3*397;t4=v4*397;t5=v5*397;t6=v6*397;t7=v7*397;t8=v8*397;t9=v9*397;t10=v10*397;t11=v11*397;t12=v12*397;t13=v13*397;t14=v14*397;t15=v15*397;t16=v16*397;t17=v17*397;t18=v18*397;t19=v19*397;t20=v20*397;t21=v21*397;t22=v22*397;t23=v23*397;t24=v24*397;t25=v25*397;t26=v26*397;t27=v27*397;t28=v28*397;t29=v29*397;t30=v30*397;t31=v31*397;t32=v32*397;t33=v33*397;t34=v34*397;t35=v35*397;t36=v36*397;t37=v37*397;t38=v38*397;t39=v39*397;t40=v40*397;t41=v41*397;t42=v42*397;t43=v43*397;t44=v44*397;t45=v45*397;t46=v46*397;t47=v47*397;t48=v48*397;t49=v49*397;t50=v50*397;t51=v51*397;t52=v52*397;t53=v53*397;t54=v54*397;t55=v55*397;t56=v56*397;t57=v57*397;t58=v58*397;t59=v59*397;t60=v60*397;t61=v61*397;t62=v62*397;t63=v63*397;
				t42+=v0<<8;t43+=v1<<8;t44+=v2<<8;t45+=v3<<8;t46+=v4<<8;t47+=v5<<8;t48+=v6<<8;t49+=v7<<8;t50+=v8<<8;t51+=v9<<8;t52+=v10<<8;t53+=v11<<8;t54+=v12<<8;t55+=v13<<8;t56+=v14<<8;t57+=v15<<8;t58+=v16<<8;t59+=v17<<8;t60+=v18<<8;t61+=v19<<8;t62+=v20<<8;t63+=v21<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;t31+=t30>>>16;v30=t30&65535;t32+=t31>>>16;v31=t31&65535;t33+=t32>>>16;v32=t32&65535;t34+=t33>>>16;v33=t33&65535;t35+=t34>>>16;v34=t34&65535;t36+=t35>>>16;v35=t35&65535;t37+=t36>>>16;v36=t36&65535;t38+=t37>>>16;v37=t37&65535;t39+=t38>>>16;v38=t38&65535;t40+=t39>>>16;v39=t39&65535;t41+=t40>>>16;v40=t40&65535;t42+=t41>>>16;v41=t41&65535;t43+=t42>>>16;v42=t42&65535;t44+=t43>>>16;v43=t43&65535;t45+=t44>>>16;v44=t44&65535;t46+=t45>>>16;v45=t45&65535;t47+=t46>>>16;v46=t46&65535;t48+=t47>>>16;v47=t47&65535;t49+=t48>>>16;v48=t48&65535;t50+=t49>>>16;v49=t49&65535;t51+=t50>>>16;v50=t50&65535;t52+=t51>>>16;v51=t51&65535;t53+=t52>>>16;v52=t52&65535;t54+=t53>>>16;v53=t53&65535;t55+=t54>>>16;v54=t54&65535;t56+=t55>>>16;v55=t55&65535;t57+=t56>>>16;v56=t56&65535;t58+=t57>>>16;v57=t57&65535;t59+=t58>>>16;v58=t58&65535;t60+=t59>>>16;v59=t59&65535;t61+=t60>>>16;v60=t60&65535;t62+=t61>>>16;v61=t61&65535;v63=(t63+(t62>>>16))&65535;v62=t62&65535;
				v0^=(c&63)|128;
			}else if(((c&64512)==55296)&&(i+1)<l&&((str.charCodeAt(i+1)&64512)==56320)){
				c=65536+((c&1023)<<10)+(str.charCodeAt(++i)&1023);
				v0^=(c>>18)|240;
				t0=v0*397;t1=v1*397;t2=v2*397;t3=v3*397;t4=v4*397;t5=v5*397;t6=v6*397;t7=v7*397;t8=v8*397;t9=v9*397;t10=v10*397;t11=v11*397;t12=v12*397;t13=v13*397;t14=v14*397;t15=v15*397;t16=v16*397;t17=v17*397;t18=v18*397;t19=v19*397;t20=v20*397;t21=v21*397;t22=v22*397;t23=v23*397;t24=v24*397;t25=v25*397;t26=v26*397;t27=v27*397;t28=v28*397;t29=v29*397;t30=v30*397;t31=v31*397;t32=v32*397;t33=v33*397;t34=v34*397;t35=v35*397;t36=v36*397;t37=v37*397;t38=v38*397;t39=v39*397;t40=v40*397;t41=v41*397;t42=v42*397;t43=v43*397;t44=v44*397;t45=v45*397;t46=v46*397;t47=v47*397;t48=v48*397;t49=v49*397;t50=v50*397;t51=v51*397;t52=v52*397;t53=v53*397;t54=v54*397;t55=v55*397;t56=v56*397;t57=v57*397;t58=v58*397;t59=v59*397;t60=v60*397;t61=v61*397;t62=v62*397;t63=v63*397;
				t42+=v0<<8;t43+=v1<<8;t44+=v2<<8;t45+=v3<<8;t46+=v4<<8;t47+=v5<<8;t48+=v6<<8;t49+=v7<<8;t50+=v8<<8;t51+=v9<<8;t52+=v10<<8;t53+=v11<<8;t54+=v12<<8;t55+=v13<<8;t56+=v14<<8;t57+=v15<<8;t58+=v16<<8;t59+=v17<<8;t60+=v18<<8;t61+=v19<<8;t62+=v20<<8;t63+=v21<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;t31+=t30>>>16;v30=t30&65535;t32+=t31>>>16;v31=t31&65535;t33+=t32>>>16;v32=t32&65535;t34+=t33>>>16;v33=t33&65535;t35+=t34>>>16;v34=t34&65535;t36+=t35>>>16;v35=t35&65535;t37+=t36>>>16;v36=t36&65535;t38+=t37>>>16;v37=t37&65535;t39+=t38>>>16;v38=t38&65535;t40+=t39>>>16;v39=t39&65535;t41+=t40>>>16;v40=t40&65535;t42+=t41>>>16;v41=t41&65535;t43+=t42>>>16;v42=t42&65535;t44+=t43>>>16;v43=t43&65535;t45+=t44>>>16;v44=t44&65535;t46+=t45>>>16;v45=t45&65535;t47+=t46>>>16;v46=t46&65535;t48+=t47>>>16;v47=t47&65535;t49+=t48>>>16;v48=t48&65535;t50+=t49>>>16;v49=t49&65535;t51+=t50>>>16;v50=t50&65535;t52+=t51>>>16;v51=t51&65535;t53+=t52>>>16;v52=t52&65535;t54+=t53>>>16;v53=t53&65535;t55+=t54>>>16;v54=t54&65535;t56+=t55>>>16;v55=t55&65535;t57+=t56>>>16;v56=t56&65535;t58+=t57>>>16;v57=t57&65535;t59+=t58>>>16;v58=t58&65535;t60+=t59>>>16;v59=t59&65535;t61+=t60>>>16;v60=t60&65535;t62+=t61>>>16;v61=t61&65535;v63=(t63+(t62>>>16))&65535;v62=t62&65535;
				v0^=((c>>12)&63)|128;
				t0=v0*397;t1=v1*397;t2=v2*397;t3=v3*397;t4=v4*397;t5=v5*397;t6=v6*397;t7=v7*397;t8=v8*397;t9=v9*397;t10=v10*397;t11=v11*397;t12=v12*397;t13=v13*397;t14=v14*397;t15=v15*397;t16=v16*397;t17=v17*397;t18=v18*397;t19=v19*397;t20=v20*397;t21=v21*397;t22=v22*397;t23=v23*397;t24=v24*397;t25=v25*397;t26=v26*397;t27=v27*397;t28=v28*397;t29=v29*397;t30=v30*397;t31=v31*397;t32=v32*397;t33=v33*397;t34=v34*397;t35=v35*397;t36=v36*397;t37=v37*397;t38=v38*397;t39=v39*397;t40=v40*397;t41=v41*397;t42=v42*397;t43=v43*397;t44=v44*397;t45=v45*397;t46=v46*397;t47=v47*397;t48=v48*397;t49=v49*397;t50=v50*397;t51=v51*397;t52=v52*397;t53=v53*397;t54=v54*397;t55=v55*397;t56=v56*397;t57=v57*397;t58=v58*397;t59=v59*397;t60=v60*397;t61=v61*397;t62=v62*397;t63=v63*397;
				t42+=v0<<8;t43+=v1<<8;t44+=v2<<8;t45+=v3<<8;t46+=v4<<8;t47+=v5<<8;t48+=v6<<8;t49+=v7<<8;t50+=v8<<8;t51+=v9<<8;t52+=v10<<8;t53+=v11<<8;t54+=v12<<8;t55+=v13<<8;t56+=v14<<8;t57+=v15<<8;t58+=v16<<8;t59+=v17<<8;t60+=v18<<8;t61+=v19<<8;t62+=v20<<8;t63+=v21<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;t31+=t30>>>16;v30=t30&65535;t32+=t31>>>16;v31=t31&65535;t33+=t32>>>16;v32=t32&65535;t34+=t33>>>16;v33=t33&65535;t35+=t34>>>16;v34=t34&65535;t36+=t35>>>16;v35=t35&65535;t37+=t36>>>16;v36=t36&65535;t38+=t37>>>16;v37=t37&65535;t39+=t38>>>16;v38=t38&65535;t40+=t39>>>16;v39=t39&65535;t41+=t40>>>16;v40=t40&65535;t42+=t41>>>16;v41=t41&65535;t43+=t42>>>16;v42=t42&65535;t44+=t43>>>16;v43=t43&65535;t45+=t44>>>16;v44=t44&65535;t46+=t45>>>16;v45=t45&65535;t47+=t46>>>16;v46=t46&65535;t48+=t47>>>16;v47=t47&65535;t49+=t48>>>16;v48=t48&65535;t50+=t49>>>16;v49=t49&65535;t51+=t50>>>16;v50=t50&65535;t52+=t51>>>16;v51=t51&65535;t53+=t52>>>16;v52=t52&65535;t54+=t53>>>16;v53=t53&65535;t55+=t54>>>16;v54=t54&65535;t56+=t55>>>16;v55=t55&65535;t57+=t56>>>16;v56=t56&65535;t58+=t57>>>16;v57=t57&65535;t59+=t58>>>16;v58=t58&65535;t60+=t59>>>16;v59=t59&65535;t61+=t60>>>16;v60=t60&65535;t62+=t61>>>16;v61=t61&65535;v63=(t63+(t62>>>16))&65535;v62=t62&65535;
				v0^=((c>>6)&63)|128;
				t0=v0*397;t1=v1*397;t2=v2*397;t3=v3*397;t4=v4*397;t5=v5*397;t6=v6*397;t7=v7*397;t8=v8*397;t9=v9*397;t10=v10*397;t11=v11*397;t12=v12*397;t13=v13*397;t14=v14*397;t15=v15*397;t16=v16*397;t17=v17*397;t18=v18*397;t19=v19*397;t20=v20*397;t21=v21*397;t22=v22*397;t23=v23*397;t24=v24*397;t25=v25*397;t26=v26*397;t27=v27*397;t28=v28*397;t29=v29*397;t30=v30*397;t31=v31*397;t32=v32*397;t33=v33*397;t34=v34*397;t35=v35*397;t36=v36*397;t37=v37*397;t38=v38*397;t39=v39*397;t40=v40*397;t41=v41*397;t42=v42*397;t43=v43*397;t44=v44*397;t45=v45*397;t46=v46*397;t47=v47*397;t48=v48*397;t49=v49*397;t50=v50*397;t51=v51*397;t52=v52*397;t53=v53*397;t54=v54*397;t55=v55*397;t56=v56*397;t57=v57*397;t58=v58*397;t59=v59*397;t60=v60*397;t61=v61*397;t62=v62*397;t63=v63*397;
				t42+=v0<<8;t43+=v1<<8;t44+=v2<<8;t45+=v3<<8;t46+=v4<<8;t47+=v5<<8;t48+=v6<<8;t49+=v7<<8;t50+=v8<<8;t51+=v9<<8;t52+=v10<<8;t53+=v11<<8;t54+=v12<<8;t55+=v13<<8;t56+=v14<<8;t57+=v15<<8;t58+=v16<<8;t59+=v17<<8;t60+=v18<<8;t61+=v19<<8;t62+=v20<<8;t63+=v21<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;t31+=t30>>>16;v30=t30&65535;t32+=t31>>>16;v31=t31&65535;t33+=t32>>>16;v32=t32&65535;t34+=t33>>>16;v33=t33&65535;t35+=t34>>>16;v34=t34&65535;t36+=t35>>>16;v35=t35&65535;t37+=t36>>>16;v36=t36&65535;t38+=t37>>>16;v37=t37&65535;t39+=t38>>>16;v38=t38&65535;t40+=t39>>>16;v39=t39&65535;t41+=t40>>>16;v40=t40&65535;t42+=t41>>>16;v41=t41&65535;t43+=t42>>>16;v42=t42&65535;t44+=t43>>>16;v43=t43&65535;t45+=t44>>>16;v44=t44&65535;t46+=t45>>>16;v45=t45&65535;t47+=t46>>>16;v46=t46&65535;t48+=t47>>>16;v47=t47&65535;t49+=t48>>>16;v48=t48&65535;t50+=t49>>>16;v49=t49&65535;t51+=t50>>>16;v50=t50&65535;t52+=t51>>>16;v51=t51&65535;t53+=t52>>>16;v52=t52&65535;t54+=t53>>>16;v53=t53&65535;t55+=t54>>>16;v54=t54&65535;t56+=t55>>>16;v55=t55&65535;t57+=t56>>>16;v56=t56&65535;t58+=t57>>>16;v57=t57&65535;t59+=t58>>>16;v58=t58&65535;t60+=t59>>>16;v59=t59&65535;t61+=t60>>>16;v60=t60&65535;t62+=t61>>>16;v61=t61&65535;v63=(t63+(t62>>>16))&65535;v62=t62&65535;
				v0^=(c&63)|128;
			}else {
				v0^=(c>>12)|224;
				t0=v0*397;t1=v1*397;t2=v2*397;t3=v3*397;t4=v4*397;t5=v5*397;t6=v6*397;t7=v7*397;t8=v8*397;t9=v9*397;t10=v10*397;t11=v11*397;t12=v12*397;t13=v13*397;t14=v14*397;t15=v15*397;t16=v16*397;t17=v17*397;t18=v18*397;t19=v19*397;t20=v20*397;t21=v21*397;t22=v22*397;t23=v23*397;t24=v24*397;t25=v25*397;t26=v26*397;t27=v27*397;t28=v28*397;t29=v29*397;t30=v30*397;t31=v31*397;t32=v32*397;t33=v33*397;t34=v34*397;t35=v35*397;t36=v36*397;t37=v37*397;t38=v38*397;t39=v39*397;t40=v40*397;t41=v41*397;t42=v42*397;t43=v43*397;t44=v44*397;t45=v45*397;t46=v46*397;t47=v47*397;t48=v48*397;t49=v49*397;t50=v50*397;t51=v51*397;t52=v52*397;t53=v53*397;t54=v54*397;t55=v55*397;t56=v56*397;t57=v57*397;t58=v58*397;t59=v59*397;t60=v60*397;t61=v61*397;t62=v62*397;t63=v63*397;
				t42+=v0<<8;t43+=v1<<8;t44+=v2<<8;t45+=v3<<8;t46+=v4<<8;t47+=v5<<8;t48+=v6<<8;t49+=v7<<8;t50+=v8<<8;t51+=v9<<8;t52+=v10<<8;t53+=v11<<8;t54+=v12<<8;t55+=v13<<8;t56+=v14<<8;t57+=v15<<8;t58+=v16<<8;t59+=v17<<8;t60+=v18<<8;t61+=v19<<8;t62+=v20<<8;t63+=v21<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;t31+=t30>>>16;v30=t30&65535;t32+=t31>>>16;v31=t31&65535;t33+=t32>>>16;v32=t32&65535;t34+=t33>>>16;v33=t33&65535;t35+=t34>>>16;v34=t34&65535;t36+=t35>>>16;v35=t35&65535;t37+=t36>>>16;v36=t36&65535;t38+=t37>>>16;v37=t37&65535;t39+=t38>>>16;v38=t38&65535;t40+=t39>>>16;v39=t39&65535;t41+=t40>>>16;v40=t40&65535;t42+=t41>>>16;v41=t41&65535;t43+=t42>>>16;v42=t42&65535;t44+=t43>>>16;v43=t43&65535;t45+=t44>>>16;v44=t44&65535;t46+=t45>>>16;v45=t45&65535;t47+=t46>>>16;v46=t46&65535;t48+=t47>>>16;v47=t47&65535;t49+=t48>>>16;v48=t48&65535;t50+=t49>>>16;v49=t49&65535;t51+=t50>>>16;v50=t50&65535;t52+=t51>>>16;v51=t51&65535;t53+=t52>>>16;v52=t52&65535;t54+=t53>>>16;v53=t53&65535;t55+=t54>>>16;v54=t54&65535;t56+=t55>>>16;v55=t55&65535;t57+=t56>>>16;v56=t56&65535;t58+=t57>>>16;v57=t57&65535;t59+=t58>>>16;v58=t58&65535;t60+=t59>>>16;v59=t59&65535;t61+=t60>>>16;v60=t60&65535;t62+=t61>>>16;v61=t61&65535;v63=(t63+(t62>>>16))&65535;v62=t62&65535;
				v0^=((c>>6)&63)|128;
				t0=v0*397;t1=v1*397;t2=v2*397;t3=v3*397;t4=v4*397;t5=v5*397;t6=v6*397;t7=v7*397;t8=v8*397;t9=v9*397;t10=v10*397;t11=v11*397;t12=v12*397;t13=v13*397;t14=v14*397;t15=v15*397;t16=v16*397;t17=v17*397;t18=v18*397;t19=v19*397;t20=v20*397;t21=v21*397;t22=v22*397;t23=v23*397;t24=v24*397;t25=v25*397;t26=v26*397;t27=v27*397;t28=v28*397;t29=v29*397;t30=v30*397;t31=v31*397;t32=v32*397;t33=v33*397;t34=v34*397;t35=v35*397;t36=v36*397;t37=v37*397;t38=v38*397;t39=v39*397;t40=v40*397;t41=v41*397;t42=v42*397;t43=v43*397;t44=v44*397;t45=v45*397;t46=v46*397;t47=v47*397;t48=v48*397;t49=v49*397;t50=v50*397;t51=v51*397;t52=v52*397;t53=v53*397;t54=v54*397;t55=v55*397;t56=v56*397;t57=v57*397;t58=v58*397;t59=v59*397;t60=v60*397;t61=v61*397;t62=v62*397;t63=v63*397;
				t42+=v0<<8;t43+=v1<<8;t44+=v2<<8;t45+=v3<<8;t46+=v4<<8;t47+=v5<<8;t48+=v6<<8;t49+=v7<<8;t50+=v8<<8;t51+=v9<<8;t52+=v10<<8;t53+=v11<<8;t54+=v12<<8;t55+=v13<<8;t56+=v14<<8;t57+=v15<<8;t58+=v16<<8;t59+=v17<<8;t60+=v18<<8;t61+=v19<<8;t62+=v20<<8;t63+=v21<<8;
				t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;t3+=t2>>>16;v2=t2&65535;t4+=t3>>>16;v3=t3&65535;t5+=t4>>>16;v4=t4&65535;t6+=t5>>>16;v5=t5&65535;t7+=t6>>>16;v6=t6&65535;t8+=t7>>>16;v7=t7&65535;t9+=t8>>>16;v8=t8&65535;t10+=t9>>>16;v9=t9&65535;t11+=t10>>>16;v10=t10&65535;t12+=t11>>>16;v11=t11&65535;t13+=t12>>>16;v12=t12&65535;t14+=t13>>>16;v13=t13&65535;t15+=t14>>>16;v14=t14&65535;t16+=t15>>>16;v15=t15&65535;t17+=t16>>>16;v16=t16&65535;t18+=t17>>>16;v17=t17&65535;t19+=t18>>>16;v18=t18&65535;t20+=t19>>>16;v19=t19&65535;t21+=t20>>>16;v20=t20&65535;t22+=t21>>>16;v21=t21&65535;t23+=t22>>>16;v22=t22&65535;t24+=t23>>>16;v23=t23&65535;t25+=t24>>>16;v24=t24&65535;t26+=t25>>>16;v25=t25&65535;t27+=t26>>>16;v26=t26&65535;t28+=t27>>>16;v27=t27&65535;t29+=t28>>>16;v28=t28&65535;t30+=t29>>>16;v29=t29&65535;t31+=t30>>>16;v30=t30&65535;t32+=t31>>>16;v31=t31&65535;t33+=t32>>>16;v32=t32&65535;t34+=t33>>>16;v33=t33&65535;t35+=t34>>>16;v34=t34&65535;t36+=t35>>>16;v35=t35&65535;t37+=t36>>>16;v36=t36&65535;t38+=t37>>>16;v37=t37&65535;t39+=t38>>>16;v38=t38&65535;t40+=t39>>>16;v39=t39&65535;t41+=t40>>>16;v40=t40&65535;t42+=t41>>>16;v41=t41&65535;t43+=t42>>>16;v42=t42&65535;t44+=t43>>>16;v43=t43&65535;t45+=t44>>>16;v44=t44&65535;t46+=t45>>>16;v45=t45&65535;t47+=t46>>>16;v46=t46&65535;t48+=t47>>>16;v47=t47&65535;t49+=t48>>>16;v48=t48&65535;t50+=t49>>>16;v49=t49&65535;t51+=t50>>>16;v50=t50&65535;t52+=t51>>>16;v51=t51&65535;t53+=t52>>>16;v52=t52&65535;t54+=t53>>>16;v53=t53&65535;t55+=t54>>>16;v54=t54&65535;t56+=t55>>>16;v55=t55&65535;t57+=t56>>>16;v56=t56&65535;t58+=t57>>>16;v57=t57&65535;t59+=t58>>>16;v58=t58&65535;t60+=t59>>>16;v59=t59&65535;t61+=t60>>>16;v60=t60&65535;t62+=t61>>>16;v61=t61&65535;v63=(t63+(t62>>>16))&65535;v62=t62&65535;
				v0^=(c&63)|128;
			}
		}

		return hashValHex(hl[v63>>8]+hl[v63&255]+hl[v62>>8]+hl[v62&255]+hl[v61>>8]+hl[v61&255]+hl[v60>>8]+hl[v60&255]+hl[v59>>8]+hl[v59&255]+hl[v58>>8]+hl[v58&255]+hl[v57>>8]+hl[v57&255]+hl[v56>>8]+hl[v56&255]+hl[v55>>8]+hl[v55&255]+hl[v54>>8]+hl[v54&255]+hl[v53>>8]+hl[v53&255]+hl[v52>>8]+hl[v52&255]+hl[v51>>8]+hl[v51&255]+hl[v50>>8]+hl[v50&255]+hl[v49>>8]+hl[v49&255]+hl[v48>>8]+hl[v48&255]+hl[v47>>8]+hl[v47&255]+hl[v46>>8]+hl[v46&255]+hl[v45>>8]+hl[v45&255]+hl[v44>>8]+hl[v44&255]+hl[v43>>8]+hl[v43&255]+hl[v42>>8]+hl[v42&255]+hl[v41>>8]+hl[v41&255]+hl[v40>>8]+hl[v40&255]+hl[v39>>8]+hl[v39&255]+hl[v38>>8]+hl[v38&255]+hl[v37>>8]+hl[v37&255]+hl[v36>>8]+hl[v36&255]+hl[v35>>8]+hl[v35&255]+hl[v34>>8]+hl[v34&255]+hl[v33>>8]+hl[v33&255]+hl[v32>>8]+hl[v32&255]+hl[v31>>8]+hl[v31&255]+hl[v30>>8]+hl[v30&255]+hl[v29>>8]+hl[v29&255]+hl[v28>>8]+hl[v28&255]+hl[v27>>8]+hl[v27&255]+hl[v26>>8]+hl[v26&255]+hl[v25>>8]+hl[v25&255]+hl[v24>>8]+hl[v24&255]+hl[v23>>8]+hl[v23&255]+hl[v22>>8]+hl[v22&255]+hl[v21>>8]+hl[v21&255]+hl[v20>>8]+hl[v20&255]+hl[v19>>8]+hl[v19&255]+hl[v18>>8]+hl[v18&255]+hl[v17>>8]+hl[v17&255]+hl[v16>>8]+hl[v16&255]+hl[v15>>8]+hl[v15&255]+hl[v14>>8]+hl[v14&255]+hl[v13>>8]+hl[v13&255]+hl[v12>>8]+hl[v12&255]+hl[v11>>8]+hl[v11&255]+hl[v10>>8]+hl[v10&255]+hl[v9>>8]+hl[v9&255]+hl[v8>>8]+hl[v8&255]+hl[v7>>8]+hl[v7&255]+hl[v6>>8]+hl[v6&255]+hl[v5>>8]+hl[v5&255]+hl[v4>>8]+hl[v4&255]+hl[v3>>8]+hl[v3&255]+hl[v2>>8]+hl[v2&255]+hl[v1>>8]+hl[v1&255]+hl[v0>>8]+hl[v0&255],1024);
	}

	_hash1024 = _hash1024_1a;

	// Init library.
	setVersion('1a');
	setUTF8(false);
	seed();

	return {
		hash: hash,
		setKeyspace: setKeyspace,
		version: setVersion,
		useUTF8: setUTF8,
		seed: seed,
		fast1a32: _hash32_1a_fast,
		fast1a32hex:_hash32_1a_fast_hex,
		fast1a52: _hash52_1a_fast,
		fast1a52hex: _hash52_1a_fast_hex,
		fast1a64: _hash64_1a_fast,
		fast1a32utf: _hash32_1a_fast_utf,
		fast1a32hexutf:_hash32_1a_fast_hex_utf,
		fast1a52utf: _hash52_1a_fast_utf,
		fast1a52hexutf: _hash52_1a_fast_hex_utf,
		fast1a64utf: _hash64_1a_fast_utf
	};
})();

module.exports = fnvplus;
});

/*

Copyright 2020 0KIMS association.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/



var fnvHash_1 = fnvHash;
var flatArray_1 = flatArray;

function flatArray(a) {
    var res = [];
    fillArray(res, a);
    return res;

    function fillArray(res, a) {
        if (Array.isArray(a)) {
            for (let i=0; i<a.length; i++) {
                fillArray(res, a[i]);
            }
        } else {
            res.push(a);
        }
    }
}

function fnvHash(str) {
    return fnvPlus.hash(str, 64).hex();
}

var utils$2 = {
	fnvHash: fnvHash_1,
	flatArray: flatArray_1
};

/* globals WebAssembly */
/*

Copyright 2020 0KIMS association.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/


const Scalar$2 = main.Scalar;
const F1Field$1 = main.F1Field;


var witness_calculator = async function builder(code, options) {

    options = options || {};

    const memory = new WebAssembly.Memory({initial:20000});
    const wasmModule = await WebAssembly.compile(code);

    let wc;

    const instance = await WebAssembly.instantiate(wasmModule, {
        env: {
            "memory": memory
        },
        runtime: {
            error: function(code, pstr, a,b,c,d) {
                let errStr;
                if (code == 7) {
                    errStr=p2str(pstr) + " " + wc.getFr(b).toString() + " != " + wc.getFr(c).toString() + " " +p2str(d);
                } else {
                    errStr=p2str(pstr)+ " " + a + " " + b + " " + c + " " + d;
                }
                console.log("ERROR: ", code, errStr);
                throw new Error(errStr);
            },
            log: function(a) {
                console.log(wc.getFr(a).toString());
            },
            logGetSignal: function(signal, pVal) {
                if (options.logGetSignal) {
                    options.logGetSignal(signal, wc.getFr(pVal) );
                }
            },
            logSetSignal: function(signal, pVal) {
                if (options.logSetSignal) {
                    options.logSetSignal(signal, wc.getFr(pVal) );
                }
            },
            logStartComponent: function(cIdx) {
                if (options.logStartComponent) {
                    options.logStartComponent(cIdx);
                }
            },
            logFinishComponent: function(cIdx) {
                if (options.logFinishComponent) {
                    options.logFinishComponent(cIdx);
                }
            }
        }
    });

    const sanityCheck =
        options &&
        (
            options.sanityCheck ||
            options.logGetSignal ||
            options.logSetSignal ||
            options.logStartComponent ||
            options.logFinishComponent
        );

    wc = new WitnessCalculator(memory, instance, sanityCheck);
    return wc;

    function p2str(p) {
        const i8 = new Uint8Array(memory.buffer);

        const bytes = [];

        for (let i=0; i8[p+i]>0; i++)  bytes.push(i8[p+i]);

        return String.fromCharCode.apply(null, bytes);
    }
};

class WitnessCalculator {
    constructor(memory, instance, sanityCheck) {
        this.memory = memory;
        this.i32 = new Uint32Array(memory.buffer);
        this.instance = instance;

        this.n32 = (this.instance.exports.getFrLen() >> 2) - 2;
        const pRawPrime = this.instance.exports.getPRawPrime();

        const arr = new Array(this.n32);
        for (let i=0; i<this.n32; i++) {
            arr[this.n32-1-i] = this.i32[(pRawPrime >> 2) + i];
        }

        this.prime = Scalar$2.fromArray(arr, 0x100000000);

        this.Fr = new F1Field$1(this.prime);

        this.mask32 = Scalar$2.fromString("FFFFFFFF", 16);
        this.NVars = this.instance.exports.getNVars();
        this.n64 = Math.floor((this.Fr.bitLength - 1) / 64)+1;
        this.R = this.Fr.e( Scalar$2.shiftLeft(1 , this.n64*64));
        this.RInv = this.Fr.inv(this.R);
        this.sanityCheck = sanityCheck;
    }

    async _doCalculateWitness(input, sanityCheck) {
        this.instance.exports.init((this.sanityCheck || sanityCheck) ? 1 : 0);
        const pSigOffset = this.allocInt();
        const pFr = this.allocFr();
        const keys = Object.keys(input);
        keys.forEach( (k) => {
            const h = utils$2.fnvHash(k);
            const hMSB = parseInt(h.slice(0,8), 16);
            const hLSB = parseInt(h.slice(8,16), 16);
            try {
                this.instance.exports.getSignalOffset32(pSigOffset, 0, hMSB, hLSB);
            } catch (err) {
                throw new Error(`Signal ${k} is not an input of the circuit.`);
            }
            const sigOffset = this.getInt(pSigOffset);
            const fArr = utils$2.flatArray(input[k]);
            for (let i=0; i<fArr.length; i++) {
                this.setFr(pFr, fArr[i]);
                this.instance.exports.setSignal(0, 0, sigOffset + i, pFr);
            }
        });
    }

    async calculateWitness(input, sanityCheck) {
        const self = this;

        const old0 = self.i32[0];
        const w = [];

        await self._doCalculateWitness(input, sanityCheck);

        for (let i=0; i<self.NVars; i++) {
            const pWitness = self.instance.exports.getPWitness(i);
            w.push(self.getFr(pWitness));
        }

        self.i32[0] = old0;
        return w;
    }

    async calculateBinWitness(input, sanityCheck) {
        const self = this;

        const old0 = self.i32[0];

        await self._doCalculateWitness(input, sanityCheck);

        const pWitnessBuffer = self.instance.exports.getWitnessBuffer();

        self.i32[0] = old0;

        const buff = self.memory.buffer.slice(pWitnessBuffer, pWitnessBuffer + (self.NVars * self.n64 * 8));
        return new Uint8Array(buff);
    }

    allocInt() {
        const p = this.i32[0];
        this.i32[0] = p+8;
        return p;
    }

    allocFr() {
        const p = this.i32[0];
        this.i32[0] = p+this.n32*4 + 8;
        return p;
    }

    getInt(p) {
        return this.i32[p>>2];
    }

    setInt(p, v) {
        this.i32[p>>2] = v;
    }

    getFr(p) {
        const self = this;
        const idx = (p>>2);

        if (self.i32[idx + 1] & 0x80000000) {
            const arr = new Array(self.n32);
            for (let i=0; i<self.n32; i++) {
                arr[self.n32-1-i] = self.i32[idx+2+i];
            }
            const res = self.Fr.e(Scalar$2.fromArray(arr, 0x100000000));
            if (self.i32[idx + 1] & 0x40000000) {
                return fromMontgomery(res);
            } else {
                return res;
            }

        } else {
            if (self.i32[idx] & 0x80000000) {
                return self.Fr.e( self.i32[idx] - 0x100000000);
            } else {
                return self.Fr.e(self.i32[idx]);
            }
        }

        function fromMontgomery(n) {
            return self.Fr.mul(self.RInv, n);
        }

    }


    setFr(p, v) {
        const self = this;

        v = self.Fr.e(v);

        const minShort = self.Fr.neg(self.Fr.e("80000000", 16));
        const maxShort = self.Fr.e("7FFFFFFF", 16);

        if (  (self.Fr.geq(v, minShort))
            &&(self.Fr.leq(v, maxShort)))
        {
            let a;
            if (self.Fr.geq(v, self.Fr.zero)) {
                a = Scalar$2.toNumber(v);
            } else {
                a = Scalar$2.toNumber( self.Fr.sub(v, minShort));
                a = a - 0x80000000;
                a = 0x100000000 + a;
            }
            self.i32[(p >> 2)] = a;
            self.i32[(p >> 2) + 1] = 0;
            return;
        }

        self.i32[(p >> 2)] = 0;
        self.i32[(p >> 2) + 1] = 0x80000000;
        const arr = Scalar$2.toArray(v, 0x100000000);
        for (let i=0; i<self.n32; i++) {
            const idx = arr.length-1-i;

            if ( idx >=0) {
                self.i32[(p >> 2) + 2 + i] = arr[idx];
            } else {
                self.i32[(p >> 2) + 2 + i] = 0;
            }
        }
    }
}

var WitnessCalculatorBuilder = witness_calculator;

var circom_runtime = {
	WitnessCalculatorBuilder: WitnessCalculatorBuilder
};

const { WitnessCalculatorBuilder: WitnessCalculatorBuilder$1 } = circom_runtime;

async function wtnsCalculate(input, wasmFileName, wtnsFileName, options) {

    const fdWasm = await readExisting$1(wasmFileName);
    const wasm = await fdWasm.read(fdWasm.totalSize);
    await fdWasm.close();

    const wc = await WitnessCalculatorBuilder$1(wasm);
    const w = await wc.calculateBinWitness(input);

    const fdWtns = await createBinFile(wtnsFileName, "wtns", 2, 2);

    await writeBin(fdWtns, w, wc.prime);
    await fdWtns.close();

}

async function groth16ProofFromInput$1(input, wasmFile, zkeyFileName, logger) {
    const wtns= {
        type: "mem"
    };
    await wtnsCalculate(input, wasmFile, wtns);
    return await groth16ProofFromInput(zkeyFileName, wtns);
}

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
const {unstringifyBigInts: unstringifyBigInts$3} = utils$1;

async function isValid(vk_verifier, publicSignals, proof, logger) {
/*
    let cpub = vk_verifier.IC[0];
    for (let s= 0; s< vk_verifier.nPublic; s++) {
        cpub  = G1.add( cpub, G1.timesScalar( vk_verifier.IC[s+1], publicSignals[s]));
    }
*/

    vk_verifier = unstringifyBigInts$3(vk_verifier);
    proof = unstringifyBigInts$3(proof);
    publicSignals = unstringifyBigInts$3(publicSignals);

    const curve = await getCurveFromName(vk_verifier.curve);

    const IC0 = curve.G1.fromObject(vk_verifier.IC[0]);
    const IC = new Uint8Array(curve.G1.F.n8*2 * publicSignals.length);
    const w = new Uint8Array(curve.Fr.n8 * publicSignals.length);

    for (let i=0; i<publicSignals.length; i++) {
        const buffP = curve.G1.fromObject(vk_verifier.IC[i+1]);
        IC.set(buffP, i*curve.G1.F.n8*2);
        Scalar$1.toRprLE(w, curve.Fr.n8*i, publicSignals[i], curve.Fr.n8);
    }

    let cpub = await curve.G1.multiExpAffine(IC, w);
    cpub = curve.G1.add(cpub, IC0);

    const pi_a = curve.G1.fromObject(proof.pi_a);
    const pi_b = curve.G2.fromObject(proof.pi_b);
    const pi_c = curve.G1.fromObject(proof.pi_c);

    const vk_gamma_2 = curve.G2.fromObject(vk_verifier.vk_gamma_2);
    const vk_delta_2 = curve.G2.fromObject(vk_verifier.vk_delta_2);
    const vk_alpha_1 = curve.G1.fromObject(vk_verifier.vk_alpha_1);
    const vk_beta_2 = curve.G2.fromObject(vk_verifier.vk_beta_2);

    const res = await curve.pairingEq(
        curve.G1.neg(pi_a) , pi_b,
        cpub , vk_gamma_2,
        pi_c , vk_delta_2,

        vk_alpha_1, vk_beta_2
    );

    if (! res) {
        if (logger) logger.error("Invalid proof");
        return false;
    }

    if (logger) logger.info("OK!");
    return true;
}

var groth16 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    fullProve: groth16ProofFromInput$1,
    prove: groth16ProofFromInput,
    validate: isValid
});

function hashToG2(curve, hash) {
    const hashV = new DataView(hash.buffer, hash.byteOffset, hash.byteLength);
    const seed = [];
    for (let i=0; i<8; i++) {
        seed[i] = hashV.getUint32(i*4);
    }

    const rng = new ChaCha(seed);

    const g2_sp = curve.G2.fromRng(rng);

    return g2_sp;
}

function getG2sp(curve, persinalization, challange, g1s, g1sx) {

    const h = blake2bWasm(64);
    const b1 = new Uint8Array([persinalization]);
    h.update(b1);
    h.update(challange);
    const b3 = curve.G1.toUncompressed(g1s);
    h.update( b3);
    const b4 = curve.G1.toUncompressed(g1sx);
    h.update( b4);
    const hash =h.digest();

    return hashToG2(curve, hash);
}

function calculatePubKey(k, curve, personalization, challangeHash, rng ) {
    k.g1_s = curve.G1.toAffine(curve.G1.fromRng(rng));
    k.g1_sx = curve.G1.toAffine(curve.G1.timesFr(k.g1_s, k.prvKey));
    k.g2_sp = curve.G2.toAffine(getG2sp(curve, personalization, challangeHash, k.g1_s, k.g1_sx));
    k.g2_spx = curve.G2.toAffine(curve.G2.timesFr(k.g2_sp, k.prvKey));
    return k;
}

function createPTauKey(curve, challangeHash, rng) {
    const key = {
        tau: {},
        alpha: {},
        beta: {}
    };
    key.tau.prvKey = curve.Fr.fromRng(rng);
    key.alpha.prvKey = curve.Fr.fromRng(rng);
    key.beta.prvKey = curve.Fr.fromRng(rng);
    calculatePubKey(key.tau, curve, 0, challangeHash, rng);
    calculatePubKey(key.alpha, curve, 1, challangeHash, rng);
    calculatePubKey(key.beta, curve, 2, challangeHash, rng);
    return key;
}

async function writePTauHeader(fd, curve, power, ceremonyPower) {
    // Write the header
    ///////////

    if (! ceremonyPower) ceremonyPower = power;
    await fd.writeULE32(1); // Header type
    const pHeaderSize = fd.pos;
    await fd.writeULE64(0); // Temporally set to 0 length

    await fd.writeULE32(curve.F1.n64*8);

    const buff = new Uint8Array(curve.F1.n8);
    Scalar$1.toRprLE(buff, 0, curve.q, curve.F1.n8);
    await fd.write(buff);
    await fd.writeULE32(power);                    // power
    await fd.writeULE32(ceremonyPower);               // power

    const headerSize = fd.pos - pHeaderSize - 8;

    const oldPos = fd.pos;

    fd.writeULE64(headerSize, pHeaderSize);

    fd.pos = oldPos;
}

async function readPTauHeader(fd, sections) {
    if (!sections[1])  throw new Error(fd.fileName + ": File has no  header");
    if (sections[1].length>1) throw new Error(fd.fileName +": File has more than one header");

    fd.pos = sections[1][0].p;
    const n8 = await fd.readULE32();
    const buff = await fd.read(n8);
    const q = Scalar$1.fromRprLE(buff);

    const curve = await getCurveFromQ(q);

    if (curve.F1.n64*8 != n8) throw new Error(fd.fileName +": Invalid size");

    const power = await fd.readULE32();
    const ceremonyPower = await fd.readULE32();

    if (fd.pos-sections[1][0].p != sections[1][0].size) throw new Error("Invalid PTau header size");

    return {curve, power, ceremonyPower};
}


async function readPtauPubKey(fd, curve, montgomery) {

    const buff = await fd.read(curve.F1.n8*2*6 + curve.F2.n8*2*3);

    return fromPtauPubKeyRpr(buff, 0, curve, montgomery);
}

function fromPtauPubKeyRpr(buff, pos, curve, montgomery) {

    const key = {
        tau: {},
        alpha: {},
        beta: {}
    };

    key.tau.g1_s = readG1();
    key.tau.g1_sx = readG1();
    key.alpha.g1_s = readG1();
    key.alpha.g1_sx = readG1();
    key.beta.g1_s = readG1();
    key.beta.g1_sx = readG1();
    key.tau.g2_spx = readG2();
    key.alpha.g2_spx = readG2();
    key.beta.g2_spx = readG2();

    return key;

    function readG1() {
        let p;
        if (montgomery) {
            p = curve.G1.fromRprLEM( buff, pos );
        } else {
            p = curve.G1.fromRprUncompressed( buff, pos );
        }
        pos += curve.G1.F.n8*2;
        return p;
    }

    function readG2() {
        let p;
        if (montgomery) {
            p = curve.G2.fromRprLEM( buff, pos );
        } else {
            p = curve.G2.fromRprUncompressed( buff, pos );
        }
        pos += curve.G2.F.n8*2;
        return p;
    }
}

function toPtauPubKeyRpr(buff, pos, curve, key, montgomery) {

    writeG1(key.tau.g1_s);
    writeG1(key.tau.g1_sx);
    writeG1(key.alpha.g1_s);
    writeG1(key.alpha.g1_sx);
    writeG1(key.beta.g1_s);
    writeG1(key.beta.g1_sx);
    writeG2(key.tau.g2_spx);
    writeG2(key.alpha.g2_spx);
    writeG2(key.beta.g2_spx);

    async function writeG1(p) {
        if (montgomery) {
            curve.G1.toRprLEM(buff, pos, p);
        } else {
            curve.G1.toRprUncompressed(buff, pos, p);
        }
        pos += curve.F1.n8*2;
    }

    async function writeG2(p) {
        if (montgomery) {
            curve.G2.toRprLEM(buff, pos, p);
        } else {
            curve.G2.toRprUncompressed(buff, pos, p);
        }
        pos += curve.F2.n8*2;
    }

    return buff;
}

async function writePtauPubKey(fd, curve, key, montgomery) {
    const buff = new Uint8Array(curve.F1.n8*2*6 + curve.F2.n8*2*3);
    toPtauPubKeyRpr(buff, 0, curve, key, montgomery);
    await fd.write(buff);
}

async function readContribution$1(fd, curve) {
    const c = {};

    c.tauG1 = await readG1();
    c.tauG2 = await readG2();
    c.alphaG1 = await readG1();
    c.betaG1 = await readG1();
    c.betaG2 = await readG2();
    c.key = await readPtauPubKey(fd, curve, true);
    c.partialHash = await fd.read(216);
    c.nextChallange = await fd.read(64);
    c.type = await fd.readULE32();

    const buffV  = new Uint8Array(curve.G1.F.n8*2*6+curve.G2.F.n8*2*3);
    toPtauPubKeyRpr(buffV, 0, curve, c.key, false);

    const responseHasher = blake2bWasm(64);
    responseHasher.setPartialHash(c.partialHash);
    responseHasher.update(buffV);
    c.responseHash = responseHasher.digest();

    const paramLength = await fd.readULE32();
    const curPos = fd.pos;
    let lastType =0;
    while (fd.pos-curPos < paramLength) {
        const buffType = await readDV(1);
        if (buffType[0]<= lastType) throw new Error("Parameters in the contribution must be sorted");
        lastType = buffType[0];
        if (buffType[0]==1) {     // Name
            const buffLen = await readDV(1);
            const buffStr = await readDV(buffLen[0]);
            c.name = new TextDecoder().decode(buffStr);
        } else if (buffType[0]==2) {
            const buffExp = await readDV(1);
            c.numIterationsExp = buffExp[0];
        } else if (buffType[0]==3) {
            const buffLen = await readDV(1);
            c.beaconHash = await readDV(buffLen[0]);
        } else {
            throw new Error("Parameter not recognized");
        }
    }
    if (fd.pos != curPos + paramLength) {
        throw new Error("Parametes do not match");
    }

    return c;

    async function readG1() {
        const pBuff = await fd.read(curve.G1.F.n8*2);
        return curve.G1.fromRprLEM( pBuff );
    }

    async function readG2() {
        const pBuff = await fd.read(curve.G2.F.n8*2);
        return curve.G2.fromRprLEM( pBuff );
    }

    async function readDV(n) {
        const b = await fd.read(n);
        return new Uint8Array(b);
    }
}

async function readContributions(fd, curve, sections) {
    if (!sections[7])  throw new Error(fd.fileName + ": File has no  contributions");
    if (sections[7][0].length>1) throw new Error(fd.fileName +": File has more than one contributions section");

    fd.pos = sections[7][0].p;
    const nContributions = await fd.readULE32();
    const contributions = [];
    for (let i=0; i<nContributions; i++) {
        const c = await readContribution$1(fd, curve);
        c.id = i+1;
        contributions.push(c);
    }

    if (fd.pos-sections[7][0].p != sections[7][0].size) throw new Error("Invalid contribution section size");

    return contributions;
}

async function writeContribution$1(fd, curve, contribution) {

    const buffG1 = new Uint8Array(curve.F1.n8*2);
    const buffG2 = new Uint8Array(curve.F2.n8*2);
    await writeG1(contribution.tauG1);
    await writeG2(contribution.tauG2);
    await writeG1(contribution.alphaG1);
    await writeG1(contribution.betaG1);
    await writeG2(contribution.betaG2);
    await writePtauPubKey(fd, curve, contribution.key, true);
    await fd.write(contribution.partialHash);
    await fd.write(contribution.nextChallange);
    await fd.writeULE32(contribution.type || 0);

    const params = [];
    if (contribution.name) {
        params.push(1);      // Param Name
        const nameData = new TextEncoder("utf-8").encode(contribution.name.substring(0,64));
        params.push(nameData.byteLength);
        for (let i=0; i<nameData.byteLength; i++) params.push(nameData[i]);
    }
    if (contribution.type == 1) {
        params.push(2);      // Param numIterationsExp
        params.push(contribution.numIterationsExp);

        params.push(3);      // Beacon Hash
        params.push(contribution.beaconHash.byteLength);
        for (let i=0; i<contribution.beaconHash.byteLength; i++) params.push(contribution.beaconHash[i]);
    }
    if (params.length>0) {
        const paramsBuff = new Uint8Array(params);
        await fd.writeULE32(paramsBuff.byteLength);
        await fd.write(paramsBuff);
    } else {
        await fd.writeULE32(0);
    }


    async function writeG1(p) {
        curve.G1.toRprLEM(buffG1, 0, p);
        await fd.write(buffG1);
    }

    async function writeG2(p) {
        curve.G2.toRprLEM(buffG2, 0, p);
        await fd.write(buffG2);
    }

}

async function writeContributions(fd, curve, contributions) {

    await fd.writeULE32(7); // Header type
    const pContributionsSize = fd.pos;
    await fd.writeULE64(0); // Temporally set to 0 length

    await fd.writeULE32(contributions.length);
    for (let i=0; i< contributions.length; i++) {
        await writeContribution$1(fd, curve, contributions[i]);
    }
    const contributionsSize = fd.pos - pContributionsSize - 8;

    const oldPos = fd.pos;

    fd.writeULE64(contributionsSize, pContributionsSize);
    fd.pos = oldPos;
}

function calculateFirstChallangeHash(curve, power, logger) {
    if (logger) logger.debug("Calculating First Challange Hash");

    const hasher = new blake2bWasm(64);

    const vG1 = new Uint8Array(curve.G1.F.n8*2);
    const vG2 = new Uint8Array(curve.G2.F.n8*2);
    curve.G1.toRprUncompressed(vG1, 0, curve.G1.g);
    curve.G2.toRprUncompressed(vG2, 0, curve.G2.g);

    hasher.update(blake2bWasm(64).digest());

    let n;

    n=(1 << power)*2 -1;
    if (logger) logger.debug("Calculate Initial Hash: tauG1");
    hashBlock(vG1, n);
    n= 1 << power;
    if (logger) logger.debug("Calculate Initial Hash: tauG2");
    hashBlock(vG2, n);
    if (logger) logger.debug("Calculate Initial Hash: alphaTauG1");
    hashBlock(vG1, n);
    if (logger) logger.debug("Calculate Initial Hash: betaTauG1");
    hashBlock(vG1, n);
    hasher.update(vG2);

    return hasher.digest();

    function hashBlock(buff, n) {
        const blockSize = 500000;
        const nBlocks = Math.floor(n / blockSize);
        const rem = n % blockSize;
        const bigBuff = new Uint8Array(blockSize * buff.byteLength);
        for (let i=0; i<blockSize; i++) {
            bigBuff.set(buff, i*buff.byteLength);
        }
        for (let i=0; i<nBlocks; i++) {
            hasher.update(bigBuff);
            if (logger) logger.debug("Initial hash: " +i*blockSize);
        }
        for (let i=0; i<rem; i++) {
            hasher.update(buff);
        }
    }
}


function keyFromBeacon(curve, challangeHash, beaconHash, numIterationsExp) {

    const rng = rngFromBeaconParams(beaconHash, numIterationsExp);

    const key = createPTauKey(curve, challangeHash, rng);

    return key;
}

/*
Header(1)
    n8
    prime
    power
tauG1(2)
    {(1<<power)*2-1} [
        G1, tau*G1, tau^2 * G1, ....
    ]
tauG2(3)
    {1<<power}[
        G2, tau*G2, tau^2 * G2, ...
    ]
alphaTauG1(4)
    {1<<power}[
        alpha*G1, alpha*tau*G1, alpha*tau^2*G1,....
    ]
betaTauG1(5)
    {1<<power} []
        beta*G1, beta*tau*G1, beta*tau^2*G1, ....
    ]
betaG2(6)
    {1}[
        beta*G2
    ]
contributions(7)
    NContributions
    {NContributions}[
        tau*G1
        tau*G2
        alpha*G1
        beta*G1
        beta*G2
        pubKey
            tau_g1s
            tau_g1sx
            tau_g2spx
            alpha_g1s
            alpha_g1sx
            alpha_g1spx
            beta_g1s
            beta_g1sx
            beta_g1spx
        partialHash (216 bytes) See https://github.com/mafintosh/blake2b-wasm/blob/23bee06945806309977af802bc374727542617c7/blake2b.wat#L9
        hashNewChallange
    ]
 */

async function newAccumulator(curve, power, fileName, logger) {

    await blake2bWasm.ready();

    const fd = await createBinFile(fileName, "ptau", 1, 7);

    await writePTauHeader(fd, curve, power, 0);

    const buffG1 = curve.G1.oneAffine;
    const buffG2 = curve.G2.oneAffine;

    // Write tauG1
    ///////////
    await startWriteSection(fd, 2);
    const nTauG1 = (1 << power) * 2 -1;
    for (let i=0; i< nTauG1; i++) {
        await fd.write(buffG1);
        if ((logger)&&((i%100000) == 0)&&i) logger.info("tauG1: " + i);
    }
    await endWriteSection(fd);

    // Write tauG2
    ///////////
    await startWriteSection(fd, 3);
    const nTauG2 = (1 << power);
    for (let i=0; i< nTauG2; i++) {
        await fd.write(buffG2);
        if ((logger)&&((i%100000) == 0)&&i) logger.log("tauG2: " + i);
    }
    await endWriteSection(fd);

    // Write alphaTauG1
    ///////////
    await startWriteSection(fd, 4);
    const nAlfaTauG1 = (1 << power);
    for (let i=0; i< nAlfaTauG1; i++) {
        await fd.write(buffG1);
        if ((logger)&&((i%100000) == 0)&&i) logger.log("alphaTauG1: " + i);
    }
    await endWriteSection(fd);

    // Write betaTauG1
    ///////////
    await startWriteSection(fd, 5);
    const nBetaTauG1 = (1 << power);
    for (let i=0; i< nBetaTauG1; i++) {
        await fd.write(buffG1);
        if ((logger)&&((i%100000) == 0)&&i) logger.log("betaTauG1: " + i);
    }
    await endWriteSection(fd);

    // Write betaG2
    ///////////
    await startWriteSection(fd, 6);
    await fd.write(buffG2);
    await endWriteSection(fd);

    // Contributions
    ///////////
    await startWriteSection(fd, 7);
    await fd.writeULE32(0); // 0 Contributions
    await endWriteSection(fd);

    await fd.close();

    const firstChallangeHash = calculateFirstChallangeHash(curve, power, logger);

    if (logger) logger.debug(formatHash(blake2bWasm(64).digest(), "Blank Contribution Hash:"));

    if (logger) logger.info(formatHash(firstChallangeHash, "First Contribution Hash:"));

    return firstChallangeHash;

}

// Format of the outpu

async function exportChallange(pTauFilename, challangeFilename, logger) {
    await blake2bWasm.ready();
    const {fd: fdFrom, sections} = await readBinFile(pTauFilename, "ptau", 1);

    const {curve, power} = await readPTauHeader(fdFrom, sections);

    const contributions = await readContributions(fdFrom, curve, sections);
    let lastResponseHash, curChallangeHash;
    if (contributions.length == 0) {
        lastResponseHash = blake2bWasm(64).digest();
        curChallangeHash = calculateFirstChallangeHash(curve, power);
    } else {
        lastResponseHash = contributions[contributions.length-1].responseHash;
        curChallangeHash = contributions[contributions.length-1].nextChallange;
    }

    if (logger) logger.info(formatHash(lastResponseHash, "Last Response Hash: "));

    if (logger) logger.info(formatHash(curChallangeHash, "New Challange Hash: "));


    const fdTo = await createOverride(challangeFilename);

    const toHash = blake2bWasm(64);
    await fdTo.write(lastResponseHash);
    toHash.update(lastResponseHash);

    await exportSection(2, "G1", (1 << power) * 2 -1, "tauG1");
    await exportSection(3, "G2", (1 << power)       , "tauG2");
    await exportSection(4, "G1", (1 << power)       , "alphaTauG1");
    await exportSection(5, "G1", (1 << power)       , "betaTauG1");
    await exportSection(6, "G2", 1                  , "betaG2");

    await fdFrom.close();
    await fdTo.close();

    const calcCurChallangeHash = toHash.digest();

    if (!hashIsEqual (curChallangeHash, calcCurChallangeHash)) {
        if (logger) logger.info(formatHash(calcCurChallangeHash, "Calc Curret Challange Hash: "));

        if (logger) logger.error("PTau file is corrupted. Calculated new challange hash does not match with the eclared one");
        throw new Error("PTau file is corrupted. Calculated new challange hash does not match with the eclared one");
    }

    return curChallangeHash;

    async function exportSection(sectionId, groupName, nPoints, sectionName) {
        const G = curve[groupName];
        const sG = G.F.n8*2;
        const nPointsChunk = Math.floor((1<<24)/sG);

        await startReadUniqueSection(fdFrom, sections, sectionId);
        for (let i=0; i< nPoints; i+= nPointsChunk) {
            if (logger) logger.debug(`Exporting ${sectionName}: ${i}/${nPoints}`);
            const n = Math.min(nPoints-i, nPointsChunk);
            let buff;
            buff = await fdFrom.read(n*sG);
            buff = await G.batchLEMtoU(buff);
            await fdTo.write(buff);
            toHash.update(buff);
        }
        await endReadSection(fdFrom);
    }


}

async function importResponse(oldPtauFilename, contributionFilename, newPTauFilename, name, importPoints, logger) {

    await blake2bWasm.ready();

    const {fd: fdOld, sections} = await readBinFile(oldPtauFilename, "ptau", 1);
    const {curve, power} = await readPTauHeader(fdOld, sections);
    const contributions = await readContributions(fdOld, curve, sections);
    const currentContribution = {};

    if (name) currentContribution.name = name;

    const sG1 = curve.F1.n8*2;
    const scG1 = curve.F1.n8; // Compresed size
    const sG2 = curve.F2.n8*2;
    const scG2 = curve.F2.n8; // Compresed size

    const fdResponse = await readExisting$1(contributionFilename);

    if  (fdResponse.totalSize !=
        64 +                            // Old Hash
        ((1<<power)*2-1)*scG1 +
        (1<<power)*scG2 +
        (1<<power)*scG1 +
        (1<<power)*scG1 +
        scG2 +
        sG1*6 + sG2*3)
        throw new Error("Size of the contribution is invalid");

    let lastChallangeHash;

    if (contributions.length>0) {
        lastChallangeHash = contributions[contributions.length-1].nextChallange;
    } else {
        lastChallangeHash = calculateFirstChallangeHash(curve, power, logger);
    }

    const fdNew = await createBinFile(newPTauFilename, "ptau", 1, 7);
    await writePTauHeader(fdNew, curve, power);

    const contributionPreviousHash = await fdResponse.read(64);

    if(!hashIsEqual(contributionPreviousHash,lastChallangeHash))
        throw new Error("Wrong contribution. this contribution is not based on the previus hash");

    const hasherResponse = new blake2bWasm(64);
    hasherResponse.update(contributionPreviousHash);

    const startSections = [];
    let res;
    res = await processSection(fdResponse, fdNew, "G1", 2, (1 << power) * 2 -1, [1], "tauG1");
    currentContribution.tauG1 = res[0];
    res = await processSection(fdResponse, fdNew, "G2", 3, (1 << power)       , [1], "tauG2");
    currentContribution.tauG2 = res[0];
    res = await processSection(fdResponse, fdNew, "G1", 4, (1 << power)       , [0], "alphaG1");
    currentContribution.alphaG1 = res[0];
    res = await processSection(fdResponse, fdNew, "G1", 5, (1 << power)       , [0], "betaG1");
    currentContribution.betaG1 = res[0];
    res = await processSection(fdResponse, fdNew, "G2", 6, 1                  , [0], "betaG2");
    currentContribution.betaG2 = res[0];

    currentContribution.partialHash = hasherResponse.getPartialHash();


    const buffKey = await fdResponse.read(curve.F1.n8*2*6+curve.F2.n8*2*3);

    currentContribution.key = fromPtauPubKeyRpr(buffKey, 0, curve, false);

    hasherResponse.update(new Uint8Array(buffKey));
    const hashResponse = hasherResponse.digest();

    if (logger) logger.info(formatHash(hashResponse, "Contribution Response Hash imported: "));

    const nextChallangeHasher = new blake2bWasm(64);
    nextChallangeHasher.update(hashResponse);

    await hashSection(fdNew, "G1", 2, (1 << power) * 2 -1, "tauG1", logger);
    await hashSection(fdNew, "G2", 3, (1 << power)       , "tauG2", logger);
    await hashSection(fdNew, "G1", 4, (1 << power)       , "alphaTauG1", logger);
    await hashSection(fdNew, "G1", 5, (1 << power)       , "betaTauG1", logger);
    await hashSection(fdNew, "G2", 6, 1                  , "betaG2", logger);

    currentContribution.nextChallange = nextChallangeHasher.digest();

    if (logger) logger.info(formatHash(currentContribution.nextChallange, "Next Challange Hash: "));

    contributions.push(currentContribution);

    await writeContributions(fdNew, curve, contributions);

    await fdResponse.close();
    await fdNew.close();
    await fdOld.close();

    return currentContribution.nextChallange;

    async function processSection(fdFrom, fdTo, groupName, sectionId, nPoints, singularPointIndexes, sectionName) {

        const G = curve[groupName];
        const scG = G.F.n8;
        const sG = G.F.n8*2;

        const singularPoints = [];

        await startWriteSection(fdTo, sectionId);
        const nPointsChunk = Math.floor((1<<24)/sG);

        startSections[sectionId] = fdTo.pos;

        for (let i=0; i< nPoints; i += nPointsChunk) {
            if (logger) logger.debug(`Importing ${sectionName}: ${i}/${nPoints}`);
            const n = Math.min(nPoints-i, nPointsChunk);

            const buffC = await fdFrom.read(n * scG);
            hasherResponse.update(buffC);

            const buffLEM = await G.batchCtoLEM(buffC);

            await fdTo.write(buffLEM);
            for (let j=0; j<singularPointIndexes.length; j++) {
                const sp = singularPointIndexes[j];
                if ((sp >=i) && (sp < i+n)) {
                    const P = G.fromRprLEM(buffLEM, (sp-i)*sG);
                    singularPoints.push(P);
                }
            }
        }

        await endWriteSection(fdTo);

        return singularPoints;
    }


    async function hashSection(fdTo, groupName, sectionId, nPoints, sectionName, logger) {

        const G = curve[groupName];
        const sG = G.F.n8*2;
        const nPointsChunk = Math.floor((1<<24)/sG);

        const oldPos = fdTo.pos;
        fdTo.pos = startSections[sectionId];

        for (let i=0; i< nPoints; i += nPointsChunk) {
            if (logger) logger.debug(`Hashing ${sectionName}: ${i}/${nPoints}`);
            const n = Math.min(nPoints-i, nPointsChunk);

            const buffLEM = await fdTo.read(n * sG);

            const buffU = await G.batchLEMtoU(buffLEM);

            nextChallangeHasher.update(buffU);
        }

        fdTo.pos = oldPos;
    }

}

const sameRatio$1 = sameRatio;

async function verifyContribution(curve, cur, prev, logger) {
    let sr;
    if (cur.type == 1) {    // Verify the beacon.
        const beaconKey = keyFromBeacon(curve, prev.nextChallange, cur.beaconHash, cur.numIterationsExp);

        if (!curve.G1.eq(cur.key.tau.g1_s, beaconKey.tau.g1_s)) {
            if (logger) logger.error(`BEACON key (tauG1_s) is not generated correctly in challange #${cur.id}  ${cur.name || ""}` );
            return false;
        }
        if (!curve.G1.eq(cur.key.tau.g1_sx, beaconKey.tau.g1_sx)) {
            if (logger) logger.error(`BEACON key (tauG1_sx) is not generated correctly in challange #${cur.id}  ${cur.name || ""}` );
            return false;
        }
        if (!curve.G2.eq(cur.key.tau.g2_spx, beaconKey.tau.g2_spx)) {
            if (logger) logger.error(`BEACON key (tauG2_spx) is not generated correctly in challange #${cur.id}  ${cur.name || ""}` );
            return false;
        }

        if (!curve.G1.eq(cur.key.alpha.g1_s, beaconKey.alpha.g1_s)) {
            if (logger) logger.error(`BEACON key (alphaG1_s) is not generated correctly in challange #${cur.id}  ${cur.name || ""}` );
            return false;
        }
        if (!curve.G1.eq(cur.key.alpha.g1_sx, beaconKey.alpha.g1_sx)) {
            if (logger) logger.error(`BEACON key (alphaG1_sx) is not generated correctly in challange #${cur.id}  ${cur.name || ""}` );
            return false;
        }
        if (!curve.G2.eq(cur.key.alpha.g2_spx, beaconKey.alpha.g2_spx)) {
            if (logger) logger.error(`BEACON key (alphaG2_spx) is not generated correctly in challange #${cur.id}  ${cur.name || ""}` );
            return false;
        }

        if (!curve.G1.eq(cur.key.beta.g1_s, beaconKey.beta.g1_s)) {
            if (logger) logger.error(`BEACON key (betaG1_s) is not generated correctly in challange #${cur.id}  ${cur.name || ""}` );
            return false;
        }
        if (!curve.G1.eq(cur.key.beta.g1_sx, beaconKey.beta.g1_sx)) {
            if (logger) logger.error(`BEACON key (betaG1_sx) is not generated correctly in challange #${cur.id}  ${cur.name || ""}` );
            return false;
        }
        if (!curve.G2.eq(cur.key.beta.g2_spx, beaconKey.beta.g2_spx)) {
            if (logger) logger.error(`BEACON key (betaG2_spx) is not generated correctly in challange #${cur.id}  ${cur.name || ""}` );
            return false;
        }
    }

    cur.key.tau.g2_sp = curve.G2.toAffine(getG2sp(curve, 0, prev.nextChallange, cur.key.tau.g1_s, cur.key.tau.g1_sx));
    cur.key.alpha.g2_sp = curve.G2.toAffine(getG2sp(curve, 1, prev.nextChallange, cur.key.alpha.g1_s, cur.key.alpha.g1_sx));
    cur.key.beta.g2_sp = curve.G2.toAffine(getG2sp(curve, 2, prev.nextChallange, cur.key.beta.g1_s, cur.key.beta.g1_sx));

    sr = await sameRatio$1(curve, cur.key.tau.g1_s, cur.key.tau.g1_sx, cur.key.tau.g2_sp, cur.key.tau.g2_spx);
    if (sr !== true) {
        if (logger) logger.error("INVALID key (tau) in challange #"+cur.id);
        return false;
    }

    sr = await sameRatio$1(curve, cur.key.alpha.g1_s, cur.key.alpha.g1_sx, cur.key.alpha.g2_sp, cur.key.alpha.g2_spx);
    if (sr !== true) {
        if (logger) logger.error("INVALID key (alpha) in challange #"+cur.id);
        return false;
    }

    sr = await sameRatio$1(curve, cur.key.beta.g1_s, cur.key.beta.g1_sx, cur.key.beta.g2_sp, cur.key.beta.g2_spx);
    if (sr !== true) {
        if (logger) logger.error("INVALID key (beta) in challange #"+cur.id);
        return false;
    }

    sr = await sameRatio$1(curve, prev.tauG1, cur.tauG1, cur.key.tau.g2_sp, cur.key.tau.g2_spx);
    if (sr !== true) {
        if (logger) logger.error("INVALID tau*G1. challange #"+cur.id+" It does not follow the previous contribution");
        return false;
    }

    sr = await sameRatio$1(curve,  cur.key.tau.g1_s, cur.key.tau.g1_sx, prev.tauG2, cur.tauG2);
    if (sr !== true) {
        if (logger) logger.error("INVALID tau*G2. challange #"+cur.id+" It does not follow the previous contribution");
        return false;
    }

    sr = await sameRatio$1(curve, prev.alphaG1, cur.alphaG1, cur.key.alpha.g2_sp, cur.key.alpha.g2_spx);
    if (sr !== true) {
        if (logger) logger.error("INVALID alpha*G1. challange #"+cur.id+" It does not follow the previous contribution");
        return false;
    }

    sr = await sameRatio$1(curve, prev.betaG1, cur.betaG1, cur.key.beta.g2_sp, cur.key.beta.g2_spx);
    if (sr !== true) {
        if (logger) logger.error("INVALID beta*G1. challange #"+cur.id+" It does not follow the previous contribution");
        return false;
    }

    sr = await sameRatio$1(curve,  cur.key.beta.g1_s, cur.key.beta.g1_sx, prev.betaG2, cur.betaG2);
    if (sr !== true) {
        if (logger) logger.error("INVALID beta*G2. challange #"+cur.id+"It does not follow the previous contribution");
        return false;
    }

    if (logger) logger.info("Powers Of tau file OK!");
    return true;
}

async function verify(tauFilename, logger) {
    let sr;
    await blake2bWasm.ready();

    const {fd, sections} = await readBinFile(tauFilename, "ptau", 1);
    const {curve, power, ceremonyPower} = await readPTauHeader(fd, sections);
    const contrs = await readContributions(fd, curve, sections);

    if (logger) logger.debug("power: 2**" + power);
    // Verify Last contribution

    if (logger) logger.debug("Computing initial contribution hash");
    const initialContribution = {
        tauG1: curve.G1.g,
        tauG2: curve.G2.g,
        alphaG1: curve.G1.g,
        betaG1: curve.G1.g,
        betaG2: curve.G2.g,
        nextChallange: calculateFirstChallangeHash(curve, ceremonyPower, logger),
        responseHash: blake2bWasm(64).digest()
    };

    if (contrs.length == 0) {
        if (logger) logger.error("This file has no contribution! It cannot be used in production");
        return false;
    }

    let prevContr;
    if (contrs.length>1) {
        prevContr = contrs[contrs.length-2];
    } else {
        prevContr = initialContribution;
    }
    const curContr = contrs[contrs.length-1];
    if (logger) logger.debug("Validating contribution #"+contrs[contrs.length-1].id);
    const res = await verifyContribution(curve, curContr, prevContr, logger);
    if (!res) return false;


    const nextContributionHasher = blake2bWasm(64);
    nextContributionHasher.update(curContr.responseHash);

    // Verify powers and compute nextChallangeHash

    // await test();

    // Verify Section tau*G1
    if (logger) logger.debug("Verifying powers in tau*G1 section");
    const rTau1 = await processSection(2, "G1", "tauG1", (1 << power)*2-1, [0, 1], logger);
    sr = await sameRatio$1(curve, rTau1.R1, rTau1.R2, curve.G2.g, curContr.tauG2);
    if (sr !== true) {
        if (logger) logger.error("tauG1 section. Powers do not match");
        return false;
    }
    if (!curve.G1.eq(curve.G1.g, rTau1.singularPoints[0])) {
        if (logger) logger.error("First element of tau*G1 section must be the generator");
        return false;
    }
    if (!curve.G1.eq(curContr.tauG1, rTau1.singularPoints[1])) {
        if (logger) logger.error("Second element of tau*G1 section does not match the one in the contribution section");
        return false;
    }

    // await test();

    // Verify Section tau*G2
    if (logger) logger.debug("Verifying powers in tau*G2 section");
    const rTau2 = await processSection(3, "G2", "tauG2", 1 << power, [0, 1],  logger);
    sr = await sameRatio$1(curve, curve.G1.g, curContr.tauG1, rTau2.R1, rTau2.R2);
    if (sr !== true) {
        if (logger) logger.error("tauG2 section. Powers do not match");
        return false;
    }
    if (!curve.G2.eq(curve.G2.g, rTau2.singularPoints[0])) {
        if (logger) logger.error("First element of tau*G2 section must be the generator");
        return false;
    }
    if (!curve.G2.eq(curContr.tauG2, rTau2.singularPoints[1])) {
        if (logger) logger.error("Second element of tau*G2 section does not match the one in the contribution section");
        return false;
    }

    // Verify Section alpha*tau*G1
    if (logger) logger.debug("Verifying powers in alpha*tau*G1 section");
    const rAlphaTauG1 = await processSection(4, "G1", "alphatauG1", 1 << power, [0], logger);
    sr = await sameRatio$1(curve, rAlphaTauG1.R1, rAlphaTauG1.R2, curve.G2.g, curContr.tauG2);
    if (sr !== true) {
        if (logger) logger.error("alphaTauG1 section. Powers do not match");
        return false;
    }
    if (!curve.G1.eq(curContr.alphaG1, rAlphaTauG1.singularPoints[0])) {
        if (logger) logger.error("First element of alpha*tau*G1 section (alpha*G1) does not match the one in the contribution section");
        return false;
    }

    // Verify Section beta*tau*G1
    if (logger) logger.debug("Verifying powers in beta*tau*G1 section");
    const rBetaTauG1 = await processSection(5, "G1", "betatauG1", 1 << power, [0], logger);
    sr = await sameRatio$1(curve, rBetaTauG1.R1, rBetaTauG1.R2, curve.G2.g, curContr.tauG2);
    if (sr !== true) {
        if (logger) logger.error("betaTauG1 section. Powers do not match");
        return false;
    }
    if (!curve.G1.eq(curContr.betaG1, rBetaTauG1.singularPoints[0])) {
        if (logger) logger.error("First element of beta*tau*G1 section (beta*G1) does not match the one in the contribution section");
        return false;
    }

    //Verify Beta G2
    const betaG2 = await processSectionBetaG2(logger);
    if (!curve.G2.eq(curContr.betaG2, betaG2)) {
        if (logger) logger.error("betaG2 element in betaG2 section does not match the one in the contribution section");
        return false;
    }


    const nextContributionHash = nextContributionHasher.digest();

    // Check the nextChallangeHash
    if (!hashIsEqual(nextContributionHash,curContr.nextChallange)) {
        if (logger) logger.error("Hash of the values does not match the next challange of the last contributor in the contributions section");
        return false;
    }

    if (logger) logger.info(formatHash(nextContributionHash, "Next challange hash: "));

    // Verify Previous contributions

    printContribution(curContr, prevContr);
    for (let i = contrs.length-2; i>=0; i--) {
        const curContr = contrs[i];
        const prevContr =  (i>0) ? contrs[i-1] : initialContribution;
        const res = await verifyContribution(curve, curContr, prevContr, logger);
        if (!res) return false;
        printContribution(curContr, prevContr);
    }
    if (logger) logger.info("-----------------------------------------------------");

    if ((!sections[12]) || (!sections[13]) || (!sections[14]) || (!sections[15])) {
        if (logger) logger.warn(
            "this file does not contain phase2 precalculated values. Please run: \n" +
            "   snarkjs \"powersoftau preparephase2\" to prepare this file to be used in the phase2 ceremony."
        );
    } else {
        let res;
        res = await verifyLagrangeEvaluations("G1", 2, 12, "tauG1", logger);
        if (!res) return false;
        res = await verifyLagrangeEvaluations("G2", 3, 13, "tauG2", logger);
        if (!res) return false;
        res = await verifyLagrangeEvaluations("G1", 4, 14, "alphaTauG1", logger);
        if (!res) return false;
        res = await verifyLagrangeEvaluations("G1", 5, 15, "betaTauG1", logger);
        if (!res) return false;
    }

    await fd.close();

    return true;

    function printContribution(curContr, prevContr) {
        if (!logger) return;
        logger.info("-----------------------------------------------------");
        logger.info(`Contribution #${curContr.id}: ${curContr.name ||""}`);

        logger.info(formatHash(curContr.nextChallange, "Next Challange: "));

        const buffV  = new Uint8Array(curve.G1.F.n8*2*6+curve.G2.F.n8*2*3);
        toPtauPubKeyRpr(buffV, 0, curve, curContr.key, false);

        const responseHasher = blake2bWasm(64);
        responseHasher.setPartialHash(curContr.partialHash);
        responseHasher.update(buffV);
        const responseHash = responseHasher.digest();

        logger.info(formatHash(responseHash, "Response Hash:"));

        logger.info(formatHash(prevContr.nextChallange, "Response Hash:"));

        if (curContr.type == 1) {
            logger.info(`Beacon generator: ${byteArray2hex(curContr.beaconHash)}`);
            logger.info(`Beacon iterations Exp: ${curContr.numIterationsExp}`);
        }

    }

    async function processSectionBetaG2(logger) {
        const G = curve.G2;
        const sG = G.F.n8*2;
        const buffUv = new Uint8Array(sG);

        if (!sections[6])  {
            logger.error("File has no BetaG2 section");
            throw new Error("File has no BetaG2 section");
        }
        if (sections[6].length>1) {
            logger.error("File has no BetaG2 section");
            throw new Error("File has more than one GetaG2 section");
        }
        fd.pos = sections[6][0].p;

        const buff = await fd.read(sG);
        const P = G.fromRprLEM(buff);

        G.toRprUncompressed(buffUv, 0, P);
        nextContributionHasher.update(buffUv);

        return P;
    }

    async function processSection(idSection, groupName, sectionName, nPoints, singularPointIndexes, logger) {
        const MAX_CHUNK_SIZE = 1<<16;
        const G = curve[groupName];
        const sG = G.F.n8*2;
        await startReadUniqueSection(fd, sections, idSection);

        const singularPoints = [];

        let R1 = G.zero;
        let R2 = G.zero;

        let lastBase = G.zero;

        for (let i=0; i<nPoints; i += MAX_CHUNK_SIZE) {
            if (logger) logger.debug(`points relations: ${sectionName}: ${i}/${nPoints} `);
            const n = Math.min(nPoints - i, MAX_CHUNK_SIZE);
            const bases = await fd.read(n*sG);

            const basesU = await G.batchLEMtoU(bases);
            nextContributionHasher.update(basesU);

            const scalars = new Uint8Array(4*(n-1));
            crypto.randomFillSync(scalars);


            if (i>0) {
                const firstBase = G.fromRprLEM(bases, 0);
                const r = crypto.randomBytes(4).readUInt32BE(0, true);

                R1 = G.add(R1, G.timesScalar(lastBase, r));
                R2 = G.add(R2, G.timesScalar(firstBase, r));
            }

            const r1 = await G.multiExpAffine(bases.slice(0, (n-1)*sG), scalars);
            const r2 = await G.multiExpAffine(bases.slice(sG), scalars);

            R1 = G.add(R1, r1);
            R2 = G.add(R2, r2);

            lastBase = G.fromRprLEM( bases, (n-1)*sG);

            for (let j=0; j<singularPointIndexes.length; j++) {
                const sp = singularPointIndexes[j];
                if ((sp >=i) && (sp < i+n)) {
                    const P = G.fromRprLEM(bases, (sp-i)*sG);
                    singularPoints.push(P);
                }
            }

        }
        await endReadSection(fd);

        return {
            R1: R1,
            R2: R2,
            singularPoints: singularPoints
        };

    }

    async function verifyLagrangeEvaluations(gName, tauSection, lagrangeSection, sectionName, logger) {

        if (logger) logger.debug(`Verifying phase2 calculated values ${sectionName}...`);
        const G = curve[gName];
        const sG = G.F.n8*2;

        const seed= new Array(8);
        for (let i=0; i<8; i++) {
            seed[i] = crypto.randomBytes(4).readUInt32BE(0, true);
        }

        const rng = new ChaCha(seed);


        for (let p=0; p<= power; p ++) {
            const res = await verifyPower(p);
            if (!res) return false;
        }

        return true;

        async function verifyPower(p) {
            if (logger) logger.debug(`Power ${p}...`);
            const n8r = curve.Fr.n8;
            const nPoints = 1<<p;
            let buff_r = new Uint8Array(nPoints * n8r);
            let buffG;

            for (let i=0; i<nPoints; i++) {
                const e = curve.Fr.fromRng(rng);
                curve.Fr.toRprLE(buff_r, i*n8r, e);
            }

            await startReadUniqueSection(fd, sections, tauSection);
            buffG = await fd.read(nPoints*sG);
            await endReadSection(fd, true);

            const resTau = await G.multiExpAffine(buffG, buff_r);

            buff_r = await curve.Fr.batchToMontgomery(buff_r);
            buff_r = await curve.Fr.fft(buff_r);
            buff_r = await curve.Fr.batchFromMontgomery(buff_r);

            await startReadUniqueSection(fd, sections, lagrangeSection);
            fd.pos += sG*((1 << p)-1);
            buffG = await fd.read(nPoints*sG);
            await endReadSection(fd, true);

            const resLagrange = await G.multiExpAffine(buffG, buff_r);

            if (!G.eq(resTau, resLagrange)) {
                if (logger) logger.error("Phase2 caclutation does not match with powers of tau");
                return false;
            }

            return true;
        }
    }
}

/*
    This function creates a new section in the fdTo file with id idSection.
    It multiplies the pooints in fdFrom by first, first*inc, first*inc^2, ....
    nPoint Times.
    It also updates the newChallangeHasher with the new points
*/

async function applyKeyToSection(fdOld, sections, fdNew, idSection, curve, groupName, first, inc, sectionName, logger) {
    const MAX_CHUNK_SIZE = 1 << 16;
    const G = curve[groupName];
    const sG = G.F.n8*2;
    const nPoints = sections[idSection][0].size / sG;

    await startReadUniqueSection(fdOld, sections,idSection );
    await startWriteSection(fdNew, idSection);

    let t = first;
    for (let i=0; i<nPoints; i += MAX_CHUNK_SIZE) {
        if (logger) logger.debug(`Applying key: ${sectionName}: ${i}/${nPoints}`);
        const n= Math.min(nPoints - i, MAX_CHUNK_SIZE);
        let buff;
        buff = await fdOld.read(n*sG);
        buff = await G.batchApplyKey(buff, t, inc);
        await fdNew.write(buff);
        t = curve.Fr.mul(t, curve.Fr.exp(inc, n));
    }

    await endWriteSection(fdNew);
    await endReadSection(fdOld);
}



async function applyKeyToChallangeSection(fdOld, fdNew, responseHasher, curve, groupName, nPoints, first, inc, formatOut, sectionName, logger) {
    const G = curve[groupName];
    const sG = G.F.n8*2;
    const chunkSize = Math.floor((1<<20) / sG);   // 128Mb chunks
    let t = first;
    for (let i=0 ; i<nPoints ; i+= chunkSize) {
        if (logger) logger.debug(`Applying key ${sectionName}: ${i}/${nPoints}`);
        const n= Math.min(nPoints-i, chunkSize );
        const buffInU = await fdOld.read(n * sG);
        const buffInLEM = await G.batchUtoLEM(buffInU);
        const buffOutLEM = await G.batchApplyKey(buffInLEM, t, inc);
        let buffOut;
        if (formatOut == "COMPRESSED") {
            buffOut = await G.batchLEMtoC(buffOutLEM);
        } else {
            buffOut = await G.batchLEMtoU(buffOutLEM);
        }

        if (responseHasher) responseHasher.update(buffOut);
        await fdNew.write(buffOut);
        t = curve.Fr.mul(t, curve.Fr.exp(inc, n));
    }
}

// Format of the output

async function challangeContribute(curve, challangeFilename, responesFileName, entropy, logger) {
    await blake2bWasm.ready();

    const fdFrom = await readExisting$1(challangeFilename);


    const sG1 = curve.F1.n64*8*2;
    const sG2 = curve.F2.n64*8*2;
    const domainSize = (fdFrom.totalSize + sG1 - 64 - sG2) / (4*sG1 + sG2);
    let e = domainSize;
    let power = 0;
    while (e>1) {
        e = e /2;
        power += 1;
    }

    if (1<<power != domainSize) throw new Error("Invalid file size");
    if (logger) logger.debug("Power to tau size: "+power);

    const rng = await getRandomRng(entropy);

    const fdTo = await createOverride(responesFileName);

    // Calculate the hash
    if (logger) logger.debug("Hashing challange");
    const challangeHasher = blake2bWasm(64);
    for (let i=0; i<fdFrom.totalSize; i+= fdFrom.pageSize) {
        const s = Math.min(fdFrom.totalSize - i, fdFrom.pageSize);
        const buff = await fdFrom.read(s);
        challangeHasher.update(buff);
    }

    const claimedHash = await fdFrom.read(64, 0);
    if (logger) logger.info(formatHash(claimedHash, "Claimed Previus Response Hash: "));

    const challangeHash = challangeHasher.digest();
    if (logger) logger.info(formatHash(challangeHash, "Current Challange Hash: "));

    const key = createPTauKey(curve, challangeHash, rng);

    if (logger) {
        ["tau", "alpha", "beta"].forEach( (k) => {
            logger.debug(k + ".g1_s: " + curve.G1.toString(key[k].g1_s, 16));
            logger.debug(k + ".g1_sx: " + curve.G1.toString(key[k].g1_sx, 16));
            logger.debug(k + ".g2_sp: " + curve.G2.toString(key[k].g2_sp, 16));
            logger.debug(k + ".g2_spx: " + curve.G2.toString(key[k].g2_spx, 16));
            logger.debug("");
        });
    }

    const responseHasher = blake2bWasm(64);

    await fdTo.write(challangeHash);
    responseHasher.update(challangeHash);

    await applyKeyToChallangeSection(fdFrom, fdTo, responseHasher, curve, "G1", (1<<power)*2-1, curve.Fr.one    , key.tau.prvKey, "COMPRESSED", "tauG1"     , logger );
    await applyKeyToChallangeSection(fdFrom, fdTo, responseHasher, curve, "G2", (1<<power)    , curve.Fr.one    , key.tau.prvKey, "COMPRESSED", "tauG2"     , logger );
    await applyKeyToChallangeSection(fdFrom, fdTo, responseHasher, curve, "G1", (1<<power)    , key.alpha.prvKey, key.tau.prvKey, "COMPRESSED", "alphaTauG1", logger );
    await applyKeyToChallangeSection(fdFrom, fdTo, responseHasher, curve, "G1", (1<<power)    , key.beta.prvKey , key.tau.prvKey, "COMPRESSED", "betaTauG1" , logger );
    await applyKeyToChallangeSection(fdFrom, fdTo, responseHasher, curve, "G2", 1             , key.beta.prvKey , key.tau.prvKey, "COMPRESSED", "betaTauG2" , logger );

    // Write and hash key
    const buffKey = new Uint8Array(curve.F1.n8*2*6+curve.F2.n8*2*3);
    toPtauPubKeyRpr(buffKey, 0, curve, key, false);
    await fdTo.write(buffKey);
    responseHasher.update(buffKey);
    const responseHash = responseHasher.digest();
    if (logger) logger.info(formatHash(responseHash, "Contribution Response Hash: "));

    await fdTo.close();
    await fdFrom.close();
}

async function beacon(oldPtauFilename, newPTauFilename, name,  beaconHashStr,numIterationsExp, logger) {
    const beaconHash = hex2ByteArray(beaconHashStr);
    if (   (beaconHash.byteLength == 0)
        || (beaconHash.byteLength*2 !=beaconHashStr.length))
    {
        if (logger) logger.error("Invalid Beacon Hash. (It must be a valid hexadecimal sequence)");
        return false;
    }
    if (beaconHash.length>=256) {
        if (logger) logger.error("Maximum lenght of beacon hash is 255 bytes");
        return false;
    }

    numIterationsExp = parseInt(numIterationsExp);
    if ((numIterationsExp<10)||(numIterationsExp>63)) {
        if (logger) logger.error("Invalid numIterationsExp. (Must be between 10 and 63)");
        return false;
    }


    await blake2bWasm.ready();

    const {fd: fdOld, sections} = await readBinFile(oldPtauFilename, "ptau", 1);
    const {curve, power, ceremonyPower} = await readPTauHeader(fdOld, sections);
    if (power != ceremonyPower) {
        if (logger) logger.error("This file has been reduced. You cannot contribute into a reduced file.");
        return false;
    }
    if (sections[12]) {
        if (logger) logger.warn("Contributing into a file that has phase2 calculated. You will have to prepare phase2 again.");
    }
    const contributions = await readContributions(fdOld, curve, sections);
    const curContribution = {
        name: name,
        type: 1, // Beacon
        numIterationsExp: numIterationsExp,
        beaconHash: beaconHash
    };

    let lastChallangeHash;

    if (contributions.length>0) {
        lastChallangeHash = contributions[contributions.length-1].nextChallange;
    } else {
        lastChallangeHash = calculateFirstChallangeHash(curve, power, logger);
    }

    curContribution.key = keyFromBeacon(curve, lastChallangeHash, beaconHash, numIterationsExp);

    const responseHasher = new blake2bWasm(64);
    responseHasher.update(lastChallangeHash);

    const fdNew = await createBinFile(newPTauFilename, "ptau", 1, 7);
    await writePTauHeader(fdNew, curve, power);

    const startSections = [];

    let firstPoints;
    firstPoints = await processSection(2, "G1",  (1<<power) * 2 -1, curve.Fr.e(1), curContribution.key.tau.prvKey, "tauG1", logger );
    curContribution.tauG1 = firstPoints[1];
    firstPoints = await processSection(3, "G2",  (1<<power) , curve.Fr.e(1), curContribution.key.tau.prvKey, "tauG2", logger );
    curContribution.tauG2 = firstPoints[1];
    firstPoints = await processSection(4, "G1",  (1<<power) , curContribution.key.alpha.prvKey, curContribution.key.tau.prvKey, "alphaTauG1", logger );
    curContribution.alphaG1 = firstPoints[0];
    firstPoints = await processSection(5, "G1",  (1<<power) , curContribution.key.beta.prvKey, curContribution.key.tau.prvKey, "betaTauG1", logger );
    curContribution.betaG1 = firstPoints[0];
    firstPoints = await processSection(6, "G2",  1, curContribution.key.beta.prvKey, curContribution.key.tau.prvKey, "betaTauG2", logger );
    curContribution.betaG2 = firstPoints[0];

    curContribution.partialHash = responseHasher.getPartialHash();

    const buffKey = new Uint8Array(curve.F1.n8*2*6+curve.F2.n8*2*3);

    toPtauPubKeyRpr(buffKey, 0, curve, curContribution.key, false);

    responseHasher.update(new Uint8Array(buffKey));
    const hashResponse = responseHasher.digest();

    if (logger) logger.info(formatHash(hashResponse, "Contribution Response Hash imported: "));

    const nextChallangeHasher = new blake2bWasm(64);
    nextChallangeHasher.update(hashResponse);

    await hashSection(fdNew, "G1", 2, (1 << power) * 2 -1, "tauG1", logger);
    await hashSection(fdNew, "G2", 3, (1 << power)       , "tauG2", logger);
    await hashSection(fdNew, "G1", 4, (1 << power)       , "alphaTauG1", logger);
    await hashSection(fdNew, "G1", 5, (1 << power)       , "betaTauG1", logger);
    await hashSection(fdNew, "G2", 6, 1                  , "betaG2", logger);

    curContribution.nextChallange = nextChallangeHasher.digest();

    if (logger) logger.info(formatHash(curContribution.nextChallange, "Next Challange Hash: "));

    contributions.push(curContribution);

    await writeContributions(fdNew, curve, contributions);

    await fdOld.close();
    await fdNew.close();

    return hashResponse;

    async function processSection(sectionId, groupName, NPoints, first, inc, sectionName, logger) {
        const res = [];
        fdOld.pos = sections[sectionId][0].p;

        await startWriteSection(fdNew, sectionId);

        startSections[sectionId] = fdNew.pos;

        const G = curve[groupName];
        const sG = G.F.n8*2;
        const chunkSize = Math.floor((1<<20) / sG);   // 128Mb chunks
        let t = first;
        for (let i=0 ; i<NPoints ; i+= chunkSize) {
            if (logger) logger.debug(`applying key${sectionName}: ${i}/${NPoints}`);
            const n= Math.min(NPoints-i, chunkSize );
            const buffIn = await fdOld.read(n * sG);
            const buffOutLEM = await G.batchApplyKey(buffIn, t, inc);

            /* Code to test the case where we don't have the 2^m-2 component
            if (sectionName== "tauG1") {
                const bz = new Uint8Array(64);
                buffOutLEM.set(bz, 64*((1 << power) - 1 ));
            }
            */

            const promiseWrite = fdNew.write(buffOutLEM);
            const buffOutC = await G.batchLEMtoC(buffOutLEM);

            responseHasher.update(buffOutC);
            await promiseWrite;
            if (i==0)   // Return the 2 first points.
                for (let j=0; j<Math.min(2, NPoints); j++)
                    res.push(G.fromRprLEM(buffOutLEM, j*sG));
            t = curve.Fr.mul(t, curve.Fr.exp(inc, n));
        }

        await endWriteSection(fdNew);

        return res;
    }


    async function hashSection(fdTo, groupName, sectionId, nPoints, sectionName, logger) {

        const G = curve[groupName];
        const sG = G.F.n8*2;
        const nPointsChunk = Math.floor((1<<24)/sG);

        const oldPos = fdTo.pos;
        fdTo.pos = startSections[sectionId];

        for (let i=0; i< nPoints; i += nPointsChunk) {
            if (logger) logger.debug(`Hashing ${sectionName}: ${i}/${nPoints}`);
            const n = Math.min(nPoints-i, nPointsChunk);

            const buffLEM = await fdTo.read(n * sG);

            const buffU = await G.batchLEMtoU(buffLEM);

            nextChallangeHasher.update(buffU);
        }

        fdTo.pos = oldPos;
    }
}

// Format of the output

async function contribute(oldPtauFilename, newPTauFilename, name, entropy, logger) {
    await blake2bWasm.ready();

    const {fd: fdOld, sections} = await readBinFile(oldPtauFilename, "ptau", 1);
    const {curve, power, ceremonyPower} = await readPTauHeader(fdOld, sections);
    if (power != ceremonyPower) {
        if (logger) logger.error("This file has been reduced. You cannot contribute into a reduced file.");
        throw new Error("This file has been reduced. You cannot contribute into a reduced file.");
    }
    if (sections[12]) {
        if (logger) logger.warn("WARNING: Contributing into a file that has phase2 calculated. You will have to prepare phase2 again.");
    }
    const contributions = await readContributions(fdOld, curve, sections);
    const curContribution = {
        name: name,
        type: 0, // Beacon
    };

    let lastChallangeHash;

    const rng = await getRandomRng(entropy);

    if (contributions.length>0) {
        lastChallangeHash = contributions[contributions.length-1].nextChallange;
    } else {
        lastChallangeHash = calculateFirstChallangeHash(curve, power, logger);
    }

    // Generate a random key


    curContribution.key = createPTauKey(curve, lastChallangeHash, rng);


    const responseHasher = new blake2bWasm(64);
    responseHasher.update(lastChallangeHash);

    const fdNew = await createBinFile(newPTauFilename, "ptau", 1, 7);
    await writePTauHeader(fdNew, curve, power);

    const startSections = [];

    let firstPoints;
    firstPoints = await processSection(2, "G1",  (1<<power) * 2 -1, curve.Fr.e(1), curContribution.key.tau.prvKey, "tauG1" );
    curContribution.tauG1 = firstPoints[1];
    firstPoints = await processSection(3, "G2",  (1<<power) , curve.Fr.e(1), curContribution.key.tau.prvKey, "tauG2" );
    curContribution.tauG2 = firstPoints[1];
    firstPoints = await processSection(4, "G1",  (1<<power) , curContribution.key.alpha.prvKey, curContribution.key.tau.prvKey, "alphaTauG1" );
    curContribution.alphaG1 = firstPoints[0];
    firstPoints = await processSection(5, "G1",  (1<<power) , curContribution.key.beta.prvKey, curContribution.key.tau.prvKey, "betaTauG1" );
    curContribution.betaG1 = firstPoints[0];
    firstPoints = await processSection(6, "G2",  1, curContribution.key.beta.prvKey, curContribution.key.tau.prvKey, "betaTauG2" );
    curContribution.betaG2 = firstPoints[0];

    curContribution.partialHash = responseHasher.getPartialHash();

    const buffKey = new Uint8Array(curve.F1.n8*2*6+curve.F2.n8*2*3);

    toPtauPubKeyRpr(buffKey, 0, curve, curContribution.key, false);

    responseHasher.update(new Uint8Array(buffKey));
    const hashResponse = responseHasher.digest();

    if (logger) logger.info(formatHash(hashResponse, "Contribution Response Hash imported: "));

    const nextChallangeHasher = new blake2bWasm(64);
    nextChallangeHasher.update(hashResponse);

    await hashSection(fdNew, "G1", 2, (1 << power) * 2 -1, "tauG1");
    await hashSection(fdNew, "G2", 3, (1 << power)       , "tauG2");
    await hashSection(fdNew, "G1", 4, (1 << power)       , "alphaTauG1");
    await hashSection(fdNew, "G1", 5, (1 << power)       , "betaTauG1");
    await hashSection(fdNew, "G2", 6, 1                  , "betaG2");

    curContribution.nextChallange = nextChallangeHasher.digest();

    if (logger) logger.info(formatHash(curContribution.nextChallange, "Next Challange Hash: "));

    contributions.push(curContribution);

    await writeContributions(fdNew, curve, contributions);

    await fdOld.close();
    await fdNew.close();

    return hashResponse;

    async function processSection(sectionId, groupName, NPoints, first, inc, sectionName) {
        const res = [];
        fdOld.pos = sections[sectionId][0].p;

        await startWriteSection(fdNew, sectionId);

        startSections[sectionId] = fdNew.pos;

        const G = curve[groupName];
        const sG = G.F.n8*2;
        const chunkSize = Math.floor((1<<20) / sG);   // 128Mb chunks
        let t = first;
        for (let i=0 ; i<NPoints ; i+= chunkSize) {
            if (logger) logger.debug(`processing: ${sectionName}: ${i}/${NPoints}`);
            const n= Math.min(NPoints-i, chunkSize );
            const buffIn = await fdOld.read(n * sG);
            const buffOutLEM = await G.batchApplyKey(buffIn, t, inc);

            /* Code to test the case where we don't have the 2^m-2 component
            if (sectionName== "tauG1") {
                const bz = new Uint8Array(64);
                buffOutLEM.set(bz, 64*((1 << power) - 1 ));
            }
            */

            const promiseWrite = fdNew.write(buffOutLEM);
            const buffOutC = await G.batchLEMtoC(buffOutLEM);

            responseHasher.update(buffOutC);
            await promiseWrite;
            if (i==0)   // Return the 2 first points.
                for (let j=0; j<Math.min(2, NPoints); j++)
                    res.push(G.fromRprLEM(buffOutLEM, j*sG));
            t = curve.Fr.mul(t, curve.Fr.exp(inc, n));
        }

        await endWriteSection(fdNew);

        return res;
    }


    async function hashSection(fdTo, groupName, sectionId, nPoints, sectionName) {

        const G = curve[groupName];
        const sG = G.F.n8*2;
        const nPointsChunk = Math.floor((1<<24)/sG);

        const oldPos = fdTo.pos;
        fdTo.pos = startSections[sectionId];

        for (let i=0; i< nPoints; i += nPointsChunk) {
            if ((logger)&&i) logger.debug(`Hashing ${sectionName}: ` + i);
            const n = Math.min(nPoints-i, nPointsChunk);

            const buffLEM = await fdTo.read(n * sG);

            const buffU = await G.batchLEMtoU(buffLEM);

            nextChallangeHasher.update(buffU);
        }

        fdTo.pos = oldPos;
    }


}

async function preparePhase2(oldPtauFilename, newPTauFilename, logger) {

    const {fd: fdOld, sections} = await readBinFile(oldPtauFilename, "ptau", 1);
    const {curve, power} = await readPTauHeader(fdOld, sections);

    const fdNew = await createBinFile(newPTauFilename, "ptau", 1, 11);
    await writePTauHeader(fdNew, curve, power);

    // const fdTmp = await fastFile.createOverride(newPTauFilename+ ".tmp");
    const fdTmp = await createOverride({type: "mem"});

    await copySection(fdOld, sections, fdNew, 2);
    await copySection(fdOld, sections, fdNew, 3);
    await copySection(fdOld, sections, fdNew, 4);
    await copySection(fdOld, sections, fdNew, 5);
    await copySection(fdOld, sections, fdNew, 6);
    await copySection(fdOld, sections, fdNew, 7);

    await processSection(2, 12, "G1", "tauG1" );
    await processSection(3, 13, "G2", "tauG2" );
    await processSection(4, 14, "G1", "alphaTauG1" );
    await processSection(5, 15, "G1", "betaTauG1" );

    await fdOld.close();
    await fdNew.close();
    await fdTmp.close();

    // await fs.promises.unlink(newPTauFilename+ ".tmp");

    return;

    async function processSection(oldSectionId, newSectionId, Gstr, sectionName) {
        const CHUNKPOW = 16;
        if (logger) logger.debug("Starting section: "+sectionName);

        await startWriteSection(fdNew, newSectionId);

        for (let p=0; p<=power; p++) {
            await processSectionPower(p);
        }

        await endWriteSection(fdNew);

        async function processSectionPower(p) {
            const chunkPower = p > CHUNKPOW ? CHUNKPOW : p;
            const pointsPerChunk = 1<<chunkPower;
            const nPoints = 1 << p;
            const nChunks = nPoints / pointsPerChunk;

            const G = curve[Gstr];
            const Fr = curve.Fr;
            const PFr = curve.PFr;
            const sGin = G.F.n8*2;
            const sGmid = G.F.n8*3;

            await startReadUniqueSection(fdOld, sections, oldSectionId);
            // Build the initial tmp Buff
            fdTmp.pos =0;
            for (let i=0; i<nChunks; i++) {
                let buff;
                if (logger) logger.debug(`${sectionName} Prepare ${i+1}/${nChunks}`);
                buff = await fdOld.read(pointsPerChunk*sGin);
                buff = await G.batchToJacobian(buff);
                for (let j=0; j<pointsPerChunk; j++) {
                    fdTmp.pos = bitReverse$1(i*pointsPerChunk+j, p)*sGmid;
                    await fdTmp.write(buff.slice(j*sGmid, (j+1)*sGmid ));
                }
            }
            await endReadSection(fdOld, true);

            for (let j=0; j<nChunks; j++) {
                if (logger) logger.debug(`${sectionName} ${p} FFTMix ${j+1}/${nChunks}`);
                let buff;
                fdTmp.pos = (j*pointsPerChunk)*sGmid;
                buff = await fdTmp.read(pointsPerChunk*sGmid);
                buff = await G.fftMix(buff);
                fdTmp.pos = (j*pointsPerChunk)*sGmid;
                await fdTmp.write(buff);
            }
            for (let i=chunkPower+1; i<= p; i++) {
                const nGroups = 1 << (p - i);
                const nChunksPerGroup = nChunks / nGroups;
                for (let j=0; j<nGroups; j++) {
                    for (let k=0; k <nChunksPerGroup/2; k++) {
                        if (logger) logger.debug(`${sectionName} ${i}/${p} FFTJoin ${j+1}/${nGroups} ${k}/${nChunksPerGroup/2}`);
                        const first = Fr.pow( PFr.w[i], k*pointsPerChunk);
                        const inc = PFr.w[i];
                        const o1 = j*nChunksPerGroup + k;
                        const o2 = j*nChunksPerGroup + k + nChunksPerGroup/2;

                        let buff1, buff2;
                        fdTmp.pos = o1*pointsPerChunk*sGmid;
                        buff1 = await fdTmp.read(pointsPerChunk * sGmid);
                        fdTmp.pos = o2*pointsPerChunk*sGmid;
                        buff2 = await fdTmp.read(pointsPerChunk * sGmid);

                        [buff1, buff2] = await G.fftJoin(buff1, buff2, first, inc);

                        fdTmp.pos = o1*pointsPerChunk*sGmid;
                        await fdTmp.write(buff1);
                        fdTmp.pos = o2*pointsPerChunk*sGmid;
                        await fdTmp.write(buff2);
                    }
                }
            }
            await finalInverse(p);
        }
        async function finalInverse(p) {
            const G = curve[Gstr];
            const Fr = curve.Fr;
            const sGmid = G.F.n8*3;
            const sGout = G.F.n8*2;

            const chunkPower = p > CHUNKPOW ? CHUNKPOW : p;
            const pointsPerChunk = 1<<chunkPower;
            const nPoints = 1 << p;
            const nChunks = nPoints / pointsPerChunk;

            const o = fdNew.pos;
            fdTmp.pos = 0;
            const factor = Fr.inv( Fr.e( 1<< p));
            for (let i=0; i<nChunks; i++) {
                if (logger) logger.debug(`${sectionName} ${p} FFTFinal ${i+1}/${nChunks}`);
                let buff;
                buff = await fdTmp.read(pointsPerChunk * sGmid);
                buff = await G.fftFinal(buff, factor);

                if ( i == 0) {
                    fdNew.pos = o;
                    await fdNew.write(buff.slice((pointsPerChunk-1)*sGout));
                    fdNew.pos = o + ((nChunks - 1)*pointsPerChunk + 1) * sGout;
                    await fdNew.write(buff.slice(0, (pointsPerChunk-1)*sGout));
                } else {
                    fdNew.pos = o + ((nChunks - 1 - i)*pointsPerChunk + 1) * sGout;
                    await fdNew.write(buff);
                }
            }
            fdNew.pos = o + nChunks * pointsPerChunk * sGout;
        }
    }
}

async function exportJson(pTauFilename, verbose) {
    const {fd, sections} = await readBinFile(pTauFilename, "ptau", 1);

    const {curve, power} = await readPTauHeader(fd, sections);

    const pTau = {};
    pTau.q = curve.q;
    pTau.power = power;
    pTau.contributions = await readContributions(fd, curve, sections);

    pTau.tauG1 = await exportSection(2, "G1", (1 << power)*2 -1, "tauG1");
    pTau.tauG2 = await exportSection(3, "G2", (1 << power), "tauG2");
    pTau.alphaTauG1 = await exportSection(4, "G1", (1 << power), "alphaTauG1");
    pTau.betaTauG1 = await exportSection(5, "G1", (1 << power), "betaTauG1");
    pTau.betaG2 = await exportSection(6, "G2", 1, "betaG2");

    pTau.lTauG1 = await exportLagrange(12, "G1", "lTauG1");
    pTau.lTauG2 = await exportLagrange(13, "G2", "lTauG2");
    pTau.lAlphaTauG1 = await exportLagrange(14, "G1", "lAlphaTauG2");
    pTau.lBetaTauG1 = await exportLagrange(15, "G1", "lBetaTauG2");

    await fd.close();

    return pTau;



    async function exportSection(sectionId, groupName, nPoints, sectionName) {
        const G = curve[groupName];
        const sG = G.F.n8*2;

        const res = [];
        await startReadUniqueSection(fd, sections, sectionId);
        for (let i=0; i< nPoints; i++) {
            if ((verbose)&&i&&(i%10000 == 0)) console.log(`${sectionName}: ` + i);
            const buff = await fd.read(sG);
            res.push(G.fromRprLEM(buff, 0));
        }
        await endReadSection(fd);

        return res;
    }

    async function exportLagrange(sectionId, groupName, sectionName) {
        const G = curve[groupName];
        const sG = G.F.n8*2;

        const res = [];
        await startReadUniqueSection(fd, sections, sectionId);
        for (let p=0; p<=power; p++) {
            if (verbose) console.log(`${sectionName}: Power: ${p}`);
            res[p] = [];
            const nPoints = (1<<p);
            for (let i=0; i<nPoints; i++) {
                if ((verbose)&&i&&(i%10000 == 0)) console.log(`${sectionName}: ${i}/${nPoints}`);
                const buff = await fd.read(sG);
                res[p].push(G.fromRprLEM(buff, 0));
            }
        }
        await endReadSection(fd);
        return res;
    }


}

var powersoftau = /*#__PURE__*/Object.freeze({
    __proto__: null,
    newAccumulator: newAccumulator,
    exportChallange: exportChallange,
    importResponse: importResponse,
    verify: verify,
    challangeContribute: challangeContribute,
    beacon: beacon,
    contribute: contribute,
    preparePhase2: preparePhase2,
    exportJson: exportJson
});

function r1csPrint(r1cs, syms, logger) {
    for (let i=0; i<r1cs.constraints.length; i++) {
        printCostraint(r1cs.constraints[i]);
    }
    function printCostraint(c) {
        const lc2str = (lc) => {
            let S = "";
            const keys = Object.keys(lc);
            keys.forEach( (k) => {
                let name = syms.varIdx2Name[k];
                if (name == "one") name = "";

                let vs = r1cs.Fr.toString(lc[k]);
                if (vs == "1") vs = "";  // Do not show ones
                if (vs == "-1") vs = "-";  // Do not show ones
                if ((S!="")&&(vs[0]!="-")) vs = "+"+vs;
                if (S!="") vs = " "+vs;
                S= S + vs   + name;
            });
            return S;
        };
        const S = `[ ${lc2str(c[0])} ] * [ ${lc2str(c[1])} ] - [ ${lc2str(c[2])} ] = 0`;
        if (logger) logger.info(S);
    }

}

async function readBinFile$1(fileName, type, maxVersion) {

    const fd = await readExisting$1(fileName);

    const b = await fd.read(4);
    let readedType = "";
    for (let i=0; i<4; i++) readedType += String.fromCharCode(b[i]);

    if (readedType != type) throw new Error(fileName + ": Invalid File format");

    let v = await fd.readULE32();

    if (v>maxVersion) throw new Error("Version not supported");

    const nSections = await fd.readULE32();

    // Scan sections
    let sections = [];
    for (let i=0; i<nSections; i++) {
        let ht = await fd.readULE32();
        let hl = await fd.readULE64();
        if (typeof sections[ht] == "undefined") sections[ht] = [];
        sections[ht].push({
            p: fd.pos,
            size: hl
        });
        fd.pos += hl;
    }

    return {fd, sections};
}

async function startReadUniqueSection$1(fd, sections, idSection) {
    if (typeof fd.readingSection != "undefined")
        throw new Error("Already reading a section");
    if (!sections[idSection])  throw new Error(fd.fileName + ": Missing section "+ idSection );
    if (sections[idSection].length>1) throw new Error(fd.fileName +": Section Duplicated " +idSection);

    fd.pos = sections[idSection][0].p;

    fd.readingSection = sections[idSection][0];
}

async function endReadSection$1(fd, noCheck) {
    if (typeof fd.readingSection == "undefined")
        throw new Error("Not reading a section");
    if (!noCheck) {
        if (fd.pos-fd.readingSection.p != fd.readingSection.size)
            throw new Error("Invalid section size");
    }
    delete fd.readingSection;
}


async function readBigInt$1(fd, n8, pos) {
    const buff = await fd.read(n8, pos);
    return Scalar$1.fromRprLE(buff, 0, n8);
}

async function loadHeader(fd,sections) {


    const res = {};
    await startReadUniqueSection$1(fd, sections, 1);
    // Read Header
    res.n8 = await fd.readULE32();
    res.prime = await readBigInt$1(fd, res.n8);
    res.Fr = new F1Field(res.prime);

    res.nVars = await fd.readULE32();
    res.nOutputs = await fd.readULE32();
    res.nPubInputs = await fd.readULE32();
    res.nPrvInputs = await fd.readULE32();
    res.nLabels = await fd.readULE64();
    res.nConstraints = await fd.readULE32();
    await endReadSection$1(fd);

    return res;
}

async function load(fileName, loadConstraints, loadMap) {

    const {fd, sections} = await readBinFile$1(fileName, "r1cs", 1);
    const res = await loadHeader(fd, sections);


    if (loadConstraints) {
        await startReadUniqueSection$1(fd, sections, 2);
        res.constraints = [];
        for (let i=0; i<res.nConstraints; i++) {
            const c = await readConstraint();
            res.constraints.push(c);
        }
        await endReadSection$1(fd);
    }

    // Read Labels

    if (loadMap) {
        await startReadUniqueSection$1(fd, sections, 3);

        res.map = [];
        for (let i=0; i<res.nVars; i++) {
            const idx = await fd.readULE64();
            res.map.push(idx);
        }
        await endReadSection$1(fd);
    }

    await fd.close();

    return res;

    async function readConstraint() {
        const c = [];
        c[0] = await readLC();
        c[1] = await readLC();
        c[2] = await readLC();
        return c;
    }

    async function readLC() {
        const lc= {};
        const nIdx = await fd.readULE32();
        for (let i=0; i<nIdx; i++) {
            const idx = await fd.readULE32();
            const val = res.Fr.e(await readBigInt$1(fd, res.n8));
            lc[idx] = val;
        }
        return lc;
    }
}

const bls12381r$1 = Scalar$1.e("73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001", 16);
const bn128r$1 = Scalar$1.e("21888242871839275222246405745257275088548364400416034343698204186575808495617");

async function r1csInfo(r1csName, logger) {

    const cir = await load(r1csName);

    if (Scalar$1.eq(cir.prime, bn128r$1)) {
        if (logger) logger.info("Curve: bn-128");
    } else if (Scalar$1.eq(cir.prime, bls12381r$1)) {
        if (logger) logger.info("Curve: bls12-381");
    } else {
        if (logger) logger.info(`Unknown Curve. Prime: ${Scalar$1.toString(cir.prime)}`);
    }
    if (logger) logger.info(`# of Wires: ${cir.nVars}`);
    if (logger) logger.info(`# of Constraints: ${cir.nConstraints}`);
    if (logger) logger.info(`# of Private Inputs: ${cir.nPrvInputs}`);
    if (logger) logger.info(`# of Public Inputs: ${cir.nPubInputs}`);
    if (logger) logger.info(`# of Outputs: ${cir.nOutputs}`);

    return cir;
}

async function r1csExportJson(r1csFileName, logger) {

    const cir = await load(r1csFileName, true, true);

    return cir;
}

var r1cs = /*#__PURE__*/Object.freeze({
    __proto__: null,
    print: r1csPrint,
    info: r1csInfo,
    exportJson: r1csExportJson
});

async function loadSymbols(symFileName) {
    const sym = {
        labelIdx2Name: [ "one" ],
        varIdx2Name: [ "one" ],
        componentIdx2Name: []
    };
    const fd = await readExisting$1(symFileName);
    const buff = await fd.read(fd.totalSize);
    const symsStr = new TextDecoder("utf-8").decode(buff);
    const lines = symsStr.split("\n");
    for (let i=0; i<lines.length; i++) {
        const arr = lines[i].split(",");
        if (arr.length!=4) continue;
        if (sym.varIdx2Name[arr[1]]) {
            sym.varIdx2Name[arr[1]] += "|" + arr[3];
        } else {
            sym.varIdx2Name[arr[1]] = arr[3];
        }
        sym.labelIdx2Name[arr[0]] = arr[3];
        if (!sym.componentIdx2Name[arr[2]]) {
            sym.componentIdx2Name[arr[2]] = extractComponent(arr[3]);
        }
    }

    await fd.close();

    return sym;

    function extractComponent(name) {
        const arr = name.split(".");
        arr.pop(); // Remove the lasr element
        return arr.join(".");
    }
}

const { WitnessCalculatorBuilder: WitnessCalculatorBuilder$2 } = circom_runtime;

async function wtnsDebug(input, wasmFileName, wtnsFileName, symName, options, logger) {

    const fdWasm = await readExisting$1(wasmFileName);
    const wasm = await fdWasm.read(fdWasm.totalSize);
    await fdWasm.close();


    let wcOps = {
        sanityCheck: true
    };
    let sym = await loadSymbols(symName);
    if (options.set) {
        if (!sym) sym = await loadSymbols(symName);
        wcOps.logSetSignal= function(labelIdx, value) {
            if (logger) logger.info("SET " + sym.labelIdx2Name[labelIdx] + " <-- " + value.toString());
        };
    }
    if (options.get) {
        if (!sym) sym = await loadSymbols(symName);
        wcOps.logGetSignal= function(varIdx, value) {
            if (logger) logger.info("GET " + sym.labelIdx2Name[varIdx] + " --> " + value.toString());
        };
    }
    if (options.trigger) {
        if (!sym) sym = await loadSymbols(symName);
        wcOps.logStartComponent= function(cIdx) {
            if (logger) logger.info("START: " + sym.componentIdx2Name[cIdx]);
        };
        wcOps.logFinishComponent= function(cIdx) {
            if (logger) logger.info("FINISH: " + sym.componentIdx2Name[cIdx]);
        };
    }


    const wc = await WitnessCalculatorBuilder$2(wasm, wcOps);
    const w = await wc.calculateWitness(input);

    const fdWtns = await createBinFile(wtnsFileName, "wtns", 2, 2);

    await write(fdWtns, w, wc.prime);

    await fdWtns.close();
}

async function wtnsExportJson(wtnsFileName) {

    const w = await read(wtnsFileName);

    return w;
}

var wtns = /*#__PURE__*/Object.freeze({
    __proto__: null,
    calculate: wtnsCalculate,
    debug: wtnsDebug,
    exportJson: wtnsExportJson
});

async function newZKey(r1csName, ptauName, zkeyName, logger) {
    await blake2bWasm.ready();
    const csHasher = blake2bWasm(64);

    const {fd: fdR1cs, sections: sectionsR1cs} = await readBinFile(r1csName, "r1cs", 1);
    const r1cs = await loadHeader(fdR1cs, sectionsR1cs);

    const {fd: fdPTau, sections: sectionsPTau} = await readBinFile(ptauName, "ptau", 1);
    const {curve, power} = await readPTauHeader(fdPTau, sectionsPTau);

    const fdZKey = await createBinFile(zkeyName, "zkey", 1, 10);

    const sG1 = curve.G1.F.n8*2;
    const sG2 = curve.G2.F.n8*2;

    if (r1cs.prime != curve.r) {
        if (logger) logger.error("r1cs curve does not match powers of tau ceremony curve");
        return -1;
    }

    const cirPower = log2$2(r1cs.nConstraints + r1cs.nPubInputs + r1cs.nOutputs +1 -1) +1;

    if (cirPower > power) {
        if (logger) logger.error(`circuit too big for this power of tau ceremony. ${r1cs.nConstraints} > 2**${power}`);
        return -1;
    }

    if (!sectionsPTau[12]) {
        if (logger) logger.error("Powers of tau is not prepared.");
        return -1;
    }

    const nPublic = r1cs.nOutputs + r1cs.nPubInputs;
    const domainSize = 1 << cirPower;

    // Write the header
    ///////////
    await startWriteSection(fdZKey, 1);
    await fdZKey.writeULE32(1); // Groth
    await endWriteSection(fdZKey);

    // Write the Groth header section
    ///////////

    await startWriteSection(fdZKey, 2);
    const primeQ = curve.q;
    const n8q = (Math.floor( (Scalar$1.bitLength(primeQ) - 1) / 64) +1)*8;

    const primeR = curve.r;
    const n8r = (Math.floor( (Scalar$1.bitLength(primeR) - 1) / 64) +1)*8;
    const Rr = Scalar$1.mod(Scalar$1.shl(1, n8r*8), primeR);
    const R2r = curve.Fr.e(Scalar$1.mod(Scalar$1.mul(Rr,Rr), primeR));

    await fdZKey.writeULE32(n8q);
    await writeBigInt(fdZKey, primeQ, n8q);
    await fdZKey.writeULE32(n8r);
    await writeBigInt(fdZKey, primeR, n8r);
    await fdZKey.writeULE32(r1cs.nVars);                         // Total number of bars
    await fdZKey.writeULE32(nPublic);                       // Total number of public vars (not including ONE)
    await fdZKey.writeULE32(domainSize);                  // domainSize

    let bAlpha1;
    bAlpha1 = await fdPTau.read(sG1, sectionsPTau[4][0].p);
    await fdZKey.write(bAlpha1);
    bAlpha1 = await curve.G1.batchLEMtoU(bAlpha1);
    csHasher.update(bAlpha1);

    let bBeta1;
    bBeta1 = await fdPTau.read(sG1, sectionsPTau[5][0].p);
    await fdZKey.write(bBeta1);
    bBeta1 = await curve.G1.batchLEMtoU(bBeta1);
    csHasher.update(bBeta1);

    let bBeta2;
    bBeta2 = await fdPTau.read(sG2, sectionsPTau[6][0].p);
    await fdZKey.write(bBeta2);
    bBeta2 = await curve.G2.batchLEMtoU(bBeta2);
    csHasher.update(bBeta2);

    const bg1 = new Uint8Array(sG1);
    curve.G1.toRprLEM(bg1, 0, curve.G1.g);
    const bg2 = new Uint8Array(sG2);
    curve.G2.toRprLEM(bg2, 0, curve.G2.g);
    const bg1U = new Uint8Array(sG1);
    curve.G1.toRprUncompressed(bg1U, 0, curve.G1.g);
    const bg2U = new Uint8Array(sG2);
    curve.G2.toRprUncompressed(bg2U, 0, curve.G2.g);

    await fdZKey.write(bg2);        // gamma2
    await fdZKey.write(bg1);        // delta1
    await fdZKey.write(bg2);        // delta2
    csHasher.update(bg2U);      // gamma2
    csHasher.update(bg1U);      // delta1
    csHasher.update(bg2U);      // delta2
    await endWriteSection(fdZKey);


    const A = new Array(r1cs.nVars);
    const B1 = new Array(r1cs.nVars);
    const B2 = new Array(r1cs.nVars);
    const C = new Array(r1cs.nVars- nPublic -1);
    const IC = new Array(nPublic+1);

    const lTauG1 = sectionsPTau[12][0].p + ((1 << cirPower) -1)*sG1;
    const lTauG2 = sectionsPTau[13][0].p + ((1 << cirPower) -1)*sG2;
    const lAlphaTauG1 = sectionsPTau[14][0].p + ((1 << cirPower) -1)*sG1;
    const lBetaTauG1 = sectionsPTau[15][0].p + ((1 << cirPower) -1)*sG1;

    await startWriteSection(fdZKey, 4);
    await startReadUniqueSection(fdR1cs, sectionsR1cs, 2);

    const pNCoefs =  fdZKey.pos;
    let nCoefs = 0;
    fdZKey.pos += 4;
    for (let c=0; c<r1cs.nConstraints; c++) {
        if ((logger)&(c%10000 == 0)) logger.debug(`processing constraints: ${c}/${r1cs.nConstraints}`);
        const nA = await fdR1cs.readULE32();
        for (let i=0; i<nA; i++) {
            const s = await fdR1cs.readULE32();
            const coef = await fdR1cs.read(r1cs.n8);

            const l1 = lTauG1 + sG1*c;
            const l2 = lBetaTauG1 + sG1*c;
            if (typeof A[s] === "undefined") A[s] = [];
            A[s].push([l1, coef]);

            if (s <= nPublic) {
                if (typeof IC[s] === "undefined") IC[s] = [];
                IC[s].push([l2, coef]);
            } else {
                if (typeof C[s- nPublic -1] === "undefined") C[s- nPublic -1] = [];
                C[s - nPublic -1].push([l2, coef]);
            }
            await fdZKey.writeULE32(0);
            await fdZKey.writeULE32(c);
            await fdZKey.writeULE32(s);
            await writeFr2(coef);
            nCoefs ++;
        }

        const nB = await fdR1cs.readULE32();
        for (let i=0; i<nB; i++) {
            const s = await fdR1cs.readULE32();
            const coef = await fdR1cs.read(r1cs.n8);

            const l1 = lTauG1 + sG1*c;
            const l2 = lTauG2 + sG2*c;
            const l3 = lAlphaTauG1 + sG1*c;
            if (typeof B1[s] === "undefined") B1[s] = [];
            B1[s].push([l1, coef]);
            if (typeof B2[s] === "undefined") B2[s] = [];
            B2[s].push([l2, coef]);

            if (s <= nPublic) {
                if (typeof IC[s] === "undefined") IC[s] = [];
                IC[s].push([l3, coef]);
            } else {
                if (typeof C[s- nPublic -1] === "undefined") C[s- nPublic -1] = [];
                C[s- nPublic -1].push([l3, coef]);
            }
            await fdZKey.writeULE32(1);
            await fdZKey.writeULE32(c);
            await fdZKey.writeULE32(s);
            await writeFr2(coef);
            nCoefs ++;
        }

        const nC = await fdR1cs.readULE32();
        for (let i=0; i<nC; i++) {
            const s = await fdR1cs.readULE32();
            const coef = await fdR1cs.read(r1cs.n8);

            const l1 = lTauG1 + sG1*c;
            if (s <= nPublic) {
                if (typeof IC[s] === "undefined") IC[s] = [];
                IC[s].push([l1, coef]);
            } else {
                if (typeof C[s- nPublic -1] === "undefined") C[s- nPublic -1] = [];
                C[s- nPublic -1].push([l1, coef]);
            }
        }
    }

    const bOne = new Uint8Array(curve.Fr.n8);
    curve.Fr.toRprLE(bOne, 0, curve.Fr.e(1));
    for (let s = 0; s <= nPublic ; s++) {
        const l1 = lTauG1 + sG1*(r1cs.nConstraints + s);
        const l2 = lBetaTauG1 + sG1*(r1cs.nConstraints + s);
        if (typeof A[s] === "undefined") A[s] = [];
        A[s].push([l1, bOne]);
        if (typeof IC[s] === "undefined") IC[s] = [];
        IC[s].push([l2, bOne]);
        await fdZKey.writeULE32(0);
        await fdZKey.writeULE32(r1cs.nConstraints + s);
        await fdZKey.writeULE32(s);
        await writeFr2(bOne);
        nCoefs ++;
    }

    const oldPos = fdZKey.pos;
    await fdZKey.writeULE32(nCoefs, pNCoefs);
    fdZKey.pos = oldPos;

    await endWriteSection(fdZKey);
    await endReadSection(fdR1cs);

/*
    zKey.hExps = new Array(zKey.domainSize-1);
    for (let i=0; i< zKey.domainSize; i++) {
        const t1 = await readEvaluation("tauG1", i);
        const t2 = await readEvaluation("tauG1", i+zKey.domainSize);
        zKey.hExps[i] = curve.G1.sub(t2, t1);
    }
*/

    await composeAndWritePoints(3, "G1", IC, "IC");

    // Write Hs
    await startWriteSection(fdZKey, 9);
    const o = sectionsPTau[12][0].p + ((1 << (cirPower+1)) -1)*sG1;
    for (let i=0; i< domainSize; i++) {
        const buff = await fdPTau.read(sG1, o + (i*2+1)*sG1 );
        await fdZKey.write(buff);
    }
    await endWriteSection(fdZKey);
    await hashHPoints();

    await composeAndWritePoints(8, "G1", C, "C");
    await composeAndWritePoints(5, "G1", A, "A");
    await composeAndWritePoints(6, "G1", B1, "B1");
    await composeAndWritePoints(7, "G2", B2, "B2");

    const csHash = csHasher.digest();
    // Contributions section
    await startWriteSection(fdZKey, 10);
    await fdZKey.write(csHash);
    await fdZKey.writeULE32(0);
    await endWriteSection(fdZKey);

    if (logger) logger.info(formatHash(csHash, "Circuit hash: "));


    await fdZKey.close();
    await fdPTau.close();
    await fdR1cs.close();

    return csHash;

    async function writeFr2(buff) {
        const n = curve.Fr.fromRprLE(buff, 0);
        const nR2 = curve.Fr.mul(n, R2r);
        const buff2 = new Uint8Array(curve.Fr.n8);
        curve.Fr.toRprLE(buff2, 0, nR2);
        await fdZKey.write(buff2);
    }


    async function composeAndWritePoints(idSection, groupName, arr, sectionName) {
        const CHUNK_SIZE= 1<<18;

        hashU32(arr.length);
        await startWriteSection(fdZKey, idSection);

        for (let i=0; i<arr.length; i+= CHUNK_SIZE) {
            if (logger)  logger.debug(`Writing points ${sectionName}: ${i}/${arr.length}`);
            const n = Math.min(arr.length -i, CHUNK_SIZE);
            const subArr = arr.slice(i, i + n);
            await composeAndWritePointsChunk(groupName, subArr);
        }
        await endWriteSection(fdZKey);
    }

    async function composeAndWritePointsChunk(groupName, arr) {
        const concurrency= curve.tm.concurrency;
        const nElementsPerThread = Math.floor(arr.length / concurrency);
        const opPromises = [];
        const G = curve[groupName];
        for (let i=0; i<concurrency; i++) {
            let n;
            if (i< concurrency-1) {
                n = nElementsPerThread;
            } else {
                n = arr.length - i*nElementsPerThread;
            }
            if (n==0) continue;

            const subArr = arr.slice(i*nElementsPerThread, i*nElementsPerThread + n);
            opPromises.push(composeAndWritePointsThread(groupName, subArr));
        }

        const result = await Promise.all(opPromises);

        for (let i=0; i<result.length; i++) {
            await fdZKey.write(result[i][0]);
            const buff = await G.batchLEMtoU(result[i][0]);
            csHasher.update(buff);
        }
    }

    async function composeAndWritePointsThread(groupName, arr) {
        const G = curve[groupName];
        const sGin = G.F.n8*2;
        const sGmid = G.F.n8*3;
        const sGout = G.F.n8*2;
        let fnExp, fnMultiExp, fnBatchToAffine, fnZero;
        if (groupName == "G1") {
            fnExp = "g1m_timesScalarAffine";
            fnMultiExp = "g1m_multiexpAffine";
            fnBatchToAffine = "g1m_batchToAffine";
            fnZero = "g1m_zero";
        } else if (groupName == "G2") {
            fnExp = "g2m_timesScalarAffine";
            fnMultiExp = "g2m_multiexpAffine";
            fnBatchToAffine = "g2m_batchToAffine";
            fnZero = "g2m_zero";
        } else {
            throw new Error("Invalid group");
        }
        let acc =0;
        for (let i=0; i<arr.length; i++) acc += arr[i] ? arr[i].length : 0;
        const bBases = new Uint8Array(acc*sGin);
        const bScalars = new Uint8Array(acc*curve.Fr.n8);
        let pB =0;
        let pS =0;
        for (let i=0; i<arr.length; i++) {
            if (!arr[i]) continue;
            for (let j=0; j<arr[i].length; j++) {
                const bBase = await fdPTau.read(sGin, arr[i][j][0]);
                bBases.set(bBase, pB);
                pB += sGin;
                bScalars.set(arr[i][j][1], pS);
                pS += curve.Fr.n8;
            }
        }
        const task = [];
        task.push({cmd: "ALLOCSET", var: 0, buff: bBases});
        task.push({cmd: "ALLOCSET", var: 1, buff: bScalars});
        task.push({cmd: "ALLOC", var: 2, len: arr.length*sGmid});
        pB = 0;
        pS = 0;
        let pD =0;
        for (let i=0; i<arr.length; i++) {
            if (!arr[i]) {
                task.push({cmd: "CALL", fnName: fnZero, params: [
                    {var: 2, offset: pD}
                ]});
                pD += sGmid;
                continue;
            }
            if (arr[i].length == 1) {
                task.push({cmd: "CALL", fnName: fnExp, params: [
                    {var: 0, offset: pB},
                    {var: 1, offset: pS},
                    {val: curve.Fr.n8},
                    {var: 2, offset: pD}
                ]});
            } else {
                task.push({cmd: "CALL", fnName: fnMultiExp, params: [
                    {var: 0, offset: pB},
                    {var: 1, offset: pS},
                    {val: curve.Fr.n8},
                    {val: arr[i].length},
                    {var: 2, offset: pD}
                ]});
            }
            pB += sGin*arr[i].length;
            pS += curve.Fr.n8*arr[i].length;
            pD += sGmid;
        }
        task.push({cmd: "CALL", fnName: fnBatchToAffine, params: [
            {var: 2},
            {val: arr.length},
            {var: 2},
        ]});
        task.push({cmd: "GET", out: 0, var: 2, len: arr.length*sGout});

        const res = await curve.tm.queueAction(task);

        return res;
    }


    async function hashHPoints() {
        const CHUNK_SIZE = 1<<14;

        hashU32(domainSize-1);

        for (let i=0; i<domainSize-1; i+= CHUNK_SIZE) {
            if (logger)  logger.debug(`HashingHPoints: ${i}/${domainSize}`);
            const n = Math.min(domainSize-1, CHUNK_SIZE);
            await hashHPointsChunk(i, n);
        }
    }

    async function hashHPointsChunk(offset, nPoints) {
        const buff1 = await fdPTau.read(nPoints *sG1, sectionsPTau[2][0].p + (offset + domainSize)*sG1);
        const buff2 = await fdPTau.read(nPoints *sG1, sectionsPTau[2][0].p + offset*sG1);
        const concurrency= curve.tm.concurrency;
        const nPointsPerThread = Math.floor(nPoints / concurrency);
        const opPromises = [];
        for (let i=0; i<concurrency; i++) {
            let n;
            if (i< concurrency-1) {
                n = nPointsPerThread;
            } else {
                n = nPoints - i*nPointsPerThread;
            }
            if (n==0) continue;

            const subBuff1 = buff1.slice(i*nPointsPerThread*sG1, (i*nPointsPerThread+n)*sG1);
            const subBuff2 = buff2.slice(i*nPointsPerThread*sG1, (i*nPointsPerThread+n)*sG1);
            opPromises.push(hashHPointsThread(subBuff1, subBuff2));
        }


        const result = await Promise.all(opPromises);

        for (let i=0; i<result.length; i++) {
            csHasher.update(result[i][0]);
        }
    }

    async function hashHPointsThread(buff1, buff2) {
        const nPoints = buff1.byteLength/sG1;
        const sGmid = curve.G1.F.n8*3;
        const task = [];
        task.push({cmd: "ALLOCSET", var: 0, buff: buff1});
        task.push({cmd: "ALLOCSET", var: 1, buff: buff2});
        task.push({cmd: "ALLOC", var: 2, len: nPoints*sGmid});
        for (let i=0; i<nPoints; i++) {
            task.push({
                cmd: "CALL",
                fnName: "g1m_subAffine",
                params: [
                    {var: 0, offset: i*sG1},
                    {var: 1, offset: i*sG1},
                    {var: 2, offset: i*sGmid},
                ]
            });
        }
        task.push({cmd: "CALL", fnName: "g1m_batchToAffine", params: [
            {var: 2},
            {val: nPoints},
            {var: 2},
        ]});
        task.push({cmd: "CALL", fnName: "g1m_batchLEMtoU", params: [
            {var: 2},
            {val: nPoints},
            {var: 2},
        ]});
        task.push({cmd: "GET", out: 0, var: 2, len: nPoints*sG1});

        const res = await curve.tm.queueAction(task);

        return res;
    }

    function hashU32(n) {
        const buff = new Uint8Array(4);
        const buffV = new DataView(buff.buffer, buff.byteOffset, buff.byteLength);
        buffV.setUint32(0, n, false);
        csHasher.update(buff);
    }

}

async function phase2exportMPCParams(zkeyName, mpcparamsName, logger) {

    const {fd: fdZKey, sections: sectionsZKey} = await readBinFile(zkeyName, "zkey", 2);
    const zkey = await readHeader(fdZKey, sectionsZKey, "groth16");

    const curve = await getCurveFromQ(zkey.q);
    const sG1 = curve.G1.F.n8*2;
    const sG2 = curve.G2.F.n8*2;

    const mpcParams = await readMPCParams(fdZKey, curve, sectionsZKey);

    const fdMPCParams = await createOverride(mpcparamsName);

    /////////////////////
    // Verification Key Section
    /////////////////////
    await writeG1(zkey.vk_alpha_1);
    await writeG1(zkey.vk_beta_1);
    await writeG2(zkey.vk_beta_2);
    await writeG2(zkey.vk_gamma_2);
    await writeG1(zkey.vk_delta_1);
    await writeG2(zkey.vk_delta_2);

    // IC
    let buffBasesIC;
    buffBasesIC = await readFullSection(fdZKey, sectionsZKey, 3);
    buffBasesIC = await curve.G1.batchLEMtoU(buffBasesIC);

    await writePointArray("G1", buffBasesIC);

    /////////////////////
    // h Section
    /////////////////////
    const buffBasesH_Lodd = await readFullSection(fdZKey, sectionsZKey, 9);

    let buffBasesH_Tau;
    buffBasesH_Tau = await curve.G1.fft(buffBasesH_Lodd, "affine", "jacobian", logger);
    buffBasesH_Tau = await curve.G1.batchApplyKey(buffBasesH_Tau, curve.Fr.neg(curve.Fr.e(2)), curve.Fr.w[zkey.power+1], "jacobian", "affine", logger);

    // Remove last element.  (The degree of H will be allways m-2)
    buffBasesH_Tau = buffBasesH_Tau.slice(0, buffBasesH_Tau.byteLength - sG1);
    buffBasesH_Tau = await curve.G1.batchLEMtoU(buffBasesH_Tau);
    await writePointArray("G1", buffBasesH_Tau);

    /////////////////////
    // L section
    /////////////////////
    let buffBasesC;
    buffBasesC = await readFullSection(fdZKey, sectionsZKey, 8);
    buffBasesC = await curve.G1.batchLEMtoU(buffBasesC);
    await writePointArray("G1", buffBasesC);

    /////////////////////
    // A Section (C section)
    /////////////////////
    let buffBasesA;
    buffBasesA = await readFullSection(fdZKey, sectionsZKey, 5);
    buffBasesA = await curve.G1.batchLEMtoU(buffBasesA);
    await writePointArray("G1", buffBasesA);

    /////////////////////
    // B1 Section
    /////////////////////
    let buffBasesB1;
    buffBasesB1 = await readFullSection(fdZKey, sectionsZKey, 6);
    buffBasesB1 = await curve.G1.batchLEMtoU(buffBasesB1);
    await writePointArray("G1", buffBasesB1);

    /////////////////////
    // B2 Section
    /////////////////////
    let buffBasesB2;
    buffBasesB2 = await readFullSection(fdZKey, sectionsZKey, 7);
    buffBasesB2 = await curve.G2.batchLEMtoU(buffBasesB2);
    await writePointArray("G2", buffBasesB2);

    await fdMPCParams.write(mpcParams.csHash);
    await writeU32(mpcParams.contributions.length);

    for (let i=0; i<mpcParams.contributions.length; i++) {
        const c = mpcParams.contributions[i];
        await writeG1(c.deltaAfter);
        await writeG1(c.delta.g1_s);
        await writeG1(c.delta.g1_sx);
        await writeG2(c.delta.g2_spx);
        await fdMPCParams.write(c.transcript);
    }

    await fdZKey.close();
    await fdMPCParams.close();

    async function writeG1(P) {
        const buff = new Uint8Array(sG1);
        curve.G1.toRprUncompressed(buff, 0, P);
        await fdMPCParams.write(buff);
    }

    async function writeG2(P) {
        const buff = new Uint8Array(sG2);
        curve.G2.toRprUncompressed(buff, 0, P);
        await fdMPCParams.write(buff);
    }

    async function writePointArray(groupName, buff) {
        let sG;
        if (groupName == "G1") {
            sG = sG1;
        } else {
            sG = sG2;
        }

        const buffSize = new Uint8Array(4);
        const buffSizeV = new DataView(buffSize.buffer, buffSize.byteOffset, buffSize.byteLength);
        buffSizeV.setUint32(0, buff.byteLength / sG, false);

        await fdMPCParams.write(buffSize);
        await fdMPCParams.write(buff);
    }

    async function writeU32(n) {
        const buffSize = new Uint8Array(4);
        const buffSizeV = new DataView(buffSize.buffer, buffSize.byteOffset, buffSize.byteLength);
        buffSizeV.setUint32(0, n, false);

        await fdMPCParams.write(buffSize);
    }



}

async function phase2importMPCParams(zkeyNameOld, mpcparamsName, zkeyNameNew, name, logger) {

    const {fd: fdZKeyOld, sections: sectionsZKeyOld} = await readBinFile(zkeyNameOld, "zkey", 2);
    const zkeyHeader = await readHeader(fdZKeyOld, sectionsZKeyOld, "groth16");

    const curve = await getCurveFromQ(zkeyHeader.q);
    const sG1 = curve.G1.F.n8*2;
    const sG2 = curve.G2.F.n8*2;

    const oldMPCParams = await readMPCParams(fdZKeyOld, curve, sectionsZKeyOld);
    const newMPCParams = {};

    const fdMPCParams = await readExisting$1(mpcparamsName);

    fdMPCParams.pos =
        sG1*3 + sG2*3 +                     // vKey
        8 + sG1*zkeyHeader.nVars +              // IC + C
        4 + sG1*(zkeyHeader.domainSize-1) +     // H
        4 + sG1*zkeyHeader.nVars +              // A
        4 + sG1*zkeyHeader.nVars +              // B1
        4 + sG2*zkeyHeader.nVars;               // B2

    // csHash
    newMPCParams.csHash =  await fdMPCParams.read(64);

    const nConttributions = await fdMPCParams.readUBE32();
    newMPCParams.contributions = [];
    for (let i=0; i<nConttributions; i++) {
        const c = { delta:{} };
        c.deltaAfter = await readG1(fdMPCParams);
        c.delta.g1_s = await readG1(fdMPCParams);
        c.delta.g1_sx = await readG1(fdMPCParams);
        c.delta.g2_spx = await readG2(fdMPCParams);
        c.transcript = await fdMPCParams.read(64);
        if (i<oldMPCParams.contributions.length) {
            c.type = oldMPCParams.contributions[i].type;
            if (c.type==1) {
                c.beaconHash = oldMPCParams.contributions[i].beaconHash;
                c.numIterationsExp = oldMPCParams.contributions[i].numIterationsExp;
            }
            if (oldMPCParams.contributions[i].name) {
                c.name = oldMPCParams.contributions[i].name;
            }
        }
        newMPCParams.contributions.push(c);
    }

    if (!hashIsEqual(newMPCParams.csHash, oldMPCParams.csHash)) {
        if (logger) logger.error("Hash of the original circuit does not match with the MPC one");
        return false;
    }

    if (oldMPCParams.contributions.length > newMPCParams.contributions.length) {
        if (logger) logger.error("The impoerted file does not include new contributions");
        return false;
    }

    for (let i=0; i<oldMPCParams.contributions.length; i++) {
        if (!contributionIsEqual(oldMPCParams.contributions[i], newMPCParams.contributions[i])) {
            if (logger) logger.error(`Previos contribution ${i} does not match`);
            return false;
        }
    }


    // Set the same name to all new controbutions
    if (name) {
        for (let i=oldMPCParams.contributions.length; i<newMPCParams.contributions.length; i++) {
            newMPCParams.contributions[i].name = name;
        }
    }

    const fdZKeyNew = await createBinFile(zkeyNameNew, "zkey", 1, 10);
    fdMPCParams.pos = 0;

    // Header
    fdMPCParams.pos += sG1;  // ignore alpha1 (keep original)
    fdMPCParams.pos += sG1;  // ignore beta1
    fdMPCParams.pos += sG2;  // ignore beta2
    fdMPCParams.pos += sG2;  // ignore gamma2
    zkeyHeader.vk_delta_1 = await readG1(fdMPCParams);
    zkeyHeader.vk_delta_2 = await readG2(fdMPCParams);
    await writeHeader(fdZKeyNew, zkeyHeader);

    // IC (Keep original)
    const nIC = await fdMPCParams.readUBE32();
    if (nIC != zkeyHeader.nPublic +1) {
        if (logger) logger.error("Invalid number of points in IC");
        await fdZKeyNew.discard();
        return false;
    }
    fdMPCParams.pos += sG1*(zkeyHeader.nPublic+1);
    await copySection(fdZKeyOld, sectionsZKeyOld, fdZKeyNew, 3);

    // Coeffs (Keep original)
    await copySection(fdZKeyOld, sectionsZKeyOld, fdZKeyNew, 4);

    // H Section
    const nH = await fdMPCParams.readUBE32();
    if (nH != zkeyHeader.domainSize-1) {
        if (logger) logger.error("Invalid number of points in H");
        await fdZKeyNew.discard();
        return false;
    }
    let buffH;
    const buffTauU = await fdMPCParams.read(sG1*(zkeyHeader.domainSize-1));
    const buffTauLEM = await curve.G1.batchUtoLEM(buffTauU);
    buffH = new Uint8Array(zkeyHeader.domainSize*sG1);
    buffH.set(buffTauLEM);   // Let the last one to zero.
    const n2Inv = curve.Fr.neg(curve.Fr.inv(curve.Fr.e(2)));
    const wInv = curve.Fr.inv(curve.Fr.w[zkeyHeader.power+1]);
    buffH = await curve.G1.batchApplyKey(buffH, n2Inv, wInv, "affine", "jacobian", logger);
    buffH = await curve.G1.ifft(buffH, "jacobian", "affine", logger);
    await startWriteSection(fdZKeyNew, 9);
    await fdZKeyNew.write(buffH);
    await endWriteSection(fdZKeyNew);

    // C Secion (L section)
    const nL = await fdMPCParams.readUBE32();
    if (nL != (zkeyHeader.nVars-zkeyHeader.nPublic-1)) {
        if (logger) logger.error("Invalid number of points in L");
        await fdZKeyNew.discard();
        return false;
    }
    let buffL;
    buffL = await fdMPCParams.read(sG1*(zkeyHeader.nVars-zkeyHeader.nPublic-1));
    buffL = await curve.G1.batchUtoLEM(buffL);
    await startWriteSection(fdZKeyNew, 8);
    await fdZKeyNew.write(buffL);
    await endWriteSection(fdZKeyNew);

    // A Section
    const nA = await fdMPCParams.readUBE32();
    if (nA != zkeyHeader.nVars) {
        if (logger) logger.error("Invalid number of points in A");
        await fdZKeyNew.discard();
        return false;
    }
    fdMPCParams.pos += sG1*(zkeyHeader.nVars);
    await copySection(fdZKeyOld, sectionsZKeyOld, fdZKeyNew, 5);

    // B1 Section
    const nB1 = await fdMPCParams.readUBE32();
    if (nB1 != zkeyHeader.nVars) {
        if (logger) logger.error("Invalid number of points in B1");
        await fdZKeyNew.discard();
        return false;
    }
    fdMPCParams.pos += sG1*(zkeyHeader.nVars);
    await copySection(fdZKeyOld, sectionsZKeyOld, fdZKeyNew, 6);

    // B2 Section
    const nB2 = await fdMPCParams.readUBE32();
    if (nB2 != zkeyHeader.nVars) {
        if (logger) logger.error("Invalid number of points in B2");
        await fdZKeyNew.discard();
        return false;
    }
    fdMPCParams.pos += sG2*(zkeyHeader.nVars);
    await copySection(fdZKeyOld, sectionsZKeyOld, fdZKeyNew, 7);

    await writeMPCParams(fdZKeyNew, curve, newMPCParams);

    await fdMPCParams.close();
    await fdZKeyNew.close();
    await fdZKeyOld.close();

    return true;

    async function readG1(fd) {
        const buff = await fd.read(curve.G1.F.n8*2);
        return curve.G1.fromRprUncompressed(buff, 0);
    }

    async function readG2(fd) {
        const buff = await fd.read(curve.G2.F.n8*2);
        return curve.G2.fromRprUncompressed(buff, 0);
    }


    function contributionIsEqual(c1, c2) {
        if (!curve.G1.eq(c1.deltaAfter   , c2.deltaAfter)) return false;
        if (!curve.G1.eq(c1.delta.g1_s   , c2.delta.g1_s)) return false;
        if (!curve.G1.eq(c1.delta.g1_sx  , c2.delta.g1_sx)) return false;
        if (!curve.G2.eq(c1.delta.g2_spx , c2.delta.g2_spx)) return false;
        if (!hashIsEqual(c1.transcript, c2.transcript)) return false;
        return true;
    }


}

const sameRatio$2 = sameRatio;



async function phase2verify(r1csFileName, pTauFileName, zkeyFileName, logger) {

    let sr;
    await blake2bWasm.ready();

    const {fd, sections} = await readBinFile(zkeyFileName, "zkey", 2);
    const zkey = await readHeader(fd, sections, "groth16");

    const curve = await getCurveFromQ(zkey.q);
    const sG1 = curve.G1.F.n8*2;
    const sG2 = curve.G2.F.n8*2;

    const mpcParams = await readMPCParams(fd, curve, sections);

    const accumulatedHasher = blake2bWasm(64);
    accumulatedHasher.update(mpcParams.csHash);
    let curDelta = curve.G1.g;
    for (let i=0; i<mpcParams.contributions.length; i++) {
        const c = mpcParams.contributions[i];
        const ourHasher = cloneHasher(accumulatedHasher);

        hashG1(ourHasher, curve, c.delta.g1_s);
        hashG1(ourHasher, curve, c.delta.g1_sx);

        if (!hashIsEqual(ourHasher.digest(), c.transcript)) {
            console.log(`INVALID(${i}): Inconsistent transcript `);
            return false;
        }

        const delta_g2_sp = hashToG2(curve, c.transcript);

        sr = await sameRatio$2(curve, c.delta.g1_s, c.delta.g1_sx, delta_g2_sp, c.delta.g2_spx);
        if (sr !== true) {
            console.log(`INVALID(${i}): public key G1 and G2 do not have the same ration `);
            return false;
        }

        sr = await sameRatio$2(curve, curDelta, c.deltaAfter, delta_g2_sp, c.delta.g2_spx);
        if (sr !== true) {
            console.log(`INVALID(${i}): deltaAfter does not fillow the public key `);
            return false;
        }

        if (c.type == 1) {
            const rng = rngFromBeaconParams(c.beaconHash, c.numIterationsExp);
            const expected_prvKey = curve.Fr.fromRng(rng);
            const expected_g1_s = curve.G1.toAffine(curve.G1.fromRng(rng));
            const expected_g1_sx = curve.G1.toAffine(curve.G1.timesFr(expected_g1_s, expected_prvKey));
            if (curve.G1.eq(expected_g1_s, c.delta.g1_s) !== true) {
                console.log(`INVALID(${i}): Key of the beacon does not match. g1_s `);
                return false;
            }
            if (curve.G1.eq(expected_g1_sx, c.delta.g1_sx) !== true) {
                console.log(`INVALID(${i}): Key of the beacon does not match. g1_sx `);
                return false;
            }
        }

        hashPubKey(accumulatedHasher, curve, c);

        const contributionHasher = blake2bWasm(64);
        hashPubKey(contributionHasher, curve, c);

        c.contributionHash = contributionHasher.digest();

        curDelta = c.deltaAfter;
    }



    // const initFileName = "~" + zkeyFileName + ".init";
    const initFileName = {type: "mem"};
    await newZKey(r1csFileName, pTauFileName, initFileName);

    const {fd: fdInit, sections: sectionsInit} = await readBinFile(initFileName, "zkey", 2);
    const zkeyInit = await readHeader(fdInit, sectionsInit, "groth16");

    if (  (!Scalar$1.eq(zkeyInit.q, zkey.q))
        ||(!Scalar$1.eq(zkeyInit.r, zkey.r))
        ||(zkeyInit.n8q != zkey.n8q)
        ||(zkeyInit.n8r != zkey.n8r))
    {
        if (logger) logger.error("INVALID:  Different curves");
        return false;
    }

    if (  (zkeyInit.nVars != zkey.nVars)
        ||(zkeyInit.nPublic !=  zkey.nPublic)
        ||(zkeyInit.domainSize != zkey.domainSize))
    {
        if (logger) logger.error("INVALID:  Different circuit parameters");
        return false;
    }

    if (!curve.G1.eq(zkey.vk_alpha_1, zkeyInit.vk_alpha_1)) {
        if (logger) logger.error("INVALID:  Invalid alpha1");
        return false;
    }
    if (!curve.G1.eq(zkey.vk_beta_1, zkeyInit.vk_beta_1)) {
        if (logger) logger.error("INVALID:  Invalid beta1");
        return false;
    }
    if (!curve.G2.eq(zkey.vk_beta_2, zkeyInit.vk_beta_2)) {
        if (logger) logger.error("INVALID:  Invalid beta2");
        return false;
    }
    if (!curve.G2.eq(zkey.vk_gamma_2, zkeyInit.vk_gamma_2)) {
        if (logger) logger.error("INVALID:  Invalid gamma2");
        return false;
    }
    if (!curve.G1.eq(zkey.vk_delta_1, curDelta)) {
        if (logger) logger.error("INVALID:  Invalud delta1");
        return false;
    }
    sr = await sameRatio$2(curve, curve.G1.g, curDelta, curve.G2.g, zkey.vk_delta_2);
    if (sr !== true) {
        if (logger) logger.error("INVALID:  Invalud delta2");
        return false;
    }

    const mpcParamsInit = await readMPCParams(fdInit, curve, sectionsInit);
    if (!hashIsEqual(mpcParams.csHash, mpcParamsInit.csHash)) {
        if (logger) logger.error("INVALID:  Circuit does not match");
        return false;
    }

    // Check sizes of sections
    if (sections[8][0].size != sG1*(zkey.nVars-zkey.nPublic-1)) {
        if (logger) logger.error("INVALID:  Invalid L section size");
        return false;
    }

    if (sections[9][0].size != sG1*(zkey.domainSize)) {
        if (logger) logger.error("INVALID:  Invalid H section size");
        return false;
    }

    let ss;
    ss = await sectionIsEqual(fd, sections, fdInit, sectionsInit, 3);
    if (!ss) {
        if (logger) logger.error("INVALID:  IC section is not identical");
        return false;
    }

    ss = await sectionIsEqual(fd, sections, fdInit, sectionsInit, 4);
    if (!ss) {
        if (logger) logger.error("Coeffs section is not identical");
        return false;
    }

    ss = await sectionIsEqual(fd, sections, fdInit, sectionsInit, 5);
    if (!ss) {
        if (logger) logger.error("A section is not identical");
        return false;
    }

    ss = await sectionIsEqual(fd, sections, fdInit, sectionsInit, 6);
    if (!ss) {
        if (logger) logger.error("B1 section is not identical");
        return false;
    }

    ss = await sectionIsEqual(fd, sections, fdInit, sectionsInit, 7);
    if (!ss) {
        if (logger) logger.error("B2 section is not identical");
        return false;
    }

    // Check L
    sr = await sectionHasSameRatio("G1", fdInit, sectionsInit, fd, sections, 8, zkey.vk_delta_2, zkeyInit.vk_delta_2, "L section");
    if (sr!==true) {
        if (logger) logger.error("L section does not match");
        return false;
    }

    // Check H
    sr = await sameRatioH();
    if (sr!==true) {
        if (logger) logger.error("H section does not match");
        return false;
    }

    if (logger) logger.info(formatHash(mpcParams.csHash, "Circuit Hash: "));

    await fd.close();
    await fdInit.close();

    for (let i=mpcParams.contributions.length-1; i>=0; i--) {
        const c = mpcParams.contributions[i];
        if (logger) logger.info("-------------------------");
        if (logger) logger.info(formatHash(c.contributionHash, `contribution #${i+1} ${c.name ? c.name : ""}:`));
        if (c.type == 1) {
            if (logger) logger.info(`Beacon generator: ${byteArray2hex(c.beaconHash)}`);
            if (logger) logger.info(`Beacon iterations Exp: ${c.numIterationsExp}`);
        }
    }
    if (logger) logger.info("-------------------------");

    if (logger) logger.info("ZKey Ok!");

    return true;


    async function sectionHasSameRatio(groupName, fd1, sections1, fd2, sections2, idSection, g2sp, g2spx, sectionName) {
        const MAX_CHUNK_SIZE = 1<<20;
        const G = curve[groupName];
        const sG = G.F.n8*2;
        await startReadUniqueSection(fd1, sections1, idSection);
        await startReadUniqueSection(fd2, sections2, idSection);

        let R1 = G.zero;
        let R2 = G.zero;

        const nPoints = sections1[idSection][0].size / sG;

        for (let i=0; i<nPoints; i += MAX_CHUNK_SIZE) {
            if (logger) logger.debug(`Same ratio check ${sectionName}:  ${i}/${nPoints}`);
            const n = Math.min(nPoints - i, MAX_CHUNK_SIZE);
            const bases1 = await fd1.read(n*sG);
            const bases2 = await fd2.read(n*sG);

            const scalars = new Uint8Array(4*n);
            crypto.randomFillSync(scalars);


            const r1 = await G.multiExpAffine(bases1, scalars);
            const r2 = await G.multiExpAffine(bases2, scalars);

            R1 = G.add(R1, r1);
            R2 = G.add(R2, r2);
        }
        await endReadSection(fd1);
        await endReadSection(fd2);

        sr = await sameRatio$2(curve, R1, R2, g2sp, g2spx);
        if (sr !== true) return false;

        return true;
    }

    async function sameRatioH() {
        const MAX_CHUNK_SIZE = 1<<20;
        const G = curve.G1;
        const sG = G.F.n8*2;

        const {fd: fdPTau, sections: sectionsPTau} = await readBinFile(pTauFileName, "ptau", 1);

        let buff_r = new Uint8Array(zkey.domainSize * zkey.n8r);

        const seed= new Array(8);
        for (let i=0; i<8; i++) {
            seed[i] = crypto.randomBytes(4).readUInt32BE(0, true);
        }
        const rng = new ChaCha(seed);
        for (let i=0; i<zkey.domainSize-1; i++) {   // Note that last one is zero
            const e = curve.Fr.fromRng(rng);
            curve.Fr.toRprLE(buff_r, i*zkey.n8r, e);
        }

        let R1 = G.zero;
        for (let i=0; i<zkey.domainSize; i += MAX_CHUNK_SIZE) {
            if (logger) logger.debug(`H Verificaition(tau):  ${i}/${zkey.domainSize}`);
            const n = Math.min(zkey.domainSize - i, MAX_CHUNK_SIZE);

            const buff1 = await fdPTau.read(sG*n, sectionsPTau[2][0].p + zkey.domainSize*sG + i*MAX_CHUNK_SIZE*sG);
            const buff2 = await fdPTau.read(sG*n, sectionsPTau[2][0].p + i*MAX_CHUNK_SIZE*sG);

            const buffB = await batchSubstract(buff1, buff2);
            const buffS = buff_r.slice((i*MAX_CHUNK_SIZE)*zkey.n8r, (i*MAX_CHUNK_SIZE+n)*zkey.n8r);
            const r = await G.multiExpAffine(buffB, buffS);

            R1 = G.add(R1, r);
        }

        // Caluclate odd coeficients in transformed domain

        buff_r = await curve.Fr.batchToMontgomery(buff_r);
        // const first = curve.Fr.neg(curve.Fr.inv(curve.Fr.e(2)));
        // Works*2   const first = curve.Fr.neg(curve.Fr.e(2));
        const first = curve.Fr.neg(curve.Fr.e(2));
        // const inc = curve.Fr.inv(curve.PFr.w[zkey.power+1]);
        const inc = curve.Fr.w[zkey.power+1];
        buff_r = await curve.Fr.batchApplyKey(buff_r, first, inc);
        buff_r = await curve.Fr.fft(buff_r);
        buff_r = await curve.Fr.batchFromMontgomery(buff_r);

        await startReadUniqueSection(fd, sections, 9);
        let R2 = G.zero;
        for (let i=0; i<zkey.domainSize; i += MAX_CHUNK_SIZE) {
            if (logger) logger.debug(`H Verificaition(lagrange):  ${i}/${zkey.domainSize}`);
            const n = Math.min(zkey.domainSize - i, MAX_CHUNK_SIZE);

            const buff = await fd.read(sG*n);
            const buffS = buff_r.slice((i*MAX_CHUNK_SIZE)*zkey.n8r, (i*MAX_CHUNK_SIZE+n)*zkey.n8r);
            const r = await G.multiExpAffine(buff, buffS);

            R2 = G.add(R2, r);
        }
        await endReadSection(fd);

        sr = await sameRatio$2(curve, R1, R2, zkey.vk_delta_2, zkeyInit.vk_delta_2);
        if (sr !== true) return false;


        return true;

    }

    async function batchSubstract(buff1, buff2) {
        const sG = curve.G1.F.n8*2;
        const nPoints = buff1.byteLength / sG;
        const concurrency= curve.tm.concurrency;
        const nPointsPerThread = Math.floor(nPoints / concurrency);
        const opPromises = [];
        for (let i=0; i<concurrency; i++) {
            let n;
            if (i< concurrency-1) {
                n = nPointsPerThread;
            } else {
                n = nPoints - i*nPointsPerThread;
            }
            if (n==0) continue;

            const subBuff1 = buff1.slice(i*nPointsPerThread*sG1, (i*nPointsPerThread+n)*sG1);
            const subBuff2 = buff2.slice(i*nPointsPerThread*sG1, (i*nPointsPerThread+n)*sG1);
            opPromises.push(batchSubstractThread(subBuff1, subBuff2));
        }


        const result = await Promise.all(opPromises);

        const fullBuffOut = new Uint8Array(nPoints*sG);
        let p =0;
        for (let i=0; i<result.length; i++) {
            fullBuffOut.set(result[i][0], p);
            p+=result[i][0].byteLength;
        }

        return fullBuffOut;
    }


    async function batchSubstractThread(buff1, buff2) {
        const sG1 = curve.G1.F.n8*2;
        const sGmid = curve.G1.F.n8*3;
        const nPoints = buff1.byteLength/sG1;
        const task = [];
        task.push({cmd: "ALLOCSET", var: 0, buff: buff1});
        task.push({cmd: "ALLOCSET", var: 1, buff: buff2});
        task.push({cmd: "ALLOC", var: 2, len: nPoints*sGmid});
        for (let i=0; i<nPoints; i++) {
            task.push({
                cmd: "CALL",
                fnName: "g1m_subAffine",
                params: [
                    {var: 0, offset: i*sG1},
                    {var: 1, offset: i*sG1},
                    {var: 2, offset: i*sGmid},
                ]
            });
        }
        task.push({cmd: "CALL", fnName: "g1m_batchToAffine", params: [
            {var: 2},
            {val: nPoints},
            {var: 2},
        ]});
        task.push({cmd: "GET", out: 0, var: 2, len: nPoints*sG1});

        const res = await curve.tm.queueAction(task);

        return res;
    }

}

async function phase2contribute(zkeyNameOld, zkeyNameNew, name, entropy, logger) {
    await blake2bWasm.ready();

    const {fd: fdOld, sections: sections} = await readBinFile(zkeyNameOld, "zkey", 2);
    const zkey = await readHeader(fdOld, sections, "groth16");

    const curve = await getCurveFromQ(zkey.q);

    const mpcParams = await readMPCParams(fdOld, curve, sections);

    const fdNew = await createBinFile(zkeyNameNew, "zkey", 1, 10);


    const rng = await getRandomRng(entropy);

    const transcriptHasher = blake2bWasm(64);
    transcriptHasher.update(mpcParams.csHash);
    for (let i=0; i<mpcParams.contributions.length; i++) {
        hashPubKey(transcriptHasher, curve, mpcParams.contributions[i]);
    }

    const curContribution = {};
    curContribution.delta = {};
    curContribution.delta.prvKey = curve.Fr.fromRng(rng);
    curContribution.delta.g1_s = curve.G1.toAffine(curve.G1.fromRng(rng));
    curContribution.delta.g1_sx = curve.G1.toAffine(curve.G1.timesFr(curContribution.delta.g1_s, curContribution.delta.prvKey));
    hashG1(transcriptHasher, curve, curContribution.delta.g1_s);
    hashG1(transcriptHasher, curve, curContribution.delta.g1_sx);
    curContribution.transcript = transcriptHasher.digest();
    curContribution.delta.g2_sp = hashToG2(curve, curContribution.transcript);
    curContribution.delta.g2_spx = curve.G2.toAffine(curve.G2.timesFr(curContribution.delta.g2_sp, curContribution.delta.prvKey));

    zkey.vk_delta_1 = curve.G1.timesFr(zkey.vk_delta_1, curContribution.delta.prvKey);
    zkey.vk_delta_2 = curve.G2.timesFr(zkey.vk_delta_2, curContribution.delta.prvKey);

    curContribution.deltaAfter = zkey.vk_delta_1;

    curContribution.type = 0;
    if (name) curContribution.name = name;

    mpcParams.contributions.push(curContribution);

    await writeHeader(fdNew, zkey);

    // IC
    await copySection(fdOld, sections, fdNew, 3);

    // Coeffs (Keep original)
    await copySection(fdOld, sections, fdNew, 4);

    // A Section
    await copySection(fdOld, sections, fdNew, 5);

    // B1 Section
    await copySection(fdOld, sections, fdNew, 6);

    // B2 Section
    await copySection(fdOld, sections, fdNew, 7);

    const invDelta = curve.Fr.inv(curContribution.delta.prvKey);
    await applyKeyToSection(fdOld, sections, fdNew, 8, curve, "G1", invDelta, curve.Fr.e(1), "L Section", logger);
    await applyKeyToSection(fdOld, sections, fdNew, 9, curve, "G1", invDelta, curve.Fr.e(1), "H Section", logger);

    await writeMPCParams(fdNew, curve, mpcParams);

    await fdOld.close();
    await fdNew.close();

    const contributionHasher = blake2bWasm(64);
    hashPubKey(contributionHasher, curve, curContribution);

    const contribuionHash = contributionHasher.digest();

    if (logger) logger.info(formatHash(contribuionHash, "Contribution Hash: "));

    return contribuionHash;
}

async function beacon$1(zkeyNameOld, zkeyNameNew, name, beaconHashStr, numIterationsExp, logger) {
    await blake2bWasm.ready();

    const beaconHash = hex2ByteArray(beaconHashStr);
    if (   (beaconHash.byteLength == 0)
        || (beaconHash.byteLength*2 !=beaconHashStr.length))
    {
        if (logger) logger.error("Invalid Beacon Hash. (It must be a valid hexadecimal sequence)");
        return false;
    }
    if (beaconHash.length>=256) {
        if (logger) logger.error("Maximum lenght of beacon hash is 255 bytes");
        return false;
    }

    numIterationsExp = parseInt(numIterationsExp);
    if ((numIterationsExp<10)||(numIterationsExp>63)) {
        if (logger) logger.error("Invalid numIterationsExp. (Must be between 10 and 63)");
        return false;
    }


    const {fd: fdOld, sections: sections} = await readBinFile(zkeyNameOld, "zkey", 2);
    const zkey = await readHeader(fdOld, sections, "groth16");

    const curve = await getCurveFromQ(zkey.q);

    const mpcParams = await readMPCParams(fdOld, curve, sections);

    const fdNew = await createBinFile(zkeyNameNew, "zkey", 1, 10);

    const rng = await rngFromBeaconParams(beaconHash, numIterationsExp);

    const transcriptHasher = blake2bWasm(64);
    transcriptHasher.update(mpcParams.csHash);
    for (let i=0; i<mpcParams.contributions.length; i++) {
        hashPubKey(transcriptHasher, curve, mpcParams.contributions[i]);
    }

    const curContribution = {};
    curContribution.delta = {};
    curContribution.delta.prvKey = curve.Fr.fromRng(rng);
    curContribution.delta.g1_s = curve.G1.toAffine(curve.G1.fromRng(rng));
    curContribution.delta.g1_sx = curve.G1.toAffine(curve.G1.timesFr(curContribution.delta.g1_s, curContribution.delta.prvKey));
    hashG1(transcriptHasher, curve, curContribution.delta.g1_s);
    hashG1(transcriptHasher, curve, curContribution.delta.g1_sx);
    curContribution.transcript = transcriptHasher.digest();
    curContribution.delta.g2_sp = hashToG2(curve, curContribution.transcript);
    curContribution.delta.g2_spx = curve.G2.toAffine(curve.G2.timesFr(curContribution.delta.g2_sp, curContribution.delta.prvKey));

    zkey.vk_delta_1 = curve.G1.timesFr(zkey.vk_delta_1, curContribution.delta.prvKey);
    zkey.vk_delta_2 = curve.G2.timesFr(zkey.vk_delta_2, curContribution.delta.prvKey);

    curContribution.deltaAfter = zkey.vk_delta_1;

    curContribution.type = 1;
    curContribution.numIterationsExp = numIterationsExp;
    curContribution.beaconHash = beaconHash;

    if (name) curContribution.name = name;

    mpcParams.contributions.push(curContribution);

    await writeHeader(fdNew, zkey);

    // IC
    await copySection(fdOld, sections, fdNew, 3);

    // Coeffs (Keep original)
    await copySection(fdOld, sections, fdNew, 4);

    // A Section
    await copySection(fdOld, sections, fdNew, 5);

    // B1 Section
    await copySection(fdOld, sections, fdNew, 6);

    // B2 Section
    await copySection(fdOld, sections, fdNew, 7);

    const invDelta = curve.Fr.inv(curContribution.delta.prvKey);
    await applyKeyToSection(fdOld, sections, fdNew, 8, curve, "G1", invDelta, curve.Fr.e(1), "L Section", logger);
    await applyKeyToSection(fdOld, sections, fdNew, 9, curve, "G1", invDelta, curve.Fr.e(1), "H Section", logger);

    await writeMPCParams(fdNew, curve, mpcParams);

    await fdOld.close();
    await fdNew.close();

    const contributionHasher = blake2bWasm(64);
    hashPubKey(contributionHasher, curve, curContribution);

    const contribuionHash = contributionHasher.digest();

    if (logger) logger.info(formatHash(contribuionHash, "Contribution Hash: "));

    return contribuionHash;
}

async function zkeyExportJson(zkeyFileName, verbose) {

    const zKey = await readZKey(zkeyFileName);

    return zKey;
}

// Format of the output

async function bellmanContribute(curve, challangeFilename, responesFileName, entropy, logger) {
    await blake2bWasm.ready();

    const rng = await getRandomRng(entropy);

    const delta = curve.Fr.fromRng(rng);
    const invDelta = curve.Fr.inv(delta);

    const sG1 = curve.G1.F.n8*2;
    const sG2 = curve.G2.F.n8*2;

    const fdFrom = await readExisting$1(challangeFilename);
    const fdTo = await createOverride(responesFileName);


    await copy(sG1); // alpha1
    await copy(sG1); // beta1
    await copy(sG2); // beta2
    await copy(sG2); // gamma2
    const oldDelta1 = await readG1();
    const delta1 = curve.G1.timesFr(oldDelta1, delta);
    await writeG1(delta1);
    const oldDelta2 = await readG2();
    const delta2 = curve.G2.timesFr(oldDelta2, delta);
    await writeG2(delta2);

    // IC
    const nIC = await fdFrom.readUBE32();
    await fdTo.writeUBE32(nIC);
    await copy(nIC*sG1);

    // H
    const nH = await fdFrom.readUBE32();
    await fdTo.writeUBE32(nH);
    await applyKeyToChallangeSection(fdFrom, fdTo, null, curve, "G1", nH, invDelta, curve.Fr.e(1), "UNCOMPRESSED", "H", logger);

    // L
    const nL = await fdFrom.readUBE32();
    await fdTo.writeUBE32(nL);
    await applyKeyToChallangeSection(fdFrom, fdTo, null, curve, "G1", nL, invDelta, curve.Fr.e(1), "UNCOMPRESSED", "L", logger);

    // A
    const nA = await fdFrom.readUBE32();
    await fdTo.writeUBE32(nA);
    await copy(nA*sG1);

    // B1
    const nB1 = await fdFrom.readUBE32();
    await fdTo.writeUBE32(nB1);
    await copy(nB1*sG1);

    // B2
    const nB2 = await fdFrom.readUBE32();
    await fdTo.writeUBE32(nB2);
    await copy(nB2*sG2);


    //////////
    /// Read contributions
    //////////
    const transcriptHasher = blake2bWasm(64);

    const mpcParams = {};
    // csHash
    mpcParams.csHash =  await fdFrom.read(64);
    transcriptHasher.update(mpcParams.csHash);

    const nConttributions = await fdFrom.readUBE32();
    mpcParams.contributions = [];
    for (let i=0; i<nConttributions; i++) {
        const c = { delta:{} };
        c.deltaAfter = await readG1();
        c.delta.g1_s = await readG1();
        c.delta.g1_sx = await readG1();
        c.delta.g2_spx = await readG2();
        c.transcript = await fdFrom.read(64);
        mpcParams.contributions.push(c);
        hashPubKey(transcriptHasher, curve, c);
    }

    const curContribution = {};
    curContribution.delta = {};
    curContribution.delta.prvKey = delta;
    curContribution.delta.g1_s = curve.G1.toAffine(curve.G1.fromRng(rng));
    curContribution.delta.g1_sx = curve.G1.toAffine(curve.G1.timesFr(curContribution.delta.g1_s, delta));
    hashG1(transcriptHasher, curve, curContribution.delta.g1_s);
    hashG1(transcriptHasher, curve, curContribution.delta.g1_sx);
    curContribution.transcript = transcriptHasher.digest();
    curContribution.delta.g2_sp = hashToG2(curve, curContribution.transcript);
    curContribution.delta.g2_spx = curve.G2.toAffine(curve.G2.timesFr(curContribution.delta.g2_sp, delta));
    curContribution.deltaAfter = delta1;
    curContribution.type = 0;
    mpcParams.contributions.push(curContribution);


    //////////
    /// Write COntribution
    //////////

    await fdTo.write(mpcParams.csHash);
    await fdTo.writeUBE32(mpcParams.contributions.length);

    for (let i=0; i<mpcParams.contributions.length; i++) {
        const c = mpcParams.contributions[i];
        await writeG1(c.deltaAfter);
        await writeG1(c.delta.g1_s);
        await writeG1(c.delta.g1_sx);
        await writeG2(c.delta.g2_spx);
        await fdTo.write(c.transcript);
    }

    const contributionHasher = blake2bWasm(64);
    hashPubKey(contributionHasher, curve, curContribution);

    const contributionHash = contributionHasher.digest();

    if (logger) logger.info(formatHash(contributionHash, "Contribution Hash: "));

    await fdTo.close();
    await fdFrom.close();

    return contributionHash;

    async function copy(nBytes) {
        const CHUNK_SIZE = fdFrom.pageSize*2;
        for (let i=0; i<nBytes; i+= CHUNK_SIZE) {
            const n = Math.min(nBytes -i, CHUNK_SIZE);
            const buff = await fdFrom.read(n);
            await fdTo.write(buff);
        }
    }

    async function readG1() {
        const buff = await fdFrom.read(curve.G1.F.n8*2);
        return curve.G1.fromRprUncompressed(buff, 0);
    }

    async function readG2() {
        const buff = await fdFrom.read(curve.G2.F.n8*2);
        return curve.G2.fromRprUncompressed(buff, 0);
    }

    async function writeG1(P) {
        const buff = new Uint8Array(sG1);
        curve.G1.toRprUncompressed(buff, 0, P);
        await fdTo.write(buff);
    }

    async function writeG2(P) {
        const buff = new Uint8Array(sG2);
        curve.G2.toRprUncompressed(buff, 0, P);
        await fdTo.write(buff);
    }


}

const {stringifyBigInts: stringifyBigInts$4} = utils$1;


async function zkeyExportVerificationKey(zkeyName, logger) {

    const {fd, sections} = await readBinFile(zkeyName, "zkey", 2);
    const zkey = await readHeader(fd, sections, "groth16");

    const curve = await getCurveFromQ(zkey.q);
    const sG1 = curve.G1.F.n8*2;

    const alphaBeta = await curve.pairing( zkey.vk_alpha_1 , zkey.vk_beta_2 );

    let vKey = {
        protocol: zkey.protocol,
        curve: curve.name,
        nPublic: zkey.nPublic,

        vk_alpha_1: curve.G1.toObject(zkey.vk_alpha_1),

        vk_beta_2: curve.G2.toObject(zkey.vk_beta_2),
        vk_gamma_2:  curve.G2.toObject(zkey.vk_gamma_2),
        vk_delta_2:  curve.G2.toObject(zkey.vk_delta_2),

        vk_alphabeta_12: curve.Gt.toObject(alphaBeta)
    };

    // Read IC Section
    ///////////
    await startReadUniqueSection(fd, sections, 3);
    vKey.IC = [];
    for (let i=0; i<= zkey.nPublic; i++) {
        const buff = await fd.read(sG1);
        const P = curve.G1.toObject(buff);
        vKey.IC.push(P);
    }
    await endReadSection(fd);

    vKey = stringifyBigInts$4(vKey);

    await fd.close();

    return vKey;
}

// Not ready yet
// module.exports.generateVerifier_kimleeoh = generateVerifier_kimleeoh;



async function exportSolidityVerifier(zKeyName, templateName, logger) {

    const verificationKey = await zkeyExportVerificationKey(zKeyName);

    const fd = await readExisting$1(templateName);
    const buff = await fd.read(fd.totalSize);
    let template = new TextDecoder("utf-8").decode(buff);

    const vkalpha1_str = `${verificationKey.vk_alpha_1[0].toString()},`+
                        `${verificationKey.vk_alpha_1[1].toString()}`;
    template = template.replace("<%vk_alpha1%>", vkalpha1_str);

    const vkbeta2_str = `[${verificationKey.vk_beta_2[0][1].toString()},`+
                         `${verificationKey.vk_beta_2[0][0].toString()}], `+
                        `[${verificationKey.vk_beta_2[1][1].toString()},` +
                         `${verificationKey.vk_beta_2[1][0].toString()}]`;
    template = template.replace("<%vk_beta2%>", vkbeta2_str);

    const vkgamma2_str = `[${verificationKey.vk_gamma_2[0][1].toString()},`+
                          `${verificationKey.vk_gamma_2[0][0].toString()}], `+
                         `[${verificationKey.vk_gamma_2[1][1].toString()},` +
                          `${verificationKey.vk_gamma_2[1][0].toString()}]`;
    template = template.replace("<%vk_gamma2%>", vkgamma2_str);

    const vkdelta2_str = `[${verificationKey.vk_delta_2[0][1].toString()},`+
                          `${verificationKey.vk_delta_2[0][0].toString()}], `+
                         `[${verificationKey.vk_delta_2[1][1].toString()},` +
                          `${verificationKey.vk_delta_2[1][0].toString()}]`;
    template = template.replace("<%vk_delta2%>", vkdelta2_str);

    // The points

    template = template.replace("<%vk_input_length%>", (verificationKey.IC.length-1).toString());
    template = template.replace("<%vk_ic_length%>", verificationKey.IC.length.toString());
    let vi = "";
    for (let i=0; i<verificationKey.IC.length; i++) {
        if (vi != "") vi = vi + "        ";
        vi = vi + `vk.IC[${i}] = Pairing.G1Point(${verificationKey.IC[i][0].toString()},`+
                                                `${verificationKey.IC[i][1].toString()});\n`;
    }
    template = template.replace("<%vk_ic_pts%>", vi);

    return template;
}

var zkey = /*#__PURE__*/Object.freeze({
    __proto__: null,
    newZKey: newZKey,
    exportBellman: phase2exportMPCParams,
    importBellman: phase2importMPCParams,
    verify: phase2verify,
    contribute: phase2contribute,
    beacon: beacon$1,
    exportJson: zkeyExportJson,
    bellmanContribute: bellmanContribute,
    exportVerificationKey: zkeyExportVerificationKey,
    exportSolidityVerifier: exportSolidityVerifier
});

exports.groth16 = groth16;
exports.powersOfTau = powersoftau;
exports.r1cs = r1cs;
exports.wtns = wtns;
exports.zKey = zkey;
