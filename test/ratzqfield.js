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

const chai = require("chai");

const bigInt = require("../src/bigint.js");
const ZqField = require("../src/zqfield.js");
const RatField = require("../src/ratfield.js");

const q  = bigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");
const Z = new ZqField(q);
const R = new RatField(Z);

const assert = chai.assert;

function r(a,b) {
    return [bigInt(a), bigInt(b)];
}


describe("Rational zq Field", () => {
    it("Should compare correctly", () => {
        assert( R.equals(r(3,5), r(6,10)));
        assert(!R.equals(r(3,5), r(6,11)));
    });
    it("Should add correctly", () => {
        const a = r(7,4);
        const b = r(5,12);

        assert(R.equals( R.add(a,b), r(13, 6)));
    });
    it("Should substract", () => {
        const a = r(7,4);
        const b = r(5,12);

        assert(R.equals( R.sub(a,b), r(4, 3)));
    });
    it("Should multiply", () => {
        const a = r(7,4);
        const b = r(5,12);

        assert(R.equals( R.mul(a,b), r(35, 48)));
    });
    it("Should div", () => {
        const a = r(7,4);
        const b = r(5,12);

        assert(R.equals( R.div(a,b), r(7*12, 5*4)));
    });
    it("Should square", () => {
        const a = r(7,4);

        assert(R.equals( R.square(a), r(49, 16)));
    });
    it("Should affine", () => {
        const a = r(12,4);
        const aa = R.affine(a);
        assert(Z.equals( aa[0], bigInt(3)));
        assert(Z.equals( aa[1], Z.one));
    });
    it("Should convert from Z to R", () => {
        const vz = bigInt(34);
        const vr = R.fromF(vz);

        assert(R.equals( vr, r(34,1)));
    });
    it("Should convert from R to Z", () => {
        const vr = r(32, 2);
        const vz = R.toF(vr);

        assert(Z.equals( vz, bigInt(16)));
    });
});
