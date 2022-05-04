//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./Authority.sol";
import "./Permissions.sol";

contract DAO is Ownable, Permissions {
    using Counters for Counters.Counter;
    using EnumerableSet for EnumerableSet.UintSet;

    enum ProposalStatus {
        NOT_EXISTS, PROPOSED, FINISHED
    }

    struct Proposal {
        ProposalStatus status;
        address recepient;
        bytes _calldata;
        string description;
        uint proposedTime;
        uint256 approveVotes;
        uint256 rejectVotes;
        uint256 neutralVotes;
    }

    struct Account {
        EnumerableSet.UintSet propositionVotes;
    }

    event ProsalCreated(
        uint id, 
        address recepient, 
        bytes _calldata, 
        string description
    );

    enum VoteType {
        NEUTRAL, APPROVE, REJECT
    } 

    uint public tradeReferalFeePercentile = 25;
    uint public stakingFreezePeriod = 60 * 60 * 24 * 7;
    uint public firstLevelReferalPercentileForSale = 30;
    uint public secondLevelReferalPercentileForSale = 50;

    Counters.Counter private ids;
    uint256 private minimumQuorum;
    uint private debatingPeriodDuration;

    mapping(uint => Proposal) private proposals;
    mapping(address => Account) private accounts;

    constructor(
        uint256 _minimumQuorum, 
        uint _debatingPeriodDuration,
        Authority _authority
    ) Permissions(_authority) {
        minimumQuorum = _minimumQuorum;
        debatingPeriodDuration = _debatingPeriodDuration;
    }

    function createProposal(
        address recepient, 
        bytes memory _calldata, 
        string memory description
    ) 
        external 
        onlyOwner 
    {
        proposals[ids.current()] = Proposal(
            ProposalStatus.PROPOSED,
            recepient,
            _calldata,
            description,
            block.timestamp,
            0, 0, 0
        );

        emit ProsalCreated(
            ids.current(), recepient, _calldata, description
        );
        ids.increment();
    }

    function vote(uint id, uint256 amount, VoteType voteType) external {
        Proposal storage proposal = proposals[id];
        require(proposal.status == ProposalStatus.PROPOSED, "There is no proposal");
        Account storage account = accounts[_msgSender()];
        uint256 balance = authority.staking().getStakedAmount(_msgSender());
        require(!account.propositionVotes.contains(id), "Already voted");
        require(balance >= amount, "Too low balance");

        if (voteType == VoteType.NEUTRAL) {
            proposal.neutralVotes += amount;
        }
        if (voteType == VoteType.APPROVE) {
            proposal.approveVotes += amount;
        }
        if (voteType == VoteType.REJECT) {
            proposal.rejectVotes += amount;
        }

        account.propositionVotes.add(id);
    }

    function hasUnfinishedVotes(address participant) 
        external 
        view 
        returns(bool) 
    {
        Account storage account = accounts[participant];
        for (
                uint256 proposalIndex = 0; 
                proposalIndex < account.propositionVotes.length(); 
                proposalIndex++
            ) {
            
            if(
                proposals[
                    account.propositionVotes.at(proposalIndex)
                ].status == ProposalStatus.PROPOSED
            ) {
                return true;
            }
        }
        return false;
    }

    function finishProposal(uint id) external {
        Proposal storage proposal = proposals[id];
        require(proposal.status == ProposalStatus.PROPOSED, "There is no proposal in progress");
        require(proposal.proposedTime + debatingPeriodDuration <= block.timestamp, "Debates still in progress");

        proposal.status = ProposalStatus.FINISHED;
        
        if (
            proposal.approveVotes + proposal.rejectVotes + proposal.neutralVotes >= minimumQuorum &&
            proposal.approveVotes > proposal.rejectVotes
        ) {
            proposal.recepient.call(proposal._calldata);
        }
    }

    function setTradeReferalFeePercentile(uint newPercentile) 
        external 
        onlyDao 
    {
        tradeReferalFeePercentile = newPercentile;
    }

    function setStakingFreezePeriod(uint newFreezePeriod) 
        external 
        onlyDao 
    {
        stakingFreezePeriod = newFreezePeriod;
    }

    function setFirstLevelReferalPercentileForSale(uint newPercentile) 
        external 
        onlyDao 
    {
        firstLevelReferalPercentileForSale = newPercentile;
    }

    function setSecondLevelReferalPercentileForSale(uint newPercentile) 
        external 
        onlyDao 
    {
        secondLevelReferalPercentileForSale = newPercentile;
    }
}