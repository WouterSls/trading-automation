import { getTheGraphApi } from "../../src/hooks/useSetup";
import { TheGraphApi } from "../../src/external-apis/thegraph/TheGraphApi";
import { ChainType } from "../../src/config/chain-config";

async function getPoolInfo() {
  const chain = ChainType.BASE;
  const graphApi: TheGraphApi = await getTheGraphApi();

  const AERO_ADDRESS = "0x940181a94A35A4569E4529A3CDfB74e38FD98631";
  const GAME_ADDRESS = "0x1c4cca7c5db003824208adda61bd749e55f463a3";

  const pools = await graphApi.getTopUniV3Pools(ChainType.BASE, GAME_ADDRESS);
  const pools2 = await graphApi.getTopUniV3PoolsByTokenAmount(ChainType.BASE, GAME_ADDRESS);

  console.log("-------------Pools Info-------------");
  for (const pool of pools2) {
    console.log("address:", pool.id);
    console.log("fee:", pool.feeTier);
    console.log("Token0: ", pool.token0);
    console.log("TVL Token0", pool.totalValueLockedToken0);
    console.log("Token1: ", pool.token1);
    console.log("TVL Token1", pool.totalValueLockedToken1);
    console.log("TVL USD: ", pool.totalValueLockedUSD);
    console.log("Liquidity:", pool.liquidity);
    console.log("----------------------------------");
  }
}

if (require.main === module) {
  getPoolInfo().catch(console.error);
}

export { getPoolInfo };
