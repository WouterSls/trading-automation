import { ethers } from "ethers";

// The Universal Router uses a command pattern where each command is a byte
// and parameters are passed as bytes arrays

const UNIVERSAL_ROUTER_ABI = [
  // only the deadline overload
  "function execute(bytes commands, bytes[] inputs, uint256 deadline) external payable",
] as const;

export const UNIVERSAL_ROUTER_INTERFACE = new ethers.Interface(UNIVERSAL_ROUTER_ABI);
