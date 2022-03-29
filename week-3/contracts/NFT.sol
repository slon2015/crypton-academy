//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFT is ERC1155, Ownable {

    struct NftToken {
        string metadataUri;
    }

    uint256 private _counter;
    mapping (uint256 => string) private _uris;

    event TokenCreated(uint256 tokenId);

    constructor() ERC1155("") {

    }

    function create(NftToken memory token) external onlyOwner {
        _mint(msg.sender, _counter, 1, "");
        _uris[_counter] = token.metadataUri;
        emit TokenCreated(_counter);
        _counter += 1;
    }

    function uri(uint256 tokenId) public view virtual override returns (string memory) {
        return _uris[tokenId];
    }
}