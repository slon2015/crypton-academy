import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import { selectSigner } from "./utils";
import { Staking, Token } from "./types";

task("stake", "Stake specified amount of token to protocol")
    .addParam("contract", "Contract address")
    .addParam("sender", "Sender pk", "")
    .addParam("amount", "Amount of token to stake")
    .setAction(async (args, hre) => {
        const sender = await selectSigner(args, hre);

        const staking = (await hre.ethers.getContractAt(
            "Staking",
            args.contract
        )) as unknown as Staking;

        const terms = await staking.terms();

        const targetToken = (await hre.ethers.getContractAt(
            "ERC20",
            terms.tokenToSatking
        )) as unknown as Token;

        let tx = await targetToken
            .connect(sender)
            .approve(staking.address, args.amount);
        await tx.wait();

        tx = await staking.connect(sender).stake(args.amount);
        await tx.wait();

        console.log("Succesfully staked");
    });

task("unstake", "Unstake full amount of token from protocol")
    .addParam("contract", "Contract address")
    .addParam("sender", "Sender pk", "")
    .setAction(async (args, hre) => {
        const sender = await selectSigner(args, hre);

        const staking = (await hre.ethers.getContractAt(
            "Staking",
            args.contract
        )) as unknown as Staking;

        const tx = await staking.connect(sender).unstake();
        await tx.wait();

        console.log("Succesfully unstaked");
    });

task("claim", "Claim reward from protocol")
    .addParam("contract", "Contract address")
    .addParam("sender", "Sender pk", "")
    .setAction(async (args, hre) => {
        const sender = await selectSigner(args, hre);

        const staking = (await hre.ethers.getContractAt(
            "Staking",
            args.contract
        )) as unknown as Staking;

        const tx = await staking.connect(sender).claim();
        await tx.wait();

        console.log("Succesfully staked");
    });
