const chai = require("chai");
const fs = require("fs");
const bigInt = require("../src/bigint.js");

const Circuit = require("../src/circuit.js");
const zkSnark = require("../index.js");

const assert = chai.assert;


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

describe("zkSnark", () => {
    it("Load a circuit, create trusted setup, create a proof and validate", () => {

        const cirDef = JSON.parse(fs.readFileSync("../jaz/sum.json", "utf8"));
        const cir = new Circuit(cirDef);

        const setup = zkSnark.setup(cir);
        const strSetup = stringifyBigInts(setup);
        fs.writeFileSync("vk_proof.json", JSON.stringify(strSetup.vk_proof), "utf-8");
        fs.writeFileSync("vk_verifier.json", JSON.stringify(strSetup.vk_verifier), "utf-8");

/*
        const setup = {};
        setup.vk_proof = unstringifyBigInts(JSON.parse(fs.readFileSync("vk_proof.json", "utf8")));
        setup.vk_verifier = unstringifyBigInts(JSON.parse(fs.readFileSync("vk_verifier.json", "utf8")));
*/
        const witness = cir.calculateWitness({"a": "33", "b": "34"});

        assert.equal(witness[cir.getSignalIdx("main.out")].toString(), "67");

        const {proof, publicSignals} = zkSnark.genProof(setup.vk_proof, witness);

        assert( zkSnark.isValid(setup.vk_verifier, proof, publicSignals));
    }).timeout(10000000);
});
