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

const bn128 = require("ffjavascript").bn128;

const G1 = bn128.G1;
const G2 = bn128.G2;

module.exports = function isValid(vk_verifier, proof, publicSignals) {

    let full_pi_a = vk_verifier.IC[0];
    for (let s= 0; s< vk_verifier.nPublic; s++) {
        full_pi_a  = G1.add( full_pi_a, G1.mulScalar( vk_verifier.IC[s+1], publicSignals[s]));
    }

    full_pi_a  = G1.add( full_pi_a, proof.pi_a);

    if (! bn128.F12.eq(
        bn128.pairing( proof.pi_a , vk_verifier.vk_a ),
        bn128.pairing( proof.pi_ap , G2.g )))
        return false;

    if (! bn128.F12.eq(
        bn128.pairing( vk_verifier.vk_b,  proof.pi_b ),
        bn128.pairing( proof.pi_bp , G2.g )))
        return false;

    if (! bn128.F12.eq(
        bn128.pairing( proof.pi_c , vk_verifier.vk_c ),
        bn128.pairing( proof.pi_cp , G2.g )))
        return false;

    if (! bn128.F12.eq(
        bn128.F12.mul(
            bn128.pairing( G1.add(full_pi_a, proof.pi_c) , vk_verifier.vk_gb_2 ),
            bn128.pairing( vk_verifier.vk_gb_1 , proof.pi_b )
        ),
        bn128.pairing( proof.pi_kp , vk_verifier.vk_g )))
        return false;

    if (! bn128.F12.eq(
        bn128.pairing( full_pi_a , proof.pi_b  ),
        bn128.F12.mul(
            bn128.pairing( proof.pi_h , vk_verifier.vk_z ),
            bn128.pairing( proof.pi_c , G2.g  )
        )))
        return false;

    return true;
};
