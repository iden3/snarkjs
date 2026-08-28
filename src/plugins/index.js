// Built-in export plugins. Library consumers import a plugin and pass the
// object to zKey.exportVerifier / zKey.exportCalldata explicitly -- there is
// no registry or global state (the CLI resolves names via snarkjs.config.mjs,
// see src/cli_plugin_loader.js, which is a CLI-only concern).
export { default as solidity } from "./solidity/index.js";
