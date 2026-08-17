pragma circom 2.0.0;

// A circuit deliberately mixing multiplicative and purely LINEAR constraints.
// Linear constraints (c <== a + b) compile to R1CS rows with EMPTY A and B
// (0*0 = C form) -- kept only when optimization is disabled (--O0).
template Gap(n) {
    signal input a;
    signal input b;
    signal output out;

    signal m[n];
    signal l[n];

    m[0] <== a * b;
    l[0] <== a + b;
    for (var i = 1; i < n; i++) {
        m[i] <== m[i-1] * a;      // multiplicative row
        l[i] <== l[i-1] + m[i];   // linear row (no multiplication)
    }
    out <== m[n-1] + l[n-1];
}

component main = Gap(8);
