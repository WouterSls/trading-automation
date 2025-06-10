import { ethers, Wallet } from "ethers";
import {
  BuyTradeCreationDto,
  InputType,
  OutputToken,
  SellTradeCreationDto,
} from "../../../../src/models/trading/types/_index";
import { getEthWallet_1, getHardhatWallet_1 } from "../../../../src/hooks/useSetup";
import { ChainType, getChainConfig } from "../../../../src/config/chain-config";
import { createMinimalErc20 } from "../../../../src/models/smartcontracts/ERC/erc-utils";
import { UniswapV3Strategy } from "../../../../src/models/trading/strategies/UniswapV3Strategy";

async function uniswapV3StrategyInteraction(
  chain: ChainType,
  wallet: Wallet,
  buyTrade?: BuyTradeCreationDto,
  sellTrade?: SellTradeCreationDto,
) {
  const chainConfig = getChainConfig(chain);

  const strat = new UniswapV3Strategy(`UniswapV3-${chain}`, chain);

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

  const ethUsdcPrice = await strat.getEthUsdcPrice(wallet);
  console.log("Strat:", strat.getName());
  console.log("ETH/USDC price:", ethUsdcPrice);
  console.log();
  /**
  console.log("quoting trade...");
  console.log("Input type: ", buyTrade?.inputType);
  console.log("Input token: ", buyTrade?.inputToken);
  console.log("Input amount: ", buyTrade?.inputAmount);
  const buyQuote = await strat.getBuyTradeQuote(wallet, buyTrade!);
  console.log();
  console.log("Buy Quote:", JSON.stringify(buyQuote, null, 2));
  console.log("buying token...");
  const buyTx = await strat.createBuyTransaction(wallet, buyTrade!);
  console.log("Buy Transaction:");
  console.log(buyTx);
  console.log("sending transaction...");
  await wallet.sendTransaction(buyTx);
  console.log("transaction sent!");
 */
}

if (require.main === module) {
  const chain = ChainType.ETH;
  const chainConfig = getChainConfig(chain);
  const wallet = getHardhatWallet_1();
  //const ethWallet = getEthWallet_1();

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

  uniswapV3StrategyInteraction(chain, wallet, buyTrade, sellTrade).catch(console.error);
}
