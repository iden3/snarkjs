
const bn128 = require("ffjavascript").bn128;
const utils = require("ffjavascript").utils;

const blake2b = require("blake2b");

const ChaCha = require("ffjavascript").ChaCha;

function getG2sp(persinalization, challange, g1s, g1sx) {

    const h = blake2b(64);
    h.update(Buffer.from([persinalization]));
    h.update(challange);
    h.update( utils.beInt2Buff(g1s[0],32));
    h.update( utils.beInt2Buff(g1s[1],32));
    h.update( utils.beInt2Buff(g1sx[0],32));
    h.update( utils.beInt2Buff(g1sx[1],32));
    const hash = Buffer.from(h.digest());

    const seed = [];
    for (let i=0; i<8; i++) {
        seed[i] = hash.readUInt32BE(i*4);
    }

    const rng = new ChaCha(seed);

    const g2_sp = bn128.G2.fromRng(rng);

    return g2_sp;

}

function createKeyPair(curve, personalization, challangeHash, rng ) {
    const k = {};
    k.prvKey= curve.Fr.fromRng(rng);
    k.g1_s = curve.G1.affine(curve.G1.fromRng(rng));
    k.g1_sx = curve.G1.affine(curve.G1.mulScalar(k.g1_s, k.prvKey));
    k.g2_sp = curve.G2.affine(getG2sp(personalization, challangeHash, k.g1_s, k.g1_sx));
    k.g2_spx = curve.G2.affine(curve.G2.mulScalar(k.g2_sp, k.prvKey));
    return k;
}

function createPTauKey(curve, challangeHash, rng) {
    const key = {};
    key.tau = createKeyPair(curve, 0, challangeHash, rng);
    key.alpha = createKeyPair(curve, 1, challangeHash, rng);
    key.beta = createKeyPair(curve, 2, challangeHash, rng);
    return key;
}

module.exports.createPTauKey = createPTauKey;
module.exports.getG2sp = getG2sp;
