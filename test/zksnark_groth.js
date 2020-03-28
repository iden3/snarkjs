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
const loadR1cs = require("r1csfile").load;

const zkSnark = require("../index.js");
const WitnessCalculatorBuilder = require("circom_runtime").WitnessCalculatorBuilder;

const assert = chai.assert;

describe("zkSnark Groth", () => {
    it("Load a circuit, create trusted setup, create a proof and validate it", async () => {
        const cir = await loadR1cs(path.join(__dirname, "circuit", "circuit.r1cs"), true);

        const setup = zkSnark.groth.setup(cir);

        const wasm = await fs.promises.readFile(path.join(__dirname, "circuit", "circuit.wasm"));

        const wc = await WitnessCalculatorBuilder(wasm, {sanityCheck: true});

        const witness = await wc.calculateWitness({"a": "33", "b": "34"});

        const {proof, publicSignals} = zkSnark.groth.genProof(setup.vk_proof, witness);

        assert( zkSnark.groth.isValid(setup.vk_verifier, proof, publicSignals));
    }).timeout(10000000);
});
