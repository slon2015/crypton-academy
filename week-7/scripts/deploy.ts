import { Contract } from "ethers";
import { createSystem } from "./createSystem";
import * as hre from "hardhat";

async function verify(entry: { contract: Contract; args: any[] }) {
    await entry.contract.deployTransaction.wait(5);
    await hre.run("verify:verify", {
        address: entry.contract.address,
        constructorArguments: entry.args,
    });
}

async function main() {
    const system = await createSystem();
    console.log(`DAO deployed at: ${system.dao.contract.address}`);
    console.log(`Staking deployed at: ${system.staking.contract.address}`);
    console.log(`Platform deployed at: ${system.platform.contract.address}`);
    console.log(`ACDM deployed at: ${system.ACDMToken.contract.address}`);
    console.log(`ACDMX deployed at: ${system.XToken.contract.address}`);
    console.log(`Authority deployed at: ${system.authority.contract.address}`);
    if (hre.network.name === "rinkeby") {
        await verify(system.authority);
        await verify(system.ACDMToken);
        await verify(system.XToken);
        await verify(system.dao);
        await verify(system.staking);
        await verify(system.platform);
    }
}

main().catch((e) => {
    console.error(e);
});
