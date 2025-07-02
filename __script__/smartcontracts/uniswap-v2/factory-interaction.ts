import { ChainType, getChainConfig } from "../../../src/config/chain-config";
import { getHardhatWallet_1 } from "../../../src/hooks/useSetup";
import { UniswapV2Factory } from "../../../src/smartcontracts/uniswap-v2";

export async function factoryInteraction() {
  const chain = ChainType.ARB;
  const chainConfig = getChainConfig(chain);
  const wallet = getHardhatWallet_1();

  const tokenA = chainConfig.tokenAddresses.weth;
  const tokenB = chainConfig.tokenAddresses.usdc;

  const factory = new UniswapV2Factory(chain);

  const pairAddress = await factory.getPairAddress(tokenA, tokenB, wallet);
  console.log(pairAddress);
}

if (require.main === module) {
  factoryInteraction().catch(console.error);
}
