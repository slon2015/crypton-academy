import * as hre from "hardhat";

async function main(): Promise<void> {
    const [deployer] = await hre.ethers.getSigners();
    const args: [string, string, number, string, number] = [
        "CryptoRuble",
        "cRUB",
        2,
        deployer.address,
        100000000,
    ];

    console.log("Deploying contracts with the account:", deployer.address);

    const Token = await hre.ethers.getContractFactory("Token");
    const token = await Token.deploy(...args);

    if (hre.network.name === hre.config.defaultNetwork) {
        await token.deployed();
    } else {
        await token.deployTransaction.wait(5);
    }

    console.log("Token address:", token.address);

    if (hre.network.name !== hre.config.defaultNetwork) {
        await hre.run("verify:verify", {
            address: token.address,
            constructorArguments: args,
        });
    }
}

main().catch((error) => {
    console.error(error);
    throw error;
});
