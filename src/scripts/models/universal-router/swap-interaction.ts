import { Contract, Wallet } from "ethers";
import { getHardhatWallet_1 } from "../../../hooks/useSetup";
import { ChainType, getChainConfig } from "../../../config/chain-config";
import { UNIVERSAL_ROUTER_INTERFACE } from "../../../contract-abis/universal-router";

export async function v4SwapInteraction(chain: ChainType, wallet: Wallet) {
  const chainConfig = getChainConfig(chain);
  const universalRouterAddress = chainConfig.uniswap.universalRouterAddress;

  const contract = new Contract(universalRouterAddress, UNIVERSAL_ROUTER_INTERFACE, wallet);

  const commands = [0x01, 0x02, 0x03];
  const inputs = [0x04, 0x05, 0x06];

  try {
    await contract.execute(commands, inputs);
  } catch (error) {
    console.error("Error:", error);
  }
}

if (require.main === module) {
  const wallet = getHardhatWallet_1();
  const chain = ChainType.ETH;
  v4SwapInteraction(chain, wallet).catch(console.error);
}
