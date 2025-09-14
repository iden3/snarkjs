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

/* global window */
import { blake2b } from "@noble/hashes/blake2b";
import { u32 } from "@noble/hashes/utils";
import readline from "readline";
import { ChaCha } from "ffjavascript";
import crypto from "crypto";

const _revTable = [];
for (let i=0; i<256; i++) {
    _revTable[i] = _revSlow(i, 8);
}

function _revSlow(idx, bits) {
    let res =0;
    let a = idx;
    for (let i=0; i<bits; i++) {
        res <<= 1;
        res = res | (a &1);
        a >>=1;
    }
    return res;
}

export function bitReverse(idx, bits) {
    return (
        _revTable[idx >>> 24] |
        (_revTable[(idx >>> 16) & 0xFF] << 8) |
        (_revTable[(idx >>> 8) & 0xFF] << 16) |
        (_revTable[idx & 0xFF] << 24)
    ) >>> (32-bits);
}


export function log2( V )
{
    return( ( ( V & 0xFFFF0000 ) !== 0 ? ( V &= 0xFFFF0000, 16 ) : 0 ) | ( ( V & 0xFF00FF00 ) !== 0 ? ( V &= 0xFF00FF00, 8 ) : 0 ) | ( ( V & 0xF0F0F0F0 ) !== 0 ? ( V &= 0xF0F0F0F0, 4 ) : 0 ) | ( ( V & 0xCCCCCCCC ) !== 0 ? ( V &= 0xCCCCCCCC, 2 ) : 0 ) | ( ( V & 0xAAAAAAAA ) !== 0 ) );
}


export function formatHash(b, title) {
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

export function hashIsEqual(h1, h2) {
    if (h1.byteLength != h2.byteLength) return false;
    var dv1 = new Int8Array(h1);
    var dv2 = new Int8Array(h2);
    for (var i = 0 ; i != h1.byteLength ; i++)
    {
        if (dv1[i] != dv2[i]) return false;
    }
    return true;
}

export function cloneHasher(h) {
    return h.clone();
}

export function fromPartialHash(partial) {
    // NOTE: this is unsafe and uses internal API
    const buf = partial.subarray(0, 128);
    const rest = u32(partial.subarray(128));
    const res = blake2b.create({ dkLen: 64 });
    res.buffer.set(buf);
    (res.v0l = rest[0] | 0), (res.v0h = rest[1] | 0);
    (res.v1l = rest[2] | 0), (res.v1h = rest[3] | 0);
    (res.v2l = rest[4] | 0), (res.v2h = rest[5] | 0);
    (res.v3l = rest[6] | 0), (res.v3h = rest[7] | 0);
    (res.v4l = rest[8] | 0), (res.v4h = rest[9] | 0);
    (res.v5l = rest[10] | 0), (res.v5h = rest[11] | 0);
    (res.v6l = rest[12] | 0), (res.v6h = rest[13] | 0);
    (res.v7l = rest[14] | 0), (res.v7h = rest[15] | 0);
    const shift = 2 ** 32;
    const len = rest[16] + rest[17] * shift;
    const pos = rest[18] + rest[19] * shift;
    res.length = len + pos;
    res.pos = pos;
    return res;
}

export function toPartialHash(hash){
    // NOTE: this is unsafe and uses internal API
    const res = new Uint8Array(216);
    const res32 = u32(res.subarray(128));
    res.set(hash.buffer);
    (res32[0] = hash.v0l), (res32[1] = hash.v0h);
    (res32[2] = hash.v1l), (res32[3] = hash.v1h);
    (res32[4] = hash.v2l), (res32[5] = hash.v2h);
    (res32[6] = hash.v3l), (res32[7] = hash.v3h);
    (res32[8] = hash.v4l), (res32[9] = hash.v4h);
    (res32[10] = hash.v5l), (res32[11] = hash.v5h);
    (res32[12] = hash.v6l), (res32[13] = hash.v6h);
    (res32[14] = hash.v7l), (res32[15] = hash.v7h);
    res32[18] = hash.pos;
    res32[16] = hash.length-hash.pos;
    return res;
}

export async function sameRatio(curve, g1s, g1sx, g2s, g2sx) {
    if (curve.G1.isZero(g1s)) return false;
    if (curve.G1.isZero(g1sx)) return false;
    if (curve.G2.isZero(g2s)) return false;
    if (curve.G2.isZero(g2sx)) return false;
    // return curve.F12.eq(curve.pairing(g1s, g2sx), curve.pairing(g1sx, g2s));
    const res = await curve.pairingEq(g1s, g2sx, curve.G1.neg(g1sx), g2s);
    return res;
}


export function askEntropy() {
    if (process.browser) {
        return window.prompt("Enter a random text. (Entropy): ", "");
    } else {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve) => {
            rl.question("Enter a random text. (Entropy): ", (input) => resolve(input) );
        });
    }
}

export function getRandomBytes(n) {
    let array = new Uint8Array(n);
    if (process.browser) { // Supported
        globalThis.crypto.getRandomValues(array);
    } else { // NodeJS
        crypto.randomFillSync(array);
    }
    return array;
}

export async function sha256digest(data) {
    if (process.browser) { // Supported
        const buffer = await globalThis.crypto.subtle.digest("SHA-256", data.buffer);
        return new Uint8Array(buffer);
    } else { // NodeJS
        return crypto.createHash("sha256").update(data).digest();
    }
}

/**
 * @param {Uint8Array} data
 * @param {number} offset
 */
export function readUInt32BE(data, offset) {
    return new DataView(data.buffer).getUint32(offset, false);
}

export async function getRandomRng(entropy) {
    // Generate a random Rng
    while (!entropy) {
        entropy = await askEntropy();
    }
    const hasher = blake2b.create(64);
    hasher.update(getRandomBytes(64));
    const enc = new TextEncoder(); // always utf-8
    hasher.update(enc.encode(entropy));
    const hash = hasher.digest();

    const seed = [];
    for (let i=0;i<8;i++) {
        seed[i] = readUInt32BE(hash, i*4);
    }
    const rng = new ChaCha(seed);
    return rng;
}

export async function rngFromBeaconParams(beaconHash, numIterationsExp) {
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

    const rng = new ChaCha(seed);

    return rng;
}

export function hex2ByteArray(s) {
    if (s instanceof Uint8Array) return s;
    if (s.slice(0,2) == "0x") s= s.slice(2);
    return new Uint8Array(s.match(/[\da-f]{2}/gi).map(function (h) {
        return parseInt(h, 16);
    }));
}

export function byteArray2hex(byteArray) {
    return Array.prototype.map.call(byteArray, function(byte) {
        return ("0" + (byte & 0xFF).toString(16)).slice(-2);
    }).join("");
}

export function stringifyBigIntsWithField(Fr, o) {
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
