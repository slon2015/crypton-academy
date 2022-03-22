/* eslint-disable no-unused-vars */
/* eslint-disable no-unused-expressions */
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ADDRESS_ZERO } from "@uniswap/v3-sdk";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Staking, Token } from "../typechain";
import { getToken, increaseTime, mine } from "./utils";

describe("Staking", function () {
    let targetToken: Token;
    let rewardToken: Token;
    let staking: Staking;
    let accounts: SignerWithAddress[];
    const freezePeriod = 60 * 60 * 10;

    this.beforeEach(async function () {
        accounts = await ethers.getSigners();
        targetToken = await getToken("Target", "TGT");
        rewardToken = await getToken("Reward", "RWD");
        const StakingFactory = await ethers.getContractFactory("Staking");
        staking = await StakingFactory.deploy(
            targetToken.address,
            rewardToken.address,
            10,
            1,
            accounts[0].address,
            freezePeriod
        );

        await Promise.all([
            targetToken.deployed(),
            rewardToken.deployed(),
            staking.deployed(),
            mine(),
        ]);

        const approve = await rewardToken.approve(
            staking.address,
            await rewardToken.totalSupply()
        );

        await mine(approve);
    });

    it("Should stake non zero amounts", async () => {
        const [_, user] = accounts;
        const transfer = await targetToken.transfer(user.address, 1000);

        const approve = await targetToken
            .connect(user)
            .approve(staking.address, 1000);

        const stake = await staking.connect(user).stake(1000);

        await mine(transfer, approve, stake);

        expect(await staking.connect(user).getStakedAmount()).to.equal(1000);
        expect(await targetToken.balanceOf(user.address)).to.equal(0);
    });

    it("Should increase stake amount with claim", async () => {
        const [_, user] = accounts;

        const transfer = await targetToken.transfer(user.address, 2000);

        const approve = await targetToken
            .connect(user)
            .approve(staking.address, 2000);

        let stake = await staking.connect(user).stake(1000);

        await mine(transfer, approve, stake);

        await increaseTime(10);

        stake = await staking.connect(user).stake(1000);

        await stake.wait();

        expect(await rewardToken.balanceOf(user.address)).to.equal(0);
        expect(await staking.connect(user).getClaimableAmount()).to.equal(10);
    });

    it("Should not stake zero amounts", async () => {
        expect(staking.stake(0)).to.be.revertedWith(
            "Amount must be highter than 0"
        );
    });

    it("Should increase reward with time", async () => {
        const approve = await targetToken.approve(staking.address, 1000);

        await mine(approve);

        const tx = await staking.stake(1000);

        await mine(tx);

        await increaseTime(10);

        expect(await staking.getClaimableAmount()).to.be.equal(10);

        await increaseTime(10);

        expect(await staking.getClaimableAmount()).to.be.equal(20);
    });

    it("Should claim reward with subsequent staking", async () => {
        const [_, user] = accounts;

        const transfer = await targetToken.transfer(user.address, 2000);

        const approve = await targetToken
            .connect(user)
            .approve(staking.address, 2000);

        const stake = await staking.connect(user).stake(1000);

        await mine(transfer, approve, stake);

        await increaseTime(10);

        await mine(await staking.connect(user).claim());

        expect(await rewardToken.balanceOf(user.address)).to.equal(10);
        expect(await staking.connect(user).getStakedAmount()).to.equal(1000);
    });

    it("Should not claim with zero claimable reward", async () => {
        const [_, user] = accounts;

        const transfer = await targetToken.transfer(user.address, 2000);

        const approve = await targetToken
            .connect(user)
            .approve(staking.address, 2000);

        const stake = await staking.connect(user).stake(1000);

        await mine(transfer, approve, stake);

        expect(staking.connect(user).claim()).revertedWith(
            "There's no reward to claim"
        );
    });

    it("Should not unstake tokens early than freeze period ends", async () => {
        const [_, user] = accounts;

        const transfer = await targetToken.transfer(user.address, 2000);

        const approve = await targetToken
            .connect(user)
            .approve(staking.address, 2000);

        const stake = await staking.connect(user).stake(1000);

        mine(transfer, approve, stake);

        expect(staking.connect(user).unstake()).to.be.revertedWith(
            "Too early to unstake"
        );
    });

    it("Should unstake tokens with zero claimable reward", async () => {
        const [_, user] = accounts;

        const transfer = await targetToken.transfer(user.address, 1000);

        const approve = await targetToken
            .connect(user)
            .approve(staking.address, 1000);

        const stake = await staking.connect(user).stake(1000);
        const terms = await staking.getTerms();

        mine(
            transfer,
            approve,
            stake,
            await staking.manage(
                terms.tokenToSatking,
                terms.rewardToken,
                terms.tick,
                terms.rewardPercent,
                terms.treasury,
                0
            ),
            await staking.connect(user).unstake()
        );

        expect(await rewardToken.balanceOf(user.address)).to.equal(0);
        expect(await targetToken.balanceOf(user.address)).to.equal(1000);
        expect(await staking.connect(user).getStakedAmount()).to.equal(0);
    });

    it("Should unstake tokens with non zero claimable reward", async () => {
        const [_, user] = accounts;

        const transfer = await targetToken.transfer(user.address, 2000);

        const approve = await targetToken
            .connect(user)
            .approve(staking.address, 2000);

        const stake = await staking.connect(user).stake(1000);

        mine(transfer, approve, stake);

        await increaseTime(freezePeriod + 10);

        mine(await staking.connect(user).unstake());

        expect((await rewardToken.balanceOf(user.address)).gt(0)).is.true;
        expect(await targetToken.balanceOf(user.address)).to.equal(2000);
        expect(await staking.connect(user).getStakedAmount()).to.equal(0);
    });

    it("Should manage terms", async () => {
        const [_, user] = accounts;

        mine(
            await staking.manage(
                rewardToken.address,
                targetToken.address,
                100,
                100,
                user.address,
                10
            )
        );

        const terms = await staking.getTerms();

        expect(terms.tokenToSatking).to.equal(rewardToken.address);
        expect(terms.rewardToken).to.equal(targetToken.address);
        expect(terms.tick).to.equal(100);
        expect(terms.rewardPercent).to.equal(100);
        expect(terms.treasury).to.equal(user.address);
        expect(terms.freezePeriod).to.equal(10);
    });

    it("Should not manage from non admin", async () => {
        const [_, user] = accounts;

        expect(
            staking
                .connect(user)
                .manage(ADDRESS_ZERO, ADDRESS_ZERO, 100, 100, ADDRESS_ZERO, 10)
        ).to.be.reverted;
    });
});
