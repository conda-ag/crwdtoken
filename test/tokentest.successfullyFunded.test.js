import { reverting } from "./helpers/compare.js";
import { deployTokenJustLikeInMigrations } from './helpers/deployTokenHelper.js'

const { ether } = require("./helpers/currency.js");
let { wmul } = require("./helpers/calc.js");

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

contract('Token funded', function (accounts) {
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

  const user1SendFunds = ether("1");

  const weiICOMaximum = ether("100000");
  const weiICOMinimum = new BigNumber("0");

  const silencePeriod = new BigNumber("5");

  // must be adapted with number of tests
  let endBlock; //set in before()

  let currentBlockNumber;

  let theToken;

  before(async () => {
    console.log("redeploying...")
    theToken = await deployTokenJustLikeInMigrations(accounts);

    currentBlockNumber = new BigNumber(((await web3.eth.getBlock("latest")).number).toString());
    endBlock = currentBlockNumber.add(new BigNumber("40"));
  })

  it("should have an address", async function () {
    theToken.should.exist;
  });

  it("should have an owner from our known accounts", async function () {
    // Compare hex strings instead of numbers so errors become more readable.
    (await theToken.stateControl()).toString(16).should.be.equal(expectedStateControl.toString(16));
    (await theToken.whitelistControl()).toString(16).should.be.equal(expectedWhitelist.toString(16));
    (await theToken.withdrawControl()).toString(16).should.be.equal(expectedWithdraw.toString(16));
    (await theToken.miscNotLocked()).toString(16).should.be.equal(expectedNotLocked.toString(16));
    (await theToken.tokenAssignmentControl()).toString(16).should.be.equal(expectedTokenAssignmentControl.toString(16));
  });

  it("should be in Initial state", async function () {
    expect(await theToken.state()).to.be.bignumber.equal(States.Initial);
  });

  it("should have initial account balances", async function () {
    expect(await theToken.balanceOf(expectedNotLocked)).to.be.bignumber.equal(new BigNumber("0"));
  });

  it("should reject adding a presale amount during Initial.", async function () {
    const presaleAmount = new BigNumber("1000");
    // fails from others than the token assignment control account
    await theToken.addPresaleAmount(user2, presaleAmount, { from: expectedTokenAssignmentControl }).should.be.rejectedWith(revert);
    expect(await theToken.balanceOf(user2)).to.be.bignumber.equal(new BigNumber("0"));
  });

  it("should reject setting eth min and max thresholds without stateControlKey.", async function () {
    expect(await theToken.state()).to.be.bignumber.equal(States.Initial);
    expect(await theToken.weiICOMinimum()).to.be.bignumber.equal(new BigNumber("0"));
    expect(await theToken.weiICOMaximum()).to.be.bignumber.equal(new BigNumber("0"));
    await theToken.updateEthICOThresholds(weiICOMinimum, weiICOMaximum, "0", endBlock, { from: user1 }).should.be.rejected;
    expect(await theToken.weiICOMinimum()).to.be.bignumber.equal(new BigNumber("0"));
    expect(await theToken.weiICOMaximum()).to.be.bignumber.equal(new BigNumber("0"));
    expect(await theToken.endBlock()).to.be.bignumber.equal(new BigNumber("0"));
    expect(await theToken.state()).to.be.bignumber.equal(States.Initial);
  });

  it("should not let ICO start without correct key or without setting min and max.", async function () {
    await theToken.startICO().should.be.rejectedWith(revert);
    await theToken.startICO({ from: expectedStateControl }).should.be.rejectedWith(revert);
    // success keys is tested later on, in "should start ICO." (after updateEthICOThresholds has been called successfully)
  });

  it("should reject max smaller than min values.", async function () {
    await theToken.updateEthICOThresholds(weiICOMaximum, weiICOMinimum, "0", endBlock, { from: expectedStateControl }).should.be.rejectedWith(revert);
    expect(await theToken.weiICOMinimum()).to.be.bignumber.equal(new BigNumber("0"));
    expect(await theToken.weiICOMaximum()).to.be.bignumber.equal(new BigNumber("0"));
    expect(await theToken.state()).to.be.bignumber.equal(States.Initial);
  });

  it("should reject max smaller than min values with negative values.", async function () {
    await theToken.updateEthICOThresholds("-1", "-5", "0", endBlock, { from: expectedStateControl }).should.be.rejectedWith(revert);
    expect(await theToken.weiICOMinimum()).to.be.bignumber.equal(new BigNumber("0"));
    expect(await theToken.weiICOMaximum()).to.be.bignumber.equal(new BigNumber("0"));
    expect(await theToken.state()).to.be.bignumber.equal(States.Initial);
  });

  it("should accept correct min and max values with correct key.", async function () {
    const callResult = await theToken.updateEthICOThresholds(weiICOMinimum, weiICOMaximum, silencePeriod, endBlock, { from: expectedStateControl }).should.not.be.rejected;
    const expStateEvent = callResult.logs[0];
    expStateEvent.event.should.be.equal('StateTransition');
    expect(expStateEvent.args.oldState).to.be.bignumber.equal(States.Initial);
    expect(expStateEvent.args.newState).to.be.bignumber.equal(States.ValuationSet);
    expect(await theToken.weiICOMinimum()).to.be.bignumber.equal(weiICOMinimum);
    expect(await theToken.weiICOMaximum()).to.be.bignumber.equal(weiICOMaximum);
    expect(await theToken.endBlock()).to.be.bignumber.equal(endBlock);
    expect(await theToken.silencePeriod()).to.be.bignumber.equal(silencePeriod);
    expect(await theToken.ETH_CRWDTOKEN()).to.be.bignumber.equal((await theToken.maxTotalSupply()).mul(await theToken.percentForSale()).div(new BigNumber("100")).div(weiICOMaximum));
    expect(await theToken.state()).to.be.bignumber.equal(States.ValuationSet);
  });

  it("should allow adding a presale amount during Valuation.", async function () {
    const balanceBefore = (await theToken.balanceOf(user2));
    const presaleAmount = new BigNumber("1000");
    // fails from others than the token assignment control account
    await theToken.addPresaleAmount(user2, presaleAmount).should.be.rejectedWith(revert);
    await theToken.addPresaleAmount(user2, presaleAmount, { from: expectedTokenAssignmentControl }).should.not.be.rejected;
    expect(await theToken.balanceOf(user2)).to.be.bignumber.equal(balanceBefore.add(presaleAmount));
  });

  it("should start ICO.", async function () {
    await theToken.startICO({ from: expectedStateControl });
    expect(await theToken.state()).to.be.bignumber.equal(States.Ico);
  });

  it("should not whitelist by default address user1.", async function () {
    let isUser1Whitelisted = await theToken.whitelist(user1);
    isUser1Whitelisted.should.equal(false);
  });

  it("should fail to whitelist address user1 without correct key.", async function () {
    await theToken.addToWhitelist(user1).should.be.rejectedWith(revert);
    let isUser1Whitelisted = await theToken.whitelist(user1);
    isUser1Whitelisted.should.equal(false);
  });

  it("should fail to accept funds from non whitelisted address user1.", async function () {
    await theToken.sendTransaction({ from: user1, value: user1SendFunds }).should.be.rejectedWith(revert);
  });

  it("should whitelist address user1 with correct key.", async function () {
    const callResult = await theToken.addToWhitelist(user1, { from: expectedWhitelist }).should.not.be.rejected;
    const expWhitelistEvent = callResult.logs[0];
    expWhitelistEvent.event.should.be.equal('Whitelisted');
    expWhitelistEvent.args.addr.should.be.equal(user1);
    let isUser1Whitelisted = await theToken.whitelist(user1);
    isUser1Whitelisted.should.equal(true);
  });

  it("should fail to accept funds during silence period.", async function () {
    await theToken.sendTransaction({ from: user1, value: ether("1") }).should.be.rejectedWith(revert);
    await advanceToBlock(currentBlockNumber.add(new BigNumber("23")));
  });

  it("should accept funds from whitelisted address user1.", async function () {
    let isUser1Whitelisted = await theToken.whitelist(user1);
    const preBalance = new BigNumber(await web3.eth.getBalance(theToken.address));
    expect(preBalance).to.be.bignumber.equal(new BigNumber("0"));
    isUser1Whitelisted.should.equal(true);
    const etherSentToContract = user1SendFunds;
    const sendTransaction = theToken.sendTransaction({ from: user1, value: etherSentToContract });
    const callResult = await sendTransaction.should.not.be.rejected;
    const newBalance = new BigNumber(await web3.eth.getBalance(theToken.address));
    expect(preBalance.add(etherSentToContract)).to.be.bignumber.equal(newBalance);
    const expectedTokenAmount = (await theToken.ETH_CRWDTOKEN()).mul(etherSentToContract); //.mul(expectedBonusFactor);
    const expMintEvent = callResult.logs[0];
    // Mint(to: 0xb106a247aa0452d4b73c37e4d215568e604793c0, amount: 225000000000000000000)
    expMintEvent.event.should.be.equal('Mint');
    expMintEvent.args.to.should.be.equal(user1);
    expect(new BigNumber(expMintEvent.args.amount)).to.be.bignumber.equal(expectedTokenAmount);
    const expTxEvent = callResult.logs[1];
    // Transfer(from: 0x0, to: 0xb106a247aa0452d4b73c37e4d215568e604793c0, value: 225000000000000000000)
    expTxEvent.event.should.be.equal('Transfer');
    expTxEvent.args.from.should.be.equal('0x0000000000000000000000000000000000000000'); // on this specific token contract!
    expTxEvent.args.to.should.be.equal(user1);
    expect(expTxEvent.args.value).to.be.bignumber.equal(expectedTokenAmount);
    expect(await theToken.balanceOf(user1)).to.be.bignumber.equal(expectedTokenAmount);
    expect(await theToken.ethPossibleRefunds(user1)).to.be.bignumber.equal(etherSentToContract);
    // In this kind of token, the reserves stay 0 until ICO is finished. In others, this isn't the case.
    expect(await theToken.balanceOf(expectedNotLocked)).to.be.bignumber.equal(new BigNumber("0"));
  });

  it("should fail to accept funds above the limit from whitelisted address user1.", async function () {
    await theToken.sendTransaction({
      from: user1,
      value: weiICOMaximum + ether("1")
    }).should.be.rejectedWith(revert);
  });

  it("should allow adding a presale amount during ICO.", async function () {
    const balanceBefore = (await theToken.balanceOf(user2));
    const soldBefore = (await theToken.soldTokens());
    const totalBefore = (await theToken.totalSupply());
    const presaleAmount = new BigNumber("1000");
    const callResult = await theToken.addPresaleAmount(user2, presaleAmount, { from: expectedTokenAssignmentControl }).should.not.be.rejected;
    const expMintEvent = callResult.logs[0];
    expMintEvent.event.should.be.equal('Mint');
    expMintEvent.args.to.should.be.equal(user2);
    expect(expMintEvent.args.amount).to.be.bignumber.equal(presaleAmount);
    const expTxEvent = callResult.logs[1];
    expTxEvent.event.should.be.equal('Transfer');
    expTxEvent.args.from.should.be.equal('0x0000000000000000000000000000000000000000'); // on this specific token contract!
    expTxEvent.args.to.should.be.equal(user2);
    expect(expTxEvent.args.value).to.be.bignumber.equal(presaleAmount);
    expect(await theToken.balanceOf(user2)).to.be.bignumber.equal(balanceBefore.add(presaleAmount));
    expect(await theToken.soldTokens()).to.be.bignumber.equal(soldBefore.add(presaleAmount));
    expect(await theToken.totalSupply()).to.be.bignumber.equal(totalBefore.add(presaleAmount.mul(new BigNumber("100")).div(await theToken.percentForSale())));
    // addPresaleAmount should not allow integer overflow! We try with a value that would overflow to 1
    const targetedHugeAmount = (new BigNumber("2")).pow(new BigNumber("256")).sub(balanceBefore.add(presaleAmount)).add(new BigNumber("1"));
    await reverting(theToken.addPresaleAmount(user2, targetedHugeAmount, { from: expectedTokenAssignmentControl }));
    expect(await theToken.balanceOf(user2)).to.be.bignumber.equal(balanceBefore.add(presaleAmount));
  });

  it("should fail to stop ICO by anyone before ICO timeout.", async function () {
    expect(await theToken.state()).to.be.bignumber.equal(States.Ico);
    await theToken.anyoneEndICO().should.be.rejected;
    expect(await theToken.state()).to.be.bignumber.equal(States.Ico);
  });

  it("should reject funds from whitelisted address user1 after ICO timeout.", async function () {
    // make sure another investment works before the time jump, after which it is rejected.
    const investAmount = ether("0.001");
    await theToken.sendTransaction({ from: user1, value: investAmount }).should.not.be.rejected;
    expect(new BigNumber(await web3.eth.getBalance(theToken.address))).to.be.bignumber.below((new BigNumber(weiICOMaximum)).sub(investAmount));
    await advanceToBlock(endBlock.add(new BigNumber("1")));
    await theToken.sendTransaction({ from: user1, value: investAmount }).should.be.rejectedWith(revert);
  });

  it("should reject ETH withdrawal when still in ICO phase.", async function () {
    const withdrawAmount = (new BigNumber(ether("0.1")));
    await theToken.requestPayout(withdrawAmount, { from: expectedWithdraw }).should.be.rejectedWith(revert);
  });

  it("should accept stopping ICO by anyone after ICO timeout.", async function () {
    expect(await theToken.state()).to.be.bignumber.equal(States.Ico);
    const callResult = await theToken.anyoneEndICO().should.not.be.rejected;
    let totalSupply = await theToken.totalSupply();
    expect((await theToken.soldTokens()).mul(new BigNumber("100")).div(totalSupply)).to.be.bignumber.equal(await theToken.percentForSale());
    // We issue to multiple reserves buckets, we get Mint and Trasfer events for each.
    const reservesBuckets = [
      { address: await theToken.teamTimeLock(), percent: new BigNumber("15") },
      { address: await theToken.devTimeLock(), percent: new BigNumber("10") },
      { address: await theToken.countryTimeLock(), percent: new BigNumber("10") },
      { address: expectedNotLocked, percent: new BigNumber("15") },
    ];
    for (let i = 0; i < reservesBuckets.length; i++) {
      const expMintEvent = callResult.logs[i * 2];
      expMintEvent.event.should.be.equal('Mint');
      expMintEvent.args.to.should.be.equal(reservesBuckets[i].address);
      expect(new BigNumber(expMintEvent.args.amount).mul(new BigNumber("100")).div(totalSupply)).to.be.bignumber.equal(reservesBuckets[i].percent);
      const expTxEvent = callResult.logs[i * 2 + 1];
      expTxEvent.event.should.be.equal('Transfer');
      expTxEvent.args.from.should.be.equal('0x0000000000000000000000000000000000000000');
      expTxEvent.args.to.should.be.equal(reservesBuckets[i].address);
      expect(new BigNumber(expTxEvent.args.value).mul(new BigNumber("100")).div(totalSupply)).to.be.bignumber.equal(reservesBuckets[i].percent);
      expect((await theToken.balanceOf(reservesBuckets[i].address)).mul(new BigNumber("100")).div(totalSupply)).to.be.bignumber.equal(reservesBuckets[i].percent);
    }
    const expFinishedEvent = callResult.logs[reservesBuckets.length * 2];
    expFinishedEvent.event.should.be.equal('MintFinished');
    const expStateEvent = callResult.logs[reservesBuckets.length * 2 + 1];
    expStateEvent.event.should.be.equal('StateTransition');
    expect(new BigNumber(expStateEvent.args.oldState)).to.be.bignumber.equal(States.Ico);
    expect(new BigNumber(expStateEvent.args.newState)).to.be.bignumber.equal(States.Operational);
    expect(await theToken.state()).to.be.bignumber.equal(States.Operational);
  });

  it("should reject adding a presale amount after ICO.", async function () {
    const balanceBefore = (await theToken.balanceOf(user2));
    const presaleAmount = new BigNumber("1000");
    // fails from others than the token assignment control account
    await theToken.addPresaleAmount(user2, presaleAmount, { from: expectedTokenAssignmentControl }).should.be.rejectedWith(revert);
    expect(await theToken.balanceOf(user2)).to.be.bignumber.equal(balanceBefore);
  });

  it("should allow ETH withdrawal after ICO.", async function () {
    const withdrawAmount = (new BigNumber(ether("0.1")));
    const preBalance = new BigNumber(await web3.eth.getBalance(theToken.address));
    expect(preBalance).to.be.bignumber.above(withdrawAmount);
    const withdrawPreBalance = new BigNumber(await web3.eth.getBalance(expectedWithdraw));
    // fails from others than the withdraw control account
    await theToken.requestPayout(withdrawAmount).should.be.rejectedWith(revert);
    const callResult = await theToken.requestPayout(withdrawAmount, { from: expectedWithdraw }).should.not.be.rejected;
    const tx = await web3.eth.getTransaction(callResult.tx);
    const txCost = new BigNumber(tx.gasPrice).mul(new BigNumber(callResult.receipt.gasUsed));
    expect(new BigNumber(await web3.eth.getBalance(theToken.address))).to.be.bignumber.equal(preBalance.sub(withdrawAmount));
    expect(new BigNumber(await web3.eth.getBalance(expectedWithdraw))).to.be.bignumber.equal(withdrawPreBalance.add(withdrawAmount).sub(txCost));
  });

  it("should allow setting allowance and allowed user to transferFrom() the tokens.", async function () {
    const approveAmount = (new BigNumber(ether("0.1")));
    const callResult = await theToken.approve(user2, approveAmount, { from: user1 }).should.not.be.rejected;
    const expAllowEvent = callResult.logs[0];
    expAllowEvent.event.should.be.equal('Approval');
    expAllowEvent.args.owner.should.be.equal(user1);
    expAllowEvent.args.spender.should.be.equal(user2);
    expect(expAllowEvent.args.value).to.be.bignumber.equal(approveAmount);
    expect(await theToken.allowance(user1, user2)).to.be.bignumber.equal(approveAmount);
  });

  it("should allow to transferFrom() the allowed tokens.", async function () {
    const approveAmount = (await theToken.allowance(user1, user2));
    const preBalanceUser1 = (await theToken.balanceOf(user1));
    const preBalanceUser2 = (await theToken.balanceOf(user2));
    expect(preBalanceUser1).to.be.bignumber.above(approveAmount);
    // Sending to wrong users, too high amounts, or from others than the recipient fails.
    await reverting(theToken.transferFrom(user1, user3, approveAmount, { from: user3 }));
    await reverting(theToken.transferFrom(user1, user2, approveAmount.add(new BigNumber("1")), { from: user2 }));
    await reverting(theToken.transferFrom(user1, user2, approveAmount));
    const callResult = await theToken.transferFrom(user1, user2, approveAmount, { from: user2 }).should.not.be.rejected;
    const expTxEvent = callResult.logs[0];
    expTxEvent.event.should.be.equal('Transfer');
    expTxEvent.args.from.should.be.equal(user1);
    expTxEvent.args.to.should.be.equal(user2);
    expect(expTxEvent.args.value).to.be.bignumber.equal(approveAmount);
    expect(await theToken.balanceOf(user1)).to.be.bignumber.equal(preBalanceUser1.sub(approveAmount));
    expect(await theToken.balanceOf(user2)).to.be.bignumber.equal(preBalanceUser2.add(approveAmount));
    await reverting(theToken.transferFrom(user1, user2, "1", { from: user2 }));
  });

  it("should allow to transfer tokens to the token address.", async function () {
    const preBalanceUser = (await theToken.balanceOf(user2));
    const preBalanceToken = (await theToken.balanceOf(theToken.address));
    expect(preBalanceUser).to.be.bignumber.above(new BigNumber("0"));
    expect(preBalanceToken).to.be.bignumber.equal(new BigNumber("0"));
    // Sending to wrong users, too high amounts, or from others than the recipient fails.
    const callResult = await theToken.transfer(theToken.address, preBalanceUser, { from: user2 }).should.not.be.rejected;
    const expTxEvent = callResult.logs[0];
    expTxEvent.event.should.be.equal('Transfer');
    expTxEvent.args.from.should.be.equal(user2);
    expTxEvent.args.to.should.be.equal(theToken.address);
    expect(expTxEvent.args.value).to.be.bignumber.equal(preBalanceUser);
    expect(await theToken.balanceOf(user2)).to.be.bignumber.equal(new BigNumber("0"));
    expect(await theToken.balanceOf(theToken.address)).to.be.bignumber.equal(preBalanceToken.add(preBalanceUser));
    await reverting(theToken.transfer(theToken.address, "1", { from: user2 }));
  });

  it("should allow rescuing tokens wrongly assigned to its own address.", async function () {
    const preBalanceUser = (await theToken.balanceOf(user1));
    const preBalanceToken = (await theToken.balanceOf(theToken.address));
    await theToken.rescueToken(theToken.address, user1).should.be.rejectedWith(revert);
    const callResult = await theToken.rescueToken(theToken.address, user1, { from: expectedTokenAssignmentControl }).should.not.be.rejected;
    const expTxEvent = callResult.logs[0];
    expTxEvent.event.should.be.equal('Transfer');
    expTxEvent.args.from.should.be.equal(theToken.address);
    expTxEvent.args.to.should.be.equal(user1);
    expect(expTxEvent.args.value).to.be.bignumber.equal(preBalanceToken);
    expect(await theToken.balanceOf(theToken.address)).to.be.bignumber.equal(new BigNumber("0"));
    expect(await theToken.balanceOf(user1)).to.be.bignumber.equal(preBalanceToken.add(preBalanceUser));
  });

  // modifiers should reject out of range values

});