import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import { selectSigner } from "./utils";
import { Staking, Token } from "../typechain";

task("stake", "Stake specified amount of token to protocol")
    .addParam("contract", "Contract address")
    .addParam("sender", "Sender pk", "")
    .addParam("amount", "Amount of token to stake")
    .setAction(async (args, hre) => {
        const sender = await selectSigner(args, hre);

        const staking = (await hre.ethers.getContractAt(
            "Staking",
            args.contract
        )) as Staking;

        const terms = await staking.getTerms();

        const targetToken = (await hre.ethers.getContractAt(
            "Token",
            terms.tokenToSatking
        )) as Token;

        let tx = await targetToken
            .connect(sender)
            .approve(staking.address, args.amount);
        await tx.wait();

        tx = await staking.connect(sender).stake(args.amount);
        await tx.wait();

        console.log("Succesfully staked");
    });
