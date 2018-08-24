/*
    This library do operations on polinomials where their coefficients are in field F

    The polynomial P(x) = p0 + p1 * x + p2 * x^2 + p3 * x^3, ...
    is represented by the array [ p0, p1, p2, p3, ...  ]
 */

const bigInt = require("./bigInt");
const ZqField = require("./zqfield");

class PolFieldZq {
    constructor (q) {
        this.F = new ZqField(q);

        let rem = q.sub(bigInt(1));
        let s = 0;
        while (!rem.isOdd()) {
            s ++;
            rem = rem.shiftRight(1);
        }

        this.w = new Array(s+1);
        this.wi = new Array(s+1);
        this.w[s] = this.F.exp(bigInt(5), rem);
        this.wi[s] = this.F.inverse(this.w[s]);

        let n=s-1;
        while (n>=0) {
            this.w[n] = this.F.square(this.w[n+1]);
            this.wi[n] = this.F.square(this.wi[n+1]);
            n--;
        }

    }

    add(a, b) {
        const m = Math.max(a.length, b.length);
        const res = new Array(m);
        for (let i=0; i<m; i++) {
            res[i] = this.F.add(a[i] || this.F.zero, b[i] || this.F.zero);
        }
        return this.reduce(res);
    }

    double(a) {
        return this.add(a,a);
    }

    sub(a, b) {
        const m = Math.max(a.length, b.length);
        const res = new Array(m);
        for (let i=0; i<m; i++) {
            res[i] = this.F.sub(a[i] || this.F.zero, b[i] || this.F.zero);
        }
        return this.reduce(res);
    }

    mulScalar(a, b) {
        if (this.F.isZero(b)) return [];
        const res = new Array(a.length);
        for (let i=0; i<a.length; i++) {
            res[i] = this.F.mul(a[i], b);
        }
        return res;
    }

    mul(a, b) {
        if (a.length == 0) return [];
        if (b.length == 0) return [];
        if (a.length == 1) return this.mulScalar(b, a[0]);
        if (b.length == 1) return this.mulScalar(a, b[0]);

        const longestN = Math.max(a.length, b.length);
        const bitsResult = log2(longestN-1)+2;
        const m = 1 << bitsResult;
        const ea = this.extend(a,m);
        const eb = this.extend(b,m);

        const ta = this._fft(ea, bitsResult, 0, 1, false);
        const tb = this._fft(eb, bitsResult, 0, 1, false);

        const tres = new Array(m);

        for (let i=0; i<m; i++) {
            tres[i] = this.F.mul(ta[i], tb[i]);
        }

        const res = this._fft(tres, bitsResult, 0, 1, true);

        const twoinvm = this.F.inverse(bigInt(m));
        const resn = new Array(m);
        for (let i=0; i<m; i++) {
            resn[i] = this.F.mul(res[(m-i)%m], twoinvm);
        }

        return this.reduce(this.affine(resn));
    }

    square(a) {
        return this.mul(a,a);
    }

    scaleX(p, n) {
        if (n==0) {
            return p;
        } else if (n>0) {
            const z = new Array(n).fill(this.F.zero);
            return z.concat(p);
        } else {
            return p.slice(-n);
        }
    }

    div(a, b) {
        throw new Error("Not Implementted");
    }

    eval(p, x) {
        let v = this.F.zero;
        let ix = this.F.one;
        for (let i=0; i<p.length; i++) {
            v = this.F.add(v, this.F.mul(p[i], ix));
            ix = this.F.mul(ix, x);
        }
        return v;
    }

    lagrange(points) {
        throw new Error("Not Implementted");
    }

    _fft(pall, bits, offset, step) {

        const n = 1 << bits;
        if (n==1) {
            return [ pall[offset] ];
        }

        const ndiv2 = n >> 1;
        const p1 = this._fft(pall, bits-1, offset, step*2);
        const p2 = this._fft(pall, bits-1, offset+step, step*2);

        const out = new Array(n);

        let m= bigInt(1);
        for (let i=0; i<ndiv2; i++) {
            out[i] = this.F.add(p1[i], this.F.mul(m, p2[i]));
            out[i+ndiv2] = this.F.sub(p1[i], this.F.mul(m, p2[i]));
            m = this.F.mul(m, this.w[bits]);
        }

        return out;
    }

    extend(p, e) {
        if (e == p.length) return p;
        const z = new Array(e-p.length).fill(this.F.zero);

        return p.concat(z);
    }

    reduce(p) {
        if (p.length == 0) return p;
        if (! this.F.isZero(p[p.length-1]) ) return p;
        let i=p.length-1;
        while( i>0 && this.F.isZero(p[i]) ) i--;
        return p.slice(0, i+1);
    }

    affine(p) {
        for (let i=0; i<p.length; i++) {
            p[i] = this.F.affine(p[i]);
        }
        return p;
    }

    equals(a, b) {
        const pa = this.reduce(this.affine(a));
        const pb = this.reduce(this.affine(b));

        if (pa.length != pb.length) return false;
        for (let i=0; i<pb.length; i++) {
            if (!this.F.equals(pa[i], pb[i])) return false;
        }

        return true;
    }

    _next2Power(v) {
        v--;
        v |= v >> 1;
        v |= v >> 2;
        v |= v >> 4;
        v |= v >> 8;
        v |= v >> 16;
        v++;
        return v;
    }

    toString(p) {
        const ap = this.affine(p);
        let S = "";
        for (let i=ap.length-1; i>=0; i--) {
            if (!this.F.isZero(p[i])) {
                if (S!="") S += " + ";
                S = S + p[i].toString(10);
                if (i>0) {
                    S = S + "x";
                    if (i>1) {
                        S = S + "^" +i;
                    }
                }
            }
        }
        return S;
    }


    _reciprocal(p, bits) {
        const k = 1 << bits;
        if (k==1) {
            return [ this.F.inverse(p[0]) ];
        }
        const np = this.scaleX(p, -k/2);
        const q = this._reciprocal(np, bits-1);
        const a = this.scaleX(this.double(q), 3*k/2-2);
        const b = this.mul( this.square(q), p);

        return this.scaleX(this.sub(a,b),   -(k-2));
    }

    // divides x^m / v
    _div2(m, v) {
        const kbits = log2(v.length-1)+1;
        const k = 1 << kbits;

        const scaleV = k - v.length;

        // rec = x^(k - 2) / v* x^scaleV =>
        // rec = x^(k-2-scaleV)/ v
        //
        // res = x^m/v = x^(m +(2k-2-scaleV) -(2k-2-scaleV)) /v =>
        // res = rec * x^(m - (2k-2-scaleV)) =>
        // res = rec * x^(m - 2k +2 + scaleV)

        const rec = this._reciprocal(this.scaleX(v, scaleV), kbits);
        const res = this.scaleX(rec, m - k*2 +2+scaleV);

        return res;

    }

}

function log2( V )
{
    return( ( ( V & 0xFFFF0000 ) !== 0 ? ( V &= 0xFFFF0000, 16 ) : 0 ) | ( ( V & 0xFF00FF00 ) !== 0 ? ( V &= 0xFF00FF00, 8 ) : 0 ) | ( ( V & 0xF0F0F0F0 ) !== 0 ? ( V &= 0xF0F0F0F0, 4 ) : 0 ) | ( ( V & 0xCCCCCCCC ) !== 0 ? ( V &= 0xCCCCCCCC, 2 ) : 0 ) | ( ( V & 0xAAAAAAAA ) !== 0 ) );
}

module.exports = PolFieldZq;
