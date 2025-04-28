/**
 * Enum for Universal Router commands (from Commands.sol)
 * @see https://github.com/Uniswap/universal-router/blob/main/contracts/libraries/Commands.sol citeturn5view0
 */
export enum CommandType {
  V3_SWAP_EXACT_IN = 0x00,
  V3_SWAP_EXACT_OUT = 0x01,
  PERMIT2_TRANSFER_FROM = 0x02,
  V2_SWAP_EXACT_IN = 0x08,
  V2_SWAP_EXACT_OUT = 0x09,
  V4_SWAP = "0x10",
  // ... add other commands as needed
}
