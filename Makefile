#
# snarkjs -- make targets for on-chain verification of exported verifiers.
#
# The npm test suites are unchanged; these targets add a lightweight
# Foundry (forge) harness that proves against the bundled test circuits
# and runs the exported Solidity verifier on a real EVM (revm).
#

SHELL		= /bin/bash

.PHONY: test-forge test-forge-all clean-forge

# On-chain verification of an exported Groth16 verifier under forge.
#
# Generates a zkey + proof from a bundled test circuit, exports the
# Solidity verifier, writes a self-contained forge test with the proof
# embedded -- packed with the same EIP-197 _pB coordinate swap that
# 'snarkjs zkey export soliditycalldata' performs -- and runs
# 'forge test'.
#
# Self-contained: no submodules, no forge-std, no network access.
# Auto-skips with exit code 0 if forge is not installed.
#
#   make test-forge                            # test/groth16 circuit
#   make test-forge-all                        # test/groth16 + test/circuit2
#   make test-forge CIRCUIT_DIR=test/circuit2  # any bundled Groth16 circuit

test-forge:
	bash scripts/forge_verify_test.sh

test-forge-all:
	CIRCUIT_DIR=test/groth16   bash scripts/forge_verify_test.sh
	CIRCUIT_DIR=test/circuit2  bash scripts/forge_verify_test.sh

# Remove the generated forge project artifacts (verifier, test, build output).
clean-forge:
	rm -rf forge_test/src forge_test/test forge_test/out forge_test/cache forge_test/build forge_test/lib
