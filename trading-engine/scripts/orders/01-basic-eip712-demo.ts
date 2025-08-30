/**
 * Basic EIP-712 Demonstration Script
 *
 * This script demonstrates the fundamental concepts of EIP-712 typed data signing.
 * Run this to understand how structured data signing works at the most basic level.
 *
 * Usage: npx ts-node __script__/orders/01-basic-eip712-demo.ts
 */

import { ethers, Wallet } from "ethers";
import { ChainType } from "../../src/config/chain-config";
import { getBaseWallet_1 } from "../../src/hooks/useSetup";

async function demonstrateBasicEIP712() {
  console.log("\n🔬 EIP-712 Basic Demonstration");
  console.log("===============================\n");

  // Setup wallet and provider
  //const { wallet } = useSetup(ChainType.BASE);
  const wallet = getBaseWallet_1();

  console.log("👤 Using wallet:", wallet.address);
  console.log("🌍 Network:", (await wallet.provider?.getNetwork())?.name);
  console.log();

  // 1. DEMONSTRATE RAW MESSAGE SIGNING (NOT EIP-712)
  console.log("📝 Step 1: Traditional Message Signing");
  console.log("----------------------------------------");

  const rawMessage = "Hello, I want to trade 100 USDC for ETH with max 1% slippage";
  const rawSignature = await wallet.signMessage(rawMessage);

  console.log("Raw message:", rawMessage);
  console.log("Raw signature:", rawSignature.substring(0, 20) + "...");
  console.log("❌ Problem: Users see unstructured text, hard to verify what they're signing");
  console.log();

  // 2. DEMONSTRATE EIP-712 STRUCTURED DATA
  console.log("🏗️  Step 2: EIP-712 Structured Data Signing");
  console.log("---------------------------------------------");

  // Define our domain (this binds signatures to our app/contract)
  const domain = {
    name: "EVM Trading Engine Demo",
    version: "1.0.0",
    chainId: Number((await wallet.provider!.getNetwork()).chainId),
    verifyingContract: "0x1234567890123456789012345678901234567890", // Mock contract address
  };

  // Define the types (this tells wallets how to display the data)
  // As defined in Defintion of type structured data in EIP-712
  const types = {
    TradeOrder: [
      { name: "trader", type: "address" },
      { name: "sellToken", type: "address" },
      { name: "buyToken", type: "address" },
      { name: "sellAmount", type: "uint256" },
      { name: "minBuyAmount", type: "uint256" },
      { name: "maxSlippageBps", type: "uint16" },
      { name: "expiry", type: "uint256" },
    ],
  };

  // Define the actual data to sign
  const tradeOrder = {
    trader: wallet.address,
    sellToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
    buyToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
    sellAmount: ethers.parseUnits("100", 6), // 100 USDC (6 decimals)
    minBuyAmount: ethers.parseEther("0.025"), // Minimum ETH to receive
    maxSlippageBps: 100, // 1% slippage
    expiry: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
  };

  console.log("🏷️  Domain Separator:");
  console.log("  Name:", domain.name);
  console.log("  Version:", domain.version);
  console.log("  Chain ID:", domain.chainId);
  console.log("  Contract:", domain.verifyingContract);
  console.log();

  console.log("📋 Structured Data to Sign:");
  console.log("  Trader:", tradeOrder.trader);
  console.log("  Sell Token:", tradeOrder.sellToken, "(USDC)");
  console.log("  Buy Token:", tradeOrder.buyToken, "(WETH)");
  console.log("  Sell Amount:", ethers.formatUnits(tradeOrder.sellAmount, 6), "USDC");
  console.log("  Min Buy Amount:", ethers.formatEther(tradeOrder.minBuyAmount), "ETH");
  console.log("  Max Slippage:", tradeOrder.maxSlippageBps, "basis points (1%)");
  console.log("  Expiry:", new Date(tradeOrder.expiry * 1000).toISOString());
  console.log();

  // Sign the structured data
  const structuredSignature = await wallet.signTypedData(domain, types, tradeOrder);

  console.log("✅ EIP-712 Signature:", structuredSignature.substring(0, 20) + "...");
  console.log("✅ Benefit: Wallet displays structured, human-readable data!");
  console.log();

  // 3. DEMONSTRATE SIGNATURE VERIFICATION
  console.log("🔍 Step 3: Signature Verification");
  console.log("----------------------------------");

  // Verify who signed the data
  const recoveredSigner = ethers.verifyTypedData(domain, types, tradeOrder, structuredSignature);

  console.log("Original signer:", wallet.address);
  console.log("Recovered signer:", recoveredSigner);
  console.log("Signatures match:", wallet.address.toLowerCase() === recoveredSigner.toLowerCase());
  console.log();

  // 4. DEMONSTRATE DOMAIN SEPARATION
  console.log("🛡️  Step 4: Domain Separation Security");
  console.log("--------------------------------------");

  // Create a different domain (simulating a malicious app)
  const maliciousDomain = {
    name: "Fake Trading App", // Different name
    version: "1.0.0",
    chainId: domain.chainId,
    verifyingContract: "0x9876543210987654321098765432109876543210", // Different contract
  };

  console.log("🏷️  Original Domain:", domain.name);
  console.log("🏷️  Malicious Domain:", maliciousDomain.name);

  // Try to verify the original signature with the malicious domain
  const fakeRecovered = ethers.verifyTypedData(maliciousDomain, types, tradeOrder, structuredSignature);
  
  console.log("Original signer:", wallet.address);
  console.log("Recovered signer with malicious domain:", fakeRecovered);
  
  const signaturesMatch = wallet.address.toLowerCase() === fakeRecovered.toLowerCase();
  console.log("Signatures match:", signaturesMatch);
  console.log();
  
  if (signaturesMatch) {
    console.log("❌ SECURITY BREACH: Signature verification succeeded with wrong domain!");
  } else {
    console.log("✅ PROTECTED: Different domain produces different recovered address");
    console.log("   This proves the signature is invalid for the malicious domain");
    console.log("   Domain separation prevents cross-app replay attacks");
  }
  console.log();

  // 5. DEMONSTRATE HASH CALCULATION
  console.log("🔐 Step 5: Understanding the Cryptography");
  console.log("-----------------------------------------");

  // Calculate the hash that actually gets signed
  const domainHash = ethers.TypedDataEncoder.hashDomain(domain);
  const structHash = ethers.TypedDataEncoder.hashStruct("TradeOrder", types, tradeOrder);
  const finalHash = ethers.TypedDataEncoder.hash(domain, types, tradeOrder);

  console.log("Domain Hash:", domainHash);
  console.log("Struct Hash:", structHash);
  console.log("Final Hash (what gets signed):", finalHash);
  console.log();

  console.log("🎯 Key Takeaways:");
  console.log("==================");
  console.log("1. EIP-712 makes signatures human-readable in wallets");
  console.log("2. Domain separation prevents replay attacks");
  console.log("3. Structured data is type-safe and verifiable");
  console.log("4. Perfect for authorization without giving up private keys");
  console.log();
}

// Run the demonstration
demonstrateBasicEIP712().catch(console.error);
