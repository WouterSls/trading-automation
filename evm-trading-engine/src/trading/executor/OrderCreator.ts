import { Wallet } from "ethers";

import { Permit2 } from "../../smartcontracts/permit2/Permit2";
import { Order, SignedOrder, SignedPermitSignatureData } from "./executor-types";
import { PermitTransferFrom } from "../../smartcontracts/permit2/permit2-types";
import { Executor } from "../../smartcontracts/executor/Executor";

export class OrderCreator {
  private executor: Executor;
  private permit2: Permit2;

  constructor(chainId: number, executorAddress: string, permit2Address: string) {
    this.executor = new Executor(chainId, executorAddress);
    this.permit2 = new Permit2(chainId, permit2Address);
  }

  //approvePermit2

  async createSignedPermitData(signer: Wallet, tokenIn: string, amountIn: bigint, expiry: string, to: string) {
    const permit2Nonce = await this.permit2.getSignatureTransferNonce(signer);
    //const permit2Nonce = "0";
    const value: PermitTransferFrom = {
      permitted: {
        token: tokenIn,
        amount: amountIn,
      },
      spender: this.executor.getAddress(),
      nonce: permit2Nonce,
      deadline: expiry,
    };

    //Permit2 SignatureTransfer -> use AllowanceTransfer for regular trades
    const permitSignature = await this.permit2.signSignatureTransfer(signer, value);

    const signedPermitData: SignedPermitSignatureData = {
      permit: value,
      transferDetails: {
        to: to,
        requestedAmount: amountIn,
      },
      owner: signer.address,
      signature: permitSignature,
    };

    return signedPermitData;
  }

  async createSignedOrder(signer: Wallet, tokenIn: string, amountIn: bigint, tokenOut: string): Promise<SignedOrder> {
    const orderNonce = await this.executor.getOrderNonce();
    const value: Order = {
      maker: signer.address,
      inputToken: tokenIn,
      inputAmount: amountIn,
      outputToken: tokenOut,
      minAmountOut: 1n,
      maxSlippageBps: 50,
      expiry: Math.floor(Date.now() / 1000) + 3600,
      nonce: orderNonce,
    };

    const orderSignature = await this.executor.signOrder(signer, value);

    const signedOrder: SignedOrder = {
      ...value,
      signature: orderSignature,
    };

    return signedOrder;
  }
}
