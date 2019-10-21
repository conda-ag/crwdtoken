pragma solidity ^0.5.12;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./CrwdToken.sol";

contract TestnetFaucet is Ownable {
    using SafeMath for uint256;

    CrwdToken private _token;
    bool private _isDead;

    modifier notDead {
        require(!_isDead, "contract dead");
        _;
    }

    function faucetFor() public view returns(address) {
        return address(_token);
    }

    function setTokenAddress(CrwdToken token) public onlyOwner {
        _token = token;
    }

    function makeDead() public onlyOwner {
        _isDead = true;
        renounceOwnership();
    }

    function mint(uint256 amount) public notDead {
        require(_token.balanceOf(msg.sender).add(amount) <= 10000000000000000000000, "balance exceeds limit - stay fair");
        _token.addToWhitelist(address(msg.sender));
        _token.addPresaleAmount(address(msg.sender), amount);
    }
}