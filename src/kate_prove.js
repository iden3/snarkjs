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

import {BigBuffer, F1Field} from "ffjavascript";
import {newConstantPolsArray, compile, newCommitPolsArray} from "pilcom";
import {Polynomial} from "./polynomial/polynomial.js";
import {expTau} from "./polynomial/evaluations.js";
import {readBinFile} from "@iden3/binfileutils";
import {readPTauHeader} from "./powersoftau_utils.js";
import {log2} from "./misc.js";
import {Proof} from "./proof.js";
import {Keccak256Transcript} from "./keccak256Transcript.js";
import {utils as ffjavascriptUtils} from "ffjavascript";

const {stringifyBigInts} = ffjavascriptUtils;

export default async function kateProve(pilFile, pilConfigFile, cnstPolsFile, cmmtPolsFile, ptauFile, logger) {
    logger.info("Starting kate prover");

    const {fd: fdPTau, sections: sectionsPTau} = await readBinFile(ptauFile, "ptau", 1, 1 << 22, 1 << 24);
    if (!sectionsPTau[12]) {
        if (logger) logger.error("Powers of tau is not prepared.");
        return -1;
    }

    const {curve, ptauPower} = await readPTauHeader(fdPTau, sectionsPTau);
    const F = new F1Field("0xFFFFFFFF00000001");

    // PIL compile
    const pil = await compile(F, pilFile, null, pilConfigFile);

    //Find the max PIL polynomial degree
    let maxPilPolDeg = 0;
    for (const polRef in pil.references) {
        maxPilPolDeg = Math.max(maxPilPolDeg, pil.references[polRef].polDeg);
    }

    const pilPower = log2(maxPilPolDeg - 1) + 1;
    const domainSize = 2 ** pilPower;

    if (pilPower > ptauPower) {
        if (logger) logger.error(`PIL polynomials degree is too big for this powers of Tau, 2**${pilPower} > 2**${ptauPower}`);
        return -1;
    }

    const sG1 = curve.G1.F.n8 * 2;

    const pTau = new BigBuffer(domainSize * sG1);
    const o = sectionsPTau[12][0].p + ((2 ** (pilPower)) - 1) * sG1;
    await fdPTau.readToBuffer(pTau, 0, domainSize * sG1, o);

    // Load preprocessed polynomials
    const cnstPols = newConstantPolsArray(pil);
    await cnstPols.loadFromFile(cnstPolsFile);

    // Load committed polynomials
    const cmmtPols = newCommitPolsArray(pil);
    await cmmtPols.loadFromFile(cmmtPolsFile);

    let challenges = {};
    challenges.b = {};

    let proof = new Proof(curve, logger);
    let polynomials = {};

    // KATE 1. Compute the commitments
    // Add preprocessed polynomials commitments to the proof
    for (let i = 0; i < cnstPols.$$nPols; i++) {
        const cnstPol = cnstPols.$$defArray[i];
        const cnstPolBuffer = cnstPols.$$array[i];

        if (logger) {
            logger.info(`Preparing constant ${cnstPol.name} polynomial`);
        }

        // Get the polynomial coefficient
        let polCoefs = await F.ifft(cnstPolBuffer);

        // Convert from one filed to another (bigger), TODO check if a new constraint is needed
        let polCoefsBuff = new BigBuffer(polCoefs.length * curve.Fr.n8);
        for (let i = 0; i < polCoefs.length; i++) {
            polCoefsBuff.set(curve.Fr.e(polCoefs[i]), i * curve.Fr.n8);
        }

        const domainSize = cnstPolBuffer.length;
        polynomials[cnstPol.name] = await Polynomial.to4T(polCoefsBuff, domainSize, [], curve.Fr);
        polynomials[cnstPol.name] = await polynomials[cnstPol.name].divZh(domainSize);

        // Calculates the commitment
        const polCommitment = await expTau(polynomials[cnstPol.name].coef, pTau, curve, logger);

        // Add the commitment to the proof
        proof.addPolynomial(cnstPol.name, polCommitment, pTau, curve, logger);
    }

    // Add committed polynomials commitments to the proof
    for (let i = 0; i < cmmtPols.$$nPols; i++) {
        const cmmtPol = cmmtPols.$$defArray[i];
        const cmmtPolBuffer = cmmtPols.$$array[i];

        if (logger) {
            logger.info(`Preparing committed ${cmmtPol.name} polynomial`);
        }

        // Get the polynomial coefficient
        let polCoefs = await F.ifft(cmmtPolBuffer);

        // Convert from one filed to another (bigger), TODO check if a new constraint is needed
        let polCoefsBuff = new BigBuffer(polCoefs.length * curve.Fr.n8);
        for (let i = 0; i < polCoefs.length; i++) {
            polCoefsBuff.set(curve.Fr.e(polCoefs[i]), i * curve.Fr.n8);
        }

        // Blind polynomial with random blinding scalars b_{2i}, b_{2i+1} ∈ Zp
        challenges.b[cmmtPol.name] = [curve.Fr.random(), curve.Fr.random()];

        const domainSize = cmmtPolBuffer.length;
        polynomials[cmmtPol.name] = await Polynomial.to4T(polCoefsBuff, domainSize, challenges.b[cmmtPol.name], curve.Fr);
        polynomials[cmmtPol.name] = await polynomials[cmmtPol.name].divZh(domainSize);

        // Calculates the commitment
        const polCommitment = await expTau(polynomials[cmmtPol.name].coef, pTau, curve, logger);

        // Add the commitment to the proof
        proof.addPolynomial(cmmtPol.name, polCommitment, pTau, curve, logger);
    }

    // KATE 2. Samples an evaluation challenge z ∈ Z_p:
    const transcript = new Keccak256Transcript(curve);

    logger.info("Computing challenge z");
    for (const polName in polynomials) {
        transcript.appendPolCommitment(proof.polynomials[polName]);
        logger.warn(`Append polynomial ${polName} to transcript: ${curve.Fr.toString(proof.polynomials[polName])}`);
    }

    challenges.z = transcript.getChallenge();
    if (logger) logger.info("Challenge z computed: " + curve.Fr.toString(challenges.z));

    // KATE 3. Computes pi(z),for i = 1,...,t.
    logger.info("Computing challenge alpha");
    transcript.reset();
    for (const polName in polynomials) {
        const evaluation = polynomials[polName].evaluate(challenges.z);
        proof.addEvaluation(polName, evaluation);
        transcript.appendScalar(evaluation);
        logger.warn(`Evaluating ${polName}: ${curve.Fr.toString(proof.evaluations[polName])}`);
    }

    // KATE 4. Samples an opening challenge α ∈ Zp.
    challenges.alpha = transcript.getChallenge();
    if (logger) logger.info("Challenge alpha computed: " + curve.Fr.toString(challenges.alpha));

    // KATE 5 Computes the proof π = [q(s)]1
    // Computes the polynomial q(x) := ∑ α^{i-1} (pi(x) − pi(z)) / (x - z)
    let polQ = new Polynomial(new Uint8Array(0), curve.Fr, logger);

    let alphaCoef = curve.Fr.one;
    for (const [polName] of Object.entries(polynomials).sort()) {
        polynomials[polName].mulScalar(alphaCoef);
        polynomials[polName].subScalar(proof.evaluations[polName]);
        polynomials[polName].divByXValue(challenges.z);

        polQ.add(polynomials[polName]);

        alphaCoef = curve.Fr.mul(alphaCoef, challenges.alpha);
    }

    proof.pi = await expTau(polQ.coef, pTau, curve, logger);

    logger.info("Kate prover finished successfully");

    //TODO construct public Signals...
    let publicSignals = {};

    // Remove constant polynomials from the proof because they are in the preprocessed data already
    for (let i = 0; i < cnstPols.$$nPols; i++) {
        delete proof.polynomials[cnstPols.$$defArray[i].name];
    }

    return {publicInputs: stringifyBigInts(publicSignals), proof: stringifyBigInts(proof.toObjectProof())};
}