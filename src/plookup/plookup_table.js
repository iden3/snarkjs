/*
    Copyright 2022 Polygon Hermez https://hermez.io

    This file is part of snarkJS.

    snarkJS is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    snarkJS is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with snarkJS. If not, see <https://www.gnu.org/licenses/>.
*/

import Multiset from "./multiset.js";

class PlookupTable {
    constructor() {
        this.vec = [];

        return this;
    }

    fromMultisets(multisetA, multisetB, multisetC) {
        if (!(multisetA instanceof Multiset) || !(multisetB instanceof Multiset) || !(multisetC instanceof Multiset)) {
            throw new Error("PlookupTable.fromMultisets: arguments must be of Multiset type");
        }

        if (!(multisetA.length() === multisetB.length() && multisetB.length() === multisetC.length())) {
            throw new Error("PlookupTable.fromMultisets: All Multisets must have same length");
        }

        for (let i = 0; i < multisetA.length(); i++) {
            this.pushRow(multisetA.getElementAt(i), multisetB.getElementAt(i), multisetC.getElementAt(i));
        }
    }

    toMultisets() {
        let multisetA = new Multiset();
        let multisetB = new Multiset();
        let multisetC = new Multiset();

        for (let i = 0; i < this.vec.length; i++) {
            const row = this.getRowAt(i);
            multisetA.push(row[0]);
            multisetB.push(row[1]);
            multisetC.push(row[2]);
        }
        return {a: multisetA, b: multisetB, c: multisetC};
    }

    pushRow(a, b, c) {
        this.vec.push([a, b, c]);
    }

    length() {
        return this.vec.length;
    }

    getRowAt(index) {
        if (index < 0 || index > this.vec.length - 1) {
            throw new Error("PlookupTable.getRowAt: Index out of bounds");
        }
        return this.vec[index];
    }

    getRows() {
        return this.vec;
    }

    setRowAt(a, b, c, index) {
        if (this.length() === 0 || index >= this.vec.length) {
            throw new Error("PlookupTable.setRowAt: Index out of bounds");
        }
        this.vec[index] = [a, b, c];
    }

    //Fetch first row on the plookup table. Returns undefined if there are no elements in the Multiset
    firstRow() {
        return this.length() > 0 ? this.vec[0] : undefined;
    }

    //Fetch last row on the plookup table. Returns undefined if there are no elements in the Multiset
    lastRow() {
        return this.length() > 0 ? this.vec[this.vec.length - 1] : undefined;
    }

    isEmpty() {
        return 0 === this.length();
    }

    lookup(a, b) {
        for (let i = 0; i < this.vec.length; i++) {
            const row = this.vec[i];
            if (row[0] === a && row[1] === b) {
                return {row: [row[0], row[1], row[2]], idx: i};
            }
        }
        return {idx: -1};
    }

    compress(randomChallenge) {
        let res = new Multiset(this.vec.length);
        for (let i = 0; i < this.vec.length; i++) {
            const row = this.vec[i];
            let element = row[0] + row[1] * randomChallenge + row[2] * Math.pow(randomChallenge, 2);
            res.setElementAt(element, i);
        }
        return res;
    }
}

export default PlookupTable;
