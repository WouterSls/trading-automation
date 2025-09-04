import { ChainType } from "../config/chain-config";

// Import generated types that are consistent with Solidity contracts
import { LimitOrder, EIP712_GENERATED_TYPES, createDomain as createGeneratedDomain } from "./generated-types";

// Re-export the generated domain interface for convenience
export interface EIP712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}

// Re-export base order structure (matches Solidity exactly)
export { LimitOrder };

// Frontend-specific order interface that extends the base with additional fields
export interface TradeOrderRequest {
  // Core order data (matches Solidity exactly)
  order: LimitOrder;

  // Frontend-specific fields not in Solidity
  allowedRouters: string[]; // Which DEX routers can be used for this order
  metadata?: {
    estimatedGas?: string;
    userNotes?: string;
    createdAt?: number;
  };
}

// Minimal Permit2 types
export interface Permit2Transfer {
  permitted: {
    token: string;
    amount: string;
  };
  nonce: string;
  deadline: number;
}

export interface Permit2TransferDetails {
  to: string;
  requestedAmount: string;
}

export interface SignedPermit2Transfer {
  permit: Permit2Transfer;
  transferDetails: Permit2TransferDetails;
  signature: string;
  owner: string;
}

/**
 * Permit2 data structure for token transfers
 *
 * This allows the OrderExecutor contract to pull tokens from the user
 * without requiring a separate approval transaction.
 */
export interface Permit2Data {
  permitted: {
    token: string; // Token address
    amount: string; // Maximum amount that can be transferred
  };
  nonce: string; // Permit2 nonce (different from order nonce)
  deadline: number; // When this permit expires
}

// Note: SignedTradeOrder removed - use SignedLimitOrder instead

/**
export interface SingedPermit2Transfer {
  permit2Data: Permit2Data;
  permitSignature: string;
}
 */

/**
 * Complete signed order that includes both the order data and signatures
 *
 * This is what gets stored by the backend and used for execution.
 */
export interface SignedLimitOrder {
  permit2Data: Permit2Data; // Permit2 authorization data
  permit2Signature: string; // EIP-712 signature of the permit2 data
  order: LimitOrder; // The actual order data (matches Solidity)
  orderSignature: string; // EIP-712 signature of the order
}

/**
 * Execution parameters chosen by the backend at execution time
 *
 * The backend chooses the optimal route and amounts within the constraints
 * specified in the signed order.
 */
export interface ExecutionParams {
  router: string; // Which DEX router to use (must be in allowedRouters)
  path: string[]; // Token swap path [inputToken, intermediateToken?, outputToken]
  fees: number[]; // Fee tiers for each hop (Uniswap V3 only)
  amountIn: string; // Exact amount to swap (≤ inputAmount)
  amountOutMin: string; // Minimum output (≥ minAmountOut considering amountIn)
  deadline: number; // Execution deadline
}

/**
 * EIP-712 Type definitions (auto-generated from Solidity contracts)
 *
 * These are generated automatically from your Solidity contracts to ensure
 * perfect consistency between smart contracts and frontend types.
 */
export const EIP712_TYPES = EIP712_GENERATED_TYPES;

export enum OrderStatus {
  PENDING = "pending", // Order created, waiting for execution
  PARTIALLY_FILLED = "partially_filled", // Order partially executed
  FILLED = "filled", // Order completely executed
  CANCELLED = "cancelled", // Order cancelled by user
  EXPIRED = "expired", // Order expired
  FAILED = "failed", // Order execution failed
}

/**
 * Order with execution tracking
 */
export interface OrderWithStatus {
  signedOrder: SignedLimitOrder;
  status: OrderStatus;
  filledAmount: string; // How much has been filled so far
  executionTxHash?: string; // Transaction hash of execution
  createdAt: number; // When order was created
  updatedAt: number; // Last status update
}

/**
 * Helper function to create domain separator (uses generated types for consistency)
 */
export function createDomain(chainId: number, verifyingContract: string): EIP712Domain {
  return createGeneratedDomain(chainId, verifyingContract);
}

/**
 * Helper function to generate a unique nonce
 */
export function generateOrderNonce(): string {
  return Math.floor(Date.now() / 1000 + Math.random() * 1000000).toString();
}

/**
 * Creates a TradeOrderRequest from order parameters
 * This is the recommended way to create orders in new code
 */
export function createTradeOrderRequest(orderParams: {
  maker: string;
  inputToken: string;
  outputToken: string;
  inputAmount: string;
  minAmountOut: string;
  maxSlippageBps: string; // Note: string for consistency with Solidity
  expiryMinutes: number;
  allowedRouters: string[];
}): TradeOrderRequest {
  const expiry = (Math.floor(Date.now() / 1000) + orderParams.expiryMinutes * 60).toString();
  const nonce = generateOrderNonce();

  const order: LimitOrder = {
    maker: orderParams.maker,
    inputToken: orderParams.inputToken,
    outputToken: orderParams.outputToken,
    inputAmount: orderParams.inputAmount,
    minAmountOut: orderParams.minAmountOut,
    maxSlippageBps: orderParams.maxSlippageBps,
    expiry: expiry,
    nonce: nonce,
  };

  return {
    order,
    allowedRouters: orderParams.allowedRouters,
    metadata: {
      createdAt: Date.now(),
    },
  };
}
