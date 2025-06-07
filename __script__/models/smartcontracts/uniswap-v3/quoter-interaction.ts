import { ethers, Wallet } from "ethers";
import { ChainType } from "../../../../src/config/chain-config";

import { getChainConfig } from "../../../../src/config/chain-config";
import { getBaseWallet_1, getEthWallet_1 } from "../../../../src/hooks/useSetup";
import { validateNetwork } from "../../../../src/lib/utils";
import { UniswapV3QuoterV2 } from "../../../../src/models/smartcontracts/uniswap-v3";
import { FeeAmount } from "../../../../src/models/smartcontracts/uniswap-v3/uniswap-v3-types";
import { encodePath } from "../../../../src/models/smartcontracts/uniswap-v3/uniswap-v3-utils";

export async function quoterInteraction(chain: ChainType, wallet: Wallet) {
  await validateNetwork(wallet, chain);

  const chainConfig = getChainConfig(chain);

  const USDC_ADDRESS = chainConfig.tokenAddresses.usdc;
  const WETH_ADDRESS = chainConfig.tokenAddresses.weth;
  const DAI_ADDRESS = chainConfig.tokenAddresses.dai;

  const quoterAddress = chainConfig.uniswap.v3.quoterV2Address;

  console.log("--------------------------------");
  console.log("Chain", chain);
  console.log("--------------------------------");

  console.log("usdc address", USDC_ADDRESS);
  console.log("weth address", WETH_ADDRESS);
  console.log("wallet address", wallet.address);
  console.log("quoter address", quoterAddress);

  const quoter = new UniswapV3QuoterV2(chain);

  const wethTradeAmount = 1;
  const wethAmountIn = ethers.parseEther(wethTradeAmount.toString());
  console.log();
  console.log("Trading", wethTradeAmount, "WETH -> USDC");

  const tokenA = WETH_ADDRESS;
  const tokenB = USDC_ADDRESS;
  const fee = FeeAmount.LOW;
  const amountIn = wethAmountIn;
  const amountOutMin = 0n;
  const sqrtPriceLimitX96 = 0n;

  const { amountOut } = await quoter.quoteExactInputSingle(
    wallet,
    tokenA,
    tokenB,
    fee,
    wallet.address,
    amountIn,
    amountOutMin,
    sqrtPriceLimitX96,
  );
  const amountOutFormatted = ethers.formatUnits(amountOut, 6);
  console.log("Amount out", amountOutFormatted, "USDC");
  console.log();

  const usdcTradeAmount = 100;
  const usdcAmountIn = ethers.parseUnits(usdcTradeAmount.toString(), 6);
  console.log("Trading", usdcTradeAmount, "USDC -> WETH -> DAI");

  const tokensToTrade = [USDC_ADDRESS, WETH_ADDRESS, DAI_ADDRESS];
  const fees = [FeeAmount.MEDIUM, FeeAmount.MEDIUM];
  const encodedPath = encodePath(tokensToTrade, fees);

  const { amountOut: amountOut2 } = await quoter.quoteExactInput(wallet, encodedPath, usdcAmountIn);
  const amountOut2Formatted = ethers.formatUnits(amountOut2, 18);
  console.log("Amount out", amountOut2Formatted, "DAI");
}

if (require.main === module) {
  const base = ChainType.BASE;
  const baseWallet = getBaseWallet_1();

  const eth = ChainType.ETH;
  const ethWallet = getEthWallet_1();

  //quoterInteraction(base, baseWallet).catch(console.error);
  quoterInteraction(eth, ethWallet).catch(console.error);
}
