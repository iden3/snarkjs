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

// We export to zkey the signals and values of the a, b, c, ql, qr, qm, qo and qc

// a, b and c are signals id (32-bit integers)
// ql, qr, qm, qo and qc are field values

export function getFFlonkConstantConstraint(signal1, Fr) {
    return [signal1, 0, 0, Fr.one, Fr.zero, Fr.zero, Fr.zero, Fr.zero];
}

export function getFFlonkAdditionConstraint(signal1, signal2, signalOut, ql, qr, qm, qo, qc) {
    return [signal1, signal2, signalOut, ql, qr, qm, qo, qc];
}

export function getFFlonkMultiplicationConstraint(signal1, signal2, signalOut, ql, qr, qm, qo, qc, Fr) {
    return [signal1, signal2, signalOut, ql, qr, qm, qo, qc];
}
