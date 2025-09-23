import { Contract, ethers, Wallet } from "ethers";
import { getHardhatWallet_1 } from "../../../src/hooks/useSetup";
import { createDomain, SignedOrder, Protocol, RouteData } from "../../../src/lib/generated-solidity-types";
import { decodeError } from "../../../src/lib/decoding-utils";
import { ChainType, mapNetworkNameToChainType } from "../../../src/config/chain-config";
import { Executor } from "../../../src/smartcontracts/executor/Executor";
import { ERC20 } from "../../../src/smartcontracts/ERC/ERC20";
import { createMinimalErc20 } from "../../../src/smartcontracts/ERC/erc-utils";

async function executorInteraction() {
  const EXECUTOR_ADDRESS = "0xE72B348bCA4DAAD3d8886342557d581B50Bf3971";
  const DEPLOYED_MOCK_A = "0x21A21fa613917600e9dDE4441920562bB6238DaE"
  const DEPLOYED_MOCK_B = "0x3eEAEf0dddbda233651dc839591b992795Ba7168";

  const deployerWallet = getHardhatWallet_1();
  const provider = deployerWallet.provider;
  const network = await deployerWallet.provider?.getNetwork();
  if (!provider || !network) throw new Error("PROVIDER ERROR");
  let chainId = network.chainId;
  let networkName = network.name;
  if (chainId === 31337n) {
    chainId = 1n;
    networkName = "ethereum";
  }
  const chainType = mapNetworkNameToChainType(networkName);

  console.log("EXECUTOR CONTRACT TESTING");
  console.log("===============================");
  console.log("ChainType", chainType);
  console.log("chainId", chainId);
  console.log();

  const executor: Executor = new Executor(chainType as ChainType, EXECUTOR_ADDRESS);
  const tokenA: ERC20 | null = await createMinimalErc20(DEPLOYED_MOCK_A, deployerWallet.provider!);
  const tokenB: ERC20 | null = await createMinimalErc20(DEPLOYED_MOCK_B, deployerWallet.provider!);

  if (!tokenA || !tokenB) {
    throw new Error(`No Mock ERC20's created at addresses: \nA: ${DEPLOYED_MOCK_A}\nB: ${DEPLOYED_MOCK_B}`)
  }

  /**
   * TRADE PARAMETERS
   */
  const signer: Wallet = deployerWallet;
  const tokenIn: string = tokenA.getTokenAddress();
  const amountIn: string = ethers.parseUnits("100", tokenA.getDecimals()).toString();
  const expiry: string = (Math.floor(Date.now() / 1000) + 3600).toString();
  const to: string = EXECUTOR_ADDRESS;

  /**
   * SIGNED PERMIT DATA
   */
  console.log("SIGNED PERMIT DATA")
  console.log("===============================");
  const signedPermitData = await executor.createSignedPermitData(signer, tokenIn, amountIn, expiry, to);
  console.log(signedPermitData);
  console.log();


  /**
   * SIGNED ORDER
   */
  //const domain = createDomain(Number(chainId), EXECUTOR_ADDRESS);
  //console.log("Domain used for signing:", domain);

  const orderNonce = "1" // executor.getOrderNonce(); | usedNonce(address, nonce) == false;
  const tokenOut: string = tokenB.getTokenAddress();

  const signedOrder: SignedOrder = {
    maker: deployerWallet.address,
    inputToken: tokenIn,
    inputAmount: amountIn,
    outputToken: tokenOut,
    minAmountOut: "1", // throw errors on zeroAmount -> should always be calculated
    protocol: Protocol.UNISWAP_V2,
    maxSlippageBps: "50", //50%
    expiry: (Math.floor(Date.now() / 1000) + 3600).toString(),
    nonce: orderNonce,
    signature: "0x",
  }

  console.log("SIGNED ORDER")
  console.log("===============================");
  console.log(signedOrder);
  console.log()

  const routeData: RouteData = {
    encodedPath: "0x",
    fee: "3000",
    isMultiHop: false
  }
  console.log("ROUTE DATA")
  console.log("===============================");
  console.log(routeData);
  console.log()

  /**
   * EXECUTION
   */
  const relayer: Wallet = deployerWallet;

  try {
    await executor.execute(
      signedPermitData,
      signedOrder,
      routeData,
      relayer
    )
  } catch (error) {
    const decoded = decodeError(error);
    if (decoded.type == "Decoded") {
      console.log("Decoded Error:", decoded);
    } else {
      console.log(error)
    }
  }
}

if (require.main === module) {
  executorInteraction().catch(console.error);
}
