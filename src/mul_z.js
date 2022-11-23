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

export class MulZ {
    static getZ1(Fr) {
        return [
            Fr.zero,
            Fr.add(Fr.e(-1), Fr.w[2]),
            Fr.e(-2),
            Fr.sub(Fr.e(-1), Fr.w[2]),
        ];
    }

    static getZ2(Fr) {
        return [
            Fr.zero,
            Fr.add(Fr.zero, Fr.mul(Fr.e(-2), Fr.w[2])),
            Fr.e(4),
            Fr.sub(Fr.zero, Fr.mul(Fr.e(-2), Fr.w[2])),
        ];
    }

    static getZ3(Fr) {
        return [
            Fr.zero,
            Fr.add(Fr.e(2), Fr.mul(Fr.e(2), Fr.w[2])),
            Fr.e(-8),
            Fr.sub(Fr.e(2), Fr.mul(Fr.e(2), Fr.w[2])),
        ];

    }

    static mul2(a, b, ap, bp, p, Fr) {
        const Z1 = this.getZ1(Fr);
        let r, rz;

        const a_b = Fr.mul(a, b);
        const a_bp = Fr.mul(a, bp);
        const ap_b = Fr.mul(ap, b);
        const ap_bp = Fr.mul(ap, bp);

        r = a_b;

        let a0 = Fr.add(a_bp, ap_b);

        let a1 = ap_bp;

        rz = a0;
        if (p) {
            rz = Fr.add(rz, Fr.mul(Z1[p], a1));
        }

        return [r, rz];
    }

    static mul3(a, b, c, ap, bp, cp, p, Fr) {
        const Z1 = this.getZ1(Fr);
        const Z2 = this.getZ2(Fr);
        let r, rz;

        const a_b = Fr.mul(a, b);
        const a_bp = Fr.mul(a, bp);
        const ap_b = Fr.mul(ap, b);
        const ap_bp = Fr.mul(ap, bp);

        r = Fr.mul(a_b, c);

        let a0 = Fr.mul(ap_b, c);
        a0 = Fr.add(a0, Fr.mul(a_bp, c));
        a0 = Fr.add(a0, Fr.mul(a_b, cp));

        let a1 = Fr.mul(ap_bp, c);
        a1 = Fr.add(a1, Fr.mul(a_bp, cp));
        a1 = Fr.add(a1, Fr.mul(ap_b, cp));

        rz = a0;
        if (p) {
            const a2 = Fr.mul(ap_bp, cp);
            rz = Fr.add(rz, Fr.mul(Z1[p], a1));
            rz = Fr.add(rz, Fr.mul(Z2[p], a2));
        }

        return [r, rz];
    }

    static mul4(a, b, c, d, ap, bp, cp, dp, p, Fr) {
        const Z1 = this.getZ1(Fr);
        const Z2 = this.getZ2(Fr);
        const Z3 = this.getZ3(Fr);

        let r, rz;

        const a_b = Fr.mul(a, b);
        const a_bp = Fr.mul(a, bp);
        const ap_b = Fr.mul(ap, b);
        const ap_bp = Fr.mul(ap, bp);

        const c_d = Fr.mul(c, d);
        const c_dp = Fr.mul(c, dp);
        const cp_d = Fr.mul(cp, d);
        const cp_dp = Fr.mul(cp, dp);

        r = Fr.mul(a_b, c_d);

        let a0 = Fr.mul(ap_b, c_d);
        a0 = Fr.add(a0, Fr.mul(a_bp, c_d));
        a0 = Fr.add(a0, Fr.mul(a_b, cp_d));
        a0 = Fr.add(a0, Fr.mul(a_b, c_dp));

        let a1 = Fr.mul(ap_bp, c_d);
        a1 = Fr.add(a1, Fr.mul(ap_b, cp_d));
        a1 = Fr.add(a1, Fr.mul(ap_b, c_dp));
        a1 = Fr.add(a1, Fr.mul(a_bp, cp_d));
        a1 = Fr.add(a1, Fr.mul(a_bp, c_dp));
        a1 = Fr.add(a1, Fr.mul(a_b, cp_dp));

        let a2 = Fr.mul(a_bp, cp_dp);
        a2 = Fr.add(a2, Fr.mul(ap_b, cp_dp));
        a2 = Fr.add(a2, Fr.mul(ap_bp, c_dp));
        a2 = Fr.add(a2, Fr.mul(ap_bp, cp_d));

        let a3 = Fr.mul(ap_bp, cp_dp);

        rz = a0;
        if (p) {
            rz = Fr.add(rz, Fr.mul(Z1[p], a1));
            rz = Fr.add(rz, Fr.mul(Z2[p], a2));
            rz = Fr.add(rz, Fr.mul(Z3[p], a3));
        }

        return [r, rz];
    }
}