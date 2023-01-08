/*
    Copyright 2022 Polygon Hermez https://hermez.io

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

import CustomGate from "./cg_base.js";
import {log2} from "../misc.js";

export const RANGE_CHECK_ID = 9;
export const RANGE_CHECK_NAME = "RANGECHECK";

const ZK_RANGE_CHECK_Q_MAP_SECTION = 4096;
const ZK_RANGE_CHECK_HEADER_SECTION = 4097;

// lookup table constants
export const C = 1 << 0;
export const N = 1 << 10;
export const MAX_RANGE = C * (N - 1);

// circuit constants
export const CIRCUIT_POWER = log2(N);
export const DOMAIN_SIZE = N;


class RangeCheckCG extends CustomGate {
    constructor(options) {
        super(RANGE_CHECK_ID, RANGE_CHECK_NAME, options.parameters);
        return this;
    }

    get qMapSectionId() {
        return ZK_RANGE_CHECK_Q_MAP_SECTION;
    }

    get preprocessedSectionId() {
        return ZK_RANGE_CHECK_HEADER_SECTION;
    }

    get domainSize() {
        return DOMAIN_SIZE;
    }

    get cirPower() {
        return CIRCUIT_POWER;
    }

    plonkConstraints(signals, Fr) {
        //signals[0] = lower_bound
        //signals[1] = upper_bound
        //signals[2] = to_check
        return [
            { //to_check - lower_bound >= 0
                sl: signals[2], sr: signals[0], so: 0,
                ql: Fr.one, qr: Fr.neg(Fr.one),
                qo: Fr.zero, qm: Fr.zero, qc: Fr.zero,
                qk: Fr.one
            },
            { //upper_bound - to_check >= 0
                sl: signals[1], sr: signals[2], so: 0,
                ql: Fr.one, qr: Fr.neg(Fr.one),
                qo: Fr.zero, qm: Fr.zero, qc: Fr.zero,
                qk: Fr.one
            }
        ];
    }

    plonkFactor(a, b, c, Fr) {
        return Fr.add(Fr.neg(a), b);
    }

    preprocessedInput() {
        let res = {};

        res.data = {power: this.cirPower, maxRange: MAX_RANGE, c: C};

        return res;
    }

    get preprocessedInputKeys() {
        return {
            data: ["power", "maxRange", "c"],
        };
    }

    solidityCallDataKeys() {
        let arrQ = [];
        for (let i = 0; i < C; i++) {
            arrQ.push(`Q${i}`);
        }

        return {
            polynomials: ["F", "LT", "H1", "H2", "Z", "Wxi", "Wxiw"].concat(arrQ),
            evaluations: ["f", "lt", "h1", "h2", "zw", "h1w", "r"]
        };
    }

    async readZKeyPreprocessedInput(fd, sections, Fr) {
        return {};
    }

    computeWitness(witness, Fr) {
        return [
            Fr.sub(witness[2], witness[0]),
            Fr.sub(witness[1], witness[2])
        ].sort((a, b) => {
            let diff = Fr.sub(a, b);

            if (Fr.isNegative(diff)) {
                return -1;
            }
            if (Fr.isZero(diff)) {
                return 0;
            }
            return 1;
        });
    }
}

export default RangeCheckCG;