const bigInt = require("big-integer");

const q = new bigInt("21888242871839275222246405745257275088696311157297823662689037894645226208583");

module.eports = class G1Curve {

    constructor() {
        this.g = [ bigInt(1), bigInt(2), bigInt(1) ];
        this.zero = [ bigInt(0), bigInt(1), bigInt(0) ];
    }

    isZero(p) {
        return p[2].isZero();
    }
    add(p1, p2) {

        if (this.isZero(p1)) return p2;
        if (this.isZero(p2)) return p1;

        const res = new Array(3);

        const Z1Z1 = p1[2].square().mod(q);
        const Z2Z2 = p2[2].square().mod(q);

        const U1 = p1[0].times(Z2Z2).mod(q);
        const U2 = p2[0].times(Z1Z1).mod(q);

        const Z1_cubed = p1[2].times(Z1Z1).mod(q);
        const Z2_cubed = p2[2].times(Z2Z2).mod(q);

        const S1 = p1[1].times(Z2_cubed).mod(q);
        const S2 = p2[1].times(Z1_cubed).mod(q);

        if (U1.equals(U2) && (S1.equals(S2))) {
            return this.double(p1);
        }

        let H = U2.minus(U1);
        if (H.isNegative()) H = H.add(q);

        let S2_minus_S1 = S2.minus(S1);
        if (S2_minus_S1.isNegative()) S2_minus_S1 = S2_minus_S1.add(q);

        const I = H.add(H).square().mod(q);
        const J = H.times(I).mod(q);

        const r = S2_minus_S1.add(S2_minus_S1);
        const V = U1.times(I).mod(q);

        res[0] = r.square().minus(J).minus(V).minus(V).mod(q);
        if (res[0].isNegative()) res[0] = res[0].add(q);

        const S1_J = S1.times(J).mod(q);

        res[1] = r.times(V.minus(res[0])).minus(S1_J).minus(S1_J).mod(q);
        if (res[1].isNegative()) res[1] = res[1].add(q);

        res[2] = p1[2].add(p2[2]).square().minus(Z1Z1).minus(Z2Z2).mod(q);
        res[2] = res[2].times(H).mod(q);
        if (res[2].isNegative()) res[2] = res[2].add(q);

        return res;
    }

    double(p) {
        const res = new Array(3);

        if (this.isZero(p)) return p;

        const A = p[0].square().mod(q);
        const B = p[1].square().mod(q);
        const C = B.square().mod(q);

        let D = p[0].add(B).square().minus(A).minus(C);
        D = D.add(D);

        const E = A.times(3);
        const F = E.square();

        res[0] = F.minus(D).minus(D).mod(q);
        if (res[0].isNegative()) res[0] = res[0].add(q);

        const eightC = C.times(8);

        res[1] = E.times(D.minus(res[0])).minus(eightC).mod(q);
        if (res[1].isNegative()) res[1] = res[1].add(q);

        const Y1Z1 = p[1].times(p[2]);
        res[2] = Y1Z1.add(Y1Z1).mod(q);

        return res;
    }

    toAffineCoordinates(p) {
        if (this.isZero(p)) {
            return this.zero;
        } else {
            const Z_inv = p[2].modInv(q);
            const Z2_inv = Z_inv.square().mod(q);
            const Z3_inv = Z2_inv.times(Z_inv).mod(q);

            const res = new Array(3);
            res[0] = p[0].times(Z2_inv).mod(q);
            res[1] = p[1].times(Z3_inv).mod(q);
            res[2] = bigInt(1);

            return res;
        }
    }

    mulEscalar(base, e) {
        let res = this.zero;
        let rem = e;
        let exp = base;

        while (! rem.isZero()) {
            if (rem.isOdd()) {
                res = this.add(res, exp);
            }
            exp = this.double(exp);
            rem = rem.shiftRight(1);
        }

        return res;
    }

};

const G1 = new module.eports();


const r = bigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");
// const np = G1.mulEscalar(G1.g, bigInt(2));

const np = G1.mulEscalar(G1.g, r.add(1));
const p = G1.toAffineCoordinates(np);

/*
const np2 = G1.add(G1.g, G1.g);
const np3 = G1.add(G1.g, np2);

const p = G1.toAffineCoordinates(np3);
*/

console.log(p[0].toString() + ", " + p[1].toString() + ", " + p[2].toString());


