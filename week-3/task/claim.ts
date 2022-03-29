import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import { selectSigner } from "./utils";
import { Staking, Token } from "../typechain";

task("claim", "Claim reward from protocol")
    .addParam("contract", "Contract address")
    .addParam("sender", "Sender pk", "")
    .setAction(async (args, hre) => {
        const sender = await selectSigner(args, hre);

        const staking = (await hre.ethers.getContractAt(
            "Staking",
            args.contract
        )) as Staking;

        const tx = await staking.connect(sender).claim();
        await tx.wait();

        console.log("Succesfully staked");
    });
