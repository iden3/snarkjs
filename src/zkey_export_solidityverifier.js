import ejs from "ejs";

import exportVerificationKey from "./zkey_export_verificationkey.js";
import fflonkExportSolidityVerifierCmd from "./fflonk_export_solidity_verifier.js";
// Not ready yet
// module.exports.generateVerifier_kimleeoh = generateVerifier_kimleeoh;

export default async function exportSolidityVerifier(zKeyName, templates, logger) {

    const verificationKey = await exportVerificationKey(zKeyName, logger);

    if ("fflonk" === verificationKey.protocol) {
        return fflonkExportSolidityVerifierCmd(verificationKey, templates, logger);
    }

    let template = templates[verificationKey.protocol];

    return ejs.render(template, verificationKey);
}
