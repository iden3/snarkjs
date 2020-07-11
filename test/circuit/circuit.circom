template Multiplier(n) {
    signal private input a;
    signal private input b;
    signal output c;
   
    signal int[n];

    int[0] <== a*a + b;
    for (var i=1; i<n; i++) {
	int[i] <== int[i-1]*int[i-1] + b;
    }

    c <== int[n-1];
}

component main = Multiplier(1000);
