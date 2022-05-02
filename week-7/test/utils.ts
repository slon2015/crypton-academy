import { ethers } from "hardhat";
import { ERC20 } from "../typechain";

export async function increaseTime(time: number): Promise<void> {
    await ethers.provider.send("evm_increaseTime", [time]);

    await ethers.provider.send("evm_mine", []);
}

export async function getToken(name: string, symbol: string): Promise<ERC20> {
    const TokenFactory = await ethers.getContractFactory("ERC20");
    return TokenFactory.deploy(name, symbol);
}
