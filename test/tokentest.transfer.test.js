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
import { AssertionError } from 'chai/lib/chai';

require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bn')(BigNumber))
    .should();

const { expect } = require('chai');

const TokenContract = artifacts.require("./CrwdToken.sol");

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

    it("should accept funds from  whitelisted address user1.", async function () {
        let isUser1Whitelisted = await theToken.whitelist(user1);
        isUser1Whitelisted.should.equal(true);
        await theToken.sendTransaction({ from: user1, value: user1SendFunds }).should.not.be.rejected;
    });

    it("user1 should be able to transfer his balance to user2 during ICO.", async function () {
        const balanceUser1Before = await theToken.balanceOf(user1);
        await theToken.transfer(user2, balanceUser1Before, { from: user1 }).should.not.be.rejected;
        expect(await theToken.balanceOf(user1)).to.be.bignumber.equal(new BigNumber("0"));
        expect(await theToken.balanceOf(user2)).to.be.bignumber.equal(balanceUser1Before);
    });

    it("locked wallets DO NOT have balance until ICO has ended", async function () {
        expect(await theToken.balanceOf(user2)).to.be.bignumber.not.equal(await theToken.balanceOf(user1));
        expect(await theToken.balanceOf(expectedNotLocked)).to.be.bignumber.equal(new BigNumber("0"));
        expect(await theToken.balanceOf(ownerLockedTeam)).to.be.bignumber.equal(new BigNumber("0"));
        expect(await theToken.balanceOf(ownerLockedDev)).to.be.bignumber.equal(new BigNumber("0"));
        expect(await theToken.balanceOf(ownerLockedCountry)).to.be.bignumber.equal(new BigNumber("0"));
    })

    it("should accept stopping ICO by admin before ICO timeout.", async function () {
        expect(await theToken.state()).to.be.bignumber.equal(States.Ico);
        await theToken.endICO({ from: expectedStateControl }).should.not.be.rejected;
        expect(await theToken.state()).to.be.bignumber.equal(States.Operational);
    });

    it("locked wallets DO have balance until ICO has ended", async function () {
        expect(await theToken.balanceOf(user2)).to.be.bignumber.not.equal(await theToken.balanceOf(user1));
        expect(await theToken.balanceOf(expectedNotLocked)).to.be.bignumber.not.equal(new BigNumber("0"));
        expect(await theToken.balanceOf(ownerLockedTeam)).to.be.bignumber.not.equal(new BigNumber("0"));
        expect(await theToken.balanceOf(ownerLockedDev)).to.be.bignumber.not.equal(new BigNumber("0"));
        expect(await theToken.balanceOf(ownerLockedCountry)).to.be.bignumber.not.equal(new BigNumber("0"));
    })

    it("user2 should be able to transfer his balance back to user1 when Operational.", async function () {
        const balanceUser2Before = await theToken.balanceOf(user2);
        await theToken.transfer(user1, balanceUser2Before, { from: user2 }).should.not.be.rejected;
        expect(await theToken.balanceOf(user2)).to.be.bignumber.equal(new BigNumber("0"));
        expect(await theToken.balanceOf(user1)).to.be.bignumber.equal(balanceUser2Before);
    });

    it("transferFrom()", async function () {
        const totalBalanceUser1Before = await theToken.balanceOf(user1);
        const transferBalance = totalBalanceUser1Before.sub(new BigNumber("2"));
        await theToken.approve(user2, transferBalance, { from: user1 })
        await theToken.transferFrom(user1, user2, transferBalance, { from: user2 }).should.not.be.rejected;
        expect(await theToken.balanceOf(user1)).to.be.bignumber.equal(new BigNumber("2"));
        expect(await theToken.balanceOf(user2)).to.be.bignumber.equal(transferBalance);
    });

    it("locked wallets can do transfer", async function () {
        const expectedNotLockedBalanceBefore = await theToken.balanceOf(expectedNotLocked);
        const ownerLockedTeamBalanceBefore = await theToken.balanceOf(ownerLockedTeam);
        const ownerLockedDevBalanceBefore = await theToken.balanceOf(ownerLockedDev);
        const ownerLockedCountryBalanceBefore = await theToken.balanceOf(ownerLockedCountry);

        const totalLocked = new BigNumber(expectedNotLockedBalanceBefore.toString())
            .add(new BigNumber(ownerLockedTeamBalanceBefore.toString()))
            .add(new BigNumber(ownerLockedDevBalanceBefore.toString()))
            .add(new BigNumber(ownerLockedCountryBalanceBefore.toString()))

        await theToken.transfer(user3, expectedNotLockedBalanceBefore, { from: expectedNotLocked }).should.not.be.rejected;
        await theToken.transfer(user3, ownerLockedTeamBalanceBefore, { from: ownerLockedTeam }).should.not.be.rejected;
        await theToken.transfer(user3, ownerLockedDevBalanceBefore, { from: ownerLockedDev }).should.not.be.rejected;
        await theToken.transfer(user3, ownerLockedCountryBalanceBefore, { from: ownerLockedCountry }).should.not.be.rejected;
        expect(await theToken.balanceOf(user3)).to.be.bignumber.not.equal(new BigNumber("0"));
        expect(await theToken.balanceOf(user3)).to.be.bignumber.equal(totalLocked);
    })
});
