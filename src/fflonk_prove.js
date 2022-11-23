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
import {Scalar, utils, BigBuffer} from "ffjavascript";
import {FFLONK_PROTOCOL_ID} from "./zkey.js";
import {
    FF_ADDITIONS_ZKEY_SECTION,
    FF_A_MAP_ZKEY_SECTION,
    FF_B_MAP_ZKEY_SECTION,
    FF_C_MAP_ZKEY_SECTION,
    FF_QL_ZKEY_SECTION,
    FF_QR_ZKEY_SECTION,
    FF_QM_ZKEY_SECTION,
    FF_QO_ZKEY_SECTION,
    FF_QC_ZKEY_SECTION,
    FF_SIGMA1_ZKEY_SECTION,
    FF_SIGMA2_ZKEY_SECTION,
    FF_SIGMA3_ZKEY_SECTION,
    FF_LAGRANGE_ZKEY_SECTION,
    FF_PTAU_ZKEY_SECTION,
} from "./fflonk.js";
import {Keccak256Transcript} from "./Keccak256Transcript.js";
import {Proof} from "./proof.js";
import {Polynomial} from "./polynomial/polynomial.js";
import {Evaluations} from "./polynomial/evaluations.js";
import {BP_Q_ZKEY_SECTION} from "./babyplonk.js";
import {MulZ} from "./mul_z.js";

const {stringifyBigInts} = utils;

export default async function fflonkProve(zkeyFileName, witnessFileName, logger) {
    if (logger) logger.info("Fflonk prover started");

    // Read witness file
    if (logger) logger.info("Reading witness file");
    const {
        fd: fdWtns,
        sections: wtnsSections
    } = await binFileUtils.readBinFile(witnessFileName, "wtns", 2, 1 << 25, 1 << 23);
    const wtns = await wtnsUtils.readHeader(fdWtns, wtnsSections);

    //Read zkey file
    if (logger) logger.info("Reading zkey file");
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
    const G1 = curve.G1;

    const sFr = curve.Fr.n8;
    const sG1 = curve.G1.F.n8 * 2;
    const sDomain = zkey.domainSize * sFr;

    let settings = {
        domainSize: zkey.domainSize,
    };

    //Read witness data
    if (logger) logger.debug("Reading witness data");
    const buffWitness = await binFileUtils.readSection(fdWtns, wtnsSections, 2);
    // First element in plonk is not used and can be any value. (But always the same).
    // We set it to zero to go faster in the exponentiations.
    buffWitness.set(Fr.zero, 0);
    const buffInternalWitness = new BigBuffer(sFr * zkey.nAdditions);

    let buffers = {};
    let polynomials = {};
    let evaluations = {};
    const challenges = {};

    let proof = new Proof(curve, logger);

    if (logger) logger.info(`Reading Section ${FF_ADDITIONS_ZKEY_SECTION}. Additions`);
    await calculateAdditions();

    if (logger) logger.info(`Reading Section ${FF_SIGMA1_ZKEY_SECTION}. Sigma1`);
    evaluations.S1 = new Evaluations(BigBuffer(sDomain * 4), Fr, logger);
    await fdZKey.readToBuffer(evaluations.S1, 0, sDomain * 4, zkeySections[FF_SIGMA1_ZKEY_SECTION][0].p + sDomain);
    // Get polynomial S1
    polynomials.S1 = new Polynomial(new BigBuffer(sDomain), Fr, logger);
    await fdZKey.readToBuffer(polynomials.S1.coef, 0, sDomain, zkeySections[FF_SIGMA1_ZKEY_SECTION][0].p);

    // TODO can S2 be loaded later?
    if (logger) logger.info(`Reading Section ${FF_SIGMA2_ZKEY_SECTION}. Sigma2`);
    evaluations.S2 = new Evaluations(BigBuffer(sDomain * 4), Fr, logger);
    await fdZKey.readToBuffer(evaluations.S2, 0, sDomain * 4, zkeySections[FF_SIGMA2_ZKEY_SECTION][0].p + sDomain);
    // Get polynomial S2
    polynomials.S2 = new Polynomial(new BigBuffer(sDomain), Fr, logger);
    await fdZKey.readToBuffer(polynomials.S2.coef, 0, sDomain, zkeySections[FF_SIGMA2_ZKEY_SECTION][0].p);

    // TODO can S3 be loaded later?
    if (logger) logger.info(`Reading Section ${FF_SIGMA3_ZKEY_SECTION}. Sigma3`);
    evaluations.S3 = new Evaluations(BigBuffer(sDomain * 4), Fr, logger);
    await fdZKey.readToBuffer(evaluations.S3, 0, sDomain * 4, zkeySections[FF_SIGMA3_ZKEY_SECTION][0].p + sDomain);
    // Get polynomial S3
    polynomials.S3 = new Polynomial(new BigBuffer(sDomain), Fr, logger);
    await fdZKey.readToBuffer(polynomials.S3.coef, 0, sDomain, zkeySections[FF_SIGMA3_ZKEY_SECTION][0].p);

    if (logger) logger.info(`Reading Section ${FF_PTAU_ZKEY_SECTION}. Powers of Tau`);
    const PTau = await binFileUtils.readSection(fdZKey, zkeySections, FF_PTAU_ZKEY_SECTION);

    // Start fflonk protocol

    // ROUND 1. Compute polynomials A(X) and B(X)
    await round1();

    // ROUND 2. Compute permutation polynomial Z(X)
    await round2();

    // ROUND 3. Compute quotient polynomial t(X)
    await round3();

    // ROUND 4. Compute evaluations
    await round4();

    // ROUND 5. Compute linearisation polynomial r(X)
    await round5();

    await fdZKey.close();
    await fdWtns.close();

    let publicSignals = [];

    for (let i = 1; i <= zkey.nPublic; i++) {
        const i_sFr = i * sFr;

        const pub = buffWitness.slice(i_sFr, i_sFr + sFr);
        publicSignals.push(Scalar.fromRprLE(pub));
    }

    let _proof = proof.toObjectProof();
    _proof.protocol = "fflonk";
    _proof.curve = curve.name;

    return {proof: stringifyBigInts(_proof), publicSignals: stringifyBigInts(publicSignals)};

    async function calculateAdditions() {
        const additionsBuff = await binFileUtils.readSection(fdZKey, zkeySections, FF_ADDITIONS_ZKEY_SECTION);

        // sizes: wireId_x = 4 bytes (32 bits), factor_x = field size bits
        // Addition form: wireId_a wireId_b factor_a factor_b (size is 4 + 4 + sFr + sFr)
        const sSum = 8 + sFr * 2;

        for (let i = 0; i < zkey.nAdditions; i++) {
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
        } else {
            return Fr.zero;
        }
    }

    async function round1() {
        // STEP 1.1 - Generate random blinding scalars (b_1, ..., b9) ∈ F
        challenges.b = [];
        for (let i = 1; i <= 9; i++) {
            challenges.b[i] = Fr.random();
        }

        // STEP 1.2 - Compute wire polynomials a(X), b(X) and c(X)
        await computeWirePolynomials();

        // STEP 1.3 - Compute quotient polynomial T0(X)
        await computeT0();

        // STEP 1.4 - Compute the FFT-style combination polynomial C1(X)
        await computeC1();

        // The first output of the prover is ([C1]_1)
        proof.addPolynomial("C1", await multiExponentiation(polynomials.C1, "C1"));

        return 0;

        async function computeWirePolynomials() {
            // Build A, B and C evaluations buffer from zkey and witness files
            // TODO check, this buffer can be nConstraints * sFr in size ??
            buffers.A = new BigBuffer(sDomain);
            buffers.B = new BigBuffer(sDomain);
            buffers.C = new BigBuffer(sDomain);

            const aMapBuff = await binFileUtils.readSection(fdZKey, zkeySections, FF_A_MAP_ZKEY_SECTION);
            const bMapBuff = await binFileUtils.readSection(fdZKey, zkeySections, FF_B_MAP_ZKEY_SECTION);
            const cMapBuff = await binFileUtils.readSection(fdZKey, zkeySections, FF_C_MAP_ZKEY_SECTION);

            for (let i = 0; i < zkey.nConstraints; i++) {
                const offset1 = i * 4;
                const offset2 = i * sFr;

                // Compute A value from a signal id
                const signalIdA = readUInt32(aMapBuff, offset1);
                buffers.A.set(getWitness(signalIdA), offset2);

                // Compute B value from a signal id
                const signalIdB = readUInt32(bMapBuff, offset1);
                buffers.B.set(getWitness(signalIdB), offset2);

                // Compute C value from a signal id
                const signalIdC = readUInt32(cMapBuff, offset1);
                buffers.C.set(getWitness(signalIdC), offset2);
            }

            buffers.A = await Fr.batchToMontgomery(buffers.A);
            buffers.B = await Fr.batchToMontgomery(buffers.B);
            buffers.C = await Fr.batchToMontgomery(buffers.C);

            // Compute wire polynomials coefficients a(X), b(X) and c(X)
            polynomials.A = Polynomial.fromBuffer(buffers.A, Fr, logger);
            polynomials.B = Polynomial.fromBuffer(buffers.B, Fr, logger);
            polynomials.C = Polynomial.fromBuffer(buffers.C, Fr, logger);

            // Compute extended evaluations of a(X), b(X) and c(X) polynomials
            evaluations.A = Evaluations.fromPolynomial(polynomials.A, Fr, logger);
            evaluations.B = Evaluations.fromPolynomial(polynomials.B, Fr, logger);
            evaluations.C = Evaluations.fromPolynomial(polynomials.C, Fr, logger);

            // Blind a(X), b(X) and c(X) polynomials coefficients with blinding scalars b
            polynomials.A.blindCoefficients([challenges.b[1], challenges.b[2]]);
            polynomials.B.blindCoefficients([challenges.b[3], challenges.b[4]]);
            polynomials.C.blindCoefficients([challenges.b[5], challenges.b[6]]);

            // Check degrees
            if (polynomials.A.degree() >= settings.domainSize + 2) {
                throw new Error("A Polynomial is not well calculated");
            }
            if (polynomials.B.degree() >= settings.domainSize + 2) {
                throw new Error("B Polynomial is not well calculated");
            }
            if (polynomials.C.degree() >= settings.domainSize + 2) {
                throw new Error("C Polynomial is not well calculated");
            }
        }

        async function computeT0() {
            // Read QL evaluations from zkey file
            if (logger) logger.debug("Reading QL");
            evaluations.QL = new Evaluations(BigBuffer(sDomain * 4), Fr, logger);
            await fdZKey.readToBuffer(evaluations.QL, 0, sDomain * 4, zkeySections[FF_QL_ZKEY_SECTION][0].p + sDomain);

            if (logger) logger.debug("Reading QR");
            evaluations.QR = new Evaluations(BigBuffer(sDomain * 4), Fr, logger);
            await fdZKey.readToBuffer(evaluations.QR, 0, sDomain * 4, zkeySections[FF_QR_ZKEY_SECTION][0].p + sDomain);

            if (logger) logger.debug("Reading QM");
            evaluations.QM = new Evaluations(BigBuffer(sDomain * 4), Fr, logger);
            await fdZKey.readToBuffer(evaluations.QM, 0, sDomain * 4, zkeySections[FF_QM_ZKEY_SECTION][0].p + sDomain);

            if (logger) logger.debug("Reading QO");
            evaluations.QO = new Evaluations(BigBuffer(sDomain * 4), Fr, logger);
            await fdZKey.readToBuffer(evaluations.QO, 0, sDomain * 4, zkeySections[FF_QO_ZKEY_SECTION][0].p + sDomain);

            if (logger) logger.debug("Reading QC");
            evaluations.QC = new Evaluations(BigBuffer(sDomain * 4), Fr, logger);
            await fdZKey.readToBuffer(evaluations.QC, 0, sDomain * 4, zkeySections[FF_QC_ZKEY_SECTION][0].p + sDomain);

            const lagrangePolynomials = await binFileUtils.readSection(fdZKey, zkeySections, FF_LAGRANGE_ZKEY_SECTION);

            buffers.T0 = new BigBuffer(sDomain * 4);
            buffers.T0z = new BigBuffer(sDomain * 4);

            let omega = Fr.one;
            for (let i = 0; i < settings.domainSize; i++) {
                if ((i % 5000 === 0) && (logger)) logger.debug(`Computing t0 evaluation ${i}/${zkey.domainSize * 4}`);

                const i_sFr = i * sFr;

                const a = evaluations.A.get(i_sFr);
                const b = evaluations.B.get(i_sFr);
                const c = evaluations.C.get(i_sFr);
                const ql = evaluations.QL.get(i_sFr);
                const qr = evaluations.QR.get(i_sFr);
                const qm = evaluations.QM.get(i_sFr);
                const qo = evaluations.QO.get(i_sFr);
                const qc = evaluations.QC.get(i_sFr);

                const ap = Fr.add(Fr.mul(challenges.b[1], omega), challenges.b[2]);
                const bp = Fr.add(Fr.mul(challenges.b[3], omega), challenges.b[4]);
                const cp = Fr.add(Fr.mul(challenges.b[5], omega), challenges.b[6]);

                let pi = Fr.zero;
                for (let j = 0; j < zkey.nPublic; j++) {
                    pi = Fr.sub(pi, Fr.mul(
                        lagrangePolynomials.slice((j * 5 * zkey.domainSize + zkey.domainSize + i) * sFr, (j * 5 * zkey.domainSize + zkey.domainSize + i + 1) * sFr),
                        buffers.A.slice(j * sFr, (j + 1) * sFr)
                    ));
                }

                // e1 -> q_L(X)·a(X)
                const e1 = Fr.mul(a, ql);
                const e1z = Fr.mul(ap, ql);

                // e2 -> q_R(X)·b(X)
                const e2 = Fr.mul(b, qr);
                const e2z = Fr.mul(bp, qr);

                // e3 -> q_M(X)·a(X)·b(X)
                let [e3, e3z] = MulZ.mul2(a, b, ap, bp, i % 4);
                e3 = Fr.mul(e3, qm);
                e3z = Fr.mul(e3z, qm);

                // e4 -> q_O(X)·c(X)
                const e4 = Fr.mul(c, qo);
                const e4z = Fr.mul(cp, qo);

                const value = Fr.add(e1, Fr.add(e2, Fr.add(e3, Fr.add(e4, Fr.add(qc, pi)))));
                const valuez = Fr.add(e1z, Fr.add(e2z, Fr.add(e3z, e4z)));

                buffers.T0.set(value, i_sFr);
                buffers.T0z.set(valuez, i_sFr);

                omega = Fr.mul(omega, Fr.w[zkey.power + 2]);
            }

            if (logger) logger.debug("Computing T0 ifft");
            polynomials.T0 = await Polynomial.fromBuffer(buffers.T0, Fr, logger);
            polynomials.T0 = await polynomials.T0.divZh(settings.domainSize);

            if (logger) logger.debug("Computing T0z ifft");
            polynomials.T0z = await Polynomial.fromBuffer(buffers.T0z, Fr, logger);

            polynomials.T0.add(polynomials.T0z);

            // Is this correct? Check it doesn't remove the T0 coefficients
            delete polynomials.T0z;
        }

        async function computeC1() {
            polynomials.A4 = Polynomial.computePolynomialXExp(buffers.A, 4, Fr, logger);
            polynomials.B4 = Polynomial.computePolynomialXExp(buffers.B, 4, Fr, logger);
            polynomials.C4 = Polynomial.computePolynomialXExp(buffers.C, 4, Fr, logger);
            polynomials.T04 = Polynomial.computePolynomialXExp(buffers.T0, 4, Fr, logger);

            // Compute degree of the new polynomial C1
            // Will be the maximum(deg(A), deg(B)+1, deg(C)+2, deg(D)+3)
            const length = Math.max(polynomials.A4.length,
                polynomials.B4.length + 1,
                polynomials.C4.length + 2,
                polynomials.T04.length + 3);
            polynomials.C1 = new Polynomial(new BigBuffer(length * sFr, Fr, logger));

            for (let i = 0; i < length; i++) {
                const i_sFr = i * sFr;

                let val = polynomials.A4.getCoef(i);
                // Following polynomials are multiplied (so shifted) by x^n
                if (i > 0) val = Fr.add(val, polynomials.B4.getCoef(i - 1));
                if (i > 1) val = Fr.add(val, polynomials.C4.getCoef(i - 2));
                if (i > 2) val = Fr.add(val, polynomials.T04.getCoef(i - 3));

                polynomials.C1.coef.set(val, i_sFr);
            }
        }
    }

    async function round2() {
        //TODO

        // STEP 2.1 - Compute permutation challenge beta and gamma ∈ F
        // Compute permutation challenge beta
        const transcript = new Keccak256Transcript(curve);
        for (let i = 0; i < zkey.nPublic; i++) {
            transcript.addScalar(evaluations.A.slice(i * sFr, (i + 1) * sFr));
        }
        transcript.addPolCommitment(proof.getPolynomial("A"));
        transcript.addPolCommitment(proof.getPolynomial("B"));
        transcript.addPolCommitment(proof.getPolynomial("C"));
        transcript.addPolCommitment(proof.getPolynomial("C1"));

        challenges.beta = transcript.getChallenge();
        if (logger) logger.debug("Challenge.beta: " + Fr.toString(challenges.beta));

        // Compute permutation challenge gamma
        transcript.reset();
        transcript.addScalar(challenges.beta);
        challenges.gamma = transcript.getChallenge();
        if (logger) logger.debug("Challenge.gamma: " + Fr.toString(challenges.gamma));


        // STEP 2.2 - Compute permutation polynomial z(X)
        await computeZ();

        // STEP 2.3 - Compute quotient polynomial T1(X) and T2(X)
        // TODO
        await computeT1();
        await computeT2();

        // STEP 2.4 - Compute the FFT-style combination polynomial C2(X)
        // TODO
        await computeC2();

        // The second output of the prover is ([C2]_1)
        proof.addPolynomial("C2", await multiExponentiation(polynomials.C2, "C2"));

        return 0;

        async function computeZ() {
            let numArr = new BigBuffer(sDomain);
            let denArr = new BigBuffer(sDomain);

            numArr.set(Fr.one, 0);
            denArr.set(Fr.one, 0);

            // Set initial omega
            let w = Fr.one;
            for (let i = 0; i < zkey.domainSize; i++) {
                const i_sFr = i * sFr;
                const i_sDomain = (zkey.domainSize + i) * sFr;
                const i_sDomain2 = (zkey.domainSize * 2 + i) * sFr;
                const betaw = Fr.mul(challenges.beta, w);

                let num1 = evaluations.A.slice(i_sFr, i_sFr + sFr);
                num1 = Fr.add(num1, betaw);
                num1 = Fr.add(num1, challenges.gamma);

                let num2 = evaluations.B.slice(i_sFr, i_sFr + sFr);
                num2 = Fr.add(num2, Fr.mul(zkey.k1, betaw));
                num2 = Fr.add(num2, challenges.gamma);

                let num3 = evaluations.C.slice(i_sFr, i_sFr + sFr);
                num3 = Fr.add(num3, Fr.mul(zkey.k2, betaw));
                num3 = Fr.add(num3, challenges.gamma);

                const num = Fr.mul(num1, Fr.mul(num2, num3));

                let den1 = evaluations.A.slice(i_sFr, i_sFr + sFr);
                den1 = Fr.add(den1, Fr.mul(evaluations.sigma.slice(i_sFr * 4, i_sFr * 4 + sFr), challenges.beta));
                den1 = Fr.add(den1, challenges.gamma);

                let den2 = evaluations.B.slice(i_sFr, i_sFr + sFr);
                den2 = Fr.add(den2, Fr.mul(evaluations.sigma.slice(i_sDomain * 4, i_sDomain * 4 + sFr), challenges.beta));
                den2 = Fr.add(den2, challenges.gamma);

                let den3 = evaluations.C.slice(i_sFr, i_sFr + sFr);
                den3 = Fr.add(den3, Fr.mul(evaluations.sigma.slice(i_sDomain2 * 4, i_sDomain2 * 4 + sFr), challenges.beta));
                den3 = Fr.add(den3, challenges.gamma);

                const den = Fr.mul(den1, Fr.mul(den2, den3));

                numArr.set(
                    Fr.mul(numArr.slice(i_sFr, i_sFr + sFr), num),
                    ((i + 1) % zkey.domainSize) * sFr
                );

                denArr.set(
                    Fr.mul(denArr.slice(i_sFr, i_sFr + sFr), den),
                    ((i + 1) % zkey.domainSize) * sFr
                );

                w = Fr.mul(w, Fr.w[zkey.power]);
            }

            denArr = await Fr.batchInverse(denArr);

            // TODO: Do it in assembly and in parallel
            for (let i = 0; i < zkey.domainSize; i++) {
                const i_sFr = i * sFr;

                const z = Fr.mul(numArr.slice(i_sFr, i_sFr + sFr), denArr.slice(i_sFr, i_sFr + sFr));
                numArr.set(z, i_sFr);
            }
            buffers.Z = numArr;

            if (!Fr.eq(numArr.slice(0, sFr), Fr.one)) {
                throw new Error("Copy constraints does not match");
            }

            // Compute polynomial coefficients z(X)
            polynomials.Z = await Polynomial.fromBuffer(buffers.Z, Fr, logger);

            // Compute extended evaluations of z(X) polynomial
            evaluations.Z = await Evaluations.fromPolynomial(polynomials.Z, Fr, logger);

            // Blind z(X) polynomial coefficients with blinding scalars b
            polynomials.Z.blindCoefficients([challenges.b[7], challenges.b[8], challenges.b[9]]);

            if (polynomials.Z.degree() >= settings.domainSize + 3) {
                throw new Error("range_check: Z Polynomial is not well calculated");
            }
        }

        async function computeT1() {
            polynomials.T1 = new Polynomial(new BigBuffer(0), Fr, logger);
        }

        async function computeT2() {
            polynomials.T2 = new Polynomial(new BigBuffer(0), Fr, logger);
        }

        async function computeC2() {
            polynomials.C2 = new Polynomial(new BigBuffer(0), Fr, logger);
        }
    }

    async function round3() {
        // STEP 3.1 - Compute evaluation challenge xi ∈ S (!!)
        const transcript = new Keccak256Transcript(curve);
        transcript.addPolCommitment(proof.getPolynomial("C2"));
        challenges.xi = transcript.getChallenge();
        if (logger) logger.debug("Challenge.xi: " + Fr.toString(challenges.xi));

        // STEP 3.2 - Compute opening evaluations and add them to the proof (third output of the prover)
        proof.addEvaluation("ql", polynomials.QL.evaluate(challenges.xi));
        proof.addEvaluation("qr", polynomials.QR.evaluate(challenges.xi));
        proof.addEvaluation("qm", polynomials.QM.evaluate(challenges.xi));
        proof.addEvaluation("qo", polynomials.QO.evaluate(challenges.xi));
        proof.addEvaluation("qc", polynomials.QC.evaluate(challenges.xi));
        proof.addEvaluation("s1", polynomials.S1.evaluate(challenges.xi));
        proof.addEvaluation("s2", polynomials.S2.evaluate(challenges.xi));
        proof.addEvaluation("s3", polynomials.S3.evaluate(challenges.xi));
        proof.addEvaluation("a", polynomials.A.evaluate(challenges.xi));
        proof.addEvaluation("b", polynomials.B.evaluate(challenges.xi));
        proof.addEvaluation("c", polynomials.C.evaluate(challenges.xi));
        proof.addEvaluation("z", polynomials.Z.evaluate(challenges.xi));

        const xiw = Fr.mul(challenges.xi, Fr.w[zkey.power]);
        proof.addEvaluation("zw", polynomials.Z.evaluate(xiw));
        proof.addEvaluation("t1w", polynomials.T1.evaluate(xiw));
        proof.addEvaluation("t2w", polynomials.T2.evaluate(xiw));
    }

    async function round4() {
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
        if (logger) logger.debug("Challenge.alpha: " + Fr.toString(challenges.alpha));

        // STEP 4.2 - Compute F(X)
        // TODO
        await computeF();

        // STEP 4.3 - Compute W1(X)
        // TODO
        await computeW1();

        // The fourth output of the prover is ([W1]_1)
        proof.addPolynomial("W1", await multiExponentiation(polynomials.W1, "W1"));

        return 0;

        async function computeF() {
            polynomials.F = new Polynomial(new BigBuffer(0), Fr, logger);
        }

        async function computeW1() {
            polynomials.W = new Polynomial(new BigBuffer(0), Fr, logger);
        }
    }

    async function round5() {
        // STEP 5.1 - Compute random evaluation point y ∈ F
        const transcript = new Keccak256Transcript(curve);
        transcript.addPolCommitment(proof.getPolynomial("W1"));
        challenges.y = transcript.getChallenge();
        if (logger) logger.debug("Challenge.y: " + Fr.toString(challenges.y));

        // STEP 5.2 - Compute L(X)
        await computeL();

        // STEP 5.3 - Compute W'(X)
        await computeW2();

        // The fifth output of the prover is ([W2]_1)
        proof.addPolynomial("W2", await multiExponentiation(polynomials.W2, "W2"));

        return 0;

        async function computeL() {
            polynomials.L = new Polynomial(new BigBuffer(0), Fr, logger);
        }

        async function computeW2() {
            polynomials.W2 = new Polynomial(new BigBuffer(0), Fr, logger);
        }
    }

    async function multiExponentiation(polynomial, name) {
        const n = polynomial.coef.byteLength / sFr;
        const PTauN = PTau.slice(0, n * sG1);
        const bm = await Fr.batchFromMontgomery(polynomial.coef);
        let res = await G1.multiExpAffine(PTauN, bm, logger, name);
        res = G1.toAffine(res);
        return res;
    }
}




