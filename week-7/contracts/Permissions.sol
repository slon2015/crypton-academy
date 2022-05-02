//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./Authority.sol";
import "@openzeppelin/contracts/utils/Context.sol";

contract Permissions is Context {

    Authority public authority;

    constructor(Authority _authority) {
        authority = _authority;
    }

    modifier onlyStaking() {
        require(_msgSender() == address(authority.staking()));
        _;
    }

    modifier onlyPlatform() {
        require(_msgSender() == address(authority.platform()));
        _;
    }

    modifier onlyDao() {
        require(_msgSender() == address(authority.dao()));
        _;
    }
}