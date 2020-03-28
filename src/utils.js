const bigInt = require("big-integer");


module.exports.stringifyBigInts = stringifyBigInts;
module.exports.unstringifyBigInts = unstringifyBigInts;
module.exports.beBuff2int = beBuff2int;
module.exports.beInt2Buff = beInt2Buff;

function beBuff2int(buff) {
    let res = bigInt.zero;
    for (let i=0; i<buff.length; i++) {
        const n = bigInt(buff[buff.length - i - 1]);
        res = res.add(n.shiftLeft(i*8));
    }
    return res;
}

function beInt2Buff(n, len) {
    let r = n;
    let o =len-1;
    const buff = Buffer.alloc(len);
    while ((r.gt(bigInt.zero))&&(o>=0)) {
        let c = Number(r.and(bigInt("255")));
        buff[o] = c;
        o--;
        r = r.shiftRight(8);
    }
    if (r.greater(bigInt.zero)) throw new Error("Number does not feed in buffer");
    return buff;
}

function stringifyBigInts(o) {
    if ((typeof(o) == "bigint") || o.eq !== undefined)  {
        return o.toString(10);
    } else if (Array.isArray(o)) {
        return o.map(stringifyBigInts);
    } else if (typeof o == "object") {
        const res = {};
        for (let k in o) {
            res[k] = stringifyBigInts(o[k]);
        }
        return res;
    } else {
        return o;
    }
}

function unstringifyBigInts(o) {
    if ((typeof(o) == "string") && (/^[0-9]+$/.test(o) ))  {
        return bigInt(o);
    } else if (Array.isArray(o)) {
        return o.map(unstringifyBigInts);
    } else if (typeof o == "object") {
        const res = {};
        for (let k in o) {
            res[k] = unstringifyBigInts(o[k]);
        }
        return res;
    } else {
        return o;
    }
}

