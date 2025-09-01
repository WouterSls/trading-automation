import { Wallet } from "ethers";
import { ChainType } from "../../../src/config/chain-config";
import { getHardhatWallet_1 } from "../../../src/hooks/useSetup";
import { UniswapV4PoolManager } from "../../../src/smartcontracts/uniswap-v4/UniswapV4PoolManager";
import { validateNetwork } from "../../../src/lib/utils";

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
