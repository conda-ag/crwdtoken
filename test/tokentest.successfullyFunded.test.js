import { reverting } from "./helpers/compare.js";
import { deployTokenJustLikeInMigrations } from './helpers/deployTokenHelper.js'

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

  const user1SendFunds = web3.toWei("1", "ether");

  const weiICOMaximum = web3.toWei("100000", "ether");
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
    (await theToken.state()).should.be.bignumber.equal(States.Initial);
  });

  it("should have initial account balances", async function () {
    (await theToken.balanceOf(expectedNotLocked)).should.be.bignumber.equal(0);
  });

  it("should reject adding a presale amount during Initial.", async function () {
    const presaleAmount = 1000;
    // fails from others than the token assignment control account
    await theToken.addPresaleAmount(user2, presaleAmount, { from: expectedTokenAssignmentControl }).should.be.rejectedWith(revert);
    (await theToken.balanceOf(user2)).should.be.bignumber.equal(0);
  });

  it("should reject setting eth min and max thresholds without stateControlKey.", async function () {
    (await theToken.state()).should.be.bignumber.equal(States.Initial);
    (await theToken.weiICOMinimum()).should.be.bignumber.equal(0);
    (await theToken.weiICOMaximum()).should.be.bignumber.equal(0);
    await theToken.updateEthICOThresholds(weiICOMinimum, weiICOMaximum, "0", endBlock, { from: user1 }).should.be.rejected;
    (await theToken.weiICOMinimum()).should.be.bignumber.equal(0);
    (await theToken.weiICOMaximum()).should.be.bignumber.equal(0);
    (await theToken.endBlock()).should.be.bignumber.equal(0);
    (await theToken.state()).should.be.bignumber.equal(States.Initial);
  });

  it("should not let ICO start without correct key or without setting min and max.", async function () {
    await theToken.startICO().should.be.rejectedWith(revert);
    await theToken.startICO({ from: expectedStateControl }).should.be.rejectedWith(revert);
    // success keys is tested later on, in "should start ICO." (after updateEthICOThresholds has been called successfully)
  });

  it("should reject max smaller than min values.", async function () {
    await theToken.updateEthICOThresholds(weiICOMaximum, weiICOMinimum, "0", endBlock, { from: expectedStateControl }).should.be.rejectedWith(revert);
    (await theToken.weiICOMinimum()).should.be.bignumber.equal(0);
    (await theToken.weiICOMaximum()).should.be.bignumber.equal(0);
    (await theToken.state()).should.be.bignumber.equal(States.Initial);
  });

  it("should reject max smaller than min values with negative values.", async function () {
    await theToken.updateEthICOThresholds("-1", "-5", "0", endBlock, { from: expectedStateControl }).should.be.rejectedWith(revert);
    (await theToken.weiICOMinimum()).should.be.bignumber.equal(0);
    (await theToken.weiICOMaximum()).should.be.bignumber.equal(0);
    (await theToken.state()).should.be.bignumber.equal(States.Initial);
  });

  it("should accept correct min and max values with correct key.", async function () {
    const callResult = await theToken.updateEthICOThresholds(weiICOMinimum, weiICOMaximum, silencePeriod, endBlock, { from: expectedStateControl }).should.not.be.rejected;
    const expStateEvent = callResult.logs[0];
    expStateEvent.event.should.be.equal('StateTransition');
    expStateEvent.args.oldState.should.be.bignumber.equal(States.Initial);
    expStateEvent.args.newState.should.be.bignumber.equal(States.ValuationSet);
    (await theToken.weiICOMinimum()).should.be.bignumber.equal(weiICOMinimum);
    (await theToken.weiICOMaximum()).should.be.bignumber.equal(weiICOMaximum);
    (await theToken.endBlock()).should.be.bignumber.equal(endBlock);
    (await theToken.silencePeriod()).should.be.bignumber.equal(silencePeriod);
    (await theToken.ETH_CRWDTOKEN()).should.be.bignumber.equal((await theToken.maxTotalSupply()).times(await theToken.percentForSale()).div(100).div(weiICOMaximum));
    (await theToken.state()).should.be.bignumber.equal(States.ValuationSet);
  });

  it("should allow adding a presale amount during Valuation.", async function () {
    const balanceBefore = (await theToken.balanceOf(user2));
    const presaleAmount = 1000;
    // fails from others than the token assignment control account
    await theToken.addPresaleAmount(user2, presaleAmount).should.be.rejectedWith(revert);
    await theToken.addPresaleAmount(user2, presaleAmount, { from: expectedTokenAssignmentControl }).should.not.be.rejected;
    (await theToken.balanceOf(user2)).should.be.bignumber.equal(balanceBefore.plus(presaleAmount));
  });

  it("should start ICO.", async function () {
    await theToken.startICO({ from: expectedStateControl });
    (await theToken.state()).should.be.bignumber.equal(States.Ico);
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
    await theToken.sendTransaction({ from: user1, value: web3.toWei("1", "ether") }).should.be.rejectedWith(revert);
    await advanceToBlock(currentBlockNumber + 23);
  });

  it("should accept funds from whitelisted address user1.", async function () {
    let isUser1Whitelisted = await theToken.whitelist(user1);
    const preBalance = web3.eth.getBalance(theToken.address);
    preBalance.should.be.bignumber.equal(0);
    isUser1Whitelisted.should.equal(true);
    const etherSentToContract = user1SendFunds;
    const sendTransaction = theToken.sendTransaction({ from: user1, value: etherSentToContract });
    const callResult = await sendTransaction.should.not.be.rejected;
    const newBalance = web3.eth.getBalance(theToken.address);
    preBalance.plus(etherSentToContract).should.be.bignumber.equal(newBalance);
    const expectedBonusFactor = 1.0; // bonusPhase is off, so we can always expect 1.0 here.
    const expectedTokenAmount = (await theToken.ETH_CRWDTOKEN()).times(etherSentToContract).times(expectedBonusFactor);
    const expMintEvent = callResult.logs[0];
    // Mint(to: 0xb106a247aa0452d4b73c37e4d215568e604793c0, amount: 225000000000000000000)
    expMintEvent.event.should.be.equal('Mint');
    expMintEvent.args.to.should.be.equal(user1);
    expMintEvent.args.amount.should.be.bignumber.equal(expectedTokenAmount);
    const expTxEvent = callResult.logs[1];
    // Transfer(from: 0x0, to: 0xb106a247aa0452d4b73c37e4d215568e604793c0, value: 225000000000000000000)
    expTxEvent.event.should.be.equal('Transfer');
    expTxEvent.args.from.should.be.equal('0x0000000000000000000000000000000000000000'); // on this specific token contract!
    expTxEvent.args.to.should.be.equal(user1);
    expTxEvent.args.value.should.be.bignumber.equal(expectedTokenAmount);
    (await theToken.balanceOf(user1)).should.be.bignumber.equal(expectedTokenAmount);
    (await theToken.ethPossibleRefunds(user1)).should.be.bignumber.equal(etherSentToContract);
    // In this kind of token, the reserves stay 0 until ICO is finished. In others, this isn't the case.
    (await theToken.balanceOf(expectedNotLocked)).should.be.bignumber.equal(0);
  });

  it("should fail to accept funds above the limit from whitelisted address user1.", async function () {
    await theToken.sendTransaction({
      from: user1,
      value: weiICOMaximum + web3.toWei("1", "ether")
    }).should.be.rejectedWith(revert);
  });

  it("should have the correct bonus applied when bonus phase is on.", async function () {
    const oneKTokens = (new BigNumber(web3.toWei("1", "ether"))).times(1000);
    (await theToken.addBonus(oneKTokens.times(1))).dividedBy(oneKTokens).should.be.bignumber.equal(1);
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
      (await theToken.addBonus(oneKTokens.times(bonus.ktokens))).dividedBy(oneKTokens.times(bonus.ktokens)).should.be.bignumber.equal(bonus.factor);
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
    expMintEvent.args.amount.should.be.bignumber.equal(presaleAmount);
    const expTxEvent = callResult.logs[1];
    expTxEvent.event.should.be.equal('Transfer');
    expTxEvent.args.from.should.be.equal('0x0000000000000000000000000000000000000000'); // on this specific token contract!
    expTxEvent.args.to.should.be.equal(user2);
    expTxEvent.args.value.should.be.bignumber.equal(presaleAmount);
    (await theToken.balanceOf(user2)).should.be.bignumber.equal(balanceBefore.plus(presaleAmount));
    (await theToken.soldTokens()).should.be.bignumber.equal(soldBefore.plus(presaleAmount));
    (await theToken.totalSupply()).should.be.bignumber.equal(totalBefore.plus(presaleAmount.times(100).div(await theToken.percentForSale())));
    // addPresaleAmount should not allow integer overflow! We try with a value that would overflow to 1
    const targetedHugeAmount = (new BigNumber("2")).pow(256).minus(balanceBefore.plus(presaleAmount)).plus(1);
    await reverting(theToken.addPresaleAmount(user2, targetedHugeAmount, { from: expectedTokenAssignmentControl }));
    (await theToken.balanceOf(user2)).should.be.bignumber.equal(balanceBefore.plus(presaleAmount));
  });

  it("should reject assignment and release inside of a timelock contract.", async function () {
    let timelockAddress = await theToken.teamTimeLock();
    let timelock = TimelockContract.at(timelockAddress);
    (await theToken.balanceOf(timelockAddress)).should.be.bignumber.equal(0);
    const tokenAssginmentAmount = 1000; // depends on bonus scheme!
    await timelock.assignToBeneficiary(user1, tokenAssginmentAmount, { from: ownerLockedTeam }).should.be.rejectedWith(revert);
    await timelock.release(user1).should.be.rejectedWith(revert);
  });

  it("should fail to stop ICO by anyone before ICO timeout.", async function () {
    (await theToken.state()).should.be.bignumber.equal(States.Ico);
    await theToken.anyoneEndICO().should.be.rejected;
    (await theToken.state()).should.be.bignumber.equal(States.Ico);
  });

  it("should reject funds from whitelisted address user1 after ICO timeout.", async function () {
    // make sure another investment works before the time jump, after which it is rejected.
    const investAmount = web3.toWei("0.001", "ether");
    await theToken.sendTransaction({ from: user1, value: investAmount }).should.not.be.rejected;
    web3.eth.getBalance(theToken.address).should.be.bignumber.below((new BigNumber(weiICOMaximum)).minus(investAmount));
    await advanceToBlock(endBlock + 1);
    await theToken.sendTransaction({ from: user1, value: investAmount }).should.be.rejectedWith(revert);
  });

  it("should reject ETH withdrawal when still in ICO phase.", async function () {
    const withdrawAmount = (new BigNumber(web3.toWei("0.1", "ether")));
    await theToken.requestPayout(withdrawAmount, { from: expectedWithdraw }).should.be.rejectedWith(revert);
  });

  it("should accept stopping ICO by anyone after ICO timeout.", async function () {
    (await theToken.state()).should.be.bignumber.equal(States.Ico);
    const callResult = await theToken.anyoneEndICO().should.not.be.rejected;
    let totalSupply = await theToken.totalSupply();
    (await theToken.soldTokens()).times(100).dividedBy(totalSupply).should.be.bignumber.equal(await theToken.percentForSale());
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
      expMintEvent.args.amount.times(100).dividedBy(totalSupply).should.be.bignumber.equal(reservesBuckets[i].percent);
      const expTxEvent = callResult.logs[i * 2 + 1];
      expTxEvent.event.should.be.equal('Transfer');
      expTxEvent.args.from.should.be.equal('0x0000000000000000000000000000000000000000');
      expTxEvent.args.to.should.be.equal(reservesBuckets[i].address);
      expTxEvent.args.value.times(100).dividedBy(totalSupply).should.be.bignumber.equal(reservesBuckets[i].percent);
      (await theToken.balanceOf(reservesBuckets[i].address)).times(100).dividedBy(totalSupply).should.be.bignumber.equal(reservesBuckets[i].percent);
    }
    const expFinishedEvent = callResult.logs[reservesBuckets.length * 2];
    expFinishedEvent.event.should.be.equal('MintFinished');
    const expStateEvent = callResult.logs[reservesBuckets.length * 2 + 1];
    expStateEvent.event.should.be.equal('StateTransition');
    expStateEvent.args.oldState.should.be.bignumber.equal(States.Ico);
    expStateEvent.args.newState.should.be.bignumber.equal(States.Operational);
    (await theToken.state()).should.be.bignumber.equal(States.Operational);
  });

  it("should reject adding a presale amount after ICO.", async function () {
    const balanceBefore = (await theToken.balanceOf(user2));
    const presaleAmount = 1000;
    // fails from others than the token assignment control account
    await theToken.addPresaleAmount(user2, presaleAmount, { from: expectedTokenAssignmentControl }).should.be.rejectedWith(revert);
    (await theToken.balanceOf(user2)).should.be.bignumber.equal(balanceBefore);
  });

  it("should allow ETH withdrawal after ICO.", async function () {
    const withdrawAmount = (new BigNumber(web3.toWei("0.1", "ether")));
    const preBalance = web3.eth.getBalance(theToken.address);
    preBalance.should.be.bignumber.above(withdrawAmount);
    const withdrawPreBalance = web3.eth.getBalance(expectedWithdraw);
    // fails from others than the withdraw control account
    await theToken.requestPayout(withdrawAmount).should.be.rejectedWith(revert);
    const callResult = await theToken.requestPayout(withdrawAmount, { from: expectedWithdraw }).should.not.be.rejected;
    const tx = await web3.eth.getTransaction(callResult.tx);
    const txCost = tx.gasPrice.times(callResult.receipt.gasUsed);
    web3.eth.getBalance(theToken.address).should.be.bignumber.equal(preBalance.minus(withdrawAmount));
    web3.eth.getBalance(expectedWithdraw).should.be.bignumber.equal(withdrawPreBalance.plus(withdrawAmount).minus(txCost));
  });

  it("should allow setting allowance and allowed user to transferFrom() the tokens.", async function () {
    const approveAmount = (new BigNumber(web3.toWei("0.1", "ether")));
    const callResult = await theToken.approve(user2, approveAmount, { from: user1 }).should.not.be.rejected;
    const expAllowEvent = callResult.logs[0];
    expAllowEvent.event.should.be.equal('Approval');
    expAllowEvent.args.owner.should.be.equal(user1);
    expAllowEvent.args.spender.should.be.equal(user2);
    expAllowEvent.args.value.should.be.bignumber.equal(approveAmount);
    (await theToken.allowance(user1, user2)).should.be.bignumber.equal(approveAmount);
  });

  it("should allow to transferFrom() the allowed tokens.", async function () {
    const approveAmount = (await theToken.allowance(user1, user2));
    const preBalanceUser1 = (await theToken.balanceOf(user1));
    const preBalanceUser2 = (await theToken.balanceOf(user2));
    preBalanceUser1.should.be.bignumber.above(approveAmount);
    // Sending to wrong users, too high amounts, or from others than the recipient fails.
    await reverting(theToken.transferFrom(user1, user3, approveAmount, { from: user3 }));
    await reverting(theToken.transferFrom(user1, user2, approveAmount.plus(1), { from: user2 }));
    await reverting(theToken.transferFrom(user1, user2, approveAmount));
    const callResult = await theToken.transferFrom(user1, user2, approveAmount, { from: user2 }).should.not.be.rejected;
    const expTxEvent = callResult.logs[0];
    expTxEvent.event.should.be.equal('Transfer');
    expTxEvent.args.from.should.be.equal(user1);
    expTxEvent.args.to.should.be.equal(user2);
    expTxEvent.args.value.should.be.bignumber.equal(approveAmount);
    (await theToken.balanceOf(user1)).should.be.bignumber.equal(preBalanceUser1.minus(approveAmount));
    (await theToken.balanceOf(user2)).should.be.bignumber.equal(preBalanceUser2.plus(approveAmount));
    await reverting(theToken.transferFrom(user1, user2, "1", { from: user2 }));
  });

  it("should allow to transfer tokens to the token address.", async function () {
    const preBalanceUser = (await theToken.balanceOf(user2));
    const preBalanceToken = (await theToken.balanceOf(theToken.address));
    preBalanceUser.should.be.bignumber.above(0);
    preBalanceToken.should.be.bignumber.equal(0);
    // Sending to wrong users, too high amounts, or from others than the recipient fails.
    const callResult = await theToken.transfer(theToken.address, preBalanceUser, { from: user2 }).should.not.be.rejected;
    const expTxEvent = callResult.logs[0];
    expTxEvent.event.should.be.equal('Transfer');
    expTxEvent.args.from.should.be.equal(user2);
    expTxEvent.args.to.should.be.equal(theToken.address);
    expTxEvent.args.value.should.be.bignumber.equal(preBalanceUser);
    (await theToken.balanceOf(user2)).should.be.bignumber.equal(0);
    (await theToken.balanceOf(theToken.address)).should.be.bignumber.equal(preBalanceToken.plus(preBalanceUser));
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
    expTxEvent.args.value.should.be.bignumber.equal(preBalanceToken);
    (await theToken.balanceOf(theToken.address)).should.be.bignumber.equal(0);
    (await theToken.balanceOf(user1)).should.be.bignumber.equal(preBalanceToken.plus(preBalanceUser));
  });

  it("should allow assignment inside of a timelock contract.", async function () {
    let timelockAddress = await theToken.teamTimeLock();
    let timelock = TimelockContract.at(timelockAddress);
    let timelockAmount = (await theToken.balanceOf(timelockAddress));
    const tokenAssginmentUser1 = 10000;
    const tokenAssginmentUser1_post = 9000;
    const tokenAssginmentUser2 = 5000;
    timelockAmount.should.be.bignumber.above(tokenAssginmentUser1 + tokenAssginmentUser2);
    // assigning more than the contract has should fail.
    await timelock.assignToBeneficiary(user1, timelockAmount.plus(1), { from: ownerLockedTeam }).should.be.rejected;
    (await timelock.balances(user1)).should.be.bignumber.equal(0);
    (await timelock.assignedBalance()).should.be.bignumber.equal(0);
    // Should be rejected when "anyone" calls it, succeed when contract owner is the caller.
    await timelock.assignToBeneficiary(user1, tokenAssginmentUser1).should.be.rejected;
    await timelock.assignToBeneficiary(user1, tokenAssginmentUser1, { from: ownerLockedTeam }).should.not.be.rejected;
    (await timelock.balances(user1)).should.be.bignumber.equal(tokenAssginmentUser1);
    (await timelock.assignedBalance()).should.be.bignumber.equal(tokenAssginmentUser1);
    // Try a second assignment to see if assigned balance adjusts correctly.
    await timelock.assignToBeneficiary(user2, tokenAssginmentUser2, { from: ownerLockedTeam }).should.not.be.rejected;
    (await timelock.balances(user2)).should.be.bignumber.equal(tokenAssginmentUser2);
    (await timelock.assignedBalance()).should.be.bignumber.equal(tokenAssginmentUser1 + tokenAssginmentUser2);
    // Set user1 to lower assignment to check if that works fine as well.
    await timelock.assignToBeneficiary(user1, tokenAssginmentUser1_post, { from: ownerLockedTeam }).should.not.be.rejected;
    (await timelock.balances(user1)).should.be.bignumber.equal(tokenAssginmentUser1_post);
    (await timelock.assignedBalance()).should.be.bignumber.equal(tokenAssginmentUser1_post + tokenAssginmentUser2);
    // Now try assigning just more than we have available.
    let aBitTooMuch = timelockAmount.minus(await timelock.assignedBalance()).plus(1);
    await timelock.assignToBeneficiary(user3, aBitTooMuch, { from: ownerLockedTeam }).should.be.rejectedWith(revert);
    // Release still does not work as it's still timelocked.
    await timelock.release(user1).should.be.rejectedWith(revert);
    // Jump blockchain to a point where timelock is lifted and we can release tokens.
    await increaseTime(duration.days(9 * 31));
    // Now release user1 tokens and check that everything work correctly with that.
    let user1balance_pre = await theToken.balanceOf(user1);
    await timelock.release(user1).should.not.be.rejected;
    (await timelock.balances(user1)).should.be.bignumber.equal(0);
    (await timelock.assignedBalance()).should.be.bignumber.equal(tokenAssginmentUser2);
    (await theToken.balanceOf(user1)).should.be.bignumber.equal(user1balance_pre.plus(tokenAssginmentUser1_post));
    (await theToken.balanceOf(timelockAddress)).should.be.bignumber.equal(timelockAmount.minus(tokenAssginmentUser1_post));
  });

  // modifiers should reject out of range values

});