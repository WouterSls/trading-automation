import { ethers, TransactionRequest, Wallet } from "ethers";
import { ChainType, getChainConfig } from "../../../src/config/chain-config";
import { InputType, TradeCreationDto } from "../../../src/trading/types/_index";
import { UniswapV3Strategy } from "../../../src/trading/strategies/UniswapV3Strategy";
import { getEthWallet_1, getHardhatWallet_1 } from "../../../src/hooks/useSetup";
import { ERC20_INTERFACE } from "../../../src/lib/smartcontract-abis/erc20";
import { decodeLogs, displayTokenBalance } from "../../../src/lib/utils";

async function uniswapV3StrategyInteraction() {
  const chain = ChainType.ETH;
  const chainConfig = getChainConfig(chain);

  //const ethWallet = getEthWallet_1();
  const wallet = getHardhatWallet_1();

  const blockNumber = await wallet.provider!.getBlockNumber();
  const ethBalance = await wallet.provider!.getBalance(wallet.address);

  console.log("--------------------------------");
  console.log("Chain", chain);
  console.log("--------------------------------");
  console.log("Block:", blockNumber);
  console.log("Wallet Info:");
  console.log("\twallet address", wallet.address);
  console.log("\tETH balance", ethers.formatEther(ethBalance));

  console.log();
  const PEPE_ADDRESS = "0x6982508145454Ce325dDbE47a25d4ec3d2311933";
  const WBTC_ADDRESS = chainConfig.tokenAddresses.wbtc;
  console.log("Balance info:");
  await displayTokenBalance(PEPE_ADDRESS, wallet);
  await displayTokenBalance(WBTC_ADDRESS, wallet);

  const ethToPepeTrade: TradeCreationDto = {
    chain: chain,
    inputType: InputType.USD,
    inputToken: ethers.ZeroAddress,
    inputAmount: "200",
    outputToken: PEPE_ADDRESS,
  };

  const pepeToWbtcTrade: TradeCreationDto = {
    chain: chain,
    inputType: InputType.TOKEN,
    inputToken: PEPE_ADDRESS,
    inputAmount: "20000",
    outputToken: WBTC_ADDRESS,
  };

  return;
  const strategy = new UniswapV3Strategy(`Uniswap V3 - ${chain}`, chain);

  console.log("TRADE:");
  console.log("--------------------");
  console.log(JSON.stringify(pepeToWbtcTrade, null, 2));
  console.log();

  await strategy.ensureTokenApproval(pepeToWbtcTrade.inputToken, pepeToWbtcTrade.inputAmount, wallet);

  console.log("GETTING QUOTE...");
  const quote = await strategy.getQuote(pepeToWbtcTrade, wallet);
  console.log(quote);

  console.log("CREATING TRANSACTION...");
  const tradeTx = await strategy.createTransaction(pepeToWbtcTrade, wallet);
  console.log(tradeTx);
  console.log("SENDING TRANSACTION");
  const txResponse = await wallet.sendTransaction(tradeTx);
  const txReceipt = await txResponse.wait();
  if (!txReceipt) throw new Error("TRANSACTION FAILED");
  console.log("TRANSACTION SUCCES!");

  console.log("DECODING LOGS...");
  //const decodedLogs = decodeLogs(txReceipt.logs);
  //console.log(decodedLogs);
}

if (require.main === module) {
  uniswapV3StrategyInteraction();
}
