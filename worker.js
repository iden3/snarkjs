// Snarkjs functionality
import * as groth16 from "./src/groth16.js";
import * as powersOfTau from "./src/powersoftau.js";
import * as r1cs from "./src/r1cs.js";
import * as wtns from "./src/wtns.js";
import * as zKey from "./src/zkey.js";
import * as plonk from "./src/plonk.js";
// Comlink library exposes the functions as RPC calls in a Worker
import * as Comlink from "comlink";

Comlink.expose({
    groth16: Comlink.proxy(groth16),
    powersOfTau: Comlink.proxy(powersOfTau),
    r1cs: Comlink.proxy(r1cs),
    wtns: Comlink.proxy(wtns),
    zKey: Comlink.proxy(zKey),
    plonk: Comlink.proxy(plonk),
});
