import { defineConfig } from "vite";
import { builtinModules } from "module";
import { readFileSync } from "fs";
import { resolve } from "path";
import { playwright } from "@vitest/browser-playwright";

const pkg = JSON.parse(readFileSync(resolve("package.json"), "utf-8"));

// All declared dependencies + sub-paths treated as external in node/CLI builds
// (this keeps bfj/ejs external and lazily required, so the CLI starts fast).
const nodeExternal = [
    ...builtinModules,
    ...Object.keys(pkg.dependencies || {}),
];
const isNodeExternal = (id) =>
    nodeExternal.includes(id) || nodeExternal.some((e) => id.startsWith(e + "/"));

// Browser ESM externalizes the sibling packages so the consumer's bundler
// dedupes them; the self-contained IIFE bundles them instead (see below).
const browserExternal = ["ffjavascript", "@iden3/binfileutils", "r1csfile"];
const isBrowserExternal = (id) =>
    browserExternal.includes(id) || browserExternal.some((e) => id.startsWith(e + "/"));

// Node-only source files excluded from browser builds (the Solidity exporters
// pull in ejs + fs). Returning an empty stub keeps them and their transitive
// deps out of the bundle.
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

const emptyStub = resolve("build-config/empty-stub.js");
const constantsStub = resolve("build-config/constants-stub.js");
const wasmToolchainStub = resolve("build-config/wasm-toolchain-stub.js");
// Browser aliases: Node built-ins reachable only from node-specific code paths
// (getRandomBytes/getSHA256 fall back to globalThis.crypto) and the wasm codegen
// toolchain (custom-plugins path, never taken) are stubbed so the self-contained
// IIFE stays lean and free of unresolved `require` calls.
const browserAlias = {
    fs: emptyStub,
    os: emptyStub,
    readline: emptyStub,
    crypto: emptyStub,
    constants: constantsStub,
    wasmbuilder: wasmToolchainStub,
    wasmcurves: wasmToolchainStub,
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
            resolve: { conditions: ["browser"], alias: browserAlias },
        };
    }

    if (mode === "browser-iife") {
        // Self-contained IIFE: bundles ffjavascript/binfileutils/r1csfile so a
        // bare <script src="snarkjs.min.js"> exposes a working window.snarkjs
        // with no other globals to load (matches the pre-Vite behaviour). Node
        // built-ins and the wasm codegen toolchain are stubbed (browserAlias).
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
                minify: true,
            },
            define: { "process.browser": "true" },
            resolve: { conditions: ["browser"], alias: browserAlias },
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
                        exclude: ["test/test.utils.js"],
                        environment: "node",
                        globals: true,
                        testTimeout: 600_000,
                        hookTimeout: 600_000,
                        // Each suite builds its own curve with a full worker
                        // pool; running files concurrently oversubscribes the
                        // CPU badly enough that the large-domain FFT tests
                        // starve. Sequential files, like mocha.
                        fileParallelism: false,
                    },
                },
                {
                    define: { "process.browser": "true" },
                    resolve: { conditions: ["browser"], alias: browserAlias },
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
                        testTimeout: 600_000,
                        hookTimeout: 600_000,
                    },
                },
            ],
        },
    };
});
