import { Contract, ethers, EtherSymbol, TransactionReceipt, Wallet } from "ethers";
import { getHardhatWallet_1, getHardhatWallet_2, getHardhatWallet_3 } from "../../src/hooks/useSetup";
import { createDomain, SignedOrder, Protocol, RouteData } from "../../src/lib/generated-solidity-types";
import { decodeError } from "../../src/lib/decoding-utils";
import { ChainType, mapNetworkNameToChainType } from "../../src/config/chain-config";
import { OrderRelayer } from "../../src/trading/executor/OrderRelayer";
import { OrderCreator } from "../../src/trading/executor/OrderCreator";
import { ERC20 } from "../../src/smartcontracts/ERC/ERC20";
import { createMinimalErc20 } from "../../src/smartcontracts/ERC/erc-utils";
import { Permit2 } from "../../src/smartcontracts/permit2/Permit2";
import { PermitTransferFrom } from "../../src/smartcontracts/permit2/permit2-types";
import { Executor } from "../../src/smartcontracts/executor/Executor";
import { InputType, Route, TradeCreationDto } from "../../src/trading/types/_index";
import { RouteOptimizer } from "../../src/routing/RouteOptimizer";

async function executorInteraction() {
  // ETH FORK
  //const EXECUTOR_ADDRESS = "0xE72B348bCA4DAAD3d8886342557d581B50Bf3971";
  //const DEPLOYED_MOCK_A = "0x21A21fa613917600e9dDE4441920562bB6238DaE"
  //const DEPLOYED_MOCK_B = "0x3eEAEf0dddbda233651dc839591b992795Ba7168";
  // LOCAL
  const EXECUTOR_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const DEPLOYED_MOCK_A = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
  const DEPLOYED_MOCK_B = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
  //const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
  const PERMIT2_ADDRESS = "0xBE05d211eD3fd34A1624060419358AA073957faC";

  const deployer: Wallet = getHardhatWallet_1();
  const user: Wallet = getHardhatWallet_2();
  const paymaster: Wallet = getHardhatWallet_3();
  const provider = user.provider;
  const network = await user.provider?.getNetwork();
  if (!provider || !network) throw new Error("PROVIDER ERROR");
  let chainId = network.chainId;
  let networkName = network.name;
  const chainType = ChainType.ETH;

  console.log("EXECUTOR CONTRACT TESTING");
  console.log("===============================");
  console.log("chainId", chainId);
  console.log("network name", networkName);
  console.log("ChainType", chainType);
  console.log();

  const executor: Executor = new Executor(Number(chainId), EXECUTOR_ADDRESS);
  const creator: OrderCreator = new OrderCreator(Number(chainId), EXECUTOR_ADDRESS, PERMIT2_ADDRESS);
  const relayer: OrderRelayer = new OrderRelayer();
  const tokenA: ERC20 | null = await createMinimalErc20(DEPLOYED_MOCK_A, deployer.provider!);
  const tokenB: ERC20 | null = await createMinimalErc20(DEPLOYED_MOCK_B, deployer.provider!);

  if (!tokenA || !tokenB) {
    throw new Error(`No Mock ERC20's created at addresses: \nA: ${DEPLOYED_MOCK_A}\nB: ${DEPLOYED_MOCK_B}`);
  }

  const deployerBalance = await tokenA.getFormattedTokenBalance(deployer.address);
  const userBalance = await tokenA.getFormattedTokenBalance(user.address);
  const executorBalance = await tokenA.getFormattedTokenBalance(EXECUTOR_ADDRESS);

  const permit2Address = await executor.getPermit2(deployer);
  console.log("TOKEN A:", tokenA.getTokenAddress());
  console.log("PERMIT2:", permit2Address);
  console.log("EXECUTOR:", tokenA.getTokenAddress());
  console.log();
  console.log("DEPLOYER BALANCE\tUSER BALANCE\tEXECUTOR BALANCE");
  console.log(`${deployerBalance}\t\t\t${userBalance}\t\t\t${executorBalance}`);
  console.log();

  // await mintTokens(deployerWallet, tokenA.getTokenAddress());

  // WE NEED TO APPROVE PERMIT2 CONTRACT -> TransferFrom is failing most likely
  //await approvePermit2(deployerWallet, tokenA, PERMIT2_ADDRESS);

  /**
   * TRADE PARAMETER
   */
  const trade: TradeCreationDto = {
    chain: ChainType.ETH, //LOCAL
    inputType: InputType.TOKEN,
    inputToken: tokenA.getTokenAddress(),
    inputAmount: "10",
    outputToken: tokenB.getTokenAddress(),
  };
  const amountIn: bigint = ethers.parseUnits(trade.inputAmount, tokenA.getDecimals());
  const amountOutMin: bigint = 0n;
  const expiry: string = (Math.floor(Date.now() / 1000) + 3600).toString();

  const to: string = EXECUTOR_ADDRESS;

  // can let permit2 transfer tokens without order
  const signedPermitData = await creator.createSignedPermitData(user, trade.inputToken, amountIn, expiry, to);
  const signedOrder = await creator.createSignedOrder(user, trade.inputToken, amountIn, trade.outputToken);

  //const routeOptimizer = new RouteOptimizer(trade.chain);
  //const bestRoute: Route = await routeOptimizer.getBestRoute(trade.inputToken, amountIn, trade.outputToken, user);

  const routeData: RouteData = {
    protocol: Protocol.UNISWAP_V2,
    path: [trade.inputToken, trade.outputToken],
    fee: "3000",
    isMultiHop: false,
    encodedPath: "0x",
  };

  return;

  /**
   * EXECUTION
   */

  try {
    await relayer.execute(signedPermitData, signedOrder, routeData, EXECUTOR_ADDRESS, paymaster);
  } catch (error) {
    const decoded = decodeError(error);
    if (decoded.type == "Decoded") {
      console.log("Decoded Error:", decoded);
    } else {
      console.log(error);
    }
  }
}

async function abiEncoderTest() {
  const defaultEncoder = ethers.AbiCoder.defaultAbiCoder();

  const withBigint = defaultEncoder.encode(["uint256"], [1890809809n]);
  const withString = defaultEncoder.encode(["uint256"], ["1890809809"]);

  console.log("BINGINT");
  console.log(withBigint);
  console.log("STRING");
  console.log(withString);
}

async function mintTokens(wallet: Wallet, tokenAddress: string) {
  const encoder = ethers.AbiCoder.defaultAbiCoder();
  const selector = ethers.id("mint(address,uint256)").slice(0, 10); // 0x40c10f19
  const args = encoder.encode(["address", "uint256"], [wallet.address, ethers.parseUnits("1000", 18)]);
  const callData = ethers.concat([selector, args]);

  const txResponse = await wallet.sendTransaction({ to: tokenAddress, data: callData });
  const txReceipt = await txResponse.wait();

  if (!txReceipt && txReceipt!.status != 1) {
    throw new Error("Transaction failed");
  }
  console.log("Transaction success");
}

async function approvePermit2(wallet: Wallet, token: ERC20, permit2Address: string) {
  const approveTx = await token.createApproveTransaction(permit2Address, ethers.MaxInt256);
  const txReponse = await wallet.sendTransaction(approveTx);
  const txReceipt = await txReponse.wait();
  if (!txReceipt && txReceipt!.status != 1) {
    throw new Error("Permit2 Approval Error");
  }
  console.log("Approval success");
}

if (require.main === module) {
  //abiEncoderTest().catch(console.error);
  executorInteraction().catch(console.error);
}
