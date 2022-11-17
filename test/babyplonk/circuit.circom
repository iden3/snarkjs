template TestPlonk() {
    signal input a;
    signal private input b;
    signal output c;
   
    signal i1;
    signal i2;
    signal i4;

    i1 <== a+b+3;

    i2 <== i1*i1;
    i4 <== i2*i2;
    c <== i1*i4;
}

component main = TestPlonk();
