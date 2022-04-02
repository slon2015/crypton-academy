import { ContractTransaction } from "ethers";
import { ethers } from "hardhat";

export async function mine(...txs: ContractTransaction[]) {
    const result: Promise<void> = await ethers.provider.send("evm_mine", []);
    await Promise.all([result, txs.map((tx) => tx.wait())]);
}

export async function increaseTime(time: number): Promise<void> {
    await ethers.provider.send("evm_increaseTime", [time]);

    await ethers.provider.send("evm_mine", []);
}
