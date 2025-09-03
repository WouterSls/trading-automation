/**
 * Example: How to create and execute limit orders using the non-custodial system
 *
 * This example demonstrates:
 * 1. Creating a signed limit order (user side)
 * 2. Executing the order through the contract (relayer side)
 */

import { ethers, Wallet } from "ethers";
import { ChainType } from "../../../src/config/chain-config";
import { OrderSigner } from "../../../src/orders/OrderSigner";
import { OrderExecutor } from "../../../src/orders/OrderExecutor";

// Example configuration
const CHAIN = ChainType.ETH;
const EXECUTOR_CONTRACT_ADDRESS = "0x..."; // Your deployed Executor contract
const RPC_URL = "https://eth-mainnet.alchemyapi.io/v2/your-api-key";

// Example: User creates a limit order
async function createLimitOrder() {
  console.log("👤 User: Creating limit order...");

  // User's wallet (in real app, this would be connected via wallet provider)
  const userWallet = new Wallet("USER_PRIVATE_KEY", new ethers.JsonRpcProvider(RPC_URL));

  // Initialize order signer
  const orderSigner = new OrderSigner(CHAIN, EXECUTOR_CONTRACT_ADDRESS);

  // Create signed limit order
  const signedOrder = await orderSigner.createSignedOrder(userWallet, {
    inputToken: "0xA0b86a33E6441D4B3bECa73A2d8C4d7a1C8A8B3c", // Example USDC
    outputToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
    inputAmount: ethers.parseUnits("1000", 6).toString(), // 1000 USDC
    minAmountOut: ethers.parseEther("0.3").toString(), // At least 0.3 ETH
    maxSlippageBps: 100, // 1% max slippage
    allowedRouters: [
      "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // UniswapV3 SwapRouter02
    ],
    expiryMinutes: 60, // Expires in 1 hour
  });

  console.log("✅ Limit order created and signed!");
  console.log("📋 Order details:", {
    maker: signedOrder.order.maker,
    inputToken: signedOrder.order.inputToken,
    outputToken: signedOrder.order.outputToken,
    inputAmount: ethers.formatUnits(signedOrder.order.inputAmount, 6),
    minAmountOut: ethers.formatEther(signedOrder.order.minAmountOut),
    expiry: new Date(signedOrder.order.expiry * 1000).toISOString(),
  });

  return signedOrder;
}

// Example: Relayer executes the limit order
async function executeLimitOrder(signedOrder: any) {
  console.log("🤖 Relayer: Executing limit order...");

  // Relayer's wallet (pays gas fees)
  const relayerWallet = new Wallet("RELAYER_PRIVATE_KEY", new ethers.JsonRpcProvider(RPC_URL));

  // Initialize order executor
  const orderExecutor = new OrderExecutor(CHAIN, EXECUTOR_CONTRACT_ADDRESS);

  // Check if order can be executed
  const canExecute = await orderExecutor.canExecuteOrder(signedOrder, relayerWallet);
  if (!canExecute) {
    console.log("❌ Order cannot be executed (insufficient liquidity or expired)");
    return;
  }

  // Execute the order
  const txHash = await orderExecutor.executeSignedOrder(signedOrder, relayerWallet);
  console.log("✅ Order executed successfully! Transaction:", txHash);
}

// Example: Complete flow
async function demonstrateFlow() {
  try {
    console.log("🚀 Starting limit order demonstration...\n");

    // Step 1: User creates signed order
    const signedOrder = await createLimitOrder();
    console.log("\n" + "=".repeat(50) + "\n");

    // Step 2: Relayer executes order (could happen minutes/hours later)
    await executeLimitOrder(signedOrder);
  } catch (error) {
    console.error("❌ Error in demonstration:", error);
  }
}

// Run the example
if (require.main === module) {
  demonstrateFlow();
}

export { createLimitOrder, executeLimitOrder };
