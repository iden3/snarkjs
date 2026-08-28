# Export-plugin byte-compat fixtures

Generated ONCE with the pre-plugin implementation (branch
feature/memory-scoping @ 21287bd, before feature/export-plugins):

- `groth16.zkey` — `zKey.newZKey(test/groth16/circuit.r1cs, test/plonk_circuit/powersOfTau15_final.ptau)` (deterministic, no contributions)
- `*.proof.json` / `*.public.json` — one proof per protocol (groth16 from the zkey above; plonk from test/plonk_circuit/circuit.zkey; fflonk from test/fflonk/circuit.zkey + witness.wtns). Saved because proving is randomized.
- `*.verifier.sol.golden` — old `zKey.exportSolidityVerifier(zkey, templates)` output
- `*.calldata.golden` — old `exportSolidityCallData` output (fflonk with its historical `(pub, proof)` order)

test/export_plugins_compat.test.js asserts strict string equality of the new
plugin path (and the legacy shims) against these. Regenerate only if the
templates change intentionally — never to make a refactor pass.
