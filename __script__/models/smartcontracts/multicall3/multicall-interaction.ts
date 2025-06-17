import { ethers, TransactionRequest, Wallet } from "ethers";
import { ChainType } from "../../../../src/config/chain-config";

import { getChainConfig } from "../../../../src/config/chain-config";
import { getHardhatWallet_1 } from "../../../../src/hooks/useSetup";
import { decodeLogs, validateNetwork } from "../../../../src/lib/utils";
import { FeeAmount, UniswapV3QuoterV2, UniswapV3SwapRouterV2 } from "../../../../src/models/smartcontracts/uniswap-v3";
import { TRADING_CONFIG } from "../../../../src/config/trading-config";
import { createMinimalErc20 } from "../../../../src/models/smartcontracts/ERC/erc-utils";
import { WETH_INTERFACE, UNISWAP_V3_QUOTER_INTERFACE } from "../../../../src/lib/smartcontract-abis/_index";
import { Multicall3 } from "../../../../src/models/smartcontracts/multicall3/Multicall3";
import { Call3, Call3Result } from "../../../../src/models/smartcontracts/multicall3/multicall3-types";

export async function multicallInteraction() {
  const chain: ChainType = ChainType.ETH;
  const wallet = getHardhatWallet_1();
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

  const multiCall3 = new Multicall3(chain);
  const uniswapV3Quoter = new UniswapV3QuoterV2(chain);

  const PEPE_ADDRESS = "0x6982508145454ce325ddbe47a25d4ec3d2311933";
  const inputToken = await createMinimalErc20(PEPE_ADDRESS, wallet.provider!)

  const tokenIn = inputToken.getTokenAddress();
  const amountIn = ethers.parseUnits('1',inputToken.getDecimals())
  const tokenOut = chainConfig.tokenAddresses.weth;
  const recipient = wallet.address;
  const amountOutMin = 0n
  const sqrtPriceLimitX96 = 0n

  const encodedFeeData1 = uniswapV3Quoter.encodeQuoteExactInputSingle(tokenIn,tokenOut,FeeAmount.LOWEST,recipient,amountIn,amountOutMin,sqrtPriceLimitX96);
  const encodedFeeData2 = uniswapV3Quoter.encodeQuoteExactInputSingle(tokenIn,tokenOut,FeeAmount.LOW,recipient,amountIn,amountOutMin,sqrtPriceLimitX96);
  const encodedFeeData3 = uniswapV3Quoter.encodeQuoteExactInputSingle(tokenIn,tokenOut,FeeAmount.MEDIUM,recipient,amountIn,amountOutMin,sqrtPriceLimitX96);
  const encodedFeeData4 = uniswapV3Quoter.encodeQuoteExactInputSingle(tokenIn,tokenOut,FeeAmount.HIGH,recipient,amountIn,amountOutMin,sqrtPriceLimitX96);

  const fee1Call: Call3 = {
    target: uniswapV3Quoter.getQuoterAddress(),
    allowFailure: true,
    callData:encodedFeeData1
  }
  const fee2Call: Call3 = {
    target: uniswapV3Quoter.getQuoterAddress(),
    allowFailure: true,
    callData:encodedFeeData2 
  }

  const fee3Call: Call3 = {
    target: uniswapV3Quoter.getQuoterAddress(),
    allowFailure: true,
    callData:encodedFeeData3 
  }

  const multicallTuple = [
    fee1Call,
    fee2Call,
    fee3Call
  ]

  const results: Call3Result[] = await multiCall3.aggregate3StaticCall(wallet,multicallTuple);
  console.log(results);
  
  for (const [index, result] of results.entries()) {
    console.log(`Call ${index} succeeded?`)
    console.log(result.success);

    if (result.success) {
        const {amountOut} = uniswapV3Quoter.decodeQuoteExactInputSingleResult(result.returnData);
        console.log("raw amount out:")
        console.log(amountOut);
        const formattedAmountOut = ethers.formatEther(amountOut)
        console.log("amount received:")
        console.log(formattedAmountOut)
    }
    console.log()
  }
}

if (require.main === module) {
  multicallInteraction().catch(console.error);
}
