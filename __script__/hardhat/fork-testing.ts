import { ethers, Wallet, TransactionRequest, Contract } from "ethers";
import { getHardhatWallet_1 } from "../../src/hooks/useSetup";
import { ChainType, getChainConfig } from "../../src/config/chain-config";
import { ERC20 } from "../../src/models/blockchain/ERC/ERC20";
import { createMinimalErc20 } from "../../src/lib/utils";
import { UniswapV2Router } from "../../src/models/blockchain/uniswap-v2/UniswapV2Router";
import { WETH_INTERFACE } from "../../src/lib/contract-abis/erc20";
import { UniswapV3SwapRouterV2, UniswapV3QuoterV2 } from "../../src/models/blockchain/uniswap-v3/index";
import {
  ExactInputSingleParams,
  QuoteExactInputSingleParams,
} from "../../src/models/blockchain/uniswap-v3/uniswap-v3-types";

export async function forkTesting(wallet: Wallet, chain: ChainType) {
  const chainConfig = getChainConfig(chain);

  const network = await wallet.provider!.getNetwork();
  console.log("--------------------------------");
  console.log(`Network: ${network.name}`);
  console.log(`ChainType: ${chain}`);
  console.log("--------------------------------");

  const walletAddress = wallet.address;
  const walletBalance = await wallet.provider!.getBalance(walletAddress);

  console.log(`Wallet ETH balance: ${ethers.formatEther(walletBalance)}`);

  const usdcAddress = chainConfig.tokenAddresses.usdc;
  const wethAddress = chainConfig.tokenAddresses.weth;

  const usdc: ERC20 = await createMinimalErc20(usdcAddress, wallet.provider!);
  const wethErc20: ERC20 = await createMinimalErc20(wethAddress, wallet.provider!);
  const weth: Contract = new ethers.Contract(wethAddress, WETH_INTERFACE, wallet);

  console.log("Wallet token info:");
  console.log(`\t${usdc.getName()} (${usdc.getSymbol()}) | ${usdcAddress} `);
  console.log(`\tbalance: ${await usdc.getFormattedTokenBalance(walletAddress)}`);

  console.log(`\t${await weth.name()} (${await weth.symbol()}) | ${wethAddress} `);
  console.log(`\tbalance: ${ethers.formatEther(await weth.balanceOf(walletAddress))}`);

  //await v2RouterTest(chain, wallet, usdc, 1000);
  //await v3RouterTest(chain, wallet, usdc, wethErc20, 1000);
}

/**
 *
 * V2 Router trade
 *
 */
async function v2RouterTest(chain: ChainType, wallet: Wallet, tokenToBuy: ERC20, ethAmountToSpendInUSD: number) {
  const tokenBalanceBefore = await tokenToBuy.getFormattedTokenBalance(wallet.address);
  console.log(`${tokenToBuy.getName()} balance before: ${tokenBalanceBefore}`);

  console.log(
    `Executing a v2 swap transaction for ${ethAmountToSpendInUSD} USD on ${chain} with wallet ${wallet.address}`,
  );
  const v2Router = new UniswapV2Router(chain);
  const tx: TransactionRequest = await v2Router.createSwapExactETHInputTransaction(
    wallet,
    tokenToBuy,
    ethAmountToSpendInUSD,
  );
  const txResponse = await wallet.sendTransaction(tx);
  await txResponse.wait();

  const tokenBalanceAfter = await tokenToBuy.getFormattedTokenBalance(wallet.address);
  console.log(`${tokenToBuy.getName()} balance after: ${tokenBalanceAfter}`);
}

/**
 *
 * V3 Router trade
 *
 */
async function v3RouterTest(
  chain: ChainType,
  wallet: Wallet,
  inputToken: ERC20,
  outputToken: ERC20,
  tradeAmount: number,
) {
  const v3Router = new UniswapV3SwapRouterV2(chain);
  const quoter = new UniswapV3QuoterV2(chain);

  const rawTradeAmount = ethers.parseUnits(tradeAmount.toString(), inputToken.getDecimals());

  const quoteExactInputSingleParams: QuoteExactInputSingleParams = {
    tokenIn: inputToken.getTokenAddress(),
    tokenOut: outputToken.getTokenAddress(),
    fee: 3000,
    amountIn: rawTradeAmount,
    sqrtPriceLimitX96: 0n,
  };

  const { amountOut, sqrtPriceX96After, initializedTicksCrossed, gasEstimate } = await quoter.quoteExactInputSingle(
    wallet,
    quoteExactInputSingleParams,
  );

  console.log({
    amountOut: ethers.formatUnits(amountOut, outputToken.getDecimals()),
    sqrtPriceX96After: sqrtPriceX96After.toString(),
    initializedTicksCrossed: initializedTicksCrossed,
    gasEstimate: gasEstimate.toString(),
  });

  const exactInputTrade: ExactInputSingleParams = {
    tokenIn: inputToken.getTokenAddress(),
    tokenOut: outputToken.getTokenAddress(),
    fee: 3000,
    recipient: wallet.address,
    amountIn: rawTradeAmount,
    amountOutMinimum: 0n,
    sqrtPriceLimitX96: 0n,
  };

  const routerAllowance = await inputToken.getRawAllowance(wallet.address, v3Router.getRouterAddress());
  console.log(`router allowance: ${ethers.formatUnits(routerAllowance, inputToken.getDecimals())}`);

  if (routerAllowance < rawTradeAmount) {
    console.log("insufficient allowance, approving...");
    const approveAmount = (rawTradeAmount * 105n) / 100n;
    console.log(
      `Approving ${ethers.formatUnits(approveAmount, inputToken.getDecimals())} ${inputToken.getSymbol()} for the v3 router...`,
    );
    const approveTx: TransactionRequest = await inputToken.createApproveTransaction(
      v3Router.getRouterAddress(),
      approveAmount,
    );
    const approveTxResponse = await wallet.sendTransaction(approveTx);
    await approveTxResponse.wait();
    console.log("approved");
  }

  const tx: TransactionRequest = await v3Router.createExactInputSingleTransaction(wallet, exactInputTrade);
  const txResponse = await wallet.sendTransaction(tx);
  const txReceipt = await txResponse.wait();
  if (!txReceipt) throw new Error("tx failed");
  console.log("tx succeeded:", txReceipt?.status);

  const outputTokenBalanceAfter = await outputToken.getFormattedTokenBalance(wallet.address);
  console.log(`${outputToken.getName()} balance after: ${outputTokenBalanceAfter}`);
}

if (require.main === module) {
  /* TIP: To test a different chain
      1. Add chain forking in hardhat.config.ts
      2. Start hardhat with desired fork (e.g. npx hardhat node --hardhat_base)
      3. Update chain variable below
  */

  const hardhatWallet = getHardhatWallet_1();
  const chain = ChainType.ETH;

  forkTesting(hardhatWallet, chain).catch(console.error);
}
