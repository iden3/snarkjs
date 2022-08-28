import config from "./rollup.iife.config";

export default {
    ...config,
    input: "worker.js",
    output: {
        ...config.output,
        file: "build/snarkjs.worker.js",
        sourcemap: false,
        // `Comlink.proxy` modifies the namespace object
        // This is only necessary because a shortcut was taken in exposing the imports
        freeze: false,
    },
    plugins: [
        ...config.plugins,
    ]
};
