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
        deployer: SignerWithAddress,
        sender: SignerWithAddress,
        recepient: SignerWithAddress,
        thirdParty: SignerWithAddress,
        validator: SignerWithAddress;
    let nonce: number;
    const minted = ethers.BigNumber.from(1000000000000000);
    const amountToTransfer = 100;

    this.beforeEach(async () => {
        nonce = 1;
        [deployer, sender, recepient, thirdParty, validator] =
            await ethers.getSigners();
        const TokenFactory = await ethers.getContractFactory("Token");
        const BridgeFactory = await ethers.getContractFactory("Bridge");

        tokenA = await TokenFactory.deploy("ChainAToken", "ATOK");
        tokenB = await TokenFactory.deploy("ChainBToken", "TOKB");

        await Promise.all([tokenA.deployed(), tokenB.deployed()]);

        gateA = await BridgeFactory.deploy(tokenA.address, validator.address);
        gateB = await BridgeFactory.deploy(tokenB.address, validator.address);

        await Promise.all([gateA.deployed(), gateB.deployed()]);

        await Promise.all([
            await tokenA
                .connect(deployer)
                .transfer(gateA.address, minted.div(2)),
            await tokenB
                .connect(deployer)
                .transfer(gateB.address, minted.div(2)),
            await tokenA
                .connect(deployer)
                .transfer(sender.address, amountToTransfer),
            await tokenA
                .connect(sender)
                .approve(gateA.address, amountToTransfer),
        ]);
    });

    it("Should transfer tokens", async () => {
        const message = arrayify(
            solidityKeccak256(
                ["address", "address", "uint", "uint"],
                [sender.address, recepient.address, amountToTransfer, nonce]
            )
        );

        const signature = await validator.signMessage(message);

        const transferTx = await gateA
            .connect(sender)
            .swap(recepient.address, amountToTransfer, nonce);

        await transferTx.wait();

        const receiveTx = await gateB.redeem(
            sender.address,
            recepient.address,
            amountToTransfer,
            nonce,
            signature
        );

        await receiveTx.wait();

        expect(await tokenA.balanceOf(sender.address)).to.equal(0);

        expect(await tokenB.balanceOf(recepient.address)).to.equal(
            amountToTransfer
        );
    });

    it("Should not transfer tokens without approve", async () => {
        const unapproveTx = await tokenA
            .connect(sender)
            .approve(gateA.address, 0);
        await unapproveTx.wait();

        const transferTx = gateA
            .connect(sender)
            .swap(recepient.address, amountToTransfer, nonce);

        expect(transferTx).to.be.revertedWith("Tokens not allowed");
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
            .swap(recepient.address, amountToTransfer, nonce);

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
        const transferTx = await gateA
            .connect(sender)
            .swap(recepient.address, amountToTransfer, nonce);

        await transferTx.wait();

        const secondTransfer = gateA
            .connect(sender)
            .swap(recepient.address, amountToTransfer, nonce);

        expect(secondTransfer).to.be.revertedWith("Transfer already processed");
    });

    it("Should not accept single signature more than once", async () => {
        const message = arrayify(
            solidityKeccak256(
                ["address", "address", "uint", "uint"],
                [sender.address, recepient.address, amountToTransfer, nonce]
            )
        );

        const signature = await validator.signMessage(message);

        const transferTx = await gateA
            .connect(sender)
            .swap(recepient.address, amountToTransfer, nonce);

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
