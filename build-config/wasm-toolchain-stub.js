// Stub for the runtime wasm codegen toolchain (wasmbuilder + wasmcurves
// generators). Only reachable through ffjavascript's custom-`plugins`
// curve-build path, which snarkjs never takes. Bundling the real toolchain
// into the browser build would add ~180 KB for a code path that never runs.
const err = () => {
    throw new Error("wasm codegen toolchain is not included in the snarkjs browser bundle (only needed when building a curve with custom wasm plugins)");
};
export class ModuleBuilder { constructor() { err(); } }
export const buildBn128 = err;
export const buildBls12381 = err;
export default {};
