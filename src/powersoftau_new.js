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

/*
Header(1)
    n8
    prime
    power
tauG1(2)
    {(2 ** power)*2-1} [
        G1, tau*G1, tau^2 * G1, ....
    ]
tauG2(3)
    {2 ** power}[
        G2, tau*G2, tau^2 * G2, ...
    ]
alphaTauG1(4)
    {2 ** power}[
        alpha*G1, alpha*tau*G1, alpha*tau^2*G1,....
    ]
betaTauG1(5)
    {2 ** power} []
        beta*G1, beta*tau*G1, beta*tau^2*G1, ....
    ]
betaG2(6)
    {1}[
        beta*G2
    ]
contributions(7)
    NContributions
    {NContributions}[
        tau*G1
        tau*G2
        alpha*G1
        beta*G1
        beta*G2
        pubKey
            tau_g1s
            tau_g1sx
            tau_g2spx
            alpha_g1s
            alpha_g1sx
            alpha_g1spx
            beta_g1s
            beta_g1sx
            beta_g1spx
        partialHash (216 bytes) See https://github.com/mafintosh/blake2b-wasm/blob/23bee06945806309977af802bc374727542617c7/blake2b.wat#L9
        hashNewChallenge
    ]
 */

import * as ptauUtils from "./powersoftau_utils.js";
import * as binFileUtils from "@iden3/binfileutils";
import Blake2b from "blake2b-wasm";
import * as misc from "./misc.js";

export default async function newAccumulator(curve, power, fileName, logger) {

    await Blake2b.ready();

    const fd = await binFileUtils.createBinFile(fileName, "ptau", 1, 7);

    await ptauUtils.writePTauHeader(fd, curve, power, 0);

    const buffG1 = curve.G1.oneAffine;
    const buffG2 = curve.G2.oneAffine;

    // Write tauG1
    ///////////
    await binFileUtils.startWriteSection(fd, 2);
    const nTauG1 = (2 ** power) * 2 -1;
    for (let i=0; i< nTauG1; i++) {
        await fd.write(buffG1);
        if ((logger)&&((i%100000) == 0)&&i) logger.log("tauG1: " + i);
    }
    await binFileUtils.endWriteSection(fd);

    // Write tauG2
    ///////////
    await binFileUtils.startWriteSection(fd, 3);
    const nTauG2 = (2 ** power);
    for (let i=0; i< nTauG2; i++) {
        await fd.write(buffG2);
        if ((logger)&&((i%100000) == 0)&&i) logger.log("tauG2: " + i);
    }
    await binFileUtils.endWriteSection(fd);

    // Write alphaTauG1
    ///////////
    await binFileUtils.startWriteSection(fd, 4);
    const nAlfaTauG1 = (2 ** power);
    for (let i=0; i< nAlfaTauG1; i++) {
        await fd.write(buffG1);
        if ((logger)&&((i%100000) == 0)&&i) logger.log("alphaTauG1: " + i);
    }
    await binFileUtils.endWriteSection(fd);

    // Write betaTauG1
    ///////////
    await binFileUtils.startWriteSection(fd, 5);
    const nBetaTauG1 = (2 ** power);
    for (let i=0; i< nBetaTauG1; i++) {
        await fd.write(buffG1);
        if ((logger)&&((i%100000) == 0)&&i) logger.log("betaTauG1: " + i);
    }
    await binFileUtils.endWriteSection(fd);

    // Write betaG2
    ///////////
    await binFileUtils.startWriteSection(fd, 6);
    await fd.write(buffG2);
    await binFileUtils.endWriteSection(fd);

    // Contributions
    ///////////
    await binFileUtils.startWriteSection(fd, 7);
    await fd.writeULE32(0); // 0 Contributions
    await binFileUtils.endWriteSection(fd);

    await fd.close();

    const firstChallengeHash = ptauUtils.calculateFirstChallengeHash(curve, power, logger);

    if (logger) logger.debug(misc.formatHash(Blake2b(64).digest(), "Blank Contribution Hash:"));

    if (logger) logger.info(misc.formatHash(firstChallengeHash, "First Contribution Hash:"));

    return firstChallengeHash;

}
