import { 
  PermitTransferFrom, 
  SignatureTransferDetails, 
  PermitSingle 
} from '../permit2/permit2-types';

// Re-export generated types as the single source of truth
export { 
  SignedOrder, 
  RouteData, 
  SignedPermitData as GeneratedSignedPermitData,
  SignedPermitAllowanceData as GeneratedSignedPermitAllowanceData,
  Protocol,
  EIP712_GENERATED_TYPES,
  SIGNEDORDER_TYPEHASH,
  createDomain
} from '../../lib/generated-solidity-types';

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

export interface EIP712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}


