import * as fastFile from "fastfile";
import ejs from "ejs";

import exportVerificationKey from "./zkey_export_verificationkey.js";
// Not ready yet
// module.exports.generateVerifier_kimleeoh = generateVerifier_kimleeoh;



export default async function exportSolidityVerifier(zKeyName, templates, logger) {

    const verificationKey = await exportVerificationKey(zKeyName, logger);

    const useCustomGates = "customGates" in verificationKey
        && Array.isArray(verificationKey["customGates"]) && verificationKey["customGates"].length > 0;

    let template = useCustomGates ? templates["RCplonk"] : templates[verificationKey.protocol];

    return ejs.render(template ,  verificationKey);
}
