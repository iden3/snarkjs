import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonJS from "@rollup/plugin-commonjs";
import inject from "@rollup/plugin-inject";
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
            // Stub out a "global" module that we can inject later
            global: empty,
        }),
        nodeResolve({
            browser: true,
            preferBuiltins: false,
            exportConditions: ['browser', 'default', 'module', 'require']
        }),
        commonJS(),
        replace({
            "process.browser": !!process.env.BROWSER
        }),
        inject({
            // Inject the "global" virtual module if we see any reference to `global` in the code
            global: "global",
        }),
        visualizer(),
    ]
};
