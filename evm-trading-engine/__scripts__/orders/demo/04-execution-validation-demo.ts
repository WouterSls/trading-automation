/**
 * Order Execution Validation Demonstration
 *
 * This script demonstrates how backend execution parameters are validated
 * against user-signed order constraints. This is critical for ensuring
 * the backend cannot execute orders in ways that violate user intent.
 *
 * Usage: npx ts-node __script__/orders/04-execution-validation-demo.ts
 */

import { ethers } from "ethers";
import { ChainType, getChainConfig } from "../../../src/config/chain-config";
import { OrderValidator } from "../../../src/orders/OrderValidator";
import { TradeOrder, ExecutionParams } from "../../../src/orders/types/OrderTypes";

async function demonstrateExecutionValidation() {
  console.log("\n⚡ Order Execution Validation Demo");
  console.log("=================================\n");

  const chainConfig = getChainConfig(ChainType.BASE);
  const orderValidator = new OrderValidator();

  // Mock user's signed order with constraints
  const userOrder: TradeOrder = {
    maker: "0x742d35Cc6634C0532925a3b8D86c9Ec4e5FBa3E7",
    inputToken: chainConfig.tokenAddresses.usdc, // USDC
    outputToken: chainConfig.tokenAddresses.weth, // WETH
    inputAmount: ethers.parseUnits("1000", 6).toString(), // 1000 USDC
    minAmountOut: ethers.parseEther("0.25").toString(), // Min 0.25 ETH
    maxSlippageBps: 150, // Max 1.5% slippage
    allowedRouters: [
      chainConfig.uniswap.v3.swapRouterV2Address, // Uniswap V3
      chainConfig.aerodrome.routerAddress, // Aerodrome
    ],
    expiry: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    nonce: "987654321",
  };

  console.log("👤 User's Signed Order Constraints:");
  console.log("====================================");
  console.log("📝 Input Amount:", ethers.formatUnits(userOrder.inputAmount, 6), "USDC");
  console.log("📝 Min Output:", ethers.formatEther(userOrder.minAmountOut), "ETH");
  console.log("📝 Max Slippage:", userOrder.maxSlippageBps, "bp (1.5%)");
  console.log("📝 Allowed Routers:", userOrder.allowedRouters.length);
  console.log("   -", chainConfig.uniswap.v3.swapRouterV2Address.substring(0, 10) + "... (Uniswap V3)");
  console.log("   -", chainConfig.aerodrome.routerAddress.substring(0, 10) + "... (Aerodrome)");
  console.log("📝 Expires:", new Date(userOrder.expiry * 1000).toISOString());
  console.log();

  // Test different execution scenarios
  console.log("🧪 Testing Different Execution Scenarios");
  console.log("========================================\n");

  // SCENARIO 1: Valid Execution
  console.log("📊 Scenario 1: Valid Execution");
  console.log("-------------------------------");

  const validExecution: ExecutionParams = {
    router: chainConfig.uniswap.v3.swapRouterV2Address, // Allowed router
    path: [userOrder.inputToken, userOrder.outputToken], // Direct path
    fees: [3000], // 0.3% fee tier
    amountIn: userOrder.inputAmount, // Full amount
    amountOutMin: userOrder.minAmountOut, // Meets minimum
    deadline: Math.floor(Date.now() / 1000) + 1800, // 30 min from now
  };

  console.log("🎯 Execution Plan:");
  console.log("  Router:", validExecution.router.substring(0, 10) + "... (Uniswap V3)");
  console.log("  Path:", validExecution.path.map((a) => a.substring(0, 10) + "...").join(" → "));
  console.log("  Amount In:", ethers.formatUnits(validExecution.amountIn, 6), "USDC");
  console.log("  Min Amount Out:", ethers.formatEther(validExecution.amountOutMin), "ETH");
  console.log("  Deadline:", new Date(validExecution.deadline * 1000).toISOString());

  const validResult = orderValidator.validateExecution(userOrder, validExecution);
  console.log("\n📋 Validation Result:", validResult.isValid ? "✅ VALID" : "❌ INVALID");
  console.log("📈 Estimated Slippage:", validResult.estimatedSlippageBps, "bp");
  if (validResult.errors.length > 0) {
    console.log("❌ Errors:", validResult.errors);
  }
  console.log();

  // SCENARIO 2: Unauthorized Router
  console.log("📊 Scenario 2: Unauthorized Router Attack");
  console.log("-----------------------------------------");

  const unauthorizedRouter = "0x9999999999999999999999999999999999999999";
  const unauthorizedExecution: ExecutionParams = {
    ...validExecution,
    router: unauthorizedRouter, // Not in allowed list!
  };

  console.log("🚫 Backend tries to use unauthorized router:", unauthorizedRouter.substring(0, 15) + "...");

  const unauthorizedResult = orderValidator.validateExecution(userOrder, unauthorizedExecution);
  console.log("📋 Validation Result:", unauthorizedResult.isValid ? "✅ VALID" : "❌ REJECTED");
  if (unauthorizedResult.errors.length > 0) {
    console.log("🛡️  Protection Activated:", unauthorizedResult.errors[0]);
  }
  console.log();

  // SCENARIO 3: Excessive Amount
  console.log("📊 Scenario 3: Excessive Amount Attack");
  console.log("--------------------------------------");

  const excessiveExecution: ExecutionParams = {
    ...validExecution,
    amountIn: ethers.parseUnits("2000", 6).toString(), // 2x the authorized amount!
  };

  console.log("💰 Backend tries to execute more than authorized:");
  console.log("  Authorized:", ethers.formatUnits(userOrder.inputAmount, 6), "USDC");
  console.log("  Attempted:", ethers.formatUnits(excessiveExecution.amountIn, 6), "USDC");

  const excessiveResult = orderValidator.validateExecution(userOrder, excessiveExecution);
  console.log("📋 Validation Result:", excessiveResult.isValid ? "✅ VALID" : "❌ REJECTED");
  if (excessiveResult.errors.length > 0) {
    console.log("🛡️  Protection Activated:", excessiveResult.errors[0]);
  }
  console.log();

  // SCENARIO 4: Insufficient Output (High Slippage)
  console.log("📊 Scenario 4: Insufficient Output Protection");
  console.log("---------------------------------------------");

  const lowOutputExecution: ExecutionParams = {
    ...validExecution,
    amountOutMin: ethers.parseEther("0.15").toString(), // Much less than user wants!
  };

  console.log("📉 Backend tries to execute with insufficient output:");
  console.log("  User Minimum:", ethers.formatEther(userOrder.minAmountOut), "ETH");
  console.log("  Backend Plan:", ethers.formatEther(lowOutputExecution.amountOutMin), "ETH");

  const lowOutputResult = orderValidator.validateExecution(userOrder, lowOutputExecution);
  console.log("📋 Validation Result:", lowOutputResult.isValid ? "✅ VALID" : "❌ REJECTED");
  console.log(
    "📈 Estimated Slippage:",
    lowOutputResult.estimatedSlippageBps,
    "bp (vs max",
    userOrder.maxSlippageBps,
    "bp)",
  );
  if (lowOutputResult.errors.length > 0) {
    console.log("🛡️  Protection Activated:", lowOutputResult.errors[0]);
  }
  console.log();

  // SCENARIO 5: Wrong Token Path
  console.log("📊 Scenario 5: Wrong Token Path Attack");
  console.log("--------------------------------------");

  const wrongPathExecution: ExecutionParams = {
    ...validExecution,
    path: [userOrder.inputToken, chainConfig.tokenAddresses.dai], // Wrong output token!
  };

  console.log("🔄 Backend tries to swap to wrong token:");
  console.log("  User Wants:", userOrder.outputToken.substring(0, 15) + "... (WETH)");
  console.log("  Backend Plan:", wrongPathExecution.path[1].substring(0, 15) + "... (DAI)");

  const wrongPathResult = orderValidator.validateExecution(userOrder, wrongPathExecution);
  console.log("📋 Validation Result:", wrongPathResult.isValid ? "✅ VALID" : "❌ REJECTED");
  if (wrongPathResult.errors.length > 0) {
    console.log("🛡️  Protection Activated:", wrongPathResult.errors[0]);
  }
  console.log();

  // SCENARIO 6: Partial Execution (Valid)
  console.log("📊 Scenario 6: Partial Execution (Valid)");
  console.log("-----------------------------------------");

  const partialExecution: ExecutionParams = {
    ...validExecution,
    amountIn: ethers.parseUnits("500", 6).toString(), // Half the amount
    amountOutMin: ethers.parseEther("0.125").toString(), // Proportional min output
  };

  console.log("🔄 Backend executes partial order:");
  console.log(
    "  Full Order:",
    ethers.formatUnits(userOrder.inputAmount, 6),
    "USDC →",
    ethers.formatEther(userOrder.minAmountOut),
    "ETH",
  );
  console.log(
    "  Partial:",
    ethers.formatUnits(partialExecution.amountIn, 6),
    "USDC →",
    ethers.formatEther(partialExecution.amountOutMin),
    "ETH",
  );

  const partialResult = orderValidator.validateExecution(userOrder, partialExecution);
  console.log("📋 Validation Result:", partialResult.isValid ? "✅ VALID" : "❌ INVALID");
  console.log("📈 Estimated Slippage:", partialResult.estimatedSlippageBps, "bp");
  if (partialResult.errors.length > 0) {
    console.log("❌ Errors:", partialResult.errors);
  }
  console.log();

  // SCENARIO 7: Expired Deadline
  console.log("📊 Scenario 7: Expired Deadline Protection");
  console.log("------------------------------------------");

  const expiredExecution: ExecutionParams = {
    ...validExecution,
    deadline: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago!
  };

  console.log("⏰ Backend tries to execute with expired deadline:");
  console.log("  Current Time:", new Date().toISOString());
  console.log("  Execution Deadline:", new Date(expiredExecution.deadline * 1000).toISOString());

  const expiredResult = orderValidator.validateExecution(userOrder, expiredExecution);
  console.log("📋 Validation Result:", expiredResult.isValid ? "✅ VALID" : "❌ REJECTED");
  if (expiredResult.errors.length > 0) {
    console.log("🛡️  Protection Activated:", expiredResult.errors[0]);
  }
  console.log();

  // SUMMARY
  console.log("🎯 Validation Summary");
  console.log("====================");
  console.log("✅ Valid execution: Passes all checks");
  console.log("❌ Unauthorized router: Blocked");
  console.log("❌ Excessive amount: Blocked");
  console.log("❌ Insufficient output: Blocked");
  console.log("❌ Wrong token path: Blocked");
  console.log("✅ Partial execution: Allowed (proportional)");
  console.log("❌ Expired deadline: Blocked");
  console.log();

  console.log("🛡️  Key Protection Mechanisms:");
  console.log("==============================");
  console.log("• Router whitelist enforcement");
  console.log("• Amount limits respected");
  console.log("• Minimum output guaranteed");
  console.log("• Token path verification");
  console.log("• Deadline enforcement");
  console.log("• Proportional partial execution");
  console.log();

  console.log("🏗️  Smart Contract Integration:");
  console.log("===============================");
  console.log("The OrderExecutor contract would:");
  console.log("1. Verify EIP-712 signatures");
  console.log("2. Run these same validation checks on-chain");
  console.log("3. Only execute if ALL constraints are met");
  console.log("4. Transfer tokens via Permit2 if valid");
  console.log("5. Emit events for order tracking");
  console.log();
}

// Run the execution validation demonstration
demonstrateExecutionValidation().catch(console.error);
