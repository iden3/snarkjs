require("@nomiclabs/hardhat-waffle");

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
            {
                version: "0.6.11",
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
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts"
    },
    // gasReporter: {
    //     enabled: !!process.env.REPORT_GAS,
    //     outputFile: process.env.REPORT_GAS_FILE ? "./gas_report.md" : null,
    //     noColors: process.env.REPORT_GAS_FILE ? true : false
    // },

};
