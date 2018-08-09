const G1Curve = require("./g1curve");
const G2Curve = require("./g2curve");
const GT = require("./gt");

const G1 = new G1Curve();
const G2 = new G2Curve();
const Gt = new GT();

const pairing = require("./pairing");

module.exports = function isValid(vk_verifier, proof, publicSignals) {

    for (let s= 0; s< vk_verifier.nPublic; s++) {
        full_pi_a  = G1.add( full_pi_a, G1.mulEscalar( vk_verifier.A[s], publicSignals[s]));
    }

    let  full_pi_a = G1.add(proof.pi_a, vk_verifier.A[vk_verifier.nPublic]);

    if (! Gt.equal(
        pairing( proof.pi_a , vk_verifier.vk_a ),
        pairing( proof.pi_ap , G2.g )))
        return false;

    if (! Gt.equal(
        pairing( vk_verifier.vk_b,  proof.pi_b ),
        pairing( proof.pi_ap , G2.g )))
        return false;

    if (! Gt.equal(
        pairing( proof.pi_c , vk_verifier.vk_c ),
        pairing( proof.pi_cp , G2.g )))
        return false;

    if (! Gt.equal(
        pairing( full_pi_a , proof.pi_b  ),
        Gt.mul(
            pairing( proof.pi_h , vk_verifier.vk_z ),
            pairing( proof.pi_b , G2.g  ),
        ),
        pairing( proof.pi_kp , vk_verifier.vk_g )))
        return false;

    if (! Gt.equal(
        Gt.mul(
            pairing( G1.add(full_pi_a, proof.pi_c) , vk_verifier.vk_gb_2 ),
            pairing( vk_verifier.vk_gb_1 , proof.pi_b ),
        ),
        pairing( proof.pi_kp , vk_verifier.vk_g )))
        return false;

    return true;
};
