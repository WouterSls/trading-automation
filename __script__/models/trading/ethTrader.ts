import { ethers, TransactionRequest, Wallet } from "ethers";
import {
  BuyTrade,
  BuyTradeCreationDto,
  InputType,
  OutputType,
  Quote,
  SellTradeCreationDto,
} from "../../../src/models/trading/types/_index";
import { getEthWallet_1, getHardhatWallet_1 } from "../../../src/hooks/useSetup";
import { ChainType, getChainConfig } from "../../../src/config/chain-config";
import { createMinimalErc20 } from "../../../src/models/smartcontracts/ERC/erc-utils";
import { TraderFactory } from "../../../src/models/trading/TraderFactory";
import { decodeError } from "../../../src/lib/utils";
import { ITradingStrategy } from "../../../src/models/trading/ITradingStrategy";

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
  const inputToken = ethers.ZeroAddress;
  const inputTokenAmount = "1";
  const PEPE_ADDRESS = "0x6982508145454ce325ddbe47a25d4ec3d2311933";
  const tokenToBuy = PEPE_ADDRESS;

  const buyTrade: BuyTradeCreationDto = {
    tradeType: "BUY",
    chain: chain,
    inputType: inputType,
    inputToken: inputToken,
    inputAmount: inputTokenAmount,
    outputToken: tokenToBuy,
  };

  const tokenToSell = chainConfig.tokenAddresses.usdc;
  const amountToSell = "100";
  const outputType = OutputType.TOKEN;
  const outputToken = chainConfig.tokenAddresses.usdc;
  const tpPrice = "1";

  const sellTrade: SellTradeCreationDto = {
    tradeType: "SELL",
    chain: chain,
    inputToken: tokenToSell,
    inputAmount: amountToSell,
    outputType: outputType,
    outputToken: outputToken,
    tradingPointPrice: tpPrice,
  };

  const buyTradeOutputToken = await createMinimalErc20(buyTrade.outputToken, wallet.provider!);

  console.log("--------------------------------");
  console.log("Trades");
  console.log("--------------------------------");
  console.log("Buy Trade:");
  console.log("\tToken:", buyTradeOutputToken.getTokenAddress(), `(${buyTradeOutputToken.getSymbol()})`);
  console.log("\tInput type:", buyTrade.inputType);
  console.log("\tInput token: ", buyTrade.inputToken);
  console.log("\tInput amount:", buyTrade.inputAmount);
  console.log();

  const trader = await TraderFactory.createTrader(wallet);
  /**
  const buyTradeExecution = await trader.buy(buyTrade);
  console.log("--------------------------------");
  console.log("Trade Execution");
  console.log("--------------------------------");
  console.log("\tStrategy", buyTradeExecution.getStrategy());
  console.log("\tETH Spent:", buyTradeExecution.getEthSpent());
  console.log("\tGas Spent:", buyTradeExecution.getGasCost());
  console.log("\tTokens Received: ", buyTradeExecution.getFormattedTokensReceived());
  console.log("\tTransaction Hash:", buyTradeExecution.getTransactionHash());
  console.log();
 */

  const strategies = trader.getStrategies();
  const uniV2 = strategies.filter((strat) => strat.getName().includes("UniswapV2"))[0];
  const uniV3 = strategies.filter((strat) => strat.getName().includes("UniswapV3"))[0];
  const uniV4 = strategies.filter((strat) => strat.getName().includes("UniswapV4"))[0];

  //await uniV3Test(wallet, buyTrade, uniV3);
  //await uniV4Test(wallet, buyTrade, uniV4);

  const buyTxs: TransactionRequest[] = [];
  for (const strat of strategies) {
    console.log(strat.getName());
    const price = await strat.getEthUsdcPrice(wallet);
    console.log(`\tETH/USDC Price: ${price}`);
    const quote: Quote = await strat.getBuyTradeQuote(wallet, buyTrade);
    console.log("\tquoted output amount:", quote.outputAmount, `${buyTradeOutputToken.getSymbol()}`);
    console.log("\tRoute:", quote.route.path.join(" -> "));
    //buyTxs.push(await strat.createBuyTransaction(wallet, buyTrade));
  }

  //console.log("Transaction request:");
  //console.log(buyTxs);

  return;

  console.log("sending...");
  for (const tx of buyTxs) {
    const response = await wallet.sendTransaction(tx);
    const receipt = await response.wait();
    if (!receipt) {
      console.error("transaction failed!");
    } else {
      console.log("confirmed!");
    }
  }
}

async function uniV4Test(wallet: Wallet, buyTrade: BuyTradeCreationDto, uniV4: ITradingStrategy) {
  const buyTx = await uniV4.createBuyTransaction(wallet, buyTrade);
  console.log("--------------------------------");
  console.log("Transaction Request:");
  console.log("--------------------------------");
  console.log(buyTx);
  console.log("--------------------------------");

  console.log("Sending...");

  // Pre-transaction validation
  console.log("Performing pre-transaction checks...");

  // Check ETH balance
  const ethBalance = await wallet.provider!.getBalance(wallet.address);
  const requiredEth = buyTx.value || 0n;
  if (ethBalance < BigInt(requiredEth)) {
    console.error(
      `Insufficient ETH balance. Required: ${ethers.formatEther(requiredEth)}, Available: ${ethers.formatEther(ethBalance)}`,
    );
    return;
  }

  // Check if Universal Router contract exists
  const universalRouterAddress = buyTx.to;
  const routerCode = await wallet.provider!.getCode(universalRouterAddress!);
  if (routerCode === "0x") {
    console.error(`Universal Router contract not found at address: ${universalRouterAddress}`);
    return;
  }

  console.log("✓ ETH balance sufficient");
  console.log("✓ Universal Router contract exists");
  console.log(`✓ Transaction value: ${ethers.formatEther(requiredEth)} ETH`);

  try {
    const txResponse = await wallet.sendTransaction(buyTx);
    const txReceipt = await txResponse.wait();
    console.log("Confirmed!");
  } catch (error: any) {
    console.log("Transaction failed!");

    if (error.data) {
      console.log("\n=== COMPREHENSIVE ERROR ANALYSIS ===");
      const errorAnalysis = decodeError(error.data);
      console.log("Error Analysis:", JSON.stringify(errorAnalysis, null, 2));
      console.log("=== END ERROR ANALYSIS ===\n");
    }
  }
}

async function uniV3Test(wallet: Wallet, buyTrade: BuyTradeCreationDto, uniV3: ITradingStrategy) {
  const quote = await uniV3.getBuyTradeQuote(wallet, buyTrade);
  console.log("--------------------------------");
  console.log("Quote:");
  console.log("--------------------------------");
  console.log(quote);
  console.log("--------------------------------");

  return;
  const buyTx = await uniV3.createBuyTransaction(wallet, buyTrade);
  console.log("--------------------------------");
  console.log("Transaction Request:");
  console.log("--------------------------------");
  console.log(buyTx);
  console.log("--------------------------------");

  console.log("Sending...");

  // Pre-transaction validation
  console.log("Performing pre-transaction checks...");

  // Check ETH balance
  const ethBalance = await wallet.provider!.getBalance(wallet.address);
  const requiredEth = buyTx.value || 0n;
  if (ethBalance < BigInt(requiredEth)) {
    console.error(
      `Insufficient ETH balance. Required: ${ethers.formatEther(requiredEth)}, Available: ${ethers.formatEther(ethBalance)}`,
    );
    return;
  }

  // Check if Universal Router contract exists
  const universalRouterAddress = buyTx.to;
  const routerCode = await wallet.provider!.getCode(universalRouterAddress!);
  if (routerCode === "0x") {
    console.error(`Universal Router contract not found at address: ${universalRouterAddress}`);
    return;
  }

  console.log("✓ ETH balance sufficient");
  console.log("✓ Universal Router contract exists");
  console.log(`✓ Transaction value: ${ethers.formatEther(requiredEth)} ETH`);

  try {
    const txResponse = await wallet.sendTransaction(buyTx);
    const txReceipt = await txResponse.wait();
    console.log("Confirmed!");
  } catch (error: any) {
    console.log("Transaction failed!");

    if (error.data) {
      console.log("\n=== COMPREHENSIVE ERROR ANALYSIS ===");
      const errorAnalysis = decodeError(error.data);
      console.log("Error Analysis:", JSON.stringify(errorAnalysis, null, 2));
      console.log("=== END ERROR ANALYSIS ===\n");
    }
  }
}

if (require.main === module) {
  const chain = ChainType.ETH;
  const chainConfig = getChainConfig(chain);
  const wallet = getHardhatWallet_1();
  //const wallet = getEthWallet_1();

  uniswapV4StrategyInteraction(chain, wallet).catch(console.error);
}
