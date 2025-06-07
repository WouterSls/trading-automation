import { ethers, Wallet } from "ethers";
import { ChainType } from "../../../../src/config/chain-config";

import { getChainConfig } from "../../../../src/config/chain-config";
import { getHardhatWallet_1 } from "../../../../src/hooks/useSetup";
import { validateNetwork } from "../../../../src/lib/utils";
import { UNISWAP_V3_ROUTER_INTERFACE } from "../../../../src/lib/smartcontract-abis/uniswap-v3";
import { FeeAmount, UniswapV3SwapRouterV2 } from "../../../../src/models/smartcontracts/uniswap-v3";

export async function multicallInteraction(chain: ChainType, wallet: Wallet) {
  await validateNetwork(wallet, chain);

  const chainConfig = getChainConfig(chain);

  const USDC_ADDRESS = chainConfig.tokenAddresses.usdc;
  const WETH_ADDRESS = chainConfig.tokenAddresses.weth;
  const DAI_ADDRESS = chainConfig.tokenAddresses.dai;

  const routerAddress = chainConfig.uniswap.v3.swapRouterV2Address;

  console.log("--------------------------------");
  console.log("Chain", chain);
  console.log("--------------------------------");

  console.log("usdc address", USDC_ADDRESS);
  console.log("weth address", WETH_ADDRESS);
  console.log("wallet address", wallet.address);
  console.log("router address", routerAddress);

  const router = new UniswapV3SwapRouterV2(chain);
  const recipient = wallet.address;

  const tokenIn = "0xA0b86a33E6441c95C4567D44D8A"
  const tokenOut = "0xC02aaA39b223FE8D0A0e5C4F27e"
  const fee = FeeAmount.MEDIUM
  const amountIn = ethers.parseEther("1");
  const amountOutMin= 0n;
  const sqrtPriceLimitX96 = 0n;
  // Encode individual function calls
  const swapData = router.encodeExactInputSingle(
      tokenIn ,
      tokenOut,
      fee,
      recipient,
      amountIn,
      amountOutMin,
      sqrtPriceLimitX96
  );


  // Create multicall transaction
  const multicallTx = await router.createMulticallTransaction(
    [swapData],
    Math.floor(Date.now() / 1000) + 1800, // 30 minutes
  );

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
  const chain = ChainType.ETH;
  const wallet = getHardhatWallet_1();

  multicallInteraction(chain, wallet).catch(console.error);
}
