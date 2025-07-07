import { ethers, Wallet } from "ethers";
import { getBaseWallet_1, getCoingeckoApi, getHardhatWallet_1, getTheGraphApi } from "../../src/hooks/useSetup";
import { createMinimalErc20 } from "../../src/smartcontracts/ERC/erc-utils";
import { TraderFactory } from "../../src/trading/TraderFactory";
import { GeckoTerminalApi } from "../../src/external-apis/GeckoTerminalApi";
import { ChainType, getChainConfig } from "../../src/config/chain-config";
import { InputType, TradeCreationDto } from "../../src/trading/types/_index";
import { ITradingStrategy } from "../../src/trading/ITradingStrategy";
import { encodePath, FeeAmount, UniswapV3QuoterV2 } from "../../src/smartcontracts/uniswap-v3";
import { TheGraphApi } from "../../src/external-apis/TheGraphApi";
import { displayTrade, validateNetwork } from "../../src/lib/utils";

// Define types for trade paths
interface SingleHopPath {
  type: "single";
  tokenIn: string;
  tokenOut: string;
  fee: FeeAmount;
  poolAddress: string;
}

interface MultiHopPath {
  type: "multi";
  path: string[];
  fees: FeeAmount[];
  encodedPath: string;
  poolAddress: string; // The pool that connects to the intermediate token
}

type TradePath = SingleHopPath | MultiHopPath;

interface TradePathResult {
  inputToken: string;
  inputTokenSymbol: string;
  paths: TradePath[];
}

const GAME_ADDRESS = "0x1c4cca7c5db003824208adda61bd749e55f463a3";

async function baseTraderInteraction(wallet: Wallet) {
  const chain = ChainType.BASE;

  await validateNetwork(wallet, chain);

  const chainConfig = getChainConfig(chain);

  const graphApi = getTheGraphApi();
  const geckoTerminalApi = getCoingeckoApi();

  const blockNumber = await wallet.provider!.getBlockNumber();

  const usdcAddress = chainConfig.tokenAddresses.usdc;
  const wethAddress = chainConfig.tokenAddresses.weth;
  const aeroAddress = chainConfig.tokenAddresses.aero;

  const usdc = await createMinimalErc20(usdcAddress, wallet.provider!);
  const weth = await createMinimalErc20(wethAddress, wallet.provider!);
  const game = await createMinimalErc20(GAME_ADDRESS, wallet.provider!);
  const aero = await createMinimalErc20(aeroAddress, wallet.provider!);

  if (!usdc || !weth || !game || !aero) throw new Error("Error in ERC20 token setup");

  const usdcBalance = await usdc.getFormattedTokenBalance(wallet.address);
  const wethBalance = await weth.getFormattedTokenBalance(wallet.address);
  const pepeBalance = await game.getFormattedTokenBalance(wallet.address);
  const aeroBalance = await aero.getFormattedTokenBalance(wallet.address);
  const ethBalance = await wallet.provider!.getBalance(wallet.address);

  const trader = await TraderFactory.createTrader(wallet);

  console.log("--------------------------------");
  console.log("Chain", chain);
  console.log("--------------------------------");
  console.log("Block:", blockNumber);
  console.log("Wallet Info:");
  console.log("\twallet address", wallet.address);
  console.log("\tETH balance", ethers.formatEther(ethBalance));
  console.log(`\t${usdc.getSymbol()} (${usdc.getTokenAddress()}) balance: ${usdcBalance}`);
  console.log(`\t${weth.getSymbol()} (${weth.getTokenAddress()}) balance: ${wethBalance}`);
  console.log(`\t${game.getSymbol()} (${game.getTokenAddress()}) balance: ${pepeBalance}`);
  console.log(`\t${aero.getSymbol()} (${aero.getTokenAddress()}) balance: ${aeroBalance}`);
  console.log();

  const inputAmount = "1000";

  const gameUsdPrice = await geckoTerminalApi.getTokenUsdPrice(chain, GAME_ADDRESS);
  console.log(`${game.getName()} | ${game.getTokenAddress()}`);
  console.log(`$${gameUsdPrice}`);
  console.log(`amount received for ${inputAmount} = ${Number(inputAmount) / Number(gameUsdPrice)}`)
  console.log();

  const ethToTokenTrade: TradeCreationDto = {
    chain: chain,
    inputType: InputType.USD,
    inputToken: ethers.ZeroAddress,
    inputAmount: "1000",
    outputToken: game.getTokenAddress(),
  };

  displayTrade(ethToTokenTrade);

  const strategies = trader.getStrategies();
  for (const strat of strategies) {
    console.log(strat.getName());
    const quote = await strat.getQuote(ethToTokenTrade, wallet);
    console.log(`\tQuoted output amount: ${quote.outputAmount}`);
    console.log();
  }
}

if (require.main === module) {
  const wallet = getHardhatWallet_1();
  const liveWallet = getBaseWallet_1();

  baseTraderInteraction(wallet).catch(console.error);
}

export { baseTraderInteraction };
