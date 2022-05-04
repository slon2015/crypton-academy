/* eslint-disable no-unused-vars */
/* eslint-disable no-unused-expressions */
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumberish } from "ethers";
import { ethers } from "hardhat";
import { createSystem } from "../scripts/createSystem";
import { Authority, DAO, ERC20, Staking, XXXToken } from "../typechain";
import { increaseTime } from "./utils";

describe("Staking", function () {
    let targetToken: ERC20;
    let rewardToken: XXXToken;
    let staking: Staking;
    let accounts: SignerWithAddress[];
    let dao: DAO;
    let authority: Authority;
    let tick: number;
    let debationPeriod: number;
    let owner: SignerWithAddress;

    this.beforeEach(async function () {
        const system = await createSystem();
        accounts = await ethers.getSigners();
        targetToken = system.staking.pair;
        rewardToken = system.XToken.contract;
        staking = system.staking.contract;
        authority = system.authority.contract;
        dao = system.dao.contract;
        tick = system.staking.tick;
        debationPeriod = system.dao.debatingPeriod;

        owner = accounts[0];
    });

    async function setFreezeTime(newTime: BigNumberish) {
        const dao = await ethers.getContractAt("DAO", await authority.dao());
        const voter1 = accounts[10];
        const voter2 = accounts[11];

        const calldata = dao.interface.encodeFunctionData(
            "setStakingFreezePeriod",
            [newTime]
        );
        const propose = await dao.createProposal(
            dao.address,
            calldata,
            `Set freeze time to ${newTime.toString()}`
        );
        const receipt = await propose.wait();
        const event = receipt.events!![0];
        const proposalId = event.args!![0];

        await stakeLPs(voter1, 150);
        await stakeLPs(voter2, 150);

        async function voteFor(voter: SignerWithAddress) {
            const vote = await dao.connect(voter).vote(proposalId, 150, 1);
            await vote.wait();
        }

        await voteFor(voter1);
        await voteFor(voter2);

        await increaseTime(debationPeriod);

        const finisher = await dao.connect(voter1).finishProposal(proposalId);
        await finisher.wait();
    }

    async function stakeLPs(user: SignerWithAddress, amount: number) {
        if (user !== accounts[0]) {
            const sendTx = await targetToken
                .connect(accounts[0])
                .transfer(user.address, amount);
            await sendTx.wait();
        }

        const approve = await targetToken
            .connect(user)
            .approve(staking.address, amount);
        await approve.wait();
        const stakeTx = await staking.connect(user).stake(amount);
        await stakeTx.wait();
    }

    it("Should stake non zero amounts", async () => {
        const [_, user] = accounts;

        await stakeLPs(user, 1000);

        expect(await staking.getStakedAmount(user.address)).to.equal(1000);
        expect(await targetToken.balanceOf(user.address)).to.equal(0);
    });

    it("Should increase stake amount with claim", async () => {
        const [_, user] = accounts;

        await stakeLPs(user, 2000);

        await increaseTime(tick);

        await stakeLPs(user, 1000);

        expect(await rewardToken.balanceOf(user.address)).to.equal(0);
        expect(await staking.connect(user).getClaimableAmount()).to.equal(60);
    });

    it("Should not stake zero amounts", async () => {
        expect(staking.stake(0)).to.be.revertedWith(
            "Amount must be highter than 0"
        );
    });

    it("Should increase reward with time", async () => {
        await stakeLPs(accounts[0], 1000);

        await increaseTime(tick);

        expect(await staking.getClaimableAmount()).to.be.equal(30);

        await increaseTime(tick);

        expect(await staking.getClaimableAmount()).to.be.equal(60);
    });

    it("Should claim reward with subsequent staking", async () => {
        const [_, user] = accounts;

        await stakeLPs(user, 2000);

        await increaseTime(tick);

        const tx = await staking.connect(user).claim();
        await tx.wait();

        expect(await rewardToken.balanceOf(user.address)).to.equal(60);
        expect(await staking.getStakedAmount(user.address)).to.equal(2000);
    });

    it("Should not claim with zero claimable reward", async () => {
        const [_, user] = accounts;

        await stakeLPs(user, 1000);

        expect(staking.connect(user).claim()).revertedWith(
            "There's no reward to claim"
        );
    });

    it("Should not unstake tokens early than freeze period ends", async () => {
        const [_, user] = accounts;

        await stakeLPs(user, 1000);

        expect(staking.connect(user).unstake()).to.be.revertedWith(
            "Too early to unstake"
        );
    });

    it("Should unstake tokens with zero claimable reward", async () => {
        const [_, user] = accounts;

        await stakeLPs(user, 1000);

        const terms = await staking.terms();

        await setFreezeTime(0);

        const unstakeTx = await staking.connect(user).unstake();
        await unstakeTx.wait();

        expect(await rewardToken.balanceOf(user.address)).to.equal(0);
        expect(await targetToken.balanceOf(user.address)).to.equal(1000);
        expect(await staking.getStakedAmount(user.address)).to.equal(0);
    });

    it("Should unstake tokens with non zero claimable reward", async () => {
        const [_, user] = accounts;

        await stakeLPs(user, 1000);

        await increaseTime((await dao.stakingFreezePeriod()).toNumber());

        const tx = await staking.connect(user).unstake();
        await tx.wait();

        expect(await rewardToken.balanceOf(user.address)).to.equal(30);
        expect(await targetToken.balanceOf(user.address)).to.equal(1000);
        expect(await staking.getStakedAmount(user.address)).to.equal(0);
    });

    it("Should manage terms", async () => {
        const tx = await staking.manage(
            rewardToken.address,
            targetToken.address,
            100,
            100
        );
        await tx.wait();

        const terms = await staking.terms();

        expect(terms.tokenToSatking).to.equal(rewardToken.address);
        expect(terms.rewardToken).to.equal(targetToken.address);
        expect(terms.tick).to.equal(100);
        expect(terms.rewardPercent).to.equal(100);
    });

    it("Should not manage from non admin", async () => {
        const [_, user] = accounts;

        expect(
            staking
                .connect(user)
                .manage(
                    ethers.constants.AddressZero,
                    ethers.constants.AddressZero,
                    100,
                    100
                )
        ).to.be.reverted;
    });
});
