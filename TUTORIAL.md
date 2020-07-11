### Install snarkjs and circom
```sh
npm install -g circom
npm install -g snarkjs
```

### Help

```sh
snarkjs
```

In commands that takes long time, you can add the -v or --verbose option to see the progress.



### Start a new ceremony.

```sh
snarkjs powersoftau new bn128 12 pot12_0000.ptau
```

### Contribute in the ceremony
```sh
snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="Example Name" -v
```

### Do a second contribution
```sh
snarkjs powersoftau contribute pot12_0001.ptau pot12_0002.ptau --name="Second contribution Name" -v
```


### Verify the file
```sh
snarkjs powersoftau verify pot12_0002.ptau
```


### Contribute using ther party software.

```sh
snarkjs powersoftau export challange pot12_0002.ptau challange_0003
snarkjs powersoftau challange contribute bn128 challange_0003 response_0003
snarkjs powersoftau import response pot12_0002.ptau response_0003 pot12_0003.ptau -n="Third contribution name"
```


### Add a beacon
```sh
snarkjs powersoftau beacon pot12_0003.ptau pot12_beacon.ptau 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon"
```

### Prepare phase2
```sh
powersoftau prepare phase2 pot12_beacon.ptau pot12_final.ptau -v
```

### Verify the last file
```sh
snarkjs powersoftau verify pot12_final.ptau
```

### Create a circuit
```sh
mkdir mycircuit
cd my mycircuit
cat <<EOT > circuit.circom
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
EOT
```

### compile the circuit
```sh
circom circuit.circom -r -w -s -v
```

### info of a circuit
```sh
snarkjs r1cs info circuit.r1cs
```

### Print the constraints
```sh
snarkjs r1cs print circuit.r1cs
```

### export r1cs to json
```sh
snarkjs r1cs export json circuit.r1cs circuit.r1cs.json
```


### Generate the reference zKey without contributions from the circuit.
```sh
snarkjs zkey new circuit.r1cs pot12_final.ptau circuit_0000.zkey
```


### Contribute in the phase2 ceremony
```sh
snarkjs zkey contribute circuit_0000.zkey circuit_0001.zkey --name="1st Contributor Name" -v
```

### Do a second phase2 contribution
```sh
snarkjs zkey contribute circuit_0001.zkey circuit_0002.zkey --name="Second contribution Name" -v
```


### Verify the zkey file
```sh
snarkjs zkey verify circuit.r1cs pot12_final.ptau circuit_0002.zkey
```


### Contribute using ther party software.

```sh
snarkjs zkey export bellman circuit_0002.zkey  challange_phase2_0003
snarkjs zkey bellman contribute bn128 challange_phase2_0003 response_phase2_0003
snarkjs zkey import bellman circuit_0002.zkey response_phase2_0003 circuit_0003.zkey -n="Third contribution name"
```


### Add a beacon
```sh
snarkjs zkey beacon circuit_0003.zkey circuit_final.zkey 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon phase2"
```

### Verify the final file
```sh
snarkjs zkey verify circuit.r1cs pot12_final.ptau circuit_final.zkey
```

### Export the verification key
```sh
snarkjs zkey export verificationkey circuit_final.zkey verification_key.json
```

### Calculat witess
```sh
cat <<EOT > input.json
{"a": 3, "b": 11}
EOT
snarkjs wtns calculate circuit.wasm input.json witness.wtns
```


### Debug witness calculation

En general when you are developing a new circuit you will want to check for some errors in the witness calculation process.

You can do it by doing
```sh
snarkjs wtns debug circuit.wasm input.json witness.wtns circuit.sym --trigger --get --set
```

This will log every time a new component is started/ended ( --trigger ) when a signal is set (--set) and when it's get (--get)


### Proof calculation
```sh
snarkjs groth16 prove circuit_final.zkey witness.wtns proof.json public.json
```

It is possible also to do the calculate witness and the prove calculation in the same command:
```sh
snarkjs groth16 fullprove input.json circuit.wasm circuit_final.zkey proof.json public.json
```


### Verify
```sh
snarkjs groth16 verify verification_key.json public.json proof.json
```

### Export Solidity Verifier
```sh
snarkjs zkey export solidityverifier circuit_final.zkey verifier.sol
```

You can deploy th "Verifier" smartcontract using remix for example.

In order to simulate a verification call, you can do:

```sh
zkey export soliditycalldata public.json proof.json
```

And cut and paste the resolt directlly in the "verifyProof" field in the deployed smart contract.

This call will return true if the proof and the public data is valid.




