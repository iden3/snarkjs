'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var binFileUtils = require('@iden3/binfileutils');
var ffjavascript = require('ffjavascript');
var Blake2b = require('blake2b-wasm');
var readline = require('readline');
var crypto = require('crypto');
var fastFile = require('fastfile');
var circom_runtime = require('circom_runtime');
var r1csfile = require('r1csfile');
var ejs = require('ejs');
var jsSha3 = require('js-sha3');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

function _interopNamespace(e) {
    if (e && e.__esModule) return e;
    var n = Object.create(null);
    if (e) {
        Object.keys(e).forEach(function (k) {
            if (k !== 'default') {
                var d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () { return e[k]; }
                });
            }
        });
    }
    n["default"] = e;
    return Object.freeze(n);
}

var binFileUtils__namespace = /*#__PURE__*/_interopNamespace(binFileUtils);
var Blake2b__default = /*#__PURE__*/_interopDefaultLegacy(Blake2b);
var readline__default = /*#__PURE__*/_interopDefaultLegacy(readline);
var crypto__default = /*#__PURE__*/_interopDefaultLegacy(crypto);
var fastFile__namespace = /*#__PURE__*/_interopNamespace(fastFile);
var ejs__default = /*#__PURE__*/_interopDefaultLegacy(ejs);
var jsSha3__default = /*#__PURE__*/_interopDefaultLegacy(jsSha3);

ffjavascript.Scalar.e("73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001", 16);
ffjavascript.Scalar.e("21888242871839275222246405745257275088548364400416034343698204186575808495617");

const bls12381q = ffjavascript.Scalar.e("1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaab", 16);
const bn128q = ffjavascript.Scalar.e("21888242871839275222246405745257275088696311157297823662689037894645226208583");

async function getCurveFromQ(q) {
    let curve;
    if (ffjavascript.Scalar.eq(q, bn128q)) {
        curve = await ffjavascript.buildBn128();
    } else if (ffjavascript.Scalar.eq(q, bls12381q)) {
        curve = await ffjavascript.buildBls12381();
    } else {
        throw new Error(`Curve not supported: ${ffjavascript.Scalar.toString(q)}`);
    }
    return curve;
}

async function getCurveFromName(name) {
    let curve;
    const normName = normalizeName(name);
    if (["BN128", "BN254", "ALTBN128"].indexOf(normName) >= 0) {
        curve = await ffjavascript.buildBn128();
    } else if (["BLS12381"].indexOf(normName) >= 0) {
        curve = await ffjavascript.buildBls12381();
    } else {
        throw new Error(`Curve not supported: ${name}`);
    }
    return curve;

    function normalizeName(n) {
        return n.toUpperCase().match(/[A-Za-z0-9]+/g).join("");
    }

}

/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

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


function log2( V )
{
    return( ( ( V & 0xFFFF0000 ) !== 0 ? ( V &= 0xFFFF0000, 16 ) : 0 ) | ( ( V & 0xFF00FF00 ) !== 0 ? ( V &= 0xFF00FF00, 8 ) : 0 ) | ( ( V & 0xF0F0F0F0 ) !== 0 ? ( V &= 0xF0F0F0F0, 4 ) : 0 ) | ( ( V & 0xCCCCCCCC ) !== 0 ? ( V &= 0xCCCCCCCC, 2 ) : 0 ) | ( ( V & 0xAAAAAAAA ) !== 0 ) );
}


function formatHash(b, title) {
    const a = new DataView(b.buffer, b.byteOffset, b.byteLength);
    let S = "";
    for (let i=0; i<4; i++) {
        if (i>0) S += "\n";
        S += "\t\t";
        for (let j=0; j<4; j++) {
            if (j>0) S += " ";
            S += a.getUint32(i*16+j*4).toString(16).padStart(8, "0");
        }
    }
    if (title) S = title + "\n" + S;
    return S;
}

function hashIsEqual(h1, h2) {
    if (h1.byteLength != h2.byteLength) return false;
    var dv1 = new Int8Array(h1);
    var dv2 = new Int8Array(h2);
    for (var i = 0 ; i != h1.byteLength ; i++)
    {
        if (dv1[i] != dv2[i]) return false;
    }
    return true;
}

function cloneHasher(h) {
    const ph = h.getPartialHash();
    const res = Blake2b__default["default"](64);
    res.setPartialHash(ph);
    return res;
}

async function sameRatio$2(curve, g1s, g1sx, g2s, g2sx) {
    if (curve.G1.isZero(g1s)) return false;
    if (curve.G1.isZero(g1sx)) return false;
    if (curve.G2.isZero(g2s)) return false;
    if (curve.G2.isZero(g2sx)) return false;
    // return curve.F12.eq(curve.pairing(g1s, g2sx), curve.pairing(g1sx, g2s));
    const res = await curve.pairingEq(g1s, g2sx, curve.G1.neg(g1sx), g2s);
    return res;
}


function askEntropy() {
    if (process.browser) {
        return window.prompt("Enter a random text. (Entropy): ", "");
    } else {
        const rl = readline__default["default"].createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve) => {
            rl.question("Enter a random text. (Entropy): ", (input) => resolve(input) );
        });
    }
}

async function getRandomRng(entropy) {
    // Generate a random Rng
    while (!entropy) {
        entropy = await askEntropy();
    }
    const hasher = Blake2b__default["default"](64);
    hasher.update(crypto__default["default"].randomBytes(64));
    const enc = new TextEncoder(); // always utf-8
    hasher.update(enc.encode(entropy));
    const hash = Buffer.from(hasher.digest());

    const seed = [];
    for (let i=0;i<8;i++) {
        seed[i] = hash.readUInt32BE(i*4);
    }
    const rng = new ffjavascript.ChaCha(seed);
    return rng;
}

function rngFromBeaconParams(beaconHash, numIterationsExp) {
    let nIterationsInner;
    let nIterationsOuter;
    if (numIterationsExp<32) {
        nIterationsInner = (1 << numIterationsExp) >>> 0;
        nIterationsOuter = 1;
    } else {
        nIterationsInner = 0x100000000;
        nIterationsOuter = (1 << (numIterationsExp-32)) >>> 0;
    }

    let curHash = beaconHash;
    for (let i=0; i<nIterationsOuter; i++) {
        for (let j=0; j<nIterationsInner; j++) {
            curHash = crypto__default["default"].createHash("sha256").update(curHash).digest();
        }
    }

    const curHashV = new DataView(curHash.buffer, curHash.byteOffset, curHash.byteLength);
    const seed = [];
    for (let i=0; i<8; i++) {
        seed[i] = curHashV.getUint32(i*4, false);
    }

    const rng = new ffjavascript.ChaCha(seed);

    return rng;
}

function hex2ByteArray(s) {
    if (s instanceof Uint8Array) return s;
    if (s.slice(0,2) == "0x") s= s.slice(2);
    return new Uint8Array(s.match(/[\da-f]{2}/gi).map(function (h) {
        return parseInt(h, 16);
    }));
}

function byteArray2hex(byteArray) {
    return Array.prototype.map.call(byteArray, function(byte) {
        return ("0" + (byte & 0xFF).toString(16)).slice(-2);
    }).join("");
}

function stringifyBigIntsWithField(Fr, o) {
    if (o instanceof Uint8Array)  {
        return Fr.toString(o);
    } else if (Array.isArray(o)) {
        return o.map(stringifyBigIntsWithField.bind(null, Fr));
    } else if (typeof o == "object") {
        const res = {};
        const keys = Object.keys(o);
        keys.forEach( (k) => {
            res[k] = stringifyBigIntsWithField(Fr, o[k]);
        });
        return res;
    } else if ((typeof(o) == "bigint") || o.eq !== undefined)  {
        return o.toString(10);
    } else {
        return o;
    }
}

/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

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

async function writeHeader(fd, zkey) {

    // Write the header
    ///////////
    await binFileUtils__namespace.startWriteSection(fd, 1);
    await fd.writeULE32(1); // Groth
    await binFileUtils__namespace.endWriteSection(fd);

    // Write the Groth header section
    ///////////

    const curve = await getCurveFromQ(zkey.q);

    await binFileUtils__namespace.startWriteSection(fd, 2);
    const primeQ = curve.q;
    const n8q = (Math.floor( (ffjavascript.Scalar.bitLength(primeQ) - 1) / 64) +1)*8;

    const primeR = curve.r;
    const n8r = (Math.floor( (ffjavascript.Scalar.bitLength(primeR) - 1) / 64) +1)*8;

    await fd.writeULE32(n8q);
    await binFileUtils__namespace.writeBigInt(fd, primeQ, n8q);
    await fd.writeULE32(n8r);
    await binFileUtils__namespace.writeBigInt(fd, primeR, n8r);
    await fd.writeULE32(zkey.nVars);                         // Total number of bars
    await fd.writeULE32(zkey.nPublic);                       // Total number of public vars (not including ONE)
    await fd.writeULE32(zkey.domainSize);                  // domainSize
    await writeG1(fd, curve, zkey.vk_alpha_1);
    await writeG1(fd, curve, zkey.vk_beta_1);
    await writeG2(fd, curve, zkey.vk_beta_2);
    await writeG2(fd, curve, zkey.vk_gamma_2);
    await writeG1(fd, curve, zkey.vk_delta_1);
    await writeG2(fd, curve, zkey.vk_delta_2);

    await binFileUtils__namespace.endWriteSection(fd);


}

async function writeG1(fd, curve, p) {
    const buff = new Uint8Array(curve.G1.F.n8*2);
    curve.G1.toRprLEM(buff, 0, p);
    await fd.write(buff);
}

async function writeG2(fd, curve, p) {
    const buff = new Uint8Array(curve.G2.F.n8*2);
    curve.G2.toRprLEM(buff, 0, p);
    await fd.write(buff);
}

async function readG1(fd, curve, toObject) {
    const buff = await fd.read(curve.G1.F.n8*2);
    const res = curve.G1.fromRprLEM(buff, 0);
    return toObject ? curve.G1.toObject(res) : res;
}

async function readG2(fd, curve, toObject) {
    const buff = await fd.read(curve.G2.F.n8*2);
    const res = curve.G2.fromRprLEM(buff, 0);
    return toObject ? curve.G2.toObject(res) : res;
}


async function readHeader$1(fd, sections, toObject) {
    // Read Header
    /////////////////////
    await binFileUtils__namespace.startReadUniqueSection(fd, sections, 1);
    const protocolId = await fd.readULE32();
    await binFileUtils__namespace.endReadSection(fd);

    if (protocolId == 1) {
        return await readHeaderGroth16(fd, sections, toObject);
    } else if (protocolId == 2) {
        return await readHeaderPlonk(fd, sections, toObject);
    } else {
        throw new Error("Protocol not supported: ");
    }        
}




async function readHeaderGroth16(fd, sections, toObject) {
    const zkey = {};

    zkey.protocol = "groth16";

    // Read Groth Header
    /////////////////////
    await binFileUtils__namespace.startReadUniqueSection(fd, sections, 2);
    const n8q = await fd.readULE32();
    zkey.n8q = n8q;
    zkey.q = await binFileUtils__namespace.readBigInt(fd, n8q);

    const n8r = await fd.readULE32();
    zkey.n8r = n8r;
    zkey.r = await binFileUtils__namespace.readBigInt(fd, n8r);
    zkey.curve = await getCurveFromQ(zkey.q);
    zkey.nVars = await fd.readULE32();
    zkey.nPublic = await fd.readULE32();
    zkey.domainSize = await fd.readULE32();
    zkey.power = log2(zkey.domainSize);
    zkey.vk_alpha_1 = await readG1(fd, zkey.curve, toObject);
    zkey.vk_beta_1 = await readG1(fd, zkey.curve, toObject);
    zkey.vk_beta_2 = await readG2(fd, zkey.curve, toObject);
    zkey.vk_gamma_2 = await readG2(fd, zkey.curve, toObject);
    zkey.vk_delta_1 = await readG1(fd, zkey.curve, toObject);
    zkey.vk_delta_2 = await readG2(fd, zkey.curve, toObject);
    await binFileUtils__namespace.endReadSection(fd);

    return zkey;

}




async function readHeaderPlonk(fd, sections, toObject) {
    const zkey = {};

    zkey.protocol = "plonk";

    // Read Plonk Header
    /////////////////////
    await binFileUtils__namespace.startReadUniqueSection(fd, sections, 2);
    const n8q = await fd.readULE32();
    zkey.n8q = n8q;
    zkey.q = await binFileUtils__namespace.readBigInt(fd, n8q);

    const n8r = await fd.readULE32();
    zkey.n8r = n8r;
    zkey.r = await binFileUtils__namespace.readBigInt(fd, n8r);
    zkey.curve = await getCurveFromQ(zkey.q);
    zkey.nVars = await fd.readULE32();
    zkey.nPublic = await fd.readULE32();
    zkey.domainSize = await fd.readULE32();
    zkey.power = log2(zkey.domainSize);
    zkey.nAdditions = await fd.readULE32();
    zkey.nConstrains = await fd.readULE32();
    zkey.k1 = await fd.read(n8r);
    zkey.k2 = await fd.read(n8r);

    zkey.Qm = await readG1(fd, zkey.curve, toObject);
    zkey.Ql = await readG1(fd, zkey.curve, toObject);
    zkey.Qr = await readG1(fd, zkey.curve, toObject);
    zkey.Qo = await readG1(fd, zkey.curve, toObject);
    zkey.Qc = await readG1(fd, zkey.curve, toObject);
    zkey.S1 = await readG1(fd, zkey.curve, toObject);
    zkey.S2 = await readG1(fd, zkey.curve, toObject);
    zkey.S3 = await readG1(fd, zkey.curve, toObject);
    zkey.X_2 = await readG2(fd, zkey.curve, toObject);

    await binFileUtils__namespace.endReadSection(fd);

    return zkey;
}

async function readZKey(fileName, toObject) {
    const {fd, sections} = await binFileUtils__namespace.readBinFile(fileName, "zkey", 1);

    const zkey = await readHeader$1(fd, sections, toObject);

    const Fr = new ffjavascript.F1Field(zkey.r);
    const Rr = ffjavascript.Scalar.mod(ffjavascript.Scalar.shl(1, zkey.n8r*8), zkey.r);
    const Rri = Fr.inv(Rr);
    const Rri2 = Fr.mul(Rri, Rri);

    let curve = await getCurveFromQ(zkey.q);

    // Read IC Section
    ///////////
    await binFileUtils__namespace.startReadUniqueSection(fd, sections, 3);
    zkey.IC = [];
    for (let i=0; i<= zkey.nPublic; i++) {
        const P = await readG1(fd, curve, toObject);
        zkey.IC.push(P);
    }
    await binFileUtils__namespace.endReadSection(fd);


    // Read Coefs
    ///////////
    await binFileUtils__namespace.startReadUniqueSection(fd, sections, 4);
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
    await binFileUtils__namespace.endReadSection(fd);

    // Read A points
    ///////////
    await binFileUtils__namespace.startReadUniqueSection(fd, sections, 5);
    zkey.A = [];
    for (let i=0; i<zkey.nVars; i++) {
        const A = await readG1(fd, curve, toObject);
        zkey.A[i] = A;
    }
    await binFileUtils__namespace.endReadSection(fd);


    // Read B1
    ///////////
    await binFileUtils__namespace.startReadUniqueSection(fd, sections, 6);
    zkey.B1 = [];
    for (let i=0; i<zkey.nVars; i++) {
        const B1 = await readG1(fd, curve, toObject);

        zkey.B1[i] = B1;
    }
    await binFileUtils__namespace.endReadSection(fd);


    // Read B2 points
    ///////////
    await binFileUtils__namespace.startReadUniqueSection(fd, sections, 7);
    zkey.B2 = [];
    for (let i=0; i<zkey.nVars; i++) {
        const B2 = await readG2(fd, curve, toObject);
        zkey.B2[i] = B2;
    }
    await binFileUtils__namespace.endReadSection(fd);


    // Read C points
    ///////////
    await binFileUtils__namespace.startReadUniqueSection(fd, sections, 8);
    zkey.C = [];
    for (let i=zkey.nPublic+1; i<zkey.nVars; i++) {
        const C = await readG1(fd, curve, toObject);

        zkey.C[i] = C;
    }
    await binFileUtils__namespace.endReadSection(fd);


    // Read H points
    ///////////
    await binFileUtils__namespace.startReadUniqueSection(fd, sections, 9);
    zkey.hExps = [];
    for (let i=0; i<zkey.domainSize; i++) {
        const H = await readG1(fd, curve, toObject);
        zkey.hExps.push(H);
    }
    await binFileUtils__namespace.endReadSection(fd);

    await fd.close();

    return zkey;

    async function readFr2(/* toObject */) {
        const n = await binFileUtils__namespace.readBigInt(fd, zkey.n8r);
        return Fr.mul(n, Rri2);
    }

}


async function readContribution$1(fd, curve, toObject) {
    const c = {delta:{}};
    c.deltaAfter = await readG1(fd, curve, toObject);
    c.delta.g1_s = await readG1(fd, curve, toObject);
    c.delta.g1_sx = await readG1(fd, curve, toObject);
    c.delta.g2_spx = await readG2(fd, curve, toObject);
    c.transcript = await fd.read(64);
    c.type = await fd.readULE32();

    const paramLength = await fd.readULE32();
    const curPos = fd.pos;
    let lastType =0;
    while (fd.pos-curPos < paramLength) {
        const buffType = await fd.read(1);
        if (buffType[0]<= lastType) throw new Error("Parameters in the contribution must be sorted");
        lastType = buffType[0];
        if (buffType[0]==1) {     // Name
            const buffLen = await fd.read(1);
            const buffStr = await fd.read(buffLen[0]);
            c.name = new TextDecoder().decode(buffStr);
        } else if (buffType[0]==2) {
            const buffExp = await fd.read(1);
            c.numIterationsExp = buffExp[0];
        } else if (buffType[0]==3) {
            const buffLen = await fd.read(1);
            c.beaconHash = await fd.read(buffLen[0]);
        } else {
            throw new Error("Parameter not recognized");
        }
    }
    if (fd.pos != curPos + paramLength) {
        throw new Error("Parametes do not match");
    }

    return c;
}


async function readMPCParams(fd, curve, sections) {
    await binFileUtils__namespace.startReadUniqueSection(fd, sections, 10);
    const res = { contributions: []};
    res.csHash = await fd.read(64);
    const n = await fd.readULE32();
    for (let i=0; i<n; i++) {
        const c = await readContribution$1(fd, curve);
        res.contributions.push(c);
    }
    await binFileUtils__namespace.endReadSection(fd);

    return res;
}

async function writeContribution$1(fd, curve, c) {
    await writeG1(fd, curve, c.deltaAfter);
    await writeG1(fd, curve, c.delta.g1_s);
    await writeG1(fd, curve, c.delta.g1_sx);
    await writeG2(fd, curve, c.delta.g2_spx);
    await fd.write(c.transcript);
    await fd.writeULE32(c.type || 0);

    const params = [];
    if (c.name) {
        params.push(1);      // Param Name
        const nameData = new TextEncoder("utf-8").encode(c.name.substring(0,64));
        params.push(nameData.byteLength);
        for (let i=0; i<nameData.byteLength; i++) params.push(nameData[i]);
    }
    if (c.type == 1) {
        params.push(2);      // Param numIterationsExp
        params.push(c.numIterationsExp);

        params.push(3);      // Beacon Hash
        params.push(c.beaconHash.byteLength);
        for (let i=0; i<c.beaconHash.byteLength; i++) params.push(c.beaconHash[i]);
    }
    if (params.length>0) {
        const paramsBuff = new Uint8Array(params);
        await fd.writeULE32(paramsBuff.byteLength);
        await fd.write(paramsBuff);
    } else {
        await fd.writeULE32(0);
    }

}

async function writeMPCParams(fd, curve, mpcParams) {
    await binFileUtils__namespace.startWriteSection(fd, 10);
    await fd.write(mpcParams.csHash);
    await fd.writeULE32(mpcParams.contributions.length);
    for (let i=0; i<mpcParams.contributions.length; i++) {
        await writeContribution$1(fd, curve,mpcParams.contributions[i]);
    }
    await binFileUtils__namespace.endWriteSection(fd);
}

function hashG1(hasher, curve, p) {
    const buff = new Uint8Array(curve.G1.F.n8*2);
    curve.G1.toRprUncompressed(buff, 0, p);
    hasher.update(buff);
}

function hashG2(hasher,curve, p) {
    const buff = new Uint8Array(curve.G2.F.n8*2);
    curve.G2.toRprUncompressed(buff, 0, p);
    hasher.update(buff);
}

function hashPubKey(hasher, curve, c) {
    hashG1(hasher, curve, c.deltaAfter);
    hashG1(hasher, curve, c.delta.g1_s);
    hashG1(hasher, curve, c.delta.g1_sx);
    hashG2(hasher, curve, c.delta.g2_spx);
    hasher.update(c.transcript);
}

/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

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


async function write(fd, witness, prime) {

    await binFileUtils__namespace.startWriteSection(fd, 1);
    const n8 = (Math.floor( (ffjavascript.Scalar.bitLength(prime) - 1) / 64) +1)*8;
    await fd.writeULE32(n8);
    await binFileUtils__namespace.writeBigInt(fd, prime, n8);
    await fd.writeULE32(witness.length);
    await binFileUtils__namespace.endWriteSection(fd);

    await binFileUtils__namespace.startWriteSection(fd, 2);
    for (let i=0; i<witness.length; i++) {
        await binFileUtils__namespace.writeBigInt(fd, witness[i], n8);
    }
    await binFileUtils__namespace.endWriteSection(fd, 2);


}

async function writeBin(fd, witnessBin, prime) {

    await binFileUtils__namespace.startWriteSection(fd, 1);
    const n8 = (Math.floor( (ffjavascript.Scalar.bitLength(prime) - 1) / 64) +1)*8;
    await fd.writeULE32(n8);
    await binFileUtils__namespace.writeBigInt(fd, prime, n8);
    if (witnessBin.byteLength % n8 != 0) {
        throw new Error("Invalid witness length");
    }
    await fd.writeULE32(witnessBin.byteLength / n8);
    await binFileUtils__namespace.endWriteSection(fd);


    await binFileUtils__namespace.startWriteSection(fd, 2);
    await fd.write(witnessBin);
    await binFileUtils__namespace.endWriteSection(fd);

}

async function readHeader(fd, sections) {

    await binFileUtils__namespace.startReadUniqueSection(fd, sections, 1);
    const n8 = await fd.readULE32();
    const q = await binFileUtils__namespace.readBigInt(fd, n8);
    const nWitness = await fd.readULE32();
    await binFileUtils__namespace.endReadSection(fd);

    return {n8, q, nWitness};

}

async function read(fileName) {

    const {fd, sections} = await binFileUtils__namespace.readBinFile(fileName, "wtns", 2);

    const {n8, nWitness} = await readHeader(fd, sections);

    await binFileUtils__namespace.startReadUniqueSection(fd, sections, 2);
    const res = [];
    for (let i=0; i<nWitness; i++) {
        const v = await binFileUtils__namespace.readBigInt(fd, n8);
        res.push(v);
    }
    await binFileUtils__namespace.endReadSection(fd);

    await fd.close();

    return res;
}

/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

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
const {stringifyBigInts: stringifyBigInts$2} = ffjavascript.utils;

async function groth16Prove(zkeyFileName, witnessFileName, logger) {
    const {fd: fdWtns, sections: sectionsWtns} = await binFileUtils__namespace.readBinFile(witnessFileName, "wtns", 2, 1<<25, 1<<23);

    const wtns = await readHeader(fdWtns, sectionsWtns);

    const {fd: fdZKey, sections: sectionsZKey} = await binFileUtils__namespace.readBinFile(zkeyFileName, "zkey", 2, 1<<25, 1<<23);

    const zkey = await readHeader$1(fdZKey, sectionsZKey);

    if (zkey.protocol != "groth16") {
        throw new Error("zkey file is not groth16");
    }

    if (!ffjavascript.Scalar.eq(zkey.r,  wtns.q)) {
        throw new Error("Curve of the witness does not match the curve of the proving key");
    }

    if (wtns.nWitness != zkey.nVars) {
        throw new Error(`Invalid witness length. Circuit: ${zkey.nVars}, witness: ${wtns.nWitness}`);
    }

    const curve = zkey.curve;
    const Fr = curve.Fr;
    const G1 = curve.G1;
    const G2 = curve.G2;

    const power = log2(zkey.domainSize);

    if (logger) logger.debug("Reading Wtns");
    const buffWitness = await binFileUtils__namespace.readSection(fdWtns, sectionsWtns, 2);
    if (logger) logger.debug("Reading Coeffs");
    const buffCoeffs = await binFileUtils__namespace.readSection(fdZKey, sectionsZKey, 4);

    if (logger) logger.debug("Building ABC");
    const [buffA_T, buffB_T, buffC_T] = await buildABC1(curve, zkey, buffWitness, buffCoeffs, logger);

    const inc = power == Fr.s ? curve.Fr.shift : curve.Fr.w[power+1];

    const buffA = await Fr.ifft(buffA_T, "", "", logger, "IFFT_A");
    const buffAodd = await Fr.batchApplyKey(buffA, Fr.e(1), inc);
    const buffAodd_T = await Fr.fft(buffAodd, "", "", logger, "FFT_A");

    const buffB = await Fr.ifft(buffB_T, "", "", logger, "IFFT_B");
    const buffBodd = await Fr.batchApplyKey(buffB, Fr.e(1), inc);
    const buffBodd_T = await Fr.fft(buffBodd, "", "", logger, "FFT_B");

    const buffC = await Fr.ifft(buffC_T, "", "", logger, "IFFT_C");
    const buffCodd = await Fr.batchApplyKey(buffC, Fr.e(1), inc);
    const buffCodd_T = await Fr.fft(buffCodd, "", "", logger, "FFT_C");

    if (logger) logger.debug("Join ABC");
    const buffPodd_T = await joinABC(curve, zkey, buffAodd_T, buffBodd_T, buffCodd_T, logger);

    let proof = {};

    if (logger) logger.debug("Reading A Points");
    const buffBasesA = await binFileUtils__namespace.readSection(fdZKey, sectionsZKey, 5);
    proof.pi_a = await curve.G1.multiExpAffine(buffBasesA, buffWitness, logger, "multiexp A");

    if (logger) logger.debug("Reading B1 Points");
    const buffBasesB1 = await binFileUtils__namespace.readSection(fdZKey, sectionsZKey, 6);
    let pib1 = await curve.G1.multiExpAffine(buffBasesB1, buffWitness, logger, "multiexp B1");

    if (logger) logger.debug("Reading B2 Points");
    const buffBasesB2 = await binFileUtils__namespace.readSection(fdZKey, sectionsZKey, 7);
    proof.pi_b = await curve.G2.multiExpAffine(buffBasesB2, buffWitness, logger, "multiexp B2");

    if (logger) logger.debug("Reading C Points");
    const buffBasesC = await binFileUtils__namespace.readSection(fdZKey, sectionsZKey, 8);
    proof.pi_c = await curve.G1.multiExpAffine(buffBasesC, buffWitness.slice((zkey.nPublic+1)*curve.Fr.n8), logger, "multiexp C");

    if (logger) logger.debug("Reading H Points");
    const buffBasesH = await binFileUtils__namespace.readSection(fdZKey, sectionsZKey, 9);
    const resH = await curve.G1.multiExpAffine(buffBasesH, buffPodd_T, logger, "multiexp H");

    const r = curve.Fr.random();
    const s = curve.Fr.random();

    proof.pi_a  = G1.add( proof.pi_a, zkey.vk_alpha_1 );
    proof.pi_a  = G1.add( proof.pi_a, G1.timesFr( zkey.vk_delta_1, r ));

    proof.pi_b  = G2.add( proof.pi_b, zkey.vk_beta_2 );
    proof.pi_b  = G2.add( proof.pi_b, G2.timesFr( zkey.vk_delta_2, s ));

    pib1 = G1.add( pib1, zkey.vk_beta_1 );
    pib1 = G1.add( pib1, G1.timesFr( zkey.vk_delta_1, s ));

    proof.pi_c = G1.add(proof.pi_c, resH);


    proof.pi_c  = G1.add( proof.pi_c, G1.timesFr( proof.pi_a, s ));
    proof.pi_c  = G1.add( proof.pi_c, G1.timesFr( pib1, r ));
    proof.pi_c  = G1.add( proof.pi_c, G1.timesFr( zkey.vk_delta_1, Fr.neg(Fr.mul(r,s) )));


    let publicSignals = [];

    for (let i=1; i<= zkey.nPublic; i++) {
        const b = buffWitness.slice(i*Fr.n8, i*Fr.n8+Fr.n8);
        publicSignals.push(ffjavascript.Scalar.fromRprLE(b));
    }

    proof.pi_a = G1.toObject(G1.toAffine(proof.pi_a));
    proof.pi_b = G2.toObject(G2.toAffine(proof.pi_b));
    proof.pi_c = G1.toObject(G1.toAffine(proof.pi_c));

    proof.protocol = "groth16";
    proof.curve = curve.name;

    await fdZKey.close();
    await fdWtns.close();

    proof = stringifyBigInts$2(proof);
    publicSignals = stringifyBigInts$2(publicSignals);

    return {proof, publicSignals};
}


async function buildABC1(curve, zkey, witness, coeffs, logger) {
    const n8 = curve.Fr.n8;
    const sCoef = 4*3 + zkey.n8r;
    const nCoef = (coeffs.byteLength-4) / sCoef;

    const outBuffA = new ffjavascript.BigBuffer(zkey.domainSize * n8);
    const outBuffB = new ffjavascript.BigBuffer(zkey.domainSize * n8);
    const outBuffC = new ffjavascript.BigBuffer(zkey.domainSize * n8);

    const outBuf = [ outBuffA, outBuffB ];
    for (let i=0; i<nCoef; i++) {
        if ((logger)&&(i%1000000 == 0)) logger.debug(`QAP AB: ${i}/${nCoef}`);
        const buffCoef = coeffs.slice(4+i*sCoef, 4+i*sCoef+sCoef);
        const buffCoefV = new DataView(buffCoef.buffer);
        const m= buffCoefV.getUint32(0, true);
        const c= buffCoefV.getUint32(4, true);
        const s= buffCoefV.getUint32(8, true);
        const coef = buffCoef.slice(12, 12+n8);
        outBuf[m].set(
            curve.Fr.add(
                outBuf[m].slice(c*n8, c*n8+n8),
                curve.Fr.mul(coef, witness.slice(s*n8, s*n8+n8))
            ),
            c*n8
        );
    }

    for (let i=0; i<zkey.domainSize; i++) {
        if ((logger)&&(i%1000000 == 0)) logger.debug(`QAP C: ${i}/${zkey.domainSize}`);
        outBuffC.set(
            curve.Fr.mul(
                outBuffA.slice(i*n8, i*n8+n8),
                outBuffB.slice(i*n8, i*n8+n8),
            ),
            i*n8
        );
    }

    return [outBuffA, outBuffB, outBuffC];

}

/*
async function buldABC(curve, zkey, witness, coeffs, logger) {
    const concurrency = curve.tm.concurrency;
    const sCoef = 4*3 + zkey.n8r;

    let getUint32;

    if (coeffs instanceof BigBuffer) {
        const coeffsDV = [];
        const PAGE_LEN = coeffs.buffers[0].length;
        for (let i=0; i< coeffs.buffers.length; i++) {
            coeffsDV.push(new DataView(coeffs.buffers[i].buffer));
        }
        getUint32 = function (pos) {
            return coeffsDV[Math.floor(pos/PAGE_LEN)].getUint32(pos % PAGE_LEN, true);
        };
    } else {
        const coeffsDV = new DataView(coeffs.buffer, coeffs.byteOffset, coeffs.byteLength);
        getUint32 = function (pos) {
            return coeffsDV.getUint32(pos, true);
        };
    }

    const elementsPerChunk = Math.floor(zkey.domainSize/concurrency);
    const promises = [];

    const cutPoints = [];
    for (let i=0; i<concurrency; i++) {
        cutPoints.push( getCutPoint( Math.floor(i*elementsPerChunk) ));
    }
    cutPoints.push(coeffs.byteLength);

    const chunkSize = 2**26;
    for (let s=0 ; s<zkey.nVars ; s+= chunkSize) {
        if (logger) logger.debug(`QAP ${s}: ${s}/${zkey.nVars}`);
        const ns= Math.min(zkey.nVars-s, chunkSize );

        for (let i=0; i<concurrency; i++) {
            let n;
            if (i< concurrency-1) {
                n = elementsPerChunk;
            } else {
                n = zkey.domainSize - i*elementsPerChunk;
            }
            if (n==0) continue;

            const task = [];

            task.push({cmd: "ALLOCSET", var: 0, buff: coeffs.slice(cutPoints[i], cutPoints[i+1])});
            task.push({cmd: "ALLOCSET", var: 1, buff: witness.slice(s*curve.Fr.n8, (s+ns)*curve.Fr.n8)});
            task.push({cmd: "ALLOC", var: 2, len: n*curve.Fr.n8});
            task.push({cmd: "ALLOC", var: 3, len: n*curve.Fr.n8});
            task.push({cmd: "ALLOC", var: 4, len: n*curve.Fr.n8});
            task.push({cmd: "CALL", fnName: "qap_buildABC", params:[
                {var: 0},
                {val: (cutPoints[i+1] - cutPoints[i])/sCoef},
                {var: 1},
                {var: 2},
                {var: 3},
                {var: 4},
                {val: i*elementsPerChunk},
                {val: n},
                {val: s},
                {val: ns}
            ]});
            task.push({cmd: "GET", out: 0, var: 2, len: n*curve.Fr.n8});
            task.push({cmd: "GET", out: 1, var: 3, len: n*curve.Fr.n8});
            task.push({cmd: "GET", out: 2, var: 4, len: n*curve.Fr.n8});
            promises.push(curve.tm.queueAction(task));
        }
    }

    let result = await Promise.all(promises);

    const nGroups = result.length / concurrency;
    if (nGroups>1) {
        const promises2 = [];
        for (let i=0; i<concurrency; i++) {
            const task=[];
            task.push({cmd: "ALLOC", var: 0, len: result[i][0].byteLength});
            task.push({cmd: "ALLOC", var: 1, len: result[i][0].byteLength});
            for (let m=0; m<3; m++) {
                task.push({cmd: "SET", var: 0, buff: result[i][m]});
                for (let s=1; s<nGroups; s++) {
                    task.push({cmd: "SET", var: 1, buff: result[s*concurrency + i][m]});
                    task.push({cmd: "CALL", fnName: "qap_batchAdd", params:[
                        {var: 0},
                        {var: 1},
                        {val: result[i][m].length/curve.Fr.n8},
                        {var: 0}
                    ]});
                }
                task.push({cmd: "GET", out: m, var: 0, len: result[i][m].length});
            }
            promises2.push(curve.tm.queueAction(task));
        }
        result = await Promise.all(promises2);
    }

    const outBuffA = new BigBuffer(zkey.domainSize * curve.Fr.n8);
    const outBuffB = new BigBuffer(zkey.domainSize * curve.Fr.n8);
    const outBuffC = new BigBuffer(zkey.domainSize * curve.Fr.n8);
    let p=0;
    for (let i=0; i<result.length; i++) {
        outBuffA.set(result[i][0], p);
        outBuffB.set(result[i][1], p);
        outBuffC.set(result[i][2], p);
        p += result[i][0].byteLength;
    }

    return [outBuffA, outBuffB, outBuffC];

    function getCutPoint(v) {
        let m = 0;
        let n = getUint32(0);
        while (m < n) {
            var k = Math.floor((n + m) / 2);
            const va = getUint32(4 + k*sCoef + 4);
            if (va > v) {
                n = k - 1;
            } else if (va < v) {
                m = k + 1;
            } else {
                n = k;
            }
        }
        return 4 + m*sCoef;
    }
}
*/

async function joinABC(curve, zkey, a, b, c, logger) {
    const MAX_CHUNK_SIZE = 1 << 22;

    const n8 = curve.Fr.n8;
    const nElements = Math.floor(a.byteLength / curve.Fr.n8);

    const promises = [];

    for (let i=0; i<nElements; i += MAX_CHUNK_SIZE) {
        if (logger) logger.debug(`JoinABC: ${i}/${nElements}`);
        const n= Math.min(nElements - i, MAX_CHUNK_SIZE);

        const task = [];

        const aChunk = a.slice(i*n8, (i + n)*n8 );
        const bChunk = b.slice(i*n8, (i + n)*n8 );
        const cChunk = c.slice(i*n8, (i + n)*n8 );

        task.push({cmd: "ALLOCSET", var: 0, buff: aChunk});
        task.push({cmd: "ALLOCSET", var: 1, buff: bChunk});
        task.push({cmd: "ALLOCSET", var: 2, buff: cChunk});
        task.push({cmd: "ALLOC", var: 3, len: n*n8});
        task.push({cmd: "CALL", fnName: "qap_joinABC", params:[
            {var: 0},
            {var: 1},
            {var: 2},
            {val: n},
            {var: 3},
        ]});
        task.push({cmd: "CALL", fnName: "frm_batchFromMontgomery", params:[
            {var: 3},
            {val: n},
            {var: 3}
        ]});
        task.push({cmd: "GET", out: 0, var: 3, len: n*n8});
        promises.push(curve.tm.queueAction(task));
    }

    const result = await Promise.all(promises);

    let outBuff;
    if (a instanceof ffjavascript.BigBuffer) {
        outBuff = new ffjavascript.BigBuffer(a.byteLength);
    } else {
        outBuff = new Uint8Array(a.byteLength);
    }

    let p=0;
    for (let i=0; i<result.length; i++) {
        outBuff.set(result[i][0], p);
        p += result[i][0].byteLength;
    }

    return outBuff;
}

/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

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
const { unstringifyBigInts: unstringifyBigInts$7} = ffjavascript.utils;

async function wtnsCalculate(_input, wasmFileName, wtnsFileName, options) {
    const input = unstringifyBigInts$7(_input);

    const fdWasm = await fastFile__namespace.readExisting(wasmFileName);
    const wasm = await fdWasm.read(fdWasm.totalSize);
    await fdWasm.close();

    const wc = await circom_runtime.WitnessCalculatorBuilder(wasm);
    if (wc.circom_version() == 1) {
        const w = await wc.calculateBinWitness(input);

        const fdWtns = await binFileUtils__namespace.createBinFile(wtnsFileName, "wtns", 2, 2);

        await writeBin(fdWtns, w, wc.prime);
        await fdWtns.close();
    } else {
        const fdWtns = await fastFile__namespace.createOverride(wtnsFileName);

        const w = await wc.calculateWTNSBin(input);

        await fdWtns.write(w);
        await fdWtns.close();
    }
}

/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

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
const {unstringifyBigInts: unstringifyBigInts$6} = ffjavascript.utils;

async function groth16FullProve(_input, wasmFile, zkeyFileName, logger) {
    const input = unstringifyBigInts$6(_input);

    const wtns= {
        type: "mem"
    };
    await wtnsCalculate(input, wasmFile, wtns);
    return await groth16Prove(zkeyFileName, wtns, logger);
}

/*
    Copyright 2018 0kims association.

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
const {unstringifyBigInts: unstringifyBigInts$5} = ffjavascript.utils;

async function groth16Verify(_vk_verifier, _publicSignals, _proof, logger) {
/*
    let cpub = vk_verifier.IC[0];
    for (let s= 0; s< vk_verifier.nPublic; s++) {
        cpub  = G1.add( cpub, G1.timesScalar( vk_verifier.IC[s+1], publicSignals[s]));
    }
*/

    const vk_verifier = unstringifyBigInts$5(_vk_verifier);
    const proof = unstringifyBigInts$5(_proof);
    const publicSignals = unstringifyBigInts$5(_publicSignals);

    const curve = await getCurveFromName(vk_verifier.curve);

    const IC0 = curve.G1.fromObject(vk_verifier.IC[0]);
    const IC = new Uint8Array(curve.G1.F.n8*2 * publicSignals.length);
    const w = new Uint8Array(curve.Fr.n8 * publicSignals.length);

    for (let i=0; i<publicSignals.length; i++) {
        const buffP = curve.G1.fromObject(vk_verifier.IC[i+1]);
        IC.set(buffP, i*curve.G1.F.n8*2);
        ffjavascript.Scalar.toRprLE(w, curve.Fr.n8*i, publicSignals[i], curve.Fr.n8);
    }

    let cpub = await curve.G1.multiExpAffine(IC, w);
    cpub = curve.G1.add(cpub, IC0);

    const pi_a = curve.G1.fromObject(proof.pi_a);
    const pi_b = curve.G2.fromObject(proof.pi_b);
    const pi_c = curve.G1.fromObject(proof.pi_c);

    const vk_gamma_2 = curve.G2.fromObject(vk_verifier.vk_gamma_2);
    const vk_delta_2 = curve.G2.fromObject(vk_verifier.vk_delta_2);
    const vk_alpha_1 = curve.G1.fromObject(vk_verifier.vk_alpha_1);
    const vk_beta_2 = curve.G2.fromObject(vk_verifier.vk_beta_2);

    const res = await curve.pairingEq(
        curve.G1.neg(pi_a) , pi_b,
        cpub , vk_gamma_2,
        pi_c , vk_delta_2,

        vk_alpha_1, vk_beta_2
    );

    if (! res) {
        if (logger) logger.error("Invalid proof");
        return false;
    }

    if (logger) logger.info("OK!");
    return true;
}

/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

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
const { unstringifyBigInts: unstringifyBigInts$4} = ffjavascript.utils;

function p256$1(n) {
    let nstr = n.toString(16);
    while (nstr.length < 64) nstr = "0"+nstr;
    nstr = `"0x${nstr}"`;
    return nstr;
}

async function groth16ExportSolidityCallData(_proof, _pub) {
    const proof = unstringifyBigInts$4(_proof);
    const pub = unstringifyBigInts$4(_pub);

    let inputs = "";
    for (let i=0; i<pub.length; i++) {
        if (inputs != "") inputs = inputs + ",";
        inputs = inputs + p256$1(pub[i]);
    }

    let S;
    S=`[${p256$1(proof.pi_a[0])}, ${p256$1(proof.pi_a[1])}],` +
        `[[${p256$1(proof.pi_b[0][1])}, ${p256$1(proof.pi_b[0][0])}],[${p256$1(proof.pi_b[1][1])}, ${p256$1(proof.pi_b[1][0])}]],` +
        `[${p256$1(proof.pi_c[0])}, ${p256$1(proof.pi_c[1])}],` +
        `[${inputs}]`;

    return S;
}

/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

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

var groth16 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    fullProve: groth16FullProve,
    prove: groth16Prove,
    verify: groth16Verify,
    exportSolidityCallData: groth16ExportSolidityCallData
});

/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

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

function hashToG2(curve, hash) {
    const hashV = new DataView(hash.buffer, hash.byteOffset, hash.byteLength);
    const seed = [];
    for (let i=0; i<8; i++) {
        seed[i] = hashV.getUint32(i*4);
    }

    const rng = new ffjavascript.ChaCha(seed);

    const g2_sp = curve.G2.fromRng(rng);

    return g2_sp;
}

function getG2sp(curve, persinalization, challenge, g1s, g1sx) {

    const h = Blake2b__default["default"](64);
    const b1 = new Uint8Array([persinalization]);
    h.update(b1);
    h.update(challenge);
    const b3 = curve.G1.toUncompressed(g1s);
    h.update( b3);
    const b4 = curve.G1.toUncompressed(g1sx);
    h.update( b4);
    const hash =h.digest();

    return hashToG2(curve, hash);
}

function calculatePubKey(k, curve, personalization, challengeHash, rng ) {
    k.g1_s = curve.G1.toAffine(curve.G1.fromRng(rng));
    k.g1_sx = curve.G1.toAffine(curve.G1.timesFr(k.g1_s, k.prvKey));
    k.g2_sp = curve.G2.toAffine(getG2sp(curve, personalization, challengeHash, k.g1_s, k.g1_sx));
    k.g2_spx = curve.G2.toAffine(curve.G2.timesFr(k.g2_sp, k.prvKey));
    return k;
}

function createPTauKey(curve, challengeHash, rng) {
    const key = {
        tau: {},
        alpha: {},
        beta: {}
    };
    key.tau.prvKey = curve.Fr.fromRng(rng);
    key.alpha.prvKey = curve.Fr.fromRng(rng);
    key.beta.prvKey = curve.Fr.fromRng(rng);
    calculatePubKey(key.tau, curve, 0, challengeHash, rng);
    calculatePubKey(key.alpha, curve, 1, challengeHash, rng);
    calculatePubKey(key.beta, curve, 2, challengeHash, rng);
    return key;
}

/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

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

async function writePTauHeader(fd, curve, power, ceremonyPower) {
    // Write the header
    ///////////

    if (! ceremonyPower) ceremonyPower = power;
    await fd.writeULE32(1); // Header type
    const pHeaderSize = fd.pos;
    await fd.writeULE64(0); // Temporally set to 0 length

    await fd.writeULE32(curve.F1.n64*8);

    const buff = new Uint8Array(curve.F1.n8);
    ffjavascript.Scalar.toRprLE(buff, 0, curve.q, curve.F1.n8);
    await fd.write(buff);
    await fd.writeULE32(power);                    // power
    await fd.writeULE32(ceremonyPower);               // power

    const headerSize = fd.pos - pHeaderSize - 8;

    const oldPos = fd.pos;

    await fd.writeULE64(headerSize, pHeaderSize);

    fd.pos = oldPos;
}

async function readPTauHeader(fd, sections) {
    if (!sections[1])  throw new Error(fd.fileName + ": File has no  header");
    if (sections[1].length>1) throw new Error(fd.fileName +": File has more than one header");

    fd.pos = sections[1][0].p;
    const n8 = await fd.readULE32();
    const buff = await fd.read(n8);
    const q = ffjavascript.Scalar.fromRprLE(buff);

    const curve = await getCurveFromQ(q);

    if (curve.F1.n64*8 != n8) throw new Error(fd.fileName +": Invalid size");

    const power = await fd.readULE32();
    const ceremonyPower = await fd.readULE32();

    if (fd.pos-sections[1][0].p != sections[1][0].size) throw new Error("Invalid PTau header size");

    return {curve, power, ceremonyPower};
}


async function readPtauPubKey(fd, curve, montgomery) {

    const buff = await fd.read(curve.F1.n8*2*6 + curve.F2.n8*2*3);

    return fromPtauPubKeyRpr(buff, 0, curve, montgomery);
}

function fromPtauPubKeyRpr(buff, pos, curve, montgomery) {

    const key = {
        tau: {},
        alpha: {},
        beta: {}
    };

    key.tau.g1_s = readG1();
    key.tau.g1_sx = readG1();
    key.alpha.g1_s = readG1();
    key.alpha.g1_sx = readG1();
    key.beta.g1_s = readG1();
    key.beta.g1_sx = readG1();
    key.tau.g2_spx = readG2();
    key.alpha.g2_spx = readG2();
    key.beta.g2_spx = readG2();

    return key;

    function readG1() {
        let p;
        if (montgomery) {
            p = curve.G1.fromRprLEM( buff, pos );
        } else {
            p = curve.G1.fromRprUncompressed( buff, pos );
        }
        pos += curve.G1.F.n8*2;
        return p;
    }

    function readG2() {
        let p;
        if (montgomery) {
            p = curve.G2.fromRprLEM( buff, pos );
        } else {
            p = curve.G2.fromRprUncompressed( buff, pos );
        }
        pos += curve.G2.F.n8*2;
        return p;
    }
}

function toPtauPubKeyRpr(buff, pos, curve, key, montgomery) {

    writeG1(key.tau.g1_s);
    writeG1(key.tau.g1_sx);
    writeG1(key.alpha.g1_s);
    writeG1(key.alpha.g1_sx);
    writeG1(key.beta.g1_s);
    writeG1(key.beta.g1_sx);
    writeG2(key.tau.g2_spx);
    writeG2(key.alpha.g2_spx);
    writeG2(key.beta.g2_spx);

    async function writeG1(p) {
        if (montgomery) {
            curve.G1.toRprLEM(buff, pos, p);
        } else {
            curve.G1.toRprUncompressed(buff, pos, p);
        }
        pos += curve.F1.n8*2;
    }

    async function writeG2(p) {
        if (montgomery) {
            curve.G2.toRprLEM(buff, pos, p);
        } else {
            curve.G2.toRprUncompressed(buff, pos, p);
        }
        pos += curve.F2.n8*2;
    }

    return buff;
}

async function writePtauPubKey(fd, curve, key, montgomery) {
    const buff = new Uint8Array(curve.F1.n8*2*6 + curve.F2.n8*2*3);
    toPtauPubKeyRpr(buff, 0, curve, key, montgomery);
    await fd.write(buff);
}

async function readContribution(fd, curve) {
    const c = {};

    c.tauG1 = await readG1();
    c.tauG2 = await readG2();
    c.alphaG1 = await readG1();
    c.betaG1 = await readG1();
    c.betaG2 = await readG2();
    c.key = await readPtauPubKey(fd, curve, true);
    c.partialHash = await fd.read(216);
    c.nextChallenge = await fd.read(64);
    c.type = await fd.readULE32();

    const buffV  = new Uint8Array(curve.G1.F.n8*2*6+curve.G2.F.n8*2*3);
    toPtauPubKeyRpr(buffV, 0, curve, c.key, false);

    const responseHasher = Blake2b__default["default"](64);
    responseHasher.setPartialHash(c.partialHash);
    responseHasher.update(buffV);
    c.responseHash = responseHasher.digest();

    const paramLength = await fd.readULE32();
    const curPos = fd.pos;
    let lastType =0;
    while (fd.pos-curPos < paramLength) {
        const buffType = await readDV(1);
        if (buffType[0]<= lastType) throw new Error("Parameters in the contribution must be sorted");
        lastType = buffType[0];
        if (buffType[0]==1) {     // Name
            const buffLen = await readDV(1);
            const buffStr = await readDV(buffLen[0]);
            c.name = new TextDecoder().decode(buffStr);
        } else if (buffType[0]==2) {
            const buffExp = await readDV(1);
            c.numIterationsExp = buffExp[0];
        } else if (buffType[0]==3) {
            const buffLen = await readDV(1);
            c.beaconHash = await readDV(buffLen[0]);
        } else {
            throw new Error("Parameter not recognized");
        }
    }
    if (fd.pos != curPos + paramLength) {
        throw new Error("Parametes do not match");
    }

    return c;

    async function readG1() {
        const pBuff = await fd.read(curve.G1.F.n8*2);
        return curve.G1.fromRprLEM( pBuff );
    }

    async function readG2() {
        const pBuff = await fd.read(curve.G2.F.n8*2);
        return curve.G2.fromRprLEM( pBuff );
    }

    async function readDV(n) {
        const b = await fd.read(n);
        return new Uint8Array(b);
    }
}

async function readContributions(fd, curve, sections) {
    if (!sections[7])  throw new Error(fd.fileName + ": File has no  contributions");
    if (sections[7][0].length>1) throw new Error(fd.fileName +": File has more than one contributions section");

    fd.pos = sections[7][0].p;
    const nContributions = await fd.readULE32();
    const contributions = [];
    for (let i=0; i<nContributions; i++) {
        const c = await readContribution(fd, curve);
        c.id = i+1;
        contributions.push(c);
    }

    if (fd.pos-sections[7][0].p != sections[7][0].size) throw new Error("Invalid contribution section size");

    return contributions;
}

async function writeContribution(fd, curve, contribution) {

    const buffG1 = new Uint8Array(curve.F1.n8*2);
    const buffG2 = new Uint8Array(curve.F2.n8*2);
    await writeG1(contribution.tauG1);
    await writeG2(contribution.tauG2);
    await writeG1(contribution.alphaG1);
    await writeG1(contribution.betaG1);
    await writeG2(contribution.betaG2);
    await writePtauPubKey(fd, curve, contribution.key, true);
    await fd.write(contribution.partialHash);
    await fd.write(contribution.nextChallenge);
    await fd.writeULE32(contribution.type || 0);

    const params = [];
    if (contribution.name) {
        params.push(1);      // Param Name
        const nameData = new TextEncoder("utf-8").encode(contribution.name.substring(0,64));
        params.push(nameData.byteLength);
        for (let i=0; i<nameData.byteLength; i++) params.push(nameData[i]);
    }
    if (contribution.type == 1) {
        params.push(2);      // Param numIterationsExp
        params.push(contribution.numIterationsExp);

        params.push(3);      // Beacon Hash
        params.push(contribution.beaconHash.byteLength);
        for (let i=0; i<contribution.beaconHash.byteLength; i++) params.push(contribution.beaconHash[i]);
    }
    if (params.length>0) {
        const paramsBuff = new Uint8Array(params);
        await fd.writeULE32(paramsBuff.byteLength);
        await fd.write(paramsBuff);
    } else {
        await fd.writeULE32(0);
    }


    async function writeG1(p) {
        curve.G1.toRprLEM(buffG1, 0, p);
        await fd.write(buffG1);
    }

    async function writeG2(p) {
        curve.G2.toRprLEM(buffG2, 0, p);
        await fd.write(buffG2);
    }

}

async function writeContributions(fd, curve, contributions) {

    await fd.writeULE32(7); // Header type
    const pContributionsSize = fd.pos;
    await fd.writeULE64(0); // Temporally set to 0 length

    await fd.writeULE32(contributions.length);
    for (let i=0; i< contributions.length; i++) {
        await writeContribution(fd, curve, contributions[i]);
    }
    const contributionsSize = fd.pos - pContributionsSize - 8;

    const oldPos = fd.pos;

    await fd.writeULE64(contributionsSize, pContributionsSize);
    fd.pos = oldPos;
}

function calculateFirstChallengeHash(curve, power, logger) {
    if (logger) logger.debug("Calculating First Challenge Hash");

    const hasher = new Blake2b__default["default"](64);

    const vG1 = new Uint8Array(curve.G1.F.n8*2);
    const vG2 = new Uint8Array(curve.G2.F.n8*2);
    curve.G1.toRprUncompressed(vG1, 0, curve.G1.g);
    curve.G2.toRprUncompressed(vG2, 0, curve.G2.g);

    hasher.update(Blake2b__default["default"](64).digest());

    let n;

    n=(2 ** power)*2 -1;
    if (logger) logger.debug("Calculate Initial Hash: tauG1");
    hashBlock(vG1, n);
    n= 2 ** power;
    if (logger) logger.debug("Calculate Initial Hash: tauG2");
    hashBlock(vG2, n);
    if (logger) logger.debug("Calculate Initial Hash: alphaTauG1");
    hashBlock(vG1, n);
    if (logger) logger.debug("Calculate Initial Hash: betaTauG1");
    hashBlock(vG1, n);
    hasher.update(vG2);

    return hasher.digest();

    function hashBlock(buff, n) {
        // this block size is a good compromise between speed and the maximum
        // input size of the Blake2b update method (65,535,720 bytes).
        const blockSize = 341000;
        const nBlocks = Math.floor(n / blockSize);
        const rem = n % blockSize;
        const bigBuff = new Uint8Array(blockSize * buff.byteLength);
        for (let i=0; i<blockSize; i++) {
            bigBuff.set(buff, i*buff.byteLength);
        }
        for (let i=0; i<nBlocks; i++) {
            hasher.update(bigBuff);
            if (logger) logger.debug("Initial hash: " +i*blockSize);
        }
        for (let i=0; i<rem; i++) {
            hasher.update(buff);
        }
    }
}


function keyFromBeacon(curve, challengeHash, beaconHash, numIterationsExp) {

    const rng = rngFromBeaconParams(beaconHash, numIterationsExp);

    const key = createPTauKey(curve, challengeHash, rng);

    return key;
}

/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

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

async function newAccumulator(curve, power, fileName, logger) {

    await Blake2b__default["default"].ready();

    const fd = await binFileUtils__namespace.createBinFile(fileName, "ptau", 1, 7);

    await writePTauHeader(fd, curve, power, 0);

    const buffG1 = curve.G1.oneAffine;
    const buffG2 = curve.G2.oneAffine;

    // Write tauG1
    ///////////
    await binFileUtils__namespace.startWriteSection(fd, 2);
    const nTauG1 = (2 ** power) * 2 -1;
    for (let i=0; i< nTauG1; i++) {
        await fd.write(buffG1);
        if ((logger)&&((i%100000) == 0)&&i) logger.log("tauG1: " + i);
    }
    await binFileUtils__namespace.endWriteSection(fd);

    // Write tauG2
    ///////////
    await binFileUtils__namespace.startWriteSection(fd, 3);
    const nTauG2 = (2 ** power);
    for (let i=0; i< nTauG2; i++) {
        await fd.write(buffG2);
        if ((logger)&&((i%100000) == 0)&&i) logger.log("tauG2: " + i);
    }
    await binFileUtils__namespace.endWriteSection(fd);

    // Write alphaTauG1
    ///////////
    await binFileUtils__namespace.startWriteSection(fd, 4);
    const nAlfaTauG1 = (2 ** power);
    for (let i=0; i< nAlfaTauG1; i++) {
        await fd.write(buffG1);
        if ((logger)&&((i%100000) == 0)&&i) logger.log("alphaTauG1: " + i);
    }
    await binFileUtils__namespace.endWriteSection(fd);

    // Write betaTauG1
    ///////////
    await binFileUtils__namespace.startWriteSection(fd, 5);
    const nBetaTauG1 = (2 ** power);
    for (let i=0; i< nBetaTauG1; i++) {
        await fd.write(buffG1);
        if ((logger)&&((i%100000) == 0)&&i) logger.log("betaTauG1: " + i);
    }
    await binFileUtils__namespace.endWriteSection(fd);

    // Write betaG2
    ///////////
    await binFileUtils__namespace.startWriteSection(fd, 6);
    await fd.write(buffG2);
    await binFileUtils__namespace.endWriteSection(fd);

    // Contributions
    ///////////
    await binFileUtils__namespace.startWriteSection(fd, 7);
    await fd.writeULE32(0); // 0 Contributions
    await binFileUtils__namespace.endWriteSection(fd);

    await fd.close();

    const firstChallengeHash = calculateFirstChallengeHash(curve, power, logger);

    if (logger) logger.debug(formatHash(Blake2b__default["default"](64).digest(), "Blank Contribution Hash:"));

    if (logger) logger.info(formatHash(firstChallengeHash, "First Contribution Hash:"));

    return firstChallengeHash;

}

// Format of the outpu

async function exportChallenge(pTauFilename, challengeFilename, logger) {
    await Blake2b__default["default"].ready();
    const {fd: fdFrom, sections} = await binFileUtils__namespace.readBinFile(pTauFilename, "ptau", 1);

    const {curve, power} = await readPTauHeader(fdFrom, sections);

    const contributions = await readContributions(fdFrom, curve, sections);
    let lastResponseHash, curChallengeHash;
    if (contributions.length == 0) {
        lastResponseHash = Blake2b__default["default"](64).digest();
        curChallengeHash = calculateFirstChallengeHash(curve, power);
    } else {
        lastResponseHash = contributions[contributions.length-1].responseHash;
        curChallengeHash = contributions[contributions.length-1].nextChallenge;
    }

    if (logger) logger.info(formatHash(lastResponseHash, "Last Response Hash: "));

    if (logger) logger.info(formatHash(curChallengeHash, "New Challenge Hash: "));


    const fdTo = await fastFile__namespace.createOverride(challengeFilename);

    const toHash = Blake2b__default["default"](64);
    await fdTo.write(lastResponseHash);
    toHash.update(lastResponseHash);

    await exportSection(2, "G1", (2 ** power) * 2 -1, "tauG1");
    await exportSection(3, "G2", (2 ** power)       , "tauG2");
    await exportSection(4, "G1", (2 ** power)       , "alphaTauG1");
    await exportSection(5, "G1", (2 ** power)       , "betaTauG1");
    await exportSection(6, "G2", 1                  , "betaG2");

    await fdFrom.close();
    await fdTo.close();

    const calcCurChallengeHash = toHash.digest();

    if (!hashIsEqual (curChallengeHash, calcCurChallengeHash)) {
        if (logger) logger.info(formatHash(calcCurChallengeHash, "Calc Curret Challenge Hash: "));

        if (logger) logger.error("PTau file is corrupted. Calculated new challenge hash does not match with the eclared one");
        throw new Error("PTau file is corrupted. Calculated new challenge hash does not match with the eclared one");
    }

    return curChallengeHash;

    async function exportSection(sectionId, groupName, nPoints, sectionName) {
        const G = curve[groupName];
        const sG = G.F.n8*2;
        const nPointsChunk = Math.floor((1<<24)/sG);

        await binFileUtils__namespace.startReadUniqueSection(fdFrom, sections, sectionId);
        for (let i=0; i< nPoints; i+= nPointsChunk) {
            if (logger) logger.debug(`Exporting ${sectionName}: ${i}/${nPoints}`);
            const n = Math.min(nPoints-i, nPointsChunk);
            let buff;
            buff = await fdFrom.read(n*sG);
            buff = await G.batchLEMtoU(buff);
            await fdTo.write(buff);
            toHash.update(buff);
        }
        await binFileUtils__namespace.endReadSection(fdFrom);
    }


}

/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

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

async function importResponse(oldPtauFilename, contributionFilename, newPTauFilename, name, importPoints, logger) {

    await Blake2b__default["default"].ready();

    const noHash = new Uint8Array(64);
    for (let i=0; i<64; i++) noHash[i] = 0xFF;

    const {fd: fdOld, sections} = await binFileUtils__namespace.readBinFile(oldPtauFilename, "ptau", 1);
    const {curve, power} = await readPTauHeader(fdOld, sections);
    const contributions = await readContributions(fdOld, curve, sections);
    const currentContribution = {};

    if (name) currentContribution.name = name;

    const sG1 = curve.F1.n8*2;
    const scG1 = curve.F1.n8; // Compresed size
    const sG2 = curve.F2.n8*2;
    const scG2 = curve.F2.n8; // Compresed size

    const fdResponse = await fastFile__namespace.readExisting(contributionFilename);

    if  (fdResponse.totalSize !=
        64 +                            // Old Hash
        ((2 ** power)*2-1)*scG1 +
        (2 ** power)*scG2 +
        (2 ** power)*scG1 +
        (2 ** power)*scG1 +
        scG2 +
        sG1*6 + sG2*3)
        throw new Error("Size of the contribution is invalid");

    let lastChallengeHash;

    if (contributions.length>0) {
        lastChallengeHash = contributions[contributions.length-1].nextChallenge;
    } else {
        lastChallengeHash = calculateFirstChallengeHash(curve, power, logger);
    }

    const fdNew = await binFileUtils__namespace.createBinFile(newPTauFilename, "ptau", 1, importPoints ? 7: 2);
    await writePTauHeader(fdNew, curve, power);

    const contributionPreviousHash = await fdResponse.read(64);

    if (hashIsEqual(noHash,lastChallengeHash)) {
        lastChallengeHash = contributionPreviousHash;
        contributions[contributions.length-1].nextChallenge = lastChallengeHash;
    }

    if(!hashIsEqual(contributionPreviousHash,lastChallengeHash))
        throw new Error("Wrong contribution. this contribution is not based on the previus hash");

    const hasherResponse = new Blake2b__default["default"](64);
    hasherResponse.update(contributionPreviousHash);

    const startSections = [];
    let res;
    res = await processSection(fdResponse, fdNew, "G1", 2, (2 ** power) * 2 -1, [1], "tauG1");
    currentContribution.tauG1 = res[0];
    res = await processSection(fdResponse, fdNew, "G2", 3, (2 ** power)       , [1], "tauG2");
    currentContribution.tauG2 = res[0];
    res = await processSection(fdResponse, fdNew, "G1", 4, (2 ** power)       , [0], "alphaG1");
    currentContribution.alphaG1 = res[0];
    res = await processSection(fdResponse, fdNew, "G1", 5, (2 ** power)       , [0], "betaG1");
    currentContribution.betaG1 = res[0];
    res = await processSection(fdResponse, fdNew, "G2", 6, 1                  , [0], "betaG2");
    currentContribution.betaG2 = res[0];

    currentContribution.partialHash = hasherResponse.getPartialHash();


    const buffKey = await fdResponse.read(curve.F1.n8*2*6+curve.F2.n8*2*3);

    currentContribution.key = fromPtauPubKeyRpr(buffKey, 0, curve, false);

    hasherResponse.update(new Uint8Array(buffKey));
    const hashResponse = hasherResponse.digest();

    if (logger) logger.info(formatHash(hashResponse, "Contribution Response Hash imported: "));

    if (importPoints) {
        const nextChallengeHasher = new Blake2b__default["default"](64);
        nextChallengeHasher.update(hashResponse);

        await hashSection(nextChallengeHasher, fdNew, "G1", 2, (2 ** power) * 2 -1, "tauG1", logger);
        await hashSection(nextChallengeHasher, fdNew, "G2", 3, (2 ** power)       , "tauG2", logger);
        await hashSection(nextChallengeHasher, fdNew, "G1", 4, (2 ** power)       , "alphaTauG1", logger);
        await hashSection(nextChallengeHasher, fdNew, "G1", 5, (2 ** power)       , "betaTauG1", logger);
        await hashSection(nextChallengeHasher, fdNew, "G2", 6, 1                  , "betaG2", logger);

        currentContribution.nextChallenge = nextChallengeHasher.digest();

        if (logger) logger.info(formatHash(currentContribution.nextChallenge, "Next Challenge Hash: "));
    } else {
        currentContribution.nextChallenge = noHash;
    }

    contributions.push(currentContribution);

    await writeContributions(fdNew, curve, contributions);

    await fdResponse.close();
    await fdNew.close();
    await fdOld.close();

    return currentContribution.nextChallenge;

    async function processSection(fdFrom, fdTo, groupName, sectionId, nPoints, singularPointIndexes, sectionName) {
        if (importPoints) {
            return await processSectionImportPoints(fdFrom, fdTo, groupName, sectionId, nPoints, singularPointIndexes, sectionName);
        } else {
            return await processSectionNoImportPoints(fdFrom, fdTo, groupName, sectionId, nPoints, singularPointIndexes, sectionName);
        }
    }

    async function processSectionImportPoints(fdFrom, fdTo, groupName, sectionId, nPoints, singularPointIndexes, sectionName) {

        const G = curve[groupName];
        const scG = G.F.n8;
        const sG = G.F.n8*2;

        const singularPoints = [];

        await binFileUtils__namespace.startWriteSection(fdTo, sectionId);
        const nPointsChunk = Math.floor((1<<24)/sG);

        startSections[sectionId] = fdTo.pos;

        for (let i=0; i< nPoints; i += nPointsChunk) {
            if (logger) logger.debug(`Importing ${sectionName}: ${i}/${nPoints}`);
            const n = Math.min(nPoints-i, nPointsChunk);

            const buffC = await fdFrom.read(n * scG);
            hasherResponse.update(buffC);

            const buffLEM = await G.batchCtoLEM(buffC);

            await fdTo.write(buffLEM);
            for (let j=0; j<singularPointIndexes.length; j++) {
                const sp = singularPointIndexes[j];
                if ((sp >=i) && (sp < i+n)) {
                    const P = G.fromRprLEM(buffLEM, (sp-i)*sG);
                    singularPoints.push(P);
                }
            }
        }

        await binFileUtils__namespace.endWriteSection(fdTo);

        return singularPoints;
    }


    async function processSectionNoImportPoints(fdFrom, fdTo, groupName, sectionId, nPoints, singularPointIndexes, sectionName) {

        const G = curve[groupName];
        const scG = G.F.n8;

        const singularPoints = [];

        const nPointsChunk = Math.floor((1<<24)/scG);

        for (let i=0; i< nPoints; i += nPointsChunk) {
            if (logger) logger.debug(`Importing ${sectionName}: ${i}/${nPoints}`);
            const n = Math.min(nPoints-i, nPointsChunk);

            const buffC = await fdFrom.read(n * scG);
            hasherResponse.update(buffC);

            for (let j=0; j<singularPointIndexes.length; j++) {
                const sp = singularPointIndexes[j];
                if ((sp >=i) && (sp < i+n)) {
                    const P = G.fromRprCompressed(buffC, (sp-i)*scG);
                    singularPoints.push(P);
                }
            }
        }

        return singularPoints;
    }


    async function hashSection(nextChallengeHasher, fdTo, groupName, sectionId, nPoints, sectionName, logger) {

        const G = curve[groupName];
        const sG = G.F.n8*2;
        const nPointsChunk = Math.floor((1<<24)/sG);

        const oldPos = fdTo.pos;
        fdTo.pos = startSections[sectionId];

        for (let i=0; i< nPoints; i += nPointsChunk) {
            if (logger) logger.debug(`Hashing ${sectionName}: ${i}/${nPoints}`);
            const n = Math.min(nPoints-i, nPointsChunk);

            const buffLEM = await fdTo.read(n * sG);

            const buffU = await G.batchLEMtoU(buffLEM);

            nextChallengeHasher.update(buffU);
        }

        fdTo.pos = oldPos;
    }

}

/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

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
const sameRatio$1 = sameRatio$2;

async function verifyContribution(curve, cur, prev, logger) {
    let sr;
    if (cur.type == 1) {    // Verify the beacon.
        const beaconKey = keyFromBeacon(curve, prev.nextChallenge, cur.beaconHash, cur.numIterationsExp);

        if (!curve.G1.eq(cur.key.tau.g1_s, beaconKey.tau.g1_s)) {
            if (logger) logger.error(`BEACON key (tauG1_s) is not generated correctly in challenge #${cur.id}  ${cur.name || ""}` );
            return false;
        }
        if (!curve.G1.eq(cur.key.tau.g1_sx, beaconKey.tau.g1_sx)) {
            if (logger) logger.error(`BEACON key (tauG1_sx) is not generated correctly in challenge #${cur.id}  ${cur.name || ""}` );
            return false;
        }
        if (!curve.G2.eq(cur.key.tau.g2_spx, beaconKey.tau.g2_spx)) {
            if (logger) logger.error(`BEACON key (tauG2_spx) is not generated correctly in challenge #${cur.id}  ${cur.name || ""}` );
            return false;
        }

        if (!curve.G1.eq(cur.key.alpha.g1_s, beaconKey.alpha.g1_s)) {
            if (logger) logger.error(`BEACON key (alphaG1_s) is not generated correctly in challenge #${cur.id}  ${cur.name || ""}` );
            return false;
        }
        if (!curve.G1.eq(cur.key.alpha.g1_sx, beaconKey.alpha.g1_sx)) {
            if (logger) logger.error(`BEACON key (alphaG1_sx) is not generated correctly in challenge #${cur.id}  ${cur.name || ""}` );
            return false;
        }
        if (!curve.G2.eq(cur.key.alpha.g2_spx, beaconKey.alpha.g2_spx)) {
            if (logger) logger.error(`BEACON key (alphaG2_spx) is not generated correctly in challenge #${cur.id}  ${cur.name || ""}` );
            return false;
        }

        if (!curve.G1.eq(cur.key.beta.g1_s, beaconKey.beta.g1_s)) {
            if (logger) logger.error(`BEACON key (betaG1_s) is not generated correctly in challenge #${cur.id}  ${cur.name || ""}` );
            return false;
        }
        if (!curve.G1.eq(cur.key.beta.g1_sx, beaconKey.beta.g1_sx)) {
            if (logger) logger.error(`BEACON key (betaG1_sx) is not generated correctly in challenge #${cur.id}  ${cur.name || ""}` );
            return false;
        }
        if (!curve.G2.eq(cur.key.beta.g2_spx, beaconKey.beta.g2_spx)) {
            if (logger) logger.error(`BEACON key (betaG2_spx) is not generated correctly in challenge #${cur.id}  ${cur.name || ""}` );
            return false;
        }
    }

    cur.key.tau.g2_sp = curve.G2.toAffine(getG2sp(curve, 0, prev.nextChallenge, cur.key.tau.g1_s, cur.key.tau.g1_sx));
    cur.key.alpha.g2_sp = curve.G2.toAffine(getG2sp(curve, 1, prev.nextChallenge, cur.key.alpha.g1_s, cur.key.alpha.g1_sx));
    cur.key.beta.g2_sp = curve.G2.toAffine(getG2sp(curve, 2, prev.nextChallenge, cur.key.beta.g1_s, cur.key.beta.g1_sx));

    sr = await sameRatio$1(curve, cur.key.tau.g1_s, cur.key.tau.g1_sx, cur.key.tau.g2_sp, cur.key.tau.g2_spx);
    if (sr !== true) {
        if (logger) logger.error("INVALID key (tau) in challenge #"+cur.id);
        return false;
    }

    sr = await sameRatio$1(curve, cur.key.alpha.g1_s, cur.key.alpha.g1_sx, cur.key.alpha.g2_sp, cur.key.alpha.g2_spx);
    if (sr !== true) {
        if (logger) logger.error("INVALID key (alpha) in challenge #"+cur.id);
        return false;
    }

    sr = await sameRatio$1(curve, cur.key.beta.g1_s, cur.key.beta.g1_sx, cur.key.beta.g2_sp, cur.key.beta.g2_spx);
    if (sr !== true) {
        if (logger) logger.error("INVALID key (beta) in challenge #"+cur.id);
        return false;
    }

    sr = await sameRatio$1(curve, prev.tauG1, cur.tauG1, cur.key.tau.g2_sp, cur.key.tau.g2_spx);
    if (sr !== true) {
        if (logger) logger.error("INVALID tau*G1. challenge #"+cur.id+" It does not follow the previous contribution");
        return false;
    }

    sr = await sameRatio$1(curve,  cur.key.tau.g1_s, cur.key.tau.g1_sx, prev.tauG2, cur.tauG2);
    if (sr !== true) {
        if (logger) logger.error("INVALID tau*G2. challenge #"+cur.id+" It does not follow the previous contribution");
        return false;
    }

    sr = await sameRatio$1(curve, prev.alphaG1, cur.alphaG1, cur.key.alpha.g2_sp, cur.key.alpha.g2_spx);
    if (sr !== true) {
        if (logger) logger.error("INVALID alpha*G1. challenge #"+cur.id+" It does not follow the previous contribution");
        return false;
    }

    sr = await sameRatio$1(curve, prev.betaG1, cur.betaG1, cur.key.beta.g2_sp, cur.key.beta.g2_spx);
    if (sr !== true) {
        if (logger) logger.error("INVALID beta*G1. challenge #"+cur.id+" It does not follow the previous contribution");
        return false;
    }

    sr = await sameRatio$1(curve,  cur.key.beta.g1_s, cur.key.beta.g1_sx, prev.betaG2, cur.betaG2);
    if (sr !== true) {
        if (logger) logger.error("INVALID beta*G2. challenge #"+cur.id+"It does not follow the previous contribution");
        return false;
    }

    if (logger) logger.info("Powers Of tau file OK!");
    return true;
}

async function verify(tauFilename, logger) {
    let sr;
    await Blake2b__default["default"].ready();

    const {fd, sections} = await binFileUtils__namespace.readBinFile(tauFilename, "ptau", 1);
    const {curve, power, ceremonyPower} = await readPTauHeader(fd, sections);
    const contrs = await readContributions(fd, curve, sections);

    if (logger) logger.debug("power: 2**" + power);
    // Verify Last contribution

    if (logger) logger.debug("Computing initial contribution hash");
    const initialContribution = {
        tauG1: curve.G1.g,
        tauG2: curve.G2.g,
        alphaG1: curve.G1.g,
        betaG1: curve.G1.g,
        betaG2: curve.G2.g,
        nextChallenge: calculateFirstChallengeHash(curve, ceremonyPower, logger),
        responseHash: Blake2b__default["default"](64).digest()
    };

    if (contrs.length == 0) {
        if (logger) logger.error("This file has no contribution! It cannot be used in production");
        return false;
    }

    let prevContr;
    if (contrs.length>1) {
        prevContr = contrs[contrs.length-2];
    } else {
        prevContr = initialContribution;
    }
    const curContr = contrs[contrs.length-1];
    if (logger) logger.debug("Validating contribution #"+contrs[contrs.length-1].id);
    const res = await verifyContribution(curve, curContr, prevContr, logger);
    if (!res) return false;


    const nextContributionHasher = Blake2b__default["default"](64);
    nextContributionHasher.update(curContr.responseHash);

    // Verify powers and compute nextChallengeHash

    // await test();

    // Verify Section tau*G1
    if (logger) logger.debug("Verifying powers in tau*G1 section");
    const rTau1 = await processSection(2, "G1", "tauG1", (2 ** power)*2-1, [0, 1], logger);
    sr = await sameRatio$1(curve, rTau1.R1, rTau1.R2, curve.G2.g, curContr.tauG2);
    if (sr !== true) {
        if (logger) logger.error("tauG1 section. Powers do not match");
        return false;
    }
    if (!curve.G1.eq(curve.G1.g, rTau1.singularPoints[0])) {
        if (logger) logger.error("First element of tau*G1 section must be the generator");
        return false;
    }
    if (!curve.G1.eq(curContr.tauG1, rTau1.singularPoints[1])) {
        if (logger) logger.error("Second element of tau*G1 section does not match the one in the contribution section");
        return false;
    }

    // await test();

    // Verify Section tau*G2
    if (logger) logger.debug("Verifying powers in tau*G2 section");
    const rTau2 = await processSection(3, "G2", "tauG2", 2 ** power, [0, 1],  logger);
    sr = await sameRatio$1(curve, curve.G1.g, curContr.tauG1, rTau2.R1, rTau2.R2);
    if (sr !== true) {
        if (logger) logger.error("tauG2 section. Powers do not match");
        return false;
    }
    if (!curve.G2.eq(curve.G2.g, rTau2.singularPoints[0])) {
        if (logger) logger.error("First element of tau*G2 section must be the generator");
        return false;
    }
    if (!curve.G2.eq(curContr.tauG2, rTau2.singularPoints[1])) {
        if (logger) logger.error("Second element of tau*G2 section does not match the one in the contribution section");
        return false;
    }

    // Verify Section alpha*tau*G1
    if (logger) logger.debug("Verifying powers in alpha*tau*G1 section");
    const rAlphaTauG1 = await processSection(4, "G1", "alphatauG1", 2 ** power, [0], logger);
    sr = await sameRatio$1(curve, rAlphaTauG1.R1, rAlphaTauG1.R2, curve.G2.g, curContr.tauG2);
    if (sr !== true) {
        if (logger) logger.error("alphaTauG1 section. Powers do not match");
        return false;
    }
    if (!curve.G1.eq(curContr.alphaG1, rAlphaTauG1.singularPoints[0])) {
        if (logger) logger.error("First element of alpha*tau*G1 section (alpha*G1) does not match the one in the contribution section");
        return false;
    }

    // Verify Section beta*tau*G1
    if (logger) logger.debug("Verifying powers in beta*tau*G1 section");
    const rBetaTauG1 = await processSection(5, "G1", "betatauG1", 2 ** power, [0], logger);
    sr = await sameRatio$1(curve, rBetaTauG1.R1, rBetaTauG1.R2, curve.G2.g, curContr.tauG2);
    if (sr !== true) {
        if (logger) logger.error("betaTauG1 section. Powers do not match");
        return false;
    }
    if (!curve.G1.eq(curContr.betaG1, rBetaTauG1.singularPoints[0])) {
        if (logger) logger.error("First element of beta*tau*G1 section (beta*G1) does not match the one in the contribution section");
        return false;
    }

    //Verify Beta G2
    const betaG2 = await processSectionBetaG2(logger);
    if (!curve.G2.eq(curContr.betaG2, betaG2)) {
        if (logger) logger.error("betaG2 element in betaG2 section does not match the one in the contribution section");
        return false;
    }


    const nextContributionHash = nextContributionHasher.digest();

    // Check the nextChallengeHash
    if (power == ceremonyPower) {
        if (!hashIsEqual(nextContributionHash,curContr.nextChallenge)) {
            if (logger) logger.error("Hash of the values does not match the next challenge of the last contributor in the contributions section");
            return false;
        }
    }

    if (logger) logger.info(formatHash(nextContributionHash, "Next challenge hash: "));

    // Verify Previous contributions

    printContribution(curContr, prevContr);
    for (let i = contrs.length-2; i>=0; i--) {
        const curContr = contrs[i];
        const prevContr =  (i>0) ? contrs[i-1] : initialContribution;
        const res = await verifyContribution(curve, curContr, prevContr, logger);
        if (!res) return false;
        printContribution(curContr, prevContr);
    }
    if (logger) logger.info("-----------------------------------------------------");

    if ((!sections[12]) || (!sections[13]) || (!sections[14]) || (!sections[15])) {
        if (logger) logger.warn(
            "this file does not contain phase2 precalculated values. Please run: \n" +
            "   snarkjs \"powersoftau preparephase2\" to prepare this file to be used in the phase2 ceremony."
        );
    } else {
        let res;
        res = await verifyLagrangeEvaluations("G1", 2, 12, "tauG1", logger);
        if (!res) return false;
        res = await verifyLagrangeEvaluations("G2", 3, 13, "tauG2", logger);
        if (!res) return false;
        res = await verifyLagrangeEvaluations("G1", 4, 14, "alphaTauG1", logger);
        if (!res) return false;
        res = await verifyLagrangeEvaluations("G1", 5, 15, "betaTauG1", logger);
        if (!res) return false;
    }

    await fd.close();

    if (logger) logger.info("Powers of Tau Ok!");

    return true;

    function printContribution(curContr, prevContr) {
        if (!logger) return;
        logger.info("-----------------------------------------------------");
        logger.info(`Contribution #${curContr.id}: ${curContr.name ||""}`);

        logger.info(formatHash(curContr.nextChallenge, "Next Challenge: "));

        const buffV  = new Uint8Array(curve.G1.F.n8*2*6+curve.G2.F.n8*2*3);
        toPtauPubKeyRpr(buffV, 0, curve, curContr.key, false);

        const responseHasher = Blake2b__default["default"](64);
        responseHasher.setPartialHash(curContr.partialHash);
        responseHasher.update(buffV);
        const responseHash = responseHasher.digest();

        logger.info(formatHash(responseHash, "Response Hash:"));

        logger.info(formatHash(prevContr.nextChallenge, "Response Hash:"));

        if (curContr.type == 1) {
            logger.info(`Beacon generator: ${byteArray2hex(curContr.beaconHash)}`);
            logger.info(`Beacon iterations Exp: ${curContr.numIterationsExp}`);
        }

    }

    async function processSectionBetaG2(logger) {
        const G = curve.G2;
        const sG = G.F.n8*2;
        const buffUv = new Uint8Array(sG);

        if (!sections[6])  {
            logger.error("File has no BetaG2 section");
            throw new Error("File has no BetaG2 section");
        }
        if (sections[6].length>1) {
            logger.error("File has no BetaG2 section");
            throw new Error("File has more than one GetaG2 section");
        }
        fd.pos = sections[6][0].p;

        const buff = await fd.read(sG);
        const P = G.fromRprLEM(buff);

        G.toRprUncompressed(buffUv, 0, P);
        nextContributionHasher.update(buffUv);

        return P;
    }

    async function processSection(idSection, groupName, sectionName, nPoints, singularPointIndexes, logger) {
        const MAX_CHUNK_SIZE = 1<<16;
        const G = curve[groupName];
        const sG = G.F.n8*2;
        await binFileUtils__namespace.startReadUniqueSection(fd, sections, idSection);

        const singularPoints = [];

        let R1 = G.zero;
        let R2 = G.zero;

        let lastBase = G.zero;

        for (let i=0; i<nPoints; i += MAX_CHUNK_SIZE) {
            if (logger) logger.debug(`points relations: ${sectionName}: ${i}/${nPoints} `);
            const n = Math.min(nPoints - i, MAX_CHUNK_SIZE);
            const bases = await fd.read(n*sG);

            const basesU = await G.batchLEMtoU(bases);
            nextContributionHasher.update(basesU);

            const scalars = new Uint8Array(4*(n-1));
            crypto__default["default"].randomFillSync(scalars);


            if (i>0) {
                const firstBase = G.fromRprLEM(bases, 0);
                const r = crypto__default["default"].randomBytes(4).readUInt32BE(0, true);

                R1 = G.add(R1, G.timesScalar(lastBase, r));
                R2 = G.add(R2, G.timesScalar(firstBase, r));
            }

            const r1 = await G.multiExpAffine(bases.slice(0, (n-1)*sG), scalars);
            const r2 = await G.multiExpAffine(bases.slice(sG), scalars);

            R1 = G.add(R1, r1);
            R2 = G.add(R2, r2);

            lastBase = G.fromRprLEM( bases, (n-1)*sG);

            for (let j=0; j<singularPointIndexes.length; j++) {
                const sp = singularPointIndexes[j];
                if ((sp >=i) && (sp < i+n)) {
                    const P = G.fromRprLEM(bases, (sp-i)*sG);
                    singularPoints.push(P);
                }
            }

        }
        await binFileUtils__namespace.endReadSection(fd);

        return {
            R1: R1,
            R2: R2,
            singularPoints: singularPoints
        };

    }

    async function verifyLagrangeEvaluations(gName, tauSection, lagrangeSection, sectionName, logger) {

        if (logger) logger.debug(`Verifying phase2 calculated values ${sectionName}...`);
        const G = curve[gName];
        const sG = G.F.n8*2;

        const seed= new Array(8);
        for (let i=0; i<8; i++) {
            seed[i] = crypto__default["default"].randomBytes(4).readUInt32BE(0, true);
        }

        for (let p=0; p<= power; p ++) {
            const res = await verifyPower(p);
            if (!res) return false;
        }

        if (tauSection == 2) {
            const res = await verifyPower(power+1);
            if (!res) return false;
        }

        return true;

        async function verifyPower(p) {
            if (logger) logger.debug(`Power ${p}...`);
            const n8r = curve.Fr.n8;
            const nPoints = 2 ** p;
            let buff_r = new Uint32Array(nPoints);
            let buffG;

            let rng = new ffjavascript.ChaCha(seed);

            if (logger) logger.debug(`Creating random numbers Powers${p}...`);
            for (let i=0; i<nPoints; i++) {
                if ((p == power+1)&&(i == nPoints-1)) {
                    buff_r[i] = 0;
                } else {
                    buff_r[i] = rng.nextU32();
                }
            }

            buff_r = new Uint8Array(buff_r.buffer, buff_r.byteOffset, buff_r.byteLength);

            if (logger) logger.debug(`reading points Powers${p}...`);
            await binFileUtils__namespace.startReadUniqueSection(fd, sections, tauSection);
            buffG = new ffjavascript.BigBuffer(nPoints*sG);
            if (p == power+1) {
                await fd.readToBuffer(buffG, 0, (nPoints-1)*sG);
                buffG.set(curve.G1.zeroAffine, (nPoints-1)*sG);
            } else {
                await fd.readToBuffer(buffG, 0, nPoints*sG);
            }
            await binFileUtils__namespace.endReadSection(fd, true);

            const resTau = await G.multiExpAffine(buffG, buff_r, logger, sectionName + "_" + p);

            buff_r = new ffjavascript.BigBuffer(nPoints * n8r);

            rng = new ffjavascript.ChaCha(seed);

            const buff4 = new Uint8Array(4);
            const buff4V = new DataView(buff4.buffer);

            if (logger) logger.debug(`Creating random numbers Powers${p}...`);
            for (let i=0; i<nPoints; i++) {
                if ((i != nPoints-1) || (p != power+1)) {
                    buff4V.setUint32(0, rng.nextU32(), true);
                    buff_r.set(buff4, i*n8r);
                }
            }

            if (logger) logger.debug(`batchToMontgomery ${p}...`);
            buff_r = await curve.Fr.batchToMontgomery(buff_r);
            if (logger) logger.debug(`fft ${p}...`);
            buff_r = await curve.Fr.fft(buff_r);
            if (logger) logger.debug(`batchFromMontgomery ${p}...`);
            buff_r = await curve.Fr.batchFromMontgomery(buff_r);

            if (logger) logger.debug(`reading points Lagrange${p}...`);
            await binFileUtils__namespace.startReadUniqueSection(fd, sections, lagrangeSection);
            fd.pos += sG*((2 ** p)-1);
            await fd.readToBuffer(buffG, 0, nPoints*sG);
            await binFileUtils__namespace.endReadSection(fd, true);

            const resLagrange = await G.multiExpAffine(buffG, buff_r, logger, sectionName + "_" + p + "_transformed");

            if (!G.eq(resTau, resLagrange)) {
                if (logger) logger.error("Phase2 caclutation does not match with powers of tau");
                return false;
            }

            return true;
        }
    }
}

/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

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

/*
    This function creates a new section in the fdTo file with id idSection.
    It multiplies the pooints in fdFrom by first, first*inc, first*inc^2, ....
    nPoint Times.
    It also updates the newChallengeHasher with the new points
*/

async function applyKeyToSection(fdOld, sections, fdNew, idSection, curve, groupName, first, inc, sectionName, logger) {
    const MAX_CHUNK_SIZE = 1 << 16;
    const G = curve[groupName];
    const sG = G.F.n8*2;
    const nPoints = sections[idSection][0].size / sG;

    await binFileUtils__namespace.startReadUniqueSection(fdOld, sections,idSection );
    await binFileUtils__namespace.startWriteSection(fdNew, idSection);

    let t = first;
    for (let i=0; i<nPoints; i += MAX_CHUNK_SIZE) {
        if (logger) logger.debug(`Applying key: ${sectionName}: ${i}/${nPoints}`);
        const n= Math.min(nPoints - i, MAX_CHUNK_SIZE);
        let buff;
        buff = await fdOld.read(n*sG);
        buff = await G.batchApplyKey(buff, t, inc);
        await fdNew.write(buff);
        t = curve.Fr.mul(t, curve.Fr.exp(inc, n));
    }

    await binFileUtils__namespace.endWriteSection(fdNew);
    await binFileUtils__namespace.endReadSection(fdOld);
}



async function applyKeyToChallengeSection(fdOld, fdNew, responseHasher, curve, groupName, nPoints, first, inc, formatOut, sectionName, logger) {
    const G = curve[groupName];
    const sG = G.F.n8*2;
    const chunkSize = Math.floor((1<<20) / sG);   // 128Mb chunks
    let t = first;
    for (let i=0 ; i<nPoints ; i+= chunkSize) {
        if (logger) logger.debug(`Applying key ${sectionName}: ${i}/${nPoints}`);
        const n= Math.min(nPoints-i, chunkSize );
        const buffInU = await fdOld.read(n * sG);
        const buffInLEM = await G.batchUtoLEM(buffInU);
        const buffOutLEM = await G.batchApplyKey(buffInLEM, t, inc);
        let buffOut;
        if (formatOut == "COMPRESSED") {
            buffOut = await G.batchLEMtoC(buffOutLEM);
        } else {
            buffOut = await G.batchLEMtoU(buffOutLEM);
        }

        if (responseHasher) responseHasher.update(buffOut);
        await fdNew.write(buffOut);
        t = curve.Fr.mul(t, curve.Fr.exp(inc, n));
    }
}

/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

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

async function challengeContribute(curve, challengeFilename, responesFileName, entropy, logger) {
    await Blake2b__default["default"].ready();

    const fdFrom = await fastFile__namespace.readExisting(challengeFilename);


    const sG1 = curve.F1.n64*8*2;
    const sG2 = curve.F2.n64*8*2;
    const domainSize = (fdFrom.totalSize + sG1 - 64 - sG2) / (4*sG1 + sG2);
    let e = domainSize;
    let power = 0;
    while (e>1) {
        e = e /2;
        power += 1;
    }

    if (2 ** power != domainSize) throw new Error("Invalid file size");
    if (logger) logger.debug("Power to tau size: "+power);

    const rng = await getRandomRng(entropy);

    const fdTo = await fastFile__namespace.createOverride(responesFileName);

    // Calculate the hash
    const challengeHasher = Blake2b__default["default"](64);
    for (let i=0; i<fdFrom.totalSize; i+= fdFrom.pageSize) {
        if (logger) logger.debug(`Hashing challenge ${i}/${fdFrom.totalSize}`);
        const s = Math.min(fdFrom.totalSize - i, fdFrom.pageSize);
        const buff = await fdFrom.read(s);
        challengeHasher.update(buff);
    }

    const claimedHash = await fdFrom.read(64, 0);
    if (logger) logger.info(formatHash(claimedHash, "Claimed Previous Response Hash: "));

    const challengeHash = challengeHasher.digest();
    if (logger) logger.info(formatHash(challengeHash, "Current Challenge Hash: "));

    const key = createPTauKey(curve, challengeHash, rng);

    if (logger) {
        ["tau", "alpha", "beta"].forEach( (k) => {
            logger.debug(k + ".g1_s: " + curve.G1.toString(key[k].g1_s, 16));
            logger.debug(k + ".g1_sx: " + curve.G1.toString(key[k].g1_sx, 16));
            logger.debug(k + ".g2_sp: " + curve.G2.toString(key[k].g2_sp, 16));
            logger.debug(k + ".g2_spx: " + curve.G2.toString(key[k].g2_spx, 16));
            logger.debug("");
        });
    }

    const responseHasher = Blake2b__default["default"](64);

    await fdTo.write(challengeHash);
    responseHasher.update(challengeHash);

    await applyKeyToChallengeSection(fdFrom, fdTo, responseHasher, curve, "G1", (2 ** power)*2-1, curve.Fr.one    , key.tau.prvKey, "COMPRESSED", "tauG1"     , logger );
    await applyKeyToChallengeSection(fdFrom, fdTo, responseHasher, curve, "G2", (2 ** power)    , curve.Fr.one    , key.tau.prvKey, "COMPRESSED", "tauG2"     , logger );
    await applyKeyToChallengeSection(fdFrom, fdTo, responseHasher, curve, "G1", (2 ** power)    , key.alpha.prvKey, key.tau.prvKey, "COMPRESSED", "alphaTauG1", logger );
    await applyKeyToChallengeSection(fdFrom, fdTo, responseHasher, curve, "G1", (2 ** power)    , key.beta.prvKey , key.tau.prvKey, "COMPRESSED", "betaTauG1" , logger );
    await applyKeyToChallengeSection(fdFrom, fdTo, responseHasher, curve, "G2", 1             , key.beta.prvKey , key.tau.prvKey, "COMPRESSED", "betaTauG2" , logger );

    // Write and hash key
    const buffKey = new Uint8Array(curve.F1.n8*2*6+curve.F2.n8*2*3);
    toPtauPubKeyRpr(buffKey, 0, curve, key, false);
    await fdTo.write(buffKey);
    responseHasher.update(buffKey);
    const responseHash = responseHasher.digest();
    if (logger) logger.info(formatHash(responseHash, "Contribution Response Hash: "));

    await fdTo.close();
    await fdFrom.close();
}

/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

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

async function beacon$1(oldPtauFilename, newPTauFilename, name,  beaconHashStr,numIterationsExp, logger) {
    const beaconHash = hex2ByteArray(beaconHashStr);
    if (   (beaconHash.byteLength == 0)
        || (beaconHash.byteLength*2 !=beaconHashStr.length))
    {
        if (logger) logger.error("Invalid Beacon Hash. (It must be a valid hexadecimal sequence)");
        return false;
    }
    if (beaconHash.length>=256) {
        if (logger) logger.error("Maximum lenght of beacon hash is 255 bytes");
        return false;
    }

    numIterationsExp = parseInt(numIterationsExp);
    if ((numIterationsExp<10)||(numIterationsExp>63)) {
        if (logger) logger.error("Invalid numIterationsExp. (Must be between 10 and 63)");
        return false;
    }


    await Blake2b__default["default"].ready();

    const {fd: fdOld, sections} = await binFileUtils__namespace.readBinFile(oldPtauFilename, "ptau", 1);
    const {curve, power, ceremonyPower} = await readPTauHeader(fdOld, sections);
    if (power != ceremonyPower) {
        if (logger) logger.error("This file has been reduced. You cannot contribute into a reduced file.");
        return false;
    }
    if (sections[12]) {
        if (logger) logger.warn("Contributing into a file that has phase2 calculated. You will have to prepare phase2 again.");
    }
    const contributions = await readContributions(fdOld, curve, sections);
    const curContribution = {
        name: name,
        type: 1, // Beacon
        numIterationsExp: numIterationsExp,
        beaconHash: beaconHash
    };

    let lastChallengeHash;

    if (contributions.length>0) {
        lastChallengeHash = contributions[contributions.length-1].nextChallenge;
    } else {
        lastChallengeHash = calculateFirstChallengeHash(curve, power, logger);
    }

    curContribution.key = keyFromBeacon(curve, lastChallengeHash, beaconHash, numIterationsExp);

    const responseHasher = new Blake2b__default["default"](64);
    responseHasher.update(lastChallengeHash);

    const fdNew = await binFileUtils__namespace.createBinFile(newPTauFilename, "ptau", 1, 7);
    await writePTauHeader(fdNew, curve, power);

    const startSections = [];

    let firstPoints;
    firstPoints = await processSection(2, "G1",  (2 ** power) * 2 -1, curve.Fr.e(1), curContribution.key.tau.prvKey, "tauG1", logger );
    curContribution.tauG1 = firstPoints[1];
    firstPoints = await processSection(3, "G2",  (2 ** power) , curve.Fr.e(1), curContribution.key.tau.prvKey, "tauG2", logger );
    curContribution.tauG2 = firstPoints[1];
    firstPoints = await processSection(4, "G1",  (2 ** power) , curContribution.key.alpha.prvKey, curContribution.key.tau.prvKey, "alphaTauG1", logger );
    curContribution.alphaG1 = firstPoints[0];
    firstPoints = await processSection(5, "G1",  (2 ** power) , curContribution.key.beta.prvKey, curContribution.key.tau.prvKey, "betaTauG1", logger );
    curContribution.betaG1 = firstPoints[0];
    firstPoints = await processSection(6, "G2",  1, curContribution.key.beta.prvKey, curContribution.key.tau.prvKey, "betaTauG2", logger );
    curContribution.betaG2 = firstPoints[0];

    curContribution.partialHash = responseHasher.getPartialHash();

    const buffKey = new Uint8Array(curve.F1.n8*2*6+curve.F2.n8*2*3);

    toPtauPubKeyRpr(buffKey, 0, curve, curContribution.key, false);

    responseHasher.update(new Uint8Array(buffKey));
    const hashResponse = responseHasher.digest();

    if (logger) logger.info(formatHash(hashResponse, "Contribution Response Hash imported: "));

    const nextChallengeHasher = new Blake2b__default["default"](64);
    nextChallengeHasher.update(hashResponse);

    await hashSection(fdNew, "G1", 2, (2 ** power) * 2 -1, "tauG1", logger);
    await hashSection(fdNew, "G2", 3, (2 ** power)       , "tauG2", logger);
    await hashSection(fdNew, "G1", 4, (2 ** power)       , "alphaTauG1", logger);
    await hashSection(fdNew, "G1", 5, (2 ** power)       , "betaTauG1", logger);
    await hashSection(fdNew, "G2", 6, 1                  , "betaG2", logger);

    curContribution.nextChallenge = nextChallengeHasher.digest();

    if (logger) logger.info(formatHash(curContribution.nextChallenge, "Next Challenge Hash: "));

    contributions.push(curContribution);

    await writeContributions(fdNew, curve, contributions);

    await fdOld.close();
    await fdNew.close();

    return hashResponse;

    async function processSection(sectionId, groupName, NPoints, first, inc, sectionName, logger) {
        const res = [];
        fdOld.pos = sections[sectionId][0].p;

        await binFileUtils__namespace.startWriteSection(fdNew, sectionId);

        startSections[sectionId] = fdNew.pos;

        const G = curve[groupName];
        const sG = G.F.n8*2;
        const chunkSize = Math.floor((1<<20) / sG);   // 128Mb chunks
        let t = first;
        for (let i=0 ; i<NPoints ; i+= chunkSize) {
            if (logger) logger.debug(`applying key${sectionName}: ${i}/${NPoints}`);
            const n= Math.min(NPoints-i, chunkSize );
            const buffIn = await fdOld.read(n * sG);
            const buffOutLEM = await G.batchApplyKey(buffIn, t, inc);

            /* Code to test the case where we don't have the 2^m-2 component
            if (sectionName== "tauG1") {
                const bz = new Uint8Array(64);
                buffOutLEM.set(bz, 64*((2 ** power) - 1 ));
            }
            */

            const promiseWrite = fdNew.write(buffOutLEM);
            const buffOutC = await G.batchLEMtoC(buffOutLEM);

            responseHasher.update(buffOutC);
            await promiseWrite;
            if (i==0)   // Return the 2 first points.
                for (let j=0; j<Math.min(2, NPoints); j++)
                    res.push(G.fromRprLEM(buffOutLEM, j*sG));
            t = curve.Fr.mul(t, curve.Fr.exp(inc, n));
        }

        await binFileUtils__namespace.endWriteSection(fdNew);

        return res;
    }


    async function hashSection(fdTo, groupName, sectionId, nPoints, sectionName, logger) {

        const G = curve[groupName];
        const sG = G.F.n8*2;
        const nPointsChunk = Math.floor((1<<24)/sG);

        const oldPos = fdTo.pos;
        fdTo.pos = startSections[sectionId];

        for (let i=0; i< nPoints; i += nPointsChunk) {
            if (logger) logger.debug(`Hashing ${sectionName}: ${i}/${nPoints}`);
            const n = Math.min(nPoints-i, nPointsChunk);

            const buffLEM = await fdTo.read(n * sG);

            const buffU = await G.batchLEMtoU(buffLEM);

            nextChallengeHasher.update(buffU);
        }

        fdTo.pos = oldPos;
    }
}

/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

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

async function contribute(oldPtauFilename, newPTauFilename, name, entropy, logger) {
    await Blake2b__default["default"].ready();

    const {fd: fdOld, sections} = await binFileUtils__namespace.readBinFile(oldPtauFilename, "ptau", 1);
    const {curve, power, ceremonyPower} = await readPTauHeader(fdOld, sections);
    if (power != ceremonyPower) {
        if (logger) logger.error("This file has been reduced. You cannot contribute into a reduced file.");
        throw new Error("This file has been reduced. You cannot contribute into a reduced file.");
    }
    if (sections[12]) {
        if (logger) logger.warn("WARNING: Contributing into a file that has phase2 calculated. You will have to prepare phase2 again.");
    }
    const contributions = await readContributions(fdOld, curve, sections);
    const curContribution = {
        name: name,
        type: 0, // Beacon
    };

    let lastChallengeHash;

    const rng = await getRandomRng(entropy);

    if (contributions.length>0) {
        lastChallengeHash = contributions[contributions.length-1].nextChallenge;
    } else {
        lastChallengeHash = calculateFirstChallengeHash(curve, power, logger);
    }

    // Generate a random key


    curContribution.key = createPTauKey(curve, lastChallengeHash, rng);


    const responseHasher = new Blake2b__default["default"](64);
    responseHasher.update(lastChallengeHash);

    const fdNew = await binFileUtils__namespace.createBinFile(newPTauFilename, "ptau", 1, 7);
    await writePTauHeader(fdNew, curve, power);

    const startSections = [];

    let firstPoints;
    firstPoints = await processSection(2, "G1",  (2 ** power) * 2 -1, curve.Fr.e(1), curContribution.key.tau.prvKey, "tauG1" );
    curContribution.tauG1 = firstPoints[1];
    firstPoints = await processSection(3, "G2",  (2 ** power) , curve.Fr.e(1), curContribution.key.tau.prvKey, "tauG2" );
    curContribution.tauG2 = firstPoints[1];
    firstPoints = await processSection(4, "G1",  (2 ** power) , curContribution.key.alpha.prvKey, curContribution.key.tau.prvKey, "alphaTauG1" );
    curContribution.alphaG1 = firstPoints[0];
    firstPoints = await processSection(5, "G1",  (2 ** power) , curContribution.key.beta.prvKey, curContribution.key.tau.prvKey, "betaTauG1" );
    curContribution.betaG1 = firstPoints[0];
    firstPoints = await processSection(6, "G2",  1, curContribution.key.beta.prvKey, curContribution.key.tau.prvKey, "betaTauG2" );
    curContribution.betaG2 = firstPoints[0];

    curContribution.partialHash = responseHasher.getPartialHash();

    const buffKey = new Uint8Array(curve.F1.n8*2*6+curve.F2.n8*2*3);

    toPtauPubKeyRpr(buffKey, 0, curve, curContribution.key, false);

    responseHasher.update(new Uint8Array(buffKey));
    const hashResponse = responseHasher.digest();

    if (logger) logger.info(formatHash(hashResponse, "Contribution Response Hash imported: "));

    const nextChallengeHasher = new Blake2b__default["default"](64);
    nextChallengeHasher.update(hashResponse);

    await hashSection(fdNew, "G1", 2, (2 ** power) * 2 -1, "tauG1");
    await hashSection(fdNew, "G2", 3, (2 ** power)       , "tauG2");
    await hashSection(fdNew, "G1", 4, (2 ** power)       , "alphaTauG1");
    await hashSection(fdNew, "G1", 5, (2 ** power)       , "betaTauG1");
    await hashSection(fdNew, "G2", 6, 1                  , "betaG2");

    curContribution.nextChallenge = nextChallengeHasher.digest();

    if (logger) logger.info(formatHash(curContribution.nextChallenge, "Next Challenge Hash: "));

    contributions.push(curContribution);

    await writeContributions(fdNew, curve, contributions);

    await fdOld.close();
    await fdNew.close();

    return hashResponse;

    async function processSection(sectionId, groupName, NPoints, first, inc, sectionName) {
        const res = [];
        fdOld.pos = sections[sectionId][0].p;

        await binFileUtils__namespace.startWriteSection(fdNew, sectionId);

        startSections[sectionId] = fdNew.pos;

        const G = curve[groupName];
        const sG = G.F.n8*2;
        const chunkSize = Math.floor((1<<20) / sG);   // 128Mb chunks
        let t = first;
        for (let i=0 ; i<NPoints ; i+= chunkSize) {
            if (logger) logger.debug(`processing: ${sectionName}: ${i}/${NPoints}`);
            const n= Math.min(NPoints-i, chunkSize );
            const buffIn = await fdOld.read(n * sG);
            const buffOutLEM = await G.batchApplyKey(buffIn, t, inc);

            /* Code to test the case where we don't have the 2^m-2 component
            if (sectionName== "tauG1") {
                const bz = new Uint8Array(64);
                buffOutLEM.set(bz, 64*((2 ** power) - 1 ));
            }
            */

            const promiseWrite = fdNew.write(buffOutLEM);
            const buffOutC = await G.batchLEMtoC(buffOutLEM);

            responseHasher.update(buffOutC);
            await promiseWrite;
            if (i==0)   // Return the 2 first points.
                for (let j=0; j<Math.min(2, NPoints); j++)
                    res.push(G.fromRprLEM(buffOutLEM, j*sG));
            t = curve.Fr.mul(t, curve.Fr.exp(inc, n));
        }

        await binFileUtils__namespace.endWriteSection(fdNew);

        return res;
    }


    async function hashSection(fdTo, groupName, sectionId, nPoints, sectionName) {

        const G = curve[groupName];
        const sG = G.F.n8*2;
        const nPointsChunk = Math.floor((1<<24)/sG);

        const oldPos = fdTo.pos;
        fdTo.pos = startSections[sectionId];

        for (let i=0; i< nPoints; i += nPointsChunk) {
            if ((logger)&&i) logger.debug(`Hashing ${sectionName}: ` + i);
            const n = Math.min(nPoints-i, nPointsChunk);

            const buffLEM = await fdTo.read(n * sG);

            const buffU = await G.batchLEMtoU(buffLEM);

            nextChallengeHasher.update(buffU);
        }

        fdTo.pos = oldPos;
    }


}

/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

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

async function preparePhase2(oldPtauFilename, newPTauFilename, logger) {

    const {fd: fdOld, sections} = await binFileUtils__namespace.readBinFile(oldPtauFilename, "ptau", 1);
    const {curve, power} = await readPTauHeader(fdOld, sections);

    const fdNew = await binFileUtils__namespace.createBinFile(newPTauFilename, "ptau", 1, 11);
    await writePTauHeader(fdNew, curve, power);

    await binFileUtils__namespace.copySection(fdOld, sections, fdNew, 2);
    await binFileUtils__namespace.copySection(fdOld, sections, fdNew, 3);
    await binFileUtils__namespace.copySection(fdOld, sections, fdNew, 4);
    await binFileUtils__namespace.copySection(fdOld, sections, fdNew, 5);
    await binFileUtils__namespace.copySection(fdOld, sections, fdNew, 6);
    await binFileUtils__namespace.copySection(fdOld, sections, fdNew, 7);

    await processSection(2, 12, "G1", "tauG1" );
    await processSection(3, 13, "G2", "tauG2" );
    await processSection(4, 14, "G1", "alphaTauG1" );
    await processSection(5, 15, "G1", "betaTauG1" );

    await fdOld.close();
    await fdNew.close();

    // await fs.promises.unlink(newPTauFilename+ ".tmp");

    return;

    async function processSection(oldSectionId, newSectionId, Gstr, sectionName) {
        if (logger) logger.debug("Starting section: "+sectionName);

        await binFileUtils__namespace.startWriteSection(fdNew, newSectionId);

        for (let p=0; p<=power; p++) {
            await processSectionPower(p);
        }

        if (oldSectionId == 2) {
            await processSectionPower(power+1);
        }

        await binFileUtils__namespace.endWriteSection(fdNew);


        async function processSectionPower(p) {
            const nPoints = 2 ** p;
            const G = curve[Gstr];
            curve.Fr;
            const sGin = G.F.n8*2;
            G.F.n8*3;

            let buff;
            buff = new ffjavascript.BigBuffer(nPoints*sGin);

            await binFileUtils__namespace.startReadUniqueSection(fdOld, sections, oldSectionId);
            if ((oldSectionId == 2)&&(p==power+1)) {
                await fdOld.readToBuffer(buff, 0,(nPoints-1)*sGin );
                buff.set(curve.G1.zeroAffine, (nPoints-1)*sGin );
            } else {
                await fdOld.readToBuffer(buff, 0,nPoints*sGin );
            }
            await binFileUtils__namespace.endReadSection(fdOld, true);


            buff = await G.lagrangeEvaluations(buff, "affine", "affine", logger, sectionName);
            await fdNew.write(buff);

/*
            if (p <= curve.Fr.s) {
                buff = await G.ifft(buff, "affine", "affine", logger, sectionName);
                await fdNew.write(buff);
            } else if (p == curve.Fr.s+1) {
                const smallM = 1<<curve.Fr.s;
                let t0 = new BigBuffer( smallM * sGmid );
                let t1 = new BigBuffer( smallM * sGmid );

                const shift_to_small_m = Fr.exp(Fr.shift, smallM);
                const one_over_denom = Fr.inv(Fr.sub(shift_to_small_m, Fr.one));

                let sInvAcc = Fr.one;
                for (let i=0; i<smallM; i++) {
                    const ti =  buff.slice(i*sGin, (i+1)*sGin);
                    const tmi = buff.slice((i+smallM)*sGin, (i+smallM+1)*sGin);

                    t0.set(
                        G.timesFr(
                            G.sub(
                                G.timesFr(ti , shift_to_small_m),
                                tmi
                            ),
                            one_over_denom
                        ),
                        i*sGmid
                    );
                    t1.set(
                        G.timesFr(
                            G.sub( tmi, ti),
                            Fr.mul(sInvAcc, one_over_denom)
                        ),
                        i*sGmid
                    );


                    sInvAcc = Fr.mul(sInvAcc, Fr.shiftInv);
                }
                t0 = await G.ifft(t0, "jacobian", "affine", logger, sectionName + " t0");
                await fdNew.write(t0);
                t0 = null;
                t1 = await G.ifft(t1, "jacobian", "affine", logger, sectionName + " t0");
                await fdNew.write(t1);

            } else {
                if (logger) logger.error("Power too big");
                throw new Error("Power to big");
            }
*/
        }
    }
}

/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

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

async function truncate(ptauFilename, template, logger) {

    const {fd: fdOld, sections} = await binFileUtils__namespace.readBinFile(ptauFilename, "ptau", 1);
    const {curve, power, ceremonyPower} = await readPTauHeader(fdOld, sections);

    const sG1 = curve.G1.F.n8*2;
    const sG2 = curve.G2.F.n8*2;

    for (let p=1; p<power; p++) {
        await generateTruncate(p);
    }

    await fdOld.close();

    return true;

    async function generateTruncate(p) {

        let sP = p.toString();
        while (sP.length<2) sP = "0" + sP;

        if (logger) logger.debug("Writing Power: "+sP);

        const fdNew = await binFileUtils__namespace.createBinFile(template + sP + ".ptau", "ptau", 1, 11);
        await writePTauHeader(fdNew, curve, p, ceremonyPower);

        await binFileUtils__namespace.copySection(fdOld, sections, fdNew, 2, ((2 ** p)*2-1) * sG1 ); // tagG1
        await binFileUtils__namespace.copySection(fdOld, sections, fdNew, 3, (2 ** p) * sG2); // tauG2
        await binFileUtils__namespace.copySection(fdOld, sections, fdNew, 4, (2 ** p) * sG1); // alfaTauG1
        await binFileUtils__namespace.copySection(fdOld, sections, fdNew, 5, (2 ** p) * sG1); // betaTauG1
        await binFileUtils__namespace.copySection(fdOld, sections, fdNew, 6,  sG2); // betaTauG2
        await binFileUtils__namespace.copySection(fdOld, sections, fdNew, 7); // contributions
        await binFileUtils__namespace.copySection(fdOld, sections, fdNew, 12, ((2 ** (p+1))*2 -1) * sG1); // L_tauG1
        await binFileUtils__namespace.copySection(fdOld, sections, fdNew, 13, ((2 ** p)*2 -1) * sG2); // L_tauG2
        await binFileUtils__namespace.copySection(fdOld, sections, fdNew, 14, ((2 ** p)*2 -1) * sG1); // L_alfaTauG1
        await binFileUtils__namespace.copySection(fdOld, sections, fdNew, 15, ((2 ** p)*2 -1) * sG1); // L_betaTauG1

        await fdNew.close();
    }


}

/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

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

async function convert(oldPtauFilename, newPTauFilename, logger) {

    const {fd: fdOld, sections} = await binFileUtils__namespace.readBinFile(oldPtauFilename, "ptau", 1);
    const {curve, power} = await readPTauHeader(fdOld, sections);

    const fdNew = await binFileUtils__namespace.createBinFile(newPTauFilename, "ptau", 1, 11);
    await writePTauHeader(fdNew, curve, power);

    // const fdTmp = await fastFile.createOverride(newPTauFilename+ ".tmp");

    await binFileUtils__namespace.copySection(fdOld, sections, fdNew, 2);
    await binFileUtils__namespace.copySection(fdOld, sections, fdNew, 3);
    await binFileUtils__namespace.copySection(fdOld, sections, fdNew, 4);
    await binFileUtils__namespace.copySection(fdOld, sections, fdNew, 5);
    await binFileUtils__namespace.copySection(fdOld, sections, fdNew, 6);
    await binFileUtils__namespace.copySection(fdOld, sections, fdNew, 7);

    await processSection(2, 12, "G1", "tauG1" );
    await binFileUtils__namespace.copySection(fdOld, sections, fdNew, 13);
    await binFileUtils__namespace.copySection(fdOld, sections, fdNew, 14);
    await binFileUtils__namespace.copySection(fdOld, sections, fdNew, 15);

    await fdOld.close();
    await fdNew.close();

    // await fs.promises.unlink(newPTauFilename+ ".tmp");

    return;

    async function processSection(oldSectionId, newSectionId, Gstr, sectionName) {
        if (logger) logger.debug("Starting section: "+sectionName);

        await binFileUtils__namespace.startWriteSection(fdNew, newSectionId);

        const size = sections[newSectionId][0].size;
        const chunkSize = fdOld.pageSize;
        await binFileUtils__namespace.startReadUniqueSection(fdOld, sections, newSectionId);
        for (let p=0; p<size; p+=chunkSize) {
            const l = Math.min(size -p, chunkSize);
            const buff = await fdOld.read(l);
            await fdNew.write(buff);
        }
        await binFileUtils__namespace.endReadSection(fdOld);

        if (oldSectionId == 2) {
            await processSectionPower(power+1);
        }

        await binFileUtils__namespace.endWriteSection(fdNew);

        async function processSectionPower(p) {
            const nPoints = 2 ** p;
            const G = curve[Gstr];
            const sGin = G.F.n8*2;

            let buff;
            buff = new ffjavascript.BigBuffer(nPoints*sGin);

            await binFileUtils__namespace.startReadUniqueSection(fdOld, sections, oldSectionId);
            if ((oldSectionId == 2)&&(p==power+1)) {
                await fdOld.readToBuffer(buff, 0,(nPoints-1)*sGin );
                buff.set(curve.G1.zeroAffine, (nPoints-1)*sGin );
            } else {
                await fdOld.readToBuffer(buff, 0,nPoints*sGin );
            }
            await binFileUtils__namespace.endReadSection(fdOld, true);

            buff = await G.lagrangeEvaluations(buff, "affine", "affine", logger, sectionName);
            await fdNew.write(buff);

/*
            if (p <= curve.Fr.s) {
                buff = await G.ifft(buff, "affine", "affine", logger, sectionName);
                await fdNew.write(buff);
            } else if (p == curve.Fr.s+1) {
                const smallM = 1<<curve.Fr.s;
                let t0 = new BigBuffer( smallM * sGmid );
                let t1 = new BigBuffer( smallM * sGmid );

                const shift_to_small_m = Fr.exp(Fr.shift, smallM);
                const one_over_denom = Fr.inv(Fr.sub(shift_to_small_m, Fr.one));

                let sInvAcc = Fr.one;
                for (let i=0; i<smallM; i++) {
                    if (i%10000) logger.debug(`sectionName prepare L calc: ${sectionName}, ${i}/${smallM}`);
                    const ti =  buff.slice(i*sGin, (i+1)*sGin);
                    const tmi = buff.slice((i+smallM)*sGin, (i+smallM+1)*sGin);

                    t0.set(
                        G.timesFr(
                            G.sub(
                                G.timesFr(ti , shift_to_small_m),
                                tmi
                            ),
                            one_over_denom
                        ),
                        i*sGmid
                    );
                    t1.set(
                        G.timesFr(
                            G.sub( tmi, ti),
                            Fr.mul(sInvAcc, one_over_denom)
                        ),
                        i*sGmid
                    );


                    sInvAcc = Fr.mul(sInvAcc, Fr.shiftInv);
                }
                t0 = await G.ifft(t0, "jacobian", "affine", logger, sectionName + " t0");
                await fdNew.write(t0);
                t0 = null;
                t1 = await G.ifft(t1, "jacobian", "affine", logger, sectionName + " t1");
                await fdNew.write(t1);

            } else {
                if (logger) logger.error("Power too big");
                throw new Error("Power to big");
            }
*/
        }


    }
}

/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

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

async function exportJson(pTauFilename, verbose) {
    const {fd, sections} = await binFileUtils__namespace.readBinFile(pTauFilename, "ptau", 1);

    const {curve, power} = await readPTauHeader(fd, sections);

    const pTau = {};
    pTau.q = curve.q;
    pTau.power = power;
    pTau.contributions = await readContributions(fd, curve, sections);

    pTau.tauG1 = await exportSection(2, "G1", (2 ** power)*2 -1, "tauG1");
    pTau.tauG2 = await exportSection(3, "G2", (2 ** power), "tauG2");
    pTau.alphaTauG1 = await exportSection(4, "G1", (2 ** power), "alphaTauG1");
    pTau.betaTauG1 = await exportSection(5, "G1", (2 ** power), "betaTauG1");
    pTau.betaG2 = await exportSection(6, "G2", 1, "betaG2");

    pTau.lTauG1 = await exportLagrange(12, "G1", "lTauG1");
    pTau.lTauG2 = await exportLagrange(13, "G2", "lTauG2");
    pTau.lAlphaTauG1 = await exportLagrange(14, "G1", "lAlphaTauG2");
    pTau.lBetaTauG1 = await exportLagrange(15, "G1", "lBetaTauG2");

    await fd.close();

    return stringifyBigIntsWithField(curve.Fr, pTau);



    async function exportSection(sectionId, groupName, nPoints, sectionName) {
        const G = curve[groupName];
        const sG = G.F.n8*2;

        const res = [];
        await binFileUtils__namespace.startReadUniqueSection(fd, sections, sectionId);
        for (let i=0; i< nPoints; i++) {
            if ((verbose)&&i&&(i%10000 == 0)) console.log(`${sectionName}: ` + i);
            const buff = await fd.read(sG);
            res.push(G.fromRprLEM(buff, 0));
        }
        await binFileUtils__namespace.endReadSection(fd);

        return res;
    }

    async function exportLagrange(sectionId, groupName, sectionName) {
        const G = curve[groupName];
        const sG = G.F.n8*2;

        const res = [];
        await binFileUtils__namespace.startReadUniqueSection(fd, sections, sectionId);
        for (let p=0; p<=power; p++) {
            if (verbose) console.log(`${sectionName}: Power: ${p}`);
            res[p] = [];
            const nPoints = (2 ** p);
            for (let i=0; i<nPoints; i++) {
                if ((verbose)&&i&&(i%10000 == 0)) console.log(`${sectionName}: ${i}/${nPoints}`);
                const buff = await fd.read(sG);
                res[p].push(G.fromRprLEM(buff, 0));
            }
        }
        await binFileUtils__namespace.endReadSection(fd, true);
        return res;
    }


}

/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

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

var powersoftau = /*#__PURE__*/Object.freeze({
    __proto__: null,
    newAccumulator: newAccumulator,
    exportChallenge: exportChallenge,
    importResponse: importResponse,
    verify: verify,
    challengeContribute: challengeContribute,
    beacon: beacon$1,
    contribute: contribute,
    preparePhase2: preparePhase2,
    truncate: truncate,
    convert: convert,
    exportJson: exportJson
});

/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

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

function r1csPrint(r1cs, syms, logger) {
    for (let i=0; i<r1cs.constraints.length; i++) {
        printCostraint(r1cs.constraints[i]);
    }
    function printCostraint(c) {
        const lc2str = (lc) => {
            let S = "";
            const keys = Object.keys(lc);
            keys.forEach( (k) => {
                let name = syms.varIdx2Name[k];
                if (name == "one") name = "";

                let vs = r1cs.curve.Fr.toString(lc[k]);
                if (vs == "1") vs = "";  // Do not show ones
                if (vs == "-1") vs = "-";  // Do not show ones
                if ((S!="")&&(vs[0]!="-")) vs = "+"+vs;
                if (S!="") vs = " "+vs;
                S= S + vs   + name;
            });
            return S;
        };
        const S = `[ ${lc2str(c[0])} ] * [ ${lc2str(c[1])} ] - [ ${lc2str(c[2])} ] = 0`;
        if (logger) logger.info(S);
    }

}

/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

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

const bls12381r = ffjavascript.Scalar.e("73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001", 16);
const bn128r = ffjavascript.Scalar.e("21888242871839275222246405745257275088548364400416034343698204186575808495617");

async function r1csInfo(r1csName, logger) {

    const cir = await r1csfile.readR1cs(r1csName);

    if (ffjavascript.Scalar.eq(cir.prime, bn128r)) {
        if (logger) logger.info("Curve: bn-128");
    } else if (ffjavascript.Scalar.eq(cir.prime, bls12381r)) {
        if (logger) logger.info("Curve: bls12-381");
    } else {
        if (logger) logger.info(`Unknown Curve. Prime: ${ffjavascript.Scalar.toString(cir.prime)}`);
    }
    if (logger) logger.info(`# of Wires: ${cir.nVars}`);
    if (logger) logger.info(`# of Constraints: ${cir.nConstraints}`);
    if (logger) logger.info(`# of Private Inputs: ${cir.nPrvInputs}`);
    if (logger) logger.info(`# of Public Inputs: ${cir.nPubInputs}`);
    if (logger) logger.info(`# of Labels: ${cir.nLabels}`);
    if (logger) logger.info(`# of Outputs: ${cir.nOutputs}`);

    return cir;
}

/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

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


async function r1csExportJson(r1csFileName, logger) {

    const cir = await r1csfile.readR1cs(r1csFileName, true, true, true, logger);
    const Fr=cir.curve.Fr;
    delete cir.curve;
    delete cir.F;

    return stringifyBigIntsWithField(Fr, cir);
}

/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

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

var r1cs = /*#__PURE__*/Object.freeze({
    __proto__: null,
    print: r1csPrint,
    info: r1csInfo,
    exportJson: r1csExportJson
});

/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

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

async function loadSymbols(symFileName) {
    const sym = {
        labelIdx2Name: [ "one" ],
        varIdx2Name: [ "one" ],
        componentIdx2Name: []
    };
    const fd = await fastFile__namespace.readExisting(symFileName);
    const buff = await fd.read(fd.totalSize);
    const symsStr = new TextDecoder("utf-8").decode(buff);
    const lines = symsStr.split("\n");
    for (let i=0; i<lines.length; i++) {
        const arr = lines[i].split(",");
        if (arr.length!=4) continue;
        if (sym.varIdx2Name[arr[1]]) {
            sym.varIdx2Name[arr[1]] += "|" + arr[3];
        } else {
            sym.varIdx2Name[arr[1]] = arr[3];
        }
        sym.labelIdx2Name[arr[0]] = arr[3];
        if (!sym.componentIdx2Name[arr[2]]) {
            sym.componentIdx2Name[arr[2]] = extractComponent(arr[3]);
        }
    }

    await fd.close();

    return sym;

    function extractComponent(name) {
        const arr = name.split(".");
        arr.pop(); // Remove the lasr element
        return arr.join(".");
    }
}

/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

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
const {unstringifyBigInts: unstringifyBigInts$3} = ffjavascript.utils;


async function wtnsDebug(_input, wasmFileName, wtnsFileName, symName, options, logger) {

    const input = unstringifyBigInts$3(_input);

    const fdWasm = await fastFile__namespace.readExisting(wasmFileName);
    const wasm = await fdWasm.read(fdWasm.totalSize);
    await fdWasm.close();


    let wcOps = {
        sanityCheck: true
    };
    let sym = await loadSymbols(symName);
    if (options.set) {
        if (!sym) sym = await loadSymbols(symName);
        wcOps.logSetSignal= function(labelIdx, value) {
            // The line below splits the arrow log into 2 strings to avoid some Secure ECMAScript issues
            if (logger) logger.info("SET " + sym.labelIdx2Name[labelIdx] + " <" + "-- " + value.toString());
        };
    }
    if (options.get) {
        if (!sym) sym = await loadSymbols(symName);
        wcOps.logGetSignal= function(varIdx, value) {
            // The line below splits the arrow log into 2 strings to avoid some Secure ECMAScript issues
            if (logger) logger.info("GET " + sym.labelIdx2Name[varIdx] + " --" + "> " + value.toString());
        };
    }
    if (options.trigger) {
        if (!sym) sym = await loadSymbols(symName);
        wcOps.logStartComponent= function(cIdx) {
            if (logger) logger.info("START: " + sym.componentIdx2Name[cIdx]);
        };
        wcOps.logFinishComponent= function(cIdx) {
            if (logger) logger.info("FINISH: " + sym.componentIdx2Name[cIdx]);
        };
    }
    wcOps.sym = sym;

    const wc = await circom_runtime.WitnessCalculatorBuilder(wasm, wcOps);
    const w = await wc.calculateWitness(input);

    const fdWtns = await binFileUtils__namespace.createBinFile(wtnsFileName, "wtns", 2, 2);

    await write(fdWtns, w, wc.prime);

    await fdWtns.close();
}

/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

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

async function wtnsExportJson(wtnsFileName) {

    const w = await read(wtnsFileName);

    return w;
}

/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

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

var wtns = /*#__PURE__*/Object.freeze({
    __proto__: null,
    calculate: wtnsCalculate,
    debug: wtnsDebug,
    exportJson: wtnsExportJson
});

/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

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

const SUBARRAY_SIZE = 0x40000;

const BigArrayHandler = {
    get: function(obj, prop) {
        if (!isNaN(prop)) {
            return obj.getElement(prop);
        } else return obj[prop];
    },
    set: function(obj, prop, value) {
        if (!isNaN(prop)) {
            return obj.setElement(prop, value);
        } else {
            obj[prop] = value;
            return true;
        }
    }
};

class _BigArray {
    constructor (initSize) {
        this.length = initSize || 0;
        this.arr = new Array(SUBARRAY_SIZE);

        for (let i=0; i<initSize; i+=SUBARRAY_SIZE) {
            this.arr[i/SUBARRAY_SIZE] = new Array(Math.min(SUBARRAY_SIZE, initSize - i));
        }
        return this;
    }
    push () {
        for (let i=0; i<arguments.length; i++) {
            this.setElement (this.length, arguments[i]);
        }
    }

    slice (f, t) {
        const arr = new Array(t-f);
        for (let i=f; i< t; i++) arr[i-f] = this.getElement(i);
        return arr;
    }
    getElement(idx) {
        idx = parseInt(idx);
        const idx1 = Math.floor(idx / SUBARRAY_SIZE);
        const idx2 = idx % SUBARRAY_SIZE;
        return this.arr[idx1] ? this.arr[idx1][idx2] : undefined;
    }
    setElement(idx, value) {
        idx = parseInt(idx);
        const idx1 = Math.floor(idx / SUBARRAY_SIZE);
        if (!this.arr[idx1]) {
            this.arr[idx1] = new Array(SUBARRAY_SIZE);
        }
        const idx2 = idx % SUBARRAY_SIZE;
        this.arr[idx1][idx2] = value;
        if (idx >= this.length) this.length = idx+1;
        return true;
    }
    getKeys() {
        const newA = new BigArray();
        for (let i=0; i<this.arr.length; i++) {
            if (this.arr[i]) {
                for (let j=0; j<this.arr[i].length; j++) {
                    if (typeof this.arr[i][j] !== "undefined") {
                        newA.push(i*SUBARRAY_SIZE+j);
                    }
                }
            }
        }
        return newA;
    }
}

class BigArray {
    constructor( initSize ) {
        const obj = new _BigArray(initSize);
        const extObj = new Proxy(obj, BigArrayHandler);
        return extObj;
    }
}

/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

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


async function newZKey(r1csName, ptauName, zkeyName, logger) {

    const TAU_G1 = 0;
    const TAU_G2 = 1;
    const ALPHATAU_G1 = 2;
    const BETATAU_G1 = 3;
    await Blake2b__default["default"].ready();
    const csHasher = Blake2b__default["default"](64);

    const {fd: fdPTau, sections: sectionsPTau} = await binFileUtils.readBinFile(ptauName, "ptau", 1, 1<<22, 1<<24);
    const {curve, power} = await readPTauHeader(fdPTau, sectionsPTau);
    const {fd: fdR1cs, sections: sectionsR1cs} = await binFileUtils.readBinFile(r1csName, "r1cs", 1, 1<<22, 1<<24);
    const r1cs = await r1csfile.readR1csHeader(fdR1cs, sectionsR1cs, false);

    const fdZKey = await binFileUtils.createBinFile(zkeyName, "zkey", 1, 10, 1<<22, 1<<24);

    const sG1 = curve.G1.F.n8*2;
    const sG2 = curve.G2.F.n8*2;

    if (r1cs.prime != curve.r) {
        if (logger) logger.error("r1cs curve does not match powers of tau ceremony curve");
        return -1;
    }

    const cirPower = log2(r1cs.nConstraints + r1cs.nPubInputs + r1cs.nOutputs +1 -1) +1;

    if (cirPower > power) {
        if (logger) logger.error(`circuit too big for this power of tau ceremony. ${r1cs.nConstraints}*2 > 2**${power}`);
        return -1;
    }

    if (!sectionsPTau[12]) {
        if (logger) logger.error("Powers of tau is not prepared.");
        return -1;
    }

    const nPublic = r1cs.nOutputs + r1cs.nPubInputs;
    const domainSize = 2 ** cirPower;

    // Write the header
    ///////////
    await binFileUtils.startWriteSection(fdZKey, 1);
    await fdZKey.writeULE32(1); // Groth
    await binFileUtils.endWriteSection(fdZKey);

    // Write the Groth header section
    ///////////

    await binFileUtils.startWriteSection(fdZKey, 2);
    const primeQ = curve.q;
    const n8q = (Math.floor( (ffjavascript.Scalar.bitLength(primeQ) - 1) / 64) +1)*8;

    const primeR = curve.r;
    const n8r = (Math.floor( (ffjavascript.Scalar.bitLength(primeR) - 1) / 64) +1)*8;
    const Rr = ffjavascript.Scalar.mod(ffjavascript.Scalar.shl(1, n8r*8), primeR);
    const R2r = curve.Fr.e(ffjavascript.Scalar.mod(ffjavascript.Scalar.mul(Rr,Rr), primeR));

    await fdZKey.writeULE32(n8q);
    await binFileUtils.writeBigInt(fdZKey, primeQ, n8q);
    await fdZKey.writeULE32(n8r);
    await binFileUtils.writeBigInt(fdZKey, primeR, n8r);
    await fdZKey.writeULE32(r1cs.nVars);                         // Total number of bars
    await fdZKey.writeULE32(nPublic);                       // Total number of public vars (not including ONE)
    await fdZKey.writeULE32(domainSize);                  // domainSize

    let bAlpha1;
    bAlpha1 = await fdPTau.read(sG1, sectionsPTau[4][0].p);
    await fdZKey.write(bAlpha1);
    bAlpha1 = await curve.G1.batchLEMtoU(bAlpha1);
    csHasher.update(bAlpha1);

    let bBeta1;
    bBeta1 = await fdPTau.read(sG1, sectionsPTau[5][0].p);
    await fdZKey.write(bBeta1);
    bBeta1 = await curve.G1.batchLEMtoU(bBeta1);
    csHasher.update(bBeta1);

    let bBeta2;
    bBeta2 = await fdPTau.read(sG2, sectionsPTau[6][0].p);
    await fdZKey.write(bBeta2);
    bBeta2 = await curve.G2.batchLEMtoU(bBeta2);
    csHasher.update(bBeta2);

    const bg1 = new Uint8Array(sG1);
    curve.G1.toRprLEM(bg1, 0, curve.G1.g);
    const bg2 = new Uint8Array(sG2);
    curve.G2.toRprLEM(bg2, 0, curve.G2.g);
    const bg1U = new Uint8Array(sG1);
    curve.G1.toRprUncompressed(bg1U, 0, curve.G1.g);
    const bg2U = new Uint8Array(sG2);
    curve.G2.toRprUncompressed(bg2U, 0, curve.G2.g);

    await fdZKey.write(bg2);        // gamma2
    await fdZKey.write(bg1);        // delta1
    await fdZKey.write(bg2);        // delta2
    csHasher.update(bg2U);      // gamma2
    csHasher.update(bg1U);      // delta1
    csHasher.update(bg2U);      // delta2
    await binFileUtils.endWriteSection(fdZKey);

    if (logger) logger.info("Reading r1cs");
    let sR1cs = await binFileUtils.readSection(fdR1cs, sectionsR1cs, 2);

    const A = new BigArray(r1cs.nVars);
    const B1 = new BigArray(r1cs.nVars);
    const B2 = new BigArray(r1cs.nVars);
    const C = new BigArray(r1cs.nVars- nPublic -1);
    const IC = new Array(nPublic+1);

    if (logger) logger.info("Reading tauG1");
    let sTauG1 = await binFileUtils.readSection(fdPTau, sectionsPTau, 12, (domainSize -1)*sG1, domainSize*sG1);
    if (logger) logger.info("Reading tauG2");
    let sTauG2 = await binFileUtils.readSection(fdPTau, sectionsPTau, 13, (domainSize -1)*sG2, domainSize*sG2);
    if (logger) logger.info("Reading alphatauG1");
    let sAlphaTauG1 = await binFileUtils.readSection(fdPTau, sectionsPTau, 14, (domainSize -1)*sG1, domainSize*sG1);
    if (logger) logger.info("Reading betatauG1");
    let sBetaTauG1 = await binFileUtils.readSection(fdPTau, sectionsPTau, 15, (domainSize -1)*sG1, domainSize*sG1);

    await processConstraints();

    await composeAndWritePoints(3, "G1", IC, "IC");

    await writeHs();

    await hashHPoints();

    await composeAndWritePoints(8, "G1", C, "C");
    await composeAndWritePoints(5, "G1", A, "A");
    await composeAndWritePoints(6, "G1", B1, "B1");
    await composeAndWritePoints(7, "G2", B2, "B2");

    const csHash = csHasher.digest();
    // Contributions section
    await binFileUtils.startWriteSection(fdZKey, 10);
    await fdZKey.write(csHash);
    await fdZKey.writeULE32(0);
    await binFileUtils.endWriteSection(fdZKey);

    if (logger) logger.info(formatHash(csHash, "Circuit hash: "));


    await fdZKey.close();
    await fdR1cs.close();
    await fdPTau.close();

    return csHash;

    async function writeHs() {
        await binFileUtils.startWriteSection(fdZKey, 9);
        const buffOut = new ffjavascript.BigBuffer(domainSize*sG1);
        if (cirPower < curve.Fr.s) {
            let sTauG1 = await binFileUtils.readSection(fdPTau, sectionsPTau, 12, (domainSize*2-1)*sG1, domainSize*2*sG1);
            for (let i=0; i< domainSize; i++) {
                if ((logger)&&(i%10000 == 0)) logger.debug(`spliting buffer: ${i}/${domainSize}`);
                const buff = sTauG1.slice( (i*2+1)*sG1, (i*2+1)*sG1 + sG1 );
                buffOut.set(buff, i*sG1);
            }
        } else if (cirPower == curve.Fr.s) {
            const o = sectionsPTau[12][0].p + ((2 ** (cirPower+1)) -1)*sG1;
            await fdPTau.readToBuffer(buffOut, 0, domainSize*sG1, o + domainSize*sG1);
        } else {
            if (logger) logger.error("Circuit too big");
            throw new Error("Circuit too big for this curve");
        }
        await fdZKey.write(buffOut);
        await binFileUtils.endWriteSection(fdZKey);
    }

    async function processConstraints() {
        const buffCoeff = new Uint8Array(12 + curve.Fr.n8);
        const buffCoeffV = new DataView(buffCoeff.buffer);
        const bOne = new Uint8Array(curve.Fr.n8);
        curve.Fr.toRprLE(bOne, 0, curve.Fr.e(1));

        let r1csPos = 0;

        function r1cs_readULE32() {
            const buff = sR1cs.slice(r1csPos, r1csPos+4);
            r1csPos += 4;
            const buffV = new DataView(buff.buffer);
            return buffV.getUint32(0, true);
        }

        const coefs = new BigArray();
        for (let c=0; c<r1cs.nConstraints; c++) {
            if ((logger)&&(c%10000 == 0)) logger.debug(`processing constraints: ${c}/${r1cs.nConstraints}`);
            const nA = r1cs_readULE32();
            for (let i=0; i<nA; i++) {
                const s = r1cs_readULE32();
                const coefp = r1csPos;
                r1csPos += curve.Fr.n8;

                const l1t = TAU_G1;
                const l1 = sG1*c;
                const l2t = BETATAU_G1;
                const l2 = sG1*c;
                if (typeof A[s] === "undefined") A[s] = [];
                A[s].push([l1t, l1, coefp]);

                if (s <= nPublic) {
                    if (typeof IC[s] === "undefined") IC[s] = [];
                    IC[s].push([l2t, l2, coefp]);
                } else {
                    if (typeof C[s- nPublic -1] === "undefined") C[s- nPublic -1] = [];
                    C[s - nPublic -1].push([l2t, l2, coefp]);
                }
                coefs.push([0, c, s, coefp]);
            }

            const nB = r1cs_readULE32();
            for (let i=0; i<nB; i++) {
                const s = r1cs_readULE32();
                const coefp = r1csPos;
                r1csPos += curve.Fr.n8;

                const l1t = TAU_G1;
                const l1 = sG1*c;
                const l2t = TAU_G2;
                const l2 = sG2*c;
                const l3t = ALPHATAU_G1;
                const l3 = sG1*c;
                if (typeof B1[s] === "undefined") B1[s] = [];
                B1[s].push([l1t, l1, coefp]);
                if (typeof B2[s] === "undefined") B2[s] = [];
                B2[s].push([l2t, l2, coefp]);

                if (s <= nPublic) {
                    if (typeof IC[s] === "undefined") IC[s] = [];
                    IC[s].push([l3t, l3, coefp]);
                } else {
                    if (typeof C[s- nPublic -1] === "undefined") C[s- nPublic -1] = [];
                    C[s- nPublic -1].push([l3t, l3, coefp]);
                }

                coefs.push([1, c, s, coefp]);
            }

            const nC = r1cs_readULE32();
            for (let i=0; i<nC; i++) {
                const s = r1cs_readULE32();
                const coefp = r1csPos;
                r1csPos += curve.Fr.n8;

                const l1t = TAU_G1;
                const l1 = sG1*c;
                if (s <= nPublic) {
                    if (typeof IC[s] === "undefined") IC[s] = [];
                    IC[s].push([l1t, l1, coefp]);
                } else {
                    if (typeof C[s- nPublic -1] === "undefined") C[s- nPublic -1] = [];
                    C[s- nPublic -1].push([l1t, l1, coefp]);
                }
            }
        }

        for (let s = 0; s <= nPublic ; s++) {
            const l1t = TAU_G1;
            const l1 = sG1*(r1cs.nConstraints + s);
            const l2t = BETATAU_G1;
            const l2 = sG1*(r1cs.nConstraints + s);
            if (typeof A[s] === "undefined") A[s] = [];
            A[s].push([l1t, l1, -1]);
            if (typeof IC[s] === "undefined") IC[s] = [];
            IC[s].push([l2t, l2, -1]);
            coefs.push([0, r1cs.nConstraints + s, s, -1]);
        }


        await binFileUtils.startWriteSection(fdZKey, 4);

        const buffSection = new ffjavascript.BigBuffer(coefs.length*(12+curve.Fr.n8) + 4);

        const buff4 = new Uint8Array(4);
        const buff4V = new DataView(buff4.buffer);
        buff4V.setUint32(0, coefs.length, true);
        buffSection.set(buff4);
        let coefsPos = 4;
        for (let i=0; i<coefs.length; i++) {
            if ((logger)&&(i%100000 == 0)) logger.debug(`writing coeffs: ${i}/${coefs.length}`);
            writeCoef(coefs[i]);
        }

        await fdZKey.write(buffSection);
        await binFileUtils.endWriteSection(fdZKey);

        function writeCoef(c) {
            buffCoeffV.setUint32(0, c[0], true);
            buffCoeffV.setUint32(4, c[1], true);
            buffCoeffV.setUint32(8, c[2], true);
            let n;
            if (c[3]>=0) {
                n = curve.Fr.fromRprLE(sR1cs.slice(c[3], c[3] + curve.Fr.n8), 0);
            } else {
                n = curve.Fr.fromRprLE(bOne, 0);
            }
            const nR2 = curve.Fr.mul(n, R2r);
            curve.Fr.toRprLE(buffCoeff, 12, nR2);
            buffSection.set(buffCoeff, coefsPos);
            coefsPos += buffCoeff.length;
        }

    }

    async function composeAndWritePoints(idSection, groupName, arr, sectionName) {
        const CHUNK_SIZE= 1<<15;
        const G = curve[groupName];

        hashU32(arr.length);
        await binFileUtils.startWriteSection(fdZKey, idSection);

        let opPromises = [];

        let i=0;
        while (i<arr.length) {

            let t=0;
            while ((i<arr.length)&&(t<curve.tm.concurrency)) {
                if (logger)  logger.debug(`Writing points start ${sectionName}: ${i}/${arr.length}`);
                let n = 1;
                let nP = (arr[i] ? arr[i].length : 0);
                while ((i + n < arr.length) && (nP + (arr[i+n] ? arr[i+n].length : 0) < CHUNK_SIZE) && (n<CHUNK_SIZE)) {
                    nP += (arr[i+n] ? arr[i+n].length : 0);
                    n ++;
                }
                const subArr = arr.slice(i, i + n);
                const _i = i;
                opPromises.push(composeAndWritePointsThread(groupName, subArr, logger, sectionName).then( (r) => {
                    if (logger)  logger.debug(`Writing points end ${sectionName}: ${_i}/${arr.length}`);
                    return r;
                }));
                i += n;
                t++;
            }

            const result = await Promise.all(opPromises);

            for (let k=0; k<result.length; k++) {
                await fdZKey.write(result[k][0]);
                const buff = await G.batchLEMtoU(result[k][0]);
                csHasher.update(buff);
            }
            opPromises = [];

        }
        await binFileUtils.endWriteSection(fdZKey);

    }

    async function composeAndWritePointsThread(groupName, arr, logger, sectionName) {
        const G = curve[groupName];
        const sGin = G.F.n8*2;
        const sGmid = G.F.n8*3;
        const sGout = G.F.n8*2;
        let fnExp, fnMultiExp, fnBatchToAffine, fnZero;
        if (groupName == "G1") {
            fnExp = "g1m_timesScalarAffine";
            fnMultiExp = "g1m_multiexpAffine";
            fnBatchToAffine = "g1m_batchToAffine";
            fnZero = "g1m_zero";
        } else if (groupName == "G2") {
            fnExp = "g2m_timesScalarAffine";
            fnMultiExp = "g2m_multiexpAffine";
            fnBatchToAffine = "g2m_batchToAffine";
            fnZero = "g2m_zero";
        } else {
            throw new Error("Invalid group");
        }
        let acc =0;
        for (let i=0; i<arr.length; i++) acc += arr[i] ? arr[i].length : 0;
        let bBases, bScalars;
        if (acc> 2<<14) {
            bBases = new ffjavascript.BigBuffer(acc*sGin);
            bScalars = new ffjavascript.BigBuffer(acc*curve.Fr.n8);
        } else {
            bBases = new Uint8Array(acc*sGin);
            bScalars = new Uint8Array(acc*curve.Fr.n8);
        }
        let pB =0;
        let pS =0;

        const sBuffs = [
            sTauG1,
            sTauG2,
            sAlphaTauG1,
            sBetaTauG1
        ];

        const bOne = new Uint8Array(curve.Fr.n8);
        curve.Fr.toRprLE(bOne, 0, curve.Fr.e(1));

        let offset = 0;
        for (let i=0; i<arr.length; i++) {
            if (!arr[i]) continue;
            for (let j=0; j<arr[i].length; j++) {
                if ((logger)&&(j)&&(j%10000 == 0))  logger.debug(`Configuring big array ${sectionName}: ${j}/${arr[i].length}`);
                bBases.set(
                    sBuffs[arr[i][j][0]].slice(
                        arr[i][j][1],
                        arr[i][j][1] + sGin
                    ), offset*sGin
                );
                if (arr[i][j][2]>=0) {
                    bScalars.set(
                        sR1cs.slice(
                            arr[i][j][2],
                            arr[i][j][2] + curve.Fr.n8
                        ),
                        offset*curve.Fr.n8
                    );
                } else {
                    bScalars.set(bOne, offset*curve.Fr.n8);
                }
                offset ++;
            }
        }

        if (arr.length>1) {
            const task = [];
            task.push({cmd: "ALLOCSET", var: 0, buff: bBases});
            task.push({cmd: "ALLOCSET", var: 1, buff: bScalars});
            task.push({cmd: "ALLOC", var: 2, len: arr.length*sGmid});
            pB = 0;
            pS = 0;
            let pD =0;
            for (let i=0; i<arr.length; i++) {
                if (!arr[i]) {
                    task.push({cmd: "CALL", fnName: fnZero, params: [
                        {var: 2, offset: pD}
                    ]});
                    pD += sGmid;
                    continue;
                }
                if (arr[i].length == 1) {
                    task.push({cmd: "CALL", fnName: fnExp, params: [
                        {var: 0, offset: pB},
                        {var: 1, offset: pS},
                        {val: curve.Fr.n8},
                        {var: 2, offset: pD}
                    ]});
                } else {
                    task.push({cmd: "CALL", fnName: fnMultiExp, params: [
                        {var: 0, offset: pB},
                        {var: 1, offset: pS},
                        {val: curve.Fr.n8},
                        {val: arr[i].length},
                        {var: 2, offset: pD}
                    ]});
                }
                pB += sGin*arr[i].length;
                pS += curve.Fr.n8*arr[i].length;
                pD += sGmid;
            }
            task.push({cmd: "CALL", fnName: fnBatchToAffine, params: [
                {var: 2},
                {val: arr.length},
                {var: 2},
            ]});
            task.push({cmd: "GET", out: 0, var: 2, len: arr.length*sGout});

            const res = await curve.tm.queueAction(task);
            return res;
        } else {
            let res = await G.multiExpAffine(bBases, bScalars, logger, sectionName);
            res = [ G.toAffine(res) ];
            return res;
        }
    }


    async function hashHPoints() {
        const CHUNK_SIZE = 1<<14;

        hashU32(domainSize-1);

        for (let i=0; i<domainSize-1; i+= CHUNK_SIZE) {
            if (logger)  logger.debug(`HashingHPoints: ${i}/${domainSize}`);
            const n = Math.min(domainSize-1, CHUNK_SIZE);
            await hashHPointsChunk(i, n);
        }
    }

    async function hashHPointsChunk(offset, nPoints) {
        const buff1 = await fdPTau.read(nPoints *sG1, sectionsPTau[2][0].p + (offset + domainSize)*sG1);
        const buff2 = await fdPTau.read(nPoints *sG1, sectionsPTau[2][0].p + offset*sG1);
        const concurrency= curve.tm.concurrency;
        const nPointsPerThread = Math.floor(nPoints / concurrency);
        const opPromises = [];
        for (let i=0; i<concurrency; i++) {
            let n;
            if (i< concurrency-1) {
                n = nPointsPerThread;
            } else {
                n = nPoints - i*nPointsPerThread;
            }
            if (n==0) continue;

            const subBuff1 = buff1.slice(i*nPointsPerThread*sG1, (i*nPointsPerThread+n)*sG1);
            const subBuff2 = buff2.slice(i*nPointsPerThread*sG1, (i*nPointsPerThread+n)*sG1);
            opPromises.push(hashHPointsThread(subBuff1, subBuff2));
        }


        const result = await Promise.all(opPromises);

        for (let i=0; i<result.length; i++) {
            csHasher.update(result[i][0]);
        }
    }

    async function hashHPointsThread(buff1, buff2) {
        const nPoints = buff1.byteLength/sG1;
        const sGmid = curve.G1.F.n8*3;
        const task = [];
        task.push({cmd: "ALLOCSET", var: 0, buff: buff1});
        task.push({cmd: "ALLOCSET", var: 1, buff: buff2});
        task.push({cmd: "ALLOC", var: 2, len: nPoints*sGmid});
        for (let i=0; i<nPoints; i++) {
            task.push({
                cmd: "CALL",
                fnName: "g1m_subAffine",
                params: [
                    {var: 0, offset: i*sG1},
                    {var: 1, offset: i*sG1},
                    {var: 2, offset: i*sGmid},
                ]
            });
        }
        task.push({cmd: "CALL", fnName: "g1m_batchToAffine", params: [
            {var: 2},
            {val: nPoints},
            {var: 2},
        ]});
        task.push({cmd: "CALL", fnName: "g1m_batchLEMtoU", params: [
            {var: 2},
            {val: nPoints},
            {var: 2},
        ]});
        task.push({cmd: "GET", out: 0, var: 2, len: nPoints*sG1});

        const res = await curve.tm.queueAction(task);

        return res;
    }

    function hashU32(n) {
        const buff = new Uint8Array(4);
        const buffV = new DataView(buff.buffer, buff.byteOffset, buff.byteLength);
        buffV.setUint32(0, n, false);
        csHasher.update(buff);
    }

}

async function phase2exportMPCParams(zkeyName, mpcparamsName, logger) {

    const {fd: fdZKey, sections: sectionsZKey} = await binFileUtils__namespace.readBinFile(zkeyName, "zkey", 2);
    const zkey = await readHeader$1(fdZKey, sectionsZKey);
    if (zkey.protocol != "groth16") {
        throw new Error("zkey file is not groth16");
    }

    const curve = await getCurveFromQ(zkey.q);
    const sG1 = curve.G1.F.n8*2;
    const sG2 = curve.G2.F.n8*2;

    const mpcParams = await readMPCParams(fdZKey, curve, sectionsZKey);

    const fdMPCParams = await fastFile__namespace.createOverride(mpcparamsName);

    /////////////////////
    // Verification Key Section
    /////////////////////
    await writeG1(zkey.vk_alpha_1);
    await writeG1(zkey.vk_beta_1);
    await writeG2(zkey.vk_beta_2);
    await writeG2(zkey.vk_gamma_2);
    await writeG1(zkey.vk_delta_1);
    await writeG2(zkey.vk_delta_2);

    // IC
    let buffBasesIC;
    buffBasesIC = await binFileUtils__namespace.readSection(fdZKey, sectionsZKey, 3);
    buffBasesIC = await curve.G1.batchLEMtoU(buffBasesIC);

    await writePointArray("G1", buffBasesIC);

    /////////////////////
    // h Section
    /////////////////////
    const buffBasesH_Lodd = await binFileUtils__namespace.readSection(fdZKey, sectionsZKey, 9);

    let buffBasesH_Tau;
    buffBasesH_Tau = await curve.G1.fft(buffBasesH_Lodd, "affine", "jacobian", logger);
    buffBasesH_Tau = await curve.G1.batchApplyKey(buffBasesH_Tau, curve.Fr.neg(curve.Fr.e(2)), curve.Fr.w[zkey.power+1], "jacobian", "affine", logger);

    // Remove last element.  (The degree of H will be allways m-2)
    buffBasesH_Tau = buffBasesH_Tau.slice(0, buffBasesH_Tau.byteLength - sG1);
    buffBasesH_Tau = await curve.G1.batchLEMtoU(buffBasesH_Tau);
    await writePointArray("G1", buffBasesH_Tau);

    /////////////////////
    // L section
    /////////////////////
    let buffBasesC;
    buffBasesC = await binFileUtils__namespace.readSection(fdZKey, sectionsZKey, 8);
    buffBasesC = await curve.G1.batchLEMtoU(buffBasesC);
    await writePointArray("G1", buffBasesC);

    /////////////////////
    // A Section (C section)
    /////////////////////
    let buffBasesA;
    buffBasesA = await binFileUtils__namespace.readSection(fdZKey, sectionsZKey, 5);
    buffBasesA = await curve.G1.batchLEMtoU(buffBasesA);
    await writePointArray("G1", buffBasesA);

    /////////////////////
    // B1 Section
    /////////////////////
    let buffBasesB1;
    buffBasesB1 = await binFileUtils__namespace.readSection(fdZKey, sectionsZKey, 6);
    buffBasesB1 = await curve.G1.batchLEMtoU(buffBasesB1);
    await writePointArray("G1", buffBasesB1);

    /////////////////////
    // B2 Section
    /////////////////////
    let buffBasesB2;
    buffBasesB2 = await binFileUtils__namespace.readSection(fdZKey, sectionsZKey, 7);
    buffBasesB2 = await curve.G2.batchLEMtoU(buffBasesB2);
    await writePointArray("G2", buffBasesB2);

    await fdMPCParams.write(mpcParams.csHash);
    await writeU32(mpcParams.contributions.length);

    for (let i=0; i<mpcParams.contributions.length; i++) {
        const c = mpcParams.contributions[i];
        await writeG1(c.deltaAfter);
        await writeG1(c.delta.g1_s);
        await writeG1(c.delta.g1_sx);
        await writeG2(c.delta.g2_spx);
        await fdMPCParams.write(c.transcript);
    }

    await fdZKey.close();
    await fdMPCParams.close();

    async function writeG1(P) {
        const buff = new Uint8Array(sG1);
        curve.G1.toRprUncompressed(buff, 0, P);
        await fdMPCParams.write(buff);
    }

    async function writeG2(P) {
        const buff = new Uint8Array(sG2);
        curve.G2.toRprUncompressed(buff, 0, P);
        await fdMPCParams.write(buff);
    }

    async function writePointArray(groupName, buff) {
        let sG;
        if (groupName == "G1") {
            sG = sG1;
        } else {
            sG = sG2;
        }

        const buffSize = new Uint8Array(4);
        const buffSizeV = new DataView(buffSize.buffer, buffSize.byteOffset, buffSize.byteLength);
        buffSizeV.setUint32(0, buff.byteLength / sG, false);

        await fdMPCParams.write(buffSize);
        await fdMPCParams.write(buff);
    }

    async function writeU32(n) {
        const buffSize = new Uint8Array(4);
        const buffSizeV = new DataView(buffSize.buffer, buffSize.byteOffset, buffSize.byteLength);
        buffSizeV.setUint32(0, n, false);

        await fdMPCParams.write(buffSize);
    }



}

/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

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

async function phase2importMPCParams(zkeyNameOld, mpcparamsName, zkeyNameNew, name, logger) {

    const {fd: fdZKeyOld, sections: sectionsZKeyOld} = await binFileUtils__namespace.readBinFile(zkeyNameOld, "zkey", 2);
    const zkeyHeader = await readHeader$1(fdZKeyOld, sectionsZKeyOld, false);
    if (zkeyHeader.protocol != "groth16") {
        throw new Error("zkey file is not groth16");
    }

    const curve = await getCurveFromQ(zkeyHeader.q);
    const sG1 = curve.G1.F.n8*2;
    const sG2 = curve.G2.F.n8*2;

    const oldMPCParams = await readMPCParams(fdZKeyOld, curve, sectionsZKeyOld);
    const newMPCParams = {};

    const fdMPCParams = await fastFile__namespace.readExisting(mpcparamsName);

    fdMPCParams.pos =
        sG1*3 + sG2*3 +                     // vKey
        8 + sG1*zkeyHeader.nVars +              // IC + C
        4 + sG1*(zkeyHeader.domainSize-1) +     // H
        4 + sG1*zkeyHeader.nVars +              // A
        4 + sG1*zkeyHeader.nVars +              // B1
        4 + sG2*zkeyHeader.nVars;               // B2

    // csHash
    newMPCParams.csHash =  await fdMPCParams.read(64);

    const nConttributions = await fdMPCParams.readUBE32();
    newMPCParams.contributions = [];
    for (let i=0; i<nConttributions; i++) {
        const c = { delta:{} };
        c.deltaAfter = await readG1(fdMPCParams);
        c.delta.g1_s = await readG1(fdMPCParams);
        c.delta.g1_sx = await readG1(fdMPCParams);
        c.delta.g2_spx = await readG2(fdMPCParams);
        c.transcript = await fdMPCParams.read(64);
        if (i<oldMPCParams.contributions.length) {
            c.type = oldMPCParams.contributions[i].type;
            if (c.type==1) {
                c.beaconHash = oldMPCParams.contributions[i].beaconHash;
                c.numIterationsExp = oldMPCParams.contributions[i].numIterationsExp;
            }
            if (oldMPCParams.contributions[i].name) {
                c.name = oldMPCParams.contributions[i].name;
            }
        }
        newMPCParams.contributions.push(c);
    }

    if (!hashIsEqual(newMPCParams.csHash, oldMPCParams.csHash)) {
        if (logger) logger.error("Hash of the original circuit does not match with the MPC one");
        return false;
    }

    if (oldMPCParams.contributions.length > newMPCParams.contributions.length) {
        if (logger) logger.error("The impoerted file does not include new contributions");
        return false;
    }

    for (let i=0; i<oldMPCParams.contributions.length; i++) {
        if (!contributionIsEqual(oldMPCParams.contributions[i], newMPCParams.contributions[i])) {
            if (logger) logger.error(`Previos contribution ${i} does not match`);
            return false;
        }
    }


    // Set the same name to all new controbutions
    if (name) {
        for (let i=oldMPCParams.contributions.length; i<newMPCParams.contributions.length; i++) {
            newMPCParams.contributions[i].name = name;
        }
    }

    const fdZKeyNew = await binFileUtils__namespace.createBinFile(zkeyNameNew, "zkey", 1, 10);
    fdMPCParams.pos = 0;

    // Header
    fdMPCParams.pos += sG1;  // ignore alpha1 (keep original)
    fdMPCParams.pos += sG1;  // ignore beta1
    fdMPCParams.pos += sG2;  // ignore beta2
    fdMPCParams.pos += sG2;  // ignore gamma2
    zkeyHeader.vk_delta_1 = await readG1(fdMPCParams);
    zkeyHeader.vk_delta_2 = await readG2(fdMPCParams);
    await writeHeader(fdZKeyNew, zkeyHeader);

    // IC (Keep original)
    const nIC = await fdMPCParams.readUBE32();
    if (nIC != zkeyHeader.nPublic +1) {
        if (logger) logger.error("Invalid number of points in IC");
        await fdZKeyNew.discard();
        return false;
    }
    fdMPCParams.pos += sG1*(zkeyHeader.nPublic+1);
    await binFileUtils__namespace.copySection(fdZKeyOld, sectionsZKeyOld, fdZKeyNew, 3);

    // Coeffs (Keep original)
    await binFileUtils__namespace.copySection(fdZKeyOld, sectionsZKeyOld, fdZKeyNew, 4);

    // H Section
    const nH = await fdMPCParams.readUBE32();
    if (nH != zkeyHeader.domainSize-1) {
        if (logger) logger.error("Invalid number of points in H");
        await fdZKeyNew.discard();
        return false;
    }
    let buffH;
    const buffTauU = await fdMPCParams.read(sG1*(zkeyHeader.domainSize-1));
    const buffTauLEM = await curve.G1.batchUtoLEM(buffTauU);
    buffH = new Uint8Array(zkeyHeader.domainSize*sG1);
    buffH.set(buffTauLEM);   // Let the last one to zero.
    curve.G1.toRprLEM(buffH, sG1*(zkeyHeader.domainSize-1), curve.G1.zeroAffine);
    const n2Inv = curve.Fr.neg(curve.Fr.inv(curve.Fr.e(2)));
    const wInv = curve.Fr.inv(curve.Fr.w[zkeyHeader.power+1]);
    buffH = await curve.G1.batchApplyKey(buffH, n2Inv, wInv, "affine", "jacobian", logger);
    buffH = await curve.G1.ifft(buffH, "jacobian", "affine", logger);
    await binFileUtils__namespace.startWriteSection(fdZKeyNew, 9);
    await fdZKeyNew.write(buffH);
    await binFileUtils__namespace.endWriteSection(fdZKeyNew);

    // C Secion (L section)
    const nL = await fdMPCParams.readUBE32();
    if (nL != (zkeyHeader.nVars-zkeyHeader.nPublic-1)) {
        if (logger) logger.error("Invalid number of points in L");
        await fdZKeyNew.discard();
        return false;
    }
    let buffL;
    buffL = await fdMPCParams.read(sG1*(zkeyHeader.nVars-zkeyHeader.nPublic-1));
    buffL = await curve.G1.batchUtoLEM(buffL);
    await binFileUtils__namespace.startWriteSection(fdZKeyNew, 8);
    await fdZKeyNew.write(buffL);
    await binFileUtils__namespace.endWriteSection(fdZKeyNew);

    // A Section
    const nA = await fdMPCParams.readUBE32();
    if (nA != zkeyHeader.nVars) {
        if (logger) logger.error("Invalid number of points in A");
        await fdZKeyNew.discard();
        return false;
    }
    fdMPCParams.pos += sG1*(zkeyHeader.nVars);
    await binFileUtils__namespace.copySection(fdZKeyOld, sectionsZKeyOld, fdZKeyNew, 5);

    // B1 Section
    const nB1 = await fdMPCParams.readUBE32();
    if (nB1 != zkeyHeader.nVars) {
        if (logger) logger.error("Invalid number of points in B1");
        await fdZKeyNew.discard();
        return false;
    }
    fdMPCParams.pos += sG1*(zkeyHeader.nVars);
    await binFileUtils__namespace.copySection(fdZKeyOld, sectionsZKeyOld, fdZKeyNew, 6);

    // B2 Section
    const nB2 = await fdMPCParams.readUBE32();
    if (nB2 != zkeyHeader.nVars) {
        if (logger) logger.error("Invalid number of points in B2");
        await fdZKeyNew.discard();
        return false;
    }
    fdMPCParams.pos += sG2*(zkeyHeader.nVars);
    await binFileUtils__namespace.copySection(fdZKeyOld, sectionsZKeyOld, fdZKeyNew, 7);

    await writeMPCParams(fdZKeyNew, curve, newMPCParams);

    await fdMPCParams.close();
    await fdZKeyNew.close();
    await fdZKeyOld.close();

    return true;

    async function readG1(fd) {
        const buff = await fd.read(curve.G1.F.n8*2);
        return curve.G1.fromRprUncompressed(buff, 0);
    }

    async function readG2(fd) {
        const buff = await fd.read(curve.G2.F.n8*2);
        return curve.G2.fromRprUncompressed(buff, 0);
    }


    function contributionIsEqual(c1, c2) {
        if (!curve.G1.eq(c1.deltaAfter   , c2.deltaAfter)) return false;
        if (!curve.G1.eq(c1.delta.g1_s   , c2.delta.g1_s)) return false;
        if (!curve.G1.eq(c1.delta.g1_sx  , c2.delta.g1_sx)) return false;
        if (!curve.G2.eq(c1.delta.g2_spx , c2.delta.g2_spx)) return false;
        if (!hashIsEqual(c1.transcript, c2.transcript)) return false;
        return true;
    }


}

/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

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
const sameRatio = sameRatio$2;



async function phase2verifyFromInit(initFileName, pTauFileName, zkeyFileName, logger) {

    let sr;
    await Blake2b__default["default"].ready();

    const {fd, sections} = await binFileUtils__namespace.readBinFile(zkeyFileName, "zkey", 2);
    const zkey = await readHeader$1(fd, sections, false);
    if (zkey.protocol != "groth16") {
        throw new Error("zkey file is not groth16");
    }

    const curve = await getCurveFromQ(zkey.q);
    const sG1 = curve.G1.F.n8*2;

    const mpcParams = await readMPCParams(fd, curve, sections);

    const accumulatedHasher = Blake2b__default["default"](64);
    accumulatedHasher.update(mpcParams.csHash);
    let curDelta = curve.G1.g;
    for (let i=0; i<mpcParams.contributions.length; i++) {
        const c = mpcParams.contributions[i];
        const ourHasher = cloneHasher(accumulatedHasher);

        hashG1(ourHasher, curve, c.delta.g1_s);
        hashG1(ourHasher, curve, c.delta.g1_sx);

        if (!hashIsEqual(ourHasher.digest(), c.transcript)) {
            console.log(`INVALID(${i}): Inconsistent transcript `);
            return false;
        }

        const delta_g2_sp = hashToG2(curve, c.transcript);

        sr = await sameRatio(curve, c.delta.g1_s, c.delta.g1_sx, delta_g2_sp, c.delta.g2_spx);
        if (sr !== true) {
            console.log(`INVALID(${i}): public key G1 and G2 do not have the same ration `);
            return false;
        }

        sr = await sameRatio(curve, curDelta, c.deltaAfter, delta_g2_sp, c.delta.g2_spx);
        if (sr !== true) {
            console.log(`INVALID(${i}): deltaAfter does not fillow the public key `);
            return false;
        }

        if (c.type == 1) {
            const rng = rngFromBeaconParams(c.beaconHash, c.numIterationsExp);
            const expected_prvKey = curve.Fr.fromRng(rng);
            const expected_g1_s = curve.G1.toAffine(curve.G1.fromRng(rng));
            const expected_g1_sx = curve.G1.toAffine(curve.G1.timesFr(expected_g1_s, expected_prvKey));
            if (curve.G1.eq(expected_g1_s, c.delta.g1_s) !== true) {
                console.log(`INVALID(${i}): Key of the beacon does not match. g1_s `);
                return false;
            }
            if (curve.G1.eq(expected_g1_sx, c.delta.g1_sx) !== true) {
                console.log(`INVALID(${i}): Key of the beacon does not match. g1_sx `);
                return false;
            }
        }

        hashPubKey(accumulatedHasher, curve, c);

        const contributionHasher = Blake2b__default["default"](64);
        hashPubKey(contributionHasher, curve, c);

        c.contributionHash = contributionHasher.digest();

        curDelta = c.deltaAfter;
    }


    const {fd: fdInit, sections: sectionsInit} = await binFileUtils__namespace.readBinFile(initFileName, "zkey", 2);
    const zkeyInit = await readHeader$1(fdInit, sectionsInit, false);

    if (zkeyInit.protocol != "groth16") {
        throw new Error("zkeyinit file is not groth16");
    }

    if (  (!ffjavascript.Scalar.eq(zkeyInit.q, zkey.q))
        ||(!ffjavascript.Scalar.eq(zkeyInit.r, zkey.r))
        ||(zkeyInit.n8q != zkey.n8q)
        ||(zkeyInit.n8r != zkey.n8r))
    {
        if (logger) logger.error("INVALID:  Different curves");
        return false;
    }

    if (  (zkeyInit.nVars != zkey.nVars)
        ||(zkeyInit.nPublic !=  zkey.nPublic)
        ||(zkeyInit.domainSize != zkey.domainSize))
    {
        if (logger) logger.error("INVALID:  Different circuit parameters");
        return false;
    }

    if (!curve.G1.eq(zkey.vk_alpha_1, zkeyInit.vk_alpha_1)) {
        if (logger) logger.error("INVALID:  Invalid alpha1");
        return false;
    }
    if (!curve.G1.eq(zkey.vk_beta_1, zkeyInit.vk_beta_1)) {
        if (logger) logger.error("INVALID:  Invalid beta1");
        return false;
    }
    if (!curve.G2.eq(zkey.vk_beta_2, zkeyInit.vk_beta_2)) {
        if (logger) logger.error("INVALID:  Invalid beta2");
        return false;
    }
    if (!curve.G2.eq(zkey.vk_gamma_2, zkeyInit.vk_gamma_2)) {
        if (logger) logger.error("INVALID:  Invalid gamma2");
        return false;
    }
    if (!curve.G1.eq(zkey.vk_delta_1, curDelta)) {
        if (logger) logger.error("INVALID:  Invalid delta1");
        return false;
    }
    sr = await sameRatio(curve, curve.G1.g, curDelta, curve.G2.g, zkey.vk_delta_2);
    if (sr !== true) {
        if (logger) logger.error("INVALID:  Invalid delta2");
        return false;
    }

    const mpcParamsInit = await readMPCParams(fdInit, curve, sectionsInit);
    if (!hashIsEqual(mpcParams.csHash, mpcParamsInit.csHash)) {
        if (logger) logger.error("INVALID:  Circuit does not match");
        return false;
    }

    // Check sizes of sections
    if (sections[8][0].size != sG1*(zkey.nVars-zkey.nPublic-1)) {
        if (logger) logger.error("INVALID:  Invalid L section size");
        return false;
    }

    if (sections[9][0].size != sG1*(zkey.domainSize)) {
        if (logger) logger.error("INVALID:  Invalid H section size");
        return false;
    }

    let ss;
    ss = await binFileUtils__namespace.sectionIsEqual(fd, sections, fdInit, sectionsInit, 3);
    if (!ss) {
        if (logger) logger.error("INVALID:  IC section is not identical");
        return false;
    }

    ss = await binFileUtils__namespace.sectionIsEqual(fd, sections, fdInit, sectionsInit, 4);
    if (!ss) {
        if (logger) logger.error("Coeffs section is not identical");
        return false;
    }

    ss = await binFileUtils__namespace.sectionIsEqual(fd, sections, fdInit, sectionsInit, 5);
    if (!ss) {
        if (logger) logger.error("A section is not identical");
        return false;
    }

    ss = await binFileUtils__namespace.sectionIsEqual(fd, sections, fdInit, sectionsInit, 6);
    if (!ss) {
        if (logger) logger.error("B1 section is not identical");
        return false;
    }

    ss = await binFileUtils__namespace.sectionIsEqual(fd, sections, fdInit, sectionsInit, 7);
    if (!ss) {
        if (logger) logger.error("B2 section is not identical");
        return false;
    }

    // Check L
    sr = await sectionHasSameRatio("G1", fdInit, sectionsInit, fd, sections, 8, zkey.vk_delta_2, zkeyInit.vk_delta_2, "L section");
    if (sr!==true) {
        if (logger) logger.error("L section does not match");
        return false;
    }

    // Check H
    sr = await sameRatioH();
    if (sr!==true) {
        if (logger) logger.error("H section does not match");
        return false;
    }

    if (logger) logger.info(formatHash(mpcParams.csHash, "Circuit Hash: "));

    await fd.close();
    await fdInit.close();

    for (let i=mpcParams.contributions.length-1; i>=0; i--) {
        const c = mpcParams.contributions[i];
        if (logger) logger.info("-------------------------");
        if (logger) logger.info(formatHash(c.contributionHash, `contribution #${i+1} ${c.name ? c.name : ""}:`));
        if (c.type == 1) {
            if (logger) logger.info(`Beacon generator: ${byteArray2hex(c.beaconHash)}`);
            if (logger) logger.info(`Beacon iterations Exp: ${c.numIterationsExp}`);
        }
    }
    if (logger) logger.info("-------------------------");

    if (logger) logger.info("ZKey Ok!");

    return true;


    async function sectionHasSameRatio(groupName, fd1, sections1, fd2, sections2, idSection, g2sp, g2spx, sectionName) {
        const MAX_CHUNK_SIZE = 1<<20;
        const G = curve[groupName];
        const sG = G.F.n8*2;
        await binFileUtils__namespace.startReadUniqueSection(fd1, sections1, idSection);
        await binFileUtils__namespace.startReadUniqueSection(fd2, sections2, idSection);

        let R1 = G.zero;
        let R2 = G.zero;

        const nPoints = sections1[idSection][0].size / sG;

        for (let i=0; i<nPoints; i += MAX_CHUNK_SIZE) {
            if (logger) logger.debug(`Same ratio check ${sectionName}:  ${i}/${nPoints}`);
            const n = Math.min(nPoints - i, MAX_CHUNK_SIZE);
            const bases1 = await fd1.read(n*sG);
            const bases2 = await fd2.read(n*sG);

            const scalars = new Uint8Array(4*n);
            crypto__default["default"].randomFillSync(scalars);


            const r1 = await G.multiExpAffine(bases1, scalars);
            const r2 = await G.multiExpAffine(bases2, scalars);

            R1 = G.add(R1, r1);
            R2 = G.add(R2, r2);
        }
        await binFileUtils__namespace.endReadSection(fd1);
        await binFileUtils__namespace.endReadSection(fd2);

        if (nPoints == 0) return true;

        sr = await sameRatio(curve, R1, R2, g2sp, g2spx);
        if (sr !== true) return false;

        return true;
    }

    async function sameRatioH() {
        const MAX_CHUNK_SIZE = 1<<20;
        const G = curve.G1;
        const Fr = curve.Fr;
        const sG = G.F.n8*2;

        const {fd: fdPTau, sections: sectionsPTau} = await binFileUtils__namespace.readBinFile(pTauFileName, "ptau", 1);

        let buff_r = new ffjavascript.BigBuffer(zkey.domainSize * zkey.n8r);

        const seed= new Array(8);
        for (let i=0; i<8; i++) {
            seed[i] = crypto__default["default"].randomBytes(4).readUInt32BE(0, true);
        }
        const rng = new ffjavascript.ChaCha(seed);
        for (let i=0; i<zkey.domainSize-1; i++) {   // Note that last one is zero
            const e = Fr.fromRng(rng);
            Fr.toRprLE(buff_r, i*zkey.n8r, e);
        }
        Fr.toRprLE(buff_r, (zkey.domainSize-1)*zkey.n8r, Fr.zero);

        let R1 = G.zero;
        for (let i=0; i<zkey.domainSize; i += MAX_CHUNK_SIZE) {
            if (logger) logger.debug(`H Verificaition(tau):  ${i}/${zkey.domainSize}`);
            const n = Math.min(zkey.domainSize - i, MAX_CHUNK_SIZE);

            const buff1 = await fdPTau.read(sG*n, sectionsPTau[2][0].p + zkey.domainSize*sG + i*sG);
            const buff2 = await fdPTau.read(sG*n, sectionsPTau[2][0].p + i*sG);

            const buffB = await batchSubstract(buff1, buff2);
            const buffS = buff_r.slice(i*zkey.n8r, (i+n)*zkey.n8r);
            const r = await G.multiExpAffine(buffB, buffS);

            R1 = G.add(R1, r);
        }

        // Caluclate odd coeficients in transformed domain

        buff_r = await Fr.batchToMontgomery(buff_r);
        // const first = curve.Fr.neg(curve.Fr.inv(curve.Fr.e(2)));
        // Works*2   const first = curve.Fr.neg(curve.Fr.e(2));


        let first;

        if (zkey.power < Fr.s) {
            first = Fr.neg(Fr.e(2));
        } else {
            const small_m  = 2 ** Fr.s;
            const shift_to_small_m = Fr.exp(Fr.shift, small_m);
            first = Fr.sub( shift_to_small_m, Fr.one);
        }

        // const inc = curve.Fr.inv(curve.PFr.w[zkey.power+1]);
        const inc = zkey.power < Fr.s ? Fr.w[zkey.power+1] : Fr.shift;
        buff_r = await Fr.batchApplyKey(buff_r, first, inc);
        buff_r = await Fr.fft(buff_r);
        buff_r = await Fr.batchFromMontgomery(buff_r);

        await binFileUtils__namespace.startReadUniqueSection(fd, sections, 9);
        let R2 = G.zero;
        for (let i=0; i<zkey.domainSize; i += MAX_CHUNK_SIZE) {
            if (logger) logger.debug(`H Verificaition(lagrange):  ${i}/${zkey.domainSize}`);
            const n = Math.min(zkey.domainSize - i, MAX_CHUNK_SIZE);

            const buff = await fd.read(sG*n);
            const buffS = buff_r.slice(i*zkey.n8r, (i+n)*zkey.n8r);
            const r = await G.multiExpAffine(buff, buffS);

            R2 = G.add(R2, r);
        }
        await binFileUtils__namespace.endReadSection(fd);

        sr = await sameRatio(curve, R1, R2, zkey.vk_delta_2, zkeyInit.vk_delta_2);
        if (sr !== true) return false;


        return true;

    }

    async function batchSubstract(buff1, buff2) {
        const sG = curve.G1.F.n8*2;
        const nPoints = buff1.byteLength / sG;
        const concurrency= curve.tm.concurrency;
        const nPointsPerThread = Math.floor(nPoints / concurrency);
        const opPromises = [];
        for (let i=0; i<concurrency; i++) {
            let n;
            if (i< concurrency-1) {
                n = nPointsPerThread;
            } else {
                n = nPoints - i*nPointsPerThread;
            }
            if (n==0) continue;

            const subBuff1 = buff1.slice(i*nPointsPerThread*sG1, (i*nPointsPerThread+n)*sG1);
            const subBuff2 = buff2.slice(i*nPointsPerThread*sG1, (i*nPointsPerThread+n)*sG1);
            opPromises.push(batchSubstractThread(subBuff1, subBuff2));
        }


        const result = await Promise.all(opPromises);

        const fullBuffOut = new Uint8Array(nPoints*sG);
        let p =0;
        for (let i=0; i<result.length; i++) {
            fullBuffOut.set(result[i][0], p);
            p+=result[i][0].byteLength;
        }

        return fullBuffOut;
    }


    async function batchSubstractThread(buff1, buff2) {
        const sG1 = curve.G1.F.n8*2;
        const sGmid = curve.G1.F.n8*3;
        const nPoints = buff1.byteLength/sG1;
        const task = [];
        task.push({cmd: "ALLOCSET", var: 0, buff: buff1});
        task.push({cmd: "ALLOCSET", var: 1, buff: buff2});
        task.push({cmd: "ALLOC", var: 2, len: nPoints*sGmid});
        for (let i=0; i<nPoints; i++) {
            task.push({
                cmd: "CALL",
                fnName: "g1m_subAffine",
                params: [
                    {var: 0, offset: i*sG1},
                    {var: 1, offset: i*sG1},
                    {var: 2, offset: i*sGmid},
                ]
            });
        }
        task.push({cmd: "CALL", fnName: "g1m_batchToAffine", params: [
            {var: 2},
            {val: nPoints},
            {var: 2},
        ]});
        task.push({cmd: "GET", out: 0, var: 2, len: nPoints*sG1});

        const res = await curve.tm.queueAction(task);

        return res;
    }

}

/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

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

async function phase2verifyFromR1cs(r1csFileName, pTauFileName, zkeyFileName, logger) {

    // const initFileName = "~" + zkeyFileName + ".init";
    const initFileName = {type: "bigMem"};
    await newZKey(r1csFileName, pTauFileName, initFileName, logger);

    return await phase2verifyFromInit(initFileName, pTauFileName, zkeyFileName, logger);
}

/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

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

async function phase2contribute(zkeyNameOld, zkeyNameNew, name, entropy, logger) {
    await Blake2b__default["default"].ready();

    const {fd: fdOld, sections: sections} = await binFileUtils__namespace.readBinFile(zkeyNameOld, "zkey", 2);
    const zkey = await readHeader$1(fdOld, sections);
    if (zkey.protocol != "groth16") {
        throw new Error("zkey file is not groth16");
    }

    const curve = await getCurveFromQ(zkey.q);

    const mpcParams = await readMPCParams(fdOld, curve, sections);

    const fdNew = await binFileUtils__namespace.createBinFile(zkeyNameNew, "zkey", 1, 10);


    const rng = await getRandomRng(entropy);

    const transcriptHasher = Blake2b__default["default"](64);
    transcriptHasher.update(mpcParams.csHash);
    for (let i=0; i<mpcParams.contributions.length; i++) {
        hashPubKey(transcriptHasher, curve, mpcParams.contributions[i]);
    }

    const curContribution = {};
    curContribution.delta = {};
    curContribution.delta.prvKey = curve.Fr.fromRng(rng);
    curContribution.delta.g1_s = curve.G1.toAffine(curve.G1.fromRng(rng));
    curContribution.delta.g1_sx = curve.G1.toAffine(curve.G1.timesFr(curContribution.delta.g1_s, curContribution.delta.prvKey));
    hashG1(transcriptHasher, curve, curContribution.delta.g1_s);
    hashG1(transcriptHasher, curve, curContribution.delta.g1_sx);
    curContribution.transcript = transcriptHasher.digest();
    curContribution.delta.g2_sp = hashToG2(curve, curContribution.transcript);
    curContribution.delta.g2_spx = curve.G2.toAffine(curve.G2.timesFr(curContribution.delta.g2_sp, curContribution.delta.prvKey));

    zkey.vk_delta_1 = curve.G1.timesFr(zkey.vk_delta_1, curContribution.delta.prvKey);
    zkey.vk_delta_2 = curve.G2.timesFr(zkey.vk_delta_2, curContribution.delta.prvKey);

    curContribution.deltaAfter = zkey.vk_delta_1;

    curContribution.type = 0;
    if (name) curContribution.name = name;

    mpcParams.contributions.push(curContribution);

    await writeHeader(fdNew, zkey);

    // IC
    await binFileUtils__namespace.copySection(fdOld, sections, fdNew, 3);

    // Coeffs (Keep original)
    await binFileUtils__namespace.copySection(fdOld, sections, fdNew, 4);

    // A Section
    await binFileUtils__namespace.copySection(fdOld, sections, fdNew, 5);

    // B1 Section
    await binFileUtils__namespace.copySection(fdOld, sections, fdNew, 6);

    // B2 Section
    await binFileUtils__namespace.copySection(fdOld, sections, fdNew, 7);

    const invDelta = curve.Fr.inv(curContribution.delta.prvKey);
    await applyKeyToSection(fdOld, sections, fdNew, 8, curve, "G1", invDelta, curve.Fr.e(1), "L Section", logger);
    await applyKeyToSection(fdOld, sections, fdNew, 9, curve, "G1", invDelta, curve.Fr.e(1), "H Section", logger);

    await writeMPCParams(fdNew, curve, mpcParams);

    await fdOld.close();
    await fdNew.close();

    const contributionHasher = Blake2b__default["default"](64);
    hashPubKey(contributionHasher, curve, curContribution);

    const contribuionHash = contributionHasher.digest();

    if (logger) logger.info(formatHash(mpcParams.csHash, "Circuit Hash: "));
    if (logger) logger.info(formatHash(contribuionHash, "Contribution Hash: "));

    return contribuionHash;
}

/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

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


async function beacon(zkeyNameOld, zkeyNameNew, name, beaconHashStr, numIterationsExp, logger) {
    await Blake2b__default["default"].ready();

    const beaconHash = hex2ByteArray(beaconHashStr);
    if (   (beaconHash.byteLength == 0)
        || (beaconHash.byteLength*2 !=beaconHashStr.length))
    {
        if (logger) logger.error("Invalid Beacon Hash. (It must be a valid hexadecimal sequence)");
        return false;
    }
    if (beaconHash.length>=256) {
        if (logger) logger.error("Maximum lenght of beacon hash is 255 bytes");
        return false;
    }

    numIterationsExp = parseInt(numIterationsExp);
    if ((numIterationsExp<10)||(numIterationsExp>63)) {
        if (logger) logger.error("Invalid numIterationsExp. (Must be between 10 and 63)");
        return false;
    }


    const {fd: fdOld, sections: sections} = await binFileUtils__namespace.readBinFile(zkeyNameOld, "zkey", 2);
    const zkey = await readHeader$1(fdOld, sections);

    if (zkey.protocol != "groth16") {
        throw new Error("zkey file is not groth16");
    }


    const curve = await getCurveFromQ(zkey.q);

    const mpcParams = await readMPCParams(fdOld, curve, sections);

    const fdNew = await binFileUtils__namespace.createBinFile(zkeyNameNew, "zkey", 1, 10);

    const rng = await rngFromBeaconParams(beaconHash, numIterationsExp);

    const transcriptHasher = Blake2b__default["default"](64);
    transcriptHasher.update(mpcParams.csHash);
    for (let i=0; i<mpcParams.contributions.length; i++) {
        hashPubKey(transcriptHasher, curve, mpcParams.contributions[i]);
    }

    const curContribution = {};
    curContribution.delta = {};
    curContribution.delta.prvKey = curve.Fr.fromRng(rng);
    curContribution.delta.g1_s = curve.G1.toAffine(curve.G1.fromRng(rng));
    curContribution.delta.g1_sx = curve.G1.toAffine(curve.G1.timesFr(curContribution.delta.g1_s, curContribution.delta.prvKey));
    hashG1(transcriptHasher, curve, curContribution.delta.g1_s);
    hashG1(transcriptHasher, curve, curContribution.delta.g1_sx);
    curContribution.transcript = transcriptHasher.digest();
    curContribution.delta.g2_sp = hashToG2(curve, curContribution.transcript);
    curContribution.delta.g2_spx = curve.G2.toAffine(curve.G2.timesFr(curContribution.delta.g2_sp, curContribution.delta.prvKey));

    zkey.vk_delta_1 = curve.G1.timesFr(zkey.vk_delta_1, curContribution.delta.prvKey);
    zkey.vk_delta_2 = curve.G2.timesFr(zkey.vk_delta_2, curContribution.delta.prvKey);

    curContribution.deltaAfter = zkey.vk_delta_1;

    curContribution.type = 1;
    curContribution.numIterationsExp = numIterationsExp;
    curContribution.beaconHash = beaconHash;

    if (name) curContribution.name = name;

    mpcParams.contributions.push(curContribution);

    await writeHeader(fdNew, zkey);

    // IC
    await binFileUtils__namespace.copySection(fdOld, sections, fdNew, 3);

    // Coeffs (Keep original)
    await binFileUtils__namespace.copySection(fdOld, sections, fdNew, 4);

    // A Section
    await binFileUtils__namespace.copySection(fdOld, sections, fdNew, 5);

    // B1 Section
    await binFileUtils__namespace.copySection(fdOld, sections, fdNew, 6);

    // B2 Section
    await binFileUtils__namespace.copySection(fdOld, sections, fdNew, 7);

    const invDelta = curve.Fr.inv(curContribution.delta.prvKey);
    await applyKeyToSection(fdOld, sections, fdNew, 8, curve, "G1", invDelta, curve.Fr.e(1), "L Section", logger);
    await applyKeyToSection(fdOld, sections, fdNew, 9, curve, "G1", invDelta, curve.Fr.e(1), "H Section", logger);

    await writeMPCParams(fdNew, curve, mpcParams);

    await fdOld.close();
    await fdNew.close();

    const contributionHasher = Blake2b__default["default"](64);
    hashPubKey(contributionHasher, curve, curContribution);

    const contribuionHash = contributionHasher.digest();

    if (logger) logger.info(formatHash(contribuionHash, "Contribution Hash: "));

    return contribuionHash;
}

async function zkeyExportJson(zkeyFileName) {

    const zKey = await readZKey(zkeyFileName, true);
    delete zKey.curve;
    delete zKey.F;

    return ffjavascript.utils.stringifyBigInts(zKey);
}

/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

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

async function bellmanContribute(curve, challengeFilename, responesFileName, entropy, logger) {
    await Blake2b__default["default"].ready();

    const rng = await getRandomRng(entropy);

    const delta = curve.Fr.fromRng(rng);
    const invDelta = curve.Fr.inv(delta);

    const sG1 = curve.G1.F.n8*2;
    const sG2 = curve.G2.F.n8*2;

    const fdFrom = await fastFile__namespace.readExisting(challengeFilename);
    const fdTo = await fastFile__namespace.createOverride(responesFileName);


    await copy(sG1); // alpha1
    await copy(sG1); // beta1
    await copy(sG2); // beta2
    await copy(sG2); // gamma2
    const oldDelta1 = await readG1();
    const delta1 = curve.G1.timesFr(oldDelta1, delta);
    await writeG1(delta1);
    const oldDelta2 = await readG2();
    const delta2 = curve.G2.timesFr(oldDelta2, delta);
    await writeG2(delta2);

    // IC
    const nIC = await fdFrom.readUBE32();
    await fdTo.writeUBE32(nIC);
    await copy(nIC*sG1);

    // H
    const nH = await fdFrom.readUBE32();
    await fdTo.writeUBE32(nH);
    await applyKeyToChallengeSection(fdFrom, fdTo, null, curve, "G1", nH, invDelta, curve.Fr.e(1), "UNCOMPRESSED", "H", logger);

    // L
    const nL = await fdFrom.readUBE32();
    await fdTo.writeUBE32(nL);
    await applyKeyToChallengeSection(fdFrom, fdTo, null, curve, "G1", nL, invDelta, curve.Fr.e(1), "UNCOMPRESSED", "L", logger);

    // A
    const nA = await fdFrom.readUBE32();
    await fdTo.writeUBE32(nA);
    await copy(nA*sG1);

    // B1
    const nB1 = await fdFrom.readUBE32();
    await fdTo.writeUBE32(nB1);
    await copy(nB1*sG1);

    // B2
    const nB2 = await fdFrom.readUBE32();
    await fdTo.writeUBE32(nB2);
    await copy(nB2*sG2);


    //////////
    /// Read contributions
    //////////
    const transcriptHasher = Blake2b__default["default"](64);

    const mpcParams = {};
    // csHash
    mpcParams.csHash =  await fdFrom.read(64);
    transcriptHasher.update(mpcParams.csHash);

    const nConttributions = await fdFrom.readUBE32();
    mpcParams.contributions = [];
    for (let i=0; i<nConttributions; i++) {
        const c = { delta:{} };
        c.deltaAfter = await readG1();
        c.delta.g1_s = await readG1();
        c.delta.g1_sx = await readG1();
        c.delta.g2_spx = await readG2();
        c.transcript = await fdFrom.read(64);
        mpcParams.contributions.push(c);
        hashPubKey(transcriptHasher, curve, c);
    }

    const curContribution = {};
    curContribution.delta = {};
    curContribution.delta.prvKey = delta;
    curContribution.delta.g1_s = curve.G1.toAffine(curve.G1.fromRng(rng));
    curContribution.delta.g1_sx = curve.G1.toAffine(curve.G1.timesFr(curContribution.delta.g1_s, delta));
    hashG1(transcriptHasher, curve, curContribution.delta.g1_s);
    hashG1(transcriptHasher, curve, curContribution.delta.g1_sx);
    curContribution.transcript = transcriptHasher.digest();
    curContribution.delta.g2_sp = hashToG2(curve, curContribution.transcript);
    curContribution.delta.g2_spx = curve.G2.toAffine(curve.G2.timesFr(curContribution.delta.g2_sp, delta));
    curContribution.deltaAfter = delta1;
    curContribution.type = 0;
    mpcParams.contributions.push(curContribution);


    //////////
    /// Write COntribution
    //////////

    await fdTo.write(mpcParams.csHash);
    await fdTo.writeUBE32(mpcParams.contributions.length);

    for (let i=0; i<mpcParams.contributions.length; i++) {
        const c = mpcParams.contributions[i];
        await writeG1(c.deltaAfter);
        await writeG1(c.delta.g1_s);
        await writeG1(c.delta.g1_sx);
        await writeG2(c.delta.g2_spx);
        await fdTo.write(c.transcript);
    }

    const contributionHasher = Blake2b__default["default"](64);
    hashPubKey(contributionHasher, curve, curContribution);

    const contributionHash = contributionHasher.digest();

    if (logger) logger.info(formatHash(contributionHash, "Contribution Hash: "));

    await fdTo.close();
    await fdFrom.close();

    return contributionHash;

    async function copy(nBytes) {
        const CHUNK_SIZE = fdFrom.pageSize*2;
        for (let i=0; i<nBytes; i+= CHUNK_SIZE) {
            const n = Math.min(nBytes -i, CHUNK_SIZE);
            const buff = await fdFrom.read(n);
            await fdTo.write(buff);
        }
    }

    async function readG1() {
        const buff = await fdFrom.read(curve.G1.F.n8*2);
        return curve.G1.fromRprUncompressed(buff, 0);
    }

    async function readG2() {
        const buff = await fdFrom.read(curve.G2.F.n8*2);
        return curve.G2.fromRprUncompressed(buff, 0);
    }

    async function writeG1(P) {
        const buff = new Uint8Array(sG1);
        curve.G1.toRprUncompressed(buff, 0, P);
        await fdTo.write(buff);
    }

    async function writeG2(P) {
        const buff = new Uint8Array(sG2);
        curve.G2.toRprUncompressed(buff, 0, P);
        await fdTo.write(buff);
    }


}

/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

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
const {stringifyBigInts: stringifyBigInts$1} = ffjavascript.utils;

async function zkeyExportVerificationKey(zkeyName, /* logger */ ) {

    const {fd, sections} = await binFileUtils__namespace.readBinFile(zkeyName, "zkey", 2);
    const zkey = await readHeader$1(fd, sections);

    let res;
    if (zkey.protocol == "groth16") {
        res = await groth16Vk(zkey, fd, sections);
    } else if (zkey.protocol == "plonk") {
        res = await plonkVk(zkey);
    } else {
        throw new Error("zkey file is not groth16");
    }

    await fd.close();

    return res;
}


async function groth16Vk(zkey, fd, sections) {
    const curve = await getCurveFromQ(zkey.q);
    const sG1 = curve.G1.F.n8*2;

    const alphaBeta = await curve.pairing( zkey.vk_alpha_1 , zkey.vk_beta_2 );

    let vKey = {
        protocol: zkey.protocol,
        curve: curve.name,
        nPublic: zkey.nPublic,

        vk_alpha_1: curve.G1.toObject(zkey.vk_alpha_1),

        vk_beta_2: curve.G2.toObject(zkey.vk_beta_2),
        vk_gamma_2:  curve.G2.toObject(zkey.vk_gamma_2),
        vk_delta_2:  curve.G2.toObject(zkey.vk_delta_2),

        vk_alphabeta_12: curve.Gt.toObject(alphaBeta)
    };

    // Read IC Section
    ///////////
    await binFileUtils__namespace.startReadUniqueSection(fd, sections, 3);
    vKey.IC = [];
    for (let i=0; i<= zkey.nPublic; i++) {
        const buff = await fd.read(sG1);
        const P = curve.G1.toObject(buff);
        vKey.IC.push(P);
    }
    await binFileUtils__namespace.endReadSection(fd);

    vKey = stringifyBigInts$1(vKey);

    return vKey;
}


async function plonkVk(zkey) {
    const curve = await getCurveFromQ(zkey.q);

    let vKey = {
        protocol: zkey.protocol,
        curve: curve.name,
        nPublic: zkey.nPublic,
        power: zkey.power,

        k1: curve.Fr.toObject(zkey.k1),
        k2: curve.Fr.toObject(zkey.k2),

        Qm: curve.G1.toObject(zkey.Qm),
        Ql: curve.G1.toObject(zkey.Ql),
        Qr: curve.G1.toObject(zkey.Qr),
        Qo: curve.G1.toObject(zkey.Qo),
        Qc: curve.G1.toObject(zkey.Qc),
        S1: curve.G1.toObject(zkey.S1),
        S2: curve.G1.toObject(zkey.S2),
        S3: curve.G1.toObject(zkey.S3),

        X_2: curve.G2.toObject(zkey.X_2),

        w: curve.Fr.toObject(curve.Fr.w[zkey.power])
    };

    vKey = stringifyBigInts$1(vKey);

    return vKey;
}

// Not ready yet
// module.exports.generateVerifier_kimleeoh = generateVerifier_kimleeoh;



async function exportSolidityVerifier(zKeyName, templates, logger) {

    const verificationKey = await zkeyExportVerificationKey(zKeyName);

    let template = templates[verificationKey.protocol];

    return ejs__default["default"].render(template ,  verificationKey);
}

/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

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

var zkey = /*#__PURE__*/Object.freeze({
    __proto__: null,
    newZKey: newZKey,
    exportBellman: phase2exportMPCParams,
    importBellman: phase2importMPCParams,
    verifyFromR1cs: phase2verifyFromR1cs,
    verifyFromInit: phase2verifyFromInit,
    contribute: phase2contribute,
    beacon: beacon,
    exportJson: zkeyExportJson,
    bellmanContribute: bellmanContribute,
    exportVerificationKey: zkeyExportVerificationKey,
    exportSolidityVerifier: exportSolidityVerifier
});

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


async function plonkSetup(r1csName, ptauName, zkeyName, logger) {

    if (globalThis.gc) {globalThis.gc();}

    await Blake2b__default["default"].ready();

    const {fd: fdPTau, sections: sectionsPTau} = await binFileUtils.readBinFile(ptauName, "ptau", 1, 1<<22, 1<<24);
    const {curve, power} = await readPTauHeader(fdPTau, sectionsPTau);
    const {fd: fdR1cs, sections: sectionsR1cs} = await binFileUtils.readBinFile(r1csName, "r1cs", 1, 1<<22, 1<<24);

    const r1cs = await r1csfile.readR1csFd(fdR1cs, sectionsR1cs, {loadConstraints: true, loadCustomGates: true});

    const sG1 = curve.G1.F.n8*2;
    const G1 = curve.G1;
    const sG2 = curve.G2.F.n8*2;
    const Fr = curve.Fr;
    const n8r = curve.Fr.n8;

    if (logger) logger.info("Reading r1cs");
    await binFileUtils.readSection(fdR1cs, sectionsR1cs, 2);

    const plonkConstraints = new BigArray();
    const plonkAdditions = new BigArray();
    let plonkNVars = r1cs.nVars;

    const nPublic = r1cs.nOutputs + r1cs.nPubInputs;

    await processConstraints(curve.Fr, r1cs, logger);

    if (globalThis.gc) {globalThis.gc();}

    const fdZKey = await binFileUtils.createBinFile(zkeyName, "zkey", 1, 14, 1<<22, 1<<24);


    if (r1cs.prime != curve.r) {
        if (logger) logger.error("r1cs curve does not match powers of tau ceremony curve");
        return -1;
    }

    let cirPower = log2(plonkConstraints.length -1) +1;
    if (cirPower < 3) cirPower = 3;   // As the t polinomal is n+5 whe need at least a power of 4
    const domainSize = 2 ** cirPower;

    if (logger) logger.info("Plonk constraints: " + plonkConstraints.length);
    if (cirPower > power) {
        if (logger) logger.error(`circuit too big for this power of tau ceremony. ${plonkConstraints.length} > 2**${power}`);
        return -1;
    }

    if (!sectionsPTau[12]) {
        if (logger) logger.error("Powers of tau is not prepared.");
        return -1;
    }


    const LPoints = new ffjavascript.BigBuffer(domainSize*sG1);
    const o = sectionsPTau[12][0].p + ((2 ** (cirPower)) -1)*sG1;
    await fdPTau.readToBuffer(LPoints, 0, domainSize*sG1, o);

    const [k1, k2] = getK1K2();

    const vk = {};


    await writeAdditions(3, "Additions");
    if (globalThis.gc) {globalThis.gc();}
    await writeWitnessMap(4, 0, "Amap");
    if (globalThis.gc) {globalThis.gc();}
    await writeWitnessMap(5, 1, "Bmap");
    if (globalThis.gc) {globalThis.gc();}
    await writeWitnessMap(6, 2, "Cmap");
    if (globalThis.gc) {globalThis.gc();}
    await writeQMap(7, 3, "Qm");
    if (globalThis.gc) {globalThis.gc();}
    await writeQMap(8, 4, "Ql");
    if (globalThis.gc) {globalThis.gc();}
    await writeQMap(9, 5, "Qr");
    if (globalThis.gc) {globalThis.gc();}
    await writeQMap(10, 6, "Qo");
    if (globalThis.gc) {globalThis.gc();}
    await writeQMap(11, 7, "Qc");
    if (globalThis.gc) {globalThis.gc();}
    await writeSigma(12, "sigma");
    if (globalThis.gc) {globalThis.gc();}
    await writeLs(13, "lagrange polynomials");
    if (globalThis.gc) {globalThis.gc();}

    // Write PTau points
    ////////////

    await binFileUtils.startWriteSection(fdZKey, 14);
    const buffOut = new ffjavascript.BigBuffer((domainSize+6)*sG1);
    await fdPTau.readToBuffer(buffOut, 0, (domainSize+6)*sG1, sectionsPTau[2][0].p);
    await fdZKey.write(buffOut);
    await binFileUtils.endWriteSection(fdZKey);
    if (globalThis.gc) {globalThis.gc();}


    await writeHeaders();

    await fdZKey.close();
    await fdR1cs.close();
    await fdPTau.close();

    if (logger) logger.info("Setup Finished");

    return ;

    async function processConstraints(Fr, r1cs, logger) {

        function normalize(linearComb) {
            const ss = Object.keys(linearComb);
            for (let i = 0; i < ss.length; i++) {
                if (linearComb[ss[i]] == 0n) delete linearComb[ss[i]];
            }
        }

        function join(linearComb1, k, linearComb2) {
            const res = {};

            for (let s in linearComb1) {
                if (typeof res[s] == "undefined") {
                    res[s] = Fr.mul(k, linearComb1[s]);
                } else {
                    res[s] = Fr.add(res[s], Fr.mul(k, linearComb1[s]));
                }
            }

            for (let s in linearComb2) {
                if (typeof res[s] == "undefined") {
                    res[s] = linearComb2[s];
                } else {
                    res[s] = Fr.add(res[s], linearComb2[s]);
                }
            }
            normalize(res);
            return res;
        }

        function reduceCoefs(linearComb, maxC) {
            const res = {
                k: Fr.zero,
                s: [],
                coefs: []
            };
            const cs = [];

            for (let s in linearComb) {
                if (s == 0) {
                    res.k = Fr.add(res.k, linearComb[s]);
                } else if (linearComb[s] != 0n) {
                    cs.push([Number(s), linearComb[s]]);
                }
            }
            while (cs.length > maxC) {
                const c1 = cs.shift();
                const c2 = cs.shift();

                const sl = c1[0];
                const sr = c2[0];
                const so = plonkNVars++;
                const qm = Fr.zero;
                const ql = Fr.neg(c1[1]);
                const qr = Fr.neg(c2[1]);
                const qo = Fr.one;
                const qc = Fr.zero;

                plonkConstraints.push([sl, sr, so, qm, ql, qr, qo, qc]);

                plonkAdditions.push([sl, sr, c1[1], c2[1]]);

                cs.push([so, Fr.one]);
            }
            for (let i = 0; i < cs.length; i++) {
                res.s[i] = cs[i][0];
                res.coefs[i] = cs[i][1];
            }
            while (res.coefs.length < maxC) {
                res.s.push(0);
                res.coefs.push(Fr.zero);
            }
            return res;
        }

        function addConstraintSum(lc) {
            const C = reduceCoefs(lc, 3);
            const sl = C.s[0];
            const sr = C.s[1];
            const so = C.s[2];
            const qm = Fr.zero;
            const ql = C.coefs[0];
            const qr = C.coefs[1];
            const qo = C.coefs[2];
            const qc = C.k;
            plonkConstraints.push([sl, sr, so, qm, ql, qr, qo, qc]);
        }

        function addConstraintMul(lcA, lcB, lcC) {
            const A = reduceCoefs(lcA, 1);
            const B = reduceCoefs(lcB, 1);
            const C = reduceCoefs(lcC, 1);


            const sl = A.s[0];
            const sr = B.s[0];
            const so = C.s[0];
            const qm = Fr.mul(A.coefs[0], B.coefs[0]);
            const ql = Fr.mul(A.coefs[0], B.k);
            const qr = Fr.mul(A.k, B.coefs[0]);
            const qo = Fr.neg(C.coefs[0]);
            const qc = Fr.sub(Fr.mul(A.k, B.k), C.k);
            plonkConstraints.push([sl, sr, so, qm, ql, qr, qo, qc]);
        }

        function getLinearCombinationType(lc) {
            let k = Fr.zero;
            let n = 0;
            const ss = Object.keys(lc);
            for (let i = 0; i < ss.length; i++) {
                if (lc[ss[i]] == 0n) {
                    delete lc[ss[i]];
                } else if (ss[i] == 0) {
                    k = Fr.add(k, lc[ss[i]]);
                } else {
                    n++;
                }
            }
            if (n > 0) return n.toString();
            if (k != Fr.zero) return "k";
            return "0";
        }

        function process(lcA, lcB, lcC) {
            const lctA = getLinearCombinationType(lcA);
            const lctB = getLinearCombinationType(lcB);
            if ((lctA === "0") || (lctB === "0")) {
                normalize(lcC);
                addConstraintSum(lcC);
            } else if (lctA === "k") {
                const lcCC = join(lcB, lcA[0], lcC);
                addConstraintSum(lcCC);
            } else if (lctB === "k") {
                const lcCC = join(lcA, lcB[0], lcC);
                addConstraintSum(lcCC);
            } else {
                addConstraintMul(lcA, lcB, lcC);
            }
        }

        for (let s = 1; s <= nPublic; s++) {
            const sl = s;
            const sr = 0;
            const so = 0;
            const qm = Fr.zero;
            const ql = Fr.one;
            const qr = Fr.zero;
            const qo = Fr.zero;
            const qc = Fr.zero;

            plonkConstraints.push([sl, sr, so, qm, ql, qr, qo, qc]);
        }

        for (let c = 0; c < r1cs.constraints.length; c++) {
            if ((logger) && (c % 10000 === 0)) logger.debug(`processing constraints: ${c}/${r1cs.nConstraints}`);
            process(...r1cs.constraints[c]);
        }
    }

    async function writeWitnessMap(sectionNum, posConstraint, name) {
        await binFileUtils.startWriteSection(fdZKey, sectionNum);
        for (let i=0; i<plonkConstraints.length; i++) {
            await fdZKey.writeULE32(plonkConstraints[i][posConstraint]);
            if ((logger)&&(i%1000000 == 0)) logger.debug(`writing ${name}: ${i}/${plonkConstraints.length}`);
        }
        await binFileUtils.endWriteSection(fdZKey);
    }

    async function writeQMap(sectionNum, posConstraint, name) {
        let Q = new ffjavascript.BigBuffer(domainSize*n8r);
        for (let i=0; i<plonkConstraints.length; i++) {
            Q.set(plonkConstraints[i][posConstraint], i*n8r);
            if ((logger)&&(i%1000000 == 0)) logger.debug(`writing ${name}: ${i}/${plonkConstraints.length}`);
        }
        await binFileUtils.startWriteSection(fdZKey, sectionNum);
        await writeP4(Q);
        await binFileUtils.endWriteSection(fdZKey);
        Q = await Fr.batchFromMontgomery(Q);
        vk[name]= await curve.G1.multiExpAffine(LPoints, Q, logger, "multiexp "+name);
    }

    async function writeP4(buff) {
        const q = await Fr.ifft(buff);
        const q4 = new ffjavascript.BigBuffer(domainSize*n8r*4);
        q4.set(q, 0);
        const Q4 = await Fr.fft(q4);
        await fdZKey.write(q);
        await fdZKey.write(Q4);
    }

    async function writeAdditions(sectionNum, name) {
        await binFileUtils.startWriteSection(fdZKey, sectionNum);
        const buffOut = new Uint8Array((2*4+2*n8r));
        const buffOutV = new DataView(buffOut.buffer);
        for (let i=0; i<plonkAdditions.length; i++) {
            const addition=plonkAdditions[i];
            let o=0;
            buffOutV.setUint32(o, addition[0], true); o+=4;
            buffOutV.setUint32(o, addition[1], true); o+=4;
            // The value is storen in  Montgomery. stored = v*R
            // so when montgomery multiplicated by the witness  it result = v*R*w/R = v*w 
            buffOut.set(addition[2], o); o+= n8r;
            buffOut.set(addition[3], o); o+= n8r;
            await fdZKey.write(buffOut);
            if ((logger)&&(i%1000000 == 0)) logger.debug(`writing ${name}: ${i}/${plonkAdditions.length}`);
        }
        await binFileUtils.endWriteSection(fdZKey);
    }

    async function writeSigma(sectionNum, name) {
        const sigma = new ffjavascript.BigBuffer(n8r*domainSize*3);
        const lastAparence =  new BigArray(plonkNVars);
        const firstPos = new BigArray(plonkNVars);
        let w = Fr.one;
        for (let i=0; i<domainSize;i++) {
            if (i<plonkConstraints.length) {
                buildSigma(plonkConstraints[i][0], i);
                buildSigma(plonkConstraints[i][1], domainSize + i);
                buildSigma(plonkConstraints[i][2], domainSize*2 + i);
            } else {
                buildSigma(0, i);
                buildSigma(0, domainSize + i);
                buildSigma(0, domainSize*2 + i);
            }
            w = Fr.mul(w, Fr.w[cirPower]);
            if ((logger)&&(i%1000000 == 0)) logger.debug(`writing ${name} phase1: ${i}/${plonkConstraints.length}`);
        }
        for (let s=0; s<plonkNVars; s++) {
            if (typeof firstPos[s] !== "undefined") {
                sigma.set(lastAparence[s], firstPos[s]*n8r);
            } else {
                // throw new Error("Variable not used");
                console.log("Variable not used");
            }
            if ((logger)&&(s%1000000 == 0)) logger.debug(`writing ${name} phase2: ${s}/${plonkNVars}`);
        }

        if (globalThis.gc) {globalThis.gc();}
        await binFileUtils.startWriteSection(fdZKey, sectionNum);
        let S1 = sigma.slice(0, domainSize*n8r);
        await writeP4(S1);
        if (globalThis.gc) {globalThis.gc();}
        let S2 = sigma.slice(domainSize*n8r, domainSize*n8r*2);
        await writeP4(S2);
        if (globalThis.gc) {globalThis.gc();}
        let S3 = sigma.slice(domainSize*n8r*2, domainSize*n8r*3);
        await writeP4(S3);
        if (globalThis.gc) {globalThis.gc();}
        await binFileUtils.endWriteSection(fdZKey);

        S1 = await Fr.batchFromMontgomery(S1);
        S2 = await Fr.batchFromMontgomery(S2);
        S3 = await Fr.batchFromMontgomery(S3);

        vk.S1= await curve.G1.multiExpAffine(LPoints, S1, logger, "multiexp S1");
        if (globalThis.gc) {globalThis.gc();}
        vk.S2= await curve.G1.multiExpAffine(LPoints, S2, logger, "multiexp S2");
        if (globalThis.gc) {globalThis.gc();}
        vk.S3= await curve.G1.multiExpAffine(LPoints, S3, logger, "multiexp S3");
        if (globalThis.gc) {globalThis.gc();}

        function buildSigma(s, p) {
            if (typeof lastAparence[s] === "undefined") {
                firstPos[s] = p;
            } else {
                sigma.set(lastAparence[s], p*n8r);
            }
            let v;
            if (p<domainSize) {
                v = w;
            } else if (p<2*domainSize) {
                v = Fr.mul(w, k1);
            } else {
                v = Fr.mul(w, k2);
            }
            lastAparence[s]=v;
        }
    }

    async function writeLs(sectionNum, name) {
        await binFileUtils.startWriteSection(fdZKey, sectionNum);
        const l=Math.max(nPublic, 1);
        for (let i=0; i<l; i++) {
            let buff = new ffjavascript.BigBuffer(domainSize*n8r);
            buff.set(Fr.one, i*n8r);
            await writeP4(buff);
            if (logger) logger.debug(`writing ${name} ${i}/${l}`);
        }
        await binFileUtils.endWriteSection(fdZKey);
    }

    async function writeHeaders() {

        // Write the header
        ///////////
        await binFileUtils.startWriteSection(fdZKey, 1);
        await fdZKey.writeULE32(2); // Plonk
        await binFileUtils.endWriteSection(fdZKey);

        // Write the Plonk header section
        ///////////

        await binFileUtils.startWriteSection(fdZKey, 2);
        const primeQ = curve.q;
        const n8q = (Math.floor( (ffjavascript.Scalar.bitLength(primeQ) - 1) / 64) +1)*8;

        const primeR = curve.r;
        const n8r = (Math.floor( (ffjavascript.Scalar.bitLength(primeR) - 1) / 64) +1)*8;

        await fdZKey.writeULE32(n8q);
        await binFileUtils.writeBigInt(fdZKey, primeQ, n8q);
        await fdZKey.writeULE32(n8r);
        await binFileUtils.writeBigInt(fdZKey, primeR, n8r);
        await fdZKey.writeULE32(plonkNVars);                         // Total number of bars
        await fdZKey.writeULE32(nPublic);                       // Total number of public vars (not including ONE)
        await fdZKey.writeULE32(domainSize);                  // domainSize
        await fdZKey.writeULE32(plonkAdditions.length);                  // domainSize
        await fdZKey.writeULE32(plonkConstraints.length); 

        await fdZKey.write(k1);
        await fdZKey.write(k2);

        await fdZKey.write(G1.toAffine(vk.Qm));
        await fdZKey.write(G1.toAffine(vk.Ql));
        await fdZKey.write(G1.toAffine(vk.Qr));
        await fdZKey.write(G1.toAffine(vk.Qo));
        await fdZKey.write(G1.toAffine(vk.Qc));

        await fdZKey.write(G1.toAffine(vk.S1));
        await fdZKey.write(G1.toAffine(vk.S2));
        await fdZKey.write(G1.toAffine(vk.S3));

        let bX_2;
        bX_2 = await fdPTau.read(sG2, sectionsPTau[3][0].p + sG2);
        await fdZKey.write(bX_2);

        await binFileUtils.endWriteSection(fdZKey);
    }

    function getK1K2() {
        let k1 = Fr.two;
        while (isIncluded(k1, [], cirPower)) Fr.add(k1, Fr.one);
        let k2 = Fr.add(k1, Fr.one);
        while (isIncluded(k2, [k1], cirPower)) Fr.add(k2, Fr.one);
        return [k1, k2];


        function isIncluded(k, kArr, pow) {
            const domainSize= 2**pow;
            let w = Fr.one;
            for (let i=0; i<domainSize; i++) {
                if (Fr.eq(k, w)) return true;
                for (let j=0; j<kArr.length; j++) {
                    if (Fr.eq(k, Fr.mul(kArr[j], w))) return true;
                }
                w = Fr.mul(w, Fr.w[pow]);
            }
            return false;
        }
    }
}

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
const {stringifyBigInts} = ffjavascript.utils;
const { keccak256: keccak256$1 } = jsSha3__default["default"];

async function plonk16Prove(zkeyFileName, witnessFileName, logger) {
    const {fd: fdWtns, sections: sectionsWtns} = await binFileUtils__namespace.readBinFile(witnessFileName, "wtns", 2, 1<<25, 1<<23);

    const wtns = await readHeader(fdWtns, sectionsWtns);

    const {fd: fdZKey, sections: sectionsZKey} = await binFileUtils__namespace.readBinFile(zkeyFileName, "zkey", 2, 1<<25, 1<<23);

    const zkey = await readHeader$1(fdZKey, sectionsZKey);
    if (zkey.protocol != "plonk") {
        throw new Error("zkey file is not plonk");
    }

    if (!ffjavascript.Scalar.eq(zkey.r,  wtns.q)) {
        throw new Error("Curve of the witness does not match the curve of the proving key");
    }

    if (wtns.nWitness != zkey.nVars -zkey.nAdditions) {
        throw new Error(`Invalid witness length. Circuit: ${zkey.nVars}, witness: ${wtns.nWitness}, ${zkey.nAdditions}`);
    }

    const curve = zkey.curve;
    const Fr = curve.Fr;
    const G1 = curve.G1;
    const n8r = curve.Fr.n8;

    if (logger) logger.debug("Reading Wtns");
    const buffWitness = await binFileUtils__namespace.readSection(fdWtns, sectionsWtns, 2);
    // First element in plonk is not used and can be any value. (But always the same).
    // We set it to zero to go faster in the exponentiations.
    buffWitness.set(Fr.zero, 0);
    const buffInternalWitness = new ffjavascript.BigBuffer(n8r*zkey.nAdditions);

    await calculateAdditions();

    let A,B,C,Z;
    let A4, B4, C4, Z4;
    let pol_a,pol_b,pol_c, pol_z, pol_t, pol_r;
    let proof = {};

    const sigmaBuff = new ffjavascript.BigBuffer(zkey.domainSize*n8r*4*3);
    let o = sectionsZKey[12][0].p + zkey.domainSize*n8r;
    await fdZKey.readToBuffer(sigmaBuff, 0 , zkey.domainSize*n8r*4, o);
    o += zkey.domainSize*n8r*5;
    await fdZKey.readToBuffer(sigmaBuff, zkey.domainSize*n8r*4 , zkey.domainSize*n8r*4, o);
    o += zkey.domainSize*n8r*5;
    await fdZKey.readToBuffer(sigmaBuff, zkey.domainSize*n8r*8 , zkey.domainSize*n8r*4, o);

    const pol_s1 = new ffjavascript.BigBuffer(zkey.domainSize*n8r);
    await fdZKey.readToBuffer(pol_s1, 0 , zkey.domainSize*n8r, sectionsZKey[12][0].p);

    const pol_s2 = new ffjavascript.BigBuffer(zkey.domainSize*n8r);
    await fdZKey.readToBuffer(pol_s2, 0 , zkey.domainSize*n8r, sectionsZKey[12][0].p + 5*zkey.domainSize*n8r);

    const PTau = await binFileUtils__namespace.readSection(fdZKey, sectionsZKey, 14);


    const ch = {};

    await round1();
    await round2();
    await round3();
    await round4();
    await round5();


    ///////////////////////
    // Final adjustments //
    ///////////////////////

    proof.protocol = "plonk";
    proof.curve = curve.name;

    await fdZKey.close();
    await fdWtns.close();

    let publicSignals = [];

    for (let i=1; i<= zkey.nPublic; i++) {
        const pub = buffWitness.slice(i*Fr.n8, i*Fr.n8+Fr.n8);
        publicSignals.push(ffjavascript.Scalar.fromRprLE(pub));
    }

    proof.A = G1.toObject(proof.A);
    proof.B = G1.toObject(proof.B);
    proof.C = G1.toObject(proof.C);
    proof.Z = G1.toObject(proof.Z);

    proof.T1 = G1.toObject(proof.T1);
    proof.T2 = G1.toObject(proof.T2);
    proof.T3 = G1.toObject(proof.T3);

    proof.eval_a = Fr.toObject(proof.eval_a);
    proof.eval_b = Fr.toObject(proof.eval_b);
    proof.eval_c = Fr.toObject(proof.eval_c);
    proof.eval_s1 = Fr.toObject(proof.eval_s1);
    proof.eval_s2 = Fr.toObject(proof.eval_s2);
    proof.eval_zw = Fr.toObject(proof.eval_zw);
    proof.eval_t = Fr.toObject(proof.eval_t);
    proof.eval_r = Fr.toObject(proof.eval_r);

    proof.Wxi = G1.toObject(proof.Wxi);
    proof.Wxiw = G1.toObject(proof.Wxiw);

    delete proof.eval_t;

    proof = stringifyBigInts(proof);
    publicSignals = stringifyBigInts(publicSignals);

    return {proof, publicSignals};

    async function calculateAdditions() {
        const additionsBuff = await binFileUtils__namespace.readSection(fdZKey, sectionsZKey, 3);

        const sSum = 8+curve.Fr.n8*2;

        for (let i=0; i<zkey.nAdditions; i++) {
            const ai= readUInt32(additionsBuff, i*sSum);
            const bi= readUInt32(additionsBuff, i*sSum+4);
            const ac= additionsBuff.slice(i*sSum+8, i*sSum+8+n8r);
            const bc= additionsBuff.slice(i*sSum+8+n8r, i*sSum+8+n8r*2);
            const aw= getWitness(ai);
            const bw= getWitness(bi);

            const r = curve.Fr.add(
                curve.Fr.mul(ac, aw),
                curve.Fr.mul(bc, bw)
            );
            buffInternalWitness.set(r, n8r*i);
        }

    }

    async function buildABC() {
        let A = new ffjavascript.BigBuffer(zkey.domainSize * n8r);
        let B = new ffjavascript.BigBuffer(zkey.domainSize * n8r);
        let C = new ffjavascript.BigBuffer(zkey.domainSize * n8r);

        const aMap = await binFileUtils__namespace.readSection(fdZKey, sectionsZKey, 4);
        const bMap = await binFileUtils__namespace.readSection(fdZKey, sectionsZKey, 5);
        const cMap = await binFileUtils__namespace.readSection(fdZKey, sectionsZKey, 6);

        for (let i=0; i<zkey.nConstrains; i++) {
            const iA = readUInt32(aMap, i*4);
            A.set(getWitness(iA), i*n8r);
            const iB = readUInt32(bMap, i*4);
            B.set(getWitness(iB), i*n8r);
            const iC = readUInt32(cMap, i*4);
            C.set(getWitness(iC), i*n8r);
        }

        A = await Fr.batchToMontgomery(A);
        B = await Fr.batchToMontgomery(B);
        C = await Fr.batchToMontgomery(C);

        return [A,B,C];
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
        ch.b = [];
        for (let i=1; i<=11; i++) {
            ch.b[i] = curve.Fr.random();
        }
    
        [A, B, C] = await buildABC();

        [pol_a, A4] = await to4T(A, [ch.b[2], ch.b[1]]);
        [pol_b, B4] = await to4T(B, [ch.b[4], ch.b[3]]);
        [pol_c, C4] = await to4T(C, [ch.b[6], ch.b[5]]);

                
        proof.A = await expTau(pol_a, "multiexp A");
        proof.B = await expTau(pol_b, "multiexp B");
        proof.C = await expTau(pol_c, "multiexp C");
    }

    async function round2() {

        const transcript1 = new Uint8Array(zkey.nPublic*n8r + G1.F.n8*2*3);
        for (let i=0; i<zkey.nPublic; i++) {
            Fr.toRprBE(transcript1, i*n8r, A.slice((i)*n8r, (i+1)*n8r));
        }
        G1.toRprUncompressed(transcript1, zkey.nPublic*n8r + 0, proof.A);
        G1.toRprUncompressed(transcript1, zkey.nPublic*n8r + G1.F.n8*2, proof.B);
        G1.toRprUncompressed(transcript1, zkey.nPublic*n8r + G1.F.n8*4, proof.C);

        ch.beta = hashToFr(transcript1);
        if (logger) logger.debug("beta: " + Fr.toString(ch.beta));
    
        const transcript2 = new Uint8Array(n8r);
        Fr.toRprBE(transcript2, 0, ch.beta);
        ch.gamma = hashToFr(transcript2);
        if (logger) logger.debug("gamma: " + Fr.toString(ch.gamma));
    
        let numArr = new ffjavascript.BigBuffer(Fr.n8*zkey.domainSize);
        let denArr = new ffjavascript.BigBuffer(Fr.n8*zkey.domainSize);

        numArr.set(Fr.one, 0);
        denArr.set(Fr.one, 0);

        let w = Fr.one;
        for (let i=0; i<zkey.domainSize; i++) {
            let n1 = A.slice(i*n8r, (i+1)*n8r);
            n1 = Fr.add( n1, Fr.mul(ch.beta, w) );
            n1 = Fr.add( n1, ch.gamma );

            let n2 = B.slice(i*n8r, (i+1)*n8r);
            n2 = Fr.add( n2, Fr.mul(zkey.k1, Fr.mul(ch.beta, w) ));
            n2 = Fr.add( n2, ch.gamma );

            let n3 = C.slice(i*n8r, (i+1)*n8r);
            n3 = Fr.add( n3, Fr.mul(zkey.k2, Fr.mul(ch.beta, w) ));
            n3 = Fr.add( n3, ch.gamma );

            const num = Fr.mul(n1, Fr.mul(n2, n3));

            let d1 = A.slice(i*n8r, (i+1)*n8r);
            d1 = Fr.add(d1, Fr.mul( sigmaBuff.slice(i*n8r*4, i*n8r*4 + n8r) , ch.beta));
            d1 = Fr.add(d1, ch.gamma);

            let d2 = B.slice(i*n8r, (i+1)*n8r);
            d2 = Fr.add(d2, Fr.mul( sigmaBuff.slice((zkey.domainSize + i)*4*n8r, (zkey.domainSize + i)*4*n8r+n8r) , ch.beta));
            d2 = Fr.add(d2, ch.gamma);

            let d3 = C.slice(i*n8r, (i+1)*n8r);
            d3 = Fr.add(d3, Fr.mul( sigmaBuff.slice((zkey.domainSize*2 + i)*4*n8r, (zkey.domainSize*2 + i)*4*n8r + n8r) , ch.beta));
            d3 = Fr.add(d3, ch.gamma);

            const den = Fr.mul(d1, Fr.mul(d2, d3));

            numArr.set(  
                Fr.mul( 
                    numArr.slice(i*n8r,(i+1)*n8r) , 
                    num
                ),
                ((i+1)%zkey.domainSize)*n8r
            );

            denArr.set(  
                Fr.mul( 
                    denArr.slice(i*n8r,(i+1)*n8r) , 
                    den
                ),
                ((i+1)%zkey.domainSize)*n8r
            );

            w = Fr.mul(w, Fr.w[zkey.power]);
        }

        denArr = await Fr.batchInverse(denArr);

        // TODO: Do it in assembly and in parallel
        for (let i=0; i<zkey.domainSize; i++) {
            numArr.set(   Fr.mul( numArr.slice(i*n8r, (i+1)*n8r), denArr.slice(i*n8r, (i+1)*n8r) )      ,i*n8r);
        }

        if (!Fr.eq(numArr.slice(0, n8r), Fr.one)) {
            throw new Error("Copy constraints does not match");
        }

        Z = numArr;

        [pol_z, Z4] = await to4T(Z, [ch.b[9], ch.b[8], ch.b[7]]);

        proof.Z = await expTau( pol_z, "multiexp Z");
    }

    async function round3() {

        /*
        async function checkDegree(P) {
            const p = await curve.Fr.ifft(P);
            let deg = (P.byteLength/n8r)-1;
            while ((deg>0)&&(Fr.isZero(p.slice(deg*n8r, deg*n8r+n8r)))) deg--;
            return deg;
        }

        function printPol(P) {
            const n=(P.byteLength/n8r);
            console.log("[");
            for (let i=0; i<n; i++) {
                console.log(Fr.toString(P.slice(i*n8r, i*n8r+n8r)));
            }
            console.log("]");
        }
        */

        if (logger) logger.debug("phse3: Reading QM4");    
        const QM4 = new ffjavascript.BigBuffer(zkey.domainSize*4*n8r);
        await fdZKey.readToBuffer(QM4, 0 , zkey.domainSize*n8r*4, sectionsZKey[7][0].p + zkey.domainSize*n8r);

        if (logger) logger.debug("phse3: Reading QL4");    
        const QL4 = new ffjavascript.BigBuffer(zkey.domainSize*4*n8r);
        await fdZKey.readToBuffer(QL4, 0 , zkey.domainSize*n8r*4, sectionsZKey[8][0].p + zkey.domainSize*n8r);

        if (logger) logger.debug("phse3: Reading QR4");    
        const QR4 = new ffjavascript.BigBuffer(zkey.domainSize*4*n8r);
        await fdZKey.readToBuffer(QR4, 0 , zkey.domainSize*n8r*4, sectionsZKey[9][0].p + zkey.domainSize*n8r);

        if (logger) logger.debug("phse3: Reading QO4");    
        const QO4 = new ffjavascript.BigBuffer(zkey.domainSize*4*n8r);
        await fdZKey.readToBuffer(QO4, 0 , zkey.domainSize*n8r*4, sectionsZKey[10][0].p + zkey.domainSize*n8r);

        if (logger) logger.debug("phse3: Reading QC4");    
        const QC4 = new ffjavascript.BigBuffer(zkey.domainSize*4*n8r);
        await fdZKey.readToBuffer(QC4, 0 , zkey.domainSize*n8r*4, sectionsZKey[11][0].p + zkey.domainSize*n8r);

        const lPols = await binFileUtils__namespace.readSection(fdZKey, sectionsZKey, 13);

        const transcript3 = new Uint8Array(G1.F.n8*2);
        G1.toRprUncompressed(transcript3, 0, proof.Z);

        ch.alpha = hashToFr(transcript3);

        if (logger) logger.debug("alpha: " + Fr.toString(ch.alpha));    


        const Z1 = [
            Fr.zero,
            Fr.add(Fr.e(-1), Fr.w[2]),
            Fr.e(-2),
            Fr.sub(Fr.e(-1), Fr.w[2]),
        ];

        const Z2 = [
            Fr.zero,
            Fr.add(Fr.zero, Fr.mul(Fr.e(-2), Fr.w[2])),
            Fr.e(4),
            Fr.sub(Fr.zero, Fr.mul(Fr.e(-2), Fr.w[2])),
        ];

        const Z3 = [
            Fr.zero,
            Fr.add(Fr.e(2), Fr.mul(Fr.e(2), Fr.w[2])),
            Fr.e(-8),
            Fr.sub(Fr.e(2), Fr.mul(Fr.e(2), Fr.w[2])),
        ];

        const T = new ffjavascript.BigBuffer(zkey.domainSize*4*n8r);
        const Tz = new ffjavascript.BigBuffer(zkey.domainSize*4*n8r);

        let w = Fr.one;
        for (let i=0; i<zkey.domainSize*4; i++) {
            if ((i%4096 == 0)&&(logger)) logger.debug(`calculating t ${i}/${zkey.domainSize*4}`);

            const a = A4.slice(i*n8r, i*n8r+n8r);
            const b = B4.slice(i*n8r, i*n8r+n8r);
            const c = C4.slice(i*n8r, i*n8r+n8r);
            const z = Z4.slice(i*n8r, i*n8r+n8r);
            const zw = Z4.slice(((i+zkey.domainSize*4+4)%(zkey.domainSize*4)) *n8r, ((i+zkey.domainSize*4+4)%(zkey.domainSize*4)) *n8r +n8r);
            const qm = QM4.slice(i*n8r, i*n8r+n8r);
            const ql = QL4.slice(i*n8r, i*n8r+n8r);
            const qr = QR4.slice(i*n8r, i*n8r+n8r);
            const qo = QO4.slice(i*n8r, i*n8r+n8r);
            const qc = QC4.slice(i*n8r, i*n8r+n8r);
            const s1 = sigmaBuff.slice(i*n8r, i*n8r+n8r);
            const s2 = sigmaBuff.slice((i+zkey.domainSize*4)*n8r, (i+zkey.domainSize*4)*n8r+n8r);
            const s3 = sigmaBuff.slice((i+zkey.domainSize*8)*n8r, (i+zkey.domainSize*8)*n8r+n8r);
            const ap = Fr.add(ch.b[2], Fr.mul(ch.b[1], w));
            const bp = Fr.add(ch.b[4], Fr.mul(ch.b[3], w));
            const cp = Fr.add(ch.b[6], Fr.mul(ch.b[5], w));
            const w2 = Fr.square(w);
            const zp = Fr.add(Fr.add(Fr.mul(ch.b[7], w2), Fr.mul(ch.b[8], w)), ch.b[9]);
            const wW = Fr.mul(w, Fr.w[zkey.power]);
            const wW2 = Fr.square(wW);
            const zWp = Fr.add(Fr.add(Fr.mul(ch.b[7], wW2), Fr.mul(ch.b[8], wW)), ch.b[9]);

            let pl = Fr.zero;
            for (let j=0; j<zkey.nPublic; j++) {
                pl = Fr.sub(pl, Fr.mul( 
                    lPols.slice( (j*5*zkey.domainSize+ zkey.domainSize+ i)*n8r, (j*5*zkey.domainSize+ zkey.domainSize + i+1)*n8r),
                    A.slice(j*n8r, (j+1)*n8r)
                ));
            }

            let [e1, e1z] = mul2(a, b, ap, bp, i%4);
            e1 = Fr.mul(e1, qm);
            e1z = Fr.mul(e1z, qm);

            e1 = Fr.add(e1, Fr.mul(a, ql));
            e1z = Fr.add(e1z, Fr.mul(ap, ql));

            e1 = Fr.add(e1, Fr.mul(b, qr));
            e1z = Fr.add(e1z, Fr.mul(bp, qr));

            e1 = Fr.add(e1, Fr.mul(c, qo));
            e1z = Fr.add(e1z, Fr.mul(cp, qo));

            e1 = Fr.add(e1, pl);
            e1 = Fr.add(e1, qc);

            const betaw = Fr.mul(ch.beta, w);
            let e2a =a;
            e2a = Fr.add(e2a, betaw);
            e2a = Fr.add(e2a, ch.gamma);

            let e2b =b;
            e2b = Fr.add(e2b, Fr.mul(betaw, zkey.k1));
            e2b = Fr.add(e2b, ch.gamma);

            let e2c =c;
            e2c = Fr.add(e2c, Fr.mul(betaw, zkey.k2));
            e2c = Fr.add(e2c, ch.gamma);

            let e2d = z;

            let [e2, e2z] = mul4(e2a, e2b, e2c, e2d, ap, bp, cp, zp, i%4);
            e2 = Fr.mul(e2, ch.alpha);
            e2z = Fr.mul(e2z, ch.alpha);

            let e3a = a;
            e3a = Fr.add(e3a, Fr.mul(ch.beta, s1));
            e3a = Fr.add(e3a, ch.gamma);

            let e3b = b;
            e3b = Fr.add(e3b, Fr.mul(ch.beta,s2));
            e3b = Fr.add(e3b, ch.gamma);

            let e3c = c;
            e3c = Fr.add(e3c, Fr.mul(ch.beta,s3));
            e3c = Fr.add(e3c, ch.gamma);

            let e3d = zw;
            let [e3, e3z] = mul4(e3a, e3b, e3c, e3d, ap, bp, cp, zWp, i%4);

            e3 = Fr.mul(e3, ch.alpha);
            e3z = Fr.mul(e3z, ch.alpha);

            let e4 = Fr.sub(z, Fr.one);
            e4 = Fr.mul(e4, lPols.slice( (zkey.domainSize + i)*n8r, (zkey.domainSize+i+1)*n8r));
            e4 = Fr.mul(e4, Fr.mul(ch.alpha, ch.alpha));

            let e4z = Fr.mul(zp, lPols.slice( (zkey.domainSize + i)*n8r, (zkey.domainSize+i+1)*n8r));
            e4z = Fr.mul(e4z, Fr.mul(ch.alpha, ch.alpha));

            let e = Fr.add(Fr.sub(Fr.add(e1, e2), e3), e4);
            let ez = Fr.add(Fr.sub(Fr.add(e1z, e2z), e3z), e4z);

            T.set(e, i*n8r);
            Tz.set(ez, i*n8r);

            w = Fr.mul(w, Fr.w[zkey.power+2]);
        }

        if (logger) logger.debug("ifft T");    
        let t = await Fr.ifft(T);

        if (logger) logger.debug("dividing T/Z");    
        for (let i=0; i<zkey.domainSize; i++) {
            t.set(Fr.neg(t.slice(i*n8r, i*n8r+n8r)), i*n8r);
        }

        for (let i=zkey.domainSize; i<zkey.domainSize*4; i++) {
            const a = Fr.sub(
                t.slice((i-zkey.domainSize)*n8r, (i-zkey.domainSize)*n8r + n8r),
                t.slice(i*n8r, i*n8r+n8r)
            );
            t.set(a, i*n8r);
            if (i > (zkey.domainSize*3 -4) ) {
                if (!Fr.isZero(a)) {
                    throw new Error("T Polynomial is not divisible");
                }
            }
        }

        if (logger) logger.debug("ifft Tz");    
        const tz = await Fr.ifft(Tz);
        for (let i=0; i<zkey.domainSize*4; i++) {
            const a = tz.slice(i*n8r, (i+1)*n8r);
            if (i > (zkey.domainSize*3 +5) ) {
                if (!Fr.isZero(a)) {
                    throw new Error("Tz Polynomial is not well calculated");
                }
            } else {
                t.set(  
                    Fr.add(
                        t.slice(i*n8r, (i+1)*n8r),
                        a
                    ),
                    i*n8r
                );
            }
        }

        pol_t = t.slice(0, (zkey.domainSize * 3 + 6) * n8r);

        // t(x) has degree 3n + 5, we are going to split t(x) into three smaller polynomials:
        // t'_low and t'_mid  with a degree < n and t'_high with a degree n+5
        // such that t(x) = t'_low(X) + X^n t'_mid(X) + X^{2n} t'_hi(X)
        // To randomize the parts we use blinding scalars b_10 and b_11 in a way that doesn't change t(X):
        // t_low(X) = t'_low(X) + b_10 X^n
        // t_mid(X) = t'_mid(X) - b_10 + b_11 X^n
        // t_high(X) = t'_high(X) - b_11
        // such that
        // t(X) = t_low(X) + X^n t_mid(X) + X^2n t_high(X)

        // compute t_low(X)
        let polTLow = new ffjavascript.BigBuffer((zkey.domainSize + 1) * n8r);
        polTLow.set(t.slice(0, zkey.domainSize * n8r), 0);
        // Add blinding scalar b_10 as a new coefficient n
        polTLow.set(ch.b[10], zkey.domainSize * n8r);

        // compute t_mid(X)
        let polTMid = new ffjavascript.BigBuffer((zkey.domainSize + 1) * n8r);
        polTMid.set(t.slice(zkey.domainSize * n8r, zkey.domainSize * 2 * n8r), 0);
        // Subtract blinding scalar b_10 to the lowest coefficient of t_mid
        const lowestMid = Fr.sub(polTMid.slice(0, n8r), ch.b[10]);
        polTMid.set(lowestMid, 0);
        // Add blinding scalar b_11 as a new coefficient n
        polTMid.set(ch.b[11], zkey.domainSize * n8r);

        // compute t_high(X)
        let polTHigh = new ffjavascript.BigBuffer((zkey.domainSize + 6) * n8r);
        polTHigh.set(t.slice(zkey.domainSize * 2 * n8r, (zkey.domainSize * 3 + 6) * n8r), 0);
        //Subtract blinding scalar b_11 to the lowest coefficient of t_high
        const lowestHigh = Fr.sub(polTHigh.slice(0, n8r), ch.b[11]);
        polTHigh.set(lowestHigh, 0);

        proof.T1 = await expTau(polTLow, "multiexp T1");
        proof.T2 = await expTau(polTMid, "multiexp T2");
        proof.T3 = await expTau(polTHigh, "multiexp T3");

        function mul2(a,b, ap, bp,  p) {
            let r, rz;

            
            const a_b = Fr.mul(a,b);
            const a_bp = Fr.mul(a,bp);
            const ap_b = Fr.mul(ap,b);
            const ap_bp = Fr.mul(ap,bp);

            r = a_b;

            let a0 = Fr.add(a_bp, ap_b);

            let a1 = ap_bp;

            rz = a0;
            if (p) {
                rz = Fr.add(rz, Fr.mul(Z1[p], a1));
            }

            return [r, rz];
        }

        function mul4(a,b,c,d, ap, bp, cp, dp, p) {
            let r, rz;

            
            const a_b = Fr.mul(a,b);
            const a_bp = Fr.mul(a,bp);
            const ap_b = Fr.mul(ap,b);
            const ap_bp = Fr.mul(ap,bp);

            const c_d = Fr.mul(c,d);
            const c_dp = Fr.mul(c,dp);
            const cp_d = Fr.mul(cp,d);
            const cp_dp = Fr.mul(cp,dp);

            r = Fr.mul(a_b, c_d);

            let a0 = Fr.mul(ap_b, c_d);
            a0 = Fr.add(a0, Fr.mul(a_bp, c_d));
            a0 = Fr.add(a0, Fr.mul(a_b, cp_d));
            a0 = Fr.add(a0, Fr.mul(a_b, c_dp));

            let a1 = Fr.mul(ap_bp, c_d);
            a1 = Fr.add(a1, Fr.mul(ap_b, cp_d));
            a1 = Fr.add(a1, Fr.mul(ap_b, c_dp));
            a1 = Fr.add(a1, Fr.mul(a_bp, cp_d));
            a1 = Fr.add(a1, Fr.mul(a_bp, c_dp));
            a1 = Fr.add(a1, Fr.mul(a_b, cp_dp));

            let a2 = Fr.mul(a_bp, cp_dp);
            a2 = Fr.add(a2, Fr.mul(ap_b, cp_dp));
            a2 = Fr.add(a2, Fr.mul(ap_bp, c_dp));
            a2 = Fr.add(a2, Fr.mul(ap_bp, cp_d));

            let a3 = Fr.mul(ap_bp, cp_dp);

            rz = a0;
            if (p) {
                rz = Fr.add(rz, Fr.mul(Z1[p], a1));
                rz = Fr.add(rz, Fr.mul(Z2[p], a2));
                rz = Fr.add(rz, Fr.mul(Z3[p], a3));
            }

            return [r, rz];
        }
    }

    async function round4() {
        const pol_qm = new ffjavascript.BigBuffer(zkey.domainSize*n8r);
        await fdZKey.readToBuffer(pol_qm, 0 , zkey.domainSize*n8r, sectionsZKey[7][0].p);

        const pol_ql = new ffjavascript.BigBuffer(zkey.domainSize*n8r);
        await fdZKey.readToBuffer(pol_ql, 0 , zkey.domainSize*n8r, sectionsZKey[8][0].p);

        const pol_qr = new ffjavascript.BigBuffer(zkey.domainSize*n8r);
        await fdZKey.readToBuffer(pol_qr, 0 , zkey.domainSize*n8r, sectionsZKey[9][0].p);

        const pol_qo = new ffjavascript.BigBuffer(zkey.domainSize*n8r);
        await fdZKey.readToBuffer(pol_qo, 0 , zkey.domainSize*n8r, sectionsZKey[10][0].p);

        const pol_qc = new ffjavascript.BigBuffer(zkey.domainSize*n8r);
        await fdZKey.readToBuffer(pol_qc, 0 , zkey.domainSize*n8r, sectionsZKey[11][0].p);

        const pol_s3 = new ffjavascript.BigBuffer(zkey.domainSize*n8r);
        await fdZKey.readToBuffer(pol_s3, 0 , zkey.domainSize*n8r, sectionsZKey[12][0].p + 10*zkey.domainSize*n8r);

        const transcript4 = new Uint8Array(G1.F.n8*2*3);
        G1.toRprUncompressed(transcript4, 0, proof.T1);
        G1.toRprUncompressed(transcript4, G1.F.n8*2, proof.T2);
        G1.toRprUncompressed(transcript4, G1.F.n8*4, proof.T3);
        ch.xi = hashToFr(transcript4);

        if (logger) logger.debug("xi: " + Fr.toString(ch.xi));    

        proof.eval_a = evalPol(pol_a, ch.xi);
        proof.eval_b = evalPol(pol_b, ch.xi);
        proof.eval_c = evalPol(pol_c, ch.xi);
        proof.eval_s1 = evalPol(pol_s1, ch.xi);
        proof.eval_s2 = evalPol(pol_s2, ch.xi);
        proof.eval_t = evalPol(pol_t, ch.xi);
        proof.eval_zw = evalPol(pol_z, Fr.mul(ch.xi, Fr.w[zkey.power]));

        const coef_ab = Fr.mul(proof.eval_a, proof.eval_b);
        
        let e2a = proof.eval_a;
        const betaxi = Fr.mul(ch.beta, ch.xi);
        e2a = Fr.add( e2a, betaxi);
        e2a = Fr.add( e2a, ch.gamma);

        let e2b = proof.eval_b;
        e2b = Fr.add( e2b, Fr.mul(betaxi, zkey.k1));
        e2b = Fr.add( e2b, ch.gamma);

        let e2c = proof.eval_c;
        e2c = Fr.add( e2c, Fr.mul(betaxi, zkey.k2));
        e2c = Fr.add( e2c, ch.gamma);

        const e2 = Fr.mul(Fr.mul(Fr.mul(e2a, e2b), e2c), ch.alpha);

        let e3a = proof.eval_a;
        e3a = Fr.add( e3a, Fr.mul(ch.beta, proof.eval_s1));
        e3a = Fr.add( e3a, ch.gamma);

        let e3b = proof.eval_b;
        e3b = Fr.add( e3b, Fr.mul(ch.beta, proof.eval_s2));
        e3b = Fr.add( e3b, ch.gamma);

        let e3 = Fr.mul(e3a, e3b);
        e3 = Fr.mul(e3, ch.beta);
        e3 = Fr.mul(e3, proof.eval_zw);
        e3 = Fr.mul(e3, ch.alpha);

        ch.xim= ch.xi;
        for (let i=0; i<zkey.power; i++) ch.xim = Fr.mul(ch.xim, ch.xim);
        const eval_l1 = Fr.div(
            Fr.sub(ch.xim, Fr.one),
            Fr.mul(Fr.sub(ch.xi, Fr.one), Fr.e(zkey.domainSize))
        );

        const e4 = Fr.mul(eval_l1, Fr.mul(ch.alpha, ch.alpha));

        const coefs3 = e3;
        const coefz = Fr.add(e2, e4);

        pol_r = new ffjavascript.BigBuffer((zkey.domainSize+3)*n8r);

        for (let i = 0; i<zkey.domainSize+3; i++) {
            let v = Fr.mul(coefz, pol_z.slice(i*n8r,(i+1)*n8r));
            if (i<zkey.domainSize) {
                v = Fr.add(v, Fr.mul(coef_ab, pol_qm.slice(i*n8r,(i+1)*n8r)));
                v = Fr.add(v, Fr.mul(proof.eval_a, pol_ql.slice(i*n8r,(i+1)*n8r)));
                v = Fr.add(v, Fr.mul(proof.eval_b, pol_qr.slice(i*n8r,(i+1)*n8r)));
                v = Fr.add(v, Fr.mul(proof.eval_c, pol_qo.slice(i*n8r,(i+1)*n8r)));
                v = Fr.add(v, pol_qc.slice(i*n8r,(i+1)*n8r));
                v = Fr.sub(v, Fr.mul(coefs3, pol_s3.slice(i*n8r,(i+1)*n8r)));
            }
            pol_r.set(v, i*n8r);
        }

        proof.eval_r = evalPol(pol_r, ch.xi);
    }

    async function round5() {
        const transcript5 = new Uint8Array(n8r*7);
        Fr.toRprBE(transcript5, 0, proof.eval_a);
        Fr.toRprBE(transcript5, n8r, proof.eval_b);
        Fr.toRprBE(transcript5, n8r*2, proof.eval_c);
        Fr.toRprBE(transcript5, n8r*3, proof.eval_s1);
        Fr.toRprBE(transcript5, n8r*4, proof.eval_s2);
        Fr.toRprBE(transcript5, n8r*5, proof.eval_zw);
        Fr.toRprBE(transcript5, n8r*6, proof.eval_r);
        ch.v = [];
        ch.v[1] = hashToFr(transcript5);
        if (logger) logger.debug("v: " + Fr.toString(ch.v[1]));    

        for (let i=2; i<=6; i++ ) ch.v[i] = Fr.mul(ch.v[i-1], ch.v[1]);
        
        let pol_wxi = new ffjavascript.BigBuffer((zkey.domainSize+6)*n8r);

        const xi2m = Fr.mul(ch.xim, ch.xim);

        for (let i = 0; i < zkey.domainSize + 6; i++) {
            let w = Fr.zero;

            const polTHigh = pol_t.slice((zkey.domainSize * 2 + i) * n8r, (zkey.domainSize * 2 + i + 1) * n8r);
            w = Fr.add(w, Fr.mul(xi2m, polTHigh));

            if (i < zkey.domainSize + 3) {
                w = Fr.add(w, Fr.mul(ch.v[1], pol_r.slice(i * n8r, (i + 1) * n8r)));
            }

            if (i < zkey.domainSize + 2) {
                w = Fr.add(w, Fr.mul(ch.v[2], pol_a.slice(i * n8r, (i + 1) * n8r)));
                w = Fr.add(w, Fr.mul(ch.v[3], pol_b.slice(i * n8r, (i + 1) * n8r)));
                w = Fr.add(w, Fr.mul(ch.v[4], pol_c.slice(i * n8r, (i + 1) * n8r)));
            }

            if (i < zkey.domainSize) {
                const polTLow = pol_t.slice(i * n8r, (i + 1) * n8r);
                w = Fr.add(w, polTLow);

                const polTMid = pol_t.slice((zkey.domainSize + i) * n8r, (zkey.domainSize + i + 1) * n8r);
                w = Fr.add(w, Fr.mul(ch.xim, polTMid));

                w = Fr.add(w, Fr.mul(ch.v[5], pol_s1.slice(i * n8r, (i + 1) * n8r)));
                w = Fr.add(w, Fr.mul(ch.v[6], pol_s2.slice(i * n8r, (i + 1) * n8r)));
            }

            // b_10 and b_11 blinding scalars were applied on round 3 to randomize the polynomials t_low, t_mid, t_high
            // Subtract blinding scalar b_10 and b_11 to the lowest coefficient
            if (i === 0) {
                w = Fr.sub(w, Fr.mul(xi2m, ch.b[11]));
                w = Fr.sub(w, Fr.mul(ch.xim, ch.b[10]));
            }

            // Add blinding scalars b_10 and b_11 to the coefficient n
            if (i === zkey.domainSize) {
                w = Fr.add(w, ch.b[10]);
                w = Fr.add(w, Fr.mul(ch.xim, ch.b[11]));
            }

            pol_wxi.set(w, i * n8r);
        }

        let w0 = pol_wxi.slice(0, n8r);
        w0 = Fr.sub(w0, proof.eval_t);
        w0 = Fr.sub(w0, Fr.mul(ch.v[1], proof.eval_r));
        w0 = Fr.sub(w0, Fr.mul(ch.v[2], proof.eval_a));
        w0 = Fr.sub(w0, Fr.mul(ch.v[3], proof.eval_b));
        w0 = Fr.sub(w0, Fr.mul(ch.v[4], proof.eval_c));
        w0 = Fr.sub(w0, Fr.mul(ch.v[5], proof.eval_s1));
        w0 = Fr.sub(w0, Fr.mul(ch.v[6], proof.eval_s2));
        pol_wxi.set(w0, 0);

        pol_wxi= divPol1(pol_wxi, ch.xi);

        proof.Wxi = await expTau(pol_wxi, "multiexp Wxi");

        let pol_wxiw = new ffjavascript.BigBuffer((zkey.domainSize+3)*n8r);
        for (let i=0; i<zkey.domainSize+3; i++) {
            const w = pol_z.slice(i*n8r, (i+1)*n8r);
            pol_wxiw.set(w, i*n8r);
        }
        w0 = pol_wxiw.slice(0, n8r);
        w0 = Fr.sub(w0, proof.eval_zw);
        pol_wxiw.set(w0, 0);

        pol_wxiw= divPol1(pol_wxiw, Fr.mul(ch.xi, Fr.w[zkey.power]));
        proof.Wxiw = await expTau(pol_wxiw, "multiexp Wxiw");
    }

    function hashToFr(transcript) {
        const v = ffjavascript.Scalar.fromRprBE(new Uint8Array(keccak256$1.arrayBuffer(transcript)));
        return Fr.e(v);
    }


    function evalPol(P, x) {
        const n = P.byteLength / n8r;
        if (n == 0) return Fr.zero;
        let res = P.slice((n-1)*n8r, n*n8r);
        for (let i=n-2; i>=0; i--) {
            res = Fr.add(Fr.mul(res, x), P.slice(i*n8r, (i+1)*n8r));
        }
        return res;
    }

    function divPol1(P, d) {
        const n = P.byteLength/n8r;
        const res = new ffjavascript.BigBuffer(n*n8r);
        res.set(Fr.zero, (n-1) *n8r);
        res.set(P.slice((n-1)*n8r, n*n8r), (n-2)*n8r);
        for (let i=n-3; i>=0; i--) {
            res.set(
                Fr.add(
                    P.slice((i+1)*n8r, (i+2)*n8r), 
                    Fr.mul(
                        d, 
                        res.slice((i+1)*n8r, (i+2)*n8r)
                    )
                ),
                i*n8r
            );
        }
        if (!Fr.eq(
            P.slice(0, n8r),
            Fr.mul(
                Fr.neg(d),
                res.slice(0, n8r)
            )
        )) {
            throw new Error("Polinomial does not divide");
        }
        return res;
    }

    async function expTau(b, name) {
        const n = b.byteLength/n8r;
        const PTauN = PTau.slice(0, n*curve.G1.F.n8*2);
        const bm = await curve.Fr.batchFromMontgomery(b);
        let res = await curve.G1.multiExpAffine(PTauN, bm, logger, name);
        res = curve.G1.toAffine(res);
        return res;
    }


    async function to4T(A, pz) {
        pz = pz || []; 
        let a = await Fr.ifft(A);
        const a4 = new ffjavascript.BigBuffer(n8r*zkey.domainSize*4);
        a4.set(a, 0);

        const a1 = new ffjavascript.BigBuffer(n8r*(zkey.domainSize + pz.length));
        a1.set(a, 0);
        for (let i= 0; i<pz.length; i++) {
            a1.set(
                Fr.add(
                    a1.slice((zkey.domainSize+i)*n8r, (zkey.domainSize+i+1)*n8r),
                    pz[i]
                ),
                (zkey.domainSize+i)*n8r
            );
            a1.set(
                Fr.sub(
                    a1.slice(i*n8r, (i+1)*n8r),
                    pz[i]
                ),
                i*n8r
            );
        }
        const A4 = await Fr.fft(a4);
        return [a1, A4];
    }


}

/*
    Copyright 2021 0KIMS association.

    This file is part of snarkJS.

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
const {unstringifyBigInts: unstringifyBigInts$2} = ffjavascript.utils;

async function plonkFullProve(_input, wasmFile, zkeyFileName, logger) {
    const input = unstringifyBigInts$2(_input);

    const wtns= {
        type: "mem"
    };
    await wtnsCalculate(input, wasmFile, wtns);
    return await plonk16Prove(zkeyFileName, wtns, logger);
}

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
const {unstringifyBigInts: unstringifyBigInts$1} = ffjavascript.utils;
const { keccak256 } = jsSha3__default["default"];


async function plonkVerify(_vk_verifier, _publicSignals, _proof, logger) {
    let vk_verifier = unstringifyBigInts$1(_vk_verifier);
    let proof = unstringifyBigInts$1(_proof);
    let publicSignals = unstringifyBigInts$1(_publicSignals);

    const curve = await getCurveFromName(vk_verifier.curve);

    const Fr = curve.Fr;
    const G1 = curve.G1;

    proof = fromObjectProof(curve,proof);
    vk_verifier = fromObjectVk(curve, vk_verifier);
    if (!isWellConstructed(curve, proof)) {
        logger.error("Proof is not well constructed");
        return false;
    }
    if (publicSignals.length != vk_verifier.nPublic) {
        logger.error("Invalid number of public inputs");
        return false;
    }
    const challanges = calculateChallanges(curve, proof, publicSignals);
    if (logger) {
        logger.debug("beta: " + Fr.toString(challanges.beta, 16));    
        logger.debug("gamma: " + Fr.toString(challanges.gamma, 16));    
        logger.debug("alpha: " + Fr.toString(challanges.alpha, 16));    
        logger.debug("xi: " + Fr.toString(challanges.xi, 16));    
        logger.debug("v1: " + Fr.toString(challanges.v[1], 16));    
        logger.debug("v6: " + Fr.toString(challanges.v[6], 16));    
        logger.debug("u: " + Fr.toString(challanges.u, 16));    
    }
    const L = calculateLagrangeEvaluations(curve, challanges, vk_verifier);
    if (logger) {
        logger.debug("Lagrange Evaluations: ");
        for (let i=1; i<L.length; i++) {
            logger.debug(`L${i}(xi)=` + Fr.toString(L[i], 16));    
        }
    }
    
    if (publicSignals.length != vk_verifier.nPublic) {
        logger.error("Number of public signals does not match with vk");
        return false;
    }

    const pl = calculatePl(curve, publicSignals, L);
    if (logger) {
        logger.debug("Pl: " + Fr.toString(pl, 16));
    }

    const t = calculateT(curve, proof, challanges, pl, L[1]);
    if (logger) {
        logger.debug("t: " + Fr.toString(t, 16));
    }

    const D = calculateD(curve, proof, challanges, vk_verifier, L[1]);
    if (logger) {
        logger.debug("D: " + G1.toString(G1.toAffine(D), 16));
    }

    const F = calculateF(curve, proof, challanges, vk_verifier, D);
    if (logger) {
        logger.debug("F: " + G1.toString(G1.toAffine(F), 16));
    }

    const E = calculateE(curve, proof, challanges, vk_verifier, t);
    if (logger) {
        logger.debug("E: " + G1.toString(G1.toAffine(E), 16));
    }

    const res = await isValidPairing(curve, proof, challanges, vk_verifier, E, F);

    if (logger) {
        if (res) {
            logger.info("OK!");
        } else {
            logger.warn("Invalid Proof");
        }
    }

    return res;

}


function fromObjectProof(curve, proof) {
    const G1 = curve.G1;
    const Fr = curve.Fr;
    const res = {};
    res.A = G1.fromObject(proof.A);
    res.B = G1.fromObject(proof.B);
    res.C = G1.fromObject(proof.C);
    res.Z = G1.fromObject(proof.Z);
    res.T1 = G1.fromObject(proof.T1);
    res.T2 = G1.fromObject(proof.T2);
    res.T3 = G1.fromObject(proof.T3);
    res.eval_a = Fr.fromObject(proof.eval_a);
    res.eval_b = Fr.fromObject(proof.eval_b);
    res.eval_c = Fr.fromObject(proof.eval_c);
    res.eval_zw = Fr.fromObject(proof.eval_zw);
    res.eval_s1 = Fr.fromObject(proof.eval_s1);
    res.eval_s2 = Fr.fromObject(proof.eval_s2);
    res.eval_r = Fr.fromObject(proof.eval_r);
    res.Wxi = G1.fromObject(proof.Wxi);
    res.Wxiw = G1.fromObject(proof.Wxiw);
    return res;
}

function fromObjectVk(curve, vk) {
    const G1 = curve.G1;
    const G2 = curve.G2;
    const Fr = curve.Fr;
    const res = vk;
    res.Qm = G1.fromObject(vk.Qm);
    res.Ql = G1.fromObject(vk.Ql);
    res.Qr = G1.fromObject(vk.Qr);
    res.Qo = G1.fromObject(vk.Qo);
    res.Qc = G1.fromObject(vk.Qc);
    res.S1 = G1.fromObject(vk.S1);
    res.S2 = G1.fromObject(vk.S2);
    res.S3 = G1.fromObject(vk.S3);
    res.k1 = Fr.fromObject(vk.k1);
    res.k2 = Fr.fromObject(vk.k2);
    res.X_2 = G2.fromObject(vk.X_2);

    return res;
}

function isWellConstructed(curve, proof) {
    const G1 = curve.G1;
    if (!G1.isValid(proof.A)) return false;
    if (!G1.isValid(proof.B)) return false;
    if (!G1.isValid(proof.C)) return false;
    if (!G1.isValid(proof.Z)) return false;
    if (!G1.isValid(proof.T1)) return false;
    if (!G1.isValid(proof.T2)) return false;
    if (!G1.isValid(proof.T3)) return false;
    if (!G1.isValid(proof.Wxi)) return false;
    if (!G1.isValid(proof.Wxiw)) return false;
    return true;
}

function calculateChallanges(curve, proof, publicSignals) {
    const G1 = curve.G1;
    const Fr = curve.Fr;
    const n8r = curve.Fr.n8;
    const res = {};

    const transcript1 = new Uint8Array(publicSignals.length*n8r + G1.F.n8*2*3);
    for (let i=0; i<publicSignals.length; i++) {
        Fr.toRprBE(transcript1, i*n8r, Fr.e(publicSignals[i]));
    }
    G1.toRprUncompressed(transcript1, publicSignals.length*n8r + 0, proof.A);
    G1.toRprUncompressed(transcript1, publicSignals.length*n8r + G1.F.n8*2, proof.B);
    G1.toRprUncompressed(transcript1, publicSignals.length*n8r + G1.F.n8*4, proof.C);

    res.beta = hashToFr(curve, transcript1);

    const transcript2 = new Uint8Array(n8r);
    Fr.toRprBE(transcript2, 0, res.beta);
    res.gamma = hashToFr(curve, transcript2);

    const transcript3 = new Uint8Array(G1.F.n8*2);
    G1.toRprUncompressed(transcript3, 0, proof.Z);
    res.alpha = hashToFr(curve, transcript3);

    const transcript4 = new Uint8Array(G1.F.n8*2*3);
    G1.toRprUncompressed(transcript4, 0, proof.T1);
    G1.toRprUncompressed(transcript4, G1.F.n8*2, proof.T2);
    G1.toRprUncompressed(transcript4, G1.F.n8*4, proof.T3);
    res.xi = hashToFr(curve, transcript4);

    const transcript5 = new Uint8Array(n8r*7);
    Fr.toRprBE(transcript5, 0, proof.eval_a);
    Fr.toRprBE(transcript5, n8r, proof.eval_b);
    Fr.toRprBE(transcript5, n8r*2, proof.eval_c);
    Fr.toRprBE(transcript5, n8r*3, proof.eval_s1);
    Fr.toRprBE(transcript5, n8r*4, proof.eval_s2);
    Fr.toRprBE(transcript5, n8r*5, proof.eval_zw);
    Fr.toRprBE(transcript5, n8r*6, proof.eval_r);
    res.v = [];
    res.v[1] = hashToFr(curve, transcript5);

    for (let i=2; i<=6; i++ ) res.v[i] = Fr.mul(res.v[i-1], res.v[1]);

    const transcript6 = new Uint8Array(G1.F.n8*2*2);
    G1.toRprUncompressed(transcript6, 0, proof.Wxi);
    G1.toRprUncompressed(transcript6, G1.F.n8*2, proof.Wxiw);
    res.u = hashToFr(curve, transcript6);

    return res;
}

function calculateLagrangeEvaluations(curve, challanges, vk) {
    const Fr = curve.Fr;

    let xin = challanges.xi;
    let domainSize = 1;
    for (let i=0; i<vk.power; i++) {
        xin = Fr.square(xin);
        domainSize *= 2;
    }
    challanges.xin = xin;

    challanges.zh = Fr.sub(xin, Fr.one);
    const L = [];

    const n = Fr.e(domainSize);
    let w = Fr.one;
    for (let i=1; i<=Math.max(1, vk.nPublic); i++) {
        L[i] = Fr.div(Fr.mul(w, challanges.zh), Fr.mul(n, Fr.sub(challanges.xi, w)));
        w = Fr.mul(w, Fr.w[vk.power]);
    }

    return L;
}

function hashToFr(curve, transcript) {
    const v = ffjavascript.Scalar.fromRprBE(new Uint8Array(keccak256.arrayBuffer(transcript)));
    return curve.Fr.e(v);
}

function calculatePl(curve, publicSignals, L) {
    const Fr = curve.Fr;

    let pl = Fr.zero;
    for (let i=0; i<publicSignals.length; i++) {
        const w = Fr.e(publicSignals[i]);
        pl = Fr.sub(pl, Fr.mul(w, L[i+1]));
    }
    return pl;
}

function calculateT(curve, proof, challanges, pl, l1) {
    const Fr = curve.Fr;
    let num = proof.eval_r;
    num = Fr.add(num, pl);

    let e1 = proof.eval_a;
    e1 = Fr.add(e1, Fr.mul(challanges.beta, proof.eval_s1));
    e1 = Fr.add(e1, challanges.gamma);

    let e2 = proof.eval_b;
    e2 = Fr.add(e2, Fr.mul(challanges.beta, proof.eval_s2));
    e2 = Fr.add(e2, challanges.gamma);

    let e3 = proof.eval_c;
    e3 = Fr.add(e3, challanges.gamma);

    let e = Fr.mul(Fr.mul(e1, e2), e3);
    e = Fr.mul(e, proof.eval_zw);
    e = Fr.mul(e, challanges.alpha);

    num = Fr.sub(num, e);

    num = Fr.sub(num, Fr.mul(l1, Fr.square(challanges.alpha)));

    const t = Fr.div(num, challanges.zh);

    return t;
}

function calculateD(curve, proof, challanges, vk, l1) {
    const G1 = curve.G1;
    const Fr = curve.Fr;

    let s1 = Fr.mul(Fr.mul(proof.eval_a, proof.eval_b), challanges.v[1]);
    let res = G1.timesFr(vk.Qm, s1);

    let s2 = Fr.mul(proof.eval_a, challanges.v[1]);
    res = G1.add(res, G1.timesFr(vk.Ql, s2));

    let s3 = Fr.mul(proof.eval_b, challanges.v[1]);
    res = G1.add(res, G1.timesFr(vk.Qr, s3));

    let s4 = Fr.mul(proof.eval_c, challanges.v[1]);
    res = G1.add(res, G1.timesFr(vk.Qo, s4));

    res = G1.add(res, G1.timesFr(vk.Qc, challanges.v[1]));

    const betaxi = Fr.mul(challanges.beta, challanges.xi);
    let s6a = proof.eval_a;
    s6a = Fr.add(s6a, betaxi);
    s6a = Fr.add(s6a, challanges.gamma);

    let s6b = proof.eval_b;
    s6b = Fr.add(s6b, Fr.mul(betaxi, vk.k1));
    s6b = Fr.add(s6b, challanges.gamma);

    let s6c = proof.eval_c;
    s6c = Fr.add(s6c, Fr.mul(betaxi, vk.k2));
    s6c = Fr.add(s6c, challanges.gamma);

    let s6 = Fr.mul(Fr.mul(s6a, s6b), s6c);
    s6 = Fr.mul(s6, Fr.mul(challanges.alpha, challanges.v[1]));

    let s6d = Fr.mul(Fr.mul(l1, Fr.square(challanges.alpha)), challanges.v[1]);
    s6 = Fr.add(s6, s6d);

    s6 = Fr.add(s6, challanges.u);
    res = G1.add(res, G1.timesFr(proof.Z, s6));


    let s7a = proof.eval_a;
    s7a = Fr.add(s7a, Fr.mul(challanges.beta, proof.eval_s1));
    s7a = Fr.add(s7a, challanges.gamma);

    let s7b = proof.eval_b;
    s7b = Fr.add(s7b, Fr.mul(challanges.beta, proof.eval_s2));
    s7b = Fr.add(s7b, challanges.gamma);

    let s7 = Fr.mul(s7a, s7b);
    s7 = Fr.mul(s7, challanges.alpha);
    s7 = Fr.mul(s7, challanges.v[1]);
    s7 = Fr.mul(s7, challanges.beta);
    s7 = Fr.mul(s7, proof.eval_zw);
    res = G1.sub(res, G1.timesFr(vk.S3, s7));

    return res;
}

function calculateF(curve, proof, challanges, vk, D) {
    const G1 = curve.G1;
    const Fr = curve.Fr;

    let res = proof.T1;

    res = G1.add(res, G1.timesFr(proof.T2, challanges.xin));
    res = G1.add(res, G1.timesFr(proof.T3, Fr.square(challanges.xin)));
    res = G1.add(res, D);
    res = G1.add(res, G1.timesFr(proof.A, challanges.v[2]));
    res = G1.add(res, G1.timesFr(proof.B, challanges.v[3]));
    res = G1.add(res, G1.timesFr(proof.C, challanges.v[4]));
    res = G1.add(res, G1.timesFr(vk.S1, challanges.v[5]));
    res = G1.add(res, G1.timesFr(vk.S2, challanges.v[6]));

    return res;
}


function calculateE(curve, proof, challanges, vk, t) {
    const G1 = curve.G1;
    const Fr = curve.Fr;

    let s = t;

    s = Fr.add(s, Fr.mul(challanges.v[1], proof.eval_r));
    s = Fr.add(s, Fr.mul(challanges.v[2], proof.eval_a));
    s = Fr.add(s, Fr.mul(challanges.v[3], proof.eval_b));
    s = Fr.add(s, Fr.mul(challanges.v[4], proof.eval_c));
    s = Fr.add(s, Fr.mul(challanges.v[5], proof.eval_s1));
    s = Fr.add(s, Fr.mul(challanges.v[6], proof.eval_s2));
    s = Fr.add(s, Fr.mul(challanges.u, proof.eval_zw));

    const res = G1.timesFr(G1.one, s);

    return res;
}

async function isValidPairing(curve, proof, challanges, vk, E, F) {
    const G1 = curve.G1;
    const Fr = curve.Fr;

    let A1 = proof.Wxi;
    A1 = G1.add(A1, G1.timesFr(proof.Wxiw, challanges.u));

    let B1 = G1.timesFr(proof.Wxi, challanges.xi);
    const s = Fr.mul(Fr.mul(challanges.u, challanges.xi), Fr.w[vk.power]);
    B1 = G1.add(B1, G1.timesFr(proof.Wxiw, s));
    B1 = G1.add(B1, F);
    B1 = G1.sub(B1, E);

    const res = await curve.pairingEq(
        G1.neg(A1) , vk.X_2,
        B1 , curve.G2.one
    );

    return res;

}

/*
    Copyright 2021 0KIMS association.

    This file is part of snarkJS.

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
const { unstringifyBigInts} = ffjavascript.utils;

function i2hex(i) {
    return ("0" + i.toString(16)).slice(-2);
}

function p256(n) {
    let nstr = n.toString(16);
    while (nstr.length < 64) nstr = "0"+nstr;
    nstr = `"0x${nstr}"`;
    return nstr;
}

async function plonkExportSolidityCallData(_proof, _pub) {
    const proof = unstringifyBigInts(_proof);
    const pub = unstringifyBigInts(_pub);

    const curve = await getCurveFromName(proof.curve);
    const G1 = curve.G1;
    const Fr = curve.Fr;

    let inputs = "";
    for (let i=0; i<pub.length; i++) {
        if (inputs != "") inputs = inputs + ",";
        inputs = inputs + p256(pub[i]);
    }

    const proofBuff = new Uint8Array(G1.F.n8*2*9 + Fr.n8*7);
    G1.toRprUncompressed(proofBuff, 0, G1.e(proof.A));
    G1.toRprUncompressed(proofBuff, G1.F.n8*2, G1.e(proof.B));
    G1.toRprUncompressed(proofBuff, G1.F.n8*4, G1.e(proof.C));
    G1.toRprUncompressed(proofBuff, G1.F.n8*6, G1.e(proof.Z));
    G1.toRprUncompressed(proofBuff, G1.F.n8*8, G1.e(proof.T1));
    G1.toRprUncompressed(proofBuff, G1.F.n8*10, G1.e(proof.T2));
    G1.toRprUncompressed(proofBuff, G1.F.n8*12, G1.e(proof.T3));
    G1.toRprUncompressed(proofBuff, G1.F.n8*14, G1.e(proof.Wxi));
    G1.toRprUncompressed(proofBuff, G1.F.n8*16, G1.e(proof.Wxiw));
    Fr.toRprBE(proofBuff, G1.F.n8*18 , Fr.e(proof.eval_a));
    Fr.toRprBE(proofBuff, G1.F.n8*18 + Fr.n8, Fr.e(proof.eval_b));
    Fr.toRprBE(proofBuff, G1.F.n8*18 + Fr.n8*2, Fr.e(proof.eval_c));
    Fr.toRprBE(proofBuff, G1.F.n8*18 + Fr.n8*3, Fr.e(proof.eval_s1));
    Fr.toRprBE(proofBuff, G1.F.n8*18 + Fr.n8*4, Fr.e(proof.eval_s2));
    Fr.toRprBE(proofBuff, G1.F.n8*18 + Fr.n8*5, Fr.e(proof.eval_zw));
    Fr.toRprBE(proofBuff, G1.F.n8*18 + Fr.n8*6, Fr.e(proof.eval_r));

    const proofHex = Array.from(proofBuff).map(i2hex).join("");

    const S="0x"+proofHex+",["+inputs+"]";

    return S;
}

/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

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

var plonk = /*#__PURE__*/Object.freeze({
    __proto__: null,
    setup: plonkSetup,
    fullProve: plonkFullProve,
    prove: plonk16Prove,
    verify: plonkVerify,
    exportSolidityCallData: plonkExportSolidityCallData
});

exports.groth16 = groth16;
exports.plonk = plonk;
exports.powersOfTau = powersoftau;
exports.r1cs = r1cs;
exports.wtns = wtns;
exports.zKey = zkey;
