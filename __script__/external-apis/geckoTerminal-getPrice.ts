import { ChainType } from "../../src/config/chain-config";
import { GeckoTerminalApi } from "../../src/external-apis/GeckoTerminalApi";

export async function getPrice(chain: ChainType, tokenAddress: string) {
  const api = new GeckoTerminalApi();
  await api.getTokenPriceData(chain, tokenAddress);
}

const VIRTUAL_ADDRESS = "0x0b3e328455c4059eeb9e3f84b5543f74e24e7e1b";

if (require.main === module) {
  getPrice(ChainType.BASE, VIRTUAL_ADDRESS);
}
