import { ethers } from "hardhat";

async function main() {
    console.log(await ethers.provider.getBlockNumber());
}

main();
