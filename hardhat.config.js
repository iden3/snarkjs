import hardhatEthersPlugin from "@nomicfoundation/hardhat-ethers";
import { defineConfig } from "hardhat/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    plugins: [hardhatEthersPlugin],
    solidity: {
        compilers: [
            {
                // All snarkjs verifier templates target >=0.7.0 <0.9.0
                version: "0.8.24",
                settings: {
                    optimizer: { enabled: true, runs: 999999 },
                },
            },
        ],
    },
    paths: {
        sources:   path.resolve(__dirname, "contracts"),
        cache:     path.resolve(__dirname, "cache"),
        artifacts: path.resolve(__dirname, "artifacts"),
    },
});
