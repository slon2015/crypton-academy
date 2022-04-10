import { ethers } from "hardhat";

export async function increaseTime(time: number): Promise<void> {
    await ethers.provider.send("evm_increaseTime", [time]);

    await ethers.provider.send("evm_mine", []);
}
