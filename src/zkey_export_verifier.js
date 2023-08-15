import exportVerificationKey from "./zkey_export_verificationkey.js";

export default async function exportVerifier(zKeyName, funcs, logger) {
    const verificationKey = await exportVerificationKey(zKeyName, logger);

    return funcs[verificationKey.protocol](verificationKey, logger);
}
