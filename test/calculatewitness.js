/*
    Copyright 2018 0kims association.

    This file is part of zksnark JavaScript library.

    zksnark JavaScript library is a free software: you can redistribute it and/or 
    modify it under the terms of the GNU General Public License as published by the 
    Free Software Foundation, either version 3 of the License, or (at your option) 
    any later version.

    zksnark JavaScript library is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY 
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for 
    more details.

    You should have received a copy of the GNU General Public License along with 
    zksnark JavaScript library. If not, see <https://www.gnu.org/licenses/>.
*/

const chai = require("chai");
const fs = require("fs");
const path = require("path");

const Circuit = require("../src/circuit.js");
const BN128 = require("../src/bn128.js");
const F1Field = require("../src/zqfield.js");

const assert = chai.assert;


describe("Calculate witness", () => {
    it("Should calculate the witness of a sum circuit", () => {

        const cirDef = JSON.parse(fs.readFileSync(path.join(__dirname, "circuit", "sum.json"), "utf8"));
        const cir = new Circuit(cirDef);
        const witness = cir.calculateWitness({"a": "33", "b": "34"});

        assert.equal(witness[cir.getSignalIdx("main.out")].toString(), "67");
    });
});
