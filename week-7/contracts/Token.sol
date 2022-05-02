//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./Authority.sol";
import "./Permissions.sol";

contract ACDM is ERC20, Permissions {

    constructor(Authority _authority) ERC20("ACADEM Coin", "ACDM") Permissions(_authority) { }

    function decimals() public view override returns (uint8) {
        return 6;
    }

    function mint(address recepient, uint256 amount) external onlyPlatform {
        _mint(recepient, amount);
    }

    function burn(address recepient, uint256 amount) external onlyPlatform {
        _burn(recepient, amount);
    }
}

contract XXXToken is ERC20, Permissions {

    constructor(Authority _authority) ERC20("XXX Coin", "XXX") Permissions(_authority) {
        _mint(_msgSender(), 1000000000000000);
    }

    function decimals() public view override returns (uint8) {
        return 18;
    }

    function mint(address recepient, uint256 amount) external onlyStaking {
        _mint(recepient, amount);
    }

    function burn(address recepient, uint256 amount) external onlyPlatform {
        _burn(recepient, amount);
    }
}