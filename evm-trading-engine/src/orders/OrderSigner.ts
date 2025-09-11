import { Wallet, ethers } from "ethers";
import { ChainType, getChainConfig } from "../config/chain-config";
import {
  EIP712Domain,
  Order,
  Permit2Data,
  SignedLimitOrder,
  EIP712_TYPES,
  createDomain,
  generateOrderNonce,
} from "./order-types";
import { Permit2 } from "../smartcontracts/permit2/Permit2";
import { Protocol } from "../lib/generated-solidity-types";

export class OrderSigner {
  private domain: EIP712Domain;
  private permit2: Permit2;

  constructor(
    private chain: ChainType,
    private orderExecutorAddress: string, // Contract address that will verify signatures
  ) {
    const chainConfig = getChainConfig(chain);
    const chainId = Number(chainConfig.id);

    this.domain = createDomain(chainId, orderExecutorAddress);
    this.permit2 = new Permit2(chain);
  }


  async createSignedOrder(
    wallet: Wallet,
    orderParams: {
      inputToken: string;
      outputToken: string;
      inputAmount: string;
      minAmountOut: string;
      maxSlippageBps: number;
      expiryMinutes: number; // How many minutes from now should this expire
    },
  ): Promise<SignedLimitOrder> {
    console.log("🔏 Creating signed limit order...");

    const now = Date.now();
    const future = now + orderParams.expiryMinutes * 60 *1000;
    const expiryTimestamp = new Date(future).toISOString();

    const order: Order = {
      maker: wallet.address,
      inputToken: orderParams.inputToken,
      outputToken: orderParams.outputToken,
      inputAmount: orderParams.inputAmount,
      minAmountOut: orderParams.minAmountOut,
      maxSlippageBps: orderParams.maxSlippageBps.toString(), // Convert to string
      expiry: expiryTimestamp,
      protocol: Protocol.UNISWAP_V2,
      nonce: generateOrderNonce()
    }


    console.log("📋 Order structure created:", {
      maker: order.maker,
      inputToken: order.inputToken,
      outputToken: order.outputToken,
      inputAmount: ethers.formatUnits(order.inputAmount, 18), // Assuming 18 decimals for display
      minAmountOut: ethers.formatUnits(order.minAmountOut, 18),
      maxSlippageBps: order.maxSlippageBps,
      expiry: new Date(parseInt(order.expiry) * 1000).toISOString(),
      nonce: order.nonce,
    });

    const permit2Data: Permit2Data = {
      permitted: {
        token: orderParams.inputToken,
        amount: orderParams.inputAmount,
      },
      nonce: await this.permit2
        .getPermit2Nonce(wallet, wallet.address, orderParams.inputToken, this.orderExecutorAddress)
        .then((n) => n.toString()),
      deadline: parseInt(order.expiry), // Use same deadline as order (convert to number)
    };

    console.log("🎫 Permit2 data created:", {
      token: permit2Data.permitted.token,
      amount: ethers.formatUnits(permit2Data.permitted.amount, 18),
      nonce: permit2Data.nonce,
      deadline: new Date(permit2Data.deadline * 1000).toISOString(),
    });

    // 3. Sign the order using EIP-712
    console.log("✍️  Signing order with EIP-712...");
    const orderSignature = await this.signOrder(wallet, order);

    // 4. Sign the Permit2 data using EIP-712
    console.log("✍️  Signing Permit2 authorization...");
    const permit2Signature = await this.signPermit2(wallet, permit2Data);

    const signedOrder: SignedLimitOrder = {
      order,
      permit2Data,
      orderSignature,
      permit2Signature,
    };

    console.log("✅ Signed order created successfully!");
    console.log("📝 Order signature:", orderSignature.substring(0, 20) + "...");
    console.log("📝 Permit2 signature:", permit2Signature.substring(0, 20) + "...");

    return signedOrder;
  }

  async signOrder(wallet: Wallet, order: Order): Promise<string> {
    console.log("🔐 Signing order data...");
    console.log("🏷️  Domain:", this.domain);

    // Sign the structured order data using generated types
    const signature = await wallet.signTypedData(this.domain, { LimitOrder: EIP712_TYPES.Order }, order);

    console.log("✅ Order signature created");
    return signature;
  }

  async signPermit2(wallet: Wallet, permit2Data: Permit2Data): Promise<string> {
    console.log("🔐 Signing Permit2 authorization...");

    // Create Permit2 domain (different from our order domain)
    const permit2Domain = {
      name: "Permit2",
      chainId: this.domain.chainId,
      verifyingContract: this.permit2.getAddress(),
    };

    // Structure the permit data for signing
    const permitSingle = {
      details: permit2Data.permitted,
      spender: this.orderExecutorAddress, // Our contract will be the spender
      sigDeadline: permit2Data.deadline,
      nonce: permit2Data.nonce,
    };

    console.log("🏷️  Permit2 domain:", permit2Domain);
    console.log("📋 Permit data:", permitSingle);

    // Sign using Permit2's EIP-712 structure
    const signature = await wallet.signTypedData(
      permit2Domain,
      {
        PermitDetails: EIP712_TYPES.PermitDetails,
        PermitSingle: EIP712_TYPES.PermitSingle,
      },
      permitSingle,
    );

    console.log("✅ Permit2 signature created");
    return signature;
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
        { LimitOrder: EIP712_TYPES.Order},
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

  /**
   * Gets the domain separator used for signing
   * Useful for debugging and testing
   */
  getDomain(): EIP712Domain {
    return this.domain;
  }

  /**
   * Calculates the EIP-712 hash of an order
   * This is what actually gets signed (useful for debugging)
   */
  getOrderHash(order: Order): string {
    return ethers.TypedDataEncoder.hash(this.domain, { LimitOrder: EIP712_TYPES.Order }, order);
  }
}
