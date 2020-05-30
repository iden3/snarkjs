
// Format
// ======
// Header
//      Prover Type 1 Groth
// HeaderGroth
//      n8q
//      q
//      n8r
//      r
//      NVars
//      NPub
//      DomainSize  (multiple of 2
//      alfa1
//      beta1
//      delta1
//      beta2
//      gamma2
//      delta2
// IC
// PolA
// PolB
// PointsA
// PointsB1
// PointsB2
// PointsC
// PointsH
// Contributions


const Scalar = require("ffjavascript").Scalar;
const F1Field = require("ffjavascript").F1Field;
const assert = require("assert");
const binFileUtils = require("./binfileutils");
const bn128 = require("ffjavascript").bn128;

module.exports.write = async function writeZKey(fileName, zkey) {

    let curve;
    if (Scalar.eq(zkey.q, bn128.q)) {
        curve = bn128;
    } else {
        assert(false, fd.fileName +": Curve not supported");
    }

    const fd = await binFileUtils.createBinFile(fileName,"zkey", 1, 9);

    // Write the header
    ///////////
    await binFileUtils.startWriteSection(fd, 1);
    await fd.writeULE32(1); // Groth
    await binFileUtils.endWriteSection(fd);

    // Write the Groth header section
    ///////////

    await binFileUtils.startWriteSection(fd, 2);
    const primeQ = zkey.q;
    const n8q = (Math.floor( (Scalar.bitLength(primeQ) - 1) / 64) +1)*8;

    const primeR = zkey.r;
    const n8r = (Math.floor( (Scalar.bitLength(primeR) - 1) / 64) +1)*8;
    const Rr = Scalar.mod(Scalar.shl(1, n8r*8), primeR);
    const R2r = Scalar.mod(Scalar.mul(Rr,Rr), primeR);

    await fd.writeULE32(n8q);
    await binFileUtils.writeBigInt(fd, primeQ, n8q);
    await fd.writeULE32(n8r);
    await binFileUtils.writeBigInt(fd, primeR, n8r);
    await fd.writeULE32(zkey.nVars);                         // Total number of bars
    await fd.writeULE32(zkey.nPublic);                       // Total number of public vars (not including ONE)
    await fd.writeULE32(zkey.domainSize);                  // domainSize
    await writePointG1(zkey.vk_alfa_1);
    await writePointG1(zkey.vk_beta_1);
    await writePointG1(zkey.vk_delta_1);
    await writePointG2(zkey.vk_beta_2);
    await writePointG2(zkey.vk_gamma_2);
    await writePointG2(zkey.vk_delta_2);

    await binFileUtils.endWriteSection(fd);


    // Write IC Section
    ///////////
    await binFileUtils.startWriteSection(fd, 3);
    for (let i=0; i<= zkey.nPublic; i++) {
        await writePointG1(zkey.IC[i] );
    }
    await binFileUtils.endWriteSection(fd);


    // Write Pols (A and B (C can be ommited))
    ///////////
    await binFileUtils.startWriteSection(fd, 4);
    await fd.writeULE32(zkey.ccoefs.length);
    for (let i=0; i<zkey.ccoefs.length; i++) {
        const coef = zkey.ccoefs[i];
        await fd.writeULE32(coef.matrix);
        await fd.writeULE32(coef.constraint);
        await fd.writeULE32(coef.signal);
        await writeFr2(coef.value);
    }
    await binFileUtils.endWriteSection(fd);



    // Write A
    ///////////
    await binFileUtils.startWriteSection(fd, 5);
    for (let i=0; i<zkey.nVars; i++) {
        await writePointG1(zkey.A[i]);
    }
    await binFileUtils.endWriteSection(fd);

    // Write B1
    ///////////
    await binFileUtils.startWriteSection(fd, 6);
    for (let i=0; i<zkey.nVars; i++) {
        await writePointG1(zkey.B1[i]);
    }
    await binFileUtils.endWriteSection(fd);

    // Write B2
    ///////////
    await binFileUtils.startWriteSection(fd, 7);
    for (let i=0; i<zkey.nVars; i++) {
        await writePointG2(zkey.B2[i]);
    }
    await binFileUtils.endWriteSection(fd);

    // Write C
    ///////////
    await binFileUtils.startWriteSection(fd, 8);
    for (let i=zkey.nPublic+1; i<zkey.nVars; i++) {
        await writePointG1(zkey.C[i]);
    }
    await binFileUtils.endWriteSection(fd);


    // Write H points
    ///////////
    await binFileUtils.startWriteSection(fd, 9);
    for (let i=0; i<zkey.domainSize; i++) {
        await writePointG1(zkey.hExps[i]);
    }
    await binFileUtils.endWriteSection(fd);

    await fd.close();

    async function writeFr2(n) {
        // Convert to montgomery
        n = Scalar.mod( Scalar.mul(n, R2r), primeR);

        await binFileUtils.writeBigInt(fd, n, n8r);
    }

    async function writePointG1(p) {
        const buff = new Uint8Array(curve.G1.F.n8*2);
        curve.G1.toRprLEM(buff, 0, p);
        await fd.write(buff);
    }

    async function writePointG2(p) {
        const buff = new Uint8Array(curve.G2.F.n8*2);
        curve.G2.toRprLEM(buff, 0, p);
        await fd.write(buff);
    }
};

module.exports.read = async function readZKey(fileName) {
    const zkey = {};
    const {fd, sections} = await binFileUtils.readBinFile(fileName, "zkey", 1);


    // Read Header
    /////////////////////
    await binFileUtils.startReadUniqueSection(fd, sections, 1);
    const protocol = await fd.readULE32();
    if (protocol != 1) assert("File is not groth");
    zkey.protocol = "groth16";
    await binFileUtils.endReadSection(fd);

    // Read Groth Header
    /////////////////////
    await binFileUtils.startReadUniqueSection(fd, sections, 2);
    const n8q = await fd.readULE32();
    zkey.q = await binFileUtils.readBigInt(fd, n8q);
    const Fq = new F1Field(zkey.q);
    const Rq = Scalar.mod(Scalar.shl(1, n8q*8), zkey.q);
    const Rqi = Fq.inv(Rq);

    const n8r = await fd.readULE32();
    zkey.r = await binFileUtils.readBigInt(fd, n8r);
    const Fr = new F1Field(zkey.r);
    const Rr = Scalar.mod(Scalar.shl(1, n8q*8), zkey.r);
    const Rri = Fr.inv(Rr);
    const Rri2 = Fr.mul(Rri, Rri);

    let curve;
    if (Scalar.eq(zkey.q, bn128.q)) {
        curve = bn128;
    } else {
        assert(false, fd.fileName +": Curve not supported");
    }

    zkey.nVars = await fd.readULE32();
    zkey.nPublic = await fd.readULE32();
    zkey.domainSize = await fd.readULE32();
    zkey.vk_alfa_1 = await readG1();
    zkey.vk_beta_1 = await readG1();
    zkey.vk_delta_1 = await readG1();
    zkey.vk_beta_2 = await readG2();
    zkey.vk_gamma_2 = await readG2();
    zkey.vk_delta_2 = await readG2();
    await binFileUtils.endReadSection(fd);


    // Read IC Section
    ///////////
    await binFileUtils.startReadUniqueSection(fd, sections, 3);
    zkey.IC = [];
    for (let i=0; i<= zkey.nPublic; i++) {
        const P = await readG1();
        zkey.IC.push(P);
    }
    await binFileUtils.endReadSection(fd);


    // Read Coefs
    ///////////
    await binFileUtils.startReadUniqueSection(fd, sections, 4);
    const nCCoefs = await fd.readULE32();
    zkey.ccoefs = [];
    for (let i=0; i<nCCoefs; i++) {
        const m = await fd.readULE32();
        const c = await fd.readULE32();
        const s = await fd.readULE32();
        const v = await readFr2();
        zkey.ccoefs.push({
            matrix: m,
            constraint: c,
            signal: s,
            value: v
        });
    }
    await binFileUtils.endReadSection(fd);

    // Read A points
    ///////////
    await binFileUtils.startReadUniqueSection(fd, sections, 5);
    zkey.A = [];
    for (let i=0; i<zkey.nVars; i++) {
        const A = await readG1();
        zkey.A[i] = A;
    }
    await binFileUtils.endReadSection(fd);


    // Read B1
    ///////////
    await binFileUtils.startReadUniqueSection(fd, sections, 6);
    zkey.B1 = [];
    for (let i=0; i<zkey.nVars; i++) {
        const B1 = await readG1();

        zkey.B1[i] = B1;
    }
    await binFileUtils.endReadSection(fd);


    // Read B2 points
    ///////////
    await binFileUtils.startReadUniqueSection(fd, sections, 7);
    zkey.B2 = [];
    for (let i=0; i<zkey.nVars; i++) {
        const B2 = await readG2();
        zkey.B2[i] = B2;
    }
    await binFileUtils.endReadSection(fd);


    // Read C points
    ///////////
    await binFileUtils.startReadUniqueSection(fd, sections, 8);
    zkey.C = [];
    for (let i=zkey.nPublic+1; i<zkey.nVars; i++) {
        const C = await readG1();

        zkey.C[i] = C;
    }
    await binFileUtils.endReadSection(fd);


    // Read H points
    ///////////
    await binFileUtils.startReadUniqueSection(fd, sections, 9);
    zkey.hExps = [];
    for (let i=0; i<zkey.domainSize; i++) {
        const H = await readG1();
        zkey.hExps.push(H);
    }
    await binFileUtils.endReadSection(fd);

    await fd.close();

    return zkey;

    async function readFr2() {
        const n = await binFileUtils.readBigInt(fd, n8r);
        return Fr.mul(n, Rri2);
    }

    async function readG1() {
        const buff = await fd.read(curve.G1.F.n8*2);
        return curve.G1.fromRprLEM(buff, 0);
    }

    async function readG2() {
        const buff = await fd.read(curve.G2.F.n8*2);
        return curve.G2.fromRprLEM(buff, 0);
    }


};

