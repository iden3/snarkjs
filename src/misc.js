/* global window */
import Blake2b from "blake2b-wasm";
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
    const ph = h.getPartialHash();
    const res = Blake2b(64);
    res.setPartialHash(ph);
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

export async function getRandomRng(entropy) {
    // Generate a random Rng
    while (!entropy) {
        entropy = await askEntropy();
    }
    const hasher = Blake2b(64);
    hasher.update(crypto.randomBytes(64));
    const enc = new TextEncoder(); // always utf-8
    hasher.update(enc.encode(entropy));
    const hash = Buffer.from(hasher.digest());

    const seed = [];
    for (let i=0;i<8;i++) {
        seed[i] = hash.readUInt32BE(i*4);
    }
    const rng = new ChaCha(seed);
    return rng;
}

export function rngFromBeaconParams(beaconHash, numIterationsExp) {
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
            curHash = crypto.createHash("sha256").update(curHash).digest();
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

