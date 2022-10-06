/*
    Copyright 2022 iden3

    This file is part of snarkjs

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

import {Proof} from "./proof.js";
import {Keccak256Transcript} from "./keccak256Transcript.js";
import {utils as ffjavascriptUtils} from "ffjavascript";
import * as curves from "./curves.js";

const {unstringifyBigInts} = ffjavascriptUtils;


export default async function kateVerify(_preprocessed, _publicInputs, _proof, logger) {
    logger.info("Starting kate verifier");

    // 0. Setup
    _preprocessed = unstringifyBigInts(_preprocessed);
    _publicInputs = unstringifyBigInts(_publicInputs);
    _proof = unstringifyBigInts(_proof);

    const curve = await curves.getCurveFromName(_preprocessed.curve);

    const preprocessed = fromObjectVk(_preprocessed, curve);

    const proof = new Proof(curve, logger);
    proof.fromObjectProof(_proof);


    // 1. Validate that all polynomial commitments ∈ G_1
    if (!commitmentsBelongToG1(proof, curve)) {
        logger.error("Proof is not well constructed");
        return false;
    }

    // 2. Validate that all evaluations ∈ F TODO

    // 3. Compute the challenges z, alpha as in prover description from the common preprocessed inputs and elements of π
    const challenges = computeChallenges(preprocessed, proof, curve, logger);

    // 4. Check identities TODO

    // 5. Compute the full batched polynomial commitment [F]_1
    const F = computeF(proof, preprocessed, challenges, curve);
    if (logger) {
        logger.debug("F: " + curve.G1.toString(curve.G1.toAffine(F), 16));
    }

    // 6. Compute the group-encoded batch evaluation [E]_1
    const E = computeE(proof, preprocessed, challenges, curve);
    if (logger) {
        logger.debug("E: " + curve.G1.toString(curve.G1.toAffine(E), 16));
    }

    // 7. Batch validate all evaluations
    const res = await isValidPairing(proof, preprocessed, challenges, E, F, curve);

    if (logger) {
        if (res) {
            logger.info("Kate verifier: OK!");
        } else {
            logger.warn("Kate verifier: Invalid Proof");
        }
    }

    return res;
}

function commitmentsBelongToG1(proof, curve) {
    const G1 = curve.G1;

    Object.keys(proof.polynomials).forEach(key => {
        if (!G1.isValid(proof.polynomials[key])) return false;
    });

    return true;
}

function computeChallenges(preprocessed, proof, curve, logger) {
    let challenges = {};

    const transcript = new Keccak256Transcript(curve);

    // Compute z challenge from polynomials
    for (const [polName] of Object.entries(preprocessed.polynomials)) {
        transcript.appendPolCommitment(preprocessed.polynomials[polName]);
    }

    for (const [polName] of Object.entries(proof.polynomials)) {
        transcript.appendPolCommitment(proof.polynomials[polName]);
    }

    challenges.z = transcript.getChallenge();
    if (logger) {
        logger.info("Computed challenge z: " + curve.Fr.toString(challenges.z));
    }

    // Compute alpha challenge from evaluations
    transcript.reset();
    for (const [evalPol] of Object.entries(proof.evaluations)) {
        transcript.appendScalar(proof.evaluations[evalPol]);
    }

    challenges.alpha = transcript.getChallenge();
    if (logger) {
        logger.info("Computed challenge alpha: " + curve.Fr.toString(challenges.alpha));
    }

    return challenges;
}

function computeF(proof, preprocessed, challenges, curve) {
    let res = curve.G1.zero;

    let alphaCoef = curve.Fr.one;
    for (const [polName] of Object.entries(proof.evaluations).sort()) {
        if(polName in proof.polynomials) {
            res = curve.G1.add(res, curve.G1.timesFr(proof.polynomials[polName], alphaCoef));
        } else if(polName in preprocessed.polynomials) {
            res = curve.G1.add(res, curve.G1.timesFr(preprocessed.polynomials[polName], alphaCoef));
        } else {
            throw new Error(`Polynomial ${polName} doesn't exist`);
        }

        alphaCoef = curve.Fr.mul(alphaCoef, challenges.alpha);
    }

    return res;
}

function computeE(proof, preprocessed, challenges, curve) {
    let res = curve.Fr.zero;

    let alphaCoef = curve.Fr.one;
    for (const [polName] of Object.entries(proof.evaluations).sort()) {
        res = curve.Fr.add(res, curve.Fr.mul(proof.evaluations[polName], alphaCoef));

        alphaCoef = curve.Fr.mul(alphaCoef, challenges.alpha);
    }

    res = curve.G1.timesFr(curve.G1.one, res);

    return res;
}

async function isValidPairing(proof, preprocessed, challenges, E, F, curve) {
    let A1 = proof.pi;
    // A1 = G1.add(A1, G1.timesFr(proof.polynomials.Wxiw, challenges.u)); TODO prime

    let A2 = curve.G2.timesFr(curve.G2.one, curve.Fr.sub(curve.Fr.w[preprocessed.power], challenges.z));

    // let B1 = G1.timesFr(proof.polynomials.Wxi, challenges.xi);
    // // const s = Fr.mul(Fr.mul(challenges.u, challenges.xi), Fr.w[CIRCUIT_POWER]);
    // const s = Fr.mul(Fr.mul(challenges.u, challenges.xi), verificationKey.w); //TODO debug verificationKey.w === Fr.w[CIRCUIT_POWER]
    // B1 = G1.add(B1, G1.timesFr(proof.polynomials.Wxiw, s));
    // B1 = G1.add(B1, F);
    // B1 = G1.sub(B1, E);
    let B1 = curve.G1.sub(F, E);

    let B2 = curve.G2.one;

    return await curve.pairingEq(A1, A2, B1, B2);
}

function fromObjectVk(preprocessed, curve) {
    if("polynomials" in preprocessed) {
        Object.keys(preprocessed.polynomials).forEach(key => {
            preprocessed.polynomials[key] = curve.G1.fromObject(preprocessed.polynomials[key]);
        });
    }

    if(preprocessed.X_2) {
        preprocessed.X_2 = curve.G2.fromObject(preprocessed.X_2);
    }

    return preprocessed;
}