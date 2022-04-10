import * as hre from "hardhat";
import { ethers } from "hardhat";

async function main(): Promise<void> {
    const [deployer] = await ethers.getSigners();
    const TokenFactory = await ethers.getContractFactory("Token");

    const tokenArgs: [string, string] = ["Token", "TOK"];
    const token = await TokenFactory.deploy(...tokenArgs);

    await token.deployTransaction.wait(5);

    console.log(`Token contract deployed with address ${token.address}`);

    try {
        await hre.run("verify:verify", {
            address: token.address,
            constructorArguments: tokenArgs,
        });
    } catch (e: any) {
        console.error(e);
    }

    const BridgeFactory = await ethers.getContractFactory("Bridge");

    const bridgeArgs: [string, string] = [token.address, deployer.address];
    const bridge = await BridgeFactory.deploy(...bridgeArgs);

    await bridge.deployTransaction.wait(5);

    console.log(`Bridge contract deployed with address ${bridge.address}`);

    try {
        await hre.run("verify:verify", {
            address: bridge.address,
            constructorArguments: bridgeArgs,
        });
    } catch (e: any) {
        console.error(e);
    }

    const addFunds = await token.transfer(
        bridge.address,
        (await token.balanceOf(deployer.address)).div(2)
    );

    await addFunds.wait();
}

main().catch((error) => {
    console.error(error);
    throw error;
});
