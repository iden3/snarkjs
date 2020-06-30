
const blake2b = require("blake2b-wasm");

const ChaCha = require("ffjavascript").ChaCha;

function hashToG2(curve, hash) {
    const hashV = new DataView(hash.buffer, hash.byteOffset, hash.byteLength);
    const seed = [];
    for (let i=0; i<8; i++) {
        seed[i] = hashV.getUint32(i*4);
    }

    const rng = new ChaCha(seed);

    const g2_sp = curve.G2.fromRng(rng);

    return g2_sp;
}

function getG2sp(curve, persinalization, challange, g1s, g1sx) {

    const h = blake2b(64);
    const b1 = new Uint8Array([persinalization]);
    h.update(b1);
    h.update(challange);
    const b3 = curve.G1.toUncompressed(g1s);
    h.update( b3);
    const b4 = curve.G1.toUncompressed(g1sx);
    h.update( b4);
    const hash =h.digest();

    return hashToG2(curve, hash);
}

function calculatePubKey(k, curve, personalization, challangeHash, rng ) {
    k.g1_s = curve.G1.toAffine(curve.G1.fromRng(rng));
    k.g1_sx = curve.G1.toAffine(curve.G1.timesFr(k.g1_s, k.prvKey));
    k.g2_sp = curve.G2.toAffine(getG2sp(curve, personalization, challangeHash, k.g1_s, k.g1_sx));
    k.g2_spx = curve.G2.toAffine(curve.G2.timesFr(k.g2_sp, k.prvKey));
    return k;
}

function createPTauKey(curve, challangeHash, rng) {
    const key = {
        tau: {},
        alpha: {},
        beta: {}
    };
    key.tau.prvKey = curve.Fr.fromRng(rng);
    key.alpha.prvKey = curve.Fr.fromRng(rng);
    key.beta.prvKey = curve.Fr.fromRng(rng);
    calculatePubKey(key.tau, curve, 0, challangeHash, rng);
    calculatePubKey(key.alpha, curve, 1, challangeHash, rng);
    calculatePubKey(key.beta, curve, 2, challangeHash, rng);
    return key;
}

function createDeltaKey(curve, transcript, rng) {
    const delta = {};
    delta.prvKey = curve.Fr.fromRng(rng);
    delta.g1_s = curve.G1.toAffine(curve.G1.fromRng(rng));
    delta.g1_sx = curve.G1.toAffine(curve.G1.timesScalar(delta.g1_s, delta.prvKey));
    delta.g2_sp = hashToG2(curve, transcript);
    delta.g2_spx = curve.G2.toAffine(curve.G2.timesScalar(delta.g2_sp, delta.prvKey));
    return delta;
}

module.exports.createPTauKey = createPTauKey;
module.exports.getG2sp = getG2sp;
module.exports.hashToG2 = hashToG2;
module.exports.createDeltaKey =createDeltaKey;
