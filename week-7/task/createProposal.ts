import { ContractTransaction, Event, Signer } from "ethers";
import { task } from "hardhat/config";
import { selectSigner } from "./utils";

interface DAO {
    connect(sender: Signer): {
        createProposal(
            recepient: string,
            calldata: string,
            description: string
        ): Promise<ContractTransaction>;
    };
}

task("createProposal", "Create proposal with specified recipient and calldata")
    .addParam("contract", "Contract address")
    .addOptionalParam("sender", "Sender pk")
    .addParam("recepient", "Proposal call recepient")
    .addParam("calldata", "Proposal calldata")
    .addParam("description", "Proposal explanation")
    .setAction(async (args, hre) => {
        const sender = await selectSigner(args, hre);

        const DAO = (await hre.ethers.getContractAt(
            "DAO",
            args.contract
        )) as unknown as DAO;

        const tx = await DAO.connect(sender).createProposal(
            args.recepient,
            args.calldata,
            args.description
        );

        const receipt = await tx.wait();
        const event = receipt.events!![0] as Event;

        console.log(
            `Created proposal with` +
                `\n\tID : ${event.args!![0]}` +
                `\n\tRecepient : ${event.args!![1]}` +
                `\n\tCalldata : ${event.args!![2]}` +
                `\n\tDescription : ${event.args!![3]}`
        );
    });
