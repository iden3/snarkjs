import { MulZ } from "../src/mul_z.js";
import { getCurveFromName } from "../src/curves.js";
import assert from "assert";

// MulZ.mulN multiplies N blinded evaluations (a_i + a_i'·z), returning
// [r, rz] such that the full product equals r + z·rz, where z = Z1[p] is the
// p-th 4th root of unity (p in 1..3; the z^2, z^3... cross terms are folded
// into rz via the precomputed Z2/Z3 tables). Verify that identity directly.
describe("MulZ blinded-evaluation products", function () {

    let curve, Fr;

    beforeAll(async () => {
        curve = await getCurveFromName("bn128");
        Fr = curve.Fr;
    });

    afterAll(async () => {
        await curve.terminate();
    });

    const factor = () => [Fr.random(), Fr.random()];
    const blinded = (v, vp, z) => Fr.add(v, Fr.mul(vp, z));

    it("mul2 satisfies product = r + z·rz for every root index", () => {
        for (let p = 1; p <= 3; p++) {
            const z = MulZ.getZ1(Fr)[p];
            const [a, ap] = factor(); const [b, bp] = factor();
            const [r, rz] = MulZ.mul2(a, b, ap, bp, p, Fr);
            const expected = Fr.mul(blinded(a, ap, z), blinded(b, bp, z));
            assert.deepEqual(Fr.add(r, Fr.mul(z, rz)), expected, `p=${p}`);
        }
    });

    it("mul3 satisfies product = r + z·rz for every root index", () => {
        for (let p = 1; p <= 3; p++) {
            const z = MulZ.getZ1(Fr)[p];
            const [a, ap] = factor(); const [b, bp] = factor(); const [c, cp] = factor();
            const [r, rz] = MulZ.mul3(a, b, c, ap, bp, cp, p, Fr);
            const expected = Fr.mul(Fr.mul(blinded(a, ap, z), blinded(b, bp, z)), blinded(c, cp, z));
            assert.deepEqual(Fr.add(r, Fr.mul(z, rz)), expected, `p=${p}`);
        }
    });

    it("mul4 satisfies product = r + z·rz for every root index", () => {
        for (let p = 1; p <= 3; p++) {
            const z = MulZ.getZ1(Fr)[p];
            const [a, ap] = factor(); const [b, bp] = factor();
            const [c, cp] = factor(); const [d, dp] = factor();
            const [r, rz] = MulZ.mul4(a, b, c, d, ap, bp, cp, dp, p, Fr);
            const expected = Fr.mul(
                Fr.mul(blinded(a, ap, z), blinded(b, bp, z)),
                Fr.mul(blinded(c, cp, z), blinded(d, dp, z))
            );
            assert.deepEqual(Fr.add(r, Fr.mul(z, rz)), expected, `p=${p}`);
        }
    });

    it("mulN without a root index returns only the plain product term", () => {
        const [a, ap] = factor(); const [b, bp] = factor();
        const [r] = MulZ.mul2(a, b, ap, bp, 0, Fr);
        assert.deepEqual(r, Fr.mul(a, b));
    });
});
