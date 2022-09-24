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

import {newCommitPolsArray, compile} from "pilcom";
import fs from "fs";
import {F1Field} from "ffjavascript";


export default async function pilBuildConstant(stateMachinePIL, pilConfig, stateMachineBuilder, inputFile, outputFile, logger) {
    logger.info(`Build committed polynomials file from ${stateMachinePIL} file with input from ${inputFile}`);

    const F = new F1Field("0xFFFFFFFF00000001");

    const config = undefined !== pilConfig ? JSON.parse(fs.readFileSync(pilConfig)) : {};
    const pil = await compile(F, stateMachinePIL, null, config);

    const input = JSON.parse(await fs.promises.readFile(inputFile, "utf8"));

    const cmmtPols =  newCommitPolsArray(pil);

    let {execute:buildCmmt} = await import(stateMachineBuilder);
    const res = await buildCmmt(cmmtPols, input);

    await cmmtPols.saveToFile(outputFile);

    logger.info("Result: " + res);
    logger.info(`Committed polynomials successfully built to ${outputFile}`);

    return 0;
}


