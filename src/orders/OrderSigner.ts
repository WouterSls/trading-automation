import { Wallet, ethers } from "ethers";
import { ChainType, getChainConfig } from "../config/chain-config";
import { 
  EIP712Domain, 
  TradeOrder, 
  Permit2Data, 
  SignedLimitOrder, 
  EIP712_TYPES,
  createDomain,
  generateOrderNonce
} from "./types/OrderTypes";
import { Permit2 } from "../smartcontracts/permit2/Permit2";

/**
 * OrderSigner handles EIP-712 signing for limit orders
 * 
 * This class creates and signs structured data that users can understand
 * when prompted by their wallet. It handles both order signing and Permit2
 * authorization in a non-custodial way.
 */
export class OrderSigner {
  private domain: EIP712Domain;
  private permit2: Permit2;
  
  constructor(
    private chain: ChainType,
    private orderExecutorAddress: string // Contract address that will verify signatures
  ) {
    const chainConfig = getChainConfig(chain);
    const chainId = Number(chainConfig.id);
    
    // Create the domain separator for EIP-712 signing
    this.domain = createDomain(chain, chainId, orderExecutorAddress);
    this.permit2 = new Permit2(chain);
  }

  /**
   * Creates and signs a complete limit order
   * 
   * This is the main function that users will call to create signed orders.
   * It handles both the order signature and Permit2 authorization.
   * 
   * @param wallet - User's wallet for signing
   * @param orderParams - The order parameters
   * @returns Complete signed order ready for backend storage/execution
   */
  async createSignedOrder(
    wallet: Wallet,
    orderParams: {
      inputToken: string;
      outputToken: string;
      inputAmount: string;
      minAmountOut: string;
      maxSlippageBps: number;
      allowedRouters: string[];
      expiryMinutes: number; // How many minutes from now should this expire
    }
  ): Promise<SignedLimitOrder> {
    
    console.log("🔏 Creating signed limit order...");
    
    // 1. Create the order structure
    const order: TradeOrder = {
      maker: wallet.address,
      inputToken: orderParams.inputToken,
      outputToken: orderParams.outputToken, 
      inputAmount: orderParams.inputAmount,
      minAmountOut: orderParams.minAmountOut,
      maxSlippageBps: orderParams.maxSlippageBps,
      allowedRouters: orderParams.allowedRouters,
      expiry: Math.floor(Date.now() / 1000) + (orderParams.expiryMinutes * 60),
      nonce: generateOrderNonce(),
    };

    console.log("📋 Order structure created:", {
      maker: order.maker,
      inputToken: order.inputToken,
      outputToken: order.outputToken,
      inputAmount: ethers.formatUnits(order.inputAmount, 18), // Assuming 18 decimals for display
      minAmountOut: ethers.formatUnits(order.minAmountOut, 18),
      maxSlippageBps: order.maxSlippageBps,
      allowedRouters: order.allowedRouters,
      expiry: new Date(order.expiry * 1000).toISOString(),
      nonce: order.nonce,
    });

    // 2. Create Permit2 data for token authorization
    const permit2Data: Permit2Data = {
      permitted: {
        token: orderParams.inputToken,
        amount: orderParams.inputAmount,
      },
      nonce: await this.permit2.getPermit2Nonce(
        wallet,
        wallet.address,
        orderParams.inputToken,
        this.orderExecutorAddress
      ).then(n => n.toString()),
      deadline: order.expiry, // Use same deadline as order
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

  /**
   * Signs the limit order using EIP-712
   * 
   * This creates a signature that proves the user authorized this specific order
   * with all its constraints. The signature is bound to our domain to prevent
   * replay attacks.
   */
  async signOrder(wallet: Wallet, order: TradeOrder): Promise<string> {
    console.log("🔐 Signing order data...");
    console.log("🏷️  Domain:", this.domain);
    
    // Sign the structured order data
    const signature = await wallet.signTypedData(
      this.domain,
      { LimitOrder: EIP712_TYPES.TradeOrder },
      order
    );

    console.log("✅ Order signature created");
    return signature;
  }

  /**
   * Signs Permit2 authorization using EIP-712
   * 
   * This creates a signature that allows the OrderExecutor contract to pull
   * tokens from the user's wallet when the order is executed.
   */
  async signPermit2(wallet: Wallet, permit2Data: Permit2Data): Promise<string> {
    console.log("🔐 Signing Permit2 authorization...");
    
    // Create Permit2 domain (different from our order domain)
    const permit2Domain = {
      name: "Permit2",
      chainId: this.domain.chainId,
      verifyingContract: this.permit2.getPermit2Address(),
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
      permitSingle
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
        { LimitOrder: EIP712_TYPES.TradeOrder },
        signedOrder.order,
        signedOrder.orderSignature
      );
      
      const orderSignatureValid = orderSigner.toLowerCase() === signedOrder.order.maker.toLowerCase();
      console.log("📝 Order signature valid:", orderSignatureValid);

      // Verify Permit2 signature
      const permit2Domain = {
        name: "Permit2",
        chainId: this.domain.chainId,
        verifyingContract: this.permit2.getPermit2Address(),
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
        signedOrder.permit2Signature
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
  getOrderHash(order: TradeOrder): string {
    return ethers.TypedDataEncoder.hash(
      this.domain,
      { LimitOrder: EIP712_TYPES.TradeOrder },
      order
    );
  }
}

