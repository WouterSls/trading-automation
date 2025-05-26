import { ethers } from "ethers";
import { getAlchemyApi, getBaseWallet_1, getTheGraphApi } from "../../src/hooks/useSetup";
import { PriceData } from "../../src/services/types/alchemy-api.types";
import { TheGraphApi } from "../../src/services/TheGraphApi";
import { ChainType } from "../../src/config/chain-config";

async function getPoolInfo() {
  const wallet = await getBaseWallet_1();
  const graphApi: TheGraphApi = await getTheGraphApi();
  const alchemyApi = await getAlchemyApi();

  const AERO_ADDRESS = "0x940181a94A35A4569E4529A3CDfB74e38FD98631";
  const GAME_ADDRESS = "0x1c4cca7c5db003824208adda61bd749e55f463a3";

  const balance = await wallet.provider!.getBalance(wallet.address);
  const formattedBalance = ethers.formatEther(balance);

  const test = await graphApi.getTopUniV3Pool(ChainType.BASE, GAME_ADDRESS);

  const ethTokenPriceData: PriceData = await alchemyApi.getEthUsdPrice();
  const symbol = ethTokenPriceData.symbol;
  const currency = ethTokenPriceData.prices[0].currency;
  const value: string = ethTokenPriceData.prices[0].value;

  const parsedValue = parseFloat(value);
  const parsedBalance = parseFloat(formattedBalance);

  console.log("-------------Pool Info-------------");
  console.log(wallet.address);
  console.log(`${symbol} price: ${value} ${currency}`);
  console.log();
  console.log("ETH balance:", formattedBalance);
  const balanceUsdValue = parsedValue * parsedBalance;
  console.log(`${currency.toUpperCase()} value: ${balanceUsdValue.toFixed(2)}`);
}

if (require.main === module) {
  getPoolInfo().catch(console.error);
}

export { getPoolInfo };
