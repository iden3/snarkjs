{
  description = "snarkjs — zkSNARKs implementation in JavaScript (Groth16/PLONK/FFLONK)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};

        commonInputs = with pkgs; [
          # Core tools
          cacert
          git
          gnumake
          gnused
          bash
          bash-completion
          which
          jq
          curl

          # Node.js — runtime and build tool
          nodejs_22

          # circom — compile .circom test circuits → R1CS / WASM
          circom

          # Foundry — forge (compiler/test), anvil (local node), cast (CLI)
          # Provides solc for Hardhat-based smart-contract tests
          foundry

          # Standalone solc — for IDE/LSP support; Hardhat + Foundry also bundle solc
          solc
        ];
      in {
        devShells.default = pkgs.mkShell {
          buildInputs = commonInputs;
          shellHook = ''
            export SOLC_PATH="${pkgs.solc}/bin/solc"

            echo "snarkjs — zkSNARKs Development Environment"
            echo ""
            printf "  %-12s %s\n" "node"   "$(node --version 2>/dev/null)"
            printf "  %-12s %s\n" "circom"  "$(circom --version 2>/dev/null | head -1)"
            printf "  %-12s %s\n" "forge"   "$(forge --version 2>/dev/null | head -1)"
            printf "  %-12s %s\n" "cast"    "$(cast --version 2>/dev/null | head -1)"
            printf "  %-12s %s\n" "solc"    "$(solc --version 2>/dev/null | tail -1)"

            # Install root npm deps (snarkjs build deps: rollup, mocha, etc.)
            if [ ! -d node_modules ] && [ -f package.json ]; then
              echo ""
              echo "[flake] installing root npm dev deps ..."
              npm install --no-audit --no-fund --loglevel=error
            fi

            # Install smart-contract test deps (hardhat, ethers, chai, etc.)
            if [ -f smart_contract_tests/package.json ] && [ ! -d smart_contract_tests/node_modules ]; then
              echo ""
              echo "[flake] installing smart-contract test npm deps ..."
              ( cd smart_contract_tests && npm install --no-audit --no-fund --loglevel=error )
            fi

            # Prepend local node_modules/.bin so snarkjs CLI is on PATH
            if [ -x node_modules/.bin/snarkjs ]; then
              export PATH="$PWD/node_modules/.bin:$PATH"
              printf "  %-12s %s\n" "snarkjs" "$(snarkjs --version 2>/dev/null || echo 'installed')"
            fi

            echo ""
            echo "Commands:  make all | make test | make test-smart-contracts | make build"
          '';
        };
      });
}
