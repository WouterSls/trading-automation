import { ethers, Wallet } from "ethers";
import { getBaseWallet_1, getCoingeckoApi, getHardhatWallet_1, getTheGraphApi } from "../../src/hooks/useSetup";
import { createMinimalErc20 } from "../../src/smartcontracts/ERC/erc-utils";
import { TraderFactory } from "../../src/trading/TraderFactory";
import { GeckoTerminalApi } from "../../src/external-apis/GeckoTerminalApi";
import { ChainType, getChainConfig } from "../../src/config/chain-config";
import { InputType, TradeCreationDto } from "../../src/trading/types/_index";
import { ITradingStrategy } from "../../src/trading/ITradingStrategy";
import { decodeLogs, displayTrade, validateNetwork } from "../../src/lib/utils";
import { ERC20 } from "../../src/smartcontracts/ERC/ERC20";

const GAME_ADDRESS = "0x1c4cca7c5db003824208adda61bd749e55f463a3";
const CONVO_ADDRESS = "0xab964f7b7b6391bd6c4e8512ef00d01f255d9c0d";

async function baseTraderInteraction(wallet: Wallet) {
  const chain = ChainType.BASE;

  await validateNetwork(wallet, chain);

  const chainConfig = getChainConfig(chain);

  const graphApi = getTheGraphApi();

  const blockNumber = await wallet.provider!.getBlockNumber();

  const usdcAddress = chainConfig.tokenAddresses.usdc;
  const wethAddress = chainConfig.tokenAddresses.weth;
  const aeroAddress = chainConfig.tokenAddresses.aero;

  const usdc = await createMinimalErc20(usdcAddress, wallet.provider!);
  const weth = await createMinimalErc20(wethAddress, wallet.provider!);
  const game = await createMinimalErc20(GAME_ADDRESS, wallet.provider!);
  const aero = await createMinimalErc20(aeroAddress, wallet.provider!);
  const convo = await createMinimalErc20(CONVO_ADDRESS, wallet.provider!);

  if (!usdc || !weth || !game || !aero || !convo) throw new Error("Error in ERC20 token setup");

  const usdcBalance = await usdc.getFormattedTokenBalance(wallet.address);
  const wethBalance = await weth.getFormattedTokenBalance(wallet.address);
  const pepeBalance = await game.getFormattedTokenBalance(wallet.address);
  const aeroBalance = await aero.getFormattedTokenBalance(wallet.address);
  const ethBalance = await wallet.provider!.getBalance(wallet.address);
  const convoBalance = await convo.getFormattedTokenBalance(wallet.address);

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
  console.log(`\t${convo.getSymbol()} (${convo.getTokenAddress()}) balance: ${convoBalance}`);
  console.log();

  const singleHopEthToTokenTrade: TradeCreationDto = {
    chain: chain,
    inputType: InputType.USD,
    inputToken: ethers.ZeroAddress,
    inputAmount: "1000",
    outputToken: usdc.getTokenAddress(),
  };
  const singleHopTokenToTokenTrade: TradeCreationDto = {
    chain: chain,
    inputType: InputType.TOKEN,
    inputToken: aero.getTokenAddress(),
    inputAmount: "400",
    outputToken: usdc.getTokenAddress(),
  };
  const singleHopTokenToEthTrade: TradeCreationDto = {
    chain: chain,
    inputType: InputType.TOKEN,
    inputToken: usdc.getTokenAddress(),
    inputAmount: "200",
    outputToken: ethers.ZeroAddress,
  };

  const multiHopTokenToTokenTrade = {};
  const multiHopEthToTokenTrade = {};
  const multiHopTokenToEthTrade = {};

  const gameTrade: TradeCreationDto = {
    chain: ChainType.BASE,
    inputToken: game.getTokenAddress(),
    inputType: InputType.TOKEN,
    inputAmount: "819.4863703951352",
    outputToken: usdc.getTokenAddress(),
  };

  const convoTrade: TradeCreationDto = {
    chain: ChainType.BASE,
    inputToken: convo.getTokenAddress(),
    inputType: InputType.TOKEN,
    inputAmount: "4000",
    outputToken: usdc.getTokenAddress(),
  };

  const arbTrade: TradeCreationDto = {
    chain: ChainType.ARB,
    inputToken: ethers.ZeroAddress,
    inputType: InputType.TOKEN,
    inputAmount: "0",
    outputToken: ethers.ZeroAddress,
  };

  await displayTrade(gameTrade);
  await displayLivePrice(chain, game);

  const quote = await trader.quote(gameTrade);

  console.log(quote);

  const singleHopTrades: TradeCreationDto[] = [
    singleHopEthToTokenTrade,
    singleHopTokenToTokenTrade,
    singleHopTokenToEthTrade,
  ];
  //await strategyTest(aeroStrat, singleHopTrades, wallet);
}

async function strategyTest(strat: ITradingStrategy | null, trades: TradeCreationDto[], wallet: Wallet) {
  if (!strat) throw new Error("NO TRADING STRAT SUPPLIED");

  for (const trade of trades) {
    console.log();
    console.log("QUOTE");
    console.log("----------------");
    const quote = await strat.getQuote(trade, wallet);
    console.log(quote);
    console.log();

    await strat.ensureTokenApproval(trade.inputToken, trade.inputAmount, wallet);

    console.log();
    console.log("TX");
    console.log("----------------");
    const tx = await strat.createTransaction(trade, wallet);
    console.log(tx);

    console.log("SENDING...");
    const response = await wallet.sendTransaction(tx);
    const receipt = await response.wait();
    if (!receipt || receipt.status !== 1) {
      console.log("ERROR DURING TRANSACTION");
    } else {
      console.log("TRANSACTION CONFIRMED");
    }
  }
}

async function displayLivePrice(chain: ChainType, token: ERC20) {
  const geckoTerminalApi = getCoingeckoApi();

  const liveUsdPrice = await geckoTerminalApi.getTokenUsdPrice(chain, token.getTokenAddress());
  console.log(`${token.getName()} | ${token.getTokenAddress()}`);
  console.log(`$${liveUsdPrice}`);
  console.log();
}

if (require.main === module) {
  const wallet = getHardhatWallet_1();
  const baseWallet = getBaseWallet_1();

  baseTraderInteraction(baseWallet).catch(console.error);
}

export { baseTraderInteraction };
