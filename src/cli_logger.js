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

// Zero-dependency replacement for logplease, covering exactly the surface the
// CLI uses: create(name, opts), setLogLevel(level), and per-level methods on
// the returned logger. The line format and colors mirror logplease's
// "[LEVEL]  name: message" output so existing log-scraping keeps working.

const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, NONE: 4 };

const LEVEL_COLORS = {
    DEBUG: "\x1b[34;22m",
    INFO: "\x1b[32;22m",
    WARN: "\x1b[33;22m",
    ERROR: "\x1b[31;22m",
};
const NAME_COLOR = "\x1b[39;1m";
const RESET = "\x1b[0m";

let globalLevel = "INFO";

export function setLogLevel(level) {
    const l = String(level).toUpperCase();
    if (LEVELS[l] === undefined) throw new Error(`Unknown log level: ${level}`);
    globalLevel = l;
}

export function create(name /*, options (ignored: no timestamps) */) {
    function emit(level, args) {
        if (LEVELS[level] < LEVELS[globalLevel]) return;
        const tag = `[${level}]`.padEnd(8);
        const line = `${LEVEL_COLORS[level]}${tag}${NAME_COLOR}${name}${RESET}:`;
        (level === "ERROR" ? console.error : console.log)(line, ...args);
    }
    return {
        debug: (...args) => emit("DEBUG", args),
        info: (...args) => emit("INFO", args),
        warn: (...args) => emit("WARN", args),
        error: (...args) => emit("ERROR", args),
    };
}

export default { create, setLogLevel };
