import Multiset from "../src/plookup/multiset.js";
import assert from "assert";
import {getRandomValue, getRandomArray} from "./test_utils.js";
import {getCurveFromName} from "../src/curves.js";
import fs from "fs";
import * as fastFile from "fastfile";
import {BigBuffer} from "ffjavascript";

describe("snarkjs: Plookup > Multiset tests", function () {
    this.timeout(150000);

    let curve;

    before(async () => {
        curve = await getCurveFromName("bn128");
    });

    after(async () => {
        await curve.terminate();
    });

    it("should properly construct a new multiset from an array", async () => {
        let array = getRandomArray(curve.Fr);
        let multiset = new Multiset(0, curve.Fr);
        multiset.fromArray(array);

        assert.deepEqual(array, multiset.toArray());
    });

    it("should throw an error when trying to construct a new multiset from an array using a non array element", async () => {
        let multiset = new Multiset(0, curve.Fr);
        assert.throws(() => multiset.fromArray(10), Error("Multiset.fromArray: Element is not an array"));
    });

    it("should throw an error when trying to import data from an array on a non void multiset", async () => {
        let multiset = new Multiset(1, curve.Fr);
        assert.throws(() => multiset.fromArray([]), Error("Multiset.fromArray: it is not able to import data from an array in a non void multiset"));
    });

    it("should write and read data to/from a file", async () => {
        let fileName = "multiset.test.bin";

        const fd = await fastFile.createOverride(fileName);

        //Write the datat to a file
        let multiset = new Multiset(0, curve.Fr);
        let length = getRandomValue(10);
        let arr = [];
        for (let i = 0; i < length; i++) {
            arr.push(curve.Fr.random());
        }
        multiset.fromArray(arr);
        await multiset.toFile(fd);
        await fd.close();

        //Read the data from the file
        const fd2 = await fastFile.readExisting(fileName);
        let multiset2 = new Multiset(0, curve.Fr);
        await multiset2.fromFile(fd2);
        await fd2.close();
        await fs.promises.unlink(fileName);

        assert.deepEqual(multiset.buff, multiset2.buff);
    });


    it("should throw an error when trying to pad a multiset with a length shorter than the current", async () => {
        let length = getRandomValue(10);
        let multiset = new Multiset(length, curve.Fr);

        assert.throws(() => multiset.pad(length - 1), Error("Multiset.pad: A multiset pad length cannot reduce length"));
    });

    it("should do nothing when trying to pad a multiset with current multiset length", async () => {
        let length1 = getRandomValue(10);

        let multiset = new Multiset(length1, curve.Fr);
        assert.equal(multiset.length(), length1);
        multiset.pad(length1);
        assert.equal(multiset.length(), length1);
    });

    it("should pad a multiset properly when giving a valid new length", async () => {
        let length1 = getRandomValue(10);
        let length2 = getRandomValue(10);

        let multiset = new Multiset(length1, curve.Fr);
        multiset.pad(length1 + length2);

        assert.equal(multiset.length(), length1 + length2);
        assert.deepEqual(multiset.lastElement(), curve.Fr.zero);
    });

    it("should throw an error when trying to read an element on an invalid position", async () => {
        let length = getRandomValue(10);
        let multiset = new Multiset(length, curve.Fr);

        assert.throws(() => multiset.getElementAt(length), Error("Multiset.getElementAt: Index out of bounds"));
    });

    it("should return element at indicated position", async () => {
        let array = getRandomArray(curve.Fr);
        let multiset = new Multiset(0, curve.Fr);

        multiset.fromArray(array);

        for (let i = 0; i < array.length; i++) {
            assert.deepEqual(array[i], multiset.getElementAt(i));
        }
    });

    it("should throw an error when trying to set an element on an invalid position", async () => {
        let length = getRandomValue(10);
        let element = curve.Fr.e(getRandomValue(1000));
        let multiset = new Multiset(length, curve.Fr);

        assert.throws(() => multiset.setElementAt(element, length), Error("Multiset.setElementAt: Index out of bounds"));
    });

    it("should set element at indicated position", async () => {
        let array = getRandomArray(curve.Fr);
        let multiset = new Multiset(0, curve.Fr);
        let element = curve.Fr.e(getRandomValue(1000));
        let index = getRandomValue(multiset.length() - 1);

        multiset.fromArray(array);
        multiset.setElementAt(element, index);
        assert.deepEqual(element, multiset.getElementAt(index));
    });

    it("should first and last element properly", async () => {
        let array = getRandomArray(curve.Fr);
        let multiset = new Multiset(0, curve.Fr);

        multiset.fromArray(array);
        assert.deepEqual(array[0], multiset.firstElement());
        assert.deepEqual(array[array.length - 1], multiset.lastElement());
    });

    it("should whether is empty or not", async () => {
        let multiset = new Multiset(0, curve.Fr);
        assert.equal(true, multiset.isEmpty());

        let multisetNoEmpty = new Multiset(1, curve.Fr);

        assert.equal(false, multisetNoEmpty.isEmpty());
    });

    it("should return the index of an element or -1 if it doesn't exist", async () => {
        let multiset = new Multiset(0, curve.Fr);
        let length = getRandomValue(50);
        let element = curve.Fr.e(getRandomValue(1000));

        let index = Math.floor(length / 2);
        multiset.pad(length);

        assert.equal(-1, multiset.indexOf(element));
        multiset.setElementAt(element, index);
        assert.equal(index, multiset.indexOf(element));
    });

    it("should return whether a multiset contains an element", async () => {
        let multiset = new Multiset(0, curve.Fr);
        let length = getRandomValue(50);
        let element = curve.Fr.random();

        multiset.pad(length, curve.Fr.zero);
        assert.equal(false, multiset.containsElement(element));

        multiset.setElementAt(element, Math.floor(length / 2));
        assert.equal(true, multiset.containsElement(element));
    });

    it("should throw an error when argument passed to isSortedBy is not a multiset", async () => {
        let multiset = new Multiset(0, curve.Fr);
        assert.throws(() => multiset.isSortedBy(10), Error("Multiset.isSortedBy: multiset argument must be of type Multiset"));
    });

    it("should return false when using void multiset on isSortedBy function", async () => {
        let arrRef = [];
        let arrOk1 = [];
        let multisetRef = new Multiset(0, curve.Fr);
        let multisetOk1 = new Multiset(0, curve.Fr);

        multisetRef.fromArray(arrRef);
        multisetOk1.fromArray(arrOk1);
        assert.equal(false, multisetOk1.isSortedBy(multisetRef));
    });

    it("should return whether a multiset is sorted by another multiset", async () => {
        let arrRef = [curve.Fr.e(1), curve.Fr.e(1), curve.Fr.e(2), curve.Fr.e(2), curve.Fr.e(3),
            curve.Fr.e(3), curve.Fr.e(4), curve.Fr.e(4), curve.Fr.e(2)];
        let arrOk1 = [curve.Fr.e(1), curve.Fr.e(2), curve.Fr.e(2), curve.Fr.e(3)];
        let arrOk2 = [curve.Fr.e(1), curve.Fr.e(2), curve.Fr.e(3), curve.Fr.e(2)];

        let arrWrong1 = [curve.Fr.e(3), curve.Fr.e(3), curve.Fr.e(3)];
        let arrWrong2 = [curve.Fr.e(1), curve.Fr.e(2), curve.Fr.e(4), curve.Fr.e(3)];

        //(1, 2, 2, 3) is a subsequence of (1, 1, 2, 2, 3, 3, 4, 4, 2) and (1, 2, 3, 2) is as well. However, (3, 3, 3) and (1, 2, 4, 3) would not be subsequences

        let multisetRef = new Multiset(0, curve.Fr);
        let multisetOk1 = new Multiset(0, curve.Fr);
        let multisetOk2 = new Multiset(0, curve.Fr);
        let multisetWrong1 = new Multiset(0, curve.Fr);
        let multisetWrong2 = new Multiset(0, curve.Fr);

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
        let arr1 = [curve.Fr.e(1), curve.Fr.e(4), curve.Fr.e(8), curve.Fr.e(16), curve.Fr.e(32)];
        let arr2 = [curve.Fr.e(5), curve.Fr.e(4), curve.Fr.e(3), curve.Fr.e(2), curve.Fr.e(1)];

        let arrOk = [curve.Fr.e(1), curve.Fr.e(1), curve.Fr.e(2), curve.Fr.e(3), curve.Fr.e(4),
            curve.Fr.e(4), curve.Fr.e(5), curve.Fr.e(8), curve.Fr.e(16), curve.Fr.e(32)];

        let multiset1 = new Multiset(0, curve.Fr);
        let multiset2 = new Multiset(0, curve.Fr);

        multiset1.fromArray(arr1);
        multiset2.fromArray(arr2);

        let s = multiset1.sortedBy(multiset2);

        assert.deepEqual(arrOk, s.toArray());
    });

    it("should return halves of a multiset", async () => {
        let arr = [curve.Fr.e(1), curve.Fr.e(1), curve.Fr.e(2), curve.Fr.e(2), curve.Fr.e(3),
            curve.Fr.e(3), curve.Fr.e(4), curve.Fr.e(4), curve.Fr.e(5)];
        let arr1 = [curve.Fr.e(1), curve.Fr.e(1), curve.Fr.e(2), curve.Fr.e(2), curve.Fr.e(3)];
        let arr2 = [curve.Fr.e(3), curve.Fr.e(3), curve.Fr.e(4), curve.Fr.e(4), curve.Fr.e(5)];

        let multiset = new Multiset(0, curve.Fr);
        multiset.fromArray(arr);

        let halves = multiset.halves();

        assert.deepEqual(arr1, halves.h1.toArray());
        assert.deepEqual(arr2, halves.h2.toArray());
    });

    it("should return halves alternating of a multiset", async () => {
        let arr = [curve.Fr.e(1), curve.Fr.e(1), curve.Fr.e(2), curve.Fr.e(2),
            curve.Fr.e(3), curve.Fr.e(3), curve.Fr.e(4), curve.Fr.e(4), curve.Fr.e(5)];
        let arr1 = [curve.Fr.e(1), curve.Fr.e(2), curve.Fr.e(3), curve.Fr.e(4), curve.Fr.e(5)];
        let arr2 = [curve.Fr.e(1), curve.Fr.e(2), curve.Fr.e(3), curve.Fr.e(4)];

        let multiset = new Multiset(0, curve.Fr);
        multiset.fromArray(arr);

        let halves = multiset.halvesAlternating();

        assert.deepEqual(arr1, halves.h1.toArray());
        assert.deepEqual(arr2, halves.h2.toArray());

        arr = [curve.Fr.e(1), curve.Fr.e(1), curve.Fr.e(2), curve.Fr.e(2),
            curve.Fr.e(3), curve.Fr.e(3), curve.Fr.e(4), curve.Fr.e(6)];
        arr1 = [curve.Fr.e(1), curve.Fr.e(2), curve.Fr.e(3), curve.Fr.e(4)];
        arr2 = [curve.Fr.e(1), curve.Fr.e(2), curve.Fr.e(3), curve.Fr.e(6)];

        multiset = new Multiset(0, curve.Fr);
        multiset.fromArray(arr);

        halves = multiset.halvesAlternating();

        assert.deepEqual(arr1, halves.h1.toArray());
        assert.deepEqual(arr2, halves.h2.toArray());

    });

    it("should throw an error when argument randomChallenge passed to compress is not an Uint8Array", async () => {
        const ms1 = new Multiset(0, curve.Fr);
        const ms2 = new Multiset(0, curve.Fr);
        const ms3 = new Multiset(0, curve.Fr);
        const randomChallenge = 1;
        assert.throws(() => Multiset.compress(ms1, ms2, ms3, randomChallenge), Error("Multiset.compress: randomChallenge argument must be an Uint8Array"));
    });

    it("should throw an error when one or more multisets passed to compress is not of Multiset type", async () => {
        let ms1 = [];
        let ms2 = new Multiset(0, curve.Fr);
        let ms3 = new Multiset(0, curve.Fr);
        const randomChallenge = curve.Fr.e(getRandomValue(10));
        assert.throws(() => Multiset.compress(ms1, ms2, ms3, randomChallenge), Error("Multiset.compress: multiset arguments must be of Multiset type"));
    });

    it("should throw an error when argument passed to isSortedBy is not a multiset", async () => {
        const ms1 = new Multiset(20, curve.Fr);
        const ms2 = new Multiset(20, curve.Fr);
        const ms3 = new Multiset(30, curve.Fr);
        const randomChallenge = curve.Fr.e(getRandomValue(10));
        assert.throws(() => Multiset.compress(ms1, ms2, ms3, randomChallenge), Error("Multiset.compress: All Multisets must have same length"));
    });

    it("should return a compressed version of three multisets", async () => {
        let arr1 = [curve.Fr.e(1), curve.Fr.e(2), curve.Fr.e(3)];
        let arr2 = [curve.Fr.e(2), curve.Fr.e(3), curve.Fr.e(1)];
        let arr3 = [curve.Fr.e(3), curve.Fr.e(1), curve.Fr.e(2)];
        let res = [curve.Fr.e(17), curve.Fr.e(12), curve.Fr.e(13)];

        let multiset1 = new Multiset(0, curve.Fr);
        let multiset2 = new Multiset(0, curve.Fr);
        let multiset3 = new Multiset(0, curve.Fr);

        multiset1.fromArray(arr1);
        multiset2.fromArray(arr2);
        multiset3.fromArray(arr3);

        assert.deepEqual(res, Multiset.compress(multiset1, multiset2, multiset3, curve.Fr.e(2), curve.Fr).toArray());
    });

    it("should order a multiset", async () => {
        let length = getRandomValue(4096);

        let buff = new BigBuffer(length * curve.Fr.n8);
        for (let i = 0; i < length; i++) {
            buff.set(curve.Fr.random(), i * curve.Fr.n8);
        }

        buff.quickSort(0, length - 1, curve.Fr);

        for (let i = 1; i < length; i++) {
            let diff = curve.Fr.sub(
                buff.slice((i - 1) * curve.Fr.n8, i * curve.Fr.n8),
                buff.slice(i * curve.Fr.n8, (i + 1) * curve.Fr.n8));

            assert(curve.Fr.isNegative(diff) || curve.Fr.isZero(diff));
        }
    });
});