//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Staking is AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    struct StakingAccount {
        uint256 stakedTimestamp;
        uint256 amount;
        uint256 lastClaimed;
        uint256 collectedRewardAmount;
    }

    struct Terms {
        IERC20 tokenToSatking;
        IERC20 rewardToken;
        uint256 tick;
        uint8 rewardPercent;
        address treasury;
        uint256 freezePeriod;
    }

    Terms private terms;
    mapping(address => StakingAccount) private _accounts;

    constructor(
        IERC20 stakingToken,
        IERC20 rewardToken,
        uint256 tick,
        uint8 rewardPercent,
        address treasury,
        uint256 freezePeriod
    ) {
        _setupRole(MANAGER_ROLE, _msgSender());
        manage(stakingToken, rewardToken, tick, rewardPercent, treasury, freezePeriod);
    }

    function manage(
        IERC20 stakingToken,
        IERC20 rewardToken,
        uint256 tick,
        uint8 rewardPercent,
        address treasury,
        uint256 freezePeriod
    ) public onlyRole(MANAGER_ROLE) {
        terms.tokenToSatking = stakingToken;
        terms.rewardToken = rewardToken;
        terms.tick = tick;
        terms.rewardPercent = rewardPercent;
        terms.treasury = treasury;
        terms.freezePeriod = freezePeriod;
    }

    function stake(uint256 amountToStake) external {
        require(amountToStake > 0, "Amount must be highter than 0");
        StakingAccount storage account = _accounts[_msgSender()];

        account.collectedRewardAmount += _calculateReward(account);

        account.stakedTimestamp = block.timestamp;
        account.lastClaimed = account.stakedTimestamp;

        account.amount += amountToStake;
        terms.tokenToSatking.safeTransferFrom(_msgSender(), address(this), amountToStake);
    }

    function _calculateReward(StakingAccount storage account) internal view returns (uint256) {
        return (account.amount * 
            ((block.timestamp - account.lastClaimed) / terms.tick) * 
            terms.rewardPercent) / 100.0 + account.collectedRewardAmount;
    }

    function getStakedAmount() external view returns(uint256) {
        StakingAccount storage account = _accounts[_msgSender()];
        return account.amount;
    }

    function getClaimableAmount() public view returns(uint256) {
        StakingAccount storage account = _accounts[_msgSender()];
        return _calculateReward(account);
    }

    function _claim() internal {
        StakingAccount storage account = _accounts[_msgSender()];
        uint256 tokensToClaim = _calculateReward(account);
        account.lastClaimed = block.timestamp;

        terms.rewardToken.safeTransferFrom(terms.treasury, _msgSender(), tokensToClaim);
    }

    function claim() external {
        require(getClaimableAmount() > 0, "There's no reward to claim");
        _claim();
    }

    function unstake() external {
        StakingAccount storage account = _accounts[_msgSender()];
        require(block.timestamp - account.stakedTimestamp >= terms.freezePeriod, 
            "Too early to unstake");
        if (getClaimableAmount() > 0) {
            _claim();
        }

        terms.tokenToSatking.safeTransfer(_msgSender(), account.amount);

        account.amount = 0;
        _accounts[_msgSender()] = account;
    }

    function getTerms() external view returns(Terms memory) {
        return terms;
    }
}