import resolve from "rollup-plugin-node-resolve";
import commonJS from "rollup-plugin-commonjs";

export default {
    input: "main.js",
    output: {
        file: "build/main.cjs",
        format: "cjs",
    },
    external: [
        "fs",
        "os",
        "worker_threads",
        "readline",
        "crypto",
        "path",
        "big-integer",
        "wasmsnark",
        "circom_runtime",
        "blake2b-wasm",

        "ffjavascript",
        "keccak",
        "yargs",
        "logplease"
    ],
    plugins: [
        resolve({ preferBuiltins: true }),
        commonJS({
            preserveSymlinks: true
        }),
    ]
};
