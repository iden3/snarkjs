import plonk_prove from "./plonk_prove.js";
import wtns_calculate from "./wtns_calculate.js";

export default async function plonkFullProve(input, wasmFile, zkeyFileName, logger) {
    const wtns= {
        type: "mem"
    };
    await wtns_calculate(input, wasmFile, wtns);
    return await plonk_prove(zkeyFileName, wtns, logger);
}
