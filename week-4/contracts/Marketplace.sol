//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "contracts/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Marketplace is Ownable {

    uint public constant AUCTION_TIME = 60 * 60 * 24 * 3;

    NFTErc721 private nft;

    enum OfferType { NONE, SIMPLE, AUCTION }

    struct Offer {
        OfferType offerType;
        uint tokenIndex;
        address seller;

        uint minValue;
        
        uint auctionCurrentValue;
        uint auctionBidCount;
        uint auctionStartTimestamp;
    }

    struct Bid {
        bool hasBid;
        uint tokenIndex;
        address bidder;
        uint value;
    }

    mapping (uint => Offer) private offersForSale;

    mapping (uint => Bid) private bids;

    mapping (address => uint) private pendingWithdrawals;

    function setNft(NFTErc721 _nft) external onlyOwner {
        nft = _nft;
    }

    function create(string memory metadata) external {
        uint256 tokenId = nft.create(metadata);
        nft.safeTransferFrom(address(this), _msgSender(), tokenId);
    }

    function withdraw() external {
        uint amount = pendingWithdrawals[_msgSender()];

        pendingWithdrawals[_msgSender()] = 0;
        payable(_msgSender()).transfer(amount);
    }

    function listItem(uint tokenIndex, uint minPriceInWei) external {
        require(nft.ownerOf(tokenIndex) == _msgSender(), "Not owner of token");
        require(nft.isApprovedForAll(_msgSender(), address(this)), "Not approved for marketplace");
        Offer memory offer = offersForSale[tokenIndex];
        require(offer.offerType == OfferType.NONE, "Item already has offer");

        offersForSale[tokenIndex] = Offer(
            OfferType.SIMPLE, 
            tokenIndex, 
            _msgSender(), 
            minPriceInWei, 
            0, 0, 0
        );
    }

    function buyItem(uint tokenIndex) external payable {
        Offer memory offer = offersForSale[tokenIndex];

        require(offer.offerType == OfferType.SIMPLE, "Token not for sale");
        require(offer.seller == nft.ownerOf(tokenIndex), "Owner changed");
        require(msg.value >= offer.minValue, "Too low bid");

        nft.safeTransferFrom(offer.seller, _msgSender(), tokenIndex);
        pendingWithdrawals[offer.seller] += msg.value;

        offersForSale[tokenIndex] = Offer(
            OfferType.NONE, 
            tokenIndex, 
            address(0), 
            0,
            0, 0, 0
        );
    }

    function cancel(uint tokenIndex) external {
        require(nft.ownerOf(tokenIndex) == _msgSender(), "Not owner of token");
        Offer memory offer = offersForSale[tokenIndex];
        require(offer.offerType == OfferType.SIMPLE, "Token not for sale");

        offersForSale[tokenIndex] = Offer(
            OfferType.NONE, 
            tokenIndex, 
            address(0), 
            0,
            0, 0, 0
        );
    }

    function listItemForAuction(uint tokenIndex, uint minPriceInWei) external {
        require(nft.ownerOf(tokenIndex) == _msgSender(), "Not owner of token");
        require(nft.isApprovedForAll(_msgSender(), address(this)), "Not approved for marketplace");
        Offer memory offer = offersForSale[tokenIndex];
        require(offer.offerType == OfferType.NONE, "Item already has offer");

        offersForSale[tokenIndex] = Offer(
            OfferType.AUCTION,
            tokenIndex,
            _msgSender(),
            0,
            minPriceInWei,
            0,
            block.timestamp
        );
    }

    function makeBid(uint tokenIndex) external payable {
        Offer storage offer = offersForSale[tokenIndex];
        require(offer.offerType == OfferType.AUCTION, "There is no auction");
        require(offer.seller == nft.ownerOf(tokenIndex), "Owner changed");
        require(msg.value > offer.auctionCurrentValue, "There is greater bid");

        Bid memory failedBid = bids[tokenIndex];
        if (failedBid.value > 0) {
            pendingWithdrawals[failedBid.bidder] += failedBid.value;
        }

        bids[tokenIndex] = Bid(true, tokenIndex, _msgSender(), msg.value);
        offer.auctionCurrentValue = msg.value;
        offer.auctionBidCount += 1;
    }

    function finishAuction(uint tokenIndex) external {
        Offer storage offer = offersForSale[tokenIndex];
        require(offer.offerType == OfferType.AUCTION, "There is no auction");
        require(offer.seller == nft.ownerOf(tokenIndex), "Not owner");
        require(offer.auctionBidCount >= 2, "Too low bid count");
        require(block.timestamp >= offer.auctionStartTimestamp + AUCTION_TIME, "Too early to finish auction");

        Bid memory winerBid = bids[tokenIndex];
        bids[tokenIndex] = Bid(false, tokenIndex, address(0), 0);

        nft.safeTransferFrom(offer.seller, winerBid.bidder, tokenIndex);
        pendingWithdrawals[offer.seller] += winerBid.value;

        offersForSale[tokenIndex] = Offer(
            OfferType.NONE, 
            tokenIndex, 
            address(0),
            0,
            0, 0, 0
        );
    }

    function cancelAuction(uint tokenIndex) external {
        Offer memory offer = offersForSale[tokenIndex];
        require(offer.offerType == OfferType.AUCTION, "There is no auction");
        require(offer.seller == nft.ownerOf(tokenIndex), "Not owner");
        require(block.timestamp >= offer.auctionStartTimestamp + AUCTION_TIME, "Too early to finish auction");

        Bid memory cancelledBid = bids[tokenIndex];
        if (cancelledBid.value > 0) {
            pendingWithdrawals[cancelledBid.bidder] += cancelledBid.value;
        }
        bids[tokenIndex] = Bid(false, tokenIndex, address(0), 0);
        offersForSale[tokenIndex] = Offer(
            OfferType.NONE, 
            tokenIndex, 
            address(0),
            0,
            0, 0, 0
        );
    }
}