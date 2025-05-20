import { ethers, Wallet } from "ethers";
import { getHardhatWallet_1 } from "../../../src/hooks/useSetup";
import { ChainType, getChainConfig } from "../../../src/config/chain-config";
import { UniversalRouter } from "../../../src/models/blockchain/universal-router/UniversalRouter";
import { CommandType } from "../../../src/models/blockchain/universal-router/universal-router-types";
import { TradeCreationDto } from "../../../src/api/trades/TradesController";
import { OutputToken } from "../../../src/models/trading/types/OutputToken";
import { createMinimalErc20, decodeLogs } from "../../../src/lib/utils";
import { getLowPoolKey } from "../../../src/models/blockchain/uniswap-v4/uniswap-v4-utils";

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

  const poolKey = getLowPoolKey(tradeCreationDto.inputToken, tradeCreationDto.outputToken);
  const zeroForOne = poolKey.currency0 === tradeCreationDto.inputToken;
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

  const tradeCreationDto: TradeCreationDto = {
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
  v4SwapInteraction(wallet, tradeCreationDto).catch(console.error);
}
