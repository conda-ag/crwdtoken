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
    stateControl = "0x2b1039ba7b4d74f9191c7b927731bca2d68dc452";
    whitelistControl = "0x4b674786aa1f8db532bbeec694669b3ac1fecd1d";
    withdrawControl = "0x4f0f6b683f7f69bfae06070eef683ea6cd512742";
    tokenAssignmentControl = "0x5bc58ca727e06b18ebfb2fc19b267c779559b88c";
    notLocked = "0xffb1b027b11f828dab871ca2956850d5dd64d75f";
    lockedTeam = "0x28498532576f230c6498cd048ec7fab0f69ce8f9";
    lockedDev = "0x863d58fa0e4fc8ed0f88146799af5b06feff9e2a";
    lockedCountry = "0x576ef9cd51d9adb8295f105eeabbb326d1503ff0";
  } else if (network === "ropsten") {
    doNotUse = "0xd5fe9080a82b4b2ca74f739a91ec81a56a9fe529";
    stateControl = "0xb87cf40a725739e5ef1c51b8ed54201bffdd5fb9";
    whitelistControl = "0x0a9ec01c6cc80fa1f8e3c27bb892651dd7aa2f68";
    withdrawControl = "0xe89d4504db19b17a78508c1fff29ac2ecddb48f0";
    tokenAssignmentControl = "0x5c9dcc73e04006de3d517a1a6e689390aff66ed8";
    notLocked = "0x5621844738450eb2316621d43120e56e4e359875";
    lockedTeam = "0xc807e12d03da2408e290ebf0b735bd4833302329";
    lockedDev = "0x398e5bbf2759d0e351833a69bb0000cf6fead3a1";
    lockedCountry = "0xb32f2bad20f1032442042fa65fd3497666923143";
  } else if (network === "development" || network === "docker") {
    // testrpc
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
    // testrpc-sc
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
