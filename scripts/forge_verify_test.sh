#!/usr/bin/env bash
#
# forge_verify_test.sh — End-to-end Groth16 on-chain verification via Forge
#
# Generates a zkey + proof from a test circuit, exports a Solidity
# Groth16 verifier, and tests it against Forge's built-in revm EVM
# (the same precompile implementation that caught the EIP-197 G2
# encoding bug).
#
# Auto-skips if Forge is not installed:
#   SKIP: forge not found in PATH
#
# Usage:
#   bash scripts/forge_verify_test.sh
#   bash scripts/forge_verify_test.sh --circuit test/groth16
#   bash scripts/forge_verify_test.sh --circuit test/circuit2
#
# Environment:
#   FORGE_TEST_DIR    forge project root (default: forge_test/)
#   PTAU_FILE         Powers of Tau file (default: test/plonk_circuit/powersOfTau15_final.ptau)
#   CIRCUIT_DIR       circuit + witness directory (default: test/groth16)
#   VERBOSE           set to 1 for verbose output

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── Configuration ─────────────────────────────────────────────────────

FORGE_TEST_DIR="${FORGE_TEST_DIR:-$REPO_ROOT/forge_test}"
PTAU_FILE="${PTAU_FILE:-$REPO_ROOT/test/plonk_circuit/powersOfTau15_final.ptau}"
CIRCUIT_DIR="${CIRCUIT_DIR:-$REPO_ROOT/test/groth16}"
VERBOSE="${VERBOSE:-0}"

R1CS_FILE="$CIRCUIT_DIR/circuit.r1cs"
WTNS_FILE="${WTNS_FILE:-$CIRCUIT_DIR/witness.wtns}"
# Some circuits don't have pre-built witnesses; generate from input.json
INPUT_JSON="$CIRCUIT_DIR/input.json"
WASM_FILE="$CIRCUIT_DIR/circuit.wasm"

# Temp files
ZKEY_FILE="$(mktemp /tmp/forge_verify_zkey.XXXXXX)"
PROOF_FILE="$(mktemp /tmp/forge_verify_proof.XXXXXX)"
PUBLIC_FILE="$(mktemp /tmp/forge_verify_public.XXXXXX)"

# ── Colour helpers ────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass_msg() { echo -e "${GREEN}PASS${NC} $*"; }
fail_msg() { echo -e "${RED}FAIL${NC} $*"; }
skip_msg() { echo -e "${YELLOW}SKIP${NC} $*"; }
info_msg() { echo "INFO  $*"; }

# ── Pre-flight ────────────────────────────────────────────────────────

# Find snarkjs CLI.  npm only creates the bin symlink when snarkjs is
# installed as a *dependency* (e.g. smart_contract_tests/node_modules/.bin/),
# not in the package's own node_modules/.bin/.  Use the source cli.js
# directly — it's an ES module that works without any build step.
SNARKJS="node $REPO_ROOT/cli.js"
if [ -x "$REPO_ROOT/smart_contract_tests/node_modules/.bin/snarkjs" ]; then
    SNARKJS="$REPO_ROOT/smart_contract_tests/node_modules/.bin/snarkjs"
elif [ -x "$REPO_ROOT/node_modules/.bin/snarkjs" ]; then
    SNARKJS="$REPO_ROOT/node_modules/.bin/snarkjs"
elif command -v snarkjs >/dev/null 2>&1; then
    SNARKJS="$(command -v snarkjs)"
fi

# Check that required inputs exist.
for f in "$R1CS_FILE" "$PTAU_FILE"; do
    if [ ! -f "$f" ]; then
        fail_msg "missing required file: $f"
        exit 1
    fi
done

# Generate witness if wtns file doesn't exist.
if [ ! -f "$WTNS_FILE" ]; then
    if [ ! -f "$INPUT_JSON" ] || [ ! -f "$WASM_FILE" ]; then
        fail_msg "no witness file ($WTNS_FILE) and cannot generate one (need $INPUT_JSON and $WASM_FILE)"
        exit 1
    fi
    info_msg "generating witness from $INPUT_JSON ..."
    WTNS_FILE="$CIRCUIT_DIR/witness.wtns"
    node -e "
        const snarkjs = require('$REPO_ROOT/main.js');
        snarkjs.wtns.calculate(
            JSON.parse(require('fs').readFileSync('$INPUT_JSON','utf8')),
            '$WASM_FILE',
            '$WTNS_FILE'
        ).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
    "
fi

# ── Forge check ───────────────────────────────────────────────────────

check_forge() {
    if ! command -v forge >/dev/null 2>&1; then
        return 1
    fi
    return 0
}

# ── Forge-std bootstrap ───────────────────────────────────────────────

ensure_forge_std() {
    local lib_dir="$FORGE_TEST_DIR/lib/forge-std"
    if [ -d "$lib_dir" ]; then
        return 0
    fi
    info_msg "installing forge-std ..."
    ( cd "$FORGE_TEST_DIR" && forge install foundry-rs/forge-std >/dev/null 2>&1 ) || {
        fail_msg "could not install forge-std (network issue?)"
        return 1
    }
}

# ── Solidity helper ───────────────────────────────────────────────────

# Format a BigInt / decimal string for inclusion in Solidity source.
# snarkjs outputs decimal strings; Solidity needs them as-is for uint256.
solidity_uint() {
    printf '%s' "$1"
}

# ── Generate verifier + proof ─────────────────────────────────────────

generate_artifacts() {
    info_msg "generating zkey from $R1CS_FILE ..."
    "$SNARKJS" zkey new "$R1CS_FILE" "$PTAU_FILE" "$ZKEY_FILE" 2>/dev/null

    info_msg "generating proof ..."
    "$SNARKJS" groth16 prove "$ZKEY_FILE" "$WTNS_FILE" "$PROOF_FILE" "$PUBLIC_FILE" 2>/dev/null

    # Export Verifier to Forge src/
    mkdir -p "$FORGE_TEST_DIR/src"
    info_msg "exporting Solidity verifier to $FORGE_TEST_DIR/src/Groth16Verifier.sol ..."
    "$SNARKJS" zkey export solidityverifier "$ZKEY_FILE" "$FORGE_TEST_DIR/src/Groth16Verifier.sol" 2>/dev/null
}

# ── Write Forge test ──────────────────────────────────────────────────

write_forge_test() {
    local test_file="$FORGE_TEST_DIR/test/Groth16Verifier.t.sol"
    mkdir -p "$(dirname "$test_file")"

    # Parse proof.json and public.json to extract values.
    local proof_json public_json
    proof_json="$(cat "$PROOF_FILE")"
    public_json="$(cat "$PUBLIC_FILE")"

    # Extract proof components (ffjavascript order).
    local pi_a_0 pi_a_1 pi_b_0_0 pi_b_0_1 pi_b_1_0 pi_b_1_1 pi_c_0 pi_c_1
    pi_a_0="$(echo "$proof_json" | jq -r '.pi_a[0]')"
    pi_a_1="$(echo "$proof_json" | jq -r '.pi_a[1]')"
    pi_b_0_0="$(echo "$proof_json" | jq -r '.pi_b[0][0]')"
    pi_b_0_1="$(echo "$proof_json" | jq -r '.pi_b[0][1]')"
    pi_b_1_0="$(echo "$proof_json" | jq -r '.pi_b[1][0]')"
    pi_b_1_1="$(echo "$proof_json" | jq -r '.pi_b[1][1]')"
    pi_c_0="$(echo "$proof_json" | jq -r '.pi_c[0]')"
    pi_c_1="$(echo "$proof_json" | jq -r '.pi_c[1]')"

    # Count public inputs
    local n_public
    n_public="$(echo "$public_json" | jq 'length')"

    # Build public signals array literal — each element individually
    # wrapped with uint256() for explicit Solidity type conversion.
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

    # Build an aliased public input (add field modulus to first signal).
    # This should REJECT on-chain.
    local aliased_signals=""
    local r="21888242871839275222246405745257275088548364400416034343698204186575808495617"
    for (( i=0; i<n_public; i++ )); do
        local val aliased
        val="$(echo "$public_json" | jq -r ".[$i]")"
        if [ "$i" -eq 0 ]; then
            # Add field modulus to alias the value (wraps around mod r)
            aliased="$(node -e "console.log((BigInt('$val') + BigInt('$r')).toString())")"
        else
            aliased="$val"
        fi
        if [ -n "$aliased_signals" ]; then
            aliased_signals="$aliased_signals, uint256($aliased)"
        else
            aliased_signals="uint256($aliased)"
        fi
    done

    info_msg "writing Forge test: $test_file"
    cat > "$test_file" <<SOL
// SPDX-License-Identifier: GPL-3.0
//
// AUTO-GENERATED by scripts/forge_verify_test.sh
// Do not edit — regenerated on each test run.
//
// Tests the exported Groth16Verifier against Forge's revm EVM,
// which strictly enforces EIP-197 G2 point encoding.
//
pragma solidity >=0.7.0 <0.9.0;

import {Test, console} from "forge-std/Test.sol";
import {Groth16Verifier} from "../src/Groth16Verifier.sol";

contract Groth16VerifierTest is Test {
    Groth16Verifier public verifier;

    function setUp() public {
        verifier = new Groth16Verifier();
    }

    /// @dev Valid proof MUST verify on-chain.
    function test_validProofVerifies() public view {
        uint256[2] memory pA = [uint256($pi_a_0), uint256($pi_a_1)];
        uint256[2][2] memory pB = [
            [uint256($pi_b_0_0), uint256($pi_b_0_1)],
            [uint256($pi_b_1_0), uint256($pi_b_1_1)]
        ];
        uint256[2] memory pC = [uint256($pi_c_0), uint256($pi_c_1)];
        uint256[$n_public] memory pubSignals = [$pub_signals];

        bool ok = verifier.verifyProof(pA, pB, pC, pubSignals);
        assertTrue(ok, "valid proof did not verify on-chain");
    }

    /// @dev Proof with aliased (wrapped) public input MUST be rejected.
    function test_aliasedInputFails() public view {
        uint256[2] memory pA = [uint256($pi_a_0), uint256($pi_a_1)];
        uint256[2][2] memory pB = [
            [uint256($pi_b_0_0), uint256($pi_b_0_1)],
            [uint256($pi_b_1_0), uint256($pi_b_1_1)]
        ];
        uint256[2] memory pC = [uint256($pi_c_0), uint256($pi_c_1)];
        uint256[$n_public] memory pubSignals = [$aliased_signals];

        bool ok = verifier.verifyProof(pA, pB, pC, pubSignals);
        assertFalse(ok, "aliased public input was not rejected");
    }
}
SOL
}

# ── Run Forge tests ───────────────────────────────────────────────────

run_forge_test() {
    info_msg "running forge test ..."
    ( cd "$FORGE_TEST_DIR" && forge test -vvv 2>&1 ) || {
        fail_msg "forge test failed — EVM rejected the proof"
        return 1
    }
}

# ── Cleanup ───────────────────────────────────────────────────────────

cleanup() {
    rm -f "$ZKEY_FILE" "$PROOF_FILE" "$PUBLIC_FILE"
}
trap cleanup EXIT

# ── Main ──────────────────────────────────────────────────────────────

main() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  snarkjs Groth16 — Forge On-Chain Verification Test"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "  Circuit:     $CIRCUIT_DIR"
    echo "  PTAU:        $PTAU_FILE"
    echo "  Forge dir:   $FORGE_TEST_DIR"
    echo ""

    if ! check_forge; then
        skip_msg "forge not found in PATH — skipping EVM verification test"
        echo ""
        echo "  Install Foundry:  curl -L https://foundry.paradigm.xyz | bash"
        echo "  Then:             foundryup"
        echo ""
        exit 0
    fi

    ensure_forge_std || exit 1
    generate_artifacts
    write_forge_test
    run_forge_test

    echo ""
    pass_msg "Groth16 on-chain verification test passed"
    echo ""
}

main "$@"
