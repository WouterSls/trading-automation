import { Contract, ethers } from "ethers";
import { EXECUTOR_INTERFACE } from "../../src/lib/smartcontract-abis/executor";
import { getHardhatWallet_1 } from "../../src/hooks/useSetup";

async function executorInteraction() {
  console.log("EXECUTOR CONTRACT TESTING");
  console.log("===============================");
  console.log();
  const EXECUTOR_ADDRESS = "0x86B430cF6539183AaB3385Bb901272F1aeA7daDC";
  const wallet = getHardhatWallet_1();

  const executorContract = new Contract(EXECUTOR_ADDRESS, EXECUTOR_INTERFACE, wallet);
  console.log("CONTRACT OWNER:");
  const owner = await executorContract.owner();
  console.log(owner);
  console.log("WALLET ADDRESS:");
  console.log(wallet.address);

  const order = {
    maker: wallet.address,
    inputToken: ethers.ZeroAddress,
  };
  const routeData = {};
  const orderSig = "";
  const permit2Data = {};
  const permitSig = "";
  try {
    await executorContract.executeOrder(order, routeData, orderSig, permit2Data, permitSig);
  } catch (error) {
    console.log(error);
  }
}

if (require.main === module) {
  executorInteraction().catch(console.error);
}
