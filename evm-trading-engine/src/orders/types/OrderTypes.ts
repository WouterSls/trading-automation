import { ethers } from "ethers";
import { ChainType } from "../../config/chain-config";

export interface EIP712Domain {
  name: string; // Application name: "EVM Trading Engine"
  version: string; // Version: "1.0.0"
  chainId: number; // Chain ID (1 for Ethereum, 8453 for Base, etc.)
  verifyingContract: string; // Address of OrderExecutor contract
}

export interface TradeOrder {
  maker: string; // User's wallet address
  inputToken: string; // Token to sell (address)
  outputToken: string; // Token to buy (address)
  inputAmount: string; // Amount to sell (in token's smallest unit)
  minAmountOut: string; // Minimum amount to receive (slippage protection)

  // Execution constraints - backend must respect these
  maxSlippageBps: number; // Maximum slippage in basis points (100 = 1%)
  allowedRouters: string[]; // Which DEX routers can be used for this order

  // Order lifecycle
  expiry: number; // Unix timestamp when order expires
  nonce: string; // Unique order identifier (prevents replay)
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

export interface SignedTradeOrder {
  order: TradeOrder;
  orderSignature: string;
}

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
  order: TradeOrder; // The actual order data
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
 * EIP-712 Type definitions for structured data signing
 *
 * These define the structure that wallets will display to users when signing.
 * The order matters and must match exactly what the smart contract expects.
 */
export const EIP712_TYPES = {
  // Domain separator types
  EIP712Domain: [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
    { name: "verifyingContract", type: "address" },
  ],

  // Main order structure
  TradeOrder: [
    { name: "trader", type: "address" },
    { name: "inputToken", type: "address" },
    { name: "outputToken", type: "address" },
    { name: "inputAmount", type: "uint256" },
    { name: "minAmountOut", type: "uint256" },
    { name: "maxSlippageBps", type: "uint16" },
    { name: "allowedRouters", type: "address[]" },
    { name: "expiry", type: "uint256" },
    { name: "nonce", type: "string" },
  ],

  // Permit2 structure (for token authorization)
  PermitDetails: [
    { name: "token", type: "address" },
    { name: "amount", type: "uint160" },
  ],

  PermitSingle: [
    { name: "details", type: "PermitDetails" },
    { name: "spender", type: "address" },
    { name: "sigDeadline", type: "uint256" },
    { name: "nonce", type: "uint256" },
  ],
};

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
 * Helper function to create domain separator for a specific chain and contract
 */
export function createDomain(chain: ChainType, chainId: number, verifyingContract: string): EIP712Domain {
  return {
    name: "EVM Trading Engine",
    version: "1.0.0",
    chainId: chainId,
    verifyingContract: verifyingContract,
  };
}

/**
 * Helper function to generate a unique nonce
 */
export function generateOrderNonce(): string {
  return Math.floor(Date.now() / 1000 + Math.random() * 1000000).toString();
}
