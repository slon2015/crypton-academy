/* eslint-disable no-unused-vars */
/* eslint-disable no-unused-expressions */
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { NFTErc721 } from "../typechain";
import { NFT } from "../typechain";
import { mine } from "./utils";

describe("NFT-Multitoken", function () {
    let multitoken: NFT;

    this.beforeEach(async () => {
        const factory = await ethers.getContractFactory("NFT");

        multitoken = await factory.deploy();

        mine(multitoken.deployTransaction);
    });

    it("Should create new token with specified uri", async () => {
        const uri = "http://metadatas/123";

        const tx = await multitoken.create(uri, 1);

        mine(tx);

        expect(await multitoken.uri(1)).to.be.equal(uri);
    });
});

describe("NFT-ERC721", function () {
    let erc721: NFTErc721;

    this.beforeEach(async () => {
        const factory = await ethers.getContractFactory("NFTErc721");

        erc721 = await factory.deploy();

        mine(erc721.deployTransaction);
    });

    it("Should create new token with specified uri", async () => {
        const uri = "http://metadatas/123";

        const tx = await erc721.create(uri);

        mine(tx);

        expect(await erc721.tokenURI(1)).to.be.equal(uri);
    });
});
