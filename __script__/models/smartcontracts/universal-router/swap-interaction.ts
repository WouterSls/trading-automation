import { ethers, Wallet } from "ethers";
import { getHardhatWallet_1 } from "../../../../src/hooks/useSetup";
import { ChainType, getChainConfig, getOutputTokenAddress } from "../../../../src/config/chain-config";
import { UniversalRouter } from "../../../../src/models/smartcontracts/universal-router/UniversalRouter";
import { CommandType } from "../../../../src/models/smartcontracts/universal-router/universal-router-types";
import { OutputToken, SellTradeCreationDto } from "../../../../src/models/trading/types/_index";
import { decodeLogs } from "../../../../src/lib/utils";
import { getLowPoolKey } from "../../../../src/models/smartcontracts/uniswap-v4/uniswap-v4-utils";
import { createMinimalErc20 } from "../../../../src/models/smartcontracts/ERC/erc-utils";

export async function v4SwapInteraction(wallet: Wallet, tradeCreationDto: SellTradeCreationDto) {
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

  console.log(tradeCreationDto.inputToken);
  console.log(tradeCreationDto.outputToken);
  const outputTokenAddress = getOutputTokenAddress(chain, tradeCreationDto.outputToken);

  const poolKey = getLowPoolKey(tradeCreationDto.inputToken, outputTokenAddress);
  console.log(poolKey);
  const zeroForOne = poolKey.currency0 === tradeCreationDto.inputToken;
  const inputAmount = tradeCreationDto.inputAmount;
  const minOutputAmount = 0n;
  const recipient = wallet.address;

  const command: CommandType = CommandType.V4_SWAP;

  console.log("--------------------------------");
  console.log("V4 Swap Input Parameters:");
  console.log("--------------------------------");
  console.log("\tpoolKey:", poolKey);
  console.log("\tzeroForOne:", zeroForOne);
  console.log("\tinputAmount:", inputAmount.toString());
  console.log("\tminOutputAmount:", minOutputAmount.toString());
  console.log("\trecipient:", recipient);
  console.log("--------------------------------");
  console.log();

  const input = router.encodeV4SwapInput(poolKey, zeroForOne, inputAmount, minOutputAmount, recipient);
  console.log("Encoded V4 Swap Command Input");
  console.log("----------------------------------");
  console.log(input);
  console.log("----------------------------------");
  console.log();

  const deadline = Number(Math.floor(Date.now() / 1000) + 1200);
  const ethValue = "10";

  console.log("Trade request:");
  console.log(tradeCreationDto);
  console.log();

  console.log("Creating V4 swap execute transaction...");
  const tx = await router.createExecuteTransaction(command, [input], deadline);
  tx.value = ethers.parseEther(ethValue);
  console.log("--------------------------------");
  console.log("Transaction Request:");
  console.log("--------------------------------");
  console.log(tx);
  console.log("--------------------------------");

  const txResponse = await wallet.sendTransaction(tx);
  const txReceipt = await txResponse.wait();
  if (!txReceipt) {
    throw new Error("Transaction failed");
  }
  const logs = txReceipt.logs;
  console.log();
  const decodedLogs = decodeLogs(logs);
  console.log("decodedLogs:", decodedLogs);
}

if (require.main === module) {
  const wallet = getHardhatWallet_1();
  const chain = ChainType.ETH;

  const ethInputAmount = ethers.parseEther("1");

  const tradeCreationDto: SellTradeCreationDto = {
    chain: chain,
    inputToken: ethers.ZeroAddress,
    inputAmount: ethInputAmount.toString(),
    outputToken: OutputToken.USDC,
    tradingPointPrice: "0",
    tradeType: "SELL",
  };
  v4SwapInteraction(wallet, tradeCreationDto).catch(console.error);
}
