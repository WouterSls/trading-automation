import { ethers, Wallet, TransactionRequest } from "ethers";

import { ChainType, getChainConfig } from "../../../config/chain-config";
import {
  ExactInputParams,
  ExactInputSingleParams,
  ExactOutputParams,
  ExactOutputSingleParams,
  FeeAmount,
} from "../../../models/uniswap-v3/uniswap-v3-types";

import { UniswapV3SwapRouterV2 } from "../../../models/uniswap-v3/UniswapV3SwapRouterV2";
import { UniswapV3Factory } from "../../../models/uniswap-v3/UniswapV3Factory";
import { getEthWallet_1, getBaseWallet_1, getArbitrumWallet_2, getHardhatWallet_1 } from "../../../hooks/useSetup";
import { createMinimalErc20, decodeLogs, validateNetwork } from "../../../lib/utils";
import { ERC20 } from "../../../models/ERC/ERC20";
import { encodePath } from "../../../models/uniswap-v3/uniswap-v3-utils";

async function routerInteraction(chain: ChainType, wallet: Wallet) {
  await validateNetwork(wallet, chain);

  const chainConfig = getChainConfig(chain);

  const USDC_ADDRESS = chainConfig.tokenAddresses.usdc;
  const DAI_ADDRESS = chainConfig.tokenAddresses.dai;
  const WETH_ADDRESS = chainConfig.tokenAddresses.weth;
  const ROUTER_ADDRESS = chainConfig.uniswapV3.swapRouterV2Address;
  const FACTORY_ADDRESS = chainConfig.uniswapV3.factoryAddress;

  if (!USDC_ADDRESS || USDC_ADDRESS.trim() === "") {
    throw new Error("Missing required USDC address");
  }

  if (!WETH_ADDRESS || WETH_ADDRESS.trim() === "") {
    throw new Error("Missing required WETH address");
  }

  if (!DAI_ADDRESS || DAI_ADDRESS.trim() === "") {
    throw new Error("Missing required DAI address");
  }

  if (!ROUTER_ADDRESS || ROUTER_ADDRESS.trim() === "") {
    throw new Error("Missing required Router address");
  }

  if (!FACTORY_ADDRESS || FACTORY_ADDRESS.trim() === "") {
    throw new Error("Missing required Factory address");
  }

  const usdcContract = await createMinimalErc20(USDC_ADDRESS, wallet.provider!);
  const wethContract = await createMinimalErc20(WETH_ADDRESS, wallet.provider!);
  const daiContract = await createMinimalErc20(DAI_ADDRESS, wallet.provider!);
  const gasBalance = await wallet.provider!.getBalance(wallet.address);

  const router = new UniswapV3SwapRouterV2(chain);

  console.log("--------------------------------");
  console.log("Chain", chain);
  console.log("--------------------------------");

  console.log("usdc address", USDC_ADDRESS);
  console.log("weth address", WETH_ADDRESS);
  console.log("router address", ROUTER_ADDRESS);
  console.log();

  console.log("Wallet Info:");
  console.log("\taddress", wallet.address);
  console.log("\teth balance", ethers.formatEther(gasBalance));
  console.log("\tusdc balance", await usdcContract.getFormattedTokenBalance(wallet.address));
  console.log("\tweth balance", await wethContract.getFormattedTokenBalance(wallet.address));
  console.log("\tdai balance", await daiContract.getFormattedTokenBalance(wallet.address));

  console.log();

  const factory = new UniswapV3Factory(chain);
  const feeTier = FeeAmount.MEDIUM;
  const usdcWethPool = await factory.getPool(wallet, USDC_ADDRESS, WETH_ADDRESS, feeTier);
  const wethDaiPool = await factory.getPool(wallet, WETH_ADDRESS, DAI_ADDRESS, feeTier);

  //const weth = new ethers.Contract(WETH_ADDRESS, WETH_INTERFACE, wallet);
  //const txInteractionResponse = await weth.deposit({ value: ethers.parseEther("10") });
  //const txReceipt = await txInteractionResponse.wait();

  console.log("Pool Info:");
  console.log(`\tUSDC/WETH pool: ${usdcWethPool.getPoolAddress()} (fee tier: ${feeTier / 10000}%)`);
  console.log(`\tpool weth balance: ${await wethContract.getFormattedTokenBalance(usdcWethPool.getPoolAddress())}`);
  console.log(`\tpool usdc balance: ${await usdcContract.getFormattedTokenBalance(usdcWethPool.getPoolAddress())}`);
  console.log();

  console.log(`\tWETH/DAI pool: ${wethDaiPool.getPoolAddress()} (fee tier: ${feeTier / 10000}%)`);
  console.log(`\tpool weth balance: ${await wethContract.getFormattedTokenBalance(wethDaiPool.getPoolAddress())}`);
  console.log(`\tpool dai balance: ${await daiContract.getFormattedTokenBalance(wethDaiPool.getPoolAddress())}`);

  console.log();

  /**
   * Exact Input Single Trade
   *   console.log("Trading WETH -> USDC");
   *   const inputAmount = 0.1;
   *   await exactInputSingleTrade(wallet, router, wethContract, inputAmount, usdcContract);
   */

  /**
   * Exact Input Trade
   *   console.log("Trading USDC -> WETH -> DAI");
   *   const tokensToTrade = [usdcContract, wethContract, daiContract];
   *   const feeAmounts = [FeeAmount.MEDIUM, FeeAmount.MEDIUM];
   *   const inputAmount = 100;
   *   await exactInputTrade(wallet, router, tokensToTrade, feeAmounts, inputAmount);
   */

  /**
   * Exact Output Single Trade
   *   console.log("Trading DAI -> USDC");
   *   const outputAmount = 10;
   *   const inputToken = daiContract;
   *   const outputToken = usdcContract;
   *   await exactOutputSingleTrade(wallet, router, inputToken, outputToken, outputAmount);
   */

  /**
   * Exact Output Trade
   *   console.log("Trading USDC -> WETH -> DAI");
   *   !For exactOutput, tokensToTrade should be in reverse order (output->input)!
   *   const outputTokens = [daiContract, wethContract, usdcContract];
   *   const outputFees = [FeeAmount.MEDIUM, FeeAmount.MEDIUM];
   *   const exactOutputAmount = 100;
   *   await exactOutputTrade(wallet, router, outputTokens, outputFees, exactOutputAmount);
   */
}

export async function exactInputSingleTrade(
  wallet: Wallet,
  router: UniswapV3SwapRouterV2,
  tokenIn: ERC20,
  amountIn: number,
  tokenOut: ERC20,
) {
  const inputAmount = ethers.parseUnits(amountIn.toString(), tokenIn.getDecimals());
  const exactInputTrade: ExactInputSingleParams = {
    tokenIn: tokenIn.getTokenAddress(),
    tokenOut: tokenOut.getTokenAddress(),
    fee: FeeAmount.MEDIUM,
    recipient: wallet.address,
    amountIn: inputAmount,
    amountOutMinimum: 0n,
    sqrtPriceLimitX96: 0n,
  };

  await approveSending(wallet, tokenIn, router.getRouterAddress(), amountIn);

  console.log("Creating transaction...");
  const tx: TransactionRequest = await router.createExactInputSingleTransaction(wallet, exactInputTrade);
  try {
    console.log("transaction created: ", JSON.stringify(tx, null, 2));
    console.log("sending transaction...");
    const txResponse = await wallet.sendTransaction(tx);
    const txReceipt = await txResponse.wait();
    if (!txReceipt) throw new Error("Transaction failed");
    const logs = txReceipt.logs;
    const decodedLogs = decodeLogs(logs);
    console.log("logs from transaction:");
    console.log(decodedLogs);
  } catch (error: unknown) {
    console.log("error:", error);
  }
}

export async function exactInputTrade(
  wallet: Wallet,
  router: UniswapV3SwapRouterV2,
  tokensToTrade: ERC20[],
  feeAmounts: FeeAmount[],
  amountIn: number,
) {
  const inputToken = tokensToTrade[0];
  const addresses = tokensToTrade.map((token) => token.getTokenAddress());
  const encodedPath = encodePath(addresses, feeAmounts);

  const rawAmountIn = ethers.parseUnits(amountIn.toString(), tokensToTrade[0].getDecimals());

  const exactInputTrade: ExactInputParams = {
    path: encodedPath,
    recipient: wallet.address,
    amountIn: rawAmountIn,
    amountOutMinimum: 0n,
  };

  await approveSending(wallet, inputToken, router.getRouterAddress(), amountIn);

  const tx: TransactionRequest = await router.createExactInputTransaction(wallet, exactInputTrade);
  console.log("transaction created: ", JSON.stringify(tx, null, 2));
  console.log("sending transaction...");
  const txResponse = await wallet.sendTransaction(tx);
  const txReceipt = await txResponse.wait();
  /**
   * Router Function
   *   const txResponse = await router.exactInput(wallet, exactInputTrade);
   *   const txReceipt = await txResponse.wait();
   */
  if (!txReceipt) throw new Error("Transaction failed");
  const logs = txReceipt.logs;
  const decodedLogs = decodeLogs(logs);
  console.log("logs from transaction:");
  console.log(decodedLogs);
}

async function exactOutputSingleTrade(
  wallet: Wallet,
  router: UniswapV3SwapRouterV2,
  tokenIn: ERC20,
  tokenOut: ERC20,
  amountOut: number,
) {
  const outputAmount = ethers.parseUnits(amountOut.toString(), tokenOut.getDecimals());
  const tokenInBalance = await tokenIn.getRawTokenBalance(wallet.address);

  const amountInMaximum = (tokenInBalance * 95n) / 100n;

  const exactOutputTrade: ExactOutputSingleParams = {
    tokenIn: tokenIn.getTokenAddress(),
    tokenOut: tokenOut.getTokenAddress(),
    fee: FeeAmount.MEDIUM,
    recipient: wallet.address,
    amountOut: outputAmount,
    amountInMaximum: amountInMaximum,
    sqrtPriceLimitX96: 0n,
  };

  const approveAmount = Number(ethers.formatUnits(amountInMaximum, tokenIn.getDecimals()));
  await approveSending(wallet, tokenIn, router.getRouterAddress(), approveAmount);

  /**
   * Router Function
   *   const txResponse = await router.exactOutputSingle(wallet, exactOutputTrade);
   *   const txReceipt = await txResponse.wait();
   */

  console.log("Creating transaction...");
  const tx: TransactionRequest = await router.createExactOutputSingleTransaction(wallet, exactOutputTrade);
  console.log("transaction created: ", JSON.stringify(tx, null, 2));
  console.log("sending transaction...");
  const txResponse = await wallet.sendTransaction(tx);
  const txReceipt = await txResponse.wait();
  if (!txReceipt) throw new Error("Transaction failed");
  const logs = txReceipt.logs;
  const decodedLogs = decodeLogs(logs);
  console.log("logs from transaction:");
  console.log(decodedLogs);
}

async function exactOutputTrade(
  wallet: Wallet,
  router: UniswapV3SwapRouterV2,
  tokensToTrade: ERC20[],
  feeAmounts: FeeAmount[],
  amountOut: number,
) {
  // tokensToTrade should be in reverse order (output->input)
  const addresses = tokensToTrade.map((token) => token.getTokenAddress());

  const inputToken = tokensToTrade[tokensToTrade.length - 1];
  const outputToken = tokensToTrade[0];

  const encodedPath = encodePath(addresses, feeAmounts);

  const rawAmountOut = ethers.parseUnits(amountOut.toString(), outputToken.getDecimals());

  const tokenInBalance = await inputToken.getRawTokenBalance(wallet.address);
  const amountInMaximum = (tokenInBalance * 95n) / 100n;

  const exactOutputParams: ExactOutputParams = {
    path: encodedPath,
    recipient: wallet.address,
    amountOut: rawAmountOut,
    amountInMaximum: amountInMaximum,
  };

  const approveAmount = Number(ethers.formatUnits(amountInMaximum, inputToken.getDecimals()));
  await approveSending(wallet, inputToken, router.getRouterAddress(), approveAmount);

  console.log("Creating transaction...");
  const tx: TransactionRequest = await router.createExactOutputTransaction(wallet, exactOutputParams);

  try {
    console.log("transaction created: ", JSON.stringify(tx, null, 2));
    console.log("sending transaction...");
    const txResponse = await wallet.sendTransaction(tx);
    const txReceipt = await txResponse.wait();
    if (!txReceipt) throw new Error("Transaction failed");
    const logs = txReceipt.logs;
    const decodedLogs = decodeLogs(logs);
    console.log("logs from transaction:");
    console.log(decodedLogs);
  } catch (error: unknown) {
    console.log("error:", error);
  }
}

async function approveSending(wallet: Wallet, token: ERC20, spender: string, amount: number) {
  const tradeAmount = ethers.parseUnits(amount.toString(), token.getDecimals());
  console.log("raw trade amount", tradeAmount);

  const routerAllowance = await token.getRawAllowance(wallet.address, spender);
  console.log("raw router allowance", routerAllowance);

  if (routerAllowance <= tradeAmount) {
    const approveAmount = (tradeAmount * 105n) / 100n;
    console.log("Approving", approveAmount, token.getSymbol(), "to", spender, "...");
    const approveTx = await token.createApproveTransaction(spender, approveAmount);
    const approveTxHash = await wallet.sendTransaction(approveTx);
    const approveTxReceipt = await approveTxHash.wait();
    if (!approveTxReceipt) throw new Error("Approve transaction failed");
    console.log("Approved!");
  } else {
    console.log("Token allowance is sufficient, skipping approve transaction");
  }
}

if (require.main === module) {
  const hardhatWallet = getHardhatWallet_1();
  const ethWallet = getEthWallet_1();
  const baseWallet = getBaseWallet_1();
  const arbWallet2 = getArbitrumWallet_2();

  const eth = ChainType.ETH;
  const base = ChainType.BASE;
  const arb = ChainType.ARB;

  routerInteraction(eth, hardhatWallet).catch(console.error);
}
