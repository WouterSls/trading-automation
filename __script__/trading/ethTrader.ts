import { ethers, Wallet } from "ethers";
import { InputType, TradeConfirmation } from "../../src/trading/types/_index";
import { getEthWallet_1, getHardhatWallet_1 } from "../../src/hooks/useSetup";
import { ChainType, getChainConfig } from "../../src/config/chain-config";
import { createMinimalErc20 } from "../../src/smartcontracts/ERC/erc-utils";
import { TraderFactory } from "../../src/trading/TraderFactory";
import { decodeError } from "../../src/lib/utils";
import { ITradingStrategy } from "../../src/trading/ITradingStrategy";
import { TradeCreationDto } from "../../src/trading/types/dto/TradeCreationDto";

async function uniswapV4StrategyInteraction(chain: ChainType, wallet: Wallet) {
  const chainConfig = getChainConfig(chain);

  const blockNumber = await wallet.provider!.getBlockNumber();

  const usdcAddress = chainConfig.tokenAddresses.usdc;
  const wethAddress = chainConfig.tokenAddresses.weth;
  const usdc = await createMinimalErc20(usdcAddress, wallet.provider!);
  const weth = await createMinimalErc20(wethAddress, wallet.provider!);

  if (!usdc || !weth) throw new Error("Error in ERC20 token setup");

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

  const PEPE_ADDRESS = "0x6982508145454Ce325dDbE47a25d4ec3d2311933";

  const ethToTokenTrade: TradeCreationDto = {
    chain: chain,
    inputType: InputType.ETH,
    inputToken: ethers.ZeroAddress,
    inputAmount: "1",
    outputToken: PEPE_ADDRESS,
  };

  const usdToTokenTrade: TradeCreationDto = {
    chain: chain,
    inputType: InputType.USD,
    inputToken: ethers.ZeroAddress,
    inputAmount: "3000",
    outputToken: usdc.getTokenAddress(),
  };

  const tokenToTokenTrade: TradeCreationDto = {
    chain: chain,
    inputType: InputType.TOKEN,
    inputToken: usdc.getTokenAddress(),
    inputAmount: "200",
    outputToken: PEPE_ADDRESS,
  };

  console.log("--------------------------------");
  console.log("Trade");
  console.log("--------------------------------");
  console.log("\tInput type:", usdToTokenTrade.inputType);
  console.log("\tInput token: ", usdToTokenTrade.inputToken);
  console.log("\tInput amount:", usdToTokenTrade.inputAmount);
  console.log("\tOutput token:", usdToTokenTrade.outputToken);
  console.log();

  const trader = await TraderFactory.createTrader(wallet);

  const strategies = trader.getStrategies();
  const uniV2 = strategies.filter((strat) => strat.getName().includes("UniswapV2"))[0];
  const uniV3 = strategies.filter((strat) => strat.getName().includes("UniswapV3"))[0];
  const uniV4 = strategies.filter((strat) => strat.getName().includes("UniswapV4"))[0];

  //await uniV2Test(usdToTokenTrade, uniV2, wallet);
  //await uniV3Test(wallet, buyTrade, uniV3);
  //await uniV4Test(wallet, buyTrade, uniV4);

  const tradeConfirmation: TradeConfirmation = await trader.trade(usdToTokenTrade);
  console.log("--------------------------------");
  console.log("Trade Execution");
  console.log("--------------------------------");
  console.log("\tStrategy", tradeConfirmation.strategy);
  console.log("\tETH Spent:", tradeConfirmation.ethSpentFormatted);
  console.log("\tGas Spent:", tradeConfirmation.gasCost);
  console.log("\tTokens Spent:", tradeConfirmation.tokensSpentFormatted);
  console.log("\tTokens Received:", tradeConfirmation.tokensReceivedFormatted);
  console.log("\tTransaction Hash:", tradeConfirmation.transactionHash);
  console.log();
}

async function uniV2Test(trade: TradeCreationDto, uniV2: ITradingStrategy, wallet: Wallet) {
  const quote = await uniV2.getQuote(trade, wallet);
  console.log();
  console.log("QUOTE");
  console.log("-------------------");
  console.log(quote);

  const txRequest = await uniV2.createTransaction(trade, wallet);
  console.log();
  console.log("TX");
  console.log("-------------------");
  console.log(txRequest);
}

async function uniV3Test(trade: TradeCreationDto, uniV3: ITradingStrategy, wallet: Wallet) {
  const quote = await uniV3.getQuote(trade, wallet);
  console.log("--------------------------------");
  console.log("Quote:");
  console.log("--------------------------------");
  console.log(quote);
  console.log("--------------------------------");

  return;
  const buyTx = await uniV3.createTransaction(trade, wallet);
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

async function uniV4Test(trade: TradeCreationDto, uniV4: ITradingStrategy, wallet: Wallet) {
  const buyTx = await uniV4.createTransaction(trade, wallet);
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
