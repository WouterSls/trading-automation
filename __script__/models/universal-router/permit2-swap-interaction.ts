import { ethers, Wallet } from "ethers";
import { getHardhatWallet_1 } from "../../../src/hooks/useSetup";
import { ChainType, getChainConfig, getOutputTokenAddress } from "../../../src/config/chain-config";
import { UniversalRouter } from "../../../src/models/universal-router/UniversalRouter";
import { CommandType } from "../../../src/models/universal-router/universal-router-types";
import { TradeCreationDto } from "../../../src/api/trades/TradesController";
import { OutputToken } from "../../../src/lib/types";
import { createMinimalErc20, decodeLogs } from "../../../src/lib/utils";
import { UniswapV2Router } from "../../../src/models/uniswap-v2/UniswapV2Router";
import { getLowPoolKey } from "../../../src/models/uniswap-v4/uniswap-v4-utils";
import { PERMIT2_INTERFACE } from "../../../src/contract-abis/permit2";

export async function v4SwapInteraction(wallet: Wallet, tradeCreationDto: TradeCreationDto) {
  const chain: ChainType = tradeCreationDto.chain as ChainType;
  const chainConfig = getChainConfig(chain);
  const outputTokenAddress = getOutputTokenAddress(chain, tradeCreationDto.outputToken as OutputToken);

  const router = new UniversalRouter(chain);
  const v2Router = new UniswapV2Router(chain);

  const usdcAddress = chainConfig.tokenAddresses.usdc;
  const wethAddress = chainConfig.tokenAddresses.weth;
  const usdc = await createMinimalErc20(usdcAddress, wallet.provider!);
  const weth = await createMinimalErc20(wethAddress, wallet.provider!);

  //console.log("Swapping ETH for USDC...");
  //await v2Router.swapEthInUsdForToken(wallet, usdc, 200);

  const usdcBalance = await usdc.getFormattedTokenBalance(wallet.address);
  const wethBalance = await weth.getFormattedTokenBalance(wallet.address);
  const ethBalance = await wallet.provider!.getBalance(wallet.address);

  console.log("--------------------------------");
  console.log("Chain", chain);
  console.log("--------------------------------");
  console.log("Wallet Info:");
  console.log("\twallet address", wallet.address);
  console.log("\tETH balance", ethers.formatEther(ethBalance));
  console.log(`\t${usdc.getSymbol()} balance: ${usdcBalance}`);
  console.log(`\t${weth.getSymbol()} balance: ${wethBalance}`);
  console.log();

  const poolKey = getLowPoolKey(tradeCreationDto.inputToken, outputTokenAddress);
  const zeroForOne = poolKey.currency0 === tradeCreationDto.inputToken;
  const inputAmount = tradeCreationDto.rawInputAmount;
  const minOutputAmount = 0n;
  const recipient = wallet.address;

  console.log("Checking Permit2 allowance...");
  const permit2Address = chainConfig.uniswap.permit2Address;
  const permit2Allowance = await usdc.getRawAllowance(wallet.address, permit2Address);
  console.log(`Permit2 allowance: ${permit2Allowance}`);

  if (permit2Allowance < inputAmount) {
    console.log(`Permit2 allowance is insufficient for trade amount ${inputAmount}`);
    console.log(`Approving Permit2...`);
    const approveTx = await usdc.createApproveTransaction(permit2Address, ethers.MaxUint256);
    const approveTxResponse = await wallet.sendTransaction(approveTx);
    const approveTxReceipt = await approveTxResponse.wait();
    if (!approveTxReceipt) {
      throw new Error("Transaction failed");
    }
    console.log("Approved!");
  }

  const swapCommand: CommandType = CommandType.V4_SWAP;
  const permitCommand: CommandType = CommandType.PERMIT2_PERMIT;
  const commands = ethers.concat([swapCommand, permitCommand]);
  console.log("commands:", commands);

  const permit2 = new ethers.Contract(permit2Address, PERMIT2_INTERFACE, wallet);
  const universalRouterAddress = router.getRouterAddress();
  console.log("wallet.address:", wallet.address);
  console.log("usdcAddress:", usdcAddress);
  console.log("universalRouterAddress:", universalRouterAddress);
  const [allowance, expiration, nonce] = await permit2.allowance(wallet.address, usdcAddress, universalRouterAddress);
  console.log("allowance:", allowance);
  console.log("expiration:", expiration);
  console.log("nonce:", nonce);

  throw new Error("Stop");

  const permitInput = encodePermitInput(permitSingle);
  const swapInput = router.encodeV4SwapInput(poolKey, zeroForOne, inputAmount, minOutputAmount, recipient);

  const deadline = Number(Math.floor(Date.now() / 1000) + 1200);
  const ethValue = "10";

  console.log("Trade request:");
  console.log(tradeCreationDto);
  console.log();

  console.log("Creating V4 swap execute transaction...");
  const tx = await router.createExecuteTransaction(wallet, commands, [input], deadline);
  tx.value = ethers.parseEther(ethValue);
  console.log("Transaction request:");
  console.log(tx);

  const txResponse = await wallet.sendTransaction(tx);
  console.log("txResponse:", txResponse);
  const txReceipt = await txResponse.wait();
  if (!txReceipt) {
    throw new Error("Transaction failed");
  }
  console.log("txReceipt:", txReceipt);
  const logs = txReceipt.logs;
  console.log("logs:", logs);
  console.log();
  console.log("Decoding logs...");
  const decodedLogs = decodeLogs(logs);
  console.log("decodedLogs:", decodedLogs);
}

if (require.main === module) {
  const wallet = getHardhatWallet_1();
  const chain = ChainType.ETH;
  const chainConfig = getChainConfig(chain);
  const usdcAddress = chainConfig.tokenAddresses.usdc;

  const usdcInputAmount = ethers.parseUnits("1000", 6);

  const tradeCreationDto: TradeCreationDto = {
    // Equivalent to getHardhatWallet_1()
    wallet: {
      rpcUrl: process.env.HARDHAT_RPC_URL,
      privateKey: process.env.HARDHAT_PRIVATE_KEY_1,
    },
    chain: chain,
    inputToken: usdcAddress,
    rawInputAmount: usdcInputAmount.toString(),
    outputToken: OutputToken.ETH,
  };
  v4SwapInteraction(wallet, tradeCreationDto).catch(console.error);
}
