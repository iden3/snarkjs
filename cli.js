/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

    snarkJS is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    snarkJS is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with snarkJS. If not, see <https://www.gnu.org/licenses/>.
*/

/* eslint-disable no-console */

import fs from "fs";
import url from "url";

import {readR1cs} from "r1csfile";

import loadSyms from "./src/loadsyms.js";
import * as r1cs from "./src/r1cs.js";

import clProcessor from "./src/clprocessor.js";

import * as powersOfTau from "./src/powersoftau.js";

import {  utils }   from "ffjavascript";
const {stringifyBigInts} = utils;

import * as zkey from "./src/zkey.js";
import * as groth16 from "./src/groth16.js";
import * as plonk from "./src/plonk.js";
import * as wtns from "./src/wtns.js";
import * as curves from "./src/curves.js";
import path from "path";
import bfj from "bfj";

import Logger from "logplease";
import * as binFileUtils from "@iden3/binfileutils";
const logger = Logger.create("snarkJS", {showTimestamp:false});
Logger.setLogLevel("INFO");

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const commands = [
    {
        cmd: "powersoftau new <curve> <power> [powersoftau_0000.ptau]",
        description: "Starts a powers of tau ceremony",
        alias: ["ptn"],
        options: "-verbose|v",
        action: powersOfTauNew
    },
    {
        cmd: "powersoftau contribute <powersoftau.ptau> <new_powersoftau.ptau>",
        description: "creates a ptau file with a new contribution",
        alias: ["ptc"],
        options: "-verbose|v -name|n -entropy|e",
        action: powersOfTauContribute
    },
    {
        cmd: "powersoftau export challenge <powersoftau_0000.ptau> [challenge]",
        description: "Creates a challenge",
        alias: ["ptec"],
        options: "-verbose|v",
        action: powersOfTauExportChallenge
    },
    {
        cmd: "powersoftau challenge contribute <curve> <challenge> [response]",
        description: "Contribute to a challenge",
        alias: ["ptcc"],
        options: "-verbose|v -entropy|e",
        action: powersOfTauChallengeContribute
    },
    {
        cmd: "powersoftau import response <powersoftau_old.ptau> <response> <<powersoftau_new.ptau>",
        description: "import a response to a ptau file",
        alias: ["ptir"],
        options: "-verbose|v -nopoints -nocheck -name|n",
        action: powersOfTauImport
    },
    {
        cmd: "powersoftau beacon <old_powersoftau.ptau> <new_powersoftau.ptau> <beaconHash(Hex)> <numIterationsExp>",
        description: "adds a beacon",
        alias: ["ptb"],
        options: "-verbose|v -name|n",
        action: powersOfTauBeacon
    },
    {
        cmd: "powersoftau prepare phase2 <powersoftau.ptau> <new_powersoftau.ptau>",
        description: "Prepares phase 2. ",
        longDescription: " This process calculates the evaluation of the Lagrange polinomials at tau for alpha*tau and beta tau",
        alias: ["pt2"],
        options: "-verbose|v",
        action: powersOfTauPreparePhase2
    },
    {
        cmd: "powersoftau convert <old_powersoftau.ptau> <new_powersoftau.ptau>",
        description: "Convert ptau",
        longDescription: " This process calculates the evaluation of the Lagrange polinomials at tau for alpha*tau and beta tau",
        alias: ["ptcv"],
        options: "-verbose|v",
        action: powersOfTauConvert
    },
    {
        cmd: "powersoftau truncate <powersoftau.ptau>",
        description: "Generate diferent powers of tau with smoller sizes ",
        longDescription: " This process generates smaller ptau files from a bigger power ptau",
        alias: ["ptt"],
        options: "-verbose|v",
        action: powersOfTauTruncate
    },
    {
        cmd: "powersoftau verify <powersoftau.ptau>",
        description: "verifies a powers of tau file",
        alias: ["ptv"],
        options: "-verbose|v",
        action: powersOfTauVerify
    },
    {
        cmd: "powersoftau export json <powersoftau_0000.ptau> <powersoftau_0000.json>",
        description: "Exports a power of tau file to a JSON",
        alias: ["ptej"],
        options: "-verbose|v",
        action: powersOfTauExportJson
    },
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
        cmd: "r1cs export json [circuit.r1cs] [circuit.json]",
        description: "Export r1cs to JSON file",
        alias: ["rej"],
        action: r1csExportJSON
    },
    {
        cmd: "wtns calculate [circuit.wasm] [input.json] [witness.wtns]",
        description: "Caclculate specific witness of a circuit given an input",
        alias: ["wc", "calculatewitness -ws|wasm:circuit.wasm -i|input:input.json -wt|witness:witness.wtns"],
        action: wtnsCalculate
    },
    {
        cmd: "wtns debug [circuit.wasm] [input.json] [witness.wtns] [circuit.sym]",
        description: "Calculate the witness with debug info.",
        longDescription: "Calculate the witness with debug info. \nOptions:\n-g or --g : Log signal gets\n-s or --s : Log signal sets\n-t or --trigger : Log triggers ",
        options: "-get|g -set|s -trigger|t",
        alias: ["wd"],
        action: wtnsDebug
    },
    {
        cmd: "wtns export json [witness.wtns] [witnes.json]",
        description: "Calculate the witness with debug info.",
        longDescription: "Calculate the witness with debug info. \nOptions:\n-g or --g : Log signal gets\n-s or --s : Log signal sets\n-t or --trigger : Log triggers ",
        options: "-verbose|v",
        alias: ["wej"],
        action: wtnsExportJson
    },
    {
        cmd: "zkey contribute <circuit_old.zkey> <circuit_new.zkey>",
        description: "creates a zkey file with a new contribution",
        alias: ["zkc"],
        options: "-verbose|v  -entropy|e -name|n",
        action: zkeyContribute
    },
    {
        cmd: "zkey export bellman <circuit_xxxx.zkey> [circuit.mpcparams]",
        description: "Export a zKey to a MPCParameters file compatible with kobi/phase2 (Bellman)",
        alias: ["zkeb"],
        options: "-verbose|v",
        action: zkeyExportBellman
    },
    {
        cmd: "zkey bellman contribute <curve> <circuit.mpcparams> <circuit_response.mpcparams>",
        description: "contributes to a challenge file in bellman format",
        alias: ["zkbc"],
        options: "-verbose|v  -entropy|e",
        action: zkeyBellmanContribute
    },
    {
        cmd: "zkey import bellman <circuit_old.zkey> <circuit.mpcparams> <circuit_new.zkey>",
        description: "Export a zKey to a MPCParameters file compatible with kobi/phase2 (Bellman) ",
        alias: ["zkib"],
        options: "-verbose|v -name|n",
        action: zkeyImportBellman
    },
    {
        cmd: "zkey beacon <circuit_old.zkey> <circuit_new.zkey> <beaconHash(Hex)> <numIterationsExp>",
        description: "adds a beacon",
        alias: ["zkb"],
        options: "-verbose|v -name|n",
        action: zkeyBeacon
    },
    {
        cmd: "zkey verify r1cs [circuit.r1cs] [powersoftau.ptau] [circuit_final.zkey]",
        description: "Verify zkey file contributions and verify that matches with the original circuit.r1cs and ptau",
        alias: ["zkv", "zkvr", "zkey verify"],
        options: "-verbose|v",
        action: zkeyVerifyFromR1cs
    },
    {
        cmd: "zkey verify init [circuit_0000.zkey] [powersoftau.ptau] [circuit_final.zkey]",
        description: "Verify zkey file contributions and verify that matches with the original circuit.r1cs and ptau",
        alias: ["zkvi"],
        options: "-verbose|v",
        action: zkeyVerifyFromInit
    },
    {
        cmd: "zkey export verificationkey [circuit_final.zkey] [verification_key.json]",
        description: "Exports a verification key",
        alias: ["zkev"],
        action: zkeyExportVKey
    },
    {
        cmd: "zkey export json [circuit_final.zkey] [circuit_final.zkey.json]",
        description: "Exports a circuit key to a JSON file",
        alias: ["zkej"],
        options: "-verbose|v",
        action: zkeyExportJson
    },
    {
        cmd: "zkey export solidityverifier [circuit_final.zkey] [verifier.sol]",
        description: "Creates a verifier in solidity",
        alias: ["zkesv", "generateverifier -vk|verificationkey -v|verifier"],
        action: zkeyExportSolidityVerifier
    },
    {
        cmd: "zkey export soliditycalldata [public.json] [proof.json]",
        description: "Generates call parameters ready to be called.",
        alias: ["zkesc", "generatecall -pub|public -p|proof"],
        action: zkeyExportSolidityCalldata
    },
    {
        cmd: "groth16 setup [circuit.r1cs] [powersoftau.ptau] [circuit_0000.zkey]",
        description: "Creates an initial groth16 pkey file with zero contributions",
        alias: ["g16s", "zkn", "zkey new"],
        options: "-verbose|v",
        action: zkeyNew
    },
    {
        cmd: "groth16 prove [circuit_final.zkey] [witness.wtns] [proof.json] [public.json]",
        description: "Generates a zk Proof from witness",
        alias: ["g16p", "zpw", "zksnark proof", "proof -pk|provingkey -wt|witness -p|proof -pub|public"],
        options: "-verbose|v -protocol",
        action: groth16Prove
    },
    {
        cmd: "groth16 fullprove [input.json] [circuit_final.wasm] [circuit_final.zkey] [proof.json] [public.json]",
        description: "Generates a zk Proof from input",
        alias: ["g16f", "g16i"],
        options: "-verbose|v -protocol",
        action: groth16FullProve
    },
    {
        cmd: "groth16 verify [verification_key.json] [public.json] [proof.json]",
        description: "Verify a zk Proof",
        alias: ["g16v", "verify -vk|verificationkey -pub|public -p|proof"],
        action: groth16Verify
    },
    {
        cmd: "plonk setup [circuit.r1cs] [powersoftau.ptau] [circuit.zkey]",
        description: "Creates an initial PLONK pkey ",
        alias: ["pks"],
        options: "-verbose|v",
        action: plonkSetup
    },
    {
        cmd: "plonk prove [circuit.zkey] [witness.wtns] [proof.json] [public.json]",
        description: "Generates a PLONK Proof from witness",
        alias: ["pkp"],
        options: "-verbose|v -protocol",
        action: plonkProve
    },
    {
        cmd: "plonk fullprove [input.json] [circuit.wasm] [circuit.zkey] [proof.json] [public.json]",
        description: "Generates a PLONK Proof from input",
        alias: ["pkf"],
        options: "-verbose|v -protocol",
        action: plonkFullProve
    },
    {
        cmd: "plonk verify [verification_key.json] [public.json] [proof.json]",
        description: "Verify a PLONK Proof",
        alias: ["pkv"],
        options: "-verbose|v",
        action: plonkVerify
    },
    {
        cmd: "file info [binary.file]",
        description: "Check info of a binary file",
        alias: ["fi"],
        action: fileInfo
    }
];



clProcessor(commands).then( (res) => {
    process.exit(res);
}, (err) => {
    logger.error(err);
    process.exit(1);
});

/*

TODO COMMANDS
=============

    {
        cmd: "zksnark setup [circuit.r1cs] [circuit.zkey] [verification_key.json]",
        description: "Run a simple setup for a circuit generating the proving key.",
        alias: ["zs", "setup -r1cs|r -provingkey|pk -verificationkey|vk"],
        options: "-verbose|v -protocol",
        action: zksnarkSetup
    },
    {
        cmd: "witness verify <circuit.r1cs> <witness.wtns>",
        description: "Verify a witness agains a r1cs",
        alias: ["wv"],
        action: witnessVerify
    },
    {
        cmd: "powersOfTau export response"
    }
*/


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

    if (options.verbose) Logger.setLogLevel("DEBUG");

    await r1cs.info(r1csName, logger);


    return 0;
}

// r1cs print [circuit.r1cs] [circuit.sym]
async function r1csPrint(params, options) {
    const r1csName = params[0] || "circuit.r1cs";
    const symName = params[1] || changeExt(r1csName, "sym");

    if (options.verbose) Logger.setLogLevel("DEBUG");

    const cir = await readR1cs(r1csName, true, true, false);

    const sym = await loadSyms(symName);

    await r1cs.print(cir, sym, logger);

    return 0;
}


// r1cs export json [circuit.r1cs] [circuit.json]
async function r1csExportJSON(params, options) {
    const r1csName = params[0] || "circuit.r1cs";
    const jsonName = params[1] || changeExt(r1csName, "json");

    if (options.verbose) Logger.setLogLevel("DEBUG");

    const r1csObj = await r1cs.exportJson(r1csName, logger);

    await bfj.write(jsonName, r1csObj, { space: 1 });

    return 0;
}

// wtns calculate <circuit.wasm> <input.json> <witness.wtns>
async function wtnsCalculate(params, options) {
    const wasmName = params[0] || "circuit.wasm";
    const inputName = params[1] || "input.json";
    const witnessName = params[2] || "witness.wtns";

    if (options.verbose) Logger.setLogLevel("DEBUG");

    const input = JSON.parse(await fs.promises.readFile(inputName, "utf8"));

    await wtns.calculate(input, wasmName, witnessName, {});

    return 0;
}


// wtns debug <circuit.wasm> <input.json> <witness.wtns> <circuit.sym>
// -get|g -set|s -trigger|t
async function wtnsDebug(params, options) {
    const wasmName = params[0] || "circuit.wasm";
    const inputName = params[1] || "input.json";
    const witnessName = params[2] || "witness.wtns";
    const symName = params[3] || changeExt(wasmName, "sym");

    if (options.verbose) Logger.setLogLevel("DEBUG");

    const input = JSON.parse(await fs.promises.readFile(inputName, "utf8"));

    await wtns.debug(input, wasmName, witnessName, symName, options, logger);

    return 0;
}


// wtns export json  [witness.wtns] [witness.json]
// -get|g -set|s -trigger|t
async function wtnsExportJson(params, options) {
    const wtnsName = params[0] || "witness.wtns";
    const jsonName = params[1] || "witness.json";

    if (options.verbose) Logger.setLogLevel("DEBUG");

    const w = await wtns.exportJson(wtnsName);

    await bfj.write(jsonName, stringifyBigInts(w), { space: 1 });

    return 0;
}


/*
// zksnark setup [circuit.r1cs] [circuit.zkey] [verification_key.json]
async function zksnarkSetup(params, options) {

    const r1csName = params[0] || "circuit.r1cs";
    const zkeyName = params[1] || changeExt(r1csName, "zkey");
    const verificationKeyName = params[2] || "verification_key.json";

    const protocol = options.protocol || "groth16";

    const cir = await readR1cs(r1csName, true);

    if (!zkSnark[protocol]) throw new Error("Invalid protocol");
    const setup = zkSnark[protocol].setup(cir, options.verbose);

    await zkey.utils.write(zkeyName, setup.vk_proof);
    await bfj.write(provingKeyName, stringifyBigInts(setup.vk_proof), { space: 1 });

    await bfj.write(verificationKeyName, stringifyBigInts(setup.vk_verifier), { space: 1 });

    return 0;
}
*/

// groth16 prove [circuit.zkey] [witness.wtns] [proof.json] [public.json]
async function groth16Prove(params, options) {

    const zkeyName = params[0] || "circuit_final.zkey";
    const witnessName = params[1] || "witness.wtns";
    const proofName = params[2] || "proof.json";
    const publicName = params[3] || "public.json";

    if (options.verbose) Logger.setLogLevel("DEBUG");

    const {proof, publicSignals} = await groth16.prove(zkeyName, witnessName, logger);

    await bfj.write(proofName, stringifyBigInts(proof), { space: 1 });
    await bfj.write(publicName, stringifyBigInts(publicSignals), { space: 1 });

    return 0;
}

// groth16 fullprove [input.json] [circuit.wasm] [circuit.zkey] [proof.json] [public.json]
async function groth16FullProve(params, options) {

    const inputName = params[0] || "input.json";
    const wasmName = params[1] || "circuit.wasm";
    const zkeyName = params[2] || "circuit_final.zkey";
    const proofName = params[3] || "proof.json";
    const publicName = params[4] || "public.json";

    if (options.verbose) Logger.setLogLevel("DEBUG");

    const input = JSON.parse(await fs.promises.readFile(inputName, "utf8"));

    const {proof, publicSignals} = await groth16.fullProve(input, wasmName, zkeyName,  logger);

    await bfj.write(proofName, stringifyBigInts(proof), { space: 1 });
    await bfj.write(publicName, stringifyBigInts(publicSignals), { space: 1 });

    return 0;
}

// groth16 verify [verification_key.json] [public.json] [proof.json]
async function groth16Verify(params, options) {

    const verificationKeyName = params[0] || "verification_key.json";
    const publicName = params[1] || "public.json";
    const proofName = params[2] || "proof.json";

    const verificationKey = JSON.parse(fs.readFileSync(verificationKeyName, "utf8"));
    const pub = JSON.parse(fs.readFileSync(publicName, "utf8"));
    const proof = JSON.parse(fs.readFileSync(proofName, "utf8"));

    if (options.verbose) Logger.setLogLevel("DEBUG");

    const isValid = await groth16.verify(verificationKey, pub, proof, logger);

    if (isValid) {
        return 0;
    } else {
        return 1;
    }
}

// zkey export vkey [circuit_final.zkey] [verification_key.json]",
async function zkeyExportVKey(params, options) {
    const zkeyName = params[0] || "circuit_final.zkey";
    const verificationKeyName = params[1] || "verification_key.json";

    if (options.verbose) Logger.setLogLevel("DEBUG");

    const vKey = await zkey.exportVerificationKey(zkeyName);

    await bfj.write(verificationKeyName, stringifyBigInts(vKey), { space: 1 });
}

// zkey export json [circuit_final.zkey] [circuit.zkey.json]",
async function zkeyExportJson(params, options) {
    const zkeyName = params[0] || "circuit_final.zkey";
    const zkeyJsonName = params[1] || "circuit_final.zkey.json";

    if (options.verbose) Logger.setLogLevel("DEBUG");

    const zKeyJson = await zkey.exportJson(zkeyName, logger);

    await bfj.write(zkeyJsonName, zKeyJson, { space: 1 });
}

async function fileExists(file) {
    return fs.promises.access(file, fs.constants.F_OK)
        .then(() => true)
        .catch(() => false);
}
// solidity genverifier [circuit_final.zkey] [verifier.sol]
async function zkeyExportSolidityVerifier(params, options) {
    let zkeyName;
    let verifierName;

    if (params.length < 1) {
        zkeyName = "circuit_final.zkey";
    } else {
        zkeyName = params[0];
    }

    if (params.length < 2) {
        verifierName = "verifier.sol";
    } else {
        verifierName = params[1];
    }

    if (options.verbose) Logger.setLogLevel("DEBUG");

    const templates = {};

    if (await fileExists(path.join(__dirname, "templates"))) {
        templates.groth16 = await fs.promises.readFile(path.join(__dirname, "templates", "verifier_groth16.sol.ejs"), "utf8");
        templates.plonk = await fs.promises.readFile(path.join(__dirname, "templates", "verifier_plonk.sol.ejs"), "utf8");    
    } else {
        templates.groth16 = await fs.promises.readFile(path.join(__dirname, "..", "templates", "verifier_groth16.sol.ejs"), "utf8");
        templates.plonk = await fs.promises.readFile(path.join(__dirname, "..", "templates", "verifier_plonk.sol.ejs"), "utf8");    
    }
    
    const verifierCode = await zkey.exportSolidityVerifier(zkeyName, templates, logger);

    fs.writeFileSync(verifierName, verifierCode, "utf-8");

    return 0;
}


// solidity gencall <public.json> <proof.json>
async function zkeyExportSolidityCalldata(params, options) {
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

    if (options.verbose) Logger.setLogLevel("DEBUG");

    const pub = JSON.parse(fs.readFileSync(publicName, "utf8"));
    const proof = JSON.parse(fs.readFileSync(proofName, "utf8"));

    let res;
    if (proof.protocol == "groth16") {
        res = await groth16.exportSolidityCallData(proof, pub);
    } else if (proof.protocol == "plonk") {
        res = await plonk.exportSolidityCallData(proof, pub);
    } else {
        throw new Error("Invalid Protocol");
    }
    console.log(res);

    return 0;
}

// powersoftau new <curve> <power> [powersoftau_0000.ptau]",
async function powersOfTauNew(params, options) {
    let curveName;
    let power;
    let ptauName;

    curveName = params[0];

    power = parseInt(params[1]);
    if ((power<1) || (power>28)) {
        throw new Error("Power must be between 1 and 28");
    }

    if (params.length < 3) {
        ptauName = "powersOfTau" + power + "_0000.ptau";
    } else {
        ptauName = params[2];
    }

    const curve = await curves.getCurveFromName(curveName);

    if (options.verbose) Logger.setLogLevel("DEBUG");

    return await powersOfTau.newAccumulator(curve, power, ptauName, logger);
}

async function powersOfTauExportChallenge(params, options) {
    let ptauName;
    let challengeName;

    ptauName = params[0];

    if (params.length < 2) {
        challengeName = "challenge";
    } else {
        challengeName = params[1];
    }

    if (options.verbose) Logger.setLogLevel("DEBUG");

    return await powersOfTau.exportChallenge(ptauName, challengeName, logger);
}

// powersoftau challenge contribute <curve> <challenge> [response]
async function powersOfTauChallengeContribute(params, options) {
    let challengeName;
    let responseName;

    const curve = await curves.getCurveFromName(params[0]);

    challengeName = params[1];

    if (params.length < 3) {
        responseName = changeExt(challengeName, "response");
    } else {
        responseName = params[2];
    }

    if (options.verbose) Logger.setLogLevel("DEBUG");

    return await powersOfTau.challengeContribute(curve, challengeName, responseName, options.entropy, logger);
}


async function powersOfTauImport(params, options) {
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

    if (options.verbose) Logger.setLogLevel("DEBUG");

    const res = await powersOfTau.importResponse(oldPtauName, response, newPtauName, options.name, importPoints, logger);

    if (res) return res;
    if (!doCheck) return;

    // TODO Verify
}

async function powersOfTauVerify(params, options) {
    let ptauName;

    ptauName = params[0];

    if (options.verbose) Logger.setLogLevel("DEBUG");

    const res = await powersOfTau.verify(ptauName, logger);
    if (res === true) {
        return 0;
    } else {
        return 1;
    }
}

async function powersOfTauBeacon(params, options) {
    let oldPtauName;
    let newPtauName;
    let beaconHashStr;
    let numIterationsExp;

    oldPtauName = params[0];
    newPtauName = params[1];
    beaconHashStr = params[2];
    numIterationsExp = params[3];

    if (options.verbose) Logger.setLogLevel("DEBUG");

    return await powersOfTau.beacon(oldPtauName, newPtauName, options.name ,beaconHashStr, numIterationsExp, logger);
}

async function powersOfTauContribute(params, options) {
    let oldPtauName;
    let newPtauName;

    oldPtauName = params[0];
    newPtauName = params[1];

    if (options.verbose) Logger.setLogLevel("DEBUG");

    return await powersOfTau.contribute(oldPtauName, newPtauName, options.name , options.entropy, logger);
}

async function powersOfTauPreparePhase2(params, options) {
    let oldPtauName;
    let newPtauName;

    oldPtauName = params[0];
    newPtauName = params[1];

    if (options.verbose) Logger.setLogLevel("DEBUG");

    return await powersOfTau.preparePhase2(oldPtauName, newPtauName, logger);
}

async function powersOfTauConvert(params, options) {
    let oldPtauName;
    let newPtauName;

    oldPtauName = params[0];
    newPtauName = params[1];

    if (options.verbose) Logger.setLogLevel("DEBUG");

    return await powersOfTau.convert(oldPtauName, newPtauName, logger);
}


async function powersOfTauTruncate(params, options) {
    let ptauName;

    ptauName = params[0];

    let template = ptauName;
    while ((template.length>0) && (template[template.length-1] != ".")) template = template.slice(0, template.length-1);
    template = template.slice(0, template.length-1);
    template = template+"_";

    if (options.verbose) Logger.setLogLevel("DEBUG");

    return await powersOfTau.truncate(ptauName, template, logger);
}

// powersoftau export json <powersoftau_0000.ptau> <powersoftau_0000.json>",
async function powersOfTauExportJson(params, options) {
    let ptauName;
    let jsonName;

    ptauName = params[0];
    jsonName = params[1];

    if (options.verbose) Logger.setLogLevel("DEBUG");

    const pTauJson = await powersOfTau.exportJson(ptauName, logger);

    await bfj.write(jsonName, pTauJson, { space: 1 });
}


// phase2 new <circuit.r1cs> <powersoftau.ptau> <circuit_0000.zkey>
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

    if (params.length < 3) {
        zkeyName = "circuit_0000.zkey";
    } else {
        zkeyName = params[2];
    }

    if (options.verbose) Logger.setLogLevel("DEBUG");

    return zkey.newZKey(r1csName, ptauName, zkeyName, logger);
}

// zkey export bellman [circuit_0000.zkey] [circuit.mpcparams]
async function zkeyExportBellman(params, options) {
    let zkeyName;
    let mpcparamsName;

    zkeyName = params[0];

    if (params.length < 2) {
        mpcparamsName = "circuit.mpcparams";
    } else {
        mpcparamsName = params[1];
    }

    if (options.verbose) Logger.setLogLevel("DEBUG");

    return zkey.exportBellman(zkeyName, mpcparamsName, logger);

}


// zkey import bellman <circuit_old.zkey> <circuit.mpcparams> <circuit_new.zkey>
async function zkeyImportBellman(params, options) {
    let zkeyNameOld;
    let mpcParamsName;
    let zkeyNameNew;

    zkeyNameOld = params[0];
    mpcParamsName = params[1];
    zkeyNameNew = params[2];

    if (options.verbose) Logger.setLogLevel("DEBUG");

    const isValid = await zkey.importBellman(zkeyNameOld, mpcParamsName, zkeyNameNew, options.name, logger);
    if (isValid) {
        return 0;
    } else {
        return 1;
    }
}

// phase2 verify r1cs [circuit.r1cs] [powersoftau.ptau] [circuit_final.zkey]
async function zkeyVerifyFromR1cs(params, options) {
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
        zkeyName = "circuit_final.zkey";
    } else {
        zkeyName = params[2];
    }

    if (options.verbose) Logger.setLogLevel("DEBUG");

    const res = await zkey.verifyFromR1cs(r1csName, ptauName, zkeyName, logger);
    if (res === true) {
        return 0;
    } else {
        return 1;
    }

}

// phase2 verify [circuit_0000] [powersoftau.ptau] [circuit_final.zkey]
async function zkeyVerifyFromInit(params, options) {
    let initZKeyName;
    let ptauName;
    let zkeyName;

    if (params.length < 1) {
        initZKeyName = "circuit_0000.zkey";
    } else {
        initZKeyName = params[0];
    }

    if (params.length < 2) {
        ptauName = "powersoftau.ptau";
    } else {
        ptauName = params[1];
    }

    if (params.length < 3) {
        zkeyName = "circuit_final.zkey";
    } else {
        zkeyName = params[2];
    }

    if (options.verbose) Logger.setLogLevel("DEBUG");

    const res = await zkey.verifyFromInit(initZKeyName, ptauName, zkeyName, logger);
    if (res === true) {
        return 0;
    } else {
        return 1;
    }
}

// zkey contribute <circuit_old.zkey> <circuit_new.zkey>
async function zkeyContribute(params, options) {
    let zkeyOldName;
    let zkeyNewName;

    zkeyOldName = params[0];
    zkeyNewName = params[1];

    if (options.verbose) Logger.setLogLevel("DEBUG");

    return zkey.contribute(zkeyOldName, zkeyNewName, options.name, options.entropy, logger);
}

// zkey beacon <circuit_old.zkey> <circuit_new.zkey> <beaconHash(Hex)> <numIterationsExp>
async function zkeyBeacon(params, options) {
    let zkeyOldName;
    let zkeyNewName;
    let beaconHashStr;
    let numIterationsExp;

    zkeyOldName = params[0];
    zkeyNewName = params[1];
    beaconHashStr = params[2];
    numIterationsExp = params[3];

    if (options.verbose) Logger.setLogLevel("DEBUG");

    return await zkey.beacon(zkeyOldName, zkeyNewName, options.name ,beaconHashStr, numIterationsExp, logger);
}


// zkey challenge contribute <curve> <challenge> [response]",
async function zkeyBellmanContribute(params, options) {
    let challengeName;
    let responseName;

    const curve = await curves.getCurveFromName(params[0]);

    challengeName = params[1];

    if (params.length < 3) {
        responseName = changeExt(challengeName, "response");
    } else {
        responseName = params[2];
    }

    if (options.verbose) Logger.setLogLevel("DEBUG");

    return zkey.bellmanContribute(curve, challengeName, responseName, options.entropy, logger);
}


// plonk setup <circuit.r1cs> <powersoftau.ptau> <circuit.zkey>
async function plonkSetup(params, options) {
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

    if (options.verbose) Logger.setLogLevel("DEBUG");

    return plonk.setup(r1csName, ptauName, zkeyName, logger);
}


// plonk prove [circuit.zkey] [witness.wtns] [proof.json] [public.json]
async function plonkProve(params, options) {

    const zkeyName = params[0] || "circuit.zkey";
    const witnessName = params[1] || "witness.wtns";
    const proofName = params[2] || "proof.json";
    const publicName = params[3] || "public.json";

    if (options.verbose) Logger.setLogLevel("DEBUG");

    const {proof, publicSignals} = await plonk.prove(zkeyName, witnessName, logger);

    await bfj.write(proofName, stringifyBigInts(proof), { space: 1 });
    await bfj.write(publicName, stringifyBigInts(publicSignals), { space: 1 });

    return 0;
}


// plonk fullprove [input.json] [circuit.wasm] [circuit.zkey] [proof.json] [public.json]
async function plonkFullProve(params, options) {

    const inputName = params[0] || "input.json";
    const wasmName = params[1] || "circuit.wasm";
    const zkeyName = params[2] || "circuit.zkey";
    const proofName = params[3] || "proof.json";
    const publicName = params[4] || "public.json";

    if (options.verbose) Logger.setLogLevel("DEBUG");

    const input = JSON.parse(await fs.promises.readFile(inputName, "utf8"));

    const {proof, publicSignals} = await plonk.fullProve(input, wasmName, zkeyName,  logger);

    await bfj.write(proofName, stringifyBigInts(proof), { space: 1 });
    await bfj.write(publicName, stringifyBigInts(publicSignals), { space: 1 });

    return 0;
}


// plonk verify [verification_key.json] [public.json] [proof.json]
async function plonkVerify(params, options) {

    const verificationKeyName = params[0] || "verification_key.json";
    const publicName = params[1] || "public.json";
    const proofName = params[2] || "proof.json";

    const verificationKey = JSON.parse(fs.readFileSync(verificationKeyName, "utf8"));
    const pub = JSON.parse(fs.readFileSync(publicName, "utf8"));
    const proof = JSON.parse(fs.readFileSync(proofName, "utf8"));

    if (options.verbose) Logger.setLogLevel("DEBUG");

    const isValid = await plonk.verify(verificationKey, pub, proof, logger);

    if (isValid) {
        return 0;
    } else {
        return 1;
    }
}

async function fileInfo(params) {
    const filename = params[0];
    const extension = filename.split(".").pop();

    if (!["zkey", "r1cs", "ptau", "wtns"].includes(extension)) {
        console.error(`Extension ${extension} is not allowed.`);
        return;
    }

    try {
        const {
            fd: fd,
            sections: sections
        } = await binFileUtils.readBinFile(filename, extension, 2, 1 << 25, 1 << 23);

        console.log(`File info for    ${filename}`);
        console.log();
        console.log(`File size:       ${fd.totalSize} bytes`);
        console.log(`File type:       ${extension}`);
        console.log(`Version:         ${fd.version}`);
        console.log(`Bin version:     ${fd.binVersion}`);
        console.log("");

        sections.forEach((section, index) => {
            let errors = [];
            if (section.length > 1) errors.push(`Section ${index} has more than one section definition`);
            else {
                if (section[0].size === 0) {
                    errors.push(`Section ${index} size is zero. This could cause false errors in other sections.`);
                }
            }
            if(section[0].p + section[0].size > fd.totalSize) {
                errors.push(`Section ${index} is out of bounds of the file.`);
            }

            const color = errors.length === 0 ? "%s%s%s" : "%s\x1b[31m%s\x1b[0m%s";
            const text0 = "section " + ("#" + index).padStart(5, " ");
            const text1 = errors.length === 0 ? "   " : " !!";
            const text2 = ` size: ${section[0].size}\toffset: 0x${(section[0].p - 12).toString(16)}`;
            console.log(color, text0, text1, text2);
            errors.forEach((error) => {
                console.error("\x1b[31m%s\x1b[0m", "                 > " + error);
            });
        });
    } catch (error)
    {
        console.error(error.message);
    }
}
