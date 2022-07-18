import {BigBuffer} from "ffjavascript";
import {Polynomial} from "./polynomial/polynomial.js";

export async function computePolynomial(buffer, blindingFactors, Fr) {
    blindingFactors = blindingFactors || [];
    let domainSize = buffer.byteLength / Fr.n8;

    let coefficients = await Fr.ifft(buffer);

    const coefficients4 = new BigBuffer(Fr.n8 * domainSize * 4);
    coefficients4.set(coefficients, 0);

    const blindedCoefficients = new BigBuffer(Fr.n8 * (domainSize + blindingFactors.length));
    blindedCoefficients.set(coefficients, 0);
    for (let i = 0; i < blindingFactors.length; i++) {
        blindedCoefficients.set(
            Fr.add(
                blindedCoefficients.slice((domainSize + i) * Fr.n8, (domainSize + i + 1) * Fr.n8),
                blindingFactors[i]
            ),
            (domainSize + i) * Fr.n8
        );
        blindedCoefficients.set(
            Fr.sub(
                blindedCoefficients.slice(i * Fr.n8, (i + 1) * Fr.n8),
                blindingFactors[i]
            ),
            i * Fr.n8
        );
    }

    const evaluations = await Fr.fft(coefficients4);

    return new Polynomial(blindedCoefficients, evaluations);
}

export async function expTau(polynomial, PTau, curve, logger, name) {
    const n = polynomial.byteLength / curve.Fr.n8;
    const PTauN = PTau.slice(0, n * curve.G1.F.n8 * 2);
    const bm = await curve.Fr.batchFromMontgomery(polynomial);
    let res = await curve.G1.multiExpAffine(PTauN, bm, logger, name);
    res = curve.G1.toAffine(res);
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