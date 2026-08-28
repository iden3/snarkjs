// Example snarkjs export plugin -- deliberately trivial, meant to be read as
// the plugin-author reference (see README.md next to this file).
//
// "Verifier" export = the verification key pretty-printed as JSON;
// "calldata" export = { proof, publicSignals } as JSON (compact or pretty).
// No templates, no fs, no dependencies: everything a plugin needs arrives as
// arguments, so this works in Node and in browser bundles alike.

const PROTOCOLS = ["groth16", "plonk", "fflonk"];
const CURVES = ["bn128", "bls12381"];
const SUPPORTS = PROTOCOLS.flatMap((protocol) => CURVES.map((curve) => ({ protocol, curve })));

export default Object.freeze({
    name: "json",
    apiVersion: 1,
    description: "Verification key / calldata as JSON (example plugin)",

    verifier: {
        supports: SUPPORTS,
        defaultOutput: "verification_key.json",
        async generate(vk, params, ctx) {
            if (ctx.logger) ctx.logger.debug("json plugin: exporting verification key");
            return JSON.stringify(vk, null, 2);
        },
    },

    calldata: {
        supports: SUPPORTS,
        formats: ["pretty", "compact"],
        async generate(proof, publicSignals, params) {
            const indent = params.format === "compact" ? undefined : 2;
            return JSON.stringify({ proof, publicSignals }, null, indent);
        },
    },

    cli: {
        verifierUsage: "[circuit_final.zkey] [verification_key.json]",
        calldataUsage: "[public.json] [proof.json] [--format=pretty|compact]",
        help: "Example plugin: emits the verification key or {proof, publicSignals} as JSON.",
    },
});
