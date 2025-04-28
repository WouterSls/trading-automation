import { Wallet } from "ethers";
import { ChainType } from "../../../config/chain-config";
import { getHardhatWallet_1 } from "../../../hooks/useSetup";
import { UniswapV4PoolManager } from "../../../models/uniswap-v4/UniswapV4PoolManager";
import { validateNetwork } from "../../../lib/utils";

export async function poolManagerInteraction(chain: ChainType, wallet: Wallet) {
  await validateNetwork(wallet, chain);

  const poolManager = new UniswapV4PoolManager(chain);
  console.log("validating pool manager");
  await poolManager.validateIsPoolManager(wallet);
  console.log("pool manager validated");
}

if (require.main === module) {
  const chain = ChainType.ETH;
  const wallet = getHardhatWallet_1();
  poolManagerInteraction(chain, wallet).catch(console.error);
}
