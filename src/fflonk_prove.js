/*
    Copyright 2022 iden3 association.

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

import * as binFileUtils from "@iden3/binfileutils";
import * as zkeyUtils from "./zkey_utils.js";
import * as wtnsUtils from "./wtns_utils.js";
import { BigBuffer, Scalar, utils } from "ffjavascript";
import { FFLONK_PROTOCOL_ID } from "./zkey_constants.js";
import {
    ZKEY_FF_A_MAP_SECTION,
    ZKEY_FF_ADDITIONS_SECTION,
    ZKEY_FF_B_MAP_SECTION,
    ZKEY_FF_F0_SECTION,
    ZKEY_FF_C_MAP_SECTION,
    ZKEY_FF_LAGRANGE_SECTION,
    ZKEY_FF_PTAU_SECTION,
    ZKEY_FF_QC_SECTION,
    ZKEY_FF_QL_SECTION,
    ZKEY_FF_QM_SECTION,
    ZKEY_FF_QO_SECTION,
    ZKEY_FF_QR_SECTION,
    ZKEY_FF_SIGMA1_SECTION,
    ZKEY_FF_SIGMA2_SECTION,
    ZKEY_FF_SIGMA3_SECTION,
} from "./fflonk.js";
import { Keccak256Transcript } from "./Keccak256Transcript.js";
import { Proof } from "./proof.js";
import { Polynomial } from "./polynomial/polynomial.js";
import { Evaluations } from "./polynomial/evaluations.js";
import { commit, open} from "shplonkjs";

const { stringifyBigInts } = utils;


export default async function fflonkProve(zkeyFileName, witnessFileName, logger) {
    if (logger) logger.info("FFLONK PROVER STARTED");

    // Read witness file
    if (logger) logger.info("> Reading witness file");
    const {
        fd: fdWtns,
        sections: wtnsSections
    } = await binFileUtils.readBinFile(witnessFileName, "wtns", 2, 1 << 25, 1 << 23);
    const wtns = await wtnsUtils.readHeader(fdWtns, wtnsSections);

    
    //Read zkey file
    if (logger) logger.info("> Reading zkey file");
    const {
        fd: fdZKey,
        sections: zkeySections
    } = await binFileUtils.readBinFile(zkeyFileName, "zkey", 2, 1 << 25, 1 << 23);
    const zkey = await zkeyUtils.readHeader(fdZKey, zkeySections);

    if (zkey.protocolId !== FFLONK_PROTOCOL_ID) {
        throw new Error("zkey file is not fflonk");
    }

    if (!Scalar.eq(zkey.r, wtns.q)) {
        throw new Error("Curve of the witness does not match the curve of the proving key");
    }

    if (wtns.nWitness !== zkey.nVars - zkey.nAdditions) {
        throw new Error(`Invalid witness length. Circuit: ${zkey.nVars}, witness: ${wtns.nWitness}, ${zkey.nAdditions}`);
    }

    const curve = zkey.curve;

    const Fr = curve.Fr;

    const sFr = curve.Fr.n8;
    const sG1 = curve.G1.F.n8 * 2;
    const sDomain = zkey.domainSize * sFr;
    

    if (logger) {
        logger.info("----------------------------");
        logger.info("  FFLONK PROVE SETTINGS");
        logger.info(`  Curve:         ${curve.name}`);
        logger.info(`  Circuit power: ${zkey.power}`);
        logger.info(`  Domain size:   ${zkey.domainSize}`);
        logger.info(`  Vars:          ${zkey.nVars}`);
        logger.info(`  Public vars:   ${zkey.nPublic}`);
        logger.info(`  Constraints:   ${zkey.nConstraints}`);
        logger.info(`  Additions:     ${zkey.nAdditions}`);
        logger.info("----------------------------");
    }

    //Read witness data
    if (logger) logger.info("> Reading witness file data");
    const buffWitness = await binFileUtils.readSection(fdWtns, wtnsSections, 2);
    await fdWtns.close();

    // First element in plonk is not used and can be any value. (But always the same).
    // We set it to zero to go faster in the exponentiations.
    buffWitness.set(Fr.zero, 0);
    const buffInternalWitness = new BigBuffer(zkey.nAdditions * sFr);

    let buffers = {};
    let polynomials = {};
    let evaluations = {};

    // To divide prime fields the Extended Euclidean Algorithm for computing modular inverses is needed.
    // NOTE: This is the equivalent of compute 1/denominator and then multiply it by the numerator.
    // The Extended Euclidean Algorithm is expensive in terms of computation.
    // For the special case where we need to do many modular inverses, there's a simple mathematical trick
    // that allows us to compute many inverses, called Montgomery batch inversion.
    // More info: https://vitalik.ca/general/2018/07/21/starks_part_3.html
    // Montgomery batch inversion reduces the n inverse computations to a single one
    // To save this (single) inverse computation on-chain, will compute it in proving time and send it to the verifier.
    // The verifier will have to check:
    // 1) the denominator is correct multiplying by himself non-inverted -> a * 1/a == 1
    // 2) compute the rest of the denominators using the Montgomery batch inversion
    // The inversions are:
    //   · denominator needed in step 8 and 9 of the verifier to multiply by 1/Z_H(xi)
    //   · denominator needed in step 10 and 11 of the verifier
    //   · denominator needed in the verifier when computing L_i^{S1}(X) and L_i^{S2}(X)
    //   · L_i i=1 to num public inputs, needed in step 6 and 7 of the verifier to compute L_1(xi) and PI(xi)

    let challenges = {};

    let proof = new Proof(curve, logger);

    let committedPols = {};

    if (logger) logger.info("> Reading polynomial stage 0");
    const polsStage0 = zkey.f.filter(fi => fi.stages[0].stage === 0);
    let zkeyFiSection = ZKEY_FF_F0_SECTION;
    for(let i = 0; i < polsStage0.length; ++i) {
        const deg = polsStage0[i].degree + 1;
        polynomials[`f${polsStage0[i].index}`] = new Polynomial(new BigBuffer(deg * sFr), curve, logger);
        await fdZKey.readToBuffer(polynomials[`f${polsStage0[i].index}`].coef, 0, deg * sFr, zkeySections[zkeyFiSection++][0].p);
    
        committedPols[`f${polsStage0[i].index}_0`] = {commit: zkey[`f${polsStage0[i].index}`], pol: polynomials[`f${polsStage0[i].index}`]};
    }

    if (logger) logger.info(`> Reading Section ${ZKEY_FF_ADDITIONS_SECTION}. Additions`);
    await calculateAdditions();

    if (logger) logger.info(`> Reading Sections ${ZKEY_FF_SIGMA1_SECTION},${ZKEY_FF_SIGMA2_SECTION},${ZKEY_FF_SIGMA3_SECTION}. Sigma1, Sigma2 & Sigma 3`);
    if (logger) logger.info("··· Reading Sigma polynomials ");
    polynomials.Sigma1 = new Polynomial(new BigBuffer(sDomain), curve, logger);
    polynomials.Sigma2 = new Polynomial(new BigBuffer(sDomain), curve, logger);
    polynomials.Sigma3 = new Polynomial(new BigBuffer(sDomain), curve, logger);

    await fdZKey.readToBuffer(polynomials.Sigma1.coef, 0, sDomain, zkeySections[ZKEY_FF_SIGMA1_SECTION][0].p);
    await fdZKey.readToBuffer(polynomials.Sigma2.coef, 0, sDomain, zkeySections[ZKEY_FF_SIGMA2_SECTION][0].p);
    await fdZKey.readToBuffer(polynomials.Sigma3.coef, 0, sDomain, zkeySections[ZKEY_FF_SIGMA3_SECTION][0].p);

    // Reserve memory for Q's polynomials
    if (logger) logger.info(`> Reading Sections ${ZKEY_FF_QL_SECTION},${ZKEY_FF_QR_SECTION},${ZKEY_FF_QM_SECTION}, ${ZKEY_FF_QO_SECTION}, ${ZKEY_FF_QC_SECTION}. QL, QR, QM, QO & QC`);
    if (logger) logger.info("··· Reading Q polynomials ");
    polynomials.QL = new Polynomial(new BigBuffer(sDomain), curve, logger);
    polynomials.QR = new Polynomial(new BigBuffer(sDomain), curve, logger);
    polynomials.QM = new Polynomial(new BigBuffer(sDomain), curve, logger);
    polynomials.QO = new Polynomial(new BigBuffer(sDomain), curve, logger);
    polynomials.QC = new Polynomial(new BigBuffer(sDomain), curve, logger);

    // Read Q's evaluations from zkey file
    await fdZKey.readToBuffer(polynomials.QL.coef, 0, sDomain, zkeySections[ZKEY_FF_QL_SECTION][0].p);
    await fdZKey.readToBuffer(polynomials.QR.coef, 0, sDomain, zkeySections[ZKEY_FF_QR_SECTION][0].p);
    await fdZKey.readToBuffer(polynomials.QM.coef, 0, sDomain, zkeySections[ZKEY_FF_QM_SECTION][0].p);
    await fdZKey.readToBuffer(polynomials.QO.coef, 0, sDomain, zkeySections[ZKEY_FF_QO_SECTION][0].p);
    await fdZKey.readToBuffer(polynomials.QC.coef, 0, sDomain, zkeySections[ZKEY_FF_QC_SECTION][0].p);
    
    if (logger) logger.info("··· Reading Sigma evaluations");
    evaluations.Sigma1 = new Evaluations(new BigBuffer(sDomain * 4), curve, logger);
    evaluations.Sigma2 = new Evaluations(new BigBuffer(sDomain * 4), curve, logger);
    evaluations.Sigma3 = new Evaluations(new BigBuffer(sDomain * 4), curve, logger);

    await fdZKey.readToBuffer(evaluations.Sigma1.eval, 0, sDomain * 4, zkeySections[ZKEY_FF_SIGMA1_SECTION][0].p + sDomain);
    await fdZKey.readToBuffer(evaluations.Sigma2.eval, 0, sDomain * 4, zkeySections[ZKEY_FF_SIGMA2_SECTION][0].p + sDomain);
    await fdZKey.readToBuffer(evaluations.Sigma3.eval, 0, sDomain * 4, zkeySections[ZKEY_FF_SIGMA3_SECTION][0].p + sDomain);

    if (logger) logger.info(`> Reading Section ${ZKEY_FF_PTAU_SECTION}. Powers of Tau`);

    const maxFiDegree = Math.max(...zkey.f.map(fi => fi.degree));

    const nDomainSize = Math.ceil(maxFiDegree / Math.pow(2, zkey.power));
    const pow2DomainSize = Math.pow(2, Math.ceil(Math.log2(nDomainSize)));
    const PTau = new BigBuffer(zkey.domainSize * pow2DomainSize * sG1);
    await fdZKey.readToBuffer(PTau, 0, (maxFiDegree + 1) * sG1, zkeySections[ZKEY_FF_PTAU_SECTION][0].p);

    // START FFLONK PROVER PROTOCOL
    if (globalThis.gc) globalThis.gc();

    // ROUND 1. Compute stage 1 commit polynomials
    if (logger) logger.info("");
    if (logger) logger.info("> ROUND 1");
    await round1();

    delete evaluations.QL;
    delete evaluations.QR;
    delete evaluations.QM;
    delete evaluations.QO;
    delete evaluations.QC;
    if (globalThis.gc) globalThis.gc();

    // ROUND 2. Compute stage 2 commit polynomials
    if (logger) logger.info("> ROUND 2");
    await round2();

    delete buffers.A;
    delete buffers.B;
    delete buffers.C;
    delete evaluations.A;
    delete evaluations.B;
    delete evaluations.C;
    delete evaluations.Sigma1;
    delete evaluations.Sigma2;
    delete evaluations.Sigma3;
    delete evaluations.lagrange1;
    delete evaluations.Z;
    if (globalThis.gc) globalThis.gc();

    // ROUND 3. Compute opening evaluations
    if (logger) logger.info("> ROUND 3");
    const [commits, evals] = await open(zkey, PTau, polynomials, committedPols, curve, logger);
    
    for(let i = 0; i < Object.keys(evals).length; ++i) {
        const key = Object.keys(evals)[i];
        if(!["T0", "T1", "T2"].includes(key)) {
            proof.addEvaluation(key, evals[key]);
        }
    }

    proof.addPolynomial("W", commits.W);
    proof.addPolynomial("Wp", commits.Wp);
    for(let i = 0; i < Object.keys(commits).length; ++i) {
        const key = Object.keys(commits)[i];
        const fi = zkey.f.find(fi => key === `f${fi.index}`);
        if(fi && (fi.stages.length !== 1 || fi.stages[0].stage !== 0)) {
            proof.addPolynomial(key, commits[key]);

        }
    }
    
    delete polynomials.A;
    delete polynomials.B;
    delete polynomials.C;
    delete polynomials.Z;
    delete polynomials.T0;
    delete polynomials.T1;
    delete polynomials.T2;
    delete polynomials.Sigma1;
    delete polynomials.Sigma2;
    delete polynomials.Sigma3;
    delete polynomials.QL;
    delete polynomials.QR;
    delete polynomials.QM;
    delete polynomials.QC;
    delete polynomials.QO;
    if (globalThis.gc) globalThis.gc();

    // Prepare proof
    let _proof = proof.toObjectProof();
    _proof.protocol = "fflonk";
    _proof.curve = curve.name;

    // Prepare public inputs
    let publicSignals = [];

    for (let i = 1; i <= zkey.nPublic; i++) {
        const i_sFr = i * sFr;

        const pub = buffWitness.slice(i_sFr, i_sFr + sFr);
        publicSignals.push(Scalar.fromRprLE(pub));
    }

    if (logger) logger.info("FFLONK PROVER FINISHED");

    return {
        proof: stringifyBigInts(_proof),
        publicSignals: stringifyBigInts(publicSignals)
    };

    async function calculateAdditions() {
        if (logger) logger.info("··· Computing additions");
        const additionsBuff = await binFileUtils.readSection(fdZKey, zkeySections, ZKEY_FF_ADDITIONS_SECTION);

        // sizes: wireId_x = 4 bytes (32 bits), factor_x = field size bits
        // Addition form: wireId_a wireId_b factor_a factor_b (size is 4 + 4 + sFr + sFr)
        const sSum = 8 + sFr * 2;

        for (let i = 0; i < zkey.nAdditions; i++) {
            if (logger && (0 !== i) && (i % 100000 === 0)) logger.info(`    addition ${i}/${zkey.nAdditions}`);

            // Read addition values
            let offset = i * sSum;
            const signalId1 = readUInt32(additionsBuff, offset);
            offset += 4;
            const signalId2 = readUInt32(additionsBuff, offset);
            offset += 4;
            const factor1 = additionsBuff.slice(offset, offset + sFr);
            offset += sFr;
            const factor2 = additionsBuff.slice(offset, offset + sFr);

            // Get witness value
            const witness1 = getWitness(signalId1);
            const witness2 = getWitness(signalId2);

            //Calculate final result
            const result = Fr.add(Fr.mul(factor1, witness1), Fr.mul(factor2, witness2));

            buffInternalWitness.set(result, sFr * i);
        }
    }

    function readUInt32(b, o) {
        const buff = b.slice(o, o + 4);
        const buffV = new DataView(buff.buffer, buff.byteOffset, buff.byteLength);
        return buffV.getUint32(0, true);
    }

    function getWitness(idx) {
        let diff = zkey.nVars - zkey.nAdditions;
        if (idx < diff) {
            return buffWitness.slice(idx * sFr, idx * sFr + sFr);
        } else if (idx < zkey.nVars) {
            const offset = (idx - diff) * sFr;
            return buffInternalWitness.slice(offset, offset + sFr);
        }

        return Fr.zero;
    }

    async function round1() {
        // STEP 1.1 - Generate random blinding scalars (b_1, ..., b9) ∈ F
        challenges.b = [];
        for (let i = 1; i <= 9; i++) {
            challenges.b[i] = Fr.random();
        }

        // STEP 1.2 - Compute wire polynomials a(X), b(X) and c(X)
        if (logger) logger.info("> Computing A, B, C wire polynomials");
        await computeWirePolynomials();

        // STEP 1.3 - Compute the quotient polynomial T0(X)
        if (logger) logger.info("> Computing T0 polynomial");
        await computeT0();

        // STEP 1.4 - Compute the FFT-style combination polynomial stage 1 commit polynomials
        if (logger) logger.info("> Computing Stage 1 commit polynomials");
        await computeStage1Commits();

        return 0;

        async function computeWirePolynomials() {
            if (logger) logger.info("··· Reading data from zkey file");
            // Build A, B and C evaluations buffer from zkey and witness files
            buffers.A = new BigBuffer(sDomain);
            buffers.B = new BigBuffer(sDomain);
            buffers.C = new BigBuffer(sDomain);

            // Read zkey sections and fill the buffers
            const aMapBuff = await binFileUtils.readSection(fdZKey, zkeySections, ZKEY_FF_A_MAP_SECTION);
            const bMapBuff = await binFileUtils.readSection(fdZKey, zkeySections, ZKEY_FF_B_MAP_SECTION);
            const cMapBuff = await binFileUtils.readSection(fdZKey, zkeySections, ZKEY_FF_C_MAP_SECTION);

            // Compute all witness from signal ids and set them to A,B & C buffers
            for (let i = 0; i < zkey.nConstraints; i++) {
                const i_sFr = i * sFr;
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

            // Blind a(X), b(X) and c(X) polynomials coefficients with blinding scalars b
            buffers.A.set(challenges.b[1], sDomain - 64);
            buffers.A.set(challenges.b[2], sDomain - 32);
            buffers.B.set(challenges.b[3], sDomain - 64);
            buffers.B.set(challenges.b[4], sDomain - 32);
            buffers.C.set(challenges.b[5], sDomain - 64);
            buffers.C.set(challenges.b[6], sDomain - 32);

            buffers.A = await Fr.batchToMontgomery(buffers.A);
            buffers.B = await Fr.batchToMontgomery(buffers.B);
            buffers.C = await Fr.batchToMontgomery(buffers.C);

            // Compute the coefficients of the wire polynomials a(X), b(X) and c(X) from A,B & C buffers
            if (logger) logger.info("··· Computing A ifft");
            polynomials.A = await Polynomial.fromEvaluations(buffers.A, curve, logger);
            if (logger) logger.info("··· Computing B ifft");
            polynomials.B = await Polynomial.fromEvaluations(buffers.B, curve, logger);
            if (logger) logger.info("··· Computing C ifft");
            polynomials.C = await Polynomial.fromEvaluations(buffers.C, curve, logger);

            // Compute extended evaluations of a(X), b(X) and c(X) polynomials
            if (logger) logger.info("··· Computing A fft");
            evaluations.A = await Evaluations.fromPolynomial(polynomials.A, 4, curve, logger);
            if (logger) logger.info("··· Computing B fft");
            evaluations.B = await Evaluations.fromPolynomial(polynomials.B, 4, curve, logger);
            if (logger) logger.info("··· Computing C fft");
            evaluations.C = await Evaluations.fromPolynomial(polynomials.C, 4, curve, logger);

            // Check degrees
            if (polynomials.A.degree() >= zkey.domainSize) {
                throw new Error("A Polynomial is not well calculated");
            }
            if (polynomials.B.degree() >= zkey.domainSize) {
                throw new Error("B Polynomial is not well calculated");
            }
            if (polynomials.C.degree() >= zkey.domainSize) {
                throw new Error("C Polynomial is not well calculated");
            }
        }

        async function computeT0() {
            if (logger) logger.info(`··· Reading sections ${ZKEY_FF_QL_SECTION}, ${ZKEY_FF_QR_SECTION}` +
                `, ${ZKEY_FF_QM_SECTION}, ${ZKEY_FF_QO_SECTION}, ${ZKEY_FF_QC_SECTION}. Q selectors`);
            // Reserve memory for Q's evaluations
            evaluations.QL = new Evaluations(new BigBuffer(sDomain * 4), curve, logger);
            evaluations.QR = new Evaluations(new BigBuffer(sDomain * 4), curve, logger);
            evaluations.QM = new Evaluations(new BigBuffer(sDomain * 4), curve, logger);
            evaluations.QO = new Evaluations(new BigBuffer(sDomain * 4), curve, logger);
            evaluations.QC = new Evaluations(new BigBuffer(sDomain * 4), curve, logger);

            // Read Q's evaluations from zkey file
            await fdZKey.readToBuffer(evaluations.QL.eval, 0, sDomain * 4, zkeySections[ZKEY_FF_QL_SECTION][0].p + sDomain);
            await fdZKey.readToBuffer(evaluations.QR.eval, 0, sDomain * 4, zkeySections[ZKEY_FF_QR_SECTION][0].p + sDomain);
            await fdZKey.readToBuffer(evaluations.QM.eval, 0, sDomain * 4, zkeySections[ZKEY_FF_QM_SECTION][0].p + sDomain);
            await fdZKey.readToBuffer(evaluations.QO.eval, 0, sDomain * 4, zkeySections[ZKEY_FF_QO_SECTION][0].p + sDomain);
            await fdZKey.readToBuffer(evaluations.QC.eval, 0, sDomain * 4, zkeySections[ZKEY_FF_QC_SECTION][0].p + sDomain);

            // Read Lagrange polynomials & evaluations from zkey file
            const lagrangePolynomials = await binFileUtils.readSection(fdZKey, zkeySections, ZKEY_FF_LAGRANGE_SECTION);
            evaluations.lagrange1 = new Evaluations(lagrangePolynomials, curve, logger);

            // Reserve memory for buffers T0
            buffers.T0 = new BigBuffer(sDomain * 4);

            if (logger) logger.info("··· Computing T0 evaluations");
            for (let i = 0; i < zkey.domainSize * 4; i++) {
                if (logger && (0 !== i) && (i % 100000 === 0)) logger.info(`      T0 evaluation ${i}/${zkey.domainSize * 4}`);

                // Get related evaluations to compute current T0 evaluation
                const a = evaluations.A.getEvaluation(i);
                const b = evaluations.B.getEvaluation(i);
                const c = evaluations.C.getEvaluation(i);

                const ql = evaluations.QL.getEvaluation(i);
                const qr = evaluations.QR.getEvaluation(i);
                const qm = evaluations.QM.getEvaluation(i);
                const qo = evaluations.QO.getEvaluation(i);
                const qc = evaluations.QC.getEvaluation(i);

                // Compute current public input
                let pi = Fr.zero;
                for (let j = 0; j < zkey.nPublic; j++) {
                    const offset = (j * 5 * zkey.domainSize) + zkey.domainSize + i;

                    const lPol = evaluations.lagrange1.getEvaluation(offset);
                    const aVal = buffers.A.slice(j * sFr, (j + 1) * sFr);

                    pi = Fr.sub(pi, Fr.mul(lPol, aVal));
                }

                //T0(X) = [q_L(X)·a(X) + q_R(X)·b(X) + q_M(X)·a(X)·b(X) + q_O(X)·c(X) + q_C(X) + PI(X)] · 1/Z_H(X)
                // Compute first T0(X)·Z_H(X), so divide later the resulting polynomial by Z_H(X)
                // expression 1 -> q_L(X)·a(X)
                const e1 = Fr.mul(a, ql);

                // expression 2 -> q_R(X)·b(X)
                const e2 = Fr.mul(b, qr);

                // expression 3 -> q_M(X)·a(X)·b(X)
                const e3 = Fr.mul(Fr.mul(a, b), qm);

                // expression 4 -> q_O(X)·c(X)
                const e4 = Fr.mul(c, qo);

                // t0 = expressions 1 + expression 2 + expression 3 + expression 4 + qc + pi
                const t0 = Fr.add(e1, Fr.add(e2, Fr.add(e3, Fr.add(e4, Fr.add(qc, pi)))));

                buffers.T0.set(t0, i * sFr);
            }

            if (logger) logger.info("buffer T0: " + buffers.T0.byteLength / sFr);

            // Compute the coefficients of the polynomial T0(X) from buffers.T0
            if (logger) logger.info("··· Computing T0 ifft");
            polynomials.T0 = await Polynomial.fromEvaluations(buffers.T0, curve, logger);

            if (logger) logger.info("T0 length: " + polynomials.T0.length());
            if (logger) logger.info("T0 degree: " + polynomials.T0.degree());

            // Divide the polynomial T0 by Z_H(X)
            if (logger) logger.info("··· Computing T0 / ZH");
            polynomials.T0.divByZerofier(zkey.domainSize, Fr.one);

            // Check degree
            if (polynomials.T0.degree() >= 2 * zkey.domainSize - 2) {
                throw new Error(`T0 Polynomial is not well calculated (degree is ${polynomials.T0.degree()} and must be less than ${2 * zkey.domainSize + 2}`);
            }

            delete buffers.T0;
        }

        async function computeStage1Commits() {
            const commits = await commit(1, zkey, polynomials, PTau, true, curve, logger);
            
            for(let j = 0; j < commits.length; ++j) {
                committedPols[`${commits[j].index}`] = {commit: commits[j].commit, pol: commits[j].pol};
            }
        }
    }

    async function round2() {
        // STEP 2.1 - Compute permutation challenge beta and gamma ∈ F
        // Compute permutation challenge beta
        if (logger) logger.info("> Computing challenges beta and gamma");
        const transcript = new Keccak256Transcript(curve);

        // Add stage 0 commits to the transcript
        const commitsStage0 = zkey.f.filter(fi => fi.stages[0].stage === 0);
        for(let i = 0; i < commitsStage0.length; ++i) {
            transcript.addPolCommitment(committedPols[`f${commitsStage0[i].index}_0`].commit);
        }

        // Add A to the transcript
        for (let i = 0; i < zkey.nPublic; i++) {
            transcript.addScalar(buffers.A.slice(i * sFr, i * sFr + sFr));
        }

        // Add stage 1 commits to the transcript
        const commitsStage1 = zkey.f.filter(fi => fi.stages[0].stage === 1);
        for(let i = 0; i < commitsStage1.length; ++i) {
            transcript.addPolCommitment(committedPols[`f${commitsStage1[i].index}_1`].commit);
        }

        challenges.beta = transcript.getChallenge();
        if (logger) logger.info("··· challenges.beta: " + Fr.toString(challenges.beta));

        // Compute permutation challenge gamma
        transcript.reset();
        transcript.addScalar(challenges.beta);
        challenges.gamma = transcript.getChallenge();
        if (logger) logger.info("··· challenges.gamma: " + Fr.toString(challenges.gamma));

        // STEP 2.2 - Compute permutation polynomial z(X)
        if (logger) logger.info("> Computing Z polynomial");
        await computeZ();

        // STEP 2.3 - Compute quotient polynomial T1(X) and T2(X)
        if (logger) logger.info("> Computing T1 polynomial");
        await computeT1();
        if (logger) logger.info("> Computing T2 polynomial");
        await computeT2();

        // STEP 2.4 - Compute the FFT-style combination polynomial for stage 2
        if (logger) logger.info("> Computing Stage 2 commit polynomial");
        await computeStage2Commits();

        return 0;

        async function computeZ() {
            if (logger) logger.info("··· Computing Z evaluations");

            let numArr = new BigBuffer(sDomain);
            let denArr = new BigBuffer(sDomain);

            // Set the first values to 1
            numArr.set(Fr.one, 0);
            denArr.set(Fr.one, 0);

            // Set initial omega
            let w = Fr.one;
            for (let i = 0; i < zkey.domainSize; i++) {
                if (logger && (0 !== i) && (i % 100000 === 0)) logger.info(`    Z evaluation ${i}/${zkey.domainSize}`);
                const i_sFr = i * sFr;

                // Z(X) := numArr / denArr
                // numArr := (a + beta·ω + gamma)(b + beta·ω·k1 + gamma)(c + beta·ω·k2 + gamma)
                const betaw = Fr.mul(challenges.beta, w);

                let num1 = buffers.A.slice(i_sFr, i_sFr + sFr);
                num1 = Fr.add(num1, betaw);
                num1 = Fr.add(num1, challenges.gamma);

                let num2 = buffers.B.slice(i_sFr, i_sFr + sFr);
                num2 = Fr.add(num2, Fr.mul(zkey.k1, betaw));
                num2 = Fr.add(num2, challenges.gamma);

                let num3 = buffers.C.slice(i_sFr, i_sFr + sFr);
                num3 = Fr.add(num3, Fr.mul(zkey.k2, betaw));
                num3 = Fr.add(num3, challenges.gamma);

                let num = Fr.mul(num1, Fr.mul(num2, num3));

                // denArr := (a + beta·sigma1 + gamma)(b + beta·sigma2 + gamma)(c + beta·sigma3 + gamma)
                let den1 = buffers.A.slice(i_sFr, i_sFr + sFr);
                den1 = Fr.add(den1, Fr.mul(challenges.beta, evaluations.Sigma1.getEvaluation(i * 4)));
                den1 = Fr.add(den1, challenges.gamma);

                let den2 = buffers.B.slice(i_sFr, i_sFr + sFr);
                den2 = Fr.add(den2, Fr.mul(challenges.beta, evaluations.Sigma2.getEvaluation(i * 4)));
                den2 = Fr.add(den2, challenges.gamma);

                let den3 = buffers.C.slice(i_sFr, i_sFr + sFr);
                den3 = Fr.add(den3, Fr.mul(challenges.beta, evaluations.Sigma3.getEvaluation(i * 4)));
                den3 = Fr.add(den3, challenges.gamma);

                let den = Fr.mul(den1, Fr.mul(den2, den3));

                // Multiply current num value with the previous one saved in numArr
                num = Fr.mul(numArr.slice(i_sFr, i_sFr + sFr), num);
                numArr.set(num, ((i + 1) % zkey.domainSize) * sFr);

                // Multiply current den value with the previous one saved in denArr
                den = Fr.mul(denArr.slice(i_sFr, i_sFr + sFr), den);
                denArr.set(den, ((i + 1) % zkey.domainSize) * sFr);

                // Next omega
                w = Fr.mul(w, Fr.w[zkey.power]);
            }
            // Compute the inverse of denArr to compute in the next command the
            // division numArr/denArr by multiplying num · 1/denArr
            denArr = await Fr.batchInverse(denArr);

            // TODO: Do it in assembly and in parallel
            // Multiply numArr · denArr where denArr was inverted in the previous command
            for (let i = 0; i < zkey.domainSize; i++) {
                const i_sFr = i * sFr;

                const z = Fr.mul(numArr.slice(i_sFr, i_sFr + sFr), denArr.slice(i_sFr, i_sFr + sFr));
                numArr.set(z, i_sFr);
            }
            // From now on the values saved on numArr will be Z(X) buffer
            buffers.Z = numArr;

            if (!Fr.eq(numArr.slice(0, sFr), Fr.one)) {
                throw new Error("Copy constraints does not match");
            }

            // Compute polynomial coefficients z(X) from buffers.Z
            if (logger) logger.info("··· Computing Z ifft");
            polynomials.Z = await Polynomial.fromEvaluations(buffers.Z, curve, logger);

            // Compute extended evaluations of z(X) polynomial
            if (logger) logger.info("··· Computing Z fft");
            evaluations.Z = await Evaluations.fromPolynomial(polynomials.Z, 4, curve, logger);

            // Blind z(X) polynomial coefficients with blinding scalars b
            polynomials.Z.blindCoefficients([challenges.b[9], challenges.b[8], challenges.b[7]]);

            // Check degree
            if (polynomials.Z.degree() >= zkey.domainSize + 3) {
                throw new Error("Z Polynomial is not well calculated");
            }

            delete buffers.Z;
        }

        async function computeT1() {
            if (logger) logger.info("··· Computing T1 evaluations");

            buffers.T1 = new BigBuffer(sDomain * 2);
            buffers.T1z = new BigBuffer(sDomain * 2);

            // Set initial omega
            let omega = Fr.one;
            for (let i = 0; i < zkey.domainSize * 2; i++) {
                if (logger && (0 !== i) && (i % 100000 === 0)) logger.info(`    T1 evaluation ${i}/${zkey.domainSize * 4}`);

                const omega2 = Fr.square(omega);

                const z = evaluations.Z.getEvaluation(i * 2);
                const zp = Fr.add(Fr.add(Fr.mul(challenges.b[7], omega2), Fr.mul(challenges.b[8], omega)), challenges.b[9]);

                // T1(X) := (z(X) - 1) · L_1(X)
                // Compute first T1(X)·Z_H(X), so divide later the resulting polynomial by Z_H(X)
                const lagrange1 = evaluations.lagrange1.getEvaluation(zkey.domainSize + i * 2);
                let t1 = Fr.mul(Fr.sub(z, Fr.one), lagrange1);
                let t1z = Fr.mul(zp, lagrange1);

                buffers.T1.set(t1, i * sFr);
                buffers.T1z.set(t1z, i * sFr);

                // Compute next omega
                omega = Fr.mul(omega, Fr.w[zkey.power + 1]);
            }

            // Compute the coefficients of the polynomial T1(X) from buffers.T1
            if (logger) logger.info("··· Computing T1 ifft");
            polynomials.T1 = await Polynomial.fromEvaluations(buffers.T1, curve, logger);

            // Divide the polynomial T1 by Z_H(X)
            polynomials.T1.divByZerofier(zkey.domainSize, Fr.one);

            // Compute the coefficients of the polynomial T1z(X) from buffers.T1z
            if (logger) logger.info("··· Computing T1z ifft");
            polynomials.T1z = await Polynomial.fromEvaluations(buffers.T1z, curve, logger);

            // Add the polynomial T1z to T1 to get the final polynomial T1
            polynomials.T1.add(polynomials.T1z);

            // Check degree
            if (polynomials.T1.degree() >= zkey.domainSize + 2) {
                throw new Error("T1 Polynomial is not well calculated");
            }

            delete buffers.T1;
            delete buffers.T1z;
            delete polynomials.T1z;
        }

        async function computeT2() {
            if (logger) logger.info("··· Computing T2 evaluations");

            buffers.T2 = new BigBuffer(sDomain * 4);
            buffers.T2z = new BigBuffer(sDomain * 4);

            // Set initial omega
            let omega = Fr.one;
            for (let i = 0; i < zkey.domainSize * 4; i++) {
                if (logger && (0 !== i) && (i % 100000 === 0)) logger.info(`    T2 evaluation ${i}/${zkey.domainSize * 4}`);

                const omega2 = Fr.square(omega);
                const omegaW = Fr.mul(omega, Fr.w[zkey.power]);
                const omegaW2 = Fr.square(omegaW);

                const a = evaluations.A.getEvaluation(i);
                const b = evaluations.B.getEvaluation(i);
                const c = evaluations.C.getEvaluation(i);
                const z = evaluations.Z.getEvaluation(i);
                const zW = evaluations.Z.getEvaluation((zkey.domainSize * 4 + 4 + i) % (zkey.domainSize * 4));

                const zp = Fr.add(Fr.add(Fr.mul(challenges.b[7], omega2), Fr.mul(challenges.b[8], omega)), challenges.b[9]);
                const zWp = Fr.add(Fr.add(Fr.mul(challenges.b[7], omegaW2), Fr.mul(challenges.b[8], omegaW)), challenges.b[9]);

                const sigma1 = evaluations.Sigma1.getEvaluation(i);
                const sigma2 = evaluations.Sigma2.getEvaluation(i);
                const sigma3 = evaluations.Sigma3.getEvaluation(i);

                // T2(X) := [ (a(X) + beta·X + gamma)(b(X) + beta·k1·X + gamma)(c(X) + beta·k2·X + gamma)z(X)
                //           -(a(X) + beta·sigma1(X) + gamma)(b(X) + beta·sigma2(X) + gamma)(c(X) + beta·sigma3(X) + gamma)z(Xω)] · 1/Z_H(X)
                // Compute first T2(X)·Z_H(X), so divide later the resulting polynomial by Z_H(X)

                // expression 1 -> (a(X) + beta·X + gamma)(b(X) + beta·k1·X + gamma)(c(X) + beta·k2·X + gamma)z(X)
                const betaX = Fr.mul(challenges.beta, omega);

                let e11 = Fr.add(a, betaX);
                e11 = Fr.add(e11, challenges.gamma);

                let e12 = Fr.add(b, Fr.mul(betaX, zkey.k1));
                e12 = Fr.add(e12, challenges.gamma);

                let e13 = Fr.add(c, Fr.mul(betaX, zkey.k2));
                e13 = Fr.add(e13, challenges.gamma);

                let e1 = Fr.mul(Fr.mul(Fr.mul(e11, e12), e13), z);
                let e1z = Fr.mul(Fr.mul(Fr.mul(e11, e12), e13), zp);
                // const [e1, e1z] = MulZ.mul4(e11, e12, e13, z, ap, bp, cp, zp, i % 4, Fr);

                // expression 2 -> (a(X) + beta·sigma1(X) + gamma)(b(X) + beta·sigma2(X) + gamma)(c(X) + beta·sigma3(X) + gamma)z(Xω)
                let e21 = Fr.add(a, Fr.mul(challenges.beta, sigma1));
                e21 = Fr.add(e21, challenges.gamma);

                let e22 = Fr.add(b, Fr.mul(challenges.beta, sigma2));
                e22 = Fr.add(e22, challenges.gamma);

                let e23 = Fr.add(c, Fr.mul(challenges.beta, sigma3));
                e23 = Fr.add(e23, challenges.gamma);

                let e2 = Fr.mul(Fr.mul(Fr.mul(e21, e22), e23), zW);
                let e2z = Fr.mul(Fr.mul(Fr.mul(e21, e22), e23), zWp);
                // const [e2, e2z] = MulZ.mul4(e21, e22, e23, zW, ap, bp, cp, zWp, i % 4, Fr);

                let t2 = Fr.sub(e1, e2);
                let t2z = Fr.sub(e1z, e2z);

                buffers.T2.set(t2, i * sFr);
                buffers.T2z.set(t2z, i * sFr);

                // Compute next omega
                omega = Fr.mul(omega, Fr.w[zkey.power + 2]);
            }

            // Compute the coefficients of the polynomial T2(X) from buffers.T2
            if (logger) logger.info("··· Computing T2 ifft");
            polynomials.T2 = await Polynomial.fromEvaluations(buffers.T2, curve, logger);

            // Divide the polynomial T2 by Z_H(X)
            if (logger) logger.info("··· Computing T2 / ZH");
            polynomials.T2.divByZerofier(zkey.domainSize, Fr.one);

            // Compute the coefficients of the polynomial T2z(X) from buffers.T2z
            if (logger) logger.info("··· Computing T2z ifft");
            polynomials.T2z = await Polynomial.fromEvaluations(buffers.T2z, curve, logger);

            // Add the polynomial T2z to T2 to get the final polynomial T2
            polynomials.T2.add(polynomials.T2z);

            // Check degree
            if (polynomials.T2.degree() >= 3 * zkey.domainSize) {
                throw new Error("T2 Polynomial is not well calculated");
            }

            delete buffers.T2;
            delete buffers.T2z;
            delete polynomials.T2z;
        }

        async function computeStage2Commits() {
            const commits = await commit(2, zkey, polynomials, PTau, true, curve, logger);
        
            for(let j = 0; j < commits.length; ++j) {
                committedPols[`${commits[j].index}`] = {commit: commits[j].commit, pol: commits[j].pol};
            }
            
        }
    }
}
