//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./DAO.sol";
import "./Staking.sol";
import "./Token.sol";
import "./platform/Platform.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

contract Authority is Ownable {
    Staking public staking;
    Platform public platform;

    DAO public dao;

    ACDM public acdm;
    XXXToken public acdmx;

    IUniswapV2Router02 public router = IUniswapV2Router02(address(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D));

    function setStaking(Staking _staking) external onlyOwner {
        staking = _staking;
    }

    function setPlatform(Platform _platform) external onlyOwner {
        platform = _platform;
    }

    function setDao(DAO _dao) external onlyOwner {
        dao = _dao;
    }

    function setACDM(ACDM _acdm) external onlyOwner {
        acdm = _acdm;
    }

    function setACDMx(XXXToken _acdmx) external onlyOwner {
        acdmx = _acdmx;
    }

    function setRouter(IUniswapV2Router02 _router) external onlyOwner {
        router = _router;
    }
}