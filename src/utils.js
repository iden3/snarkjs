import {BigBuffer} from "ffjavascript";

export async function to4T(buff, pz, Fr) {
    pz = pz || [];
    const n8r = Fr.n8;

    //Compute ifft
    let a = await Fr.ifft(buff);

    const a4 = new BigBuffer(buff.byteLength * 4);
    a4.set(a, 0);

    const a1 = new BigBuffer(buff.byteLength + n8r * pz.length);
    a1.set(a, 0);
    for (let i = 0; i < pz.length; i++) {
        let sum = Fr.add(a1.slice(buff.byteLength + i * n8r, buff.byteLength + (i + 1) * n8r), pz[i]);
        a1.set(sum, buff.byteLength + i * n8r);

        let sub = Fr.sub(a1.slice(i * n8r, (i + 1) * n8r), pz[i]);
        a1.set(sub, i * n8r);
    }
    const A4 = await Fr.fft(a4);

    return [a1, A4];
}

export async function expTau(polynomial, PTau, curve, logger, name) {
    const n = polynomial.byteLength / curve.Fr.n8;
    const PTauN = PTau.slice(0, n * curve.G1.F.n8 * 2);
    const bm = await curve.Fr.batchFromMontgomery(polynomial);
    let res = await curve.G1.multiExpAffine(PTauN, bm, logger, name);
    //res = curve.G1.toAffine(res);
    return res;
}

export function evalPol(polynomial, value_x, Fr) {
    const n = polynomial.byteLength / Fr.n8;

    if (n === 0) return Fr.zero;

    let res = polynomial.slice((n - 1) * Fr.n8, n * Fr.n8);
    for (let i = n - 2; i >= 0; i--) {
        res = Fr.add(Fr.mul(res, value_x), polynomial.slice(i * Fr.n8, (i + 1) * Fr.n8));
    }
    return res;
}

export async function getP4(buff, domainSize, Fr) {
    const q = await Fr.ifft(buff);
    const q4 = new BigBuffer(domainSize * Fr.n8 * 4);
    q4.set(q, 0);
    const Q4 = await Fr.fft(q4);

    return {q, Q4};
}

export function divPol1(P, d, Fr) {
    const n = P.byteLength / Fr.n8;
    const res = new BigBuffer(n * Fr.n8);
    res.set(Fr.zero, (n - 1) * Fr.n8);
    res.set(P.slice((n - 1) * Fr.n8, n * Fr.n8), (n - 2) * Fr.n8);
    for (let i = n - 3; i >= 0; i--) {
        res.set(
            Fr.add(
                P.slice((i + 1) * Fr.n8, (i + 2) * Fr.n8),
                Fr.mul(
                    d,
                    res.slice((i + 1) * Fr.n8, (i + 2) * Fr.n8)
                )
            ),
            i * Fr.n8
        );
    }
    if (!Fr.eq(
        P.slice(0, Fr.n8),
        Fr.mul(
            Fr.neg(d),
            res.slice(0, Fr.n8)
        )
    )) {
        throw new Error("Polinomial does not divide");
    }
    return res;
}