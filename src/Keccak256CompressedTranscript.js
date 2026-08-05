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
import {compressG1} from "./point_compress.js";

const POLYNOMIAL = 0;
const SCALAR = 1;

export class Keccak256CompressedTranscript {
    constructor(curve) {
        // The ZCash compressed encoding is specified for BLS12-381: flags live
        // in the 3 free high bits of the 48-byte serialization (381-bit field).
        // On other curves (e.g. bn128: 254 bits in 32 bytes, 2 free) the flags
        // would corrupt x-coordinate data.
        if (curve.name !== "bls12381") {
            throw new Error(`keccak256-compressed transcript only supports bls12381, got '${curve.name}'`);
        }

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
                buffer.set(compressG1(this.G1, this.data[i].data), offset);
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
