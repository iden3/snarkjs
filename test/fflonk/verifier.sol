// SPDX-License-Identifier: GPL-3.0
/*
    Copyright 2021 0KIMS association.

    This file is generated with [snarkJS](https://github.com/iden3/snarkjs).

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


pragma solidity >=0.7.0 <0.9.0;

contract PlonkVerifier {

    uint32 constant n         = 32;
    uint16 constant nPublic   = 1;
    uint16 constant nLagrange = 1;

    // Verification Key data
    uint256 constant k1   = 2;
    uint256 constant k2   = 3;
    uint256 constant w1   = 4419234939496763621076330863786513495701855246241724391626358375488475697872;
    uint256 constant w3   = 21888242871839275217838484774961031246154997185409878258781734729429964517155;
    uint256 constant w3_2 = 4407920970296243842393367215006156084916469457145843978461;
    uint256 constant w4   = 21888242871839275217838484774961031246007050428528088939761107053157389710902;
    uint256 constant w4_2 = 21888242871839275222246405745257275088548364400416034343698204186575808495616;
    uint256 constant w4_3 = 4407920970296243842541313971887945403937097133418418784715;
    uint256 constant wr   = 9222527969605388450625148037496647087331675164191659244434925070698893435503;
    uint256 constant X2x1 = 18029695676650738226693292988307914797657423701064905010927197838374790804409;
    uint256 constant X2x2 = 14583779054894525174450323658765874724019480979794335525732096752006891875705;
    uint256 constant X2y1 = 2140229616977736810657479771656733941598412651537078903776637920509952744750;
    uint256 constant X2y2 = 11474861747383700316476719153975578001603231366361248090558603872215261634898;

    uint256 constant q    = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    uint256 constant qf   = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    uint256 constant G1x  = 1;
    uint256 constant G1y  = 2;
    uint256 constant G2x1 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant G2x2 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant G2y1 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant G2y2 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;

    // Proof data
    uint16 constant pC1 = 32;
    uint16 constant pC2 = 96;
    uint16 constant pW1 = 160;
    uint16 constant pW2 = 224;
    uint16 constant pEval_ql  = 288;
    uint16 constant pEval_qr  = 320;
    uint16 constant pEval_qm  = 352;
    uint16 constant pEval_qo  = 384;
    uint16 constant pEval_qc  = 416;
    uint16 constant pEval_s1  = 448;
    uint16 constant pEval_s2  = 480;
    uint16 constant pEval_s3  = 512;
    uint16 constant pEval_a   = 544;
    uint16 constant pEval_b   = 576;
    uint16 constant pEval_c   = 608;
    uint16 constant pEval_z   = 640;
    uint16 constant pEval_zw  = 672;
    uint16 constant pEval_t1w = 704;
    uint16 constant pEval_t2w = 736;
    uint16 constant pEval_inv = 768;

    // Memory data
    // Challenges
    uint16 constant pAlpha  = 0;
    uint16 constant pBeta   = 32;
    uint16 constant pGamma  = 64;
    uint16 constant pY      = 96;
    uint16 constant pXiSeed = 128;
    uint16 constant pXiSeed2= 160;
    uint16 constant pXi     = 192;

    // Roots
    uint16 constant pH1w4_0 = 224;
    uint16 constant pH1w4_1 = 256;
    uint16 constant pH1w4_2 = 288;
    uint16 constant pH1w4_3 = 320;

    uint16 constant pH2w3_0 = 352;
    uint16 constant pH2w3_1 = 384;
    uint16 constant pH2w3_2 = 416;

    uint16 constant pH3w3_0 = 448;
    uint16 constant pH3w3_1 = 480;
    uint16 constant pH3w3_2 = 512;

    uint16 constant pPi     = 544;
    uint16 constant pR1     = 576;
    uint16 constant pR2     = 608;

    uint16 constant pF      = 640;  // 64 bytes
    uint16 constant pE      = 704;  // 64 bytes
    uint16 constant pJ      = 768;  // 64 bytes
    uint16 constant pA      = 832; // 64 bytes

    uint16 constant pZh     = 896;
    // From this point we write all the variables that must compute the inverse using the Montgomery batch inversion
    uint16 constant pZhInv  = 928;
    uint16 constant pDen    = 960;
    uint16 constant pRInv   = 992; // Reserve 10 * 32 bytes to compute R1 and R2 inversions
    
    uint16 constant pEval_l1 = 1312;
    
    
    uint16 constant lastMem = 1344;

    function verifyProof(bytes memory proof, uint[] memory pubSignals) public view returns (bool) {
        assembly {
            // Computes the inverse of an array of values
            // See https://vitalik.ca/general/2018/07/21/starks_part_3.html in section where explain fields operations
            // To save the inverse to be computed on chain the prover sends the inverse as an evaluation in proof.eval_inv
            function inverseArray(pProof, pVals, n) {

                let pAux := mload(0x40)     // Point to the next free position
                let pIn := pVals
                let lastPIn := add(pVals, mul(n, 32))  // Read n elemnts
                let acc := mload(pIn)       // Read the first element
                pIn := add(pIn, 32)         // Point to the second element

                for { } lt(pIn, lastPIn) {
                    pAux := add(pAux, 32)
                    pIn := add(pIn, 32)
                }
                {
                    mstore(pAux, acc)
                    acc := mulmod(acc, mload(pIn), q)
                }

                let inv := mload(add(pProof, pEval_inv))

                // Before using the inverse sent by the prover the verifier checks inv(batch) * batch === 1
                if iszero(eq(1, mulmod(acc, inv, q))) {
                    mstore(0, 0)
                    return(0,0x20)
                }

                acc := inv

                // At this point pAux pint to the next free position we substract 1 to point to the last used
                pAux := sub(pAux, 32)
                // pIn points to the n+1 element, we substract to point to n
                pIn := sub(pIn, 32)
                lastPIn := pVals  // We don't process the first element
                for { } gt(pIn, lastPIn) {
                    pAux := sub(pAux, 32)
                    pIn := sub(pIn, 32)
                }
                {
                    inv := mulmod(acc, mload(pAux), q)
                    acc := mulmod(acc, mload(pIn), q)
                    mstore(pIn, inv)
                }
                // pIn points to first element, we just set it.
                mstore(pIn, acc)
            }

            function checkField(v) {
                if iszero(lt(v, q)) {
                    mstore(0, 0)
                    return(0,0x20)
                }
            }

            // Validate all the evaluations sent by the prover ∈ F
            function checkInput(pProof) {
                if iszero(eq(mload(pProof), 768 )) {
                    mstore(0, 0)
                    return(0,0x20)
                }

                checkField(mload(add(pProof, pEval_ql)))
                checkField(mload(add(pProof, pEval_qr)))
                checkField(mload(add(pProof, pEval_qm)))
                checkField(mload(add(pProof, pEval_qo)))
                checkField(mload(add(pProof, pEval_qc)))
                checkField(mload(add(pProof, pEval_s1)))
                checkField(mload(add(pProof, pEval_s2)))
                checkField(mload(add(pProof, pEval_s3)))
                checkField(mload(add(pProof, pEval_a)))
                checkField(mload(add(pProof, pEval_b)))
                checkField(mload(add(pProof, pEval_c)))
                checkField(mload(add(pProof, pEval_z)))
                checkField(mload(add(pProof, pEval_zw)))
                checkField(mload(add(pProof, pEval_t1w)))
                checkField(mload(add(pProof, pEval_t2w)))
                checkField(mload(add(pProof, pEval_inv)))

                // Points are checked in the point operations precompiled smart contracts
            }

            function computeChallenges(pProof, pMem, pPublic) {
                // Compute challenge.beta & challenge.gamma
                
                mstore( add(pMem, 1344 ), mload( add( pPublic, 32)))
                
                mstore( add(pMem, 1376 ),  mload( add( pProof, pC1)))
                mstore( add(pMem, 1408 ),  mload( add( pProof, add(pC1, 32))))

                mstore( add(pMem, pBeta), mod(keccak256(add(pMem, lastMem), 96), q))
                mstore( add(pMem, pGamma), mod(keccak256(add(pMem, pBeta), 32), q))

                // Get xiSeed & xiSeed2
                mstore( add(pMem, lastMem ),  mload( add( pProof, pC2)))
                mstore( add(pMem, 1376 ),  mload( add( pProof, add(pC2, 32))))
                let xiSeed := mod(keccak256(add(pMem, lastMem), 64), q)

                mstore( add(pMem, pXiSeed), xiSeed)
                mstore( add(pMem, pXiSeed2), mulmod(xiSeed, xiSeed, q))

                // Compute roots.S1.h1w4
                mstore( add(pMem, pH1w4_0), mulmod(mload(add(pMem, pXiSeed2)), mload(add(pMem, pXiSeed)), q))
                mstore( add(pMem, pH1w4_1), mulmod(mload(add(pMem, pH1w4_0)), w4, q))
                mstore( add(pMem, pH1w4_2), mulmod(mload(add(pMem, pH1w4_0)), w4_2, q))
                mstore( add(pMem, pH1w4_3), mulmod(mload(add(pMem, pH1w4_0)), w4_3, q))

                // Compute roots.S2.h2w3
                mstore( add(pMem, pH2w3_0), mulmod(mload(add(pMem, pXiSeed2)), mload(add(pMem, pXiSeed2)), q))
                mstore( add(pMem, pH2w3_1), mulmod(mload(add(pMem, pH2w3_0)), w3, q))
                mstore( add(pMem, pH2w3_2), mulmod(mload(add(pMem, pH2w3_0)), w3_2, q))

                // Compute roots.S2.h2w3
                mstore( add(pMem, pH3w3_0), mulmod(mload(add(pMem, pH2w3_0)), wr, q))
                mstore( add(pMem, pH3w3_1), mulmod(mload(add(pMem, pH3w3_0)), w3, q))
                mstore( add(pMem, pH3w3_2), mulmod(mload(add(pMem, pH3w3_0)), w3_2, q))

                let xin := mulmod(mulmod(mload(add(pMem, pH2w3_0)), mload(add(pMem, pH2w3_0)), q), mload(add(pMem, pH2w3_0)), q)
                mstore( add(pMem, pXi), xin)

                // Compute xi^n
                
                xin:= mulmod(xin, xin, q)
                
                xin:= mulmod(xin, xin, q)
                
                xin:= mulmod(xin, xin, q)
                
                xin:= mulmod(xin, xin, q)
                
                xin:= mulmod(xin, xin, q)
                

                xin:= mod(add(sub(xin, 1), q), q)
                mstore( add(pMem, pZh), xin)
                mstore( add(pMem, pZhInv), xin)  // We will invert later together with lagrange pols

                // Compute challenge.alpha
                mstore( add(pMem, pAlpha), mod(keccak256(add(pProof, pEval_ql), 480), q))

                // Compute challenge.y
                mstore( add(pMem, pY), mod(keccak256(add(pProof, pW1), 64), q))
            }

            // This function computes allows as to compute (X-X1)·(X-X2)·...·(X-Xn) used in Lagrange interpolation
            function calcLagrangeItem(pMem, i, n, pX, pXi) -> result {
                let idx := i
                let max := add(n, 1)
                result := 1
                let X := mload(add(pMem, pX))
                for { let j := 0 } lt(j, n) { j := add(j, 1) }
                {
                    idx := mod(add(idx, 1), max)

                    result := mulmod(result, addmod(X, mod(sub(q, mload(add(pMem, add(pXi, mul(idx, 32))))), q), q), q)
                }
            }

            // Prepare all the denominators that must be inverted, placed them in consecutive memory addresses
            function computeInversions(pProof, pMem) {
                // 1/ZH(xi) used in steps 8 and 9 of the verifier to multiply by 1/Z_H(xi)
                // Value computed during computeChallenges function and stores in pMem+pZhInv

                // 1/( (y - h2) (y - h2w3) (y - h2w3_2) (y - h3) (y - h3w3) (y - h3w3_2) (C1(X) - R1(y)) )
                // used in stepps 10 and 11 of the verifier
                let y := mload(add(pMem, pY))
                let w := addmod(y, mod(sub(q, mload(add(pMem, pH2w3_0))), q), q)
                w := mulmod(w, addmod(y, mod(sub(q, mload(add(pMem, pH2w3_1))), q), q), q)
                w := mulmod(w, addmod(y, mod(sub(q, mload(add(pMem, pH2w3_2))), q), q), q)
                w := mulmod(w, addmod(y, mod(sub(q, mload(add(pMem, pH3w3_0))), q), q), q)
                w := mulmod(w, addmod(y, mod(sub(q, mload(add(pMem, pH3w3_1))), q), q), q)
                w := mulmod(w, addmod(y, mod(sub(q, mload(add(pMem, pH3w3_2))), q), q), q)

                mstore(add(pMem, pDen), w)

                // Denominator needed in the verifier when computing L_i^{S1}(X)
                
                mstore(add(pMem, add(pRInv, mul(0, 32))), calcLagrangeItem(pMem, 0, 3, add(pH1w4_0, mul(0, 32)), pH1w4_0))
                
                mstore(add(pMem, add(pRInv, mul(1, 32))), calcLagrangeItem(pMem, 1, 3, add(pH1w4_0, mul(1, 32)), pH1w4_0))
                
                mstore(add(pMem, add(pRInv, mul(2, 32))), calcLagrangeItem(pMem, 2, 3, add(pH1w4_0, mul(2, 32)), pH1w4_0))
                
                mstore(add(pMem, add(pRInv, mul(3, 32))), calcLagrangeItem(pMem, 3, 3, add(pH1w4_0, mul(3, 32)), pH1w4_0))
                

                // Denominator needed in the verifier when computing L_i^{S2}(X)
                
                mstore(add(pMem, add(pRInv, add(128, mul(0, 32)))), calcLagrangeItem(pMem, 0, 5, add(pH2w3_0, mul(0, 32)), pH2w3_0))
                
                mstore(add(pMem, add(pRInv, add(128, mul(1, 32)))), calcLagrangeItem(pMem, 1, 5, add(pH2w3_0, mul(1, 32)), pH2w3_0))
                
                mstore(add(pMem, add(pRInv, add(128, mul(2, 32)))), calcLagrangeItem(pMem, 2, 5, add(pH2w3_0, mul(2, 32)), pH2w3_0))
                
                mstore(add(pMem, add(pRInv, add(128, mul(3, 32)))), calcLagrangeItem(pMem, 3, 5, add(pH2w3_0, mul(3, 32)), pH2w3_0))
                
                mstore(add(pMem, add(pRInv, add(128, mul(4, 32)))), calcLagrangeItem(pMem, 4, 5, add(pH2w3_0, mul(4, 32)), pH2w3_0))
                
                mstore(add(pMem, add(pRInv, add(128, mul(5, 32)))), calcLagrangeItem(pMem, 5, 5, add(pH2w3_0, mul(5, 32)), pH2w3_0))
                

                // L_i where i from 1 to num public inputs, needed in step 6 and 7 of the verifier to compute L_1(xi) and PI(xi)
                w := 1
                let xi := mload(add(pMem, pXi))
                
                mstore(add(pMem, pEval_l1), mulmod(n, mod(add(sub(xi, w), q), q), q))
                
                

                // Execute Montgomery batched inversions of the previous prepared values
                inverseArray(pProof, add(pMem, pZhInv), 13)
            }

            // Compute Lagrange polynomial evaluation L_i(xi)
            function computeLagrange(pMem) {
                let zh := mload(add(pMem, pZh))
                let w := 1
                
                
                mstore(add(pMem, pEval_l1 ), mulmod(mload(add(pMem, pEval_l1 )), zh, q))
                
                
                
            }

            // Compute public input polynomial evaluation PI(xi)
            function computePi(pMem, pPub) {
                let pi := 0

                
                pi := mod(add(sub(pi, mulmod(mload(add(pMem, pEval_l1)),mload(add(pPub, 32)), q)), q), q)
                

                mstore(add(pMem, pPi), pi)
            }

            // Compute r1(y) by interpolating the polynomial r1(X) using 4 points (x,y)
            // where x = {h1, h1w4, h1w4^2, h1w4^3}
            // and   y = {C1(h1), C1(h1w4), C1(h1w4^2), C1(h1w4^3)}
            // and computing T0(xi)
            function computeR1(pProof, pMem) {
                let t0
                let evalA := mload(add(pProof, pEval_a))
                let evalB := mload(add(pProof, pEval_b))
                let evalC := mload(add(pProof, pEval_c))

                t0 := mulmod(mload(add(pProof, pEval_ql)), evalA, q)
                t0 := addmod(t0, mulmod(mload(add(pProof, pEval_qr)), evalB, q) ,q)
                t0 := addmod(t0, mulmod(mload(add(pProof, pEval_qm)), mulmod(evalA, evalB, q), q) ,q)
                t0 := addmod(t0, mulmod(mload(add(pProof, pEval_qo)), evalC, q) ,q)
                t0 := addmod(t0, mload(add(pProof, pEval_qc)) ,q)
                t0 := addmod(t0, mload(add(pMem, pPi)), q)
                t0 := mulmod(t0, mload(add(pMem, pZhInv)), q)

                let res
                for { let i := 0 } lt(i, 4) { i := add(i, 1) }
                {
                    let c1Value := evalA
                    let h1w4 := mload(add(pMem, add(pH1w4_0, mul(i, 32))))

                    c1Value := addmod(c1Value, mulmod(h1w4, evalB, q), q)
                    let square := mulmod(h1w4, h1w4, q)
                    c1Value := addmod(c1Value, mulmod(square, evalC, q), q)
                    c1Value := addmod(c1Value, mulmod(mulmod(square, h1w4, q), t0, q), q)

                    let lagrange := calcLagrangeItem(pMem, i, 3, pY, pH1w4_0)
                    lagrange := mulmod(lagrange, mload(add(pMem, add(pRInv, mul(i, 32)))), q)

                    res := addmod(res, mulmod(c1Value, lagrange, q), q)
                }

                mstore(add(pMem, pR1), res)
            }

            // Compute r2(y) by interpolating the polynomial r2(X) using 6 points (x,y)
            // where x = {[h2, h2w3, h2w3^2], [h3, h3w3, h3w3^2]}
            // and   y = {[C2(h2), C2(h2w3), C2(h2w3^2)], [C2(h3), C2(h3w3), C2(h3w3^2)]}
            // and computing T1(xi) and T2(xi)
            function computeR2(pProof, pMem) {
                let t1
                let t2
                let betaXi := mulmod(mload(add(pMem, pBeta)), mload(add(pMem, pXi)), q)
                let gamma := mload(add(pMem, pGamma))
                let evalZ := mload(add(pProof, pEval_z))
                let evalZw := mload(add(pProof, pEval_zw))

                t2 := addmod(mload(add(pProof, pEval_a)), addmod(betaXi, gamma, q) ,q)
                t2 := mulmod(t2,
                            addmod(mload(add(pProof, pEval_b)),
                            addmod(mulmod(betaXi, k1, q), gamma, q) ,q), q)
                t2 := mulmod(t2,
                            addmod(mload(add(pProof, pEval_c)),
                            addmod(mulmod(betaXi, k2, q), gamma, q) ,q), q)
                t2 := mulmod(t2, evalZ, q)

                //Let's use t1 as a temporal variable to save one local
                t1 := addmod(mload(add(pProof, pEval_a)), addmod(mulmod(mload(add(pMem, pBeta)), mload(add(pProof, pEval_s1)), q), gamma, q) ,q)
                t1 := mulmod(t1,
                      addmod(mload(add(pProof, pEval_b)), addmod(mulmod(mload(add(pMem, pBeta)), mload(add(pProof, pEval_s2)), q), gamma, q) ,q), q)
                t1 := mulmod(t1,
                      addmod(mload(add(pProof, pEval_c)), addmod(mulmod(mload(add(pMem, pBeta)), mload(add(pProof, pEval_s3)), q), gamma, q) ,q), q)
                t1 := mulmod(t1, evalZw, q)

                t2:= addmod(t2, mod(sub(q, t1), q), q)
                t2 := mulmod(t2, mload(add(pMem, pZhInv)), q)

                // Compute T1(xi)
                t1 := sub(evalZ, 1)
                t1 := mulmod(t1, mload(add(pMem, pEval_l1)) ,q)
                t1 := mulmod(t1, mload(add(pMem, pZhInv)) ,q)

                // Let's use local variable gamma to save the result
                gamma:=0
                for { let i := 0 } lt(i, 6) { i := add(i, 1) }
                {
                    let hw := mload(add(pMem, add(pH2w3_0, mul(i, 32))))

                    let c2Value
                    if lt(i, 3) {
                        c2Value := addmod(evalZ, mulmod(hw, t1, q), q)
                        c2Value := addmod(c2Value, mulmod(mulmod(hw, hw, q), t2, q), q)
                    }
                    if gt(i, 2) {
                        c2Value := addmod(evalZw, mulmod(hw, mload(add(pProof, pEval_t1w)), q), q)
                        c2Value := addmod(c2Value, mulmod(mulmod(hw, hw, q), mload(add(pProof, pEval_t2w)), q), q)
                    }

                    let lagrange := calcLagrangeItem(pMem, i, 5, pY, pH2w3_0)
                    lagrange := mulmod(lagrange, mload(add(pMem, add(pRInv,add(128, mul(i, 32))))), q)

                    gamma := addmod(gamma, mulmod(c2Value, lagrange, q), q)
                }

                mstore(add(pMem, pR2), gamma)
            }

            // G1 function to accumulate a G1 value to an address
            function g1_acc(pR, pP) {
                let mIn := mload(0x40)
                mstore(mIn, mload(pR))
                mstore(add(mIn,32), mload(add(pR, 32)))
                mstore(add(mIn,64), mload(pP))
                mstore(add(mIn,96), mload(add(pP, 32)))

                let success := staticcall(sub(gas(), 2000), 6, mIn, 128, pR, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0,0x20)
                }
            }

            // G1 function to multiply a G1 value to value in an address
            function g1_mulAcc(pR, pP, s) {
                let success
                let mIn := mload(0x40)
                mstore(mIn, mload(pP))
                mstore(add(mIn,32), mload(add(pP, 32)))
                mstore(add(mIn,64), s)

                success := staticcall(sub(gas(), 2000), 7, mIn, 96, mIn, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0,0x20)
                }

                mstore(add(mIn,64), mload(pR))
                mstore(add(mIn,96), mload(add(pR, 32)))

                success := staticcall(sub(gas(), 2000), 6, mIn, 128, pR, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0,0x20)
                }
            }

            // G1 function to multiply a G1 value(x,y) to value in an address
            function g1_mulAccC(pR, x, y, s) {
                let success
                let mIn := mload(0x40)
                mstore(mIn, x)
                mstore(add(mIn,32), y)
                mstore(add(mIn,64), s)

                success := staticcall(sub(gas(), 2000), 7, mIn, 96, mIn, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0,0x20)
                }

                mstore(add(mIn,64), mload(pR))
                mstore(add(mIn,96), mload(add(pR, 32)))

                success := staticcall(sub(gas(), 2000), 6, mIn, 128, pR, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0,0x20)
                }
            }

            function computeFEJ(pProof, pMem) {
                // Prepare shared numerator between F, E and J to reuse it
                let y := mload(add(pMem, pY))
                let numerator := addmod(y, mod(sub(q, mload(add(pMem, pH1w4_0))), q), q)
                numerator := mulmod(numerator , addmod(y, mod(sub(q, mload(add(pMem, pH1w4_1))), q), q), q)
                numerator := mulmod(numerator , addmod(y, mod(sub(q, mload(add(pMem, pH1w4_2))), q), q), q)
                numerator := mulmod(numerator , addmod(y, mod(sub(q, mload(add(pMem, pH1w4_3))), q), q), q)

                // Prepare shared quotient between F and E to reuse it
                let quotient := mulmod(mload(add(pMem, pAlpha)), mulmod(numerator, mload(add(pMem, pDen)), q), q)

                // Compute full batched polynomial commitment [F]_1
                g1_acc(add(pMem, pF), add(pProof, pC1))
                g1_mulAcc(add(pMem, pF), add(pProof, pC2), quotient)

                // Compute group-encoded batch evaluation [E]_1
                g1_mulAccC(add(pMem, pE), G1x, G1y, addmod(mload(add(pMem, pR1)), mulmod(quotient, mload(add(pMem, pR2)),q) , q))

                // Compute the full difference [J]_1
                g1_mulAcc(add(pMem, pJ), add(pProof, pW1), numerator)
            }

            // Validate all evaluations with a pairing checking that e([F]_1 - [E]_1 - [J]_1 + y[W2]_1, [1]_2) == e([W']_1, [x]_2)
            function checkPairing(pProof, pMem) -> isOk {
                let mIn := mload(0x40)

                // First pairing value
                // Compute -E
                mstore(add(add(pMem, pE), 32), mod(sub(qf, mload(add(add(pMem, pE), 32))), qf))
                // Compute -J
                mstore(add(add(pMem, pJ), 32), mod(sub(qf, mload(add(add(pMem, pJ), 32))), qf))
                // A = F - E - J + y·W2
                g1_acc(add(pMem, pA), add(pMem, pF))
                g1_acc(add(pMem, pA), add(pMem, pE))
                g1_acc(add(pMem, pA), add(pMem, pJ))
                g1_mulAcc(add(pMem, pA), add(pProof, pW2), mload(add(pMem, pY)))

                mstore(mIn, mload(add(pMem, pA)))
                mstore(add(mIn,32), mload(add(add(pMem, pA), 32)))

                // Second pairing value
                mstore(add(mIn,64), G2x2)
                mstore(add(mIn,96), G2x1)
                mstore(add(mIn,128), G2y2)
                mstore(add(mIn,160), G2y1)

                // Third pairing value
                // Compute -W2
                mstore(add(mIn, 192), mload(add(pProof, pW2)))
                let s := mload(add(add(pProof, pW2), 32))
                s := mod(sub(qf, s), qf)
                mstore(add(mIn,224), s)

                // Fourth pairing value
                mstore(add(mIn,256), X2x2)
                mstore(add(mIn,288), X2x1)
                mstore(add(mIn,320), X2y2)
                mstore(add(mIn,352), X2y1)

                let success := staticcall(sub(gas(), 2000), 8, mIn, 384, mIn, 0x20)

                isOk := and(success, mload(mIn))
            }

            let pMem := mload(0x40)
            mstore(0x40, add(pMem, lastMem))

            // Validate that all evaluations ∈ F
            checkInput(proof)

            // Compute the challenges: beta, gamma, xi, alpha and y ∈ F, h1w4/h2w3/h3w3 roots, xiN and zh(xi)
            computeChallenges(proof, pMem, pubSignals)

            // To divide prime fields the Extended Euclidean Algorithm for computing modular inverses is needed.
            // The Montgomery batch inversion algorithm allow us to compute n inverses reducing to a single one inversion.
            // More info: https://vitalik.ca/general/2018/07/21/starks_part_3.html
            // To avoid this single inverse computation on-chain, it has been computed in proving time and send it to the verifier.
            // Therefore, the verifier:
            //      1) Prepare all the denominators to inverse
            //      2) Check the inverse sent by the prover it is what it should be
            //      3) Compute the others inverses using the Montgomery Batched Algorithm using the inverse sent to avoid the inversion operation it does.
            computeInversions(proof, pMem)

            // Compute Lagrange polynomial evaluations Li(xi)
            computeLagrange(pMem)

            // Compute public input polynomial evaluation PI(xi) = \sum_i^l -public_input_i·L_i(xi)
            computePi(pMem, pubSignals)

            // Computes r1(y) and r2(y)
            computeR1(proof, pMem)
            computeR2(proof, pMem)

            // Compute full batched polynomial commitment [F]_1, group-encoded batch evaluation [E]_1 and the full difference [J]_1
            computeFEJ(proof, pMem)

            // Validate all evaluations
            let isValid := checkPairing(proof, pMem)

            mstore(0x40, sub(pMem, lastMem))
            mstore(0, isValid)
            return(0,0x20)
        }
    }
}
