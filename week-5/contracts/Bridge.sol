//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./Token.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Context.sol";

contract Bridge is Context {

    Token private token;

    mapping(address => mapping(uint => bool)) public processedNonces;

    event SwapInitialized(
        address from,
        address to,
        uint amount,
        uint nonce,
        bytes signature
    );

    event SwapComplete(
        address from,
        address to,
        uint amount,
        uint nonce,
        bytes signature
    );

    constructor(Token _token) {
        token = _token;
    }

    function swap(address to, uint amount, uint nonce, bytes calldata signature) external {
        require(processedNonces[_msgSender()][nonce] == false, "Transfer already processed");
        processedNonces[_msgSender()][nonce] = true;
        token.burn(amount, _msgSender());
        emit SwapInitialized(
            msg.sender,
            to,
            amount,
            nonce,
            signature
        );
    }

    function redeem(
        address from, 
        address to, 
        uint amount, 
        uint nonce,
        bytes calldata signature
    ) external {
        bytes32 message = ECDSA.toEthSignedMessageHash(
            keccak256(abi.encodePacked(
                from, 
                to, 
                amount,
                nonce
            ))
        );

        require(ECDSA.recover(message, signature) == from, "Wrong signature");
        require(processedNonces[from][nonce] == false, "Transfer already processed");
        processedNonces[from][nonce] = true;
        token.mint(amount, to);
        emit SwapComplete(
            from,
            to,
            amount,
            nonce,
            signature
        );
    }
}