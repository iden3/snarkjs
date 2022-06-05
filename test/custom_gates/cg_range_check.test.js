import assert from "assert";
import {getRandomValue} from "../test_utils.js";
import {getCurveFromName} from "../../src/curves.js";
import RangeCheckCG, {MAX_RANGE, N} from "../../src/custom_gates/cg_range_check.js";

describe("snarkjs: range check tests", function () {
    this.timeout(10000);

    let curve;

    before(async () => {
        curve = await getCurveFromName("bn128");
    });

    after(async () => {
        await curve.terminate();
    });

    it("should return true when values are in range", async () => {
        let rangeCheckCG = new RangeCheckCG({parameters: {}});
        let preprocessedInput = rangeCheckCG.getPreprocessedInput(curve.Fr);

        //Create random witnesses
        let witnesses = [];
        //let length = getRandomValue(N * 2);
        let length = 2;
//        for (let i = 0; i < length; i++) {
//            witnesses.push(curve.Fr.e(getRandomValue(MAX_RANGE)));
//        }
        witnesses.push(curve.Fr.e(1));
        witnesses.push(curve.Fr.e(2));

        //Create Lagrange Polynomials
        // for (let i = 0; i < length; i++) {
        //     let buff = new BigBuffer(length * curve.Fr.n8);
        //     buff.set(curve.Fr.one, i * curve.Fr.n8);
        //     const q = await curve.Fr.ifft(buff);
        //
        //     const q4 = new BigBuffer(length * curve.Fr.n8 * 4);
        //     q4.set(q, 0);
        //     const Q4 = await curve.Fr.fft(q4);
        //
        //     await fdZKey.write(q);
        //     await fdZKey.write(Q4);
        // }
        let proof = rangeCheckCG.computeProof(preprocessedInput, witnesses, curve.Fr);

        // Object.keys(proof).forEach(key => {
        //     console.log(key);
        //     if("number" === typeof(proof[key])) {
        //         console.log(proof[key]);
        //     } else if("object" === typeof(proof[key])) {
        //         Object.keys(proof[key]).forEach(subkey => {
        //             if("number" === typeof(proof[key][subkey])) {
        //                 console.log(proof[key][subkey]);
        //             } else {
        //                 //console.log(curve.Fr.toString(proof[key][subkey]));
        //             }
        //         });
        //     }
        // });
        let result = rangeCheckCG.verifyProof(proof, curve.Fr);

        assert.equal(result, true);
    });

    it("should return false when a value is out of range", async () => {
        let rangeCheckCG = new RangeCheckCG({parameters: {}});
        let preprocessedInput = rangeCheckCG.getPreprocessedInput(curve.Fr);

        //Create random witnesses
        let witnesses = [];
        let length = getRandomValue(N * 2);
        for (let i = 0; i < length; i++) {
            witnesses.push(curve.Fr.e(getRandomValue(MAX_RANGE)));
        }
        witnesses.push(curve.Fr.e(MAX_RANGE + 1));

        let proof = rangeCheckCG.computeProof(preprocessedInput, witnesses, curve.Fr);

        let result = rangeCheckCG.verifyProof(proof, curve.Fr);

        assert.equal(result, false);
    });
});
