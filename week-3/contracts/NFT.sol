//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract NFT is ERC1155, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _counter;

    mapping (uint256 => string) private _uris;

    event TokenCreated(uint256 tokenId);

    constructor() ERC1155("") {

    }

    function create(string memory metadata) external onlyOwner {
        _counter.increment();
        uint256 tokenId = _counter.current();
        _mint(msg.sender, tokenId, 1, "");
        _uris[tokenId] = metadata;
        emit TokenCreated(tokenId);
    }

    function uri(uint256 tokenId) public view virtual override returns (string memory) {
        return _uris[tokenId];
    }
}