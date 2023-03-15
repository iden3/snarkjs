require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        compilers: [
            {
                version: "0.8.17",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 999999
                    }
                }
            },
        ]
    },
    paths: {
        sources: "./test/smart_contracts/contracts",
        tests: "./test",
        cache: "./test/smart_contracts/cache",
        artifacts: "./test/smart_contracts/artifacts"
    },
    gasReporter: {
        enabled: !!process.env.REPORT_GAS,
        outputFile: process.env.REPORT_GAS_FILE ? "./gas_report.md" : null,
        noColors: process.env.REPORT_GAS_FILE ? true : false
    },

};
