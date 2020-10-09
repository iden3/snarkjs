import {readR1cs}  from "r1csfile";

export function stringifyBigInts(Fr, o) {
    if (o instanceof Uint8Array)  {
        return Fr.toString(o);
    } else if (Array.isArray(o)) {
        return o.map(stringifyBigInts.bind(null, Fr));
    } else if (typeof o == "object") {
        const res = {};
        const keys = Object.keys(o);
        keys.forEach( (k) => {
            res[k] = stringifyBigInts(Fr, o[k]);
        });
        return res;
    } else if ((typeof(o) == "bigint") || o.eq !== undefined)  {
        return o.toString(10);
    } else {
        return o;
    }
}


export default async function r1csExportJson(r1csFileName, logger) {

    const cir = await readR1cs(r1csFileName, true, true, true, logger);
    const Fr=cir.curve.Fr;
    delete cir.curve;

    return stringifyBigInts(Fr, cir);
}
