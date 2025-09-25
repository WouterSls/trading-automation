/**
 * Example: How to create and execute limit orders using the non-custodial system
 *
 * This example demonstrates:
 * 1. Creating a signed limit order (user side)
 * 2. Executing the order through the contract (relayer side)
 */

import { ethers, Wallet } from "ethers";
import { ChainType } from "../../src/config/chain-config";
//import { OrderSigner } from "../../src/orders/OrderSigner";
import { OrderExecutor } from "../../src/trading/executor/OrderRelayer";
import { OrderCreator } from "../../src/trading/executor/OrderCreator";

// Example configuration
const CHAIN = ChainType.ETH;
const CHAIN_ID = 1;
const EXECUTOR_CONTRACT_ADDRESS = "0x..."; // Your deployed Executor contract
const PERMIT2_CONTRACT_ADDRESS = "0x..."; // Your deployed Executor contract
const RPC_URL = "https://eth-mainnet.alchemyapi.io/v2/your-api-key";

// Example: User creates a limit order
async function createOrder() {
  console.log("👤 User: Creating limit order...");

  // User's wallet (in real app, this would be connected via wallet provider)
  const userWallet = new Wallet("USER_PRIVATE_KEY", new ethers.JsonRpcProvider(RPC_URL));

  // Initialize order signer
  const creator = new OrderCreator(CHAIN_ID, EXECUTOR_CONTRACT_ADDRESS, PERMIT2_CONTRACT_ADDRESS);
  const executor = new OrderExecutor();

  const inputToken = "0xA0b86a33E6441D4B3bECa73A2d8C4d7a1C8A8B3c"; // Example USDC
  const outputToken = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"; // WETH
  const inputAmount = ethers.parseUnits("1000", 6); // 1000 USDC
  const minAmountOut = ethers.parseEther("0.3").toString(); // At least 0.3 ETH
  const deadline = (Math.floor(Date.now() / 1000) + 3600).toString();
  // Create singed permit data
  const signedPermitData = await creator.createSignedPermitData(
    userWallet,
    inputToken,
    inputAmount,
    deadline,
    EXECUTOR_CONTRACT_ADDRESS,
  );

  // Create signed limit order
  const signedOrder = await creator.createSignedOrder(userWallet, inputToken, inputAmount, outputToken);
  console.log("✅ Limit order created and signed!");
  console.log("📋 Order details:", {
    maker: signedOrder.maker,
    inputToken: signedOrder.inputToken,
    outputToken: signedOrder.outputToken,
    inputAmount: ethers.formatUnits(signedOrder.inputAmount, 6),
    minAmountOut: ethers.formatEther(signedOrder.minAmountOut),
    expiry: signedOrder.expiry,
  });

  const routeData: any = "";

  return { signedPermitData, signedOrder, routeData };
}

// Example: Relayer executes the limit order
async function executeOrder(signedPermitData: any, signedOrder: any, routeData: any) {
  console.log("🤖 Relayer: Executing limit order...");

  // Relayer's wallet (pays gas fees)
  const relayerWallet = new Wallet("RELAYER_PRIVATE_KEY", new ethers.JsonRpcProvider(RPC_URL));

  // Initialize order executor
  const orderExecutor = new OrderExecutor();

  // Check if order can be executed
  const canExecute = true; //await orderExecutor.canExecuteOrder(signedOrder, relayerWallet);
  if (!canExecute) {
    console.log("❌ Order cannot be executed (insufficient liquidity or expired)");
    return;
  }

  // Execute the order
  const txHash = await orderExecutor.execute(
    signedPermitData,
    signedOrder,
    routeData,
    EXECUTOR_CONTRACT_ADDRESS,
    relayerWallet,
  );
  console.log("✅ Order executed successfully! Transaction:", txHash);
}

// Example: Complete flow
async function demonstrateFlow() {
  try {
    console.log("🚀 Starting limit order demonstration...\n");

    // Step 1: User creates signed order
    const { signedPermitData, signedOrder, routeData } = await createOrder();
    console.log("\n" + "=".repeat(50) + "\n");

    // Step 2: Relayer executes order (could happen minutes/hours later)
    await executeOrder(signedPermitData, signedOrder, routeData);
  } catch (error) {
    console.error("❌ Error in demonstration:", error);
  }
}

// Run the example
if (require.main === module) {
  demonstrateFlow();
}

export { createOrder, executeOrder };
