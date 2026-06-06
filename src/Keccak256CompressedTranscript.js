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

// Fiat-Shamir transcript using Keccak-256 with compressed G1 points (ZCash/IETF flag format).
// Use this instead of Keccak256Transcript when the on-chain verifier operates on compressed
// BLS12-381 points, e.g. Cardano/Plutus via CIP-0381 + CIP-0101.

import {Scalar} from "ffjavascript";
import {keccak_256} from "@noble/hashes/sha3";

const POLYNOMIAL = 0;
const SCALAR = 1;

export class Keccak256CompressedTranscript {
    constructor(curve) {
        this.G1 = curve.G1;
        this.Fr = curve.Fr;

        this.reset();
    }

    reset() {
        this.data = [];
    }

    addPolCommitment(polynomialCommitment) {
        this.data.push({type: POLYNOMIAL, data: polynomialCommitment});
    }

    addScalar(scalar) {
        this.data.push({type: SCALAR, data: scalar});
    }

    getChallenge() {
        if (0 === this.data.length) {
            throw new Error("Keccak256CompressedTranscript: No data to generate a transcript");
        }

        let nPolynomials = 0;
        let nScalars = 0;

        this.data.forEach(element => POLYNOMIAL === element.type ? nPolynomials++ : nScalars++);

        // Compressed G1 points are G1.F.n8 bytes (vs 2*n8 for uncompressed).
        let buffer = new Uint8Array(nScalars * this.Fr.n8 + nPolynomials * this.G1.F.n8);
        let offset = 0;

        for (let i = 0; i < this.data.length; i++) {
            if (POLYNOMIAL === this.data[i].type) {
                this.G1.toRprCompressed(buffer, offset, this.data[i].data);

                // Apply ZCash/IETF compressed-point flags in the three high bits:
                //   bit 7 (0x80): compression flag — always set for compressed encoding
                //   bit 6 (0x40): infinity flag
                //   bit 5 (0x20): sign flag — set when y is the lexicographically larger root
                // The top three bits of a valid BLS12-381 field element are always 0,
                // so OR-ing the flags into buffer[offset] is safe.
                const point = this.G1.toAffine(this.data[i].data);
                const pointNeg = this.G1.toAffine(this.G1.neg(this.data[i].data));
                const y = this.G1.toObject(point)[1];
                const yNeg = this.G1.toObject(pointNeg)[1];

                let mask;
                if (this.G1.isZero(this.data[i].data)) {
                    mask = 0b11000000; // compression + infinity flags
                } else if (y >= yNeg) {
                    mask = 0b10100000; // compression + sign flags (y is the larger root)
                } else {
                    mask = 0b10000000; // compression flag only (y is the smaller root)
                }
                buffer[offset] = buffer[offset] | mask;
                offset += this.G1.F.n8;
            } else {
                this.Fr.toRprBE(buffer, offset, this.data[i].data);
                offset += this.Fr.n8;
            }
        }

        const value = Scalar.fromRprBE(keccak_256(buffer));
        return this.Fr.e(value);
    }
}
