import {Scalar} from "ffjavascript";
import jsSha3 from "js-sha3";
const { keccak256 } = jsSha3;

const POLYNOMIAL = 0;
const SCALAR = 1;

export class Keccak256Transcript {
    constructor(curve) {
        this.G1 = curve.G1;
        this.Fr = curve.Fr;

        this.reset();
    }

    reset() {
        this.data = [];
    }

    appendPolCommitment(polynomialCommitment) {
        this.data.push({type: POLYNOMIAL, data: polynomialCommitment});
    }

    appendScalar(scalar) {
        this.data.push({type: SCALAR, data: scalar});
    }

    getChallenge() {
        if(0 === this.data.length) {
            throw new Error("Keccak256Transcript: No data to generate a transcript");
        }

        let nPolynomials = 0;
        let nScalars = 0;

        this.data.forEach(element => POLYNOMIAL === element.type ? nPolynomials++ : nScalars++);

        let buffer = new Uint8Array(nScalars * this.Fr.n8 + nPolynomials * this.G1.F.n8 * 2);
        let offset = 0;

        for (let i = 0; i < this.data.length; i++) {
            if (POLYNOMIAL === this.data[i].type) {
                this.G1.toRprUncompressed(buffer, offset, this.data[i].data);
                offset += this.G1.F.n8 * 2;
            } else {
                this.Fr.toRprBE(buffer, offset, this.data[i].data);
                offset += this.Fr.n8;
            }
        }

        const value = Scalar.fromRprBE(new Uint8Array(keccak256.arrayBuffer(buffer)));
        return this.Fr.e(value);
    }
}