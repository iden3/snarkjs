const path = require("path");
const fs = require("fs");

module.exports.generateVerifier_original = generateVerifier_original;
module.exports.generateVerifier_groth16 = generateVerifier_groth16;

// Not ready yet
// module.exports.generateVerifier_kimleeoh = generateVerifier_kimleeoh;


function generateVerifier_original(verificationKey) {
    let template = fs.readFileSync(path.join( __dirname, "..", "templates", "verifier_original.sol"), "utf-8");

    const vka_str = `[${verificationKey.vk_a[0][1].toString()},`+
                     `${verificationKey.vk_a[0][0].toString()}], `+
                    `[${verificationKey.vk_a[1][1].toString()},` +
                     `${verificationKey.vk_a[1][0].toString()}]`;
    template = template.replace("<%vk_a%>", vka_str);

    const vkb_str = `${verificationKey.vk_b[0].toString()},`+
                    `${verificationKey.vk_b[1].toString()}`;
    template = template.replace("<%vk_b%>", vkb_str);

    const vkc_str = `[${verificationKey.vk_c[0][1].toString()},`+
                     `${verificationKey.vk_c[0][0].toString()}], `+
                    `[${verificationKey.vk_c[1][1].toString()},` +
                     `${verificationKey.vk_c[1][0].toString()}]`;
    template = template.replace("<%vk_c%>", vkc_str);

    const vkg_str = `[${verificationKey.vk_g[0][1].toString()},`+
                      `${verificationKey.vk_g[0][0].toString()}], `+
                    `[${verificationKey.vk_g[1][1].toString()},` +
                     `${verificationKey.vk_g[1][0].toString()}]`;
    template = template.replace("<%vk_g%>", vkg_str);

    const vkgb1_str = `${verificationKey.vk_gb_1[0].toString()},`+
                      `${verificationKey.vk_gb_1[1].toString()}`;
    template = template.replace("<%vk_gb1%>", vkgb1_str);

    const vkgb2_str = `[${verificationKey.vk_gb_2[0][1].toString()},`+
                       `${verificationKey.vk_gb_2[0][0].toString()}], `+
                      `[${verificationKey.vk_gb_2[1][1].toString()},` +
                       `${verificationKey.vk_gb_2[1][0].toString()}]`;
    template = template.replace("<%vk_gb2%>", vkgb2_str);

    const vkz_str = `[${verificationKey.vk_z[0][1].toString()},`+
                     `${verificationKey.vk_z[0][0].toString()}], `+
                    `[${verificationKey.vk_z[1][1].toString()},` +
                     `${verificationKey.vk_z[1][0].toString()}]`;
    template = template.replace("<%vk_z%>", vkz_str);

    // The points

    template = template.replace("<%vk_input_length%>", (verificationKey.IC.length-1).toString());
    template = template.replace("<%vk_ic_length%>", verificationKey.IC.length.toString());
    let vi = "";
    for (let i=0; i<verificationKey.IC.length; i++) {
        if (vi != "") vi = vi + "        ";
        vi = vi + `vk.IC[${i}] = Pairing.G1Point(${verificationKey.IC[i][0].toString()},`+
                                                `${verificationKey.IC[i][1].toString()});\n`;
    }
    template = template.replace("<%vk_ic_pts%>", vi);

    return template;
}


function generateVerifier_groth16(verificationKey) {
    let template = fs.readFileSync(path.join( __dirname,  "..", "templates", "verifier_groth16.sol"), "utf-8");


    const vkalpha1_str = `${verificationKey.vk_alpha_1[0].toString()},`+
                        `${verificationKey.vk_alpha_1[1].toString()}`;
    template = template.replace("<%vk_alpha1%>", vkalpha1_str);

    const vkbeta2_str = `[${verificationKey.vk_beta_2[0][1].toString()},`+
                         `${verificationKey.vk_beta_2[0][0].toString()}], `+
                        `[${verificationKey.vk_beta_2[1][1].toString()},` +
                         `${verificationKey.vk_beta_2[1][0].toString()}]`;
    template = template.replace("<%vk_beta2%>", vkbeta2_str);

    const vkgamma2_str = `[${verificationKey.vk_gamma_2[0][1].toString()},`+
                          `${verificationKey.vk_gamma_2[0][0].toString()}], `+
                         `[${verificationKey.vk_gamma_2[1][1].toString()},` +
                          `${verificationKey.vk_gamma_2[1][0].toString()}]`;
    template = template.replace("<%vk_gamma2%>", vkgamma2_str);

    const vkdelta2_str = `[${verificationKey.vk_delta_2[0][1].toString()},`+
                          `${verificationKey.vk_delta_2[0][0].toString()}], `+
                         `[${verificationKey.vk_delta_2[1][1].toString()},` +
                          `${verificationKey.vk_delta_2[1][0].toString()}]`;
    template = template.replace("<%vk_delta2%>", vkdelta2_str);

    // The points

    template = template.replace("<%vk_input_length%>", (verificationKey.IC.length-1).toString());
    template = template.replace("<%vk_ic_length%>", verificationKey.IC.length.toString());
    let vi = "";
    for (let i=0; i<verificationKey.IC.length; i++) {
        if (vi != "") vi = vi + "        ";
        vi = vi + `vk.IC[${i}] = Pairing.G1Point(${verificationKey.IC[i][0].toString()},`+
                                                `${verificationKey.IC[i][1].toString()});\n`;
    }
    template = template.replace("<%vk_ic_pts%>", vi);

    return template;
}

function generateVerifier_kimleeoh(verificationKey) {

    assert(false); // Not implemented yet because it requires G2 exponentiation onchain.
    let template = fs.readFileSync(path.join( __dirname,  "..", "templates", "verifier_groth16.sol"), "utf-8");


    const vkalpha1_str = `${verificationKey.vk_alpha_1[0].toString()},`+
                        `${verificationKey.vk_alpha_1[1].toString()}`;
    template = template.replace("<%vk_alpha1%>", vkalpha1_str);

    const vkbeta2_str = `[${verificationKey.vk_beta_2[0][1].toString()},`+
                         `${verificationKey.vk_beta_2[0][0].toString()}], `+
                        `[${verificationKey.vk_beta_2[1][1].toString()},` +
                         `${verificationKey.vk_beta_2[1][0].toString()}]`;
    template = template.replace("<%vk_beta2%>", vkbeta2_str);

    const vkgamma2_str = `[${verificationKey.vk_gamma_2[0][1].toString()},`+
                          `${verificationKey.vk_gamma_2[0][0].toString()}], `+
                         `[${verificationKey.vk_gamma_2[1][1].toString()},` +
                          `${verificationKey.vk_gamma_2[1][0].toString()}]`;
    template = template.replace("<%vk_gamma2%>", vkgamma2_str);

    const vkdelta2_str = `[${verificationKey.vk_delta_2[0][1].toString()},`+
                          `${verificationKey.vk_delta_2[0][0].toString()}], `+
                         `[${verificationKey.vk_delta_2[1][1].toString()},` +
                          `${verificationKey.vk_delta_2[1][0].toString()}]`;
    template = template.replace("<%vk_delta2%>", vkdelta2_str);

    // The points

    template = template.replace("<%vk_input_length%>", (verificationKey.IC.length-1).toString());
    template = template.replace("<%vk_ic_length%>", verificationKey.IC.length.toString());
    let vi = "";
    for (let i=0; i<verificationKey.IC.length; i++) {
        if (vi != "") vi = vi + "        ";
        vi = vi + `vk.IC[${i}] = Pairing.G1Point(${verificationKey.IC[i][0].toString()},`+
                                                `${verificationKey.IC[i][1].toString()});\n`;
    }
    template = template.replace("<%vk_ic_pts%>", vi);

    return template;
}
