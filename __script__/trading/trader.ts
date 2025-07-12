import { ethers } from "ethers";
import { ChainType, getChainConfig } from "../../src/config/chain-config";
import { getArbitrumWallet_1, getBaseWallet_1, getCoingeckoApi, getEthWallet_1 } from "../../src/hooks/useSetup";
import { TraderFactory } from "../../src/trading/TraderFactory";
import { InputType, TradeConfirmation, TradeCreationDto } from "../../src/trading/types/_index";

async function traderTest() {
  const geckoTerminalApi = getCoingeckoApi();
  const baseWallet = getBaseWallet_1();
  const arbWallet = getArbitrumWallet_1();
  const ethWallet = getEthWallet_1();

  const trader = await TraderFactory.createTrader(baseWallet);

  const ethBalance = await baseWallet.provider?.getBalance(baseWallet.address)!;
  const blockNumber = await baseWallet.provider!.getBlockNumber();
  const chain = trader.getChain();
  const chainConfig = getChainConfig(chain);

  console.log("--------------------------------");
  console.log("Chain", chain);
  console.log("--------------------------------");
  console.log("Block:", blockNumber);
  console.log("Wallet Info:");
  console.log("\twallet address", baseWallet.address);
  console.log("\tETH balance", ethers.formatEther(ethBalance));
  console.log();

  const convoAddress = "0xab964f7b7b6391bd6c4e8512ef00d01f255d9c0d";
  const trade: TradeCreationDto = {
    chain: ChainType.BASE,
    inputToken: convoAddress,
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
    console.log("\tStrategy", tradeConfirmation.strategy);
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
