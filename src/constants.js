const bigInt = require("big-integer");

const F1Field = require("./f1field");
const F2Field = require("./f1field");

const C = {

    // Module of the field
    q : bigInt("21888242871839275222246405745257275088696311157297823662689037894645226208583"),

    // Order of the group
    r : bigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617"),

    g1 : [ bigInt(1), bigInt(2) ],
    g2 :
        [
            [
                bigInt("10857046999023057135944570762232829481370756359578518086990519993285655852781"),
                bigInt("11559732032986387107991004021392285783925812861821192530917403151452391805634")
            ],
            [
                bigInt("8495653923123431417604973247489272438418190587263600148770280649306958101930"),
                bigInt("4082367875863433681332203403145435568316851327593401208105741076214120093531")
            ]
        ],

    f2nonResidue: bigInt("21888242871839275222246405745257275088696311157297823662689037894645226208582"),
    f6nonResidue: [ bigInt("9"), bigInt("1") ],
    f12nonResidue: [
    ]
};

const F1 = new F1Field(C.q);
const F2 = new F2Field(C.q);

C.two_inv= F1.inverse(bigInt(2));

C.coef_b = bigInt(3);
C.twist = [bigInt(9) , bigInt(1)];
C.twist_coeff_b = F2.mulEscalar(  F2.inverse(C.twist), C.coef_b  );


module.exports = C;

