import * as fastFile from "fastfile";
import { WitnessCalculatorBuilder } from "circom_runtime";
import * as wtnsUtils from "./wtns_utils.js";
import * as binFileUtils from "@iden3/binfileutils";

export default async function wtnsCalculate(input, wasmFileName, wtnsFileName, options) {

    const fdWasm = await fastFile.readExisting(wasmFileName);
    const wasm = await fdWasm.read(fdWasm.totalSize);
    await fdWasm.close();

    const wc = await WitnessCalculatorBuilder(wasm);
    const w = await wc.calculateBinWitness(input);

    const fdWtns = await binFileUtils.createBinFile(wtnsFileName, "wtns", 2, 2);

    await wtnsUtils.writeBin(fdWtns, w, wc.prime);
    await fdWtns.close();

}
