import groth16_prove from "./groth16_prove.js";
import wtns_calculate from "./wtns_calculate.js";

export default async function groth16FullProve(input, wasmFile, zkeyFileName, logger) {
    const wtns= {
        type: "mem"
    };
    await wtns_calculate(input, wasmFile, wtns);
    return await groth16_prove(zkeyFileName, wtns, logger);
}
