import { ChainType } from "../../config/chain-config";
import { GeckoTerminalApi } from "../../services/GeckoTerminalApi";

export async function getNewPools(chain: ChainType) {
  const api = new GeckoTerminalApi();
  await api.getNewPools(chain);
}

if (require.main === module) {
  getNewPools(ChainType.BASE);
}
