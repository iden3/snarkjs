import { Proof } from "../src/proof.js";
import { getCurveFromName } from "../src/curves.js";
import assert from "assert";

// The Proof container used by PLONK/FFLONK warns (via its logger) on
// duplicate registration and on reads of missing entries.
describe("Proof container", function () {
    this.timeout(60000);

    let curve;
    let warnings;
    const logger = { warn: (m) => warnings.push(m), info() {}, debug() {}, error() {} };

    before(async () => { curve = await getCurveFromName("bn128"); });
    after(async () => { await curve.terminate(); });
    beforeEach(() => { warnings = []; });

    it("warns when a polynomial is registered twice or read before being set", () => {
        const proof = new Proof(curve, logger);
        proof.addPolynomial("A", "p1");
        proof.addPolynomial("A", "p2");
        assert.strictEqual(warnings.length, 1);
        assert(warnings[0].includes("already exist"));

        assert.strictEqual(proof.getPolynomial("missing"), undefined);
        assert.strictEqual(warnings.length, 2);
        assert(warnings[1].includes("does not exist"));

        assert.strictEqual(proof.getPolynomial("A"), "p2");
        assert.strictEqual(warnings.length, 2);
    });

    it("warns when an evaluation is registered twice or read before being set", () => {
        const proof = new Proof(curve, logger);
        proof.addEvaluation("xi", "e1");
        proof.addEvaluation("xi", "e2");
        assert.strictEqual(warnings.length, 1);

        assert.strictEqual(proof.getEvaluation("nope"), undefined);
        assert.strictEqual(warnings.length, 2);

        assert.strictEqual(proof.getEvaluation("xi"), "e2");
    });
});
