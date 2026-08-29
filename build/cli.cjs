#!/usr/bin/env node
//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
//#endregion
let fs = require("fs");
fs = __toESM(fs, 1);
let url = require("url");
url = __toESM(url, 1);
let module$1 = require("module");
let r1csfile = require("r1csfile");
let fastfile = require("fastfile");
fastfile = __toESM(fastfile, 1);
let ffjavascript = require("ffjavascript");
let _noble_hashes_blake2_js = require("@noble/hashes/blake2.js");
let _noble_hashes_utils_js = require("@noble/hashes/utils.js");
let readline = require("readline");
readline = __toESM(readline, 1);
let crypto = require("crypto");
crypto = __toESM(crypto, 1);
let path = require("path");
path = __toESM(path, 1);
let _iden3_binfileutils = require("@iden3/binfileutils");
_iden3_binfileutils = __toESM(_iden3_binfileutils, 1);
let circom_runtime = require("circom_runtime");
let _noble_hashes_sha3_js = require("@noble/hashes/sha3.js");
let logplease = require("logplease");
logplease = __toESM(logplease, 1);
//#region src/loadsyms.js
async function loadSymbols(symFileName) {
	const sym = {
		labelIdx2Name: ["one"],
		varIdx2Name: ["one"],
		componentIdx2Name: []
	};
	const fd = await fastfile.readExisting(symFileName);
	const buff = await fd.read(fd.totalSize);
	const lines = new TextDecoder("utf-8").decode(buff).split("\n");
	for (let i = 0; i < lines.length; i++) {
		const arr = lines[i].split(",");
		if (arr.length != 4) continue;
		if (sym.varIdx2Name[arr[1]]) sym.varIdx2Name[arr[1]] += "|" + arr[3];
		else sym.varIdx2Name[arr[1]] = arr[3];
		sym.labelIdx2Name[arr[0]] = arr[3];
		if (!sym.componentIdx2Name[arr[2]]) sym.componentIdx2Name[arr[2]] = extractComponent(arr[3]);
	}
	await fd.close();
	return sym;
	function extractComponent(name) {
		const arr = name.split(".");
		arr.pop();
		return arr.join(".");
	}
}
//#endregion
//#region src/r1cs_print.js
function r1csPrint$1(r1cs, syms, logger) {
	for (let i = 0; i < r1cs.constraints.length; i++) printCostraint(r1cs.constraints[i]);
	function printCostraint(c) {
		const lc2str = (lc) => {
			let S = "";
			Object.keys(lc).forEach((k) => {
				let name = syms.varIdx2Name[k];
				if (name == "one") name = "1";
				let vs = r1cs.curve.Fr.toString(lc[k]);
				if (vs == "1") vs = "";
				if (vs == "-1") vs = "-";
				if (S != "" && vs[0] != "-") vs = "+" + vs;
				if (S != "") vs = " " + vs;
				S = S + vs + name;
			});
			return S;
		};
		const S = `[ ${lc2str(c[0])} ] * [ ${lc2str(c[1])} ] - [ ${lc2str(c[2])} ] = 0`;
		if (logger) logger.info(S);
	}
}
//#endregion
//#region src/r1cs_info.js
var bls12381r$1 = ffjavascript.Scalar.e("73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001", 16);
var bn128r$1 = ffjavascript.Scalar.e("21888242871839275222246405745257275088548364400416034343698204186575808495617");
async function r1csInfo$1(r1csName, logger) {
	const cir = await (0, r1csfile.readR1cs)(r1csName, {
		loadConstraints: false,
		loadMap: false
	});
	if (ffjavascript.Scalar.eq(cir.prime, bn128r$1)) {
		if (logger) logger.info("Curve: bn-128");
	} else if (ffjavascript.Scalar.eq(cir.prime, bls12381r$1)) {
		if (logger) logger.info("Curve: bls12-381");
	} else if (logger) logger.info(`Unknown Curve. Prime: ${ffjavascript.Scalar.toString(cir.prime)}`);
	if (logger) logger.info(`# of Wires: ${cir.nVars}`);
	if (logger) logger.info(`# of Constraints: ${cir.nConstraints}`);
	if (logger) logger.info(`# of Private Inputs: ${cir.nPrvInputs}`);
	if (logger) logger.info(`# of Public Inputs: ${cir.nPubInputs}`);
	if (logger) logger.info(`# of Labels: ${cir.nLabels}`);
	if (logger) logger.info(`# of Outputs: ${cir.nOutputs}`);
	return cir;
}
//#endregion
//#region src/misc.js
var _revTable = [];
for (let i = 0; i < 256; i++) _revTable[i] = _revSlow(i, 8);
function _revSlow(idx, bits) {
	let res = 0;
	let a = idx;
	for (let i = 0; i < bits; i++) {
		res <<= 1;
		res = res | a & 1;
		a >>= 1;
	}
	return res;
}
function log2(V) {
	return ((V & 4294901760) !== 0 ? (V &= 4294901760, 16) : 0) | ((V & 4278255360) !== 0 ? (V &= 4278255360, 8) : 0) | ((V & 4042322160) !== 0 ? (V &= 4042322160, 4) : 0) | ((V & 3435973836) !== 0 ? (V &= 3435973836, 2) : 0) | (V & 2863311530) !== 0;
}
function formatHash(b, title) {
	const a = new DataView(b.buffer, b.byteOffset, b.byteLength);
	let S = "";
	for (let i = 0; i < 4; i++) {
		if (i > 0) S += "\n";
		S += "		";
		for (let j = 0; j < 4; j++) {
			if (j > 0) S += " ";
			S += a.getUint32(i * 16 + j * 4).toString(16).padStart(8, "0");
		}
	}
	if (title) S = title + "\n" + S;
	return S;
}
function hashIsEqual(h1, h2) {
	if (h1.byteLength != h2.byteLength) return false;
	var dv1 = new Int8Array(h1);
	var dv2 = new Int8Array(h2);
	for (var i = 0; i != h1.byteLength; i++) if (dv1[i] != dv2[i]) return false;
	return true;
}
function cloneHasher(h) {
	return h.clone();
}
function fromPartialHash(partial) {
	const buf = partial.subarray(0, 128);
	const rest = (0, _noble_hashes_utils_js.u32)(partial.subarray(128));
	const res = _noble_hashes_blake2_js.blake2b.create({ dkLen: 64 });
	res.buffer.set(buf);
	res.v0l = rest[0] | 0, res.v0h = rest[1] | 0;
	res.v1l = rest[2] | 0, res.v1h = rest[3] | 0;
	res.v2l = rest[4] | 0, res.v2h = rest[5] | 0;
	res.v3l = rest[6] | 0, res.v3h = rest[7] | 0;
	res.v4l = rest[8] | 0, res.v4h = rest[9] | 0;
	res.v5l = rest[10] | 0, res.v5h = rest[11] | 0;
	res.v6l = rest[12] | 0, res.v6h = rest[13] | 0;
	res.v7l = rest[14] | 0, res.v7h = rest[15] | 0;
	const shift = 2 ** 32;
	const len = rest[16] + rest[17] * shift;
	const pos = rest[18] + rest[19] * shift;
	res.length = len + pos;
	res.pos = pos;
	return res;
}
function toPartialHash(hash) {
	const res = /* @__PURE__ */ new Uint8Array(216);
	const res32 = (0, _noble_hashes_utils_js.u32)(res.subarray(128));
	res.set(hash.buffer);
	res32[0] = hash.v0l, res32[1] = hash.v0h;
	res32[2] = hash.v1l, res32[3] = hash.v1h;
	res32[4] = hash.v2l, res32[5] = hash.v2h;
	res32[6] = hash.v3l, res32[7] = hash.v3h;
	res32[8] = hash.v4l, res32[9] = hash.v4h;
	res32[10] = hash.v5l, res32[11] = hash.v5h;
	res32[12] = hash.v6l, res32[13] = hash.v6h;
	res32[14] = hash.v7l, res32[15] = hash.v7h;
	res32[18] = hash.pos;
	res32[16] = hash.length - hash.pos;
	return res;
}
async function sameRatio$2(curve, g1s, g1sx, g2s, g2sx) {
	if (curve.G1.isZero(g1s)) return false;
	if (curve.G1.isZero(g1sx)) return false;
	if (curve.G2.isZero(g2s)) return false;
	if (curve.G2.isZero(g2sx)) return false;
	return await curve.pairingEq(g1s, g2sx, curve.G1.neg(g1sx), g2s);
}
function askEntropy() {
	if (typeof window !== "undefined" && typeof window.prompt === "function") return window.prompt("Enter a random text. (Entropy): ", "");
	else {
		const rl = readline.default.createInterface({
			input: process.stdin,
			output: process.stdout
		});
		return new Promise((resolve) => {
			rl.question("Enter a random text. (Entropy): ", (input) => resolve(input));
		});
	}
}
function getRandomBytes(n) {
	let array = new Uint8Array(n);
	if (crypto.default && crypto.default.randomFillSync) crypto.default.randomFillSync(array);
	else if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.getRandomValues) for (let i = 0; i < n; i += 65536) globalThis.crypto.getRandomValues(array.subarray(i, Math.min(i + 65536, n)));
	else throw new Error("No secure random source available");
	return array;
}
async function sha256digest(data) {
	if (crypto.default && crypto.default.createHash) return crypto.default.createHash("sha256").update(data).digest();
	else {
		const buffer = await globalThis.crypto.subtle.digest("SHA-256", data);
		return new Uint8Array(buffer);
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
	while (!entropy) entropy = await askEntropy();
	const hasher = _noble_hashes_blake2_js.blake2b.create(64);
	hasher.update(getRandomBytes(64));
	const enc = new TextEncoder();
	hasher.update(enc.encode(entropy));
	const hash = hasher.digest();
	const seed = [];
	for (let i = 0; i < 8; i++) seed[i] = readUInt32BE(hash, i * 4);
	return new ffjavascript.ChaCha(seed);
}
async function rngFromBeaconParams(beaconHash, numIterationsExp) {
	let nIterationsInner;
	let nIterationsOuter;
	if (numIterationsExp < 32) {
		nIterationsInner = 1 << numIterationsExp >>> 0;
		nIterationsOuter = 1;
	} else {
		nIterationsInner = 4294967296;
		nIterationsOuter = 1 << numIterationsExp - 32 >>> 0;
	}
	let curHash = beaconHash;
	for (let i = 0; i < nIterationsOuter; i++) for (let j = 0; j < nIterationsInner; j++) curHash = await sha256digest(curHash);
	const curHashV = new DataView(curHash.buffer, curHash.byteOffset, curHash.byteLength);
	const seed = [];
	for (let i = 0; i < 8; i++) seed[i] = curHashV.getUint32(i * 4, false);
	return new ffjavascript.ChaCha(seed);
}
function hex2ByteArray(s) {
	if (s instanceof Uint8Array) return s;
	if (s.slice(0, 2) == "0x") s = s.slice(2);
	return new Uint8Array(s.match(/[\da-f]{2}/gi).map(function(h) {
		return parseInt(h, 16);
	}));
}
function byteArray2hex(byteArray) {
	return Array.prototype.map.call(byteArray, function(byte) {
		return ("0" + (byte & 255).toString(16)).slice(-2);
	}).join("");
}
function stringifyBigIntsWithField(Fr, o) {
	if (o instanceof Uint8Array) return Fr.toString(o);
	else if (Array.isArray(o)) return o.map(stringifyBigIntsWithField.bind(null, Fr));
	else if (typeof o == "object") {
		const res = {};
		Object.keys(o).forEach((k) => {
			res[k] = stringifyBigIntsWithField(Fr, o[k]);
		});
		return res;
	} else if (typeof o == "bigint" || o.eq !== void 0) return o.toString(10);
	else return o;
}
function withPersistentCache(fileSource, persistentCache) {
	if (!persistentCache) return fileSource;
	if (typeof fileSource === "string" && /^https?:\/\//i.test(fileSource)) return {
		type: "http",
		url: fileSource,
		persistentCache
	};
	if (fileSource && fileSource.type === "http" && !fileSource.persistentCache) return Object.assign({}, fileSource, { persistentCache });
	return fileSource;
}
//#endregion
//#region src/r1cs_export_json.js
async function r1csExportJson(r1csFileName, logger) {
	const cir = await (0, r1csfile.readR1cs)(r1csFileName, true, true, true, logger);
	const Fr = cir.curve.Fr;
	delete cir.curve;
	delete cir.F;
	return stringifyBigIntsWithField(Fr, cir);
}
//#endregion
//#region src/clprocessor.js
var __dirname$2 = path.default.dirname(url.default.fileURLToPath(require("url").pathToFileURL(__filename).href));
var pkgS;
try {
	pkgS = fs.default.readFileSync(path.default.join(__dirname$2, "package.json"));
} catch {
	pkgS = fs.default.readFileSync(path.default.join(__dirname$2, "..", "package.json"));
}
var version = JSON.parse(pkgS).version;
var selectedCommand = null;
async function clProcessor(commands) {
	const cl = [];
	const argv = {};
	for (let i = 2; i < process.argv.length; i++) if (process.argv[i][0] == "-") {
		let S = process.argv[i];
		while (S[0] == "-") S = S.slice(1);
		const arr = S.split("=");
		if (arr.length > 1) argv[arr[0]] = arr.slice(1).join("=");
		else argv[arr[0]] = true;
	} else cl.push(process.argv[i]);
	for (let i = 0; i < commands.length; i++) {
		const cmd = commands[i];
		const m = calculateMatch(commands[i], cl);
		let res;
		if (m) {
			if (argv.h || argv.help) {
				helpCmd(cmd);
				return;
			}
			if (areParamsValid(cmd.cmd, m)) {
				if (cmd.options) {
					const options = getOptions(cmd.options);
					res = await cmd.action(m, options);
				} else res = await cmd.action(m, {});
			} else {
				if (m.length > 0) console.log("Invalid number of parameters");
				helpCmd(cmd);
				return 99;
			}
			return res;
		}
	}
	if (cl.length > 0) console.log("Invalid command");
	helpAll();
	return 99;
	function calculateMatch(cmd, cl) {
		const alias = [];
		const m = parseLine(cmd.cmd);
		alias.push(m);
		if (cmd.alias) {
			if (Array.isArray(cmd.alias)) for (let i = 0; i < cmd.alias.length; i++) {
				const a = parseLine(cmd.alias[i]);
				alias.push({
					cmd: a.cmd,
					params: m.params
				});
			}
			else {
				const a = parseLine(cmd.alias);
				alias.push({
					cmd: a.cmd,
					params: m.params
				});
			}
		}
		for (let i = 0; i < cl.length; i++) for (let j = 0; j < alias.length; j++) {
			const w = alias[j].cmd.shift();
			if (cl[i].toUpperCase() == w.toUpperCase()) {
				if (alias[j].cmd.length == 0) return buildRemaining(alias[j].params, cl.slice(i + 1));
			} else {
				alias.splice(j, 1);
				j--;
			}
		}
		return null;
		function buildRemaining(defParams, cl) {
			const res = [];
			let p = 0;
			for (let i = 0; i < defParams.length; i++) if (defParams[i][0] == "-") res.push(getOption(defParams[i]).val);
			else if (p < cl.length) res.push(cl[p++]);
			else res.push(null);
			while (p < cl.length) res.push(cl[p++]);
			return res;
		}
	}
	function parseLine(l) {
		const words = l.match(/(\S+)/g);
		for (let i = 0; i < words.length; i++) if (words[i][0] == "<" || words[i][0] == "[" || words[i][0] == "-") return {
			cmd: words.slice(0, i),
			params: words.slice(i)
		};
		return {
			cmd: words,
			params: []
		};
	}
	function getOption(o) {
		const arr1 = o.slice(1).split(":");
		const arr2 = arr1[0].split("|");
		for (let i = 0; i < arr2.length; i++) if (argv[arr2[i]]) return {
			key: arr2[0],
			val: argv[arr2[i]]
		};
		return {
			key: arr2[0],
			val: arr1.length > 1 ? arr1[1] : null
		};
	}
	function areParamsValid(cmd, params) {
		while (params.length && !params[params.length - 1]) params.pop();
		const pl = parseLine(cmd);
		if (params.length > pl.params.length) return false;
		let minParams = pl.params.length;
		while (minParams > 0 && pl.params[minParams - 1][0] == "[") minParams--;
		if (params.length < minParams) return false;
		for (let i = 0; i < pl.params.length && pl.params[i][0] == "<"; i++) if (typeof params[i] == "undefined") return false;
		return true;
	}
	function getOptions(options) {
		const res = {};
		const opts = options.match(/(\S+)/g);
		for (let i = 0; i < opts.length; i++) {
			const o = getOption(opts[i]);
			res[o.key] = o.val;
		}
		return res;
	}
	function printVersion() {
		console.log("snarkjs@" + version);
	}
	function epilog() {
		console.log(`        Copyright (C) 2018  0kims association
        This program comes with ABSOLUTELY NO WARRANTY;
        This is free software, and you are welcome to redistribute it
        under certain conditions; see the COPYING file in the official
        repo directory at  https://github.com/iden3/snarkjs `);
	}
	function helpAll() {
		printVersion();
		epilog();
		console.log("");
		console.log("Usage:");
		console.log("        snarkjs <full command> ...  <options>");
		console.log("   or   snarkjs <shortcut> ...  <options>");
		console.log("");
		console.log("Type snarkjs <command> --help to get more information for that command");
		console.log("");
		console.log("Full Command                  Description");
		console.log("============                  =================");
		for (let i = 0; i < commands.length; i++) {
			const cmd = commands[i];
			let S = "";
			const pl = parseLine(cmd.cmd);
			S += pl.cmd.join(" ");
			while (S.length < 30) S = S + " ";
			S += cmd.description;
			console.log(S);
			S = "     Usage:  snarkjs ";
			if (cmd.alias) {
				if (Array.isArray(cmd.alias)) S += cmd.alias[0];
				else S += cmd.alias;
			} else S += pl.cmd.join(" ");
			S += " " + pl.params.join(" ");
			console.log(S);
		}
	}
	function helpCmd(cmd) {
		if (typeof cmd == "undefined") cmd = selectedCommand;
		if (typeof cmd == "undefined") return helpAll();
		printVersion();
		epilog();
		console.log("");
		if (cmd.longDescription) console.log(cmd.longDescription);
		else console.log(cmd.description);
		console.log("Usage: ");
		console.log("        snarkjs " + cmd.cmd);
		const pl = parseLine(cmd.cmd);
		let S = "   or   snarkjs ";
		if (cmd.alias) {
			if (Array.isArray(cmd.alias)) S += cmd.alias[0];
			else S += cmd.alias;
		} else S += pl.cmd.join(" ");
		S += " " + pl.params.join(" ");
		console.log(S);
		console.log("");
	}
}
//#endregion
//#region src/keypair.js
function hashToG2(curve, hash) {
	const hashV = new DataView(hash.buffer, hash.byteOffset, hash.byteLength);
	const seed = [];
	for (let i = 0; i < 8; i++) seed[i] = hashV.getUint32(i * 4);
	const rng = new ffjavascript.ChaCha(seed);
	return curve.G2.fromRng(rng);
}
function getG2sp(curve, persinalization, challenge, g1s, g1sx) {
	const h = _noble_hashes_blake2_js.blake2b.create({ dkLen: 64 });
	const b1 = new Uint8Array([persinalization]);
	h.update(b1);
	h.update(challenge);
	const b3 = curve.G1.toUncompressed(g1s);
	h.update(b3);
	const b4 = curve.G1.toUncompressed(g1sx);
	h.update(b4);
	return hashToG2(curve, h.digest());
}
function calculatePubKey(k, curve, personalization, challengeHash, rng) {
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
//#endregion
//#region src/curves.js
var bls12381r = ffjavascript.Scalar.e("73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001", 16);
var bn128r = ffjavascript.Scalar.e("21888242871839275222246405745257275088548364400416034343698204186575808495617");
var bls12381q = ffjavascript.Scalar.e("1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaab", 16);
var bn128q = ffjavascript.Scalar.e("21888242871839275222246405745257275088696311157297823662689037894645226208583");
async function getCurveFromR(r, options) {
	let curve;
	let singleThread = options && options.singleThread;
	if (ffjavascript.Scalar.eq(r, bn128r)) curve = await (0, ffjavascript.buildBn128)(singleThread);
	else if (ffjavascript.Scalar.eq(r, bls12381r)) curve = await (0, ffjavascript.buildBls12381)(singleThread);
	else throw new Error(`Curve not supported: ${ffjavascript.Scalar.toString(r)}`);
	return curve;
}
async function getCurveFromQ(q, options) {
	let curve;
	let singleThread = options && options.singleThread;
	if (ffjavascript.Scalar.eq(q, bn128q)) curve = await (0, ffjavascript.buildBn128)(singleThread);
	else if (ffjavascript.Scalar.eq(q, bls12381q)) curve = await (0, ffjavascript.buildBls12381)(singleThread);
	else throw new Error(`Curve not supported: ${ffjavascript.Scalar.toString(q)}`);
	return curve;
}
async function getCurveFromName(name, options) {
	let curve;
	let singleThread = options && options.singleThread;
	const normName = normalizeName(name);
	if ([
		"BN128",
		"BN254",
		"ALTBN128"
	].indexOf(normName) >= 0) curve = await (0, ffjavascript.buildBn128)(singleThread);
	else if (["BLS12381"].indexOf(normName) >= 0) curve = await (0, ffjavascript.buildBls12381)(singleThread);
	else throw new Error(`Curve not supported: ${name}`);
	return curve;
	function normalizeName(n) {
		return n.toUpperCase().match(/[A-Za-z0-9]+/g).join("");
	}
}
//#endregion
//#region src/powersoftau_utils.js
async function writePTauHeader(fd, curve, power, ceremonyPower) {
	if (!ceremonyPower) ceremonyPower = power;
	await fd.writeULE32(1);
	const pHeaderSize = fd.pos;
	await fd.writeULE64(0);
	await fd.writeULE32(curve.F1.n64 * 8);
	const buff = new Uint8Array(curve.F1.n8);
	ffjavascript.Scalar.toRprLE(buff, 0, curve.q, curve.F1.n8);
	await fd.write(buff);
	await fd.writeULE32(power);
	await fd.writeULE32(ceremonyPower);
	const headerSize = fd.pos - pHeaderSize - 8;
	const oldPos = fd.pos;
	await fd.writeULE64(headerSize, pHeaderSize);
	fd.pos = oldPos;
}
async function readPTauHeader(fd, sections) {
	/* c8 ignore start */
	if (!sections[1]) throw new Error(fd.fileName + ": File has no  header");
	/* c8 ignore stop */
	/* c8 ignore start */
	if (sections[1].length > 1) throw new Error(fd.fileName + ": File has more than one header");
	/* c8 ignore stop */
	fd.pos = sections[1][0].p;
	const n8 = await fd.readULE32();
	const buff = await fd.read(n8);
	const curve = await getCurveFromQ(ffjavascript.Scalar.fromRprLE(buff));
	/* c8 ignore start */
	if (curve.F1.n64 * 8 != n8) throw new Error(fd.fileName + ": Invalid size");
	/* c8 ignore stop */
	const power = await fd.readULE32();
	const ceremonyPower = await fd.readULE32();
	/* c8 ignore start */
	if (fd.pos - sections[1][0].p != sections[1][0].size) throw new Error("Invalid PTau header size");
	/* c8 ignore stop */
	return {
		curve,
		power,
		ceremonyPower
	};
}
async function readPtauPubKey(fd, curve, montgomery) {
	return fromPtauPubKeyRpr(await fd.read(curve.F1.n8 * 2 * 6 + curve.F2.n8 * 2 * 3), 0, curve, montgomery);
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
		if (montgomery) p = curve.G1.fromRprLEM(buff, pos);
		else p = curve.G1.fromRprUncompressed(buff, pos);
		pos += curve.G1.F.n8 * 2;
		return p;
	}
	function readG2() {
		let p;
		if (montgomery) p = curve.G2.fromRprLEM(buff, pos);
		else p = curve.G2.fromRprUncompressed(buff, pos);
		pos += curve.G2.F.n8 * 2;
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
		if (montgomery) curve.G1.toRprLEM(buff, pos, p);
		else curve.G1.toRprUncompressed(buff, pos, p);
		pos += curve.F1.n8 * 2;
	}
	async function writeG2(p) {
		if (montgomery) curve.G2.toRprLEM(buff, pos, p);
		else curve.G2.toRprUncompressed(buff, pos, p);
		pos += curve.F2.n8 * 2;
	}
	return buff;
}
async function writePtauPubKey(fd, curve, key, montgomery) {
	const buff = new Uint8Array(curve.F1.n8 * 2 * 6 + curve.F2.n8 * 2 * 3);
	toPtauPubKeyRpr(buff, 0, curve, key, montgomery);
	await fd.write(buff);
}
async function readContribution$1(fd, curve) {
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
	const buffV = new Uint8Array(curve.G1.F.n8 * 2 * 6 + curve.G2.F.n8 * 2 * 3);
	toPtauPubKeyRpr(buffV, 0, curve, c.key, false);
	const responseHasher = fromPartialHash(c.partialHash);
	responseHasher.update(buffV);
	c.responseHash = responseHasher.digest();
	const paramLength = await fd.readULE32();
	const curPos = fd.pos;
	let lastType = 0;
	while (fd.pos - curPos < paramLength) {
		const buffType = await readDV(1);
		/* c8 ignore start */
		if (buffType[0] <= lastType) throw new Error("Parameters in the contribution must be sorted");
		/* c8 ignore stop */
		lastType = buffType[0];
		if (buffType[0] == 1) {
			const buffStr = await readDV((await readDV(1))[0]);
			c.name = new TextDecoder().decode(buffStr);
		} else if (buffType[0] == 2) c.numIterationsExp = (await readDV(1))[0];
		else if (buffType[0] == 3) c.beaconHash = await readDV((await readDV(1))[0]);
		else
 /* c8 ignore start */
		throw new Error("Parameter not recognized");
	}
	/* c8 ignore start */
	if (fd.pos != curPos + paramLength) throw new Error("Parameters do not match");
	/* c8 ignore stop */
	return c;
	async function readG1() {
		const pBuff = await fd.read(curve.G1.F.n8 * 2);
		return curve.G1.fromRprLEM(pBuff);
	}
	async function readG2() {
		const pBuff = await fd.read(curve.G2.F.n8 * 2);
		return curve.G2.fromRprLEM(pBuff);
	}
	async function readDV(n) {
		const b = await fd.read(n);
		return new Uint8Array(b);
	}
}
async function readContributions(fd, curve, sections) {
	/* c8 ignore start */
	if (!sections[7]) throw new Error(fd.fileName + ": File has no  contributions");
	/* c8 ignore stop */
	/* c8 ignore start */
	if (sections[7][0].length > 1) throw new Error(fd.fileName + ": File has more than one contributions section");
	/* c8 ignore stop */
	fd.pos = sections[7][0].p;
	const nContributions = await fd.readULE32();
	const contributions = [];
	for (let i = 0; i < nContributions; i++) {
		const c = await readContribution$1(fd, curve);
		c.id = i + 1;
		contributions.push(c);
	}
	/* c8 ignore start */
	if (fd.pos - sections[7][0].p != sections[7][0].size) throw new Error("Invalid contribution section size");
	/* c8 ignore stop */
	return contributions;
}
async function writeContribution$1(fd, curve, contribution) {
	const buffG1 = new Uint8Array(curve.F1.n8 * 2);
	const buffG2 = new Uint8Array(curve.F2.n8 * 2);
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
		params.push(1);
		const nameData = new TextEncoder("utf-8").encode(contribution.name.substring(0, 64));
		params.push(nameData.byteLength);
		for (let i = 0; i < nameData.byteLength; i++) params.push(nameData[i]);
	}
	if (contribution.type == 1) {
		params.push(2);
		params.push(contribution.numIterationsExp);
		params.push(3);
		params.push(contribution.beaconHash.byteLength);
		for (let i = 0; i < contribution.beaconHash.byteLength; i++) params.push(contribution.beaconHash[i]);
	}
	if (params.length > 0) {
		const paramsBuff = new Uint8Array(params);
		await fd.writeULE32(paramsBuff.byteLength);
		await fd.write(paramsBuff);
	} else await fd.writeULE32(0);
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
	await fd.writeULE32(7);
	const pContributionsSize = fd.pos;
	await fd.writeULE64(0);
	await fd.writeULE32(contributions.length);
	for (let i = 0; i < contributions.length; i++) await writeContribution$1(fd, curve, contributions[i]);
	const contributionsSize = fd.pos - pContributionsSize - 8;
	const oldPos = fd.pos;
	await fd.writeULE64(contributionsSize, pContributionsSize);
	fd.pos = oldPos;
}
function calculateFirstChallengeHash(curve, power, logger) {
	if (logger) logger.debug("Calculating First Challenge Hash");
	const hasher = _noble_hashes_blake2_js.blake2b.create({ dkLen: 64 });
	const vG1 = new Uint8Array(curve.G1.F.n8 * 2);
	const vG2 = new Uint8Array(curve.G2.F.n8 * 2);
	curve.G1.toRprUncompressed(vG1, 0, curve.G1.g);
	curve.G2.toRprUncompressed(vG2, 0, curve.G2.g);
	hasher.update(_noble_hashes_blake2_js.blake2b.create({ dkLen: 64 }).digest());
	let n;
	n = 2 ** power * 2 - 1;
	if (logger) logger.debug("Calculate Initial Hash: tauG1");
	hashBlock(vG1, n);
	n = 2 ** power;
	if (logger) logger.debug("Calculate Initial Hash: tauG2");
	hashBlock(vG2, n);
	if (logger) logger.debug("Calculate Initial Hash: alphaTauG1");
	hashBlock(vG1, n);
	if (logger) logger.debug("Calculate Initial Hash: betaTauG1");
	hashBlock(vG1, n);
	hasher.update(vG2);
	return hasher.digest();
	function hashBlock(buff, n) {
		const blockSize = 341e3;
		const nBlocks = Math.floor(n / blockSize);
		const rem = n % blockSize;
		const bigBuff = new Uint8Array(blockSize * buff.byteLength);
		for (let i = 0; i < blockSize; i++) bigBuff.set(buff, i * buff.byteLength);
		/* c8 ignore start */
		for (let i = 0; i < nBlocks; i++) {
			hasher.update(bigBuff);
			if (logger) logger.debug("Initial hash: " + i * blockSize);
		}
		/* c8 ignore stop */
		for (let i = 0; i < rem; i++) hasher.update(buff);
	}
}
async function keyFromBeacon(curve, challengeHash, beaconHash, numIterationsExp) {
	return createPTauKey(curve, challengeHash, await rngFromBeaconParams(beaconHash, numIterationsExp));
}
//#endregion
//#region src/powersoftau_new.js
async function newAccumulator(curve, power, fileName, logger) {
	const fd = await _iden3_binfileutils.createBinFile(fileName, "ptau", 1, 7);
	await writePTauHeader(fd, curve, power, 0);
	const buffG1 = curve.G1.oneAffine;
	const buffG2 = curve.G2.oneAffine;
	await _iden3_binfileutils.startWriteSection(fd, 2);
	const nTauG1 = 2 ** power * 2 - 1;
	for (let i = 0; i < nTauG1; i++) {
		await fd.write(buffG1);
		if (logger && i % 1e5 == 0 && i) logger.log("tauG1: " + i);
	}
	await _iden3_binfileutils.endWriteSection(fd);
	await _iden3_binfileutils.startWriteSection(fd, 3);
	const nTauG2 = 2 ** power;
	for (let i = 0; i < nTauG2; i++) {
		await fd.write(buffG2);
		if (logger && i % 1e5 == 0 && i) logger.log("tauG2: " + i);
	}
	await _iden3_binfileutils.endWriteSection(fd);
	await _iden3_binfileutils.startWriteSection(fd, 4);
	const nAlfaTauG1 = 2 ** power;
	for (let i = 0; i < nAlfaTauG1; i++) {
		await fd.write(buffG1);
		if (logger && i % 1e5 == 0 && i) logger.log("alphaTauG1: " + i);
	}
	await _iden3_binfileutils.endWriteSection(fd);
	await _iden3_binfileutils.startWriteSection(fd, 5);
	const nBetaTauG1 = 2 ** power;
	for (let i = 0; i < nBetaTauG1; i++) {
		await fd.write(buffG1);
		if (logger && i % 1e5 == 0 && i) logger.log("betaTauG1: " + i);
	}
	await _iden3_binfileutils.endWriteSection(fd);
	await _iden3_binfileutils.startWriteSection(fd, 6);
	await fd.write(buffG2);
	await _iden3_binfileutils.endWriteSection(fd);
	await _iden3_binfileutils.startWriteSection(fd, 7);
	await fd.writeULE32(0);
	await _iden3_binfileutils.endWriteSection(fd);
	await fd.close();
	const firstChallengeHash = calculateFirstChallengeHash(curve, power, logger);
	if (logger) logger.debug(formatHash(_noble_hashes_blake2_js.blake2b.create({ dkLen: 64 }).digest(), "Blank Contribution Hash:"));
	if (logger) logger.info(formatHash(firstChallengeHash, "First Contribution Hash:"));
	return firstChallengeHash;
}
//#endregion
//#region src/powersoftau_export_challenge.js
async function exportChallenge(pTauFilename, challengeFilename, logger) {
	const { fd: fdFrom, sections } = await _iden3_binfileutils.readBinFile(pTauFilename, "ptau", 1);
	const { curve, power } = await readPTauHeader(fdFrom, sections);
	const contributions = await readContributions(fdFrom, curve, sections);
	let lastResponseHash, curChallengeHash;
	if (contributions.length == 0) {
		lastResponseHash = _noble_hashes_blake2_js.blake2b.create({ dkLen: 64 }).digest();
		curChallengeHash = calculateFirstChallengeHash(curve, power);
	} else {
		lastResponseHash = contributions[contributions.length - 1].responseHash;
		curChallengeHash = contributions[contributions.length - 1].nextChallenge;
	}
	if (logger) logger.info(formatHash(lastResponseHash, "Last Response Hash: "));
	if (logger) logger.info(formatHash(curChallengeHash, "New Challenge Hash: "));
	const fdTo = await fastfile.createOverride(challengeFilename);
	const toHash = _noble_hashes_blake2_js.blake2b.create({ dkLen: 64 });
	await fdTo.write(lastResponseHash);
	toHash.update(lastResponseHash);
	await exportSection(2, "G1", 2 ** power * 2 - 1, "tauG1");
	await exportSection(3, "G2", 2 ** power, "tauG2");
	await exportSection(4, "G1", 2 ** power, "alphaTauG1");
	await exportSection(5, "G1", 2 ** power, "betaTauG1");
	await exportSection(6, "G2", 1, "betaG2");
	await fdFrom.close();
	await fdTo.close();
	const calcCurChallengeHash = toHash.digest();
	if (!hashIsEqual(curChallengeHash, calcCurChallengeHash)) {
		if (logger) logger.info(formatHash(calcCurChallengeHash, "Calc Curret Challenge Hash: "));
		if (logger) logger.error("PTau file is corrupted. Calculated new challenge hash does not match with the eclared one");
		throw new Error("PTau file is corrupted. Calculated new challenge hash does not match with the eclared one");
	}
	return curChallengeHash;
	async function exportSection(sectionId, groupName, nPoints, sectionName) {
		const G = curve[groupName];
		const sG = G.F.n8 * 2;
		const nPointsChunk = Math.floor((1 << 24) / sG);
		await _iden3_binfileutils.startReadUniqueSection(fdFrom, sections, sectionId);
		for (let i = 0; i < nPoints; i += nPointsChunk) {
			if (logger) logger.debug(`Exporting ${sectionName}: ${i}/${nPoints}`);
			const n = Math.min(nPoints - i, nPointsChunk);
			let buff;
			buff = await fdFrom.read(n * sG);
			buff = await G.batchLEMtoU(buff);
			await fdTo.write(buff);
			toHash.update(buff);
		}
		await _iden3_binfileutils.endReadSection(fdFrom);
	}
}
//#endregion
//#region src/powersoftau_import.js
async function importResponse(oldPtauFilename, contributionFilename, newPTauFilename, name, importPoints, logger) {
	const noHash = /* @__PURE__ */ new Uint8Array(64);
	for (let i = 0; i < 64; i++) noHash[i] = 255;
	const { fd: fdOld, sections } = await _iden3_binfileutils.readBinFile(oldPtauFilename, "ptau", 1);
	const { curve, power } = await readPTauHeader(fdOld, sections);
	const contributions = await readContributions(fdOld, curve, sections);
	const currentContribution = {};
	if (name) currentContribution.name = name;
	const sG1 = curve.F1.n8 * 2;
	const scG1 = curve.F1.n8;
	const sG2 = curve.F2.n8 * 2;
	const scG2 = curve.F2.n8;
	const fdResponse = await fastfile.readExisting(contributionFilename);
	if (fdResponse.totalSize != 64 + (2 ** power * 2 - 1) * scG1 + 2 ** power * scG2 + 2 ** power * scG1 + 2 ** power * scG1 + scG2 + sG1 * 6 + sG2 * 3) throw new Error("Size of the contribution is invalid");
	let lastChallengeHash;
	if (contributions.length > 0) lastChallengeHash = contributions[contributions.length - 1].nextChallenge;
	else lastChallengeHash = calculateFirstChallengeHash(curve, power, logger);
	const fdNew = await _iden3_binfileutils.createBinFile(newPTauFilename, "ptau", 1, importPoints ? 7 : 2);
	await writePTauHeader(fdNew, curve, power);
	const contributionPreviousHash = await fdResponse.read(64);
	if (hashIsEqual(noHash, lastChallengeHash)) {
		lastChallengeHash = contributionPreviousHash;
		contributions[contributions.length - 1].nextChallenge = lastChallengeHash;
	}
	if (!hashIsEqual(contributionPreviousHash, lastChallengeHash)) throw new Error("Wrong contribution. This contribution is not based on the previous hash");
	const hasherResponse = _noble_hashes_blake2_js.blake2b.create({ dkLen: 64 });
	hasherResponse.update(contributionPreviousHash);
	const startSections = [];
	let res;
	res = await processSection(fdResponse, fdNew, "G1", 2, 2 ** power * 2 - 1, [1], "tauG1");
	currentContribution.tauG1 = res[0];
	res = await processSection(fdResponse, fdNew, "G2", 3, 2 ** power, [1], "tauG2");
	currentContribution.tauG2 = res[0];
	res = await processSection(fdResponse, fdNew, "G1", 4, 2 ** power, [0], "alphaG1");
	currentContribution.alphaG1 = res[0];
	res = await processSection(fdResponse, fdNew, "G1", 5, 2 ** power, [0], "betaG1");
	currentContribution.betaG1 = res[0];
	res = await processSection(fdResponse, fdNew, "G2", 6, 1, [0], "betaG2");
	currentContribution.betaG2 = res[0];
	currentContribution.partialHash = toPartialHash(hasherResponse);
	const buffKey = await fdResponse.read(curve.F1.n8 * 2 * 6 + curve.F2.n8 * 2 * 3);
	currentContribution.key = fromPtauPubKeyRpr(buffKey, 0, curve, false);
	hasherResponse.update(new Uint8Array(buffKey));
	const hashResponse = hasherResponse.digest();
	if (logger) logger.info(formatHash(hashResponse, "Contribution Response Hash imported: "));
	if (importPoints) {
		const nextChallengeHasher = _noble_hashes_blake2_js.blake2b.create({ dkLen: 64 });
		nextChallengeHasher.update(hashResponse);
		await hashSection(nextChallengeHasher, fdNew, "G1", 2, 2 ** power * 2 - 1, "tauG1", logger);
		await hashSection(nextChallengeHasher, fdNew, "G2", 3, 2 ** power, "tauG2", logger);
		await hashSection(nextChallengeHasher, fdNew, "G1", 4, 2 ** power, "alphaTauG1", logger);
		await hashSection(nextChallengeHasher, fdNew, "G1", 5, 2 ** power, "betaTauG1", logger);
		await hashSection(nextChallengeHasher, fdNew, "G2", 6, 1, "betaG2", logger);
		currentContribution.nextChallenge = nextChallengeHasher.digest();
		if (logger) logger.info(formatHash(currentContribution.nextChallenge, "Next Challenge Hash: "));
	} else currentContribution.nextChallenge = noHash;
	contributions.push(currentContribution);
	await writeContributions(fdNew, curve, contributions);
	await fdResponse.close();
	await fdNew.close();
	await fdOld.close();
	return currentContribution.nextChallenge;
	async function processSection(fdFrom, fdTo, groupName, sectionId, nPoints, singularPointIndexes, sectionName) {
		if (importPoints) return await processSectionImportPoints(fdFrom, fdTo, groupName, sectionId, nPoints, singularPointIndexes, sectionName);
		else return await processSectionNoImportPoints(fdFrom, fdTo, groupName, sectionId, nPoints, singularPointIndexes, sectionName);
	}
	async function processSectionImportPoints(fdFrom, fdTo, groupName, sectionId, nPoints, singularPointIndexes, sectionName) {
		const G = curve[groupName];
		const scG = G.F.n8;
		const sG = G.F.n8 * 2;
		const singularPoints = [];
		await _iden3_binfileutils.startWriteSection(fdTo, sectionId);
		const nPointsChunk = Math.floor((1 << 24) / sG);
		startSections[sectionId] = fdTo.pos;
		for (let i = 0; i < nPoints; i += nPointsChunk) {
			if (logger) logger.debug(`Importing ${sectionName}: ${i}/${nPoints}`);
			const n = Math.min(nPoints - i, nPointsChunk);
			const buffC = await fdFrom.read(n * scG);
			hasherResponse.update(buffC);
			const buffLEM = await G.batchCtoLEM(buffC);
			await fdTo.write(buffLEM);
			for (let j = 0; j < singularPointIndexes.length; j++) {
				const sp = singularPointIndexes[j];
				if (sp >= i && sp < i + n) {
					const P = G.fromRprLEM(buffLEM, (sp - i) * sG);
					singularPoints.push(P);
				}
			}
		}
		await _iden3_binfileutils.endWriteSection(fdTo);
		return singularPoints;
	}
	async function processSectionNoImportPoints(fdFrom, fdTo, groupName, sectionId, nPoints, singularPointIndexes, sectionName) {
		const G = curve[groupName];
		const scG = G.F.n8;
		const singularPoints = [];
		const nPointsChunk = Math.floor((1 << 24) / scG);
		for (let i = 0; i < nPoints; i += nPointsChunk) {
			if (logger) logger.debug(`Importing ${sectionName}: ${i}/${nPoints}`);
			const n = Math.min(nPoints - i, nPointsChunk);
			const buffC = await fdFrom.read(n * scG);
			hasherResponse.update(buffC);
			for (let j = 0; j < singularPointIndexes.length; j++) {
				const sp = singularPointIndexes[j];
				if (sp >= i && sp < i + n) {
					const P = G.fromRprCompressed(buffC, (sp - i) * scG);
					singularPoints.push(P);
				}
			}
		}
		return singularPoints;
	}
	async function hashSection(nextChallengeHasher, fdTo, groupName, sectionId, nPoints, sectionName, logger) {
		const G = curve[groupName];
		const sG = G.F.n8 * 2;
		const nPointsChunk = Math.floor((1 << 24) / sG);
		const oldPos = fdTo.pos;
		fdTo.pos = startSections[sectionId];
		for (let i = 0; i < nPoints; i += nPointsChunk) {
			if (logger) logger.debug(`Hashing ${sectionName}: ${i}/${nPoints}`);
			const n = Math.min(nPoints - i, nPointsChunk);
			const buffLEM = await fdTo.read(n * sG);
			const buffU = await G.batchLEMtoU(buffLEM);
			nextChallengeHasher.update(buffU);
		}
		fdTo.pos = oldPos;
	}
}
//#endregion
//#region src/powersoftau_verify.js
var sameRatio$1 = sameRatio$2;
async function verifyContribution(curve, cur, prev, logger) {
	let sr;
	if (cur.type == 1) {
		const beaconKey = await keyFromBeacon(curve, prev.nextChallenge, cur.beaconHash, cur.numIterationsExp);
		if (!curve.G1.eq(cur.key.tau.g1_s, beaconKey.tau.g1_s)) {
			if (logger) logger.error(`BEACON key (tauG1_s) is not generated correctly in challenge #${cur.id}  ${cur.name || ""}`);
			return false;
		}
		if (!curve.G1.eq(cur.key.tau.g1_sx, beaconKey.tau.g1_sx)) {
			if (logger) logger.error(`BEACON key (tauG1_sx) is not generated correctly in challenge #${cur.id}  ${cur.name || ""}`);
			return false;
		}
		if (!curve.G2.eq(cur.key.tau.g2_spx, beaconKey.tau.g2_spx)) {
			if (logger) logger.error(`BEACON key (tauG2_spx) is not generated correctly in challenge #${cur.id}  ${cur.name || ""}`);
			return false;
		}
		if (!curve.G1.eq(cur.key.alpha.g1_s, beaconKey.alpha.g1_s)) {
			if (logger) logger.error(`BEACON key (alphaG1_s) is not generated correctly in challenge #${cur.id}  ${cur.name || ""}`);
			return false;
		}
		if (!curve.G1.eq(cur.key.alpha.g1_sx, beaconKey.alpha.g1_sx)) {
			if (logger) logger.error(`BEACON key (alphaG1_sx) is not generated correctly in challenge #${cur.id}  ${cur.name || ""}`);
			return false;
		}
		if (!curve.G2.eq(cur.key.alpha.g2_spx, beaconKey.alpha.g2_spx)) {
			if (logger) logger.error(`BEACON key (alphaG2_spx) is not generated correctly in challenge #${cur.id}  ${cur.name || ""}`);
			return false;
		}
		if (!curve.G1.eq(cur.key.beta.g1_s, beaconKey.beta.g1_s)) {
			if (logger) logger.error(`BEACON key (betaG1_s) is not generated correctly in challenge #${cur.id}  ${cur.name || ""}`);
			return false;
		}
		if (!curve.G1.eq(cur.key.beta.g1_sx, beaconKey.beta.g1_sx)) {
			if (logger) logger.error(`BEACON key (betaG1_sx) is not generated correctly in challenge #${cur.id}  ${cur.name || ""}`);
			return false;
		}
		if (!curve.G2.eq(cur.key.beta.g2_spx, beaconKey.beta.g2_spx)) {
			if (logger) logger.error(`BEACON key (betaG2_spx) is not generated correctly in challenge #${cur.id}  ${cur.name || ""}`);
			return false;
		}
	}
	cur.key.tau.g2_sp = curve.G2.toAffine(getG2sp(curve, 0, prev.nextChallenge, cur.key.tau.g1_s, cur.key.tau.g1_sx));
	cur.key.alpha.g2_sp = curve.G2.toAffine(getG2sp(curve, 1, prev.nextChallenge, cur.key.alpha.g1_s, cur.key.alpha.g1_sx));
	cur.key.beta.g2_sp = curve.G2.toAffine(getG2sp(curve, 2, prev.nextChallenge, cur.key.beta.g1_s, cur.key.beta.g1_sx));
	sr = await sameRatio$1(curve, cur.key.tau.g1_s, cur.key.tau.g1_sx, cur.key.tau.g2_sp, cur.key.tau.g2_spx);
	if (sr !== true) {
		if (logger) logger.error("INVALID key (tau) in challenge #" + cur.id);
		return false;
	}
	sr = await sameRatio$1(curve, cur.key.alpha.g1_s, cur.key.alpha.g1_sx, cur.key.alpha.g2_sp, cur.key.alpha.g2_spx);
	if (sr !== true) {
		if (logger) logger.error("INVALID key (alpha) in challenge #" + cur.id);
		return false;
	}
	sr = await sameRatio$1(curve, cur.key.beta.g1_s, cur.key.beta.g1_sx, cur.key.beta.g2_sp, cur.key.beta.g2_spx);
	if (sr !== true) {
		if (logger) logger.error("INVALID key (beta) in challenge #" + cur.id);
		return false;
	}
	sr = await sameRatio$1(curve, prev.tauG1, cur.tauG1, cur.key.tau.g2_sp, cur.key.tau.g2_spx);
	if (sr !== true) {
		if (logger) logger.error("INVALID tau*G1. challenge #" + cur.id + " It does not follow the previous contribution");
		return false;
	}
	sr = await sameRatio$1(curve, cur.key.tau.g1_s, cur.key.tau.g1_sx, prev.tauG2, cur.tauG2);
	if (sr !== true) {
		if (logger) logger.error("INVALID tau*G2. challenge #" + cur.id + " It does not follow the previous contribution");
		return false;
	}
	sr = await sameRatio$1(curve, prev.alphaG1, cur.alphaG1, cur.key.alpha.g2_sp, cur.key.alpha.g2_spx);
	if (sr !== true) {
		if (logger) logger.error("INVALID alpha*G1. challenge #" + cur.id + " It does not follow the previous contribution");
		return false;
	}
	sr = await sameRatio$1(curve, prev.betaG1, cur.betaG1, cur.key.beta.g2_sp, cur.key.beta.g2_spx);
	if (sr !== true) {
		if (logger) logger.error("INVALID beta*G1. challenge #" + cur.id + " It does not follow the previous contribution");
		return false;
	}
	sr = await sameRatio$1(curve, cur.key.beta.g1_s, cur.key.beta.g1_sx, prev.betaG2, cur.betaG2);
	if (sr !== true) {
		if (logger) logger.error("INVALID beta*G2. challenge #" + cur.id + "It does not follow the previous contribution");
		return false;
	}
	if (logger) logger.info("Powers Of tau file OK!");
	return true;
}
async function verify(tauFilename, logger) {
	const fds = {};
	try {
		return await _verify(tauFilename, logger, fds);
	} finally {
		for (const openFd of [fds.fd]) try {
			if (openFd) await openFd.close();
		} catch (e) {}
	}
}
async function _verify(tauFilename, logger, fds) {
	let sr;
	const { fd, sections } = await _iden3_binfileutils.readBinFile(tauFilename, "ptau", 1);
	fds.fd = fd;
	const { curve, power, ceremonyPower } = await readPTauHeader(fd, sections);
	const contrs = await readContributions(fd, curve, sections);
	if (logger) logger.debug("power: 2**" + power);
	if (logger) logger.debug("Computing initial contribution hash");
	const initialContribution = {
		tauG1: curve.G1.g,
		tauG2: curve.G2.g,
		alphaG1: curve.G1.g,
		betaG1: curve.G1.g,
		betaG2: curve.G2.g,
		nextChallenge: calculateFirstChallengeHash(curve, ceremonyPower, logger),
		responseHash: _noble_hashes_blake2_js.blake2b.create({ dkLen: 64 }).digest()
	};
	if (contrs.length == 0) {
		if (logger) logger.error("This file has no contribution! It cannot be used in production");
		return false;
	}
	let prevContr;
	if (contrs.length > 1) prevContr = contrs[contrs.length - 2];
	else prevContr = initialContribution;
	const curContr = contrs[contrs.length - 1];
	if (logger) logger.debug("Validating contribution #" + contrs[contrs.length - 1].id);
	if (!await verifyContribution(curve, curContr, prevContr, logger)) return false;
	const nextContributionHasher = _noble_hashes_blake2_js.blake2b.create({ dkLen: 64 });
	nextContributionHasher.update(curContr.responseHash);
	if (logger) logger.debug("Verifying powers in tau*G1 section");
	const rTau1 = await processSection(2, "G1", "tauG1", 2 ** power * 2 - 1, [0, 1], logger);
	sr = await sameRatio$1(curve, rTau1.R1, rTau1.R2, curve.G2.g, curContr.tauG2);
	if (sr !== true) {
		if (logger) logger.error("tauG1 section. Powers do not match");
		return false;
	}
	/* c8 ignore start */
	if (!curve.G1.eq(curve.G1.g, rTau1.singularPoints[0])) {
		if (logger) logger.error("First element of tau*G1 section must be the generator");
		return false;
	}
	/* c8 ignore stop */
	/* c8 ignore start */
	if (!curve.G1.eq(curContr.tauG1, rTau1.singularPoints[1])) {
		if (logger) logger.error("Second element of tau*G1 section does not match the one in the contribution section");
		return false;
	}
	/* c8 ignore stop */
	if (logger) logger.debug("Verifying powers in tau*G2 section");
	const rTau2 = await processSection(3, "G2", "tauG2", 2 ** power, [0, 1], logger);
	sr = await sameRatio$1(curve, curve.G1.g, curContr.tauG1, rTau2.R1, rTau2.R2);
	if (sr !== true) {
		if (logger) logger.error("tauG2 section. Powers do not match");
		return false;
	}
	/* c8 ignore start */
	if (!curve.G2.eq(curve.G2.g, rTau2.singularPoints[0])) {
		if (logger) logger.error("First element of tau*G2 section must be the generator");
		return false;
	}
	/* c8 ignore stop */
	/* c8 ignore start */
	if (!curve.G2.eq(curContr.tauG2, rTau2.singularPoints[1])) {
		if (logger) logger.error("Second element of tau*G2 section does not match the one in the contribution section");
		return false;
	}
	/* c8 ignore stop */
	if (logger) logger.debug("Verifying powers in alpha*tau*G1 section");
	const rAlphaTauG1 = await processSection(4, "G1", "alphatauG1", 2 ** power, [0], logger);
	sr = await sameRatio$1(curve, rAlphaTauG1.R1, rAlphaTauG1.R2, curve.G2.g, curContr.tauG2);
	if (sr !== true) {
		if (logger) logger.error("alphaTauG1 section. Powers do not match");
		return false;
	}
	/* c8 ignore start */
	if (!curve.G1.eq(curContr.alphaG1, rAlphaTauG1.singularPoints[0])) {
		if (logger) logger.error("First element of alpha*tau*G1 section (alpha*G1) does not match the one in the contribution section");
		return false;
	}
	/* c8 ignore stop */
	if (logger) logger.debug("Verifying powers in beta*tau*G1 section");
	const rBetaTauG1 = await processSection(5, "G1", "betatauG1", 2 ** power, [0], logger);
	sr = await sameRatio$1(curve, rBetaTauG1.R1, rBetaTauG1.R2, curve.G2.g, curContr.tauG2);
	if (sr !== true) {
		if (logger) logger.error("betaTauG1 section. Powers do not match");
		return false;
	}
	/* c8 ignore start */
	if (!curve.G1.eq(curContr.betaG1, rBetaTauG1.singularPoints[0])) {
		if (logger) logger.error("First element of beta*tau*G1 section (beta*G1) does not match the one in the contribution section");
		return false;
	}
	/* c8 ignore stop */
	const betaG2 = await processSectionBetaG2(logger);
	if (!curve.G2.eq(curContr.betaG2, betaG2)) {
		if (logger) logger.error("betaG2 element in betaG2 section does not match the one in the contribution section");
		return false;
	}
	const nextContributionHash = nextContributionHasher.digest();
	if (power == ceremonyPower) {
		if (!hashIsEqual(nextContributionHash, curContr.nextChallenge)) {
			if (logger) logger.error("Hash of the values does not match the next challenge of the last contributor in the contributions section");
			return false;
		}
	}
	if (logger) logger.info(formatHash(nextContributionHash, "Next challenge hash: "));
	printContribution(curContr, prevContr);
	for (let i = contrs.length - 2; i >= 0; i--) {
		const curContr = contrs[i];
		const prevContr = i > 0 ? contrs[i - 1] : initialContribution;
		if (!await verifyContribution(curve, curContr, prevContr, logger)) return false;
		printContribution(curContr, prevContr, logger);
	}
	if (logger) logger.info("-----------------------------------------------------");
	if (!sections[12] || !sections[13] || !sections[14] || !sections[15]) {
		if (logger) logger.warn("this file does not contain phase2 precalculated values. Please run: \n   snarkjs \"powersoftau preparephase2\" to prepare this file to be used in the phase2 ceremony.");
	} else {
		let res;
		res = await verifyLagrangeEvaluations("G1", 2, 12, "tauG1", logger);
		/* c8 ignore start */
		if (!res) return false;
		/* c8 ignore stop */
		res = await verifyLagrangeEvaluations("G2", 3, 13, "tauG2", logger);
		/* c8 ignore start */
		if (!res) return false;
		/* c8 ignore stop */
		res = await verifyLagrangeEvaluations("G1", 4, 14, "alphaTauG1", logger);
		/* c8 ignore start */
		if (!res) return false;
		/* c8 ignore stop */
		res = await verifyLagrangeEvaluations("G1", 5, 15, "betaTauG1", logger);
		if (!res) return false;
	}
	await fd.close();
	if (logger) logger.info("Powers of Tau Ok!");
	return true;
	function printContribution(curContr, prevContr) {
		if (!logger) return;
		logger.info("-----------------------------------------------------");
		logger.info(`Contribution #${curContr.id}: ${curContr.name || ""}`);
		logger.info(formatHash(curContr.nextChallenge, "Next Challenge: "));
		const buffV = new Uint8Array(curve.G1.F.n8 * 2 * 6 + curve.G2.F.n8 * 2 * 3);
		toPtauPubKeyRpr(buffV, 0, curve, curContr.key, false);
		const responseHasher = fromPartialHash(curContr.partialHash);
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
		const sG = G.F.n8 * 2;
		const buffUv = new Uint8Array(sG);
		/* c8 ignore start */
		if (!sections[6]) {
			logger.error("File has no BetaG2 section");
			throw new Error("File has no BetaG2 section");
		}
		/* c8 ignore stop */
		/* c8 ignore start */
		if (sections[6].length > 1) {
			logger.error("File has no BetaG2 section");
			throw new Error("File has more than one GetaG2 section");
		}
		/* c8 ignore stop */
		fd.pos = sections[6][0].p;
		const buff = await fd.read(sG);
		const P = G.fromRprLEM(buff);
		G.toRprUncompressed(buffUv, 0, P);
		nextContributionHasher.update(buffUv);
		return P;
	}
	async function processSection(idSection, groupName, sectionName, nPoints, singularPointIndexes, logger) {
		const MAX_CHUNK_SIZE = 65536;
		const G = curve[groupName];
		const sG = G.F.n8 * 2;
		await _iden3_binfileutils.startReadUniqueSection(fd, sections, idSection);
		const singularPoints = [];
		let R1 = G.zero;
		let R2 = G.zero;
		let lastBase = G.zero;
		for (let i = 0; i < nPoints; i += MAX_CHUNK_SIZE) {
			if (logger) logger.debug(`points relations: ${sectionName}: ${i}/${nPoints} `);
			const n = Math.min(nPoints - i, MAX_CHUNK_SIZE);
			const bases = await fd.read(n * sG);
			const basesU = await G.batchLEMtoU(bases);
			nextContributionHasher.update(basesU);
			const scalars = getRandomBytes(4 * (n - 1));
			/* c8 ignore start */
			if (i > 0) {
				const firstBase = G.fromRprLEM(bases, 0);
				const r = readUInt32BE(getRandomBytes(4), 0);
				R1 = G.add(R1, G.timesScalar(lastBase, r));
				R2 = G.add(R2, G.timesScalar(firstBase, r));
			}
			/* c8 ignore stop */
			const r1 = await G.multiExpAffine(bases.slice(0, (n - 1) * sG), scalars);
			const r2 = await G.multiExpAffine(bases.slice(sG), scalars);
			R1 = G.add(R1, r1);
			R2 = G.add(R2, r2);
			lastBase = G.fromRprLEM(bases, (n - 1) * sG);
			for (let j = 0; j < singularPointIndexes.length; j++) {
				const sp = singularPointIndexes[j];
				if (sp >= i && sp < i + n) {
					const P = G.fromRprLEM(bases, (sp - i) * sG);
					singularPoints.push(P);
				}
			}
		}
		await _iden3_binfileutils.endReadSection(fd);
		return {
			R1,
			R2,
			singularPoints
		};
	}
	async function verifyLagrangeEvaluations(gName, tauSection, lagrangeSection, sectionName, logger) {
		if (logger) logger.debug(`Verifying phase2 calculated values ${sectionName}...`);
		const G = curve[gName];
		const sG = G.F.n8 * 2;
		const seed = new Array(8);
		for (let i = 0; i < 8; i++) seed[i] = readUInt32BE(getRandomBytes(4), 0);
		for (let p = 0; p <= power; p++) if (!await verifyPower(p)) return false;
		if (tauSection == 2) {
			/* c8 ignore start */
			if (!await verifyPower(power + 1)) return false;
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
			for (let i = 0; i < nPoints; i++) if (p == power + 1 && i == nPoints - 1) buff_r[i] = 0;
			else buff_r[i] = rng.nextU32();
			buff_r = new Uint8Array(buff_r.buffer, buff_r.byteOffset, buff_r.byteLength);
			if (logger) logger.debug(`reading points Powers${p}...`);
			await _iden3_binfileutils.startReadUniqueSection(fd, sections, tauSection);
			buffG = new ffjavascript.BigBuffer(nPoints * sG);
			if (p == power + 1) {
				await fd.readToBuffer(buffG, 0, (nPoints - 1) * sG);
				buffG.set(curve.G1.zeroAffine, (nPoints - 1) * sG);
			} else await fd.readToBuffer(buffG, 0, nPoints * sG);
			await _iden3_binfileutils.endReadSection(fd, true);
			const resTau = await G.multiExpAffine(buffG, buff_r, logger, sectionName + "_" + p);
			buff_r = new ffjavascript.BigBuffer(nPoints * n8r);
			rng = new ffjavascript.ChaCha(seed);
			const buff4 = /* @__PURE__ */ new Uint8Array(4);
			const buff4V = new DataView(buff4.buffer);
			if (logger) logger.debug(`Creating random numbers Powers${p}...`);
			for (let i = 0; i < nPoints; i++) if (i != nPoints - 1 || p != power + 1) {
				buff4V.setUint32(0, rng.nextU32(), true);
				buff_r.set(buff4, i * n8r);
			}
			if (logger) logger.debug(`batchToMontgomery ${p}...`);
			buff_r = await curve.Fr.batchToMontgomery(buff_r);
			if (logger) logger.debug(`fft ${p}...`);
			buff_r = await curve.Fr.fft(buff_r);
			if (logger) logger.debug(`batchFromMontgomery ${p}...`);
			buff_r = await curve.Fr.batchFromMontgomery(buff_r);
			if (logger) logger.debug(`reading points Lagrange${p}...`);
			await _iden3_binfileutils.startReadUniqueSection(fd, sections, lagrangeSection);
			fd.pos += sG * (2 ** p - 1);
			await fd.readToBuffer(buffG, 0, nPoints * sG);
			await _iden3_binfileutils.endReadSection(fd, true);
			const resLagrange = await G.multiExpAffine(buffG, buff_r, logger, sectionName + "_" + p + "_transformed");
			if (!G.eq(resTau, resLagrange)) {
				if (logger) logger.error("Phase2 caclutation does not match with powers of tau");
				return false;
			}
			return true;
		}
	}
}
//#endregion
//#region src/mpc_applykey.js
async function applyKeyToSection(fdOld, sections, fdNew, idSection, curve, groupName, first, inc, sectionName, logger) {
	const MAX_CHUNK_SIZE = 65536;
	const G = curve[groupName];
	const sG = G.F.n8 * 2;
	const nPoints = sections[idSection][0].size / sG;
	await _iden3_binfileutils.startReadUniqueSection(fdOld, sections, idSection);
	await _iden3_binfileutils.startWriteSection(fdNew, idSection);
	let t = first;
	for (let i = 0; i < nPoints; i += MAX_CHUNK_SIZE) {
		if (logger) logger.debug(`Applying key: ${sectionName}: ${i}/${nPoints}`);
		const n = Math.min(nPoints - i, MAX_CHUNK_SIZE);
		let buff;
		buff = await fdOld.read(n * sG);
		buff = await G.batchApplyKey(buff, t, inc);
		await fdNew.write(buff);
		t = curve.Fr.mul(t, curve.Fr.exp(inc, n));
		if (globalThis.gc && i % (MAX_CHUNK_SIZE * 4) == MAX_CHUNK_SIZE * 3) globalThis.gc();
	}
	await _iden3_binfileutils.endWriteSection(fdNew);
	await _iden3_binfileutils.endReadSection(fdOld);
}
async function applyKeyToChallengeSection(fdOld, fdNew, responseHasher, curve, groupName, nPoints, first, inc, formatOut, sectionName, logger) {
	const G = curve[groupName];
	const sG = G.F.n8 * 2;
	const chunkSize = Math.floor((1 << 20) / sG);
	let t = first;
	for (let i = 0; i < nPoints; i += chunkSize) {
		if (logger) logger.debug(`Applying key ${sectionName}: ${i}/${nPoints}`);
		const n = Math.min(nPoints - i, chunkSize);
		const buffInU = await fdOld.read(n * sG);
		const buffInLEM = await G.batchUtoLEM(buffInU);
		const buffOutLEM = await G.batchApplyKey(buffInLEM, t, inc);
		let buffOut;
		if (formatOut == "COMPRESSED") buffOut = await G.batchLEMtoC(buffOutLEM);
		else buffOut = await G.batchLEMtoU(buffOutLEM);
		if (responseHasher) responseHasher.update(buffOut);
		await fdNew.write(buffOut);
		t = curve.Fr.mul(t, curve.Fr.exp(inc, n));
		if (globalThis.gc && i % (chunkSize * 16) == chunkSize * 15) globalThis.gc();
	}
}
//#endregion
//#region src/powersoftau_challenge_contribute.js
async function challengeContribute(curve, challengeFilename, responseFileName, entropy, logger) {
	const fdFrom = await fastfile.readExisting(challengeFilename);
	const sG1 = curve.F1.n64 * 8 * 2;
	const sG2 = curve.F2.n64 * 8 * 2;
	const domainSize = (fdFrom.totalSize + sG1 - 64 - sG2) / (4 * sG1 + sG2);
	let e = domainSize;
	let power = 0;
	while (e > 1) {
		e = e / 2;
		power += 1;
	}
	if (2 ** power != domainSize) throw new Error("Invalid file size");
	if (logger) logger.debug("Power to tau size: " + power);
	const rng = await getRandomRng(entropy);
	const fdTo = await fastfile.createOverride(responseFileName);
	const challengeHasher = _noble_hashes_blake2_js.blake2b.create({ dkLen: 64 });
	for (let i = 0; i < fdFrom.totalSize; i += fdFrom.pageSize) {
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
	if (logger) [
		"tau",
		"alpha",
		"beta"
	].forEach((k) => {
		logger.debug(k + ".g1_s: " + curve.G1.toString(key[k].g1_s, 16));
		logger.debug(k + ".g1_sx: " + curve.G1.toString(key[k].g1_sx, 16));
		logger.debug(k + ".g2_sp: " + curve.G2.toString(key[k].g2_sp, 16));
		logger.debug(k + ".g2_spx: " + curve.G2.toString(key[k].g2_spx, 16));
		logger.debug("");
	});
	const responseHasher = _noble_hashes_blake2_js.blake2b.create({ dkLen: 64 });
	await fdTo.write(challengeHash);
	responseHasher.update(challengeHash);
	await applyKeyToChallengeSection(fdFrom, fdTo, responseHasher, curve, "G1", 2 ** power * 2 - 1, curve.Fr.one, key.tau.prvKey, "COMPRESSED", "tauG1", logger);
	await applyKeyToChallengeSection(fdFrom, fdTo, responseHasher, curve, "G2", 2 ** power, curve.Fr.one, key.tau.prvKey, "COMPRESSED", "tauG2", logger);
	await applyKeyToChallengeSection(fdFrom, fdTo, responseHasher, curve, "G1", 2 ** power, key.alpha.prvKey, key.tau.prvKey, "COMPRESSED", "alphaTauG1", logger);
	await applyKeyToChallengeSection(fdFrom, fdTo, responseHasher, curve, "G1", 2 ** power, key.beta.prvKey, key.tau.prvKey, "COMPRESSED", "betaTauG1", logger);
	await applyKeyToChallengeSection(fdFrom, fdTo, responseHasher, curve, "G2", 1, key.beta.prvKey, key.tau.prvKey, "COMPRESSED", "betaTauG2", logger);
	const buffKey = new Uint8Array(curve.F1.n8 * 2 * 6 + curve.F2.n8 * 2 * 3);
	toPtauPubKeyRpr(buffKey, 0, curve, key, false);
	await fdTo.write(buffKey);
	responseHasher.update(buffKey);
	const responseHash = responseHasher.digest();
	if (logger) logger.info(formatHash(responseHash, "Contribution Response Hash: "));
	await fdTo.close();
	await fdFrom.close();
}
//#endregion
//#region src/powersoftau_beacon.js
async function beacon$1(oldPtauFilename, newPTauFilename, name, beaconHashStr, numIterationsExp, logger) {
	const beaconHash = hex2ByteArray(beaconHashStr);
	if (beaconHash.byteLength == 0 || beaconHash.byteLength * 2 != beaconHashStr.length) {
		if (logger) logger.error("Invalid Beacon Hash. (It must be a valid hexadecimal sequence)");
		return false;
	}
	if (beaconHash.length >= 256) {
		if (logger) logger.error("Maximum length of beacon hash is 255 bytes");
		return false;
	}
	numIterationsExp = parseInt(numIterationsExp);
	if (numIterationsExp < 10 || numIterationsExp > 63) {
		if (logger) logger.error("Invalid numIterationsExp. (Must be between 10 and 63)");
		return false;
	}
	const { fd: fdOld, sections } = await _iden3_binfileutils.readBinFile(oldPtauFilename, "ptau", 1);
	const { curve, power, ceremonyPower } = await readPTauHeader(fdOld, sections);
	if (power != ceremonyPower) {
		if (logger) logger.error("This file has been reduced. You cannot contribute into a reduced file.");
		return false;
	}
	if (sections[12]) {
		if (logger) logger.warn("Contributing into a file that has phase2 calculated. You will have to prepare phase2 again.");
	}
	const contributions = await readContributions(fdOld, curve, sections);
	const curContribution = {
		name,
		type: 1,
		numIterationsExp,
		beaconHash
	};
	let lastChallengeHash;
	if (contributions.length > 0) lastChallengeHash = contributions[contributions.length - 1].nextChallenge;
	else lastChallengeHash = calculateFirstChallengeHash(curve, power, logger);
	curContribution.key = await keyFromBeacon(curve, lastChallengeHash, beaconHash, numIterationsExp);
	const responseHasher = _noble_hashes_blake2_js.blake2b.create({ dkLen: 64 });
	responseHasher.update(lastChallengeHash);
	const fdNew = await _iden3_binfileutils.createBinFile(newPTauFilename, "ptau", 1, 7);
	await writePTauHeader(fdNew, curve, power);
	const startSections = [];
	let firstPoints;
	firstPoints = await processSection(2, "G1", 2 ** power * 2 - 1, curve.Fr.e(1), curContribution.key.tau.prvKey, "tauG1", logger);
	curContribution.tauG1 = firstPoints[1];
	firstPoints = await processSection(3, "G2", 2 ** power, curve.Fr.e(1), curContribution.key.tau.prvKey, "tauG2", logger);
	curContribution.tauG2 = firstPoints[1];
	firstPoints = await processSection(4, "G1", 2 ** power, curContribution.key.alpha.prvKey, curContribution.key.tau.prvKey, "alphaTauG1", logger);
	curContribution.alphaG1 = firstPoints[0];
	firstPoints = await processSection(5, "G1", 2 ** power, curContribution.key.beta.prvKey, curContribution.key.tau.prvKey, "betaTauG1", logger);
	curContribution.betaG1 = firstPoints[0];
	firstPoints = await processSection(6, "G2", 1, curContribution.key.beta.prvKey, curContribution.key.tau.prvKey, "betaTauG2", logger);
	curContribution.betaG2 = firstPoints[0];
	curContribution.partialHash = toPartialHash(responseHasher);
	const buffKey = new Uint8Array(curve.F1.n8 * 2 * 6 + curve.F2.n8 * 2 * 3);
	toPtauPubKeyRpr(buffKey, 0, curve, curContribution.key, false);
	responseHasher.update(new Uint8Array(buffKey));
	const hashResponse = responseHasher.digest();
	if (logger) logger.info(formatHash(hashResponse, "Contribution Response Hash imported: "));
	const nextChallengeHasher = _noble_hashes_blake2_js.blake2b.create({ dkLen: 64 });
	nextChallengeHasher.update(hashResponse);
	await hashSection(fdNew, "G1", 2, 2 ** power * 2 - 1, "tauG1", logger);
	await hashSection(fdNew, "G2", 3, 2 ** power, "tauG2", logger);
	await hashSection(fdNew, "G1", 4, 2 ** power, "alphaTauG1", logger);
	await hashSection(fdNew, "G1", 5, 2 ** power, "betaTauG1", logger);
	await hashSection(fdNew, "G2", 6, 1, "betaG2", logger);
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
		await _iden3_binfileutils.startWriteSection(fdNew, sectionId);
		startSections[sectionId] = fdNew.pos;
		const G = curve[groupName];
		const sG = G.F.n8 * 2;
		const chunkSize = Math.floor((1 << 20) / sG);
		let t = first;
		for (let i = 0; i < NPoints; i += chunkSize) {
			if (logger) logger.debug(`applying key${sectionName}: ${i}/${NPoints}`);
			const n = Math.min(NPoints - i, chunkSize);
			const buffIn = await fdOld.read(n * sG);
			const buffOutLEM = await G.batchApplyKey(buffIn, t, inc);
			const promiseWrite = fdNew.write(buffOutLEM);
			const buffOutC = await G.batchLEMtoC(buffOutLEM);
			responseHasher.update(buffOutC);
			await promiseWrite;
			if (i == 0) for (let j = 0; j < Math.min(2, NPoints); j++) res.push(G.fromRprLEM(buffOutLEM, j * sG));
			t = curve.Fr.mul(t, curve.Fr.exp(inc, n));
		}
		await _iden3_binfileutils.endWriteSection(fdNew);
		return res;
	}
	async function hashSection(fdTo, groupName, sectionId, nPoints, sectionName, logger) {
		const G = curve[groupName];
		const sG = G.F.n8 * 2;
		const nPointsChunk = Math.floor((1 << 24) / sG);
		const oldPos = fdTo.pos;
		fdTo.pos = startSections[sectionId];
		for (let i = 0; i < nPoints; i += nPointsChunk) {
			if (logger) logger.debug(`Hashing ${sectionName}: ${i}/${nPoints}`);
			const n = Math.min(nPoints - i, nPointsChunk);
			const buffLEM = await fdTo.read(n * sG);
			const buffU = await G.batchLEMtoU(buffLEM);
			nextChallengeHasher.update(buffU);
		}
		fdTo.pos = oldPos;
	}
}
//#endregion
//#region src/powersoftau_contribute.js
async function contribute(oldPtauFilename, newPTauFilename, name, entropy, logger) {
	const { fd: fdOld, sections } = await _iden3_binfileutils.readBinFile(oldPtauFilename, "ptau", 1);
	const { curve, power, ceremonyPower } = await readPTauHeader(fdOld, sections);
	if (power != ceremonyPower) {
		if (logger) logger.error("This file has been reduced. You cannot contribute into a reduced file.");
		throw new Error("This file has been reduced. You cannot contribute into a reduced file.");
	}
	if (sections[12]) {
		if (logger) logger.warn("WARNING: Contributing into a file that has phase2 calculated. You will have to prepare phase2 again.");
	}
	const contributions = await readContributions(fdOld, curve, sections);
	const curContribution = {
		name,
		type: 0
	};
	let lastChallengeHash;
	const rng = await getRandomRng(entropy);
	if (contributions.length > 0) lastChallengeHash = contributions[contributions.length - 1].nextChallenge;
	else lastChallengeHash = calculateFirstChallengeHash(curve, power, logger);
	curContribution.key = createPTauKey(curve, lastChallengeHash, rng);
	const responseHasher = _noble_hashes_blake2_js.blake2b.create({ dkLen: 64 });
	responseHasher.update(lastChallengeHash);
	const fdNew = await _iden3_binfileutils.createBinFile(newPTauFilename, "ptau", 1, 7);
	await writePTauHeader(fdNew, curve, power);
	const startSections = [];
	let firstPoints;
	firstPoints = await processSection(2, "G1", 2 ** power * 2 - 1, curve.Fr.e(1), curContribution.key.tau.prvKey, "tauG1");
	curContribution.tauG1 = firstPoints[1];
	firstPoints = await processSection(3, "G2", 2 ** power, curve.Fr.e(1), curContribution.key.tau.prvKey, "tauG2");
	curContribution.tauG2 = firstPoints[1];
	firstPoints = await processSection(4, "G1", 2 ** power, curContribution.key.alpha.prvKey, curContribution.key.tau.prvKey, "alphaTauG1");
	curContribution.alphaG1 = firstPoints[0];
	firstPoints = await processSection(5, "G1", 2 ** power, curContribution.key.beta.prvKey, curContribution.key.tau.prvKey, "betaTauG1");
	curContribution.betaG1 = firstPoints[0];
	firstPoints = await processSection(6, "G2", 1, curContribution.key.beta.prvKey, curContribution.key.tau.prvKey, "betaTauG2");
	curContribution.betaG2 = firstPoints[0];
	curContribution.partialHash = toPartialHash(responseHasher);
	const buffKey = new Uint8Array(curve.F1.n8 * 2 * 6 + curve.F2.n8 * 2 * 3);
	toPtauPubKeyRpr(buffKey, 0, curve, curContribution.key, false);
	responseHasher.update(new Uint8Array(buffKey));
	const hashResponse = responseHasher.digest();
	if (logger) logger.info(formatHash(hashResponse, "Contribution Response Hash imported: "));
	const nextChallengeHasher = _noble_hashes_blake2_js.blake2b.create({ dkLen: 64 });
	nextChallengeHasher.update(hashResponse);
	await hashSection(fdNew, "G1", 2, 2 ** power * 2 - 1, "tauG1");
	await hashSection(fdNew, "G2", 3, 2 ** power, "tauG2");
	await hashSection(fdNew, "G1", 4, 2 ** power, "alphaTauG1");
	await hashSection(fdNew, "G1", 5, 2 ** power, "betaTauG1");
	await hashSection(fdNew, "G2", 6, 1, "betaG2");
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
		await _iden3_binfileutils.startWriteSection(fdNew, sectionId);
		startSections[sectionId] = fdNew.pos;
		const G = curve[groupName];
		const sG = G.F.n8 * 2;
		const chunkSize = Math.floor((1 << 20) / sG);
		let t = first;
		for (let i = 0; i < NPoints; i += chunkSize) {
			if (logger) logger.debug(`processing: ${sectionName}: ${i}/${NPoints}`);
			const n = Math.min(NPoints - i, chunkSize);
			const buffIn = await fdOld.read(n * sG);
			const buffOutLEM = await G.batchApplyKey(buffIn, t, inc);
			const promiseWrite = fdNew.write(buffOutLEM);
			const buffOutC = await G.batchLEMtoC(buffOutLEM);
			responseHasher.update(buffOutC);
			await promiseWrite;
			if (i == 0) for (let j = 0; j < Math.min(2, NPoints); j++) res.push(G.fromRprLEM(buffOutLEM, j * sG));
			t = curve.Fr.mul(t, curve.Fr.exp(inc, n));
			if (globalThis.gc && i % (chunkSize * 8) == chunkSize * 7) globalThis.gc();
		}
		await _iden3_binfileutils.endWriteSection(fdNew);
		if (globalThis.gc) globalThis.gc();
		return res;
	}
	async function hashSection(fdTo, groupName, sectionId, nPoints, sectionName) {
		const G = curve[groupName];
		const sG = G.F.n8 * 2;
		const nPointsChunk = Math.floor((1 << 22) / sG);
		const oldPos = fdTo.pos;
		fdTo.pos = startSections[sectionId];
		for (let i = 0; i < nPoints; i += nPointsChunk) {
			if (logger && i) logger.debug(`Hashing ${sectionName}: ` + i);
			const n = Math.min(nPoints - i, nPointsChunk);
			const buffLEM = await fdTo.read(n * sG);
			const buffU = await G.batchLEMtoU(buffLEM);
			nextChallengeHasher.update(buffU);
			if (globalThis.gc && i % (nPointsChunk * 8) == nPointsChunk * 7) globalThis.gc();
		}
		fdTo.pos = oldPos;
	}
}
//#endregion
//#region src/powersoftau_preparephase2.js
async function preparePhase2(oldPtauFilename, newPTauFilename, logger) {
	const { fd: fdOld, sections } = await _iden3_binfileutils.readBinFile(oldPtauFilename, "ptau", 1);
	const { curve, power } = await readPTauHeader(fdOld, sections);
	const fdNew = await _iden3_binfileutils.createBinFile(newPTauFilename, "ptau", 1, 11);
	await writePTauHeader(fdNew, curve, power);
	await _iden3_binfileutils.copySection(fdOld, sections, fdNew, 2);
	await _iden3_binfileutils.copySection(fdOld, sections, fdNew, 3);
	await _iden3_binfileutils.copySection(fdOld, sections, fdNew, 4);
	await _iden3_binfileutils.copySection(fdOld, sections, fdNew, 5);
	await _iden3_binfileutils.copySection(fdOld, sections, fdNew, 6);
	await _iden3_binfileutils.copySection(fdOld, sections, fdNew, 7);
	await processSection(2, 12, "G1", "tauG1");
	await processSection(3, 13, "G2", "tauG2");
	await processSection(4, 14, "G1", "alphaTauG1");
	await processSection(5, 15, "G1", "betaTauG1");
	await fdOld.close();
	await fdNew.close();
	return;
	async function processSection(oldSectionId, newSectionId, Gstr, sectionName) {
		if (logger) logger.debug("Starting section: " + sectionName);
		await _iden3_binfileutils.startWriteSection(fdNew, newSectionId);
		for (let p = 0; p <= power; p++) await processSectionPower(p);
		if (oldSectionId == 2) await processSectionPower(power + 1);
		await _iden3_binfileutils.endWriteSection(fdNew);
		async function processSectionPower(p) {
			const nPoints = 2 ** p;
			const G = curve[Gstr];
			const sGin = G.F.n8 * 2;
			let buff;
			buff = new ffjavascript.BigBuffer(nPoints * sGin);
			await _iden3_binfileutils.startReadUniqueSection(fdOld, sections, oldSectionId);
			if (oldSectionId == 2 && p == power + 1) {
				await fdOld.readToBuffer(buff, 0, (nPoints - 1) * sGin);
				buff.set(curve.G1.zeroAffine, (nPoints - 1) * sGin);
			} else await fdOld.readToBuffer(buff, 0, nPoints * sGin);
			await _iden3_binfileutils.endReadSection(fdOld, true);
			buff = await G.lagrangeEvaluations(buff, "affine", "affine", logger, sectionName);
			await fdNew.write(buff);
		}
	}
}
//#endregion
//#region src/powersoftau_truncate.js
async function truncate(ptauFilename, template, logger) {
	const { fd: fdOld, sections } = await _iden3_binfileutils.readBinFile(ptauFilename, "ptau", 1);
	const { curve, power, ceremonyPower } = await readPTauHeader(fdOld, sections);
	const sG1 = curve.G1.F.n8 * 2;
	const sG2 = curve.G2.F.n8 * 2;
	for (let p = 1; p < power; p++) await generateTruncate(p);
	await fdOld.close();
	return true;
	async function generateTruncate(p) {
		let sP = p.toString();
		while (sP.length < 2) sP = "0" + sP;
		if (logger) logger.debug("Writing Power: " + sP);
		const fdNew = await _iden3_binfileutils.createBinFile(template + sP + ".ptau", "ptau", 1, 11);
		await writePTauHeader(fdNew, curve, p, ceremonyPower);
		await _iden3_binfileutils.copySection(fdOld, sections, fdNew, 2, (2 ** p * 2 - 1) * sG1);
		await _iden3_binfileutils.copySection(fdOld, sections, fdNew, 3, 2 ** p * sG2);
		await _iden3_binfileutils.copySection(fdOld, sections, fdNew, 4, 2 ** p * sG1);
		await _iden3_binfileutils.copySection(fdOld, sections, fdNew, 5, 2 ** p * sG1);
		await _iden3_binfileutils.copySection(fdOld, sections, fdNew, 6, sG2);
		await _iden3_binfileutils.copySection(fdOld, sections, fdNew, 7);
		await _iden3_binfileutils.copySection(fdOld, sections, fdNew, 12, (2 ** (p + 1) * 2 - 1) * sG1);
		await _iden3_binfileutils.copySection(fdOld, sections, fdNew, 13, (2 ** p * 2 - 1) * sG2);
		await _iden3_binfileutils.copySection(fdOld, sections, fdNew, 14, (2 ** p * 2 - 1) * sG1);
		await _iden3_binfileutils.copySection(fdOld, sections, fdNew, 15, (2 ** p * 2 - 1) * sG1);
		await fdNew.close();
	}
}
//#endregion
//#region src/powersoftau_convert.js
async function convert(oldPtauFilename, newPTauFilename, logger) {
	const { fd: fdOld, sections } = await _iden3_binfileutils.readBinFile(oldPtauFilename, "ptau", 1);
	const { curve, power } = await readPTauHeader(fdOld, sections);
	const fdNew = await _iden3_binfileutils.createBinFile(newPTauFilename, "ptau", 1, 11);
	await writePTauHeader(fdNew, curve, power);
	await _iden3_binfileutils.copySection(fdOld, sections, fdNew, 2);
	await _iden3_binfileutils.copySection(fdOld, sections, fdNew, 3);
	await _iden3_binfileutils.copySection(fdOld, sections, fdNew, 4);
	await _iden3_binfileutils.copySection(fdOld, sections, fdNew, 5);
	await _iden3_binfileutils.copySection(fdOld, sections, fdNew, 6);
	await _iden3_binfileutils.copySection(fdOld, sections, fdNew, 7);
	await processSection(2, 12, "G1", "tauG1");
	await _iden3_binfileutils.copySection(fdOld, sections, fdNew, 13);
	await _iden3_binfileutils.copySection(fdOld, sections, fdNew, 14);
	await _iden3_binfileutils.copySection(fdOld, sections, fdNew, 15);
	await fdOld.close();
	await fdNew.close();
	return;
	async function processSection(oldSectionId, newSectionId, Gstr, sectionName) {
		if (logger) logger.debug("Starting section: " + sectionName);
		await _iden3_binfileutils.startWriteSection(fdNew, newSectionId);
		const size = sections[newSectionId][0].size;
		const chunkSize = fdOld.pageSize;
		await _iden3_binfileutils.startReadUniqueSection(fdOld, sections, newSectionId);
		for (let p = 0; p < size; p += chunkSize) {
			const l = Math.min(size - p, chunkSize);
			const buff = await fdOld.read(l);
			await fdNew.write(buff);
		}
		await _iden3_binfileutils.endReadSection(fdOld);
		if (oldSectionId == 2) await processSectionPower(power + 1);
		await _iden3_binfileutils.endWriteSection(fdNew);
		async function processSectionPower(p) {
			const nPoints = 2 ** p;
			const G = curve[Gstr];
			const sGin = G.F.n8 * 2;
			let buff;
			buff = new ffjavascript.BigBuffer(nPoints * sGin);
			await _iden3_binfileutils.startReadUniqueSection(fdOld, sections, oldSectionId);
			if (oldSectionId == 2 && p == power + 1) {
				await fdOld.readToBuffer(buff, 0, (nPoints - 1) * sGin);
				buff.set(curve.G1.zeroAffine, (nPoints - 1) * sGin);
			} else await fdOld.readToBuffer(buff, 0, nPoints * sGin);
			await _iden3_binfileutils.endReadSection(fdOld, true);
			buff = await G.lagrangeEvaluations(buff, "affine", "affine", logger, sectionName);
			await fdNew.write(buff);
		}
	}
}
//#endregion
//#region src/powersoftau_export_json.js
async function exportJson(pTauFilename, verbose) {
	const { fd, sections } = await _iden3_binfileutils.readBinFile(pTauFilename, "ptau", 1);
	const { curve, power } = await readPTauHeader(fd, sections);
	const pTau = {};
	pTau.q = curve.q;
	pTau.power = power;
	pTau.contributions = await readContributions(fd, curve, sections);
	pTau.tauG1 = await exportSection(2, "G1", 2 ** power * 2 - 1, "tauG1");
	pTau.tauG2 = await exportSection(3, "G2", 2 ** power, "tauG2");
	pTau.alphaTauG1 = await exportSection(4, "G1", 2 ** power, "alphaTauG1");
	pTau.betaTauG1 = await exportSection(5, "G1", 2 ** power, "betaTauG1");
	pTau.betaG2 = await exportSection(6, "G2", 1, "betaG2");
	pTau.lTauG1 = await exportLagrange(12, "G1", "lTauG1");
	pTau.lTauG2 = await exportLagrange(13, "G2", "lTauG2");
	pTau.lAlphaTauG1 = await exportLagrange(14, "G1", "lAlphaTauG2");
	pTau.lBetaTauG1 = await exportLagrange(15, "G1", "lBetaTauG2");
	await fd.close();
	return stringifyBigIntsWithField(curve.Fr, pTau);
	async function exportSection(sectionId, groupName, nPoints, sectionName) {
		const G = curve[groupName];
		const sG = G.F.n8 * 2;
		const res = [];
		await _iden3_binfileutils.startReadUniqueSection(fd, sections, sectionId);
		for (let i = 0; i < nPoints; i++) {
			if (verbose && i && i % 1e4 == 0) console.log(`${sectionName}: ` + i);
			const buff = await fd.read(sG);
			res.push(G.fromRprLEM(buff, 0));
		}
		await _iden3_binfileutils.endReadSection(fd);
		return res;
	}
	async function exportLagrange(sectionId, groupName, sectionName) {
		const G = curve[groupName];
		const sG = G.F.n8 * 2;
		const res = [];
		await _iden3_binfileutils.startReadUniqueSection(fd, sections, sectionId);
		for (let p = 0; p <= power; p++) {
			if (verbose) console.log(`${sectionName}: Power: ${p}`);
			res[p] = [];
			const nPoints = 2 ** p;
			for (let i = 0; i < nPoints; i++) {
				if (verbose && i && i % 1e4 == 0) console.log(`${sectionName}: ${i}/${nPoints}`);
				const buff = await fd.read(sG);
				res[p].push(G.fromRprLEM(buff, 0));
			}
		}
		await _iden3_binfileutils.endReadSection(fd, true);
		return res;
	}
}
//#endregion
//#region src/bigarray.js
var SUBARRAY_SIZE = 262144;
var BigArrayHandler = {
	get: function(obj, prop) {
		if (!isNaN(prop)) return obj.getElement(prop);
		else return obj[prop];
	},
	set: function(obj, prop, value) {
		if (!isNaN(prop)) return obj.setElement(prop, value);
		else {
			obj[prop] = value;
			return true;
		}
	}
};
var _BigArray = class {
	constructor(initSize) {
		this.length = initSize || 0;
		this.arr = new Array(SUBARRAY_SIZE);
		for (let i = 0; i < initSize; i += SUBARRAY_SIZE) this.arr[i / SUBARRAY_SIZE] = new Array(Math.min(SUBARRAY_SIZE, initSize - i));
		return this;
	}
	push() {
		for (let i = 0; i < arguments.length; i++) this.setElement(this.length, arguments[i]);
	}
	slice(f, t) {
		const arr = new Array(t - f);
		for (let i = f; i < t; i++) arr[i - f] = this.getElement(i);
		return arr;
	}
	getElement(idx) {
		idx = parseInt(idx);
		const idx1 = Math.floor(idx / SUBARRAY_SIZE);
		const idx2 = idx % SUBARRAY_SIZE;
		return this.arr[idx1] ? this.arr[idx1][idx2] : void 0;
	}
	setElement(idx, value) {
		idx = parseInt(idx);
		const idx1 = Math.floor(idx / SUBARRAY_SIZE);
		if (!this.arr[idx1]) this.arr[idx1] = new Array(SUBARRAY_SIZE);
		const idx2 = idx % SUBARRAY_SIZE;
		this.arr[idx1][idx2] = value;
		if (idx >= this.length) this.length = idx + 1;
		return true;
	}
	getKeys() {
		const newA = new BigArray();
		for (let i = 0; i < this.arr.length; i++) if (this.arr[i]) {
			for (let j = 0; j < this.arr[i].length; j++) if (typeof this.arr[i][j] !== "undefined") newA.push(i * SUBARRAY_SIZE + j);
		}
		return newA;
	}
};
var BigArray = class {
	constructor(initSize) {
		const obj = new _BigArray(initSize);
		return new Proxy(obj, BigArrayHandler);
	}
};
//#endregion
//#region src/zkey_new.js
async function newZKey(r1csName, ptauName, zkeyName, logger) {
	const fds = {};
	try {
		return await _newZKey(r1csName, ptauName, zkeyName, logger, fds);
	} finally {
		for (const openFd of [
			fds.fdPTau,
			fds.fdR1cs,
			fds.fdZKey
		]) try {
			if (openFd) await openFd.close();
		} catch (e) {}
	}
}
async function _newZKey(r1csName, ptauName, zkeyName, logger, fds) {
	const TAU_G1 = 0;
	const TAU_G2 = 1;
	const ALPHATAU_G1 = 2;
	const BETATAU_G1 = 3;
	const csHasher = _noble_hashes_blake2_js.blake2b.create({ dkLen: 64 });
	const { fd: fdPTau, sections: sectionsPTau } = await (0, _iden3_binfileutils.readBinFile)(ptauName, "ptau", 1, 1 << 22, 1 << 24);
	fds.fdPTau = fdPTau;
	const { curve, power } = await readPTauHeader(fdPTau, sectionsPTau);
	const { fd: fdR1cs, sections: sectionsR1cs } = await (0, _iden3_binfileutils.readBinFile)(r1csName, "r1cs", 1, 1 << 22, 1 << 24);
	fds.fdR1cs = fdR1cs;
	const r1cs = await (0, r1csfile.readR1csHeader)(fdR1cs, sectionsR1cs, false);
	const fdZKey = await (0, _iden3_binfileutils.createBinFile)(zkeyName, "zkey", 1, 10, 1 << 22, 1 << 24);
	fds.fdZKey = fdZKey;
	const sG1 = curve.G1.F.n8 * 2;
	const sG2 = curve.G2.F.n8 * 2;
	if (r1cs.prime != curve.r) {
		if (logger) logger.error("r1cs curve does not match powers of tau ceremony curve");
		return -1;
	}
	const cirPower = log2(r1cs.nConstraints + r1cs.nPubInputs + r1cs.nOutputs + 1 - 1) + 1;
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
	await (0, _iden3_binfileutils.startWriteSection)(fdZKey, 1);
	await fdZKey.writeULE32(1);
	await (0, _iden3_binfileutils.endWriteSection)(fdZKey);
	await (0, _iden3_binfileutils.startWriteSection)(fdZKey, 2);
	const primeQ = curve.q;
	const n8q = (Math.floor((ffjavascript.Scalar.bitLength(primeQ) - 1) / 64) + 1) * 8;
	const primeR = curve.r;
	const n8r = (Math.floor((ffjavascript.Scalar.bitLength(primeR) - 1) / 64) + 1) * 8;
	const Rr = ffjavascript.Scalar.mod(ffjavascript.Scalar.shl(1, n8r * 8), primeR);
	const R2r = curve.Fr.e(ffjavascript.Scalar.mod(ffjavascript.Scalar.mul(Rr, Rr), primeR));
	await fdZKey.writeULE32(n8q);
	await (0, _iden3_binfileutils.writeBigInt)(fdZKey, primeQ, n8q);
	await fdZKey.writeULE32(n8r);
	await (0, _iden3_binfileutils.writeBigInt)(fdZKey, primeR, n8r);
	await fdZKey.writeULE32(r1cs.nVars);
	await fdZKey.writeULE32(nPublic);
	await fdZKey.writeULE32(domainSize);
	await (async function writeHeaderPoints() {
		let bAlpha1 = await fdPTau.read(sG1, sectionsPTau[4][0].p);
		await fdZKey.write(bAlpha1);
		bAlpha1 = await curve.G1.batchLEMtoU(bAlpha1);
		csHasher.update(bAlpha1);
		let bBeta1 = await fdPTau.read(sG1, sectionsPTau[5][0].p);
		await fdZKey.write(bBeta1);
		bBeta1 = await curve.G1.batchLEMtoU(bBeta1);
		csHasher.update(bBeta1);
		let bBeta2 = await fdPTau.read(sG2, sectionsPTau[6][0].p);
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
		await fdZKey.write(bg2);
		await fdZKey.write(bg1);
		await fdZKey.write(bg2);
		csHasher.update(bg2U);
		csHasher.update(bg1U);
		csHasher.update(bg2U);
	})();
	await (0, _iden3_binfileutils.endWriteSection)(fdZKey);
	if (logger) logger.info("Reading r1cs");
	let sR1cs = await (0, _iden3_binfileutils.readSection)(fdR1cs, sectionsR1cs, 2);
	await fdR1cs.close();
	let A = new BigArray(r1cs.nVars);
	let B1 = new BigArray(r1cs.nVars);
	let B2 = new BigArray(r1cs.nVars);
	let C = new BigArray(r1cs.nVars - nPublic - 1);
	let IC = new Array(nPublic + 1);
	if (logger) logger.info("Reading tauG1");
	let sTauG1 = await (0, _iden3_binfileutils.readSection)(fdPTau, sectionsPTau, 12, (domainSize - 1) * sG1, domainSize * sG1);
	let sTauG2 = null;
	if (logger) logger.info("Reading alphatauG1");
	let sAlphaTauG1 = await (0, _iden3_binfileutils.readSection)(fdPTau, sectionsPTau, 14, (domainSize - 1) * sG1, domainSize * sG1);
	if (logger) logger.info("Reading betatauG1");
	let sBetaTauG1 = await (0, _iden3_binfileutils.readSection)(fdPTau, sectionsPTau, 15, (domainSize - 1) * sG1, domainSize * sG1);
	if (logger) logger.info("processConstraints");
	await processConstraints();
	if (logger) logger.info("composeAndWritePoints");
	await composeAndWritePoints(3, "G1", IC, "IC");
	IC = null;
	if (logger) logger.info("writeHs");
	await writeHs();
	if (logger) logger.info("hashHPoints");
	await hashHPoints();
	if (logger) logger.info("composeAndWritePoints 8 G1 C");
	await composeAndWritePoints(8, "G1", C, "C");
	C = null;
	sAlphaTauG1 = null;
	sBetaTauG1 = null;
	if (logger) logger.info("composeAndWritePoints 5 G1 A");
	await composeAndWritePoints(5, "G1", A, "A");
	A = null;
	if (logger) logger.info("composeAndWritePoints 6 G1 B1");
	await composeAndWritePoints(6, "G1", B1, "B1");
	B1 = null;
	sTauG1 = null;
	if (logger) logger.info("Reading tauG2");
	sTauG2 = await (0, _iden3_binfileutils.readSection)(fdPTau, sectionsPTau, 13, (domainSize - 1) * sG2, domainSize * sG2);
	if (logger) logger.info("composeAndWritePoints 7 G2 B2");
	await composeAndWritePoints(7, "G2", B2, "B2");
	B2 = null;
	sTauG2 = null;
	sR1cs = null;
	if (logger) logger.info("Contributions section");
	const csHash = csHasher.digest();
	await (0, _iden3_binfileutils.startWriteSection)(fdZKey, 10);
	await fdZKey.write(csHash);
	await fdZKey.writeULE32(0);
	await (0, _iden3_binfileutils.endWriteSection)(fdZKey);
	if (logger) logger.info(formatHash(csHash, "Circuit hash: "));
	await fdZKey.close();
	await fdPTau.close();
	return csHash;
	async function writeHs() {
		await (0, _iden3_binfileutils.startWriteSection)(fdZKey, 9);
		const buffOut = new ffjavascript.BigBuffer(domainSize * sG1);
		if (cirPower < curve.Fr.s) {
			let sTauG1 = await (0, _iden3_binfileutils.readSection)(fdPTau, sectionsPTau, 12, (domainSize * 2 - 1) * sG1, domainSize * 2 * sG1);
			for (let i = 0; i < domainSize; i++) {
				if (logger && i % 1e4 == 0) logger.debug(`splitting buffer: ${i}/${domainSize}`);
				const buff = sTauG1.slice((i * 2 + 1) * sG1, (i * 2 + 1) * sG1 + sG1);
				buffOut.set(buff, i * sG1);
			}
		} else if (cirPower == curve.Fr.s) {
			/* c8 ignore start */
			const o = sectionsPTau[12][0].p + (2 ** (cirPower + 1) - 1) * sG1;
			await fdPTau.readToBuffer(buffOut, 0, domainSize * sG1, o + domainSize * sG1);
		} else {
			if (logger) logger.error("Circuit too big");
			throw new Error("Circuit too big for this curve");
		}
		await fdZKey.write(buffOut);
		await (0, _iden3_binfileutils.endWriteSection)(fdZKey);
	}
	async function processConstraints() {
		const buffCoeff = new Uint8Array(12 + curve.Fr.n8);
		const buffCoeffV = new DataView(buffCoeff.buffer);
		const bOne = new Uint8Array(curve.Fr.n8);
		curve.Fr.toRprLE(bOne, 0, curve.Fr.e(1));
		let r1csPos = 0;
		function r1cs_readULE32() {
			const buff = sR1cs.slice(r1csPos, r1csPos + 4);
			r1csPos += 4;
			return new DataView(buff.buffer).getUint32(0, true);
		}
		const coefs = new BigArray();
		for (let c = 0; c < r1cs.nConstraints; c++) {
			if (logger && c % 1e4 == 0) logger.debug(`processing constraints: ${c}/${r1cs.nConstraints}`);
			const nA = r1cs_readULE32();
			for (let i = 0; i < nA; i++) {
				const s = r1cs_readULE32();
				const coefp = r1csPos;
				r1csPos += curve.Fr.n8;
				const l1t = TAU_G1;
				const l1 = sG1 * c;
				const l2t = BETATAU_G1;
				const l2 = sG1 * c;
				if (typeof A[s] === "undefined") A[s] = [];
				A[s].push([
					l1t,
					l1,
					coefp
				]);
				if (s <= nPublic) {
					if (typeof IC[s] === "undefined") IC[s] = [];
					IC[s].push([
						l2t,
						l2,
						coefp
					]);
				} else {
					if (typeof C[s - nPublic - 1] === "undefined") C[s - nPublic - 1] = [];
					C[s - nPublic - 1].push([
						l2t,
						l2,
						coefp
					]);
				}
				coefs.push([
					0,
					c,
					s,
					coefp
				]);
			}
			const nB = r1cs_readULE32();
			for (let i = 0; i < nB; i++) {
				const s = r1cs_readULE32();
				const coefp = r1csPos;
				r1csPos += curve.Fr.n8;
				const l1t = TAU_G1;
				const l1 = sG1 * c;
				const l2t = TAU_G2;
				const l2 = sG2 * c;
				const l3t = ALPHATAU_G1;
				const l3 = sG1 * c;
				if (typeof B1[s] === "undefined") B1[s] = [];
				B1[s].push([
					l1t,
					l1,
					coefp
				]);
				if (typeof B2[s] === "undefined") B2[s] = [];
				B2[s].push([
					l2t,
					l2,
					coefp
				]);
				if (s <= nPublic) {
					/* c8 ignore start */
					if (typeof IC[s] === "undefined") IC[s] = [];
					/* c8 ignore stop */
					IC[s].push([
						l3t,
						l3,
						coefp
					]);
				} else {
					if (typeof C[s - nPublic - 1] === "undefined") C[s - nPublic - 1] = [];
					C[s - nPublic - 1].push([
						l3t,
						l3,
						coefp
					]);
				}
				coefs.push([
					1,
					c,
					s,
					coefp
				]);
			}
			const nC = r1cs_readULE32();
			for (let i = 0; i < nC; i++) {
				const s = r1cs_readULE32();
				const coefp = r1csPos;
				r1csPos += curve.Fr.n8;
				const l1t = TAU_G1;
				const l1 = sG1 * c;
				if (s <= nPublic) {
					if (typeof IC[s] === "undefined") IC[s] = [];
					IC[s].push([
						l1t,
						l1,
						coefp
					]);
				} else {
					if (typeof C[s - nPublic - 1] === "undefined") C[s - nPublic - 1] = [];
					C[s - nPublic - 1].push([
						l1t,
						l1,
						coefp
					]);
				}
			}
		}
		for (let s = 0; s <= nPublic; s++) {
			const l1t = TAU_G1;
			const l1 = sG1 * (r1cs.nConstraints + s);
			const l2t = BETATAU_G1;
			const l2 = sG1 * (r1cs.nConstraints + s);
			if (typeof A[s] === "undefined") A[s] = [];
			A[s].push([
				l1t,
				l1,
				-1
			]);
			if (typeof IC[s] === "undefined") IC[s] = [];
			IC[s].push([
				l2t,
				l2,
				-1
			]);
			coefs.push([
				0,
				r1cs.nConstraints + s,
				s,
				-1
			]);
		}
		await (0, _iden3_binfileutils.startWriteSection)(fdZKey, 4);
		const buffSection = new ffjavascript.BigBuffer(coefs.length * (12 + curve.Fr.n8) + 4);
		const buff4 = /* @__PURE__ */ new Uint8Array(4);
		new DataView(buff4.buffer).setUint32(0, coefs.length, true);
		buffSection.set(buff4);
		let coefsPos = 4;
		for (let i = 0; i < coefs.length; i++) {
			if (logger && i % 1e5 == 0) logger.debug(`writing coeffs: ${i}/${coefs.length}`);
			writeCoef(coefs[i]);
		}
		await fdZKey.write(buffSection);
		await (0, _iden3_binfileutils.endWriteSection)(fdZKey);
		function writeCoef(c) {
			buffCoeffV.setUint32(0, c[0], true);
			buffCoeffV.setUint32(4, c[1], true);
			buffCoeffV.setUint32(8, c[2], true);
			let n;
			if (c[3] >= 0) n = curve.Fr.fromRprLE(sR1cs.slice(c[3], c[3] + curve.Fr.n8), 0);
			else n = curve.Fr.fromRprLE(bOne, 0);
			const nR2 = curve.Fr.mul(n, R2r);
			curve.Fr.toRprLE(buffCoeff, 12, nR2);
			buffSection.set(buffCoeff, coefsPos);
			coefsPos += buffCoeff.length;
		}
	}
	async function composeAndWritePoints(idSection, groupName, arr, sectionName) {
		const CHUNK_SIZE = 32768;
		const G = curve[groupName];
		hashU32(arr.length);
		await (0, _iden3_binfileutils.startWriteSection)(fdZKey, idSection);
		let opPromises = [];
		let i = 0;
		while (i < arr.length) {
			let t = 0;
			while (i < arr.length && t < curve.tm.concurrency) {
				if (logger) logger.debug(`Writing points start ${sectionName}: ${i}/${arr.length}`);
				let n = 1;
				let nP = arr[i] ? arr[i].length : 0;
				while (i + n < arr.length && nP + (arr[i + n] ? arr[i + n].length : 0) < CHUNK_SIZE && n < CHUNK_SIZE) {
					nP += arr[i + n] ? arr[i + n].length : 0;
					n++;
				}
				const subArr = arr.slice(i, i + n);
				const _i = i;
				opPromises.push(composeAndWritePointsThread(groupName, subArr, logger, sectionName).then((r) => {
					if (logger) logger.debug(`Writing points end ${sectionName}: ${_i}/${arr.length}`);
					return r;
				}));
				i += n;
				t++;
			}
			const result = await Promise.all(opPromises);
			for (let k = 0; k < result.length; k++) {
				await fdZKey.write(result[k][0]);
				const buff = await G.batchLEMtoU(result[k][0]);
				csHasher.update(buff);
			}
			opPromises = [];
		}
		await (0, _iden3_binfileutils.endWriteSection)(fdZKey);
	}
	async function composeAndWritePointsThread(groupName, arr, logger, sectionName) {
		const G = curve[groupName];
		const sGin = G.F.n8 * 2;
		const sGmid = G.F.n8 * 3;
		const sGout = G.F.n8 * 2;
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
		} else throw new Error("Invalid group");
		let acc = 0;
		for (let i = 0; i < arr.length; i++) acc += arr[i] ? arr[i].length : 0;
		let bBases, bScalars;
		/* c8 ignore start */
		if (acc > 32768) {
			bBases = new ffjavascript.BigBuffer(acc * sGin);
			bScalars = new ffjavascript.BigBuffer(acc * curve.Fr.n8);
		} else {
			bBases = new Uint8Array(acc * sGin);
			bScalars = new Uint8Array(acc * curve.Fr.n8);
		}
		/* c8 ignore stop */
		let pB = 0;
		let pS = 0;
		const sBuffs = [
			sTauG1,
			sTauG2,
			sAlphaTauG1,
			sBetaTauG1
		];
		const bOne = new Uint8Array(curve.Fr.n8);
		curve.Fr.toRprLE(bOne, 0, curve.Fr.e(1));
		let offset = 0;
		for (let i = 0; i < arr.length; i++) {
			if (!arr[i]) continue;
			for (let j = 0; j < arr[i].length; j++) {
				/* c8 ignore start */
				if (logger && j && j % 1e4 == 0) logger.debug(`Configuring big array ${sectionName}: ${j}/${arr[i].length}`);
				/* c8 ignore stop */
				bBases.set(sBuffs[arr[i][j][0]].slice(arr[i][j][1], arr[i][j][1] + sGin), offset * sGin);
				if (arr[i][j][2] >= 0) bScalars.set(sR1cs.slice(arr[i][j][2], arr[i][j][2] + curve.Fr.n8), offset * curve.Fr.n8);
				else bScalars.set(bOne, offset * curve.Fr.n8);
				offset++;
			}
		}
		if (arr.length > 1) {
			const task = [];
			task.push({
				cmd: "ALLOCSET",
				var: 0,
				buff: bBases
			});
			task.push({
				cmd: "ALLOCSET",
				var: 1,
				buff: bScalars
			});
			task.push({
				cmd: "ALLOC",
				var: 2,
				len: arr.length * sGmid
			});
			pB = 0;
			pS = 0;
			let pD = 0;
			for (let i = 0; i < arr.length; i++) {
				if (!arr[i]) {
					task.push({
						cmd: "CALL",
						fnName: fnZero,
						params: [{
							var: 2,
							offset: pD
						}]
					});
					pD += sGmid;
					continue;
				}
				if (arr[i].length == 1) task.push({
					cmd: "CALL",
					fnName: fnExp,
					params: [
						{
							var: 0,
							offset: pB
						},
						{
							var: 1,
							offset: pS
						},
						{ val: curve.Fr.n8 },
						{
							var: 2,
							offset: pD
						}
					]
				});
				else task.push({
					cmd: "CALL",
					fnName: fnMultiExp,
					params: [
						{
							var: 0,
							offset: pB
						},
						{
							var: 1,
							offset: pS
						},
						{ val: curve.Fr.n8 },
						{ val: arr[i].length },
						{
							var: 2,
							offset: pD
						}
					]
				});
				pB += sGin * arr[i].length;
				pS += curve.Fr.n8 * arr[i].length;
				pD += sGmid;
			}
			task.push({
				cmd: "CALL",
				fnName: fnBatchToAffine,
				params: [
					{ var: 2 },
					{ val: arr.length },
					{ var: 2 }
				]
			});
			task.push({
				cmd: "GET",
				out: 0,
				var: 2,
				len: arr.length * sGout
			});
			return await curve.tm.queueAction(task);
		} else {
			let res = await G.multiExpAffine(bBases, bScalars, logger, sectionName);
			res = [G.toAffine(res)];
			return res;
		}
	}
	async function hashHPoints() {
		const CHUNK_SIZE = 16384;
		hashU32(domainSize - 1);
		for (let i = 0; i < domainSize - 1; i += CHUNK_SIZE) {
			if (logger) logger.debug(`HashingHPoints: ${i}/${domainSize}`);
			const n = Math.min(domainSize - 1, CHUNK_SIZE);
			await hashHPointsChunk(i, n);
		}
	}
	async function hashHPointsChunk(offset, nPoints) {
		const buff1 = await fdPTau.read(nPoints * sG1, sectionsPTau[2][0].p + (offset + domainSize) * sG1);
		const buff2 = await fdPTau.read(nPoints * sG1, sectionsPTau[2][0].p + offset * sG1);
		const concurrency = curve.tm.concurrency;
		const nPointsPerThread = Math.floor(nPoints / concurrency);
		const opPromises = [];
		for (let i = 0; i < concurrency; i++) {
			let n;
			if (i < concurrency - 1) n = nPointsPerThread;
			else n = nPoints - i * nPointsPerThread;
			if (n == 0) continue;
			const subBuff1 = buff1.slice(i * nPointsPerThread * sG1, (i * nPointsPerThread + n) * sG1);
			const subBuff2 = buff2.slice(i * nPointsPerThread * sG1, (i * nPointsPerThread + n) * sG1);
			opPromises.push(hashHPointsThread(subBuff1, subBuff2));
		}
		const result = await Promise.all(opPromises);
		for (let i = 0; i < result.length; i++) csHasher.update(result[i][0]);
	}
	async function hashHPointsThread(buff1, buff2) {
		const nPoints = buff1.byteLength / sG1;
		const sGmid = curve.G1.F.n8 * 3;
		const task = [];
		task.push({
			cmd: "ALLOCSET",
			var: 0,
			buff: buff1
		});
		task.push({
			cmd: "ALLOCSET",
			var: 1,
			buff: buff2
		});
		task.push({
			cmd: "ALLOC",
			var: 2,
			len: nPoints * sGmid
		});
		for (let i = 0; i < nPoints; i++) task.push({
			cmd: "CALL",
			fnName: "g1m_subAffine",
			params: [
				{
					var: 0,
					offset: i * sG1
				},
				{
					var: 1,
					offset: i * sG1
				},
				{
					var: 2,
					offset: i * sGmid
				}
			]
		});
		task.push({
			cmd: "CALL",
			fnName: "g1m_batchToAffine",
			params: [
				{ var: 2 },
				{ val: nPoints },
				{ var: 2 }
			]
		});
		task.push({
			cmd: "CALL",
			fnName: "g1m_batchLEMtoU",
			params: [
				{ var: 2 },
				{ val: nPoints },
				{ var: 2 }
			]
		});
		task.push({
			cmd: "GET",
			out: 0,
			var: 2,
			len: nPoints * sG1
		});
		return await curve.tm.queueAction(task);
	}
	function hashU32(n) {
		const buff = /* @__PURE__ */ new Uint8Array(4);
		new DataView(buff.buffer, buff.byteOffset, buff.byteLength).setUint32(0, n, false);
		csHasher.update(buff);
	}
}
//#endregion
//#region src/zkey_utils.js
async function writeHeader(fd, zkey) {
	await _iden3_binfileutils.startWriteSection(fd, 1);
	await fd.writeULE32(1);
	await _iden3_binfileutils.endWriteSection(fd);
	const curve = await getCurveFromQ(zkey.q);
	await _iden3_binfileutils.startWriteSection(fd, 2);
	const primeQ = curve.q;
	const n8q = (Math.floor((ffjavascript.Scalar.bitLength(primeQ) - 1) / 64) + 1) * 8;
	const primeR = curve.r;
	const n8r = (Math.floor((ffjavascript.Scalar.bitLength(primeR) - 1) / 64) + 1) * 8;
	await fd.writeULE32(n8q);
	await _iden3_binfileutils.writeBigInt(fd, primeQ, n8q);
	await fd.writeULE32(n8r);
	await _iden3_binfileutils.writeBigInt(fd, primeR, n8r);
	await fd.writeULE32(zkey.nVars);
	await fd.writeULE32(zkey.nPublic);
	await fd.writeULE32(zkey.domainSize);
	await writeG1(fd, curve, zkey.vk_alpha_1);
	await writeG1(fd, curve, zkey.vk_beta_1);
	await writeG2(fd, curve, zkey.vk_beta_2);
	await writeG2(fd, curve, zkey.vk_gamma_2);
	await writeG1(fd, curve, zkey.vk_delta_1);
	await writeG2(fd, curve, zkey.vk_delta_2);
	await _iden3_binfileutils.endWriteSection(fd);
}
async function writeG1(fd, curve, p) {
	const buff = new Uint8Array(curve.G1.F.n8 * 2);
	curve.G1.toRprLEM(buff, 0, p);
	await fd.write(buff);
}
async function writeG2(fd, curve, p) {
	const buff = new Uint8Array(curve.G2.F.n8 * 2);
	curve.G2.toRprLEM(buff, 0, p);
	await fd.write(buff);
}
async function readG1(fd, curve, toObject) {
	const buff = await fd.read(curve.G1.F.n8 * 2);
	const res = curve.G1.fromRprLEM(buff, 0);
	return toObject ? curve.G1.toObject(res) : res;
}
async function readG2(fd, curve, toObject) {
	const buff = await fd.read(curve.G2.F.n8 * 2);
	const res = curve.G2.fromRprLEM(buff, 0);
	return toObject ? curve.G2.toObject(res) : res;
}
async function readHeader$1(fd, sections, toObject, options) {
	await _iden3_binfileutils.startReadUniqueSection(fd, sections, 1);
	const protocolId = await fd.readULE32();
	await _iden3_binfileutils.endReadSection(fd);
	if (protocolId === 1) return await readHeaderGroth16(fd, sections, toObject, options);
	else if (protocolId === 2) return await readHeaderPlonk(fd, sections, toObject, options);
	else if (protocolId === 10) return await readHeaderFFlonk(fd, sections, toObject, options);
	else throw new Error("Protocol not supported: ");
}
async function readHeaderGroth16(fd, sections, toObject, options) {
	const zkey = {};
	zkey.protocol = "groth16";
	await _iden3_binfileutils.startReadUniqueSection(fd, sections, 2);
	const n8q = await fd.readULE32();
	zkey.n8q = n8q;
	zkey.q = await _iden3_binfileutils.readBigInt(fd, n8q);
	const n8r = await fd.readULE32();
	zkey.n8r = n8r;
	zkey.r = await _iden3_binfileutils.readBigInt(fd, n8r);
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
	await _iden3_binfileutils.endReadSection(fd);
	return zkey;
}
async function readHeaderPlonk(fd, sections, toObject, options) {
	const zkey = {};
	zkey.protocol = "plonk";
	await _iden3_binfileutils.startReadUniqueSection(fd, sections, 2);
	const n8q = await fd.readULE32();
	zkey.n8q = n8q;
	zkey.q = await _iden3_binfileutils.readBigInt(fd, n8q);
	const n8r = await fd.readULE32();
	zkey.n8r = n8r;
	zkey.r = await _iden3_binfileutils.readBigInt(fd, n8r);
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
	await _iden3_binfileutils.endReadSection(fd);
	return zkey;
}
async function readHeaderFFlonk(fd, sections, toObject, options) {
	const zkey = {};
	zkey.protocol = "fflonk";
	zkey.protocolId = 10;
	await _iden3_binfileutils.startReadUniqueSection(fd, sections, 2);
	const n8q = await fd.readULE32();
	zkey.n8q = n8q;
	zkey.q = await _iden3_binfileutils.readBigInt(fd, n8q);
	zkey.curve = await getCurveFromQ(zkey.q, options);
	const n8r = await fd.readULE32();
	zkey.n8r = n8r;
	zkey.r = await _iden3_binfileutils.readBigInt(fd, n8r);
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
	await _iden3_binfileutils.endReadSection(fd);
	return zkey;
}
async function readZKey(fileName, toObject) {
	const { fd, sections } = await _iden3_binfileutils.readBinFile(fileName, "zkey", 1);
	const zkey = await readHeader$1(fd, sections, toObject);
	const Fr = new ffjavascript.F1Field(zkey.r);
	const Rr = ffjavascript.Scalar.mod(ffjavascript.Scalar.shl(1, zkey.n8r * 8), zkey.r);
	const Rri = Fr.inv(Rr);
	const Rri2 = Fr.mul(Rri, Rri);
	let curve = await getCurveFromQ(zkey.q);
	await _iden3_binfileutils.startReadUniqueSection(fd, sections, 3);
	zkey.IC = [];
	for (let i = 0; i <= zkey.nPublic; i++) {
		const P = await readG1(fd, curve, toObject);
		zkey.IC.push(P);
	}
	await _iden3_binfileutils.endReadSection(fd);
	await _iden3_binfileutils.startReadUniqueSection(fd, sections, 4);
	const nCCoefs = await fd.readULE32();
	zkey.ccoefs = [];
	for (let i = 0; i < nCCoefs; i++) {
		const m = await fd.readULE32();
		const c = await fd.readULE32();
		const s = await fd.readULE32();
		const v = await readFr2(toObject);
		zkey.ccoefs.push({
			matrix: m,
			constraint: c,
			signal: s,
			value: v
		});
	}
	await _iden3_binfileutils.endReadSection(fd);
	await _iden3_binfileutils.startReadUniqueSection(fd, sections, 5);
	zkey.A = [];
	for (let i = 0; i < zkey.nVars; i++) {
		const A = await readG1(fd, curve, toObject);
		zkey.A[i] = A;
	}
	await _iden3_binfileutils.endReadSection(fd);
	await _iden3_binfileutils.startReadUniqueSection(fd, sections, 6);
	zkey.B1 = [];
	for (let i = 0; i < zkey.nVars; i++) {
		const B1 = await readG1(fd, curve, toObject);
		zkey.B1[i] = B1;
	}
	await _iden3_binfileutils.endReadSection(fd);
	await _iden3_binfileutils.startReadUniqueSection(fd, sections, 7);
	zkey.B2 = [];
	for (let i = 0; i < zkey.nVars; i++) {
		const B2 = await readG2(fd, curve, toObject);
		zkey.B2[i] = B2;
	}
	await _iden3_binfileutils.endReadSection(fd);
	await _iden3_binfileutils.startReadUniqueSection(fd, sections, 8);
	zkey.C = [];
	for (let i = zkey.nPublic + 1; i < zkey.nVars; i++) {
		const C = await readG1(fd, curve, toObject);
		zkey.C[i] = C;
	}
	await _iden3_binfileutils.endReadSection(fd);
	await _iden3_binfileutils.startReadUniqueSection(fd, sections, 9);
	zkey.hExps = [];
	for (let i = 0; i < zkey.domainSize; i++) {
		const H = await readG1(fd, curve, toObject);
		zkey.hExps.push(H);
	}
	await _iden3_binfileutils.endReadSection(fd);
	await fd.close();
	return zkey;
	async function readFr2() {
		const n = await _iden3_binfileutils.readBigInt(fd, zkey.n8r);
		return Fr.mul(n, Rri2);
	}
}
async function readContribution(fd, curve, toObject) {
	const c = { delta: {} };
	c.deltaAfter = await readG1(fd, curve, toObject);
	c.delta.g1_s = await readG1(fd, curve, toObject);
	c.delta.g1_sx = await readG1(fd, curve, toObject);
	c.delta.g2_spx = await readG2(fd, curve, toObject);
	c.transcript = await fd.read(64);
	c.type = await fd.readULE32();
	const paramLength = await fd.readULE32();
	const curPos = fd.pos;
	let lastType = 0;
	while (fd.pos - curPos < paramLength) {
		const buffType = await fd.read(1);
		if (buffType[0] <= lastType) throw new Error("Parameters in the contribution must be sorted");
		lastType = buffType[0];
		if (buffType[0] == 1) {
			const buffLen = await fd.read(1);
			const buffStr = await fd.read(buffLen[0]);
			c.name = new TextDecoder().decode(buffStr);
		} else if (buffType[0] == 2) c.numIterationsExp = (await fd.read(1))[0];
		else if (buffType[0] == 3) {
			const buffLen = await fd.read(1);
			c.beaconHash = await fd.read(buffLen[0]);
		} else throw new Error("Parameter not recognized");
	}
	if (fd.pos != curPos + paramLength) throw new Error("Parameters do not match");
	return c;
}
async function readMPCParams(fd, curve, sections) {
	await _iden3_binfileutils.startReadUniqueSection(fd, sections, 10);
	const res = { contributions: [] };
	res.csHash = await fd.read(64);
	const n = await fd.readULE32();
	for (let i = 0; i < n; i++) {
		const c = await readContribution(fd, curve);
		res.contributions.push(c);
	}
	await _iden3_binfileutils.endReadSection(fd);
	return res;
}
async function writeContribution(fd, curve, c) {
	await writeG1(fd, curve, c.deltaAfter);
	await writeG1(fd, curve, c.delta.g1_s);
	await writeG1(fd, curve, c.delta.g1_sx);
	await writeG2(fd, curve, c.delta.g2_spx);
	await fd.write(c.transcript);
	await fd.writeULE32(c.type || 0);
	const params = [];
	if (c.name) {
		params.push(1);
		const nameData = new TextEncoder("utf-8").encode(c.name.substring(0, 64));
		params.push(nameData.byteLength);
		for (let i = 0; i < nameData.byteLength; i++) params.push(nameData[i]);
	}
	if (c.type == 1) {
		params.push(2);
		params.push(c.numIterationsExp);
		params.push(3);
		params.push(c.beaconHash.byteLength);
		for (let i = 0; i < c.beaconHash.byteLength; i++) params.push(c.beaconHash[i]);
	}
	if (params.length > 0) {
		const paramsBuff = new Uint8Array(params);
		await fd.writeULE32(paramsBuff.byteLength);
		await fd.write(paramsBuff);
	} else await fd.writeULE32(0);
}
async function writeMPCParams(fd, curve, mpcParams) {
	await _iden3_binfileutils.startWriteSection(fd, 10);
	await fd.write(mpcParams.csHash);
	await fd.writeULE32(mpcParams.contributions.length);
	for (let i = 0; i < mpcParams.contributions.length; i++) await writeContribution(fd, curve, mpcParams.contributions[i]);
	await _iden3_binfileutils.endWriteSection(fd);
}
function hashG1(hasher, curve, p) {
	const buff = new Uint8Array(curve.G1.F.n8 * 2);
	curve.G1.toRprUncompressed(buff, 0, p);
	hasher.update(buff);
}
function hashG2(hasher, curve, p) {
	const buff = new Uint8Array(curve.G2.F.n8 * 2);
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
//#endregion
//#region src/zkey_export_bellman.js
async function phase2exportMPCParams(zkeyName, mpcparamsName, logger) {
	const { fd: fdZKey, sections: sectionsZKey } = await _iden3_binfileutils.readBinFile(zkeyName, "zkey", 2);
	const zkey = await readHeader$1(fdZKey, sectionsZKey);
	if (zkey.protocol != "groth16") throw new Error("zkey file is not groth16");
	const curve = await getCurveFromQ(zkey.q);
	const sG1 = curve.G1.F.n8 * 2;
	const sG2 = curve.G2.F.n8 * 2;
	const mpcParams = await readMPCParams(fdZKey, curve, sectionsZKey);
	const fdMPCParams = await fastfile.createOverride(mpcparamsName);
	await writeG1(zkey.vk_alpha_1);
	await writeG1(zkey.vk_beta_1);
	await writeG2(zkey.vk_beta_2);
	await writeG2(zkey.vk_gamma_2);
	await writeG1(zkey.vk_delta_1);
	await writeG2(zkey.vk_delta_2);
	let buffBasesIC;
	buffBasesIC = await _iden3_binfileutils.readSection(fdZKey, sectionsZKey, 3);
	buffBasesIC = await curve.G1.batchLEMtoU(buffBasesIC);
	await writePointArray("G1", buffBasesIC);
	const buffBasesH_Lodd = await _iden3_binfileutils.readSection(fdZKey, sectionsZKey, 9);
	let buffBasesH_Tau;
	buffBasesH_Tau = await curve.G1.fft(buffBasesH_Lodd, "affine", "jacobian", logger);
	buffBasesH_Tau = await curve.G1.batchApplyKey(buffBasesH_Tau, curve.Fr.neg(curve.Fr.e(2)), curve.Fr.w[zkey.power + 1], "jacobian", "affine", logger);
	buffBasesH_Tau = buffBasesH_Tau.slice(0, buffBasesH_Tau.byteLength - sG1);
	buffBasesH_Tau = await curve.G1.batchLEMtoU(buffBasesH_Tau);
	await writePointArray("G1", buffBasesH_Tau);
	let buffBasesC;
	buffBasesC = await _iden3_binfileutils.readSection(fdZKey, sectionsZKey, 8);
	buffBasesC = await curve.G1.batchLEMtoU(buffBasesC);
	await writePointArray("G1", buffBasesC);
	let buffBasesA;
	buffBasesA = await _iden3_binfileutils.readSection(fdZKey, sectionsZKey, 5);
	buffBasesA = await curve.G1.batchLEMtoU(buffBasesA);
	await writePointArray("G1", buffBasesA);
	let buffBasesB1;
	buffBasesB1 = await _iden3_binfileutils.readSection(fdZKey, sectionsZKey, 6);
	buffBasesB1 = await curve.G1.batchLEMtoU(buffBasesB1);
	await writePointArray("G1", buffBasesB1);
	let buffBasesB2;
	buffBasesB2 = await _iden3_binfileutils.readSection(fdZKey, sectionsZKey, 7);
	buffBasesB2 = await curve.G2.batchLEMtoU(buffBasesB2);
	await writePointArray("G2", buffBasesB2);
	await fdMPCParams.write(mpcParams.csHash);
	await writeU32(mpcParams.contributions.length);
	for (let i = 0; i < mpcParams.contributions.length; i++) {
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
		if (groupName == "G1") sG = sG1;
		else sG = sG2;
		const buffSize = /* @__PURE__ */ new Uint8Array(4);
		new DataView(buffSize.buffer, buffSize.byteOffset, buffSize.byteLength).setUint32(0, buff.byteLength / sG, false);
		await fdMPCParams.write(buffSize);
		await fdMPCParams.write(buff);
	}
	async function writeU32(n) {
		const buffSize = /* @__PURE__ */ new Uint8Array(4);
		new DataView(buffSize.buffer, buffSize.byteOffset, buffSize.byteLength).setUint32(0, n, false);
		await fdMPCParams.write(buffSize);
	}
}
//#endregion
//#region src/zkey_import_bellman.js
async function phase2importMPCParams(zkeyNameOld, mpcparamsName, zkeyNameNew, name, logger) {
	const fds = {};
	try {
		return await _phase2importMPCParams(zkeyNameOld, mpcparamsName, zkeyNameNew, name, logger, fds);
	} finally {
		for (const openFd of [
			fds.fdZKeyOld,
			fds.fdMPCParams,
			fds.fdZKeyNew
		]) try {
			if (openFd) await openFd.close();
		} catch (e) {}
	}
}
async function _phase2importMPCParams(zkeyNameOld, mpcparamsName, zkeyNameNew, name, logger, fds) {
	const { fd: fdZKeyOld, sections: sectionsZKeyOld } = await _iden3_binfileutils.readBinFile(zkeyNameOld, "zkey", 2);
	fds.fdZKeyOld = fdZKeyOld;
	const zkeyHeader = await readHeader$1(fdZKeyOld, sectionsZKeyOld, false);
	if (zkeyHeader.protocol != "groth16") throw new Error("zkey file is not groth16");
	const curve = await getCurveFromQ(zkeyHeader.q);
	const sG1 = curve.G1.F.n8 * 2;
	const sG2 = curve.G2.F.n8 * 2;
	const oldMPCParams = await readMPCParams(fdZKeyOld, curve, sectionsZKeyOld);
	const newMPCParams = {};
	const fdMPCParams = await fastfile.readExisting(mpcparamsName);
	fds.fdMPCParams = fdMPCParams;
	fdMPCParams.pos = sG1 * 3 + sG2 * 3 + 8 + sG1 * zkeyHeader.nVars + 4 + sG1 * (zkeyHeader.domainSize - 1) + 4 + sG1 * zkeyHeader.nVars + 4 + sG1 * zkeyHeader.nVars + 4 + sG2 * zkeyHeader.nVars;
	newMPCParams.csHash = await fdMPCParams.read(64);
	const nContributions = await fdMPCParams.readUBE32();
	newMPCParams.contributions = [];
	for (let i = 0; i < nContributions; i++) {
		const c = { delta: {} };
		c.deltaAfter = await readG1(fdMPCParams);
		c.delta.g1_s = await readG1(fdMPCParams);
		c.delta.g1_sx = await readG1(fdMPCParams);
		c.delta.g2_spx = await readG2(fdMPCParams);
		c.transcript = await fdMPCParams.read(64);
		if (i < oldMPCParams.contributions.length) {
			c.type = oldMPCParams.contributions[i].type;
			if (c.type == 1) {
				c.beaconHash = oldMPCParams.contributions[i].beaconHash;
				c.numIterationsExp = oldMPCParams.contributions[i].numIterationsExp;
			}
			if (oldMPCParams.contributions[i].name) c.name = oldMPCParams.contributions[i].name;
		}
		newMPCParams.contributions.push(c);
	}
	/* c8 ignore start */
	if (!hashIsEqual(newMPCParams.csHash, oldMPCParams.csHash)) {
		if (logger) logger.error("Hash of the original circuit does not match with the MPC one");
		return false;
	}
	/* c8 ignore stop */
	if (oldMPCParams.contributions.length > newMPCParams.contributions.length) {
		if (logger) logger.error("The impoerted file does not include new contributions");
		return false;
	}
	for (let i = 0; i < oldMPCParams.contributions.length; i++) if (!contributionIsEqual(oldMPCParams.contributions[i], newMPCParams.contributions[i])) {
		if (logger) logger.error(`Previous contribution ${i} does not match`);
		return false;
	}
	if (name) for (let i = oldMPCParams.contributions.length; i < newMPCParams.contributions.length; i++) newMPCParams.contributions[i].name = name;
	const fdZKeyNew = await _iden3_binfileutils.createBinFile(zkeyNameNew, "zkey", 1, 10);
	fds.fdZKeyNew = fdZKeyNew;
	fdMPCParams.pos = 0;
	fdMPCParams.pos += sG1;
	fdMPCParams.pos += sG1;
	fdMPCParams.pos += sG2;
	fdMPCParams.pos += sG2;
	zkeyHeader.vk_delta_1 = await readG1(fdMPCParams);
	zkeyHeader.vk_delta_2 = await readG2(fdMPCParams);
	await writeHeader(fdZKeyNew, zkeyHeader);
	/* c8 ignore start */
	if (await fdMPCParams.readUBE32() != zkeyHeader.nPublic + 1) {
		if (logger) logger.error("Invalid number of points in IC");
		await fdZKeyNew.discard();
		return false;
	}
	/* c8 ignore stop */
	fdMPCParams.pos += sG1 * (zkeyHeader.nPublic + 1);
	await _iden3_binfileutils.copySection(fdZKeyOld, sectionsZKeyOld, fdZKeyNew, 3);
	await _iden3_binfileutils.copySection(fdZKeyOld, sectionsZKeyOld, fdZKeyNew, 4);
	/* c8 ignore start */
	if (await fdMPCParams.readUBE32() != zkeyHeader.domainSize - 1) {
		if (logger) logger.error("Invalid number of points in H");
		await fdZKeyNew.discard();
		return false;
	}
	/* c8 ignore stop */
	let buffH;
	const buffTauU = await fdMPCParams.read(sG1 * (zkeyHeader.domainSize - 1));
	const buffTauLEM = await curve.G1.batchUtoLEM(buffTauU);
	buffH = new Uint8Array(zkeyHeader.domainSize * sG1);
	buffH.set(buffTauLEM);
	curve.G1.toRprLEM(buffH, sG1 * (zkeyHeader.domainSize - 1), curve.G1.zeroAffine);
	const n2Inv = curve.Fr.neg(curve.Fr.inv(curve.Fr.e(2)));
	const wInv = curve.Fr.inv(curve.Fr.w[zkeyHeader.power + 1]);
	buffH = await curve.G1.batchApplyKey(buffH, n2Inv, wInv, "affine", "jacobian", logger);
	buffH = await curve.G1.ifft(buffH, "jacobian", "affine", logger);
	await _iden3_binfileutils.startWriteSection(fdZKeyNew, 9);
	await fdZKeyNew.write(buffH);
	await _iden3_binfileutils.endWriteSection(fdZKeyNew);
	/* c8 ignore start */
	if (await fdMPCParams.readUBE32() != zkeyHeader.nVars - zkeyHeader.nPublic - 1) {
		if (logger) logger.error("Invalid number of points in L");
		await fdZKeyNew.discard();
		return false;
	}
	/* c8 ignore stop */
	let buffL;
	buffL = await fdMPCParams.read(sG1 * (zkeyHeader.nVars - zkeyHeader.nPublic - 1));
	buffL = await curve.G1.batchUtoLEM(buffL);
	await _iden3_binfileutils.startWriteSection(fdZKeyNew, 8);
	await fdZKeyNew.write(buffL);
	await _iden3_binfileutils.endWriteSection(fdZKeyNew);
	/* c8 ignore start */
	if (await fdMPCParams.readUBE32() != zkeyHeader.nVars) {
		if (logger) logger.error("Invalid number of points in A");
		await fdZKeyNew.discard();
		return false;
	}
	/* c8 ignore stop */
	fdMPCParams.pos += sG1 * zkeyHeader.nVars;
	await _iden3_binfileutils.copySection(fdZKeyOld, sectionsZKeyOld, fdZKeyNew, 5);
	/* c8 ignore start */
	if (await fdMPCParams.readUBE32() != zkeyHeader.nVars) {
		if (logger) logger.error("Invalid number of points in B1");
		await fdZKeyNew.discard();
		return false;
	}
	/* c8 ignore stop */
	fdMPCParams.pos += sG1 * zkeyHeader.nVars;
	await _iden3_binfileutils.copySection(fdZKeyOld, sectionsZKeyOld, fdZKeyNew, 6);
	/* c8 ignore start */
	if (await fdMPCParams.readUBE32() != zkeyHeader.nVars) {
		if (logger) logger.error("Invalid number of points in B2");
		await fdZKeyNew.discard();
		return false;
	}
	/* c8 ignore stop */
	fdMPCParams.pos += sG2 * zkeyHeader.nVars;
	await _iden3_binfileutils.copySection(fdZKeyOld, sectionsZKeyOld, fdZKeyNew, 7);
	await writeMPCParams(fdZKeyNew, curve, newMPCParams);
	await fdMPCParams.close();
	await fdZKeyNew.close();
	await fdZKeyOld.close();
	return true;
	async function readG1(fd) {
		const buff = await fd.read(curve.G1.F.n8 * 2);
		return curve.G1.fromRprUncompressed(buff, 0);
	}
	async function readG2(fd) {
		const buff = await fd.read(curve.G2.F.n8 * 2);
		return curve.G2.fromRprUncompressed(buff, 0);
	}
	function contributionIsEqual(c1, c2) {
		/* c8 ignore start */
		if (!curve.G1.eq(c1.deltaAfter, c2.deltaAfter)) return false;
		/* c8 ignore stop */
		/* c8 ignore start */
		if (!curve.G1.eq(c1.delta.g1_s, c2.delta.g1_s)) return false;
		/* c8 ignore stop */
		/* c8 ignore start */
		if (!curve.G1.eq(c1.delta.g1_sx, c2.delta.g1_sx)) return false;
		/* c8 ignore stop */
		if (!curve.G2.eq(c1.delta.g2_spx, c2.delta.g2_spx)) return false;
		/* c8 ignore start */
		if (!hashIsEqual(c1.transcript, c2.transcript)) return false;
		/* c8 ignore stop */
		return true;
	}
}
//#endregion
//#region src/zkey_verify_frominit.js
/* c8 ignore stop */ var sameRatio = sameRatio$2;
async function phase2verifyFromInit(initFileName, pTauFileName, zkeyFileName, logger) {
	const fds = {};
	try {
		return await _phase2verifyFromInit(initFileName, pTauFileName, zkeyFileName, logger, fds);
	} finally {
		for (const openFd of [
			fds.fd,
			fds.fdInit,
			fds.fdPTau
		]) try {
			if (openFd) await openFd.close();
		} catch (e) {}
	}
}
async function _phase2verifyFromInit(initFileName, pTauFileName, zkeyFileName, logger, fds) {
	let sr;
	const { fd, sections } = await _iden3_binfileutils.readBinFile(zkeyFileName, "zkey", 2);
	fds.fd = fd;
	const zkey = await readHeader$1(fd, sections, false);
	if (zkey.protocol != "groth16") throw new Error("zkey file is not groth16");
	const curve = await getCurveFromQ(zkey.q);
	const sG1 = curve.G1.F.n8 * 2;
	const mpcParams = await readMPCParams(fd, curve, sections);
	const accumulatedHasher = _noble_hashes_blake2_js.blake2b.create({ dkLen: 64 });
	accumulatedHasher.update(mpcParams.csHash);
	let curDelta = curve.G1.g;
	for (let i = 0; i < mpcParams.contributions.length; i++) {
		const c = mpcParams.contributions[i];
		const ourHasher = cloneHasher(accumulatedHasher);
		hashG1(ourHasher, curve, c.delta.g1_s);
		hashG1(ourHasher, curve, c.delta.g1_sx);
		/* c8 ignore start */
		if (!hashIsEqual(ourHasher.digest(), c.transcript)) {
			console.log(`INVALID(${i}): Inconsistent transcript `);
			return false;
		}
		/* c8 ignore stop */
		const delta_g2_sp = hashToG2(curve, c.transcript);
		sr = await sameRatio(curve, c.delta.g1_s, c.delta.g1_sx, delta_g2_sp, c.delta.g2_spx);
		/* c8 ignore start */
		if (sr !== true) {
			console.log(`INVALID(${i}): public key G1 and G2 do not have the same ration `);
			return false;
		}
		/* c8 ignore stop */
		sr = await sameRatio(curve, curDelta, c.deltaAfter, delta_g2_sp, c.delta.g2_spx);
		/* c8 ignore start */
		if (sr !== true) {
			console.log(`INVALID(${i}): deltaAfter does not fillow the public key `);
			return false;
		}
		/* c8 ignore stop */
		if (c.type == 1) {
			const rng = await rngFromBeaconParams(c.beaconHash, c.numIterationsExp);
			const expected_prvKey = curve.Fr.fromRng(rng);
			const expected_g1_s = curve.G1.toAffine(curve.G1.fromRng(rng));
			const expected_g1_sx = curve.G1.toAffine(curve.G1.timesFr(expected_g1_s, expected_prvKey));
			/* c8 ignore start */
			if (curve.G1.eq(expected_g1_s, c.delta.g1_s) !== true) {
				console.log(`INVALID(${i}): Key of the beacon does not match. g1_s `);
				return false;
			}
			/* c8 ignore stop */
			/* c8 ignore start */
			if (curve.G1.eq(expected_g1_sx, c.delta.g1_sx) !== true) {
				console.log(`INVALID(${i}): Key of the beacon does not match. g1_sx `);
				return false;
			}
		}
		hashPubKey(accumulatedHasher, curve, c);
		const contributionHasher = _noble_hashes_blake2_js.blake2b.create({ dkLen: 64 });
		hashPubKey(contributionHasher, curve, c);
		c.contributionHash = contributionHasher.digest();
		curDelta = c.deltaAfter;
	}
	const { fd: fdInit, sections: sectionsInit } = await _iden3_binfileutils.readBinFile(initFileName, "zkey", 2);
	fds.fdInit = fdInit;
	const zkeyInit = await readHeader$1(fdInit, sectionsInit, false);
	if (zkeyInit.protocol != "groth16") throw new Error("zkeyinit file is not groth16");
	if (!ffjavascript.Scalar.eq(zkeyInit.q, zkey.q) || !ffjavascript.Scalar.eq(zkeyInit.r, zkey.r) || zkeyInit.n8q != zkey.n8q || zkeyInit.n8r != zkey.n8r) {
		if (logger) logger.error("INVALID:  Different curves");
		return false;
	}
	if (zkeyInit.nVars != zkey.nVars || zkeyInit.nPublic != zkey.nPublic || zkeyInit.domainSize != zkey.domainSize) {
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
	/* c8 ignore start */
	if (sections[8][0].size != sG1 * (zkey.nVars - zkey.nPublic - 1)) {
		if (logger) logger.error("INVALID:  Invalid L section size");
		return false;
	}
	/* c8 ignore stop */
	/* c8 ignore start */
	if (sections[9][0].size != sG1 * zkey.domainSize) {
		if (logger) logger.error("INVALID:  Invalid H section size");
		return false;
	}
	/* c8 ignore stop */
	let ss;
	ss = await _iden3_binfileutils.sectionIsEqual(fd, sections, fdInit, sectionsInit, 3);
	if (!ss) {
		if (logger) logger.error("INVALID:  IC section is not identical");
		return false;
	}
	ss = await _iden3_binfileutils.sectionIsEqual(fd, sections, fdInit, sectionsInit, 4);
	if (!ss) {
		if (logger) logger.error("Coeffs section is not identical");
		return false;
	}
	ss = await _iden3_binfileutils.sectionIsEqual(fd, sections, fdInit, sectionsInit, 5);
	if (!ss) {
		if (logger) logger.error("A section is not identical");
		return false;
	}
	ss = await _iden3_binfileutils.sectionIsEqual(fd, sections, fdInit, sectionsInit, 6);
	if (!ss) {
		if (logger) logger.error("B1 section is not identical");
		return false;
	}
	ss = await _iden3_binfileutils.sectionIsEqual(fd, sections, fdInit, sectionsInit, 7);
	if (!ss) {
		if (logger) logger.error("B2 section is not identical");
		return false;
	}
	sr = await sectionHasSameRatio("G1", fdInit, sectionsInit, fd, sections, 8, zkey.vk_delta_2, zkeyInit.vk_delta_2, "L section");
	if (sr !== true) {
		if (logger) logger.error("L section does not match");
		return false;
	}
	sr = await sameRatioH();
	if (sr !== true) {
		if (logger) logger.error("H section does not match");
		return false;
	}
	if (logger) logger.info(formatHash(mpcParams.csHash, "Circuit Hash: "));
	await fd.close();
	await fdInit.close();
	for (let i = mpcParams.contributions.length - 1; i >= 0; i--) {
		const c = mpcParams.contributions[i];
		if (logger) logger.info("-------------------------");
		if (logger) logger.info(formatHash(c.contributionHash, `contribution #${i + 1} ${c.name ? c.name : ""}:`));
		if (c.type == 1) {
			if (logger) logger.info(`Beacon generator: ${byteArray2hex(c.beaconHash)}`);
			if (logger) logger.info(`Beacon iterations Exp: ${c.numIterationsExp}`);
		}
	}
	if (logger) logger.info("-------------------------");
	if (logger) logger.info("ZKey Ok!");
	return true;
	async function sectionHasSameRatio(groupName, fd1, sections1, fd2, sections2, idSection, g2sp, g2spx, sectionName) {
		const MAX_CHUNK_SIZE = 1 << 20;
		const G = curve[groupName];
		const sG = G.F.n8 * 2;
		await _iden3_binfileutils.startReadUniqueSection(fd1, sections1, idSection);
		await _iden3_binfileutils.startReadUniqueSection(fd2, sections2, idSection);
		let R1 = G.zero;
		let R2 = G.zero;
		const nPoints = sections1[idSection][0].size / sG;
		for (let i = 0; i < nPoints; i += MAX_CHUNK_SIZE) {
			if (logger) logger.debug(`Same ratio check ${sectionName}:  ${i}/${nPoints}`);
			const n = Math.min(nPoints - i, MAX_CHUNK_SIZE);
			const bases1 = await fd1.read(n * sG);
			const bases2 = await fd2.read(n * sG);
			const scalars = getRandomBytes(4 * n);
			const r1 = await G.multiExpAffine(bases1, scalars);
			const r2 = await G.multiExpAffine(bases2, scalars);
			R1 = G.add(R1, r1);
			R2 = G.add(R2, r2);
		}
		await _iden3_binfileutils.endReadSection(fd1);
		await _iden3_binfileutils.endReadSection(fd2);
		/* c8 ignore start */
		if (nPoints == 0) return true;
		/* c8 ignore stop */
		sr = await sameRatio(curve, R1, R2, g2sp, g2spx);
		if (sr !== true) return false;
		return true;
	}
	async function sameRatioH() {
		const MAX_CHUNK_SIZE = 1 << 20;
		const G = curve.G1;
		const Fr = curve.Fr;
		const sG = G.F.n8 * 2;
		const { fd: fdPTau, sections: sectionsPTau } = await _iden3_binfileutils.readBinFile(pTauFileName, "ptau", 1);
		fds.fdPTau = fdPTau;
		let buff_r = new ffjavascript.BigBuffer(zkey.domainSize * zkey.n8r);
		const seed = new Array(8);
		for (let i = 0; i < 8; i++) seed[i] = readUInt32BE(getRandomBytes(4), 0);
		const rng = new ffjavascript.ChaCha(seed);
		for (let i = 0; i < zkey.domainSize - 1; i++) {
			const e = Fr.fromRng(rng);
			Fr.toRprLE(buff_r, i * zkey.n8r, e);
		}
		Fr.toRprLE(buff_r, (zkey.domainSize - 1) * zkey.n8r, Fr.zero);
		let R1 = G.zero;
		for (let i = 0; i < zkey.domainSize; i += MAX_CHUNK_SIZE) {
			if (logger) logger.debug(`H Verification(tau):  ${i}/${zkey.domainSize}`);
			const n = Math.min(zkey.domainSize - i, MAX_CHUNK_SIZE);
			const buffB = await batchSubtract(await fdPTau.read(sG * n, sectionsPTau[2][0].p + zkey.domainSize * sG + i * sG), await fdPTau.read(sG * n, sectionsPTau[2][0].p + i * sG));
			const buffS = buff_r.slice(i * zkey.n8r, (i + n) * zkey.n8r);
			const r = await G.multiExpAffine(buffB, buffS);
			R1 = G.add(R1, r);
		}
		buff_r = await Fr.batchToMontgomery(buff_r);
		let first;
		if (zkey.power < Fr.s) first = Fr.neg(Fr.e(2));
		else {
			/* c8 ignore start */
			const small_m = 2 ** Fr.s;
			const shift_to_small_m = Fr.exp(Fr.shift, small_m);
			first = Fr.sub(shift_to_small_m, Fr.one);
		}
		/* c8 ignore start */
		const inc = zkey.power < Fr.s ? Fr.w[zkey.power + 1] : Fr.shift;
		/* c8 ignore stop */
		buff_r = await Fr.batchApplyKey(buff_r, first, inc);
		buff_r = await Fr.fft(buff_r);
		buff_r = await Fr.batchFromMontgomery(buff_r);
		await _iden3_binfileutils.startReadUniqueSection(fd, sections, 9);
		let R2 = G.zero;
		for (let i = 0; i < zkey.domainSize; i += MAX_CHUNK_SIZE) {
			if (logger) logger.debug(`H Verification(lagrange):  ${i}/${zkey.domainSize}`);
			const n = Math.min(zkey.domainSize - i, MAX_CHUNK_SIZE);
			const buff = await fd.read(sG * n);
			const buffS = buff_r.slice(i * zkey.n8r, (i + n) * zkey.n8r);
			const r = await G.multiExpAffine(buff, buffS);
			R2 = G.add(R2, r);
		}
		await _iden3_binfileutils.endReadSection(fd);
		sr = await sameRatio(curve, R1, R2, zkey.vk_delta_2, zkeyInit.vk_delta_2);
		if (sr !== true) return false;
		return true;
	}
	async function batchSubtract(buff1, buff2) {
		const sG = curve.G1.F.n8 * 2;
		const nPoints = buff1.byteLength / sG;
		const concurrency = curve.tm.concurrency;
		const nPointsPerThread = Math.floor(nPoints / concurrency);
		const opPromises = [];
		for (let i = 0; i < concurrency; i++) {
			let n;
			if (i < concurrency - 1) n = nPointsPerThread;
			else n = nPoints - i * nPointsPerThread;
			/* c8 ignore start */
			if (n == 0) continue;
			/* c8 ignore stop */
			const subBuff1 = buff1.slice(i * nPointsPerThread * sG1, (i * nPointsPerThread + n) * sG1);
			const subBuff2 = buff2.slice(i * nPointsPerThread * sG1, (i * nPointsPerThread + n) * sG1);
			opPromises.push(batchSubtractThread(subBuff1, subBuff2));
		}
		const result = await Promise.all(opPromises);
		const fullBuffOut = new Uint8Array(nPoints * sG);
		let p = 0;
		for (let i = 0; i < result.length; i++) {
			fullBuffOut.set(result[i][0], p);
			p += result[i][0].byteLength;
		}
		return fullBuffOut;
	}
	async function batchSubtractThread(buff1, buff2) {
		const sG1 = curve.G1.F.n8 * 2;
		const sGmid = curve.G1.F.n8 * 3;
		const nPoints = buff1.byteLength / sG1;
		const task = [];
		task.push({
			cmd: "ALLOCSET",
			var: 0,
			buff: buff1
		});
		task.push({
			cmd: "ALLOCSET",
			var: 1,
			buff: buff2
		});
		task.push({
			cmd: "ALLOC",
			var: 2,
			len: nPoints * sGmid
		});
		for (let i = 0; i < nPoints; i++) task.push({
			cmd: "CALL",
			fnName: "g1m_subAffine",
			params: [
				{
					var: 0,
					offset: i * sG1
				},
				{
					var: 1,
					offset: i * sG1
				},
				{
					var: 2,
					offset: i * sGmid
				}
			]
		});
		task.push({
			cmd: "CALL",
			fnName: "g1m_batchToAffine",
			params: [
				{ var: 2 },
				{ val: nPoints },
				{ var: 2 }
			]
		});
		task.push({
			cmd: "GET",
			out: 0,
			var: 2,
			len: nPoints * sG1
		});
		return await curve.tm.queueAction(task);
	}
}
//#endregion
//#region src/zkey_verify_fromr1cs.js
async function phase2verifyFromR1cs(r1csFileName, pTauFileName, zkeyFileName, logger) {
	const initFileName = { type: "bigMem" };
	await newZKey(r1csFileName, pTauFileName, initFileName, logger);
	return await phase2verifyFromInit(initFileName, pTauFileName, zkeyFileName, logger);
}
//#endregion
//#region src/zkey_contribute.js
async function phase2contribute(zkeyNameOld, zkeyNameNew, name, entropy, logger) {
	const { fd: fdOld, sections } = await _iden3_binfileutils.readBinFile(zkeyNameOld, "zkey", 2);
	const zkey = await readHeader$1(fdOld, sections);
	if (zkey.protocol != "groth16") throw new Error("zkey file is not groth16");
	const curve = await getCurveFromQ(zkey.q);
	const mpcParams = await readMPCParams(fdOld, curve, sections);
	const fdNew = await _iden3_binfileutils.createBinFile(zkeyNameNew, "zkey", 1, 10);
	const rng = await getRandomRng(entropy);
	const transcriptHasher = _noble_hashes_blake2_js.blake2b.create({ dkLen: 64 });
	transcriptHasher.update(mpcParams.csHash);
	for (let i = 0; i < mpcParams.contributions.length; i++) hashPubKey(transcriptHasher, curve, mpcParams.contributions[i]);
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
	await _iden3_binfileutils.copySection(fdOld, sections, fdNew, 3);
	await _iden3_binfileutils.copySection(fdOld, sections, fdNew, 4);
	await _iden3_binfileutils.copySection(fdOld, sections, fdNew, 5);
	await _iden3_binfileutils.copySection(fdOld, sections, fdNew, 6);
	await _iden3_binfileutils.copySection(fdOld, sections, fdNew, 7);
	const invDelta = curve.Fr.inv(curContribution.delta.prvKey);
	await applyKeyToSection(fdOld, sections, fdNew, 8, curve, "G1", invDelta, curve.Fr.e(1), "L Section", logger);
	await applyKeyToSection(fdOld, sections, fdNew, 9, curve, "G1", invDelta, curve.Fr.e(1), "H Section", logger);
	await writeMPCParams(fdNew, curve, mpcParams);
	await fdOld.close();
	await fdNew.close();
	const contributionHasher = _noble_hashes_blake2_js.blake2b.create({ dkLen: 64 });
	hashPubKey(contributionHasher, curve, curContribution);
	const contributionHash = contributionHasher.digest();
	if (logger) logger.info(formatHash(mpcParams.csHash, "Circuit Hash: "));
	if (logger) logger.info(formatHash(contributionHash, "Contribution Hash: "));
	return contributionHash;
}
//#endregion
//#region src/zkey_beacon.js
async function beacon(zkeyNameOld, zkeyNameNew, name, beaconHashStr, numIterationsExp, logger) {
	const beaconHash = hex2ByteArray(beaconHashStr);
	if (beaconHash.byteLength == 0 || beaconHash.byteLength * 2 != beaconHashStr.length) {
		if (logger) logger.error("Invalid Beacon Hash. (It must be a valid hexadecimal sequence)");
		return false;
	}
	if (beaconHash.length >= 256) {
		if (logger) logger.error("Maximum length of beacon hash is 255 bytes");
		return false;
	}
	numIterationsExp = parseInt(numIterationsExp);
	if (numIterationsExp < 10 || numIterationsExp > 63) {
		if (logger) logger.error("Invalid numIterationsExp. (Must be between 10 and 63)");
		return false;
	}
	const { fd: fdOld, sections } = await _iden3_binfileutils.readBinFile(zkeyNameOld, "zkey", 2);
	const zkey = await readHeader$1(fdOld, sections);
	if (zkey.protocol != "groth16") throw new Error("zkey file is not groth16");
	const curve = await getCurveFromQ(zkey.q);
	const mpcParams = await readMPCParams(fdOld, curve, sections);
	const fdNew = await _iden3_binfileutils.createBinFile(zkeyNameNew, "zkey", 1, 10);
	const rng = await rngFromBeaconParams(beaconHash, numIterationsExp);
	const transcriptHasher = _noble_hashes_blake2_js.blake2b.create({ dkLen: 64 });
	transcriptHasher.update(mpcParams.csHash);
	for (let i = 0; i < mpcParams.contributions.length; i++) hashPubKey(transcriptHasher, curve, mpcParams.contributions[i]);
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
	await _iden3_binfileutils.copySection(fdOld, sections, fdNew, 3);
	await _iden3_binfileutils.copySection(fdOld, sections, fdNew, 4);
	await _iden3_binfileutils.copySection(fdOld, sections, fdNew, 5);
	await _iden3_binfileutils.copySection(fdOld, sections, fdNew, 6);
	await _iden3_binfileutils.copySection(fdOld, sections, fdNew, 7);
	const invDelta = curve.Fr.inv(curContribution.delta.prvKey);
	await applyKeyToSection(fdOld, sections, fdNew, 8, curve, "G1", invDelta, curve.Fr.e(1), "L Section", logger);
	await applyKeyToSection(fdOld, sections, fdNew, 9, curve, "G1", invDelta, curve.Fr.e(1), "H Section", logger);
	await writeMPCParams(fdNew, curve, mpcParams);
	await fdOld.close();
	await fdNew.close();
	const contributionHasher = _noble_hashes_blake2_js.blake2b.create({ dkLen: 64 });
	hashPubKey(contributionHasher, curve, curContribution);
	const contributionHash = contributionHasher.digest();
	if (logger) logger.info(formatHash(contributionHash, "Contribution Hash: "));
	return contributionHash;
}
//#endregion
//#region src/zkey_export_json.js
async function zkeyExportJson$1(zkeyFileName) {
	const zKey = await readZKey(zkeyFileName, true);
	delete zKey.curve;
	delete zKey.F;
	return ffjavascript.utils.stringifyBigInts(zKey);
}
//#endregion
//#region src/zkey_bellman_contribute.js
async function bellmanContribute(curve, challengeFilename, responseFileName, entropy, logger) {
	const rng = await getRandomRng(entropy);
	const delta = curve.Fr.fromRng(rng);
	const invDelta = curve.Fr.inv(delta);
	const sG1 = curve.G1.F.n8 * 2;
	const sG2 = curve.G2.F.n8 * 2;
	const fdFrom = await fastfile.readExisting(challengeFilename);
	const fdTo = await fastfile.createOverride(responseFileName);
	await copy(sG1);
	await copy(sG1);
	await copy(sG2);
	await copy(sG2);
	const oldDelta1 = await readG1();
	const delta1 = curve.G1.timesFr(oldDelta1, delta);
	await writeG1(delta1);
	const oldDelta2 = await readG2();
	await writeG2(curve.G2.timesFr(oldDelta2, delta));
	const nIC = await fdFrom.readUBE32();
	await fdTo.writeUBE32(nIC);
	await copy(nIC * sG1);
	const nH = await fdFrom.readUBE32();
	await fdTo.writeUBE32(nH);
	await applyKeyToChallengeSection(fdFrom, fdTo, null, curve, "G1", nH, invDelta, curve.Fr.e(1), "UNCOMPRESSED", "H", logger);
	const nL = await fdFrom.readUBE32();
	await fdTo.writeUBE32(nL);
	await applyKeyToChallengeSection(fdFrom, fdTo, null, curve, "G1", nL, invDelta, curve.Fr.e(1), "UNCOMPRESSED", "L", logger);
	const nA = await fdFrom.readUBE32();
	await fdTo.writeUBE32(nA);
	await copy(nA * sG1);
	const nB1 = await fdFrom.readUBE32();
	await fdTo.writeUBE32(nB1);
	await copy(nB1 * sG1);
	const nB2 = await fdFrom.readUBE32();
	await fdTo.writeUBE32(nB2);
	await copy(nB2 * sG2);
	const transcriptHasher = _noble_hashes_blake2_js.blake2b.create({ dkLen: 64 });
	const mpcParams = {};
	mpcParams.csHash = await fdFrom.read(64);
	transcriptHasher.update(mpcParams.csHash);
	const nContributions = await fdFrom.readUBE32();
	mpcParams.contributions = [];
	for (let i = 0; i < nContributions; i++) {
		const c = { delta: {} };
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
	await fdTo.write(mpcParams.csHash);
	await fdTo.writeUBE32(mpcParams.contributions.length);
	for (let i = 0; i < mpcParams.contributions.length; i++) {
		const c = mpcParams.contributions[i];
		await writeG1(c.deltaAfter);
		await writeG1(c.delta.g1_s);
		await writeG1(c.delta.g1_sx);
		await writeG2(c.delta.g2_spx);
		await fdTo.write(c.transcript);
	}
	const contributionHasher = _noble_hashes_blake2_js.blake2b.create({ dkLen: 64 });
	hashPubKey(contributionHasher, curve, curContribution);
	const contributionHash = contributionHasher.digest();
	if (logger) logger.info(formatHash(contributionHash, "Contribution Hash: "));
	await fdTo.close();
	await fdFrom.close();
	return contributionHash;
	async function copy(nBytes) {
		const CHUNK_SIZE = fdFrom.pageSize * 2;
		for (let i = 0; i < nBytes; i += CHUNK_SIZE) {
			const n = Math.min(nBytes - i, CHUNK_SIZE);
			const buff = await fdFrom.read(n);
			await fdTo.write(buff);
		}
	}
	async function readG1() {
		const buff = await fdFrom.read(curve.G1.F.n8 * 2);
		return curve.G1.fromRprUncompressed(buff, 0);
	}
	async function readG2() {
		const buff = await fdFrom.read(curve.G2.F.n8 * 2);
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
//#endregion
//#region src/zkey_export_verificationkey.js
var { stringifyBigInts: stringifyBigInts$5 } = ffjavascript.utils;
async function zkeyExportVerificationKey(zkeyName, logger) {
	if (logger) logger.info("EXPORT VERIFICATION KEY STARTED");
	const { fd, sections } = await _iden3_binfileutils.readBinFile(zkeyName, "zkey", 2);
	const zkey = await readHeader$1(fd, sections);
	if (logger) logger.info("> Detected protocol: " + zkey.protocol);
	let res;
	if (zkey.protocol === "groth16") res = await groth16Vk(zkey, fd, sections);
	else if (zkey.protocol === "plonk") res = await plonkVk(zkey);
	else if (zkey.protocolId && zkey.protocolId === 10) res = await exportFFlonkVk(zkey, logger);
	else throw new Error("zkey file protocol unrecognized");
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
	await _iden3_binfileutils.startReadUniqueSection(fd, sections, 3);
	vKey.IC = [];
	for (let i = 0; i <= zkey.nPublic; i++) {
		const buff = await fd.read(sG1);
		const P = curve.G1.toObject(buff);
		vKey.IC.push(P);
	}
	await _iden3_binfileutils.endReadSection(fd);
	vKey = stringifyBigInts$5(vKey);
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
	vKey = stringifyBigInts$5(vKey);
	return vKey;
}
async function exportFFlonkVk(zkey, logger) {
	const curve = await getCurveFromQ(zkey.q);
	return stringifyBigInts$5({
		protocol: zkey.protocol,
		curve: curve.name,
		nPublic: zkey.nPublic,
		power: zkey.power,
		k1: curve.Fr.toObject(zkey.k1),
		k2: curve.Fr.toObject(zkey.k2),
		w: curve.Fr.toObject(curve.Fr.w[zkey.power]),
		w3: curve.Fr.toObject(zkey.w3),
		w4: curve.Fr.toObject(zkey.w4),
		w8: curve.Fr.toObject(zkey.w8),
		wr: curve.Fr.toObject(zkey.wr),
		X_2: curve.G2.toObject(zkey.X_2),
		C0: curve.G1.toObject(zkey.C0)
	});
}
//#endregion
//#region src/fflonk_export_solidity_verifier.js
var { unstringifyBigInts: unstringifyBigInts$11, stringifyBigInts: stringifyBigInts$4 } = ffjavascript.utils;
async function fflonkExportSolidityVerifier(vk, templates, logger) {
	if (logger) logger.info("FFLONK EXPORT SOLIDITY VERIFIER STARTED");
	const curve = await getCurveFromName(vk.curve);
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
	const { default: ejs } = await import("ejs");
	return ejs.render(template, vk);
	function fromVkey(str) {
		const val = unstringifyBigInts$11(str);
		return curve.Fr.fromObject(val);
	}
	function toVkey(val) {
		return stringifyBigInts$4(curve.Fr.toObject(val));
	}
}
//#endregion
//#region src/zkey_export_solidityverifier.js
async function exportSolidityVerifier(zKeyName, templates, logger) {
	const verificationKey = await zkeyExportVerificationKey(zKeyName, logger);
	if ("fflonk" === verificationKey.protocol) return fflonkExportSolidityVerifier(verificationKey, templates, logger);
	let template = templates[verificationKey.protocol];
	const { default: ejs } = await import("ejs");
	return ejs.render(template, verificationKey);
}
//#endregion
//#region src/wtns_utils.js
async function write(fd, witness, prime) {
	await _iden3_binfileutils.startWriteSection(fd, 1);
	const n8 = (Math.floor((ffjavascript.Scalar.bitLength(prime) - 1) / 64) + 1) * 8;
	await fd.writeULE32(n8);
	await _iden3_binfileutils.writeBigInt(fd, prime, n8);
	await fd.writeULE32(witness.length);
	await _iden3_binfileutils.endWriteSection(fd);
	await _iden3_binfileutils.startWriteSection(fd, 2);
	for (let i = 0; i < witness.length; i++) await _iden3_binfileutils.writeBigInt(fd, witness[i], n8);
	await _iden3_binfileutils.endWriteSection(fd, 2);
}
async function writeBin(fd, witnessBin, prime) {
	await _iden3_binfileutils.startWriteSection(fd, 1);
	const n8 = (Math.floor((ffjavascript.Scalar.bitLength(prime) - 1) / 64) + 1) * 8;
	await fd.writeULE32(n8);
	await _iden3_binfileutils.writeBigInt(fd, prime, n8);
	if (witnessBin.byteLength % n8 != 0) throw new Error("Invalid witness length");
	await fd.writeULE32(witnessBin.byteLength / n8);
	await _iden3_binfileutils.endWriteSection(fd);
	await _iden3_binfileutils.startWriteSection(fd, 2);
	await fd.write(witnessBin);
	await _iden3_binfileutils.endWriteSection(fd);
}
async function readHeader(fd, sections) {
	await _iden3_binfileutils.startReadUniqueSection(fd, sections, 1);
	const n8 = await fd.readULE32();
	const q = await _iden3_binfileutils.readBigInt(fd, n8);
	const nWitness = await fd.readULE32();
	await _iden3_binfileutils.endReadSection(fd);
	return {
		n8,
		q,
		nWitness
	};
}
async function read(fileName) {
	const { fd, sections } = await _iden3_binfileutils.readBinFile(fileName, "wtns", 2);
	const { n8, nWitness } = await readHeader(fd, sections);
	await _iden3_binfileutils.startReadUniqueSection(fd, sections, 2);
	const res = [];
	for (let i = 0; i < nWitness; i++) {
		const v = await _iden3_binfileutils.readBigInt(fd, n8);
		res.push(v);
	}
	await _iden3_binfileutils.endReadSection(fd);
	await fd.close();
	return res;
}
//#endregion
//#region src/groth16_prove.js
var { stringifyBigInts: stringifyBigInts$3 } = ffjavascript.utils;
async function groth16Prove$1(zkeyFileName, witnessFileName, logger, options) {
	let memTimer = null;
	if (logger && options && options.memoryLogging && typeof process !== "undefined" && typeof process.memoryUsage === "function") memTimer = monitorMemoryUsage(logger, Number(options.memoryLogging) > 1 ? Number(options.memoryLogging) : 1e3);
	let fdWtns, fdZKey;
	try {
		const openWtns = await _iden3_binfileutils.readBinFile(witnessFileName, "wtns", 2, 1 << 25, 1 << 23);
		fdWtns = openWtns.fd;
		const zkeySource = withPersistentCache(zkeyFileName, options && options.persistentCache);
		const openZKey = await _iden3_binfileutils.readBinFile(zkeySource, "zkey", 2, 1 << 25, 1 << 23);
		fdZKey = openZKey.fd;
		return await _groth16Prove(fdZKey, openZKey.sections, fdWtns, openWtns.sections, logger, options);
	} finally {
		if (memTimer) {
			clearInterval(memTimer);
			memUsage(logger);
		}
		if (fdZKey) await Promise.resolve(fdZKey.close()).catch(() => {});
		if (fdWtns) await Promise.resolve(fdWtns.close()).catch(() => {});
	}
}
async function _groth16Prove(fdZKey, sectionsZKey, fdWtns, sectionsWtns, logger, options) {
	const wtns = await readHeader(fdWtns, sectionsWtns);
	const zkey = await readHeader$1(fdZKey, sectionsZKey, void 0, options);
	if (zkey.protocol !== "groth16") throw new Error("zkey file is not groth16");
	if (!ffjavascript.Scalar.eq(zkey.r, wtns.q)) throw new Error("Curve of the witness does not match the curve of the proving key");
	if (wtns.nWitness !== zkey.nVars) throw new Error(`Invalid witness length. Circuit: ${zkey.nVars}, witness: ${wtns.nWitness}`);
	const curve = zkey.curve;
	const Fr = curve.Fr;
	const G1 = curve.G1;
	const G2 = curve.G2;
	options = options || {};
	const msmBatching = options.msmBatching || "auto";
	if (msmBatching !== "auto" && msmBatching !== "enabled" && msmBatching !== "disabled") throw new Error(`groth16Prove: invalid msmBatching "${msmBatching}" (expected "auto", "enabled" or "disabled")`);
	const msmGlv = options.msmGlv || "auto";
	const msmGls = options.msmGls || "auto";
	for (const [name, v] of [["msmGlv", msmGlv], ["msmGls", msmGls]]) if (v !== "auto" && v !== "disabled") throw new Error(`groth16Prove: invalid ${name} "${v}" (expected "auto" or "disabled")`);
	const msmOpts = {
		batch: msmBatching,
		glv: msmGlv,
		gls: msmGls
	};
	if (options.buildABC !== void 0 && options.buildABC !== "js" && options.buildABC !== "stream") throw new Error(`groth16Prove: invalid buildABC "${options.buildABC}" (expected "js" or "stream")`);
	const power = log2(zkey.domainSize);
	if (logger) logger.debug("Reading Wtns");
	const buffWitness = await _iden3_binfileutils.readSection(fdWtns, sectionsWtns, 2);
	const mkSectionReader = (idSection) => {
		const start = sectionsZKey[idSection][0].p;
		const size = sectionsZKey[idSection][0].size;
		return async (off, len) => {
			/* c8 ignore start */
			if (off + len > size) throw new Error(`groth16Prove: read out of range of section ${idSection}`);
			/* c8 ignore stop */
			const buff = new Uint8Array(len);
			await fdZKey.readToBuffer(buff, 0, len, start + off);
			return buff;
		};
	};
	let resH;
	let resHPromise;
	let buffPodd_T;
	let abcPromise = (async function() {
		let buffA_T, buffB_T, buffC_T;
		await (async function() {
			if (logger) logger.debug("Reading Coeffs");
			const buffCoeffs = await _iden3_binfileutils.readSection(fdZKey, sectionsZKey, 4);
			if (logger) logger.debug("Building ABC");
			if (options.buildABC === "js") [buffA_T, buffB_T, buffC_T] = await buildABC1(curve, zkey, buffWitness, buffCoeffs, logger);
			else {
				const p = pickStreamParams(curve, zkey, buffCoeffs, options);
				if (logger) logger.debug(`buildABC: stream nChunks=${p.nChunks} maxInFlight=${p.maxInFlight}`);
				[buffA_T, buffB_T, buffC_T] = await buildABCStream(curve, zkey, buffWitness, buffCoeffs, logger, p.nChunks, p.maxInFlight);
			}
		})();
		/* c8 ignore start */
		const inc = power === Fr.s ? curve.Fr.shift : curve.Fr.w[power + 1];
		/* c8 ignore stop */
		let buffAodd_T, buffBodd_T, buffCodd_T;
		await Promise.all([
			(async function() {
				let buffA = await Fr.ifft(buffA_T, "", "", logger, "IFFT_A", true);
				buffA_T = null;
				const buffAodd = await Fr.batchApplyKey(buffA, Fr.e(1), inc);
				buffAodd_T = await Fr.fft(buffAodd, "", "", logger, "FFT_A", true);
			})(),
			(async function() {
				let buffB = await Fr.ifft(buffB_T, "", "", logger, "IFFT_B", true);
				buffB_T = null;
				const buffBodd = await Fr.batchApplyKey(buffB, Fr.e(1), inc);
				buffBodd_T = await Fr.fft(buffBodd, "", "", logger, "FFT_B", true);
			})(),
			(async function() {
				let buffC = await Fr.ifft(buffC_T, "", "", logger, "IFFT_C", true);
				buffC_T = null;
				const buffCodd = await Fr.batchApplyKey(buffC, Fr.e(1), inc);
				buffCodd_T = await Fr.fft(buffCodd, "", "", logger, "FFT_C", true);
			})()
		]);
		if (logger) logger.debug("Join ABC");
		buffPodd_T = await joinABC(curve, zkey, buffAodd_T, buffBodd_T, buffCodd_T, logger);
		if (logger) logger.debug("Join ABC finished");
		buffAodd_T = null;
		buffBodd_T = null;
		buffCodd_T = null;
	})();
	let proof = {};
	async function calcPiA() {
		if (logger) logger.debug("Reading A Points");
		proof.pi_a = await curve.G1.multiExpAffineChunked(mkSectionReader(5), sectionsZKey[5][0].size, buffWitness, logger, "multiexp A", msmOpts);
	}
	let piaPromise = calcPiA();
	let pib1;
	async function calcPiB1() {
		if (logger) logger.debug("Reading B1 Points");
		pib1 = await curve.G1.multiExpAffineChunked(mkSectionReader(6), sectionsZKey[6][0].size, buffWitness, logger, "multiexp B1", msmOpts);
	}
	let pib1Promise = calcPiB1();
	async function calcPiB() {
		if (logger) logger.debug("Reading B2 Points");
		proof.pi_b = await curve.G2.multiExpAffineChunked(mkSectionReader(7), sectionsZKey[7][0].size, buffWitness, logger, "multiexp B2", msmOpts);
	}
	let pibPromise = calcPiB();
	let picPromise = (async function() {
		if (logger) logger.debug("Reading C Points");
		proof.pi_c = await curve.G1.multiExpAffineChunked(mkSectionReader(8), sectionsZKey[8][0].size, buffWitness.slice((zkey.nPublic + 1) * curve.Fr.n8), logger, "multiexp C", msmOpts);
	})();
	resHPromise = (async function() {
		if (logger) logger.debug("Reading H Points");
		await abcPromise;
		resH = await curve.G1.multiExpAffineChunked(mkSectionReader(9), sectionsZKey[9][0].size, buffPodd_T, logger, "multiexp H", msmOpts);
	})();
	for (const p of [
		abcPromise,
		piaPromise,
		pib1Promise,
		pibPromise,
		picPromise,
		resHPromise
	]) p.catch(() => {});
	const r = curve.Fr.random();
	const s = curve.Fr.random();
	await piaPromise;
	proof.pi_a = G1.add(proof.pi_a, zkey.vk_alpha_1);
	proof.pi_a = G1.add(proof.pi_a, G1.timesFr(zkey.vk_delta_1, r));
	await pibPromise;
	proof.pi_b = G2.add(proof.pi_b, zkey.vk_beta_2);
	proof.pi_b = G2.add(proof.pi_b, G2.timesFr(zkey.vk_delta_2, s));
	await pib1Promise;
	pib1 = G1.add(pib1, zkey.vk_beta_1);
	pib1 = G1.add(pib1, G1.timesFr(zkey.vk_delta_1, s));
	await Promise.all([picPromise, resHPromise]);
	proof.pi_c = G1.add(proof.pi_c, resH);
	proof.pi_c = G1.add(proof.pi_c, G1.timesFr(proof.pi_a, s));
	proof.pi_c = G1.add(proof.pi_c, G1.timesFr(pib1, r));
	proof.pi_c = G1.add(proof.pi_c, G1.timesFr(zkey.vk_delta_1, Fr.neg(Fr.mul(r, s))));
	let publicSignals = [];
	for (let i = 1; i <= zkey.nPublic; i++) {
		const b = buffWitness.slice(i * Fr.n8, i * Fr.n8 + Fr.n8);
		publicSignals.push(ffjavascript.Scalar.fromRprLE(b));
	}
	proof.pi_a = G1.toObject(G1.toAffine(proof.pi_a));
	proof.pi_b = G2.toObject(G2.toAffine(proof.pi_b));
	proof.pi_c = G1.toObject(G1.toAffine(proof.pi_c));
	proof.protocol = "groth16";
	proof.curve = curve.name;
	proof = stringifyBigInts$3(proof);
	publicSignals = stringifyBigInts$3(publicSignals);
	return {
		proof,
		publicSignals
	};
}
async function buildABC1(curve, zkey, witness, coeffs, logger) {
	const n8 = curve.Fr.n8;
	const sCoef = 12 + zkey.n8r;
	const nCoef = (coeffs.byteLength - 4) / sCoef;
	const outBuffA = new ffjavascript.BigBuffer(zkey.domainSize * n8);
	const outBuffB = new ffjavascript.BigBuffer(zkey.domainSize * n8);
	const outBuffC = new ffjavascript.BigBuffer(zkey.domainSize * n8);
	const outBuf = [outBuffA, outBuffB];
	for (let i = 0; i < nCoef; i++) {
		/* c8 ignore start */
		if (logger && i % 1e6 == 0) logger.debug(`QAP AB: ${i}/${nCoef}`);
		/* c8 ignore stop */
		let buffCoefV, coef;
		if (coeffs.buffer) {
			const coeffOffset = 4 + i * sCoef;
			buffCoefV = new DataView(coeffs.buffer, coeffs.byteOffset + coeffOffset, sCoef);
			coef = new Uint8Array(coeffs.buffer, coeffs.byteOffset + coeffOffset + 12, n8);
		} else {
			/* c8 ignore start */
			const buffCoef = coeffs.slice(4 + i * sCoef, 4 + i * sCoef + sCoef);
			buffCoefV = new DataView(buffCoef.buffer);
			coef = buffCoef.slice(12, 12 + n8);
		}
		const m = buffCoefV.getUint32(0, true);
		const c = buffCoefV.getUint32(4, true);
		const s = buffCoefV.getUint32(8, true);
		outBuf[m].set(curve.Fr.add(outBuf[m].slice(c * n8, c * n8 + n8), curve.Fr.mul(coef, witness.slice(s * n8, s * n8 + n8))), c * n8);
	}
	for (let i = 0; i < zkey.domainSize; i++) {
		/* c8 ignore start */
		if (logger && i % 1e6 == 0) logger.debug(`QAP C: ${i}/${zkey.domainSize}`);
		/* c8 ignore stop */
		outBuffC.set(curve.Fr.mul(outBuffA.slice(i * n8, i * n8 + n8), outBuffB.slice(i * n8, i * n8 + n8)), i * n8);
	}
	return [
		outBuffA,
		outBuffB,
		outBuffC
	];
}
function pickStreamParams(curve, zkey, coeffs, options) {
	/* c8 ignore next 2 */
	options = options || {};
	const n8 = curve.Fr.n8;
	/* c8 ignore next */
	const concurrency = curve.tm.concurrency || 1;
	const nCoefs = (coeffs.byteLength - 4) / (12 + n8);
	const variableBytes = coeffs.byteLength + nCoefs * n8 + 3 * zkey.domainSize * n8;
	const floorBudget = options.buildABCFloorBudget || 268435456;
	let nChunks = Math.max(1, Math.ceil(variableBytes / 33554432));
	const perWorker = Math.ceil(variableBytes / nChunks);
	let maxInFlight = Math.max(1, Math.min(concurrency, Math.floor(floorBudget / perWorker)));
	nChunks = Math.min(256, Math.max(nChunks, maxInFlight * 3));
	maxInFlight = Math.min(maxInFlight, nChunks);
	if (options.buildABCnChunks) nChunks = options.buildABCnChunks;
	if (options.buildABCmaxInFlight) maxInFlight = options.buildABCmaxInFlight;
	return {
		nChunks,
		maxInFlight
	};
}
async function buildABCStream(curve, zkey, witness, coeffs, logger, nChunks, maxInFlight) {
	const n8 = curve.Fr.n8;
	const sCoef = 12 + zkey.n8r;
	const domainSize = zkey.domainSize;
	let getUint32;
	/* c8 ignore start */
	if (coeffs instanceof ffjavascript.BigBuffer) {
		const coeffsDV = [];
		const PAGE_LEN = coeffs.buffers[0].length;
		for (let i = 0; i < coeffs.buffers.length; i++) coeffsDV.push(new DataView(coeffs.buffers[i].buffer));
		getUint32 = (pos) => coeffsDV[Math.floor(pos / PAGE_LEN)].getUint32(pos % PAGE_LEN, true);
	} else {
		const coeffsDV = new DataView(coeffs.buffer, coeffs.byteOffset, coeffs.byteLength);
		getUint32 = (pos) => coeffsDV.getUint32(pos, true);
	}
	/* c8 ignore stop */
	function getCutPoint(v) {
		let m = 0, n = getUint32(0);
		while (m < n) {
			const k = Math.floor((n + m) / 2);
			if (getUint32(4 + k * sCoef + 4) < v) m = k + 1;
			else n = k;
		}
		return 4 + m * sCoef;
	}
	const elementsPerChunk = Math.floor((domainSize - 1) / nChunks) + 1;
	const cutPoints = [];
	for (let i = 0; i < nChunks; i++) cutPoints.push(getCutPoint(i * elementsPerChunk));
	cutPoints.push(coeffs.byteLength);
	const outBytes = domainSize * n8;
	/* c8 ignore start */
	const mkOut = () => outBytes < 1 << 30 ? new Uint8Array(outBytes) : new ffjavascript.BigBuffer(outBytes);
	/* c8 ignore stop */
	const outBuffA = mkOut();
	const outBuffB = mkOut();
	const outBuffC = mkOut();
	const inFlight = /* @__PURE__ */ new Set();
	const tasks = [];
	for (let i = 0; i < nChunks; i++) {
		const outOffset = i * elementsPerChunk;
		const n = Math.min(elementsPerChunk, domainSize - outOffset);
		if (n <= 0) break;
		const cpA = cutPoints[i], cpB = cutPoints[i + 1];
		while (inFlight.size >= maxInFlight) await Promise.race(inFlight);
		if (logger) logger.debug(`buildABCStream: ${i}/${nChunks}`);
		const slot = (async () => {
			const coeffChunk = coeffs.slice(cpA, cpB);
			const nCoefChunk = (cpB - cpA) / sCoef;
			const gathered = new Uint8Array(nCoefChunk * n8);
			const chunkU32 = new Uint32Array(coeffChunk.buffer, coeffChunk.byteOffset, coeffChunk.byteLength >> 2);
			const sStep = sCoef >> 2;
			if (!!witness.buffer && (witness.byteOffset & 3) === 0 && n8 === 32) {
				const wU32 = new Uint32Array(witness.buffer, witness.byteOffset, witness.byteLength >> 2);
				const gU32 = new Uint32Array(gathered.buffer);
				for (let j = 0; j < nCoefChunk; j++) {
					const so = chunkU32[j * sStep + 2] << 3, go = j << 3;
					gU32[go] = wU32[so];
					gU32[go + 1] = wU32[so + 1];
					gU32[go + 2] = wU32[so + 2];
					gU32[go + 3] = wU32[so + 3];
					gU32[go + 4] = wU32[so + 4];
					gU32[go + 5] = wU32[so + 5];
					gU32[go + 6] = wU32[so + 6];
					gU32[go + 7] = wU32[so + 7];
					chunkU32[j * sStep + 2] = j;
				}
			} else {
				/* c8 ignore start */
				const witnessIsView = !!witness.buffer;
				for (let j = 0; j < nCoefChunk; j++) {
					const s = chunkU32[j * sStep + 2];
					if (witnessIsView) gathered.set(witness.subarray(s * n8, (s + 1) * n8), j * n8);
					else gathered.set(witness.slice(s * n8, (s + 1) * n8), j * n8);
					chunkU32[j * sStep + 2] = j;
				}
			}
			const task = [
				{
					cmd: "ALLOCSET",
					var: 0,
					buff: coeffChunk
				},
				{
					cmd: "ALLOCSET",
					var: 1,
					buff: gathered
				},
				{
					cmd: "ALLOC",
					var: 2,
					len: n * n8
				},
				{
					cmd: "ALLOC",
					var: 3,
					len: n * n8
				},
				{
					cmd: "ALLOC",
					var: 4,
					len: n * n8
				},
				{
					cmd: "CALL",
					fnName: "qap_buildABC",
					params: [
						{ var: 0 },
						{ val: nCoefChunk },
						{ var: 1 },
						{ var: 2 },
						{ var: 3 },
						{ var: 4 },
						{ val: outOffset },
						{ val: n },
						{ val: 0 },
						{ val: nCoefChunk }
					]
				},
				{
					cmd: "GET",
					out: 0,
					var: 2,
					len: n * n8
				},
				{
					cmd: "GET",
					out: 1,
					var: 3,
					len: n * n8
				},
				{
					cmd: "GET",
					out: 2,
					var: 4,
					len: n * n8
				}
			];
			const r = await curve.tm.queueAction(task, [coeffChunk.buffer, gathered.buffer]);
			outBuffA.set(r[0], outOffset * n8);
			outBuffB.set(r[1], outOffset * n8);
			outBuffC.set(r[2], outOffset * n8);
		})().finally(() => inFlight.delete(slot));
		inFlight.add(slot);
		tasks.push(slot);
	}
	await Promise.all(tasks);
	return [
		outBuffA,
		outBuffB,
		outBuffC
	];
}
async function joinABC(curve, zkey, a, b, c, logger) {
	const MAX_CHUNK_SIZE = 65536;
	const n8 = curve.Fr.n8;
	const nElements = Math.floor(a.byteLength / curve.Fr.n8);
	const promises = [];
	for (let i = 0; i < nElements; i += MAX_CHUNK_SIZE) {
		if (logger) logger.debug(`JoinABC: ${i}/${nElements}`);
		const n = Math.min(nElements - i, MAX_CHUNK_SIZE);
		const task = [];
		const aChunk = a.slice(i * n8, (i + n) * n8);
		const bChunk = b.slice(i * n8, (i + n) * n8);
		const cChunk = c.slice(i * n8, (i + n) * n8);
		task.push({
			cmd: "ALLOCSET",
			var: 0,
			buff: aChunk
		});
		task.push({
			cmd: "ALLOCSET",
			var: 1,
			buff: bChunk
		});
		task.push({
			cmd: "ALLOCSET",
			var: 2,
			buff: cChunk
		});
		task.push({
			cmd: "ALLOC",
			var: 3,
			len: n * n8
		});
		task.push({
			cmd: "CALL",
			fnName: "qap_joinABC",
			params: [
				{ var: 0 },
				{ var: 1 },
				{ var: 2 },
				{ val: n },
				{ var: 3 }
			]
		});
		task.push({
			cmd: "CALL",
			fnName: "frm_batchFromMontgomery",
			params: [
				{ var: 3 },
				{ val: n },
				{ var: 3 }
			]
		});
		task.push({
			cmd: "GET",
			out: 0,
			var: 3,
			len: n * n8
		});
		promises.push(curve.tm.queueAction(task, [
			aChunk.buffer,
			bChunk.buffer,
			cChunk.buffer
		]));
	}
	const result = await Promise.all(promises);
	let outBuff;
	/* c8 ignore start */
	if (a instanceof ffjavascript.BigBuffer) outBuff = new ffjavascript.BigBuffer(a.byteLength);
	else outBuff = new Uint8Array(a.byteLength);
	/* c8 ignore stop */
	let p = 0;
	for (let i = 0; i < result.length; i++) {
		outBuff.set(result[i][0], p);
		p += result[i][0].byteLength;
	}
	return outBuff;
}
function memUsage(logger) {
	/* c8 ignore start */
	if (!logger) return;
	/* c8 ignore stop */
	const used = process.memoryUsage();
	logger.info("         ", "\x1B[0m Heap:\x1B[32m", `${Math.round(used.heapUsed / 1024 / 1024 * 100) / 100} MB`.padEnd(12), "\x1B[0m / \x1B[32m", `${Math.round(used.heapTotal / 1024 / 1024 * 100) / 100} MB`.padEnd(12), "\x1B[0m RSS:\x1B[32m", `${Math.round(used.rss / 1024 / 1024 * 100) / 100} MB`.padEnd(12), "\x1B[0m External:\x1B[32m", `${Math.round(used.external / 1024 / 1024 * 100) / 100} MB`.padEnd(12), "\x1B[0m ArrBuffers:\x1B[32m", `${Math.round(used.arrayBuffers / 1024 / 1024 * 100) / 100} MB`.padEnd(12), "\x1B[0m");
}
function monitorMemoryUsage(logger, interval = 5e3) {
	return setInterval(() => {
		memUsage(logger);
	}, interval);
}
//#endregion
//#region src/wtns_calculate.js
var { unstringifyBigInts: unstringifyBigInts$10 } = ffjavascript.utils;
async function wtnsCalculate$1(_input, wasmFileName, wtnsFileName, options) {
	const input = unstringifyBigInts$10(_input);
	const wasmSource = withPersistentCache(wasmFileName, options && options.persistentCache);
	const fdWasm = await fastfile.readExisting(wasmSource);
	const wasm = await fdWasm.read(fdWasm.totalSize);
	await fdWasm.close();
	const wc = await (0, circom_runtime.WitnessCalculatorBuilder)(wasm, options);
	if (wc.circom_version() === 1) {
		const w = await wc.calculateBinWitness(input);
		const fdWtns = await _iden3_binfileutils.createBinFile(wtnsFileName, "wtns", 2, 2);
		try {
			await writeBin(fdWtns, w, wc.prime);
		} finally {
			await fdWtns.close();
		}
	} else {
		const w = await wc.calculateWTNSBin(input);
		const fdWtns = await fastfile.createOverride(wtnsFileName);
		try {
			await fdWtns.write(w);
		} finally {
			await fdWtns.close();
		}
	}
}
//#endregion
//#region src/groth16_fullprove.js
var { unstringifyBigInts: unstringifyBigInts$9 } = ffjavascript.utils;
async function groth16FullProve$1(_input, wasmFile, zkeyFileName, logger, wtnsCalcOptions, proverOptions) {
	const input = unstringifyBigInts$9(_input);
	const wtns = { type: "mem" };
	await wtnsCalculate$1(input, wasmFile, wtns, wtnsCalcOptions);
	return await groth16Prove$1(zkeyFileName, wtns, logger, proverOptions);
}
//#endregion
//#region src/groth16_verify.js
var { unstringifyBigInts: unstringifyBigInts$8 } = ffjavascript.utils;
async function groth16Verify$1(_vk_verifier, _publicSignals, _proof, logger) {
	const vk_verifier = unstringifyBigInts$8(_vk_verifier);
	const proof = unstringifyBigInts$8(_proof);
	const publicSignals = unstringifyBigInts$8(_publicSignals);
	const curve = await getCurveFromName(vk_verifier.curve);
	const IC0 = curve.G1.fromObject(vk_verifier.IC[0]);
	const IC = new Uint8Array(curve.G1.F.n8 * 2 * publicSignals.length);
	const w = new Uint8Array(curve.Fr.n8 * publicSignals.length);
	if (!publicInputsAreValid$2(curve, publicSignals)) {
		if (logger) logger.error("Public inputs are not valid.");
		return false;
	}
	for (let i = 0; i < publicSignals.length; i++) {
		const buffP = curve.G1.fromObject(vk_verifier.IC[i + 1]);
		IC.set(buffP, i * curve.G1.F.n8 * 2);
		ffjavascript.Scalar.toRprLE(w, curve.Fr.n8 * i, publicSignals[i], curve.Fr.n8);
	}
	let cpub = await curve.G1.multiExpAffine(IC, w);
	cpub = curve.G1.add(cpub, IC0);
	const pi_a = curve.G1.fromObject(proof.pi_a);
	const pi_b = curve.G2.fromObject(proof.pi_b);
	const pi_c = curve.G1.fromObject(proof.pi_c);
	if (!isWellConstructed$1(curve, {
		pi_a,
		pi_b,
		pi_c
	})) {
		if (logger) logger.error("Proof commitments are not valid.");
		return false;
	}
	const vk_gamma_2 = curve.G2.fromObject(vk_verifier.vk_gamma_2);
	const vk_delta_2 = curve.G2.fromObject(vk_verifier.vk_delta_2);
	const vk_alpha_1 = curve.G1.fromObject(vk_verifier.vk_alpha_1);
	const vk_beta_2 = curve.G2.fromObject(vk_verifier.vk_beta_2);
	if (!await curve.pairingEq(curve.G1.neg(pi_a), pi_b, cpub, vk_gamma_2, pi_c, vk_delta_2, vk_alpha_1, vk_beta_2)) {
		if (logger) logger.error("Invalid proof");
		return false;
	}
	if (logger) logger.info("OK!");
	return true;
}
function isWellConstructed$1(curve, proof) {
	const G1 = curve.G1;
	const G2 = curve.G2;
	return G1.isValid(proof.pi_a) && G2.isValid(proof.pi_b) && G1.isValid(proof.pi_c);
}
function checkValueBelongToField$2(curve, value) {
	return ffjavascript.Scalar.geq(value, 0) && ffjavascript.Scalar.lt(value, curve.r);
}
function publicInputsAreValid$2(curve, publicInputs) {
	for (let i = 0; i < publicInputs.length; i++) if (!checkValueBelongToField$2(curve, publicInputs[i])) return false;
	return true;
}
//#endregion
//#region src/groth16_exportsoliditycalldata.js
var { unstringifyBigInts: unstringifyBigInts$7 } = ffjavascript.utils;
function p256$2(n) {
	let nstr = n.toString(16);
	while (nstr.length < 64) nstr = "0" + nstr;
	nstr = `"0x${nstr}"`;
	return nstr;
}
async function groth16ExportSolidityCallData(_proof, _pub) {
	const proof = unstringifyBigInts$7(_proof);
	const pub = unstringifyBigInts$7(_pub);
	let inputs = "";
	for (let i = 0; i < pub.length; i++) {
		if (inputs != "") inputs = inputs + ",";
		inputs = inputs + p256$2(pub[i]);
	}
	let S;
	S = `[${p256$2(proof.pi_a[0])}, ${p256$2(proof.pi_a[1])}],[[${p256$2(proof.pi_b[0][1])}, ${p256$2(proof.pi_b[0][0])}],[${p256$2(proof.pi_b[1][1])}, ${p256$2(proof.pi_b[1][0])}]],[${p256$2(proof.pi_c[0])}, ${p256$2(proof.pi_c[1])}],[${inputs}]`;
	return S;
}
//#endregion
//#region src/plonk_setup.js
async function plonkSetup$1(r1csName, ptauName, zkeyName, logger) {
	const fds = {};
	try {
		return await _plonkSetup(r1csName, ptauName, zkeyName, logger, fds);
	} finally {
		for (const openFd of [
			fds.fdPTau,
			fds.fdR1cs,
			fds.fdZKey
		]) try {
			if (openFd) await openFd.close();
		} catch (e) {}
	}
}
async function _plonkSetup(r1csName, ptauName, zkeyName, logger, fds) {
	if (globalThis.gc) globalThis.gc();
	const { fd: fdPTau, sections: sectionsPTau } = await (0, _iden3_binfileutils.readBinFile)(ptauName, "ptau", 1, 1 << 22, 1 << 24);
	fds.fdPTau = fdPTau;
	const { curve, power } = await readPTauHeader(fdPTau, sectionsPTau);
	const { fd: fdR1cs, sections: sectionsR1cs } = await (0, _iden3_binfileutils.readBinFile)(r1csName, "r1cs", 1, 1 << 22, 1 << 24);
	fds.fdR1cs = fdR1cs;
	const r1cs = await (0, r1csfile.readR1csFd)(fdR1cs, sectionsR1cs, {
		loadConstraints: true,
		loadCustomGates: true
	});
	const sG1 = curve.G1.F.n8 * 2;
	const G1 = curve.G1;
	const sG2 = curve.G2.F.n8 * 2;
	const Fr = curve.Fr;
	const n8r = curve.Fr.n8;
	if (logger) logger.info("Reading r1cs");
	let plonkConstraints = new BigArray();
	let plonkAdditions = new BigArray();
	let nPlonkConstraints, nPlonkAdditions;
	let plonkNVars = r1cs.nVars;
	const nPublic = r1cs.nOutputs + r1cs.nPubInputs;
	await processConstraints(curve.Fr, r1cs, logger);
	r1cs.constraints = null;
	nPlonkConstraints = plonkConstraints.length;
	nPlonkAdditions = plonkAdditions.length;
	if (globalThis.gc) globalThis.gc();
	const fdZKey = await (0, _iden3_binfileutils.createBinFile)(zkeyName, "zkey", 1, 14, 1 << 22, 1 << 24);
	fds.fdZKey = fdZKey;
	if (r1cs.prime != curve.r) {
		if (logger) logger.error("r1cs curve does not match powers of tau ceremony curve");
		return -1;
	}
	let cirPower = log2(plonkConstraints.length - 1) + 1;
	/* c8 ignore start */
	if (cirPower < 3) cirPower = 3;
	/* c8 ignore stop */
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
	let LPoints = new ffjavascript.BigBuffer(domainSize * sG1);
	const o = sectionsPTau[12][0].p + (2 ** cirPower - 1) * sG1;
	await fdPTau.readToBuffer(LPoints, 0, domainSize * sG1, o);
	const [k1, k2] = getK1K2();
	const vk = {};
	await writeAdditions(3, "Additions");
	plonkAdditions = null;
	if (globalThis.gc) globalThis.gc();
	await writeWitnessMap(4, 0, "Amap");
	if (globalThis.gc) globalThis.gc();
	await writeWitnessMap(5, 1, "Bmap");
	if (globalThis.gc) globalThis.gc();
	await writeWitnessMap(6, 2, "Cmap");
	if (globalThis.gc) globalThis.gc();
	await writeQMap(7, 3, "Qm");
	if (globalThis.gc) globalThis.gc();
	await writeQMap(8, 4, "Ql");
	if (globalThis.gc) globalThis.gc();
	await writeQMap(9, 5, "Qr");
	if (globalThis.gc) globalThis.gc();
	await writeQMap(10, 6, "Qo");
	if (globalThis.gc) globalThis.gc();
	await writeQMap(11, 7, "Qc");
	if (globalThis.gc) globalThis.gc();
	await writeSigma(12, "sigma");
	plonkConstraints = null;
	LPoints = null;
	if (globalThis.gc) globalThis.gc();
	await writeLs(13, "lagrange polynomials");
	if (globalThis.gc) globalThis.gc();
	await (0, _iden3_binfileutils.startWriteSection)(fdZKey, 14);
	{
		const buffOut = new ffjavascript.BigBuffer((domainSize + 6) * sG1);
		await fdPTau.readToBuffer(buffOut, 0, (domainSize + 6) * sG1, sectionsPTau[2][0].p);
		await fdZKey.write(buffOut);
	}
	await (0, _iden3_binfileutils.endWriteSection)(fdZKey);
	if (globalThis.gc) globalThis.gc();
	await writeHeaders();
	await fdZKey.close();
	await fdR1cs.close();
	await fdPTau.close();
	if (logger) logger.info("Setup Finished");
	return;
	async function processConstraints(Fr, r1cs, logger) {
		function normalize(linearComb) {
			const ss = Object.keys(linearComb);
			for (let i = 0; i < ss.length; i++)
 /* c8 ignore next */
			if (linearComb[ss[i]] == 0n) delete linearComb[ss[i]];
		}
		function join(linearComb1, k, linearComb2) {
			const res = {};
			for (let s in linearComb1) if (typeof res[s] == "undefined") res[s] = Fr.mul(k, linearComb1[s]);
			else res[s] = Fr.add(res[s], Fr.mul(k, linearComb1[s]));
			for (let s in linearComb2) {
				const val = Fr.neg(linearComb2[s]);
				if (typeof res[s] == "undefined") res[s] = val;
				else res[s] = Fr.add(res[s], val);
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
			for (let s in linearComb) if (s == 0) res.k = Fr.add(res.k, linearComb[s]);
			else if (linearComb[s] != 0n) cs.push([Number(s), linearComb[s]]);
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
				plonkConstraints.push([
					sl,
					sr,
					so,
					qm,
					ql,
					qr,
					qo,
					qc
				]);
				plonkAdditions.push([
					sl,
					sr,
					c1[1],
					c2[1]
				]);
				cs.push([so, Fr.one]);
			}
			for (let i = 0; i < cs.length; i++) {
				res.s[i] = cs[i][0];
				res.coefs[i] = cs[i][1];
			}
			/* c8 ignore start */
			while (res.coefs.length < maxC) {
				res.s.push(0);
				res.coefs.push(Fr.zero);
			}
			/* c8 ignore stop */
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
			plonkConstraints.push([
				sl,
				sr,
				so,
				qm,
				ql,
				qr,
				qo,
				qc
			]);
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
			plonkConstraints.push([
				sl,
				sr,
				so,
				qm,
				ql,
				qr,
				qo,
				qc
			]);
		}
		function getLinearCombinationType(lc) {
			let k = Fr.zero;
			let n = 0;
			const ss = Object.keys(lc);
			for (let i = 0; i < ss.length; i++)
 /* c8 ignore start */
			if (lc[ss[i]] == 0n) delete lc[ss[i]];
			else if (ss[i] == 0) k = Fr.add(k, lc[ss[i]]);
			else n++;
			if (n > 0) return n.toString();
			/* c8 ignore next */
			if (k != Fr.zero) return "k";
			return "0";
		}
		function process(lcA, lcB, lcC) {
			const lctA = getLinearCombinationType(lcA);
			const lctB = getLinearCombinationType(lcB);
			if (lctA === "0" || lctB === "0") {
				normalize(lcC);
				addConstraintSum(lcC);
			} else if (lctA === "k") addConstraintSum(join(lcB, lcA[0], lcC));
			else if (lctB === "k") addConstraintSum(join(lcA, lcB[0], lcC));
			else addConstraintMul(lcA, lcB, lcC);
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
			plonkConstraints.push([
				sl,
				sr,
				so,
				qm,
				ql,
				qr,
				qo,
				qc
			]);
		}
		for (let c = 0; c < r1cs.constraints.length; c++) {
			if (logger && c % 1e4 === 0) logger.debug(`processing constraints: ${c}/${r1cs.nConstraints}`);
			process(...r1cs.constraints[c]);
		}
	}
	async function writeWitnessMap(sectionNum, posConstraint, name) {
		await (0, _iden3_binfileutils.startWriteSection)(fdZKey, sectionNum);
		for (let i = 0; i < plonkConstraints.length; i++) {
			await fdZKey.writeULE32(plonkConstraints[i][posConstraint]);
			if (logger && i % 1e6 == 0) logger.debug(`writing ${name}: ${i}/${plonkConstraints.length}`);
		}
		await (0, _iden3_binfileutils.endWriteSection)(fdZKey);
	}
	async function writeQMap(sectionNum, posConstraint, name) {
		let Q = new ffjavascript.BigBuffer(domainSize * n8r);
		for (let i = 0; i < plonkConstraints.length; i++) {
			Q.set(plonkConstraints[i][posConstraint], i * n8r);
			if (logger && i % 1e6 == 0) logger.debug(`writing ${name}: ${i}/${plonkConstraints.length}`);
		}
		await (0, _iden3_binfileutils.startWriteSection)(fdZKey, sectionNum);
		await writeP4(Q);
		await (0, _iden3_binfileutils.endWriteSection)(fdZKey);
		Q = await Fr.batchFromMontgomery(Q);
		vk[name] = await curve.G1.multiExpAffine(LPoints, Q, logger, "multiexp " + name);
	}
	async function writeP4(buff) {
		const q = await Fr.ifft(buff);
		const q4 = new ffjavascript.BigBuffer(domainSize * n8r * 4);
		q4.set(q, 0);
		const Q4 = await Fr.fft(q4);
		await fdZKey.write(q);
		await fdZKey.write(Q4);
	}
	async function writeAdditions(sectionNum, name) {
		await (0, _iden3_binfileutils.startWriteSection)(fdZKey, sectionNum);
		const buffOut = new Uint8Array(8 + 2 * n8r);
		const buffOutV = new DataView(buffOut.buffer);
		for (let i = 0; i < plonkAdditions.length; i++) {
			const addition = plonkAdditions[i];
			let o = 0;
			buffOutV.setUint32(o, addition[0], true);
			o += 4;
			buffOutV.setUint32(o, addition[1], true);
			o += 4;
			buffOut.set(addition[2], o);
			o += n8r;
			buffOut.set(addition[3], o);
			o += n8r;
			await fdZKey.write(buffOut);
			/* c8 ignore start */
			if (logger && i % 1e6 == 0) logger.debug(`writing ${name}: ${i}/${plonkAdditions.length}`);
		}
		await (0, _iden3_binfileutils.endWriteSection)(fdZKey);
	}
	async function writeSigma(sectionNum, name) {
		let sigma = new ffjavascript.BigBuffer(n8r * domainSize * 3);
		let lastAparence = new BigArray(plonkNVars);
		let firstPos = new BigArray(plonkNVars);
		let w = Fr.one;
		for (let i = 0; i < domainSize; i++) {
			if (i < plonkConstraints.length) {
				buildSigma(plonkConstraints[i][0], i);
				buildSigma(plonkConstraints[i][1], domainSize + i);
				buildSigma(plonkConstraints[i][2], domainSize * 2 + i);
			} else {
				buildSigma(0, i);
				buildSigma(0, domainSize + i);
				buildSigma(0, domainSize * 2 + i);
			}
			w = Fr.mul(w, Fr.w[cirPower]);
			if (logger && i % 1e6 == 0) logger.debug(`writing ${name} phase1: ${i}/${plonkConstraints.length}`);
		}
		for (let s = 0; s < plonkNVars; s++) {
			if (typeof firstPos[s] !== "undefined") sigma.set(lastAparence[s], firstPos[s] * n8r);
			else console.log("Variable not used");
			if (logger && s % 1e6 == 0) logger.debug(`writing ${name} phase2: ${s}/${plonkNVars}`);
		}
		lastAparence = null;
		firstPos = null;
		if (globalThis.gc) globalThis.gc();
		await (0, _iden3_binfileutils.startWriteSection)(fdZKey, sectionNum);
		let S1 = sigma.slice(0, domainSize * n8r);
		await writeP4(S1);
		if (globalThis.gc) globalThis.gc();
		let S2 = sigma.slice(domainSize * n8r, domainSize * n8r * 2);
		await writeP4(S2);
		if (globalThis.gc) globalThis.gc();
		let S3 = sigma.slice(domainSize * n8r * 2, domainSize * n8r * 3);
		await writeP4(S3);
		sigma = null;
		if (globalThis.gc) globalThis.gc();
		await (0, _iden3_binfileutils.endWriteSection)(fdZKey);
		S1 = await Fr.batchFromMontgomery(S1);
		S2 = await Fr.batchFromMontgomery(S2);
		S3 = await Fr.batchFromMontgomery(S3);
		vk.S1 = await curve.G1.multiExpAffine(LPoints, S1, logger, "multiexp S1");
		S1 = null;
		if (globalThis.gc) globalThis.gc();
		vk.S2 = await curve.G1.multiExpAffine(LPoints, S2, logger, "multiexp S2");
		S2 = null;
		if (globalThis.gc) globalThis.gc();
		vk.S3 = await curve.G1.multiExpAffine(LPoints, S3, logger, "multiexp S3");
		S3 = null;
		if (globalThis.gc) globalThis.gc();
		function buildSigma(s, p) {
			if (typeof lastAparence[s] === "undefined") firstPos[s] = p;
			else sigma.set(lastAparence[s], p * n8r);
			let v;
			if (p < domainSize) v = w;
			else if (p < 2 * domainSize) v = Fr.mul(w, k1);
			else v = Fr.mul(w, k2);
			lastAparence[s] = v;
		}
	}
	async function writeLs(sectionNum, name) {
		await (0, _iden3_binfileutils.startWriteSection)(fdZKey, sectionNum);
		const l = Math.max(nPublic, 1);
		for (let i = 0; i < l; i++) {
			let buff = new ffjavascript.BigBuffer(domainSize * n8r);
			buff.set(Fr.one, i * n8r);
			await writeP4(buff);
			if (logger) logger.debug(`writing ${name} ${i}/${l}`);
		}
		await (0, _iden3_binfileutils.endWriteSection)(fdZKey);
	}
	async function writeHeaders() {
		await (0, _iden3_binfileutils.startWriteSection)(fdZKey, 1);
		await fdZKey.writeULE32(2);
		await (0, _iden3_binfileutils.endWriteSection)(fdZKey);
		await (0, _iden3_binfileutils.startWriteSection)(fdZKey, 2);
		const primeQ = curve.q;
		const n8q = (Math.floor((ffjavascript.Scalar.bitLength(primeQ) - 1) / 64) + 1) * 8;
		const primeR = curve.r;
		const n8r = (Math.floor((ffjavascript.Scalar.bitLength(primeR) - 1) / 64) + 1) * 8;
		await fdZKey.writeULE32(n8q);
		await (0, _iden3_binfileutils.writeBigInt)(fdZKey, primeQ, n8q);
		await fdZKey.writeULE32(n8r);
		await (0, _iden3_binfileutils.writeBigInt)(fdZKey, primeR, n8r);
		await fdZKey.writeULE32(plonkNVars);
		await fdZKey.writeULE32(nPublic);
		await fdZKey.writeULE32(domainSize);
		await fdZKey.writeULE32(nPlonkAdditions);
		await fdZKey.writeULE32(nPlonkConstraints);
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
		await (0, _iden3_binfileutils.endWriteSection)(fdZKey);
	}
	function getK1K2() {
		let k1 = Fr.two;
		/* c8 ignore start */
		while (isIncluded(k1, [], cirPower)) Fr.add(k1, Fr.one);
		/* c8 ignore stop */
		let k2 = Fr.add(k1, Fr.one);
		/* c8 ignore start */
		while (isIncluded(k2, [k1], cirPower)) Fr.add(k2, Fr.one);
		/* c8 ignore stop */
		return [k1, k2];
		function isIncluded(k, kArr, pow) {
			const domainSize = 2 ** pow;
			let w = Fr.one;
			for (let i = 0; i < domainSize; i++) {
				/* c8 ignore start */
				if (Fr.eq(k, w)) return true;
				/* c8 ignore stop */
				for (let j = 0; j < kArr.length; j++)
 /* c8 ignore start */
				if (Fr.eq(k, Fr.mul(kArr[j], w))) return true;
				w = Fr.mul(w, Fr.w[pow]);
			}
			return false;
		}
	}
}
//#endregion
//#region src/proof.js
var Proof = class {
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
		if (key in this.polynomials) this.logger.warn(`proof: polynomial.${key} already exist in proof`);
		this.polynomials[key] = polynomial;
	}
	getPolynomial(key) {
		if (!(key in this.polynomials)) this.logger.warn(`proof: polynomial ${key} does not exist in proof`);
		return this.polynomials[key];
	}
	addEvaluation(key, evaluation) {
		if (key in this.evaluations) this.logger.warn(`proof: evaluations.${key} already exist in proof`);
		this.evaluations[key] = evaluation;
	}
	getEvaluation(key) {
		if (!(key in this.evaluations)) this.logger.warn(`proof: evaluation ${key} does not exist in proof`);
		return this.evaluations[key];
	}
	toObjectProof(splitFields = true) {
		let res = splitFields ? {
			polynomials: {},
			evaluations: {}
		} : {};
		Object.keys(this.polynomials).forEach((key) => {
			const value = this.curve.G1.toObject(this.polynomials[key]);
			if (splitFields) res.polynomials[key] = value;
			else res[key] = value;
		});
		Object.keys(this.evaluations).forEach((key) => {
			const value = this.curve.Fr.toObject(this.evaluations[key]);
			if (splitFields) res.evaluations[key] = value;
			else res[key] = value;
		});
		return res;
	}
	fromObjectProof(objectProof) {
		this.resetProof();
		Object.keys(objectProof.polynomials).forEach((key) => {
			this.polynomials[key] = this.curve.G1.fromObject(objectProof.polynomials[key]);
		});
		Object.keys(objectProof.evaluations).forEach((key) => {
			this.evaluations[key] = this.curve.Fr.fromObject(objectProof.evaluations[key]);
		});
	}
};
//#endregion
//#region src/Keccak256Transcript.js
var POLYNOMIAL = 0;
var SCALAR = 1;
var Keccak256Transcript = class {
	constructor(curve) {
		this.G1 = curve.G1;
		this.Fr = curve.Fr;
		this.reset();
	}
	reset() {
		this.data = [];
	}
	addPolCommitment(polynomialCommitment) {
		this.data.push({
			type: POLYNOMIAL,
			data: polynomialCommitment
		});
	}
	addScalar(scalar) {
		this.data.push({
			type: SCALAR,
			data: scalar
		});
	}
	getChallenge() {
		if (0 === this.data.length) throw new Error("Keccak256Transcript: No data to generate a transcript");
		let nPolynomials = 0;
		let nScalars = 0;
		this.data.forEach((element) => POLYNOMIAL === element.type ? nPolynomials++ : nScalars++);
		let buffer = new Uint8Array(nScalars * this.Fr.n8 + nPolynomials * this.G1.F.n8 * 2);
		let offset = 0;
		for (let i = 0; i < this.data.length; i++) if (POLYNOMIAL === this.data[i].type) {
			this.G1.toRprUncompressed(buffer, offset, this.data[i].data);
			offset += this.G1.F.n8 * 2;
		} else {
			this.Fr.toRprBE(buffer, offset, this.data[i].data);
			offset += this.Fr.n8;
		}
		const value = ffjavascript.Scalar.fromRprBE((0, _noble_hashes_sha3_js.keccak_256)(buffer));
		return this.Fr.e(value);
	}
};
//#endregion
//#region src/mul_z.js
var MulZ = class {
	static getZ1(Fr) {
		return [
			Fr.zero,
			Fr.add(Fr.e(-1), Fr.w[2]),
			Fr.e(-2),
			Fr.sub(Fr.e(-1), Fr.w[2])
		];
	}
	static getZ2(Fr) {
		return [
			Fr.zero,
			Fr.add(Fr.zero, Fr.mul(Fr.e(-2), Fr.w[2])),
			Fr.e(4),
			Fr.sub(Fr.zero, Fr.mul(Fr.e(-2), Fr.w[2]))
		];
	}
	static getZ3(Fr) {
		return [
			Fr.zero,
			Fr.add(Fr.e(2), Fr.mul(Fr.e(2), Fr.w[2])),
			Fr.e(-8),
			Fr.sub(Fr.e(2), Fr.mul(Fr.e(2), Fr.w[2]))
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
		if (p) rz = Fr.add(rz, Fr.mul(Z1[p], a1));
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
};
//#endregion
//#region src/polynomial/polynomial.js
var Polynomial = class Polynomial {
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
		let buff = array.length > 32768 ? new ffjavascript.BigBuffer(array.length * Fr.n8) : new Uint8Array(array.length * Fr.n8);
		for (let i = 0; i < array.length; i++) buff.set(array[i], i * Fr.n8);
		return new Polynomial(buff, curve, logger);
	}
	static fromPolynomial(polynomial, curve, logger) {
		let length = polynomial.length();
		let Fr = curve.Fr;
		let buff = length > 32768 ? new ffjavascript.BigBuffer(length * Fr.n8) : new Uint8Array(length * Fr.n8);
		buff.set(polynomial.coef.slice(), 0);
		return new Polynomial(buff, curve, logger);
	}
	isEqual(polynomial) {
		const degree = this.degree();
		if (degree !== polynomial.degree()) return false;
		for (let i = 0; i < degree + 1; i++) if (!this.Fr.eq(this.getCoef(i), polynomial.getCoef(i))) return false;
		return true;
	}
	blindCoefficients(blindingFactors) {
		blindingFactors = blindingFactors || [];
		const blindedCoefficients = this.length() + blindingFactors.length > 32768 ? new ffjavascript.BigBuffer((this.length() + blindingFactors.length) * this.Fr.n8) : new Uint8Array((this.length() + blindingFactors.length) * this.Fr.n8);
		blindedCoefficients.set(this.coef, 0);
		for (let i = 0; i < blindingFactors.length; i++) {
			blindedCoefficients.set(this.Fr.add(blindedCoefficients.slice((this.length() + i) * this.Fr.n8, (this.length() + i + 1) * this.Fr.n8), blindingFactors[i]), (this.length() + i) * this.Fr.n8);
			blindedCoefficients.set(this.Fr.sub(blindedCoefficients.slice(i * this.Fr.n8, (i + 1) * this.Fr.n8), blindingFactors[i]), i * this.Fr.n8);
		}
		this.coef = blindedCoefficients;
	}
	getCoef(index) {
		const i_n8 = index * this.Fr.n8;
		if (i_n8 + this.Fr.n8 > this.coef.byteLength) return this.Fr.zero;
		return this.coef.slice(i_n8, i_n8 + this.Fr.n8);
	}
	setCoef(index, value) {
		if (index > this.length() - 1) throw new Error("Coef index is not available");
		this.coef.set(value, index * this.Fr.n8);
	}
	static async to4T(buffer, domainSize, blindingFactors, Fr) {
		blindingFactors = blindingFactors || [];
		let a = await Fr.ifft(buffer);
		const a4 = domainSize * 4 > 32768 ? new ffjavascript.BigBuffer(domainSize * 4 * Fr.n8) : new Uint8Array(domainSize * 4 * Fr.n8);
		a4.set(a, 0);
		const A4 = await Fr.fft(a4);
		if (blindingFactors.length === 0) return [a, A4];
		const a1 = domainSize + blindingFactors.length > 32768 ? new ffjavascript.BigBuffer((domainSize + blindingFactors.length) * Fr.n8) : new Uint8Array((domainSize + blindingFactors.length) * Fr.n8);
		a1.set(a, 0);
		for (let i = 0; i < blindingFactors.length; i++) {
			a1.set(Fr.add(a1.slice((domainSize + i) * Fr.n8, (domainSize + i + 1) * Fr.n8), blindingFactors[i]), (domainSize + i) * Fr.n8);
			a1.set(Fr.sub(a1.slice(i * Fr.n8, (i + 1) * Fr.n8), blindingFactors[i]), i * Fr.n8);
		}
		return [a1, A4];
	}
	length() {
		let length = this.coef.byteLength / this.Fr.n8;
		if (length !== Math.floor(this.coef.byteLength / this.Fr.n8)) throw new Error("Polynomial coefficients buffer has incorrect size");
		if (0 === length) {
			if (this.logger) this.logger.warn("Polynomial has length zero");
		}
		return length;
	}
	degree() {
		for (let i = this.length() - 1; i > 0; i--) {
			const i_n8 = i * this.Fr.n8;
			if (!this.Fr.eq(this.Fr.zero, this.coef.slice(i_n8, i_n8 + this.Fr.n8))) return i;
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
			let nCoefs = i === 2 ? coefsThread + residualCoefs : coefsThread;
			for (let j = nCoefs; j > 0; j--) {
				res[i] = Fr.add(this.getCoef(i * coefsThread + j - 1), Fr.mul(res[i], point));
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
		if (polynomial.length() > this.length()) other = true;
		const thisLength = this.length();
		const polyLength = polynomial.length();
		for (let i = 0; i < Math.max(thisLength, polyLength); i++) {
			const i_n8 = i * this.Fr.n8;
			const a = i < thisLength ? this.coef.slice(i_n8, i_n8 + this.Fr.n8) : this.Fr.zero;
			let b = i < polyLength ? polynomial.coef.slice(i_n8, i_n8 + this.Fr.n8) : this.Fr.zero;
			if (blindingValue !== void 0) b = this.Fr.mul(b, blindingValue);
			if (other) polynomial.coef.set(this.Fr.add(a, b), i_n8);
			else this.coef.set(this.Fr.add(a, b), i_n8);
		}
		if (other) {
			delete this.coef;
			this.coef = polynomial.coef;
		}
	}
	sub(polynomial, blindingValue) {
		let other = false;
		if (polynomial.length() > this.length()) other = true;
		const thisLength = this.length();
		const polyLength = polynomial.length();
		for (let i = 0; i < Math.max(thisLength, polyLength); i++) {
			const i_n8 = i * this.Fr.n8;
			const a = i < thisLength ? this.coef.slice(i_n8, i_n8 + this.Fr.n8) : this.Fr.zero;
			let b = i < polyLength ? polynomial.coef.slice(i_n8, i_n8 + this.Fr.n8) : this.Fr.zero;
			if (blindingValue !== void 0) b = this.Fr.mul(b, blindingValue);
			if (other) polynomial.coef.set(this.Fr.sub(a, b), i_n8);
			else this.coef.set(this.Fr.sub(a, b), i_n8);
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
		/* c8 ignore start */
		const currentValue = 0 === this.length() ? this.Fr.zero : this.coef.slice(0, this.Fr.n8);
		/* c8 ignore stop */
		this.coef.set(this.Fr.add(currentValue, value), 0);
	}
	subScalar(value) {
		/* c8 ignore start */
		const currentValue = 0 === this.length() ? this.Fr.zero : this.coef.slice(0, this.Fr.n8);
		/* c8 ignore stop */
		this.coef.set(this.Fr.sub(currentValue, value), 0);
	}
	byXSubValue(value) {
		const Fr = this.Fr;
		const length = !Fr.eq(Fr.zero, this.getCoef(this.length() - 1)) ? this.length() + 1 : this.length();
		const buff = length > 32768 ? new ffjavascript.BigBuffer(length * Fr.n8) : new Uint8Array(length * Fr.n8);
		let pol = new Polynomial(buff, this.curve, this.logger);
		pol.coef.set(this.coef.slice(0, (length - 1) * Fr.n8), 32);
		this.mulScalar(Fr.neg(value));
		pol.add(this);
		this.coef = pol.coef;
	}
	byXNSubValue(n, value) {
		const Fr = this.Fr;
		const length = !(this.length() - n - 1 >= this.degree()) ? this.length() + n : this.length();
		const buff = length > 32768 ? new ffjavascript.BigBuffer(length * Fr.n8) : new Uint8Array(length * Fr.n8);
		let pol = new Polynomial(buff, this.curve, this.logger);
		pol.coef.set(this.coef.slice(0, (this.degree() + 1) * 32), n * 32);
		this.mulScalar(value);
		pol.add(this);
		this.coef = pol.coef;
	}
	divBy(polynomial) {
		const Fr = this.Fr;
		const degreeA = this.degree();
		const degreeB = polynomial.degree();
		let polR = new Polynomial(this.coef, this.curve, this.logger);
		this.coef = this.length() > 32768 ? new ffjavascript.BigBuffer(this.length() * Fr.n8) : new Uint8Array(this.length() * Fr.n8);
		for (let i = degreeA - degreeB; i >= 0; i--) {
			this.setCoef(i, Fr.div(polR.getCoef(i + degreeB), polynomial.getCoef(degreeB)));
			for (let j = 0; j <= degreeB; j++) polR.setCoef(i + j, Fr.sub(polR.getCoef(i + j), Fr.mul(this.getCoef(i), polynomial.getCoef(j))));
		}
		return polR;
	}
	divByMonic(m, beta) {
		const Fr = this.Fr;
		let d = this.degree();
		let buffer = this.length() > 32768 ? new ffjavascript.BigBuffer(this.length() * Fr.n8) : new Uint8Array(this.length() * Fr.n8);
		let quotient = new Polynomial(buffer, this.curve, this.logger);
		let bArr = [];
		for (let i = 0; i < m; i++) {
			quotient.setCoef(d - i - m, this.getCoef(d - i));
			bArr[i] = this.getCoef(d - i);
		}
		let nThreads = m;
		let j = 0;
		for (let k = 0; k < nThreads; k++) for (let i = d - 2 * m - k; i >= 0; i = i - nThreads) {
			/* c8 ignore start */
			if (i < 0) break;
			/* c8 ignore stop */
			let idx = k;
			bArr[idx] = Fr.add(this.getCoef(i + m), Fr.mul(bArr[idx], beta));
			quotient.setCoef(i, bArr[idx]);
			j = (j + 1) % m;
		}
		this.coef = quotient.coef;
	}
	divByVanishing(n, beta) {
		if (this.degree() < n) throw new Error("divByVanishing polynomial divisor must be of degree lower than the dividend polynomial");
		const Fr = this.Fr;
		let polR = new Polynomial(this.coef, this.curve, this.logger);
		this.coef = this.length() > 32768 ? new ffjavascript.BigBuffer(this.length() * Fr.n8) : new Uint8Array(this.length() * Fr.n8);
		for (let i = this.length() - 1; i >= n; i--) {
			let leadingCoef = polR.getCoef(i);
			if (Fr.eq(Fr.zero, leadingCoef)) continue;
			polR.setCoef(i, Fr.zero);
			polR.setCoef(i - n, Fr.add(polR.getCoef(i - n), Fr.mul(beta, leadingCoef)));
			this.setCoef(i - n, Fr.add(this.getCoef(i - n), leadingCoef));
		}
		return polR;
	}
	fastDivByVanishing(data) {
		const Fr = this.Fr;
		for (let i = 0; i < data.length; i++) {
			let m = data[i][0];
			let beta = data[i][1];
			if (this.degree() < m) throw new Error("divByVanishing polynomial divisor must be of degree lower than the dividend polynomial");
			let nThreads = 5;
			let nElements = this.length() - m;
			let nElementsBucket = Math.floor(nElements / nThreads / m);
			let nElementsChunk = nElementsBucket * m;
			let nElementsLast = nElements - nThreads * nElementsChunk;
			let polTmp = new Polynomial(this.length() > 32768 ? new ffjavascript.BigBuffer(this.length() * Fr.n8) : new Uint8Array(this.length() * Fr.n8), this.curve, this.logger);
			let ptr = this.coef;
			this.coef = polTmp.coef;
			polTmp.coef = ptr;
			for (let k = 0; k < nThreads; k++) {
				let idx0 = (k + 1) * nElementsChunk + nElementsLast;
				for (let i = 0; i < m; i++) this.setCoef(idx0 + i - m, polTmp.getCoef(idx0 + i));
				for (let i = 0; i < nElementsChunk - m; i++) {
					let offset = idx0 - i - 1;
					let val = Fr.add(polTmp.getCoef(offset), Fr.mul(beta, this.getCoef(offset)));
					this.setCoef(offset - m, val);
				}
			}
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
			let acc = [];
			let betaPow = Fr.one;
			for (let i = 0; i < nElementsBucket; i++) betaPow = Fr.mul(betaPow, beta);
			let currentBeta = Fr.one;
			for (let k = nThreads; k > 0; k--) {
				let idThread = k - 1;
				let idx0 = idThread * nElementsChunk + nElementsLast;
				acc[idThread] = [];
				for (let i = 0; i < m; i++) {
					acc[idThread][i] = this.getCoef(idx0 + i);
					if (k !== nThreads) acc[idThread][i] = Fr.add(acc[idThread][i], Fr.mul(betaPow, acc[idThread + 1][i]));
				}
				currentBeta = Fr.mul(currentBeta, betaPow);
			}
			for (let k = 0; k < nThreads; k++) {
				let idx0 = k * nElementsChunk + nElementsLast;
				let currentBeta = beta;
				let currentM = m - 1;
				let limit = k === 0 ? nElementsLast : nElementsChunk;
				for (let i = 0; i < limit; i++) {
					let offset = idx0 - i - 1;
					let val = Fr.add(this.getCoef(offset), Fr.mul(currentBeta, acc[k][currentM]));
					this.setCoef(offset, val);
					if (currentM === 0) {
						currentM = m - 1;
						currentBeta = Fr.mul(currentBeta, beta);
					} else currentM--;
				}
			}
		}
	}
	divByXSubValue(value) {
		const coefs = this.length() > 32768 ? new ffjavascript.BigBuffer(this.length() * this.Fr.n8) : new Uint8Array(this.length() * this.Fr.n8);
		coefs.set(this.Fr.zero, (this.length() - 1) * this.Fr.n8);
		coefs.set(this.coef.slice((this.length() - 1) * this.Fr.n8, this.length() * this.Fr.n8), (this.length() - 2) * this.Fr.n8);
		for (let i = this.length() - 3; i >= 0; i--) {
			let i_n8 = i * this.Fr.n8;
			coefs.set(this.Fr.add(this.coef.slice(i_n8 + this.Fr.n8, i_n8 + 2 * this.Fr.n8), this.Fr.mul(value, coefs.slice(i_n8 + this.Fr.n8, i_n8 + 2 * this.Fr.n8))), i * this.Fr.n8);
		}
		if (!this.Fr.eq(this.coef.slice(0, this.Fr.n8), this.Fr.mul(this.Fr.neg(value), coefs.slice(0, this.Fr.n8)))) throw new Error("Polynomial does not divide");
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
			const a = this.Fr.sub(this.coef.slice((i - domainSize) * this.Fr.n8, (i - domainSize) * this.Fr.n8 + this.Fr.n8), this.coef.slice(i_n8, i_n8 + this.Fr.n8));
			this.coef.set(a, i_n8);
			if (i > domainSize * (extensions - 1) - extensions) {
				/* c8 ignore start */
				if (!this.Fr.isZero(a)) throw new Error("Polynomial is not divisible");
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
		if (!isOne) for (let i = 0; i < n; i++) {
			const i_n8 = i * this.Fr.n8;
			let element;
			if (isNegOne) element = Fr.neg(this.coef.slice(i_n8, i_n8 + this.Fr.n8));
			else element = Fr.mul(invBetaNeg, this.coef.slice(i_n8, i_n8 + this.Fr.n8));
			this.coef.set(element, i_n8);
		}
		isOne = Fr.eq(Fr.one, invBeta);
		isNegOne = Fr.eq(Fr.negone, invBeta);
		for (let i = n; i < this.length(); i++) {
			const i_n8 = i * this.Fr.n8;
			const i_prev_n8 = (i - n) * this.Fr.n8;
			let element = this.Fr.sub(this.coef.slice(i_prev_n8, i_prev_n8 + this.Fr.n8), this.coef.slice(i_n8, i_n8 + this.Fr.n8));
			if (!isOne) {
				if (isNegOne) element = Fr.neg(element);
				else element = Fr.mul(invBeta, element);
			}
			this.coef.set(element, i_n8);
			if (i > this.length() - n - 1) {
				if (!this.Fr.isZero(element)) throw new Error("Polynomial is not divisible");
			}
		}
		return this;
	}
	byX() {
		const coefs = this.length() + 1 > 32768 ? new ffjavascript.BigBuffer(this.coef.byteLength + this.Fr.n8) : new Uint8Array(this.coef.byteLength + this.Fr.n8);
		coefs.set(this.Fr.zero, 0);
		coefs.set(this.coef, this.Fr.n8);
		this.coef = coefs;
	}
	static async expX(polynomial, n, truncate = false) {
		const Fr = polynomial.Fr;
		if (n < 1) throw new Error("Compute a new polynomial to a zero or negative number is not allowed");
		else if (1 === n) return Polynomial.fromPolynomial(polynomial, polynomial.curve, polynomial.logger);
		const length = truncate ? polynomial.degree() : polynomial.length() - 1;
		const bufferDst = length * n + 1 > 32768 ? new ffjavascript.BigBuffer((length * n + 1) * Fr.n8) : new Uint8Array((length * n + 1) * Fr.n8);
		bufferDst.set(polynomial.getCoef(0), 0);
		for (let i = 1; i <= length; i++) {
			const i_sFr = i * Fr.n8;
			const coef = polynomial.getCoef(i);
			bufferDst.set(coef, i_sFr * n);
		}
		return new Polynomial(bufferDst, polynomial.curve, polynomial.logger);
	}
	split(numPols, degPols, blindingFactors) {
		if (numPols < 1) throw new Error(`Polynomials can't be split in ${numPols} parts`);
		else if (1 === numPols) return [this];
		if (0 !== blindingFactors.length && blindingFactors.length < numPols - 1) throw new Error(`Blinding factors length must be ${numPols - 1}`);
		const chunkByteLength = (degPols + 1) * this.Fr.n8;
		let res = [];
		const numRealPols = Math.ceil((this.degree() + 1) * this.Fr.n8 / chunkByteLength);
		if (numRealPols < numPols) for (let i = numRealPols; i < numPols; i++) res[i] = new Polynomial(new Uint8Array(this.Fr.n8), this.curve, this.logger);
		numPols = Math.min(numPols, numRealPols);
		for (let i = 0; i < numPols; i++) {
			const isLast = numPols - 1 === i;
			const byteLength = isLast ? this.coef.byteLength - (numPols - 1) * chunkByteLength : chunkByteLength + this.Fr.n8;
			/* c8 ignore start */
			let buff = byteLength / this.Fr.n8 > 32768 ? new ffjavascript.BigBuffer(byteLength) : new Uint8Array(byteLength);
			/* c8 ignore stop */
			res[i] = new Polynomial(buff, this.curve, this.logger);
			const fr = i * chunkByteLength;
			const to = isLast ? this.coef.byteLength : (i + 1) * chunkByteLength;
			res[i].coef.set(this.coef.slice(fr, to), 0);
			if (!isLast) res[i].coef.set(blindingFactors[i], chunkByteLength);
			if (0 !== i) {
				const lowestDegree = this.Fr.sub(res[i].coef.slice(0, this.Fr.n8), blindingFactors[i - 1]);
				res[i].coef.set(lowestDegree, 0);
			}
			if (isLast) res[i].truncate();
		}
		return res;
	}
	truncate() {
		const deg = this.degree();
		if (deg + 1 < this.coef.byteLength / this.Fr.n8) {
			/* c8 ignore start */
			const newCoefs = deg + 1 > 32768 ? 
			/* c8 ignore stop */
			new ffjavascript.BigBuffer((deg + 1) * this.Fr.n8) : new Uint8Array((deg + 1) * this.Fr.n8);
			newCoefs.set(this.coef.slice(0, (deg + 1) * this.Fr.n8), 0);
			this.coef = newCoefs;
		}
	}
	static lagrangePolynomialInterpolation(xArr, yArr, curve) {
		const Fr = curve.Fr;
		let polynomial = computeLagrangePolynomial(0);
		for (let i = 1; i < xArr.length; i++) polynomial.add(computeLagrangePolynomial(i));
		return polynomial;
		function computeLagrangePolynomial(i) {
			let polynomial;
			for (let j = 0; j < xArr.length; j++) {
				if (j === i) continue;
				if (polynomial === void 0) {
					/* c8 ignore start */
					let buff = xArr.length > 32768 ? 
					/* c8 ignore stop */
					new ffjavascript.BigBuffer(xArr.length * Fr.n8) : new Uint8Array(xArr.length * Fr.n8);
					polynomial = new Polynomial(buff, curve);
					polynomial.setCoef(0, Fr.neg(xArr[j]));
					polynomial.setCoef(1, Fr.one);
				} else polynomial.byXSubValue(xArr[j]);
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
		/* c8 ignore start */
		let buff = xArr.length + 1 > 32768 ? 
		/* c8 ignore stop */
		new ffjavascript.BigBuffer((xArr.length + 1) * Fr.n8) : new Uint8Array((xArr.length + 1) * Fr.n8);
		let polynomial = new Polynomial(buff, curve);
		polynomial.setCoef(0, Fr.neg(xArr[0]));
		polynomial.setCoef(1, Fr.one);
		for (let i = 1; i < xArr.length; i++) polynomial.byXSubValue(xArr[i]);
		return polynomial;
	}
	print() {
		const Fr = this.Fr;
		let res = "";
		for (let i = this.degree(); i >= 0; i--) {
			const coef = this.getCoef(i);
			if (!Fr.eq(Fr.zero, coef)) {
				if (Fr.isNegative(coef)) res += " - ";
				else if (i !== this.degree()) res += " + ";
				res += Fr.toString(coef);
				if (i > 0) res += i > 1 ? "x^" + i : "x";
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
};
//#endregion
//#region src/polynomial/evaluations.js
var Evaluations = class Evaluations {
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
		if (i_n8 + this.Fr.n8 > this.eval.byteLength) throw new Error("Evaluations.getEvaluation() out of bounds");
		return this.eval.slice(i_n8, i_n8 + this.Fr.n8);
	}
	length() {
		let length = this.eval.byteLength / this.Fr.n8;
		if (length !== Math.floor(this.eval.byteLength / this.Fr.n8)) throw new Error("Polynomial evaluations buffer has incorrect size");
		if (0 === length) this.logger.warn("Polynomial has length zero");
		return length;
	}
};
//#endregion
//#region src/plonk_prove.js
var { stringifyBigInts: stringifyBigInts$2 } = ffjavascript.utils;
async function plonk16Prove(zkeyFileName, witnessFileName, logger, options) {
	const fds = {};
	try {
		return await _plonk16Prove(zkeyFileName, witnessFileName, logger, options, fds);
	} finally {
		for (const openFd of [fds.fdWtns, fds.fdZKey]) try {
			if (openFd) await openFd.close();
		} catch (e) {}
	}
}
async function _plonk16Prove(zkeyFileName, witnessFileName, logger, options, fds) {
	const { fd: fdWtns, sections: sectionsWtns } = await _iden3_binfileutils.readBinFile(witnessFileName, "wtns", 2, 1 << 25, 1 << 23);
	fds.fdWtns = fdWtns;
	if (logger) logger.debug("> Reading witness file");
	const wtns = await readHeader(fdWtns, sectionsWtns);
	if (logger) logger.debug("> Reading zkey file");
	const { fd: fdZKey, sections: zkeySections } = await _iden3_binfileutils.readBinFile(zkeyFileName, "zkey", 2, 1 << 25, 1 << 23);
	fds.fdZKey = fdZKey;
	const zkey = await readHeader$1(fdZKey, zkeySections, void 0, options);
	if (zkey.protocol != "plonk") throw new Error("zkey file is not plonk");
	if (!ffjavascript.Scalar.eq(zkey.r, wtns.q)) throw new Error("Curve of the witness does not match the curve of the proving key");
	if (wtns.nWitness != zkey.nVars - zkey.nAdditions) throw new Error(`Invalid witness length. Circuit: ${zkey.nVars}, witness: ${wtns.nWitness}, ${zkey.nAdditions}`);
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
	if (logger) logger.debug("> Reading witness file data");
	let buffWitness = await _iden3_binfileutils.readSection(fdWtns, sectionsWtns, 2);
	buffWitness.set(Fr.zero, 0);
	let buffInternalWitness = new ffjavascript.BigBuffer(n8r * zkey.nAdditions);
	let buffers = {};
	let polynomials = {};
	let evaluations = {};
	let challenges = {};
	let proof = new Proof(curve, logger);
	const transcript = new Keccak256Transcript(curve);
	if (logger) logger.debug(`> Reading Section 3. Additions`);
	await calculateAdditions();
	if (logger) logger.debug(`> Reading Section 12. Sigma1, Sigma2 & Sigma 3`);
	if (logger) logger.debug("··· Reading Sigma polynomials ");
	polynomials.Sigma1 = new Polynomial(new ffjavascript.BigBuffer(sDomain), curve, logger);
	polynomials.Sigma2 = new Polynomial(new ffjavascript.BigBuffer(sDomain), curve, logger);
	polynomials.Sigma3 = new Polynomial(new ffjavascript.BigBuffer(sDomain), curve, logger);
	await fdZKey.readToBuffer(polynomials.Sigma1.coef, 0, sDomain, zkeySections[12][0].p);
	await fdZKey.readToBuffer(polynomials.Sigma2.coef, 0, sDomain, zkeySections[12][0].p + 5 * sDomain);
	await fdZKey.readToBuffer(polynomials.Sigma3.coef, 0, sDomain, zkeySections[12][0].p + 10 * sDomain);
	if (logger) logger.debug("··· Reading Sigma evaluations");
	evaluations.Sigma1 = new Evaluations(new ffjavascript.BigBuffer(sDomain * 4), curve, logger);
	evaluations.Sigma2 = new Evaluations(new ffjavascript.BigBuffer(sDomain * 4), curve, logger);
	evaluations.Sigma3 = new Evaluations(new ffjavascript.BigBuffer(sDomain * 4), curve, logger);
	await fdZKey.readToBuffer(evaluations.Sigma1.eval, 0, sDomain * 4, zkeySections[12][0].p + sDomain);
	await fdZKey.readToBuffer(evaluations.Sigma2.eval, 0, sDomain * 4, zkeySections[12][0].p + 6 * sDomain);
	await fdZKey.readToBuffer(evaluations.Sigma3.eval, 0, sDomain * 4, zkeySections[12][0].p + 11 * sDomain);
	if (logger) logger.debug(`> Reading Section 14. Powers of Tau`);
	const PTau = await _iden3_binfileutils.readSection(fdZKey, zkeySections, 14);
	let publicSignals = [];
	for (let i = 1; i <= zkey.nPublic; i++) {
		const pub = buffWitness.slice(i * Fr.n8, i * Fr.n8 + Fr.n8);
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
	await fdZKey.close();
	await fdWtns.close();
	let _proof = proof.toObjectProof(false);
	_proof.protocol = "plonk";
	_proof.curve = curve.name;
	if (logger) logger.debug("PLONK PROVER FINISHED");
	return {
		proof: stringifyBigInts$2(_proof),
		publicSignals: stringifyBigInts$2(publicSignals)
	};
	async function calculateAdditions() {
		if (logger) logger.debug("··· Computing additions");
		const additionsBuff = await _iden3_binfileutils.readSection(fdZKey, zkeySections, 3);
		const sSum = 8 + n8r * 2;
		for (let i = 0; i < zkey.nAdditions; i++) {
			/* c8 ignore start */
			if (logger && 0 !== i && i % 1e5 === 0) logger.debug(`    addition ${i}/${zkey.nAdditions}`);
			/* c8 ignore stop */
			let offset = i * sSum;
			const signalId1 = readUInt32(additionsBuff, offset);
			offset += 4;
			const signalId2 = readUInt32(additionsBuff, offset);
			offset += 4;
			const factor1 = additionsBuff.slice(offset, offset + n8r);
			offset += n8r;
			const factor2 = additionsBuff.slice(offset, offset + n8r);
			const witness1 = getWitness(signalId1);
			const witness2 = getWitness(signalId2);
			const result = Fr.add(Fr.mul(factor1, witness1), Fr.mul(factor2, witness2));
			buffInternalWitness.set(result, n8r * i);
		}
	}
	function readUInt32(b, o) {
		const buff = b.slice(o, o + 4);
		return new DataView(buff.buffer, buff.byteOffset, buff.byteLength).getUint32(0, true);
	}
	function getWitness(idx) {
		if (idx < zkey.nVars - zkey.nAdditions) return buffWitness.slice(idx * n8r, idx * n8r + n8r);
		else if (idx < zkey.nVars)
 /* c8 ignore start */
		return buffInternalWitness.slice((idx - (zkey.nVars - zkey.nAdditions)) * n8r, (idx - (zkey.nVars - zkey.nAdditions)) * n8r + n8r);
		else return curve.Fr.zero;
	}
	async function round1() {
		challenges.b = [];
		for (let i = 1; i <= 11; i++) challenges.b[i] = curve.Fr.random();
		if (logger) logger.debug("> Computing A, B, C wire polynomials");
		await computeWirePolynomials();
		if (logger) logger.debug("> Computing A, B, C MSM");
		let commitA = await polynomials.A.multiExponentiation(PTau, "A");
		let commitB = await polynomials.B.multiExponentiation(PTau, "B");
		let commitC = await polynomials.C.multiExponentiation(PTau, "C");
		proof.addPolynomial("A", commitA);
		proof.addPolynomial("B", commitB);
		proof.addPolynomial("C", commitC);
		return 0;
	}
	async function computeWirePolynomials() {
		if (logger) logger.debug("··· Reading data from zkey file");
		buffers.A = new ffjavascript.BigBuffer(sDomain);
		buffers.B = new ffjavascript.BigBuffer(sDomain);
		buffers.C = new ffjavascript.BigBuffer(sDomain);
		let aMapBuff = await _iden3_binfileutils.readSection(fdZKey, zkeySections, 4);
		let bMapBuff = await _iden3_binfileutils.readSection(fdZKey, zkeySections, 5);
		let cMapBuff = await _iden3_binfileutils.readSection(fdZKey, zkeySections, 6);
		for (let i = 0; i < zkey.nConstraints; i++) {
			const i_sFr = i * n8r;
			const offset = i * 4;
			const signalIdA = readUInt32(aMapBuff, offset);
			buffers.A.set(getWitness(signalIdA), i_sFr);
			const signalIdB = readUInt32(bMapBuff, offset);
			buffers.B.set(getWitness(signalIdB), i_sFr);
			const signalIdC = readUInt32(cMapBuff, offset);
			buffers.C.set(getWitness(signalIdC), i_sFr);
		}
		aMapBuff = null;
		bMapBuff = null;
		cMapBuff = null;
		buffWitness = null;
		buffInternalWitness = null;
		buffers.A = await Fr.batchToMontgomery(buffers.A);
		buffers.B = await Fr.batchToMontgomery(buffers.B);
		buffers.C = await Fr.batchToMontgomery(buffers.C);
		if (logger) logger.debug("··· Computing A ifft");
		polynomials.A = await Polynomial.fromEvaluations(buffers.A, curve, logger);
		if (logger) logger.debug("··· Computing B ifft");
		polynomials.B = await Polynomial.fromEvaluations(buffers.B, curve, logger);
		if (logger) logger.debug("··· Computing C ifft");
		polynomials.C = await Polynomial.fromEvaluations(buffers.C, curve, logger);
		if (logger) logger.debug("··· Computing A fft");
		evaluations.A = await Evaluations.fromPolynomial(polynomials.A, 4, curve, logger);
		if (logger) logger.debug("··· Computing B fft");
		evaluations.B = await Evaluations.fromPolynomial(polynomials.B, 4, curve, logger);
		if (logger) logger.debug("··· Computing C fft");
		evaluations.C = await Evaluations.fromPolynomial(polynomials.C, 4, curve, logger);
		polynomials.A.blindCoefficients([challenges.b[2], challenges.b[1]]);
		polynomials.B.blindCoefficients([challenges.b[4], challenges.b[3]]);
		polynomials.C.blindCoefficients([challenges.b[6], challenges.b[5]]);
		/* c8 ignore start */
		if (polynomials.A.degree() >= zkey.domainSize + 2) throw new Error("A Polynomial is not well calculated");
		/* c8 ignore stop */
		/* c8 ignore start */
		if (polynomials.B.degree() >= zkey.domainSize + 2) throw new Error("B Polynomial is not well calculated");
		/* c8 ignore stop */
		/* c8 ignore start */
		if (polynomials.C.degree() >= zkey.domainSize + 2) throw new Error("C Polynomial is not well calculated");
		/* c8 ignore stop */
	}
	async function round2() {
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
		for (let i = 0; i < zkey.nPublic; i++) transcript.addScalar(buffers.A.slice(i * n8r, i * n8r + n8r));
		transcript.addPolCommitment(proof.getPolynomial("A"));
		transcript.addPolCommitment(proof.getPolynomial("B"));
		transcript.addPolCommitment(proof.getPolynomial("C"));
		challenges.beta = transcript.getChallenge();
		if (logger) logger.debug("··· challenges.beta: " + Fr.toString(challenges.beta, 16));
		transcript.reset();
		transcript.addScalar(challenges.beta);
		challenges.gamma = transcript.getChallenge();
		if (logger) logger.debug("··· challenges.gamma: " + Fr.toString(challenges.gamma, 16));
		if (logger) logger.debug("> Computing Z polynomial");
		await computeZ();
		if (logger) logger.debug("> Computing Z MSM");
		let commitZ = await polynomials.Z.multiExponentiation(PTau, "Z");
		proof.addPolynomial("Z", commitZ);
	}
	async function computeZ() {
		if (logger) logger.debug("··· Computing Z evaluations");
		let numArr = new ffjavascript.BigBuffer(sDomain);
		let denArr = new ffjavascript.BigBuffer(sDomain);
		numArr.set(Fr.one, 0);
		denArr.set(Fr.one, 0);
		let w = Fr.one;
		for (let i = 0; i < zkey.domainSize; i++) {
			const i_n8r = i * n8r;
			const a = buffers.A.slice(i_n8r, i_n8r + n8r);
			const b = buffers.B.slice(i_n8r, i_n8r + n8r);
			const c = buffers.C.slice(i_n8r, i_n8r + n8r);
			const betaw = Fr.mul(challenges.beta, w);
			let n1 = Fr.add(a, betaw);
			n1 = Fr.add(n1, challenges.gamma);
			let n2 = Fr.add(b, Fr.mul(zkey.k1, betaw));
			n2 = Fr.add(n2, challenges.gamma);
			let n3 = Fr.add(c, Fr.mul(zkey.k2, betaw));
			n3 = Fr.add(n3, challenges.gamma);
			let num = Fr.mul(n1, Fr.mul(n2, n3));
			let d1 = Fr.add(a, Fr.mul(evaluations.Sigma1.getEvaluation(i * 4), challenges.beta));
			d1 = Fr.add(d1, challenges.gamma);
			let d2 = Fr.add(b, Fr.mul(evaluations.Sigma2.getEvaluation(i * 4), challenges.beta));
			d2 = Fr.add(d2, challenges.gamma);
			let d3 = Fr.add(c, Fr.mul(evaluations.Sigma3.getEvaluation(i * 4), challenges.beta));
			d3 = Fr.add(d3, challenges.gamma);
			let den = Fr.mul(d1, Fr.mul(d2, d3));
			num = Fr.mul(numArr.slice(i_n8r, i_n8r + n8r), num);
			numArr.set(num, (i + 1) % zkey.domainSize * n8r);
			den = Fr.mul(denArr.slice(i_n8r, i_n8r + n8r), den);
			denArr.set(den, (i + 1) % zkey.domainSize * n8r);
			w = Fr.mul(w, Fr.w[zkey.power]);
		}
		denArr = await Fr.batchInverse(denArr);
		for (let i = 0; i < zkey.domainSize; i++) {
			const i_sFr = i * n8r;
			const z = Fr.mul(numArr.slice(i_sFr, i_sFr + n8r), denArr.slice(i_sFr, i_sFr + n8r));
			numArr.set(z, i_sFr);
		}
		buffers.Z = numArr;
		/* c8 ignore start */
		if (!Fr.eq(numArr.slice(0, n8r), Fr.one)) throw new Error("Copy constraints does not match");
		/* c8 ignore stop */
		if (logger) logger.debug("··· Computing Z ifft");
		polynomials.Z = await Polynomial.fromEvaluations(buffers.Z, curve, logger);
		if (logger) logger.debug("··· Computing Z fft");
		evaluations.Z = await Evaluations.fromPolynomial(polynomials.Z, 4, curve, logger);
		polynomials.Z.blindCoefficients([
			challenges.b[9],
			challenges.b[8],
			challenges.b[7]
		]);
		/* c8 ignore start */
		if (polynomials.Z.degree() >= zkey.domainSize + 3) throw new Error("Z Polynomial is not well calculated");
		/* c8 ignore stop */
		delete buffers.Z;
		delete buffers.B;
		delete buffers.C;
		if (globalThis.gc) globalThis.gc();
	}
	async function round3() {
		if (logger) logger.debug("> Computing challenge alpha");
		transcript.reset();
		transcript.addScalar(challenges.beta);
		transcript.addScalar(challenges.gamma);
		transcript.addPolCommitment(proof.getPolynomial("Z"));
		challenges.alpha = transcript.getChallenge();
		challenges.alpha2 = Fr.square(challenges.alpha);
		if (logger) logger.debug("··· challenges.alpha: " + Fr.toString(challenges.alpha, 16));
		if (logger) logger.debug("> Computing T polynomial");
		await computeT();
		if (logger) logger.debug("> Computing T MSM");
		let commitT1 = await polynomials.T1.multiExponentiation(PTau, "T1");
		let commitT2 = await polynomials.T2.multiExponentiation(PTau, "T2");
		let commitT3 = await polynomials.T3.multiExponentiation(PTau, "T3");
		proof.addPolynomial("T1", commitT1);
		proof.addPolynomial("T2", commitT2);
		proof.addPolynomial("T3", commitT3);
	}
	async function computeT() {
		if (logger) logger.debug(`··· Reading sections 8, 9, 7, 10, 11. Q selectors`);
		evaluations.QL = new Evaluations(new ffjavascript.BigBuffer(sDomain * 4), curve, logger);
		evaluations.QR = new Evaluations(new ffjavascript.BigBuffer(sDomain * 4), curve, logger);
		evaluations.QM = new Evaluations(new ffjavascript.BigBuffer(sDomain * 4), curve, logger);
		evaluations.QO = new Evaluations(new ffjavascript.BigBuffer(sDomain * 4), curve, logger);
		evaluations.QC = new Evaluations(new ffjavascript.BigBuffer(sDomain * 4), curve, logger);
		await fdZKey.readToBuffer(evaluations.QL.eval, 0, sDomain * 4, zkeySections[8][0].p + sDomain);
		await fdZKey.readToBuffer(evaluations.QR.eval, 0, sDomain * 4, zkeySections[9][0].p + sDomain);
		await fdZKey.readToBuffer(evaluations.QM.eval, 0, sDomain * 4, zkeySections[7][0].p + sDomain);
		await fdZKey.readToBuffer(evaluations.QO.eval, 0, sDomain * 4, zkeySections[10][0].p + sDomain);
		await fdZKey.readToBuffer(evaluations.QC.eval, 0, sDomain * 4, zkeySections[11][0].p + sDomain);
		evaluations.Lagrange = new Evaluations(new ffjavascript.BigBuffer(sDomain * 4 * zkey.nPublic), curve, logger);
		for (let i = 0; i < zkey.nPublic; i++) await fdZKey.readToBuffer(evaluations.Lagrange.eval, i * sDomain * 4, sDomain * 4, zkeySections[13][0].p + i * 5 * sDomain + sDomain);
		buffers.T = new ffjavascript.BigBuffer(sDomain * 4);
		buffers.Tz = new ffjavascript.BigBuffer(sDomain * 4);
		if (logger) logger.debug("··· Computing T evaluations");
		let w = Fr.one;
		for (let i = 0; i < zkey.domainSize * 4; i++) {
			if (logger && 0 !== i && i % 1e5 === 0)
 /* c8 ignore start */
			logger.debug(`      T evaluation ${i}/${zkey.domainSize * 4}`);
			/* c8 ignore stop */
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
				const offset = j * 4 * zkey.domainSize + i;
				const lPol = evaluations.Lagrange.getEvaluation(offset);
				const aVal = buffers.A.slice(j * n8r, (j + 1) * n8r);
				pi = Fr.sub(pi, Fr.mul(lPol, aVal));
			}
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
		delete buffers.A;
		delete evaluations.A;
		delete evaluations.B;
		delete evaluations.C;
		delete evaluations.Z;
		delete evaluations.QL;
		delete evaluations.QR;
		delete evaluations.QM;
		delete evaluations.QO;
		delete evaluations.QC;
		delete evaluations.Sigma1;
		delete evaluations.Sigma2;
		delete evaluations.Sigma3;
		delete evaluations.Lagrange;
		if (globalThis.gc) globalThis.gc();
		if (logger) logger.debug("··· Computing T ifft");
		polynomials.T = await Polynomial.fromEvaluations(buffers.T, curve, logger);
		delete buffers.T;
		if (logger) logger.debug("··· Computing T / ZH");
		polynomials.T.divZh(zkey.domainSize, 4);
		if (logger) logger.debug("··· Computing Tz ifft");
		polynomials.Tz = await Polynomial.fromEvaluations(buffers.Tz, curve, logger);
		delete buffers.Tz;
		polynomials.T.add(polynomials.Tz);
		delete polynomials.Tz;
		/* c8 ignore start */
		if (polynomials.T.degree() >= zkey.domainSize * 3 + 6) throw new Error("T Polynomial is not well calculated");
		/* c8 ignore stop */
		if (logger) logger.debug("··· Computing T1, T2, T3 polynomials");
		polynomials.T1 = new Polynomial(new ffjavascript.BigBuffer((zkey.domainSize + 1) * n8r), curve, logger);
		polynomials.T2 = new Polynomial(new ffjavascript.BigBuffer((zkey.domainSize + 1) * n8r), curve, logger);
		polynomials.T3 = new Polynomial(new ffjavascript.BigBuffer((zkey.domainSize + 6) * n8r), curve, logger);
		polynomials.T1.coef.set(polynomials.T.coef.slice(0, sDomain), 0);
		polynomials.T2.coef.set(polynomials.T.coef.slice(sDomain, sDomain * 2), 0);
		polynomials.T3.coef.set(polynomials.T.coef.slice(sDomain * 2, sDomain * 3 + 6 * n8r), 0);
		polynomials.T1.setCoef(zkey.domainSize, challenges.b[10]);
		const lowestMid = Fr.sub(polynomials.T2.getCoef(0), challenges.b[10]);
		polynomials.T2.setCoef(0, lowestMid);
		polynomials.T2.setCoef(zkey.domainSize, challenges.b[11]);
		const lowestHigh = Fr.sub(polynomials.T3.getCoef(0), challenges.b[11]);
		polynomials.T3.setCoef(0, lowestHigh);
		delete polynomials.T;
		if (globalThis.gc) globalThis.gc();
	}
	async function round4() {
		if (logger) logger.debug("> Computing challenge xi");
		transcript.reset();
		transcript.addScalar(challenges.alpha);
		transcript.addPolCommitment(proof.getPolynomial("T1"));
		transcript.addPolCommitment(proof.getPolynomial("T2"));
		transcript.addPolCommitment(proof.getPolynomial("T3"));
		challenges.xi = transcript.getChallenge();
		challenges.xiw = Fr.mul(challenges.xi, Fr.w[zkey.power]);
		if (logger) logger.debug("··· challenges.xi: " + Fr.toString(challenges.xi, 16));
		proof.addEvaluation("eval_a", polynomials.A.evaluate(challenges.xi));
		proof.addEvaluation("eval_b", polynomials.B.evaluate(challenges.xi));
		proof.addEvaluation("eval_c", polynomials.C.evaluate(challenges.xi));
		proof.addEvaluation("eval_s1", polynomials.Sigma1.evaluate(challenges.xi));
		proof.addEvaluation("eval_s2", polynomials.Sigma2.evaluate(challenges.xi));
		proof.addEvaluation("eval_zw", polynomials.Z.evaluate(challenges.xiw));
	}
	async function round5() {
		if (logger) logger.debug("> Computing challenge v");
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
		for (let i = 2; i < 6; i++) challenges.v[i] = Fr.mul(challenges.v[i - 1], challenges.v[1]);
		if (logger) logger.debug("> Computing linearisation polynomial R(X)");
		await computeR();
		if (logger) logger.debug("> Computing opening proof polynomial Wxi(X) polynomial");
		computeWxi();
		if (logger) logger.debug("> Computing opening proof polynomial Wxiw(X) polynomial");
		computeWxiw();
		if (logger) logger.debug("> Computing Wxi, Wxiw MSM");
		let commitWxi = await polynomials.Wxi.multiExponentiation(PTau, "Wxi");
		let commitWxiw = await polynomials.Wxiw.multiExponentiation(PTau, "Wxiw");
		proof.addPolynomial("Wxi", commitWxi);
		proof.addPolynomial("Wxiw", commitWxiw);
	}
	async function computeR() {
		const Fr = curve.Fr;
		polynomials.QL = new Polynomial(new ffjavascript.BigBuffer(sDomain), curve, logger);
		polynomials.QR = new Polynomial(new ffjavascript.BigBuffer(sDomain), curve, logger);
		polynomials.QM = new Polynomial(new ffjavascript.BigBuffer(sDomain), curve, logger);
		polynomials.QO = new Polynomial(new ffjavascript.BigBuffer(sDomain), curve, logger);
		polynomials.QC = new Polynomial(new ffjavascript.BigBuffer(sDomain), curve, logger);
		await fdZKey.readToBuffer(polynomials.QL.coef, 0, sDomain, zkeySections[8][0].p);
		await fdZKey.readToBuffer(polynomials.QR.coef, 0, sDomain, zkeySections[9][0].p);
		await fdZKey.readToBuffer(polynomials.QM.coef, 0, sDomain, zkeySections[7][0].p);
		await fdZKey.readToBuffer(polynomials.QO.coef, 0, sDomain, zkeySections[10][0].p);
		await fdZKey.readToBuffer(polynomials.QC.coef, 0, sDomain, zkeySections[11][0].p);
		challenges.xin = challenges.xi;
		for (let i = 0; i < zkey.power; i++) challenges.xin = Fr.square(challenges.xin);
		challenges.zh = Fr.sub(challenges.xin, Fr.one);
		const L = [];
		const n = Fr.e(zkey.domainSize);
		let w = Fr.one;
		for (let i = 1; i <= Math.max(1, zkey.nPublic); i++) {
			L[i] = Fr.div(Fr.mul(w, challenges.zh), Fr.mul(n, Fr.sub(challenges.xi, w)));
			w = Fr.mul(w, Fr.w[zkey.power]);
		}
		const eval_l1 = Fr.div(Fr.sub(challenges.xin, Fr.one), Fr.mul(n, Fr.sub(challenges.xi, Fr.one)));
		if (logger) {
			logger.debug("Lagrange Evaluations: ");
			for (let i = 1; i < L.length; i++) logger.debug(`L${i}(xi)=` + Fr.toString(L[i], 16));
		}
		let eval_pi = Fr.zero;
		for (let i = 0; i < publicSignals.length; i++) {
			const w = Fr.e(publicSignals[i]);
			eval_pi = Fr.sub(eval_pi, Fr.mul(w, L[i + 1]));
		}
		if (logger) logger.debug("PI: " + Fr.toString(eval_pi, 16));
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
		tmp = null;
		delete polynomials.QL;
		delete polynomials.QR;
		delete polynomials.QM;
		delete polynomials.QO;
		delete polynomials.QC;
		delete polynomials.Sigma3;
		delete polynomials.T1;
		delete polynomials.T2;
		delete polynomials.T3;
		if (globalThis.gc) globalThis.gc();
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
		delete polynomials.R;
		delete polynomials.A;
		delete polynomials.B;
		delete polynomials.C;
		delete polynomials.Sigma1;
		delete polynomials.Sigma2;
	}
	async function computeWxiw() {
		polynomials.Wxiw = Polynomial.fromPolynomial(polynomials.Z, curve, logger);
		polynomials.Wxiw.subScalar(proof.evaluations.eval_zw);
		polynomials.Wxiw.divByZerofier(1, challenges.xiw);
		delete polynomials.Z;
		if (globalThis.gc) globalThis.gc();
	}
}
//#endregion
//#region src/plonk_fullprove.js
var { unstringifyBigInts: unstringifyBigInts$6 } = ffjavascript.utils;
async function plonkFullProve$1(_input, wasmFile, zkeyFileName, logger, wtnsCalcOptions, proverOptions) {
	const input = unstringifyBigInts$6(_input);
	const wtns = { type: "mem" };
	await wtnsCalculate$1(input, wasmFile, wtns, wtnsCalcOptions);
	return await plonk16Prove(zkeyFileName, wtns, logger, proverOptions);
}
//#endregion
//#region src/plonk_verify.js
var { unstringifyBigInts: unstringifyBigInts$5 } = ffjavascript.utils;
async function plonkVerify$1(_vk_verifier, _publicSignals, _proof, logger) {
	let vk_verifier = unstringifyBigInts$5(_vk_verifier);
	_proof = unstringifyBigInts$5(_proof);
	let publicSignals = unstringifyBigInts$5(_publicSignals);
	const curve = await getCurveFromName(vk_verifier.curve);
	const Fr = curve.Fr;
	const G1 = curve.G1;
	if (logger) logger.info("PLONK VERIFIER STARTED");
	let proof = fromObjectProof(curve, _proof);
	vk_verifier = fromObjectVk$1(curve, vk_verifier);
	if (!isWellConstructed(curve, proof)) {
		if (logger) logger.error("Proof commitments are not valid.");
		return false;
	}
	if (publicSignals.length != vk_verifier.nPublic) {
		if (logger) logger.error("Invalid number of public inputs");
		return false;
	}
	if (!evaluationsAreValid$1(curve, proof)) {
		if (logger) logger.error("Proof evaluations are not valid");
		return false;
	}
	if (!publicInputsAreValid$1(curve, publicSignals)) {
		if (logger) logger.error("Public inputs are not valid.");
		return false;
	}
	const challenges = calculatechallenges(curve, proof, publicSignals, vk_verifier);
	if (logger) {
		logger.debug("beta: " + Fr.toString(challenges.beta, 16));
		logger.debug("gamma: " + Fr.toString(challenges.gamma, 16));
		logger.debug("alpha: " + Fr.toString(challenges.alpha, 16));
		logger.debug("xi: " + Fr.toString(challenges.xi, 16));
		for (let i = 1; i < 6; i++) if (logger) logger.debug("v: " + Fr.toString(challenges.v[i], 16));
		logger.debug("u: " + Fr.toString(challenges.u, 16));
	}
	const L = calculateLagrangeEvaluations(curve, challenges, vk_verifier);
	if (logger) for (let i = 1; i < L.length; i++) logger.debug(`L${i}(xi)=` + Fr.toString(L[i], 16));
	if (publicSignals.length != vk_verifier.nPublic) {
		if (logger) logger.error("Number of public signals does not match with vk");
		return false;
	}
	const pi = calculatePI$1(curve, publicSignals, L);
	if (logger) logger.debug("PI(xi): " + Fr.toString(pi, 16));
	const r0 = calculateR0(curve, proof, challenges, pi, L[1]);
	if (logger) logger.debug("r0: " + Fr.toString(r0, 16));
	const D = calculateD(curve, proof, challenges, vk_verifier, L[1]);
	if (logger) logger.debug("D: " + G1.toString(G1.toAffine(D), 16));
	const F = calculateF(curve, proof, challenges, vk_verifier, D);
	if (logger) logger.debug("F: " + G1.toString(G1.toAffine(F), 16));
	const E = calculateE(curve, proof, challenges, r0);
	if (logger) logger.debug("E: " + G1.toString(G1.toAffine(E), 16));
	const res = await isValidPairing$1(curve, proof, challenges, vk_verifier, E, F);
	if (logger) {
		if (res) logger.info("OK!");
		else logger.warn("Invalid Proof");
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
function checkValueBelongToField$1(curve, value) {
	return ffjavascript.Scalar.geq(value, 0) && ffjavascript.Scalar.lt(value, curve.r);
}
function checkEvaluationIsValid$1(curve, evaluation) {
	return checkValueBelongToField$1(curve, ffjavascript.Scalar.fromRprLE(evaluation));
}
function evaluationsAreValid$1(curve, proof) {
	return checkEvaluationIsValid$1(curve, proof.eval_a) && checkEvaluationIsValid$1(curve, proof.eval_b) && checkEvaluationIsValid$1(curve, proof.eval_c) && checkEvaluationIsValid$1(curve, proof.eval_s1) && checkEvaluationIsValid$1(curve, proof.eval_s2) && checkEvaluationIsValid$1(curve, proof.eval_zw);
}
function publicInputsAreValid$1(curve, publicInputs) {
	for (let i = 0; i < publicInputs.length; i++) if (!checkValueBelongToField$1(curve, publicInputs[i])) return false;
	return true;
}
function calculatechallenges(curve, proof, publicSignals, vk) {
	const Fr = curve.Fr;
	const res = {};
	const transcript = new Keccak256Transcript(curve);
	transcript.addPolCommitment(vk.Qm);
	transcript.addPolCommitment(vk.Ql);
	transcript.addPolCommitment(vk.Qr);
	transcript.addPolCommitment(vk.Qo);
	transcript.addPolCommitment(vk.Qc);
	transcript.addPolCommitment(vk.S1);
	transcript.addPolCommitment(vk.S2);
	transcript.addPolCommitment(vk.S3);
	for (let i = 0; i < publicSignals.length; i++) transcript.addScalar(Fr.e(publicSignals[i]));
	transcript.addPolCommitment(proof.A);
	transcript.addPolCommitment(proof.B);
	transcript.addPolCommitment(proof.C);
	res.beta = transcript.getChallenge();
	transcript.reset();
	transcript.addScalar(res.beta);
	res.gamma = transcript.getChallenge();
	transcript.reset();
	transcript.addScalar(res.beta);
	transcript.addScalar(res.gamma);
	transcript.addPolCommitment(proof.Z);
	res.alpha = transcript.getChallenge();
	transcript.reset();
	transcript.addScalar(res.alpha);
	transcript.addPolCommitment(proof.T1);
	transcript.addPolCommitment(proof.T2);
	transcript.addPolCommitment(proof.T3);
	res.xi = transcript.getChallenge();
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
	for (let i = 2; i < 6; i++) res.v[i] = Fr.mul(res.v[i - 1], res.v[1]);
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
	for (let i = 0; i < vk.power; i++) {
		xin = Fr.square(xin);
		domainSize *= 2;
	}
	challenges.xin = xin;
	challenges.zh = Fr.sub(xin, Fr.one);
	const L = [];
	const n = Fr.e(domainSize);
	let w = Fr.one;
	for (let i = 1; i <= Math.max(1, vk.nPublic); i++) {
		L[i] = Fr.div(Fr.mul(w, challenges.zh), Fr.mul(n, Fr.sub(challenges.xi, w)));
		w = Fr.mul(w, Fr.w[vk.power]);
	}
	return L;
}
function calculatePI$1(curve, publicSignals, L) {
	const Fr = curve.Fr;
	let pi = Fr.zero;
	for (let i = 0; i < publicSignals.length; i++) {
		const w = Fr.e(publicSignals[i]);
		pi = Fr.sub(pi, Fr.mul(w, L[i + 1]));
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
	return Fr.sub(Fr.sub(e1, e2), e3);
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
	return G1.sub(G1.sub(G1.add(d1, d2), d3), d4);
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
	return G1.timesFr(G1.one, e);
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
	return await curve.pairingEq(G1.neg(A1), vk.X_2, B1, curve.G2.one);
}
//#endregion
//#region src/plonk_exportsoliditycalldata.js
var { unstringifyBigInts: unstringifyBigInts$4 } = ffjavascript.utils;
function p256$1(n) {
	let nstr = n.toString(16);
	while (nstr.length < 64) nstr = "0" + nstr;
	nstr = `"0x${nstr}"`;
	return nstr;
}
async function plonkExportSolidityCallData(_proof, _pub) {
	const proof = unstringifyBigInts$4(_proof);
	const pub = unstringifyBigInts$4(_pub);
	await getCurveFromName(proof.curve);
	let inputs = "";
	for (let i = 0; i < pub.length; i++) {
		if (inputs != "") inputs = inputs + ",";
		inputs = inputs + p256$1(pub[i]);
	}
	return `[${p256$1(proof.A[0])}, ${p256$1(proof.A[1])},${p256$1(proof.B[0])},${p256$1(proof.B[1])},${p256$1(proof.C[0])},${p256$1(proof.C[1])},${p256$1(proof.Z[0])},${p256$1(proof.Z[1])},${p256$1(proof.T1[0])},${p256$1(proof.T1[1])},${p256$1(proof.T2[0])},${p256$1(proof.T2[1])},${p256$1(proof.T3[0])},${p256$1(proof.T3[1])},${p256$1(proof.Wxi[0])},${p256$1(proof.Wxi[1])},${p256$1(proof.Wxiw[0])},${p256$1(proof.Wxiw[1])},${p256$1(proof.eval_a)},${p256$1(proof.eval_b)},${p256$1(proof.eval_c)},${p256$1(proof.eval_s1)},${p256$1(proof.eval_s2)},${p256$1(proof.eval_zw)}][${inputs}]`;
}
//#endregion
//#region src/plonk_equation.js
function getFFlonkConstantConstraint(signal1, Fr) {
	return [
		signal1,
		0,
		0,
		Fr.one,
		Fr.zero,
		Fr.zero,
		Fr.zero,
		Fr.zero
	];
}
function getFFlonkAdditionConstraint(signal1, signal2, signalOut, ql, qr, qm, qo, qc) {
	return [
		signal1,
		signal2,
		signalOut,
		ql,
		qr,
		qm,
		qo,
		qc
	];
}
function getFFlonkMultiplicationConstraint(signal1, signal2, signalOut, ql, qr, qm, qo, qc, Fr) {
	return [
		signal1,
		signal2,
		signalOut,
		ql,
		qr,
		qm,
		qo,
		qc
	];
}
//#endregion
//#region src/r1cs_constraint_processor.js
var LINEAR_COMBINATION_NULLABLE = 0;
var LINEAR_COMBINATION_CONSTANT = 1;
var LINEAR_COMBINATION_VARIABLE = 2;
var r1csConstraintProcessor = class {
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
		if (lctA === LINEAR_COMBINATION_NULLABLE || lctB === LINEAR_COMBINATION_NULLABLE) return this.processR1csAdditionConstraint(settings, lcC);
		else if (lctA === LINEAR_COMBINATION_CONSTANT) {
			/* c8 ignore start */
			const lcCC = this.joinLinearCombinations(lcB, lcC, lcA[0]);
			return this.processR1csAdditionConstraint(settings, lcCC);
		} else if (lctB === LINEAR_COMBINATION_CONSTANT) {
			const lcCC = this.joinLinearCombinations(lcA, lcC, lcB[0]);
			return this.processR1csAdditionConstraint(settings, lcCC);
		} else return this.processR1csMultiplicationConstraint(settings, lcA, lcB, lcC);
	}
	getLinearCombinationType(linCom) {
		let k = this.Fr.zero;
		let n = 0;
		const ss = Object.keys(linCom);
		for (let i = 0; i < ss.length; i++)
 /* c8 ignore start */
		if (linCom[ss[i]] == 0n) delete linCom[ss[i]];
		else if (ss[i] == 0) k = this.Fr.add(k, linCom[ss[i]]);
		else n++;
		if (n > 0) return LINEAR_COMBINATION_VARIABLE;
		/* c8 ignore next */
		if (!this.Fr.isZero(k)) return LINEAR_COMBINATION_CONSTANT;
		return LINEAR_COMBINATION_NULLABLE;
	}
	normalizeLinearCombination(linCom) {
		const signalIds = Object.keys(linCom);
		for (let i = 0; i < signalIds.length; i++)
 /* c8 ignore next */
		if (this.Fr.isZero(linCom[signalIds[i]])) delete linCom[signalIds[i]];
		return linCom;
	}
	joinLinearCombinations(linCom1, linCom2, k) {
		const res = {};
		for (let s in linCom1) if (typeof res[s] == "undefined") res[s] = this.Fr.mul(k, linCom1[s]);
		else res[s] = this.Fr.add(res[s], this.Fr.mul(k, linCom1[s]));
		for (let s in linCom2) {
			const val = this.Fr.neg(linCom2[s]);
			if (typeof res[s] == "undefined") res[s] = val;
			else res[s] = this.Fr.add(res[s], val);
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
		for (let signalId in linCom) if (signalId == 0) res.k = this.Fr.add(res.k, linCom[signalId]);
		else if (linCom[signalId] != 0n) cs.push([Number(signalId), linCom[signalId]]);
		while (cs.length > maxC) {
			const c1 = cs.shift();
			const c2 = cs.shift();
			const so = settings.nVars++;
			const constraints = this.fnGetAdditionConstraint(c1[0], c2[0], so, this.Fr.neg(c1[1]), this.Fr.neg(c2[1]), this.Fr.zero, this.Fr.one, this.Fr.zero);
			constraintsArr.push(constraints);
			additionsArr.push([
				c1[0],
				c2[0],
				c1[1],
				c2[1]
			]);
			cs.push([so, this.Fr.one]);
		}
		for (let i = 0; i < cs.length; i++) {
			res.signals[i] = cs[i][0];
			res.coefs[i] = cs[i][1];
		}
		/* c8 ignore start */
		while (res.coefs.length < maxC) {
			res.signals.push(0);
			res.coefs.push(this.Fr.zero);
		}
		/* c8 ignore stop */
		return res;
	}
	processR1csAdditionConstraint(settings, linCom) {
		const constraintsArr = [];
		const additionsArr = [];
		const C = this.reduceCoefs(settings, constraintsArr, additionsArr, linCom, 3);
		const constraints = this.fnGetAdditionConstraint(C.signals[0], C.signals[1], C.signals[2], C.coefs[0], C.coefs[1], this.Fr.zero, C.coefs[2], C.k);
		constraintsArr.push(constraints);
		return [constraintsArr, additionsArr];
	}
	processR1csMultiplicationConstraint(settings, lcA, lcB, lcC) {
		const constraintsArr = [];
		const additionsArr = [];
		const A = this.reduceCoefs(settings, constraintsArr, additionsArr, lcA, 1);
		const B = this.reduceCoefs(settings, constraintsArr, additionsArr, lcB, 1);
		const C = this.reduceCoefs(settings, constraintsArr, additionsArr, lcC, 1);
		const constraints = this.fnGetMultiplicationConstraint(A.signals[0], B.signals[0], C.signals[0], this.Fr.mul(A.coefs[0], B.k), this.Fr.mul(A.k, B.coefs[0]), this.Fr.mul(A.coefs[0], B.coefs[0]), this.Fr.neg(C.coefs[0]), this.Fr.sub(this.Fr.mul(A.k, B.k), C.k));
		constraintsArr.push(constraints);
		return [constraintsArr, additionsArr];
	}
};
//#endregion
//#region src/polynomial/cpolynomial.js
var CPolynomial = class {
	constructor(n, curve, logger) {
		this.n = n;
		this.polynomials = Array(n).fill(void 0);
		this.curve = curve;
		this.Fr = curve.Fr;
		this.G1 = curve.G1;
		this.logger = logger;
	}
	addPolynomial(position, polynomial) {
		if (position > this.n - 1) throw new Error("CPolynomial:addPolynomial, cannot add a polynomial to a position greater than n-1");
		this.polynomials[position] = polynomial;
	}
	degree() {
		let degrees = this.polynomials.map((polynomial, index) => polynomial === void 0 ? 0 : polynomial.degree() * this.n + index);
		return Math.max(...degrees);
	}
	getPolynomial() {
		let degrees = this.polynomials.map((polynomial) => polynomial === void 0 ? 0 : polynomial.degree());
		const maxDegree = this.degree();
		const lengthBuffer = 2 ** (log2(maxDegree - 1) + 1);
		const sFr = this.Fr.n8;
		let polynomial = new Polynomial(new ffjavascript.BigBuffer(lengthBuffer * sFr), this.curve, this.logger);
		for (let i = 0; i < maxDegree; i++) {
			const i_n8 = i * sFr;
			const i_sFr = i_n8 * this.n;
			for (let j = 0; j < this.n; j++) if (this.polynomials[j] !== void 0) {
				if (i <= degrees[j]) polynomial.coef.set(this.polynomials[j].coef.slice(i_n8, i_n8 + sFr), i_sFr + j * sFr);
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
};
//#endregion
//#region src/fflonk_setup.js
async function fflonkSetup$1(r1csFilename, ptauFilename, zkeyFilename, logger) {
	const fds = {};
	try {
		return await _fflonkSetup(r1csFilename, ptauFilename, zkeyFilename, logger, fds);
	} finally {
		for (const openFd of [
			fds.fdPTau,
			fds.fdR1cs,
			fds.fdZKey
		]) try {
			if (openFd) await openFd.close();
		} catch (e) {}
	}
}
async function _fflonkSetup(r1csFilename, ptauFilename, zkeyFilename, logger, fds) {
	if (logger) logger.info("FFLONK SETUP STARTED");
	if (globalThis.gc) globalThis.gc();
	if (logger) logger.info("> Reading PTau file");
	const { fd: fdPTau, sections: pTauSections } = await (0, _iden3_binfileutils.readBinFile)(ptauFilename, "ptau", 1, 1 << 22, 1 << 24);
	fds.fdPTau = fdPTau;
	if (!pTauSections[12]) throw new Error("Powers of Tau is not well prepared. Section 12 missing.");
	if (logger) logger.info("> Getting curve from PTau settings");
	const { curve } = await readPTauHeader(fdPTau, pTauSections);
	if (logger) logger.info("> Reading r1cs file");
	const { fd: fdR1cs, sections: sectionsR1cs } = await (0, _iden3_binfileutils.readBinFile)(r1csFilename, "r1cs", 1, 1 << 22, 1 << 24);
	fds.fdR1cs = fdR1cs;
	const r1cs = await (0, r1csfile.readR1csFd)(fdR1cs, sectionsR1cs, {
		loadConstraints: false,
		loadCustomGates: true
	});
	if (r1cs.prime !== curve.r) throw new Error("r1cs curve does not match powers of tau ceremony curve");
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
	let plonkConstraints = new BigArray();
	let plonkAdditions = new BigArray();
	if (logger) logger.info("> Processing FFlonk constraints");
	await computeFFConstraints(curve.Fr, r1cs, logger);
	if (globalThis.gc) globalThis.gc();
	settings.nConstraints = plonkConstraints.length;
	settings.nAdditions = plonkAdditions.length;
	settings.cirPower = Math.max(3, log2(plonkConstraints.length + 2 - 1) + 1);
	settings.domainSize = 2 ** settings.cirPower;
	if (pTauSections[2][0].size < (settings.domainSize * 9 + 18) * sG1) throw new Error("Powers of Tau is not big enough for this circuit size. Section 2 too small.");
	/* c8 ignore start */
	if (pTauSections[3][0].size < sG2) throw new Error("Powers of Tau is not well prepared. Section 3 too small.");
	/* c8 ignore stop */
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
	if (logger) logger.info("> computing k1 and k2");
	const [k1, k2] = computeK1K2();
	if (logger) logger.info("> computing w3");
	const w3 = computeW3();
	if (logger) logger.info("> computing w4");
	const w4 = computeW4();
	if (logger) logger.info("> computing w8");
	const w8 = computeW8();
	if (logger) logger.info("> computing wr");
	const wr = getOmegaCubicRoot(settings.cirPower, curve.Fr);
	await writeZkeyFile();
	await fdR1cs.close();
	await fdPTau.close();
	if (logger) logger.info("FFLONK SETUP FINISHED");
	return 0;
	async function computeFFConstraints(Fr, r1cs, logger) {
		for (let i = 0; i < settings.nPublic; i++) plonkConstraints.push(getFFlonkConstantConstraint(i + 1, Fr));
		const r1csProcessor = new r1csConstraintProcessor(Fr, getFFlonkConstantConstraint, getFFlonkAdditionConstraint, getFFlonkMultiplicationConstraint, logger);
		const bR1cs = await _iden3_binfileutils.readSection(fdR1cs, sectionsR1cs, 2);
		let bR1csPos = 0;
		for (let i = 0; i < r1cs.nConstraints; i++) {
			/* c8 ignore start */
			if (logger && i !== 0 && i % 5e5 === 0) logger.info(`    processing r1cs constraints ${i}/${r1cs.nConstraints}`);
			/* c8 ignore stop */
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
			const nIdx = new DataView(buffUL32.buffer).getUint32(0, true);
			const buff = bR1cs.slice(bR1csPos, bR1csPos + (4 + r1cs.n8) * nIdx);
			bR1csPos += (4 + r1cs.n8) * nIdx;
			const buffV = new DataView(buff.buffer);
			for (let i = 0; i < nIdx; i++) {
				const idx = buffV.getUint32(i * (4 + r1cs.n8), true);
				lc[idx] = r1cs.F.fromRprLE(buff, i * (4 + r1cs.n8) + 4);
			}
			return lc;
		}
		return 0;
	}
	async function writeZkeyFile() {
		if (logger) logger.info("> Writing the zkey file");
		const fdZKey = await (0, _iden3_binfileutils.createBinFile)(zkeyFilename, "zkey", 1, 17, 1 << 22, 1 << 24);
		fds.fdZKey = fdZKey;
		if (logger) logger.info(`··· Writing Section 1. Zkey Header`);
		await writeZkeyHeader(fdZKey);
		if (logger) logger.info(`··· Writing Section 3. Additions`);
		await writeAdditions(fdZKey);
		plonkAdditions = null;
		if (globalThis.gc) globalThis.gc();
		if (logger) logger.info(`··· Writing Section 4. A Map`);
		await writeWitnessMap(fdZKey, 4, 0, "A map");
		if (globalThis.gc) globalThis.gc();
		if (logger) logger.info(`··· Writing Section 5. B Map`);
		await writeWitnessMap(fdZKey, 5, 1, "B map");
		if (globalThis.gc) globalThis.gc();
		if (logger) logger.info(`··· Writing Section 6. C Map`);
		await writeWitnessMap(fdZKey, 6, 2, "C map");
		if (globalThis.gc) globalThis.gc();
		if (logger) logger.info(`··· Writing Section 7. QL`);
		await writeQMap(fdZKey, 7, 3, "QL");
		if (globalThis.gc) globalThis.gc();
		if (logger) logger.info(`··· Writing Section 8. QR`);
		await writeQMap(fdZKey, 8, 4, "QR");
		if (globalThis.gc) globalThis.gc();
		if (logger) logger.info(`··· Writing Section 9. QM`);
		await writeQMap(fdZKey, 9, 5, "QM");
		if (globalThis.gc) globalThis.gc();
		if (logger) logger.info(`··· Writing Section 10. QO`);
		await writeQMap(fdZKey, 10, 6, "QO");
		if (globalThis.gc) globalThis.gc();
		if (logger) logger.info(`··· Writing Section 11. QC`);
		await writeQMap(fdZKey, 11, 7, "QC");
		if (globalThis.gc) globalThis.gc();
		if (logger) logger.info(`··· Writing Sections 12,13,14. Sigma1, Sigma2 & Sigma 3`);
		await writeSigma(fdZKey);
		plonkConstraints = null;
		if (globalThis.gc) globalThis.gc();
		if (logger) logger.info(`··· Writing Section 15. Lagrange Polynomials`);
		await writeLagrangePolynomials(fdZKey);
		if (globalThis.gc) globalThis.gc();
		if (logger) logger.info(`··· Writing Section 16. Powers of Tau`);
		await writePtau(fdZKey);
		if (globalThis.gc) globalThis.gc();
		if (logger) logger.info(`··· Writing Section 17. C0`);
		await writeC0(fdZKey);
		if (globalThis.gc) globalThis.gc();
		if (logger) logger.info(`··· Writing Section 2. FFlonk Header`);
		await writeFFlonkHeader(fdZKey);
		if (globalThis.gc) globalThis.gc();
		if (logger) logger.info("> Writing the zkey file finished");
		await fdZKey.close();
	}
	async function writeZkeyHeader(fdZKey) {
		await (0, _iden3_binfileutils.startWriteSection)(fdZKey, 1);
		await fdZKey.writeULE32(10);
		await (0, _iden3_binfileutils.endWriteSection)(fdZKey);
	}
	async function writeAdditions(fdZKey) {
		await (0, _iden3_binfileutils.startWriteSection)(fdZKey, 3);
		const buffOut = new Uint8Array(8 + 2 * sFr);
		const buffOutV = new DataView(buffOut.buffer);
		for (let i = 0; i < plonkAdditions.length; i++) {
			/* c8 ignore start */
			if (logger && i !== 0 && i % 5e5 === 0) logger.info(`      writing Additions: ${i}/${plonkAdditions.length}`);
			/* c8 ignore stop */
			const addition = plonkAdditions[i];
			buffOutV.setUint32(0, addition[0], true);
			buffOutV.setUint32(4, addition[1], true);
			buffOut.set(addition[2], 8);
			buffOut.set(addition[3], 8 + sFr);
			await fdZKey.write(buffOut);
		}
		await (0, _iden3_binfileutils.endWriteSection)(fdZKey);
	}
	async function writeWitnessMap(fdZKey, sectionNum, posConstraint, name) {
		await (0, _iden3_binfileutils.startWriteSection)(fdZKey, sectionNum);
		for (let i = 0; i < plonkConstraints.length; i++) {
			/* c8 ignore start */
			if (logger && i !== 0 && i % 5e5 === 0) logger.info(`      writing witness ${name}: ${i}/${plonkConstraints.length}`);
			/* c8 ignore stop */
			await fdZKey.writeULE32(plonkConstraints[i][posConstraint]);
		}
		await (0, _iden3_binfileutils.endWriteSection)(fdZKey);
	}
	async function writeQMap(fdZKey, sectionNum, posConstraint, name) {
		let Q = new ffjavascript.BigBuffer(settings.domainSize * sFr);
		for (let i = 0; i < plonkConstraints.length; i++) {
			Q.set(plonkConstraints[i][posConstraint], i * sFr);
			/* c8 ignore start */
			if (logger && i !== 0 && i % 5e5 === 0) logger.info(`      writing ${name}: ${i}/${plonkConstraints.length}`);
		}
		polynomials[name] = await Polynomial.fromEvaluations(Q, curve, logger);
		Q = null;
		evaluations[name] = await Evaluations.fromPolynomial(polynomials[name], 4, curve, logger);
		await (0, _iden3_binfileutils.startWriteSection)(fdZKey, sectionNum);
		await fdZKey.write(polynomials[name].coef);
		await fdZKey.write(evaluations[name].eval);
		await (0, _iden3_binfileutils.endWriteSection)(fdZKey);
		delete evaluations[name];
	}
	async function writeSigma(fdZKey) {
		let sigma = new ffjavascript.BigBuffer(sFr * settings.domainSize * 3);
		let lastSeen = new BigArray(settings.nVars);
		let firstPos = new BigArray(settings.nVars);
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
			/* c8 ignore start */
			if (logger && i !== 0 && i % 5e5 === 0) logger.info(`      writing sigma phase1: ${i}/${plonkConstraints.length}`);
		}
		for (let i = 0; i < settings.nVars; i++) {
			if (typeof firstPos[i] !== "undefined") sigma.set(lastSeen[i], firstPos[i] * sFr);
			else
 /* c8 ignore start */
			console.log("Variable not used");
			/* c8 ignore start */
			if (logger && i !== 0 && i % 5e5 === 0) logger.info(`      writing sigma phase2: ${i}/${settings.nVars}`);
		}
		lastSeen = null;
		firstPos = null;
		if (globalThis.gc) globalThis.gc();
		for (let i = 0; i < 3; i++) {
			const sectionId = 0 === i ? 12 : 1 === i ? 13 : 14;
			let name = "S" + (i + 1);
			polynomials[name] = await Polynomial.fromEvaluations(sigma.slice(settings.domainSize * sFr * i, settings.domainSize * sFr * (i + 1)), curve, logger);
			if (2 === i) sigma = null;
			evaluations[name] = await Evaluations.fromPolynomial(polynomials[name], 4, curve, logger);
			await (0, _iden3_binfileutils.startWriteSection)(fdZKey, sectionId);
			await fdZKey.write(polynomials[name].coef);
			await fdZKey.write(evaluations[name].eval);
			await (0, _iden3_binfileutils.endWriteSection)(fdZKey);
			delete evaluations[name];
			if (globalThis.gc) globalThis.gc();
		}
		return 0;
		function buildSigma(signalId, idx) {
			if (typeof lastSeen[signalId] === "undefined") firstPos[signalId] = idx;
			else sigma.set(lastSeen[signalId], idx * sFr);
			let v;
			if (idx < settings.domainSize) v = w;
			else if (idx < 2 * settings.domainSize) v = Fr.mul(w, k1);
			else v = Fr.mul(w, k2);
			lastSeen[signalId] = v;
		}
	}
	async function writeLagrangePolynomials(fdZKey) {
		await (0, _iden3_binfileutils.startWriteSection)(fdZKey, 15);
		const l = Math.max(settings.nPublic, 1);
		for (let i = 0; i < l; i++) {
			let buff = new ffjavascript.BigBuffer(settings.domainSize * sFr);
			buff.set(Fr.one, i * sFr);
			await writeP4(fdZKey, buff);
		}
		await (0, _iden3_binfileutils.endWriteSection)(fdZKey);
	}
	async function writePtau(fdZKey) {
		await (0, _iden3_binfileutils.startWriteSection)(fdZKey, 16);
		PTau = new ffjavascript.BigBuffer((settings.domainSize * 9 + 18) * sG1);
		await fdPTau.readToBuffer(PTau, 0, (settings.domainSize * 9 + 18) * sG1, pTauSections[2][0].p);
		await fdZKey.write(PTau);
		await (0, _iden3_binfileutils.endWriteSection)(fdZKey);
	}
	async function writeC0(fdZKey) {
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
		C0 = null;
		delete polynomials.QL;
		delete polynomials.QR;
		delete polynomials.QO;
		delete polynomials.QM;
		delete polynomials.QC;
		delete polynomials.S1;
		delete polynomials.S2;
		delete polynomials.S3;
		if (globalThis.gc) globalThis.gc();
		/* c8 ignore start */
		if (polynomials.C0.degree() >= 8 * settings.domainSize) throw new Error("C0 Polynomial is not well calculated");
		/* c8 ignore stop */
		await (0, _iden3_binfileutils.startWriteSection)(fdZKey, 17);
		await fdZKey.write(polynomials.C0.coef);
		await (0, _iden3_binfileutils.endWriteSection)(fdZKey);
	}
	async function writeFFlonkHeader(fdZKey) {
		await (0, _iden3_binfileutils.startWriteSection)(fdZKey, 2);
		const primeQ = curve.q;
		const n8q = (Math.floor((ffjavascript.Scalar.bitLength(primeQ) - 1) / 64) + 1) * 8;
		await fdZKey.writeULE32(n8q);
		await (0, _iden3_binfileutils.writeBigInt)(fdZKey, primeQ, n8q);
		const primeR = curve.r;
		const n8r = (Math.floor((ffjavascript.Scalar.bitLength(primeR) - 1) / 64) + 1) * 8;
		await fdZKey.writeULE32(n8r);
		await (0, _iden3_binfileutils.writeBigInt)(fdZKey, primeR, n8r);
		await fdZKey.writeULE32(settings.nVars);
		await fdZKey.writeULE32(settings.nPublic);
		await fdZKey.writeULE32(settings.domainSize);
		await fdZKey.writeULE32(settings.nAdditions);
		await fdZKey.writeULE32(settings.nConstraints);
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
		delete polynomials.C0;
		PTau = null;
		await fdZKey.write(commitC0);
		await (0, _iden3_binfileutils.endWriteSection)(fdZKey);
	}
	async function writeP4(fdZKey, buff) {
		const [coefficients, evaluations4] = await Polynomial.to4T(buff, settings.domainSize, [], Fr);
		await fdZKey.write(coefficients);
		await fdZKey.write(evaluations4);
		return [coefficients, evaluations4];
	}
	function computeK1K2() {
		let k1 = Fr.two;
		/* c8 ignore start */
		while (isIncluded(k1, [], settings.cirPower)) Fr.add(k1, Fr.one);
		/* c8 ignore stop */
		let k2 = Fr.add(k1, Fr.one);
		/* c8 ignore start */
		while (isIncluded(k2, [k1], settings.cirPower)) Fr.add(k2, Fr.one);
		/* c8 ignore stop */
		return [k1, k2];
		function isIncluded(k, kArr, pow) {
			const domainSize = 2 ** pow;
			let w = Fr.one;
			for (let i = 0; i < domainSize; i++) {
				/* c8 ignore start */
				if (Fr.eq(k, w)) return true;
				/* c8 ignore stop */
				for (let j = 0; j < kArr.length; j++)
 /* c8 ignore start */
				if (Fr.eq(k, Fr.mul(kArr[j], w))) return true;
				w = Fr.mul(w, Fr.w[pow]);
			}
			return false;
		}
	}
	function computeW3() {
		let generator = Fr.e(31624);
		let exponent = ffjavascript.Scalar.div(3648040478639879203707734290876212514758060733402672390616367364429301415936n, ffjavascript.Scalar.e(3));
		return Fr.exp(generator, exponent);
	}
	function computeW4() {
		return Fr.w[2];
	}
	function computeW8() {
		return Fr.w[3];
	}
	function getOmegaCubicRoot(power, Fr) {
		const firstRoot = Fr.e(467799165886069610036046866799264026481344299079011762026774533774345988080n);
		return Fr.exp(firstRoot, 2 ** (28 - power));
	}
}
//#endregion
//#region src/fflonk_prove.js
var { stringifyBigInts: stringifyBigInts$1 } = ffjavascript.utils;
async function fflonkProve$1(zkeyFileName, witnessFileName, logger, options) {
	const fds = {};
	try {
		return await _fflonkProve(zkeyFileName, witnessFileName, logger, options, fds);
	} finally {
		for (const openFd of [fds.fdWtns, fds.fdZKey]) try {
			if (openFd) await openFd.close();
		} catch (e) {}
	}
}
async function _fflonkProve(zkeyFileName, witnessFileName, logger, options, fds) {
	if (logger) logger.info("FFLONK PROVER STARTED");
	if (logger) logger.info("> Reading witness file");
	const { fd: fdWtns, sections: wtnsSections } = await _iden3_binfileutils.readBinFile(witnessFileName, "wtns", 2, 1 << 25, 1 << 23);
	fds.fdWtns = fdWtns;
	const wtns = await readHeader(fdWtns, wtnsSections);
	if (logger) logger.info("> Reading zkey file");
	const { fd: fdZKey, sections: zkeySections } = await _iden3_binfileutils.readBinFile(zkeyFileName, "zkey", 2, 1 << 25, 1 << 23);
	fds.fdZKey = fdZKey;
	const zkey = await readHeader$1(fdZKey, zkeySections, void 0, options);
	if (zkey.protocolId !== 10) throw new Error("zkey file is not fflonk");
	if (!ffjavascript.Scalar.eq(zkey.r, wtns.q)) throw new Error("Curve of the witness does not match the curve of the proving key");
	if (wtns.nWitness !== zkey.nVars - zkey.nAdditions) throw new Error(`Invalid witness length. Circuit: ${zkey.nVars}, witness: ${wtns.nWitness}, ${zkey.nAdditions}`);
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
	if (logger) logger.info("> Reading witness file data");
	const buffWitness = await _iden3_binfileutils.readSection(fdWtns, wtnsSections, 2);
	await fdWtns.close();
	buffWitness.set(Fr.zero, 0);
	let buffInternalWitness = new ffjavascript.BigBuffer(zkey.nAdditions * sFr);
	let buffers = {};
	let polynomials = {};
	let evaluations = {};
	let toInverse = {};
	let challenges = {};
	let roots = {};
	let proof = new Proof(curve, logger);
	if (logger) logger.info(`> Reading Section 3. Additions`);
	await calculateAdditions();
	if (logger) logger.info(`> Reading Sections 12,13,14. Sigma1, Sigma2 & Sigma 3`);
	if (logger) logger.info("··· Reading Sigma polynomials ");
	polynomials.Sigma1 = new Polynomial(new ffjavascript.BigBuffer(sDomain), curve, logger);
	polynomials.Sigma2 = new Polynomial(new ffjavascript.BigBuffer(sDomain), curve, logger);
	polynomials.Sigma3 = new Polynomial(new ffjavascript.BigBuffer(sDomain), curve, logger);
	await fdZKey.readToBuffer(polynomials.Sigma1.coef, 0, sDomain, zkeySections[12][0].p);
	await fdZKey.readToBuffer(polynomials.Sigma2.coef, 0, sDomain, zkeySections[13][0].p);
	await fdZKey.readToBuffer(polynomials.Sigma3.coef, 0, sDomain, zkeySections[14][0].p);
	if (logger) logger.info("··· Reading Sigma evaluations");
	evaluations.Sigma1 = new Evaluations(new ffjavascript.BigBuffer(sDomain * 4), curve, logger);
	evaluations.Sigma2 = new Evaluations(new ffjavascript.BigBuffer(sDomain * 4), curve, logger);
	evaluations.Sigma3 = new Evaluations(new ffjavascript.BigBuffer(sDomain * 4), curve, logger);
	await fdZKey.readToBuffer(evaluations.Sigma1.eval, 0, sDomain * 4, zkeySections[12][0].p + sDomain);
	await fdZKey.readToBuffer(evaluations.Sigma2.eval, 0, sDomain * 4, zkeySections[13][0].p + sDomain);
	await fdZKey.readToBuffer(evaluations.Sigma3.eval, 0, sDomain * 4, zkeySections[14][0].p + sDomain);
	if (logger) logger.info(`> Reading Section 16. Powers of Tau`);
	const PTau = new ffjavascript.BigBuffer(zkey.domainSize * 16 * sG1);
	await fdZKey.readToBuffer(PTau, 0, (zkey.domainSize * 9 + 18) * sG1, zkeySections[16][0].p);
	if (globalThis.gc) globalThis.gc();
	if (logger) logger.info("");
	if (logger) logger.info("> ROUND 1");
	await round1();
	if (globalThis.gc) globalThis.gc();
	if (logger) logger.info("> ROUND 2");
	await round2();
	if (globalThis.gc) globalThis.gc();
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
	if (logger) logger.info("> ROUND 4");
	await round4();
	if (globalThis.gc) globalThis.gc();
	if (logger) logger.info("> ROUND 5");
	await round5();
	delete polynomials.R1;
	delete polynomials.R2;
	delete polynomials.L;
	delete polynomials.ZT;
	delete polynomials.ZTS2;
	await fdZKey.close();
	if (globalThis.gc) globalThis.gc();
	proof.addEvaluation("inv", getMontgomeryBatchedInverse());
	let _proof = proof.toObjectProof();
	_proof.protocol = "fflonk";
	_proof.curve = curve.name;
	let publicSignals = [];
	for (let i = 1; i <= zkey.nPublic; i++) {
		const i_sFr = i * sFr;
		const pub = buffWitness.slice(i_sFr, i_sFr + sFr);
		publicSignals.push(ffjavascript.Scalar.fromRprLE(pub));
	}
	if (logger) logger.info("FFLONK PROVER FINISHED");
	return {
		proof: stringifyBigInts$1(_proof),
		publicSignals: stringifyBigInts$1(publicSignals)
	};
	async function calculateAdditions() {
		if (logger) logger.info("··· Computing additions");
		const additionsBuff = await _iden3_binfileutils.readSection(fdZKey, zkeySections, 3);
		const sSum = 8 + sFr * 2;
		for (let i = 0; i < zkey.nAdditions; i++) {
			/* c8 ignore start */
			if (logger && 0 !== i && i % 1e5 === 0) logger.info(`    addition ${i}/${zkey.nAdditions}`);
			/* c8 ignore stop */
			let offset = i * sSum;
			const signalId1 = readUInt32(additionsBuff, offset);
			offset += 4;
			const signalId2 = readUInt32(additionsBuff, offset);
			offset += 4;
			const factor1 = additionsBuff.slice(offset, offset + sFr);
			offset += sFr;
			const factor2 = additionsBuff.slice(offset, offset + sFr);
			const witness1 = getWitness(signalId1);
			const witness2 = getWitness(signalId2);
			const result = Fr.add(Fr.mul(factor1, witness1), Fr.mul(factor2, witness2));
			buffInternalWitness.set(result, sFr * i);
		}
	}
	function readUInt32(b, o) {
		const buff = b.slice(o, o + 4);
		return new DataView(buff.buffer, buff.byteOffset, buff.byteLength).getUint32(0, true);
	}
	function getWitness(idx) {
		let diff = zkey.nVars - zkey.nAdditions;
		if (idx < diff) return buffWitness.slice(idx * sFr, idx * sFr + sFr);
		else if (idx < zkey.nVars) {
			const offset = (idx - diff) * sFr;
			return buffInternalWitness.slice(offset, offset + sFr);
		}
		/* c8 ignore start */
		/* c8 ignore stop */
		return Fr.zero;
	}
	async function round1() {
		challenges.b = [];
		for (let i = 1; i <= 9; i++) challenges.b[i] = Fr.random();
		if (logger) logger.info("> Computing A, B, C wire polynomials");
		await computeWirePolynomials();
		if (logger) logger.info("> Computing T0 polynomial");
		await computeT0();
		if (logger) logger.info("> Computing C1 polynomial");
		await computeC1();
		if (logger) logger.info("> Computing C1 multi exponentiation");
		let commitC1 = await polynomials.C1.multiExponentiation(PTau, "C1");
		proof.addPolynomial("C1", commitC1);
		return 0;
		async function computeWirePolynomials() {
			if (logger) logger.info("··· Reading data from zkey file");
			buffers.A = new ffjavascript.BigBuffer(sDomain);
			buffers.B = new ffjavascript.BigBuffer(sDomain);
			buffers.C = new ffjavascript.BigBuffer(sDomain);
			let aMapBuff = await _iden3_binfileutils.readSection(fdZKey, zkeySections, 4);
			let bMapBuff = await _iden3_binfileutils.readSection(fdZKey, zkeySections, 5);
			let cMapBuff = await _iden3_binfileutils.readSection(fdZKey, zkeySections, 6);
			for (let i = 0; i < zkey.nConstraints; i++) {
				const i_sFr = i * sFr;
				const offset = i * 4;
				const signalIdA = readUInt32(aMapBuff, offset);
				buffers.A.set(getWitness(signalIdA), i_sFr);
				const signalIdB = readUInt32(bMapBuff, offset);
				buffers.B.set(getWitness(signalIdB), i_sFr);
				const signalIdC = readUInt32(cMapBuff, offset);
				buffers.C.set(getWitness(signalIdC), i_sFr);
			}
			aMapBuff = null;
			bMapBuff = null;
			cMapBuff = null;
			buffInternalWitness = null;
			buffers.A.set(challenges.b[1], sDomain - 64);
			buffers.A.set(challenges.b[2], sDomain - 32);
			buffers.B.set(challenges.b[3], sDomain - 64);
			buffers.B.set(challenges.b[4], sDomain - 32);
			buffers.C.set(challenges.b[5], sDomain - 64);
			buffers.C.set(challenges.b[6], sDomain - 32);
			buffers.A = await Fr.batchToMontgomery(buffers.A);
			buffers.B = await Fr.batchToMontgomery(buffers.B);
			buffers.C = await Fr.batchToMontgomery(buffers.C);
			if (logger) logger.info("··· Computing A ifft");
			polynomials.A = await Polynomial.fromEvaluations(buffers.A, curve, logger);
			if (logger) logger.info("··· Computing B ifft");
			polynomials.B = await Polynomial.fromEvaluations(buffers.B, curve, logger);
			if (logger) logger.info("··· Computing C ifft");
			polynomials.C = await Polynomial.fromEvaluations(buffers.C, curve, logger);
			if (logger) logger.info("··· Computing A fft");
			evaluations.A = await Evaluations.fromPolynomial(polynomials.A, 4, curve, logger);
			if (logger) logger.info("··· Computing B fft");
			evaluations.B = await Evaluations.fromPolynomial(polynomials.B, 4, curve, logger);
			if (logger) logger.info("··· Computing C fft");
			evaluations.C = await Evaluations.fromPolynomial(polynomials.C, 4, curve, logger);
			/* c8 ignore start */
			if (polynomials.A.degree() >= zkey.domainSize) throw new Error("A Polynomial is not well calculated");
			/* c8 ignore stop */
			/* c8 ignore start */
			if (polynomials.B.degree() >= zkey.domainSize) throw new Error("B Polynomial is not well calculated");
			/* c8 ignore stop */
			/* c8 ignore start */
			if (polynomials.C.degree() >= zkey.domainSize) throw new Error("C Polynomial is not well calculated");
			/* c8 ignore stop */
		}
		async function computeT0() {
			if (logger) logger.info(`··· Reading sections 7, 8, 9, 10, 11. Q selectors`);
			evaluations.QL = new Evaluations(new ffjavascript.BigBuffer(sDomain * 4), curve, logger);
			evaluations.QR = new Evaluations(new ffjavascript.BigBuffer(sDomain * 4), curve, logger);
			evaluations.QM = new Evaluations(new ffjavascript.BigBuffer(sDomain * 4), curve, logger);
			evaluations.QO = new Evaluations(new ffjavascript.BigBuffer(sDomain * 4), curve, logger);
			evaluations.QC = new Evaluations(new ffjavascript.BigBuffer(sDomain * 4), curve, logger);
			await fdZKey.readToBuffer(evaluations.QL.eval, 0, sDomain * 4, zkeySections[7][0].p + sDomain);
			await fdZKey.readToBuffer(evaluations.QR.eval, 0, sDomain * 4, zkeySections[8][0].p + sDomain);
			await fdZKey.readToBuffer(evaluations.QM.eval, 0, sDomain * 4, zkeySections[9][0].p + sDomain);
			await fdZKey.readToBuffer(evaluations.QO.eval, 0, sDomain * 4, zkeySections[10][0].p + sDomain);
			await fdZKey.readToBuffer(evaluations.QC.eval, 0, sDomain * 4, zkeySections[11][0].p + sDomain);
			const lagrangePolynomials = await _iden3_binfileutils.readSection(fdZKey, zkeySections, 15);
			evaluations.lagrange1 = new Evaluations(lagrangePolynomials, curve, logger);
			buffers.T0 = new ffjavascript.BigBuffer(sDomain * 4);
			if (logger) logger.info("··· Computing T0 evaluations");
			for (let i = 0; i < zkey.domainSize * 4; i++) {
				/* c8 ignore start */
				if (logger && 0 !== i && i % 1e5 === 0) logger.info(`      T0 evaluation ${i}/${zkey.domainSize * 4}`);
				/* c8 ignore stop */
				const a = evaluations.A.getEvaluation(i);
				const b = evaluations.B.getEvaluation(i);
				const c = evaluations.C.getEvaluation(i);
				const ql = evaluations.QL.getEvaluation(i);
				const qr = evaluations.QR.getEvaluation(i);
				const qm = evaluations.QM.getEvaluation(i);
				const qo = evaluations.QO.getEvaluation(i);
				const qc = evaluations.QC.getEvaluation(i);
				let pi = Fr.zero;
				for (let j = 0; j < zkey.nPublic; j++) {
					const offset = j * 5 * zkey.domainSize + zkey.domainSize + i;
					const lPol = evaluations.lagrange1.getEvaluation(offset);
					const aVal = buffers.A.slice(j * sFr, (j + 1) * sFr);
					pi = Fr.sub(pi, Fr.mul(lPol, aVal));
				}
				const e1 = Fr.mul(a, ql);
				const e2 = Fr.mul(b, qr);
				const e3 = Fr.mul(Fr.mul(a, b), qm);
				const e4 = Fr.mul(c, qo);
				const t0 = Fr.add(e1, Fr.add(e2, Fr.add(e3, Fr.add(e4, Fr.add(qc, pi)))));
				buffers.T0.set(t0, i * sFr);
			}
			delete evaluations.QL;
			delete evaluations.QR;
			delete evaluations.QM;
			delete evaluations.QO;
			delete evaluations.QC;
			if (globalThis.gc) globalThis.gc();
			if (logger) logger.info("buffer T0: " + buffers.T0.byteLength / sFr);
			if (logger) logger.info("··· Computing T0 ifft");
			polynomials.T0 = await Polynomial.fromEvaluations(buffers.T0, curve, logger);
			if (logger) logger.info("T0 length: " + polynomials.T0.length());
			if (logger) logger.info("T0 degree: " + polynomials.T0.degree());
			if (logger) logger.info("··· Computing T0 / ZH");
			polynomials.T0.divByZerofier(zkey.domainSize, Fr.one);
			/* c8 ignore start */
			if (polynomials.T0.degree() >= 2 * zkey.domainSize - 2) throw new Error(`T0 Polynomial is not well calculated (degree is ${polynomials.T0.degree()} and must be less than ${2 * zkey.domainSize + 2}`);
			/* c8 ignore stop */
			delete buffers.T0;
		}
		async function computeC1() {
			let C1 = new CPolynomial(4, curve, logger);
			C1.addPolynomial(0, polynomials.A);
			C1.addPolynomial(1, polynomials.B);
			C1.addPolynomial(2, polynomials.C);
			C1.addPolynomial(3, polynomials.T0);
			polynomials.C1 = C1.getPolynomial();
			C1 = null;
			delete polynomials.T0;
			if (globalThis.gc) globalThis.gc();
			/* c8 ignore start */
			if (polynomials.C1.degree() >= 8 * zkey.domainSize - 8) throw new Error("C1 Polynomial is not well calculated");
			/* c8 ignore stop */
		}
	}
	async function round2() {
		if (logger) logger.info("> Computing challenges beta and gamma");
		const transcript = new Keccak256Transcript(curve);
		transcript.addPolCommitment(zkey.C0);
		for (let i = 0; i < zkey.nPublic; i++) transcript.addScalar(buffers.A.slice(i * sFr, i * sFr + sFr));
		transcript.addPolCommitment(proof.getPolynomial("C1"));
		challenges.beta = transcript.getChallenge();
		if (logger) logger.info("··· challenges.beta: " + Fr.toString(challenges.beta));
		transcript.reset();
		transcript.addScalar(challenges.beta);
		challenges.gamma = transcript.getChallenge();
		if (logger) logger.info("··· challenges.gamma: " + Fr.toString(challenges.gamma));
		if (logger) logger.info("> Computing Z polynomial");
		await computeZ();
		if (logger) logger.info("> Computing T1 polynomial");
		await computeT1();
		if (logger) logger.info("> Computing T2 polynomial");
		await computeT2();
		if (logger) logger.info("> Computing C2 polynomial");
		await computeC2();
		if (logger) logger.info("> Computing C2 multi exponentiation");
		let commitC2 = await polynomials.C2.multiExponentiation(PTau, "C2");
		proof.addPolynomial("C2", commitC2);
		return 0;
		async function computeZ() {
			if (logger) logger.info("··· Computing Z evaluations");
			let numArr = new ffjavascript.BigBuffer(sDomain);
			let denArr = new ffjavascript.BigBuffer(sDomain);
			numArr.set(Fr.one, 0);
			denArr.set(Fr.one, 0);
			let w = Fr.one;
			for (let i = 0; i < zkey.domainSize; i++) {
				/* c8 ignore start */
				if (logger && 0 !== i && i % 1e5 === 0) logger.info(`    Z evaluation ${i}/${zkey.domainSize}`);
				/* c8 ignore stop */
				const i_sFr = i * sFr;
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
				num = Fr.mul(numArr.slice(i_sFr, i_sFr + sFr), num);
				numArr.set(num, (i + 1) % zkey.domainSize * sFr);
				den = Fr.mul(denArr.slice(i_sFr, i_sFr + sFr), den);
				denArr.set(den, (i + 1) % zkey.domainSize * sFr);
				w = Fr.mul(w, Fr.w[zkey.power]);
			}
			denArr = await Fr.batchInverse(denArr);
			for (let i = 0; i < zkey.domainSize; i++) {
				const i_sFr = i * sFr;
				const z = Fr.mul(numArr.slice(i_sFr, i_sFr + sFr), denArr.slice(i_sFr, i_sFr + sFr));
				numArr.set(z, i_sFr);
			}
			buffers.Z = numArr;
			/* c8 ignore start */
			if (!Fr.eq(numArr.slice(0, sFr), Fr.one)) throw new Error("Copy constraints does not match");
			/* c8 ignore stop */
			if (logger) logger.info("··· Computing Z ifft");
			polynomials.Z = await Polynomial.fromEvaluations(buffers.Z, curve, logger);
			if (logger) logger.info("··· Computing Z fft");
			evaluations.Z = await Evaluations.fromPolynomial(polynomials.Z, 4, curve, logger);
			polynomials.Z.blindCoefficients([
				challenges.b[9],
				challenges.b[8],
				challenges.b[7]
			]);
			/* c8 ignore start */
			if (polynomials.Z.degree() >= zkey.domainSize + 3) throw new Error("Z Polynomial is not well calculated");
			/* c8 ignore stop */
			delete buffers.Z;
			delete buffers.A;
			delete buffers.B;
			delete buffers.C;
			if (globalThis.gc) globalThis.gc();
		}
		async function computeT1() {
			if (logger) logger.info("··· Computing T1 evaluations");
			buffers.T1 = new ffjavascript.BigBuffer(sDomain * 2);
			buffers.T1z = new ffjavascript.BigBuffer(sDomain * 2);
			let omega = Fr.one;
			for (let i = 0; i < zkey.domainSize * 2; i++) {
				/* c8 ignore start */
				if (logger && 0 !== i && i % 1e5 === 0) logger.info(`    T1 evaluation ${i}/${zkey.domainSize * 4}`);
				/* c8 ignore stop */
				const omega2 = Fr.square(omega);
				const z = evaluations.Z.getEvaluation(i * 2);
				const zp = Fr.add(Fr.add(Fr.mul(challenges.b[7], omega2), Fr.mul(challenges.b[8], omega)), challenges.b[9]);
				const lagrange1 = evaluations.lagrange1.getEvaluation(zkey.domainSize + i * 2);
				let t1 = Fr.mul(Fr.sub(z, Fr.one), lagrange1);
				let t1z = Fr.mul(zp, lagrange1);
				buffers.T1.set(t1, i * sFr);
				buffers.T1z.set(t1z, i * sFr);
				omega = Fr.mul(omega, Fr.w[zkey.power + 1]);
			}
			if (logger) logger.info("··· Computing T1 ifft");
			polynomials.T1 = await Polynomial.fromEvaluations(buffers.T1, curve, logger);
			polynomials.T1.divByZerofier(zkey.domainSize, Fr.one);
			if (logger) logger.info("··· Computing T1z ifft");
			polynomials.T1z = await Polynomial.fromEvaluations(buffers.T1z, curve, logger);
			polynomials.T1.add(polynomials.T1z);
			/* c8 ignore start */
			if (polynomials.T1.degree() >= zkey.domainSize + 2) throw new Error("T1 Polynomial is not well calculated");
			/* c8 ignore stop */
			delete buffers.T1;
			delete buffers.T1z;
			delete polynomials.T1z;
			delete evaluations.lagrange1;
			if (globalThis.gc) globalThis.gc();
		}
		async function computeT2() {
			if (logger) logger.info("··· Computing T2 evaluations");
			buffers.T2 = new ffjavascript.BigBuffer(sDomain * 4);
			buffers.T2z = new ffjavascript.BigBuffer(sDomain * 4);
			let omega = Fr.one;
			for (let i = 0; i < zkey.domainSize * 4; i++) {
				/* c8 ignore start */
				if (logger && 0 !== i && i % 1e5 === 0) logger.info(`    T2 evaluation ${i}/${zkey.domainSize * 4}`);
				/* c8 ignore stop */
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
				const betaX = Fr.mul(challenges.beta, omega);
				let e11 = Fr.add(a, betaX);
				e11 = Fr.add(e11, challenges.gamma);
				let e12 = Fr.add(b, Fr.mul(betaX, zkey.k1));
				e12 = Fr.add(e12, challenges.gamma);
				let e13 = Fr.add(c, Fr.mul(betaX, zkey.k2));
				e13 = Fr.add(e13, challenges.gamma);
				let e1 = Fr.mul(Fr.mul(Fr.mul(e11, e12), e13), z);
				let e1z = Fr.mul(Fr.mul(Fr.mul(e11, e12), e13), zp);
				let e21 = Fr.add(a, Fr.mul(challenges.beta, sigma1));
				e21 = Fr.add(e21, challenges.gamma);
				let e22 = Fr.add(b, Fr.mul(challenges.beta, sigma2));
				e22 = Fr.add(e22, challenges.gamma);
				let e23 = Fr.add(c, Fr.mul(challenges.beta, sigma3));
				e23 = Fr.add(e23, challenges.gamma);
				let e2 = Fr.mul(Fr.mul(Fr.mul(e21, e22), e23), zW);
				let e2z = Fr.mul(Fr.mul(Fr.mul(e21, e22), e23), zWp);
				let t2 = Fr.sub(e1, e2);
				let t2z = Fr.sub(e1z, e2z);
				buffers.T2.set(t2, i * sFr);
				buffers.T2z.set(t2z, i * sFr);
				omega = Fr.mul(omega, Fr.w[zkey.power + 2]);
			}
			if (logger) logger.info("··· Computing T2 ifft");
			polynomials.T2 = await Polynomial.fromEvaluations(buffers.T2, curve, logger);
			if (logger) logger.info("··· Computing T2 / ZH");
			polynomials.T2.divByZerofier(zkey.domainSize, Fr.one);
			if (logger) logger.info("··· Computing T2z ifft");
			polynomials.T2z = await Polynomial.fromEvaluations(buffers.T2z, curve, logger);
			polynomials.T2.add(polynomials.T2z);
			/* c8 ignore start */
			if (polynomials.T2.degree() >= 3 * zkey.domainSize) throw new Error("T2 Polynomial is not well calculated");
			/* c8 ignore stop */
			delete buffers.T2;
			delete buffers.T2z;
			delete polynomials.T2z;
			delete evaluations.A;
			delete evaluations.B;
			delete evaluations.C;
			delete evaluations.Z;
			delete evaluations.Sigma1;
			delete evaluations.Sigma2;
			delete evaluations.Sigma3;
			if (globalThis.gc) globalThis.gc();
		}
		async function computeC2() {
			let C2 = new CPolynomial(3, curve, logger);
			C2.addPolynomial(0, polynomials.Z);
			C2.addPolynomial(1, polynomials.T1);
			C2.addPolynomial(2, polynomials.T2);
			polynomials.C2 = C2.getPolynomial();
			C2 = null;
			/* c8 ignore start */
			if (polynomials.C2.degree() >= 9 * zkey.domainSize) throw new Error("C2 Polynomial is not well calculated");
			/* c8 ignore stop */
		}
	}
	async function round3() {
		if (logger) logger.info("> Computing challenge xi");
		const transcript = new Keccak256Transcript(curve);
		transcript.addScalar(challenges.gamma);
		transcript.addPolCommitment(proof.getPolynomial("C2"));
		challenges.xiSeed = transcript.getChallenge();
		const xiSeed2 = Fr.square(challenges.xiSeed);
		roots.w8 = [];
		roots.w8[0] = Fr.one;
		for (let i = 1; i < 8; i++) roots.w8[i] = Fr.mul(roots.w8[i - 1], zkey.w8);
		roots.w4 = [];
		roots.w4[0] = Fr.one;
		for (let i = 1; i < 4; i++) roots.w4[i] = Fr.mul(roots.w4[i - 1], zkey.w4);
		roots.w3 = [];
		roots.w3[0] = Fr.one;
		roots.w3[1] = zkey.w3;
		roots.w3[2] = Fr.square(zkey.w3);
		roots.S0 = {};
		roots.S0.h0w8 = [];
		roots.S0.h0w8[0] = Fr.mul(xiSeed2, challenges.xiSeed);
		for (let i = 1; i < 8; i++) roots.S0.h0w8[i] = Fr.mul(roots.S0.h0w8[0], roots.w8[i]);
		roots.S1 = {};
		roots.S1.h1w4 = [];
		roots.S1.h1w4[0] = Fr.square(roots.S0.h0w8[0]);
		for (let i = 1; i < 4; i++) roots.S1.h1w4[i] = Fr.mul(roots.S1.h1w4[0], roots.w4[i]);
		roots.S2 = {};
		roots.S2.h2w3 = [];
		roots.S2.h2w3[0] = Fr.mul(roots.S1.h1w4[0], xiSeed2);
		roots.S2.h2w3[1] = Fr.mul(roots.S2.h2w3[0], roots.w3[1]);
		roots.S2.h2w3[2] = Fr.mul(roots.S2.h2w3[0], roots.w3[2]);
		roots.S2.h3w3 = [];
		roots.S2.h3w3[0] = Fr.mul(roots.S2.h2w3[0], zkey.wr);
		roots.S2.h3w3[1] = Fr.mul(roots.S2.h3w3[0], roots.w3[1]);
		roots.S2.h3w3[2] = Fr.mul(roots.S2.h3w3[0], roots.w3[2]);
		challenges.xi = Fr.mul(Fr.square(roots.S2.h2w3[0]), roots.S2.h2w3[0]);
		if (logger) logger.info("··· challenges.xi: " + Fr.toString(challenges.xi));
		polynomials.QL = new Polynomial(new ffjavascript.BigBuffer(sDomain), curve, logger);
		polynomials.QR = new Polynomial(new ffjavascript.BigBuffer(sDomain), curve, logger);
		polynomials.QM = new Polynomial(new ffjavascript.BigBuffer(sDomain), curve, logger);
		polynomials.QO = new Polynomial(new ffjavascript.BigBuffer(sDomain), curve, logger);
		polynomials.QC = new Polynomial(new ffjavascript.BigBuffer(sDomain), curve, logger);
		await fdZKey.readToBuffer(polynomials.QL.coef, 0, sDomain, zkeySections[7][0].p);
		await fdZKey.readToBuffer(polynomials.QR.coef, 0, sDomain, zkeySections[8][0].p);
		await fdZKey.readToBuffer(polynomials.QM.coef, 0, sDomain, zkeySections[9][0].p);
		await fdZKey.readToBuffer(polynomials.QO.coef, 0, sDomain, zkeySections[10][0].p);
		await fdZKey.readToBuffer(polynomials.QC.coef, 0, sDomain, zkeySections[11][0].p);
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
		if (logger) logger.info("> Reading C0 polynomial");
		polynomials.C0 = new Polynomial(new ffjavascript.BigBuffer(sDomain * 8), curve, logger);
		await fdZKey.readToBuffer(polynomials.C0.coef, 0, sDomain * 8, zkeySections[17][0].p);
		if (logger) logger.info("> Computing R0 polynomial");
		computeR0();
		if (logger) logger.info("> Computing R1 polynomial");
		computeR1();
		if (logger) logger.info("> Computing R2 polynomial");
		computeR2();
		if (logger) logger.info("> Computing F polynomial");
		await computeF();
		if (logger) logger.info("> Computing W1 multi exponentiation");
		let commitW1 = await polynomials.F.multiExponentiation(PTau, "W1");
		proof.addPolynomial("W1", commitW1);
		return 0;
		function computeR0() {
			polynomials.R0 = Polynomial.lagrangePolynomialInterpolation([
				roots.S0.h0w8[0],
				roots.S0.h0w8[1],
				roots.S0.h0w8[2],
				roots.S0.h0w8[3],
				roots.S0.h0w8[4],
				roots.S0.h0w8[5],
				roots.S0.h0w8[6],
				roots.S0.h0w8[7]
			], [
				polynomials.C0.evaluate(roots.S0.h0w8[0]),
				polynomials.C0.evaluate(roots.S0.h0w8[1]),
				polynomials.C0.evaluate(roots.S0.h0w8[2]),
				polynomials.C0.evaluate(roots.S0.h0w8[3]),
				polynomials.C0.evaluate(roots.S0.h0w8[4]),
				polynomials.C0.evaluate(roots.S0.h0w8[5]),
				polynomials.C0.evaluate(roots.S0.h0w8[6]),
				polynomials.C0.evaluate(roots.S0.h0w8[7])
			], curve);
			/* c8 ignore start */
			if (polynomials.R0.degree() > 7) throw new Error("R0 Polynomial is not well calculated");
			/* c8 ignore stop */
		}
		function computeR1() {
			polynomials.R1 = Polynomial.lagrangePolynomialInterpolation([
				roots.S1.h1w4[0],
				roots.S1.h1w4[1],
				roots.S1.h1w4[2],
				roots.S1.h1w4[3]
			], [
				polynomials.C1.evaluate(roots.S1.h1w4[0]),
				polynomials.C1.evaluate(roots.S1.h1w4[1]),
				polynomials.C1.evaluate(roots.S1.h1w4[2]),
				polynomials.C1.evaluate(roots.S1.h1w4[3])
			], curve);
			/* c8 ignore start */
			if (polynomials.R1.degree() > 3) throw new Error("R1 Polynomial is not well calculated");
			/* c8 ignore stop */
		}
		function computeR2() {
			polynomials.R2 = Polynomial.lagrangePolynomialInterpolation([
				roots.S2.h2w3[0],
				roots.S2.h2w3[1],
				roots.S2.h2w3[2],
				roots.S2.h3w3[0],
				roots.S2.h3w3[1],
				roots.S2.h3w3[2]
			], [
				polynomials.C2.evaluate(roots.S2.h2w3[0]),
				polynomials.C2.evaluate(roots.S2.h2w3[1]),
				polynomials.C2.evaluate(roots.S2.h2w3[2]),
				polynomials.C2.evaluate(roots.S2.h3w3[0]),
				polynomials.C2.evaluate(roots.S2.h3w3[1]),
				polynomials.C2.evaluate(roots.S2.h3w3[2])
			], curve);
			/* c8 ignore start */
			if (polynomials.R2.degree() > 5) throw new Error("R2 Polynomial is not well calculated");
			/* c8 ignore stop */
		}
		async function computeF() {
			if (logger) logger.info("··· Computing F polynomial");
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
			/* c8 ignore start */
			if (polynomials.F.degree() >= 9 * zkey.domainSize - 6) throw new Error("F Polynomial is not well calculated");
			/* c8 ignore stop */
		}
	}
	async function round5() {
		if (logger) logger.info("> Computing challenge y");
		const transcript = new Keccak256Transcript(curve);
		transcript.addScalar(challenges.alpha);
		transcript.addPolCommitment(proof.getPolynomial("W1"));
		challenges.y = transcript.getChallenge();
		if (logger) logger.info("··· challenges.y: " + Fr.toString(challenges.y));
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
		/* c8 ignore start */
		if (polRemainder.degree() > 0) throw new Error(`Degree of L(X)/(ZTS2(y)(X-y)) remainder is ${polRemainder.degree()} and should be 0`);
		/* c8 ignore stop */
		/* c8 ignore start */
		if (polynomials.L.degree() >= 9 * zkey.domainSize - 1) throw new Error("Degree of L(X)/(ZTS2(y)(X-y)) is not correct");
		/* c8 ignore stop */
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
			for (let i = 1; i < 8; i++) mulL0 = Fr.mul(mulL0, Fr.sub(challenges.y, roots.S0.h0w8[i]));
			let mulL1 = Fr.sub(challenges.y, roots.S1.h1w4[0]);
			for (let i = 1; i < 4; i++) mulL1 = Fr.mul(mulL1, Fr.sub(challenges.y, roots.S1.h1w4[i]));
			let mulL2 = Fr.sub(challenges.y, roots.S2.h2w3[0]);
			for (let i = 1; i < 3; i++) mulL2 = Fr.mul(mulL2, Fr.sub(challenges.y, roots.S2.h2w3[i]));
			for (let i = 0; i < 3; i++) mulL2 = Fr.mul(mulL2, Fr.sub(challenges.y, roots.S2.h3w3[i]));
			let preL0 = Fr.mul(mulL1, mulL2);
			let preL1 = Fr.mul(challenges.alpha, Fr.mul(mulL0, mulL2));
			let preL2 = Fr.mul(Fr.square(challenges.alpha), Fr.mul(mulL0, mulL1));
			toInverse["denH1"] = mulL1;
			toInverse["denH2"] = mulL2;
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
			l2 = null;
			l3 = null;
			delete polynomials.C0;
			delete polynomials.C1;
			delete polynomials.C2;
			if (globalThis.gc) globalThis.gc();
			if (logger) logger.info("> Computing ZT polynomial");
			await computeZT();
			const evalZTY = polynomials.ZT.evaluate(challenges.y);
			polynomials.F.mulScalar(evalZTY);
			polynomials.L.sub(polynomials.F);
			delete polynomials.F;
			/* c8 ignore start */
			if (polynomials.L.degree() >= 9 * zkey.domainSize) throw new Error("L Polynomial is not well calculated");
			/* c8 ignore stop */
			delete buffers.L;
		}
		async function computeZT() {
			polynomials.ZT = Polynomial.zerofierPolynomial([
				roots.S0.h0w8[0],
				roots.S0.h0w8[1],
				roots.S0.h0w8[2],
				roots.S0.h0w8[3],
				roots.S0.h0w8[4],
				roots.S0.h0w8[5],
				roots.S0.h0w8[6],
				roots.S0.h0w8[7],
				roots.S1.h1w4[0],
				roots.S1.h1w4[1],
				roots.S1.h1w4[2],
				roots.S1.h1w4[3],
				roots.S2.h2w3[0],
				roots.S2.h2w3[1],
				roots.S2.h2w3[2],
				roots.S2.h3w3[0],
				roots.S2.h3w3[1],
				roots.S2.h3w3[2]
			], curve);
		}
		async function computeZTS2() {
			polynomials.ZTS2 = Polynomial.zerofierPolynomial([
				roots.S1.h1w4[0],
				roots.S1.h1w4[1],
				roots.S1.h1w4[2],
				roots.S1.h1w4[3],
				roots.S2.h2w3[0],
				roots.S2.h2w3[1],
				roots.S2.h2w3[2],
				roots.S2.h3w3[0],
				roots.S2.h3w3[1],
				roots.S2.h3w3[2]
			], curve);
		}
	}
	function getMontgomeryBatchedInverse() {
		let xiN = challenges.xi;
		for (let i = 0; i < zkey.power; i++) xiN = Fr.square(xiN);
		toInverse["zh"] = Fr.sub(xiN, Fr.one);
		computeLiS0(toInverse, roots.S0.h0w8, challenges.y, curve);
		computeLiS1(toInverse, roots.S1.h1w4, challenges.y, curve);
		computeLiS2(toInverse, roots.S2.h2w3, roots.S2.h3w3, challenges.y, challenges.xi, challenges.xiw, curve);
		const size = Math.max(1, zkey.nPublic);
		let w = Fr.one;
		for (let i = 0; i < size; i++) {
			toInverse["Li_" + (i + 1)] = Fr.mul(Fr.e(zkey.domainSize), Fr.sub(challenges.xi, w));
			w = Fr.mul(w, Fr.w[zkey.power]);
		}
		let mulAccumulator = Fr.one;
		for (const element of Object.values(toInverse))
 /* c8 ignore start */
		if (Array.isArray(element)) for (const subElement of element) mulAccumulator = Fr.mul(mulAccumulator, subElement);
		else mulAccumulator = Fr.mul(mulAccumulator, element);
		return Fr.inv(mulAccumulator);
		function computeLiS0(toInverse, roots, x, curve) {
			const Fr = curve.Fr;
			const len = roots.length;
			const den1 = Fr.mul(Fr.e(len), Fr.exp(roots[0], len - 2));
			const Li = [];
			for (let i = 0; i < len; i++) {
				const den2 = roots[(len - 1) * i % len];
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
				const den2 = roots[(len - 1) * i % len];
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
				toInverse[["LiS2_" + (i + 1)]] = Fr.mul(den1, Fr.mul(den2, den3));
			}
			const _3h3 = Fr.mul(Fr.e(3), S2p[0]);
			const xiwsubxi = Fr.sub(xiw, xi);
			den1 = Fr.mul(_3h3, xiwsubxi);
			for (let i = 0; i < 3; i++) {
				const den2 = S2p[2 * i % 3];
				const den3 = Fr.sub(value, S2p[i]);
				toInverse[["LiS2_" + (i + 1 + 3)]] = Fr.mul(den1, Fr.mul(den2, den3));
			}
			return Li;
		}
	}
}
//#endregion
//#region src/fflonk_full_prove.js
var { unstringifyBigInts: unstringifyBigInts$3 } = ffjavascript.utils;
async function fflonkFullProve$1(_input, wasmFilename, zkeyFilename, logger, wtnsCalcOptions, proverOptions) {
	const input = unstringifyBigInts$3(_input);
	const wtns = { type: "mem" };
	await wtnsCalculate$1(input, wasmFilename, wtns, wtnsCalcOptions);
	return await fflonkProve$1(zkeyFilename, wtns, logger, proverOptions);
}
//#endregion
//#region src/fflonk_verify.js
var { unstringifyBigInts: unstringifyBigInts$2 } = ffjavascript.utils;
async function fflonkVerify$1(_vk_verifier, _publicSignals, _proof, logger) {
	if (logger) logger.info("FFLONK VERIFIER STARTED");
	_vk_verifier = unstringifyBigInts$2(_vk_verifier);
	_proof = unstringifyBigInts$2(_proof);
	const curve = await getCurveFromName(_vk_verifier.curve);
	const vk = fromObjectVk(curve, _vk_verifier);
	const proof = new Proof(curve, logger);
	proof.fromObjectProof(_proof);
	const publicSignals = unstringifyBigInts$2(_publicSignals);
	if (publicSignals.length !== vk.nPublic) {
		if (logger) logger.error("Number of public signals does not match with vk");
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
	if (logger) logger.info("> Checking commitments belong to G1");
	if (!commitmentsBelongToG1(curve, proof, vk)) {
		if (logger) logger.error("Proof commitments are not valid");
		return false;
	}
	if (logger) logger.info("> Checking evaluations belong to F");
	if (!evaluationsAreValid(curve, proof)) {
		if (logger) logger.error("Proof evaluations are not valid.");
		return false;
	}
	if (logger) logger.info("> Checking public inputs belong to F");
	if (!publicInputsAreValid(curve, publicSignals)) {
		if (logger) logger.error("Public inputs are not valid.");
		return false;
	}
	if (logger) logger.info("> Computing challenges");
	const { challenges, roots } = computeChallenges(curve, proof, vk, publicSignals, logger);
	if (logger) logger.info("> Computing Zero polynomial evaluation Z_H(xi)");
	challenges.zh = Fr.sub(challenges.xiN, Fr.one);
	challenges.invzh = Fr.inv(challenges.zh);
	if (logger) logger.info("> Computing Lagrange evaluations");
	const lagrangeEvals = await computeLagrangeEvaluations(curve, challenges, vk);
	if (logger) logger.info("> Computing polynomial identities PI(X)");
	const pi = calculatePI(curve, publicSignals, lagrangeEvals);
	if (logger) logger.info("> Computing r0(y)");
	const r0 = computeR0(proof, challenges, roots, curve, logger);
	if (logger) logger.info("> Computing r1(y)");
	const r1 = computeR1(proof, challenges, roots, pi, curve, logger);
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
		if (res) logger.info("PROOF VERIFIED SUCCESSFULLY");
		else logger.warn("Invalid Proof");
	}
	if (logger) logger.info("FFLONK VERIFIER FINISHED");
	return res;
}
function fromObjectVk(curve, vk) {
	const res = vk;
	res.k1 = curve.Fr.fromObject(vk.k1);
	res.k2 = curve.Fr.fromObject(vk.k2);
	res.w = curve.Fr.fromObject(vk.w);
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
	return G1.isValid(proof.polynomials.C1) && G1.isValid(proof.polynomials.C2) && G1.isValid(proof.polynomials.W1) && G1.isValid(proof.polynomials.W2) && G1.isValid(vk.C0);
}
function checkValueBelongToField(curve, value) {
	return ffjavascript.Scalar.geq(value, 0) && ffjavascript.Scalar.lt(value, curve.r);
}
function checkEvaluationIsValid(curve, evaluation) {
	return checkValueBelongToField(curve, ffjavascript.Scalar.fromRprLE(evaluation));
}
function evaluationsAreValid(curve, proof) {
	return checkEvaluationIsValid(curve, proof.evaluations.ql) && checkEvaluationIsValid(curve, proof.evaluations.qr) && checkEvaluationIsValid(curve, proof.evaluations.qm) && checkEvaluationIsValid(curve, proof.evaluations.qo) && checkEvaluationIsValid(curve, proof.evaluations.qc) && checkEvaluationIsValid(curve, proof.evaluations.s1) && checkEvaluationIsValid(curve, proof.evaluations.s2) && checkEvaluationIsValid(curve, proof.evaluations.s3) && checkEvaluationIsValid(curve, proof.evaluations.a) && checkEvaluationIsValid(curve, proof.evaluations.b) && checkEvaluationIsValid(curve, proof.evaluations.c) && checkEvaluationIsValid(curve, proof.evaluations.z) && checkEvaluationIsValid(curve, proof.evaluations.zw) && checkEvaluationIsValid(curve, proof.evaluations.t1w) && checkEvaluationIsValid(curve, proof.evaluations.t2w);
}
function publicInputsAreValid(curve, publicInputs) {
	for (let i = 0; i < publicInputs.length; i++) if (!checkValueBelongToField(curve, publicInputs[i])) return false;
	return true;
}
function computeChallenges(curve, proof, vk, publicSignals, logger) {
	const Fr = curve.Fr;
	const challenges = {};
	const roots = {};
	const transcript = new Keccak256Transcript(curve);
	transcript.addPolCommitment(vk.C0);
	for (let i = 0; i < publicSignals.length; i++) transcript.addScalar(Fr.e(publicSignals[i]));
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
	roots.S0 = {};
	roots.S0.h0w8 = [];
	roots.S0.h0w8[0] = Fr.mul(xiSeed2, xiSeed);
	for (let i = 1; i < 8; i++) roots.S0.h0w8[i] = Fr.mul(roots.S0.h0w8[0], w8[i]);
	roots.S1 = {};
	roots.S1.h1w4 = [];
	roots.S1.h1w4[0] = Fr.square(roots.S0.h0w8[0]);
	for (let i = 1; i < 4; i++) roots.S1.h1w4[i] = Fr.mul(roots.S1.h1w4[0], w4[i]);
	roots.S2 = {};
	roots.S2.h2w3 = [];
	roots.S2.h2w3[0] = Fr.mul(roots.S1.h1w4[0], xiSeed2);
	roots.S2.h2w3[1] = Fr.mul(roots.S2.h2w3[0], w3[1]);
	roots.S2.h2w3[2] = Fr.mul(roots.S2.h2w3[0], w3[2]);
	roots.S2.h3w3 = [];
	roots.S2.h3w3[0] = Fr.mul(roots.S2.h2w3[0], vk.wr);
	roots.S2.h3w3[1] = Fr.mul(roots.S2.h3w3[0], w3[1]);
	roots.S2.h3w3[2] = Fr.mul(roots.S2.h3w3[0], w3[2]);
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
	return {
		challenges,
		roots
	};
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
	if (logger) logger.info("··· Computing r0(y)");
	let res = Fr.zero;
	for (let i = 0; i < 8; i++) {
		let coefValues = [];
		coefValues[1] = roots.S0.h0w8[i];
		for (let j = 2; j < 8; j++) coefValues[j] = Fr.mul(coefValues[j - 1], roots.S0.h0w8[i]);
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
	if (logger) logger.info("··· Computing T0(xi)");
	let t0 = Fr.mul(proof.evaluations.ql, proof.evaluations.a);
	t0 = Fr.add(t0, Fr.mul(proof.evaluations.qr, proof.evaluations.b));
	t0 = Fr.add(t0, Fr.mul(proof.evaluations.qm, Fr.mul(proof.evaluations.a, proof.evaluations.b)));
	t0 = Fr.add(t0, Fr.mul(proof.evaluations.qo, proof.evaluations.c));
	t0 = Fr.add(t0, proof.evaluations.qc);
	t0 = Fr.add(t0, pi);
	t0 = Fr.mul(t0, challenges.invzh);
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
	if (logger) logger.info("··· Computing T1(xi)");
	let t1 = Fr.sub(proof.evaluations.z, Fr.one);
	t1 = Fr.mul(t1, lagrange1);
	t1 = Fr.mul(t1, challenges.invzh);
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
	for (let i = 1; i < 8; i++) mulH0 = Fr.mul(mulH0, Fr.sub(challenges.y, roots.S0.h0w8[i]));
	challenges.temp = mulH0;
	let mulH1 = Fr.sub(challenges.y, roots.S1.h1w4[0]);
	for (let i = 1; i < 4; i++) mulH1 = Fr.mul(mulH1, Fr.sub(challenges.y, roots.S1.h1w4[i]));
	let mulH2 = Fr.sub(challenges.y, roots.S2.h2w3[0]);
	for (let i = 1; i < 3; i++) mulH2 = Fr.mul(mulH2, Fr.sub(challenges.y, roots.S2.h2w3[i]));
	for (let i = 0; i < 3; i++) mulH2 = Fr.mul(mulH2, Fr.sub(challenges.y, roots.S2.h3w3[i]));
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
	return curve.G1.timesFr(proof.polynomials.W1, challenges.temp);
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
		const den2 = roots[(len - 1) * i % len];
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
		const den = Fr.mul(den1, Fr.mul(den2, den3));
		Li[i] = Fr.div(num, den);
	}
	den1 = Fr.mul(Fr.mul(Fr.e(len), roots[1][0]), Fr.sub(xi1, xi0));
	for (let i = 0; i < len; i++) {
		const den2 = roots[1][(len - 1) * i % len];
		const den3 = Fr.sub(value, roots[1][i]);
		const den = Fr.mul(den1, Fr.mul(den2, den3));
		Li[i + len] = Fr.div(num, den);
	}
	return Li;
}
//#endregion
//#region src/fflonk_export_calldata.js
var { unstringifyBigInts: unstringifyBigInts$1 } = ffjavascript.utils;
function p256(n) {
	let nstr = n.toString(16);
	while (nstr.length < 64) nstr = "0" + nstr;
	nstr = `0x${nstr}`;
	return nstr;
}
async function fflonkExportCallData(_pub, _proof) {
	const proof = unstringifyBigInts$1(_proof);
	const pub = unstringifyBigInts$1(_pub);
	await getCurveFromName(proof.curve);
	let inputs = "";
	for (let i = 0; i < pub.length; i++) {
		if (inputs !== "") inputs = inputs + ",";
		inputs = inputs + p256(pub[i]);
	}
	return `[${p256(proof.polynomials.C1[0])}, ${p256(proof.polynomials.C1[1])},${p256(proof.polynomials.C2[0])},${p256(proof.polynomials.C2[1])},${p256(proof.polynomials.W1[0])},${p256(proof.polynomials.W1[1])},${p256(proof.polynomials.W2[0])},${p256(proof.polynomials.W2[1])},${p256(proof.evaluations.ql)},${p256(proof.evaluations.qr)},${p256(proof.evaluations.qm)},${p256(proof.evaluations.qo)},${p256(proof.evaluations.qc)},${p256(proof.evaluations.s1)},${p256(proof.evaluations.s2)},${p256(proof.evaluations.s3)},${p256(proof.evaluations.a)},${p256(proof.evaluations.b)},${p256(proof.evaluations.c)},${p256(proof.evaluations.z)},${p256(proof.evaluations.zw)},${p256(proof.evaluations.t1w)},${p256(proof.evaluations.t2w)},${p256(proof.evaluations.inv)}],[${inputs}]`;
}
//#endregion
//#region src/wtns_debug.js
var { unstringifyBigInts } = ffjavascript.utils;
async function wtnsDebug$1(_input, wasmFileName, wtnsFileName, symName, options, logger) {
	const input = unstringifyBigInts(_input);
	const fdWasm = await fastfile.readExisting(wasmFileName);
	const wasm = await fdWasm.read(fdWasm.totalSize);
	await fdWasm.close();
	const wcOps = {
		...options,
		sanityCheck: true
	};
	let sym = await loadSymbols(symName);
	if (options.set) {
		if (!sym) sym = await loadSymbols(symName);
		wcOps.logSetSignal = function(labelIdx, value) {
			if (logger) logger.info("SET " + sym.labelIdx2Name[labelIdx] + " <-- " + value.toString());
		};
	}
	if (options.get) {
		if (!sym) sym = await loadSymbols(symName);
		wcOps.logGetSignal = function(varIdx, value) {
			if (logger) logger.info("GET " + sym.labelIdx2Name[varIdx] + " --> " + value.toString());
		};
	}
	if (options.trigger) {
		if (!sym) sym = await loadSymbols(symName);
		wcOps.logStartComponent = function(cIdx) {
			if (logger) logger.info("START: " + sym.componentIdx2Name[cIdx]);
		};
		wcOps.logFinishComponent = function(cIdx) {
			if (logger) logger.info("FINISH: " + sym.componentIdx2Name[cIdx]);
		};
	}
	wcOps.sym = sym;
	const wc = await (0, circom_runtime.WitnessCalculatorBuilder)(wasm, wcOps);
	const w = await wc.calculateWitness(input, true);
	const fdWtns = await _iden3_binfileutils.createBinFile(wtnsFileName, "wtns", 2, 2);
	await write(fdWtns, w, wc.prime);
	await fdWtns.close();
}
//#endregion
//#region src/wtns_export_json.js
async function wtnsExportJson$1(wtnsFileName) {
	return await read(wtnsFileName);
}
//#endregion
//#region src/wtns_check.js
async function wtnsCheck$1(r1csFilename, wtnsFilename, logger) {
	const fds = {};
	try {
		return await _wtnsCheck(r1csFilename, wtnsFilename, logger, fds);
	} finally {
		for (const openFd of [fds.fdR1cs, fds.fdWtns]) try {
			if (openFd) await openFd.close();
		} catch (e) {}
	}
}
async function _wtnsCheck(r1csFilename, wtnsFilename, logger, fds) {
	if (logger) logger.info("WITNESS CHECKING STARTED");
	if (logger) logger.info("> Reading r1cs file");
	const { fd: fdR1cs, sections: sectionsR1cs } = await _iden3_binfileutils.readBinFile(r1csFilename, "r1cs", 1, 1 << 22, 1 << 24);
	fds.fdR1cs = fdR1cs;
	const r1cs = await (0, r1csfile.readR1csFd)(fdR1cs, sectionsR1cs, {
		loadConstraints: false,
		loadCustomGates: false
	});
	if (logger) logger.info("> Reading witness file");
	const { fd: fdWtns, sections: wtnsSections } = await _iden3_binfileutils.readBinFile(wtnsFilename, "wtns", 2, 1 << 22, 1 << 24);
	fds.fdWtns = fdWtns;
	const wtnsHeader = await readHeader(fdWtns, wtnsSections);
	if (!ffjavascript.Scalar.eq(r1cs.prime, wtnsHeader.q)) throw new Error("Curve of the witness does not match the curve of the proving key");
	const buffWitness = await _iden3_binfileutils.readSection(fdWtns, wtnsSections, 2);
	await fdWtns.close();
	const Fr = (await getCurveFromR(r1cs.prime)).Fr;
	const sFr = Fr.n8;
	const bR1cs = await _iden3_binfileutils.readSection(fdR1cs, sectionsR1cs, 2);
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
		if (logger && i !== 0 && i % 5e5 === 0) logger.info(`··· processing r1cs constraints ${i}/${r1cs.nConstraints}`);
		const lcA = readLC();
		const lcB = readLC();
		const lcC = readLC();
		const evalA = EvaluateLinearCombination(lcA);
		const evalB = EvaluateLinearCombination(lcB);
		const evalC = EvaluateLinearCombination(lcC);
		if (!Fr.eq(Fr.sub(Fr.mul(evalA, evalB), evalC), Fr.zero)) {
			if (logger) logger.warn("··· aborting checking process at constraint " + i);
			res = false;
			break;
		}
	}
	await fdR1cs.close();
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
		Object.keys(lc).forEach((signalId) => {
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
		const nIdx = new DataView(buffUL32.buffer).getUint32(0, true);
		const buff = bR1cs.slice(bR1csPos, bR1csPos + (4 + r1cs.n8) * nIdx);
		bR1csPos += (4 + r1cs.n8) * nIdx;
		const buffV = new DataView(buff.buffer);
		for (let i = 0; i < nIdx; i++) {
			const idx = buffV.getUint32(i * (4 + r1cs.n8), true);
			lc[idx] = r1cs.F.fromRprLE(buff, i * (4 + r1cs.n8) + 4);
		}
		return lc;
	}
	function getWitnessValue(signalId) {
		return Fr.fromRprLE(buffWitness.slice(signalId * sFr, signalId * sFr + sFr));
	}
}
//#endregion
//#region cli.js
var { stringifyBigInts } = ffjavascript.utils;
var logger = logplease.default.create("snarkJS", { showTimestamp: false });
logplease.default.setLogLevel("INFO");
if (typeof globalThis.gc !== "function") try {
	const nodeRequire = (0, module$1.createRequire)(require("url").pathToFileURL(__filename).href);
	const v8 = nodeRequire("v8");
	const vm = nodeRequire("vm");
	v8.setFlagsFromString("--expose-gc");
	globalThis.gc = vm.runInNewContext("gc");
	v8.setFlagsFromString("--no-expose-gc");
} catch (e) {}
var __dirname$1 = path.default.dirname(url.default.fileURLToPath(require("url").pathToFileURL(__filename).href));
clProcessor([
	{
		cmd: "powersoftau new <curve> <power> [powersoftau_0000.ptau]",
		description: "Starts a powers of tau ceremony",
		alias: ["ptn"],
		options: "-verbose|v",
		action: powersOfTauNew
	},
	{
		cmd: "powersoftau contribute <powersoftau.ptau> <new_powersoftau.ptau>",
		description: "creates a ptau file with a new contribution",
		alias: ["ptc"],
		options: "-verbose|v -name|n -entropy|e",
		action: powersOfTauContribute
	},
	{
		cmd: "powersoftau export challenge <powersoftau_0000.ptau> [challenge]",
		description: "Creates a challenge",
		alias: ["ptec"],
		options: "-verbose|v",
		action: powersOfTauExportChallenge
	},
	{
		cmd: "powersoftau challenge contribute <curve> <challenge> [response]",
		description: "Contribute to a challenge",
		alias: ["ptcc"],
		options: "-verbose|v -entropy|e",
		action: powersOfTauChallengeContribute
	},
	{
		cmd: "powersoftau import response <powersoftau_old.ptau> <response> <<powersoftau_new.ptau>",
		description: "import a response to a ptau file",
		alias: ["ptir"],
		options: "-verbose|v -nopoints -nocheck -name|n",
		action: powersOfTauImport
	},
	{
		cmd: "powersoftau beacon <old_powersoftau.ptau> <new_powersoftau.ptau> <beaconHash(Hex)> <numIterationsExp>",
		description: "adds a beacon",
		alias: ["ptb"],
		options: "-verbose|v -name|n",
		action: powersOfTauBeacon
	},
	{
		cmd: "powersoftau prepare phase2 <powersoftau.ptau> <new_powersoftau.ptau>",
		description: "Prepares phase 2. ",
		longDescription: " This process calculates the evaluation of the Lagrange polinomials at tau for alpha*tau and beta tau",
		alias: ["pt2"],
		options: "-verbose|v",
		action: powersOfTauPreparePhase2
	},
	{
		cmd: "powersoftau convert <old_powersoftau.ptau> <new_powersoftau.ptau>",
		description: "Convert ptau",
		longDescription: " This process calculates the evaluation of the Lagrange polinomials at tau for alpha*tau and beta tau",
		alias: ["ptcv"],
		options: "-verbose|v",
		action: powersOfTauConvert
	},
	{
		cmd: "powersoftau truncate <powersoftau.ptau>",
		description: "Generate different powers of tau with smaller sizes ",
		longDescription: " This process generates smaller ptau files from a bigger power ptau",
		alias: ["ptt"],
		options: "-verbose|v",
		action: powersOfTauTruncate
	},
	{
		cmd: "powersoftau verify <powersoftau.ptau>",
		description: "verifies a powers of tau file",
		alias: ["ptv"],
		options: "-verbose|v",
		action: powersOfTauVerify
	},
	{
		cmd: "powersoftau export json <powersoftau_0000.ptau> <powersoftau_0000.json>",
		description: "Exports a power of tau file to a JSON",
		alias: ["ptej"],
		options: "-verbose|v",
		action: powersOfTauExportJson
	},
	{
		cmd: "r1cs info [circuit.r1cs]",
		description: "Print statistiscs of a circuit",
		alias: ["ri", "info -r|r1cs:circuit.r1cs"],
		action: r1csInfo
	},
	{
		cmd: "r1cs print [circuit.r1cs] [circuit.sym]",
		description: "Print the constraints of a circuit",
		alias: ["rp", "print -r|r1cs:circuit.r1cs -s|sym"],
		action: r1csPrint
	},
	{
		cmd: "r1cs export json [circuit.r1cs] [circuit.json]",
		description: "Export r1cs to JSON file",
		alias: ["rej"],
		action: r1csExportJSON
	},
	{
		cmd: "wtns calculate [circuit.wasm] [input.json] [witness.wtns]",
		description: "Caclculate specific witness of a circuit given an input",
		alias: ["wc", "calculatewitness -ws|wasm:circuit.wasm -i|input:input.json -wt|witness:witness.wtns"],
		action: wtnsCalculate
	},
	{
		cmd: "wtns debug [circuit.wasm] [input.json] [witness.wtns] [circuit.sym]",
		description: "Calculate the witness with debug info.",
		longDescription: "Calculate the witness with debug info. \nOptions:\n-g or --g : Log signal gets\n-s or --s : Log signal sets\n-t or --trigger : Log triggers ",
		options: "-get|g -set|s -trigger|t",
		alias: ["wd"],
		action: wtnsDebug
	},
	{
		cmd: "wtns export json [witness.wtns] [witnes.json]",
		description: "Calculate the witness with debug info.",
		longDescription: "Calculate the witness with debug info. \nOptions:\n-g or --g : Log signal gets\n-s or --s : Log signal sets\n-t or --trigger : Log triggers ",
		options: "-verbose|v",
		alias: ["wej"],
		action: wtnsExportJson
	},
	{
		cmd: "wtns check [circuit.r1cs] [[witness.wtns]",
		description: "Check if a specific witness of a circuit fulfills the r1cs constraints",
		alias: ["wchk"],
		action: wtnsCheck
	},
	{
		cmd: "zkey contribute <circuit_old.zkey> <circuit_new.zkey>",
		description: "creates a zkey file with a new contribution",
		alias: ["zkc"],
		options: "-verbose|v  -entropy|e -name|n",
		action: zkeyContribute
	},
	{
		cmd: "zkey export bellman <circuit_xxxx.zkey> [circuit.mpcparams]",
		description: "Export a zKey to a MPCParameters file compatible with kobi/phase2 (Bellman)",
		alias: ["zkeb"],
		options: "-verbose|v",
		action: zkeyExportBellman
	},
	{
		cmd: "zkey bellman contribute <curve> <circuit.mpcparams> <circuit_response.mpcparams>",
		description: "contributes to a challenge file in bellman format",
		alias: ["zkbc"],
		options: "-verbose|v  -entropy|e",
		action: zkeyBellmanContribute
	},
	{
		cmd: "zkey import bellman <circuit_old.zkey> <circuit.mpcparams> <circuit_new.zkey>",
		description: "Export a zKey to a MPCParameters file compatible with kobi/phase2 (Bellman) ",
		alias: ["zkib"],
		options: "-verbose|v -name|n",
		action: zkeyImportBellman
	},
	{
		cmd: "zkey beacon <circuit_old.zkey> <circuit_new.zkey> <beaconHash(Hex)> <numIterationsExp>",
		description: "adds a beacon",
		alias: ["zkb"],
		options: "-verbose|v -name|n",
		action: zkeyBeacon
	},
	{
		cmd: "zkey verify r1cs [circuit.r1cs] [powersoftau.ptau] [circuit_final.zkey]",
		description: "Verify zkey file contributions and verify that matches with the original circuit.r1cs and ptau",
		alias: [
			"zkv",
			"zkvr",
			"zkey verify"
		],
		options: "-verbose|v",
		action: zkeyVerifyFromR1cs
	},
	{
		cmd: "zkey verify init [circuit_0000.zkey] [powersoftau.ptau] [circuit_final.zkey]",
		description: "Verify zkey file contributions and verify that matches with the original circuit.r1cs and ptau",
		alias: ["zkvi"],
		options: "-verbose|v",
		action: zkeyVerifyFromInit
	},
	{
		cmd: "zkey export verificationkey [circuit_final.zkey] [verification_key.json]",
		description: "Exports a verification key",
		alias: ["zkev"],
		action: zkeyExportVKey
	},
	{
		cmd: "zkey export json [circuit_final.zkey] [circuit_final.zkey.json]",
		description: "Exports a circuit key to a JSON file",
		alias: ["zkej"],
		options: "-verbose|v",
		action: zkeyExportJson
	},
	{
		cmd: "zkey export solidityverifier [circuit_final.zkey] [verifier.sol]",
		description: "Creates a verifier in solidity",
		alias: ["zkesv", "generateverifier -vk|verificationkey -v|verifier"],
		action: zkeyExportSolidityVerifier
	},
	{
		cmd: "zkey export soliditycalldata [public.json] [proof.json]",
		description: "Generates call parameters ready to be called.",
		alias: ["zkesc", "generatecall -pub|public -p|proof"],
		action: zkeyExportSolidityCalldata
	},
	{
		cmd: "groth16 setup [circuit.r1cs] [powersoftau.ptau] [circuit_0000.zkey]",
		description: "Creates an initial groth16 pkey file with zero contributions",
		alias: [
			"g16s",
			"zkn",
			"zkey new"
		],
		options: "-verbose|v",
		action: zkeyNew
	},
	{
		cmd: "groth16 prove [circuit_final.zkey] [witness.wtns] [proof.json] [public.json]",
		description: "Generates a zk Proof from witness",
		alias: [
			"g16p",
			"zpw",
			"zksnark proof",
			"proof -pk|provingkey -wt|witness -p|proof -pub|public"
		],
		options: "-verbose|v -protocol -buildabc -memlog",
		action: groth16Prove
	},
	{
		cmd: "groth16 fullprove [input.json] [circuit_final.wasm] [circuit_final.zkey] [proof.json] [public.json]",
		description: "Generates a zk Proof from input",
		alias: ["g16f", "g16i"],
		options: "-verbose|v -protocol -buildabc -memlog",
		action: groth16FullProve
	},
	{
		cmd: "groth16 verify [verification_key.json] [public.json] [proof.json]",
		description: "Verify a zk Proof",
		alias: ["g16v", "verify -vk|verificationkey -pub|public -p|proof"],
		action: groth16Verify
	},
	{
		cmd: "plonk setup [circuit.r1cs] [powersoftau.ptau] [circuit.zkey]",
		description: "Creates an initial PLONK pkey ",
		alias: ["pks"],
		options: "-verbose|v",
		action: plonkSetup
	},
	{
		cmd: "plonk prove [circuit.zkey] [witness.wtns] [proof.json] [public.json]",
		description: "Generates a PLONK Proof from witness",
		alias: ["pkp"],
		options: "-verbose|v -protocol",
		action: plonkProve
	},
	{
		cmd: "plonk fullprove [input.json] [circuit.wasm] [circuit.zkey] [proof.json] [public.json]",
		description: "Generates a PLONK Proof from input",
		alias: ["pkf"],
		options: "-verbose|v -protocol",
		action: plonkFullProve
	},
	{
		cmd: "plonk verify [verification_key.json] [public.json] [proof.json]",
		description: "Verify a PLONK Proof",
		alias: ["pkv"],
		options: "-verbose|v",
		action: plonkVerify
	},
	{
		cmd: "fflonk setup [circuit.r1cs] [powersoftau.ptau] [circuit.zkey]",
		description: "BETA version. Creates a FFLONK zkey from a circuit",
		alias: ["ffs"],
		options: "-verbose|v",
		action: fflonkSetup
	},
	{
		cmd: "fflonk prove [circuit.zkey] [witness.wtns] [proof.json] [public.json]",
		description: "BETA version. Generates a FFLONK Proof from witness",
		alias: ["ffp"],
		options: "-verbose|v -protocol",
		action: fflonkProve
	},
	{
		cmd: "fflonk fullprove [witness.json] [circuit.wasm] [circuit.zkey] [proof.json] [public.json]",
		description: "BETA version. Generates a witness and the FFLONK Proof in the same command",
		alias: ["fff"],
		options: "-verbose|v -protocol",
		action: fflonkFullProve
	},
	{
		cmd: "fflonk verify [verification_key.json] [public.json] [proof.json]",
		description: "BETA version. Verify a FFLONK Proof",
		alias: ["ffv"],
		options: "-verbose|v",
		action: fflonkVerify
	},
	{
		cmd: "file info [binary.file]",
		description: "Check info of a binary file",
		alias: ["fi"],
		action: fileInfo
	}
]).then((res) => {
	process.exit(res);
}, (err) => {
	logger.error(err);
	process.exit(1);
});
var _bfj;
async function getBFJ() {
	if (_bfj) return _bfj;
	const { default: bfj } = await import("bfj");
	_bfj = bfj;
	return _bfj;
}
function changeExt(fileName, newExt) {
	let S = fileName;
	while (S.length > 0 && S[S.length - 1] != ".") S = S.slice(0, S.length - 1);
	if (S.length > 0) return S + newExt;
	else return fileName + "." + newExt;
}
async function r1csInfo(params, options) {
	const r1csName = params[0] || "circuit.r1cs";
	if (options.verbose) logplease.default.setLogLevel("DEBUG");
	await r1csInfo$1(r1csName, logger);
	return 0;
}
async function r1csPrint(params, options) {
	const r1csName = params[0] || "circuit.r1cs";
	const symName = params[1] || changeExt(r1csName, "sym");
	if (options.verbose) logplease.default.setLogLevel("DEBUG");
	await r1csPrint$1(await (0, r1csfile.readR1cs)(r1csName, true, true, false), await loadSymbols(symName), logger);
	return 0;
}
async function r1csExportJSON(params, options) {
	const r1csName = params[0] || "circuit.r1cs";
	const jsonName = params[1] || changeExt(r1csName, "json");
	if (options.verbose) logplease.default.setLogLevel("DEBUG");
	const r1csObj = await r1csExportJson(r1csName, logger);
	await (await getBFJ()).write(jsonName, r1csObj, { space: 1 });
	return 0;
}
async function wtnsCalculate(params, options) {
	const wasmName = params[0] || "circuit.wasm";
	const inputName = params[1] || "input.json";
	const witnessName = params[2] || "witness.wtns";
	if (options.verbose) logplease.default.setLogLevel("DEBUG");
	await wtnsCalculate$1(JSON.parse(await fs.default.promises.readFile(inputName, "utf8")), wasmName, witnessName, {});
	return 0;
}
async function wtnsDebug(params, options) {
	const wasmName = params[0] || "circuit.wasm";
	const inputName = params[1] || "input.json";
	const witnessName = params[2] || "witness.wtns";
	const symName = params[3] || changeExt(wasmName, "sym");
	if (options.verbose) logplease.default.setLogLevel("DEBUG");
	await wtnsDebug$1(JSON.parse(await fs.default.promises.readFile(inputName, "utf8")), wasmName, witnessName, symName, options, logger);
	return 0;
}
async function wtnsExportJson(params, options) {
	const wtnsName = params[0] || "witness.wtns";
	const jsonName = params[1] || "witness.json";
	if (options.verbose) logplease.default.setLogLevel("DEBUG");
	const w = await wtnsExportJson$1(wtnsName);
	await (await getBFJ()).write(jsonName, stringifyBigInts(w), { space: 1 });
	return 0;
}
async function wtnsCheck(params, options) {
	const r1csFilename = params[0] || "circuit.r1cs";
	const wtnsFilename = params[1] || "witness.wtns";
	if (options.verbose) logplease.default.setLogLevel("DEBUG");
	if (await wtnsCheck$1(r1csFilename, wtnsFilename, logger)) return 0;
	else return 1;
}
async function groth16Prove(params, options) {
	const zkeyName = params[0] || "circuit_final.zkey";
	const witnessName = params[1] || "witness.wtns";
	const proofName = params[2] || "proof.json";
	const publicName = params[3] || "public.json";
	if (options.verbose) logplease.default.setLogLevel("DEBUG");
	const proveOptions = {};
	if (options.buildabc) proveOptions.buildABC = options.buildabc;
	if (options.memlog) proveOptions.memoryLogging = options.memlog;
	const { proof, publicSignals } = await groth16Prove$1(zkeyName, witnessName, logger, proveOptions);
	fs.default.writeFileSync(proofName, JSON.stringify(stringifyBigInts(proof), null, 1));
	fs.default.writeFileSync(publicName, JSON.stringify(stringifyBigInts(publicSignals), null, 1));
	return 0;
}
async function groth16FullProve(params, options) {
	const inputName = params[0] || "input.json";
	const wasmName = params[1] || "circuit.wasm";
	const zkeyName = params[2] || "circuit_final.zkey";
	const proofName = params[3] || "proof.json";
	const publicName = params[4] || "public.json";
	if (options.verbose) logplease.default.setLogLevel("DEBUG");
	const input = JSON.parse(await fs.default.promises.readFile(inputName, "utf8"));
	const proveOptions = {};
	if (options.buildabc) proveOptions.buildABC = options.buildabc;
	if (options.memlog) proveOptions.memoryLogging = options.memlog;
	const { proof, publicSignals } = await groth16FullProve$1(input, wasmName, zkeyName, logger, void 0, proveOptions);
	fs.default.writeFileSync(proofName, JSON.stringify(stringifyBigInts(proof), null, 1));
	fs.default.writeFileSync(publicName, JSON.stringify(stringifyBigInts(publicSignals), null, 1));
	return 0;
}
async function groth16Verify(params, options) {
	const verificationKeyName = params[0] || "verification_key.json";
	const publicName = params[1] || "public.json";
	const proofName = params[2] || "proof.json";
	const verificationKey = JSON.parse(fs.default.readFileSync(verificationKeyName, "utf8"));
	const pub = JSON.parse(fs.default.readFileSync(publicName, "utf8"));
	const proof = JSON.parse(fs.default.readFileSync(proofName, "utf8"));
	if (options.verbose) logplease.default.setLogLevel("DEBUG");
	if (await groth16Verify$1(verificationKey, pub, proof, logger)) return 0;
	else return 1;
}
async function zkeyExportVKey(params, options) {
	const zKeyFileName = params[0] || "circuit_final.zkey";
	const vKeyFilename = params[1] || "circuit_vk.json";
	if (options.verbose) logplease.default.setLogLevel("DEBUG");
	const vKey = await zkeyExportVerificationKey(zKeyFileName, logger);
	await (await getBFJ()).write(vKeyFilename, stringifyBigInts(vKey), { space: 1 });
	return 0;
}
async function zkeyExportJson(params, options) {
	const zkeyName = params[0] || "circuit_final.zkey";
	const zkeyJsonName = params[1] || "circuit_final.zkey.json";
	if (options.verbose) logplease.default.setLogLevel("DEBUG");
	const zKeyJson = await zkeyExportJson$1(zkeyName, logger);
	await (await getBFJ()).write(zkeyJsonName, zKeyJson, { space: 1 });
}
async function fileExists(file) {
	return fs.default.promises.access(file, fs.default.constants.F_OK).then(() => true).catch(() => false);
}
async function zkeyExportSolidityVerifier(params, options) {
	let zkeyName;
	let verifierName;
	if (params.length < 1) zkeyName = "circuit_final.zkey";
	else zkeyName = params[0];
	if (params.length < 2) verifierName = "verifier.sol";
	else verifierName = params[1];
	if (options.verbose) logplease.default.setLogLevel("DEBUG");
	const templates = {};
	if (await fileExists(path.default.join(__dirname$1, "templates"))) {
		templates.groth16 = await fs.default.promises.readFile(path.default.join(__dirname$1, "templates", "verifier_groth16.sol.ejs"), "utf8");
		templates.plonk = await fs.default.promises.readFile(path.default.join(__dirname$1, "templates", "verifier_plonk.sol.ejs"), "utf8");
		templates.fflonk = await fs.default.promises.readFile(path.default.join(__dirname$1, "templates", "verifier_fflonk.sol.ejs"), "utf8");
	} else {
		templates.groth16 = await fs.default.promises.readFile(path.default.join(__dirname$1, "..", "templates", "verifier_groth16.sol.ejs"), "utf8");
		templates.plonk = await fs.default.promises.readFile(path.default.join(__dirname$1, "..", "templates", "verifier_plonk.sol.ejs"), "utf8");
		templates.fflonk = await fs.default.promises.readFile(path.default.join(__dirname$1, "..", "templates", "verifier_fflonk.sol.ejs"), "utf8");
	}
	const verifierCode = await exportSolidityVerifier(zkeyName, templates, logger);
	fs.default.writeFileSync(verifierName, verifierCode, "utf-8");
	return 0;
}
async function zkeyExportSolidityCalldata(params, options) {
	let publicName;
	let proofName;
	if (params.length < 1) publicName = "public.json";
	else publicName = params[0];
	if (params.length < 2) proofName = "proof.json";
	else proofName = params[1];
	if (options.verbose) logplease.default.setLogLevel("DEBUG");
	const pub = JSON.parse(fs.default.readFileSync(publicName, "utf8"));
	const proof = JSON.parse(fs.default.readFileSync(proofName, "utf8"));
	let res;
	if (proof.protocol == "groth16") res = await groth16ExportSolidityCallData(proof, pub);
	else if (proof.protocol == "plonk") res = await plonkExportSolidityCallData(proof, pub);
	else if (proof.protocol === "fflonk") res = await fflonkExportCallData(pub, proof);
	else throw new Error("Invalid Protocol");
	console.log(res);
	return 0;
}
async function powersOfTauNew(params, options) {
	let curveName;
	let power;
	let ptauName;
	curveName = params[0];
	power = parseInt(params[1]);
	if (power < 1 || power > 28 || isNaN(power)) throw new Error("Power must be between 1 and 28");
	if (params.length < 3) ptauName = "powersOfTau" + power + "_0000.ptau";
	else ptauName = params[2];
	const curve = await getCurveFromName(curveName);
	if (options.verbose) logplease.default.setLogLevel("DEBUG");
	await newAccumulator(curve, power, ptauName, logger);
	return 0;
}
async function powersOfTauExportChallenge(params, options) {
	let ptauName;
	let challengeName;
	ptauName = params[0];
	if (params.length < 2) challengeName = "challenge";
	else challengeName = params[1];
	if (options.verbose) logplease.default.setLogLevel("DEBUG");
	await exportChallenge(ptauName, challengeName, logger);
	return 0;
}
async function powersOfTauChallengeContribute(params, options) {
	let challengeName;
	let responseName;
	const curve = await getCurveFromName(params[0]);
	challengeName = params[1];
	if (params.length < 3) responseName = changeExt(challengeName, "response");
	else responseName = params[2];
	if (options.verbose) logplease.default.setLogLevel("DEBUG");
	await challengeContribute(curve, challengeName, responseName, options.entropy, logger);
	return 0;
}
async function powersOfTauImport(params, options) {
	let oldPtauName;
	let response;
	let newPtauName;
	let importPoints = true;
	let doCheck = true;
	oldPtauName = params[0];
	response = params[1];
	newPtauName = params[2];
	if (options.nopoints) importPoints = false;
	if (options.nocheck) doCheck = false;
	if (options.verbose) logplease.default.setLogLevel("DEBUG");
	if (await importResponse(oldPtauName, response, newPtauName, options.name, importPoints, logger)) return 0;
	if (!doCheck) return 0;
}
async function powersOfTauVerify(params, options) {
	let ptauName;
	ptauName = params[0];
	if (options.verbose) logplease.default.setLogLevel("DEBUG");
	if (await verify(ptauName, logger) === true) return 0;
	else return 1;
}
async function powersOfTauBeacon(params, options) {
	let oldPtauName;
	let newPtauName;
	let beaconHashStr;
	let numIterationsExp;
	oldPtauName = params[0];
	newPtauName = params[1];
	beaconHashStr = params[2];
	numIterationsExp = params[3];
	if (options.verbose) logplease.default.setLogLevel("DEBUG");
	await beacon$1(oldPtauName, newPtauName, options.name, beaconHashStr, numIterationsExp, logger);
	return 0;
}
async function powersOfTauContribute(params, options) {
	let oldPtauName;
	let newPtauName;
	oldPtauName = params[0];
	newPtauName = params[1];
	if (options.verbose) logplease.default.setLogLevel("DEBUG");
	await contribute(oldPtauName, newPtauName, options.name, options.entropy, logger);
	return 0;
}
async function powersOfTauPreparePhase2(params, options) {
	let oldPtauName;
	let newPtauName;
	oldPtauName = params[0];
	newPtauName = params[1];
	if (options.verbose) logplease.default.setLogLevel("DEBUG");
	await preparePhase2(oldPtauName, newPtauName, logger);
	return 0;
}
async function powersOfTauConvert(params, options) {
	let oldPtauName;
	let newPtauName;
	oldPtauName = params[0];
	newPtauName = params[1];
	if (options.verbose) logplease.default.setLogLevel("DEBUG");
	await convert(oldPtauName, newPtauName, logger);
	return 0;
}
async function powersOfTauTruncate(params, options) {
	let ptauName;
	ptauName = params[0];
	let template = ptauName;
	while (template.length > 0 && template[template.length - 1] != ".") template = template.slice(0, template.length - 1);
	template = template.slice(0, template.length - 1);
	template = template + "_";
	if (options.verbose) logplease.default.setLogLevel("DEBUG");
	await truncate(ptauName, template, logger);
	return 0;
}
async function powersOfTauExportJson(params, options) {
	let ptauName;
	let jsonName;
	ptauName = params[0];
	jsonName = params[1];
	if (options.verbose) logplease.default.setLogLevel("DEBUG");
	const pTauJson = await exportJson(ptauName, logger);
	await (await getBFJ()).write(jsonName, pTauJson, { space: 1 });
}
async function zkeyNew(params, options) {
	let r1csName;
	let ptauName;
	let zkeyName;
	if (params.length < 1) r1csName = "circuit.r1cs";
	else r1csName = params[0];
	if (params.length < 2) ptauName = "powersoftau.ptau";
	else ptauName = params[1];
	if (params.length < 3) zkeyName = "circuit_0000.zkey";
	else zkeyName = params[2];
	if (options.verbose) logplease.default.setLogLevel("DEBUG");
	await newZKey(r1csName, ptauName, zkeyName, logger);
	return 0;
}
async function zkeyExportBellman(params, options) {
	let zkeyName;
	let mpcparamsName;
	zkeyName = params[0];
	if (params.length < 2) mpcparamsName = "circuit.mpcparams";
	else mpcparamsName = params[1];
	if (options.verbose) logplease.default.setLogLevel("DEBUG");
	await phase2exportMPCParams(zkeyName, mpcparamsName, logger);
	return 0;
}
async function zkeyImportBellman(params, options) {
	let zkeyNameOld;
	let mpcParamsName;
	let zkeyNameNew;
	zkeyNameOld = params[0];
	mpcParamsName = params[1];
	zkeyNameNew = params[2];
	if (options.verbose) logplease.default.setLogLevel("DEBUG");
	if (await phase2importMPCParams(zkeyNameOld, mpcParamsName, zkeyNameNew, options.name, logger)) return 0;
	else return 1;
}
async function zkeyVerifyFromR1cs(params, options) {
	let r1csName;
	let ptauName;
	let zkeyName;
	if (params.length < 1) r1csName = "circuit.r1cs";
	else r1csName = params[0];
	if (params.length < 2) ptauName = "powersoftau.ptau";
	else ptauName = params[1];
	if (params.length < 3) zkeyName = "circuit_final.zkey";
	else zkeyName = params[2];
	if (options.verbose) logplease.default.setLogLevel("DEBUG");
	if (await phase2verifyFromR1cs(r1csName, ptauName, zkeyName, logger) === true) return 0;
	else return 1;
}
async function zkeyVerifyFromInit(params, options) {
	let initZKeyName;
	let ptauName;
	let zkeyName;
	if (params.length < 1) initZKeyName = "circuit_0000.zkey";
	else initZKeyName = params[0];
	if (params.length < 2) ptauName = "powersoftau.ptau";
	else ptauName = params[1];
	if (params.length < 3) zkeyName = "circuit_final.zkey";
	else zkeyName = params[2];
	if (options.verbose) logplease.default.setLogLevel("DEBUG");
	if (await phase2verifyFromInit(initZKeyName, ptauName, zkeyName, logger) === true) return 0;
	else return 1;
}
async function zkeyContribute(params, options) {
	let zkeyOldName;
	let zkeyNewName;
	zkeyOldName = params[0];
	zkeyNewName = params[1];
	if (options.verbose) logplease.default.setLogLevel("DEBUG");
	await phase2contribute(zkeyOldName, zkeyNewName, options.name, options.entropy, logger);
	return 0;
}
async function zkeyBeacon(params, options) {
	let zkeyOldName;
	let zkeyNewName;
	let beaconHashStr;
	let numIterationsExp;
	zkeyOldName = params[0];
	zkeyNewName = params[1];
	beaconHashStr = params[2];
	numIterationsExp = params[3];
	if (options.verbose) logplease.default.setLogLevel("DEBUG");
	await beacon(zkeyOldName, zkeyNewName, options.name, beaconHashStr, numIterationsExp, logger);
	return 0;
}
async function zkeyBellmanContribute(params, options) {
	let challengeName;
	let responseName;
	const curve = await getCurveFromName(params[0]);
	challengeName = params[1];
	if (params.length < 3) responseName = changeExt(challengeName, "response");
	else responseName = params[2];
	if (options.verbose) logplease.default.setLogLevel("DEBUG");
	await bellmanContribute(curve, challengeName, responseName, options.entropy, logger);
	return 0;
}
async function plonkSetup(params, options) {
	let r1csName;
	let ptauName;
	let zkeyName;
	if (params.length < 1) r1csName = "circuit.r1cs";
	else r1csName = params[0];
	if (params.length < 2) ptauName = "powersoftau.ptau";
	else ptauName = params[1];
	if (params.length < 3) zkeyName = "circuit.zkey";
	else zkeyName = params[2];
	if (options.verbose) logplease.default.setLogLevel("DEBUG");
	return plonkSetup$1(r1csName, ptauName, zkeyName, logger);
}
async function plonkProve(params, options) {
	const zkeyName = params[0] || "circuit.zkey";
	const witnessName = params[1] || "witness.wtns";
	const proofName = params[2] || "proof.json";
	const publicName = params[3] || "public.json";
	if (options.verbose) logplease.default.setLogLevel("DEBUG");
	const { proof, publicSignals } = await plonk16Prove(zkeyName, witnessName, logger);
	const bfj = await getBFJ();
	await bfj.write(proofName, stringifyBigInts(proof), { space: 1 });
	await bfj.write(publicName, stringifyBigInts(publicSignals), { space: 1 });
	return 0;
}
async function plonkFullProve(params, options) {
	const inputName = params[0] || "input.json";
	const wasmName = params[1] || "circuit.wasm";
	const zkeyName = params[2] || "circuit.zkey";
	const proofName = params[3] || "proof.json";
	const publicName = params[4] || "public.json";
	if (options.verbose) logplease.default.setLogLevel("DEBUG");
	const { proof, publicSignals } = await plonkFullProve$1(JSON.parse(await fs.default.promises.readFile(inputName, "utf8")), wasmName, zkeyName, logger);
	const bfj = await getBFJ();
	await bfj.write(proofName, stringifyBigInts(proof), { space: 1 });
	await bfj.write(publicName, stringifyBigInts(publicSignals), { space: 1 });
	return 0;
}
async function plonkVerify(params, options) {
	const verificationKeyName = params[0] || "verification_key.json";
	const publicName = params[1] || "public.json";
	const proofName = params[2] || "proof.json";
	const verificationKey = JSON.parse(fs.default.readFileSync(verificationKeyName, "utf8"));
	const pub = JSON.parse(fs.default.readFileSync(publicName, "utf8"));
	const proof = JSON.parse(fs.default.readFileSync(proofName, "utf8"));
	if (options.verbose) logplease.default.setLogLevel("DEBUG");
	if (await plonkVerify$1(verificationKey, pub, proof, logger)) return 0;
	else return 1;
}
async function fflonkSetup(params, options) {
	const r1csFilename = params[0] || "circuit.r1cs";
	const ptauFilename = params[1] || "powersoftau.ptau";
	const zkeyFilename = params[2] || "circuit.zkey";
	if (options.verbose) logplease.default.setLogLevel("DEBUG");
	return await fflonkSetup$1(r1csFilename, ptauFilename, zkeyFilename, logger);
}
async function fflonkProve(params, options) {
	const zkeyFilename = params[0] || "circuit.zkey";
	const witnessFilename = params[1] || "witness.wtns";
	const proofFilename = params[2] || "proof.json";
	const publicInputsFilename = params[3] || "public.json";
	if (options.verbose) logplease.default.setLogLevel("DEBUG");
	const { proof, publicSignals } = await fflonkProve$1(zkeyFilename, witnessFilename, logger);
	if (void 0 !== proofFilename && void 0 !== publicInputsFilename) {
		const bfj = await getBFJ();
		await bfj.write(proofFilename, stringifyBigInts(proof), { space: 1 });
		await bfj.write(publicInputsFilename, stringifyBigInts(publicSignals), { space: 1 });
	}
	return 0;
}
async function fflonkFullProve(params, options) {
	const witnessInputsFilename = params[0] || "witness.json";
	const wasmFilename = params[1] || "circuit.wasm";
	const zkeyFilename = params[2] || "circuit.zkey";
	const proofFilename = params[3] || "proof.json";
	const publicInputsFilename = params[4] || "public.json";
	if (options.verbose) logplease.default.setLogLevel("DEBUG");
	const { proof, publicSignals } = await fflonkFullProve$1(JSON.parse(await fs.default.promises.readFile(witnessInputsFilename, "utf8")), wasmFilename, zkeyFilename, logger);
	const bfj = await getBFJ();
	await bfj.write(proofFilename, stringifyBigInts(proof), { space: 1 });
	await bfj.write(publicInputsFilename, stringifyBigInts(publicSignals), { space: 1 });
	return 0;
}
async function fflonkVerify(params, options) {
	const vkeyFilename = params[0] || "circuit.vkey";
	const publicInputsFilename = params[1] || "public.json";
	const proofFilename = params[2] || "proof.json";
	if (options.verbose) logplease.default.setLogLevel("DEBUG");
	return await fflonkVerify$1(JSON.parse(fs.default.readFileSync(vkeyFilename, "utf8")), JSON.parse(fs.default.readFileSync(publicInputsFilename, "utf8")), JSON.parse(fs.default.readFileSync(proofFilename, "utf8")), logger) ? 0 : 1;
}
async function fileInfo(params) {
	const filename = params[0];
	const extension = filename.split(".").pop();
	if (![
		"zkey",
		"r1cs",
		"ptau",
		"wtns"
	].includes(extension)) {
		console.error(`Extension ${extension} is not allowed.`);
		return;
	}
	try {
		const { fd, sections } = await _iden3_binfileutils.readBinFile(filename, extension, 2, 1 << 25, 1 << 23);
		console.log(`File info for    ${filename}`);
		console.log();
		console.log(`File size:       ${fd.totalSize} bytes`);
		console.log(`File type:       ${extension}`);
		console.log(`Version:         ${fd.version}`);
		console.log(`Bin version:     ${fd.binVersion}`);
		console.log("");
		sections.forEach((section, index) => {
			let errors = [];
			if (section.length > 1) errors.push(`Section ${index} has more than one section definition`);
			else if (section[0].size === 0) errors.push(`Section ${index} size is zero. This could cause false errors in other sections.`);
			if (section[0].p + section[0].size > fd.totalSize) errors.push(`Section ${index} is out of bounds of the file.`);
			const color = errors.length === 0 ? "%s%s%s" : "%s\x1B[31m%s\x1B[0m%s";
			const text0 = "section " + ("#" + index).padStart(5, " ");
			const text1 = errors.length === 0 ? "   " : " !!";
			const text2 = ` size: ${section[0].size}\toffset: 0x${(section[0].p - 12).toString(16)}`;
			console.log(color, text0, text1, text2);
			errors.forEach((error) => {
				console.error("\x1B[31m%s\x1B[0m", "                 > " + error);
			});
		});
	} catch (error) {
		console.error(error.message);
	}
}
//#endregion
