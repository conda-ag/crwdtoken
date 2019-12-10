const TestnetFaucet = artifacts.require("./TestnetFaucet.sol");
const DeployingToken = artifacts.require("./CrwdToken.sol");

const UINT256_MAX = new web3.utils.BN("2")
  .pow(new web3.utils.BN("256"))
  .sub(new web3.utils.BN("1"));

const UINT128_MAX = new web3.utils.BN("2")
  .pow(new web3.utils.BN("128"))
  .sub(new web3.utils.BN("1"));

//
// Decide if faucet should be assigned
//
const assignFaucetOnTestnet = true;

const deployFaucetOnTestnet = async (deployer, network, account) => {
  let faucet = null;
  if (
    network === "development" ||
    network === "docker" ||
    network === "kovan"
  ) {
    await deployer.deploy(TestnetFaucet, { gas: 3000000, from: account[0] });
    faucet = await TestnetFaucet.at(TestnetFaucet.address);

    console.log("faucet deployed");
  }

  return faucet;
};

const configureFaucetOnTestnet = async (network, deployingTokenAddress) => {
  if (
    network === "development" ||
    network === "docker" ||
    network === "kovan"
  ) {
    const faucet = await TestnetFaucet.at(TestnetFaucet.address);
    await faucet.setTokenAddress(deployingTokenAddress);
  }
  console.log("faucet configured");
};

const updateThresholds = async (network, account) => {
  if (
    network === "development" ||
    network === "docker" ||
    network === "kovan"
  ) {
    const token = await DeployingToken.at(DeployingToken.address);
    await token.updateEthICOThresholds(
      "0",
      UINT128_MAX.toString(),
      "0",
      UINT256_MAX.toString(),
      { from: account[1] }
    );
    console.log("thresholds updated");
  }
};

module.exports = function(deployer, network, account) {
  //fake async await support: https://github.com/trufflesuite/truffle/issues/501
  deployer.then(async () => {
    let doNotUse;
    let stateControl;
    let whitelistControl;
    let withdrawControl;
    let tokenAssignmentControl;
    let notLocked;
    let lockedTeam;
    let lockedDev;
    let lockedCountry;

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
      stateControl = "0x53d1B24dC3E010DC10B214D09D1C137b70c4F457";
      whitelistControl = "0xC802827ea722D1Ad46Fb35c29281E7076F98DaA9";
      withdrawControl = "0x37fc1bAF4b26e31E5834a19394F4a9aCE54EfB0c";
      tokenAssignmentControl = "0x8A4c0Ed207D8779b4e5da9D3c6D67c7A0cF70B16";
      notLocked = "0xb099f2584b1A263a30d763D08cA8171748Cf55E2";
      lockedTeam = "0xd45EAfD3f28243777b05b001d72E0eB57eE8498d";
      lockedDev = "0xf726C7C75BB52DC83cBB88CEAD9c642394027f38";
      lockedCountry = "0xFb7b93db4ddFF6AD9096da7b4d71D61AEb810A1D";
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
    } else {
      throw new Error(`Unknown network ${network}`);
    }

    console.log("account summary:");
    console.log(`doNotUse ${doNotUse}`);
    console.log(`stateControl ${stateControl}`);
    console.log(`whitelistControl ${whitelistControl}`);
    console.log(`withdrawControl ${withdrawControl}`);
    console.log(`tokenAssignmentControl ${tokenAssignmentControl}`);
    console.log(`notLocked ${notLocked}`);
    console.log(`lockedTeam ${lockedTeam}`);
    console.log(`lockedDev ${lockedDev}`);
    console.log(`lockedCountry ${lockedCountry}`);

    if (account[0].toLowerCase() !== doNotUse.toLowerCase()) {
      throw new Error(
        `Unexpected account0. Is: ${account[0]}, Should: ${doNotUse}`
      );
    }

    if (assignFaucetOnTestnet) {
      const faucet = await deployFaucetOnTestnet(deployer, network, account);

      if (faucet !== null) {
        tokenAssignmentControl = faucet.address;
        whitelistControl = faucet.address;
        console.log(
          `faucet override: tokenAssignmentControl and whitelistControl set to faucet ${faucet.address}`
        );
      }
    }

    console.log(`deploying token...`);
    await deployer.deploy(
      DeployingToken,
      stateControl,
      whitelistControl,
      withdrawControl,
      tokenAssignmentControl,
      notLocked,
      lockedTeam,
      lockedDev,
      lockedCountry,
      { from: account[0] }
    );

    if (assignFaucetOnTestnet) {
      console.log("deploying faucet...");
      await configureFaucetOnTestnet(network, DeployingToken.address);
    }

    console.log("deploying thresholds...");
    await updateThresholds(network, account);

    console.log("deploy_contracts done");
  });
};
