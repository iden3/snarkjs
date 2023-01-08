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

import {BigBuffer} from "ffjavascript";

class Multiset {
    constructor(initialSize = 0, Fr) {
        if (undefined === Fr) {
            throw new Error("Constructor of multiset needs a F");
        }
        this.buff = new BigBuffer(initialSize * Fr.n8);

        this.Fr = Fr;

        return this;
    }

    length() {
        return this.buff.byteLength / this.Fr.n8;
    }

    isEmpty() {
        return 0 === this.length();
    }

    fromArray(array) {
        if (!Array.isArray(array)) {
            throw new Error("Multiset.fromArray: Element is not an array");
        }

        if (this.length() !== 0) {
            throw new Error("Multiset.fromArray: it is not able to import data from an array in a non void multiset");
        }

        this.buff = new BigBuffer(array.length * this.Fr.n8);

        for (let i = 0; i < array.length; i++) {
            this.setElementAt(array[i], i);
        }
    }

    toBigBuffer() {
        return this.buff;
    }

    toArray() {
        const length = this.length();

        let res = new Array(length);
        for (let i = 0; i < length; i++) {
            res[i] = this.getElementAt(i);
        }

        return res;
    }

    async toFile(fd) {
        const length = this.length();
        await fd.writeULE64(length);

        for (let i = 0; i < length; i++) {
            await fd.write(this.buff.slice(i * this.Fr.n8, (i + 1) * this.Fr.n8));
        }
    }

    async fromFile(fd) {
        if (this.length() !== 0) {
            throw new Error("Multiset.fromArray: it is not able to import data from a file in a non void multiset");
        }
        let length = await fd.readULE64();
        this.buff = new BigBuffer(length * this.Fr.n8);
        for (let i = 0; i < length; i++) {
            this.setElementAt(await fd.read(this.Fr.n8), i);
        }
    }

    //Extends the number of elements of the Multiset to newLength
    pad(newLength, defaultValue = this.Fr.zero) {
        const diff = newLength - this.length();

        if (diff < 0) {
            throw new Error("Multiset.pad: A multiset pad length cannot reduce length");
        }

        if (diff > 0) {
            const buff2 = new BigBuffer(newLength * this.Fr.n8);
            buff2.set(this.buff, 0);
            for (let i = this.length(); i < newLength; i++) {
                buff2.set(defaultValue, i * this.Fr.n8);
            }
            this.buff = buff2;
        }
    }

    getElementAt(index) {
        if (index < 0 || index >= this.length()) {
            throw new Error("Multiset.getElementAt: Index out of bounds");
        }
        return this.buff.slice(index * this.Fr.n8, (index + 1) * this.Fr.n8);
    }

    setElementAt(element, index) {
        if (this.length() === 0 || index >= this.length()) {
            throw new Error("Multiset.setElementAt: Index out of bounds");
        }
        this.buff.set(element, index * this.Fr.n8);
    }

    //Fetch first element on the Multiset. Returns undefined if there are no elements in the Multiset
    firstElement() {
        return this.length() > 0 ? this.getElementAt(0) : undefined;
    }

    //Fetch last element on the Multiset. Returns undefined if there are no elements in the Multiset
    lastElement() {
        return this.length() > 0 ? this.getElementAt(this.length() - 1) : undefined;
    }

    //Returns the first index at which a given element can be found in the array, or -1 if it is not present.
    indexOf(element, fromIndex = 0) {
        for (let i = fromIndex; i < this.length(); i++) {
            if (this.Fr.eq(this.getElementAt(i), element)) {
                return i;
            }
        }
        return -1;
    }

    //Checks whether at least one instance of this element exists on the Multiset
    containsElement(element) {
        return this.indexOf(element) !== -1;
    }

    //Checks whether one Multiset is a subset of another.
    //We say that f is sorted by t when values appear in f the same order as they do in t
    isSortedBy(multiset) {
        if (!(multiset instanceof Multiset)) {
            throw new Error("Multiset.isSortedBy: multiset argument must be of type Multiset");
        }

        if (this.isEmpty() || multiset.isEmpty()) {
            return false;
        }

        let lastIndex = 0;
        for (let i = 0; i < this.length(); i++) {
            lastIndex = multiset.indexOf(this.getElementAt(i), lastIndex);
            if (-1 === lastIndex) {
                return false;
            }
            lastIndex++;
        }
        return true;
    }

    // Concatenates and sort two sorted Multisets
    // sortedBy({1,2,3,4},{1,2,3,4,5})={1,1,2,2,3,3,4,4,5}
    sortedBy(multiset) {
        if (!(multiset instanceof Multiset)) {
            throw new Error("Multiset.sortedVersion: multiset argument must be of type Multiset");
        }

        if (multiset.length() <= 0) {
            return this;
        }

        const newLength = this.length() + multiset.length();
        let buff2 = new BigBuffer(newLength * this.Fr.n8);

        //Merge this.buff and multiset.buff sorted in a new Multiset
        let idxA = 0;
        let idxB = 0;
        let A = this.buff.slice(idxA, this.Fr.n8);
        let B = multiset.buff.slice(idxB, this.Fr.n8);

        for (let i = 0; i < newLength; i++) {
            let ALowerB;
            if (undefined === A) {
                ALowerB = false;
            } else if (undefined === B) {
                ALowerB = true;
            } else {
                ALowerB = this.Fr.isNegative(this.Fr.sub(A, B));
            }

            if (ALowerB) {
                buff2.set(A, i * this.Fr.n8);
                idxA += this.Fr.n8;
                A = idxA < this.buff.byteLength ? this.buff.slice(idxA, idxA + this.Fr.n8) : undefined;
            } else {
                buff2.set(B, i * this.Fr.n8);
                idxB += this.Fr.n8;
                B = idxB < multiset.buff.byteLength ? multiset.buff.slice(idxB, idxB + this.Fr.n8) : undefined;
            }
        }

        let res = new Multiset(0, this.Fr);
        res.buff = buff2;

        return res;
    }

    //Divides a multiset into (two) halves
    //whether last element of the first half and first element of the second half are the same
    halves() {
        let newLength = Math.floor(this.length() / 2);

        let h1 = new Multiset(newLength + 1, this.Fr);
        let h2 = new Multiset(this.length() - newLength, this.Fr);

        h1.buff = this.buff.slice(0, (newLength + 1) * this.Fr.n8);
        h2.buff = this.buff.slice(newLength * this.Fr.n8, this.length() * this.Fr.n8);

        return {h1: h1, h2: h2};
    }

    //Divides a multiset into odd and even halves
    halvesAlternating() {
        const lengthEvens = this.length() - Math.floor(this.length() / 2);
        const lengthOdds = this.length() - lengthEvens;

        let evens = new Multiset(lengthEvens, this.Fr);
        let odds = new Multiset(lengthOdds, this.Fr);

        for (let i = 0; i < lengthOdds; i++) {
            evens.setElementAt(this.getElementAt(i * 2), i);
            odds.setElementAt(this.getElementAt(i * 2 + 1), i);
        }
        if (lengthEvens > lengthOdds) {
            evens.setElementAt(this.lastElement(), lengthEvens - 1);
        }

        return {h1: evens, h2: odds};
    }

    //Compress the elements of three Multisets in one Multiset using a random challenge value
    //a_i + (b_i * random_challenge) + (c_i * random_challenge^2)
    static compress(multiset_a, multiset_b, multiset_c, randomChallenge, Fr) {
        if (!(randomChallenge instanceof Uint8Array)) {
            throw new Error("Multiset.compress: randomChallenge argument must be an Uint8Array");
        }

        if (!(multiset_a instanceof Multiset) || !(multiset_b instanceof Multiset) || !(multiset_c instanceof Multiset)) {
            throw new Error("Multiset.compress: multiset arguments must be of Multiset type");
        }

        if (!(multiset_a.length() === multiset_b.length() && multiset_b.length() === multiset_c.length())) {
            throw new Error("Multiset.compress: All Multisets must have same length");
        }

        let res = new Multiset(multiset_a.length(), Fr);
        for (let i = 0; i < multiset_a.length(); i++) {
            let elementA = multiset_a.getElementAt(i).slice();
            let elementB = Fr.mul(multiset_b.getElementAt(i).slice(), randomChallenge);
            let elementC = Fr.mul(multiset_c.getElementAt(i).slice(), Fr.square(randomChallenge));

            let element = Fr.add(elementA, elementB);
            element = Fr.add(element, elementC);

            res.setElementAt(element, i);
        }

        return res;
    }
}

export default Multiset;
