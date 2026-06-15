import js from "@eslint/js";
import globals from "globals";

export default [
    { ignores: ["build/**", "templates/**", "credentialAtomicQueryV3OnChain/**", "test/circuit2/**", "smart_contract_tests/**", "scripts/**"] },
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                ...globals.node,
                ...globals.browser,
                describe: "readonly",
                it: "readonly",
                test: "readonly",
                expect: "readonly",
                beforeAll: "readonly",
                afterAll: "readonly",
                beforeEach: "readonly",
                afterEach: "readonly",
                vi: "readonly",
                globalThis: "readonly",
            },
        },
        rules: {
            indent: ["error", 4],
            "linebreak-style": ["warn", "unix"],
            quotes: ["error", "double"],
            semi: ["error", "always"],
            "no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_", "caughtErrorsIgnorePattern": "^_" }],
        },
    },
];
