

import {getCurveFromName} from "../src/curves.js";



async function run() {

    const curve = await getCurveFromName("bn128");

    const Fr = curve.Fr;

    Fr.s = 2;

    const p = [Fr.e(1), Fr.e(2), Fr.e(3), Fr.e(4)];
    printArr("p", p);

    const pz = [];

    for (let i=0; i<4; i++) {
        pz[i] = Fr.neg(p[i]);
        pz[i+4] = p[i];
    }
    printArr("pz", pz);

    const PZ = await Fr.fft(pz);
    printArr("PZ", PZ);

    const pOdd = [];

    let accShift;
    const shift_to_small_m = Fr.exp(Fr.shift, 4);
    // accShift = Fr.e(-1);
    accShift = Fr.sub(shift_to_small_m, Fr.one);
    for (let i=0; i<4; i++) {
        pOdd[i] = Fr.mul(p[i], accShift);
        accShift = Fr.mul(accShift, Fr.shift);
    }

    printArr("pOdd", pOdd);

    const POdd = await Fr.fft(pOdd);

    printArr("POdd", POdd);

    function printArr(s, a) {
        console.log(s+": [");
        for (let i=0; i<a.length; i++) {
            console.log("    "+ Fr.toString(a[i]));
        }
        console.log("]");
    }

    function lc(a, b) {
        let acc = Fr.e(0);
        for (let i=0; i<a.length; i++) {
            acc = Fr.add(acc, Fr.mul(a[i], b[i]));
        }
        return acc;
    }

}

run().then( () => {
    process.exit(0);
});
