//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract DAO is Ownable {
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
        uint256 balance;
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

    Counters.Counter private ids;
    IERC20 private voteToken;
    uint256 private minimumQuorum;
    uint private debatingPeriodDuration;

    mapping(uint => Proposal) private proposals;
    mapping(address => Account) private accounts;

    constructor(
        IERC20 _voteToken, 
        uint256 _minimumQuorum, 
        uint _debatingPeriodDuration
    ) {
        voteToken = _voteToken;
        minimumQuorum = _minimumQuorum;
        debatingPeriodDuration = _debatingPeriodDuration;
    }

    function createProposal(
        address recepient, 
        bytes memory _calldata, 
        string memory description
    ) external onlyOwner {

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

    function deposit(uint256 amount) external {
        Account storage account = accounts[_msgSender()];
        voteToken.transferFrom(_msgSender(), address(this), amount);
        account.balance += amount;
    }

    function withdraw() external {
        Account storage account = accounts[_msgSender()];
        for (
                uint256 proposalIndex = 0; 
                proposalIndex < account.propositionVotes.length(); 
                proposalIndex++
            ) {
            
            require(
                proposals[
                    account.propositionVotes.at(proposalIndex)
                ].status != ProposalStatus.PROPOSED, "There is debating proposal"
            );
        }

        voteToken.transfer(_msgSender(), account.balance);
        account.balance = 0;
    }

    function vote(uint id, uint256 amount, VoteType voteType) external {
        Proposal storage proposal = proposals[id];
        require(proposal.status == ProposalStatus.PROPOSED, "There is no proposal");
        Account storage account = accounts[_msgSender()];
        require(!account.propositionVotes.contains(id), "Already voted");
        require(account.balance >= amount, "Too low balance");

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
}