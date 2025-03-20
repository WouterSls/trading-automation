import { ethers } from "ethers";
import { getAlchemyApi, getBaseWallet_1 } from "../../config/setup-config";
import { TokenPriceData } from "../../lib/types/alchemy-api.types";

async function getWalletInfo() {
  const wallet = await getBaseWallet_1();
  const alchemyApi = await getAlchemyApi();


  const balance = await wallet.provider!.getBalance(wallet.address);
  const formattedBalance = ethers.formatEther(balance);

  const ethTokenPriceData: TokenPriceData = await alchemyApi.getEthUsdPrice();
  const symbol = ethTokenPriceData.symbol;
  const currency = ethTokenPriceData.prices[0].currency;
  const value:string = ethTokenPriceData.prices[0].value;

  const parsedValue = parseFloat(value);
  const parsedBalance = parseFloat(formattedBalance);

  console.log("-------------Wallet Info-------------");
  console.log(wallet.address);
  console.log(`${symbol} price: ${value} ${currency}`);
  console.log();
  console.log("ETH balance:", formattedBalance);
  const balanceUsdValue = parsedValue * parsedBalance;
  console.log(`${currency.toUpperCase()} value: ${balanceUsdValue.toFixed(2)}`);
}

if (require.main === module) {
  getWalletInfo().catch(console.error);
}

export { getWalletInfo };
