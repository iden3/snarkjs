const bigInt = require("big-integer");
const ZnField = require("./znfield.js");

module.eports = class G1Curve {

    constructor() {
        this.F = new ZnField(bigInt("21888242871839275222246405745257275088696311157297823662689037894645226208583"));
        this.g = [

        ];

    }

    add(p1, p2) {
        // TODO
        throw new Error("Not Implementted");
    }

    double(p1) {
        // TODO
        throw new Error("Not Implementted");
    }

    mulEscalar(p1, e) {
        // TODO
        throw new Error("Not Implementted");
    }

};
