// GENERATED FILE - DO NOT EDIT MANUALLY
// Generated from Solidity contracts by scripts/generate-types.js
// Run 'npm run generate-types' to regenerate

/**
 * Auto-generated types that match Solidity contract structures
 * This ensures type consistency between smart contracts and frontend
 */

export enum Protocol {
  UNISWAP_V2 = 0,
  UNISWAP_V3 = 1,
  SUSHISWAP = 2,
  BALANCER_V2 = 3,
  CURVE = 4,
  PANCAKESWAP_V2 = 5,
  PANCAKESWAP_V3 = 6,
  TRADER_JOE = 7,
  QUICKSWAP = 8
}

// Core order structure (matches ExecutorValidation.LimitOrder)
export interface Order {
  maker: string; // address
  inputToken: string; // address
  outputToken: string; // address
  protocol: number; // Types.Protocol
  inputAmount: string; // uint256
  minAmountOut: string; // uint256
  maxSlippageBps: string; // uint256
  expiry: string; // uint256
  nonce: string; // uint256
}

// Route data structure (matches ExecutorValidation.RouteData)
export interface RouteData {
  encodedPath: string; // bytes
  fee: string; // uint24
  isMultiHop: boolean; // bool
}

// Permit structures (match ExecutorValidation permit types)
export interface PermitDetails {
  token: string; // address
  amount: string; // uint256
}

export interface PermitSingle {
  details: PermitDetails; // PermitDetails
  spender: string; // address
  sigDeadline: string; // uint256
  nonce: string; // uint256
}

/**
 * EIP712 type definitions (auto-generated from Solidity structs)
 * These MUST match the Solidity struct definitions exactly
 */
export const EIP712_GENERATED_TYPES = {
  // Domain separator types
  EIP712Domain: [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
    { name: "verifyingContract", type: "address" },
  ],
  
  // Generated from Solidity structs
  Order: [
    { name: "maker", type: "address" },
    { name: "inputToken", type: "address" },
    { name: "outputToken", type: "address" },
    { name: "protocol", type: "uint8" },
    { name: "inputAmount", type: "uint256" },
    { name: "minAmountOut", type: "uint256" },
    { name: "maxSlippageBps", type: "uint256" },
    { name: "expiry", type: "uint256" },
    { name: "nonce", type: "uint256" }
  ],
  RouteData: [
    { name: "encodedPath", type: "bytes" },
    { name: "fee", type: "uint24" },
    { name: "isMultiHop", type: "bool" }
  ],
  PermitDetails: [
    { name: "token", type: "address" },
    { name: "amount", type: "uint256" }
  ],
  PermitSingle: [
    { name: "details", type: "PermitDetails" },
    { name: "spender", type: "address" },
    { name: "sigDeadline", type: "uint256" },
    { name: "nonce", type: "uint256" }
  ],
};

/**
 * Type hash constants (must match Solidity)
 */
export const ORDER_TYPEHASH = "Order(address maker,address inputToken,address outputToken,uint8 protocol,uint256 inputAmount,uint256 minAmountOut,uint256 maxSlippageBps,uint256 expiry,uint256 nonce)";

/**
 * Domain helper function
 */
export function createDomain(chainId: number, verifyingContract: string) {
  return {
    name: "EVM Trading Engine", // Must match Solidity contract name
    version: "1", // Must match Solidity contract version
    chainId: chainId,
    verifyingContract: verifyingContract,
  };
}
