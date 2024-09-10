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

// Format of the output
//      Hash of the last contribution  64 Bytes
//      2^N*2-1 TauG1 Points (compressed)
//      2^N TauG2 Points (compressed)
//      2^N AlphaTauG1 Points (compressed)
//      2^N BetaTauG1 Points (compressed)
//      Public Key
//          BetaG2 (compressed)
//          G1*s (compressed)
//          G1*s*tau (compressed)
//          G1*t (compressed)
//          G1*t*alpha (compressed)
//          G1*u (compressed)
//          G1*u*beta (compressed)
//          G2*sp*tau (compressed)
//          G2*tp*alpha (compressed)
//          G2*up*beta (compressed)

import * as fastFile from "fastfile";
import Blake2b from "blake2b-wasm";
import * as utils from "./powersoftau_utils.js";
import * as misc from "./misc.js";
import { applyKeyToChallengeSection } from "./mpc_applykey.js";
import * as keyPair from "./keypair.js";

export default async function challengeContribute(curve, challengeFilename, responseFileName, entropy, logger) {
    await Blake2b.ready();

    const fdFrom = await fastFile.readExisting(challengeFilename);


    const sG1 = curve.F1.n64*8*2;
    const sG2 = curve.F2.n64*8*2;
    const domainSize = (fdFrom.totalSize + sG1 - 64 - sG2) / (4*sG1 + sG2);
    let e = domainSize;
    let power = 0;
    while (e>1) {
        e = e /2;
        power += 1;
    }

    if (2 ** power != domainSize) throw new Error("Invalid file size");
    if (logger) logger.debug("Power to tau size: "+power);

    const rng = await misc.getRandomRng(entropy);

    const fdTo = await fastFile.createOverride(responseFileName);

    // Calculate the hash
    const challengeHasher = Blake2b(64);
    for (let i=0; i<fdFrom.totalSize; i+= fdFrom.pageSize) {
        if (logger) logger.debug(`Hashing challenge ${i}/${fdFrom.totalSize}`);
        const s = Math.min(fdFrom.totalSize - i, fdFrom.pageSize);
        const buff = await fdFrom.read(s);
        challengeHasher.update(buff);
    }

    const claimedHash = await fdFrom.read(64, 0);
    if (logger) logger.info(misc.formatHash(claimedHash, "Claimed Previous Response Hash: "));

    const challengeHash = challengeHasher.digest();
    if (logger) logger.info(misc.formatHash(challengeHash, "Current Challenge Hash: "));

    const key = keyPair.createPTauKey(curve, challengeHash, rng);

    if (logger) {
        ["tau", "alpha", "beta"].forEach( (k) => {
            logger.debug(k + ".g1_s: " + curve.G1.toString(key[k].g1_s, 16));
            logger.debug(k + ".g1_sx: " + curve.G1.toString(key[k].g1_sx, 16));
            logger.debug(k + ".g2_sp: " + curve.G2.toString(key[k].g2_sp, 16));
            logger.debug(k + ".g2_spx: " + curve.G2.toString(key[k].g2_spx, 16));
            logger.debug("");
        });
    }

    const responseHasher = Blake2b(64);

    await fdTo.write(challengeHash);
    responseHasher.update(challengeHash);

    await applyKeyToChallengeSection(fdFrom, fdTo, responseHasher, curve, "G1", (2 ** power)*2-1, curve.Fr.one    , key.tau.prvKey, "COMPRESSED", "tauG1"     , logger );
    await applyKeyToChallengeSection(fdFrom, fdTo, responseHasher, curve, "G2", (2 ** power)    , curve.Fr.one    , key.tau.prvKey, "COMPRESSED", "tauG2"     , logger );
    await applyKeyToChallengeSection(fdFrom, fdTo, responseHasher, curve, "G1", (2 ** power)    , key.alpha.prvKey, key.tau.prvKey, "COMPRESSED", "alphaTauG1", logger );
    await applyKeyToChallengeSection(fdFrom, fdTo, responseHasher, curve, "G1", (2 ** power)    , key.beta.prvKey , key.tau.prvKey, "COMPRESSED", "betaTauG1" , logger );
    await applyKeyToChallengeSection(fdFrom, fdTo, responseHasher, curve, "G2", 1             , key.beta.prvKey , key.tau.prvKey, "COMPRESSED", "betaTauG2" , logger );

    // Write and hash key
    const buffKey = new Uint8Array(curve.F1.n8*2*6+curve.F2.n8*2*3);
    utils.toPtauPubKeyRpr(buffKey, 0, curve, key, false);
    await fdTo.write(buffKey);
    responseHasher.update(buffKey);
    const responseHash = responseHasher.digest();
    if (logger) logger.info(misc.formatHash(responseHash, "Contribution Response Hash: "));

    await fdTo.close();
    await fdFrom.close();
}

