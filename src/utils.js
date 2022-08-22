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