require('babel-register');
require('babel-polyfill');

module.exports = {
    solc: {
        version: "0.5.0", //don't use nightly
        docker: false,
        optimizer: {
            enabled: true,
            runs: 200
        }
    },
    networks: {
        development: {
            host: "localhost",
            port: 8545,
            // port: 30303,
            network_id: "*", // Match any network id
            verboseRpc: true
        },
        ropsten: {
            host: "localhost",
            port: 8545,
            network_id: "3",
            verboseRpc: true,

        },
        live: {
            host: "localhost",
            port: 8545,
            network_id: "1",
            verboseRpc: true
        },
        coverage: {
            host: "localhost",
            network_id: "*",
            port: 8555,
            gas: 0xfffffffffff,
            gasPrice: 0x01
        }
    }
};
