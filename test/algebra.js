const F1Field = require("../src/f1field.js");
const GCurve = require("../src/gcurve.js");
const constants = require("../src/constants.js");
const chai = require('chai');

const assert = chai.assert;

describe("Curve G1 Test", () => {

    it ("r*one == 0", () => {
        const F1 = new F1Field(constants.q);
        const G1 = new GCurve(F1, constants.g1);

        const res = G1.mulEscalar(G1.g, constants.r);

        assert(G1.equals(res, G1.zero), "G1 does not have range r");
    });

    it("Should add match in various", () => {
        const F1 = new F1Field(constants.q);
        const G1 = new GCurve(F1, constants.g1);

        const r1 = F1.e(33);
        const r2 = F1.e(44);

        const gr1 = G1.mulEscalar(G1.g, r1);
        const gr2 = G1.mulEscalar(G1.g, r2);

        const grsum1 = G1.add(gr1, gr2);

        const grsum2 = G1.mulEscalar(G1.g, r1.add(r2));

        assert(G1.equals(grsum1, grsum2));
    });
});
