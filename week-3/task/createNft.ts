import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import { selectSigner } from "./utils";
import { NFT } from "../typechain";
import { NFTErc721 } from "../typechain";

task("createNft", "Create new nft from metadata")
    .addParam("contract", "Contract address")
    .addParam("sender", "Sender pk", "")
    .addParam("uri", "Metadata uri")
    .setAction(async (args, hre) => {
        const sender = await selectSigner(args, hre);

        const nft = (await hre.ethers.getContractAt(
            "NFT",
            args.contract
        )) as NFT;

        const tx = await nft.connect(sender).create(args.uri);
        await tx.wait();

        console.log("Succesfully created");
    });

task("createNftErc721", "Create new nft (erc721) from metadata")
    .addParam("contract", "Contract address")
    .addParam("sender", "Sender pk", "")
    .addParam("uri", "Metadata uri")
    .setAction(async (args, hre) => {
        const sender = await selectSigner(args, hre);

        const nft = (await hre.ethers.getContractAt(
            "NFTErc721",
            args.contract
        )) as NFTErc721;

        const tx = await nft.connect(sender).create(args.uri);
        await tx.wait();

        console.log("Succesfully created");
    });
