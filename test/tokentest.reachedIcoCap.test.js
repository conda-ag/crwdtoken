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

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const { expect } = require('chai');

const TokenContract = artifacts.require("./CrwdToken.sol");
const TimelockContract = artifacts.require("./CrwdTimelock.sol");

contract('TokenContract accepts large numbers of ICO invests small and large but respects cap. Funded and stopped by admin and operational.', function (accounts) {

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

  const weiICOMaximum = ether("0.64");
  const weiICOMinimum = ether("0.064");

  // must be adapted with number of tests
  let endBlock; //set in before()

  let currentBlockNumber;

  let theToken;

  before(async () => {
    console.log("redeploying...")
    theToken = await deployTokenJustLikeInMigrations(accounts);

    currentBlockNumber = (await web3.eth.getBlock("latest")).number;
    endBlock = currentBlockNumber + 200;
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

  it("should accept lots of small funds from  whitelisted address user1.", async function () {
    let isUser1Whitelisted = await theToken.whitelist(user1);
    const preBalance = await web3.eth.getBalance(theToken.address);
    expect(preBalance).to.be.bignumber.equal(0);
    let currentBalance = new BigNumber("0");
    const user1SendFunds = ether("0.001");
    isUser1Whitelisted.should.equal(true);
    for (let i = 0; i < 100; i++) {
      await theToken.sendTransaction({ from: user1, value: user1SendFunds }).should.not.be.rejected;
      const postBalance = await web3.eth.getBalance(theToken.address);
      currentBalance = currentBalance.add(user1SendFunds);
      expect(currentBalance).to.be.bignumber.equal(postBalance);
    }
    const postBalance = await web3.eth.getBalance(theToken.address);
    let remaining = new BigNumber(weiICOMaximum).sub(postBalance);
    let aBitTooMuch = remaining.add(ether("0.001"));
    await theToken.sendTransaction({ from: user1, value: aBitTooMuch }).should.be.rejected;
    await theToken.sendTransaction({ from: user1, value: remaining }).should.not.be.rejected;
    const finalBalance = await web3.eth.getBalance(theToken.address);
    currentBalance = currentBalance.add(remaining);
    expect(currentBalance).to.be.bignumber.equal(finalBalance);

  });

  it("should accept stopping ICO by admin before ICO timeout.", async function () {
    expect(await theToken.state()).to.be.bignumber.equal(States.Ico);
    await theToken.endICO({ from: expectedStateControl }).should.not.be.rejected;
    expect(await theToken.state()).to.be.bignumber.equal(States.Operational);
  });

});
