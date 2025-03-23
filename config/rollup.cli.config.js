import fs from "fs";
import { builtinModules as builtin } from "module";

const pkg = JSON.parse(fs.readFileSync("./package.json"));

export default {
    input: "cli.js",
    output: {
        file: "build/cli.cjs",
        format: "cjs",
        banner: "#! /usr/bin/env node\n",
    },
    external: [
        "@noble/hashes/blake2b",
        "@noble/hashes/utils",
        "@noble/hashes/sha3",
        ...Object.keys(pkg.dependencies),
        ...builtin,
    ]
};
