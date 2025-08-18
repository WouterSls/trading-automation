import { ChainType } from "../../src/config/chain-config";
import { GeckoTerminalApi } from "../../src/external-apis/coingecko/GeckoTerminalApi";

export async function getNewPools(chain: ChainType) {
  const api = new GeckoTerminalApi();
  await api.getNewPools(chain);
}

if (require.main === module) {
  getNewPools(ChainType.BASE);
}
