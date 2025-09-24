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

export type Permit2Domain = {
  name: 'Permit2';
  chainId: number;
  verifyingContract: string;
};

// ISignatureTransfer.TokenPermissions
export interface TokenPermissions {
  token: string; // address
  amount: bigint; // uint256
}

export interface PermitTransferFrom {
  permitted: TokenPermissions;
  spender: string; // address
  nonce: string; // uint256
  deadline: string; // uint256
}

export interface SignatureTransferDetails {
  to: string; // address
  requestedAmount: bigint; // uint256
}

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

export interface PermitSingle {
  details: PermitDetails;
  spender: string; // address
  sigDeadline: string; // uint256
}

export interface PermitBatch {
  details: PermitDetails[];
  spender: string; // address
  sigDeadline: string; // uint256
}
