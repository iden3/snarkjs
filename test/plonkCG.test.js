import * as snarkjs from "../main.js";
import {getCurveFromName} from "../src/curves.js";
import assert from "assert";
import path from "path";

describe("snarkjs: Plonk with custom gates", function () {
    this.timeout(1000000000);

    let curve;
    const zkeyPlonkMem = {type: "mem"};
    const wtnsMem = {type: "mem"};
    let vKey;
    let proof;
    let publicSignals;

    before(async () => {
        curve = await getCurveFromName("bn128");
    });

    after(async () => {
        await curve.terminate();
    });

    it("witness calculate", async () => {
        await snarkjs.wtns.calculate({lower_bound: 20, upper_bound: 40, to_check: 30},
            path.join("test", "plonkcg_circuit", "circuit_js", "circuit.wasm"), wtnsMem);
    });

    it("plonk with custom gates setup", async () => {
        const r1csFilename = path.join("test", "plonkcg_circuit", "circuit.r1cs");
        const ptauFilename = path.join("test", "plonk_circuit", "powersOfTau15_final.ptau");
        await snarkjs.plonk.setupCG(r1csFilename, ptauFilename, zkeyPlonkMem);
    });

    it("plonk with custom gates proof", async () => {
        const res = await snarkjs.plonk.proveCG(zkeyPlonkMem, wtnsMem);
        proof = res.proof;
        publicSignals = res.publicSignals;
    });

    it("zkey custom gates export verificationkey", async () => {
        vKey = await snarkjs.zKey.exportVerificationKey(zkeyPlonkMem);
    });

    it("plonk with custom gates verify", async () => {
        const res = await snarkjs.plonk.verifyCG(vKey, publicSignals, proof);
        assert(res === true);
    });
});
