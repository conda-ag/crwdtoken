/*
Implements ERC 20 Token standard: https://github.com/ethereum/EIPs/issues/20.
*/
pragma solidity ^0.4.11;


import "zeppelin/token/StandardToken.sol";
import "./CrwdTimelock.sol";
import "./Bonus.sol";

contract CrwdToken is StandardToken {

    // data structures
    enum States {
        Initial, // deployment time
        ValuationSet,
        Ico, // whitelist addresses, accept funds, update balances
        Underfunded, // ICO time finished and minimal amount not raised
        Operational, // production phase
        Paused         // for contract upgrades
    }

    mapping(address => uint256) public ethPossibleRefunds;

    uint256 public soldTokens;

    string public constant name = "Crwdtoken";

    string public constant symbol = "CRWD";

    uint8 public constant decimals = 18;

    mapping(address => bool) public whitelist;

    address public teamTimeLock;
    address public devTimeLock;
    address public countryTimeLock;

    address public miscNotLocked;

    address public stateControl;

    address public whitelistControl;

    address public withdrawControl;

    address public tokenAssignmentControl;

    States public state;

    uint256 public weiICOMinimum;

    uint256 public weiICOMaximum;

    uint256 public silencePeriod;

    uint256 public startAcceptingFundsBlock;

    uint256 public endBlock;

    uint256 public ETH_CRWDTOKEN; //number of tokens per ETH

    uint256 constant pointMultiplier = 1e18; //100% = 1*10^18 points

    uint256 public constant maxTotalSupply = 45000000 * pointMultiplier;

    uint256 public constant percentForSale = 50;

    event Mint(address indexed to, uint256 amount);
    event MintFinished();

    bool public mintingFinished = false;

    bool public bonusPhase = false;


    //this creates the contract and stores the owner. it also passes in 3 addresses to be used later during the lifetime of the contract.
    function CrwdToken(
        address _stateControl
    , address _whitelistControl
    , address _withdrawControl
    , address _tokenAssignmentControl
    , address _notLocked //15%
    , address _lockedTeam //15%
    , address _lockedDev //10%
    , address _lockedCountry //10%
    ) {
        stateControl = _stateControl;
        whitelistControl = _whitelistControl;
        withdrawControl = _withdrawControl;
        tokenAssignmentControl = _tokenAssignmentControl;
        moveToState(States.Initial);
        weiICOMinimum = 0;
        //to be overridden
        weiICOMaximum = 0;
        endBlock = 0;
        ETH_CRWDTOKEN = 0;
        totalSupply = 0;
        soldTokens = 0;
        uint releaseTime = now + 9 * 31 days;
        teamTimeLock = address(new CrwdTimelock(this, _lockedTeam, releaseTime));
        devTimeLock = address(new CrwdTimelock(this, _lockedDev, releaseTime));
        countryTimeLock = address(new CrwdTimelock(this, _lockedCountry, releaseTime));
        miscNotLocked = _notLocked;
    }

    event Whitelisted(address addr);

    event StateTransition(States oldState, States newState);

    modifier onlyWhitelist() {
        require(msg.sender == whitelistControl);
        _;
    }

    modifier onlyStateControl() {
        require(msg.sender == stateControl);
        _;
    }

    modifier onlyTokenAssignmentControl() {
        require(msg.sender == tokenAssignmentControl);
        _;
    }

    modifier onlyWithdraw() {
        require(msg.sender == withdrawControl);
        _;
    }

    modifier requireState(States _requiredState) {
        require(state == _requiredState);
        _;
    }

    /**
    BEGIN ICO functions
    */

    //this is the main funding function, it updates the balances of tokens during the ICO.
    //no particular incentive schemes have been implemented here
    //it is only accessible during the "ICO" phase.
    function() payable
    requireState(States.Ico)
    {
        require(whitelist[msg.sender] == true);
        require(this.balance <= weiICOMaximum);
        //note that msg.value is already included in this.balance
        require(block.number < endBlock);
        require(block.number >= startAcceptingFundsBlock);

        uint256 basisTokens = msg.value.mul(ETH_CRWDTOKEN);
        uint256 soldToTuserWithBonus = addBonus(basisTokens);

        issueTokensToUser(msg.sender, soldToTuserWithBonus);
        ethPossibleRefunds[msg.sender] = ethPossibleRefunds[msg.sender].add(msg.value);
    }

    function issueTokensToUser(address beneficiary, uint256 amount)
    internal
    {
        balances[beneficiary] = balances[beneficiary].add(amount);
        soldTokens = soldTokens.add(amount);
        totalSupply = totalSupply.add(amount.mul(100).div(percentForSale));
        Mint(beneficiary, amount);
        Transfer(0x0, beneficiary, amount);
    }

    function issuePercentToReserve(address beneficiary, uint256 percentOfSold)
    internal
    {
        uint256 amount = totalSupply.mul(percentOfSold).div(100);
        balances[beneficiary] = balances[beneficiary].add(amount);
        Mint(beneficiary, amount);
        Transfer(0x0, beneficiary, amount);
    }

    function addBonus(uint256 basisTokens)
    public constant
    returns (uint256 resultingTokens)
    {
        //if pre-sale is not active no bonus calculation
        if (!bonusPhase) return basisTokens;
        //percentages are integer numbers as per mill (promille) so we can accurately calculate 0.5% = 5. 100% = 1000
        uint256 perMillBonus = getPhaseBonus();
        //no bonus if investment amount < 1000 tokens
        if (basisTokens >= pointMultiplier.mul(1000)) {
            perMillBonus += Bonus.getBonusFactor(basisTokens);
        }
        //100% + bonus % times original amount divided by 100%.
        return basisTokens.mul(per_mill + perMillBonus).div(per_mill);
    }

    uint256 constant per_mill = 1000;

    function setBonusPhase(bool _isBonusPhase)
    onlyStateControl
        //phases are controlled manually through the state control key
    {
        bonusPhase = _isBonusPhase;
    }

    function getPhaseBonus()
    internal
    constant
    returns (uint256 factor)
    {
        if (bonusPhase) {//20%
            return 200;
        }
        return 0;
    }


    function moveToState(States _newState)
    internal
    {
        StateTransition(state, _newState);
        state = _newState;
    }
    // ICO contract configuration function
    // newEthICOMinimum is the minimum amount of funds to raise
    // newEthICOMaximum is the maximum amount of funds to raise
    // silencePeriod is a number of blocks to wait after starting the ICO. No funds are accepted during the silence period. It can be set to zero.
    // newEndBlock is the absolute block number at which the ICO must stop. It must be set after now + silence period.
    function updateEthICOThresholds(uint256 _newWeiICOMinimum, uint256 _newWeiICOMaximum, uint256 _silencePeriod, uint256 _newEndBlock)
    onlyStateControl
    {
        require(state == States.Initial || state == States.ValuationSet);
        require(_newWeiICOMaximum > _newWeiICOMinimum);
        require(block.number + silencePeriod < _newEndBlock);
        require(block.number < _newEndBlock);
        weiICOMinimum = _newWeiICOMinimum;
        weiICOMaximum = _newWeiICOMaximum;
        silencePeriod = _silencePeriod;
        endBlock = _newEndBlock;
        // initial conversion rate of ETH_CRWDTOKEN set now, this is used during the Ico phase.
        ETH_CRWDTOKEN = maxTotalSupply.mul(percentForSale).div(100).div(weiICOMaximum);
        // check pointMultiplier
        moveToState(States.ValuationSet);
    }

    function startICO()
    onlyStateControl
    requireState(States.ValuationSet)
    {
        require(block.number < endBlock);
        require(block.number + silencePeriod < endBlock);
        startAcceptingFundsBlock = block.number + silencePeriod;
        moveToState(States.Ico);
    }

    function addPresaleAmount(address beneficiary, uint256 amount)
    onlyTokenAssignmentControl
    {
        require(state == States.ValuationSet || state == States.Ico);
        issueTokensToUser(beneficiary, amount);
    }


    function endICO()
    onlyStateControl
    requireState(States.Ico)
    {
        if (this.balance < weiICOMinimum) {
            moveToState(States.Underfunded);
        }
        else {
            burnAndFinish();
            moveToState(States.Operational);
        }
    }

    function anyoneEndICO()
    requireState(States.Ico)
    {
        require(block.number > endBlock);
        if (this.balance < weiICOMinimum) {
            moveToState(States.Underfunded);
        }
        else {
            burnAndFinish();
            moveToState(States.Operational);
        }
    }

    function burnAndFinish()
    internal
    {
        issuePercentToReserve(teamTimeLock, 15);
        issuePercentToReserve(devTimeLock, 10);
        issuePercentToReserve(countryTimeLock, 10);
        issuePercentToReserve(miscNotLocked, 15);

        totalSupply = soldTokens
        .add(balances[teamTimeLock])
        .add(balances[devTimeLock])
        .add(balances[countryTimeLock])
        .add(balances[miscNotLocked]);

        mintingFinished = true;
        MintFinished();
    }

    function addToWhitelist(address _whitelisted)
    onlyWhitelist
        //    requireState(States.Ico)
    {
        whitelist[_whitelisted] = true;
        Whitelisted(_whitelisted);
    }


    //emergency pause for the ICO
    function pause()
    onlyStateControl
    requireState(States.Ico)
    {
        moveToState(States.Paused);
    }

    //in case we want to completely abort
    function abort()
    onlyStateControl
    requireState(States.Paused)
    {
        moveToState(States.Underfunded);
    }

    //un-pause
    function resumeICO()
    onlyStateControl
    requireState(States.Paused)
    {
        moveToState(States.Ico);
    }

    //in case of a failed/aborted ICO every investor can get back their money
    function requestRefund()
    requireState(States.Underfunded)
    {
        require(ethPossibleRefunds[msg.sender] > 0);
        //there is no need for updateAccount(msg.sender) since the token never became active.
        uint256 payout = ethPossibleRefunds[msg.sender];
        //reverse calculate the amount to pay out
        ethPossibleRefunds[msg.sender] = 0;
        msg.sender.transfer(payout);
    }

    //after the ico has run its course, the withdraw account can drain funds bit-by-bit as needed.
    function requestPayout(uint _amount)
    onlyWithdraw //very important!
    requireState(States.Operational)
    {
        msg.sender.transfer(_amount);
    }

    //if this contract gets a balance in some other ERC20 contract - or even iself - then we can rescue it.
    function rescueToken(ERC20Basic _foreignToken, address _to)
    onlyTokenAssignmentControl
    requireState(States.Operational)
    {
        _foreignToken.transfer(_to, _foreignToken.balanceOf(this));
    }
    /**
    END ICO functions
    */

    /**
    BEGIN ERC20 functions
    */
    function transfer(address _to, uint256 _value)
    requireState(States.Operational)
    returns (bool success) {
        return super.transfer(_to, _value);
    }

    function transferFrom(address _from, address _to, uint256 _value)
    requireState(States.Operational)
    returns (bool success) {
        return super.transferFrom(_from, _to, _value);
    }

    function balanceOf(address _account)
    constant
    returns (uint256 balance) {
        return balances[_account];
    }

    /**
    END ERC20 functions
    */
}
