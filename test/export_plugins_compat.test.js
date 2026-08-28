import * as snarkjs from "../main.js";
import exportVerifier from "../src/zkey_export_verifier.js";
import exportCalldata from "../src/export_calldata.js";
import solidityPlugin from "../src/plugins/solidity/index.js";
import assert from "assert";
import fs from "fs";
import path from "path";
import url from "url";

// Byte-compat: the built-in solidity plugin (and the legacy shim entry
// points now routed through it) must reproduce the pre-plugin
// implementation's output exactly. Goldens in test/plugin_fixtures/ were
// generated with the old code (see the fixture README) against committed
// zkeys and saved proofs, so every assertion here is a strict string
// equality against a historical artifact.

const FIX = path.join(path.dirname(url.fileURLToPath(import.meta.url)), "plugin_fixtures");
const read = (n) => fs.readFileSync(path.join(FIX, n), "utf8");
const readJson = (n) => JSON.parse(read(n));

const templates = {};
for (const p of ["groth16", "plonk", "fflonk"]) {
    templates[p] = fs.readFileSync(
        path.join(FIX, "..", "..", "templates", `verifier_${p}.sol.ejs`), "utf8");
}

const CASES = [
    { protocol: "groth16", zkey: path.join(FIX, "groth16.zkey") },
    { protocol: "plonk", zkey: path.join(FIX, "..", "plonk_circuit", "circuit.zkey") },
    { protocol: "fflonk", zkey: path.join(FIX, "..", "fflonk", "circuit.zkey") },
];

describe("export plugins: byte-compat with the pre-plugin implementation", function () {

    for (const c of CASES) {
        it(`${c.protocol} verifier via plugin dispatch matches the golden`, async () => {
            const code = await exportVerifier(c.zkey, solidityPlugin, { templates });
            assert.strictEqual(code, read(`${c.protocol}.verifier.sol.golden`));
        });

        it(`${c.protocol} verifier via legacy zKey.exportSolidityVerifier matches the golden`, async () => {
            const code = await snarkjs.zKey.exportSolidityVerifier(c.zkey, templates);
            assert.strictEqual(code, read(`${c.protocol}.verifier.sol.golden`));
        });

        it(`${c.protocol} verifier with default (fs-loaded) templates matches the golden`, async () => {
            const code = await exportVerifier(c.zkey, solidityPlugin, {});
            assert.strictEqual(code, read(`${c.protocol}.verifier.sol.golden`));
        });

        it(`${c.protocol} calldata via plugin dispatch matches the golden`, async () => {
            const proof = readJson(`${c.protocol}.proof.json`);
            const pub = readJson(`${c.protocol}.public.json`);
            const res = await exportCalldata(proof, pub, solidityPlugin, {});
            assert.strictEqual(res, read(`${c.protocol}.calldata.golden`));
        });
    }

    it("legacy protocol-namespace calldata exports still match the goldens", async () => {
        const g16 = await snarkjs.groth16.exportSolidityCallData(
            readJson("groth16.proof.json"), readJson("groth16.public.json"));
        assert.strictEqual(g16, read("groth16.calldata.golden"));
        const plonk = await snarkjs.plonk.exportSolidityCallData(
            readJson("plonk.proof.json"), readJson("plonk.public.json"));
        assert.strictEqual(plonk, read("plonk.calldata.golden"));
        // fflonk keeps its historical reversed (pub, proof) signature
        const ff = await snarkjs.fflonk.exportSolidityCallData(
            readJson("fflonk.public.json"), readJson("fflonk.proof.json"));
        assert.strictEqual(ff, read("fflonk.calldata.golden"));
    });

    it("legacy fflonk.exportSolidityVerifier (vk-object signature) matches the golden", async () => {
        const vk = await snarkjs.zKey.exportVerificationKey(path.join(FIX, "..", "fflonk", "circuit.zkey"));
        const code = await snarkjs.fflonk.exportSolidityVerifier(vk, templates);
        assert.strictEqual(code, read("fflonk.verifier.sol.golden"));
    });
});
