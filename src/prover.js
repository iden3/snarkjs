const bigInt = require("big-integer");

const ZnField = require("./znfield.js");
const G1Curve = require("./g1curve");
const G2Curve = require("./g2curve");
const PolField = require("./polfield.js");

const F = new ZnField(bigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617"));
const G1 = new G1Curve();
const G2 = new G2Curve();
const PolF = new PolField(F);


module.exports = function genProof(vk_proof, witness) {

    const proof = {};

    proof.pi_a = G1.zero();
    proof.pi_ap = G1.zero();
    proof.pi_b = G2.zero();
    proof.pi_bp = G2.zero();
    proof.pi_c = G1.zero();
    proof.pi_cp = G1.zero();
    proof.pi_kp = G1.zero();
    proof.pi_h = G1.zero();


    // Skip public entries and the "1" signal that are forced by the verifier
    for (let s= vk_proof.nPublic+1; s< vk_proof.nSignals; s++) {

        // pi_a  = pi_a  + A[s]  * witness[s];
        proof.pi_a  = G1.add( proof.pi_a, G1.mulEscalar( vk_proof.A[s], witness[s]));

        // pi_ap = pi_ap + Ap[s] * witness[s];
        proof.pi_ap = G1.add( proof.pi_ap, G1.mulEscalar( vk_proof.Ap[s], witness[s]));
    }

    for (let s= 0; s< vk_proof.nSignals; s++) {
        // pi_a  = pi_a  + A[s]  * witness[s];
        proof.pi_b  = G2.add( proof.pi_b, G1.mulEscalar( vk_proof.B[s], witness[s]));

        // pi_ap = pi_ap + Ap[s] * witness[s];
        proof.pi_bp = G1.add( proof.pi_bp, G1.mulEscalar( vk_proof.Bp[s], witness[s]));

        // pi_a  = pi_a  + A[s]  * witness[s];
        proof.pi_c  = G1.add( proof.pi_c, G1.mulEscalar( vk_proof.C[s], witness[s]));

        // pi_ap = pi_ap + Ap[s] * witness[s];
        proof.pi_cp = G1.add( proof.pi_cp, G1.mulEscalar( vk_proof.Cp[s], witness[s]));

        // pi_ap = pi_ap + Ap[s] * witness[s];
        proof.pi_kp = G1.add( proof.pi_kp, G1.mulEscalar( vk_proof.Kp[s], witness[s]));
    }

    let polA = [];
    let polB = [];
    let polC = [];

    for (let s= 0; s< vk_proof.nSignals; s++) {
        polA = PolF.add(
            polA,
            PolF.mul(
                vk_proof.polsA[s],
                [witness[s]] ));

        polB = PolF.add(
            polB,
            PolF.mul(
                vk_proof.polsB[s],
                [witness[s]] ));

        polC = PolF.add(
            polC,
            PolF.mul(
                vk_proof.polsC[s],
                [witness[s]] ));
    }

    let polFull = PolF.sub(PolF.mul( polA, polB), polC);

    const h = PolF.div(polFull, vk_proof.polZ );

    for (let i = 0; i < h.length; i++) {
        proof.pi_h = G1.add( proof.pi_h, G1.mulEscalar( vk_proof.hExps[i], h[i]));
    }

};
