import { ethers, Wallet } from "ethers";
import { ChainType, getChainConfig } from "../../../config/chain-config";
import { getHardhatWallet_1 } from "../../../hooks/useSetup";
import { UniswapV4PoolManager } from "../../../models/uniswap-v4/UniswapV4PoolManager";
import { PoolKey } from "../../../models/uniswap-v4/uniswap-v4-types";
import { FeeAmount } from "../../../models/uniswap-v3/uniswap-v3-types";
import { validateNetwork } from "../../../lib/utils";
import { getPoolKeyAndId } from "../../../models/uniswap-v4/uniswap-v4-utils";
import { UniswapV4StateView } from "../../../models/uniswap-v4/UniswapV4StateView";
import { UniswapV4PositionManager } from "../../../models/uniswap-v4/UniswapV4PositionManager";
export async function poolManagerInteraction(chain: ChainType, wallet: Wallet) {
  await validateNetwork(wallet, chain);

  const chainConfig = getChainConfig(chain);

  const usdcAddress = chainConfig.tokenAddresses.usdc;
  const wethAddress = chainConfig.tokenAddresses.weth;

  const { poolId } = getPoolKeyAndId(usdcAddress, wethAddress, FeeAmount.MEDIUM);

  const poolKey: PoolKey = {
    currency0: usdcAddress,
    currency1: wethAddress,
    fee: FeeAmount.MEDIUM,
    tickSpacing: 60,
    hooks: ethers.ZeroAddress,
  };

  const poolManager = new UniswapV4PoolManager(chain);
  const positionManager = new UniswapV4PositionManager(chain);
  const stateView = new UniswapV4StateView(chain);

  console.log("Pool Key:", poolKey);
  console.log("Pool ID:", poolId);
  const poolManagerAddress = await stateView.getPoolManager(wallet);
  console.log("Pool Manager Address:", poolManagerAddress);
  const name = await positionManager.getName(wallet);
  console.log("Position Manager Name:", name);

  const poolKeys = await positionManager.getPoolKeys(wallet, poolId);
  console.log("Pool Keys:", poolKeys);

  //await poolManager.validateIsPoolManager(wallet);
}

if (require.main === module) {
  const chain = ChainType.ETH;
  const wallet = getHardhatWallet_1();
  poolManagerInteraction(chain, wallet).catch(console.error);
}
