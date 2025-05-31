import { ethers, Wallet } from "ethers";
import { ChainType } from "../../../../src/config/chain-config";

import { getChainConfig } from "../../../../src/config/chain-config";
import { getHardhatWallet_1 } from "../../../../src/hooks/useSetup";
import { validateNetwork } from "../../../../src/lib/utils";
import { UniswapV2RouterV2 } from "../../../../src/models/blockchain/uniswap-v2";
import { ROUTER_INTERFACE } from "../../../../src/lib/contract-abis/uniswap-v3";
import { UniswapV3SwapRouterV2 } from "../../../../src/models/blockchain/uniswap-v3";

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

  // Encode individual function calls
  const swapData = router.encodeFunctionData("exactInputSingle", [
    {
      tokenIn: "0xA0b86a33E6441c95C4567D44D8A",
      tokenOut: "0xC02aaA39b223FE8D0A0e5C4F27e",
      fee: 3000,
      recipient: wallet.address,
      amountIn: ethers.parseEther("1"),
      amountOutMinimum: 0n,
      sqrtPriceLimitX96: 0n,
    },
  ]);

  const refundData = router.encodeFunctionData("refundETH", []);

  // Create multicall transaction
  const multicallTx = await router.createMulticallTransaction(
    [swapData, refundData],
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
