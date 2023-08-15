import exportVerificationKey from "./zkey_export_verificationkey.js";

export default async function exportVerifier(zKeyName, pluginName, logger) {
    const { verifiers } = await import(pluginName);
    const verificationKey = await exportVerificationKey(zKeyName, logger);

    return verifiers[verificationKey.protocol](verificationKey, logger);
}
