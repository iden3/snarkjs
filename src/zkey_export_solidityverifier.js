import ejs from "ejs";

import exportVerificationKey from "./zkey_export_verificationkey.js";
import fflonkExportSolidityVerifierCmd from "./fflonk_export_solidity_verifier.js";
import processVerificationKeyForSolidity from "./zkey_process_verificationkey_for_solidity.js";
// Not ready yet
// module.exports.generateVerifier_kimleeoh = generateVerifier_kimleeoh;

export default async function exportSolidityVerifier(zKeyName, templates, logger) {

    let verificationKey = await exportVerificationKey(zKeyName, logger);
    let protocol = verificationKey.protocol;

    if ("fflonk" === protocol) {
        return fflonkExportSolidityVerifierCmd(verificationKey, templates, logger);
    }

    if (protocol === "groth16" && verificationKey.curve === "bls12381") {
        protocol = "groth16-bls12381";
        verificationKey = processVerificationKeyForSolidity(verificationKey);
    }

    let template = templates[protocol];

    return ejs.render(template, verificationKey);
}
