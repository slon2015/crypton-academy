//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./PhaseFeature.sol";
import "./ReferalsFeature.sol";
import "../Token.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

abstract contract TradeFeature is PhaseFeature, ReferalsFeature {
    using Counters for Counters.Counter;

    struct Order {
        bool active;
        address seller;
        uint amount;
        uint priceInWeiPerToken;
    }

    event OrderCreated(uint id, uint amount, uint price);
    event OrderClosed(uint id);

    uint public tradeCap;
    mapping(uint => Order) private orders;
    Counters.Counter private ids;

    function getTradedCap() override internal view returns(uint) {
        return tradeCap;
    }

    function startTradeHook() override internal {
        tradeCap = 0;
    }

    function finishTradeHook() override internal {}

    function createOrder(uint amount, uint price) external forTradePhase {
        authority.acdm().transferFrom(_msgSender(), address(this), amount);
        orders[ids.current()] = Order(
            true, _msgSender(), amount, price
        );
        emit OrderCreated(ids.current(), amount, price);
        ids.increment();
    }

    function closeOrder(uint id) external {
        Order storage order = orders[id];
        require(_msgSender() == order.seller, "Not yours order");
        require(order.active, "Already closed");

        authority.acdm().transfer(order.seller, order.amount);
        order.active = false;
        emit OrderClosed(id);
    }

    function buyFromOrder(uint orderId, uint amount) external payable forTradePhase {
        Order storage order = orders[orderId];
        require(order.active, "Order already closed");
        require(order.amount >= amount, "Too big amount");
        require(msg.value >= amount * order.priceInWeiPerToken, "Too low eth");

        order.amount -= amount;

        uint toSendBack = msg.value - (amount * order.priceInWeiPerToken);
        if (toSendBack > 0) {
            _msgSender().call{value: toSendBack}("");
        }
        tradeCap += msg.value - toSendBack;
        uint comissionAmount = applyComissionForTrade(msg.value, order.seller);

        authority.acdm().transfer(_msgSender(), amount);
        order.seller.call{value: (amount * order.priceInWeiPerToken) - comissionAmount}("");
        

        if (order.amount == 0) {
            order.active = false;
            emit OrderClosed(orderId);
        }
    }
}