import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonJS from "@rollup/plugin-commonjs";
import virtual from "@rollup/plugin-virtual";
import replace from "@rollup/plugin-replace";
// Needed by fastfile
import { O_TRUNC, O_CREAT, O_RDWR, O_EXCL, O_RDONLY } from "constants";

const empty = "export default {}";
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
        file: "build/esm.js",
        format: "es",
    },
    external: ["ffjavascript"],
    plugins: [
        replace({
            // The current default is false, but they are changing it next version
            preventAssignment: false,
            "process.browser": true,
        }),
        virtual({
            fs: empty,
            os: empty,
            crypto: empty,
            readline: empty,
            ejs: empty,
            events: empty,
            stream: empty,
            util: empty,
            constants,
        }),
        nodeResolve({
            browser: true,
            preferBuiltins: false,
            exportConditions: ["module"],
        }),
        commonJS(),
    ],
    treeshake: {
        preset: "smallest",
    },
};
