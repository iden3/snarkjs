const Scalar = require("ffjavascript").Scalar;
const loadR1cs = require("r1csfile").load;
module.exports = r1csInfo;


const bls12381r = Scalar.e("73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001", 16);
const bn128r = Scalar.e("21888242871839275222246405745257275088548364400416034343698204186575808495617", 16);

async function r1csInfo(r1csName) {
    const cir = await loadR1cs(r1csName);

    if (Scalar.eq(cir.prime, bn128r)) {
        console.log("# Curve: bn-128");
    } else if (Scalar.eq(cir.prime, bls12381r)) {
        console.log("# Curve: bls12-381");
    } else {
        console.log(`# Unknown Curve. Prime: ${Scalar.toString(cir.r)}`);
    }
    console.log(`# Wires: ${cir.nVars}`);
    console.log(`# Constraints: ${cir.nConstraints}`);
    console.log(`# Private Inputs: ${cir.nPrvInputs}`);
    console.log(`# Public Inputs: ${cir.nPubInputs}`);
    console.log(`# Outputs: ${cir.nOutputs}`);

}
