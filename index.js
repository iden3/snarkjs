/*
    Copyright 2018 0kims association.

    This file is part of zksnark JavaScript library.

    zksnark JavaScript library is a free software: you can redistribute it and/or 
    modify it under the terms of the GNU General Public License as published by the 
    Free Software Foundation, either version 3 of the License, or (at your option) 
    any later version.

    zksnark JavaScript library is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY 
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for 
    more details.

    You should have received a copy of the GNU General Public License along with 
    zksnark JavaScript library. If not, see <https://www.gnu.org/licenses/>.
*/

exports.Circuit = require("./src/circuit.js");
exports.setup = require("./src/setup.js");
exports.genProof = require("./src/prover.js");
exports.isValid = require("./src/verifier.js");
exports.bigInt = require("./src/bigint.js");
