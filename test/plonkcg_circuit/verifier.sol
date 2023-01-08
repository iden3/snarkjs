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

    // PLONK data
    uint32 constant n =   16;
    uint16 constant nPublic =  3;
    uint16 constant nLagrange = 3;

    uint256 constant Qmx = 0;
    uint256 constant Qmy = 0;
    uint256 constant Qlx = 1175559859275896296110747033411757100197893697038047906519829837171029165721;
    uint256 constant Qly = 1277938460094897658480007543961902225362626198851434719929801707323922926537;
    uint256 constant Qrx = 5348646568571115377052011661691985397451392112211690506629642241839982058882;
    uint256 constant Qry = 2168150517383499553652721415151398542097688852759423061781088361466071209194;
    uint256 constant Qox = 9353436734144752401408885262722616112413705968333374613232730006505653079603;
    uint256 constant Qoy = 15631247425007294131614713670402755020853749001767283034905067091420747085002;
    uint256 constant Qcx = 0;
    uint256 constant Qcy = 0;
    uint256 constant S1x = 3759303877146434771037448880706954138553403459717077567749230193520539433260;
    uint256 constant S1y = 5582733619768404334841421537553347942239042320035270476736217467834087496632;
    uint256 constant S2x = 10135941491941477471478809061066510624151848959246462388516813604189187153578;
    uint256 constant S2y = 3273571004412103239653573167004258308621527568693297147960378661955354702437;
    uint256 constant S3x = 9872456543858556654724029212035485580651004209707730762800865743385153364558;
    uint256 constant S3y = 8657617272437370375501330122839845988618838120730871081843935589557700158263;
    uint256 constant k1 = 2;
    uint256 constant k2 = 3;
    uint256 constant X2x1 = 18029695676650738226693292988307914797657423701064905010927197838374790804409;
    uint256 constant X2x2 = 14583779054894525174450323658765874724019480979794335525732096752006891875705;
    uint256 constant X2y1 = 2140229616977736810657479771656733941598412651537078903776637920509952744750;
    uint256 constant X2y2 = 11474861747383700316476719153975578001603231366361248090558603872215261634898;

    uint256 constant q = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    uint256 constant qf = 21888242871839275222246405745257275088696311157297823662689037894645226208583;
    uint256 constant w1 = 14940766826517323942636479241147756311199852622225275649687664389641784935947;

    uint256 constant G1x = 1;
    uint256 constant G1y = 2;
    uint256 constant G2x1 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant G2x2 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant G2y1 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant G2y2 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;

    // Range check (RC) data
    

    uint32  constant RCn  = 1024;
    uint256 constant RCw1 = 3161067157621608152362653341354432744960400845131437947728257924963983317266;
    uint256 constant Qkx  = 13777099998927963874415269862930293347645811857738566330563388272186670902864;
    uint256 constant Qky  = 11712955584289557156652931575135391241790846681902988235123008471081794954955;

    // PLONK polynomials
    uint16 constant pA    = 32;
    uint16 constant pB    = 96;
    uint16 constant pC    = 160;
    uint16 constant pZ    = 224;
    uint16 constant pT1   = 288;
    uint16 constant pT2   = 352;
    uint16 constant pT3   = 416;
    uint16 constant pWxi  = 480;
    uint16 constant pWxiw = 544;

    // PLONK Proof Evaluations
    uint16 constant pEval_a  = 608;
    uint16 constant pEval_b  = 640;
    uint16 constant pEval_c  = 672;
    uint16 constant pEval_s1 = 704;
    uint16 constant pEval_s2 = 736;
    uint16 constant pEval_zw = 768;
    uint16 constant pEval_r  = 800;

    // RC PLONK polynomials
    uint16 constant pRCF    = 832;
    uint16 constant pRCLT   = 896;
    uint16 constant pRCH1   = 960;
    uint16 constant pRCH2   = 1024;
    uint16 constant pRCZ    = 1088;
    uint16 constant pRCWxi  = 1152;
    uint16 constant pRCWxiw = 1216;
    
    uint16 constant pRCQ0= 1280;
    

    

    // RC PLONK Proof Evaluations
    uint16 constant pRCEvalF  = 1344;
    uint16 constant pRCEvalLT = 1376;
    uint16 constant pRCEvalH1 = 1408;
    uint16 constant pRCEvalH2 = 1440;
    uint16 constant pRCEvalZw = 1472;
    uint16 constant pRCEvalH1w= 1504;
    uint16 constant pRCEvalR  = 1536;

    

    // PLONK challenges
    uint16 constant pAlpha = 0;
    uint16 constant pBeta = 32;
    uint16 constant pGamma = 64;
    uint16 constant pXi = 96;
    uint16 constant pXin = 128;
    uint16 constant pBetaXi = 160;
    uint16 constant pV1 = 192;
    uint16 constant pV2 = 224;
    uint16 constant pV3 = 256;
    uint16 constant pV4 = 288;
    uint16 constant pV5 = 320;
    uint16 constant pV6 = 352;
    uint16 constant pU = 384;
    uint16 constant pPl = 416;
    uint16 constant pEval_t = 448;
    uint16 constant pA1 = 480;
    uint16 constant pB1 = 544;
    uint16 constant pZh = 608;
    uint16 constant pZhInv = 640;
    
    uint16 constant pEval_l1 = 672;
    
    uint16 constant pEval_l2 = 704;
    
    uint16 constant pEval_l3 = 736;
    
    

    // RC PLONK Challenges
    uint16 constant pRCGamma  = 768;
    uint16 constant pRCAlpha  = 800;
    uint16 constant pRCXi     = 832;
    uint16 constant pRCXiN    = 864;
    uint16 constant pRCV0     = 896;
    uint16 constant pRCV1     = 928;
    uint16 constant pRCV2     = 960;
    uint16 constant pRCV3     = 992;
    uint16 constant pRCV4     = 1024;
    uint16 constant pRCVp     = 1056;
    uint16 constant pRCU      = 1088;
    uint16 constant pRCOmegaN = 1120;

    // RC PLONK Computed
    uint16 constant pRCEvalR0 = 1152;
    uint16 constant pRCA1     = 1184;
    uint16 constant pRCB1     = 1248;
    uint16 constant pRCZh     = 1312;
    uint16 constant pRCZhInv  = 1344;
    uint16 constant pRCEvalL1 = 1376;
    uint16 constant pRCEvalLN = 1408;

    
    uint16 constant lastMem = 1440;

    function verifyProof(bytes memory proof, uint[] memory pubSignals) public view returns (bool) {
        assembly {
            /////////
            // Computes the inverse using the extended euclidean algorithm
            /////////
            function inverse(a, q) -> inv {
                let t := 0
                let newt := 1
                let r := q
                let newr := a
                let quotient
                let aux

                for { } newr { } {
                    quotient := sdiv(r, newr)
                    aux := sub(t, mul(quotient, newt))
                    t:= newt
                    newt:= aux

                    aux := sub(r,mul(quotient, newr))
                    r := newr
                    newr := aux
                }

                if gt(r, 1) { revert(0,0) }
                if slt(t, 0) { t:= add(t, q) }

                inv := t
            }

            ///////
            // Computes the inverse of an array of values
            // See https://vitalik.ca/general/2018/07/21/starks_part_3.html in section where explain fields operations
            //////
            function inverseArray(pVals, n) {

                let pAux := mload(0x40)     // Point to the next free position
                let pIn := pVals
                let lastPIn := add(pVals, mul(n, 32))  // Read n elemnts
                let acc := mload(pIn)       // Read the first element
                pIn := add(pIn, 32)         // Point to the second element
                let inv


                for { } lt(pIn, lastPIn) {
                    pAux := add(pAux, 32)
                    pIn := add(pIn, 32)
                }
                {
                    mstore(pAux, acc)
                    acc := mulmod(acc, mload(pIn), q)
                }
                acc := inverse(acc, q)

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

            function checkInput(pProof) {
                if iszero(eq(mload(pProof), 1536 )) {
                    mstore(0, 0)
                    return(0,0x20)
                }
                checkField(mload(add(pProof, pEval_a)))
                checkField(mload(add(pProof, pEval_b)))
                checkField(mload(add(pProof, pEval_c)))
                checkField(mload(add(pProof, pEval_s1)))
                checkField(mload(add(pProof, pEval_s2)))
                checkField(mload(add(pProof, pEval_zw)))
                checkField(mload(add(pProof, pEval_r)))

                checkField(mload(add(pProof, pRCEvalF)))
                checkField(mload(add(pProof, pRCEvalLT)))
                checkField(mload(add(pProof, pRCEvalH1)))
                checkField(mload(add(pProof, pRCEvalH2)))
                checkField(mload(add(pProof, pRCEvalZw)))
                checkField(mload(add(pProof, pRCEvalH1w)))
                checkField(mload(add(pProof, pRCEvalR)))
                // Points are checked in the point operations precompiled smart contracts
            }

            function checkInputRC(pProof) {
                checkField(mload(add(pProof, pRCEvalF)))
                checkField(mload(add(pProof, pRCEvalLT)))
                checkField(mload(add(pProof, pRCEvalH1)))
                checkField(mload(add(pProof, pRCEvalH2)))
                checkField(mload(add(pProof, pRCEvalZw)))
                checkField(mload(add(pProof, pRCEvalH1w)))
                checkField(mload(add(pProof, pRCEvalR)))
            }

            function computeChallenges(pProof, pMem, pPublic) {

                let a
                let b

                
                mstore( add(pMem, 1440 ), mload( add( pPublic, 32)))
                
                mstore( add(pMem, 1472 ), mload( add( pPublic, 64)))
                
                mstore( add(pMem, 1504 ), mload( add( pPublic, 96)))
                
                mstore( add(pMem, 1536 ), mload( add( pProof, pA)))
                mstore( add(pMem, 1568 ), mload( add( pProof, add(pA,32))))
                mstore( add(pMem, 1600 ), mload( add( pProof, add(pA,64))))
                mstore( add(pMem, 1632 ), mload( add( pProof, add(pA,96))))
                mstore( add(pMem, 1664 ), mload( add( pProof, add(pA,128))))
                mstore( add(pMem, 1696 ), mload( add( pProof, add(pA,160))))

                b := mod(keccak256(add(pMem, lastMem), 288), q)
                mstore( add(pMem, pBeta), b)
                mstore( add(pMem, pGamma), mod(keccak256(add(pMem, pBeta), 32), q))
                mstore( add(pMem, pAlpha), mod(keccak256(add(pProof, pZ), 64), q))

                a := mod(keccak256(add(pProof, pT1), 192), q)
                mstore( add(pMem, pXi), a)
                mstore( add(pMem, pBetaXi), mulmod(b, a, q))
                
                a:= mulmod(a, a, q)
                
                a:= mulmod(a, a, q)
                
                a:= mulmod(a, a, q)
                
                a:= mulmod(a, a, q)
                
                mstore( add(pMem, pXin), a)
                a:= mod(add(sub(a, 1),q), q)
                mstore( add(pMem, pZh), a)
                mstore( add(pMem, pZhInv), a)  // We will invert later together with lagrange pols

                let v1 := mod(keccak256(add(pProof, pEval_a), 224), q)
                mstore( add(pMem, pV1), v1)
                a := mulmod(v1, v1, q)
                mstore( add(pMem, pV2), a)
                a := mulmod(a, v1, q)
                mstore( add(pMem, pV3), a)
                a := mulmod(a, v1, q)
                mstore( add(pMem, pV4), a)
                a := mulmod(a, v1, q)
                mstore( add(pMem, pV5), a)
                a := mulmod(a, v1, q)
                mstore( add(pMem, pV6), a)

                mstore( add(pMem, pU), mod(keccak256(add(pProof, pWxi), 128), q))
            }

            function computeChallengesRC(pProof, pMem) {
                let a
                let b

                // challengesRC.gamma
                mstore( add(pMem, 1440 ) , mload( add( pProof, pRCF)))
                mstore( add(pMem, 1472 ) , mload( add( pProof, add(pRCF,32))))
                mstore( add(pMem, 1504 ) , mload( add( pProof, pRCH1)))
                mstore( add(pMem, 1536 ) , mload( add( pProof, add(pRCH1,32))))
                mstore( add(pMem, 1568 ), mload( add( pProof, pRCH2)))
                mstore( add(pMem, 1600 ), mload( add( pProof, add(pRCH2,32))))

                b := mod(keccak256(add(pMem, lastMem), 192), q)
                mstore( add(pMem, pRCGamma), b)

                // challengesRC.alpha
                mstore( add(pMem, pRCAlpha), mod(keccak256(add(pProof, pRCZ), 64), q))

                // challengesRC.xi
                a := mod(keccak256(add(pProof, pRCQ0), 64), q)
                mstore( add(pMem, pRCXi), a)

                // challengesRC.xin
                for { let i := 0} lt(i, 10) { i := add(i, 1) } { a:= mulmod(a, a, q) }
                mstore( add(pMem, pRCXiN), a)

                // Zh & ZhInv
                a:= mod(add(sub(a, 1),q), q)
                mstore( add(pMem, pRCZh), a)
                mstore( add(pMem, pRCZhInv), a)  // We will invert later together with lagrange pols

                // challengesRC.v[0..4]
                let v0 := mod(keccak256(add(pProof, pRCEvalF), 192), q)
                mstore( add(pMem, pRCV0), v0)
                a := mulmod(v0, v0, q)
                mstore( add(pMem, pRCV1), a)
                a := mulmod(a, v0, q)
                mstore( add(pMem, pRCV2), a)
                a := mulmod(a, v0, q)
                mstore( add(pMem, pRCV3), a)
                a := mulmod(a, v0, q)
                mstore( add(pMem, pRCV4), a)

                // challengesRC.vp
                mstore( add(pMem, pRCVp), mod(keccak256(add(pMem, pRCV0), 32), q))

                // challengesRC.u
                mstore( add(pMem, pRCU), mod(keccak256(add(pProof, pRCWxi), 128), q))

                // omegaN
                let w := 1

                for { let i := 1} lt(i, 1024) { i := add(i, 1) } { w := mulmod(w, RCw1, q) }

                mstore( add(pMem, pRCOmegaN), w)
            }

            function computeLagrange(pMem) {

                let w := 1
                
                mstore(
                    add(pMem, pEval_l1),
                    mulmod(
                        n,
                        mod(
                            add(
                                sub(
                                    mload(add(pMem, pXi)),
                                    w
                                ),
                                q
                            ),
                            q
                        ),
                        q
                    )
                )
                
                w := mulmod(w, w1, q)
                
                
                mstore(
                    add(pMem, pEval_l2),
                    mulmod(
                        n,
                        mod(
                            add(
                                sub(
                                    mload(add(pMem, pXi)),
                                    w
                                ),
                                q
                            ),
                            q
                        ),
                        q
                    )
                )
                
                w := mulmod(w, w1, q)
                
                
                mstore(
                    add(pMem, pEval_l3),
                    mulmod(
                        n,
                        mod(
                            add(
                                sub(
                                    mload(add(pMem, pXi)),
                                    w
                                ),
                                q
                            ),
                            q
                        ),
                        q
                    )
                )
                
                

                inverseArray(add(pMem, pZhInv), 4 )

                let zh := mload(add(pMem, pZh))
                w := 1
                
                
                mstore(
                    add(pMem, pEval_l1 ),
                    mulmod(
                        mload(add(pMem, pEval_l1 )),
                        zh,
                        q
                    )
                )
                
                
                w := mulmod(w, w1, q)
                
                
                
                mstore(
                    add(pMem, pEval_l2),
                    mulmod(
                        w,
                        mulmod(
                            mload(add(pMem, pEval_l2)),
                            zh,
                            q
                        ),
                        q
                    )
                )
                
                
                w := mulmod(w, w1, q)
                
                
                
                mstore(
                    add(pMem, pEval_l3),
                    mulmod(
                        w,
                        mulmod(
                            mload(add(pMem, pEval_l3)),
                            zh,
                            q
                        ),
                        q
                    )
                )
                
                
                


            }

            function computeLagrangeRC(pMem) {
                let omega1 := 1
                let omegaN := mload(add(pMem, pRCOmegaN))

                //part del denominador (xi-omega)
                mstore(add(pMem, pRCEvalL1),
                mulmod(RCn, mod(add(sub(mload(add(pMem, pRCXi)), omega1), q), q), q))

                //part del denominador (xi-omegaN)
                mstore(add(pMem, pRCEvalLN),
                mulmod(RCn, mod(add(sub(mload(add(pMem, pRCXi)), omegaN), q), q), q))

                inverseArray(add(pMem, pRCZhInv), 3)

                let zh := mload(add(pMem, pRCZh))

                mstore(add(pMem, pRCEvalL1 ), mulmod(mload(add(pMem, pRCEvalL1 )), zh, q))

                mstore(add(pMem, pRCEvalLN), mulmod(omegaN, mulmod(mload(add(pMem, pRCEvalLN)), zh, q), q))
            }

            function computePl(pMem, pPub) {
                let pl := 0

                
                pl := mod(
                    add(
                        sub(
                            pl,
                            mulmod(
                                mload(add(pMem, pEval_l1)),
                                mload(add(pPub, 32)),
                                q
                            )
                        ),
                        q
                    ),
                    q
                )
                
                pl := mod(
                    add(
                        sub(
                            pl,
                            mulmod(
                                mload(add(pMem, pEval_l2)),
                                mload(add(pPub, 64)),
                                q
                            )
                        ),
                        q
                    ),
                    q
                )
                
                pl := mod(
                    add(
                        sub(
                            pl,
                            mulmod(
                                mload(add(pMem, pEval_l3)),
                                mload(add(pPub, 96)),
                                q
                            )
                        ),
                        q
                    ),
                    q
                )
                

                mstore(add(pMem, pPl), pl)


            }

            function computeR0(pProof, pMem) {
                let t
                let t1
                let t2
                t := addmod(
                    mload(add(pProof, pEval_r)),
                    mload(add(pMem, pPl)),
                    q
                )

                t1 := mulmod(
                    mload(add(pProof, pEval_s1)),
                    mload(add(pMem, pBeta)),
                    q
                )

                t1 := addmod(
                    t1,
                    mload(add(pProof, pEval_a)),
                    q
                )

                t1 := addmod(
                    t1,
                    mload(add(pMem, pGamma)),
                    q
                )

                t2 := mulmod(
                    mload(add(pProof, pEval_s2)),
                    mload(add(pMem, pBeta)),
                    q
                )

                t2 := addmod(
                    t2,
                    mload(add(pProof, pEval_b)),
                    q
                )

                t2 := addmod(
                    t2,
                    mload(add(pMem, pGamma)),
                    q
                )

                t1 := mulmod(t1, t2, q)

                t2 := addmod(
                    mload(add(pProof, pEval_c)),
                    mload(add(pMem, pGamma)),
                    q
                )

                t1 := mulmod(t1, t2, q)
                t1 := mulmod(t1, mload(add(pProof, pEval_zw)), q)
                t1 := mulmod(t1, mload(add(pMem, pAlpha)), q)

                t2 := mulmod(
                    mload(add(pMem, pEval_l1)),
                    mload(add(pMem, pAlpha)),
                    q
                )

                t2 := mulmod(
                    t2,
                    mload(add(pMem, pAlpha)),
                    q
                )

                t1 := addmod(t1, t2, q)

                t := mod(sub(add(t, q), t1), q)
                t := mulmod(t, mload(add(pMem, pZhInv)), q)

                mstore( add(pMem, pEval_t) , t)

            }

            function computeR0RC(pProof, pMem) {
                let alphaAcc := mload(add(pMem, pRCAlpha))

                let elA0 := addmod(mload(add(pProof, pRCEvalH1)), mload(add(pMem, pRCGamma)), q)
                let elA1 := addmod(mload(add(pProof, pRCEvalH2)), mload(add(pMem, pRCGamma)), q)
                let elA  := mulmod(elA0, elA1, q)
                elA  := mulmod(elA, mload(add(pProof, pRCEvalZw)), q)

                let elB := mulmod(mload(add(pMem, pRCEvalL1)), mload(add(pMem, pRCAlpha)), q)

                let elC := mulmod(mload(add(pMem, pRCEvalL1)), mload(add(pProof, pRCEvalH1)), q)
                alphaAcc := mulmod(alphaAcc, mload(add(pMem, pRCAlpha)), q)
                elC := mulmod(elC, alphaAcc, q)

                let elD := mod(sub(mload(add(pProof, pRCEvalH2)), 1023), q)
                elD := mulmod(elD, mload(add(pMem, pRCEvalLN)), q)
                alphaAcc := mulmod(alphaAcc, mload(add(pMem, pRCAlpha)), q)
                elD := mulmod(elD, alphaAcc, q)

                let elE := mod(add(sub(mload(add(pProof, pRCEvalH2)) , mload(add(pProof, pRCEvalH1)) ), q), q)
                elE := getResultPolP(elE)
                alphaAcc := mulmod(alphaAcc, mload(add(pMem, pRCAlpha)), q)
                elE := mulmod(elE, alphaAcc, q)

                let elF0 := mod(add(sub(mload(add(pMem, pRCXi)), mload(add(pMem, pRCOmegaN))), q), q)
                let elF1 := getResultPolP(mod(add(sub(mload(add(pProof, pRCEvalH1w)), mload(add(pProof, pRCEvalH2))), q), q))
                let elF  := mulmod(elF0, elF1, q)
                alphaAcc := mulmod(alphaAcc, mload(add(pMem, pRCAlpha)), q)
                elF := mulmod(elF, alphaAcc, q)

                let r0 := mload(add(pProof, pRCEvalR))
                r0 := mod(add(sub(r0, addmod(elA, elB, q)), q), q)
                r0 := addmod(r0, elC, q)
                r0 := addmod(r0, elD, q)
                r0 := addmod(r0, elE, q)
                r0 := addmod(r0, elF, q)

                r0 := mulmod(r0, mload(add(pMem, pRCZhInv)), q)

                mstore(add(pMem, pRCEvalR0) , r0)
            }

            function g1_set(pR, pP) {
                mstore(pR, mload(pP))
                mstore(add(pR, 32), mload(add(pP,32)))
            }

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

            function g1_mulSetC(pR, x, y, s) {
                let success
                let mIn := mload(0x40)
                mstore(mIn, x)
                mstore(add(mIn,32), y)
                mstore(add(mIn,64), s)

                success := staticcall(sub(gas(), 2000), 7, mIn, 96, pR, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0,0x20)
                }
            }

            function getResultPolP(val) -> res {
                let current

                res := val

                for { let i := 1} lt(i, 2) { i := add(i, 1) } {
                current := mod(sub(val, i), q)
                res := mulmod(res, current, q)
                }
            }

            function computeA1(pProof, pMem) {
                let p := add(pMem, pA1)
                g1_set(p, add(pProof, pWxi))
                g1_mulAcc(p, add(pProof, pWxiw), mload(add(pMem, pU)))
            }

            function computeA1RC(pProof, pMem) {
                let p := add(pMem, pRCA1)
                g1_set(p, add(pProof, pRCWxi))
                g1_mulAcc(p, add(pProof, pRCWxiw), mload(add(pMem, pRCU)))
            }

            function computeB1(pProof, pMem) {
                let s
                let s1
                let p := add(pMem, pB1)

                // Calculate D
                s := mulmod( mload(add(pProof, pEval_a)), mload(add(pMem, pV1)), q)
                g1_mulSetC(p, Qlx, Qly, s)

                let a := mulmod( mload(add(pProof, pEval_a)), mload(add(pMem, pV1)), q)
                let b := mulmod( mload(add(pProof, pEval_b)), mload(add(pMem, pV1)), q)
                let plonkFactor :=  addmod(mod(sub(q, a), q), b, q)
                g1_mulAccC(p, Qkx, Qky, plonkFactor)

                s := mulmod( s, mload(add(pProof, pEval_b)), q)
                g1_mulAccC(p, Qmx, Qmy, s)

                s := mulmod( mload(add(pProof, pEval_b)), mload(add(pMem, pV1)), q)
                g1_mulAccC(p, Qrx, Qry, s)

                s := mulmod( mload(add(pProof, pEval_c)), mload(add(pMem, pV1)), q)
                g1_mulAccC(p, Qox, Qoy, s)

                s :=mload(add(pMem, pV1))
                g1_mulAccC(p, Qcx, Qcy, s)

                s := addmod(mload(add(pProof, pEval_a)), mload(add(pMem, pBetaXi)), q)
                s := addmod(s, mload(add(pMem, pGamma)), q)
                s1 := mulmod(k1, mload(add(pMem, pBetaXi)), q)
                s1 := addmod(s1, mload(add(pProof, pEval_b)), q)
                s1 := addmod(s1, mload(add(pMem, pGamma)), q)
                s := mulmod(s, s1, q)
                s1 := mulmod(k2, mload(add(pMem, pBetaXi)), q)
                s1 := addmod(s1, mload(add(pProof, pEval_c)), q)
                s1 := addmod(s1, mload(add(pMem, pGamma)), q)
                s := mulmod(s, s1, q)
                s := mulmod(s, mload(add(pMem, pAlpha)), q)
                s := mulmod(s, mload(add(pMem, pV1)), q)
                s1 := mulmod(mload(add(pMem, pEval_l1)), mload(add(pMem, pAlpha)), q)
                s1 := mulmod(s1, mload(add(pMem, pAlpha)), q)
                s1 := mulmod(s1, mload(add(pMem, pV1)), q)
                s := addmod(s, s1, q)
                s := addmod(s, mload(add(pMem, pU)), q)
                g1_mulAcc(p, add(pProof, pZ), s)

                s := mulmod(mload(add(pMem, pBeta)), mload(add(pProof, pEval_s1)), q)
                s := addmod(s, mload(add(pProof, pEval_a)), q)
                s := addmod(s, mload(add(pMem, pGamma)), q)
                s1 := mulmod(mload(add(pMem, pBeta)), mload(add(pProof, pEval_s2)), q)
                s1 := addmod(s1, mload(add(pProof, pEval_b)), q)
                s1 := addmod(s1, mload(add(pMem, pGamma)), q)
                s := mulmod(s, s1, q)
                s := mulmod(s, mload(add(pMem, pAlpha)), q)
                s := mulmod(s, mload(add(pMem, pV1)), q)
                s := mulmod(s, mload(add(pMem, pBeta)), q)
                s := mulmod(s, mload(add(pProof, pEval_zw)), q)
                s := mod(sub(q, s), q)
                g1_mulAccC(p, S3x, S3y, s)


                // calculate F
                g1_acc(p , add(pProof, pT1))

                s := mload(add(pMem, pXin))
                g1_mulAcc(p, add(pProof, pT2), s)

                s := mulmod(s, s, q)
                g1_mulAcc(p, add(pProof, pT3), s)

                g1_mulAcc(p, add(pProof, pA), mload(add(pMem, pV2)))
                g1_mulAcc(p, add(pProof, pB), mload(add(pMem, pV3)))
                g1_mulAcc(p, add(pProof, pC), mload(add(pMem, pV4)))
                g1_mulAccC(p, S1x, S1y, mload(add(pMem, pV5)))
                g1_mulAccC(p, S2x, S2y, mload(add(pMem, pV6)))

                // calculate E
                s := mload(add(pMem, pEval_t))
                s := addmod(s, mulmod(mload(add(pProof, pEval_r)), mload(add(pMem, pV1)), q), q)
                s := addmod(s, mulmod(mload(add(pProof, pEval_a)), mload(add(pMem, pV2)), q), q)
                s := addmod(s, mulmod(mload(add(pProof, pEval_b)), mload(add(pMem, pV3)), q), q)
                s := addmod(s, mulmod(mload(add(pProof, pEval_c)), mload(add(pMem, pV4)), q), q)
                s := addmod(s, mulmod(mload(add(pProof, pEval_s1)), mload(add(pMem, pV5)), q), q)
                s := addmod(s, mulmod(mload(add(pProof, pEval_s2)), mload(add(pMem, pV6)), q), q)
                s := addmod(s, mulmod(mload(add(pProof, pEval_zw)), mload(add(pMem, pU)), q), q)
                s := mod(sub(q, s), q)
                g1_mulAccC(p, G1x, G1y, s)


                // Last part of B
                s := mload(add(pMem, pXi))
                g1_mulAcc(p, add(pProof, pWxi), s)

                s := mulmod(mload(add(pMem, pU)), mload(add(pMem, pXi)), q)
                s := mulmod(s, w1, q)
                g1_mulAcc(p, add(pProof, pWxiw), s)

            }

            function computeB1RC(pProof, pMem) {
                let p := add(pMem, pRCB1)

                // **** computeD ***************************

                // IDENTITY A
                let elA0 := addmod(mload(add(pMem, pRCGamma)), mload(add(pProof, pRCEvalF)), q)
                let elA1 := addmod(mload(add(pMem, pRCGamma)), mload(add(pProof, pRCEvalLT)), q)
                let elA := mulmod(elA0, elA1, q)
                elA := mulmod(elA,  mload(add(pMem, pRCV0)), q)
                elA := addmod(elA,  mload(add(pMem, pRCU)), q)
                g1_mulAcc(p, add(pProof, pRCZ), elA)

                // IDENTITY B
                let elB := mulmod(mload(add(pMem, pRCEvalL1)), mload(add(pMem, pRCV0)), q)
                elB := mulmod(elB, mload(add(pMem, pRCAlpha)), q)
                g1_mulAcc(p, add(pProof, pRCZ), elB)


                // **** computeF ***************************

                // Add Q_0, Q_1, ..., Q_n polynomials
                g1_acc(p ,add(pProof, pRCQ0))

                let xinAdd2 := mload(add(pMem, pRCXiN))
                xinAdd2 := mulmod(xinAdd2, mload(add(pMem, pRCXi)),  q)
                xinAdd2 := mulmod(xinAdd2, mload(add(pMem, pRCXi)),  q)
                xinAdd2 := mulmod(xinAdd2, mload(add(pMem, pRCXi)),  q)
                let xinTotal := xinAdd2
                

                g1_mulAcc(p, add(pProof, pRCF), mload(add(pMem, pRCV1)))
                g1_mulAcc(p, add(pProof, pRCLT), mload(add(pMem, pRCV2)))
                g1_mulAcc(p, add(pProof, pRCH1), mload(add(pMem, pRCV3)))
                g1_mulAcc(p, add(pProof, pRCH2), mload(add(pMem, pRCV4)))
                g1_mulAcc(p, add(pProof, pRCH1), mulmod(mload(add(pMem, pRCVp)), mload(add(pMem, pRCU)), q))


                // **** computeE ***************************

                let res := mload(add(pMem, pRCEvalR0))
                res := addmod(res, mulmod(mload(add(pProof, pRCEvalR)),  mload(add(pMem, pRCV0)), q), q)
                res := addmod(res, mulmod(mload(add(pProof, pRCEvalF)),  mload(add(pMem, pRCV1)), q), q)
                res := addmod(res, mulmod(mload(add(pProof, pRCEvalLT)), mload(add(pMem, pRCV2)), q), q)
                res := addmod(res, mulmod(mload(add(pProof, pRCEvalH1)), mload(add(pMem, pRCV3)), q), q)
                res := addmod(res, mulmod(mload(add(pProof, pRCEvalH2)), mload(add(pMem, pRCV4)), q), q)

                let partial := mulmod(mload(add(pMem, pRCVp)), mload(add(pProof, pRCEvalH1w)), q)
                partial := addmod(mload(add(pProof, pRCEvalZw)), partial, q)
                res := addmod(res, mulmod(mload(add(pMem, pRCU)), partial, q), q)

                res := mod(sub(q, res), q)

                g1_mulAccC(p, G1x, G1y, res)


                // Last part of B
                res := mload(add(pMem, pRCXi))
                g1_mulAcc(p, add(pProof, pRCWxi), res)

                res := mulmod(mload(add(pMem, pRCU)), mload(add(pMem, pRCXi)), q)
                res := mulmod(res, RCw1, q)

                g1_mulAcc(p, add(pProof, pRCWxiw), res)
            }

            function checkPairing(pMem) -> isOk {
                let mIn := mload(0x40)
                mstore(mIn, mload(add(pMem, pA1)))
                mstore(add(mIn,32), mload(add(add(pMem, pA1), 32)))
                mstore(add(mIn,64), X2x2)
                mstore(add(mIn,96), X2x1)
                mstore(add(mIn,128), X2y2)
                mstore(add(mIn,160), X2y1)
                mstore(add(mIn,192), mload(add(pMem, pB1)))
                let s := mload(add(add(pMem, pB1), 32))
                s := mod(sub(qf, s), qf)
                mstore(add(mIn,224), s)
                mstore(add(mIn,256), G2x2)
                mstore(add(mIn,288), G2x1)
                mstore(add(mIn,320), G2y2)
                mstore(add(mIn,352), G2y1)

                let success := staticcall(sub(gas(), 2000), 8, mIn, 384, mIn, 0x20)

                isOk := and(success, mload(mIn))
            }

            function checkPairingRC(pMem) -> isOk {
                let mIn := mload(0x40)
                mstore(mIn, mload(add(pMem, pRCA1)))
                mstore(add(mIn,32), mload(add(add(pMem, pRCA1), 32)))
                mstore(add(mIn,64), X2x2)
                mstore(add(mIn,96), X2x1)
                mstore(add(mIn,128), X2y2)
                mstore(add(mIn,160), X2y1)
                mstore(add(mIn,192), mload(add(pMem, pRCB1)))
                let s := mload(add(add(pMem, pRCB1), 32))
                s := mod(sub(qf, s), qf)
                mstore(add(mIn,224), s)
                mstore(add(mIn,256), G2x2)
                mstore(add(mIn,288), G2x1)
                mstore(add(mIn,320), G2y2)
                mstore(add(mIn,352), G2y1)

                let success := staticcall(sub(gas(), 2000), 8, mIn, 384, mIn, 0x20)

                isOk := and(success, mload(mIn))
            }

            let pMem := mload(0x40)
            mstore(0x40, add(pMem, lastMem))

            checkInput(proof)
            checkInputRC(proof)

            computeChallenges(proof, pMem, pubSignals)
            computeChallengesRC(proof, pMem)

            computeLagrange(pMem)
            computeLagrangeRC(pMem)

            computePl(pMem, pubSignals)

            computeR0(proof, pMem)
            computeR0RC(proof, pMem)

            computeA1(proof, pMem)
            computeB1(proof, pMem)

            computeA1RC(proof, pMem)
            computeB1RC(proof, pMem)

            let isValid := and(checkPairing(pMem), checkPairingRC(pMem))

            mstore(0x40, sub(pMem, lastMem))
            mstore(0, isValid)
            return(0,0x20)
        }
    }
}
