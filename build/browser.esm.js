import { BigBuffer as e, ChaCha as t, F1Field as n, Scalar as r, buildBls12381 as i, buildBn128 as a, getCurveFromR as o, utils as s } from "ffjavascript";
//#region \0rolldown/runtime.js
var c = Object.defineProperty, l = (e, t) => {
	let n = {};
	for (var r in e) c(n, r, {
		get: e[r],
		enumerable: !0
	});
	return t || c(n, Symbol.toStringTag, { value: "Module" }), n;
};
//#endregion
//#region node_modules/@iden3/binfileutils/build/browser/browser.esm.js
function u(e) {
	let t = e.initialSize || 1 << 20, n = new g();
	return n.o = e, n.o.data = new Uint8Array(t), n.allocSize = t, n.totalSize = 0, n.readOnly = !1, n.pos = 0, n;
}
function d(e) {
	let t = new g();
	return t.o = e, t.allocSize = e.data.byteLength, t.totalSize = e.data.byteLength, t.readOnly = !0, t.pos = 0, t;
}
var f = /* @__PURE__ */ new Uint8Array(4), p = new DataView(f.buffer), m = /* @__PURE__ */ new Uint8Array(8), h = new DataView(m.buffer), g = class {
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
		p.setUint32(0, e, !0), await n.write(f, t);
	}
	async writeUBE32(e, t) {
		let n = this;
		p.setUint32(0, e, !1), await n.write(f, t);
	}
	async writeULE64(e, t) {
		let n = this;
		h.setUint32(0, e & 4294967295, !0), h.setUint32(4, Math.floor(e / 4294967296), !0), await n.write(m, t);
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
		if (n >= this.totalSize) {
			if (this.readOnly) throw Error("Reading out of bounds");
			return "";
		}
		let r = new Uint8Array(t.o.data.buffer, n, this.totalSize - n), i = r.findIndex((e) => e === 0), a = i !== -1, o = "";
		return a ? (o = new TextDecoder().decode(r.slice(0, i)), t.pos = n + i + 1) : t.pos = n, o;
	}
}, _ = 1 << 22;
function v(e) {
	let t = e.initialSize || 0, n = new w();
	n.o = e;
	let r = t ? Math.floor((t - 1) / _) + 1 : 0;
	n.o.data = [];
	for (let e = 0; e < r - 1; e++) n.o.data.push(new Uint8Array(_));
	return r && n.o.data.push(new Uint8Array(t - _ * (r - 1))), n.totalSize = 0, n.readOnly = !1, n.pos = 0, n;
}
function y(e) {
	let t = new w();
	return t.o = e, t.totalSize = (e.data.length - 1) * _ + e.data[e.data.length - 1].byteLength, t.readOnly = !0, t.pos = 0, t;
}
var b = /* @__PURE__ */ new Uint8Array(4), x = new DataView(b.buffer), S = /* @__PURE__ */ new Uint8Array(8), C = new DataView(S.buffer), w = class {
	constructor() {
		this.pageSize = 16384;
	}
	_resizeIfNeeded(e) {
		if (e <= this.totalSize) return;
		if (this.readOnly) throw Error("Reading out of file bounds");
		let t = Math.floor((e - 1) / _) + 1;
		for (let n = Math.max(this.o.data.length - 1, 0); n < t; n++) {
			let r = n < t - 1 ? _ : e - (t - 1) * _, i = new Uint8Array(r);
			n == this.o.data.length - 1 && i.set(this.o.data[n]), this.o.data[n] = i;
		}
		this.totalSize = e;
	}
	async write(e, t) {
		let n = this;
		if (t === void 0 && (t = n.pos), this.readOnly) throw Error("Writing a read only file");
		this._resizeIfNeeded(t + e.byteLength);
		let r = Math.floor(t / _), i = t % _, a = e.byteLength;
		for (; a > 0;) {
			let t = i + a > _ ? _ - i : a, o = e.slice(e.byteLength - a, e.byteLength - a + t);
			new Uint8Array(n.o.data[r].buffer, i, t).set(o), a -= t, r++, i = 0;
		}
		this.pos = t + e.byteLength;
	}
	async readToBuffer(e, t, n, r) {
		let i = this;
		if (r === void 0 && (r = i.pos), this.readOnly && r + n > this.totalSize) throw Error("Reading out of bounds");
		this._resizeIfNeeded(r + n);
		let a = Math.floor(r / _), o = r % _, s = n;
		for (; s > 0;) {
			let r = o + s > _ ? _ - o : s, c = new Uint8Array(i.o.data[a].buffer, o, r);
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
		x.setUint32(0, e, !0), await n.write(b, t);
	}
	async writeUBE32(e, t) {
		let n = this;
		x.setUint32(0, e, !1), await n.write(b, t);
	}
	async writeULE64(e, t) {
		let n = this;
		C.setUint32(0, e & 4294967295, !0), C.setUint32(4, Math.floor(e / 4294967296), !0), await n.write(S, t);
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
			let e = Math.floor(n / _), a = n % _;
			if (t.o.data[e] === void 0) throw Error("ERROR");
			let o = Math.min(2048, t.o.data[e].length - a);
			if (o <= 0) return t.pos = n, i;
			let s = new Uint8Array(t.o.data[e].buffer, a, o), c = s.findIndex((e) => e === 0);
			r = c !== -1, r ? (i += new TextDecoder().decode(s.slice(0, c)), t.pos = e * _ + a + c + 1) : (i += new TextDecoder().decode(s), t.pos = e * _ + a + s.length), n = t.pos;
		}
		return i;
	}
}, T = 1 << 20, E = 8192, D = class {
	constructor(e, t, n, r) {
		this.readRangeInto = e, this.totalSize = t, this.pos = 0, this.pageSize = r || E, this.maxPagesLoaded = Math.floor((n || T) / this.pageSize) + 1, this.pages = /* @__PURE__ */ new Map(), this.readOnly = !0;
	}
	_pageLen(e) {
		let t = e * this.pageSize;
		return Math.min(t + this.pageSize, this.totalSize) - t;
	}
	_loadPage(e) {
		let t = this, n = t.pages.get(e);
		if (n) return t.pages.delete(e), t.pages.set(e, n), n.promise;
		let r = new Uint8Array(t._pageLen(e));
		return n = {
			buff: null,
			promise: null
		}, n.promise = t.readRangeInto(r, 0, e * t.pageSize, r.byteLength).then(function() {
			return n.buff = r, r;
		}, function(n) {
			throw t.pages.delete(e), n;
		}), t.pages.set(e, n), t._trimCache(), n.promise;
	}
	_trimCache() {
		let e = this;
		if (!(e.pages.size <= e.maxPagesLoaded)) for (let t of e.pages) {
			if (e.pages.size <= e.maxPagesLoaded) return;
			t[1].buff && e.pages.delete(t[0]);
		}
	}
	async readToBuffer(e, t, n, r) {
		let i = this;
		if (n === 0) return;
		if (i.pendingClose) throw Error("Reading a closing file");
		if (r === void 0 && (r = i.pos), r + n > i.totalSize) throw Error("Reading out of bounds");
		if (i.pos = r + n, n >= i.pageSize) {
			await i.readRangeInto(e, t, r, n);
			return;
		}
		let a = Math.floor(r / i.pageSize), o = Math.floor((r + n - 1) / i.pageSize), s = r % i.pageSize, c = 0;
		for (let r = a; r <= o; r++) {
			let a = await i._loadPage(r), o = Math.min(n - c, i.pageSize - s);
			e.set(a.subarray(s, s + o), t + c), c += o, s = 0;
		}
	}
	async read(e, t) {
		let n = new Uint8Array(e);
		return await this.readToBuffer(n, 0, e, t), n;
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
		let t = this;
		if (t.pendingClose) throw Error("Reading a closing file");
		let n = e === void 0 ? t.pos : e, r = [];
		for (; n < t.totalSize;) {
			let e = Math.min(t.pageSize, t.totalSize - n), i = await t.read(e, n), a = i.indexOf(0);
			if (a >= 0) return r.push(i.subarray(0, a)), t.pos = n + a + 1, O(r);
			r.push(i), n += e;
		}
		return t.pos = n, O(r);
	}
	async write() {
		throw Error("Writing a read only file");
	}
	async writeULE32() {
		throw Error("Writing a read only file");
	}
	async writeUBE32() {
		throw Error("Writing a read only file");
	}
	async writeULE64() {
		throw Error("Writing a read only file");
	}
	async close() {
		this.pendingClose || (this.pendingClose = !0, this.pages.clear());
	}
	async discard() {
		await this.close();
	}
};
function O(e) {
	let t = 0;
	for (let n = 0; n < e.length; n++) t += e[n].byteLength;
	let n = new Uint8Array(t), r = 0;
	for (let t = 0; t < e.length; t++) n.set(e[t], r), r += e[t].byteLength;
	return new TextDecoder().decode(n);
}
var k = 1 << 21, A = 1 << 29, j = "fastfile-http-cache", M = /* @__PURE__ */ new Map();
function N(e) {
	if (M.has(e)) return M.get(e);
	let t = new Promise((t, n) => {
		let r = indexedDB.open(e, 1);
		r.onupgradeneeded = () => {
			let e = r.result;
			e.createObjectStore("files"), e.createObjectStore("blocks");
		}, r.onsuccess = () => t(r.result), r.onerror = () => n(r.error), r.onblocked = () => n(/* @__PURE__ */ Error("IndexedDB open blocked"));
	});
	return M.set(e, t), t.catch(() => M.delete(e)), t;
}
function P(e) {
	return new Promise((t, n) => {
		e.onsuccess = () => t(e.result), e.onerror = () => n(e.error);
	});
}
function F(e) {
	return new Promise((t, n) => {
		e.oncomplete = () => t(), e.onerror = () => n(e.error), e.onabort = () => n(e.error || /* @__PURE__ */ Error("IndexedDB transaction aborted"));
	});
}
function ee(e, t, n) {
	return IDBKeyRange.bound([e, t], [e, n]);
}
async function te(e, t) {
	let n = e.transaction(["files", "blocks"], "readwrite");
	n.objectStore("files").delete(t), n.objectStore("blocks").delete(ee(t, 0, Infinity)), await F(n);
}
async function ne(e, t, n, r, i, a) {
	let o = e.transaction(["files", "blocks"], "readwrite"), s = o.objectStore("files"), c = await P(s.get(t)), l = 0;
	c && c.validator === n && c.totalSize === r && c.blockSize === i ? l = c.bytes : c && o.objectStore("blocks").delete(ee(t, 0, Infinity)), s.put({
		validator: n,
		totalSize: r,
		blockSize: i,
		bytes: l,
		lastUsed: Date.now()
	}, t), await F(o);
	let u = e.transaction("files", "readonly"), d = u.objectStore("files"), [f, p] = await Promise.all([P(d.getAllKeys()), P(d.getAll())]);
	await F(u);
	let m = p.reduce((e, t) => e + t.bytes, 0);
	if (m <= a) return;
	let h = f.map((e, t) => ({
		key: e,
		meta: p[t]
	})).filter((e) => e.key !== t).sort((e, t) => e.meta.lastUsed - t.meta.lastUsed);
	for (let t of h) {
		if (m <= a) break;
		await te(e, t.key), m -= t.meta.bytes;
	}
}
async function re(e, t) {
	let { fileKey: n, validator: r, totalSize: i } = t, a = typeof t.options == "object" && t.options || {}, o = a.blockSize || k, s = a.maxBytes || A, c = a.dbName || j;
	if (typeof indexedDB > "u" || !r) return e;
	let l;
	try {
		l = await N(c), await ne(l, n, r, i, o, s);
	} catch {
		return e;
	}
	let u = !1;
	async function d(e, t) {
		let r = l.transaction("blocks", "readonly"), i = r.objectStore("blocks"), a = ee(n, e, t), [o, s] = await Promise.all([P(i.getAllKeys(a)), P(i.getAll(a))]);
		await F(r);
		let c = /* @__PURE__ */ new Map();
		for (let e = 0; e < o.length; e++) c.set(o[e][1], s[e]);
		return c;
	}
	async function f(e) {
		if (!(u || e.length === 0)) try {
			let t = l.transaction(["files", "blocks"], "readwrite"), r = t.objectStore("blocks"), i = t.objectStore("files");
			for (let t of e) r.put(t.data, [n, t.index]);
			let a = await P(i.get(n));
			a && (a.bytes += e.reduce((e, t) => e + t.data.byteLength, 0), a.lastUsed = Date.now(), i.put(a, n)), await F(t);
		} catch {
			u = !0;
		}
	}
	let p = (e) => Math.min(o, i - e * o), m = /* @__PURE__ */ new Map();
	function h(e) {
		let t, n, r = new Promise((e, r) => {
			t = e, n = r;
		});
		return r.catch(() => {}), m.set(e, r), {
			resolve: t,
			reject: n,
			promise: r
		};
	}
	return async function(t, n, r, i) {
		if (i === 0) return;
		let a = Math.floor(r / o), s = Math.floor((r + i - 1) / o), c = await d(a, s), l = [], u = (e, a) => {
			let s = a * o, c = Math.max(r, s), l = Math.min(r + i, s + p(a));
			t.set(e.subarray(c - s, l - s), n + (c - r));
		}, g = a;
		for (; g <= s;) {
			let a = g * o, d = a + p(g), f = c.get(g);
			if (f) {
				u(f, g), g++;
				continue;
			}
			let _ = m.get(g);
			if (_) {
				u(await _, g), g++;
				continue;
			}
			if (a >= r && d <= r + i) {
				let u = g;
				for (; u + 1 <= s && !c.get(u + 1) && !m.get(u + 1) && (u + 1) * o + p(u + 1) <= r + i;) u++;
				let d = a, f = u * o + p(u), _ = [];
				for (let e = g; e <= u; e++) _.push(h(e));
				try {
					await e(t, n + (d - r), d, f - d);
				} catch (e) {
					for (let t = g; t <= u; t++) _[t - g].reject(e), m.delete(t);
					throw e;
				}
				for (let e = g; e <= u; e++) {
					let i = e * o, a = t.slice(n + (i - r), n + (i - r) + p(e));
					_[e - g].resolve(a), l.push({
						index: e,
						data: a
					});
				}
				g = u + 1;
			} else {
				let t = h(g), n = new Uint8Array(p(g));
				try {
					await e(n, 0, a, n.length);
				} catch (e) {
					throw t.reject(e), m.delete(g), e;
				}
				t.resolve(n), u(n, g), l.push({
					index: g,
					data: n
				}), g++;
			}
		}
		await f(l);
		for (let e of l) m.delete(e.index);
	};
}
async function ie(e) {
	let t = (typeof e.options == "object" && e.options || {}).dbName || j;
	if (typeof indexedDB > "u") return null;
	try {
		let n = (await N(t)).transaction("files", "readonly"), r = await P(n.objectStore("files").get(e.fileKey));
		return await F(n), r ? {
			validator: r.validator,
			totalSize: r.totalSize,
			blockSize: r.blockSize,
			bytes: r.bytes
		} : null;
	} catch {
		return null;
	}
}
async function ae(e) {
	let { fileKey: t, validator: n, totalSize: r, data: i } = e, a = typeof e.options == "object" && e.options || {}, o = a.blockSize || k, s = a.maxBytes || A, c = a.dbName || j;
	if (typeof indexedDB > "u" || !n) return !1;
	try {
		let e = await N(c);
		await ne(e, t, n, r, o, s);
		let a = Math.ceil(r / o);
		for (let n = 0; n < a; n += 64) {
			let s = e.transaction("blocks", "readwrite"), c = s.objectStore("blocks");
			for (let e = n; e < Math.min(n + 64, a); e++) {
				let n = e * o;
				c.put(i.slice(n, Math.min(n + o, r)), [t, e]);
			}
			await F(s);
		}
		let l = e.transaction("files", "readwrite"), u = l.objectStore("files"), d = await P(u.get(t));
		return d && (d.bytes = r, d.lastUsed = Date.now(), u.put(d, t)), await F(l), !0;
	} catch {
		return !1;
	}
}
var oe = 65536;
async function se(e) {
	let t = e.url, n = e.persistentCache ? await ie({
		fileKey: t,
		options: e.persistentCache
	}) : null, r = { Range: "bytes=0-0" };
	n && n.validator && (n.validator[0] === "\"" || n.validator.indexOf("W/") === 0 ? r["If-None-Match"] = n.validator : r["If-Modified-Since"] = n.validator);
	let i;
	try {
		i = await fetch(t, { headers: r });
	} catch (e) {
		if (!("If-None-Match" in r) && !("If-Modified-Since" in r)) throw e;
		i = await fetch(t, { headers: { Range: "bytes=0-0" } });
	}
	if (i.status === 304) return await _e(i), await ce(t, n.validator, n.totalSize, e);
	if (i.status === 206) {
		let n = i.headers.get("content-range"), r = n ? /\/(\d+)\s*$/.exec(n) : null;
		if (r) {
			let n = parseInt(r[1]);
			return await i.arrayBuffer(), await ce(t, ue(i), n, e);
		}
		return await i.arrayBuffer(), await le(t);
	}
	if (!i.ok && i.status !== 416) throw Error("HTTP " + i.status + " fetching " + t);
	if (i.status === 416) {
		let e = i.headers.get("content-range");
		return e && /\/0\s*$/.test(e) ? d({
			type: "mem",
			data: /* @__PURE__ */ new Uint8Array()
		}) : await le(t);
	}
	let a = new Uint8Array(await i.arrayBuffer());
	if (e.persistentCache) {
		let n = ue(i);
		n && await ae({
			fileKey: t,
			validator: n,
			totalSize: a.length,
			options: e.persistentCache,
			data: a
		});
	}
	return d({
		type: "mem",
		data: a
	});
}
async function ce(e, t, n, r) {
	let i = null, a = async function(n, r, a, o) {
		if (!i) try {
			return await he(e, t, n, r, a, o);
		} catch (e) {
			if (!e || !e.degradeToFull) throw e;
			i = e.fullBodyPromise;
		}
		let s = await i;
		if (a + o > s.byteLength) throw Error(e + ": read past the end of the buffered body");
		n.set(s.subarray(a, a + o), r);
	}, o = Math.min(r.pageSize || oe, oe);
	return r.persistentCache && (a = await re(a, {
		fileKey: e,
		validator: t,
		totalSize: n,
		options: r.persistentCache
	})), new D(a, n, r.cacheSize, o);
}
async function le(e) {
	let t = await fetch(e);
	if (!t.ok) throw Error("HTTP " + t.status + " fetching " + e);
	return d({
		type: "mem",
		data: new Uint8Array(await t.arrayBuffer())
	});
}
function ue(e) {
	let t = e.headers.get("etag");
	return t && t.indexOf("W/") !== 0 ? t : e.headers.get("last-modified") || null;
}
var de = 4, fe = 0, pe = [];
async function me(e) {
	for (; fe >= de;) await new Promise((e) => pe.push(e));
	fe++;
	try {
		return await e();
	} finally {
		fe--;
		let e = pe.shift();
		e && e();
	}
}
async function he(e, t, n, r, i, a) {
	return me(() => ge(e, t, n, r, i, a));
}
async function ge(e, t, n, r, i, a) {
	let o = { Range: "bytes=" + i + "-" + (i + a - 1) };
	t && (o["If-Range"] = t);
	let s = await fetch(e, { headers: o });
	if (s.status === 200) {
		let n = ue(s);
		if (!t || n && n === t) {
			let t = /* @__PURE__ */ Error(e + ": origin ignored Range; degrading to full buffering");
			throw t.degradeToFull = !0, t.fullBodyPromise = s.arrayBuffer().then((e) => new Uint8Array(e)), t;
		}
		throw await _e(s), Error(e + ": file changed (or server stopped honoring Range) while reading");
	}
	if (s.status !== 206) throw await _e(s), Error("HTTP " + s.status + " reading range " + i + "+" + a + " of " + e);
	let c = s.headers.get("content-range"), l = c ? /bytes\s+(\d+)-(\d+)\//.exec(c) : null;
	if (l && parseInt(l[1]) !== i) throw await _e(s), Error(e + ": server returned range starting at " + l[1] + ", requested " + i);
	let u = 0;
	if (s.body && typeof s.body.getReader == "function") {
		let t = s.body.getReader();
		for (;;) {
			let i = await t.read();
			if (i.done) break;
			if (u + i.value.byteLength > a) throw t.cancel().catch(function() {}), Error(e + ": range response longer than requested");
			n.set(i.value, r + u), u += i.value.byteLength;
		}
	} else {
		/* c8 ignore start */
		let t = new Uint8Array(await s.arrayBuffer());
		if (t.byteLength > a) throw Error(e + ": range response longer than requested");
		n.set(t, r), u = t.byteLength;
	}
	if (u !== a) throw Error(e + ": short range response (" + u + "/" + a + " bytes at " + i + ")");
}
async function _e(e) {
	try {
		e.body && typeof e.body.cancel == "function" ? await e.body.cancel() : await e.arrayBuffer();
	} catch {}
}
var ve = 1 << 20;
function ye(e) {
	let t = e.blob, n = async function(e, n, r, i) {
		let a = await t.slice(r, r + i).arrayBuffer();
		if (a.byteLength !== i) throw Error("short blob read (" + a.byteLength + "/" + i + " bytes at " + r + ")");
		e.set(new Uint8Array(a), n);
	}, r = Math.min(e.pageSize || ve, ve);
	return new D(n, t.size, e.cacheSize, r);
}
function be() {
	throw Error("File I/O is not supported in the browser");
}
function xe(e) {
	return e instanceof Uint8Array ? {
		type: "mem",
		data: e
	} : (typeof e == "string" && be(), e);
}
function Se(e, t, n) {
	if (e.type === "file" && be(), e.type === "mem") return t(e);
	if (e.type === "bigMem") return n(e);
	throw Error("Invalid FastFile type: " + e.type);
}
function Ce(e) {
	return Se(xe(e), u, v);
}
async function we(e, t, n) {
	return e instanceof Uint8Array && (e = {
		type: "mem",
		data: e
	}), typeof Blob < "u" && e instanceof Blob && (e = {
		type: "blob",
		blob: e,
		cacheSize: t,
		pageSize: n
	}), typeof e == "string" && (e = {
		type: "http",
		url: e,
		cacheSize: t,
		pageSize: n
	}), e.type === "http" ? await se(e) : e.type === "blob" ? ye(e) : Se(e, d, y);
}
var Te = 1 << 30;
async function I(e, t, n, r, i) {
	let a = await we(e, r, i), o = await a.read(4), s = "";
	for (let e = 0; e < 4; e++) s += String.fromCharCode(o[e]);
	if (s != t) throw Error(e + ": Invalid File format");
	if (await a.readULE32() > n) throw Error("Version not supported");
	let c = await a.readULE32(), l = [];
	for (let e = 0; e < c; e++) {
		let e = await a.readULE32(), t = await a.readULE64();
		l[e] === void 0 && (l[e] = []), l[e].push({
			p: a.pos,
			size: t
		}), a.pos += t;
	}
	return {
		fd: a,
		sections: l
	};
}
async function Ee(e, t, n, r, i, a) {
	let o = await Ce(e, i, a), s = /* @__PURE__ */ new Uint8Array(4);
	for (let e = 0; e < 4; e++) s[e] = t.charCodeAt(e);
	return await o.write(s, 0), await o.writeULE32(n), await o.writeULE32(r), o;
}
async function L(e, t) {
	if (e.writingSection !== void 0) throw Error("Already writing a section");
	await e.writeULE32(t), e.writingSection = { pSectionSize: e.pos }, await e.writeULE64(0);
}
async function R(e) {
	if (e.writingSection === void 0) throw Error("Not writing a section");
	let t = e.pos - e.writingSection.pSectionSize - 8, n = e.pos;
	e.pos = e.writingSection.pSectionSize, await e.writeULE64(t), e.pos = n, delete e.writingSection;
}
async function z(e, t, n) {
	if (e.readingSection !== void 0) throw Error("Already reading a section");
	if (!t[n]) throw Error(e.fileName + ": Missing section " + n);
	if (t[n].length > 1) throw Error(e.fileName + ": Section Duplicated " + n);
	e.pos = t[n][0].p, e.readingSection = t[n][0];
}
async function B(e, t) {
	if (e.readingSection === void 0) throw Error("Not reading a section");
	if (!t && e.pos - e.readingSection.p != e.readingSection.size) throw Error("Invalid section size reading");
	delete e.readingSection;
}
async function De(e, t, n, i) {
	let a = new Uint8Array(n);
	r.toRprLE(a, 0, t, n), await e.write(a, i);
}
async function Oe(e, t, n) {
	let i = await e.read(t, n);
	return r.fromRprLE(i, 0, t);
}
async function V(e, t, n, r, i) {
	i === void 0 && (i = t[r][0].size);
	let a = e.pageSize;
	await z(e, t, r), await L(n, r);
	for (let t = 0; t < i; t += a) {
		let r = Math.min(i - t, a), o = await e.read(r);
		await n.write(o);
	}
	await R(n), await B(e, i != t[r][0].size);
}
async function H(t, n, r, i, a) {
	if (i = i === void 0 ? 0 : i, a = a === void 0 ? n[r][0].size - i : a, i + a > n[r][0].size) throw Error("Reading out of the range of the section");
	let o;
	return o = a < Te ? new Uint8Array(a) : new e(a), await t.readToBuffer(o, 0, a, n[r][0].p + i), o;
}
async function ke(e, t, n, r, i) {
	let a = e.pageSize * 16;
	if (await z(e, t, i), await z(n, r, i), t[i][0].size != r[i][0].size) return !1;
	let o = t[i][0].size;
	for (let t = 0; t < o; t += a) {
		let r = Math.min(o - t, a), i = await e.read(r), s = await n.read(r);
		for (let e = 0; e < r; e++) if (i[e] != s[e]) return !1;
	}
	return await B(e), await B(n), !0;
}
//#endregion
//#region src/curves.js
var Ae = /* @__PURE__ */ l({
	getCurveFromName: () => Ie,
	getCurveFromQ: () => U,
	getCurveFromR: () => Fe
}), je = r.e("73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001", 16), Me = r.e("21888242871839275222246405745257275088548364400416034343698204186575808495617"), Ne = r.e("1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaab", 16), Pe = r.e("21888242871839275222246405745257275088696311157297823662689037894645226208583");
async function Fe(e, t) {
	let n, o = t && t.singleThread;
	if (r.eq(e, Me)) n = await a(o);
	else if (r.eq(e, je)) n = await i(o);
	else throw Error(`Curve not supported: ${r.toString(e)}`);
	return n;
}
async function U(e, t) {
	let n, o = t && t.singleThread;
	if (r.eq(e, Pe)) n = await a(o);
	else if (r.eq(e, Ne)) n = await i(o);
	else throw Error(`Curve not supported: ${r.toString(e)}`);
	return n;
}
async function Ie(e, t) {
	let n, r = t && t.singleThread, o = s(e);
	if ([
		"BN128",
		"BN254",
		"ALTBN128"
	].indexOf(o) >= 0) n = await a(r);
	else if (["BLS12381"].indexOf(o) >= 0) n = await i(r);
	else throw Error(`Curve not supported: ${e}`);
	return n;
	function s(e) {
		return e.toUpperCase().match(/[A-Za-z0-9]+/g).join("");
	}
}
//#endregion
//#region node_modules/@noble/hashes/utils.js
function Le(e) {
	return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array" && "BYTES_PER_ELEMENT" in e && e.BYTES_PER_ELEMENT === 1;
}
function Re(e, t = "") {
	if (typeof e != "number") {
		let n = t && `"${t}" `;
		throw TypeError(`${n}expected number, got ${typeof e}`);
	}
	if (!Number.isSafeInteger(e) || e < 0) {
		let n = t && `"${t}" `;
		throw RangeError(`${n}expected integer >= 0, got ${e}`);
	}
}
function ze(e, t, n = "") {
	let r = Le(e), i = e?.length, a = t !== void 0;
	if (!r || a && i !== t) {
		let o = n && `"${n}" `, s = a ? ` of length ${t}` : "", c = r ? `length=${i}` : `type=${typeof e}`, l = o + "expected Uint8Array" + s + ", got " + c;
		throw r ? RangeError(l) : TypeError(l);
	}
	return e;
}
function Be(e, t = !0) {
	if (e.destroyed) throw Error("Hash instance has been destroyed");
	if (t && e.finished) throw Error("Hash#digest() has already been called");
}
function Ve(e, t) {
	ze(e, void 0, "digestInto() output");
	let n = t.outputLen;
	if (e.length < n) throw RangeError("\"digestInto() output\" expected to be of length >=" + n);
}
function He(e) {
	return new Uint32Array(e.buffer, e.byteOffset, Math.floor(e.byteLength / 4));
}
function Ue(...e) {
	for (let t = 0; t < e.length; t++) e[t].fill(0);
}
var We = new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68;
function Ge(e) {
	return e << 24 & 4278190080 | e << 8 & 16711680 | e >>> 8 & 65280 | e >>> 24 & 255;
}
var Ke = We ? (e) => e : (e) => Ge(e) >>> 0;
function qe(e) {
	for (let t = 0; t < e.length; t++) e[t] = Ge(e[t]);
	return e;
}
var Je = We ? (e) => e : qe;
function Ye(e, t = {}) {
	let n = (t, n) => e(n).update(t).digest(), r = e(void 0);
	return n.outputLen = r.outputLen, n.blockLen = r.blockLen, n.canXOF = r.canXOF, n.create = (t) => e(t), Object.assign(n, t), Object.freeze(n);
}
//#endregion
//#region node_modules/@noble/hashes/_blake.js
var Xe = /* @__PURE__ */ Uint8Array.from([
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
]), Ze = /* @__PURE__ */ BigInt(2 ** 32 - 1), Qe = /* @__PURE__ */ BigInt(32);
function $e(e, t = !1) {
	return t ? {
		h: Number(e & Ze),
		l: Number(e >> Qe & Ze)
	} : {
		h: Number(e >> Qe & Ze) | 0,
		l: Number(e & Ze) | 0
	};
}
function et(e, t = !1) {
	let n = e.length, r = new Uint32Array(n), i = new Uint32Array(n);
	for (let a = 0; a < n; a++) {
		let { h: n, l: o } = $e(e[a], t);
		[r[a], i[a]] = [n, o];
	}
	return [r, i];
}
var tt = (e, t, n) => e >>> n | t << 32 - n, nt = (e, t, n) => e << 32 - n | t >>> n, rt = (e, t, n) => e << 64 - n | t >>> n - 32, it = (e, t, n) => e >>> n - 32 | t << 64 - n, at = (e, t) => t, ot = (e, t) => e, st = (e, t, n) => e << n | t >>> 32 - n, ct = (e, t, n) => t << n | e >>> 32 - n, lt = (e, t, n) => t << n - 32 | e >>> 64 - n, ut = (e, t, n) => e << n - 32 | t >>> 64 - n;
function dt(e, t, n, r) {
	let i = (t >>> 0) + (r >>> 0);
	return {
		h: e + n + (i / 2 ** 32 | 0) | 0,
		l: i | 0
	};
}
var ft = (e, t, n) => (e >>> 0) + (t >>> 0) + (n >>> 0), pt = (e, t, n, r) => t + n + r + (e / 2 ** 32 | 0) | 0, W = /* @__PURE__ */ Uint32Array.from([
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
]), G = /* @__PURE__ */ new Uint32Array(32);
function mt(e, t, n, r, i, a) {
	let o = i[a], s = i[a + 1], c = G[2 * e], l = G[2 * e + 1], u = G[2 * t], d = G[2 * t + 1], f = G[2 * n], p = G[2 * n + 1], m = G[2 * r], h = G[2 * r + 1], g = ft(c, u, o);
	l = pt(g, l, d, s), c = g | 0, {Dh: h, Dl: m} = {
		Dh: h ^ l,
		Dl: m ^ c
	}, {Dh: h, Dl: m} = {
		Dh: at(h, m),
		Dl: ot(h, m)
	}, {h: p, l: f} = dt(p, f, h, m), {Bh: d, Bl: u} = {
		Bh: d ^ p,
		Bl: u ^ f
	}, {Bh: d, Bl: u} = {
		Bh: tt(d, u, 24),
		Bl: nt(d, u, 24)
	}, G[2 * e] = c, G[2 * e + 1] = l, G[2 * t] = u, G[2 * t + 1] = d, G[2 * n] = f, G[2 * n + 1] = p, G[2 * r] = m, G[2 * r + 1] = h;
}
function ht(e, t, n, r, i, a) {
	let o = i[a], s = i[a + 1], c = G[2 * e], l = G[2 * e + 1], u = G[2 * t], d = G[2 * t + 1], f = G[2 * n], p = G[2 * n + 1], m = G[2 * r], h = G[2 * r + 1], g = ft(c, u, o);
	l = pt(g, l, d, s), c = g | 0, {Dh: h, Dl: m} = {
		Dh: h ^ l,
		Dl: m ^ c
	}, {Dh: h, Dl: m} = {
		Dh: tt(h, m, 16),
		Dl: nt(h, m, 16)
	}, {h: p, l: f} = dt(p, f, h, m), {Bh: d, Bl: u} = {
		Bh: d ^ p,
		Bl: u ^ f
	}, {Bh: d, Bl: u} = {
		Bh: rt(d, u, 63),
		Bl: it(d, u, 63)
	}, G[2 * e] = c, G[2 * e + 1] = l, G[2 * t] = u, G[2 * t + 1] = d, G[2 * n] = f, G[2 * n + 1] = p, G[2 * r] = m, G[2 * r + 1] = h;
}
function gt(e, t = {}, n, r, i) {
	if (Re(n), e <= 0 || e > n) throw Error("outputLen bigger than keyLen");
	let { key: a, salt: o, personalization: s } = t;
	if (a !== void 0 && (a.length < 1 || a.length > n)) throw Error("\"key\" expected to be undefined or of length=1.." + n);
	o !== void 0 && ze(o, r, "salt"), s !== void 0 && ze(s, i, "personalization");
}
var _t = class {
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
		Re(e), Re(t), this.blockLen = e, this.outputLen = t, this.buffer = new Uint8Array(e), this.buffer32 = He(this.buffer);
	}
	update(e) {
		Be(this), ze(e);
		let { blockLen: t, buffer: n, buffer32: r } = this, i = e.length, a = e.byteOffset, o = e.buffer;
		for (let s = 0; s < i;) {
			this.pos === t && (Je(r), this.compress(r, 0, !1), Je(r), this.pos = 0);
			let c = Math.min(t - this.pos, i - s), l = a + s;
			if (c === t && !(l % 4) && s + c < i) {
				let e = new Uint32Array(o, l, Math.floor((i - s) / 4));
				Je(e);
				for (let n = 0; s + t < i; n += r.length, s += t) this.length += t, this.compress(e, n, !1);
				Je(e);
				continue;
			}
			n.set(e.subarray(s, s + c), this.pos), this.pos += c, this.length += c, s += c;
		}
		return this;
	}
	digestInto(e) {
		Be(this), Ve(e, this);
		let { pos: t, buffer32: n } = this;
		if (this.finished = !0, Ue(this.buffer.subarray(t)), Je(n), this.compress(n, 0, !0), Je(n), e.byteOffset & 3) throw RangeError("\"digestInto() output\" expected 4-byte aligned byteOffset, got " + e.byteOffset);
		let r = this.get(), i = He(e), a = Math.floor(this.outputLen / 4);
		for (let e = 0; e < a; e++) i[e] = Ke(r[e]);
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
}, vt = class extends _t {
	v0l = W[0] | 0;
	v0h = W[1] | 0;
	v1l = W[2] | 0;
	v1h = W[3] | 0;
	v2l = W[4] | 0;
	v2h = W[5] | 0;
	v3l = W[6] | 0;
	v3h = W[7] | 0;
	v4l = W[8] | 0;
	v4h = W[9] | 0;
	v5l = W[10] | 0;
	v5h = W[11] | 0;
	v6l = W[12] | 0;
	v6h = W[13] | 0;
	v7l = W[14] | 0;
	v7h = W[15] | 0;
	constructor(e = {}) {
		let t = e.dkLen === void 0 ? 64 : e.dkLen;
		super(128, t), gt(t, e, 64, 16, 16);
		let { key: n, personalization: r, salt: i } = e, a = 0;
		if (n !== void 0 && (ze(n, void 0, "key"), a = n.length), this.v0l ^= this.outputLen | a << 8 | 16842752, i !== void 0) {
			ze(i, void 0, "salt");
			let e = He(i);
			this.v4l ^= Ke(e[0]), this.v4h ^= Ke(e[1]), this.v5l ^= Ke(e[2]), this.v5h ^= Ke(e[3]);
		}
		if (r !== void 0) {
			ze(r, void 0, "personalization");
			let e = He(r);
			this.v6l ^= Ke(e[0]), this.v6h ^= Ke(e[1]), this.v7l ^= Ke(e[2]), this.v7h ^= Ke(e[3]);
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
		this.get().forEach((e, t) => G[t] = e), G.set(W, 16);
		let { h: r, l: i } = $e(BigInt(this.length));
		G[24] = W[8] ^ i, G[25] = W[9] ^ r, n && (G[28] = ~G[28], G[29] = ~G[29]);
		let a = 0, o = Xe;
		for (let n = 0; n < 12; n++) mt(0, 4, 8, 12, e, t + 2 * o[a++]), ht(0, 4, 8, 12, e, t + 2 * o[a++]), mt(1, 5, 9, 13, e, t + 2 * o[a++]), ht(1, 5, 9, 13, e, t + 2 * o[a++]), mt(2, 6, 10, 14, e, t + 2 * o[a++]), ht(2, 6, 10, 14, e, t + 2 * o[a++]), mt(3, 7, 11, 15, e, t + 2 * o[a++]), ht(3, 7, 11, 15, e, t + 2 * o[a++]), mt(0, 5, 10, 15, e, t + 2 * o[a++]), ht(0, 5, 10, 15, e, t + 2 * o[a++]), mt(1, 6, 11, 12, e, t + 2 * o[a++]), ht(1, 6, 11, 12, e, t + 2 * o[a++]), mt(2, 7, 8, 13, e, t + 2 * o[a++]), ht(2, 7, 8, 13, e, t + 2 * o[a++]), mt(3, 4, 9, 14, e, t + 2 * o[a++]), ht(3, 4, 9, 14, e, t + 2 * o[a++]);
		this.v0l ^= G[0] ^ G[16], this.v0h ^= G[1] ^ G[17], this.v1l ^= G[2] ^ G[18], this.v1h ^= G[3] ^ G[19], this.v2l ^= G[4] ^ G[20], this.v2h ^= G[5] ^ G[21], this.v3l ^= G[6] ^ G[22], this.v3h ^= G[7] ^ G[23], this.v4l ^= G[8] ^ G[24], this.v4h ^= G[9] ^ G[25], this.v5l ^= G[10] ^ G[26], this.v5h ^= G[11] ^ G[27], this.v6l ^= G[12] ^ G[28], this.v6h ^= G[13] ^ G[29], this.v7l ^= G[14] ^ G[30], this.v7h ^= G[15] ^ G[31], Ue(G);
	}
	destroy() {
		this.destroyed = !0, Ue(this.buffer32), this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
	}
}, K = /* @__PURE__ */ Ye((e) => new vt(e)), yt = {}, bt = [];
for (let e = 0; e < 256; e++) bt[e] = xt(e, 8);
function xt(e, t) {
	let n = 0, r = e;
	for (let e = 0; e < t; e++) n <<= 1, n |= r & 1, r >>= 1;
	return n;
}
function St(e) {
	return (e & 4294901760 ? (e &= 4294901760, 16) : 0) | (e & 4278255360 ? (e &= 4278255360, 8) : 0) | (e & 4042322160 ? (e &= 4042322160, 4) : 0) | (e & 3435973836 ? (e &= 3435973836, 2) : 0) | !!(e & 2863311530);
}
function q(e, t) {
	let n = new DataView(e.buffer, e.byteOffset, e.byteLength), r = "";
	for (let e = 0; e < 4; e++) {
		e > 0 && (r += "\n"), r += "		";
		for (let t = 0; t < 4; t++) t > 0 && (r += " "), r += n.getUint32(e * 16 + t * 4).toString(16).padStart(8, "0");
	}
	return t && (r = t + "\n" + r), r;
}
function Ct(e, t) {
	if (e.byteLength != t.byteLength) return !1;
	for (var n = new Int8Array(e), r = new Int8Array(t), i = 0; i != e.byteLength; i++) if (n[i] != r[i]) return !1;
	return !0;
}
function wt(e) {
	return e.clone();
}
function Tt(e) {
	let t = e.subarray(0, 128), n = He(e.subarray(128)), r = K.create({ dkLen: 64 });
	r.buffer.set(t), r.v0l = n[0] | 0, r.v0h = n[1] | 0, r.v1l = n[2] | 0, r.v1h = n[3] | 0, r.v2l = n[4] | 0, r.v2h = n[5] | 0, r.v3l = n[6] | 0, r.v3h = n[7] | 0, r.v4l = n[8] | 0, r.v4h = n[9] | 0, r.v5l = n[10] | 0, r.v5h = n[11] | 0, r.v6l = n[12] | 0, r.v6h = n[13] | 0, r.v7l = n[14] | 0, r.v7h = n[15] | 0;
	let i = 2 ** 32, a = n[16] + n[17] * i, o = n[18] + n[19] * i;
	return r.length = a + o, r.pos = o, r;
}
function Et(e) {
	let t = /* @__PURE__ */ new Uint8Array(216), n = He(t.subarray(128));
	return t.set(e.buffer), n[0] = e.v0l, n[1] = e.v0h, n[2] = e.v1l, n[3] = e.v1h, n[4] = e.v2l, n[5] = e.v2h, n[6] = e.v3l, n[7] = e.v3h, n[8] = e.v4l, n[9] = e.v4h, n[10] = e.v5l, n[11] = e.v5h, n[12] = e.v6l, n[13] = e.v6h, n[14] = e.v7l, n[15] = e.v7h, n[18] = e.pos, n[16] = e.length - e.pos, t;
}
async function Dt(e, t, n, r, i) {
	return e.G1.isZero(t) || e.G1.isZero(n) || e.G2.isZero(r) || e.G2.isZero(i) ? !1 : await e.pairingEq(t, i, e.G1.neg(n), r);
}
function Ot() {
	if (typeof window < "u" && typeof window.prompt == "function") return window.prompt("Enter a random text. (Entropy): ", "");
	{
		let e = yt.createInterface({
			input: process.stdin,
			output: process.stdout
		});
		return new Promise((t) => {
			e.question("Enter a random text. (Entropy): ", (e) => t(e));
		});
	}
}
function kt(e) {
	let t = new Uint8Array(e);
	if (yt && yt.randomFillSync) yt.randomFillSync(t);
	else if (globalThis.crypto !== void 0 && globalThis.crypto.getRandomValues) for (let n = 0; n < e; n += 65536) globalThis.crypto.getRandomValues(t.subarray(n, Math.min(n + 65536, e)));
	else throw Error("No secure random source available");
	return t;
}
async function At(e) {
	if (yt && yt.createHash) return yt.createHash("sha256").update(e).digest();
	{
		let t = await globalThis.crypto.subtle.digest("SHA-256", e);
		return new Uint8Array(t);
	}
}
function jt(e, t) {
	return new DataView(e.buffer).getUint32(t, !1);
}
async function Mt(e) {
	for (; !e;) e = await Ot();
	let n = K.create(64);
	n.update(kt(64));
	let r = new TextEncoder();
	n.update(r.encode(e));
	let i = n.digest(), a = [];
	for (let e = 0; e < 8; e++) a[e] = jt(i, e * 4);
	return new t(a);
}
async function Nt(e, n) {
	let r, i;
	n < 32 ? (r = 1 << n >>> 0, i = 1) : (r = 4294967296, i = 1 << n - 32 >>> 0);
	let a = e;
	for (let e = 0; e < i; e++) for (let e = 0; e < r; e++) a = await At(a);
	let o = new DataView(a.buffer, a.byteOffset, a.byteLength), s = [];
	for (let e = 0; e < 8; e++) s[e] = o.getUint32(e * 4, !1);
	return new t(s);
}
function Pt(e) {
	return e instanceof Uint8Array ? e : (e.slice(0, 2) == "0x" && (e = e.slice(2)), new Uint8Array(e.match(/[\da-f]{2}/gi).map(function(e) {
		return parseInt(e, 16);
	})));
}
function Ft(e) {
	return Array.prototype.map.call(e, function(e) {
		return ("0" + (e & 255).toString(16)).slice(-2);
	}).join("");
}
function It(e, t) {
	if (t instanceof Uint8Array) return e.toString(t);
	if (Array.isArray(t)) return t.map(It.bind(null, e));
	if (typeof t == "object") {
		let n = {};
		return Object.keys(t).forEach((r) => {
			n[r] = It(e, t[r]);
		}), n;
	}
	return typeof t == "bigint" || t.eq !== void 0 ? t.toString(10) : t;
}
function Lt(e, t) {
	return t ? typeof e == "string" && /^https?:\/\//i.test(e) ? {
		type: "http",
		url: e,
		persistentCache: t
	} : e && e.type === "http" && !e.persistentCache ? Object.assign({}, e, { persistentCache: t }) : e : e;
}
//#endregion
//#region src/zkey_utils.js
async function Rt(e, t) {
	await L(e, 1), await e.writeULE32(1), await R(e);
	let n = await U(t.q);
	await L(e, 2);
	let i = n.q, a = (Math.floor((r.bitLength(i) - 1) / 64) + 1) * 8, o = n.r, s = (Math.floor((r.bitLength(o) - 1) / 64) + 1) * 8;
	await e.writeULE32(a), await De(e, i, a), await e.writeULE32(s), await De(e, o, s), await e.writeULE32(t.nVars), await e.writeULE32(t.nPublic), await e.writeULE32(t.domainSize), await zt(e, n, t.vk_alpha_1), await zt(e, n, t.vk_beta_1), await Bt(e, n, t.vk_beta_2), await Bt(e, n, t.vk_gamma_2), await zt(e, n, t.vk_delta_1), await Bt(e, n, t.vk_delta_2), await R(e);
}
async function zt(e, t, n) {
	let r = new Uint8Array(t.G1.F.n8 * 2);
	t.G1.toRprLEM(r, 0, n), await e.write(r);
}
async function Bt(e, t, n) {
	let r = new Uint8Array(t.G2.F.n8 * 2);
	t.G2.toRprLEM(r, 0, n), await e.write(r);
}
async function J(e, t, n) {
	let r = await e.read(t.G1.F.n8 * 2), i = t.G1.fromRprLEM(r, 0);
	return n ? t.G1.toObject(i) : i;
}
async function Vt(e, t, n) {
	let r = await e.read(t.G2.F.n8 * 2), i = t.G2.fromRprLEM(r, 0);
	return n ? t.G2.toObject(i) : i;
}
async function Ht(e, t, n, r) {
	await z(e, t, 1);
	let i = await e.readULE32();
	if (await B(e), i === 1) return await Ut(e, t, n, r);
	if (i === 2) return await Wt(e, t, n, r);
	if (i === 10) return await Gt(e, t, n, r);
	throw Error("Protocol not supported: ");
}
async function Ut(e, t, n, r) {
	let i = {};
	i.protocol = "groth16", await z(e, t, 2);
	let a = await e.readULE32();
	i.n8q = a, i.q = await Oe(e, a);
	let o = await e.readULE32();
	return i.n8r = o, i.r = await Oe(e, o), i.curve = await U(i.q, r), i.nVars = await e.readULE32(), i.nPublic = await e.readULE32(), i.domainSize = await e.readULE32(), i.power = St(i.domainSize), i.vk_alpha_1 = await J(e, i.curve, n), i.vk_beta_1 = await J(e, i.curve, n), i.vk_beta_2 = await Vt(e, i.curve, n), i.vk_gamma_2 = await Vt(e, i.curve, n), i.vk_delta_1 = await J(e, i.curve, n), i.vk_delta_2 = await Vt(e, i.curve, n), await B(e), i;
}
async function Wt(e, t, n, r) {
	let i = {};
	i.protocol = "plonk", await z(e, t, 2);
	let a = await e.readULE32();
	i.n8q = a, i.q = await Oe(e, a);
	let o = await e.readULE32();
	return i.n8r = o, i.r = await Oe(e, o), i.curve = await U(i.q, r), i.nVars = await e.readULE32(), i.nPublic = await e.readULE32(), i.domainSize = await e.readULE32(), i.power = St(i.domainSize), i.nAdditions = await e.readULE32(), i.nConstraints = await e.readULE32(), i.k1 = await e.read(o), i.k2 = await e.read(o), i.Qm = await J(e, i.curve, n), i.Ql = await J(e, i.curve, n), i.Qr = await J(e, i.curve, n), i.Qo = await J(e, i.curve, n), i.Qc = await J(e, i.curve, n), i.S1 = await J(e, i.curve, n), i.S2 = await J(e, i.curve, n), i.S3 = await J(e, i.curve, n), i.X_2 = await Vt(e, i.curve, n), await B(e), i;
}
async function Gt(e, t, n, r) {
	let i = {};
	i.protocol = "fflonk", i.protocolId = 10, await z(e, t, 2);
	let a = await e.readULE32();
	i.n8q = a, i.q = await Oe(e, a), i.curve = await U(i.q, r);
	let o = await e.readULE32();
	return i.n8r = o, i.r = await Oe(e, o), i.nVars = await e.readULE32(), i.nPublic = await e.readULE32(), i.domainSize = await e.readULE32(), i.power = St(i.domainSize), i.nAdditions = await e.readULE32(), i.nConstraints = await e.readULE32(), i.k1 = await e.read(o), i.k2 = await e.read(o), i.w3 = await e.read(o), i.w4 = await e.read(o), i.w8 = await e.read(o), i.wr = await e.read(o), i.X_2 = await Vt(e, i.curve, n), i.C0 = await J(e, i.curve, n), await B(e), i;
}
async function Kt(e, t) {
	let { fd: i, sections: a } = await I(e, "zkey", 1), o = await Ht(i, a, t), s = new n(o.r), c = r.mod(r.shl(1, o.n8r * 8), o.r), l = s.inv(c), u = s.mul(l, l), d = await U(o.q);
	await z(i, a, 3), o.IC = [];
	for (let e = 0; e <= o.nPublic; e++) {
		let e = await J(i, d, t);
		o.IC.push(e);
	}
	await B(i), await z(i, a, 4);
	let f = await i.readULE32();
	o.ccoefs = [];
	for (let e = 0; e < f; e++) {
		let e = await i.readULE32(), n = await i.readULE32(), r = await i.readULE32(), a = await p(t);
		o.ccoefs.push({
			matrix: e,
			constraint: n,
			signal: r,
			value: a
		});
	}
	await B(i), await z(i, a, 5), o.A = [];
	for (let e = 0; e < o.nVars; e++) {
		let n = await J(i, d, t);
		o.A[e] = n;
	}
	await B(i), await z(i, a, 6), o.B1 = [];
	for (let e = 0; e < o.nVars; e++) {
		let n = await J(i, d, t);
		o.B1[e] = n;
	}
	await B(i), await z(i, a, 7), o.B2 = [];
	for (let e = 0; e < o.nVars; e++) {
		let n = await Vt(i, d, t);
		o.B2[e] = n;
	}
	await B(i), await z(i, a, 8), o.C = [];
	for (let e = o.nPublic + 1; e < o.nVars; e++) {
		let n = await J(i, d, t);
		o.C[e] = n;
	}
	await B(i), await z(i, a, 9), o.hExps = [];
	for (let e = 0; e < o.domainSize; e++) {
		let e = await J(i, d, t);
		o.hExps.push(e);
	}
	return await B(i), await i.close(), o;
	async function p() {
		let e = await Oe(i, o.n8r);
		return s.mul(e, u);
	}
}
async function qt(e, t, n) {
	let r = { delta: {} };
	r.deltaAfter = await J(e, t, n), r.delta.g1_s = await J(e, t, n), r.delta.g1_sx = await J(e, t, n), r.delta.g2_spx = await Vt(e, t, n), r.transcript = await e.read(64), r.type = await e.readULE32();
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
async function Jt(e, t, n) {
	await z(e, n, 10);
	let r = { contributions: [] };
	r.csHash = await e.read(64);
	let i = await e.readULE32();
	for (let n = 0; n < i; n++) {
		let n = await qt(e, t);
		r.contributions.push(n);
	}
	return await B(e), r;
}
async function Yt(e, t, n) {
	await zt(e, t, n.deltaAfter), await zt(e, t, n.delta.g1_s), await zt(e, t, n.delta.g1_sx), await Bt(e, t, n.delta.g2_spx), await e.write(n.transcript), await e.writeULE32(n.type || 0);
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
async function Xt(e, t, n) {
	await L(e, 10), await e.write(n.csHash), await e.writeULE32(n.contributions.length);
	for (let r = 0; r < n.contributions.length; r++) await Yt(e, t, n.contributions[r]);
	await R(e);
}
function Zt(e, t, n) {
	let r = new Uint8Array(t.G1.F.n8 * 2);
	t.G1.toRprUncompressed(r, 0, n), e.update(r);
}
function Qt(e, t, n) {
	let r = new Uint8Array(t.G2.F.n8 * 2);
	t.G2.toRprUncompressed(r, 0, n), e.update(r);
}
function $t(e, t, n) {
	Zt(e, t, n.deltaAfter), Zt(e, t, n.delta.g1_s), Zt(e, t, n.delta.g1_sx), Qt(e, t, n.delta.g2_spx), e.update(n.transcript);
}
//#endregion
//#region src/wtns_utils.js
async function en(e, t, n) {
	await L(e, 1);
	let i = (Math.floor((r.bitLength(n) - 1) / 64) + 1) * 8;
	await e.writeULE32(i), await De(e, n, i), await e.writeULE32(t.length), await R(e), await L(e, 2);
	for (let n = 0; n < t.length; n++) await De(e, t[n], i);
	await R(e, 2);
}
async function tn(e, t, n) {
	await L(e, 1);
	let i = (Math.floor((r.bitLength(n) - 1) / 64) + 1) * 8;
	if (await e.writeULE32(i), await De(e, n, i), t.byteLength % i != 0) throw Error("Invalid witness length");
	await e.writeULE32(t.byteLength / i), await R(e), await L(e, 2), await e.write(t), await R(e);
}
async function nn(e, t) {
	await z(e, t, 1);
	let n = await e.readULE32(), r = await Oe(e, n), i = await e.readULE32();
	return await B(e), {
		n8: n,
		q: r,
		nWitness: i
	};
}
async function rn(e) {
	let { fd: t, sections: n } = await I(e, "wtns", 2), { n8: r, nWitness: i } = await nn(t, n);
	await z(t, n, 2);
	let a = [];
	for (let e = 0; e < i; e++) {
		let e = await Oe(t, r);
		a.push(e);
	}
	return await B(t), await t.close(), a;
}
//#endregion
//#region src/groth16_prove.js
var { stringifyBigInts: an } = s;
async function on(e, t, n, r) {
	let i = null;
	n && r && r.memoryLogging && typeof process < "u" && typeof process.memoryUsage == "function" && (i = pn(n, Number(r.memoryLogging) > 1 ? Number(r.memoryLogging) : 1e3));
	let a, o;
	try {
		let i = await I(t, "wtns", 2, 1 << 25, 1 << 23);
		a = i.fd;
		let s = await I(Lt(e, r && r.persistentCache), "zkey", 2, 1 << 25, 1 << 23);
		return o = s.fd, await sn(o, s.sections, a, i.sections, n, r);
	} finally {
		i && (clearInterval(i), fn(n)), o && await Promise.resolve(o.close()).catch(() => {}), a && await Promise.resolve(a.close()).catch(() => {});
	}
}
async function sn(e, t, n, i, a, o) {
	let s = await nn(n, i), c = await Ht(e, t, void 0, o);
	if (c.protocol !== "groth16") throw Error("zkey file is not groth16");
	if (!r.eq(c.r, s.q)) throw Error("Curve of the witness does not match the curve of the proving key");
	if (s.nWitness !== c.nVars) throw Error(`Invalid witness length. Circuit: ${c.nVars}, witness: ${s.nWitness}`);
	let l = c.curve, u = l.Fr, d = l.G1, f = l.G2;
	o ||= {};
	let p = o.msmBatching || "auto";
	if (p !== "auto" && p !== "enabled" && p !== "disabled") throw Error(`groth16Prove: invalid msmBatching "${p}" (expected "auto", "enabled" or "disabled")`);
	let m = o.msmGlv || "auto", h = o.msmGls || "auto";
	for (let [e, t] of [["msmGlv", m], ["msmGls", h]]) if (t !== "auto" && t !== "disabled") throw Error(`groth16Prove: invalid ${e} "${t}" (expected "auto" or "disabled")`);
	let g = {
		batch: p,
		glv: m,
		gls: h
	};
	if (o.buildABC !== void 0 && o.buildABC !== "js" && o.buildABC !== "stream") throw Error(`groth16Prove: invalid buildABC "${o.buildABC}" (expected "js" or "stream")`);
	let _ = St(c.domainSize);
	a && a.debug("Reading Wtns");
	let v = await H(n, i, 2), y = (n) => {
		let r = t[n][0].p, i = t[n][0].size;
		return async (t, a) => {
			/* c8 ignore start */
			if (t + a > i) throw Error(`groth16Prove: read out of range of section ${n}`);
			/* c8 ignore stop */
			let o = new Uint8Array(a);
			return await e.readToBuffer(o, 0, a, r + t), o;
		};
	}, b, x, S, C = (async function() {
		let n, r, i;
		await (async function() {
			a && a.debug("Reading Coeffs");
			let s = await H(e, t, 4);
			if (a && a.debug("Building ABC"), o.buildABC === "js") [n, r, i] = await cn(l, c, v, s, a);
			else {
				let e = ln(l, c, s, o);
				a && a.debug(`buildABC: stream nChunks=${e.nChunks} maxInFlight=${e.maxInFlight}`), [n, r, i] = await un(l, c, v, s, a, e.nChunks, e.maxInFlight);
			}
		})();
		/* c8 ignore start */
		let s = _ === u.s ? l.Fr.shift : l.Fr.w[_ + 1], d, f, p;
		await Promise.all([
			(async function() {
				let e = await u.ifft(n, "", "", a, "IFFT_A", !0);
				n = null;
				let t = await u.batchApplyKey(e, u.e(1), s);
				d = await u.fft(t, "", "", a, "FFT_A", !0);
			})(),
			(async function() {
				let e = await u.ifft(r, "", "", a, "IFFT_B", !0);
				r = null;
				let t = await u.batchApplyKey(e, u.e(1), s);
				f = await u.fft(t, "", "", a, "FFT_B", !0);
			})(),
			(async function() {
				let e = await u.ifft(i, "", "", a, "IFFT_C", !0);
				i = null;
				let t = await u.batchApplyKey(e, u.e(1), s);
				p = await u.fft(t, "", "", a, "FFT_C", !0);
			})()
		]), a && a.debug("Join ABC"), S = await dn(l, c, d, f, p, a), a && a.debug("Join ABC finished"), d = null, f = null, p = null;
	})(), w = {};
	async function T() {
		a && a.debug("Reading A Points"), w.pi_a = await l.G1.multiExpAffineChunked(y(5), t[5][0].size, v, a, "multiexp A", g);
	}
	let E = T(), D;
	async function O() {
		a && a.debug("Reading B1 Points"), D = await l.G1.multiExpAffineChunked(y(6), t[6][0].size, v, a, "multiexp B1", g);
	}
	let k = O();
	async function A() {
		a && a.debug("Reading B2 Points"), w.pi_b = await l.G2.multiExpAffineChunked(y(7), t[7][0].size, v, a, "multiexp B2", g);
	}
	let j = A(), M = (async function() {
		a && a.debug("Reading C Points"), w.pi_c = await l.G1.multiExpAffineChunked(y(8), t[8][0].size, v.slice((c.nPublic + 1) * l.Fr.n8), a, "multiexp C", g);
	})();
	x = (async function() {
		a && a.debug("Reading H Points"), await C, b = await l.G1.multiExpAffineChunked(y(9), t[9][0].size, S, a, "multiexp H", g);
	})();
	for (let e of [
		C,
		E,
		k,
		j,
		M,
		x
	]) e.catch(() => {});
	let N = l.Fr.random(), P = l.Fr.random();
	await E, w.pi_a = d.add(w.pi_a, c.vk_alpha_1), w.pi_a = d.add(w.pi_a, d.timesFr(c.vk_delta_1, N)), await j, w.pi_b = f.add(w.pi_b, c.vk_beta_2), w.pi_b = f.add(w.pi_b, f.timesFr(c.vk_delta_2, P)), await k, D = d.add(D, c.vk_beta_1), D = d.add(D, d.timesFr(c.vk_delta_1, P)), await Promise.all([M, x]), w.pi_c = d.add(w.pi_c, b), w.pi_c = d.add(w.pi_c, d.timesFr(w.pi_a, P)), w.pi_c = d.add(w.pi_c, d.timesFr(D, N)), w.pi_c = d.add(w.pi_c, d.timesFr(c.vk_delta_1, u.neg(u.mul(N, P))));
	let F = [];
	for (let e = 1; e <= c.nPublic; e++) {
		let t = v.slice(e * u.n8, e * u.n8 + u.n8);
		F.push(r.fromRprLE(t));
	}
	return w.pi_a = d.toObject(d.toAffine(w.pi_a)), w.pi_b = f.toObject(f.toAffine(w.pi_b)), w.pi_c = d.toObject(d.toAffine(w.pi_c)), w.protocol = "groth16", w.curve = l.name, w = an(w), F = an(F), {
		proof: w,
		publicSignals: F
	};
}
async function cn(t, n, r, i, a) {
	let o = t.Fr.n8, s = 12 + n.n8r, c = (i.byteLength - 4) / s, l = new e(n.domainSize * o), u = new e(n.domainSize * o), d = new e(n.domainSize * o), f = [l, u];
	for (let e = 0; e < c; e++) {
		/* c8 ignore start */
		a && e % 1e6 == 0 && a.debug(`QAP AB: ${e}/${c}`);
		/* c8 ignore stop */
		let n, l;
		if (i.buffer) {
			let t = 4 + e * s;
			n = new DataView(i.buffer, i.byteOffset + t, s), l = new Uint8Array(i.buffer, i.byteOffset + t + 12, o);
		} else {
			/* c8 ignore start */
			let t = i.slice(4 + e * s, 4 + e * s + s);
			n = new DataView(t.buffer), l = t.slice(12, 12 + o);
		}
		let u = n.getUint32(0, !0), d = n.getUint32(4, !0), p = n.getUint32(8, !0);
		f[u].set(t.Fr.add(f[u].slice(d * o, d * o + o), t.Fr.mul(l, r.slice(p * o, p * o + o))), d * o);
	}
	for (let e = 0; e < n.domainSize; e++)
 /* c8 ignore stop */
	a && e % 1e6 == 0 && a.debug(`QAP C: ${e}/${n.domainSize}`), d.set(t.Fr.mul(l.slice(e * o, e * o + o), u.slice(e * o, e * o + o)), e * o);
	return [
		l,
		u,
		d
	];
}
function ln(e, t, n, r) {
	/* c8 ignore next 2 */
	r ||= {};
	let i = e.Fr.n8, a = e.tm.concurrency || 1, o = (n.byteLength - 4) / (12 + i), s = n.byteLength + o * i + 3 * t.domainSize * i, c = r.buildABCFloorBudget || 268435456, l = Math.max(1, Math.ceil(s / 33554432)), u = Math.ceil(s / l), d = Math.max(1, Math.min(a, Math.floor(c / u)));
	return l = Math.min(256, Math.max(l, d * 3)), d = Math.min(d, l), r.buildABCnChunks && (l = r.buildABCnChunks), r.buildABCmaxInFlight && (d = r.buildABCmaxInFlight), {
		nChunks: l,
		maxInFlight: d
	};
}
async function un(t, n, r, i, a, o, s) {
	let c = t.Fr.n8, l = 12 + n.n8r, u = n.domainSize, d;
	/* c8 ignore start */
	if (i instanceof e) {
		let e = [], t = i.buffers[0].length;
		for (let t = 0; t < i.buffers.length; t++) e.push(new DataView(i.buffers[t].buffer));
		d = (n) => e[Math.floor(n / t)].getUint32(n % t, !0);
	} else {
		let e = new DataView(i.buffer, i.byteOffset, i.byteLength);
		d = (t) => e.getUint32(t, !0);
	}
	/* c8 ignore stop */
	function f(e) {
		let t = 0, n = d(0);
		for (; t < n;) {
			let r = Math.floor((n + t) / 2);
			d(4 + r * l + 4) < e ? t = r + 1 : n = r;
		}
		return 4 + t * l;
	}
	let p = Math.floor((u - 1) / o) + 1, m = [];
	for (let e = 0; e < o; e++) m.push(f(e * p));
	m.push(i.byteLength);
	let h = u * c, g = () => h < 1 << 30 ? new Uint8Array(h) : new e(h), _ = g(), v = g(), y = g(), b = /* @__PURE__ */ new Set(), x = [];
	for (let e = 0; e < o; e++) {
		let n = e * p, d = Math.min(p, u - n);
		if (d <= 0) break;
		let f = m[e], h = m[e + 1];
		for (; b.size >= s;) await Promise.race(b);
		a && a.debug(`buildABCStream: ${e}/${o}`);
		let g = (async () => {
			let e = i.slice(f, h), a = (h - f) / l, o = new Uint8Array(a * c), s = new Uint32Array(e.buffer, e.byteOffset, e.byteLength >> 2), u = l >> 2;
			if (r.buffer && !(r.byteOffset & 3) && c === 32) {
				let e = new Uint32Array(r.buffer, r.byteOffset, r.byteLength >> 2), t = new Uint32Array(o.buffer);
				for (let n = 0; n < a; n++) {
					let r = s[n * u + 2] << 3, i = n << 3;
					t[i] = e[r], t[i + 1] = e[r + 1], t[i + 2] = e[r + 2], t[i + 3] = e[r + 3], t[i + 4] = e[r + 4], t[i + 5] = e[r + 5], t[i + 6] = e[r + 6], t[i + 7] = e[r + 7], s[n * u + 2] = n;
				}
			} else {
				/* c8 ignore start */
				let e = !!r.buffer;
				for (let t = 0; t < a; t++) {
					let n = s[t * u + 2];
					e ? o.set(r.subarray(n * c, (n + 1) * c), t * c) : o.set(r.slice(n * c, (n + 1) * c), t * c), s[t * u + 2] = t;
				}
			}
			let p = [
				{
					cmd: "ALLOCSET",
					var: 0,
					buff: e
				},
				{
					cmd: "ALLOCSET",
					var: 1,
					buff: o
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
						{ val: a },
						{ var: 1 },
						{ var: 2 },
						{ var: 3 },
						{ var: 4 },
						{ val: n },
						{ val: d },
						{ val: 0 },
						{ val: a }
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
			], m = await t.tm.queueAction(p, [e.buffer, o.buffer]);
			_.set(m[0], n * c), v.set(m[1], n * c), y.set(m[2], n * c);
		})().finally(() => b.delete(g));
		b.add(g), x.push(g);
	}
	return await Promise.all(x), [
		_,
		v,
		y
	];
}
async function dn(t, n, r, i, a, o) {
	let s = 65536, c = t.Fr.n8, l = Math.floor(r.byteLength / t.Fr.n8), u = [];
	for (let e = 0; e < l; e += s) {
		o && o.debug(`JoinABC: ${e}/${l}`);
		let n = Math.min(l - e, s), d = [], f = r.slice(e * c, (e + n) * c), p = i.slice(e * c, (e + n) * c), m = a.slice(e * c, (e + n) * c);
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
			len: n * c
		}), d.push({
			cmd: "CALL",
			fnName: "qap_joinABC",
			params: [
				{ var: 0 },
				{ var: 1 },
				{ var: 2 },
				{ val: n },
				{ var: 3 }
			]
		}), d.push({
			cmd: "CALL",
			fnName: "frm_batchFromMontgomery",
			params: [
				{ var: 3 },
				{ val: n },
				{ var: 3 }
			]
		}), d.push({
			cmd: "GET",
			out: 0,
			var: 3,
			len: n * c
		}), u.push(t.tm.queueAction(d, [
			f.buffer,
			p.buffer,
			m.buffer
		]));
	}
	let d = await Promise.all(u), f;
	/* c8 ignore start */
	f = r instanceof e ? new e(r.byteLength) : new Uint8Array(r.byteLength);
	/* c8 ignore stop */
	let p = 0;
	for (let e = 0; e < d.length; e++) f.set(d[e][0], p), p += d[e][0].byteLength;
	return f;
}
function fn(e) {
	/* c8 ignore start */
	if (!e) return;
	/* c8 ignore stop */
	let t = process.memoryUsage();
	e.info("         ", "\x1B[0m Heap:\x1B[32m", `${Math.round(t.heapUsed / 1024 / 1024 * 100) / 100} MB`.padEnd(12), "\x1B[0m / \x1B[32m", `${Math.round(t.heapTotal / 1024 / 1024 * 100) / 100} MB`.padEnd(12), "\x1B[0m RSS:\x1B[32m", `${Math.round(t.rss / 1024 / 1024 * 100) / 100} MB`.padEnd(12), "\x1B[0m External:\x1B[32m", `${Math.round(t.external / 1024 / 1024 * 100) / 100} MB`.padEnd(12), "\x1B[0m ArrBuffers:\x1B[32m", `${Math.round(t.arrayBuffers / 1024 / 1024 * 100) / 100} MB`.padEnd(12), "\x1B[0m");
}
function pn(e, t = 5e3) {
	return setInterval(() => {
		fn(e);
	}, t);
}
//#endregion
//#region node_modules/fastfile/build/browser/browser.esm.js
function mn(e) {
	let t = e.initialSize || 1 << 20, n = new bn();
	return n.o = e, n.o.data = new Uint8Array(t), n.allocSize = t, n.totalSize = 0, n.readOnly = !1, n.pos = 0, n;
}
function hn(e) {
	let t = new bn();
	return t.o = e, t.allocSize = e.data.byteLength, t.totalSize = e.data.byteLength, t.readOnly = !0, t.pos = 0, t;
}
var gn = /* @__PURE__ */ new Uint8Array(4), _n = new DataView(gn.buffer), vn = /* @__PURE__ */ new Uint8Array(8), yn = new DataView(vn.buffer), bn = class {
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
		_n.setUint32(0, e, !0), await n.write(gn, t);
	}
	async writeUBE32(e, t) {
		let n = this;
		_n.setUint32(0, e, !1), await n.write(gn, t);
	}
	async writeULE64(e, t) {
		let n = this;
		yn.setUint32(0, e & 4294967295, !0), yn.setUint32(4, Math.floor(e / 4294967296), !0), await n.write(vn, t);
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
		if (n >= this.totalSize) {
			if (this.readOnly) throw Error("Reading out of bounds");
			return "";
		}
		let r = new Uint8Array(t.o.data.buffer, n, this.totalSize - n), i = r.findIndex((e) => e === 0), a = i !== -1, o = "";
		return a ? (o = new TextDecoder().decode(r.slice(0, i)), t.pos = n + i + 1) : t.pos = n, o;
	}
}, Y = 1 << 22;
function xn(e) {
	let t = e.initialSize || 0, n = new Dn();
	n.o = e;
	let r = t ? Math.floor((t - 1) / Y) + 1 : 0;
	n.o.data = [];
	for (let e = 0; e < r - 1; e++) n.o.data.push(new Uint8Array(Y));
	return r && n.o.data.push(new Uint8Array(t - Y * (r - 1))), n.totalSize = 0, n.readOnly = !1, n.pos = 0, n;
}
function Sn(e) {
	let t = new Dn();
	return t.o = e, t.totalSize = (e.data.length - 1) * Y + e.data[e.data.length - 1].byteLength, t.readOnly = !0, t.pos = 0, t;
}
var Cn = /* @__PURE__ */ new Uint8Array(4), wn = new DataView(Cn.buffer), Tn = /* @__PURE__ */ new Uint8Array(8), En = new DataView(Tn.buffer), Dn = class {
	constructor() {
		this.pageSize = 16384;
	}
	_resizeIfNeeded(e) {
		if (e <= this.totalSize) return;
		if (this.readOnly) throw Error("Reading out of file bounds");
		let t = Math.floor((e - 1) / Y) + 1;
		for (let n = Math.max(this.o.data.length - 1, 0); n < t; n++) {
			let r = n < t - 1 ? Y : e - (t - 1) * Y, i = new Uint8Array(r);
			n == this.o.data.length - 1 && i.set(this.o.data[n]), this.o.data[n] = i;
		}
		this.totalSize = e;
	}
	async write(e, t) {
		let n = this;
		if (t === void 0 && (t = n.pos), this.readOnly) throw Error("Writing a read only file");
		this._resizeIfNeeded(t + e.byteLength);
		let r = Math.floor(t / Y), i = t % Y, a = e.byteLength;
		for (; a > 0;) {
			let t = i + a > Y ? Y - i : a, o = e.slice(e.byteLength - a, e.byteLength - a + t);
			new Uint8Array(n.o.data[r].buffer, i, t).set(o), a -= t, r++, i = 0;
		}
		this.pos = t + e.byteLength;
	}
	async readToBuffer(e, t, n, r) {
		let i = this;
		if (r === void 0 && (r = i.pos), this.readOnly && r + n > this.totalSize) throw Error("Reading out of bounds");
		this._resizeIfNeeded(r + n);
		let a = Math.floor(r / Y), o = r % Y, s = n;
		for (; s > 0;) {
			let r = o + s > Y ? Y - o : s, c = new Uint8Array(i.o.data[a].buffer, o, r);
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
		wn.setUint32(0, e, !0), await n.write(Cn, t);
	}
	async writeUBE32(e, t) {
		let n = this;
		wn.setUint32(0, e, !1), await n.write(Cn, t);
	}
	async writeULE64(e, t) {
		let n = this;
		En.setUint32(0, e & 4294967295, !0), En.setUint32(4, Math.floor(e / 4294967296), !0), await n.write(Tn, t);
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
			let e = Math.floor(n / Y), a = n % Y;
			if (t.o.data[e] === void 0) throw Error("ERROR");
			let o = Math.min(2048, t.o.data[e].length - a);
			if (o <= 0) return t.pos = n, i;
			let s = new Uint8Array(t.o.data[e].buffer, a, o), c = s.findIndex((e) => e === 0);
			r = c !== -1, r ? (i += new TextDecoder().decode(s.slice(0, c)), t.pos = e * Y + a + c + 1) : (i += new TextDecoder().decode(s), t.pos = e * Y + a + s.length), n = t.pos;
		}
		return i;
	}
}, On = 1 << 20, kn = 8192, An = class {
	constructor(e, t, n, r) {
		this.readRangeInto = e, this.totalSize = t, this.pos = 0, this.pageSize = r || kn, this.maxPagesLoaded = Math.floor((n || On) / this.pageSize) + 1, this.pages = /* @__PURE__ */ new Map(), this.readOnly = !0;
	}
	_pageLen(e) {
		let t = e * this.pageSize;
		return Math.min(t + this.pageSize, this.totalSize) - t;
	}
	_loadPage(e) {
		let t = this, n = t.pages.get(e);
		if (n) return t.pages.delete(e), t.pages.set(e, n), n.promise;
		let r = new Uint8Array(t._pageLen(e));
		return n = {
			buff: null,
			promise: null
		}, n.promise = t.readRangeInto(r, 0, e * t.pageSize, r.byteLength).then(function() {
			return n.buff = r, r;
		}, function(n) {
			throw t.pages.delete(e), n;
		}), t.pages.set(e, n), t._trimCache(), n.promise;
	}
	_trimCache() {
		let e = this;
		if (!(e.pages.size <= e.maxPagesLoaded)) for (let t of e.pages) {
			if (e.pages.size <= e.maxPagesLoaded) return;
			t[1].buff && e.pages.delete(t[0]);
		}
	}
	async readToBuffer(e, t, n, r) {
		let i = this;
		if (n === 0) return;
		if (i.pendingClose) throw Error("Reading a closing file");
		if (r === void 0 && (r = i.pos), r + n > i.totalSize) throw Error("Reading out of bounds");
		if (i.pos = r + n, n >= i.pageSize) {
			await i.readRangeInto(e, t, r, n);
			return;
		}
		let a = Math.floor(r / i.pageSize), o = Math.floor((r + n - 1) / i.pageSize), s = r % i.pageSize, c = 0;
		for (let r = a; r <= o; r++) {
			let a = await i._loadPage(r), o = Math.min(n - c, i.pageSize - s);
			e.set(a.subarray(s, s + o), t + c), c += o, s = 0;
		}
	}
	async read(e, t) {
		let n = new Uint8Array(e);
		return await this.readToBuffer(n, 0, e, t), n;
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
		let t = this;
		if (t.pendingClose) throw Error("Reading a closing file");
		let n = e === void 0 ? t.pos : e, r = [];
		for (; n < t.totalSize;) {
			let e = Math.min(t.pageSize, t.totalSize - n), i = await t.read(e, n), a = i.indexOf(0);
			if (a >= 0) return r.push(i.subarray(0, a)), t.pos = n + a + 1, jn(r);
			r.push(i), n += e;
		}
		return t.pos = n, jn(r);
	}
	async write() {
		throw Error("Writing a read only file");
	}
	async writeULE32() {
		throw Error("Writing a read only file");
	}
	async writeUBE32() {
		throw Error("Writing a read only file");
	}
	async writeULE64() {
		throw Error("Writing a read only file");
	}
	async close() {
		this.pendingClose || (this.pendingClose = !0, this.pages.clear());
	}
	async discard() {
		await this.close();
	}
};
function jn(e) {
	let t = 0;
	for (let n = 0; n < e.length; n++) t += e[n].byteLength;
	let n = new Uint8Array(t), r = 0;
	for (let t = 0; t < e.length; t++) n.set(e[t], r), r += e[t].byteLength;
	return new TextDecoder().decode(n);
}
var Mn = 1 << 21, Nn = 1 << 29, Pn = "fastfile-http-cache", Fn = /* @__PURE__ */ new Map();
function In(e) {
	if (Fn.has(e)) return Fn.get(e);
	let t = new Promise((t, n) => {
		let r = indexedDB.open(e, 1);
		r.onupgradeneeded = () => {
			let e = r.result;
			e.createObjectStore("files"), e.createObjectStore("blocks");
		}, r.onsuccess = () => t(r.result), r.onerror = () => n(r.error), r.onblocked = () => n(/* @__PURE__ */ Error("IndexedDB open blocked"));
	});
	return Fn.set(e, t), t.catch(() => Fn.delete(e)), t;
}
function Ln(e) {
	return new Promise((t, n) => {
		e.onsuccess = () => t(e.result), e.onerror = () => n(e.error);
	});
}
function Rn(e) {
	return new Promise((t, n) => {
		e.oncomplete = () => t(), e.onerror = () => n(e.error), e.onabort = () => n(e.error || /* @__PURE__ */ Error("IndexedDB transaction aborted"));
	});
}
function zn(e, t, n) {
	return IDBKeyRange.bound([e, t], [e, n]);
}
async function Bn(e, t) {
	let n = e.transaction(["files", "blocks"], "readwrite");
	n.objectStore("files").delete(t), n.objectStore("blocks").delete(zn(t, 0, Infinity)), await Rn(n);
}
async function Vn(e, t, n, r, i, a) {
	let o = e.transaction(["files", "blocks"], "readwrite"), s = o.objectStore("files"), c = await Ln(s.get(t)), l = 0;
	c && c.validator === n && c.totalSize === r && c.blockSize === i ? l = c.bytes : c && o.objectStore("blocks").delete(zn(t, 0, Infinity)), s.put({
		validator: n,
		totalSize: r,
		blockSize: i,
		bytes: l,
		lastUsed: Date.now()
	}, t), await Rn(o);
	let u = e.transaction("files", "readonly"), d = u.objectStore("files"), [f, p] = await Promise.all([Ln(d.getAllKeys()), Ln(d.getAll())]);
	await Rn(u);
	let m = p.reduce((e, t) => e + t.bytes, 0);
	if (m <= a) return;
	let h = f.map((e, t) => ({
		key: e,
		meta: p[t]
	})).filter((e) => e.key !== t).sort((e, t) => e.meta.lastUsed - t.meta.lastUsed);
	for (let t of h) {
		if (m <= a) break;
		await Bn(e, t.key), m -= t.meta.bytes;
	}
}
async function Hn(e, t) {
	let { fileKey: n, validator: r, totalSize: i } = t, a = typeof t.options == "object" && t.options || {}, o = a.blockSize || Mn, s = a.maxBytes || Nn, c = a.dbName || Pn;
	if (typeof indexedDB > "u" || !r) return e;
	let l;
	try {
		l = await In(c), await Vn(l, n, r, i, o, s);
	} catch {
		return e;
	}
	let u = !1;
	async function d(e, t) {
		let r = l.transaction("blocks", "readonly"), i = r.objectStore("blocks"), a = zn(n, e, t), [o, s] = await Promise.all([Ln(i.getAllKeys(a)), Ln(i.getAll(a))]);
		await Rn(r);
		let c = /* @__PURE__ */ new Map();
		for (let e = 0; e < o.length; e++) c.set(o[e][1], s[e]);
		return c;
	}
	async function f(e) {
		if (!(u || e.length === 0)) try {
			let t = l.transaction(["files", "blocks"], "readwrite"), r = t.objectStore("blocks"), i = t.objectStore("files");
			for (let t of e) r.put(t.data, [n, t.index]);
			let a = await Ln(i.get(n));
			a && (a.bytes += e.reduce((e, t) => e + t.data.byteLength, 0), a.lastUsed = Date.now(), i.put(a, n)), await Rn(t);
		} catch {
			u = !0;
		}
	}
	let p = (e) => Math.min(o, i - e * o), m = /* @__PURE__ */ new Map();
	function h(e) {
		let t, n, r = new Promise((e, r) => {
			t = e, n = r;
		});
		return r.catch(() => {}), m.set(e, r), {
			resolve: t,
			reject: n,
			promise: r
		};
	}
	return async function(t, n, r, i) {
		if (i === 0) return;
		let a = Math.floor(r / o), s = Math.floor((r + i - 1) / o), c = await d(a, s), l = [], u = (e, a) => {
			let s = a * o, c = Math.max(r, s), l = Math.min(r + i, s + p(a));
			t.set(e.subarray(c - s, l - s), n + (c - r));
		}, g = a;
		for (; g <= s;) {
			let a = g * o, d = a + p(g), f = c.get(g);
			if (f) {
				u(f, g), g++;
				continue;
			}
			let _ = m.get(g);
			if (_) {
				u(await _, g), g++;
				continue;
			}
			if (a >= r && d <= r + i) {
				let u = g;
				for (; u + 1 <= s && !c.get(u + 1) && !m.get(u + 1) && (u + 1) * o + p(u + 1) <= r + i;) u++;
				let d = a, f = u * o + p(u), _ = [];
				for (let e = g; e <= u; e++) _.push(h(e));
				try {
					await e(t, n + (d - r), d, f - d);
				} catch (e) {
					for (let t = g; t <= u; t++) _[t - g].reject(e), m.delete(t);
					throw e;
				}
				for (let e = g; e <= u; e++) {
					let i = e * o, a = t.slice(n + (i - r), n + (i - r) + p(e));
					_[e - g].resolve(a), l.push({
						index: e,
						data: a
					});
				}
				g = u + 1;
			} else {
				let t = h(g), n = new Uint8Array(p(g));
				try {
					await e(n, 0, a, n.length);
				} catch (e) {
					throw t.reject(e), m.delete(g), e;
				}
				t.resolve(n), u(n, g), l.push({
					index: g,
					data: n
				}), g++;
			}
		}
		await f(l);
		for (let e of l) m.delete(e.index);
	};
}
async function Un(e) {
	let t = (typeof e.options == "object" && e.options || {}).dbName || Pn;
	if (typeof indexedDB > "u") return null;
	try {
		let n = (await In(t)).transaction("files", "readonly"), r = await Ln(n.objectStore("files").get(e.fileKey));
		return await Rn(n), r ? {
			validator: r.validator,
			totalSize: r.totalSize,
			blockSize: r.blockSize,
			bytes: r.bytes
		} : null;
	} catch {
		return null;
	}
}
async function Wn(e) {
	let { fileKey: t, validator: n, totalSize: r, data: i } = e, a = typeof e.options == "object" && e.options || {}, o = a.blockSize || Mn, s = a.maxBytes || Nn, c = a.dbName || Pn;
	if (typeof indexedDB > "u" || !n) return !1;
	try {
		let e = await In(c);
		await Vn(e, t, n, r, o, s);
		let a = Math.ceil(r / o);
		for (let n = 0; n < a; n += 64) {
			let s = e.transaction("blocks", "readwrite"), c = s.objectStore("blocks");
			for (let e = n; e < Math.min(n + 64, a); e++) {
				let n = e * o;
				c.put(i.slice(n, Math.min(n + o, r)), [t, e]);
			}
			await Rn(s);
		}
		let l = e.transaction("files", "readwrite"), u = l.objectStore("files"), d = await Ln(u.get(t));
		return d && (d.bytes = r, d.lastUsed = Date.now(), u.put(d, t)), await Rn(l), !0;
	} catch {
		return !1;
	}
}
var Gn = 65536;
async function Kn(e) {
	let t = e.url, n = e.persistentCache ? await Un({
		fileKey: t,
		options: e.persistentCache
	}) : null, r = { Range: "bytes=0-0" };
	n && n.validator && (n.validator[0] === "\"" || n.validator.indexOf("W/") === 0 ? r["If-None-Match"] = n.validator : r["If-Modified-Since"] = n.validator);
	let i;
	try {
		i = await fetch(t, { headers: r });
	} catch (e) {
		if (!("If-None-Match" in r) && !("If-Modified-Since" in r)) throw e;
		i = await fetch(t, { headers: { Range: "bytes=0-0" } });
	}
	if (i.status === 304) return await nr(i), await qn(t, n.validator, n.totalSize, e);
	if (i.status === 206) {
		let n = i.headers.get("content-range"), r = n ? /\/(\d+)\s*$/.exec(n) : null;
		if (r) {
			let n = parseInt(r[1]);
			return await i.arrayBuffer(), await qn(t, Yn(i), n, e);
		}
		return await i.arrayBuffer(), await Jn(t);
	}
	if (!i.ok && i.status !== 416) throw Error("HTTP " + i.status + " fetching " + t);
	if (i.status === 416) {
		let e = i.headers.get("content-range");
		return e && /\/0\s*$/.test(e) ? hn({
			type: "mem",
			data: /* @__PURE__ */ new Uint8Array()
		}) : await Jn(t);
	}
	let a = new Uint8Array(await i.arrayBuffer());
	if (e.persistentCache) {
		let n = Yn(i);
		n && await Wn({
			fileKey: t,
			validator: n,
			totalSize: a.length,
			options: e.persistentCache,
			data: a
		});
	}
	return hn({
		type: "mem",
		data: a
	});
}
async function qn(e, t, n, r) {
	let i = null, a = async function(n, r, a, o) {
		if (!i) try {
			return await er(e, t, n, r, a, o);
		} catch (e) {
			if (!e || !e.degradeToFull) throw e;
			i = e.fullBodyPromise;
		}
		let s = await i;
		if (a + o > s.byteLength) throw Error(e + ": read past the end of the buffered body");
		n.set(s.subarray(a, a + o), r);
	}, o = Math.min(r.pageSize || Gn, Gn);
	return r.persistentCache && (a = await Hn(a, {
		fileKey: e,
		validator: t,
		totalSize: n,
		options: r.persistentCache
	})), new An(a, n, r.cacheSize, o);
}
async function Jn(e) {
	let t = await fetch(e);
	if (!t.ok) throw Error("HTTP " + t.status + " fetching " + e);
	return hn({
		type: "mem",
		data: new Uint8Array(await t.arrayBuffer())
	});
}
function Yn(e) {
	let t = e.headers.get("etag");
	return t && t.indexOf("W/") !== 0 ? t : e.headers.get("last-modified") || null;
}
var Xn = 4, Zn = 0, Qn = [];
async function $n(e) {
	for (; Zn >= Xn;) await new Promise((e) => Qn.push(e));
	Zn++;
	try {
		return await e();
	} finally {
		Zn--;
		let e = Qn.shift();
		e && e();
	}
}
async function er(e, t, n, r, i, a) {
	return $n(() => tr(e, t, n, r, i, a));
}
async function tr(e, t, n, r, i, a) {
	let o = { Range: "bytes=" + i + "-" + (i + a - 1) };
	t && (o["If-Range"] = t);
	let s = await fetch(e, { headers: o });
	if (s.status === 200) {
		let n = Yn(s);
		if (!t || n && n === t) {
			let t = /* @__PURE__ */ Error(e + ": origin ignored Range; degrading to full buffering");
			throw t.degradeToFull = !0, t.fullBodyPromise = s.arrayBuffer().then((e) => new Uint8Array(e)), t;
		}
		throw await nr(s), Error(e + ": file changed (or server stopped honoring Range) while reading");
	}
	if (s.status !== 206) throw await nr(s), Error("HTTP " + s.status + " reading range " + i + "+" + a + " of " + e);
	let c = s.headers.get("content-range"), l = c ? /bytes\s+(\d+)-(\d+)\//.exec(c) : null;
	if (l && parseInt(l[1]) !== i) throw await nr(s), Error(e + ": server returned range starting at " + l[1] + ", requested " + i);
	let u = 0;
	if (s.body && typeof s.body.getReader == "function") {
		let t = s.body.getReader();
		for (;;) {
			let i = await t.read();
			if (i.done) break;
			if (u + i.value.byteLength > a) throw t.cancel().catch(function() {}), Error(e + ": range response longer than requested");
			n.set(i.value, r + u), u += i.value.byteLength;
		}
	} else {
		/* c8 ignore start */
		let t = new Uint8Array(await s.arrayBuffer());
		if (t.byteLength > a) throw Error(e + ": range response longer than requested");
		n.set(t, r), u = t.byteLength;
	}
	if (u !== a) throw Error(e + ": short range response (" + u + "/" + a + " bytes at " + i + ")");
}
async function nr(e) {
	try {
		e.body && typeof e.body.cancel == "function" ? await e.body.cancel() : await e.arrayBuffer();
	} catch {}
}
var rr = 1 << 20;
function ir(e) {
	let t = e.blob, n = async function(e, n, r, i) {
		let a = await t.slice(r, r + i).arrayBuffer();
		if (a.byteLength !== i) throw Error("short blob read (" + a.byteLength + "/" + i + " bytes at " + r + ")");
		e.set(new Uint8Array(a), n);
	}, r = Math.min(e.pageSize || rr, rr);
	return new An(n, t.size, e.cacheSize, r);
}
function ar() {
	throw Error("File I/O is not supported in the browser");
}
function or(e) {
	return e instanceof Uint8Array ? {
		type: "mem",
		data: e
	} : (typeof e == "string" && ar(), e);
}
function sr(e, t, n) {
	if (e.type === "file" && ar(), e.type === "mem") return t(e);
	if (e.type === "bigMem") return n(e);
	throw Error("Invalid FastFile type: " + e.type);
}
function cr(e) {
	return sr(or(e), mn, xn);
}
async function lr(e, t, n) {
	return e instanceof Uint8Array && (e = {
		type: "mem",
		data: e
	}), typeof Blob < "u" && e instanceof Blob && (e = {
		type: "blob",
		blob: e,
		cacheSize: t,
		pageSize: n
	}), typeof e == "string" && (e = {
		type: "http",
		url: e,
		cacheSize: t,
		pageSize: n
	}), e.type === "http" ? await Kn(e) : e.type === "blob" ? ir(e) : sr(e, hn, Sn);
}
//#endregion
//#region node_modules/circom_runtime/js/utils.js
function ur(e) {
	let t = [];
	return n(t, e), t;
	function n(e, t) {
		if (Array.isArray(t)) for (let r = 0; r < t.length; r++) n(e, t[r]);
		else e.push(t);
	}
}
function dr(e, t) {
	let n = BigInt(e) % t;
	return n < 0 && (n += t), n;
}
function fr(e) {
	let t = BigInt(2) ** BigInt(64), n = BigInt("0xCBF29CE484222325");
	for (let r = 0; r < e.length; r++) n ^= BigInt(e[r].charCodeAt(0)), n *= BigInt(1099511628211), n %= t;
	let r = n.toString(16), i = 16 - r.length;
	return r = "0".repeat(i).concat(r), r;
}
function pr(e, t) {
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
async function mr(e, t) {
	let n, i, a;
	t ||= {};
	let o = 1, s = 0, c = 0, l = !1;
	if (e instanceof WebAssembly.Instance) n = e, l = !0;
	else {
		let l = 32767;
		if (t.memorySize && (l = parseInt(t.memorySize), l < 0)) throw Error("Invalid memory size");
		let u = !1;
		for (; !u;) try {
			a = new WebAssembly.Memory({ initial: l }), u = !0;
		} catch (e) {
			if (l <= 1) throw e;
			console.warn("Could not allocate " + l * 1024 * 64 + " bytes. This may cause severe instability. Trying with " + l * 1024 * 64 / 2 + " bytes"), l = Math.floor(l / 2);
		}
		let p = await WebAssembly.compile(e), m = "", h = "";
		n = await WebAssembly.instantiate(p, {
			env: { memory: a },
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
					if (o >= 2 && (s >= 1 || c >= 7)) {
						h !== "" && (h += " ");
						let e = r.fromArray(t, 4294967296).toString();
						h += e;
					} else console.log(r.fromArray(t, 4294967296));
				},
				error: function(e, n, r, a, o, s) {
					let c;
					throw c = e === 7 ? f(n) + " " + i.getFr(a).toString() + " != " + i.getFr(o).toString() + " " + f(s) : e === 9 ? f(n) + " " + i.getFr(a).toString() + " " + f(o) : e === 5 && t.sym ? f(n) + " " + t.sym.labelIdx2Name[o] : f(n) + " " + r + " " + a + " " + o + " " + s, console.log("ERROR: ", e, c), Error(c);
				},
				log: function(e) {
					console.log(i.getFr(e).toString());
				},
				logGetSignal: function(e, n) {
					t.logGetSignal && t.logGetSignal(e, i.getFr(n));
				},
				logSetSignal: function(e, n) {
					t.logSetSignal && t.logSetSignal(e, i.getFr(n));
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
	typeof n.exports.getVersion == "function" && (o = n.exports.getVersion()), typeof n.exports.getMinorVersion == "function" && (s = n.exports.getMinorVersion()), typeof n.exports.getPatchVersion == "function" && (c = n.exports.getPatchVersion());
	let u = t && (t.sanityCheck || t.logGetSignal || t.logSetSignal || t.logStartComponent || t.logFinishComponent);
	if (o === 2) i = new gr(n, u);
	else if (o === 1) {
		if (l) throw Error("Loading code from WebAssembly instance is not supported for circom version 1");
		i = new hr(a, n, u);
	} else throw Error(`Unsupported circom version: ${o}`);
	return i;
	function d() {
		let e = "", t = n.exports.getMessageChar();
		for (; t !== 0;) e += String.fromCharCode(t), t = n.exports.getMessageChar();
		return e;
	}
	function f(e) {
		let t = new Uint8Array(a.buffer), n = [];
		for (let r = 0; t[e + r] > 0; r++) n.push(t[e + r]);
		return String.fromCharCode.apply(null, n);
	}
}
var hr = class {
	constructor(e, t, i) {
		this.memory = e, this.i32 = new Uint32Array(e.buffer), this.instance = t, this.n32 = (this.instance.exports.getFrLen() >> 2) - 2;
		let a = this.instance.exports.getPRawPrime(), o = Array(this.n32);
		for (let e = 0; e < this.n32; e++) o[this.n32 - 1 - e] = this.i32[(a >> 2) + e];
		this.prime = r.fromArray(o, 4294967296), this.Fr = new n(this.prime), this.mask32 = r.fromString("FFFFFFFF", 16), this.NVars = this.instance.exports.getNVars(), this.n64 = Math.floor((this.Fr.bitLength - 1) / 64) + 1, this.R = this.Fr.e(r.shiftLeft(1, this.n64 * 64)), this.RInv = this.Fr.inv(this.R), this.sanityCheck = i;
	}
	circom_version() {
		return 1;
	}
	async _doCalculateWitness(e, t) {
		this.instance.exports.init(this.sanityCheck || t ? 1 : 0);
		let n = this.allocInt(), r = this.allocFr();
		Object.keys(e).forEach((t) => {
			let i = fr(t), a = parseInt(i.slice(0, 8), 16), o = parseInt(i.slice(8, 16), 16);
			try {
				this.instance.exports.getSignalOffset32(n, 0, a, o);
			} catch {
				throw Error(`Signal ${t} is not an input of the circuit.`);
			}
			let s = this.getInt(n), c = ur(e[t]);
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
			let a = t.Fr.e(r.fromArray(e, 4294967296));
			return t.i32[n + 1] & 1073741824 ? i(a) : a;
		}
		if (t.i32[n] & 2147483648) return t.Fr.e(t.i32[n] - 4294967296);
		return t.Fr.e(t.i32[n]);
		function i(e) {
			return t.Fr.mul(t.RInv, e);
		}
	}
	setFr(e, t) {
		let n = this;
		t = n.Fr.e(t);
		let i = n.Fr.neg(n.Fr.e("80000000", 16)), a = n.Fr.e("7FFFFFFF", 16);
		if (n.Fr.geq(t, i) && n.Fr.leq(t, a)) {
			let a;
			n.Fr.geq(t, n.Fr.zero) ? a = r.toNumber(t) : (a = r.toNumber(n.Fr.sub(t, i)), a -= 2147483648, a = 4294967296 + a), n.i32[e >> 2] = a, n.i32[(e >> 2) + 1] = 0;
			return;
		}
		n.i32[e >> 2] = 0, n.i32[(e >> 2) + 1] = 2147483648;
		let o = r.toArray(t, 4294967296);
		for (let t = 0; t < n.n32; t++) {
			let r = o.length - 1 - t;
			r >= 0 ? n.i32[(e >> 2) + 2 + t] = o[r] : n.i32[(e >> 2) + 2 + t] = 0;
		}
	}
}, gr = class {
	constructor(e, t) {
		this.instance = e, this.version = this.instance.exports.getVersion(), this.n32 = this.instance.exports.getFieldNumLen32(), this.instance.exports.getRawPrime();
		let n = new Uint32Array(this.n32);
		for (let e = 0; e < this.n32; e++) n[this.n32 - 1 - e] = this.instance.exports.readSharedRWMemory(e);
		this.prime = r.fromArray(n, 4294967296), this.witnessSize = this.instance.exports.getWitnessSize(), this.sanityCheck = t;
	}
	circom_version() {
		return this.instance.exports.getVersion();
	}
	async _doCalculateWitness(e, t) {
		this.instance.exports.init(this.sanityCheck || t ? 1 : 0);
		let n = Object.keys(e), r = 0;
		if (n.forEach((t) => {
			let n = fr(t), i = parseInt(n.slice(0, 8), 16), a = parseInt(n.slice(8, 16), 16), o = ur(e[t]);
			if (typeof this.instance.exports.getInputSignalSize == "function") {
				let e = this.instance.exports.getInputSignalSize(i, a);
				if (e < 0) throw Error(`Signal ${t} not found\n`);
				if (o.length < e) throw Error(`Not enough values for input signal ${t}\n`);
				if (o.length > e) throw Error(`Too many values for input signal ${t}\n`);
			}
			for (let e = 0; e < o.length; e++) {
				let t = pr(dr(o[e], this.prime), this.n32);
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
			n.push(r.fromArray(t, 4294967296));
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
}, { unstringifyBigInts: _r } = s;
async function vr(e, t, n, r) {
	let i = _r(e), a = await lr(Lt(t, r && r.persistentCache)), o = await a.read(a.totalSize);
	await a.close();
	let s = await mr(o, r);
	if (s.circom_version() === 1) {
		let e = await s.calculateBinWitness(i), t = await Ee(n, "wtns", 2, 2);
		try {
			await tn(t, e, s.prime);
		} finally {
			await t.close();
		}
	} else {
		let e = await s.calculateWTNSBin(i), t = await cr(n);
		try {
			await t.write(e);
		} finally {
			await t.close();
		}
	}
}
//#endregion
//#region src/groth16_fullprove.js
var { unstringifyBigInts: yr } = s;
async function br(e, t, n, r, i, a) {
	let o = yr(e), s = { type: "mem" };
	return await vr(o, t, s, i), await on(n, s, r, a);
}
//#endregion
//#region src/groth16_verify.js
var { unstringifyBigInts: xr } = s;
async function Sr(e, t, n, i) {
	let a = xr(e), o = xr(n), s = xr(t), c = await Ie(a.curve), l = c.G1.fromObject(a.IC[0]), u = new Uint8Array(c.G1.F.n8 * 2 * s.length), d = new Uint8Array(c.Fr.n8 * s.length);
	if (!Tr(c, s)) return i && i.error("Public inputs are not valid."), !1;
	for (let e = 0; e < s.length; e++) {
		let t = c.G1.fromObject(a.IC[e + 1]);
		u.set(t, e * c.G1.F.n8 * 2), r.toRprLE(d, c.Fr.n8 * e, s[e], c.Fr.n8);
	}
	let f = await c.G1.multiExpAffine(u, d);
	f = c.G1.add(f, l);
	let p = c.G1.fromObject(o.pi_a), m = c.G2.fromObject(o.pi_b), h = c.G1.fromObject(o.pi_c);
	if (!Cr(c, {
		pi_a: p,
		pi_b: m,
		pi_c: h
	})) return i && i.error("Proof commitments are not valid."), !1;
	let g = c.G2.fromObject(a.vk_gamma_2), _ = c.G2.fromObject(a.vk_delta_2), v = c.G1.fromObject(a.vk_alpha_1), y = c.G2.fromObject(a.vk_beta_2);
	return await c.pairingEq(c.G1.neg(p), m, f, g, h, _, v, y) ? (i && i.info("OK!"), !0) : (i && i.error("Invalid proof"), !1);
}
function Cr(e, t) {
	let n = e.G1, r = e.G2;
	return n.isValid(t.pi_a) && r.isValid(t.pi_b) && n.isValid(t.pi_c);
}
function wr(e, t) {
	return r.geq(t, 0) && r.lt(t, e.r);
}
function Tr(e, t) {
	for (let n = 0; n < t.length; n++) if (!wr(e, t[n])) return !1;
	return !0;
}
//#endregion
//#region src/groth16_exportsoliditycalldata.js
var { unstringifyBigInts: Er } = s;
function Dr(e) {
	let t = e.toString(16);
	for (; t.length < 64;) t = "0" + t;
	return t = `"0x${t}"`, t;
}
async function Or(e, t) {
	let n = Er(e), r = Er(t), i = "";
	for (let e = 0; e < r.length; e++) i != "" && (i += ","), i += Dr(r[e]);
	let a;
	return a = `[${Dr(n.pi_a[0])}, ${Dr(n.pi_a[1])}],[[${Dr(n.pi_b[0][1])}, ${Dr(n.pi_b[0][0])}],[${Dr(n.pi_b[1][1])}, ${Dr(n.pi_b[1][0])}]],[${Dr(n.pi_c[0])}, ${Dr(n.pi_c[1])}],[${i}]`, a;
}
//#endregion
//#region src/groth16.js
var kr = /* @__PURE__ */ l({
	exportSolidityCallData: () => Or,
	fullProve: () => br,
	prove: () => on,
	verify: () => Sr
});
//#endregion
//#region src/keypair.js
function Ar(e, n) {
	let r = new DataView(n.buffer, n.byteOffset, n.byteLength), i = [];
	for (let e = 0; e < 8; e++) i[e] = r.getUint32(e * 4);
	let a = new t(i);
	return e.G2.fromRng(a);
}
function jr(e, t, n, r, i) {
	let a = K.create({ dkLen: 64 }), o = new Uint8Array([t]);
	a.update(o), a.update(n);
	let s = e.G1.toUncompressed(r);
	a.update(s);
	let c = e.G1.toUncompressed(i);
	return a.update(c), Ar(e, a.digest());
}
function Mr(e, t, n, r, i) {
	return e.g1_s = t.G1.toAffine(t.G1.fromRng(i)), e.g1_sx = t.G1.toAffine(t.G1.timesFr(e.g1_s, e.prvKey)), e.g2_sp = t.G2.toAffine(jr(t, n, r, e.g1_s, e.g1_sx)), e.g2_spx = t.G2.toAffine(t.G2.timesFr(e.g2_sp, e.prvKey)), e;
}
function Nr(e, t, n) {
	let r = {
		tau: {},
		alpha: {},
		beta: {}
	};
	return r.tau.prvKey = e.Fr.fromRng(n), r.alpha.prvKey = e.Fr.fromRng(n), r.beta.prvKey = e.Fr.fromRng(n), Mr(r.tau, e, 0, t, n), Mr(r.alpha, e, 1, t, n), Mr(r.beta, e, 2, t, n), r;
}
//#endregion
//#region src/powersoftau_utils.js
async function Pr(e, t, n, i) {
	i ||= n, await e.writeULE32(1);
	let a = e.pos;
	await e.writeULE64(0), await e.writeULE32(t.F1.n64 * 8);
	let o = new Uint8Array(t.F1.n8);
	r.toRprLE(o, 0, t.q, t.F1.n8), await e.write(o), await e.writeULE32(n), await e.writeULE32(i);
	let s = e.pos - a - 8, c = e.pos;
	await e.writeULE64(s, a), e.pos = c;
}
async function Fr(e, t) {
	/* c8 ignore start */
	if (!t[1]) throw Error(e.fileName + ": File has no  header");
	/* c8 ignore stop */
	/* c8 ignore start */
	if (t[1].length > 1) throw Error(e.fileName + ": File has more than one header");
	/* c8 ignore stop */
	e.pos = t[1][0].p;
	let n = await e.readULE32(), i = await e.read(n), a = await U(r.fromRprLE(i));
	/* c8 ignore start */
	if (a.F1.n64 * 8 != n) throw Error(e.fileName + ": Invalid size");
	/* c8 ignore stop */
	let o = await e.readULE32(), s = await e.readULE32();
	/* c8 ignore start */
	if (e.pos - t[1][0].p != t[1][0].size) throw Error("Invalid PTau header size");
	/* c8 ignore stop */
	return {
		curve: a,
		power: o,
		ceremonyPower: s
	};
}
async function Ir(e, t, n) {
	return Lr(await e.read(t.F1.n8 * 2 * 6 + t.F2.n8 * 2 * 3), 0, t, n);
}
function Lr(e, t, n, r) {
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
function Rr(e, t, n, r, i) {
	a(r.tau.g1_s), a(r.tau.g1_sx), a(r.alpha.g1_s), a(r.alpha.g1_sx), a(r.beta.g1_s), a(r.beta.g1_sx), o(r.tau.g2_spx), o(r.alpha.g2_spx), o(r.beta.g2_spx);
	async function a(r) {
		i ? n.G1.toRprLEM(e, t, r) : n.G1.toRprUncompressed(e, t, r), t += n.F1.n8 * 2;
	}
	async function o(r) {
		i ? n.G2.toRprLEM(e, t, r) : n.G2.toRprUncompressed(e, t, r), t += n.F2.n8 * 2;
	}
	return e;
}
async function zr(e, t, n, r) {
	let i = new Uint8Array(t.F1.n8 * 2 * 6 + t.F2.n8 * 2 * 3);
	Rr(i, 0, t, n, r), await e.write(i);
}
async function Br(e, t) {
	let n = {};
	n.tauG1 = await c(), n.tauG2 = await l(), n.alphaG1 = await c(), n.betaG1 = await c(), n.betaG2 = await l(), n.key = await Ir(e, t, !0), n.partialHash = await e.read(216), n.nextChallenge = await e.read(64), n.type = await e.readULE32();
	let r = new Uint8Array(t.G1.F.n8 * 2 * 6 + t.G2.F.n8 * 2 * 3);
	Rr(r, 0, t, n.key, !1);
	let i = Tt(n.partialHash);
	i.update(r), n.responseHash = i.digest();
	let a = await e.readULE32(), o = e.pos, s = 0;
	for (; e.pos - o < a;) {
		let e = await u(1);
		/* c8 ignore start */
		if (e[0] <= s) throw Error("Parameters in the contribution must be sorted");
		if (s = e[0], e[0] == 1) {
			let e = await u((await u(1))[0]);
			n.name = new TextDecoder().decode(e);
		} else if (e[0] == 2) n.numIterationsExp = (await u(1))[0];
		else if (e[0] == 3) n.beaconHash = await u((await u(1))[0]);
		else
 /* c8 ignore start */
		throw Error("Parameter not recognized");
	}
	/* c8 ignore start */
	if (e.pos != o + a) throw Error("Parameters do not match");
	/* c8 ignore stop */
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
async function Vr(e, t, n) {
	/* c8 ignore start */
	if (!n[7]) throw Error(e.fileName + ": File has no  contributions");
	/* c8 ignore stop */
	/* c8 ignore start */
	if (n[7][0].length > 1) throw Error(e.fileName + ": File has more than one contributions section");
	/* c8 ignore stop */
	e.pos = n[7][0].p;
	let r = await e.readULE32(), i = [];
	for (let n = 0; n < r; n++) {
		let r = await Br(e, t);
		r.id = n + 1, i.push(r);
	}
	/* c8 ignore start */
	if (e.pos - n[7][0].p != n[7][0].size) throw Error("Invalid contribution section size");
	/* c8 ignore stop */
	return i;
}
async function Hr(e, t, n) {
	let r = new Uint8Array(t.F1.n8 * 2), i = new Uint8Array(t.F2.n8 * 2);
	await o(n.tauG1), await s(n.tauG2), await o(n.alphaG1), await o(n.betaG1), await s(n.betaG2), await zr(e, t, n.key, !0), await e.write(n.partialHash), await e.write(n.nextChallenge), await e.writeULE32(n.type || 0);
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
async function Ur(e, t, n) {
	await e.writeULE32(7);
	let r = e.pos;
	await e.writeULE64(0), await e.writeULE32(n.length);
	for (let r = 0; r < n.length; r++) await Hr(e, t, n[r]);
	let i = e.pos - r - 8, a = e.pos;
	await e.writeULE64(i, r), e.pos = a;
}
function Wr(e, t, n) {
	n && n.debug("Calculating First Challenge Hash");
	let r = K.create({ dkLen: 64 }), i = new Uint8Array(e.G1.F.n8 * 2), a = new Uint8Array(e.G2.F.n8 * 2);
	e.G1.toRprUncompressed(i, 0, e.G1.g), e.G2.toRprUncompressed(a, 0, e.G2.g), r.update(K.create({ dkLen: 64 }).digest());
	let o;
	return o = 2 ** t * 2 - 1, n && n.debug("Calculate Initial Hash: tauG1"), s(i, o), o = 2 ** t, n && n.debug("Calculate Initial Hash: tauG2"), s(a, o), n && n.debug("Calculate Initial Hash: alphaTauG1"), s(i, o), n && n.debug("Calculate Initial Hash: betaTauG1"), s(i, o), r.update(a), r.digest();
	function s(e, t) {
		let i = 341e3, a = Math.floor(t / i), o = t % i, s = new Uint8Array(i * e.byteLength);
		for (let t = 0; t < i; t++) s.set(e, t * e.byteLength);
		/* c8 ignore start */
		for (let e = 0; e < a; e++) r.update(s), n && n.debug("Initial hash: " + e * i);
		/* c8 ignore stop */
		for (let t = 0; t < o; t++) r.update(e);
	}
}
async function Gr(e, t, n, r) {
	return Nr(e, t, await Nt(n, r));
}
//#endregion
//#region src/powersoftau_new.js
async function Kr(e, t, n, r) {
	let i = await Ee(n, "ptau", 1, 7);
	await Pr(i, e, t, 0);
	let a = e.G1.oneAffine, o = e.G2.oneAffine;
	await L(i, 2);
	let s = 2 ** t * 2 - 1;
	for (let e = 0; e < s; e++) await i.write(a), r && e % 1e5 == 0 && e && r.log("tauG1: " + e);
	await R(i), await L(i, 3);
	let c = 2 ** t;
	for (let e = 0; e < c; e++) await i.write(o), r && e % 1e5 == 0 && e && r.log("tauG2: " + e);
	await R(i), await L(i, 4);
	let l = 2 ** t;
	for (let e = 0; e < l; e++) await i.write(a), r && e % 1e5 == 0 && e && r.log("alphaTauG1: " + e);
	await R(i), await L(i, 5);
	let u = 2 ** t;
	for (let e = 0; e < u; e++) await i.write(a), r && e % 1e5 == 0 && e && r.log("betaTauG1: " + e);
	await R(i), await L(i, 6), await i.write(o), await R(i), await L(i, 7), await i.writeULE32(0), await R(i), await i.close();
	let d = Wr(e, t, r);
	return r && r.debug(q(K.create({ dkLen: 64 }).digest(), "Blank Contribution Hash:")), r && r.info(q(d, "First Contribution Hash:")), d;
}
//#endregion
//#region src/powersoftau_export_challenge.js
async function qr(e, t, n) {
	let { fd: r, sections: i } = await I(e, "ptau", 1), { curve: a, power: o } = await Fr(r, i), s = await Vr(r, a, i), c, l;
	s.length == 0 ? (c = K.create({ dkLen: 64 }).digest(), l = Wr(a, o)) : (c = s[s.length - 1].responseHash, l = s[s.length - 1].nextChallenge), n && n.info(q(c, "Last Response Hash: ")), n && n.info(q(l, "New Challenge Hash: "));
	let u = await cr(t), d = K.create({ dkLen: 64 });
	await u.write(c), d.update(c), await p(2, "G1", 2 ** o * 2 - 1, "tauG1"), await p(3, "G2", 2 ** o, "tauG2"), await p(4, "G1", 2 ** o, "alphaTauG1"), await p(5, "G1", 2 ** o, "betaTauG1"), await p(6, "G2", 1, "betaG2"), await r.close(), await u.close();
	let f = d.digest();
	if (!Ct(l, f)) throw n && n.info(q(f, "Calc Curret Challenge Hash: ")), n && n.error("PTau file is corrupted. Calculated new challenge hash does not match with the eclared one"), Error("PTau file is corrupted. Calculated new challenge hash does not match with the eclared one");
	return l;
	async function p(e, t, o, s) {
		let c = a[t], l = c.F.n8 * 2, f = Math.floor((1 << 24) / l);
		await z(r, i, e);
		for (let e = 0; e < o; e += f) {
			n && n.debug(`Exporting ${s}: ${e}/${o}`);
			let t = Math.min(o - e, f), i;
			i = await r.read(t * l), i = await c.batchLEMtoU(i), await u.write(i), d.update(i);
		}
		await B(r);
	}
}
//#endregion
//#region src/powersoftau_import.js
async function Jr(e, t, n, r, i, a) {
	let o = /* @__PURE__ */ new Uint8Array(64);
	for (let e = 0; e < 64; e++) o[e] = 255;
	let { fd: s, sections: c } = await I(e, "ptau", 1), { curve: l, power: u } = await Fr(s, c), d = await Vr(s, l, c), f = {};
	r && (f.name = r);
	let p = l.F1.n8 * 2, m = l.F1.n8, h = l.F2.n8 * 2, g = l.F2.n8, _ = await lr(t);
	if (_.totalSize != 64 + (2 ** u * 2 - 1) * m + 2 ** u * g + 2 ** u * m + 2 ** u * m + g + p * 6 + h * 3) throw Error("Size of the contribution is invalid");
	let v;
	v = d.length > 0 ? d[d.length - 1].nextChallenge : Wr(l, u, a);
	let y = await Ee(n, "ptau", 1, i ? 7 : 2);
	await Pr(y, l, u);
	let b = await _.read(64);
	if (Ct(o, v) && (v = b, d[d.length - 1].nextChallenge = v), !Ct(b, v)) throw Error("Wrong contribution. This contribution is not based on the previous hash");
	let x = K.create({ dkLen: 64 });
	x.update(b);
	let S = [], C;
	C = await E(_, y, "G1", 2, 2 ** u * 2 - 1, [1], "tauG1"), f.tauG1 = C[0], C = await E(_, y, "G2", 3, 2 ** u, [1], "tauG2"), f.tauG2 = C[0], C = await E(_, y, "G1", 4, 2 ** u, [0], "alphaG1"), f.alphaG1 = C[0], C = await E(_, y, "G1", 5, 2 ** u, [0], "betaG1"), f.betaG1 = C[0], C = await E(_, y, "G2", 6, 1, [0], "betaG2"), f.betaG2 = C[0], f.partialHash = Et(x);
	let w = await _.read(l.F1.n8 * 2 * 6 + l.F2.n8 * 2 * 3);
	f.key = Lr(w, 0, l, !1), x.update(new Uint8Array(w));
	let T = x.digest();
	if (a && a.info(q(T, "Contribution Response Hash imported: ")), i) {
		let e = K.create({ dkLen: 64 });
		e.update(T), await k(e, y, "G1", 2, 2 ** u * 2 - 1, "tauG1", a), await k(e, y, "G2", 3, 2 ** u, "tauG2", a), await k(e, y, "G1", 4, 2 ** u, "alphaTauG1", a), await k(e, y, "G1", 5, 2 ** u, "betaTauG1", a), await k(e, y, "G2", 6, 1, "betaG2", a), f.nextChallenge = e.digest(), a && a.info(q(f.nextChallenge, "Next Challenge Hash: "));
	} else f.nextChallenge = o;
	return d.push(f), await Ur(y, l, d), await _.close(), await y.close(), await s.close(), f.nextChallenge;
	async function E(e, t, n, r, a, o, s) {
		return i ? await D(e, t, n, r, a, o, s) : await O(e, t, n, r, a, o, s);
	}
	async function D(e, t, n, r, i, o, s) {
		let c = l[n], u = c.F.n8, d = c.F.n8 * 2, f = [];
		await L(t, r);
		let p = Math.floor((1 << 24) / d);
		S[r] = t.pos;
		for (let n = 0; n < i; n += p) {
			a && a.debug(`Importing ${s}: ${n}/${i}`);
			let r = Math.min(i - n, p), l = await e.read(r * u);
			x.update(l);
			let m = await c.batchCtoLEM(l);
			await t.write(m);
			for (let e = 0; e < o.length; e++) {
				let t = o[e];
				if (t >= n && t < n + r) {
					let e = c.fromRprLEM(m, (t - n) * d);
					f.push(e);
				}
			}
		}
		return await R(t), f;
	}
	async function O(e, t, n, r, i, o, s) {
		let c = l[n], u = c.F.n8, d = [], f = Math.floor((1 << 24) / u);
		for (let t = 0; t < i; t += f) {
			a && a.debug(`Importing ${s}: ${t}/${i}`);
			let n = Math.min(i - t, f), r = await e.read(n * u);
			x.update(r);
			for (let e = 0; e < o.length; e++) {
				let i = o[e];
				if (i >= t && i < t + n) {
					let e = c.fromRprCompressed(r, (i - t) * u);
					d.push(e);
				}
			}
		}
		return d;
	}
	async function k(e, t, n, r, i, a, o) {
		let s = l[n], c = s.F.n8 * 2, u = Math.floor((1 << 24) / c), d = t.pos;
		t.pos = S[r];
		for (let n = 0; n < i; n += u) {
			o && o.debug(`Hashing ${a}: ${n}/${i}`);
			let r = Math.min(i - n, u), l = await t.read(r * c), d = await s.batchLEMtoU(l);
			e.update(d);
		}
		t.pos = d;
	}
}
//#endregion
//#region src/powersoftau_verify.js
var Yr = Dt;
async function Xr(e, t, n, r) {
	let i;
	if (t.type == 1) {
		let i = await Gr(e, n.nextChallenge, t.beaconHash, t.numIterationsExp);
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
	return t.key.tau.g2_sp = e.G2.toAffine(jr(e, 0, n.nextChallenge, t.key.tau.g1_s, t.key.tau.g1_sx)), t.key.alpha.g2_sp = e.G2.toAffine(jr(e, 1, n.nextChallenge, t.key.alpha.g1_s, t.key.alpha.g1_sx)), t.key.beta.g2_sp = e.G2.toAffine(jr(e, 2, n.nextChallenge, t.key.beta.g1_s, t.key.beta.g1_sx)), i = await Yr(e, t.key.tau.g1_s, t.key.tau.g1_sx, t.key.tau.g2_sp, t.key.tau.g2_spx), i === !0 ? (i = await Yr(e, t.key.alpha.g1_s, t.key.alpha.g1_sx, t.key.alpha.g2_sp, t.key.alpha.g2_spx), i === !0 ? (i = await Yr(e, t.key.beta.g1_s, t.key.beta.g1_sx, t.key.beta.g2_sp, t.key.beta.g2_spx), i === !0 ? (i = await Yr(e, n.tauG1, t.tauG1, t.key.tau.g2_sp, t.key.tau.g2_spx), i === !0 ? (i = await Yr(e, t.key.tau.g1_s, t.key.tau.g1_sx, n.tauG2, t.tauG2), i === !0 ? (i = await Yr(e, n.alphaG1, t.alphaG1, t.key.alpha.g2_sp, t.key.alpha.g2_spx), i === !0 ? (i = await Yr(e, n.betaG1, t.betaG1, t.key.beta.g2_sp, t.key.beta.g2_spx), i === !0 ? (i = await Yr(e, t.key.beta.g1_s, t.key.beta.g1_sx, n.betaG2, t.betaG2), i === !0 ? (r && r.info("Powers Of tau file OK!"), !0) : (r && r.error("INVALID beta*G2. challenge #" + t.id + "It does not follow the previous contribution"), !1)) : (r && r.error("INVALID beta*G1. challenge #" + t.id + " It does not follow the previous contribution"), !1)) : (r && r.error("INVALID alpha*G1. challenge #" + t.id + " It does not follow the previous contribution"), !1)) : (r && r.error("INVALID tau*G2. challenge #" + t.id + " It does not follow the previous contribution"), !1)) : (r && r.error("INVALID tau*G1. challenge #" + t.id + " It does not follow the previous contribution"), !1)) : (r && r.error("INVALID key (beta) in challenge #" + t.id), !1)) : (r && r.error("INVALID key (alpha) in challenge #" + t.id), !1)) : (r && r.error("INVALID key (tau) in challenge #" + t.id), !1);
}
async function Zr(n, r) {
	let i, a;
	try {
		let o;
		({fd: i, sections: a} = await I(n, "ptau", 1));
		let { curve: s, power: c, ceremonyPower: l } = await Fr(i, a), u = await Vr(i, s, a);
		r && r.debug("power: 2**" + c), r && r.debug("Computing initial contribution hash");
		let d = {
			tauG1: s.G1.g,
			tauG2: s.G2.g,
			alphaG1: s.G1.g,
			betaG1: s.G1.g,
			betaG2: s.G2.g,
			nextChallenge: Wr(s, l, r),
			responseHash: K.create({ dkLen: 64 }).digest()
		};
		if (u.length == 0) return r && r.error("This file has no contribution! It cannot be used in production"), !1;
		let f;
		f = u.length > 1 ? u[u.length - 2] : d;
		let p = u[u.length - 1];
		if (r && r.debug("Validating contribution #" + u[u.length - 1].id), !await Xr(s, p, f, r)) return !1;
		let m = K.create({ dkLen: 64 });
		m.update(p.responseHash), r && r.debug("Verifying powers in tau*G1 section");
		let h = await C(2, "G1", "tauG1", 2 ** c * 2 - 1, [0, 1], r);
		if (o = await Yr(s, h.R1, h.R2, s.G2.g, p.tauG2), o !== !0) return r && r.error("tauG1 section. Powers do not match"), !1;
		/* c8 ignore start */
		if (!s.G1.eq(s.G1.g, h.singularPoints[0])) return r && r.error("First element of tau*G1 section must be the generator"), !1;
		/* c8 ignore stop */
		/* c8 ignore start */
		if (!s.G1.eq(p.tauG1, h.singularPoints[1])) return r && r.error("Second element of tau*G1 section does not match the one in the contribution section"), !1;
		/* c8 ignore stop */
		r && r.debug("Verifying powers in tau*G2 section");
		let g = await C(3, "G2", "tauG2", 2 ** c, [0, 1], r);
		if (o = await Yr(s, s.G1.g, p.tauG1, g.R1, g.R2), o !== !0) return r && r.error("tauG2 section. Powers do not match"), !1;
		/* c8 ignore start */
		if (!s.G2.eq(s.G2.g, g.singularPoints[0])) return r && r.error("First element of tau*G2 section must be the generator"), !1;
		/* c8 ignore stop */
		/* c8 ignore start */
		if (!s.G2.eq(p.tauG2, g.singularPoints[1])) return r && r.error("Second element of tau*G2 section does not match the one in the contribution section"), !1;
		/* c8 ignore stop */
		r && r.debug("Verifying powers in alpha*tau*G1 section");
		let _ = await C(4, "G1", "alphatauG1", 2 ** c, [0], r);
		if (o = await Yr(s, _.R1, _.R2, s.G2.g, p.tauG2), o !== !0) return r && r.error("alphaTauG1 section. Powers do not match"), !1;
		/* c8 ignore start */
		if (!s.G1.eq(p.alphaG1, _.singularPoints[0])) return r && r.error("First element of alpha*tau*G1 section (alpha*G1) does not match the one in the contribution section"), !1;
		/* c8 ignore stop */
		r && r.debug("Verifying powers in beta*tau*G1 section");
		let v = await C(5, "G1", "betatauG1", 2 ** c, [0], r);
		if (o = await Yr(s, v.R1, v.R2, s.G2.g, p.tauG2), o !== !0) return r && r.error("betaTauG1 section. Powers do not match"), !1;
		/* c8 ignore start */
		if (!s.G1.eq(p.betaG1, v.singularPoints[0])) return r && r.error("First element of beta*tau*G1 section (beta*G1) does not match the one in the contribution section"), !1;
		/* c8 ignore stop */
		let y = await S(r);
		if (!s.G2.eq(p.betaG2, y)) return r && r.error("betaG2 element in betaG2 section does not match the one in the contribution section"), !1;
		let b = m.digest();
		if (c == l && !Ct(b, p.nextChallenge)) return r && r.error("Hash of the values does not match the next challenge of the last contributor in the contributions section"), !1;
		r && r.info(q(b, "Next challenge hash: ")), x(p, f);
		for (let e = u.length - 2; e >= 0; e--) {
			let t = u[e], n = e > 0 ? u[e - 1] : d;
			if (!await Xr(s, t, n, r)) return !1;
			x(t, n, r);
		}
		if (r && r.info("-----------------------------------------------------"), !a[12] || !a[13] || !a[14] || !a[15]) r && r.warn("this file does not contain phase2 precalculated values. Please run: \n   snarkjs \"powersoftau preparephase2\" to prepare this file to be used in the phase2 ceremony.");
		else {
			let e;
			if (e = await w("G1", 2, 12, "tauG1", r), !e || 
			/* c8 ignore stop */
			(e = await w("G2", 3, 13, "tauG2", r), !e) || 
			/* c8 ignore stop */
			(e = await w("G1", 4, 14, "alphaTauG1", r), !e) || 
			/* c8 ignore stop */
			(e = await w("G1", 5, 15, "betaTauG1", r), !e)) return !1;
		}
		return await i.close(), r && r.info("Powers of Tau Ok!"), !0;
		function x(e, t) {
			if (!r) return;
			r.info("-----------------------------------------------------"), r.info(`Contribution #${e.id}: ${e.name || ""}`), r.info(q(e.nextChallenge, "Next Challenge: "));
			let n = new Uint8Array(s.G1.F.n8 * 2 * 6 + s.G2.F.n8 * 2 * 3);
			Rr(n, 0, s, e.key, !1);
			let i = Tt(e.partialHash);
			i.update(n);
			let a = i.digest();
			r.info(q(a, "Response Hash:")), r.info(q(t.nextChallenge, "Response Hash:")), e.type == 1 && (r.info(`Beacon generator: ${Ft(e.beaconHash)}`), r.info(`Beacon iterations Exp: ${e.numIterationsExp}`));
		}
		async function S(e) {
			let t = s.G2, n = t.F.n8 * 2, r = new Uint8Array(n);
			/* c8 ignore start */
			if (!a[6]) throw e.error("File has no BetaG2 section"), Error("File has no BetaG2 section");
			/* c8 ignore stop */
			/* c8 ignore start */
			if (a[6].length > 1) throw e.error("File has no BetaG2 section"), Error("File has more than one GetaG2 section");
			/* c8 ignore stop */
			i.pos = a[6][0].p;
			let o = await i.read(n), c = t.fromRprLEM(o);
			return t.toRprUncompressed(r, 0, c), m.update(r), c;
		}
		async function C(e, t, n, r, o, c) {
			let l = 65536, u = s[t], d = u.F.n8 * 2;
			await z(i, a, e);
			let f = [], p = u.zero, h = u.zero, g = u.zero;
			for (let e = 0; e < r; e += l) {
				c && c.debug(`points relations: ${n}: ${e}/${r} `);
				let t = Math.min(r - e, l), a = await i.read(t * d), s = await u.batchLEMtoU(a);
				m.update(s);
				let _ = kt(4 * (t - 1));
				/* c8 ignore start */
				if (e > 0) {
					let e = u.fromRprLEM(a, 0), t = jt(kt(4), 0);
					p = u.add(p, u.timesScalar(g, t)), h = u.add(h, u.timesScalar(e, t));
				}
				/* c8 ignore stop */
				let v = await u.multiExpAffine(a.slice(0, (t - 1) * d), _), y = await u.multiExpAffine(a.slice(d), _);
				p = u.add(p, v), h = u.add(h, y), g = u.fromRprLEM(a, (t - 1) * d);
				for (let n = 0; n < o.length; n++) {
					let r = o[n];
					if (r >= e && r < e + t) {
						let t = u.fromRprLEM(a, (r - e) * d);
						f.push(t);
					}
				}
			}
			return await B(i), {
				R1: p,
				R2: h,
				singularPoints: f
			};
		}
		async function w(n, r, o, l, u) {
			u && u.debug(`Verifying phase2 calculated values ${l}...`);
			let d = s[n], f = d.F.n8 * 2, p = Array(8);
			for (let e = 0; e < 8; e++) p[e] = jt(kt(4), 0);
			for (let e = 0; e <= c; e++) if (!await m(e)) return !1;
			if (r == 2 && !await m(c + 1)) return !1;
			return !0;
			async function m(n) {
				u && u.debug(`Power ${n}...`);
				let m = s.Fr.n8, h = 2 ** n, g = new Uint32Array(h), _, v = new t(p);
				u && u.debug(`Creating random numbers Powers${n}...`);
				for (let e = 0; e < h; e++) n == c + 1 && e == h - 1 ? g[e] = 0 : g[e] = v.nextU32();
				g = new Uint8Array(g.buffer, g.byteOffset, g.byteLength), u && u.debug(`reading points Powers${n}...`), await z(i, a, r), _ = new e(h * f), n == c + 1 ? (await i.readToBuffer(_, 0, (h - 1) * f), _.set(s.G1.zeroAffine, (h - 1) * f)) : await i.readToBuffer(_, 0, h * f), await B(i, !0);
				let y = await d.multiExpAffine(_, g, u, l + "_" + n);
				g = new e(h * m), v = new t(p);
				let b = /* @__PURE__ */ new Uint8Array(4), x = new DataView(b.buffer);
				u && u.debug(`Creating random numbers Powers${n}...`);
				for (let e = 0; e < h; e++) (e != h - 1 || n != c + 1) && (x.setUint32(0, v.nextU32(), !0), g.set(b, e * m));
				u && u.debug(`batchToMontgomery ${n}...`), g = await s.Fr.batchToMontgomery(g), u && u.debug(`fft ${n}...`), g = await s.Fr.fft(g), u && u.debug(`batchFromMontgomery ${n}...`), g = await s.Fr.batchFromMontgomery(g), u && u.debug(`reading points Lagrange${n}...`), await z(i, a, o), i.pos += f * (2 ** n - 1), await i.readToBuffer(_, 0, h * f), await B(i, !0);
				let S = await d.multiExpAffine(_, g, u, l + "_" + n + "_transformed");
				return d.eq(y, S) ? !0 : (u && u.error("Phase2 caclutation does not match with powers of tau"), !1);
			}
		}
	} finally {
		for (let e of [i]) try {
			e && await e.close();
		} catch {}
	}
}
//#endregion
//#region src/mpc_applykey.js
async function Qr(e, t, n, r, i, a, o, s, c, l) {
	let u = 65536, d = i[a], f = d.F.n8 * 2, p = t[r][0].size / f;
	await z(e, t, r), await L(n, r);
	let m = o;
	for (let t = 0; t < p; t += u) {
		l && l.debug(`Applying key: ${c}: ${t}/${p}`);
		let r = Math.min(p - t, u), a;
		a = await e.read(r * f), a = await d.batchApplyKey(a, m, s), await n.write(a), m = i.Fr.mul(m, i.Fr.exp(s, r));
	}
	await R(n), await B(e);
}
async function $r(e, t, n, r, i, a, o, s, c, l, u) {
	let d = r[i], f = d.F.n8 * 2, p = Math.floor((1 << 20) / f), m = o;
	for (let i = 0; i < a; i += p) {
		u && u.debug(`Applying key ${l}: ${i}/${a}`);
		let o = Math.min(a - i, p), h = await e.read(o * f), g = await d.batchUtoLEM(h), _ = await d.batchApplyKey(g, m, s), v;
		v = c == "COMPRESSED" ? await d.batchLEMtoC(_) : await d.batchLEMtoU(_), n && n.update(v), await t.write(v), m = r.Fr.mul(m, r.Fr.exp(s, o));
	}
}
//#endregion
//#region src/powersoftau_challenge_contribute.js
async function ei(e, t, n, r, i) {
	let a = await lr(t), o = e.F1.n64 * 8 * 2, s = e.F2.n64 * 8 * 2, c = (a.totalSize + o - 64 - s) / (4 * o + s), l = c, u = 0;
	for (; l > 1;) l /= 2, u += 1;
	if (2 ** u != c) throw Error("Invalid file size");
	i && i.debug("Power to tau size: " + u);
	let d = await Mt(r), f = await cr(n), p = K.create({ dkLen: 64 });
	for (let e = 0; e < a.totalSize; e += a.pageSize) {
		i && i.debug(`Hashing challenge ${e}/${a.totalSize}`);
		let t = Math.min(a.totalSize - e, a.pageSize), n = await a.read(t);
		p.update(n);
	}
	let m = await a.read(64, 0);
	i && i.info(q(m, "Claimed Previous Response Hash: "));
	let h = p.digest();
	i && i.info(q(h, "Current Challenge Hash: "));
	let g = Nr(e, h, d);
	i && [
		"tau",
		"alpha",
		"beta"
	].forEach((t) => {
		i.debug(t + ".g1_s: " + e.G1.toString(g[t].g1_s, 16)), i.debug(t + ".g1_sx: " + e.G1.toString(g[t].g1_sx, 16)), i.debug(t + ".g2_sp: " + e.G2.toString(g[t].g2_sp, 16)), i.debug(t + ".g2_spx: " + e.G2.toString(g[t].g2_spx, 16)), i.debug("");
	});
	let _ = K.create({ dkLen: 64 });
	await f.write(h), _.update(h), await $r(a, f, _, e, "G1", 2 ** u * 2 - 1, e.Fr.one, g.tau.prvKey, "COMPRESSED", "tauG1", i), await $r(a, f, _, e, "G2", 2 ** u, e.Fr.one, g.tau.prvKey, "COMPRESSED", "tauG2", i), await $r(a, f, _, e, "G1", 2 ** u, g.alpha.prvKey, g.tau.prvKey, "COMPRESSED", "alphaTauG1", i), await $r(a, f, _, e, "G1", 2 ** u, g.beta.prvKey, g.tau.prvKey, "COMPRESSED", "betaTauG1", i), await $r(a, f, _, e, "G2", 1, g.beta.prvKey, g.tau.prvKey, "COMPRESSED", "betaTauG2", i);
	let v = new Uint8Array(e.F1.n8 * 2 * 6 + e.F2.n8 * 2 * 3);
	Rr(v, 0, e, g, !1), await f.write(v), _.update(v);
	let y = _.digest();
	i && i.info(q(y, "Contribution Response Hash: ")), await f.close(), await a.close();
}
//#endregion
//#region src/powersoftau_beacon.js
async function ti(e, t, n, r, i, a) {
	let o = Pt(r);
	if (o.byteLength == 0 || o.byteLength * 2 != r.length) return a && a.error("Invalid Beacon Hash. (It must be a valid hexadecimal sequence)"), !1;
	if (o.length >= 256) return a && a.error("Maximum length of beacon hash is 255 bytes"), !1;
	if (i = parseInt(i), i < 10 || i > 63) return a && a.error("Invalid numIterationsExp. (Must be between 10 and 63)"), !1;
	let { fd: s, sections: c } = await I(e, "ptau", 1), { curve: l, power: u, ceremonyPower: d } = await Fr(s, c);
	if (u != d) return a && a.error("This file has been reduced. You cannot contribute into a reduced file."), !1;
	c[12] && a && a.warn("Contributing into a file that has phase2 calculated. You will have to prepare phase2 again.");
	let f = await Vr(s, l, c), p = {
		name: n,
		type: 1,
		numIterationsExp: i,
		beaconHash: o
	}, m;
	m = f.length > 0 ? f[f.length - 1].nextChallenge : Wr(l, u, a), p.key = await Gr(l, m, o, i);
	let h = K.create({ dkLen: 64 });
	h.update(m);
	let g = await Ee(t, "ptau", 1, 7);
	await Pr(g, l, u);
	let _ = [], v;
	v = await S(2, "G1", 2 ** u * 2 - 1, l.Fr.e(1), p.key.tau.prvKey, "tauG1", a), p.tauG1 = v[1], v = await S(3, "G2", 2 ** u, l.Fr.e(1), p.key.tau.prvKey, "tauG2", a), p.tauG2 = v[1], v = await S(4, "G1", 2 ** u, p.key.alpha.prvKey, p.key.tau.prvKey, "alphaTauG1", a), p.alphaG1 = v[0], v = await S(5, "G1", 2 ** u, p.key.beta.prvKey, p.key.tau.prvKey, "betaTauG1", a), p.betaG1 = v[0], v = await S(6, "G2", 1, p.key.beta.prvKey, p.key.tau.prvKey, "betaTauG2", a), p.betaG2 = v[0], p.partialHash = Et(h);
	let y = new Uint8Array(l.F1.n8 * 2 * 6 + l.F2.n8 * 2 * 3);
	Rr(y, 0, l, p.key, !1), h.update(new Uint8Array(y));
	let b = h.digest();
	a && a.info(q(b, "Contribution Response Hash imported: "));
	let x = K.create({ dkLen: 64 });
	return x.update(b), await C(g, "G1", 2, 2 ** u * 2 - 1, "tauG1", a), await C(g, "G2", 3, 2 ** u, "tauG2", a), await C(g, "G1", 4, 2 ** u, "alphaTauG1", a), await C(g, "G1", 5, 2 ** u, "betaTauG1", a), await C(g, "G2", 6, 1, "betaG2", a), p.nextChallenge = x.digest(), a && a.info(q(p.nextChallenge, "Next Challenge Hash: ")), f.push(p), await Ur(g, l, f), await s.close(), await g.close(), b;
	async function S(e, t, n, r, i, a, o) {
		let u = [];
		s.pos = c[e][0].p, await L(g, e), _[e] = g.pos;
		let d = l[t], f = d.F.n8 * 2, p = Math.floor((1 << 20) / f), m = r;
		for (let e = 0; e < n; e += p) {
			o && o.debug(`applying key${a}: ${e}/${n}`);
			let t = Math.min(n - e, p), r = await s.read(t * f), c = await d.batchApplyKey(r, m, i), _ = g.write(c), v = await d.batchLEMtoC(c);
			if (h.update(v), await _, e == 0) for (let e = 0; e < Math.min(2, n); e++) u.push(d.fromRprLEM(c, e * f));
			m = l.Fr.mul(m, l.Fr.exp(i, t));
		}
		return await R(g), u;
	}
	async function C(e, t, n, r, i, a) {
		let o = l[t], s = o.F.n8 * 2, c = Math.floor((1 << 24) / s), u = e.pos;
		e.pos = _[n];
		for (let t = 0; t < r; t += c) {
			a && a.debug(`Hashing ${i}: ${t}/${r}`);
			let n = Math.min(r - t, c), l = await e.read(n * s), u = await o.batchLEMtoU(l);
			x.update(u);
		}
		e.pos = u;
	}
}
//#endregion
//#region src/powersoftau_contribute.js
async function ni(e, t, n, r, i) {
	let { fd: a, sections: o } = await I(e, "ptau", 1), { curve: s, power: c, ceremonyPower: l } = await Fr(a, o);
	if (c != l) throw i && i.error("This file has been reduced. You cannot contribute into a reduced file."), Error("This file has been reduced. You cannot contribute into a reduced file.");
	o[12] && i && i.warn("WARNING: Contributing into a file that has phase2 calculated. You will have to prepare phase2 again.");
	let u = await Vr(a, s, o), d = {
		name: n,
		type: 0
	}, f, p = await Mt(r);
	f = u.length > 0 ? u[u.length - 1].nextChallenge : Wr(s, c, i), d.key = Nr(s, f, p);
	let m = K.create({ dkLen: 64 });
	m.update(f);
	let h = await Ee(t, "ptau", 1, 7);
	await Pr(h, s, c);
	let g = [], _;
	_ = await x(2, "G1", 2 ** c * 2 - 1, s.Fr.e(1), d.key.tau.prvKey, "tauG1"), d.tauG1 = _[1], _ = await x(3, "G2", 2 ** c, s.Fr.e(1), d.key.tau.prvKey, "tauG2"), d.tauG2 = _[1], _ = await x(4, "G1", 2 ** c, d.key.alpha.prvKey, d.key.tau.prvKey, "alphaTauG1"), d.alphaG1 = _[0], _ = await x(5, "G1", 2 ** c, d.key.beta.prvKey, d.key.tau.prvKey, "betaTauG1"), d.betaG1 = _[0], _ = await x(6, "G2", 1, d.key.beta.prvKey, d.key.tau.prvKey, "betaTauG2"), d.betaG2 = _[0], d.partialHash = Et(m);
	let v = new Uint8Array(s.F1.n8 * 2 * 6 + s.F2.n8 * 2 * 3);
	Rr(v, 0, s, d.key, !1), m.update(new Uint8Array(v));
	let y = m.digest();
	i && i.info(q(y, "Contribution Response Hash imported: "));
	let b = K.create({ dkLen: 64 });
	return b.update(y), await S(h, "G1", 2, 2 ** c * 2 - 1, "tauG1"), await S(h, "G2", 3, 2 ** c, "tauG2"), await S(h, "G1", 4, 2 ** c, "alphaTauG1"), await S(h, "G1", 5, 2 ** c, "betaTauG1"), await S(h, "G2", 6, 1, "betaG2"), d.nextChallenge = b.digest(), i && i.info(q(d.nextChallenge, "Next Challenge Hash: ")), u.push(d), await Ur(h, s, u), await a.close(), await h.close(), y;
	async function x(e, t, n, r, c, l) {
		let u = [];
		a.pos = o[e][0].p, await L(h, e), g[e] = h.pos;
		let d = s[t], f = d.F.n8 * 2, p = Math.floor((1 << 20) / f), _ = r;
		for (let e = 0; e < n; e += p) {
			i && i.debug(`processing: ${l}: ${e}/${n}`);
			let t = Math.min(n - e, p), r = await a.read(t * f), o = await d.batchApplyKey(r, _, c), g = h.write(o), v = await d.batchLEMtoC(o);
			if (m.update(v), await g, e == 0) for (let e = 0; e < Math.min(2, n); e++) u.push(d.fromRprLEM(o, e * f));
			_ = s.Fr.mul(_, s.Fr.exp(c, t));
		}
		return await R(h), u;
	}
	async function S(e, t, n, r, a) {
		let o = s[t], c = o.F.n8 * 2, l = Math.floor((1 << 24) / c), u = e.pos;
		e.pos = g[n];
		for (let t = 0; t < r; t += l) {
			i && t && i.debug(`Hashing ${a}: ` + t);
			let n = Math.min(r - t, l), s = await e.read(n * c), u = await o.batchLEMtoU(s);
			b.update(u);
		}
		e.pos = u;
	}
}
//#endregion
//#region src/powersoftau_preparephase2.js
async function ri(t, n, r) {
	let { fd: i, sections: a } = await I(t, "ptau", 1), { curve: o, power: s } = await Fr(i, a), c = await Ee(n, "ptau", 1, 11);
	await Pr(c, o, s), await V(i, a, c, 2), await V(i, a, c, 3), await V(i, a, c, 4), await V(i, a, c, 5), await V(i, a, c, 6), await V(i, a, c, 7), await l(2, 12, "G1", "tauG1"), await l(3, 13, "G2", "tauG2"), await l(4, 14, "G1", "alphaTauG1"), await l(5, 15, "G1", "betaTauG1"), await i.close(), await c.close();
	return;
	async function l(t, n, l, u) {
		r && r.debug("Starting section: " + u), await L(c, n);
		for (let e = 0; e <= s; e++) await d(e);
		t == 2 && await d(s + 1), await R(c);
		async function d(n) {
			let d = 2 ** n, f = o[l], p = f.F.n8 * 2, m;
			m = new e(d * p), await z(i, a, t), t == 2 && n == s + 1 ? (await i.readToBuffer(m, 0, (d - 1) * p), m.set(o.G1.zeroAffine, (d - 1) * p)) : await i.readToBuffer(m, 0, d * p), await B(i, !0), m = await f.lagrangeEvaluations(m, "affine", "affine", r, u), await c.write(m);
		}
	}
}
//#endregion
//#region src/powersoftau_truncate.js
async function ii(e, t, n) {
	let { fd: r, sections: i } = await I(e, "ptau", 1), { curve: a, power: o, ceremonyPower: s } = await Fr(r, i), c = a.G1.F.n8 * 2, l = a.G2.F.n8 * 2;
	for (let e = 1; e < o; e++) await u(e);
	return await r.close(), !0;
	async function u(e) {
		let o = e.toString();
		for (; o.length < 2;) o = "0" + o;
		n && n.debug("Writing Power: " + o);
		let u = await Ee(t + o + ".ptau", "ptau", 1, 11);
		await Pr(u, a, e, s), await V(r, i, u, 2, (2 ** e * 2 - 1) * c), await V(r, i, u, 3, 2 ** e * l), await V(r, i, u, 4, 2 ** e * c), await V(r, i, u, 5, 2 ** e * c), await V(r, i, u, 6, l), await V(r, i, u, 7), await V(r, i, u, 12, (2 ** (e + 1) * 2 - 1) * c), await V(r, i, u, 13, (2 ** e * 2 - 1) * l), await V(r, i, u, 14, (2 ** e * 2 - 1) * c), await V(r, i, u, 15, (2 ** e * 2 - 1) * c), await u.close();
	}
}
//#endregion
//#region src/powersoftau_convert.js
async function ai(t, n, r) {
	let { fd: i, sections: a } = await I(t, "ptau", 1), { curve: o, power: s } = await Fr(i, a), c = await Ee(n, "ptau", 1, 11);
	await Pr(c, o, s), await V(i, a, c, 2), await V(i, a, c, 3), await V(i, a, c, 4), await V(i, a, c, 5), await V(i, a, c, 6), await V(i, a, c, 7), await l(2, 12, "G1", "tauG1"), await V(i, a, c, 13), await V(i, a, c, 14), await V(i, a, c, 15), await i.close(), await c.close();
	return;
	async function l(t, n, l, u) {
		r && r.debug("Starting section: " + u), await L(c, n);
		let d = a[n][0].size, f = i.pageSize;
		await z(i, a, n);
		for (let e = 0; e < d; e += f) {
			let t = Math.min(d - e, f), n = await i.read(t);
			await c.write(n);
		}
		await B(i), t == 2 && await p(s + 1), await R(c);
		async function p(n) {
			let d = 2 ** n, f = o[l], p = f.F.n8 * 2, m;
			m = new e(d * p), await z(i, a, t), t == 2 && n == s + 1 ? (await i.readToBuffer(m, 0, (d - 1) * p), m.set(o.G1.zeroAffine, (d - 1) * p)) : await i.readToBuffer(m, 0, d * p), await B(i, !0), m = await f.lagrangeEvaluations(m, "affine", "affine", r, u), await c.write(m);
		}
	}
}
//#endregion
//#region src/powersoftau_export_json.js
async function oi(e, t) {
	let { fd: n, sections: r } = await I(e, "ptau", 1), { curve: i, power: a } = await Fr(n, r), o = {};
	return o.q = i.q, o.power = a, o.contributions = await Vr(n, i, r), o.tauG1 = await s(2, "G1", 2 ** a * 2 - 1, "tauG1"), o.tauG2 = await s(3, "G2", 2 ** a, "tauG2"), o.alphaTauG1 = await s(4, "G1", 2 ** a, "alphaTauG1"), o.betaTauG1 = await s(5, "G1", 2 ** a, "betaTauG1"), o.betaG2 = await s(6, "G2", 1, "betaG2"), o.lTauG1 = await c(12, "G1", "lTauG1"), o.lTauG2 = await c(13, "G2", "lTauG2"), o.lAlphaTauG1 = await c(14, "G1", "lAlphaTauG2"), o.lBetaTauG1 = await c(15, "G1", "lBetaTauG2"), await n.close(), It(i.Fr, o);
	async function s(e, a, o, s) {
		let c = i[a], l = c.F.n8 * 2, u = [];
		await z(n, r, e);
		for (let e = 0; e < o; e++) {
			t && e && e % 1e4 == 0 && console.log(`${s}: ` + e);
			let r = await n.read(l);
			u.push(c.fromRprLEM(r, 0));
		}
		return await B(n), u;
	}
	async function c(e, o, s) {
		let c = i[o], l = c.F.n8 * 2, u = [];
		await z(n, r, e);
		for (let e = 0; e <= a; e++) {
			t && console.log(`${s}: Power: ${e}`), u[e] = [];
			let r = 2 ** e;
			for (let i = 0; i < r; i++) {
				t && i && i % 1e4 == 0 && console.log(`${s}: ${i}/${r}`);
				let a = await n.read(l);
				u[e].push(c.fromRprLEM(a, 0));
			}
		}
		return await B(n, !0), u;
	}
}
//#endregion
//#region src/powersoftau.js
var si = /* @__PURE__ */ l({
	beacon: () => ti,
	challengeContribute: () => ei,
	contribute: () => ni,
	convert: () => ai,
	exportChallenge: () => qr,
	exportJson: () => oi,
	importResponse: () => Jr,
	newAccumulator: () => Kr,
	preparePhase2: () => ri,
	truncate: () => ii,
	verify: () => Zr
});
//#endregion
//#region src/r1cs_print.js
function ci(e, t, n) {
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
//#region node_modules/@iden3/bigarray/src/bigarray.js
var li = 262144, ui = {
	get: function(e, t) {
		return isNaN(t) ? e[t] : e.getElement(t);
	},
	set: function(e, t, n) {
		return isNaN(t) ? (e[t] = n, !0) : e.setElement(t, n);
	}
}, di = class {
	constructor(e) {
		this.length = e || 0, this.arr = Array(li);
		for (let t = 0; t < e; t += li) this.arr[t / li] = Array(Math.min(li, e - t));
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
		let t = Math.floor(e / li), n = e % li;
		return this.arr[t] ? this.arr[t][n] : void 0;
	}
	setElement(e, t) {
		e = parseInt(e);
		let n = Math.floor(e / li);
		this.arr[n] || (this.arr[n] = Array(li));
		let r = e % li;
		return this.arr[n][r] = t, e >= this.length && (this.length = e + 1), !0;
	}
	getKeys() {
		let e = new fi();
		for (let t = 0; t < this.arr.length; t++) if (this.arr[t]) for (let n = 0; n < this.arr[t].length; n++) this.arr[t][n] !== void 0 && e.push(t * li + n);
		return e;
	}
}, fi = class {
	constructor(e) {
		let t = new di(e);
		return new Proxy(t, ui);
	}
};
async function pi(e, t, r) {
	let i;
	i = typeof r == "object" ? r : r === void 0 ? { singleThread: !1 } : { singleThread: r };
	let a = {};
	if (await z(e, t, 1), a.n8 = await e.readULE32(), a.prime = await Oe(e, a.n8), i.F) {
		if (i.F.p != a.prime) throw Error("Different Prime");
		a.F = i.F;
	} else if (i.getFieldFromPrime) a.F = await i.getFieldFromPrime(a.prime, i.singleThread);
	else if (i.getCurveFromPrime) a.curve = await i.getCurveFromPrime(a.prime, i.singleThread), a.F = a.curve.Fr;
	else try {
		a.curve = await o(a.prime, i.singleThread), a.F = a.curve.Fr;
	} catch {
		a.F = new n(a.prime);
	}
	return a.nVars = await e.readULE32(), a.nOutputs = await e.readULE32(), a.nPubInputs = await e.readULE32(), a.nPrvInputs = await e.readULE32(), a.nLabels = await e.readULE64(), a.nConstraints = await e.readULE32(), a.useCustomGates = t[4] !== void 0 && t[4] !== null && t[5] !== void 0 && t[5] !== null, await B(e), a;
}
async function mi(e, t, n, r, i) {
	let a;
	a = typeof r == "object" ? r : r === void 0 ? {} : {
		logger: r,
		loggerCtx: i
	};
	let o = await H(e, t, 2), s = 0, c;
	c = n.nConstraints > 1 << 20 ? new fi() : [];
	for (let e = 0; e < n.nConstraints; e++) {
		a.logger && e % 1e5 == 0 && a.logger.info(`${a.loggerCtx}: Loading constraints: ${e}/${n.nConstraints}`);
		let t = l();
		c.push(t);
	}
	return c;
	function l() {
		let e = [];
		return e[0] = u(), e[1] = u(), e[2] = u(), e;
	}
	function u() {
		let e = {}, t = o.slice(s, s + 4);
		s += 4;
		let r = new DataView(t.buffer).getUint32(0, !0), i = o.slice(s, s + (4 + n.n8) * r);
		s += (4 + n.n8) * r;
		let a = new DataView(i.buffer);
		for (let t = 0; t < r; t++) {
			let r = a.getUint32(t * (4 + n.n8), !0);
			e[r] = n.F.fromRprLE(i, t * (4 + n.n8) + 4);
		}
		return e;
	}
}
async function hi(e, t, n, r, i) {
	let a;
	a = typeof r == "object" ? r : r === void 0 ? {} : {
		logger: r,
		loggerCtx: i
	};
	let o = await H(e, t, 3), s = 0, c;
	c = n.nVars > 1 << 20 ? new fi() : [];
	for (let e = 0; e < n.nVars; e++) {
		a.logger && e % 1e4 == 0 && a.logger.info(`${a.loggerCtx}: Loading map: ${e}/${n.nVars}`);
		let t = l();
		c.push(t);
	}
	return c;
	function l() {
		let e = o.slice(s, s + 8);
		s += 8;
		let t = new DataView(e.buffer), n = t.getUint32(0, !0);
		return t.getUint32(4, !0) * 4294967296 + n;
	}
}
async function gi(e, t, n) {
	if (typeof n != "object") throw Error("readR1csFd: options must be an object");
	n.loadConstraints = "loadConstraints" in n ? n.loadConstraints : !0, n.loadMap = "loadMap" in n && n.loadMap, n.loadCustomGates = "loadCustomGates" in n ? n.loadCustomGates : !0;
	let r = await pi(e, t, n);
	return n.loadConstraints && (r.constraints = await mi(e, t, r, n)), n.loadMap && (r.map = await hi(e, t, r, n)), n.loadCustomGates && (r.useCustomGates ? (r.customGates = await vi(e, t, r), r.customGatesUses = await yi(e, t, n)) : (r.customGates = [], r.customGatesUses = [])), r;
}
async function _i(e, t, n, r, i, a) {
	let o;
	o = typeof t == "object" ? t : t === void 0 ? {
		loadConstraints: !0,
		loadMap: !1,
		loadCustomGates: !0
	} : {
		loadConstraints: t,
		loadMap: n,
		singleThread: r,
		logger: i,
		loggerCtx: a
	};
	let { fd: s, sections: c } = await I(e, "r1cs", 1, 1 << 25, 1 << 22), l = await gi(s, c, o);
	return await s.close(), l;
}
async function vi(e, t, n) {
	await z(e, t, 4);
	let r = await e.readULE32(), i = [];
	for (let t = 0; t < r; t++) {
		let t = {};
		t.templateName = await e.readString();
		let r = await e.readULE32();
		t.parameters = Array(r);
		let a = await e.read(n.n8 * r);
		for (let e = 0; e < r; e++) t.parameters[e] = n.F.fromRprLE(a, e * n.n8, n.n8);
		i.push(t);
	}
	return await B(e), i;
}
async function yi(e, t, n) {
	let r = await H(e, t, 5), i = new Uint32Array(r.buffer, r.byteOffset, r.byteLength / 4), a = i[0], o = 1, s;
	s = a > 1 << 20 ? new fi() : [];
	for (let e = 0; e < a; e++) {
		n.logger && e % 1e5 == 0 && n.logger.info(`${n.loggerCtx}: Loading custom gate uses: ${e}/${a}`);
		let t = {};
		t.id = i[o++];
		let r = i[o++];
		t.signals = [];
		for (let e = 0; e < r; e++) {
			let e = i[o++], n = i[o++];
			t.signals.push(n * 4294967296 + e);
		}
		s.push(t);
	}
	return s;
}
//#endregion
//#region src/r1cs_info.js
var bi = r.e("73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001", 16), xi = r.e("21888242871839275222246405745257275088548364400416034343698204186575808495617");
async function Si(e, t) {
	let n = await _i(e, {
		loadConstraints: !1,
		loadMap: !1
	});
	return r.eq(n.prime, xi) ? t && t.info("Curve: bn-128") : r.eq(n.prime, bi) ? t && t.info("Curve: bls12-381") : t && t.info(`Unknown Curve. Prime: ${r.toString(n.prime)}`), t && t.info(`# of Wires: ${n.nVars}`), t && t.info(`# of Constraints: ${n.nConstraints}`), t && t.info(`# of Private Inputs: ${n.nPrvInputs}`), t && t.info(`# of Public Inputs: ${n.nPubInputs}`), t && t.info(`# of Labels: ${n.nLabels}`), t && t.info(`# of Outputs: ${n.nOutputs}`), n;
}
//#endregion
//#region src/r1cs_export_json.js
async function Ci(e, t) {
	let n = await _i(e, !0, !0, !0, t), r = n.curve.Fr;
	return delete n.curve, delete n.F, It(r, n);
}
//#endregion
//#region src/r1cs.js
var wi = /* @__PURE__ */ l({
	exportJson: () => Ci,
	info: () => Si,
	print: () => ci
});
//#endregion
//#region src/loadsyms.js
async function Ti(e) {
	let t = {
		labelIdx2Name: ["one"],
		varIdx2Name: ["one"],
		componentIdx2Name: []
	}, n = await lr(e), r = await n.read(n.totalSize), i = new TextDecoder("utf-8").decode(r).split("\n");
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
var { unstringifyBigInts: Ei } = s;
async function Di(e, t, n, r, i, a) {
	let o = Ei(e), s = await lr(t), c = await s.read(s.totalSize);
	await s.close();
	let l = {
		...i,
		sanityCheck: !0
	}, u = await Ti(r);
	i.set && (u ||= await Ti(r), l.logSetSignal = function(e, t) {
		a && a.info("SET " + u.labelIdx2Name[e] + " <-- " + t.toString());
	}), i.get && (u ||= await Ti(r), l.logGetSignal = function(e, t) {
		a && a.info("GET " + u.labelIdx2Name[e] + " --> " + t.toString());
	}), i.trigger && (u ||= await Ti(r), l.logStartComponent = function(e) {
		a && a.info("START: " + u.componentIdx2Name[e]);
	}, l.logFinishComponent = function(e) {
		a && a.info("FINISH: " + u.componentIdx2Name[e]);
	}), l.sym = u;
	let d = await mr(c, l), f = await d.calculateWitness(o, !0), p = await Ee(n, "wtns", 2, 2);
	await en(p, f, d.prime), await p.close();
}
//#endregion
//#region src/wtns_export_json.js
async function Oi(e) {
	return await rn(e);
}
//#endregion
//#region src/wtns_check.js
async function ki(e, t, n) {
	let i, a, o, s;
	try {
		n && n.info("WITNESS CHECKING STARTED"), n && n.info("> Reading r1cs file"), {fd: i, sections: a} = await I(e, "r1cs", 1, 1 << 22, 1 << 24);
		let c = await gi(i, a, {
			loadConstraints: !1,
			loadCustomGates: !1
		});
		n && n.info("> Reading witness file"), {fd: o, sections: s} = await I(t, "wtns", 2, 1 << 22, 1 << 24);
		let l = await nn(o, s);
		if (!r.eq(c.prime, l.q)) throw Error("Curve of the witness does not match the curve of the proving key");
		let u = await H(o, s, 2);
		await o.close();
		let d = (await Fe(c.prime)).Fr, f = d.n8, p = await H(i, a, 2);
		n && (n.info("----------------------------"), n.info("  WITNESS CHECK"), n.info(`  Curve:          ${c.curve.name}`), n.info(`  Vars (wires):   ${c.nVars}`), n.info(`  Outputs:        ${c.nOutputs}`), n.info(`  Public Inputs:  ${c.nPubInputs}`), n.info(`  Private Inputs: ${c.nPrvInputs}`), n.info(`  Labels:         ${c.nLabels}`), n.info(`  Constraints:    ${c.nConstraints}`), n.info(`  Custom Gates:   ${c.useCustomGates}`), n.info("----------------------------")), n && n.info("> Checking witness correctness");
		let m = 0, h = !0;
		for (let e = 0; e < c.nConstraints; e++) {
			n && e !== 0 && e % 5e5 == 0 && n.info(`··· processing r1cs constraints ${e}/${c.nConstraints}`);
			let t = _(), r = _(), i = _(), a = g(t), o = g(r), s = g(i);
			if (!d.eq(d.sub(d.mul(a, o), s), d.zero)) {
				n && n.warn("··· aborting checking process at constraint " + e), h = !1;
				break;
			}
		}
		return await i.close(), n && (h ? (n.info("WITNESS IS CORRECT"), n.info("WITNESS CHECKING FINISHED SUCCESSFULLY")) : (n.warn("WITNESS IS NOT CORRECT"), n.warn("WITNESS CHECKING FINISHED UNSUCCESSFULLY"))), h;
		function g(e) {
			let t = d.zero;
			return Object.keys(e).forEach((n) => {
				let r = v(n), i = e[n];
				t = d.add(t, d.mul(r, i));
			}), t;
		}
		function _() {
			let e = {}, t = p.slice(m, m + 4);
			m += 4;
			let n = new DataView(t.buffer).getUint32(0, !0), r = p.slice(m, m + (4 + c.n8) * n);
			m += (4 + c.n8) * n;
			let i = new DataView(r.buffer);
			for (let t = 0; t < n; t++) {
				let n = i.getUint32(t * (4 + c.n8), !0);
				e[n] = c.F.fromRprLE(r, t * (4 + c.n8) + 4);
			}
			return e;
		}
		function v(e) {
			return d.fromRprLE(u.slice(e * f, e * f + f));
		}
	} finally {
		for (let e of [i, o]) try {
			e && await e.close();
		} catch {}
	}
}
//#endregion
//#region src/wtns.js
var Ai = /* @__PURE__ */ l({
	calculate: () => vr,
	check: () => ki,
	debug: () => Di,
	exportJson: () => Oi
}), ji = 262144, Mi = {
	get: function(e, t) {
		return isNaN(t) ? e[t] : e.getElement(t);
	},
	set: function(e, t, n) {
		return isNaN(t) ? (e[t] = n, !0) : e.setElement(t, n);
	}
}, Ni = class {
	constructor(e) {
		this.length = e || 0, this.arr = Array(ji);
		for (let t = 0; t < e; t += ji) this.arr[t / ji] = Array(Math.min(ji, e - t));
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
		let t = Math.floor(e / ji), n = e % ji;
		return this.arr[t] ? this.arr[t][n] : void 0;
	}
	setElement(e, t) {
		e = parseInt(e);
		let n = Math.floor(e / ji);
		this.arr[n] || (this.arr[n] = Array(ji));
		let r = e % ji;
		return this.arr[n][r] = t, e >= this.length && (this.length = e + 1), !0;
	}
	getKeys() {
		let e = new Pi();
		for (let t = 0; t < this.arr.length; t++) if (this.arr[t]) for (let n = 0; n < this.arr[t].length; n++) this.arr[t][n] !== void 0 && e.push(t * ji + n);
		return e;
	}
}, Pi = class {
	constructor(e) {
		let t = new Ni(e);
		return new Proxy(t, Mi);
	}
};
//#endregion
//#region src/zkey_new.js
async function Fi(t, n, i, a) {
	let o, s, c, l, u;
	try {
		let d = K.create({ dkLen: 64 });
		({fd: o, sections: s} = await I(n, "ptau", 1, 1 << 22, 1 << 24));
		let { curve: f, power: p } = await Fr(o, s);
		({fd: c, sections: l} = await I(t, "r1cs", 1, 1 << 22, 1 << 24));
		let m = await pi(c, l, !1);
		u = await Ee(i, "zkey", 1, 10, 1 << 22, 1 << 24);
		let h = f.G1.F.n8 * 2, g = f.G2.F.n8 * 2;
		if (m.prime != f.r) return a && a.error("r1cs curve does not match powers of tau ceremony curve"), -1;
		let _ = St(m.nConstraints + m.nPubInputs + m.nOutputs + 1 - 1) + 1;
		if (_ > p) return a && a.error(`circuit too big for this power of tau ceremony. ${m.nConstraints}*2 > 2**${p}`), -1;
		if (!s[12]) return a && a.error("Powers of tau is not prepared."), -1;
		let v = m.nOutputs + m.nPubInputs, y = 2 ** _;
		await L(u, 1), await u.writeULE32(1), await R(u), await L(u, 2);
		let b = f.q, x = (Math.floor((r.bitLength(b) - 1) / 64) + 1) * 8, S = f.r, C = (Math.floor((r.bitLength(S) - 1) / 64) + 1) * 8, w = r.mod(r.shl(1, C * 8), S), T = f.Fr.e(r.mod(r.mul(w, w), S));
		await u.writeULE32(x), await De(u, b, x), await u.writeULE32(C), await De(u, S, C), await u.writeULE32(m.nVars), await u.writeULE32(v), await u.writeULE32(y), await (async function() {
			let e = await o.read(h, s[4][0].p);
			await u.write(e), e = await f.G1.batchLEMtoU(e), d.update(e);
			let t = await o.read(h, s[5][0].p);
			await u.write(t), t = await f.G1.batchLEMtoU(t), d.update(t);
			let n = await o.read(g, s[6][0].p);
			await u.write(n), n = await f.G2.batchLEMtoU(n), d.update(n);
			let r = new Uint8Array(h);
			f.G1.toRprLEM(r, 0, f.G1.g);
			let i = new Uint8Array(g);
			f.G2.toRprLEM(i, 0, f.G2.g);
			let a = new Uint8Array(h);
			f.G1.toRprUncompressed(a, 0, f.G1.g);
			let c = new Uint8Array(g);
			f.G2.toRprUncompressed(c, 0, f.G2.g), await u.write(i), await u.write(r), await u.write(i), d.update(c), d.update(a), d.update(c);
		})(), await R(u), a && a.info("Reading r1cs");
		let E = await H(c, l, 2);
		await c.close();
		let D = new Pi(m.nVars), O = new Pi(m.nVars), k = new Pi(m.nVars), A = new Pi(m.nVars - v - 1), j = Array(v + 1);
		a && a.info("Reading tauG1");
		let M = await H(o, s, 12, (y - 1) * h, y * h), N = null;
		a && a.info("Reading alphatauG1");
		let P = await H(o, s, 14, (y - 1) * h, y * h);
		a && a.info("Reading betatauG1");
		let F = await H(o, s, 15, (y - 1) * h, y * h);
		a && a.info("processConstraints"), await ne(), a && a.info("composeAndWritePoints"), await re(3, "G1", j, "IC"), j = null, a && a.info("writeHs"), await te(), a && a.info("hashHPoints"), await ae(), a && a.info("composeAndWritePoints 8 G1 C"), await re(8, "G1", A, "C"), A = null, P = null, F = null, a && a.info("composeAndWritePoints 5 G1 A"), await re(5, "G1", D, "A"), D = null, a && a.info("composeAndWritePoints 6 G1 B1"), await re(6, "G1", O, "B1"), O = null, M = null, a && a.info("Reading tauG2"), N = await H(o, s, 13, (y - 1) * g, y * g), a && a.info("composeAndWritePoints 7 G2 B2"), await re(7, "G2", k, "B2"), k = null, N = null, E = null, a && a.info("Contributions section");
		let ee = d.digest();
		return await L(u, 10), await u.write(ee), await u.writeULE32(0), await R(u), a && a.info(q(ee, "Circuit hash: ")), await u.close(), await o.close(), ee;
		async function te() {
			await L(u, 9);
			let t = new e(y * h);
			if (_ < f.Fr.s) {
				let e = await H(o, s, 12, (y * 2 - 1) * h, y * 2 * h);
				for (let n = 0; n < y; n++) {
					a && n % 1e4 == 0 && a.debug(`splitting buffer: ${n}/${y}`);
					let r = e.slice((n * 2 + 1) * h, (n * 2 + 1) * h + h);
					t.set(r, n * h);
				}
			} else if (_ == f.Fr.s) {
				/* c8 ignore start */
				let e = s[12][0].p + (2 ** (_ + 1) - 1) * h;
				await o.readToBuffer(t, 0, y * h, e + y * h);
			} else throw a && a.error("Circuit too big"), Error("Circuit too big for this curve");
			await u.write(t), await R(u);
		}
		async function ne() {
			let t = new Uint8Array(12 + f.Fr.n8), n = new DataView(t.buffer), r = new Uint8Array(f.Fr.n8);
			f.Fr.toRprLE(r, 0, f.Fr.e(1));
			let i = 0;
			function o() {
				let e = E.slice(i, i + 4);
				return i += 4, new DataView(e.buffer).getUint32(0, !0);
			}
			let s = new Pi();
			for (let e = 0; e < m.nConstraints; e++) {
				a && e % 1e4 == 0 && a.debug(`processing constraints: ${e}/${m.nConstraints}`);
				let t = o();
				for (let n = 0; n < t; n++) {
					let t = o(), n = i;
					i += f.Fr.n8;
					let r = h * e, a = h * e;
					D[t] === void 0 && (D[t] = []), D[t].push([
						0,
						r,
						n
					]), t <= v ? (j[t] === void 0 && (j[t] = []), j[t].push([
						3,
						a,
						n
					])) : (A[t - v - 1] === void 0 && (A[t - v - 1] = []), A[t - v - 1].push([
						3,
						a,
						n
					])), s.push([
						0,
						e,
						t,
						n
					]);
				}
				let n = o();
				for (let t = 0; t < n; t++) {
					let t = o(), n = i;
					i += f.Fr.n8;
					let r = h * e, a = g * e, c = h * e;
					O[t] === void 0 && (O[t] = []), O[t].push([
						0,
						r,
						n
					]), k[t] === void 0 && (k[t] = []), k[t].push([
						1,
						a,
						n
					]), t <= v ? 
					/* c8 ignore start */
					(j[t] === void 0 && (j[t] = []), j[t].push([
						2,
						c,
						n
					])) : (A[t - v - 1] === void 0 && (A[t - v - 1] = []), A[t - v - 1].push([
						2,
						c,
						n
					])), s.push([
						1,
						e,
						t,
						n
					]);
				}
				let r = o();
				for (let t = 0; t < r; t++) {
					let t = o(), n = i;
					i += f.Fr.n8;
					let r = h * e;
					t <= v ? (j[t] === void 0 && (j[t] = []), j[t].push([
						0,
						r,
						n
					])) : (A[t - v - 1] === void 0 && (A[t - v - 1] = []), A[t - v - 1].push([
						0,
						r,
						n
					]));
				}
			}
			for (let e = 0; e <= v; e++) {
				let t = h * (m.nConstraints + e), n = h * (m.nConstraints + e);
				D[e] === void 0 && (D[e] = []), D[e].push([
					0,
					t,
					-1
				]), j[e] === void 0 && (j[e] = []), j[e].push([
					3,
					n,
					-1
				]), s.push([
					0,
					m.nConstraints + e,
					e,
					-1
				]);
			}
			await L(u, 4);
			let c = new e(s.length * (12 + f.Fr.n8) + 4), l = /* @__PURE__ */ new Uint8Array(4);
			new DataView(l.buffer).setUint32(0, s.length, !0), c.set(l);
			let d = 4;
			for (let e = 0; e < s.length; e++) a && e % 1e5 == 0 && a.debug(`writing coeffs: ${e}/${s.length}`), p(s[e]);
			await u.write(c), await R(u);
			function p(e) {
				n.setUint32(0, e[0], !0), n.setUint32(4, e[1], !0), n.setUint32(8, e[2], !0);
				let i;
				i = e[3] >= 0 ? f.Fr.fromRprLE(E.slice(e[3], e[3] + f.Fr.n8), 0) : f.Fr.fromRprLE(r, 0);
				let a = f.Fr.mul(i, T);
				f.Fr.toRprLE(t, 12, a), c.set(t, d), d += t.length;
			}
		}
		async function re(e, t, n, r) {
			let i = 32768, o = f[t];
			ce(n.length), await L(u, e);
			let s = [], c = 0;
			for (; c < n.length;) {
				let e = 0;
				for (; c < n.length && e < f.tm.concurrency;) {
					a && a.debug(`Writing points start ${r}: ${c}/${n.length}`);
					let o = 1, l = n[c] ? n[c].length : 0;
					for (; c + o < n.length && l + (n[c + o] ? n[c + o].length : 0) < i && o < i;) l += n[c + o] ? n[c + o].length : 0, o++;
					let u = n.slice(c, c + o), d = c;
					s.push(ie(t, u, a, r).then((e) => (a && a.debug(`Writing points end ${r}: ${d}/${n.length}`), e))), c += o, e++;
				}
				let l = await Promise.all(s);
				for (let e = 0; e < l.length; e++) {
					await u.write(l[e][0]);
					let t = await o.batchLEMtoU(l[e][0]);
					d.update(t);
				}
				s = [];
			}
			await R(u);
		}
		async function ie(t, n, r, i) {
			let a = f[t], o = a.F.n8 * 2, s = a.F.n8 * 3, c = a.F.n8 * 2, l, u, d, p;
			if (t == "G1") l = "g1m_timesScalarAffine", u = "g1m_multiexpAffine", d = "g1m_batchToAffine", p = "g1m_zero";
			else if (t == "G2") l = "g2m_timesScalarAffine", u = "g2m_multiexpAffine", d = "g2m_batchToAffine", p = "g2m_zero";
			else throw Error("Invalid group");
			let m = 0;
			for (let e = 0; e < n.length; e++) m += n[e] ? n[e].length : 0;
			let h, g;
			/* c8 ignore start */
			m > 32768 ? (h = new e(m * o), g = new e(m * f.Fr.n8)) : (h = new Uint8Array(m * o), g = new Uint8Array(m * f.Fr.n8));
			/* c8 ignore stop */
			let _ = 0, v = 0, y = [
				M,
				N,
				P,
				F
			], b = new Uint8Array(f.Fr.n8);
			f.Fr.toRprLE(b, 0, f.Fr.e(1));
			let x = 0;
			for (let e = 0; e < n.length; e++) if (n[e]) for (let t = 0; t < n[e].length; t++) r && t && t % 1e4 == 0 && r.debug(`Configuring big array ${i}: ${t}/${n[e].length}`), h.set(y[n[e][t][0]].slice(n[e][t][1], n[e][t][1] + o), x * o), n[e][t][2] >= 0 ? g.set(E.slice(n[e][t][2], n[e][t][2] + f.Fr.n8), x * f.Fr.n8) : g.set(b, x * f.Fr.n8), x++;
			if (n.length > 1) {
				let e = [];
				e.push({
					cmd: "ALLOCSET",
					var: 0,
					buff: h
				}), e.push({
					cmd: "ALLOCSET",
					var: 1,
					buff: g
				}), e.push({
					cmd: "ALLOC",
					var: 2,
					len: n.length * s
				}), _ = 0, v = 0;
				let t = 0;
				for (let r = 0; r < n.length; r++) {
					if (!n[r]) {
						e.push({
							cmd: "CALL",
							fnName: p,
							params: [{
								var: 2,
								offset: t
							}]
						}), t += s;
						continue;
					}
					n[r].length == 1 ? e.push({
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
							{ val: f.Fr.n8 },
							{
								var: 2,
								offset: t
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
							{ val: f.Fr.n8 },
							{ val: n[r].length },
							{
								var: 2,
								offset: t
							}
						]
					}), _ += o * n[r].length, v += f.Fr.n8 * n[r].length, t += s;
				}
				return e.push({
					cmd: "CALL",
					fnName: d,
					params: [
						{ var: 2 },
						{ val: n.length },
						{ var: 2 }
					]
				}), e.push({
					cmd: "GET",
					out: 0,
					var: 2,
					len: n.length * c
				}), await f.tm.queueAction(e);
			}
			{
				let e = await a.multiExpAffine(h, g, r, i);
				return e = [a.toAffine(e)], e;
			}
		}
		async function ae() {
			let e = 16384;
			ce(y - 1);
			for (let t = 0; t < y - 1; t += e) {
				a && a.debug(`HashingHPoints: ${t}/${y}`);
				let n = Math.min(y - 1, e);
				await oe(t, n);
			}
		}
		async function oe(e, t) {
			let n = await o.read(t * h, s[2][0].p + (e + y) * h), r = await o.read(t * h, s[2][0].p + e * h), i = f.tm.concurrency, a = Math.floor(t / i), c = [];
			for (let e = 0; e < i; e++) {
				let o;
				if (o = e < i - 1 ? a : t - e * a, o == 0) continue;
				let s = n.slice(e * a * h, (e * a + o) * h), l = r.slice(e * a * h, (e * a + o) * h);
				c.push(se(s, l));
			}
			let l = await Promise.all(c);
			for (let e = 0; e < l.length; e++) d.update(l[e][0]);
		}
		async function se(e, t) {
			let n = e.byteLength / h, r = f.G1.F.n8 * 3, i = [];
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
						offset: e * h
					},
					{
						var: 1,
						offset: e * h
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
				len: n * h
			}), await f.tm.queueAction(i);
		}
		function ce(e) {
			let t = /* @__PURE__ */ new Uint8Array(4);
			new DataView(t.buffer, t.byteOffset, t.byteLength).setUint32(0, e, !1), d.update(t);
		}
	} finally {
		for (let e of [
			o,
			c,
			u
		]) try {
			e && await e.close();
		} catch {}
	}
}
//#endregion
//#region src/zkey_export_bellman.js
async function Ii(e, t, n) {
	let { fd: r, sections: i } = await I(e, "zkey", 2), a = await Ht(r, i);
	if (a.protocol != "groth16") throw Error("zkey file is not groth16");
	let o = await U(a.q), s = o.G1.F.n8 * 2, c = o.G2.F.n8 * 2, l = await Jt(r, o, i), u = await cr(t);
	await v(a.vk_alpha_1), await v(a.vk_beta_1), await y(a.vk_beta_2), await y(a.vk_gamma_2), await v(a.vk_delta_1), await y(a.vk_delta_2);
	let d;
	d = await H(r, i, 3), d = await o.G1.batchLEMtoU(d), await b("G1", d);
	let f = await H(r, i, 9), p;
	p = await o.G1.fft(f, "affine", "jacobian", n), p = await o.G1.batchApplyKey(p, o.Fr.neg(o.Fr.e(2)), o.Fr.w[a.power + 1], "jacobian", "affine", n), p = p.slice(0, p.byteLength - s), p = await o.G1.batchLEMtoU(p), await b("G1", p);
	let m;
	m = await H(r, i, 8), m = await o.G1.batchLEMtoU(m), await b("G1", m);
	let h;
	h = await H(r, i, 5), h = await o.G1.batchLEMtoU(h), await b("G1", h);
	let g;
	g = await H(r, i, 6), g = await o.G1.batchLEMtoU(g), await b("G1", g);
	let _;
	_ = await H(r, i, 7), _ = await o.G2.batchLEMtoU(_), await b("G2", _), await u.write(l.csHash), await x(l.contributions.length);
	for (let e = 0; e < l.contributions.length; e++) {
		let t = l.contributions[e];
		await v(t.deltaAfter), await v(t.delta.g1_s), await v(t.delta.g1_sx), await y(t.delta.g2_spx), await u.write(t.transcript);
	}
	await r.close(), await u.close();
	async function v(e) {
		let t = new Uint8Array(s);
		o.G1.toRprUncompressed(t, 0, e), await u.write(t);
	}
	async function y(e) {
		let t = new Uint8Array(c);
		o.G2.toRprUncompressed(t, 0, e), await u.write(t);
	}
	async function b(e, t) {
		let n;
		n = e == "G1" ? s : c;
		let r = /* @__PURE__ */ new Uint8Array(4);
		new DataView(r.buffer, r.byteOffset, r.byteLength).setUint32(0, t.byteLength / n, !1), await u.write(r), await u.write(t);
	}
	async function x(e) {
		let t = /* @__PURE__ */ new Uint8Array(4);
		new DataView(t.buffer, t.byteOffset, t.byteLength).setUint32(0, e, !1), await u.write(t);
	}
}
//#endregion
//#region src/zkey_import_bellman.js
async function Li(e, t, n, r, i) {
	let a, o, s, c;
	try {
		({fd: a, sections: o} = await I(e, "zkey", 2));
		let l = await Ht(a, o, !1);
		if (l.protocol != "groth16") throw Error("zkey file is not groth16");
		let u = await U(l.q), d = u.G1.F.n8 * 2, f = u.G2.F.n8 * 2, p = await Jt(a, u, o), m = {};
		s = await lr(t), s.pos = d * 3 + f * 3 + 8 + d * l.nVars + 4 + d * (l.domainSize - 1) + 4 + d * l.nVars + 4 + d * l.nVars + 4 + f * l.nVars, m.csHash = await s.read(64);
		let h = await s.readUBE32();
		m.contributions = [];
		for (let e = 0; e < h; e++) {
			let t = { delta: {} };
			t.deltaAfter = await S(s), t.delta.g1_s = await S(s), t.delta.g1_sx = await S(s), t.delta.g2_spx = await C(s), t.transcript = await s.read(64), e < p.contributions.length && (t.type = p.contributions[e].type, t.type == 1 && (t.beaconHash = p.contributions[e].beaconHash, t.numIterationsExp = p.contributions[e].numIterationsExp), p.contributions[e].name && (t.name = p.contributions[e].name)), m.contributions.push(t);
		}
		/* c8 ignore start */
		if (!Ct(m.csHash, p.csHash)) return i && i.error("Hash of the original circuit does not match with the MPC one"), !1;
		/* c8 ignore stop */
		if (p.contributions.length > m.contributions.length) return i && i.error("The impoerted file does not include new contributions"), !1;
		for (let e = 0; e < p.contributions.length; e++) if (!w(p.contributions[e], m.contributions[e])) return i && i.error(`Previous contribution ${e} does not match`), !1;
		if (r) for (let e = p.contributions.length; e < m.contributions.length; e++) m.contributions[e].name = r;
		/* c8 ignore start */
		if (c = await Ee(n, "zkey", 1, 10), s.pos = 0, s.pos += d, s.pos += d, s.pos += f, s.pos += f, l.vk_delta_1 = await S(s), l.vk_delta_2 = await C(s), await Rt(c, l), await s.readUBE32() != l.nPublic + 1) return i && i.error("Invalid number of points in IC"), await c.discard(), !1;
		/* c8 ignore start */
		if (s.pos += d * (l.nPublic + 1), await V(a, o, c, 3), await V(a, o, c, 4), await s.readUBE32() != l.domainSize - 1) return i && i.error("Invalid number of points in H"), await c.discard(), !1;
		/* c8 ignore stop */
		let g, _ = await s.read(d * (l.domainSize - 1)), v = await u.G1.batchUtoLEM(_);
		g = new Uint8Array(l.domainSize * d), g.set(v), u.G1.toRprLEM(g, d * (l.domainSize - 1), u.G1.zeroAffine);
		let y = u.Fr.neg(u.Fr.inv(u.Fr.e(2))), b = u.Fr.inv(u.Fr.w[l.power + 1]);
		/* c8 ignore start */
		if (g = await u.G1.batchApplyKey(g, y, b, "affine", "jacobian", i), g = await u.G1.ifft(g, "jacobian", "affine", i), await L(c, 9), await c.write(g), await R(c), await s.readUBE32() != l.nVars - l.nPublic - 1) return i && i.error("Invalid number of points in L"), await c.discard(), !1;
		/* c8 ignore stop */
		let x;
		/* c8 ignore start */
		if (x = await s.read(d * (l.nVars - l.nPublic - 1)), x = await u.G1.batchUtoLEM(x), await L(c, 8), await c.write(x), await R(c), await s.readUBE32() != l.nVars) return i && i.error("Invalid number of points in A"), await c.discard(), !1;
		/* c8 ignore start */
		if (s.pos += d * l.nVars, await V(a, o, c, 5), await s.readUBE32() != l.nVars) return i && i.error("Invalid number of points in B1"), await c.discard(), !1;
		/* c8 ignore start */
		if (s.pos += d * l.nVars, await V(a, o, c, 6), await s.readUBE32() != l.nVars) return i && i.error("Invalid number of points in B2"), await c.discard(), !1;
		return s.pos += f * l.nVars, await V(a, o, c, 7), await Xt(c, u, m), await s.close(), await c.close(), await a.close(), !0;
		async function S(e) {
			let t = await e.read(u.G1.F.n8 * 2);
			return u.G1.fromRprUncompressed(t, 0);
		}
		async function C(e) {
			let t = await e.read(u.G2.F.n8 * 2);
			return u.G2.fromRprUncompressed(t, 0);
		}
		function w(e, t) {
			/* c8 ignore stop */
			return !(!u.G1.eq(e.deltaAfter, t.deltaAfter) || !u.G1.eq(e.delta.g1_s, t.delta.g1_s) || !u.G1.eq(e.delta.g1_sx, t.delta.g1_sx) || !u.G2.eq(e.delta.g2_spx, t.delta.g2_spx) || !Ct(e.transcript, t.transcript));
		}
	} finally {
		for (let e of [
			a,
			s,
			c
		]) try {
			e && await e.close();
		} catch {}
	}
}
//#endregion
//#region src/zkey_verify_frominit.js
/* c8 ignore stop */ var Ri = Dt;
async function zi(n, i, a, o) {
	let s, c, l, u, d, f;
	try {
		let p;
		({fd: s, sections: c} = await I(a, "zkey", 2));
		let m = await Ht(s, c, !1);
		if (m.protocol != "groth16") throw Error("zkey file is not groth16");
		let h = await U(m.q), g = h.G1.F.n8 * 2, _ = await Jt(s, h, c), v = K.create({ dkLen: 64 });
		v.update(_.csHash);
		let y = h.G1.g;
		for (let e = 0; e < _.contributions.length; e++) {
			let t = _.contributions[e], n = wt(v);
			/* c8 ignore start */
			if (Zt(n, h, t.delta.g1_s), Zt(n, h, t.delta.g1_sx), !Ct(n.digest(), t.transcript)) return console.log(`INVALID(${e}): Inconsistent transcript `), !1;
			/* c8 ignore stop */
			let r = Ar(h, t.transcript);
			/* c8 ignore start */
			if (p = await Ri(h, t.delta.g1_s, t.delta.g1_sx, r, t.delta.g2_spx), p !== !0) return console.log(`INVALID(${e}): public key G1 and G2 do not have the same ration `), !1;
			/* c8 ignore start */
			if (p = await Ri(h, y, t.deltaAfter, r, t.delta.g2_spx), p !== !0) return console.log(`INVALID(${e}): deltaAfter does not fillow the public key `), !1;
			/* c8 ignore stop */
			if (t.type == 1) {
				let n = await Nt(t.beaconHash, t.numIterationsExp), r = h.Fr.fromRng(n), i = h.G1.toAffine(h.G1.fromRng(n)), a = h.G1.toAffine(h.G1.timesFr(i, r));
				/* c8 ignore start */
				if (h.G1.eq(i, t.delta.g1_s) !== !0) return console.log(`INVALID(${e}): Key of the beacon does not match. g1_s `), !1;
				/* c8 ignore stop */
				/* c8 ignore start */
				if (h.G1.eq(a, t.delta.g1_sx) !== !0) return console.log(`INVALID(${e}): Key of the beacon does not match. g1_sx `), !1;
			}
			$t(v, h, t);
			let i = K.create({ dkLen: 64 });
			$t(i, h, t), t.contributionHash = i.digest(), y = t.deltaAfter;
		}
		({fd: l, sections: u} = await I(n, "zkey", 2));
		let b = await Ht(l, u, !1);
		if (b.protocol != "groth16") throw Error("zkeyinit file is not groth16");
		if (!r.eq(b.q, m.q) || !r.eq(b.r, m.r) || b.n8q != m.n8q || b.n8r != m.n8r) return o && o.error("INVALID:  Different curves"), !1;
		if (b.nVars != m.nVars || b.nPublic != m.nPublic || b.domainSize != m.domainSize) return o && o.error("INVALID:  Different circuit parameters"), !1;
		if (!h.G1.eq(m.vk_alpha_1, b.vk_alpha_1)) return o && o.error("INVALID:  Invalid alpha1"), !1;
		if (!h.G1.eq(m.vk_beta_1, b.vk_beta_1)) return o && o.error("INVALID:  Invalid beta1"), !1;
		if (!h.G2.eq(m.vk_beta_2, b.vk_beta_2)) return o && o.error("INVALID:  Invalid beta2"), !1;
		if (!h.G2.eq(m.vk_gamma_2, b.vk_gamma_2)) return o && o.error("INVALID:  Invalid gamma2"), !1;
		if (!h.G1.eq(m.vk_delta_1, y)) return o && o.error("INVALID:  Invalid delta1"), !1;
		if (p = await Ri(h, h.G1.g, y, h.G2.g, m.vk_delta_2), p !== !0) return o && o.error("INVALID:  Invalid delta2"), !1;
		let x = await Jt(l, h, u);
		if (!Ct(_.csHash, x.csHash)) return o && o.error("INVALID:  Circuit does not match"), !1;
		/* c8 ignore start */
		if (c[8][0].size != g * (m.nVars - m.nPublic - 1)) return o && o.error("INVALID:  Invalid L section size"), !1;
		/* c8 ignore stop */
		/* c8 ignore start */
		if (c[9][0].size != g * m.domainSize) return o && o.error("INVALID:  Invalid H section size"), !1;
		/* c8 ignore stop */
		let S;
		if (S = await ke(s, c, l, u, 3), !S) return o && o.error("INVALID:  IC section is not identical"), !1;
		if (S = await ke(s, c, l, u, 4), !S) return o && o.error("Coeffs section is not identical"), !1;
		if (S = await ke(s, c, l, u, 5), !S) return o && o.error("A section is not identical"), !1;
		if (S = await ke(s, c, l, u, 6), !S) return o && o.error("B1 section is not identical"), !1;
		if (S = await ke(s, c, l, u, 7), !S) return o && o.error("B2 section is not identical"), !1;
		if (p = await C("G1", l, u, s, c, 8, m.vk_delta_2, b.vk_delta_2, "L section"), p !== !0) return o && o.error("L section does not match"), !1;
		if (p = await w(), p !== !0) return o && o.error("H section does not match"), !1;
		o && o.info(q(_.csHash, "Circuit Hash: ")), await s.close(), await l.close();
		for (let e = _.contributions.length - 1; e >= 0; e--) {
			let t = _.contributions[e];
			o && o.info("-------------------------"), o && o.info(q(t.contributionHash, `contribution #${e + 1} ${t.name ? t.name : ""}:`)), t.type == 1 && (o && o.info(`Beacon generator: ${Ft(t.beaconHash)}`), o && o.info(`Beacon iterations Exp: ${t.numIterationsExp}`));
		}
		return o && o.info("-------------------------"), o && o.info("ZKey Ok!"), !0;
		async function C(e, t, n, r, i, a, s, c, l) {
			let u = 1 << 20, d = h[e], f = d.F.n8 * 2;
			await z(t, n, a), await z(r, i, a);
			let m = d.zero, g = d.zero, _ = n[a][0].size / f;
			for (let e = 0; e < _; e += u) {
				o && o.debug(`Same ratio check ${l}:  ${e}/${_}`);
				let n = Math.min(_ - e, u), i = await t.read(n * f), a = await r.read(n * f), s = kt(4 * n), c = await d.multiExpAffine(i, s), p = await d.multiExpAffine(a, s);
				m = d.add(m, c), g = d.add(g, p);
			}
			return await B(t), await B(r), _ == 0 || 
			/* c8 ignore stop */
			(p = await Ri(h, m, g, s, c), p === !0);
		}
		async function w() {
			let n = 1 << 20, r = h.G1, a = h.Fr, l = r.F.n8 * 2;
			({fd: d, sections: f} = await I(i, "ptau", 1));
			let u = new e(m.domainSize * m.n8r), g = Array(8);
			for (let e = 0; e < 8; e++) g[e] = jt(kt(4), 0);
			let _ = new t(g);
			for (let e = 0; e < m.domainSize - 1; e++) {
				let t = a.fromRng(_);
				a.toRprLE(u, e * m.n8r, t);
			}
			a.toRprLE(u, (m.domainSize - 1) * m.n8r, a.zero);
			let v = r.zero;
			for (let e = 0; e < m.domainSize; e += n) {
				o && o.debug(`H Verification(tau):  ${e}/${m.domainSize}`);
				let t = Math.min(m.domainSize - e, n), i = await T(await d.read(l * t, f[2][0].p + m.domainSize * l + e * l), await d.read(l * t, f[2][0].p + e * l)), a = u.slice(e * m.n8r, (e + t) * m.n8r), s = await r.multiExpAffine(i, a);
				v = r.add(v, s);
			}
			u = await a.batchToMontgomery(u);
			let y;
			if (m.power < a.s) y = a.neg(a.e(2));
			else {
				/* c8 ignore start */
				let e = 2 ** a.s, t = a.exp(a.shift, e);
				y = a.sub(t, a.one);
			}
			/* c8 ignore start */
			let x = m.power < a.s ? a.w[m.power + 1] : a.shift;
			u = await a.batchApplyKey(u, y, x), u = await a.fft(u), u = await a.batchFromMontgomery(u), await z(s, c, 9);
			let S = r.zero;
			for (let e = 0; e < m.domainSize; e += n) {
				o && o.debug(`H Verification(lagrange):  ${e}/${m.domainSize}`);
				let t = Math.min(m.domainSize - e, n), i = await s.read(l * t), a = u.slice(e * m.n8r, (e + t) * m.n8r), c = await r.multiExpAffine(i, a);
				S = r.add(S, c);
			}
			return await B(s), p = await Ri(h, v, S, m.vk_delta_2, b.vk_delta_2), p === !0;
		}
		async function T(e, t) {
			let n = h.G1.F.n8 * 2, r = e.byteLength / n, i = h.tm.concurrency, a = Math.floor(r / i), o = [];
			for (let n = 0; n < i; n++) {
				let s;
				/* c8 ignore start */
				if (s = n < i - 1 ? a : r - n * a, s == 0) continue;
				/* c8 ignore stop */
				let c = e.slice(n * a * g, (n * a + s) * g), l = t.slice(n * a * g, (n * a + s) * g);
				o.push(E(c, l));
			}
			let s = await Promise.all(o), c = new Uint8Array(r * n), l = 0;
			for (let e = 0; e < s.length; e++) c.set(s[e][0], l), l += s[e][0].byteLength;
			return c;
		}
		async function E(e, t) {
			let n = h.G1.F.n8 * 2, r = h.G1.F.n8 * 3, i = e.byteLength / n, a = [];
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
			}), await h.tm.queueAction(a);
		}
	} finally {
		for (let e of [
			s,
			l,
			d
		]) try {
			e && await e.close();
		} catch {}
	}
}
//#endregion
//#region src/zkey_verify_fromr1cs.js
async function Bi(e, t, n, r) {
	let i = { type: "bigMem" };
	return await Fi(e, t, i, r), await zi(i, t, n, r);
}
//#endregion
//#region src/zkey_contribute.js
async function Vi(e, t, n, r, i) {
	let { fd: a, sections: o } = await I(e, "zkey", 2), s = await Ht(a, o);
	if (s.protocol != "groth16") throw Error("zkey file is not groth16");
	let c = await U(s.q), l = await Jt(a, c, o), u = await Ee(t, "zkey", 1, 10), d = await Mt(r), f = K.create({ dkLen: 64 });
	f.update(l.csHash);
	for (let e = 0; e < l.contributions.length; e++) $t(f, c, l.contributions[e]);
	let p = {};
	p.delta = {}, p.delta.prvKey = c.Fr.fromRng(d), p.delta.g1_s = c.G1.toAffine(c.G1.fromRng(d)), p.delta.g1_sx = c.G1.toAffine(c.G1.timesFr(p.delta.g1_s, p.delta.prvKey)), Zt(f, c, p.delta.g1_s), Zt(f, c, p.delta.g1_sx), p.transcript = f.digest(), p.delta.g2_sp = Ar(c, p.transcript), p.delta.g2_spx = c.G2.toAffine(c.G2.timesFr(p.delta.g2_sp, p.delta.prvKey)), s.vk_delta_1 = c.G1.timesFr(s.vk_delta_1, p.delta.prvKey), s.vk_delta_2 = c.G2.timesFr(s.vk_delta_2, p.delta.prvKey), p.deltaAfter = s.vk_delta_1, p.type = 0, n && (p.name = n), l.contributions.push(p), await Rt(u, s), await V(a, o, u, 3), await V(a, o, u, 4), await V(a, o, u, 5), await V(a, o, u, 6), await V(a, o, u, 7);
	let m = c.Fr.inv(p.delta.prvKey);
	await Qr(a, o, u, 8, c, "G1", m, c.Fr.e(1), "L Section", i), await Qr(a, o, u, 9, c, "G1", m, c.Fr.e(1), "H Section", i), await Xt(u, c, l), await a.close(), await u.close();
	let h = K.create({ dkLen: 64 });
	$t(h, c, p);
	let g = h.digest();
	return i && i.info(q(l.csHash, "Circuit Hash: ")), i && i.info(q(g, "Contribution Hash: ")), g;
}
//#endregion
//#region src/zkey_beacon.js
async function Hi(e, t, n, r, i, a) {
	let o = Pt(r);
	if (o.byteLength == 0 || o.byteLength * 2 != r.length) return a && a.error("Invalid Beacon Hash. (It must be a valid hexadecimal sequence)"), !1;
	if (o.length >= 256) return a && a.error("Maximum length of beacon hash is 255 bytes"), !1;
	if (i = parseInt(i), i < 10 || i > 63) return a && a.error("Invalid numIterationsExp. (Must be between 10 and 63)"), !1;
	let { fd: s, sections: c } = await I(e, "zkey", 2), l = await Ht(s, c);
	if (l.protocol != "groth16") throw Error("zkey file is not groth16");
	let u = await U(l.q), d = await Jt(s, u, c), f = await Ee(t, "zkey", 1, 10), p = await Nt(o, i), m = K.create({ dkLen: 64 });
	m.update(d.csHash);
	for (let e = 0; e < d.contributions.length; e++) $t(m, u, d.contributions[e]);
	let h = {};
	h.delta = {}, h.delta.prvKey = u.Fr.fromRng(p), h.delta.g1_s = u.G1.toAffine(u.G1.fromRng(p)), h.delta.g1_sx = u.G1.toAffine(u.G1.timesFr(h.delta.g1_s, h.delta.prvKey)), Zt(m, u, h.delta.g1_s), Zt(m, u, h.delta.g1_sx), h.transcript = m.digest(), h.delta.g2_sp = Ar(u, h.transcript), h.delta.g2_spx = u.G2.toAffine(u.G2.timesFr(h.delta.g2_sp, h.delta.prvKey)), l.vk_delta_1 = u.G1.timesFr(l.vk_delta_1, h.delta.prvKey), l.vk_delta_2 = u.G2.timesFr(l.vk_delta_2, h.delta.prvKey), h.deltaAfter = l.vk_delta_1, h.type = 1, h.numIterationsExp = i, h.beaconHash = o, n && (h.name = n), d.contributions.push(h), await Rt(f, l), await V(s, c, f, 3), await V(s, c, f, 4), await V(s, c, f, 5), await V(s, c, f, 6), await V(s, c, f, 7);
	let g = u.Fr.inv(h.delta.prvKey);
	await Qr(s, c, f, 8, u, "G1", g, u.Fr.e(1), "L Section", a), await Qr(s, c, f, 9, u, "G1", g, u.Fr.e(1), "H Section", a), await Xt(f, u, d), await s.close(), await f.close();
	let _ = K.create({ dkLen: 64 });
	$t(_, u, h);
	let v = _.digest();
	return a && a.info(q(v, "Contribution Hash: ")), v;
}
//#endregion
//#region src/zkey_export_json.js
async function Ui(e) {
	let t = await Kt(e, !0);
	return delete t.curve, delete t.F, s.stringifyBigInts(t);
}
//#endregion
//#region src/zkey_bellman_contribute.js
async function Wi(e, t, n, r, i) {
	let a = await Mt(r), o = e.Fr.fromRng(a), s = e.Fr.inv(o), c = e.G1.F.n8 * 2, l = e.G2.F.n8 * 2, u = await lr(t), d = await cr(n);
	await D(c), await D(c), await D(l), await D(l);
	let f = await O(), p = e.G1.timesFr(f, o);
	await A(p);
	let m = await k();
	await j(e.G2.timesFr(m, o));
	let h = await u.readUBE32();
	await d.writeUBE32(h), await D(h * c);
	let g = await u.readUBE32();
	await d.writeUBE32(g), await $r(u, d, null, e, "G1", g, s, e.Fr.e(1), "UNCOMPRESSED", "H", i);
	let _ = await u.readUBE32();
	await d.writeUBE32(_), await $r(u, d, null, e, "G1", _, s, e.Fr.e(1), "UNCOMPRESSED", "L", i);
	let v = await u.readUBE32();
	await d.writeUBE32(v), await D(v * c);
	let y = await u.readUBE32();
	await d.writeUBE32(y), await D(y * c);
	let b = await u.readUBE32();
	await d.writeUBE32(b), await D(b * l);
	let x = K.create({ dkLen: 64 }), S = {};
	S.csHash = await u.read(64), x.update(S.csHash);
	let C = await u.readUBE32();
	S.contributions = [];
	for (let t = 0; t < C; t++) {
		let t = { delta: {} };
		t.deltaAfter = await O(), t.delta.g1_s = await O(), t.delta.g1_sx = await O(), t.delta.g2_spx = await k(), t.transcript = await u.read(64), S.contributions.push(t), $t(x, e, t);
	}
	let w = {};
	w.delta = {}, w.delta.prvKey = o, w.delta.g1_s = e.G1.toAffine(e.G1.fromRng(a)), w.delta.g1_sx = e.G1.toAffine(e.G1.timesFr(w.delta.g1_s, o)), Zt(x, e, w.delta.g1_s), Zt(x, e, w.delta.g1_sx), w.transcript = x.digest(), w.delta.g2_sp = Ar(e, w.transcript), w.delta.g2_spx = e.G2.toAffine(e.G2.timesFr(w.delta.g2_sp, o)), w.deltaAfter = p, w.type = 0, S.contributions.push(w), await d.write(S.csHash), await d.writeUBE32(S.contributions.length);
	for (let e = 0; e < S.contributions.length; e++) {
		let t = S.contributions[e];
		await A(t.deltaAfter), await A(t.delta.g1_s), await A(t.delta.g1_sx), await j(t.delta.g2_spx), await d.write(t.transcript);
	}
	let T = K.create({ dkLen: 64 });
	$t(T, e, w);
	let E = T.digest();
	return i && i.info(q(E, "Contribution Hash: ")), await d.close(), await u.close(), E;
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
var { stringifyBigInts: Gi } = s;
async function Ki(e, t) {
	t && t.info("EXPORT VERIFICATION KEY STARTED");
	let { fd: n, sections: r } = await I(e, "zkey", 2), i = await Ht(n, r);
	t && t.info("> Detected protocol: " + i.protocol);
	let a;
	if (i.protocol === "groth16") a = await qi(i, n, r);
	else if (i.protocol === "plonk") a = await Ji(i);
	else if (i.protocolId && i.protocolId === 10) a = await Yi(i, t);
	else throw Error("zkey file protocol unrecognized");
	return await n.close(), t && t.info("EXPORT VERIFICATION KEY FINISHED"), a;
}
async function qi(e, t, n) {
	let r = await U(e.q), i = r.G1.F.n8 * 2, a = await r.pairing(e.vk_alpha_1, e.vk_beta_2), o = {
		protocol: e.protocol,
		curve: r.name,
		nPublic: e.nPublic,
		vk_alpha_1: r.G1.toObject(e.vk_alpha_1),
		vk_beta_2: r.G2.toObject(e.vk_beta_2),
		vk_gamma_2: r.G2.toObject(e.vk_gamma_2),
		vk_delta_2: r.G2.toObject(e.vk_delta_2),
		vk_alphabeta_12: r.Gt.toObject(a)
	};
	await z(t, n, 3), o.IC = [];
	for (let n = 0; n <= e.nPublic; n++) {
		let e = await t.read(i), n = r.G1.toObject(e);
		o.IC.push(n);
	}
	return await B(t), o = Gi(o), o;
}
async function Ji(e) {
	let t = await U(e.q), n = {
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
	return n = Gi(n), n;
}
async function Yi(e, t) {
	let n = await U(e.q);
	return Gi({
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
var Xi = /* @__PURE__ */ l({
	beacon: () => Hi,
	bellmanContribute: () => Wi,
	contribute: () => Vi,
	exportBellman: () => Ii,
	exportJson: () => Ui,
	exportSolidityVerifier: () => null,
	exportVerificationKey: () => Ki,
	importBellman: () => Li,
	newZKey: () => Fi,
	verifyFromInit: () => zi,
	verifyFromR1cs: () => Bi
});
//#endregion
//#region src/plonk_setup.js
async function Zi(t, n, i, a) {
	let o, s, c, l, u;
	try {
		globalThis.gc && globalThis.gc(), {fd: o, sections: s} = await I(n, "ptau", 1, 1 << 22, 1 << 24);
		let { curve: d, power: f } = await Fr(o, s);
		({fd: c, sections: l} = await I(t, "r1cs", 1, 1 << 22, 1 << 24));
		let p = await gi(c, l, {
			loadConstraints: !0,
			loadCustomGates: !0
		}), m = d.G1.F.n8 * 2, h = d.G1, g = d.G2.F.n8 * 2, _ = d.Fr, v = d.Fr.n8;
		a && a.info("Reading r1cs");
		let y = new Pi(), b = new Pi(), x = p.nVars, S = p.nOutputs + p.nPubInputs;
		if (await j(d.Fr, p, a), globalThis.gc && globalThis.gc(), u = await Ee(i, "zkey", 1, 14, 1 << 22, 1 << 24), p.prime != d.r) return a && a.error("r1cs curve does not match powers of tau ceremony curve"), -1;
		let C = St(y.length - 1) + 1;
		/* c8 ignore start */
		C < 3 && (C = 3);
		/* c8 ignore stop */
		let w = 2 ** C;
		if (a && a.info("Plonk constraints: " + y.length), C > f) return a && a.error(`circuit too big for this power of tau ceremony. ${y.length} > 2**${f}`), -1;
		if (!s[12]) return a && a.error("Powers of tau is not prepared."), -1;
		let T = new e(w * m), E = s[12][0].p + (2 ** C - 1) * m;
		await o.readToBuffer(T, 0, w * m, E);
		let [D, O] = re(), k = {};
		await F(3, "Additions"), globalThis.gc && globalThis.gc(), await M(4, 0, "Amap"), globalThis.gc && globalThis.gc(), await M(5, 1, "Bmap"), globalThis.gc && globalThis.gc(), await M(6, 2, "Cmap"), globalThis.gc && globalThis.gc(), await N(7, 3, "Qm"), globalThis.gc && globalThis.gc(), await N(8, 4, "Ql"), globalThis.gc && globalThis.gc(), await N(9, 5, "Qr"), globalThis.gc && globalThis.gc(), await N(10, 6, "Qo"), globalThis.gc && globalThis.gc(), await N(11, 7, "Qc"), globalThis.gc && globalThis.gc(), await ee(12, "sigma"), globalThis.gc && globalThis.gc(), await te(13, "lagrange polynomials"), globalThis.gc && globalThis.gc(), await L(u, 14);
		let A = new e((w + 6) * m);
		await o.readToBuffer(A, 0, (w + 6) * m, s[2][0].p), await u.write(A), await R(u), globalThis.gc && globalThis.gc(), await ne(), await u.close(), await c.close(), await o.close(), a && a.info("Setup Finished");
		return;
		async function j(e, t, n) {
			function r(e) {
				let t = Object.keys(e);
				for (let n = 0; n < t.length; n++)
 /* c8 ignore next */
				e[t[n]] == 0n && delete e[t[n]];
			}
			function i(t, n, i) {
				let a = {};
				for (let r in t) a[r] = a[r] === void 0 ? e.mul(n, t[r]) : e.add(a[r], e.mul(n, t[r]));
				for (let t in i) {
					let n = e.neg(i[t]);
					a[t] = a[t] === void 0 ? n : e.add(a[t], n);
				}
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
					let t = i.shift(), n = i.shift(), r = t[0], a = n[0], o = x++, s = e.zero, c = e.neg(t[1]), l = e.neg(n[1]), u = e.one, d = e.zero;
					y.push([
						r,
						a,
						o,
						s,
						c,
						l,
						u,
						d
					]), b.push([
						r,
						a,
						t[1],
						n[1]
					]), i.push([o, e.one]);
				}
				for (let e = 0; e < i.length; e++) r.s[e] = i[e][0], r.coefs[e] = i[e][1];
				/* c8 ignore start */
				for (; r.coefs.length < n;) r.s.push(0), r.coefs.push(e.zero);
				/* c8 ignore stop */
				return r;
			}
			function o(t) {
				let n = a(t, 3), r = n.s[0], i = n.s[1], o = n.s[2], s = e.zero, c = n.coefs[0], l = n.coefs[1], u = n.coefs[2], d = n.k;
				y.push([
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
				y.push([
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
				for (let a = 0; a < i.length; a++)
 /* c8 ignore start */
				t[i[a]] == 0n ? delete t[i[a]] : i[a] == 0 ? n = e.add(n, t[i[a]]) : r++;
				return r > 0 ? r.toString() : 
				/* c8 ignore next */
				n == e.zero ? "0" : "k";
			}
			function l(e, t, n) {
				let a = c(e), l = c(t);
				a === "0" || l === "0" ? (r(n), o(n)) : a === "k" ? o(i(t, e[0], n)) : l === "k" ? o(i(e, t[0], n)) : s(e, t, n);
			}
			for (let t = 1; t <= S; t++) {
				let n = t, r = e.zero, i = e.one, a = e.zero, o = e.zero, s = e.zero;
				y.push([
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
		async function M(e, t, n) {
			await L(u, e);
			for (let e = 0; e < y.length; e++) await u.writeULE32(y[e][t]), a && e % 1e6 == 0 && a.debug(`writing ${n}: ${e}/${y.length}`);
			await R(u);
		}
		async function N(t, n, r) {
			let i = new e(w * v);
			for (let e = 0; e < y.length; e++) i.set(y[e][n], e * v), a && e % 1e6 == 0 && a.debug(`writing ${r}: ${e}/${y.length}`);
			await L(u, t), await P(i), await R(u), i = await _.batchFromMontgomery(i), k[r] = await d.G1.multiExpAffine(T, i, a, "multiexp " + r);
		}
		async function P(t) {
			let n = await _.ifft(t), r = new e(w * v * 4);
			r.set(n, 0);
			let i = await _.fft(r);
			await u.write(n), await u.write(i);
		}
		async function F(e, t) {
			await L(u, e);
			let n = new Uint8Array(8 + 2 * v), r = new DataView(n.buffer);
			for (let e = 0; e < b.length; e++) {
				let i = b[e], o = 0;
				/* c8 ignore start */
				r.setUint32(o, i[0], !0), o += 4, r.setUint32(o, i[1], !0), o += 4, n.set(i[2], o), o += v, n.set(i[3], o), o += v, await u.write(n), a && e % 1e6 == 0 && a.debug(`writing ${t}: ${e}/${b.length}`);
			}
			await R(u);
		}
		async function ee(t, n) {
			let r = new e(v * w * 3), i = new Pi(x), o = new Pi(x), s = _.one;
			for (let e = 0; e < w; e++) e < y.length ? (p(y[e][0], e), p(y[e][1], w + e), p(y[e][2], w * 2 + e)) : (p(0, e), p(0, w + e), p(0, w * 2 + e)), s = _.mul(s, _.w[C]), a && e % 1e6 == 0 && a.debug(`writing ${n} phase1: ${e}/${y.length}`);
			for (let e = 0; e < x; e++) o[e] === void 0 ? console.log("Variable not used") : r.set(i[e], o[e] * v), a && e % 1e6 == 0 && a.debug(`writing ${n} phase2: ${e}/${x}`);
			globalThis.gc && globalThis.gc(), await L(u, t);
			let c = r.slice(0, w * v);
			await P(c), globalThis.gc && globalThis.gc();
			let l = r.slice(w * v, w * v * 2);
			await P(l), globalThis.gc && globalThis.gc();
			let f = r.slice(w * v * 2, w * v * 3);
			await P(f), globalThis.gc && globalThis.gc(), await R(u), c = await _.batchFromMontgomery(c), l = await _.batchFromMontgomery(l), f = await _.batchFromMontgomery(f), k.S1 = await d.G1.multiExpAffine(T, c, a, "multiexp S1"), globalThis.gc && globalThis.gc(), k.S2 = await d.G1.multiExpAffine(T, l, a, "multiexp S2"), globalThis.gc && globalThis.gc(), k.S3 = await d.G1.multiExpAffine(T, f, a, "multiexp S3"), globalThis.gc && globalThis.gc();
			function p(e, t) {
				i[e] === void 0 ? o[e] = t : r.set(i[e], t * v);
				let n;
				n = t < w ? s : t < 2 * w ? _.mul(s, D) : _.mul(s, O), i[e] = n;
			}
		}
		async function te(t, n) {
			await L(u, t);
			let r = Math.max(S, 1);
			for (let t = 0; t < r; t++) {
				let i = new e(w * v);
				i.set(_.one, t * v), await P(i), a && a.debug(`writing ${n} ${t}/${r}`);
			}
			await R(u);
		}
		async function ne() {
			await L(u, 1), await u.writeULE32(2), await R(u), await L(u, 2);
			let e = d.q, t = (Math.floor((r.bitLength(e) - 1) / 64) + 1) * 8, n = d.r, i = (Math.floor((r.bitLength(n) - 1) / 64) + 1) * 8;
			await u.writeULE32(t), await De(u, e, t), await u.writeULE32(i), await De(u, n, i), await u.writeULE32(x), await u.writeULE32(S), await u.writeULE32(w), await u.writeULE32(b.length), await u.writeULE32(y.length), await u.write(D), await u.write(O), await u.write(h.toAffine(k.Qm)), await u.write(h.toAffine(k.Ql)), await u.write(h.toAffine(k.Qr)), await u.write(h.toAffine(k.Qo)), await u.write(h.toAffine(k.Qc)), await u.write(h.toAffine(k.S1)), await u.write(h.toAffine(k.S2)), await u.write(h.toAffine(k.S3));
			let a;
			a = await o.read(g, s[3][0].p + g), await u.write(a), await R(u);
		}
		function re() {
			let e = _.two;
			/* c8 ignore start */
			for (; n(e, [], C);) _.add(e, _.one);
			/* c8 ignore stop */
			let t = _.add(e, _.one);
			/* c8 ignore start */
			for (; n(t, [e], C);) _.add(t, _.one);
			/* c8 ignore stop */
			return [e, t];
			function n(e, t, n) {
				let r = 2 ** n, i = _.one;
				for (let a = 0; a < r; a++) {
					/* c8 ignore start */
					if (_.eq(e, i)) return !0;
					/* c8 ignore stop */
					for (let n = 0; n < t.length; n++)
 /* c8 ignore start */
					if (_.eq(e, _.mul(t[n], i))) return !0;
					i = _.mul(i, _.w[n]);
				}
				return !1;
			}
		}
	} finally {
		for (let e of [
			o,
			c,
			u
		]) try {
			e && await e.close();
		} catch {}
	}
}
//#endregion
//#region src/proof.js
var Qi = class {
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
}, $i = BigInt(0), ea = BigInt(1), ta = BigInt(2), na = BigInt(7), ra = BigInt(256), ia = BigInt(113), aa = [], oa = [], sa = [];
for (let e = 0, t = ea, n = 1, r = 0; e < 24; e++) {
	[n, r] = [r, (2 * n + 3 * r) % 5], aa.push(2 * (5 * r + n)), oa.push((e + 1) * (e + 2) / 2 % 64);
	let i = $i;
	for (let e = 0; e < 7; e++) t = (t << ea ^ (t >> na) * ia) % ra, t & ta && (i ^= ea << (ea << BigInt(e)) - ea);
	sa.push(i);
}
var ca = et(sa, !0), la = ca[0], ua = ca[1], da = (e, t, n) => n > 32 ? lt(e, t, n) : st(e, t, n), fa = (e, t, n) => n > 32 ? ut(e, t, n) : ct(e, t, n);
function pa(e, t = 24) {
	if (Re(t, "rounds"), t < 1 || t > 24) throw Error("\"rounds\" expected integer 1..24");
	let n = /* @__PURE__ */ new Uint32Array(10);
	for (let r = 24 - t; r < 24; r++) {
		for (let t = 0; t < 10; t++) n[t] = e[t] ^ e[t + 10] ^ e[t + 20] ^ e[t + 30] ^ e[t + 40];
		for (let t = 0; t < 10; t += 2) {
			let r = (t + 8) % 10, i = (t + 2) % 10, a = n[i], o = n[i + 1], s = da(a, o, 1) ^ n[r], c = fa(a, o, 1) ^ n[r + 1];
			for (let n = 0; n < 50; n += 10) e[t + n] ^= s, e[t + n + 1] ^= c;
		}
		let t = e[2], i = e[3];
		for (let n = 0; n < 24; n++) {
			let r = oa[n], a = da(t, i, r), o = fa(t, i, r), s = aa[n];
			t = e[s], i = e[s + 1], e[s] = a, e[s + 1] = o;
		}
		for (let t = 0; t < 50; t += 10) {
			let n = e[t], r = e[t + 1], i = e[t + 2], a = e[t + 3];
			e[t] ^= ~e[t + 2] & e[t + 4], e[t + 1] ^= ~e[t + 3] & e[t + 5], e[t + 2] ^= ~e[t + 4] & e[t + 6], e[t + 3] ^= ~e[t + 5] & e[t + 7], e[t + 4] ^= ~e[t + 6] & e[t + 8], e[t + 5] ^= ~e[t + 7] & e[t + 9], e[t + 6] ^= ~e[t + 8] & n, e[t + 7] ^= ~e[t + 9] & r, e[t + 8] ^= ~n & i, e[t + 9] ^= ~r & a;
		}
		e[0] ^= la[r], e[1] ^= ua[r];
	}
	Ue(n);
}
var ma = class e {
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
		if (this.blockLen = e, this.suffix = t, this.outputLen = n, this.enableXOF = r, this.canXOF = r, this.rounds = i, Re(n, "outputLen"), !(0 < e && e < 200)) throw Error("only keccak-f1600 function is supported");
		this.state = /* @__PURE__ */ new Uint8Array(200), this.state32 = He(this.state);
	}
	clone() {
		return this._cloneInto();
	}
	keccak() {
		Je(this.state32), pa(this.state32, this.rounds), Je(this.state32), this.posOut = 0, this.pos = 0;
	}
	update(e) {
		Be(this), ze(e);
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
		Be(this, !1), ze(e), this.finish();
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
		return Re(e), this.xofInto(new Uint8Array(e));
	}
	digestInto(e) {
		if (Ve(e, this), this.finished) throw Error("digest() was already called");
		this.writeInto(e.subarray(0, this.outputLen)), this.destroy();
	}
	digest() {
		let e = new Uint8Array(this.outputLen);
		return this.digestInto(e), e;
	}
	destroy() {
		this.destroyed = !0, Ue(this.state);
	}
	_cloneInto(t) {
		let { blockLen: n, suffix: r, outputLen: i, rounds: a, enableXOF: o } = this;
		return t ||= new e(n, r, i, o, a), t.blockLen = n, t.state32.set(this.state32), t.pos = this.pos, t.posOut = this.posOut, t.finished = this.finished, t.rounds = a, t.suffix = r, t.outputLen = i, t.enableXOF = o, t.canXOF = this.canXOF, t.destroyed = this.destroyed, t;
	}
}, ha = /* @__PURE__ */ ((e, t, n, r = {}) => Ye(() => new ma(t, e, n), r))(1, 136, 32), ga = 0, _a = 1, va = class {
	constructor(e) {
		this.G1 = e.G1, this.Fr = e.Fr, this.reset();
	}
	reset() {
		this.data = [];
	}
	addPolCommitment(e) {
		this.data.push({
			type: ga,
			data: e
		});
	}
	addScalar(e) {
		this.data.push({
			type: _a,
			data: e
		});
	}
	getChallenge() {
		if (this.data.length === 0) throw Error("Keccak256Transcript: No data to generate a transcript");
		let e = 0, t = 0;
		this.data.forEach((n) => ga === n.type ? e++ : t++);
		let n = new Uint8Array(t * this.Fr.n8 + e * this.G1.F.n8 * 2), i = 0;
		for (let e = 0; e < this.data.length; e++) ga === this.data[e].type ? (this.G1.toRprUncompressed(n, i, this.data[e].data), i += this.G1.F.n8 * 2) : (this.Fr.toRprBE(n, i, this.data[e].data), i += this.Fr.n8);
		let a = r.fromRprBE(ha(n));
		return this.Fr.e(a);
	}
}, ya = class {
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
}, X = class t {
	constructor(e, t, n) {
		this.coef = e, this.curve = t, this.Fr = t.Fr, this.G1 = t.G1, this.logger = n;
	}
	static async fromEvaluations(e, n, r) {
		let i = await n.Fr.ifft(e);
		return new t(i, n, r);
	}
	static fromCoefficientsArray(n, r, i) {
		let a = r.Fr, o = n.length > 32768 ? new e(n.length * a.n8) : new Uint8Array(n.length * a.n8);
		for (let e = 0; e < n.length; e++) o.set(n[e], e * a.n8);
		return new t(o, r, i);
	}
	static fromPolynomial(n, r, i) {
		let a = n.length(), o = r.Fr, s = a > 32768 ? new e(a * o.n8) : new Uint8Array(a * o.n8);
		return s.set(n.coef.slice(), 0), new t(s, r, i);
	}
	isEqual(e) {
		let t = this.degree();
		if (t !== e.degree()) return !1;
		for (let n = 0; n < t + 1; n++) if (!this.Fr.eq(this.getCoef(n), e.getCoef(n))) return !1;
		return !0;
	}
	blindCoefficients(t) {
		t ||= [];
		let n = this.length() + t.length > 32768 ? new e((this.length() + t.length) * this.Fr.n8) : new Uint8Array((this.length() + t.length) * this.Fr.n8);
		n.set(this.coef, 0);
		for (let e = 0; e < t.length; e++) n.set(this.Fr.add(n.slice((this.length() + e) * this.Fr.n8, (this.length() + e + 1) * this.Fr.n8), t[e]), (this.length() + e) * this.Fr.n8), n.set(this.Fr.sub(n.slice(e * this.Fr.n8, (e + 1) * this.Fr.n8), t[e]), e * this.Fr.n8);
		this.coef = n;
	}
	getCoef(e) {
		let t = e * this.Fr.n8;
		return t + this.Fr.n8 > this.coef.byteLength ? this.Fr.zero : this.coef.slice(t, t + this.Fr.n8);
	}
	setCoef(e, t) {
		if (e > this.length() - 1) throw Error("Coef index is not available");
		this.coef.set(t, e * this.Fr.n8);
	}
	static async to4T(t, n, r, i) {
		r ||= [];
		let a = await i.ifft(t), o = n * 4 > 32768 ? new e(n * 4 * i.n8) : new Uint8Array(n * 4 * i.n8);
		o.set(a, 0);
		let s = await i.fft(o);
		if (r.length === 0) return [a, s];
		let c = n + r.length > 32768 ? new e((n + r.length) * i.n8) : new Uint8Array((n + r.length) * i.n8);
		c.set(a, 0);
		for (let e = 0; e < r.length; e++) c.set(i.add(c.slice((n + e) * i.n8, (n + e + 1) * i.n8), r[e]), (n + e) * i.n8), c.set(i.sub(c.slice(e * i.n8, (e + 1) * i.n8), r[e]), e * i.n8);
		return [c, s];
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
		/* c8 ignore start */
		let t = this.length() === 0 ? this.Fr.zero : this.coef.slice(0, this.Fr.n8);
		/* c8 ignore stop */
		this.coef.set(this.Fr.add(t, e), 0);
	}
	subScalar(e) {
		/* c8 ignore start */
		let t = this.length() === 0 ? this.Fr.zero : this.coef.slice(0, this.Fr.n8);
		/* c8 ignore stop */
		this.coef.set(this.Fr.sub(t, e), 0);
	}
	byXSubValue(n) {
		let r = this.Fr, i = r.eq(r.zero, this.getCoef(this.length() - 1)) ? this.length() : this.length() + 1, a = i > 32768 ? new e(i * r.n8) : new Uint8Array(i * r.n8), o = new t(a, this.curve, this.logger);
		o.coef.set(this.coef.slice(0, (i - 1) * r.n8), 32), this.mulScalar(r.neg(n)), o.add(this), this.coef = o.coef;
	}
	byXNSubValue(n, r) {
		let i = this.Fr, a = this.length() - n - 1 >= this.degree() ? this.length() : this.length() + n, o = a > 32768 ? new e(a * i.n8) : new Uint8Array(a * i.n8), s = new t(o, this.curve, this.logger);
		s.coef.set(this.coef.slice(0, (this.degree() + 1) * 32), n * 32), this.mulScalar(r), s.add(this), this.coef = s.coef;
	}
	divBy(n) {
		let r = this.Fr, i = this.degree(), a = n.degree(), o = new t(this.coef, this.curve, this.logger);
		this.coef = this.length() > 32768 ? new e(this.length() * r.n8) : new Uint8Array(this.length() * r.n8);
		for (let e = i - a; e >= 0; e--) {
			this.setCoef(e, r.div(o.getCoef(e + a), n.getCoef(a)));
			for (let t = 0; t <= a; t++) o.setCoef(e + t, r.sub(o.getCoef(e + t), r.mul(this.getCoef(e), n.getCoef(t))));
		}
		return o;
	}
	divByMonic(n, r) {
		let i = this.Fr, a = this.degree(), o = this.length() > 32768 ? new e(this.length() * i.n8) : new Uint8Array(this.length() * i.n8), s = new t(o, this.curve, this.logger), c = [];
		for (let e = 0; e < n; e++) s.setCoef(a - e - n, this.getCoef(a - e)), c[e] = this.getCoef(a - e);
		let l = n, u = 0;
		for (let e = 0; e < l; e++) for (let t = a - 2 * n - e; t >= 0 && !(t < 0); t -= l) {
			/* c8 ignore stop */
			let a = e;
			c[a] = i.add(this.getCoef(t + n), i.mul(c[a], r)), s.setCoef(t, c[a]), u = (u + 1) % n;
		}
		this.coef = s.coef;
	}
	divByVanishing(n, r) {
		if (this.degree() < n) throw Error("divByVanishing polynomial divisor must be of degree lower than the dividend polynomial");
		let i = this.Fr, a = new t(this.coef, this.curve, this.logger);
		this.coef = this.length() > 32768 ? new e(this.length() * i.n8) : new Uint8Array(this.length() * i.n8);
		for (let e = this.length() - 1; e >= n; e--) {
			let t = a.getCoef(e);
			i.eq(i.zero, t) || (a.setCoef(e, i.zero), a.setCoef(e - n, i.add(a.getCoef(e - n), i.mul(r, t))), this.setCoef(e - n, i.add(this.getCoef(e - n), t)));
		}
		return a;
	}
	fastDivByVanishing(n) {
		let r = this.Fr;
		for (let i = 0; i < n.length; i++) {
			let a = n[i][0], o = n[i][1];
			if (this.degree() < a) throw Error("divByVanishing polynomial divisor must be of degree lower than the dividend polynomial");
			let s = this.length() - a, c = Math.floor(s / 5 / a), l = c * a, u = s - 5 * l, d = new t(this.length() > 32768 ? new e(this.length() * r.n8) : new Uint8Array(this.length() * r.n8), this.curve, this.logger), f = this.coef;
			this.coef = d.coef, d.coef = f;
			for (let e = 0; e < 5; e++) {
				let t = (e + 1) * l + u;
				for (let e = 0; e < a; e++) this.setCoef(t + e - a, d.getCoef(t + e));
				for (let e = 0; e < l - a; e++) {
					let n = t - e - 1, i = r.add(d.getCoef(n), r.mul(o, this.getCoef(n)));
					this.setCoef(n - a, i);
				}
			}
			let p = u, m = u;
			for (let e = 0; e < a && m; e++) this.setCoef(p - e - 1, d.getCoef(p + a - e - 1)), m--;
			for (let e = 0; e < m; e++) {
				let t = p - e - 1, n = r.add(d.getCoef(t), r.mul(o, this.getCoef(t)));
				this.setCoef(t - a, n);
			}
			let h = [], g = r.one;
			for (let e = 0; e < c; e++) g = r.mul(g, o);
			let _ = r.one;
			for (let e = 5; e > 0; e--) {
				let t = e - 1, n = t * l + u;
				h[t] = [];
				for (let i = 0; i < a; i++) h[t][i] = this.getCoef(n + i), e !== 5 && (h[t][i] = r.add(h[t][i], r.mul(g, h[t + 1][i])));
				_ = r.mul(_, g);
			}
			for (let e = 0; e < 5; e++) {
				let t = e * l + u, n = o, i = a - 1, s = e === 0 ? u : l;
				for (let c = 0; c < s; c++) {
					let s = t - c - 1, l = r.add(this.getCoef(s), r.mul(n, h[e][i]));
					this.setCoef(s, l), i === 0 ? (i = a - 1, n = r.mul(n, o)) : i--;
				}
			}
		}
	}
	divByXSubValue(t) {
		let n = this.length() > 32768 ? new e(this.length() * this.Fr.n8) : new Uint8Array(this.length() * this.Fr.n8);
		n.set(this.Fr.zero, (this.length() - 1) * this.Fr.n8), n.set(this.coef.slice((this.length() - 1) * this.Fr.n8, this.length() * this.Fr.n8), (this.length() - 2) * this.Fr.n8);
		for (let e = this.length() - 3; e >= 0; e--) {
			let r = e * this.Fr.n8;
			n.set(this.Fr.add(this.coef.slice(r + this.Fr.n8, r + 2 * this.Fr.n8), this.Fr.mul(t, n.slice(r + this.Fr.n8, r + 2 * this.Fr.n8))), e * this.Fr.n8);
		}
		if (!this.Fr.eq(this.coef.slice(0, this.Fr.n8), this.Fr.mul(this.Fr.neg(t), n.slice(0, this.Fr.n8)))) throw Error("Polynomial does not divide");
		this.coef = n;
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
		let t = this.length() + 1 > 32768 ? new e(this.coef.byteLength + this.Fr.n8) : new Uint8Array(this.coef.byteLength + this.Fr.n8);
		t.set(this.Fr.zero, 0), t.set(this.coef, this.Fr.n8), this.coef = t;
	}
	static async expX(n, r, i = !1) {
		let a = n.Fr;
		if (r < 1) throw Error("Compute a new polynomial to a zero or negative number is not allowed");
		if (r === 1) return t.fromPolynomial(n, n.curve, n.logger);
		let o = i ? n.degree() : n.length() - 1, s = o * r + 1 > 32768 ? new e((o * r + 1) * a.n8) : new Uint8Array((o * r + 1) * a.n8);
		s.set(n.getCoef(0), 0);
		for (let e = 1; e <= o; e++) {
			let t = e * a.n8, i = n.getCoef(e);
			s.set(i, t * r);
		}
		return new t(s, n.curve, n.logger);
	}
	split(n, r, i) {
		if (n < 1) throw Error(`Polynomials can't be split in ${n} parts`);
		if (n === 1) return [this];
		if (i.length !== 0 && i.length < n - 1) throw Error(`Blinding factors length must be ${n - 1}`);
		let a = (r + 1) * this.Fr.n8, o = [], s = Math.ceil((this.degree() + 1) * this.Fr.n8 / a);
		if (s < n) for (let e = s; e < n; e++) o[e] = new t(new Uint8Array(this.Fr.n8), this.curve, this.logger);
		n = Math.min(n, s);
		for (let r = 0; r < n; r++) {
			let s = n - 1 === r, c = s ? this.coef.byteLength - (n - 1) * a : a + this.Fr.n8, l = c / this.Fr.n8 > 32768 ? new e(c) : new Uint8Array(c);
			/* c8 ignore stop */
			o[r] = new t(l, this.curve, this.logger);
			let u = r * a, d = s ? this.coef.byteLength : (r + 1) * a;
			if (o[r].coef.set(this.coef.slice(u, d), 0), s || o[r].coef.set(i[r], a), r !== 0) {
				let e = this.Fr.sub(o[r].coef.slice(0, this.Fr.n8), i[r - 1]);
				o[r].coef.set(e, 0);
			}
			s && o[r].truncate();
		}
		return o;
	}
	truncate() {
		let t = this.degree();
		if (t + 1 < this.coef.byteLength / this.Fr.n8) {
			/* c8 ignore start */
			let n = t + 1 > 32768 ? 
			/* c8 ignore stop */
			new e((t + 1) * this.Fr.n8) : new Uint8Array((t + 1) * this.Fr.n8);
			n.set(this.coef.slice(0, (t + 1) * this.Fr.n8), 0), this.coef = n;
		}
	}
	static lagrangePolynomialInterpolation(n, r, i) {
		let a = i.Fr, o = s(0);
		for (let e = 1; e < n.length; e++) o.add(s(e));
		return o;
		function s(o) {
			let s;
			for (let r = 0; r < n.length; r++) if (r !== o) {
				if (s === void 0) {
					/* c8 ignore start */
					let o = n.length > 32768 ? 
					/* c8 ignore stop */
					new e(n.length * a.n8) : new Uint8Array(n.length * a.n8);
					s = new t(o, i), s.setCoef(0, a.neg(n[r])), s.setCoef(1, a.one);
				} else s.byXSubValue(n[r]);
			}
			let c = s.evaluate(n[o]);
			c = a.inv(c);
			let l = a.mul(r[o], c);
			return s.mulScalar(l), s;
		}
	}
	static zerofierPolynomial(n, r) {
		let i = r.Fr, a = n.length + 1 > 32768 ? 
		/* c8 ignore stop */
		new e((n.length + 1) * i.n8) : new Uint8Array((n.length + 1) * i.n8), o = new t(a, r);
		o.setCoef(0, i.neg(n[0])), o.setCoef(1, i.one);
		for (let e = 1; e < n.length; e++) o.byXSubValue(n[e]);
		return o;
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
}, Z = class t {
	constructor(e, t, n) {
		this.eval = e, this.curve = t, this.Fr = t.Fr, this.logger = n;
	}
	static async fromPolynomial(n, r, i, a) {
		let o = new e(n.length() * r * i.Fr.n8);
		o.set(n.coef, 0);
		let s = await i.Fr.fft(o);
		return new t(s, i, a);
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
}, { stringifyBigInts: ba } = s;
async function xa(t, n, i, a) {
	let o, s, c, l;
	try {
		({fd: o, sections: s} = await I(n, "wtns", 2, 1 << 25, 1 << 23)), i && i.debug("> Reading witness file");
		let u = await nn(o, s);
		i && i.debug("> Reading zkey file"), {fd: c, sections: l} = await I(t, "zkey", 2, 1 << 25, 1 << 23);
		let d = await Ht(c, l, void 0, a);
		if (d.protocol != "plonk") throw Error("zkey file is not plonk");
		if (!r.eq(d.r, u.q)) throw Error("Curve of the witness does not match the curve of the proving key");
		if (u.nWitness != d.nVars - d.nAdditions) throw Error(`Invalid witness length. Circuit: ${d.nVars}, witness: ${u.nWitness}, ${d.nAdditions}`);
		let f = d.curve, p = f.Fr, m = f.Fr.n8, h = d.domainSize * m;
		i && (i.debug("----------------------------"), i.debug("  PLONK PROVE SETTINGS"), i.debug(`  Curve:         ${f.name}`), i.debug(`  Circuit power: ${d.power}`), i.debug(`  Domain size:   ${d.domainSize}`), i.debug(`  Vars:          ${d.nVars}`), i.debug(`  Public vars:   ${d.nPublic}`), i.debug(`  Constraints:   ${d.nConstraints}`), i.debug(`  Additions:     ${d.nAdditions}`), i.debug("----------------------------")), i && i.debug("> Reading witness file data");
		let g = await H(o, s, 2);
		g.set(p.zero, 0);
		let _ = new e(m * d.nAdditions), v = {}, y = {}, b = {}, x = {}, S = new Qi(f, i), C = new va(f);
		i && i.debug("> Reading Section 3. Additions"), await D(), i && i.debug("> Reading Section 12. Sigma1, Sigma2 & Sigma 3"), i && i.debug("··· Reading Sigma polynomials "), y.Sigma1 = new X(new e(h), f, i), y.Sigma2 = new X(new e(h), f, i), y.Sigma3 = new X(new e(h), f, i), await c.readToBuffer(y.Sigma1.coef, 0, h, l[12][0].p), await c.readToBuffer(y.Sigma2.coef, 0, h, l[12][0].p + 5 * h), await c.readToBuffer(y.Sigma3.coef, 0, h, l[12][0].p + 10 * h), i && i.debug("··· Reading Sigma evaluations"), b.Sigma1 = new Z(new e(h * 4), f, i), b.Sigma2 = new Z(new e(h * 4), f, i), b.Sigma3 = new Z(new e(h * 4), f, i), await c.readToBuffer(b.Sigma1.eval, 0, h * 4, l[12][0].p + h), await c.readToBuffer(b.Sigma2.eval, 0, h * 4, l[12][0].p + 6 * h), await c.readToBuffer(b.Sigma3.eval, 0, h * 4, l[12][0].p + 11 * h), i && i.debug("> Reading Section 14. Powers of Tau");
		let w = await H(c, l, 14), T = [];
		for (let e = 1; e <= d.nPublic; e++) {
			let t = g.slice(e * p.n8, e * p.n8 + p.n8);
			T.push(r.fromRprLE(t));
		}
		i && i.debug(""), i && i.debug("> ROUND 1"), await A(), i && i.debug("> ROUND 2"), await M(), i && i.debug("> ROUND 3"), await P(), i && i.debug("> ROUND 4"), await ee(), i && i.debug("> ROUND 5"), await te(), await c.close(), await o.close();
		let E = S.toObjectProof(!1);
		return E.protocol = "plonk", E.curve = f.name, i && i.debug("PLONK PROVER FINISHED"), {
			proof: ba(E),
			publicSignals: ba(T)
		};
		async function D() {
			i && i.debug("··· Computing additions");
			let e = await H(c, l, 3), t = 8 + m * 2;
			for (let n = 0; n < d.nAdditions; n++) {
				/* c8 ignore start */
				i && n !== 0 && n % 1e5 == 0 && i.debug(`    addition ${n}/${d.nAdditions}`);
				/* c8 ignore stop */
				let r = n * t, a = O(e, r);
				r += 4;
				let o = O(e, r);
				r += 4;
				let s = e.slice(r, r + m);
				r += m;
				let c = e.slice(r, r + m), l = k(a), u = k(o), f = p.add(p.mul(s, l), p.mul(c, u));
				_.set(f, m * n);
			}
		}
		function O(e, t) {
			let n = e.slice(t, t + 4);
			return new DataView(n.buffer, n.byteOffset, n.byteLength).getUint32(0, !0);
		}
		function k(e) {
			return e < d.nVars - d.nAdditions ? g.slice(e * m, e * m + m) : e < d.nVars ? _.slice((e - (d.nVars - d.nAdditions)) * m, (e - (d.nVars - d.nAdditions)) * m + m) : f.Fr.zero;
		}
		async function A() {
			x.b = [];
			for (let e = 1; e <= 11; e++) x.b[e] = f.Fr.random();
			i && i.debug("> Computing A, B, C wire polynomials"), await j(), i && i.debug("> Computing A, B, C MSM");
			let e = await y.A.multiExponentiation(w, "A"), t = await y.B.multiExponentiation(w, "B"), n = await y.C.multiExponentiation(w, "C");
			return S.addPolynomial("A", e), S.addPolynomial("B", t), S.addPolynomial("C", n), 0;
		}
		async function j() {
			i && i.debug("··· Reading data from zkey file"), v.A = new e(h), v.B = new e(h), v.C = new e(h);
			let t = await H(c, l, 4), n = await H(c, l, 5), r = await H(c, l, 6);
			for (let e = 0; e < d.nConstraints; e++) {
				let i = e * m, a = e * 4, o = O(t, a);
				v.A.set(k(o), i);
				let s = O(n, a);
				v.B.set(k(s), i);
				let c = O(r, a);
				v.C.set(k(c), i);
			}
			/* c8 ignore start */
			if (v.A = await p.batchToMontgomery(v.A), v.B = await p.batchToMontgomery(v.B), v.C = await p.batchToMontgomery(v.C), i && i.debug("··· Computing A ifft"), y.A = await X.fromEvaluations(v.A, f, i), i && i.debug("··· Computing B ifft"), y.B = await X.fromEvaluations(v.B, f, i), i && i.debug("··· Computing C ifft"), y.C = await X.fromEvaluations(v.C, f, i), i && i.debug("··· Computing A fft"), b.A = await Z.fromPolynomial(y.A, 4, f, i), i && i.debug("··· Computing B fft"), b.B = await Z.fromPolynomial(y.B, 4, f, i), i && i.debug("··· Computing C fft"), b.C = await Z.fromPolynomial(y.C, 4, f, i), y.A.blindCoefficients([x.b[2], x.b[1]]), y.B.blindCoefficients([x.b[4], x.b[3]]), y.C.blindCoefficients([x.b[6], x.b[5]]), y.A.degree() >= d.domainSize + 2) throw Error("A Polynomial is not well calculated");
			/* c8 ignore stop */
			/* c8 ignore start */
			if (y.B.degree() >= d.domainSize + 2) throw Error("B Polynomial is not well calculated");
			/* c8 ignore stop */
			/* c8 ignore start */
			if (y.C.degree() >= d.domainSize + 2) throw Error("C Polynomial is not well calculated");
			/* c8 ignore stop */
		}
		async function M() {
			i && i.debug("> Computing challenges beta and gamma"), C.reset(), C.addPolCommitment(d.Qm), C.addPolCommitment(d.Ql), C.addPolCommitment(d.Qr), C.addPolCommitment(d.Qo), C.addPolCommitment(d.Qc), C.addPolCommitment(d.S1), C.addPolCommitment(d.S2), C.addPolCommitment(d.S3);
			for (let e = 0; e < d.nPublic; e++) C.addScalar(v.A.slice(e * m, e * m + m));
			C.addPolCommitment(S.getPolynomial("A")), C.addPolCommitment(S.getPolynomial("B")), C.addPolCommitment(S.getPolynomial("C")), x.beta = C.getChallenge(), i && i.debug("··· challenges.beta: " + p.toString(x.beta, 16)), C.reset(), C.addScalar(x.beta), x.gamma = C.getChallenge(), i && i.debug("··· challenges.gamma: " + p.toString(x.gamma, 16)), i && i.debug("> Computing Z polynomial"), await N(), i && i.debug("> Computing Z MSM");
			let e = await y.Z.multiExponentiation(w, "Z");
			S.addPolynomial("Z", e);
		}
		async function N() {
			i && i.debug("··· Computing Z evaluations");
			let t = new e(h), n = new e(h);
			t.set(p.one, 0), n.set(p.one, 0);
			let r = p.one;
			for (let e = 0; e < d.domainSize; e++) {
				let i = e * m, a = v.A.slice(i, i + m), o = v.B.slice(i, i + m), s = v.C.slice(i, i + m), c = p.mul(x.beta, r), l = p.add(a, c);
				l = p.add(l, x.gamma);
				let u = p.add(o, p.mul(d.k1, c));
				u = p.add(u, x.gamma);
				let f = p.add(s, p.mul(d.k2, c));
				f = p.add(f, x.gamma);
				let h = p.mul(l, p.mul(u, f)), g = p.add(a, p.mul(b.Sigma1.getEvaluation(e * 4), x.beta));
				g = p.add(g, x.gamma);
				let _ = p.add(o, p.mul(b.Sigma2.getEvaluation(e * 4), x.beta));
				_ = p.add(_, x.gamma);
				let y = p.add(s, p.mul(b.Sigma3.getEvaluation(e * 4), x.beta));
				y = p.add(y, x.gamma);
				let S = p.mul(g, p.mul(_, y));
				h = p.mul(t.slice(i, i + m), h), t.set(h, (e + 1) % d.domainSize * m), S = p.mul(n.slice(i, i + m), S), n.set(S, (e + 1) % d.domainSize * m), r = p.mul(r, p.w[d.power]);
			}
			n = await p.batchInverse(n);
			for (let e = 0; e < d.domainSize; e++) {
				let r = e * m, i = p.mul(t.slice(r, r + m), n.slice(r, r + m));
				t.set(i, r);
			}
			/* c8 ignore start */
			if (v.Z = t, !p.eq(t.slice(0, m), p.one)) throw Error("Copy constraints does not match");
			/* c8 ignore start */
			if (i && i.debug("··· Computing Z ifft"), y.Z = await X.fromEvaluations(v.Z, f, i), i && i.debug("··· Computing Z fft"), b.Z = await Z.fromPolynomial(y.Z, 4, f, i), y.Z.blindCoefficients([
				x.b[9],
				x.b[8],
				x.b[7]
			]), y.Z.degree() >= d.domainSize + 3) throw Error("Z Polynomial is not well calculated");
			/* c8 ignore stop */
			delete v.Z;
		}
		async function P() {
			i && i.debug("> Computing challenge alpha"), C.reset(), C.addScalar(x.beta), C.addScalar(x.gamma), C.addPolCommitment(S.getPolynomial("Z")), x.alpha = C.getChallenge(), x.alpha2 = p.square(x.alpha), i && i.debug("··· challenges.alpha: " + p.toString(x.alpha, 16)), i && i.debug("> Computing T polynomial"), await F(), i && i.debug("> Computing T MSM");
			let e = await y.T1.multiExponentiation(w, "T1"), t = await y.T2.multiExponentiation(w, "T2"), n = await y.T3.multiExponentiation(w, "T3");
			S.addPolynomial("T1", e), S.addPolynomial("T2", t), S.addPolynomial("T3", n);
		}
		async function F() {
			i && i.debug("··· Reading sections 8, 9, 7, 10, 11. Q selectors"), b.QL = new Z(new e(h * 4), f, i), b.QR = new Z(new e(h * 4), f, i), b.QM = new Z(new e(h * 4), f, i), b.QO = new Z(new e(h * 4), f, i), b.QC = new Z(new e(h * 4), f, i), await c.readToBuffer(b.QL.eval, 0, h * 4, l[8][0].p + h), await c.readToBuffer(b.QR.eval, 0, h * 4, l[9][0].p + h), await c.readToBuffer(b.QM.eval, 0, h * 4, l[7][0].p + h), await c.readToBuffer(b.QO.eval, 0, h * 4, l[10][0].p + h), await c.readToBuffer(b.QC.eval, 0, h * 4, l[11][0].p + h), b.Lagrange = new Z(new e(h * 4 * d.nPublic), f, i);
			for (let e = 0; e < d.nPublic; e++) await c.readToBuffer(b.Lagrange.eval, e * h * 4, h * 4, l[13][0].p + e * 5 * h + h);
			v.T = new e(h * 4), v.Tz = new e(h * 4), i && i.debug("··· Computing T evaluations");
			let t = p.one;
			for (let e = 0; e < d.domainSize * 4; e++) {
				i && e !== 0 && e % 1e5 == 0 && 
				/* c8 ignore start */
				i.debug(`      T evaluation ${e}/${d.domainSize * 4}`);
				/* c8 ignore stop */
				let n = b.A.getEvaluation(e), r = b.B.getEvaluation(e), a = b.C.getEvaluation(e), o = b.Z.getEvaluation(e), s = b.Z.getEvaluation((d.domainSize * 4 + 4 + e) % (d.domainSize * 4)), c = b.QM.getEvaluation(e), l = b.QL.getEvaluation(e), u = b.QR.getEvaluation(e), f = b.QO.getEvaluation(e), h = b.QC.getEvaluation(e), g = b.Sigma1.getEvaluation(e), _ = b.Sigma2.getEvaluation(e), y = b.Sigma3.getEvaluation(e), S = p.add(x.b[2], p.mul(x.b[1], t)), C = p.add(x.b[4], p.mul(x.b[3], t)), w = p.add(x.b[6], p.mul(x.b[5], t)), T = p.square(t), E = p.add(p.add(p.mul(x.b[7], T), p.mul(x.b[8], t)), x.b[9]), D = p.mul(t, p.w[d.power]), O = p.square(D), k = p.add(p.add(p.mul(x.b[7], O), p.mul(x.b[8], D)), x.b[9]), A = p.zero;
				for (let t = 0; t < d.nPublic; t++) {
					let n = t * 4 * d.domainSize + e, r = b.Lagrange.getEvaluation(n), i = v.A.slice(t * m, (t + 1) * m);
					A = p.sub(A, p.mul(r, i));
				}
				let [j, M] = ya.mul2(n, r, S, C, e % 4, p);
				j = p.mul(j, c), M = p.mul(M, c), j = p.add(j, p.mul(n, l)), M = p.add(M, p.mul(S, l)), j = p.add(j, p.mul(r, u)), M = p.add(M, p.mul(C, u)), j = p.add(j, p.mul(a, f)), M = p.add(M, p.mul(w, f)), j = p.add(j, A), j = p.add(j, h);
				let N = p.mul(x.beta, t), P = n;
				P = p.add(P, N), P = p.add(P, x.gamma);
				let F = r;
				F = p.add(F, p.mul(N, d.k1)), F = p.add(F, x.gamma);
				let ee = a;
				ee = p.add(ee, p.mul(N, d.k2)), ee = p.add(ee, x.gamma);
				let te = o, [ne, re] = ya.mul4(P, F, ee, te, S, C, w, E, e % 4, p);
				ne = p.mul(ne, x.alpha), re = p.mul(re, x.alpha);
				let ie = n;
				ie = p.add(ie, p.mul(x.beta, g)), ie = p.add(ie, x.gamma);
				let ae = r;
				ae = p.add(ae, p.mul(x.beta, _)), ae = p.add(ae, x.gamma);
				let oe = a;
				oe = p.add(oe, p.mul(x.beta, y)), oe = p.add(oe, x.gamma);
				let se = s, [ce, le] = ya.mul4(ie, ae, oe, se, S, C, w, k, e % 4, p);
				ce = p.mul(ce, x.alpha), le = p.mul(le, x.alpha);
				let ue = p.sub(o, p.one);
				ue = p.mul(ue, b.Lagrange.getEvaluation(e)), ue = p.mul(ue, x.alpha2);
				let de = p.mul(E, b.Lagrange.getEvaluation(e));
				de = p.mul(de, x.alpha2);
				let fe = p.add(p.sub(p.add(j, ne), ce), ue), pe = p.add(p.sub(p.add(M, re), le), de);
				v.T.set(fe, e * m), v.Tz.set(pe, e * m), t = p.mul(t, p.w[d.power + 2]);
			}
			/* c8 ignore start */
			if (i && i.debug("··· Computing T ifft"), y.T = await X.fromEvaluations(v.T, f, i), i && i.debug("··· Computing T / ZH"), y.T.divZh(d.domainSize, 4), i && i.debug("··· Computing Tz ifft"), y.Tz = await X.fromEvaluations(v.Tz, f, i), y.T.add(y.Tz), y.T.degree() >= d.domainSize * 3 + 6) throw Error("T Polynomial is not well calculated");
			i && i.debug("··· Computing T1, T2, T3 polynomials"), y.T1 = new X(new e((d.domainSize + 1) * m), f, i), y.T2 = new X(new e((d.domainSize + 1) * m), f, i), y.T3 = new X(new e((d.domainSize + 6) * m), f, i), y.T1.coef.set(y.T.coef.slice(0, h), 0), y.T2.coef.set(y.T.coef.slice(h, h * 2), 0), y.T3.coef.set(y.T.coef.slice(h * 2, h * 3 + 6 * m), 0), y.T1.setCoef(d.domainSize, x.b[10]);
			let n = p.sub(y.T2.getCoef(0), x.b[10]);
			y.T2.setCoef(0, n), y.T2.setCoef(d.domainSize, x.b[11]);
			let r = p.sub(y.T3.getCoef(0), x.b[11]);
			y.T3.setCoef(0, r);
		}
		async function ee() {
			i && i.debug("> Computing challenge xi"), C.reset(), C.addScalar(x.alpha), C.addPolCommitment(S.getPolynomial("T1")), C.addPolCommitment(S.getPolynomial("T2")), C.addPolCommitment(S.getPolynomial("T3")), x.xi = C.getChallenge(), x.xiw = p.mul(x.xi, p.w[d.power]), i && i.debug("··· challenges.xi: " + p.toString(x.xi, 16)), S.addEvaluation("eval_a", y.A.evaluate(x.xi)), S.addEvaluation("eval_b", y.B.evaluate(x.xi)), S.addEvaluation("eval_c", y.C.evaluate(x.xi)), S.addEvaluation("eval_s1", y.Sigma1.evaluate(x.xi)), S.addEvaluation("eval_s2", y.Sigma2.evaluate(x.xi)), S.addEvaluation("eval_zw", y.Z.evaluate(x.xiw));
		}
		async function te() {
			i && i.debug("> Computing challenge v"), C.reset(), C.addScalar(x.xi), C.addScalar(S.getEvaluation("eval_a")), C.addScalar(S.getEvaluation("eval_b")), C.addScalar(S.getEvaluation("eval_c")), C.addScalar(S.getEvaluation("eval_s1")), C.addScalar(S.getEvaluation("eval_s2")), C.addScalar(S.getEvaluation("eval_zw")), x.v = [], x.v[1] = C.getChallenge(), i && i.debug("··· challenges.v: " + p.toString(x.v[1], 16));
			for (let e = 2; e < 6; e++) x.v[e] = p.mul(x.v[e - 1], x.v[1]);
			i && i.debug("> Computing linearisation polynomial R(X)"), await ne(), i && i.debug("> Computing opening proof polynomial Wxi(X) polynomial"), re(), i && i.debug("> Computing opening proof polynomial Wxiw(X) polynomial"), ie(), i && i.debug("> Computing Wxi, Wxiw MSM");
			let e = await y.Wxi.multiExponentiation(w, "Wxi"), t = await y.Wxiw.multiExponentiation(w, "Wxiw");
			S.addPolynomial("Wxi", e), S.addPolynomial("Wxiw", t);
		}
		async function ne() {
			let t = f.Fr;
			y.QL = new X(new e(h), f, i), y.QR = new X(new e(h), f, i), y.QM = new X(new e(h), f, i), y.QO = new X(new e(h), f, i), y.QC = new X(new e(h), f, i), await c.readToBuffer(y.QL.coef, 0, h, l[8][0].p), await c.readToBuffer(y.QR.coef, 0, h, l[9][0].p), await c.readToBuffer(y.QM.coef, 0, h, l[7][0].p), await c.readToBuffer(y.QO.coef, 0, h, l[10][0].p), await c.readToBuffer(y.QC.coef, 0, h, l[11][0].p), x.xin = x.xi;
			for (let e = 0; e < d.power; e++) x.xin = t.square(x.xin);
			x.zh = t.sub(x.xin, t.one);
			let n = [], r = t.e(d.domainSize), a = t.one;
			for (let e = 1; e <= Math.max(1, d.nPublic); e++) n[e] = t.div(t.mul(a, x.zh), t.mul(r, t.sub(x.xi, a))), a = t.mul(a, t.w[d.power]);
			let o = t.div(t.sub(x.xin, t.one), t.mul(r, t.sub(x.xi, t.one)));
			if (i) {
				i.debug("Lagrange Evaluations: ");
				for (let e = 1; e < n.length; e++) i.debug(`L${e}(xi)=` + t.toString(n[e], 16));
			}
			let s = t.zero;
			for (let e = 0; e < T.length; e++) {
				let r = t.e(T[e]);
				s = t.sub(s, t.mul(r, n[e + 1]));
			}
			i && i.debug("PI: " + t.toString(s, 16));
			let u = t.mul(S.evaluations.eval_a, S.evaluations.eval_b), p = S.evaluations.eval_a, g = t.mul(x.beta, x.xi);
			p = t.add(p, g), p = t.add(p, x.gamma);
			let _ = S.evaluations.eval_b;
			_ = t.add(_, t.mul(g, d.k1)), _ = t.add(_, x.gamma);
			let v = S.evaluations.eval_c;
			v = t.add(v, t.mul(g, d.k2)), v = t.add(v, x.gamma);
			let b = t.mul(t.mul(t.mul(p, _), v), x.alpha), C = S.evaluations.eval_a;
			C = t.add(C, t.mul(x.beta, S.evaluations.eval_s1)), C = t.add(C, x.gamma);
			let w = S.evaluations.eval_b;
			w = t.add(w, t.mul(x.beta, S.evaluations.eval_s2)), w = t.add(w, x.gamma);
			let E = t.mul(C, w);
			E = t.mul(E, S.evaluations.eval_zw), E = t.mul(E, x.alpha);
			let D = t.mul(o, x.alpha2);
			y.R = new X(new e((d.domainSize + 6) * m), f, i), y.R.add(y.QM, u), y.R.add(y.QL, S.evaluations.eval_a), y.R.add(y.QR, S.evaluations.eval_b), y.R.add(y.QO, S.evaluations.eval_c), y.R.add(y.QC), y.R.add(y.Z, b), y.R.sub(y.Sigma3, t.mul(E, x.beta)), y.R.add(y.Z, D);
			let O = X.fromPolynomial(y.T3, f, i);
			O.mulScalar(t.square(x.xin)), O.add(y.T2, x.xin), O.add(y.T1), O.mulScalar(x.zh), y.R.sub(O);
			let k = t.sub(s, t.mul(E, t.add(S.evaluations.eval_c, x.gamma)));
			k = t.sub(k, D), i && i.debug("r0: " + t.toString(k, 16)), y.R.addScalar(k);
		}
		function re() {
			y.Wxi = new X(new e(h + 6 * m), f, i), y.Wxi.add(y.R), y.Wxi.add(y.A, x.v[1]), y.Wxi.add(y.B, x.v[2]), y.Wxi.add(y.C, x.v[3]), y.Wxi.add(y.Sigma1, x.v[4]), y.Wxi.add(y.Sigma2, x.v[5]), y.Wxi.subScalar(p.mul(x.v[1], S.evaluations.eval_a)), y.Wxi.subScalar(p.mul(x.v[2], S.evaluations.eval_b)), y.Wxi.subScalar(p.mul(x.v[3], S.evaluations.eval_c)), y.Wxi.subScalar(p.mul(x.v[4], S.evaluations.eval_s1)), y.Wxi.subScalar(p.mul(x.v[5], S.evaluations.eval_s2)), y.Wxi.divByZerofier(1, x.xi);
		}
		async function ie() {
			y.Wxiw = X.fromPolynomial(y.Z, f, i), y.Wxiw.subScalar(S.evaluations.eval_zw), y.Wxiw.divByZerofier(1, x.xiw);
		}
	} finally {
		for (let e of [o, c]) try {
			e && await e.close();
		} catch {}
	}
}
//#endregion
//#region src/plonk_fullprove.js
var { unstringifyBigInts: Sa } = s;
async function Ca(e, t, n, r, i, a) {
	let o = Sa(e), s = { type: "mem" };
	return await vr(o, t, s, i), await xa(n, s, r, a);
}
//#endregion
//#region src/plonk_verify.js
var { unstringifyBigInts: wa } = s;
async function Ta(e, t, n, r) {
	let i = wa(e);
	n = wa(n);
	let a = wa(t), o = await Ie(i.curve), s = o.Fr, c = o.G1;
	r && r.info("PLONK VERIFIER STARTED");
	let l = Ea(o, n);
	if (i = Da(o, i), !Oa(o, l)) return r && r.error("Proof commitments are not valid."), !1;
	if (a.length != i.nPublic) return r && r.error("Invalid number of public inputs"), !1;
	if (!ja(o, l)) return r && r.error("Proof evaluations are not valid"), !1;
	if (!Ma(o, a)) return r && r.error("Public inputs are not valid."), !1;
	let u = Na(o, l, a, i);
	if (r) {
		r.debug("beta: " + s.toString(u.beta, 16)), r.debug("gamma: " + s.toString(u.gamma, 16)), r.debug("alpha: " + s.toString(u.alpha, 16)), r.debug("xi: " + s.toString(u.xi, 16));
		for (let e = 1; e < 6; e++) r && r.debug("v: " + s.toString(u.v[e], 16));
		r.debug("u: " + s.toString(u.u, 16));
	}
	let d = Pa(o, u, i);
	if (r) for (let e = 1; e < d.length; e++) r.debug(`L${e}(xi)=` + s.toString(d[e], 16));
	if (a.length != i.nPublic) return r && r.error("Number of public signals does not match with vk"), !1;
	let f = Fa(o, a, d);
	r && r.debug("PI(xi): " + s.toString(f, 16));
	let p = Ia(o, l, u, f, d[1]);
	r && r.debug("r0: " + s.toString(p, 16));
	let m = La(o, l, u, i, d[1]);
	r && r.debug("D: " + c.toString(c.toAffine(m), 16));
	let h = Ra(o, l, u, i, m);
	r && r.debug("F: " + c.toString(c.toAffine(h), 16));
	let g = za(o, l, u, p);
	r && r.debug("E: " + c.toString(c.toAffine(g), 16));
	let _ = await Ba(o, l, u, i, g, h);
	return r && (_ ? r.info("OK!") : r.warn("Invalid Proof")), _;
}
function Ea(e, t) {
	let n = e.G1, r = e.Fr, i = {};
	return i.A = n.fromObject(t.A), i.B = n.fromObject(t.B), i.C = n.fromObject(t.C), i.Z = n.fromObject(t.Z), i.T1 = n.fromObject(t.T1), i.T2 = n.fromObject(t.T2), i.T3 = n.fromObject(t.T3), i.eval_a = r.fromObject(t.eval_a), i.eval_b = r.fromObject(t.eval_b), i.eval_c = r.fromObject(t.eval_c), i.eval_zw = r.fromObject(t.eval_zw), i.eval_s1 = r.fromObject(t.eval_s1), i.eval_s2 = r.fromObject(t.eval_s2), i.Wxi = n.fromObject(t.Wxi), i.Wxiw = n.fromObject(t.Wxiw), i;
}
function Da(e, t) {
	let n = e.G1, r = e.G2, i = e.Fr, a = t;
	return a.Qm = n.fromObject(t.Qm), a.Ql = n.fromObject(t.Ql), a.Qr = n.fromObject(t.Qr), a.Qo = n.fromObject(t.Qo), a.Qc = n.fromObject(t.Qc), a.S1 = n.fromObject(t.S1), a.S2 = n.fromObject(t.S2), a.S3 = n.fromObject(t.S3), a.k1 = i.fromObject(t.k1), a.k2 = i.fromObject(t.k2), a.X_2 = r.fromObject(t.X_2), a;
}
function Oa(e, t) {
	let n = e.G1;
	return !(!n.isValid(t.A) || !n.isValid(t.B) || !n.isValid(t.C) || !n.isValid(t.Z) || !n.isValid(t.T1) || !n.isValid(t.T2) || !n.isValid(t.T3) || !n.isValid(t.Wxi) || !n.isValid(t.Wxiw));
}
function ka(e, t) {
	return r.geq(t, 0) && r.lt(t, e.r);
}
function Aa(e, t) {
	return ka(e, r.fromRprLE(t));
}
function ja(e, t) {
	return Aa(e, t.eval_a) && Aa(e, t.eval_b) && Aa(e, t.eval_c) && Aa(e, t.eval_s1) && Aa(e, t.eval_s2) && Aa(e, t.eval_zw);
}
function Ma(e, t) {
	for (let n = 0; n < t.length; n++) if (!ka(e, t[n])) return !1;
	return !0;
}
function Na(e, t, n, r) {
	let i = e.Fr, a = {}, o = new va(e);
	o.addPolCommitment(r.Qm), o.addPolCommitment(r.Ql), o.addPolCommitment(r.Qr), o.addPolCommitment(r.Qo), o.addPolCommitment(r.Qc), o.addPolCommitment(r.S1), o.addPolCommitment(r.S2), o.addPolCommitment(r.S3);
	for (let e = 0; e < n.length; e++) o.addScalar(i.e(n[e]));
	o.addPolCommitment(t.A), o.addPolCommitment(t.B), o.addPolCommitment(t.C), a.beta = o.getChallenge(), o.reset(), o.addScalar(a.beta), a.gamma = o.getChallenge(), o.reset(), o.addScalar(a.beta), o.addScalar(a.gamma), o.addPolCommitment(t.Z), a.alpha = o.getChallenge(), o.reset(), o.addScalar(a.alpha), o.addPolCommitment(t.T1), o.addPolCommitment(t.T2), o.addPolCommitment(t.T3), a.xi = o.getChallenge(), o.reset(), o.addScalar(a.xi), o.addScalar(t.eval_a), o.addScalar(t.eval_b), o.addScalar(t.eval_c), o.addScalar(t.eval_s1), o.addScalar(t.eval_s2), o.addScalar(t.eval_zw), a.v = [], a.v[1] = o.getChallenge();
	for (let e = 2; e < 6; e++) a.v[e] = i.mul(a.v[e - 1], a.v[1]);
	return o.reset(), o.addPolCommitment(t.Wxi), o.addPolCommitment(t.Wxiw), a.u = o.getChallenge(), a;
}
function Pa(e, t, n) {
	let r = e.Fr, i = t.xi, a = 1;
	for (let e = 0; e < n.power; e++) i = r.square(i), a *= 2;
	t.xin = i, t.zh = r.sub(i, r.one);
	let o = [], s = r.e(a), c = r.one;
	for (let e = 1; e <= Math.max(1, n.nPublic); e++) o[e] = r.div(r.mul(c, t.zh), r.mul(s, r.sub(t.xi, c))), c = r.mul(c, r.w[n.power]);
	return o;
}
function Fa(e, t, n) {
	let r = e.Fr, i = r.zero;
	for (let e = 0; e < t.length; e++) {
		let a = r.e(t[e]);
		i = r.sub(i, r.mul(a, n[e + 1]));
	}
	return i;
}
function Ia(e, t, n, r, i) {
	let a = e.Fr, o = r, s = a.mul(i, a.square(n.alpha)), c = a.add(t.eval_a, a.mul(n.beta, t.eval_s1));
	c = a.add(c, n.gamma);
	let l = a.add(t.eval_b, a.mul(n.beta, t.eval_s2));
	l = a.add(l, n.gamma);
	let u = a.add(t.eval_c, n.gamma), d = a.mul(a.mul(c, l), u);
	return d = a.mul(d, t.eval_zw), d = a.mul(d, n.alpha), a.sub(a.sub(o, s), d);
}
function La(e, t, n, r, i) {
	let a = e.G1, o = e.Fr, s = a.timesFr(r.Qm, o.mul(t.eval_a, t.eval_b));
	s = a.add(s, a.timesFr(r.Ql, t.eval_a)), s = a.add(s, a.timesFr(r.Qr, t.eval_b)), s = a.add(s, a.timesFr(r.Qo, t.eval_c)), s = a.add(s, r.Qc);
	let c = o.mul(n.beta, n.xi), l = o.add(o.add(t.eval_a, c), n.gamma), u = o.add(o.add(t.eval_b, o.mul(c, r.k1)), n.gamma), d = o.add(o.add(t.eval_c, o.mul(c, r.k2)), n.gamma), f = o.mul(o.mul(o.mul(l, u), d), n.alpha), p = o.mul(i, o.square(n.alpha)), m = a.timesFr(t.Z, o.add(o.add(f, p), n.u)), h = o.add(o.add(t.eval_a, o.mul(n.beta, t.eval_s1)), n.gamma), g = o.add(o.add(t.eval_b, o.mul(n.beta, t.eval_s2)), n.gamma), _ = o.mul(o.mul(n.alpha, n.beta), t.eval_zw), v = a.timesFr(r.S3, o.mul(o.mul(h, g), _)), y = t.T1, b = a.timesFr(t.T2, n.xin), x = a.timesFr(t.T3, o.square(n.xin)), S = a.add(y, a.add(b, x));
	return S = a.timesFr(S, n.zh), a.sub(a.sub(a.add(s, m), v), S);
}
function Ra(e, t, n, r, i) {
	let a = e.G1, o = a.add(i, a.timesFr(t.A, n.v[1]));
	return o = a.add(o, a.timesFr(t.B, n.v[2])), o = a.add(o, a.timesFr(t.C, n.v[3])), o = a.add(o, a.timesFr(r.S1, n.v[4])), o = a.add(o, a.timesFr(r.S2, n.v[5])), o;
}
function za(e, t, n, r) {
	let i = e.G1, a = e.Fr, o = a.add(a.neg(r), a.mul(n.v[1], t.eval_a));
	return o = a.add(o, a.mul(n.v[2], t.eval_b)), o = a.add(o, a.mul(n.v[3], t.eval_c)), o = a.add(o, a.mul(n.v[4], t.eval_s1)), o = a.add(o, a.mul(n.v[5], t.eval_s2)), o = a.add(o, a.mul(n.u, t.eval_zw)), i.timesFr(i.one, o);
}
async function Ba(e, t, n, r, i, a) {
	let o = e.G1, s = e.Fr, c = t.Wxi;
	c = o.add(c, o.timesFr(t.Wxiw, n.u));
	let l = o.timesFr(t.Wxi, n.xi), u = s.mul(s.mul(n.u, n.xi), s.w[r.power]);
	return l = o.add(l, o.timesFr(t.Wxiw, u)), l = o.add(l, a), l = o.sub(l, i), await e.pairingEq(o.neg(c), r.X_2, l, e.G2.one);
}
//#endregion
//#region src/plonk_exportsoliditycalldata.js
var { unstringifyBigInts: Va } = s;
function Q(e) {
	let t = e.toString(16);
	for (; t.length < 64;) t = "0" + t;
	return t = `"0x${t}"`, t;
}
async function Ha(e, t) {
	let n = Va(e), r = Va(t);
	await Ie(n.curve);
	let i = "";
	for (let e = 0; e < r.length; e++) i != "" && (i += ","), i += Q(r[e]);
	return `[${Q(n.A[0])}, ${Q(n.A[1])},${Q(n.B[0])},${Q(n.B[1])},${Q(n.C[0])},${Q(n.C[1])},${Q(n.Z[0])},${Q(n.Z[1])},${Q(n.T1[0])},${Q(n.T1[1])},${Q(n.T2[0])},${Q(n.T2[1])},${Q(n.T3[0])},${Q(n.T3[1])},${Q(n.Wxi[0])},${Q(n.Wxi[1])},${Q(n.Wxiw[0])},${Q(n.Wxiw[1])},${Q(n.eval_a)},${Q(n.eval_b)},${Q(n.eval_c)},${Q(n.eval_s1)},${Q(n.eval_s2)},${Q(n.eval_zw)}][${i}]`;
}
//#endregion
//#region src/plonk.js
var Ua = /* @__PURE__ */ l({
	exportSolidityCallData: () => Ha,
	fullProve: () => Ca,
	prove: () => xa,
	setup: () => Zi,
	verify: () => Ta
});
//#endregion
//#region src/plonk_equation.js
function Wa(e, t) {
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
function Ga(e, t, n, r, i, a, o, s) {
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
function Ka(e, t, n, r, i, a, o, s, c) {
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
var qa = 0, Ja = 1, Ya = 2, Xa = class {
	constructor(e, t, n, r, i) {
		this.Fr = e, this.logger = i, this.fnGetAdditionConstraint = n, this.fnGetMultiplicationConstraint = r;
	}
	processR1csConstraint(e, t, n, r) {
		this.normalizeLinearCombination(t), this.normalizeLinearCombination(n), this.normalizeLinearCombination(r);
		let i = this.getLinearCombinationType(t), a = this.getLinearCombinationType(n);
		if (i === qa || a === qa) return this.processR1csAdditionConstraint(e, r);
		if (i === Ja) {
			/* c8 ignore start */
			let i = this.joinLinearCombinations(n, r, t[0]);
			return this.processR1csAdditionConstraint(e, i);
		}
		if (a === Ja) {
			let i = this.joinLinearCombinations(t, r, n[0]);
			return this.processR1csAdditionConstraint(e, i);
		}
		return this.processR1csMultiplicationConstraint(e, t, n, r);
	}
	getLinearCombinationType(e) {
		let t = this.Fr.zero, n = 0, r = Object.keys(e);
		for (let i = 0; i < r.length; i++)
 /* c8 ignore start */
		e[r[i]] == 0n ? delete e[r[i]] : r[i] == 0 ? t = this.Fr.add(t, e[r[i]]) : n++;
		return n > 0 ? Ya : 
		/* c8 ignore next */
		this.Fr.isZero(t) ? qa : Ja;
	}
	normalizeLinearCombination(e) {
		let t = Object.keys(e);
		for (let n = 0; n < t.length; n++)
 /* c8 ignore next */
		this.Fr.isZero(e[t[n]]) && delete e[t[n]];
		return e;
	}
	joinLinearCombinations(e, t, n) {
		let r = {};
		for (let t in e) r[t] = r[t] === void 0 ? this.Fr.mul(n, e[t]) : this.Fr.add(r[t], this.Fr.mul(n, e[t]));
		for (let e in t) {
			let n = this.Fr.neg(t[e]);
			r[e] = r[e] === void 0 ? n : this.Fr.add(r[e], n);
		}
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
		/* c8 ignore start */
		for (; a.coefs.length < i;) a.signals.push(0), a.coefs.push(this.Fr.zero);
		/* c8 ignore stop */
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
}, Za = class {
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
		let t = this.polynomials.map((e) => e === void 0 ? 0 : e.degree()), n = this.degree(), r = 2 ** (St(n - 1) + 1), i = this.Fr.n8, a = new X(new e(r * i), this.curve, this.logger);
		for (let e = 0; e < n; e++) {
			let n = e * i, r = n * this.n;
			for (let o = 0; o < this.n; o++) this.polynomials[o] !== void 0 && e <= t[o] && a.coef.set(this.polynomials[o].coef.slice(n, n + i), r + o * i);
		}
		return a;
	}
	async multiExponentiation(e, t) {
		let n = this.getPolynomial(), r = n.coef.byteLength / this.Fr.n8, i = e.slice(0, r * this.G1.F.n8 * 2), a = await this.Fr.batchFromMontgomery(n.coef), o = await this.G1.multiExpAffine(i, a, this.logger, t);
		return o = this.G1.toAffine(o), o;
	}
};
//#endregion
//#region src/fflonk_setup.js
async function Qa(t, n, i, a) {
	let o, s, c, l, u;
	try {
		if (a && a.info("FFLONK SETUP STARTED"), globalThis.gc && globalThis.gc(), a && a.info("> Reading PTau file"), {fd: o, sections: s} = await I(n, "ptau", 1, 1 << 22, 1 << 24), !s[12]) throw Error("Powers of Tau is not well prepared. Section 12 missing.");
		a && a.info("> Getting curve from PTau settings");
		let { curve: d } = await Fr(o, s);
		a && a.info("> Reading r1cs file"), {fd: c, sections: l} = await I(t, "r1cs", 1, 1 << 22, 1 << 24);
		let f = await gi(c, l, {
			loadConstraints: !1,
			loadCustomGates: !0
		});
		if (f.prime !== d.r) throw Error("r1cs curve does not match powers of tau ceremony curve");
		let p = d.Fr, m = d.Fr.n8, h = d.G1.F.n8 * 2, g = d.G2.F.n8 * 2, _ = {}, v = {}, y, b = {
			nVars: f.nVars,
			nPublic: f.nOutputs + f.nPubInputs
		}, x = new Pi(), S = new Pi();
		if (a && a.info("> Processing FFlonk constraints"), await k(d.Fr, f, a), globalThis.gc && globalThis.gc(), b.cirPower = Math.max(3, St(x.length + 2 - 1) + 1), b.domainSize = 2 ** b.cirPower, s[2][0].size < (b.domainSize * 9 + 18) * h) throw Error("Powers of Tau is not big enough for this circuit size. Section 2 too small.");
		/* c8 ignore start */
		if (s[3][0].size < g) throw Error("Powers of Tau is not well prepared. Section 3 too small.");
		a && (a.info("----------------------------"), a.info("  FFLONK SETUP SETTINGS"), a.info(`  Curve:         ${d.name}`), a.info(`  Circuit power: ${b.cirPower}`), a.info(`  Domain size:   ${b.domainSize}`), a.info(`  Vars:          ${b.nVars}`), a.info(`  Public vars:   ${b.nPublic}`), a.info(`  Constraints:   ${x.length}`), a.info(`  Additions:     ${S.length}`), a.info("----------------------------")), a && a.info("> computing k1 and k2");
		let [C, w] = ae();
		a && a.info("> computing w3");
		let T = oe();
		a && a.info("> computing w4");
		let E = se();
		a && a.info("> computing w8");
		let D = ce();
		a && a.info("> computing wr");
		let O = le(b.cirPower, d.Fr);
		return await A(), await c.close(), await o.close(), a && a.info("FFLONK SETUP FINISHED"), 0;
		async function k(e, t, n) {
			for (let t = 0; t < b.nPublic; t++) x.push(Wa(t + 1, e));
			let r = new Xa(e, Wa, Ga, Ka, n), i = await H(c, l, 2), a = 0;
			for (let e = 0; e < t.nConstraints; e++) {
				/* c8 ignore start */
				n && e !== 0 && e % 5e5 == 0 && n.info(`    processing r1cs constraints ${e}/${t.nConstraints}`);
				/* c8 ignore stop */
				let [i, a] = r.processR1csConstraint(b, ...o());
				x.push(...i), S.push(...a);
			}
			function o() {
				let e = [];
				return e[0] = s(), e[1] = s(), e[2] = s(), e;
			}
			function s() {
				let e = {}, n = i.slice(a, a + 4);
				a += 4;
				let r = new DataView(n.buffer).getUint32(0, !0), o = i.slice(a, a + (4 + t.n8) * r);
				a += (4 + t.n8) * r;
				let s = new DataView(o.buffer);
				for (let n = 0; n < r; n++) {
					let r = s.getUint32(n * (4 + t.n8), !0);
					e[r] = t.F.fromRprLE(o, n * (4 + t.n8) + 4);
				}
				return e;
			}
			return 0;
		}
		async function A() {
			a && a.info("> Writing the zkey file"), u = await Ee(i, "zkey", 1, 17, 1 << 22, 1 << 24), a && a.info("··· Writing Section 1. Zkey Header"), await j(u), a && a.info("··· Writing Section 3. Additions"), await M(u), globalThis.gc && globalThis.gc(), a && a.info("··· Writing Section 4. A Map"), await N(u, 4, 0, "A map"), globalThis.gc && globalThis.gc(), a && a.info("··· Writing Section 5. B Map"), await N(u, 5, 1, "B map"), globalThis.gc && globalThis.gc(), a && a.info("··· Writing Section 6. C Map"), await N(u, 6, 2, "C map"), globalThis.gc && globalThis.gc(), a && a.info("··· Writing Section 7. QL"), await P(u, 7, 3, "QL"), globalThis.gc && globalThis.gc(), a && a.info("··· Writing Section 8. QR"), await P(u, 8, 4, "QR"), globalThis.gc && globalThis.gc(), a && a.info("··· Writing Section 9. QM"), await P(u, 9, 5, "QM"), globalThis.gc && globalThis.gc(), a && a.info("··· Writing Section 10. QO"), await P(u, 10, 6, "QO"), globalThis.gc && globalThis.gc(), a && a.info("··· Writing Section 11. QC"), await P(u, 11, 7, "QC"), globalThis.gc && globalThis.gc(), a && a.info("··· Writing Sections 12,13,14. Sigma1, Sigma2 & Sigma 3"), await F(u), globalThis.gc && globalThis.gc(), a && a.info("··· Writing Section 15. Lagrange Polynomials"), await ee(u), globalThis.gc && globalThis.gc(), a && a.info("··· Writing Section 16. Powers of Tau"), await te(u), globalThis.gc && globalThis.gc(), a && a.info("··· Writing Section 17. C0"), await ne(u), globalThis.gc && globalThis.gc(), a && a.info("··· Writing Section 2. FFlonk Header"), await re(u), globalThis.gc && globalThis.gc(), a && a.info("> Writing the zkey file finished"), await u.close();
		}
		async function j(e) {
			await L(e, 1), await e.writeULE32(10), await R(e);
		}
		async function M(e) {
			await L(e, 3);
			let t = new Uint8Array(8 + 2 * m), n = new DataView(t.buffer);
			for (let r = 0; r < S.length; r++) {
				/* c8 ignore start */
				a && r !== 0 && r % 5e5 == 0 && a.info(`      writing Additions: ${r}/${S.length}`);
				/* c8 ignore stop */
				let i = S[r];
				n.setUint32(0, i[0], !0), n.setUint32(4, i[1], !0), t.set(i[2], 8), t.set(i[3], 8 + m), await e.write(t);
			}
			await R(e);
		}
		async function N(e, t, n, r) {
			await L(e, t);
			for (let t = 0; t < x.length; t++)
 /* c8 ignore stop */
			a && t !== 0 && t % 5e5 == 0 && a.info(`      writing witness ${r}: ${t}/${x.length}`), await e.writeULE32(x[t][n]);
			await R(e);
		}
		async function P(t, n, r, i) {
			let o = new e(b.domainSize * m);
			for (let e = 0; e < x.length; e++)
 /* c8 ignore start */
			o.set(x[e][r], e * m), a && e !== 0 && e % 5e5 == 0 && a.info(`      writing ${i}: ${e}/${x.length}`);
			_[i] = await X.fromEvaluations(o, d, a), v[i] = await Z.fromPolynomial(_[i], 4, d, a), await L(t, n), await t.write(_[i].coef), await t.write(v[i].eval), await R(t);
		}
		async function F(t) {
			let n = new e(m * b.domainSize * 3), r = new Pi(b.nVars), i = new Pi(b.nVars), o = p.one;
			for (let e = 0; e < b.domainSize; e++)
 /* c8 ignore start */
			e < x.length ? (s(x[e][0], e), s(x[e][1], b.domainSize + e), s(x[e][2], b.domainSize * 2 + e)) : e < b.domainSize - 2 ? (s(0, e), s(0, b.domainSize + e), s(0, b.domainSize * 2 + e)) : (n.set(o, e * m), n.set(p.mul(o, C), (b.domainSize + e) * m), n.set(p.mul(o, w), (b.domainSize * 2 + e) * m)), o = p.mul(o, p.w[b.cirPower]), a && e !== 0 && e % 5e5 == 0 && a.info(`      writing sigma phase1: ${e}/${x.length}`);
			for (let e = 0; e < b.nVars; e++)
 /* c8 ignore start */
			i[e] === void 0 ? 
			/* c8 ignore start */
			console.log("Variable not used") : n.set(r[e], i[e] * m), a && e !== 0 && e % 5e5 == 0 && a.info(`      writing sigma phase2: ${e}/${b.nVars}`);
			globalThis.gc && globalThis.gc();
			for (let e = 0; e < 3; e++) {
				let r = e === 0 ? 12 : e === 1 ? 13 : 14, i = "S" + (e + 1);
				_[i] = await X.fromEvaluations(n.slice(b.domainSize * m * e, b.domainSize * m * (e + 1)), d, a), v[i] = await Z.fromPolynomial(_[i], 4, d, a), await L(t, r), await t.write(_[i].coef), await t.write(v[i].eval), await R(t), globalThis.gc && globalThis.gc();
			}
			return 0;
			function s(e, t) {
				r[e] === void 0 ? i[e] = t : n.set(r[e], t * m);
				let a;
				a = t < b.domainSize ? o : t < 2 * b.domainSize ? p.mul(o, C) : p.mul(o, w), r[e] = a;
			}
		}
		async function ee(t) {
			await L(t, 15);
			let n = Math.max(b.nPublic, 1);
			for (let r = 0; r < n; r++) {
				let n = new e(b.domainSize * m);
				n.set(p.one, r * m), await ie(t, n);
			}
			await R(t);
		}
		async function te(t) {
			await L(t, 16), y = new e((b.domainSize * 9 + 18) * h), await o.readToBuffer(y, 0, (b.domainSize * 9 + 18) * h, s[2][0].p), await t.write(y), await R(t);
		}
		async function ne(e) {
			let t = new Za(8, d, a);
			/* c8 ignore start */
			if (t.addPolynomial(0, _.QL), t.addPolynomial(1, _.QR), t.addPolynomial(2, _.QO), t.addPolynomial(3, _.QM), t.addPolynomial(4, _.QC), t.addPolynomial(5, _.S1), t.addPolynomial(6, _.S2), t.addPolynomial(7, _.S3), _.C0 = t.getPolynomial(), _.C0.degree() >= 8 * b.domainSize) throw Error("C0 Polynomial is not well calculated");
			await L(e, 17), await e.write(_.C0.coef), await R(e);
		}
		async function re(e) {
			await L(e, 2);
			let t = d.q, n = (Math.floor((r.bitLength(t) - 1) / 64) + 1) * 8;
			await e.writeULE32(n), await De(e, t, n);
			let i = d.r, a = (Math.floor((r.bitLength(i) - 1) / 64) + 1) * 8;
			await e.writeULE32(a), await De(e, i, a), await e.writeULE32(b.nVars), await e.writeULE32(b.nPublic), await e.writeULE32(b.domainSize), await e.writeULE32(S.length), await e.writeULE32(x.length), await e.write(C), await e.write(w), await e.write(T), await e.write(E), await e.write(D), await e.write(O);
			let c;
			c = await o.read(g, s[3][0].p + g), await e.write(c);
			let l = await _.C0.multiExponentiation(y, "C0");
			await e.write(l), await R(e);
		}
		async function ie(e, t) {
			let [n, r] = await X.to4T(t, b.domainSize, [], p);
			return await e.write(n), await e.write(r), [n, r];
		}
		function ae() {
			let e = p.two;
			/* c8 ignore start */
			for (; n(e, [], b.cirPower);) p.add(e, p.one);
			/* c8 ignore stop */
			let t = p.add(e, p.one);
			/* c8 ignore start */
			for (; n(t, [e], b.cirPower);) p.add(t, p.one);
			/* c8 ignore stop */
			return [e, t];
			function n(e, t, n) {
				let r = 2 ** n, i = p.one;
				for (let a = 0; a < r; a++) {
					/* c8 ignore start */
					if (p.eq(e, i)) return !0;
					/* c8 ignore stop */
					for (let n = 0; n < t.length; n++)
 /* c8 ignore start */
					if (p.eq(e, p.mul(t[n], i))) return !0;
					i = p.mul(i, p.w[n]);
				}
				return !1;
			}
		}
		function oe() {
			let e = p.e(31624), t = r.div(3648040478639879203707734290876212514758060733402672390616367364429301415936n, r.e(3));
			return p.exp(e, t);
		}
		function se() {
			return p.w[2];
		}
		function ce() {
			return p.w[3];
		}
		function le(e, t) {
			let n = t.e(467799165886069610036046866799264026481344299079011762026774533774345988080n);
			return t.exp(n, 2 ** (28 - e));
		}
	} finally {
		for (let e of [
			o,
			c,
			u
		]) try {
			e && await e.close();
		} catch {}
	}
}
//#endregion
//#region src/fflonk_prove.js
var { stringifyBigInts: $a } = s;
async function eo(t, n, i, a) {
	let o, s, c, l;
	try {
		i && i.info("FFLONK PROVER STARTED"), i && i.info("> Reading witness file"), {fd: o, sections: s} = await I(n, "wtns", 2, 1 << 25, 1 << 23);
		let u = await nn(o, s);
		i && i.info("> Reading zkey file"), {fd: c, sections: l} = await I(t, "zkey", 2, 1 << 25, 1 << 23);
		let d = await Ht(c, l, void 0, a);
		if (d.protocolId !== 10) throw Error("zkey file is not fflonk");
		if (!r.eq(d.r, u.q)) throw Error("Curve of the witness does not match the curve of the proving key");
		if (u.nWitness !== d.nVars - d.nAdditions) throw Error(`Invalid witness length. Circuit: ${d.nVars}, witness: ${u.nWitness}, ${d.nAdditions}`);
		let f = d.curve, p = f.Fr, m = f.Fr.n8, h = f.G1.F.n8 * 2, g = d.domainSize * m;
		i && (i.info("----------------------------"), i.info("  FFLONK PROVE SETTINGS"), i.info(`  Curve:         ${f.name}`), i.info(`  Circuit power: ${d.power}`), i.info(`  Domain size:   ${d.domainSize}`), i.info(`  Vars:          ${d.nVars}`), i.info(`  Public vars:   ${d.nPublic}`), i.info(`  Constraints:   ${d.nConstraints}`), i.info(`  Additions:     ${d.nAdditions}`), i.info("----------------------------")), i && i.info("> Reading witness file data");
		let _ = await H(o, s, 2);
		await o.close(), _.set(p.zero, 0);
		let v = new e(d.nAdditions * m), y = {}, b = {}, x = {}, S = {}, C = {}, w = {}, T = new Qi(f, i);
		i && i.info("> Reading Section 3. Additions"), await k(), i && i.info("> Reading Sections 12,13,14. Sigma1, Sigma2 & Sigma 3"), i && i.info("··· Reading Sigma polynomials "), b.Sigma1 = new X(new e(g), f, i), b.Sigma2 = new X(new e(g), f, i), b.Sigma3 = new X(new e(g), f, i), await c.readToBuffer(b.Sigma1.coef, 0, g, l[12][0].p), await c.readToBuffer(b.Sigma2.coef, 0, g, l[13][0].p), await c.readToBuffer(b.Sigma3.coef, 0, g, l[14][0].p), i && i.info("··· Reading Sigma evaluations"), x.Sigma1 = new Z(new e(g * 4), f, i), x.Sigma2 = new Z(new e(g * 4), f, i), x.Sigma3 = new Z(new e(g * 4), f, i), await c.readToBuffer(x.Sigma1.eval, 0, g * 4, l[12][0].p + g), await c.readToBuffer(x.Sigma2.eval, 0, g * 4, l[13][0].p + g), await c.readToBuffer(x.Sigma3.eval, 0, g * 4, l[14][0].p + g), i && i.info("> Reading Section 16. Powers of Tau");
		let E = new e(d.domainSize * 16 * h);
		await c.readToBuffer(E, 0, (d.domainSize * 9 + 18) * h, l[16][0].p), globalThis.gc && globalThis.gc(), i && i.info(""), i && i.info("> ROUND 1"), await M(), delete b.T0, delete x.QL, delete x.QR, delete x.QM, delete x.QO, delete x.QC, globalThis.gc && globalThis.gc(), i && i.info("> ROUND 2"), await N(), delete y.A, delete y.B, delete y.C, delete x.A, delete x.B, delete x.C, delete x.Sigma1, delete x.Sigma2, delete x.Sigma3, delete x.lagrange1, delete x.Z, globalThis.gc && globalThis.gc(), i && i.info("> ROUND 3"), await P(), delete b.A, delete b.B, delete b.C, delete b.Z, delete b.T1, delete b.T2, delete b.Sigma1, delete b.Sigma2, delete b.Sigma3, delete b.QL, delete b.QR, delete b.QM, delete b.QC, delete b.QO, globalThis.gc && globalThis.gc(), i && i.info("> ROUND 4"), await F(), globalThis.gc && globalThis.gc(), i && i.info("> ROUND 5"), await ee(), delete b.C0, delete b.C1, delete b.C2, delete b.R1, delete b.R2, delete b.F, delete b.L, delete b.ZT, delete b.ZTS2, await c.close(), globalThis.gc && globalThis.gc(), T.addEvaluation("inv", te());
		let D = T.toObjectProof();
		D.protocol = "fflonk", D.curve = f.name;
		let O = [];
		for (let e = 1; e <= d.nPublic; e++) {
			let t = e * m, n = _.slice(t, t + m);
			O.push(r.fromRprLE(n));
		}
		return i && i.info("FFLONK PROVER FINISHED"), {
			proof: $a(D),
			publicSignals: $a(O)
		};
		async function k() {
			i && i.info("··· Computing additions");
			let e = await H(c, l, 3), t = 8 + m * 2;
			for (let n = 0; n < d.nAdditions; n++) {
				/* c8 ignore start */
				i && n !== 0 && n % 1e5 == 0 && i.info(`    addition ${n}/${d.nAdditions}`);
				/* c8 ignore stop */
				let r = n * t, a = A(e, r);
				r += 4;
				let o = A(e, r);
				r += 4;
				let s = e.slice(r, r + m);
				r += m;
				let c = e.slice(r, r + m), l = j(a), u = j(o), f = p.add(p.mul(s, l), p.mul(c, u));
				v.set(f, m * n);
			}
		}
		function A(e, t) {
			let n = e.slice(t, t + 4);
			return new DataView(n.buffer, n.byteOffset, n.byteLength).getUint32(0, !0);
		}
		function j(e) {
			let t = d.nVars - d.nAdditions;
			if (e < t) return _.slice(e * m, e * m + m);
			if (e < d.nVars) {
				let n = (e - t) * m;
				return v.slice(n, n + m);
			}
			/* c8 ignore start */
			/* c8 ignore stop */
			return p.zero;
		}
		async function M() {
			C.b = [];
			for (let e = 1; e <= 9; e++) C.b[e] = p.random();
			i && i.info("> Computing A, B, C wire polynomials"), await n(), i && i.info("> Computing T0 polynomial"), await r(), i && i.info("> Computing C1 polynomial"), await a(), i && i.info("> Computing C1 multi exponentiation");
			let t = await b.C1.multiExponentiation(E, "C1");
			return T.addPolynomial("C1", t), 0;
			async function n() {
				i && i.info("··· Reading data from zkey file"), y.A = new e(g), y.B = new e(g), y.C = new e(g);
				let t = await H(c, l, 4), n = await H(c, l, 5), r = await H(c, l, 6);
				for (let e = 0; e < d.nConstraints; e++) {
					let i = e * m, a = e * 4, o = A(t, a);
					y.A.set(j(o), i);
					let s = A(n, a);
					y.B.set(j(s), i);
					let c = A(r, a);
					y.C.set(j(c), i);
				}
				/* c8 ignore start */
				if (y.A.set(C.b[1], g - 64), y.A.set(C.b[2], g - 32), y.B.set(C.b[3], g - 64), y.B.set(C.b[4], g - 32), y.C.set(C.b[5], g - 64), y.C.set(C.b[6], g - 32), y.A = await p.batchToMontgomery(y.A), y.B = await p.batchToMontgomery(y.B), y.C = await p.batchToMontgomery(y.C), i && i.info("··· Computing A ifft"), b.A = await X.fromEvaluations(y.A, f, i), i && i.info("··· Computing B ifft"), b.B = await X.fromEvaluations(y.B, f, i), i && i.info("··· Computing C ifft"), b.C = await X.fromEvaluations(y.C, f, i), i && i.info("··· Computing A fft"), x.A = await Z.fromPolynomial(b.A, 4, f, i), i && i.info("··· Computing B fft"), x.B = await Z.fromPolynomial(b.B, 4, f, i), i && i.info("··· Computing C fft"), x.C = await Z.fromPolynomial(b.C, 4, f, i), b.A.degree() >= d.domainSize) throw Error("A Polynomial is not well calculated");
				/* c8 ignore stop */
				/* c8 ignore start */
				if (b.B.degree() >= d.domainSize) throw Error("B Polynomial is not well calculated");
				/* c8 ignore stop */
				/* c8 ignore start */
				if (b.C.degree() >= d.domainSize) throw Error("C Polynomial is not well calculated");
				/* c8 ignore stop */
			}
			async function r() {
				i && i.info("··· Reading sections 7, 8, 9, 10, 11. Q selectors"), x.QL = new Z(new e(g * 4), f, i), x.QR = new Z(new e(g * 4), f, i), x.QM = new Z(new e(g * 4), f, i), x.QO = new Z(new e(g * 4), f, i), x.QC = new Z(new e(g * 4), f, i), await c.readToBuffer(x.QL.eval, 0, g * 4, l[7][0].p + g), await c.readToBuffer(x.QR.eval, 0, g * 4, l[8][0].p + g), await c.readToBuffer(x.QM.eval, 0, g * 4, l[9][0].p + g), await c.readToBuffer(x.QO.eval, 0, g * 4, l[10][0].p + g), await c.readToBuffer(x.QC.eval, 0, g * 4, l[11][0].p + g);
				let t = await H(c, l, 15);
				x.lagrange1 = new Z(t, f, i), y.T0 = new e(g * 4), i && i.info("··· Computing T0 evaluations");
				for (let e = 0; e < d.domainSize * 4; e++) {
					/* c8 ignore start */
					i && e !== 0 && e % 1e5 == 0 && i.info(`      T0 evaluation ${e}/${d.domainSize * 4}`);
					/* c8 ignore stop */
					let t = x.A.getEvaluation(e), n = x.B.getEvaluation(e), r = x.C.getEvaluation(e), a = x.QL.getEvaluation(e), o = x.QR.getEvaluation(e), s = x.QM.getEvaluation(e), c = x.QO.getEvaluation(e), l = x.QC.getEvaluation(e), u = p.zero;
					for (let t = 0; t < d.nPublic; t++) {
						let n = t * 5 * d.domainSize + d.domainSize + e, r = x.lagrange1.getEvaluation(n), i = y.A.slice(t * m, (t + 1) * m);
						u = p.sub(u, p.mul(r, i));
					}
					let f = p.mul(t, a), h = p.mul(n, o), g = p.mul(p.mul(t, n), s), _ = p.mul(r, c), v = p.add(f, p.add(h, p.add(g, p.add(_, p.add(l, u)))));
					y.T0.set(v, e * m);
				}
				/* c8 ignore start */
				if (i && i.info("buffer T0: " + y.T0.byteLength / m), i && i.info("··· Computing T0 ifft"), b.T0 = await X.fromEvaluations(y.T0, f, i), i && i.info("T0 length: " + b.T0.length()), i && i.info("T0 degree: " + b.T0.degree()), i && i.info("··· Computing T0 / ZH"), b.T0.divByZerofier(d.domainSize, p.one), b.T0.degree() >= 2 * d.domainSize - 2) throw Error(`T0 Polynomial is not well calculated (degree is ${b.T0.degree()} and must be less than ${2 * d.domainSize + 2}`);
				/* c8 ignore stop */
				delete y.T0;
			}
			async function a() {
				let e = new Za(4, f, i);
				/* c8 ignore start */
				if (e.addPolynomial(0, b.A), e.addPolynomial(1, b.B), e.addPolynomial(2, b.C), e.addPolynomial(3, b.T0), b.C1 = e.getPolynomial(), b.C1.degree() >= 8 * d.domainSize - 8) throw Error("C1 Polynomial is not well calculated");
				/* c8 ignore stop */
			}
		}
		async function N() {
			i && i.info("> Computing challenges beta and gamma");
			let t = new va(f);
			t.addPolCommitment(d.C0);
			for (let e = 0; e < d.nPublic; e++) t.addScalar(y.A.slice(e * m, e * m + m));
			t.addPolCommitment(T.getPolynomial("C1")), C.beta = t.getChallenge(), i && i.info("··· challenges.beta: " + p.toString(C.beta)), t.reset(), t.addScalar(C.beta), C.gamma = t.getChallenge(), i && i.info("··· challenges.gamma: " + p.toString(C.gamma)), i && i.info("> Computing Z polynomial"), await r(), i && i.info("> Computing T1 polynomial"), await a(), i && i.info("> Computing T2 polynomial"), await o(), i && i.info("> Computing C2 polynomial"), await s(), i && i.info("> Computing C2 multi exponentiation");
			let n = await b.C2.multiExponentiation(E, "C2");
			return T.addPolynomial("C2", n), 0;
			async function r() {
				i && i.info("··· Computing Z evaluations");
				let t = new e(g), n = new e(g);
				t.set(p.one, 0), n.set(p.one, 0);
				let r = p.one;
				for (let e = 0; e < d.domainSize; e++) {
					/* c8 ignore start */
					i && e !== 0 && e % 1e5 == 0 && i.info(`    Z evaluation ${e}/${d.domainSize}`);
					/* c8 ignore stop */
					let a = e * m, o = p.mul(C.beta, r), s = y.A.slice(a, a + m);
					s = p.add(s, o), s = p.add(s, C.gamma);
					let c = y.B.slice(a, a + m);
					c = p.add(c, p.mul(d.k1, o)), c = p.add(c, C.gamma);
					let l = y.C.slice(a, a + m);
					l = p.add(l, p.mul(d.k2, o)), l = p.add(l, C.gamma);
					let u = p.mul(s, p.mul(c, l)), f = y.A.slice(a, a + m);
					f = p.add(f, p.mul(C.beta, x.Sigma1.getEvaluation(e * 4))), f = p.add(f, C.gamma);
					let h = y.B.slice(a, a + m);
					h = p.add(h, p.mul(C.beta, x.Sigma2.getEvaluation(e * 4))), h = p.add(h, C.gamma);
					let g = y.C.slice(a, a + m);
					g = p.add(g, p.mul(C.beta, x.Sigma3.getEvaluation(e * 4))), g = p.add(g, C.gamma);
					let _ = p.mul(f, p.mul(h, g));
					u = p.mul(t.slice(a, a + m), u), t.set(u, (e + 1) % d.domainSize * m), _ = p.mul(n.slice(a, a + m), _), n.set(_, (e + 1) % d.domainSize * m), r = p.mul(r, p.w[d.power]);
				}
				n = await p.batchInverse(n);
				for (let e = 0; e < d.domainSize; e++) {
					let r = e * m, i = p.mul(t.slice(r, r + m), n.slice(r, r + m));
					t.set(i, r);
				}
				/* c8 ignore start */
				if (y.Z = t, !p.eq(t.slice(0, m), p.one)) throw Error("Copy constraints does not match");
				/* c8 ignore start */
				if (i && i.info("··· Computing Z ifft"), b.Z = await X.fromEvaluations(y.Z, f, i), i && i.info("··· Computing Z fft"), x.Z = await Z.fromPolynomial(b.Z, 4, f, i), b.Z.blindCoefficients([
					C.b[9],
					C.b[8],
					C.b[7]
				]), b.Z.degree() >= d.domainSize + 3) throw Error("Z Polynomial is not well calculated");
				/* c8 ignore stop */
				delete y.Z;
			}
			async function a() {
				i && i.info("··· Computing T1 evaluations"), y.T1 = new e(g * 2), y.T1z = new e(g * 2);
				let t = p.one;
				for (let e = 0; e < d.domainSize * 2; e++) {
					/* c8 ignore start */
					i && e !== 0 && e % 1e5 == 0 && i.info(`    T1 evaluation ${e}/${d.domainSize * 4}`);
					/* c8 ignore stop */
					let n = p.square(t), r = x.Z.getEvaluation(e * 2), a = p.add(p.add(p.mul(C.b[7], n), p.mul(C.b[8], t)), C.b[9]), o = x.lagrange1.getEvaluation(d.domainSize + e * 2), s = p.mul(p.sub(r, p.one), o), c = p.mul(a, o);
					y.T1.set(s, e * m), y.T1z.set(c, e * m), t = p.mul(t, p.w[d.power + 1]);
				}
				/* c8 ignore start */
				if (i && i.info("··· Computing T1 ifft"), b.T1 = await X.fromEvaluations(y.T1, f, i), b.T1.divByZerofier(d.domainSize, p.one), i && i.info("··· Computing T1z ifft"), b.T1z = await X.fromEvaluations(y.T1z, f, i), b.T1.add(b.T1z), b.T1.degree() >= d.domainSize + 2) throw Error("T1 Polynomial is not well calculated");
				delete y.T1, delete y.T1z, delete b.T1z;
			}
			async function o() {
				i && i.info("··· Computing T2 evaluations"), y.T2 = new e(g * 4), y.T2z = new e(g * 4);
				let t = p.one;
				for (let e = 0; e < d.domainSize * 4; e++) {
					/* c8 ignore start */
					i && e !== 0 && e % 1e5 == 0 && i.info(`    T2 evaluation ${e}/${d.domainSize * 4}`);
					/* c8 ignore stop */
					let n = p.square(t), r = p.mul(t, p.w[d.power]), a = p.square(r), o = x.A.getEvaluation(e), s = x.B.getEvaluation(e), c = x.C.getEvaluation(e), l = x.Z.getEvaluation(e), u = x.Z.getEvaluation((d.domainSize * 4 + 4 + e) % (d.domainSize * 4)), f = p.add(p.add(p.mul(C.b[7], n), p.mul(C.b[8], t)), C.b[9]), h = p.add(p.add(p.mul(C.b[7], a), p.mul(C.b[8], r)), C.b[9]), g = x.Sigma1.getEvaluation(e), _ = x.Sigma2.getEvaluation(e), v = x.Sigma3.getEvaluation(e), b = p.mul(C.beta, t), S = p.add(o, b);
					S = p.add(S, C.gamma);
					let w = p.add(s, p.mul(b, d.k1));
					w = p.add(w, C.gamma);
					let T = p.add(c, p.mul(b, d.k2));
					T = p.add(T, C.gamma);
					let E = p.mul(p.mul(p.mul(S, w), T), l), D = p.mul(p.mul(p.mul(S, w), T), f), O = p.add(o, p.mul(C.beta, g));
					O = p.add(O, C.gamma);
					let k = p.add(s, p.mul(C.beta, _));
					k = p.add(k, C.gamma);
					let A = p.add(c, p.mul(C.beta, v));
					A = p.add(A, C.gamma);
					let j = p.mul(p.mul(p.mul(O, k), A), u), M = p.mul(p.mul(p.mul(O, k), A), h), N = p.sub(E, j), P = p.sub(D, M);
					y.T2.set(N, e * m), y.T2z.set(P, e * m), t = p.mul(t, p.w[d.power + 2]);
				}
				/* c8 ignore start */
				if (i && i.info("··· Computing T2 ifft"), b.T2 = await X.fromEvaluations(y.T2, f, i), i && i.info("··· Computing T2 / ZH"), b.T2.divByZerofier(d.domainSize, p.one), i && i.info("··· Computing T2z ifft"), b.T2z = await X.fromEvaluations(y.T2z, f, i), b.T2.add(b.T2z), b.T2.degree() >= 3 * d.domainSize) throw Error("T2 Polynomial is not well calculated");
				delete y.T2, delete y.T2z, delete b.T2z;
			}
			async function s() {
				let e = new Za(3, f, i);
				/* c8 ignore start */
				if (e.addPolynomial(0, b.Z), e.addPolynomial(1, b.T1), e.addPolynomial(2, b.T2), b.C2 = e.getPolynomial(), b.C2.degree() >= 9 * d.domainSize) throw Error("C2 Polynomial is not well calculated");
				/* c8 ignore stop */
			}
		}
		async function P() {
			i && i.info("> Computing challenge xi");
			let t = new va(f);
			t.addScalar(C.gamma), t.addPolCommitment(T.getPolynomial("C2")), C.xiSeed = t.getChallenge();
			let n = p.square(C.xiSeed);
			w.w8 = [], w.w8[0] = p.one;
			for (let e = 1; e < 8; e++) w.w8[e] = p.mul(w.w8[e - 1], d.w8);
			w.w4 = [], w.w4[0] = p.one;
			for (let e = 1; e < 4; e++) w.w4[e] = p.mul(w.w4[e - 1], d.w4);
			w.w3 = [], w.w3[0] = p.one, w.w3[1] = d.w3, w.w3[2] = p.square(d.w3), w.S0 = {}, w.S0.h0w8 = [], w.S0.h0w8[0] = p.mul(n, C.xiSeed);
			for (let e = 1; e < 8; e++) w.S0.h0w8[e] = p.mul(w.S0.h0w8[0], w.w8[e]);
			w.S1 = {}, w.S1.h1w4 = [], w.S1.h1w4[0] = p.square(w.S0.h0w8[0]);
			for (let e = 1; e < 4; e++) w.S1.h1w4[e] = p.mul(w.S1.h1w4[0], w.w4[e]);
			w.S2 = {}, w.S2.h2w3 = [], w.S2.h2w3[0] = p.mul(w.S1.h1w4[0], n), w.S2.h2w3[1] = p.mul(w.S2.h2w3[0], w.w3[1]), w.S2.h2w3[2] = p.mul(w.S2.h2w3[0], w.w3[2]), w.S2.h3w3 = [], w.S2.h3w3[0] = p.mul(w.S2.h2w3[0], d.wr), w.S2.h3w3[1] = p.mul(w.S2.h3w3[0], w.w3[1]), w.S2.h3w3[2] = p.mul(w.S2.h3w3[0], w.w3[2]), C.xi = p.mul(p.square(w.S2.h2w3[0]), w.S2.h2w3[0]), i && i.info("··· challenges.xi: " + p.toString(C.xi)), b.QL = new X(new e(g), f, i), b.QR = new X(new e(g), f, i), b.QM = new X(new e(g), f, i), b.QO = new X(new e(g), f, i), b.QC = new X(new e(g), f, i), await c.readToBuffer(b.QL.coef, 0, g, l[7][0].p), await c.readToBuffer(b.QR.coef, 0, g, l[8][0].p), await c.readToBuffer(b.QM.coef, 0, g, l[9][0].p), await c.readToBuffer(b.QO.coef, 0, g, l[10][0].p), await c.readToBuffer(b.QC.coef, 0, g, l[11][0].p), i && i.info("··· Computing evaluations"), T.addEvaluation("ql", b.QL.evaluate(C.xi)), T.addEvaluation("qr", b.QR.evaluate(C.xi)), T.addEvaluation("qm", b.QM.evaluate(C.xi)), T.addEvaluation("qo", b.QO.evaluate(C.xi)), T.addEvaluation("qc", b.QC.evaluate(C.xi)), T.addEvaluation("s1", b.Sigma1.evaluate(C.xi)), T.addEvaluation("s2", b.Sigma2.evaluate(C.xi)), T.addEvaluation("s3", b.Sigma3.evaluate(C.xi)), T.addEvaluation("a", b.A.evaluate(C.xi)), T.addEvaluation("b", b.B.evaluate(C.xi)), T.addEvaluation("c", b.C.evaluate(C.xi)), T.addEvaluation("z", b.Z.evaluate(C.xi)), C.xiw = p.mul(C.xi, p.w[d.power]), T.addEvaluation("zw", b.Z.evaluate(C.xiw)), T.addEvaluation("t1w", b.T1.evaluate(C.xiw)), T.addEvaluation("t2w", b.T2.evaluate(C.xiw));
		}
		async function F() {
			i && i.info("> Computing challenge alpha");
			let t = new va(f);
			t.addScalar(C.xiSeed), t.addScalar(T.getEvaluation("ql")), t.addScalar(T.getEvaluation("qr")), t.addScalar(T.getEvaluation("qm")), t.addScalar(T.getEvaluation("qo")), t.addScalar(T.getEvaluation("qc")), t.addScalar(T.getEvaluation("s1")), t.addScalar(T.getEvaluation("s2")), t.addScalar(T.getEvaluation("s3")), t.addScalar(T.getEvaluation("a")), t.addScalar(T.getEvaluation("b")), t.addScalar(T.getEvaluation("c")), t.addScalar(T.getEvaluation("z")), t.addScalar(T.getEvaluation("zw")), t.addScalar(T.getEvaluation("t1w")), t.addScalar(T.getEvaluation("t2w")), C.alpha = t.getChallenge(), i && i.info("··· challenges.alpha: " + p.toString(C.alpha)), i && i.info("> Reading C0 polynomial"), b.C0 = new X(new e(g * 8), f, i), await c.readToBuffer(b.C0.coef, 0, g * 8, l[17][0].p), i && i.info("> Computing R0 polynomial"), r(), i && i.info("> Computing R1 polynomial"), a(), i && i.info("> Computing R2 polynomial"), o(), i && i.info("> Computing F polynomial"), await s(), i && i.info("> Computing W1 multi exponentiation");
			let n = await b.F.multiExponentiation(E, "W1");
			return T.addPolynomial("W1", n), 0;
			function r() {
				/* c8 ignore start */
				if (b.R0 = X.lagrangePolynomialInterpolation([
					w.S0.h0w8[0],
					w.S0.h0w8[1],
					w.S0.h0w8[2],
					w.S0.h0w8[3],
					w.S0.h0w8[4],
					w.S0.h0w8[5],
					w.S0.h0w8[6],
					w.S0.h0w8[7]
				], [
					b.C0.evaluate(w.S0.h0w8[0]),
					b.C0.evaluate(w.S0.h0w8[1]),
					b.C0.evaluate(w.S0.h0w8[2]),
					b.C0.evaluate(w.S0.h0w8[3]),
					b.C0.evaluate(w.S0.h0w8[4]),
					b.C0.evaluate(w.S0.h0w8[5]),
					b.C0.evaluate(w.S0.h0w8[6]),
					b.C0.evaluate(w.S0.h0w8[7])
				], f), b.R0.degree() > 7) throw Error("R0 Polynomial is not well calculated");
				/* c8 ignore stop */
			}
			function a() {
				/* c8 ignore start */
				if (b.R1 = X.lagrangePolynomialInterpolation([
					w.S1.h1w4[0],
					w.S1.h1w4[1],
					w.S1.h1w4[2],
					w.S1.h1w4[3]
				], [
					b.C1.evaluate(w.S1.h1w4[0]),
					b.C1.evaluate(w.S1.h1w4[1]),
					b.C1.evaluate(w.S1.h1w4[2]),
					b.C1.evaluate(w.S1.h1w4[3])
				], f), b.R1.degree() > 3) throw Error("R1 Polynomial is not well calculated");
				/* c8 ignore stop */
			}
			function o() {
				/* c8 ignore start */
				if (b.R2 = X.lagrangePolynomialInterpolation([
					w.S2.h2w3[0],
					w.S2.h2w3[1],
					w.S2.h2w3[2],
					w.S2.h3w3[0],
					w.S2.h3w3[1],
					w.S2.h3w3[2]
				], [
					b.C2.evaluate(w.S2.h2w3[0]),
					b.C2.evaluate(w.S2.h2w3[1]),
					b.C2.evaluate(w.S2.h2w3[2]),
					b.C2.evaluate(w.S2.h3w3[0]),
					b.C2.evaluate(w.S2.h3w3[1]),
					b.C2.evaluate(w.S2.h3w3[2])
				], f), b.R2.degree() > 5) throw Error("R2 Polynomial is not well calculated");
				/* c8 ignore stop */
			}
			async function s() {
				i && i.info("··· Computing F polynomial"), b.F = X.fromPolynomial(b.C0, f, i), b.F.sub(b.R0), b.F.divByZerofier(8, C.xi);
				let e = X.fromPolynomial(b.C1, f, i);
				e.sub(b.R1), e.mulScalar(C.alpha), e.divByZerofier(4, C.xi);
				let t = X.fromPolynomial(b.C2, f, i);
				/* c8 ignore start */
				if (t.sub(b.R2), t.mulScalar(p.square(C.alpha)), t.divByZerofier(3, C.xi), t.divByZerofier(3, C.xiw), b.F.add(e), b.F.add(t), b.F.degree() >= 9 * d.domainSize - 6) throw Error("F Polynomial is not well calculated");
				/* c8 ignore stop */
			}
		}
		async function ee() {
			i && i.info("> Computing challenge y");
			let e = new va(f);
			e.addScalar(C.alpha), e.addPolCommitment(T.getPolynomial("W1")), C.y = e.getChallenge(), i && i.info("··· challenges.y: " + p.toString(C.y)), i && i.info("> Computing L polynomial"), await o(), i && i.info("> Computing ZTS2 polynomial"), await c();
			let t = b.ZTS2.evaluate(C.y);
			t = p.inv(t), b.L.mulScalar(t);
			let n = X.fromCoefficientsArray([p.neg(C.y), p.one], f);
			i && i.info("> Computing W' = L / ZTS2 polynomial");
			let r = b.L.divBy(n);
			/* c8 ignore start */
			if (r.degree() > 0) throw Error(`Degree of L(X)/(ZTS2(y)(X-y)) remainder is ${r.degree()} and should be 0`);
			/* c8 ignore stop */
			/* c8 ignore start */
			if (b.L.degree() >= 9 * d.domainSize - 1) throw Error("Degree of L(X)/(ZTS2(y)(X-y)) is not correct");
			/* c8 ignore stop */
			i && i.info("> Computing W' multi exponentiation");
			let a = await b.L.multiExponentiation(E, "W2");
			return T.addPolynomial("W2", a), 0;
			async function o() {
				i && i.info("··· Computing L polynomial");
				let e = b.R0.evaluate(C.y), t = b.R1.evaluate(C.y), n = b.R2.evaluate(C.y), r = p.sub(C.y, w.S0.h0w8[0]);
				for (let e = 1; e < 8; e++) r = p.mul(r, p.sub(C.y, w.S0.h0w8[e]));
				let a = p.sub(C.y, w.S1.h1w4[0]);
				for (let e = 1; e < 4; e++) a = p.mul(a, p.sub(C.y, w.S1.h1w4[e]));
				let o = p.sub(C.y, w.S2.h2w3[0]);
				for (let e = 1; e < 3; e++) o = p.mul(o, p.sub(C.y, w.S2.h2w3[e]));
				for (let e = 0; e < 3; e++) o = p.mul(o, p.sub(C.y, w.S2.h3w3[e]));
				let c = p.mul(a, o), l = p.mul(C.alpha, p.mul(r, o)), u = p.mul(p.square(C.alpha), p.mul(r, a));
				S.denH1 = a, S.denH2 = o, b.L = X.fromPolynomial(b.C0, f, i), b.L.subScalar(e), b.L.mulScalar(c);
				let m = X.fromPolynomial(b.C1, f, i);
				m.subScalar(t), m.mulScalar(l);
				let h = X.fromPolynomial(b.C2, f, i);
				h.subScalar(n), h.mulScalar(u), b.L.add(m), b.L.add(h), i && i.info("> Computing ZT polynomial"), await s();
				let g = b.ZT.evaluate(C.y);
				/* c8 ignore start */
				if (b.F.mulScalar(g), b.L.sub(b.F), b.L.degree() >= 9 * d.domainSize) throw Error("L Polynomial is not well calculated");
				/* c8 ignore stop */
				delete y.L;
			}
			async function s() {
				b.ZT = X.zerofierPolynomial([
					w.S0.h0w8[0],
					w.S0.h0w8[1],
					w.S0.h0w8[2],
					w.S0.h0w8[3],
					w.S0.h0w8[4],
					w.S0.h0w8[5],
					w.S0.h0w8[6],
					w.S0.h0w8[7],
					w.S1.h1w4[0],
					w.S1.h1w4[1],
					w.S1.h1w4[2],
					w.S1.h1w4[3],
					w.S2.h2w3[0],
					w.S2.h2w3[1],
					w.S2.h2w3[2],
					w.S2.h3w3[0],
					w.S2.h3w3[1],
					w.S2.h3w3[2]
				], f);
			}
			async function c() {
				b.ZTS2 = X.zerofierPolynomial([
					w.S1.h1w4[0],
					w.S1.h1w4[1],
					w.S1.h1w4[2],
					w.S1.h1w4[3],
					w.S2.h2w3[0],
					w.S2.h2w3[1],
					w.S2.h2w3[2],
					w.S2.h3w3[0],
					w.S2.h3w3[1],
					w.S2.h3w3[2]
				], f);
			}
		}
		function te() {
			let e = C.xi;
			for (let t = 0; t < d.power; t++) e = p.square(e);
			S.zh = p.sub(e, p.one), i(S, w.S0.h0w8, C.y, f), a(S, w.S1.h1w4, C.y, f), o(S, w.S2.h2w3, w.S2.h3w3, C.y, C.xi, C.xiw, f);
			let t = Math.max(1, d.nPublic), n = p.one;
			for (let e = 0; e < t; e++) S["Li_" + (e + 1)] = p.mul(p.e(d.domainSize), p.sub(C.xi, n)), n = p.mul(n, p.w[d.power]);
			let r = p.one;
			for (let e of Object.values(S))
 /* c8 ignore start */
			if (Array.isArray(e)) for (let t of e) r = p.mul(r, t);
			else r = p.mul(r, e);
			return p.inv(r);
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
	} finally {
		for (let e of [o, c]) try {
			e && await e.close();
		} catch {}
	}
}
//#endregion
//#region src/fflonk_full_prove.js
var { unstringifyBigInts: to } = s;
async function no(e, t, n, r, i, a) {
	let o = to(e), s = { type: "mem" };
	return await vr(o, t, s, i), await eo(n, s, r, a);
}
//#endregion
//#region src/fflonk_verify.js
var { unstringifyBigInts: ro } = s;
async function io(e, t, n, r) {
	r && r.info("FFLONK VERIFIER STARTED"), e = ro(e), n = ro(n);
	let i = await Ie(e.curve), a = ao(i, e), o = new Qi(i, r);
	o.fromObjectProof(n);
	let s = ro(t);
	if (s.length !== a.nPublic) return r && r.error("Number of public signals does not match with vk"), !1;
	let c = i.Fr;
	if (r && (r.info("----------------------------"), r.info("  FFLONK VERIFY SETTINGS"), r.info(`  Curve:         ${i.name}`), r.info(`  Circuit power: ${a.power}`), r.info(`  Domain size:   ${2 ** a.power}`), r.info(`  Public vars:   ${a.nPublic}`), r.info("----------------------------")), r && r.info("> Checking commitments belong to G1"), !oo(i, o, a)) return r && r.error("Proof commitments are not valid"), !1;
	if (r && r.info("> Checking evaluations belong to F"), !lo(i, o)) return r && r.error("Proof evaluations are not valid."), !1;
	if (r && r.info("> Checking public inputs belong to F"), !uo(i, s)) return r && r.error("Public inputs are not valid."), !1;
	r && r.info("> Computing challenges");
	let { challenges: l, roots: u } = fo(i, o, a, s, r);
	r && r.info("> Computing Zero polynomial evaluation Z_H(xi)"), l.zh = c.sub(l.xiN, c.one), l.invzh = c.inv(l.zh), r && r.info("> Computing Lagrange evaluations");
	let d = await po(i, l, a);
	r && r.info("> Computing polynomial identities PI(X)");
	let f = mo(i, s, d);
	r && r.info("> Computing r0(y)");
	let p = ho(o, l, u, i, r);
	r && r.info("> Computing r1(y)");
	let m = go(o, l, u, f, i, r);
	r && r.info("> Computing r2(y)");
	let h = _o(o, l, u, d[1], a, i, r);
	r && r.info("> Computing F");
	let g = vo(i, o, a, l, u);
	r && r.info("> Computing E");
	let _ = yo(i, o, l, a, p, m, h);
	r && r.info("> Computing J");
	let v = bo(i, o, l);
	r && r.info("> Validate all evaluations with a pairing");
	let y = await xo(i, o, l, a, g, _, v);
	return r && (y ? r.info("PROOF VERIFIED SUCCESSFULLY") : r.warn("Invalid Proof")), r && r.info("FFLONK VERIFIER FINISHED"), y;
}
function ao(e, t) {
	let n = t;
	return n.k1 = e.Fr.fromObject(t.k1), n.k2 = e.Fr.fromObject(t.k2), n.w = e.Fr.fromObject(t.w), n.w3 = e.Fr.fromObject(t.w3), n.w4 = e.Fr.fromObject(t.w4), n.w8 = e.Fr.fromObject(t.w8), n.wr = e.Fr.fromObject(t.wr), n.X_2 = e.G2.fromObject(t.X_2), n.C0 = e.G1.fromObject(t.C0), n;
}
function oo(e, t, n) {
	let r = e.G1;
	return r.isValid(t.polynomials.C1) && r.isValid(t.polynomials.C2) && r.isValid(t.polynomials.W1) && r.isValid(t.polynomials.W2) && r.isValid(n.C0);
}
function so(e, t) {
	return r.geq(t, 0) && r.lt(t, e.r);
}
function co(e, t) {
	return so(e, r.fromRprLE(t));
}
function lo(e, t) {
	return co(e, t.evaluations.ql) && co(e, t.evaluations.qr) && co(e, t.evaluations.qm) && co(e, t.evaluations.qo) && co(e, t.evaluations.qc) && co(e, t.evaluations.s1) && co(e, t.evaluations.s2) && co(e, t.evaluations.s3) && co(e, t.evaluations.a) && co(e, t.evaluations.b) && co(e, t.evaluations.c) && co(e, t.evaluations.z) && co(e, t.evaluations.zw) && co(e, t.evaluations.t1w) && co(e, t.evaluations.t2w);
}
function uo(e, t) {
	for (let n = 0; n < t.length; n++) if (!so(e, t[n])) return !1;
	return !0;
}
function fo(e, t, n, r, i) {
	let a = e.Fr, o = {}, s = {}, c = new va(e);
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
async function po(t, n, r) {
	let i = t.Fr, a = Math.max(1, r.nPublic), o = new e(a * i.n8), s = new e(a * i.n8), c = i.one;
	for (let e = 0; e < a; e++) {
		let t = e * i.n8;
		o.set(i.mul(c, n.zh), t), s.set(i.mul(i.e(r.domainSize), i.sub(n.xi, c)), t), c = i.mul(c, r.w);
	}
	s = await i.batchInverse(s);
	let l = [];
	for (let e = 0; e < a; e++) {
		let t = e * i.n8;
		l[e + 1] = i.mul(o.slice(t, t + i.n8), s.slice(t, t + i.n8));
	}
	return l;
}
function mo(e, t, n) {
	let r = e.Fr, i = r.zero;
	for (let e = 0; e < t.length; e++) {
		let a = r.e(t[e]);
		i = r.sub(i, r.mul(a, n[e + 1]));
	}
	return i;
}
function ho(e, t, n, r, i) {
	let a = r.Fr, o = So(n.S0.h0w8, t.y, t.xi, r);
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
function go(e, t, n, r, i, a) {
	let o = i.Fr, s = So(n.S1.h1w4, t.y, t.xi, i);
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
function _o(e, t, n, r, i, a, o) {
	let s = a.Fr, c = Co([n.S2.h2w3, n.S2.h3w3], t.y, t.xi, t.xiw, a);
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
function vo(e, t, n, r, i) {
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
function yo(e, t, n, r, i, a, o) {
	let s = e.G1, c = e.Fr, l = c.mul(a, n.quotient1), u = c.mul(o, n.quotient2);
	return s.timesFr(s.one, c.add(i, c.add(l, u)));
}
function bo(e, t, n) {
	return e.G1.timesFr(t.polynomials.W1, n.temp);
}
async function xo(e, t, n, r, i, a, o) {
	let s = e.G1, c = s.timesFr(t.polynomials.W2, n.y);
	c = s.add(s.sub(s.sub(i, a), o), c);
	let l = e.G2.one, u = t.polynomials.W2, d = r.X_2;
	return await e.pairingEq(s.neg(c), l, u, d);
}
function So(e, t, n, r) {
	let i = r.Fr, a = e.length, o = i.sub(i.exp(t, a), n), s = i.mul(i.e(a), i.exp(e[0], a - 2)), c = [];
	for (let n = 0; n < a; n++) {
		let r = e[(a - 1) * n % a], l = i.sub(t, e[n]);
		c[n] = i.div(o, i.mul(i.mul(s, r), l));
	}
	return c;
}
function Co(e, t, n, r, i) {
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
var { unstringifyBigInts: wo } = s;
function $(e) {
	let t = e.toString(16);
	for (; t.length < 64;) t = "0" + t;
	return t = `0x${t}`, t;
}
async function To(e, t) {
	let n = wo(t), r = wo(e);
	await Ie(n.curve);
	let i = "";
	for (let e = 0; e < r.length; e++) i !== "" && (i += ","), i += $(r[e]);
	return `[${$(n.polynomials.C1[0])}, ${$(n.polynomials.C1[1])},${$(n.polynomials.C2[0])},${$(n.polynomials.C2[1])},${$(n.polynomials.W1[0])},${$(n.polynomials.W1[1])},${$(n.polynomials.W2[0])},${$(n.polynomials.W2[1])},${$(n.evaluations.ql)},${$(n.evaluations.qr)},${$(n.evaluations.qm)},${$(n.evaluations.qo)},${$(n.evaluations.qc)},${$(n.evaluations.s1)},${$(n.evaluations.s2)},${$(n.evaluations.s3)},${$(n.evaluations.a)},${$(n.evaluations.b)},${$(n.evaluations.c)},${$(n.evaluations.z)},${$(n.evaluations.zw)},${$(n.evaluations.t1w)},${$(n.evaluations.t2w)},${$(n.evaluations.inv)}],[${i}]`;
}
//#endregion
//#region src/fflonk.js
var Eo = /* @__PURE__ */ l({
	exportSolidityCallData: () => To,
	exportSolidityVerifier: () => null,
	fullProve: () => no,
	prove: () => eo,
	setup: () => Qa,
	verify: () => io
});
//#endregion
export { Ae as curves, Eo as fflonk, kr as groth16, Ua as plonk, si as powersOfTau, wi as r1cs, Ai as wtns, Xi as zKey };
