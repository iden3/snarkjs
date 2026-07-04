import * as e from "@iden3/binfileutils";
import { createBinFile as t, endWriteSection as n, readBinFile as r, readSection as i, startWriteSection as a, writeBigInt as o } from "@iden3/binfileutils";
import { BigBuffer as s, ChaCha as c, F1Field as l, Scalar as u, buildBls12381 as d, buildBn128 as f, utils as p } from "ffjavascript";
import { readR1cs as m, readR1csFd as h, readR1csHeader as g } from "r1csfile";
//#region \0rolldown/runtime.js
var _ = Object.defineProperty, v = (e, t) => {
	let n = {};
	for (var r in e) _(n, r, {
		get: e[r],
		enumerable: !0
	});
	return t || _(n, Symbol.toStringTag, { value: "Module" }), n;
}, y = /* @__PURE__ */ v({
	getCurveFromName: () => E,
	getCurveFromQ: () => T,
	getCurveFromR: () => w
}), b = u.e("73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001", 16), x = u.e("21888242871839275222246405745257275088548364400416034343698204186575808495617"), S = u.e("1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaab", 16), C = u.e("21888242871839275222246405745257275088696311157297823662689037894645226208583");
async function w(e, t) {
	let n, r = t && t.singleThread;
	if (u.eq(e, x)) n = await f(r);
	else if (u.eq(e, b)) n = await d(r);
	else throw Error(`Curve not supported: ${u.toString(e)}`);
	return n;
}
async function T(e, t) {
	let n, r = t && t.singleThread;
	if (u.eq(e, C)) n = await f(r);
	else if (u.eq(e, S)) n = await d(r);
	else throw Error(`Curve not supported: ${u.toString(e)}`);
	return n;
}
async function E(e, t) {
	let n, r = t && t.singleThread, i = a(e);
	if ([
		"BN128",
		"BN254",
		"ALTBN128"
	].indexOf(i) >= 0) n = await f(r);
	else if (["BLS12381"].indexOf(i) >= 0) n = await d(r);
	else throw Error(`Curve not supported: ${e}`);
	return n;
	function a(e) {
		return e.toUpperCase().match(/[A-Za-z0-9]+/g).join("");
	}
}
//#endregion
//#region node_modules/@noble/hashes/utils.js
function D(e) {
	return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array" && "BYTES_PER_ELEMENT" in e && e.BYTES_PER_ELEMENT === 1;
}
function O(e, t = "") {
	if (typeof e != "number") {
		let n = t && `"${t}" `;
		throw TypeError(`${n}expected number, got ${typeof e}`);
	}
	if (!Number.isSafeInteger(e) || e < 0) {
		let n = t && `"${t}" `;
		throw RangeError(`${n}expected integer >= 0, got ${e}`);
	}
}
function k(e, t, n = "") {
	let r = D(e), i = e?.length, a = t !== void 0;
	if (!r || a && i !== t) {
		let o = n && `"${n}" `, s = a ? ` of length ${t}` : "", c = r ? `length=${i}` : `type=${typeof e}`, l = o + "expected Uint8Array" + s + ", got " + c;
		throw r ? RangeError(l) : TypeError(l);
	}
	return e;
}
function A(e, t = !0) {
	if (e.destroyed) throw Error("Hash instance has been destroyed");
	if (t && e.finished) throw Error("Hash#digest() has already been called");
}
function j(e, t) {
	k(e, void 0, "digestInto() output");
	let n = t.outputLen;
	if (e.length < n) throw RangeError("\"digestInto() output\" expected to be of length >=" + n);
}
function M(e) {
	return new Uint32Array(e.buffer, e.byteOffset, Math.floor(e.byteLength / 4));
}
function N(...e) {
	for (let t = 0; t < e.length; t++) e[t].fill(0);
}
var P = new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68;
function F(e) {
	return e << 24 & 4278190080 | e << 8 & 16711680 | e >>> 8 & 65280 | e >>> 24 & 255;
}
var I = P ? (e) => e : (e) => F(e) >>> 0;
function ee(e) {
	for (let t = 0; t < e.length; t++) e[t] = F(e[t]);
	return e;
}
var L = P ? (e) => e : ee;
function R(e, t = {}) {
	let n = (t, n) => e(n).update(t).digest(), r = e(void 0);
	return n.outputLen = r.outputLen, n.blockLen = r.blockLen, n.canXOF = r.canXOF, n.create = (t) => e(t), Object.assign(n, t), Object.freeze(n);
}
//#endregion
//#region node_modules/@noble/hashes/_blake.js
var z = /* @__PURE__ */ Uint8Array.from([
	0,
	1,
	2,
	3,
	4,
	5,
	6,
	7,
	8,
	9,
	10,
	11,
	12,
	13,
	14,
	15,
	14,
	10,
	4,
	8,
	9,
	15,
	13,
	6,
	1,
	12,
	0,
	2,
	11,
	7,
	5,
	3,
	11,
	8,
	12,
	0,
	5,
	2,
	15,
	13,
	10,
	14,
	3,
	6,
	7,
	1,
	9,
	4,
	7,
	9,
	3,
	1,
	13,
	12,
	11,
	14,
	2,
	6,
	5,
	10,
	4,
	0,
	15,
	8,
	9,
	0,
	5,
	7,
	2,
	4,
	10,
	15,
	14,
	1,
	11,
	12,
	6,
	8,
	3,
	13,
	2,
	12,
	6,
	10,
	0,
	11,
	8,
	3,
	4,
	13,
	7,
	5,
	15,
	14,
	1,
	9,
	12,
	5,
	1,
	15,
	14,
	13,
	4,
	10,
	0,
	7,
	6,
	3,
	9,
	2,
	8,
	11,
	13,
	11,
	7,
	14,
	12,
	1,
	3,
	9,
	5,
	0,
	15,
	4,
	8,
	6,
	2,
	10,
	6,
	15,
	14,
	9,
	11,
	3,
	0,
	8,
	12,
	2,
	13,
	7,
	1,
	4,
	10,
	5,
	10,
	2,
	8,
	4,
	7,
	6,
	1,
	5,
	15,
	11,
	9,
	14,
	3,
	12,
	13,
	0,
	0,
	1,
	2,
	3,
	4,
	5,
	6,
	7,
	8,
	9,
	10,
	11,
	12,
	13,
	14,
	15,
	14,
	10,
	4,
	8,
	9,
	15,
	13,
	6,
	1,
	12,
	0,
	2,
	11,
	7,
	5,
	3,
	11,
	8,
	12,
	0,
	5,
	2,
	15,
	13,
	10,
	14,
	3,
	6,
	7,
	1,
	9,
	4,
	7,
	9,
	3,
	1,
	13,
	12,
	11,
	14,
	2,
	6,
	5,
	10,
	4,
	0,
	15,
	8,
	9,
	0,
	5,
	7,
	2,
	4,
	10,
	15,
	14,
	1,
	11,
	12,
	6,
	8,
	3,
	13,
	2,
	12,
	6,
	10,
	0,
	11,
	8,
	3,
	4,
	13,
	7,
	5,
	15,
	14,
	1,
	9
]), B = /* @__PURE__ */ BigInt(2 ** 32 - 1), te = /* @__PURE__ */ BigInt(32);
function ne(e, t = !1) {
	return t ? {
		h: Number(e & B),
		l: Number(e >> te & B)
	} : {
		h: Number(e >> te & B) | 0,
		l: Number(e & B) | 0
	};
}
function V(e, t = !1) {
	let n = e.length, r = new Uint32Array(n), i = new Uint32Array(n);
	for (let a = 0; a < n; a++) {
		let { h: n, l: o } = ne(e[a], t);
		[r[a], i[a]] = [n, o];
	}
	return [r, i];
}
var H = (e, t, n) => e >>> n | t << 32 - n, re = (e, t, n) => e << 32 - n | t >>> n, ie = (e, t, n) => e << 64 - n | t >>> n - 32, ae = (e, t, n) => e >>> n - 32 | t << 64 - n, oe = (e, t) => t, se = (e, t) => e, ce = (e, t, n) => e << n | t >>> 32 - n, le = (e, t, n) => t << n | e >>> 32 - n, ue = (e, t, n) => t << n - 32 | e >>> 64 - n, de = (e, t, n) => e << n - 32 | t >>> 64 - n;
function fe(e, t, n, r) {
	let i = (t >>> 0) + (r >>> 0);
	return {
		h: e + n + (i / 2 ** 32 | 0) | 0,
		l: i | 0
	};
}
var pe = (e, t, n) => (e >>> 0) + (t >>> 0) + (n >>> 0), me = (e, t, n, r) => t + n + r + (e / 2 ** 32 | 0) | 0, U = /* @__PURE__ */ Uint32Array.from([
	4089235720,
	1779033703,
	2227873595,
	3144134277,
	4271175723,
	1013904242,
	1595750129,
	2773480762,
	2917565137,
	1359893119,
	725511199,
	2600822924,
	4215389547,
	528734635,
	327033209,
	1541459225
]), W = /* @__PURE__ */ new Uint32Array(32);
function he(e, t, n, r, i, a) {
	let o = i[a], s = i[a + 1], c = W[2 * e], l = W[2 * e + 1], u = W[2 * t], d = W[2 * t + 1], f = W[2 * n], p = W[2 * n + 1], m = W[2 * r], h = W[2 * r + 1], g = pe(c, u, o);
	l = me(g, l, d, s), c = g | 0, {Dh: h, Dl: m} = {
		Dh: h ^ l,
		Dl: m ^ c
	}, {Dh: h, Dl: m} = {
		Dh: oe(h, m),
		Dl: se(h, m)
	}, {h: p, l: f} = fe(p, f, h, m), {Bh: d, Bl: u} = {
		Bh: d ^ p,
		Bl: u ^ f
	}, {Bh: d, Bl: u} = {
		Bh: H(d, u, 24),
		Bl: re(d, u, 24)
	}, W[2 * e] = c, W[2 * e + 1] = l, W[2 * t] = u, W[2 * t + 1] = d, W[2 * n] = f, W[2 * n + 1] = p, W[2 * r] = m, W[2 * r + 1] = h;
}
function ge(e, t, n, r, i, a) {
	let o = i[a], s = i[a + 1], c = W[2 * e], l = W[2 * e + 1], u = W[2 * t], d = W[2 * t + 1], f = W[2 * n], p = W[2 * n + 1], m = W[2 * r], h = W[2 * r + 1], g = pe(c, u, o);
	l = me(g, l, d, s), c = g | 0, {Dh: h, Dl: m} = {
		Dh: h ^ l,
		Dl: m ^ c
	}, {Dh: h, Dl: m} = {
		Dh: H(h, m, 16),
		Dl: re(h, m, 16)
	}, {h: p, l: f} = fe(p, f, h, m), {Bh: d, Bl: u} = {
		Bh: d ^ p,
		Bl: u ^ f
	}, {Bh: d, Bl: u} = {
		Bh: ie(d, u, 63),
		Bl: ae(d, u, 63)
	}, W[2 * e] = c, W[2 * e + 1] = l, W[2 * t] = u, W[2 * t + 1] = d, W[2 * n] = f, W[2 * n + 1] = p, W[2 * r] = m, W[2 * r + 1] = h;
}
function _e(e, t = {}, n, r, i) {
	if (O(n), e <= 0 || e > n) throw Error("outputLen bigger than keyLen");
	let { key: a, salt: o, personalization: s } = t;
	if (a !== void 0 && (a.length < 1 || a.length > n)) throw Error("\"key\" expected to be undefined or of length=1.." + n);
	o !== void 0 && k(o, r, "salt"), s !== void 0 && k(s, i, "personalization");
}
var ve = class {
	buffer;
	buffer32;
	finished = !1;
	destroyed = !1;
	length = 0;
	pos = 0;
	blockLen;
	outputLen;
	canXOF = !1;
	constructor(e, t) {
		O(e), O(t), this.blockLen = e, this.outputLen = t, this.buffer = new Uint8Array(e), this.buffer32 = M(this.buffer);
	}
	update(e) {
		A(this), k(e);
		let { blockLen: t, buffer: n, buffer32: r } = this, i = e.length, a = e.byteOffset, o = e.buffer;
		for (let s = 0; s < i;) {
			this.pos === t && (L(r), this.compress(r, 0, !1), L(r), this.pos = 0);
			let c = Math.min(t - this.pos, i - s), l = a + s;
			if (c === t && !(l % 4) && s + c < i) {
				let e = new Uint32Array(o, l, Math.floor((i - s) / 4));
				L(e);
				for (let n = 0; s + t < i; n += r.length, s += t) this.length += t, this.compress(e, n, !1);
				L(e);
				continue;
			}
			n.set(e.subarray(s, s + c), this.pos), this.pos += c, this.length += c, s += c;
		}
		return this;
	}
	digestInto(e) {
		A(this), j(e, this);
		let { pos: t, buffer32: n } = this;
		if (this.finished = !0, N(this.buffer.subarray(t)), L(n), this.compress(n, 0, !0), L(n), e.byteOffset & 3) throw RangeError("\"digestInto() output\" expected 4-byte aligned byteOffset, got " + e.byteOffset);
		let r = this.get(), i = M(e), a = Math.floor(this.outputLen / 4);
		for (let e = 0; e < a; e++) i[e] = I(r[e]);
		let o = this.outputLen % 4;
		if (!o) return;
		let s = a * 4, c = r[a];
		for (let t = 0; t < o; t++) e[s + t] = c >>> 8 * t;
	}
	digest() {
		let { buffer: e, outputLen: t } = this;
		this.digestInto(e);
		let n = e.slice(0, t);
		return this.destroy(), n;
	}
	_cloneInto(e) {
		let { buffer: t, length: n, finished: r, destroyed: i, outputLen: a, pos: o } = this;
		return e ||= new this.constructor({ dkLen: a }), e.set(...this.get()), e.buffer.set(t), e.destroyed = i, e.finished = r, e.length = n, e.pos = o, e.outputLen = a, e;
	}
	clone() {
		return this._cloneInto();
	}
}, ye = class extends ve {
	v0l = U[0] | 0;
	v0h = U[1] | 0;
	v1l = U[2] | 0;
	v1h = U[3] | 0;
	v2l = U[4] | 0;
	v2h = U[5] | 0;
	v3l = U[6] | 0;
	v3h = U[7] | 0;
	v4l = U[8] | 0;
	v4h = U[9] | 0;
	v5l = U[10] | 0;
	v5h = U[11] | 0;
	v6l = U[12] | 0;
	v6h = U[13] | 0;
	v7l = U[14] | 0;
	v7h = U[15] | 0;
	constructor(e = {}) {
		let t = e.dkLen === void 0 ? 64 : e.dkLen;
		super(128, t), _e(t, e, 64, 16, 16);
		let { key: n, personalization: r, salt: i } = e, a = 0;
		if (n !== void 0 && (k(n, void 0, "key"), a = n.length), this.v0l ^= this.outputLen | a << 8 | 16842752, i !== void 0) {
			k(i, void 0, "salt");
			let e = M(i);
			this.v4l ^= I(e[0]), this.v4h ^= I(e[1]), this.v5l ^= I(e[2]), this.v5h ^= I(e[3]);
		}
		if (r !== void 0) {
			k(r, void 0, "personalization");
			let e = M(r);
			this.v6l ^= I(e[0]), this.v6h ^= I(e[1]), this.v7l ^= I(e[2]), this.v7h ^= I(e[3]);
		}
		if (n !== void 0) {
			let e = new Uint8Array(this.blockLen);
			e.set(n), this.update(e);
		}
	}
	get() {
		let { v0l: e, v0h: t, v1l: n, v1h: r, v2l: i, v2h: a, v3l: o, v3h: s, v4l: c, v4h: l, v5l: u, v5h: d, v6l: f, v6h: p, v7l: m, v7h: h } = this;
		return [
			e,
			t,
			n,
			r,
			i,
			a,
			o,
			s,
			c,
			l,
			u,
			d,
			f,
			p,
			m,
			h
		];
	}
	set(e, t, n, r, i, a, o, s, c, l, u, d, f, p, m, h) {
		this.v0l = e | 0, this.v0h = t | 0, this.v1l = n | 0, this.v1h = r | 0, this.v2l = i | 0, this.v2h = a | 0, this.v3l = o | 0, this.v3h = s | 0, this.v4l = c | 0, this.v4h = l | 0, this.v5l = u | 0, this.v5h = d | 0, this.v6l = f | 0, this.v6h = p | 0, this.v7l = m | 0, this.v7h = h | 0;
	}
	compress(e, t, n) {
		this.get().forEach((e, t) => W[t] = e), W.set(U, 16);
		let { h: r, l: i } = ne(BigInt(this.length));
		W[24] = U[8] ^ i, W[25] = U[9] ^ r, n && (W[28] = ~W[28], W[29] = ~W[29]);
		let a = 0, o = z;
		for (let n = 0; n < 12; n++) he(0, 4, 8, 12, e, t + 2 * o[a++]), ge(0, 4, 8, 12, e, t + 2 * o[a++]), he(1, 5, 9, 13, e, t + 2 * o[a++]), ge(1, 5, 9, 13, e, t + 2 * o[a++]), he(2, 6, 10, 14, e, t + 2 * o[a++]), ge(2, 6, 10, 14, e, t + 2 * o[a++]), he(3, 7, 11, 15, e, t + 2 * o[a++]), ge(3, 7, 11, 15, e, t + 2 * o[a++]), he(0, 5, 10, 15, e, t + 2 * o[a++]), ge(0, 5, 10, 15, e, t + 2 * o[a++]), he(1, 6, 11, 12, e, t + 2 * o[a++]), ge(1, 6, 11, 12, e, t + 2 * o[a++]), he(2, 7, 8, 13, e, t + 2 * o[a++]), ge(2, 7, 8, 13, e, t + 2 * o[a++]), he(3, 4, 9, 14, e, t + 2 * o[a++]), ge(3, 4, 9, 14, e, t + 2 * o[a++]);
		this.v0l ^= W[0] ^ W[16], this.v0h ^= W[1] ^ W[17], this.v1l ^= W[2] ^ W[18], this.v1h ^= W[3] ^ W[19], this.v2l ^= W[4] ^ W[20], this.v2h ^= W[5] ^ W[21], this.v3l ^= W[6] ^ W[22], this.v3h ^= W[7] ^ W[23], this.v4l ^= W[8] ^ W[24], this.v4h ^= W[9] ^ W[25], this.v5l ^= W[10] ^ W[26], this.v5h ^= W[11] ^ W[27], this.v6l ^= W[12] ^ W[28], this.v6h ^= W[13] ^ W[29], this.v7l ^= W[14] ^ W[30], this.v7h ^= W[15] ^ W[31], N(W);
	}
	destroy() {
		this.destroyed = !0, N(this.buffer32), this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
	}
}, G = /* @__PURE__ */ R((e) => new ye(e)), be = {}, xe = [];
for (let e = 0; e < 256; e++) xe[e] = Se(e, 8);
function Se(e, t) {
	let n = 0, r = e;
	for (let e = 0; e < t; e++) n <<= 1, n |= r & 1, r >>= 1;
	return n;
}
function Ce(e) {
	return (e & 4294901760 ? (e &= 4294901760, 16) : 0) | (e & 4278255360 ? (e &= 4278255360, 8) : 0) | (e & 4042322160 ? (e &= 4042322160, 4) : 0) | (e & 3435973836 ? (e &= 3435973836, 2) : 0) | (e & 2863311530) != 0;
}
function K(e, t) {
	let n = new DataView(e.buffer, e.byteOffset, e.byteLength), r = "";
	for (let e = 0; e < 4; e++) {
		e > 0 && (r += "\n"), r += "		";
		for (let t = 0; t < 4; t++) t > 0 && (r += " "), r += n.getUint32(e * 16 + t * 4).toString(16).padStart(8, "0");
	}
	return t && (r = t + "\n" + r), r;
}
function we(e, t) {
	if (e.byteLength != t.byteLength) return !1;
	for (var n = new Int8Array(e), r = new Int8Array(t), i = 0; i != e.byteLength; i++) if (n[i] != r[i]) return !1;
	return !0;
}
function Te(e) {
	return e.clone();
}
function Ee(e) {
	let t = e.subarray(0, 128), n = M(e.subarray(128)), r = G.create({ dkLen: 64 });
	r.buffer.set(t), r.v0l = n[0] | 0, r.v0h = n[1] | 0, r.v1l = n[2] | 0, r.v1h = n[3] | 0, r.v2l = n[4] | 0, r.v2h = n[5] | 0, r.v3l = n[6] | 0, r.v3h = n[7] | 0, r.v4l = n[8] | 0, r.v4h = n[9] | 0, r.v5l = n[10] | 0, r.v5h = n[11] | 0, r.v6l = n[12] | 0, r.v6h = n[13] | 0, r.v7l = n[14] | 0, r.v7h = n[15] | 0;
	let i = 2 ** 32, a = n[16] + n[17] * i, o = n[18] + n[19] * i;
	return r.length = a + o, r.pos = o, r;
}
function De(e) {
	let t = /* @__PURE__ */ new Uint8Array(216), n = M(t.subarray(128));
	return t.set(e.buffer), n[0] = e.v0l, n[1] = e.v0h, n[2] = e.v1l, n[3] = e.v1h, n[4] = e.v2l, n[5] = e.v2h, n[6] = e.v3l, n[7] = e.v3h, n[8] = e.v4l, n[9] = e.v4h, n[10] = e.v5l, n[11] = e.v5h, n[12] = e.v6l, n[13] = e.v6h, n[14] = e.v7l, n[15] = e.v7h, n[18] = e.pos, n[16] = e.length - e.pos, t;
}
async function Oe(e, t, n, r, i) {
	return e.G1.isZero(t) || e.G1.isZero(n) || e.G2.isZero(r) || e.G2.isZero(i) ? !1 : await e.pairingEq(t, i, e.G1.neg(n), r);
}
function ke() {
	if (typeof window < "u" && typeof window.prompt == "function") return window.prompt("Enter a random text. (Entropy): ", "");
	{
		let e = be.createInterface({
			input: process.stdin,
			output: process.stdout
		});
		return new Promise((t) => {
			e.question("Enter a random text. (Entropy): ", (e) => t(e));
		});
	}
}
function Ae(e) {
	let t = new Uint8Array(e);
	if (be && be.randomFillSync) be.randomFillSync(t);
	else if (globalThis.crypto !== void 0 && globalThis.crypto.getRandomValues) for (let n = 0; n < e; n += 65536) globalThis.crypto.getRandomValues(t.subarray(n, Math.min(n + 65536, e)));
	else throw Error("No secure random source available");
	return t;
}
async function je(e) {
	if (be && be.createHash) return be.createHash("sha256").update(e).digest();
	{
		let t = await globalThis.crypto.subtle.digest("SHA-256", e);
		return new Uint8Array(t);
	}
}
function Me(e, t) {
	return new DataView(e.buffer).getUint32(t, !1);
}
async function Ne(e) {
	for (; !e;) e = await ke();
	let t = G.create(64);
	t.update(Ae(64));
	let n = new TextEncoder();
	t.update(n.encode(e));
	let r = t.digest(), i = [];
	for (let e = 0; e < 8; e++) i[e] = Me(r, e * 4);
	return new c(i);
}
async function Pe(e, t) {
	let n, r;
	t < 32 ? (n = 1 << t >>> 0, r = 1) : (n = 4294967296, r = 1 << t - 32 >>> 0);
	let i = e;
	for (let e = 0; e < r; e++) for (let e = 0; e < n; e++) i = await je(i);
	let a = new DataView(i.buffer, i.byteOffset, i.byteLength), o = [];
	for (let e = 0; e < 8; e++) o[e] = a.getUint32(e * 4, !1);
	return new c(o);
}
function Fe(e) {
	return e instanceof Uint8Array ? e : (e.slice(0, 2) == "0x" && (e = e.slice(2)), new Uint8Array(e.match(/[\da-f]{2}/gi).map(function(e) {
		return parseInt(e, 16);
	})));
}
function Ie(e) {
	return Array.prototype.map.call(e, function(e) {
		return ("0" + (e & 255).toString(16)).slice(-2);
	}).join("");
}
function Le(e, t) {
	if (t instanceof Uint8Array) return e.toString(t);
	if (Array.isArray(t)) return t.map(Le.bind(null, e));
	if (typeof t == "object") {
		let n = {};
		return Object.keys(t).forEach((r) => {
			n[r] = Le(e, t[r]);
		}), n;
	} else if (typeof t == "bigint" || t.eq !== void 0) return t.toString(10);
	else return t;
}
//#endregion
//#region src/zkey_utils.js
async function Re(t, n) {
	await e.startWriteSection(t, 1), await t.writeULE32(1), await e.endWriteSection(t);
	let r = await T(n.q);
	await e.startWriteSection(t, 2);
	let i = r.q, a = (Math.floor((u.bitLength(i) - 1) / 64) + 1) * 8, o = r.r, s = (Math.floor((u.bitLength(o) - 1) / 64) + 1) * 8;
	await t.writeULE32(a), await e.writeBigInt(t, i, a), await t.writeULE32(s), await e.writeBigInt(t, o, s), await t.writeULE32(n.nVars), await t.writeULE32(n.nPublic), await t.writeULE32(n.domainSize), await ze(t, r, n.vk_alpha_1), await ze(t, r, n.vk_beta_1), await Be(t, r, n.vk_beta_2), await Be(t, r, n.vk_gamma_2), await ze(t, r, n.vk_delta_1), await Be(t, r, n.vk_delta_2), await e.endWriteSection(t);
}
async function ze(e, t, n) {
	let r = new Uint8Array(t.G1.F.n8 * 2);
	t.G1.toRprLEM(r, 0, n), await e.write(r);
}
async function Be(e, t, n) {
	let r = new Uint8Array(t.G2.F.n8 * 2);
	t.G2.toRprLEM(r, 0, n), await e.write(r);
}
async function q(e, t, n) {
	let r = await e.read(t.G1.F.n8 * 2), i = t.G1.fromRprLEM(r, 0);
	return n ? t.G1.toObject(i) : i;
}
async function Ve(e, t, n) {
	let r = await e.read(t.G2.F.n8 * 2), i = t.G2.fromRprLEM(r, 0);
	return n ? t.G2.toObject(i) : i;
}
async function He(t, n, r, i) {
	await e.startReadUniqueSection(t, n, 1);
	let a = await t.readULE32();
	if (await e.endReadSection(t), a === 1) return await Ue(t, n, r, i);
	if (a === 2) return await We(t, n, r, i);
	if (a === 10) return await Ge(t, n, r, i);
	throw Error("Protocol not supported: ");
}
async function Ue(t, n, r, i) {
	let a = {};
	a.protocol = "groth16", await e.startReadUniqueSection(t, n, 2);
	let o = await t.readULE32();
	a.n8q = o, a.q = await e.readBigInt(t, o);
	let s = await t.readULE32();
	return a.n8r = s, a.r = await e.readBigInt(t, s), a.curve = await T(a.q, i), a.nVars = await t.readULE32(), a.nPublic = await t.readULE32(), a.domainSize = await t.readULE32(), a.power = Ce(a.domainSize), a.vk_alpha_1 = await q(t, a.curve, r), a.vk_beta_1 = await q(t, a.curve, r), a.vk_beta_2 = await Ve(t, a.curve, r), a.vk_gamma_2 = await Ve(t, a.curve, r), a.vk_delta_1 = await q(t, a.curve, r), a.vk_delta_2 = await Ve(t, a.curve, r), await e.endReadSection(t), a;
}
async function We(t, n, r, i) {
	let a = {};
	a.protocol = "plonk", await e.startReadUniqueSection(t, n, 2);
	let o = await t.readULE32();
	a.n8q = o, a.q = await e.readBigInt(t, o);
	let s = await t.readULE32();
	return a.n8r = s, a.r = await e.readBigInt(t, s), a.curve = await T(a.q, i), a.nVars = await t.readULE32(), a.nPublic = await t.readULE32(), a.domainSize = await t.readULE32(), a.power = Ce(a.domainSize), a.nAdditions = await t.readULE32(), a.nConstraints = await t.readULE32(), a.k1 = await t.read(s), a.k2 = await t.read(s), a.Qm = await q(t, a.curve, r), a.Ql = await q(t, a.curve, r), a.Qr = await q(t, a.curve, r), a.Qo = await q(t, a.curve, r), a.Qc = await q(t, a.curve, r), a.S1 = await q(t, a.curve, r), a.S2 = await q(t, a.curve, r), a.S3 = await q(t, a.curve, r), a.X_2 = await Ve(t, a.curve, r), await e.endReadSection(t), a;
}
async function Ge(t, n, r, i) {
	let a = {};
	a.protocol = "fflonk", a.protocolId = 10, await e.startReadUniqueSection(t, n, 2);
	let o = await t.readULE32();
	a.n8q = o, a.q = await e.readBigInt(t, o), a.curve = await T(a.q, i);
	let s = await t.readULE32();
	return a.n8r = s, a.r = await e.readBigInt(t, s), a.nVars = await t.readULE32(), a.nPublic = await t.readULE32(), a.domainSize = await t.readULE32(), a.power = Ce(a.domainSize), a.nAdditions = await t.readULE32(), a.nConstraints = await t.readULE32(), a.k1 = await t.read(s), a.k2 = await t.read(s), a.w3 = await t.read(s), a.w4 = await t.read(s), a.w8 = await t.read(s), a.wr = await t.read(s), a.X_2 = await Ve(t, a.curve, r), a.C0 = await q(t, a.curve, r), await e.endReadSection(t), a;
}
async function Ke(t, n) {
	let { fd: r, sections: i } = await e.readBinFile(t, "zkey", 1), a = await He(r, i, n), o = new l(a.r), s = u.mod(u.shl(1, a.n8r * 8), a.r), c = o.inv(s), d = o.mul(c, c), f = await T(a.q);
	await e.startReadUniqueSection(r, i, 3), a.IC = [];
	for (let e = 0; e <= a.nPublic; e++) {
		let e = await q(r, f, n);
		a.IC.push(e);
	}
	await e.endReadSection(r), await e.startReadUniqueSection(r, i, 4);
	let p = await r.readULE32();
	a.ccoefs = [];
	for (let e = 0; e < p; e++) {
		let e = await r.readULE32(), t = await r.readULE32(), i = await r.readULE32(), o = await m(n);
		a.ccoefs.push({
			matrix: e,
			constraint: t,
			signal: i,
			value: o
		});
	}
	await e.endReadSection(r), await e.startReadUniqueSection(r, i, 5), a.A = [];
	for (let e = 0; e < a.nVars; e++) {
		let t = await q(r, f, n);
		a.A[e] = t;
	}
	await e.endReadSection(r), await e.startReadUniqueSection(r, i, 6), a.B1 = [];
	for (let e = 0; e < a.nVars; e++) {
		let t = await q(r, f, n);
		a.B1[e] = t;
	}
	await e.endReadSection(r), await e.startReadUniqueSection(r, i, 7), a.B2 = [];
	for (let e = 0; e < a.nVars; e++) {
		let t = await Ve(r, f, n);
		a.B2[e] = t;
	}
	await e.endReadSection(r), await e.startReadUniqueSection(r, i, 8), a.C = [];
	for (let e = a.nPublic + 1; e < a.nVars; e++) {
		let t = await q(r, f, n);
		a.C[e] = t;
	}
	await e.endReadSection(r), await e.startReadUniqueSection(r, i, 9), a.hExps = [];
	for (let e = 0; e < a.domainSize; e++) {
		let e = await q(r, f, n);
		a.hExps.push(e);
	}
	return await e.endReadSection(r), await r.close(), a;
	async function m() {
		let t = await e.readBigInt(r, a.n8r);
		return o.mul(t, d);
	}
}
async function qe(e, t, n) {
	let r = { delta: {} };
	r.deltaAfter = await q(e, t, n), r.delta.g1_s = await q(e, t, n), r.delta.g1_sx = await q(e, t, n), r.delta.g2_spx = await Ve(e, t, n), r.transcript = await e.read(64), r.type = await e.readULE32();
	let i = await e.readULE32(), a = e.pos, o = 0;
	for (; e.pos - a < i;) {
		let t = await e.read(1);
		if (t[0] <= o) throw Error("Parameters in the contribution must be sorted");
		if (o = t[0], t[0] == 1) {
			let t = await e.read(1), n = await e.read(t[0]);
			r.name = new TextDecoder().decode(n);
		} else if (t[0] == 2) r.numIterationsExp = (await e.read(1))[0];
		else if (t[0] == 3) {
			let t = await e.read(1);
			r.beaconHash = await e.read(t[0]);
		} else throw Error("Parameter not recognized");
	}
	if (e.pos != a + i) throw Error("Parameters do not match");
	return r;
}
async function Je(t, n, r) {
	await e.startReadUniqueSection(t, r, 10);
	let i = { contributions: [] };
	i.csHash = await t.read(64);
	let a = await t.readULE32();
	for (let e = 0; e < a; e++) {
		let e = await qe(t, n);
		i.contributions.push(e);
	}
	return await e.endReadSection(t), i;
}
async function Ye(e, t, n) {
	await ze(e, t, n.deltaAfter), await ze(e, t, n.delta.g1_s), await ze(e, t, n.delta.g1_sx), await Be(e, t, n.delta.g2_spx), await e.write(n.transcript), await e.writeULE32(n.type || 0);
	let r = [];
	if (n.name) {
		r.push(1);
		let e = new TextEncoder("utf-8").encode(n.name.substring(0, 64));
		r.push(e.byteLength);
		for (let t = 0; t < e.byteLength; t++) r.push(e[t]);
	}
	if (n.type == 1) {
		r.push(2), r.push(n.numIterationsExp), r.push(3), r.push(n.beaconHash.byteLength);
		for (let e = 0; e < n.beaconHash.byteLength; e++) r.push(n.beaconHash[e]);
	}
	if (r.length > 0) {
		let t = new Uint8Array(r);
		await e.writeULE32(t.byteLength), await e.write(t);
	} else await e.writeULE32(0);
}
async function Xe(t, n, r) {
	await e.startWriteSection(t, 10), await t.write(r.csHash), await t.writeULE32(r.contributions.length);
	for (let e = 0; e < r.contributions.length; e++) await Ye(t, n, r.contributions[e]);
	await e.endWriteSection(t);
}
function Ze(e, t, n) {
	let r = new Uint8Array(t.G1.F.n8 * 2);
	t.G1.toRprUncompressed(r, 0, n), e.update(r);
}
function Qe(e, t, n) {
	let r = new Uint8Array(t.G2.F.n8 * 2);
	t.G2.toRprUncompressed(r, 0, n), e.update(r);
}
function $e(e, t, n) {
	Ze(e, t, n.deltaAfter), Ze(e, t, n.delta.g1_s), Ze(e, t, n.delta.g1_sx), Qe(e, t, n.delta.g2_spx), e.update(n.transcript);
}
//#endregion
//#region src/wtns_utils.js
async function et(t, n, r) {
	await e.startWriteSection(t, 1);
	let i = (Math.floor((u.bitLength(r) - 1) / 64) + 1) * 8;
	await t.writeULE32(i), await e.writeBigInt(t, r, i), await t.writeULE32(n.length), await e.endWriteSection(t), await e.startWriteSection(t, 2);
	for (let r = 0; r < n.length; r++) await e.writeBigInt(t, n[r], i);
	await e.endWriteSection(t, 2);
}
async function tt(t, n, r) {
	await e.startWriteSection(t, 1);
	let i = (Math.floor((u.bitLength(r) - 1) / 64) + 1) * 8;
	if (await t.writeULE32(i), await e.writeBigInt(t, r, i), n.byteLength % i != 0) throw Error("Invalid witness length");
	await t.writeULE32(n.byteLength / i), await e.endWriteSection(t), await e.startWriteSection(t, 2), await t.write(n), await e.endWriteSection(t);
}
async function nt(t, n) {
	await e.startReadUniqueSection(t, n, 1);
	let r = await t.readULE32(), i = await e.readBigInt(t, r), a = await t.readULE32();
	return await e.endReadSection(t), {
		n8: r,
		q: i,
		nWitness: a
	};
}
async function rt(t) {
	let { fd: n, sections: r } = await e.readBinFile(t, "wtns", 2), { n8: i, nWitness: a } = await nt(n, r);
	await e.startReadUniqueSection(n, r, 2);
	let o = [];
	for (let t = 0; t < a; t++) {
		let t = await e.readBigInt(n, i);
		o.push(t);
	}
	return await e.endReadSection(n), await n.close(), o;
}
//#endregion
//#region src/groth16_prove.js
var { stringifyBigInts: it } = p;
async function at(e, t, n, r) {
	let i = null;
	n && r && r.memoryLogging && typeof process < "u" && typeof process.memoryUsage == "function" && (i = ft(n, Number(r.memoryLogging) > 1 ? Number(r.memoryLogging) : 1e3));
	try {
		return await ot(e, t, n, r);
	} finally {
		i && (clearInterval(i), dt(n));
	}
}
async function ot(t, n, r, i) {
	let { fd: a, sections: o } = await e.readBinFile(n, "wtns", 2, 1 << 25, 1 << 23), s = await nt(a, o), { fd: c, sections: l } = await e.readBinFile(t, "zkey", 2, 1 << 25, 1 << 23), d = await He(c, l, void 0, i);
	if (d.protocol != "groth16") throw Error("zkey file is not groth16");
	if (!u.eq(d.r, s.q)) throw Error("Curve of the witness does not match the curve of the proving key");
	if (s.nWitness != d.nVars) throw Error(`Invalid witness length. Circuit: ${d.nVars}, witness: ${s.nWitness}`);
	let f = d.curve, p = f.Fr, m = f.G1, h = f.G2;
	i ||= {};
	let g = i.msmBatching || "auto";
	if (g !== "auto" && g !== "enabled" && g !== "disabled") throw Error(`groth16Prove: invalid msmBatching "${g}" (expected "auto", "enabled" or "disabled")`);
	let _ = i.msmGlv || "auto", v = i.msmGls || "auto";
	for (let [e, t] of [["msmGlv", _], ["msmGls", v]]) if (t !== "auto" && t !== "disabled") throw Error(`groth16Prove: invalid ${e} "${t}" (expected "auto" or "disabled")`);
	let y = {
		batch: g,
		glv: _,
		gls: v
	}, b = Ce(d.domainSize);
	r && r.debug("Reading Wtns");
	let x = await e.readSection(a, o, 2), S = (e) => {
		let t = l[e][0].p, n = l[e][0].size;
		return async (r, i) => {
			if (r + i > n) throw Error(`groth16Prove: read out of range of section ${e}`);
			let a = new Uint8Array(i);
			return await c.readToBuffer(a, 0, i, t + r), a;
		};
	}, C, w, T, E = (async function() {
		let t, n, a;
		await (async function() {
			r && r.debug("Reading Coeffs");
			let o = await e.readSection(c, l, 4);
			if (r && r.debug("Building ABC"), i.buildABC === "js") [t, n, a] = await st(f, d, x, o, r);
			else if (i.buildABC === "stream") {
				let e = ct(f, d, o, i);
				[t, n, a] = await lt(f, d, x, o, r, e.nChunks, e.maxInFlight);
			} else {
				let e = ct(f, d, o, i);
				r && r.debug(`buildABC: stream nChunks=${e.nChunks} maxInFlight=${e.maxInFlight}`), [t, n, a] = await lt(f, d, x, o, r, e.nChunks, e.maxInFlight);
			}
		})();
		let o = b === p.s ? f.Fr.shift : f.Fr.w[b + 1], s, u, m;
		await Promise.all([
			(async function() {
				let e = await p.ifft(t, "", "", r, "IFFT_A", !0);
				t = null;
				let n = await p.batchApplyKey(e, p.e(1), o);
				s = await p.fft(n, "", "", r, "FFT_A", !0);
			})(),
			(async function() {
				let e = await p.ifft(n, "", "", r, "IFFT_B", !0);
				n = null;
				let t = await p.batchApplyKey(e, p.e(1), o);
				u = await p.fft(t, "", "", r, "FFT_B", !0);
			})(),
			(async function() {
				let e = await p.ifft(a, "", "", r, "IFFT_C", !0);
				a = null;
				let t = await p.batchApplyKey(e, p.e(1), o);
				m = await p.fft(t, "", "", r, "FFT_C", !0);
			})()
		]), r && r.debug("Join ABC"), T = await ut(f, d, s, u, m, r), r && r.debug("Join ABC finished"), s = null, u = null, m = null, globalThis.gc && globalThis.gc();
	})(), D = {};
	async function O() {
		r && r.debug("Reading A Points"), D.pi_a = await f.G1.multiExpAffineChunked(S(5), l[5][0].size, x, r, "multiexp A", y);
	}
	let k = O(), A;
	async function j() {
		r && r.debug("Reading B1 Points"), A = await f.G1.multiExpAffineChunked(S(6), l[6][0].size, x, r, "multiexp B1", y);
	}
	let M = j();
	async function N() {
		r && r.debug("Reading B2 Points"), D.pi_b = await f.G2.multiExpAffineChunked(S(7), l[7][0].size, x, r, "multiexp B2", y);
	}
	let P = N(), F = (async function() {
		r && r.debug("Reading C Points"), D.pi_c = await f.G1.multiExpAffineChunked(S(8), l[8][0].size, x.slice((d.nPublic + 1) * f.Fr.n8), r, "multiexp C", y);
	})();
	w = (async function() {
		r && r.debug("Reading H Points"), await E, C = await f.G1.multiExpAffineChunked(S(9), l[9][0].size, T, r, "multiexp H", y);
	})();
	let I = f.Fr.random(), ee = f.Fr.random();
	await k, D.pi_a = m.add(D.pi_a, d.vk_alpha_1), D.pi_a = m.add(D.pi_a, m.timesFr(d.vk_delta_1, I)), await P, D.pi_b = h.add(D.pi_b, d.vk_beta_2), D.pi_b = h.add(D.pi_b, h.timesFr(d.vk_delta_2, ee)), await M, A = m.add(A, d.vk_beta_1), A = m.add(A, m.timesFr(d.vk_delta_1, ee)), await Promise.all([F, w]), D.pi_c = m.add(D.pi_c, C), D.pi_c = m.add(D.pi_c, m.timesFr(D.pi_a, ee)), D.pi_c = m.add(D.pi_c, m.timesFr(A, I)), D.pi_c = m.add(D.pi_c, m.timesFr(d.vk_delta_1, p.neg(p.mul(I, ee))));
	let L = [];
	for (let e = 1; e <= d.nPublic; e++) {
		let t = x.slice(e * p.n8, e * p.n8 + p.n8);
		L.push(u.fromRprLE(t));
	}
	return D.pi_a = m.toObject(m.toAffine(D.pi_a)), D.pi_b = h.toObject(h.toAffine(D.pi_b)), D.pi_c = m.toObject(m.toAffine(D.pi_c)), D.protocol = "groth16", D.curve = f.name, await c.close(), await a.close(), D = it(D), L = it(L), {
		proof: D,
		publicSignals: L
	};
}
async function st(e, t, n, r, i) {
	let a = e.Fr.n8, o = 12 + t.n8r, c = (r.byteLength - 4) / o, l = new s(t.domainSize * a), u = new s(t.domainSize * a), d = new s(t.domainSize * a), f = [l, u];
	for (let t = 0; t < c; t++) {
		i && t % 1e6 == 0 && i.debug(`QAP AB: ${t}/${c}`);
		let s, l;
		if (r.buffer) {
			let e = 4 + t * o;
			s = new DataView(r.buffer, r.byteOffset + e, o), l = new Uint8Array(r.buffer, r.byteOffset + e + 12, a);
		} else {
			let e = r.slice(4 + t * o, 4 + t * o + o);
			s = new DataView(e.buffer), l = e.slice(12, 12 + a);
		}
		let u = s.getUint32(0, !0), d = s.getUint32(4, !0), p = s.getUint32(8, !0);
		f[u].set(e.Fr.add(f[u].slice(d * a, d * a + a), e.Fr.mul(l, n.slice(p * a, p * a + a))), d * a), t % 1e6 == 0 && i && dt(i);
	}
	for (let n = 0; n < t.domainSize; n++) i && n % 1e6 == 0 && i.debug(`QAP C: ${n}/${t.domainSize}`), d.set(e.Fr.mul(l.slice(n * a, n * a + a), u.slice(n * a, n * a + a)), n * a);
	return [
		l,
		u,
		d
	];
}
function ct(e, t, n, r) {
	r ||= {};
	let i = e.Fr.n8, a = e.tm.concurrency || 1, o = (n.byteLength - 4) / (12 + i), s = n.byteLength + o * i + 3 * t.domainSize * i, c = r.buildABCFloorBudget || 256 * 1024 * 1024, l = Math.max(1, Math.ceil(s / (32 * 1024 * 1024))), u = Math.ceil(s / l), d = Math.max(1, Math.min(a, Math.floor(c / u)));
	return l = Math.min(256, Math.max(l, d * 3)), d = Math.min(d, l), r.buildABCnChunks && (l = r.buildABCnChunks), r.buildABCmaxInFlight && (d = r.buildABCmaxInFlight), {
		nChunks: l,
		maxInFlight: d
	};
}
async function lt(e, t, n, r, i, a, o) {
	let c = e.Fr.n8, l = 12 + t.n8r, u = t.domainSize, d;
	if (r instanceof s) {
		let e = [], t = r.buffers[0].length;
		for (let t = 0; t < r.buffers.length; t++) e.push(new DataView(r.buffers[t].buffer));
		d = (n) => e[Math.floor(n / t)].getUint32(n % t, !0);
	} else {
		let e = new DataView(r.buffer, r.byteOffset, r.byteLength);
		d = (t) => e.getUint32(t, !0);
	}
	function f(e) {
		let t = 0, n = d(0);
		for (; t < n;) {
			let r = Math.floor((n + t) / 2), i = d(4 + r * l + 4);
			i > e ? n = r - 1 : i < e ? t = r + 1 : n = r;
		}
		return 4 + t * l;
	}
	let p = Math.floor((u - 1) / a) + 1, m = [];
	for (let e = 0; e < a; e++) m.push(f(e * p));
	m.push(r.byteLength);
	let h = u * c, g = () => h < 1 << 30 ? new Uint8Array(h) : new s(h), _ = g(), v = g(), y = g(), b = /* @__PURE__ */ new Set(), x = [];
	for (let t = 0; t < a; t++) {
		let s = t * p, d = Math.min(p, u - s);
		if (d <= 0) break;
		let f = m[t], h = m[t + 1];
		for (; b.size >= o;) await Promise.race(b);
		i && i.debug(`buildABCStream: ${t}/${a}`);
		let g = (async () => {
			let t = r.slice(f, h), i = (h - f) / l, a = new Uint8Array(i * c), o = new Uint32Array(t.buffer, t.byteOffset, t.byteLength >> 2), u = l >> 2;
			if (n.buffer && !(n.byteOffset & 3) && c === 32) {
				let e = new Uint32Array(n.buffer, n.byteOffset, n.byteLength >> 2), t = new Uint32Array(a.buffer);
				for (let n = 0; n < i; n++) {
					let r = o[n * u + 2] << 3, i = n << 3;
					t[i] = e[r], t[i + 1] = e[r + 1], t[i + 2] = e[r + 2], t[i + 3] = e[r + 3], t[i + 4] = e[r + 4], t[i + 5] = e[r + 5], t[i + 6] = e[r + 6], t[i + 7] = e[r + 7], o[n * u + 2] = n;
				}
			} else {
				let e = !!n.buffer;
				for (let t = 0; t < i; t++) {
					let r = o[t * u + 2];
					e ? a.set(n.subarray(r * c, (r + 1) * c), t * c) : a.set(n.slice(r * c, (r + 1) * c), t * c), o[t * u + 2] = t;
				}
			}
			let p = [
				{
					cmd: "ALLOCSET",
					var: 0,
					buff: t
				},
				{
					cmd: "ALLOCSET",
					var: 1,
					buff: a
				},
				{
					cmd: "ALLOC",
					var: 2,
					len: d * c
				},
				{
					cmd: "ALLOC",
					var: 3,
					len: d * c
				},
				{
					cmd: "ALLOC",
					var: 4,
					len: d * c
				},
				{
					cmd: "CALL",
					fnName: "qap_buildABC",
					params: [
						{ var: 0 },
						{ val: i },
						{ var: 1 },
						{ var: 2 },
						{ var: 3 },
						{ var: 4 },
						{ val: s },
						{ val: d },
						{ val: 0 },
						{ val: i }
					]
				},
				{
					cmd: "GET",
					out: 0,
					var: 2,
					len: d * c
				},
				{
					cmd: "GET",
					out: 1,
					var: 3,
					len: d * c
				},
				{
					cmd: "GET",
					out: 2,
					var: 4,
					len: d * c
				}
			], m = await e.tm.queueAction(p, [t.buffer, a.buffer]);
			_.set(m[0], s * c), v.set(m[1], s * c), y.set(m[2], s * c);
		})().finally(() => b.delete(g));
		b.add(g), x.push(g);
	}
	return await Promise.all(x), [
		_,
		v,
		y
	];
}
async function ut(e, t, n, r, i, a) {
	let o = 65536, c = e.Fr.n8, l = Math.floor(n.byteLength / e.Fr.n8), u = [];
	for (let t = 0; t < l; t += o) {
		a && a.debug(`JoinABC: ${t}/${l}`);
		let s = Math.min(l - t, o), d = [], f = n.slice(t * c, (t + s) * c), p = r.slice(t * c, (t + s) * c), m = i.slice(t * c, (t + s) * c);
		d.push({
			cmd: "ALLOCSET",
			var: 0,
			buff: f
		}), d.push({
			cmd: "ALLOCSET",
			var: 1,
			buff: p
		}), d.push({
			cmd: "ALLOCSET",
			var: 2,
			buff: m
		}), d.push({
			cmd: "ALLOC",
			var: 3,
			len: s * c
		}), d.push({
			cmd: "CALL",
			fnName: "qap_joinABC",
			params: [
				{ var: 0 },
				{ var: 1 },
				{ var: 2 },
				{ val: s },
				{ var: 3 }
			]
		}), d.push({
			cmd: "CALL",
			fnName: "frm_batchFromMontgomery",
			params: [
				{ var: 3 },
				{ val: s },
				{ var: 3 }
			]
		}), d.push({
			cmd: "GET",
			out: 0,
			var: 3,
			len: s * c
		}), u.push(e.tm.queueAction(d, [
			f.buffer,
			p.buffer,
			m.buffer
		]));
	}
	let d = await Promise.all(u), f;
	f = n instanceof s ? new s(n.byteLength) : new Uint8Array(n.byteLength);
	let p = 0;
	for (let e = 0; e < d.length; e++) f.set(d[e][0], p), p += d[e][0].byteLength;
	return f;
}
function dt(e) {
	if (!e) return;
	let t = process.memoryUsage();
	e.info("         ", "\x1B[0m Heap:\x1B[32m", `${Math.round(t.heapUsed / 1024 / 1024 * 100) / 100} MB`.padEnd(12), "\x1B[0m / \x1B[32m", `${Math.round(t.heapTotal / 1024 / 1024 * 100) / 100} MB`.padEnd(12), "\x1B[0m RSS:\x1B[32m", `${Math.round(t.rss / 1024 / 1024 * 100) / 100} MB`.padEnd(12), "\x1B[0m External:\x1B[32m", `${Math.round(t.external / 1024 / 1024 * 100) / 100} MB`.padEnd(12), "\x1B[0m ArrBuffers:\x1B[32m", `${Math.round(t.arrayBuffers / 1024 / 1024 * 100) / 100} MB`.padEnd(12), "\x1B[0m");
}
function ft(e, t = 5e3) {
	return setInterval(() => {
		dt(e);
	}, t);
}
//#endregion
//#region ../fastfile/build/browser/browser.esm.js
function pt(e) {
	let t = e.initialSize || 1 << 20, n = new yt();
	return n.o = e, n.o.data = new Uint8Array(t), n.allocSize = t, n.totalSize = 0, n.readOnly = !1, n.pos = 0, n;
}
function mt(e) {
	let t = new yt();
	return t.o = e, t.allocSize = e.data.byteLength, t.totalSize = e.data.byteLength, t.readOnly = !0, t.pos = 0, t;
}
var ht = /* @__PURE__ */ new Uint8Array(4), gt = new DataView(ht.buffer), _t = /* @__PURE__ */ new Uint8Array(8), vt = new DataView(_t.buffer), yt = class {
	constructor() {
		this.pageSize = 16384;
	}
	_resizeIfNeeded(e) {
		if (e > this.allocSize) {
			let t = Math.max(this.allocSize + (1 << 20), Math.floor(this.allocSize * 1.1), e), n = new Uint8Array(t);
			n.set(this.o.data), this.o.data = n, this.allocSize = t;
		}
	}
	async write(e, t) {
		let n = this;
		if (t === void 0 && (t = n.pos), this.readOnly) throw Error("Writing a read only file");
		this._resizeIfNeeded(t + e.byteLength), this.o.data.set(e.slice(), t), t + e.byteLength > this.totalSize && (this.totalSize = t + e.byteLength), this.pos = t + e.byteLength;
	}
	async readToBuffer(e, t, n, r) {
		let i = this;
		if (r === void 0 && (r = i.pos), this.readOnly && r + n > this.totalSize) throw Error("Reading out of bounds");
		this._resizeIfNeeded(r + n);
		let a = new Uint8Array(this.o.data.buffer, this.o.data.byteOffset + r, n);
		e.set(a, t), this.pos = r + n;
	}
	async read(e, t) {
		let n = this, r = new Uint8Array(e);
		return await n.readToBuffer(r, 0, e, t), r;
	}
	close() {
		this.o.data.byteLength != this.totalSize && (this.o.data = this.o.data.slice(0, this.totalSize));
	}
	async discard() {}
	async writeULE32(e, t) {
		let n = this;
		gt.setUint32(0, e, !0), await n.write(ht, t);
	}
	async writeUBE32(e, t) {
		let n = this;
		gt.setUint32(0, e, !1), await n.write(ht, t);
	}
	async writeULE64(e, t) {
		let n = this;
		vt.setUint32(0, e & 4294967295, !0), vt.setUint32(4, Math.floor(e / 4294967296), !0), await n.write(_t, t);
	}
	async readULE32(e) {
		let t = await this.read(4, e);
		return new Uint32Array(t.buffer)[0];
	}
	async readUBE32(e) {
		let t = await this.read(4, e);
		return new DataView(t.buffer).getUint32(0, !1);
	}
	async readULE64(e) {
		let t = await this.read(8, e), n = new Uint32Array(t.buffer);
		return n[1] * 4294967296 + n[0];
	}
	async readString(e) {
		let t = this, n = e === void 0 ? t.pos : e;
		if (n > this.totalSize) {
			if (this.readOnly) throw Error("Reading out of bounds");
			this._resizeIfNeeded(e);
		}
		let r = new Uint8Array(t.o.data.buffer, n, this.totalSize - n), i = r.findIndex((e) => e === 0), a = i !== -1, o = "";
		return a ? (o = new TextDecoder().decode(r.slice(0, i)), t.pos = n + i + 1) : t.pos = n, o;
	}
}, J = 1 << 22;
function bt(e) {
	let t = e.initialSize || 0, n = new Et();
	n.o = e;
	let r = t ? Math.floor((t - 1) / J) + 1 : 0;
	n.o.data = [];
	for (let e = 0; e < r - 1; e++) n.o.data.push(new Uint8Array(J));
	return r && n.o.data.push(new Uint8Array(t - J * (r - 1))), n.totalSize = 0, n.readOnly = !1, n.pos = 0, n;
}
function xt(e) {
	let t = new Et();
	return t.o = e, t.totalSize = (e.data.length - 1) * J + e.data[e.data.length - 1].byteLength, t.readOnly = !0, t.pos = 0, t;
}
var St = /* @__PURE__ */ new Uint8Array(4), Ct = new DataView(St.buffer), wt = /* @__PURE__ */ new Uint8Array(8), Tt = new DataView(wt.buffer), Et = class {
	constructor() {
		this.pageSize = 16384;
	}
	_resizeIfNeeded(e) {
		if (e <= this.totalSize) return;
		if (this.readOnly) throw Error("Reading out of file bounds");
		let t = Math.floor((e - 1) / J) + 1;
		for (let n = Math.max(this.o.data.length - 1, 0); n < t; n++) {
			let r = n < t - 1 ? J : e - (t - 1) * J, i = new Uint8Array(r);
			n == this.o.data.length - 1 && i.set(this.o.data[n]), this.o.data[n] = i;
		}
		this.totalSize = e;
	}
	async write(e, t) {
		let n = this;
		if (t === void 0 && (t = n.pos), this.readOnly) throw Error("Writing a read only file");
		this._resizeIfNeeded(t + e.byteLength);
		let r = Math.floor(t / J), i = t % J, a = e.byteLength;
		for (; a > 0;) {
			let t = i + a > J ? J - i : a, o = e.slice(e.byteLength - a, e.byteLength - a + t);
			new Uint8Array(n.o.data[r].buffer, i, t).set(o), a -= t, r++, i = 0;
		}
		this.pos = t + e.byteLength;
	}
	async readToBuffer(e, t, n, r) {
		let i = this;
		if (r === void 0 && (r = i.pos), this.readOnly && r + n > this.totalSize) throw Error("Reading out of bounds");
		this._resizeIfNeeded(r + n);
		let a = Math.floor(r / J), o = r % J, s = n;
		for (; s > 0;) {
			let r = o + s > J ? J - o : s, c = new Uint8Array(i.o.data[a].buffer, o, r);
			e.set(c, t + n - s), s -= r, a++, o = 0;
		}
		this.pos = r + n;
	}
	async read(e, t) {
		let n = this, r = new Uint8Array(e);
		return await n.readToBuffer(r, 0, e, t), r;
	}
	close() {}
	async discard() {}
	async writeULE32(e, t) {
		let n = this;
		Ct.setUint32(0, e, !0), await n.write(St, t);
	}
	async writeUBE32(e, t) {
		let n = this;
		Ct.setUint32(0, e, !1), await n.write(St, t);
	}
	async writeULE64(e, t) {
		let n = this;
		Tt.setUint32(0, e & 4294967295, !0), Tt.setUint32(4, Math.floor(e / 4294967296), !0), await n.write(wt, t);
	}
	async readULE32(e) {
		let t = await this.read(4, e);
		return new Uint32Array(t.buffer)[0];
	}
	async readUBE32(e) {
		let t = await this.read(4, e);
		return new DataView(t.buffer).getUint32(0, !1);
	}
	async readULE64(e) {
		let t = await this.read(8, e), n = new Uint32Array(t.buffer);
		return n[1] * 4294967296 + n[0];
	}
	async readString(e) {
		let t = this, n = e === void 0 ? t.pos : e;
		if (n > this.totalSize) {
			if (this.readOnly) throw Error("Reading out of bounds");
			this._resizeIfNeeded(e);
		}
		let r = !1, i = "";
		for (; !r;) {
			let e = Math.floor(n / J), a = n % J;
			if (t.o.data[e] === void 0) throw Error("ERROR");
			let o = Math.min(2048, t.o.data[e].length - a), s = new Uint8Array(t.o.data[e].buffer, a, o), c = s.findIndex((e) => e === 0);
			r = c !== -1, r ? (i += new TextDecoder().decode(s.slice(0, c)), t.pos = e * J + a + c + 1) : (i += new TextDecoder().decode(s), t.pos = e * J + a + s.length), n = t.pos;
		}
		return i;
	}
};
function Dt() {
	throw Error("File I/O is not supported in the browser");
}
function Ot(e) {
	return e instanceof Uint8Array ? {
		type: "mem",
		data: e
	} : (typeof e == "string" && Dt(), e);
}
async function kt(e) {
	let t = await fetch(e).then((e) => e.arrayBuffer());
	return {
		type: "mem",
		data: new Uint8Array(t)
	};
}
function At(e, t, n) {
	if (e.type === "file" && Dt(), e.type === "mem") return t(e);
	if (e.type === "bigMem") return n(e);
	throw Error("Invalid FastFile type: " + e.type);
}
function jt(e) {
	return At(Ot(e), pt, bt);
}
async function Mt(e) {
	return e = typeof e == "string" ? await kt(e) : Ot(e), At(e, mt, xt);
}
//#endregion
//#region node_modules/circom_runtime/js/utils.js
function Nt(e) {
	let t = [];
	return n(t, e), t;
	function n(e, t) {
		if (Array.isArray(t)) for (let r = 0; r < t.length; r++) n(e, t[r]);
		else e.push(t);
	}
}
function Pt(e, t) {
	let n = BigInt(e) % t;
	return n < 0 && (n += t), n;
}
function Ft(e) {
	let t = BigInt(2) ** BigInt(64), n = BigInt("0xCBF29CE484222325");
	for (let r = 0; r < e.length; r++) n ^= BigInt(e[r].charCodeAt(0)), n *= BigInt(1099511628211), n %= t;
	let r = n.toString(16), i = 16 - r.length;
	return r = "0".repeat(i).concat(r), r;
}
function It(e, t) {
	let n = [], r = BigInt(e), i = BigInt(4294967296);
	for (; r;) n.unshift(Number(r % i)), r /= i;
	if (t) {
		let e = t - n.length;
		for (; e > 0;) n.unshift(0), e--;
	}
	return n;
}
//#endregion
//#region node_modules/circom_runtime/js/witness_calculator.js
async function Lt(e, t) {
	let n, r, i;
	t ||= {};
	let a = 1, o = 0, s = 0, c = !1;
	if (e instanceof WebAssembly.Instance) n = e, c = !0;
	else {
		let c = 32767;
		if (t.memorySize && (c = parseInt(t.memorySize), c < 0)) throw Error("Invalid memory size");
		let l = !1;
		for (; !l;) try {
			i = new WebAssembly.Memory({ initial: c }), l = !0;
		} catch (e) {
			if (c <= 1) throw e;
			console.warn("Could not allocate " + c * 1024 * 64 + " bytes. This may cause severe instability. Trying with " + c * 1024 * 64 / 2 + " bytes"), c = Math.floor(c / 2);
		}
		let p = await WebAssembly.compile(e), m = "", h = "";
		n = await WebAssembly.instantiate(p, {
			env: { memory: i },
			runtime: {
				printDebug: function(e) {
					console.log("printDebug:", e);
				},
				exceptionHandler: function(e) {
					let t;
					throw t = e === 1 ? "Signal not found. " : e === 2 ? "Too many signals set. " : e === 3 ? "Signal already set. " : e === 4 ? "Assert Failed. " : e === 5 ? "Not enough memory. " : e === 6 ? "Input signal array access exceeds the size. " : "Unknown error. ", console.error("ERROR: ", e, m), Error(t + m);
				},
				printErrorMessage: function() {
					m += d() + "\n";
				},
				writeBufferMessage: function() {
					let e = d();
					e === "\n" ? (console.log(h), h = "") : (h !== "" && (h += " "), h += e);
				},
				showSharedRWMemory: function() {
					let e = n.exports.getFieldNumLen32(), t = new Uint32Array(e);
					for (let r = 0; r < e; r++) t[e - 1 - r] = n.exports.readSharedRWMemory(r);
					if (a >= 2 && (o >= 1 || s >= 7)) {
						h !== "" && (h += " ");
						let e = u.fromArray(t, 4294967296).toString();
						h += e;
					} else console.log(u.fromArray(t, 4294967296));
				},
				error: function(e, n, i, a, o, s) {
					let c;
					throw c = e === 7 ? f(n) + " " + r.getFr(a).toString() + " != " + r.getFr(o).toString() + " " + f(s) : e === 9 ? f(n) + " " + r.getFr(a).toString() + " " + f(o) : e === 5 && t.sym ? f(n) + " " + t.sym.labelIdx2Name[o] : f(n) + " " + i + " " + a + " " + o + " " + s, console.log("ERROR: ", e, c), Error(c);
				},
				log: function(e) {
					console.log(r.getFr(e).toString());
				},
				logGetSignal: function(e, n) {
					t.logGetSignal && t.logGetSignal(e, r.getFr(n));
				},
				logSetSignal: function(e, n) {
					t.logSetSignal && t.logSetSignal(e, r.getFr(n));
				},
				logStartComponent: function(e) {
					t.logStartComponent && t.logStartComponent(e);
				},
				logFinishComponent: function(e) {
					t.logFinishComponent && t.logFinishComponent(e);
				}
			}
		});
	}
	typeof n.exports.getVersion == "function" && (a = n.exports.getVersion()), typeof n.exports.getMinorVersion == "function" && (o = n.exports.getMinorVersion()), typeof n.exports.getPatchVersion == "function" && (s = n.exports.getPatchVersion());
	let l = t && (t.sanityCheck || t.logGetSignal || t.logSetSignal || t.logStartComponent || t.logFinishComponent);
	if (a === 2) r = new zt(n, l);
	else if (a === 1) {
		if (c) throw Error("Loading code from WebAssembly instance is not supported for circom version 1");
		r = new Rt(i, n, l);
	} else throw Error(`Unsupported circom version: ${a}`);
	return r;
	function d() {
		let e = "", t = n.exports.getMessageChar();
		for (; t !== 0;) e += String.fromCharCode(t), t = n.exports.getMessageChar();
		return e;
	}
	function f(e) {
		let t = new Uint8Array(i.buffer), n = [];
		for (let r = 0; t[e + r] > 0; r++) n.push(t[e + r]);
		return String.fromCharCode.apply(null, n);
	}
}
var Rt = class {
	constructor(e, t, n) {
		this.memory = e, this.i32 = new Uint32Array(e.buffer), this.instance = t, this.n32 = (this.instance.exports.getFrLen() >> 2) - 2;
		let r = this.instance.exports.getPRawPrime(), i = Array(this.n32);
		for (let e = 0; e < this.n32; e++) i[this.n32 - 1 - e] = this.i32[(r >> 2) + e];
		this.prime = u.fromArray(i, 4294967296), this.Fr = new l(this.prime), this.mask32 = u.fromString("FFFFFFFF", 16), this.NVars = this.instance.exports.getNVars(), this.n64 = Math.floor((this.Fr.bitLength - 1) / 64) + 1, this.R = this.Fr.e(u.shiftLeft(1, this.n64 * 64)), this.RInv = this.Fr.inv(this.R), this.sanityCheck = n;
	}
	circom_version() {
		return 1;
	}
	async _doCalculateWitness(e, t) {
		this.instance.exports.init(this.sanityCheck || t ? 1 : 0);
		let n = this.allocInt(), r = this.allocFr();
		Object.keys(e).forEach((t) => {
			let i = Ft(t), a = parseInt(i.slice(0, 8), 16), o = parseInt(i.slice(8, 16), 16);
			try {
				this.instance.exports.getSignalOffset32(n, 0, a, o);
			} catch {
				throw Error(`Signal ${t} is not an input of the circuit.`);
			}
			let s = this.getInt(n), c = Nt(e[t]);
			for (let e = 0; e < c.length; e++) this.setFr(r, c[e]), this.instance.exports.setSignal(0, 0, s + e, r);
		});
	}
	async calculateWitness(e, t) {
		let n = this, r = n.i32[0], i = [];
		await n._doCalculateWitness(e, t);
		for (let e = 0; e < n.NVars; e++) {
			let t = n.instance.exports.getPWitness(e);
			i.push(n.getFr(t));
		}
		return n.i32[0] = r, i;
	}
	async calculateBinWitness(e, t) {
		let n = this, r = n.i32[0];
		await n._doCalculateWitness(e, t);
		let i = n.instance.exports.getWitnessBuffer();
		n.i32[0] = r;
		let a = n.memory.buffer.slice(i, i + n.NVars * n.n64 * 8);
		return new Uint8Array(a);
	}
	allocInt() {
		let e = this.i32[0];
		return this.i32[0] = e + 8, e;
	}
	allocFr() {
		let e = this.i32[0];
		return this.i32[0] = e + this.n32 * 4 + 8, e;
	}
	getInt(e) {
		return this.i32[e >> 2];
	}
	setInt(e, t) {
		this.i32[e >> 2] = t;
	}
	getFr(e) {
		let t = this, n = e >> 2;
		if (t.i32[n + 1] & 2147483648) {
			let e = Array(t.n32);
			for (let r = 0; r < t.n32; r++) e[t.n32 - 1 - r] = t.i32[n + 2 + r];
			let i = t.Fr.e(u.fromArray(e, 4294967296));
			return t.i32[n + 1] & 1073741824 ? r(i) : i;
		} else if (t.i32[n] & 2147483648) return t.Fr.e(t.i32[n] - 4294967296);
		else return t.Fr.e(t.i32[n]);
		function r(e) {
			return t.Fr.mul(t.RInv, e);
		}
	}
	setFr(e, t) {
		let n = this;
		t = n.Fr.e(t);
		let r = n.Fr.neg(n.Fr.e("80000000", 16)), i = n.Fr.e("7FFFFFFF", 16);
		if (n.Fr.geq(t, r) && n.Fr.leq(t, i)) {
			let i;
			n.Fr.geq(t, n.Fr.zero) ? i = u.toNumber(t) : (i = u.toNumber(n.Fr.sub(t, r)), i -= 2147483648, i = 4294967296 + i), n.i32[e >> 2] = i, n.i32[(e >> 2) + 1] = 0;
			return;
		}
		n.i32[e >> 2] = 0, n.i32[(e >> 2) + 1] = 2147483648;
		let a = u.toArray(t, 4294967296);
		for (let t = 0; t < n.n32; t++) {
			let r = a.length - 1 - t;
			r >= 0 ? n.i32[(e >> 2) + 2 + t] = a[r] : n.i32[(e >> 2) + 2 + t] = 0;
		}
	}
}, zt = class {
	constructor(e, t) {
		this.instance = e, this.version = this.instance.exports.getVersion(), this.n32 = this.instance.exports.getFieldNumLen32(), this.instance.exports.getRawPrime();
		let n = new Uint32Array(this.n32);
		for (let e = 0; e < this.n32; e++) n[this.n32 - 1 - e] = this.instance.exports.readSharedRWMemory(e);
		this.prime = u.fromArray(n, 4294967296), this.witnessSize = this.instance.exports.getWitnessSize(), this.sanityCheck = t;
	}
	circom_version() {
		return this.instance.exports.getVersion();
	}
	async _doCalculateWitness(e, t) {
		this.instance.exports.init(this.sanityCheck || t ? 1 : 0);
		let n = Object.keys(e), r = 0;
		if (n.forEach((t) => {
			let n = Ft(t), i = parseInt(n.slice(0, 8), 16), a = parseInt(n.slice(8, 16), 16), o = Nt(e[t]);
			if (typeof this.instance.exports.getInputSignalSize == "function") {
				let e = this.instance.exports.getInputSignalSize(i, a);
				if (e < 0) throw Error(`Signal ${t} not found\n`);
				if (o.length < e) throw Error(`Not enough values for input signal ${t}\n`);
				if (o.length > e) throw Error(`Too many values for input signal ${t}\n`);
			}
			for (let e = 0; e < o.length; e++) {
				let t = It(Pt(o[e], this.prime), this.n32);
				for (let e = 0; e < this.n32; e++) this.instance.exports.writeSharedRWMemory(e, t[this.n32 - 1 - e]);
				try {
					this.instance.exports.setInputSignal(i, a, e), r++;
				} catch (e) {
					throw Error(e);
				}
			}
		}), r < this.instance.exports.getInputSize()) throw Error(`Not all inputs have been set. Only ${r} out of ${this.instance.exports.getInputSize()}`);
	}
	async calculateWitness(e, t) {
		let n = [];
		await this._doCalculateWitness(e, t);
		for (let e = 0; e < this.witnessSize; e++) {
			this.instance.exports.getWitness(e);
			let t = new Uint32Array(this.n32);
			for (let e = 0; e < this.n32; e++) t[this.n32 - 1 - e] = this.instance.exports.readSharedRWMemory(e);
			n.push(u.fromArray(t, 4294967296));
		}
		return n;
	}
	async calculateWTNSBin(e, t) {
		let n = new Uint32Array(this.witnessSize * this.n32 + this.n32 + 11), r = new Uint8Array(n.buffer);
		await this._doCalculateWitness(e, t), r[0] = 119, r[1] = 116, r[2] = 110, r[3] = 115, n[1] = 2, n[2] = 2, n[3] = 1;
		let i = this.n32 * 4, a = (8 + i).toString(16);
		n[4] = parseInt(a.slice(0, 8), 16), n[5] = parseInt(a.slice(8, 16), 16), n[6] = i, this.instance.exports.getRawPrime();
		let o = 7;
		for (let e = 0; e < this.n32; e++) n[o + e] = this.instance.exports.readSharedRWMemory(e);
		o += this.n32, n[o] = this.witnessSize, o++, n[o] = 2, o++;
		let s = (i * this.witnessSize).toString(16);
		n[o] = parseInt(s.slice(0, 8), 16), n[o + 1] = parseInt(s.slice(8, 16), 16), o += 2;
		for (let e = 0; e < this.witnessSize; e++) {
			this.instance.exports.getWitness(e);
			for (let e = 0; e < this.n32; e++) n[o + e] = this.instance.exports.readSharedRWMemory(e);
			o += this.n32;
		}
		return r;
	}
}, { unstringifyBigInts: Bt } = p;
async function Vt(t, n, r, i) {
	let a = Bt(t), o = await Mt(n), s = await o.read(o.totalSize);
	await o.close();
	let c = await Lt(s, i);
	if (c.circom_version() === 1) {
		let t = await c.calculateBinWitness(a), n = await e.createBinFile(r, "wtns", 2, 2);
		await tt(n, t, c.prime), await n.close();
	} else {
		let e = await jt(r), t = await c.calculateWTNSBin(a);
		await e.write(t), await e.close();
	}
}
//#endregion
//#region src/groth16_fullprove.js
var { unstringifyBigInts: Ht } = p;
async function Ut(e, t, n, r, i, a) {
	let o = Ht(e), s = { type: "mem" };
	return await Vt(o, t, s, i), await at(n, s, r, a);
}
//#endregion
//#region src/groth16_verify.js
var { unstringifyBigInts: Wt } = p;
async function Gt(e, t, n, r) {
	let i = Wt(e), a = Wt(n), o = Wt(t), s = await E(i.curve), c = s.G1.fromObject(i.IC[0]), l = new Uint8Array(s.G1.F.n8 * 2 * o.length), d = new Uint8Array(s.Fr.n8 * o.length);
	if (!Jt(s, o)) return r && r.error("Public inputs are not valid."), !1;
	for (let e = 0; e < o.length; e++) {
		let t = s.G1.fromObject(i.IC[e + 1]);
		l.set(t, e * s.G1.F.n8 * 2), u.toRprLE(d, s.Fr.n8 * e, o[e], s.Fr.n8);
	}
	let f = await s.G1.multiExpAffine(l, d);
	f = s.G1.add(f, c);
	let p = s.G1.fromObject(a.pi_a), m = s.G2.fromObject(a.pi_b), h = s.G1.fromObject(a.pi_c);
	if (!Kt(s, {
		pi_a: p,
		pi_b: m,
		pi_c: h
	})) return r && r.error("Proof commitments are not valid."), !1;
	let g = s.G2.fromObject(i.vk_gamma_2), _ = s.G2.fromObject(i.vk_delta_2), v = s.G1.fromObject(i.vk_alpha_1), y = s.G2.fromObject(i.vk_beta_2);
	return await s.pairingEq(s.G1.neg(p), m, f, g, h, _, v, y) ? (r && r.info("OK!"), !0) : (r && r.error("Invalid proof"), !1);
}
function Kt(e, t) {
	let n = e.G1, r = e.G2;
	return n.isValid(t.pi_a) && r.isValid(t.pi_b) && n.isValid(t.pi_c);
}
function qt(e, t) {
	return u.geq(t, 0) && u.lt(t, e.r);
}
function Jt(e, t) {
	for (let n = 0; n < t.length; n++) if (!qt(e, t[n])) return !1;
	return !0;
}
//#endregion
//#region src/groth16_exportsoliditycalldata.js
var { unstringifyBigInts: Yt } = p;
function Xt(e) {
	let t = e.toString(16);
	for (; t.length < 64;) t = "0" + t;
	return t = `"0x${t}"`, t;
}
async function Zt(e, t) {
	let n = Yt(e), r = Yt(t), i = "";
	for (let e = 0; e < r.length; e++) i != "" && (i += ","), i += Xt(r[e]);
	let a;
	return a = `[${Xt(n.pi_a[0])}, ${Xt(n.pi_a[1])}],[[${Xt(n.pi_b[0][1])}, ${Xt(n.pi_b[0][0])}],[${Xt(n.pi_b[1][1])}, ${Xt(n.pi_b[1][0])}]],[${Xt(n.pi_c[0])}, ${Xt(n.pi_c[1])}],[${i}]`, a;
}
//#endregion
//#region src/groth16.js
var Qt = /* @__PURE__ */ v({
	exportSolidityCallData: () => Zt,
	fullProve: () => Ut,
	prove: () => at,
	verify: () => Gt
});
//#endregion
//#region src/keypair.js
function $t(e, t) {
	let n = new DataView(t.buffer, t.byteOffset, t.byteLength), r = [];
	for (let e = 0; e < 8; e++) r[e] = n.getUint32(e * 4);
	let i = new c(r);
	return e.G2.fromRng(i);
}
function en(e, t, n, r, i) {
	let a = G.create({ dkLen: 64 }), o = new Uint8Array([t]);
	a.update(o), a.update(n);
	let s = e.G1.toUncompressed(r);
	a.update(s);
	let c = e.G1.toUncompressed(i);
	return a.update(c), $t(e, a.digest());
}
function tn(e, t, n, r, i) {
	return e.g1_s = t.G1.toAffine(t.G1.fromRng(i)), e.g1_sx = t.G1.toAffine(t.G1.timesFr(e.g1_s, e.prvKey)), e.g2_sp = t.G2.toAffine(en(t, n, r, e.g1_s, e.g1_sx)), e.g2_spx = t.G2.toAffine(t.G2.timesFr(e.g2_sp, e.prvKey)), e;
}
function nn(e, t, n) {
	let r = {
		tau: {},
		alpha: {},
		beta: {}
	};
	return r.tau.prvKey = e.Fr.fromRng(n), r.alpha.prvKey = e.Fr.fromRng(n), r.beta.prvKey = e.Fr.fromRng(n), tn(r.tau, e, 0, t, n), tn(r.alpha, e, 1, t, n), tn(r.beta, e, 2, t, n), r;
}
//#endregion
//#region src/powersoftau_utils.js
async function rn(e, t, n, r) {
	r ||= n, await e.writeULE32(1);
	let i = e.pos;
	await e.writeULE64(0), await e.writeULE32(t.F1.n64 * 8);
	let a = new Uint8Array(t.F1.n8);
	u.toRprLE(a, 0, t.q, t.F1.n8), await e.write(a), await e.writeULE32(n), await e.writeULE32(r);
	let o = e.pos - i - 8, s = e.pos;
	await e.writeULE64(o, i), e.pos = s;
}
async function an(e, t) {
	if (!t[1]) throw Error(e.fileName + ": File has no  header");
	if (t[1].length > 1) throw Error(e.fileName + ": File has more than one header");
	e.pos = t[1][0].p;
	let n = await e.readULE32(), r = await e.read(n), i = await T(u.fromRprLE(r));
	if (i.F1.n64 * 8 != n) throw Error(e.fileName + ": Invalid size");
	let a = await e.readULE32(), o = await e.readULE32();
	if (e.pos - t[1][0].p != t[1][0].size) throw Error("Invalid PTau header size");
	return {
		curve: i,
		power: a,
		ceremonyPower: o
	};
}
async function on(e, t, n) {
	return sn(await e.read(t.F1.n8 * 2 * 6 + t.F2.n8 * 2 * 3), 0, t, n);
}
function sn(e, t, n, r) {
	let i = {
		tau: {},
		alpha: {},
		beta: {}
	};
	return i.tau.g1_s = a(), i.tau.g1_sx = a(), i.alpha.g1_s = a(), i.alpha.g1_sx = a(), i.beta.g1_s = a(), i.beta.g1_sx = a(), i.tau.g2_spx = o(), i.alpha.g2_spx = o(), i.beta.g2_spx = o(), i;
	function a() {
		let i;
		return i = r ? n.G1.fromRprLEM(e, t) : n.G1.fromRprUncompressed(e, t), t += n.G1.F.n8 * 2, i;
	}
	function o() {
		let i;
		return i = r ? n.G2.fromRprLEM(e, t) : n.G2.fromRprUncompressed(e, t), t += n.G2.F.n8 * 2, i;
	}
}
function cn(e, t, n, r, i) {
	a(r.tau.g1_s), a(r.tau.g1_sx), a(r.alpha.g1_s), a(r.alpha.g1_sx), a(r.beta.g1_s), a(r.beta.g1_sx), o(r.tau.g2_spx), o(r.alpha.g2_spx), o(r.beta.g2_spx);
	async function a(r) {
		i ? n.G1.toRprLEM(e, t, r) : n.G1.toRprUncompressed(e, t, r), t += n.F1.n8 * 2;
	}
	async function o(r) {
		i ? n.G2.toRprLEM(e, t, r) : n.G2.toRprUncompressed(e, t, r), t += n.F2.n8 * 2;
	}
	return e;
}
async function ln(e, t, n, r) {
	let i = new Uint8Array(t.F1.n8 * 2 * 6 + t.F2.n8 * 2 * 3);
	cn(i, 0, t, n, r), await e.write(i);
}
async function un(e, t) {
	let n = {};
	n.tauG1 = await c(), n.tauG2 = await l(), n.alphaG1 = await c(), n.betaG1 = await c(), n.betaG2 = await l(), n.key = await on(e, t, !0), n.partialHash = await e.read(216), n.nextChallenge = await e.read(64), n.type = await e.readULE32();
	let r = new Uint8Array(t.G1.F.n8 * 2 * 6 + t.G2.F.n8 * 2 * 3);
	cn(r, 0, t, n.key, !1);
	let i = Ee(n.partialHash);
	i.update(r), n.responseHash = i.digest();
	let a = await e.readULE32(), o = e.pos, s = 0;
	for (; e.pos - o < a;) {
		let e = await u(1);
		if (e[0] <= s) throw Error("Parameters in the contribution must be sorted");
		if (s = e[0], e[0] == 1) {
			let e = await u((await u(1))[0]);
			n.name = new TextDecoder().decode(e);
		} else if (e[0] == 2) n.numIterationsExp = (await u(1))[0];
		else if (e[0] == 3) n.beaconHash = await u((await u(1))[0]);
		else throw Error("Parameter not recognized");
	}
	if (e.pos != o + a) throw Error("Parameters do not match");
	return n;
	async function c() {
		let n = await e.read(t.G1.F.n8 * 2);
		return t.G1.fromRprLEM(n);
	}
	async function l() {
		let n = await e.read(t.G2.F.n8 * 2);
		return t.G2.fromRprLEM(n);
	}
	async function u(t) {
		let n = await e.read(t);
		return new Uint8Array(n);
	}
}
async function dn(e, t, n) {
	if (!n[7]) throw Error(e.fileName + ": File has no  contributions");
	if (n[7][0].length > 1) throw Error(e.fileName + ": File has more than one contributions section");
	e.pos = n[7][0].p;
	let r = await e.readULE32(), i = [];
	for (let n = 0; n < r; n++) {
		let r = await un(e, t);
		r.id = n + 1, i.push(r);
	}
	if (e.pos - n[7][0].p != n[7][0].size) throw Error("Invalid contribution section size");
	return i;
}
async function fn(e, t, n) {
	let r = new Uint8Array(t.F1.n8 * 2), i = new Uint8Array(t.F2.n8 * 2);
	await o(n.tauG1), await s(n.tauG2), await o(n.alphaG1), await o(n.betaG1), await s(n.betaG2), await ln(e, t, n.key, !0), await e.write(n.partialHash), await e.write(n.nextChallenge), await e.writeULE32(n.type || 0);
	let a = [];
	if (n.name) {
		a.push(1);
		let e = new TextEncoder("utf-8").encode(n.name.substring(0, 64));
		a.push(e.byteLength);
		for (let t = 0; t < e.byteLength; t++) a.push(e[t]);
	}
	if (n.type == 1) {
		a.push(2), a.push(n.numIterationsExp), a.push(3), a.push(n.beaconHash.byteLength);
		for (let e = 0; e < n.beaconHash.byteLength; e++) a.push(n.beaconHash[e]);
	}
	if (a.length > 0) {
		let t = new Uint8Array(a);
		await e.writeULE32(t.byteLength), await e.write(t);
	} else await e.writeULE32(0);
	async function o(n) {
		t.G1.toRprLEM(r, 0, n), await e.write(r);
	}
	async function s(n) {
		t.G2.toRprLEM(i, 0, n), await e.write(i);
	}
}
async function pn(e, t, n) {
	await e.writeULE32(7);
	let r = e.pos;
	await e.writeULE64(0), await e.writeULE32(n.length);
	for (let r = 0; r < n.length; r++) await fn(e, t, n[r]);
	let i = e.pos - r - 8, a = e.pos;
	await e.writeULE64(i, r), e.pos = a;
}
function mn(e, t, n) {
	n && n.debug("Calculating First Challenge Hash");
	let r = G.create({ dkLen: 64 }), i = new Uint8Array(e.G1.F.n8 * 2), a = new Uint8Array(e.G2.F.n8 * 2);
	e.G1.toRprUncompressed(i, 0, e.G1.g), e.G2.toRprUncompressed(a, 0, e.G2.g), r.update(G.create({ dkLen: 64 }).digest());
	let o;
	return o = 2 ** t * 2 - 1, n && n.debug("Calculate Initial Hash: tauG1"), s(i, o), o = 2 ** t, n && n.debug("Calculate Initial Hash: tauG2"), s(a, o), n && n.debug("Calculate Initial Hash: alphaTauG1"), s(i, o), n && n.debug("Calculate Initial Hash: betaTauG1"), s(i, o), r.update(a), r.digest();
	function s(e, t) {
		let i = 341e3, a = Math.floor(t / i), o = t % i, s = new Uint8Array(i * e.byteLength);
		for (let t = 0; t < i; t++) s.set(e, t * e.byteLength);
		for (let e = 0; e < a; e++) r.update(s), n && n.debug("Initial hash: " + e * i);
		for (let t = 0; t < o; t++) r.update(e);
	}
}
async function hn(e, t, n, r) {
	return nn(e, t, await Pe(n, r));
}
//#endregion
//#region src/powersoftau_new.js
async function gn(t, n, r, i) {
	let a = await e.createBinFile(r, "ptau", 1, 7);
	await rn(a, t, n, 0);
	let o = t.G1.oneAffine, s = t.G2.oneAffine;
	await e.startWriteSection(a, 2);
	let c = 2 ** n * 2 - 1;
	for (let e = 0; e < c; e++) await a.write(o), i && e % 1e5 == 0 && e && i.log("tauG1: " + e);
	await e.endWriteSection(a), await e.startWriteSection(a, 3);
	let l = 2 ** n;
	for (let e = 0; e < l; e++) await a.write(s), i && e % 1e5 == 0 && e && i.log("tauG2: " + e);
	await e.endWriteSection(a), await e.startWriteSection(a, 4);
	let u = 2 ** n;
	for (let e = 0; e < u; e++) await a.write(o), i && e % 1e5 == 0 && e && i.log("alphaTauG1: " + e);
	await e.endWriteSection(a), await e.startWriteSection(a, 5);
	let d = 2 ** n;
	for (let e = 0; e < d; e++) await a.write(o), i && e % 1e5 == 0 && e && i.log("betaTauG1: " + e);
	await e.endWriteSection(a), await e.startWriteSection(a, 6), await a.write(s), await e.endWriteSection(a), await e.startWriteSection(a, 7), await a.writeULE32(0), await e.endWriteSection(a), await a.close();
	let f = mn(t, n, i);
	return i && i.debug(K(G.create({ dkLen: 64 }).digest(), "Blank Contribution Hash:")), i && i.info(K(f, "First Contribution Hash:")), f;
}
//#endregion
//#region src/powersoftau_export_challenge.js
async function _n(t, n, r) {
	let { fd: i, sections: a } = await e.readBinFile(t, "ptau", 1), { curve: o, power: s } = await an(i, a), c = await dn(i, o, a), l, u;
	c.length == 0 ? (l = G.create({ dkLen: 64 }).digest(), u = mn(o, s)) : (l = c[c.length - 1].responseHash, u = c[c.length - 1].nextChallenge), r && r.info(K(l, "Last Response Hash: ")), r && r.info(K(u, "New Challenge Hash: "));
	let d = await jt(n), f = G.create({ dkLen: 64 });
	await d.write(l), f.update(l), await m(2, "G1", 2 ** s * 2 - 1, "tauG1"), await m(3, "G2", 2 ** s, "tauG2"), await m(4, "G1", 2 ** s, "alphaTauG1"), await m(5, "G1", 2 ** s, "betaTauG1"), await m(6, "G2", 1, "betaG2"), await i.close(), await d.close();
	let p = f.digest();
	if (!we(u, p)) throw r && r.info(K(p, "Calc Curret Challenge Hash: ")), r && r.error("PTau file is corrupted. Calculated new challenge hash does not match with the eclared one"), Error("PTau file is corrupted. Calculated new challenge hash does not match with the eclared one");
	return u;
	async function m(t, n, s, c) {
		let l = o[n], u = l.F.n8 * 2, p = Math.floor((1 << 24) / u);
		await e.startReadUniqueSection(i, a, t);
		for (let e = 0; e < s; e += p) {
			r && r.debug(`Exporting ${c}: ${e}/${s}`);
			let t = Math.min(s - e, p), n;
			n = await i.read(t * u), n = await l.batchLEMtoU(n), await d.write(n), f.update(n);
		}
		await e.endReadSection(i);
	}
}
//#endregion
//#region src/powersoftau_import.js
async function vn(t, n, r, i, a, o) {
	let s = /* @__PURE__ */ new Uint8Array(64);
	for (let e = 0; e < 64; e++) s[e] = 255;
	let { fd: c, sections: l } = await e.readBinFile(t, "ptau", 1), { curve: u, power: d } = await an(c, l), f = await dn(c, u, l), p = {};
	i && (p.name = i);
	let m = u.F1.n8 * 2, h = u.F1.n8, g = u.F2.n8 * 2, _ = u.F2.n8, v = await Mt(n);
	if (v.totalSize != 64 + (2 ** d * 2 - 1) * h + 2 ** d * _ + 2 ** d * h + 2 ** d * h + _ + m * 6 + g * 3) throw Error("Size of the contribution is invalid");
	let y;
	y = f.length > 0 ? f[f.length - 1].nextChallenge : mn(u, d, o);
	let b = await e.createBinFile(r, "ptau", 1, a ? 7 : 2);
	await rn(b, u, d);
	let x = await v.read(64);
	if (we(s, y) && (y = x, f[f.length - 1].nextChallenge = y), !we(x, y)) throw Error("Wrong contribution. This contribution is not based on the previous hash");
	let S = G.create({ dkLen: 64 });
	S.update(x);
	let C = [], w;
	w = await D(v, b, "G1", 2, 2 ** d * 2 - 1, [1], "tauG1"), p.tauG1 = w[0], w = await D(v, b, "G2", 3, 2 ** d, [1], "tauG2"), p.tauG2 = w[0], w = await D(v, b, "G1", 4, 2 ** d, [0], "alphaG1"), p.alphaG1 = w[0], w = await D(v, b, "G1", 5, 2 ** d, [0], "betaG1"), p.betaG1 = w[0], w = await D(v, b, "G2", 6, 1, [0], "betaG2"), p.betaG2 = w[0], p.partialHash = De(S);
	let T = await v.read(u.F1.n8 * 2 * 6 + u.F2.n8 * 2 * 3);
	p.key = sn(T, 0, u, !1), S.update(new Uint8Array(T));
	let E = S.digest();
	if (o && o.info(K(E, "Contribution Response Hash imported: ")), a) {
		let e = G.create({ dkLen: 64 });
		e.update(E), await A(e, b, "G1", 2, 2 ** d * 2 - 1, "tauG1", o), await A(e, b, "G2", 3, 2 ** d, "tauG2", o), await A(e, b, "G1", 4, 2 ** d, "alphaTauG1", o), await A(e, b, "G1", 5, 2 ** d, "betaTauG1", o), await A(e, b, "G2", 6, 1, "betaG2", o), p.nextChallenge = e.digest(), o && o.info(K(p.nextChallenge, "Next Challenge Hash: "));
	} else p.nextChallenge = s;
	return f.push(p), await pn(b, u, f), await v.close(), await b.close(), await c.close(), p.nextChallenge;
	async function D(e, t, n, r, i, o, s) {
		return a ? await O(e, t, n, r, i, o, s) : await k(e, t, n, r, i, o, s);
	}
	async function O(t, n, r, i, a, s, c) {
		let l = u[r], d = l.F.n8, f = l.F.n8 * 2, p = [];
		await e.startWriteSection(n, i);
		let m = Math.floor((1 << 24) / f);
		C[i] = n.pos;
		for (let e = 0; e < a; e += m) {
			o && o.debug(`Importing ${c}: ${e}/${a}`);
			let r = Math.min(a - e, m), i = await t.read(r * d);
			S.update(i);
			let u = await l.batchCtoLEM(i);
			await n.write(u);
			for (let t = 0; t < s.length; t++) {
				let n = s[t];
				if (n >= e && n < e + r) {
					let t = l.fromRprLEM(u, (n - e) * f);
					p.push(t);
				}
			}
		}
		return await e.endWriteSection(n), p;
	}
	async function k(e, t, n, r, i, a, s) {
		let c = u[n], l = c.F.n8, d = [], f = Math.floor((1 << 24) / l);
		for (let t = 0; t < i; t += f) {
			o && o.debug(`Importing ${s}: ${t}/${i}`);
			let n = Math.min(i - t, f), r = await e.read(n * l);
			S.update(r);
			for (let e = 0; e < a.length; e++) {
				let i = a[e];
				if (i >= t && i < t + n) {
					let e = c.fromRprCompressed(r, (i - t) * l);
					d.push(e);
				}
			}
		}
		return d;
	}
	async function A(e, t, n, r, i, a, o) {
		let s = u[n], c = s.F.n8 * 2, l = Math.floor((1 << 24) / c), d = t.pos;
		t.pos = C[r];
		for (let n = 0; n < i; n += l) {
			o && o.debug(`Hashing ${a}: ${n}/${i}`);
			let r = Math.min(i - n, l), u = await t.read(r * c), d = await s.batchLEMtoU(u);
			e.update(d);
		}
		t.pos = d;
	}
}
//#endregion
//#region src/powersoftau_verify.js
var yn = Oe;
async function bn(e, t, n, r) {
	let i;
	if (t.type == 1) {
		let i = await hn(e, n.nextChallenge, t.beaconHash, t.numIterationsExp);
		if (!e.G1.eq(t.key.tau.g1_s, i.tau.g1_s)) return r && r.error(`BEACON key (tauG1_s) is not generated correctly in challenge #${t.id}  ${t.name || ""}`), !1;
		if (!e.G1.eq(t.key.tau.g1_sx, i.tau.g1_sx)) return r && r.error(`BEACON key (tauG1_sx) is not generated correctly in challenge #${t.id}  ${t.name || ""}`), !1;
		if (!e.G2.eq(t.key.tau.g2_spx, i.tau.g2_spx)) return r && r.error(`BEACON key (tauG2_spx) is not generated correctly in challenge #${t.id}  ${t.name || ""}`), !1;
		if (!e.G1.eq(t.key.alpha.g1_s, i.alpha.g1_s)) return r && r.error(`BEACON key (alphaG1_s) is not generated correctly in challenge #${t.id}  ${t.name || ""}`), !1;
		if (!e.G1.eq(t.key.alpha.g1_sx, i.alpha.g1_sx)) return r && r.error(`BEACON key (alphaG1_sx) is not generated correctly in challenge #${t.id}  ${t.name || ""}`), !1;
		if (!e.G2.eq(t.key.alpha.g2_spx, i.alpha.g2_spx)) return r && r.error(`BEACON key (alphaG2_spx) is not generated correctly in challenge #${t.id}  ${t.name || ""}`), !1;
		if (!e.G1.eq(t.key.beta.g1_s, i.beta.g1_s)) return r && r.error(`BEACON key (betaG1_s) is not generated correctly in challenge #${t.id}  ${t.name || ""}`), !1;
		if (!e.G1.eq(t.key.beta.g1_sx, i.beta.g1_sx)) return r && r.error(`BEACON key (betaG1_sx) is not generated correctly in challenge #${t.id}  ${t.name || ""}`), !1;
		if (!e.G2.eq(t.key.beta.g2_spx, i.beta.g2_spx)) return r && r.error(`BEACON key (betaG2_spx) is not generated correctly in challenge #${t.id}  ${t.name || ""}`), !1;
	}
	return t.key.tau.g2_sp = e.G2.toAffine(en(e, 0, n.nextChallenge, t.key.tau.g1_s, t.key.tau.g1_sx)), t.key.alpha.g2_sp = e.G2.toAffine(en(e, 1, n.nextChallenge, t.key.alpha.g1_s, t.key.alpha.g1_sx)), t.key.beta.g2_sp = e.G2.toAffine(en(e, 2, n.nextChallenge, t.key.beta.g1_s, t.key.beta.g1_sx)), i = await yn(e, t.key.tau.g1_s, t.key.tau.g1_sx, t.key.tau.g2_sp, t.key.tau.g2_spx), i === !0 ? (i = await yn(e, t.key.alpha.g1_s, t.key.alpha.g1_sx, t.key.alpha.g2_sp, t.key.alpha.g2_spx), i === !0 ? (i = await yn(e, t.key.beta.g1_s, t.key.beta.g1_sx, t.key.beta.g2_sp, t.key.beta.g2_spx), i === !0 ? (i = await yn(e, n.tauG1, t.tauG1, t.key.tau.g2_sp, t.key.tau.g2_spx), i === !0 ? (i = await yn(e, t.key.tau.g1_s, t.key.tau.g1_sx, n.tauG2, t.tauG2), i === !0 ? (i = await yn(e, n.alphaG1, t.alphaG1, t.key.alpha.g2_sp, t.key.alpha.g2_spx), i === !0 ? (i = await yn(e, n.betaG1, t.betaG1, t.key.beta.g2_sp, t.key.beta.g2_spx), i === !0 ? (i = await yn(e, t.key.beta.g1_s, t.key.beta.g1_sx, n.betaG2, t.betaG2), i === !0 ? (r && r.info("Powers Of tau file OK!"), !0) : (r && r.error("INVALID beta*G2. challenge #" + t.id + "It does not follow the previous contribution"), !1)) : (r && r.error("INVALID beta*G1. challenge #" + t.id + " It does not follow the previous contribution"), !1)) : (r && r.error("INVALID alpha*G1. challenge #" + t.id + " It does not follow the previous contribution"), !1)) : (r && r.error("INVALID tau*G2. challenge #" + t.id + " It does not follow the previous contribution"), !1)) : (r && r.error("INVALID tau*G1. challenge #" + t.id + " It does not follow the previous contribution"), !1)) : (r && r.error("INVALID key (beta) in challenge #" + t.id), !1)) : (r && r.error("INVALID key (alpha) in challenge #" + t.id), !1)) : (r && r.error("INVALID key (tau) in challenge #" + t.id), !1);
}
async function xn(t, n) {
	let r, { fd: i, sections: a } = await e.readBinFile(t, "ptau", 1), { curve: o, power: l, ceremonyPower: u } = await an(i, a), d = await dn(i, o, a);
	n && n.debug("power: 2**" + l), n && n.debug("Computing initial contribution hash");
	let f = {
		tauG1: o.G1.g,
		tauG2: o.G2.g,
		alphaG1: o.G1.g,
		betaG1: o.G1.g,
		betaG2: o.G2.g,
		nextChallenge: mn(o, u, n),
		responseHash: G.create({ dkLen: 64 }).digest()
	};
	if (d.length == 0) return n && n.error("This file has no contribution! It cannot be used in production"), !1;
	let p;
	p = d.length > 1 ? d[d.length - 2] : f;
	let m = d[d.length - 1];
	if (n && n.debug("Validating contribution #" + d[d.length - 1].id), !await bn(o, m, p, n)) return !1;
	let h = G.create({ dkLen: 64 });
	h.update(m.responseHash), n && n.debug("Verifying powers in tau*G1 section");
	let g = await w(2, "G1", "tauG1", 2 ** l * 2 - 1, [0, 1], n);
	if (r = await yn(o, g.R1, g.R2, o.G2.g, m.tauG2), r !== !0) return n && n.error("tauG1 section. Powers do not match"), !1;
	if (!o.G1.eq(o.G1.g, g.singularPoints[0])) return n && n.error("First element of tau*G1 section must be the generator"), !1;
	if (!o.G1.eq(m.tauG1, g.singularPoints[1])) return n && n.error("Second element of tau*G1 section does not match the one in the contribution section"), !1;
	n && n.debug("Verifying powers in tau*G2 section");
	let _ = await w(3, "G2", "tauG2", 2 ** l, [0, 1], n);
	if (r = await yn(o, o.G1.g, m.tauG1, _.R1, _.R2), r !== !0) return n && n.error("tauG2 section. Powers do not match"), !1;
	if (!o.G2.eq(o.G2.g, _.singularPoints[0])) return n && n.error("First element of tau*G2 section must be the generator"), !1;
	if (!o.G2.eq(m.tauG2, _.singularPoints[1])) return n && n.error("Second element of tau*G2 section does not match the one in the contribution section"), !1;
	n && n.debug("Verifying powers in alpha*tau*G1 section");
	let v = await w(4, "G1", "alphatauG1", 2 ** l, [0], n);
	if (r = await yn(o, v.R1, v.R2, o.G2.g, m.tauG2), r !== !0) return n && n.error("alphaTauG1 section. Powers do not match"), !1;
	if (!o.G1.eq(m.alphaG1, v.singularPoints[0])) return n && n.error("First element of alpha*tau*G1 section (alpha*G1) does not match the one in the contribution section"), !1;
	n && n.debug("Verifying powers in beta*tau*G1 section");
	let y = await w(5, "G1", "betatauG1", 2 ** l, [0], n);
	if (r = await yn(o, y.R1, y.R2, o.G2.g, m.tauG2), r !== !0) return n && n.error("betaTauG1 section. Powers do not match"), !1;
	if (!o.G1.eq(m.betaG1, y.singularPoints[0])) return n && n.error("First element of beta*tau*G1 section (beta*G1) does not match the one in the contribution section"), !1;
	let b = await C(n);
	if (!o.G2.eq(m.betaG2, b)) return n && n.error("betaG2 element in betaG2 section does not match the one in the contribution section"), !1;
	let x = h.digest();
	if (l == u && !we(x, m.nextChallenge)) return n && n.error("Hash of the values does not match the next challenge of the last contributor in the contributions section"), !1;
	n && n.info(K(x, "Next challenge hash: ")), S(m, p);
	for (let e = d.length - 2; e >= 0; e--) {
		let t = d[e], r = e > 0 ? d[e - 1] : f;
		if (!await bn(o, t, r, n)) return !1;
		S(t, r, n);
	}
	if (n && n.info("-----------------------------------------------------"), !a[12] || !a[13] || !a[14] || !a[15]) n && n.warn("this file does not contain phase2 precalculated values. Please run: \n   snarkjs \"powersoftau preparephase2\" to prepare this file to be used in the phase2 ceremony.");
	else {
		let e;
		if (e = await T("G1", 2, 12, "tauG1", n), !e || (e = await T("G2", 3, 13, "tauG2", n), !e) || (e = await T("G1", 4, 14, "alphaTauG1", n), !e) || (e = await T("G1", 5, 15, "betaTauG1", n), !e)) return !1;
	}
	return await i.close(), n && n.info("Powers of Tau Ok!"), !0;
	function S(e, t) {
		if (!n) return;
		n.info("-----------------------------------------------------"), n.info(`Contribution #${e.id}: ${e.name || ""}`), n.info(K(e.nextChallenge, "Next Challenge: "));
		let r = new Uint8Array(o.G1.F.n8 * 2 * 6 + o.G2.F.n8 * 2 * 3);
		cn(r, 0, o, e.key, !1);
		let i = Ee(e.partialHash);
		i.update(r);
		let a = i.digest();
		n.info(K(a, "Response Hash:")), n.info(K(t.nextChallenge, "Response Hash:")), e.type == 1 && (n.info(`Beacon generator: ${Ie(e.beaconHash)}`), n.info(`Beacon iterations Exp: ${e.numIterationsExp}`));
	}
	async function C(e) {
		let t = o.G2, n = t.F.n8 * 2, r = new Uint8Array(n);
		if (!a[6]) throw e.error("File has no BetaG2 section"), Error("File has no BetaG2 section");
		if (a[6].length > 1) throw e.error("File has no BetaG2 section"), Error("File has more than one GetaG2 section");
		i.pos = a[6][0].p;
		let s = await i.read(n), c = t.fromRprLEM(s);
		return t.toRprUncompressed(r, 0, c), h.update(r), c;
	}
	async function w(t, n, r, s, c, l) {
		let u = 65536, d = o[n], f = d.F.n8 * 2;
		await e.startReadUniqueSection(i, a, t);
		let p = [], m = d.zero, g = d.zero, _ = d.zero;
		for (let e = 0; e < s; e += u) {
			l && l.debug(`points relations: ${r}: ${e}/${s} `);
			let t = Math.min(s - e, u), n = await i.read(t * f), a = await d.batchLEMtoU(n);
			h.update(a);
			let o = Ae(4 * (t - 1));
			if (e > 0) {
				let e = d.fromRprLEM(n, 0), t = Me(Ae(4), 0);
				m = d.add(m, d.timesScalar(_, t)), g = d.add(g, d.timesScalar(e, t));
			}
			let v = await d.multiExpAffine(n.slice(0, (t - 1) * f), o), y = await d.multiExpAffine(n.slice(f), o);
			m = d.add(m, v), g = d.add(g, y), _ = d.fromRprLEM(n, (t - 1) * f);
			for (let r = 0; r < c.length; r++) {
				let i = c[r];
				if (i >= e && i < e + t) {
					let t = d.fromRprLEM(n, (i - e) * f);
					p.push(t);
				}
			}
		}
		return await e.endReadSection(i), {
			R1: m,
			R2: g,
			singularPoints: p
		};
	}
	async function T(t, n, r, u, d) {
		d && d.debug(`Verifying phase2 calculated values ${u}...`);
		let f = o[t], p = f.F.n8 * 2, m = Array(8);
		for (let e = 0; e < 8; e++) m[e] = Me(Ae(4), 0);
		for (let e = 0; e <= l; e++) if (!await h(e)) return !1;
		if (n == 2 && !await h(l + 1)) return !1;
		return !0;
		async function h(t) {
			d && d.debug(`Power ${t}...`);
			let h = o.Fr.n8, g = 2 ** t, _ = new Uint32Array(g), v, y = new c(m);
			d && d.debug(`Creating random numbers Powers${t}...`);
			for (let e = 0; e < g; e++) t == l + 1 && e == g - 1 ? _[e] = 0 : _[e] = y.nextU32();
			_ = new Uint8Array(_.buffer, _.byteOffset, _.byteLength), d && d.debug(`reading points Powers${t}...`), await e.startReadUniqueSection(i, a, n), v = new s(g * p), t == l + 1 ? (await i.readToBuffer(v, 0, (g - 1) * p), v.set(o.G1.zeroAffine, (g - 1) * p)) : await i.readToBuffer(v, 0, g * p), await e.endReadSection(i, !0);
			let b = await f.multiExpAffine(v, _, d, u + "_" + t);
			_ = new s(g * h), y = new c(m);
			let x = /* @__PURE__ */ new Uint8Array(4), S = new DataView(x.buffer);
			d && d.debug(`Creating random numbers Powers${t}...`);
			for (let e = 0; e < g; e++) (e != g - 1 || t != l + 1) && (S.setUint32(0, y.nextU32(), !0), _.set(x, e * h));
			d && d.debug(`batchToMontgomery ${t}...`), _ = await o.Fr.batchToMontgomery(_), d && d.debug(`fft ${t}...`), _ = await o.Fr.fft(_), d && d.debug(`batchFromMontgomery ${t}...`), _ = await o.Fr.batchFromMontgomery(_), d && d.debug(`reading points Lagrange${t}...`), await e.startReadUniqueSection(i, a, r), i.pos += p * (2 ** t - 1), await i.readToBuffer(v, 0, g * p), await e.endReadSection(i, !0);
			let C = await f.multiExpAffine(v, _, d, u + "_" + t + "_transformed");
			return f.eq(b, C) ? !0 : (d && d.error("Phase2 caclutation does not match with powers of tau"), !1);
		}
	}
}
//#endregion
//#region src/mpc_applykey.js
async function Sn(t, n, r, i, a, o, s, c, l, u) {
	let d = 65536, f = a[o], p = f.F.n8 * 2, m = n[i][0].size / p;
	await e.startReadUniqueSection(t, n, i), await e.startWriteSection(r, i);
	let h = s;
	for (let e = 0; e < m; e += d) {
		u && u.debug(`Applying key: ${l}: ${e}/${m}`);
		let n = Math.min(m - e, d), i;
		i = await t.read(n * p), i = await f.batchApplyKey(i, h, c), await r.write(i), h = a.Fr.mul(h, a.Fr.exp(c, n));
	}
	await e.endWriteSection(r), await e.endReadSection(t);
}
async function Cn(e, t, n, r, i, a, o, s, c, l, u) {
	let d = r[i], f = d.F.n8 * 2, p = Math.floor((1 << 20) / f), m = o;
	for (let i = 0; i < a; i += p) {
		u && u.debug(`Applying key ${l}: ${i}/${a}`);
		let o = Math.min(a - i, p), h = await e.read(o * f), g = await d.batchUtoLEM(h), _ = await d.batchApplyKey(g, m, s), v;
		v = c == "COMPRESSED" ? await d.batchLEMtoC(_) : await d.batchLEMtoU(_), n && n.update(v), await t.write(v), m = r.Fr.mul(m, r.Fr.exp(s, o));
	}
}
//#endregion
//#region src/powersoftau_challenge_contribute.js
async function wn(e, t, n, r, i) {
	let a = await Mt(t), o = e.F1.n64 * 8 * 2, s = e.F2.n64 * 8 * 2, c = (a.totalSize + o - 64 - s) / (4 * o + s), l = c, u = 0;
	for (; l > 1;) l /= 2, u += 1;
	if (2 ** u != c) throw Error("Invalid file size");
	i && i.debug("Power to tau size: " + u);
	let d = await Ne(r), f = await jt(n), p = G.create({ dkLen: 64 });
	for (let e = 0; e < a.totalSize; e += a.pageSize) {
		i && i.debug(`Hashing challenge ${e}/${a.totalSize}`);
		let t = Math.min(a.totalSize - e, a.pageSize), n = await a.read(t);
		p.update(n);
	}
	let m = await a.read(64, 0);
	i && i.info(K(m, "Claimed Previous Response Hash: "));
	let h = p.digest();
	i && i.info(K(h, "Current Challenge Hash: "));
	let g = nn(e, h, d);
	i && [
		"tau",
		"alpha",
		"beta"
	].forEach((t) => {
		i.debug(t + ".g1_s: " + e.G1.toString(g[t].g1_s, 16)), i.debug(t + ".g1_sx: " + e.G1.toString(g[t].g1_sx, 16)), i.debug(t + ".g2_sp: " + e.G2.toString(g[t].g2_sp, 16)), i.debug(t + ".g2_spx: " + e.G2.toString(g[t].g2_spx, 16)), i.debug("");
	});
	let _ = G.create({ dkLen: 64 });
	await f.write(h), _.update(h), await Cn(a, f, _, e, "G1", 2 ** u * 2 - 1, e.Fr.one, g.tau.prvKey, "COMPRESSED", "tauG1", i), await Cn(a, f, _, e, "G2", 2 ** u, e.Fr.one, g.tau.prvKey, "COMPRESSED", "tauG2", i), await Cn(a, f, _, e, "G1", 2 ** u, g.alpha.prvKey, g.tau.prvKey, "COMPRESSED", "alphaTauG1", i), await Cn(a, f, _, e, "G1", 2 ** u, g.beta.prvKey, g.tau.prvKey, "COMPRESSED", "betaTauG1", i), await Cn(a, f, _, e, "G2", 1, g.beta.prvKey, g.tau.prvKey, "COMPRESSED", "betaTauG2", i);
	let v = new Uint8Array(e.F1.n8 * 2 * 6 + e.F2.n8 * 2 * 3);
	cn(v, 0, e, g, !1), await f.write(v), _.update(v);
	let y = _.digest();
	i && i.info(K(y, "Contribution Response Hash: ")), await f.close(), await a.close();
}
//#endregion
//#region src/powersoftau_beacon.js
async function Tn(t, n, r, i, a, o) {
	let s = Fe(i);
	if (s.byteLength == 0 || s.byteLength * 2 != i.length) return o && o.error("Invalid Beacon Hash. (It must be a valid hexadecimal sequence)"), !1;
	if (s.length >= 256) return o && o.error("Maximum length of beacon hash is 255 bytes"), !1;
	if (a = parseInt(a), a < 10 || a > 63) return o && o.error("Invalid numIterationsExp. (Must be between 10 and 63)"), !1;
	let { fd: c, sections: l } = await e.readBinFile(t, "ptau", 1), { curve: u, power: d, ceremonyPower: f } = await an(c, l);
	if (d != f) return o && o.error("This file has been reduced. You cannot contribute into a reduced file."), !1;
	l[12] && o && o.warn("Contributing into a file that has phase2 calculated. You will have to prepare phase2 again.");
	let p = await dn(c, u, l), m = {
		name: r,
		type: 1,
		numIterationsExp: a,
		beaconHash: s
	}, h;
	h = p.length > 0 ? p[p.length - 1].nextChallenge : mn(u, d, o), m.key = await hn(u, h, s, a);
	let g = G.create({ dkLen: 64 });
	g.update(h);
	let _ = await e.createBinFile(n, "ptau", 1, 7);
	await rn(_, u, d);
	let v = [], y;
	y = await C(2, "G1", 2 ** d * 2 - 1, u.Fr.e(1), m.key.tau.prvKey, "tauG1", o), m.tauG1 = y[1], y = await C(3, "G2", 2 ** d, u.Fr.e(1), m.key.tau.prvKey, "tauG2", o), m.tauG2 = y[1], y = await C(4, "G1", 2 ** d, m.key.alpha.prvKey, m.key.tau.prvKey, "alphaTauG1", o), m.alphaG1 = y[0], y = await C(5, "G1", 2 ** d, m.key.beta.prvKey, m.key.tau.prvKey, "betaTauG1", o), m.betaG1 = y[0], y = await C(6, "G2", 1, m.key.beta.prvKey, m.key.tau.prvKey, "betaTauG2", o), m.betaG2 = y[0], m.partialHash = De(g);
	let b = new Uint8Array(u.F1.n8 * 2 * 6 + u.F2.n8 * 2 * 3);
	cn(b, 0, u, m.key, !1), g.update(new Uint8Array(b));
	let x = g.digest();
	o && o.info(K(x, "Contribution Response Hash imported: "));
	let S = G.create({ dkLen: 64 });
	return S.update(x), await w(_, "G1", 2, 2 ** d * 2 - 1, "tauG1", o), await w(_, "G2", 3, 2 ** d, "tauG2", o), await w(_, "G1", 4, 2 ** d, "alphaTauG1", o), await w(_, "G1", 5, 2 ** d, "betaTauG1", o), await w(_, "G2", 6, 1, "betaG2", o), m.nextChallenge = S.digest(), o && o.info(K(m.nextChallenge, "Next Challenge Hash: ")), p.push(m), await pn(_, u, p), await c.close(), await _.close(), x;
	async function C(t, n, r, i, a, o, s) {
		let d = [];
		c.pos = l[t][0].p, await e.startWriteSection(_, t), v[t] = _.pos;
		let f = u[n], p = f.F.n8 * 2, m = Math.floor((1 << 20) / p), h = i;
		for (let e = 0; e < r; e += m) {
			s && s.debug(`applying key${o}: ${e}/${r}`);
			let t = Math.min(r - e, m), n = await c.read(t * p), i = await f.batchApplyKey(n, h, a), l = _.write(i), v = await f.batchLEMtoC(i);
			if (g.update(v), await l, e == 0) for (let e = 0; e < Math.min(2, r); e++) d.push(f.fromRprLEM(i, e * p));
			h = u.Fr.mul(h, u.Fr.exp(a, t));
		}
		return await e.endWriteSection(_), d;
	}
	async function w(e, t, n, r, i, a) {
		let o = u[t], s = o.F.n8 * 2, c = Math.floor((1 << 24) / s), l = e.pos;
		e.pos = v[n];
		for (let t = 0; t < r; t += c) {
			a && a.debug(`Hashing ${i}: ${t}/${r}`);
			let n = Math.min(r - t, c), l = await e.read(n * s), u = await o.batchLEMtoU(l);
			S.update(u);
		}
		e.pos = l;
	}
}
//#endregion
//#region src/powersoftau_contribute.js
async function En(t, n, r, i, a) {
	let { fd: o, sections: s } = await e.readBinFile(t, "ptau", 1), { curve: c, power: l, ceremonyPower: u } = await an(o, s);
	if (l != u) throw a && a.error("This file has been reduced. You cannot contribute into a reduced file."), Error("This file has been reduced. You cannot contribute into a reduced file.");
	s[12] && a && a.warn("WARNING: Contributing into a file that has phase2 calculated. You will have to prepare phase2 again.");
	let d = await dn(o, c, s), f = {
		name: r,
		type: 0
	}, p, m = await Ne(i);
	p = d.length > 0 ? d[d.length - 1].nextChallenge : mn(c, l, a), f.key = nn(c, p, m);
	let h = G.create({ dkLen: 64 });
	h.update(p);
	let g = await e.createBinFile(n, "ptau", 1, 7);
	await rn(g, c, l);
	let _ = [], v;
	v = await S(2, "G1", 2 ** l * 2 - 1, c.Fr.e(1), f.key.tau.prvKey, "tauG1"), f.tauG1 = v[1], v = await S(3, "G2", 2 ** l, c.Fr.e(1), f.key.tau.prvKey, "tauG2"), f.tauG2 = v[1], v = await S(4, "G1", 2 ** l, f.key.alpha.prvKey, f.key.tau.prvKey, "alphaTauG1"), f.alphaG1 = v[0], v = await S(5, "G1", 2 ** l, f.key.beta.prvKey, f.key.tau.prvKey, "betaTauG1"), f.betaG1 = v[0], v = await S(6, "G2", 1, f.key.beta.prvKey, f.key.tau.prvKey, "betaTauG2"), f.betaG2 = v[0], f.partialHash = De(h);
	let y = new Uint8Array(c.F1.n8 * 2 * 6 + c.F2.n8 * 2 * 3);
	cn(y, 0, c, f.key, !1), h.update(new Uint8Array(y));
	let b = h.digest();
	a && a.info(K(b, "Contribution Response Hash imported: "));
	let x = G.create({ dkLen: 64 });
	return x.update(b), await C(g, "G1", 2, 2 ** l * 2 - 1, "tauG1"), await C(g, "G2", 3, 2 ** l, "tauG2"), await C(g, "G1", 4, 2 ** l, "alphaTauG1"), await C(g, "G1", 5, 2 ** l, "betaTauG1"), await C(g, "G2", 6, 1, "betaG2"), f.nextChallenge = x.digest(), a && a.info(K(f.nextChallenge, "Next Challenge Hash: ")), d.push(f), await pn(g, c, d), await o.close(), await g.close(), b;
	async function S(t, n, r, i, l, u) {
		let d = [];
		o.pos = s[t][0].p, await e.startWriteSection(g, t), _[t] = g.pos;
		let f = c[n], p = f.F.n8 * 2, m = Math.floor((1 << 20) / p), v = i;
		for (let e = 0; e < r; e += m) {
			a && a.debug(`processing: ${u}: ${e}/${r}`);
			let t = Math.min(r - e, m), n = await o.read(t * p), i = await f.batchApplyKey(n, v, l), s = g.write(i), _ = await f.batchLEMtoC(i);
			if (h.update(_), await s, e == 0) for (let e = 0; e < Math.min(2, r); e++) d.push(f.fromRprLEM(i, e * p));
			v = c.Fr.mul(v, c.Fr.exp(l, t));
		}
		return await e.endWriteSection(g), d;
	}
	async function C(e, t, n, r, i) {
		let o = c[t], s = o.F.n8 * 2, l = Math.floor((1 << 24) / s), u = e.pos;
		e.pos = _[n];
		for (let t = 0; t < r; t += l) {
			a && t && a.debug(`Hashing ${i}: ` + t);
			let n = Math.min(r - t, l), c = await e.read(n * s), u = await o.batchLEMtoU(c);
			x.update(u);
		}
		e.pos = u;
	}
}
//#endregion
//#region src/powersoftau_preparephase2.js
async function Dn(t, n, r) {
	let { fd: i, sections: a } = await e.readBinFile(t, "ptau", 1), { curve: o, power: c } = await an(i, a), l = await e.createBinFile(n, "ptau", 1, 11);
	await rn(l, o, c), await e.copySection(i, a, l, 2), await e.copySection(i, a, l, 3), await e.copySection(i, a, l, 4), await e.copySection(i, a, l, 5), await e.copySection(i, a, l, 6), await e.copySection(i, a, l, 7), await u(2, 12, "G1", "tauG1"), await u(3, 13, "G2", "tauG2"), await u(4, 14, "G1", "alphaTauG1"), await u(5, 15, "G1", "betaTauG1"), await i.close(), await l.close();
	return;
	async function u(t, n, u, d) {
		r && r.debug("Starting section: " + d), await e.startWriteSection(l, n);
		for (let e = 0; e <= c; e++) await f(e);
		t == 2 && await f(c + 1), await e.endWriteSection(l);
		async function f(n) {
			let f = 2 ** n, p = o[u], m = p.F.n8 * 2, h;
			h = new s(f * m), await e.startReadUniqueSection(i, a, t), t == 2 && n == c + 1 ? (await i.readToBuffer(h, 0, (f - 1) * m), h.set(o.G1.zeroAffine, (f - 1) * m)) : await i.readToBuffer(h, 0, f * m), await e.endReadSection(i, !0), h = await p.lagrangeEvaluations(h, "affine", "affine", r, d), await l.write(h);
		}
	}
}
//#endregion
//#region src/powersoftau_truncate.js
async function On(t, n, r) {
	let { fd: i, sections: a } = await e.readBinFile(t, "ptau", 1), { curve: o, power: s, ceremonyPower: c } = await an(i, a), l = o.G1.F.n8 * 2, u = o.G2.F.n8 * 2;
	for (let e = 1; e < s; e++) await d(e);
	return await i.close(), !0;
	async function d(t) {
		let s = t.toString();
		for (; s.length < 2;) s = "0" + s;
		r && r.debug("Writing Power: " + s);
		let d = await e.createBinFile(n + s + ".ptau", "ptau", 1, 11);
		await rn(d, o, t, c), await e.copySection(i, a, d, 2, (2 ** t * 2 - 1) * l), await e.copySection(i, a, d, 3, 2 ** t * u), await e.copySection(i, a, d, 4, 2 ** t * l), await e.copySection(i, a, d, 5, 2 ** t * l), await e.copySection(i, a, d, 6, u), await e.copySection(i, a, d, 7), await e.copySection(i, a, d, 12, (2 ** (t + 1) * 2 - 1) * l), await e.copySection(i, a, d, 13, (2 ** t * 2 - 1) * u), await e.copySection(i, a, d, 14, (2 ** t * 2 - 1) * l), await e.copySection(i, a, d, 15, (2 ** t * 2 - 1) * l), await d.close();
	}
}
//#endregion
//#region src/powersoftau_convert.js
async function kn(t, n, r) {
	let { fd: i, sections: a } = await e.readBinFile(t, "ptau", 1), { curve: o, power: c } = await an(i, a), l = await e.createBinFile(n, "ptau", 1, 11);
	await rn(l, o, c), await e.copySection(i, a, l, 2), await e.copySection(i, a, l, 3), await e.copySection(i, a, l, 4), await e.copySection(i, a, l, 5), await e.copySection(i, a, l, 6), await e.copySection(i, a, l, 7), await u(2, 12, "G1", "tauG1"), await e.copySection(i, a, l, 13), await e.copySection(i, a, l, 14), await e.copySection(i, a, l, 15), await i.close(), await l.close();
	return;
	async function u(t, n, u, d) {
		r && r.debug("Starting section: " + d), await e.startWriteSection(l, n);
		let f = a[n][0].size, p = i.pageSize;
		await e.startReadUniqueSection(i, a, n);
		for (let e = 0; e < f; e += p) {
			let t = Math.min(f - e, p), n = await i.read(t);
			await l.write(n);
		}
		await e.endReadSection(i), t == 2 && await m(c + 1), await e.endWriteSection(l);
		async function m(n) {
			let f = 2 ** n, p = o[u], m = p.F.n8 * 2, h;
			h = new s(f * m), await e.startReadUniqueSection(i, a, t), t == 2 && n == c + 1 ? (await i.readToBuffer(h, 0, (f - 1) * m), h.set(o.G1.zeroAffine, (f - 1) * m)) : await i.readToBuffer(h, 0, f * m), await e.endReadSection(i, !0), h = await p.lagrangeEvaluations(h, "affine", "affine", r, d), await l.write(h);
		}
	}
}
//#endregion
//#region src/powersoftau_export_json.js
async function An(t, n) {
	let { fd: r, sections: i } = await e.readBinFile(t, "ptau", 1), { curve: a, power: o } = await an(r, i), s = {};
	return s.q = a.q, s.power = o, s.contributions = await dn(r, a, i), s.tauG1 = await c(2, "G1", 2 ** o * 2 - 1, "tauG1"), s.tauG2 = await c(3, "G2", 2 ** o, "tauG2"), s.alphaTauG1 = await c(4, "G1", 2 ** o, "alphaTauG1"), s.betaTauG1 = await c(5, "G1", 2 ** o, "betaTauG1"), s.betaG2 = await c(6, "G2", 1, "betaG2"), s.lTauG1 = await l(12, "G1", "lTauG1"), s.lTauG2 = await l(13, "G2", "lTauG2"), s.lAlphaTauG1 = await l(14, "G1", "lAlphaTauG2"), s.lBetaTauG1 = await l(15, "G1", "lBetaTauG2"), await r.close(), Le(a.Fr, s);
	async function c(t, o, s, c) {
		let l = a[o], u = l.F.n8 * 2, d = [];
		await e.startReadUniqueSection(r, i, t);
		for (let e = 0; e < s; e++) {
			n && e && e % 1e4 == 0 && console.log(`${c}: ` + e);
			let t = await r.read(u);
			d.push(l.fromRprLEM(t, 0));
		}
		return await e.endReadSection(r), d;
	}
	async function l(t, s, c) {
		let l = a[s], u = l.F.n8 * 2, d = [];
		await e.startReadUniqueSection(r, i, t);
		for (let e = 0; e <= o; e++) {
			n && console.log(`${c}: Power: ${e}`), d[e] = [];
			let t = 2 ** e;
			for (let i = 0; i < t; i++) {
				n && i && i % 1e4 == 0 && console.log(`${c}: ${i}/${t}`);
				let a = await r.read(u);
				d[e].push(l.fromRprLEM(a, 0));
			}
		}
		return await e.endReadSection(r, !0), d;
	}
}
//#endregion
//#region src/powersoftau.js
var jn = /* @__PURE__ */ v({
	beacon: () => Tn,
	challengeContribute: () => wn,
	contribute: () => En,
	convert: () => kn,
	exportChallenge: () => _n,
	exportJson: () => An,
	importResponse: () => vn,
	newAccumulator: () => gn,
	preparePhase2: () => Dn,
	truncate: () => On,
	verify: () => xn
});
//#endregion
//#region src/r1cs_print.js
function Mn(e, t, n) {
	for (let t = 0; t < e.constraints.length; t++) r(e.constraints[t]);
	function r(r) {
		let i = (n) => {
			let r = "";
			return Object.keys(n).forEach((i) => {
				let a = t.varIdx2Name[i];
				a == "one" && (a = "1");
				let o = e.curve.Fr.toString(n[i]);
				o == "1" && (o = ""), o == "-1" && (o = "-"), r != "" && o[0] != "-" && (o = "+" + o), r != "" && (o = " " + o), r = r + o + a;
			}), r;
		}, a = `[ ${i(r[0])} ] * [ ${i(r[1])} ] - [ ${i(r[2])} ] = 0`;
		n && n.info(a);
	}
}
//#endregion
//#region src/r1cs_info.js
var Nn = u.e("73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001", 16), Pn = u.e("21888242871839275222246405745257275088548364400416034343698204186575808495617");
async function Fn(e, t) {
	let n = await m(e, {
		loadConstraints: !1,
		loadMap: !1
	});
	return u.eq(n.prime, Pn) ? t && t.info("Curve: bn-128") : u.eq(n.prime, Nn) ? t && t.info("Curve: bls12-381") : t && t.info(`Unknown Curve. Prime: ${u.toString(n.prime)}`), t && t.info(`# of Wires: ${n.nVars}`), t && t.info(`# of Constraints: ${n.nConstraints}`), t && t.info(`# of Private Inputs: ${n.nPrvInputs}`), t && t.info(`# of Public Inputs: ${n.nPubInputs}`), t && t.info(`# of Labels: ${n.nLabels}`), t && t.info(`# of Outputs: ${n.nOutputs}`), n;
}
//#endregion
//#region src/r1cs_export_json.js
async function In(e, t) {
	let n = await m(e, !0, !0, !0, t), r = n.curve.Fr;
	return delete n.curve, delete n.F, Le(r, n);
}
//#endregion
//#region src/r1cs.js
var Ln = /* @__PURE__ */ v({
	exportJson: () => In,
	info: () => Fn,
	print: () => Mn
});
//#endregion
//#region src/loadsyms.js
async function Rn(e) {
	let t = {
		labelIdx2Name: ["one"],
		varIdx2Name: ["one"],
		componentIdx2Name: []
	}, n = await Mt(e), r = await n.read(n.totalSize), i = new TextDecoder("utf-8").decode(r).split("\n");
	for (let e = 0; e < i.length; e++) {
		let n = i[e].split(",");
		n.length == 4 && (t.varIdx2Name[n[1]] ? t.varIdx2Name[n[1]] += "|" + n[3] : t.varIdx2Name[n[1]] = n[3], t.labelIdx2Name[n[0]] = n[3], t.componentIdx2Name[n[2]] || (t.componentIdx2Name[n[2]] = a(n[3])));
	}
	return await n.close(), t;
	function a(e) {
		let t = e.split(".");
		return t.pop(), t.join(".");
	}
}
//#endregion
//#region src/wtns_debug.js
var { unstringifyBigInts: zn } = p;
async function Bn(t, n, r, i, a, o) {
	let s = zn(t), c = await Mt(n), l = await c.read(c.totalSize);
	await c.close();
	let u = {
		...a,
		sanityCheck: !0
	}, d = await Rn(i);
	a.set && (d ||= await Rn(i), u.logSetSignal = function(e, t) {
		o && o.info("SET " + d.labelIdx2Name[e] + " <-- " + t.toString());
	}), a.get && (d ||= await Rn(i), u.logGetSignal = function(e, t) {
		o && o.info("GET " + d.labelIdx2Name[e] + " --> " + t.toString());
	}), a.trigger && (d ||= await Rn(i), u.logStartComponent = function(e) {
		o && o.info("START: " + d.componentIdx2Name[e]);
	}, u.logFinishComponent = function(e) {
		o && o.info("FINISH: " + d.componentIdx2Name[e]);
	}), u.sym = d;
	let f = await Lt(l, u), p = await f.calculateWitness(s, !0), m = await e.createBinFile(r, "wtns", 2, 2);
	await et(m, p, f.prime), await m.close();
}
//#endregion
//#region src/wtns_export_json.js
async function Vn(e) {
	return await rt(e);
}
//#endregion
//#region src/wtns_check.js
async function Hn(t, n, r) {
	r && r.info("WITNESS CHECKING STARTED"), r && r.info("> Reading r1cs file");
	let { fd: i, sections: a } = await e.readBinFile(t, "r1cs", 1, 1 << 22, 1 << 24), o = await h(i, a, {
		loadConstraints: !1,
		loadCustomGates: !1
	});
	r && r.info("> Reading witness file");
	let { fd: s, sections: c } = await e.readBinFile(n, "wtns", 2, 1 << 22, 1 << 24), l = await nt(s, c);
	if (!u.eq(o.prime, l.q)) throw Error("Curve of the witness does not match the curve of the proving key");
	let d = await e.readSection(s, c, 2);
	await s.close();
	let f = (await w(o.prime)).Fr, p = f.n8, m = await e.readSection(i, a, 2);
	r && (r.info("----------------------------"), r.info("  WITNESS CHECK"), r.info(`  Curve:          ${o.curve.name}`), r.info(`  Vars (wires):   ${o.nVars}`), r.info(`  Outputs:        ${o.nOutputs}`), r.info(`  Public Inputs:  ${o.nPubInputs}`), r.info(`  Private Inputs: ${o.nPrvInputs}`), r.info(`  Labels:         ${o.nLabels}`), r.info(`  Constraints:    ${o.nConstraints}`), r.info(`  Custom Gates:   ${o.useCustomGates}`), r.info("----------------------------")), r && r.info("> Checking witness correctness");
	let g = 0, _ = !0;
	for (let e = 0; e < o.nConstraints; e++) {
		r && e !== 0 && e % 5e5 == 0 && r.info(`··· processing r1cs constraints ${e}/${o.nConstraints}`);
		let t = y(), n = y(), i = y(), a = v(t), s = v(n), c = v(i);
		if (!f.eq(f.sub(f.mul(a, s), c), f.zero)) {
			r.warn("··· aborting checking process at constraint " + e), _ = !1;
			break;
		}
	}
	return i.close(), r && (_ ? (r.info("WITNESS IS CORRECT"), r.info("WITNESS CHECKING FINISHED SUCCESSFULLY")) : (r.warn("WITNESS IS NOT CORRECT"), r.warn("WITNESS CHECKING FINISHED UNSUCCESSFULLY"))), _;
	function v(e) {
		let t = f.zero;
		return Object.keys(e).forEach((n) => {
			let r = b(n), i = e[n];
			t = f.add(t, f.mul(r, i));
		}), t;
	}
	function y() {
		let e = {}, t = m.slice(g, g + 4);
		g += 4;
		let n = new DataView(t.buffer).getUint32(0, !0), r = m.slice(g, g + (4 + o.n8) * n);
		g += (4 + o.n8) * n;
		let i = new DataView(r.buffer);
		for (let t = 0; t < n; t++) {
			let n = i.getUint32(t * (4 + o.n8), !0);
			e[n] = o.F.fromRprLE(r, t * (4 + o.n8) + 4);
		}
		return e;
	}
	function b(e) {
		return f.fromRprLE(d.slice(e * p, e * p + p));
	}
}
//#endregion
//#region src/wtns.js
var Un = /* @__PURE__ */ v({
	calculate: () => Vt,
	check: () => Hn,
	debug: () => Bn,
	exportJson: () => Vn
}), Wn = 262144, Gn = {
	get: function(e, t) {
		return isNaN(t) ? e[t] : e.getElement(t);
	},
	set: function(e, t, n) {
		return isNaN(t) ? (e[t] = n, !0) : e.setElement(t, n);
	}
}, Kn = class {
	constructor(e) {
		this.length = e || 0, this.arr = Array(Wn);
		for (let t = 0; t < e; t += Wn) this.arr[t / Wn] = Array(Math.min(Wn, e - t));
		return this;
	}
	push() {
		for (let e = 0; e < arguments.length; e++) this.setElement(this.length, arguments[e]);
	}
	slice(e, t) {
		let n = Array(t - e);
		for (let r = e; r < t; r++) n[r - e] = this.getElement(r);
		return n;
	}
	getElement(e) {
		e = parseInt(e);
		let t = Math.floor(e / Wn), n = e % Wn;
		return this.arr[t] ? this.arr[t][n] : void 0;
	}
	setElement(e, t) {
		e = parseInt(e);
		let n = Math.floor(e / Wn);
		this.arr[n] || (this.arr[n] = Array(Wn));
		let r = e % Wn;
		return this.arr[n][r] = t, e >= this.length && (this.length = e + 1), !0;
	}
	getKeys() {
		let e = new qn();
		for (let t = 0; t < this.arr.length; t++) if (this.arr[t]) for (let n = 0; n < this.arr[t].length; n++) this.arr[t][n] !== void 0 && e.push(t * Wn + n);
		return e;
	}
}, qn = class {
	constructor(e) {
		let t = new Kn(e);
		return new Proxy(t, Gn);
	}
};
//#endregion
//#region src/zkey_new.js
async function Jn(e, c, l, d) {
	let f = G.create({ dkLen: 64 }), { fd: p, sections: m } = await r(c, "ptau", 1, 1 << 22, 1 << 24), { curve: h, power: _ } = await an(p, m), { fd: v, sections: y } = await r(e, "r1cs", 1, 1 << 22, 1 << 24), b = await g(v, y, !1), x = await t(l, "zkey", 1, 10, 1 << 22, 1 << 24), S = h.G1.F.n8 * 2, C = h.G2.F.n8 * 2;
	if (b.prime != h.r) return d && d.error("r1cs curve does not match powers of tau ceremony curve"), -1;
	let w = Ce(b.nConstraints + b.nPubInputs + b.nOutputs + 1 - 1) + 1;
	if (w > _) return d && d.error(`circuit too big for this power of tau ceremony. ${b.nConstraints}*2 > 2**${_}`), -1;
	if (!m[12]) return d && d.error("Powers of tau is not prepared."), -1;
	let T = b.nOutputs + b.nPubInputs, E = 2 ** w;
	await a(x, 1), await x.writeULE32(1), await n(x), await a(x, 2);
	let D = h.q, O = (Math.floor((u.bitLength(D) - 1) / 64) + 1) * 8, k = h.r, A = (Math.floor((u.bitLength(k) - 1) / 64) + 1) * 8, j = u.mod(u.shl(1, A * 8), k), M = h.Fr.e(u.mod(u.mul(j, j), k));
	await x.writeULE32(O), await o(x, D, O), await x.writeULE32(A), await o(x, k, A), await x.writeULE32(b.nVars), await x.writeULE32(T), await x.writeULE32(E);
	let N;
	N = await p.read(S, m[4][0].p), await x.write(N), N = await h.G1.batchLEMtoU(N), f.update(N);
	let P;
	P = await p.read(S, m[5][0].p), await x.write(P), P = await h.G1.batchLEMtoU(P), f.update(P);
	let F;
	F = await p.read(C, m[6][0].p), await x.write(F), F = await h.G2.batchLEMtoU(F), f.update(F);
	let I = new Uint8Array(S);
	h.G1.toRprLEM(I, 0, h.G1.g);
	let ee = new Uint8Array(C);
	h.G2.toRprLEM(ee, 0, h.G2.g);
	let L = new Uint8Array(S);
	h.G1.toRprUncompressed(L, 0, h.G1.g);
	let R = new Uint8Array(C);
	h.G2.toRprUncompressed(R, 0, h.G2.g), await x.write(ee), await x.write(I), await x.write(ee), f.update(R), f.update(L), f.update(R), await n(x), d && d.info(W()), d && d.info("Reading r1cs");
	let z = await i(v, y, 2);
	await v.close();
	let B = new qn(b.nVars), te = new qn(b.nVars), ne = new qn(b.nVars), V = new qn(b.nVars - T - 1), H = Array(T + 1);
	d && d.info(W()), d && d.info("Reading tauG1");
	let re = await i(p, m, 12, (E - 1) * S, E * S);
	d && d.info("Reading tauG2");
	let ie = await i(p, m, 13, (E - 1) * C, E * C);
	d && d.info("Reading alphatauG1");
	let ae = await i(p, m, 14, (E - 1) * S, E * S);
	d && d.info("Reading betatauG1");
	let oe = await i(p, m, 15, (E - 1) * S, E * S);
	d && d.info(W()), d && d.info("processConstraints"), await le(), d && d.info(W()), d && d.info("composeAndWritePoints"), await ue(3, "G1", H, "IC"), H = null, d && d.info(W()), d && d.info("writeHs"), await ce(), d && d.info(W()), d && d.info("hashHPoints"), await fe(), d && d.info(W()), d && d.info("composeAndWritePoints 8 G1 C"), await ue(8, "G1", V, "C"), V = null, d && d.info(W()), d && d.info("composeAndWritePoints 5 G1 A"), await ue(5, "G1", B, "A"), B = null, d && d.info(W()), d && d.info("composeAndWritePoints 6 G1 B1"), await ue(6, "G1", te, "B1"), te = null, d && d.info(W()), d && d.info("composeAndWritePoints 7 G2 B2"), await ue(7, "G2", ne, "B2"), ne = null, d && d.info(W()), d && d.info("Contributions section");
	let se = f.digest();
	return await a(x, 10), await x.write(se), await x.writeULE32(0), await n(x), d && d.info(K(se, "Circuit hash: ")), await x.close(), await p.close(), se;
	async function ce() {
		await a(x, 9);
		let e = new s(E * S);
		if (w < h.Fr.s) {
			let t = await i(p, m, 12, (E * 2 - 1) * S, E * 2 * S);
			for (let n = 0; n < E; n++) {
				d && n % 1e4 == 0 && d.debug(`splitting buffer: ${n}/${E}`);
				let r = t.slice((n * 2 + 1) * S, (n * 2 + 1) * S + S);
				e.set(r, n * S);
			}
		} else if (w == h.Fr.s) {
			let t = m[12][0].p + (2 ** (w + 1) - 1) * S;
			await p.readToBuffer(e, 0, E * S, t + E * S);
		} else throw d && d.error("Circuit too big"), Error("Circuit too big for this curve");
		await x.write(e), await n(x);
	}
	async function le() {
		let e = new Uint8Array(12 + h.Fr.n8), t = new DataView(e.buffer), r = new Uint8Array(h.Fr.n8);
		h.Fr.toRprLE(r, 0, h.Fr.e(1));
		let i = 0;
		function o() {
			let e = z.slice(i, i + 4);
			return i += 4, new DataView(e.buffer).getUint32(0, !0);
		}
		let c = new qn();
		for (let e = 0; e < b.nConstraints; e++) {
			d && e % 1e4 == 0 && d.debug(`processing constraints: ${e}/${b.nConstraints}`);
			let t = o();
			for (let n = 0; n < t; n++) {
				let t = o(), n = i;
				i += h.Fr.n8;
				let r = S * e, a = S * e;
				B[t] === void 0 && (B[t] = []), B[t].push([
					0,
					r,
					n
				]), t <= T ? (H[t] === void 0 && (H[t] = []), H[t].push([
					3,
					a,
					n
				])) : (V[t - T - 1] === void 0 && (V[t - T - 1] = []), V[t - T - 1].push([
					3,
					a,
					n
				])), c.push([
					0,
					e,
					t,
					n
				]);
			}
			let n = o();
			for (let t = 0; t < n; t++) {
				let t = o(), n = i;
				i += h.Fr.n8;
				let r = S * e, a = C * e, s = S * e;
				te[t] === void 0 && (te[t] = []), te[t].push([
					0,
					r,
					n
				]), ne[t] === void 0 && (ne[t] = []), ne[t].push([
					1,
					a,
					n
				]), t <= T ? (H[t] === void 0 && (H[t] = []), H[t].push([
					2,
					s,
					n
				])) : (V[t - T - 1] === void 0 && (V[t - T - 1] = []), V[t - T - 1].push([
					2,
					s,
					n
				])), c.push([
					1,
					e,
					t,
					n
				]);
			}
			let r = o();
			for (let t = 0; t < r; t++) {
				let t = o(), n = i;
				i += h.Fr.n8;
				let r = S * e;
				t <= T ? (H[t] === void 0 && (H[t] = []), H[t].push([
					0,
					r,
					n
				])) : (V[t - T - 1] === void 0 && (V[t - T - 1] = []), V[t - T - 1].push([
					0,
					r,
					n
				]));
			}
		}
		for (let e = 0; e <= T; e++) {
			let t = S * (b.nConstraints + e), n = S * (b.nConstraints + e);
			B[e] === void 0 && (B[e] = []), B[e].push([
				0,
				t,
				-1
			]), H[e] === void 0 && (H[e] = []), H[e].push([
				3,
				n,
				-1
			]), c.push([
				0,
				b.nConstraints + e,
				e,
				-1
			]);
		}
		await a(x, 4);
		let l = new s(c.length * (12 + h.Fr.n8) + 4), u = /* @__PURE__ */ new Uint8Array(4);
		new DataView(u.buffer).setUint32(0, c.length, !0), l.set(u);
		let f = 4;
		for (let e = 0; e < c.length; e++) d && e % 1e5 == 0 && d.debug(`writing coeffs: ${e}/${c.length}`), p(c[e]);
		await x.write(l), await n(x);
		function p(n) {
			t.setUint32(0, n[0], !0), t.setUint32(4, n[1], !0), t.setUint32(8, n[2], !0);
			let i;
			i = n[3] >= 0 ? h.Fr.fromRprLE(z.slice(n[3], n[3] + h.Fr.n8), 0) : h.Fr.fromRprLE(r, 0);
			let a = h.Fr.mul(i, M);
			h.Fr.toRprLE(e, 12, a), l.set(e, f), f += e.length;
		}
	}
	async function ue(e, t, r, i) {
		let o = 32768, s = h[t];
		U(r.length), await a(x, e);
		let c = [], l = 0;
		for (; l < r.length;) {
			let e = 0;
			for (; l < r.length && e < h.tm.concurrency;) {
				d && d.debug(`Writing points start ${i}: ${l}/${r.length}`);
				let n = 1, a = r[l] ? r[l].length : 0;
				for (; l + n < r.length && a + (r[l + n] ? r[l + n].length : 0) < o && n < o;) a += r[l + n] ? r[l + n].length : 0, n++;
				d && d.info("before slice:"), d && d.info(W());
				let s = r.slice(l, l + n);
				d && d.info("after slice:"), d && d.info(W());
				let u = l;
				c.push(de(t, s, d, i).then((e) => (d && d.debug(`Writing points end ${i}: ${u}/${r.length}`), e))), l += n, e++;
			}
			let n = await Promise.all(c);
			for (let e = 0; e < n.length; e++) {
				await x.write(n[e][0]);
				let t = await s.batchLEMtoU(n[e][0]);
				f.update(t);
			}
			c = [];
		}
		await n(x);
	}
	async function de(e, t, n, r) {
		let i = h[e], a = i.F.n8 * 2, o = i.F.n8 * 3, c = i.F.n8 * 2, l, u, d, f;
		if (e == "G1") l = "g1m_timesScalarAffine", u = "g1m_multiexpAffine", d = "g1m_batchToAffine", f = "g1m_zero";
		else if (e == "G2") l = "g2m_timesScalarAffine", u = "g2m_multiexpAffine", d = "g2m_batchToAffine", f = "g2m_zero";
		else throw Error("Invalid group");
		let p = 0;
		for (let e = 0; e < t.length; e++) p += t[e] ? t[e].length : 0;
		let m, g;
		p > 32768 ? (m = new s(p * a), g = new s(p * h.Fr.n8)) : (m = new Uint8Array(p * a), g = new Uint8Array(p * h.Fr.n8));
		let _ = 0, v = 0, y = [
			re,
			ie,
			ae,
			oe
		], b = new Uint8Array(h.Fr.n8);
		h.Fr.toRprLE(b, 0, h.Fr.e(1));
		let x = 0;
		for (let e = 0; e < t.length; e++) if (t[e]) for (let i = 0; i < t[e].length; i++) n && i && i % 1e4 == 0 && n.debug(`Configuring big array ${r}: ${i}/${t[e].length}`), m.set(y[t[e][i][0]].slice(t[e][i][1], t[e][i][1] + a), x * a), t[e][i][2] >= 0 ? g.set(z.slice(t[e][i][2], t[e][i][2] + h.Fr.n8), x * h.Fr.n8) : g.set(b, x * h.Fr.n8), x++;
		if (t.length > 1) {
			let e = [];
			e.push({
				cmd: "ALLOCSET",
				var: 0,
				buff: m
			}), e.push({
				cmd: "ALLOCSET",
				var: 1,
				buff: g
			}), e.push({
				cmd: "ALLOC",
				var: 2,
				len: t.length * o
			}), _ = 0, v = 0;
			let n = 0;
			for (let r = 0; r < t.length; r++) {
				if (!t[r]) {
					e.push({
						cmd: "CALL",
						fnName: f,
						params: [{
							var: 2,
							offset: n
						}]
					}), n += o;
					continue;
				}
				t[r].length == 1 ? e.push({
					cmd: "CALL",
					fnName: l,
					params: [
						{
							var: 0,
							offset: _
						},
						{
							var: 1,
							offset: v
						},
						{ val: h.Fr.n8 },
						{
							var: 2,
							offset: n
						}
					]
				}) : e.push({
					cmd: "CALL",
					fnName: u,
					params: [
						{
							var: 0,
							offset: _
						},
						{
							var: 1,
							offset: v
						},
						{ val: h.Fr.n8 },
						{ val: t[r].length },
						{
							var: 2,
							offset: n
						}
					]
				}), _ += a * t[r].length, v += h.Fr.n8 * t[r].length, n += o;
			}
			return e.push({
				cmd: "CALL",
				fnName: d,
				params: [
					{ var: 2 },
					{ val: t.length },
					{ var: 2 }
				]
			}), e.push({
				cmd: "GET",
				out: 0,
				var: 2,
				len: t.length * c
			}), await h.tm.queueAction(e);
		} else {
			let e = await i.multiExpAffine(m, g, n, r);
			return e = [i.toAffine(e)], e;
		}
	}
	async function fe() {
		let e = 16384;
		U(E - 1);
		for (let t = 0; t < E - 1; t += e) {
			d && d.debug(`HashingHPoints: ${t}/${E}`);
			let n = Math.min(E - 1, e);
			await pe(t, n);
		}
	}
	async function pe(e, t) {
		let n = await p.read(t * S, m[2][0].p + (e + E) * S), r = await p.read(t * S, m[2][0].p + e * S), i = h.tm.concurrency, a = Math.floor(t / i), o = [];
		for (let e = 0; e < i; e++) {
			let s;
			if (s = e < i - 1 ? a : t - e * a, s == 0) continue;
			let c = n.slice(e * a * S, (e * a + s) * S), l = r.slice(e * a * S, (e * a + s) * S);
			o.push(me(c, l));
		}
		let s = await Promise.all(o);
		for (let e = 0; e < s.length; e++) f.update(s[e][0]);
	}
	async function me(e, t) {
		let n = e.byteLength / S, r = h.G1.F.n8 * 3, i = [];
		i.push({
			cmd: "ALLOCSET",
			var: 0,
			buff: e
		}), i.push({
			cmd: "ALLOCSET",
			var: 1,
			buff: t
		}), i.push({
			cmd: "ALLOC",
			var: 2,
			len: n * r
		});
		for (let e = 0; e < n; e++) i.push({
			cmd: "CALL",
			fnName: "g1m_subAffine",
			params: [
				{
					var: 0,
					offset: e * S
				},
				{
					var: 1,
					offset: e * S
				},
				{
					var: 2,
					offset: e * r
				}
			]
		});
		return i.push({
			cmd: "CALL",
			fnName: "g1m_batchToAffine",
			params: [
				{ var: 2 },
				{ val: n },
				{ var: 2 }
			]
		}), i.push({
			cmd: "CALL",
			fnName: "g1m_batchLEMtoU",
			params: [
				{ var: 2 },
				{ val: n },
				{ var: 2 }
			]
		}), i.push({
			cmd: "GET",
			out: 0,
			var: 2,
			len: n * S
		}), await h.tm.queueAction(i);
	}
	function U(e) {
		let t = /* @__PURE__ */ new Uint8Array(4);
		new DataView(t.buffer, t.byteOffset, t.byteLength).setUint32(0, e, !1), f.update(t);
	}
	function W() {
		let e = process.memoryUsage();
		for (let t in e) e[t] = Math.round(e[t] / (1024 * 1024));
		return e;
	}
}
//#endregion
//#region src/zkey_export_bellman.js
async function Yn(t, n, r) {
	let { fd: i, sections: a } = await e.readBinFile(t, "zkey", 2), o = await He(i, a);
	if (o.protocol != "groth16") throw Error("zkey file is not groth16");
	let s = await T(o.q), c = s.G1.F.n8 * 2, l = s.G2.F.n8 * 2, u = await Je(i, s, a), d = await jt(n);
	await y(o.vk_alpha_1), await y(o.vk_beta_1), await b(o.vk_beta_2), await b(o.vk_gamma_2), await y(o.vk_delta_1), await b(o.vk_delta_2);
	let f;
	f = await e.readSection(i, a, 3), f = await s.G1.batchLEMtoU(f), await x("G1", f);
	let p = await e.readSection(i, a, 9), m;
	m = await s.G1.fft(p, "affine", "jacobian", r), m = await s.G1.batchApplyKey(m, s.Fr.neg(s.Fr.e(2)), s.Fr.w[o.power + 1], "jacobian", "affine", r), m = m.slice(0, m.byteLength - c), m = await s.G1.batchLEMtoU(m), await x("G1", m);
	let h;
	h = await e.readSection(i, a, 8), h = await s.G1.batchLEMtoU(h), await x("G1", h);
	let g;
	g = await e.readSection(i, a, 5), g = await s.G1.batchLEMtoU(g), await x("G1", g);
	let _;
	_ = await e.readSection(i, a, 6), _ = await s.G1.batchLEMtoU(_), await x("G1", _);
	let v;
	v = await e.readSection(i, a, 7), v = await s.G2.batchLEMtoU(v), await x("G2", v), await d.write(u.csHash), await S(u.contributions.length);
	for (let e = 0; e < u.contributions.length; e++) {
		let t = u.contributions[e];
		await y(t.deltaAfter), await y(t.delta.g1_s), await y(t.delta.g1_sx), await b(t.delta.g2_spx), await d.write(t.transcript);
	}
	await i.close(), await d.close();
	async function y(e) {
		let t = new Uint8Array(c);
		s.G1.toRprUncompressed(t, 0, e), await d.write(t);
	}
	async function b(e) {
		let t = new Uint8Array(l);
		s.G2.toRprUncompressed(t, 0, e), await d.write(t);
	}
	async function x(e, t) {
		let n;
		n = e == "G1" ? c : l;
		let r = /* @__PURE__ */ new Uint8Array(4);
		new DataView(r.buffer, r.byteOffset, r.byteLength).setUint32(0, t.byteLength / n, !1), await d.write(r), await d.write(t);
	}
	async function S(e) {
		let t = /* @__PURE__ */ new Uint8Array(4);
		new DataView(t.buffer, t.byteOffset, t.byteLength).setUint32(0, e, !1), await d.write(t);
	}
}
//#endregion
//#region src/zkey_import_bellman.js
async function Xn(t, n, r, i, a) {
	let { fd: o, sections: s } = await e.readBinFile(t, "zkey", 2), c = await He(o, s, !1);
	if (c.protocol != "groth16") throw Error("zkey file is not groth16");
	let l = await T(c.q), u = l.G1.F.n8 * 2, d = l.G2.F.n8 * 2, f = await Je(o, l, s), p = {}, m = await Mt(n);
	m.pos = u * 3 + d * 3 + 8 + u * c.nVars + 4 + u * (c.domainSize - 1) + 4 + u * c.nVars + 4 + u * c.nVars + 4 + d * c.nVars, p.csHash = await m.read(64);
	let h = await m.readUBE32();
	p.contributions = [];
	for (let e = 0; e < h; e++) {
		let t = { delta: {} };
		t.deltaAfter = await C(m), t.delta.g1_s = await C(m), t.delta.g1_sx = await C(m), t.delta.g2_spx = await w(m), t.transcript = await m.read(64), e < f.contributions.length && (t.type = f.contributions[e].type, t.type == 1 && (t.beaconHash = f.contributions[e].beaconHash, t.numIterationsExp = f.contributions[e].numIterationsExp), f.contributions[e].name && (t.name = f.contributions[e].name)), p.contributions.push(t);
	}
	if (!we(p.csHash, f.csHash)) return a && a.error("Hash of the original circuit does not match with the MPC one"), !1;
	if (f.contributions.length > p.contributions.length) return a && a.error("The impoerted file does not include new contributions"), !1;
	for (let e = 0; e < f.contributions.length; e++) if (!E(f.contributions[e], p.contributions[e])) return a && a.error(`Previous contribution ${e} does not match`), !1;
	if (i) for (let e = f.contributions.length; e < p.contributions.length; e++) p.contributions[e].name = i;
	let g = await e.createBinFile(r, "zkey", 1, 10);
	if (m.pos = 0, m.pos += u, m.pos += u, m.pos += d, m.pos += d, c.vk_delta_1 = await C(m), c.vk_delta_2 = await w(m), await Re(g, c), await m.readUBE32() != c.nPublic + 1) return a && a.error("Invalid number of points in IC"), await g.discard(), !1;
	if (m.pos += u * (c.nPublic + 1), await e.copySection(o, s, g, 3), await e.copySection(o, s, g, 4), await m.readUBE32() != c.domainSize - 1) return a && a.error("Invalid number of points in H"), await g.discard(), !1;
	let _, v = await m.read(u * (c.domainSize - 1)), y = await l.G1.batchUtoLEM(v);
	_ = new Uint8Array(c.domainSize * u), _.set(y), l.G1.toRprLEM(_, u * (c.domainSize - 1), l.G1.zeroAffine);
	let b = l.Fr.neg(l.Fr.inv(l.Fr.e(2))), x = l.Fr.inv(l.Fr.w[c.power + 1]);
	if (_ = await l.G1.batchApplyKey(_, b, x, "affine", "jacobian", a), _ = await l.G1.ifft(_, "jacobian", "affine", a), await e.startWriteSection(g, 9), await g.write(_), await e.endWriteSection(g), await m.readUBE32() != c.nVars - c.nPublic - 1) return a && a.error("Invalid number of points in L"), await g.discard(), !1;
	let S;
	if (S = await m.read(u * (c.nVars - c.nPublic - 1)), S = await l.G1.batchUtoLEM(S), await e.startWriteSection(g, 8), await g.write(S), await e.endWriteSection(g), await m.readUBE32() != c.nVars) return a && a.error("Invalid number of points in A"), await g.discard(), !1;
	if (m.pos += u * c.nVars, await e.copySection(o, s, g, 5), await m.readUBE32() != c.nVars) return a && a.error("Invalid number of points in B1"), await g.discard(), !1;
	if (m.pos += u * c.nVars, await e.copySection(o, s, g, 6), await m.readUBE32() != c.nVars) return a && a.error("Invalid number of points in B2"), await g.discard(), !1;
	return m.pos += d * c.nVars, await e.copySection(o, s, g, 7), await Xe(g, l, p), await m.close(), await g.close(), await o.close(), !0;
	async function C(e) {
		let t = await e.read(l.G1.F.n8 * 2);
		return l.G1.fromRprUncompressed(t, 0);
	}
	async function w(e) {
		let t = await e.read(l.G2.F.n8 * 2);
		return l.G2.fromRprUncompressed(t, 0);
	}
	function E(e, t) {
		return !(!l.G1.eq(e.deltaAfter, t.deltaAfter) || !l.G1.eq(e.delta.g1_s, t.delta.g1_s) || !l.G1.eq(e.delta.g1_sx, t.delta.g1_sx) || !l.G2.eq(e.delta.g2_spx, t.delta.g2_spx) || !we(e.transcript, t.transcript));
	}
}
//#endregion
//#region src/zkey_verify_frominit.js
var Zn = Oe;
async function Qn(t, n, r, i) {
	let a, { fd: o, sections: l } = await e.readBinFile(r, "zkey", 2), d = await He(o, l, !1);
	if (d.protocol != "groth16") throw Error("zkey file is not groth16");
	let f = await T(d.q), p = f.G1.F.n8 * 2, m = await Je(o, f, l), h = G.create({ dkLen: 64 });
	h.update(m.csHash);
	let g = f.G1.g;
	for (let e = 0; e < m.contributions.length; e++) {
		let t = m.contributions[e], n = Te(h);
		if (Ze(n, f, t.delta.g1_s), Ze(n, f, t.delta.g1_sx), !we(n.digest(), t.transcript)) return console.log(`INVALID(${e}): Inconsistent transcript `), !1;
		let r = $t(f, t.transcript);
		if (a = await Zn(f, t.delta.g1_s, t.delta.g1_sx, r, t.delta.g2_spx), a !== !0) return console.log(`INVALID(${e}): public key G1 and G2 do not have the same ration `), !1;
		if (a = await Zn(f, g, t.deltaAfter, r, t.delta.g2_spx), a !== !0) return console.log(`INVALID(${e}): deltaAfter does not fillow the public key `), !1;
		if (t.type == 1) {
			let n = await Pe(t.beaconHash, t.numIterationsExp), r = f.Fr.fromRng(n), i = f.G1.toAffine(f.G1.fromRng(n)), a = f.G1.toAffine(f.G1.timesFr(i, r));
			if (f.G1.eq(i, t.delta.g1_s) !== !0) return console.log(`INVALID(${e}): Key of the beacon does not match. g1_s `), !1;
			if (f.G1.eq(a, t.delta.g1_sx) !== !0) return console.log(`INVALID(${e}): Key of the beacon does not match. g1_sx `), !1;
		}
		$e(h, f, t);
		let i = G.create({ dkLen: 64 });
		$e(i, f, t), t.contributionHash = i.digest(), g = t.deltaAfter;
	}
	let { fd: _, sections: v } = await e.readBinFile(t, "zkey", 2), y = await He(_, v, !1);
	if (y.protocol != "groth16") throw Error("zkeyinit file is not groth16");
	if (!u.eq(y.q, d.q) || !u.eq(y.r, d.r) || y.n8q != d.n8q || y.n8r != d.n8r) return i && i.error("INVALID:  Different curves"), !1;
	if (y.nVars != d.nVars || y.nPublic != d.nPublic || y.domainSize != d.domainSize) return i && i.error("INVALID:  Different circuit parameters"), !1;
	if (!f.G1.eq(d.vk_alpha_1, y.vk_alpha_1)) return i && i.error("INVALID:  Invalid alpha1"), !1;
	if (!f.G1.eq(d.vk_beta_1, y.vk_beta_1)) return i && i.error("INVALID:  Invalid beta1"), !1;
	if (!f.G2.eq(d.vk_beta_2, y.vk_beta_2)) return i && i.error("INVALID:  Invalid beta2"), !1;
	if (!f.G2.eq(d.vk_gamma_2, y.vk_gamma_2)) return i && i.error("INVALID:  Invalid gamma2"), !1;
	if (!f.G1.eq(d.vk_delta_1, g)) return i && i.error("INVALID:  Invalid delta1"), !1;
	if (a = await Zn(f, f.G1.g, g, f.G2.g, d.vk_delta_2), a !== !0) return i && i.error("INVALID:  Invalid delta2"), !1;
	let b = await Je(_, f, v);
	if (!we(m.csHash, b.csHash)) return i && i.error("INVALID:  Circuit does not match"), !1;
	if (l[8][0].size != p * (d.nVars - d.nPublic - 1)) return i && i.error("INVALID:  Invalid L section size"), !1;
	if (l[9][0].size != p * d.domainSize) return i && i.error("INVALID:  Invalid H section size"), !1;
	let x;
	if (x = await e.sectionIsEqual(o, l, _, v, 3), !x) return i && i.error("INVALID:  IC section is not identical"), !1;
	if (x = await e.sectionIsEqual(o, l, _, v, 4), !x) return i && i.error("Coeffs section is not identical"), !1;
	if (x = await e.sectionIsEqual(o, l, _, v, 5), !x) return i && i.error("A section is not identical"), !1;
	if (x = await e.sectionIsEqual(o, l, _, v, 6), !x) return i && i.error("B1 section is not identical"), !1;
	if (x = await e.sectionIsEqual(o, l, _, v, 7), !x) return i && i.error("B2 section is not identical"), !1;
	if (a = await S("G1", _, v, o, l, 8, d.vk_delta_2, y.vk_delta_2, "L section"), a !== !0) return i && i.error("L section does not match"), !1;
	if (a = await C(), a !== !0) return i && i.error("H section does not match"), !1;
	i && i.info(K(m.csHash, "Circuit Hash: ")), await o.close(), await _.close();
	for (let e = m.contributions.length - 1; e >= 0; e--) {
		let t = m.contributions[e];
		i && i.info("-------------------------"), i && i.info(K(t.contributionHash, `contribution #${e + 1} ${t.name ? t.name : ""}:`)), t.type == 1 && (i && i.info(`Beacon generator: ${Ie(t.beaconHash)}`), i && i.info(`Beacon iterations Exp: ${t.numIterationsExp}`));
	}
	return i && i.info("-------------------------"), i && i.info("ZKey Ok!"), !0;
	async function S(t, n, r, o, s, c, l, u, d) {
		let p = 1 << 20, m = f[t], h = m.F.n8 * 2;
		await e.startReadUniqueSection(n, r, c), await e.startReadUniqueSection(o, s, c);
		let g = m.zero, _ = m.zero, v = r[c][0].size / h;
		for (let e = 0; e < v; e += p) {
			i && i.debug(`Same ratio check ${d}:  ${e}/${v}`);
			let t = Math.min(v - e, p), r = await n.read(t * h), a = await o.read(t * h), s = Ae(4 * t), c = await m.multiExpAffine(r, s), l = await m.multiExpAffine(a, s);
			g = m.add(g, c), _ = m.add(_, l);
		}
		return await e.endReadSection(n), await e.endReadSection(o), v == 0 ? !0 : (a = await Zn(f, g, _, l, u), a === !0);
	}
	async function C() {
		let t = 1 << 20, r = f.G1, u = f.Fr, p = r.F.n8 * 2, { fd: m, sections: h } = await e.readBinFile(n, "ptau", 1), g = new s(d.domainSize * d.n8r), _ = Array(8);
		for (let e = 0; e < 8; e++) _[e] = Me(Ae(4), 0);
		let v = new c(_);
		for (let e = 0; e < d.domainSize - 1; e++) {
			let t = u.fromRng(v);
			u.toRprLE(g, e * d.n8r, t);
		}
		u.toRprLE(g, (d.domainSize - 1) * d.n8r, u.zero);
		let b = r.zero;
		for (let e = 0; e < d.domainSize; e += t) {
			i && i.debug(`H Verification(tau):  ${e}/${d.domainSize}`);
			let n = Math.min(d.domainSize - e, t), a = await w(await m.read(p * n, h[2][0].p + d.domainSize * p + e * p), await m.read(p * n, h[2][0].p + e * p)), o = g.slice(e * d.n8r, (e + n) * d.n8r), s = await r.multiExpAffine(a, o);
			b = r.add(b, s);
		}
		g = await u.batchToMontgomery(g);
		let x;
		if (d.power < u.s) x = u.neg(u.e(2));
		else {
			let e = 2 ** u.s, t = u.exp(u.shift, e);
			x = u.sub(t, u.one);
		}
		let S = d.power < u.s ? u.w[d.power + 1] : u.shift;
		g = await u.batchApplyKey(g, x, S), g = await u.fft(g), g = await u.batchFromMontgomery(g), await e.startReadUniqueSection(o, l, 9);
		let C = r.zero;
		for (let e = 0; e < d.domainSize; e += t) {
			i && i.debug(`H Verification(lagrange):  ${e}/${d.domainSize}`);
			let n = Math.min(d.domainSize - e, t), a = await o.read(p * n), s = g.slice(e * d.n8r, (e + n) * d.n8r), c = await r.multiExpAffine(a, s);
			C = r.add(C, c);
		}
		return await e.endReadSection(o), a = await Zn(f, b, C, d.vk_delta_2, y.vk_delta_2), a === !0;
	}
	async function w(e, t) {
		let n = f.G1.F.n8 * 2, r = e.byteLength / n, i = f.tm.concurrency, a = Math.floor(r / i), o = [];
		for (let n = 0; n < i; n++) {
			let s;
			if (s = n < i - 1 ? a : r - n * a, s == 0) continue;
			let c = e.slice(n * a * p, (n * a + s) * p), l = t.slice(n * a * p, (n * a + s) * p);
			o.push(E(c, l));
		}
		let s = await Promise.all(o), c = new Uint8Array(r * n), l = 0;
		for (let e = 0; e < s.length; e++) c.set(s[e][0], l), l += s[e][0].byteLength;
		return c;
	}
	async function E(e, t) {
		let n = f.G1.F.n8 * 2, r = f.G1.F.n8 * 3, i = e.byteLength / n, a = [];
		a.push({
			cmd: "ALLOCSET",
			var: 0,
			buff: e
		}), a.push({
			cmd: "ALLOCSET",
			var: 1,
			buff: t
		}), a.push({
			cmd: "ALLOC",
			var: 2,
			len: i * r
		});
		for (let e = 0; e < i; e++) a.push({
			cmd: "CALL",
			fnName: "g1m_subAffine",
			params: [
				{
					var: 0,
					offset: e * n
				},
				{
					var: 1,
					offset: e * n
				},
				{
					var: 2,
					offset: e * r
				}
			]
		});
		return a.push({
			cmd: "CALL",
			fnName: "g1m_batchToAffine",
			params: [
				{ var: 2 },
				{ val: i },
				{ var: 2 }
			]
		}), a.push({
			cmd: "GET",
			out: 0,
			var: 2,
			len: i * n
		}), await f.tm.queueAction(a);
	}
}
//#endregion
//#region src/zkey_verify_fromr1cs.js
async function $n(e, t, n, r) {
	let i = { type: "bigMem" };
	return await Jn(e, t, i, r), await Qn(i, t, n, r);
}
//#endregion
//#region src/zkey_contribute.js
async function er(t, n, r, i, a) {
	let { fd: o, sections: s } = await e.readBinFile(t, "zkey", 2), c = await He(o, s);
	if (c.protocol != "groth16") throw Error("zkey file is not groth16");
	let l = await T(c.q), u = await Je(o, l, s), d = await e.createBinFile(n, "zkey", 1, 10), f = await Ne(i), p = G.create({ dkLen: 64 });
	p.update(u.csHash);
	for (let e = 0; e < u.contributions.length; e++) $e(p, l, u.contributions[e]);
	let m = {};
	m.delta = {}, m.delta.prvKey = l.Fr.fromRng(f), m.delta.g1_s = l.G1.toAffine(l.G1.fromRng(f)), m.delta.g1_sx = l.G1.toAffine(l.G1.timesFr(m.delta.g1_s, m.delta.prvKey)), Ze(p, l, m.delta.g1_s), Ze(p, l, m.delta.g1_sx), m.transcript = p.digest(), m.delta.g2_sp = $t(l, m.transcript), m.delta.g2_spx = l.G2.toAffine(l.G2.timesFr(m.delta.g2_sp, m.delta.prvKey)), c.vk_delta_1 = l.G1.timesFr(c.vk_delta_1, m.delta.prvKey), c.vk_delta_2 = l.G2.timesFr(c.vk_delta_2, m.delta.prvKey), m.deltaAfter = c.vk_delta_1, m.type = 0, r && (m.name = r), u.contributions.push(m), await Re(d, c), await e.copySection(o, s, d, 3), await e.copySection(o, s, d, 4), await e.copySection(o, s, d, 5), await e.copySection(o, s, d, 6), await e.copySection(o, s, d, 7);
	let h = l.Fr.inv(m.delta.prvKey);
	await Sn(o, s, d, 8, l, "G1", h, l.Fr.e(1), "L Section", a), await Sn(o, s, d, 9, l, "G1", h, l.Fr.e(1), "H Section", a), await Xe(d, l, u), await o.close(), await d.close();
	let g = G.create({ dkLen: 64 });
	$e(g, l, m);
	let _ = g.digest();
	return a && a.info(K(u.csHash, "Circuit Hash: ")), a && a.info(K(_, "Contribution Hash: ")), _;
}
//#endregion
//#region src/zkey_beacon.js
async function tr(t, n, r, i, a, o) {
	let s = Fe(i);
	if (s.byteLength == 0 || s.byteLength * 2 != i.length) return o && o.error("Invalid Beacon Hash. (It must be a valid hexadecimal sequence)"), !1;
	if (s.length >= 256) return o && o.error("Maximum length of beacon hash is 255 bytes"), !1;
	if (a = parseInt(a), a < 10 || a > 63) return o && o.error("Invalid numIterationsExp. (Must be between 10 and 63)"), !1;
	let { fd: c, sections: l } = await e.readBinFile(t, "zkey", 2), u = await He(c, l);
	if (u.protocol != "groth16") throw Error("zkey file is not groth16");
	let d = await T(u.q), f = await Je(c, d, l), p = await e.createBinFile(n, "zkey", 1, 10), m = await Pe(s, a), h = G.create({ dkLen: 64 });
	h.update(f.csHash);
	for (let e = 0; e < f.contributions.length; e++) $e(h, d, f.contributions[e]);
	let g = {};
	g.delta = {}, g.delta.prvKey = d.Fr.fromRng(m), g.delta.g1_s = d.G1.toAffine(d.G1.fromRng(m)), g.delta.g1_sx = d.G1.toAffine(d.G1.timesFr(g.delta.g1_s, g.delta.prvKey)), Ze(h, d, g.delta.g1_s), Ze(h, d, g.delta.g1_sx), g.transcript = h.digest(), g.delta.g2_sp = $t(d, g.transcript), g.delta.g2_spx = d.G2.toAffine(d.G2.timesFr(g.delta.g2_sp, g.delta.prvKey)), u.vk_delta_1 = d.G1.timesFr(u.vk_delta_1, g.delta.prvKey), u.vk_delta_2 = d.G2.timesFr(u.vk_delta_2, g.delta.prvKey), g.deltaAfter = u.vk_delta_1, g.type = 1, g.numIterationsExp = a, g.beaconHash = s, r && (g.name = r), f.contributions.push(g), await Re(p, u), await e.copySection(c, l, p, 3), await e.copySection(c, l, p, 4), await e.copySection(c, l, p, 5), await e.copySection(c, l, p, 6), await e.copySection(c, l, p, 7);
	let _ = d.Fr.inv(g.delta.prvKey);
	await Sn(c, l, p, 8, d, "G1", _, d.Fr.e(1), "L Section", o), await Sn(c, l, p, 9, d, "G1", _, d.Fr.e(1), "H Section", o), await Xe(p, d, f), await c.close(), await p.close();
	let v = G.create({ dkLen: 64 });
	$e(v, d, g);
	let y = v.digest();
	return o && o.info(K(y, "Contribution Hash: ")), y;
}
//#endregion
//#region src/zkey_export_json.js
async function nr(e) {
	let t = await Ke(e, !0);
	return delete t.curve, delete t.F, p.stringifyBigInts(t);
}
//#endregion
//#region src/zkey_bellman_contribute.js
async function rr(e, t, n, r, i) {
	let a = await Ne(r), o = e.Fr.fromRng(a), s = e.Fr.inv(o), c = e.G1.F.n8 * 2, l = e.G2.F.n8 * 2, u = await Mt(t), d = await jt(n);
	await D(c), await D(c), await D(l), await D(l);
	let f = await O(), p = e.G1.timesFr(f, o);
	await A(p);
	let m = await k();
	await j(e.G2.timesFr(m, o));
	let h = await u.readUBE32();
	await d.writeUBE32(h), await D(h * c);
	let g = await u.readUBE32();
	await d.writeUBE32(g), await Cn(u, d, null, e, "G1", g, s, e.Fr.e(1), "UNCOMPRESSED", "H", i);
	let _ = await u.readUBE32();
	await d.writeUBE32(_), await Cn(u, d, null, e, "G1", _, s, e.Fr.e(1), "UNCOMPRESSED", "L", i);
	let v = await u.readUBE32();
	await d.writeUBE32(v), await D(v * c);
	let y = await u.readUBE32();
	await d.writeUBE32(y), await D(y * c);
	let b = await u.readUBE32();
	await d.writeUBE32(b), await D(b * l);
	let x = G.create({ dkLen: 64 }), S = {};
	S.csHash = await u.read(64), x.update(S.csHash);
	let C = await u.readUBE32();
	S.contributions = [];
	for (let t = 0; t < C; t++) {
		let t = { delta: {} };
		t.deltaAfter = await O(), t.delta.g1_s = await O(), t.delta.g1_sx = await O(), t.delta.g2_spx = await k(), t.transcript = await u.read(64), S.contributions.push(t), $e(x, e, t);
	}
	let w = {};
	w.delta = {}, w.delta.prvKey = o, w.delta.g1_s = e.G1.toAffine(e.G1.fromRng(a)), w.delta.g1_sx = e.G1.toAffine(e.G1.timesFr(w.delta.g1_s, o)), Ze(x, e, w.delta.g1_s), Ze(x, e, w.delta.g1_sx), w.transcript = x.digest(), w.delta.g2_sp = $t(e, w.transcript), w.delta.g2_spx = e.G2.toAffine(e.G2.timesFr(w.delta.g2_sp, o)), w.deltaAfter = p, w.type = 0, S.contributions.push(w), await d.write(S.csHash), await d.writeUBE32(S.contributions.length);
	for (let e = 0; e < S.contributions.length; e++) {
		let t = S.contributions[e];
		await A(t.deltaAfter), await A(t.delta.g1_s), await A(t.delta.g1_sx), await j(t.delta.g2_spx), await d.write(t.transcript);
	}
	let T = G.create({ dkLen: 64 });
	$e(T, e, w);
	let E = T.digest();
	return i && i.info(K(E, "Contribution Hash: ")), await d.close(), await u.close(), E;
	async function D(e) {
		let t = u.pageSize * 2;
		for (let n = 0; n < e; n += t) {
			let r = Math.min(e - n, t), i = await u.read(r);
			await d.write(i);
		}
	}
	async function O() {
		let t = await u.read(e.G1.F.n8 * 2);
		return e.G1.fromRprUncompressed(t, 0);
	}
	async function k() {
		let t = await u.read(e.G2.F.n8 * 2);
		return e.G2.fromRprUncompressed(t, 0);
	}
	async function A(t) {
		let n = new Uint8Array(c);
		e.G1.toRprUncompressed(n, 0, t), await d.write(n);
	}
	async function j(t) {
		let n = new Uint8Array(l);
		e.G2.toRprUncompressed(n, 0, t), await d.write(n);
	}
}
//#endregion
//#region src/zkey_export_verificationkey.js
var { stringifyBigInts: ir } = p;
async function ar(t, n) {
	n && n.info("EXPORT VERIFICATION KEY STARTED");
	let { fd: r, sections: i } = await e.readBinFile(t, "zkey", 2), a = await He(r, i);
	n && n.info("> Detected protocol: " + a.protocol);
	let o;
	if (a.protocol === "groth16") o = await or(a, r, i);
	else if (a.protocol === "plonk") o = await sr(a);
	else if (a.protocolId && a.protocolId === 10) o = await cr(a, n);
	else throw Error("zkey file protocol unrecognized");
	return await r.close(), n && n.info("EXPORT VERIFICATION KEY FINISHED"), o;
}
async function or(t, n, r) {
	let i = await T(t.q), a = i.G1.F.n8 * 2, o = await i.pairing(t.vk_alpha_1, t.vk_beta_2), s = {
		protocol: t.protocol,
		curve: i.name,
		nPublic: t.nPublic,
		vk_alpha_1: i.G1.toObject(t.vk_alpha_1),
		vk_beta_2: i.G2.toObject(t.vk_beta_2),
		vk_gamma_2: i.G2.toObject(t.vk_gamma_2),
		vk_delta_2: i.G2.toObject(t.vk_delta_2),
		vk_alphabeta_12: i.Gt.toObject(o)
	};
	await e.startReadUniqueSection(n, r, 3), s.IC = [];
	for (let e = 0; e <= t.nPublic; e++) {
		let e = await n.read(a), t = i.G1.toObject(e);
		s.IC.push(t);
	}
	return await e.endReadSection(n), s = ir(s), s;
}
async function sr(e) {
	let t = await T(e.q), n = {
		protocol: e.protocol,
		curve: t.name,
		nPublic: e.nPublic,
		power: e.power,
		k1: t.Fr.toObject(e.k1),
		k2: t.Fr.toObject(e.k2),
		Qm: t.G1.toObject(e.Qm),
		Ql: t.G1.toObject(e.Ql),
		Qr: t.G1.toObject(e.Qr),
		Qo: t.G1.toObject(e.Qo),
		Qc: t.G1.toObject(e.Qc),
		S1: t.G1.toObject(e.S1),
		S2: t.G1.toObject(e.S2),
		S3: t.G1.toObject(e.S3),
		X_2: t.G2.toObject(e.X_2),
		w: t.Fr.toObject(t.Fr.w[e.power])
	};
	return n = ir(n), n;
}
async function cr(e, t) {
	let n = await T(e.q);
	return ir({
		protocol: e.protocol,
		curve: n.name,
		nPublic: e.nPublic,
		power: e.power,
		k1: n.Fr.toObject(e.k1),
		k2: n.Fr.toObject(e.k2),
		w: n.Fr.toObject(n.Fr.w[e.power]),
		w3: n.Fr.toObject(e.w3),
		w4: n.Fr.toObject(e.w4),
		w8: n.Fr.toObject(e.w8),
		wr: n.Fr.toObject(e.wr),
		X_2: n.G2.toObject(e.X_2),
		C0: n.G1.toObject(e.C0)
	});
}
//#endregion
//#region src/zkey.js
var lr = /* @__PURE__ */ v({
	beacon: () => tr,
	bellmanContribute: () => rr,
	contribute: () => er,
	exportBellman: () => Yn,
	exportJson: () => nr,
	exportSolidityVerifier: () => null,
	exportVerificationKey: () => ar,
	importBellman: () => Xn,
	newZKey: () => Jn,
	verifyFromInit: () => Qn,
	verifyFromR1cs: () => $n
});
//#endregion
//#region src/plonk_setup.js
async function ur(e, i, c, l) {
	globalThis.gc && globalThis.gc();
	let { fd: d, sections: f } = await r(i, "ptau", 1, 1 << 22, 1 << 24), { curve: p, power: m } = await an(d, f), { fd: g, sections: _ } = await r(e, "r1cs", 1, 1 << 22, 1 << 24), v = await h(g, _, {
		loadConstraints: !0,
		loadCustomGates: !0
	}), y = p.G1.F.n8 * 2, b = p.G1, x = p.G2.F.n8 * 2, S = p.Fr, C = p.Fr.n8;
	l && l.info("Reading r1cs");
	let w = new qn(), T = new qn(), E = v.nVars, D = v.nOutputs + v.nPubInputs;
	await ee(p.Fr, v, l), globalThis.gc && globalThis.gc();
	let O = await t(c, "zkey", 1, 14, 1 << 22, 1 << 24);
	if (v.prime != p.r) return l && l.error("r1cs curve does not match powers of tau ceremony curve"), -1;
	let k = Ce(w.length - 1) + 1;
	k < 3 && (k = 3);
	let A = 2 ** k;
	if (l && l.info("Plonk constraints: " + w.length), k > m) return l && l.error(`circuit too big for this power of tau ceremony. ${w.length} > 2**${m}`), -1;
	if (!f[12]) return l && l.error("Powers of tau is not prepared."), -1;
	let j = new s(A * y), M = f[12][0].p + (2 ** k - 1) * y;
	await d.readToBuffer(j, 0, A * y, M);
	let [N, P] = H(), F = {};
	await B(3, "Additions"), globalThis.gc && globalThis.gc(), await L(4, 0, "Amap"), globalThis.gc && globalThis.gc(), await L(5, 1, "Bmap"), globalThis.gc && globalThis.gc(), await L(6, 2, "Cmap"), globalThis.gc && globalThis.gc(), await R(7, 3, "Qm"), globalThis.gc && globalThis.gc(), await R(8, 4, "Ql"), globalThis.gc && globalThis.gc(), await R(9, 5, "Qr"), globalThis.gc && globalThis.gc(), await R(10, 6, "Qo"), globalThis.gc && globalThis.gc(), await R(11, 7, "Qc"), globalThis.gc && globalThis.gc(), await te(12, "sigma"), globalThis.gc && globalThis.gc(), await ne(13, "lagrange polynomials"), globalThis.gc && globalThis.gc(), await a(O, 14);
	let I = new s((A + 6) * y);
	await d.readToBuffer(I, 0, (A + 6) * y, f[2][0].p), await O.write(I), await n(O), globalThis.gc && globalThis.gc(), await V(), await O.close(), await g.close(), await d.close(), l && l.info("Setup Finished");
	return;
	async function ee(e, t, n) {
		function r(e) {
			let t = Object.keys(e);
			for (let n = 0; n < t.length; n++) e[t[n]] == 0n && delete e[t[n]];
		}
		function i(t, n, i) {
			let a = {};
			for (let r in t) a[r] === void 0 ? a[r] = e.mul(n, t[r]) : a[r] = e.add(a[r], e.mul(n, t[r]));
			for (let t in i) a[t] === void 0 ? a[t] = i[t] : a[t] = e.add(a[t], i[t]);
			return r(a), a;
		}
		function a(t, n) {
			let r = {
				k: e.zero,
				s: [],
				coefs: []
			}, i = [];
			for (let n in t) n == 0 ? r.k = e.add(r.k, t[n]) : t[n] != 0n && i.push([Number(n), t[n]]);
			for (; i.length > n;) {
				let t = i.shift(), n = i.shift(), r = t[0], a = n[0], o = E++, s = e.zero, c = e.neg(t[1]), l = e.neg(n[1]), u = e.one, d = e.zero;
				w.push([
					r,
					a,
					o,
					s,
					c,
					l,
					u,
					d
				]), T.push([
					r,
					a,
					t[1],
					n[1]
				]), i.push([o, e.one]);
			}
			for (let e = 0; e < i.length; e++) r.s[e] = i[e][0], r.coefs[e] = i[e][1];
			for (; r.coefs.length < n;) r.s.push(0), r.coefs.push(e.zero);
			return r;
		}
		function o(t) {
			let n = a(t, 3), r = n.s[0], i = n.s[1], o = n.s[2], s = e.zero, c = n.coefs[0], l = n.coefs[1], u = n.coefs[2], d = n.k;
			w.push([
				r,
				i,
				o,
				s,
				c,
				l,
				u,
				d
			]);
		}
		function s(t, n, r) {
			let i = a(t, 1), o = a(n, 1), s = a(r, 1), c = i.s[0], l = o.s[0], u = s.s[0], d = e.mul(i.coefs[0], o.coefs[0]), f = e.mul(i.coefs[0], o.k), p = e.mul(i.k, o.coefs[0]), m = e.neg(s.coefs[0]), h = e.sub(e.mul(i.k, o.k), s.k);
			w.push([
				c,
				l,
				u,
				d,
				f,
				p,
				m,
				h
			]);
		}
		function c(t) {
			let n = e.zero, r = 0, i = Object.keys(t);
			for (let a = 0; a < i.length; a++) t[i[a]] == 0n ? delete t[i[a]] : i[a] == 0 ? n = e.add(n, t[i[a]]) : r++;
			return r > 0 ? r.toString() : n == e.zero ? "0" : "k";
		}
		function l(e, t, n) {
			let a = c(e), l = c(t);
			a === "0" || l === "0" ? (r(n), o(n)) : a === "k" ? o(i(t, e[0], n)) : l === "k" ? o(i(e, t[0], n)) : s(e, t, n);
		}
		for (let t = 1; t <= D; t++) {
			let n = t, r = e.zero, i = e.one, a = e.zero, o = e.zero, s = e.zero;
			w.push([
				n,
				0,
				0,
				r,
				i,
				a,
				o,
				s
			]);
		}
		for (let e = 0; e < t.constraints.length; e++) n && e % 1e4 == 0 && n.debug(`processing constraints: ${e}/${t.nConstraints}`), l(...t.constraints[e]);
	}
	async function L(e, t, r) {
		await a(O, e);
		for (let e = 0; e < w.length; e++) await O.writeULE32(w[e][t]), l && e % 1e6 == 0 && l.debug(`writing ${r}: ${e}/${w.length}`);
		await n(O);
	}
	async function R(e, t, r) {
		let i = new s(A * C);
		for (let e = 0; e < w.length; e++) i.set(w[e][t], e * C), l && e % 1e6 == 0 && l.debug(`writing ${r}: ${e}/${w.length}`);
		await a(O, e), await z(i), await n(O), i = await S.batchFromMontgomery(i), F[r] = await p.G1.multiExpAffine(j, i, l, "multiexp " + r);
	}
	async function z(e) {
		let t = await S.ifft(e), n = new s(A * C * 4);
		n.set(t, 0);
		let r = await S.fft(n);
		await O.write(t), await O.write(r);
	}
	async function B(e, t) {
		await a(O, e);
		let r = new Uint8Array(8 + 2 * C), i = new DataView(r.buffer);
		for (let e = 0; e < T.length; e++) {
			let n = T[e], a = 0;
			i.setUint32(a, n[0], !0), a += 4, i.setUint32(a, n[1], !0), a += 4, r.set(n[2], a), a += C, r.set(n[3], a), a += C, await O.write(r), l && e % 1e6 == 0 && l.debug(`writing ${t}: ${e}/${T.length}`);
		}
		await n(O);
	}
	async function te(e, t) {
		let r = new s(C * A * 3), i = new qn(E), o = new qn(E), c = S.one;
		for (let e = 0; e < A; e++) e < w.length ? (m(w[e][0], e), m(w[e][1], A + e), m(w[e][2], A * 2 + e)) : (m(0, e), m(0, A + e), m(0, A * 2 + e)), c = S.mul(c, S.w[k]), l && e % 1e6 == 0 && l.debug(`writing ${t} phase1: ${e}/${w.length}`);
		for (let e = 0; e < E; e++) o[e] === void 0 ? console.log("Variable not used") : r.set(i[e], o[e] * C), l && e % 1e6 == 0 && l.debug(`writing ${t} phase2: ${e}/${E}`);
		globalThis.gc && globalThis.gc(), await a(O, e);
		let u = r.slice(0, A * C);
		await z(u), globalThis.gc && globalThis.gc();
		let d = r.slice(A * C, A * C * 2);
		await z(d), globalThis.gc && globalThis.gc();
		let f = r.slice(A * C * 2, A * C * 3);
		await z(f), globalThis.gc && globalThis.gc(), await n(O), u = await S.batchFromMontgomery(u), d = await S.batchFromMontgomery(d), f = await S.batchFromMontgomery(f), F.S1 = await p.G1.multiExpAffine(j, u, l, "multiexp S1"), globalThis.gc && globalThis.gc(), F.S2 = await p.G1.multiExpAffine(j, d, l, "multiexp S2"), globalThis.gc && globalThis.gc(), F.S3 = await p.G1.multiExpAffine(j, f, l, "multiexp S3"), globalThis.gc && globalThis.gc();
		function m(e, t) {
			i[e] === void 0 ? o[e] = t : r.set(i[e], t * C);
			let n;
			n = t < A ? c : t < 2 * A ? S.mul(c, N) : S.mul(c, P), i[e] = n;
		}
	}
	async function ne(e, t) {
		await a(O, e);
		let r = Math.max(D, 1);
		for (let e = 0; e < r; e++) {
			let n = new s(A * C);
			n.set(S.one, e * C), await z(n), l && l.debug(`writing ${t} ${e}/${r}`);
		}
		await n(O);
	}
	async function V() {
		await a(O, 1), await O.writeULE32(2), await n(O), await a(O, 2);
		let e = p.q, t = (Math.floor((u.bitLength(e) - 1) / 64) + 1) * 8, r = p.r, i = (Math.floor((u.bitLength(r) - 1) / 64) + 1) * 8;
		await O.writeULE32(t), await o(O, e, t), await O.writeULE32(i), await o(O, r, i), await O.writeULE32(E), await O.writeULE32(D), await O.writeULE32(A), await O.writeULE32(T.length), await O.writeULE32(w.length), await O.write(N), await O.write(P), await O.write(b.toAffine(F.Qm)), await O.write(b.toAffine(F.Ql)), await O.write(b.toAffine(F.Qr)), await O.write(b.toAffine(F.Qo)), await O.write(b.toAffine(F.Qc)), await O.write(b.toAffine(F.S1)), await O.write(b.toAffine(F.S2)), await O.write(b.toAffine(F.S3));
		let s;
		s = await d.read(x, f[3][0].p + x), await O.write(s), await n(O);
	}
	function H() {
		let e = S.two;
		for (; n(e, [], k);) S.add(e, S.one);
		let t = S.add(e, S.one);
		for (; n(t, [e], k);) S.add(t, S.one);
		return [e, t];
		function n(e, t, n) {
			let r = 2 ** n, i = S.one;
			for (let a = 0; a < r; a++) {
				if (S.eq(e, i)) return !0;
				for (let n = 0; n < t.length; n++) if (S.eq(e, S.mul(t[n], i))) return !0;
				i = S.mul(i, S.w[n]);
			}
			return !1;
		}
	}
}
//#endregion
//#region src/proof.js
var dr = class {
	constructor(e, t) {
		this.curve = e, this.logger = t, this.resetProof();
	}
	resetProof() {
		this.polynomials = {}, this.evaluations = {};
	}
	addPolynomial(e, t) {
		e in this.polynomials && this.logger.warn(`proof: polynomial.${e} already exist in proof`), this.polynomials[e] = t;
	}
	getPolynomial(e) {
		return e in this.polynomials || this.logger.warn(`proof: polynomial ${e} does not exist in proof`), this.polynomials[e];
	}
	addEvaluation(e, t) {
		e in this.evaluations && this.logger.warn(`proof: evaluations.${e} already exist in proof`), this.evaluations[e] = t;
	}
	getEvaluation(e) {
		return e in this.evaluations || this.logger.warn(`proof: evaluation ${e} does not exist in proof`), this.evaluations[e];
	}
	toObjectProof(e = !0) {
		let t = e ? {
			polynomials: {},
			evaluations: {}
		} : {};
		return Object.keys(this.polynomials).forEach((n) => {
			let r = this.curve.G1.toObject(this.polynomials[n]);
			e ? t.polynomials[n] = r : t[n] = r;
		}), Object.keys(this.evaluations).forEach((n) => {
			let r = this.curve.Fr.toObject(this.evaluations[n]);
			e ? t.evaluations[n] = r : t[n] = r;
		}), t;
	}
	fromObjectProof(e) {
		this.resetProof(), Object.keys(e.polynomials).forEach((t) => {
			this.polynomials[t] = this.curve.G1.fromObject(e.polynomials[t]);
		}), Object.keys(e.evaluations).forEach((t) => {
			this.evaluations[t] = this.curve.Fr.fromObject(e.evaluations[t]);
		});
	}
}, fr = BigInt(0), pr = BigInt(1), mr = BigInt(2), hr = BigInt(7), gr = BigInt(256), _r = BigInt(113), vr = [], yr = [], br = [];
for (let e = 0, t = pr, n = 1, r = 0; e < 24; e++) {
	[n, r] = [r, (2 * n + 3 * r) % 5], vr.push(2 * (5 * r + n)), yr.push((e + 1) * (e + 2) / 2 % 64);
	let i = fr;
	for (let e = 0; e < 7; e++) t = (t << pr ^ (t >> hr) * _r) % gr, t & mr && (i ^= pr << (pr << BigInt(e)) - pr);
	br.push(i);
}
var xr = V(br, !0), Sr = xr[0], Cr = xr[1], wr = (e, t, n) => n > 32 ? ue(e, t, n) : ce(e, t, n), Tr = (e, t, n) => n > 32 ? de(e, t, n) : le(e, t, n);
function Er(e, t = 24) {
	if (O(t, "rounds"), t < 1 || t > 24) throw Error("\"rounds\" expected integer 1..24");
	let n = /* @__PURE__ */ new Uint32Array(10);
	for (let r = 24 - t; r < 24; r++) {
		for (let t = 0; t < 10; t++) n[t] = e[t] ^ e[t + 10] ^ e[t + 20] ^ e[t + 30] ^ e[t + 40];
		for (let t = 0; t < 10; t += 2) {
			let r = (t + 8) % 10, i = (t + 2) % 10, a = n[i], o = n[i + 1], s = wr(a, o, 1) ^ n[r], c = Tr(a, o, 1) ^ n[r + 1];
			for (let n = 0; n < 50; n += 10) e[t + n] ^= s, e[t + n + 1] ^= c;
		}
		let t = e[2], i = e[3];
		for (let n = 0; n < 24; n++) {
			let r = yr[n], a = wr(t, i, r), o = Tr(t, i, r), s = vr[n];
			t = e[s], i = e[s + 1], e[s] = a, e[s + 1] = o;
		}
		for (let t = 0; t < 50; t += 10) {
			let n = e[t], r = e[t + 1], i = e[t + 2], a = e[t + 3];
			e[t] ^= ~e[t + 2] & e[t + 4], e[t + 1] ^= ~e[t + 3] & e[t + 5], e[t + 2] ^= ~e[t + 4] & e[t + 6], e[t + 3] ^= ~e[t + 5] & e[t + 7], e[t + 4] ^= ~e[t + 6] & e[t + 8], e[t + 5] ^= ~e[t + 7] & e[t + 9], e[t + 6] ^= ~e[t + 8] & n, e[t + 7] ^= ~e[t + 9] & r, e[t + 8] ^= ~n & i, e[t + 9] ^= ~r & a;
		}
		e[0] ^= Sr[r], e[1] ^= Cr[r];
	}
	N(n);
}
var Dr = class e {
	state;
	pos = 0;
	posOut = 0;
	finished = !1;
	state32;
	destroyed = !1;
	blockLen;
	suffix;
	outputLen;
	canXOF;
	enableXOF = !1;
	rounds;
	constructor(e, t, n, r = !1, i = 24) {
		if (this.blockLen = e, this.suffix = t, this.outputLen = n, this.enableXOF = r, this.canXOF = r, this.rounds = i, O(n, "outputLen"), !(0 < e && e < 200)) throw Error("only keccak-f1600 function is supported");
		this.state = /* @__PURE__ */ new Uint8Array(200), this.state32 = M(this.state);
	}
	clone() {
		return this._cloneInto();
	}
	keccak() {
		L(this.state32), Er(this.state32, this.rounds), L(this.state32), this.posOut = 0, this.pos = 0;
	}
	update(e) {
		A(this), k(e);
		let { blockLen: t, state: n } = this, r = e.length;
		for (let i = 0; i < r;) {
			let a = Math.min(t - this.pos, r - i);
			for (let t = 0; t < a; t++) n[this.pos++] ^= e[i++];
			this.pos === t && this.keccak();
		}
		return this;
	}
	finish() {
		if (this.finished) return;
		this.finished = !0;
		let { state: e, suffix: t, pos: n, blockLen: r } = this;
		e[n] ^= t, t & 128 && n === r - 1 && this.keccak(), e[r - 1] ^= 128, this.keccak();
	}
	writeInto(e) {
		A(this, !1), k(e), this.finish();
		let t = this.state, { blockLen: n } = this;
		for (let r = 0, i = e.length; r < i;) {
			this.posOut >= n && this.keccak();
			let a = Math.min(n - this.posOut, i - r);
			e.set(t.subarray(this.posOut, this.posOut + a), r), this.posOut += a, r += a;
		}
		return e;
	}
	xofInto(e) {
		if (!this.enableXOF) throw Error("XOF is not possible for this instance");
		return this.writeInto(e);
	}
	xof(e) {
		return O(e), this.xofInto(new Uint8Array(e));
	}
	digestInto(e) {
		if (j(e, this), this.finished) throw Error("digest() was already called");
		this.writeInto(e.subarray(0, this.outputLen)), this.destroy();
	}
	digest() {
		let e = new Uint8Array(this.outputLen);
		return this.digestInto(e), e;
	}
	destroy() {
		this.destroyed = !0, N(this.state);
	}
	_cloneInto(t) {
		let { blockLen: n, suffix: r, outputLen: i, rounds: a, enableXOF: o } = this;
		return t ||= new e(n, r, i, o, a), t.blockLen = n, t.state32.set(this.state32), t.pos = this.pos, t.posOut = this.posOut, t.finished = this.finished, t.rounds = a, t.suffix = r, t.outputLen = i, t.enableXOF = o, t.canXOF = this.canXOF, t.destroyed = this.destroyed, t;
	}
}, Or = /* @__PURE__ */ ((e, t, n, r = {}) => R(() => new Dr(t, e, n), r))(1, 136, 32), kr = 0, Ar = 1, jr = class {
	constructor(e) {
		this.G1 = e.G1, this.Fr = e.Fr, this.reset();
	}
	reset() {
		this.data = [];
	}
	addPolCommitment(e) {
		this.data.push({
			type: kr,
			data: e
		});
	}
	addScalar(e) {
		this.data.push({
			type: Ar,
			data: e
		});
	}
	getChallenge() {
		if (this.data.length === 0) throw Error("Keccak256Transcript: No data to generate a transcript");
		let e = 0, t = 0;
		this.data.forEach((n) => kr === n.type ? e++ : t++);
		let n = new Uint8Array(t * this.Fr.n8 + e * this.G1.F.n8 * 2), r = 0;
		for (let e = 0; e < this.data.length; e++) kr === this.data[e].type ? (this.G1.toRprUncompressed(n, r, this.data[e].data), r += this.G1.F.n8 * 2) : (this.Fr.toRprBE(n, r, this.data[e].data), r += this.Fr.n8);
		let i = u.fromRprBE(Or(n));
		return this.Fr.e(i);
	}
}, Mr = class {
	static getZ1(e) {
		return [
			e.zero,
			e.add(e.e(-1), e.w[2]),
			e.e(-2),
			e.sub(e.e(-1), e.w[2])
		];
	}
	static getZ2(e) {
		return [
			e.zero,
			e.add(e.zero, e.mul(e.e(-2), e.w[2])),
			e.e(4),
			e.sub(e.zero, e.mul(e.e(-2), e.w[2]))
		];
	}
	static getZ3(e) {
		return [
			e.zero,
			e.add(e.e(2), e.mul(e.e(2), e.w[2])),
			e.e(-8),
			e.sub(e.e(2), e.mul(e.e(2), e.w[2]))
		];
	}
	static mul2(e, t, n, r, i, a) {
		let o = this.getZ1(a), s, c, l = a.mul(e, t), u = a.mul(e, r), d = a.mul(n, t), f = a.mul(n, r);
		s = l;
		let p = a.add(u, d), m = f;
		return c = p, i && (c = a.add(c, a.mul(o[i], m))), [s, c];
	}
	static mul3(e, t, n, r, i, a, o, s) {
		let c = this.getZ1(s), l = this.getZ2(s), u, d, f = s.mul(e, t), p = s.mul(e, i), m = s.mul(r, t), h = s.mul(r, i);
		u = s.mul(f, n);
		let g = s.mul(m, n);
		g = s.add(g, s.mul(p, n)), g = s.add(g, s.mul(f, a));
		let _ = s.mul(h, n);
		if (_ = s.add(_, s.mul(p, a)), _ = s.add(_, s.mul(m, a)), d = g, o) {
			let e = s.mul(h, a);
			d = s.add(d, s.mul(c[o], _)), d = s.add(d, s.mul(l[o], e));
		}
		return [u, d];
	}
	static mul4(e, t, n, r, i, a, o, s, c, l) {
		let u = this.getZ1(l), d = this.getZ2(l), f = this.getZ3(l), p, m, h = l.mul(e, t), g = l.mul(e, a), _ = l.mul(i, t), v = l.mul(i, a), y = l.mul(n, r), b = l.mul(n, s), x = l.mul(o, r), S = l.mul(o, s);
		p = l.mul(h, y);
		let C = l.mul(_, y);
		C = l.add(C, l.mul(g, y)), C = l.add(C, l.mul(h, x)), C = l.add(C, l.mul(h, b));
		let w = l.mul(v, y);
		w = l.add(w, l.mul(_, x)), w = l.add(w, l.mul(_, b)), w = l.add(w, l.mul(g, x)), w = l.add(w, l.mul(g, b)), w = l.add(w, l.mul(h, S));
		let T = l.mul(g, S);
		T = l.add(T, l.mul(_, S)), T = l.add(T, l.mul(v, b)), T = l.add(T, l.mul(v, x));
		let E = l.mul(v, S);
		return m = C, c && (m = l.add(m, l.mul(u[c], w)), m = l.add(m, l.mul(d[c], T)), m = l.add(m, l.mul(f[c], E))), [p, m];
	}
}, Y = class e {
	constructor(e, t, n) {
		this.coef = e, this.curve = t, this.Fr = t.Fr, this.G1 = t.G1, this.logger = n;
	}
	static async fromEvaluations(t, n, r) {
		return new e(await n.Fr.ifft(t), n, r);
	}
	static fromCoefficientsArray(t, n, r) {
		let i = n.Fr, a = t.length > 32768 ? new s(t.length * i.n8) : new Uint8Array(t.length * i.n8);
		for (let e = 0; e < t.length; e++) a.set(t[e], e * i.n8);
		return new e(a, n, r);
	}
	static fromPolynomial(t, n, r) {
		let i = t.length(), a = n.Fr, o = i > 32768 ? new s(i * a.n8) : new Uint8Array(i * a.n8);
		return o.set(t.coef.slice(), 0), new e(o, n, r);
	}
	isEqual(e) {
		let t = this.degree();
		if (t !== e.degree()) return !1;
		for (let n = 0; n < t + 1; n++) if (!this.Fr.eq(this.getCoef(n), e.getCoef(n))) return !1;
		return !0;
	}
	blindCoefficients(e) {
		e ||= [];
		let t = this.length() + e.length > 32768 ? new s((this.length() + e.length) * this.Fr.n8) : new Uint8Array((this.length() + e.length) * this.Fr.n8);
		t.set(this.coef, 0);
		for (let n = 0; n < e.length; n++) t.set(this.Fr.add(t.slice((this.length() + n) * this.Fr.n8, (this.length() + n + 1) * this.Fr.n8), e[n]), (this.length() + n) * this.Fr.n8), t.set(this.Fr.sub(t.slice(n * this.Fr.n8, (n + 1) * this.Fr.n8), e[n]), n * this.Fr.n8);
		this.coef = t;
	}
	getCoef(e) {
		let t = e * this.Fr.n8;
		return t + this.Fr.n8 > this.coef.byteLength ? this.Fr.zero : this.coef.slice(t, t + this.Fr.n8);
	}
	setCoef(e, t) {
		if (e > this.length() - 1) throw Error("Coef index is not available");
		this.coef.set(t, e * this.Fr.n8);
	}
	static async to4T(e, t, n, r) {
		n ||= [];
		let i = await r.ifft(e), a = t * 4 > 32768 ? new s(t * 4 * r.n8) : new Uint8Array(t * 4 * r.n8);
		a.set(i, 0);
		let o = await r.fft(a);
		if (n.length === 0) return [i, o];
		let c = t + n.length > 32768 ? new s((t + n.length) * r.n8) : new Uint8Array((t + n.length) * r.n8);
		c.set(i, 0);
		for (let e = 0; e < n.length; e++) c.set(r.add(c.slice((t + e) * r.n8, (t + e + 1) * r.n8), n[e]), (t + e) * r.n8), c.set(r.sub(c.slice(e * r.n8, (e + 1) * r.n8), n[e]), e * r.n8);
		return [c, o];
	}
	length() {
		let e = this.coef.byteLength / this.Fr.n8;
		if (e !== Math.floor(this.coef.byteLength / this.Fr.n8)) throw Error("Polynomial coefficients buffer has incorrect size");
		return e === 0 && this.logger && this.logger.warn("Polynomial has length zero"), e;
	}
	degree() {
		for (let e = this.length() - 1; e > 0; e--) {
			let t = e * this.Fr.n8;
			if (!this.Fr.eq(this.Fr.zero, this.coef.slice(t, t + this.Fr.n8))) return e;
		}
		return 0;
	}
	evaluate(e) {
		let t = this.Fr.zero;
		for (let n = this.degree() + 1; n > 0; n--) {
			let r = n * this.Fr.n8, i = this.coef.slice(r - this.Fr.n8, r);
			t = this.Fr.add(i, this.Fr.mul(t, e));
		}
		return t;
	}
	fastEvaluate(e) {
		let t = this.Fr, n = this.degree() + 1, r = parseInt(n / 3), i = n - r * 3, a = [], o = [];
		o[0] = t.one;
		for (let n = 0; n < 3; n++) {
			a[n] = t.zero;
			let s = n === 2 ? r + i : r;
			for (let i = s; i > 0; i--) a[n] = t.add(this.getCoef(n * r + i - 1), t.mul(a[n], e)), n === 0 && (o[0] = t.mul(o[0], e));
		}
		for (let e = 1; e < 3; e++) a[0] = t.add(a[0], t.mul(o[e - 1], a[e])), o[e] = t.mul(o[e - 1], o[0]);
		return a[0];
	}
	add(e, t) {
		let n = !1;
		e.length() > this.length() && (n = !0);
		let r = this.length(), i = e.length();
		for (let a = 0; a < Math.max(r, i); a++) {
			let o = a * this.Fr.n8, s = a < r ? this.coef.slice(o, o + this.Fr.n8) : this.Fr.zero, c = a < i ? e.coef.slice(o, o + this.Fr.n8) : this.Fr.zero;
			t !== void 0 && (c = this.Fr.mul(c, t)), n ? e.coef.set(this.Fr.add(s, c), o) : this.coef.set(this.Fr.add(s, c), o);
		}
		n && (delete this.coef, this.coef = e.coef);
	}
	sub(e, t) {
		let n = !1;
		e.length() > this.length() && (n = !0);
		let r = this.length(), i = e.length();
		for (let a = 0; a < Math.max(r, i); a++) {
			let o = a * this.Fr.n8, s = a < r ? this.coef.slice(o, o + this.Fr.n8) : this.Fr.zero, c = a < i ? e.coef.slice(o, o + this.Fr.n8) : this.Fr.zero;
			t !== void 0 && (c = this.Fr.mul(c, t)), n ? e.coef.set(this.Fr.sub(s, c), o) : this.coef.set(this.Fr.sub(s, c), o);
		}
		n && (delete this.coef, this.coef = e.coef);
	}
	mulScalar(e) {
		for (let t = 0; t < this.length(); t++) {
			let n = t * this.Fr.n8;
			this.coef.set(this.Fr.mul(this.coef.slice(n, n + this.Fr.n8), e), n);
		}
	}
	addScalar(e) {
		let t = this.length() === 0 ? this.Fr.zero : this.coef.slice(0, this.Fr.n8);
		this.coef.set(this.Fr.add(t, e), 0);
	}
	subScalar(e) {
		let t = this.length() === 0 ? this.Fr.zero : this.coef.slice(0, this.Fr.n8);
		this.coef.set(this.Fr.sub(t, e), 0);
	}
	byXSubValue(t) {
		let n = this.Fr, r = n.eq(n.zero, this.getCoef(this.length() - 1)) ? this.length() : this.length() + 1, i = new e(r > 32768 ? new s(r * n.n8) : new Uint8Array(r * n.n8), this.curve, this.logger);
		i.coef.set(this.coef.slice(0, (r - 1) * n.n8), 32), this.mulScalar(n.neg(t)), i.add(this), this.coef = i.coef;
	}
	byXNSubValue(t, n) {
		let r = this.Fr, i = this.length() - t - 1 >= this.degree() ? this.length() : this.length() + t, a = new e(i > 32768 ? new s(i * r.n8) : new Uint8Array(i * r.n8), this.curve, this.logger);
		a.coef.set(this.coef.slice(0, (this.degree() + 1) * 32), t * 32), this.mulScalar(n), a.add(this), this.coef = a.coef;
	}
	divBy(t) {
		let n = this.Fr, r = this.degree(), i = t.degree(), a = new e(this.coef, this.curve, this.logger);
		this.coef = this.length() > 32768 ? new s(this.length() * n.n8) : new Uint8Array(this.length() * n.n8);
		for (let e = r - i; e >= 0; e--) {
			this.setCoef(e, n.div(a.getCoef(e + i), t.getCoef(i)));
			for (let r = 0; r <= i; r++) a.setCoef(e + r, n.sub(a.getCoef(e + r), n.mul(this.getCoef(e), t.getCoef(r))));
		}
		return a;
	}
	divByMonic(t, n) {
		let r = this.Fr, i = this.degree(), a = new e(this.length() > 32768 ? new s(this.length() * r.n8) : new Uint8Array(this.length() * r.n8), this.curve, this.logger), o = [];
		for (let e = 0; e < t; e++) a.setCoef(i - e - t, this.getCoef(i - e)), o[e] = this.getCoef(i - e);
		let c = t, l = 0;
		for (let e = 0; e < c; e++) for (let s = i - 2 * t - e; s >= 0 && !(s < 0); s -= c) {
			let i = e;
			o[i] = r.add(this.getCoef(s + t), r.mul(o[i], n)), a.setCoef(s, o[i]), l = (l + 1) % t;
		}
		this.coef = a.coef;
	}
	divByVanishing(t, n) {
		if (this.degree() < t) throw Error("divByVanishing polynomial divisor must be of degree lower than the dividend polynomial");
		let r = this.Fr, i = new e(this.coef, this.curve, this.logger);
		this.coef = this.length() > 32768 ? new s(this.length() * r.n8) : new Uint8Array(this.length() * r.n8);
		for (let e = this.length() - 1; e >= t; e--) {
			let a = i.getCoef(e);
			r.eq(r.zero, a) || (i.setCoef(e, r.zero), i.setCoef(e - t, r.add(i.getCoef(e - t), r.mul(n, a))), this.setCoef(e - t, r.add(this.getCoef(e - t), a)));
		}
		return i;
	}
	divByVanishing2(t, n) {
		if (this.degree() < t) throw Error("divByVanishing polynomial divisor must be of degree lower than the dividend polynomial");
		let r = this.Fr, i = new e(this.coef, this.curve, this.logger);
		this.coef = this.length() > 32768 ? new s(this.length() * r.n8) : new Uint8Array(this.length() * r.n8);
		let a = this.length() - t, o = Math.floor(a / 3), c = a - 2 * o;
		console.log(a), console.log(o + "  " + c);
		for (let e = 0; e < 3; e++) {
			console.log("> Thread " + e);
			for (let a = e === 0 ? c : o; a > 0; a--) {
				let s = a - 1;
				e !== 0 && (s += (e - 1) * o + c);
				let l = s + t, u = i.getCoef(l);
				r.eq(r.zero, u) || (i.setCoef(l, r.zero), i.setCoef(s, r.add(i.getCoef(s), r.mul(n, u))), this.setCoef(s, r.add(this.getCoef(s), u)), console.log(s + " <-- " + l));
			}
		}
		return this.print(), i;
	}
	fastDivByVanishing(t) {
		let n = this.Fr;
		for (let r = 0; r < t.length; r++) {
			let i = t[r][0], a = t[r][1];
			if (this.degree() < i) throw Error("divByVanishing polynomial divisor must be of degree lower than the dividend polynomial");
			let o = this.length() - i, c = Math.floor(o / 5 / i), l = c * i, u = o - 5 * l, d = new e(this.length() > 32768 ? new s(this.length() * n.n8) : new Uint8Array(this.length() * n.n8), this.curve, this.logger), f = this.coef;
			this.coef = d.coef, d.coef = f;
			for (let e = 0; e < 5; e++) {
				let t = (e + 1) * l + u;
				for (let e = 0; e < i; e++) this.setCoef(t + e - i, d.getCoef(t + e));
				for (let e = 0; e < l - i; e++) {
					let r = t - e - 1, o = n.add(d.getCoef(r), n.mul(a, this.getCoef(r)));
					this.setCoef(r - i, o);
				}
			}
			let p = u, m = u;
			for (let e = 0; e < i && m; e++) this.setCoef(p - e - 1, d.getCoef(p + i - e - 1)), m--;
			for (let e = 0; e < m; e++) {
				let t = p - e - 1, r = n.add(d.getCoef(t), n.mul(a, this.getCoef(t)));
				this.setCoef(t - i, r);
			}
			let h = [], g = n.one;
			for (let e = 0; e < c; e++) g = n.mul(g, a);
			let _ = n.one;
			for (let e = 5; e > 0; e--) {
				let t = e - 1, r = t * l + u;
				h[t] = [];
				for (let a = 0; a < i; a++) h[t][a] = this.getCoef(r + a), e !== 5 && (h[t][a] = n.add(h[t][a], n.mul(g, h[t + 1][a])));
				_ = n.mul(_, g);
			}
			for (let e = 0; e < 5; e++) {
				let t = e * l + u, r = a, o = i - 1, s = e === 0 ? u : l;
				for (let c = 0; c < s; c++) {
					let s = t - c - 1, l = n.add(this.getCoef(s), n.mul(r, h[e][o]));
					this.setCoef(s, l), o === 0 ? (o = i - 1, r = n.mul(r, a)) : o--;
				}
			}
		}
	}
	divByXSubValue(e) {
		let t = this.length() > 32768 ? new s(this.length() * this.Fr.n8) : new Uint8Array(this.length() * this.Fr.n8);
		t.set(this.Fr.zero, (this.length() - 1) * this.Fr.n8), t.set(this.coef.slice((this.length() - 1) * this.Fr.n8, this.length() * this.Fr.n8), (this.length() - 2) * this.Fr.n8);
		for (let n = this.length() - 3; n >= 0; n--) {
			let r = n * this.Fr.n8;
			t.set(this.Fr.add(this.coef.slice(r + this.Fr.n8, r + 2 * this.Fr.n8), this.Fr.mul(e, t.slice(r + this.Fr.n8, r + 2 * this.Fr.n8))), n * this.Fr.n8);
		}
		if (!this.Fr.eq(this.coef.slice(0, this.Fr.n8), this.Fr.mul(this.Fr.neg(e), t.slice(0, this.Fr.n8)))) throw Error("Polynomial does not divide");
		this.coef = t;
	}
	divZh(e, t = 4) {
		for (let t = 0; t < e; t++) {
			let e = t * this.Fr.n8;
			this.coef.set(this.Fr.neg(this.coef.slice(e, e + this.Fr.n8)), e);
		}
		let n = this.coef.byteLength / this.Fr.n8;
		for (let r = e; r < n; r++) {
			let n = r * this.Fr.n8, i = this.Fr.sub(this.coef.slice((r - e) * this.Fr.n8, (r - e) * this.Fr.n8 + this.Fr.n8), this.coef.slice(n, n + this.Fr.n8));
			if (this.coef.set(i, n), r > e * (t - 1) - t && !this.Fr.isZero(i)) throw Error("Polynomial is not divisible");
		}
		return this;
	}
	divByZerofier(e, t) {
		let n = this.Fr, r = n.inv(t), i = n.neg(r), a = n.eq(n.one, i), o = n.eq(n.negone, i);
		if (!a) for (let t = 0; t < e; t++) {
			let e = t * this.Fr.n8, r;
			r = o ? n.neg(this.coef.slice(e, e + this.Fr.n8)) : n.mul(i, this.coef.slice(e, e + this.Fr.n8)), this.coef.set(r, e);
		}
		a = n.eq(n.one, r), o = n.eq(n.negone, r);
		for (let t = e; t < this.length(); t++) {
			let i = t * this.Fr.n8, s = (t - e) * this.Fr.n8, c = this.Fr.sub(this.coef.slice(s, s + this.Fr.n8), this.coef.slice(i, i + this.Fr.n8));
			if (a || (c = o ? n.neg(c) : n.mul(r, c)), this.coef.set(c, i), t > this.length() - e - 1 && !this.Fr.isZero(c)) throw Error("Polynomial is not divisible");
		}
		return this;
	}
	byX() {
		let e = this.length() + 1 > 32768 ? new s(this.coef.byteLength + this.Fr.n8) : new Uint8Array(this.coef.byteLength + this.Fr.n8);
		e.set(this.Fr.zero, 0), e.set(this.coef, this.Fr.n8), this.coef = e;
	}
	static async expX(t, n, r = !1) {
		let i = t.Fr;
		if (n < 1) throw Error("Compute a new polynomial to a zero or negative number is not allowed");
		if (n === 1) return await e.fromEvaluations(t.coef, t.curve, t.logger);
		let a = r ? t.degree() : t.length() - 1, o = a * n + 1 > 32768 ? new s((a * n + 1) * i.n8) : new Uint8Array((a * n + 1) * i.n8);
		o.set(t.getCoef(0), 0);
		for (let e = 1; e <= a; e++) {
			let r = e * i.n8, a = t.getCoef(e);
			o.set(a, r * n);
		}
		return new e(o, t.curve, t.logger);
	}
	split(t, n, r) {
		if (t < 1) throw Error(`Polynomials can't be split in ${t} parts`);
		if (t === 1) return [this];
		if (r.length !== 0 && r.length < t - 1) throw Error(`Blinding factors length must be ${t - 1}`);
		let i = (n + 1) * this.Fr.n8, a = [], o = Math.ceil((this.degree() + 1) * this.Fr.n8 / i);
		if (o < t) for (let n = o; n < t; n++) a[n] = new e(new Uint8Array(this.Fr.n8), this.curve, this.logger);
		t = Math.min(t, o);
		for (let n = 0; n < t; n++) {
			let o = t - 1 === n, c = o ? this.coef.byteLength - (t - 1) * i : i + this.Fr.n8;
			a[n] = new e(c / this.Fr.n8 > 32768 ? new s(c) : new Uint8Array(c), this.curve, this.logger);
			let l = n * i, u = o ? this.coef.byteLength : (n + 1) * i;
			if (a[n].coef.set(this.coef.slice(l, u), 0), o || a[n].coef.set(r[n], i), n !== 0) {
				let e = this.Fr.sub(a[n].coef.slice(0, this.Fr.n8), r[n - 1]);
				a[n].coef.set(e, 0);
			}
			o && a[n].truncate();
		}
		return a;
	}
	truncate() {
		let e = this.degree();
		if (e + 1 < this.coef.byteLength / this.Fr.n8) {
			let t = e + 1 > 32768 ? new s((e + 1) * this.Fr.n8) : new Uint8Array((e + 1) * this.Fr.n8);
			t.set(this.coef.slice(0, (e + 1) * this.Fr.n8), 0), this.coef = t;
		}
	}
	static lagrangePolynomialInterpolation(t, n, r) {
		let i = r.Fr, a = o(0);
		for (let e = 1; e < t.length; e++) a.add(o(e));
		return a;
		function o(a) {
			let o;
			for (let n = 0; n < t.length; n++) n !== a && (o === void 0 ? (o = new e(t.length > 32768 ? new s(t.length * i.n8) : new Uint8Array(t.length * i.n8), r), o.setCoef(0, i.neg(t[n])), o.setCoef(1, i.one)) : o.byXSubValue(t[n]));
			let c = o.evaluate(t[a]);
			c = i.inv(c);
			let l = i.mul(n[a], c);
			return o.mulScalar(l), o;
		}
	}
	static zerofierPolynomial(t, n) {
		let r = n.Fr, i = new e(t.length + 1 > 32768 ? new s((t.length + 1) * r.n8) : new Uint8Array((t.length + 1) * r.n8), n);
		i.setCoef(0, r.neg(t[0])), i.setCoef(1, r.one);
		for (let e = 1; e < t.length; e++) i.byXSubValue(t[e]);
		return i;
	}
	print() {
		let e = this.Fr, t = "";
		for (let n = this.degree(); n >= 0; n--) {
			let r = this.getCoef(n);
			e.eq(e.zero, r) || (e.isNegative(r) ? t += " - " : n !== this.degree() && (t += " + "), t += e.toString(r), n > 0 && (t += n > 1 ? "x^" + n : "x"));
		}
		console.log(t);
	}
	async multiExponentiation(e, t) {
		let n = this.coef.byteLength / this.Fr.n8, r = e.slice(0, n * this.G1.F.n8 * 2), i = await this.Fr.batchFromMontgomery(this.coef), a = await this.G1.multiExpAffine(r, i, this.logger, t);
		return a = this.G1.toAffine(a), a;
	}
}, X = class e {
	constructor(e, t, n) {
		this.eval = e, this.curve = t, this.Fr = t.Fr, this.logger = n;
	}
	static async fromPolynomial(t, n, r, i) {
		let a = new s(t.length() * n * r.Fr.n8);
		return a.set(t.coef, 0), new e(await r.Fr.fft(a), r, i);
	}
	getEvaluation(e) {
		let t = e * this.Fr.n8;
		if (t + this.Fr.n8 > this.eval.byteLength) throw Error("Evaluations.getEvaluation() out of bounds");
		return this.eval.slice(t, t + this.Fr.n8);
	}
	length() {
		let e = this.eval.byteLength / this.Fr.n8;
		if (e !== Math.floor(this.eval.byteLength / this.Fr.n8)) throw Error("Polynomial evaluations buffer has incorrect size");
		return e === 0 && this.logger.warn("Polynomial has length zero"), e;
	}
}, { stringifyBigInts: Nr } = p;
async function Pr(t, n, r, i) {
	let { fd: a, sections: o } = await e.readBinFile(n, "wtns", 2, 1 << 25, 1 << 23);
	r && r.debug("> Reading witness file");
	let c = await nt(a, o);
	r && r.debug("> Reading zkey file");
	let { fd: l, sections: d } = await e.readBinFile(t, "zkey", 2, 1 << 25, 1 << 23), f = await He(l, d, void 0, i);
	if (f.protocol != "plonk") throw Error("zkey file is not plonk");
	if (!u.eq(f.r, c.q)) throw Error("Curve of the witness does not match the curve of the proving key");
	if (c.nWitness != f.nVars - f.nAdditions) throw Error(`Invalid witness length. Circuit: ${f.nVars}, witness: ${c.nWitness}, ${f.nAdditions}`);
	let p = f.curve, m = p.Fr, h = p.Fr.n8, g = f.domainSize * h;
	r && (r.debug("----------------------------"), r.debug("  PLONK PROVE SETTINGS"), r.debug(`  Curve:         ${p.name}`), r.debug(`  Circuit power: ${f.power}`), r.debug(`  Domain size:   ${f.domainSize}`), r.debug(`  Vars:          ${f.nVars}`), r.debug(`  Public vars:   ${f.nPublic}`), r.debug(`  Constraints:   ${f.nConstraints}`), r.debug(`  Additions:     ${f.nAdditions}`), r.debug("----------------------------")), r && r.debug("> Reading witness file data");
	let _ = await e.readSection(a, o, 2);
	_.set(m.zero, 0);
	let v = new s(h * f.nAdditions), y = {}, b = {}, x = {}, S = {}, C = new dr(p, r), w = new jr(p);
	r && r.debug("> Reading Section 3. Additions"), await O(), r && r.debug("> Reading Section 12. Sigma1, Sigma2 & Sigma 3"), r && r.debug("··· Reading Sigma polynomials "), b.Sigma1 = new Y(new s(g), p, r), b.Sigma2 = new Y(new s(g), p, r), b.Sigma3 = new Y(new s(g), p, r), await l.readToBuffer(b.Sigma1.coef, 0, g, d[12][0].p), await l.readToBuffer(b.Sigma2.coef, 0, g, d[12][0].p + 5 * g), await l.readToBuffer(b.Sigma3.coef, 0, g, d[12][0].p + 10 * g), r && r.debug("··· Reading Sigma evaluations"), x.Sigma1 = new X(new s(g * 4), p, r), x.Sigma2 = new X(new s(g * 4), p, r), x.Sigma3 = new X(new s(g * 4), p, r), await l.readToBuffer(x.Sigma1.eval, 0, g * 4, d[12][0].p + g), await l.readToBuffer(x.Sigma2.eval, 0, g * 4, d[12][0].p + 6 * g), await l.readToBuffer(x.Sigma3.eval, 0, g * 4, d[12][0].p + 11 * g), r && r.debug("> Reading Section 14. Powers of Tau");
	let T = await e.readSection(l, d, 14), E = [];
	for (let e = 1; e <= f.nPublic; e++) {
		let t = _.slice(e * m.n8, e * m.n8 + m.n8);
		E.push(u.fromRprLE(t));
	}
	r && r.debug(""), r && r.debug("> ROUND 1"), await j(), r && r.debug("> ROUND 2"), await N(), r && r.debug("> ROUND 3"), await F(), r && r.debug("> ROUND 4"), await ee(), r && r.debug("> ROUND 5"), await L(), await l.close(), await a.close();
	let D = C.toObjectProof(!1);
	return D.protocol = "plonk", D.curve = p.name, r && r.debug("PLONK PROVER FINISHED"), {
		proof: Nr(D),
		publicSignals: Nr(E)
	};
	async function O() {
		r && r.debug("··· Computing additions");
		let t = await e.readSection(l, d, 3), n = 8 + h * 2;
		for (let e = 0; e < f.nAdditions; e++) {
			r && e !== 0 && e % 1e5 == 0 && r.debug(`    addition ${e}/${f.nAdditions}`);
			let i = e * n, a = k(t, i);
			i += 4;
			let o = k(t, i);
			i += 4;
			let s = t.slice(i, i + h);
			i += h;
			let c = t.slice(i, i + h), l = A(a), u = A(o), d = m.add(m.mul(s, l), m.mul(c, u));
			v.set(d, h * e);
		}
	}
	function k(e, t) {
		let n = e.slice(t, t + 4);
		return new DataView(n.buffer, n.byteOffset, n.byteLength).getUint32(0, !0);
	}
	function A(e) {
		return e < f.nVars - f.nAdditions ? _.slice(e * h, e * h + h) : e < f.nVars ? v.slice((e - (f.nVars - f.nAdditions)) * h, (e - (f.nVars - f.nAdditions)) * h + h) : p.Fr.zero;
	}
	async function j() {
		S.b = [];
		for (let e = 1; e <= 11; e++) S.b[e] = p.Fr.random();
		r && r.debug("> Computing A, B, C wire polynomials"), await M(), r && r.debug("> Computing A, B, C MSM");
		let e = await b.A.multiExponentiation(T, "A"), t = await b.B.multiExponentiation(T, "B"), n = await b.C.multiExponentiation(T, "C");
		return C.addPolynomial("A", e), C.addPolynomial("B", t), C.addPolynomial("C", n), 0;
	}
	async function M() {
		r && r.debug("··· Reading data from zkey file"), y.A = new s(g), y.B = new s(g), y.C = new s(g);
		let t = await e.readSection(l, d, 4), n = await e.readSection(l, d, 5), i = await e.readSection(l, d, 6);
		for (let e = 0; e < f.nConstraints; e++) {
			let r = e * h, a = e * 4, o = k(t, a);
			y.A.set(A(o), r);
			let s = k(n, a);
			y.B.set(A(s), r);
			let c = k(i, a);
			y.C.set(A(c), r);
		}
		if (y.A = await m.batchToMontgomery(y.A), y.B = await m.batchToMontgomery(y.B), y.C = await m.batchToMontgomery(y.C), r && r.debug("··· Computing A ifft"), b.A = await Y.fromEvaluations(y.A, p, r), r && r.debug("··· Computing B ifft"), b.B = await Y.fromEvaluations(y.B, p, r), r && r.debug("··· Computing C ifft"), b.C = await Y.fromEvaluations(y.C, p, r), r && r.debug("··· Computing A fft"), x.A = await X.fromPolynomial(b.A, 4, p, r), r && r.debug("··· Computing B fft"), x.B = await X.fromPolynomial(b.B, 4, p, r), r && r.debug("··· Computing C fft"), x.C = await X.fromPolynomial(b.C, 4, p, r), b.A.blindCoefficients([S.b[2], S.b[1]]), b.B.blindCoefficients([S.b[4], S.b[3]]), b.C.blindCoefficients([S.b[6], S.b[5]]), b.A.degree() >= f.domainSize + 2) throw Error("A Polynomial is not well calculated");
		if (b.B.degree() >= f.domainSize + 2) throw Error("B Polynomial is not well calculated");
		if (b.C.degree() >= f.domainSize + 2) throw Error("C Polynomial is not well calculated");
	}
	async function N() {
		r && r.debug("> Computing challenges beta and gamma"), w.reset(), w.addPolCommitment(f.Qm), w.addPolCommitment(f.Ql), w.addPolCommitment(f.Qr), w.addPolCommitment(f.Qo), w.addPolCommitment(f.Qc), w.addPolCommitment(f.S1), w.addPolCommitment(f.S2), w.addPolCommitment(f.S3);
		for (let e = 0; e < f.nPublic; e++) w.addScalar(y.A.slice(e * h, e * h + h));
		w.addPolCommitment(C.getPolynomial("A")), w.addPolCommitment(C.getPolynomial("B")), w.addPolCommitment(C.getPolynomial("C")), S.beta = w.getChallenge(), r && r.debug("··· challenges.beta: " + m.toString(S.beta, 16)), w.reset(), w.addScalar(S.beta), S.gamma = w.getChallenge(), r && r.debug("··· challenges.gamma: " + m.toString(S.gamma, 16)), r && r.debug("> Computing Z polynomial"), await P(), r && r.debug("> Computing Z MSM");
		let e = await b.Z.multiExponentiation(T, "Z");
		C.addPolynomial("Z", e);
	}
	async function P() {
		r && r.debug("··· Computing Z evaluations");
		let e = new s(g), t = new s(g);
		e.set(m.one, 0), t.set(m.one, 0);
		let n = m.one;
		for (let r = 0; r < f.domainSize; r++) {
			let i = r * h, a = y.A.slice(i, i + h), o = y.B.slice(i, i + h), s = y.C.slice(i, i + h), c = m.mul(S.beta, n), l = m.add(a, c);
			l = m.add(l, S.gamma);
			let u = m.add(o, m.mul(f.k1, c));
			u = m.add(u, S.gamma);
			let d = m.add(s, m.mul(f.k2, c));
			d = m.add(d, S.gamma);
			let p = m.mul(l, m.mul(u, d)), g = m.add(a, m.mul(x.Sigma1.getEvaluation(r * 4), S.beta));
			g = m.add(g, S.gamma);
			let _ = m.add(o, m.mul(x.Sigma2.getEvaluation(r * 4), S.beta));
			_ = m.add(_, S.gamma);
			let v = m.add(s, m.mul(x.Sigma3.getEvaluation(r * 4), S.beta));
			v = m.add(v, S.gamma);
			let b = m.mul(g, m.mul(_, v));
			p = m.mul(e.slice(i, i + h), p), e.set(p, (r + 1) % f.domainSize * h), b = m.mul(t.slice(i, i + h), b), t.set(b, (r + 1) % f.domainSize * h), n = m.mul(n, m.w[f.power]);
		}
		t = await m.batchInverse(t);
		for (let n = 0; n < f.domainSize; n++) {
			let r = n * h, i = m.mul(e.slice(r, r + h), t.slice(r, r + h));
			e.set(i, r);
		}
		if (y.Z = e, !m.eq(e.slice(0, h), m.one)) throw Error("Copy constraints does not match");
		if (r && r.debug("··· Computing Z ifft"), b.Z = await Y.fromEvaluations(y.Z, p, r), r && r.debug("··· Computing Z fft"), x.Z = await X.fromPolynomial(b.Z, 4, p, r), b.Z.blindCoefficients([
			S.b[9],
			S.b[8],
			S.b[7]
		]), b.Z.degree() >= f.domainSize + 3) throw Error("Z Polynomial is not well calculated");
		delete y.Z;
	}
	async function F() {
		r && r.debug("> Computing challenge alpha"), w.reset(), w.addScalar(S.beta), w.addScalar(S.gamma), w.addPolCommitment(C.getPolynomial("Z")), S.alpha = w.getChallenge(), S.alpha2 = m.square(S.alpha), r && r.debug("··· challenges.alpha: " + m.toString(S.alpha, 16)), r && r.debug("> Computing T polynomial"), await I(), r && r.debug("> Computing T MSM");
		let e = await b.T1.multiExponentiation(T, "T1"), t = await b.T2.multiExponentiation(T, "T2"), n = await b.T3.multiExponentiation(T, "T3");
		C.addPolynomial("T1", e), C.addPolynomial("T2", t), C.addPolynomial("T3", n);
	}
	async function I() {
		r && r.debug("··· Reading sections 8, 9, 7, 10, 11. Q selectors"), x.QL = new X(new s(g * 4), p, r), x.QR = new X(new s(g * 4), p, r), x.QM = new X(new s(g * 4), p, r), x.QO = new X(new s(g * 4), p, r), x.QC = new X(new s(g * 4), p, r), await l.readToBuffer(x.QL.eval, 0, g * 4, d[8][0].p + g), await l.readToBuffer(x.QR.eval, 0, g * 4, d[9][0].p + g), await l.readToBuffer(x.QM.eval, 0, g * 4, d[7][0].p + g), await l.readToBuffer(x.QO.eval, 0, g * 4, d[10][0].p + g), await l.readToBuffer(x.QC.eval, 0, g * 4, d[11][0].p + g), x.Lagrange = new X(new s(g * 4 * f.nPublic), p, r);
		for (let e = 0; e < f.nPublic; e++) await l.readToBuffer(x.Lagrange.eval, e * g * 4, g * 4, d[13][0].p + e * 5 * g + g);
		y.T = new s(g * 4), y.Tz = new s(g * 4), r && r.debug("··· Computing T evaluations");
		let e = m.one;
		for (let t = 0; t < f.domainSize * 4; t++) {
			r && t !== 0 && t % 1e5 == 0 && r.debug(`      T evaluation ${t}/${f.domainSize * 4}`);
			let n = x.A.getEvaluation(t), i = x.B.getEvaluation(t), a = x.C.getEvaluation(t), o = x.Z.getEvaluation(t), s = x.Z.getEvaluation((f.domainSize * 4 + 4 + t) % (f.domainSize * 4)), c = x.QM.getEvaluation(t), l = x.QL.getEvaluation(t), u = x.QR.getEvaluation(t), d = x.QO.getEvaluation(t), p = x.QC.getEvaluation(t), g = x.Sigma1.getEvaluation(t), _ = x.Sigma2.getEvaluation(t), v = x.Sigma3.getEvaluation(t), b = m.add(S.b[2], m.mul(S.b[1], e)), C = m.add(S.b[4], m.mul(S.b[3], e)), w = m.add(S.b[6], m.mul(S.b[5], e)), T = m.square(e), E = m.add(m.add(m.mul(S.b[7], T), m.mul(S.b[8], e)), S.b[9]), D = m.mul(e, m.w[f.power]), O = m.square(D), k = m.add(m.add(m.mul(S.b[7], O), m.mul(S.b[8], D)), S.b[9]), A = m.zero;
			for (let e = 0; e < f.nPublic; e++) {
				let n = e * 4 * f.domainSize + t, r = x.Lagrange.getEvaluation(n), i = y.A.slice(e * h, (e + 1) * h);
				A = m.sub(A, m.mul(r, i));
			}
			let [j, M] = Mr.mul2(n, i, b, C, t % 4, m);
			j = m.mul(j, c), M = m.mul(M, c), j = m.add(j, m.mul(n, l)), M = m.add(M, m.mul(b, l)), j = m.add(j, m.mul(i, u)), M = m.add(M, m.mul(C, u)), j = m.add(j, m.mul(a, d)), M = m.add(M, m.mul(w, d)), j = m.add(j, A), j = m.add(j, p);
			let N = m.mul(S.beta, e), P = n;
			P = m.add(P, N), P = m.add(P, S.gamma);
			let F = i;
			F = m.add(F, m.mul(N, f.k1)), F = m.add(F, S.gamma);
			let I = a;
			I = m.add(I, m.mul(N, f.k2)), I = m.add(I, S.gamma);
			let ee = o, [L, R] = Mr.mul4(P, F, I, ee, b, C, w, E, t % 4, m);
			L = m.mul(L, S.alpha), R = m.mul(R, S.alpha);
			let z = n;
			z = m.add(z, m.mul(S.beta, g)), z = m.add(z, S.gamma);
			let B = i;
			B = m.add(B, m.mul(S.beta, _)), B = m.add(B, S.gamma);
			let te = a;
			te = m.add(te, m.mul(S.beta, v)), te = m.add(te, S.gamma);
			let ne = s, [V, H] = Mr.mul4(z, B, te, ne, b, C, w, k, t % 4, m);
			V = m.mul(V, S.alpha), H = m.mul(H, S.alpha);
			let re = m.sub(o, m.one);
			re = m.mul(re, x.Lagrange.getEvaluation(t)), re = m.mul(re, S.alpha2);
			let ie = m.mul(E, x.Lagrange.getEvaluation(t));
			ie = m.mul(ie, S.alpha2);
			let ae = m.add(m.sub(m.add(j, L), V), re), oe = m.add(m.sub(m.add(M, R), H), ie);
			y.T.set(ae, t * h), y.Tz.set(oe, t * h), e = m.mul(e, m.w[f.power + 2]);
		}
		if (r && r.debug("··· Computing T ifft"), b.T = await Y.fromEvaluations(y.T, p, r), r && r.debug("··· Computing T / ZH"), b.T.divZh(f.domainSize, 4), r && r.debug("··· Computing Tz ifft"), b.Tz = await Y.fromEvaluations(y.Tz, p, r), b.T.add(b.Tz), b.T.degree() >= f.domainSize * 3 + 6) throw Error("T Polynomial is not well calculated");
		r && r.debug("··· Computing T1, T2, T3 polynomials"), b.T1 = new Y(new s((f.domainSize + 1) * h), p, r), b.T2 = new Y(new s((f.domainSize + 1) * h), p, r), b.T3 = new Y(new s((f.domainSize + 6) * h), p, r), b.T1.coef.set(b.T.coef.slice(0, g), 0), b.T2.coef.set(b.T.coef.slice(g, g * 2), 0), b.T3.coef.set(b.T.coef.slice(g * 2, g * 3 + 6 * h), 0), b.T1.setCoef(f.domainSize, S.b[10]);
		let t = m.sub(b.T2.getCoef(0), S.b[10]);
		b.T2.setCoef(0, t), b.T2.setCoef(f.domainSize, S.b[11]);
		let n = m.sub(b.T3.getCoef(0), S.b[11]);
		b.T3.setCoef(0, n);
	}
	async function ee() {
		r && r.debug("> Computing challenge xi"), w.reset(), w.addScalar(S.alpha), w.addPolCommitment(C.getPolynomial("T1")), w.addPolCommitment(C.getPolynomial("T2")), w.addPolCommitment(C.getPolynomial("T3")), S.xi = w.getChallenge(), S.xiw = m.mul(S.xi, m.w[f.power]), r && r.debug("··· challenges.xi: " + m.toString(S.xi, 16)), C.addEvaluation("eval_a", b.A.evaluate(S.xi)), C.addEvaluation("eval_b", b.B.evaluate(S.xi)), C.addEvaluation("eval_c", b.C.evaluate(S.xi)), C.addEvaluation("eval_s1", b.Sigma1.evaluate(S.xi)), C.addEvaluation("eval_s2", b.Sigma2.evaluate(S.xi)), C.addEvaluation("eval_zw", b.Z.evaluate(S.xiw));
	}
	async function L() {
		r && r.debug("> Computing challenge v"), w.reset(), w.addScalar(S.xi), w.addScalar(C.getEvaluation("eval_a")), w.addScalar(C.getEvaluation("eval_b")), w.addScalar(C.getEvaluation("eval_c")), w.addScalar(C.getEvaluation("eval_s1")), w.addScalar(C.getEvaluation("eval_s2")), w.addScalar(C.getEvaluation("eval_zw")), S.v = [], S.v[1] = w.getChallenge(), r && r.debug("··· challenges.v: " + m.toString(S.v[1], 16));
		for (let e = 2; e < 6; e++) S.v[e] = m.mul(S.v[e - 1], S.v[1]);
		r && r.debug("> Computing linearisation polynomial R(X)"), await R(), r && r.debug("> Computing opening proof polynomial Wxi(X) polynomial"), z(), r && r.debug("> Computing opening proof polynomial Wxiw(X) polynomial"), B(), r && r.debug("> Computing Wxi, Wxiw MSM");
		let e = await b.Wxi.multiExponentiation(T, "Wxi"), t = await b.Wxiw.multiExponentiation(T, "Wxiw");
		C.addPolynomial("Wxi", e), C.addPolynomial("Wxiw", t);
	}
	async function R() {
		let e = p.Fr;
		b.QL = new Y(new s(g), p, r), b.QR = new Y(new s(g), p, r), b.QM = new Y(new s(g), p, r), b.QO = new Y(new s(g), p, r), b.QC = new Y(new s(g), p, r), await l.readToBuffer(b.QL.coef, 0, g, d[8][0].p), await l.readToBuffer(b.QR.coef, 0, g, d[9][0].p), await l.readToBuffer(b.QM.coef, 0, g, d[7][0].p), await l.readToBuffer(b.QO.coef, 0, g, d[10][0].p), await l.readToBuffer(b.QC.coef, 0, g, d[11][0].p), S.xin = S.xi;
		for (let t = 0; t < f.power; t++) S.xin = e.square(S.xin);
		S.zh = e.sub(S.xin, e.one);
		let t = [], n = e.e(f.domainSize), i = e.one;
		for (let r = 1; r <= Math.max(1, f.nPublic); r++) t[r] = e.div(e.mul(i, S.zh), e.mul(n, e.sub(S.xi, i))), i = e.mul(i, e.w[f.power]);
		let a = e.div(e.sub(S.xin, e.one), e.mul(n, e.sub(S.xi, e.one)));
		if (r) {
			r.debug("Lagrange Evaluations: ");
			for (let n = 1; n < t.length; n++) r.debug(`L${n}(xi)=` + e.toString(t[n], 16));
		}
		let o = e.zero;
		for (let n = 0; n < E.length; n++) {
			let r = e.e(E[n]);
			o = e.sub(o, e.mul(r, t[n + 1]));
		}
		r && r.debug("PI: " + e.toString(o, 16));
		let c = e.mul(C.evaluations.eval_a, C.evaluations.eval_b), u = C.evaluations.eval_a, m = e.mul(S.beta, S.xi);
		u = e.add(u, m), u = e.add(u, S.gamma);
		let _ = C.evaluations.eval_b;
		_ = e.add(_, e.mul(m, f.k1)), _ = e.add(_, S.gamma);
		let v = C.evaluations.eval_c;
		v = e.add(v, e.mul(m, f.k2)), v = e.add(v, S.gamma);
		let y = e.mul(e.mul(e.mul(u, _), v), S.alpha), x = C.evaluations.eval_a;
		x = e.add(x, e.mul(S.beta, C.evaluations.eval_s1)), x = e.add(x, S.gamma);
		let w = C.evaluations.eval_b;
		w = e.add(w, e.mul(S.beta, C.evaluations.eval_s2)), w = e.add(w, S.gamma);
		let T = e.mul(x, w);
		T = e.mul(T, C.evaluations.eval_zw), T = e.mul(T, S.alpha);
		let D = e.mul(a, S.alpha2);
		b.R = new Y(new s((f.domainSize + 6) * h), p, r), b.R.add(b.QM, c), b.R.add(b.QL, C.evaluations.eval_a), b.R.add(b.QR, C.evaluations.eval_b), b.R.add(b.QO, C.evaluations.eval_c), b.R.add(b.QC), b.R.add(b.Z, y), b.R.sub(b.Sigma3, e.mul(T, S.beta)), b.R.add(b.Z, D);
		let O = Y.fromPolynomial(b.T3, p, r);
		O.mulScalar(e.square(S.xin)), O.add(b.T2, S.xin), O.add(b.T1), O.mulScalar(S.zh), b.R.sub(O);
		let k = e.sub(o, e.mul(T, e.add(C.evaluations.eval_c, S.gamma)));
		k = e.sub(k, D), r && r.debug("r0: " + e.toString(k, 16)), b.R.addScalar(k);
	}
	function z() {
		b.Wxi = new Y(new s(g + 6 * h), p, r), b.Wxi.add(b.R), b.Wxi.add(b.A, S.v[1]), b.Wxi.add(b.B, S.v[2]), b.Wxi.add(b.C, S.v[3]), b.Wxi.add(b.Sigma1, S.v[4]), b.Wxi.add(b.Sigma2, S.v[5]), b.Wxi.subScalar(m.mul(S.v[1], C.evaluations.eval_a)), b.Wxi.subScalar(m.mul(S.v[2], C.evaluations.eval_b)), b.Wxi.subScalar(m.mul(S.v[3], C.evaluations.eval_c)), b.Wxi.subScalar(m.mul(S.v[4], C.evaluations.eval_s1)), b.Wxi.subScalar(m.mul(S.v[5], C.evaluations.eval_s2)), b.Wxi.divByZerofier(1, S.xi);
	}
	async function B() {
		b.Wxiw = Y.fromPolynomial(b.Z, p, r), b.Wxiw.subScalar(C.evaluations.eval_zw), b.Wxiw.divByZerofier(1, S.xiw);
	}
}
//#endregion
//#region src/plonk_fullprove.js
var { unstringifyBigInts: Fr } = p;
async function Ir(e, t, n, r, i, a) {
	let o = Fr(e), s = { type: "mem" };
	return await Vt(o, t, s, i), await Pr(n, s, r, a);
}
//#endregion
//#region src/plonk_verify.js
var { unstringifyBigInts: Lr } = p;
async function Rr(e, t, n, r) {
	let i = Lr(e);
	n = Lr(n);
	let a = Lr(t), o = await E(i.curve), s = o.Fr, c = o.G1;
	r && r.info("PLONK VERIFIER STARTED");
	let l = zr(o, n);
	if (i = Br(o, i), !Vr(o, l)) return r.error("Proof commitments are not valid."), !1;
	if (a.length != i.nPublic) return r && r.error("Invalid number of public inputs"), !1;
	if (!Wr(o, l)) return r && r.error("Proof evaluations are not valid"), !1;
	if (!Gr(o, a)) return r && r.error("Public inputs are not valid."), !1;
	let u = Kr(o, l, a, i);
	if (r) {
		r.debug("beta: " + s.toString(u.beta, 16)), r.debug("gamma: " + s.toString(u.gamma, 16)), r.debug("alpha: " + s.toString(u.alpha, 16)), r.debug("xi: " + s.toString(u.xi, 16));
		for (let e = 1; e < 6; e++) r && r.debug("v: " + s.toString(u.v[e], 16));
		r.debug("u: " + s.toString(u.u, 16));
	}
	let d = qr(o, u, i);
	if (r) for (let e = 1; e < d.length; e++) r.debug(`L${e}(xi)=` + s.toString(d[e], 16));
	if (a.length != i.nPublic) return r.error("Number of public signals does not match with vk"), !1;
	let f = Jr(o, a, d);
	r && r.debug("PI(xi): " + s.toString(f, 16));
	let p = Yr(o, l, u, f, d[1]);
	r && r.debug("r0: " + s.toString(p, 16));
	let m = Xr(o, l, u, i, d[1]);
	r && r.debug("D: " + c.toString(c.toAffine(m), 16));
	let h = Zr(o, l, u, i, m);
	r && r.debug("F: " + c.toString(c.toAffine(h), 16));
	let g = Qr(o, l, u, p);
	r && r.debug("E: " + c.toString(c.toAffine(g), 16));
	let _ = await $r(o, l, u, i, g, h);
	return r && (_ ? r.info("OK!") : r.warn("Invalid Proof")), _;
}
function zr(e, t) {
	let n = e.G1, r = e.Fr, i = {};
	return i.A = n.fromObject(t.A), i.B = n.fromObject(t.B), i.C = n.fromObject(t.C), i.Z = n.fromObject(t.Z), i.T1 = n.fromObject(t.T1), i.T2 = n.fromObject(t.T2), i.T3 = n.fromObject(t.T3), i.eval_a = r.fromObject(t.eval_a), i.eval_b = r.fromObject(t.eval_b), i.eval_c = r.fromObject(t.eval_c), i.eval_zw = r.fromObject(t.eval_zw), i.eval_s1 = r.fromObject(t.eval_s1), i.eval_s2 = r.fromObject(t.eval_s2), i.Wxi = n.fromObject(t.Wxi), i.Wxiw = n.fromObject(t.Wxiw), i;
}
function Br(e, t) {
	let n = e.G1, r = e.G2, i = e.Fr, a = t;
	return a.Qm = n.fromObject(t.Qm), a.Ql = n.fromObject(t.Ql), a.Qr = n.fromObject(t.Qr), a.Qo = n.fromObject(t.Qo), a.Qc = n.fromObject(t.Qc), a.S1 = n.fromObject(t.S1), a.S2 = n.fromObject(t.S2), a.S3 = n.fromObject(t.S3), a.k1 = i.fromObject(t.k1), a.k2 = i.fromObject(t.k2), a.X_2 = r.fromObject(t.X_2), a;
}
function Vr(e, t) {
	let n = e.G1;
	return !(!n.isValid(t.A) || !n.isValid(t.B) || !n.isValid(t.C) || !n.isValid(t.Z) || !n.isValid(t.T1) || !n.isValid(t.T2) || !n.isValid(t.T3) || !n.isValid(t.Wxi) || !n.isValid(t.Wxiw));
}
function Hr(e, t) {
	return u.geq(t, 0) && u.lt(t, e.r);
}
function Ur(e, t) {
	return Hr(e, u.fromRprLE(t));
}
function Wr(e, t) {
	return Ur(e, t.eval_a) && Ur(e, t.eval_b) && Ur(e, t.eval_c) && Ur(e, t.eval_s1) && Ur(e, t.eval_s2) && Ur(e, t.eval_zw);
}
function Gr(e, t) {
	for (let n = 0; n < t.length; n++) if (!Hr(e, t[n])) return !1;
	return !0;
}
function Kr(e, t, n, r) {
	let i = e.Fr, a = {}, o = new jr(e);
	o.addPolCommitment(r.Qm), o.addPolCommitment(r.Ql), o.addPolCommitment(r.Qr), o.addPolCommitment(r.Qo), o.addPolCommitment(r.Qc), o.addPolCommitment(r.S1), o.addPolCommitment(r.S2), o.addPolCommitment(r.S3);
	for (let e = 0; e < n.length; e++) o.addScalar(i.e(n[e]));
	o.addPolCommitment(t.A), o.addPolCommitment(t.B), o.addPolCommitment(t.C), a.beta = o.getChallenge(), o.reset(), o.addScalar(a.beta), a.gamma = o.getChallenge(), o.reset(), o.addScalar(a.beta), o.addScalar(a.gamma), o.addPolCommitment(t.Z), a.alpha = o.getChallenge(), o.reset(), o.addScalar(a.alpha), o.addPolCommitment(t.T1), o.addPolCommitment(t.T2), o.addPolCommitment(t.T3), a.xi = o.getChallenge(), o.reset(), o.addScalar(a.xi), o.addScalar(t.eval_a), o.addScalar(t.eval_b), o.addScalar(t.eval_c), o.addScalar(t.eval_s1), o.addScalar(t.eval_s2), o.addScalar(t.eval_zw), a.v = [], a.v[1] = o.getChallenge();
	for (let e = 2; e < 6; e++) a.v[e] = i.mul(a.v[e - 1], a.v[1]);
	return o.reset(), o.addPolCommitment(t.Wxi), o.addPolCommitment(t.Wxiw), a.u = o.getChallenge(), a;
}
function qr(e, t, n) {
	let r = e.Fr, i = t.xi, a = 1;
	for (let e = 0; e < n.power; e++) i = r.square(i), a *= 2;
	t.xin = i, t.zh = r.sub(i, r.one);
	let o = [], s = r.e(a), c = r.one;
	for (let e = 1; e <= Math.max(1, n.nPublic); e++) o[e] = r.div(r.mul(c, t.zh), r.mul(s, r.sub(t.xi, c))), c = r.mul(c, r.w[n.power]);
	return o;
}
function Jr(e, t, n) {
	let r = e.Fr, i = r.zero;
	for (let e = 0; e < t.length; e++) {
		let a = r.e(t[e]);
		i = r.sub(i, r.mul(a, n[e + 1]));
	}
	return i;
}
function Yr(e, t, n, r, i) {
	let a = e.Fr, o = r, s = a.mul(i, a.square(n.alpha)), c = a.add(t.eval_a, a.mul(n.beta, t.eval_s1));
	c = a.add(c, n.gamma);
	let l = a.add(t.eval_b, a.mul(n.beta, t.eval_s2));
	l = a.add(l, n.gamma);
	let u = a.add(t.eval_c, n.gamma), d = a.mul(a.mul(c, l), u);
	return d = a.mul(d, t.eval_zw), d = a.mul(d, n.alpha), a.sub(a.sub(o, s), d);
}
function Xr(e, t, n, r, i) {
	let a = e.G1, o = e.Fr, s = a.timesFr(r.Qm, o.mul(t.eval_a, t.eval_b));
	s = a.add(s, a.timesFr(r.Ql, t.eval_a)), s = a.add(s, a.timesFr(r.Qr, t.eval_b)), s = a.add(s, a.timesFr(r.Qo, t.eval_c)), s = a.add(s, r.Qc);
	let c = o.mul(n.beta, n.xi), l = o.add(o.add(t.eval_a, c), n.gamma), u = o.add(o.add(t.eval_b, o.mul(c, r.k1)), n.gamma), d = o.add(o.add(t.eval_c, o.mul(c, r.k2)), n.gamma), f = o.mul(o.mul(o.mul(l, u), d), n.alpha), p = o.mul(i, o.square(n.alpha)), m = a.timesFr(t.Z, o.add(o.add(f, p), n.u)), h = o.add(o.add(t.eval_a, o.mul(n.beta, t.eval_s1)), n.gamma), g = o.add(o.add(t.eval_b, o.mul(n.beta, t.eval_s2)), n.gamma), _ = o.mul(o.mul(n.alpha, n.beta), t.eval_zw), v = a.timesFr(r.S3, o.mul(o.mul(h, g), _)), y = t.T1, b = a.timesFr(t.T2, n.xin), x = a.timesFr(t.T3, o.square(n.xin)), S = a.add(y, a.add(b, x));
	return S = a.timesFr(S, n.zh), a.sub(a.sub(a.add(s, m), v), S);
}
function Zr(e, t, n, r, i) {
	let a = e.G1, o = a.add(i, a.timesFr(t.A, n.v[1]));
	return o = a.add(o, a.timesFr(t.B, n.v[2])), o = a.add(o, a.timesFr(t.C, n.v[3])), o = a.add(o, a.timesFr(r.S1, n.v[4])), o = a.add(o, a.timesFr(r.S2, n.v[5])), o;
}
function Qr(e, t, n, r) {
	let i = e.G1, a = e.Fr, o = a.add(a.neg(r), a.mul(n.v[1], t.eval_a));
	return o = a.add(o, a.mul(n.v[2], t.eval_b)), o = a.add(o, a.mul(n.v[3], t.eval_c)), o = a.add(o, a.mul(n.v[4], t.eval_s1)), o = a.add(o, a.mul(n.v[5], t.eval_s2)), o = a.add(o, a.mul(n.u, t.eval_zw)), i.timesFr(i.one, o);
}
async function $r(e, t, n, r, i, a) {
	let o = e.G1, s = e.Fr, c = t.Wxi;
	c = o.add(c, o.timesFr(t.Wxiw, n.u));
	let l = o.timesFr(t.Wxi, n.xi), u = s.mul(s.mul(n.u, n.xi), s.w[r.power]);
	return l = o.add(l, o.timesFr(t.Wxiw, u)), l = o.add(l, a), l = o.sub(l, i), await e.pairingEq(o.neg(c), r.X_2, l, e.G2.one);
}
//#endregion
//#region src/plonk_exportsoliditycalldata.js
var { unstringifyBigInts: ei } = p;
function Z(e) {
	let t = e.toString(16);
	for (; t.length < 64;) t = "0" + t;
	return t = `"0x${t}"`, t;
}
async function ti(e, t) {
	let n = ei(e), r = ei(t);
	await E(n.curve);
	let i = "";
	for (let e = 0; e < r.length; e++) i != "" && (i += ","), i += Z(r[e]);
	return `[${Z(n.A[0])}, ${Z(n.A[1])},${Z(n.B[0])},${Z(n.B[1])},${Z(n.C[0])},${Z(n.C[1])},${Z(n.Z[0])},${Z(n.Z[1])},${Z(n.T1[0])},${Z(n.T1[1])},${Z(n.T2[0])},${Z(n.T2[1])},${Z(n.T3[0])},${Z(n.T3[1])},${Z(n.Wxi[0])},${Z(n.Wxi[1])},${Z(n.Wxiw[0])},${Z(n.Wxiw[1])},${Z(n.eval_a)},${Z(n.eval_b)},${Z(n.eval_c)},${Z(n.eval_s1)},${Z(n.eval_s2)},${Z(n.eval_zw)}][${i}]`;
}
//#endregion
//#region src/plonk.js
var ni = /* @__PURE__ */ v({
	exportSolidityCallData: () => ti,
	fullProve: () => Ir,
	prove: () => Pr,
	setup: () => ur,
	verify: () => Rr
});
//#endregion
//#region src/plonk_equation.js
function ri(e, t) {
	return [
		e,
		0,
		0,
		t.one,
		t.zero,
		t.zero,
		t.zero,
		t.zero
	];
}
function ii(e, t, n, r, i, a, o, s) {
	return [
		e,
		t,
		n,
		r,
		i,
		a,
		o,
		s
	];
}
function ai(e, t, n, r, i, a, o, s, c) {
	return [
		e,
		t,
		n,
		r,
		i,
		a,
		o,
		s
	];
}
//#endregion
//#region src/r1cs_constraint_processor.js
var oi = 0, si = 1, ci = 2, li = class {
	constructor(e, t, n, r, i) {
		this.Fr = e, this.logger = i, this.fnGetAdditionConstraint = n, this.fnGetMultiplicationConstraint = r;
	}
	processR1csConstraint(e, t, n, r) {
		this.normalizeLinearCombination(t), this.normalizeLinearCombination(n), this.normalizeLinearCombination(r);
		let i = this.getLinearCombinationType(t), a = this.getLinearCombinationType(n);
		if (i === oi || a === oi) return this.processR1csAdditionConstraint(e, r);
		if (i === si) {
			let i = this.joinLinearCombinations(n, r, t[0]);
			return this.processR1csAdditionConstraint(e, i);
		} else if (a === si) {
			let i = this.joinLinearCombinations(t, r, n[0]);
			return this.processR1csAdditionConstraint(e, i);
		} else return this.processR1csMultiplicationConstraint(e, t, n, r);
	}
	getLinearCombinationType(e) {
		let t = this.Fr.zero, n = 0, r = Object.keys(e);
		for (let i = 0; i < r.length; i++) e[r[i]] == 0n ? delete e[r[i]] : r[i] == 0 ? t = this.Fr.add(t, e[r[i]]) : n++;
		return n > 0 ? ci : this.Fr.isZero(t) ? oi : si;
	}
	normalizeLinearCombination(e) {
		let t = Object.keys(e);
		for (let n = 0; n < t.length; n++) this.Fr.isZero(e[t[n]]) && delete e[t[n]];
		return e;
	}
	joinLinearCombinations(e, t, n) {
		let r = {};
		for (let t in e) r[t] === void 0 ? r[t] = this.Fr.mul(n, e[t]) : r[t] = this.Fr.add(r[t], this.Fr.mul(n, e[t]));
		for (let e in t) r[e] === void 0 ? r[e] = t[e] : r[e] = this.Fr.add(r[e], t[e]);
		return this.normalizeLinearCombination(r);
	}
	reduceCoefs(e, t, n, r, i) {
		let a = {
			k: this.Fr.zero,
			signals: [],
			coefs: []
		}, o = [];
		for (let e in r) e == 0 ? a.k = this.Fr.add(a.k, r[e]) : r[e] != 0n && o.push([Number(e), r[e]]);
		for (; o.length > i;) {
			let r = o.shift(), i = o.shift(), a = e.nVars++, s = this.fnGetAdditionConstraint(r[0], i[0], a, this.Fr.neg(r[1]), this.Fr.neg(i[1]), this.Fr.zero, this.Fr.one, this.Fr.zero);
			t.push(s), n.push([
				r[0],
				i[0],
				r[1],
				i[1]
			]), o.push([a, this.Fr.one]);
		}
		for (let e = 0; e < o.length; e++) a.signals[e] = o[e][0], a.coefs[e] = o[e][1];
		for (; a.coefs.length < i;) a.signals.push(0), a.coefs.push(this.Fr.zero);
		return a;
	}
	processR1csAdditionConstraint(e, t) {
		let n = [], r = [], i = this.reduceCoefs(e, n, r, t, 3), a = this.fnGetAdditionConstraint(i.signals[0], i.signals[1], i.signals[2], i.coefs[0], i.coefs[1], this.Fr.zero, i.coefs[2], i.k);
		return n.push(a), [n, r];
	}
	processR1csMultiplicationConstraint(e, t, n, r) {
		let i = [], a = [], o = this.reduceCoefs(e, i, a, t, 1), s = this.reduceCoefs(e, i, a, n, 1), c = this.reduceCoefs(e, i, a, r, 1), l = this.fnGetMultiplicationConstraint(o.signals[0], s.signals[0], c.signals[0], this.Fr.mul(o.coefs[0], s.k), this.Fr.mul(o.k, s.coefs[0]), this.Fr.mul(o.coefs[0], s.coefs[0]), this.Fr.neg(c.coefs[0]), this.Fr.sub(this.Fr.mul(o.k, s.k), c.k));
		return i.push(l), [i, a];
	}
}, ui = class {
	constructor(e, t, n) {
		this.n = e, this.polynomials = Array(e).fill(void 0), this.curve = t, this.Fr = t.Fr, this.G1 = t.G1, this.logger = n;
	}
	addPolynomial(e, t) {
		if (e > this.n - 1) throw Error("CPolynomial:addPolynomial, cannot add a polynomial to a position greater than n-1");
		this.polynomials[e] = t;
	}
	degree() {
		let e = this.polynomials.map((e, t) => e === void 0 ? 0 : e.degree() * this.n + t);
		return Math.max(...e);
	}
	getPolynomial() {
		let e = this.polynomials.map((e) => e === void 0 ? 0 : e.degree()), t = this.degree(), n = 2 ** (Ce(t - 1) + 1), r = this.Fr.n8, i = new Y(new s(n * r), this.curve, this.logger);
		for (let n = 0; n < t; n++) {
			let t = n * r, a = t * this.n;
			for (let o = 0; o < this.n; o++) this.polynomials[o] !== void 0 && n <= e[o] && i.coef.set(this.polynomials[o].coef.slice(t, t + r), a + o * r);
		}
		return i;
	}
	async multiExponentiation(e, t) {
		let n = this.getPolynomial(), r = n.coef.byteLength / this.Fr.n8, i = e.slice(0, r * this.G1.F.n8 * 2), a = await this.Fr.batchFromMontgomery(n.coef), o = await this.G1.multiExpAffine(i, a, this.logger, t);
		return o = this.G1.toAffine(o), o;
	}
};
//#endregion
//#region src/fflonk_setup.js
async function di(i, c, l, d) {
	d && d.info("FFLONK SETUP STARTED"), globalThis.gc && globalThis.gc(), d && d.info("> Reading PTau file");
	let { fd: f, sections: p } = await r(c, "ptau", 1, 1 << 22, 1 << 24);
	if (!p[12]) throw Error("Powers of Tau is not well prepared. Section 12 missing.");
	d && d.info("> Getting curve from PTau settings");
	let { curve: m } = await an(f, p);
	d && d.info("> Reading r1cs file");
	let { fd: g, sections: _ } = await r(i, "r1cs", 1, 1 << 22, 1 << 24), v = await h(g, _, {
		loadConstraints: !1,
		loadCustomGates: !0
	});
	if (v.prime !== m.r) throw Error("r1cs curve does not match powers of tau ceremony curve");
	let y = m.Fr, b = m.Fr.n8, x = m.G1.F.n8 * 2, S = m.G2.F.n8 * 2, C = {}, w = {}, T, E = {
		nVars: v.nVars,
		nPublic: v.nOutputs + v.nPubInputs
	}, D = new qn(), O = new qn();
	if (d && d.info("> Processing FFlonk constraints"), await F(m.Fr, v, d), globalThis.gc && globalThis.gc(), E.cirPower = Math.max(3, Ce(D.length + 2 - 1) + 1), E.domainSize = 2 ** E.cirPower, p[2][0].size < (E.domainSize * 9 + 18) * x) throw Error("Powers of Tau is not big enough for this circuit size. Section 2 too small.");
	if (p[3][0].size < S) throw Error("Powers of Tau is not well prepared. Section 3 too small.");
	d && (d.info("----------------------------"), d.info("  FFLONK SETUP SETTINGS"), d.info(`  Curve:         ${m.name}`), d.info(`  Circuit power: ${E.cirPower}`), d.info(`  Domain size:   ${E.domainSize}`), d.info(`  Vars:          ${E.nVars}`), d.info(`  Public vars:   ${E.nPublic}`), d.info(`  Constraints:   ${D.length}`), d.info(`  Additions:     ${O.length}`), d.info("----------------------------")), d && d.info("> computing k1 and k2");
	let [k, A] = ie();
	d && d.info("> computing w3");
	let j = ae();
	d && d.info("> computing w4");
	let M = oe();
	d && d.info("> computing w8");
	let N = se();
	d && d.info("> computing wr");
	let P = ce(E.cirPower, m.Fr);
	return await I(), await g.close(), await f.close(), d && d.info("FFLONK SETUP FINISHED"), 0;
	async function F(t, n, r) {
		for (let e = 0; e < E.nPublic; e++) D.push(ri(e + 1, t));
		let i = new li(t, ri, ii, ai, r), a = await e.readSection(g, _, 2), o = 0;
		for (let e = 0; e < n.nConstraints; e++) {
			r && e !== 0 && e % 5e5 == 0 && r.info(`    processing r1cs constraints ${e}/${n.nConstraints}`);
			let [t, a] = i.processR1csConstraint(E, ...s());
			D.push(...t), O.push(...a);
		}
		function s() {
			let e = [];
			return e[0] = c(), e[1] = c(), e[2] = c(), e;
		}
		function c() {
			let e = {}, t = a.slice(o, o + 4);
			o += 4;
			let r = new DataView(t.buffer).getUint32(0, !0), i = a.slice(o, o + (4 + n.n8) * r);
			o += (4 + n.n8) * r;
			let s = new DataView(i.buffer);
			for (let t = 0; t < r; t++) {
				let r = s.getUint32(t * (4 + n.n8), !0);
				e[r] = n.F.fromRprLE(i, t * (4 + n.n8) + 4);
			}
			return e;
		}
		return 0;
	}
	async function I() {
		d && d.info("> Writing the zkey file");
		let e = await t(l, "zkey", 1, 17, 1 << 22, 1 << 24);
		d && d.info("··· Writing Section 1. Zkey Header"), await ee(e), d && d.info("··· Writing Section 3. Additions"), await L(e), globalThis.gc && globalThis.gc(), d && d.info("··· Writing Section 4. A Map"), await R(e, 4, 0, "A map"), globalThis.gc && globalThis.gc(), d && d.info("··· Writing Section 5. B Map"), await R(e, 5, 1, "B map"), globalThis.gc && globalThis.gc(), d && d.info("··· Writing Section 6. C Map"), await R(e, 6, 2, "C map"), globalThis.gc && globalThis.gc(), d && d.info("··· Writing Section 7. QL"), await z(e, 7, 3, "QL"), globalThis.gc && globalThis.gc(), d && d.info("··· Writing Section 8. QR"), await z(e, 8, 4, "QR"), globalThis.gc && globalThis.gc(), d && d.info("··· Writing Section 9. QM"), await z(e, 9, 5, "QM"), globalThis.gc && globalThis.gc(), d && d.info("··· Writing Section 10. QO"), await z(e, 10, 6, "QO"), globalThis.gc && globalThis.gc(), d && d.info("··· Writing Section 11. QC"), await z(e, 11, 7, "QC"), globalThis.gc && globalThis.gc(), d && d.info("··· Writing Sections 12,13,14. Sigma1, Sigma2 & Sigma 3"), await B(e), globalThis.gc && globalThis.gc(), d && d.info("··· Writing Section 15. Lagrange Polynomials"), await te(e), globalThis.gc && globalThis.gc(), d && d.info("··· Writing Section 16. Powers of Tau"), await ne(e), globalThis.gc && globalThis.gc(), d && d.info("··· Writing Section 17. C0"), await V(e), globalThis.gc && globalThis.gc(), d && d.info("··· Writing Section 2. FFlonk Header"), await H(e), globalThis.gc && globalThis.gc(), d && d.info("> Writing the zkey file finished"), await e.close();
	}
	async function ee(e) {
		await a(e, 1), await e.writeULE32(10), await n(e);
	}
	async function L(e) {
		await a(e, 3);
		let t = new Uint8Array(8 + 2 * b), r = new DataView(t.buffer);
		for (let n = 0; n < O.length; n++) {
			d && n !== 0 && n % 5e5 == 0 && d.info(`      writing Additions: ${n}/${O.length}`);
			let i = O[n];
			r.setUint32(0, i[0], !0), r.setUint32(4, i[1], !0), t.set(i[2], 8), t.set(i[3], 8 + b), await e.write(t);
		}
		await n(e);
	}
	async function R(e, t, r, i) {
		await a(e, t);
		for (let t = 0; t < D.length; t++) d && t !== 0 && t % 5e5 == 0 && d.info(`      writing witness ${i}: ${t}/${D.length}`), await e.writeULE32(D[t][r]);
		await n(e);
	}
	async function z(e, t, r, i) {
		let o = new s(E.domainSize * b);
		for (let e = 0; e < D.length; e++) o.set(D[e][r], e * b), d && e !== 0 && e % 5e5 == 0 && d.info(`      writing ${i}: ${e}/${D.length}`);
		C[i] = await Y.fromEvaluations(o, m, d), w[i] = await X.fromPolynomial(C[i], 4, m, d), await a(e, t), await e.write(C[i].coef), await e.write(w[i].eval), await n(e);
	}
	async function B(e) {
		let t = new s(b * E.domainSize * 3), r = new qn(E.nVars), i = new qn(E.nVars), o = y.one;
		for (let e = 0; e < E.domainSize; e++) e < D.length ? (c(D[e][0], e), c(D[e][1], E.domainSize + e), c(D[e][2], E.domainSize * 2 + e)) : e < E.domainSize - 2 ? (c(0, e), c(0, E.domainSize + e), c(0, E.domainSize * 2 + e)) : (t.set(o, e * b), t.set(y.mul(o, k), (E.domainSize + e) * b), t.set(y.mul(o, A), (E.domainSize * 2 + e) * b)), o = y.mul(o, y.w[E.cirPower]), d && e !== 0 && e % 5e5 == 0 && d.info(`      writing sigma phase1: ${e}/${D.length}`);
		for (let e = 0; e < E.nVars; e++) i[e] === void 0 ? console.log("Variable not used") : t.set(r[e], i[e] * b), d && e !== 0 && e % 5e5 == 0 && d.info(`      writing sigma phase2: ${e}/${E.nVars}`);
		globalThis.gc && globalThis.gc();
		for (let r = 0; r < 3; r++) {
			let i = r === 0 ? 12 : r === 1 ? 13 : 14, o = "S" + (r + 1);
			C[o] = await Y.fromEvaluations(t.slice(E.domainSize * b * r, E.domainSize * b * (r + 1)), m, d), w[o] = await X.fromPolynomial(C[o], 4, m, d), await a(e, i), await e.write(C[o].coef), await e.write(w[o].eval), await n(e), globalThis.gc && globalThis.gc();
		}
		return 0;
		function c(e, n) {
			r[e] === void 0 ? i[e] = n : t.set(r[e], n * b);
			let a;
			a = n < E.domainSize ? o : n < 2 * E.domainSize ? y.mul(o, k) : y.mul(o, A), r[e] = a;
		}
	}
	async function te(e) {
		await a(e, 15);
		let t = Math.max(E.nPublic, 1);
		for (let n = 0; n < t; n++) {
			let t = new s(E.domainSize * b);
			t.set(y.one, n * b), await re(e, t);
		}
		await n(e);
	}
	async function ne(e) {
		await a(e, 16), T = new s((E.domainSize * 9 + 18) * x), await f.readToBuffer(T, 0, (E.domainSize * 9 + 18) * x, p[2][0].p), await e.write(T), await n(e);
	}
	async function V(e) {
		let t = new ui(8, m, d);
		if (t.addPolynomial(0, C.QL), t.addPolynomial(1, C.QR), t.addPolynomial(2, C.QO), t.addPolynomial(3, C.QM), t.addPolynomial(4, C.QC), t.addPolynomial(5, C.S1), t.addPolynomial(6, C.S2), t.addPolynomial(7, C.S3), C.C0 = t.getPolynomial(), C.C0.degree() >= 8 * E.domainSize) throw Error("C0 Polynomial is not well calculated");
		await a(e, 17), await e.write(C.C0.coef), await n(e);
	}
	async function H(e) {
		await a(e, 2);
		let t = m.q, r = (Math.floor((u.bitLength(t) - 1) / 64) + 1) * 8;
		await e.writeULE32(r), await o(e, t, r);
		let i = m.r, s = (Math.floor((u.bitLength(i) - 1) / 64) + 1) * 8;
		await e.writeULE32(s), await o(e, i, s), await e.writeULE32(E.nVars), await e.writeULE32(E.nPublic), await e.writeULE32(E.domainSize), await e.writeULE32(O.length), await e.writeULE32(D.length), await e.write(k), await e.write(A), await e.write(j), await e.write(M), await e.write(N), await e.write(P);
		let c;
		c = await f.read(S, p[3][0].p + S), await e.write(c);
		let l = await C.C0.multiExponentiation(T, "C0");
		await e.write(l), await n(e);
	}
	async function re(e, t) {
		let [n, r] = await Y.to4T(t, E.domainSize, [], y);
		return await e.write(n), await e.write(r), [n, r];
	}
	function ie() {
		let e = y.two;
		for (; n(e, [], E.cirPower);) y.add(e, y.one);
		let t = y.add(e, y.one);
		for (; n(t, [e], E.cirPower);) y.add(t, y.one);
		return [e, t];
		function n(e, t, n) {
			let r = 2 ** n, i = y.one;
			for (let a = 0; a < r; a++) {
				if (y.eq(e, i)) return !0;
				for (let n = 0; n < t.length; n++) if (y.eq(e, y.mul(t[n], i))) return !0;
				i = y.mul(i, y.w[n]);
			}
			return !1;
		}
	}
	function ae() {
		let e = y.e(31624), t = u.div(3648040478639879203707734290876212514758060733402672390616367364429301415936n, u.e(3));
		return y.exp(e, t);
	}
	function oe() {
		return y.w[2];
	}
	function se() {
		return y.w[3];
	}
	function ce(e, t) {
		let n = t.e(467799165886069610036046866799264026481344299079011762026774533774345988080n);
		return t.exp(n, 2 ** (28 - e));
	}
}
//#endregion
//#region src/fflonk_prove.js
var { stringifyBigInts: fi } = p;
async function pi(t, n, r, i) {
	r && r.info("FFLONK PROVER STARTED"), r && r.info("> Reading witness file");
	let { fd: a, sections: o } = await e.readBinFile(n, "wtns", 2, 1 << 25, 1 << 23), c = await nt(a, o);
	r && r.info("> Reading zkey file");
	let { fd: l, sections: d } = await e.readBinFile(t, "zkey", 2, 1 << 25, 1 << 23), f = await He(l, d, void 0, i);
	if (f.protocolId !== 10) throw Error("zkey file is not fflonk");
	if (!u.eq(f.r, c.q)) throw Error("Curve of the witness does not match the curve of the proving key");
	if (c.nWitness !== f.nVars - f.nAdditions) throw Error(`Invalid witness length. Circuit: ${f.nVars}, witness: ${c.nWitness}, ${f.nAdditions}`);
	let p = f.curve, m = p.Fr, h = p.Fr.n8, g = p.G1.F.n8 * 2, _ = f.domainSize * h;
	r && (r.info("----------------------------"), r.info("  FFLONK PROVE SETTINGS"), r.info(`  Curve:         ${p.name}`), r.info(`  Circuit power: ${f.power}`), r.info(`  Domain size:   ${f.domainSize}`), r.info(`  Vars:          ${f.nVars}`), r.info(`  Public vars:   ${f.nPublic}`), r.info(`  Constraints:   ${f.nConstraints}`), r.info(`  Additions:     ${f.nAdditions}`), r.info("----------------------------")), r && r.info("> Reading witness file data");
	let v = await e.readSection(a, o, 2);
	await a.close(), v.set(m.zero, 0);
	let y = new s(f.nAdditions * h), b = {}, x = {}, S = {}, C = {}, w = {}, T = {}, E = new dr(p, r);
	r && r.info("> Reading Section 3. Additions"), await A(), r && r.info("> Reading Sections 12,13,14. Sigma1, Sigma2 & Sigma 3"), r && r.info("··· Reading Sigma polynomials "), x.Sigma1 = new Y(new s(_), p, r), x.Sigma2 = new Y(new s(_), p, r), x.Sigma3 = new Y(new s(_), p, r), await l.readToBuffer(x.Sigma1.coef, 0, _, d[12][0].p), await l.readToBuffer(x.Sigma2.coef, 0, _, d[13][0].p), await l.readToBuffer(x.Sigma3.coef, 0, _, d[14][0].p), r && r.info("··· Reading Sigma evaluations"), S.Sigma1 = new X(new s(_ * 4), p, r), S.Sigma2 = new X(new s(_ * 4), p, r), S.Sigma3 = new X(new s(_ * 4), p, r), await l.readToBuffer(S.Sigma1.eval, 0, _ * 4, d[12][0].p + _), await l.readToBuffer(S.Sigma2.eval, 0, _ * 4, d[13][0].p + _), await l.readToBuffer(S.Sigma3.eval, 0, _ * 4, d[14][0].p + _), r && r.info("> Reading Section 16. Powers of Tau");
	let D = new s(f.domainSize * 16 * g);
	await l.readToBuffer(D, 0, (f.domainSize * 9 + 18) * g, d[16][0].p), globalThis.gc && globalThis.gc(), r && r.info(""), r && r.info("> ROUND 1"), await N(), delete x.T0, delete S.QL, delete S.QR, delete S.QM, delete S.QO, delete S.QC, globalThis.gc && globalThis.gc(), r && r.info("> ROUND 2"), await P(), delete b.A, delete b.B, delete b.C, delete S.A, delete S.B, delete S.C, delete S.Sigma1, delete S.Sigma2, delete S.Sigma3, delete S.lagrange1, delete S.Z, globalThis.gc && globalThis.gc(), r && r.info("> ROUND 3"), await F(), delete x.A, delete x.B, delete x.C, delete x.Z, delete x.T1, delete x.T2, delete x.Sigma1, delete x.Sigma2, delete x.Sigma3, delete x.QL, delete x.QR, delete x.QM, delete x.QC, delete x.QO, globalThis.gc && globalThis.gc(), r && r.info("> ROUND 4"), await I(), globalThis.gc && globalThis.gc(), r && r.info("> ROUND 5"), await ee(), delete x.C0, delete x.C1, delete x.C2, delete x.R1, delete x.R2, delete x.F, delete x.L, delete x.ZT, delete x.ZTS2, await l.close(), globalThis.gc && globalThis.gc(), E.addEvaluation("inv", L());
	let O = E.toObjectProof();
	O.protocol = "fflonk", O.curve = p.name;
	let k = [];
	for (let e = 1; e <= f.nPublic; e++) {
		let t = e * h, n = v.slice(t, t + h);
		k.push(u.fromRprLE(n));
	}
	return r && r.info("FFLONK PROVER FINISHED"), {
		proof: fi(O),
		publicSignals: fi(k)
	};
	async function A() {
		r && r.info("··· Computing additions");
		let t = await e.readSection(l, d, 3), n = 8 + h * 2;
		for (let e = 0; e < f.nAdditions; e++) {
			r && e !== 0 && e % 1e5 == 0 && r.info(`    addition ${e}/${f.nAdditions}`);
			let i = e * n, a = j(t, i);
			i += 4;
			let o = j(t, i);
			i += 4;
			let s = t.slice(i, i + h);
			i += h;
			let c = t.slice(i, i + h), l = M(a), u = M(o), d = m.add(m.mul(s, l), m.mul(c, u));
			y.set(d, h * e);
		}
	}
	function j(e, t) {
		let n = e.slice(t, t + 4);
		return new DataView(n.buffer, n.byteOffset, n.byteLength).getUint32(0, !0);
	}
	function M(e) {
		let t = f.nVars - f.nAdditions;
		if (e < t) return v.slice(e * h, e * h + h);
		if (e < f.nVars) {
			let n = (e - t) * h;
			return y.slice(n, n + h);
		}
		return m.zero;
	}
	async function N() {
		w.b = [];
		for (let e = 1; e <= 9; e++) w.b[e] = m.random();
		r && r.info("> Computing A, B, C wire polynomials"), await n(), r && r.info("> Computing T0 polynomial"), await i(), r && r.info("> Computing C1 polynomial"), await a(), r && r.info("> Computing C1 multi exponentiation");
		let t = await x.C1.multiExponentiation(D, "C1");
		return E.addPolynomial("C1", t), 0;
		async function n() {
			r && r.info("··· Reading data from zkey file"), b.A = new s(_), b.B = new s(_), b.C = new s(_);
			let t = await e.readSection(l, d, 4), n = await e.readSection(l, d, 5), i = await e.readSection(l, d, 6);
			for (let e = 0; e < f.nConstraints; e++) {
				let r = e * h, a = e * 4, o = j(t, a);
				b.A.set(M(o), r);
				let s = j(n, a);
				b.B.set(M(s), r);
				let c = j(i, a);
				b.C.set(M(c), r);
			}
			if (b.A.set(w.b[1], _ - 64), b.A.set(w.b[2], _ - 32), b.B.set(w.b[3], _ - 64), b.B.set(w.b[4], _ - 32), b.C.set(w.b[5], _ - 64), b.C.set(w.b[6], _ - 32), b.A = await m.batchToMontgomery(b.A), b.B = await m.batchToMontgomery(b.B), b.C = await m.batchToMontgomery(b.C), r && r.info("··· Computing A ifft"), x.A = await Y.fromEvaluations(b.A, p, r), r && r.info("··· Computing B ifft"), x.B = await Y.fromEvaluations(b.B, p, r), r && r.info("··· Computing C ifft"), x.C = await Y.fromEvaluations(b.C, p, r), r && r.info("··· Computing A fft"), S.A = await X.fromPolynomial(x.A, 4, p, r), r && r.info("··· Computing B fft"), S.B = await X.fromPolynomial(x.B, 4, p, r), r && r.info("··· Computing C fft"), S.C = await X.fromPolynomial(x.C, 4, p, r), x.A.degree() >= f.domainSize) throw Error("A Polynomial is not well calculated");
			if (x.B.degree() >= f.domainSize) throw Error("B Polynomial is not well calculated");
			if (x.C.degree() >= f.domainSize) throw Error("C Polynomial is not well calculated");
		}
		async function i() {
			r && r.info("··· Reading sections 7, 8, 9, 10, 11. Q selectors"), S.QL = new X(new s(_ * 4), p, r), S.QR = new X(new s(_ * 4), p, r), S.QM = new X(new s(_ * 4), p, r), S.QO = new X(new s(_ * 4), p, r), S.QC = new X(new s(_ * 4), p, r), await l.readToBuffer(S.QL.eval, 0, _ * 4, d[7][0].p + _), await l.readToBuffer(S.QR.eval, 0, _ * 4, d[8][0].p + _), await l.readToBuffer(S.QM.eval, 0, _ * 4, d[9][0].p + _), await l.readToBuffer(S.QO.eval, 0, _ * 4, d[10][0].p + _), await l.readToBuffer(S.QC.eval, 0, _ * 4, d[11][0].p + _), S.lagrange1 = new X(await e.readSection(l, d, 15), p, r), b.T0 = new s(_ * 4), r && r.info("··· Computing T0 evaluations");
			for (let e = 0; e < f.domainSize * 4; e++) {
				r && e !== 0 && e % 1e5 == 0 && r.info(`      T0 evaluation ${e}/${f.domainSize * 4}`);
				let t = S.A.getEvaluation(e), n = S.B.getEvaluation(e), i = S.C.getEvaluation(e), a = S.QL.getEvaluation(e), o = S.QR.getEvaluation(e), s = S.QM.getEvaluation(e), c = S.QO.getEvaluation(e), l = S.QC.getEvaluation(e), u = m.zero;
				for (let t = 0; t < f.nPublic; t++) {
					let n = t * 5 * f.domainSize + f.domainSize + e, r = S.lagrange1.getEvaluation(n), i = b.A.slice(t * h, (t + 1) * h);
					u = m.sub(u, m.mul(r, i));
				}
				let d = m.mul(t, a), p = m.mul(n, o), g = m.mul(m.mul(t, n), s), _ = m.mul(i, c), v = m.add(d, m.add(p, m.add(g, m.add(_, m.add(l, u)))));
				b.T0.set(v, e * h);
			}
			if (r && r.info("buffer T0: " + b.T0.byteLength / h), r && r.info("··· Computing T0 ifft"), x.T0 = await Y.fromEvaluations(b.T0, p, r), r && r.info("T0 length: " + x.T0.length()), r && r.info("T0 degree: " + x.T0.degree()), r && r.info("··· Computing T0 / ZH"), x.T0.divByZerofier(f.domainSize, m.one), x.T0.degree() >= 2 * f.domainSize - 2) throw Error(`T0 Polynomial is not well calculated (degree is ${x.T0.degree()} and must be less than ${2 * f.domainSize + 2}`);
			delete b.T0;
		}
		async function a() {
			let e = new ui(4, p, r);
			if (e.addPolynomial(0, x.A), e.addPolynomial(1, x.B), e.addPolynomial(2, x.C), e.addPolynomial(3, x.T0), x.C1 = e.getPolynomial(), x.C1.degree() >= 8 * f.domainSize - 8) throw Error("C1 Polynomial is not well calculated");
		}
	}
	async function P() {
		r && r.info("> Computing challenges beta and gamma");
		let e = new jr(p);
		e.addPolCommitment(f.C0);
		for (let t = 0; t < f.nPublic; t++) e.addScalar(b.A.slice(t * h, t * h + h));
		e.addPolCommitment(E.getPolynomial("C1")), w.beta = e.getChallenge(), r && r.info("··· challenges.beta: " + m.toString(w.beta)), e.reset(), e.addScalar(w.beta), w.gamma = e.getChallenge(), r && r.info("··· challenges.gamma: " + m.toString(w.gamma)), r && r.info("> Computing Z polynomial"), await n(), r && r.info("> Computing T1 polynomial"), await i(), r && r.info("> Computing T2 polynomial"), await a(), r && r.info("> Computing C2 polynomial"), await o(), r && r.info("> Computing C2 multi exponentiation");
		let t = await x.C2.multiExponentiation(D, "C2");
		return E.addPolynomial("C2", t), 0;
		async function n() {
			r && r.info("··· Computing Z evaluations");
			let e = new s(_), t = new s(_);
			e.set(m.one, 0), t.set(m.one, 0);
			let n = m.one;
			for (let i = 0; i < f.domainSize; i++) {
				r && i !== 0 && i % 1e5 == 0 && r.info(`    Z evaluation ${i}/${f.domainSize}`);
				let a = i * h, o = m.mul(w.beta, n), s = b.A.slice(a, a + h);
				s = m.add(s, o), s = m.add(s, w.gamma);
				let c = b.B.slice(a, a + h);
				c = m.add(c, m.mul(f.k1, o)), c = m.add(c, w.gamma);
				let l = b.C.slice(a, a + h);
				l = m.add(l, m.mul(f.k2, o)), l = m.add(l, w.gamma);
				let u = m.mul(s, m.mul(c, l)), d = b.A.slice(a, a + h);
				d = m.add(d, m.mul(w.beta, S.Sigma1.getEvaluation(i * 4))), d = m.add(d, w.gamma);
				let p = b.B.slice(a, a + h);
				p = m.add(p, m.mul(w.beta, S.Sigma2.getEvaluation(i * 4))), p = m.add(p, w.gamma);
				let g = b.C.slice(a, a + h);
				g = m.add(g, m.mul(w.beta, S.Sigma3.getEvaluation(i * 4))), g = m.add(g, w.gamma);
				let _ = m.mul(d, m.mul(p, g));
				u = m.mul(e.slice(a, a + h), u), e.set(u, (i + 1) % f.domainSize * h), _ = m.mul(t.slice(a, a + h), _), t.set(_, (i + 1) % f.domainSize * h), n = m.mul(n, m.w[f.power]);
			}
			t = await m.batchInverse(t);
			for (let n = 0; n < f.domainSize; n++) {
				let r = n * h, i = m.mul(e.slice(r, r + h), t.slice(r, r + h));
				e.set(i, r);
			}
			if (b.Z = e, !m.eq(e.slice(0, h), m.one)) throw Error("Copy constraints does not match");
			if (r && r.info("··· Computing Z ifft"), x.Z = await Y.fromEvaluations(b.Z, p, r), r && r.info("··· Computing Z fft"), S.Z = await X.fromPolynomial(x.Z, 4, p, r), x.Z.blindCoefficients([
				w.b[9],
				w.b[8],
				w.b[7]
			]), x.Z.degree() >= f.domainSize + 3) throw Error("Z Polynomial is not well calculated");
			delete b.Z;
		}
		async function i() {
			r && r.info("··· Computing T1 evaluations"), b.T1 = new s(_ * 2), b.T1z = new s(_ * 2);
			let e = m.one;
			for (let t = 0; t < f.domainSize * 2; t++) {
				r && t !== 0 && t % 1e5 == 0 && r.info(`    T1 evaluation ${t}/${f.domainSize * 4}`);
				let n = m.square(e), i = S.Z.getEvaluation(t * 2), a = m.add(m.add(m.mul(w.b[7], n), m.mul(w.b[8], e)), w.b[9]), o = S.lagrange1.getEvaluation(f.domainSize + t * 2), s = m.mul(m.sub(i, m.one), o), c = m.mul(a, o);
				b.T1.set(s, t * h), b.T1z.set(c, t * h), e = m.mul(e, m.w[f.power + 1]);
			}
			if (r && r.info("··· Computing T1 ifft"), x.T1 = await Y.fromEvaluations(b.T1, p, r), x.T1.divByZerofier(f.domainSize, m.one), r && r.info("··· Computing T1z ifft"), x.T1z = await Y.fromEvaluations(b.T1z, p, r), x.T1.add(x.T1z), x.T1.degree() >= f.domainSize + 2) throw Error("T1 Polynomial is not well calculated");
			delete b.T1, delete b.T1z, delete x.T1z;
		}
		async function a() {
			r && r.info("··· Computing T2 evaluations"), b.T2 = new s(_ * 4), b.T2z = new s(_ * 4);
			let e = m.one;
			for (let t = 0; t < f.domainSize * 4; t++) {
				r && t !== 0 && t % 1e5 == 0 && r.info(`    T2 evaluation ${t}/${f.domainSize * 4}`);
				let n = m.square(e), i = m.mul(e, m.w[f.power]), a = m.square(i), o = S.A.getEvaluation(t), s = S.B.getEvaluation(t), c = S.C.getEvaluation(t), l = S.Z.getEvaluation(t), u = S.Z.getEvaluation((f.domainSize * 4 + 4 + t) % (f.domainSize * 4)), d = m.add(m.add(m.mul(w.b[7], n), m.mul(w.b[8], e)), w.b[9]), p = m.add(m.add(m.mul(w.b[7], a), m.mul(w.b[8], i)), w.b[9]), g = S.Sigma1.getEvaluation(t), _ = S.Sigma2.getEvaluation(t), v = S.Sigma3.getEvaluation(t), y = m.mul(w.beta, e), x = m.add(o, y);
				x = m.add(x, w.gamma);
				let C = m.add(s, m.mul(y, f.k1));
				C = m.add(C, w.gamma);
				let T = m.add(c, m.mul(y, f.k2));
				T = m.add(T, w.gamma);
				let E = m.mul(m.mul(m.mul(x, C), T), l), D = m.mul(m.mul(m.mul(x, C), T), d), O = m.add(o, m.mul(w.beta, g));
				O = m.add(O, w.gamma);
				let k = m.add(s, m.mul(w.beta, _));
				k = m.add(k, w.gamma);
				let A = m.add(c, m.mul(w.beta, v));
				A = m.add(A, w.gamma);
				let j = m.mul(m.mul(m.mul(O, k), A), u), M = m.mul(m.mul(m.mul(O, k), A), p), N = m.sub(E, j), P = m.sub(D, M);
				b.T2.set(N, t * h), b.T2z.set(P, t * h), e = m.mul(e, m.w[f.power + 2]);
			}
			if (r && r.info("··· Computing T2 ifft"), x.T2 = await Y.fromEvaluations(b.T2, p, r), r && r.info("··· Computing T2 / ZH"), x.T2.divByZerofier(f.domainSize, m.one), r && r.info("··· Computing T2z ifft"), x.T2z = await Y.fromEvaluations(b.T2z, p, r), x.T2.add(x.T2z), x.T2.degree() >= 3 * f.domainSize) throw Error("T2 Polynomial is not well calculated");
			delete b.T2, delete b.T2z, delete x.T2z;
		}
		async function o() {
			let e = new ui(3, p, r);
			if (e.addPolynomial(0, x.Z), e.addPolynomial(1, x.T1), e.addPolynomial(2, x.T2), x.C2 = e.getPolynomial(), x.C2.degree() >= 9 * f.domainSize) throw Error("C2 Polynomial is not well calculated");
		}
	}
	async function F() {
		r && r.info("> Computing challenge xi");
		let e = new jr(p);
		e.addScalar(w.gamma), e.addPolCommitment(E.getPolynomial("C2")), w.xiSeed = e.getChallenge();
		let t = m.square(w.xiSeed);
		T.w8 = [], T.w8[0] = m.one;
		for (let e = 1; e < 8; e++) T.w8[e] = m.mul(T.w8[e - 1], f.w8);
		T.w4 = [], T.w4[0] = m.one;
		for (let e = 1; e < 4; e++) T.w4[e] = m.mul(T.w4[e - 1], f.w4);
		T.w3 = [], T.w3[0] = m.one, T.w3[1] = f.w3, T.w3[2] = m.square(f.w3), T.S0 = {}, T.S0.h0w8 = [], T.S0.h0w8[0] = m.mul(t, w.xiSeed);
		for (let e = 1; e < 8; e++) T.S0.h0w8[e] = m.mul(T.S0.h0w8[0], T.w8[e]);
		T.S1 = {}, T.S1.h1w4 = [], T.S1.h1w4[0] = m.square(T.S0.h0w8[0]);
		for (let e = 1; e < 4; e++) T.S1.h1w4[e] = m.mul(T.S1.h1w4[0], T.w4[e]);
		T.S2 = {}, T.S2.h2w3 = [], T.S2.h2w3[0] = m.mul(T.S1.h1w4[0], t), T.S2.h2w3[1] = m.mul(T.S2.h2w3[0], T.w3[1]), T.S2.h2w3[2] = m.mul(T.S2.h2w3[0], T.w3[2]), T.S2.h3w3 = [], T.S2.h3w3[0] = m.mul(T.S2.h2w3[0], f.wr), T.S2.h3w3[1] = m.mul(T.S2.h3w3[0], T.w3[1]), T.S2.h3w3[2] = m.mul(T.S2.h3w3[0], T.w3[2]), w.xi = m.mul(m.square(T.S2.h2w3[0]), T.S2.h2w3[0]), r && r.info("··· challenges.xi: " + m.toString(w.xi)), x.QL = new Y(new s(_), p, r), x.QR = new Y(new s(_), p, r), x.QM = new Y(new s(_), p, r), x.QO = new Y(new s(_), p, r), x.QC = new Y(new s(_), p, r), await l.readToBuffer(x.QL.coef, 0, _, d[7][0].p), await l.readToBuffer(x.QR.coef, 0, _, d[8][0].p), await l.readToBuffer(x.QM.coef, 0, _, d[9][0].p), await l.readToBuffer(x.QO.coef, 0, _, d[10][0].p), await l.readToBuffer(x.QC.coef, 0, _, d[11][0].p), r && r.info("··· Computing evaluations"), E.addEvaluation("ql", x.QL.evaluate(w.xi)), E.addEvaluation("qr", x.QR.evaluate(w.xi)), E.addEvaluation("qm", x.QM.evaluate(w.xi)), E.addEvaluation("qo", x.QO.evaluate(w.xi)), E.addEvaluation("qc", x.QC.evaluate(w.xi)), E.addEvaluation("s1", x.Sigma1.evaluate(w.xi)), E.addEvaluation("s2", x.Sigma2.evaluate(w.xi)), E.addEvaluation("s3", x.Sigma3.evaluate(w.xi)), E.addEvaluation("a", x.A.evaluate(w.xi)), E.addEvaluation("b", x.B.evaluate(w.xi)), E.addEvaluation("c", x.C.evaluate(w.xi)), E.addEvaluation("z", x.Z.evaluate(w.xi)), w.xiw = m.mul(w.xi, m.w[f.power]), E.addEvaluation("zw", x.Z.evaluate(w.xiw)), E.addEvaluation("t1w", x.T1.evaluate(w.xiw)), E.addEvaluation("t2w", x.T2.evaluate(w.xiw));
	}
	async function I() {
		r && r.info("> Computing challenge alpha");
		let e = new jr(p);
		e.addScalar(w.xiSeed), e.addScalar(E.getEvaluation("ql")), e.addScalar(E.getEvaluation("qr")), e.addScalar(E.getEvaluation("qm")), e.addScalar(E.getEvaluation("qo")), e.addScalar(E.getEvaluation("qc")), e.addScalar(E.getEvaluation("s1")), e.addScalar(E.getEvaluation("s2")), e.addScalar(E.getEvaluation("s3")), e.addScalar(E.getEvaluation("a")), e.addScalar(E.getEvaluation("b")), e.addScalar(E.getEvaluation("c")), e.addScalar(E.getEvaluation("z")), e.addScalar(E.getEvaluation("zw")), e.addScalar(E.getEvaluation("t1w")), e.addScalar(E.getEvaluation("t2w")), w.alpha = e.getChallenge(), r && r.info("··· challenges.alpha: " + m.toString(w.alpha)), r && r.info("> Reading C0 polynomial"), x.C0 = new Y(new s(_ * 8), p, r), await l.readToBuffer(x.C0.coef, 0, _ * 8, d[17][0].p), r && r.info("> Computing R0 polynomial"), n(), r && r.info("> Computing R1 polynomial"), i(), r && r.info("> Computing R2 polynomial"), a(), r && r.info("> Computing F polynomial"), await o(), r && r.info("> Computing W1 multi exponentiation");
		let t = await x.F.multiExponentiation(D, "W1");
		return E.addPolynomial("W1", t), 0;
		function n() {
			if (x.R0 = Y.lagrangePolynomialInterpolation([
				T.S0.h0w8[0],
				T.S0.h0w8[1],
				T.S0.h0w8[2],
				T.S0.h0w8[3],
				T.S0.h0w8[4],
				T.S0.h0w8[5],
				T.S0.h0w8[6],
				T.S0.h0w8[7]
			], [
				x.C0.evaluate(T.S0.h0w8[0]),
				x.C0.evaluate(T.S0.h0w8[1]),
				x.C0.evaluate(T.S0.h0w8[2]),
				x.C0.evaluate(T.S0.h0w8[3]),
				x.C0.evaluate(T.S0.h0w8[4]),
				x.C0.evaluate(T.S0.h0w8[5]),
				x.C0.evaluate(T.S0.h0w8[6]),
				x.C0.evaluate(T.S0.h0w8[7])
			], p), x.R0.degree() > 7) throw Error("R0 Polynomial is not well calculated");
		}
		function i() {
			if (x.R1 = Y.lagrangePolynomialInterpolation([
				T.S1.h1w4[0],
				T.S1.h1w4[1],
				T.S1.h1w4[2],
				T.S1.h1w4[3]
			], [
				x.C1.evaluate(T.S1.h1w4[0]),
				x.C1.evaluate(T.S1.h1w4[1]),
				x.C1.evaluate(T.S1.h1w4[2]),
				x.C1.evaluate(T.S1.h1w4[3])
			], p), x.R1.degree() > 3) throw Error("R1 Polynomial is not well calculated");
		}
		function a() {
			if (x.R2 = Y.lagrangePolynomialInterpolation([
				T.S2.h2w3[0],
				T.S2.h2w3[1],
				T.S2.h2w3[2],
				T.S2.h3w3[0],
				T.S2.h3w3[1],
				T.S2.h3w3[2]
			], [
				x.C2.evaluate(T.S2.h2w3[0]),
				x.C2.evaluate(T.S2.h2w3[1]),
				x.C2.evaluate(T.S2.h2w3[2]),
				x.C2.evaluate(T.S2.h3w3[0]),
				x.C2.evaluate(T.S2.h3w3[1]),
				x.C2.evaluate(T.S2.h3w3[2])
			], p), x.R2.degree() > 5) throw Error("R2 Polynomial is not well calculated");
		}
		async function o() {
			r && r.info("··· Computing F polynomial"), x.F = Y.fromPolynomial(x.C0, p, r), x.F.sub(x.R0), x.F.divByZerofier(8, w.xi);
			let e = Y.fromPolynomial(x.C1, p, r);
			e.sub(x.R1), e.mulScalar(w.alpha), e.divByZerofier(4, w.xi);
			let t = Y.fromPolynomial(x.C2, p, r);
			if (t.sub(x.R2), t.mulScalar(m.square(w.alpha)), t.divByZerofier(3, w.xi), t.divByZerofier(3, w.xiw), x.F.add(e), x.F.add(t), x.F.degree() >= 9 * f.domainSize - 6) throw Error("F Polynomial is not well calculated");
		}
	}
	async function ee() {
		r && r.info("> Computing challenge y");
		let e = new jr(p);
		e.addScalar(w.alpha), e.addPolCommitment(E.getPolynomial("W1")), w.y = e.getChallenge(), r && r.info("··· challenges.y: " + m.toString(w.y)), r && r.info("> Computing L polynomial"), await o(), r && r.info("> Computing ZTS2 polynomial"), await c();
		let t = x.ZTS2.evaluate(w.y);
		t = m.inv(t), x.L.mulScalar(t);
		let n = Y.fromCoefficientsArray([m.neg(w.y), m.one], p);
		r && r.info("> Computing W' = L / ZTS2 polynomial");
		let i = x.L.divBy(n);
		if (i.degree() > 0) throw Error(`Degree of L(X)/(ZTS2(y)(X-y)) remainder is ${i.degree()} and should be 0`);
		if (x.L.degree() >= 9 * f.domainSize - 1) throw Error("Degree of L(X)/(ZTS2(y)(X-y)) is not correct");
		r && r.info("> Computing W' multi exponentiation");
		let a = await x.L.multiExponentiation(D, "W2");
		return E.addPolynomial("W2", a), 0;
		async function o() {
			r && r.info("··· Computing L polynomial");
			let e = x.R0.evaluate(w.y), t = x.R1.evaluate(w.y), n = x.R2.evaluate(w.y), i = m.sub(w.y, T.S0.h0w8[0]);
			for (let e = 1; e < 8; e++) i = m.mul(i, m.sub(w.y, T.S0.h0w8[e]));
			let a = m.sub(w.y, T.S1.h1w4[0]);
			for (let e = 1; e < 4; e++) a = m.mul(a, m.sub(w.y, T.S1.h1w4[e]));
			let o = m.sub(w.y, T.S2.h2w3[0]);
			for (let e = 1; e < 3; e++) o = m.mul(o, m.sub(w.y, T.S2.h2w3[e]));
			for (let e = 0; e < 3; e++) o = m.mul(o, m.sub(w.y, T.S2.h3w3[e]));
			let c = m.mul(a, o), l = m.mul(w.alpha, m.mul(i, o)), u = m.mul(m.square(w.alpha), m.mul(i, a));
			C.denH1 = a, C.denH2 = o, x.L = Y.fromPolynomial(x.C0, p, r), x.L.subScalar(e), x.L.mulScalar(c);
			let d = Y.fromPolynomial(x.C1, p, r);
			d.subScalar(t), d.mulScalar(l);
			let h = Y.fromPolynomial(x.C2, p, r);
			h.subScalar(n), h.mulScalar(u), x.L.add(d), x.L.add(h), r && r.info("> Computing ZT polynomial"), await s();
			let g = x.ZT.evaluate(w.y);
			if (x.F.mulScalar(g), x.L.sub(x.F), x.L.degree() >= 9 * f.domainSize) throw Error("L Polynomial is not well calculated");
			delete b.L;
		}
		async function s() {
			x.ZT = Y.zerofierPolynomial([
				T.S0.h0w8[0],
				T.S0.h0w8[1],
				T.S0.h0w8[2],
				T.S0.h0w8[3],
				T.S0.h0w8[4],
				T.S0.h0w8[5],
				T.S0.h0w8[6],
				T.S0.h0w8[7],
				T.S1.h1w4[0],
				T.S1.h1w4[1],
				T.S1.h1w4[2],
				T.S1.h1w4[3],
				T.S2.h2w3[0],
				T.S2.h2w3[1],
				T.S2.h2w3[2],
				T.S2.h3w3[0],
				T.S2.h3w3[1],
				T.S2.h3w3[2]
			], p);
		}
		async function c() {
			x.ZTS2 = Y.zerofierPolynomial([
				T.S1.h1w4[0],
				T.S1.h1w4[1],
				T.S1.h1w4[2],
				T.S1.h1w4[3],
				T.S2.h2w3[0],
				T.S2.h2w3[1],
				T.S2.h2w3[2],
				T.S2.h3w3[0],
				T.S2.h3w3[1],
				T.S2.h3w3[2]
			], p);
		}
	}
	function L() {
		let e = w.xi;
		for (let t = 0; t < f.power; t++) e = m.square(e);
		C.zh = m.sub(e, m.one), i(C, T.S0.h0w8, w.y, p), a(C, T.S1.h1w4, w.y, p), o(C, T.S2.h2w3, T.S2.h3w3, w.y, w.xi, w.xiw, p);
		let t = Math.max(1, f.nPublic), n = m.one;
		for (let e = 0; e < t; e++) C["Li_" + (e + 1)] = m.mul(m.e(f.domainSize), m.sub(w.xi, n)), n = m.mul(n, m.w[f.power]);
		let r = m.one;
		for (let e of Object.values(C)) if (Array.isArray(e)) for (let t of e) r = m.mul(r, t);
		else r = m.mul(r, e);
		return m.inv(r);
		function i(e, t, n, r) {
			let i = r.Fr, a = t.length, o = i.mul(i.e(a), i.exp(t[0], a - 2)), s = [];
			for (let r = 0; r < a; r++) {
				let s = t[(a - 1) * r % a], c = i.sub(n, t[r]);
				e[["LiS0_" + (r + 1)]] = i.mul(i.mul(o, s), c);
			}
			return s;
		}
		function a(e, t, n, r) {
			let i = r.Fr, a = t.length, o = i.mul(i.e(a), i.exp(t[0], a - 2)), s = [];
			for (let r = 0; r < a; r++) {
				let s = t[(a - 1) * r % a], c = i.sub(n, t[r]);
				e[["LiS1_" + (r + 1)]] = i.mul(i.mul(o, s), c);
			}
			return s;
		}
		function o(e, t, n, r, i, a, o) {
			let s = o.Fr, c = [], l = s.mul(s.e(3), t[0]), u = s.sub(i, a), d = s.mul(l, u);
			for (let n = 0; n < 3; n++) {
				let i = t[2 * n % 3], a = s.sub(r, t[n]);
				e[["LiS2_" + (n + 1)]] = s.mul(d, s.mul(i, a));
			}
			let f = s.mul(s.e(3), n[0]), p = s.sub(a, i);
			d = s.mul(f, p);
			for (let t = 0; t < 3; t++) {
				let i = n[2 * t % 3], a = s.sub(r, n[t]);
				e[["LiS2_" + (t + 1 + 3)]] = s.mul(d, s.mul(i, a));
			}
			return c;
		}
	}
}
//#endregion
//#region src/fflonk_full_prove.js
var { unstringifyBigInts: mi } = p;
async function hi(e, t, n, r, i, a) {
	let o = mi(e), s = { type: "mem" };
	return await Vt(o, t, s, i), await pi(n, s, r, a);
}
//#endregion
//#region src/fflonk_verify.js
var { unstringifyBigInts: gi } = p;
async function _i(e, t, n, r) {
	r && r.info("FFLONK VERIFIER STARTED"), e = gi(e), n = gi(n);
	let i = await E(e.curve), a = vi(i, e), o = new dr(i, r);
	o.fromObjectProof(n);
	let s = gi(t);
	if (s.length !== a.nPublic) return r.error("Number of public signals does not match with vk"), !1;
	let c = i.Fr;
	if (r && (r.info("----------------------------"), r.info("  FFLONK VERIFY SETTINGS"), r.info(`  Curve:         ${i.name}`), r.info(`  Circuit power: ${a.power}`), r.info(`  Domain size:   ${2 ** a.power}`), r.info(`  Public vars:   ${a.nPublic}`), r.info("----------------------------")), r && r.info("> Checking commitments belong to G1"), !yi(i, o, a)) return r && r.error("Proof commitments are not valid"), !1;
	if (r && r.info("> Checking evaluations belong to F"), !xi(i, o)) return r && r.error("Proof evaluations are not valid."), !1;
	if (r && r.info("> Checking public inputs belong to F"), !Si(i, s)) return r && r.error("Public inputs are not valid."), !1;
	r && r.info("> Computing challenges");
	let { challenges: l, roots: u } = Ci(i, o, a, s, r);
	r && r.info("> Computing Zero polynomial evaluation Z_H(xi)"), l.zh = c.sub(l.xiN, c.one), l.invzh = c.inv(l.zh), r && r.info("> Computing Lagrange evaluations");
	let d = await wi(i, l, a);
	r && r.info("> Computing polynomial identities PI(X)");
	let f = Ti(i, s, d);
	r && r.info("> Computing r0(y)");
	let p = Ei(o, l, u, i, r);
	r && r.info("> Computing r1(y)");
	let m = Di(o, l, u, f, i, r);
	r && r.info("> Computing r2(y)");
	let h = Oi(o, l, u, d[1], a, i, r);
	r && r.info("> Computing F");
	let g = ki(i, o, a, l, u);
	r && r.info("> Computing E");
	let _ = Ai(i, o, l, a, p, m, h);
	r && r.info("> Computing J");
	let v = ji(i, o, l);
	r && r.info("> Validate all evaluations with a pairing");
	let y = await Mi(i, o, l, a, g, _, v);
	return r && (y ? r.info("PROOF VERIFIED SUCCESSFULLY") : r.warn("Invalid Proof")), r && r.info("FFLONK VERIFIER FINISHED"), y;
}
function vi(e, t) {
	let n = t;
	return n.k1 = e.Fr.fromObject(t.k1), n.k2 = e.Fr.fromObject(t.k2), n.w = e.Fr.fromObject(t.w), n.w3 = e.Fr.fromObject(t.w3), n.w4 = e.Fr.fromObject(t.w4), n.w8 = e.Fr.fromObject(t.w8), n.wr = e.Fr.fromObject(t.wr), n.X_2 = e.G2.fromObject(t.X_2), n.C0 = e.G1.fromObject(t.C0), n;
}
function yi(e, t, n) {
	let r = e.G1;
	return r.isValid(t.polynomials.C1) && r.isValid(t.polynomials.C2) && r.isValid(t.polynomials.W1) && r.isValid(t.polynomials.W2) && r.isValid(n.C0);
}
function bi(e, t) {
	return u.geq(t, 0) && u.lt(t, e.r);
}
function Q(e, t) {
	return bi(e, u.fromRprLE(t));
}
function xi(e, t) {
	return Q(e, t.evaluations.ql) && Q(e, t.evaluations.qr) && Q(e, t.evaluations.qm) && Q(e, t.evaluations.qo) && Q(e, t.evaluations.qc) && Q(e, t.evaluations.s1) && Q(e, t.evaluations.s2) && Q(e, t.evaluations.s3) && Q(e, t.evaluations.a) && Q(e, t.evaluations.b) && Q(e, t.evaluations.c) && Q(e, t.evaluations.z) && Q(e, t.evaluations.zw) && Q(e, t.evaluations.t1w) && Q(e, t.evaluations.t2w);
}
function Si(e, t) {
	for (let n = 0; n < t.length; n++) if (!bi(e, t[n])) return !1;
	return !0;
}
function Ci(e, t, n, r, i) {
	let a = e.Fr, o = {}, s = {}, c = new jr(e);
	c.addPolCommitment(n.C0);
	for (let e = 0; e < r.length; e++) c.addScalar(a.e(r[e]));
	c.addPolCommitment(t.polynomials.C1), o.beta = c.getChallenge(), c.reset(), c.addScalar(o.beta), o.gamma = c.getChallenge(), c.reset(), c.addScalar(o.gamma), c.addPolCommitment(t.polynomials.C2);
	let l = c.getChallenge(), u = a.square(l), d = [];
	d[1] = n.w8, d[2] = a.square(n.w8), d[3] = a.mul(d[2], n.w8), d[4] = a.mul(d[3], n.w8), d[5] = a.mul(d[4], n.w8), d[6] = a.mul(d[5], n.w8), d[7] = a.mul(d[6], n.w8);
	let f = [];
	f[1] = n.w4, f[2] = a.square(n.w4), f[3] = a.mul(f[2], n.w4);
	let p = [];
	p[1] = n.w3, p[2] = a.square(n.w3), s.S0 = {}, s.S0.h0w8 = [], s.S0.h0w8[0] = a.mul(u, l);
	for (let e = 1; e < 8; e++) s.S0.h0w8[e] = a.mul(s.S0.h0w8[0], d[e]);
	s.S1 = {}, s.S1.h1w4 = [], s.S1.h1w4[0] = a.square(s.S0.h0w8[0]);
	for (let e = 1; e < 4; e++) s.S1.h1w4[e] = a.mul(s.S1.h1w4[0], f[e]);
	s.S2 = {}, s.S2.h2w3 = [], s.S2.h2w3[0] = a.mul(s.S1.h1w4[0], u), s.S2.h2w3[1] = a.mul(s.S2.h2w3[0], p[1]), s.S2.h2w3[2] = a.mul(s.S2.h2w3[0], p[2]), s.S2.h3w3 = [], s.S2.h3w3[0] = a.mul(s.S2.h2w3[0], n.wr), s.S2.h3w3[1] = a.mul(s.S2.h3w3[0], p[1]), s.S2.h3w3[2] = a.mul(s.S2.h3w3[0], p[2]), o.xi = a.mul(a.square(s.S2.h2w3[0]), s.S2.h2w3[0]), o.xiw = a.mul(o.xi, a.w[n.power]), o.xiN = o.xi, n.domainSize = 1;
	for (let e = 0; e < n.power; e++) o.xiN = a.square(o.xiN), n.domainSize *= 2;
	return c.reset(), c.addScalar(l), c.addScalar(t.evaluations.ql), c.addScalar(t.evaluations.qr), c.addScalar(t.evaluations.qm), c.addScalar(t.evaluations.qo), c.addScalar(t.evaluations.qc), c.addScalar(t.evaluations.s1), c.addScalar(t.evaluations.s2), c.addScalar(t.evaluations.s3), c.addScalar(t.evaluations.a), c.addScalar(t.evaluations.b), c.addScalar(t.evaluations.c), c.addScalar(t.evaluations.z), c.addScalar(t.evaluations.zw), c.addScalar(t.evaluations.t1w), c.addScalar(t.evaluations.t2w), o.alpha = c.getChallenge(), c.reset(), c.addScalar(o.alpha), c.addPolCommitment(t.polynomials.W1), o.y = c.getChallenge(), i && (i.info("··· challenges.beta:  " + a.toString(o.beta)), i.info("··· challenges.gamma: " + a.toString(o.gamma)), i.info("··· challenges.xi:    " + a.toString(o.xi)), i.info("··· challenges.alpha: " + a.toString(o.alpha)), i.info("··· challenges.y:     " + a.toString(o.y))), {
		challenges: o,
		roots: s
	};
}
async function wi(e, t, n) {
	let r = e.Fr, i = Math.max(1, n.nPublic), a = new s(i * r.n8), o = new s(i * r.n8), c = r.one;
	for (let e = 0; e < i; e++) {
		let i = e * r.n8;
		a.set(r.mul(c, t.zh), i), o.set(r.mul(r.e(n.domainSize), r.sub(t.xi, c)), i), c = r.mul(c, n.w);
	}
	o = await r.batchInverse(o);
	let l = [];
	for (let e = 0; e < i; e++) {
		let t = e * r.n8;
		l[e + 1] = r.mul(a.slice(t, t + r.n8), o.slice(t, t + r.n8));
	}
	return l;
}
function Ti(e, t, n) {
	let r = e.Fr, i = r.zero;
	for (let e = 0; e < t.length; e++) {
		let a = r.e(t[e]);
		i = r.sub(i, r.mul(a, n[e + 1]));
	}
	return i;
}
function Ei(e, t, n, r, i) {
	let a = r.Fr, o = Ni(n.S0.h0w8, t.y, t.xi, r);
	i && i.info("··· Computing r0(y)");
	let s = a.zero;
	for (let t = 0; t < 8; t++) {
		let r = [];
		r[1] = n.S0.h0w8[t];
		for (let e = 2; e < 8; e++) r[e] = a.mul(r[e - 1], n.S0.h0w8[t]);
		let i = a.add(e.evaluations.ql, a.mul(e.evaluations.qr, r[1]));
		i = a.add(i, a.mul(e.evaluations.qo, r[2])), i = a.add(i, a.mul(e.evaluations.qm, r[3])), i = a.add(i, a.mul(e.evaluations.qc, r[4])), i = a.add(i, a.mul(e.evaluations.s1, r[5])), i = a.add(i, a.mul(e.evaluations.s2, r[6])), i = a.add(i, a.mul(e.evaluations.s3, r[7])), s = a.add(s, a.mul(i, o[t]));
	}
	return s;
}
function Di(e, t, n, r, i, a) {
	let o = i.Fr, s = Ni(n.S1.h1w4, t.y, t.xi, i);
	a && a.info("··· Computing T0(xi)");
	let c = o.mul(e.evaluations.ql, e.evaluations.a);
	c = o.add(c, o.mul(e.evaluations.qr, e.evaluations.b)), c = o.add(c, o.mul(e.evaluations.qm, o.mul(e.evaluations.a, e.evaluations.b))), c = o.add(c, o.mul(e.evaluations.qo, e.evaluations.c)), c = o.add(c, e.evaluations.qc), c = o.add(c, r), c = o.mul(c, t.invzh), a && a.info("··· Computing C1(h_1ω_4^i) values");
	let l = o.zero;
	for (let t = 0; t < 4; t++) {
		let r = e.evaluations.a;
		r = o.add(r, o.mul(n.S1.h1w4[t], e.evaluations.b));
		let i = o.square(n.S1.h1w4[t]);
		r = o.add(r, o.mul(i, e.evaluations.c)), r = o.add(r, o.mul(o.mul(i, n.S1.h1w4[t]), c)), l = o.add(l, o.mul(r, s[t]));
	}
	return l;
}
function Oi(e, t, n, r, i, a, o) {
	let s = a.Fr, c = Pi([n.S2.h2w3, n.S2.h3w3], t.y, t.xi, t.xiw, a);
	o && o.info("··· Computing T1(xi)");
	let l = s.sub(e.evaluations.z, s.one);
	l = s.mul(l, r), l = s.mul(l, t.invzh), o && o.info("··· Computing T2(xi)");
	let u = s.mul(t.beta, t.xi), d = s.add(e.evaluations.a, s.add(u, t.gamma)), f = s.add(e.evaluations.b, s.add(s.mul(u, i.k1), t.gamma)), p = s.add(e.evaluations.c, s.add(s.mul(u, i.k2), t.gamma)), m = s.mul(d, s.mul(f, s.mul(p, e.evaluations.z))), h = s.add(e.evaluations.a, s.add(s.mul(t.beta, e.evaluations.s1), t.gamma)), g = s.add(e.evaluations.b, s.add(s.mul(t.beta, e.evaluations.s2), t.gamma)), _ = s.add(e.evaluations.c, s.add(s.mul(t.beta, e.evaluations.s3), t.gamma)), v = s.mul(h, s.mul(g, s.mul(_, e.evaluations.zw))), y = s.sub(m, v);
	y = s.mul(y, t.invzh), o && o.info("··· Computing C2(h_2ω_3^i) values");
	let b = s.zero;
	for (let t = 0; t < 3; t++) {
		let r = s.add(e.evaluations.z, s.mul(n.S2.h2w3[t], l));
		r = s.add(r, s.mul(s.square(n.S2.h2w3[t]), y)), b = s.add(b, s.mul(r, c[t]));
	}
	o && o.info("··· Computing C2(h_3ω_3^i) values");
	for (let t = 0; t < 3; t++) {
		let r = s.add(e.evaluations.zw, s.mul(n.S2.h3w3[t], e.evaluations.t1w));
		r = s.add(r, s.mul(s.square(n.S2.h3w3[t]), e.evaluations.t2w)), b = s.add(b, s.mul(r, c[t + 3]));
	}
	return b;
}
function ki(e, t, n, r, i) {
	let a = e.G1, o = e.Fr, s = o.sub(r.y, i.S0.h0w8[0]);
	for (let e = 1; e < 8; e++) s = o.mul(s, o.sub(r.y, i.S0.h0w8[e]));
	r.temp = s;
	let c = o.sub(r.y, i.S1.h1w4[0]);
	for (let e = 1; e < 4; e++) c = o.mul(c, o.sub(r.y, i.S1.h1w4[e]));
	let l = o.sub(r.y, i.S2.h2w3[0]);
	for (let e = 1; e < 3; e++) l = o.mul(l, o.sub(r.y, i.S2.h2w3[e]));
	for (let e = 0; e < 3; e++) l = o.mul(l, o.sub(r.y, i.S2.h3w3[e]));
	r.quotient1 = o.mul(r.alpha, o.div(s, c)), r.quotient2 = o.mul(o.square(r.alpha), o.div(s, l));
	let u = a.timesFr(t.polynomials.C1, r.quotient1), d = a.timesFr(t.polynomials.C2, r.quotient2);
	return a.add(n.C0, a.add(u, d));
}
function Ai(e, t, n, r, i, a, o) {
	let s = e.G1, c = e.Fr, l = c.mul(a, n.quotient1), u = c.mul(o, n.quotient2);
	return s.timesFr(s.one, c.add(i, c.add(l, u)));
}
function ji(e, t, n) {
	return e.G1.timesFr(t.polynomials.W1, n.temp);
}
async function Mi(e, t, n, r, i, a, o) {
	let s = e.G1, c = s.timesFr(t.polynomials.W2, n.y);
	c = s.add(s.sub(s.sub(i, a), o), c);
	let l = e.G2.one, u = t.polynomials.W2, d = r.X_2;
	return await e.pairingEq(s.neg(c), l, u, d);
}
function Ni(e, t, n, r) {
	let i = r.Fr, a = e.length, o = i.sub(i.exp(t, a), n), s = i.mul(i.e(a), i.exp(e[0], a - 2)), c = [];
	for (let n = 0; n < a; n++) {
		let r = e[(a - 1) * n % a], l = i.sub(t, e[n]);
		c[n] = i.div(o, i.mul(i.mul(s, r), l));
	}
	return c;
}
function Pi(e, t, n, r, i) {
	let a = i.Fr, o = [], s = e[0].length, c = s * e.length, l = a.exp(t, c), u = a.mul(a.add(n, r), a.exp(t, s)), d = a.mul(n, r), f = a.add(a.sub(l, u), d), p = a.mul(a.mul(a.e(s), e[0][0]), a.sub(n, r));
	for (let n = 0; n < s; n++) {
		let r = e[0][(s - 1) * n % s], i = a.sub(t, e[0][n]), c = a.mul(p, a.mul(r, i));
		o[n] = a.div(f, c);
	}
	p = a.mul(a.mul(a.e(s), e[1][0]), a.sub(r, n));
	for (let n = 0; n < s; n++) {
		let r = e[1][(s - 1) * n % s], i = a.sub(t, e[1][n]), c = a.mul(p, a.mul(r, i));
		o[n + s] = a.div(f, c);
	}
	return o;
}
//#endregion
//#region src/fflonk_export_calldata.js
var { unstringifyBigInts: Fi } = p;
function $(e) {
	let t = e.toString(16);
	for (; t.length < 64;) t = "0" + t;
	return t = `0x${t}`, t;
}
async function Ii(e, t) {
	let n = Fi(t), r = Fi(e);
	await E(n.curve);
	let i = "";
	for (let e = 0; e < r.length; e++) i !== "" && (i += ","), i += $(r[e]);
	return `[${$(n.polynomials.C1[0])}, ${$(n.polynomials.C1[1])},${$(n.polynomials.C2[0])},${$(n.polynomials.C2[1])},${$(n.polynomials.W1[0])},${$(n.polynomials.W1[1])},${$(n.polynomials.W2[0])},${$(n.polynomials.W2[1])},${$(n.evaluations.ql)},${$(n.evaluations.qr)},${$(n.evaluations.qm)},${$(n.evaluations.qo)},${$(n.evaluations.qc)},${$(n.evaluations.s1)},${$(n.evaluations.s2)},${$(n.evaluations.s3)},${$(n.evaluations.a)},${$(n.evaluations.b)},${$(n.evaluations.c)},${$(n.evaluations.z)},${$(n.evaluations.zw)},${$(n.evaluations.t1w)},${$(n.evaluations.t2w)},${$(n.evaluations.inv)}],[${i}]`;
}
//#endregion
//#region src/fflonk.js
var Li = /* @__PURE__ */ v({
	exportSolidityCallData: () => Ii,
	exportSolidityVerifier: () => null,
	fullProve: () => hi,
	prove: () => pi,
	setup: () => di,
	verify: () => _i
});
//#endregion
export { y as curves, Li as fflonk, Qt as groth16, ni as plonk, jn as powersOfTau, Ln as r1cs, Un as wtns, lr as zKey };
