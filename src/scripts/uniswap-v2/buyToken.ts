import { Wallet } from "ethers";
import { UniswapV2Router } from "../../models/UniswapV2Router";
import { getBaseChainConfig, getBaseWallet_1, TRADING_CONFIG } from "../../config/setup-config";
import { ChainConfig } from "../../config/chain-config";
import { BASE_VIRTUAL_ADDRESS } from "../../lib/token-addresses";
import { createMinimalErc20 } from "../../lib/utils";

async function buyToken(usdAmount: number, _tokenAddress?: string, _wallet?: Wallet) {
  const wallet: Wallet = _wallet || (await getBaseWallet_1());
  const chainConfig: ChainConfig = await getBaseChainConfig();
  const tokenAddress = _tokenAddress || BASE_VIRTUAL_ADDRESS;


  const erc20 = await createMinimalErc20(tokenAddress, wallet.provider!);

  console.log("Buying token on network: ", chainConfig.name);

  console.log("Initalizing V2 Router...");
  const router = new UniswapV2Router(wallet, chainConfig);

  console.log("Swapping ETH for token...");
  const tradeSuccessInfo = await router.swapEthInUsdForToken(erc20, usdAmount);

  console.log("Trade successful!");
  console.log("tx hash: ", tradeSuccessInfo.transactionHash);
  return tradeSuccessInfo;
}

if (require.main === module) {
  buyToken(TRADING_CONFIG.USD_TEST_SIZE).catch(console.error);
}

export { buyToken };
