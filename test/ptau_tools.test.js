import * as snarkjs from "../main.js";
import { getCurveFromName } from "../src/curves.js";
import * as binFileUtils from "@iden3/binfileutils";
import { readPTauHeader } from "../src/powersoftau_utils.js";
import assert from "assert";
import path from "path";
import fs from "fs";
import os from "os";

// The ptau tooling around the core ceremony: convert (recompute the Lagrange
// sections of an existing ceremony), truncate (derive smaller-power files),
// exportJson, and verification with logging enabled. These are CLI-facing
// paths no other suite touches.
describe("powersoftau tooling", function () {

    const POWER = 4;

    let curve;
    let tmpDir;
    const logLines = [];
    const logger = {
        info: (...a) => logLines.push(a.join(" ")),
        debug: (...a) => logLines.push(a.join(" ")),
        warn: (...a) => logLines.push(a.join(" ")),
        error: (...a) => logLines.push(a.join(" ")),
        log: (...a) => logLines.push(a.join(" ")),
    };

    const ptau_0 = { type: "mem" };
    const ptau_1 = { type: "mem" };
    const ptau_beacon = { type: "mem" };
    const ptau_final = { type: "mem" };

    beforeAll(async () => {
        curve = await getCurveFromName("bn128");
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "snarkjs-ptau-"));
        await snarkjs.powersOfTau.newAccumulator(curve, POWER, ptau_0, logger);
        await snarkjs.powersOfTau.contribute(ptau_0, ptau_1, "C1", "ptau tools entropy", logger);
        await snarkjs.powersOfTau.beacon(ptau_1, ptau_beacon, "B1",
            "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20", 10, logger);
        await snarkjs.powersOfTau.preparePhase2(ptau_beacon, ptau_final, logger);
    });

    afterAll(async () => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
        await curve.terminate();
    });

    it("verifies the prepared ceremony (with logging enabled)", async () => {
        const res = await snarkjs.powersOfTau.verify(ptau_final, logger);
        assert(res === true);
        assert(logLines.length > 0, "expected verification to log");
    });

    it("convert recomputes the Lagrange sections and the result still verifies", async () => {
        const converted = { type: "mem" };
        await snarkjs.powersOfTau.convert(ptau_final, converted, logger);
        const res = await snarkjs.powersOfTau.verify(converted, logger);
        assert(res === true);
    });

    it("truncate derives one valid smaller ceremony file per power", async () => {
        const ptauFile = path.join(tmpDir, "base.ptau");
        fs.writeFileSync(ptauFile, ptau_final.data);

        const template = path.join(tmpDir, "trunc_");
        const res = await snarkjs.powersOfTau.truncate(ptauFile, template, logger);
        assert(res === true);

        for (let p = 1; p < POWER; p++) {
            const name = `${template}0${p}.ptau`;
            assert(fs.existsSync(name), `missing ${name}`);
            const { fd, sections } = await binFileUtils.readBinFile(name, "ptau", 1);
            const header = await readPTauHeader(fd, sections);
            assert.strictEqual(header.power, p);
            assert.strictEqual(header.ceremonyPower, POWER);
            await fd.close();
        }
    });

    it("exportJson returns the ceremony content as stringified points", async () => {
        // exportJson's second parameter is a `verbose` flag that logs via
        // console.log directly; keep it on but silence the console
        const origLog = console.log;
        console.log = () => {};
        let json;
        try {
            json = await snarkjs.powersOfTau.exportJson(ptau_final, true);
        } finally {
            console.log = origLog;
        }
        assert.strictEqual(json.power, POWER);
        assert.strictEqual(json.tauG1.length, 2 ** (POWER + 1) - 1);
        assert.strictEqual(json.tauG2.length, 2 ** POWER);
        assert(Array.isArray(json.lTauG1), "prepared file must include Lagrange sections");
        assert.strictEqual(json.lTauG1.length, POWER + 1);
    });

    it("verify accepts an unprepared ceremony but warns about missing phase2 sections", async () => {
        const before = logLines.length;
        const res = await snarkjs.powersOfTau.verify(ptau_1, logger);
        assert(res === true);
        assert(logLines.slice(before).some((l) => l.includes("preparephase2")),
            "expected the missing-phase2 warning");
    });

    it("beacon rejects malformed beacon parameters", async () => {
        const out = { type: "mem" };
        const goodHash = "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20";

        // numIterationsExp out of the [10, 63] range
        assert(await snarkjs.powersOfTau.beacon(ptau_1, out, "B", goodHash, 5, logger) === false);
        assert(await snarkjs.powersOfTau.beacon(ptau_1, out, "B", goodHash, 64, logger) === false);
        // odd-length beacon hash (the dangling nibble is dropped, then the
        // length cross-check rejects it)
        assert(await snarkjs.powersOfTau.beacon(ptau_1, out, "B", "0102f", 10, logger) === false);
        // empty hash: hex2ByteArray cannot parse it at all and throws
        await assert.rejects(snarkjs.powersOfTau.beacon(ptau_1, out, "B", "", 10, logger));
    });

    it("importResponse supports the no-points mode and rejects a tampered response", async () => {
        const challenge = { type: "mem" };
        const response = { type: "mem" };
        await snarkjs.powersOfTau.exportChallenge(ptau_1, challenge, logger);
        await snarkjs.powersOfTau.challengeContribute(curve, challenge, response, "import entropy", logger);

        // importPoints=false: contribution is recorded without copying points
        const outNoPoints = { type: "mem" };
        await snarkjs.powersOfTau.importResponse(ptau_1, response, outNoPoints, "C2", false, logger);
        assert(outNoPoints.data.byteLength > 0);

        // A tampered response must be rejected
        const badResponse = { type: "mem", data: Uint8Array.from(response.data) };
        badResponse.data[badResponse.data.length - 10] ^= 0xFF;
        let rejected = false;
        try {
            const res = await snarkjs.powersOfTau.importResponse(ptau_1, badResponse, { type: "mem" }, "C2bad", true, logger);
            rejected = (res !== true) && (res !== undefined);
        } catch (err) {
            rejected = true;
        }
        assert(rejected, "tampered response must not import cleanly");
    });

    it("verify rejects a ceremony with no contributions", async () => {
        const res = await snarkjs.powersOfTau.verify(ptau_0, logger);
        assert(res !== true);
    });

    it("verify rejects a ceremony with a corrupted field-size or power header", async () => {
        const { fd, sections } = await binFileUtils.readBinFile({ type: "mem", data: Uint8Array.from(ptau_1.data) }, "ptau", 1);
        await fd.close();

        // Header layout: n8(4) q(32) power(4) ceremonyPower(4)
        for (const [label, off, val] of [
            ["n8 field size", sections[1][0].p, 0x11],
            ["power", sections[1][0].p + 36, 40],
        ]) {
            const corrupt = { type: "mem", data: Uint8Array.from(ptau_1.data) };
            corrupt.data[off] = val;
            let rejected = false;
            try {
                rejected = (await snarkjs.powersOfTau.verify(corrupt, logger)) !== true;
            } catch (err) {
                rejected = true;
            }
            assert(rejected, `${label} corruption must reject`);
        }
    });

    it("verify rejects a ceremony with a corrupted header", async () => {
        const corrupt = { type: "mem", data: Uint8Array.from(ptau_1.data) };
        // Section 1 (header) starts right after magic+version+nSections and its
        // own id+size: corrupt the field prime so curve detection fails.
        const { fd, sections } = await binFileUtils.readBinFile({ type: "mem", data: Uint8Array.from(ptau_1.data) }, "ptau", 1);
        await fd.close();
        corrupt.data[sections[1][0].p + 8] ^= 0xFF; // inside the prime q
        let rejected = false;
        try {
            rejected = (await snarkjs.powersOfTau.verify(corrupt, logger)) !== true;
        } catch (err) {
            rejected = true;
        }
        assert(rejected);
    });

    // Every check inside verifyContribution and the section/contribution
    // cross-checks: corrupt one specific field at a time and demand
    // rejection. Field offsets inside a contribution record (bn128):
    //   tauG1@0 tauG2@64 alphaG1@192 betaG1@256 betaG2@320
    //   key: tau.g1_s@448 tau.g1_sx@512 alpha.g1_s@576 alpha.g1_sx@640
    //        beta.g1_s@704 beta.g1_sx@768 tau.g2_spx@832 alpha.g2_spx@960
    //        beta.g2_spx@1088
    //   partialHash@1216 nextChallenge@1432 type@1496 paramLength@1500
    describe("verify pinpoints corrupted contribution fields", function () {
        const FIELD_OFFSETS = {
            tauG1: 0, tauG2: 64, alphaG1: 192, betaG1: 256, betaG2: 320,
            "key.tau.g1_s": 448, "key.tau.g1_sx": 512,
            "key.alpha.g1_s": 576, "key.alpha.g1_sx": 640,
            "key.beta.g1_s": 704, "key.beta.g1_sx": 768,
            "key.tau.g2_spx": 832, "key.alpha.g2_spx": 960, "key.beta.g2_spx": 1088,
            // partialHash is intentionally absent: it only feeds the response
            // hash of the SAME contribution and is not cross-checked, so its
            // corruption is undetectable by design.
            nextChallenge: 1432,
        };

        // Returns [record0Start, record1Start] inside section 7
        async function contributionOffsets(data) {
            const { fd, sections } = await binFileUtils.readBinFile({ type: "mem", data: Uint8Array.from(data) }, "ptau", 1);
            await fd.close();
            const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
            const r0 = sections[7][0].p + 4;
            const paramLength0 = view.getUint32(r0 + 1500, true);
            const r1 = r0 + 1504 + paramLength0;
            return { records: [r0, r1], sections };
        }

        async function expectReject(data, offset, label) {
            const corrupt = { type: "mem", data: Uint8Array.from(data) };
            corrupt.data[offset + 16] ^= 0xFF; // mid point-coordinate
            let rejected = false;
            try {
                rejected = (await snarkjs.powersOfTau.verify(corrupt, logger)) !== true;
            } catch (err) {
                rejected = true;
            }
            assert(rejected, `corrupting ${label} must reject`);
        }

        it("rejects a corrupted field in the first (regular) contribution", async () => {
            const { records } = await contributionOffsets(ptau_beacon.data);
            for (const [field, off] of Object.entries(FIELD_OFFSETS)) {
                await expectReject(ptau_beacon.data, records[0] + off, `contribution#1.${field}`);
            }
        });

        it("rejects a corrupted field in the beacon contribution", async () => {
            const { records } = await contributionOffsets(ptau_beacon.data);
            for (const [field, off] of Object.entries(FIELD_OFFSETS)) {
                await expectReject(ptau_beacon.data, records[1] + off, `beacon.${field}`);
            }
        });

        it("rejects corrupted points in each powers section", async () => {
            const { sections } = await contributionOffsets(ptau_beacon.data);
            const sG1 = 64, sG2 = 128;
            const spots = [
                ["tauG1 first (generator)", sections[2][0].p],
                ["tauG1 second", sections[2][0].p + sG1],
                ["tauG1 later power", sections[2][0].p + 3 * sG1],
                ["tauG2 first (generator)", sections[3][0].p],
                ["tauG2 second", sections[3][0].p + sG2],
                ["tauG2 later power", sections[3][0].p + 3 * sG2],
                ["alphaTauG1 first", sections[4][0].p],
                ["alphaTauG1 later", sections[4][0].p + 3 * sG1],
                ["betaTauG1 first", sections[5][0].p],
                ["betaTauG1 later", sections[5][0].p + 3 * sG1],
                ["betaG2", sections[6][0].p],
            ];
            for (const [label, off] of spots) {
                await expectReject(ptau_beacon.data, off, label);
            }
        });
    });

    // NOTE: newAccumulator performs no upper bound check on `power` -- asking
    // for power 29 silently tries to generate 2^30 points. Not tested here
    // (it would run for hours); the CLI layer is what validates the range.

    // The error messages inside verifyContribution interpolate `cur.name || ""`;
    // a NAMELESS beacon ceremony exercises the fallback side on each check.
    describe("verify reports corrupted nameless beacon contributions", function () {
        const nameless_0 = { type: "mem" };
        const nameless_1 = { type: "mem" };
        const nameless_beacon = { type: "mem" };

        const KEY_OFFSETS = {
            "key.tau.g1_s": 448, "key.tau.g1_sx": 512,
            "key.alpha.g1_s": 576, "key.alpha.g1_sx": 640,
            "key.beta.g1_s": 704, "key.beta.g1_sx": 768,
            "key.tau.g2_spx": 832, "key.alpha.g2_spx": 960, "key.beta.g2_spx": 1088,
        };

        beforeAll(async () => {
            await snarkjs.powersOfTau.newAccumulator(curve, 3, nameless_0);
            await snarkjs.powersOfTau.contribute(nameless_0, nameless_1, "", "nameless entropy");
            await snarkjs.powersOfTau.beacon(nameless_1, nameless_beacon, "",
                "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20", 10);
        });

        it("verifies the intact nameless ceremony, printing nameless contributions", async () => {
            const res = await snarkjs.powersOfTau.verify(nameless_beacon, logger);
            assert(res === true);
        });

        it("rejects each corrupted beacon key field", async () => {
            const { fd, sections } = await binFileUtils.readBinFile(
                { type: "mem", data: Uint8Array.from(nameless_beacon.data) }, "ptau", 1);
            await fd.close();
            const view = new DataView(nameless_beacon.data.buffer, nameless_beacon.data.byteOffset, nameless_beacon.data.byteLength);
            const r0 = sections[7][0].p + 4;
            const r1 = r0 + 1504 + view.getUint32(r0 + 1500, true);

            for (const [field, off] of Object.entries(KEY_OFFSETS)) {
                const corrupt = { type: "mem", data: Uint8Array.from(nameless_beacon.data) };
                corrupt.data[r1 + off + 16] ^= 0xFF;
                let rejected = false;
                try {
                    rejected = (await snarkjs.powersOfTau.verify(corrupt, logger)) !== true;
                } catch (err) {
                    rejected = true;
                }
                assert(rejected, `nameless beacon ${field} corruption must reject`);
            }
        });
    });

    it("verify rejects a ceremony file with corrupted section data", async () => {
        const corrupt = { type: "mem", data: Uint8Array.from(ptau_final.data) };
        // Flip a byte inside a tauG1 point, far from the header
        corrupt.data[corrupt.data.length - 100] ^= 0xFF;

        let res;
        try {
            res = await snarkjs.powersOfTau.verify(corrupt, logger);
        } catch (err) {
            res = false; // an unparsable point rejecting is also a rejection
        }
        assert(res !== true, "corrupted ptau must not verify");
    });
});
