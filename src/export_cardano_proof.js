/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

    snarkJS is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    snarkJS is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with snarkJS. If not, see <https://www.gnu.org/licenses/>.
*/

// Converts a snarkjs proof.json (projective/affine [x, y, z] coordinates) into
// a Cardano/Plutus-friendly JSON where all G1 points are 48-byte ZCash/IETF
// compressed hex strings and all G2 points are 96-byte compressed hex strings.
// Scalar field evaluations (eval_* / ql / qr / ...) are left as decimal strings.

import {getCurveFromName} from "./curves.js";
import {utils} from "ffjavascript";

const {unstringifyBigInts} = utils;

// ---------- compression helpers ----------

function compressG1(curve, point) {
    const G1 = curve.G1;
    if (G1.isZero(point)) return "c0" + "00".repeat(47);
    const buf = new Uint8Array(G1.F.n8);
    G1.toRprCompressed(buf, 0, point);
    const aff  = G1.toAffine(point);
    const y    = G1.toObject(aff)[1];
    const yNeg = G1.toObject(G1.toAffine(G1.neg(point)))[1];
    buf[0] |= (y >= yNeg) ? 0b10100000 : 0b10000000;
    return Buffer.from(buf).toString("hex");
}

function compressG2(curve, point) {
    const G2 = curve.G2;
    if (G2.isZero(point)) return "c0" + "00".repeat(95);
    const buf = new Uint8Array(G2.F.n8);
    G2.toRprCompressed(buf, 0, point);
    const aff              = G2.toAffine(point);
    const [, [yc0, yc1]]  = G2.toObject(aff);
    const neg              = G2.toAffine(G2.neg(point));
    const [, [nyc0, nyc1]] = G2.toObject(neg);
    const isLarger = yc1 > nyc1 || (yc1 === nyc1 && yc0 > nyc0);
    buf[0] |= isLarger ? 0b10100000 : 0b10000000;
    return Buffer.from(buf).toString("hex");
}

// ---------- public API ----------

export default async function exportCardanoProof(_proof) {
    const proof = unstringifyBigInts(_proof);

    const curve = await getCurveFromName(proof.curve);

    if (proof.protocol === "groth16") {
        return groth16CardanoProof(curve, proof);
    } else if (proof.protocol === "plonk") {
        return plonkCardanoProof(curve, proof);
    } else if (proof.protocol === "fflonk") {
        return fflonkCardanoProof(curve, proof);
    } else {
        throw new Error(`exportCardanoProof: unknown protocol '${proof.protocol}'`);
    }
}

// ---------- per-protocol converters ----------

function g1FromObj(curve, obj) {
    return curve.G1.fromObject(obj);
}

function g2FromObj(curve, obj) {
    return curve.G2.fromObject(obj);
}

function groth16CardanoProof(curve, proof) {
    return {
        pi_a: compressG1(curve, g1FromObj(curve, proof.pi_a)),
        pi_b: compressG2(curve, g2FromObj(curve, proof.pi_b)),
        pi_c: compressG1(curve, g1FromObj(curve, proof.pi_c)),
    };
}

// PLONK proof.json uses a flat layout:
//   A, B, C, Z, T1, T2, T3, Wxi, Wxiw  → G1 points as [x, y, "1"]
//   eval_a, eval_b, eval_c, eval_s1, eval_s2, eval_zw → Fr scalars (decimal strings)
function plonkCardanoProof(curve, proof) {
    const g1 = (key) => compressG1(curve, g1FromObj(curve, proof[key]));
    return {
        A:    g1("A"),
        B:    g1("B"),
        C:    g1("C"),
        Z:    g1("Z"),
        T1:   g1("T1"),
        T2:   g1("T2"),
        T3:   g1("T3"),
        Wxi:  g1("Wxi"),
        Wxiw: g1("Wxiw"),
        // Scalar evaluations: keep as decimal strings (already stringified by caller)
        eval_a:  String(proof.eval_a),
        eval_b:  String(proof.eval_b),
        eval_c:  String(proof.eval_c),
        eval_s1: String(proof.eval_s1),
        eval_s2: String(proof.eval_s2),
        eval_zw: String(proof.eval_zw),
    };
}

// FFLONK proof.json uses a nested layout:
//   polynomials: { C1, C2, W1, W2 } → G1 points
//   evaluations: { ql, qr, qm, qo, qc, s1, s2, s3, a, b, c, z, zw, t1w, t2w, inv } → Fr scalars
function fflonkCardanoProof(curve, proof) {
    const poly = proof.polynomials;
    const eval_ = proof.evaluations;
    const g1 = (p) => compressG1(curve, g1FromObj(curve, p));
    const sc = (v) => String(v);
    return {
        c1: g1(poly.C1),
        c2: g1(poly.C2),
        w1: g1(poly.W1),
        w2: g1(poly.W2),
        ql:  sc(eval_.ql),  qr:  sc(eval_.qr),  qm: sc(eval_.qm),
        qo:  sc(eval_.qo),  qc:  sc(eval_.qc),
        s1:  sc(eval_.s1),  s2:  sc(eval_.s2),  s3: sc(eval_.s3),
        a:   sc(eval_.a),   b:   sc(eval_.b),    c:  sc(eval_.c),
        z:   sc(eval_.z),   zw:  sc(eval_.zw),
        t1w: sc(eval_.t1w), t2w: sc(eval_.t2w),
        inv: sc(eval_.inv),
    };
}
