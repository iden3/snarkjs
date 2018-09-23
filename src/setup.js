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

const bigInt = require("./bigint.js");

const BN128 = require("./bn128.js");
const PolField = require("./polfield.js");
const ZqField = require("./zqfield.js");
const RatField = require("./ratfield.js");

const bn128 = new BN128();
const G1 = bn128.G1;
const G2 = bn128.G2;
const PolF = new PolField(new ZqField(bn128.r));
const RatPolF = new PolField(new RatField(new ZqField(bn128.r)));
const F = new ZqField(bn128.r);

module.exports = function setup(circuit) {
    const setup = {
        vk_proof : {
            nVars: circuit.nVars,
            nPublic: circuit.nPubInputs + circuit.nOutputs
        },
        vk_verifier: {
            nPublic: circuit.nPubInputs + circuit.nOutputs
        },
        toxic: {}
    };


    setup.vk_proof.domainBits = PolF.log2(circuit.nConstraints + circuit.nPubInputs + circuit.nOutputs +1 -1) +1;
    setup.vk_proof.domainSize = 1 << setup.vk_proof.domainBits;

    calculatePolinomials(setup, circuit);
    setup.toxic.t = F.random();
    calculateEncriptedValuesAtT(setup, circuit);
    calculateHexps(setup, circuit);

    return setup;
};


function calculatePolinomials(setup, circuit) {

    setup.vk_proof.polsA = new Array(circuit.nVars);
    setup.vk_proof.polsB = new Array(circuit.nVars);
    setup.vk_proof.polsC = new Array(circuit.nVars);
    for (let i=0; i<circuit.nVars; i++) {
        setup.vk_proof.polsA[i] = {};
        setup.vk_proof.polsB[i] = {};
        setup.vk_proof.polsC[i] = {};
    }
    for (let c=0; c<circuit.nConstraints; c++) {

        for (let s in circuit.constraints[c][0]) {
            setup.vk_proof.polsA[s][c] = bigInt(circuit.constraints[c][0][s]);
        }
        for (let s in circuit.constraints[c][1]) {
            setup.vk_proof.polsB[s][c] = bigInt(circuit.constraints[c][1][s]);
        }
        for (let s in circuit.constraints[c][2]) {
            setup.vk_proof.polsC[s][c] = bigInt(circuit.constraints[c][2][s]);
        }
    }

    /**
     * add and process the constraints
     *     input_i * 0 = 0
     * to ensure soundness of input consistency
     */
    for (let i = 0; i < circuit.nPubInputs + circuit.nOutputs + 1; ++i)
    {
        setup.vk_proof.polsA[i][circuit.nConstraints + i] = F.one;
    }
}

function calculateValuesAtT(setup, circuit) {
    const z_t = PolF.computeVanishingPolinomial(setup.vk_proof.domainBits, setup.toxic.t);
    const u = PolF.evaluateLagrangePolynomials(setup.vk_proof.domainBits, setup.toxic.t);

    const a_t = new Array(circuit.nVars).fill(F.zero);
    const b_t = new Array(circuit.nVars).fill(F.zero);
    const c_t = new Array(circuit.nVars).fill(F.zero);

    // TODO: substitute setup.polsA for coeficients
    for (let s=0; s<circuit.nVars; s++) {
        for (let c in setup.vk_proof.polsA[s]) {
            a_t[s] = F.add(a_t[s], F.mul(u[c], setup.vk_proof.polsA[s][c]));
        }
        for (let c in setup.vk_proof.polsB[s]) {
            b_t[s] = F.add(b_t[s], F.mul(u[c], setup.vk_proof.polsB[s][c]));
        }
        for (let c in setup.vk_proof.polsC[s]) {
            c_t[s] = F.add(c_t[s], F.mul(u[c], setup.vk_proof.polsC[s][c]));
        }
    }

    return {a_t, b_t, c_t, z_t};

}




function calculateEncriptedValuesAtT(setup, circuit) {

    const v = calculateValuesAtT(setup, circuit);
    setup.vk_proof.A = new Array(circuit.nVars);
    setup.vk_proof.B = new Array(circuit.nVars);
    setup.vk_proof.C = new Array(circuit.nVars);
    setup.vk_proof.Ap = new Array(circuit.nVars);
    setup.vk_proof.Bp = new Array(circuit.nVars);
    setup.vk_proof.Cp = new Array(circuit.nVars);
    setup.vk_proof.Kp = new Array(circuit.nVars);
    setup.vk_verifier.A = new Array(circuit.nVars);

    setup.toxic.ka = F.random();
    setup.toxic.kb = F.random();
    setup.toxic.kc = F.random();
    setup.toxic.kbeta = F.random();
    setup.toxic.kgamma = F.random();

    const gb = F.mul(setup.toxic.kbeta, setup.toxic.kgamma);

    setup.vk_verifier.vk_a = G2.affine(G2.mulScalar( G2.g, setup.toxic.ka));
    setup.vk_verifier.vk_b = G1.affine(G1.mulScalar( G1.g, setup.toxic.kb));
    setup.vk_verifier.vk_c = G2.affine(G2.mulScalar( G2.g, setup.toxic.kc));
    setup.vk_verifier.vk_gb_1 = G1.affine(G1.mulScalar( G1.g, gb));
    setup.vk_verifier.vk_gb_2 = G2.affine(G2.mulScalar( G2.g, gb));
    setup.vk_verifier.vk_g = G2.affine(G2.mulScalar( G2.g, setup.toxic.kgamma));

    for (let s=0; s<circuit.nVars; s++) {

        // A[i] = G1 * polA(t)
        const A = G1.affine(G1.mulScalar(G1.g, v.a_t[s]));

        setup.vk_proof.A[s] = A;

        if (s <= setup.vk_proof.nPublic) {
            setup.vk_verifier.A[s]=A;
        }


        // B1[i] = G1 * polB(t)
        const B1 = G1.affine(G1.mulScalar(G1.g, v.b_t[s]));

        // B2[i] = G2 * polB(t)
        const B2 = G2.affine(G2.mulScalar(G2.g, v.b_t[s]));

        setup.vk_proof.B[s]=B2;

        // C[i] = G1 * polC(t)
        const C = G1.affine(G1.mulScalar( G1.g, v.c_t[s]));
        setup.vk_proof.C[s] =C;

        // K = G1 * (A+B+C)

        const kt = F.affine(F.add(F.add(v.a_t[s], v.b_t[s]), v.c_t[s]));
        const K = G1.affine(G1.mulScalar( G1.g, kt));


// Comment this lines to improve the process
        const Ktest = G1.affine(G1.add(G1.add(A, B1), C));

        if (!G1.equals(K, Ktest)) {
            console.log ("=====FAIL======");
        }



        setup.vk_proof.Ap[s] = G1.affine(G1.mulScalar(A, setup.toxic.ka));
        setup.vk_proof.Bp[s] = G1.affine(G1.mulScalar(B1, setup.toxic.kb));
        setup.vk_proof.Cp[s] = G1.affine(G1.mulScalar(C, setup.toxic.kc));
        setup.vk_proof.Kp[s] = G1.affine(G1.mulScalar(K, setup.toxic.kbeta));
    }

    setup.vk_verifier.vk_z = G2.affine(G2.mulScalar(
        G2.g,
        v.z_t));
}

function calculateHexps(setup, circuit) {

    const maxH = setup.vk_proof.domainSize;

    setup.vk_proof.hExps = new Array(maxH);
    setup.vk_proof.hExps[0] = G1.g;
    let eT = setup.toxic.t;
    for (let i=1; i<maxH; i++) {
        setup.vk_proof.hExps[i] = G1.affine(G1.mulScalar(G1.g, eT));
        eT = F.mul(eT, setup.toxic.t);
    }
}

