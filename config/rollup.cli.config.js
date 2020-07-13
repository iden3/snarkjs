import resolve from "rollup-plugin-node-resolve";
import commonJS from "rollup-plugin-commonjs";
import json from "rollup-plugin-json";

export default {
    input: "cli.js",
    output: {
        file: "build/cli.cjs",
        format: "cjs",
        banner: "#! /usr/bin/env node\n",
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
        "logplease",

        "app-root-path"
    ],
    plugins: [
        resolve({
            preferBuiltins: true,
        }),
        commonJS({
            preserveSymlinks: true,
            include: "node_modules/**",
            exclude: "node_modules/big-integer/**"
        }),
        json()
    ]
};
