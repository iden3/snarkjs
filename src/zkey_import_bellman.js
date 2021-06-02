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

import * as zkeyUtils from "./zkey_utils.js";
import * as binFileUtils from "@iden3/binfileutils";
import * as fastFile from "fastfile";
import { getCurveFromQ as getCurve } from "./curves.js";
import * as misc from "./misc.js";

export default async function phase2importMPCParams(zkeyNameOld, mpcparamsName, zkeyNameNew, name, logger) {

    const {fd: fdZKeyOld, sections: sectionsZKeyOld} = await binFileUtils.readBinFile(zkeyNameOld, "zkey", 2);
    const zkeyHeader = await zkeyUtils.readHeader(fdZKeyOld, sectionsZKeyOld, false);
    if (zkeyHeader.protocol != "groth16") {
        throw new Error("zkey file is not groth16");
    }

    const curve = await getCurve(zkeyHeader.q);
    const sG1 = curve.G1.F.n8*2;
    const sG2 = curve.G2.F.n8*2;

    const oldMPCParams = await zkeyUtils.readMPCParams(fdZKeyOld, curve, sectionsZKeyOld);
    const newMPCParams = {};

    const fdMPCParams = await fastFile.readExisting(mpcparamsName);

    fdMPCParams.pos =
        sG1*3 + sG2*3 +                     // vKey
        8 + sG1*zkeyHeader.nVars +              // IC + C
        4 + sG1*(zkeyHeader.domainSize-1) +     // H
        4 + sG1*zkeyHeader.nVars +              // A
        4 + sG1*zkeyHeader.nVars +              // B1
        4 + sG2*zkeyHeader.nVars;               // B2

    // csHash
    newMPCParams.csHash =  await fdMPCParams.read(64);

    const nConttributions = await fdMPCParams.readUBE32();
    newMPCParams.contributions = [];
    for (let i=0; i<nConttributions; i++) {
        const c = { delta:{} };
        c.deltaAfter = await readG1(fdMPCParams);
        c.delta.g1_s = await readG1(fdMPCParams);
        c.delta.g1_sx = await readG1(fdMPCParams);
        c.delta.g2_spx = await readG2(fdMPCParams);
        c.transcript = await fdMPCParams.read(64);
        if (i<oldMPCParams.contributions.length) {
            c.type = oldMPCParams.contributions[i].type;
            if (c.type==1) {
                c.beaconHash = oldMPCParams.contributions[i].beaconHash;
                c.numIterationsExp = oldMPCParams.contributions[i].numIterationsExp;
            }
            if (oldMPCParams.contributions[i].name) {
                c.name = oldMPCParams.contributions[i].name;
            }
        }
        newMPCParams.contributions.push(c);
    }

    if (!misc.hashIsEqual(newMPCParams.csHash, oldMPCParams.csHash)) {
        if (logger) logger.error("Hash of the original circuit does not match with the MPC one");
        return false;
    }

    if (oldMPCParams.contributions.length > newMPCParams.contributions.length) {
        if (logger) logger.error("The impoerted file does not include new contributions");
        return false;
    }

    for (let i=0; i<oldMPCParams.contributions.length; i++) {
        if (!contributionIsEqual(oldMPCParams.contributions[i], newMPCParams.contributions[i])) {
            if (logger) logger.error(`Previos contribution ${i} does not match`);
            return false;
        }
    }


    // Set the same name to all new controbutions
    if (name) {
        for (let i=oldMPCParams.contributions.length; i<newMPCParams.contributions.length; i++) {
            newMPCParams.contributions[i].name = name;
        }
    }

    const fdZKeyNew = await binFileUtils.createBinFile(zkeyNameNew, "zkey", 1, 10);
    fdMPCParams.pos = 0;

    // Header
    fdMPCParams.pos += sG1;  // ignore alpha1 (keep original)
    fdMPCParams.pos += sG1;  // ignore beta1
    fdMPCParams.pos += sG2;  // ignore beta2
    fdMPCParams.pos += sG2;  // ignore gamma2
    zkeyHeader.vk_delta_1 = await readG1(fdMPCParams);
    zkeyHeader.vk_delta_2 = await readG2(fdMPCParams);
    await zkeyUtils.writeHeader(fdZKeyNew, zkeyHeader);

    // IC (Keep original)
    const nIC = await fdMPCParams.readUBE32();
    if (nIC != zkeyHeader.nPublic +1) {
        if (logger) logger.error("Invalid number of points in IC");
        await fdZKeyNew.discard();
        return false;
    }
    fdMPCParams.pos += sG1*(zkeyHeader.nPublic+1);
    await binFileUtils.copySection(fdZKeyOld, sectionsZKeyOld, fdZKeyNew, 3);

    // Coeffs (Keep original)
    await binFileUtils.copySection(fdZKeyOld, sectionsZKeyOld, fdZKeyNew, 4);

    // H Section
    const nH = await fdMPCParams.readUBE32();
    if (nH != zkeyHeader.domainSize-1) {
        if (logger) logger.error("Invalid number of points in H");
        await fdZKeyNew.discard();
        return false;
    }
    let buffH;
    const buffTauU = await fdMPCParams.read(sG1*(zkeyHeader.domainSize-1));
    const buffTauLEM = await curve.G1.batchUtoLEM(buffTauU);
    buffH = new Uint8Array(zkeyHeader.domainSize*sG1);
    buffH.set(buffTauLEM);   // Let the last one to zero.
    curve.G1.toRprLEM(buffH, sG1*(zkeyHeader.domainSize-1), curve.G1.zeroAffine);
    const n2Inv = curve.Fr.neg(curve.Fr.inv(curve.Fr.e(2)));
    const wInv = curve.Fr.inv(curve.Fr.w[zkeyHeader.power+1]);
    buffH = await curve.G1.batchApplyKey(buffH, n2Inv, wInv, "affine", "jacobian", logger);
    buffH = await curve.G1.ifft(buffH, "jacobian", "affine", logger);
    await binFileUtils.startWriteSection(fdZKeyNew, 9);
    await fdZKeyNew.write(buffH);
    await binFileUtils.endWriteSection(fdZKeyNew);

    // C Secion (L section)
    const nL = await fdMPCParams.readUBE32();
    if (nL != (zkeyHeader.nVars-zkeyHeader.nPublic-1)) {
        if (logger) logger.error("Invalid number of points in L");
        await fdZKeyNew.discard();
        return false;
    }
    let buffL;
    buffL = await fdMPCParams.read(sG1*(zkeyHeader.nVars-zkeyHeader.nPublic-1));
    buffL = await curve.G1.batchUtoLEM(buffL);
    await binFileUtils.startWriteSection(fdZKeyNew, 8);
    await fdZKeyNew.write(buffL);
    await binFileUtils.endWriteSection(fdZKeyNew);

    // A Section
    const nA = await fdMPCParams.readUBE32();
    if (nA != zkeyHeader.nVars) {
        if (logger) logger.error("Invalid number of points in A");
        await fdZKeyNew.discard();
        return false;
    }
    fdMPCParams.pos += sG1*(zkeyHeader.nVars);
    await binFileUtils.copySection(fdZKeyOld, sectionsZKeyOld, fdZKeyNew, 5);

    // B1 Section
    const nB1 = await fdMPCParams.readUBE32();
    if (nB1 != zkeyHeader.nVars) {
        if (logger) logger.error("Invalid number of points in B1");
        await fdZKeyNew.discard();
        return false;
    }
    fdMPCParams.pos += sG1*(zkeyHeader.nVars);
    await binFileUtils.copySection(fdZKeyOld, sectionsZKeyOld, fdZKeyNew, 6);

    // B2 Section
    const nB2 = await fdMPCParams.readUBE32();
    if (nB2 != zkeyHeader.nVars) {
        if (logger) logger.error("Invalid number of points in B2");
        await fdZKeyNew.discard();
        return false;
    }
    fdMPCParams.pos += sG2*(zkeyHeader.nVars);
    await binFileUtils.copySection(fdZKeyOld, sectionsZKeyOld, fdZKeyNew, 7);

    await zkeyUtils.writeMPCParams(fdZKeyNew, curve, newMPCParams);

    await fdMPCParams.close();
    await fdZKeyNew.close();
    await fdZKeyOld.close();

    return true;

    async function readG1(fd) {
        const buff = await fd.read(curve.G1.F.n8*2);
        return curve.G1.fromRprUncompressed(buff, 0);
    }

    async function readG2(fd) {
        const buff = await fd.read(curve.G2.F.n8*2);
        return curve.G2.fromRprUncompressed(buff, 0);
    }


    function contributionIsEqual(c1, c2) {
        if (!curve.G1.eq(c1.deltaAfter   , c2.deltaAfter)) return false;
        if (!curve.G1.eq(c1.delta.g1_s   , c2.delta.g1_s)) return false;
        if (!curve.G1.eq(c1.delta.g1_sx  , c2.delta.g1_sx)) return false;
        if (!curve.G2.eq(c1.delta.g2_spx , c2.delta.g2_spx)) return false;
        if (!misc.hashIsEqual(c1.transcript, c2.transcript)) return false;
        return true;
    }


}

