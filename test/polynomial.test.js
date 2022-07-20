
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
        let poly = new Polynomial([], [], curve.Fr);
        assert.equal(0, poly.degree());

        // buffer with one coefficient => degree 0
        poly = new Polynomial(curve.Fr.random(), [], curve.Fr);
        assert.equal(0, poly.degree());

        //buffer with 2 coefficients => degree 1
        let buff = new Uint32Array(64);
        buff.set(curve.Fr.random(), 0);
        buff.set(curve.Fr.random(), 32);

        poly = new Polynomial(buff, [], curve.Fr);
        assert.equal(1, poly.degree());

        // buffer with 2 coefficients, the greatest is zero => degree 0
        buff = new Uint32Array(64);
        buff.set(curve.Fr.random(), 0);
        buff.set(curve.Fr.zero, 32);

        poly = new Polynomial(buff, [], curve.Fr);
        assert.equal(0, poly.degree());

        // buffer with 3 coefficients, the two greatests iare zero => degree 0
        buff = new Uint32Array(96);
        buff.set(curve.Fr.random(), 0);
        buff.set(curve.Fr.zero, 32);
        buff.set(curve.Fr.zero, 64);

        poly = new Polynomial(buff, [], curve.Fr);
        assert.equal(0, poly.degree());

        // buffer with 3 coefficients, the greatest is different thn zero => degree 2
        buff.set(curve.Fr.one, 64);

        poly = new Polynomial(buff, [], curve.Fr);
        assert.equal(2, poly.degree());
    });
});