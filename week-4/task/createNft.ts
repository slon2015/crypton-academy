import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import { selectSigner } from "./utils";
import { Signer } from "ethers";

interface NFT {
    connect(sender: Signer): {
        create(uri: string): Promise<any>;
    };
}

task("createNft", "Create new nft (erc721) from metadata")
    .addParam("contract", "Contract address")
    .addParam("sender", "Sender pk", "")
    .addParam("uri", "Metadata uri")
    .setAction(async (args, hre) => {
        const sender = await selectSigner(args, hre);

        const nft = (await hre.ethers.getContractAt(
            "NFTErc721",
            args.contract
        )) as unknown as NFT;

        const tx = await nft.connect(sender).create(args.uri);
        await tx.wait();

        console.log("Succesfully created");
    });
