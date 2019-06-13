pragma solidity ^0.5.0;

library Bonus {
    uint256 constant pointMultiplier = 1e18; //100% = 1*10^18 points

    function getBonusFactor(uint256 soldToUser)
    internal pure returns (uint256 factor)
    {
        uint256 tokenSold = soldToUser / pointMultiplier;
        //compare whole coins

        //yes, this is spaghetti code, to avoid complex formulas which would need 3 different sections anyways.
        if (tokenSold >= 100000) {
            return 100;
        }
        //0.5% less per 10000 tokens
        if (tokenSold >= 90000) {
            return 95;
        }
        if (tokenSold >= 80000) {
            return 90;
        }
        if (tokenSold >= 70000) {
            return 85;
        }
        if (tokenSold >= 60000) {
            return 80;
        }
        if (tokenSold >= 50000) {
            return 75;
        }
        if (tokenSold >= 40000) {
            return 70;
        }
        if (tokenSold >= 30000) {
            return 65;
        }
        if (tokenSold >= 20000) {
            return 60;
        }
        if (tokenSold >= 10000) {
            return 55;
        }
        //switch to 0.5% per 1000 tokens
        if (tokenSold >= 9000) {
            return 50;
        }
        if (tokenSold >= 8000) {
            return 45;
        }
        if (tokenSold >= 7000) {
            return 40;
        }
        if (tokenSold >= 6000) {
            return 35;
        }
        if (tokenSold >= 5000) {
            return 30;
        }
        if (tokenSold >= 4000) {
            return 25;
        }
        //switch to 0.5% per 500 tokens
        if (tokenSold >= 3000) {
            return 20;
        }
        if (tokenSold >= 2500) {
            return 15;
        }
        if (tokenSold >= 2000) {
            return 10;
        }
        if (tokenSold >= 1500) {
            return 5;
        }
        //less than 1500 -> 0 volume-dependant bonus
        return 0;
    }

}
