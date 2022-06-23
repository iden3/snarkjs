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

import * as potUtils from "./powersoftau_utils.js";
import * as binFileUtils from "@iden3/binfileutils";
import { readG1, readG2 } from "./misc.js";
import { utils as ffUtils} from "ffjavascript";

export default async function exportJson(pTauFilename, verbose) {
    const {fd, sections} = await binFileUtils.readBinFile(pTauFilename, "ptau", 1);

    const {curve, power} = await potUtils.readPTauHeader(fd, sections);

    const pTau = {};
    pTau.q = curve.q;
    pTau.power = power;
    pTau.contributions = await potUtils.readContributions(fd, curve, sections);

    pTau.tauG1 = await exportSection(2, "G1", (2 ** power)*2 -1, "tauG1");
    pTau.tauG2 = await exportSection(3, "G2", (2 ** power), "tauG2");
    pTau.alphaTauG1 = await exportSection(4, "G1", (2 ** power), "alphaTauG1");
    pTau.betaTauG1 = await exportSection(5, "G1", (2 ** power), "betaTauG1");
    pTau.betaG2 = await exportSection(6, "G2", 1, "betaG2");

    pTau.lTauG1 = await exportLagrange(12, "G1", "lTauG1");
    pTau.lTauG2 = await exportLagrange(13, "G2", "lTauG2");
    pTau.lAlphaTauG1 = await exportLagrange(14, "G1", "lAlphaTauG2");
    pTau.lBetaTauG1 = await exportLagrange(15, "G1", "lBetaTauG2");

    await fd.close();

    return ffUtils.stringifyBigInts(pTau);

    async function exportSection(sectionId, groupName, nPoints, sectionName) {
        const res = [];
        const readFn = (groupName == "G1") ? readG1 : readG2;
        await binFileUtils.startReadUniqueSection(fd, sections, sectionId);
        for (let i=0; i< nPoints; i++) {
            if ((verbose)&&i&&(i%10000 == 0)) console.log(`${sectionName}: ` + i);
            res.push(await readFn(fd, curve, true));
        }
        await binFileUtils.endReadSection(fd);

        return res;
    }

    async function exportLagrange(sectionId, groupName, sectionName) {
        const res = [];
        const readFn = (groupName == "G1") ? readG1 : readG2;

        // The lTauG1 section (#12) calculates powers up to power + 1,
        // per preparePhase2 function in powersoftau_preparephase2.js
        const lastPower = (sectionId == 12) ? power + 1 : power;

        await binFileUtils.startReadUniqueSection(fd, sections, sectionId);
        for (let p=0; p<=lastPower; p++) {
            if (verbose) console.log(`${sectionName}: Power: ${p}`);
            res[p] = [];
            const nPoints = (2 ** p);
            for (let i=0; i<nPoints; i++) {
                if ((verbose)&&i&&(i%10000 == 0)) console.log(`${sectionName}: ${i}/${nPoints}`);
                res[p].push(await readFn(fd, curve, true));
            }
        }
        await binFileUtils.endReadSection(fd);
        return res;
    }


}


