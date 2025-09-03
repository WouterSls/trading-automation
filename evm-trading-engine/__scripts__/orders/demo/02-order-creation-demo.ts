/**
 * Order Creation and Signing Demonstration
 *
 * This script demonstrates how to create and sign limit orders using our EIP-712 implementation.
 * It shows the complete flow from order creation to signature verification.
 *
 * Usage: npx ts-node __script__/orders/02-order-creation-demo.ts
 */

import { ethers } from "ethers";
import { getBaseWallet_1 } from "../../../src/hooks/useSetup";
import { ChainType, getChainConfig } from "../../../src/config/chain-config";
import { OrderSigner } from "../../../src/orders/OrderSigner";
import { OrderValidator } from "../../../src/orders/OrderValidator";

async function demonstrateOrderCreation() {
  console.log("\n🎯 Limit Order Creation & Signing Demo");
  console.log("======================================\n");

  // Setup
  const wallet = getBaseWallet_1();
  const chainConfig = getChainConfig(ChainType.BASE);

  console.log("👤 Trader wallet:", wallet.address);
  console.log("🌍 Chain:", chainConfig.name);
  console.log();

  // Mock OrderExecutor contract address (in real implementation, this would be deployed)
  const orderExecutorAddress = "0x1234567890123456789012345678901234567890";

  // Initialize our order signer
  const orderSigner = new OrderSigner(ChainType.BASE, orderExecutorAddress);
  const orderValidator = new OrderValidator();

  console.log("📋 Order Signer initialized");
  console.log("🔍 Order Validator initialized");
  console.log();

  // 1. CREATE A LIMIT ORDER
  console.log("🏗️  Step 1: Creating Limit Order");
  console.log("--------------------------------");

  const orderParams = {
    inputToken: chainConfig.tokenAddresses.usdc, // USDC
    outputToken: chainConfig.tokenAddresses.weth, // WETH
    inputAmount: ethers.parseUnits("1000", 6).toString(), // 1000 USDC (6 decimals)
    minAmountOut: ethers.parseEther("0.25").toString(), // Min 0.25 ETH
    maxSlippageBps: 100, // 1% max slippage
    allowedRouters: [
      chainConfig.uniswap.v3.swapRouterV2Address, // Uniswap V3
      chainConfig.aerodrome.routerAddress, // Aerodrome
    ],
    expiryMinutes: 60, // Expire in 1 hour
  };

  console.log("📝 Order Parameters:");
  console.log("  Input Token (USDC):", orderParams.inputToken);
  console.log("  Output Token (WETH):", orderParams.outputToken);
  console.log("  Input Amount:", ethers.formatUnits(orderParams.inputAmount, 6), "USDC");
  console.log("  Min Amount Out:", ethers.formatEther(orderParams.minAmountOut), "ETH");
  console.log("  Max Slippage:", orderParams.maxSlippageBps, "bp (1%)");
  console.log("  Allowed Routers:", orderParams.allowedRouters.length);
  console.log("  Expires in:", orderParams.expiryMinutes, "minutes");
  console.log();

  // 2. SIGN THE ORDER
  console.log("✍️  Step 2: Signing the Order with EIP-712");
  console.log("-------------------------------------------");

  try {
    const signedOrder = await orderSigner.createSignedOrder(wallet, orderParams);

    console.log("\n📋 Created Signed Order:");
    console.log("  Order ID (nonce):", signedOrder.order.nonce);
    console.log("  Maker:", signedOrder.order.maker);
    console.log("  Expiry:", new Date(signedOrder.order.expiry * 1000).toISOString());
    console.log("  Order Signature Length:", signedOrder.orderSignature.length, "chars");
    console.log("  Permit2 Signature Length:", signedOrder.permit2Signature.length, "chars");
    console.log();

    // 3. VALIDATE THE ORDER
    console.log("🔍 Step 3: Validating the Signed Order");
    console.log("---------------------------------------");

    const validation = await orderValidator.validateSignedOrder(signedOrder);

    console.log("Validation Result:", validation.isValid ? "✅ VALID" : "❌ INVALID");
    if (validation.errors.length > 0) {
      console.log("Errors:", validation.errors);
    }
    if (validation.warnings.length > 0) {
      console.log("Warnings:", validation.warnings);
    }
    console.log();

    // 4. VERIFY SIGNATURES
    console.log("🔐 Step 4: Verifying Signatures");
    console.log("--------------------------------");

    const signatureVerification = await orderSigner.verifySignedOrder(signedOrder);

    console.log("Order Signature Valid:", signatureVerification.orderSignatureValid ? "✅" : "❌");
    console.log("Permit2 Signature Valid:", signatureVerification.permit2SignatureValid ? "✅" : "❌");
    console.log("Overall Valid:", signatureVerification.isValid ? "✅" : "❌");
    console.log();

    // 5. SHOW WHAT THE USER SIGNED
    console.log("👁️  Step 5: What the User Actually Signed");
    console.log("-----------------------------------------");

    const domain = orderSigner.getDomain();
    const orderHash = orderSigner.getOrderHash(signedOrder.order);

    console.log("🏷️  EIP-712 Domain:");
    console.log("  Name:", domain.name);
    console.log("  Version:", domain.version);
    console.log("  Chain ID:", domain.chainId);
    console.log("  Contract:", domain.verifyingContract);
    console.log();

    console.log("🔐 Order Hash:", orderHash);
    console.log();

    // 6. SIMULATE WHAT WALLET SHOWS USER
    console.log("📱 Step 6: What User Sees in Wallet");
    console.log("-----------------------------------");

    console.log("🎯 WALLET DISPLAY (MetaMask/WalletConnect):");
    console.log("┌─────────────────────────────────────────────────────────┐");
    console.log("│ 📝 Sign Typed Data                                     │");
    console.log("├─────────────────────────────────────────────────────────┤");
    console.log("│ App: EVM Trading Engine                                 │");
    console.log("│ Version: 1.0.0                                          │");
    console.log("├─────────────────────────────────────────────────────────┤");
    console.log("│ LimitOrder:                                             │");
    console.log("│   maker: " + signedOrder.order.maker.substring(0, 20) + "...                   │");
    console.log("│   inputToken: " + orderParams.inputToken.substring(0, 15) + "...            │");
    console.log("│   outputToken: " + orderParams.outputToken.substring(0, 14) + "...           │");
    console.log(
      "│   inputAmount: " + ethers.formatUnits(orderParams.inputAmount, 6).padEnd(8) + " USDC              │",
    );
    console.log(
      "│   minAmountOut: " + ethers.formatEther(orderParams.minAmountOut).padEnd(6) + " ETH                │",
    );
    console.log("│   maxSlippageBps: 100 (1%)                             │");
    console.log(
      "│   expiry: " + new Date(signedOrder.order.expiry * 1000).toLocaleString().substring(0, 16) + "...        │",
    );
    console.log("└─────────────────────────────────────────────────────────┘");
    console.log();

    console.log("✅ User can clearly see:");
    console.log("   • Exactly what they're trading");
    console.log("   • Maximum slippage they accept");
    console.log("   • When the order expires");
    console.log("   • Which app is requesting the signature");
    console.log();

    // 7. SHOW STORAGE FORMAT
    console.log("💾 Step 7: Backend Storage Format");
    console.log("---------------------------------");

    const storageFormat = {
      id: signedOrder.order.nonce,
      maker: signedOrder.order.maker,
      chain: ChainType.BASE,
      inputToken: signedOrder.order.inputToken,
      outputToken: signedOrder.order.outputToken,
      inputAmount: signedOrder.order.inputAmount,
      minAmountOut: signedOrder.order.minAmountOut,
      status: "pending",
      createdAt: Math.floor(Date.now() / 1000),
      signedOrderData: signedOrder, // Full signed order for execution
    };

    console.log("📦 Backend would store:");
    console.log(JSON.stringify(storageFormat, null, 2));
    console.log();

    console.log("🎯 Next Steps for Non-Custodial Execution:");
    console.log("==========================================");
    console.log("1. Backend monitors market prices");
    console.log("2. When profitable, backend creates ExecutionParams");
    console.log("3. Backend calls OrderExecutor.executeOrder() with signed data");
    console.log("4. Smart contract verifies signatures and executes trade");
    console.log("5. User receives tokens without ever giving up private key!");
    console.log();
  } catch (error) {
    console.error("❌ Error creating signed order:", error);
  }
}

// Run the demonstration
demonstrateOrderCreation().catch(console.error);
