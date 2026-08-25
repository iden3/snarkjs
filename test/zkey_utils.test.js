import * as snarkjs from "../main.js";
import * as zkeyUtils from "../src/zkey_utils.js";
import { getCurveFromName } from "../src/curves.js";
import * as binFileUtils from "@iden3/binfileutils";
import assert from "assert";
import path from "path";

// readZKey/writeZKey round-trip: writeZKey serializes a fully-loaded groth16
// proving key back into the binary zkey format. (Regression: writeZKey was
// missing an await on getCurve and could never have worked.)
describe("zkey read/write round-trip", function () {
    this.timeout(1000000000);

    let curve;
    const ptau_0 = { type: "mem" };
    const ptau_1 = { type: "mem" };
    const ptau_final = { type: "mem" };
    const zkey = { type: "mem" };

    before(async () => {
        curve = await getCurveFromName("bn128");
        await snarkjs.powersOfTau.newAccumulator(curve, 8, ptau_0);
        await snarkjs.powersOfTau.contribute(ptau_0, ptau_1, "C1", "zkey utils entropy");
        await snarkjs.powersOfTau.preparePhase2(ptau_1, ptau_final);
        await snarkjs.zKey.newZKey(path.join("test", "buildabc_gap", "gap.r1cs"), ptau_final, zkey);
    });

    after(async () => {
        await curve.terminate();
    });

    it("writeZKey(readZKey(zkey)) preserves the proving key", async () => {
        const vKey = await snarkjs.zKey.exportVerificationKey(zkey);

        const zkeyObj = await zkeyUtils.readZKey(zkey);
        assert.strictEqual(zkeyObj.protocol, "groth16");

        const rewritten = { type: "mem" };
        await zkeyUtils.writeZKey(rewritten, zkeyObj);

        // The rewritten key must expose the identical verification key...
        const vKey2 = await snarkjs.zKey.exportVerificationKey(rewritten);
        assert.deepStrictEqual(JSON.parse(JSON.stringify(vKey2)), JSON.parse(JSON.stringify(vKey)));

        // ...and still produce proofs that verify against the original vKey.
        const wtns = { type: "mem" };
        await snarkjs.wtns.calculate({ a: 3, b: 5 }, path.join("test", "buildabc_gap", "gap.wasm"), wtns);
        const res = await snarkjs.groth16.prove(rewritten, wtns);
        assert(await snarkjs.groth16.verify(vKey, res.publicSignals, res.proof) === true);
    });

    it("readZKey with toObject returns stringifiable points", async () => {
        const zkeyObj = await snarkjs.zKey.exportJson(zkey);
        assert.strictEqual(zkeyObj.protocol, "groth16");
        assert(Array.isArray(zkeyObj.IC));
    });

    // zkey verification pinpoints which part of a corrupted zkey diverges
    // from the one reconstructed from r1cs + ptau. Corrupt each region and
    // demand rejection through its specific check.
    describe("verifyFromR1cs pinpoints corrupted zkey regions", function () {
        const logger = { info() {}, debug() {}, warn() {}, error() {}, log() {} };
        const r1cs = path.join("test", "buildabc_gap", "gap.r1cs");

        // Groth16 header layout inside section 2:
        // n8q(4) q(32) n8r(4) r(32) nVars(4) nPublic(4) domainSize(4)
        // then alpha1(64) beta1(64) beta2(128) gamma2(128) delta1(64) delta2(128)
        const HEADER_POINTS = 84;
        const REGIONS = [
            ["nVars (circuit parameters)", (s) => s[2][0].p + 72],
            ["r (different curves)", (s) => s[2][0].p + 40 + 16],
            ["vk_alpha_1", (s) => s[2][0].p + HEADER_POINTS + 16],
            ["vk_beta_1", (s) => s[2][0].p + HEADER_POINTS + 64 + 16],
            ["vk_beta_2", (s) => s[2][0].p + HEADER_POINTS + 128 + 16],
            ["vk_gamma_2", (s) => s[2][0].p + HEADER_POINTS + 256 + 16],
            ["vk_delta_1", (s) => s[2][0].p + HEADER_POINTS + 384 + 16],
            ["vk_delta_2", (s) => s[2][0].p + HEADER_POINTS + 448 + 16],
            ["IC section", (s) => s[3][0].p + 16],
            ["Coeffs section", (s) => s[4][0].p + 24],
            ["A section", (s) => s[5][0].p + 16],
            ["B1 section", (s) => s[6][0].p + 16],
            ["B2 section", (s) => s[7][0].p + 16],
            ["L section", (s) => s[8][0].p + 16],
            ["H section", (s) => s[9][0].p + 16],
            // section 10 of a fresh zkey is csHash(64) + nContributions(4);
            // corrupting the csHash trips the "Circuit does not match" check
            ["contributions section (csHash)", (s) => s[10][0].p + 10],
        ];

        for (const [label, where] of REGIONS) {
            it(`rejects a zkey with a corrupted ${label}`, async () => {
                const { fd, sections } = await binFileUtils.readBinFile(
                    { type: "mem", data: Uint8Array.from(zkey.data) }, "zkey", 2);
                await fd.close();

                const corrupt = { type: "mem", data: Uint8Array.from(zkey.data) };
                corrupt.data[where(sections)] ^= 0xFF;

                let rejected = false;
                try {
                    rejected = (await snarkjs.zKey.verifyFromR1cs(r1cs, ptau_final, corrupt, logger)) !== true;
                } catch (err) {
                    rejected = true;
                }
                assert(rejected, `corrupted ${label} must not verify`);
            });
        }
    });
});
