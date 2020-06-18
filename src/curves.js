const Scalar = require("ffjavascript").Scalar;
const bn128 = require("ffjavascript").bn128;

module.exports.getCurveFromQ = function getCurveFromQ(q) {
    let curve;
    if (Scalar.eq(q, bn128.q)) {
        curve = bn128;
    } else {
        throw new Error(`Curve not supported: ${q.toString()}`);
    }
    return curve;
};

module.exports.getCurveFromName = function getCurveFromName(name) {
    let curve;
    const normName = normalizeName(name);
    if (["BN128", "BN254", "ALTBN128"].indexOf(normName) >= 0) {
        curve = bn128;
    } else {
        throw new Error(`Curve not supported: ${name}`);
    }
    return curve;

    function normalizeName(n) {
        return n.toUpperCase().match(/[A-Za-z0-9]+/g).join("");
    }

};

