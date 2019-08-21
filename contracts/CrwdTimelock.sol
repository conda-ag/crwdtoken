pragma solidity ^0.5.8;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

import './zeppelin_v1_12_0/ERC20Basic.sol';
import './zeppelin_v1_12_0/ERC20.sol';

contract CrwdTimelock {
    using SafeMath for uint256;

    mapping(address => uint256) public balances;

    uint256 public assignedBalance;
    // beneficiary of tokens after they are released
    address public controller;

    // timestamp when token release is enabled
    uint public releaseTime;

    ERC20 token;

    constructor(ERC20 _token, address _controller, uint _releaseTime) public {
        require(_releaseTime > now, "releaseTime");
        token = _token;
        controller = _controller;
        releaseTime = _releaseTime;
    }

    function assignToBeneficiary(address _beneficiary, uint256 _amount) public {
        require(msg.sender == controller, "only ctrl");
        assignedBalance = assignedBalance.sub(balances[_beneficiary]);
        //balanceOf(this) will be 0 until the Operational Phase has been reached, no need for explicit check
        require(token.balanceOf(address(this)) >= assignedBalance.add(_amount), "balance");
        balances[_beneficiary] = _amount;
        //balance is set, not added, gives _controller the power to set any balance, even 0
        assignedBalance = assignedBalance.add(balances[_beneficiary]);
    }

    /**
     * @notice Transfers tokens held by timelock to beneficiary.
     */
    function release(address _beneficiary) public {
        require(now >= releaseTime, "unreleased");
        uint amount = balances[_beneficiary];
        require(amount > 0, "zeroAmount");
        token.transfer(_beneficiary, amount);
        assignedBalance = assignedBalance.sub(amount);
        balances[_beneficiary] = 0;

    }
}
