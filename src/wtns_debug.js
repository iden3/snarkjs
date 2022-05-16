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

import * as fastFile from "fastfile";
import { WitnessCalculatorBuilder } from "circom_runtime";
import * as wtnsUtils from "./wtns_utils.js";
import * as binFileUtils from "@iden3/binfileutils";
import loadSyms from "./loadsyms.js";
import {  utils }   from "ffjavascript";
const {unstringifyBigInts} = utils;


export default async function wtnsDebug(_input, wasmFileName, wtnsFileName, symName, options, logger) {

    const input = unstringifyBigInts(_input);

    const fdWasm = await fastFile.readExisting(wasmFileName);
    const wasm = await fdWasm.read(fdWasm.totalSize);
    await fdWasm.close();


    let wcOps = {
        sanityCheck: true
    };
    let sym = await loadSyms(symName);
    if (options.set) {
        if (!sym) sym = await loadSyms(symName);
        wcOps.logSetSignal= function(labelIdx, value) {
            // The line below splits the arrow log into 2 strings to avoid some Secure ECMAScript issues
            if (logger) logger.info("SET " + sym.labelIdx2Name[labelIdx] + " <" + "-- " + value.toString());
        };
    }
    if (options.get) {
        if (!sym) sym = await loadSyms(symName);
        wcOps.logGetSignal= function(varIdx, value) {
            // The line below splits the arrow log into 2 strings to avoid some Secure ECMAScript issues
            if (logger) logger.info("GET " + sym.labelIdx2Name[varIdx] + " --" + "> " + value.toString());
        };
    }
    if (options.trigger) {
        if (!sym) sym = await loadSyms(symName);
        wcOps.logStartComponent= function(cIdx) {
            if (logger) logger.info("START: " + sym.componentIdx2Name[cIdx]);
        };
        wcOps.logFinishComponent= function(cIdx) {
            if (logger) logger.info("FINISH: " + sym.componentIdx2Name[cIdx]);
        };
    }
    wcOps.sym = sym;

    const wc = await WitnessCalculatorBuilder(wasm, wcOps);
    const w = await wc.calculateWitness(input);

    const fdWtns = await binFileUtils.createBinFile(wtnsFileName, "wtns", 2, 2);

    await wtnsUtils.write(fdWtns, w, wc.prime);

    await fdWtns.close();
}
