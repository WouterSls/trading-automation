import { ethers, TransactionRequest } from "ethers";
import { getHardhatWallet_1 } from "../../src/hooks/useSetup";

export async function sendETH() {
  const wallet = getHardhatWallet_1();
  const tx: TransactionRequest = {
    to: "0xa0b3Be58B065b7C79eFfb2eC24BE25e96267fa50",
    value: ethers.parseEther("1"),
  };

  const txResponse = await wallet.sendTransaction(tx);
  const txReceipt = await txResponse.wait();
  if (!txReceipt) {
    throw new Error("No txReceipt received");
  }
  console.log(txReceipt);
}

if (require.main === module) {
  sendETH().catch(console.error);
}
