import { ethers } from "hardhat";

async function main(): Promise<void> {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);

    const Token = await ethers.getContractFactory("Token");
    const token = await Token.deploy(
        "CryptoRuble",
        "cRUB",
        2,
        deployer.address,
        100000000
    );

    await token.deployed();

    console.log("Token address:", token.address);
}

main().catch((error) => {
    console.error(error);
    throw error;
});
