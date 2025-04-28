import { Contract, ethers, Wallet } from "ethers";
import { getHardhatWallet_1 } from "../../../hooks/useSetup";
import { ChainType, getChainConfig } from "../../../config/chain-config";
import { UNIVERSAL_ROUTER_INTERFACE } from "../../../contract-abis/universal-router";
import { UniversalRouter } from "../../../models/universal-router/UniversalRouter";
import { SwapParams } from "../../../models/uniswap-v4/uniswap-v4-types";
import { FeeToTickSpacing } from "../../../models/uniswap-v3/uniswap-v3-types";
import { PoolKey } from "../../../models/uniswap-v4/uniswap-v4-types";
import { FeeAmount } from "../../../models/uniswap-v3/uniswap-v3-types";

export async function v4SwapInteraction(chain: ChainType, wallet: Wallet) {
  const chainConfig = getChainConfig(chain);

  const router = new UniversalRouter(chain);
  const usdcAddress = chainConfig.tokenAddresses.usdc;
  const wethAddress = chainConfig.tokenAddresses.dai;

  // 1) build your PoolKey
  const key: PoolKey = {
    currency0: usdcAddress,
    currency1: wethAddress,
    fee: FeeAmount.LOW,
    tickSpacing: FeeToTickSpacing.get(FeeAmount.LOW)!,
    hooks: ethers.ZeroAddress,
  };

  // 2) build your swap params
  const params: SwapParams = {
    zeroForOne: true,
    amountSpecified: 1n * 10n ** 6n, // e.g. 1 USDC
    sqrtPriceLimitX96: 0n, // no price limit
  };

  // 3) create the single “unlock+swap” command
  const cmd = router.createV4SwapCommand(key, params);
  console.log("cmd:", cmd);

  // 4) execute it atomically
  const tx = await router.execute(wallet, { ...cmd, value: 0n });
  console.log("✅ atomic unlock+swap sent:", tx.hash);
}

if (require.main === module) {
  const wallet = getHardhatWallet_1();
  const chain = ChainType.ETH;
  v4SwapInteraction(chain, wallet).catch(console.error);
}
