#!/usr/bin/env bash
#
# forge_verify_test.sh -- On-chain verification of an exported Groth16
# verifier under Foundry's forge.
#
# End to end: generates a zkey and proof from a bundled test circuit,
# exports the Solidity verifier with 'snarkjs zkey export
# solidityverifier', writes a self-contained forge test with the proof
# embedded, and runs it on forge's built-in EVM (revm) -- a real
# implementation of the bn254 precompiles, independent of snarkjs.
#
# The generated test packs verifyProof()'s _pB argument in EIP-197
# order ([x_im, x_re, y_im, y_re]) -- the same caller-side coordinate
# swap that 'snarkjs zkey export soliditycalldata' performs -- so it
# also pins the calldata convention the exported verifier expects.
#
# Self-contained: the generated test's only import is the verifier
# itself.  No forge-std, no submodules, no network access.
#
# Auto-skips (exit 0) if forge is not installed:
#   SKIP: forge not found in PATH
#
# Usage:
#   bash scripts/forge_verify_test.sh
#   CIRCUIT_DIR=test/circuit2 bash scripts/forge_verify_test.sh
#
# Environment:
#   FORGE_TEST_DIR    forge project root (default: forge_test/)
#   PTAU_FILE         Powers of Tau file (default: test/plonk_circuit/powersOfTau15_final.ptau)
#   CIRCUIT_DIR       circuit + witness directory (default: test/groth16)
#   VERBOSE           set to 1 to show snarkjs/forge output in full

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# -- Configuration -----------------------------------------------------

FORGE_TEST_DIR="${FORGE_TEST_DIR:-$REPO_ROOT/forge_test}"
PTAU_FILE="${PTAU_FILE:-$REPO_ROOT/test/plonk_circuit/powersOfTau15_final.ptau}"
CIRCUIT_DIR="${CIRCUIT_DIR:-$REPO_ROOT/test/groth16}"
VERBOSE="${VERBOSE:-0}"

R1CS_FILE="$CIRCUIT_DIR/circuit.r1cs"
WTNS_FILE="${WTNS_FILE:-$CIRCUIT_DIR/witness.wtns}"
INPUT_JSON="$CIRCUIT_DIR/input.json"

# Temp files
ZKEY_FILE="$(mktemp "${TMPDIR:-/tmp}/forge_verify_zkey.XXXXXX")"
PROOF_FILE="$(mktemp "${TMPDIR:-/tmp}/forge_verify_proof.XXXXXX")"
PUBLIC_FILE="$(mktemp "${TMPDIR:-/tmp}/forge_verify_public.XXXXXX")"

cleanup() {
    rm -f "$ZKEY_FILE" "$PROOF_FILE" "$PUBLIC_FILE"
}
trap cleanup EXIT

# -- Colour helpers ----------------------------------------------------

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass_msg() { echo -e "${GREEN}PASS${NC} $*"; }
fail_msg() { echo -e "${RED}FAIL${NC} $*"; }
skip_msg() { echo -e "${YELLOW}SKIP${NC} $*"; }
info_msg() { echo "INFO  $*"; }

# Run a command, suppressing its stderr unless VERBOSE=1.
quiet() {
    if [ "$VERBOSE" = "1" ]; then
        "$@"
    else
        "$@" 2>/dev/null
    fi
}

# -- Pre-flight --------------------------------------------------------

# Find the snarkjs CLI.  npm only creates the bin symlink where snarkjs
# is installed as a dependency (e.g. smart_contract_tests), not in the
# package's own node_modules/.bin; fall back to the source cli.js,
# which is an ES module that runs without any build step.
if [ -x "$REPO_ROOT/smart_contract_tests/node_modules/.bin/snarkjs" ]; then
    SNARKJS=("$REPO_ROOT/smart_contract_tests/node_modules/.bin/snarkjs")
elif [ -x "$REPO_ROOT/node_modules/.bin/snarkjs" ]; then
    SNARKJS=("$REPO_ROOT/node_modules/.bin/snarkjs")
else
    SNARKJS=(node "$REPO_ROOT/cli.js")
fi

for f in "$R1CS_FILE" "$PTAU_FILE"; do
    if [ ! -f "$f" ]; then
        fail_msg "missing required file: $f"
        exit 1
    fi
done

check_forge() {
    command -v forge >/dev/null 2>&1
}

# Generate the witness if the circuit ships without one.
ensure_witness() {
    if [ -f "$WTNS_FILE" ]; then
        return 0
    fi
    local wasm_file=""
    for w in "$CIRCUIT_DIR/circuit.wasm" "$CIRCUIT_DIR/circuit_js/circuit.wasm"; do
        if [ -f "$w" ]; then
            wasm_file="$w"
            break
        fi
    done
    if [ ! -f "$INPUT_JSON" ] || [ -z "$wasm_file" ]; then
        fail_msg "no witness ($WTNS_FILE) and cannot generate one (need $INPUT_JSON and circuit.wasm)"
        exit 1
    fi
    info_msg "generating witness from $INPUT_JSON ..."
    quiet "${SNARKJS[@]}" wtns calculate "$wasm_file" "$INPUT_JSON" "$WTNS_FILE"
}

# -- Generate verifier + proof -----------------------------------------

generate_artifacts() {
    info_msg "generating zkey from $R1CS_FILE ..."
    quiet "${SNARKJS[@]}" groth16 setup "$R1CS_FILE" "$PTAU_FILE" "$ZKEY_FILE"

    info_msg "generating proof ..."
    quiet "${SNARKJS[@]}" groth16 prove "$ZKEY_FILE" "$WTNS_FILE" "$PROOF_FILE" "$PUBLIC_FILE"

    mkdir -p "$FORGE_TEST_DIR/src"
    info_msg "exporting Solidity verifier to $FORGE_TEST_DIR/src/Groth16Verifier.sol ..."
    quiet "${SNARKJS[@]}" zkey export solidityverifier "$ZKEY_FILE" "$FORGE_TEST_DIR/src/Groth16Verifier.sol"
}

# -- Write the forge test ----------------------------------------------

write_forge_test() {
    local test_file="$FORGE_TEST_DIR/test/Groth16Verifier.t.sol"
    mkdir -p "$(dirname "$test_file")"

    local proof_json public_json
    proof_json="$(cat "$PROOF_FILE")"
    public_json="$(cat "$PUBLIC_FILE")"

    # Proof components, exactly as stored in proof.json: pi_b holds each
    # G2 coordinate pair in (real, imag) order.
    local pi_a_0 pi_a_1 pi_b_0_0 pi_b_0_1 pi_b_1_0 pi_b_1_1 pi_c_0 pi_c_1
    pi_a_0="$(echo "$proof_json" | jq -r '.pi_a[0]')"
    pi_a_1="$(echo "$proof_json" | jq -r '.pi_a[1]')"
    pi_b_0_0="$(echo "$proof_json" | jq -r '.pi_b[0][0]')"
    pi_b_0_1="$(echo "$proof_json" | jq -r '.pi_b[0][1]')"
    pi_b_1_0="$(echo "$proof_json" | jq -r '.pi_b[1][0]')"
    pi_b_1_1="$(echo "$proof_json" | jq -r '.pi_b[1][1]')"
    pi_c_0="$(echo "$proof_json" | jq -r '.pi_c[0]')"
    pi_c_1="$(echo "$proof_json" | jq -r '.pi_c[1]')"

    local n_public
    n_public="$(echo "$public_json" | jq 'length')"

    # Public signals array literal, each element wrapped in uint256().
    local pub_signals=""
    for (( i=0; i<n_public; i++ )); do
        local val
        val="$(echo "$public_json" | jq -r ".[$i]")"
        if [ -n "$pub_signals" ]; then
            pub_signals="$pub_signals, uint256($val)"
        else
            pub_signals="uint256($val)"
        fi
    done

    # An aliased variant: first public signal wrapped by the scalar-field
    # modulus r.  The verifier checks every signal < r, so this MUST be
    # rejected on-chain.
    local r="21888242871839275222246405745257275088548364400416034343698204186575808495617"
    local aliased_signals=""
    for (( i=0; i<n_public; i++ )); do
        local val
        val="$(echo "$public_json" | jq -r ".[$i]")"
        if [ "$i" -eq 0 ]; then
            val="$(node -e "console.log((BigInt('$val') + BigInt('$r')).toString())")"
        fi
        if [ -n "$aliased_signals" ]; then
            aliased_signals="$aliased_signals, uint256($val)"
        else
            aliased_signals="uint256($val)"
        fi
    done

    info_msg "writing forge test: $test_file"
    cat > "$test_file" <<SOL
// SPDX-License-Identifier: GPL-3.0
//
// AUTO-GENERATED by scripts/forge_verify_test.sh -- do not edit;
// regenerated on every run.
//
// Runs the exported Groth16Verifier on forge's built-in EVM (revm)
// against a freshly generated proof.
//
// Self-contained on purpose: the only import is the verifier under
// test.  forge treats any test_* function that reverts as a failure,
// so plain require() suffices -- no forge-std, no submodules.
//
pragma solidity >=0.7.0 <0.9.0;

import {Groth16Verifier} from "../src/Groth16Verifier.sol";

contract Groth16VerifierTest {
    Groth16Verifier verifier;

    function setUp() public {
        verifier = new Groth16Verifier();
    }

    /// A valid proof MUST verify on-chain.
    function test_validProofVerifies() public view {
        uint256[2] memory pA = [uint256($pi_a_0), uint256($pi_a_1)];
        // verifyProof()'s _pB parameter is EIP-197-ordered:
        // [x_im, x_re, y_im, y_re].  proof.json stores each G2
        // coordinate pair as (real, imag), so the caller swaps every
        // pair -- the same caller-side swap that 'snarkjs zkey export
        // soliditycalldata' performs.
        uint256[2][2] memory pB = [
            [uint256($pi_b_0_1), uint256($pi_b_0_0)],
            [uint256($pi_b_1_1), uint256($pi_b_1_0)]
        ];
        uint256[2] memory pC = [uint256($pi_c_0), uint256($pi_c_1)];
        uint256[$n_public] memory pubSignals = [$pub_signals];

        bool ok = verifier.verifyProof(pA, pB, pC, pubSignals);
        require(ok, "valid proof did not verify on-chain");
    }

    /// A public signal aliased by adding the scalar-field modulus MUST
    /// be rejected.
    function test_aliasedInputFails() public view {
        uint256[2] memory pA = [uint256($pi_a_0), uint256($pi_a_1)];
        // _pB in EIP-197 order -- the same caller-side swap that
        // 'snarkjs zkey export soliditycalldata' performs (see
        // test_validProofVerifies above).
        uint256[2][2] memory pB = [
            [uint256($pi_b_0_1), uint256($pi_b_0_0)],
            [uint256($pi_b_1_1), uint256($pi_b_1_0)]
        ];
        uint256[2] memory pC = [uint256($pi_c_0), uint256($pi_c_1)];
        uint256[$n_public] memory pubSignals = [$aliased_signals];

        bool ok = verifier.verifyProof(pA, pB, pC, pubSignals);
        require(!ok, "aliased public input was not rejected");
    }
}
SOL
}

# -- Run forge ---------------------------------------------------------

run_forge_test() {
    info_msg "running forge test ..."
    ( cd "$FORGE_TEST_DIR" && forge test -vv 2>&1 ) || {
        fail_msg "forge test failed -- the EVM rejected the proof"
        return 1
    }
}

# -- Main --------------------------------------------------------------

main() {
    echo ""
    echo "  snarkjs Groth16 -- forge on-chain verification test"
    echo "  ---------------------------------------------------"
    echo "  Circuit:     $CIRCUIT_DIR"
    echo "  PTAU:        $PTAU_FILE"
    echo "  Forge dir:   $FORGE_TEST_DIR"
    echo ""

    if ! check_forge; then
        skip_msg "forge not found in PATH -- skipping on-chain verification test"
        echo ""
        echo "  Install Foundry (https://getfoundry.sh), or enter the Nix"
        echo "  dev shell, which provides it:  nix develop"
        echo ""
        exit 0
    fi

    ensure_witness
    generate_artifacts
    write_forge_test
    run_forge_test

    echo ""
    pass_msg "Groth16 on-chain verification test passed"
    echo ""
}

main "$@"
