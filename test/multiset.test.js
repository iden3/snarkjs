import Multiset from "../src/plookup/multiset.js";
import assert from "assert";

function getRandomValue(higher = 10) {
    return Math.floor((Math.random() * higher) + 1);
}

function getRandomArray() {
    let length = getRandomValue(30);
    let array = [];
    for (let i = 0; i < length; i++) {
        array[i] = i;
    }
    return array;
}

describe("snarkjs: Plookup > Multiset tests", function () {
    this.timeout(150000);

    it("should properly construct a new multiset from an array", async () => {
        let array = getRandomArray();
        let multiset = new Multiset();
        multiset.fromArray(array);

        assert.deepEqual(array, multiset.toArray());
    });

    it("should throw an error when trying to construct a new multiset from an array using a non array element", async () => {
        let multiset = new Multiset();
        assert.throws(() => multiset.fromArray(10), Error("Multiset.fromArray: Element is not an array"));
    });

    it("should throw an error when trying to pad a multiset with a length shorter than the current", async () => {
        let length = getRandomValue(10);
        let multiset = new Multiset(length);

        assert.throws(() => multiset.pad(length - 1), Error("Multiset.pad: A multiset pad length cannot reduce length"));
    });

    it("should do nothing when trying to pad a multiset with current multiset length", async () => {
        let length1 = getRandomValue(10);

        let multiset = new Multiset(length1);
        assert.equal(multiset.length(), length1);
        multiset.pad(length1);
        assert.equal(multiset.length(), length1);
    });

    it("should pad a multiset properly when giving a valid new length", async () => {
        let length1 = getRandomValue(10);
        let length2 = getRandomValue(10);

        let multiset = new Multiset(length1);
        multiset.pad(length1 + length2);

        assert.equal(multiset.length(), length1 + length2);
    });

    it("should push a new element properly on a multiset", async () => {
        let multiset = new Multiset();
        let element1 = getRandomValue(1000);
        let element2 = getRandomValue(1000);

        multiset.push(element1);
        assert.deepEqual([element1], multiset.toArray());
        multiset.push(element2);
        assert.deepEqual([element1, element2], multiset.toArray());

    });

    it("should throw an error when trying to read an element on an invalid position", async () => {
        let length = getRandomValue(10);
        let multiset = new Multiset(length);

        assert.throws(() => multiset.at(length), Error("Multiset.at: Index out of bounds"));
    });

    it("should return element at position indicated", async () => {
        let array = getRandomArray();
        let multiset = new Multiset();

        multiset.fromArray(array);
        for (let i = 0; i < array.length; i++) {
            assert.equal(array[i], multiset.at(i));
        }
    });

    it("should throw an error when trying to set en element on an invalid position", async () => {
        let length = getRandomValue(10);
        let element = getRandomValue(1000);
        let multiset = new Multiset(length);

        assert.throws(() => multiset.set(element, length), Error("Multiset.set: Index out of bounds"));
    });

    it("should set element at position indicated", async () => {
        let array = getRandomArray();
        let multiset = new Multiset();
        let element = getRandomValue(1000);
        let index = getRandomValue(multiset.length() - 1);

        multiset.fromArray(array);
        multiset.set(element, index);
        assert.equal(element, multiset.at(index));
    });

    it("should first and last element properly", async () => {
        let array = getRandomArray();
        let multiset = new Multiset();

        multiset.fromArray(array);
        assert.equal(array[0], multiset.first());
        assert.equal(array[array.length - 1], multiset.last());
    });

    it("should whether is empty or not", async () => {
        let multiset = new Multiset();

        assert.equal(true, multiset.isEmpty());

        multiset.push(1);
        assert.equal(false, multiset.isEmpty());
    });

    it("should return the index of an element or -1 if it doesn't exist", async () => {
        let multiset = new Multiset();
        let length = getRandomValue(50);
        let element = getRandomValue(1000);
        let index = Math.floor(length / 2);

        multiset.pad(length, 0);

        assert.equal(-1, multiset.indexOf(element));
        multiset.set(element, index);
        assert.equal(index, multiset.indexOf(element));
    });

    it("should return whether a multiset contains an element", async () => {
        let multiset = new Multiset();
        let length = getRandomValue(50);
        let element = getRandomValue(1000);

        multiset.pad(length, 0);
        assert.equal(false, multiset.containsElement(element));

        multiset.set(element, 0);
        assert.equal(true, multiset.containsElement(element));
    });

    it("should throw an error when argument passed to isSortedBy is not a multiset", async () => {
        let multiset = new Multiset();
        assert.throws(() => multiset.isSortedBy(10), Error("Multiset.containsMultiset: multiset argument must be of type Multiset"));
    });

    it("should return false when using void multiset on isSortedBy function", async () => {
        let arrRef = [];
        let arrOk1 = [];
        let multisetRef = new Multiset();
        let multisetOk1 = new Multiset();

        multisetRef.fromArray(arrRef);
        multisetOk1.fromArray(arrOk1);
        assert.equal(false, multisetOk1.isSortedBy(multisetRef));
    });

    it("should return whether a multiset is sorted by another multiset", async () => {
        let arrRef = [1, 1, 2, 2, 3, 3, 4, 4, 2];
        let arrOk1 = [1, 2, 2, 3];
        let arrOk2 = [1, 2, 3, 2];

        let arrWrong1 = [3, 3, 3];
        let arrWrong2 = [1, 2, 4, 3];

        //(1, 2, 2, 3) is a subsequence of (1, 1, 2, 2, 3, 3, 4, 4, 2) and (1, 2, 3, 2) is as well. However, (3, 3, 3) and (1, 2, 4, 3) would not be subsequences

        let multisetRef = new Multiset();
        let multisetOk1 = new Multiset();
        let multisetOk2 = new Multiset();
        let multisetWrong1 = new Multiset();
        let multisetWrong2 = new Multiset();

        multisetRef.fromArray(arrRef);
        multisetOk1.fromArray(arrOk1);
        multisetOk2.fromArray(arrOk2);
        multisetWrong1.fromArray(arrWrong1);
        multisetWrong2.fromArray(arrWrong2);

        assert.equal(true, multisetOk1.isSortedBy(multisetRef));
        assert.equal(true, multisetOk2.isSortedBy(multisetRef));
        assert.equal(false, multisetWrong1.isSortedBy(multisetRef));
        assert.equal(false, multisetWrong2.isSortedBy(multisetRef));
    });

    it("should return a sorted version of two multisets", async () => {
        //sortedVersion({1,2,3,4} {5,4,3,2,1}) = {1,1,2,2,3,3,4,4,5}
        let arr1 = [1, 2, 3, 4];
        let arr2 = [5, 4, 3, 2, 1];
        let arrOk = [1, 1, 2, 2, 3, 3, 4, 4, 5];

        let multiset1 = new Multiset();
        let multiset2 = new Multiset();

        multiset1.fromArray(arr1);
        multiset2.fromArray(arr2);

        let res = multiset1.sortedVersion(multiset2);

        assert.deepEqual(arrOk, res.toArray());
    });

    it("should return halves of a multiset", async () => {
        let arr = [1, 1, 2, 2, 3, 3, 4, 4, 5];

        let multiset = new Multiset();
        multiset.fromArray(arr);

        let res = multiset.halves();
        assert.deepEqual([1, 1, 2, 2], res.h1);
        assert.deepEqual([3, 3, 4, 4, 5], res.h2);
    });

    it("should return halves alternating of a multiset", async () => {
        let arr = [1, 1, 2, 2, 3, 3, 4, 4, 5];

        let multiset = new Multiset();
        multiset.fromArray(arr);

        let res = multiset.halvesAlternating();

        assert.deepEqual([1, 2, 3, 4, 5], res.h1.toArray());
        assert.deepEqual([1, 2, 3, 4], res.h2.toArray());
    });

    it("should throw an error when argument randomChallenge passed to compress is not a number", async () => {
        const ms1 = new Multiset();
        const ms2 = new Multiset();
        const ms3 = new Multiset();
        const randomChallenge = [];
        assert.throws(() => Multiset.compress(ms1, ms2, ms3, randomChallenge), Error("Multiset.compress: randomChallenge argument must be a number"));
    });

    it("should throw an error when one or more multisets passed to compress is not of Multiset type", async () => {
        let ms1 = [];
        let ms2 = new Multiset();
        let ms3 = new Multiset();
        const randomChallenge = getRandomValue(10);
        assert.throws(() => Multiset.compress(ms1, ms2, ms3, randomChallenge), Error("Multiset.compress: multiset arguments must be of Multiset type"));
    });

    it("should throw an error when argument passed to isSortedBy is not a multiset", async () => {
        const ms1 = new Multiset(2);
        const ms2 = new Multiset(2);
        const ms3 = new Multiset(3);
        const randomChallenge = getRandomValue(10);
        assert.throws(() => Multiset.compress(ms1, ms2, ms3, randomChallenge), Error("Multiset.compress: All Multisets must have same length"));
    });

    it("should return a sorted version of two multisets", async () => {
        let arr1 = [1, 2, 3];
        let arr2 = [2, 3, 1];
        let arr3 = [3, 1, 2];

        let multiset1 = new Multiset();
        let multiset2 = new Multiset();
        let multiset3 = new Multiset();

        multiset1.fromArray(arr1);
        multiset2.fromArray(arr2);
        multiset3.fromArray(arr3);

        assert.deepEqual([17, 12, 13], Multiset.compress(multiset1, multiset2, multiset3, 2).toArray());
    });
});