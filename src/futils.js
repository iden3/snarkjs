const bigInt = require("big-integer");

exports.mulEscalar = (F, base, e) =>{
    let res = F.zero;
    let rem = bigInt(e);
    let exp = base;

    while (! rem.isZero()) {
        if (rem.isOdd()) {
            res = F.add(res, exp);
        }
        exp = F.double(exp);
        rem = rem.shiftRight(1);
    }

    return res;
};


exports.exp = (F, base, e) =>{
    let res = F.one;
    let rem = bigInt(e);
    let exp = base;

    while (! rem.isZero()) {
        if (rem.isOdd()) {
            res = F.mul(res, exp);
        }
        exp = F.square(exp);
        rem = rem.shiftRight(1);
    }

    return res;
};
