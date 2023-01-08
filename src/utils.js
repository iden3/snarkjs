export async function expTau(polynomial, PTau, curve, logger, name) {
    const n = polynomial.byteLength / curve.Fr.n8;
    const PTauN = PTau.slice(0, n * curve.G1.F.n8 * 2);
    const bm = await curve.Fr.batchFromMontgomery(polynomial);
    let res = await curve.G1.multiExpAffine(PTauN, bm, logger, name);
    res = curve.G1.toAffine(res);
    return res;
}

export function toDebugArray(buffer, Fr) {
    const length = buffer.byteLength / Fr.n8;
    let res = [];
    for (let i = 0; i < length; i++) {
        res.push(Fr.toString(buffer.slice(i * Fr.n8, (i + 1) * Fr.n8)));
    }

    return res;
}

function i2hex(i) {
    return ("0" + i.toString(16)).slice(-2);
}

function getHex(value, Fr) {
    function i2hex(i) {
        return ("0" + i.toString(16)).slice(-2);
    }

    let buffer = new Uint8Array(Fr.n8);

    Fr.toRprBE(buffer, 0, Fr.e(value));

    const proofHex = Array.from(buffer).map(i2hex).join("");
    return "0x" + proofHex;
}

function getHexG1(value, G1) {

    let buffer = new Uint8Array(G1.F.n8 * 2);

    G1.toRprUncompressed(buffer, 0, G1.e(value));

    const proofHex = Array.from(buffer).map(i2hex).join("");
    return "0x" + proofHex;
}