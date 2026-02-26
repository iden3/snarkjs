import ejs from "ejs";

import exportVerificationKey from "./zkey_export_verificationkey.js";
import fflonkExportSolidityVerifierCmd from "./fflonk_export_solidity_verifier.js";
// Not ready yet
// module.exports.generateVerifier_kimleeoh = generateVerifier_kimleeoh;

export default async function exportSolidityVerifier(zKeyName, templates, logger) {

    const verificationKey = await exportVerificationKey(zKeyName, logger);

    if (verificationKey.protocol === "groth16") {
        const vkGamma2 = JSON.stringify(verificationKey.vk_gamma_2);
        const vkDelta2 = JSON.stringify(verificationKey.vk_delta_2);
        if (vkGamma2 === vkDelta2) {
            throw new Error("SOUNDNESS ERROR: vk_gamma_2 and vk_delta_2 are equal. This zkey is insecure, it likely has no phase 2 contribution. Proofs can be forged. Run 'snarkjs zkey contribute' before exporting.");
        }
    }

    if ("fflonk" === verificationKey.protocol) {
        return fflonkExportSolidityVerifierCmd(verificationKey, templates, logger);
    }

    let template = templates[verificationKey.protocol];

    return ejs.render(template, verificationKey);
}
