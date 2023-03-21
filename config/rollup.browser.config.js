import fs from "fs";
import config from './rollup.iife.config';
import { builtinModules as builtin } from "module";

const pkg = JSON.parse(fs.readFileSync("./package.json"));

export default {
    ...config,
    output: {
        ...config.output,
        file: "build/snarkjs.js",
        format: "esm"
    },
    external: [
        ...Object.keys(pkg.dependencies),
        ...builtin,
    ]
};
