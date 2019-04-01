const { stringifyBigInts, unstringifyBigInts } = require("./stringifybigint.js");

const p256 = function (n) {
	let nstr = n.toString(16);
	while (nstr.length < 64) nstr = "0" + nstr;
	nstr = `"0x${nstr}"`;
	return nstr;
}

const generateCall = (publicGeneratedJson, inputProof) => {
	const publicInput = unstringifyBigInts(publicGeneratedJson);
	const proof = unstringifyBigInts(inputProof);

	let inputs = "";
	for (let i = 0; i < publicInput.length; i++) {
		if (inputs != "") inputs = inputs + ",";
		inputs = inputs + p256(publicInput[i]);
	}

	let S;
	if ((typeof proof.protocol === "undefined") || (proof.protocol == "original")) {
		S = `[${p256(proof.pi_a[0])}, ${p256(proof.pi_a[1])}],` +
			`[${p256(proof.pi_ap[0])}, ${p256(proof.pi_ap[1])}],` +
			`[[${p256(proof.pi_b[0][1])}, ${p256(proof.pi_b[0][0])}],[${p256(proof.pi_b[1][1])}, ${p256(proof.pi_b[1][0])}]],` +
			`[${p256(proof.pi_bp[0])}, ${p256(proof.pi_bp[1])}],` +
			`[${p256(proof.pi_c[0])}, ${p256(proof.pi_c[1])}],` +
			`[${p256(proof.pi_cp[0])}, ${p256(proof.pi_cp[1])}],` +
			`[${p256(proof.pi_h[0])}, ${p256(proof.pi_h[1])}],` +
			`[${p256(proof.pi_kp[0])}, ${p256(proof.pi_kp[1])}],` +
			`[${inputs}]`;
	} else if (proof.protocol == "groth") {
		S = `[${p256(proof.pi_a[0])}, ${p256(proof.pi_a[1])}],` +
			`[[${p256(proof.pi_b[0][1])}, ${p256(proof.pi_b[0][0])}],[${p256(proof.pi_b[1][1])}, ${p256(proof.pi_b[1][0])}]],` +
			`[${p256(proof.pi_c[0])}, ${p256(proof.pi_c[1])}],` +
			`[${inputs}]`;
	} else {
		throw new Error("InvalidProof");
	}
	return S
}

module.exports = generateCall;