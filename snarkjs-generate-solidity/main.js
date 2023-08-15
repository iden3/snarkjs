import ejs from "ejs";
import fs from "fs";
import path from "path";
import { buildBn128, buildBls12381, utils } from "ffjavascript";

const {unstringifyBigInts, stringifyBigInts} = utils;

async function getCurveFromName(name) {
    let curve;
    const normName = normalizeName(name);
    if (["BN128", "BN254", "ALTBN128"].indexOf(normName) >= 0) {
        curve = await buildBn128();
    } else if (["BLS12381"].indexOf(normName) >= 0) {
        curve = await buildBls12381();
    } else {
        throw new Error(`Curve not supported: ${name}`);
    }
    return curve;

    function normalizeName(n) {
        return n.toUpperCase().match(/[A-Za-z0-9]+/g).join("");
    }
}


async function groth16SolidityVerifier(verificationKey, logger) {
    const template = await fs.promises.readFile(path.join(__dirname, "templates", "verifier_groth16.sol.ejs"), "utf8");
    return ejs.render(template, verificationKey);
}

async function plonkSolidityVerifier(verificationKey, logger) {
    const template = await fs.promises.readFile(path.join(__dirname, "templates", "verifier_plonk.sol.ejs"), "utf8");
    return ejs.render(template, verificationKey);
}

async function fflonkSolidityVerifier(vk, logger) {

    if (logger) logger.info("FFLONK EXPORT SOLIDITY VERIFIER STARTED");

    const curve = await getCurveFromName(vk.curve);

    // Precompute w3_2, w4_2 and w4_3
    let w3 = fromVkey(vk.w3);
    vk.w3_2 = toVkey(curve.Fr.square(w3));

    let w4 = fromVkey(vk.w4);
    vk.w4_2 = toVkey(curve.Fr.square(w4));
    vk.w4_3 = toVkey(curve.Fr.mul(curve.Fr.square(w4), w4));

    let w8 = fromVkey(vk.w8);
    let acc = curve.Fr.one;

    for (let i = 1; i < 8; i++) {
        acc = curve.Fr.mul(acc, w8);
        vk["w8_" + i] = toVkey(acc);
    }

    let template = await fs.promises.readFile(path.join(__dirname, "templates", "verifier_fflonk.sol.ejs"), "utf8");

    if (logger) logger.info("FFLONK EXPORT SOLIDITY VERIFIER FINISHED");

    return ejs.render(template, vk);

    function fromVkey(str) {
        const val = unstringifyBigInts(str);
        return curve.Fr.fromObject(val);
    }

    function toVkey(val) {
        const str = curve.Fr.toObject(val);
        return stringifyBigInts(str);
    }
}

export const verifiers = {
    groth16: groth16SolidityVerifier,
    plonk: plonkSolidityVerifier,
    fflonk: fflonkSolidityVerifier,
};

function p256(n) {
    let nstr = n.toString(16);
    while (nstr.length < 64) nstr = "0"+nstr;
    nstr = `"0x${nstr}"`;
    return nstr;
}

async function groth16SolidityCallData(_proof, _pub, logger) {
    const proof = unstringifyBigInts(_proof);
    const pub = unstringifyBigInts(_pub);

    let inputs = "";
    for (let i=0; i<pub.length; i++) {
        if (inputs != "") inputs = inputs + ",";
        inputs = inputs + p256(pub[i]);
    }

    let S;
    S=`[${p256(proof.pi_a[0])}, ${p256(proof.pi_a[1])}],` +
        `[[${p256(proof.pi_b[0][1])}, ${p256(proof.pi_b[0][0])}],[${p256(proof.pi_b[1][1])}, ${p256(proof.pi_b[1][0])}]],` +
        `[${p256(proof.pi_c[0])}, ${p256(proof.pi_c[1])}],` +
        `[${inputs}]`;

    return S;
}

async function plonkSolidityCallData(_proof, _pub, logger) {
    const proof = unstringifyBigInts(_proof);
    const pub = unstringifyBigInts(_pub);

    let inputs = "";
    for (let i=0; i<pub.length; i++) {
        if (inputs != "") inputs = inputs + ",";
        inputs = inputs + p256(pub[i]);
    }

    return `[${p256(proof.A[0])}, ${p256(proof.A[1])},` +
    `${p256(proof.B[0])},${p256(proof.B[1])},` +
    `${p256(proof.C[0])},${p256(proof.C[1])},` +
    `${p256(proof.Z[0])},${p256(proof.Z[1])},` +
    `${p256(proof.T1[0])},${p256(proof.T1[1])},` +
    `${p256(proof.T2[0])},${p256(proof.T2[1])},` +
    `${p256(proof.T3[0])},${p256(proof.T3[1])},` +
    `${p256(proof.Wxi[0])},${p256(proof.Wxi[1])},` +
    `${p256(proof.Wxiw[0])},${p256(proof.Wxiw[1])},` +
    `${p256(proof.eval_a)},` + 
    `${p256(proof.eval_b)},` + 
    `${p256(proof.eval_c)},` + 
    `${p256(proof.eval_s1)},` + 
    `${p256(proof.eval_s2)},` + 
    `${p256(proof.eval_zw)}]` + 
    `[${inputs}]`;
}

async function fflonkSolidityCallData(_pub, _proof, logger) {
    const proof = unstringifyBigInts(_proof);
    const pub = unstringifyBigInts(_pub);

    let inputs = "";
    for (let i = 0; i < pub.length; i++) {
        if (inputs !== "") inputs = inputs + ",";
        inputs = inputs + p256(pub[i]);
    }

    return `[${p256(proof.polynomials.C1[0])}, ${p256(proof.polynomials.C1[1])},` +
    `${p256(proof.polynomials.C2[0])},${p256(proof.polynomials.C2[1])},` +
    `${p256(proof.polynomials.W1[0])},${p256(proof.polynomials.W1[1])},` +
    `${p256(proof.polynomials.W2[0])},${p256(proof.polynomials.W2[1])},` +
    `${p256(proof.evaluations.ql)},${p256(proof.evaluations.qr)},${p256(proof.evaluations.qm)},` +
    `${p256(proof.evaluations.qo)},${p256(proof.evaluations.qc)},${p256(proof.evaluations.s1)},` +
    `${p256(proof.evaluations.s2)},${p256(proof.evaluations.s3)},${p256(proof.evaluations.a)},` +
    `${p256(proof.evaluations.b)},${p256(proof.evaluations.c)},${p256(proof.evaluations.z)},` +
    `${p256(proof.evaluations.zw)},${p256(proof.evaluations.t1w)},${p256(proof.evaluations.t2w)},` +
    `${p256(proof.evaluations.inv)}],` +
    `[${inputs}]`;
}

export const calldata = {
    groth16: groth16SolidityCallData,
    plonk: plonkSolidityCallData,
    fflonk: fflonkSolidityCallData,
};
