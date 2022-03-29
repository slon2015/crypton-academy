import * as hre from "hardhat";
import { ethers } from "hardhat";

async function main(): Promise<void> {
    const NFT = await ethers.getContractFactory("NFTErc721");

    const contract = await NFT.deploy();

    await contract.deployTransaction.wait(5);

    console.log(`Contract deployed with address ${contract.address}`);

    await hre.run("verify:verify", {
        address: contract.address,
    });
}

main().catch((error) => {
    console.error(error);
    throw error;
});
