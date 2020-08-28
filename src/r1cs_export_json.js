import {load as loadR1cs}  from "r1csfile";

export default async function r1csExportJson(r1csFileName, logger) {

    const cir = await loadR1cs(r1csFileName, true, true);

    return cir;
}
