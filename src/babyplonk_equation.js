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

// [[ a  , b  , q1  , q2  , 0 ],
//  [ a' , b' , q1' , q2' , k ]]

// We export to zkey the signals and values of the a, b, a', b', q1, q2, q1', q2' and k

// a, b, a' and b' are signals id (32-bit integers)
// q1, q2, q1', q2' and k are field values

// As we have some constant values (k) we have to add it to b' as it is the output of the gates.
// We can't add until we have the final value for the gate. This will be in the prover command.
// So, we have to save the k values to the zkey file

export function getBPlonkConstantConstraint(signal1, Fr) {

    return [
        [signal1, 0, Fr.one, Fr.zero, Fr.zero],
        [0, signal1, Fr.zero, Fr.zero, Fr.zero]
    ];
}

export function getBPlonkAdditionConstraint(signal1, signal2, signalOut, q1, q2, qOut, k, Fr) {
    const inv = Fr.inv(qOut);

    return [
        [signal1, signal2, Fr.mul(q1, inv), Fr.mul(q2, inv), Fr.zero],
        [0, signalOut, Fr.zero, Fr.zero, k]
    ];
}

export function getBPlonkMultiplicationConstraint(signal1, signal2, signalOut, q1, q2, q1q2, qOut, k, Fr) {
    const inv = Fr.inv(qOut);

    return [
        [signal1, signal2, Fr.mul(q1, inv), Fr.mul(q2, inv), Fr.zero],
        [0, signalOut, Fr.mul(q1q2, inv), Fr.zero, k]
    ];
}
