var Migrations = artifacts.require("./Migrations.sol");

module.exports = function (deployer, network, account) {
    if (network == "live") {
        throw new Error("Uncomment this line ONLY on very first deployment.");
    }

    //fake async await support: https://github.com/trufflesuite/truffle/issues/501
    deployer.then(async () => {
        await deployer.deploy(Migrations, { gas: 3000000, from: account[0] });
    });
};
