import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonJS from "@rollup/plugin-commonjs";
import virtual from "@rollup/plugin-virtual";
import replace from "@rollup/plugin-replace";
import visualizer from "rollup-plugin-visualizer";

const empty = "export default {}";

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
        virtual({
            fs: empty,
            os: empty,
            crypto: empty,
            readline: empty,
            worker_threads: empty,
        }),
        nodeResolve({
            browser: true
        }),
        commonJS(),
        replace({
            "process.browser": !!process.env.BROWSER
        }),
        visualizer(),
    ]
};
