const bigInt = require("big-integer");

exports.beBuff2int = function(buff) {
    let res = bigInt.zero;
    for (let i=0; i<buff.length; i++) {
        const n = bigInt(buff[buff.length - i - 1]);
        res = res.add(n.shiftLeft(i*8));
    }
    return res;
};

exports.beInt2Buff = function(n, len) {
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
};
