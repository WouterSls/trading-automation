import { 
  PermitTransferFrom, 
  SignatureTransferDetails, 
  PermitSingle 
} from '../../smartcontracts/permit2/permit2-types';

// Re-export generated types as the single source of truth
export { 
  RouteData, 
  SignedPermitData as GeneratedSignedPermitData,
  SignedPermitAllowanceData as GeneratedSignedPermitAllowanceData,
  Protocol,
  SIGNEDORDER_TYPEHASH,
  createDomain
} from '../../lib/generated-solidity-types';

export interface EIP712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}

export const EIP712_TYPES = {
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
    { name: "inputAmount", type: "uint256" },
    { name: "outputToken", type: "address" },
    { name: "minAmountOut", type: "uint256" },
    { name: "maxSlippageBps", type: "uint256" },
    { name: "expiry", type: "uint256" },
    { name: "nonce", type: "uint256" },
  ]
};

export interface Order {
  maker: string;
  inputToken: string;
  inputAmount: bigint;
  outputToken: string;
  minAmountOut: bigint;
  maxSlippageBps: number;
  expiry: number;
  nonce: number;
}

export interface SignedOrder {
  maker: string; // address
  inputToken: string; // address
  outputToken: string; // address
  inputAmount: bigint; // uint256
  minAmountOut: bigint; // uint256
  maxSlippageBps: number; // uint256
  expiry: number; // uint256
  nonce: number; // uint256
  signature: string; // bytes
}

// Convenience types mirroring ExecutorValidation structs
export interface SignedPermitSignatureData {
  permit: PermitTransferFrom;
  transferDetails: SignatureTransferDetails;
  owner: string; // address
  signature: string; // bytes
}

export interface SignedPermitAllowanceData {
  permitSingle: PermitSingle;
  owner: string; // address
  signature: string; // bytes
}




