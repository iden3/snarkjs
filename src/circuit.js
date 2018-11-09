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

const bigInt = require("./bigint.js");

const __P__ = bigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");
const __MASK__ = bigInt("28948022309329048855892746252171976963317496166410141009864396001978282409983"); // 0x3FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
const calculateWitness = require("./calculateWitness.js");

module.exports = class Circuit {
    constructor(circuitDef) {
        this.nPubInputs = circuitDef.nPubInputs;
        this.nPrvInputs = circuitDef.nPrvInputs;
        this.nInputs = circuitDef.nInputs;
        this.nOutputs = circuitDef.nOutputs;
        this.nVars = circuitDef.nVars;
        this.nSignals = circuitDef.nSignals;
        this.nConstants = circuitDef.nConstants;

        this.nConstraints = circuitDef.constraints.length;

        this.signalName2Idx = circuitDef.signalName2Idx;
        this.components = circuitDef.components;
        this.componentName2Idx = circuitDef.componentName2Idx;
        this.signals = circuitDef.signals;
        this.constraints = circuitDef.constraints;

        this.templates = {};
        for (let t in circuitDef.templates) {
            this.templates[t] = eval(" const __f= " +circuitDef.templates[t] + "\n__f");
        }

        this.functions = {};
        for (let f in circuitDef.functions) {
            this.functions[f] = {
                params: circuitDef.functions[f].params,
                func: eval(" const __f= " +circuitDef.functions[f].func + "\n__f;")
            };
        }
    }

    calculateWitness(input, log) {
        return calculateWitness(this, input, log);
    }

    checkWitness(w) {
        const evalLC = (lc, w) => {
            let acc = bigInt(0);
            for (let k in lc) {
                acc=  acc.add(bigInt(w[k]).mul(bigInt(lc[k]))).mod(__P__);
            }
            return acc;
        }

        const checkConstraint = (ct, w) => {
            const a=evalLC(ct[0],w);
            const b=evalLC(ct[1],w);
            const c=evalLC(ct[2],w);
            const res = (a.mul(b).sub(c)).affine(__P__);
            if (!res.isZero()) return false;
            return true;
        }


        for (let i=0; i<this.constraints.length; i++) {
            if (!checkConstraint(this.constraints[i], w)) {
                this.printCostraint(this.constraints[i]);
                return false;
            }
        }

        return true;

    }

    printCostraint(c) {
        const lc2str = (lc) => {
            let S = "";
            for (let k in lc) {
                let name = this.signals[k].names[0];
                if (name == "one") name = "";
                let v = bigInt(lc[k]);
                let vs;
                if (!v.lesserOrEquals(__P__.shr(bigInt(1)))) {
                    v = __P__.sub(v);
                    vs = "-"+v.toString();
                } else {
                    if (S!="") {
                        vs = "+"+v.toString();
                    } else {
                        vs = "";
                    }
                    if (vs!="1") {
                        vs = vs + v.toString();;
                    }
                }

                S= S + " " + vs + name;
            }
            return S;
        };
        const S = `[ ${lc2str(c[0])} ] * [ ${lc2str(c[1])} ] - [ ${lc2str(c[2])} ] = 0`;
        console.log(S);
    }

    printConstraints() {
        for (let i=0; i<this.constraints.length; i++) {
            this.printCostraint(this.constraints[i]);
        }
    }

    getSignalIdx(name) {
        if (typeof(this.signalName2Idx[name]) != "undefined") return this.signalName2Idx[name];
        if (!isNaN(name)) return Number(name);
        throw new Error("Invalid signal identifier: "+ name);
    }

    // returns the index of the i'th output
    outputIdx(i) {
        if (i>=this.nOutputs) throw new Error("Accessing an invalid output: "+i);
        return i+1;
    }

    // returns the index of the i'th input
    inputIdx(i) {
        if (i>=this.nInputs) throw new Error("Accessing an invalid input: "+i);
        return this.nOutputs + 1 + i;
    }

    // returns the index of the i'th public input
    pubInputIdx(i) {
        if (i>=this.nPubInputs) throw new Error("Accessing an invalid pubInput: "+i);
        return this.inputIdx(i);
    }

    // returns the index of the i'th private input
    prvInputIdx(i) {
        if (i>=this.nPrvInputs) throw new Error("Accessing an invalid prvInput: "+i);
        return this.inputIdx(this.nPubInputs + i);
    }

    // returns the index of the i'th variable
    varIdx(i) {
        if (i>=this.nVars) throw new Error("Accessing an invalid variable: "+i);
        return i;
    }

    // returns the index of the i'th constant
    constantIdx(i) {
        if (i>=this.nConstants) throw new Error("Accessing an invalid constant: "+i);
        return this.nVars + i;
    }

    // returns the index of the i'th signal
    signalIdx(i) {
        if (i>=this.nSignls) throw new Error("Accessing an invalid signal: "+i);
        return i;
    }

    signalNames(i) {
        return this.signals[ this.getSignalIdx(i) ].names.join(", ");
    }

    a(constraint, signalIdx) {
        return bigInt(this.constraints[constraint][0][signalIdx] || 0 );
    }

    b(constraint, signalIdx) {
        return bigInt(this.constraints[constraint][1][signalIdx] || 0);
    }

    c(constraint, signalIdx) {
        return bigInt(this.constraints[constraint][2][signalIdx] || 0);
    }
};
