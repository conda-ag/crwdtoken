var Migrations = artifacts.require("./Migrations.sol");

module.exports = function (deployer, network, account) {
    deployer.deploy(Migrations , {gas: 3000000, from: account[0]});
};
