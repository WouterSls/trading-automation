import { ethers, Wallet } from "ethers";
import {
  BuyTradeCreationDto,
  InputType,
  OutputToken,
  SellTradeCreationDto,
} from "../../../../src/models/trading/types/_index";
import { getEthWallet_1, getHardhatWallet_1 } from "../../../../src/hooks/useSetup";
import { ChainType, getChainConfig } from "../../../../src/config/chain-config";
import { createMinimalErc20 } from "../../../../src/models/blockchain/ERC/erc-utils";
import { UniswapV4Strategy } from "../../../../src/models/trading/strategies/UniswapV4Strategy";

async function uniswapV4StrategyInteraction(
  chain: ChainType,
  wallet: Wallet,
  buyTrade?: BuyTradeCreationDto,
  sellTrade?: SellTradeCreationDto,
) {
  const chainConfig = getChainConfig(chain);

  const strat = new UniswapV4Strategy(`UniswapV4-${chain}`, chain);

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

  console.log("Buy Trade:", JSON.stringify(buyTrade, null, 2));
  console.log();

  const ethUsdcPrice = await strat.getEthUsdcPrice(wallet);
  console.log("Strat:", strat.getName());
  console.log("ETH/USDC price:", ethUsdcPrice);
}

if (require.main === module) {
  const chain = ChainType.ETH;
  const chainConfig = getChainConfig(chain);
  //const wallet = getHardhatWallet_1();
  const ethWallet = getEthWallet_1();

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

  uniswapV4StrategyInteraction(chain, ethWallet, buyTrade, sellTrade).catch(console.error);
}

