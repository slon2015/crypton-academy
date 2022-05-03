import { ethers } from "hardhat";
import { addLiquidity } from "./createSystem";

async function main() {
    const [owner] = await ethers.getSigners();
    await addLiquidity(
        await ethers.getContractAt(
            "Authority",
            "0x27fB89271f76f48f960324078A1a8E756C14636d"
        ),
        owner,
        await ethers.getContractAt(
            "XXXToken",
            "0xe67C548997d423CA4Aed3Af9941b6D8d5B4E6E65"
        )
    );
}

main().catch((e) => console.error(e));
