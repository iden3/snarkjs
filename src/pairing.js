/*
This module calculate the pairing of p1 and p2 where p1 in G1 and p2 in G2
 */

const assert = require("assert");
const bigInt = require("big-integer");
const F1Field = require("f1field");
const F2Field = require("f2field");
const F12Field = require("f12field");
const G1Curve = require("g1curve");
const G2Curve = require("g2curve");
const constants = require("constants");

module.exports = new Pairing();


class Pairing {

    constructor() {
        this.loopCount = bigInt(11);// CONSTANT

        // Set loopCountNeg
        if (this.loopCount.isNegative()) {
            this.loopCount = this.neg();
            this.loopCountNeg = true;
        } else {
            this.loopCountNeg = false;
        }

        // Set loop_count_bits
        let lc = this.loopCount;
        this.loop_count_bits = []; // Constant
        while (lc) {
            this.loop_count_bits.push( lc.isOdd() );
            lc = lc.shiftRight(1);
        }

        this.F12 = new F12Field(constants.q);
        this.F2 = new F2Field(constants.q);
        this.F1 = new F1Field(constants.q);
        this.G1 = new GCurve(F1, constants.g1);
        this.G2 = new GCurve(F2, constants.g2);

        this.twoInv = this.F1.inverse(bigInt(2));
    }

    pairing(p1, p2) {

        const pre1 = this._precomputeG1(p1);
        const pre2 = this._precomputeG2(p2);

        const res = this._millerLoop(pre1, pre2);

        return res;
    }


    _precomputeG1(p) {
        const Pcopy = this.G1.affine(p);

        const res = {};
        res.PX = Pcopy[0];
        res.PY = Pcopy[1];

        return res;
    }

    _precomputeG2(p) {

        const Qcopy = this.G2.affine(p);

        const res = {
            QX: Qcopy[0],
            QY: Qcopy[1],
            coeffs: []
        };

        const R = {
            X: Qcopy[0],
            Y: Qcopy[1],
            Z: this.F2.one
        };

        let c;

        for (let i = this.loop_count_bits.length-2; i >= 0; --i)
        {
            const bit = this.loop_count_bits[i];

            c = this._doubleStep(R);
            res.coeffs.push(c);

            if (bit)
            {
                c = this._addStep(Qcopy, R);
                res.coeffs.push(c);
            }
        }

        const Q1 = this.G2.mul_by_q(Qcopy);  // TODO mul_by_q
        assert(this.F2.equal(Q1[2], this.F2.one));
        const Q2 = this.G2.mul_by_q(Q1);
        assert(this.F2.equal(Q2[2], this.F2.one));

        if (this.loopCountNef)
        {
            R.Y = this.F2.neg(R.Y);
        }
        Q2.Y = this.F2.neg(Q2.Y);

        c = this._addStep(Q1, R);
        res.coeffs.push(c);

        c = this._addStep(Q2, R);
        res.coeffs.push(c);

        return res;
    }

    _millerLoop(pre1, pre2) {
        let f = this.F12.one;

        let idx = 0;

        let c;

        for (let i = this.loop_count_bits.length-2; i >= 0; --i)
        {
            const bit = this.loop_count_bits[i];

            /* code below gets executed for all bits (EXCEPT the MSB itself) of
               alt_bn128_param_p (skipping leading zeros) in MSB to LSB
               order */

            c = pre2.coeffs[idx++];
            f = this.F12.square(f);
            f = this.F12.mul_by_024(
                f,
                c.ell_0,
                this.F2.mul(pre1.PY, c.ell_VW),
                this.F2.mul(pre1.PX, c.ell_VV));

            if (bit)
            {
                c = pre2.coeffs[idx++];
                f = this.F12.mul_by_024(
                    f,
                    c.ell_0,
                    this.F2.mul(pre1.PY, c.ell_VW),
                    this.F2.mul(pre1.PX, c.ell_VV));
            }

        }

        if (this.loopCountNef)
        {
            f = this.F12.inverse(f);
        }

        c = pre2.coeffs[idx++];
        f = this.F12.mul_by_024(
            f,
            c.ell_0,
            this.F2.mul(pre1.PY, c.ell_VW),
            this.F2.mul(pre1.PX, c.ell_VV));

        c = pre2.coeffs[idx++];
        f = this.F12.mul_by_024(
            f,
            c.ell_0,
            this.F2.mul(pre1.PY, c.ell_VW),
            this.F2.mul(pre1.PX, c.ell_VV));

        return f;
    }

    _doubleStep(current) {
        const X = current.X;
        const Y = current.Y;
        const Z = current.Z;

        const A = this.F2.mulEscalar(this.F1.mul(X,Y), constants.two_inv);                     // A = X1 * Y1 / 2
        const B = this.F2.square(Y);                           // B = Y1^2
        const C = this.F2.square(Z);                           // C = Z1^2
        const D = this.F2.add(C, this.F1.add(C,C));            // D = 3 * C
        const E = this.F2.mul(constants.twist_coeff_b, D);     // E = twist_b * D
        const F = this.F2.add(E, this.F2.add(E,E));            // F = 3 * E
        const G =
            this.F2.mulEscalar(
                this.F2.sum( B , F ),
                constants.two_inv);                            // G = (B+F)/2
        const H =
            this.F2.sub(
                this.F2.square( this.F2.add(Y,Z) ),
                this.F2.add( B , C));                          // H = (Y1+Z1)^2-(B+C)
        const I = this.F2.sub(E, B);                           // I = E-B
        const J = this.F2.square(X);                           // J = X1^2
        const E_squared = this.F2.square(E);                   // E_squared = E^2

        current.X = this.F2.mul( A, this.F2.sub(B,F) );        // X3 = A * (B-F)
        current.Y =
            this.F2.sub(
                this.F2.sub( this.F2.square(G) , E_squared ),
                this.F2.add( E_squared , E_squared ));         // Y3 = G^2 - 3*E^2
        current.Z = this.F2.mul( B, H );                       // Z3 = B * H
        const c = {
            ell_0 : this.F2.mul( I, constants.twist),          // ell_0 = xi * I
            ell_VW: this.F2.neg( H ),                          // ell_VW = - H (later: * yP)
            ell_VV: this.F2.add( J , this.F2.add(J,J) )        // ell_VV = 3*J (later: * xP)
        };

        return c;
    }

    _addStep(base, current) {

        const X1 = current.X;
        const Y1 = current.Y;
        const Z1 = current.Z;
        const x2 = base.X;
        const y2 = base.Y;

        const D = this.F2.sub( X1, this.F2.mul(x2,Z1) );  // D = X1 - X2*Z1
        const E = this.F2.sub( Y1, this.F2.mul(y2,Z1) );  // E = Y1 - Y2*Z1
        const F = this.F2.square(D);                      // F = D^2
        const G = this.F2.square(E);                      // G = E^2
        const H = this.F2.mul(D,F);                       // H = D*F
        const I = this.F2.mul(X1,F);                      // I = X1 * F
        const J =
            this.F2.sub(
                this.F2.add( H, this.F2.mul(Z1,G) ),
                this.F2.add( I, I ));                     // J = H + Z1*G - (I+I)

        current.X = this.F2.mul( D , J );                 // X3 = D*J
        current.Y =
            this.F2.sub(
                this.F2.mul( E , this.F2.sub(I,J) ),
                this.F2.mul( H , Y1));                    // Y3 = E*(I-J)-(H*Y1)
        current.Z = this.F2.mul(Z1,H);
        const c = {
            ell_0 :
                this.F2.mul(
                    constants.twist,
                    this.F2.sub(
                        this.F2.mul(E , x2),
                        this.F2.mul(D , y2))),            // ell_0 = xi * (E * X2 - D * Y2)
            ell_VV : this.F2.neg(E),                      // ell_VV = - E (later: * xP)
            ell_VW : D                                    // ell_VW = D (later: * yP )
        };

        return c;
    }
}
