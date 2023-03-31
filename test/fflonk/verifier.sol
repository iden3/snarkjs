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

contract FflonkVerifier {
    uint32 constant n     = 256; // Domain size

    // Verification Key data
    uint256 constant k1   = 2;   // Plonk k1 multiplicative factor to force distinct cosets of H
    uint256 constant k2   = 3;   // Plonk k2 multiplicative factor to force distinct cosets of H

    // Verification Key data
    // Omegas
    uint256 constant w1_1d1 = 3478517300119284901893091970156912948790432420133812234316178878452092729974;
    uint256 constant w2_1 = 21888242871839275222246405745257275088548364400416034343698204186575808495616;
    uint256 constant w2_1d2 = 6837567842312086091520287814181175430087169027974246751610506942214842701774;
    uint256 constant w3_1 = 4407920970296243842393367215006156084916469457145843978461;
    uint256 constant w3_2 = 21888242871839275217838484774961031246154997185409878258781734729429964517155;
    uint256 constant w4_1 = 21888242871839275217838484774961031246007050428528088939761107053157389710902;
    uint256 constant w4_2 = 21888242871839275222246405745257275088548364400416034343698204186575808495616;
    uint256 constant w4_3 = 4407920970296243842541313971887945403937097133418418784715;
   
    // Verifier preprocessed input x·[1]_2
    uint256 constant X2x1 = 18029695676650738226693292988307914797657423701064905010927197838374790804409;
    uint256 constant X2x2 = 14583779054894525174450323658765874724019480979794335525732096752006891875705;
    uint256 constant X2y1 = 2140229616977736810657479771656733941598412651537078903776637920509952744750;
    uint256 constant X2y2 = 11474861747383700316476719153975578001603231366361248090558603872215261634898;

    // Scalar field size
    uint256 constant q    = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    // Base field size
    uint256 constant qf   = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    uint256 constant f0x = 5040885225675242093991327715690700859888137652241793497978813673817806984929;
    uint256 constant f0y = 235484823402135653481716166441647924097297494313327873720120485639578416237;
    uint256 constant f1x = 7227904400484194038922600346908845824882540455188871717133753056292772721669;
    uint256 constant f1y = 9567568691541620441530076971692801079145181715199569054343698661329724263861;

    // [1]_1
    uint256 constant G1x  = 1;
    uint256 constant G1y  = 2;
    // [1]_2
    uint256 constant G2x1 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant G2x2 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant G2y1 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant G2y2 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;

    // Commits calldata
    // Byte offset of every parameter in the calldata
    // Polynomial commitments W and Wp
    uint16 constant pW = 4 + 0;
    uint16 constant pWp = 4 + 64;

    // Polynomial commitments fi
    uint16 constant pf2 = 4 + 128;
    uint16 constant pf3 = 4 + 192;
    uint16 constant pf4 = 4 + 256;
    uint16 constant pf5 = 4 + 320;
    // Opening evaluations
    uint16 constant pEval_QL = 4 + 384;
    uint16 constant pEval_QR = 4 + 416;
    uint16 constant pEval_QO = 4 + 448;
    uint16 constant pEval_QM = 4 + 480;
    uint16 constant pEval_QC = 4 + 512;
    uint16 constant pEval_Sigma1 = 4 + 544;
    uint16 constant pEval_Sigma2 = 4 + 576;
    uint16 constant pEval_Sigma3 = 4 + 608;
    uint16 constant pEval_A = 4 + 640;
    uint16 constant pEval_B = 4 + 672;
    uint16 constant pEval_C = 4 + 704;
    uint16 constant pEval_T2w = 4 + 736;
    uint16 constant pEval_Z = 4 + 768;
    uint16 constant pEval_Zw = 4 + 800;
    uint16 constant pEval_T1w = 4 + 832;
    uint16 constant pEval_inv = 4 + 864;
    uint16 constant pEval_invPublics = 4 + 896;

    // Memory data
    // Challenges
    uint16 constant pBeta    = 0;  // beta challenge
    uint16 constant pGamma   = 32;  // gamma challenge
    uint16 constant pY       = 64;
    uint16 constant pAlpha   = 96;
    uint16 constant pXi      = 128; // xi challenge
    uint16 constant pXiSeed  = 160; // xi seed, from this value we compute xi = xiSeed^24

    uint16 constant pXiSeed_w4 = 192;
    uint16 constant pXiSeed_w1 = 224;
    uint16 constant pXiSeed_w3 = 256;
    uint16 constant pXiSeed_w2 = 288;
    
    uint16 constant pPi     = 320; // PI(xi)

    uint16 constant pZh     =  352; // Z_H(xi)

    // From this point we write the Zh and lagrange related to public inputs that must be computed using the Montgomery batch inversion
    uint16 constant pZhInv  = 384; // 1/Z_H(xi)

    uint16 constant pEval_L1 = 416;


    // Roots
    uint16 constant pw1_0 = 448;
    uint16 constant pw1_1d1_0 = 480;
    uint16 constant pw2_0 = 512;
    uint16 constant pw2_1 = 544;
    uint16 constant pw2_1d2_0 = 576;
    uint16 constant pw2_1d2_1 = 608;
    uint16 constant pw3_0 = 640;
    uint16 constant pw3_1 = 672;
    uint16 constant pw3_2 = 704;
    uint16 constant pw4_0 = 736;
    uint16 constant pw4_1 = 768;
    uint16 constant pw4_2 = 800;
    uint16 constant pw4_3 = 832;

    // Lagrange Items
    uint16 constant pLagrange4_0_0 = 864;
    uint16 constant pLagrange4_0_1 = 896;
    uint16 constant pLagrange4_0_2 = 928;
    uint16 constant pLagrange4_0_3 = 960;
    uint16 constant pLagrange1_0_0 = 992;
    uint16 constant pLagrange3_0_0 = 1024;
    uint16 constant pLagrange3_0_1 = 1056;
    uint16 constant pLagrange3_0_2 = 1088;
    uint16 constant pLagrange1_01_0 = 1120;
    uint16 constant pLagrange1_01_1 = 1152;
    uint16 constant pLagrange2_01_0 = 1184;
    uint16 constant pLagrange2_01_1 = 1216;
    uint16 constant pLagrange2_01_2 = 1248;
    uint16 constant pLagrange2_01_3 = 1280;


    // Ri
    uint16 constant pR0 = 1312; // r0(y)
    uint16 constant pR1 = 1344; // r1(y)
    uint16 constant pR2 = 1376; // r2(y)
    uint16 constant pR3 = 1408; // r3(y)
    uint16 constant pR4 = 1440; // r4(y)
    uint16 constant pR5 = 1472; // r5(y)
   
    uint16 constant pF = 1504; // [F]_1, 64 bytes
    uint16 constant pE = 1568; // [E]_1, 64 bytes
    uint16 constant pJ = 1632; // [J]_1, 64 bytes

    uint16 constant pQuotient1 = 1696;
    uint16 constant pQuotient2 = 1728;
    uint16 constant pQuotient3 = 1760;
    uint16 constant pQuotient4 = 1792;
    uint16 constant pQuotient5 = 1824;

   // From this point we write all the variables that must compute the inverse using the Montgomery batch inversion
    uint16 constant pDenw4_0 = 1856;
    uint16 constant pDenw1_0 = 1888;
    uint16 constant pDenw3_0 = 1920;
    uint16 constant pDenw1_01 = 1952;
    uint16 constant pDenw2_01 = 1984;

    uint16 constant pLiw4_0Inv_0 = 2016;
    uint16 constant pLiw4_0Inv_1 = 2048;
    uint16 constant pLiw4_0Inv_2 = 2080;
    uint16 constant pLiw4_0Inv_3 = 2112;
    uint16 constant pLiw1_0Inv_0 = 2144;
    uint16 constant pLiw3_0Inv_0 = 2176;
    uint16 constant pLiw3_0Inv_1 = 2208;
    uint16 constant pLiw3_0Inv_2 = 2240;
    uint16 constant pLiw1_01Inv_0 = 2272;
    uint16 constant pLiw1_1d1_01Inv_0 = 2304;
    uint16 constant pLiw2_01Inv_0 = 2336;
    uint16 constant pLiw2_01Inv_1 = 2368;
    uint16 constant pLiw2_1d2_01Inv_0 = 2400;
    uint16 constant pLiw2_1d2_01Inv_1 = 2432;

    // Commits memory data
    uint16 constant pEval_T0 = 0;
    uint16 constant pEval_T1 = 32;
    uint16 constant pEval_T2 = 64;

    uint16 constant lastMem = 2464;
     
        function verifyCommitments(bytes32[28] calldata commits , bytes32 challengeXiSeed, bytes32[3] memory nonCommittedPols) internal view returns (bool) {
        assembly {
            // Computes the inverse of an array of values
            // See https://vitalik.ca/general/2018/07/21/starks_part_3.html in section where explain fields operations
            // To save the inverse to be computed on chain the prover sends the inverse as an evaluation in commits.eval_inv
            function inverseArray(pMem) {

                let pAux := mload(0x40)     // Point to the next free position
                let acc := mload(add(pMem,pDenw4_0))       // Read the first element
                mstore(pAux, acc)

                pAux := add(pAux, 32)
                acc := mulmod(acc, mload(add(pMem, pDenw1_0)), q)
                mstore(pAux, acc)

                pAux := add(pAux, 32)
                acc := mulmod(acc, mload(add(pMem, pDenw3_0)), q)
                mstore(pAux, acc)

                pAux := add(pAux, 32)
                acc := mulmod(acc, mload(add(pMem, pDenw1_01)), q)
                mstore(pAux, acc)

                pAux := add(pAux, 32)
                acc := mulmod(acc, mload(add(pMem, pDenw2_01)), q)
                mstore(pAux, acc)

                pAux := add(pAux, 32)
                acc := mulmod(acc, mload(add(pMem, pLiw4_0Inv_0)), q)
                mstore(pAux, acc)

                pAux := add(pAux, 32)
                acc := mulmod(acc, mload(add(pMem, pLiw4_0Inv_1)), q)
                mstore(pAux, acc)

                pAux := add(pAux, 32)
                acc := mulmod(acc, mload(add(pMem, pLiw4_0Inv_2)), q)
                mstore(pAux, acc)

                pAux := add(pAux, 32)
                acc := mulmod(acc, mload(add(pMem, pLiw4_0Inv_3)), q)
                mstore(pAux, acc)

                pAux := add(pAux, 32)
                acc := mulmod(acc, mload(add(pMem, pLiw1_0Inv_0)), q)
                mstore(pAux, acc)

                pAux := add(pAux, 32)
                acc := mulmod(acc, mload(add(pMem, pLiw3_0Inv_0)), q)
                mstore(pAux, acc)

                pAux := add(pAux, 32)
                acc := mulmod(acc, mload(add(pMem, pLiw3_0Inv_1)), q)
                mstore(pAux, acc)

                pAux := add(pAux, 32)
                acc := mulmod(acc, mload(add(pMem, pLiw3_0Inv_2)), q)
                mstore(pAux, acc)

                pAux := add(pAux, 32)
                acc := mulmod(acc, mload(add(pMem, pLiw1_01Inv_0)), q)
                mstore(pAux, acc)

                pAux := add(pAux, 32)
                acc := mulmod(acc, mload(add(pMem, pLiw1_1d1_01Inv_0)), q)
                mstore(pAux, acc)

                pAux := add(pAux, 32)
                acc := mulmod(acc, mload(add(pMem, pLiw2_01Inv_0)), q)
                mstore(pAux, acc)

                pAux := add(pAux, 32)
                acc := mulmod(acc, mload(add(pMem, pLiw2_01Inv_1)), q)
                mstore(pAux, acc)

                pAux := add(pAux, 32)
                acc := mulmod(acc, mload(add(pMem, pLiw2_1d2_01Inv_0)), q)
                mstore(pAux, acc)

                pAux := add(pAux, 32)
                acc := mulmod(acc, mload(add(pMem, pLiw2_1d2_01Inv_1)), q)
                mstore(pAux, acc)

                let inv := calldataload(pEval_inv)

                // Before using the inverse sent by the prover the verifier checks inv(batch) * batch === 1
                if iszero(eq(1, mulmod(acc, inv, q))) {
                    mstore(0, 0)
                    return(0,0x20)
                }

                acc := inv

                pAux := sub(pAux, 32)
                inv := mulmod(acc, mload(pAux), q)
                acc := mulmod(acc, mload(add(pMem, pLiw2_1d2_01Inv_1)), q)
                mstore(add(pMem, pLiw2_1d2_01Inv_1), inv)
                pAux := sub(pAux, 32)
                inv := mulmod(acc, mload(pAux), q)
                acc := mulmod(acc, mload(add(pMem, pLiw2_1d2_01Inv_0)), q)
                mstore(add(pMem, pLiw2_1d2_01Inv_0), inv)
                pAux := sub(pAux, 32)
                inv := mulmod(acc, mload(pAux), q)
                acc := mulmod(acc, mload(add(pMem, pLiw2_01Inv_1)), q)
                mstore(add(pMem, pLiw2_01Inv_1), inv)
                pAux := sub(pAux, 32)
                inv := mulmod(acc, mload(pAux), q)
                acc := mulmod(acc, mload(add(pMem, pLiw2_01Inv_0)), q)
                mstore(add(pMem, pLiw2_01Inv_0), inv)
                pAux := sub(pAux, 32)
                inv := mulmod(acc, mload(pAux), q)
                acc := mulmod(acc, mload(add(pMem, pLiw1_1d1_01Inv_0)), q)
                mstore(add(pMem, pLiw1_1d1_01Inv_0), inv)
                pAux := sub(pAux, 32)
                inv := mulmod(acc, mload(pAux), q)
                acc := mulmod(acc, mload(add(pMem, pLiw1_01Inv_0)), q)
                mstore(add(pMem, pLiw1_01Inv_0), inv)
                pAux := sub(pAux, 32)
                inv := mulmod(acc, mload(pAux), q)
                acc := mulmod(acc, mload(add(pMem, pLiw3_0Inv_2)), q)
                mstore(add(pMem, pLiw3_0Inv_2), inv)
                pAux := sub(pAux, 32)
                inv := mulmod(acc, mload(pAux), q)
                acc := mulmod(acc, mload(add(pMem, pLiw3_0Inv_1)), q)
                mstore(add(pMem, pLiw3_0Inv_1), inv)
                pAux := sub(pAux, 32)
                inv := mulmod(acc, mload(pAux), q)
                acc := mulmod(acc, mload(add(pMem, pLiw3_0Inv_0)), q)
                mstore(add(pMem, pLiw3_0Inv_0), inv)
                pAux := sub(pAux, 32)
                inv := mulmod(acc, mload(pAux), q)
                acc := mulmod(acc, mload(add(pMem, pLiw1_0Inv_0)), q)
                mstore(add(pMem, pLiw1_0Inv_0), inv)
                pAux := sub(pAux, 32)
                inv := mulmod(acc, mload(pAux), q)
                acc := mulmod(acc, mload(add(pMem, pLiw4_0Inv_3)), q)
                mstore(add(pMem, pLiw4_0Inv_3), inv)
                pAux := sub(pAux, 32)
                inv := mulmod(acc, mload(pAux), q)
                acc := mulmod(acc, mload(add(pMem, pLiw4_0Inv_2)), q)
                mstore(add(pMem, pLiw4_0Inv_2), inv)
                pAux := sub(pAux, 32)
                inv := mulmod(acc, mload(pAux), q)
                acc := mulmod(acc, mload(add(pMem, pLiw4_0Inv_1)), q)
                mstore(add(pMem, pLiw4_0Inv_1), inv)
                pAux := sub(pAux, 32)
                inv := mulmod(acc, mload(pAux), q)
                acc := mulmod(acc, mload(add(pMem, pLiw4_0Inv_0)), q)
                mstore(add(pMem, pLiw4_0Inv_0), inv)
                pAux := sub(pAux, 32)
                inv := mulmod(acc, mload(pAux), q)
                acc := mulmod(acc, mload(add(pMem, pDenw2_01)), q)
                mstore(add(pMem, pDenw2_01), inv)
                pAux := sub(pAux, 32)
                inv := mulmod(acc, mload(pAux), q)
                acc := mulmod(acc, mload(add(pMem, pDenw1_01)), q)
                mstore(add(pMem, pDenw1_01), inv)
                pAux := sub(pAux, 32)
                inv := mulmod(acc, mload(pAux), q)
                acc := mulmod(acc, mload(add(pMem, pDenw3_0)), q)
                mstore(add(pMem, pDenw3_0), inv)
                pAux := sub(pAux, 32)
                inv := mulmod(acc, mload(pAux), q)
                acc := mulmod(acc, mload(add(pMem, pDenw1_0)), q)
                mstore(add(pMem, pDenw1_0), inv)
                mstore(add(pMem, pDenw4_0), acc)
            }
            
            function checkField(v) {
                if iszero(lt(v, q)) {
                    mstore(0, 0)
                    return(0,0x20)
                }
            }

            function checkPointBelongsToBN128Curve(p) {
                let x := calldataload(p)
                let y := calldataload(add(p, 32))

                // Check that the point is on the curve
                // y^2 = x^3 + 3
                let x3_3 := addmod(mulmod(x, mulmod(x, x, qf), qf), 3, qf)
                let y2 := mulmod(y, y, qf)

                if iszero(eq(x3_3, y2)) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }  
            
            
            // Validate all the evaluations sent by the prover ∈ F
            function checkInput() {        
                // Check commitments fullfill bn128 curve equation Y^2 = X^3 + 3
                checkPointBelongsToBN128Curve(pW)
                checkPointBelongsToBN128Curve(pWp)
                checkPointBelongsToBN128Curve(pf2)
                checkPointBelongsToBN128Curve(pf3)
                checkPointBelongsToBN128Curve(pf4)
                checkPointBelongsToBN128Curve(pf5)

                checkField(calldataload(pEval_QL))
                checkField(calldataload(pEval_QR))
                checkField(calldataload(pEval_QO))
                checkField(calldataload(pEval_QM))
                checkField(calldataload(pEval_QC))
                checkField(calldataload(pEval_Sigma1))
                checkField(calldataload(pEval_Sigma2))
                checkField(calldataload(pEval_Sigma3))
                checkField(calldataload(pEval_A))
                checkField(calldataload(pEval_B))
                checkField(calldataload(pEval_C))
                checkField(calldataload(pEval_T2w))
                checkField(calldataload(pEval_Z))
                checkField(calldataload(pEval_Zw))
                checkField(calldataload(pEval_T1w))
                checkField(calldataload(pEval_inv))
            }

            function computePowersXi(pMem, xiSeed) {
                let initValue := 1
                initValue := mulmod(initValue, xiSeed, q)
                initValue := mulmod(initValue, xiSeed, q)
                initValue := mulmod(initValue, xiSeed, q)
                mstore(add(pMem, pXiSeed_w4), initValue)
                initValue := mulmod(initValue, xiSeed, q)
                mstore(add(pMem, pXiSeed_w3), initValue)
                initValue := mulmod(initValue, xiSeed, q)
                initValue := mulmod(initValue, xiSeed, q)
                mstore(add(pMem, pXiSeed_w2), initValue)
                initValue := mulmod(initValue, xiSeed, q)
                initValue := mulmod(initValue, xiSeed, q)
                initValue := mulmod(initValue, xiSeed, q)
                initValue := mulmod(initValue, xiSeed, q)
                initValue := mulmod(initValue, xiSeed, q)
                initValue := mulmod(initValue, xiSeed, q)
                mstore(add(pMem, pXiSeed_w1), initValue)
            }

            function computeRoots(pMem) {
                let initValue
                initValue := mload(add(pMem, pXiSeed_w4))
                mstore( add(pMem, pw4_0),  initValue)
                mstore( add(pMem, pw4_1), mulmod(initValue, w4_1, q))
                mstore( add(pMem, pw4_2), mulmod(initValue, w4_2, q))
                mstore( add(pMem, pw4_3), mulmod(initValue, w4_3, q))
                initValue := mload(add(pMem, pXiSeed_w1))
                mstore( add(pMem, pw1_0),  initValue)
                initValue := mload(add(pMem, pXiSeed_w3))
                mstore( add(pMem, pw3_0),  initValue)
                mstore( add(pMem, pw3_1), mulmod(initValue, w3_1, q))
                mstore( add(pMem, pw3_2), mulmod(initValue, w3_2, q))
                initValue := mulmod(w1_1d1, mload(add(pMem, pXiSeed_w1)),q)
                mstore( add(pMem, pw1_1d1_0),  initValue)
                initValue := mload(add(pMem, pXiSeed_w2))
                mstore( add(pMem, pw2_0),  initValue)
                mstore( add(pMem, pw2_1), mulmod(initValue, w2_1, q))
                initValue := mulmod(w2_1d2, mload(add(pMem, pXiSeed_w2)),q)
                mstore( add(pMem, pw2_1d2_0),  initValue)
                mstore( add(pMem, pw2_1d2_1), mulmod(initValue, w2_1, q))
            }
       
            function computeChallenges(pMem, xiSeed) {
                let mIn := mload(0x40)

                // Compute challenge.alpha
                mstore(mIn, xiSeed)
                calldatacopy(add(mIn, 32), pEval_QL, 480)

                let alpha := mod(keccak256(mIn, 512), q)
                mstore( add(pMem, pAlpha), alpha)

                mstore(mIn, alpha)
                mstore(add(mIn, 32), calldataload(pW))
                mstore(add(mIn, 64), calldataload(add(pW, 32)))

                // Compute challenge.y
                mstore( add(pMem, pY), mod(keccak256(mIn, 96), q))
            }

            // This function computes allows as to compute (X-X1)·(X-X2)·...·(X-Xn) used in Lagrange interpolation
            function calcLagrangeItem(pMem, idx, n, X, pXi) -> result {
                let max := add(n, 1)
                result := 1
                for { } gt(n, 0) { n := sub(n, 1) }
                {
                    idx := mod(add(idx, 1), max)

                    result := mulmod(result, addmod(X, mod(sub(q, mload(add(pMem, add(pXi, mul(idx, 32))))), q), q), q)
                }
            }

            // Prepare all the denominators that must be inverted, placed them in consecutive memory addresses
            function computeInverseValues(pMem) {
                let y := mload(add(pMem, pY))
                let w
                w := 1
                w := mulmod(w, addmod(y, mod(sub(q, mload(add(pMem, pw4_0))), q), q),q)
                w := mulmod(w, addmod(y, mod(sub(q, mload(add(pMem, pw4_1))), q), q),q)
                w := mulmod(w, addmod(y, mod(sub(q, mload(add(pMem, pw4_2))), q), q),q)
                w := mulmod(w, addmod(y, mod(sub(q, mload(add(pMem, pw4_3))), q), q),q)
                mstore(add(pMem, pDenw4_0), w)
                w := 1
                w := mulmod(w, addmod(y, mod(sub(q, mload(add(pMem, pw1_0))), q), q),q)
                mstore(add(pMem, pDenw1_0), w)
                w := 1
                w := mulmod(w, addmod(y, mod(sub(q, mload(add(pMem, pw3_0))), q), q),q)
                w := mulmod(w, addmod(y, mod(sub(q, mload(add(pMem, pw3_1))), q), q),q)
                w := mulmod(w, addmod(y, mod(sub(q, mload(add(pMem, pw3_2))), q), q),q)
                mstore(add(pMem, pDenw3_0), w)
                w := 1
                w := mulmod(w, addmod(y, mod(sub(q, mload(add(pMem, pw1_0))), q), q),q)
                w := mulmod(w, addmod(y, mod(sub(q, mload(add(pMem, pw1_1d1_0))), q), q),q)
                mstore(add(pMem, pDenw1_01), w)
                w := 1
                w := mulmod(w, addmod(y, mod(sub(q, mload(add(pMem, pw2_0))), q), q),q)
                w := mulmod(w, addmod(y, mod(sub(q, mload(add(pMem, pw2_1))), q), q),q)
                w := mulmod(w, addmod(y, mod(sub(q, mload(add(pMem, pw2_1d2_0))), q), q),q)
                w := mulmod(w, addmod(y, mod(sub(q, mload(add(pMem, pw2_1d2_1))), q), q),q)
                mstore(add(pMem, pDenw2_01), w)

                let value
                value := calcLagrangeItem(pMem, 0, 3, mload(add(pMem,pw4_0)), pw4_0)
                mstore(add(pMem, pLiw4_0Inv_0), value)
                value := calcLagrangeItem(pMem, 1, 3, mload(add(pMem,pw4_1)), pw4_0)
                mstore(add(pMem, pLiw4_0Inv_1), value)
                value := calcLagrangeItem(pMem, 2, 3, mload(add(pMem,pw4_2)), pw4_0)
                mstore(add(pMem, pLiw4_0Inv_2), value)
                value := calcLagrangeItem(pMem, 3, 3, mload(add(pMem,pw4_3)), pw4_0)
                mstore(add(pMem, pLiw4_0Inv_3), value)
                value := calcLagrangeItem(pMem, 0, 0, mload(add(pMem,pw1_0)), pw1_0)
                mstore(add(pMem, pLiw1_0Inv_0), value)
                value := calcLagrangeItem(pMem, 0, 2, mload(add(pMem,pw3_0)), pw3_0)
                mstore(add(pMem, pLiw3_0Inv_0), value)
                value := calcLagrangeItem(pMem, 1, 2, mload(add(pMem,pw3_1)), pw3_0)
                mstore(add(pMem, pLiw3_0Inv_1), value)
                value := calcLagrangeItem(pMem, 2, 2, mload(add(pMem,pw3_2)), pw3_0)
                mstore(add(pMem, pLiw3_0Inv_2), value)
                value := calcLagrangeItem(pMem, 0, 1, mload(add(pMem,pw1_0)), pw1_0)
                mstore(add(pMem, pLiw1_01Inv_0), value)
                value := calcLagrangeItem(pMem, 1, 1, mload(add(pMem,pw1_1d1_0)), pw1_0)
                mstore(add(pMem, pLiw1_1d1_01Inv_0), value)
                value := calcLagrangeItem(pMem, 0, 3, mload(add(pMem,pw2_0)), pw2_0)
                mstore(add(pMem, pLiw2_01Inv_0), value)
                value := calcLagrangeItem(pMem, 1, 3, mload(add(pMem,pw2_1)), pw2_0)
                mstore(add(pMem, pLiw2_01Inv_1), value)
                value := calcLagrangeItem(pMem, 2, 3, mload(add(pMem,pw2_1d2_0)), pw2_0)
                mstore(add(pMem, pLiw2_1d2_01Inv_0), value)
                value := calcLagrangeItem(pMem, 3, 3, mload(add(pMem,pw2_1d2_1)), pw2_0)
                mstore(add(pMem, pLiw2_1d2_01Inv_1), value)
            }

            function computeLagrangeItems(pMem) {
                let lagrange
                lagrange := calcLagrangeItem(pMem,0, 3, mload(add(pMem,pY)), pw4_0)
                mstore(add(pMem, pLagrange4_0_0), lagrange)
                lagrange := calcLagrangeItem(pMem,1, 3, mload(add(pMem,pY)), pw4_0)
                mstore(add(pMem, pLagrange4_0_1), lagrange)
                lagrange := calcLagrangeItem(pMem,2, 3, mload(add(pMem,pY)), pw4_0)
                mstore(add(pMem, pLagrange4_0_2), lagrange)
                lagrange := calcLagrangeItem(pMem,3, 3, mload(add(pMem,pY)), pw4_0)
                mstore(add(pMem, pLagrange4_0_3), lagrange)
                lagrange := calcLagrangeItem(pMem,0, 0, mload(add(pMem,pY)), pw1_0)
                mstore(add(pMem, pLagrange1_0_0), lagrange)
                lagrange := calcLagrangeItem(pMem,0, 2, mload(add(pMem,pY)), pw3_0)
                mstore(add(pMem, pLagrange3_0_0), lagrange)
                lagrange := calcLagrangeItem(pMem,1, 2, mload(add(pMem,pY)), pw3_0)
                mstore(add(pMem, pLagrange3_0_1), lagrange)
                lagrange := calcLagrangeItem(pMem,2, 2, mload(add(pMem,pY)), pw3_0)
                mstore(add(pMem, pLagrange3_0_2), lagrange)
                lagrange := calcLagrangeItem(pMem,0, 1, mload(add(pMem,pY)), pw1_0)
                mstore(add(pMem, pLagrange1_01_0), lagrange)
                lagrange := calcLagrangeItem(pMem,1, 1, mload(add(pMem,pY)), pw1_0)
                mstore(add(pMem, pLagrange1_01_1), lagrange)
                lagrange := calcLagrangeItem(pMem,0, 3, mload(add(pMem,pY)), pw2_0)
                mstore(add(pMem, pLagrange2_01_0), lagrange)
                lagrange := calcLagrangeItem(pMem,1, 3, mload(add(pMem,pY)), pw2_0)
                mstore(add(pMem, pLagrange2_01_1), lagrange)
                lagrange := calcLagrangeItem(pMem,2, 3, mload(add(pMem,pY)), pw2_0)
                mstore(add(pMem, pLagrange2_01_2), lagrange)
                lagrange := calcLagrangeItem(pMem,3, 3, mload(add(pMem,pY)), pw2_0)
                mstore(add(pMem, pLagrange2_01_3), lagrange)
            }

            function computeR0( pMem ) {
                let res
 
                    let root
                    let acc
                    let accRoot
                    let lagrange

 
                    root := mload(add(pMem, pw4_0))   
                    acc := calldataload(pEval_QL)
                    accRoot := root
 
  
                    acc := addmod(acc, mulmod(calldataload(pEval_QR), accRoot, q), q)
                    accRoot := mulmod(accRoot, root, q)
 
  
                    acc := addmod(acc, mulmod(calldataload(pEval_QO), accRoot, q), q)
                    accRoot := mulmod(accRoot, root, q)
 
  
                    acc := addmod(acc, mulmod(calldataload(pEval_QM), accRoot, q), q)
                    accRoot := mulmod(accRoot, root, q)
                    lagrange := mload(add(pMem, pLagrange4_0_0))
                    lagrange := mulmod(lagrange, mload(add(pMem, pLiw4_0Inv_0)), q)
    

                    res := addmod(res, mulmod(acc, lagrange, q), q)
            

 
                    root := mload(add(pMem, pw4_1))   
                    acc := calldataload(pEval_QL)
                    accRoot := root
 
  
                    acc := addmod(acc, mulmod(calldataload(pEval_QR), accRoot, q), q)
                    accRoot := mulmod(accRoot, root, q)
 
  
                    acc := addmod(acc, mulmod(calldataload(pEval_QO), accRoot, q), q)
                    accRoot := mulmod(accRoot, root, q)
 
  
                    acc := addmod(acc, mulmod(calldataload(pEval_QM), accRoot, q), q)
                    accRoot := mulmod(accRoot, root, q)
                    lagrange := mload(add(pMem, pLagrange4_0_1))
                    lagrange := mulmod(lagrange, mload(add(pMem, pLiw4_0Inv_1)), q)
    

                    res := addmod(res, mulmod(acc, lagrange, q), q)
            

 
                    root := mload(add(pMem, pw4_2))   
                    acc := calldataload(pEval_QL)
                    accRoot := root
 
  
                    acc := addmod(acc, mulmod(calldataload(pEval_QR), accRoot, q), q)
                    accRoot := mulmod(accRoot, root, q)
 
  
                    acc := addmod(acc, mulmod(calldataload(pEval_QO), accRoot, q), q)
                    accRoot := mulmod(accRoot, root, q)
 
  
                    acc := addmod(acc, mulmod(calldataload(pEval_QM), accRoot, q), q)
                    accRoot := mulmod(accRoot, root, q)
                    lagrange := mload(add(pMem, pLagrange4_0_2))
                    lagrange := mulmod(lagrange, mload(add(pMem, pLiw4_0Inv_2)), q)
    

                    res := addmod(res, mulmod(acc, lagrange, q), q)
            

 
                    root := mload(add(pMem, pw4_3))   
                    acc := calldataload(pEval_QL)
                    accRoot := root
 
  
                    acc := addmod(acc, mulmod(calldataload(pEval_QR), accRoot, q), q)
                    accRoot := mulmod(accRoot, root, q)
 
  
                    acc := addmod(acc, mulmod(calldataload(pEval_QO), accRoot, q), q)
                    accRoot := mulmod(accRoot, root, q)
 
  
                    acc := addmod(acc, mulmod(calldataload(pEval_QM), accRoot, q), q)
                    accRoot := mulmod(accRoot, root, q)
                    lagrange := mload(add(pMem, pLagrange4_0_3))
                    lagrange := mulmod(lagrange, mload(add(pMem, pLiw4_0Inv_3)), q)
    

                    res := addmod(res, mulmod(acc, lagrange, q), q)
            
                    mstore(add(pMem,pR0), res)
            }

            function computeR1( pMem ) {
                let res
 
                    let root
                    let acc
                    let accRoot
                    let lagrange

 
                    root := mload(add(pMem, pw4_0))   
                    acc := calldataload(pEval_QC)
                    accRoot := root
 
  
                    acc := addmod(acc, mulmod(calldataload(pEval_Sigma1), accRoot, q), q)
                    accRoot := mulmod(accRoot, root, q)
 
  
                    acc := addmod(acc, mulmod(calldataload(pEval_Sigma2), accRoot, q), q)
                    accRoot := mulmod(accRoot, root, q)
 
  
                    acc := addmod(acc, mulmod(calldataload(pEval_Sigma3), accRoot, q), q)
                    accRoot := mulmod(accRoot, root, q)
                    lagrange := mload(add(pMem, pLagrange4_0_0))
                    lagrange := mulmod(lagrange, mload(add(pMem, pLiw4_0Inv_0)), q)
    

                    res := addmod(res, mulmod(acc, lagrange, q), q)
            

 
                    root := mload(add(pMem, pw4_1))   
                    acc := calldataload(pEval_QC)
                    accRoot := root
 
  
                    acc := addmod(acc, mulmod(calldataload(pEval_Sigma1), accRoot, q), q)
                    accRoot := mulmod(accRoot, root, q)
 
  
                    acc := addmod(acc, mulmod(calldataload(pEval_Sigma2), accRoot, q), q)
                    accRoot := mulmod(accRoot, root, q)
 
  
                    acc := addmod(acc, mulmod(calldataload(pEval_Sigma3), accRoot, q), q)
                    accRoot := mulmod(accRoot, root, q)
                    lagrange := mload(add(pMem, pLagrange4_0_1))
                    lagrange := mulmod(lagrange, mload(add(pMem, pLiw4_0Inv_1)), q)
    

                    res := addmod(res, mulmod(acc, lagrange, q), q)
            

 
                    root := mload(add(pMem, pw4_2))   
                    acc := calldataload(pEval_QC)
                    accRoot := root
 
  
                    acc := addmod(acc, mulmod(calldataload(pEval_Sigma1), accRoot, q), q)
                    accRoot := mulmod(accRoot, root, q)
 
  
                    acc := addmod(acc, mulmod(calldataload(pEval_Sigma2), accRoot, q), q)
                    accRoot := mulmod(accRoot, root, q)
 
  
                    acc := addmod(acc, mulmod(calldataload(pEval_Sigma3), accRoot, q), q)
                    accRoot := mulmod(accRoot, root, q)
                    lagrange := mload(add(pMem, pLagrange4_0_2))
                    lagrange := mulmod(lagrange, mload(add(pMem, pLiw4_0Inv_2)), q)
    

                    res := addmod(res, mulmod(acc, lagrange, q), q)
            

 
                    root := mload(add(pMem, pw4_3))   
                    acc := calldataload(pEval_QC)
                    accRoot := root
 
  
                    acc := addmod(acc, mulmod(calldataload(pEval_Sigma1), accRoot, q), q)
                    accRoot := mulmod(accRoot, root, q)
 
  
                    acc := addmod(acc, mulmod(calldataload(pEval_Sigma2), accRoot, q), q)
                    accRoot := mulmod(accRoot, root, q)
 
  
                    acc := addmod(acc, mulmod(calldataload(pEval_Sigma3), accRoot, q), q)
                    accRoot := mulmod(accRoot, root, q)
                    lagrange := mload(add(pMem, pLagrange4_0_3))
                    lagrange := mulmod(lagrange, mload(add(pMem, pLiw4_0Inv_3)), q)
    

                    res := addmod(res, mulmod(acc, lagrange, q), q)
            
                    mstore(add(pMem,pR1), res)
            }

            function computeR2( pMem ,pNonCommittedPols) {
                let res
 
                    let root
                    let acc
                    let accRoot
                    let lagrange

 
                    root := mload(add(pMem, pw1_0))   
                    acc := mload(add(pNonCommittedPols, pEval_T0))
                    accRoot := root
                    lagrange := mload(add(pMem, pLagrange1_0_0))
                    lagrange := mulmod(lagrange, mload(add(pMem, pLiw1_0Inv_0)), q)
    

                    res := addmod(res, mulmod(acc, lagrange, q), q)
            
                    mstore(add(pMem,pR2), res)
            }

            function computeR3( pMem ) {
                let res
 
                    let root
                    let acc
                    let accRoot
                    let lagrange

 
                    root := mload(add(pMem, pw3_0))   
                    acc := calldataload(pEval_A)
                    accRoot := root
 
  
                    acc := addmod(acc, mulmod(calldataload(pEval_B), accRoot, q), q)
                    accRoot := mulmod(accRoot, root, q)
 
  
                    acc := addmod(acc, mulmod(calldataload(pEval_C), accRoot, q), q)
                    accRoot := mulmod(accRoot, root, q)
                    lagrange := mload(add(pMem, pLagrange3_0_0))
                    lagrange := mulmod(lagrange, mload(add(pMem, pLiw3_0Inv_0)), q)
    

                    res := addmod(res, mulmod(acc, lagrange, q), q)
            

 
                    root := mload(add(pMem, pw3_1))   
                    acc := calldataload(pEval_A)
                    accRoot := root
 
  
                    acc := addmod(acc, mulmod(calldataload(pEval_B), accRoot, q), q)
                    accRoot := mulmod(accRoot, root, q)
 
  
                    acc := addmod(acc, mulmod(calldataload(pEval_C), accRoot, q), q)
                    accRoot := mulmod(accRoot, root, q)
                    lagrange := mload(add(pMem, pLagrange3_0_1))
                    lagrange := mulmod(lagrange, mload(add(pMem, pLiw3_0Inv_1)), q)
    

                    res := addmod(res, mulmod(acc, lagrange, q), q)
            

 
                    root := mload(add(pMem, pw3_2))   
                    acc := calldataload(pEval_A)
                    accRoot := root
 
  
                    acc := addmod(acc, mulmod(calldataload(pEval_B), accRoot, q), q)
                    accRoot := mulmod(accRoot, root, q)
 
  
                    acc := addmod(acc, mulmod(calldataload(pEval_C), accRoot, q), q)
                    accRoot := mulmod(accRoot, root, q)
                    lagrange := mload(add(pMem, pLagrange3_0_2))
                    lagrange := mulmod(lagrange, mload(add(pMem, pLiw3_0Inv_2)), q)
    

                    res := addmod(res, mulmod(acc, lagrange, q), q)
            
                    mstore(add(pMem,pR3), res)
            }

            function computeR4( pMem ,pNonCommittedPols) {
                let res 
                    let root
                    let acc
                    let accRoot
                    let lagrange

 
                    root := mload(add(pMem, pw1_0))   
                    acc := mload(add(pNonCommittedPols, pEval_T2))
                    accRoot := root

 
                    lagrange := mload(add(pMem, pLagrange1_01_0))
                    lagrange := mulmod(lagrange, mload(add(pMem, pLiw1_01Inv_0)), q)
                    res := addmod(res, mulmod(acc, lagrange, q), q)
 
                    root := mload(add(pMem, pw1_1d1_0))   
                    acc := calldataload(pEval_T2w)
                    accRoot := root

 
                    lagrange := mload(add(pMem, pLagrange1_01_1))
                    lagrange := mulmod(lagrange, mload(add(pMem, pLiw1_1d1_01Inv_0)), q)
                    res := addmod(res, mulmod(acc, lagrange, q), q)
                mstore(add(pMem,pR4), res)
            }
            function computeR5( pMem ,pNonCommittedPols) {
                let res 
                    let root
                    let acc
                    let accRoot
                    let lagrange

 
                    root := mload(add(pMem, pw2_0))   
                    acc := calldataload(pEval_Z)
                    accRoot := root
                    acc := addmod(acc, mulmod(mload(add(pNonCommittedPols, pEval_T1)), accRoot, q), q)
                    accRoot := mulmod(accRoot, root, q)

 
                    lagrange := mload(add(pMem, pLagrange2_01_0))
                    lagrange := mulmod(lagrange, mload(add(pMem, pLiw2_01Inv_0)), q)
                    res := addmod(res, mulmod(acc, lagrange, q), q)
 
                    root := mload(add(pMem, pw2_1d2_0))   
                    acc := calldataload(pEval_Zw)
                    accRoot := root
                    acc := addmod(acc, mulmod(calldataload(pEval_T1w), accRoot, q), q)
                    accRoot := mulmod(accRoot, root, q)

 
                    lagrange := mload(add(pMem, pLagrange2_01_2))
                    lagrange := mulmod(lagrange, mload(add(pMem, pLiw2_1d2_01Inv_0)), q)
                    res := addmod(res, mulmod(acc, lagrange, q), q)

 
                    root := mload(add(pMem, pw2_1))   
                    acc := calldataload(pEval_Z)
                    accRoot := root
                    acc := addmod(acc, mulmod(mload(add(pNonCommittedPols, pEval_T1)), accRoot, q), q)
                    accRoot := mulmod(accRoot, root, q)

 
                    lagrange := mload(add(pMem, pLagrange2_01_1))
                    lagrange := mulmod(lagrange, mload(add(pMem, pLiw2_01Inv_1)), q)
                    res := addmod(res, mulmod(acc, lagrange, q), q)
 
                    root := mload(add(pMem, pw2_1d2_1))   
                    acc := calldataload(pEval_Zw)
                    accRoot := root
                    acc := addmod(acc, mulmod(calldataload(pEval_T1w), accRoot, q), q)
                    accRoot := mulmod(accRoot, root, q)

 
                    lagrange := mload(add(pMem, pLagrange2_01_3))
                    lagrange := mulmod(lagrange, mload(add(pMem, pLiw2_1d2_01Inv_1)), q)
                    res := addmod(res, mulmod(acc, lagrange, q), q)
                mstore(add(pMem,pR5), res)
            }
            
            // G1 function to accumulate a G1 value to an address
            function g1_acc(pR, pP) {
                let mIn := mload(0x40)
                mstore(mIn, mload(pR))
                mstore(add(mIn,32), mload(add(pR, 32)))
                mstore(add(mIn,64), mload(pP))
                mstore(add(mIn,96), mload(add(pP, 32)))

                let success := staticcall(gas(), 6, mIn, 128, pR, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0,0x20)
                }
            }

            // G1 function to multiply a G1 value to value in an address
            function g1_mulAcc(pR, px, py, s) {
                let success
                let mIn := mload(0x40)
                mstore(mIn, px)
                mstore(add(mIn,32), py)
                mstore(add(mIn,64), s)

                success := staticcall(gas(), 7, mIn, 96, mIn, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0,0x20)
                }

                mstore(add(mIn,64), mload(pR))
                mstore(add(mIn,96), mload(add(pR, 32)))

                success := staticcall(gas(), 6, mIn, 128, pR, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0,0x20)
                }
            }

            function computeFEJ(pMem) {
                // Prepare shared numerator between F, E and J to reuse it
                let y := mload(add(pMem, pY))
                let numerator := 1
                numerator := mulmod(numerator, addmod(y, mod(sub(q, mload(add(pMem, pw4_0))), q), q), q)
                numerator := mulmod(numerator, addmod(y, mod(sub(q, mload(add(pMem, pw4_1))), q), q), q)
                numerator := mulmod(numerator, addmod(y, mod(sub(q, mload(add(pMem, pw4_2))), q), q), q)
                numerator := mulmod(numerator, addmod(y, mod(sub(q, mload(add(pMem, pw4_3))), q), q), q)
                
                // Prepare shared quotient between F and E to reuse it
                let alpha := mload(add(pMem, pAlpha))
                let accAlpha := 1
                accAlpha := mulmod(accAlpha, alpha, q)
                mstore(add(pMem, pQuotient1), mulmod(accAlpha, mulmod(numerator, mload(add(pMem, pDenw4_0)), q), q))
                accAlpha := mulmod(accAlpha, alpha, q)
                mstore(add(pMem, pQuotient2), mulmod(accAlpha, mulmod(numerator, mload(add(pMem, pDenw1_0)), q), q))
                accAlpha := mulmod(accAlpha, alpha, q)
                mstore(add(pMem, pQuotient3), mulmod(accAlpha, mulmod(numerator, mload(add(pMem, pDenw3_0)), q), q))
                accAlpha := mulmod(accAlpha, alpha, q)
                mstore(add(pMem, pQuotient4), mulmod(accAlpha, mulmod(numerator, mload(add(pMem, pDenw1_01)), q), q))
                accAlpha := mulmod(accAlpha, alpha, q)
                mstore(add(pMem, pQuotient5), mulmod(accAlpha, mulmod(numerator, mload(add(pMem, pDenw2_01)), q), q))

                
                // Compute full batched polynomial commitment [F]_1
                mstore(add(pMem, pF), f0x)
                mstore(add(pMem, add(pF, 32)), f0y)
                g1_mulAcc(add(pMem, pF), f1x, f1y, mload(add(pMem,pQuotient1)))
                g1_mulAcc(add(pMem, pF), calldataload(pf2), calldataload(add(pf2, 32)), mload(add(pMem,pQuotient2)))
                g1_mulAcc(add(pMem, pF), calldataload(pf3), calldataload(add(pf3, 32)), mload(add(pMem,pQuotient3)))
                g1_mulAcc(add(pMem, pF), calldataload(pf4), calldataload(add(pf4, 32)), mload(add(pMem,pQuotient4)))
                g1_mulAcc(add(pMem, pF), calldataload(pf5), calldataload(add(pf5, 32)), mload(add(pMem,pQuotient5)))

                // Compute group-encoded batch evaluation [E]_1

                let accR := mload(add(pMem, pR0))
                accR := addmod(accR, mulmod(mload(add(pMem,pQuotient1)), mload(add(pMem, pR1)),q) ,q)
                accR := addmod(accR, mulmod(mload(add(pMem,pQuotient2)), mload(add(pMem, pR2)),q) ,q)
                accR := addmod(accR, mulmod(mload(add(pMem,pQuotient3)), mload(add(pMem, pR3)),q) ,q)
                accR := addmod(accR, mulmod(mload(add(pMem,pQuotient4)), mload(add(pMem, pR4)),q) ,q)
                accR := addmod(accR, mulmod(mload(add(pMem,pQuotient5)), mload(add(pMem, pR5)),q) ,q)
                g1_mulAcc(add(pMem, pE), G1x, G1y, accR)

                // Compute the full difference [J]_1
                g1_mulAcc(add(pMem, pJ), calldataload(pW), calldataload(add(pW, 32)), numerator)
            }
 
            // Validate all evaluations with a pairing checking that e([F]_1 - [E]_1 - [J]_1 + y[Wp]_1, [1]_2) == e([Wp]_1, [x]_2)
            function checkPairing(pMem) -> isOk {
                let mIn := mload(0x40)

                // First pairing value
                // Compute -E
                mstore(add(add(pMem, pE), 32), mod(sub(qf, mload(add(add(pMem, pE), 32))), qf))
                // Compute -J
                mstore(add(add(pMem, pJ), 32), mod(sub(qf, mload(add(add(pMem, pJ), 32))), qf))
                // F = F - E - J + y·Wp
                g1_acc(add(pMem, pF), add(pMem, pE))
                g1_acc(add(pMem, pF), add(pMem, pJ))
                g1_mulAcc(add(pMem, pF), calldataload(pWp), calldataload(add(pWp, 32)), mload(add(pMem, pY)))

                mstore(mIn, mload(add(pMem, pF)))
                mstore(add(mIn, 32), mload(add(add(pMem, pF), 32)))

                // Second pairing value
                mstore(add(mIn, 64), G2x2)
                mstore(add(mIn, 96), G2x1)
                mstore(add(mIn, 128), G2y2)
                mstore(add(mIn, 160), G2y1)

                // Third pairing value
                // Compute -Wp
                mstore(add(mIn, 192), calldataload(pWp))
                let s := calldataload(add(pWp, 32))
                s := mod(sub(qf, s), qf)
                mstore(add(mIn, 224), s)

                // Fourth pairing value
                mstore(add(mIn, 256), X2x2)
                mstore(add(mIn, 288), X2x1)
                mstore(add(mIn, 320), X2y2)
                mstore(add(mIn, 352), X2y1)

                let success := staticcall(gas(), 8, mIn, 384, mIn, 0x20)

                isOk := and(success, mload(mIn))
            }

            let pMem := mload(0x40)
            mstore(0x40, add(pMem, lastMem))

            // Validate that all evaluations ∈ F
            checkInput()

            // Compute the challenges alpha and y ∈ F

       
            computeChallenges(pMem, challengeXiSeed)

            // Compute powers of xi seed
            computePowersXi(pMem, challengeXiSeed)

            
            // Compute roots
            computeRoots(pMem)

            // To divide prime fields the Extended Euclidean Algorithm for computing modular inverses is needed.
            // The Montgomery batch inversion algorithm allow us to compute n inverses reducing to a single one inversion.
            // More info: https://vitalik.ca/general/2018/07/21/starks_part_3.html
            // To avoid this single inverse computation on-chain, it has been computed in proving time and send it to the verifier.
            // Therefore, the verifier:
            //      1) Prepare all the denominators to inverse
            //      2) Check the inverse sent by the prover it is what it should be
            //      3) Compute the others inverses using the Montgomery Batched Algorithm using the inverse sent to avoid the inversion operation it does.
            computeInverseValues(pMem)

            // Execute Montgomery batched inversions of the previous prepared values
            inverseArray(pMem)

            // Compute Lagrange Items to avoid calculating it more than once
            computeLagrangeItems(pMem)

            computeR0(pMem)
            computeR1(pMem)
            computeR2(pMem, nonCommittedPols)
            computeR3(pMem)
            computeR4(pMem, nonCommittedPols)
            computeR5(pMem, nonCommittedPols)

            // Compute full batched polynomial commitment [F]_1, group-encoded batch evaluation [E]_1 and the full difference [J]_1
            computeFEJ(pMem)

            // Validate all evaluations
            let isValid := checkPairing(pMem)

            mstore(0x40, sub(pMem, lastMem))
            mstore(0, isValid)
            return(0,0x20)

        }
    }

    function verifyProof(bytes32[29] calldata proof, uint256[1] calldata pubSignals) public view returns (bool) {        
        bytes32 evalT0;
        bytes32 evalT1;
        bytes32 evalT2;
        bytes32 challengeXiSeed;
        bytes32[28] calldata commits;
        assembly {
            // Computes the inverse of an array of values
            // See https://vitalik.ca/general/2018/07/21/starks_part_3.html in section where explain fields operations
            // To save the inverse to be computed on chain the prover sends the inverse as an evaluation in commits.eval_inv
            function inverseArray(pMem) {

                let pAux := mload(0x40)     // Point to the next free position
                let acc := mload(add(pMem,pZhInv))       // Read the first element
                mstore(pAux, acc)

                pAux := add(pAux, 32)
                acc := mulmod(acc, mload(add(pMem, pEval_L1)), q)
                mstore(pAux, acc)

                let inv := calldataload(pEval_invPublics)

                // Before using the inverse sent by the prover the verifier checks inv(batch) * batch === 1
                if iszero(eq(1, mulmod(acc, inv, q))) {
                    mstore(0, 0)
                    return(0,0x20)
                }

                acc := inv

                pAux := sub(pAux, 32)
                inv := mulmod(acc, mload(pAux), q)
                acc := mulmod(acc, mload(add(pMem, pEval_L1)), q)
                mstore(add(pMem, pEval_L1), inv)
                mstore(add(pMem, pZhInv), acc)
            }
            
            function computeInverseValues(pMem) {
                // L_i where i from 1 to num public inputs, needed in step 6 and 7 of the verifier to compute L_1(xi) and PI(xi)
                let w := 1
                let xi := mload(add(pMem, pXi))
                mstore(add(pMem, pEval_L1), mulmod(n, mod(add(sub(xi, w), q), q), q))
                
            }
            
            function computeChallenges(pMem, pPublic) {
                let mIn := mload(0x40)
                // Compute challenge.beta & challenge.gamma
                mstore(add(mIn,0), f0x)
                mstore(add(mIn,32), f0y)
                mstore(add(mIn,64), f1x)
                mstore(add(mIn,96), f1y)

                mstore(add(mIn, 128), calldataload(pPublic))
                

                mstore(add(mIn,160), calldataload(pf2))
                mstore(add(mIn,192), calldataload(add(pf2, 32)))
                mstore(add(mIn,224), calldataload(pf3))
                mstore(add(mIn,256), calldataload(add(pf3, 32)))
              
                mstore(add(pMem, pBeta),  mod(keccak256(mIn, 288), q))
                mstore(add(pMem, pGamma), mod(keccak256(add(pMem, pBeta), 32), q))

                // Get xiSeed 
                mstore(mIn, mload(add(pMem, pGamma)))
                mstore(add(mIn,32), calldataload(pf4))
                mstore(add(mIn,64), calldataload(add(pf4, 32)))
                mstore(add(mIn,96), calldataload(pf5))
                mstore(add(mIn,128), calldataload(add(pf5, 32)))
                let xiSeed := mod(keccak256(mIn, 160), q)

                mstore(add(pMem, pXiSeed), xiSeed)

                // Compute xin
                let xin := 1
                xin:= mulmod(xin, xiSeed, q)
                xin:= mulmod(xin, xiSeed, q)
                xin:= mulmod(xin, xiSeed, q)
                xin:= mulmod(xin, xiSeed, q)
                xin:= mulmod(xin, xiSeed, q)
                xin:= mulmod(xin, xiSeed, q)
                xin:= mulmod(xin, xiSeed, q)
                xin:= mulmod(xin, xiSeed, q)
                xin:= mulmod(xin, xiSeed, q)
                xin:= mulmod(xin, xiSeed, q)
                xin:= mulmod(xin, xiSeed, q)
                xin:= mulmod(xin, xiSeed, q)

                mstore(add(pMem, pXi), xin)

                // Compute xi^n
                xin:= mulmod(xin, xin, q)
                xin:= mulmod(xin, xin, q)
                xin:= mulmod(xin, xin, q)
                xin:= mulmod(xin, xin, q)
                xin:= mulmod(xin, xin, q)
                xin:= mulmod(xin, xin, q)
                xin:= mulmod(xin, xin, q)
                xin:= mulmod(xin, xin, q)
                
                xin:= mod(add(sub(xin, 1), q), q)
                mstore(add(pMem, pZh), xin)
                mstore(add(pMem, pZhInv), xin)  // We will invert later together with lagrange pols
            }


            // Compute Lagrange polynomial evaluation L_i(xi)
            function computeLagrange(pMem) {
                let zh := mload(add(pMem, pZh))
                let w := 1
                
                    mstore(add(pMem, pEval_L1 ), mulmod(mload(add(pMem, pEval_L1 )), zh, q))
                    
            }

            // Compute public input polynomial evaluation PI(xi)
            function computePi(pMem, pPub) {
                let pi := 0
                pi := mod(add(sub(pi, mulmod(mload(add(pMem, pEval_L1)), calldataload(pPub), q)), q), q)
                
                mstore(add(pMem, pPi), pi)
            }

            function computeT0(pMem)-> t0 {
                let evalA := calldataload(pEval_A)
                let evalB := calldataload(pEval_B)
                let evalC := calldataload(pEval_C)

                t0 := mulmod(calldataload(pEval_QL), evalA, q)
                t0 := addmod(t0, mulmod(calldataload(pEval_QR), evalB, q) ,q)
                t0 := addmod(t0, mulmod(calldataload(pEval_QM), mulmod(evalA, evalB, q), q) ,q)
                t0 := addmod(t0, mulmod(calldataload(pEval_QO), evalC, q) ,q)
                t0 := addmod(t0, calldataload(pEval_QC) ,q)
                t0 := addmod(t0, mload(add(pMem, pPi)), q)
                t0 := mulmod(t0, mload(add(pMem, pZhInv)), q)
            }

            function computeT1(pMem) -> t1 {
                t1 := sub(calldataload(pEval_Z), 1)
                t1 := mulmod(t1, mload(add(pMem, pEval_L1)) ,q)
                t1 := mulmod(t1, mload(add(pMem, pZhInv)) ,q)
            }

            function computeT2(pMem) -> t2 {
                let betaXi := mulmod(mload(add(pMem, pBeta)), mload(add(pMem, pXi)), q)
                let gamma := mload(add(pMem, pGamma))
                let beta := mload(add(pMem, pBeta))
                let evalZ := calldataload(pEval_Z)
                let evalZw := calldataload(pEval_Zw)

                t2 := addmod(calldataload( pEval_A), addmod(betaXi, gamma, q) ,q)
                t2 := mulmod(t2,addmod(calldataload( pEval_B), addmod(mulmod(betaXi, k1, q), gamma, q) ,q), q)
                t2 := mulmod(t2,addmod(calldataload( pEval_C), addmod(mulmod(betaXi, k2, q), gamma, q) ,q), q)
                t2 := mulmod(t2, evalZ, q)

                let t22 := addmod(calldataload(pEval_A), addmod(mulmod(beta, calldataload(pEval_Sigma1), q), gamma, q) ,q)
                t22 := mulmod(t22,addmod(calldataload(pEval_B), addmod(mulmod(beta, calldataload(pEval_Sigma2), q), gamma, q) ,q), q)
                t22 := mulmod(t22,addmod(calldataload(pEval_C), addmod(mulmod(beta, calldataload(pEval_Sigma3), q), gamma, q) ,q), q)
                t22 := mulmod(t22, evalZw, q)

                t2:= addmod(t2, mod(sub(q, t22), q), q)
                t2 := mulmod(t2, mload(add(pMem, pZhInv)), q)
            }

            let pMem := mload(0x40)
            mstore(0x40, add(pMem, lastMem))

            // Compute the challenges: beta, gamma, xi, xiN and zh(xi)
            computeChallenges(pMem, pubSignals)

            computeInverseValues(pMem)

            inverseArray(pMem)

            // Compute Lagrange polynomial evaluations Li(xi)
            computeLagrange(pMem)

            // Compute public input polynomial evaluation PI(xi) = \sum_i^l -public_input_i·L_i(xi)
            computePi(pMem, pubSignals)
            
            evalT0 := computeT0(pMem)
            evalT1 := computeT1(pMem)
            evalT2 := computeT2(pMem)
            
            challengeXiSeed := mload(add(pMem, pXiSeed))

            calldatacopy(commits, proof, 832)
        }

        verifyCommitments(commits, challengeXiSeed, [evalT0, evalT1, evalT2]);
    }
}
