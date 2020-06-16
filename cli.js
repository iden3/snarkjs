#!/usr/bin/env node

/*
    Copyright 2018 0KIMS association.

    This file is part of jaz (Zero Knowledge Circuit Compiler).

    jaz is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    jaz is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with jaz. If not, see <https://www.gnu.org/licenses/>.
*/

/* eslint-disable no-console */

const fs = require("fs");
const path = require("path");

const zkSnark = require("./index.js");
const {stringifyBigInts, unstringifyBigInts} = require("ffjavascript").utils;

const loadR1cs = require("r1csfile").load;
const WitnessCalculatorBuilder = require("circom_runtime").WitnessCalculatorBuilder;

const wtnsFile = require("./src/wtnsfile");

const loadSyms = require("./src/loadsyms");
const printR1cs = require("./src/printr1cs");

const clProcessor = require("./src/clprocessor");

const powersOfTaw = require("./src/powersoftau");

const bn128 = require("ffjavascript").bn128;
const solidityGenerator = require("./src/soliditygenerator.js");

const Scalar = require("ffjavascript").Scalar;

const assert = require("assert");

const groth16Prover = require("./src/groth16_prover");
const zkey = require("./src/zkey");

const commands = [
    {
        cmd: "r1cs info [circuit.r1cs]",
        description: "Print statistiscs of a circuit",
        alias: ["ri", "info -r|r1cs:circuit.r1cs"],
        action: r1csInfo
    },
    {
        cmd: "r1cs print [circuit.r1cs] [circuit.sym]",
        description: "Print the constraints of a circuit",
        alias: ["rp", "print -r|r1cs:circuit.r1cs -s|sym"],
        action: r1csPrint
    },
    {
        cmd: "witness calculate [circuit.wasm] [input.json] [witness.wtns]",
        description: "Caclculate specific witness of a circuit given an input",
        alias: ["wc", "calculatewitness -ws|wasm:circuit.wasm -i|input:input.json -wt|witness:witness.wtns"],
        action: witnessCalculate
    },
    {
        cmd: "witness debug [circuit.wasm] [input.json] [witness.wtns] [circuit.sym]",
        description: "Calculate the witness with debug info.",
        longDescription: "Calculate the witness with debug info. \nOptions:\n-g or --g : Log signal gets\n-s or --s : Log signal sets\n-t or --trigger : Log triggers ",
        options: "-get|g -set|s -trigger|t",
        alias: ["wd"],
        action: witnessDebug
    },
    {
        cmd: "zksnark setup [circuit.r1cs] [circuit.zkey] [verification_key.json]",
        description: "Run a simple setup for a circuit generating the proving key.",
        alias: ["zs", "setup -r1cs|r -provingkey|pk -verificationkey|vk"],
        options: "-verbose|v -protocol",
        action: zksnarkSetup
    },
    {
        cmd: "zksnark prove [circuit.zkey] [witness.wtns] [proof.json] [public.json]",
        description: "Generates a zk Proof",
        alias: ["zp", "zksnark proof", "proof -pk|provingkey -wt|witness -p|proof -pub|public"],
        options: "-verbose|v -protocol",
        action: zksnarkProve
    },
    {
        cmd: "zksnark verify [verification_key.json] [public.json] [proof.json]",
        description: "Verify a zk Proof",
        alias: ["zv", "verify -vk|verificationkey -pub|public -p|proof"],
        action: zksnarkVerify
    },
    {
        cmd: "solidity genverifier <verificationKey.json> <verifier.sol>",
        description: "Creates a verifier in solidity",
        alias: ["ks", "generateverifier -vk|verificationkey -v|verifier"],
        action: solidityGenVerifier
    },
    {
        cmd: "solidity gencall <public.json> <proof.json>",
        description: "Generates call parameters ready to be called.",
        alias: ["pc", "generatecall -pub|public -p|proof"],
        action: solidityGenCall
    },
    {
        cmd: "powersoftau new <power> [powersoftau_0000.ptau]",
        description: "Starts a powers of tau ceremony",
        alias: ["ptn"],
        options: "-verbose|v",
        action: powersOfTawNew
    },
    {
        cmd: "powersoftau export challange <powersoftau_0000.ptau> [challange]",
        description: "Creates a challange",
        alias: ["ptec"],
        options: "-verbose|v",
        action: powersOfTawExportChallange
    },
    {
        cmd: "powersoftau challange contribute <challange> [response]",
        description: "Contribute to a challange",
        alias: ["ptcc"],
        options: "-verbose|v -entropy|e",
        action: powersOfTawChallangeContribute
    },
    {
        cmd: "powersoftau import <powersoftau_old.ptau> <response> <<powersoftau_new.ptau>",
        description: "import a response to a ptau file",
        alias: ["pti"],
        options: "-verbose|v -nopoints -nocheck -name|n",
        action: powersOfTawImport
    },
    {
        cmd: "powersoftau verify <powersoftau.ptau>",
        description: "verifies a powers of tau file",
        alias: ["ptv"],
        options: "-verbose|v",
        action: powersOfTawVerify
    },
    {
        cmd: "powersoftau beacon <old_powersoftau.ptau> <new_powersoftau.ptau> <beaconHash(Hex)> <numIterationsExp>",
        description: "adds a beacon",
        alias: ["ptb"],
        options: "-verbose|v -name|n",
        action: powersOfTawBeacon
    },
    {
        cmd: "powersoftau contribute <powersoftau.ptau> <new_powersoftau.ptau>",
        description: "creates a ptau file with a new contribution",
        alias: ["ptc"],
        options: "-verbose|v -name|n -entropy|e",
        action: powersOfTawContribute
    },
    {
        cmd: "powersoftau prepare phase2 <powersoftau.ptau> <new_powersoftau.ptau>",
        description: "Prepares phase 2. ",
        longDescription: " This process calculates the evaluation of the Lagrange polinomials at tau for alpha*tau and beta tau",
        alias: ["pt2"],
        options: "-verbose|v",
        action: powersOfTawPreparePhase2
    },
    {
        cmd: "powersoftau export json <powersoftau_0000.ptau> <powersoftau_0000.json>",
        description: "Exports a power of tau file to a JSON",
        alias: ["ptej"],
        options: "-verbose|v",
        action: powersOfTawExportJson
    },
    {
        cmd: "zkey new [circuit.r1cs] [powersoftau.ptau] [circuit.zkey]",
        description: "Creates an initial pkey file with zero contributions ",
        alias: ["zkn"],
        options: "-verbose|v",
        action: zkeyNew
    },
    {
        cmd: "zkey export bellman [circuit.zkey] [circuit.mpcparams]",
        description: "Export a zKey to a MPCParameters file compatible with kobi/phase2 (Bellman)",
        alias: ["zkeb"],
        options: "-verbose|v",
        action: zkeyExportBellman
    },
    {
        cmd: "zkey import bellman <circuit_old.zkey> <circuit.mpcparams> <circuit_new.zkey>",
        description: "Export a zKey to a MPCParameters file compatible with kobi/phase2 (Bellman) ",
        alias: ["zkib"],
        options: "-verbose|v",
        action: zkeyImportBellman
    },
    {
        cmd: "zkey verify [circuit.r1cs] [powersoftau.ptau] [circuit.zkey]",
        description: "Verify zkey file contributions and verify that matches with the original circuit.r1cs and ptau",
        alias: ["zkv"],
        options: "-verbose|v",
        action: zkeyVerify
    },
    {
        cmd: "zkey contribute <circuit_old.zkey> <circuit_new.zkey>",
        description: "creates a zkey file with a new contribution",
        alias: ["zkc"],
        options: "-verbose|v  -entropy|e -name|n",
        action: zkeyContribute
    },
    {
        cmd: "zkey export vkey [circuit.zkey] [verification_key.json]",
        description: "Exports a verification key",
        alias: ["zkev"],
        action: zkeyExportVKey
    },
    {
        cmd: "zkey export json [circuit.zkey] [circuit.zkey.json]",
        description: "Exports a circuit key to a JSON file",
        alias: ["zkej"],
        options: "-verbose|v",
        action: zkeyExportJson
    },

];



clProcessor(commands).then( (res) => {
    process.exit(res);
}, (err) => {
    console.log(err.stack);
    console.log("ERROR: " + err);
    process.exit(1);
});

/*

TODO COMMANDS
=============

    {
        cmd: "r1cs export circomJSON [circuit.r1cs] [circuit.json]",
        description: "Exports a R1CS to JSON file.",
        alias: ["rj"],
        action: r1csExportCircomJSON
    },
    {
        cmd: "witness export json <witness.wtns> <witness.json>",
        description: "Export witness file to json",
        alias: ["wj"],
        action: witnessExportJson
    },

    {
        cmd: "zkey export vkey <circuit.zkey> <verification_key.json>",
        description: "Exports a verification key to JSON",
        alias: ["kv"],
        action: zKeySolidity
    },

    {
        cmd: "witness verify <circuit.r1cs> <witness.wtns>",
        description: "Verify a witness agains a r1cs",
        alias: ["wv"],
        action: witnessVerify
    },

phase2 constribute                          Contribute in the seconf phase ceremony
phase2 beacon                               Contribute in the seconf phase ceremony with a Powers of Tau
phase2 verify                               Verify the Powers of tau
zksnark setup                s              Run a simple setup for a circuit generating the proving key.
zksnark prove                p              Generates a zk Proof
zksnark verify               v              Verify a zk Proof
zkey export pkJSON           pkjson         Exports a proving key to JSON
zkey export vkJSON           vkjson         Exports a verification key to JSON
zkey export vkSolidity       vksol          Creates a verifier in solidity
proof callParameters         cp             Generates call parameters ready to be called.
*/


function p256(n) {
    let nstr = n.toString(16);
    while (nstr.length < 64) nstr = "0"+nstr;
    nstr = `"0x${nstr}"`;
    return nstr;
}

function changeExt(fileName, newExt) {
    let S = fileName;
    while ((S.length>0) && (S[S.length-1] != ".")) S = S.slice(0, S.length-1);
    if (S.length>0) {
        return S + newExt;
    } else {
        return fileName+"."+newExt;
    }
}

// r1cs export circomJSON [circuit.r1cs] [circuit.json]
async function r1csInfo(params, options) {
    const r1csName = params[0] ||  "circuit.r1cs";

    const cir = await loadR1cs(r1csName);

    console.log(`# Wires: ${cir.nVars}`);
    console.log(`# Constraints: ${cir.nConstraints}`);
    console.log(`# Private Inputs: ${cir.nPrvInputs}`);
    console.log(`# Public Inputs: ${cir.nPubInputs}`);
    console.log(`# Outputs: ${cir.nOutputs}`);

    return 0;
}

// r1cs print [circuit.r1cs] [circuit.sym]
async function r1csPrint(params, options) {
    const r1csName = params[0] || "circuit.r1cs";
    const symName = params[2] || changeExt(r1csName, "sym");
    const cir = await loadR1cs(r1csName, true, true);

    const sym = await loadSyms(symName);

    printR1cs(cir, sym);

    return 0;
}

// witness calculate <circuit.wasm> <input.json> <witness.wtns>
async function witnessCalculate(params, options) {
    const wasmName = params[0] || "circuit.wasm";
    const inputName = params[1] || "input.json";
    const witnessName = params[2] || "witness.wtns";

    const wasm = await fs.promises.readFile(wasmName);
    const input = unstringifyBigInts(JSON.parse(await fs.promises.readFile(inputName, "utf8")));

    const wc = await WitnessCalculatorBuilder(wasm, options);

    const w = await wc.calculateBinWitness(input);
    await wtnsFile.writeBin(witnessName, w, wc.prime);
/*
    const w = await wc.calculateWitness(input);
    await wtnsFile.write(witnessName, w, wc.prime);
*/
    // fs.promises.writeFile(witnessName, JSON.stringify(stringifyBigInts(w), null, 1));

    return 0;
}


// witness debug <circuit.wasm> <input.json> <witness.wtns> <circuit.sym>
// -get|g -set|s -trigger|t
async function witnessDebug(params, options) {
    const wasmName = params[0] || "circuit.wasm";
    const inputName = params[1] || "input.json";
    const witnessName = params[2] || "witness.wtns";
    const symName = params[3] || changeExt(wasmName, "sym");

    const wasm = await fs.promises.readFile(wasmName);
    const input = unstringifyBigInts(JSON.parse(await fs.promises.readFile(inputName, "utf8")));

    let wcOps = {
        sanityCheck: true
    };
    let sym = await loadSyms(symName);
    if (options.set) {
        if (!sym) sym = await loadSyms(symName);
        wcOps.logSetSignal= function(labelIdx, value) {
            console.log("SET " + sym.labelIdx2Name[labelIdx] + " <-- " + value.toString());
        };
    }
    if (options.get) {
        if (!sym) sym = await loadSyms(symName);
        wcOps.logGetSignal= function(varIdx, value) {
            console.log("GET " + sym.labelIdx2Name[varIdx] + " --> " + value.toString());
        };
    }
    if (options.trigger) {
        if (!sym) sym = await loadSyms(symName);
        wcOps.logStartComponent= function(cIdx) {
            console.log("START: " + sym.componentIdx2Name[cIdx]);
        };
        wcOps.logFinishComponent= function(cIdx) {
            console.log("FINISH: " + sym.componentIdx2Name[cIdx]);
        };
    }

    const wc = await WitnessCalculatorBuilder(wasm, wcOps);

    const w = await wc.calculateWitness(input);

    await wtnsFile.write(witnessName, w);

    // await fs.promises.writeFile(witnessName, JSON.stringify(stringifyBigInts(w), null, 1));

    return 0;
}


// zksnark setup [circuit.r1cs] [circuit.zkey] [verification_key.json]
async function zksnarkSetup(params, options) {

    const r1csName = params[0] || "circuit.r1cs";
    const zkeyName = params[1] || changeExt(r1csName, "zkey");
    const verificationKeyName = params[2] || "verification_key.json";

    const protocol = options.protocol || "groth16";

    const cir = await loadR1cs(r1csName, true);

    if (!zkSnark[protocol]) throw new Error("Invalid protocol");
    const setup = zkSnark[protocol].setup(cir, options.verbose);

    await zkey.utils.write(zkeyName, setup.vk_proof);
    // await fs.promises.writeFile(provingKeyName, JSON.stringify(stringifyBigInts(setup.vk_proof), null, 1), "utf-8");

    await fs.promises.writeFile(verificationKeyName, JSON.stringify(stringifyBigInts(setup.vk_verifier), null, 1), "utf-8");

    return 0;
}

/*
// zksnark prove [circuit.zkey] [witness.wtns] [proof.json] [public.json]
async function zksnarkProve(params, options) {

    const zkeyName = params[0] || "circuit.zkey";
    const witnessName = params[1] || "witness.wtns";
    const proofName = params[2] || "proof.json";
    const publicName = params[3] || "public.json";

    const witness = await wtnsFile.read(witnessName);
    // const witness = unstringifyBigInts(JSON.parse(fs.readFileSync(witnessName, "utf8")));

    const provingKey = await zkeyFile.read(zkeyName);
    // const provingKey = unstringifyBigInts(JSON.parse(fs.readFileSync(provingKeyName, "utf8")));

    const protocol = provingKey.protocol;

    if (!zkSnark[protocol]) throw new Error("Invalid protocol");
    const {proof, publicSignals} = zkSnark[protocol].genProof(provingKey, witness, options.verbose);

    await fs.promises.writeFile(proofName, JSON.stringify(stringifyBigInts(proof), null, 1), "utf-8");
    await fs.promises.writeFile(publicName, JSON.stringify(stringifyBigInts(publicSignals), null, 1), "utf-8");

    return 0;
}
*/


// zksnark prove [circuit.zkey] [witness.wtns] [proof.json] [public.json]
async function zksnarkProve(params, options) {

    const zkeyName = params[0] || "circuit.zkey";
    const witnessName = params[1] || "witness.wtns";
    const proofName = params[2] || "proof.json";
    const publicName = params[3] || "public.json";


    const {proof, publicSignals} = await groth16Prover(zkeyName, witnessName, options.verbose);

    await fs.promises.writeFile(proofName, JSON.stringify(stringifyBigInts(proof), null, 1), "utf-8");
    await fs.promises.writeFile(publicName, JSON.stringify(stringifyBigInts(publicSignals), null, 1), "utf-8");

    return 0;
}

// zksnark verify [verification_key.json] [public.json] [proof.json]
async function zksnarkVerify(params, options) {

    const verificationKeyName = params[0] || "verification_key.json";
    const publicName = params[0] || "public.json";
    const proofName = params[0] || "proof.json";

    const verificationKey = unstringifyBigInts(JSON.parse(fs.readFileSync(verificationKeyName, "utf8")));
    const pub = unstringifyBigInts(JSON.parse(fs.readFileSync(publicName, "utf8")));
    const proof = unstringifyBigInts(JSON.parse(fs.readFileSync(proofName, "utf8")));

    const protocol = verificationKey.protocol;
    if (!zkSnark[protocol]) throw new Error("Invalid protocol");

    const isValid = zkSnark[protocol].isValid(verificationKey, proof, pub);

    if (isValid) {
        console.log("OK");
        return 0;
    } else {
        console.log("INVALID");
        return 1;
    }
}

// zkey export vkey [circuit.zkey] [verification_key.json]",
async function zkeyExportVKey(params) {
    const zkeyName = params[0] || "circuit.zkey";
    const verificationKeyName = params[2] || "verification_key.json";

    const zKey = await zkey.utils.read(zkeyName);

    let curve;
    if (Scalar.eq(zKey.q, bn128.q)) {
        curve = bn128;
    } else {
        assert(false, " Curve not supported");
    }
    const vKey = {
        protocol: zKey.protocol,
        nPublic: zKey.nPublic,
        IC: zKey.IC,


        vk_alpha_1: zKey.vk_alpha_1,

        vk_beta_2: zKey.vk_beta_2,
        vk_gamma_2:  zKey.vk_gamma_2,
        vk_delta_2:  zKey.vk_delta_2,

        vk_alphabeta_12: curve.pairing( zKey.vk_alpha_1 , zKey.vk_beta_2 )
    };

    await fs.promises.writeFile(verificationKeyName, JSON.stringify(stringifyBigInts(vKey), null, 1), "utf-8");

}

// zkey export json [circuit.zkey] [circuit.zkey.json]",
async function zkeyExportJson(params, options) {
    const zkeyName = params[0] || "circuit.zkey";
    const zkeyJsonName = params[1] || "circuit.zkey.json";

    return await zkey.exportJson(zkeyName, zkeyJsonName, options.verbose);
}

// solidity genverifier <verificationKey.json> <verifier.sol>
async function solidityGenVerifier(params, options) {
    let verificationKeyName;
    let verifierName;

    if (params.length < 1) {
        verificationKeyName = "verification_key.json";
    } else {
        verificationKeyName = params[0];
    }

    if (params.length < 2) {
        verifierName = "verifier.sol";
    } else {
        verifierName = params[1];
    }

    const verificationKey = unstringifyBigInts(JSON.parse(fs.readFileSync(verificationKeyName, "utf8")));

    let verifierCode;
    if (verificationKey.protocol == "original") {
        verifierCode = solidityGenerator.generateVerifier_original(verificationKey);
    } else if (verificationKey.protocol == "groth16") {
        verifierCode = solidityGenerator.generateVerifier_groth16(verificationKey);
    } else if (verificationKey.protocol == "kimleeoh") {
        verifierCode = solidityGenerator.generateVerifier_kimleeoh(verificationKey);
    } else {
        throw new Error("InvalidProof");
    }

    fs.writeFileSync(verifierName, verifierCode, "utf-8");

    return 0;
}


// solidity gencall <public.json> <proof.json>
async function solidityGenCall(params, options) {
    let publicName;
    let proofName;

    if (params.length < 1) {
        publicName = "public.json";
    } else {
        publicName = params[0];
    }

    if (params.length < 2) {
        proofName = "proof.json";
    } else {
        proofName = params[1];
    }


    const public = unstringifyBigInts(JSON.parse(fs.readFileSync(publicName, "utf8")));
    const proof = unstringifyBigInts(JSON.parse(fs.readFileSync(proofName, "utf8")));

    let inputs = "";
    for (let i=0; i<public.length; i++) {
        if (inputs != "") inputs = inputs + ",";
        inputs = inputs + p256(public[i]);
    }

    let S;
    if ((typeof proof.protocol === "undefined") || (proof.protocol == "original")) {
        S=`[${p256(proof.pi_a[0])}, ${p256(proof.pi_a[1])}],` +
          `[${p256(proof.pi_ap[0])}, ${p256(proof.pi_ap[1])}],` +
          `[[${p256(proof.pi_b[0][1])}, ${p256(proof.pi_b[0][0])}],[${p256(proof.pi_b[1][1])}, ${p256(proof.pi_b[1][0])}]],` +
          `[${p256(proof.pi_bp[0])}, ${p256(proof.pi_bp[1])}],` +
          `[${p256(proof.pi_c[0])}, ${p256(proof.pi_c[1])}],` +
          `[${p256(proof.pi_cp[0])}, ${p256(proof.pi_cp[1])}],` +
          `[${p256(proof.pi_h[0])}, ${p256(proof.pi_h[1])}],` +
          `[${p256(proof.pi_kp[0])}, ${p256(proof.pi_kp[1])}],` +
          `[${inputs}]`;
    } else if ((proof.protocol == "groth16")||(proof.protocol == "kimleeoh")) {
        S=`[${p256(proof.pi_a[0])}, ${p256(proof.pi_a[1])}],` +
          `[[${p256(proof.pi_b[0][1])}, ${p256(proof.pi_b[0][0])}],[${p256(proof.pi_b[1][1])}, ${p256(proof.pi_b[1][0])}]],` +
          `[${p256(proof.pi_c[0])}, ${p256(proof.pi_c[1])}],` +
          `[${inputs}]`;
    } else {
        throw new Error("InvalidProof");
    }

    console.log(S);

    return 0;
}

async function powersOfTawNew(params, options) {
    let power;
    let ptauName;

    power = parseInt(params[0]);
    if ((power<1) || (power>28)) {
        throw new Error("Power must be between 1 and 28");
    }

    if (params.length < 2) {
        ptauName = "powersOfTaw" + power + "_0000.ptau";
    } else {
        ptauName = params[1];
    }

    return await powersOfTaw.newAccumulator(bn128, power, ptauName, options.verbose);
}

async function powersOfTawExportChallange(params, options) {
    let ptauName;
    let challangeName;

    ptauName = params[0];

    if (params.length < 2) {
        challangeName = "challange";
    } else {
        challangeName = params[1];
    }

    return await powersOfTaw.exportChallange(ptauName, challangeName, options.verbose);
}


async function powersOfTawChallangeContribute(params, options) {
    let challangeName;
    let responseName;

    challangeName = params[0];

    if (params.length < 2) {
        responseName = changeExt(challangeName, "response");
    } else {
        responseName = params[1];
    }

    return await powersOfTaw.challangeContribute(bn128, challangeName, responseName, options.entropy, options.verbose);
}


async function powersOfTawImport(params, options) {
    let oldPtauName;
    let response;
    let newPtauName;
    let importPoints = true;
    let doCheck = true;

    oldPtauName = params[0];
    response = params[1];
    newPtauName = params[2];

    if (options.nopoints) importPoints = false;
    if (options.nocheck) doCheck = false;

    const res = await powersOfTaw.importResponse(oldPtauName, response, newPtauName, options.name, importPoints, options.verbose);

    if (res) return res;
    if (!doCheck) return;

    // TODO Verify
}

async function powersOfTawVerify(params, options) {
    let ptauName;

    ptauName = params[0];

    const res = await powersOfTaw.verify(ptauName, options.verbose);
    if (res === true) {
        console.log("Powers of tau OK!");
        return 0;
    } else {
        console.log("=======>INVALID Powers of tau<==========");
        return 1;
    }
}

async function powersOfTawBeacon(params, options) {
    let oldPtauName;
    let newPtauName;
    let beaconHashStr;
    let numIterationsExp;

    oldPtauName = params[0];
    newPtauName = params[1];
    beaconHashStr = params[2];
    numIterationsExp = params[3];

    return await powersOfTaw.beacon(oldPtauName, newPtauName, options.name ,numIterationsExp, beaconHashStr, options.verbose);
}

async function powersOfTawContribute(params, options) {
    let oldPtauName;
    let newPtauName;

    oldPtauName = params[0];
    newPtauName = params[1];

    return await powersOfTaw.contribute(oldPtauName, newPtauName, options.name , options.entropy, options.verbose);
}

async function powersOfTawPreparePhase2(params, options) {
    let oldPtauName;
    let newPtauName;

    oldPtauName = params[0];
    newPtauName = params[1];

    return await powersOfTaw.preparePhase2(oldPtauName, newPtauName, options.verbose);
}

// powersoftau export json <powersoftau_0000.ptau> <powersoftau_0000.json>",
async function powersOfTawExportJson(params, options) {
    let ptauName;
    let jsonName;

    ptauName = params[0];
    jsonName = params[1];

    return await powersOfTaw.exportJson(ptauName, jsonName, options.verbose);
}


// phase2 new <circuit.r1cs> <powersoftau.ptau> <circuit.zkey>
async function zkeyNew(params, options) {
    let r1csName;
    let ptauName;
    let zkeyName;

    if (params.length < 1) {
        r1csName = "circuit.r1cs";
    } else {
        r1csName = params[0];
    }

    if (params.length < 2) {
        ptauName = "powersoftau.ptau";
    } else {
        ptauName = params[1];
    }

    if (params.length < 2) {
        zkeyName = "circuit.zkey";
    } else {
        zkeyName = params[2];
    }

    return zkey.new(r1csName, ptauName, zkeyName, options.verbose);
}

// zkey export bellman [circuit.zkey] [circuit.mpcparams]
async function zkeyExportBellman(params, options) {
    let zkeyName;
    let mpcparamsName;

    if (params.length < 1) {
        zkeyName = "circuit.zkey";
    } else {
        zkeyName = params[0];
    }

    if (params.length < 2) {
        mpcparamsName = "circuit.mpcparams";
    } else {
        mpcparamsName = params[1];
    }

    return zkey.exportMPCParams(zkeyName, mpcparamsName, options.verbose);

}


// zkey import bellman <circuit_old.zkey> <circuit.mpcparams> <circuit_new.zkey>
async function zkeyImportBellman(params, options) {
    let zkeyNameOld;
    let mpcParamsName;
    let zkeyNameNew;

    zkeyNameOld = params[0];
    mpcParamsName = params[1];
    zkeyNameNew = params[2];

    return zkey.importBellman(zkeyNameOld, mpcParamsName, zkeyNameNew, options.verbose);
}

// phase2 verify [circuit.r1cs] [powersoftau.ptau] [circuit.zkey]
async function zkeyVerify(params, options) {
    let r1csName;
    let ptauName;
    let zkeyName;

    if (params.length < 1) {
        r1csName = "circuit.r1cs";
    } else {
        r1csName = params[0];
    }

    if (params.length < 2) {
        ptauName = "powersoftau.ptau";
    } else {
        ptauName = params[1];
    }

    if (params.length < 3) {
        zkeyName = "circuit.zkey";
    } else {
        zkeyName = params[2];
    }

    const res = await zkey.verify(r1csName, ptauName, zkeyName, options.verbose);
    if (res === true) {
        console.log("zKey OK!");
        return 0;
    } else {
        console.log("=======>INVALID zKey<==========");
        return 1;
    }

}


// zkey contribute <circuit_old.zkey> <circuit_new.zkey>
async function zkeyContribute(params, options) {
    let zkeyOldName;
    let zkeyNewName;

    zkeyOldName = params[0];
    zkeyNewName = params[1];


    return zkey.contribute(zkeyOldName, zkeyNewName, options.name, options.entropy, options.verbose);
}
