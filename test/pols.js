const chai = require("chai");

const bigInt = require("../src/bigint.js");
const PolField = require("../src/polfield.js");

const assert = chai.assert;

const r  = bigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");

describe("Polinomial field", () => {
    it("Should compute a multiplication", () => {
        const PF = new PolField(r);

        const a = [bigInt(1), bigInt(2), bigInt(3)];
        const b = [bigInt(1), bigInt(2), bigInt(3)];
        const res = PF.mul(a,b);

        assert(PF.equals(res, [bigInt(1), bigInt(4), bigInt(10), bigInt(12), bigInt(9)]));
    });
    it("Should compute a multiplication 2", () => {
        const PF = new PolField(r);

        const a = [bigInt(5), bigInt(1)];
        const b = [bigInt(-5), bigInt(1)];
        const res = PF.mul(a,b);

        assert(PF.equals(res, [bigInt(-25), bigInt(0), bigInt(1)]));
    });
    it("Should compute an addition", () => {
        const PF = new PolField(r);

        const a = [bigInt(5), bigInt(1)];
        const b = [bigInt(-5), bigInt(1)];
        const res = PF.add(a,b);

        assert(PF.equals(res, [bigInt(0), bigInt(2)]));
    });
    it("Should compute a substraction", () => {
        const PF = new PolField(r);

        const a = [bigInt(5), bigInt(3), bigInt(4)];
        const b = [bigInt(5), bigInt(1)];
        const res = PF.sub(a,b);

        assert(PF.equals(res, [bigInt(0), bigInt(2), bigInt(4)]));
    });
    it("Should compute reciprocal", () => {
        const PF = new PolField(r);

        const a = [bigInt(4), bigInt(1), bigInt(-3), bigInt(-1), bigInt(2),bigInt(1), bigInt(-1), bigInt(1)];
        const res = PF._reciprocal(a, 3, 0);

        assert(PF.equals(res, [bigInt(12), bigInt(15), bigInt(3), bigInt(-4), bigInt(-3), bigInt(0), bigInt(1), bigInt(1)]));
    });
    it("Should div2", () => {
        const PF = new PolField(r);

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
        const PF = new PolField(r);

        const a = [bigInt(1), bigInt(2), bigInt(3), bigInt(4), bigInt(5),bigInt(6), bigInt(7)];
        const b = [bigInt(8), bigInt(9), bigInt(10), bigInt(11), bigInt(12), bigInt(13)];

        const c = PF.mul(a,b);
        const d = PF.div(c,b);

        assert(PF.equals(a, d));
    });

    it("Should div big/small", () => {
        const PF = new PolField(r);

        const a = [bigInt(1), bigInt(2), bigInt(3), bigInt(4), bigInt(5),bigInt(6), bigInt(7)];
        const b = [bigInt(8), bigInt(9)];

        const c = PF.mul(a,b);
        const d = PF.div(c,b);

        assert(PF.equals(a, d));
    });
    it("Should div random big", () => {
        const PF = new PolField(r);

        const a = [];
        const b = [];
        for (let i=0; i<1000; i++) a.push(bigInt(Math.floor(Math.random()*100000) -500000));
        for (let i=0; i<300; i++) b.push(bigInt(Math.floor(Math.random()*100000) -500000));

        const c = PF.mul(a,b);

        const d = PF.div(c,b);

        assert(PF.equals(a, d));
    }).timeout(10000000);

});
