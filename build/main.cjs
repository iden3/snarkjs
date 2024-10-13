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

const bls12381r$1 = ffjavascript.Scalar.e("73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001", 16);
const bn128r$1 = ffjavascript.Scalar.e("21888242871839275222246405745257275088548364400416034343698204186575808495617");

const bls12381q = ffjavascript.Scalar.e("1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaab", 16);
const bn128q = ffjavascript.Scalar.e("21888242871839275222246405745257275088696311157297823662689037894645226208583");

async function getCurveFromR(r, options) {
    let curve;
    // check that options param is defined and that options.singleThread is defined
    let singleThread = options && options.singleThread;
    if (ffjavascript.Scalar.eq(r, bn128r$1)) {
        curve = await ffjavascript.buildBn128(singleThread);
    } else if (ffjavascript.Scalar.eq(r, bls12381r$1)) {
        curve = await ffjavascript.buildBls12381(singleThread);
    } else {
        throw new Error(`Curve not supported: ${ffjavascript.Scalar.toString(r)}`);
    }
    return curve;
}

async function getCurveFromQ(q, options) {
    let curve;
    let singleThread = options && options.singleThread;
    if (ffjavascript.Scalar.eq(q, bn128q)) {
        curve = await ffjavascript.buildBn128(singleThread);
    } else if (ffjavascript.Scalar.eq(q, bls12381q)) {
        curve = await ffjavascript.buildBls12381(singleThread);
    } else {
        throw new Error(`Curve not supported: ${ffjavascript.Scalar.toString(q)}`);
    }
    return curve;
}

async function getCurveFromName(name, options) {
    let curve;
    let singleThread = options && options.singleThread;
    const normName = normalizeName(name);
    if (["BN128", "BN254", "ALTBN128"].indexOf(normName) >= 0) {
        curve = await ffjavascript.buildBn128(singleThread);
    } else if (["BLS12381"].indexOf(normName) >= 0) {
        curve = await ffjavascript.buildBls12381(singleThread);
    } else {
        throw new Error(`Curve not supported: ${name}`);
    }
    return curve;

    function normalizeName(n) {
        return n.toUpperCase().match(/[A-Za-z0-9]+/g).join("");
    }

}

var curves = /*#__PURE__*/Object.freeze({
    __proto__: null,
    getCurveFromR: getCurveFromR,
    getCurveFromQ: getCurveFromQ,
    getCurveFromName: getCurveFromName
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

function getRandomBytes(n) {
    let array = new Uint8Array(n);
    if (process.browser) { // Supported
        globalThis.crypto.getRandomValues(array);
    } else { // NodeJS
        crypto__default["default"].randomFillSync(array);
    }
    return array;
}

async function sha256digest(data) {
    if (process.browser) { // Supported
        const buffer = await globalThis.crypto.subtle.digest("SHA-256", data.buffer);
        return new Uint8Array(buffer);
    } else { // NodeJS
        return crypto__default["default"].createHash("sha256").update(data).digest();
    }
}

/**
 * @param {Uint8Array} data
 * @param {number} offset
 */
function readUInt32BE(data, offset) {
    return new DataView(data.buffer).getUint32(offset, false);
}

async function getRandomRng(entropy) {
    // Generate a random Rng
    while (!entropy) {
        entropy = await askEntropy();
    }
    const hasher = Blake2b__default["default"](64);
    hasher.update(getRandomBytes(64));
    const enc = new TextEncoder(); // always utf-8
    hasher.update(enc.encode(entropy));
    const hash = hasher.digest();

    const seed = [];
    for (let i=0;i<8;i++) {
        seed[i] = readUInt32BE(hash, i*4);
    }
    const rng = new ffjavascript.ChaCha(seed);
    return rng;
}

async function rngFromBeaconParams(beaconHash, numIterationsExp) {
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
            curHash = await sha256digest(curHash);
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

const HEADER_ZKEY_SECTION = 1;

const GROTH16_PROTOCOL_ID = 1;
const PLONK_PROTOCOL_ID = 2;
const FFLONK_PROTOCOL_ID = 10;

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

// FFlonk constants
const FF_T_POL_DEG_MIN = 3;

// ZKEY constants
const ZKEY_FF_NSECTIONS = 17;

const ZKEY_FF_HEADER_SECTION = 2;
const ZKEY_FF_ADDITIONS_SECTION = 3;
const ZKEY_FF_A_MAP_SECTION = 4;
const ZKEY_FF_B_MAP_SECTION = 5;
const ZKEY_FF_C_MAP_SECTION = 6;
const ZKEY_FF_QL_SECTION = 7;
const ZKEY_FF_QR_SECTION = 8;
const ZKEY_FF_QM_SECTION = 9;
const ZKEY_FF_QO_SECTION = 10;
const ZKEY_FF_QC_SECTION = 11;
const ZKEY_FF_SIGMA1_SECTION = 12;
const ZKEY_FF_SIGMA2_SECTION = 13;
const ZKEY_FF_SIGMA3_SECTION = 14;
const ZKEY_FF_LAGRANGE_SECTION = 15;
const ZKEY_FF_PTAU_SECTION = 16;
const ZKEY_FF_C0_SECTION = 17;

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


async function readHeader$1(fd, sections, toObject, options) {
    // Read Header
    /////////////////////
    await binFileUtils__namespace.startReadUniqueSection(fd, sections, 1);
    const protocolId = await fd.readULE32();
    await binFileUtils__namespace.endReadSection(fd);

    if (protocolId === GROTH16_PROTOCOL_ID) {
        return await readHeaderGroth16(fd, sections, toObject, options);
    } else if (protocolId === PLONK_PROTOCOL_ID) {
        return await readHeaderPlonk(fd, sections, toObject, options);
    } else if (protocolId === FFLONK_PROTOCOL_ID) {
        return await readHeaderFFlonk(fd, sections, toObject, options);
    } else {
        throw new Error("Protocol not supported: ");
    }
}




async function readHeaderGroth16(fd, sections, toObject, options) {
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
    zkey.curve = await getCurveFromQ(zkey.q, options);
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

async function readHeaderPlonk(fd, sections, toObject, options) {
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
    zkey.curve = await getCurveFromQ(zkey.q, options);
    zkey.nVars = await fd.readULE32();
    zkey.nPublic = await fd.readULE32();
    zkey.domainSize = await fd.readULE32();
    zkey.power = log2(zkey.domainSize);
    zkey.nAdditions = await fd.readULE32();
    zkey.nConstraints = await fd.readULE32();
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

async function readHeaderFFlonk(fd, sections, toObject, options) {
    const zkey = {};

    zkey.protocol = "fflonk";
    zkey.protocolId = FFLONK_PROTOCOL_ID;

    await binFileUtils__namespace.startReadUniqueSection(fd, sections, ZKEY_FF_HEADER_SECTION);
    const n8q = await fd.readULE32();
    zkey.n8q = n8q;
    zkey.q = await binFileUtils__namespace.readBigInt(fd, n8q);
    zkey.curve = await getCurveFromQ(zkey.q, options);

    const n8r = await fd.readULE32();
    zkey.n8r = n8r;
    zkey.r = await binFileUtils__namespace.readBigInt(fd, n8r);

    zkey.nVars = await fd.readULE32();
    zkey.nPublic = await fd.readULE32();
    zkey.domainSize = await fd.readULE32();
    zkey.power = log2(zkey.domainSize);
    zkey.nAdditions = await fd.readULE32();
    zkey.nConstraints = await fd.readULE32();

    zkey.k1 = await fd.read(n8r);
    zkey.k2 = await fd.read(n8r);

    zkey.w3 = await fd.read(n8r);
    zkey.w4 = await fd.read(n8r);
    zkey.w8 = await fd.read(n8r);
    zkey.wr = await fd.read(n8r);

    zkey.X_2 = await readG2(fd, zkey.curve, toObject);

    zkey.C0 = await readG1(fd, zkey.curve, toObject);

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
        throw new Error("Parameters do not match");
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
const {stringifyBigInts: stringifyBigInts$4} = ffjavascript.utils;

async function groth16Prove(zkeyFileName, witnessFileName, logger, options) {
    const {fd: fdWtns, sections: sectionsWtns} = await binFileUtils__namespace.readBinFile(witnessFileName, "wtns", 2, 1<<25, 1<<23);

    const wtns = await readHeader(fdWtns, sectionsWtns);

    const {fd: fdZKey, sections: sectionsZKey} = await binFileUtils__namespace.readBinFile(zkeyFileName, "zkey", 2, 1<<25, 1<<23);

    const zkey = await readHeader$1(fdZKey, sectionsZKey, undefined, options);

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

    proof = stringifyBigInts$4(proof);
    publicSignals = stringifyBigInts$4(publicSignals);

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
async function buildABC(curve, zkey, witness, coeffs, logger) {
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
const { unstringifyBigInts: unstringifyBigInts$b} = ffjavascript.utils;

async function wtnsCalculate(_input, wasmFileName, wtnsFileName, options) {
    const input = unstringifyBigInts$b(_input);

    const fdWasm = await fastFile__namespace.readExisting(wasmFileName);
    const wasm = await fdWasm.read(fdWasm.totalSize);
    await fdWasm.close();

    const wc = await circom_runtime.WitnessCalculatorBuilder(wasm, options);
    if (wc.circom_version() === 1) {
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
const {unstringifyBigInts: unstringifyBigInts$a} = ffjavascript.utils;

async function groth16FullProve(_input, wasmFile, zkeyFileName, logger, wtnsCalcOptions, proverOptions) {
    const input = unstringifyBigInts$a(_input);

    const wtns= {
        type: "mem"
    };
    await wtnsCalculate(input, wasmFile, wtns, wtnsCalcOptions);
    return await groth16Prove(zkeyFileName, wtns, logger, proverOptions);
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
const {unstringifyBigInts: unstringifyBigInts$9} = ffjavascript.utils;

async function groth16Verify(_vk_verifier, _publicSignals, _proof, logger) {
/*
    let cpub = vk_verifier.IC[0];
    for (let s= 0; s< vk_verifier.nPublic; s++) {
        cpub  = G1.add( cpub, G1.timesScalar( vk_verifier.IC[s+1], publicSignals[s]));
    }
*/

    const vk_verifier = unstringifyBigInts$9(_vk_verifier);
    const proof = unstringifyBigInts$9(_proof);
    const publicSignals = unstringifyBigInts$9(_publicSignals);

    const curve = await getCurveFromName(vk_verifier.curve);

    const IC0 = curve.G1.fromObject(vk_verifier.IC[0]);
    const IC = new Uint8Array(curve.G1.F.n8*2 * publicSignals.length);
    const w = new Uint8Array(curve.Fr.n8 * publicSignals.length);

    if (!publicInputsAreValid$1(curve, publicSignals)) {
        if (logger) logger.error("Public inputs are not valid.");
        return false;
    }

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

    if (!isWellConstructed$1(curve, {pi_a, pi_b, pi_c})) {
        if(logger) logger.error("Proof commitments are not valid.");
        return false;
    }

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

function isWellConstructed$1(curve, proof) {
    const G1 = curve.G1;
    const G2 = curve.G2;

    return G1.isValid(proof.pi_a)
        && G2.isValid(proof.pi_b)
        && G1.isValid(proof.pi_c);
}

function publicInputsAreValid$1(curve, publicInputs) {
    for(let i = 0; i < publicInputs.length; i++) {
        if(!ffjavascript.Scalar.lt(publicInputs[i], curve.r)) {
            return false;
        }
    }
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
const { unstringifyBigInts: unstringifyBigInts$8} = ffjavascript.utils;

function p256$2(n) {
    let nstr = n.toString(16);
    while (nstr.length < 64) nstr = "0"+nstr;
    nstr = `"0x${nstr}"`;
    return nstr;
}

async function groth16ExportSolidityCallData(_proof, _pub) {
    const proof = unstringifyBigInts$8(_proof);
    const pub = unstringifyBigInts$8(_pub);

    let inputs = "";
    for (let i=0; i<pub.length; i++) {
        if (inputs != "") inputs = inputs + ",";
        inputs = inputs + p256$2(pub[i]);
    }

    let S;
    S=`[${p256$2(proof.pi_a[0])}, ${p256$2(proof.pi_a[1])}],` +
        `[[${p256$2(proof.pi_b[0][1])}, ${p256$2(proof.pi_b[0][0])}],[${p256$2(proof.pi_b[1][1])}, ${p256$2(proof.pi_b[1][0])}]],` +
        `[${p256$2(proof.pi_c[0])}, ${p256$2(proof.pi_c[1])}],` +
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
        throw new Error("Parameters do not match");
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


async function keyFromBeacon(curve, challengeHash, beaconHash, numIterationsExp) {

    const rng = await rngFromBeaconParams(beaconHash, numIterationsExp);

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
    const scG1 = curve.F1.n8; // Compressed size
    const sG2 = curve.F2.n8*2;
    const scG2 = curve.F2.n8; // Compressed size

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
        throw new Error("Wrong contribution. This contribution is not based on the previous hash");

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
        const beaconKey = await keyFromBeacon(curve, prev.nextChallenge, cur.beaconHash, cur.numIterationsExp);

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

            const scalars = getRandomBytes(4*(n-1));

            if (i>0) {
                const firstBase = G.fromRprLEM(bases, 0);
                const r = readUInt32BE(getRandomBytes(4), 0);

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
            seed[i] = readUInt32BE(getRandomBytes(4), 0);
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
    It multiplies the points in fdFrom by first, first*inc, first*inc^2, ....
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

async function challengeContribute(curve, challengeFilename, responseFileName, entropy, logger) {
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

    const fdTo = await fastFile__namespace.createOverride(responseFileName);

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
        if (logger) logger.error("Maximum length of beacon hash is 255 bytes");
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

    curContribution.key = await keyFromBeacon(curve, lastChallengeHash, beaconHash, numIterationsExp);

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
                if (name == "one") name = "1";

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
const {unstringifyBigInts: unstringifyBigInts$7} = ffjavascript.utils;


async function wtnsDebug(_input, wasmFileName, wtnsFileName, symName, options, logger) {

    const input = unstringifyBigInts$7(_input);

    const fdWasm = await fastFile__namespace.readExisting(wasmFileName);
    const wasm = await fdWasm.read(fdWasm.totalSize);
    await fdWasm.close();

    const wcOps = {...options, sanityCheck: true};
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
    const w = await wc.calculateWitness(input, true);

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

async function wtnsCheck(r1csFilename, wtnsFilename, logger) {

    if (logger) logger.info("WITNESS CHECKING STARTED");

    // Read r1cs file
    if (logger) logger.info("> Reading r1cs file");
    const {
        fd: fdR1cs,
        sections: sectionsR1cs
    } = await binFileUtils__namespace.readBinFile(r1csFilename, "r1cs", 1, 1 << 22, 1 << 24);
    const r1cs = await r1csfile.readR1csFd(fdR1cs, sectionsR1cs, { loadConstraints: false, loadCustomGates: false });

    // Read witness file
    if (logger) logger.info("> Reading witness file");
    const {
        fd: fdWtns,
        sections: wtnsSections
    } = await binFileUtils__namespace.readBinFile(wtnsFilename, "wtns", 2, 1 << 22, 1 << 24);
    const wtnsHeader = await readHeader(fdWtns, wtnsSections);

    if (!ffjavascript.Scalar.eq(r1cs.prime, wtnsHeader.q)) {
        throw new Error("Curve of the witness does not match the curve of the proving key");
    }

    const buffWitness = await binFileUtils__namespace.readSection(fdWtns, wtnsSections, 2);
    await fdWtns.close();

    const curve = await getCurveFromR(r1cs.prime);
    const Fr = curve.Fr;
    const sFr = Fr.n8;

    const bR1cs = await binFileUtils__namespace.readSection(fdR1cs, sectionsR1cs, 2);

    if (logger) {
        logger.info("----------------------------");
        logger.info("  WITNESS CHECK");
        logger.info(`  Curve:          ${r1cs.curve.name}`);
        logger.info(`  Vars (wires):   ${r1cs.nVars}`);
        logger.info(`  Outputs:        ${r1cs.nOutputs}`);
        logger.info(`  Public Inputs:  ${r1cs.nPubInputs}`);
        logger.info(`  Private Inputs: ${r1cs.nPrvInputs}`);
        logger.info(`  Labels:         ${r1cs.nLabels}`);
        logger.info(`  Constraints:    ${r1cs.nConstraints}`);
        logger.info(`  Custom Gates:   ${r1cs.useCustomGates}`);
        logger.info("----------------------------");
    }

    if (logger) logger.info("> Checking witness correctness");

    let bR1csPos = 0;
    let res = true;
    for (let i = 0; i < r1cs.nConstraints; i++) {
        if ((logger) && (i !== 0) && (i % 500000 === 0)) {
            logger.info(`··· processing r1cs constraints ${i}/${r1cs.nConstraints}`);
        }

        //Read the three linear combinations of the constraint where A * B - C = 0
        const lcA = readLC();
        const lcB = readLC();
        const lcC = readLC();

        // Evaluate the linear combinations
        const evalA = EvaluateLinearCombination(lcA);
        const evalB = EvaluateLinearCombination(lcB);
        const evalC = EvaluateLinearCombination(lcC);

        // Check that A * B - C == 0
        if (!Fr.eq(Fr.sub(Fr.mul(evalA, evalB), evalC), Fr.zero)) {
            logger.warn("··· aborting checking process at constraint " + i);
            res = false;
            break;
        }
    }

    fdR1cs.close();

    if (logger) {
        if (res) {
            logger.info("WITNESS IS CORRECT");
            logger.info("WITNESS CHECKING FINISHED SUCCESSFULLY");
        } else {
            logger.warn("WITNESS IS NOT CORRECT");
            logger.warn("WITNESS CHECKING FINISHED UNSUCCESSFULLY");
        }
    }

    return res;

    function EvaluateLinearCombination(lc) {
        let res = Fr.zero;

        const keys = Object.keys(lc);
        keys.forEach((signalId) => {
            const signalValue = getWitnessValue(signalId);
            const signalFactor = lc[signalId];

            res = Fr.add(res, Fr.mul(signalValue, signalFactor));
        });

        return res;
    }

    function readLC() {
        const lc = {};

        const buffUL32 = bR1cs.slice(bR1csPos, bR1csPos + 4);
        bR1csPos += 4;
        const buffUL32V = new DataView(buffUL32.buffer);
        const nIdx = buffUL32V.getUint32(0, true);

        const buff = bR1cs.slice(bR1csPos, bR1csPos + (4 + r1cs.n8) * nIdx);
        bR1csPos += (4 + r1cs.n8) * nIdx;
        const buffV = new DataView(buff.buffer);
        for (let i = 0; i < nIdx; i++) {
            const idx = buffV.getUint32(i * (4 + r1cs.n8), true);
            const val = r1cs.F.fromRprLE(buff, i * (4 + r1cs.n8) + 4);
            lc[idx] = val;
        }
        return lc;
    }

    function getWitnessValue(signalId) {
        return Fr.fromRprLE(buffWitness.slice(signalId * sFr, signalId * sFr + sFr));
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

var wtns = /*#__PURE__*/Object.freeze({
    __proto__: null,
    calculate: wtnsCalculate,
    debug: wtnsDebug,
    exportJson: wtnsExportJson,
    check: wtnsCheck
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
                if ((logger)&&(i%10000 == 0)) logger.debug(`splitting buffer: ${i}/${domainSize}`);
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

    // Remove last element.  (The degree of H will be always m-2)
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

    const nContributions = await fdMPCParams.readUBE32();
    newMPCParams.contributions = [];
    for (let i=0; i<nContributions; i++) {
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
            if (logger) logger.error(`Previous contribution ${i} does not match`);
            return false;
        }
    }


    // Set the same name to all new contributions
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

    // C Section (L section)
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
            const rng = await rngFromBeaconParams(c.beaconHash, c.numIterationsExp);
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

            const scalars = getRandomBytes(4*n);

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
            seed[i] = readUInt32BE(getRandomBytes(4), 0);
        }
        const rng = new ffjavascript.ChaCha(seed);
        for (let i=0; i<zkey.domainSize-1; i++) {   // Note that last one is zero
            const e = Fr.fromRng(rng);
            Fr.toRprLE(buff_r, i*zkey.n8r, e);
        }
        Fr.toRprLE(buff_r, (zkey.domainSize-1)*zkey.n8r, Fr.zero);

        let R1 = G.zero;
        for (let i=0; i<zkey.domainSize; i += MAX_CHUNK_SIZE) {
            if (logger) logger.debug(`H Verification(tau):  ${i}/${zkey.domainSize}`);
            const n = Math.min(zkey.domainSize - i, MAX_CHUNK_SIZE);

            const buff1 = await fdPTau.read(sG*n, sectionsPTau[2][0].p + zkey.domainSize*sG + i*sG);
            const buff2 = await fdPTau.read(sG*n, sectionsPTau[2][0].p + i*sG);

            const buffB = await batchSubtract(buff1, buff2);
            const buffS = buff_r.slice(i*zkey.n8r, (i+n)*zkey.n8r);
            const r = await G.multiExpAffine(buffB, buffS);

            R1 = G.add(R1, r);
        }

        // Calculate odd coefficients in transformed domain

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
            if (logger) logger.debug(`H Verification(lagrange):  ${i}/${zkey.domainSize}`);
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

    async function batchSubtract(buff1, buff2) {
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
            opPromises.push(batchSubtractThread(subBuff1, subBuff2));
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


    async function batchSubtractThread(buff1, buff2) {
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

    const contributionHash = contributionHasher.digest();

    if (logger) logger.info(formatHash(mpcParams.csHash, "Circuit Hash: "));
    if (logger) logger.info(formatHash(contributionHash, "Contribution Hash: "));

    return contributionHash;
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
        if (logger) logger.error("Maximum length of beacon hash is 255 bytes");
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

    const contributionHash = contributionHasher.digest();

    if (logger) logger.info(formatHash(contributionHash, "Contribution Hash: "));

    return contributionHash;
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

async function bellmanContribute(curve, challengeFilename, responseFileName, entropy, logger) {
    await Blake2b__default["default"].ready();

    const rng = await getRandomRng(entropy);

    const delta = curve.Fr.fromRng(rng);
    const invDelta = curve.Fr.inv(delta);

    const sG1 = curve.G1.F.n8*2;
    const sG2 = curve.G2.F.n8*2;

    const fdFrom = await fastFile__namespace.readExisting(challengeFilename);
    const fdTo = await fastFile__namespace.createOverride(responseFileName);


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

    const nContributions = await fdFrom.readUBE32();
    mpcParams.contributions = [];
    for (let i=0; i<nContributions; i++) {
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
    /// Write Contribution
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

const {stringifyBigInts: stringifyBigInts$3} = ffjavascript.utils;

async function zkeyExportVerificationKey(zkeyName, logger) {
    if (logger) logger.info("EXPORT VERIFICATION KEY STARTED");

    const {fd, sections} = await binFileUtils__namespace.readBinFile(zkeyName, "zkey", 2);
    const zkey = await readHeader$1(fd, sections);

    if (logger) logger.info("> Detected protocol: " + zkey.protocol);

    let res;
    if (zkey.protocol === "groth16") {
        res = await groth16Vk(zkey, fd, sections);
    } else if (zkey.protocol === "plonk") {
        res = await plonkVk(zkey);
    } else if (zkey.protocolId && zkey.protocolId === FFLONK_PROTOCOL_ID) {
        res = await exportFFlonkVk(zkey);
    } else {
        throw new Error("zkey file protocol unrecognized");
    }

    await fd.close();

    if (logger) logger.info("EXPORT VERIFICATION KEY FINISHED");

    return res;
}


async function groth16Vk(zkey, fd, sections) {
    const curve = await getCurveFromQ(zkey.q);
    const sG1 = curve.G1.F.n8 * 2;

    const alphaBeta = await curve.pairing(zkey.vk_alpha_1, zkey.vk_beta_2);

    let vKey = {
        protocol: zkey.protocol,
        curve: curve.name,
        nPublic: zkey.nPublic,

        vk_alpha_1: curve.G1.toObject(zkey.vk_alpha_1),

        vk_beta_2: curve.G2.toObject(zkey.vk_beta_2),
        vk_gamma_2: curve.G2.toObject(zkey.vk_gamma_2),
        vk_delta_2: curve.G2.toObject(zkey.vk_delta_2),

        vk_alphabeta_12: curve.Gt.toObject(alphaBeta)
    };

    // Read IC Section
    ///////////
    await binFileUtils__namespace.startReadUniqueSection(fd, sections, 3);
    vKey.IC = [];
    for (let i = 0; i <= zkey.nPublic; i++) {
        const buff = await fd.read(sG1);
        const P = curve.G1.toObject(buff);
        vKey.IC.push(P);
    }
    await binFileUtils__namespace.endReadSection(fd);

    vKey = stringifyBigInts$3(vKey);

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

    vKey = stringifyBigInts$3(vKey);

    return vKey;
}

async function exportFFlonkVk(zkey, logger) {
    const curve = await getCurveFromQ(zkey.q);

    let vKey = {
        protocol: zkey.protocol,
        curve: curve.name,
        nPublic: zkey.nPublic,
        power: zkey.power,

        k1: curve.Fr.toObject(zkey.k1),
        k2: curve.Fr.toObject(zkey.k2),

        w: curve.Fr.toObject(curve.Fr.w[zkey.power]),
        //wW: curve.Fr.toObject(curve.Fr.w[zkey.power + 1]),
        w3: curve.Fr.toObject(zkey.w3),
        w4: curve.Fr.toObject(zkey.w4),
        w8: curve.Fr.toObject(zkey.w8),
        wr: curve.Fr.toObject(zkey.wr),

        X_2: curve.G2.toObject(zkey.X_2),

        C0: curve.G1.toObject(zkey.C0),
    };

    return stringifyBigInts$3(vKey);
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

const {unstringifyBigInts: unstringifyBigInts$6, stringifyBigInts: stringifyBigInts$2} = ffjavascript.utils;

async function fflonkExportSolidityVerifier(vk, templates, logger) {
    if (logger) logger.info("FFLONK EXPORT SOLIDITY VERIFIER STARTED");

    const curve = await getCurveFromName(vk.curve);

    // Precompute w3_2, w4_2 and w4_3
    let w3 = fromVkey(vk.w3);
    vk.w3_2 = toVkey(curve.Fr.square(w3));

    let w4 = fromVkey(vk.w4);
    vk.w4_2 = toVkey(curve.Fr.square(w4));
    vk.w4_3 = toVkey(curve.Fr.mul(curve.Fr.square(w4), w4));

    let w8 = fromVkey(vk.w8);
    let acc = curve.Fr.one;

    for (let i = 1; i < 8; i++) {
        acc = curve.Fr.mul(acc, w8);
        vk["w8_" + i] = toVkey(acc);
    }

    let template = templates[vk.protocol];

    if (logger) logger.info("FFLONK EXPORT SOLIDITY VERIFIER FINISHED");

    return ejs__default["default"].render(template, vk);

    function fromVkey(str) {
        const val = unstringifyBigInts$6(str);
        return curve.Fr.fromObject(val);
    }

    function toVkey(val) {
        const str = curve.Fr.toObject(val);
        return stringifyBigInts$2(str);
    }
}

// Not ready yet
// module.exports.generateVerifier_kimleeoh = generateVerifier_kimleeoh;

async function exportSolidityVerifier(zKeyName, templates, logger) {

    const verificationKey = await zkeyExportVerificationKey(zKeyName, logger);

    if ("fflonk" === verificationKey.protocol) {
        return fflonkExportSolidityVerifier(verificationKey, templates, logger);
    }

    let template = templates[verificationKey.protocol];

    return ejs__default["default"].render(template, verificationKey);
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
    if (cirPower < 3) cirPower = 3;   // As the t polynomial is n+5 we need at least a power of 4
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
            // The value is stored in Montgomery. stored = v*R
            // so when montgomery multiplied by the witness, it's result = v*R*w/R = v*w
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

class Proof {
    constructor(curve, logger) {
        this.curve = curve;
        this.logger = logger;

        this.resetProof();
    }

    resetProof() {
        this.polynomials = {};
        this.evaluations = {};
    }

    addPolynomial(key, polynomial) {
        if (key in this.polynomials) {
            this.logger.warn(`proof: polynomial.${key} already exist in proof`);
        }
        this.polynomials[key] = polynomial;
    }

    getPolynomial(key) {
        if (!(key in this.polynomials)) {
            this.logger.warn(`proof: polynomial ${key} does not exist in proof`);
        }
        return this.polynomials[key];
    }

    addEvaluation(key, evaluation) {
        if (key in this.evaluations) {
            this.logger.warn(`proof: evaluations.${key} already exist in proof`);
        }
        this.evaluations[key] = evaluation;
    }

    getEvaluation(key) {
        if (!(key in this.evaluations)) {
            this.logger.warn(`proof: evaluation ${key} does not exist in proof`);
        }
        return this.evaluations[key];
    }

    toObjectProof(splitFields = true) {
        let res = splitFields ? {polynomials: {}, evaluations: {}} : {};

        Object.keys(this.polynomials).forEach(key => {
            const value = this.curve.G1.toObject(this.polynomials[key]);
            if(splitFields) {
                res.polynomials[key] = value;
            } else {
                res[key] = value;
            }
        });

        Object.keys(this.evaluations).forEach(key => {
            const value = this.curve.Fr.toObject(this.evaluations[key]);
            if(splitFields) {
                res.evaluations[key] = value;
            } else {
                res[key] = value;
            }
        });

        return res;
    }

    fromObjectProof(objectProof) {
        this.resetProof();

        Object.keys(objectProof.polynomials).forEach(key => {
            this.polynomials[key] = this.curve.G1.fromObject(objectProof.polynomials[key]);
        });

        Object.keys(objectProof.evaluations).forEach(key => {
            this.evaluations[key] = this.curve.Fr.fromObject(objectProof.evaluations[key]);
        });
    }
}

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
const { keccak256 } = jsSha3__default["default"];

const POLYNOMIAL = 0;
const SCALAR = 1;

class Keccak256Transcript {
    constructor(curve) {
        this.G1 = curve.G1;
        this.Fr = curve.Fr;

        this.reset();
    }

    reset() {
        this.data = [];
    }

    addPolCommitment(polynomialCommitment) {
        this.data.push({type: POLYNOMIAL, data: polynomialCommitment});
    }

    addScalar(scalar) {
        this.data.push({type: SCALAR, data: scalar});
    }

    getChallenge() {
        if(0 === this.data.length) {
            throw new Error("Keccak256Transcript: No data to generate a transcript");
        }

        let nPolynomials = 0;
        let nScalars = 0;

        this.data.forEach(element => POLYNOMIAL === element.type ? nPolynomials++ : nScalars++);

        let buffer = new Uint8Array(nScalars * this.Fr.n8 + nPolynomials * this.G1.F.n8 * 2);
        let offset = 0;

        for (let i = 0; i < this.data.length; i++) {
            if (POLYNOMIAL === this.data[i].type) {
                this.G1.toRprUncompressed(buffer, offset, this.data[i].data);
                offset += this.G1.F.n8 * 2;
            } else {
                this.Fr.toRprBE(buffer, offset, this.data[i].data);
                offset += this.Fr.n8;
            }
        }

        const value = ffjavascript.Scalar.fromRprBE(new Uint8Array(keccak256.arrayBuffer(buffer)));
        return this.Fr.e(value);
    }
}

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

class MulZ {
    static getZ1(Fr) {
        return [
            Fr.zero,
            Fr.add(Fr.e(-1), Fr.w[2]),
            Fr.e(-2),
            Fr.sub(Fr.e(-1), Fr.w[2]),
        ];
    }

    static getZ2(Fr) {
        return [
            Fr.zero,
            Fr.add(Fr.zero, Fr.mul(Fr.e(-2), Fr.w[2])),
            Fr.e(4),
            Fr.sub(Fr.zero, Fr.mul(Fr.e(-2), Fr.w[2])),
        ];
    }

    static getZ3(Fr) {
        return [
            Fr.zero,
            Fr.add(Fr.e(2), Fr.mul(Fr.e(2), Fr.w[2])),
            Fr.e(-8),
            Fr.sub(Fr.e(2), Fr.mul(Fr.e(2), Fr.w[2])),
        ];

    }

    static mul2(a, b, ap, bp, p, Fr) {
        const Z1 = this.getZ1(Fr);
        let r, rz;

        const a_b = Fr.mul(a, b);
        const a_bp = Fr.mul(a, bp);
        const ap_b = Fr.mul(ap, b);
        const ap_bp = Fr.mul(ap, bp);

        r = a_b;

        let a0 = Fr.add(a_bp, ap_b);

        let a1 = ap_bp;

        rz = a0;
        if (p) {
            rz = Fr.add(rz, Fr.mul(Z1[p], a1));
        }

        return [r, rz];
    }

    static mul3(a, b, c, ap, bp, cp, p, Fr) {
        const Z1 = this.getZ1(Fr);
        const Z2 = this.getZ2(Fr);
        let r, rz;

        const a_b = Fr.mul(a, b);
        const a_bp = Fr.mul(a, bp);
        const ap_b = Fr.mul(ap, b);
        const ap_bp = Fr.mul(ap, bp);

        r = Fr.mul(a_b, c);

        let a0 = Fr.mul(ap_b, c);
        a0 = Fr.add(a0, Fr.mul(a_bp, c));
        a0 = Fr.add(a0, Fr.mul(a_b, cp));

        let a1 = Fr.mul(ap_bp, c);
        a1 = Fr.add(a1, Fr.mul(a_bp, cp));
        a1 = Fr.add(a1, Fr.mul(ap_b, cp));

        rz = a0;
        if (p) {
            const a2 = Fr.mul(ap_bp, cp);
            rz = Fr.add(rz, Fr.mul(Z1[p], a1));
            rz = Fr.add(rz, Fr.mul(Z2[p], a2));
        }

        return [r, rz];
    }

    static mul4(a, b, c, d, ap, bp, cp, dp, p, Fr) {
        const Z1 = this.getZ1(Fr);
        const Z2 = this.getZ2(Fr);
        const Z3 = this.getZ3(Fr);

        let r, rz;

        const a_b = Fr.mul(a, b);
        const a_bp = Fr.mul(a, bp);
        const ap_b = Fr.mul(ap, b);
        const ap_bp = Fr.mul(ap, bp);

        const c_d = Fr.mul(c, d);
        const c_dp = Fr.mul(c, dp);
        const cp_d = Fr.mul(cp, d);
        const cp_dp = Fr.mul(cp, dp);

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

const ZKEY_PL_ADDITIONS_SECTION = 3;
const ZKEY_PL_A_MAP_SECTION = 4;
const ZKEY_PL_B_MAP_SECTION = 5;
const ZKEY_PL_C_MAP_SECTION = 6;
const ZKEY_PL_QM_SECTION = 7;
const ZKEY_PL_QL_SECTION = 8;
const ZKEY_PL_QR_SECTION = 9;
const ZKEY_PL_QO_SECTION = 10;
const ZKEY_PL_QC_SECTION = 11;
const ZKEY_PL_SIGMA_SECTION = 12;
const ZKEY_PL_LAGRANGE_SECTION = 13;
const ZKEY_PL_PTAU_SECTION = 14;

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

class Polynomial {
    constructor(coefficients, curve, logger) {
        this.coef = coefficients;
        this.curve = curve;
        this.Fr = curve.Fr;
        this.G1 = curve.G1;
        this.logger = logger;
    }

    static async fromEvaluations(buffer, curve, logger) {
        let coefficients = await curve.Fr.ifft(buffer);

        return new Polynomial(coefficients, curve, logger);
    }

    static fromCoefficientsArray(array, curve, logger) {
        const Fr = curve.Fr;
        let buff = array.length > 2 << 14 ?
            new ffjavascript.BigBuffer(array.length * Fr.n8) : new Uint8Array(array.length * Fr.n8);
        for (let i = 0; i < array.length; i++) buff.set(array[i], i * Fr.n8);

        return new Polynomial(buff, curve, logger);
    }

    static fromPolynomial(polynomial, curve, logger) {
        let length = polynomial.length();
        let Fr = curve.Fr;

        let buff = length > 2 << 14 ?
            new ffjavascript.BigBuffer(length * Fr.n8) : new Uint8Array(length * Fr.n8);
        buff.set(polynomial.coef.slice(), 0);

        return new Polynomial(buff, curve, logger);
    }

    isEqual(polynomial) {
        const degree = this.degree();
        if (degree !== polynomial.degree()) return false;

        for (let i = 0; i < degree + 1; i++) {
            if (!this.Fr.eq(this.getCoef(i), polynomial.getCoef(i))) return false;
        }

        return true;
    }

    blindCoefficients(blindingFactors) {
        blindingFactors = blindingFactors || [];

        const blindedCoefficients = (this.length() + blindingFactors.length) > 2 << 14 ?
            new ffjavascript.BigBuffer((this.length() + blindingFactors.length) * this.Fr.n8) :
            new Uint8Array((this.length() + blindingFactors.length) * this.Fr.n8);

        blindedCoefficients.set(this.coef, 0);
        for (let i = 0; i < blindingFactors.length; i++) {
            blindedCoefficients.set(
                this.Fr.add(
                    blindedCoefficients.slice((this.length() + i) * this.Fr.n8, (this.length() + i + 1) * this.Fr.n8),
                    blindingFactors[i]
                ),
                (this.length() + i) * this.Fr.n8
            );
            blindedCoefficients.set(
                this.Fr.sub(
                    blindedCoefficients.slice(i * this.Fr.n8, (i + 1) * this.Fr.n8),
                    blindingFactors[i]
                ),
                i * this.Fr.n8
            );
        }
        this.coef = blindedCoefficients;
    }

    getCoef(index) {
        const i_n8 = index * this.Fr.n8;

        if (i_n8 + this.Fr.n8 > this.coef.byteLength) return this.Fr.zero;

        return this.coef.slice(i_n8, i_n8 + this.Fr.n8);
    }

    setCoef(index, value) {
        if (index > (this.length() - 1)) {
            throw new Error("Coef index is not available");
        }

        this.coef.set(value, index * this.Fr.n8);
    }

    static async to4T(buffer, domainSize, blindingFactors, Fr) {
        blindingFactors = blindingFactors || [];
        let a = await Fr.ifft(buffer);

        const a4 = (domainSize * 4) > 2 << 14 ?
            new ffjavascript.BigBuffer(domainSize * 4 * Fr.n8) : new Uint8Array(domainSize * 4 * Fr.n8);
        a4.set(a, 0);

        const A4 = await Fr.fft(a4);

        if (blindingFactors.length === 0) {
            return [a, A4];
        }

        const a1 = domainSize + blindingFactors.length > 2 << 14 ?
            new ffjavascript.BigBuffer((domainSize + blindingFactors.length) * Fr.n8) :
            new Uint8Array((domainSize + blindingFactors.length) * Fr.n8);

        a1.set(a, 0);
        for (let i = 0; i < blindingFactors.length; i++) {
            a1.set(
                Fr.add(
                    a1.slice((domainSize + i) * Fr.n8, (domainSize + i + 1) * Fr.n8),
                    blindingFactors[i]
                ),
                (domainSize + i) * Fr.n8
            );
            a1.set(
                Fr.sub(
                    a1.slice(i * Fr.n8, (i + 1) * Fr.n8),
                    blindingFactors[i]
                ),
                i * Fr.n8
            );
        }

        return [a1, A4];
    }

    length() {
        let length = this.coef.byteLength / this.Fr.n8;
        if (length !== Math.floor(this.coef.byteLength / this.Fr.n8)) {
            throw new Error("Polynomial coefficients buffer has incorrect size");
        }
        if (0 === length) {
            if (this.logger) {
                this.logger.warn("Polynomial has length zero");
            }
        }
        return length;
    }

    degree() {
        for (let i = this.length() - 1; i > 0; i--) {
            const i_n8 = i * this.Fr.n8;
            if (!this.Fr.eq(this.Fr.zero, this.coef.slice(i_n8, i_n8 + this.Fr.n8))) {
                return i;
            }
        }

        return 0;
    }

    evaluate(point) {
        let res = this.Fr.zero;

        for (let i = this.degree() + 1; i > 0; i--) {
            let i_n8 = i * this.Fr.n8;
            const currentCoefficient = this.coef.slice(i_n8 - this.Fr.n8, i_n8);
            res = this.Fr.add(currentCoefficient, this.Fr.mul(res, point));
        }

        return res;
    }

    fastEvaluate(point) {
        const Fr = this.Fr;
        let nThreads = 3;

        let nCoefs = this.degree() + 1;
        let coefsThread = parseInt(nCoefs / nThreads);
        let residualCoefs = nCoefs - coefsThread * nThreads;

        let res = [];
        let xN = [];

        xN[0] = Fr.one;

        for (let i = 0; i < nThreads; i++) {
            res[i] = Fr.zero;

            let nCoefs = i === (nThreads - 1) ? coefsThread + residualCoefs : coefsThread;
            for (let j = nCoefs; j > 0; j--) {
                res[i] = Fr.add(this.getCoef((i * coefsThread) + j - 1), Fr.mul(res[i], point));

                if (i === 0) xN[0] = Fr.mul(xN[0], point);
            }
        }

        for (let i = 1; i < nThreads; i++) {
            res[0] = Fr.add(res[0], Fr.mul(xN[i - 1], res[i]));
            xN[i] = Fr.mul(xN[i - 1], xN[0]);
        }

        return res[0];
    }

    add(polynomial, blindingValue) {
        let other = false;

        if (polynomial.length() > this.length()) {
            other = true;
        }

        const thisLength = this.length();
        const polyLength = polynomial.length();
        for (let i = 0; i < Math.max(thisLength, polyLength); i++) {
            const i_n8 = i * this.Fr.n8;

            const a = i < thisLength ? this.coef.slice(i_n8, i_n8 + this.Fr.n8) : this.Fr.zero;
            let b = i < polyLength ? polynomial.coef.slice(i_n8, i_n8 + this.Fr.n8) : this.Fr.zero;

            if (blindingValue !== undefined) {
                b = this.Fr.mul(b, blindingValue);
            }
            if (other) {
                polynomial.coef.set(this.Fr.add(a, b), i_n8);
            } else {
                this.coef.set(this.Fr.add(a, b), i_n8);
            }
        }
        if (other) {
            delete this.coef;
            this.coef = polynomial.coef;
        }
    }

    sub(polynomial, blindingValue) {
        let other = false;

        if (polynomial.length() > this.length()) {
            other = true;
        }

        const thisLength = this.length();
        const polyLength = polynomial.length();
        for (let i = 0; i < Math.max(thisLength, polyLength); i++) {
            const i_n8 = i * this.Fr.n8;

            const a = i < thisLength ? this.coef.slice(i_n8, i_n8 + this.Fr.n8) : this.Fr.zero;
            let b = i < polyLength ? polynomial.coef.slice(i_n8, i_n8 + this.Fr.n8) : this.Fr.zero;

            if (blindingValue !== undefined) {
                b = this.Fr.mul(b, blindingValue);
            }
            if (other) {
                polynomial.coef.set(this.Fr.sub(a, b), i_n8);
            } else {
                this.coef.set(this.Fr.sub(a, b), i_n8);
            }
        }
        if (other) {
            delete this.coef;
            this.coef = polynomial.coef;
        }
    }

    mulScalar(value) {
        for (let i = 0; i < this.length(); i++) {
            const i_n8 = i * this.Fr.n8;

            this.coef.set(this.Fr.mul(this.coef.slice(i_n8, i_n8 + this.Fr.n8), value), i_n8);
        }
    }

    addScalar(value) {
        const currentValue = 0 === this.length() ? this.Fr.zero : this.coef.slice(0, this.Fr.n8);
        this.coef.set(this.Fr.add(currentValue, value), 0);
    }

    subScalar(value) {
        const currentValue = 0 === this.length() ? this.Fr.zero : this.coef.slice(0, this.Fr.n8);
        this.coef.set(this.Fr.sub(currentValue, value), 0);
    }

    // Multiply current polynomial by the polynomial (X - value)
    byXSubValue(value) {
        const Fr = this.Fr;
        const resize = !Fr.eq(Fr.zero, this.getCoef(this.length() - 1));

        const length = resize ? this.length() + 1 : this.length();
        const buff = length > 2 << 14 ? new ffjavascript.BigBuffer(length * Fr.n8) : new Uint8Array(length * Fr.n8);
        let pol = new Polynomial(buff, this.curve, this.logger);

        // Step 0: Set current coefficients to the new buffer shifted one position
        pol.coef.set(this.coef.slice(0, (length - 1) * Fr.n8), 32);

        // Step 1: multiply each coefficient by (-value)
        this.mulScalar(Fr.neg(value));

        // Step 2: Add current polynomial to destination polynomial
        pol.add(this);

        // Swap buffers
        this.coef = pol.coef;
    }

    // Multiply current polynomial by the polynomial (X^n + value)
    byXNSubValue(n, value) {
        const Fr = this.Fr;
        const resize = !(this.length() - n - 1 >= this.degree());

        const length = resize ? this.length() + n : this.length();
        const buff = length > 2 << 14 ? new ffjavascript.BigBuffer(length * Fr.n8) : new Uint8Array(length * Fr.n8);
        let pol = new Polynomial(buff, this.curve, this.logger);

        // Step 0: Set current coefficients to the new buffer shifted one position
        pol.coef.set(this.coef.slice(0, (this.degree() + 1) * 32, ), n * 32);

        // Step 1: multiply each coefficient by (- value)
        this.mulScalar(value);

        // Step 2: Add current polynomial to destination polynomial
        pol.add(this);

        // Swap buffers
        this.coef = pol.coef;
    }

    // Euclidean division
    divBy(polynomial) {
        const Fr = this.Fr;
        const degreeA = this.degree();
        const degreeB = polynomial.degree();

        let polR = new Polynomial(this.coef, this.curve, this.logger);

        this.coef = this.length() > 2 << 14 ?
            new ffjavascript.BigBuffer(this.length() * Fr.n8) : new Uint8Array(this.length() * Fr.n8);

        for (let i = degreeA - degreeB; i >= 0; i--) {
            this.setCoef(i, Fr.div(polR.getCoef(i + degreeB), polynomial.getCoef(degreeB)));
            for (let j = 0; j <= degreeB; j++) {
                polR.setCoef(i + j, Fr.sub(polR.getCoef(i + j), Fr.mul(this.getCoef(i), polynomial.getCoef(j))));
            }
        }

        return polR;
    }

    // Division by a Polynomial of the form (x^m - beta)
    divByMonic(m, beta) {
        const Fr = this.Fr;

        let d = this.degree();

        let buffer = this.length() > 2 << 14 ?
            new ffjavascript.BigBuffer(this.length() * Fr.n8) : new Uint8Array(this.length() * Fr.n8);
        let quotient = new Polynomial(buffer, this.curve, this.logger);

        let bArr = [];

        // Add the m leading coefficients of this to quotient
        for (let i = 0; i < m; i++) {
            quotient.setCoef((d - i) - m, this.getCoef(d - i));
            bArr[i] = this.getCoef(d - i);
        }

        let nThreads = m;
        for (let k = 0; k < nThreads; k++) {
            for (let i = d - 2 * m - k; i >= 0; i = i - nThreads) {
                if (i < 0) break;
                let idx = k;
                bArr[idx] = Fr.add(this.getCoef(i + m), Fr.mul(bArr[idx], beta));

                quotient.setCoef(i, bArr[idx]);
            }
        }

        this.coef = quotient.coef;
    }

    divByVanishing(n, beta) {
        if (this.degree() < n) {
            throw new Error("divByVanishing polynomial divisor must be of degree lower than the dividend polynomial");
        }

        const Fr = this.Fr;

        let polR = new Polynomial(this.coef, this.curve, this.logger);

        this.coef = this.length() > 2 << 14 ?
            new ffjavascript.BigBuffer(this.length() * Fr.n8) : new Uint8Array(this.length() * Fr.n8);

        for (let i = this.length() - 1; i >= n; i--) {
            let leadingCoef = polR.getCoef(i);
            if (Fr.eq(Fr.zero, leadingCoef)) continue;

            polR.setCoef(i, Fr.zero);
            polR.setCoef(i - n, Fr.add(polR.getCoef(i - n), Fr.mul(beta, leadingCoef)));
            this.setCoef(i - n, Fr.add(this.getCoef(i - n), leadingCoef));
        }

        return polR;
    }

    divByVanishing2(m, beta) {
        if (this.degree() < m) {
            throw new Error("divByVanishing polynomial divisor must be of degree lower than the dividend polynomial");
        }

        const Fr = this.Fr;

        let polR = new Polynomial(this.coef, this.curve, this.logger);

        this.coef = this.length() > 2 << 14 ?
            new ffjavascript.BigBuffer(this.length() * Fr.n8) : new Uint8Array(this.length() * Fr.n8);

        let nThreads = 3;
        let nTotal = this.length() - m;
        let nElementsChunk = Math.floor(nTotal / nThreads);
        let nElementsLast = nTotal - (nThreads - 1) * nElementsChunk;

        console.log(nTotal);
        console.log(nElementsChunk + "  " + nElementsLast);
        for (let k = 0; k < nThreads; k++) {
            console.log("> Thread " + k);
            for (let i = (k === 0 ? nElementsLast : nElementsChunk); i > 0; i--) {
                let idxDst = i - 1;
                if (k !== 0) idxDst += (k - 1) * nElementsChunk + nElementsLast;
                let idxSrc = idxDst + m;

                let leadingCoef = polR.getCoef(idxSrc);
                if (Fr.eq(Fr.zero, leadingCoef)) continue;

                polR.setCoef(idxSrc, Fr.zero);
                polR.setCoef(idxDst, Fr.add(polR.getCoef(idxDst), Fr.mul(beta, leadingCoef)));
                this.setCoef(idxDst, Fr.add(this.getCoef(idxDst), leadingCoef));
                console.log(idxDst + " <-- " + idxSrc);
            }
        }

        this.print();
        return polR;
    }

    fastDivByVanishing(data) {
        const Fr = this.Fr;

        for (let i = 0; i < data.length; i++) {

            let m = data[i][0];
            let beta = data[i][1];

            if (this.degree() < m) {
                throw new Error("divByVanishing polynomial divisor must be of degree lower than the dividend polynomial");
            }

            let nThreads = 5;
            let nElements = this.length() - m;
            let nElementsBucket = Math.floor(nElements / nThreads / m);
            let nElementsChunk = nElementsBucket * m;
            let nElementsLast = nElements - nThreads * nElementsChunk;

            //In C++ implementation this buffer will be allocated only once outside the loop
            let polTmp = new Polynomial(this.length() > 2 << 14 ?
                new ffjavascript.BigBuffer(this.length() * Fr.n8) : new Uint8Array(this.length() * Fr.n8), this.curve, this.logger);

            let ptr = this.coef;
            this.coef = polTmp.coef;
            polTmp.coef = ptr;

            // STEP 1: Setejar els m valors del següent bucket al chunk actual, PARALEL·LITZAR
            for (let k = 0; k < nThreads; k++) {
                let idx0 = (k + 1) * nElementsChunk + nElementsLast;
                for (let i = 0; i < m; i++) {
                    this.setCoef(idx0 + i - m, polTmp.getCoef(idx0 + i));
                }

                for (let i = 0; i < nElementsChunk - m; i++) {
                    let offset = idx0 - i - 1;
                    let val = Fr.add(polTmp.getCoef(offset), Fr.mul(beta, this.getCoef(offset)));
                    this.setCoef(offset - m, val);
                }
            }

            //STEP 2: Setejar els valors del elements last NO PARAL·LELITZAR
            let idx0 = nElementsLast;
            let pending = nElementsLast;
            for (let i = 0; i < m && pending; i++) {
                this.setCoef(idx0 - i - 1, polTmp.getCoef(idx0 + m - i - 1));
                pending--;
            }

            for (let i = 0; i < pending; i++) {
                let offset = idx0 - i - 1;
                let val = Fr.add(polTmp.getCoef(offset), Fr.mul(beta, this.getCoef(offset)));
                this.setCoef(offset - m, val);
            }

            //Step 3: calcular acumulats NO  PARALEL·LITZAR

            let acc = [];
            let betaPow = Fr.one;
            for (let i = 0; i < nElementsBucket; i++) {
                betaPow = Fr.mul(betaPow, beta);
            }
            let currentBeta = Fr.one;

            for (let k = nThreads; k > 0; k--) {
                let idThread = k - 1;
                let idx0 = idThread * nElementsChunk + nElementsLast;
                acc[idThread] = [];

                for (let i = 0; i < m; i++) {
                    acc[idThread][i] = this.getCoef(idx0 + i);

                    if (k !== nThreads) {
                        acc[idThread][i] = Fr.add(acc[idThread][i], Fr.mul(betaPow, acc[idThread + 1][i]));
                    }
                }
                currentBeta = Fr.mul(currentBeta, betaPow);
            }

            //STEP 4 recalcular  PARALEL·LITZAR
            for (let k = 0; k < nThreads; k++) {

                let idx0 = k * nElementsChunk + nElementsLast;
                let currentBeta = beta; //Quan hopassem a C++ i ho paralelitzem aquesta variable ha de ser privada
                let currentM = m - 1;

                let limit = k === 0 ? nElementsLast : nElementsChunk;
                for (let i = 0; i < limit; i++) {
                    let offset = idx0 - i - 1;
                    let val = Fr.add(this.getCoef(offset), Fr.mul(currentBeta, acc[k][currentM]));

                    this.setCoef(offset, val);

                    // To avoid modular operations in each loop...
                    if (currentM === 0) {
                        currentM = m - 1;
                        currentBeta = Fr.mul(currentBeta, beta);
                    } else {
                        currentM--;
                    }
                }
            }
        }
    }


    // Divide polynomial by X - value
    divByXSubValue(value) {
        const coefs = this.length() > 2 << 14 ?
            new ffjavascript.BigBuffer(this.length() * this.Fr.n8) : new Uint8Array(this.length() * this.Fr.n8);

        coefs.set(this.Fr.zero, (this.length() - 1) * this.Fr.n8);
        coefs.set(this.coef.slice((this.length() - 1) * this.Fr.n8, this.length() * this.Fr.n8), (this.length() - 2) * this.Fr.n8);
        for (let i = this.length() - 3; i >= 0; i--) {
            let i_n8 = i * this.Fr.n8;
            coefs.set(
                this.Fr.add(
                    this.coef.slice(i_n8 + this.Fr.n8, i_n8 + 2 * this.Fr.n8),
                    this.Fr.mul(value, coefs.slice(i_n8 + this.Fr.n8, i_n8 + 2 * this.Fr.n8))
                ),
                i * this.Fr.n8
            );
        }
        if (!this.Fr.eq(
            this.coef.slice(0, this.Fr.n8),
            this.Fr.mul(this.Fr.neg(value), coefs.slice(0, this.Fr.n8))
        )) {
            throw new Error("Polynomial does not divide");
        }

        this.coef = coefs;
    }

    divZh(domainSize, extensions = 4) {
        for (let i = 0; i < domainSize; i++) {
            const i_n8 = i * this.Fr.n8;
            this.coef.set(this.Fr.neg(this.coef.slice(i_n8, i_n8 + this.Fr.n8)), i_n8);
        }

        const upperBound = this.coef.byteLength / this.Fr.n8;
        for (let i = domainSize; i < upperBound; i++) {
            const i_n8 = i * this.Fr.n8;

            const a = this.Fr.sub(
                this.coef.slice((i - domainSize) * this.Fr.n8, (i - domainSize) * this.Fr.n8 + this.Fr.n8),
                this.coef.slice(i_n8, i_n8 + this.Fr.n8)
            );
            this.coef.set(a, i_n8);
            if (i > (domainSize * (extensions-1) - extensions)) {
                if (!this.Fr.isZero(a)) {
                    throw new Error("Polynomial is not divisible");
                }
            }
        }

        return this;
    }

    divByZerofier(n, beta) {
        let Fr = this.Fr;
        const invBeta = Fr.inv(beta);
        const invBetaNeg = Fr.neg(invBeta);

        let isOne = Fr.eq(Fr.one, invBetaNeg);
        let isNegOne = Fr.eq(Fr.negone, invBetaNeg);

        if (!isOne) {
            for (let i = 0; i < n; i++) {
                const i_n8 = i * this.Fr.n8;
                let element;

                // If invBetaNeg === -1 we'll save a multiplication changing it by a neg function call
                if (isNegOne) {
                    element = Fr.neg(this.coef.slice(i_n8, i_n8 + this.Fr.n8));
                } else {
                    element = Fr.mul(invBetaNeg, this.coef.slice(i_n8, i_n8 + this.Fr.n8));
                }

                this.coef.set(element, i_n8);
            }
        }

        isOne = Fr.eq(Fr.one, invBeta);
        isNegOne = Fr.eq(Fr.negone, invBeta);

        for (let i = n; i < this.length(); i++) {
            const i_n8 = i * this.Fr.n8;
            const i_prev_n8 = (i - n) * this.Fr.n8;

            let element = this.Fr.sub(
                this.coef.slice(i_prev_n8, i_prev_n8 + this.Fr.n8),
                this.coef.slice(i_n8, i_n8 + this.Fr.n8)
            );

            // If invBeta === 1 we'll not do anything
            if(!isOne) {
                // If invBeta === -1 we'll save a multiplication changing it by a neg function call
                if(isNegOne) {
                    element = Fr.neg(element);
                } else {
                    element = Fr.mul(invBeta, element);
                }
            }

            this.coef.set(element, i_n8);

            // Check if polynomial is divisible by checking if n high coefficients are zero
            if (i > this.length() - n - 1) {
                if (!this.Fr.isZero(element)) {
                    throw new Error("Polynomial is not divisible");
                }
            }
        }

        return this;
    }

// function divideByVanishing(f, n, p) {
//     // polynomial division f(X) / (X^n - 1) with remainder
//     // very cheap, 0 multiplications
//     // strategy:
//     // start with q(X) = 0, r(X) = f(X)
//     // then start changing q, r while preserving the identity:
//     // f(X) = q(X) * (X^n - 1) + r(X)
//     // in every step, move highest-degree term of r into the product
//     // => r eventually has degree < n and we're done
//     let q = Array(f.length).fill(0n);
//     let r = [...f];
//     for (let i = f.length - 1; i >= n; i--) {
//         let leadingCoeff = r[i];
//         if (leadingCoeff === 0n) continue;
//         r[i] = 0n;
//         r[i - n] = mod(r[i - n] + leadingCoeff, p);
//         q[i - n] = mod(q[i - n] + leadingCoeff, p);
//     }
//     return [q, r];
// }

    byX() {
        const coefs = (this.length() + 1) > 2 << 14 ?
            new ffjavascript.BigBuffer(this.coef.byteLength + this.Fr.n8) : new Uint8Array(this.coef.byteLength + this.Fr.n8);
        coefs.set(this.Fr.zero, 0);
        coefs.set(this.coef, this.Fr.n8);

        this.coef = coefs;
    }

// Compute a new polynomial f(x^n) from f(x)
// f(x)   = a_0 + a_1·x + a_2·x^2 + ... + a_j·x^j
// f(x^n) = a_0 + a_1·x^n + a_2·x^2n + ... + a_j·x^jn
    static
    async expX(polynomial, n, truncate = false) {
        const Fr = polynomial.Fr;

        if (n < 1) {
            // n == 0 not allowed because it has no sense, but if it's necessary we have to return
            // a zero degree polynomial with a constant coefficient equals to the sum of all the original coefficients
            throw new Error("Compute a new polynomial to a zero or negative number is not allowed");
        } else if (1 === n) {
            return await Polynomial.fromEvaluations(polynomial.coef, curve, polynomial.logger);
        }

        // length is the length of non-constant coefficients
        // if truncate === true, the highest zero coefficients (if exist) will be removed
        const length = truncate ? polynomial.degree() : (polynomial.length() - 1);
        const bufferDst = (length * n + 1) > 2 << 14 ?
            new ffjavascript.BigBuffer((length * n + 1) * Fr.n8) : new Uint8Array((length * n + 1) * Fr.n8);

        // Copy constant coefficient as is because is not related to x
        bufferDst.set(polynomial.getCoef(0), 0);

        for (let i = 1; i <= length; i++) {
            const i_sFr = i * Fr.n8;

            const coef = polynomial.getCoef(i);
            bufferDst.set(coef, i_sFr * n);
        }

        return new Polynomial(bufferDst, polynomial.curve, polynomial.logger);
    }

    split(numPols, degPols, blindingFactors) {
        if (numPols < 1) {
            throw new Error(`Polynomials can't be split in ${numPols} parts`);
        } else if (1 === numPols) {
            return [this];
        }

        //blinding factors can be void or must have a length of numPols - 1
        if (0 !== blindingFactors.length && blindingFactors.length < numPols - 1) {
            throw new Error(`Blinding factors length must be ${numPols - 1}`);
        }

        const chunkByteLength = (degPols + 1) * this.Fr.n8;
        let res = [];

        // Check polynomial can be split in numChunks parts of chunkSize bytes...
        const numRealPols = Math.ceil((this.degree() + 1) * this.Fr.n8 / chunkByteLength);
        if (numRealPols < numPols) {
            //throw new Error(`Polynomial is short to be split in ${numPols} parts of ${degPols} coefficients each.`);
            for (let i = numRealPols; i < numPols; i++) {
                res[i] = new Polynomial(new Uint8Array(this.Fr.n8), this.curve, this.logger);
            }
        }

        numPols = Math.min(numPols, numRealPols);
        for (let i = 0; i < numPols; i++) {
            const isLast = (numPols - 1) === i;
            const byteLength = isLast ? this.coef.byteLength - ((numPols - 1) * chunkByteLength) : chunkByteLength + this.Fr.n8;

            let buff = (byteLength / this.Fr.n8) > 2 << 14 ? new ffjavascript.BigBuffer(byteLength) : new Uint8Array(byteLength);
            res[i] = new Polynomial(buff, this.curve, this.logger);

            const fr = i * chunkByteLength;
            const to = isLast ? this.coef.byteLength : (i + 1) * chunkByteLength;
            res[i].coef.set(this.coef.slice(fr, to), 0);

            // Add a blinding factor as higher degree
            if (!isLast) {
                res[i].coef.set(blindingFactors[i], chunkByteLength);
            }

            // Sub blinding factor to the lowest degree
            if (0 !== i) {
                const lowestDegree = this.Fr.sub(res[i].coef.slice(0, this.Fr.n8), blindingFactors[i - 1]);
                res[i].coef.set(lowestDegree, 0);
            }

            if (isLast) {
                res[i].truncate();
            }
        }

        return res;

        // // compute t_low(X)
        // let polTLow = new BigBuffer((chunkSize + 1) * n8r);
        // polTLow.set(t.slice(0, zkey.domainSize * n8r), 0);
        // // Add blinding scalar b_10 as a new coefficient n
        // polTLow.set(ch.b[10], zkey.domainSize * n8r);
        //
        // // compute t_mid(X)
        // let polTMid = new BigBuffer((zkey.domainSize + 1) * n8r);
        // polTMid.set(t.slice(zkey.domainSize * n8r, zkey.domainSize * 2 * n8r), 0);
        // // Subtract blinding scalar b_10 to the lowest coefficient of t_mid
        // const lowestMid = Fr.sub(polTMid.slice(0, n8r), ch.b[10]);
        // polTMid.set(lowestMid, 0);
        // // Add blinding scalar b_11 as a new coefficient n
        // polTMid.set(ch.b[11], zkey.domainSize * n8r);
        //
        // // compute t_high(X)
        // let polTHigh = new BigBuffer((zkey.domainSize + 6) * n8r);
        // polTHigh.set(t.slice(zkey.domainSize * 2 * n8r, (zkey.domainSize * 3 + 6) * n8r), 0);
        // //Subtract blinding scalar b_11 to the lowest coefficient of t_high
        // const lowestHigh = Fr.sub(polTHigh.slice(0, n8r), ch.b[11]);
        // polTHigh.set(lowestHigh, 0);
        //
        // proof.T1 = await expTau(polTLow, "multiexp T1");
        // proof.T2 = await expTau(polTMid, "multiexp T2");
        // proof.T3 = await expTau(polTHigh, "multiexp T3");
    }

// split2(degPols, blindingFactors) {
//     let currentDegree = this.degree();
//     const numFilledPols = Math.ceil((currentDegree + 1) / (degPols + 1));
//
//     //blinding factors can be void or must have a length of numPols - 1
//     if (0 !== blindingFactors.length && blindingFactors.length < numFilledPols - 1) {
//         throw new Error(`Blinding factors length must be ${numFilledPols - 1}`);
//     }
//
//     const chunkByteLength = (degPols + 1) * this.Fr.n8;
//
//     // Check polynomial can be split in numChunks parts of chunkSize bytes...
//     if (this.coef.byteLength / chunkByteLength <= numFilledPols - 1) {
//         throw new Error(`Polynomial is short to be split in ${numFilledPols} parts of ${degPols} coefficients each.`);
//     }
//
//     let res = [];
//     for (let i = 0; i < numFilledPols; i++) {
//         const isLast = (numFilledPols - 1) === i;
//         const byteLength = isLast ? (currentDegree + 1) * this.Fr.n8 - ((numFilledPols - 1) * chunkByteLength) : chunkByteLength + this.Fr.n8;
//
//         res[i] = new Polynomial(new BigBuffer(byteLength), this.Fr, this.logger);
//         const fr = i * chunkByteLength;
//         const to = isLast ? (currentDegree + 1) * this.Fr.n8 : (i + 1) * chunkByteLength;
//         res[i].coef.set(this.coef.slice(fr, to), 0);
//
//         // Add a blinding factor as higher degree
//         if (!isLast) {
//             res[i].coef.set(blindingFactors[i], chunkByteLength);
//         }
//
//         // Sub blinding factor to the lowest degree
//         if (0 !== i) {
//             const lowestDegree = this.Fr.sub(res[i].coef.slice(0, this.Fr.n8), blindingFactors[i - 1]);
//             res[i].coef.set(lowestDegree, 0);
//         }
//     }
//
//     return res;
// }

// merge(pols, overlap = true) {
//     let length = 0;
//     for (let i = 0; i < pols.length; i++) {
//         length += pols[i].length();
//     }
//
//     if (overlap) {
//         length -= pols.length - 1;
//     }
//
//     let res = new Polynomial(new BigBuffer(length * this.Fr.n8));
//     for (let i = 0; i < pols.length; i++) {
//         const byteLength = pols[i].coef.byteLength;
//         if (0 === i) {
//             res.coef.set(pols[i].coef, 0);
//         } else {
//
//         }
//     }
//
//     return res;
// }

    truncate() {
        const deg = this.degree();
        if (deg + 1 < this.coef.byteLength / this.Fr.n8) {
            const newCoefs = (deg + 1) > 2 << 14 ?
                new ffjavascript.BigBuffer((deg + 1) * this.Fr.n8) : new Uint8Array((deg + 1) * this.Fr.n8);

            newCoefs.set(this.coef.slice(0, (deg + 1) * this.Fr.n8), 0);
            this.coef = newCoefs;
        }
    }

    static lagrangePolynomialInterpolation(xArr, yArr, curve) {
        const Fr = curve.Fr;
        let polynomial = computeLagrangePolynomial(0);
        for (let i = 1; i < xArr.length; i++) {
            polynomial.add(computeLagrangePolynomial(i));
        }

        return polynomial;

        function computeLagrangePolynomial(i) {
            let polynomial;

            for (let j = 0; j < xArr.length; j++) {
                if (j === i) continue;

                if (polynomial === undefined) {
                    let buff = (xArr.length) > 2 << 14 ?
                        new ffjavascript.BigBuffer((xArr.length) * Fr.n8) : new Uint8Array((xArr.length) * Fr.n8);
                    polynomial = new Polynomial(buff, curve);
                    polynomial.setCoef(0, Fr.neg(xArr[j]));
                    polynomial.setCoef(1, Fr.one);
                } else {
                    polynomial.byXSubValue(xArr[j]);
                }
            }

            let denominator = polynomial.evaluate(xArr[i]);
            denominator = Fr.inv(denominator);
            const mulFactor = Fr.mul(yArr[i], denominator);

            polynomial.mulScalar(mulFactor);

            return polynomial;
        }
    }

    static zerofierPolynomial(xArr, curve) {
        const Fr = curve.Fr;
        let buff = (xArr.length + 1) > 2 << 14 ?
            new ffjavascript.BigBuffer((xArr.length + 1) * Fr.n8) : new Uint8Array((xArr.length + 1) * Fr.n8);
        let polynomial = new Polynomial(buff, curve);

        // Build a zerofier polynomial with the following form:
        // zerofier(X) = (X-xArr[0])(X-xArr[1])...(X-xArr[n])
        polynomial.setCoef(0, Fr.neg(xArr[0]));
        polynomial.setCoef(1, Fr.one);

        for (let i = 1; i < xArr.length; i++) {
            polynomial.byXSubValue(xArr[i]);
        }

        return polynomial;
    }

    print() {
        const Fr = this.Fr;
        let res = "";
        for (let i = this.degree(); i >= 0; i--) {
            const coef = this.getCoef(i);
            if (!Fr.eq(Fr.zero, coef)) {
                if (Fr.isNegative(coef)) {
                    res += " - ";
                } else if (i !== this.degree()) {
                    res += " + ";
                }
                res += Fr.toString(coef);
                if (i > 0) {
                    res += i > 1 ? "x^" + i : "x";
                }
            }
        }
        console.log(res);
    }

    async multiExponentiation(PTau, name) {
        const n = this.coef.byteLength / this.Fr.n8;
        const PTauN = PTau.slice(0, n * this.G1.F.n8 * 2);
        const bm = await this.Fr.batchFromMontgomery(this.coef);
        let res = await this.G1.multiExpAffine(PTauN, bm, this.logger, name);
        res = this.G1.toAffine(res);
        return res;
    }
}

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

class Evaluations {
    constructor(evaluations, curve, logger) {
        this.eval = evaluations;
        this.curve = curve;
        this.Fr = curve.Fr;
        this.logger = logger;
    }

    static async fromPolynomial(polynomial, extension, curve, logger) {
        const coefficientsN = new ffjavascript.BigBuffer(polynomial.length() * extension * curve.Fr.n8);
        coefficientsN.set(polynomial.coef, 0);

        const evaluations = await curve.Fr.fft(coefficientsN);

        return new Evaluations(evaluations, curve, logger);
    }

    getEvaluation(index) {
        const i_n8 = index * this.Fr.n8;

        if (i_n8 + this.Fr.n8 > this.eval.byteLength) {
            throw new Error("Evaluations.getEvaluation() out of bounds");
        }

        return this.eval.slice(i_n8, i_n8 + this.Fr.n8);
    }

    length() {
        let length = this.eval.byteLength / this.Fr.n8;
        if (length !== Math.floor(this.eval.byteLength / this.Fr.n8)) {
            throw new Error("Polynomial evaluations buffer has incorrect size");
        }
        if (0 === length) {
            this.logger.warn("Polynomial has length zero");
        }
        return length;
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
const {stringifyBigInts: stringifyBigInts$1} = ffjavascript.utils;
    
async function plonk16Prove(zkeyFileName, witnessFileName, logger, options) {
    const {fd: fdWtns, sections: sectionsWtns} = await binFileUtils__namespace.readBinFile(witnessFileName, "wtns", 2, 1<<25, 1<<23);

    // Read witness file
    if (logger) logger.debug("> Reading witness file");
    const wtns = await readHeader(fdWtns, sectionsWtns);

    // Read zkey file
    if (logger) logger.debug("> Reading zkey file");
    const {fd: fdZKey, sections: zkeySections} = await binFileUtils__namespace.readBinFile(zkeyFileName, "zkey", 2, 1<<25, 1<<23);

    const zkey = await readHeader$1(fdZKey, zkeySections, undefined, options);
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
    const buffWitness = await binFileUtils__namespace.readSection(fdWtns, sectionsWtns, 2);

    // First element in plonk is not used and can be any value. (But always the same).
    // We set it to zero to go faster in the exponentiations.
    buffWitness.set(Fr.zero, 0);
    const buffInternalWitness = new ffjavascript.BigBuffer(n8r*zkey.nAdditions);

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
    polynomials.Sigma1 = new Polynomial(new ffjavascript.BigBuffer(sDomain), curve, logger);
    polynomials.Sigma2 = new Polynomial(new ffjavascript.BigBuffer(sDomain), curve, logger);
    polynomials.Sigma3 = new Polynomial(new ffjavascript.BigBuffer(sDomain), curve, logger);

    await fdZKey.readToBuffer(polynomials.Sigma1.coef, 0, sDomain, zkeySections[ZKEY_PL_SIGMA_SECTION][0].p);
    await fdZKey.readToBuffer(polynomials.Sigma2.coef, 0, sDomain, zkeySections[ZKEY_PL_SIGMA_SECTION][0].p + 5 * sDomain);
    await fdZKey.readToBuffer(polynomials.Sigma3.coef, 0, sDomain, zkeySections[ZKEY_PL_SIGMA_SECTION][0].p + 10 * sDomain);

    if (logger) logger.debug("··· Reading Sigma evaluations");
    evaluations.Sigma1 = new Evaluations(new ffjavascript.BigBuffer(sDomain * 4), curve, logger);
    evaluations.Sigma2 = new Evaluations(new ffjavascript.BigBuffer(sDomain * 4), curve, logger);
    evaluations.Sigma3 = new Evaluations(new ffjavascript.BigBuffer(sDomain * 4), curve, logger);

    await fdZKey.readToBuffer(evaluations.Sigma1.eval, 0, sDomain * 4, zkeySections[ZKEY_PL_SIGMA_SECTION][0].p + sDomain);
    await fdZKey.readToBuffer(evaluations.Sigma2.eval, 0, sDomain * 4, zkeySections[ZKEY_PL_SIGMA_SECTION][0].p + 6 * sDomain);
    await fdZKey.readToBuffer(evaluations.Sigma3.eval, 0, sDomain * 4, zkeySections[ZKEY_PL_SIGMA_SECTION][0].p + 11 * sDomain);

    if (logger) logger.debug(`> Reading Section ${ZKEY_PL_PTAU_SECTION}. Powers of Tau`);
    const PTau = await binFileUtils__namespace.readSection(fdZKey, zkeySections, ZKEY_PL_PTAU_SECTION);

    let publicSignals = [];

    for (let i=1; i<= zkey.nPublic; i++) {
        const pub = buffWitness.slice(i*Fr.n8, i*Fr.n8+Fr.n8);
        publicSignals.push(ffjavascript.Scalar.fromRprLE(pub));
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
        proof: stringifyBigInts$1(_proof),
        publicSignals: stringifyBigInts$1(publicSignals)
    };

    async function calculateAdditions() {
        if (logger) logger.debug("··· Computing additions");
        const additionsBuff = await binFileUtils__namespace.readSection(fdZKey, zkeySections, ZKEY_PL_ADDITIONS_SECTION);

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
        buffers.A = new ffjavascript.BigBuffer(sDomain);
        buffers.B = new ffjavascript.BigBuffer(sDomain);
        buffers.C = new ffjavascript.BigBuffer(sDomain);

        // Read zkey file to the buffers
        const aMapBuff = await binFileUtils__namespace.readSection(fdZKey, zkeySections, ZKEY_PL_A_MAP_SECTION);
        const bMapBuff = await binFileUtils__namespace.readSection(fdZKey, zkeySections, ZKEY_PL_B_MAP_SECTION);
        const cMapBuff = await binFileUtils__namespace.readSection(fdZKey, zkeySections, ZKEY_PL_C_MAP_SECTION);

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

        let numArr = new ffjavascript.BigBuffer(sDomain);
        let denArr = new ffjavascript.BigBuffer(sDomain);

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
        evaluations.QL = new Evaluations(new ffjavascript.BigBuffer(sDomain * 4), curve, logger);
        evaluations.QR = new Evaluations(new ffjavascript.BigBuffer(sDomain * 4), curve, logger);
        evaluations.QM = new Evaluations(new ffjavascript.BigBuffer(sDomain * 4), curve, logger);
        evaluations.QO = new Evaluations(new ffjavascript.BigBuffer(sDomain * 4), curve, logger);
        evaluations.QC = new Evaluations(new ffjavascript.BigBuffer(sDomain * 4), curve, logger);

        // Read Q's evaluations from zkey file
        await fdZKey.readToBuffer(evaluations.QL.eval, 0, sDomain * 4, zkeySections[ZKEY_PL_QL_SECTION][0].p + sDomain);
        await fdZKey.readToBuffer(evaluations.QR.eval, 0, sDomain * 4, zkeySections[ZKEY_PL_QR_SECTION][0].p + sDomain);
        await fdZKey.readToBuffer(evaluations.QM.eval, 0, sDomain * 4, zkeySections[ZKEY_PL_QM_SECTION][0].p + sDomain);
        await fdZKey.readToBuffer(evaluations.QO.eval, 0, sDomain * 4, zkeySections[ZKEY_PL_QO_SECTION][0].p + sDomain);
        await fdZKey.readToBuffer(evaluations.QC.eval, 0, sDomain * 4, zkeySections[ZKEY_PL_QC_SECTION][0].p + sDomain);

        // Read Lagrange polynomials & evaluations from zkey file
        evaluations.Lagrange = new Evaluations(new ffjavascript.BigBuffer(sDomain * 4 * zkey.nPublic), curve, logger);

        for (let i = 0; i < zkey.nPublic; i++) {
            await fdZKey.readToBuffer(evaluations.Lagrange.eval, i * sDomain * 4, sDomain * 4, zkeySections[ZKEY_PL_LAGRANGE_SECTION][0].p + i * 5 * sDomain + sDomain);
        }

        buffers.T = new ffjavascript.BigBuffer(sDomain * 4);
        buffers.Tz = new ffjavascript.BigBuffer(sDomain * 4);

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
        polynomials.T1 = new Polynomial(new ffjavascript.BigBuffer((zkey.domainSize + 1) * n8r), curve, logger);
        polynomials.T2 = new Polynomial(new ffjavascript.BigBuffer((zkey.domainSize + 1) * n8r), curve, logger);
        polynomials.T3 = new Polynomial(new ffjavascript.BigBuffer((zkey.domainSize + 6) * n8r), curve, logger);

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
        polynomials.QL = new Polynomial(new ffjavascript.BigBuffer(sDomain), curve, logger);
        polynomials.QR = new Polynomial(new ffjavascript.BigBuffer(sDomain), curve, logger);
        polynomials.QM = new Polynomial(new ffjavascript.BigBuffer(sDomain), curve, logger);
        polynomials.QO = new Polynomial(new ffjavascript.BigBuffer(sDomain), curve, logger);
        polynomials.QC = new Polynomial(new ffjavascript.BigBuffer(sDomain), curve, logger);

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

        polynomials.R = new Polynomial(new ffjavascript.BigBuffer((zkey.domainSize + 6) * n8r), curve, logger);

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
        polynomials.Wxi = new Polynomial(new ffjavascript.BigBuffer(sDomain + 6 * n8r), curve, logger);

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
const {unstringifyBigInts: unstringifyBigInts$5} = ffjavascript.utils;

async function plonkFullProve(_input, wasmFile, zkeyFileName, logger, wtnsCalcOptions, proverOptions) {
    const input = unstringifyBigInts$5(_input);

    const wtns= {
        type: "mem"
    };
    await wtnsCalculate(input, wasmFile, wtns, wtnsCalcOptions);
    return await plonk16Prove(zkeyFileName, wtns, logger, proverOptions);
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
const {unstringifyBigInts: unstringifyBigInts$4} = ffjavascript.utils;



async function plonkVerify(_vk_verifier, _publicSignals, _proof, logger) {
    let vk_verifier = unstringifyBigInts$4(_vk_verifier);
    _proof = unstringifyBigInts$4(_proof);
    let publicSignals = unstringifyBigInts$4(_publicSignals);

    const curve = await getCurveFromName(vk_verifier.curve);

    const Fr = curve.Fr;
    const G1 = curve.G1;

    if (logger) logger.info("PLONK VERIFIER STARTED");

    let proof = fromObjectProof(curve,_proof);
    vk_verifier = fromObjectVk$1(curve, vk_verifier);

    if (!isWellConstructed(curve, proof)) {
        logger.error("Proof is not well constructed");
        return false;
    }

    if (publicSignals.length != vk_verifier.nPublic) {
        logger.error("Invalid number of public inputs");
        return false;
    }
    const challenges = calculatechallenges(curve, proof, publicSignals, vk_verifier);
    
    if (logger) {
        logger.debug("beta: " + Fr.toString(challenges.beta, 16));    
        logger.debug("gamma: " + Fr.toString(challenges.gamma, 16));    
        logger.debug("alpha: " + Fr.toString(challenges.alpha, 16));    
        logger.debug("xi: " + Fr.toString(challenges.xi, 16));
        for(let i=1;i<6;i++) {
            if (logger) logger.debug("v: " + Fr.toString(challenges.v[i], 16));
        }
        logger.debug("u: " + Fr.toString(challenges.u, 16));    
    }
    const L = calculateLagrangeEvaluations(curve, challenges, vk_verifier);
    if (logger) {
        for (let i=1; i<L.length; i++) {
            logger.debug(`L${i}(xi)=` + Fr.toString(L[i], 16));
        }
    }
    
    if (publicSignals.length != vk_verifier.nPublic) {
        logger.error("Number of public signals does not match with vk");
        return false;
    }

    const pi = calculatePI$1(curve, publicSignals, L);
    if (logger) {
        logger.debug("PI(xi): " + Fr.toString(pi, 16));
    }
    
    const r0 = calculateR0(curve, proof, challenges, pi, L[1]);
    if (logger) {
        logger.debug("r0: " + Fr.toString(r0, 16));
    }

    const D = calculateD(curve, proof, challenges, vk_verifier, L[1]);
    if (logger) {
        logger.debug("D: " + G1.toString(G1.toAffine(D), 16));
    }

    const F = calculateF(curve, proof, challenges, vk_verifier, D);
    if (logger) {
        logger.debug("F: " + G1.toString(G1.toAffine(F), 16));
    }

    const E = calculateE(curve, proof, challenges, r0);
    if (logger) {
        logger.debug("E: " + G1.toString(G1.toAffine(E), 16));
    }

    const res = await isValidPairing$1(curve, proof, challenges, vk_verifier, E, F);

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
    res.Wxi = G1.fromObject(proof.Wxi);
    res.Wxiw = G1.fromObject(proof.Wxiw);
    return res;
}

function fromObjectVk$1(curve, vk) {
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

function calculatechallenges(curve, proof, publicSignals, vk) {
    const Fr = curve.Fr;
    const res = {};
    const transcript = new Keccak256Transcript(curve);

    // Challenge round 2: beta and gamma
    transcript.addPolCommitment(vk.Qm);
    transcript.addPolCommitment(vk.Ql);
    transcript.addPolCommitment(vk.Qr);
    transcript.addPolCommitment(vk.Qo);
    transcript.addPolCommitment(vk.Qc);
    transcript.addPolCommitment(vk.S1);
    transcript.addPolCommitment(vk.S2);
    transcript.addPolCommitment(vk.S3);

    for (let i = 0; i < publicSignals.length; i++) {
        transcript.addScalar(Fr.e(publicSignals[i]));
    }

    transcript.addPolCommitment(proof.A);
    transcript.addPolCommitment(proof.B);
    transcript.addPolCommitment(proof.C);

    res.beta = transcript.getChallenge();

    transcript.reset();
    transcript.addScalar(res.beta);
    res.gamma = transcript.getChallenge();

    // Challenge round 3: alpha
    transcript.reset();
    transcript.addScalar(res.beta);
    transcript.addScalar(res.gamma);
    transcript.addPolCommitment(proof.Z);
    res.alpha = transcript.getChallenge();

    // Challenge round 4: xi
    transcript.reset();
    transcript.addScalar(res.alpha);
    transcript.addPolCommitment(proof.T1);
    transcript.addPolCommitment(proof.T2);
    transcript.addPolCommitment(proof.T3);
    res.xi = transcript.getChallenge();
    
    // Challenge round 5: v
    transcript.reset();
    transcript.addScalar(res.xi);
    transcript.addScalar(proof.eval_a);
    transcript.addScalar(proof.eval_b);
    transcript.addScalar(proof.eval_c);
    transcript.addScalar(proof.eval_s1);
    transcript.addScalar(proof.eval_s2);
    transcript.addScalar(proof.eval_zw);
    res.v = [];
    res.v[1] = transcript.getChallenge();

    for (let i=2; i<6; i++ ) res.v[i] = Fr.mul(res.v[i-1], res.v[1]);

    // Challenge: u
    transcript.reset();
    transcript.addPolCommitment(proof.Wxi);
    transcript.addPolCommitment(proof.Wxiw);
    res.u = transcript.getChallenge();

    return res;
}

function calculateLagrangeEvaluations(curve, challenges, vk) {
    const Fr = curve.Fr;

    let xin = challenges.xi;
    let domainSize = 1;
    for (let i=0; i<vk.power; i++) {
        xin = Fr.square(xin);
        domainSize *= 2;
    }
    challenges.xin = xin;

    challenges.zh = Fr.sub(xin, Fr.one);

    const L = [];

    const n = Fr.e(domainSize);
    let w = Fr.one;
    for (let i=1; i<=Math.max(1, vk.nPublic); i++) {
        L[i] = Fr.div(Fr.mul(w, challenges.zh), Fr.mul(n, Fr.sub(challenges.xi, w)));
        w = Fr.mul(w, Fr.w[vk.power]);
    }

    return L;
}

function calculatePI$1(curve, publicSignals, L) {
    const Fr = curve.Fr;

    let pi = Fr.zero;
    for (let i=0; i<publicSignals.length; i++) {        
        const w = Fr.e(publicSignals[i]);
        pi = Fr.sub(pi, Fr.mul(w, L[i+1]));
    }
    return pi;
}

function calculateR0(curve, proof, challenges, pi, l1) {
    const Fr = curve.Fr;

    const e1 = pi;

    const e2 = Fr.mul(l1, Fr.square(challenges.alpha));

    let e3a = Fr.add(proof.eval_a, Fr.mul(challenges.beta, proof.eval_s1));
    e3a = Fr.add(e3a, challenges.gamma);

    let e3b = Fr.add(proof.eval_b, Fr.mul(challenges.beta, proof.eval_s2));
    e3b = Fr.add(e3b, challenges.gamma);

    let e3c = Fr.add(proof.eval_c, challenges.gamma);

    let e3 = Fr.mul(Fr.mul(e3a, e3b), e3c);
    e3 = Fr.mul(e3, proof.eval_zw);
    e3 = Fr.mul(e3, challenges.alpha);

    const r0 = Fr.sub(Fr.sub(e1, e2), e3);

    return r0;
}

function calculateD(curve, proof, challenges, vk, l1) {
    const G1 = curve.G1;
    const Fr = curve.Fr;
    
    let d1 = G1.timesFr(vk.Qm, Fr.mul(proof.eval_a, proof.eval_b));
    d1 = G1.add(d1, G1.timesFr(vk.Ql, proof.eval_a));
    d1 = G1.add(d1, G1.timesFr(vk.Qr, proof.eval_b));
    d1 = G1.add(d1, G1.timesFr(vk.Qo, proof.eval_c));
    d1 = G1.add(d1, vk.Qc);

    const betaxi = Fr.mul(challenges.beta, challenges.xi);

    const d2a1 = Fr.add(Fr.add(proof.eval_a, betaxi), challenges.gamma);
    const d2a2 = Fr.add(Fr.add(proof.eval_b, Fr.mul(betaxi, vk.k1)), challenges.gamma);
    const d2a3 = Fr.add(Fr.add(proof.eval_c, Fr.mul(betaxi, vk.k2)), challenges.gamma);

    const d2a = Fr.mul(Fr.mul(Fr.mul(d2a1, d2a2), d2a3), challenges.alpha);

    const d2b = Fr.mul(l1, Fr.square(challenges.alpha));

    const d2 = G1.timesFr(proof.Z, Fr.add(Fr.add(d2a, d2b), challenges.u));

    const d3a = Fr.add(Fr.add(proof.eval_a, Fr.mul(challenges.beta, proof.eval_s1)), challenges.gamma);
    const d3b = Fr.add(Fr.add(proof.eval_b, Fr.mul(challenges.beta, proof.eval_s2)), challenges.gamma);
    const d3c = Fr.mul(Fr.mul(challenges.alpha, challenges.beta), proof.eval_zw);

    const d3 = G1.timesFr(vk.S3, Fr.mul(Fr.mul(d3a, d3b), d3c));
    
    const d4low = proof.T1;
    const d4mid = G1.timesFr(proof.T2, challenges.xin);
    const d4high = G1.timesFr(proof.T3, Fr.square(challenges.xin));
    let d4 = G1.add(d4low, G1.add(d4mid, d4high));
    d4 = G1.timesFr(d4, challenges.zh);

    const d = G1.sub(G1.sub(G1.add(d1, d2), d3), d4);

    return d;
}

function calculateF(curve, proof, challenges, vk, D) {
    const G1 = curve.G1;

    let res = G1.add(D, G1.timesFr(proof.A, challenges.v[1]));
    res = G1.add(res, G1.timesFr(proof.B, challenges.v[2]));
    res = G1.add(res, G1.timesFr(proof.C, challenges.v[3]));
    res = G1.add(res, G1.timesFr(vk.S1, challenges.v[4]));
    res = G1.add(res, G1.timesFr(vk.S2, challenges.v[5]));

    return res;
}

function calculateE(curve, proof, challenges, r0) {
    const G1 = curve.G1;
    const Fr = curve.Fr;

    let e = Fr.add(Fr.neg(r0), Fr.mul(challenges.v[1], proof.eval_a));
    e = Fr.add(e, Fr.mul(challenges.v[2], proof.eval_b));
    e = Fr.add(e, Fr.mul(challenges.v[3], proof.eval_c));
    e = Fr.add(e, Fr.mul(challenges.v[4], proof.eval_s1));
    e = Fr.add(e, Fr.mul(challenges.v[5], proof.eval_s2));
    e = Fr.add(e, Fr.mul(challenges.u, proof.eval_zw));

    const res = G1.timesFr(G1.one, e);

    return res;
}

async function isValidPairing$1(curve, proof, challenges, vk, E, F) {
    const G1 = curve.G1;
    const Fr = curve.Fr;

    let A1 = proof.Wxi;
    A1 = G1.add(A1, G1.timesFr(proof.Wxiw, challenges.u));

    let B1 = G1.timesFr(proof.Wxi, challenges.xi);
    const s = Fr.mul(Fr.mul(challenges.u, challenges.xi), Fr.w[vk.power]);
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
const { unstringifyBigInts: unstringifyBigInts$3} = ffjavascript.utils;

function p256$1(n) {
    let nstr = n.toString(16);
    while (nstr.length < 64) nstr = "0"+nstr;
    nstr = `"0x${nstr}"`;
    return nstr;
}

async function plonkExportSolidityCallData(_proof, _pub) {
    const proof = unstringifyBigInts$3(_proof);
    const pub = unstringifyBigInts$3(_pub);

    const curve = await getCurveFromName(proof.curve);
    curve.G1;
    curve.Fr;

    let inputs = "";
    for (let i=0; i<pub.length; i++) {
        if (inputs != "") inputs = inputs + ",";
        inputs = inputs + p256$1(pub[i]);
    }

    return `[${p256$1(proof.A[0])}, ${p256$1(proof.A[1])},` +
    `${p256$1(proof.B[0])},${p256$1(proof.B[1])},` +
    `${p256$1(proof.C[0])},${p256$1(proof.C[1])},` +
    `${p256$1(proof.Z[0])},${p256$1(proof.Z[1])},` +
    `${p256$1(proof.T1[0])},${p256$1(proof.T1[1])},` +
    `${p256$1(proof.T2[0])},${p256$1(proof.T2[1])},` +
    `${p256$1(proof.T3[0])},${p256$1(proof.T3[1])},` +
    `${p256$1(proof.Wxi[0])},${p256$1(proof.Wxi[1])},` +
    `${p256$1(proof.Wxiw[0])},${p256$1(proof.Wxiw[1])},` +
    `${p256$1(proof.eval_a)},` + 
    `${p256$1(proof.eval_b)},` + 
    `${p256$1(proof.eval_c)},` + 
    `${p256$1(proof.eval_s1)},` + 
    `${p256$1(proof.eval_s2)},` + 
    `${p256$1(proof.eval_zw)}]` + 
    `[${inputs}]`;
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

// We export to zkey the signals and values of the a, b, c, ql, qr, qm, qo and qc

// a, b and c are signals id (32-bit integers)
// ql, qr, qm, qo and qc are field values

function getFFlonkConstantConstraint(signal1, Fr) {
    return [signal1, 0, 0, Fr.one, Fr.zero, Fr.zero, Fr.zero, Fr.zero];
}

function getFFlonkAdditionConstraint(signal1, signal2, signalOut, ql, qr, qm, qo, qc) {
    return [signal1, signal2, signalOut, ql, qr, qm, qo, qc];
}

function getFFlonkMultiplicationConstraint(signal1, signal2, signalOut, ql, qr, qm, qo, qc, Fr) {
    return [signal1, signal2, signalOut, ql, qr, qm, qo, qc];
}

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

const LINEAR_COMBINATION_NULLABLE = 0;
const LINEAR_COMBINATION_CONSTANT = 1;
const LINEAR_COMBINATION_VARIABLE = 2;

class r1csConstraintProcessor {
    constructor(Fr, fnGetConstantConstraint, fnGetAdditionConstraint, fnGetMultiplicationConstraint, logger) {
        this.Fr = Fr;
        this.logger = logger;
        this.fnGetAdditionConstraint = fnGetAdditionConstraint;
        this.fnGetMultiplicationConstraint = fnGetMultiplicationConstraint;
    }

    processR1csConstraint(settings, lcA, lcB, lcC) {
        this.normalizeLinearCombination(lcA);
        this.normalizeLinearCombination(lcB);
        this.normalizeLinearCombination(lcC);

        const lctA = this.getLinearCombinationType(lcA);
        const lctB = this.getLinearCombinationType(lcB);

        if ((lctA === LINEAR_COMBINATION_NULLABLE) || (lctB === LINEAR_COMBINATION_NULLABLE)) {
            return this.processR1csAdditionConstraint(settings, lcC);
        } else if (lctA === LINEAR_COMBINATION_CONSTANT) {
            const lcCC = this.joinLinearCombinations(lcB, lcC, lcA[0]);
            return this.processR1csAdditionConstraint(settings, lcCC);
        } else if (lctB === LINEAR_COMBINATION_CONSTANT) {
            const lcCC = this.joinLinearCombinations(lcA, lcC, lcB[0]);
            return this.processR1csAdditionConstraint(settings, lcCC);
        } else {
            return this.processR1csMultiplicationConstraint(settings, lcA, lcB, lcC);
        }
    }

    getLinearCombinationType(linCom) {
        // let k = this.Fr.zero;
        //
        // const signalIds = Object.keys(linCom);
        // for (let i = 0; i < signalIds.length; i++) {
        //     if (signalIds[i] === "0") {
        //         k = this.Fr.add(k, linCom[signalIds[i]]);
        //     } else {
        //         return LINEAR_COMBINATION_VARIABLE;
        //     }
        // }
        //
        // if (!this.Fr.eq(k, this.Fr.zero)) return LINEAR_COMBINATION_CONSTANT;
        //
        // return LINEAR_COMBINATION_NULLABLE;

        let k = this.Fr.zero;
        let n = 0;
        const ss = Object.keys(linCom);
        for (let i = 0; i < ss.length; i++) {
            if (linCom[ss[i]] == 0n) {
                delete linCom[ss[i]];
            } else if (ss[i] == 0) {
                k = this.Fr.add(k, linCom[ss[i]]);
            } else {
                n++;
            }
        }
        if (n > 0) return LINEAR_COMBINATION_VARIABLE;
        if (!this.Fr.isZero(k)) return LINEAR_COMBINATION_CONSTANT;
        return LINEAR_COMBINATION_NULLABLE;
    }

    normalizeLinearCombination(linCom) {
        const signalIds = Object.keys(linCom);
        for (let i = 0; i < signalIds.length; i++) {
            if (this.Fr.isZero(linCom[signalIds[i]])) delete linCom[signalIds[i]];
        }

        return linCom;
    }

    joinLinearCombinations(linCom1, linCom2, k) {
        const res = {};

        // for (let s in linCom1) {
        //     const val = this.Fr.mul(k, linCom1[s]);
        //     res[s] = !(s in res) ? val : this.Fr.add(val, res[s]);
        // }
        //
        // for (let s in linCom2) {
        //     const val = this.Fr.mul(k, linCom2[s]);
        //     res[s] = !(s in res) ? val : this.Fr.add(val, res[s]);
        // }

        for (let s in linCom1) {
            if (typeof res[s] == "undefined") {
                res[s] = this.Fr.mul(k, linCom1[s]);
            } else {
                res[s] = this.Fr.add(res[s], this.Fr.mul(k, linCom1[s]));
            }
        }

        for (let s in linCom2) {
            if (typeof res[s] == "undefined") {
                res[s] = linCom2[s];
            } else {
                res[s] = this.Fr.add(res[s], linCom2[s]);
            }
        }

        return this.normalizeLinearCombination(res);
    }

    reduceCoefs(settings, constraintsArr, additionsArr, linCom, maxC) {
        const res = {
            k: this.Fr.zero,
            signals: [],
            coefs: []
        };
        const cs = [];

        for (let signalId in linCom) {
            if (signalId == 0) {
                res.k = this.Fr.add(res.k, linCom[signalId]);
            } else if (linCom[signalId] != 0n) {
                cs.push([Number(signalId), linCom[signalId]]);
            }
        }

        while (cs.length > maxC) {
            const c1 = cs.shift();
            const c2 = cs.shift();
            const so = settings.nVars++;

            const constraints = this.fnGetAdditionConstraint(
                c1[0], c2[0], so,
                this.Fr.neg(c1[1]), this.Fr.neg(c2[1]), this.Fr.zero, this.Fr.one, this.Fr.zero);

            constraintsArr.push(constraints);
            additionsArr.push([c1[0], c2[0], c1[1], c2[1]]);

            cs.push([so, this.Fr.one]);
        }

        for (let i = 0; i < cs.length; i++) {
            res.signals[i] = cs[i][0];
            res.coefs[i] = cs[i][1];
        }

        while (res.coefs.length < maxC) {
            res.signals.push(0);
            res.coefs.push(this.Fr.zero);
        }

        return res;
    }

    processR1csAdditionConstraint(settings, linCom) {
        const constraintsArr = [];
        const additionsArr = [];

        const C = this.reduceCoefs(settings, constraintsArr, additionsArr, linCom, 3);

        const constraints = this.fnGetAdditionConstraint(
            C.signals[0], C.signals[1], C.signals[2],
            C.coefs[0], C.coefs[1], this.Fr.zero, C.coefs[2], C.k);

        constraintsArr.push(constraints);

        return [constraintsArr, additionsArr];
    }

    processR1csMultiplicationConstraint(settings, lcA, lcB, lcC) {
        const constraintsArr = [];
        const additionsArr = [];

        const A = this.reduceCoefs(settings, constraintsArr, additionsArr, lcA, 1);
        const B = this.reduceCoefs(settings, constraintsArr, additionsArr, lcB, 1);
        const C = this.reduceCoefs(settings, constraintsArr, additionsArr, lcC, 1);

        const constraints = this.fnGetMultiplicationConstraint(
            A.signals[0], B.signals[0], C.signals[0],
            this.Fr.mul(A.coefs[0], B.k),
            this.Fr.mul(A.k, B.coefs[0]),
            this.Fr.mul(A.coefs[0], B.coefs[0]),
            this.Fr.neg(C.coefs[0]),
            this.Fr.sub(this.Fr.mul(A.k, B.k), C.k));

        constraintsArr.push(constraints);

        return [constraintsArr, additionsArr];
    }
}

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

class CPolynomial {
    constructor(n, curve, logger) {
        this.n = n;
        this.polynomials = Array(n).fill(undefined);
        this.curve = curve;
        this.Fr = curve.Fr;
        this.G1 = curve.G1;
        this.logger = logger;
    }

    addPolynomial(position, polynomial) {
        if (position > this.n - 1) {
            throw new Error("CPolynomial:addPolynomial, cannot add a polynomial to a position greater than n-1");
        }

        this.polynomials[position] = polynomial;
    }

    degree() {
        let degrees = this.polynomials.map(
            (polynomial, index) => polynomial === undefined ? 0 : polynomial.degree() * this.n + index);
        return Math.max(...degrees);
    }

    getPolynomial() {
        let degrees = this.polynomials.map(polynomial => polynomial === undefined ? 0 : polynomial.degree());
        const maxDegree = this.degree();
        const lengthBuffer = 2 ** (log2(maxDegree - 1) + 1);
        const sFr = this.Fr.n8;

        let polynomial = new Polynomial(new ffjavascript.BigBuffer(lengthBuffer * sFr), this.curve, this.logger);

        for (let i = 0; i < maxDegree; i++) {
            const i_n8 = i * sFr;
            const i_sFr = i_n8 * this.n;

            for (let j = 0; j < this.n; j++) {
                if (this.polynomials[j] !== undefined) {
                    if (i <= degrees[j]) polynomial.coef.set(this.polynomials[j].coef.slice(i_n8, i_n8 + sFr), i_sFr + j * sFr);
                }
            }
        }

        return polynomial;
    }

    async multiExponentiation(PTau, name) {
        let polynomial = this.getPolynomial();
        const n = polynomial.coef.byteLength / this.Fr.n8;
        const PTauN = PTau.slice(0, n * this.G1.F.n8 * 2);
        const bm = await this.Fr.batchFromMontgomery(polynomial.coef);
        let res = await this.G1.multiExpAffine(PTauN, bm, this.logger, name);
        res = this.G1.toAffine(res);
        return res;
    }
}

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


async function fflonkSetup(r1csFilename, ptauFilename, zkeyFilename, logger) {
    if (logger) logger.info("FFLONK SETUP STARTED");

    if (globalThis.gc) globalThis.gc();

    // Read PTau file
    if (logger) logger.info("> Reading PTau file");
    const {fd: fdPTau, sections: pTauSections} = await binFileUtils.readBinFile(ptauFilename, "ptau", 1, 1 << 22, 1 << 24);
    if (!pTauSections[12]) {
        throw new Error("Powers of Tau is not well prepared. Section 12 missing.");
    }

    // Get curve defined in PTau
    if (logger) logger.info("> Getting curve from PTau settings");
    const {curve} = await readPTauHeader(fdPTau, pTauSections);

    // Read r1cs file
    if (logger) logger.info("> Reading r1cs file");
    const {fd: fdR1cs, sections: sectionsR1cs} = await binFileUtils.readBinFile(r1csFilename, "r1cs", 1, 1 << 22, 1 << 24);
    const r1cs = await r1csfile.readR1csFd(fdR1cs, sectionsR1cs, {loadConstraints: false, loadCustomGates: true});

    // Potential error checks
    if (r1cs.prime !== curve.r) {
        throw new Error("r1cs curve does not match powers of tau ceremony curve");
    }

    // Initializations
    const Fr = curve.Fr;

    const sFr = curve.Fr.n8;
    const sG1 = curve.G1.F.n8 * 2;
    const sG2 = curve.G2.F.n8 * 2;

    let polynomials = {};
    let evaluations = {};
    let PTau;

    let settings = {
        nVars: r1cs.nVars,
        nPublic: r1cs.nOutputs + r1cs.nPubInputs
    };

    const plonkConstraints = new BigArray();
    let plonkAdditions = new BigArray();

    // Process constraints inside r1cs
    if (logger) logger.info("> Processing FFlonk constraints");
    await computeFFConstraints(curve.Fr, r1cs, logger);
    if (globalThis.gc) globalThis.gc();

    // As the t polynomial is n+5 we need at least a power of 4
    //TODO check!!!!
    // NOTE : plonkConstraints + 2 = #constraints + blinding coefficients for each wire polynomial
    settings.cirPower = Math.max(FF_T_POL_DEG_MIN, log2((plonkConstraints.length + 2) - 1) + 1);
    settings.domainSize = 2 ** settings.cirPower;

    if (pTauSections[2][0].size < (settings.domainSize * 9 + 18) * sG1) {
        throw new Error("Powers of Tau is not big enough for this circuit size. Section 2 too small.");
    }
    if (pTauSections[3][0].size < sG2) {
        throw new Error("Powers of Tau is not well prepared. Section 3 too small.");
    }

    if (logger) {
        logger.info("----------------------------");
        logger.info("  FFLONK SETUP SETTINGS");
        logger.info(`  Curve:         ${curve.name}`);
        logger.info(`  Circuit power: ${settings.cirPower}`);
        logger.info(`  Domain size:   ${settings.domainSize}`);
        logger.info(`  Vars:          ${settings.nVars}`);
        logger.info(`  Public vars:   ${settings.nPublic}`);
        logger.info(`  Constraints:   ${plonkConstraints.length}`);
        logger.info(`  Additions:     ${plonkAdditions.length}`);
        logger.info("----------------------------");
    }

    // Compute k1 and k2 to be used in the permutation checks
    if (logger) logger.info("> computing k1 and k2");
    const [k1, k2] = computeK1K2();

    // Compute omega 3 (w3) and omega 4 (w4) to be used in the prover and the verifier
    // w3^3 = 1 and  w4^4 = 1
    if (logger) logger.info("> computing w3");
    const w3 = computeW3();
    if (logger) logger.info("> computing w4");
    const w4 = computeW4();
    if (logger) logger.info("> computing w8");
    const w8 = computeW8();
    if (logger) logger.info("> computing wr");
    const wr = getOmegaCubicRoot(settings.cirPower, curve.Fr);

    // Write output zkey file
    await writeZkeyFile();

    await fdR1cs.close();
    await fdPTau.close();

    if (logger) logger.info("FFLONK SETUP FINISHED");

    return 0;

    async function computeFFConstraints(Fr, r1cs, logger) {
        // Add public inputs and outputs
        for (let i = 0; i < settings.nPublic; i++) {
            plonkConstraints.push(getFFlonkConstantConstraint(i + 1, Fr));
        }

        // Add all constraints from r1cs file
        const r1csProcessor = new r1csConstraintProcessor(Fr, getFFlonkConstantConstraint, getFFlonkAdditionConstraint, getFFlonkMultiplicationConstraint, logger);

        const bR1cs = await binFileUtils__namespace.readSection(fdR1cs, sectionsR1cs, 2);
        let bR1csPos = 0;
        for (let i = 0; i < r1cs.nConstraints; i++) {
            if ((logger) && (i !== 0) && (i % 500000 === 0)) {
                logger.info(`    processing r1cs constraints ${i}/${r1cs.nConstraints}`);
            }
            const [constraints, additions] = r1csProcessor.processR1csConstraint(settings, ...readConstraint());

            plonkConstraints.push(...constraints);
            plonkAdditions.push(...additions);
        }

        function readConstraint() {
            const c = [];
            c[0] = readLC();
            c[1] = readLC();
            c[2] = readLC();
            return c;
        }

        function readLC() {
            const lc = {};

            const buffUL32 = bR1cs.slice(bR1csPos, bR1csPos + 4);
            bR1csPos += 4;
            const buffUL32V = new DataView(buffUL32.buffer);
            const nIdx = buffUL32V.getUint32(0, true);

            const buff = bR1cs.slice(bR1csPos, bR1csPos + (4 + r1cs.n8) * nIdx);
            bR1csPos += (4 + r1cs.n8) * nIdx;
            const buffV = new DataView(buff.buffer);
            for (let i = 0; i < nIdx; i++) {
                const idx = buffV.getUint32(i * (4 + r1cs.n8), true);
                const val = r1cs.F.fromRprLE(buff, i * (4 + r1cs.n8) + 4);
                lc[idx] = val;
            }
            return lc;
        }

        return 0;
    }

    async function writeZkeyFile() {
        if (logger) logger.info("> Writing the zkey file");
        const fdZKey = await binFileUtils.createBinFile(zkeyFilename, "zkey", 1, ZKEY_FF_NSECTIONS, 1 << 22, 1 << 24);

        if (logger) logger.info(`··· Writing Section ${HEADER_ZKEY_SECTION}. Zkey Header`);
        await writeZkeyHeader(fdZKey);

        if (logger) logger.info(`··· Writing Section ${ZKEY_FF_ADDITIONS_SECTION}. Additions`);
        await writeAdditions(fdZKey);
        if (globalThis.gc) globalThis.gc();

        if (logger) logger.info(`··· Writing Section ${ZKEY_FF_A_MAP_SECTION}. A Map`);
        await writeWitnessMap(fdZKey, ZKEY_FF_A_MAP_SECTION, 0, "A map");
        if (globalThis.gc) globalThis.gc();

        if (logger) logger.info(`··· Writing Section ${ZKEY_FF_B_MAP_SECTION}. B Map`);
        await writeWitnessMap(fdZKey, ZKEY_FF_B_MAP_SECTION, 1, "B map");
        if (globalThis.gc) globalThis.gc();

        if (logger) logger.info(`··· Writing Section ${ZKEY_FF_C_MAP_SECTION}. C Map`);
        await writeWitnessMap(fdZKey, ZKEY_FF_C_MAP_SECTION, 2, "C map");
        if (globalThis.gc) globalThis.gc();

        if (logger) logger.info(`··· Writing Section ${ZKEY_FF_QL_SECTION}. QL`);
        await writeQMap(fdZKey, ZKEY_FF_QL_SECTION, 3, "QL");
        if (globalThis.gc) globalThis.gc();

        if (logger) logger.info(`··· Writing Section ${ZKEY_FF_QR_SECTION}. QR`);
        await writeQMap(fdZKey, ZKEY_FF_QR_SECTION, 4, "QR");
        if (globalThis.gc) globalThis.gc();

        if (logger) logger.info(`··· Writing Section ${ZKEY_FF_QM_SECTION}. QM`);
        await writeQMap(fdZKey, ZKEY_FF_QM_SECTION, 5, "QM");
        if (globalThis.gc) globalThis.gc();

        if (logger) logger.info(`··· Writing Section ${ZKEY_FF_QO_SECTION}. QO`);
        await writeQMap(fdZKey, ZKEY_FF_QO_SECTION, 6, "QO");
        if (globalThis.gc) globalThis.gc();

        if (logger) logger.info(`··· Writing Section ${ZKEY_FF_QC_SECTION}. QC`);
        await writeQMap(fdZKey, ZKEY_FF_QC_SECTION, 7, "QC");
        if (globalThis.gc) globalThis.gc();

        if (logger) logger.info(`··· Writing Sections ${ZKEY_FF_SIGMA1_SECTION},${ZKEY_FF_SIGMA2_SECTION},${ZKEY_FF_SIGMA3_SECTION}. Sigma1, Sigma2 & Sigma 3`);
        await writeSigma(fdZKey);
        if (globalThis.gc) globalThis.gc();

        if (logger) logger.info(`··· Writing Section ${ZKEY_FF_LAGRANGE_SECTION}. Lagrange Polynomials`);
        await writeLagrangePolynomials(fdZKey);
        if (globalThis.gc) globalThis.gc();

        if (logger) logger.info(`··· Writing Section ${ZKEY_FF_PTAU_SECTION}. Powers of Tau`);
        await writePtau(fdZKey);
        if (globalThis.gc) globalThis.gc();

        if (logger) logger.info(`··· Writing Section ${ZKEY_FF_C0_SECTION}. C0`);
        await writeC0(fdZKey);
        if (globalThis.gc) globalThis.gc();

        if (logger) logger.info(`··· Writing Section ${ZKEY_FF_HEADER_SECTION}. FFlonk Header`);
        await writeFFlonkHeader(fdZKey);
        if (globalThis.gc) globalThis.gc();

        if (logger) logger.info("> Writing the zkey file finished");

        await fdZKey.close();
    }

    async function writeZkeyHeader(fdZKey) {
        await binFileUtils.startWriteSection(fdZKey, HEADER_ZKEY_SECTION);
        await fdZKey.writeULE32(FFLONK_PROTOCOL_ID);
        await binFileUtils.endWriteSection(fdZKey);
    }

    async function writeAdditions(fdZKey) {
        await binFileUtils.startWriteSection(fdZKey, ZKEY_FF_ADDITIONS_SECTION);

        // Written values are 2 * 32 bit integers (2 * 4 bytes) + 2 field size values ( 2 * sFr bytes)
        const buffOut = new Uint8Array(8 + 2 * sFr);
        const buffOutV = new DataView(buffOut.buffer);

        for (let i = 0; i < plonkAdditions.length; i++) {
            if ((logger) && (i !== 0) && (i % 500000 === 0)) logger.info(`      writing Additions: ${i}/${plonkAdditions.length}`);

            const addition = plonkAdditions[i];

            buffOutV.setUint32(0, addition[0], true);
            buffOutV.setUint32(4, addition[1], true);
            buffOut.set(addition[2], 8);
            buffOut.set(addition[3], 8 + sFr);

            await fdZKey.write(buffOut);
        }
        await binFileUtils.endWriteSection(fdZKey);
    }

    async function writeWitnessMap(fdZKey, sectionNum, posConstraint, name) {
        await binFileUtils.startWriteSection(fdZKey, sectionNum);
        for (let i = 0; i < plonkConstraints.length; i++) {
            if (logger && (i !== 0) && (i % 500000 === 0)) {
                logger.info(`      writing witness ${name}: ${i}/${plonkConstraints.length}`);
            }

            await fdZKey.writeULE32(plonkConstraints[i][posConstraint]);
        }
        await binFileUtils.endWriteSection(fdZKey);
    }

    async function writeQMap(fdZKey, sectionNum, posConstraint, name) {
        // Compute Q from q evaluations
        let Q = new ffjavascript.BigBuffer(settings.domainSize * sFr);

        for (let i = 0; i < plonkConstraints.length; i++) {
            Q.set(plonkConstraints[i][posConstraint], i * sFr);
            if ((logger) && (i !== 0) && (i % 500000 === 0)) {
                logger.info(`      writing ${name}: ${i}/${plonkConstraints.length}`);
            }
        }

        polynomials[name] = await Polynomial.fromEvaluations(Q, curve, logger);
        evaluations[name] = await Evaluations.fromPolynomial(polynomials[name], 4, curve, logger);

        // Write Q coefficients and evaluations
        await binFileUtils.startWriteSection(fdZKey, sectionNum);
        await fdZKey.write(polynomials[name].coef);
        await fdZKey.write(evaluations[name].eval);
        await binFileUtils.endWriteSection(fdZKey);
    }

    async function writeSigma(fdZKey) {
        // Compute sigma
        const sigma = new ffjavascript.BigBuffer(sFr * settings.domainSize * 3);
        const lastSeen = new BigArray(settings.nVars);
        const firstPos = new BigArray(settings.nVars);

        let w = Fr.one;
        for (let i = 0; i < settings.domainSize; i++) {
            if (i < plonkConstraints.length) {
                buildSigma(plonkConstraints[i][0], i);
                buildSigma(plonkConstraints[i][1], settings.domainSize + i);
                buildSigma(plonkConstraints[i][2], settings.domainSize * 2 + i);
            } else if (i < settings.domainSize - 2) {
                buildSigma(0, i);
                buildSigma(0, settings.domainSize + i);
                buildSigma(0, settings.domainSize * 2 + i);
            } else {
                sigma.set(w, i * sFr);
                sigma.set(Fr.mul(w, k1), (settings.domainSize + i) * sFr);
                sigma.set(Fr.mul(w, k2), (settings.domainSize * 2 + i) * sFr);
            }

            w = Fr.mul(w, Fr.w[settings.cirPower]);

            if ((logger) && (i !== 0) && (i % 500000 === 0)) {
                logger.info(`      writing sigma phase1: ${i}/${plonkConstraints.length}`);
            }
        }

        for (let i = 0; i < settings.nVars; i++) {
            if (typeof firstPos[i] !== "undefined") {
                sigma.set(lastSeen[i], firstPos[i] * sFr);
            } else {
                // throw new Error("Variable not used");
                console.log("Variable not used");
            }
            if ((logger) && (i !== 0) && (i % 500000 === 0)) logger.info(`      writing sigma phase2: ${i}/${settings.nVars}`);
        }

        if (globalThis.gc) globalThis.gc();

        // Write sigma coefficients and evaluations
        for (let i = 0; i < 3; i++) {
            const sectionId = 0 === i ? ZKEY_FF_SIGMA1_SECTION : 1 === i ? ZKEY_FF_SIGMA2_SECTION : ZKEY_FF_SIGMA3_SECTION;

            let name = "S" + (i + 1);
            polynomials[name] = await Polynomial.fromEvaluations(sigma.slice(settings.domainSize * sFr * i, settings.domainSize * sFr * (i + 1)), curve, logger);
            evaluations[name] = await Evaluations.fromPolynomial(polynomials[name], 4, curve, logger);
            await binFileUtils.startWriteSection(fdZKey, sectionId);
            await fdZKey.write(polynomials[name].coef);
            await fdZKey.write(evaluations[name].eval);
            await binFileUtils.endWriteSection(fdZKey);

            if (globalThis.gc) globalThis.gc();
        }

        return 0;

        function buildSigma(signalId, idx) {
            if (typeof lastSeen[signalId] === "undefined") {
                firstPos[signalId] = idx;
            } else {
                sigma.set(lastSeen[signalId], idx * sFr);
            }
            let v;
            if (idx < settings.domainSize) {
                v = w;
            } else if (idx < 2 * settings.domainSize) {
                v = Fr.mul(w, k1);
            } else {
                v = Fr.mul(w, k2);
            }

            lastSeen[signalId] = v;
        }
    }

    async function writeLagrangePolynomials(fdZKey) {
        await binFileUtils.startWriteSection(fdZKey, ZKEY_FF_LAGRANGE_SECTION);

        const l = Math.max(settings.nPublic, 1);
        for (let i = 0; i < l; i++) {
            let buff = new ffjavascript.BigBuffer(settings.domainSize * sFr);
            buff.set(Fr.one, i * sFr);

            await writeP4(fdZKey, buff);
        }
        await binFileUtils.endWriteSection(fdZKey);
    }

    async function writePtau(fdZKey) {
        await binFileUtils.startWriteSection(fdZKey, ZKEY_FF_PTAU_SECTION);

        // domainSize * 9 + 18 = maximum SRS length needed, specifically to commit C2
        PTau = new ffjavascript.BigBuffer((settings.domainSize * 9 + 18) * sG1);
        await fdPTau.readToBuffer(PTau, 0, (settings.domainSize * 9 + 18) * sG1, pTauSections[2][0].p);

        await fdZKey.write(PTau);
        await binFileUtils.endWriteSection(fdZKey);
    }

    async function writeC0(fdZKey) {
        // C0(X) := QL(X^8) + X · QR(X^8) + X^2 · QO(X^8) + X^3 · QM(X^8) + X^4 · QC(X^8)
        //            + X^5 · SIGMA1(X^8) + X^6 · SIGMA2(X^8) + X^7 · SIGMA3(X^8)
        let C0 = new CPolynomial(8, curve, logger);
        C0.addPolynomial(0, polynomials.QL);
        C0.addPolynomial(1, polynomials.QR);
        C0.addPolynomial(2, polynomials.QO);
        C0.addPolynomial(3, polynomials.QM);
        C0.addPolynomial(4, polynomials.QC);
        C0.addPolynomial(5, polynomials.S1);
        C0.addPolynomial(6, polynomials.S2);
        C0.addPolynomial(7, polynomials.S3);

        polynomials.C0 = C0.getPolynomial();

        // Check degree
        if (polynomials.C0.degree() >= 8 * settings.domainSize) {
            throw new Error("C0 Polynomial is not well calculated");
        }

        await binFileUtils.startWriteSection(fdZKey, ZKEY_FF_C0_SECTION);
        await fdZKey.write(polynomials.C0.coef);
        await binFileUtils.endWriteSection(fdZKey);
    }

    async function writeFFlonkHeader(fdZKey) {
        await binFileUtils.startWriteSection(fdZKey, ZKEY_FF_HEADER_SECTION);

        const primeQ = curve.q;
        const n8q = (Math.floor((ffjavascript.Scalar.bitLength(primeQ) - 1) / 64) + 1) * 8;
        await fdZKey.writeULE32(n8q);
        await binFileUtils.writeBigInt(fdZKey, primeQ, n8q);

        const primeR = curve.r;
        const n8r = (Math.floor((ffjavascript.Scalar.bitLength(primeR) - 1) / 64) + 1) * 8;
        await fdZKey.writeULE32(n8r);
        await binFileUtils.writeBigInt(fdZKey, primeR, n8r);

        // Total number of r1cs vars
        await fdZKey.writeULE32(settings.nVars);
        // Total number of r1cs public vars = outputs + public inputs
        await fdZKey.writeULE32(settings.nPublic);
        await fdZKey.writeULE32(settings.domainSize);
        await fdZKey.writeULE32(plonkAdditions.length);
        await fdZKey.writeULE32(plonkConstraints.length);

        await fdZKey.write(k1);
        await fdZKey.write(k2);

        await fdZKey.write(w3);
        await fdZKey.write(w4);
        await fdZKey.write(w8);
        await fdZKey.write(wr);

        let bX_2;
        bX_2 = await fdPTau.read(sG2, pTauSections[3][0].p + sG2);
        await fdZKey.write(bX_2);

        let commitC0 = await polynomials.C0.multiExponentiation(PTau, "C0");
        await fdZKey.write(commitC0);

        await binFileUtils.endWriteSection(fdZKey);
    }

    async function writeP4(fdZKey, buff) {
        const [coefficients, evaluations4] = await Polynomial.to4T(buff, settings.domainSize, [], Fr);
        await fdZKey.write(coefficients);
        await fdZKey.write(evaluations4);

        return [coefficients, evaluations4];
    }

    function computeK1K2() {
        let k1 = Fr.two;
        while (isIncluded(k1, [], settings.cirPower)) Fr.add(k1, Fr.one);
        let k2 = Fr.add(k1, Fr.one);
        while (isIncluded(k2, [k1], settings.cirPower)) Fr.add(k2, Fr.one);
        return [k1, k2];

        function isIncluded(k, kArr, pow) {
            const domainSize = 2 ** pow;
            let w = Fr.one;
            for (let i = 0; i < domainSize; i++) {
                if (Fr.eq(k, w)) return true;
                for (let j = 0; j < kArr.length; j++) {
                    if (Fr.eq(k, Fr.mul(kArr[j], w))) return true;
                }
                w = Fr.mul(w, Fr.w[pow]);
            }
            return false;
        }
    }

    function computeW3() {
        let generator = Fr.e(31624);

        // Exponent is order(r - 1) / 3
        let orderRsub1 = 3648040478639879203707734290876212514758060733402672390616367364429301415936n;
        let exponent = ffjavascript.Scalar.div(orderRsub1, ffjavascript.Scalar.e(3));

        return Fr.exp(generator, exponent);
    }

    function computeW4() {
        return Fr.w[2];
    }

    function computeW8() {
        return Fr.w[3];
    }

    function getOmegaCubicRoot(power, Fr) {
        // Hardcorded 3th-root of Fr.w[28]
        const firstRoot = Fr.e(467799165886069610036046866799264026481344299079011762026774533774345988080n);

        return Fr.exp(firstRoot, 2 ** (28 - power));
    }
}

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

const { stringifyBigInts } = ffjavascript.utils;


async function fflonkProve(zkeyFileName, witnessFileName, logger, options) {
    if (logger) logger.info("FFLONK PROVER STARTED");

    // Read witness file
    if (logger) logger.info("> Reading witness file");
    const {
        fd: fdWtns,
        sections: wtnsSections
    } = await binFileUtils__namespace.readBinFile(witnessFileName, "wtns", 2, 1 << 25, 1 << 23);
    const wtns = await readHeader(fdWtns, wtnsSections);

    //Read zkey file
    if (logger) logger.info("> Reading zkey file");
    const {
        fd: fdZKey,
        sections: zkeySections
    } = await binFileUtils__namespace.readBinFile(zkeyFileName, "zkey", 2, 1 << 25, 1 << 23);

    const zkey = await readHeader$1(fdZKey, zkeySections, undefined, options);

    if (zkey.protocolId !== FFLONK_PROTOCOL_ID) {
        throw new Error("zkey file is not fflonk");
    }

    if (!ffjavascript.Scalar.eq(zkey.r, wtns.q)) {
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
    const buffWitness = await binFileUtils__namespace.readSection(fdWtns, wtnsSections, 2);
    await fdWtns.close();

    // First element in plonk is not used and can be any value. (But always the same).
    // We set it to zero to go faster in the exponentiations.
    buffWitness.set(Fr.zero, 0);
    const buffInternalWitness = new ffjavascript.BigBuffer(zkey.nAdditions * sFr);

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
    polynomials.Sigma1 = new Polynomial(new ffjavascript.BigBuffer(sDomain), curve, logger);
    polynomials.Sigma2 = new Polynomial(new ffjavascript.BigBuffer(sDomain), curve, logger);
    polynomials.Sigma3 = new Polynomial(new ffjavascript.BigBuffer(sDomain), curve, logger);

    await fdZKey.readToBuffer(polynomials.Sigma1.coef, 0, sDomain, zkeySections[ZKEY_FF_SIGMA1_SECTION][0].p);
    await fdZKey.readToBuffer(polynomials.Sigma2.coef, 0, sDomain, zkeySections[ZKEY_FF_SIGMA2_SECTION][0].p);
    await fdZKey.readToBuffer(polynomials.Sigma3.coef, 0, sDomain, zkeySections[ZKEY_FF_SIGMA3_SECTION][0].p);

    if (logger) logger.info("··· Reading Sigma evaluations");
    evaluations.Sigma1 = new Evaluations(new ffjavascript.BigBuffer(sDomain * 4), curve, logger);
    evaluations.Sigma2 = new Evaluations(new ffjavascript.BigBuffer(sDomain * 4), curve, logger);
    evaluations.Sigma3 = new Evaluations(new ffjavascript.BigBuffer(sDomain * 4), curve, logger);

    await fdZKey.readToBuffer(evaluations.Sigma1.eval, 0, sDomain * 4, zkeySections[ZKEY_FF_SIGMA1_SECTION][0].p + sDomain);
    await fdZKey.readToBuffer(evaluations.Sigma2.eval, 0, sDomain * 4, zkeySections[ZKEY_FF_SIGMA2_SECTION][0].p + sDomain);
    await fdZKey.readToBuffer(evaluations.Sigma3.eval, 0, sDomain * 4, zkeySections[ZKEY_FF_SIGMA3_SECTION][0].p + sDomain);

    if (logger) logger.info(`> Reading Section ${ZKEY_FF_PTAU_SECTION}. Powers of Tau`);
    const PTau = new ffjavascript.BigBuffer(zkey.domainSize * 16 * sG1);
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
        publicSignals.push(ffjavascript.Scalar.fromRprLE(pub));
    }

    if (logger) logger.info("FFLONK PROVER FINISHED");

    return {
        proof: stringifyBigInts(_proof),
        publicSignals: stringifyBigInts(publicSignals)
    };

    async function calculateAdditions() {
        if (logger) logger.info("··· Computing additions");
        const additionsBuff = await binFileUtils__namespace.readSection(fdZKey, zkeySections, ZKEY_FF_ADDITIONS_SECTION);

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
            buffers.A = new ffjavascript.BigBuffer(sDomain);
            buffers.B = new ffjavascript.BigBuffer(sDomain);
            buffers.C = new ffjavascript.BigBuffer(sDomain);

            // Read zkey sections and fill the buffers
            const aMapBuff = await binFileUtils__namespace.readSection(fdZKey, zkeySections, ZKEY_FF_A_MAP_SECTION);
            const bMapBuff = await binFileUtils__namespace.readSection(fdZKey, zkeySections, ZKEY_FF_B_MAP_SECTION);
            const cMapBuff = await binFileUtils__namespace.readSection(fdZKey, zkeySections, ZKEY_FF_C_MAP_SECTION);

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
            evaluations.QL = new Evaluations(new ffjavascript.BigBuffer(sDomain * 4), curve, logger);
            evaluations.QR = new Evaluations(new ffjavascript.BigBuffer(sDomain * 4), curve, logger);
            evaluations.QM = new Evaluations(new ffjavascript.BigBuffer(sDomain * 4), curve, logger);
            evaluations.QO = new Evaluations(new ffjavascript.BigBuffer(sDomain * 4), curve, logger);
            evaluations.QC = new Evaluations(new ffjavascript.BigBuffer(sDomain * 4), curve, logger);

            // Read Q's evaluations from zkey file
            await fdZKey.readToBuffer(evaluations.QL.eval, 0, sDomain * 4, zkeySections[ZKEY_FF_QL_SECTION][0].p + sDomain);
            await fdZKey.readToBuffer(evaluations.QR.eval, 0, sDomain * 4, zkeySections[ZKEY_FF_QR_SECTION][0].p + sDomain);
            await fdZKey.readToBuffer(evaluations.QM.eval, 0, sDomain * 4, zkeySections[ZKEY_FF_QM_SECTION][0].p + sDomain);
            await fdZKey.readToBuffer(evaluations.QO.eval, 0, sDomain * 4, zkeySections[ZKEY_FF_QO_SECTION][0].p + sDomain);
            await fdZKey.readToBuffer(evaluations.QC.eval, 0, sDomain * 4, zkeySections[ZKEY_FF_QC_SECTION][0].p + sDomain);

            // Read Lagrange polynomials & evaluations from zkey file
            const lagrangePolynomials = await binFileUtils__namespace.readSection(fdZKey, zkeySections, ZKEY_FF_LAGRANGE_SECTION);
            evaluations.lagrange1 = new Evaluations(lagrangePolynomials, curve, logger);

            // Reserve memory for buffers T0
            buffers.T0 = new ffjavascript.BigBuffer(sDomain * 4);

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

        async function computeC1() {
            let C1 = new CPolynomial(4, curve, logger);
            C1.addPolynomial(0, polynomials.A);
            C1.addPolynomial(1, polynomials.B);
            C1.addPolynomial(2, polynomials.C);
            C1.addPolynomial(3, polynomials.T0);

            polynomials.C1 = C1.getPolynomial();

            // Check degree
            if (polynomials.C1.degree() >= 8 * zkey.domainSize - 8) {
                throw new Error("C1 Polynomial is not well calculated");
            }
        }
    }

    async function round2() {
        // STEP 2.1 - Compute permutation challenge beta and gamma ∈ F
        // Compute permutation challenge beta
        if (logger) logger.info("> Computing challenges beta and gamma");
        const transcript = new Keccak256Transcript(curve);

        // Add C0 to the transcript
        transcript.addPolCommitment(zkey.C0);

        // Add A to the transcript
        for (let i = 0; i < zkey.nPublic; i++) {
            transcript.addScalar(buffers.A.slice(i * sFr, i * sFr + sFr));
        }

        // Add C1 to the transcript
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

            let numArr = new ffjavascript.BigBuffer(sDomain);
            let denArr = new ffjavascript.BigBuffer(sDomain);

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

            buffers.T1 = new ffjavascript.BigBuffer(sDomain * 2);
            buffers.T1z = new ffjavascript.BigBuffer(sDomain * 2);

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

            buffers.T2 = new ffjavascript.BigBuffer(sDomain * 4);
            buffers.T2z = new ffjavascript.BigBuffer(sDomain * 4);

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

        async function computeC2() {
            let C2 = new CPolynomial(3, curve, logger);
            C2.addPolynomial(0, polynomials.Z);
            C2.addPolynomial(1, polynomials.T1);
            C2.addPolynomial(2, polynomials.T2);

            polynomials.C2 = C2.getPolynomial();

            // Check degree
            if (polynomials.C2.degree() >= 9 * zkey.domainSize) {
                throw new Error("C2 Polynomial is not well calculated");
            }
        }
    }

    async function round3() {
        if (logger) logger.info("> Computing challenge xi");
        // STEP 3.1 - Compute evaluation challenge xi ∈ S
        const transcript = new Keccak256Transcript(curve);
        transcript.addScalar(challenges.gamma);
        transcript.addPolCommitment(proof.getPolynomial("C2"));

        // Obtain a xi_seeder from the transcript
        // To force h1^4 = xi, h2^3 = xi and h_3^2 = xiω
        // we compute xi = xi_seeder^12, h1 = xi_seeder^3, h2 = xi_seeder^4 and h3 = xi_seeder^6
        challenges.xiSeed = transcript.getChallenge();
        const xiSeed2 = Fr.square(challenges.xiSeed);

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
        roots.S0.h0w8[0] = Fr.mul(xiSeed2, challenges.xiSeed);
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
        polynomials.QL = new Polynomial(new ffjavascript.BigBuffer(sDomain), curve, logger);
        polynomials.QR = new Polynomial(new ffjavascript.BigBuffer(sDomain), curve, logger);
        polynomials.QM = new Polynomial(new ffjavascript.BigBuffer(sDomain), curve, logger);
        polynomials.QO = new Polynomial(new ffjavascript.BigBuffer(sDomain), curve, logger);
        polynomials.QC = new Polynomial(new ffjavascript.BigBuffer(sDomain), curve, logger);

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
        transcript.addScalar(challenges.xiSeed);
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
        polynomials.C0 = new Polynomial(new ffjavascript.BigBuffer(sDomain * 8), curve, logger);
        await fdZKey.readToBuffer(polynomials.C0.coef, 0, sDomain * 8, zkeySections[ZKEY_FF_C0_SECTION][0].p);

        if (logger) logger.info("> Computing R0 polynomial");
        computeR0();
        if (logger) logger.info("> Computing R1 polynomial");
        computeR1();
        if (logger) logger.info("> Computing R2 polynomial");
        computeR2();

        if (logger) logger.info("> Computing F polynomial");
        await computeF();

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

            // COMPUTE F(X)
            polynomials.F = Polynomial.fromPolynomial(polynomials.C0, curve, logger);
            polynomials.F.sub(polynomials.R0);
            polynomials.F.divByZerofier(8, challenges.xi);

            let f2 = Polynomial.fromPolynomial(polynomials.C1, curve, logger);
            f2.sub(polynomials.R1);
            f2.mulScalar(challenges.alpha);
            f2.divByZerofier(4, challenges.xi);

            let f3 = Polynomial.fromPolynomial(polynomials.C2, curve, logger);
            f3.sub(polynomials.R2);
            f3.mulScalar(Fr.square(challenges.alpha));
            f3.divByZerofier(3, challenges.xi);
            f3.divByZerofier(3, challenges.xiw);

            polynomials.F.add(f2);
            polynomials.F.add(f3);

            if (polynomials.F.degree() >= 9 * zkey.domainSize - 6) {
                throw new Error("F Polynomial is not well calculated");
            }
        }
    }

    async function round5() {
        if (logger) logger.info("> Computing challenge y");

        // STEP 5.1 - Compute random evaluation point y ∈ F
        const transcript = new Keccak256Transcript(curve);
        transcript.addScalar(challenges.alpha);
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

        if (polynomials.L.degree() >= 9 * zkey.domainSize - 1) {
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

            // COMPUTE L(X)
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

            if (logger) logger.info("> Computing ZT polynomial");
            await computeZT();

            const evalZTY = polynomials.ZT.evaluate(challenges.y);
            polynomials.F.mulScalar(evalZTY);
            polynomials.L.sub(polynomials.F);

            // Check degree
            if (polynomials.L.degree() >= 9 * zkey.domainSize) {
                throw new Error("L Polynomial is not well calculated");
            }

            delete buffers.L;
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
        computeLiS0(toInverse, roots.S0.h0w8, challenges.y, curve);

        computeLiS1(toInverse, roots.S1.h1w4, challenges.y, curve);

        computeLiS2(toInverse, roots.S2.h2w3, roots.S2.h3w3, challenges.y, challenges.xi, challenges.xiw, curve);

        //   · L_i i=1 to num public inputs, needed in step 6 and 7 of the verifier to compute L_1(xi) and PI(xi)
        const size = Math.max(1, zkey.nPublic);

        let w = Fr.one;
        for (let i = 0; i < size; i++) {
            toInverse["Li_" + (i + 1)] = Fr.mul(Fr.e(zkey.domainSize), Fr.sub(challenges.xi, w));
            w = Fr.mul(w, Fr.w[zkey.power]);
        }

        let mulAccumulator = Fr.one;
        for (const element of Object.values(toInverse)) {
            if(Array.isArray(element)) {
                for (const subElement of element) {
                    mulAccumulator = Fr.mul(mulAccumulator, subElement);
                }
            } else {
                mulAccumulator = Fr.mul(mulAccumulator, element);
            }
        }
        return Fr.inv(mulAccumulator);

        
        function computeLiS0(toInverse, roots, x, curve) {
            const Fr = curve.Fr;
            const len = roots.length;
        
            const den1 = Fr.mul(Fr.e(len), Fr.exp(roots[0], len - 2));
        
            const Li = [];
            for (let i = 0; i < len; i++) {
                const den2 = roots[((len - 1) * i) % len];
                const den3 = Fr.sub(x, roots[i]);
        
                toInverse[["LiS0_" + (i + 1)]] = Fr.mul(Fr.mul(den1, den2), den3);
            }
        
            return Li;
        }

        function computeLiS1(toInverse, roots, x, curve) {
            const Fr = curve.Fr;
            const len = roots.length;
        
            const den1 = Fr.mul(Fr.e(len), Fr.exp(roots[0], len - 2));
        
            const Li = [];
            for (let i = 0; i < len; i++) {
                const den2 = roots[((len - 1) * i) % len];
                const den3 = Fr.sub(x, roots[i]);
        
                toInverse[["LiS1_" + (i + 1)]] = Fr.mul(Fr.mul(den1, den2), den3);

            }
        
            return Li;
        }

        function computeLiS2(toInverse, S2, S2p, value, xi, xiw, curve) {
            const Fr = curve.Fr;
        
            const Li = [];
        
            const _3h2 = Fr.mul(Fr.e(3), S2[0]);
            const xisubxiw = Fr.sub(xi, xiw);
            let den1 = Fr.mul(_3h2, xisubxiw);
            for (let i = 0; i < 3; i++) {
                const den2 = S2[2 * i % 3];
                const den3 = Fr.sub(value, S2[i]);
        
                toInverse[["LiS2_" + (i + 1)]] = Fr.mul(den1,Fr.mul(den2, den3));
                
            }
        
            const _3h3 = Fr.mul(Fr.e(3), S2p[0]);
            const xiwsubxi = Fr.sub(xiw, xi);
            den1 = Fr.mul(_3h3, xiwsubxi);
            for (let i = 0; i < 3; i++) {
                const den2 = S2p[2 * i % 3];
                const den3 = Fr.sub(value, S2p[i]);
        
                toInverse[["LiS2_" + (i + 1 + 3)]] = Fr.mul(den1,Fr.mul(den2, den3));    
            }
        
            return Li;
        }
    }
}

/*
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
const {unstringifyBigInts: unstringifyBigInts$2} = ffjavascript.utils;

async function fflonkFullProve(_input, wasmFilename, zkeyFilename, logger, wtnsCalcOptions, proverOptions) {
    const input = unstringifyBigInts$2(_input);

    const wtns= {type: "mem"};

    // Compute the witness
    await wtnsCalculate(input, wasmFilename, wtns, wtnsCalcOptions);

    // Compute the proof
    return await fflonkProve(zkeyFilename, wtns, logger, proverOptions);
}

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

const { unstringifyBigInts: unstringifyBigInts$1 } = ffjavascript.utils;

async function fflonkVerify(_vk_verifier, _publicSignals, _proof, logger) {
    if (logger) logger.info("FFLONK VERIFIER STARTED");

    _vk_verifier = unstringifyBigInts$1(_vk_verifier);
    _proof = unstringifyBigInts$1(_proof);

    const curve = await getCurveFromName(_vk_verifier.curve);

    const vk = fromObjectVk(curve, _vk_verifier);

    // TODO ??? Compute wr^3 and check if it matches with w

    const proof = new Proof(curve, logger);
    proof.fromObjectProof(_proof);

    const publicSignals = unstringifyBigInts$1(_publicSignals);

    if (publicSignals.length !== vk.nPublic) {
        logger.error("Number of public signals does not match with vk");
        return false;
    }

    const Fr = curve.Fr;

    if (logger) {
        logger.info("----------------------------");
        logger.info("  FFLONK VERIFY SETTINGS");
        logger.info(`  Curve:         ${curve.name}`);
        logger.info(`  Circuit power: ${vk.power}`);
        logger.info(`  Domain size:   ${2 ** vk.power}`);
        logger.info(`  Public vars:   ${vk.nPublic}`);
        logger.info("----------------------------");
    }

    // STEP 1 - Validate that all polynomial commitments ∈ G_1
    if (logger) logger.info("> Checking commitments belong to G1");
    if (!commitmentsBelongToG1(curve, proof, vk)) {
        if (logger) logger.error("Proof commitments are not valid");
        return false;
    }

    // STEP 2 - Validate that all evaluations ∈ F
    if (logger) logger.info("> Checking evaluations belong to F");
    if (!evaluationsAreValid(curve, proof)) {
        if (logger) logger.error("Proof evaluations are not valid.");
        return false;
    }

    // STEP 3 - Validate that w_i ∈ F for i ∈ [l]
    if (logger) logger.info("> Checking public inputs belong to F");
    if (!publicInputsAreValid(curve, publicSignals)) {
        if (logger) logger.error("Public inputs are not valid.");
        return false;
    }

    // STEP 4 - Compute the challenges: beta, gamma, xi, alpha and y ∈ F
    // as in prover description, from the common preprocessed inputs, public inputs and elements of π_SNARK
    if (logger) logger.info("> Computing challenges");
    const { challenges, roots } = computeChallenges(curve, proof, vk, publicSignals, logger);

    // STEP 5 - Compute the zero polynomial evaluation Z_H(xi) = xi^n - 1
    if (logger) logger.info("> Computing Zero polynomial evaluation Z_H(xi)");
    challenges.zh = Fr.sub(challenges.xiN, Fr.one);
    challenges.invzh = Fr.inv(challenges.zh);

    // STEP 6 - Compute the lagrange polynomial evaluation L_1(xi)
    if (logger) logger.info("> Computing Lagrange evaluations");
    const lagrangeEvals = await computeLagrangeEvaluations(curve, challenges, vk);

    // STEP 7 - Compute public input evaluation PI(xi)
    if (logger) logger.info("> Computing polynomial identities PI(X)");
    const pi = calculatePI(curve, publicSignals, lagrangeEvals);

    // STEP 8 - Compute polynomial r0 ∈ F_{<4}[X]
    if (logger) logger.info("> Computing r0(y)");
    const r0 = computeR0(proof, challenges, roots, curve, logger);

    // STEP 9 - Compute polynomial r1 ∈ F_{<4}[X]
    if (logger) logger.info("> Computing r1(y)");
    const r1 = computeR1(proof, challenges, roots, pi, curve, logger);

    // STEP 9 - Compute polynomial r2 ∈ F_{<6}[X]
    if (logger) logger.info("> Computing r2(y)");
    const r2 = computeR2(proof, challenges, roots, lagrangeEvals[1], vk, curve, logger);

    if (logger) logger.info("> Computing F");
    const F = computeF(curve, proof, vk, challenges, roots);

    if (logger) logger.info("> Computing E");
    const E = computeE(curve, proof, challenges, vk, r0, r1, r2);

    if (logger) logger.info("> Computing J");
    const J = computeJ(curve, proof, challenges);

    if (logger) logger.info("> Validate all evaluations with a pairing");
    const res = await isValidPairing(curve, proof, challenges, vk, F, E, J);

    if (logger) {
        if (res) {
            logger.info("PROOF VERIFIED SUCCESSFULLY");
        } else {
            logger.warn("Invalid Proof");
        }
    }

    if (logger) logger.info("FFLONK VERIFIER FINISHED");

    return res;

}

function fromObjectVk(curve, vk) {
    const res = vk;
    res.k1 = curve.Fr.fromObject(vk.k1);
    res.k2 = curve.Fr.fromObject(vk.k2);
    res.w = curve.Fr.fromObject(vk.w);
    // res.wW = curve.Fr.fromObject(vk.wW);
    res.w3 = curve.Fr.fromObject(vk.w3);
    res.w4 = curve.Fr.fromObject(vk.w4);
    res.w8 = curve.Fr.fromObject(vk.w8);
    res.wr = curve.Fr.fromObject(vk.wr);
    res.X_2 = curve.G2.fromObject(vk.X_2);
    res.C0 = curve.G1.fromObject(vk.C0);
    return res;
}

function commitmentsBelongToG1(curve, proof, vk) {
    const G1 = curve.G1;
    return G1.isValid(proof.polynomials.C1)
        && G1.isValid(proof.polynomials.C2)
        && G1.isValid(proof.polynomials.W1)
        && G1.isValid(proof.polynomials.W2)
        && G1.isValid(vk.C0);
}

function checkValueBelongToField(curve, value) {
    return ffjavascript.Scalar.lt(value, curve.r);
}

function checkEvaluationIsValid(curve, evaluation) {
    return checkValueBelongToField(curve, ffjavascript.Scalar.fromRprLE(evaluation));
}

function evaluationsAreValid(curve, proof) {
    return checkEvaluationIsValid(curve, proof.evaluations.ql)
        && checkEvaluationIsValid(curve, proof.evaluations.qr)
        && checkEvaluationIsValid(curve, proof.evaluations.qm)
        && checkEvaluationIsValid(curve, proof.evaluations.qo)
        && checkEvaluationIsValid(curve, proof.evaluations.qc)
        && checkEvaluationIsValid(curve, proof.evaluations.s1)
        && checkEvaluationIsValid(curve, proof.evaluations.s2)
        && checkEvaluationIsValid(curve, proof.evaluations.s3)
        && checkEvaluationIsValid(curve, proof.evaluations.a)
        && checkEvaluationIsValid(curve, proof.evaluations.b)
        && checkEvaluationIsValid(curve, proof.evaluations.c)
        && checkEvaluationIsValid(curve, proof.evaluations.z)
        && checkEvaluationIsValid(curve, proof.evaluations.zw)
        && checkEvaluationIsValid(curve, proof.evaluations.t1w)
        && checkEvaluationIsValid(curve, proof.evaluations.t2w);
}

function publicInputsAreValid(curve, publicInputs) {
    for(let i = 0; i < publicInputs.length; i++) {
        if(!checkValueBelongToField(curve, publicInputs[i])) {
            return false;
        }
    }
    return true;
}

function computeChallenges(curve, proof, vk, publicSignals, logger) {
    const Fr = curve.Fr;

    const challenges = {};
    const roots = {};
    const transcript = new Keccak256Transcript(curve);

    // Add C0 to the transcript
    transcript.addPolCommitment(vk.C0);

    for (let i = 0; i < publicSignals.length; i++) {
        transcript.addScalar(Fr.e(publicSignals[i]));
    }

    transcript.addPolCommitment(proof.polynomials.C1);
    challenges.beta = transcript.getChallenge();
    transcript.reset();

    transcript.addScalar(challenges.beta);
    challenges.gamma = transcript.getChallenge();

    transcript.reset();
    transcript.addScalar(challenges.gamma);
    transcript.addPolCommitment(proof.polynomials.C2);
    const xiSeed = transcript.getChallenge();
    const xiSeed2 = Fr.square(xiSeed);

    let w8 = [];
    w8[1] = vk.w8;
    w8[2] = Fr.square(vk.w8);
    w8[3] = Fr.mul(w8[2], vk.w8);
    w8[4] = Fr.mul(w8[3], vk.w8);
    w8[5] = Fr.mul(w8[4], vk.w8);
    w8[6] = Fr.mul(w8[5], vk.w8);
    w8[7] = Fr.mul(w8[6], vk.w8);
    let w4 = [];
    w4[1] = vk.w4;
    w4[2] = Fr.square(vk.w4);
    w4[3] = Fr.mul(w4[2], vk.w4);
    let w3 = [];
    w3[1] = vk.w3;
    w3[2] = Fr.square(vk.w3);

    // const w4_2 = Fr.square(vk.w4);
    // const w4_3 = Fr.mul(w4_2, vk.w4);
    // const w3_2 = Fr.square(vk.w3);

    // Compute h0 = xiSeeder^3
    roots.S0 = {};
    roots.S0.h0w8 = [];
    roots.S0.h0w8[0] = Fr.mul(xiSeed2, xiSeed);
    for (let i = 1; i < 8; i++) {
        roots.S0.h0w8[i] = Fr.mul(roots.S0.h0w8[0], w8[i]);
    }

    // Compute h1 = xi_seeder^6
    roots.S1 = {};
    roots.S1.h1w4 = [];
    roots.S1.h1w4[0] = Fr.square(roots.S0.h0w8[0]);
    for (let i = 1; i < 4; i++) {
        roots.S1.h1w4[i] = Fr.mul(roots.S1.h1w4[0], w4[i]);
    }

    // Compute h2 = xi_seeder^8
    roots.S2 = {};
    roots.S2.h2w3 = [];
    roots.S2.h2w3[0] = Fr.mul(roots.S1.h1w4[0], xiSeed2);
    roots.S2.h2w3[1] = Fr.mul(roots.S2.h2w3[0], w3[1]);
    roots.S2.h2w3[2] = Fr.mul(roots.S2.h2w3[0], w3[2]);

    roots.S2.h3w3 = [];
    // Multiply h3 by third-root-omega to obtain h_3^3 = xiω
    // So, h3 = xi_seeder^8 ω^{1/3}
    roots.S2.h3w3[0] = Fr.mul(roots.S2.h2w3[0], vk.wr);
    roots.S2.h3w3[1] = Fr.mul(roots.S2.h3w3[0], w3[1]);
    roots.S2.h3w3[2] = Fr.mul(roots.S2.h3w3[0], w3[2]);

    // Compute xi = xi_seeder^12
    challenges.xi = Fr.mul(Fr.square(roots.S2.h2w3[0]), roots.S2.h2w3[0]);
    challenges.xiw = Fr.mul(challenges.xi, Fr.w[vk.power]);

    challenges.xiN = challenges.xi;
    vk.domainSize = 1;
    for (let i = 0; i < vk.power; i++) {
        challenges.xiN = Fr.square(challenges.xiN);
        vk.domainSize *= 2;
    }

    transcript.reset();
    transcript.addScalar(xiSeed);
    transcript.addScalar(proof.evaluations.ql);
    transcript.addScalar(proof.evaluations.qr);
    transcript.addScalar(proof.evaluations.qm);
    transcript.addScalar(proof.evaluations.qo);
    transcript.addScalar(proof.evaluations.qc);
    transcript.addScalar(proof.evaluations.s1);
    transcript.addScalar(proof.evaluations.s2);
    transcript.addScalar(proof.evaluations.s3);
    transcript.addScalar(proof.evaluations.a);
    transcript.addScalar(proof.evaluations.b);
    transcript.addScalar(proof.evaluations.c);
    transcript.addScalar(proof.evaluations.z);
    transcript.addScalar(proof.evaluations.zw);
    transcript.addScalar(proof.evaluations.t1w);
    transcript.addScalar(proof.evaluations.t2w);
    challenges.alpha = transcript.getChallenge();

    transcript.reset();
    transcript.addScalar(challenges.alpha);
    transcript.addPolCommitment(proof.polynomials.W1);
    challenges.y = transcript.getChallenge();

    if (logger) {
        logger.info("··· challenges.beta:  " + Fr.toString(challenges.beta));
        logger.info("··· challenges.gamma: " + Fr.toString(challenges.gamma));
        logger.info("··· challenges.xi:    " + Fr.toString(challenges.xi));
        logger.info("··· challenges.alpha: " + Fr.toString(challenges.alpha));
        logger.info("··· challenges.y:     " + Fr.toString(challenges.y));
    }

    return { challenges: challenges, roots: roots };
}

async function computeLagrangeEvaluations(curve, challenges, vk) {
    const Fr = curve.Fr;

    const size = Math.max(1, vk.nPublic);
    const numArr = new ffjavascript.BigBuffer(size * Fr.n8);
    let denArr = new ffjavascript.BigBuffer(size * Fr.n8);

    let w = Fr.one;
    for (let i = 0; i < size; i++) {
        const i_sFr = i * Fr.n8;
        numArr.set(Fr.mul(w, challenges.zh), i_sFr);
        denArr.set(Fr.mul(Fr.e(vk.domainSize), Fr.sub(challenges.xi, w)), i_sFr);
        w = Fr.mul(w, vk.w);
    }

    denArr = await Fr.batchInverse(denArr);

    let L = [];
    for (let i = 0; i < size; i++) {
        const i_sFr = i * Fr.n8;
        L[i + 1] = Fr.mul(numArr.slice(i_sFr, i_sFr + Fr.n8), denArr.slice(i_sFr, i_sFr + Fr.n8));
    }
    return L;
}

function calculatePI(curve, publicSignals, lagrangeEvals) {
    const Fr = curve.Fr;

    let pi = Fr.zero;
    for (let i = 0; i < publicSignals.length; i++) {
        const w = Fr.e(publicSignals[i]);
        pi = Fr.sub(pi, Fr.mul(w, lagrangeEvals[i + 1]));
    }
    return pi;
}

function computeR0(proof, challenges, roots, curve, logger) {
    const Fr = curve.Fr;

    const Li = computeLagrangeLiSi(roots.S0.h0w8, challenges.y, challenges.xi, curve);

    // r0(y) = ∑_1^8 C_0(h_0 ω_8^{i-1}) L_i(y). To this end we need to compute

    // Compute the 8 C0 values
    if (logger) logger.info("··· Computing r0(y)");

    let res = Fr.zero;
    for (let i = 0; i < 8; i++) {
        let coefValues = [];
        coefValues[1] = roots.S0.h0w8[i];
        for (let j = 2; j < 8; j++) {
            coefValues[j] = Fr.mul(coefValues[j - 1], roots.S0.h0w8[i]);
        }

        let c0 = Fr.add(proof.evaluations.ql, Fr.mul(proof.evaluations.qr, coefValues[1]));
        c0 = Fr.add(c0, Fr.mul(proof.evaluations.qo, coefValues[2]));
        c0 = Fr.add(c0, Fr.mul(proof.evaluations.qm, coefValues[3]));
        c0 = Fr.add(c0, Fr.mul(proof.evaluations.qc, coefValues[4]));
        c0 = Fr.add(c0, Fr.mul(proof.evaluations.s1, coefValues[5]));
        c0 = Fr.add(c0, Fr.mul(proof.evaluations.s2, coefValues[6]));
        c0 = Fr.add(c0, Fr.mul(proof.evaluations.s3, coefValues[7]));

        res = Fr.add(res, Fr.mul(c0, Li[i]));
    }

    return res;
}

function computeR1(proof, challenges, roots, pi, curve, logger) {
    const Fr = curve.Fr;

    const Li = computeLagrangeLiSi(roots.S1.h1w4, challenges.y, challenges.xi, curve);

    // r1(y) = ∑_1^4 C_1(h_1 ω_4^{i-1}) L_i(y). To this end we need to compute
    // Z1 = {C1(h_1}, C1(h_1 ω_4), C1(h_1 ω_4^2), C1(h_1 ω_4^3)}
    // where C_1(h_1 ω_4^{i-1}) = eval.a + h_1 ω_4^i eval.b + (h_1 ω_4^i)^2 eval.c + (h_1 ω_4^i)^3 T0(xi),
    // where T0(xi) = [ qL·a + qR·b + qM·a·b + qO·c + qC + PI(xi) ] / Z_H(xi)

    // Compute T0(xi)
    if (logger) logger.info("··· Computing T0(xi)");
    let t0 = Fr.mul(proof.evaluations.ql, proof.evaluations.a);
    t0 = Fr.add(t0, Fr.mul(proof.evaluations.qr, proof.evaluations.b));
    t0 = Fr.add(t0, Fr.mul(proof.evaluations.qm, Fr.mul(proof.evaluations.a, proof.evaluations.b)));
    t0 = Fr.add(t0, Fr.mul(proof.evaluations.qo, proof.evaluations.c));
    t0 = Fr.add(t0, proof.evaluations.qc);
    t0 = Fr.add(t0, pi);
    t0 = Fr.mul(t0, challenges.invzh);

    // Compute the 4 C1 values
    if (logger) logger.info("··· Computing C1(h_1ω_4^i) values");

    let res = Fr.zero;
    for (let i = 0; i < 4; i++) {
        let c1 = proof.evaluations.a;
        c1 = Fr.add(c1, Fr.mul(roots.S1.h1w4[i], proof.evaluations.b));
        const h1w4Squared = Fr.square(roots.S1.h1w4[i]);
        c1 = Fr.add(c1, Fr.mul(h1w4Squared, proof.evaluations.c));
        c1 = Fr.add(c1, Fr.mul(Fr.mul(h1w4Squared, roots.S1.h1w4[i]), t0));

        res = Fr.add(res, Fr.mul(c1, Li[i]));
    }

    return res;
}

function computeR2(proof, challenges, roots, lagrange1, vk, curve, logger) {
    const Fr = curve.Fr;

    const LiS2 = computeLagrangeLiS2([roots.S2.h2w3, roots.S2.h3w3], challenges.y, challenges.xi, challenges.xiw, curve);

    // r2(y) = ∑_1^3 C_2(h_2 ω_3^{i-1}) L_i(y) + ∑_1^3 C_2(h_3 ω_3^{i-1}) L_{i+3}(y). To this end we need to compute
    // Z2 = {[C2(h_2}, C2(h_2 ω_3), C2(h_2 ω_3^2)], [C2(h_3}, C2(h_3 ω_3), C2(h_3 ω_3^2)]}
    // where C_2(h_2 ω_3^{i-1}) = eval.z + h_2 ω_2^i T1(xi) + (h_2 ω_3^i)^2 T2(xi),
    // where C_2(h_3 ω_3^{i-1}) = eval.z + h_3 ω_2^i T1(xi) + (h_3 ω_3^i)^2 T2(xi),
    // where T1(xi) = [ L_1(xi)(z-1)] / Z_H(xi)
    // and T2(xi) = [  (a + beta·xi + gamma)(b + beta·xi·k1 + gamma)(c + beta·xi·k2 + gamma)z
    //               - (a + beta·sigma1 + gamma)(b + beta·sigma2 + gamma)(c + beta·sigma3 + gamma)zω  ] / Z_H(xi)

    // Compute T1(xi)
    if (logger) logger.info("··· Computing T1(xi)");
    let t1 = Fr.sub(proof.evaluations.z, Fr.one);
    t1 = Fr.mul(t1, lagrange1);
    t1 = Fr.mul(t1, challenges.invzh);

    // Compute T2(xi)
    if (logger) logger.info("··· Computing T2(xi)");
    const betaxi = Fr.mul(challenges.beta, challenges.xi);
    const t211 = Fr.add(proof.evaluations.a, Fr.add(betaxi, challenges.gamma));
    const t212 = Fr.add(proof.evaluations.b, Fr.add(Fr.mul(betaxi, vk.k1), challenges.gamma));
    const t213 = Fr.add(proof.evaluations.c, Fr.add(Fr.mul(betaxi, vk.k2), challenges.gamma));
    const t21 = Fr.mul(t211, Fr.mul(t212, Fr.mul(t213, proof.evaluations.z)));

    const t221 = Fr.add(proof.evaluations.a, Fr.add(Fr.mul(challenges.beta, proof.evaluations.s1), challenges.gamma));
    const t222 = Fr.add(proof.evaluations.b, Fr.add(Fr.mul(challenges.beta, proof.evaluations.s2), challenges.gamma));
    const t223 = Fr.add(proof.evaluations.c, Fr.add(Fr.mul(challenges.beta, proof.evaluations.s3), challenges.gamma));
    const t22 = Fr.mul(t221, Fr.mul(t222, Fr.mul(t223, proof.evaluations.zw)));

    let t2 = Fr.sub(t21, t22);
    t2 = Fr.mul(t2, challenges.invzh);

    // Compute the 6 C2 values
    if (logger) logger.info("··· Computing C2(h_2ω_3^i) values");
    let res = Fr.zero;
    for (let i = 0; i < 3; i++) {
        let c2 = Fr.add(proof.evaluations.z, Fr.mul(roots.S2.h2w3[i], t1));
        c2 = Fr.add(c2, Fr.mul(Fr.square(roots.S2.h2w3[i]), t2));

        res = Fr.add(res, Fr.mul(c2, LiS2[i]));
    }

    if (logger) logger.info("··· Computing C2(h_3ω_3^i) values");
    for (let i = 0; i < 3; i++) {
        let c2 = Fr.add(proof.evaluations.zw, Fr.mul(roots.S2.h3w3[i], proof.evaluations.t1w));
        c2 = Fr.add(c2, Fr.mul(Fr.square(roots.S2.h3w3[i]), proof.evaluations.t2w));

        res = Fr.add(res, Fr.mul(c2, LiS2[i + 3]));
    }

    return res;
}

function computeF(curve, proof, vk, challenges, roots) {
    const G1 = curve.G1;
    const Fr = curve.Fr;

    let mulH0 = Fr.sub(challenges.y, roots.S0.h0w8[0]);
    for (let i = 1; i < 8; i++) {
        mulH0 = Fr.mul(mulH0, Fr.sub(challenges.y, roots.S0.h0w8[i]));
    }

    challenges.temp = mulH0;

    let mulH1 = Fr.sub(challenges.y, roots.S1.h1w4[0]);
    for (let i = 1; i < 4; i++) {
        mulH1 = Fr.mul(mulH1, Fr.sub(challenges.y, roots.S1.h1w4[i]));
    }

    let mulH2 = Fr.sub(challenges.y, roots.S2.h2w3[0]);
    for (let i = 1; i < 3; i++) {
        mulH2 = Fr.mul(mulH2, Fr.sub(challenges.y, roots.S2.h2w3[i]));
    }
    for (let i = 0; i < 3; i++) {
        mulH2 = Fr.mul(mulH2, Fr.sub(challenges.y, roots.S2.h3w3[i]));
    }

    challenges.quotient1 = Fr.mul(challenges.alpha, Fr.div(mulH0, mulH1));
    challenges.quotient2 = Fr.mul(Fr.square(challenges.alpha), Fr.div(mulH0, mulH2));

    let F2 = G1.timesFr(proof.polynomials.C1, challenges.quotient1);
    let F3 = G1.timesFr(proof.polynomials.C2, challenges.quotient2);

    return G1.add(vk.C0, G1.add(F2, F3));
}

function computeE(curve, proof, challenges, vk, r0, r1, r2) {
    const G1 = curve.G1;
    const Fr = curve.Fr;

    let E2 = Fr.mul(r1, challenges.quotient1);
    let E3 = Fr.mul(r2, challenges.quotient2);

    return G1.timesFr(G1.one, Fr.add(r0, Fr.add(E2, E3)));
}

function computeJ(curve, proof, challenges) {
    const G1 = curve.G1;

    return G1.timesFr(proof.polynomials.W1, challenges.temp);
}

async function isValidPairing(curve, proof, challenges, vk, F, E, J) {
    const G1 = curve.G1;

    let A1 = G1.timesFr(proof.polynomials.W2, challenges.y);
    A1 = G1.add(G1.sub(G1.sub(F, E), J), A1);
    const A2 = curve.G2.one;

    const B1 = proof.polynomials.W2;
    const B2 = vk.X_2;

    return await curve.pairingEq(G1.neg(A1), A2, B1, B2);
}


function computeLagrangeLiSi(roots, x, xi, curve) {
    const Fr = curve.Fr;
    const len = roots.length;

    const num = Fr.sub(Fr.exp(x, len), xi);
    const den1 = Fr.mul(Fr.e(len), Fr.exp(roots[0], len - 2));

    const Li = [];
    for (let i = 0; i < len; i++) {
        const den2 = roots[((len - 1) * i) % len];
        const den3 = Fr.sub(x, roots[i]);

        Li[i] = Fr.div(num, Fr.mul(Fr.mul(den1, den2), den3));
    }

    return Li;
}

function computeLagrangeLiS2(roots, value, xi0, xi1, curve) {
    const Fr = curve.Fr;

    const Li = [];

    const len = roots[0].length;
    const n = len * roots.length;

    const num1 = Fr.exp(value, n);
    const num2 = Fr.mul(Fr.add(xi0, xi1), Fr.exp(value, len));
    const num3 = Fr.mul(xi0, xi1);
    const num = Fr.add(Fr.sub(num1, num2), num3);

    let den1 = Fr.mul(Fr.mul(Fr.e(len), roots[0][0]), Fr.sub(xi0, xi1));
    for (let i = 0; i < len; i++) {
        const den2 = roots[0][(len - 1) * i % len];
        const den3 = Fr.sub(value, roots[0][i]);

        const den = Fr.mul(den1,Fr.mul(den2, den3));

        Li[i] = Fr.div(num, den);
    }

    den1 = Fr.mul(Fr.mul(Fr.e(len), roots[1][0]), Fr.sub(xi1, xi0));
    for (let i = 0; i < len; i++) {
        const den2 = roots[1][(len - 1) * i % len];
        const den3 = Fr.sub(value, roots[1][i]);

        const den = Fr.mul(den1,Fr.mul(den2, den3));

        Li[i + len] = Fr.div(num, den);
    }

    return Li;
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

const {unstringifyBigInts} = ffjavascript.utils;

function p256(n) {
    let nstr = n.toString(16);
    while (nstr.length < 64) nstr = "0" + nstr;
    nstr = `0x${nstr}`;
    return nstr;
}

async function fflonkExportCallData(_pub, _proof) {
    const proof = unstringifyBigInts(_proof);
    const pub = unstringifyBigInts(_pub);

    const curve = await getCurveFromName(proof.curve);
    curve.G1;
    curve.Fr;

    let inputs = "";
    for (let i = 0; i < pub.length; i++) {
        if (inputs !== "") inputs = inputs + ",";
        inputs = inputs + p256(pub[i]);
    }

    return `[${p256(proof.polynomials.C1[0])}, ${p256(proof.polynomials.C1[1])},` +
    `${p256(proof.polynomials.C2[0])},${p256(proof.polynomials.C2[1])},` +
    `${p256(proof.polynomials.W1[0])},${p256(proof.polynomials.W1[1])},` +
    `${p256(proof.polynomials.W2[0])},${p256(proof.polynomials.W2[1])},` +
    `${p256(proof.evaluations.ql)},${p256(proof.evaluations.qr)},${p256(proof.evaluations.qm)},` +
    `${p256(proof.evaluations.qo)},${p256(proof.evaluations.qc)},${p256(proof.evaluations.s1)},` +
    `${p256(proof.evaluations.s2)},${p256(proof.evaluations.s3)},${p256(proof.evaluations.a)},` +
    `${p256(proof.evaluations.b)},${p256(proof.evaluations.c)},${p256(proof.evaluations.z)},` +
    `${p256(proof.evaluations.zw)},${p256(proof.evaluations.t1w)},${p256(proof.evaluations.t2w)},` +
    `${p256(proof.evaluations.inv)}],` +
    `[${inputs}]`;
}

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

var fflonk = /*#__PURE__*/Object.freeze({
    __proto__: null,
    setup: fflonkSetup,
    prove: fflonkProve,
    fullProve: fflonkFullProve,
    verify: fflonkVerify,
    exportSolidityVerifier: fflonkExportSolidityVerifier,
    exportSolidityCallData: fflonkExportCallData
});

exports.curves = curves;
exports.fflonk = fflonk;
exports.groth16 = groth16;
exports.plonk = plonk;
exports.powersOfTau = powersoftau;
exports.r1cs = r1cs;
exports.wtns = wtns;
exports.zKey = zkey;
