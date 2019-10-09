import { reverting } from "./helpers/compare.js";
import { deployTokenJustLikeInMigrations } from "./helpers/deployTokenHelper.js";

import { BigNumber } from "./helpers/customBN.js";

const TestnetFaucet = artifacts.require("./TestnetFaucet.sol");
const CrwdToken = artifacts.require("./CrwdToken.sol");

import {
  advanceBlock,
  advanceToBlock,
  increaseTime,
  increaseTimeTo,
  duration,
  revert,
  latestTime
} from "truffle-test-helpers";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

require("chai")
  .use(require("chai-as-promised"))
  .use(require("chai-bn")(BigNumber))
  .should();

contract("Faucet on Testnet", accounts => {
  let testnetFaucet = null;
  let token = null;

  let stateControl = null;
  let owner = null;
  let unknown = null;

  beforeEach(async () => {
    owner = accounts[0];
    stateControl = accounts[0];
    unknown = accounts[9];

    testnetFaucet = await TestnetFaucet.new();

    token = await CrwdToken.new(
      stateControl, //state control
      testnetFaucet.address,
      testnetFaucet.address,
      testnetFaucet.address,
      testnetFaucet.address, //15%
      testnetFaucet.address, //15%
      testnetFaucet.address, //10%
      testnetFaucet.address //10%
    );

    await testnetFaucet.setTokenAddress(token.address);

    //start ico
    await token.updateEthICOThresholds(
      "0",
      (2 ^ 128).toString(),
      "0",
      "90000000000000000000000"
    );
  });

  it("Receive CRWD via faucet", async () => {
    await testnetFaucet.mint("123", { from: unknown });
    assert.equal((await token.balanceOf(unknown)).toString(), "123");
  });

  it("Faucet makeDead disables faucet", async () => {
    await testnetFaucet.makeDead();
    await testnetFaucet
      .mint("123", { from: unknown })
      .should.be.rejectedWith(revert);
    assert.equal((await token.balanceOf(unknown)).toString(), "0");
  });

  it("Faucet makeDead only by owner", async () => {
    await testnetFaucet
      .makeDead({ from: unknown })
      .should.be.rejectedWith(revert);
    assert.equal((await token.balanceOf(unknown)).toString(), "0");
  });

  it("setTokenAddress() by owner", async () => {
    await testnetFaucet.setTokenAddress(ZERO_ADDRESS, { from: owner });
    assert.equal((await testnetFaucet.faucetFor()).toString(), ZERO_ADDRESS);
  });

  it("setTokenAddress() by unknown should fail", async () => {
    await testnetFaucet
      .setTokenAddress(ZERO_ADDRESS, { from: unknown })
      .should.be.rejectedWith(revert);
    assert.equal((await testnetFaucet.faucetFor()).toString(), token.address);
  });

  it("mint more than limit", async () => {
    await testnetFaucet.mint("10000000000000000000000", { from: unknown });
    await testnetFaucet
      .mint("1", { from: unknown })
      .should.be.rejectedWith(revert);
    assert.equal(
      (await token.balanceOf(unknown)).toString(),
      "10000000000000000000000"
    );
  });
});
