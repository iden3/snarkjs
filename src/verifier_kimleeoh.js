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
const createKeccakHash = require("keccak");
const utils = require("ffjavascript").utils;

const G1 = bn128.G1;
const G2 = bn128.G2;

module.exports = function isValid(vk_verifier, proof, publicSignals) {

    let cpub = vk_verifier.IC[0];
    for (let s= 0; s< vk_verifier.nPublic; s++) {
        cpub  = G1.add( cpub, G1.mulScalar( vk_verifier.IC[s+1], publicSignals[s]));
    }

    const buff = Buffer.concat([
        utils.beInt2Buff(proof.pi_a[0], 32),
        utils.beInt2Buff(proof.pi_a[1], 32),
        utils.beInt2Buff(proof.pi_b[0][0], 32),
        utils.beInt2Buff(proof.pi_b[0][1], 32),
        utils.beInt2Buff(proof.pi_b[1][0], 32),
        utils.beInt2Buff(proof.pi_b[1][1], 32),
    ]);

    const h1buff = createKeccakHash("keccak256").update(buff).digest();
    const h2buff = createKeccakHash("keccak256").update(h1buff).digest();

    const h1 = utils.beBuff2int(h1buff);
    const h2 = utils.beBuff2int(h2buff);


    // const h1 = bn128.Fr.zero;
    // const h2 = bn128.Fr.zero;

    // console.log(h1.toString());
    // console.log(h2.toString());


    if (! bn128.F12.eq(
        bn128.pairing(
            G1.add(proof.pi_a, G1.mulScalar(G1.g, h1)),
            G2.add(proof.pi_b, G2.mulScalar(vk_verifier.vk_delta_2, h2))
        ),
        bn128.F12.mul(
            vk_verifier.vk_alfabeta_12,
            bn128.F12.mul(
                bn128.pairing( cpub , vk_verifier.vk_gamma_2 ),
                bn128.pairing( proof.pi_c , G2.g )
            ))))
        return false;

    return true;
};
