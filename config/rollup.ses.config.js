import config from './rollup.iife.config';
import fs from "fs";
import { builtinModules as builtin } from "module";
import jscc from 'rollup-plugin-jscc';
import replace from "@rollup/plugin-replace";

const pkg = JSON.parse(fs.readFileSync("./package.json"));
delete pkg.dependencies["ejs"];

export default {
    input: "main.js",
    output: {
        file: "build/main.ses.cjs",
        format: "cjs",
    },
    external: [
        ...Object.keys(pkg.dependencies),
        ...builtin,
    ],
    plugins:[
        ...config.plugins,
        jscc({
            values: { _SES: process.env.SES },
        }),
        replace({
            // To silence to warning, the current default is false, but they are changing it next version
            preventAssignment: false,
            "process.ses": !!process.env.SES
        }),
    ]
};
