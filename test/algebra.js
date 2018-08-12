const bigInt = require("big-integer");
const F1Field = require("../src/f1field.js");
const F2Field = require("../src/f2field.js");
const GCurve = require("../src/gcurve.js");
const constants = require("../src/constants.js");
const chai = require("chai");

const assert = chai.assert;

describe("Curve G1 Test", () => {
    it ("r*one == 0", () => {
        const F1 = new F1Field(constants.q);
        const G1 = new GCurve(F1, constants.g1);

        const res = G1.mulEscalar(G1.g, constants.r);

        assert(G1.equals(res, G1.zero), "G1 does not have range r");
    });

    it("Should add match in various in G1", () => {
        const F1 = new F1Field(constants.q);
        const G1 = new GCurve(F1, constants.g1);

        const r1 = bigInt(33);
        const r2 = bigInt(44);

        const gr1 = G1.mulEscalar(G1.g, r1);
        const gr2 = G1.mulEscalar(G1.g, r2);

        const grsum1 = G1.add(gr1, gr2);

        const grsum2 = G1.mulEscalar(G1.g, r1.add(r2));

        assert(G1.equals(grsum1, grsum2));
    });
});

describe("Curve G2 Test", () => {
    it ("r*one == 0", () => {
        const F1 = new F1Field(constants.q);
        const F2 = new F2Field(F1, constants.f2nonResidue);
        const G2 = new GCurve(F2, constants.g2);

        const res = G2.mulEscalar(G2.g, constants.r);

        assert(G2.equals(res, G2.zero), "G2 does not have range r");
    });

    it("Should add match in various in G2", () => {
        const F1 = new F1Field(constants.q);
        const F2 = new F2Field(F1, constants.f2nonResidue);
        const G2 = new GCurve(F2, constants.g2);

        const r1 = bigInt(33);
        const r2 = bigInt(44);

        const gr1 = G2.mulEscalar(G2.g, r1);
        const gr2 = G2.mulEscalar(G2.g, r2);

        const grsum1 = G2.add(gr1, gr2);

        const grsum2 = G2.mulEscalar(G2.g, r1.add(r2));

        /*
        console.log(G2.toString(grsum1));
        console.log(G2.toString(grsum2));
        */

        assert(G2.equals(grsum1, grsum2));
    });

});
