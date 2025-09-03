import { Wallet, ethers } from "ethers";
import { ChainType, getChainConfig } from "../config/chain-config";
import {
  EIP712Domain,
  TradeOrder,
  Permit2Data,
  SignedLimitOrder,
  EIP712_TYPES,
  createDomain,
  generateOrderNonce,
} from "./types/OrderTypes";
import { Permit2 } from "../smartcontracts/permit2/Permit2";

/**
 * OrderSigner handles EIP-712 signing for limit orders
 *
 * This class creates and signs structured data that users can understand
 * when prompted by their wallet. It handles both order signing and Permit2
 * authorization in a non-custodial way.
 */
export class OrderExecutor {
  private domain: EIP712Domain;
  private permit2: Permit2;

  constructor(
    private chain: ChainType,
    private orderExecutorAddress: string, // Contract address that will verify signatures
  ) {
    const chainConfig = getChainConfig(chain);
    const chainId = Number(chainConfig.id);

    // Create the domain separator for EIP-712 signing
    this.domain = createDomain(chain, chainId, orderExecutorAddress);
    this.permit2 = new Permit2(chain);
  }

  async executeOrder(signedOrder: SignedLimitOrder) {
    const { isValid } = await this.verifySignedOrder(signedOrder);

    if (!isValid) {
      throw new Error("Invalid SignedLimitOrder");
    }
  }

  /**
   * Verifies that a signed order has valid signatures
   *
   * This can be used to validate orders before storing them or executing them.
   * Note: This only verifies the signatures, not whether the order is executable.
   */
  async verifySignedOrder(signedOrder: SignedLimitOrder): Promise<{
    orderSignatureValid: boolean;
    permit2SignatureValid: boolean;
    isValid: boolean;
  }> {
    console.log("🔍 Verifying signed order...");

    try {
      // Verify order signature
      const orderSigner = ethers.verifyTypedData(
        this.domain,
        { LimitOrder: EIP712_TYPES.TradeOrder },
        signedOrder.order,
        signedOrder.orderSignature,
      );

      const orderSignatureValid = orderSigner.toLowerCase() === signedOrder.order.maker.toLowerCase();
      console.log("📝 Order signature valid:", orderSignatureValid);

      // Verify Permit2 signature
      const permit2Domain = {
        name: "Permit2",
        chainId: this.domain.chainId,
        verifyingContract: this.permit2.getAddress(),
      };

      const permitSingle = {
        details: signedOrder.permit2Data.permitted,
        spender: this.orderExecutorAddress,
        sigDeadline: signedOrder.permit2Data.deadline,
        nonce: signedOrder.permit2Data.nonce,
      };

      const permit2Signer = ethers.verifyTypedData(
        permit2Domain,
        {
          PermitDetails: EIP712_TYPES.PermitDetails,
          PermitSingle: EIP712_TYPES.PermitSingle,
        },
        permitSingle,
        signedOrder.permit2Signature,
      );

      const permit2SignatureValid = permit2Signer.toLowerCase() === signedOrder.order.maker.toLowerCase();
      console.log("🎫 Permit2 signature valid:", permit2SignatureValid);

      const isValid = orderSignatureValid && permit2SignatureValid;
      console.log("✅ Overall validity:", isValid);

      return {
        orderSignatureValid,
        permit2SignatureValid,
        isValid,
      };
    } catch (error) {
      console.error("❌ Error verifying signatures:", error);
      return {
        orderSignatureValid: false,
        permit2SignatureValid: false,
        isValid: false,
      };
    }
  }
}
