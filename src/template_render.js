/*
    Copyright 2026 0KIMS association.

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

// Zero-dependency replacement for ejs.render(template, data), implementing
// exactly the subset the Solidity verifier templates use, with ejs's
// semantics so the rendered contracts stay byte-identical:
//   <% code %>     scriptlet (loops, lets)
//   <%= expr %>    output, XML-escaped (a no-op for the numeric/identifier
//                  values the templates emit, but kept for exactness)
//   <%- expr %>    raw output
//   ... -%>        slurp the single newline following the tag
//   null/undefined outputs render as ""
// Like ejs, the compiled template exposes the data's properties as bare
// locals (with-scoping), and compilation uses the Function constructor --
// templates are trusted repo/caller input, exactly as they were with ejs.

const ESCAPE = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&#34;", "'": "&#39;" };

function escapedOutput(v) {
    if (v === undefined || v === null) return "";
    return String(v).replace(/[&<>"']/g, (c) => ESCAPE[c]);
}

function rawOutput(v) {
    if (v === undefined || v === null) return "";
    return String(v);
}

// Defense-in-depth for callers that build the data object from untrusted
// input (e.g. a service exporting a verifier from an uploaded vkey JSON):
// assert that every string leaf that could reach the rendered output is a
// plain decimal number, so no value can smuggle source text into the
// generated contract. Keys in exemptKeys (protocol/curve tags) are skipped.
export function assertDecimalStringLeaves(value, exemptKeys = [], path = "vk") {
    const exempt = new Set(exemptKeys);
    (function walk(v, p) {
        if (Array.isArray(v)) {
            v.forEach((x, i) => walk(x, `${p}[${i}]`));
        } else if (v !== null && typeof v === "object") {
            for (const k of Object.keys(v)) {
                if (!exempt.has(k)) walk(v[k], `${p}.${k}`);
            }
        } else if (typeof v === "string") {
            if (!/^[0-9]+$/.test(v)) throw new Error(`${p} is not a decimal number: ${JSON.stringify(v.slice(0, 60))}`);
        } else if (typeof v === "number") {
            if (!Number.isFinite(v)) throw new Error(`${p} is not a finite number`);
        } else if (v !== null && v !== undefined && typeof v !== "boolean") {
            throw new Error(`${p} has non-serializable type ${typeof v}`);
        }
    })(value, path);
}

export function render(template, data) {
    if (typeof template !== "string") {
        throw new TypeError("render: template must be a string (is the template for this protocol loaded?)");
    }
    // The data's own property names become bindings inside the compiled
    // template (with-scoping, as in ejs); refuse names that would shadow
    // the renderer's internals -- a "__out" key would silently produce an
    // empty document, a "__esc"/"__raw" key a confusing TypeError.
    for (const k of Object.keys(data)) {
        if (k.startsWith("__")) {
            throw new Error(`render: data key ${JSON.stringify(k)} collides with the renderer's internals`);
        }
    }
    const tag = /<%([=-]?)([\s\S]*?)([-_]?)%>/g;
    let src = "let __out = \"\";\nwith (__locals) {\n";
    let last = 0;
    let m;
    while ((m = tag.exec(template)) !== null) {
        src += "__out += " + JSON.stringify(template.slice(last, m.index)) + ";\n";
        const [, type, code, trim] = m;
        if (type === "=") {
            src += "__out += __esc((" + code + "));\n";
        } else if (type === "-") {
            src += "__out += __raw((" + code + "));\n";
        } else {
            src += code + "\n";
        }
        last = tag.lastIndex;
        if (trim === "-" || trim === "_") {
            if (template[last] === "\r") last++;
            if (template[last] === "\n") last++;
            tag.lastIndex = last;
        }
    }
    const tail = template.slice(last);
    if (tail.includes("<%")) {
        // fail closed on a truncated/malformed template instead of emitting
        // the raw tag text into the rendered document (ejs threw here too)
        throw new Error("render: unterminated <% tag");
    }
    src += "__out += " + JSON.stringify(tail) + ";\n}\nreturn __out;";

    const fn = new Function("__locals", "__esc", "__raw", src);
    return fn(data, escapedOutput, rawOutput);
}
