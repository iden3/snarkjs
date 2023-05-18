template Multiplier(n) {
    signal input a;
    signal input b;
    signal input c;
    signal output d;
   
    signal int[n];

    int[0] <== a * a + b * 2 + c + 3;
    for (var i = 1; i < n; i++) {
	    int[i] <== int[i-1] * int[i-1] + b + 4;
    }

    d <== int[n-1];
}

component main {public [a, b, c]} = Multiplier(1000);
