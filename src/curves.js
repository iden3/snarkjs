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
