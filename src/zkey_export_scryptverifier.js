import * as fastFile from "fastfile";
import ejs from "ejs";

import exportVerificationKey from "./zkey_export_verificationkey.js";
// Not ready yet
// module.exports.generateVerifier_kimleeoh = generateVerifier_kimleeoh;



export default async function exportScryptVerifier(zKeyName, templates, logger) {

    const verificationKey = await exportVerificationKey(zKeyName, logger);

    let template = templates[verificationKey.protocol];

    return ejs.render(template,  verificationKey);
}
