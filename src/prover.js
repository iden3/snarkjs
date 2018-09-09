/*
    Copyright 2018 0kims association

    This file is part of zksnark javascript library.

    zksnark javascript library is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    zksnark javascript library is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with zksnark javascript library.  If not, see <https://www.gnu.org/licenses/>.
*/

const BN128 = require("./bn128.js");
const PolField = require("./polfield.js");
const ZqField = require("./zqfield.js");

const bn128 = new BN128();
const PolF = new PolField(new ZqField(bn128.r));
const G1 = bn128.G1;
const G2 = bn128.G2;

module.exports = function genProof(vk_proof, witness) {

    const proof = {};

    proof.pi_a = G1.zero;
    proof.pi_ap = G1.zero;
    proof.pi_b = G2.zero;
    proof.pi_bp = G1.zero;
    proof.pi_c = G1.zero;
    proof.pi_cp = G1.zero;
    proof.pi_kp = G1.zero;
    proof.pi_h = G1.zero;


    // Skip public entries and the "1" signal that are forced by the verifier
    for (let s= vk_proof.nPublic+1; s< vk_proof.nVars; s++) {

        // pi_a  = pi_a  + A[s]  * witness[s];
        proof.pi_a  = G1.add( proof.pi_a, G1.mulScalar( vk_proof.A[s], witness[s]));

        // pi_ap = pi_ap + Ap[s] * witness[s];
        proof.pi_ap = G1.add( proof.pi_ap, G1.mulScalar( vk_proof.Ap[s], witness[s]));
    }

    for (let s= 0; s< vk_proof.nVars; s++) {
        // pi_a  = pi_a  + A[s]  * witness[s];
        proof.pi_b  = G2.add( proof.pi_b, G2.mulScalar( vk_proof.B[s], witness[s]));

        // pi_ap = pi_ap + Ap[s] * witness[s];
        proof.pi_bp = G1.add( proof.pi_bp, G1.mulScalar( vk_proof.Bp[s], witness[s]));

        // pi_a  = pi_a  + A[s]  * witness[s];
        proof.pi_c  = G1.add( proof.pi_c, G1.mulScalar( vk_proof.C[s], witness[s]));

        // pi_ap = pi_ap + Ap[s] * witness[s];
        proof.pi_cp = G1.add( proof.pi_cp, G1.mulScalar( vk_proof.Cp[s], witness[s]));

        // pi_ap = pi_ap + Ap[s] * witness[s];
        proof.pi_kp = G1.add( proof.pi_kp, G1.mulScalar( vk_proof.Kp[s], witness[s]));
    }

    let polA = [];
    let polB = [];
    let polC = [];

    for (let s= 0; s< vk_proof.nVars; s++) {
        polA = PolF.add(
            polA,
            PolF.mul(
                vk_proof.polsA[s],
                [witness[s]] ));

        polB = PolF.add(
            polB,
            PolF.mul(
                vk_proof.polsB[s],
                [witness[s]] ));

        polC = PolF.add(
            polC,
            PolF.mul(
                vk_proof.polsC[s],
                [witness[s]] ));
    }

    let polFull = PolF.sub(PolF.mul( polA, polB), polC);

    const h = PolF.div(polFull, vk_proof.polZ );

    console.log(h.length + "/" + vk_proof.hExps.length);

    for (let i = 0; i < h.length; i++) {
        proof.pi_h = G1.add( proof.pi_h, G1.mulScalar( vk_proof.hExps[i], h[i]));
    }

    proof.pi_a = G1.affine(proof.pi_a);
    proof.pi_b = G2.affine(proof.pi_b);
    proof.pi_c = G1.affine(proof.pi_c);
    proof.pi_ap = G1.affine(proof.pi_ap);
    proof.pi_bp = G1.affine(proof.pi_bp);
    proof.pi_cp = G1.affine(proof.pi_cp);
    proof.pi_kp = G1.affine(proof.pi_kp);
    proof.pi_h = G1.affine(proof.pi_h);

    const publicSignals = witness.slice(1, vk_proof.nPublic+1);

    return {proof, publicSignals};
};
