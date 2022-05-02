//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./Authority.sol";
import "./Permissions.sol";
import "./Token.sol";

contract Staking is AccessControl, Permissions {
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
        XXXToken rewardToken;
        uint256 tick;
        uint8 rewardPercent;
        uint256 freezePeriod;
    }

    Terms private terms;
    mapping(address => StakingAccount) private _accounts;

    constructor(
        IERC20 stakingToken,
        XXXToken rewardToken,
        uint256 tick,
        uint8 rewardPercent,
        uint256 freezePeriod,
        Authority _authority
    ) Permissions(_authority) {
        _setupRole(MANAGER_ROLE, _msgSender());
        manage(stakingToken, rewardToken, tick, rewardPercent, freezePeriod);
    }

    function manage(
        IERC20 stakingToken,
        XXXToken rewardToken,
        uint256 tick,
        uint8 rewardPercent,
        uint256 freezePeriod
    ) public onlyRole(MANAGER_ROLE) {
        terms.tokenToSatking = stakingToken;
        terms.rewardToken = rewardToken;
        terms.tick = tick;
        terms.rewardPercent = rewardPercent;
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
            terms.rewardPercent) / 100 + account.collectedRewardAmount;
    }

    function getStakedAmount(address user) external view returns(uint256) {
        StakingAccount storage account = _accounts[user];
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
        account.collectedRewardAmount = 0;

        terms.rewardToken.mint(_msgSender(), tokensToClaim);
    }

    function claim() external {
        require(getClaimableAmount() > 0, "There's no reward to claim");
        require(!authority.dao().hasUnfinishedVotes(_msgSender()), "There is debating proposals");
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