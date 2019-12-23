var HDWalletProvider = require("truffle-hdwallet-provider");

require("babel-register")({
  ignore: /node_modules\/(?!openzeppelin-solidity\/test\/helpers)/
});
require("babel-polyfill");

let getMnemonic = () => {
  const mnemonicJson = JSON.parse(
    require("fs").readFileSync(__dirname + "/mnemonic.json", "utf8")
  );
  return mnemonicJson.mnemonic;
};

let getNode = () => {
  const mnemonicJson = JSON.parse(
    require("fs").readFileSync(__dirname + "/mnemonic.json", "utf8")
  );
  return mnemonicJson.node;
};

module.exports = {
  compilers: {
    solc: {
      version: "0.5.12", //don't use nightly
      docker: false,
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      // port: 30303,
      network_id: "*", // Match any network id
      gas: 6721975,
      verboseRpc: true
    },
    docker: {
      host: "ganache",
      port: 8545,
      network_id: "*",
      gas: 6721975,
      verboseRpc: true
    },
    kovan: {
      provider: () => new HDWalletProvider(getMnemonic(), getNode(), 0, 10),
      gas: 6721975,
      gasPrice: 10000000000,
      network_id: 42,
      skipDryRun: true
    },
    ropsten: {
      provider: () => new HDWalletProvider(getMnemonic(), getNode(), 0, 1),
      gas: 5500000,
      gasPrice: 10000000000,
      network_id: 3,
      skipDryRun: true,
    },
    live: {
      provider: () => new HDWalletProvider(getMnemonic(), getNode()),
      gas: 5000000,
      gasPrice: 10000000000,
      network_id: 1,
      skipDryRun: true
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
