/* eslint-disable no-unused-vars */
/* eslint-disable no-unused-expressions */
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { solidityKeccak256, arrayify } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { Bridge } from "../typechain/Bridge";
import { Token } from "../typechain/Token";

describe("Bridge OneNetwork-mock", function () {
    let gateA: Bridge,
        gateB: Bridge,
        tokenA: Token,
        tokenB: Token,
        sender: SignerWithAddress,
        recepient: SignerWithAddress,
        thirdParty: SignerWithAddress;
    let nonce: number;
    const amountToTransfer = 100;

    this.beforeEach(async () => {
        nonce = 1;
        [sender, recepient, thirdParty] = await ethers.getSigners();
        const TokenFactory = await ethers.getContractFactory("Token");
        const BridgeFactory = await ethers.getContractFactory("Bridge");

        tokenA = await TokenFactory.deploy("ChainAToken", "ATOK");
        tokenB = await TokenFactory.deploy("ChainBToken", "TOKB");

        await Promise.all([tokenA.deployed(), tokenB.deployed()]);

        const mintTx = await tokenA.mint(amountToTransfer, sender.address);
        await mintTx.wait();

        gateA = await BridgeFactory.deploy(tokenA.address);
        gateB = await BridgeFactory.deploy(tokenB.address);

        await Promise.all([gateA.deployed(), gateB.deployed()]);

        const transferOwnerATx = await tokenA.transferOwnership(gateA.address);
        const transferOwnerBTx = await tokenB.transferOwnership(gateB.address);
        await Promise.all([transferOwnerATx.wait(), transferOwnerBTx.wait()]);
    });

    it("Should transfer tokens", async () => {
        const message = arrayify(
            solidityKeccak256(
                ["address", "address", "uint", "uint"],
                [sender.address, recepient.address, amountToTransfer, nonce]
            )
        );

        const signature = await sender.signMessage(message);

        const transferTx = await gateA
            .connect(sender)
            .swap(recepient.address, amountToTransfer, nonce, signature);

        await transferTx.wait();

        const receiveTx = await gateB.redeem(
            sender.address,
            recepient.address,
            amountToTransfer,
            nonce,
            signature
        );

        await receiveTx.wait();

        expect(await tokenA.totalSupply()).to.equal(0);
        expect(await tokenA.balanceOf(sender.address)).to.equal(0);

        expect(await tokenB.totalSupply()).to.equal(amountToTransfer);
        expect(await tokenB.balanceOf(recepient.address)).to.equal(
            amountToTransfer
        );
    });

    it("should not accept signature from invalid user", async () => {
        const message = arrayify(
            solidityKeccak256(
                ["address", "address", "uint", "uint"],
                [sender.address, recepient.address, amountToTransfer, nonce]
            )
        );

        const signature = await thirdParty.signMessage(message);

        const transferTx = await gateA
            .connect(sender)
            .swap(recepient.address, amountToTransfer, nonce, signature);

        await transferTx.wait();

        const receiveTx = gateB.redeem(
            sender.address,
            recepient.address,
            amountToTransfer,
            nonce,
            signature
        );

        expect(receiveTx).to.be.revertedWith("Wrong signature");
    });

    it("Should not init more than one transfer for same nonce", async () => {
        const message = arrayify(
            solidityKeccak256(
                ["address", "address", "uint", "uint"],
                [sender.address, recepient.address, amountToTransfer, nonce]
            )
        );

        const signature = await sender.signMessage(message);

        const transferTx = await gateA
            .connect(sender)
            .swap(recepient.address, amountToTransfer, nonce, signature);

        await transferTx.wait();

        const secondTransfer = gateA
            .connect(sender)
            .swap(recepient.address, amountToTransfer, nonce, signature);

        expect(secondTransfer).to.be.revertedWith("Transfer already processed");
    });

    it("Should not accept single signature more than once", async () => {
        const message = arrayify(
            solidityKeccak256(
                ["address", "address", "uint", "uint"],
                [sender.address, recepient.address, amountToTransfer, nonce]
            )
        );

        const signature = await sender.signMessage(message);

        const transferTx = await gateA
            .connect(sender)
            .swap(recepient.address, amountToTransfer, nonce, signature);

        await transferTx.wait();

        const receiveTx = await gateB.redeem(
            sender.address,
            recepient.address,
            amountToTransfer,
            nonce,
            signature
        );

        await receiveTx.wait();

        const secondReceiveTx = gateB.redeem(
            sender.address,
            recepient.address,
            amountToTransfer,
            nonce,
            signature
        );

        expect(secondReceiveTx).to.be.revertedWith(
            "Transfer already processed"
        );
    });
});
