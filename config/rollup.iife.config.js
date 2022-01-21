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
            ejs: empty,
        }),
        nodeResolve({
            browser: true,
            preferBuiltins: false,
            exportConditions: ['browser', 'default', 'module', 'require']
        }),
        commonJS(),
        replace({
            // The current default is false, but they are changing it next version
            preventAssignment: false,
            "process.browser": !!process.env.BROWSER
        }),
        visualizer(),
    ]
};
