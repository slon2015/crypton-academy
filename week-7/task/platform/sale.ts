import { task } from "hardhat/config";
import { Platform } from "../types";
import { selectSigner } from "../utils";

task("buyOnSale", "Buy tokens from sale")
    .addParam("contract", "Contract address")
    .addOptionalParam("sender", "Sender pk")
    .addParam("amount", "Amount of tokens to buy")
    .setAction(async (args, hre) => {
        const sender = await selectSigner(args, hre);

        const platform = (await hre.ethers.getContractAt(
            "Platform",
            args.contract
        )) as unknown as Platform;

        const price = await platform.price();

        const tx = await platform.connect(sender).buyOnSale({
            value: price.mul(args.amount),
        });

        await tx.wait();
    });
