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
import {compressG1Hex, compressG2Hex} from "./point_compress.js";
import {utils} from "ffjavascript";
import {FFLONK_PROTOCOL_ID} from "./zkey_constants.js";

const {stringifyBigInts} = utils;

export default async function zkeyExportCardanoVerificationKey(zkeyName, logger) {
    if (logger) logger.info("EXPORT CARDANO VERIFICATION KEY STARTED");

    const {fd, sections} = await binFileUtils.readBinFile(zkeyName, "zkey", 2);
    const zkey = await zkeyUtils.readHeader(fd, sections);

    if (logger) logger.info("> Detected protocol: " + zkey.protocol);

    const curve = await getCurve(zkey.q);

    // The ZCash compressed encoding stores flags in the three high bits of the
    // first byte, which only works when the base field leaves them free (as the
    // 381-bit bls12381 field does in its 48-byte serialization). On other
    // curves the flags would overwrite x-coordinate data.
    if (curve.name !== "bls12381") {
        throw new Error(`exportCardanoVerificationKey: only bls12381 zkeys are supported, got '${curve.name}'`);
    }

    let res;
    if (zkey.protocol === "groth16") {
        res = await groth16CardanoVk(curve, zkey, fd, sections);
    } else if (zkey.protocol === "plonk") {
        res = await plonkCardanoVk(curve, zkey);
    } else if (zkey.protocolId && zkey.protocolId === FFLONK_PROTOCOL_ID) {
        res = await fflonkCardanoVk(curve, zkey);
    } else {
        throw new Error("zkey file protocol unrecognized");
    }

    await fd.close();

    if (logger) logger.info("EXPORT CARDANO VERIFICATION KEY FINISHED");

    return res;
}

async function groth16CardanoVk(curve, zkey, fd, sections) {
    const sG1 = curve.G1.F.n8 * 2;

    const vKey = {
        protocol: zkey.protocol,
        curve: curve.name,
        nPublic: zkey.nPublic,
        vk_alpha_1: compressG1Hex(curve.G1, zkey.vk_alpha_1),
        vk_beta_2:  compressG2Hex(curve.G2, zkey.vk_beta_2),
        vk_gamma_2: compressG2Hex(curve.G2, zkey.vk_gamma_2),
        vk_delta_2: compressG2Hex(curve.G2, zkey.vk_delta_2),
    };

    await binFileUtils.startReadUniqueSection(fd, sections, 3);
    vKey.IC = [];
    for (let i = 0; i <= zkey.nPublic; i++) {
        const buff = await fd.read(sG1);
        const P = curve.G1.fromRprLEM(buff, 0);
        vKey.IC.push(compressG1Hex(curve.G1, P));
    }
    await binFileUtils.endReadSection(fd);

    return vKey;
}

async function plonkCardanoVk(curve, zkey) {
    return {
        protocol: zkey.protocol,
        curve: curve.name,
        nPublic: zkey.nPublic,
        power: zkey.power,
        k1: stringifyBigInts(curve.Fr.toObject(zkey.k1)),
        k2: stringifyBigInts(curve.Fr.toObject(zkey.k2)),
        Qm: compressG1Hex(curve.G1, zkey.Qm),
        Ql: compressG1Hex(curve.G1, zkey.Ql),
        Qr: compressG1Hex(curve.G1, zkey.Qr),
        Qo: compressG1Hex(curve.G1, zkey.Qo),
        Qc: compressG1Hex(curve.G1, zkey.Qc),
        S1: compressG1Hex(curve.G1, zkey.S1),
        S2: compressG1Hex(curve.G1, zkey.S2),
        S3: compressG1Hex(curve.G1, zkey.S3),
        X_2: compressG2Hex(curve.G2, zkey.X_2),
        w: stringifyBigInts(curve.Fr.toObject(curve.Fr.w[zkey.power])),
    };
}

async function fflonkCardanoVk(curve, zkey) {
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
        X_2: compressG2Hex(curve.G2, zkey.X_2),
        C0:  compressG1Hex(curve.G1, zkey.C0),
    };
}
