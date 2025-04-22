import { ethers, Wallet, TransactionRequest } from "ethers";

import { ChainType, getChainConfig } from "../../../config/chain-config";
import { ExactInputSingleParams } from "../../../models/uniswap-v3/uniswap-v3-types";

import { UniswapV3Router } from "../../../models/uniswap-v3/UniswapV3Router";
import { UniswapV3Factory } from "../../../models/uniswap-v3/UniswapV3Factory";
import {
  getEthWallet_1,
  getArbitrumWallet_1,
  getBaseWallet_1,
  getArbitrumWallet_2,
  getEthWallet_2,
  getBaseWallet_2,
} from "../../../hooks/useSetup";
import { createMinimalErc20, validateNetwork } from "../../../lib/utils";

async function routerInteraction(chain: ChainType, wallet: Wallet) {
  await validateNetwork(wallet, chain);

  const chainConfig = getChainConfig(chain);

  const USDC_ADDRESS = chainConfig.tokenAddresses.usdc;
  const WETH_ADDRESS = chainConfig.tokenAddresses.weth;
  const ROUTER_ADDRESS = chainConfig.uniswapV3.swapRouterV2Address;
  const FACTORY_ADDRESS = chainConfig.uniswapV3.factoryAddress;

  if (!USDC_ADDRESS || USDC_ADDRESS.trim() === "") {
    throw new Error("Missing required USDC address");
  }

  if (!WETH_ADDRESS || WETH_ADDRESS.trim() === "") {
    throw new Error("Missing required WETH address");
  }

  if (!ROUTER_ADDRESS || ROUTER_ADDRESS.trim() === "") {
    throw new Error("Missing required Router address");
  }

  if (!FACTORY_ADDRESS || FACTORY_ADDRESS.trim() === "") {
    throw new Error("Missing required Factory address");
  }

  console.log("--------------------------------");
  console.log("Chain", chain);
  console.log("--------------------------------");

  console.log("usdc address", USDC_ADDRESS);
  console.log("weth address", WETH_ADDRESS);
  console.log("wallet address", wallet.address);
  console.log("router address", ROUTER_ADDRESS);

  console.log();

  const router = new UniswapV3Router(chain);
  const factory = new UniswapV3Factory(chain);

  const pool = await factory.getPool(wallet, USDC_ADDRESS, WETH_ADDRESS, 3000);
  const usdcContract = await createMinimalErc20(USDC_ADDRESS, wallet.provider!);
  const wethContract = await createMinimalErc20(WETH_ADDRESS, wallet.provider!);
  const gasBalance = await wallet.provider!.getBalance(wallet.address);

  console.log("USDC/WETH pool", pool.getPoolAddress());
  console.log("raw usdc amount:", await usdcContract.getRawTokenBalance(wallet.address));
  console.log("raw weth amount:", await wethContract.getRawTokenBalance(wallet.address));
  console.log("pool weth balance", await wethContract.getFormattedTokenBalance(pool.getPoolAddress()));
  console.log("pool usdc balance", await usdcContract.getFormattedTokenBalance(pool.getPoolAddress()));
  console.log("wallet gas balance:", ethers.formatEther(gasBalance));

  console.log();

  const inputAmount = ethers.parseUnits("0.01", usdcContract.getDecimals());
  console.log("input amount", inputAmount);

  const routerAllowance = await usdcContract.getRawAllowance(wallet.address, ROUTER_ADDRESS);
  console.log("router allowance", routerAllowance);

  if (routerAllowance <= inputAmount) {
    const approveAmount = (inputAmount * 105n) / 100n;
    console.log("Approving router for", approveAmount, "USDC...");
    const approveTx = await usdcContract.createApproveTransaction(ROUTER_ADDRESS, approveAmount);
    const approveTxHash = await wallet.sendTransaction(approveTx);
    const approveTxReceipt = await approveTxHash.wait();
    console.log("Approve transaction receipt:", approveTxReceipt);
  } else {
    console.log("Router allowance is sufficient, skipping approve transaction");
  }

  const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes in seconds
  console.log("Deadline:", deadline);
  console.log("Deadline as date:", new Date(deadline * 1000)); // Convert to ms for display only

  const exactInputTrade: ExactInputSingleParams = {
    tokenIn: USDC_ADDRESS,
    tokenOut: WETH_ADDRESS,
    fee: 3000,
    recipient: wallet.address,
    deadline: deadline,
    amountIn: inputAmount,
    amountOutMinimum: 0n,
    sqrtPriceLimitX96: 0n,
  };

  console.log("Exact input trade:", exactInputTrade);

  console.log("Creating transaction...");
  const tx: TransactionRequest = await router.createExactInputSingleTransaction(wallet, exactInputTrade);
  const txHash = await wallet.sendTransaction(tx);
  console.log("Transaction hash:", txHash);
}

if (require.main === module) {
  const baseWallet = getBaseWallet_1();

  const arbWallet2 = getArbitrumWallet_2();

  const base = ChainType.BASE;
  const arb = ChainType.ARB;

  routerInteraction(arb, arbWallet2).catch(console.error);
}
