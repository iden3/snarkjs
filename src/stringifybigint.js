const bigInt = require("./bigint.js");

module.exports.stringifyBigInts = stringifyBigInts;
module.exports.unstringifyBigInts = unstringifyBigInts;

function stringifyBigInts(o) {
    if ((typeof(o) == "bigint") || (o instanceof bigInt))  {
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
