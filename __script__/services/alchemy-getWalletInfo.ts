import { ethers } from "ethers";
import { getAlchemyApi, getBaseWallet_1 } from "../../src/hooks/useSetup";
import { PriceData } from "../../src/services/types/alchemy-api.types";

async function getWalletInfo() {
  const wallet = await getBaseWallet_1();
  const alchemyApi = await getAlchemyApi();

  const balance = await wallet.provider!.getBalance(wallet.address);
  const formattedBalance = ethers.formatEther(balance);

  const ethTokenPriceData: PriceData = await alchemyApi.getEthUsdPrice();
  const symbol = ethTokenPriceData.symbol;
  const currency = ethTokenPriceData.prices[0].currency;
  const value: string = ethTokenPriceData.prices[0].value;

  const parsedValue = parseFloat(value);
  const parsedBalance = parseFloat(formattedBalance);

  const allTokens = await alchemyApi.getAllTokensOwnedByWallet(wallet.address);

  console.log("-------------Wallet Info-------------");
  console.log(wallet.address);
  console.log(`${symbol} price: ${value} ${currency}`);
  console.log();
  console.log("ETH balance:", formattedBalance);
  const balanceUsdValue = parsedValue * parsedBalance;
  console.log(`${currency.toUpperCase()} value: ${balanceUsdValue.toFixed(2)}`);

  console.log("");
  console.log("All tokens:", allTokens);
}

if (require.main === module) {
  getWalletInfo().catch(console.error);
}

export { getWalletInfo };
