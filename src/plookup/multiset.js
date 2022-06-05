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
        this.vec = new Array(initialSize);

        this.Fr = Fr;

        return this;
    }

    fromArray(array) {
        if (!Array.isArray(array)) {
            throw new Error("Multiset.fromArray: Element is not an array");
        }

        if (this.vec.length !== 0) {
            throw new Error("Multiset.fromArray: it is not able to import data from an array in a non void multiset");
        }
        this.vec = [...array];
    }

    toArray() {
        return this.vec;
    }

    toBigBuffer() {
        let res = new BigBuffer(this.vec.length * this.Fr.n8);
        for (let i = 0; i < this.vec.length; i++) {
            res.set(this.vec[i], i * this.Fr.n8);
        }

        return res;
    }

    async toFile(fd) {
        await fd.writeULE64(this.vec.length);

        for (let i = 0; i < this.vec.length; i++) {
            await fd.write(this.vec[i]);
        }
    }

    async fromFile(fd) {
        if (this.vec.length !== 0) {
            throw new Error("Multiset.fromArray: it is not able to import data from a file in a non void multiset");
        }
        let length = await fd.readULE64();
        this.vec = new Array(length);
        for (let i = 0; i < length; i++) {
            this.vec[i] = await fd.read(this.Fr.n8);
        }
    }

    //Extends the number of elements of the Multiset to newLength
    pad(newLength, defaultValue = this.Fr.zero) {
        // const isPowerOfTwo = 0 === ((Math.log(newLength) / Math.log(2)) % 1);
        // if (!isPowerOfTwo) {
        //     throw new Error("Multiset.pad: New length must by power of two");
        // }
        let diff = newLength - this.length();

        if (diff < 0) {
            throw new Error("Multiset.pad: A multiset pad length cannot reduce length");
        }
        if (diff > 0) {
            this.vec = this.vec.concat(Array(diff).fill(defaultValue.slice()));
        }
    }

    //Push a new Element to the end of the Multiset
    push(element) {
        this.vec.push(element);
    }

    length() {
        return this.vec.length;
    }

    getElementAt(index) {
        if (index < 0 || index > this.vec.length - 1) {
            throw new Error("Multiset.getElementAt: Index out of bounds");
        }
        return this.vec[index];
    }

    setElementAt(element, index) {
        if (this.length() === 0 || index >= this.vec.length) {
            throw new Error("Multiset.setElementAt: Index out of bounds");
        }
        this.vec[index] = element.slice();
    }

    //Fetch first element on the Multiset. Returns undefined if there are no elements in the Multiset
    firstElement() {
        return this.length() > 0 ? this.vec[0] : undefined;
    }

    //Fetch last element on the Multiset. Returns undefined if there are no elements in the Multiset
    lastElement() {
        return this.length() > 0 ? this.vec[this.vec.length - 1] : undefined;
    }

    isEmpty() {
        return 0 === this.length();
    }

    //Returns the first index at which a given element can be found in the array, or -1 if it is not present.
    indexOf(element, fromIndex = 0) {
        for (let i = fromIndex; i < this.vec.length; i++) {
            if (this.Fr.eq(this.vec[i], element)) {
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
        for (let i = 0; i < this.vec.length; i++) {
            lastIndex = multiset.indexOf(this.vec[i], lastIndex);
            if (-1 === lastIndex) {
                return false;
            }
            lastIndex++;
        }
        return true;
    }

    //Concatenates and sort two Multisets
    // sortedVersion({1,2,3,4},{5,4,3,2,1})={1,1,2,2,3,3,4,4,5}
    sortedVersion(multiset) {
        if (!(multiset instanceof Multiset)) {
            throw new Error("Multiset.sortedVersion: multiset argument must be of type Multiset");
        }

        let array = this.vec.concat(multiset.toArray());

        array.sort((a, b) => {
            let diff = this.Fr.sub(a, b);

            if (this.Fr.isNegative(diff)) {
                return -1;
            }
            if (this.Fr.isZero(diff)) {
                return 0;
            }
            return 1;
        });

        let res = new Multiset(0, this.Fr);
        res.fromArray(array);

        return res;
    }

    //Divides a multiset into (two) halves
    //whether last element of the first half and first element of the second half are the same
    halves() {
        let newLength = Math.floor(this.length() / 2);

        let first_half = this.vec.slice(0, newLength + 1);
        let second_half = this.vec.slice(newLength, this.length());

        return {h1: first_half, h2: second_half};
    }

    //Divides a multiset into odd and even halves
    halvesAlternating() {
        let evens = new Multiset(0, this.Fr);
        let odds = new Multiset(0, this.Fr);
        for (let i = 0; i < this.vec.length; i++) {
            if (i % 2 === 0) {
                evens.push(this.vec[i].slice());
            } else {
                odds.push(this.vec[i].slice());
            }
        }

        return {h1: evens, h2: odds};

    }

    //Compress the elements of three Multisets in one Multiset using a random challenge value
    //a_i + (b_i * random_challenge) + (c_i * random_challenge^2)
    static compress(multiset_a, multiset_b, multiset_c, randomChallenge, F) {
        if (!(randomChallenge instanceof Uint8Array)) {
            throw new Error("Multiset.compress: randomChallenge argument must be an Uint8Array");
        }

        if (!(multiset_a instanceof Multiset) || !(multiset_b instanceof Multiset) || !(multiset_c instanceof Multiset)) {
            throw new Error("Multiset.compress: multiset arguments must be of Multiset type");
        }

        if (!(multiset_a.length() === multiset_b.length() && multiset_b.length() === multiset_c.length())) {
            throw new Error("Multiset.compress: All Multisets must have same length");
        }

        let res = new Multiset(multiset_a.length(), F);
        for (let i = 0; i < multiset_a.length(); i++) {
            let elementA = multiset_a.getElementAt(i).slice();
            let elementB = F.mul(multiset_b.getElementAt(i).slice(), randomChallenge);
            let elementC = F.mul(multiset_c.getElementAt(i).slice(), F.square(randomChallenge));

            let element = F.add(elementA, elementB);
            element = F.add(element, elementC);

            res.setElementAt(element, i);
        }

        return res;
    }
}

export default Multiset;
