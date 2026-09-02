import exportVerificationKey from "./zkey_export_verificationkey.js";
import fflonkExportSolidityVerifierCmd from "./fflonk_export_solidity_verifier.js";
import { render, assertDecimalStringLeaves } from "./template_render.js";
// Not ready yet
// module.exports.generateVerifier_kimleeoh = generateVerifier_kimleeoh;

export default async function exportSolidityVerifier(zKeyName, templates, logger) {

    const verificationKey = await exportVerificationKey(zKeyName, logger);

    if ("fflonk" === verificationKey.protocol) {
        return fflonkExportSolidityVerifierCmd(verificationKey, templates, logger);
    }

    let template = templates[verificationKey.protocol];

    // every interpolated value must be a plain number: a poisoned vk must
    // not be able to smuggle source text into the generated contract
    assertDecimalStringLeaves(verificationKey, ["protocol", "curve"]);

    return render(template, verificationKey);
}
