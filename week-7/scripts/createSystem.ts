import { BigNumber, Contract } from "ethers";
import { ethers } from "hardhat";
import UniswapFactory from "@uniswap/v2-core/build/UniswapV2Factory.json";
import { Authority, XXXToken } from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { IUniswapV2Router02 } from "../typechain";

export async function createSystem() {
    const [owner] = await ethers.getSigners();

    const AuthorityFactory = await ethers.getContractFactory("Authority");
    const ACDMFactory = await ethers.getContractFactory("ACDM");
    const XXXFactory = await ethers.getContractFactory("XXXToken");
    const DAOFactory = await ethers.getContractFactory("DAO");
    const StakingFactory = await ethers.getContractFactory("Staking");
    const PlatformFactory = await ethers.getContractFactory("Platform");

    const authority = await AuthorityFactory.deploy();
    await authority.deployed();

    const ACDMToken = await ACDMFactory.deploy(authority.address);
    await ACDMToken.deployed();

    const XToken = await XXXFactory.deploy(authority.address);
    await XToken.deployed();

    const pairAddress = await addLiquidity(authority, owner, XToken);

    const setACDM = await authority.setACDM(ACDMToken.address);
    const setACDMx = await authority.setACDMx(XToken.address);

    await Promise.all([setACDM.wait(), setACDMx.wait()]);

    const minimumQuorum = 100;
    const debatingPeriod = 60 * 60 * 24 * 3;
    const dao = await DAOFactory.deploy(
        minimumQuorum,
        debatingPeriod,
        authority.address
    );
    await dao.deployed();

    const tick = 60 * 60 * 24 * 7;
    const rewardPercent = 30;
    const staking = await StakingFactory.deploy(
        pairAddress,
        XToken.address,
        tick,
        rewardPercent,
        authority.address
    );
    await staking.deployed();

    const platform = await PlatformFactory.deploy(authority.address);
    await platform.deployed();

    const setDAO = await authority.setDao(dao.address);
    const setStaking = await authority.setStaking(staking.address);
    const setPlatform = await authority.setPlatform(platform.address);

    await Promise.all([setDAO.wait(), setStaking.wait(), setPlatform.wait()]);

    return {
        authority: {
            contract: authority,
            args: [],
        },
        ACDMToken: {
            contract: ACDMToken,
            args: [authority.address],
        },
        XToken: {
            contract: XToken,
            args: [authority.address],
        },
        staking: {
            contract: staking,
            tick,
            rewardPercent,
            pair: await ethers.getContractAt("ERC20", pairAddress),
            args: [
                pairAddress,
                XToken.address,
                tick,
                rewardPercent,
                authority.address,
            ],
        },
        dao: {
            contract: dao,
            minimumQuorum,
            debatingPeriod,
            args: [minimumQuorum, debatingPeriod, authority.address],
        },
        platform: {
            contract: platform,
            args: [authority.address],
        },
    };
}

export async function addLiquidity(
    authority: Authority,
    owner: SignerWithAddress,
    XToken: XXXToken
) {
    const xTokenAmountToPair = BigNumber.from(10).pow(18);
    const ethAmountToPair = xTokenAmountToPair.div(1e5);

    const routerAddress = await authority.router();
    const router = await ethers.getContractAt(
        "IUniswapV2Router02",
        routerAddress
    );
    const approveForLiquidity = await XToken.approve(
        routerAddress,
        xTokenAmountToPair
    );
    await approveForLiquidity.wait();

    const addLiquidityTx = await router.addLiquidityETH(
        XToken.address,
        xTokenAmountToPair,
        xTokenAmountToPair,
        ethAmountToPair,
        owner.address,
        (
            await ethers.provider.getBlock(
                await ethers.provider.getBlockNumber()
            )
        ).timestamp + 1000,
        {
            value: ethAmountToPair,
        }
    );
    await addLiquidityTx.wait();

    const factory = new Contract(
        await router.factory(),
        UniswapFactory.interface,
        owner
    );

    return await factory.getPair(XToken.address, await router.WETH());
}
