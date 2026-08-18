{
  description = "snarkjs development shell -- node, circom, foundry (forge), solc";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            # Core tools
            cacert
            git
            gh
            gnumake
            bash
            jq

            # Node.js -- snarkjs runtime, build, and test driver
            nodejs_22

            # circom -- recompile the .circom test circuits if edited
            circom

            # Foundry -- forge (build/test), anvil (local node), cast (CLI)
            foundry

            # solc -- pinned compiler for forge via FOUNDRY_SOLC below, so
            # 'make test-forge' never downloads a compiler (no network access)
            solc
          ];
          shellHook = ''
            # Use the Nix-provided solc so forge does not fetch one via svm.
            export FOUNDRY_SOLC="${pkgs.solc}/bin/solc"

            echo "snarkjs development environment"
            printf "  %-8s %s\n" "node"   "$(node --version 2>/dev/null)"
            printf "  %-8s %s\n" "circom" "$(circom --version 2>/dev/null | head -1)"
            printf "  %-8s %s\n" "forge"  "$(forge --version 2>/dev/null | head -1)"
            printf "  %-8s %s\n" "solc"   "$(solc --version 2>/dev/null | tail -1)"

            # First-time setup: install the npm dev dependencies.
            if [ -f package.json ] && [ ! -d node_modules ]; then
              echo "[flake] installing npm dev deps ..."
              npm install --no-audit --no-fund --loglevel=error
            fi
            if [ -f smart_contract_tests/package.json ] && [ ! -d smart_contract_tests/node_modules ]; then
              echo "[flake] installing smart_contract_tests npm deps ..."
              ( cd smart_contract_tests && npm install --no-audit --no-fund --loglevel=error )
            fi

            echo ""
            echo "Tests:  npm test | make test-forge | make test-forge-all | (cd smart_contract_tests && npm test)"
          '';
        };
      });
}
