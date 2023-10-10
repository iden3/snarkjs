import fs from "fs";
import { builtinModules as builtin } from "module";

const pkg = JSON.parse(fs.readFileSync("./package.json"));

let externals = [
    ...Object.keys(pkg.dependencies),
    ...builtin,
];

export default {
    input: "main.js",
    output: {
        file: "build/main.cjs",
        format: "cjs",
    },
    external: (id) => externals.some((pkg) => id.startsWith(pkg))
};
