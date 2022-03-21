import { ADDRESS_ZERO } from "@uniswap/v3-sdk";
import * as hre from "hardhat";
import { ethers } from "hardhat";
import { Token } from "../typechain";

async function deployToken(name: string, symbol: string): Promise<Token> {
    const [deployer] = await hre.ethers.getSigners();
    const args: [number, string, string] = [100000000, name, symbol];

    console.log("Deploying contracts with the account:", deployer.address);

    const tokenFactory = await hre.ethers.getContractFactory("Token");
    return tokenFactory.deploy(...args);
}

async function main(): Promise<void> {
    const [deployer] = await hre.ethers.getSigners();

    const tokenA = await deployToken("TokenA", "TOKa");
    const tokenB = await deployToken("TokenB", "TOKb");
    const reward = await deployToken("RewardToken", "RWD");

    await Promise.all([tokenA.deployed(), tokenB.deployed()]);

    console.log(`Tokea A deployed with address ${tokenA.address}`);
    console.log(`Tokea B deployed with address ${tokenB.address}`);

    const StakingFactory = await ethers.getContractFactory("Staking");

    const stakingArgs: [string, string, number, number, string, number] = [
        tokenA.address,
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
