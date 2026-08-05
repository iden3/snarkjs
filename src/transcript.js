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

import { Keccak256Transcript } from "./Keccak256Transcript.js";
import { Keccak256CompressedTranscript } from "./Keccak256CompressedTranscript.js";

// Fiat-Shamir transcript factory. `name` comes from the `transcript` option
// (`--transcript` on the CLI): undefined selects the default keccak256
// transcript over uncompressed points, "keccak256-compressed" the compressed
// variant for Cardano/Plutus (bls12381 only). Anything else is rejected so
// that a typo cannot silently produce a proof for the wrong transcript.
// The CLI option layer (clprocessor getOption) yields null, not undefined,
// for a declared-but-absent option, so both must select the default.
export function createTranscript(curve, name) {
    if (undefined === name || null === name || "keccak256" === name) {
        return new Keccak256Transcript(curve);
    }
    if ("keccak256-compressed" === name) {
        return new Keccak256CompressedTranscript(curve);
    }
    throw new Error(`Unknown transcript type '${name}'. Valid values are "keccak256" (default) and "keccak256-compressed"`);
}
