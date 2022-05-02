import { ContractTransaction, Event, Signer } from "ethers";
import { task } from "hardhat/config";
import { selectSigner } from "./utils";

interface DAO {
    connect(sender: Signer): {
        vote(
            id: number,
            amount: number,
            voteType: number
        ): Promise<ContractTransaction>;
    };
}

task("vote", "Vote for proposal")
    .addParam("contract", "Contract address")
    .addOptionalParam("sender", "Sender pk")
    .addParam("id", "Proposal id")
    .addParam("amount", "Proposal vote weight")
    .addParam("voteType", "Proposal vote type")
    .setAction(async (args, hre) => {
        const sender = await selectSigner(args, hre);

        const DAO = (await hre.ethers.getContractAt(
            "DAO",
            args.contract
        )) as unknown as DAO;

        const tx = await DAO.connect(sender).vote(
            args.id,
            args.amount,
            args.voteType
        );

        await tx.wait();
    });