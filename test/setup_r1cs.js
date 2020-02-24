const chai = require("chai");
const fs = require("fs");
const path = require("path");
const lodash = require("lodash");

const zkSnark = require("../index.js");

const assert = chai.assert;

describe("R1CS", () => {

    it("parser", () => {
        // Load circuit with .json file
        const cirDefJSON = JSON.parse(fs.readFileSync(path.join(__dirname, "r1cs", "circuit.json"), "utf8"));
        const cirJSON = new zkSnark.Circuit(cirDefJSON);
        // Load circuit with .r1cs file (async)
        zkSnark.parseR1cs(path.join(__dirname, "r1cs", "circuit.r1cs"))
            .then( cirDefR1cs => {
                assert(cirJSON.nVars == cirDefR1cs.nVars);
                assert(cirJSON.nPubInputs == cirDefR1cs.nPubInputs);
                assert(cirJSON.nOutputs == cirDefR1cs.nOutputs);
                assert(cirJSON.constraints.length == cirDefR1cs.nConstraints);

                for (let i = 0; i < cirDefR1cs.nConstraints; i++){
                    const constraintJSON = cirJSON.constraints[i];
                    const constraintR1CS = cirDefR1cs.constraints[i];
                    assert(constraintJSON.length, constraintR1CS.length);
                    for (let j = 0; j < constraintJSON.length; j++)
                        assert(lodash.isEqual(constraintJSON[j], constraintR1CS[j]));
                }
            });
    });

    it("check setup", () => {
        // load JSON circuit
        const cirDef = JSON.parse(fs.readFileSync(path.join(__dirname, "r1cs", "circuit.json"), "utf8"));
        const cir = new zkSnark.Circuit(cirDef);

        // load .r1cs circuit (sync)
        const cirDefR1cs = zkSnark.parseR1csSync(path.join(__dirname, "r1cs", "circuit.r1cs"));
   
        // calculate prover and verifier from R1CS circuit
        const setupR1cs = zkSnark["groth"].setup(cirDefR1cs);

        // calculate witness from regular circuit
        const witness = cir.calculateWitness({"a": "1", "b": "1", "c": "5", "d": "5", "e": "1", "f": "25"});

        // generate proof
        const { proof, publicSignals } = zkSnark["groth"].genProof(setupR1cs.vk_proof, witness);

        // check proof
        const isValid = zkSnark["groth"].isValid(setupR1cs.vk_verifier, proof, publicSignals);
        assert(isValid);
    });
});