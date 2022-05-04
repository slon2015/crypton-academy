/* eslint-disable no-unused-expressions */
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { it } from "mocha";
import { ACDM, Authority, Platform } from "../typechain";
import { increaseTime } from "./utils";

describe("Platform", async function () {
    let owner: SignerWithAddress,
        seller: SignerWithAddress,
        trader1: SignerWithAddress,
        trader2: SignerWithAddress;
    let platform: Platform, acdm: ACDM, authority: Authority;

    this.beforeEach(async () => {
        [owner, seller, trader1, trader2] = await ethers.getSigners();

        const authorityFactory = await ethers.getContractFactory("Authority");
        const acdmFactory = await ethers.getContractFactory("ACDM");
        const platformFactory = await ethers.getContractFactory("Platform");
        const daoFactory = await ethers.getContractFactory("DAO");

        authority = await authorityFactory.deploy();
        await authority.deployed();

        acdm = await acdmFactory.deploy(authority.address);
        await acdm.deployed();
        const setAcdm = await authority.setACDM(acdm.address);
        await setAcdm.wait();

        const dao = await daoFactory.deploy(250, 1000, authority.address);
        await dao.deployed();
        const setDao = await authority.setDao(dao.address);
        await setDao.wait();

        platform = await platformFactory.deploy(authority.address);
        await platform.deployed();
        const setPlatform = await authority.setPlatform(platform.address);
        await setPlatform.wait();

        const startTx = await platform.startPlatform();
        await startTx.wait();
    });

    it("Should sell tokens on SALE phase", async () => {
        const initialBalance = await seller.getBalance();
        const balanceToBuy = (await platform.price()).mul(10);

        const tx = await platform.connect(seller).buyOnSale({
            value: balanceToBuy,
        });
        const receipt = await tx.wait();

        expect(await acdm.balanceOf(seller.address)).is.equal(10);
        expect(await seller.getBalance()).is.equal(
            initialBalance.sub(balanceToBuy).sub(receipt.effectiveGasPrice)
        );
    });

    it("Should not sell tokens on TRADE phase", async () => {
        const initialBalance = await seller.getBalance();
        const balanceToBuy = (await platform.price()).mul(10);

        await increaseTime((await platform.PHASE_DURATION()).toNumber() + 60);

        expect(
            platform.connect(seller).buyOnSale({
                value: balanceToBuy,
            })
        ).to.be.revertedWith("Not SALE phase");
        expect(await seller.getBalance()).is.equal(initialBalance);
    });

    it("Should trade tokens on TRADE phase", async () => {
        let trader1GasUsage = BigNumber.from(0);
        let trader2GasUsage = BigNumber.from(0);

        const salePrice = await platform.price();
        const balanceToBuy = salePrice.mul(10);

        const initialBuy = await platform.connect(trader1).buyOnSale({
            value: balanceToBuy,
        });
        trader1GasUsage = trader1GasUsage.add(
            (await initialBuy.wait()).effectiveGasPrice
        );

        await increaseTime((await platform.PHASE_DURATION()).toNumber() + 60);

        const approve = await acdm
            .connect(trader1)
            .approve(platform.address, 10);
        trader1GasUsage = trader1GasUsage.add(
            (await approve.wait()).effectiveGasPrice
        );

        const setOrder = await platform
            .connect(trader1)
            .createOrder(10, salePrice.mul(2));
        trader1GasUsage = trader1GasUsage.add(
            (await setOrder.wait()).effectiveGasPrice
        );

        const initialBalanceForTrader1 = await trader1.getBalance();
        const initialBalanceForTrader2 = await trader2.getBalance();

        const buyOrder = await platform
            .connect(trader2)
            .buyFromOrder(0, 10, { value: balanceToBuy.mul(2) });
        trader2GasUsage = trader1GasUsage.add(
            (await buyOrder.wait()).effectiveGasPrice
        );

        expect(await trader1.getBalance()).is.equal(
            initialBalanceForTrader1.add(balanceToBuy.mul(2).mul(950).div(1000))
        );
        expect(await trader2.getBalance()).is.equal(
            initialBalanceForTrader2
                .sub(balanceToBuy.mul(2))
                .sub(trader2GasUsage)
        );
        expect(await acdm.balanceOf(trader2.address)).is.equal(10);
        expect(await platform.tradeCap()).is.equal(balanceToBuy.mul(2));
    });

    it("Should correctly identifies current phase activity", async () => {
        expect(await platform.isPhaseStillActive()).is.true;
        expect(await platform.currentPhase()).is.equal(2);

        await increaseTime(
            (await platform.PHASE_DURATION()).add(1000).toNumber()
        );

        expect(await platform.isPhaseStillActive()).is.false;
        expect(await platform.currentPhase()).is.equal(2);

        const changePhase = await platform.changePhase();
        await changePhase.wait();

        expect(await platform.isPhaseStillActive()).is.true;
        expect(await platform.currentPhase()).is.equal(1);
    });

    it("Should close order", async () => {
        const salePrice = await platform.price();
        const balanceToBuy = salePrice.mul(10);

        const initialBuy = await platform.connect(trader1).buyOnSale({
            value: balanceToBuy,
        });
        await initialBuy.wait();

        await increaseTime((await platform.PHASE_DURATION()).toNumber() + 60);

        const approve = await acdm
            .connect(trader1)
            .approve(platform.address, 10);
        await approve.wait();

        const setOrder = await platform
            .connect(trader1)
            .createOrder(10, salePrice.mul(2));
        await setOrder.wait();

        const closeOrder = await platform.connect(trader1).closeOrder(0);
        await closeOrder.wait();

        expect(
            platform
                .connect(trader2)
                .buyFromOrder(0, 10, { value: balanceToBuy.mul(2) })
        ).is.revertedWith("Order already closed");
    });

    it("Should end SALE phase when all tokens sold", async () => {
        const initialBalanceForTrader1 = await trader1.getBalance();
        let traderGasUsage = BigNumber.from(0);
        const salePrice = await platform.price();
        const balanceToBuy = salePrice.mul(100_000);

        const initialBuy = await platform.connect(trader1).buyOnSale({
            value: balanceToBuy,
        });
        traderGasUsage = traderGasUsage.add(
            (await initialBuy.wait()).effectiveGasPrice
        );

        expect(await trader1.getBalance()).is.equal(
            initialBalanceForTrader1.sub(balanceToBuy).sub(traderGasUsage)
        );
        expect(await platform.currentPhase()).equal(1);
        expect(await acdm.balanceOf(trader1.address)).is.equal(100_000);
    });

    it("Should correctly starts next SALE phase", async () => {
        const salePrice = await platform.price();
        const balanceToBuy = salePrice.mul(100_000);
        const targetCap = ethers.constants.WeiPerEther.div(2);
        const expectedPrice = BigNumber.from(143).mul(
            BigNumber.from(10).pow(11)
        );
        const pricePerToken = targetCap.div(10);

        const initialBuy = await platform
            .connect(trader1)
            .buyOnSale({ value: balanceToBuy });
        await initialBuy.wait();

        const approve = await acdm
            .connect(trader1)
            .approve(platform.address, 10);
        await approve.wait();

        const setOrder = await platform
            .connect(trader1)
            .createOrder(10, pricePerToken);
        await setOrder.wait();

        const buyOrder = await platform
            .connect(trader2)
            .buyFromOrder(0, 10, { value: targetCap });
        await buyOrder.wait();

        await increaseTime((await platform.PHASE_DURATION()).toNumber() + 60);

        const phaseChanging = await platform.changePhase();
        await phaseChanging.wait();

        expect(await platform.currentPhase()).is.equal(2);
        expect(await platform.price()).is.equal(expectedPrice);
        expect(await platform.amountToSell()).is.equal(
            targetCap.div(expectedPrice)
        );
    });

    it("Should correctly starts next TRADE phase", async () => {
        const salePrice = await platform.price();
        const balanceToBuy = salePrice.mul(100_000);
        const targetCap = ethers.constants.WeiPerEther.div(2);
        const pricePerToken = targetCap.div(10);

        const initialBuy = await platform
            .connect(trader1)
            .buyOnSale({ value: balanceToBuy });
        await initialBuy.wait();

        const approve = await acdm
            .connect(trader1)
            .approve(platform.address, 10);
        await approve.wait();

        const setOrder = await platform
            .connect(trader1)
            .createOrder(10, pricePerToken);
        await setOrder.wait();

        const buyOrder = await platform
            .connect(trader2)
            .buyFromOrder(0, 10, { value: targetCap });
        await buyOrder.wait();

        await increaseTime((await platform.PHASE_DURATION()).toNumber() + 60);

        let phaseChanging = await platform.changePhase();
        await phaseChanging.wait();

        await increaseTime((await platform.PHASE_DURATION()).toNumber() + 60);

        phaseChanging = await platform.changePhase();
        await phaseChanging.wait();

        expect(await platform.currentPhase()).is.equal(1);
        expect(await platform.tradeCap()).is.equal(0);
    });
});
