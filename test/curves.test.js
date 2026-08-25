import { getCurveFromName, getCurveFromQ, getCurveFromR } from "../src/curves.js";
import { Scalar } from "ffjavascript";
import assert from "assert";

const bn128r = Scalar.e("21888242871839275222246405745257275088548364400416034343698204186575808495617");
const bn128q = Scalar.e("21888242871839275222246405745257275088696311157297823662689037894645226208583");
const bls12381r = Scalar.e("73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001", 16);
const bls12381q = Scalar.e("1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaab", 16);

describe("curves", function () {
    this.timeout(120000);

    const handles = [];
    const track = (c) => { handles.push(c); return c; };

    after(async () => {
        for (const c of handles) {
            try { await c.terminate(); } catch { /* shared instances may already be down */ }
        }
    });

    it("resolves bn128 by every accepted alias", async () => {
        for (const name of ["bn128", "BN254", "altbn128", "alt_bn128"]) {
            const curve = track(await getCurveFromName(name));
            assert.strictEqual(curve.name, "bn128");
        }
    });

    it("resolves bls12-381 by name", async () => {
        const curve = track(await getCurveFromName("bls12-381"));
        assert.strictEqual(curve.name, "bls12381");
    });

    it("resolves both curves from their group order r", async () => {
        assert.strictEqual(track(await getCurveFromR(bn128r)).name, "bn128");
        assert.strictEqual(track(await getCurveFromR(bls12381r)).name, "bls12381");
    });

    it("resolves both curves from their field prime q", async () => {
        assert.strictEqual(track(await getCurveFromQ(bn128q)).name, "bn128");
        assert.strictEqual(track(await getCurveFromQ(bls12381q)).name, "bls12381");
    });

    it("honors the singleThread option", async () => {
        const curve = track(await getCurveFromName("bn128", { singleThread: true }));
        assert.strictEqual(curve.name, "bn128");
        const curve2 = track(await getCurveFromR(bn128r, { singleThread: true }));
        assert.strictEqual(curve2.name, "bn128");
        const curve3 = track(await getCurveFromQ(bn128q, { singleThread: true }));
        assert.strictEqual(curve3.name, "bn128");
    });

    it("rejects unsupported curves", async () => {
        await assert.rejects(getCurveFromName("ed25519"), /not supported/);
        await assert.rejects(getCurveFromR(Scalar.e(17)), /not supported/);
        await assert.rejects(getCurveFromQ(Scalar.e(17)), /not supported/);
    });
});
