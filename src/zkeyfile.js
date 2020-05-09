
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
const fastFile = require("fastfile");
const assert = require("assert");

module.exports.write = async function writeZKey(fileName, zkey) {

    const fd = await fastFile.createOverride(fileName);

    await fd.write(Buffer.from("zkey"), 0); // Magic "r1cs"

    let p = 4;
    await writeU32(1); // Version
    await writeU32(6); // Number of Sections

    // Write the header
    ///////////
    await writeU32(1); // Header type
    const pHeaderSize = p;
    await writeU64(0); // Temporally set to 0 length

    await writeU32(1); // Groth

    const headerSize = p - pHeaderSize - 8;


    // Write the Groth header section
    ///////////

    const primeQ = zkey.q;
    const Fq = new F1Field(zkey.q);
    const n8q = (Math.floor( (Scalar.bitLength(primeQ) - 1) / 64) +1)*8;
    const Rq = Scalar.mod(Scalar.shl(1, n8q*8), primeQ);

    const primeR = zkey.r;
    const Fr = new F1Field(zkey.r);
    const n8r = (Math.floor( (Scalar.bitLength(primeR) - 1) / 64) +1)*8;
    const Rr = Scalar.mod(Scalar.shl(1, n8r*8), primeR);
    const R2r = Scalar.mod(Scalar.mul(Rr,Rr), primeR);

    // Field Def


    await writeU32(2); // Constraints type
    const pGrothHeader = p;
    await writeU64(0); // Temporally set to 0 length


    await writeU32(n8q);
    await writeBigIntQ(primeQ);
    await writeU32(n8r);
    await writeBigIntR(primeR);
    await writeU32(zkey.nVars);                         // Total number of bars
    await writeU32(zkey.nPublic);                       // Total number of public vars (not including ONE)
    await writeU32(zkey.domainSize);                  // domainSize
    await writePointG1(zkey.vk_alfa_1);
    await writePointG1(zkey.vk_beta_1);
    await writePointG1(zkey.vk_delta_1);
    await writePointG2(zkey.vk_beta_2);
    await writePointG2(zkey.vk_gamma_2);
    await writePointG2(zkey.vk_delta_2);

    const grothHeaderSize = p - pGrothHeader - 8;


    // Write IC Section
    ///////////
    await writeU32(3); // IC
    const pIc = p;
    await writeU64(0); // Temporally set to 0 length
    for (let i=0; i<= zkey.nPublic; i++) {
        await writePointG1(zkey.IC[i] );
    }
    const icSize  = p - pIc -8;


    // Write Pol A
    ///////////
    await writeU32(4); // A Pols
    const pCoefs = p;
    await writeU64(0); // Temporally set to 0 length

    await writeU32(zkey.ccoefs.length);
    for (let i=0; i<zkey.ccoefs.length; i++) {
        const coef = zkey.ccoefs[i];
        await writeU32(coef.matrix);
        await writeU32(coef.constraint);
        await writeU32(coef.signal);
        await writeFr2(coef.value);
    }
    const coefsSize = p - pCoefs -8;


    // Write A B1 B2 C points
    ///////////
    await writeU32(5); // A B1 B2 C points
    const pPointsAB1B2C = p;
    await writeU64(0); // Temporally set to 0 length
    for (let i=0; i<zkey.nVars; i++) {
        await writePointG1(zkey.A[i]);
        await writePointG1(zkey.B1[i]);
        await writePointG2(zkey.B2[i]);
        if (i<=zkey.nPublic) {
            await writePointG1_zero();
        } else {
            await writePointG1(zkey.C[i]);
        }
    }
    const pointsAB1B2CSize = p - pPointsAB1B2C - 8;

    // Write H points
    ///////////
    await writeU32(6); // H Points
    const pPointsH = p;
    await writeU64(0); // Temporally set to 0 length
    for (let i=0; i<zkey.domainSize; i++) {
        await writePointG1(zkey.hExps[i]);
    }
    const pointsHsize = p - pPointsH -8;


    // Write sizes
    await writeU64(headerSize, pHeaderSize);
    await writeU64(grothHeaderSize, pGrothHeader);
    await writeU64(icSize, pIc);
    await writeU64(coefsSize, pCoefs);
    await writeU64(pointsAB1B2CSize, pPointsAB1B2C);
    await writeU64(pointsHsize, pPointsH);

    await fd.close();

    async function writeU32(v, pos) {
        let o = (typeof pos == "undefined") ? p : pos;

        const b = Buffer.allocUnsafe(4);
        b.writeInt32LE(v);

        await fd.write(b, o);

        if (typeof(pos) == "undefined") p += 4;
    }

    async function writeU64(v, pos) {
        let o = (typeof pos == "undefined") ? p : pos;

        const b = Buffer.allocUnsafe(8);

        const LSB = v & 0xFFFFFFFF;
        const MSB = Math.floor(v / 0x100000000);
        b.writeInt32LE(LSB, 0);
        b.writeInt32LE(MSB, 4);

        await fd.write(b, o);

        if (typeof(pos) == "undefined") p += 8;
    }

    async function writeBigIntQ(n, pos) {

        let o = (typeof pos == "undefined") ? p : pos;

        const s = n.toString(16);
        const b = Buffer.from(s.padStart(n8q*2, "0"), "hex");
        const buff = Buffer.allocUnsafe(b.length);
        for (let i=0; i<b.length; i++) buff[i] = b[b.length-1-i];

        await fd.write(buff, o);

        if (typeof(pos) == "undefined") p += n8q;
    }

    async function writeBigIntR(n, pos) {

        let o = (typeof pos == "undefined") ? p : pos;

        const s = n.toString(16);
        const b = Buffer.from(s.padStart(n8r*2, "0"), "hex");
        const buff = Buffer.allocUnsafe(b.length);
        for (let i=0; i<b.length; i++) buff[i] = b[b.length-1-i];

        await fd.write(buff, o);

        if (typeof(pos) == "undefined") p += n8r;
    }

    async function writeFr2(n) {
        // Convert to montgomery
        n = Scalar.mod( Scalar.mul(n, R2r), primeR);

        await writeBigIntR(n);
    }

    async function writeFq(n) {
        // Convert to montgomery
        n = Scalar.mod( Scalar.mul(n, Rq), primeQ);

        await writeBigIntQ(n);
    }

    async function writePointG1(p) {
        if (Fq.isZero(p[2])) {
            await writeFq(0);
            await writeFq(0);
        } else {
            await writeFq(p[0]);
            await writeFq(p[1]);
        }
    }

    async function writePointG1_zero() {
        await writeFq(0);
        await writeFq(0);
    }

    async function writePointG2(p) {
        if (Fq.isZero(p[2][0]) && Fq.isZero(p[2][1])) {
            await writeFq(Fq.e(0));
            await writeFq(Fq.e(0));
            await writeFq(Fq.e(0));
            await writeFq(Fq.e(0));

        } else {
            await writeFq(p[0][0]);
            await writeFq(p[0][1]);
            await writeFq(p[1][0]);
            await writeFq(p[1][1]);
        }
    }
};

module.exports.read = async function readZKey(fileName) {
    const zkey = {};
    const fd = await fastFile.readExisting(fileName);

    const b = await fd.read(0, 4);

    if (b.toString() != "zkey") assert(false, "Invalid File format");

    let p=4;

    let v = await readU32();

    if (v>1) assert(false, "Version not supported");

    const nSections = await readU32();

    // Scan sections
    let sections = [];
    for (let i=0; i<nSections; i++) {
        let ht = await readU32();
        let hl = await readU64();
        if (typeof sections[ht] == "undefined") sections[ht] = [];
        sections[ht].push({
            p: p,
            size: hl
        });
        p += hl;
    }

    // Read Header
    /////////////////////
    if (sections[1].length==0)  assert(false, "File has no header");
    if (sections[1].length>1) assert(false, "File has more than one header");

    p = sections[1][0].p;
    const protocol = await readU32();
    if (protocol != 1) assert("File is not groth");
    if (p != sections[1][0].p + sections[1][0].size) assert(false, "Invalid header section size");

    // Read Groth Header
    /////////////////////
    if (sections[2].length==0)  assert(false, "File has no groth header");
    if (sections[2].length>1) assert(false, "File has more than one groth header");

    zkey.protocol = "groth16";

    p = sections[2][0].p;
    const n8q = await readU32();
    zkey.q = await readBigIntQ();
    const Fq = new F1Field(zkey.q);
    const Rq = Scalar.mod(Scalar.shl(1, n8q*8), zkey.q);
    const Rqi = Fq.inv(Rq);

    const n8r = await readU32();
    zkey.r = await readBigIntR();
    const Fr = new F1Field(zkey.r);
    const Rr = Scalar.mod(Scalar.shl(1, n8q*8), zkey.r);
    const Rri = Fr.inv(Rr);
    const Rri2 = Fr.mul(Rri, Rri);


    zkey.nVars = await readU32();
    zkey.nPublic = await readU32();
    zkey.domainSize = await readU32();
    zkey.vk_alfa_1 = await readG1();
    zkey.vk_beta_1 = await readG1();
    zkey.vk_delta_1 = await readG1();
    zkey.vk_beta_2 = await readG2();
    zkey.vk_gamma_2 = await readG2();
    zkey.vk_delta_2 = await readG2();
    if (p != sections[2][0].p + sections[2][0].size) assert(false, "Invalid groth header section size");


    // Read IC Section
    ///////////
    if (sections[3].length==0)  assert(false, "File has no IC section");
    if (sections[3].length>1) assert(false, "File has more than one IC section");
    p = sections[3][0].p;
    zkey.IC = [];
    for (let i=0; i<= zkey.nPublic; i++) {
        const P = await readG1();
        zkey.IC.push(P);
    }
    if (p != sections[3][0].p + sections[3][0].size) assert(false, "Invalid IC section size");


    // Read Coefs
    ///////////
    if (sections[4].length==0)  assert(false, "File has no PolA section");
    if (sections[4].length>1) assert(false, "File has more than one PolA section");
    p = sections[4][0].p;
    const nCCoefs = await readU32();
    zkey.ccoefs = [];
    for (let i=0; i<nCCoefs; i++) {
        const m = await readU32();
        const c = await readU32();
        const s = await readU32();
        const v = await readFr2();
        zkey.ccoefs.push({
            matrix: m,
            constraint: c,
            signal: s,
            value: v
        });
    }
    if (p != sections[4][0].p + sections[4][0].size) assert(false, "Invalid PolsA section size");

    // Read A B1 B2 C points
    ///////////
    if (sections[5].length==0)  assert(false, "File has no AB1B2C section");
    if (sections[5].length>1) assert(false, "File has more than one AB1B2C section");
    p = sections[5][0].p;
    zkey.A = [];
    zkey.B1 = [];
    zkey.B2 = [];
    zkey.C = [];
    for (let i=0; i<zkey.nVars; i++) {
        const A = await readG1();
        const B1 = await readG1();
        const B2 = await readG2();
        const C = await readG1();

        zkey.A.push(A);
        zkey.B1.push(B1);
        zkey.B2.push(B2);
        zkey.C.push(C);
        if (i<= zkey.nPublic) {
            assert(Fr.isZero(C[2]), "C value for public is not zero");
        }
    }
    if (p != sections[5][0].p + sections[5][0].size) assert(false, "Invalid AB1B2C section size");

    // Read H points
    ///////////
    if (sections[6].length==0)  assert(false, "File has no H section");
    if (sections[6].length>1) assert(false, "File has more than one H section");
    p = sections[6][0].p;
    zkey.hExps = [];
    for (let i=0; i<zkey.domainSize; i++) {
        const H = await readG1();
        zkey.hExps.push(H);
    }
    if (p != sections[6][0].p + sections[6][0].size) assert(false, "Invalid H section size");

    await fd.close();

    return zkey;

    async function readU32() {
        const b = await fd.read(p, 4);

        p+=4;

        return b.readUInt32LE(0);
    }

    async function readU64() {
        const b = await fd.read(p, 8);

        p+=8;

        const LS = b.readUInt32LE(0);
        const MS = b.readUInt32LE(4);

        return MS * 0x100000000 + LS;
    }

    async function readBigIntQ() {
        const buff = await fd.read(p, n8q);
        assert(buff.length == n8q);
        const buffR = Buffer.allocUnsafe(n8q);
        for (let i=0; i<n8q; i++) buffR[i] = buff[n8q-1-i];

        p += n8q;

        return Scalar.fromString(buffR.toString("hex"), 16);
    }

    async function readBigIntR() {
        const buff = await fd.read(p, n8r);
        assert(buff.length == n8r);
        const buffR = Buffer.allocUnsafe(n8r);
        for (let i=0; i<n8r; i++) buffR[i] = buff[n8r-1-i];

        p += n8r;

        return Scalar.fromString(buffR.toString("hex"), 16);
    }

    async function readFq() {
        const n = await readBigIntQ();
        return Fq.mul(n, Rqi);
    }

    async function readFr2() {
        const n = await readBigIntR();
        return Fr.mul(n, Rri2);
    }

    async function readG1() {
        const x = await readFq();
        const y = await readFq();
        if (Fq.isZero(x) && Fq.isZero(y)) {
            return [Fq.e(0), Fq.e(1), Fq.e(0)];
        } else {
            return [x , y, Fq.e(1)];
        }
    }

    async function readG2() {
        const xa = await readFq();
        const xb = await readFq();
        const ya = await readFq();
        const yb = await readFq();
        if (Fq.isZero(xa) && Fq.isZero(xb) && Fq.isZero(ya) && Fq.isZero(yb)) {
            return [[Fq.e(0),Fq.e(0)],[Fq.e(1),Fq.e(0)], [Fq.e(0),Fq.e(0)]];
        } else {
            return [[xa, xb],[ya, yb], [Fq.e(1),Fq.e(0)]];
        }
    }


};

