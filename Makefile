#
# snarkjs — zkSNARKs in JavaScript (Groth16, PLONK, FFLONK)
#
# Node.js / circom / Foundry-based development, test, and build.
#

SHELL		= /bin/bash

# ── Top-level targets ─────────────────────────────────────────────────

.PHONY: all install build test test-smart-contracts test-forge test-all clean
.PHONY: circuits circuit-groth16 circuit-circuit2 circuit-plonk circuit-fflonk
.PHONY: verifier-preview
.PHONY: print-%

all:			install build test

install:
	npm install --no-audit --no-fund --loglevel=error
	cd smart_contract_tests && npm install --no-audit --no-fund --loglevel=error

build:
	npm run build

# ── Tests ─────────────────────────────────────────────────────────────

# Unit / integration tests (mocha).  Covers:
#   - Powers of Tau ceremony (full process)
#   - Groth16 prove + off-chain verify
#   - PLONK prove + off-chain verify
#   - FFLONK prove + off-chain verify
#   - Polynomial operations
#   - Keypair derivation
test:
	npm test

# Run a single mocha test file or grep pattern.
#   make test-file FILE=test/fullprocess.js
#   make test-grep GREP="Groth16 smart contract"
test-file:
	npx mocha $(FILE)

test-grep:
	npx mocha --grep "$(GREP)"

# Smart-contract (Hardhat) tests.  Generates a Groth16 zkey from scratch,
# exports a Solidity verifier, compiles + deploys it via Hardhat, and
# calls verifyProof() on-chain.  This is the test that validates EIP-197
# G2 encoding is correct end-to-end.
test-smart-contracts:
	cd smart_contract_tests && npm test

# ── Forge (Foundry) EVM verification test ──────────────────────────────
#
# Lightweight on-chain verification test using Forge's built-in revm EVM
# — the SAME precompile engine that rejected the faulty G2 encoding.
#
# Auto-skips with exit code 0 if Forge is not installed.  No npm deps
# beyond snarkjs itself (no Hardhat, no ethers, no waffle).  A single
# static Foundry binary is the only external requirement.
#
#   make test-forge                  # 1-input circuit (test/groth16)
#   make test-forge-all              # both 1-input and 3-input circuits
#   make nix-test-forge              # inside Nix environment
#
# Override circuit / ptau:
#   make test-forge CIRCUIT_DIR=test/circuit2

test-forge:
	bash scripts/forge_verify_test.sh

test-forge-all:
	CIRCUIT_DIR=test/groth16   bash scripts/forge_verify_test.sh
	CIRCUIT_DIR=test/circuit2  bash scripts/forge_verify_test.sh

# Run ALL tests: off-chain unit tests + on-chain smart-contract tests.
test-all:		test test-smart-contracts

# ── Test circuits (circom → R1CS / WASM) ──────────────────────────────

# Most test circuits are checked in pre-compiled.  Use these targets to
# recompile them after editing a .circom file.
#
#   make circuits          # recompile all test circuits
#   make circuit-groth16   # recompile only the groth16 1-input circuit

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

# ── Verifier template checks ──────────────────────────────────────────

# Dry-run: generate a Groth16 verifier from the template + a zkey and
# print it to stdout.  Useful for inspecting the EIP-197 G2 encoding.
#
# Requires: make install (for snarkjs CLI), a compiled circuit, and a
# ptau file (use test/plonk_circuit/powersOfTau15_final.ptau).
#
#   make verifier-preview
PTAU_FILE	?= test/plonk_circuit/powersOfTau15_final.ptau
R1CS_FILE	?= test/groth16/circuit.r1cs

verifier-preview:
	@snarkjs zkey new $(R1CS_FILE) $(PTAU_FILE) /tmp/verifier_preview.zkey 2>/dev/null
	@snarkjs zkey export solidityverifier /tmp/verifier_preview.zkey /tmp/verifier_preview.sol 2>/dev/null
	@cat /tmp/verifier_preview.sol
	@rm -f /tmp/verifier_preview.zkey /tmp/verifier_preview.sol

# ── Cleanup ───────────────────────────────────────────────────────────

clean:
	rm -rf build cache
	rm -rf smart_contract_tests/artifacts smart_contract_tests/cache smart_contract_tests/contracts

distclean:		clean
	rm -rf node_modules smart_contract_tests/node_modules

#
# nix-...:
#
# Use a Nix flake environment to execute the make target, e.g.:
#
#     make nix-test
#     make nix-test-smart-contracts
#     make nix-test-all
#
nix-%:
	@if [ -n "$(TARGET)" ]; then \
		nix develop .#$(TARGET) $(NIX_OPTS) --command make $*; \
	else \
		nix develop $(NIX_OPTS) --command make $*; \
	fi

#
# Target to allow the printing of 'make' variables, e.g.:
#
#     make print-PTAU_FILE
#
print-%:
	@echo $* = "'$($*)'"
	@echo $*\'s origin is $(origin $*)

FORCE:
