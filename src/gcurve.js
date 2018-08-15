const fUtils = require("./futils.js");

class GCurve {

    constructor(F, g) {
        this.F = F;
        this.g = [F.copy(g[0]), F.copy(g[1])];
        if (this.g.length == 2) this.g[2] = this.F.one;
        this.zero = [this.F.zero, this.F.one, this.F.zero];
    }

    isZero(p) {
        return this.F.isZero(p[2]);
    }

    add(p1, p2) {

        if (this.isZero(p1)) return p2;
        if (this.isZero(p2)) return p1;

        const res = new Array(3);

        const Z1Z1 = this.F.square( p1[2] );
        const Z2Z2 = this.F.square( p2[2] );

        const U1 = this.F.mul( p1[0] , Z2Z2 );     // U1 = X1  * Z2Z2
        const U2 = this.F.mul( p2[0] , Z1Z1 );     // U2 = X2  * Z1Z1

        const Z1_cubed = this.F.mul( p1[2] , Z1Z1);
        const Z2_cubed = this.F.mul( p2[2] , Z2Z2);

        const S1 = this.F.mul( p1[1] , Z2_cubed);  // S1 = Y1 * Z2 * Z2Z2
        const S2 = this.F.mul( p2[1] , Z1_cubed);  // S2 = Y2 * Z1 * Z1Z1

        if (this.F.equals(U1,U2) && this.F.equals(S1,S2)) {
            return this.double(p1);
        }

        const H = this.F.sub( U2 , U1 );                    // H = U2-U1

        const S2_minus_S1 = this.F.sub( S2 , S1 );

        const I = this.F.square( this.F.add(H,H) );         // I = (2 * H)^2
        const J = this.F.mul( H , I );                      // J = H * I

        const r = this.F.add( S2_minus_S1 , S2_minus_S1 );  // r = 2 * (S2-S1)
        const V = this.F.mul( U1 , I );                     // V = U1 * I

        res[0] =
            this.F.sub(
                this.F.sub( this.F.square(r) , J ),
                this.F.add( V , V ));                       // X3 = r^2 - J - 2 * V

        const S1_J = this.F.mul( S1 , J );

        res[1] =
            this.F.sub(
                this.F.mul( r , this.F.sub(V,res[0])),
                this.F.add( S1_J,S1_J ));                   // Y3 = r * (V-X3)-2 S1 J

        res[2] =
            this.F.mul(
                H,
                this.F.sub(
                    this.F.square( this.F.add(p1[2],p2[2]) ),
                    this.F.add( Z1Z1 , Z2Z2 )));            // Z3 = ((Z1+Z2)^2-Z1Z1-Z2Z2) * H

        return res;
    }

    double(p) {
        const res = new Array(3);

        if (this.isZero(p)) return p;

        const A = this.F.square( p[0] );                    // A = X1^2
        const B = this.F.square( p[1] );                    // B = Y1^2
        const C = this.F.square( B );                       // C = B^2

        let D =
            this.F.sub(
                this.F.square( this.F.add(p[0] , B )),
                this.F.add( A , C));
        D = this.F.add(D,D);                    // D = 2 * ((X1 + B)^2 - A - C)

        const E = this.F.add( this.F.add(A,A), A);          // E = 3 * A
        const F = this.F.square( E );                       // F = E^2

        res[0] = this.F.sub( F , this.F.add(D,D) );         // X3 = F - 2 D

        let eightC = this.F.add( C , C );
        eightC = this.F.add( eightC , eightC );
        eightC = this.F.add( eightC , eightC );

        res[1] =
            this.F.sub(
                this.F.mul(
                    E,
                    this.F.sub( D, res[0] )),
                eightC);                                    // Y3 = E * (D - X3) - 8 * C

        const Y1Z1 = this.F.mul( p[1] , p[2] );
        res[2] = this.F.add( Y1Z1 , Y1Z1 );                 // Z3 = 2 * Y1 * Z1

        return res;
    }

    mulEscalar(base, e) {
        return fUtils.mulEscalar(this, base, e);
    }

    affine(p) {
        if (this.isZero(p)) {
            return this.zero;
        } else {
            const Z_inv = this.F.inverse(p[2]);
            const Z2_inv = this.F.square(Z_inv);
            const Z3_inv = this.F.mul(Z2_inv, Z_inv);

            const res = new Array(3);
            res[0] = this.F.affine( this.F.mul(p[0],Z2_inv));
            res[1] = this.F.affine( this.F.mul(p[1],Z3_inv));
            res[2] = this.F.one;

            return res;
        }
    }

    equals(p1, p2) {
        if (this.isZero(p1)) return this.isZero(p2);
        if (this.isZero(p2)) return this.isZero(p1);

        const Z1Z1 = this.F.square( p1[2] );
        const Z2Z2 = this.F.square( p2[2] );

        const U1 = this.F.mul( p1[0] , Z2Z2 );
        const U2 = this.F.mul( p2[0] , Z1Z1 );

        const Z1_cubed = this.F.mul( p1[2] , Z1Z1);
        const Z2_cubed = this.F.mul( p2[2] , Z2Z2);

        const S1 = this.F.mul( p1[1] , Z2_cubed);
        const S2 = this.F.mul( p2[1] , Z1_cubed);

        return (this.F.equals(U1,U2) && this.F.equals(S1,S2));
    }

    toString(p) {
        const cp = this.affine(p);
        return `[ ${this.F.toString(cp[0])} , ${this.F.toString(cp[1])} ]`;
    }

}

module.exports = GCurve;

