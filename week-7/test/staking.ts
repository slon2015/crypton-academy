// /* eslint-disable no-unused-vars */
// /* eslint-disable no-unused-expressions */
// import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
// import { expect } from "chai";
// import { ethers } from "hardhat";
// import { createSystem } from "../scripts/createSystem";
// import { Authority, ERC20, Staking, XXXToken } from "../typechain";
// import { increaseTime } from "./utils";

// describe("Staking", function () {
//     let targetToken: ERC20;
//     let rewardToken: XXXToken;
//     let staking: Staking;
//     let accounts: SignerWithAddress[];
//     let freezePeriod: number;
//     let authority: Authority;

//     this.beforeEach(async function () {
//         const system = await createSystem();
//         accounts = await ethers.getSigners();
//         targetToken = system.XToken;
//         rewardToken = system.XToken;
//         staking = system.staking.contract;
//         freezePeriod = system.staking.freezePeriod;
//         authority = system.authority;

//         await Promise.all([
//             targetToken.deployed(),
//             rewardToken.deployed(),
//             staking.deployed(),
//         ]);

//         const approve = await rewardToken.approve(
//             staking.address,
//             await rewardToken.totalSupply()
//         );

//         await approve.wait();
//     });

//     it("Should stake non zero amounts", async () => {
//         const [_, user] = accounts;
//         const transfer = await targetToken.transfer(user.address, 1000);

//         const approve = await targetToken
//             .connect(user)
//             .approve(staking.address, 1000);

//         const stake = await staking.connect(user).stake(1000);

//         await Promise.all([transfer.wait(), approve.wait(), stake.wait()]);

//         expect(await staking.getStakedAmount(user.address)).to.equal(1000);
//         expect(await targetToken.balanceOf(user.address)).to.equal(0);
//     });

//     it("Should increase stake amount with claim", async () => {
//         const [_, user] = accounts;

//         const transfer = await targetToken.transfer(user.address, 2000);

//         const approve = await targetToken
//             .connect(user)
//             .approve(staking.address, 2000);

//         let stake = await staking.connect(user).stake(1000);

//         await Promise.all([transfer.wait(), approve.wait(), stake.wait()]);

//         await increaseTime(10);

//         stake = await staking.connect(user).stake(1000);

//         await stake.wait();

//         expect(await rewardToken.balanceOf(user.address)).to.equal(0);
//         expect(await staking.connect(user).getClaimableAmount()).to.equal(10);
//     });

//     it("Should not stake zero amounts", async () => {
//         expect(staking.stake(0)).to.be.revertedWith(
//             "Amount must be highter than 0"
//         );
//     });

//     it("Should increase reward with time", async () => {
//         const approve = await targetToken.approve(staking.address, 1000);

//         await approve.wait();

//         const tx = await staking.stake(1000);

//         await tx.wait();

//         await increaseTime(10);

//         expect(await staking.getClaimableAmount()).to.be.equal(10);

//         await increaseTime(10);

//         expect(await staking.getClaimableAmount()).to.be.equal(20);
//     });

//     it("Should claim reward with subsequent staking", async () => {
//         const [_, user] = accounts;

//         const transfer = await targetToken.transfer(user.address, 2000);

//         const approve = await targetToken
//             .connect(user)
//             .approve(staking.address, 2000);

//         const stake = await staking.connect(user).stake(1000);

//         await Promise.all([transfer.wait(), approve.wait(), stake.wait()]);

//         await increaseTime(10);

//         const tx = await staking.connect(user).claim();
//         await tx.wait();

//         expect(await rewardToken.balanceOf(user.address)).to.equal(10);
//         expect(await staking.getStakedAmount(user.address)).to.equal(1000);
//     });

//     it("Should not claim with zero claimable reward", async () => {
//         const [_, user] = accounts;

//         const transfer = await targetToken.transfer(user.address, 2000);

//         const approve = await targetToken
//             .connect(user)
//             .approve(staking.address, 2000);

//         const stake = await staking.connect(user).stake(1000);

//         await Promise.all([transfer.wait(), approve.wait(), stake.wait()]);

//         expect(staking.connect(user).claim()).revertedWith(
//             "There's no reward to claim"
//         );
//     });

//     it("Should not unstake tokens early than freeze period ends", async () => {
//         const [_, user] = accounts;

//         const transfer = await targetToken.transfer(user.address, 2000);

//         const approve = await targetToken
//             .connect(user)
//             .approve(staking.address, 2000);

//         const stake = await staking.connect(user).stake(1000);

//         await Promise.all([transfer.wait(), approve.wait(), stake.wait()]);

//         expect(staking.connect(user).unstake()).to.be.revertedWith(
//             "Too early to unstake"
//         );
//     });

//     it("Should unstake tokens with zero claimable reward", async () => {
//         const [_, user] = accounts;

//         const transfer = await targetToken.transfer(user.address, 1000);

//         const approve = await targetToken
//             .connect(user)
//             .approve(staking.address, 1000);

//         const stake = await staking.connect(user).stake(1000);
//         const terms = await staking.getTerms();

//         await Promise.all([
//             transfer.wait(),
//             approve.wait(),
//             stake.wait(),
//             (
//                 await staking.manage(
//                     terms.tokenToSatking,
//                     terms.rewardToken,
//                     terms.tick,
//                     terms.rewardPercent,
//                     0,
//                     authority.address
//                 )
//             ).wait(),
//             (await staking.connect(user).unstake()).wait(),
//         ]);

//         expect(await rewardToken.balanceOf(user.address)).to.equal(0);
//         expect(await targetToken.balanceOf(user.address)).to.equal(1000);
//         expect(await staking.getStakedAmount(user.address)).to.equal(0);
//     });

//     it("Should unstake tokens with non zero claimable reward", async () => {
//         const [_, user] = accounts;

//         const transfer = await targetToken.transfer(user.address, 2000);

//         const approve = await targetToken
//             .connect(user)
//             .approve(staking.address, 2000);

//         const stake = await staking.connect(user).stake(1000);

//         await Promise.all([transfer.wait(), approve.wait(), stake.wait()]);

//         await increaseTime(freezePeriod + 10);

//         const tx = await staking.connect(user).unstake();
//         await tx.wait();

//         expect((await rewardToken.balanceOf(user.address)).gt(0)).is.true;
//         expect(await targetToken.balanceOf(user.address)).to.equal(2000);
//         expect(await staking.getStakedAmount(user.address)).to.equal(0);
//     });

//     it("Should manage terms", async () => {
//         const [_, user] = accounts;

//         const tx = await staking.manage(
//             rewardToken.address,
//             targetToken.address,
//             100,
//             100,
//             10,
//             authority.address
//         );
//         await tx.wait();

//         const terms = await staking.getTerms();

//         expect(terms.tokenToSatking).to.equal(rewardToken.address);
//         expect(terms.rewardToken).to.equal(targetToken.address);
//         expect(terms.tick).to.equal(100);
//         expect(terms.rewardPercent).to.equal(100);
//         expect(terms.freezePeriod).to.equal(10);
//     });

//     it("Should not manage from non admin", async () => {
//         const [_, user] = accounts;

//         expect(
//             staking
//                 .connect(user)
//                 .manage(
//                     ethers.constants.AddressZero,
//                     ethers.constants.AddressZero,
//                     100,
//                     100,
//                     10,
//                     authority.address
//                 )
//         ).to.be.reverted;
//     });
// });
