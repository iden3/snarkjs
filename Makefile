#
# snarkjs -- development, build and test via make.
#
# Getting all three test layers running (Node/mocha, Hardhat, Foundry)
# takes several tools; these targets make each one a single command, and
# the nix-% pattern makes the whole thing zero-setup on any machine with
# Nix -- the flake supplies node, circom, forge and a pinned solc:
#
#     make nix-test                     # unit tests, no local toolchain needed
#     make nix-test-smart-contracts     # Hardhat on-chain tests
#     make nix-test-forge               # Foundry on-chain tests
#     make nix-test-all                 # everything
#
# Without Nix, install the tools yourself and drop the nix- prefix.
#

SHELL		= /bin/bash

# ── Top-level targets ─────────────────────────────────────────────────

.PHONY: all install build test test-file test-grep test-smart-contracts
.PHONY: test-forge test-forge-all test-all clean clean-forge distclean
.PHONY: circuits circuit-groth16 circuit-circuit2 circuit-plonk circuit-fflonk
.PHONY: verifier-preview print-%

all:			install build test

install:
	npm install --no-audit --no-fund --loglevel=error
	cd smart_contract_tests && npm install --no-audit --no-fund --loglevel=error

build:
	npm run build

# ── Tests ─────────────────────────────────────────────────────────────

# Unit / integration tests (mocha).  Covers the Powers of Tau ceremony,
# Groth16 / PLONK / FFLONK prove + off-chain verify, polynomial
# operations, and keypair derivation.
test:
	npm test

# Run a single mocha test file or grep pattern:
#   make test-file FILE=test/fullprocess.js
#   make test-grep GREP="Groth16 smart contract"
test-file:
	npx mocha $(FILE)

test-grep:
	npx mocha --grep "$(GREP)"

# Smart-contract (Hardhat) tests.  Generates a Groth16 zkey from scratch,
# exports a Solidity verifier, compiles + deploys it via Hardhat, and
# calls verifyProof() on-chain -- including a test that feeds
# `exportSolidityCallData` output straight into the exported verifier,
# pinning the calldata ABI end-to-end.
test-smart-contracts:
	cd smart_contract_tests && npm test

# On-chain verification of an exported Groth16 verifier under forge.
#
# Generates a zkey + proof from a bundled test circuit, exports the
# Solidity verifier, writes a self-contained forge test with the proof
# embedded -- packed with the same EIP-197 _pB coordinate swap that
# 'snarkjs zkey export soliditycalldata' performs -- and runs
# 'forge test'.  Forge's revm enforces the EIP-197 point encodings
# strictly, so this catches calldata-packing mistakes that off-chain
# `groth16 verify` cannot see (it never crosses the EVM ABI).
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

# Run ALL tests: unit + Hardhat + forge.
test-all:		test test-smart-contracts test-forge-all

# ── Test circuits (circom -> R1CS / WASM) ─────────────────────────────

# Most test circuits are checked in pre-compiled.  Use these targets to
# recompile after editing a .circom file.

CIRCUITS_DIR	= test
CIRCOM		= circom
CIRCOM_OPTS	= --r1cs --wasm --sym

circuits:		circuit-groth16 circuit-circuit2 circuit-plonk circuit-fflonk

circuit-groth16:
	$(CIRCOM) $(CIRCOM_OPTS) $(CIRCUITS_DIR)/groth16/circuit.circom -o $(CIRCUITS_DIR)/groth16

circuit-circuit2:
	$(CIRCOM) $(CIRCOM_OPTS) $(CIRCUITS_DIR)/circuit2/circuit.circom -o $(CIRCUITS_DIR)/circuit2

circuit-plonk:
	$(CIRCOM) $(CIRCOM_OPTS) $(CIRCUITS_DIR)/plonk_circuit/circuit.circom -o $(CIRCUITS_DIR)/plonk_circuit

circuit-fflonk:
	$(CIRCOM) $(CIRCOM_OPTS) $(CIRCUITS_DIR)/fflonk/circuit.circom -o $(CIRCUITS_DIR)/fflonk

# ── Verifier template preview ─────────────────────────────────────────

# Dry-run: generate a Groth16 verifier from the template + a fresh zkey
# and print it to stdout.  Useful for inspecting template changes.
#
#   make verifier-preview
PTAU_FILE	?= test/plonk_circuit/powersOfTau15_final.ptau
R1CS_FILE	?= test/groth16/circuit.r1cs

verifier-preview:
	@npx snarkjs zkey new $(R1CS_FILE) $(PTAU_FILE) /tmp/verifier_preview.zkey 2>/dev/null
	@npx snarkjs zkey export solidityverifier /tmp/verifier_preview.zkey /tmp/verifier_preview.sol 2>/dev/null
	@cat /tmp/verifier_preview.sol
	@rm -f /tmp/verifier_preview.zkey /tmp/verifier_preview.sol

# ── Cleanup ───────────────────────────────────────────────────────────

clean:			clean-forge
	rm -rf build cache
	rm -rf smart_contract_tests/artifacts smart_contract_tests/cache smart_contract_tests/contracts

# Remove the generated forge project artifacts (verifier, test, build output).
clean-forge:
	rm -rf forge_test/src forge_test/test forge_test/out forge_test/cache forge_test/build forge_test/lib

distclean:		clean
	rm -rf node_modules smart_contract_tests/node_modules

# ── Nix ───────────────────────────────────────────────────────────────

# Run any target inside the flake's dev shell, which supplies node,
# circom, forge and a pinned solc (so forge never downloads a compiler):
#
#     make nix-test
#     make nix-test-smart-contracts
#     make nix-test-forge
#     make nix-test-all
nix-%:
	nix develop $(NIX_OPTS) --command make $*

# Print any make variable, e.g. `make print-PTAU_FILE`.
print-%:
	@echo $* = "'$($*)'"
	@echo $*\'s origin is $(origin $*)

FORCE:
