import * as hre from "hardhat";
import { ethers } from "hardhat";

async function main(): Promise<void> {
    const NFT = await ethers.getContractFactory("NFTErc721");

    const nft = await NFT.deploy();

    await nft.deployTransaction.wait(5);

    console.log(`NFT contract deployed with address ${nft.address}`);

    await hre.run("verify:verify", {
        address: nft.address,
    });

    const Marketplace = await ethers.getContractFactory("Marketplace");

    const marketplace = await Marketplace.deploy();

    await marketplace.deployTransaction.wait(5);

    console.log(
        `Marketplace contract deployed with address ${marketplace.address}`
    );

    await hre.run("verify:verify", {
        address: marketplace.address,
    });

    const transferOwnership = await nft.transferOwnership(marketplace.address);
    const setNft = await marketplace.setNft(nft.address);

    await Promise.all([transferOwnership.wait(), setNft.wait()]);
}

main().catch((error) => {
    console.error(error);
    throw error;
});
