import * as snarkjs from "../main.js";
import { getCurveFromName } from "../src/curves.js";
import assert from "assert";
import path from "path";
import fs from "fs";
import os from "os";

// Regression tests for the output-fd lifecycle in wtnsCalculate
// (src/wtns_calculate.js): the witness is calculated BEFORE the output file
// is opened, and the fd is closed on the write-failure path too. A circuit
// assert (or a bad input) used to leak the just-created fd and leave a
// zero-byte .wtns file behind.
describe("wtns calculate output-file lifecycle", function () {
    this.timeout(120000);

    const wasmFile = path.join("test", "groth16", "circuit.wasm");
    const r1csFile = path.join("test", "groth16", "circuit.r1cs");

    let curve;
    let tmpDir;

    before(async () => {
        // wtns.check builds the curve internally; hold a handle so the
        // worker threads are terminated when this suite ends.
        curve = await getCurveFromName("bn128");
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "snarkjs-wtns-"));
    });

    after(async () => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
        await curve.terminate();
    });

    it("writes a valid witness file on success", async () => {
        const wtnsFile = path.join(tmpDir, "ok.wtns");
        await snarkjs.wtns.calculate({ a: 11, b: 2 }, wasmFile, wtnsFile);

        assert(fs.existsSync(wtnsFile));
        assert(fs.statSync(wtnsFile).size > 0);
        assert(await snarkjs.wtns.check(r1csFile, wtnsFile) === true);
    });

    it("does not leave an output file behind when witness calculation throws", async () => {
        const wtnsFile = path.join(tmpDir, "fail.wtns");
        let threw = false;
        try {
            // input "b" is missing: the witness calculator throws before any
            // output should be produced
            await snarkjs.wtns.calculate({ a: 11 }, wasmFile, wtnsFile);
        } catch (err) {
            threw = true;
        }
        assert(threw, "witness calculation with a missing input should throw");
        assert(
            !fs.existsSync(wtnsFile),
            "failed calculation left a (zero-byte) output file behind"
        );
    });
});
