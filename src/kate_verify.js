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
    const G1 = curve.G1;

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
    if (logger) {
        logger.info("Proof computed: " + curve.Fr.toString(proof.pi));
    }

    // 4. Check identities TODO

    // 5. Compute the full batched polynomial commitment [F]_1
    const F = computeF(proof, preprocessed, challenges, curve);
    if (logger) {
        logger.debug("F: " + G1.toString(G1.toAffine(F), 16));
    }

    // 6. Compute the group-encoded batch evaluation [E]_1
    const E = computeE(proof, preprocessed, challenges, curve);
    if (logger) {
        logger.debug("E: " + G1.toString(G1.toAffine(E), 16));
    }

    // 7. Batch validate all evaluations
    const res = await isValidPairing(proof, preprocessed, challenges, F, E, curve);

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
    const Fr = curve.Fr;

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
        logger.info("Computed challenge z: " + Fr.toString(challenges.z));
    }

    // Compute alpha challenge from evaluations
    transcript.reset();
    for (const [evalPol] of Object.entries(proof.evaluations)) {
        transcript.appendScalar(proof.evaluations[evalPol]);
    }

    challenges.alpha = transcript.getChallenge();
    if (logger) {
        logger.info("Computed challenge alpha: " + Fr.toString(challenges.alpha));
    }

    return challenges;
}

function computeF(proof, preprocessed, challenges, curve) {
    const Fr = curve.Fr;
    const G1 = curve.G1;

    let res = G1.zero;

    let alphaCoef = Fr.one;
    for (const [polName] of Object.entries(proof.evaluations).sort()) {
        if (polName in proof.polynomials) {
            res = G1.add(res, G1.timesFr(proof.polynomials[polName], alphaCoef));
        } else if (polName in preprocessed.polynomials) {
            res = G1.add(res, G1.timesFr(preprocessed.polynomials[polName], alphaCoef));
        } else {
            throw new Error(`Polynomial ${polName} doesn't exist`);
        }

        alphaCoef = Fr.mul(alphaCoef, challenges.alpha);
    }

    return res;
}

function computeE(proof, preprocessed, challenges, curve) {
    const Fr = curve.Fr;
    const G1 = curve.G1;

    let res = Fr.zero;

    let alphaCoef = Fr.one;
    for (const [polName] of Object.entries(proof.evaluations).sort()) {
        res = Fr.add(res, Fr.mul(proof.evaluations[polName], alphaCoef));

        alphaCoef = Fr.mul(alphaCoef, challenges.alpha);
    }

    res = G1.timesFr(G1.one, res);

    return res;
}

async function isValidPairing(proof, preprocessed, challenges, F, E, curve) {
    const G1 = curve.G1;
    const G2 = curve.G2;

    const A1 = proof.pi;
    const A2 = G2.sub(preprocessed.S_2, G2.timesFr(G2.one, challenges.z));

    const B1 = G1.sub(F, E);
    const B2 = G2.one;

    return await curve.pairingEq(A1, A2, B1, B2);
}

function fromObjectVk(preprocessed, curve) {
    if ("polynomials" in preprocessed) {
        Object.keys(preprocessed.polynomials).forEach(key => {
            preprocessed.polynomials[key] = curve.G1.fromObject(preprocessed.polynomials[key]);
        });
    }

    if(preprocessed.S_2) {
        preprocessed.S_2 = curve.G2.fromObject(preprocessed.S_2);
    }

    return preprocessed;
}

export function toDebugArray(buffer, Fr) {
    const length = buffer.byteLength / Fr.n8;
    let res = [];
    for (let i = 0; i < length; i++) {
        res.push(Fr.toString(buffer.slice(i * Fr.n8, (i + 1) * Fr.n8)));
    }

    return res;
}