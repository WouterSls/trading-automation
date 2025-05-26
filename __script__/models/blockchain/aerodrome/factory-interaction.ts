import { ChainType, getChainConfig } from "../../../../src/config/chain-config";
import { getHardhatWallet_1 } from "../../../../src/hooks/useSetup";
import { AerodromePoolFactory } from "../../../../src/models/blockchain/aerodrome/AerodromePoolFactory";
import { createMinimalErc20 } from "../../../../src/models/blockchain/ERC/erc-utils";

export async function factoryInteraction() {
  const chain = ChainType.BASE;
  const chainConfig = getChainConfig(chain);
  const wallet = getHardhatWallet_1();

  const aerodromeFactory = new AerodromePoolFactory(chain);

  const tokenA = chainConfig.tokenAddresses.usdc;
  const tokenB = chainConfig.tokenAddresses.dai;

  const usdc = await createMinimalErc20(tokenA, wallet.provider!);
  console.log(`${usdc.getName()} (${tokenA})`);

  const dai = await createMinimalErc20(tokenB, wallet.provider!);
  console.log(`${dai.getName()} (${tokenB})`);

  const poolAddress = await aerodromeFactory.getPoolAddress(wallet, tokenA, tokenB, true);
  console.log("pool address:", poolAddress);
}

if (require.main === module) {
  factoryInteraction().catch(console.error);
}
