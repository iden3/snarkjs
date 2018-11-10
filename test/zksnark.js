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
const bigInt = require("../src/bigint.js");

const Circuit = require("../src/circuit.js");
const zkSnark = require("../index.js").original;
const BN128 = require("../src/bn128.js");
const PolField = require("../src/polfield.js");
const ZqField = require("../src/zqfield.js");

const {stringifyBigInts, unstringifyBigInts} = require("../src/stringifybigint.js");

const bn128 = new BN128();
const PolF = new PolField(new ZqField(bn128.r));
const G1 = bn128.G1;
const G2 = bn128.G2;

const assert = chai.assert;


describe("zkSnark original", () => {
    it("Load a circuit, create trusted setup, create a proof and validate it", () => {


        const cirDef = JSON.parse(fs.readFileSync(path.join(__dirname, "circuit", "sum.json"), "utf8"));
        const cir = new Circuit(cirDef);

        const setup = zkSnark.setup(cir);
        const strSetup = stringifyBigInts(setup);
        fs.writeFileSync("vk_proof.json", JSON.stringify(strSetup.vk_proof), "utf-8");
        fs.writeFileSync("vk_verifier.json", JSON.stringify(strSetup.vk_verifier), "utf-8");


        function polT2S(p) {
            const p_T = new Array(setup.vk_proof.domainSize).fill(bigInt(0));

            for (let c in p) {
                p_T[c] = p[c];
            }

            return PolF.ifft(p_T);
        }

/*
        const setup = {};
        setup.vk_proof = unstringifyBigInts(JSON.parse(fs.readFileSync("vk_proof.json", "utf8")));
        setup.vk_verifier = unstringifyBigInts(JSON.parse(fs.readFileSync("vk_verifier.json", "utf8")));
*/
        const witness = cir.calculateWitness({"a": "33", "b": "34"});

        const {proof, publicSignals} = zkSnark.genProof(setup.vk_proof, witness);

/*
        const polA = new Array(cir.nVars);
        const polB = new Array(cir.nVars);
        const polC = new Array(cir.nVars);
        for (let i=0; i<cir.nVars; i++) {
            polA[i] = polT2S(setup.vk_proof.polsA[i]);
            polB[i] = polT2S(setup.vk_proof.polsB[i]);
            polC[i] = polT2S(setup.vk_proof.polsC[i]);
        }

        PolF._setRoots(setup.vk_proof.domainBits);
        for (let c=0; c<setup.vk_proof.domainSize; c++) {
            let A = bigInt(0);
            let B = bigInt(0);
            let C = bigInt(0);
            for (let s=0; s<cir.nVars; s++) {
                A = PolF.F.add(A, PolF.F.mul(PolF.eval(polA[s], PolF.roots[setup.vk_proof.domainBits][c]), witness[s]));
                B = PolF.F.add(B, PolF.F.mul(PolF.eval(polB[s], PolF.roots[setup.vk_proof.domainBits][c]), witness[s]));
                C = PolF.F.add(C, PolF.F.mul(PolF.eval(polC[s], PolF.roots[setup.vk_proof.domainBits][c]), witness[s]));
            }
            assert(PolF.F.equals(PolF.F.mul(A,B), C));
        }

        let A = bigInt(0);
        let B = bigInt(0);
        let C = bigInt(0);
        for (let s=0; s<cir.nVars; s++) {
            A = PolF.F.add(A, PolF.F.mul(PolF.eval(polA[s], setup.toxic.t), witness[s]));
            B = PolF.F.add(B, PolF.F.mul(PolF.eval(polB[s], setup.toxic.t), witness[s]));
            C = PolF.F.add(C, PolF.F.mul(PolF.eval(polC[s], setup.toxic.t), witness[s]));
        }

        let A2 = bigInt(0);
        let B2 = bigInt(0);
        let C2 = bigInt(0);
        const u = PolF.evaluateLagrangePolynomials(setup.vk_proof.domainBits, setup.toxic.t);
        for (let s=0; s<cir.nVars; s++) {
            let at = PolF.F.zero;
            for (let c in setup.vk_proof.polsA[s]) {
                at = PolF.F.add(at, PolF.F.mul(u[c], setup.vk_proof.polsA[s][c]));
            }
            A2 = PolF.F.add(A2, PolF.F.mul(at, witness[s]));

            let bt = PolF.F.zero;
            for (let c in setup.vk_proof.polsB[s]) {
                bt = PolF.F.add(bt, PolF.F.mul(u[c], setup.vk_proof.polsB[s][c]));
            }
            B2 = PolF.F.add(B2, PolF.F.mul(bt, witness[s]));

            let ct = PolF.F.zero;
            for (let c in setup.vk_proof.polsC[s]) {
                ct = PolF.F.add(ct, PolF.F.mul(u[c], setup.vk_proof.polsC[s][c]));
            }
            C2 = PolF.F.add(C2, PolF.F.mul(ct, witness[s]));
        }

        A=PolF.F.affine(A);
        B=PolF.F.affine(B);
        C=PolF.F.affine(C);
        A2=PolF.F.affine(A2);
        B2=PolF.F.affine(B2);
        C2=PolF.F.affine(C2);

        assert(PolF.F.equals(C,C2));
        assert(PolF.F.equals(B,B2));
        assert(PolF.F.equals(A,A2));
        const ABC = PolF.F.affine(PolF.F.sub(PolF.F.mul(A,B), C));



        assert.equal(witness[cir.getSignalIdx("main.out")].toString(), "67");

        const H = PolF.eval(proof.h, setup.toxic.t).affine();

        const Z = PolF.F.sub(PolF.F.exp(setup.toxic.t, setup.vk_proof.domainSize), bigInt(1));

        const HZ = PolF.F.affine(PolF.F.mul(H,Z));
        assert(PolF.F.equals(ABC, HZ));


        const gH = G1.affine(G1.mulScalar( G1.g, H));
        const gZ = G2.affine(G2.mulScalar( G2.g, Z));
        const gA = G1.affine(G1.mulScalar( G1.g, A));
        const gB = G2.affine(G2.mulScalar( G2.g, B));
        const gC = G1.affine(G1.mulScalar( G1.g, C));

        assert(G1.equals(gH, proof.pi_h));
        assert(G2.equals(gZ, setup.vk_verifier.vk_z));
        assert(G2.equals(gB, proof.pi_b));
        assert(G1.equals(gC, proof.pi_c));
//        assert(G1.equals(gA, proof.pi_a));
*/
        assert( zkSnark.isValid(setup.vk_verifier, proof, publicSignals));
    }).timeout(10000000);
/*
    it("validate sha256_2", () => {

        const cirDef = JSON.parse(fs.readFileSync(path.join(__dirname, "circuit", "sha256_2.json"), "utf8"));
        const cir = new Circuit(cirDef);

        console.log("Start setup: "+Date().toString());
        const setup = zkSnark.setup(cir);
        const strSetup = stringifyBigInts(setup);
        fs.writeFileSync("sha256_2_vk_proof.json", JSON.stringify(strSetup.vk_proof), "utf-8");
        fs.writeFileSync("sha256_2_vk_verifier.json", JSON.stringify(strSetup.vk_verifier), "utf-8");


//        const setup = {};
//        setup.vk_proof = unstringifyBigInts(JSON.parse(fs.readFileSync("vk_proof.json", "utf8")));
//        setup.vk_verifier = unstringifyBigInts(JSON.parse(fs.readFileSync("vk_verifier.json", "utf8")));

        const witness = cir.calculateWitness({"a": "1", "b": "2"});

//        assert.equal(witness[cir.getSignalIdx("main.out")].toString(), "67");

        console.log("Start calculating the proof: "+Date().toString());
        const {proof, publicSignals} = zkSnark.genProof(setup.vk_proof, witness);

        console.log("Start verifiying: "+ Date().toString());
        assert( zkSnark.isValid(setup.vk_verifier, proof, publicSignals));
    }).timeout(10000000);
*/

});
