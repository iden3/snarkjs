import * as fastFile from "fastfile";
import { WitnessCalculatorBuilder } from "circom_runtime";
import * as wtnsUtils from "./wtns_utils.js";
import * as binFileUtils from "@iden3/binfileutils";
import loadSyms from "./loadsyms.js";

export default async function wtnsDebug(input, wasmFileName, wtnsFileName, symName, options, logger) {

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
            if (logger) logger.info("SET " + sym.labelIdx2Name[labelIdx] + " <-- " + value.toString());
        };
    }
    if (options.get) {
        if (!sym) sym = await loadSyms(symName);
        wcOps.logGetSignal= function(varIdx, value) {
            if (logger) logger.info("GET " + sym.labelIdx2Name[varIdx] + " --> " + value.toString());
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
