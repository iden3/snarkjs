import resolve from "rollup-plugin-node-resolve";
import commonJS from "rollup-plugin-commonjs";
import ignore from "rollup-plugin-ignore";
import replace from "rollup-plugin-replace";

export default {
    input: "main.js",
    output: {
        file: "build/snarkjs.js",
        format: "iife",
        sourcemap: "inline",
        globals: {
            os: "null"
        },
        name: "snarkjs"
    },
    plugins: [
        ignore(["fs", "os", "crypto", "readline", "worker_threads"]),
        resolve(),
        commonJS(),
        replace({ "process.browser": !!process.env.BROWSER }),
    ]
};
