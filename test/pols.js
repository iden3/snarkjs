/*
    Copyright 2018 0kims association.

    This file is part of zksnark JavaScript library.

    zksnark JavaScript library is a free software: you can redistribute it and/or
    modify it under the terms of the GNU General Public License as published by the
    Free Software Foundation, either version 3 of the License, or (at your option)
    any later version.

    zksnark JavaScript library is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
    more details.

    You should have received a copy of the GNU General Public License along with
    zksnark JavaScript library. If not, see <https://www.gnu.org/licenses/>.
*/

const chai = require("chai");

const bigInt = require("../src/bigint.js");
const PolField = require("../src/polfield.js");
const ZqField = require("../src/zqfield");

const assert = chai.assert;

const r  = bigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");

describe("Polynomial field", () => {
    it("Should compute a multiplication", () => {
        const PF = new PolField(new ZqField(r));

        const a = [bigInt(1), bigInt(2), bigInt(3)];
        const b = [bigInt(1), bigInt(2), bigInt(3)];
        const res = PF.mul(a,b);

        assert(PF.equals(res, [bigInt(1), bigInt(4), bigInt(10), bigInt(12), bigInt(9)]));
    });
    it("Should compute a multiplication 2", () => {
        const PF = new PolField(new ZqField(r));

        const a = [bigInt(5), bigInt(1)];
        const b = [bigInt(-5), bigInt(1)];
        const res = PF.mul(a,b);

        assert(PF.equals(res, [bigInt(-25), bigInt(0), bigInt(1)]));
    });
    it("Should compute an addition", () => {
        const PF = new PolField(new ZqField(r));

        const a = [bigInt(5), bigInt(1)];
        const b = [bigInt(-5), bigInt(1)];
        const res = PF.add(a,b);

        assert(PF.equals(res, [bigInt(0), bigInt(2)]));
    });
    it("Should compute a substraction", () => {
        const PF = new PolField(new ZqField(r));

        const a = [bigInt(5), bigInt(3), bigInt(4)];
        const b = [bigInt(5), bigInt(1)];
        const res = PF.sub(a,b);

        assert(PF.equals(res, [bigInt(0), bigInt(2), bigInt(4)]));
    });
    it("Should compute reciprocal", () => {
        const PF = new PolField(new ZqField(r));

        const a = [bigInt(4), bigInt(1), bigInt(-3), bigInt(-1), bigInt(2),bigInt(1), bigInt(-1), bigInt(1)];
        const res = PF._reciprocal(a, 3, 0);

        assert(PF.equals(res, [bigInt(12), bigInt(15), bigInt(3), bigInt(-4), bigInt(-3), bigInt(0), bigInt(1), bigInt(1)]));
    });
    it("Should div2", () => {
        const PF = new PolField(new ZqField(r));

        // x^6
        const a = [bigInt(0), bigInt(0), bigInt(0), bigInt(0), bigInt(0),bigInt(0), bigInt(1)];
        // x^5
        const b = [bigInt(0), bigInt(0), bigInt(0), bigInt(0), bigInt(0), bigInt(1)];

        const res = PF._div2(6, b);
        assert(PF.equals(res, [bigInt(0), bigInt(1)]));

        const res2 = PF.div(a,b);
        assert(PF.equals(res2, [bigInt(0), bigInt(1)]));
    });
    it("Should div", () => {
        const PF = new PolField(new ZqField(r));

        const a = [bigInt(1), bigInt(2), bigInt(3), bigInt(4), bigInt(5),bigInt(6), bigInt(7)];
        const b = [bigInt(8), bigInt(9), bigInt(10), bigInt(11), bigInt(12), bigInt(13)];

        const c = PF.mul(a,b);
        const d = PF.div(c,b);

        assert(PF.equals(a, d));
    });
    it("Should div big/small", () => {
        const PF = new PolField(new ZqField(r));

        const a = [bigInt(1), bigInt(2), bigInt(3), bigInt(4), bigInt(5),bigInt(6), bigInt(7)];
        const b = [bigInt(8), bigInt(9)];

        const c = PF.mul(a,b);
        const d = PF.div(c,b);

        assert(PF.equals(a, d));
    });
    it("Should div random big", () => {
        const PF = new PolField(new ZqField(r));

        const a = [];
        const b = [];
        for (let i=0; i<1000; i++) a.push(bigInt(Math.floor(Math.random()*100000) -500000));
        for (let i=0; i<900; i++) b.push(bigInt(Math.floor(Math.random()*100000) -500000));

        const c = PF.mul(a,b);

        const d = PF.div(c,b);

        assert(PF.equals(a, d));
    }).timeout(10000);
    it("Should evaluate and zero", () => {
        const PF = new PolField(new ZqField(r));
        const p = [PF.F.neg(bigInt(2)), bigInt(1)];
        const v = PF.eval(p, bigInt(2));
        assert(PF.F.equals(v, bigInt(0)));
    });
    it("Should evaluate bigger number", () => {
        const PF = new PolField(new ZqField(r));
        const p = [bigInt(1), bigInt(2), bigInt(3)];
        const v = PF.eval(p, bigInt(2));
        assert(PF.F.equals(v, bigInt(17)));
    });
    it("Should create lagrange polynomial minmal", () => {
        const PF = new PolField(new ZqField(r));

        const points=[];
        points.push([bigInt(1), bigInt(1)]);
        points.push([bigInt(2), bigInt(2)]);
        points.push([bigInt(3), bigInt(5)]);

        const p=PF.lagrange(points);

        for (let i=0; i<points.length; i++) {
            const v = PF.eval(p, points[i][0]);
            assert(PF.F.equals(v, points[i][1]));
        }
    });
    it("Should create lagrange polynomial", () => {
        const PF = new PolField(new ZqField(r));

        const points=[];
        points.push([bigInt(1), bigInt(2)]);
        points.push([bigInt(2), bigInt(-2)]);
        points.push([bigInt(3), bigInt(0)]);
        points.push([bigInt(4), bigInt(453345)]);

        const p=PF.lagrange(points);

        for (let i=0; i<points.length; i++) {
            const v = PF.eval(p, points[i][0]);
            assert(PF.F.equals(v, points[i][1]));
        }
    });
    it("Should test ruffini", () => {
        const PF = new PolField(new ZqField(r));
        const a = [bigInt(1), bigInt(2), bigInt(3), bigInt(4), bigInt(5),bigInt(6), bigInt(7)];

        const b = PF.mul(a, [bigInt(-7), bigInt(1)]);
        const c = PF.ruffini(b, bigInt(7));

        assert(PF.equals(a, c));
    });
    it("Should test roots", () => {
        const PF = new PolField(new ZqField(r));
        let rt;


        rt = PF.oneRoot(256, 16);
        for (let i=0; i<8; i++) {
            rt = PF.F.mul(rt, rt);
        }
        assert(rt.equals(PF.F.one));

        rt = PF.oneRoot(256, 15);
        for (let i=0; i<8; i++) {
            rt = PF.F.mul(rt, rt);
        }
        assert(rt.equals(PF.F.one));

        rt = PF.oneRoot(8, 3);
        for (let i=0; i<3; i++) {
            rt = PF.F.mul(rt, rt);
        }
        assert(rt.equals(PF.F.one));

        rt = PF.oneRoot(8, 0);
        assert(rt.equals(PF.F.one));

    });
    it("Should create a polynomial with values at roots with fft", () => {
        const PF = new PolField(new ZqField(r));
        const a = [bigInt(1), bigInt(2), bigInt(3), bigInt(4), bigInt(5),bigInt(6), bigInt(7)];

        const p = PF.ifft(a);

        for (let i=0; i<a.length; i++) {
            const s = PF.F.affine(PF.eval(p, PF.oneRoot(8,i)));
            assert(s.equals(a[i]));
        }

    });

});
