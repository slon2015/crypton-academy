/* eslint-disable no-unused-vars */
/* eslint-disable no-unused-expressions */
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Marketplace, NFTErc721 } from "../typechain";
import { increaseTime, mine } from "./utils";

describe("MarketPlace", function () {
    const auctionTime = 60 * 60 * 24 * 3;
    let nft: NFTErc721;
    let marketplace: Marketplace;
    let Deployer: SignerWithAddress,
        Owner: SignerWithAddress,
        Buyer: SignerWithAddress,
        SecondBuyer: SignerWithAddress;

    this.beforeEach(async () => {
        const nftFactory = await ethers.getContractFactory("NFTErc721");
        nft = await nftFactory.deploy();
        await mine(nft.deployTransaction);

        const marketplaceFactory = await ethers.getContractFactory(
            "Marketplace"
        );
        marketplace = await marketplaceFactory.deploy();
        await mine(marketplace.deployTransaction);

        let tx = await marketplace.setNft(nft.address);
        await mine(tx);
        await mine(await nft.transferOwnership(marketplace.address));

        [Deployer, Owner, Buyer, SecondBuyer] = await ethers.getSigners();

        mine(
            await nft
                .connect(Owner)
                .setApprovalForAll(marketplace.address, true)
        );

        tx = await marketplace.connect(Owner).create("http://metadata/1");
        await mine(tx);
    });

    it("Should list & buy item", async () => {
        const initialOwnerBalance = await Owner.getBalance();
        const initialBuyerBalance = await Buyer.getBalance();

        mine(await marketplace.connect(Owner).listItem(1, 100));

        mine(await marketplace.connect(Buyer).buyItem(1, { value: 100 }));
        mine(await marketplace.connect(Owner).withdraw());

        expect(await nft.ownerOf(1)).to.be.equal(Buyer.address);
        expect(await Owner.getBalance()).to.be.equal(
            initialOwnerBalance.add(100)
        );
        expect(await Buyer.getBalance()).to.be.equal(
            initialBuyerBalance.sub(100)
        );
    });

    it("Should return ether margin", async () => {
        const initialOwnerBalance = await Owner.getBalance();
        const initialBuyerBalance = await Buyer.getBalance();

        mine(await marketplace.connect(Owner).listItem(1, 100));

        mine(await marketplace.connect(Buyer).buyItem(1, { value: 150 }));
        mine(
            await marketplace.connect(Owner).withdraw(),
            await marketplace.connect(Buyer).withdraw()
        );

        expect(await nft.ownerOf(1)).to.be.equal(Buyer.address);
        expect(await Owner.getBalance()).to.be.equal(
            initialOwnerBalance.add(100)
        );
        expect(await Buyer.getBalance()).to.be.equal(
            initialBuyerBalance.sub(100)
        );
    });

    it("Should list & cancel offer without buying", async () => {
        const initialOwnerBalance = await Owner.getBalance();
        const initialBuyerBalance = await Buyer.getBalance();

        mine(await marketplace.connect(Owner).listItem(1, 100));
        mine(await marketplace.connect(Owner).cancel(1));

        expect(await nft.ownerOf(1)).to.be.equal(Owner.address);
        expect(await Owner.getBalance()).to.be.equal(initialOwnerBalance);
        expect(await Buyer.getBalance()).to.be.equal(initialBuyerBalance);
    });

    it("Should list on auction and sold for third bid", async () => {
        const initialOwnerBalance = await Owner.getBalance();
        const initialBuyerBalance = await Buyer.getBalance();
        const initialSecondBuyerBalance = await SecondBuyer.getBalance();

        mine(await marketplace.connect(Owner).listItemForAuction(1, 100));

        mine(
            await marketplace.connect(Buyer).makeBid(1, {
                value: 120,
            })
        );

        mine(
            await marketplace.connect(SecondBuyer).makeBid(1, {
                value: 150,
            })
        );

        mine(
            await marketplace.connect(Buyer).makeBid(1, {
                value: 170,
            })
        );

        mine(await marketplace.connect(Buyer).withdraw());

        increaseTime(auctionTime + 100);

        mine(await marketplace.connect(Owner).finishAuction(1));
        mine(
            await marketplace.connect(Owner).withdraw(),
            await marketplace.connect(SecondBuyer).withdraw()
        );

        expect(await nft.ownerOf(1)).to.be.equal(Buyer.address);
        expect(await Owner.getBalance()).to.be.equal(
            initialOwnerBalance.add(170)
        );
        expect(await Buyer.getBalance()).to.be.equal(
            initialBuyerBalance.sub(170)
        );
        expect(await SecondBuyer.getBalance()).to.be.equal(
            initialSecondBuyerBalance
        );
    });

    it("Should return bid after canceled auction", async () => {
        const initialOwnerBalance = await Owner.getBalance();
        const initialBuyerBalance = await Buyer.getBalance();
        const initialSecondBuyerBalance = await SecondBuyer.getBalance();

        mine(await marketplace.connect(Owner).listItemForAuction(1, 100));

        mine(
            await marketplace.connect(Buyer).makeBid(1, {
                value: 120,
            })
        );

        mine(
            await marketplace.connect(SecondBuyer).makeBid(1, {
                value: 150,
            })
        );

        mine(await marketplace.connect(Buyer).withdraw());

        increaseTime(auctionTime + 100);

        mine(await marketplace.connect(Owner).cancelAuction(1));
        mine(await marketplace.connect(SecondBuyer).withdraw());

        expect(await nft.ownerOf(1)).to.be.equal(Owner.address);
        expect(await Owner.getBalance()).to.be.equal(initialOwnerBalance);
        expect(await Buyer.getBalance()).to.be.equal(initialBuyerBalance);
        expect(await SecondBuyer.getBalance()).to.be.equal(
            initialSecondBuyerBalance
        );
    });

    it("Should list on auction and canceled without sold", async () => {
        const initialOwnerBalance = await Owner.getBalance();

        mine(await marketplace.connect(Owner).listItemForAuction(1, 100));

        increaseTime(auctionTime + 100);

        mine(await marketplace.connect(Owner).cancelAuction(1));

        expect(await nft.ownerOf(1)).to.be.equal(Owner.address);
        expect(await Owner.getBalance()).to.be.equal(initialOwnerBalance);
    });

    it("Should not finish auction early than 3 days", async () => {
        mine(await marketplace.connect(Owner).listItemForAuction(1, 100));

        expect(marketplace.connect(Owner).cancelAuction(1)).to.be.revertedWith(
            "Too early to finish auction"
        );

        mine(
            await marketplace.connect(Buyer).makeBid(1, {
                value: 120,
            })
        );

        mine(
            await marketplace.connect(SecondBuyer).makeBid(1, {
                value: 150,
            })
        );

        expect(marketplace.connect(Owner).finishAuction(1)).to.be.revertedWith(
            "Too early to finish auction"
        );
    });

    it("Should not finish auction where had lesser than 2 bids", async () => {
        mine(await marketplace.connect(Owner).listItemForAuction(1, 100));

        increaseTime(auctionTime + 100);

        expect(marketplace.connect(Owner).finishAuction(1)).to.be.revertedWith(
            "Too low bid count"
        );
    });

    it("Should not create offer for Owner, who not approved tokens for marketplace", async () => {
        mine(
            await nft
                .connect(Owner)
                .setApprovalForAll(marketplace.address, false)
        );

        expect(marketplace.connect(Owner).listItem(1, 100)).to.be.revertedWith(
            "Not approved for marketplace"
        );

        expect(
            marketplace.connect(Owner).listItemForAuction(1, 100)
        ).to.be.revertedWith("Not approved for marketplace");
    });

    it("Should not create simple sell for item which already had auction", async () => {
        mine(await marketplace.connect(Owner).listItem(1, 100));

        expect(marketplace.listItemForAuction(1, 100)).to.be.revertedWith(
            "Item already has offer"
        );
    });

    it("Should not create auction for item which already had simple sell", async () => {
        mine(await marketplace.connect(Owner).listItemForAuction(1, 100));

        expect(marketplace.listItem(1, 100)).to.be.revertedWith(
            "Item already has offer"
        );
    });
});
