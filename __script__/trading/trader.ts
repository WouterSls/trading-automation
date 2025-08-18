import { ethers, Wallet } from "ethers";
import { ChainType, getChainConfig } from "../../src/config/chain-config";
import { getArbitrumWallet_1, getBaseWallet_1, getCoingeckoApi, getEthWallet_1 } from "../../src/hooks/useSetup";
import { TraderFactory } from "../../src/trading/TraderFactory";
import { InputAmountConstants, InputType, TradeConfirmation, TradeCreationDto } from "../../src/trading/types/_index";
import { ITradingStrategy } from "../../src/trading/ITradingStrategy";
import { displayTrade } from "../../src/lib/utils";

async function traderTest() {
  const geckoTerminalApi = getCoingeckoApi();
  const baseWallet = getBaseWallet_1();
  const arbWallet = getArbitrumWallet_1();
  const ethWallet = getEthWallet_1();

  const ethBalance = await baseWallet.provider?.getBalance(baseWallet.address)!;
  const blockNumber = await baseWallet.provider!.getBlockNumber();
  console.log("--------------------------------");
  console.log("Chain", "BASE");
  console.log("--------------------------------");
  console.log("Block:", blockNumber);
  console.log("Wallet Info:");
  console.log("\twallet address", baseWallet.address);
  console.log("\tETH balance", ethers.formatEther(ethBalance));
  console.log();

  const convoAddress = "0xab964f7b7b6391bd6c4e8512ef00d01f255d9c0d";
  const virutalAddress = "0x0b3e328455c4059eeb9e3f84b5543f74e24e7e1b";

  const trader = await TraderFactory.createTrader(baseWallet);
  const chain = trader.getChain();
  const chainConfig = getChainConfig(chain);

  const virtToEth: TradeCreationDto = {
    chain: ChainType.BASE,
    inputToken: virutalAddress,
    inputType: InputType.TOKEN,
    inputAmount: "10",
    outputToken: ethers.ZeroAddress,
  };

  const convoToEth: TradeCreationDto = {
    chain: ChainType.BASE,
    inputToken: convoAddress,
    inputType: InputType.TOKEN,
    inputAmount: "8,477.5",
    outputToken: ethers.ZeroAddress,
  };

  const quote = await trader.quote(virtToEth);
  console.log(quote);
}

if (require.main === module) {
  traderTest().catch(console.error);
}

async function strategyTest(trades: TradeCreationDto[], strat: ITradingStrategy, wallet: Wallet) {
  if (!strat) throw new Error("NO TRADING STRAT SUPPLIED");

  for (const trade of trades) {
    console.log();
    console.log("QUOTE");
    console.log("----------------");
    const quote = await strat.getQuote(trade, wallet);
    console.log(quote);
    console.log();

    continue;
    await strat.ensureTokenApproval(trade.inputToken, trade.inputAmount, wallet);

    console.log();
    console.log("TX");
    console.log("----------------");
    const tx = await strat.createTransaction(trade, wallet);
    console.log(tx);

    console.log("SENDING...");
    const response = await wallet.sendTransaction(tx);
    const receipt = await response.wait();

    if (!receipt || receipt!.status !== 1) {
      console.log("ERROR DURING TRANSACTION");
    } else {
      console.log("TRANSACTION CONFIRMED");
    }
  }
}
