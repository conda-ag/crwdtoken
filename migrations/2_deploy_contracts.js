const DeployingToken = artifacts.require("./CrwdToken.sol");

module.exports = function(deployer, network, account) {
  let doNotUse;
  let stateControl;
  let whitelistControl;
  let withdrawControl;
  let tokenAssignmentControl;
  let notLocked;
  let lockedTeam;
  let lockedDev;
  let lockedCountry;
  let gasLimit = 4000000;

  if (network === "live") {
    console.log("used accounts for live deployment");
    stateControl = "0x2b1039ba7b4d74f9191c7b927731bca2d68dc452";
    whitelistControl = "0x4b674786aa1f8db532bbeec694669b3ac1fecd1d";
    withdrawControl = "0x4f0f6b683f7f69bfae06070eef683ea6cd512742";
    tokenAssignmentControl = "0x5bc58ca727e06b18ebfb2fc19b267c779559b88c";
    notLocked = "0xffb1b027b11f828dab871ca2956850d5dd64d75f";
    lockedTeam = "0x28498532576f230c6498cd048ec7fab0f69ce8f9";
    lockedDev = "0x863d58fa0e4fc8ed0f88146799af5b06feff9e2a";
    lockedCountry = "0x576ef9cd51d9adb8295f105eeabbb326d1503ff0";
  } else if (network === "kovan") {
    console.log("used accounts for kovan testnet deployment");
    doNotUse = "0x10cBc8f9262f3717afb50eD6A8f720B60E4B5931";
    stateControl = "0xa5aD2801C2aAf6061DCA9A1d7E30F5296FD7F461";
    whitelistControl = "0x748A76e7cc1794E90520bb761a22A167a2B710A2";
    withdrawControl = "0xC893c051E1E5510aa3801A7d6c0fEff3e6F59cf9";
    tokenAssignmentControl = "0x29A13190C423811fA1eA9808b0d44809974dBE8a";
    notLocked = "0x4AD14Bab37fEd8cbBE6e1b552aCAfe356322750F";
    lockedTeam = "0xba7e8aE6741f6A8F0144c3D92F52A0B8Ab8Fbd43";
    lockedDev = "0x2E10E35A784aE63AF899734437B9Ea36Ed2C1750";
    lockedCountry = "0xf07a9Fd5e726783338E48fD8cE38c7675938A258";
  } else if (network === "development" || network === "docker") {
    console.log("used accounts of testrpc/ganache");
    doNotUse = account[0];
    stateControl = account[1];
    whitelistControl = account[2];
    withdrawControl = account[3];
    tokenAssignmentControl = account[4];
    notLocked = account[5];
    lockedTeam = account[6];
    lockedDev = account[7];
    lockedCountry = account[8];
  } else if (network === "coverage") {
    console.log("used accounts of testrpc/ganache");
    doNotUse = account[0];
    stateControl = account[1];
    whitelistControl = account[2];
    withdrawControl = account[3];
    tokenAssignmentControl = account[4];
    notLocked = account[5];
    lockedTeam = account[6];
    lockedDev = account[7];
    lockedCountry = account[8];
    gasLimit = 0xfffffffffff;
  } else {
    throw new Error("Unknown network");
  }

  if (account[0].toLowerCase() !== doNotUse.toLowerCase()) {
    throw new Error("Unexpected deployment account0");
  }

  const deployedAddress = deployer.deploy(
    DeployingToken,
    stateControl,
    whitelistControl,
    withdrawControl,
    tokenAssignmentControl,
    notLocked,
    lockedTeam,
    lockedDev,
    lockedCountry,
    { gas: gasLimit, from: account[0] }
  );
};
