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
        "@noble/hashes/blake2b",
        "@noble/hashes/utils",
        "@noble/hashes/sha3",
        ...Object.keys(pkg.dependencies),
        ...builtin,
    ]
};
