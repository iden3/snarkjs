/*
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

import * as babyPlonk from "../babyplonk.js";

export async function babyPlonkSetup(r1csFilename, ptauFilename, pkeyFilename, vkeyFilename, logger) {
    return babyPlonk.setup(r1csFilename, ptauFilename, pkeyFilename, vkeyFilename, logger);
}