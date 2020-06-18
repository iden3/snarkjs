

module.exports = {
    groth16: {
        prover: module.require("./zksnark_groth16_prover"),
        verifier: module.require("./zksnark_groth16_verifier")
    }
};
