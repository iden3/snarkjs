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

const zkeyFile = require("./src/zkeyfile");
const wtnsFile = require("./src/wtnsfile");

const loadSyms = require("./src/loadsyms");
const printR1cs = require("./src/printr1cs");

const clProcessor = require("./src/clprocessor");

const powersOfTaw = require("./src/powersoftaw");

const bn128 = require("ffjavascript").bn128;
const solidityGenerator = require("./src/soliditygenerator.js");

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
        cmd: "powersoftaw new <power> [powersoftaw_0000.ptaw]",
        description: "Starts a powers of taw ceremony",
        alias: ["ptn"],
        options: "-verbose|v",
        action: powersOfTawNew
    },
    {
        cmd: "powersoftaw export challange <powersoftaw_0000.ptaw> [challange]",
        description: "Creates a challange",
        alias: ["pte"],
        options: "-verbose|v",
        action: powersOfTawExportChallange
    },
    {
        cmd: "powersoftaw challange contribute <challange> [response]",
        description: "Contribute to a challange",
        alias: ["ptcc"],
        options: "-verbose|v -entropy|e",
        action: powersOfTawChallangeContribute
    },
    {
        cmd: "powersoftaw import <powersoftaw_old.ptaw> <response> <<powersoftaw_new.ptaw>",
        description: "import a response to a ptaw file",
        alias: ["pti"],
        options: "-verbose|v -nopoints -nocheck -description|d -name|n",
        action: powersOfTawImport
    },
    {
        cmd: "powersoftaw verify <powersoftaw.ptaw>",
        description: "verifies a powers of tau file",
        alias: ["ptv"],
        options: "-verbose|v",
        action: powersOfTawVerify
    },
    {
        cmd: "powersoftaw beacon <old_powersoftaw.ptaw> <new_powersoftaw.ptaw> <beaconHash(Hex)> <numIterationsExp>",
        description: "adds a beacon",
        alias: ["ptb"],
        options: "-verbose|v -name|n",
        action: powersOfTawBeacon
    },
    {
        cmd: "powersoftaw contribute <powersoftaw.ptaw> <new_powersoftaw.ptaw>",
        description: "verifies a powers of tau file",
        alias: ["ptc"],
        options: "-verbose|v -name|n -entropy|e",
        action: powersOfTawContribute
    },
    {
        cmd: "powersoftaw prepare phase2 <powersoftaw.ptaw> <new_powersoftaw.ptaw>",
        description: "Prepares phase 2. ",
        longDescription: " This process calculates the evaluation of the Lagrange polinomials at tau for alpha*tau and beta tau",
        alias: ["pt2"],
        options: "-verbose|v",
        action: powersOfTawPreparePhase2
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

ptau new                                    Starts a ceremony with a new challange for the powes of Tau ceremony
ptau contribute                             Contribute in the ceremony of powers of tau
ptau beacon                                 Apply a beacon random to the ceremony
ptau verify                                 Verify the powers of tau ceremony
ptau preparePhase2                          Prepare Powers of Taus for a phase 2
phase2 new                                  Starts a second phase ceremony for a given circuit with a first challange and a reference Hash.
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

    await zkeyFile.write(zkeyName, setup.vk_proof);
    // await fs.promises.writeFile(provingKeyName, JSON.stringify(stringifyBigInts(setup.vk_proof), null, 1), "utf-8");

    await fs.promises.writeFile(verificationKeyName, JSON.stringify(stringifyBigInts(setup.vk_verifier), null, 1), "utf-8");

    return 0;
}


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
    let ptawName;

    power = parseInt(params[0]);
    if ((power<1) || (power>28)) {
        throw new Error("Power must be between 1 and 28");
    }

    if (params.length < 2) {
        ptawName = "powersOfTaw" + power + "_0000.ptaw";
    } else {
        ptawName = params[1];
    }

    return await powersOfTaw.newAccumulator(bn128, power, ptawName, options.verbose);
}

async function powersOfTawExportChallange(params, options) {
    let ptawName;
    let challangeName;

    ptawName = params[0];

    if (params.length < 2) {
        challangeName = "challange";
    } else {
        challangeName = params[1];
    }

    return await powersOfTaw.exportChallange(ptawName, challangeName, options.verbose);
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

    const res = await powersOfTaw.impoertResponse(oldPtauName, response, newPtauName, options.name, importPoints, options.verbose);

    if (res) return res;
    if (!doCheck) return;

    // TODO Verify
}

async function powersOfTawVerify(params, options) {
    let ptauName;

    ptauName = params[0];

    const res = await powersOfTaw.verify(ptauName, options.verbose);
    if (res) {
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

