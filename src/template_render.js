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

export function render(template, data) {
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
    src += "__out += " + JSON.stringify(template.slice(last)) + ";\n}\nreturn __out;";

    const fn = new Function("__locals", "__esc", "__raw", src);
    return fn(data, escapedOutput, rawOutput);
}
