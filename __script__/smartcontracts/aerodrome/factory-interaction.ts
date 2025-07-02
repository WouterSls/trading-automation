import { ChainType, getChainConfig } from "../../../src/config/chain-config";
import { getHardhatWallet_1 } from "../../../src/hooks/useSetup";
import { createMinimalErc20 } from "../../../src/smartcontracts/ERC/erc-utils";
import { AerodromePoolFactory } from "../../../src/smartcontracts/aerodrome/AerodromePoolFactory";

export async function factoryInteraction() {
  const chain = ChainType.BASE;
  const chainConfig = getChainConfig(chain);
  const wallet = getHardhatWallet_1();

  const aerodromeFactory = new AerodromePoolFactory(chain);

  const tokenA = chainConfig.tokenAddresses.usdc;
  const tokenB = chainConfig.tokenAddresses.dai;

  const usdc = await createMinimalErc20(tokenA, wallet.provider!);
  if (!usdc) throw new Error("Error during USDC token creation")
  console.log(`${usdc.getName()} (${tokenA})`);

  const dai = await createMinimalErc20(tokenB, wallet.provider!);
  if (!dai) throw new Error("Error during DAI token creation")
  console.log(`${dai.getName()} (${tokenB})`);

  const poolAddress = await aerodromeFactory.getPoolAddress(wallet, tokenA, tokenB, true);
  console.log("pool address:", poolAddress);
}

if (require.main === module) {
  factoryInteraction().catch(console.error);
}
