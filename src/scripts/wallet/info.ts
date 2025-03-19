import { ethers } from "ethers";
import { getBaseWallet_1 } from "../../config/trading-config";

async function getWalletInfo() {
  const wallet = await getBaseWallet_1();
  console.log("wallet address", wallet.address);
  console.log();
  const balance = await wallet.provider!.getBalance(wallet.address);
  console.log("raw eth balance", balance);
  const formattedBalance = ethers.formatEther(balance);
  console.log("formatted eth balance", formattedBalance);
}

if (require.main === module) {
  getWalletInfo().catch(console.error);
}

export { getWalletInfo };
