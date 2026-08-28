// Built-in "solidity" export plugin: EVM verifier contracts + calldata for
// groth16/plonk/fflonk on bn128 (the templates hardcode bn254 constants).
// In browser bundles verifier.js is stubbed to null, so the plugin degrades
// to a calldata-only capability there.
import verifierGenerate from "./verifier.js";
import calldataGenerate from "./calldata.js";

const SUPPORTS = [
    { protocol: "groth16", curve: "bn128" },
    { protocol: "plonk", curve: "bn128" },
    { protocol: "fflonk", curve: "bn128" },
];

const plugin = {
    name: "solidity",
    apiVersion: 1,
    description: "Solidity (EVM) verifier contracts and calldata, bn128",
    calldata: {
        supports: SUPPORTS,
        generate: calldataGenerate,
    },
    cli: {
        verifierUsage: "[circuit_final.zkey] [verifier.sol]",
        calldataUsage: "[public.json] [proof.json]",
        help: "Writes a Solidity verifier contract (Groth16Verifier / PlonkVerifier / FflonkVerifier).\n" +
              "Calldata prints in the Remix/ethers argument format.",
    },
};

if (verifierGenerate) {
    plugin.verifier = {
        supports: SUPPORTS,
        defaultOutput: "verifier.sol",
        generate: verifierGenerate,
    };
}

export default Object.freeze(plugin);
