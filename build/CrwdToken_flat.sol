pragma solidity ^0.5.0;

// File: contracts/zeppelin_v1_12_0/ERC20Basic.sol

//copy from https://github.com/OpenZeppelin/openzeppelin-solidity/blob/v1.12.0/contracts/token/ERC20/ERC20Basic.sol
//changes: upgraded pragma

pragma solidity ^0.5.12;

/**
 * @title ERC20Basic
 * @dev Simpler version of ERC20 interface
 * See https://github.com/ethereum/EIPs/issues/179
 */
contract ERC20Basic {
  function totalSupply() public view returns (uint256);
  function balanceOf(address _who) public view returns (uint256);
  function transfer(address _to, uint256 _value) public returns (bool);
  event Transfer(address indexed from, address indexed to, uint256 value);
}

// File: openzeppelin-solidity/contracts/math/SafeMath.sol

/**
 * @dev Wrappers over Solidity's arithmetic operations with added overflow
 * checks.
 *
 * Arithmetic operations in Solidity wrap on overflow. This can easily result
 * in bugs, because programmers usually assume that an overflow raises an
 * error, which is the standard behavior in high level programming languages.
 * `SafeMath` restores this intuition by reverting the transaction when an
 * operation overflows.
 *
 * Using this library instead of the unchecked operations eliminates an entire
 * class of bugs, so it's recommended to use it always.
 */
library SafeMath {
    /**
     * @dev Returns the addition of two unsigned integers, reverting on
     * overflow.
     *
     * Counterpart to Solidity's `+` operator.
     *
     * Requirements:
     * - Addition cannot overflow.
     */
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a, "SafeMath: addition overflow");

        return c;
    }

    /**
     * @dev Returns the subtraction of two unsigned integers, reverting on
     * overflow (when the result is negative).
     *
     * Counterpart to Solidity's `-` operator.
     *
     * Requirements:
     * - Subtraction cannot overflow.
     */
    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        return sub(a, b, "SafeMath: subtraction overflow");
    }

    /**
     * @dev Returns the subtraction of two unsigned integers, reverting with custom message on
     * overflow (when the result is negative).
     *
     * Counterpart to Solidity's `-` operator.
     *
     * Requirements:
     * - Subtraction cannot overflow.
     *
     * _Available since v2.4.0._
     */
    function sub(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b <= a, errorMessage);
        uint256 c = a - b;

        return c;
    }

    /**
     * @dev Returns the multiplication of two unsigned integers, reverting on
     * overflow.
     *
     * Counterpart to Solidity's `*` operator.
     *
     * Requirements:
     * - Multiplication cannot overflow.
     */
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        // Gas optimization: this is cheaper than requiring 'a' not being zero, but the
        // benefit is lost if 'b' is also tested.
        // See: https://github.com/OpenZeppelin/openzeppelin-contracts/pull/522
        if (a == 0) {
            return 0;
        }

        uint256 c = a * b;
        require(c / a == b, "SafeMath: multiplication overflow");

        return c;
    }

    /**
     * @dev Returns the integer division of two unsigned integers. Reverts on
     * division by zero. The result is rounded towards zero.
     *
     * Counterpart to Solidity's `/` operator. Note: this function uses a
     * `revert` opcode (which leaves remaining gas untouched) while Solidity
     * uses an invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     * - The divisor cannot be zero.
     */
    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        return div(a, b, "SafeMath: division by zero");
    }

    /**
     * @dev Returns the integer division of two unsigned integers. Reverts with custom message on
     * division by zero. The result is rounded towards zero.
     *
     * Counterpart to Solidity's `/` operator. Note: this function uses a
     * `revert` opcode (which leaves remaining gas untouched) while Solidity
     * uses an invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     * - The divisor cannot be zero.
     *
     * _Available since v2.4.0._
     */
    function div(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        // Solidity only automatically asserts when dividing by 0
        require(b > 0, errorMessage);
        uint256 c = a / b;
        // assert(a == b * c + a % b); // There is no case in which this doesn't hold

        return c;
    }

    /**
     * @dev Returns the remainder of dividing two unsigned integers. (unsigned integer modulo),
     * Reverts when dividing by zero.
     *
     * Counterpart to Solidity's `%` operator. This function uses a `revert`
     * opcode (which leaves remaining gas untouched) while Solidity uses an
     * invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     * - The divisor cannot be zero.
     */
    function mod(uint256 a, uint256 b) internal pure returns (uint256) {
        return mod(a, b, "SafeMath: modulo by zero");
    }

    /**
     * @dev Returns the remainder of dividing two unsigned integers. (unsigned integer modulo),
     * Reverts with custom message when dividing by zero.
     *
     * Counterpart to Solidity's `%` operator. This function uses a `revert`
     * opcode (which leaves remaining gas untouched) while Solidity uses an
     * invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     * - The divisor cannot be zero.
     *
     * _Available since v2.4.0._
     */
    function mod(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b != 0, errorMessage);
        return a % b;
    }
}

// File: contracts/zeppelin_v1_12_0/BasicToken.sol

//copy from https://github.com/OpenZeppelin/openzeppelin-solidity/blob/v1.12.0/contracts/token/ERC20/BasicToken.sol
//changes: upgraded pragma, used SafeMath from current openzeppelin

pragma solidity ^0.5.12;


/**
 * @title Basic token
 * @dev Basic version of StandardToken, with no allowances.
 */
contract BasicToken is ERC20Basic {
  using SafeMath for uint256;

  mapping(address => uint256) internal balances;

  uint256 internal totalSupply_;

  /**
  * @dev Total number of tokens in existence
  */
  function totalSupply() public view returns (uint256) {
    return totalSupply_;
  }

  /**
  * @dev Transfer token for a specified address
  * @param _to The address to transfer to.
  * @param _value The amount to be transferred.
  */
  function transfer(address _to, uint256 _value) public returns (bool) {
    require(_value <= balances[msg.sender], "too little");
    require(_to != address(0));

    balances[msg.sender] = balances[msg.sender].sub(_value);
    balances[_to] = balances[_to].add(_value);
    emit Transfer(msg.sender, _to, _value);
    return true;
  }

  /**
  * @dev Gets the balance of the specified address.
  * @param _owner The address to query the the balance of.
  * @return An uint256 representing the amount owned by the passed address.
  */
  function balanceOf(address _owner) public view returns (uint256) {
    return balances[_owner];
  }

}

// File: contracts/zeppelin_v1_12_0/ERC20.sol

//copy from https://github.com/OpenZeppelin/openzeppelin-solidity/blob/v1.12.0/contracts/token/ERC20/ERC20.sol
//changes: upgraded pragma

pragma solidity ^0.5.12;


/**
 * @title ERC20 interface
 * @dev see https://github.com/ethereum/EIPs/issues/20
 */
contract ERC20 is ERC20Basic {
  function allowance(address _owner, address _spender)
    public view returns (uint256);

  function transferFrom(address _from, address _to, uint256 _value)
    public returns (bool);

  function approve(address _spender, uint256 _value) public returns (bool);
  event Approval(
    address indexed owner,
    address indexed spender,
    uint256 value
  );
}

// File: contracts/zeppelin_v1_12_0/StandardToken.sol

//copy from https://github.com/OpenZeppelin/openzeppelin-solidity/blob/v1.12.0/contracts/token/ERC20/StandardToken.sol
//changes: upgraded pragma

pragma solidity ^0.5.12;


/**
 * @title Standard ERC20 token
 *
 * @dev Implementation of the basic standard token.
 * https://github.com/ethereum/EIPs/issues/20
 * Based on code by FirstBlood: https://github.com/Firstbloodio/token/blob/master/smart_contract/FirstBloodToken.sol
 */
contract StandardToken is ERC20, BasicToken {

  mapping (address => mapping (address => uint256)) internal allowed;


  /**
   * @dev Transfer tokens from one address to another
   * @param _from address The address which you want to send tokens from
   * @param _to address The address which you want to transfer to
   * @param _value uint256 the amount of tokens to be transferred
   */
  function transferFrom(
    address _from,
    address _to,
    uint256 _value
  )
    public
    returns (bool)
  {
    require(_value <= balances[_from]);
    require(_value <= allowed[_from][msg.sender]);
    require(_to != address(0));

    balances[_from] = balances[_from].sub(_value);
    balances[_to] = balances[_to].add(_value);
    allowed[_from][msg.sender] = allowed[_from][msg.sender].sub(_value);
    emit Transfer(_from, _to, _value);
    return true;
  }

  /**
   * @dev Approve the passed address to spend the specified amount of tokens on behalf of msg.sender.
   * Beware that changing an allowance with this method brings the risk that someone may use both the old
   * and the new allowance by unfortunate transaction ordering. One possible solution to mitigate this
   * race condition is to first reduce the spender's allowance to 0 and set the desired value afterwards:
   * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
   * @param _spender The address which will spend the funds.
   * @param _value The amount of tokens to be spent.
   */
  function approve(address _spender, uint256 _value) public returns (bool) {
    allowed[msg.sender][_spender] = _value;
    emit Approval(msg.sender, _spender, _value);
    return true;
  }

  /**
   * @dev Function to check the amount of tokens that an owner allowed to a spender.
   * @param _owner address The address which owns the funds.
   * @param _spender address The address which will spend the funds.
   * @return A uint256 specifying the amount of tokens still available for the spender.
   */
  function allowance(
    address _owner,
    address _spender
   )
    public
    view
    returns (uint256)
  {
    return allowed[_owner][_spender];
  }

  /**
   * @dev Increase the amount of tokens that an owner allowed to a spender.
   * approve should be called when allowed[_spender] == 0. To increment
   * allowed value is better to use this function to avoid 2 calls (and wait until
   * the first transaction is mined)
   * From MonolithDAO Token.sol
   * @param _spender The address which will spend the funds.
   * @param _addedValue The amount of tokens to increase the allowance by.
   */
  function increaseApproval(
    address _spender,
    uint256 _addedValue
  )
    public
    returns (bool)
  {
    allowed[msg.sender][_spender] = (
      allowed[msg.sender][_spender].add(_addedValue));
    emit Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
    return true;
  }

  /**
   * @dev Decrease the amount of tokens that an owner allowed to a spender.
   * approve should be called when allowed[_spender] == 0. To decrement
   * allowed value is better to use this function to avoid 2 calls (and wait until
   * the first transaction is mined)
   * From MonolithDAO Token.sol
   * @param _spender The address which will spend the funds.
   * @param _subtractedValue The amount of tokens to decrease the allowance by.
   */
  function decreaseApproval(
    address _spender,
    uint256 _subtractedValue
  )
    public
    returns (bool)
  {
    uint256 oldValue = allowed[msg.sender][_spender];
    if (_subtractedValue >= oldValue) {
      allowed[msg.sender][_spender] = 0;
    } else {
      allowed[msg.sender][_spender] = oldValue.sub(_subtractedValue);
    }
    emit Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
    return true;
  }

}

// File: contracts\CrwdToken.sol

/*
Implements ERC 20 Token standard: https://github.com/ethereum/EIPs/issues/20.
*/
pragma solidity ^0.5.12;

contract CrwdToken is StandardToken {

    // data structures
    enum States {
        Initial, // deployment time
        ValuationSet,
        Ico, // whitelist addresses, accept funds, update balances
        Underfunded, // ICO time finished and minimal amount not raised
        Operational, // production phase
        Paused // for contract upgrades
    }

    mapping(address => uint256) public ethPossibleRefunds;

    uint256 public soldTokens;

    string public constant name = "CRWDToken";

    string public constant symbol = "CRWT";

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

    //this creates the contract and stores the owner. it also passes in 3 addresses to be used later during the lifetime of the contract.
    constructor(
        address _stateControl,
        address _whitelistControl,
        address _withdrawControl,
        address _tokenAssignmentControl,
        address _notLocked, //15%
        address _lockedTeam, //15%
        address _lockedDev, //10%
        address _lockedCountry //10%
    ) public {
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
        totalSupply_ = 0;
        soldTokens = 0;
        teamTimeLock = _lockedTeam;
        devTimeLock = _lockedDev;
        countryTimeLock = _lockedCountry;
        miscNotLocked = _notLocked;
    }

    event Whitelisted(address addr);

    event StateTransition(States oldState, States newState);

    modifier onlyWhitelist() {
        require(msg.sender == whitelistControl, "only whitelisted wallets");
        _;
    }

    modifier onlyStateControl() {
        require(msg.sender == stateControl, "only state-controller");
        _;
    }

    modifier onlyTokenAssignmentControl() {
        require(msg.sender == tokenAssignmentControl, "only assignment controller");
        _;
    }

    modifier onlyWithdraw() {
        require(msg.sender == withdrawControl, "only withdraw controller");
        _;
    }

    modifier requireState(States _requiredState) {
        require(state == _requiredState, "invalid token state");
        _;
    }

    modifier requireAnyOfTwoStates(States _requiredState1, States _requiredState2) {
        require(state == _requiredState1 || state == _requiredState2, "wrong token state");
        _;
    }

    /**
    BEGIN ICO functions
    */

    //this is the main funding function, it updates the balances of tokens during the ICO.
    //no particular incentive schemes have been implemented here
    //it is only accessible during the "ICO" phase.
    function() external payable
    requireState(States.Ico)
    {
        require(whitelist[msg.sender] == true, "not whitelisted");
        require(address(this).balance <= weiICOMaximum, "weiICOMaximum");
        //note that msg.value is already included in address(this).balance
        require(block.number < endBlock, "endBlock reached");
        require(block.number >= startAcceptingFundsBlock, "startBlock future");

        uint256 basisTokens = msg.value.mul(ETH_CRWDTOKEN);

        issueTokensToUser(msg.sender, basisTokens);
        ethPossibleRefunds[msg.sender] = ethPossibleRefunds[msg.sender].add(msg.value);
    }

    function issueTokensToUser(address beneficiary, uint256 amount)
    internal
    {
        balances[beneficiary] = balances[beneficiary].add(amount);
        soldTokens = soldTokens.add(amount);
        totalSupply_ = totalSupply_.add(amount.mul(100).div(percentForSale));
        emit Mint(beneficiary, amount);
        emit Transfer(address(0x0), beneficiary, amount);
    }

    function issuePercentToReserve(address beneficiary, uint256 percentOfSold)
    internal
    {
        uint256 amount = totalSupply_.mul(percentOfSold).div(100);
        balances[beneficiary] = balances[beneficiary].add(amount);
        emit Mint(beneficiary, amount);
        emit Transfer(address(0x0), beneficiary, amount);
    }

    function moveToState(States _newState)
    internal
    {
        emit StateTransition(state, _newState);
        state = _newState;
    }

    // ICO contract configuration function
    // newEthICOMinimum is the minimum amount of funds to raise
    // newEthICOMaximum is the maximum amount of funds to raise
    // silencePeriod is a number of blocks to wait after starting the ICO. No funds are accepted during the silence period. It can be set to zero.
    // newEndBlock is the absolute block number at which the ICO must stop. It must be set after now + silence period.
    function updateEthICOThresholds(uint256 _newWeiICOMinimum, uint256 _newWeiICOMaximum, uint256 _silencePeriod, uint256 _newEndBlock)
    public
    onlyStateControl
    {
        require(state == States.Initial || state == States.ValuationSet, "invalid state");
        require(_newWeiICOMaximum > _newWeiICOMinimum, "weiMax");
        require(block.number + silencePeriod < _newEndBlock, "high silence");
        require(block.number < _newEndBlock, "past endBock");
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
    public
    onlyStateControl
    requireState(States.ValuationSet)
    {
        require(block.number < endBlock, "ended");
        require(block.number + silencePeriod < endBlock, "ended w silence");
        startAcceptingFundsBlock = block.number + silencePeriod;
        moveToState(States.Ico);
    }

    function addPresaleAmount(address beneficiary, uint256 amount)
    public
    onlyTokenAssignmentControl
    {
        require(state == States.ValuationSet || state == States.Ico, "invalid token state");
        issueTokensToUser(beneficiary, amount);
    }


    function endICO()
    public
    onlyStateControl
    requireState(States.Ico)
    {
        if (address(this).balance < weiICOMinimum) {
            moveToState(States.Underfunded);
        }
        else {
            burnAndFinish();
            moveToState(States.Operational);
        }
    }

    function anyoneEndICO()
    public
    requireState(States.Ico)
    {
        require(block.number > endBlock, "not ended");
        if (address(this).balance < weiICOMinimum) {
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

        totalSupply_ = soldTokens
        .add(balances[teamTimeLock])
        .add(balances[devTimeLock])
        .add(balances[countryTimeLock])
        .add(balances[miscNotLocked]);

        mintingFinished = true;
        emit MintFinished();
    }

    function addToWhitelist(address _whitelisted)
    public
    onlyWhitelist
        //    requireState(States.Ico)
    {
        whitelist[_whitelisted] = true;
        emit Whitelisted(_whitelisted);
    }


    //emergency pause for the ICO
    function pause()
    public
    onlyStateControl
    requireState(States.Ico)
    {
        moveToState(States.Paused);
    }

    //in case we want to completely abort
    function abort()
    public
    onlyStateControl
    requireState(States.Paused)
    {
        moveToState(States.Underfunded);
    }

    //un-pause
    function resumeICO()
    public
    onlyStateControl
    requireState(States.Paused)
    {
        moveToState(States.Ico);
    }

    //in case of a failed/aborted ICO every investor can get back their money
    function requestRefund()
    public
    requireState(States.Underfunded)
    {
        require(ethPossibleRefunds[msg.sender] > 0, "nothing to refund");
        //there is no need for updateAccount(msg.sender) since the token never became active.
        uint256 payout = ethPossibleRefunds[msg.sender];
        //reverse calculate the amount to pay out
        ethPossibleRefunds[msg.sender] = 0;
        msg.sender.transfer(payout);
    }

    //after the ico has run its course, the withdraw account can drain funds bit-by-bit as needed.
    function requestPayout(uint _amount)
    public
    onlyWithdraw //very important!
    requireState(States.Operational)
    {
        msg.sender.transfer(_amount);
    }

    //if this contract gets a balance in some other ERC20 contract - or even iself - then we can rescue it.
    function rescueToken(ERC20Basic _foreignToken, address _to)
    public
    onlyTokenAssignmentControl
    requireState(States.Operational)
    {
        _foreignToken.transfer(_to, _foreignToken.balanceOf(address(this)));
    }
    /**
    END ICO functions
    */

    /**
    BEGIN ERC20 functions
    */
    function transfer(address _to, uint256 _value)
    public
    requireAnyOfTwoStates(States.Operational, States.Ico)
    returns (bool success) {
        return super.transfer(_to, _value);
    }

    function transferFrom(address _from, address _to, uint256 _value)
    public
    requireAnyOfTwoStates(States.Operational, States.Ico)
    returns (bool success) {
        return super.transferFrom(_from, _to, _value);
    }

    function balanceOf(address _account)
    public
    view
    returns (uint256 balance) {
        return balances[_account];
    }

    /**
    END ERC20 functions
    */
}
