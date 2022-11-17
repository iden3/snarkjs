# zkey format for babyplonk

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
- 0x00000002 : Baby Plonk header section
- 0x00000003 : Additions section
- 0x00000004 : A map section
- 0x00000005 : B map section
- 0x00000006 : K section
- 0x00000007 : Q1 map section
- 0x00000008 : Q2 map section
- 0x00000009 : Sigma section
- 0x0000000A : Lagrange polynomials section
- 0x0000000B : Powers of tau section

### BABY PLONK ZKEY FILE FORMAT

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
     ┃ 03 00 00 00 ┃ Baby Plonk protocol ID: 3
     ┗━━━━━━━━━━━━━┛
````


### SECTION 2. BABY PLONK HEADER SECTION

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
     ┃ 4 bytes     ┃ Baby Plonk additions length
     ┣━━━━━━━━━━━━━┫
     ┃ 4 bytes     ┃ Baby Plonk constraints length
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ k1
     ┣━━━━━━━━━━━━━┫
     ┃ G1 fs bytes ┃ Q1
     ┣━━━━━━━━━━━━━┫
     ┃ G1 fs bytes ┃ Q2
     ┣━━━━━━━━━━━━━┫
     ┃ G1 fs bytes ┃ S1
     ┣━━━━━━━━━━━━━┫
     ┃ G1 fs bytes ┃ S2
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
     ┣━━━━━━━━━━━━━┫                           ┃ Addition {Baby Plonk additions length}
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
     ┃ 4 bytes     ┃ Signal A_{Baby Plonk constraints length}
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
     ┃ 4 bytes     ┃ Signal B_{Baby Plonk constraints length}
     ┗━━━━━━━━━━━━━┛
````


### SECTION 6. K SECTION

````
     ┏━━━━━━━━━━━━━┓
     ┃ 06 00 00 00 ┃ Section Id
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ Section size
     ┣━━━━━━━━━━━━━┫                        
     ┃ fs bytes    ┃ Value k_1
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ Value k_2
     ┗━━━━━━━━━━━━━┛
           ...        ...      
     ┏━━━━━━━━━━━━━┓
     ┃ fs bytes    ┃ Value k_{Baby Plonk constraints length}
     ┗━━━━━━━━━━━━━┛
````


### SECTION 7. Q1 SECTION

````
     ┏━━━━━━━━━━━━━┓
     ┃ 07 00 00 00 ┃ Section Id
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ Section size
     ┣━━━━━━━━━━━━━┫                        
     ┃ fs bytes    ┃ Q1 coefficient_1
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ Q1 coefficient_2
     ┗━━━━━━━━━━━━━┛  
           ...        ...      
     ┏━━━━━━━━━━━━━┓
     ┃ fs bytes    ┃ Q1 coefficient_{Domain size}
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ Q1 evaluation_1
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ Q1 evaluation_2
     ┗━━━━━━━━━━━━━┛  
           ...        ...      
     ┏━━━━━━━━━━━━━┓
     ┃ fs bytes    ┃ Q1 evaluation_{4 * Domain size}
     ┗━━━━━━━━━━━━━┛
````

### SECTION 8. Q2 SECTION

````
     ┏━━━━━━━━━━━━━┓
     ┃ 08 00 00 00 ┃ Section Id
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ Section size
     ┣━━━━━━━━━━━━━┫                        
     ┃ fs bytes    ┃ Q2 coefficient_1
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ Q2 coefficient_2
     ┗━━━━━━━━━━━━━┛  
           ...        ...      
     ┏━━━━━━━━━━━━━┓
     ┃ fs bytes    ┃ Q2 coefficient_{Domain size}
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ Q2 evaluation_1
     ┣━━━━━━━━━━━━━┫
     ┃ fs bytes    ┃ Q2 evaluation_2
     ┗━━━━━━━━━━━━━┛  
           ...        ...      
     ┏━━━━━━━━━━━━━┓
     ┃ fs bytes    ┃ Q2 evaluation_{4 * Domain size}
     ┗━━━━━━━━━━━━━┛
````


### SECTION 9. SIGMA SECTION

````
     ┏━━━━━━━━━━━━━┓
     ┃ 09 00 00 00 ┃ Section Id
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
     ┗━━━━━━━━━━━━━┛                                     ━┛
````


### SECTION 10. LAGRANGE POLYNOMIALS SECTION

````
     ┏━━━━━━━━━━━━━┓
     ┃ 0A 00 00 00 ┃ Section Id
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


### SECTION 11. POWERS OF TAU SECTION

````
     ┏━━━━━━━━━━━━━┓
     ┃ 0B 00 00 00 ┃ Section Id
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
