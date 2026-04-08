import { defineConfig } from "vite";
import { builtinModules } from "module";
import { readFileSync } from "fs";
import { resolve } from "path";
import { playwright } from "@vitest/browser-playwright";

const pkg = JSON.parse(readFileSync(resolve("package.json"), "utf-8"));

// All declared dependencies + sub-paths treated as external in node/CLI builds
const nodeExternal = [
    ...builtinModules,
    ...Object.keys(pkg.dependencies || {}),
];
const isNodeExternal = (id) =>
    nodeExternal.includes(id) || nodeExternal.some((e) => id.startsWith(e + "/"));

// Deps bundled in browser build (everything except these externals)
const browserExternal = ["ffjavascript", "@iden3/binfileutils", "r1csfile"];
const isBrowserExternal = (id) =>
    browserExternal.includes(id) || browserExternal.some((e) => id.startsWith(e + "/"));

// Node-only source files excluded from browser builds (Solidity exporter requires ejs + fs).
// Rollup's load hook intercepts these by resolved absolute path and returns an empty stub
// so neither the files nor their transitive deps (ejs, r1csfile, etc.) enter the bundle.
const nodeOnlyFiles = new Set([
    resolve("src/zkey_export_solidityverifier.js"),
    resolve("src/fflonk_export_solidity_verifier.js"),
]);
const stubNodeOnlyModules = {
    name: "stub-node-only-modules",
    load(id) {
        if (nodeOnlyFiles.has(id)) return "export default null;";
    },
};

export default defineConfig(({ mode }) => {
    if (mode === "cli") {
        return {
            plugins: [
                {
                    name: "fix-import-meta-url-cjs",
                    renderChunk(code) {
                        if (!code.includes("{}.url")) return null;
                        return {
                            code: code.replace(
                                /\{\}\.url/g,
                                "require('url').pathToFileURL(__filename).href"
                            ),
                            map: null,
                        };
                    },
                },
            ],
            build: {
                lib: {
                    entry: "./cli.js",
                    formats: ["cjs"],
                    fileName: () => "cli.cjs",
                },
                minify: false,
                outDir: "build",
                emptyOutDir: false,
                rollupOptions: {
                    external: isNodeExternal,
                    output: {
                        banner: "#!/usr/bin/env node",
                        inlineDynamicImports: true,
                    },
                },
            },
        };
    }

    if (mode === "browser") {
        return {
            plugins: [stubNodeOnlyModules],
            build: {
                lib: {
                    entry: "./main.js",
                    name: "snarkjs",
                    formats: ["es"],
                    fileName: () => "browser.esm.js",
                },
                outDir: "build",
                emptyOutDir: false,
                rollupOptions: {
                    external: isBrowserExternal,
                },
            },
            define: { "process.browser": "true" },
            resolve: { conditions: ["browser"] },
        };
    }

    if (mode === "browser-iife") {
        return {
            plugins: [stubNodeOnlyModules],
            build: {
                lib: {
                    entry: "./main.js",
                    name: "snarkjs",
                    formats: ["iife"],
                    fileName: () => "snarkjs.min.js",
                },
                outDir: "build",
                emptyOutDir: false,
                minify: false,
                rollupOptions: {
                    external: isBrowserExternal,
                },
            },
            define: { "process.browser": "true" },
            resolve: { conditions: ["browser"] },
        };
    }

    // Node (default)
    return {
        build: {
            lib: {
                entry: "./main.js",
                formats: ["cjs"],
                fileName: () => "main.cjs",
            },
            outDir: "build",
            emptyOutDir: false,
            minify: false,
            rollupOptions: {
                external: isNodeExternal,
                output: {
                    inlineDynamicImports: true,
                },
            },
        },
        test: {
            projects: [
                {
                    test: {
                        name: "node-esm",
                        include: ["test/**/*.js"],
                        exclude: ["test/test.utils.js", "test/smart_contracts.test.js"],
                        environment: "node",
                        globals: true,
                        testTimeout: 300_000,
                        hookTimeout: 300_000,
                    },
                },
                {
                    test: {
                        name: "smart-contracts",
                        include: ["test/smart_contracts.test.js"],
                        environment: "node",
                        globals: true,
                        // Hardhat compile + zkSNARK proof generation can be slow
                        testTimeout: 600_000,
                        hookTimeout: 120_000,
                        // Run tests sequentially: each case deploys to the same in-process network
                        sequence: { concurrent: false },
                    },
                },
                {
                    define: { "process.browser": "true" },
                    resolve: { conditions: ["browser"] },
                    test: {
                        name: "browser-chromium",
                        include: ["test/groth16.test.js"],
                        browser: {
                            enabled: true,
                            provider: playwright(),
                            headless: true,
                            instances: [{ browser: "chromium" }],
                        },
                        globals: true,
                        testTimeout: 300_000,
                        hookTimeout: 300_000,
                    },
                },
            ],
        },
    };
});
