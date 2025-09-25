import { Wallet } from "ethers";
import { TransactionRequest } from "ethers";

import { SignedOrder } from "./executor-types";
import { RouteData, SignedPermitData } from "../../lib/generated-solidity-types";
import { decodeLogs } from "../../lib/decoding-utils";
import { Executor } from "../../smartcontracts/executor/Executor";

export class OrderRelayer {
  constructor() {}

  async execute(
    signedPermitData: SignedPermitData,
    signedOrder: SignedOrder,
    routeData: RouteData,
    executorAddress: string,
    relayer: Wallet,
  ) {
    console.log("ENCODING EXECUTION");
    const txData = Executor.encodeExecuteOrder(signedPermitData, signedOrder, routeData);
    const tx: TransactionRequest = {
      to: executorAddress,
      data: txData,
    };
    console.log();
    console.log("EXECUTE TX");
    console.log("-----------------");
    console.log(tx);

    try {
      await relayer.call(tx);
    } catch (error) {
      console.log("Error during ETH call");
      throw error;
    }

    const txResponse = await relayer.sendTransaction(tx);
    const txReceipt = await txResponse.wait();
    if (!txReceipt && txReceipt!.status != 1) {
      throw new Error("Transaction failed");
    }
    const logs = decodeLogs(txReceipt!.logs);
    console.log("TX SUCCESS");
    console.log("--------------------");
    console.log("EMITTED LOGS");
    console.log(logs);
    console.log();
  }
}
