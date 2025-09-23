import { ethers } from "ethers";
import { SignedLimitOrder, ExecutionParams } from "./order-types";
import { SignedOrder as Order } from "../lib/generated-solidity-types";

/**
 * Validation errors that can occur with orders
 */
export class OrderValidationError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "OrderValidationError";
  }
}

/**
 * Result of order validation
 */
export interface OrderValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Result of execution parameter validation against order constraints
 */
export interface ExecutionValidationResult {
  isValid: boolean;
  errors: string[];
  estimatedSlippageBps: number;
}

/**
 * OrderValidator provides comprehensive validation for limit orders
 *
 * This ensures orders meet all requirements and that execution parameters
 * respect the constraints specified by the user in their signed order.
 */
export class OrderValidator {
  /**
   * Validates a limit order structure and constraints
   *
   * Checks for:
   * - Valid addresses
   * - Reasonable amounts
   * - Proper expiry times
   * - Slippage constraints
   * - Router whitelist
   */
  validateOrder(order: Order, allowedRouters?: string[]): OrderValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    console.log("🔍 Validating limit order...");

    // 1. Validate addresses
    if (!ethers.isAddress(order.maker)) {
      errors.push("Invalid trader address");
    }
    if (!ethers.isAddress(order.inputToken)) {
      errors.push("Invalid input token address");
    }
    if (!ethers.isAddress(order.outputToken)) {
      errors.push("Invalid output token address");
    }

    // 2. Validate tokens are different
    if (order.inputToken.toLowerCase() === order.outputToken.toLowerCase()) {
      errors.push("Input and output tokens cannot be the same");
    }

    // 3. Validate amounts
    try {
      const inputAmount = BigInt(order.inputAmount);
      if (inputAmount <= 0n) {
        errors.push("Input amount must be greater than 0");
      }
    } catch {
      errors.push("Invalid input amount format");
    }

    try {
      const minAmountOut = BigInt(order.minAmountOut);
      if (minAmountOut <= 0n) {
        errors.push("Min amount out must be greater than 0");
      }
    } catch {
      errors.push("Invalid min amount out format");
    }

    // 4. Validate slippage
    const maxSlippageBps = parseInt(order.maxSlippageBps);

    if (maxSlippageBps < 0 || maxSlippageBps > 10000) {
      errors.push("Max slippage must be between 0 and 10000 basis points (0-100%)");
    }
    if (maxSlippageBps > 500) {
      // 5%
      warnings.push("High slippage tolerance (>5%) - consider lowering for better execution");
    }

    // 5. Validate allowed routers (if provided)
    if (allowedRouters && allowedRouters.length > 0) {
      for (const router of allowedRouters) {
        if (!ethers.isAddress(router)) {
          errors.push(`Invalid router address: ${router}`);
        }
      }
    } else if (allowedRouters && allowedRouters.length === 0) {
      warnings.push("No routers specified - order may be restricted during execution");
    }

    // 6. Validate expiry
    const currentTime = Math.floor(Date.now() / 1000);
    const expiry = parseInt(order.expiry);

    if (expiry <= currentTime) {
      errors.push("Order expiry must be in the future");
    }
    if (expiry > currentTime + 30 * 24 * 60 * 60) {
      // 30 days
      warnings.push("Order expiry is more than 30 days away - consider shorter timeframe");
    }

    // 7. Validate nonce format
    try {
      const nonce = BigInt(order.nonce);
      if (nonce < 0n) {
        errors.push("Nonce must be non-negative");
      }
    } catch {
      errors.push("Invalid nonce format");
    }

    const isValid = errors.length === 0;

    console.log(`📊 Validation result: ${isValid ? "✅ Valid" : "❌ Invalid"}`);
    if (errors.length > 0) {
      console.log("❌ Errors:", errors);
    }
    if (warnings.length > 0) {
      console.log("⚠️  Warnings:", warnings);
    }

    return { isValid, errors, warnings };
  }

  /**
   * Validates that execution parameters respect order constraints
   *
   * This is critical for preventing the backend from executing orders
   * in ways that violate the user's signed constraints.
   */
  validateExecution(
    order: Order,
    execParams: ExecutionParams,
    allowedRouters?: string[],
  ): ExecutionValidationResult {
    const errors: string[] = [];

    console.log("🔍 Validating execution parameters against order constraints...");

    // 1. Validate router is allowed (if routers are specified)
    if (allowedRouters && allowedRouters.length > 0 && !allowedRouters.includes(execParams.router)) {
      errors.push(`Router ${execParams.router} not in allowed routers list`);
    }

    // 2. Validate path starts and ends correctly
    if (execParams.path.length < 2) {
      errors.push("Swap path must have at least 2 tokens");
    } else {
      if (execParams.path[0].toLowerCase() !== order.inputToken.toLowerCase()) {
        errors.push("Swap path must start with input token");
      }
      if (execParams.path[execParams.path.length - 1].toLowerCase() !== order.outputToken.toLowerCase()) {
        errors.push("Swap path must end with output token");
      }
    }

    // 3. Validate amounts
    try {
      const amountIn = BigInt(execParams.amountIn);
      const orderInputAmount = BigInt(order.inputAmount);

      if (amountIn > orderInputAmount) {
        errors.push("Execution amount cannot exceed order input amount");
      }
      if (amountIn <= 0n) {
        errors.push("Execution amount must be greater than 0");
      }
    } catch {
      errors.push("Invalid execution amount format");
    }

    try {
      const amountOutMin = BigInt(execParams.amountOutMin);
      const orderMinOut = BigInt(order.minAmountOut);
      const amountIn = BigInt(execParams.amountIn);
      const orderInputAmount = BigInt(order.inputAmount);

      // Proportional check: if executing partial amount, min out should be proportional
      const expectedMinOut = (orderMinOut * amountIn) / orderInputAmount;

      if (amountOutMin < expectedMinOut) {
        errors.push(`Execution min out too low. Expected: ${expectedMinOut}, got: ${amountOutMin}`);
      }
    } catch {
      errors.push("Invalid execution min amount out format");
    }

    // 4. Estimate slippage and validate
    let estimatedSlippageBps = 0;
    try {
      const amountIn = BigInt(execParams.amountIn);
      const amountOutMin = BigInt(execParams.amountOutMin);

      // This is a simplified slippage calculation
      // In practice, you'd want to compare against current market rates
      const inputAmount = BigInt(order.inputAmount);
      const expectedOut = BigInt(order.minAmountOut);

      // Calculate expected output for this execution size
      const proportionalExpected = (expectedOut * amountIn) / inputAmount;

      if (proportionalExpected > amountOutMin) {
        const slippage = proportionalExpected - amountOutMin;
        estimatedSlippageBps = Number((slippage * 10000n) / proportionalExpected);

        const orderMaxSlippage = parseInt(order.maxSlippageBps);

        if (estimatedSlippageBps > orderMaxSlippage) {
          errors.push(`Estimated slippage ${estimatedSlippageBps}bp exceeds max allowed ${orderMaxSlippage}bp`);
        }
      }
    } catch {
      console.log("⚠️  Could not estimate slippage");
    }

    // 5. Validate deadline
    const currentTime = Math.floor(Date.now() / 1000);
    if (execParams.deadline <= currentTime) {
      errors.push("Execution deadline must be in the future");
    }
    const orderExpiry = parseInt(order.expiry);
    if (execParams.deadline > orderExpiry) {
      errors.push("Execution deadline cannot be after order expiry");
    }

    const isValid = errors.length === 0;

    console.log(`📊 Execution validation: ${isValid ? "✅ Valid" : "❌ Invalid"}`);
    if (errors.length > 0) {
      console.log("❌ Execution errors:", errors);
    }
    const orderMaxSlippage = parseInt(order.maxSlippageBps);
    console.log(`📈 Estimated slippage: ${estimatedSlippageBps}bp (max allowed: ${orderMaxSlippage}bp)`);

    return { isValid, errors, estimatedSlippageBps };
  }

  /**
   * Validates a complete signed order (structure + signatures)
   */
  async validateSignedOrder(signedOrder: SignedLimitOrder): Promise<OrderValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    console.log("🔍 Validating complete signed order...");

    // 1. Validate the order structure first
    const orderValidation = this.validateOrder(signedOrder.order);
    errors.push(...orderValidation.errors);
    warnings.push(...orderValidation.warnings);

    // 2. Validate Permit2 data consistency
    if (signedOrder.permit2Data.permitted.token.toLowerCase() !== signedOrder.order.inputToken.toLowerCase()) {
      errors.push("Permit2 token must match order input token");
    }

    try {
      const permitAmount = BigInt(signedOrder.permit2Data.permitted.amount);
      const orderAmount = BigInt(signedOrder.order.inputAmount);

      if (permitAmount < orderAmount) {
        errors.push("Permit2 amount must be at least the order input amount");
      }
    } catch {
      errors.push("Invalid Permit2 amount format");
    }

    // 3. Validate signatures are present
    if (!signedOrder.orderSignature || signedOrder.orderSignature.length === 0) {
      errors.push("Missing order signature");
    }
    if (!signedOrder.permit2Signature || signedOrder.permit2Signature.length === 0) {
      errors.push("Missing Permit2 signature");
    }

    // 4. Basic signature format validation
    if (signedOrder.orderSignature && !signedOrder.orderSignature.startsWith("0x")) {
      errors.push("Invalid order signature format");
    }
    if (signedOrder.permit2Signature && !signedOrder.permit2Signature.startsWith("0x")) {
      errors.push("Invalid Permit2 signature format");
    }

    const isValid = errors.length === 0;

    console.log(`📊 Signed order validation: ${isValid ? "✅ Valid" : "❌ Invalid"}`);
    if (errors.length > 0) {
      console.log("❌ Signed order errors:", errors);
    }
    if (warnings.length > 0) {
      console.log("⚠️  Signed order warnings:", warnings);
    }

    return { isValid, errors, warnings };
  }

  /**
   * Check if an order is expired
   */
  isOrderExpired(order: Order): boolean {
    const currentTime = Math.floor(Date.now() / 1000);
    return parseInt(order.expiry) <= currentTime;
  }

  /**
   * Get time until order expiry in seconds
   */
  getTimeUntilExpiry(order: Order): number {
    const currentTime = Math.floor(Date.now() / 1000);
    return Math.max(0, parseInt(order.expiry) - currentTime);
  }

  /**
   * Validate that execution parameters represent a reasonable trade
   */
  validateTradeReasonableness(
    order: Order,
    execParams: ExecutionParams,
  ): {
    isReasonable: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];
    let isReasonable = true;

    // Check for unusually long paths (might indicate poor routing)
    if (execParams.path.length > 4) {
      warnings.push("Swap path has many hops - verify this is optimal");
      isReasonable = false;
    }

    // Check for execution of very small amounts relative to order
    try {
      const amountIn = BigInt(execParams.amountIn);
      const orderAmount = BigInt(order.inputAmount);
      const percentage = (amountIn * 100n) / orderAmount;

      if (percentage < 5n) {
        // Less than 5%
        warnings.push("Executing very small portion of order - consider batching");
      }
    } catch {
      // Ignore calculation errors
    }

    return { isReasonable, warnings };
  }
}
