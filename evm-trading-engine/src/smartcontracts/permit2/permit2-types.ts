export const PERMIT2_TYPES = {
  // For permitTransferFrom 
  PermitTransferFrom: [
    { name: "permitted", type: "TokenPermissions" },
    { name: "spender", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
  TokenPermissions: [
    { name: "token", type: "address" },
    { name: "amount", type: "uint256" },
  ],

  // For permitBatch (multiple tokens at once)
  PermitBatchTransferFrom: [
    { name: "permitted", type: "TokenPermissions[]" },
    { name: "spender", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],

  // For permit (allowance-based, different from transfer)
  PermitDetails: [
    { name: "token", type: "address" },
    { name: "amount", type: "uint160" }, // Note: uint160, not uint256
    { name: "expiration", type: "uint48" },
    { name: "nonce", type: "uint48" },
  ],
  PermitSingle: [
    { name: "details", type: "PermitDetails" },
    { name: "spender", type: "address" },
    { name: "sigDeadline", type: "uint256" },
  ],
  PermitBatch: [
    { name: "details", type: "PermitDetails[]" },
    { name: "spender", type: "address" },
    { name: "sigDeadline", type: "uint256" },
  ],
};

// ==============================
// TypeScript equivalents of Permit2 structs
// ==============================

// ISignatureTransfer.TokenPermissions
export interface TokenPermissions {
  token: string; // address
  amount: bigint; // uint256
}

// ISignatureTransfer.PermitTransferFrom
export interface PermitTransferFrom {
  permitted: TokenPermissions;
  nonce: string; // uint256
  deadline: string; // uint256
}

// ISignatureTransfer.SignatureTransferDetails
export interface SignatureTransferDetails {
  to: string; // address
  requestedAmount: bigint; // uint256
}

// ISignatureTransfer.PermitBatchTransferFrom
export interface PermitBatchTransferFrom {
  permitted: TokenPermissions[];
  nonce: string; // uint256
  deadline: string; // uint256
}

// IAllowanceTransfer.PermitDetails
export interface PermitDetails {
  token: string; // address
  amount: string; // uint160 (use string for BN)
  expiration: string; // uint48 (use string)
  nonce: string; // uint48 (use string)
}

// IAllowanceTransfer.PermitSingle
export interface PermitSingle {
  details: PermitDetails;
  spender: string; // address
  sigDeadline: string; // uint256
}

// IAllowanceTransfer.PermitBatch
export interface PermitBatch {
  details: PermitDetails[];
  spender: string; // address
  sigDeadline: string; // uint256
}
