import { expect } from "chai";
import { ethers } from "hardhat";
import { Token } from "../typechain";

async function getToken(): Promise<Token> {
    const [sender] = await ethers.getSigners();
    const TokenFactory = await ethers.getContractFactory("Token");
    const token = await TokenFactory.deploy(
        "CryptoRuble",
        "cRUB",
        2,
        sender.address,
        1000000000
    );
    await token.deployed();
    return token;
}

describe("Token", function () {
    it("Should contains metadata", async function () {
        const token = await getToken();

        expect(await token.name()).to.equal("CryptoRuble");
        expect(await token.symbol()).to.equal("cRUB");
        expect(await token.decimals()).to.equal(2);
        expect(await token.totalSupply()).to.equal(1000000000);
    });

    it("Should transfer tokens", async function () {
        const [distributor, recepient] = await ethers.getSigners();
        const token = await getToken();

        const tx = await token
            .connect(distributor)
            .transfer(recepient.address, 100);
        await tx.wait();

        expect(await token.balanceOf(distributor.address)).to.equal(
            (await token.totalSupply()).sub(100)
        );
        expect(await token.balanceOf(recepient.address)).to.equal(100);
    });

    it("Should approves tokens", async function () {
        const [distributor, recepient] = await ethers.getSigners();
        const token = await getToken();

        const tx = await token
            .connect(distributor)
            .approve(recepient.address, 100);
        await tx.wait();

        expect(await token.balanceOf(distributor.address)).to.equal(
            await token.totalSupply()
        );
        expect(
            await token.allowance(distributor.address, recepient.address)
        ).to.equal(100);
    });

    it("Should transfer approved tokens", async function () {
        const [distributor, recepient, thirdParty] = await ethers.getSigners();
        const token = await getToken();

        let tx = await token
            .connect(distributor)
            .approve(recepient.address, 100);
        await tx.wait();

        tx = await token
            .connect(recepient)
            .transferFrom(distributor.address, thirdParty.address, 100);
        await tx.wait();

        expect(await token.balanceOf(distributor.address)).to.equal(
            (await token.totalSupply()).sub(100)
        );
        expect(
            await token.allowance(distributor.address, recepient.address)
        ).to.equal(0);
        expect(await token.balanceOf(thirdParty.address)).to.equal(100);
    });

    it("Should mint tokens", async function () {
        const [distributor, recepient] = await ethers.getSigners();
        const token = await getToken();

        const oldTotalSupply = await token.totalSupply();

        const tx = await token
            .connect(distributor)
            .mint(recepient.address, 100);
        await tx.wait();

        expect(await token.balanceOf(distributor.address)).to.equal(
            oldTotalSupply
        );
        expect(await token.balanceOf(recepient.address)).to.equal(100);
        expect(await token.totalSupply()).to.equal(oldTotalSupply.add(100));
    });

    it("Should burn tokens", async function () {
        const [distributor, recepient] = await ethers.getSigners();
        const token = await getToken();

        const oldTotalSupply = await token.totalSupply();

        let tx = await token
            .connect(distributor)
            .transfer(recepient.address, 100);
        await tx.wait();

        tx = await token.connect(recepient).burn(recepient.address, 100);
        await tx.wait();

        expect(await token.balanceOf(distributor.address)).to.equal(
            oldTotalSupply.sub(100)
        );
        expect(await token.balanceOf(recepient.address)).to.equal(0);
        expect(await token.totalSupply()).to.equal(oldTotalSupply.sub(100));
    });

    it("Should not transfer tokens from invalid address", async function () {
        const [distributor] = await ethers.getSigners();
        const token = await getToken();

        expect(
            token
                .connect(distributor)
                .transfer(ethers.constants.AddressZero, 100)
        ).to.be.revertedWith("transfer to the zero address");
    });

    it("Should not transfer more tokens than have", async function () {
        const [distributor, recepient] = await ethers.getSigners();
        const token = await getToken();

        const tokensForTransfer = (
            await token.balanceOf(distributor.address)
        ).add(100);

        expect(
            token
                .connect(distributor)
                .transfer(recepient.address, tokensForTransfer)
        ).to.be.revertedWith("transfer amount exceeds balance");
    });

    it("Should not approve tokens for invalid address", async function () {
        const [distributor] = await ethers.getSigners();
        const token = await getToken();

        expect(
            token
                .connect(distributor)
                .approve(ethers.constants.AddressZero, 100)
        ).to.be.revertedWith("approve to the zero address");
    });

    it("Should not transfer more tokens than approved", async function () {
        const [distributor, recepient, thirdParty] = await ethers.getSigners();
        const token = await getToken();

        const tx = await token
            .connect(distributor)
            .approve(recepient.address, 100);
        await tx.wait();

        expect(
            token
                .connect(recepient)
                .transferFrom(distributor.address, thirdParty.address, 1000)
        ).to.be.revertedWith("transfer amount exceeds allowance");
    });

    it("Should not transfer tokens from invalid address", async function () {
        const [distributor, recepient, thirdParty] = await ethers.getSigners();
        const token = await getToken();

        const tx = await token
            .connect(distributor)
            .approve(recepient.address, 100);
        await tx.wait();

        expect(
            token
                .connect(recepient)
                .transferFrom(
                    ethers.constants.AddressZero,
                    thirdParty.address,
                    100
                )
        ).to.be.reverted;
    });

    it("Should not transfer tokens to invalid address", async function () {
        const [distributor, recepient] = await ethers.getSigners();
        const token = await getToken();

        const tx = await token
            .connect(distributor)
            .approve(recepient.address, 100);
        await tx.wait();

        expect(
            token
                .connect(recepient)
                .transferFrom(
                    distributor.address,
                    ethers.constants.AddressZero,
                    100
                )
        ).to.be.reverted;
    });

    it("Should not mint tokens for non distributor request", async function () {
        const [_, recepient] = await ethers.getSigners();
        const token = await getToken();

        expect(
            token.connect(recepient).mint(recepient.address, 100)
        ).to.be.revertedWith("Not distributor");
    });

    it("Should not burn tokens for not authorized request", async function () {
        const [distributor, recepient, thirdParty] = await ethers.getSigners();
        const token = await getToken();

        const tx = await token
            .connect(distributor)
            .transfer(recepient.address, 100);
        await tx.wait();

        expect(
            token.connect(thirdParty).burn(recepient.address, 100)
        ).to.be.revertedWith("Not permited for burn");
    });

    it("Should not burn more tokens than have", async function () {
        const [distributor, recepient] = await ethers.getSigners();
        const token = await getToken();

        const tx = await token
            .connect(distributor)
            .transfer(recepient.address, 100);
        await tx.wait();

        expect(
            token.connect(recepient).burn(recepient.address, 1000)
        ).to.be.revertedWith("Too low for burn");
    });
});
