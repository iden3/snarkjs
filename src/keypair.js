/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

    snarkJS is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    snarkJS is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with snarkJS. If not, see <https://www.gnu.org/licenses/>.
*/

import blake2b from "blake2b-wasm";

import { ChaCha } from "ffjavascript";

export function hashToG2(curve, hash) {
    const hashV = new DataView(hash.buffer, hash.byteOffset, hash.byteLength);
    const seed = [];
    for (let i=0; i<8; i++) {
        seed[i] = hashV.getUint32(i*4);
    }

    const rng = new ChaCha(seed);

    const g2_sp = curve.G2.fromRng(rng);

    return g2_sp;
}

export function getG2sp(curve, persinalization, challenge, g1s, g1sx) {

    const h = blake2b(64);
    const b1 = new Uint8Array([persinalization]);
    h.update(b1);
    h.update(challenge);
    const b3 = curve.G1.toUncompressed(g1s);
    h.update( b3);
    const b4 = curve.G1.toUncompressed(g1sx);
    h.update( b4);
    const hash =h.digest();

    return hashToG2(curve, hash);
}

function calculatePubKey(k, curve, personalization, challengeHash, rng ) {
    k.g1_s = curve.G1.toAffine(curve.G1.fromRng(rng));
    k.g1_sx = curve.G1.toAffine(curve.G1.timesFr(k.g1_s, k.prvKey));
    k.g2_sp = curve.G2.toAffine(getG2sp(curve, personalization, challengeHash, k.g1_s, k.g1_sx));
    k.g2_spx = curve.G2.toAffine(curve.G2.timesFr(k.g2_sp, k.prvKey));
    return k;
}

export function createPTauKey(curve, challengeHash, rng) {
    const key = {
        tau: {},
        alpha: {},
        beta: {}
    };
    key.tau.prvKey = curve.Fr.fromRng(rng);
    key.alpha.prvKey = curve.Fr.fromRng(rng);
    key.beta.prvKey = curve.Fr.fromRng(rng);
    calculatePubKey(key.tau, curve, 0, challengeHash, rng);
    calculatePubKey(key.alpha, curve, 1, challengeHash, rng);
    calculatePubKey(key.beta, curve, 2, challengeHash, rng);
    return key;
}

export function createDeltaKey(curve, transcript, rng) {
    const delta = {};
    delta.prvKey = curve.Fr.fromRng(rng);
    delta.g1_s = curve.G1.toAffine(curve.G1.fromRng(rng));
    delta.g1_sx = curve.G1.toAffine(curve.G1.timesScalar(delta.g1_s, delta.prvKey));
    delta.g2_sp = hashToG2(curve, transcript);
    delta.g2_spx = curve.G2.toAffine(curve.G2.timesScalar(delta.g2_sp, delta.prvKey));
    return delta;
}
