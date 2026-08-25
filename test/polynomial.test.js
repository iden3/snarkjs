import assert from "assert";
import {getCurveFromName} from "../src/curves.js";
import {Polynomial} from "../src/polynomial/polynomial.js";
import {Evaluations} from "../src/polynomial/evaluations.js";
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

        // buffer with 3 coefficients, the two greatest are zero => degree 0
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

    it("should return an identical copy when exp'ing a polynomial with n = 1", async () => {
        // Regression test: expX(pol, 1) used to reference an undefined
        // variable (ReferenceError), then briefly returned
        // fromEvaluations(coef) -- an IFFT of the coefficients -- instead of
        // f(x^1) = f(x).
        const Fr = curve.Fr;

        const pol = Polynomial.fromCoefficientsArray([Fr.e(3), Fr.e(7), Fr.zero, Fr.e(11)], curve);
        const polExp = await Polynomial.expX(pol, 1);

        assert(polExp !== pol, "expX must return a new polynomial, not the input");
        assert(polExp.coef !== pol.coef, "expX must not share the coefficient buffer");
        assert(polExp.isEqual(pol));
    });

    it("should throw when exp'ing a polynomial with n < 1", async () => {
        const Fr = curve.Fr;
        const pol = Polynomial.fromCoefficientsArray([Fr.e(3), Fr.e(7)], curve);

        for (const n of [0, -1]) {
            await assert.rejects(Polynomial.expX(pol, n));
        }
    });

    it("should fast evaluate a polynomial to the same value as evaluate", () => {
        const pol = radomPolynomial(60, curve);
        const point = curve.Fr.random();

        assert.deepEqual(pol.fastEvaluate(point), pol.evaluate(point));
    });

    it("should multiply by (X^n + value) consistently with evaluation", () => {
        const Fr = curve.Fr;
        const q = radomPolynomial(15, curve);
        const p = Polynomial.fromPolynomial(q, curve);
        const n = 3;
        const value = Fr.random();
        const x = Fr.random();

        p.byXNSubValue(n, value);

        // p(x) must equal q(x)·(x^n + value)
        const expected = Fr.mul(q.evaluate(x), Fr.add(Fr.exp(x, n), value));
        assert.deepEqual(p.evaluate(x), expected);
        assert.equal(p.degree(), q.degree() + n);
    });

    it("should divide exactly by (X^m - beta) using divByMonic", () => {
        const Fr = curve.Fr;
        // Fixed length: divByMonic's chunked recurrence needs deg >= 2m
        const q = new Polynomial(getRandomBuffer(13, Fr), curve);
        q.setCoef(q.length() - 1, Fr.one);
        const m = 4;
        const beta = Fr.random();

        // p = q·(X^m - beta), then divByMonic must recover q
        const p = Polynomial.fromPolynomial(q, curve);
        p.byXNSubValue(m, Fr.neg(beta));
        p.divByMonic(m, beta);

        assert(p.isEqual(q));
    });

    it("should divide by (X^n - beta) with divByVanishing and satisfy p = q·d + r", () => {
        const Fr = curve.Fr;
        const n = 4;
        const beta = Fr.random();
        const x = Fr.random();

        // Fixed length so the degree is always >= n and the division is legal
        const p = new Polynomial(getRandomBuffer(21, Fr), curve);
        p.setCoef(p.length() - 1, Fr.one);
        const P = Polynomial.fromPolynomial(p, curve);

        const r = p.divByVanishing(n, beta); // p becomes the quotient q

        const divisorAtX = Fr.sub(Fr.exp(x, n), beta);
        const lhs = P.evaluate(x);
        const rhs = Fr.add(Fr.mul(p.evaluate(x), divisorAtX), r.evaluate(x));
        assert.deepEqual(lhs, rhs);

        // Exact division: p = q·(X^n - beta) has a zero remainder
        const q2 = new Polynomial(getRandomBuffer(13, Fr), curve);
        const p2 = Polynomial.fromPolynomial(q2, curve);
        p2.byXNSubValue(n, Fr.neg(beta));
        const r2 = p2.divByVanishing(n, beta);
        assert(p2.isEqual(q2));
        assert.equal(r2.degree(), 0);
        assert.deepEqual(r2.getCoef(0), Fr.zero);
    });

    it("should throw when divByVanishing divisor degree exceeds the dividend", () => {
        const pol = Polynomial.fromCoefficientsArray([curve.Fr.e(1), curve.Fr.e(2)], curve);
        assert.throws(() => pol.divByVanishing(5, curve.Fr.one));
    });

    it("should divide by a product of (X^mi - betai) with fastDivByVanishing", () => {
        const Fr = curve.Fr;
        const data = [[4, Fr.random()], [2, Fr.random()]];

        // Deterministic degrees (the chunked algorithm's control flow depends
        // on the length), random coefficients.
        for (const len of [24, 31, 41]) {
            const q = new Polynomial(getRandomBuffer(len, Fr), curve);
            q.setCoef(len - 1, Fr.one);
            const p = Polynomial.fromPolynomial(q, curve);
            for (const [m, beta] of data) p.byXNSubValue(m, Fr.neg(beta));

            p.fastDivByVanishing(data);

            const x = Fr.random();
            assert.deepEqual(p.evaluate(x), q.evaluate(x), `len=${len}`);
        }

        const small = Polynomial.fromCoefficientsArray([Fr.e(1), Fr.e(2)], curve);
        assert.throws(() => small.fastDivByVanishing([[5, Fr.one]]));
    });

    it("should divide by (X - value) with divByXSubValue and throw when not divisible", () => {
        const Fr = curve.Fr;
        const value = Fr.random();

        const q = radomPolynomial(10, curve);
        q.setCoef(q.length() - 1, Fr.one);
        const p = Polynomial.fromPolynomial(q, curve);
        p.byXSubValue(value);
        p.divByXSubValue(value);
        assert(p.isEqual(q));

        // A polynomial with a nonzero remainder at `value` must be rejected
        const bad = Polynomial.fromCoefficientsArray([Fr.e(1), Fr.e(1)], curve);
        assert.throws(() => bad.divByXSubValue(Fr.e(5)), /does not divide/);
    });

    it("should divide by a zerofier for generic beta and the beta = 1 / -1 fast paths", () => {
        const Fr = curve.Fr;
        const n = 4;

        for (const beta of [Fr.random(), Fr.one, Fr.negone]) {
            const q = new Polynomial(getRandomBuffer(14, Fr), curve);
            q.setCoef(q.length() - 1, Fr.one);
            const p = Polynomial.fromPolynomial(q, curve);
            p.byXNSubValue(n, Fr.neg(beta));
            p.divByZerofier(n, beta);

            const x = Fr.random();
            assert.deepEqual(p.evaluate(x), q.evaluate(x));
        }

        // Not divisible: high coefficients don't cancel. Fixed length so the
        // high-coefficient check always has nonzero terms to reject.
        const bad = new Polynomial(getRandomBuffer(12, Fr), curve);
        bad.setCoef(bad.length() - 1, Fr.one);
        assert.throws(() => bad.divByZerofier(n, Fr.random()), /not divisible/);
    });

    it("should extend evaluations to the 4n domain with to4T, applying blinding", async () => {
        const Fr = curve.Fr;
        const domainSize = 8;

        const coefsArr = [];
        for (let i = 0; i < domainSize; i++) coefsArr.push(Fr.e(i + 1));
        const pol = Polynomial.fromCoefficientsArray(coefsArr, curve);
        const evals = await Fr.fft(pol.coef.slice());

        // Without blinding factors: [coefficients, 4n evaluations]
        const [a, A4] = await Polynomial.to4T(evals, domainSize, [], Fr);
        assert(new Polynomial(a, curve).isEqual(pol));
        assert.equal(A4.byteLength, domainSize * 4 * Fr.n8);

        // With one blinding factor b: result is p(X) + b·(X^n - 1)
        const b = Fr.random();
        const [a1] = await Polynomial.to4T(evals, domainSize, [b], Fr);
        const blinded = new Polynomial(a1, curve);
        const x = Fr.random();
        const expected = Fr.add(pol.evaluate(x), Fr.mul(b, Fr.sub(Fr.exp(x, domainSize), Fr.one)));
        assert.deepEqual(blinded.evaluate(x), expected);
    });

    it("should throw when setting a coefficient out of range", () => {
        const pol = Polynomial.fromCoefficientsArray([curve.Fr.e(1), curve.Fr.e(2)], curve);
        assert.throws(() => pol.setCoef(2, curve.Fr.one), /not available/);
        // getCoef beyond the buffer returns zero instead
        assert.deepEqual(pol.getCoef(100), curve.Fr.zero);
    });

    it("should warn (via logger) on a zero-length polynomial", () => {
        const warnings = [];
        const logger = { warn: (m) => warnings.push(m), info() {}, debug() {}, error() {} };
        const pol = new Polynomial(new Uint8Array(0), curve, logger);
        assert.equal(pol.length(), 0);
        assert.equal(warnings.length, 1);
    });

    it("should print a polynomial (console silenced)", () => {
        const Fr = curve.Fr;
        const pol = Polynomial.fromCoefficientsArray([Fr.e(3), Fr.neg(Fr.e(2)), Fr.zero, Fr.e(1)], curve);
        const lines = [];
        const origLog = console.log;
        console.log = (m) => lines.push(m);
        try {
            pol.print();
        } finally {
            console.log = origLog;
        }
        assert.equal(lines.length, 1);
        assert(lines[0].includes("x"));
    });

    it("Evaluations extends a polynomial onto the 4n domain and bounds-checks reads", async () => {
        const Fr = curve.Fr;
        const pol = Polynomial.fromCoefficientsArray([Fr.e(1), Fr.e(2), Fr.e(3), Fr.e(4)], curve);

        const evals = await Evaluations.fromPolynomial(pol, 4, curve);
        assert.equal(evals.length(), 16);
        // The first FFT evaluation is P(omega^0) = P(1)
        assert.deepEqual(evals.getEvaluation(0), pol.evaluate(Fr.one));
        assert.throws(() => evals.getEvaluation(1000), /out of bounds/);

        // A zero-length evaluations buffer warns through the logger
        const warnings = [];
        const ev0 = new Evaluations(new Uint8Array(0), curve, { warn: (m) => warnings.push(m) });
        assert.equal(ev0.length(), 0);
        assert.equal(warnings.length, 1);
    });

    it("should commit a polynomial with multiExponentiation", async () => {
        const Fr = curve.Fr;
        const G1 = curve.G1;
        const nCoefs = 4;

        // PTau = [G, 2G, 3G, 4G] in LEM form
        const sG1 = G1.F.n8 * 2;
        const PTau = new Uint8Array(nCoefs * sG1);
        const points = [];
        for (let i = 0; i < nCoefs; i++) {
            const P = G1.timesScalar(G1.g, i + 1);
            points.push(P);
            G1.toRprLEM(PTau, i * sG1, P);
        }

        const coefsArr = [];
        for (let i = 0; i < nCoefs; i++) coefsArr.push(Fr.e(i + 7));
        const pol = Polynomial.fromCoefficientsArray(coefsArr, curve);

        const commitment = await pol.multiExponentiation(PTau, "test");

        let expected = G1.zero;
        for (let i = 0; i < nCoefs; i++) {
            expected = G1.add(expected, G1.timesFr(points[i], coefsArr[i]));
        }
        assert(G1.eq(commitment, expected));
    });

    it("routes large polynomials through the BigBuffer backends (> 2^15 coefficients)", async function () {
        this.timeout(120000);
        const Fr = curve.Fr;
        const BIG = (2 << 14) + 10; // just over the Uint8Array/BigBuffer threshold

        const big = new Polynomial(getRandomBuffer(BIG, Fr), curve);
        big.setCoef(BIG - 1, Fr.one);
        const x = Fr.random();
        const atX = big.evaluate(x);

        // fromPolynomial / fromCoefficientsArray big paths
        const copy = Polynomial.fromPolynomial(big, curve);
        assert.deepEqual(copy.evaluate(x), atX);
        const arrBig = new Array(BIG).fill(Fr.zero);
        arrBig[0] = Fr.e(7);
        assert.deepEqual(Polynomial.fromCoefficientsArray(arrBig, curve).getCoef(0), Fr.e(7));

        // blinding, shifting, truncating
        const blinded = Polynomial.fromPolynomial(big, curve);
        blinded.blindCoefficients([Fr.random(), Fr.random()]);
        assert.equal(blinded.length(), BIG + 2);

        const shifted = Polynomial.fromPolynomial(big, curve);
        shifted.byX();
        assert.deepEqual(shifted.evaluate(x), Fr.mul(atX, x));

        const padded = new Polynomial(new BigBufferLike(BIG, Fr), curve);
        void padded;

        // division backends
        const q = Polynomial.fromPolynomial(big, curve);
        q.byXNSubValue(4, Fr.neg(Fr.e(3)));
        q.divByMonic(4, Fr.e(3));
        assert(q.isEqual(big));

        const q2 = Polynomial.fromPolynomial(big, curve);
        q2.byXNSubValue(4, Fr.neg(Fr.e(5)));
        const r2 = q2.divByVanishing(4, Fr.e(5));
        assert(q2.isEqual(big));
        assert.deepEqual(r2.getCoef(0), Fr.zero);

        const q3 = Polynomial.fromPolynomial(big, curve);
        q3.byXSubValue(Fr.e(11));
        q3.divByXSubValue(Fr.e(11));
        assert(q3.isEqual(big));

        const q4 = Polynomial.fromPolynomial(big, curve);
        q4.byXNSubValue(2, Fr.neg(Fr.e(9)));
        q4.fastDivByVanishing([[2, Fr.e(9)]]);
        assert.deepEqual(q4.evaluate(x), atX);

        // Euclidean division with a tiny divisor
        const q5 = Polynomial.fromPolynomial(big, curve);
        const divisor = Polynomial.fromCoefficientsArray([Fr.e(1), Fr.e(1)], curve); // X + 1
        const rem = q5.divBy(divisor);
        const lhs = atX;
        const rhs = Fr.add(Fr.mul(q5.evaluate(x), divisor.evaluate(x)), rem.evaluate(x));
        assert.deepEqual(lhs, rhs);

        // exp and truncate big paths
        const small = Polynomial.fromCoefficientsArray([Fr.e(1), Fr.e(2)], curve);
        const expBig = await Polynomial.expX(big, 2, true);
        assert.deepEqual(expBig.evaluate(x), big.evaluate(Fr.mul(x, x)));
        void small;

        const trunc = Polynomial.fromPolynomial(big, curve);
        trunc.truncate();
        assert.equal(trunc.degree(), big.degree());
    });

    // Helper stand-in so the BigBuffer test reads clearly; a zeroed buffer
    function BigBufferLike(len, Fr) {
        return new Uint8Array(len * Fr.n8);
    }

    it("to4T uses the BigBuffer backend for large domains", async function () {
        this.timeout(120000);
        const Fr = curve.Fr;
        const domainSize = 2 << 14; // 32768: domainSize*4 and domainSize+bf cross the threshold

        const coefs = getRandomBuffer(domainSize, Fr);
        const evals = await Fr.fft(coefs.slice());
        const b = Fr.random();
        const [a1, A4] = await Polynomial.to4T(evals, domainSize, [b], Fr);
        assert.equal(a1.byteLength, (domainSize + 1) * Fr.n8);
        assert.equal(A4.byteLength, domainSize * 4 * Fr.n8);
    });

    it("covers the small-polynomial edge branches", () => {
        const Fr = curve.Fr;

        // isEqual: differing degrees short-circuit
        const p1 = Polynomial.fromCoefficientsArray([Fr.e(1), Fr.e(2)], curve);
        const p2 = Polynomial.fromCoefficientsArray([Fr.e(1), Fr.e(2), Fr.e(3)], curve);
        assert.equal(p1.isEqual(p2), false);

        // length(): misaligned buffer is rejected
        const bad = new Polynomial(new Uint8Array(33), curve);
        assert.throws(() => bad.length(), /incorrect size/);

        // byXSubValue without resize: top coefficient already zero
        const withRoom = Polynomial.fromCoefficientsArray([Fr.e(3), Fr.e(1), Fr.zero], curve);
        const x = Fr.random();
        const before = withRoom.evaluate(x);
        withRoom.byXSubValue(Fr.e(2));
        assert.deepEqual(withRoom.evaluate(x), Fr.mul(before, Fr.sub(x, Fr.e(2))));
        assert.equal(withRoom.length(), 3); // no resize happened

        // byXNSubValue without resize: enough zero head-room
        const roomy = Polynomial.fromCoefficientsArray(
            [Fr.e(3), Fr.e(1), Fr.zero, Fr.zero, Fr.zero, Fr.zero], curve);
        const before2 = roomy.evaluate(x);
        roomy.byXNSubValue(2, Fr.e(5));
        assert.deepEqual(roomy.evaluate(x), Fr.mul(before2, Fr.add(Fr.mul(x, x), Fr.e(5))));
        assert.equal(roomy.length(), 6);

        // divByVanishing skips zero coefficients (continue branch)
        const sparseQ = Polynomial.fromCoefficientsArray(
            [Fr.e(1), Fr.zero, Fr.zero, Fr.zero, Fr.zero, Fr.zero, Fr.zero, Fr.e(1)], curve);
        const sparse = Polynomial.fromPolynomial(sparseQ, curve);
        sparse.byXNSubValue(3, Fr.neg(Fr.e(2)));
        sparse.divByVanishing(3, Fr.e(2));
        assert(sparse.isEqual(sparseQ));
    });

    it("blindCoefficients and to4T default to no blinding factors", async () => {
        const Fr = curve.Fr;
        const pol = Polynomial.fromCoefficientsArray([Fr.e(1), Fr.e(2)], curve);
        const before = pol.length();
        pol.blindCoefficients(); // undefined -> []
        assert.equal(pol.length(), before);

        const domainSize = 4;
        const coefs = getRandomBuffer(domainSize, Fr);
        const evals = await Fr.fft(coefs.slice());
        const [a, A4] = await Polynomial.to4T(evals, domainSize, undefined, Fr);
        assert.equal(a.byteLength, domainSize * Fr.n8);
        assert.equal(A4.byteLength, domainSize * 4 * Fr.n8);
    });

    it("add and sub honor the blinding value and operand-length asymmetry", () => {
        const Fr = curve.Fr;
        const x = Fr.random();
        const small = Polynomial.fromCoefficientsArray([Fr.e(1), Fr.e(2)], curve);
        const large = Polynomial.fromCoefficientsArray([Fr.e(5), Fr.e(6), Fr.e(7), Fr.e(8)], curve);
        const blind = Fr.e(3);

        // add/sub with a LONGER other polynomial steal (and mutate) the
        // operand's buffer, so compute expectations first and pass fresh
        // copies.
        const expectedAdd = Fr.add(small.evaluate(x), Fr.mul(blind, large.evaluate(x)));
        const expectedSub = Fr.sub(small.evaluate(x), Fr.mul(blind, large.evaluate(x)));

        const a = Polynomial.fromPolynomial(small, curve);
        a.add(Polynomial.fromPolynomial(large, curve), blind);
        assert.deepEqual(a.evaluate(x), expectedAdd);

        const s = Polynomial.fromPolynomial(small, curve);
        s.sub(Polynomial.fromPolynomial(large, curve), blind);
        assert.deepEqual(s.evaluate(x), expectedSub);
    });

    it("split validates its arguments", () => {
        const Fr = curve.Fr;
        const pol = () => new Polynomial(getRandomBuffer(16, Fr), curve);

        assert.throws(() => pol().split(0, 3, []), /can't be split/);
        // splitting into one part returns the polynomial itself
        const p = pol();
        assert.strictEqual(p.split(1, 3, [])[0], p);
        // wrong blinding-factor count
        assert.throws(() => pol().split(4, 3, [Fr.one]), /Blinding factors length/);
        // more parts than the degree supports: excess parts come back as zero
        const parts = pol().split(8, 3, new Array(7).fill(Fr.one));
        assert.strictEqual(parts.length, 8);
        assert.strictEqual(parts[7].degree(), 0);
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