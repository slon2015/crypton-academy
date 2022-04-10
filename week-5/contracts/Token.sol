//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Token is ERC20, Ownable {

    constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) {
        
    }

    function mint(uint256 amount, address recepient) external onlyOwner {
        _mint(recepient, amount);
    }

    function burn(uint256 amount, address account) external onlyOwner {
        _burn(account, amount);
    }
}