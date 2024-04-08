import ejs from "ejs";

import exportVerificationKey from "./zkey_export_verificationkey.js";

export default async function exportSophiaVerifier(zKeyName, templates, logger) {

    const verificationKey = await exportVerificationKey(zKeyName, logger);

    if ("groth16" === verificationKey.protocol) {
        let template = templates[verificationKey.protocol];

        return ejs.render(template, verificationKey);
    }

    if (logger) logger.error(`Protocol ${verificationKey.protocol} is not supported for Sophia verifier export`);

    throw new Error("Unsupported verifier export format");
}
