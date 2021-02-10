import config from './rollup.iife.config';
import { terser } from "rollup-plugin-terser";

export default {
    ...config,
    output: {
        ...config.output,
        file: "build/snarkjs.min.js",
        sourcemap: false,
    },
    plugins: [
        ...config.plugins,
        terser(),
    ]
};
