import { deployTokenJustLikeInMigrations } from './helpers/deployTokenHelper.js'

const { ether } = require("./helpers/currency.js");

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

contract('TokenContract underfunded and refund.', function (accounts) {

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

  // this data structure must be kept in sync with States enum in the token's .sol
  const States = {
    Initial: 0, // deployment time
    ValuationSet: 1, // whitelist addresses, accept funds, update balances
    Ico: 2, // whitelist addresses, accept funds, update balances
    Underfunded: 3, // ICO time finished and minimal amount not raised
    Operational: 4, // production phase
    Paused: 5         // for contract upgrades
  }

  // must be adapted with number of tests
  let endBlock; //set in before()

  let currentBlockNumber;

  let theToken;

  before(async () => {
    console.log("redeploying...")
    theToken = await deployTokenJustLikeInMigrations(accounts);

    currentBlockNumber = (await web3.eth.getBlock("latest")).number;
    endBlock = currentBlockNumber + 20;
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

  it("should accept funds from  whitelisted address user1.", async function () {
    let isUser1Whitelisted = await theToken.whitelist(user1);
    isUser1Whitelisted.should.equal(true);
    await theToken.sendTransaction({ from: user1, value: user1SendFunds }).should.not.be.rejected;
  });

  it("should not let users get their refund while in ico state.", async function () {
    const pre = web3.eth.getBalance(user1);
    await theToken.requestRefund({ from: user1, gasPrice: 0 }).should.be.rejected;
    const post = web3.eth.getBalance(user1);
    expect(post.sub(pre)).to.be.bignumber.equal(0);
  });

  it("should move to underfunded state at end of ICO.", async function () {
    await advanceToBlock(endBlock + 1);
    await theToken.anyoneEndICO().should.not.be.rejected;
    expect(await theToken.state()).to.be.bignumber.equal(States.Underfunded);
  });

  it("should reject new funding in underfunded state.", async function () {
    await theToken.sendTransaction({ from: user1, value: ether("1") }).should.be.rejectedWith(revert);
  });

  it("should let users get their refund in underfunded state.", async function () {
    const pre = web3.eth.getBalance(user1);
    await theToken.requestRefund({ from: user1, gasPrice: 0 }).should.not.be.rejected;
    const post = web3.eth.getBalance(user1);
    expect(post.sub(pre)).to.be.bignumber.equal(user1SendFunds);
  });

  it("should not let users get their refund twice in underfunded state.", async function () {
    const pre = web3.eth.getBalance(user1);
    await theToken.requestRefund({ from: user1, gasPrice: 0 }).should.be.rejected;
    const post = web3.eth.getBalance(user1);
    expect(post.sub(pre)).to.be.bignumber.equal(0);
  });


  it("should not let users without funds get a refund in underfunded state.", async function () {
    const pre = web3.eth.getBalance(user3);
    await theToken.requestRefund({ from: user3, gasPrice: 0 }).should.be.rejected;
    const post = web3.eth.getBalance(user3);
    expect(post.sub(pre)).to.be.bignumber.equal(0);
  });


});
