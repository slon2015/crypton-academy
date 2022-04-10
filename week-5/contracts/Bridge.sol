//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./Token.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Context.sol";

contract Bridge is Context {

    bytes32 public constant ROLE_RELAYER = keccak256("ROLE_RELAYER");

    Token private token;
    address private validator;

    mapping(address => mapping(uint => bool)) public processedNonces;

    event SwapInitialized(
        address from,
        address to,
        uint amount,
        uint nonce,
        bytes32 messageToSign
    );

    event SwapComplete(
        address from,
        address to,
        uint amount,
        uint nonce,
        bytes signature
    );

    constructor(Token _token, address _validator) {
        token = _token;
        validator = _validator;
    }

    function swap(address to, uint amount, uint nonce) external {
        require(processedNonces[_msgSender()][nonce] == false, "Transfer already processed");
        require(token.allowance(_msgSender(), address(this)) >= amount, "Tokens not allowed");
        processedNonces[_msgSender()][nonce] = true;
        token.transferFrom(_msgSender(), address(this), amount);
        emit SwapInitialized(
            msg.sender,
            to,
            amount,
            nonce,
            keccak256(abi.encodePacked(
                _msgSender(), 
                to, 
                amount,
                nonce
            ))
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

        require(ECDSA.recover(message, signature) == validator, "Wrong signature");
        require(processedNonces[from][nonce] == false, "Transfer already processed");
        processedNonces[from][nonce] = true;
        token.transfer(to, amount);
        emit SwapComplete(
            from,
            to,
            amount,
            nonce,
            signature
        );
    }
}