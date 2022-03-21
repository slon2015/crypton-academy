import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import { selectSigner } from "./utils";

interface ViewArg {
    name: string;
    description: string;
    defaultValue?: unknown;
}

interface View {
    name: string;
    args?: ViewArg[];
}

const views: View[] = [
    {
        name: "name",
    },
    {
        name: "symbol",
    },
    {
        name: "decimals",
    },
    {
        name: "totalSupply",
    },
    {
        name: "balanceOf",
        args: [
            {
                name: "account",
                description: "Specified account address",
            },
        ],
    },
    {
        name: "allowance",
        args: [
            {
                name: "owner",
                description: "Specified owner address",
            },
            {
                name: "spender",
                description: "Specified spender address",
            },
        ],
    },
];

function createViewTask(view: View) {
    const viewTask = task(view.name, "View for " + view.name)
        .addParam("contract", "Contract address")
        .addParam("sender", "Sender pk", "");

    if (view.args) {
        for (const arg of view.args) {
            viewTask.addParam(arg.name, arg.description, arg.defaultValue);
        }
    }

    viewTask.setAction(async (args, hre) => {
        const sender = await selectSigner(args, hre);

        const token = await hre.ethers.getContractAt("Token", args.contract);

        const argsToSend: any[] = [];
        if (view.args) {
            for (const arg of view.args) {
                argsToSend.push(args[arg.name]);
            }
        }

        const viewFunction = (token.connect(sender) as any)[view.name];

        const result = await viewFunction(...argsToSend);

        console.log("Result of view: " + result);
    });
}

views.forEach((v) => createViewTask(v));

task("transfer", "Transfer token to address")
    .addParam("contract", "Contract address")
    .addParam("sender", "Sender pk", "")
    .addParam("recepient", "Address for transfer")
    .addParam("amount", "Amount for transfer")
    .setAction(async (args, hre) => {
        const sender = await selectSigner(args, hre);

        const token = await hre.ethers.getContractAt("Token", args.contract);

        const tx = await token
            .connect(sender)
            .transfer(args.recepient, args.amount);

        await tx.wait();

        console.log("Transfer complete");
    });

task("approve", "Approve token to address")
    .addParam("contract", "Contract address")
    .addParam("sender", "Sender pk", "")
    .addParam("recepient", "Address for transfer")
    .addParam("amount", "Amount for transfer")
    .setAction(async (args, hre) => {
        const sender = await selectSigner(args, hre);

        const token = await hre.ethers.getContractAt("Token", args.contract);

        const tx = await token
            .connect(sender)
            .approve(args.recepient, args.amount);

        await tx.wait();

        console.log("Approve complete");
    });

task("transferFrom", "Transfer token to address")
    .addParam("contract", "Contract address")
    .addParam("sender", "Sender pk", "")
    .addParam("owner", "Address of owner")
    .addParam("recepient", "Address for transfer")
    .addParam("amount", "Amount for transfer")
    .setAction(async (args, hre) => {
        const sender = await selectSigner(args, hre);

        const token = await hre.ethers.getContractAt("Token", args.contract);

        const tx = await token
            .connect(sender)
            .transferFrom(args.owner, args.recepient, args.amount);

        await tx.wait();

        console.log("TransferFrom complete");
    });

task("mint", "Transfer token to address")
    .addParam("contract", "Contract address")
    .addParam("sender", "Sender pk", "")
    .addParam("recepient", "Address for mint")
    .addParam("amount", "Amount for mint")
    .setAction(async (args, hre) => {
        const sender = await selectSigner(args, hre);

        const token = await hre.ethers.getContractAt("Token", args.contract);

        const tx = await token
            .connect(sender)
            .mint(args.recepient, args.amount);

        await tx.wait();

        console.log("Mint complete");
    });

task("burn", "Transfer token to address")
    .addParam("contract", "Contract address")
    .addParam("sender", "Sender pk", "")
    .addParam("target", "Address for burn")
    .addParam("amount", "Amount for burn")
    .setAction(async (args, hre) => {
        const sender = await selectSigner(args, hre);

        const token = await hre.ethers.getContractAt("Token", args.contract);

        const tx = await token.connect(sender).burn(args.target, args.amount);

        await tx.wait();

        console.log("Burn complete");
    });
