import { ethers, Wallet } from "ethers";
import { ChainType, getChainConfig } from "../../../config/chain-config";
import { getHardhatWallet_1 } from "../../../hooks/useSetup";
import { UniswapV4PoolManager } from "../../../models/uniswap-v4/UniswapV4PoolManager";
import { PoolKey } from "../../../models/uniswap-v4/uniswap-v4-types";
import { FeeAmount, FeeToTickSpacing } from "../../../models/uniswap-v3/uniswap-v3-types";
import { validateNetwork } from "../../../lib/utils";
import { computePoolId } from "../../../models/uniswap-v4/uniswap-v4-utils";

export async function poolManagerInteraction(chain: ChainType, wallet: Wallet) {
  await validateNetwork(wallet, chain);

  const chainConfig = getChainConfig(chain);

  const usdcAddress = chainConfig.tokenAddresses.usdc;
  const wethAddress = chainConfig.tokenAddresses.weth;

  //const poolManager = new UniswapV4PoolManager(chain);

  const poolKey: PoolKey = {
    currency0: usdcAddress,
    currency1: wethAddress,
    fee: FeeAmount.MEDIUM,
    tickSpacing: FeeToTickSpacing.get(FeeAmount.MEDIUM)!,
    hooks: ethers.ZeroAddress,
  };

  console.log("Pool Key:", poolKey);
  const poolId = computePoolId(poolKey);
  console.log("Pool ID:", poolId);

  //await poolManager.validateIsPoolManager(wallet);
}

if (require.main === module) {
  const chain = ChainType.ETH;
  const wallet = getHardhatWallet_1();
  poolManagerInteraction(chain, wallet).catch(console.error);
}
