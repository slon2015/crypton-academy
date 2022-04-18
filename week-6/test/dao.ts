/* eslint-disable no-unused-expressions */
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { DAO, Token } from "../typechain";
import { increaseTime } from "./utils";

describe("DAO", function () {
    let token: Token;
    let dao: DAO;
    let deployer: SignerWithAddress,
        user1: SignerWithAddress,
        user2: SignerWithAddress,
        user3: SignerWithAddress,
        fund: SignerWithAddress;
    let calldata: string;

    const userAmount = 100;
    const minimumQuorum = 250;
    const debationPeriod = 2000;
    const proposalTransferAmount = 1000;

    this.beforeEach(async () => {
        const TokenFactory = await ethers.getContractFactory("Token");
        const DaoFactory = await ethers.getContractFactory("DAO");
        [deployer, user1, user2, user3, fund] = await ethers.getSigners();

        token = await TokenFactory.deploy("Token", "TOK");
        await token.deployed();

        dao = await DaoFactory.deploy(
            token.address,
            minimumQuorum,
            debationPeriod
        );
        await dao.deployed();

        const transfer1 = await token.transfer(user1.address, userAmount);
        const approve1 = await token
            .connect(user1)
            .approve(dao.address, userAmount);

        const transfer2 = await token.transfer(user2.address, userAmount);
        const approve2 = await token
            .connect(user2)
            .approve(dao.address, userAmount);

        const transfer3 = await token.transfer(user3.address, userAmount);
        const approve3 = await token
            .connect(user3)
            .approve(dao.address, userAmount);

        const approve4 = await token.approve(
            dao.address,
            proposalTransferAmount
        );

        await Promise.all([
            transfer1.wait(),
            approve1.wait(),
            transfer2.wait(),
            approve2.wait(),
            transfer3.wait(),
            approve3.wait(),
            approve4.wait(),
        ]);

        const deposit1 = await dao.connect(user1).deposit(userAmount);
        const deposit2 = await dao.connect(user2).deposit(userAmount);
        const deposit3 = await dao.connect(user3).deposit(userAmount);

        await Promise.all([deposit1.wait(), deposit2.wait(), deposit3.wait()]);

        calldata = token.interface.encodeFunctionData("transferFrom", [
            deployer.address,
            fund.address,
            proposalTransferAmount,
        ]);
    });

    it("E2E - Proposal executed", async () => {
        const propositionTx = await dao.createProposal(
            token.address,
            calldata,
            "Transfer 1000 tokens to fund"
        );

        await propositionTx.wait();

        const vote1 = await dao.connect(user1).vote(0, userAmount, 1);
        const vote2 = await dao.connect(user2).vote(0, userAmount, 1);
        const vote3 = await dao.connect(user3).vote(0, userAmount, 0);

        await Promise.all([vote1.wait(), vote2.wait(), vote3.wait()]);

        await increaseTime(debationPeriod * 2);

        const finishTx = await dao.finishProposal(0);
        await finishTx.wait();

        const withdraw1 = await dao.connect(user1).withdraw();
        const withdraw2 = await dao.connect(user2).withdraw();
        const withdraw3 = await dao.connect(user3).withdraw();

        await Promise.all([
            withdraw1.wait(),
            withdraw2.wait(),
            withdraw3.wait(),
        ]);

        expect(await token.balanceOf(user1.address)).to.equal(userAmount);
        expect(await token.balanceOf(user2.address)).to.equal(userAmount);
        expect(await token.balanceOf(user3.address)).to.equal(userAmount);
        expect(await token.balanceOf(fund.address)).to.equal(
            proposalTransferAmount
        );
    });

    it("E2E - Proposal rejected", async () => {
        const propositionTx = await dao.createProposal(
            token.address,
            calldata,
            "Transfer 1000 tokens to fund"
        );

        await propositionTx.wait();

        const vote1 = await dao.connect(user1).vote(0, userAmount, 1);
        const vote2 = await dao.connect(user2).vote(0, userAmount, 2);
        const vote3 = await dao.connect(user3).vote(0, userAmount, 0);

        await Promise.all([vote1.wait(), vote2.wait(), vote3.wait()]);

        await increaseTime(debationPeriod * 2);

        const finishTx = await dao.finishProposal(0);
        await finishTx.wait();

        const withdraw1 = await dao.connect(user1).withdraw();
        const withdraw2 = await dao.connect(user2).withdraw();
        const withdraw3 = await dao.connect(user3).withdraw();

        await Promise.all([
            withdraw1.wait(),
            withdraw2.wait(),
            withdraw3.wait(),
        ]);

        expect(await token.balanceOf(user1.address)).to.equal(userAmount);
        expect(await token.balanceOf(user2.address)).to.equal(userAmount);
        expect(await token.balanceOf(user3.address)).to.equal(userAmount);
        expect(await token.balanceOf(fund.address)).to.equal(0);
    });

    it("Should not withraw while debates in progress", async () => {
        const propositionTx = await dao.createProposal(
            token.address,
            calldata,
            "Transfer 1000 tokens to fund"
        );

        await propositionTx.wait();

        const vote = await dao.connect(user1).vote(0, userAmount, 1);
        await vote.wait();

        expect(dao.connect(user1).withdraw()).to.be.reverted;
    });

    it("Should not vote for nonexistant proposal", async () => {
        expect(dao.connect(user1).vote(0, userAmount, 1)).to.be.reverted;
    });

    it("Should not vote for single proposal twice", async () => {
        const propositionTx = await dao.createProposal(
            token.address,
            calldata,
            "Transfer 1000 tokens to fund"
        );

        await propositionTx.wait();

        const vote = await dao.connect(user1).vote(0, userAmount, 1);
        await vote.wait();

        expect(dao.connect(user1).vote(0, userAmount, 1)).to.be.reverted;
    });

    it("Should not vote with bigger balance", async () => {
        const propositionTx = await dao.createProposal(
            token.address,
            calldata,
            "Transfer 1000 tokens to fund"
        );

        await propositionTx.wait();

        expect(dao.connect(user1).vote(0, userAmount * 2, 1)).to.be.reverted;
    });

    it("Should not finish nonexistant proposal", async () => {
        expect(dao.connect(user1).finishProposal(0)).to.be.reverted;
    });

    it("Should not finish proposal earlier than debates ends", async () => {
        const propositionTx = await dao.createProposal(
            token.address,
            calldata,
            "Transfer 1000 tokens to fund"
        );

        await propositionTx.wait();

        expect(dao.connect(user1).finishProposal(0)).to.be.reverted;
    });

    it("Should finish proposal with failed call", async () => {
        const unapprove = await token.approve(dao.address, 0);
        await unapprove.wait();

        const propositionTx = await dao.createProposal(
            token.address,
            calldata,
            "Transfer 1000 tokens to fund"
        );

        await propositionTx.wait();

        const vote1 = await dao.connect(user1).vote(0, userAmount, 1);
        const vote2 = await dao.connect(user2).vote(0, userAmount, 1);
        const vote3 = await dao.connect(user3).vote(0, userAmount, 0);

        await Promise.all([vote1.wait(), vote2.wait(), vote3.wait()]);

        increaseTime(debationPeriod * 2);

        const finish = await dao.finishProposal(0);
        await finish.wait();

        const withdraw1 = await dao.connect(user1).withdraw();
        const withdraw2 = await dao.connect(user2).withdraw();
        const withdraw3 = await dao.connect(user3).withdraw();

        await Promise.all([
            withdraw1.wait(),
            withdraw2.wait(),
            withdraw3.wait(),
        ]);

        expect(await token.balanceOf(user1.address)).to.equal(userAmount);
        expect(await token.balanceOf(user2.address)).to.equal(userAmount);
        expect(await token.balanceOf(user3.address)).to.equal(userAmount);
        expect(await token.balanceOf(fund.address)).to.equal(0);
    });
});
