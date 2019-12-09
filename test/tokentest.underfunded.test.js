import { reverting } from "./helpers/compare.js";
import { deployTokenJustLikeInMigrations } from './helpers/deployTokenHelper.js'

const { ether } = require("./helpers/currency.js");

import { States } from './helpers/tokenStates.js'

import {
  advanceBlock,
  advanceToBlock,
  increaseTime,
  increaseTimeTo,
  duration,
  revert,
  latestTime
} from 'truffle-test-helpers';

import { BigNumber } from './helpers/customBN.js'

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bn')(BigNumber))
  .should();

const { expect } = require('chai');

const TokenContract = artifacts.require("./CrwdToken.sol");
// const TimelockContract = artifacts.require("./CrwdTimelock.sol");

contract('Token funded and stopped by admin and underfunded.', function (accounts) {

  const defaultKeyDoNotUse = accounts[0];
  const expectedStateControl = accounts[1];
  const expectedWhitelist = accounts[2];
  const expectedWithdraw = accounts[3];
  const expectedTokenAssignmentControl = accounts[4];
  const expectedNotLocked = accounts[5];
  const ownerLockedTeam = accounts[6];
  const ownerLockedDev = accounts[7];
  const ownerLockedCountry = accounts[8];

  const user1 = accounts[9];
  const user2 = accounts[10];
  const user3 = accounts[11];

  const weiICOMaximum = ether("100001");
  const weiICOMinimum = ether("100000");

  const user1SendFunds = ether("1");

  // must be adapted with number of tests
  let endBlock; //set in before()

  let currentBlockNumber;

  let theToken;

  before(async () => {
    console.log("redeploying...")
    theToken = await deployTokenJustLikeInMigrations(accounts);

    currentBlockNumber = new BigNumber(((await web3.eth.getBlock("latest")).number).toString());
    endBlock = currentBlockNumber.add(new BigNumber("20"));
  })

  it("should be in Initial state", async function () {
    expect(await theToken.state()).to.be.bignumber.equal(States.Initial);
  });

  it("should accept valid min and max values with correct key.", async function () {
    await theToken.updateEthICOThresholds(weiICOMinimum, weiICOMaximum, "0", endBlock, { from: expectedStateControl }).should.not.be.rejected;
    expect(await theToken.weiICOMinimum()).to.be.bignumber.equal(weiICOMinimum);
    expect(await theToken.weiICOMaximum()).to.be.bignumber.equal(weiICOMaximum);
    expect(await theToken.endBlock()).to.be.bignumber.equal(endBlock);
    expect(await theToken.state()).to.be.bignumber.equal(States.ValuationSet);
  });

  it("should start ICO. ", async function () {
    await theToken.startICO({ from: expectedStateControl });
    expect(await theToken.state()).to.be.bignumber.equal(States.Ico);
  });

  it("should whitelist address user1 with correct key.", async function () {
    await theToken.addToWhitelist(user1, { from: expectedWhitelist }).should.not.be.rejected;
    let isUser1Whitelisted = await theToken.whitelist(user1);
    isUser1Whitelisted.should.equal(true);
  });

  it("should accept funds from whitelisted address user1.", async function () {
    let isUser1Whitelisted = await theToken.whitelist(user1);
    isUser1Whitelisted.should.equal(true);
    await theToken.sendTransaction({ from: user1, value: user1SendFunds }).should.not.be.rejected;
  });

  it("should accept stopping ICO by admin before ICO timeout.", async function () {
    expect(await theToken.state()).to.be.bignumber.equal(States.Ico);
    await theToken.endICO({ from: expectedStateControl }).should.not.be.rejected;
    expect(await theToken.state()).to.be.bignumber.equal(States.Underfunded);
  });

});

