
const bigInt = require("../src/bigint.js");
const ZqField = require("../src/zqfield.js");


const r = bigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");
const s = 28;
const nqr_to_t = bigInt("19103219067921713944291392827692070036145651957329286315305642004821462161904");
const t_minus_1_over_2 = bigInt("40770029410420498293352137776570907027550720424234931066070132305055");
const root_unity = bigInt("19103219067921713944291392827692070036145651957329286315305642004821462161904");
const t = bigInt("81540058820840996586704275553141814055101440848469862132140264610111");

const F = new ZqField(r);

function sqrt(a) {

    let v = s;
    let z = nqr_to_t;
    let w = F.exp(a, t_minus_1_over_2);
    let x = F.mul(a, w);
    let b = F.mul(x, w);


    // compute square root with Tonelli--Shanks
    // (does not terminate if not a square!)

    while (!F.equals(b, F.one))
    {
        let m = 0;
        let b2m = b;
        while (!F.equals(b2m, F.one))
        {
            /* invariant: b2m = b^(2^m) after entering this loop */
            b2m = F.square(b2m);
            m += 1;
        }

        let j = v-m-1;
        w = z;
        while (j > 0)
        {
            w = F.square(w);
            --j;
        } // w = z^2^(v-m-1)

        z = F.square(w);
        b = F.mul(b, z);
        x = F.mul(x, w);
        v = m;
    }

    return x;
}

const p_minus1= F.sub(r,bigInt(1));
const gen = bigInt(bigInt(5));
const twoto28= F.exp(bigInt(2), bigInt(28));
const rem = F.div(p_minus1, twoto28);
const w28 = F.exp(gen, rem);

const one = F.exp(w28, twoto28);


console.log(F.toString(w28));
console.log(w28.toString(10));
console.log(F.toString(one));
