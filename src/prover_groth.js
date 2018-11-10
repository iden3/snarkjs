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

const BN128 = require("./bn128.js");
const PolField = require("./polfield.js");
const ZqField = require("./zqfield.js");

const bn128 = new BN128();
const PolF = new PolField(new ZqField(bn128.r));
const G1 = bn128.G1;
const G2 = bn128.G2;

module.exports = function genProof(vk_proof, witness) {

    const proof = {};

    const r = PolF.F.random();
    const s = PolF.F.random();

    proof.pi_a = G1.zero;
    proof.pi_b = G2.zero;
    proof.pi_c = G1.zero;

    let pib1 = G1.zero;


    // Skip public entries and the "1" signal that are forced by the verifier

    for (let s= 0; s< vk_proof.nVars; s++) {
        // pi_a = pi_a + A[s] * witness[s];
        proof.pi_a = G1.add( proof.pi_a, G1.mulScalar( vk_proof.A[s], witness[s]));

        // pi_b = pi_b + B[s] * witness[s];
        proof.pi_b = G2.add( proof.pi_b, G2.mulScalar( vk_proof.B2[s], witness[s]));

        pib1 = G1.add( pib1, G1.mulScalar( vk_proof.B1[s], witness[s]));
    }

    for (let s= vk_proof.nPublic+1; s< vk_proof.nVars; s++) {

        // pi_a  = pi_a  + A[s]  * witness[s];
        proof.pi_c  = G1.add( proof.pi_c, G1.mulScalar( vk_proof.C[s], witness[s]));
    }

    proof.pi_a  = G1.add( proof.pi_a, vk_proof.vk_alfa_1 );
    proof.pi_a  = G1.add( proof.pi_a, G1.mulScalar( vk_proof.vk_delta_1, r ));

    proof.pi_b  = G2.add( proof.pi_b, vk_proof.vk_beta_2 );
    proof.pi_b  = G2.add( proof.pi_b, G2.mulScalar( vk_proof.vk_delta_2, s ));

    pib1 = G1.add( pib1, vk_proof.vk_beta_1 );
    pib1 = G1.add( pib1, G1.mulScalar( vk_proof.vk_delta_1, s ));

    const h = calculateH(vk_proof, witness, PolF.F.zero, PolF.F.zero, PolF.F.zero);

//    console.log(h.length + "/" + vk_proof.hExps.length);

    for (let i = 0; i < h.length; i++) {
        proof.pi_c = G1.add( proof.pi_c, G1.mulScalar( vk_proof.hExps[i], h[i]));
    }


    proof.pi_c  = G1.add( proof.pi_c, G1.mulScalar( proof.pi_a, s ));
    proof.pi_c  = G1.add( proof.pi_c, G1.mulScalar( pib1, r ));
    proof.pi_c  = G1.add( proof.pi_c, G1.mulScalar( vk_proof.vk_delta_1, PolF.F.affine(PolF.F.neg(PolF.F.mul(r,s) ))));


    const publicSignals = witness.slice(1, vk_proof.nPublic+1);

    proof.pi_a = G1.affine(proof.pi_a);
    proof.pi_b = G2.affine(proof.pi_b);
    proof.pi_c = G1.affine(proof.pi_c);

    proof.protocol = "groth";

    return {proof, publicSignals};
};


function calculateH(vk_proof, witness, d1, d2, d3) {

    const F = PolF.F;
    const m = vk_proof.domainSize;
    const polA_T = new Array(m).fill(PolF.F.zero);
    const polB_T = new Array(m).fill(PolF.F.zero);
    const polC_T = new Array(m).fill(PolF.F.zero);

    for (let s=0; s<vk_proof.nVars; s++) {
        for (let c in vk_proof.polsA[s]) {
            polA_T[c] = F.add(polA_T[c], F.mul(witness[s], vk_proof.polsA[s][c]));
        }
        for (let c in vk_proof.polsB[s]) {
            polB_T[c] = F.add(polB_T[c], F.mul(witness[s], vk_proof.polsB[s][c]));
        }
        for (let c in vk_proof.polsC[s]) {
            polC_T[c] = F.add(polC_T[c], F.mul(witness[s], vk_proof.polsC[s][c]));
        }
    }

    const polA_S = PolF.ifft(polA_T);
    const polB_S = PolF.ifft(polB_T);

    const polAB_S = PolF.mul(polA_S, polB_S);

    const polC_S = PolF.ifft(polC_T);

    const polABC_S = PolF.sub(polAB_S, polC_S);

    const polZ_S = new Array(m+1).fill(F.zero);
    polZ_S[m] = F.one;
    polZ_S[0] = F.neg(F.one);

    let H_S = PolF.div(polABC_S, polZ_S);
/*
    const H2S = PolF.mul(H_S, polZ_S);

    if (PolF.equals(H2S, polABC_S)) {
        console.log("Is Divisible!");
    } else {
        console.log("ERROR: Not divisible!");
    }
*/

    /* add coefficients of the polynomial (d2*A + d1*B - d3) + d1*d2*Z */

    H_S = PolF.extend(H_S, m+1);

    for (let i=0; i<m; i++) {
        const d2A = PolF.F.mul(d2, polA_S[i]);
        const d1B = PolF.F.mul(d1, polB_S[i]);
        H_S[i] = PolF.F.add(H_S[i], PolF.F.add(d2A, d1B));
    }

    H_S[0] = PolF.F.sub(H_S[0], d3);

    // Z = x^m -1
    const d1d2 = PolF.F.mul(d1, d2);
    H_S[m] = PolF.F.add(H_S[m], d1d2);
    H_S[0] = PolF.F.sub(H_S[0], d1d2);

    H_S = PolF.reduce(PolF.affine(H_S));

    return H_S;
}
