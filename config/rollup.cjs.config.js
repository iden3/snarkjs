import fs from "fs";
import { builtinModules as builtin } from "module";

const pkg = JSON.parse(fs.readFileSync("./package.json"));

export default {
    input: "main.js",
    output: {
        file: "build/main.cjs",
        format: "cjs",
    },
    external: [
        "@noble/hashes/blake2.js",
        "@noble/hashes/utils.js",
        "@noble/hashes/sha3.js",
        ...Object.keys(pkg.dependencies),
        ...builtin,
    ]
};
