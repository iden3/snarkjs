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

/* Implementation of this paper: https://eprint.iacr.org/2016/260.pdf */

const bigInt = require("./bigint.js");

const BN128 = require("./bn128.js");
const PolField = require("./polfield.js");
const ZqField = require("./zqfield.js");

const bn128 = new BN128();
const G1 = bn128.G1;
const G2 = bn128.G2;
const PolF = new PolField(new ZqField(bn128.r));
const F = new ZqField(bn128.r);

module.exports = function setup(circuit) {
    const setup = {
        vk_proof : {
            protocol: "groth",
            nVars: circuit.nVars,
            nPublic: circuit.nPubInputs + circuit.nOutputs
        },
        vk_verifier: {
            protocol: "groth",
            nPublic: circuit.nPubInputs + circuit.nOutputs
        },
        toxic: {}
    };


    setup.vk_proof.domainBits = PolF.log2(circuit.nConstraints + circuit.nPubInputs + circuit.nOutputs +1 -1) +1;
    setup.vk_proof.domainSize = 1 << setup.vk_proof.domainBits;

    calculatePolinomials(setup, circuit);
    setup.toxic.t = F.random();
    calculateEncriptedValuesAtT(setup, circuit);

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
    setup.vk_proof.Adelta = new Array(circuit.nVars);
    setup.vk_proof.B1 = new Array(circuit.nVars);
    setup.vk_proof.B2 = new Array(circuit.nVars);
    setup.vk_proof.C = new Array(circuit.nVars);
    setup.vk_verifier.IC = new Array(circuit.nPublic);

    setup.toxic.kalfa = F.random();
    setup.toxic.kbeta = F.random();
    setup.toxic.kgamma = F.random();
    setup.toxic.kdelta = F.random();

    const gammaSquare = F.mul(setup.toxic.kgamma, setup.toxic.kgamma);

    setup.vk_proof.vk_alfa_1 = G1.affine(G1.mulScalar( G1.g, setup.toxic.kalfa));
    setup.vk_proof.vk_beta_1 = G1.affine(G1.mulScalar( G1.g, setup.toxic.kbeta));
    setup.vk_proof.vk_delta_1 = G1.affine(G1.mulScalar( G1.g, setup.toxic.kdelta));
    setup.vk_proof.vk_alfadelta_1 = G1.affine(G1.mulScalar( G1.g, F.mul(setup.toxic.kalfa, setup.toxic.kdelta)));

    setup.vk_proof.vk_beta_2 = G2.affine(G2.mulScalar( G2.g, setup.toxic.kbeta));


    setup.vk_verifier.vk_alfa_1 = G1.affine(G1.mulScalar( G1.g, setup.toxic.kalfa));

    setup.vk_verifier.vk_beta_2 = G2.affine(G2.mulScalar( G2.g, setup.toxic.kbeta));
    setup.vk_verifier.vk_gamma_2 = G2.affine(G2.mulScalar( G2.g, setup.toxic.kgamma));
    setup.vk_verifier.vk_delta_2 = G2.affine(G2.mulScalar( G2.g, setup.toxic.kdelta));

    setup.vk_verifier.vk_alfabeta_12 = bn128.F12.affine(bn128.pairing( setup.vk_verifier.vk_alfa_1 , setup.vk_verifier.vk_beta_2 ));

    for (let s=0; s<circuit.nVars; s++) {

        const A = G1.affine(G1.mulScalar(G1.g, F.mul(setup.toxic.kgamma, v.a_t[s])));

        setup.vk_proof.A[s] = A;
        setup.vk_proof.Adelta[s] = G1.affine(G1.mulScalar(A, setup.toxic.kdelta));

        const B1 = G1.affine(G1.mulScalar(G1.g, F.mul(setup.toxic.kgamma, v.b_t[s])));

        setup.vk_proof.B1[s] = B1;

        const B2 = G2.affine(G2.mulScalar(G2.g, F.mul(setup.toxic.kgamma, v.b_t[s])));

        setup.vk_proof.B2[s] = B2;
    }

    for (let s=0; s<=setup.vk_proof.nPublic; s++) {

        let ps =
            F.add(
                F.mul(
                    setup.toxic.kgamma,
                    v.c_t[s]
                ),
                F.add(
                    F.mul(
                        setup.toxic.kbeta,
                        v.a_t[s]
                    ),
                    F.mul(
                        setup.toxic.kalfa,
                        v.b_t[s]
                    )
                )
            );

        const IC = G1.affine(G1.mulScalar(G1.g, ps));
        setup.vk_verifier.IC[s]=IC;
    }

    for (let s=setup.vk_proof.nPublic+1; s<circuit.nVars; s++) {
        let ps =
            F.add(
                F.mul(
                    gammaSquare,
                    v.c_t[s]
                ),
                F.add(
                    F.mul(
                        F.mul(setup.toxic.kbeta, setup.toxic.kgamma),
                        v.a_t[s]
                    ),
                    F.mul(
                        F.mul(setup.toxic.kalfa, setup.toxic.kgamma),
                        v.b_t[s]
                    )
                )
            );

        const C = G1.affine(G1.mulScalar(G1.g, ps));
        setup.vk_proof.C[s]=C;
    }

    // Calculate HExps

    const maxH = setup.vk_proof.domainSize+1;

    setup.vk_proof.hExps = new Array(maxH);

    const zod = F.mul(gammaSquare, v.z_t);

    setup.vk_proof.hExps[0] = G1.affine(G1.mulScalar(G1.g, zod));
    let eT = setup.toxic.t;
    for (let i=1; i<maxH; i++) {
        setup.vk_proof.hExps[i] = G1.affine(G1.mulScalar(G1.g, F.mul(eT, zod)));
        eT = F.mul(eT, setup.toxic.t);
    }
}

