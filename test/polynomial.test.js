import assert from "assert";
import {getCurveFromName} from "../src/curves.js";
import {Polynomial} from "../src/polynomial/polynomial.js";
import {getRandomBuffer, getRandomValue} from "./test.utils.js";

function radomPolynomial(maxDegree, curve) {
    const degree = getRandomValue(maxDegree);

    return new Polynomial(getRandomBuffer(degree + 1, curve.Fr), curve);
}

describe("snarkjs: Polynomial tests", function () {
    this.timeout(150000);

    let curve;
    let sFr;

    before(async () => {
        curve = await getCurveFromName("bn128");
        sFr = curve.Fr.n8;
    });

    after(async () => {
        await curve.terminate();
    });

    // TODO test divByXValue(value)
    // TODO test divZh(domainSize)

    it("should return the correct degree", async () => {
        // buffer with no coefficients => degree 0
        let poly = new Polynomial(new Uint8Array(0), curve);
        assert.equal(0, poly.degree());

        // buffer with one coefficient => degree 0
        poly = new Polynomial(curve.Fr.random(), curve);
        assert.equal(0, poly.degree());

        //buffer with 2 coefficients => degree 1
        let buff = new Uint8Array(64);
        buff.set(curve.Fr.random(), 0);
        buff.set(curve.Fr.random(), 32);

        poly = new Polynomial(buff, curve);
        assert.equal(1, poly.degree());

        // buffer with 2 coefficients, the greatest is zero => degree 0
        buff = new Uint8Array(64);
        buff.set(curve.Fr.random(), 0);
        buff.set(curve.Fr.zero, 32);

        poly = new Polynomial(buff, curve);
        assert.equal(0, poly.degree());

        // buffer with 3 coefficients, the two greatests iare zero => degree 0
        buff = new Uint8Array(96);
        buff.set(curve.Fr.random(), 0);
        buff.set(curve.Fr.zero, 32);
        buff.set(curve.Fr.zero, 64);

        poly = new Polynomial(buff, curve);
        assert.equal(0, poly.degree());

        // buffer with 3 coefficients, the greatest is different thn zero => degree 2
        buff.set(curve.Fr.one, 64);

        poly = new Polynomial(buff, curve);
        assert.equal(2, poly.degree());
    });

    it("should check if two polynomials are equal", async () => {
        const Fr = curve.Fr;

        const pol1 = radomPolynomial(30, curve);

        assert(pol1.isEqual(pol1));

        const cloneBuff = Uint8Array.from(pol1.coef);
        const pol2 = new Polynomial(cloneBuff, curve);

        assert(pol1.isEqual(pol2));

        const buffer = new Uint8Array((pol1.length() + 1) * Fr.n8);
        buffer.set(pol1.coef.slice(), 0);
        const pol3 = new Polynomial(buffer, curve);

        assert(pol1.isEqual(pol3));

        buffer.set(Fr.one, 0);
        const pol4 = new Polynomial(buffer, curve);

        assert(!pol1.isEqual(pol4));
    });

    // TODO test blindCoefficients(blindingFactors)
    it("it should blind coefficients", async () => {
        /*        const length = getRandomValue();

                const buffer = new Uint8Array(length * sFr);
                for (let i = 0; i < length; i++) {
                    buffer[i] = curve.Fr.e(i);
                }

                const polynomial = await Polynomial.fromBuffer(buffer, curve.Fr);
                for (let i = 0; i < length; i++) {
                    //assert.deepEqual(buffer[i], polynomial.coef.slice(i * sFr, (i + 1) * sFr));
                }*/
    });


    it("should get the correct coefficient", async () => {
        const polynomial = radomPolynomial(30, curve);

        for (let i = 0; i < polynomial.length(); i++) {
            const coef = polynomial.coef.slice(i * sFr, (i + 1) * sFr);
            assert.deepEqual(coef, polynomial.getCoef(i));
        }
    });

    it("should get the correct length", async () => {
        const length = getRandomValue(30);

        const buffer = new Uint8Array(length * sFr);
        for (let i = 0; i < length; i++) {
            buffer[i] = curve.Fr.e(i);
        }

        const polynomial = new Polynomial(buffer, curve);
        assert.equal(length, polynomial.length());
    });

    it("should evaluate a polynomial", async () => {
        let buffer = new Uint8Array(4 * curve.Fr.n8);
        for (let i = 0; i < 4; i++) {
            buffer.set(curve.Fr.e(i), i * curve.Fr.n8);
        }
        const polynomial = new Polynomial(buffer, curve);
        assert.deepEqual(polynomial.evaluate(curve.Fr.two), curve.Fr.e(34));
    });

    it("should add a polynomial", async () => {
        const polynomial1 = radomPolynomial(30, curve);
        const polynomial2 = radomPolynomial(30, curve);
        const l1 = polynomial1.length();
        const l2 = polynomial2.length();
        const clone1 = Uint8Array.from(polynomial1.coef);
        const clone2 = Uint8Array.from(polynomial2.coef);

        const blindingValue = curve.Fr.random();
        polynomial1.add(polynomial2, blindingValue);

        for (let i = 0; i < polynomial1.length(); i++) {
            const val1 = i < l1 ? clone1.slice(i * sFr, (i + 1) * sFr) : curve.Fr.zero;
            const val2 = i < l2 ? clone2.slice(i * sFr, (i + 1) * sFr) : curve.Fr.zero;
            const val2b = curve.Fr.mul(val2, blindingValue);

            const pol1 = polynomial1.getCoef(i);
            assert.deepEqual(pol1, curve.Fr.add(val1, val2b));
        }
    });

    it("should sub a polynomial", async () => {
        const polynomial1 = radomPolynomial(30, curve);
        const polynomial2 = radomPolynomial(30, curve);
        const l1 = polynomial1.length();
        const l2 = polynomial2.length();
        const clone1 = Uint8Array.from(polynomial1.coef);
        const clone2 = Uint8Array.from(polynomial2.coef);

        const blindingValue = curve.Fr.random();
        polynomial1.sub(polynomial2, blindingValue);

        for (let i = 0; i < polynomial1.length(); i++) {
            const val1 = i < l1 ? clone1.slice(i * sFr, (i + 1) * sFr) : curve.Fr.zero;
            const val2 = i < l2 ? clone2.slice(i * sFr, (i + 1) * sFr) : curve.Fr.zero;
            const val2b = curve.Fr.mul(val2, blindingValue);

            const pol1 = polynomial1.getCoef(i);
            assert.deepEqual(pol1, curve.Fr.sub(val1, val2b));
        }
    });

    it("should mul a polynomial with a scalar", async () => {
        const polynomial1 = radomPolynomial(30, curve);
        const clone1 = Uint8Array.from(polynomial1.coef);
        const scalar = curve.Fr.random();

        polynomial1.mulScalar(scalar);

        for (let i = 0; i < polynomial1.length(); i++) {
            const val = curve.Fr.mul(clone1.slice(i * sFr, (i + 1) * sFr), scalar);
            assert.deepEqual(polynomial1.getCoef(i), val);
        }
    });

    it("should add a scalar", async () => {
        const polynomial1 = radomPolynomial(30, curve);
        const clone1 = Uint8Array.from(polynomial1.coef);
        const scalar = curve.Fr.random();

        polynomial1.addScalar(scalar);

        assert(polynomial1.getCoef(0), curve.Fr.add(clone1.slice(0, sFr), scalar));
        for (let i = 1; i < polynomial1.length(); i++) {
            assert.deepEqual(polynomial1.getCoef(i), clone1.slice(i * sFr, (i + 1) * sFr));
        }
    });

    it("should sub a scalar", async () => {
        const polynomial1 = radomPolynomial(30, curve);
        const clone1 = Uint8Array.from(polynomial1.coef);
        const scalar = curve.Fr.random();

        polynomial1.subScalar(scalar);

        assert(polynomial1.getCoef(0), curve.Fr.sub(clone1.slice(0, sFr), scalar));
        for (let i = 1; i < polynomial1.length(); i++) {
            assert.deepEqual(polynomial1.getCoef(i), clone1.slice(i * sFr, (i + 1) * sFr));
        }
    });

    it("should divide by a polynomial", async () => {
        const Fr = curve.Fr;

        // Dividend: 2x^3 - 3x^2 + 2
        // Divisor:   x^2 + 3x
        // Quotient:   2x - 9
        // Remainder:  27x + 2
        const polDividend = Polynomial.fromCoefficientsArray([Fr.e(2), Fr.e(0), Fr.e(-3), Fr.e(2)], curve);
        const polDivisor = Polynomial.fromCoefficientsArray([Fr.e(0), Fr.e(3), Fr.one], curve);
        const polQuotient = Polynomial.fromCoefficientsArray([Fr.e(-9), Fr.e(2)], curve);
        const polRemainder = Polynomial.fromCoefficientsArray([Fr.e(2), Fr.e(27)], curve);

        const polR = polDividend.divBy(polDivisor);

        assert(polDividend.isEqual(polQuotient));
        assert(polRemainder.isEqual(polR));
    });

    it("should divide by (X^m - y)", async () => {
        const Fr = curve.Fr;

        const polDividend = Polynomial.fromCoefficientsArray(
            [Fr.e(-14),Fr.e(-2),Fr.e(3),Fr.e(-5),Fr.e(-6),Fr.e(-7),Fr.e(-8),Fr.e(-9),Fr.e(-10),Fr.e(-11),
                Fr.e(-12),Fr.e(-13),Fr.e(-14),Fr.e(-15),Fr.e(-16),Fr.e(-17),Fr.e(-18),Fr.e(15),Fr.e(16)], curve);
        const polQuotient = Polynomial.fromCoefficientsArray(
            [Fr.e(7), Fr.e(1), Fr.e(2), Fr.e(3), Fr.e(4), Fr.e(5), Fr.e(6), Fr.e(7), Fr.e(8),
                Fr.e(9), Fr.e(10), Fr.e(11), Fr.e(12), Fr.e(13),Fr.e(14),Fr.e(15),Fr.e(16)], curve);

        polDividend.divByVanishing(2, Fr.e(2));

        assert(polDividend.isEqual(polQuotient));
    });

    it("should multiply by (X-value)", async () => {
        const Fr = curve.Fr;
        const pol = Polynomial.fromCoefficientsArray([Fr.e(4), Fr.e(-3), Fr.e(7)], curve);
        const polResult = Polynomial.fromCoefficientsArray([Fr.e(-24), Fr.e(22), Fr.e(-45), Fr.e(7)], curve);
        pol.byXSubValue(Fr.e(6));

        assert(pol.isEqual(polResult));
    });

    it("should multiply by X", async () => {
        const length = getRandomValue(30);

        const buffer = new Uint8Array(length * sFr);
        for (let i = 0; i < length; i++) {
            buffer[i] = curve.Fr.e(i);
        }

        const polynomial = new Polynomial(buffer, curve);
        const clone = Uint8Array.from(polynomial.coef);

        assert.equal(length, polynomial.length());

        polynomial.byX();

        assert.equal(length + 1, polynomial.length());

        assert.deepEqual(polynomial.getCoef(0), curve.Fr.zero);
        for (let i = 1; i < polynomial.length(); i++) {
            const i_sFr = (i - 1) * curve.Fr.n8;
            assert.deepEqual(polynomial.getCoef(i), clone.slice(i_sFr, i_sFr + curve.Fr.n8));
        }
    });

    it("should exp a polynomial", async () => {
        const Fr = curve.Fr;

        // f(x)   = 3 + 7x + 11x^3
        // f(x^3) = 3 + 7x^3 + 11x^9
        const exponent = 3;
        let pol = Polynomial.fromCoefficientsArray([Fr.e(3), Fr.e(7), Fr.zero, Fr.e(11), Fr.zero], curve);

        let polExp = await Polynomial.expX(pol, exponent);

        assert.deepEqual(polExp.length(), 13);

        let polResult = Polynomial.fromCoefficientsArray(
            [Fr.e(3), Fr.zero, Fr.zero, Fr.e(7), Fr.zero, Fr.zero,
                Fr.zero, Fr.zero, Fr.zero, Fr.e(11), Fr.zero, Fr.zero, Fr.zero], curve);

        assert(polExp.isEqual(polResult));

        polExp = await Polynomial.expX(pol, exponent, true);

        polResult = Polynomial.fromCoefficientsArray(
            [Fr.e(3), Fr.zero, Fr.zero, Fr.e(7), Fr.zero, Fr.zero, Fr.zero, Fr.zero, Fr.zero, Fr.e(11)], curve);

        assert.deepEqual(polExp.length(), 10);

        assert(polExp.isEqual(polResult));
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
        let poly = new Polynomial(buff, curve);

        let pols = poly.split(numPols, degPols, [Fr.one, Fr.one, Fr.one, Fr.one]);

        for (let i = 0; i < numPols; i++) {
            if (i === numPols - 1) {
                assert(pols[i].degree() === degPols);
            } else {
                assert(pols[i].degree() === degPols + 1);
            }
        }
    });

    it("should truncate a polynomial", async () => {
        const random1 = getRandomValue(20);
        const random2 = getRandomValue(30);

        let buffer = new Uint8Array((random1 + random2) * curve.Fr.n8);
        for (let i = 0; i < random1; i++) {
            buffer.set(curve.Fr.e(i), i * curve.Fr.n8);
        }
        for (let i = random1; i < (random1 + random2); i++) {
            buffer.set(curve.Fr.zero, i * curve.Fr.n8);
        }

        const polynomial = new Polynomial(buffer, curve);
        assert.equal(polynomial.length(), random1 + random2);

        polynomial.truncate();
        assert.equal(polynomial.length(), random1);
    });

    it("should interpolate a polynomial using Lagrange Interpolation", async () => {
        const Fr = curve.Fr;

        const polynomial = Polynomial.fromCoefficientsArray(
            [Fr.div(Fr.e(14), Fr.e(2)), Fr.div(Fr.e(-11), Fr.e(2)), Fr.div(Fr.e(3), Fr.e(2))], curve);

        let polynomial2 = Polynomial.lagrangePolynomialInterpolation([Fr.e(2), Fr.e(3), Fr.e(1)],
            [Fr.e(2), Fr.e(4), Fr.e(3)], curve);

        assert.equal(polynomial.degree(), polynomial2.degree());
        assert(polynomial.isEqual(polynomial2));
    });

    it("should compute a zerofier polynomial", async () => {
        const Fr = curve.Fr;

        const coefArray = [Fr.e(-6), Fr.e(11), Fr.e(-6), Fr.one];

        const polynomial = Polynomial.zerofierPolynomial([Fr.one, Fr.two, Fr.e(3)], curve);
        const polynomial2 = Polynomial.fromCoefficientsArray(coefArray, curve);

        assert.equal(polynomial.degree(), polynomial2.degree());
        assert(polynomial.isEqual(polynomial2));
    });

});