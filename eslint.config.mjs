import js from "@eslint/js";
import globals from "globals";

export default [
    { ignores: ["build/", "templates/", "browser_tests/", ".clinic/", "artifacts/", "cache/", "contracts/"] },
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                ...globals.node,
                ...globals.mocha,
            },
        },
        rules: {
            // Unused function params are kept for API shape (logger, curve, ...).
            "no-unused-vars": ["error", { args: "none" }],
            // The prover deliberately nulls large buffers before globalThis.gc()
            // to release memory early; this rule flags exactly that idiom.
            "no-useless-assignment": "off",
            "indent": ["error", 4],
            "linebreak-style": ["error", "unix"],
            "quotes": ["error", "double"],
            "semi": ["error", "always"],
        },
    },
];
