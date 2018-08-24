const BN128 = require("./BN128.js");

const bn128 = new BN128();
const G1 = bn128.G1;
const G2 = bn128.G2;

const pairing = bn128.pairing;

module.exports = function isValid(vk_verifier, proof, publicSignals) {

    let full_pi_a = vk_verifier.A[0];
    for (let s= 0; s< vk_verifier.nPublic; s++) {
        full_pi_a  = G1.add( full_pi_a, G1.mulScalar( vk_verifier.A[s+1], publicSignals[s]));
    }

    full_pi_a  = G1.add( full_pi_a, proof.pi_a);

    if (! bn128.F12.equals(
        bn128.pairing( proof.pi_a , vk_verifier.vk_a ),
        bn128.pairing( proof.pi_ap , G2.g )))
        return false;

    if (! bn128.F12.equals(
        bn128.pairing( vk_verifier.vk_b,  proof.pi_b ),
        bn128.pairing( proof.pi_bp , G2.g )))
        return false;

    if (! bn128.F12.equals(
        bn128.pairing( proof.pi_c , vk_verifier.vk_c ),
        bn128.pairing( proof.pi_cp , G2.g )))
        return false;

    if (! bn128.F12.equals(
        bn128.pairing( full_pi_a , proof.pi_b  ),
        bn128.F12.mul(
            bn128.pairing( proof.pi_h , vk_verifier.vk_z ),
            bn128.pairing( proof.pi_c , G2.g  ),
        )))
        return false;

    if (! bn128.F12.equals(
        bn128.F12.mul(
            bn128.pairing( G1.add(full_pi_a, proof.pi_c) , vk_verifier.vk_gb_2 ),
            bn128.pairing( vk_verifier.vk_gb_1 , proof.pi_b ),
        ),
        bn128.pairing( proof.pi_kp , vk_verifier.vk_g )))
        return false;



    return true;
};
