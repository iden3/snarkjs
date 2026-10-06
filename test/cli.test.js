import assert from "assert";
import { execFile } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

// CLI-level smoke tests. The programmatic API is exercised everywhere else,
// but the CLI option layer has its own quirks (clprocessor yields null for a
// declared-but-absent option) that unit tests on the API cannot catch: the
// --transcript option once broke every default-path plonk/fflonk prove and
// verify invocation while all API tests stayed green.

function snarkjs(args, cwd) {
    return new Promise((resolve) => {
        execFile("node", [path.join(process.cwd(), "cli.js"), ...args], { cwd }, (error, stdout, stderr) => {
            resolve({ code: error ? error.code : 0, stdout, stderr });
        });
    });
}

describe("CLI smoke tests", function () {
    this.timeout(120000);

    let tmpDir;

    before(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "snarkjs-cli-"));
    });

    after(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("plonk prove and verify work without a --transcript flag", async () => {
        const zkey = path.join(process.cwd(), "test", "plonk_circuit", "circuit.zkey");
        const wtns = path.join(process.cwd(), "test", "plonk_circuit", "witness.wtns");

        const prove = await snarkjs(["plonk", "prove", zkey, wtns, "proof.json", "public.json"], tmpDir);
        assert.strictEqual(prove.code, 0, `plonk prove failed:\n${prove.stdout}${prove.stderr}`);

        const exportVk = await snarkjs(["zkey", "export", "verificationkey", zkey, "vk.json"], tmpDir);
        assert.strictEqual(exportVk.code, 0, `vk export failed:\n${exportVk.stdout}${exportVk.stderr}`);

        const verify = await snarkjs(["plonk", "verify", "vk.json", "public.json", "proof.json"], tmpDir);
        assert.strictEqual(verify.code, 0, `plonk verify failed:\n${verify.stdout}${verify.stderr}`);
        assert.match(verify.stdout, /OK/);
    });
});
