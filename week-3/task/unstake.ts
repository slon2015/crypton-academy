import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import { selectSigner } from "./utils";
import { Staking } from "../typechain";

task("unstake", "Unstake full amount of token from protocol")
    .addParam("contract", "Contract address")
    .addParam("sender", "Sender pk", "")
    .setAction(async (args, hre) => {
        const sender = await selectSigner(args, hre);

        const staking = (await hre.ethers.getContractAt(
            "Staking",
            args.contract
        )) as Staking;

        const tx = await staking.connect(sender).unstake();
        await tx.wait();

        console.log("Succesfully unstaked");
    });
