import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Signer } from "ethers";

async function selectSigner(args: any, hre: HardhatRuntimeEnvironment): Promise<Signer> {
  const [defaultSender] = await hre.ethers.getSigners();
  const sender: Signer = args.sender? new hre.ethers.Wallet(args.sender, hre.ethers.provider): defaultSender
  return sender;
}

task("deploy", "Deploy token in network")
  .addParam("name", "Name of token", "CryptoRuble")
  .addParam("symbol", "Symbol of token", "cRUB")
  .addParam("decimals", "Decimals of token", "2")
  .addParam("supply", "Total supply for distribution")
  .setAction(async (args, hre) => {
    const [sender] = await hre.ethers.getSigners();
    const Token = await hre.ethers.getContractFactory("Token");
    const token = await Token.deploy(
      args.name,
      args.symbol,
      Number.parseInt(args.decimals),
      sender.address,
      Number.parseInt(args.supply)
    );

    await token.deployed();
    
    console.log("Token deployed into network with address: " + token.address);
  });

interface ViewArg {
  name: string,
  description: string,
  defaultValue?: unknown
}

interface View {
  name: string
  args?: ViewArg[] 
}

const views: View[] = [
  {
    name: "name"
  },
  {
    name: "symbol"
  },
  {
    name: "decimals"
  },
  {
    name: "totalSupply"
  },
  {
    name: "balanceOf",
    args: [{
      name: "account",
      description: "Specified account address"
    }]
  },
  {
    name: "allowance",
    args: [{
      name: "owner",
      description: "Specified owner address"
    }, {
      name: "spender",
      description: "Specified spender address"
    }]
  }
]

function createViewTask(view: View) {
    const viewTask = task(view.name, "View for " + view.name)
      .addParam("contract", "Contract address")
      .addParam("sender", "Sender address")

    if (view.args) {
      for (const arg of view.args) {
        viewTask.addParam(arg.name, arg.description, arg.defaultValue)
      }
    }

    viewTask.setAction(async (args, hre) => {
    const sender = await selectSigner(args, hre);

      const token = await hre.ethers.getContractAt("Token", args.contract);

      let argsToSend: any[] = [];
      if (view.args) {
        for (const arg of view.args) {
          argsToSend.push(args[arg.name])
        }
      }

      const viewFunction = (token.connect(sender) as any)[view.name]

      const result = await viewFunction(...argsToSend)

      console.log("Result of view: " + result)
    })
}

views.forEach(v => createViewTask(v))

task("transfer", "Transfer token to address")
  .addParam("contract", "Contract address")
  .addParam("sender", "Sender address")
  .addParam("recepient", "Address for transfer")
  .addParam("amount", "Amount for transfer")
  .setAction(async (args, hre) => {
    const sender = await selectSigner(args, hre);

    const token = await hre.ethers.getContractAt("Token", args.contract);

    const tx = await token.connect(sender).transfer(args.recepient, args.amount);

    await tx.wait()

    console.log("Transfer complete")
  })

task("approve", "Approve token to address")
  .addParam("contract", "Contract address")
  .addParam("sender", "Sender address")
  .addParam("recepient", "Address for transfer")
  .addParam("amount", "Amount for transfer")
  .setAction(async (args, hre) => {
    const sender = await selectSigner(args, hre);

    const token = await hre.ethers.getContractAt("Token", args.contract);

    const tx = await token.connect(sender).approve(args.recepient, args.amount);

    await tx.wait()

    console.log("Approve complete")
  })

task("transferFrom", "Transfer token to address")
  .addParam("contract", "Contract address")
  .addParam("sender", "Sender address")
  .addParam("owner", "Address of owner")
  .addParam("recepient", "Address for transfer")
  .addParam("amount", "Amount for transfer")
  .setAction(async (args, hre) => {
    const sender = await selectSigner(args, hre);

    const token = await hre.ethers.getContractAt("Token", args.contract);

    const tx = await token.connect(sender).transferFrom(args.owner, args.recepient, args.amount);

    await tx.wait()

    console.log("TransferFrom complete")
  })