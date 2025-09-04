import { ethers } from "ethers";
import { ChainType, getChainConfig } from "../../../src/config/chain-config";
import { getBaseWallet_1 } from "../../../src/hooks/useSetup";
import { OrderValidator, ExecutionParams, SignedLimitOrder, SignedPermit2Transfer } from "../../../src/orders/_index";

/**
 * Simulates backend order execution
 * This shows how the backend would validate and execute a signed order
 */
async function executeOrder(signedPermitTransfer: SignedPermit2Transfer, signedOrder: SignedLimitOrder) {
  console.log("\n⚡ Backend Order Execution Simulation");
  console.log("====================================\n");

  const wallet = getBaseWallet_1(); // Backend wallet (different from user)
  const chainConfig = getChainConfig(ChainType.BASE);
  const orderValidator = new OrderValidator();

  console.log("🏢 Backend Executor:", wallet.address);
  console.log("👤 Order Maker:", signedOrder.order.maker);
  console.log("📋 Order ID:", signedOrder.order.nonce);
  console.log();

  // 1. VALIDATE THE SIGNED ORDER
  console.log("🔍 Step 1: Backend Validates Stored Order");
  console.log("-----------------------------------------");

  const orderValidation = await orderValidator.validateSignedOrder(signedOrder);
  console.log("Order Valid:", orderValidation.isValid ? "✅" : "❌");

  if (!orderValidation.isValid) {
    console.log("❌ Order validation failed:", orderValidation.errors);
    return;
  }

  // Check if order is expired
  const isExpired = orderValidator.isOrderExpired(signedOrder.order);
  console.log("Order Expired:", isExpired ? "❌ YES" : "✅ NO");

  if (isExpired) {
    console.log("❌ Order has expired, cannot execute");
    return;
  }

  const timeLeft = orderValidator.getTimeUntilExpiry(signedOrder.order);
  console.log("Time Until Expiry:", Math.floor(timeLeft / 60), "minutes");
  console.log();

  // 2. SIMULATE MARKET MONITORING
  console.log("📈 Step 2: Market Analysis");
  console.log("--------------------------");

  console.log("🔍 Monitoring market prices...");
  console.log("💰 Current USDC/ETH rate: ~0.00025 ETH per USDC");
  console.log("🎯 User wants min 0.025 ETH for 100 USDC");
  console.log("📊 Required rate: 0.00025 ETH per USDC");
  console.log("✅ Market conditions favorable for execution!");
  console.log();

  // 3. CREATE EXECUTION PARAMETERS
  console.log("⚙️  Step 3: Creating Execution Parameters");
  console.log("----------------------------------------");

  // Backend chooses optimal route within user constraints
  const executionParams: ExecutionParams = {
    router: chainConfig.uniswap.v3.swapRouterV2Address, // Must be in allowedRouters
    path: [signedOrder.order.inputToken, signedOrder.order.outputToken], // Direct path
    fees: [3000], // 0.3% fee tier for Uniswap V3
    amountIn: signedOrder.order.inputAmount, // Execute full amount
    amountOutMin: signedOrder.order.minAmountOut, // Respect user's minimum
    deadline: Math.floor(Date.now() / 1000) + 1800, // 30 minutes from now
  };

  console.log("🎯 Execution Plan:");
  console.log("  Router:", executionParams.router.substring(0, 15) + "... (Uniswap V3)");
  console.log("  Path:", "USDC → WETH (direct)");
  console.log("  Fee Tier:", executionParams.fees[0] / 10000, "%");
  console.log("  Amount In:", ethers.formatUnits(executionParams.amountIn, 6), "USDC");
  console.log("  Min Amount Out:", ethers.formatEther(executionParams.amountOutMin), "ETH");
  console.log("  Deadline:", new Date(executionParams.deadline * 1000).toISOString());
  console.log();

  // 4. VALIDATE EXECUTION AGAINST ORDER CONSTRAINTS
  console.log("🔒 Step 4: Validating Execution Against Order Constraints");
  console.log("--------------------------------------------------------");

  const executionValidation = orderValidator.validateExecution(signedOrder.order, executionParams);

  console.log("Execution Valid:", executionValidation.isValid ? "✅" : "❌");
  console.log("Estimated Slippage:", executionValidation.estimatedSlippageBps, "bp");
  console.log("Max Allowed Slippage:", signedOrder.order.maxSlippageBps, "bp");

  if (executionValidation.errors.length > 0) {
    console.log("❌ Execution Errors:", executionValidation.errors);
    return;
  }
  console.log("✅ All constraints respected!");
  console.log();

  // 5. SIMULATE SMART CONTRACT EXECUTION
  console.log("🏗️  Step 5: Smart Contract Execution Simulation");
  console.log("-----------------------------------------------");

  console.log("📤 Backend calls: OrderExecutor.executeOrder(signedOrder, executionParams)");
  console.log();

  console.log("🔐 Smart Contract Verification:");
  console.log("  ✅ Verify order EIP-712 signature");
  console.log("  ✅ Verify Permit2 EIP-712 signature");
  console.log("  ✅ Check order not expired");
  console.log("  ✅ Check router in allowedRouters list");
  console.log("  ✅ Check execution amount ≤ order amount");
  console.log("  ✅ Check min output ≥ order minimum");
  console.log("  ✅ Check slippage ≤ max allowed");
  console.log();

  console.log("💰 Token Transfer Simulation:");
  console.log("  1. 📥 Pull 100 USDC from user via Permit2");
  console.log("  2. 🔄 Swap 100 USDC → 0.025+ ETH on Uniswap V3");
  console.log("  3. 📤 Send 0.025+ ETH directly to user");
  console.log("  4. 📝 Emit OrderFilled event");
  console.log();

  console.log("🎉 Order Execution Complete!");
  console.log("============================");
  console.log("✅ User received tokens without giving up private key");
  console.log("✅ All constraints were enforced on-chain");
  console.log("✅ Backend earned execution fee (if configured)");
  console.log("✅ Order marked as 'filled' in backend database");
  console.log();

  // 6. UPDATE ORDER STATUS
  console.log("📊 Final Order Status:");
  const finalStatus = {
    id: signedOrder.order.nonce,
    status: "filled",
    executedAt: Math.floor(Date.now() / 1000),
    executionTxHash: "0x1234...abcd", // Mock transaction hash
    filledAmount: executionParams.amountIn,
    receivedAmount: "25000000000000000", // ~0.025 ETH in wei
  };
  console.log(JSON.stringify(finalStatus, null, 2));
}

/**
 * Demo function that creates an order and then executes it
 */
async function fullDemo() {
  console.log("🚀 Complete Non-Custodial Trading Demo");
  console.log("=====================================");

  // Import the create order function
  const { createOrder } = await import("./create-order");

  try {
    // 1. User creates and signs order
    console.log("👤 USER SIDE: Creating signed order...");
    //const permitOrder = await createPermitTransfer(ChainType.BASE);
    const signedOrder = await createOrder(ChainType.BASE);

    console.log("\n⏳ [Time passes... market conditions change...]");
    console.log("⏳ [Backend monitoring detects execution opportunity...]");

    // 2. Backend executes the order
    console.log("\n🏢 BACKEND SIDE: Executing order...");
    //await executeOrder(permitOrder,signedOrder);
  } catch (error) {
    console.error("❌ Demo failed:", error);
  }
}

if (require.main === module) {
  // Run just the execution simulation with a mock order, or full demo
  const runFullDemo = process.argv.includes("--full");

  if (runFullDemo) {
    fullDemo().catch(console.error);
  } else {
    console.log("Run with --full to see complete user + backend flow");
    console.log("Or import this function to test execution with real signed orders");
  }
}
