//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./SaleFeature.sol";
import "./TradeFeature.sol";
import "../Authority.sol";
import "../Permissions.sol";

contract Platform is SaleFeature, TradeFeature {
    
    constructor(Authority _authority) Permissions(_authority) { }
}