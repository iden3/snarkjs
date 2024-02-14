/*
    Copyright 2024 0KIMS association.

    This file is part of snarkJS.

    snarkJS is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    snarkJS is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with snarkJS. If not, see <https://www.gnu.org/licenses/>.
*/
import { utils } from "ffjavascript";
const { unstringifyBigInts } = utils;

function cli_n(n) {
    let nstr = n.toString(16);
    return `0x${nstr}`;
}

function sdk_n(n) {
    let nstr = n.toString(10);
    return `${nstr}n`;
}

export default async function groth16ExportSophiaCalldata(_proof, _pub, type) {
    const proof = unstringifyBigInts(_proof);
    const pub = unstringifyBigInts(_pub);


    let S;

    if (type == "cli") {
        let inputs = "";
        for (let i=0; i<pub.length; i++) {
            if (inputs != "") inputs = inputs + ",";
            inputs = inputs + cli_n(pub[i]);
        }

        S = `aesophia_cli --create_calldata --call "verify([${inputs}], ` +
            `{a = (${cli_n(proof.pi_a[0])}, ${cli_n(proof.pi_a[1])}),` +
            ` b = ((${cli_n(proof.pi_b[0][0])}, ${cli_n(proof.pi_b[0][1])}), (${cli_n(proof.pi_b[1][0])}, ${cli_n(proof.pi_b[1][1])})),` +
            ` c = (${cli_n(proof.pi_c[0])}, ${cli_n(proof.pi_c[1])})})" verifier.aes`;

    } else {
        S = "verify(\n";
        if (pub.length == 0) {
            S = S + "  [],\n";
        } else if(pub.length == 1) {
            S = S + `  [${sdk_n(pub[0])}],\n`;
        } else {
            S = S + `  [ ${sdk_n(pub[0])}\n`;
            for (let i = 1; i < pub.length; i++) {
                S = S + `  , ${sdk_n(pub[i])}\n`;
            }
            S = S + "  ],\n";
        }

        S = S +
            `  {\n` +
            `    a: [\n` +
            `        ${sdk_n(proof.pi_a[0])},\n` +
            `        ${sdk_n(proof.pi_a[1])},\n` +
            `    ],\n` +
            `    b: [\n` +
            `        [\n` +
            `         ${sdk_n(proof.pi_b[0][0])},\n` +
            `         ${sdk_n(proof.pi_b[0][1])},\n` +
            `        ],\n` +
            `        [\n` +
            `         ${sdk_n(proof.pi_b[1][0])},\n` +
            `         ${sdk_n(proof.pi_b[1][1])},\n` +
            `        ],\n` +
            `    ],\n` +
            `    c: [\n` +
            `        ${sdk_n(proof.pi_c[0])},\n` +
            `        ${sdk_n(proof.pi_c[1])},\n` +
            `    ],\n` +
            `  })`;
    }

    return S;
}
