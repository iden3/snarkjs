

import {getCurveFromName} from "../src/curves.js";



async function run() {

    const curve = await getCurveFromName("bn128");

    const Fr = curve.Fr;

    Fr.s = 2;

    const powers = [];
    let t;
    let inc = Fr.e(2);

    t = Fr.e(1);
    for (let i=0; i<8; i++) {
        powers[i] = t;
        t = Fr.mul(t, inc);
    }

    printArr("powers", powers);

    const shift_to_small_m = Fr.exp(Fr.shift, 4);
    const one_over_denom = Fr.inv(Fr.sub(shift_to_small_m, Fr.one));

    const t0=[];
    const t1=[];
    let sInvAcc = Fr.one;
    for (let i=0; i<4; i++) {
        t0[i] =
            Fr.mul(
                Fr.sub(
                    powers[i+4],
                    Fr.mul(shift_to_small_m, powers[i])
                ),
                Fr.neg(one_over_denom)
            );
        t1[i] =
            Fr.mul(
                Fr.mul(
                    Fr.sub(powers[i+4], powers[i]),
                    sInvAcc
                ),
                one_over_denom
            );

        sInvAcc = Fr.mul(sInvAcc, Fr.shiftInv);
    }

    printArr("t0", t0);
    printArr("t1", t1);

    const T0 = await Fr.ifft(t0);
    const T1 = await Fr.ifft(t1);

    printArr("T0", T0);
    printArr("T1", T1);

    const lEvs = [];
    for (let i=0; i<4; i++) {
        lEvs[i] = T0[i];
        lEvs[i+4] =T1[i];
    }

    printArr("LEvs", lEvs);



    const p = [Fr.e(10), Fr.e(22), Fr.e(324), Fr.e(46), Fr.e(35), Fr.e(56), Fr.e(557), Fr.e(18)];

    const pt = lc(p, powers);
    console.log( "p[t]: " + Fr.toString(pt) );

    const P = await Fr.fft(p);


    const Pt = lc(P, lEvs);

    console.log( "P[t]: " + Fr.toString(Pt) );

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
