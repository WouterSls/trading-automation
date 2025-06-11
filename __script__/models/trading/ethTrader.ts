import { ethers, Wallet } from "ethers";
import {
  BuyTradeCreationDto,
  InputType,
  OutputToken,
  SellTradeCreationDto,
} from "../../../src/models/trading/types/_index";
import { getEthWallet_1, getHardhatWallet_1 } from "../../../src/hooks/useSetup";
import { ChainType, getChainConfig } from "../../../src/config/chain-config";
import { createMinimalErc20 } from "../../../src/models/smartcontracts/ERC/erc-utils";
import { UniswapV4Strategy } from "../../../src/models/trading/strategies/UniswapV4Strategy";
import { TraderFactory } from "../../../src/models/trading/TraderFactory";

async function uniswapV4StrategyInteraction(chain: ChainType, wallet: Wallet) {
  const chainConfig = getChainConfig(chain);

  const blockNumber = await wallet.provider!.getBlockNumber();

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
  console.log("Block:", blockNumber);
  console.log("Wallet Info:");
  console.log("\twallet address", wallet.address);
  console.log("\tETH balance", ethers.formatEther(ethBalance));
  console.log(`\t${usdc.getSymbol()} balance: ${usdcBalance}`);
  console.log(`\t${weth.getSymbol()} balance: ${wethBalance}`);
  console.log();

  const inputType = InputType.ETH;
  const tokenA = ethers.ZeroAddress;
  const amountA = "1";

  const tokenB = chainConfig.tokenAddresses.usdc;
  const amountB = "100";
  const outputToken = OutputToken.ETH;
  const tpPrice = "1";

  const buyTrade: BuyTradeCreationDto = {
    tradeType: "BUY",
    chain: chain,
    inputType: inputType,
    inputToken: tokenA,
    inputAmount: amountA.toString(),
    outputToken: tokenB,
  };

  const sellTrade: SellTradeCreationDto = {
    tradeType: "SELL",
    chain: chain,
    inputToken: tokenB,
    inputAmount: amountB.toString(),
    outputToken: outputToken,
    tradingPointPrice: tpPrice,
  };

  console.log("--------------------------------");
  console.log("Trades");
  console.log("--------------------------------");
  console.log("Buy Trade:");
  console.log("\tToken:", buyTrade.outputToken);
  console.log("\tInput type:", buyTrade.inputType);
  console.log("\tInput token: ", buyTrade.inputToken);
  console.log("\tInput amount:", buyTrade.inputAmount);
  console.log();

  const trader = await TraderFactory.createTrader(wallet);
  const strategies = trader.getStrategies();
  for (const strat of strategies) {
    console.log(strat.getName());
    const price = await strat.getEthUsdcPrice(wallet);
    console.log(`\tETH/USDC: ${price}`);
    const quote = await strat.getBuyTradeQuote(wallet, buyTrade);
    console.log("\tQuote");
    console.log("\t Output amount:", quote.outputAmount);
    console.log("\t Route:", quote.route);
  }
}

if (require.main === module) {
  const chain = ChainType.ETH;
  const chainConfig = getChainConfig(chain);
  const wallet = getHardhatWallet_1();
  //const wallet = getEthWallet_1();

  uniswapV4StrategyInteraction(chain, wallet).catch(console.error);
}
