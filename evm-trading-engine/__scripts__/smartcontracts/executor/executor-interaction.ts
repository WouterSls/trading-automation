import { Contract, ethers, Wallet } from "ethers";
import { EXECUTOR_INTERFACE } from "../../../src/lib/smartcontract-abis/executor";
import { getHardhatWallet_1 } from "../../../src/hooks/useSetup";
import { createDomain, Order, PermitSingle, Protocol, RouteData } from "../../../src/lib/generated-solidity-types";
import { ERC20_INTERFACE } from "../../../src/lib/smartcontract-abis/erc20";

async function executorInteraction() {
  console.log("EXECUTOR CONTRACT TESTING");
  console.log("===============================");
  console.log();

  //EXECUTOR ADDRESS:
  //0x5FbDB2315678afecb367f032d93F642f64180aa3

  const tokenAAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"

  const tokenBAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

  const EXECUTOR_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const deployerWallet = getHardhatWallet_1();
  const network = await deployerWallet.provider?.getNetwork();
  if (!network) throw new Error("PROVIDER NETWORK ERROR");
  const chainId = network.chainId;
  console.log("chainId", chainId);

  const executorContract = new Contract(EXECUTOR_ADDRESS, EXECUTOR_INTERFACE, deployerWallet);
  const tokenAContract = new Contract(tokenAAddress, ERC20_INTERFACE, deployerWallet);

  //const tokenABalance = await tokenAContract.balanceOf(deployerWallet.address);
  //console.log("TOKEN A BALANCE:")
  //console.log(tokenABalance);

  const eip712Domain = await executorContract.eip712Domain();
  console.log("EIP 712 Domain")
  console.log(eip712Domain);

  const domain = createDomain(Number(chainId), EXECUTOR_ADDRESS);
  console.log("Domain used for signing:", domain);

  const tokenIn = tokenAAddress;
  const amountIn = ethers.parseUnits("1", 18).toString();
  const tokenOut = tokenBAddress;

  const expiry = (Math.floor(Date.now() / 1000) + 3600).toString(); 
  const permit2Nonce = "1" // Permit2.getNonce();
  const orderNonce = "1" // executor.getOrderNonce(); | usedNonce(address, nonce) == false;

  const spender = deployerWallet.address // transfer to 0xTraderAddress for gas optimization 

  try {
    const permit2Data: PermitSingle = {
      details: {
        token: tokenIn,
        amount: amountIn,
      },
      spender: spender,
      sigDeadline: expiry,
      nonce: permit2Nonce,
    };
    const permit2Signature: string = "0x";

    const order: Order = {
      maker: deployerWallet.address,
      inputToken: tokenIn,
      inputAmount: amountIn,
      outputToken: tokenOut,
      minAmountOut: "0",
      protocol: Protocol.UNISWAP_V2,
      maxSlippageBps: "50", //50%
      expiry: (Math.floor(Date.now() / 1000) + 3600).toString(),
      nonce: orderNonce,
    }
    const orderSignature: string  = "0x";

    const routeData: RouteData = {
      encodedPath: "0x",
      fee: "3000",
      isMultiHop: false
    }
    await executorContract.executeOrder(
      permit2Data,
      permit2Signature,
      order,
      orderSignature,
      routeData
    )

  } catch (error) {
    console.log(error);
  }
}

if (require.main === module) {
  executorInteraction().catch(console.error);
}
