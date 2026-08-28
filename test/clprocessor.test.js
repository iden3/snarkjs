import clProcessor from "../src/clprocessor.js";
import assert from "assert";

// Unit tests for the CLI processor extensions that plugin commands rely on:
// variadic tail params, opt-in unknown-flag passthrough, deferred help.
// clProcessor reads process.argv, so each case swaps it and restores after.

async function run(args, commands) {
    const saved = process.argv;
    process.argv = ["node", "cli.js", ...args];
    try {
        return await clProcessor(commands);
    } finally {
        process.argv = saved;
    }
}

function capture(decl) {
    const got = {};
    return {
        got,
        cmd: {
            ...decl,
            action: async (params, options) => {
                got.params = params;
                got.options = options;
                return 0;
            },
        },
    };
}

describe("clprocessor plugin-command extensions", function () {

    it("a trailing [params...] accepts any number of surplus positionals", async () => {
        const { got, cmd } = capture({ cmd: "thing export <plugin> [params...]", description: "t" });
        await run(["thing", "export", "solidity", "a.zkey", "out.sol", "extra1", "extra2"], [cmd]);
        assert.deepStrictEqual(got.params, ["solidity", "a.zkey", "out.sol", "extra1", "extra2"]);
    });

    it("without the variadic marker surplus positionals are still rejected", async () => {
        const { got, cmd } = capture({ cmd: "thing export <plugin> [one]", description: "t" });
        const res = await run(["thing", "export", "solidity", "a", "b"], [cmd]);
        assert.strictEqual(got.params, undefined);
        assert.strictEqual(res, 99);
    });

    it("a variadic command still requires its <required> params", async () => {
        const { got, cmd } = capture({ cmd: "thing export <plugin> [params...]", description: "t" });
        const res = await run(["thing", "export"], [cmd]);
        assert.strictEqual(got.params, undefined);
        assert.strictEqual(res, 99);
    });

    it("allowUnknownOptions passes undeclared --flags via options.pluginArgv", async () => {
        const { got, cmd } = capture({
            cmd: "thing export <plugin> [params...]", description: "t",
            options: "-verbose|v", allowUnknownOptions: true,
        });
        await run(["thing", "export", "p", "--foo=bar", "--flag", "-v"], [cmd]);
        assert.strictEqual(got.options.verbose, true);
        assert.deepStrictEqual(got.options.pluginArgv, { foo: "bar", flag: true, v: true });
    });

    it("unknown --flags stay invisible without the opt-in", async () => {
        const { got, cmd } = capture({
            cmd: "thing export <plugin> [params...]", description: "t", options: "-verbose|v",
        });
        await run(["thing", "export", "p", "--foo=bar"], [cmd]);
        assert.strictEqual(got.options.pluginArgv, undefined);
        assert.strictEqual(got.options.foo, undefined);
    });

    it("deferHelp routes --help into the action instead of printing generic help", async () => {
        const { got, cmd } = capture({
            cmd: "thing export <plugin> [params...]", description: "t",
            allowUnknownOptions: true, deferHelp: true,
        });
        await run(["thing", "export", "p", "--help"], [cmd]);
        assert.strictEqual(got.options.help, true);
        assert.deepStrictEqual(got.options.pluginArgv, {}); // h/help stripped
    });

    it("without deferHelp, --help short-circuits before the action", async () => {
        const { got, cmd } = capture({ cmd: "thing export <plugin> [params...]", description: "t" });
        await run(["thing", "export", "p", "--help"], [cmd]);
        assert.strictEqual(got.params, undefined);
    });
});
