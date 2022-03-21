import "@nomiclabs/hardhat-waffle";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Signer } from "ethers";

export async function selectSigner(
    args: any,
    hre: HardhatRuntimeEnvironment
): Promise<Signer> {
    const [defaultSender] = await hre.ethers.getSigners();
    const sender: Signer = args.sender
        ? new hre.ethers.Wallet(args.sender, hre.ethers.provider)
        : defaultSender;
    return sender;
}
