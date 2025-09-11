
// Import generated types that are consistent with Solidity contracts
import { Order, EIP712_GENERATED_TYPES, createDomain as createGeneratedDomain } from "../lib/generated-solidity-types";

export { Order };

export interface EIP712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}


// Frontend-specific order interface that extends the base with additional fields
export interface OrderRequest {
  order: Order;

  // Frontend-specific fields not in Solidity
  allowedRouters: string[]; // Which DEX routers can be used for this order
  metadata?: {
    estimatedGas?: string;
    userNotes?: string;
    createdAt?: number;
  };
}

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

export interface Permit2Data {
  permitted: {
    token: string; // Token address
    amount: string; // Maximum amount that can be transferred
  };
  nonce: string; // Permit2 nonce (different from order nonce)
  deadline: number; // When this permit expires
}

export interface SignedLimitOrder {
  permit2Data: Permit2Data; // Permit2 authorization data
  permit2Signature: string; // EIP-712 signature of the permit2 data
  order: Order; // The actual order data (matches Solidity)
  orderSignature: string; // EIP-712 signature of the order
}

export interface ExecutionParams {
  router: string; // Which DEX router to use (must be in allowedRouters)
  path: string[]; // Token swap path [inputToken, intermediateToken?, outputToken]
  fees: number[]; // Fee tiers for each hop (Uniswap V3 only)
  amountIn: string; // Exact amount to swap (≤ inputAmount)
  amountOutMin: string; // Minimum output (≥ minAmountOut considering amountIn)
  deadline: number; // Execution deadline
}

export const EIP712_TYPES = EIP712_GENERATED_TYPES;

export enum OrderStatus {
  PENDING = "pending", // Order created, waiting for execution
  PARTIALLY_FILLED = "partially_filled", // Order partially executed
  FILLED = "filled", // Order completely executed
  CANCELLED = "cancelled", // Order cancelled by user
  EXPIRED = "expired", // Order expired
  FAILED = "failed", // Order execution failed
}

export interface OrderWithStatus {
  signedOrder: SignedLimitOrder;
  status: OrderStatus;
  filledAmount: string; // How much has been filled so far
  executionTxHash?: string; // Transaction hash of execution
  createdAt: number; // When order was created
  updatedAt: number; // Last status update
}

export function createDomain(chainId: number, verifyingContract: string): EIP712Domain {
  return createGeneratedDomain(chainId, verifyingContract);
}

export function generateOrderNonce(): string {
  return Math.floor(Date.now() / 1000 + Math.random() * 1000000).toString();
}