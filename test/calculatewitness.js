const chai = require("chai");
const fs = require("fs");

const Circuit = require("../src/circuit.js");
const BN128 = require("../src/BN128.js");
const F1Field = require("../src/zqfield.js");

const assert = chai.assert;


describe("Calculate witness", () => {
    it("Should calculate the witness of a sum circuit", () => {

        const cirDef = JSON.parse(fs.readFileSync("../jaz/sum.json", "utf8"));
        const cir = new Circuit(cirDef);
        const witness = cir.calculateWitness({"a": "33", "b": "34"});

        assert.equal(witness[cir.getSignalIdx("main.out")].toString(), "67");
    });
});
