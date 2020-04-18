
module.exports = function printR1cs(r1cs, syms) {
    for (let i=0; i<r1cs.constraints.length; i++) {
        printCostraint(r1cs.constraints[i]);
    }
    function printCostraint(c) {
        const lc2str = (lc) => {
            let S = "";
            for (let k in lc) {
                let name = syms.varIdx2Name[k];
                if (name == "one") name = "";

                let vs = r1cs.Fr.toString(lc[k]);
                if (vs == "1") vs = "";  // Do not show ones
                if (vs == "-1") vs = "-";  // Do not show ones
                if ((S!="")&&(vs[0]!="-")) vs = "+"+vs;
                if (S!="") vs = " "+vs;
                S= S + vs   + name;
            }
            return S;
        };
        const S = `[ ${lc2str(c[0])} ] * [ ${lc2str(c[1])} ] - [ ${lc2str(c[2])} ] = 0`;
        console.log(S);
    }

};
