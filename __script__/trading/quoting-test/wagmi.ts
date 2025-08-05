import { ethers } from "ethers";
import { ChainType, getChainConfig } from "../../../src/config/chain-config";
import { getArbitrumWallet_1, getBaseWallet_1, getCoingeckoApi, getEthWallet_1 } from "../../../src/hooks/useSetup";
import { InputType, TradeConfirmation, TradeCreationDto } from "../../../src/trading/types/_index";
import { TraderFactory } from "../../../src/trading/TraderFactory";

async function traderTest() {
  const geckoTerminalApi = getCoingeckoApi();
  const ethWallet = getEthWallet_1();

  const trader = await TraderFactory.createTrader(ethWallet);

  const chain = trader.getChain();
  const chainConfig = getChainConfig(chain);

  const blockNumber = await ethWallet.provider?.getBlockNumber();
  const ethBalance = await ethWallet.provider?.getBalance(ethWallet.address)!;

  console.log("--------------------------------");
  console.log("Chain", chain);
  console.log("--------------------------------");
  console.log("Block:", blockNumber);
  console.log("Wallet Info:");
  console.log("\twallet address", ethWallet.address);
  console.log("\tETH balance", ethers.formatEther(ethBalance));
  console.log();

  const wamgiAddress = "0x92cc36d66e9d739d50673d1f27929a371fb83a67";
  const trade: TradeCreationDto = {
    chain: ChainType.BASE,
    inputToken: wamgiAddress,
    inputType: InputType.TOKEN,
    inputAmount: "1450.56",
    outputToken: chainConfig.tokenAddresses.usdc,
  };

  const liveUsdPrice = await geckoTerminalApi.getTokenUsdPrice(chain, trade.inputToken);
  console.log("Live USD Price:");
  console.log(`$${liveUsdPrice}`);
  console.log();
  const numberLivePrice = Number(liveUsdPrice);
  if (isNaN(numberLivePrice)) throw new Error("Live usd price is not a number");

  const sellPrice = 0.11;
  console.log("Sell Price:");
  console.log(`$${sellPrice}`);
  if (numberLivePrice > sellPrice) {
    const tradeConfirmation: TradeConfirmation = await trader.trade(trade);
    console.log("--------------------------------");
    console.log("Trade Confirmation");
    console.log("--------------------------------");
    console.log("\tStrategy", tradeConfirmation.quote.strategy);
    console.log("\tETH Spent:", tradeConfirmation.ethSpentFormatted);
    console.log("\tGas Spent:", tradeConfirmation.gasCost);
    console.log("\tTokens Spent:", tradeConfirmation.tokensSpentFormatted);
    console.log("\tTokens Received:", tradeConfirmation.tokensReceivedFormatted);
    console.log("\tTransaction Hash:", tradeConfirmation.transactionHash);
    console.log();
  }
}

if (require.main === module) {
  traderTest().catch(console.error);
}

