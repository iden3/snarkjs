/*
    Copyright 2026 iden3 association.

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

// Zero-dependency replacement for bfj's write(file, value, {space}): stream
// a value to disk as JSON, byte-identical to JSON.stringify(value, null,
// space), without ever materializing the whole document as one string. The
// exported JSONs (r1cs constraints, ptau points, witnesses) reach hundreds
// of MB, which is exactly why the writer is incremental: it walks the value
// with an explicit stack and flushes fixed-size chunks with backpressure.

import fs from "fs";

const FLUSH_THRESHOLD = 1 << 20; // 1 MiB per write() call

export async function writeJsonFile(fileName, value, space = 1) {
    const out = fs.createWriteStream(fileName);
    const parts = [];
    let partsBytes = 0;

    async function flush() {
        if (parts.length === 0) return;
        const chunk = parts.join("");
        parts.length = 0;
        partsBytes = 0;
        if (!out.write(chunk)) {
            await new Promise((res, rej) => {
                out.once("drain", res);
                out.once("error", rej);
            });
        }
    }
    function push(s) {
        parts.push(s);
        partsBytes += s.length;
    }

    const indentUnit = typeof space === "number" ? " ".repeat(space) : String(space);
    const pretty = indentUnit.length > 0;
    const colon = pretty ? ": " : ":";

    // Explicit-stack traversal so multi-million-element arrays neither
    // recurse nor serialize in one piece. Each frame is a container being
    // emitted; primitives are written directly via JSON.stringify, which
    // also owns all string escaping.
    //
    // Semantics mirror JSON.stringify: toJSON() is honored, undefined /
    // functions / symbols become null inside arrays and are skipped inside
    // objects, and an undefined top-level value writes the file "undefined"
    // would -- there is no such case in the CLI, so it is simply rejected.
    function normalize(v) {
        if (v !== null && typeof v === "object" && typeof v.toJSON === "function") v = v.toJSON();
        if (typeof v === "bigint") throw new TypeError("Do not know how to serialize a BigInt");
        return v;
    }

    const rootVal = normalize(value);
    if (rootVal === undefined || typeof rootVal === "function" || typeof rootVal === "symbol") {
        throw new TypeError("writeJsonFile: top-level value is not JSON-serializable");
    }

    const stack = [];

    function open(v, depth) {
        // returns true when v is a container that was pushed on the stack
        if (v !== null && typeof v === "object") {
            if (Array.isArray(v)) {
                stack.push({ arr: v, i: 0, depth });
                push("[");
                return true;
            }
            stack.push({ obj: v, keys: Object.keys(v), i: 0, first: true, depth });
            push("{");
            return true;
        }
        push(JSON.stringify(v) ?? "null");
        return false;
    }

    open(rootVal, 0);

    while (stack.length > 0) {
        const f = stack[stack.length - 1];
        const childIndent = pretty ? "\n" + indentUnit.repeat(f.depth + 1) : "";

        if (f.arr !== undefined) {
            if (f.i >= f.arr.length) {
                stack.pop();
                if (pretty && f.arr.length > 0) push("\n" + indentUnit.repeat(f.depth));
                push("]");
            } else {
                if (f.i > 0) push(",");
                push(childIndent);
                let v = normalize(f.arr[f.i]);
                if (v === undefined || typeof v === "function" || typeof v === "symbol") v = null;
                f.i++;
                open(v, f.depth + 1);
            }
        } else {
            let advanced = false;
            while (f.i < f.keys.length) {
                const k = f.keys[f.i];
                const v = normalize(f.obj[k]);
                f.i++;
                if (v === undefined || typeof v === "function" || typeof v === "symbol") continue;
                if (!f.first) push(",");
                f.first = false;
                push(childIndent + JSON.stringify(k) + colon);
                open(v, f.depth + 1);
                advanced = true;
                break;
            }
            if (!advanced && f.i >= f.keys.length) {
                stack.pop();
                if (pretty && !f.first) push("\n" + indentUnit.repeat(f.depth));
                push("}");
            }
        }

        if (partsBytes >= FLUSH_THRESHOLD) await flush();
    }

    await flush();
    await new Promise((res, rej) => {
        out.once("error", rej);
        out.end(res);
    });
}
