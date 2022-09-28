/*
    Copyright 2022 iden3

    This file is part of snarkjs

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

import {F1Field} from "ffjavascript";
import {newCommitPolsArray, newConstantPolsArray, verifyPil, compile} from "pilcom";
import fs from "fs";

export default async function pilVerify(pilFile, pilConfigFile, cnstPolsFile, cmmtPolsFile, logger) {
    logger.info(`PIL verify ${pilFile} file`);

    const F = new F1Field("0xFFFFFFFF00000001");

    const pilConfig = undefined !== pilConfigFile ? JSON.parse(fs.readFileSync(pilConfigFile)) : {};
    const pil = await compile(F, pilFile, null, pilConfig);

    const cnstPols = newConstantPolsArray(pil);
    const cmmtPols = newCommitPolsArray(pil);

    await cmmtPols.loadFromFile(cmmtPolsFile);
    await cnstPols.loadFromFile(cnstPolsFile);

    const res = await verifyPil(F, pil, cmmtPols, cnstPols, pilConfig);

    if (0 !== res.length) {
        logger.warn(`PIL ${pilFile} verified with errors`);
        for (let i = 0; i < res.length; i++) {
            logger.warn(res[i]);
        }
        return 1;
    }

    logger.info(`PIL ${pilFile} successfully verified`);
    return 0;
}


