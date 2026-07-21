/*
    Copyright 2022 iden3 association.

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

// ZCash/IETF compressed point serialization, as used for BLS12-381 on
// Cardano/Plutus (CIP-0381). The flags live in the three high bits of the
// first byte:
//   bit 7 (0x80): compression flag — always set for a compressed encoding
//   bit 6 (0x40): infinity flag
//   bit 5 (0x20): sign flag — set when y is the lexicographically larger
//                 of the two roots
//
// ffjavascript's toRprCompressed writes its own flag convention into the same
// bits (bit 7 = sign, bit 6 = infinity), so the three high bits are cleared
// and rewritten with the ZCash flags. The x coordinate itself never occupies
// them: a BLS12-381 base-field element is 381 bits in a 384-bit encoding.

// Compress a G1 point to G1.F.n8 bytes (48 for BLS12-381).
export function compressG1(G1, point) {
    const buff = new Uint8Array(G1.F.n8);
    if (G1.isZero(point)) {
        buff[0] = 0b11000000; // compression + infinity flags
        return buff;
    }
    G1.toRprCompressed(buff, 0, point);
    const y = G1.toObject(G1.toAffine(point))[1];
    const yNeg = G1.toObject(G1.toAffine(G1.neg(point)))[1];
    const flags = y >= yNeg ? 0b10100000 : 0b10000000;
    buff[0] = (buff[0] & 0b00011111) | flags;
    return buff;
}

// Compress a G2 point to G2.F.n8 bytes (96 for BLS12-381).
// Fq2 lexicographic order: compare c1 first, then c0.
export function compressG2(G2, point) {
    const buff = new Uint8Array(G2.F.n8);
    if (G2.isZero(point)) {
        buff[0] = 0b11000000; // compression + infinity flags
        return buff;
    }
    G2.toRprCompressed(buff, 0, point);
    const [, [yc0, yc1]] = G2.toObject(G2.toAffine(point));
    const [, [nyc0, nyc1]] = G2.toObject(G2.toAffine(G2.neg(point)));
    const isLarger = yc1 > nyc1 || (yc1 === nyc1 && yc0 > nyc0);
    const flags = isLarger ? 0b10100000 : 0b10000000;
    buff[0] = (buff[0] & 0b00011111) | flags;
    return buff;
}

export function compressG1Hex(G1, point) {
    return toHex(compressG1(G1, point));
}

export function compressG2Hex(G2, point) {
    return toHex(compressG2(G2, point));
}

function toHex(buff) {
    return Array.from(buff, (b) => b.toString(16).padStart(2, "0")).join("");
}
