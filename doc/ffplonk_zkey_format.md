# zkey format for fflonk

````

     ┏━━━━┳━━━━━━━━━━━━━━━━━┓
     ┃ 4  ┃   7A 6B 65 79   ┃     Magic  "zkey"
     ┗━━━━┻━━━━━━━━━━━━━━━━━┛
     ┏━━━━┳━━━━━━━━━━━━━━━━━┓
     ┃ 4  ┃   01 00 00 00   ┃       Version 1
     ┗━━━━┻━━━━━━━━━━━━━━━━━┛
     ┏━━━━┳━━━━━━━━━━━━━━━━━┓
     ┃ 4  ┃   0A 00 00 00   ┃       Number of Sections
     ┗━━━━┻━━━━━━━━━━━━━━━━━┛
     ┏━━━━┳━━━━━━━━━━━━━━━━━┳━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━┓
     ┃ 4  ┃ sectionType     ┃  8  ┃   SectionSize          ┃
     ┗━━━━┻━━━━━━━━━━━━━━━━━┻━━━━━┻━━━━━━━━━━━━━━━━━━━━━━━━┛
     ┏━━━━━━━━━━━━━━━━━━━━━┓
     ┃                     ┃
     ┃                     ┃
     ┃                     ┃
     ┃  Section Content    ┃
     ┃                     ┃
     ┃                     ┃
     ┃                     ┃
     ┗━━━━━━━━━━━━━━━━━━━━━┛
     ...
     ...
     ...
````

### Sections

Currently, there are 14 defined sections:

- 0x00000001 : Header section
- 0x00000002 : FFLONK header section
- 0x00000003 : Additions section
- 0x00000004 : A map section
- 0x00000005 : B map section
- 0x00000006 : C map section
- 0x00000007 : QL section
- 0x00000008 : QR section
- 0x00000009 : QM section
- 0x0000000A : QO section
- 0x0000000B : QC section
- 0x0000000C : Sigma section
- 0x0000000D : Lagrange polynomials section
- 0x0000000E : Powers of tau section

### FFLONK ZKEY FILE FORMAT

````
     ┏━━━━━━━━━━━━━┓
     ┃ 7A 6B 65 79 ┃ Magic  "zkey"
     ┗━━━━━━━━━━━━━┛
     ┏━━━━━━━━━━━━━┓
     ┃ 01 00 00 00 ┃ Version 1
     ┗━━━━━━━━━━━━━┛
     ┏━━━━━━━━━━━━━┓
     ┃ 0E 00 00 00 ┃ Number of Sections
     ┗━━━━━━━━━━━━━┛
````


### SECTION 1. HEADER SECTION

````
     ┏━━━━━━━━━━━━━┓
     ┃ 01 00 00 00 ┃ Section Id
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ Section size
     ┣━━━━━━━━━━━━━┫
     ┃ 0A 00 00 00 ┃ FFlonk protocol ID: 10
     ┗━━━━━━━━━━━━━┛
````


### SECTION 2. FFLONK HEADER SECTION

````
     ┏━━━━━━━━━━━━━┓
     ┃ 02 00 00 00 ┃ Section Id
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ Section size
     ┣━━━━━━━━━━━━━┫
     ┃ 4 bytes     ┃ Prime Q size in bytes
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ Prime Q
     ┣━━━━━━━━━━━━━┫
     ┃ 4 bytes     ┃ Prime R size in bytes
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ Prime R
     ┣━━━━━━━━━━━━━┫
     ┃ 4 bytes     ┃ Number of variables
     ┣━━━━━━━━━━━━━┫
     ┃ 4 bytes     ┃ Number of public variables (outputs + public inputs)
     ┣━━━━━━━━━━━━━┫
     ┃ 4 bytes     ┃ Domain size
     ┣━━━━━━━━━━━━━┫
     ┃ 4 bytes     ┃ FFlonk additions length
     ┣━━━━━━━━━━━━━┫
     ┃ 4 bytes     ┃ FFlonk constraints length
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ k1
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ k2
     ┣━━━━━━━━━━━━━┫
     ┃ G1 fs bytes ┃ QL
     ┣━━━━━━━━━━━━━┫
     ┃ G1 fs bytes ┃ QR
     ┣━━━━━━━━━━━━━┫
     ┃ G1 fs bytes ┃ QM
     ┣━━━━━━━━━━━━━┫
     ┃ G1 fs bytes ┃ QO
     ┣━━━━━━━━━━━━━┫
     ┃ G1 fs bytes ┃ QC
     ┣━━━━━━━━━━━━━┫
     ┃ G1 fs bytes ┃ S1
     ┣━━━━━━━━━━━━━┫
     ┃ G1 fs bytes ┃ S2
     ┣━━━━━━━━━━━━━┫
     ┃ G1 fs bytes ┃ S3
     ┣━━━━━━━━━━━━━┫
     ┃ G2 fs bytes ┃ X2
     ┗━━━━━━━━━━━━━┛
````

### SECTION 3. ADDITIONS SECTION

````
     ┏━━━━━━━━━━━━━┓
     ┃ 03 00 00 00 ┃ Section Id
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ Section size
     ┣━━━━━━━━━━━━━┫                          ━┓
     ┃ 4 bytes     ┃ Signal A                  ┃
     ┣━━━━━━━━━━━━━┫                           ┃
     ┃ 4 bytes     ┃ Signal B                  ┃
     ┣━━━━━━━━━━━━━┫                           ┃ Addition 1
     ┃ fs bytes    ┃ Factor signal A           ┃
     ┣━━━━━━━━━━━━━┫                           ┃
     ┃ fs bytes    ┃ Factor signal B           ┃
     ┗━━━━━━━━━━━━━┛                          ━┛
           ...        ...      
     ┏━━━━━━━━━━━━━┓                          ━┓
     ┃ 4 bytes     ┃ Signal A                  ┃
     ┣━━━━━━━━━━━━━┫                           ┃
     ┃ 4 bytes     ┃ Signal B                  ┃
     ┣━━━━━━━━━━━━━┫                           ┃ Addition {FFLONK additions length}
     ┃ fs bytes    ┃ Factor signal A           ┃
     ┣━━━━━━━━━━━━━┫                           ┃
     ┃ fs bytes    ┃ Factor signal B           ┃
     ┗━━━━━━━━━━━━━┛                          ━┛
````


### SECTION 4. A MAP SECTION

````
     ┏━━━━━━━━━━━━━┓
     ┃ 04 00 00 00 ┃ Section Id
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ Section size
     ┣━━━━━━━━━━━━━┫                        
     ┃ 4 bytes     ┃ Signal A_1
     ┣━━━━━━━━━━━━━┫
     ┃ 4 bytes     ┃ Signal A_2
     ┗━━━━━━━━━━━━━┛
           ...        ...      
     ┏━━━━━━━━━━━━━┓
     ┃ 4 bytes     ┃ Signal A_{FFLONK constraints length}
     ┗━━━━━━━━━━━━━┛
````


### SECTION 5. B MAP SECTION

````
     ┏━━━━━━━━━━━━━┓
     ┃ 05 00 00 00 ┃ Section Id
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ Section size
     ┣━━━━━━━━━━━━━┫                        
     ┃ 4 bytes     ┃ Signal B_1
     ┣━━━━━━━━━━━━━┫
     ┃ 4 bytes     ┃ Signal B_2
     ┗━━━━━━━━━━━━━┛
           ...        ...      
     ┏━━━━━━━━━━━━━┓
     ┃ 4 bytes     ┃ Signal B_{FFLONK constraints length}
     ┗━━━━━━━━━━━━━┛
````


### SECTION 6. C MAP SECTION

````
     ┏━━━━━━━━━━━━━┓
     ┃ 06 00 00 00 ┃ Section Id
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ Section size
     ┣━━━━━━━━━━━━━┫                        
     ┃ 4 bytes     ┃ Signal C_1
     ┣━━━━━━━━━━━━━┫
     ┃ 4 bytes     ┃ Signal C_2
     ┗━━━━━━━━━━━━━┛
           ...        ...      
     ┏━━━━━━━━━━━━━┓
     ┃ 4 bytes     ┃ Signal C_{FFLONK constraints length}
     ┗━━━━━━━━━━━━━┛
````


### SECTION 7. QL SECTION

````
     ┏━━━━━━━━━━━━━┓
     ┃ 07 00 00 00 ┃ Section Id
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ Section size
     ┣━━━━━━━━━━━━━┫                        
     ┃ fs bytes    ┃ QL coefficient_1
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ QL coefficient_2
     ┗━━━━━━━━━━━━━┛  
           ...        ...      
     ┏━━━━━━━━━━━━━┓
     ┃ fs bytes    ┃ QL coefficient_{Domain size}
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ QL evaluation_1
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ QL evaluation_2
     ┗━━━━━━━━━━━━━┛  
           ...        ...      
     ┏━━━━━━━━━━━━━┓
     ┃ fs bytes    ┃ QL evaluation_{4 * Domain size}
     ┗━━━━━━━━━━━━━┛
````

### SECTION 8. QR SECTION

````
     ┏━━━━━━━━━━━━━┓
     ┃ 08 00 00 00 ┃ Section Id
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ Section size
     ┣━━━━━━━━━━━━━┫                        
     ┃ fs bytes    ┃ QR coefficient_1
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ QR coefficient_2
     ┗━━━━━━━━━━━━━┛  
           ...        ...      
     ┏━━━━━━━━━━━━━┓
     ┃ fs bytes    ┃ QR coefficient_{Domain size}
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ QR evaluation_1
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ QR evaluation_2
     ┗━━━━━━━━━━━━━┛  
           ...        ...      
     ┏━━━━━━━━━━━━━┓
     ┃ fs bytes    ┃ QR evaluation_{4 * Domain size}
     ┗━━━━━━━━━━━━━┛
````


### SECTION 9. QM SECTION

````
     ┏━━━━━━━━━━━━━┓
     ┃ 09 00 00 00 ┃ Section Id
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ Section size
     ┣━━━━━━━━━━━━━┫                        
     ┃ fs bytes    ┃ QM coefficient_1
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ QM coefficient_2
     ┗━━━━━━━━━━━━━┛  
           ...        ...      
     ┏━━━━━━━━━━━━━┓
     ┃ fs bytes    ┃ QM coefficient_{Domain size}
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ QM evaluation_1
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ QM evaluation_2
     ┗━━━━━━━━━━━━━┛  
           ...        ...      
     ┏━━━━━━━━━━━━━┓
     ┃ fs bytes    ┃ QM evaluation_{4 * Domain size}
     ┗━━━━━━━━━━━━━┛
````


### SECTION 10. QO SECTION

````
     ┏━━━━━━━━━━━━━┓
     ┃ 0A 00 00 00 ┃ Section Id
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ Section size
     ┣━━━━━━━━━━━━━┫                        
     ┃ fs bytes    ┃ QO coefficient_1
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ QO coefficient_2
     ┗━━━━━━━━━━━━━┛  
           ...        ...      
     ┏━━━━━━━━━━━━━┓
     ┃ fs bytes    ┃ QO coefficient_{Domain size}
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ QO evaluation_1
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ QO evaluation_2
     ┗━━━━━━━━━━━━━┛  
           ...        ...      
     ┏━━━━━━━━━━━━━┓
     ┃ fs bytes    ┃ QO evaluation_{4 * Domain size}
     ┗━━━━━━━━━━━━━┛
````


### SECTION 11. QC SECTION

````
     ┏━━━━━━━━━━━━━┓
     ┃ 0B 00 00 00 ┃ Section Id
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ Section size
     ┣━━━━━━━━━━━━━┫                        
     ┃ fs bytes    ┃ QC coefficient_1
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ QC coefficient_2
     ┗━━━━━━━━━━━━━┛  
           ...        ...      
     ┏━━━━━━━━━━━━━┓
     ┃ fs bytes    ┃ QC coefficient_{Domain size}
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ QC evaluation_1
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ QC evaluation_2
     ┗━━━━━━━━━━━━━┛  
           ...        ...      
     ┏━━━━━━━━━━━━━┓
     ┃ fs bytes    ┃ QC evaluation_{4 * Domain size}
     ┗━━━━━━━━━━━━━┛
````


### SECTION 12. SIGMA SECTION

````
     ┏━━━━━━━━━━━━━┓
     ┃ 0C 00 00 00 ┃ Section Id
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ Section size
     ┣━━━━━━━━━━━━━┫                                     ━┓
     ┃ fs bytes    ┃ Sigma 1 coefficient_1                ┃
     ┣━━━━━━━━━━━━━┫                                      ┃
     ┃ fs bytes    ┃ Sigma 1 coefficient_2                ┃
     ┗━━━━━━━━━━━━━┛                                      ┃  Sigma 1 coefficients
           ...        ...                                 ┃
     ┏━━━━━━━━━━━━━┓                                      ┃
     ┃ fs bytes    ┃ Sigma 1 coefficient_{Domain size}    ┃
     ┣━━━━━━━━━━━━━┫                                     ━┫
     ┃ fs bytes    ┃ Sigma 1 evaluation_1                 ┃
     ┣━━━━━━━━━━━━━┫                                      ┃
     ┃ fs bytes    ┃ Sigma 1 evaluation_2                 ┃
     ┗━━━━━━━━━━━━━┛                                      ┃  Sigma 1 evaluations
           ...        ...                                 ┃
     ┏━━━━━━━━━━━━━┓                                      ┃
     ┃ fs bytes    ┃ Sigma 1 evaluation_{4 * Domain size} ┃
     ┣━━━━━━━━━━━━━┫                                     ━┫
     ┃ fs bytes    ┃ Sigma 2 coefficient_1                ┃
     ┣━━━━━━━━━━━━━┫                                      ┃
     ┃ fs bytes    ┃ Sigma 2 coefficient_2                ┃
     ┗━━━━━━━━━━━━━┛                                      ┃  Sigma 2 coefficients
           ...        ...                                 ┃
     ┏━━━━━━━━━━━━━┓                                      ┃
     ┃ fs bytes    ┃ Sigma 2 coefficient_{Domain size}    ┃
     ┣━━━━━━━━━━━━━┫                                     ━┫
     ┃ fs bytes    ┃ Sigma 2 evaluation_1                 ┃
     ┣━━━━━━━━━━━━━┫                                      ┃
     ┃ fs bytes    ┃ Sigma 2 evaluation_2                 ┃
     ┗━━━━━━━━━━━━━┛                                      ┃  Sigma 2 evaluations
           ...        ...                                 ┃
     ┏━━━━━━━━━━━━━┓                                      ┃
     ┃ fs bytes    ┃ Sigma 2 evaluation_{4 * Domain size} ┃
     ┣━━━━━━━━━━━━━┫                                     ━┫
     ┃ fs bytes    ┃ Sigma 3 coefficient_1                ┃
     ┣━━━━━━━━━━━━━┫                                      ┃
     ┃ fs bytes    ┃ Sigma 3 coefficient_2                ┃
     ┗━━━━━━━━━━━━━┛                                      ┃  Sigma 3 coefficients
           ...        ...                                 ┃
     ┏━━━━━━━━━━━━━┓                                      ┃
     ┃ fs bytes    ┃ Sigma 3 coefficient_{Domain size}    ┃
     ┣━━━━━━━━━━━━━┫                                     ━┫
     ┃ fs bytes    ┃ Sigma 3 evaluation_1                 ┃
     ┣━━━━━━━━━━━━━┫                                      ┃
     ┃ fs bytes    ┃ Sigma 3 evaluation_2                 ┃
     ┗━━━━━━━━━━━━━┛                                      ┃  Sigma 3 evaluations
           ...        ...                                 ┃
     ┏━━━━━━━━━━━━━┓                                      ┃
     ┃ fs bytes    ┃ Sigma 3 evaluation_{4 * Domain size} ┃
     ┗━━━━━━━━━━━━━┛                                     ━┛
````


### SECTION 13. LAGRANGE POLYNOMIALS SECTION

````
     ┏━━━━━━━━━━━━━┓
     ┃ 0D 00 00 00 ┃ Section Id
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ Section size
     ┣━━━━━━━━━━━━━┫                                                 ━┓
     ┃ fs bytes    ┃ Lagrange polynomial coefficient_1                ┃
     ┣━━━━━━━━━━━━━┫                                                  ┃
     ┃ fs bytes    ┃ Lagrange polynomial coefficient_2                ┃
     ┗━━━━━━━━━━━━━┛                                                  ┃  Lagrange polynomial 1 coefficients
           ...        ...                                             ┃
     ┏━━━━━━━━━━━━━┓                                                  ┃
     ┃ fs bytes    ┃ Lagrange polynomial coefficient_{Domain size}    ┃
     ┣━━━━━━━━━━━━━┫                                                 ━┫
     ┃ fs bytes    ┃ Lagrange polynomial evaluation_1                 ┃
     ┣━━━━━━━━━━━━━┫                                                  ┃
     ┃ fs bytes    ┃ Lagrange polynomial evaluation_2                 ┃
     ┗━━━━━━━━━━━━━┛                                                  ┃  Lagrange polynomial 1 evaluations
           ...        ...                                             ┃
     ┏━━━━━━━━━━━━━┓                                                  ┃
     ┃ fs bytes    ┃ Lagrange polynomial evaluation_{4 * Domain size} ┃
     ┗━━━━━━━━━━━━━┛                                                 ━┛
           ...        ...                                                ...
     ┏━━━━━━━━━━━━━┓                                                 ━┓
     ┃ fs bytes    ┃ Lagrange polynomial coefficient_1                ┃
     ┣━━━━━━━━━━━━━┫                                                  ┃
     ┃ fs bytes    ┃ Lagrange polynomial coefficient_2                ┃
     ┗━━━━━━━━━━━━━┛                                                  ┃  Lagrange polynomial {N public variables}
           ...        ...                                             ┃  coefficients
     ┏━━━━━━━━━━━━━┓                                                  ┃
     ┃ fs bytes    ┃ Lagrange polynomial coefficient_{Domain size}    ┃
     ┣━━━━━━━━━━━━━┫                                                 ━┫
     ┃ fs bytes    ┃ Lagrange polynomial evaluation_1                 ┃
     ┣━━━━━━━━━━━━━┫                                                  ┃
     ┃ fs bytes    ┃ Lagrange polynomial evaluation_2                 ┃
     ┗━━━━━━━━━━━━━┛                                                  ┃  Lagrange polynomial {N public variables}
           ...        ...                                             ┃  evaluations
     ┏━━━━━━━━━━━━━┓                                                  ┃
     ┃ fs bytes    ┃ Lagrange polynomial evaluation_{4 * Domain size} ┃
     ┗━━━━━━━━━━━━━┛                                                 ━┛
````


### SECTION 14. POWERS OF TAU SECTION

````
     ┏━━━━━━━━━━━━━┓
     ┃ 0E 00 00 00 ┃ Section Id
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ Section size
     ┣━━━━━━━━━━━━━┫
     ┃ G1 fs bytes ┃ Powers of Tau_1
     ┣━━━━━━━━━━━━━┫
     ┃ G1 fs bytes ┃ Powers of Tau_2
     ┗━━━━━━━━━━━━━┛  
           ...        ...      
     ┏━━━━━━━━━━━━━┓
     ┃ G1 fs bytes ┃ Powers of Tau_{Domain size + 5}
     ┗━━━━━━━━━━━━━┛
````
