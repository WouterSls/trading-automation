import { ethers } from "ethers";

const PERMIT2_ABI = [
  "function permit(address owner, tuple(address token, uint160 amount, uint48 expiration, uint48 nonce) details, bytes signature) external",

  "function allowance(address owner, address token, address spender) external view returns (uint160, uint48, uint48)",
  
  // Transfer functions
  "function permitTransferFrom(tuple(tuple(address token, uint256 amount) permitted, uint256 nonce, uint256 deadline) permit, tuple(address to, uint256 requestedAmount) transferDetails, address owner, bytes signature) external",
  
  "function transferFrom(address from, address to, uint160 amount, address token) external",
] as const;

export const PERMIT2_INTERFACE = new ethers.Interface(PERMIT2_ABI);
