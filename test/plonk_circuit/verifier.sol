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
    
    uint32 constant n =   8;
    uint16 constant nPublic =  2;
    uint16 constant nLagrange = 2;
    
    uint256 constant Qmx = 17953645607507459900286185560951810786731058999325781923205502055353263497291;
    uint256 constant Qmy = 19385486967908870028674938916390954985705306268782601788969000107603897770767;
    uint256 constant Qlx = 11940858774017579942566450477449012460918017239896733829055270107468309760540;
    uint256 constant Qly = 947254594125514574342968640034741130676940992205538578216940265903584710169;
    uint256 constant Qrx = 16057511199156614460548645536725007313348939819318943470685206502402956172907;
    uint256 constant Qry = 10506209454111335156976278630909826596572196999531725341452203577193363727183;
    uint256 constant Qox = 17157624048880737579826278328189066542171805404376573481770268188483838847757;
    uint256 constant Qoy = 18514386016535062016800932564037101304017747936838789635283796814642720512673;
    uint256 constant Qcx = 9425204922382128984212419080680000340238602060329517997301340801336513664736;
    uint256 constant Qcy = 9167308630107900718125273932943677561306913176994118892249570126249686869364;
    uint256 constant S1x = 10782085188530267881189340256496934831907742532399561656521702603135823217637;
    uint256 constant S1y = 12403008688044971496101927450821599344745023222457894394078671019783662128471;
    uint256 constant S2x = 9279525915934333912510150900730589708299616165652915633005823194068751444534;
    uint256 constant S2y = 17339946533833948904498037980944354287085405669808936769308277491115888828896;
    uint256 constant S3x = 10636394165993966883449775646752541022226109588433686577933510456646304718904;
    uint256 constant S3y = 18335534742276222998450555199564351867006746787413781617417650248398260441193;
    uint256 constant k1 = 2;
    uint256 constant k2 = 3;
    uint256 constant X2x1 = 18029695676650738226693292988307914797657423701064905010927197838374790804409;
    uint256 constant X2x2 = 14583779054894525174450323658765874724019480979794335525732096752006891875705;
    uint256 constant X2y1 = 2140229616977736810657479771656733941598412651537078903776637920509952744750;
    uint256 constant X2y2 = 11474861747383700316476719153975578001603231366361248090558603872215261634898;
    
    uint256 constant q = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    uint256 constant qf = 21888242871839275222246405745257275088696311157297823662689037894645226208583;
    uint256 constant w1 = 19540430494807482326159819597004422086093766032135589407132600596362845576832;    
    
    uint256 constant G1x = 1;
    uint256 constant G1y = 2;
    uint256 constant G2x1 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant G2x2 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant G2y1 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant G2y2 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint16 constant pA = 32;
    uint16 constant pB = 96;
    uint16 constant pC = 160;
    uint16 constant pZ = 224;
    uint16 constant pT1 = 288;
    uint16 constant pT2 = 352;
    uint16 constant pT3 = 416;
    uint16 constant pWxi = 480;
    uint16 constant pWxiw = 544;
    uint16 constant pEval_a = 608;
    uint16 constant pEval_b = 640;
    uint16 constant pEval_c = 672;
    uint16 constant pEval_s1 = 704;
    uint16 constant pEval_s2 = 736;
    uint16 constant pEval_zw = 768;
    
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
    uint16 constant pPI = 416;
    uint16 constant pEval_r0 = 448;
    uint16 constant pD = 480;
    uint16 constant pF = 544;
    uint16 constant pE = 608;
    uint16 constant pTmp = 672;
    uint16 constant pZh = 736;
    uint16 constant pZhInv = 768;
    
    uint16 constant pEval_l1 = 800;
    
    uint16 constant pEval_l2 = 832;
    
    
    
    uint16 constant lastMem = 864;

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
                if iszero(eq(mload(pProof), 800 )) {
                    mstore(0, 0)
                    return(0,0x20)
                }
                checkField(mload(add(pProof, pEval_a)))
                checkField(mload(add(pProof, pEval_b)))
                checkField(mload(add(pProof, pEval_c)))
                checkField(mload(add(pProof, pEval_s1)))
                checkField(mload(add(pProof, pEval_s2)))
                checkField(mload(add(pProof, pEval_zw)))

                // Points are checked in the point operations precompiled smart contracts
            }
            
            function calculateChallanges(pProof, pMem, pPublic) {
            
                let a
                let b

                // Challenges.beta
                mstore( add(pMem, 864 ), Qmx)
                mstore( add(pMem, 896 ), Qmy)
                mstore( add(pMem, 928 ), Qlx)
                mstore( add(pMem, 960 ), Qly)
                mstore( add(pMem, 992 ), Qrx)
                mstore( add(pMem, 1024 ), Qry)
                mstore( add(pMem, 1056 ), Qox)
                mstore( add(pMem, 1088 ), Qoy)
                mstore( add(pMem, 1120 ), Qcx)
                mstore( add(pMem, 1152 ), Qcy)
                mstore( add(pMem, 1184 ), S1x)
                mstore( add(pMem, 1216 ), S1x)
                mstore( add(pMem, 1248 ), S2x)
                mstore( add(pMem, 1280 ), S2x)
                mstore( add(pMem, 1312 ), S3x)
                mstore( add(pMem, 1344 ), S3x)

                
                mstore( add(pMem, 1376 ), mload( add( pPublic, 32)))
                
                mstore( add(pMem, 1408 ), mload( add( pPublic, 64)))
                
                mstore( add(pMem, 1440 ), mload( add( pProof, pA)))
                mstore( add(pMem, 1472 ), mload( add( pProof, add(pA,32))))
                mstore( add(pMem, 1504 ), mload( add( pProof, pB)))
                mstore( add(pMem, 1536 ), mload( add( pProof, add(pB, 32))))
                mstore( add(pMem, 1568 ), mload( add( pProof, pC)))
                mstore( add(pMem, 1600 ), mload( add( pProof, add(pC, 32))))
                
                b := mod(keccak256(add(pMem, lastMem), 768), q) 
                mstore(add(pMem, pBeta), b)

                // Challenges.gamma
                mstore(add(pMem, pGamma), mod(keccak256(add(pMem, pBeta), 32), q))
                
                // Challenges.alpha
                mstore(add(pMem, 864), mload(add(pMem, pBeta)))
                mstore(add(pMem, 896), mload(add(pMem, pGamma)))
                mstore(add(pMem, 928), mload(add(pProof, pZ)))
                mstore(add(pMem, 960), mload(add(pProof, add(pZ, 32))))
                a := mod(keccak256(add(pMem, lastMem), 128), q)
                mstore(add(pMem, pAlpha), a)

                mstore(add(pMem, 864), mload(add(pMem, pAlpha)))
                mstore(add(pMem, 896),  mload(add(pProof, pT1)))
                mstore(add(pMem, 928),  mload(add(pProof, add(pT1, 32))))
                mstore(add(pMem, 960),  mload(add(pProof, pT2)))
                mstore(add(pMem, 992), mload(add(pProof, add(pT2, 32))))
                mstore(add(pMem, 1024), mload(add(pProof, pT3)))
                mstore(add(pMem, 1056), mload(add(pProof, add(pT3, 32))))
                a := mod(keccak256(add(pMem, lastMem), 224), q)
                mstore( add(pMem, pXi), a)

                mstore(add(pMem, 864), a)
                mstore(add(pMem, 896),  mload(add(pProof, pEval_a)))
                mstore(add(pMem, 928),  mload(add(pProof, pEval_b)))
                mstore(add(pMem, 960),  mload(add(pProof, pEval_c)))
                mstore(add(pMem, 992),  mload(add(pProof, pEval_s1)))
                mstore(add(pMem, 1024),  mload(add(pProof, pEval_s2)))
                mstore(add(pMem, 1056),  mload(add(pProof, pEval_zw)))
                let v1 := mod(keccak256(add(pMem, lastMem), 224), q)
                mstore(add(pMem, pV1), v1)

                // Compute betaxi
                mstore( add(pMem, pBetaXi), mulmod(b, a, q))
                
                a:= mulmod(a, a, q)
                
                a:= mulmod(a, a, q)
                
                a:= mulmod(a, a, q)
                
                mstore( add(pMem, pXin), a)
                a:= mod(add(sub(a, 1),q), q)
                mstore( add(pMem, pZh), a)
                mstore( add(pMem, pZhInv), a)  // We will invert later together with lagrange pols
                                
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
            
            function calculateLagrange(pMem) {

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
                
                
                
                inverseArray(add(pMem, pZhInv), 3 )
                
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
                
                
                


            }
            
            function calculatePI(pMem, pPub) {
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
                
                
                mstore(add(pMem, pPI), pl)
                

            }

            function calculateR0(pProof, pMem) {
                let alpha2 := mulmod(mload(add(pMem, pAlpha)), mload(add(pMem, pAlpha)), q)           
                let e1 := mload(add(pMem, pPI))

                let e2 :=  mulmod(mload(add(pMem, pEval_l1)), alpha2, q)

                let e3a := addmod(
                    mload(add(pProof, pEval_a)),
                    mulmod(mload(add(pMem, pBeta)), mload(add(pProof, pEval_s1)), q),
                    q)
                e3a := addmod(e3a, mload(add(pMem, pGamma)), q)

                let e3b := addmod(
                    mload(add(pProof, pEval_b)),
                    mulmod(mload(add(pMem, pBeta)), mload(add(pProof, pEval_s2)), q),
                    q)
                e3b := addmod(e3b, mload(add(pMem, pGamma)), q)

                let e3c := addmod(
                    mload(add(pProof, pEval_c)),
                    mload(add(pMem, pGamma)),
                    q)

                let e3 := mulmod(mulmod(e3a, e3b, q), e3c, q)

                e3 := mulmod(e3, mload(add(pProof, pEval_zw)), q)
                e3 := mulmod(e3, mload(add(pMem, pAlpha)), q)
            
                let r0 := mod(sub(e1, e2), q)
                r0 := mod(sub(r0, e3), q)
                
                mstore(add(pMem, pEval_r0) , r0)
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

            function calculateD(pProof, pMem) {
                let p:= add(pMem, pD)
                let mIn := mload(0x40)

                g1_mulSetC(p, Qmx, Qmy, mulmod(mload(add(pProof, pEval_a)), mload(add(pProof, pEval_b)), q))
                g1_mulAccC(p, Qlx, Qly, mload(add(pProof, pEval_a)))
                g1_mulAccC(p, Qrx, Qry, mload(add(pProof, pEval_b)))
                g1_mulAccC(p, Qox, Qoy, mload(add(pProof, pEval_c)))            
                g1_mulAccC(p, Qcx, Qcy, 1)

                let val1 := addmod(
                    addmod(mload(add(pProof, pEval_a)), mload(add(pMem, pBetaXi)), q),
                    mload(add(pMem, pGamma)),
                    q)

                let val2 := addmod(
                    addmod(
                        mload(add(pProof, pEval_b)),
                        mulmod(mload(add(pMem, pBetaXi)), k1, q),
                        q),
                    mload(add(pMem, pGamma)),
                    q)

                let val3 := addmod(
                    addmod(
                        mload(add(pProof, pEval_c)),
                        mulmod(mload(add(pMem, pBetaXi)), k2, q),
                        q),
                    mload(add(pMem, pGamma)),
                    q)

                let d2a := mulmod(
                    mulmod(mulmod(val1, val2, q), val3, q),
                    mload(add(pMem, pAlpha)),
                    q
                )

                let d2b := mulmod(
                    mload(add(pMem, pEval_l1)),
                    mulmod(mload(add(pMem, pAlpha)), mload(add(pMem, pAlpha)), q),
                    q
                )

                // We'll use pF to save d2
                g1_mulAcc(
                    add(pMem, pF),
                    add(pProof, pZ),
                    addmod(addmod(d2a, d2b, q), mload(add(pMem, pU)), q))
            
                val1 := addmod(
                    addmod(
                        mload(add(pProof, pEval_a)),
                        mulmod(mload(add(pMem, pBeta)), mload(add(pProof, pEval_s1)), q),
                        q),
                    mload(add(pMem, pGamma)),
                    q)

                val2 := addmod(
                    addmod(
                        mload(add(pProof, pEval_b)),
                        mulmod(mload(add(pMem, pBeta)), mload(add(pProof, pEval_s2)), q),
                        q),
                    mload(add(pMem, pGamma)),
                    q)
    
                val3 := mulmod(
                    mulmod(mload(add(pMem, pAlpha)), mload(add(pMem, pBeta)), q),
                    mload(add(pProof, pEval_zw)), q)
    

                // We'll use pE to save d3
                g1_mulAccC(
                    add(pMem, pE),
                    S3x,
                    S3y,
                    mulmod(mulmod(val1, val2, q), val3, q))


                // We'll use pTmp to save d4
                g1_set(add(pMem, pTmp), add(pProof, pT1))
                g1_mulAcc(add(pMem, pTmp), add(pProof, pT2), add(pMem, pXin))
                let xin2 := mulmod(add(pMem, pXin), add(pMem, pXin), q)
                g1_mulAcc(add(pMem, pTmp), add(pProof, pT3), xin2)
                g1_mulAcc(add(pMem, pTmp), add(pProof, pT3), xin2)
                
                g1_mulAcc(mIn, add(pMem, pTmp), add(pMem, pZh))

                mstore(add(add(pMem, pE), 32), mod(sub(qf, mload(add(add(pMem, pE), 32))), qf))
                mstore(add(mIn, 32), mod(sub(qf, mload(add(mIn, 32))), qf))
                g1_acc(add(pMem, pD), add(pMem, pF))
                g1_acc(add(pMem, pD), add(pMem, pE))
                g1_acc(add(pMem, pD), add(pMem, mIn))
            }
            
            function calculateF(pProof, pMem) {
                let p := add(pMem, pF)

                g1_set(p, add(pMem, pD))
                g1_mulAcc(p, add(pProof, pA), mload(add(pMem, pV1)))
                g1_mulAcc(p, add(pProof, pB), mload(add(pMem, pV2)))
                g1_mulAcc(p, add(pProof, pC), mload(add(pMem, pV3)))
                g1_mulAccC(p, S1x, S1y, mload(add(pMem, pV4)))
                g1_mulAccC(p, S2x, S2y, mload(add(pMem, pV5)))            
            }
            
            function calculateE(pProof, pMem) {
                let s := mod(sub(q, mload(add(pMem, pEval_r0))), q)
                s := addmod(s, mulmod(mload(add(pProof, pEval_a)), mload(add(pMem, pV1)), q), q)
                s := addmod(s, mulmod(mload(add(pProof, pEval_b)), mload(add(pMem, pV2)), q), q)
                s := addmod(s, mulmod(mload(add(pProof, pEval_c)), mload(add(pMem, pV3)), q), q)
                s := addmod(s, mulmod(mload(add(pProof, pEval_s1)), mload(add(pMem, pV4)), q), q)
                s := addmod(s, mulmod(mload(add(pProof, pEval_s2)), mload(add(pMem, pV5)), q), q)
                s := addmod(s, mulmod(mload(add(pProof, pEval_zw)), mload(add(pMem, pU)), q), q)
                g1_mulAccC(add(pMem, pE), G1x, G1y, s)
            }
            
            function checkPairing(pProof, pMem) -> isOk {
                let mIn := mload(0x40)
                
                // A1
                g1_mulAcc(mIn, add(pProof, pWxiw), add(pMem, pU))
                g1_acc(mIn, add(pProof, pWxi))
                mstore(add(mIn, 32), mod(sub(qf, mload(add(mIn, 32))), qf))

                // [X]_2
                mstore(add(mIn,64), X2x2)
                mstore(add(mIn,96), X2x1)
                mstore(add(mIn,128), X2y2)
                mstore(add(mIn,160), X2y1)

                // B1
                g1_mulAcc(add(mIn, 192), add(pMem, pWxi), mload(add(pMem, pXi)))
                let s := mulmod(mload(mload(add(pMem, pU))), mload(mload(add(pMem, pXi))), q)
                s := mulmod(s, w1, q)
                g1_mulAcc(add(mIn, 256), add(pProof, pWxiw), s)
                g1_acc(add(mIn, 192), add(mIn, 256))
                g1_acc(add(mIn, 192), add(pMem, pF))
                g1_acc(add(mIn, 192), add(pMem, pE))

                // [1]_2
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
            calculateChallanges(proof, pMem, pubSignals)
            calculateLagrange(pMem)
            calculatePI(pMem, pubSignals)
            calculateR0(proof, pMem)
            calculateD(proof, pMem)
            calculateF(proof, pMem)
            calculateE(proof, pMem)
            let isValid := checkPairing(proof, pMem)
            
            mstore(0x40, sub(pMem, lastMem))
            mstore(0, isValid)
            return(0,0x20)
        }
        
    }
}
