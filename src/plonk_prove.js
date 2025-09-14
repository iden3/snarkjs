/*
    Copyright 2021 0kims association.

    This file is part of snarkjs.

    snarkjs is a free software: you can redistribute it and/or
    modify it under the terms of the GNU General Public License as published by the
    Free Software Foundation, either version 3 of the License, or (at your option)
    any later version.

    snarkjs is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
    more details.

    You should have received a copy of the GNU General Public License along with
    snarkjs. If not, see <https://www.gnu.org/licenses/>.
*/

/* Implementation of this paper: https://eprint.iacr.org/2019/953.pdf section 8.4 */

import * as binFileUtils from "@iden3/binfileutils";
import * as zkeyUtils from "./zkey_utils.js";
import * as wtnsUtils from "./wtns_utils.js";
import { Scalar, utils, BigBuffer } from "ffjavascript";
const {stringifyBigInts} = utils;
import { Proof } from "./proof.js";
import { Keccak256Transcript } from "./Keccak256Transcript.js";
import { MulZ } from "./mul_z.js";
import {  ZKEY_PL_HEADER_SECTION,
    ZKEY_PL_ADDITIONS_SECTION,
    ZKEY_PL_A_MAP_SECTION,
    ZKEY_PL_B_MAP_SECTION,
    ZKEY_PL_C_MAP_SECTION,
    ZKEY_PL_QM_SECTION,
    ZKEY_PL_QL_SECTION,
    ZKEY_PL_QR_SECTION,
    ZKEY_PL_QO_SECTION,
    ZKEY_PL_QC_SECTION,
    ZKEY_PL_SIGMA_SECTION,
    ZKEY_PL_LAGRANGE_SECTION,
    ZKEY_PL_PTAU_SECTION,
} from "./plonk_constants.js";
import { Polynomial } from "./polynomial/polynomial.js";
import { Evaluations } from "./polynomial/evaluations.js";
    
export default async function plonk16Prove(zkeyFileName, witnessFileName, logger, options) {
    const {fd: fdWtns, sections: sectionsWtns} = await binFileUtils.readBinFile(witnessFileName, "wtns", 2, 1<<25, 1<<23);

    // Read witness file
    if (logger) logger.debug("> Reading witness file");
    const wtns = await wtnsUtils.readHeader(fdWtns, sectionsWtns);

    // Read zkey file
    if (logger) logger.debug("> Reading zkey file");
    const {fd: fdZKey, sections: zkeySections} = await binFileUtils.readBinFile(zkeyFileName, "zkey", 2, 1<<25, 1<<23);

    const zkey = await zkeyUtils.readHeader(fdZKey, zkeySections, undefined, options);
    if (zkey.protocol != "plonk") {
        throw new Error("zkey file is not plonk");
    }

    if (!Scalar.eq(zkey.r,  wtns.q)) {
        throw new Error("Curve of the witness does not match the curve of the proving key");
    }

    if (wtns.nWitness != zkey.nVars -zkey.nAdditions) {
        throw new Error(`Invalid witness length. Circuit: ${zkey.nVars}, witness: ${wtns.nWitness}, ${zkey.nAdditions}`);
    }

    const curve = zkey.curve;

    const Fr = curve.Fr;
    const n8r = curve.Fr.n8;
    const sDomain = zkey.domainSize * n8r;

    if (logger) {
        logger.debug("----------------------------");
        logger.debug("  PLONK PROVE SETTINGS");
        logger.debug(`  Curve:         ${curve.name}`);
        logger.debug(`  Circuit power: ${zkey.power}`);
        logger.debug(`  Domain size:   ${zkey.domainSize}`);
        logger.debug(`  Vars:          ${zkey.nVars}`);
        logger.debug(`  Public vars:   ${zkey.nPublic}`);
        logger.debug(`  Constraints:   ${zkey.nConstraints}`);
        logger.debug(`  Additions:     ${zkey.nAdditions}`);
        logger.debug("----------------------------");
    }

    //Read witness data
    if (logger) logger.debug("> Reading witness file data");
    const buffWitness = await binFileUtils.readSection(fdWtns, sectionsWtns, 2);

    // First element in plonk is not used and can be any value. (But always the same).
    // We set it to zero to go faster in the exponentiations.
    buffWitness.set(Fr.zero, 0);
    const buffInternalWitness = new BigBuffer(n8r*zkey.nAdditions);

    let buffers = {};
    let polynomials = {};
    let evaluations = {};

    let challenges = {};
    let proof = new Proof(curve, logger);
    const transcript = new Keccak256Transcript(curve);

    if (logger) logger.debug(`> Reading Section ${ZKEY_PL_ADDITIONS_SECTION}. Additions`);
    await calculateAdditions();

    if (logger) logger.debug(`> Reading Section ${ZKEY_PL_SIGMA_SECTION}. Sigma1, Sigma2 & Sigma 3`);
    if (logger) logger.debug("··· Reading Sigma polynomials ");
    polynomials.Sigma1 = new Polynomial(new BigBuffer(sDomain), curve, logger);
    polynomials.Sigma2 = new Polynomial(new BigBuffer(sDomain), curve, logger);
    polynomials.Sigma3 = new Polynomial(new BigBuffer(sDomain), curve, logger);

    await fdZKey.readToBuffer(polynomials.Sigma1.coef, 0, sDomain, zkeySections[ZKEY_PL_SIGMA_SECTION][0].p);
    await fdZKey.readToBuffer(polynomials.Sigma2.coef, 0, sDomain, zkeySections[ZKEY_PL_SIGMA_SECTION][0].p + 5 * sDomain);
    await fdZKey.readToBuffer(polynomials.Sigma3.coef, 0, sDomain, zkeySections[ZKEY_PL_SIGMA_SECTION][0].p + 10 * sDomain);

    if (logger) logger.debug("··· Reading Sigma evaluations");
    evaluations.Sigma1 = new Evaluations(new BigBuffer(sDomain * 4), curve, logger);
    evaluations.Sigma2 = new Evaluations(new BigBuffer(sDomain * 4), curve, logger);
    evaluations.Sigma3 = new Evaluations(new BigBuffer(sDomain * 4), curve, logger);

    await fdZKey.readToBuffer(evaluations.Sigma1.eval, 0, sDomain * 4, zkeySections[ZKEY_PL_SIGMA_SECTION][0].p + sDomain);
    await fdZKey.readToBuffer(evaluations.Sigma2.eval, 0, sDomain * 4, zkeySections[ZKEY_PL_SIGMA_SECTION][0].p + 6 * sDomain);
    await fdZKey.readToBuffer(evaluations.Sigma3.eval, 0, sDomain * 4, zkeySections[ZKEY_PL_SIGMA_SECTION][0].p + 11 * sDomain);

    if (logger) logger.debug(`> Reading Section ${ZKEY_PL_PTAU_SECTION}. Powers of Tau`);
    const PTau = await binFileUtils.readSection(fdZKey, zkeySections, ZKEY_PL_PTAU_SECTION);

    let publicSignals = [];

    for (let i=1; i<= zkey.nPublic; i++) {
        const pub = buffWitness.slice(i*Fr.n8, i*Fr.n8+Fr.n8);
        publicSignals.push(Scalar.fromRprLE(pub));
    }

    if (logger) logger.debug("");
    if (logger) logger.debug("> ROUND 1");
    await round1();

    if (logger) logger.debug("> ROUND 2");
    await round2();

    if (logger) logger.debug("> ROUND 3");
    await round3();

    if (logger) logger.debug("> ROUND 4");
    await round4();

    if (logger) logger.debug("> ROUND 5");
    await round5();

    ///////////////////////
    // Final adjustments //
    ///////////////////////

    await fdZKey.close();
    await fdWtns.close();

    // Prepare proof
    let _proof = proof.toObjectProof(false);
    _proof.protocol = "plonk";
    _proof.curve = curve.name;
    
    if (logger) logger.debug("PLONK PROVER FINISHED");

    return {
        proof: stringifyBigInts(_proof),
        publicSignals: stringifyBigInts(publicSignals)
    };

    async function calculateAdditions() {
        if (logger) logger.debug("··· Computing additions");
        const additionsBuff = await binFileUtils.readSection(fdZKey, zkeySections, ZKEY_PL_ADDITIONS_SECTION);

        // sizes: wireId_x = 4 bytes (32 bits), factor_x = field size bits
        // Addition form: wireId_a wireId_b factor_a factor_b (size is 4 + 4 + sFr + sFr)
        const sSum = 8 + n8r * 2;

        for (let i = 0; i < zkey.nAdditions; i++) {
            if (logger && (0 !== i) && (i % 100000 === 0)) logger.debug(`    addition ${i}/${zkey.nAdditions}`);

            // Read addition values
            let offset = i * sSum;
            const signalId1 = readUInt32(additionsBuff, offset);
            offset += 4;
            const signalId2 = readUInt32(additionsBuff, offset);
            offset += 4;
            const factor1 = additionsBuff.slice(offset, offset + n8r);
            offset += n8r;
            const factor2 = additionsBuff.slice(offset, offset + n8r);

            // Get witness value
            const witness1 = getWitness(signalId1);
            const witness2 = getWitness(signalId2);

            //Calculate final result
            const result = Fr.add(Fr.mul(factor1, witness1), Fr.mul(factor2, witness2));

            buffInternalWitness.set(result, n8r * i);
        }
    }

    function readUInt32(b, o) {
        const buff = b.slice(o, o+4);
        const buffV = new DataView(buff.buffer, buff.byteOffset, buff.byteLength);
        return buffV.getUint32(0, true);
    }

    function getWitness(idx) {
        if (idx < zkey.nVars-zkey.nAdditions) {
            return buffWitness.slice(idx*n8r, idx*n8r+n8r);
        } else if (idx < zkey.nVars) {
            return buffInternalWitness.slice((idx - (zkey.nVars-zkey.nAdditions))*n8r, (idx-(zkey.nVars-zkey.nAdditions))*n8r + n8r);
        } else {
            return curve.Fr.zero;
        }
    }

    async function round1() {
        // STEP 1.1 - Generate random blinding scalars (b1, ..., b11) ∈ F
        challenges.b = [];
        for (let i=1; i<=11; i++) {
            challenges.b[i] = curve.Fr.random();
        }

        // STEP 1.2 - Compute wire polynomials a(X), b(X) and c(X)
        if (logger) logger.debug("> Computing A, B, C wire polynomials");
        await computeWirePolynomials();

        // STEP 1.3 - Compute [a]_1, [b]_1, [c]_1
        if (logger) logger.debug("> Computing A, B, C MSM");
        let commitA = await polynomials.A.multiExponentiation(PTau, "A");
        let commitB = await polynomials.B.multiExponentiation(PTau, "B");
        let commitC = await polynomials.C.multiExponentiation(PTau, "C");

        // First output of the prover is ([A]_1, [B]_1, [C]_1)
        proof.addPolynomial("A", commitA);
        proof.addPolynomial("B", commitB);
        proof.addPolynomial("C", commitC);

        return 0;
    }

    async function computeWirePolynomials() {
        if (logger) logger.debug("··· Reading data from zkey file");

        // Build A, B and C evaluations buffer from zkey and witness files
        buffers.A = new BigBuffer(sDomain);
        buffers.B = new BigBuffer(sDomain);
        buffers.C = new BigBuffer(sDomain);

        // Read zkey file to the buffers
        const aMapBuff = await binFileUtils.readSection(fdZKey, zkeySections, ZKEY_PL_A_MAP_SECTION);
        const bMapBuff = await binFileUtils.readSection(fdZKey, zkeySections, ZKEY_PL_B_MAP_SECTION);
        const cMapBuff = await binFileUtils.readSection(fdZKey, zkeySections, ZKEY_PL_C_MAP_SECTION);

        // Compute all witness from signal ids and set them to A,B & C buffers
        for (let i = 0; i < zkey.nConstraints; i++) {
            const i_sFr = i * n8r;
            const offset = i * 4;

            // Compute A value from a signal id
            const signalIdA = readUInt32(aMapBuff, offset);
            buffers.A.set(getWitness(signalIdA), i_sFr);

            // Compute B value from a signal id
            const signalIdB = readUInt32(bMapBuff, offset);
            buffers.B.set(getWitness(signalIdB), i_sFr);

            // Compute C value from a signal id
            const signalIdC = readUInt32(cMapBuff, offset);
            buffers.C.set(getWitness(signalIdC), i_sFr);
        }

        buffers.A = await Fr.batchToMontgomery(buffers.A);
        buffers.B = await Fr.batchToMontgomery(buffers.B);
        buffers.C = await Fr.batchToMontgomery(buffers.C);

        // Compute the coefficients of the wire polynomials a(X), b(X) and c(X) from A,B & C buffers
        if (logger) logger.debug("··· Computing A ifft");
        polynomials.A = await Polynomial.fromEvaluations(buffers.A, curve, logger);
        if (logger) logger.debug("··· Computing B ifft");
        polynomials.B = await Polynomial.fromEvaluations(buffers.B, curve, logger);
        if (logger) logger.debug("··· Computing C ifft");
        polynomials.C = await Polynomial.fromEvaluations(buffers.C, curve, logger);

        // Compute extended evaluations of a(X), b(X) and c(X) polynomials
        if (logger) logger.debug("··· Computing A fft");
        evaluations.A = await Evaluations.fromPolynomial(polynomials.A, 4, curve, logger);
        if (logger) logger.debug("··· Computing B fft");
        evaluations.B = await Evaluations.fromPolynomial(polynomials.B, 4, curve, logger);
        if (logger) logger.debug("··· Computing C fft");
        evaluations.C = await Evaluations.fromPolynomial(polynomials.C, 4, curve, logger);

        // Blind a(X), b(X) and c(X) polynomials coefficients with blinding scalars b
        polynomials.A.blindCoefficients([challenges.b[2], challenges.b[1]]);
        polynomials.B.blindCoefficients([challenges.b[4], challenges.b[3]]);
        polynomials.C.blindCoefficients([challenges.b[6], challenges.b[5]]);

        // Check degrees
        if (polynomials.A.degree() >= zkey.domainSize + 2) {
            throw new Error("A Polynomial is not well calculated");
        }
        if (polynomials.B.degree() >= zkey.domainSize + 2) {
            throw new Error("B Polynomial is not well calculated");
        }
        if (polynomials.C.degree() >= zkey.domainSize + 2) {
            throw new Error("C Polynomial is not well calculated");
        }        
    }

    async function round2() {
        // STEP 2.1 - Compute permutation challenge beta and gamma ∈ F
        // Compute permutation challenge beta
        if (logger) logger.debug("> Computing challenges beta and gamma");
        transcript.reset();

        transcript.addPolCommitment(zkey.Qm);
        transcript.addPolCommitment(zkey.Ql);
        transcript.addPolCommitment(zkey.Qr);
        transcript.addPolCommitment(zkey.Qo);
        transcript.addPolCommitment(zkey.Qc);
        transcript.addPolCommitment(zkey.S1);
        transcript.addPolCommitment(zkey.S2);
        transcript.addPolCommitment(zkey.S3);

        // Add A to the transcript
        for (let i = 0; i < zkey.nPublic; i++) {
            transcript.addScalar(buffers.A.slice(i * n8r, i * n8r + n8r));
        }

        // Add A, B, C to the transcript
        transcript.addPolCommitment(proof.getPolynomial("A"));
        transcript.addPolCommitment(proof.getPolynomial("B"));
        transcript.addPolCommitment(proof.getPolynomial("C"));

        challenges.beta = transcript.getChallenge();
        if (logger) logger.debug("··· challenges.beta: " + Fr.toString(challenges.beta, 16));

        // Compute permutation challenge gamma
        transcript.reset();
        transcript.addScalar(challenges.beta);
        challenges.gamma = transcript.getChallenge();
        if (logger) logger.debug("··· challenges.gamma: " + Fr.toString(challenges.gamma, 16));
    
        // STEP 2.2 - Compute permutation polynomial z(X)
        if (logger) logger.debug("> Computing Z polynomial");
        await computeZ();

        // STEP 2.3 - Compute permutation [z]_1
        if (logger) logger.debug("> Computing Z MSM");
        let commitZ = await polynomials.Z.multiExponentiation(PTau, "Z");

        // Second output of the prover is ([Z]_1)
        proof.addPolynomial("Z", commitZ);
    }

    async function computeZ() {
        if (logger) logger.debug("··· Computing Z evaluations");

        let numArr = new BigBuffer(sDomain);
        let denArr = new BigBuffer(sDomain);

        // Set the first values to 1
        numArr.set(Fr.one, 0);
        denArr.set(Fr.one, 0);

        // Set initial omega
        let w = Fr.one;
        for (let i = 0; i < zkey.domainSize; i++) {
            const i_n8r = i * n8r;
            
            const a = buffers.A.slice(i_n8r, i_n8r + n8r);
            const b = buffers.B.slice(i_n8r, i_n8r + n8r);
            const c = buffers.C.slice(i_n8r, i_n8r + n8r);

            // Z(X) := numArr / denArr
            // numArr := (a + beta·ω + gamma)(b + beta·ω·k1 + gamma)(c + beta·ω·k2 + gamma)
            const betaw = Fr.mul(challenges.beta, w);

            let n1 = Fr.add(a, betaw);
            n1 = Fr.add(n1, challenges.gamma);

            let n2 = Fr.add(b, Fr.mul(zkey.k1, betaw));
            n2 = Fr.add(n2, challenges.gamma);

            let n3 = Fr.add(c, Fr.mul(zkey.k2, betaw));
            n3 = Fr.add(n3, challenges.gamma);

            let num = Fr.mul(n1, Fr.mul(n2, n3));

            // denArr := (a + beta·sigma1 + gamma)(b + beta·sigma2 + gamma)(c + beta·sigma3 + gamma)
            let d1 = Fr.add(a, Fr.mul(evaluations.Sigma1.getEvaluation(i * 4), challenges.beta));
            d1 = Fr.add(d1, challenges.gamma);

            let d2 = Fr.add(b, Fr.mul(evaluations.Sigma2.getEvaluation(i * 4), challenges.beta));
            d2 = Fr.add(d2, challenges.gamma);

            let d3 = Fr.add(c, Fr.mul(evaluations.Sigma3.getEvaluation(i * 4), challenges.beta));
            d3 = Fr.add(d3, challenges.gamma);

            let den = Fr.mul(d1, Fr.mul(d2, d3));

            // Multiply current num value with the previous one saved in numArr
            num = Fr.mul(numArr.slice(i_n8r, i_n8r + n8r), num);
            numArr.set(num, ((i + 1) % zkey.domainSize) * n8r);

            // Multiply current den value with the previous one saved in denArr
            den = Fr.mul(denArr.slice(i_n8r, i_n8r + n8r), den);
            denArr.set(den, ((i + 1) % zkey.domainSize) * n8r);

            w = Fr.mul(w, Fr.w[zkey.power]);
        }

        // Compute the inverse of denArr to compute in the next command the
        // division numArr/denArr by multiplying num · 1/denArr
        denArr = await Fr.batchInverse(denArr);

        // TODO: Do it in assembly and in parallel
        // Multiply numArr · denArr where denArr was inverted in the previous command
        for (let i = 0; i < zkey.domainSize; i++) {
            const i_sFr = i * n8r;

            const z = Fr.mul(numArr.slice(i_sFr, i_sFr + n8r), denArr.slice(i_sFr, i_sFr + n8r));
            numArr.set(z, i_sFr);
        }

        // From now on the values saved on numArr will be Z(X) buffer
        buffers.Z = numArr;

        if (!Fr.eq(numArr.slice(0, n8r), Fr.one)) {
            throw new Error("Copy constraints does not match");
        }

        // Compute polynomial coefficients z(X) from buffers.Z
        if (logger) logger.debug("··· Computing Z ifft");
        polynomials.Z = await Polynomial.fromEvaluations(buffers.Z, curve, logger);

        // Compute extended evaluations of z(X) polynomial
        if (logger) logger.debug("··· Computing Z fft");
        evaluations.Z = await Evaluations.fromPolynomial(polynomials.Z, 4, curve, logger);

        // Blind z(X) polynomial coefficients with blinding scalars b
        polynomials.Z.blindCoefficients([challenges.b[9], challenges.b[8], challenges.b[7]]);

        // Check degree
        if (polynomials.Z.degree() >= zkey.domainSize + 3) {
            throw new Error("Z Polynomial is not well calculated");
        }

        delete buffers.Z;
    }

    async function round3() {
        if (logger) logger.debug("> Computing challenge alpha");

        // STEP 3.1 - Compute evaluation challenge alpha ∈ F
        transcript.reset();
        transcript.addScalar(challenges.beta);
        transcript.addScalar(challenges.gamma);
        transcript.addPolCommitment(proof.getPolynomial("Z"));

        challenges.alpha = transcript.getChallenge();
        challenges.alpha2 = Fr.square(challenges.alpha);
        if (logger) logger.debug("··· challenges.alpha: " + Fr.toString(challenges.alpha, 16));

        // Compute quotient polynomial T(X)
        if (logger) logger.debug("> Computing T polynomial");
        await computeT();

        // Compute [T1]_1, [T2]_1, [T3]_1
        if (logger) logger.debug("> Computing T MSM");
        let commitT1 = await polynomials.T1.multiExponentiation(PTau, "T1");
        let commitT2 = await polynomials.T2.multiExponentiation(PTau, "T2");
        let commitT3 = await polynomials.T3.multiExponentiation(PTau, "T3");

        // Third output of the prover is ([T1]_1, [T2]_1, [T3]_1)
        proof.addPolynomial("T1", commitT1);
        proof.addPolynomial("T2", commitT2);
        proof.addPolynomial("T3", commitT3);        
    }

    async function computeT() {
        if (logger)
            logger.debug(`··· Reading sections ${ZKEY_PL_QL_SECTION}, ${ZKEY_PL_QR_SECTION}` +
                `, ${ZKEY_PL_QM_SECTION}, ${ZKEY_PL_QO_SECTION}, ${ZKEY_PL_QC_SECTION}. Q selectors`);
        // Reserve memory for Q's evaluations
        evaluations.QL = new Evaluations(new BigBuffer(sDomain * 4), curve, logger);
        evaluations.QR = new Evaluations(new BigBuffer(sDomain * 4), curve, logger);
        evaluations.QM = new Evaluations(new BigBuffer(sDomain * 4), curve, logger);
        evaluations.QO = new Evaluations(new BigBuffer(sDomain * 4), curve, logger);
        evaluations.QC = new Evaluations(new BigBuffer(sDomain * 4), curve, logger);

        // Read Q's evaluations from zkey file
        await fdZKey.readToBuffer(evaluations.QL.eval, 0, sDomain * 4, zkeySections[ZKEY_PL_QL_SECTION][0].p + sDomain);
        await fdZKey.readToBuffer(evaluations.QR.eval, 0, sDomain * 4, zkeySections[ZKEY_PL_QR_SECTION][0].p + sDomain);
        await fdZKey.readToBuffer(evaluations.QM.eval, 0, sDomain * 4, zkeySections[ZKEY_PL_QM_SECTION][0].p + sDomain);
        await fdZKey.readToBuffer(evaluations.QO.eval, 0, sDomain * 4, zkeySections[ZKEY_PL_QO_SECTION][0].p + sDomain);
        await fdZKey.readToBuffer(evaluations.QC.eval, 0, sDomain * 4, zkeySections[ZKEY_PL_QC_SECTION][0].p + sDomain);

        // Read Lagrange polynomials & evaluations from zkey file
        evaluations.Lagrange = new Evaluations(new BigBuffer(sDomain * 4 * zkey.nPublic), curve, logger);

        for (let i = 0; i < zkey.nPublic; i++) {
            await fdZKey.readToBuffer(evaluations.Lagrange.eval, i * sDomain * 4, sDomain * 4, zkeySections[ZKEY_PL_LAGRANGE_SECTION][0].p + i * 5 * sDomain + sDomain);
        }

        buffers.T = new BigBuffer(sDomain * 4);
        buffers.Tz = new BigBuffer(sDomain * 4);

        if (logger) logger.debug("··· Computing T evaluations");

        let w = Fr.one;
        for (let i = 0; i < zkey.domainSize * 4; i++) {
            if (logger && (0 !== i) && (i % 100000 === 0))
                logger.debug(`      T evaluation ${i}/${zkey.domainSize * 4}`);

            const a = evaluations.A.getEvaluation(i);
            const b = evaluations.B.getEvaluation(i);
            const c = evaluations.C.getEvaluation(i);
            const z = evaluations.Z.getEvaluation(i);
            const zw = evaluations.Z.getEvaluation((zkey.domainSize * 4 + 4 + i) % (zkey.domainSize * 4));

            const qm = evaluations.QM.getEvaluation(i);
            const ql = evaluations.QL.getEvaluation(i);
            const qr = evaluations.QR.getEvaluation(i);
            const qo = evaluations.QO.getEvaluation(i);
            const qc = evaluations.QC.getEvaluation(i);
            const s1 = evaluations.Sigma1.getEvaluation(i);
            const s2 = evaluations.Sigma2.getEvaluation(i);
            const s3 = evaluations.Sigma3.getEvaluation(i);

            const ap = Fr.add(challenges.b[2], Fr.mul(challenges.b[1], w));
            const bp = Fr.add(challenges.b[4], Fr.mul(challenges.b[3], w));
            const cp = Fr.add(challenges.b[6], Fr.mul(challenges.b[5], w));

            const w2 = Fr.square(w);
            const zp = Fr.add(Fr.add(Fr.mul(challenges.b[7], w2), Fr.mul(challenges.b[8], w)), challenges.b[9]);
            const wW = Fr.mul(w, Fr.w[zkey.power]);
            const wW2 = Fr.square(wW);
            const zWp = Fr.add(Fr.add(Fr.mul(challenges.b[7], wW2), Fr.mul(challenges.b[8], wW)), challenges.b[9]);

            let pi = Fr.zero;
            for (let j = 0; j < zkey.nPublic; j++) {
                const offset = (j * 4 * zkey.domainSize) + i;

                const lPol = evaluations.Lagrange.getEvaluation(offset);
                const aVal = buffers.A.slice(j * n8r, (j + 1) * n8r);

                pi = Fr.sub(pi, Fr.mul(lPol, aVal));
            }

            // e1 := a(X)b(X)qM(X) + a(X)qL(X) + b(X)qR(X) + c(X)qO(X) + PI(X) + qC(X)
            let [e1, e1z] = MulZ.mul2(a, b, ap, bp, i % 4, Fr);
            e1 = Fr.mul(e1, qm);
            e1z = Fr.mul(e1z, qm);

            e1 = Fr.add(e1, Fr.mul(a, ql));
            e1z = Fr.add(e1z, Fr.mul(ap, ql));

            e1 = Fr.add(e1, Fr.mul(b, qr));
            e1z = Fr.add(e1z, Fr.mul(bp, qr));

            e1 = Fr.add(e1, Fr.mul(c, qo));
            e1z = Fr.add(e1z, Fr.mul(cp, qo));

            e1 = Fr.add(e1, pi);
            e1 = Fr.add(e1, qc);

            // e2 := α[(a(X) + βX + γ)(b(X) + βk1X + γ)(c(X) + βk2X + γ)z(X)]
            const betaw = Fr.mul(challenges.beta, w);
            let e2a = a;
            e2a = Fr.add(e2a, betaw);
            e2a = Fr.add(e2a, challenges.gamma);

            let e2b = b;
            e2b = Fr.add(e2b, Fr.mul(betaw, zkey.k1));
            e2b = Fr.add(e2b, challenges.gamma);

            let e2c = c;
            e2c = Fr.add(e2c, Fr.mul(betaw, zkey.k2));
            e2c = Fr.add(e2c, challenges.gamma);

            let e2d = z;

            let [e2, e2z] = MulZ.mul4(e2a, e2b, e2c, e2d, ap, bp, cp, zp, i % 4, Fr);
            e2 = Fr.mul(e2, challenges.alpha);
            e2z = Fr.mul(e2z, challenges.alpha);

            // e3 := α[(a(X) + βSσ1(X) + γ)(b(X) + βSσ2(X) + γ)(c(X) + βSσ3(X) + γ)z(Xω)]
            let e3a = a;
            e3a = Fr.add(e3a, Fr.mul(challenges.beta, s1));
            e3a = Fr.add(e3a, challenges.gamma);

            let e3b = b;
            e3b = Fr.add(e3b, Fr.mul(challenges.beta, s2));
            e3b = Fr.add(e3b, challenges.gamma);

            let e3c = c;
            e3c = Fr.add(e3c, Fr.mul(challenges.beta, s3));
            e3c = Fr.add(e3c, challenges.gamma);

            let e3d = zw;
            let [e3, e3z] = MulZ.mul4(e3a, e3b, e3c, e3d, ap, bp, cp, zWp, i % 4, Fr);

            e3 = Fr.mul(e3, challenges.alpha);
            e3z = Fr.mul(e3z, challenges.alpha);

            // e4 := α^2(z(X)−1)L1(X)
            let e4 = Fr.sub(z, Fr.one);
            e4 = Fr.mul(e4, evaluations.Lagrange.getEvaluation(i));
            e4 = Fr.mul(e4, challenges.alpha2);

            let e4z = Fr.mul(zp, evaluations.Lagrange.getEvaluation(i));
            e4z = Fr.mul(e4z, challenges.alpha2);


            let t = Fr.add(Fr.sub(Fr.add(e1, e2), e3), e4);
            let tz = Fr.add(Fr.sub(Fr.add(e1z, e2z), e3z), e4z);

            buffers.T.set(t, i * n8r);
            buffers.Tz.set(tz, i * n8r);

            w = Fr.mul(w, Fr.w[zkey.power + 2]);
        }

        // Compute the coefficients of the polynomial T0(X) from buffers.T0
        if (logger)
            logger.debug("··· Computing T ifft");
        polynomials.T = await Polynomial.fromEvaluations(buffers.T, curve, logger);

        // Divide the polynomial T0 by Z_H(X)
        if (logger)
            logger.debug("··· Computing T / ZH");
        polynomials.T.divZh(zkey.domainSize, 4);

        // Compute the coefficients of the polynomial Tz(X) from buffers.Tz
        if (logger)
            logger.debug("··· Computing Tz ifft");
        polynomials.Tz = await Polynomial.fromEvaluations(buffers.Tz, curve, logger);

        // Add the polynomial T1z to T1 to get the final polynomial T1
        polynomials.T.add(polynomials.Tz);

        // Check degree
        if (polynomials.T.degree() >= zkey.domainSize * 3 + 6) {
            throw new Error("T Polynomial is not well calculated");
        }

        // t(x) has degree 3n + 5, we are going to split t(x) into three smaller polynomials:
        // T1' and T2'  with a degree < n and T3' with a degree n+5
        // such that t(x) = T1'(X) + X^n T2'(X) + X^{2n} T3'(X)
        // To randomize the parts we use blinding scalars b_10 and b_11 in a way that doesn't change t(X):
        // T1(X) = T1'(X) + b_10 X^n
        // T2(X) = T2'(X) - b_10 + b_11 X^n
        // T3(X) = T3'(X) - b_11
        // such that
        // t(X) = T1(X) + X^n T2(X) + X^2n T3(X)
        if (logger) logger.debug("··· Computing T1, T2, T3 polynomials");
        polynomials.T1 = new Polynomial(new BigBuffer((zkey.domainSize + 1) * n8r), curve, logger);
        polynomials.T2 = new Polynomial(new BigBuffer((zkey.domainSize + 1) * n8r), curve, logger);
        polynomials.T3 = new Polynomial(new BigBuffer((zkey.domainSize + 6) * n8r), curve, logger);

        polynomials.T1.coef.set(polynomials.T.coef.slice(0, sDomain), 0);
        polynomials.T2.coef.set(polynomials.T.coef.slice(sDomain, sDomain * 2), 0);
        polynomials.T3.coef.set(polynomials.T.coef.slice(sDomain * 2, sDomain * 3 + 6 * n8r), 0);

        // Add blinding scalar b_10 as a new coefficient n
        polynomials.T1.setCoef(zkey.domainSize, challenges.b[10]);

        // compute t_mid(X)
        // Subtract blinding scalar b_10 to the lowest coefficient of t_mid
        const lowestMid = Fr.sub(polynomials.T2.getCoef(0), challenges.b[10]);
        polynomials.T2.setCoef(0, lowestMid);
        polynomials.T2.setCoef(zkey.domainSize, challenges.b[11]);

        // compute t_high(X)
        //Subtract blinding scalar b_11 to the lowest coefficient of t_high
        const lowestHigh = Fr.sub(polynomials.T3.getCoef(0), challenges.b[11]);
        polynomials.T3.setCoef(0, lowestHigh);
    }

    async function round4() {
        if (logger) logger.debug("> Computing challenge xi");

        // STEP 4.1 - Compute evaluation challenge xi ∈ F
        transcript.reset();
        transcript.addScalar(challenges.alpha);
        transcript.addPolCommitment(proof.getPolynomial("T1"));
        transcript.addPolCommitment(proof.getPolynomial("T2"));
        transcript.addPolCommitment(proof.getPolynomial("T3"));

        challenges.xi = transcript.getChallenge();
        challenges.xiw = Fr.mul(challenges.xi, Fr.w[zkey.power]);
        
        if (logger) logger.debug("··· challenges.xi: " + Fr.toString(challenges.xi, 16));  

        // Fourth output of the prover is ( a(xi), b(xi), c(xi), s1(xi), s2(xi), z(xiw) )
        proof.addEvaluation("eval_a", polynomials.A.evaluate(challenges.xi));
        proof.addEvaluation("eval_b", polynomials.B.evaluate(challenges.xi));
        proof.addEvaluation("eval_c", polynomials.C.evaluate(challenges.xi));
        proof.addEvaluation("eval_s1", polynomials.Sigma1.evaluate(challenges.xi));
        proof.addEvaluation("eval_s2", polynomials.Sigma2.evaluate(challenges.xi));
        proof.addEvaluation("eval_zw", polynomials.Z.evaluate(challenges.xiw));
    }

    async function round5() {
        if (logger) logger.debug("> Computing challenge v");
        
        // STEP 5.1 - Compute evaluation challenge v ∈ F
        transcript.reset();
        transcript.addScalar(challenges.xi);
        transcript.addScalar(proof.getEvaluation("eval_a"));
        transcript.addScalar(proof.getEvaluation("eval_b"));
        transcript.addScalar(proof.getEvaluation("eval_c"));
        transcript.addScalar(proof.getEvaluation("eval_s1"));
        transcript.addScalar(proof.getEvaluation("eval_s2"));
        transcript.addScalar(proof.getEvaluation("eval_zw"));

        challenges.v = [];
        challenges.v[1] = transcript.getChallenge();
        if (logger) logger.debug("··· challenges.v: " + Fr.toString(challenges.v[1], 16));

        for (let i = 2; i < 6; i++) {
            challenges.v[i] = Fr.mul(challenges.v[i - 1], challenges.v[1]);
        }

        // STEP 5.2 Compute linearisation polynomial r(X)
        if (logger) logger.debug("> Computing linearisation polynomial R(X)");
        await computeR();

        //STEP 5.3 Compute opening proof polynomial Wxi(X)
        if (logger) logger.debug("> Computing opening proof polynomial Wxi(X) polynomial");
        computeWxi();

        //STEP 5.4 Compute opening proof polynomial Wxiw(X)
        if (logger) logger.debug("> Computing opening proof polynomial Wxiw(X) polynomial");
        computeWxiw();

        if (logger) logger.debug("> Computing Wxi, Wxiw MSM");
        let commitWxi = await polynomials.Wxi.multiExponentiation(PTau, "Wxi");
        let commitWxiw = await polynomials.Wxiw.multiExponentiation(PTau, "Wxiw");

        // Fifth output of the prover is ([Wxi]_1, [Wxiw]_1)
        proof.addPolynomial("Wxi", commitWxi);
        proof.addPolynomial("Wxiw", commitWxiw);
    }

    async function computeR() {
        const Fr = curve.Fr;
    
        // Reserve memory for Q's polynomials
        polynomials.QL = new Polynomial(new BigBuffer(sDomain), curve, logger);
        polynomials.QR = new Polynomial(new BigBuffer(sDomain), curve, logger);
        polynomials.QM = new Polynomial(new BigBuffer(sDomain), curve, logger);
        polynomials.QO = new Polynomial(new BigBuffer(sDomain), curve, logger);
        polynomials.QC = new Polynomial(new BigBuffer(sDomain), curve, logger);

        // Read Q's evaluations from zkey file
        await fdZKey.readToBuffer(polynomials.QL.coef, 0, sDomain, zkeySections[ZKEY_PL_QL_SECTION][0].p);
        await fdZKey.readToBuffer(polynomials.QR.coef, 0, sDomain, zkeySections[ZKEY_PL_QR_SECTION][0].p);
        await fdZKey.readToBuffer(polynomials.QM.coef, 0, sDomain, zkeySections[ZKEY_PL_QM_SECTION][0].p);
        await fdZKey.readToBuffer(polynomials.QO.coef, 0, sDomain, zkeySections[ZKEY_PL_QO_SECTION][0].p);
        await fdZKey.readToBuffer(polynomials.QC.coef, 0, sDomain, zkeySections[ZKEY_PL_QC_SECTION][0].p);   
        
        challenges.xin = challenges.xi;
        for (let i = 0; i < zkey.power; i++) {
            challenges.xin = Fr.square(challenges.xin);
        }

        challenges.zh = Fr.sub(challenges.xin, Fr.one);

        const L = [];

        const n = Fr.e(zkey.domainSize);
        let w = Fr.one;
        for (let i = 1; i <= Math.max(1, zkey.nPublic); i++) {
            L[i] = Fr.div(Fr.mul(w, challenges.zh), Fr.mul(n, Fr.sub(challenges.xi, w)));
            w = Fr.mul(w, Fr.w[zkey.power]);
        }

        const eval_l1 = Fr.div(
            Fr.sub(challenges.xin, Fr.one),
            Fr.mul(n, Fr.sub(challenges.xi, Fr.one))
        );

        if (logger) {
            logger.debug("Lagrange Evaluations: ");
            for (let i=1; i<L.length; i++) {
                logger.debug(`L${i}(xi)=` + Fr.toString(L[i], 16));    
            }
        }

        let eval_pi = Fr.zero;
        for (let i=0; i<publicSignals.length; i++) {
            const w = Fr.e(publicSignals[i]);
            eval_pi = Fr.sub(eval_pi, Fr.mul(w, L[i+1]));
        }

        if (logger) logger.debug("PI: " + Fr.toString(eval_pi, 16));

        // Compute constant parts of R(X)
        const coef_ab = Fr.mul(proof.evaluations.eval_a, proof.evaluations.eval_b);

        let e2a = proof.evaluations.eval_a;
        const betaxi = Fr.mul(challenges.beta, challenges.xi);
        e2a = Fr.add(e2a, betaxi);
        e2a = Fr.add(e2a, challenges.gamma);

        let e2b = proof.evaluations.eval_b;
        e2b = Fr.add(e2b, Fr.mul(betaxi, zkey.k1));
        e2b = Fr.add(e2b, challenges.gamma);

        let e2c = proof.evaluations.eval_c;
        e2c = Fr.add(e2c, Fr.mul(betaxi, zkey.k2));
        e2c = Fr.add(e2c, challenges.gamma);

        const e2 = Fr.mul(Fr.mul(Fr.mul(e2a, e2b), e2c), challenges.alpha);

        let e3a = proof.evaluations.eval_a;
        e3a = Fr.add(e3a, Fr.mul(challenges.beta, proof.evaluations.eval_s1));
        e3a = Fr.add(e3a, challenges.gamma);

        let e3b = proof.evaluations.eval_b;
        e3b = Fr.add(e3b, Fr.mul(challenges.beta, proof.evaluations.eval_s2));
        e3b = Fr.add(e3b, challenges.gamma);

        let e3 = Fr.mul(e3a, e3b);
        e3 = Fr.mul(e3, proof.evaluations.eval_zw);
        e3 = Fr.mul(e3, challenges.alpha);

        const e4 = Fr.mul(eval_l1, challenges.alpha2);

        polynomials.R = new Polynomial(new BigBuffer((zkey.domainSize + 6) * n8r), curve, logger);

        polynomials.R.add(polynomials.QM, coef_ab);
        polynomials.R.add(polynomials.QL, proof.evaluations.eval_a);
        polynomials.R.add(polynomials.QR, proof.evaluations.eval_b);
        polynomials.R.add(polynomials.QO, proof.evaluations.eval_c);
        polynomials.R.add(polynomials.QC);
        polynomials.R.add(polynomials.Z, e2);
        polynomials.R.sub(polynomials.Sigma3, Fr.mul(e3, challenges.beta));
        polynomials.R.add(polynomials.Z, e4);

        let tmp = Polynomial.fromPolynomial(polynomials.T3, curve, logger);
        tmp.mulScalar(Fr.square(challenges.xin));
        tmp.add(polynomials.T2, challenges.xin);
        tmp.add(polynomials.T1);
        tmp.mulScalar(challenges.zh);

        polynomials.R.sub(tmp);

        let r0 = Fr.sub(eval_pi, Fr.mul(e3, Fr.add(proof.evaluations.eval_c, challenges.gamma)));
        r0 = Fr.sub(r0, e4);

        if (logger) logger.debug("r0: " + Fr.toString(r0, 16));

        polynomials.R.addScalar(r0);
    }

    function computeWxi() {
        polynomials.Wxi = new Polynomial(new BigBuffer(sDomain + 6 * n8r), curve, logger);

        polynomials.Wxi.add(polynomials.R);
        polynomials.Wxi.add(polynomials.A, challenges.v[1]);
        polynomials.Wxi.add(polynomials.B, challenges.v[2]);
        polynomials.Wxi.add(polynomials.C, challenges.v[3]);
        polynomials.Wxi.add(polynomials.Sigma1, challenges.v[4]);
        polynomials.Wxi.add(polynomials.Sigma2, challenges.v[5]);

        polynomials.Wxi.subScalar(Fr.mul(challenges.v[1], proof.evaluations.eval_a));
        polynomials.Wxi.subScalar(Fr.mul(challenges.v[2], proof.evaluations.eval_b));
        polynomials.Wxi.subScalar(Fr.mul(challenges.v[3], proof.evaluations.eval_c));
        polynomials.Wxi.subScalar(Fr.mul(challenges.v[4], proof.evaluations.eval_s1));
        polynomials.Wxi.subScalar(Fr.mul(challenges.v[5], proof.evaluations.eval_s2));

        polynomials.Wxi.divByZerofier(1, challenges.xi);
    }

    async function computeWxiw() {
        polynomials.Wxiw = Polynomial.fromPolynomial(polynomials.Z, curve, logger);
        polynomials.Wxiw.subScalar(proof.evaluations.eval_zw);

        polynomials.Wxiw.divByZerofier(1, challenges.xiw);
    }
}
