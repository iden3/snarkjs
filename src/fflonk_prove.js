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

            // Compute all witness from signal ids and set them to A,B & C buffers
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

            // Compute the coefficients of the wire polynomials a(X), b(X) and c(X) from A,B & C buffers
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

            // Read QR evaluations from zkey file
            if (logger) logger.debug("Reading QR");
            evaluations.QR = new Evaluations(BigBuffer(sDomain * 4), Fr, logger);
            await fdZKey.readToBuffer(evaluations.QR, 0, sDomain * 4, zkeySections[FF_QR_ZKEY_SECTION][0].p + sDomain);

            // Read QM evaluations from zkey file
            if (logger) logger.debug("Reading QM");
            evaluations.QM = new Evaluations(BigBuffer(sDomain * 4), Fr, logger);
            await fdZKey.readToBuffer(evaluations.QM, 0, sDomain * 4, zkeySections[FF_QM_ZKEY_SECTION][0].p + sDomain);

            // Read QO evaluations from zkey file
            if (logger) logger.debug("Reading QO");
            evaluations.QO = new Evaluations(BigBuffer(sDomain * 4), Fr, logger);
            await fdZKey.readToBuffer(evaluations.QO, 0, sDomain * 4, zkeySections[FF_QO_ZKEY_SECTION][0].p + sDomain);

            // Read QC evaluations from zkey file
            if (logger) logger.debug("Reading QC");
            evaluations.QC = new Evaluations(BigBuffer(sDomain * 4), Fr, logger);
            await fdZKey.readToBuffer(evaluations.QC, 0, sDomain * 4, zkeySections[FF_QC_ZKEY_SECTION][0].p + sDomain);

            // Read Lagrange polynomials & evaluations from zkey file
            const lagrangePolynomials = await binFileUtils.readSection(fdZKey, zkeySections, FF_LAGRANGE_ZKEY_SECTION);
            evaluations.lagrange1 = new Evaluations(lagrangePolynomials, Fr, logger);

            buffers.T0 = new BigBuffer(sDomain * 4);
            buffers.T0z = new BigBuffer(sDomain * 4);

            if(logger) logger.debug("Computing T0");
            // Initial omega
            let omega = Fr.one;
            for (let i = 0; i < settings.domainSize; i++) {
                if (logger && (i % 5000 === 0)) logger.debug(`Computing T0 evaluation ${i}/${zkey.domainSize * 4}`);

                const i_sFr = i * sFr;

                // Get related evaluations to compute current T0 evaluation
                const a = evaluations.A.get(i_sFr);
                const b = evaluations.B.get(i_sFr);
                const c = evaluations.C.get(i_sFr);

                const ql = evaluations.QL.get(i_sFr);
                const qr = evaluations.QR.get(i_sFr);
                const qm = evaluations.QM.get(i_sFr);
                const qo = evaluations.QO.get(i_sFr);
                const qc = evaluations.QC.get(i_sFr);

                // Compute blinding factors
                const ap = Fr.add(Fr.mul(challenges.b[1], omega), challenges.b[2]);
                const bp = Fr.add(Fr.mul(challenges.b[3], omega), challenges.b[4]);
                const cp = Fr.add(Fr.mul(challenges.b[5], omega), challenges.b[6]);

                // Compute current public input TODO check
                let pi = Fr.zero;
                for (let j = 0; j < zkey.nPublic; j++) {
                    const offset = (j * 5 * zkey.domainSize + zkey.domainSize + i) * sFr;

                    const lPol = evaluations.lagrange1.get(offset);
                    const aVal = evaluations.A.get(j * sFr);

                    pi = Fr.sub(pi, Fr.mul(lPol, aVal));
                }

                //T0(X) = [q_L(X)·a(X) + q_R(X)·b(X) + q_M(X)·a(X)·b(X) + q_O(X)·c(X) + q_C(X) + PI(X)] · 1/Z_H(X)
                // Compute first T0(X)·Z_H(X), so divide later the resulting polynomial by Z_H(X)
                // expression 1 -> q_L(X)·a(X)
                const e1 = Fr.mul(a, ql);
                const e1z = Fr.mul(ap, ql);

                // expression 2 -> q_R(X)·b(X)
                const e2 = Fr.mul(b, qr);
                const e2z = Fr.mul(bp, qr);

                // expression 3 -> q_M(X)·a(X)·b(X)
                let [e3, e3z] = MulZ.mul2(a, b, ap, bp, i % 4);
                e3 = Fr.mul(e3, qm);
                e3z = Fr.mul(e3z, qm);

                // expression 4 -> q_O(X)·c(X)
                const e4 = Fr.mul(c, qo);
                const e4z = Fr.mul(cp, qo);

                // t0 = expressions 1 + expression 2 + expression 3 + expression 4 + qc + pi
                const t0 = Fr.add(e1, Fr.add(e2, Fr.add(e3, Fr.add(e4, Fr.add(qc, pi)))));
                const t0z = Fr.add(e1z, Fr.add(e2z, Fr.add(e3z, e4z)));

                buffers.T0.set(t0, i_sFr);
                buffers.T0z.set(t0z, i_sFr);

                // Next omega
                omega = Fr.mul(omega, Fr.w[zkey.power + 2]);
            }

            // Compute the coefficients of the polynomial T0(X) from buffers.T0
            if (logger) logger.debug("Computing T0 ifft");
            polynomials.T0 = await Polynomial.fromBuffer(buffers.T0, Fr, logger);

            // Divide the polynomial T0 by Z_H(X)
            polynomials.T0 = await polynomials.T0.divZh(settings.domainSize);

            // Compute the coefficients of the polynomial T0z(X) from buffers.T0z
            if (logger) logger.debug("Computing T0z ifft");
            polynomials.T0z = await Polynomial.fromBuffer(buffers.T0z, Fr, logger);

            // Add the polynomial T0z to T0 to get the final polynomial T0
            polynomials.T0.add(polynomials.T0z);

            // Is this correct? Check it doesn't remove the T0 coefficients
            delete polynomials.T0z;
        }

        async function computeC1() {
            // Compute the polynomial A(X^4) from buffers.A
            polynomials.A_4 = Polynomial.computePolynomialXExp(buffers.A, 4, Fr, logger);
            // Compute the polynomial B(X^4) from buffers.B
            polynomials.B_4 = Polynomial.computePolynomialXExp(buffers.B, 4, Fr, logger);
            // Compute the polynomial C(X^4) from buffers.C
            polynomials.C_4 = Polynomial.computePolynomialXExp(buffers.C, 4, Fr, logger);
            // Compute the polynomial D(X^4) from buffers.D
            polynomials.T0_4 = Polynomial.computePolynomialXExp(buffers.T0, 4, Fr, logger);

            // C1(X) := a(X^4) + X · b(X^4) + X^2 · c(X^4) + X^3 · T0(X^4)
            // Get X^n · f(X) by shifting the f(x) coefficients n positions,
            // the resulting polynomial will be degree deg(f(X)) + n

            // Compute degree of the new polynomial C1 to reserve the buffer memory size
            // Will be the maximum(deg(A_4), deg(B_4)+1, deg(C_4)+2, deg(T0_4)+3)
            const length = Math.max(polynomials.A_4.length,
                polynomials.B_4.length + 1,
                polynomials.C_4.length + 2,
                polynomials.T0_4.length + 3);
            polynomials.C1 = new Polynomial(new BigBuffer(length * sFr, Fr, logger));

            for (let i = 0; i < length; i++) {
                const i_sFr = i * sFr;

                let val = polynomials.A_4.getCoef(i);
                // Following polynomials are multiplied by X^n, so the coefficienst are shifted n positions
                if (i > 0) val = Fr.add(val, polynomials.B_4.getCoef(i - 1));
                if (i > 1) val = Fr.add(val, polynomials.C_4.getCoef(i - 2));
                if (i > 2) val = Fr.add(val, polynomials.T0_4.getCoef(i - 3));

                polynomials.C1.coef.set(val, i_sFr);
            }
        }
    }

    async function round2() {
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
        await computeT1();
        await computeT2();

        // STEP 2.4 - Compute the FFT-style combination polynomial C2(X)
        await computeC2();

        // The second output of the prover is ([C2]_1)
        proof.addPolynomial("C2", await multiExponentiation(polynomials.C2, "C2"));

        return 0;

        async function computeZ() {
            let numArr = new BigBuffer(sDomain);
            let denArr = new BigBuffer(sDomain);

            // Set the first values to 1
            numArr.set(Fr.one, 0);
            denArr.set(Fr.one, 0);

            if(logger) logger.debug("Computing Z");
            // Set initial omega
            let w = Fr.one;
            for (let i = 0; i < zkey.domainSize; i++) {
                if (logger && (i % 5000 === 0)) logger.debug(`Computing Z evaluation ${i}/${zkey.domainSize * 4}`);
                const i_sFr = i * sFr;

                // Z(X) := numArr / denArr
                // numArr := (a + beta·ω + gamma)(b + beta·ω·k1 + gamma)(c + beta·ω·k2 + gamma)
                const betaw = Fr.mul(challenges.beta, w);

                let num1 = evaluations.A.get(i_sFr);
                num1 = Fr.add(num1, betaw);
                num1 = Fr.add(num1, challenges.gamma);

                let num2 = evaluations.B.get(i_sFr);
                num2 = Fr.add(num2, Fr.mul(zkey.k1, betaw));
                num2 = Fr.add(num2, challenges.gamma);

                let num3 = evaluations.C.get(i_sFr);
                num3 = Fr.add(num3, Fr.mul(zkey.k2, betaw));
                num3 = Fr.add(num3, challenges.gamma);

                let num = Fr.mul(num1, Fr.mul(num2, num3));

                // denArr := (a + beta·sigma1 + gamma)(b + beta·sigma2 + gamma)(c + beta·sigma3 + gamma)
                let den1 = evaluations.A.get(i_sFr);
                den1 = Fr.add(den1, Fr.mul(challenges.beta, evaluations.S1.get(i_sFr * 4)));
                den1 = Fr.add(den1, challenges.gamma);

                let den2 = evaluations.B.get(i_sFr);
                den2 = Fr.add(den2, Fr.mul(challenges.beta, evaluations.S2.get(i_sFr * 4)));
                den2 = Fr.add(den2, challenges.gamma);

                let den3 = evaluations.C.get(i_sFr);
                den3 = Fr.add(den3, Fr.mul(challenges.beta, evaluations.S3.get(i_sFr * 4)));
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
            // Multiply numArr · denArr where denArr was inversed in the previous command
            for (let i = 0; i < zkey.domainSize; i++) {
                const i_sFr = i * sFr;

                const z = Fr.mul(numArr.slice(i_sFr, i_sFr + sFr), denArr.slice(i_sFr, i_sFr + sFr));
                numArr.set(z, i_sFr);
            }
            // From now on the values saved on numArr will be Z(X) buffer
            buffers.Z = numArr;

            // TODO check if it's valid
            if (!Fr.eq(numArr.slice(0, sFr), Fr.one)) {
                throw new Error("Copy constraints does not match");
            }

            // Compute polynomial coefficients z(X) from buffers.Z
            polynomials.Z = await Polynomial.fromBuffer(buffers.Z, Fr, logger);

            if (polynomials.Z.degree() >= settings.domainSize + 3) {
                throw new Error("range_check: Z Polynomial is not well calculated");
            }

            // Compute extended evaluations of z(X) polynomial
            evaluations.Z = await Evaluations.fromPolynomial(polynomials.Z, Fr, logger);

            // Blind z(X) polynomial coefficients with blinding scalars b
            polynomials.Z.blindCoefficients([challenges.b[7], challenges.b[8], challenges.b[9]]);
        }

        async function computeT1() {
            buffers.T1 = new BigBuffer(sDomain * 4);
            buffers.T1z = new BigBuffer(sDomain * 4);

            if(logger) logger.debug("Computing T1");
            // Set initial omega
            let omega = Fr.one;
            for (let i = 0; i < zkey.domainSize * 4; i++) {
                if ((i % 5000 === 0) && (logger)) logger.debug(`Computing t1 evaluation ${i}/${zkey.domainSize * 4}`);

                const i_sFr = i * sFr;
                const omega2 = Fr.square(omega);

                const z = evaluations.Z.get(i_sFr);
                const zp = Fr.add(Fr.add(Fr.mul(challenges.b[7], omega2), Fr.mul(challenges.b[8], omega)), challenges.b[9]);

                // T1(X) := (z(X) - 1) · L_1(X)
                // Compute first T1(X)·Z_H(X), so divide later the resulting polynomial by Z_H(X)
                
                // TODO Check offset is ok
                const offset = (zkey.domainSize + i) * sFr;
                let t1 = Fr.mul(Fr.sub(z, Fr.one), evaluations.lagrange1.get(offset));
                let t1z = Fr.mul(zp, evaluations.lagrange1.get(offset));

                buffers.T1.set(t1, i_sFr);
                buffers.T1z.set(t1z, i_sFr);

                // Compute next omega
                omega = Fr.mul(omega, Fr.w[zkey.power + 2]);
            }

            // Compute the coefficients of the polynomial T1(X) from buffers.T1
            if (logger) logger.debug("Computing T1 ifft");
            polynomials.T1 = await Polynomial.fromBuffer(buffers.T1, Fr, logger);

            // Divide the polynomial T1 by Z_H(X)
            polynomials.T1 = await polynomials.T1.divZh(settings.domainSize);

            // Compute the coefficients of the polynomial T1z(X) from buffers.T1z
            if (logger) logger.debug("Computing T1z ifft");
            polynomials.T1z = await Polynomial.fromBuffer(buffers.T1z, Fr, logger);

            // Add the polynomial T0z to T0 to get the final polynomial T0
            polynomials.T1.add(polynomials.T1z);

            // Is this correct? Check it doesn't remove the T1 coefficients
            delete polynomials.T1z;
        }

        async function computeT2() {
            buffers.T2 = new BigBuffer(sDomain * 4);
            buffers.T2z = new BigBuffer(sDomain * 4);

            if(logger) logger.debug("Computing T1");
            // Set initial omega
            let omega = Fr.one;
            for (let i = 0; i < zkey.domainSize * 4; i++) {
                if ((i % 5000 === 0) && (logger)) logger.debug(`Computing t2 evaluation ${i}/${zkey.domainSize * 4}`);

                const i_sFr = i * sFr;
                const i_sFrw = ((i + zkey.domainSize * 4 + 4) % (zkey.domainSize * 4)) * sFr;

                const omega2 = Fr.square(omega);
                const omegaW = Fr.mul(omega, Fr.w[zkey.power]);
                const omegaW2 = Fr.square(omegaW);

                const a = evaluations.A.get(i_sFr);
                const b = evaluations.B.get(i_sFr);
                const c = evaluations.C.get(i_sFr);
                const z = evaluations.Z.get(i_sFr);
                const zW = evaluations.Z.get(i_sFrw);

                const ap = Fr.add(Fr.mul(challenges.b[1], omega), challenges.b[2]);
                const bp = Fr.add(Fr.mul(challenges.b[3], omega), challenges.b[4]);
                const cp = Fr.add(Fr.mul(challenges.b[5], omega), challenges.b[6]);
                const zp = Fr.add(Fr.add(Fr.mul(challenges.b[7], omega2), Fr.mul(challenges.b[8], omega)), challenges.b[9]);
                const zWp = Fr.add(Fr.add(Fr.mul(challenges.b[7], omegaW2), Fr.mul(challenges.b[8], omegaW)), challenges.b[9]);

                const s1 = evaluations.S1.get(i_sFr);
                const s2 = evaluations.S2.get(i_sFr);
                const s3 = evaluations.S3.get(i_sFr);

                // T2(X) := [ (a(X) + beta·X + gamma)(b(X) + beta·k1·X + gamma)(c(X) + beta·k2·X + gamma)z(X)
                //           -(a(X) + beta·s1(X) + gamma)(b(X) + beta·s2(X) + gamma)(c(X) + beta·s3(X) + gamma)z(Xω)] · 1/Z_H(X)
                // Compute first T2(X)·Z_H(X), so divide later the resulting polynomial by Z_H(X)

                // expression 1 -> (a(X) + beta·X + gamma)(b(X) + beta·k1·X + gamma)(c(X) + beta·k2·X + gamma)z(X)
                const betaX = Fr.mul(challenges.beta, omega);
                let e11 = Fr.add(a, betaX);
                e11 = Fr.add(e11, challenges.gamma);

                let e12 = Fr.add(b, Fr.mul(betaX, zkey.k1));
                e12 = Fr.add(e12, challenges.gamma);

                let e13 = Fr.add(c, Fr.mul(betaX, zkey.k2));
                e13 = Fr.add(e13, challenges.gamma);

                const [e1, e1z] = MulZ.mul4(e11, e12, e13, z, ap, bp, cp, zp, i % 4);

                // expression 2 -> (a(X) + beta·s1(X) + gamma)(b(X) + beta·s2(X) + gamma)(c(X) + beta·s3(X) + gamma)z(Xω)
                let e21 = a;
                e21 = Fr.add(e21, Fr.mul(challenges.beta, s1));
                e21 = Fr.add(e21, challenges.gamma);

                let e22 = b;
                e22 = Fr.add(e22, Fr.mul(challenges.beta, s2));
                e22 = Fr.add(e22, challenges.gamma);

                let e23 = c;
                e23 = Fr.add(e23, Fr.mul(challenges.beta, s3));
                e23 = Fr.add(e23, challenges.gamma);

                const [e2, e2z] = MulZ.mul4(e21, e22, e23, zW, ap, bp, cp, zWp, i % 4);

                let t2 = Fr.sub(e1, e2);
                let t2z = Fr.sub(e1z, e2z);

                buffers.T2.set(t2, i_sFr);
                buffers.T2z.set(t2z, i_sFr);

                // Compute next omega
                omega = Fr.mul(omega, Fr.w[zkey.power + 2]);
            }

            // Compute the coefficients of the polynomial T2(X) from buffers.T2
            if (logger) logger.debug("Computing T2 ifft");
            polynomials.T2 = await Polynomial.fromBuffer(buffers.T2, Fr, logger);

            // Divide the polynomial T2 by Z_H(X)
            polynomials.T2 = await polynomials.T2.divZh(settings.domainSize);

            // Compute the coefficients of the polynomial T2z(X) from buffers.T2z
            if (logger) logger.debug("Computing T2z ifft");
            polynomials.T2z = await Polynomial.fromBuffer(buffers.T2z, Fr, logger);

            // Add the polynomial T2z to T2 to get the final polynomial T2
            polynomials.T2.add(polynomials.T2z);

            // Is this correct? Check it doesn't remove the T2 coefficients
            delete polynomials.T2z;
        }

        async function computeC2() {
            // Compute the polynomial z(X^3) from buffers.Z
            polynomials.Z_3 = Polynomial.computePolynomialXExp(buffers.Z, 3, Fr, logger);
            // Compute the polynomial T1(X^3) from buffers.Z
            polynomials.T1_3 = Polynomial.computePolynomialXExp(buffers.T1, 3, Fr, logger);
            // Compute the polynomial T2(X^3) from buffers.Z
            polynomials.T2_3 = Polynomial.computePolynomialXExp(buffers.T2, 3, Fr, logger);

            // C2(X) := z(X^3) + X · T1(X^3) + X^2 · T2(X^3)
            // Get X^n · f(X) by shifting the f(x) coefficients n positions,
            // the resulting polynomial will be degree deg(f(X)) + n

            // Compute degree of the new polynomial C2(X) to reserve the buffer memory size
            // Will be the maximum(deg(Z_3), deg(T1_3)+1, deg(T2_3)+2)
            const length = Math.max(polynomials.Z_3.length,
                polynomials.T1_3.length + 1,
                polynomials.T2_3.length + 2);
            polynomials.C2 = new Polynomial(new BigBuffer(length * sFr, Fr, logger));

            for (let i = 0; i < length; i++) {
                const i_sFr = i * sFr;

                let val = polynomials.Z_3.getCoef(i);
                // Following polynomials are multiplied by X^n, so the coefficienst are shifted n positions
                if (i > 0) val = Fr.add(val, polynomials.T1_3.getCoef(i - 1));
                if (i > 1) val = Fr.add(val, polynomials.T2_3.getCoef(i - 2));

                polynomials.C2.coef.set(val, i_sFr);
            }
        }
    }

    async function round3() {
        // STEP 3.1 - Compute evaluation challenge xi ∈ S
        const transcript = new Keccak256Transcript(curve);
        transcript.addPolCommitment(proof.getPolynomial("C2"));
        // Obtain a xi_seeder from the transcript
        // To force h1^4 = xi, h2^3 = xi and h_3^2 = xiω
        // we compute xi = xi_seeder^12, h1 = xi_seeder^3, h2 = xi_seeder^4 and h3 = xi_seeder^6
        challenges.xiSeed = transcript.getChallenge();
        challenges.xiSeed2 = Fr.square(challenges.xiSeed);

        // Compute h1 = xi_seeder^3
        challenges.h1 = Fr.mul(challenges.xiSeed2, challenges.xiSeed);

        // Compute h2 = xi_seeder^4
        challenges.h2 = Fr.square(challenges.xiSeed2);

        // Compute h3 = xi_seeder^6
        challenges.h3 = Fr.mul(challenges.h2, challenges.xiSeed2);

        // Compute xi = xi_seeder^12
        challenges.xi = Fr.square(challenges.h3);

        // Multiply h3 by omega to obtain h_3^2 = xiω
        challenges.h3 = Fr.mul(challenges.h3, Fr.w[zkey.power]);

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
        await computeF();

        // The fourth output of the prover is ([W1]_1), where W1:=(f/Z_t)(x)
        proof.addPolynomial("W1", await multiExponentiation(polynomials.F, "W1"));

        return 0;

        async function computeF() {
            buffers.F = new BigBuffer(sDomain * 4);

            challenges.h2w3 = Fr.zero; //TODO
            challenges.h2w3_2 = Fr.zero; //TODO
            challenges.h3w3 = Fr.zero; //TODO
            challenges.h3w3_2 = Fr.zero; //TODO
            challenges.h1w4 = Fr.zero; //TODO
            challenges.h1w4_2 = Fr.zero; //TODO
            challenges.h1w4_3 = Fr.zero; //TODO

            // TODO compute r1
            // TODO compute r2

            let omega = Fr.one;
            for (let i = 0; i < zkey.domainSize * 4; i++) {
                if ((i % 5000 === 0) && (logger)) logger.debug(`Computing F evaluation ${i}/${zkey.domainSize * 4}`);

                const i_sFr = i * sFr;

                let e1 = Fr.sub(omega, challenges.h2);
                e1 = Fr.mul(e1, Fr.sub(omega, challenges.h2w3));
                e1 = Fr.mul(e1, Fr.sub(omega, challenges.h2w3_2));
                e1 = Fr.mul(e1, Fr.sub(omega, challenges.h3));
                e1 = Fr.mul(e1, Fr.sub(omega, challenges.h3w3));
                e1 = Fr.mul(e1, Fr.sub(omega, challenges.h3w3_2));
                e1 = Fr.mul(e1, Fr.sub(omega, challenges.h2)); // TODO C1(X) - r1(X)

                let e2 = Fr.mul(challenges.alpha, Fr.sub(omega, challenges.h1));
                e2 = Fr.mul(e2, Fr.sub(omega, challenges.h1w4));
                e2 = Fr.mul(e2, Fr.sub(omega, challenges.h1w4_2));
                e2 = Fr.mul(e2, Fr.sub(omega, challenges.h1w4_3));
                e2 = Fr.mul(e2, Fr.sub(omega, challenges.h2)); // TODO C2(X) - r2(X)

                let e = Fr.add(e1, e2);

                buffers.F.set(e, i_sFr);

                // Compute next omega
                omega = Fr.mul(omega, Fr.w[zkey.power + 2]);
            }

            if (logger) logger.debug("Computing F ifft");
            polynomials.F = await Polynomial.fromBuffer(buffers.F, Fr, logger);
            polynomials.F = await polynomials.F.divZt(settings.domainSize); // TODO
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

        // The fifth output of the prover is ([W2]_1), where W2:=(f/Z_t)(x) //TODO
        proof.addPolynomial("W2", await multiExponentiation(polynomials.L, "W2"));

        return 0;

        async function computeL() {
            buffers.L = new BigBuffer(sDomain * 4);

            // TODO compute r1
            // TODO compute r2

            let omega = Fr.one;
            for (let i = 0; i < zkey.domainSize * 4; i++) {
                if ((i % 5000 === 0) && (logger)) logger.debug(`Computing L evaluation ${i}/${zkey.domainSize * 4}`);

                const i_sFr = i * sFr;

                let e1 = Fr.sub(challenges.y, challenges.h2);
                e1 = Fr.mul(e1, Fr.sub(challenges.y, challenges.h2w3));
                e1 = Fr.mul(e1, Fr.sub(challenges.y, challenges.h2w3_2));
                e1 = Fr.mul(e1, Fr.sub(challenges.y, challenges.h3));
                e1 = Fr.mul(e1, Fr.sub(challenges.y, challenges.h3w3));
                e1 = Fr.mul(e1, Fr.sub(challenges.y, challenges.h3w3_2));
                e1 = Fr.mul(e1, Fr.sub(challenges.y, challenges.h2)); // TODO C1(X) - r1(X)

                let e2 = Fr.mul(challenges.alpha, Fr.sub(challenges.y, challenges.h1));
                e2 = Fr.mul(e2, Fr.sub(challenges.y, challenges.h1w4));
                e2 = Fr.mul(e2, Fr.sub(challenges.y, challenges.h1w4_2));
                e2 = Fr.mul(e2, Fr.sub(challenges.y, challenges.h1w4_3));
                e2 = Fr.mul(e2, Fr.sub(challenges.y, challenges.h2)); // TODO C2(X) - r2(X)

                let e3 = Fr.zero; //TODO
                let e = Fr.sub(Fr.add(e1, e2), e3);

                buffers.L.set(e, i_sFr);

                // Compute next omega
                omega = Fr.mul(omega, Fr.w[zkey.power + 2]);
            }

            if (logger) logger.debug("Computing F ifft");
            polynomials.L = await Polynomial.fromBuffer(buffers.L, Fr, logger);
            polynomials.L = await polynomials.F.divZt(settings.domainSize); // TODO
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




