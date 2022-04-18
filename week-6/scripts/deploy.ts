import * as hre from "hardhat";
import { ethers } from "hardhat";

async function main(): Promise<void> {
    const TokenFactory = await ethers.getContractFactory("Token");
    const DaoFactory = await ethers.getContractFactory("DAO");

    const token = await TokenFactory.deploy("Token", "TOK");
    await token.deployed();

    console.log(`Token contract deployed with address ${token.address}`);

    const daoArgs: [string, number, number] = [
        token.address,
        1000,
        60 * 60 * 24, // 1 day
    ];

    const dao = await DaoFactory.deploy(...daoArgs);

    if (hre.network.name !== "localhost") {
        await dao.deployTransaction.wait(5);

        try {
            await hre.run("verify:verify", {
                address: dao.address,
                constructorArguments: daoArgs,
            });
        } catch (e: any) {
            console.error(e);
        }
    } else {
        await dao.deployed();
    }

    console.log(`DAO contract deployed with address ${dao.address}`);
}

main().catch((error) => {
    console.error(error);
    throw error;
});
