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

import fs from "fs";

import {load as loadR1cs} from "r1csfile";

import loadSyms from "./src/loadsyms.js";
import * as r1cs from "./src/r1cs.js";

import clProcessor from "./src/clprocessor.js";

import * as powersOfTaw from "./src/powersoftau.js";

import {  utils }   from "ffjavascript";
const {stringifyBigInts, unstringifyBigInts} = utils;

import * as zkey from "./src/zkey.js";
import * as groth16 from "./src/groth16.js";
import * as wtns from "./src/wtns.js";
import * as curves from "./src/curves.js";
import path from "path";
import appRoot from "app-root-path";

import Logger from "logplease";
const logger = Logger.create("snarkJS", {showTimestamp:false});
Logger.setLogLevel("INFO");

const commands = [
    {
        cmd: "powersoftau new <curve> <power> [powersoftau_0000.ptau]",
        description: "Starts a powers of tau ceremony",
        alias: ["ptn"],
        options: "-verbose|v",
        action: powersOfTawNew
    },
    {
        cmd: "powersoftau contribute <powersoftau.ptau> <new_powersoftau.ptau>",
        description: "creates a ptau file with a new contribution",
        alias: ["ptc"],
        options: "-verbose|v -name|n -entropy|e",
        action: powersOfTawContribute
    },
    {
        cmd: "powersoftau export challange <powersoftau_0000.ptau> [challange]",
        description: "Creates a challange",
        alias: ["ptec"],
        options: "-verbose|v",
        action: powersOfTawExportChallange
    },
    {
        cmd: "powersoftau challange contribute <curve> <challange> [response]",
        description: "Contribute to a challange",
        alias: ["ptcc"],
        options: "-verbose|v -entropy|e",
        action: powersOfTawChallangeContribute
    },
    {
        cmd: "powersoftau import response <powersoftau_old.ptau> <response> <<powersoftau_new.ptau>",
        description: "import a response to a ptau file",
        alias: ["ptir"],
        options: "-verbose|v -nopoints -nocheck -name|n",
        action: powersOfTawImport
    },
    {
        cmd: "powersoftau beacon <old_powersoftau.ptau> <new_powersoftau.ptau> <beaconHash(Hex)> <numIterationsExp>",
        description: "adds a beacon",
        alias: ["ptb"],
        options: "-verbose|v -name|n",
        action: powersOfTawBeacon
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
        cmd: "powersoftau verify <powersoftau.ptau>",
        description: "verifies a powers of tau file",
        alias: ["ptv"],
        options: "-verbose|v",
        action: powersOfTawVerify
    },
    {
        cmd: "powersoftau export json <powersoftau_0000.ptau> <powersoftau_0000.json>",
        description: "Exports a power of tau file to a JSON",
        alias: ["ptej"],
        options: "-verbose|v",
        action: powersOfTawExportJson
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
        cmd: "zkey new [circuit.r1cs] [powersoftau.ptau] [circuit.zkey]",
        description: "Creates an initial pkey file with zero contributions ",
        alias: ["zkn"],
        options: "-verbose|v",
        action: zkeyNew
    },
    {
        cmd: "zkey contribute <circuit_old.zkey> <circuit_new.zkey>",
        description: "creates a zkey file with a new contribution",
        alias: ["zkc"],
        options: "-verbose|v  -entropy|e -name|n",
        action: zkeyContribute
    },
    {
        cmd: "zkey export bellman [circuit.zkey] [circuit.mpcparams]",
        description: "Export a zKey to a MPCParameters file compatible with kobi/phase2 (Bellman)",
        alias: ["zkeb"],
        options: "-verbose|v",
        action: zkeyExportBellman
    },
    {
        cmd: "zkey bellman contribute <curve> <circuit.mpcparams> <circuit_response.mpcparams>",
        description: "contributes to a llallange file in bellman format",
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
        cmd: "zkey verify [circuit.r1cs] [powersoftau.ptau] [circuit.zkey]",
        description: "Verify zkey file contributions and verify that matches with the original circuit.r1cs and ptau",
        alias: ["zkv"],
        options: "-verbose|v",
        action: zkeyVerify
    },
    {
        cmd: "zkey export verificationkey [circuit.zkey] [verification_key.json]",
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
    {
        cmd: "zkey export solidityverifier [circuit.zkey] [verifier.sol]",
        description: "Creates a verifier in solidity",
        alias: ["zkesv", "generateverifier -vk|verificationkey -v|verifier"],
        action: zkeyExportSolidityVerifier
    },
    {
        cmd: "zkey export soliditycalldata <public.json> <proof.json>",
        description: "Generates call parameters ready to be called.",
        alias: ["zkesc", "generatecall -pub|public -p|proof"],
        action: zkeyExportSolidityCalldata
    },
    {
        cmd: "groth16 prove [circuit.zkey] [witness.wtns] [proof.json] [public.json]",
        description: "Generates a zk Proof from witness",
        alias: ["g16p", "zpw", "zksnark proof", "proof -pk|provingkey -wt|witness -p|proof -pub|public"],
        options: "-verbose|v -protocol",
        action: groth16Prove
    },
    {
        cmd: "groth16 fullprove [input.json] [circuit.wasm] [circuit.zkey] [proof.json] [public.json]",
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

    if (options.verbose) Logger.setLogLevel("DEBUG");

    await r1cs.info(r1csName, logger);


    return 0;
}

// r1cs print [circuit.r1cs] [circuit.sym]
async function r1csPrint(params, options) {
    const r1csName = params[0] || "circuit.r1cs";
    const symName = params[1] || changeExt(r1csName, "sym");

    if (options.verbose) Logger.setLogLevel("DEBUG");

    const cir = await loadR1cs(r1csName, true, true);

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

    const S = JSON.stringify(utils.stringifyBigInts(r1csObj), null, 1);
    await fs.promises.writeFile(jsonName, S);

    return 0;
}

// wtns calculate <circuit.wasm> <input.json> <witness.wtns>
async function wtnsCalculate(params, options) {
    const wasmName = params[0] || "circuit.wasm";
    const inputName = params[1] || "input.json";
    const witnessName = params[2] || "witness.wtns";

    if (options.verbose) Logger.setLogLevel("DEBUG");

    const input = unstringifyBigInts(JSON.parse(await fs.promises.readFile(inputName, "utf8")));

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

    const input = unstringifyBigInts(JSON.parse(await fs.promises.readFile(inputName, "utf8")));

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

    await fs.promises.writeFile(jsonName, JSON.stringify(stringifyBigInts(w), null, 1));

    return 0;
}


/*
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
*/

// groth16 prove [circuit.zkey] [witness.wtns] [proof.json] [public.json]
async function groth16Prove(params, options) {

    const zkeyName = params[0] || "circuit.zkey";
    const witnessName = params[1] || "witness.wtns";
    const proofName = params[2] || "proof.json";
    const publicName = params[3] || "public.json";

    if (options.verbose) Logger.setLogLevel("DEBUG");

    const {proof, publicSignals} = await groth16.prove(zkeyName, witnessName, logger);

    await fs.promises.writeFile(proofName, JSON.stringify(stringifyBigInts(proof), null, 1), "utf-8");
    await fs.promises.writeFile(publicName, JSON.stringify(stringifyBigInts(publicSignals), null, 1), "utf-8");

    return 0;
}

// groth16 fullprove [input.json] [circuit.wasm] [circuit.zkey] [proof.json] [public.json]
async function groth16FullProve(params, options) {

    const inputName = params[0] || "input.json";
    const wasmName = params[1] || "circuit.wasm";
    const zkeyName = params[2] || "circuit.zkey";
    const proofName = params[3] || "proof.json";
    const publicName = params[4] || "public.json";

    if (options.verbose) Logger.setLogLevel("DEBUG");

    const input = unstringifyBigInts(JSON.parse(await fs.promises.readFile(inputName, "utf8")));

    const {proof, publicSignals} = await groth16.fullProve(input, wasmName, zkeyName,  logger);

    await fs.promises.writeFile(proofName, JSON.stringify(stringifyBigInts(proof), null, 1), "utf-8");
    await fs.promises.writeFile(publicName, JSON.stringify(stringifyBigInts(publicSignals), null, 1), "utf-8");

    return 0;
}

// groth16 verify [verification_key.json] [public.json] [proof.json]
async function groth16Verify(params, options) {

    const verificationKeyName = params[0] || "verification_key.json";
    const publicName = params[1] || "public.json";
    const proofName = params[2] || "proof.json";

    const verificationKey = unstringifyBigInts(JSON.parse(fs.readFileSync(verificationKeyName, "utf8")));
    const pub = unstringifyBigInts(JSON.parse(fs.readFileSync(publicName, "utf8")));
    const proof = unstringifyBigInts(JSON.parse(fs.readFileSync(proofName, "utf8")));

    if (options.verbose) Logger.setLogLevel("DEBUG");

    const isValid = await groth16.verify(verificationKey, pub, proof, logger);

    if (isValid) {
        return 0;
    } else {
        return 1;
    }
}

// zkey export vkey [circuit.zkey] [verification_key.json]",
async function zkeyExportVKey(params, options) {
    const zkeyName = params[0] || "circuit.zkey";
    const verificationKeyName = params[2] || "verification_key.json";

    if (options.verbose) Logger.setLogLevel("DEBUG");

    const vKey = await zkey.exportVerificationKey(zkeyName);

    const S = JSON.stringify(utils.stringifyBigInts(vKey), null, 1);
    await fs.promises.writeFile(verificationKeyName, S);
}

// zkey export json [circuit.zkey] [circuit.zkey.json]",
async function zkeyExportJson(params, options) {
    const zkeyName = params[0] || "circuit.zkey";
    const zkeyJsonName = params[1] || "circuit.zkey.json";

    if (options.verbose) Logger.setLogLevel("DEBUG");

    const zKey = await zkey.exportJson(zkeyName, logger);

    const S = JSON.stringify(utils.stringifyBigInts(zKey), null, 1);
    await fs.promises.writeFile(zkeyJsonName, S);
}

// solidity genverifier [circuit.zkey] [verifier.sol]
async function zkeyExportSolidityVerifier(params, options) {
    let zkeyName;
    let verifierName;

    if (params.length < 1) {
        zkeyName = "circuit.zkey";
    } else {
        zkeyName = params[0];
    }

    if (params.length < 2) {
        verifierName = "verifier.sol";
    } else {
        verifierName = params[1];
    }

    if (options.verbose) Logger.setLogLevel("DEBUG");

    const templateName = path.join( appRoot.path, "templates", "verifier_groth16.sol");

    const verifierCode = await zkey.exportSolidityVerifier(zkeyName, templateName, logger);

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

    const pub = unstringifyBigInts(JSON.parse(fs.readFileSync(publicName, "utf8")));
    const proof = unstringifyBigInts(JSON.parse(fs.readFileSync(proofName, "utf8")));

    let inputs = "";
    for (let i=0; i<pub.length; i++) {
        if (inputs != "") inputs = inputs + ",";
        inputs = inputs + p256(pub[i]);
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

// powersoftau new <curve> <power> [powersoftau_0000.ptau]",
async function powersOfTawNew(params, options) {
    let curveName;
    let power;
    let ptauName;

    curveName = params[0];

    power = parseInt(params[1]);
    if ((power<1) || (power>28)) {
        throw new Error("Power must be between 1 and 28");
    }

    if (params.length < 3) {
        ptauName = "powersOfTaw" + power + "_0000.ptau";
    } else {
        ptauName = params[2];
    }

    const curve = await curves.getCurveFromName(curveName);

    if (options.verbose) Logger.setLogLevel("DEBUG");

    return await powersOfTaw.newAccumulator(curve, power, ptauName, logger);
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

    if (options.verbose) Logger.setLogLevel("DEBUG");

    return await powersOfTaw.exportChallange(ptauName, challangeName, logger);
}

// powersoftau challange contribute <curve> <challange> [response]
async function powersOfTawChallangeContribute(params, options) {
    let challangeName;
    let responseName;

    const curve = await curves.getCurveFromName(params[0]);

    challangeName = params[1];

    if (params.length < 3) {
        responseName = changeExt(challangeName, "response");
    } else {
        responseName = params[2];
    }

    if (options.verbose) Logger.setLogLevel("DEBUG");

    return await powersOfTaw.challangeContribute(curve, challangeName, responseName, options.entropy, logger);
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

    if (options.verbose) Logger.setLogLevel("DEBUG");

    const res = await powersOfTaw.importResponse(oldPtauName, response, newPtauName, options.name, importPoints, logger);

    if (res) return res;
    if (!doCheck) return;

    // TODO Verify
}

async function powersOfTawVerify(params, options) {
    let ptauName;

    ptauName = params[0];

    if (options.verbose) Logger.setLogLevel("DEBUG");

    const res = await powersOfTaw.verify(ptauName, logger);
    if (res === true) {
        return 0;
    } else {
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

    if (options.verbose) Logger.setLogLevel("DEBUG");

    return await powersOfTaw.beacon(oldPtauName, newPtauName, options.name ,beaconHashStr, numIterationsExp, logger);
}

async function powersOfTawContribute(params, options) {
    let oldPtauName;
    let newPtauName;

    oldPtauName = params[0];
    newPtauName = params[1];

    if (options.verbose) Logger.setLogLevel("DEBUG");

    return await powersOfTaw.contribute(oldPtauName, newPtauName, options.name , options.entropy, logger);
}

async function powersOfTawPreparePhase2(params, options) {
    let oldPtauName;
    let newPtauName;

    oldPtauName = params[0];
    newPtauName = params[1];

    if (options.verbose) Logger.setLogLevel("DEBUG");

    return await powersOfTaw.preparePhase2(oldPtauName, newPtauName, logger);
}

// powersoftau export json <powersoftau_0000.ptau> <powersoftau_0000.json>",
async function powersOfTawExportJson(params, options) {
    let ptauName;
    let jsonName;

    ptauName = params[0];
    jsonName = params[1];

    if (options.verbose) Logger.setLogLevel("DEBUG");

    const pTau = await powersOfTaw.exportJson(ptauName, logger);

    const S = JSON.stringify(stringifyBigInts(pTau), null, 1);
    await fs.promises.writeFile(jsonName, S);

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

    if (params.length < 3) {
        zkeyName = "circuit.zkey";
    } else {
        zkeyName = params[2];
    }

    if (options.verbose) Logger.setLogLevel("DEBUG");

    return zkey.newZKey(r1csName, ptauName, zkeyName, logger);
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

    return zkey.importBellman(zkeyNameOld, mpcParamsName, zkeyNameNew, options.name, logger);
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

    if (options.verbose) Logger.setLogLevel("DEBUG");

    const res = await zkey.verify(r1csName, ptauName, zkeyName, logger);
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


// zkey challange contribute <curve> <challange> [response]",
async function zkeyBellmanContribute(params, options) {
    let challangeName;
    let responseName;

    const curve = await curves.getCurveFromName(params[0]);

    challangeName = params[1];

    if (params.length < 3) {
        responseName = changeExt(challangeName, "response");
    } else {
        responseName = params[2];
    }

    if (options.verbose) Logger.setLogLevel("DEBUG");

    return zkey.bellmanContribute(curve, challangeName, responseName, options.entropy, logger);
}

