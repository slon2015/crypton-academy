// /* eslint-disable no-unused-expressions */
// import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
// import { expect } from "chai";
// import { ethers } from "hardhat";
// import { DAO, Token } from "../typechain";
// import { increaseTime } from "./utils";
// import IUniswapV2Router02 from '@uniswap/v2-periphery/build/IUniswapV2Router02.json'
// import { createSystem } from "../scripts/createSystem";
// import { Artifact } from "hardhat/types";

// describe("DAO", function () {
//     let token: Token;
//     let dao: DAO;
//     let deployer: SignerWithAddress,
//         user1: SignerWithAddress,
//         user2: SignerWithAddress,
//         user3: SignerWithAddress,
//         fund: SignerWithAddress;
//     let calldata: string;

//     const userAmount = 100;
//     const minimumQuorum = 250;
//     const debationPeriod = 2000;
//     const proposalTransferAmount = 1000;

//     this.beforeEach(async () => {
//         [deployer, user1, user2, user3, fund] = await ethers.getSigners();
//         const system = await createSystem();

//         const router = await ethers.getContractAtFromArtifact(
//             IUniswapV2Router02 as unknown as Artifact,
//             "0x7a250d5630b4cf539739df2c5dacb4c659f2488d"
//         );

//         router.

//         // dao = await DaoFactory.deploy(
//         //     token.address,
//         //     minimumQuorum,
//         //     debationPeriod
//         // );
//         // await dao.deployed();

//         // const transfer1 = await token.transfer(user1.address, userAmount);
//         // const approve1 = await token
//         //     .connect(user1)
//         //     .approve(dao.address, userAmount);

//         // const transfer2 = await token.transfer(user2.address, userAmount);
//         // const approve2 = await token
//         //     .connect(user2)
//         //     .approve(dao.address, userAmount);

//         // const transfer3 = await token.transfer(user3.address, userAmount);
//         // const approve3 = await token
//         //     .connect(user3)
//         //     .approve(dao.address, userAmount);

//         // const approve4 = await token.approve(
//         //     dao.address,
//         //     proposalTransferAmount
//         // );

//         // await Promise.all([
//         //     transfer1.wait(),
//         //     approve1.wait(),
//         //     transfer2.wait(),
//         //     approve2.wait(),
//         //     transfer3.wait(),
//         //     approve3.wait(),
//         //     approve4.wait(),
//         // ]);

//         // const deposit1 = await dao.connect(user1).deposit(userAmount);
//         // const deposit2 = await dao.connect(user2).deposit(userAmount);
//         // const deposit3 = await dao.connect(user3).deposit(userAmount);

//         // await Promise.all([deposit1.wait(), deposit2.wait(), deposit3.wait()]);

//         // calldata = token.interface.encodeFunctionData("transferFrom", [
//         //     deployer.address,
//         //     fund.address,
//         //     proposalTransferAmount,
//         // ]);
//     });
// });
