import { ethers } from "ethers";

// The Universal Router uses a command pattern where each command is a byte
// and parameters are passed as bytes arrays

const UNIVERSAL_ROUTER_ABI = [
  // Core errors from the Universal Router interface
  "error ExecutionFailed(uint256 commandIndex, bytes message)",
  "error ETHNotAccepted()",
  "error TransactionDeadlinePassed()",
  "error LengthMismatch()",

  // Reentrancy protection errors
  "error ContractLocked()",

  // Address validation errors
  "error FromAddressIsNotOwner()",

  // Token/ETH transfer errors
  "error InsufficientETH()",
  "error InsufficientToken()",
  "error InvalidBips()",

  // Command type errors
  "error InvalidCommandType(uint256 commandType)",

  // NFT ownership errors
  "error InvalidOwnerERC721()",
  "error InvalidOwnerERC1155()",

  // Path validation errors
  "error InvalidPath()",
  "error InvalidReserves()",

  // Bytes manipulation errors
  "error NoSlice()",
  "error SliceOutOfBounds()",
  "error SliceOverflow()",
  "error ToAddressOutOfBounds()",
  "error ToAddressOverflow()",
  "error ToUint24OutOfBounds()",
  "error ToUint24Overflow()",

  // Rewards collection errors
  "error UnableToClaim()",

  // Uniswap V2 specific errors
  "error V2InvalidPath()",
  "error V2TooLittleReceived()",
  "error V2TooMuchRequested()",

  // Uniswap V3 specific errors
  "error V3InvalidAmountOut()",
  "error V3InvalidCaller()",
  "error V3InvalidSwap()",
  "error V3TooLittleReceived()",
  "error V3TooMuchRequested()",

  // Safe casting errors
  "error UnsafeCast()",

  // Main execute functions
  "function execute(bytes commands, bytes[] inputs, uint256 deadline) external payable",
] as const;

export const UNIVERSAL_ROUTER_INTERFACE = new ethers.Interface(UNIVERSAL_ROUTER_ABI);
