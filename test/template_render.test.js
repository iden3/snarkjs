import { render, assertDecimalStringLeaves } from "../src/template_render.js";
import assert from "assert";

// The engine's contract is byte-identity with ejs.render for the subset the
// Solidity verifier templates use (verified against ejs on all three real
// templates before ejs was removed); these cases pin each construct.

describe("template renderer (ejs subset)", function () {
    it("interpolates escaped and raw outputs with with-scoping", () => {
        assert.strictEqual(
            render("hello <%= who %> (<%- who %>)", { who: "world" }),
            "hello world (world)");
    });

    it("escapes XML entities in <%= but not in <%-", () => {
        assert.strictEqual(
            render("<%= v %>|<%- v %>", { v: "a<b&\"c'" }),
            "a&lt;b&amp;&#34;c&#39;|a<b&\"c'");
    });

    it("renders null/undefined as empty, like ejs", () => {
        assert.strictEqual(render("[<%= a %>][<%- b %>]", { a: null, b: undefined }), "[][]");
    });

    it("runs scriptlets with loops and locals", () => {
        const t = "<% for (let i = 1; i <= n; i++) { %>x<%= i %>\n<% } %>";
        assert.strictEqual(render(t, { n: 3 }), "x1\nx2\nx3\n");
    });

    it("-%> slurps exactly the one following newline", () => {
        assert.strictEqual(render("a<% const x = 1; -%>\nb<%= x %>\n", {}), "ab1\n");
        // plain %> keeps its newline
        assert.strictEqual(render("a<% const y = 1; %>\nb<%= y %>", {}), "a\nb1");
    });

    it("data values are never evaluated as template or code", () => {
        const out = render("v=<%= x %>", { x: "<%= 1 + 1 %><% globalThis.zzPwned = 1 %>" });
        assert.strictEqual(out, "v=&lt;%= 1 + 1 %&gt;&lt;% globalThis.zzPwned = 1 %&gt;");
        assert.strictEqual(globalThis.zzPwned, undefined);
    });

    it("rejects data keys that would shadow the renderer's internals", () => {
        for (const k of ["__out", "__esc", "__raw", "__locals"]) {
            assert.throws(() => render("<%= x %>", { x: 1, [k]: "boom" }), /collides with the renderer/);
        }
    });

    it("fails closed on an unterminated tag and a missing template", () => {
        assert.throws(() => render("abc <% never closed", {}), /unterminated/);
        assert.throws(() => render(undefined, {}), /template must be a string/);
    });

    it("assertDecimalStringLeaves accepts vk-shaped data and rejects source-shaped values", () => {
        assertDecimalStringLeaves({
            protocol: "groth16", curve: "bn128", nPublic: 2,
            vk_alpha_1: ["123", "456", "1"], IC: [["7", "8", "1"]],
        }, ["protocol", "curve"]);
        assert.throws(
            () => assertDecimalStringLeaves({ IC: [["1; } function pwn() { //"]] }, []),
            /not a decimal number/);
        assert.throws(() => assertDecimalStringLeaves({ n: Infinity }, []), /finite/);
    });

    it("handles the fflonk-style accumulating scriptlet pattern", () => {
        const t = "<% const arr = []; -%>\n" +
            "<% for (let i = 1; i <= Math.max(n, 1); i++) { -%>\n" +
            "<%      arr.push(`pEval_l${i}`); -%>\n" +
            "<% } -%>\n" +
            "<%- arr.join(\",\") %>";
        assert.strictEqual(render(t, { n: 3 }), "pEval_l1,pEval_l2,pEval_l3");
    });
});
