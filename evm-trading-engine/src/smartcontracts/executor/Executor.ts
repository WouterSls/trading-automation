import { Wallet } from "ethers";
import { TransactionRequest } from "ethers";

import { EXECUTOR_INTERFACE } from "../../lib/smartcontract-abis/executor";
import { ChainType, getChainConfig } from "../../config/chain-config";
import { Permit2 } from "../permit2/Permit2";
import { EIP712Domain, SignedOrder, SignedPermitSignatureData } from "./executor-types";
import { TradeCreationDto } from "../../trading/types/_index";
import { RouteData, SignedPermitData } from "../../lib/generated-solidity-types";
import { decodeLogs } from "../../lib/decoding-utils";
import { PermitTransferFrom, SignatureTransferDetails } from "../permit2/permit2-types";

export class Executor {
  private domain: EIP712Domain;
  private permit2: Permit2;

  constructor(
    private chain: ChainType,
    private executorAddress: string, // Executor Contract address that will verify signatures
  ) {
    const chainConfig = getChainConfig(chain);
    const chainId = Number(chainConfig.id);

    this.domain = this.createDomain(chainId, executorAddress);
    this.permit2 = new Permit2(chain);
  }

  //approvePermit2

  //signPermitTransferFrom
  //signOrder

  async execute(signedPermitData: SignedPermitData, signedOrder: SignedOrder, routeData: RouteData, wallet: Wallet) {
    const txData = EXECUTOR_INTERFACE.encodeFunctionData("executeOrder", [signedPermitData, signedOrder, routeData]);
    const tx: TransactionRequest = {
      to: this.executorAddress,
      data: txData
    }
    console.log()
    console.log("EXECUTE TX")
    console.log("-----------------")
    console.log(tx)


    try {
      await wallet.call(tx);
    } catch (error) {
      console.log("Error during ETH call");
      throw error;
    }

    const txResponse = await wallet.sendTransaction(tx);
    const txReceipt = await txResponse.wait();
    if (!txReceipt && txReceipt!.status != 1) {
      throw new Error("Transaction failed")
    }
    const logs = decodeLogs(txReceipt!.logs);
    console.log("TX SUCCESS")
    console.log("--------------------")
    console.log("EMITTED LOGS")
    console.log(logs)
    console.log()
  }

  async createSignedPermitData(signer: Wallet, tokenIn: string, amountIn: string, deadline: string, to: string) {
    let permit2Nonce = "0";
    try {
      permit2Nonce = await this.permit2.getSignatureTransferNonce(signer, signer.address);
    } catch (error) {
      console.log("Error during getting of ISignatureTransfer nonce", error);
      throw error;
    }

    const permitTransferFrom: PermitTransferFrom = {
      permitted: {
        token: tokenIn,
        amount: amountIn
      },
      nonce: permit2Nonce,
      deadline: deadline
    }

    const transferDetails: SignatureTransferDetails = {
      to: to,
      requestedAmount: amountIn,
    }

    const spender = this.executorAddress;

    let permitSignature = "0x";
    try {
      permitSignature = await this.permit2.signPermitTransferFrom(permitTransferFrom, spender, signer);
    } catch (error) {
      console.log("Error during signing ISignature.PermitTransferFrom typeData:", error);
      throw error;
    }

    const signedPermitData: SignedPermitSignatureData = {
      permit: permitTransferFrom,
      transferDetails: transferDetails,
      owner: signer.address,
      signature: permitSignature,
    }

    return signedPermitData;
  }

  async createSignedOrder(wallet: Wallet, orderParameters: any): Promise<SignedOrder> {
    const signedOrder: SignedOrder = {
      maker: "", // address
      inputToken: "", // address
      outputToken: "", // address
      protocol: 0, // Types.Protocol
      inputAmount: "0", // uint256
      minAmountOut: "0", // uint256
      maxSlippageBps: "50", // uint256
      expiry: "0", // uint256
      nonce: "0", // uint256
      signature: "0x", // bytes
    }

    return signedOrder;

  }

  private createDomain(chainId: number, verifyingContract: string) {
    return {
      name: "EVM Trading Engine", // Must match Solidity contract name
      version: "1", // Must match Solidity contract version
      chainId: chainId,
      verifyingContract: verifyingContract,
    };
  }
}

