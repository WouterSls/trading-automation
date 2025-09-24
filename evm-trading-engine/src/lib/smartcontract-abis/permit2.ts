import { ethers } from "ethers";

const PERMIT2_ABI = [
  "function permit(address owner, tuple(address token, uint160 amount, uint48 expiration, uint48 nonce) details, bytes signature) external",

  "function allowance(address owner, address token, address spender) external view returns (uint160, uint48, uint48)",
  
  // Transfer functions
  "function permitTransferFrom(tuple(tuple(address token, uint256 amount) permitted, uint256 nonce, uint256 deadline) permit, tuple(address to, uint256 requestedAmount) transferDetails, address owner, bytes signature) external",
  
  "function transferFrom(address from, address to, uint160 amount, address token) external",
  
  // Nonce bitmap for ISignatureTransfer
  "function nonceBitmap(address owner, uint256 wordPos) external view returns (uint256)",
  
  // Domain separator for EIP-712
  "function DOMAIN_SEPARATOR() external view returns (bytes32)",

  // Events from ISignatureTransfer
  "event UnorderedNonceInvalidation(address indexed owner, uint256 word, uint256 mask)",

  // Events from IAllowanceTransfer
  "event NonceInvalidation(address indexed owner, address indexed token, address indexed spender, uint48 newNonce, uint48 oldNonce)",
  "event Approval(address indexed owner, address indexed token, address indexed spender, uint160 amount, uint48 expiration)",
  "event Permit(address indexed owner, address indexed token, address indexed spender, uint160 amount, uint48 expiration, uint48 nonce)",
  "event Lockdown(address indexed owner, address token, address spender)",

  // Errors from ISignatureTransfer
  "error InvalidAmount(uint256 maxAmount)",
  "error LengthMismatch()",

  // Errors from IAllowanceTransfer
  "error AllowanceExpired(uint256 deadline)",
  "error InsufficientAllowance(uint256 amount)",
  "error ExcessiveInvalidation()",

  // Errors from PermitErrors.sol (shared between signature and allowance transfers)
  "error SignatureExpired(uint256 signatureDeadline)",
  "error InvalidNonce()",

  // Errors from SignatureVerification.sol
  "error InvalidSignatureLength()",
  "error InvalidSignature()",
  "error InvalidSigner()",
  "error InvalidContractSignature()",
] as const;

export const PERMIT2_INTERFACE = new ethers.Interface(PERMIT2_ABI);
