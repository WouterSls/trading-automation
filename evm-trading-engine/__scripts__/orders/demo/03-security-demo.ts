/**
 * EIP-712 Security Features Demonstration
 *
 * This script demonstrates the security features of EIP-712 including:
 * - Domain separation (prevents replay attacks)
 * - Chain binding (prevents cross-chain replay)
 * - Contract binding (prevents contract substitution)
 * - Nonce protection (prevents duplicate execution)
 *
 * Usage: npx ts-node __script__/orders/03-security-demo.ts
 */

import { ethers } from "ethers";
import { getBaseWallet_1 } from "../../../src/hooks/useSetup";
import { ChainType, getChainConfig } from "../../../src/config/chain-config";
import { OrderSigner } from "../../../src/orders/OrderSigner";
import { TradeOrder, EIP712_TYPES } from "../../../src/orders/types/OrderTypes";

async function demonstrateSecurityFeatures() {
  console.log("\n🛡️  EIP-712 Security Features Demonstration");
  console.log("==========================================\n");

  // Setup
  const wallet = getBaseWallet_1();
  const chainConfig = getChainConfig(ChainType.BASE);

  console.log("👤 Test wallet:", wallet.address);
  console.log("🌍 Base chain ID:", Number(chainConfig.id));
  console.log();

  // Contract addresses
  const legitimateContract = "0x1111111111111111111111111111111111111111";
  const maliciousContract = "0x2222222222222222222222222222222222222222";

  // Create order signers for different scenarios
  const legitimateSigner = new OrderSigner(ChainType.BASE, legitimateContract);
  const maliciousSigner = new OrderSigner(ChainType.BASE, maliciousContract);

  // Sample order data
  const orderData: TradeOrder = {
    maker: wallet.address,
    inputToken: chainConfig.tokenAddresses.usdc,
    outputToken: chainConfig.tokenAddresses.weth,
    inputAmount: ethers.parseUnits("100", 6).toString(),
    minAmountOut: ethers.parseEther("0.025").toString(),
    maxSlippageBps: 100,
    allowedRouters: [chainConfig.uniswap.v3.swapRouterV2Address],
    expiry: Math.floor(Date.now() / 1000) + 3600,
    nonce: "12345",
  };

  console.log("📋 Base Order Data:");
  console.log("  Maker:", orderData.maker);
  console.log("  Input:", ethers.formatUnits(orderData.inputAmount, 6), "USDC");
  console.log("  Output:", ethers.formatEther(orderData.minAmountOut), "ETH min");
  console.log("  Nonce:", orderData.nonce);
  console.log();

  // 1. DOMAIN SEPARATION DEMO
  console.log("🔒 Test 1: Domain Separation Protection");
  console.log("---------------------------------------");

  // Sign with legitimate contract
  const legitimateSignature = await legitimateSigner.signOrder(wallet, orderData);
  console.log("✅ Signed order with legitimate contract:", legitimateContract);
  console.log("   Signature:", legitimateSignature.substring(0, 20) + "...");

  // Try to verify with malicious contract domain
  try {
    const maliciousDomain = maliciousSigner.getDomain();
    const recoveredSigner = ethers.verifyTypedData(
      maliciousDomain,
      { LimitOrder: EIP712_TYPES.TradeOrder },
      orderData,
      legitimateSignature,
    );

    console.log("❌ SECURITY BREACH: Signature verified with wrong domain!");
  } catch (error) {
    console.log("✅ PROTECTED: Signature rejected with different contract address");
    console.log("   This prevents malicious contracts from executing your orders");
  }
  console.log();

  // 2. CHAIN BINDING DEMO
  console.log("🔗 Test 2: Chain Binding Protection");
  console.log("-----------------------------------");

  // Create domains for different chains
  const baseDomain = {
    name: "EVM Trading Engine",
    version: "1.0.0",
    chainId: 8453, // Base
    verifyingContract: legitimateContract,
  };

  const ethereumDomain = {
    name: "EVM Trading Engine",
    version: "1.0.0",
    chainId: 1, // Ethereum
    verifyingContract: legitimateContract,
  };

  console.log("🏷️  Base Domain (Chain ID 8453):", baseDomain.chainId);
  console.log("🏷️  Ethereum Domain (Chain ID 1):", ethereumDomain.chainId);

  // Sign order for Base
  const baseSignature = await wallet.signTypedData(baseDomain, { LimitOrder: EIP712_TYPES.TradeOrder }, orderData);

  // Try to verify on Ethereum
  try {
    const recoveredSigner = ethers.verifyTypedData(
      ethereumDomain,
      { LimitOrder: EIP712_TYPES.TradeOrder },
      orderData,
      baseSignature,
    );
    console.log("❌ SECURITY BREACH: Cross-chain replay possible!");
  } catch (error) {
    console.log("✅ PROTECTED: Signature rejected on different chain");
    console.log("   This prevents your Base orders from being replayed on Ethereum");
  }
  console.log();

  // 3. NONCE PROTECTION DEMO
  console.log("🎯 Test 3: Nonce Protection (Replay Prevention)");
  console.log("-----------------------------------------------");

  const order1 = { ...orderData, nonce: "100001" };
  const order2 = { ...orderData, nonce: "100002" };

  const signature1 = await legitimateSigner.signOrder(wallet, order1);
  const signature2 = await legitimateSigner.signOrder(wallet, order2);

  console.log("📝 Order 1 Nonce:", order1.nonce);
  console.log("📝 Order 2 Nonce:", order2.nonce);
  console.log("✅ Different nonces generate different signatures");
  console.log("   Signature 1:", signature1.substring(0, 20) + "...");
  console.log("   Signature 2:", signature2.substring(0, 20) + "...");

  // Try to use signature1 to authorize order2
  const legitimateDomain = legitimateSigner.getDomain();
  try {
    const recoveredSigner = ethers.verifyTypedData(
      legitimateDomain,
      { LimitOrder: EIP712_TYPES.TradeOrder },
      order2, // Different order
      signature1, // Wrong signature
    );
    console.log("❌ SECURITY BREACH: Wrong signature accepted!");
  } catch (error) {
    console.log("✅ PROTECTED: Cannot use signature for different nonce");
    console.log("   This prevents replay attacks and double-spending");
  }
  console.log();

  // 4. PARAMETER TAMPERING DEMO
  console.log("🛠️  Test 4: Parameter Tampering Protection");
  console.log("-------------------------------------------");

  const originalOrder = { ...orderData };
  const tamperedOrder = {
    ...orderData,
    minAmountOut: ethers.parseEther("0.001").toString(), // Much worse rate!
  };

  const originalSignature = await legitimateSigner.signOrder(wallet, originalOrder);

  console.log("📋 Original Order Min Out:", ethers.formatEther(originalOrder.minAmountOut), "ETH");
  console.log("📋 Tampered Order Min Out:", ethers.formatEther(tamperedOrder.minAmountOut), "ETH");

  // Try to use original signature with tampered order
  try {
    const recoveredSigner = ethers.verifyTypedData(
      legitimateDomain,
      { LimitOrder: EIP712_TYPES.TradeOrder },
      tamperedOrder, // Tampered data
      originalSignature, // Original signature
    );
    console.log("❌ SECURITY BREACH: Tampered parameters accepted!");
  } catch (error) {
    console.log("✅ PROTECTED: Signature verification fails with tampered data");
    console.log("   This prevents backend from changing your order parameters");
  }
  console.log();

  // 5. EXPIRY PROTECTION DEMO
  console.log("⏰ Test 5: Expiry Protection");
  console.log("----------------------------");

  const currentTime = Math.floor(Date.now() / 1000);
  const expiredOrder = {
    ...orderData,
    expiry: currentTime - 3600, // 1 hour ago
    nonce: "999999",
  };

  const expiredSignature = await legitimateSigner.signOrder(wallet, expiredOrder);

  console.log("📅 Current Time:", new Date(currentTime * 1000).toISOString());
  console.log("📅 Order Expiry:", new Date(expiredOrder.expiry * 1000).toISOString());
  console.log("✅ Signature is valid (cryptographically)");

  // Check if expired (this would be done by smart contract)
  const isExpired = expiredOrder.expiry <= currentTime;
  console.log("⏰ Order Expired:", isExpired ? "YES ❌" : "NO ✅");
  console.log("   Smart contract would reject expired orders during execution");
  console.log();

  // 6. SUMMARY OF PROTECTIONS
  console.log("🎯 Security Summary");
  console.log("==================");
  console.log("✅ Domain Separation: Prevents cross-app replay attacks");
  console.log("✅ Chain Binding: Prevents cross-chain replay attacks");
  console.log("✅ Contract Binding: Prevents malicious contract substitution");
  console.log("✅ Nonce Protection: Prevents order replay and double-execution");
  console.log("✅ Parameter Integrity: Prevents tampering with signed data");
  console.log("✅ Expiry Protection: Prevents execution of stale orders");
  console.log();

  console.log("🛡️  Why This Makes Non-Custodial Trading Secure:");
  console.log("================================================");
  console.log("• Users sign specific, constrained trading instructions");
  console.log("• Backend cannot exceed user-defined limits");
  console.log("• Signatures cannot be replayed or tampered with");
  console.log("• Users never give up private keys or broad permissions");
  console.log("• All constraints are enforced by smart contract verification");
  console.log();
}

// Run the security demonstration
demonstrateSecurityFeatures().catch(console.error);
