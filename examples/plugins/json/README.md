# snarkjs-plugin-json — example export plugin

The smallest useful snarkjs export plugin, and the reference for writing your
own: it exports a verification key (the "verifier") and `{proof,
publicSignals}` (the "calldata") as JSON.

## Using it

### CLI

Declare it in a `snarkjs.config.mjs` in your working directory:

```js
export default {
    plugins: [
        "./node_modules/snarkjs/examples/plugins/json/index.js",
        // or, for published plugins: "snarkjs-plugin-rust-solana"
    ],
};
```

then:

```console
$ snarkjs groth16 export verifier json circuit_final.zkey vk.json
$ snarkjs groth16 export calldata json public.json proof.json --format=compact
$ snarkjs plugins list          # shows every plugin and its capability matrix
$ snarkjs groth16 export verifier json --help
```

The protocol prefix (`groth16|plonk|fflonk`) is validated against the
artifact; `zkey export verifier <plugin>` / `zkey export calldata <plugin>`
work protocol-agnostically.

### Library

No config files, no registry — import the plugin object and pass it:

```js
import * as snarkjs from "snarkjs";
import jsonPlugin from "snarkjs/examples/plugins/json/index.js";

const vkJson = await snarkjs.zKey.exportVerifier("circuit_final.zkey", jsonPlugin, {});
const call = await snarkjs.zKey.exportCalldata(proof, publicSignals, jsonPlugin, { format: "compact" });
```

## Writing your own plugin

A plugin is a plain object (freeze it) with a unique `name`, `apiVersion: 1`,
and one or both capabilities:

```js
export default Object.freeze({
    name: "my-target",              // [a-z0-9-]+, unique among loaded plugins
    apiVersion: 1,
    description: "…",
    verifier: {
        // which (protocol, curve) pairs you can serve; anything else is
        // rejected before generate() runs, with an error naming your cells
        supports: [{ protocol: "groth16", curve: "bn128" }],
        defaultOutput: "verifier.rs",
        // return a string, or { files: { "relative/path": stringOrUint8Array } }
        async generate(vk, params, ctx) { … },
    },
    calldata: {
        supports: [{ protocol: "groth16", curve: "bn128" }],
        formats: ["contract-call", "cli"],      // optional; params.format selects
        async generate(proof, publicSignals, params, ctx) { … },
    },
    cli: { verifierUsage: "…", calldataUsage: "…", help: "…" },  // optional
});
```

- `params` from the CLI is `{ _: [extra positionals], format, ...yourFlags }`
  (any `--your-flag=value` the user passes reaches you untouched); from the
  library API it is whatever the caller passes.
- `ctx` gives you `logger`, `getCurveFromName` (curve arithmetic, e.g. for
  precomputing roots of unity), `render(ejsTemplate, data)` (lazy EJS —
  Node-only), and `utils` (`unstringifyBigInts`, `stringifyBigInts`,
  `leInt2Buff`, `leBuff2int`, `p256`). Using `ctx` means your plugin needs
  **zero dependencies**; EJS is a convenience, not a requirement.
- Curve names are normalized before matching (`bn254`/`alt_bn128` → `bn128`,
  `bls12-381` → `bls12381`).
