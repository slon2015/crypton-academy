import { ContractTransaction } from "ethers";
import { ethers } from "hardhat";
import { Token } from "../typechain";

export async function getToken(name: string, symbol: string): Promise<Token> {
    const TokenFactory = await ethers.getContractFactory("Token");
    return TokenFactory.deploy(
        ethers.BigNumber.from("1000000000000000000000000"),
        name,
        symbol
    );
}

export async function mine(...txs: ContractTransaction[]) {
    const result: Promise<void> = await ethers.provider.send("evm_mine", []);
    await Promise.all([result, txs.map((tx) => tx.wait())]);
}

export async function increaseTime(time: number): Promise<void> {
    await ethers.provider.send("evm_increaseTime", [time]);

    await ethers.provider.send("evm_mine", []);
}
