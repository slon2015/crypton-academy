import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, ContractTransaction, Transaction } from "ethers";
import { ethers } from "hardhat";
import {
    ACDM,
    Authority,
    DAO,
    Platform,
    Staking,
    XXXToken,
} from "../typechain";
import { increaseTime } from "./utils";
import UniswapV2Factory from "@uniswap/v2-core/build/UniswapV2Factory.json";
import UniswapRouter from "@uniswap/v2-periphery/build/UniswapV2Router02.json";
import WETH from "@uniswap/v2-periphery/build/WETH9.json";
import { Artifact } from "hardhat/types";

describe("Platform", async function () {
    let owner: SignerWithAddress,
        seller: SignerWithAddress,
        trader1: SignerWithAddress,
        trader2: SignerWithAddress;
    let platform: Platform,
        acdm: ACDM,
        xtoken: XXXToken,
        authority: Authority,
        staking: Staking,
        dao: DAO;

    async function addVotePower(user: SignerWithAddress, amount: number) {
        if (user !== owner) {
            const sendTx = await xtoken
                .connect(owner)
                .transfer(user.address, amount);
            await sendTx.wait();
        }

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

    this.beforeEach(async () => {
        [owner, seller, trader1, trader2] = await ethers.getSigners();

        const authorityFactory = await ethers.getContractFactory("Authority");
        const acdmFactory = await ethers.getContractFactory("ACDM");
        const xTokenFactory = await ethers.getContractFactory("XXXToken");
        const platformFactory = await ethers.getContractFactory("Platform");
        const daoFactory = await ethers.getContractFactory("DAO");
        const stakingFactory = await ethers.getContractFactory("Staking");
        const uniswapFactoryFactory = ethers.ContractFactory.fromSolidity(
            UniswapV2Factory,
            owner
        );

        const wethFactory = ethers.ContractFactory.fromSolidity(WETH, owner);
        const routerFactory = ethers.ContractFactory.fromSolidity(
            UniswapRouter,
            owner
        );

        const uniswapFactory = await uniswapFactoryFactory.deploy(
            owner.address
        );
        await uniswapFactory.deployed();

        const weth = await wethFactory.deploy();
        await weth.deployed();

        const router = await routerFactory.deploy(
            uniswapFactory.address,
            weth.address
        );
        await router.deployed();

        authority = await authorityFactory.deploy();
        await authority.deployed();

        const setRouter = await authority.setRouter(router.address);
        await setRouter.wait();

        acdm = await acdmFactory.deploy(authority.address);
        await acdm.deployed();
        const setAcdm = await authority.setACDM(acdm.address);
        await setAcdm.wait();

        xtoken = await xTokenFactory.deploy(authority.address);
        await xtoken.deployed();
        const setXToken = await authority.setACDMx(xtoken.address);
        await setXToken.wait();

        platform = await platformFactory.deploy(authority.address);
        await platform.deployed();
        const setPlatform = await authority.setPlatform(platform.address);
        await setPlatform.wait();

        dao = await daoFactory.deploy(250, 1000, authority.address);
        await platform.deployed();
        const setDao = await authority.setDao(dao.address);
        await setDao.wait();

        staking = await stakingFactory.deploy(
            xtoken.address,
            xtoken.address,
            60 * 60 * 24 * 7,
            3,
            60 * 60 * 24 * 7,
            authority.address
        );
        await staking.deployed();

        const setStaking = await authority.setStaking(staking.address);
        await setStaking.wait();

        const xTokenAmountToPair = BigNumber.from(10000);
        const ethAmountToPair = xTokenAmountToPair.mul(1e6);

        const approveForLiquidity = await xtoken.approve(
            router.address,
            xTokenAmountToPair
        );
        await approveForLiquidity.wait();

        const addLiquidityTx = (await (router as any).addLiquidityETH(
            xtoken.address,
            xTokenAmountToPair,
            xTokenAmountToPair,
            ethAmountToPair,
            owner.address,
            (
                await ethers.provider.getBlock(ethers.provider._lastBlockNumber)
            ).timestamp + 1000
        )) as ContractTransaction;
        await addLiquidityTx.wait();

        const startTx = await platform.startPlatform();
        await startTx.wait();
    });

    async function increaseExtractedComission(
        salePrice: BigNumber,
        balanceToBuy: BigNumber
    ) {
        const approve = await acdm
            .connect(trader1)
            .approve(platform.address, 10);
        await approve.wait();

        const setOrder = await platform
            .connect(trader1)
            .createOrder(10, salePrice.mul(2));
        await setOrder.wait();

        const buyOrder = await platform
            .connect(trader2)
            .buyFromOrder(0, 10, { value: balanceToBuy.mul(2) });
        await buyOrder.wait();
    }

    it("Should collect commission on TRADE phase", async () => {
        const salePrice = await platform.price();
        const balanceToBuy = salePrice.mul(10);

        const initialBuy = await platform.connect(trader1).buyOnSale({
            value: balanceToBuy,
        });
        await initialBuy.wait();

        await increaseTime((await platform.PHASE_DURATION()).toNumber() + 60);

        await increaseExtractedComission(salePrice, balanceToBuy);

        expect(await platform.extractedComission()).is.equal(
            balanceToBuy.mul(2).div(100).mul(5)
        );
    });

    it.only("Should buy and burn xTokens", async () => {
        const salePrice = await platform.price();
        const balanceToBuy = salePrice.mul(10);
        const initialSupply = await xtoken.totalSupply();

        await addVotePower(trader1, 150);
        await addVotePower(trader2, 150);

        const initialBuy = await platform.connect(trader1).buyOnSale({
            value: balanceToBuy,
        });
        await initialBuy.wait();

        await increaseTime((await platform.PHASE_DURATION()).toNumber() + 60);

        await increaseExtractedComission(salePrice, balanceToBuy);

        const calldata = platform.interface.encodeFunctionData("buyXToken");
        const propose = await dao.createProposal(
            platform.address,
            calldata,
            "Buy & burn some tokens"
        );
        await propose.wait();
        await voteFor(trader1, 150, 0);
        await voteFor(trader2, 150, 0);
        const finishProposal = await dao.finishProposal(0);
        await finishProposal.wait();

        expect(await platform.extractedComission()).is.equal(0);
        expect(await xtoken.totalSupply()).is.equal(
            initialSupply.sub(balanceToBuy.div(100).mul(95))
        );
    });
});
