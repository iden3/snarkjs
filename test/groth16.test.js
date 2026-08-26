import * as snarkjs from "../main.js";

// Vitest browser tests are served from project root via Vite dev server,
// so browser paths need a leading slash; Node tests use CWD-relative paths.
const isBrowser = typeof window !== "undefined";
const p = (rel) => (isBrowser ? `/${rel}` : rel);

const r1cs = p("test/groth16/circuit.r1cs");
const wasm = p("test/groth16/circuit.wasm");

describe("Groth16", function () {
    let curve;
    const ptau_0 = { type: "mem" };
    const ptau_1 = { type: "mem" };
    const ptau_beacon = { type: "mem" };
    const ptau_final = { type: "mem" };
    const zkey_0 = { type: "mem" };
    const zkey_1 = { type: "mem" };
    const zkey_final = { type: "mem" };
    const wtns = { type: "mem" };
    let vKey;
    let proof;
    let publicSignals;

    beforeAll(async () => {
        curve = await snarkjs.curves.getCurveFromName("bn128");
        await snarkjs.powersOfTau.newAccumulator(curve, 11, ptau_0);
        await snarkjs.powersOfTau.contribute(ptau_0, ptau_1, "C1", "Entropy1");
        await snarkjs.powersOfTau.beacon(
            ptau_1,
            ptau_beacon,
            "B3",
            "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20",
            10
        );
        await snarkjs.powersOfTau.preparePhase2(ptau_beacon, ptau_final);
    }, 300_000);

    afterAll(async () => {
        await curve.terminate();
    });

    it("zkey new", async () => {
        await snarkjs.zKey.newZKey(r1cs, ptau_final, zkey_0);
    });

    it("zkey contribute", async () => {
        await snarkjs.zKey.contribute(zkey_0, zkey_1, "p2_C1", "pa_Entropy1");
    });

    it("zkey beacon", async () => {
        await snarkjs.zKey.beacon(
            zkey_1,
            zkey_final,
            "B3",
            "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20",
            10
        );
    });

    it("zkey verify from r1cs", async () => {
        const res = await snarkjs.zKey.verifyFromR1cs(r1cs, ptau_final, zkey_final);
        expect(res).toBe(true);
    });

    it("zkey verify from init", async () => {
        const res = await snarkjs.zKey.verifyFromInit(zkey_0, ptau_final, zkey_final);
        expect(res).toBe(true);
    });

    it("zkey export verification key", async () => {
        vKey = await snarkjs.zKey.exportVerificationKey(zkey_final);
        expect(vKey).toBeTruthy();
    });

    it("witness calculate", async () => {
        await snarkjs.wtns.calculate({ a: 11, b: 2 }, wasm, wtns);
    });

    it("witness check", async () => {
        await snarkjs.wtns.check(r1cs, wtns);
    });

    it("groth16 prove", async () => {
        const res = await snarkjs.groth16.prove(zkey_final, wtns);
        proof = res.proof;
        publicSignals = res.publicSignals;
        expect(proof).toBeTruthy();
        expect(publicSignals).toBeTruthy();
    });

    it("groth16 verify", async () => {
        const res = await snarkjs.groth16.verify(vKey, publicSignals, proof);
        expect(res).toBe(true);
    });
});
