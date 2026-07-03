import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonJS from "@rollup/plugin-commonjs";
import virtual from "@rollup/plugin-virtual";
import replace from "@rollup/plugin-replace";
import visualizer from "rollup-plugin-visualizer";
// Needed by fastfile
import { O_TRUNC, O_CREAT, O_RDWR, O_EXCL, O_RDONLY } from "constants";

const empty = "export default {}";
// Runtime wasm codegen toolchain (wasmbuilder + the wasmcurves generators).
// Only reachable through ffjavascript's custom-`plugins` curve-build path,
// which snarkjs never takes: the prebuilt vendored wasm is always used.
// `inlineDynamicImports` would otherwise fold the whole toolchain into the
// single-file bundle. IIFE output cannot keep external dynamic imports, so
// stub the packages with a clear error instead.
const wasmToolchainStub = (name) => `
const err = () => { throw new Error("${name} is not included in the snarkjs browser bundle (only needed when building a curve with custom wasm plugins)"); };
export class ModuleBuilder { constructor() { err(); } }
export const buildBn128 = err;
export const buildBls12381 = err;
export default {};
`;
// We create a stub with these constants instead of including the entire constants definition
const constants = `
export const O_TRUNC = ${O_TRUNC};
export const O_CREAT = ${O_CREAT};
export const O_RDWR = ${O_RDWR};
export const O_EXCL = ${O_EXCL};
export const O_RDONLY = ${O_RDONLY}
`;

export default {
    input: "main.js",
    output: {
        file: "build/snarkjs.js",
        format: "iife",
        sourcemap: "inline",
        globals: {
            os: "null"
        },
        name: "snarkjs",
        inlineDynamicImports: true,
    },
    plugins: [
        virtual({
            fs: empty,
            os: empty,
            crypto: empty,
            readline: empty,
            ejs: empty,
            events: empty,
            stream: empty,
            util: empty,
            constants: constants,
            wasmbuilder: wasmToolchainStub("wasmbuilder"),
            wasmcurves: wasmToolchainStub("wasmcurves"),
        }),
        nodeResolve({
            browser: true,
            preferBuiltins: false,
            exportConditions: ["browser", "default", "module", "require"]
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
