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
import { bn128r, bls12381r, getCurveFromQ as getCurve } from "./curves.js";
import Blake2b from "blake2b-wasm";
import * as misc from "./misc.js";
import { hashToG2 as hashToG2 } from "./keypair.js";
import { hashG1, hashPubKey } from "./zkey_utils.js";
import { Scalar } from "ffjavascript";

export default async function info(zkeyFileName, options, logger) {

    let info = {};

    let sr;
    await Blake2b.ready();

    const {fd, sections} = await binFileUtils.readBinFile(zkeyFileName, "zkey", 2);
    const zkey = await zkeyUtils.readHeader(fd, sections, false);

    info.zkey = zkey;

    if (logger) logger.info("Protocol:", zkey.protocol);

    if (Scalar.eq(zkey.r, bn128r)) {
        if (logger) logger.info("Curve: bn-128");
    } else if (Scalar.eq(zkey.r, bls12381r)) {
        if (logger) logger.info("Curve: bls12-381");
    } else {
        if (logger) logger.info(`Unknown Curve. Prime: ${Scalar.toString(zkey.r)}`);
    }
    if (logger) logger.info(`# of Wires: ${zkey.nVars}`);
    if (logger) logger.info(`# of Public Signals: ${zkey.nPublic}`);

    if (options.nocontributions) {
        return info;
    }

    if (zkey.protocol != "groth16") {
        if (logger) logger.info("zkey file is not groth16, no contribution details to show");
        return info;
    }

    const curve = await getCurve(zkey.q);
    const sG1 = curve.G1.F.n8*2;

    const mpcParams = await zkeyUtils.readMPCParams(fd, curve, sections);

    const accumulatedHasher = Blake2b(64);
    accumulatedHasher.update(mpcParams.csHash);
    let curDelta = curve.G1.g;
    for (let i=0; i<mpcParams.contributions.length; i++) {
        const c = mpcParams.contributions[i];
        const ourHasher = misc.cloneHasher(accumulatedHasher);

        hashG1(ourHasher, curve, c.delta.g1_s);
        hashG1(ourHasher, curve, c.delta.g1_sx);

        if (!misc.hashIsEqual(ourHasher.digest(), c.transcript)) {
            console.log(`INVALID(${i}): Inconsistent transcript `);
            return null;
        }

        const delta_g2_sp = hashToG2(curve, c.transcript);

        sr = await misc.sameRatio(curve, c.delta.g1_s, c.delta.g1_sx, delta_g2_sp, c.delta.g2_spx);
        if (sr !== true) {
            console.log(`INVALID(${i}): public key G1 and G2 do not have the same ration `);
            return null;
        }

        sr = await misc.sameRatio(curve, curDelta, c.deltaAfter, delta_g2_sp, c.delta.g2_spx);
        if (sr !== true) {
            console.log(`INVALID(${i}): deltaAfter does not fillow the public key `);
            return null;
        }

        if (c.type == 1) {
            const rng = await misc.rngFromBeaconParams(c.beaconHash, c.numIterationsExp);
            const expected_prvKey = curve.Fr.fromRng(rng);
            const expected_g1_s = curve.G1.toAffine(curve.G1.fromRng(rng));
            const expected_g1_sx = curve.G1.toAffine(curve.G1.timesFr(expected_g1_s, expected_prvKey));
            if (curve.G1.eq(expected_g1_s, c.delta.g1_s) !== true) {
                console.log(`INVALID(${i}): Key of the beacon does not match. g1_s `);
                return null;
            }
            if (curve.G1.eq(expected_g1_sx, c.delta.g1_sx) !== true) {
                console.log(`INVALID(${i}): Key of the beacon does not match. g1_sx `);
                return null;
            }
        }

        hashPubKey(accumulatedHasher, curve, c);

        const contributionHasher = Blake2b(64);
        hashPubKey(contributionHasher, curve, c);

        c.contributionHash = contributionHasher.digest();

        curDelta = c.deltaAfter;
    }

    if (!curve.G1.eq(zkey.vk_delta_1, curDelta)) {
        if (logger) logger.error("INVALID:  Invalid delta1");
        return null;
    }
    sr = await misc.sameRatio(curve, curve.G1.g, curDelta, curve.G2.g, zkey.vk_delta_2);
    if (sr !== true) {
        if (logger) logger.error("INVALID:  Invalid delta2");
        return null;
    }

    // Check sizes of sections
    if (sections[8][0].size != sG1*(zkey.nVars-zkey.nPublic-1)) {
        if (logger) logger.error("INVALID:  Invalid L section size");
        return null;
    }

    if (sections[9][0].size != sG1*(zkey.domainSize)) {
        if (logger) logger.error("INVALID:  Invalid H section size");
        return null;
    }

    if (logger) logger.info(misc.formatHash(mpcParams.csHash, "Circuit Hash: "));

    await fd.close();

    for (let i=mpcParams.contributions.length-1; i>=0; i--) {
        const c = mpcParams.contributions[i];
        if (logger) logger.info("-------------------------");
        if (logger) logger.info(misc.formatHash(c.contributionHash, `contribution #${i+1} ${c.name ? c.name : ""}:`));
        if (c.type == 1) {
            if (logger) logger.info(`Beacon generator: ${misc.byteArray2hex(c.beaconHash)}`);
            if (logger) logger.info(`Beacon iterations Exp: ${c.numIterationsExp}`);
        }
    }

    info.contributions = mpcParams.contributions;

    return info;

}

