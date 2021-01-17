import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonJS from "@rollup/plugin-commonjs";
import virtual from '@rollup/plugin-virtual';
import replace from '@rollup/plugin-replace';
import { terser } from "rollup-plugin-terser";

const empty = 'export default {}';

export default {
    input: "main.js",
    output: {
        file: "build/snarkjs.min.js",
        format: "iife",
        globals: {
            os: "null"
        },
        name: "snarkjs"
    },
    plugins: [
        virtual({
            fs: empty,
            os: empty,
            crypto: empty,
            readline: empty,
            worker_threads: empty,
        }),
        nodeResolve(),
        commonJS(),
        replace({ "process.browser": !!process.env.BROWSER }),
        terser()
    ]
};
