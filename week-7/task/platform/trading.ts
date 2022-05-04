import { task } from "hardhat/config";
import { Platform } from "../types";
import { selectSigner } from "../utils";

task("createOrder", "Create order")
    .addParam("contract", "Contract address")
    .addOptionalParam("sender", "Sender pk")
    .addParam("amount", "Amount of tokens to sell")
    .addParam("price", "Price per token in Wei")
    .setAction(async (args, hre) => {
        const sender = await selectSigner(args, hre);

        const platform = (await hre.ethers.getContractAt(
            "Platform",
            args.contract
        )) as unknown as Platform;

        platform.once(platform.filters.OrderCreated(), (e) => {
            const id = e.args[0];
            console.log(`Order created with id: ${id}`);
        });

        const tx = await platform
            .connect(sender)
            .createOrder(args.amount, args.price);

        await tx.wait();
    });

task("closeOrder", "Close order")
    .addParam("contract", "Contract address")
    .addOptionalParam("sender", "Sender pk")
    .addParam("id", "Id of order to close")
    .setAction(async (args, hre) => {
        const sender = await selectSigner(args, hre);

        const platform = (await hre.ethers.getContractAt(
            "Platform",
            args.contract
        )) as unknown as Platform;

        const tx = await platform.connect(sender).closeOrder(args.id);

        await tx.wait();
    });

task("buyOrder", "Buy tokens from order")
    .addParam("contract", "Contract address")
    .addOptionalParam("sender", "Sender pk")
    .addParam("id", "Id of order to close")
    .addParam("amount", "Amount of tokens to buy")
    .addParam("price", "Amount of wei to send with transaction")
    .setAction(async (args, hre) => {
        const sender = await selectSigner(args, hre);

        const platform = (await hre.ethers.getContractAt(
            "Platform",
            args.contract
        )) as unknown as Platform;

        const tx = await platform
            .connect(sender)
            .buyFromOrder(args.id, args.amount, {
                value: args.price,
            });

        await tx.wait();
    });
