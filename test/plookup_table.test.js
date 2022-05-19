import Multiset from "../src/plookup/multiset.js";
import assert from "assert";
import {getRandomArray, getRandomValue} from "./test_utils.js";
import PlookupTable from "../src/plookup/plookup_table.js";

function getVoidPlookupTable(length = getRandomValue(1000)) {
    let A = new Multiset(length);
    let B = new Multiset(length);
    let C = new Multiset(length);

    let plookupTable = new PlookupTable();

    plookupTable.fromMultisets(A, B, C);

    return plookupTable;
}

describe("snarkjs: Plookup > Plookup table tests", function () {
    this.timeout(150000);

    it("should throw an error when trying to construct a new Plookup table without using multisets as argument", async () => {
        let plookupTable = new PlookupTable();
        assert.throws(() => plookupTable.fromMultisets(1, "2", [3]),
            Error("PlookupTable.fromMultisets: arguments must be of Multiset type"));
    });

    it("should throw an error when trying to construct a new Plookup table from 3 multisets with different lengths", async () => {
        let multisetA = new Multiset(1);
        let multisetB = new Multiset(2);
        let multisetC = new Multiset(3);
        let plookupTable = new PlookupTable();
        assert.throws(() => plookupTable.fromMultisets(multisetA, multisetB, multisetC),
            Error("PlookupTable.fromMultisets: All Multisets must have same length"));
    });

    it("should properly construct a new PlookupTable from 3 multisets", async () => {
        let length = getRandomValue(30);
        let multisetA = new Multiset(length);
        let multisetB = new Multiset(length);
        let multisetC = new Multiset(length);

        for (let i = 0; i < length; i++) {
            multisetA.setElementAt(i, i);
            multisetB.setElementAt(i * 2, i);
            multisetC.setElementAt(i * 3, i);
        }
        let plookupTable = new PlookupTable();
        plookupTable.fromMultisets(multisetA, multisetB, multisetC);

        let res = plookupTable.toMultisets();

        assert.deepEqual(multisetA, res.a);
        assert.deepEqual(multisetB, res.b);
        assert.deepEqual(multisetC, res.c);
    });

    it("should push a new row properly on a plookup table", async () => {
        let plookupTable = new PlookupTable();
        let A = [getRandomValue(1000), getRandomValue(1000)];
        let B = [getRandomValue(1000), getRandomValue(1000)];
        let C = [getRandomValue(1000), getRandomValue(1000)];

        plookupTable.pushRow(A[0], B[0], C[0]);
        let res = plookupTable.toMultisets();
        assert.deepEqual(A.slice(0, 1), res.a.toArray());
        assert.deepEqual(B.slice(0, 1), res.b.toArray());
        assert.deepEqual(C.slice(0, 1), res.c.toArray());

        plookupTable.pushRow(A[1], B[1], C[1]);
        res = plookupTable.toMultisets();
        assert.deepEqual(A, res.a.toArray());
        assert.deepEqual(B, res.b.toArray());
        assert.deepEqual(C, res.c.toArray());
    });

    it("should return length properly", async () => {
        const length = getRandomValue(1000);
        let plookupTable = getVoidPlookupTable(length);

        assert.equal(length, plookupTable.length());
    });

    it("should throw an error when trying to read a row on an invalid position", async () => {
        const length = getRandomValue(1000);
        let plookupTable = getVoidPlookupTable(length);

        assert.throws(() => plookupTable.getRowAt(length), Error("PlookupTable.getRowAt: Index out of bounds"));
    });

    it("should return row at position indicated", async () => {
        const length = getRandomValue(1000);
        let plookupTable = new PlookupTable();

        let rows = [];
        for (let i = 0; i < length; i++) {
            const row = [getRandomValue(1000), getRandomValue(1000), getRandomValue(1000)];
            rows.push(row);
            plookupTable.pushRow(row[0], row[1], row[2]);
        }

        for (let i = 0; i < length; i++) {
            assert.deepEqual(rows[i], plookupTable.getRowAt(i));
        }
    });

    it("should return all rows", async () => {
        const length = getRandomValue(1000);
        let plookupTable = new PlookupTable();

        let rows = [];
        for (let i = 0; i < length; i++) {
            const row = [getRandomValue(1000), getRandomValue(1000), getRandomValue(1000)];
            rows.push(row);
            plookupTable.pushRow(row[0], row[1], row[2]);
        }

        assert.deepEqual(rows, plookupTable.getRows());
    });

    it("should throw an error when trying to set a row on an invalid position", async () => {
        const length = getRandomValue(1000);
        let plookupTable = getVoidPlookupTable(length);

        assert.throws(() => plookupTable.setRowAt(1, 2, 3, length), Error("PlookupTable.setRowAt: Index out of bounds"));
    });

    it("should set element at position indicated", async () => {
        const length = getRandomValue(1000);
        const index = getRandomValue(length) - 1;
        let plookupTable = getVoidPlookupTable(length);

        const row = [getRandomValue(1000), getRandomValue(1000), getRandomValue(1000)];
        plookupTable.setRowAt(row[0], row[1], row[2], index);
        assert.deepEqual(row, plookupTable.getRowAt(index));
    });

    it("should first and last element properly", async () => {
        const length = getRandomValue(1000);
        let plookupTable = getVoidPlookupTable(length);

        const firstRow = [getRandomValue(1000), getRandomValue(1000), getRandomValue(1000)];
        plookupTable.setRowAt(firstRow[0], firstRow[1], firstRow[2], 0);
        const lastRow = [getRandomValue(1000), getRandomValue(1000), getRandomValue(1000)];
        plookupTable.setRowAt(lastRow[0], lastRow[1], lastRow[2], length - 1);

        assert.deepEqual(firstRow, plookupTable.firstRow());
        assert.deepEqual(lastRow, plookupTable.lastRow());
    });

    it("should whether is empty or not", async () => {
        let plookupTable = new PlookupTable();

        assert.equal(true, plookupTable.isEmpty());

        plookupTable.pushRow(1, 1, 1);
        assert.equal(false, plookupTable.isEmpty());
    });

    it("should return the index of an element or -1 if it doesn't exist", async () => {
        const maxValue = 5000;
        const length = getRandomValue(1000);
        const randomIndex = getRandomValue(length) - 1;
        let plookupTable = new PlookupTable();

        let rows = [];
        for (let i = 0; i < length; i++) {
            const row = [getRandomValue(maxValue), getRandomValue(maxValue), getRandomValue(maxValue)];
            rows.push(row);
            plookupTable.pushRow(row[0], row[1], row[2]);
        }

        assert.equal(-1, plookupTable.lookup(maxValue + 1, maxValue + 1).idx);
        let res = plookupTable.lookup(rows[randomIndex][0], rows[randomIndex][1]);
        assert.deepEqual(rows[randomIndex], res.row);
        assert.equal(randomIndex, res.idx);
    });

    it("should return a compressed version of a plookup table", async () => {
        const maxValue = 5000;
        const length = getRandomValue(1000);
        let plookupTable = new PlookupTable();
        let randomChallenge = getRandomValue(10);

        let compressed = [];
        for (let i = 0; i < length; i++) {
            const row = [getRandomValue(maxValue), getRandomValue(maxValue), getRandomValue(maxValue)];
            compressed.push(row[0] + row[1] * randomChallenge + row[2] * Math.pow(randomChallenge, 2));
            plookupTable.pushRow(row[0], row[1], row[2]);
        }

        assert.deepEqual(compressed, plookupTable.compress(randomChallenge).toArray());
    });
});