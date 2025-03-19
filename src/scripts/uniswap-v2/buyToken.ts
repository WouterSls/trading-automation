import { Wallet } from "ethers";
import { UniswapV2Router } from "../../models/UniswapV2Router";
import { getBaseChainConfig, getBaseWallet_1, TRADING_CONFIG } from "../../config/trading-config";
import { ChainConfig } from "../../config/chain-config";
import { BASE_VIRTUAL_ADDRESS } from "../../token-addresses";
import { createMinimalErc20 } from "../../utils";

async function buyToken(usdAmount: number, _tokenAddress?: string, _wallet?: Wallet) {
  const wallet: Wallet = _wallet || (await getBaseWallet_1());
  const chainConfig: ChainConfig = await getBaseChainConfig();
  const tokenAddress = _tokenAddress || BASE_VIRTUAL_ADDRESS;

  const erc20 = await createMinimalErc20(tokenAddress, wallet.provider!);

  const router = new UniswapV2Router(wallet, chainConfig);

  const tradeSuccessInfo = await router.swapEthInUsdForToken(erc20, usdAmount);
  return tradeSuccessInfo;
}

if (require.main === module) {
  buyToken(TRADING_CONFIG.USD_TEST_SIZE).catch(console.error);
}

export { buyToken };
