//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../Permissions.sol";

abstract contract PhaseFeature is Ownable, Permissions {

    enum Phase {
        NONE, TRADE, SALE
    }

    event PhaseChanged(Phase newPhase);

    Phase public currentPhase;
    uint public startPhaseTimestamp;
    uint public constant PHASE_DURATION  = 3 * 60 * 60 * 24;

    function startPlatform() external onlyOwner {
        startPhaseTimestamp = block.timestamp;
        currentPhase = Phase.SALE;
        prepareFirstSale();
    }

    function finishSalePhase() internal {
        startPhaseTimestamp = block.timestamp;
        currentPhase = Phase.TRADE;
    }

    function prepareFirstSale() virtual internal;
    function finishSaleHook() virtual internal;
    function finishTradeHook() virtual internal;
    function startSaleHook() virtual internal;
    function startTradeHook() virtual internal;
    function getTradedCap() virtual internal view returns(uint);

    function switchPhase() internal {
        startPhaseTimestamp = block.timestamp;
        Phase nextPhase;
        if (currentPhase == Phase.SALE) {
            finishSaleHook();
            nextPhase = Phase.TRADE;
            startTradeHook();
        }
        if (currentPhase == Phase.TRADE) {
            finishTradeHook();
            nextPhase = Phase.SALE;
            startSaleHook();
        }
        emit PhaseChanged(nextPhase);
        currentPhase = nextPhase;
    }

    function changePhase() external {
        determinePhase(block.timestamp);
    }

    function isPhaseStillActive() external view returns(bool) {
        return (block.timestamp - startPhaseTimestamp) >= PHASE_DURATION;
    }

    function determinePhase(uint targetTimestamp) internal returns(Phase) {
        if ((targetTimestamp - startPhaseTimestamp) >= PHASE_DURATION) {
            switchPhase();
        }
        return currentPhase;
    }

    modifier forSalePhase() {
        require(currentPhase != Phase.NONE, "Platform still not started");
        require(determinePhase(block.timestamp) == Phase.SALE, "Not SALE phase");
        _;
    }

    modifier forTradePhase() {
        require(currentPhase != Phase.NONE, "Platform still not started");
        require(determinePhase(block.timestamp) == Phase.TRADE, "Not TRADE phase");
        _;
    }

    
}