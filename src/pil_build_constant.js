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

import {newConstantPolsArray, compile} from "pilcom";
import fs from "fs";
import {F1Field} from "ffjavascript";


export default async function pilBuildConstant(pilFile, pilConfigFile, smBuilderFile, outputFile, logger) {
    logger.info(`Build constant polynomials file from ${pilFile} file`);

    const F = new F1Field("0xFFFFFFFF00000001");

    const config = undefined !== pilConfigFile ? JSON.parse(fs.readFileSync(pilConfigFile)) : {};
    const pil = await compile(F, pilFile, null, config);

    //TODO check if there are constant pols defined
    const cnstPols = newConstantPolsArray(pil);

    let {buildConstants} = await import(smBuilderFile);
    await buildConstants(cnstPols);

    await cnstPols.saveToFile(outputFile);

    logger.info(`Constant polynomials successfully built to ${outputFile}`);

    return 0;
}


