
const loadR1cs = require("r1csfile").load;
const utils = require("./powersoftau_utils");
const binFileUtils = require("./binfileutils");
const writeZKey = require("./zkeyfile").write;
const assert = require("assert");


function log2( V )
{
    return( ( ( V & 0xFFFF0000 ) !== 0 ? ( V &= 0xFFFF0000, 16 ) : 0 ) | ( ( V & 0xFF00FF00 ) !== 0 ? ( V &= 0xFF00FF00, 8 ) : 0 ) | ( ( V & 0xF0F0F0F0 ) !== 0 ? ( V &= 0xF0F0F0F0, 4 ) : 0 ) | ( ( V & 0xCCCCCCCC ) !== 0 ? ( V &= 0xCCCCCCCC, 2 ) : 0 ) | ( ( V & 0xAAAAAAAA ) !== 0 ) );
}


module.exports  = async function phase2new(r1csName, ptauName, zkeyName) {

    const r1cs = await loadR1cs(r1csName, true);

    const {fd: ptauFd, sections} = await binFileUtils.readBinFile(ptauName, "ptau", 1);
    const {curve, power} = await utils.readPTauHeader(ptauFd, sections);

    if (r1cs.prime != curve.r) {
        console.log("r1cs curve does not match powers of tau ceremony curve");
        return -1;
    }

    const cirPower = log2(r1cs.nConstraints + r1cs.nPubInputs + r1cs.nOutputs +1 -1) +1;

    if (cirPower > power) {
        console.log(`circuit too big for this power of tau ceremony. ${r1cs.nConstraints} > 2**${power}`);
        return -1;
    }

    if (!sections[12]) {
        console.log("Powers of tau is not prepared.");
        return -1;
    }

    const zKey = {

        nPublic: r1cs.nOutputs + r1cs.nPubInputs,
        nVars: r1cs.nVars,
        q: curve.q,
        r: curve.r,
        domainBits: cirPower,
        domainSize: 1 << cirPower

    };

    const linc = 1 << (power - cirPower);

    calculatePolinomials(curve, zKey,r1cs);

    zKey.A = new Array(r1cs.nVars);
    zKey.B1 = new Array(r1cs.nVars);
    zKey.B2 = new Array(r1cs.nVars);
    zKey.C = new Array(r1cs.nVars);
    zKey.IC = new Array(zKey.nPublic+1);
    for (let i=0; i<r1cs.nVars; i++) {
        zKey.A[i] = curve.G1.zero;
        zKey.B1[i] = curve.G1.zero;
        zKey.B2[i] = curve.G2.zero;
        if (i>zKey.nPublic) {
            zKey.C[i] = curve.G1.zero;
        } else {
            zKey.IC[i] = curve.G1.zero;
        }
    }
    for (let i=0; i<zKey.ccoefs.length; i++) {
        const c = zKey.ccoefs[i];
        let CIC;
        if (c.matrix == 0) {
            const l1 = await readEvaluation("lTauG1", c.constraint);
            const l2 = await readEvaluation("lBetaTauG1", c.constraint);
            zKey.A[c.signal] =
                curve.G1.add(
                    zKey.A[c.signal],
                    curve.G1.mulScalar(l1, c.value)
                );
            CIC = curve.G1.mulScalar(l2, c.value);
        } else if (c.matrix == 1) {
            const l1 = await readEvaluation("lTauG1", c.constraint);
            const l2 = await readEvaluation("lTauG2", c.constraint);
            const l3 = await readEvaluation("lAlphaTauG1", c.constraint);
            zKey.B1[c.signal] =
                curve.G1.add(
                    zKey.B1[c.signal],
                    curve.G1.mulScalar(l1, c.value)
                );
            zKey.B2[c.signal] =
                curve.G2.add(
                    zKey.B2[c.signal],
                    curve.G2.mulScalar(l2, c.value)
                );
            CIC = curve.G1.mulScalar(l3, c.value);
        } else if (c.matrix == 2) {
            const l1 = await readEvaluation("lTauG1", c.constraint);
            CIC = curve.G1.mulScalar(l1, c.value);
        } else {
            assert(false);
        }

        if (c.signal <= zKey.nPublic) {
            zKey.IC[c.signal] =
                curve.G1.add(
                    zKey.IC[c.signal],
                    CIC
                );
        } else {
            zKey.C[c.signal] =
                curve.G1.add(
                    zKey.C[c.signal],
                    CIC
                );
        }
    }


    zKey.hExps = new Array(zKey.domainSize-1);
    for (let i=0; i< zKey.domainSize; i++) {
        const t1 = await readEvaluation("tauG1", i);
        const t2 = await readEvaluation("tauG1", i+zKey.domainSize);
        zKey.hExps[i] = curve.G1.add(t1, t2);
    }

    zKey.vk_alfa_1 = await readEvaluation("alphaTauG1", 0);
    zKey.vk_beta_1 = await readEvaluation("betaTauG1", 0);
    zKey.vk_delta_1 = curve.G1.g;
    zKey.vk_beta_2 = await readEvaluation("betaG2", 0);
    zKey.vk_gamma_2 = curve.G2.g;
    zKey.vk_delta_2 = curve.G2.g;

    await writeZKey(zkeyName, zKey);

    return 0;

    async function readEvaluation(sectionName, idx) {
        let o;
        let G;
        switch (sectionName) {
        case "tauG1": o = sections[2][0].p; G = curve.G1;  break;
        case "tauG2": o = sections[3][0].p; G = curve.G2;  break;
        case "alphaTauG1": o = sections[4][0].p; G = curve.G1;  break;
        case "betaTauG1": o = sections[5][0].p; G = curve.G1;  break;
        case "betaG2": o = sections[6][0].p; G = curve.G2;  break;
        case "lTauG1": o = sections[12][0].p; G = curve.G1;  break;
        case "lTauG2": o = sections[13][0].p; G = curve.G2; break;
        case "lAlphaTauG1": o = sections[14][0].p; G = curve.G1; break;
        case "lBetaTauG1": o = sections[15][0].p; G = curve.G1; break;
        }
        const sG = G.F.n8*2;
        ptauFd.pos = o + sG*idx*linc;
        const buff = await ptauFd.read(sG);
        return G.fromRprLEM(buff, 0);
    }

};


function calculatePolinomials(curve, zKey, r1cs) {

    zKey.ccoefs = [];
    for (let m=0; m<2; m++) {
        for (let c=0; c<r1cs.nConstraints; c++) {
            const signals = Object.keys(r1cs.constraints[c][m]);
            signals.forEach( (s) => {
                zKey.ccoefs.push({
                    matrix: m,
                    constraint: c,
                    signal: s,
                    value: r1cs.constraints[c][m][s]
                });
            });
        }
    }

    /**
     * add and process the constraints
     *     input_i * 0 = 0
     * to ensure soundness of input consistency
     */
    for (let i = 0; i < r1cs.nPubInputs + r1cs.nOutputs + 1; ++i)
    {
        zKey.ccoefs.push({
            matrix: 0,
            constraint: r1cs.nConstraints + i,
            signal: i,
            value: curve.Fr.one
        });
    }
}
