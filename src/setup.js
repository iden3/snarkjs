const bigInt = require("big-integer");

const ZnField = require("./znfield.js");
const PolField = require("./polfield.js");
const G1Curve = require("./g1curve");
const G2Curve = require("./g2curve");

const F = new ZnField(bigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617"));
const PolF = new PolField(F);
const G1 = new G1Curve();
const G2 = new G2Curve();

module.exports = function setup(circuit) {
    const setup = {
        vk_proof : {
            nSignals: circuit.nSignals,
            nPublic: circuit.nPublic
        },
        vk_verifier: {
            nPublic: circuit.nPublic
        },
        toxic: {}
    };

    calculatePolinomials(setup, circuit);
    setup.toxic.t = F.random();
    calculateEncriptedValuesAtT(setup, circuit);
    calculateHexps(setup, circuit);
};

function calculatePolinomials(setup, circuit) {
    // Calculate the points that must cross each polinomial
    const aPoints = [];
    const bPoints = [];
    const cPoints = [];
    for (let s = 0; circuit.nSignals; s++) {
        aPoints[s] = [];
        bPoints[s] = [];
        cPoints[s] = [];
        for (let c=0; c<circuit.nConstrains; c++) {
            aPoints[s].push([bigInt(c), circuit.a(c, s)]);
            bPoints[s].push([bigInt(c), circuit.b(c, s)]);
            cPoints[s].push([bigInt(c), circuit.c(c, s)]);
        }
    }

    // Calculate the polinomials using Lagrange
    setup.vk_proof.polsA = [];
    setup.vk_proof.polsB = [];
    setup.vk_proof.polsC = [];
    for (let s=0; s<circuit.nSignals; s++) {
        setup.vk_proof.polsA.push(PolF.lagrange( aPoints[s] ));
        setup.vk_proof.polsB.push(PolF.lagrange( bPoints[s] ));
        setup.vk_proof.polsC.push(PolF.lagrange( cPoints[s] ));
    }

    // Calculate Z polinomial
    // Z = 1
    setup.vk_proof.polZ = [bigInt(1)];
    for (let c=0; c<circuit.nConstrains; c++) {
        // Z = Z * (x - p_c)
        setup.vk_proof.polZ = PolF.mul(
            setup.vk_proof.polZ,
            [F.neg(bigInt(c)), bigInt(1)] );
    }
}

function calculateEncriptedValuesAtT(setup, circuit) {
    setup.vk_proof.A = [];
    setup.vk_proof.B = [];
    setup.vk_proof.C = [];
    setup.vk_proof.Ap = [];
    setup.vk_proof.Bp = [];
    setup.vk_proof.Cp = [];
    setup.vk_proof.Kp = [];
    setup.vk_verifier.A = [];

    setup.toxic.ka = F.random();
    setup.toxic.kb = F.random();
    setup.toxic.kc = F.random();
    setup.toxic.kbeta = F.random();
    setup.toxic.kgamma = F.random();

    const gb = F.mul(setup.toxic.kbeta, setup.toxic.kgamma);

    setup.vk_verifier.vk_a = G2.mulEscalar( G2.g, setup.toxic.ka);
    setup.vk_verifier.vk_b = G1.mulEscalar( G1.g, setup.toxic.kb);
    setup.vk_verifier.vk_c = G2.mulEscalar( G2.g, setup.toxic.kc);
    setup.vk_verifier.vk_gb_1 = G1.mulEscalar( G1.g, gb);
    setup.vk_verifier.vk_gb_2 = G2.mulEscalar( G2.g, gb);
    setup.vk_verifier.vk_g = G2.mulEscalar( G2.g, setup.toxic.kgamma);

    for (let s=0; s<circuit.nSignals; s++) {

        // A[i] = G1 * polA(t)
        const A = G1.mulEscalar(
            G1.g,
            PolF.eval(setup.vk_proof.polsA[s], setup.vk_proof.t));
        setup.vk_proof.A.push(A);

        if (s < circuit.nPublicSignals) {
            setup.vk_verifier.A.pusj(A);
        }

        // B1[i] = G1 * polB(t)
        const B1 = G1.mulEscalar(
            G1.g,
            PolF.eval(setup.vk_proof.polsB[s], setup.vk_proof.t));

        // B2[i] = G2 * polB(t)
        const B2 = G2.mulEscalar(
            G2.g,
            PolF.eval(setup.vk_proof.polsB[s], setup.vk_proof.t));
        setup.vk_proof.B.push(B2);

        // C[i] = G1 * polC(t)
        const C = G1.mulEscalar(
            G1.g,
            PolF.eval(setup.vk_proof.polsC[s], setup.vk_proof.t));
        setup.vk_proof.C.push (C);

        // K = G1 * (A+B+C)
        const K = G1.mulEscalar(
            G1.g,
            G1.add(G1.add(A, B1), C));

        setup.vk_proof.Ap.push(G1.mulEscalar(A, setup.toxic.ka));
        setup.vk_proof.Bp.push(G1.mulEscalar(B1, setup.toxic.kb));
        setup.vk_proof.Cp.push(G1.mulEscalar(C, setup.toxic.kc));
        setup.vk_proof.Kp.push(G1.mulEscalar(K, setup.toxic.beta));
    }

    setup.vk_verifier.vk_z = G2.mulEscalar(
        G2.g,
        PolF.eval(setup.vk_proof.polZ, setup.vk_proof.t));
}

function calculateHexps(setup, circuit) {
    let maxA = 0;
    let maxB = 0;
    let maxC = 0;
    for (let s=0; s<circuit.nSignals; s++) {
        maxA = Math.max(maxA, setup.vk_proof.polsA[s]);
        maxB = Math.max(maxB, setup.vk_proof.polsB[s]);
        maxC = Math.max(maxC, setup.vk_proof.polsC[s]);
    }

    let maxFull = Math.max(maxA * maxB - 1, maxC);

    const maxH = maxFull - setup.vk_proof.polZ.length + 1;

    setup.vk_proof.hExps = new Array(maxH);
    setup.vk_proof.hExps[0] = G1.g;
    let eT = setup.toxic.t;
    for (let i=1; i<maxH; i++) {
        setup.vk_proof.hExps[i] = G1.mulEscalar(G1.g, eT);
        eT = F.mul(eT, setup.toxic.t);
    }
}

