//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./PhaseFeature.sol";
import "./ReferalsFeature.sol";
import "../Token.sol";

abstract contract SaleFeature is PhaseFeature, ReferalsFeature {

    uint public price;
    uint public amountToSell;

    function calculateNextPrice(uint currentPriceInWei) internal pure returns(uint nextPriceInWei) {
        nextPriceInWei = (currentPriceInWei * 103 / 100) + 0.000004e18;
    }

    function claculateNextAmount(uint currentPriceInWei, uint tradedInWei) internal pure returns(uint) {
        return tradedInWei / currentPriceInWei;
    }

    function prepareFirstSale() override internal {
        price = 0.00001e18;
        amountToSell = 100_000;
        authority.acdm().mint(address(this), amountToSell);
    }

    function startSaleHook() override internal {
        price = calculateNextPrice(price);
        amountToSell = claculateNextAmount(price, getTradedCap());
        authority.acdm().mint(address(this), amountToSell);
    }

    function finishSaleHook() override internal {
        if (amountToSell > 0) {
            authority.acdm().burn(address(this), amountToSell);
        }
    }

    function buyOnSale() external payable forSalePhase {
        if (msg.value >= price) {
            uint amount = msg.value / price;
            if (amount > amountToSell) {
                _msgSender().call{value: msg.value}("");
                revert("Too low tokens on sale");
            }
            amountToSell -= amount;
            authority.acdm().transfer(_msgSender(), amount);
            applyComissionsFromSale(msg.value, _msgSender());
            
            if (amountToSell == 0) {
                switchPhase();
            }
        }
        if(msg.value % price > 0) {
            _msgSender().call{value: msg.value % price}("");
        }
    }

    
}