// Legacy entry point, kept for back-compat (public API:
// zKey.exportSolidityVerifier(zKeyName, templates, logger)). Routes through
// the built-in solidity export plugin; output is byte-identical.
import exportVerifier from "./zkey_export_verifier.js";
import solidityPlugin from "./plugins/solidity/index.js";

export default async function exportSolidityVerifier(zKeyName, templates, logger) {
    return exportVerifier(zKeyName, solidityPlugin, { templates }, { logger });
}
