import { ChainType, getChainConfig } from "../../../src/config/chain-config";
import { getHardhatWallet_1 } from "../../../src/hooks/useSetup";
import { ethers, Wallet } from "ethers";
import {  decodeLogs, validateNetwork } from "../../../src/lib/utils";
import { calculateSlippageAmount } from "../../../src/trading/trading-utils";
import {
  UniswapV3QuoterV2,
  UniswapV3Factory,
  UniswapV3SwapRouterV2,
  UniswapV3Pool,
} from "../../../src/smartcontracts/uniswap-v3/index";
import { WETH_INTERFACE } from "../../../src/lib/smartcontract-abis/erc20";
import { createMinimalErc20 } from "../../../src/smartcontracts/ERC/erc-utils";
import { TRADING_CONFIG } from "../../../src/config/trading-config";
import { FeeAmount } from "../../../src/smartcontracts/uniswap-v4/uniswap-v4-types";

async function swapInteraction() {
  const chain: ChainType = ChainType.ETH;
  const wallet = getHardhatWallet_1();
  const chainConfig = getChainConfig(chain);
  const blockNumber = await wallet.provider!.getBlockNumber();

  const usdcAddress = chainConfig.tokenAddresses.usdc;
  const wethAddress = chainConfig.tokenAddresses.weth;
  const uniAddress = chainConfig.tokenAddresses.uni;
  const usdc = await createMinimalErc20(usdcAddress, wallet.provider!);
  const weth = await createMinimalErc20(wethAddress, wallet.provider!);
  const uni = await createMinimalErc20(uniAddress, wallet.provider!);

  if (!usdc || !weth || !uni) throw new Error("Error during ERC20 token creation");

  const usdcBalance = await usdc.getFormattedTokenBalance(wallet.address);
  const wethBalance = await weth.getFormattedTokenBalance(wallet.address);
  const uniBalance = await uni.getFormattedTokenBalance(wallet.address);
  const ethBalance = await wallet.provider!.getBalance(wallet.address);

  const router = new UniswapV3SwapRouterV2(chain);
  const quoter = new UniswapV3QuoterV2(chain);

  console.log("--------------------------------");
  console.log("Chain", chain);
  console.log("--------------------------------");
  console.log("Block:", blockNumber);
  console.log("Wallet Info:");
  console.log("\twallet address", wallet.address);
  console.log("\tETH balance", ethers.formatEther(ethBalance));
  console.log(`\t${usdc.getSymbol()} balance: ${usdcBalance}`);
  console.log(`\t${weth.getSymbol()} balance: ${wethBalance}`);
  console.log(`\t${uni.getSymbol()} balance: ${uniBalance}`);
  console.log();

  /**
  const approvalTx = usdc.createApproveTransaction(router.getRouterAddress(), ethers.MaxUint256);
  console.log("approving...");
  await wallet.sendTransaction(approvalTx);
  console.log("approved!");
 */

  const tokenIn = usdc.getTokenAddress();
  const amountInFormatted = "200";
  const amountIn = ethers.parseUnits(amountInFormatted, usdc.getDecimals());
  const tokenOutWeth = weth.getTokenAddress();
  const tokenOutUni = uni.getTokenAddress();
  const fee = FeeAmount.MEDIUM;
  const recipient = wallet.address;

  //await usdcToEthTrade(router, quoter, tokenIn, tokenOutWeth, fee, recipient, amountIn, wallet);
  //await usdcToUniTrade(router, quoter, tokenIn, tokenOutUni, fee, recipient, amountIn, wallet);
}

async function usdcToEthTrade(
  router: UniswapV3SwapRouterV2,
  quoter: UniswapV3QuoterV2,
  tokenIn: string,
  tokenOut: string,
  fee: FeeAmount,
  recipient: string,
  amountIn: bigint,
  wallet: Wallet,
) {
  console.log("USDC -> ETH Trade");
  const quoteAmountOut = 0n;
  const quoteSqrtPriceLimitX96 = 0n;
  const { amountOut } = await quoter.quoteExactInputSingle(
    wallet,
    tokenIn,
    tokenOut,
    fee,
    recipient,
    amountIn,
    quoteAmountOut,
    quoteSqrtPriceLimitX96,
  );

  console.log(ethers.formatEther(amountOut));

  const slippageAmount = calculateSlippageAmount(amountOut);
  const amountOutMin = amountOut - slippageAmount;

  console.log("AmountOut");
  console.log(amountOut);
  console.log();

  console.log("AmountOutMin");
  console.log(amountOutMin);

  // TRADE USDC -> WETH -> ETH | Single Hop = ExactInputSingle & unwrapWETH9
  const exactInputSingleTxData = router.encodeExactInputSingle(
    tokenIn,
    tokenOut,
    fee,
    router.getRouterAddress(),
    amountIn,
    amountOutMin,
    quoteSqrtPriceLimitX96,
  );

  /// @notice Unwraps the contract's WETH9 balance and sends it to recipient as ETH.
  /// @dev The amountMinimum parameter prevents malicious contracts from stealing WETH9 from users.
  /// @param amountMinimum The minimum amount of WETH9 to unwrap
  /// @param recipient The address receiving ETH
  //const unwrapWETH9 = UNISWAP_V3_ROUTER_INTERFACE.encodeFunctionData("unwrapWETH9", [amountOutMin, recipient]);
  const unwrapWETH9 = router.encodeUnwrapWETH9(amountOutMin, recipient);

  const multicallTx = router.createMulticallTransaction(TRADING_CONFIG.DEADLINE, [exactInputSingleTxData, unwrapWETH9]);

  try {
    await wallet.call(multicallTx);
  } catch (error) {
    console.log(error);
    throw error;
  }

  const txResponse = await wallet.sendTransaction(multicallTx);
  const txReceipt = await txResponse.wait(1);

  if (!txReceipt) {
    throw new Error("Deposit transaction failed");
  }

  const logs = decodeLogs(txReceipt.logs);
  console.log("LOGS");
  console.log("--------------------------------");
  console.log(logs);
  console.log("--------------------------------");
}

async function usdcToUniTrade(
  router: UniswapV3SwapRouterV2,
  quoter: UniswapV3QuoterV2,
  tokenIn: string,
  tokenOut: string,
  fee: FeeAmount,
  recipient: string,
  amountIn: bigint,
  wallet: Wallet,
) {
  console.log("USDC -> UNI Trade");
  const quoteAmountOut = 0n;
  const quoteSqrtPriceLimitX96 = 0n;

  console.log("Amount in:");
  console.log(amountIn);

  const { amountOut } = await quoter.quoteExactInputSingle(
    wallet,
    tokenIn,
    tokenOut,
    fee,
    recipient,
    amountIn,
    quoteAmountOut,
    quoteSqrtPriceLimitX96,
  );

  const slippageAmount = calculateSlippageAmount(amountOut);
  const amountOutMin = amountOut - slippageAmount;

  console.log("AmountOut");
  console.log(amountOut);
  console.log();

  console.log("AmountOutMin");
  console.log(amountOutMin);

  // TRADE USDC -> UNI | Single Hop = ExactInputSingle
  const tx = router.createExactInputSingleTransaction(
    tokenIn,
    tokenOut,
    fee,
    recipient,
    amountIn,
    amountOutMin,
    quoteSqrtPriceLimitX96,
  );

  try {
    await wallet.call(tx);
  } catch (error) {
    console.log(error);
    throw error;
  }

  const txResponse = await wallet.sendTransaction(tx);
  const txReceipt = await txResponse.wait(1);

  if (!txReceipt) {
    throw new Error("Deposit transaction failed");
  }

  const logs = decodeLogs(txReceipt.logs);
  console.log("LOGS");
  console.log("--------------------------------");
  console.log(logs);
  console.log("--------------------------------");
}

async function singleTickSwapInteraction(chain: ChainType, wallet: Wallet) {
  await validateNetwork(wallet, chain);

  const chainConfig = getChainConfig(chain);

  const USDC_ADDRESS = chainConfig.tokenAddresses.usdc;
  const usdc = await createMinimalErc20(USDC_ADDRESS, wallet.provider!);
  if (!usdc) throw new Error("Error during USDC creation");
  const usdcBalance = await usdc.getFormattedTokenBalance(wallet.address);

  const WETH_ADDRESS = chainConfig.tokenAddresses.weth;
  const wethContract = new ethers.Contract(WETH_ADDRESS, WETH_INTERFACE, wallet);
  const weth = await createMinimalErc20(WETH_ADDRESS, wallet.provider!);
  if (!weth) throw new Error("Error during WETH creation");
  const wethBalance = await weth.getFormattedTokenBalance(wallet.address);

  const DAI_ADDRESS = chainConfig.tokenAddresses.dai;
  const dai = await createMinimalErc20(DAI_ADDRESS, wallet.provider!);
  if (!dai) throw new Error("Error during dai creation");
  const daiBalance = await dai.getFormattedTokenBalance(wallet.address);

  const walletBalance = await wallet.provider!.getBalance(wallet.address);

  console.log("--------------------------------");
  console.log("Chain", chain);
  console.log("--------------------------------");
  console.log("Wallet Info:");
  console.log("\twallet address", wallet.address);
  console.log("\tETH balance", ethers.formatEther(walletBalance));
  console.log(`\t${usdc.getSymbol()} balance: ${usdcBalance}`);
  console.log(`\t${weth.getSymbol()} balance: ${wethBalance}`);
  console.log(`\t${dai.getSymbol()} balance: ${daiBalance}`);
  console.log();

  const factory = new UniswapV3Factory(chain);
  const router = new UniswapV3SwapRouterV2(chain);
  const quoter = new UniswapV3QuoterV2(chain);

  //await depositWeth(wallet, wethContract, 200);

  const daiWethPool = await factory.getPool(wallet, DAI_ADDRESS, WETH_ADDRESS, 3000);
  const slot0 = await daiWethPool.getSlot0();

  const tick = slot0.tick;
  const liquidity = await daiWethPool.getLiquidity();
  const tickSpacing = await daiWethPool.getTickSpacing();

  const lowerTick = Math.floor(Number(tick) / Number(tickSpacing)) * Number(tickSpacing);
  const upperTick = lowerTick + Number(tickSpacing);
  const upperTickInfo = await daiWethPool.getTickInfo(upperTick);

  const calculatedLiquidityAtNewTick = liquidity + upperTickInfo.liquidityNet;

  const sqrtPriceAtUpperTick = await calculateSqrtPriceAtTick(upperTick);
  const sqrtPriceAtCurrentTick = await convertSqrtPriceX96ToSqrtPrice(Number(slot0.sqrtPriceX96));

  const sqrtPriceDelta = sqrtPriceAtUpperTick - sqrtPriceAtCurrentTick;
  const tokensNeededToChangeTick = Number(liquidity) * sqrtPriceDelta;
  const formattedTokensNeededToChangeTick = ethers.formatEther(tokensNeededToChangeTick.toString());
  console.log(`Formatted amount of input tokens needed to change tick:`, formattedTokensNeededToChangeTick);
  console.log();

  const inputToken = weth;
  const inputAmount = Number(formattedTokensNeededToChangeTick);
  const amountToChangeTick = 55;
  const outputToken = dai;

  //await exactInputSingleTrade(wallet, router, inputToken, amountToChangeTick, outputToken);

  console.log();
  console.log(`Calculated liquidity at new tick:`, calculatedLiquidityAtNewTick);
  console.log("Actual Liquidity after change tick:", await daiWethPool.getLiquidity());
}
async function multiTickMultiPoolSwapInteraction(chain: ChainType, wallet: Wallet) {
  await validateNetwork(wallet, chain);

  const chainConfig = getChainConfig(chain);

  const USDC_ADDRESS = chainConfig.tokenAddresses.usdc;
  const usdc = await createMinimalErc20(USDC_ADDRESS, wallet.provider!);
  if (!usdc) throw new Error("Error during USDC creation");
  const usdcBalance = await usdc.getFormattedTokenBalance(wallet.address);

  const WETH_ADDRESS = chainConfig.tokenAddresses.weth;
  const wethContract = new ethers.Contract(WETH_ADDRESS, WETH_INTERFACE, wallet);
  const weth = await createMinimalErc20(WETH_ADDRESS, wallet.provider!);
  if (!weth) throw new Error("Error during WETH creation");
  const wethBalance = await weth.getFormattedTokenBalance(wallet.address);

  const DAI_ADDRESS = chainConfig.tokenAddresses.dai;
  const dai = await createMinimalErc20(DAI_ADDRESS, wallet.provider!);
  if (!dai) throw new Error("Error during DAI creation");
  const daiBalance = await dai.getFormattedTokenBalance(wallet.address);

  const WBTC_ADDRESS = "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599";
  const wbtc = await createMinimalErc20(WBTC_ADDRESS, wallet.provider!);
  if (!wbtc) throw new Error("Error during WBTC creation");
  const wbtcBalance = await wbtc.getFormattedTokenBalance(wallet.address);

  const walletBalance = await wallet.provider!.getBalance(wallet.address);

  console.log("--------------------------------");
  console.log("Chain", chain);
  console.log("--------------------------------");
  console.log("Wallet Info:");
  console.log("\twallet address", wallet.address);
  console.log("\tETH balance", ethers.formatEther(walletBalance));
  console.log(`\t${usdc.getSymbol()} balance: ${usdcBalance}`);
  console.log(`\t${weth.getSymbol()} balance: ${wethBalance}`);
  console.log(`\t${dai.getSymbol()} balance: ${daiBalance}`);
  console.log(`\t${wbtc.getSymbol()} balance: ${wbtcBalance}`);
  console.log();

  const factory = new UniswapV3Factory(chain);
  const router = new UniswapV3SwapRouterV2(chain);
  const quoter = new UniswapV3QuoterV2(chain);

  // await depositWeth(wallet, wethContract, 500);

  const daiWethPool = await factory.getPool(wallet, DAI_ADDRESS, WETH_ADDRESS, 3000);
  const daiWbtcPool = await factory.getPool(wallet, DAI_ADDRESS, WBTC_ADDRESS, 3000);

  await displayPoolInfo(daiWethPool);
  await displayPoolInfo(daiWbtcPool);

  //const fees = [FeeAmount.MEDIUM, FeeAmount.MEDIUM];
  //const tokensToTrade = [weth, dai, wbtc];
  //await exactInputTrade(wallet, router, tokensToTrade, fees, 150);

  const slot0 = await daiWethPool.getSlot0();
  const liquidity = await daiWethPool.getLiquidity();
  const sqrtPriceX96 = slot0.sqrtPriceX96;
  const tick = slot0.tick;
  const tickSpacing = await daiWethPool.getTickSpacing();

  const lowerTick = Math.floor(Number(tick) / Number(tickSpacing)) * Number(tickSpacing);
  const upperTick = lowerTick + Number(tickSpacing);

  const sqrtPriceAtUpperTick = await calculateSqrtPriceAtTick(upperTick);
  const sqrtPriceAtCurrentTick = await convertSqrtPriceX96ToSqrtPrice(Number(sqrtPriceX96));
  const sqrtPriceDelta = sqrtPriceAtUpperTick - sqrtPriceAtCurrentTick;
  const tokensNeededToChangeTick = Number(liquidity) * sqrtPriceDelta;
  const formattedTokensNeededToChangeTick = ethers.formatEther(tokensNeededToChangeTick.toString());
  console.log(`Formatted amount of input tokens needed to change tick:`, formattedTokensNeededToChangeTick);
}

async function calculateSqrtPriceAtTick(tick: number) {
  return 1.0001 ** (tick / 2);
}
async function convertSqrtPriceX96ToSqrtPrice(sqrtPriceX96: number) {
  return sqrtPriceX96 * 2 ** -96;
}

async function displayPoolInfo(pool: UniswapV3Pool) {
  const poolToken0 = await pool.getToken0Address();
  const poolToken1 = await pool.getToken1Address();

  const poolSlot0 = await pool.getSlot0();
  const poolTick: bigint = poolSlot0.tick;
  const poolTickSpacing: number = await pool.getTickSpacing();
  const poolLowerTickBoundary = Math.floor(Number(poolTick) / poolTickSpacing) * poolTickSpacing;
  const poolUpperTickBoundary = poolLowerTickBoundary + poolTickSpacing;

  const poolLiquidity = await pool.getLiquidity();

  console.log();
  console.log("pool address:", pool.getPoolAddress());
  console.log("pool info:");

  console.log("\ttoken0", poolToken0);
  console.log("\ttoken1", poolToken1);
  console.log(`\t${poolLowerTickBoundary} -> ${poolTick} (current tick) -> ${poolUpperTickBoundary}`);
  console.log("\ttick spacing", poolTickSpacing);
  console.log("\tliquidity", poolLiquidity);
  console.log();
}

if (require.main === module) {
  swapInteraction();
}
