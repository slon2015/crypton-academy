/* eslint-disable no-unused-expressions */
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish, Contract } from "ethers";
import { ethers } from "hardhat";
import {
    ACDM,
    Authority,
    DAO,
    ERC20,
    Platform,
    Staking,
    XXXToken,
} from "../typechain";
import { increaseTime } from "./utils";
import UniswapRouter from "@uniswap/v2-periphery/build/UniswapV2Router02.json";
import { createSystem } from "../scripts/createSystem";

describe("Referal programm", async function () {
    let owner: SignerWithAddress,
        seller: SignerWithAddress,
        referal1: SignerWithAddress,
        referal2: SignerWithAddress,
        trader1: SignerWithAddress,
        trader2: SignerWithAddress;
    let platform: Platform,
        acdm: ACDM,
        xtoken: XXXToken,
        staking: Staking,
        dao: DAO,
        authority: Authority,
        lpToken: ERC20;
    let debatePeriod: number;

    async function addVotePower(user: SignerWithAddress, amount: number) {
        if (user !== owner) {
            const sendTx = await lpToken
                .connect(owner)
                .transfer(user.address, amount);
            await sendTx.wait();
        }

        const approve = await lpToken
            .connect(user)
            .approve(staking.address, amount);
        await approve.wait();
        const stakeTx = await staking.connect(user).stake(amount);
        await stakeTx.wait();
    }

    async function voteFor(
        user: SignerWithAddress,
        amount: number,
        proposalId: number
    ) {
        const voteTx = await dao.connect(user).vote(proposalId, amount, 1);
        await voteTx.wait();
    }

    async function registerWithReferal(
        user: SignerWithAddress,
        referal?: SignerWithAddress
    ) {
        const referAddress = referal
            ? referal.address
            : ethers.constants.AddressZero;
        const registerTx = await platform.connect(user).register(referAddress);
        await registerTx.wait();
    }

    this.beforeEach(async () => {
        [owner, seller, trader1, trader2, referal1, referal2] =
            await ethers.getSigners();

        const system = await createSystem();
        acdm = system.ACDMToken.contract;
        xtoken = system.XToken.contract;
        platform = system.platform.contract;
        dao = system.dao.contract;
        staking = system.staking.contract;
        lpToken = system.staking.pair;
        authority = system.authority.contract;

        debatePeriod = system.dao.debatingPeriod;

        const startTx = await platform.startPlatform();
        await startTx.wait();
    });

    async function increaseExtractedComission(balanceToBuy: BigNumberish) {
        const approve = await acdm
            .connect(trader1)
            .approve(platform.address, 1);
        await approve.wait();

        const setOrder = await platform
            .connect(trader1)
            .createOrder(1, balanceToBuy);
        await setOrder.wait();

        const buyOrder = await platform
            .connect(trader2)
            .buyFromOrder(0, 1, { value: balanceToBuy });
        await buyOrder.wait();
    }

    it("Should collect commission on TRADE phase", async () => {
        const salePrice = await platform.price();
        const balanceToBuy = salePrice;
        const expectedSaleComission = salePrice;
        const expectedTradeComission = balanceToBuy.mul(2).mul(50).div(1000);

        const initialBuy = await platform.connect(trader1).buyOnSale({
            value: balanceToBuy,
        });
        await initialBuy.wait();

        await increaseTime((await platform.PHASE_DURATION()).toNumber() + 60);

        await increaseExtractedComission(balanceToBuy.mul(2));

        expect(await platform.extractedComission()).is.equal(
            expectedSaleComission.add(expectedTradeComission)
        );
    });

    it("Should send comission to referals on TRADE phase", async () => {
        const salePrice = await platform.price();
        const balanceToBuy = salePrice;
        const initialBuy = await platform.connect(trader1).buyOnSale({
            value: balanceToBuy,
        });
        await initialBuy.wait();
        await increaseTime((await platform.PHASE_DURATION()).toNumber() + 60);
        await registerWithReferal(referal1);
        await registerWithReferal(referal2, referal1);
        await registerWithReferal(trader1, referal2);
        const referal1Balance = await referal1.getBalance();
        const referal2Balance = await referal2.getBalance();
        const platformComissionAmount = await platform.extractedComission();
        const approve = await acdm
            .connect(trader1)
            .approve(platform.address, 1);
        await approve.wait();
        const setOrder = await platform
            .connect(trader1)
            .createOrder(1, balanceToBuy);
        await setOrder.wait();

        const buyOrder = await platform
            .connect(trader2)
            .buyFromOrder(0, 1, { value: balanceToBuy });
        await buyOrder.wait();

        const referal1NewBalance = await referal1.getBalance();
        const referal2NewBalance = await referal2.getBalance();
        const platformNewComissionAmount = await platform.extractedComission();

        expect(platformNewComissionAmount).to.equal(platformComissionAmount);
        expect(referal1NewBalance.sub(referal1Balance)).to.equal(
            balanceToBuy.mul(25).div(1000)
        );
        expect(referal2NewBalance.sub(referal2Balance)).to.equal(
            balanceToBuy.mul(25).div(1000)
        );
    });

    it("Should send comission to referals on SALE phase", async () => {
        const salePrice = await platform.price();
        const balanceToBuy = salePrice;
        await registerWithReferal(referal1);
        await registerWithReferal(referal2, referal1);
        await registerWithReferal(trader1, referal2);
        const referal1Balance = await referal1.getBalance();
        const referal2Balance = await referal2.getBalance();
        const platformComissionAmount = await platform.extractedComission();

        const initialBuy = await platform.connect(trader1).buyOnSale({
            value: balanceToBuy,
        });
        await initialBuy.wait();

        const referal1NewBalance = await referal1.getBalance();
        const referal2NewBalance = await referal2.getBalance();
        const platformNewComissionAmount = await platform.extractedComission();

        expect(
            platformNewComissionAmount.sub(platformComissionAmount)
        ).to.equal(balanceToBuy.mul(920).div(1000));
        expect(referal1NewBalance.sub(referal1Balance)).to.equal(
            balanceToBuy.mul(50).div(1000)
        );
        expect(referal2NewBalance.sub(referal2Balance)).to.equal(
            balanceToBuy.mul(30).div(1000)
        );
    });

    it("Should buy and burn xTokens", async () => {
        const salePrice = await platform.price();
        const balanceToBuy = salePrice;
        const initialSupply = await xtoken.totalSupply();

        await addVotePower(trader1, 150);
        await addVotePower(trader2, 150);

        const initialBuy = await platform.connect(trader1).buyOnSale({
            value: balanceToBuy,
        });
        await initialBuy.wait();

        const calldata = platform.interface.encodeFunctionData("buyXToken", [
            1,
        ]);
        const propose = await dao.createProposal(
            platform.address,
            calldata,
            "Buy & burn some tokens"
        );
        await propose.wait();
        await voteFor(trader1, 150, 0);
        await voteFor(trader2, 150, 0);

        await increaseTime(debatePeriod);

        const finishProposal = await dao.finishProposal(0);
        await finishProposal.wait();

        const newTokenSupply = await xtoken.totalSupply();

        expect(await platform.extractedComission()).is.equal(salePrice.sub(1));
        expect(newTokenSupply.lt(initialSupply)).is.true;
    });

    it("Should send tokens to owner", async () => {
        const salePrice = await platform.price();
        const balanceToBuy = salePrice;

        await addVotePower(trader1, 150);
        await addVotePower(trader2, 150);

        const initialBuy = await platform.connect(trader1).buyOnSale({
            value: balanceToBuy,
        });
        await initialBuy.wait();

        const calldata = platform.interface.encodeFunctionData("sendToOwner", [
            owner.address,
            1,
        ]);
        const propose = await dao.createProposal(
            platform.address,
            calldata,
            "Buy & burn some tokens"
        );
        await propose.wait();
        await voteFor(trader1, 150, 0);
        await voteFor(trader2, 150, 0);

        await increaseTime(debatePeriod);

        const initialOwnerBalance = await owner.getBalance();

        const finishProposal = await dao.connect(trader1).finishProposal(0);
        await finishProposal.wait();

        const newOwnerBalance = await owner.getBalance();

        expect(await platform.extractedComission()).is.equal(salePrice.sub(1));
        expect(newOwnerBalance).is.equal(initialOwnerBalance.add(1));
    });
});
