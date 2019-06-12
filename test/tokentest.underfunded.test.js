import { reverting } from "./helpers/compare.js";
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
  const weiICOMinimum = 0;

  const silencePeriod = 5;

  // this data structure must be kept in sync with States enum in the token's .sol
  const States = {
    Initial: 0, // deployment time
    ValuationSet: 1, // whitelist addresses, accept funds, update balances
    Ico: 2, // whitelist addresses, accept funds, update balances
    Underfunded: 3, // ICO time finished and minimal amount not raised
    Operational: 4, // production phase
    Paused: 5         // for contract upgrades
  };

  // must be adapted with number of tests
  let endBlock; //set in before()

  let currentBlockNumber;

  let theToken;

  before(async () => {
    console.log("redeploying...")
    theToken = await deployTokenJustLikeInMigrations(accounts);

    currentBlockNumber = (await web3.eth.getBlock("latest")).number;
    endBlock = currentBlockNumber + 40;
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
    expect(await theToken.balanceOf(expectedNotLocked)).to.be.bignumber.equal(0);
  });

  it("should reject adding a presale amount during Initial.", async function () {
    const presaleAmount = 1000;
    // fails from others than the token assignment control account
    await theToken.addPresaleAmount(user2, presaleAmount, { from: expectedTokenAssignmentControl }).should.be.rejectedWith(revert);
    expect(await theToken.balanceOf(user2)).to.be.bignumber.equal(0);
  });

  it("should reject setting eth min and max thresholds without stateControlKey.", async function () {
    expect(await theToken.state()).to.be.bignumber.equal(States.Initial);
    expect(await theToken.weiICOMinimum()).to.be.bignumber.equal(0);
    expect(await theToken.weiICOMaximum()).to.be.bignumber.equal(0);
    await theToken.updateEthICOThresholds(weiICOMinimum, weiICOMaximum, "0", endBlock, { from: user1 }).should.be.rejected;
    expect(await theToken.weiICOMinimum()).to.be.bignumber.equal(0);
    expect(await theToken.weiICOMaximum()).to.be.bignumber.equal(0);
    expect(await theToken.endBlock()).to.be.bignumber.equal(0);
    expect(await theToken.state()).to.be.bignumber.equal(States.Initial);
  });

  it("should not let ICO start without correct key or without setting min and max.", async function () {
    await theToken.startICO().should.be.rejectedWith(revert);
    await theToken.startICO({ from: expectedStateControl }).should.be.rejectedWith(revert);
    // success keys is tested later on, in "should start ICO." (after updateEthICOThresholds has been called successfully)
  });

  it("should reject max smaller than min values.", async function () {
    await theToken.updateEthICOThresholds(weiICOMaximum, weiICOMinimum, "0", endBlock, { from: expectedStateControl }).should.be.rejectedWith(revert);
    expect(await theToken.weiICOMinimum()).to.be.bignumber.equal(0);
    expect(await theToken.weiICOMaximum()).to.be.bignumber.equal(0);
    expect(await theToken.state()).to.be.bignumber.equal(States.Initial);
  });

  it("should reject max smaller than min values with negative values.", async function () {
    await theToken.updateEthICOThresholds("-1", "-5", "0", endBlock, { from: expectedStateControl }).should.be.rejectedWith(revert);
    expect(await theToken.weiICOMinimum()).to.be.bignumber.equal(0);
    expect(await theToken.weiICOMaximum()).to.be.bignumber.equal(0);
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
    expect(await theToken.ETH_CRWDTOKEN()).to.be.bignumber.equal((await theToken.maxTotalSupply()).mul(await theToken.percentForSale()).div(100).div(weiICOMaximum));
    expect(await theToken.state()).to.be.bignumber.equal(States.ValuationSet);
  });

  it("should allow adding a presale amount during Valuation.", async function () {
    const balanceBefore = (await theToken.balanceOf(user2));
    const presaleAmount = 1000;
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
    await advanceToBlock(currentBlockNumber + 23);
  });

  it("should accept funds from whitelisted address user1.", async function () {
    let isUser1Whitelisted = await theToken.whitelist(user1);
    const preBalance = await web3.eth.getBalance(theToken.address);
    expect(preBalance).to.be.bignumber.equal(0);
    isUser1Whitelisted.should.equal(true);
    const etherSentToContract = user1SendFunds;
    const sendTransaction = theToken.sendTransaction({ from: user1, value: etherSentToContract });
    const callResult = await sendTransaction.should.not.be.rejected;
    const newBalance = await web3.eth.getBalance(theToken.address);
    expect(preBalance.add(etherSentToContract)).to.be.bignumber.equal(newBalance);
    const expectedBonusFactor = 1.0; // bonusPhase is off, so we can always expect 1.0 here.
    const expectedTokenAmount = (await theToken.ETH_CRWDTOKEN()).mul(etherSentToContract).mul(expectedBonusFactor);
    const expMintEvent = callResult.logs[0];
    // Mint(to: 0xb106a247aa0452d4b73c37e4d215568e604793c0, amount: 225000000000000000000)
    expMintEvent.event.should.be.equal('Mint');
    expMintEvent.args.to.should.be.equal(user1);
    expect(expMintEvent.args.amount).to.be.bignumber.equal(expectedTokenAmount);
    const expTxEvent = callResult.logs[1];
    // Transfer(from: 0x0, to: 0xb106a247aa0452d4b73c37e4d215568e604793c0, value: 225000000000000000000)
    expTxEvent.event.should.be.equal('Transfer');
    expTxEvent.args.from.should.be.equal('0x0000000000000000000000000000000000000000'); // on this specific token contract!
    expTxEvent.args.to.should.be.equal(user1);
    expect(expTxEvent.args.value).to.be.bignumber.equal(expectedTokenAmount);
    expect(await theToken.balanceOf(user1)).to.be.bignumber.equal(expectedTokenAmount);
    expect(await theToken.ethPossibleRefunds(user1)).to.be.bignumber.equal(etherSentToContract);
    // In this kind of token, the reserves stay 0 until ICO is finished. In others, this isn't the case.
    expect(await theToken.balanceOf(expectedNotLocked)).to.be.bignumber.equal(0);
  });

  it("should fail to accept funds above the limit from whitelisted address user1.", async function () {
    await theToken.sendTransaction({
      from: user1,
      value: weiICOMaximum + ether("1")
    }).should.be.rejectedWith(revert);
  });

  it("should have the correct bonus applied when bonus phase is on.", async function () {
    const oneKTokens = (new BigNumber(ether("1"))).mul(1000);
    expect((await theToken.addBonus(oneKTokens.mul(1))).div(oneKTokens)).to.be.bignumber.equal(1);
    await theToken.setBonusPhase(true, { from: expectedStateControl });
    (await theToken.bonusPhase()).should.be.equal(true);
    let expectedBonuses = [
      { ktokens: 0.1, factor: 1.200 },
      { ktokens: 1.0, factor: 1.200 },
      { ktokens: 1.5, factor: 1.205 },
      { ktokens: 2.0, factor: 1.210 },
      { ktokens: 2.5, factor: 1.215 },
      { ktokens: 3.0, factor: 1.220 },
      { ktokens: 4.0, factor: 1.225 },
      { ktokens: 5.0, factor: 1.230 },
      { ktokens: 6.0, factor: 1.235 },
      { ktokens: 7.0, factor: 1.240 },
      { ktokens: 8.0, factor: 1.245 },
      { ktokens: 9.0, factor: 1.250 },
      { ktokens: 10, factor: 1.255 },
      { ktokens: 20, factor: 1.260 },
      { ktokens: 30, factor: 1.265 },
      { ktokens: 40, factor: 1.270 },
      { ktokens: 50, factor: 1.275 },
      { ktokens: 60, factor: 1.280 },
      { ktokens: 70, factor: 1.285 },
      { ktokens: 80, factor: 1.290 },
      { ktokens: 90, factor: 1.295 },
      { ktokens: 100, factor: 1.300 },
      { ktokens: 900, factor: 1.300 },
    ];
    for (let bonus of expectedBonuses) {
      expect((await theToken.addBonus(oneKTokens.mul(bonus.ktokens))).div(oneKTokens.mul(bonus.ktokens))).to.be.bignumber.equal(bonus.factor);
    }
    await theToken.setBonusPhase(false, { from: expectedStateControl });
    (await theToken.bonusPhase()).should.be.equal(false);
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
    expect(await theToken.totalSupply()).to.be.bignumber.equal(totalBefore.add(presaleAmount.mul(100).div(await theToken.percentForSale())));
    // addPresaleAmount should not allow integer overflow! We try with a value that would overflow to 1
    const targetedHugeAmount = (new BigNumber("2")).pow(256).sub(balanceBefore.add(presaleAmount)).add(1);
    await reverting(theToken.addPresaleAmount(user2, targetedHugeAmount, { from: expectedTokenAssignmentControl }));
    expect(await theToken.balanceOf(user2)).to.be.bignumber.equal(balanceBefore.add(presaleAmount));
  });

  it("should reject assignment and release inside of a timelock contract.", async function () {
    let timelockAddress = await theToken.teamTimeLock();
    let timelock = TimelockContract.at(timelockAddress);
    expect(await theToken.balanceOf(timelockAddress)).to.be.bignumber.equal(0);
    const tokenAssginmentAmount = 1000; // depends on bonus scheme!
    await timelock.assignToBeneficiary(user1, tokenAssginmentAmount, { from: ownerLockedTeam }).should.be.rejectedWith(revert);
    await timelock.release(user1).should.be.rejectedWith(revert);
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
    expect(await web3.eth.getBalance(theToken.address)).to.be.bignumber.below((new BigNumber(weiICOMaximum)).sub(investAmount));
    await advanceToBlock(endBlock + 1);
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
    expect((await theToken.soldTokens()).mul(100).div(totalSupply)).to.be.bignumber.equal(await theToken.percentForSale());
    // We issue to multiple reserves buckets, we get Mint and Trasfer events for each.
    const reservesBuckets = [
      { address: await theToken.teamTimeLock(), percent: 15 },
      { address: await theToken.devTimeLock(), percent: 10 },
      { address: await theToken.countryTimeLock(), percent: 10 },
      { address: expectedNotLocked, percent: 15 },
    ];
    for (let i = 0; i < reservesBuckets.length; i++) {
      const expMintEvent = callResult.logs[i * 2];
      expMintEvent.event.should.be.equal('Mint');
      expMintEvent.args.to.should.be.equal(reservesBuckets[i].address);
      expect(expMintEvent.args.amount.mul(100).div(totalSupply)).to.be.bignumber.equal(reservesBuckets[i].percent);
      const expTxEvent = callResult.logs[i * 2 + 1];
      expTxEvent.event.should.be.equal('Transfer');
      expTxEvent.args.from.should.be.equal('0x0000000000000000000000000000000000000000');
      expTxEvent.args.to.should.be.equal(reservesBuckets[i].address);
      expect(expTxEvent.args.value.mul(100).div(totalSupply)).to.be.bignumber.equal(reservesBuckets[i].percent);
      expect((await theToken.balanceOf(reservesBuckets[i].address)).mul(100).div(totalSupply)).to.be.bignumber.equal(reservesBuckets[i].percent);
    }
    const expFinishedEvent = callResult.logs[reservesBuckets.length * 2];
    expFinishedEvent.event.should.be.equal('MintFinished');
    const expStateEvent = callResult.logs[reservesBuckets.length * 2 + 1];
    expStateEvent.event.should.be.equal('StateTransition');
    expect(expStateEvent.args.oldState).to.be.bignumber.equal(States.Ico);
    expect(expStateEvent.args.newState).to.be.bignumber.equal(States.Operational);
    expect(await theToken.state()).to.be.bignumber.equal(States.Operational);
  });

  it("should reject adding a presale amount after ICO.", async function () {
    const balanceBefore = (await theToken.balanceOf(user2));
    const presaleAmount = 1000;
    // fails from others than the token assignment control account
    await theToken.addPresaleAmount(user2, presaleAmount, { from: expectedTokenAssignmentControl }).should.be.rejectedWith(revert);
    expect(await theToken.balanceOf(user2)).to.be.bignumber.equal(balanceBefore);
  });

  it("should allow ETH withdrawal after ICO.", async function () {
    const withdrawAmount = (new BigNumber(ether("0.1")));
    const preBalance = await web3.eth.getBalance(theToken.address);
    expect(preBalance).to.be.bignumber.above(withdrawAmount);
    const withdrawPreBalance = await web3.eth.getBalance(expectedWithdraw);
    // fails from others than the withdraw control account
    await theToken.requestPayout(withdrawAmount).should.be.rejectedWith(revert);
    const callResult = await theToken.requestPayout(withdrawAmount, { from: expectedWithdraw }).should.not.be.rejected;
    const tx = await web3.eth.getTransaction(callResult.tx);
    const txCost = tx.gasPrice.mul(callResult.receipt.gasUsed);
    expect(await web3.eth.getBalance(theToken.address)).to.be.bignumber.equal(preBalance.sub(withdrawAmount));
    expect(await web3.eth.getBalance(expectedWithdraw)).to.be.bignumber.equal(withdrawPreBalance.add(withdrawAmount).sub(txCost));
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
    await reverting(theToken.transferFrom(user1, user2, approveAmount.add(1), { from: user2 }));
    await reverting(theToken.transferFrom(user1, user2, approveAmount));
    const callResult = await theToken.transferFrom(user1, user2, approveAmount, { from: user2 }).should.not.be.rejected;
    const expTxEvent = callResult.logs[0];
    expTxEvent.event.should.be.equal('Transfer');
    expTxEvent.args.from.should.be.equal(user1);
    expTxEvent.args.to.should.be.equal(user2);
    expect(expTxEvent.args.value).to.be.bignumber.equal(approveAmount);
    expect(await theToken.balanceOf(user1)).to.be.bignumber.equal(preBalanceUser1.sub(approveAmount));
    expect(await theToken.balanceOf(user2)).to.be.bignumber.equal(preBalanceUser2.add(approveAmount));
    await reverting(theToken.transferFrom(user1, user2, 1, { from: user2 }));
  });

  it("should allow to transfer tokens to the token address.", async function () {
    const preBalanceUser = (await theToken.balanceOf(user2));
    const preBalanceToken = (await theToken.balanceOf(theToken.address));
    expect(preBalanceUser).to.be.bignumber.above(0);
    expect(preBalanceToken).to.be.bignumber.equal(0);
    // Sending to wrong users, too high amounts, or from others than the recipient fails.
    const callResult = await theToken.transfer(theToken.address, preBalanceUser, { from: user2 }).should.not.be.rejected;
    const expTxEvent = callResult.logs[0];
    expTxEvent.event.should.be.equal('Transfer');
    expTxEvent.args.from.should.be.equal(user2);
    expTxEvent.args.to.should.be.equal(theToken.address);
    expect(expTxEvent.args.value).to.be.bignumber.equal(preBalanceUser);
    expect(await theToken.balanceOf(user2)).to.be.bignumber.equal(0);
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
    expect(await theToken.balanceOf(theToken.address)).to.be.bignumber.equal(0);
    expect(await theToken.balanceOf(user1)).to.be.bignumber.equal(preBalanceToken.add(preBalanceUser));
  });

  it("should allow assignment inside of a timelock contract.", async function () {
    let timelockAddress = await theToken.teamTimeLock();
    let timelock = TimelockContract.at(timelockAddress);
    let timelockAmount = (await theToken.balanceOf(timelockAddress));
    const tokenAssginmentUser1 = 10000;
    const tokenAssginmentUser1_post = 9000;
    const tokenAssginmentUser2 = 5000;
    expect(timelockAmount).to.be.bignumber.above(tokenAssginmentUser1 + tokenAssginmentUser2);
    // assigning more than the contract has should fail.
    await timelock.assignToBeneficiary(user1, timelockAmount.add(1), { from: ownerLockedTeam }).should.be.rejected;
    expect(await timelock.balances(user1)).to.be.bignumber.equal(0);
    expect(await timelock.assignedBalance()).to.be.bignumber.equal(0);
    // Should be rejected when "anyone" calls it, succeed when contract owner is the caller.
    await timelock.assignToBeneficiary(user1, tokenAssginmentUser1).should.be.rejected;
    await timelock.assignToBeneficiary(user1, tokenAssginmentUser1, { from: ownerLockedTeam }).should.not.be.rejected;
    expect(await timelock.balances(user1)).to.be.bignumber.equal(tokenAssginmentUser1);
    expect(await timelock.assignedBalance()).to.be.bignumber.equal(tokenAssginmentUser1);
    // Try a second assignment to see if assigned balance adjusts correctly.
    await timelock.assignToBeneficiary(user2, tokenAssginmentUser2, { from: ownerLockedTeam }).should.not.be.rejected;
    expect(await timelock.balances(user2)).to.be.bignumber.equal(tokenAssginmentUser2);
    expect(await timelock.assignedBalance()).to.be.bignumber.equal(tokenAssginmentUser1 + tokenAssginmentUser2);
    // Set user1 to lower assignment to check if that works fine as well.
    await timelock.assignToBeneficiary(user1, tokenAssginmentUser1_post, { from: ownerLockedTeam }).should.not.be.rejected;
    expect(await timelock.balances(user1)).to.be.bignumber.equal(tokenAssginmentUser1_post);
    expect(await timelock.assignedBalance()).to.be.bignumber.equal(tokenAssginmentUser1_post + tokenAssginmentUser2);
    // Now try assigning just more than we have available.
    let aBitTooMuch = timelockAmount.sub(await timelock.assignedBalance()).add(1);
    await timelock.assignToBeneficiary(user3, aBitTooMuch, { from: ownerLockedTeam }).should.be.rejectedWith(revert);
    // Release still does not work as it's still timelocked.
    await timelock.release(user1).should.be.rejectedWith(revert);
    // Jump blockchain to a point where timelock is lifted and we can release tokens.
    await increaseTime(duration.days(9 * 31));
    // Now release user1 tokens and check that everything work correctly with that.
    let user1balance_pre = await theToken.balanceOf(user1);
    await timelock.release(user1).should.not.be.rejected;
    expect(await timelock.balances(user1)).to.be.bignumber.equal(0);
    expect(await timelock.assignedBalance()).to.be.bignumber.equal(tokenAssginmentUser2);
    expect(await theToken.balanceOf(user1)).to.be.bignumber.equal(user1balance_pre.add(tokenAssginmentUser1_post));
    expect(await theToken.balanceOf(timelockAddress)).to.be.bignumber.equal(timelockAmount.sub(tokenAssginmentUser1_post));
  });

  // modifiers should reject out of range values

});


contract('Token funded and stopped by admin and operational.', function (accounts) {

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
  const weiICOMinimum = ether("0");

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

  it("should accept stopping ICO by admin before ICO timeout.", async function () {
    expect(await theToken.state()).to.be.bignumber.equal(States.Ico);
    await theToken.endICO({ from: expectedStateControl }).should.not.be.rejected;
    expect(await theToken.state()).to.be.bignumber.equal(States.Operational);
  });

});


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
    const pre = await web3.eth.getBalance(user1);
    await theToken.requestRefund({ from: user1, gasPrice: 0 }).should.be.rejected;
    const post = await web3.eth.getBalance(user1);
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
    const pre = await web3.eth.getBalance(user1);
    await theToken.requestRefund({ from: user1, gasPrice: 0 }).should.not.be.rejected;
    const post = await web3.eth.getBalance(user1);
    expect(post.sub(pre)).to.be.bignumber.equal(user1SendFunds);
  });

  it("should not let users get their refund twice in underfunded state.", async function () {
    const pre = await web3.eth.getBalance(user1);
    await theToken.requestRefund({ from: user1, gasPrice: 0 }).should.be.rejected;
    const post = await web3.eth.getBalance(user1);
    expect(post.sub(pre)).to.be.bignumber.equal(0);
  });


  it("should not let users without funds get a refund in underfunded state.", async function () {
    const pre = await web3.eth.getBalance(user3);
    await theToken.requestRefund({ from: user3, gasPrice: 0 }).should.be.rejected;
    const post = await web3.eth.getBalance(user3);
    expect(post.sub(pre)).to.be.bignumber.equal(0);
  });


});


contract('TokenContract paused and restarted and aborted', function (accounts) {

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

  it("should accept funds from whitelisted address user1.", async function () {
    let isUser1Whitelisted = await theToken.whitelist(user1);
    isUser1Whitelisted.should.equal(true);
    await theToken.sendTransaction({ from: user1, value: user1SendFunds }).should.not.be.rejected;
  });


  it("should not move to paused state when called with a user key.", async function () {
    await theToken.pause().should.be.rejectedWith(revert);
    expect(await theToken.state()).to.be.bignumber.equal(States.Ico);
  });

  it("should move to paused state when called with state control key.", async function () {
    await theToken.pause({ from: expectedStateControl });
    expect(await theToken.state()).to.be.bignumber.equal(States.Paused);
  });

  it("should not be resumed when called with a user key.", async function () {
    await theToken.resumeICO().should.be.rejectedWith(revert);
    expect(await theToken.state()).to.be.bignumber.equal(States.Paused);
  });

  it("should be resumed when called with state control key.", async function () {
    await theToken.resumeICO({ from: expectedStateControl });
    expect(await theToken.state()).to.be.bignumber.equal(States.Ico);
  });

  it("should move again to paused state when called with state control key.", async function () {
    await theToken.pause({ from: expectedStateControl });
    expect(await theToken.state()).to.be.bignumber.equal(States.Paused);
  });

  it("should be aborted when called with state control key.", async function () {
    await theToken.abort({ from: expectedStateControl });
    expect(await theToken.state()).to.be.bignumber.equal(States.Underfunded);
  });

  it("should reject new funding in underfunded state.", async function () {
    await theToken.sendTransaction({ from: user1, value: ether("1") }).should.be.rejectedWith(revert);
  });

  it("should let users withdraw funds in underfunded state.", async function () {
    const pre = await web3.eth.getBalance(user1);
    await theToken.requestRefund({ from: user1, gasPrice: 0 }).should.not.be.rejected;
    const post = await web3.eth.getBalance(user1);
    expect(post.sub(pre)).to.be.bignumber.equal(user1SendFunds);
  });

});
