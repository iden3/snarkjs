import { CPolynomial } from "../src/polynomial/cpolynomial.js";
import { Polynomial } from "../src/polynomial/polynomial.js";
import { getCurveFromName } from "../src/curves.js";
import assert from "assert";

// CPolynomial combines n polynomials into one by interleaving coefficients
// (used by fflonk's C0/C1/C2 composition).
describe("CPolynomial", function () {

    let curve, Fr;

    beforeAll(async () => {
        curve = await getCurveFromName("bn128");
        Fr = curve.Fr;
    });

    afterAll(async () => {
        await curve.terminate();
    });

    it("rejects a polynomial at a position beyond n-1", () => {
        const c = new CPolynomial(2, curve);
        const pol = Polynomial.fromCoefficientsArray([Fr.e(1)], curve);
        assert.throws(() => c.addPolynomial(2, pol), /position greater than n-1/);
    });

    it("computes degree and composition with empty slots", () => {
        const c = new CPolynomial(2, curve);
        // slot 1 filled, slot 0 left undefined. Degree 3 keeps the composed
        // degree (3*2+1 = 7) inside getPolynomial's power-of-two allocation,
        // matching how fflonk uses the class.
        const pol = Polynomial.fromCoefficientsArray([Fr.e(5), Fr.e(7), Fr.e(9), Fr.e(11)], curve);
        c.addPolynomial(1, pol);

        // degree = polDegree * n + index = 3*2 + 1
        assert.strictEqual(c.degree(), 7);

        const composed = c.getPolynomial();
        // composed(x) has pol's coefficients at positions i*n + 1
        assert.deepEqual(composed.getCoef(1), Fr.e(5));
        assert.deepEqual(composed.getCoef(3), Fr.e(7));
        assert.deepEqual(composed.getCoef(5), Fr.e(9));
        assert.deepEqual(composed.getCoef(7), Fr.e(11));
        assert.deepEqual(composed.getCoef(0), Fr.zero);
    });
});
