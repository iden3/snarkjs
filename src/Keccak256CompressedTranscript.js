/*
    Copyright 2026 iden3 association.

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

import {Keccak256Transcript} from "./Keccak256Transcript.js";
import {compressG1} from "./point_compress.js";

// Same transcript as Keccak256Transcript, except G1 commitments are hashed as
// G1.F.n8-byte (48 for BLS12-381) ZCash compressed points instead of 2*n8-byte
// uncompressed ones. Scalar encoding and hashing are inherited.
export class Keccak256CompressedTranscript extends Keccak256Transcript {
    constructor(curve) {
        // The ZCash compressed encoding is specified for BLS12-381: flags live
        // in the 3 free high bits of the 48-byte serialization (381-bit field).
        // On other curves (e.g. bn128: 254 bits in 32 bytes, 2 free) the flags
        // would corrupt x-coordinate data.
        if (curve.name !== "bls12381") {
            throw new Error(`keccak256-compressed transcript only supports bls12381, got '${curve.name}'`);
        }

        super(curve);
    }

    pointSize() {
        return this.G1.F.n8;
    }

    writePoint(buffer, offset, point) {
        buffer.set(compressG1(this.G1, point), offset);
    }
}
