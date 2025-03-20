import { Wallet } from "ethers";
import { UniswapV2Router } from "../../models/uniswap-v2/UniswapV2Router";
import { getAlchemyApi, getBaseChainConfig, getBaseWallet_1, TRADING_CONFIG } from "../../config/setup-config";
import { ChainConfig } from "../../config/chain-config";
import { BASE_VIRTUAL_ADDRESS } from "../../lib/token-addresses";
import { createMinimalErc20 } from "../../lib/utils";
import { PriceData, NetworkEnum, AddressPriceData } from "../../lib/types/alchemy-api.types";

async function buyToken(usdAmount: number, _tokenAddress?: string, _wallet?: Wallet) {
  const wallet: Wallet = _wallet || (await getBaseWallet_1());
  const chainConfig: ChainConfig = await getBaseChainConfig();
  const alchemyApi = await getAlchemyApi();

  const tokenAddress = _tokenAddress || BASE_VIRTUAL_ADDRESS;


  const erc20 = await createMinimalErc20(tokenAddress, wallet.provider!);
  const tokenPriceData: AddressPriceData = await alchemyApi.getTokenPrice(NetworkEnum.BASE, tokenAddress);

  const tokenPrice = parseFloat(tokenPriceData.prices[0].value);
  const tokenCurrency = tokenPriceData.prices[0].currency;

  console.log("----------------BUYING TOKEN----------------");
  console.log(`${erc20.getName()}: ${tokenPrice.toFixed(2)} ${tokenCurrency}`);
  console.log();
  console.log("buying tokens for:", usdAmount ,"USD");
  console.log();
  console.log("Initalizing V2 Router...");
  const router = new UniswapV2Router(wallet, chainConfig);

  console.log("Swapping ETH for token...");
  /**
  const tradeSuccessInfo = await router.swapEthInUsdForToken(erc20, usdAmount);

  console.log("Trade successful!");
  console.log("tx hash: ", tradeSuccessInfo.transactionHash);
  return tradeSuccessInfo;
 */
}

if (require.main === module) {
  buyToken(TRADING_CONFIG.USD_TEST_SIZE).catch(console.error);
}

export { buyToken };
