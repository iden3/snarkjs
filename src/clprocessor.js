/*
import pkg from "../package.json";
const version = pkg.version;
*/


import path from "path";
import fs from "fs";
const __dirname = path.dirname(new URL(import.meta.url).pathname);

let pkgS;
try {
    pkgS = fs.readFileSync(path.join(__dirname, "package.json"));
} catch (err) {
    pkgS = fs.readFileSync(path.join(__dirname, "..","package.json"));
}

const pkg = JSON.parse(pkgS);
const version = pkg.version;
let selectedCommand = null;

export default async function clProcessor(commands) {
    const cl = [];
    const argv = {};
    for (let i=2; i<process.argv.length; i++) {
        if (process.argv[i][0] == "-") {
            let S = process.argv[i];
            while (S[0] == "-") S = S.slice(1);
            const arr = S.split("=");
            if (arr.length > 1) {
                argv[arr[0]] = arr.slice(1).join("=");
            } else {
                argv[arr[0]] = true;
            }
        } else {
            cl.push(process.argv[i]);
        }
    }
    for (let i=0; i<commands.length; i++) {
        const cmd = commands[i];
        const m = calculateMatch(commands[i], cl);
        if (m) {
            if ((argv.h) || (argv.help)) {
                helpCmd(cmd);
                return;
            }
            if (areParamsValid(cmd.cmd, m)) {
                if (cmd.options) {
                    const options = getOptions(cmd.options);
                    await cmd.action(m, options);
                } else {
                    await cmd.action(m, {});
                }
            } else {
                if (m.length>0) console.log("Invalid number of parameters");
                helpCmd(cmd);
                return 99;
            }
            return;
        }
    }
    if (cl.length>0) console.log("Invalid command");
    helpAll();
    return 99;

    function calculateMatch(cmd, cl) {
        const alias = [];
        const m = parseLine(cmd.cmd);
        alias.push(m);
        if (cmd.alias) {
            if (Array.isArray(cmd.alias)) {
                for (let i=0; i<cmd.alias.length; i++) {
                    const a = parseLine(cmd.alias[i]);
                    alias.push({
                        cmd: a.cmd,
                        params: m.params
                    });
                }
            } else {
                const a = parseLine(cmd.alias);
                alias.push({
                    cmd: a.cmd,
                    params: m.params
                });
            }
        }
        for (let i=0; i<cl.length; i++) {
            for (let j=0; j<alias.length; j++) {
                const w = alias[j].cmd.shift();
                if (cl[i].toUpperCase() == w.toUpperCase()) {
                    if (alias[j].cmd.length == 0) {
                        return buildRemaining(alias[j].params, cl.slice(i+1));
                    }
                } else {
                    alias.splice(j, 1);
                    j--;
                }
            }
        }
        return null;


        function buildRemaining(defParams, cl) {
            const res = [];
            let p=0;
            for (let i=0; i<defParams.length; i++) {
                if (defParams[i][0]=="-") {
                    res.push(getOption(defParams[i]).val);
                } else {
                    if (p<cl.length) {
                        res.push(cl[p++]);
                    } else {
                        res.push(null);
                    }
                }
            }
            while (p<cl.length) {
                res.push(cl[p++]);
            }
            return res;
        }
    }

    function parseLine(l) {
        const words = l.match(/(\S+)/g);
        for (let i=0; i<words.length; i++) {
            if  (   (words[i][0] == "<")
                 || (words[i][0] == "[")
                 || (words[i][0] == "-"))
            {
                return {
                    cmd: words.slice(0,i),
                    params: words.slice(i)
                };
            }
        }
        return {
            cmd: words,
            params: []
        };
    }


    function getOption(o) {
        const arr1 = o.slice(1).split(":");
        const arr2 = arr1[0].split("|");
        for (let i = 0; i<arr2.length; i++) {
            if (argv[arr2[i]]) return {
                key: arr2[0],
                val: argv[arr2[i]]
            };
        }
        return {
            key: arr2[0],
            val: (arr1.length >1) ? arr1[1] : null
        };
    }


    function areParamsValid(cmd, params) {
        while ((params.length)&&(!params[params.length-1])) params.pop();
        const pl = parseLine(cmd);
        if (params.length > pl.params.length) return false;
        let minParams = pl.params.length;
        while ((minParams>0)&&(pl.params[minParams-1][0] == "[")) minParams --;
        if (params.length < minParams) return false;

        for (let i=0; (i< pl.params.length)&&(pl.params[i][0]=="<"); i++) {
            if (typeof params[i] == "undefined") return false;
        }
        return true;
    }

    function getOptions(options) {
        const res = {};
        const opts = options.match(/(\S+)/g);
        for (let i=0; i<opts.length; i++) {
            const o = getOption(opts[i]);
            res[o.key] = o.val;
        }
        return res;
    }

    function printVersion() {
        console.log("snarkjs@"+version);
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
        console.log("   or   snarkjs <shorcut> ...  <options>");
        console.log("");
        console.log("Type snarkjs <command> --help to get more information for that command");
        console.log("");
        console.log("Full Command                  Description");
        console.log("============                  =================");
        for (let i=0; i<commands.length; i++) {
            const cmd = commands[i];
            let S = "";
            const pl = parseLine(cmd.cmd);
            S += pl.cmd.join(" ");
            while (S.length<30) S = S+" ";
            S += cmd.description;
            console.log(S);
            S = "     Usage:  snarkjs ";
            if (cmd.alias) {
                if (Array.isArray(cmd.alias)) {
                    S += cmd.alias[0];
                } else {
                    S += cmd.alias;
                }
            } else {
                S += pl.cmd.join(" ");
            }
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
        if (cmd.longDescription) {
            console.log(cmd.longDescription);
        } else {
            console.log(cmd.description);
        }
        console.log("Usage: ");
        console.log("        snarkjs "+ cmd.cmd);
        const pl = parseLine(cmd.cmd);
        let S = "   or   snarkjs ";
        if (cmd.alias) {
            if (Array.isArray(cmd.alias)) {
                S += cmd.alias[0];
            } else {
                S += cmd.alias;
            }
        } else {
            S += pl.cmd.join(" ");
        }
        S += " " + pl.params.join(" ");
        console.log(S);



        console.log("");
    }
}

