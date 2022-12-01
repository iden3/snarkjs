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

import {Polynomial} from "./polynomial/polynomial.js";

export function Lagrange4(y, a, b, c, d, Fr) {
    const a2 = Fr.square(a);

    // x^2
    let x2 = Fr.neg(Fr.add(b, Fr.add(c, d)));

    // x^1
    let x1 = Fr.mul(b, c);
    x1 = Fr.add(x1, Fr.mul(b, d));
    x1 = Fr.add(x1, Fr.mul(c, d));

    // x^0
    let x0 = Fr.neg(Fr.mul(b, Fr.mul(c, d)));

    let den = Fr.mul(a2, a);
    den = Fr.add(den, Fr.mul(x2, a2));
    den = Fr.add(den, Fr.mul(x1, a));
    den = Fr.add(den, x0);
    den = Fr.inv(den);
    den = Fr.mul(den, y);

    const coefX0 = Fr.mul(den, x0);
    const coefX1 = Fr.mul(den, x1);
    const coefX2 = Fr.mul(den, x2);

    let buff = new Uint8Array(4 * Fr.n8);
    buff.set(coefX0, 0);
    buff.set(coefX1, 32);
    buff.set(coefX2, 64);
    buff.set(den, 96);

    return new Polynomial(buff, Fr);
}

export function Lagrange6(y, a, b, c, d, e, f, Fr) {
    const a2 = Fr.square(a);
    const a3 = Fr.mul(a2, a);
    const a4 = Fr.square(a2);

    const bc = Fr.mul(b, c);
    const bd = Fr.mul(b, d);
    const be = Fr.mul(b, e);
    const bf = Fr.mul(b, f);
    const cd = Fr.mul(c, d);
    const ce = Fr.mul(c, e);
    const cf = Fr.mul(c, f);
    const de = Fr.mul(d, e);
    const df = Fr.mul(d, f);
    const ef = Fr.mul(e, f);

    // x^4
    let x4 = Fr.neg(Fr.add(f, Fr.add(e, Fr.add(d, Fr.add(c, b)))));

    // x^3
    let x3 = Fr.add(bf, cf);
    x3 = Fr.add(x3, df);
    x3 = Fr.add(x3, ef);
    x3 = Fr.add(x3, be);
    x3 = Fr.add(x3, ce);
    x3 = Fr.add(x3, de);
    x3 = Fr.add(x3, bd);
    x3 = Fr.add(x3, cd);
    x3 = Fr.add(x3, bc);

    // x^2
    let x2 = Fr.mul(b, cd);
    x2 = Fr.add(x2, Fr.mul(b, ce));
    x2 = Fr.add(x2, Fr.mul(b, cf));
    x2 = Fr.add(x2, Fr.mul(b, de));
    x2 = Fr.add(x2, Fr.mul(b, df));
    x2 = Fr.add(x2, Fr.mul(b, ef));
    x2 = Fr.add(x2, Fr.mul(c, de));
    x2 = Fr.add(x2, Fr.mul(c, df));
    x2 = Fr.add(x2, Fr.mul(c, ef));
    x2 = Fr.add(x2, Fr.mul(d, ef));
    x2 = Fr.neg(x2);

    let x1 = Fr.mul(bc, de);
    x1 = Fr.add(x1, Fr.mul(bc, df));
    x1 = Fr.add(x1, Fr.mul(bc, ef));
    x1 = Fr.add(x1, Fr.mul(bd, ef));
    x1 = Fr.add(x1, Fr.mul(cd, ef));

    let x0 = Fr.neg(Fr.mul(b, Fr.mul(cd, ef)));

    let den = Fr.mul(a4, a);
    den = Fr.add(den, Fr.mul(x4, a4));
    den = Fr.add(den, Fr.mul(x3, a3));
    den = Fr.add(den, Fr.mul(x2, a2));
    den = Fr.add(den, Fr.mul(x1, a));
    den = Fr.add(den, x0);
    den = Fr.inv(den);
    den = Fr.mul(den, y);

    const coefX0 = Fr.mul(den, x0);
    const coefX1 = Fr.mul(den, x1);
    const coefX2 = Fr.mul(den, x2);
    const coefX3 = Fr.mul(den, x3);
    const coefX4 = Fr.mul(den, x4);

    let buff = new Uint8Array(6 * Fr.n8);
    buff.set(coefX0, 0);
    buff.set(coefX1, 32);
    buff.set(coefX2, 64);
    buff.set(coefX3, 96);
    buff.set(coefX4, 128);
    buff.set(den, 160);

    return new Polynomial(buff, Fr);
}