import { ethers, TransactionRequest, Wallet } from "ethers";
import { ChainType } from "../../../src/config/chain-config";

import { getChainConfig } from "../../../src/config/chain-config";
import { getHardhatWallet_1 } from "../../../src/hooks/useSetup";
import { decodeLogs, validateNetwork } from "../../../src/lib/utils";
import { UNISWAP_V3_ROUTER_INTERFACE } from "../../../src/lib/smartcontract-abis/uniswap-v3";
import { FeeAmount, UniswapV3SwapRouterV2 } from "../../../src/smartcontracts/uniswap-v3";
import { TRADING_CONFIG } from "../../../src/config/trading-config";
import { createMinimalErc20 } from "../../../src/smartcontracts/ERC/erc-utils";
import { WETH_INTERFACE } from "../../../src/lib/smartcontract-abis/erc20";

export async function multicallInteraction() {
  const chain: ChainType = ChainType.ETH;
  const wallet = getHardhatWallet_1();
  const chainConfig = getChainConfig(chain);
  const blockNumber = await wallet.provider!.getBlockNumber();

  const usdcAddress = chainConfig.tokenAddresses.usdc;
  const wethAddress = chainConfig.tokenAddresses.weth;
  const usdc = await createMinimalErc20(usdcAddress, wallet.provider!);
  const weth = await createMinimalErc20(wethAddress, wallet.provider!);

  if (!usdc || !weth) throw new Error("Error during ERC20 token creation");

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

  const ethInput = ethers.parseEther("1");
  const uniswapV3Router = new UniswapV3SwapRouterV2(chain);

  // --------UNISWAP V3 MULTICALL SINGLE TRANSACTION TRADE | ETH -> WETH -> USDC
  const wrapEthTxData = UNISWAP_V3_ROUTER_INTERFACE.encodeFunctionData("wrapETH", [ethInput]);

  const tokenIn = wethAddress;
  const tokenOut = usdcAddress;
  const fee = FeeAmount.LOW;
  const recipient = wallet.address;
  const amountIn = ethInput;
  //const amountOutMin = (ethInput * 95n) / 100n;
  const amountOutMin = 0n;
  const sqrtPriceLimitX96 = 0n;

  const exactInputSingleTxData = uniswapV3Router.encodeExactInputSingle(
    tokenIn,
    tokenOut,
    fee,
    recipient,
    amountIn,
    amountOutMin,
    sqrtPriceLimitX96,
  );

  const pullTxData = UNISWAP_V3_ROUTER_INTERFACE.encodeFunctionData("pull", [wethAddress, ethInput]);

  /// @notice Transfers the full amount of a token held by this contract to recipient
  /// @dev The amountMinimum parameter prevents malicious contracts from stealing the token from users
  /// @param token The contract address of the token which will be transferred to `recipient`
  /// @param amountMinimum The minimum amount of token required for a transfer
  /// @param recipient The destination address of the token
  const tokenToSweep = "";
  const sweepTokenTxData = UNISWAP_V3_ROUTER_INTERFACE.encodeFunctionData("sweepToken", [
    tokenToSweep,
    amountOutMin,
    wallet.address,
  ]);

  /// @notice Refunds any ETH balance held by this contract to the `msg.sender`
  /// @dev Useful for bundling with mint or increase liquidity that uses ether, or exact output swaps
  /// that use ether for the input amount
  const refundETHTxData = UNISWAP_V3_ROUTER_INTERFACE.encodeFunctionData("refundETH", []);

  /**
   * Incorrect Approval: approveMax(WETH_ADDRESS) doesn't approve your tokens for the router - it actually has the router approve itself as a spender for another protocol component. This is meant for advanced token handling within Uniswap's infrastructure.
   *
   */
  const approveMaxTxData = UNISWAP_V3_ROUTER_INTERFACE.encodeFunctionData("approveMax", [wethAddress]);

  const multicallTx = uniswapV3Router.createMulticallTransaction(TRADING_CONFIG.DEADLINE, [exactInputSingleTxData]);

  multicallTx.value = ethInput;

  /**
  const wrapEthTx: TransactionRequest = {
    to: uniswapV3Router.getRouterAddress(),
    data: wrapEthTxData,
    value: ethInput,
  };
 */
  const txResponse = await wallet.sendTransaction(multicallTx);
  const txReceipt = await txResponse.wait(1);

  /**
  const txResponse = await wallet.sendTransaction(depositTx);
  const txReceipt = await txResponse.wait(1);
 */

  if (!txReceipt) {
    throw new Error("Deposit transaction failed");
  }

  const logs = decodeLogs(txReceipt.logs);
  console.log("LOGS");
  console.log("--------------------------------");
  console.log(logs);
  console.log("--------------------------------");

  const balanceOfTxData = WETH_INTERFACE.encodeFunctionData("balanceOf", [wallet.address]);
  const tx: TransactionRequest = {
    to: wethAddress,
    data: balanceOfTxData,
  };

  const depositTxData = WETH_INTERFACE.encodeFunctionData("deposit", []);
  const depositTx: TransactionRequest = {
    to: wethAddress,
    data: depositTxData,
    value: ethers.parseEther("1"),
  };

  const balanceOf = await wallet.call(tx);
  const formattedBalanceOf = ethers.formatEther(balanceOf);
  console.log("WETH balance after transaction:");
  console.log(formattedBalanceOf);
  // Example: Self permit + swap in one transaction
  /**
  const permitData = ROUTER_INTERFACE.encodeFunctionData("selfPermit", [tokenAddress, amount, deadline, v, r, s]);
  const swapData = ROUTER_INTERFACE.encodeFunctionData("exactInputSingle", [swapParams]);
  const tx = await routerContract.multicall([permitData, swapData]);
  */

  // Example: Multicall with deadline
  /**
  const multicallData = [
    ROUTER_INTERFACE.encodeFunctionData("exactInputSingle", [swapParams]),
    ROUTER_INTERFACE.encodeFunctionData("refundETH", []),
  ];
  const tx = await routerContract.multicall(deadline, multicallData);
  */
}

if (require.main === module) {
  multicallInteraction().catch(console.error);
}
