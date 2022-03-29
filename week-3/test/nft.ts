/* eslint-disable no-unused-vars */
/* eslint-disable no-unused-expressions */
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
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

        const tx = await multitoken.create({
            metadataUri: uri,
        });

        mine(tx);

        expect(await multitoken.uri(0)).to.be.equal(uri);
    });
});
