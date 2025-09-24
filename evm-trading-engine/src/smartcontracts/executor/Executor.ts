import { Wallet } from "ethers";
import { TransactionRequest } from "ethers";

import { EXECUTOR_INTERFACE } from "../../lib/smartcontract-abis/executor";
import { ChainType, getChainConfig } from "../../config/chain-config";
import { Permit2 } from "../permit2/Permit2";
import { EIP712_TYPES, EIP712Domain, Order, SignedOrder, SignedPermitSignatureData } from "./executor-types";
import { TradeCreationDto } from "../../trading/types/_index";
import { EIP712_GENERATED_TYPES, Protocol, RouteData, SignedPermitData } from "../../lib/generated-solidity-types";
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

  async createSignedPermitData(signer: Wallet, tokenIn: string, amountIn: bigint, deadline: string, to: string) {
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

  async createSignedOrder(signer: Wallet, tokenIn: string, amountIn: bigint, tokenOut: string): Promise<SignedOrder> {
    let orderNonce = 0;
    try {
      orderNonce = this.getOrderNonce();
    } catch (error) {
      console.log("Error during getting of IExecutor.Order nonce", error);
      throw error;
    }

    // can be used to limit scope of protocols in signature
    //const protocol = Protocol.UNISWAP_V2;

    const types = { Order: EIP712_TYPES.Order };

    const value = {
      maker: signer.address,
      inputToken: tokenIn,
      inputAmount: BigInt(amountIn),
      outputToken: tokenOut,
      minAmountOut: 1n,
      //protocol: protocol,
      maxSlippageBps: 50,
      expiry: Math.floor(Date.now() / 1000) + 3600,
      nonce: orderNonce,
    };

    let orderSignature = "0x";
    try {
      orderSignature = await signer.signTypedData(this.domain, types, value);
    } catch (error) {
      console.log("Error during signing IExecutor.Order typeData:", error);
    }

    const signedOrder: SignedOrder = {
      ...value,
      signature: orderSignature,
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

  private getOrderNonce() {
    return 0;
  }
}

