// Browser-safe: Solidity calldata generation, wrapping the historical
// builders unchanged so output stays byte-identical (including the plonk
// builder's missing comma between the two arrays, which downstream tooling
// depends on). Normalizes the fflonk (pub, proof) argument flip.
import groth16ExportSolidityCallData from "../../groth16_exportsoliditycalldata.js";
import plonkExportSolidityCallData from "../../plonk_exportsoliditycalldata.js";
import fflonkExportCallData from "../../fflonk_export_calldata.js";

export default async function generateSolidityCalldata(proof, publicSignals, params, ctx) { // eslint-disable-line no-unused-vars
    if (proof.protocol === "groth16") return groth16ExportSolidityCallData(proof, publicSignals);
    if (proof.protocol === "plonk") return plonkExportSolidityCallData(proof, publicSignals);
    if (proof.protocol === "fflonk") return fflonkExportCallData(publicSignals, proof);
    /* c8 ignore next 2 -- unreachable: assertSupports rejects other protocols first */
    throw new Error(`solidity plugin: unsupported protocol "${proof.protocol}"`);
}
