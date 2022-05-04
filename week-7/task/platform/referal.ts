import { ethers } from "ethers";
import { task } from "hardhat/config";
import { Platform } from "../types";
import { selectSigner } from "../utils";

task("register", "Referal programm registration")
    .addParam("contract", "Contract address")
    .addOptionalParam("sender", "Sender pk")
    .addOptionalParam("referer", "Referal user address")
    .setAction(async (args, hre) => {
        const sender = await selectSigner(args, hre);

        const platform = (await hre.ethers.getContractAt(
            "Platform",
            args.contract
        )) as unknown as Platform;

        const referer = args.referer || ethers.constants.AddressZero;

        const tx = await platform.connect(sender).register(referer);

        await tx.wait();
    });
