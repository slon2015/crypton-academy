//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../Authority.sol";
import "../Permissions.sol";
import "hardhat/console.sol";

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
        if (firstLevel != address(0)) {
            uint amountToFirst = (amount / 100) * 3;
            firstLevel.call{value: amountToFirst}("");
        }
        if (secondLevel != address(0)) {
            uint amountToSecond = (amount / 100) * 5;
            secondLevel.call{value: amountToSecond}("");
        }
    }

    function applyComissionForTrade(uint amount, address sender) internal {
        console.log("Taking commision from TRADE");
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
    }

    function sendToOwner(address owner) external onlyDao {
        owner.call{value: extractedComission}("");
        extractedComission = 0;
    }

    function buyXToken() external onlyDao {
        address[] memory path = new address[](2);
        path[0] = address(authority.router().WETH());
        path[1] = address(authority.acdmx());
        (bool success, bytes memory result) = address(authority.router()).call{value: extractedComission}(
            abi.encodeWithSignature(
                "swapExactETHForTokens(uint256,address[],address,uint256)", 
                0,
                path,
                address(this),
                block.timestamp + 1000
            )
        );
        require(success, "Swap failed");
        uint[] memory amounts = abi.decode(result, (uint[]));

        authority.acdmx().burn(address(this), amounts[1]);

        extractedComission = 0;
    }
}