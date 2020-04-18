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

const PolF = new PolField(new ZqField(bn128.r));
const G1 = bn128.G1;
const G2 = bn128.G2;

module.exports = function genProof(vk_proof, witness, verbose) {

    const proof = {};

    const r = PolF.F.random();
    const s = PolF.F.random();

/* Uncomment to generate a deterministic proof to debug
    const r = PolF.F.zero;
    const s = PolF.F.zero;
*/


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

        if ((verbose)&&(s%1000 == 1)) console.log("A, B1, B2: ", s);

    }

    for (let s= vk_proof.nPublic+1; s< vk_proof.nVars; s++) {

        // pi_a  = pi_a  + A[s]  * witness[s];
        proof.pi_c  = G1.add( proof.pi_c, G1.mulScalar( vk_proof.C[s], witness[s]));

        if ((verbose)&&(s%1000 == 1)) console.log("C: ", s);
    }

    proof.pi_a  = G1.add( proof.pi_a, vk_proof.vk_alfa_1 );
    proof.pi_a  = G1.add( proof.pi_a, G1.mulScalar( vk_proof.vk_delta_1, r ));

    proof.pi_b  = G2.add( proof.pi_b, vk_proof.vk_beta_2 );
    proof.pi_b  = G2.add( proof.pi_b, G2.mulScalar( vk_proof.vk_delta_2, s ));

    pib1 = G1.add( pib1, vk_proof.vk_beta_1 );
    pib1 = G1.add( pib1, G1.mulScalar( vk_proof.vk_delta_1, s ));

    const h = calculateH(vk_proof, witness);

    // proof.pi_c = G1.affine(proof.pi_c);
    // console.log("pi_onlyc", proof.pi_c);

    for (let i = 0; i < h.length; i++) {
        // console.log(i + "->" + h[i].toString());
        proof.pi_c = G1.add( proof.pi_c, G1.mulScalar( vk_proof.hExps[i], h[i]));

        if ((verbose)&&(i%1000 == 1)) console.log("H: ", i);
    }

    // proof.pi_c = G1.affine(proof.pi_c);
    // console.log("pi_candh", proof.pi_c);

    proof.pi_c  = G1.add( proof.pi_c, G1.mulScalar( proof.pi_a, s ));
    proof.pi_c  = G1.add( proof.pi_c, G1.mulScalar( pib1, r ));
    proof.pi_c  = G1.add( proof.pi_c, G1.mulScalar( vk_proof.vk_delta_1, PolF.F.neg(PolF.F.mul(r,s) )));


    const publicSignals = witness.slice(1, vk_proof.nPublic+1);

    proof.pi_a = G1.affine(proof.pi_a);
    proof.pi_b = G2.affine(proof.pi_b);
    proof.pi_c = G1.affine(proof.pi_c);

    proof.protocol = "groth";

    return {proof, publicSignals};

};


/*
// Old Method.  (It's clear for academic understanding)
function calculateH(vk_proof, witness) {

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

    const H_S = polABC_S.slice(m);

    return H_S;
}
*/

function calculateH(vk_proof, witness) {

    const F = PolF.F;
    const m = vk_proof.domainSize;
    const polA_T = new Array(m).fill(PolF.F.zero);
    const polB_T = new Array(m).fill(PolF.F.zero);

    for (let s=0; s<vk_proof.nVars; s++) {
        for (let c in vk_proof.polsA[s]) {
            polA_T[c] = F.add(polA_T[c], F.mul(witness[s], vk_proof.polsA[s][c]));
        }
        for (let c in vk_proof.polsB[s]) {
            polB_T[c] = F.add(polB_T[c], F.mul(witness[s], vk_proof.polsB[s][c]));
        }
    }

    const polA_S = PolF.ifft(polA_T);
    const polB_S = PolF.ifft(polB_T);

    // F(wx) = [1, w, w^2, ...... w^(m-1)] in time is the same than shift in in frequency
    const r = PolF.log2(m)+1;
    PolF._setRoots(r);
    for (let i=0; i<polA_S.length; i++) {
        polA_S[i] = PolF.F.mul( polA_S[i], PolF.roots[r][i]);
        polB_S[i] = PolF.F.mul( polB_S[i], PolF.roots[r][i]);
    }

    const polA_Todd = PolF.fft(polA_S);
    const polB_Todd = PolF.fft(polB_S);

    const polAB_T = new Array(polA_S.length*2);
    for (let i=0; i<polA_S.length; i++) {
        polAB_T[2*i] = PolF.F.mul( polA_T[i], polB_T[i]);
        polAB_T[2*i+1] = PolF.F.mul( polA_Todd[i], polB_Todd[i]);
    }

    // We only need the to half of the fft, so we could optimize at least by m multiplications.
    let H_S = PolF.ifft(polAB_T);

    H_S = H_S.slice(m);

    return H_S;

}
