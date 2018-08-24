const chai = require("chai");

const bigInt = require("../src/bigint.js");
const BN128 = require("../src/BN128.js");
const F1Field = require("../src/zqfield.js");

const assert = chai.assert;


describe("F1 testing", () => {
    it("Should compute euclidean", () => {
        const F = new F1Field(bigInt(7));
        const res = F.inverse(bigInt(4));

        assert(F.equals(res, bigInt(2)));
    });

    it("Should multiply and divide in F1", () => {
        const bn128 = new BN128();
        const a = bigInt("1");
        const b = bn128.F1.affine(bigInt("-3"));
        const c = bn128.F1.mul(a,b);
        const d = bn128.F1.div(c,b);

        assert(bn128.F1.equals(a, d));
    });
});


describe("Curve G1 Test", () => {
    it("r*one == 0", () => {
        const bn128 = new BN128();

        const res = bn128.G1.mulScalar(bn128.G1.g, bn128.r);

        assert(bn128.G1.equals(res, bn128.G1.zero), "G1 does not have range r");
    });

    it("Should add match in various in G1", () => {

        const bn128 = new BN128();

        const r1 = bigInt(33);
        const r2 = bigInt(44);

        const gr1 = bn128.G1.mulScalar(bn128.G1.g, r1);
        const gr2 = bn128.G1.mulScalar(bn128.G1.g, r2);

        const grsum1 = bn128.G1.add(gr1, gr2);

        const grsum2 = bn128.G1.mulScalar(bn128.G1.g, r1.add(r2));

        assert(bn128.G1.equals(grsum1, grsum2));
    });
});

describe("Curve G2 Test", () => {
    it ("r*one == 0", () => {
        const bn128 = new BN128();

        const res = bn128.G2.mulScalar(bn128.G2.g, bn128.r);

        assert(bn128.G2.equals(res, bn128.G2.zero), "G2 does not have range r");
    });

    it("Should add match in various in G2", () => {
        const bn128 = new BN128();

        const r1 = bigInt(33);
        const r2 = bigInt(44);

        const gr1 = bn128.G2.mulScalar(bn128.G2.g, r1);
        const gr2 = bn128.G2.mulScalar(bn128.G2.g, r2);

        const grsum1 = bn128.G2.add(gr1, gr2);

        const grsum2 = bn128.G2.mulScalar(bn128.G2.g, r1.add(r2));

        /*
        console.log(G2.toString(grsum1));
        console.log(G2.toString(grsum2));
        */

        assert(bn128.G2.equals(grsum1, grsum2));
    });
});

describe("F6 testing", () => {
    it("Should multiply and divide in F6", () => {
        const bn128 = new BN128();
        const a =
            [
                [bigInt("1"), bigInt("2")],
                [bigInt("3"), bigInt("4")],
                [bigInt("5"), bigInt("6")]
            ];
        const b =
            [
                [bigInt("12"), bigInt("11")],
                [bigInt("10"), bigInt("9")],
                [bigInt("8"), bigInt("7")]
            ];
        const c = bn128.F6.mul(a,b);
        const d = bn128.F6.div(c,b);

        assert(bn128.F6.equals(a, d));
    });
});

describe("F12 testing", () => {
    it("Should multiply and divide in F12", () => {
        const bn128 = new BN128();
        const a =
        [
            [
                [bigInt("1"), bigInt("2")],
                [bigInt("3"), bigInt("4")],
                [bigInt("5"), bigInt("6")]
            ],
            [
                [bigInt("7"), bigInt("8")],
                [bigInt("9"), bigInt("10")],
                [bigInt("11"), bigInt("12")]
            ]
        ];
        const b =
        [
            [
                [bigInt("12"), bigInt("11")],
                [bigInt("10"), bigInt("9")],
                [bigInt("8"), bigInt("7")]
            ],
            [
                [bigInt("6"), bigInt("5")],
                [bigInt("4"), bigInt("3")],
                [bigInt("2"), bigInt("1")]
            ]
        ];
        const c = bn128.F12.mul(a,b);
        const d = bn128.F12.div(c,b);

        assert(bn128.F12.equals(a, d));
    });
});

describe("Pairing", () => {
    it("Should match pairing", () => {
        for (let i=0; i<1; i++) {
            const bn128 = new BN128();

            const g1a = bn128.G1.mulScalar(bn128.G1.g, 25);
            const g2a = bn128.G2.mulScalar(bn128.G2.g, 30);

            const g1b = bn128.G1.mulScalar(bn128.G1.g, 30);
            const g2b = bn128.G2.mulScalar(bn128.G2.g, 25);

            const pre1a = bn128.precomputeG1(g1a);
            const pre2a = bn128.precomputeG2(g2a);
            const pre1b = bn128.precomputeG1(g1b);
            const pre2b = bn128.precomputeG2(g2b);

            const r1 = bn128.millerLoop(pre1a, pre2a);
            const r2 = bn128.millerLoop(pre1b, pre2b);

            const rbe = bn128.F12.mul(r1, bn128.F12.inverse(r2));

            const res = bn128.finalExponentiation(rbe);

            assert(bn128.F12.equals(res, bn128.F12.one));
        }
    }).timeout(10000);

});
