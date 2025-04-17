import { Wallet } from "ethers";
import { getArbitrumWallet_1, TRADING_CONFIG } from "../../hooks/useSetup";
import { ARB_ARB_ADDRESS } from "../../lib/token-addresses";
import { createMinimalErc20 } from "../../lib/utils";
import { TraderFactory } from "../../models/trading/TraderFactory";
import { GeckoTerminalApi } from "../../services/GeckoTerminalApi";
async function buyToken(usdAmount: number, _tokenAddress?: string, _wallet?: Wallet) {
  const wallet: Wallet = _wallet || (await getArbitrumWallet_1());
  const geckoTerminalApi = new GeckoTerminalApi();

  const trader = await TraderFactory.createTrader(wallet);

  const receiverAddress = wallet.address;
  const tokenAddress = _tokenAddress || ARB_ARB_ADDRESS;

  const erc20 = await createMinimalErc20(tokenAddress, wallet.provider!);

  const price = await geckoTerminalApi.getTokenUsdPrice(trader.getChain(), tokenAddress);

  console.log("----------------BUYING TOKEN----------------");
  console.log(`${erc20.getName()} price on network ${trader.getChain()}: $${price}`);
  console.log(`purchase Amount: $${usdAmount}`);
  console.log("------------------------------------------");

  //const buyTrade = await trader.buy(wallet, erc20, usdAmount);
  const ethLiquidity = await trader.wethLiquidity(erc20.getTokenAddress());
  console.log("ethLiquidity", ethLiquidity);

  //console.log("buyTrade", buyTrade);

  //console.log("transactionInfo", transactionInfo);
  //console.log("tx", tx);

  //const approveTxResponse = await trader.simulateTransaction(tx);
  //console.log("approveTxResponse", approveTxResponse);
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
