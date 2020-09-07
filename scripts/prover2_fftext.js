

import {getCurveFromName} from "../src/curves.js";



async function run() {

    const curve = await getCurveFromName("bn128");

    const Fr = curve.Fr;

    Fr.s = 2;

    const P = [Fr.e(1), Fr.e(2), Fr.e(3), Fr.e(4)];

    printArr("P", P);

    const p = await Fr.ifft(P);

    printArr("p", p);

    const p2 = [];

    for (let i=0; i<4; i++) {
        p2[i] = p[i];
        p2[i+4] = Fr.zero;
    }

    printArr("p2", p2);

    const P2 = await Fr.fft(p2);
    printArr("P2", P2);

    const pOdd = [];

    let accShift;
    const shift_to_small_m = Fr.exp(Fr.shift, 4);
    // accShift = Fr.e(-1);
    // accShift = Fr.sub(Fr.one, shift_to_small_m);
    accShift = Fr.one;
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
