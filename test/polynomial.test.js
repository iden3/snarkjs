import assert from "assert";
import {getCurveFromName} from "../src/curves.js";
import {Polynomial} from "../src/polynomial/polynomial.js";

describe("snarkjs: Polynomial tests", function () {
    this.timeout(150000);

    let curve;

    before(async () => {
        curve = await getCurveFromName("bn128");
    });

    after(async () => {
        await curve.terminate();
    });

    it("should return the correct degree", async () => {
        // buffer with no coefficients => degree 0
        let poly = new Polynomial(new Uint8Array(0), curve.Fr);
        assert.equal(0, poly.degree());

        // buffer with one coefficient => degree 0
        poly = new Polynomial(curve.Fr.random(), curve.Fr);
        assert.equal(0, poly.degree());

        //buffer with 2 coefficients => degree 1
        let buff = new Uint8Array(64);
        buff.set(curve.Fr.random(), 0);
        buff.set(curve.Fr.random(), 32);

        poly = new Polynomial(buff, curve.Fr);
        assert.equal(1, poly.degree());

        // buffer with 2 coefficients, the greatest is zero => degree 0
        buff = new Uint8Array(64);
        buff.set(curve.Fr.random(), 0);
        buff.set(curve.Fr.zero, 32);

        poly = new Polynomial(buff, curve.Fr);
        assert.equal(0, poly.degree());

        // buffer with 3 coefficients, the two greatests iare zero => degree 0
        buff = new Uint8Array(96);
        buff.set(curve.Fr.random(), 0);
        buff.set(curve.Fr.zero, 32);
        buff.set(curve.Fr.zero, 64);

        poly = new Polynomial(buff, curve.Fr);
        assert.equal(0, poly.degree());

        // buffer with 3 coefficients, the greatest is different thn zero => degree 2
        buff.set(curve.Fr.one, 64);

        poly = new Polynomial(buff, curve.Fr);
        assert.equal(2, poly.degree());
    });

    it("should split a polynomial", async () => {
        const Fr = curve.Fr;

        const degree = 15;
        const numPols = 4;
        const degPols = 3;

        // buffer with no coefficients => degree 0
        let buff = new Uint8Array((degree + 1) * Fr.n8);
        for (let i = 0; i < degree + 1; i++) {
            buff.set(Fr.e(i + 1), i * Fr.n8);
        }
        let poly = new Polynomial(buff, Fr);

        let pols = poly.split(numPols, degPols, [Fr.one, Fr.one, Fr.one, Fr.one]);

        for (let i = 0; i < numPols; i++) {
            if(i===numPols-1) {
                assert(pols[i].degree() === degPols);
            } else {
                assert(pols[i].degree() === degPols + 1);
            }
        }



    });
});