import { ethers, Wallet } from "ethers";
import { InputType, TradeConfirmation } from "../../src/trading/types/_index";
import { getEthWallet_1, getHardhatWallet_1 } from "../../src/hooks/useSetup";
import { ChainType, getChainConfig } from "../../src/config/chain-config";
import { createMinimalErc20 } from "../../src/smartcontracts/ERC/erc-utils";
import { TraderFactory } from "../../src/trading/TraderFactory";
import { ITradingStrategy } from "../../src/trading/ITradingStrategy";
import { TradeCreationDto } from "../../src/trading/types/dto/TradeCreationDto";

const PEPE_ADDRESS = "0x6982508145454Ce325dDbE47a25d4ec3d2311933";

async function ethTraderTesting(chain: ChainType, wallet: Wallet) {
  const chainConfig = getChainConfig(chain);

  const blockNumber = await wallet.provider!.getBlockNumber();

  const usdcAddress = chainConfig.tokenAddresses.usdc;
  const wethAddress = chainConfig.tokenAddresses.weth;
  const usdtAddress = chainConfig.tokenAddresses.usdt;
  const usdc = await createMinimalErc20(usdcAddress, wallet.provider!);
  const weth = await createMinimalErc20(wethAddress, wallet.provider!);
  const pepe = await createMinimalErc20(PEPE_ADDRESS, wallet.provider!);
  const usdt = await createMinimalErc20(usdtAddress, wallet.provider!);

  if (!usdc || !weth || !pepe || !usdt) throw new Error("Error in ERC20 token setup");

  const usdcBalance = await usdc.getFormattedTokenBalance(wallet.address);
  const wethBalance = await weth.getFormattedTokenBalance(wallet.address);
  const pepeBalance = await pepe.getFormattedTokenBalance(wallet.address);
  const usdtBalance = await usdt.getFormattedTokenBalance(wallet.address);
  const ethBalance = await wallet.provider!.getBalance(wallet.address);

  const trader = await TraderFactory.createTrader(wallet);

  console.log("--------------------------------");
  console.log("Chain", chain);
  console.log("--------------------------------");
  console.log("Block:", blockNumber);
  console.log("Wallet Info:");
  console.log("\twallet address", wallet.address);
  console.log("\tETH balance", ethers.formatEther(ethBalance));
  console.log(`\t${usdc.getSymbol()} (${usdt.getTokenAddress()}) balance: ${usdcBalance}`);
  console.log(`\t${weth.getSymbol()} (${weth.getTokenAddress()}) balance: ${wethBalance}`);
  console.log(`\t${pepe.getSymbol()} (${pepe.getTokenAddress()}) balance: ${pepeBalance}`);
  console.log(`\t${usdt.getSymbol()} (${usdt.getTokenAddress()}) balance: ${usdtBalance}`);
  console.log();

  const singleHopEthToTokenTrade: TradeCreationDto = {
    chain: chain,
    inputType: InputType.USD,
    inputToken: ethers.ZeroAddress,
    inputAmount: "1000",
    outputToken: usdc.getTokenAddress(),
  };
  const singleHopTokenToEthTrade: TradeCreationDto = {
    chain: chain,
    inputType: InputType.TOKEN,
    inputToken: usdc.getTokenAddress(),
    inputAmount: "200",
    outputToken: ethers.ZeroAddress,
  };
  const singleHopTokenToTokenTrade: TradeCreationDto = {
    chain: chain,
    inputType: InputType.TOKEN,
    inputToken: usdc.getTokenAddress(),
    inputAmount: "200",
    outputToken: pepe.getTokenAddress(),
  };

  const singleHopTrades = [singleHopEthToTokenTrade, singleHopTokenToEthTrade, singleHopTokenToTokenTrade];

  const multiHopTokenToTokenTrade = {};
  const multiHopEthToTokenTrade = {};
  const multiHopTokenToEthTrade = {};

  const strategies = trader.getStrategies();

  const uniV2 = strategies.filter((strat) => strat.getName().toLowerCase().includes("uniswapv2"))[0];
  const uniV3 = strategies.filter((strat) => strat.getName().toLowerCase().includes("uniswapv3"))[0];
  const uniV4 = strategies.filter((strat) => strat.getName().toLowerCase().includes("uniswapv4"))[0];

  await strategyTest(singleHopTrades, uniV4, wallet);

  return;
  const tradeConfirmation: TradeConfirmation = await trader.trade(singleHopEthToTokenTrade);
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

async function strategyTest(trades: TradeCreationDto[], strat: ITradingStrategy, wallet: Wallet) {
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

    if (!receipt || receipt!.status !== 1) {
      console.log("ERROR DURING TRANSACTION");
    } else {
      console.log("TRANSACTION CONFIRMED");
    }

    return;
  }
}

if (require.main === module) {
  const chain = ChainType.ETH;

  const wallet = getHardhatWallet_1();
  const ethWallet = getEthWallet_1();

  ethTraderTesting(chain, wallet).catch(console.error);
}
