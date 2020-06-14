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

const bn128 = require("ffjavascript").bn128;
const PolField = require("ffjavascript").PolField;
const ZqField = require("ffjavascript").ZqField;

const G1 = bn128.G1;
const G2 = bn128.G2;
const PolF = new PolField(new ZqField(bn128.r));
const F = new ZqField(bn128.r);

module.exports = function setup(circuit, verbose) {
    const setup = {
        vk_proof : {
            protocol: "groth16",
            nVars: circuit.nVars,
            nPublic: circuit.nPubInputs + circuit.nOutputs
        },
        toxic: {}
    };

    setup.vk_proof.q = bn128.q;
    setup.vk_proof.r = bn128.r;
    setup.vk_proof.domainBits = PolF.log2(circuit.nConstraints + circuit.nPubInputs + circuit.nOutputs +1 -1) +1;
    setup.vk_proof.domainSize = 1 << setup.vk_proof.domainBits;

    calculatePolinomials(setup, circuit);
    setup.toxic.t = F.random();
    calculateEncriptedValuesAtT(setup, circuit, verbose);

    setup.vk_verifier = {
        protocol: setup.vk_proof.protocol,
        nPublic: setup.vk_proof.nPublic,
        IC: setup.vk_proof.IC,


        vk_alpha_1: setup.vk_proof.vk_alpha_1,

        vk_beta_2: setup.vk_proof.vk_beta_2,
        vk_gamma_2:  setup.vk_proof.vk_gamma_2,
        vk_delta_2:  setup.vk_proof.vk_delta_2,

        vk_alphabeta_12: bn128.pairing( setup.vk_proof.vk_alpha_1 , setup.vk_proof.vk_beta_2 )
    };

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

    setup.vk_proof.ccoefs = [];
    for (let m=0; m<2; m++) {
        for (let c=0; c<circuit.nConstraints; c++) {
            for (let s in circuit.constraints[c][m]) {
                setup.vk_proof.ccoefs.push({
                    matrix: m,
                    constraint: c,
                    signal: s,
                    value: circuit.constraints[c][m][s]
                });
            }
        }
    }

    for (let c=0; c<circuit.nConstraints; c++) {
        for (let s in circuit.constraints[c][0]) {
            setup.vk_proof.polsA[s][c] = circuit.constraints[c][0][s];
        }
        for (let s in circuit.constraints[c][1]) {
            setup.vk_proof.polsB[s][c] = circuit.constraints[c][1][s];
        }
        for (let s in circuit.constraints[c][2]) {
            setup.vk_proof.polsC[s][c] = circuit.constraints[c][2][s];
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
        setup.vk_proof.ccoefs.push({
            matrix: 0,
            constraint: circuit.nConstraints + i,
            signal: i,
            value: F.one
        });
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




function calculateEncriptedValuesAtT(setup, circuit, verbose) {

    const v = calculateValuesAtT(setup, circuit);
    setup.vk_proof.A = new Array(circuit.nVars);
    setup.vk_proof.B1 = new Array(circuit.nVars);
    setup.vk_proof.B2 = new Array(circuit.nVars);
    setup.vk_proof.C = new Array(circuit.nVars);
    setup.vk_proof.IC = new Array(circuit.nPubInputs + circuit.nOutputs + 1);

    setup.toxic.kalpha = F.random();
    setup.toxic.kbeta = F.random();
    setup.toxic.kgamma = F.random();
    setup.toxic.kdelta = F.random();

    let invDelta = F.inv(setup.toxic.kdelta);
    let invGamma = F.inv(setup.toxic.kgamma);

    setup.vk_proof.vk_alpha_1 = G1.affine(G1.mulScalar( G1.g, setup.toxic.kalpha));
    setup.vk_proof.vk_beta_1 = G1.affine(G1.mulScalar( G1.g, setup.toxic.kbeta));
    setup.vk_proof.vk_delta_1 = G1.affine(G1.mulScalar( G1.g, setup.toxic.kdelta));

    setup.vk_proof.vk_beta_2 = G2.affine(G2.mulScalar( G2.g, setup.toxic.kbeta));
    setup.vk_proof.vk_delta_2 = G2.affine(G2.mulScalar( G2.g, setup.toxic.kdelta));
    setup.vk_proof.vk_gamma_2 = G2.affine(G2.mulScalar( G2.g, setup.toxic.kgamma));


    for (let s=0; s<circuit.nVars; s++) {

        const A = G1.mulScalar(G1.g, v.a_t[s]);

        setup.vk_proof.A[s] = A;

        const B1 = G1.mulScalar(G1.g, v.b_t[s]);

        setup.vk_proof.B1[s] = B1;

        const B2 = G2.mulScalar(G2.g, v.b_t[s]);

        setup.vk_proof.B2[s] = B2;

        if ((verbose)&&(s%1000 == 1)) console.log("A, B1, B2: ", s);
    }


    for (let s=0; s<=setup.vk_proof.nPublic; s++) {
        let ps =
            F.mul(
                invGamma,
                F.add(
                    F.add(
                        F.mul(v.a_t[s], setup.toxic.kbeta),
                        F.mul(v.b_t[s], setup.toxic.kalpha)),
                    v.c_t[s]));

        const IC = G1.mulScalar(G1.g, ps);
        setup.vk_proof.IC[s]=IC;
    }

    for (let s=setup.vk_proof.nPublic+1; s<circuit.nVars; s++) {
        let ps =
            F.mul(
                invDelta,
                F.add(
                    F.add(
                        F.mul(v.a_t[s], setup.toxic.kbeta),
                        F.mul(v.b_t[s], setup.toxic.kalpha)),
                    v.c_t[s]));
        const C = G1.mulScalar(G1.g, ps);
        setup.vk_proof.C[s]=C;

        if ((verbose)&&(s%1000 == 1)) console.log("C: ", s);

    }

    // Calculate HExps

    const maxH = setup.vk_proof.domainSize+1;

    setup.vk_proof.hExps = new Array(maxH);

    const zod = F.mul(invDelta, v.z_t);

    setup.vk_proof.hExps[0] = G1.affine(G1.mulScalar(G1.g, zod));
    let eT = setup.toxic.t;
    for (let i=1; i<maxH; i++) {
        setup.vk_proof.hExps[i] = G1.mulScalar(G1.g, F.mul(eT, zod));
        eT = F.mul(eT, setup.toxic.t);

        if ((verbose)&&(i%1000 == 1)) console.log("Tau: ", i);

    }

    G1.multiAffine(setup.vk_proof.A);
    G1.multiAffine(setup.vk_proof.B1);
    G2.multiAffine(setup.vk_proof.B2);
    G1.multiAffine(setup.vk_proof.C);
    G1.multiAffine(setup.vk_proof.hExps);
    G1.multiAffine(setup.vk_proof.IC);

}

