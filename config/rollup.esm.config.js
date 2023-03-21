import fs from "fs";
import { builtinModules as builtin } from "module";

const pkg = JSON.parse(fs.readFileSync("./package.json"));

export default {
    input: "main.js",
    output: {
        file: "build/main.js",
        format: "esm",
    },
    external: [
        ...Object.keys(pkg.dependencies),
        ...builtin,
    ]
};
