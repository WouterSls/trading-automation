import { ethers, Wallet } from "ethers";
import { getHardhatWallet_1 } from "../../../src/hooks/useSetup";
import { ChainType, getChainConfig, getOutputTokenAddress } from "../../../src/config/chain-config";
import { UniversalRouter } from "../../../src/models/universal-router/UniversalRouter";
import { CommandType } from "../../../src/models/universal-router/universal-router-types";
import { TradeCreationDto } from "../../../src/api/trades/TradesController";
import { prepareV4SwapInput } from "../../../src/models/universal-router/universal-router-utils";
import { OutputToken } from "../../../src/lib/types";
import { createMinimalErc20, decodeLogs } from "../../../src/lib/utils";

export async function v4SwapInteraction(wallet: Wallet, tradeCreationDto: TradeCreationDto) {
  const chain: ChainType = tradeCreationDto.chain as ChainType;
  const chainConfig = getChainConfig(chain);

  const router = new UniversalRouter(chain);
  const usdcAddress = chainConfig.tokenAddresses.usdc;
  const wethAddress = chainConfig.tokenAddresses.weth;
  const usdc = await createMinimalErc20(usdcAddress, wallet.provider!);
  const weth = await createMinimalErc20(wethAddress, wallet.provider!);

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

  const { poolKey, zeroForOne } = await prepareV4SwapInput(tradeCreationDto);
  const inputAmount = tradeCreationDto.rawInputAmount;
  const minOutputAmount = 0n;
  const recipient = wallet.address;

  const command: CommandType = CommandType.V4_SWAP;
  const input = router.encodeV4SwapInput(poolKey, zeroForOne, inputAmount, minOutputAmount, recipient);

  const deadline = Number(Math.floor(Date.now() / 1000) + 1200);
  const ethValue = "10";

  console.log("Trade request:");
  console.log(tradeCreationDto);
  console.log();

  console.log("Creating V4 swap execute transaction...");
  const tx = await router.createExecuteTransaction(wallet, command, [input], deadline);
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

  const ethInputAmount = ethers.parseEther("1");

  const tradeCreationDto1: TradeCreationDto = {
    // Equivalent to getHardhatWallet_1()
    wallet: {
      rpcUrl: process.env.HARDHAT_RPC_URL,
      privateKey: process.env.HARDHAT_PRIVATE_KEY_1,
    },
    chain: chain,
    inputToken: ethers.ZeroAddress,
    rawInputAmount: ethInputAmount.toString(),
    outputToken: OutputToken.USDC,
  };
  v4SwapInteraction(wallet, tradeCreationDto1).catch(console.error);
}
