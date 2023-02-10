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
import {BigBuffer, Scalar, utils} from "ffjavascript";
import {FFLONK_PROTOCOL_ID} from "./zkey_constants.js";
import {
    ZKEY_FF_A_MAP_SECTION,
    ZKEY_FF_ADDITIONS_SECTION,
    ZKEY_FF_B_MAP_SECTION,
    ZKEY_FF_C0_SECTION,
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
import {Keccak256Transcript} from "./Keccak256Transcript.js";
import {Proof} from "./proof.js";
import {Polynomial} from "./polynomial/polynomial.js";
import {Evaluations} from "./polynomial/evaluations.js";
import {MulZ} from "./mul_z.js";
import {CPolynomial} from "./polynomial/cpolynomial.js";

const {stringifyBigInts} = utils;


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
    let toInverse = {};

    let challenges = {};
    let roots = {};

    let proof = new Proof(curve, logger);

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

    if (logger) logger.info("··· Reading Sigma evaluations");
    evaluations.Sigma1 = new Evaluations(new BigBuffer(sDomain * 4), curve, logger);
    evaluations.Sigma2 = new Evaluations(new BigBuffer(sDomain * 4), curve, logger);
    evaluations.Sigma3 = new Evaluations(new BigBuffer(sDomain * 4), curve, logger);

    await fdZKey.readToBuffer(evaluations.Sigma1.eval, 0, sDomain * 4, zkeySections[ZKEY_FF_SIGMA1_SECTION][0].p + sDomain);
    await fdZKey.readToBuffer(evaluations.Sigma2.eval, 0, sDomain * 4, zkeySections[ZKEY_FF_SIGMA2_SECTION][0].p + sDomain);
    await fdZKey.readToBuffer(evaluations.Sigma3.eval, 0, sDomain * 4, zkeySections[ZKEY_FF_SIGMA3_SECTION][0].p + sDomain);

    if (logger) logger.info(`> Reading Section ${ZKEY_FF_PTAU_SECTION}. Powers of Tau`);
    const PTau = new BigBuffer(zkey.domainSize * 16 * sG1);
    // domainSize * 9 + 18 = SRS length in the zkey saved in setup process.
    // it corresponds to the maximum SRS length needed, specifically to commit C2
    // notice that the reserved buffers size is zkey.domainSize * 16 * sG1 because a power of two buffer size is needed
    // the remaining buffer not filled from SRS are set to 0
    await fdZKey.readToBuffer(PTau, 0, (zkey.domainSize * 9 + 18) * sG1, zkeySections[ZKEY_FF_PTAU_SECTION][0].p);

    // START FFLONK PROVER PROTOCOL
    if (globalThis.gc) globalThis.gc();

    // ROUND 1. Compute C1(X) polynomial
    if (logger) logger.info("");
    if (logger) logger.info("> ROUND 1");
    await round1();

    delete polynomials.T0;
    delete evaluations.QL;
    delete evaluations.QR;
    delete evaluations.QM;
    delete evaluations.QO;
    delete evaluations.QC;
    if (globalThis.gc) globalThis.gc();

    // ROUND 2. Compute C2(X) polynomial
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
    await round3();

    delete polynomials.A;
    delete polynomials.B;
    delete polynomials.C;
    delete polynomials.Z;
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

    // ROUND 4. Compute W(X) polynomial
    if (logger) logger.info("> ROUND 4");
    await round4();
    if (globalThis.gc) globalThis.gc();

    // ROUND 5. Compute W'(X) polynomial
    if (logger) logger.info("> ROUND 5");
    await round5();

    delete polynomials.C0;
    delete polynomials.C1;
    delete polynomials.C2;
    delete polynomials.R1;
    delete polynomials.R2;
    delete polynomials.F;
    delete polynomials.L;
    delete polynomials.ZT;
    delete polynomials.ZTS2;
    await fdZKey.close();
    if (globalThis.gc) globalThis.gc();

    proof.addEvaluation("inv", getMontgomeryBatchedInverse());

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

        // STEP 1.4 - Compute the FFT-style combination polynomial C1(X)
        if (logger) logger.info("> Computing C1 polynomial");
        await computeC1();

        // The first output of the prover is ([C1]_1)
        if (logger) logger.info("> Computing C1 multi exponentiation");
        let commitC1 = await polynomials.C1.multiExponentiation(PTau, "C1");
        proof.addPolynomial("C1", commitC1);

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

            // Reserve memory for buffers T0 and T0z
            buffers.T0 = new BigBuffer(sDomain * 4);
            buffers.T0z = new BigBuffer(sDomain * 4);

            if (logger) logger.info("··· Computing T0 evaluations");
            // Initial omega
            let omega = Fr.one;
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

                // Compute blinding factors
                const az = Fr.add(Fr.mul(challenges.b[1], omega), challenges.b[2]);
                const bz = Fr.add(Fr.mul(challenges.b[3], omega), challenges.b[4]);
                const cz = Fr.add(Fr.mul(challenges.b[5], omega), challenges.b[6]);

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
                const e1z = Fr.mul(az, ql);

                // expression 2 -> q_R(X)·b(X)
                const e2 = Fr.mul(b, qr);
                const e2z = Fr.mul(bz, qr);

                // expression 3 -> q_M(X)·a(X)·b(X)
                let [e3, e3z] = MulZ.mul2(a, b, az, bz, i % 4, Fr);
                e3 = Fr.mul(e3, qm);
                e3z = Fr.mul(e3z, qm);

                // expression 4 -> q_O(X)·c(X)
                const e4 = Fr.mul(c, qo);
                const e4z = Fr.mul(cz, qo);

                // t0 = expressions 1 + expression 2 + expression 3 + expression 4 + qc + pi
                const t0 = Fr.add(e1, Fr.add(e2, Fr.add(e3, Fr.add(e4, Fr.add(qc, pi)))));
                const t0z = Fr.add(e1z, Fr.add(e2z, Fr.add(e3z, e4z)));

                buffers.T0.set(t0, i * sFr);
                buffers.T0z.set(t0z, i * sFr);

                // Next omega
                omega = Fr.mul(omega, Fr.w[zkey.power + 2]);
            }

            if (logger) logger.info("buffer T0: " + buffers.T0.byteLength / sFr);

            // Compute the coefficients of the polynomial T0(X) from buffers.T0
            if (logger) logger.info("··· Computing T0 ifft");
            polynomials.T0 = await Polynomial.fromEvaluations(buffers.T0, curve, logger);

            if (logger) logger.info("T0 length: " + polynomials.T0.length());
            if (logger) logger.info("T0 degree: " + polynomials.T0.degree());

            // Divide the polynomial T0 by Z_H(X)
            if (logger) logger.info("··· Computing T0 / ZH");
            polynomials.T0.divZh(zkey.domainSize);

            // Compute the coefficients of the polynomial T0z(X) from buffers.T0z
            if (logger) logger.info("··· Computing T0z ifft");
            polynomials.T0z = await Polynomial.fromEvaluations(buffers.T0z, curve, logger);

            if (logger) logger.info("T0z length: " + polynomials.T0z.length());
            if (logger) logger.info("T0z degree: " + polynomials.T0z.degree());

            // Add the polynomial T0z to T0 to get the final polynomial T0
            polynomials.T0.add(polynomials.T0z);

            if (logger) logger.info("T0 length: " + polynomials.T0.length());
            if (logger) logger.info("T0 degree: " + polynomials.T0.degree());

            // Check degree
            if (polynomials.T0.degree() >= 2 * zkey.domainSize + 2) {
                throw new Error(`T0 Polynomial is not well calculated (degree is ${polynomials.T0.degree()} and must be less than ${2 * zkey.domainSize + 2}`);
            }

            delete buffers.T0;
            delete buffers.T0z;
            delete polynomials.T0z;
        }

        async function computeC1() {
            let C1 = new CPolynomial(4, curve, logger);
            C1.addPolynomial(0, polynomials.A);
            C1.addPolynomial(1, polynomials.B);
            C1.addPolynomial(2, polynomials.C);
            C1.addPolynomial(3, polynomials.T0);

            polynomials.C1 = C1.getPolynomial();

            // Check degree
            if (polynomials.C1.degree() >= 8 * zkey.domainSize + 8) {
                throw new Error("C1 Polynomial is not well calculated");
            }
        }
    }

    async function round2() {
        // STEP 2.1 - Compute permutation challenge beta and gamma ∈ F
        // Compute permutation challenge beta
        if (logger) logger.info("> Computing challenges beta and gamma");
        const transcript = new Keccak256Transcript(curve);
        for (let i = 0; i < zkey.nPublic; i++) {
            transcript.addScalar(buffers.A.slice(i * sFr, i * sFr + sFr));
        }
        transcript.addPolCommitment(proof.getPolynomial("C1"));

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

        // STEP 2.4 - Compute the FFT-style combination polynomial C2(X)
        if (logger) logger.info("> Computing C2 polynomial");
        await computeC2();

        // The second output of the prover is ([C2]_1)
        if (logger) logger.info("> Computing C2 multi exponentiation");
        let commitC2 = await polynomials.C2.multiExponentiation(PTau, "C2");
        proof.addPolynomial("C2", commitC2);

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

                const z = evaluations.Z.getEvaluation(i*2);
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
            polynomials.T1.divZh(zkey.domainSize, 2);

            // Compute the coefficients of the polynomial T1z(X) from buffers.T1z
            if (logger) logger.info("··· Computing T1z ifft");
            polynomials.T1z = await Polynomial.fromEvaluations(buffers.T1z, curve, logger);

            // Add the polynomial T0z to T0 to get the final polynomial T0
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

                const ap = Fr.add(Fr.mul(challenges.b[1], omega), challenges.b[2]);
                const bp = Fr.add(Fr.mul(challenges.b[3], omega), challenges.b[4]);
                const cp = Fr.add(Fr.mul(challenges.b[5], omega), challenges.b[6]);
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

                const [e1, e1z] = MulZ.mul4(e11, e12, e13, z, ap, bp, cp, zp, i % 4, Fr);

                // expression 2 -> (a(X) + beta·sigma1(X) + gamma)(b(X) + beta·sigma2(X) + gamma)(c(X) + beta·sigma3(X) + gamma)z(Xω)
                let e21 = Fr.add(a, Fr.mul(challenges.beta, sigma1));
                e21 = Fr.add(e21, challenges.gamma);

                let e22 = Fr.add(b, Fr.mul(challenges.beta, sigma2));
                e22 = Fr.add(e22, challenges.gamma);

                let e23 = Fr.add(c, Fr.mul(challenges.beta, sigma3));
                e23 = Fr.add(e23, challenges.gamma);

                const [e2, e2z] = MulZ.mul4(e21, e22, e23, zW, ap, bp, cp, zWp, i % 4, Fr);

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
            polynomials.T2.divZh(zkey.domainSize);

            // Compute the coefficients of the polynomial T2z(X) from buffers.T2z
            if (logger) logger.info("··· Computing T2z ifft");
            polynomials.T2z = await Polynomial.fromEvaluations(buffers.T2z, curve, logger);

            // Add the polynomial T2z to T2 to get the final polynomial T2
            polynomials.T2.add(polynomials.T2z);

            // Check degree
            if (polynomials.T2.degree() >= 3 * zkey.domainSize + 6) {
                throw new Error("T2 Polynomial is not well calculated");
            }

            delete buffers.T2;
            delete buffers.T2z;
            delete polynomials.T2z;
        }

        async function computeC2() {
            let C2 = new CPolynomial(3, curve, logger);
            C2.addPolynomial(0, polynomials.Z);
            C2.addPolynomial(1, polynomials.T1);
            C2.addPolynomial(2, polynomials.T2);

            polynomials.C2 = C2.getPolynomial();

            // Check degree
            if (polynomials.C2.degree() >= 9 * zkey.domainSize + 18) {
                throw new Error("C2 Polynomial is not well calculated");
            }
        }
    }

    async function round3() {
        if (logger) logger.info("> Computing challenge xi");
        // STEP 3.1 - Compute evaluation challenge xi ∈ S
        const transcript = new Keccak256Transcript(curve);
        transcript.addPolCommitment(proof.getPolynomial("C2"));

        // Obtain a xi_seeder from the transcript
        // To force h1^4 = xi, h2^3 = xi and h_3^2 = xiω
        // we compute xi = xi_seeder^12, h1 = xi_seeder^3, h2 = xi_seeder^4 and h3 = xi_seeder^6
        const xiSeed = transcript.getChallenge();
        const xiSeed2 = Fr.square(xiSeed);

        // Compute omega8, omega4 and omega3
        roots.w8 = [];
        roots.w8[0] = Fr.one;
        for (let i = 1; i < 8; i++) {
            roots.w8[i] = Fr.mul(roots.w8[i - 1], zkey.w8);
        }

        roots.w4 = [];
        roots.w4[0] = Fr.one;
        for (let i = 1; i < 4; i++) {
            roots.w4[i] = Fr.mul(roots.w4[i - 1], zkey.w4);
        }

        roots.w3 = [];
        roots.w3[0] = Fr.one;
        roots.w3[1] = zkey.w3;
        roots.w3[2] = Fr.square(zkey.w3);

        // Compute h0 = xiSeeder^3
        roots.S0 = {};
        roots.S0.h0w8 = [];
        roots.S0.h0w8[0] = Fr.mul(xiSeed2, xiSeed);
        for (let i = 1; i < 8; i++) {
            roots.S0.h0w8[i] = Fr.mul(roots.S0.h0w8[0], roots.w8[i]);
        }

        // Compute h1 = xi_seeder^6
        roots.S1 = {};
        roots.S1.h1w4 = [];
        roots.S1.h1w4[0] = Fr.square(roots.S0.h0w8[0]);
        for (let i = 1; i < 4; i++) {
            roots.S1.h1w4[i] = Fr.mul(roots.S1.h1w4[0], roots.w4[i]);
        }

        // Compute h2 = xi_seeder^8
        roots.S2 = {};
        roots.S2.h2w3 = [];
        roots.S2.h2w3[0] = Fr.mul(roots.S1.h1w4[0], xiSeed2);
        roots.S2.h2w3[1] = Fr.mul(roots.S2.h2w3[0], roots.w3[1]);
        roots.S2.h2w3[2] = Fr.mul(roots.S2.h2w3[0], roots.w3[2]);

        roots.S2.h3w3 = [];
        // Multiply h3 by third-root-omega to obtain h_3^3 = xiω
        // So, h3 = xi_seeder^8 ω^{1/3}
        roots.S2.h3w3[0] = Fr.mul(roots.S2.h2w3[0], zkey.wr);
        roots.S2.h3w3[1] = Fr.mul(roots.S2.h3w3[0], roots.w3[1]);
        roots.S2.h3w3[2] = Fr.mul(roots.S2.h3w3[0], roots.w3[2]);

        // Compute xi = xi_seeder^24
        challenges.xi = Fr.mul(Fr.square(roots.S2.h2w3[0]), roots.S2.h2w3[0]);

        if (logger) logger.info("··· challenges.xi: " + Fr.toString(challenges.xi));

        // Reserve memory for Q's polynomials
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

        // STEP 3.2 - Compute opening evaluations and add them to the proof (third output of the prover)
        if (logger) logger.info("··· Computing evaluations");
        proof.addEvaluation("ql", polynomials.QL.evaluate(challenges.xi));
        proof.addEvaluation("qr", polynomials.QR.evaluate(challenges.xi));
        proof.addEvaluation("qm", polynomials.QM.evaluate(challenges.xi));
        proof.addEvaluation("qo", polynomials.QO.evaluate(challenges.xi));
        proof.addEvaluation("qc", polynomials.QC.evaluate(challenges.xi));
        proof.addEvaluation("s1", polynomials.Sigma1.evaluate(challenges.xi));
        proof.addEvaluation("s2", polynomials.Sigma2.evaluate(challenges.xi));
        proof.addEvaluation("s3", polynomials.Sigma3.evaluate(challenges.xi));
        proof.addEvaluation("a", polynomials.A.evaluate(challenges.xi));
        proof.addEvaluation("b", polynomials.B.evaluate(challenges.xi));
        proof.addEvaluation("c", polynomials.C.evaluate(challenges.xi));
        proof.addEvaluation("z", polynomials.Z.evaluate(challenges.xi));

        challenges.xiw = Fr.mul(challenges.xi, Fr.w[zkey.power]);
        proof.addEvaluation("zw", polynomials.Z.evaluate(challenges.xiw));
        proof.addEvaluation("t1w", polynomials.T1.evaluate(challenges.xiw));
        proof.addEvaluation("t2w", polynomials.T2.evaluate(challenges.xiw));
    }

    async function round4() {
        if (logger) logger.info("> Computing challenge alpha");
        // STEP 4.1 - Compute challenge alpha ∈ F
        const transcript = new Keccak256Transcript(curve);
        transcript.addScalar(proof.getEvaluation("ql"));
        transcript.addScalar(proof.getEvaluation("qr"));
        transcript.addScalar(proof.getEvaluation("qm"));
        transcript.addScalar(proof.getEvaluation("qo"));
        transcript.addScalar(proof.getEvaluation("qc"));
        transcript.addScalar(proof.getEvaluation("s1"));
        transcript.addScalar(proof.getEvaluation("s2"));
        transcript.addScalar(proof.getEvaluation("s3"));
        transcript.addScalar(proof.getEvaluation("a"));
        transcript.addScalar(proof.getEvaluation("b"));
        transcript.addScalar(proof.getEvaluation("c"));
        transcript.addScalar(proof.getEvaluation("z"));
        transcript.addScalar(proof.getEvaluation("zw"));
        transcript.addScalar(proof.getEvaluation("t1w"));
        transcript.addScalar(proof.getEvaluation("t2w"));
        challenges.alpha = transcript.getChallenge();
        if (logger) logger.info("··· challenges.alpha: " + Fr.toString(challenges.alpha));

        // STEP 4.2 - Compute F(X)
        if (logger) logger.info("> Reading C0 polynomial");
        polynomials.C0 = new Polynomial(new BigBuffer(sDomain * 8), curve, logger);
        await fdZKey.readToBuffer(polynomials.C0.coef, 0, sDomain * 8, zkeySections[ZKEY_FF_C0_SECTION][0].p);

        if (logger) logger.info("> Computing R0 polynomial");
        computeR0();
        if (logger) logger.info("> Computing R1 polynomial");
        computeR1();
        if (logger) logger.info("> Computing R2 polynomial");
        computeR2();

        if (logger) logger.info("> Computing F polynomial");
        await computeF();

        if (logger) logger.info("> Computing ZT polynomial");
        await computeZT();

        if (logger) logger.info("> Computing W = F / ZT polynomial");
        const polRemainder = polynomials.F.divBy(polynomials.ZT);
        //Check polReminder degree is equal to zero
        if (polRemainder.degree() > 0) {
            throw new Error(`Degree of f(X)/ZT(X) remainder is ${polRemainder.degree()} and should be 0`);
        }

        if (polynomials.F.degree() >= 9 * zkey.domainSize + 12) {
            throw new Error("Degree of f(X)/ZT(X) is not correct");
        }

        // The fourth output of the prover is ([W1]_1), where W1:=(f/Z_t)(x)
        if (logger) logger.info("> Computing W1 multi exponentiation");
        let commitW1 = await polynomials.F.multiExponentiation(PTau, "W1");
        proof.addPolynomial("W1", commitW1);

        return 0;

        function computeR0() {
            // COMPUTE R0
            // Compute the coefficients of R0(X) from 8 evaluations using lagrange interpolation. R0(X) ∈ F_{<8}[X]
            // We decide to use Lagrange interpolations because the R0 degree is very small (deg(R0)===7),
            // and we were not able to compute it using current ifft implementation because the omega are different
            polynomials.R0 = Polynomial.lagrangePolynomialInterpolation(
                [roots.S0.h0w8[0], roots.S0.h0w8[1], roots.S0.h0w8[2], roots.S0.h0w8[3],
                    roots.S0.h0w8[4], roots.S0.h0w8[5], roots.S0.h0w8[6], roots.S0.h0w8[7]],
                [polynomials.C0.evaluate(roots.S0.h0w8[0]), polynomials.C0.evaluate(roots.S0.h0w8[1]),
                    polynomials.C0.evaluate(roots.S0.h0w8[2]), polynomials.C0.evaluate(roots.S0.h0w8[3]),
                    polynomials.C0.evaluate(roots.S0.h0w8[4]), polynomials.C0.evaluate(roots.S0.h0w8[5]),
                    polynomials.C0.evaluate(roots.S0.h0w8[6]), polynomials.C0.evaluate(roots.S0.h0w8[7])], curve);

            // Check the degree of r0(X) < 8
            if (polynomials.R0.degree() > 7) {
                throw new Error("R0 Polynomial is not well calculated");
            }
        }

        function computeR1() {
            // COMPUTE R1
            // Compute the coefficients of R1(X) from 4 evaluations using lagrange interpolation. R1(X) ∈ F_{<4}[X]
            // We decide to use Lagrange interpolations because the R1 degree is very small (deg(R1)===3),
            // and we were not able to compute it using current ifft implementation because the omega are different
            polynomials.R1 = Polynomial.lagrangePolynomialInterpolation(
                [roots.S1.h1w4[0], roots.S1.h1w4[1], roots.S1.h1w4[2], roots.S1.h1w4[3]],
                [polynomials.C1.evaluate(roots.S1.h1w4[0]), polynomials.C1.evaluate(roots.S1.h1w4[1]),
                    polynomials.C1.evaluate(roots.S1.h1w4[2]), polynomials.C1.evaluate(roots.S1.h1w4[3])], curve);

            // Check the degree of r1(X) < 4
            if (polynomials.R1.degree() > 3) {
                throw new Error("R1 Polynomial is not well calculated");
            }
        }

        function computeR2() {
            // COMPUTE R2
            // Compute the coefficients of r2(X) from 6 evaluations using lagrange interpolation. r2(X) ∈ F_{<6}[X]
            // We decide to use Lagrange interpolations because the R2.degree is very small (deg(R2)===5),
            // and we were not able to compute it using current ifft implementation because the omega are different
            polynomials.R2 = Polynomial.lagrangePolynomialInterpolation(
                [roots.S2.h2w3[0], roots.S2.h2w3[1], roots.S2.h2w3[2],
                    roots.S2.h3w3[0], roots.S2.h3w3[1], roots.S2.h3w3[2]],
                [polynomials.C2.evaluate(roots.S2.h2w3[0]), polynomials.C2.evaluate(roots.S2.h2w3[1]),
                    polynomials.C2.evaluate(roots.S2.h2w3[2]), polynomials.C2.evaluate(roots.S2.h3w3[0]),
                    polynomials.C2.evaluate(roots.S2.h3w3[1]), polynomials.C2.evaluate(roots.S2.h3w3[2])], curve);

            // Check the degree of r2(X) < 6
            if (polynomials.R2.degree() > 5) {
                throw new Error("R2 Polynomial is not well calculated");
            }
        }

        async function computeF() {
            if (logger) logger.info("··· Computing F polynomial");

            let xiNeg = Fr.neg(challenges.xi);
            let xiwNeg = Fr.neg(challenges.xiw);

            // COMPUTE F(X)
            polynomials.F = Polynomial.fromPolynomial(polynomials.C0, curve, logger);
            polynomials.F.sub(polynomials.R0);
            polynomials.F.byXNSubValue(4, xiNeg);
            polynomials.F.byXNSubValue(3, xiNeg);
            polynomials.F.byXNSubValue(3, xiwNeg);

            let f2 = Polynomial.fromPolynomial(polynomials.C1, curve, logger);
            f2.sub(polynomials.R1);
            f2.mulScalar(challenges.alpha);
            f2.byXNSubValue(8, xiNeg);
            f2.byXNSubValue(3, xiNeg);
            f2.byXNSubValue(3, xiwNeg);

            let f3 = Polynomial.fromPolynomial(polynomials.C2, curve, logger);
            f3.sub(polynomials.R2);
            f3.mulScalar(Fr.square(challenges.alpha));
            f3.byXNSubValue(8, xiNeg);
            f3.byXNSubValue(4, xiNeg);

            polynomials.F.add(f2);
            polynomials.F.add(f3);

            // Check degree < 9n + 30
            if (polynomials.F.degree() >= 9 * zkey.domainSize + 30) {
                throw new Error("F Polynomial is not well calculated");
            }
        }

        async function computeZT() {
            polynomials.ZT = Polynomial.zerofierPolynomial(
                [
                    roots.S0.h0w8[0], roots.S0.h0w8[1], roots.S0.h0w8[2], roots.S0.h0w8[3],
                    roots.S0.h0w8[4], roots.S0.h0w8[5], roots.S0.h0w8[6], roots.S0.h0w8[7],
                    roots.S1.h1w4[0], roots.S1.h1w4[1], roots.S1.h1w4[2], roots.S1.h1w4[3],
                    roots.S2.h2w3[0], roots.S2.h2w3[1], roots.S2.h2w3[2],
                    roots.S2.h3w3[0], roots.S2.h3w3[1], roots.S2.h3w3[2]], curve);
        }
    }

    async function round5() {
        if (logger) logger.info("> Computing challenge y");

        // STEP 5.1 - Compute random evaluation point y ∈ F
        const transcript = new Keccak256Transcript(curve);
        transcript.addPolCommitment(proof.getPolynomial("W1"));

        challenges.y = transcript.getChallenge();
        if (logger) logger.info("··· challenges.y: " + Fr.toString(challenges.y));

        // STEP 5.2 - Compute L(X)
        if (logger) logger.info("> Computing L polynomial");
        await computeL();

        if (logger) logger.info("> Computing ZTS2 polynomial");
        await computeZTS2();

        let ZTS2Y = polynomials.ZTS2.evaluate(challenges.y);
        ZTS2Y = Fr.inv(ZTS2Y);
        polynomials.L.mulScalar(ZTS2Y);

        const polDividend = Polynomial.fromCoefficientsArray([Fr.neg(challenges.y), Fr.one], curve);
        if (logger) logger.info("> Computing W' = L / ZTS2 polynomial");
        const polRemainder = polynomials.L.divBy(polDividend);

        //Check polReminder degree is equal to zero
        if (polRemainder.degree() > 0) {
            throw new Error(`Degree of L(X)/(ZTS2(y)(X-y)) remainder is ${polRemainder.degree()} and should be 0`);
        }

        if (polynomials.L.degree() >= 9 * zkey.domainSize + 17) {
            throw new Error("Degree of L(X)/(ZTS2(y)(X-y)) is not correct");
        }

        // The fifth output of the prover is ([W2]_1), where W2:=(f/Z_t)(x)
        if (logger) logger.info("> Computing W' multi exponentiation");
        let commitW2 = await polynomials.L.multiExponentiation(PTau, "W2");
        proof.addPolynomial("W2", commitW2);

        return 0;

        async function computeL() {
            if (logger) logger.info("··· Computing L polynomial");

            const evalR0Y = polynomials.R0.evaluate(challenges.y);
            const evalR1Y = polynomials.R1.evaluate(challenges.y);
            const evalR2Y = polynomials.R2.evaluate(challenges.y);

            let mulL0 = Fr.sub(challenges.y, roots.S0.h0w8[0]);
            for (let i = 1; i < 8; i++) {
                mulL0 = Fr.mul(mulL0, Fr.sub(challenges.y, roots.S0.h0w8[i]));
            }

            let mulL1 = Fr.sub(challenges.y, roots.S1.h1w4[0]);
            for (let i = 1; i < 4; i++) {
                mulL1 = Fr.mul(mulL1, Fr.sub(challenges.y, roots.S1.h1w4[i]));
            }

            let mulL2 = Fr.sub(challenges.y, roots.S2.h2w3[0]);
            for (let i = 1; i < 3; i++) {
                mulL2 = Fr.mul(mulL2, Fr.sub(challenges.y, roots.S2.h2w3[i]));
            }
            for (let i = 0; i < 3; i++) {
                mulL2 = Fr.mul(mulL2, Fr.sub(challenges.y, roots.S2.h3w3[i]));
            }

            let preL0 = Fr.mul(mulL1, mulL2);
            let preL1 = Fr.mul(challenges.alpha, Fr.mul(mulL0, mulL2));
            let preL2 = Fr.mul(Fr.square(challenges.alpha), Fr.mul(mulL0, mulL1));

            toInverse["denH1"] = mulL1;
            toInverse["denH2"] = mulL2;

            // COMPUTE F(X)
            polynomials.L = Polynomial.fromPolynomial(polynomials.C0, curve, logger);
            polynomials.L.subScalar(evalR0Y);
            polynomials.L.mulScalar(preL0);

            let l2 = Polynomial.fromPolynomial(polynomials.C1, curve, logger);
            l2.subScalar(evalR1Y);
            l2.mulScalar(preL1);

            let l3 = Polynomial.fromPolynomial(polynomials.C2, curve, logger);
            l3.subScalar(evalR2Y);
            l3.mulScalar(preL2);

            polynomials.L.add(l2);
            polynomials.L.add(l3);

            const evalZTY = polynomials.ZT.evaluate(challenges.y);
            polynomials.F.mulScalar(evalZTY);
            polynomials.L.sub(polynomials.F);

            // Check degree
            if (polynomials.L.degree() >= 9 * zkey.domainSize + 18) {
                throw new Error("L Polynomial is not well calculated");
            }

            delete buffers.L;
        }

        async function computeZTS2() {
            polynomials.ZTS2 = Polynomial.zerofierPolynomial(
                [roots.S1.h1w4[0], roots.S1.h1w4[1], roots.S1.h1w4[2], roots.S1.h1w4[3],
                    roots.S2.h2w3[0], roots.S2.h2w3[1], roots.S2.h2w3[2],
                    roots.S2.h3w3[0], roots.S2.h3w3[1], roots.S2.h3w3[2]], curve);
        }
    }

    function getMontgomeryBatchedInverse() {
        //   · denominator needed in step 8 and 9 of the verifier to multiply by 1/Z_H(xi)
        let xiN = challenges.xi;
        for (let i = 0; i < zkey.power; i++) {
            xiN = Fr.square(xiN);
        }
        toInverse["zh"] = Fr.sub(xiN, Fr.one);

        //   · denominator needed in step 10 and 11 of the verifier
        //     toInverse.denH1 & toInverse.denH2  -> Computed in round5, computeL()

        //   · denominator needed in the verifier when computing L_i^{S0}(X), L_i^{S1}(X) and L_i^{S2}(X)
        for (let i = 0; i < 8; i++) {
            toInverse["LiS0_" + (i + 1)] = computeLiS0(i);
        }

        for (let i = 0; i < 4; i++) {
            toInverse["LiS1_" + (i + 1)] = computeLiS1(i);
        }

        for (let i = 0; i < 6; i++) {
            toInverse["LiS2_" + (i + 1)] = computeLiS2(i);
        }

        //   · L_i i=1 to num public inputs, needed in step 6 and 7 of the verifier to compute L_1(xi) and PI(xi)
        const size = Math.max(1, zkey.nPublic);

        let w = Fr.one;
        for (let i = 0; i < size; i++) {
            toInverse["Li_" + (i + 1)] = Fr.mul(Fr.e(zkey.domainSize), Fr.sub(challenges.xi, w));

            w = Fr.mul(w, zkey.w);
        }

        let mulAccumulator = Fr.one;
        for (const element of Object.values(toInverse)) {
            mulAccumulator = Fr.mul(mulAccumulator, element);
        }
        return Fr.inv(mulAccumulator);

        function computeLiS0(i) {
            // Compute L_i^{(S0)}(y)
            let idx = i;
            let den = Fr.one;
            for (let j = 0; j < 7; j++) {
                idx = (idx + 1) % 8;

                den = Fr.mul(den, Fr.sub(roots.S0.h0w8[i], roots.S0.h0w8[idx]));
            }
            return den;
        }

        function computeLiS1(i) {
            // Compute L_i^{(S1)}(y)
            let idx = i;
            let den = Fr.one;
            for (let j = 0; j < 3; j++) {
                idx = (idx + 1) % 4;

                den = Fr.mul(den, Fr.sub(roots.S1.h1w4[i], roots.S1.h1w4[idx]));
            }
            return den;
        }

        function computeLiS2(i) {
            // Compute L_i^{(S1)}(y)
            let idx = i;
            let den = Fr.one;
            for (let j = 0; j < 5; j++) {
                idx = (idx + 1) % 6;

                const root1 = i < 3 ? roots.S2.h2w3[i] : roots.S2.h3w3[i - 3];
                const root2 = idx < 3 ? roots.S2.h2w3[idx] : roots.S2.h3w3[idx - 3];
                den = Fr.mul(den, Fr.sub(root1, root2));
            }
            return den;
        }
    }
}