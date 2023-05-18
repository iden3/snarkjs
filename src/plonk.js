/*
    Copyright 2018 0KIMS association.

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

// ZKEY constants
export const ZKEY_PL_NSECTIONS = 13;

export const ZKEY_PL_HEADER_SECTION = 2;
export const ZKEY_PL_ADDITIONS_SECTION = 3;
export const ZKEY_PL_A_MAP_SECTION = 4;
export const ZKEY_PL_B_MAP_SECTION = 5;
export const ZKEY_PL_C_MAP_SECTION = 6;
export const ZKEY_PL_QM_SECTION = 7;
export const ZKEY_PL_QL_SECTION = 8;
export const ZKEY_PL_QR_SECTION = 9;
export const ZKEY_PL_QO_SECTION = 10;
export const ZKEY_PL_QC_SECTION = 11;
export const ZKEY_PL_SIGMA_SECTION = 12;
export const ZKEY_PL_LAGRANGE_SECTION = 13;
export const ZKEY_PL_PTAU_SECTION = 14;

export {default as setup} from "./plonk_setup.js";
export {default as fullProve} from "./plonk_fullprove.js";
export {default as prove} from "./plonk_prove.js";
export {default as verify} from "./plonk_verify.js";
export {default as exportSolidityCallData} from "./plonk_exportsoliditycalldata.js";
