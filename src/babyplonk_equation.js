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

export function getBPlonkConstantConstraint(signal1, Fr) {
    return [
        [signal1, Fr.zero, Fr.one, Fr.zero, Fr.zero],
        [Fr.zero, signal1, Fr.zero, Fr.zero, Fr.zero]
    ];
}

export function getBPlonkAdditionConstraint(signal1, signal2, signalOut, q1, q2, qOut, k, Fr) {
    const inv = Fr.inv(qOut);

    return [
        [signal1, signal2, Fr.mul(q1, inv), Fr.mul(q2, inv), k],
        [Fr.zero, signalOut, Fr.zero, Fr.zero, Fr.zero]
    ];
}

export function getBPlonkMultiplicationConstraint(signal1, signal2, signalOut, q1, q2, q1q2, qOut, k, Fr) {
    const inv = Fr.inv(qOut);

    return [
        [signal1, signal2, Fr.mul(q1, inv), Fr.mul(q2, inv), k],
        [Fr.zero, signalOut, Fr.mul(q1q2, inv), Fr.zero, Fr.zero]
    ];
}
