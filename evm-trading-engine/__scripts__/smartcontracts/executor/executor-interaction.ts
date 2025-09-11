import { Contract, ethers } from "ethers";
import { EXECUTOR_INTERFACE } from "../../../src/lib/smartcontract-abis/executor";
import { getHardhatWallet_1 } from "../../../src/hooks/useSetup";

async function executorInteraction() {
  console.log("EXECUTOR CONTRACT TESTING");
  console.log("===============================");
  console.log();
  const EXECUTOR_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const deployerWallet = getHardhatWallet_1();
  const provider = deployerWallet.provider

  const executorContract = new Contract(EXECUTOR_ADDRESS, EXECUTOR_INTERFACE, provider);
  console.log("CONTRACT OWNER:");
  const owner = await executorContract.owner();
  console.log(owner);
  console.log("WALLET ADDRESS:");
  console.log(deployerWallet.address);
  console.log();

  try {
    const traderRegistry = await executorContract.traderRegistry();
    console.log("TRADER REGISTRY:")
    console.log(traderRegistry)
  } catch (error) {
    console.log(error);
  }
}

if (require.main === module) {
  executorInteraction().catch(console.error);
}

