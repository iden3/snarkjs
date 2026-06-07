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

// Exports a verification key with all G1/G2 curve points in ZCash/IETF
// compressed form (48 bytes for G1, 96 bytes for G2) as hex strings,
// ready for consumption by a Cardano/Plutus on-chain verifier (CIP-0381).

import * as binFileUtils from "@iden3/binfileutils";
import * as zkeyUtils from "./zkey_utils.js";
import {getCurveFromQ as getCurve} from "./curves.js";
import {utils} from "ffjavascript";
import {FFLONK_PROTOCOL_ID} from "./zkey_constants.js";

const {stringifyBigInts} = utils;

// Compress a G1 point to a 48-byte hex string (ZCash/IETF format).
// The point at infinity encodes as 0xc0 followed by 47 zero bytes.
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

// Compress a G2 point to a 96-byte hex string (ZCash/IETF format).
// Fq2 lexicographic order: compare c1 first, then c0.
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

export default async function zkeyExportCardanoVerificationKey(zkeyName, logger) {
    if (logger) logger.info("EXPORT CARDANO VERIFICATION KEY STARTED");

    const {fd, sections} = await binFileUtils.readBinFile(zkeyName, "zkey", 2);
    const zkey = await zkeyUtils.readHeader(fd, sections);

    if (logger) logger.info("> Detected protocol: " + zkey.protocol);

    let res;
    if (zkey.protocol === "groth16") {
        res = await groth16CardanoVk(zkey, fd, sections);
    } else if (zkey.protocol === "plonk") {
        res = await plonkCardanoVk(zkey);
    } else if (zkey.protocolId && zkey.protocolId === FFLONK_PROTOCOL_ID) {
        res = await fflonkCardanoVk(zkey);
    } else {
        throw new Error("zkey file protocol unrecognized");
    }

    await fd.close();

    if (logger) logger.info("EXPORT CARDANO VERIFICATION KEY FINISHED");

    return res;
}

async function groth16CardanoVk(zkey, fd, sections) {
    const curve = await getCurve(zkey.q);
    const sG1 = curve.G1.F.n8 * 2;

    const vKey = {
        protocol: zkey.protocol,
        curve: curve.name,
        nPublic: zkey.nPublic,
        vk_alpha_1: compressG1(curve, zkey.vk_alpha_1),
        vk_beta_2:  compressG2(curve, zkey.vk_beta_2),
        vk_gamma_2: compressG2(curve, zkey.vk_gamma_2),
        vk_delta_2: compressG2(curve, zkey.vk_delta_2),
    };

    await binFileUtils.startReadUniqueSection(fd, sections, 3);
    vKey.IC = [];
    for (let i = 0; i <= zkey.nPublic; i++) {
        const buff = await fd.read(sG1);
        const P = curve.G1.fromRprLEM(buff, 0);
        vKey.IC.push(compressG1(curve, P));
    }
    await binFileUtils.endReadSection(fd);

    return vKey;
}

async function plonkCardanoVk(zkey) {
    const curve = await getCurve(zkey.q);

    return {
        protocol: zkey.protocol,
        curve: curve.name,
        nPublic: zkey.nPublic,
        power: zkey.power,
        k1: stringifyBigInts(curve.Fr.toObject(zkey.k1)),
        k2: stringifyBigInts(curve.Fr.toObject(zkey.k2)),
        Qm: compressG1(curve, zkey.Qm),
        Ql: compressG1(curve, zkey.Ql),
        Qr: compressG1(curve, zkey.Qr),
        Qo: compressG1(curve, zkey.Qo),
        Qc: compressG1(curve, zkey.Qc),
        S1: compressG1(curve, zkey.S1),
        S2: compressG1(curve, zkey.S2),
        S3: compressG1(curve, zkey.S3),
        X_2: compressG2(curve, zkey.X_2),
        w: stringifyBigInts(curve.Fr.toObject(curve.Fr.w[zkey.power])),
    };
}

async function fflonkCardanoVk(zkey) {
    const curve = await getCurve(zkey.q);

    return {
        protocol: zkey.protocol,
        curve: curve.name,
        nPublic: zkey.nPublic,
        power: zkey.power,
        k1: stringifyBigInts(curve.Fr.toObject(zkey.k1)),
        k2: stringifyBigInts(curve.Fr.toObject(zkey.k2)),
        w:  stringifyBigInts(curve.Fr.toObject(curve.Fr.w[zkey.power])),
        w3: stringifyBigInts(curve.Fr.toObject(zkey.w3)),
        w4: stringifyBigInts(curve.Fr.toObject(zkey.w4)),
        w8: stringifyBigInts(curve.Fr.toObject(zkey.w8)),
        wr: stringifyBigInts(curve.Fr.toObject(zkey.wr)),
        X_2: compressG2(curve, zkey.X_2),
        C0:  compressG1(curve, zkey.C0),
    };
}
