const bigInt = require("big-integer");

module.exports = function printR1cs(r1cs, syms) {
    for (let i=0; i<r1cs.constraints.length; i++) {
        printCostraint(r1cs.constraints[i]);
    }
    function printCostraint(c) {
        const lc2str = (lc) => {
            let S = "";
            for (let k in lc) {
                let name = syms[k];
                if (name == "one") name = "";
                let v = bigInt(lc[k]);
                let vs;
                if (!v.lesserOrEquals(r1cs.prime.shiftRight(bigInt(1)))) {
                    v = r1cs.prime.minus(v);
                    vs = "-"+v.toString();
                } else {
                    if (S!="") {
                        vs = "+"+v.toString();
                    } else {
                        vs = "";
                    }
                    if (vs!="1") {
                        vs = vs + v.toString();
                    }
                }

                S= S + " " + vs + name;
            }
            return S;
        };
        const S = `[ ${lc2str(c[0])} ] * [ ${lc2str(c[1])} ] - [ ${lc2str(c[2])} ] = 0`;
        console.log(S);
    }

};
