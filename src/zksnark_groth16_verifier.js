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

const G1 = bn128.G1;

module.exports = async function isValid(vk_verifier, proof, publicSignals) {
/*
    let cpub = vk_verifier.IC[0];
    for (let s= 0; s< vk_verifier.nPublic; s++) {
        cpub  = G1.add( cpub, G1.mulScalar( vk_verifier.IC[s+1], publicSignals[s]));
    }
*/

    let cpub = await G1.multiExp(vk_verifier.IC.slice(1), publicSignals);
    cpub = G1.add(cpub, vk_verifier.IC[0]);

    const res = await bn128.pairingEq(
        bn128.G1.neg(proof.pi_a) , proof.pi_b,
        cpub , vk_verifier.vk_gamma_2,
        proof.pi_c , vk_verifier.vk_delta_2,

        vk_verifier.vk_alpha_1, vk_verifier.vk_beta_2
    );

    if (! res) return false;
    return true;
};
