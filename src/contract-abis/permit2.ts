import { ethers } from "ethers";

const PERMIT2_ABI = [
  "function permit(address owner, tuple(address token, uint160 amount, uint48 expiration, uint48 nonce) details, bytes signature) external",

  "function allowance(address owner, address token, address spender) external view returns (uint160, uint48, uint48)",
] as const;

export const PERMIT2_INTERFACE = new ethers.Interface(PERMIT2_ABI);
