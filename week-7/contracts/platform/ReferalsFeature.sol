//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../Authority.sol";
import "../Permissions.sol";

abstract contract ReferalsFeature is Permissions {
    
    mapping(address => address) referals;
    uint public extractedComission;

    function register(address referal) external {
        require(referals[_msgSender()] == address(0), "User already registered");
        referals[_msgSender()] = referal;
    }

    function get2levelReferals(address user) internal view returns(address firstLevel, address secondLevel) {
        firstLevel = referals[user];
        secondLevel = referals[firstLevel];
    }

    function applyComissionsFromSale(uint amount, address sender) internal {
        (address firstLevel, address secondLevel) = get2levelReferals(sender);
        extractedComission += (amount / 1000) * 920;
        uint amountToFirst = (amount / 1000) * authority.dao().firstLevelReferalPercentileForSale();
        uint amountToSecond = (amount / 1000) * authority.dao().secondLevelReferalPercentileForSale();
        if (firstLevel != address(0)) {
            firstLevel.call{value: amountToFirst}("");
        } else {
            extractedComission += amountToFirst;
        }
        if (secondLevel != address(0)) {
            secondLevel.call{value: amountToSecond}("");
        } else {
            extractedComission += amountToSecond;
        }
    }

    function applyComissionForTrade(uint amount, address sender) internal returns (uint) {
        (address firstLevel, address secondLevel) = get2levelReferals(sender);
        uint percentile = authority.dao().tradeReferalFeePercentile();
        uint comissionAmount = amount * percentile / 1000;
        if (firstLevel != address(0)) {
            firstLevel.call{value: comissionAmount}("");
        } else {
            extractedComission += comissionAmount;
        }
        if (secondLevel != address(0)) {
            secondLevel.call{value: comissionAmount}("");
        } else {
            extractedComission += comissionAmount;
        }
        return comissionAmount * 2;
    }

    function sendToOwner(address owner, uint weiToSend) external onlyDao {
        require(weiToSend <= extractedComission, "Too large amount to send");
        owner.call{value: weiToSend}("");
        extractedComission -= weiToSend;
    }

    function buyXToken(uint weiToSpend) external onlyDao {
        require(weiToSpend <= extractedComission, "Too large amount to spend");
        address[] memory path = new address[](2);
        path[0] = address(authority.router().WETH());
        path[1] = address(authority.acdmx());
        uint[] memory amounts = authority.router().swapExactETHForTokens{value: weiToSpend}( 
            0,
            path,
            address(this),
            block.timestamp + 1000
        );

        authority.acdmx().burn(address(this), amounts[1]);

        extractedComission -= weiToSpend;
    }
}