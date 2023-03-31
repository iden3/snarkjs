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

import * as binFileUtils from "@iden3/binfileutils";
import * as zkeyUtils from "./zkey_utils.js";
import {getCurveFromQ as getCurve} from "./curves.js";
import {utils} from "ffjavascript";
import {FFLONK_PROTOCOL_ID} from "./zkey_constants.js";
import { getFByStage } from "shplonkjs";
import getFFlonkConfig from "./fflonk_config.js";

const {stringifyBigInts} = utils;

export default async function zkeyExportVerificationKey(zkeyName, logger) {
    if (logger) logger.info("EXPORT VERIFICATION KEY STARTED");

    const {fd, sections} = await binFileUtils.readBinFile(zkeyName, "zkey", 2);
    const zkey = await zkeyUtils.readHeader(fd, sections);

    if (logger) logger.info("> Detected protocol: " + zkey.protocol);

    let res;
    if (zkey.protocol === "groth16") {
        res = await groth16Vk(zkey, fd, sections);
    } else if (zkey.protocol === "plonk") {
        res = await plonkVk(zkey);
    } else if (zkey.protocolId && zkey.protocolId === FFLONK_PROTOCOL_ID) {
        res = await exportFFlonkVk(zkey, logger);
    } else {
        throw new Error("zkey file protocol unrecognized");
    }

    await fd.close();

    if (logger) logger.info("EXPORT VERIFICATION KEY FINISHED");

    return res;
}


async function groth16Vk(zkey, fd, sections) {
    const curve = await getCurve(zkey.q);
    const sG1 = curve.G1.F.n8 * 2;

    const alphaBeta = await curve.pairing(zkey.vk_alpha_1, zkey.vk_beta_2);

    let vKey = {
        protocol: zkey.protocol,
        curve: curve.name,
        nPublic: zkey.nPublic,

        vk_alpha_1: curve.G1.toObject(zkey.vk_alpha_1),

        vk_beta_2: curve.G2.toObject(zkey.vk_beta_2),
        vk_gamma_2: curve.G2.toObject(zkey.vk_gamma_2),
        vk_delta_2: curve.G2.toObject(zkey.vk_delta_2),

        vk_alphabeta_12: curve.Gt.toObject(alphaBeta)
    };

    // Read IC Section
    ///////////
    await binFileUtils.startReadUniqueSection(fd, sections, 3);
    vKey.IC = [];
    for (let i = 0; i <= zkey.nPublic; i++) {
        const buff = await fd.read(sG1);
        const P = curve.G1.toObject(buff);
        vKey.IC.push(P);
    }
    await binFileUtils.endReadSection(fd);

    vKey = stringifyBigInts(vKey);

    return vKey;
}


async function plonkVk(zkey) {
    const curve = await getCurve(zkey.q);

    let vKey = {
        protocol: zkey.protocol,
        curve: curve.name,
        nPublic: zkey.nPublic,
        power: zkey.power,

        k1: curve.Fr.toObject(zkey.k1),
        k2: curve.Fr.toObject(zkey.k2),

        Qm: curve.G1.toObject(zkey.Qm),
        Ql: curve.G1.toObject(zkey.Ql),
        Qr: curve.G1.toObject(zkey.Qr),
        Qo: curve.G1.toObject(zkey.Qo),
        Qc: curve.G1.toObject(zkey.Qc),
        S1: curve.G1.toObject(zkey.S1),
        S2: curve.G1.toObject(zkey.S2),
        S3: curve.G1.toObject(zkey.S3),

        X_2: curve.G2.toObject(zkey.X_2),

        w: curve.Fr.toObject(curve.Fr.w[zkey.power])
    };

    vKey = stringifyBigInts(vKey);

    return vKey;
}

async function exportFFlonkVk(zkey, logger) {
    const curve = await getCurve(zkey.q);

    const fflonkConfig = getFFlonkConfig(zkey.power, zkey.extraMuls);
    const f = getFByStage(fflonkConfig);

    let vKey = {
        protocol: zkey.protocol,
        curve: curve.name,
        nPublic: zkey.nPublic,
        power: zkey.power,
        extraMuls: zkey.extraMuls,
        f,
        k1: curve.Fr.toObject(zkey.k1),
        k2: curve.Fr.toObject(zkey.k2),

        w: curve.Fr.toObject(curve.Fr.w[zkey.power]),

        X_2: curve.G2.toObject(zkey.X_2),
    };

    const ws = Object.keys(zkey).filter(k => k.match(/^w\d/));    
    for(let i = 0; i < ws.length; ++i) {
        vKey[ws[i]] = curve.Fr.toObject(zkey[ws[i]]);
    }

    const fs = Object.keys(zkey).filter(k => k.match(/^f\d/));    
    for(let i = 0; i < fs.length; ++i) {
        vKey[fs[i]] = curve.G1.toObject(zkey[fs[i]]);
    }
    
    return stringifyBigInts(vKey);
}
