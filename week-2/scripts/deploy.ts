import * as hre from "hardhat";
import { ethers } from "hardhat";
import { Token } from "../typechain";
import { FACTORY_ADDRESS } from "@uniswap/sdk";
import IUniswapV2Factory from "@uniswap/v2-core/build/IUniswapV2Factory.json";
import { ContractReceipt, ContractTransaction } from "ethers";

async function deployToken(name: string, symbol: string): Promise<Token> {
    const args: [number, string, string] = [100000000, name, symbol];

    const tokenFactory = await hre.ethers.getContractFactory("Token");
    return tokenFactory.deploy(...args);
}

async function main(): Promise<void> {
    const [deployer] = await hre.ethers.getSigners();

    const PairFactory = new ethers.Contract(
        FACTORY_ADDRESS,
        IUniswapV2Factory.abi,
        deployer
    ) as any;

    const tokenA = await deployToken("TokenA", "TOKa");
    const tokenB = await deployToken("TokenB", "TOKb");
    const reward = await deployToken("RewardToken", "RWD");

    await Promise.all([
        tokenA.deployed(),
        tokenB.deployed(),
        reward.deployed(),
    ]);

    console.log(`Token A deployed with address ${tokenA.address}`);
    console.log(`Token B deployed with address ${tokenB.address}`);

    const createPair: ContractTransaction = await PairFactory.createPair(
        tokenA.address,
        tokenB.address
    );
    const pairReceipt: ContractReceipt = await createPair.wait();

    const pairAddress: string = pairReceipt.events!![0].args!![2];
    console.log(`Pair deployed with address ${pairAddress}`);

    const StakingFactory = await ethers.getContractFactory("Staking");

    const stakingArgs: [string, string, number, number, string, number] = [
        pairAddress,
        reward.address,
        60,
        1,
        deployer.address,
        60 * 60 * 24,
    ];

    const staking = await StakingFactory.deploy(...stakingArgs);

    await staking.deployTransaction.wait(5);

    console.log(`Staking deployed to address ${staking.address}`);

    await hre.run("verify:verify", {
        address: staking.address,
        constructorArguments: stakingArgs,
    });
}

main().catch((error) => {
    console.error(error);
    throw error;
});
