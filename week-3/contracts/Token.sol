//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./IERC20.sol";

contract Token is IERC20 {
    address private _distributor;

    string private _name;
    string private _symbol;
    uint8 private _decimals;

    uint256 private _totalSupply;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    constructor (
        uint256 supply,
        string memory definedName, 
        string memory definedSymbol
    ) {
        _name = definedName;
        _symbol = definedSymbol;
        _decimals = 18;
        _totalSupply = supply;
        _distributor = msg.sender;
        _balances[msg.sender] = supply;
    }

    function name() external view override returns (string memory) {
        return _name;
    }

    function symbol() external view override returns (string memory) {
        return _symbol;
    }

    function decimals() external view override returns (uint8) {
        return _decimals;
    }

    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }
    
    function balanceOf(address account) external view override returns (uint256) {
        return _balances[account];
    }

    function transfer(address recipient, uint256 amount) external override returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    function _transfer(address sender, address recipient, uint256 amount) internal {

        require(sender != address(0), "transfer from the zero address");
        require(recipient != address(0), "transfer to the zero address");
        require(_balances[sender] >= amount, "transfer amount exceeds balance");

        _balances[sender] = _balances[sender] - amount;
        _balances[recipient] = _balances[recipient] + amount;
        emit Transfer(sender, recipient, amount);
    }

    function allowance(address owner, address spender) external view override returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function _approve(address owner, address spender, uint256 amount) internal {

        require(owner != address(0), 
            "approve from the zero address");
        require(spender != address(0), 
            "approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);

    }

    function transferFrom(address sender, address recipient, uint256 amount) external override returns (bool) {
        require(_allowances[sender][msg.sender] >= amount, "transfer amount exceeds allowance");
        _transfer(sender, recipient, amount);
        _approve(sender, msg.sender, _allowances[sender][msg.sender] - amount);
        return true;
    }

    function mint(address recepient, uint256 amount) public {
        require(msg.sender == _distributor, "Not distributor");

        _balances[recepient] = _balances[recepient] + amount;
        _totalSupply += amount;
    }

    function burn(address target, uint256 amount) public {
        require(msg.sender == target || msg.sender == _distributor, "Not permited for burn");
        require(_balances[target] >= amount, "Too low for burn");

        _balances[target] = _balances[target] - amount;
        _totalSupply -= amount;
    }
}
