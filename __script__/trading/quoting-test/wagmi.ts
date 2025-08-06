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
  const tradeToUsdc: TradeCreationDto = {
    chain: ChainType.ETH,  // Fixed: Use ETH instead of BASE
    inputToken: wamgiAddress,
    inputType: InputType.TOKEN,
    inputAmount: "1702000",  // Increased amount for better liquidity
    outputToken: chainConfig.tokenAddresses.usdc,
  };

  const tradeToEth: TradeCreationDto = {
    chain: ChainType.ETH,  // Fixed: Use ETH instead of BASE
    inputToken: wamgiAddress,
    inputType: InputType.TOKEN,
    inputAmount: "1702000",  // Increased amount for better liquidity
    outputToken: ethers.ZeroAddress,
  };

  const trade = tradeToUsdc;  // Switch to test USDC routing

  const liveUsdPrice = await geckoTerminalApi.getTokenUsdPrice(chain, trade.inputToken);
  console.log("Live USD Price:");
  console.log(`$${liveUsdPrice}`);
  console.log();
  const numberLivePrice = Number(liveUsdPrice);
  if (isNaN(numberLivePrice)) throw new Error("Live usd price is not a number");

  console.log("INPUT TOKEN:")
  console.log("------------------")
  console.log(trade.inputToken)
  console.log()

  console.log("OUPUT TOKEN:")
  console.log("------------------")
  console.log(trade.outputToken)
  console.log()

  console.log("TRADE AMOUNT:")
  console.log("------------------")
  console.log(trade.inputAmount);
  console.log()

  const quote = await trader.quote(trade);
  console.log("QUOTE")
  console.log("------------------")
  console.log(quote);
  console.log()
}


if (require.main === module) {
  traderTest().catch(console.error);
}

