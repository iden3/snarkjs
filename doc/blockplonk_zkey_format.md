# zkey format for blocklonk

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

Currently, there are 10 defined sections:

- 0x00000001 : Header section
- 0x00000002 : Block Plonk header section
- 0x00000003 : Additions section
- 0x00000004 : A map section
- 0x00000005 : K section
- 0x00000006 : Q map section
- 0x00000007 : Sigma section
- 0x00000008 : Lagrange polynomials section
- 0x00000009 : Powers of tau section

### Block Plonk ZKEY FILE FORMAT

````
     ┏━━━━━━━━━━━━━┓
     ┃ 7A 6B 65 79 ┃ Magic  "zkey"
     ┗━━━━━━━━━━━━━┛
     ┏━━━━━━━━━━━━━┓
     ┃ 01 00 00 00 ┃ Version 1
     ┗━━━━━━━━━━━━━┛
     ┏━━━━━━━━━━━━━┓
     ┃ 0A 00 00 00 ┃ Number of Sections
     ┗━━━━━━━━━━━━━┛
````


### SECTION 1. HEADER SECTION

````
     ┏━━━━━━━━━━━━━┓
     ┃ 01 00 00 00 ┃ Section Id
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ Section size
     ┣━━━━━━━━━━━━━┫
     ┃ 04 00 00 00 ┃ Block Plonk protocol ID: 4
     ┗━━━━━━━━━━━━━┛
````


### SECTION 2. Block Plonk HEADER SECTION

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
     ┃ 4 bytes     ┃ Block Plonk additions length
     ┣━━━━━━━━━━━━━┫
     ┃ 4 bytes     ┃ Block Plonk constraints length
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ k
     ┣━━━━━━━━━━━━━┫
     ┃ G1 fs bytes ┃ Q
     ┣━━━━━━━━━━━━━┫
     ┃ G1 fs bytes ┃ S
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
     ┃ 4 bytes     ┃ Signal Aω                 ┃
     ┣━━━━━━━━━━━━━┫                           ┃ Addition 1
     ┃ fs bytes    ┃ Factor signal A           ┃
     ┣━━━━━━━━━━━━━┫                           ┃
     ┃ fs bytes    ┃ Factor signal Aω          ┃
     ┗━━━━━━━━━━━━━┛                          ━┛
           ...        ...      
     ┏━━━━━━━━━━━━━┓                          ━┓
     ┃ 4 bytes     ┃ Signal A                  ┃
     ┣━━━━━━━━━━━━━┫                           ┃
     ┃ 4 bytes     ┃ Signal Aω                 ┃
     ┣━━━━━━━━━━━━━┫                           ┃ Addition {Block Plonk additions length}
     ┃ fs bytes    ┃ Factor signal A           ┃
     ┣━━━━━━━━━━━━━┫                           ┃
     ┃ fs bytes    ┃ Factor signal Aω          ┃
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
     ┃ 4 bytes     ┃ Signal A_{Block Plonk constraints length}
     ┗━━━━━━━━━━━━━┛
````


### SECTION 5. K SECTION

````
     ┏━━━━━━━━━━━━━┓
     ┃ 05 00 00 00 ┃ Section Id
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ Section size
     ┣━━━━━━━━━━━━━┫                        
     ┃ fs bytes    ┃ Value k_1
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ Value k_2
     ┗━━━━━━━━━━━━━┛
           ...        ...      
     ┏━━━━━━━━━━━━━┓
     ┃ fs bytes    ┃ Value k_{Block Plonk constraints length}
     ┗━━━━━━━━━━━━━┛
````


### SECTION 6. Q SECTION

````
     ┏━━━━━━━━━━━━━┓
     ┃ 06 00 00 00 ┃ Section Id
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ Section size
     ┣━━━━━━━━━━━━━┫                        
     ┃ fs bytes    ┃ Q coefficient_1
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ Q coefficient_2
     ┗━━━━━━━━━━━━━┛  
           ...        ...      
     ┏━━━━━━━━━━━━━┓
     ┃ fs bytes    ┃ Q coefficient_{Domain size}
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ Q evaluation_1
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ Q evaluation_2
     ┗━━━━━━━━━━━━━┛  
           ...        ...      
     ┏━━━━━━━━━━━━━┓
     ┃ fs bytes    ┃ Q evaluation_{4 * Domain size}
     ┗━━━━━━━━━━━━━┛
````

### SECTION 7. SIGMA SECTION

````
     ┏━━━━━━━━━━━━━┓
     ┃ 07 00 00 00 ┃ Section Id
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ Section size
     ┣━━━━━━━━━━━━━┫                                     ━┓
     ┃ fs bytes    ┃ Sigma coefficient_1                  ┃
     ┣━━━━━━━━━━━━━┫                                      ┃
     ┃ fs bytes    ┃ Sigma coefficient_2                  ┃
     ┗━━━━━━━━━━━━━┛                                      ┃  Sigma coefficients
           ...        ...                                 ┃
     ┏━━━━━━━━━━━━━┓                                      ┃
     ┃ fs bytes    ┃ Sigma coefficient_{Domain size}      ┃
     ┣━━━━━━━━━━━━━┫                                     ━┫
     ┃ fs bytes    ┃ Sigma evaluation_1                   ┃
     ┣━━━━━━━━━━━━━┫                                      ┃
     ┃ fs bytes    ┃ Sigma evaluation_2                   ┃
     ┗━━━━━━━━━━━━━┛                                      ┃  Sigma evaluations
           ...        ...                                 ┃
     ┏━━━━━━━━━━━━━┓                                      ┃
     ┃ fs bytes    ┃ Sigma evaluation_{4 * Domain size}   ┃
     ┗━━━━━━━━━━━━━┛                                     ━┛
````


### SECTION 8. LAGRANGE POLYNOMIALS SECTION

````
     ┏━━━━━━━━━━━━━┓
     ┃ 08 00 00 00 ┃ Section Id
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


### SECTION 9. POWERS OF TAU SECTION

````
     ┏━━━━━━━━━━━━━┓
     ┃ 0A 00 00 00 ┃ Section Id
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
