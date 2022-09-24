import {F1Field} from "ffjavascript";

export async function buildConstants(constPols) {
    const fibonacciPol = constPols.Fibonacci;
    const N = fibonacciPol.L1.length;

    for ( let i=0; i<N; i++) {
        fibonacciPol.L1[i] = (i === 0) ? 1n : 0n;
        fibonacciPol.LLAST[i] = (i === N-1) ? 1n : 0n;
    }
}


export async function execute(committedPols, input) {
    const fibonacciPol = committedPols.Fibonacci;
    const N = fibonacciPol.l1.length;

    const Fr = new F1Field("0xFFFFFFFF00000001");

    fibonacciPol.l2[0] = BigInt(input[0]);
    fibonacciPol.l1[0] = BigInt(input[1]);

    for (let i=1; i<N; i++) {
        fibonacciPol.l2[i] =fibonacciPol.l1[i-1];
        fibonacciPol.l1[i] =Fr.add(Fr.square(fibonacciPol.l2[i-1]), Fr.square(fibonacciPol.l1[i-1]));
    }

    return fibonacciPol.l1[N-1];
}