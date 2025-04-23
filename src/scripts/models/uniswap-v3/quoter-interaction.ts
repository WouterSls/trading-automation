import { ethers, Wallet } from "ethers";
import { ChainType } from "../../../config/chain-config";

import { getChainConfig } from "../../../config/chain-config";
import { getBaseWallet_2, getEthWallet_2 } from "../../../hooks/useSetup";
import { validateNetwork } from "../../../lib/utils";
import { UniswapV2Quoter } from "../../../models/uniswap-v3";
import { QuoteExactInputSingleParams } from "../../../models/uniswap-v3/uniswap-v3-types";

export async function quoterInteraction(chain: ChainType, wallet: Wallet) {
  await validateNetwork(wallet, chain);

  const chainConfig = getChainConfig(chain);

  const USDC_ADDRESS = chainConfig.tokenAddresses.usdc;
  const WETH_ADDRESS = chainConfig.tokenAddresses.weth;

  const quoterAddress = chainConfig.uniswapV3.quoterV2Address;

  console.log("--------------------------------");
  console.log("Chain", chain);
  console.log("--------------------------------");

  console.log("usdc address", USDC_ADDRESS);
  console.log("weth address", WETH_ADDRESS);
  console.log("wallet address", wallet.address);
  console.log("quoter address", quoterAddress);

  const quoter = new UniswapV2Quoter(chain);

  const tradeAmount = 100;
  const amountIn = ethers.parseEther(tradeAmount.toString());
  console.log();
  console.log("Trading", tradeAmount, "WETH -> USDC");

  const quoteInputParams: QuoteExactInputSingleParams = {
    tokenIn: WETH_ADDRESS,
    tokenOut: USDC_ADDRESS,
    fee: 3000,
    amountIn,
    sqrtPriceLimitX96: 0,
  };

  const { amountOut } = await quoter.quoteExactInputSingle(wallet, quoteInputParams);

  const amountOutFormatted = ethers.formatUnits(amountOut, 6);
  console.log("Amount out", amountOutFormatted, "USDC");
}

if (require.main === module) {
  const base = ChainType.BASE;
  const baseWallet = getBaseWallet_2();

  const eth = ChainType.ETH;
  const ethWallet = getEthWallet_2();

  //quoterInteraction(base, baseWallet).catch(console.error);
  quoterInteraction(base, baseWallet).catch(console.error);
}
